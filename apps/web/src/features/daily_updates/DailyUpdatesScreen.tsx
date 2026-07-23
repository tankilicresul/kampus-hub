import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { Plus, RefreshCw, AlertTriangle, Calendar } from 'lucide-react';

interface DailyUpdate {
  id: string;
  user_id: string;
  today_summary: string;
  tomorrow_plan: string;
  blockers?: string;
  is_late: boolean;
  created_at: string;
  profile?: {
    full_name?: string;
  };
}

export const DailyUpdatesScreen: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Submit modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [todaySummary, setTodaySummary] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [blockers, setBlockers] = useState('');
  const [isLateWarning, setIsLateWarning] = useState(false);

  const checkLateSubmission = () => {
    const now = new Date();
    // Warning if hour is 20:00 (8 PM) or later
    if (now.getHours() >= 20) {
      setIsLateWarning(true);
    } else {
      setIsLateWarning(false);
    }
  };

  useEffect(() => {
    checkLateSubmission();
  }, [showAddModal]);

  const loadUpdates = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_updates')
        .select(`
          *,
          profile:profiles(full_name)
        `)
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates(data as DailyUpdate[]);
    } catch (err) {
      console.error('Fetch daily updates failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, [activeWorkspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !todaySummary.trim() || !tomorrowPlan.trim()) return;

    const isLate = new Date().getHours() >= 20;

    try {
      const { error } = await supabase.from('daily_updates').insert({
        workspace_id: activeWorkspace.id,
        today_summary: todaySummary.trim(),
        tomorrow_plan: tomorrowPlan.trim(),
        blockers: blockers.trim() || null,
        is_late: isLate,
      });

      if (error) throw error;

      setShowAddModal(false);
      setTodaySummary('');
      setTomorrowPlan('');
      setBlockers('');
      await loadUpdates();
    } catch (err) {
      console.error('Submit daily update failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Günlük Raporlar</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ekibin günlük çalışma raporları.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span className="btn-text">Rapor Ekle</span>
        </button>
      </div>

      {/* Reports List */}
      {loading ? (
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : updates.length === 0 ? (
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)' }}>
          <Calendar size={48} />
          <h3>Rapor Yok</h3>
          <p>İlk raporu sen ekle!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {updates.map((update) => (
            <div 
              key={update.id} 
              style={{ 
                backgroundColor: 'var(--bg-surface)', 
                borderRadius: 'var(--radius-lg)', 
                border: '1px solid var(--border-glass)', 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {update.profile?.full_name || 'Ekip Üyesi'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(update.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {update.is_late && (
                  <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} />
                    Geç Rapor (20:00 sonrası)
                  </span>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 700, marginBottom: '4px' }}>Bugün Yapılanlar</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{update.today_summary}</p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 700, marginBottom: '4px' }}>Yarın Yapılacaklar</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{update.tomorrow_plan}</p>
              </div>

              {update.blockers && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-danger)' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 700, marginBottom: '2px' }}>Engeller:</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{update.blockers}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Report Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">Günlük Rapor</div>
            
            {isLateWarning && (
              <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span>Geç Rapor: Raporlar saat 20:00'ye kadar iletilmelidir.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Bugün Yapılanlar</label>
                <textarea
                  required
                  placeholder="Bugün yapılan işler..."
                  value={todaySummary}
                  onChange={(e) => setTodaySummary(e.target.value)}
                  className="form-input"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Yarın Yapılacaklar</label>
                <textarea
                  required
                  placeholder="Yarın yapılacak işler..."
                  value={tomorrowPlan}
                  onChange={(e) => setTomorrowPlan(e.target.value)}
                  className="form-input"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Engeller (Varsa)</label>
                <input
                  type="text"
                  placeholder="Varsa engeller..."
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Gönder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

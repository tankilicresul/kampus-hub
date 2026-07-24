import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import {
  Plus, RefreshCw, AlertTriangle, Calendar, User, Download,
  MessageSquare, X, BarChart3, Clock, TrendingUp, Filter
} from 'lucide-react';

interface DailyUpdate {
  id: string;
  user_id: string;
  completed_today: string;
  ongoing_work?: string;
  tomorrow_plan: string;
  blockers?: string;
  is_late: boolean;
  created_at: string;
  profile?: { full_name?: string };
}

interface WorkspaceMember {
  user_id: string;
  full_name: string | null;
}

interface DailyUpdateComment {
  id: string;
  content: string;
  created_at: string;
  profile?: { full_name: string | null };
}

// ─── Manager Comment Modal ────────────────────────────────────────────────────
const CommentModal: React.FC<{
  update: DailyUpdate;
  onClose: () => void;
}> = ({ update, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<DailyUpdateComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('daily_update_comments')
      .select('*, profile:user_id(full_name)')
      .eq('update_id', update.id)
      .order('created_at', { ascending: true });
    setComments((data as unknown as DailyUpdateComment[]) || []);
  }, [update.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      await supabase.from('daily_update_comments').insert({
        update_id: update.id,
        user_id: user.id,
        content: newComment.trim(),
      });
      setNewComment('');
      loadComments();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Yorumlar — {update.profile?.full_name || 'Üye'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
          {comments.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem', padding: '16px' }}>Henüz yorum yok.</p>
          )}
          {comments.map(c => (
            <div key={c.id} style={{
              backgroundColor: 'var(--bg-surface-accent)', padding: '10px 14px',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '3px' }}>
                {(c.profile as any)?.full_name || 'Kullanıcı'}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
                  {new Date(c.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem' }}>{c.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Yorum ekle..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" type="submit" disabled={submitting || !newComment.trim()} style={{ padding: '8px 14px' }}>
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : 'Ekle'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Main DailyUpdatesScreen ──────────────────────────────────────────────────
export const DailyUpdatesScreen: React.FC = () => {
  const { activeWorkspace, user, role } = useAuth();
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Filters
  const [filterMember, setFilterMember] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Submit modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [completedToday, setCompletedToday] = useState('');
  const [ongoingWork, setOngoingWork] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [blockers, setBlockers] = useState('');
  const [isLateWarning, setIsLateWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Comment modal
  const [commentUpdate, setCommentUpdate] = useState<DailyUpdate | null>(null);

  const checkLateSubmission = () => {
    setIsLateWarning(new Date().getHours() >= 20);
  };

  useEffect(() => {
    checkLateSubmission();
  }, [showAddModal]);

  const loadMembers = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    const { data } = await supabase
      .from('workspace_members')
      .select('user_id, profiles:profiles!workspace_members_user_id_fkey(full_name)')
      .eq('workspace_id', activeWorkspace.id);
    if (data) {
      setMembers(data.map((m: any) => ({ user_id: m.user_id, full_name: m.profiles?.full_name || null })));
    }
  }, [activeWorkspace?.id]);

  const loadUpdates = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('daily_updates')
        .select('*, profile:profiles(full_name)')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (filterMember) query = query.eq('user_id', filterMember);
      if (filterDateFrom) query = query.gte('created_at', filterDateFrom);
      if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59');

      if (viewMode === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (viewMode === 'monthly') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setUpdates((data as DailyUpdate[]) || []);
    } catch (err) {
      console.error('Fetch daily updates failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, filterMember, filterDateFrom, filterDateTo, viewMode]);

  useEffect(() => {
    loadUpdates();
    loadMembers();
  }, [loadUpdates, loadMembers]);

  useEffect(() => {
    const handleTriggerAdd = () => {
      setShowAddModal(true);
    };
    window.addEventListener('trigger-add-report', handleTriggerAdd);
    return () => {
      window.removeEventListener('trigger-add-report', handleTriggerAdd);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !user || !completedToday.trim() || !tomorrowPlan.trim()) return;
    const isLate = new Date().getHours() >= 20;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('daily_updates').insert({
        workspace_id: activeWorkspace.id,
        user_id: user.id,
        completed_today: completedToday.trim(),
        ongoing_work: ongoingWork.trim() || 'Devam ediyor',
        tomorrow_plan: tomorrowPlan.trim(),
        blockers: blockers.trim() || null,
        is_late: isLate,
        status: 'published',
      });
      if (error) throw error;
      setShowAddModal(false);
      setCompletedToday(''); setOngoingWork(''); setTomorrowPlan(''); setBlockers('');
      await loadUpdates();
    } catch (err) {
      console.error('Submit daily update failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Export
  const handleExport = () => {
    if (updates.length === 0) return;
    const headers = ['Tarih', 'Kişi', 'Bugün Yapılanlar', 'Devam Eden', 'Yarın', 'Engeller', 'Geç Mi?'];
    const rows = updates.map(u => [
      new Date(u.created_at).toLocaleDateString('tr-TR'),
      u.profile?.full_name || u.user_id,
      u.completed_today.replace(/\n/g, ' '),
      u.ongoing_work || '',
      u.tomorrow_plan.replace(/\n/g, ' '),
      u.blockers || '',
      u.is_late ? 'Evet' : 'Hayır',
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raporlar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const totalCount = updates.length;
  const lateCount = updates.filter(u => u.is_late).length;
  const lateRate = totalCount > 0 ? Math.round((lateCount / totalCount) * 100) : 0;
  const uniqueSubmitters = new Set(updates.map(u => u.user_id)).size;
  const memberCount = members.length;

  const isManager = ['owner', 'admin', 'manager'].includes(role || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Günlük Raporlar</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Ekibin günlük çalışma özetleri</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowFilters(f => !f)} style={{ padding: '7px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Filter size={14} /> Filtrele
          </button>
          <button className="btn btn-secondary" onClick={handleExport} style={{ padding: '7px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }} title="CSV İndir">
            <Download size={14} /> CSV
          </button>
          <button className="btn btn-primary hide-on-mobile" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /><span className="btn-text">Rapor Ekle</span>
          </button>
        </div>
      </div>

      {/* Performance Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
        {[
          { label: 'Toplam Rapor', value: totalCount, icon: <BarChart3 size={18} />, color: '#6366f1' },
          { label: 'Bu Dönem Üye', value: `${uniqueSubmitters}/${memberCount}`, icon: <User size={18} />, color: '#10b981' },
          { label: 'Geç Rapor', value: lateCount, icon: <Clock size={18} />, color: '#ef4444' },
          { label: 'Zamanında %', value: `%${100 - lateRate}`, icon: <TrendingUp size={18} />, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{
            backgroundColor: 'var(--bg-surface)', padding: '14px 16px',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)',
          }}>
            <div style={{ color: stat.color, marginBottom: '6px' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label className="form-label">Kişi</label>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }}>
              <option value="">Tüm üyeler</option>
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.full_name || m.user_id.slice(0, 8)}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '130px' }}>
            <label className="form-label">Başlangıç</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }} />
          </div>
          <div style={{ flex: 1, minWidth: '130px' }}>
            <label className="form-label">Bitiş</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }} />
          </div>
          <div style={{ flex: 1, minWidth: '130px' }}>
            <label className="form-label">Dönem</label>
            <select value={viewMode} onChange={e => setViewMode(e.target.value as any)} className="form-input" style={{ fontSize: '0.82rem' }}>
              <option value="all">Tümü</option>
              <option value="weekly">Son 7 Gün</option>
              <option value="monthly">Son 30 Gün</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={() => { setFilterMember(''); setFilterDateFrom(''); setFilterDateTo(''); setViewMode('all'); }} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            Temizle
          </button>
        </div>
      )}

      {/* Updates list */}
      {loading ? (
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : updates.length === 0 ? (
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <Calendar size={48} style={{ opacity: 0.3 }} />
          <h3 style={{ fontWeight: 700 }}>Rapor Yok</h3>
          <p style={{ fontSize: '0.85rem' }}>İlk günlük raporunu ekle!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {updates.map(update => (
            <div key={update.id} style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    backgroundColor: 'var(--accent-color)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {(update.profile?.full_name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{update.profile?.full_name || 'Ekip Üyesi'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(update.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {update.is_late && (
                    <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                      <AlertTriangle size={10} /> Geç Rapor
                    </span>
                  )}
                  {isManager && (
                    <button
                      onClick={() => setCommentUpdate(update)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <MessageSquare size={13} /> Yorum
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700, marginBottom: '4px' }}>✅ Bugün Yapılanlar</h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{update.completed_today}</p>
                </div>
                {update.ongoing_work && (
                  <div>
                    <h4 style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700, marginBottom: '4px' }}>🔄 Devam Eden</h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{update.ongoing_work}</p>
                  </div>
                )}
                <div>
                  <h4 style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700, marginBottom: '4px' }}>📋 Yarın</h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{update.tomorrow_plan}</p>
                </div>
                {update.blockers && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.06)', padding: '10px 14px', borderRadius: '10px', borderLeft: '3px solid #ef4444' }}>
                    <h4 style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, marginBottom: '2px' }}>🚧 Engeller</h4>
                    <p style={{ fontSize: '0.85rem' }}>{update.blockers}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Report Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Günlük Rapor</span>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {isLateWarning && (
              <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={16} />
                <span>⚠️ Geç Rapor: Raporlar saat 20:00'ye kadar iletilmelidir.</span>
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">✅ Bugün Yapılanlar *</label>
                <textarea required placeholder="Bugün yaptığın işler..." value={completedToday} onChange={e => setCompletedToday(e.target.value)} className="form-input" rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">🔄 Devam Eden İşler</label>
                <input type="text" placeholder="Devam eden işler..." value={ongoingWork} onChange={e => setOngoingWork(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">📋 Yarın Yapılacaklar *</label>
                <textarea required placeholder="Yarın yapılacak işler..." value={tomorrowPlan} onChange={e => setTomorrowPlan(e.target.value)} className="form-input" rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">🚧 Engeller (Varsa)</label>
                <input type="text" placeholder="Varsa engeller..." value={blockers} onChange={e => setBlockers(e.target.value)} className="form-input" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <RefreshCw className="animate-spin" size={16} /> : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comment modal */}
      {commentUpdate && (
        <CommentModal update={commentUpdate} onClose={() => setCommentUpdate(null)} />
      )}
    </div>
  );
};

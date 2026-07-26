import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import {
  Plus, RefreshCw, Calendar, User, Download,
  MessageSquare, X, BarChart3, Filter
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
  const [selectedTask, setSelectedTask] = useState('');
  const [customTaskNote, setCustomTaskNote] = useState('');
  const [reportDetail, setReportDetail] = useState('');
  const [reportStatus, setReportStatus] = useState<'completed' | 'started' | 'ongoing'>('ongoing');
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  // Comment modal
  const [commentUpdate, setCommentUpdate] = useState<DailyUpdate | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<DailyUpdate | null>(null);
  const [editSelectedTask, setEditSelectedTask] = useState('');
  const [editCustomTaskNote, setEditCustomTaskNote] = useState('');
  const [editReportDetail, setEditReportDetail] = useState('');
  const [editReportStatus, setEditReportStatus] = useState<'completed' | 'started' | 'ongoing'>('ongoing');

  const loadTasks = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const { data } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('workspace_id', activeWorkspace.id);
      setTasks(data || []);
    } catch (err) {
      console.error('Fetch tasks failed:', err);
    }
  }, [activeWorkspace?.id]);

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
    loadTasks();
  }, [loadUpdates, loadMembers, loadTasks]);

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
    if (!activeWorkspace || !user || !reportDetail.trim()) return;
    
    setSubmitting(true);
    try {
      const matchedTask = selectedTask === '__other__' 
        ? (customTaskNote.trim() || 'Diğer') 
        : (selectedTask || 'Belirtilmemiş');

      const { error } = await supabase.from('daily_updates').insert({
        workspace_id: activeWorkspace.id,
        user_id: user.id,
        completed_today: reportDetail.trim(),
        ongoing_work: matchedTask,
        tomorrow_plan: reportStatus,
        blockers: null,
        is_late: false,
        status: 'published',
      });
      if (error) throw error;
      setShowAddModal(false);
      setSelectedTask('');
      setCustomTaskNote('');
      setReportDetail('');
      setReportStatus('ongoing');
      await loadUpdates();
    } catch (err) {
      console.error('Submit daily update failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUpdate || !editReportDetail.trim()) return;

    setSubmitting(true);
    try {
      const matchedTask = editSelectedTask === '__other__' 
        ? (editCustomTaskNote.trim() || 'Diğer') 
        : (editSelectedTask || 'Belirtilmemiş');

      const { error } = await supabase
        .from('daily_updates')
        .update({
          completed_today: editReportDetail.trim(),
          ongoing_work: matchedTask,
          tomorrow_plan: editReportStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUpdate.id);

      if (error) throw error;
      setShowEditModal(false);
      await loadUpdates();
    } catch (err) {
      console.error('Update daily update failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!editingUpdate) return;
    if (!window.confirm("Bu raporu silmek istediğinize emin misiniz?")) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('daily_updates')
        .delete()
        .eq('id', editingUpdate.id);

      if (error) throw error;
      setShowEditModal(false);
      await loadUpdates();
    } catch (err) {
      console.error('Delete daily update failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Export
  const handleExport = () => {
    if (updates.length === 0) return;
    const headers = ['Tarih', 'Kişi', 'Eşleşen Görev', 'Yaptığı İş', 'Durum'];
    const rows = updates.map(u => {
      let statusText = 'Sürüyor';
      if (u.tomorrow_plan === 'completed') statusText = 'Bitirildi';
      else if (u.tomorrow_plan === 'started') statusText = 'Başlandı';
      return [
        new Date(u.created_at).toLocaleDateString('tr-TR'),
        u.profile?.full_name || u.user_id,
        u.ongoing_work || '',
        u.completed_today.replace(/\n/g, ' '),
        statusText,
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bugun_neler_yaptim_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const totalCount = updates.length;
  const uniqueSubmitters = new Set(updates.map(u => u.user_id)).size;
  const memberCount = members.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Bugün Neler Yaptım</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Ekibin günlük çalışma özetleri ve durumları</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowFilters(f => !f)} style={{ padding: '7px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Filter size={14} /> Filtrele
          </button>
          <button className="btn btn-secondary" onClick={handleExport} style={{ padding: '7px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }} title="CSV İndir">
            <Download size={14} /> CSV
          </button>
          <button className="btn btn-primary hide-on-mobile" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /><span className="btn-text">Ekle</span>
          </button>
        </div>
      </div>

      {/* Performance Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {[
          { label: 'Toplam Rapor', value: totalCount, icon: <BarChart3 size={20} />, color: '#6366f1' },
          { label: 'Aktif Üyeler', value: `${uniqueSubmitters}/${memberCount}`, icon: <User size={20} />, color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} style={{
            backgroundColor: 'var(--bg-surface)', padding: '16px 20px',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)',
            display: 'flex', alignItems: 'center', gap: '16px'
          }}>
            <div style={{ color: stat.color, padding: '10px', backgroundColor: `${stat.color}15`, borderRadius: '50%' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>{stat.label}</div>
            </div>
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
          <h3 style={{ fontWeight: 700 }}>Kayıt Yok</h3>
          <p style={{ fontSize: '0.85rem' }}>İlk kaydını ekle!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {updates.map(update => (
            <div 
              key={update.id} 
              onClick={() => {
                setEditingUpdate(update);
                const hasTask = tasks.some(t => t.title === update.ongoing_work);
                setEditSelectedTask(hasTask ? (update.ongoing_work || '') : (update.ongoing_work ? '__other__' : ''));
                setEditCustomTaskNote(hasTask ? '' : (update.ongoing_work || ''));
                setEditReportDetail(update.completed_today);
                setEditReportStatus(update.tomorrow_plan as any || 'ongoing');
                setShowEditModal(true);
              }}
              style={{
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-glass)',
                padding: '16px 20px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                flexWrap: 'wrap',
                cursor: 'pointer'
              }}
              title="Rapor Detayları & Düzenle"
            >
              {/* Part 1: İsim & Tarih */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                flex: '0 0 auto', 
                minWidth: '160px',
                justifyContent: 'flex-start'
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: 'var(--accent-color)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 800, flexShrink: 0
                }}>
                  {(update.profile?.full_name || '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {update.profile?.full_name || 'Ekip Üyesi'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {new Date(update.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Part 2: Eşleşen Görev */}
              <div style={{ 
                flex: '1 1 180px', 
                fontSize: '0.85rem', 
                color: 'var(--text-primary)',
                fontWeight: 500
              }}>
                <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 700 }}>EŞLEŞEN GÖREV</span>
                {update.ongoing_work || 'Diğer / Belirtilmemiş'}
              </div>

              {/* Part 3: Yaptığı Şey (En Uzun Kısım) */}
              <div style={{ 
                flex: '2 1 280px', 
                fontSize: '0.85rem', 
                color: 'var(--text-primary)', 
                whiteSpace: 'pre-wrap',
                lineHeight: '1.4'
              }}>
                <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 700 }}>BUGÜN NELER YAPTI</span>
                {update.completed_today}
              </div>

              {/* Part 4: Raporun Rengi (Durum) */}
              {(() => {
                const statusVal = update.tomorrow_plan;
                let color = '#f97316';
                let text = 'Sürüyor';
                if (statusVal === 'completed') {
                  color = '#22c55e';
                  text = 'Bitirildi';
                } else if (statusVal === 'started') {
                  color = '#3b82f6';
                  text = 'Başlandı';
                }
                return (
                  <div style={{ 
                    flex: '0 0 auto', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: `${color}15`,
                    border: `1px solid ${color}35`,
                    color: color,
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
                    {text}
                  </div>
                );
              })()}

              {/* Far Right: Yorum Butonu ("Yönetici Yorumu") */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentUpdate(update);
                }}
                className="btn btn-secondary"
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '0.75rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  flexShrink: 0
                }}
              >
                <MessageSquare size={13} />
                <span>Yönetici Yorumu</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Report Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bugün Neler Yaptım</span>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Eşleşen Görev</label>
                <select 
                  value={selectedTask} 
                  onChange={e => {
                    setSelectedTask(e.target.value);
                    if (e.target.value !== '__other__') {
                      setCustomTaskNote('');
                    }
                  }} 
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">Görev Seçin...</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.title}>{t.title}</option>
                  ))}
                  <option value="__other__">Diğer (Not Ekle)</option>
                </select>
              </div>

              {selectedTask === '__other__' && (
                <div className="form-group">
                  <label className="form-label">Not / İş Tanımı *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Yaptığınız iş veya konu..." 
                    value={customTaskNote} 
                    onChange={e => setCustomTaskNote(e.target.value)} 
                    className="form-input" 
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Bugün Neler Yaptım (Yapılan İşin Detayı) *</label>
                <textarea 
                  required 
                  placeholder="Bugün yaptığın işin detaylı açıklaması..." 
                  value={reportDetail} 
                  onChange={e => setReportDetail(e.target.value)} 
                  className="form-input" 
                  rows={4} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">İş Durumu / Raporun Rengi</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="reportStatus" 
                      value="completed" 
                      checked={reportStatus === 'completed'} 
                      onChange={() => setReportStatus('completed')} 
                    />
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>Bitirildi (Yeşil)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="reportStatus" 
                      value="started" 
                      checked={reportStatus === 'started'} 
                      onChange={() => setReportStatus('started')} 
                    />
                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>Başlandı (Mavi)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="reportStatus" 
                      value="ongoing" 
                      checked={reportStatus === 'ongoing'} 
                      onChange={() => setReportStatus('ongoing')} 
                    />
                    <span style={{ color: '#f97316', fontWeight: 700 }}>Sürüyor (Turuncu)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '10px' }}>
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

      {/* Edit/Detail Report Modal */}
      {showEditModal && editingUpdate && (() => {
        const isReadOnly = !!(user && editingUpdate.user_id !== user.id && !['owner', 'admin', 'manager'].includes(role || ''));
        return (
          <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Rapor Detayları & Düzenle</span>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>
              
              {isReadOnly && (
                <div className="alert alert-warning" style={{ fontSize: '0.8rem', marginBottom: '12px' }}>
                  Bu raporu sadece yazarı veya ekip yöneticileri düzenleyebilir. Raporu şu an salt-okunur görüntülüyorsunuz.
                </div>
              )}

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Eşleşen Görev</label>
                  <select 
                    value={editSelectedTask} 
                    onChange={e => {
                      setEditSelectedTask(e.target.value);
                      if (e.target.value !== '__other__') {
                        setEditCustomTaskNote('');
                      }
                    }} 
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    disabled={isReadOnly}
                  >
                    <option value="">Görev Seçin...</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.title}>{t.title}</option>
                    ))}
                    <option value="__other__">Diğer (Not Ekle)</option>
                  </select>
                </div>

                {editSelectedTask === '__other__' && (
                  <div className="form-group">
                    <label className="form-label">Not / İş Tanımı *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Yaptığınız iş veya konu..." 
                      value={editCustomTaskNote} 
                      onChange={e => setEditCustomTaskNote(e.target.value)} 
                      className="form-input" 
                      disabled={isReadOnly}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Bugün Neler Yaptım (Yapılan İşin Detayı) *</label>
                  <textarea 
                    required 
                    placeholder="Bugün yaptığın işin detaylı açıklaması..." 
                    value={editReportDetail} 
                    onChange={e => setEditReportDetail(e.target.value)} 
                    className="form-input" 
                    rows={4} 
                    disabled={isReadOnly}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">İş Durumu / Raporun Rengi</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="editReportStatus" 
                        value="completed" 
                        checked={editReportStatus === 'completed'} 
                        onChange={() => setEditReportStatus('completed')} 
                        disabled={isReadOnly}
                      />
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>Bitirildi (Yeşil)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="editReportStatus" 
                        value="started" 
                        checked={editReportStatus === 'started'} 
                        onChange={() => setEditReportStatus('started')} 
                        disabled={isReadOnly}
                      />
                      <span style={{ color: '#3b82f6', fontWeight: 700 }}>Başlandı (Mavi)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="editReportStatus" 
                        value="ongoing" 
                        checked={editReportStatus === 'ongoing'} 
                        onChange={() => setEditReportStatus('ongoing')} 
                        disabled={isReadOnly}
                      />
                      <span style={{ color: '#f97316', fontWeight: 700 }}>Sürüyor (Turuncu)</span>
                    </label>
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: '10px', justifyContent: 'space-between' }}>
                  {!isReadOnly ? (
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={handleDeleteReport}
                      style={{ padding: '8px 16px' }}
                    >
                      Sil
                    </button>
                  ) : <div />}
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Kapat</button>
                    {!isReadOnly && (
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? <RefreshCw className="animate-spin" size={16} /> : 'Kaydet'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

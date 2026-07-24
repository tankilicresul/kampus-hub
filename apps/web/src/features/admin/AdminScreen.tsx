import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import {
  Users, BarChart3, CheckSquare, TrendingUp, Crown, Shield,
  RefreshCw, UserMinus, ChevronDown, ShieldAlert, Building2
} from 'lucide-react';

interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  member_count?: number;
  task_count?: number;
}

interface AdminMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  permission_role: string;
  workspace_name: string;
  workspace_id: string;
}

interface SystemStats {
  total_workspaces: number;
  total_members: number;
  total_tasks: number;
  completed_tasks: number;
  total_updates: number;
  late_updates: number;
}

export const AdminScreen: React.FC = () => {
  const { role, activeWorkspace, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'workspaces' | 'members'>('stats');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isAdmin = role === 'owner' || role === 'admin';

  const loadStats = async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const [wsRes, taskRes, updateRes] = await Promise.all([
        supabase.from('workspace_members').select('workspace_id', { count: 'exact' }).eq('workspace_id', activeWorkspace.id),
        supabase.from('tasks').select('id, status', { count: 'exact' }).eq('workspace_id', activeWorkspace.id).is('deleted_at', null),
        supabase.from('daily_updates').select('id, is_late', { count: 'exact' }).eq('workspace_id', activeWorkspace.id),
      ]);

      const totalTasks = taskRes.data?.length || 0;
      const completedTasks = taskRes.data?.filter(t => t.status === 'completed').length || 0;
      const totalUpdates = updateRes.data?.length || 0;
      const lateUpdates = updateRes.data?.filter(u => u.is_late).length || 0;

      setStats({
        total_workspaces: 1,
        total_members: wsRes.count || 0,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        total_updates: totalUpdates,
        late_updates: lateUpdates,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const { data: wsList } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(id, name, slug, created_at)')
        .eq('user_id', user?.id || '')
        .in('permission_role', ['owner', 'admin', 'manager']);

      if (!wsList) { setWorkspaces([]); return; }

      const wsData: AdminWorkspace[] = [];
      for (const row of wsList as any[]) {
        const ws = row.workspaces;
        if (!ws) continue;
        const [memberRes, taskRes] = await Promise.all([
          supabase.from('workspace_members').select('id', { count: 'exact' }).eq('workspace_id', ws.id),
          supabase.from('tasks').select('id', { count: 'exact' }).eq('workspace_id', ws.id).is('deleted_at', null),
        ]);
        wsData.push({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          created_at: ws.created_at,
          member_count: memberRes.count || 0,
          task_count: taskRes.count || 0,
        });
      }
      setWorkspaces(wsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('workspace_members')
        .select('user_id, permission_role, profiles(full_name, avatar_url, email)')
        .eq('workspace_id', activeWorkspace.id);

      if (!data) { setMembers([]); return; }

      setMembers(data.map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name || null,
        avatar_url: m.profiles?.avatar_url || null,
        email: m.profiles?.email || null,
        permission_role: m.permission_role,
        workspace_name: activeWorkspace?.name || '',
        workspace_id: activeWorkspace?.id || '',
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') loadStats();
    else if (activeTab === 'workspaces') loadWorkspaces();
    else if (activeTab === 'members') loadMembers();
  }, [activeTab, activeWorkspace?.id]);

  const handleRoleChange = async (userId: string, wsId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ permission_role: newRole })
        .eq('user_id', userId)
        .eq('workspace_id', wsId);
      if (error) throw error;
      setFeedback({ type: 'success', msg: 'Rol güncellendi.' });
      loadMembers();
    } catch {
      setFeedback({ type: 'error', msg: 'Rol güncellenemedi.' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRemoveMember = async (userId: string, wsId: string) => {
    if (userId === user?.id) { setFeedback({ type: 'error', msg: 'Kendinizi çıkaramazsınız.' }); return; }
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('user_id', userId)
        .eq('workspace_id', wsId);
      if (error) throw error;
      setFeedback({ type: 'success', msg: 'Üye kaldırıldı.' });
      loadMembers();
    } catch {
      setFeedback({ type: 'error', msg: 'Üye kaldırılamadı.' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
        <ShieldAlert size={64} style={{ opacity: 0.3 }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Erişim Engellendi</h2>
        <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>Bu sayfayı yalnızca Admin ve Sahip rolündeki kullanıcılar görebilir.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Feedback */}
      {feedback && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: feedback.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: feedback.type === 'success' ? '#10b981' : '#ef4444',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          backgroundColor: 'rgba(183,1,22,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={20} style={{ color: 'var(--accent-color)' }} />
        </div>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Admin Paneli</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Ekip, üye ve sistem istatistiklerini yönetin
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-surface)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
        {([
          { key: 'stats', label: 'İstatistikler', icon: <BarChart3 size={15} /> },
          { key: 'workspaces', label: 'Ekipler', icon: <Building2 size={15} /> },
          { key: 'members', label: 'Üyeler', icon: <Users size={15} /> },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: activeTab === tab.key ? 'var(--accent-color)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : (
        <>
          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Toplam Üye', value: stats.total_members, icon: <Users size={20} />, color: '#6366f1' },
                { label: 'Toplam Görev', value: stats.total_tasks, icon: <CheckSquare size={20} />, color: '#f59e0b' },
                { label: 'Tamamlanan', value: stats.completed_tasks, icon: <TrendingUp size={20} />, color: '#10b981' },
                { label: 'Tamamlanma %', value: stats.total_tasks > 0 ? `%${Math.round((stats.completed_tasks / stats.total_tasks) * 100)}` : '%0', icon: <BarChart3 size={20} />, color: '#06b6d4' },
                { label: 'Toplam Rapor', value: stats.total_updates, icon: <CheckSquare size={20} />, color: '#8b5cf6' },
                { label: 'Geç Rapor', value: stats.late_updates, icon: <ShieldAlert size={20} />, color: '#ef4444' },
              ].map(stat => (
                <div key={stat.label} style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <div style={{ color: stat.color }}>{stat.icon}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Workspaces Tab */}
          {activeTab === 'workspaces' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {workspaces.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Yönetici olduğunuz ekip bulunamadı.
                </div>
              )}
              {workspaces.map(ws => (
                <div key={ws.id} style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1rem', flexShrink: 0,
                  }}>
                    {ws.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ws.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {ws.member_count} üye · {ws.task_count} görev
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {new Date(ws.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Üye bulunamadı.
                </div>
              )}
              {members.map(member => (
                <div key={member.user_id} style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    backgroundColor: 'var(--accent-color)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden',
                  }}>
                    {member.avatar_url
                      ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (member.full_name || '?').slice(0, 2).toUpperCase()
                    }
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{member.full_name || 'İsimsiz'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{member.email || member.user_id.slice(0, 8)}</div>
                  </div>
                  {/* Role select */}
                  {member.permission_role !== 'owner' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={member.permission_role}
                          onChange={e => handleRoleChange(member.user_id, member.workspace_id, e.target.value)}
                          className="form-input"
                          style={{ padding: '5px 28px 5px 10px', fontSize: '0.78rem', borderRadius: '8px' }}
                        >
                          <option value="admin">Yönetici</option>
                          <option value="manager">Müdür</option>
                          <option value="member">Üye</option>
                          <option value="guest">Misafir</option>
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                      </div>
                      {member.user_id !== user?.id && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleRemoveMember(member.user_id, member.workspace_id)}
                          style={{ padding: '5px 8px', borderRadius: '8px', color: '#ef4444' }}
                          title="Üyeyi çıkar"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>
                      <Crown size={14} /> Sahip
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

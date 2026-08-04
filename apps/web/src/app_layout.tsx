import React, { useState, useEffect, useRef } from 'react';
import { useAuth, supabase } from './context/AuthContext';
import { TasksScreen } from './features/tasks/TasksScreen';
import { DailyUpdatesScreen } from './features/daily_updates/DailyUpdatesScreen';
import { CrmDashboardScreen } from './features/crm/CrmDashboardScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { MessagesScreen } from './features/messages/MessagesScreen';
import { CalendarScreen } from './features/calendar/CalendarScreen';
import { AdminScreen } from './features/admin/AdminScreen';
import { NewsScreen } from './features/news/NewsScreen';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { NotificationBell } from './components/NotificationBell';
import { WorkspaceSettingsModal } from './components/WorkspaceSettingsModal';
import { 
  LogOut, Plus, User, Crown, ArrowRight,
  Sun, Moon, UserPlus, Mail, Check, X, Download, Bell, Users, Menu,
  MessageSquare, ChevronDown, LayoutDashboard, CheckSquare, CalendarDays,
  Cpu, Rocket, Star
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { 
    activeWorkspace, 
    workspaces, 
    selectWorkspace, 
    createWorkspace, 
    inviteMember,
    pendingInvitations,
    acceptInvitation,
    declineInvitation,
    logOut, 
    user,
    role,
    refreshWorkspaces
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'content_panel' | 'tasks' | 'updates' | 'crm' | 'profile' | 'messages' | 'admin' | 'calendar' | 'news' | 'news_ai' | 'news_startup' | 'news_editors'>(() => {
    const saved = localStorage.getItem('kh_active_tab');
    if (saved && ['news', 'news_ai', 'news_startup', 'news_editors', 'messages', 'profile'].includes(saved)) return saved as any;
    return 'news_ai';
  });

  useEffect(() => {
    localStorage.setItem('kh_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeWorkspace && ['news', 'news_ai', 'news_startup', 'news_editors'].includes(activeTab)) {
      setActiveTab('content_panel');
    }
  }, [activeWorkspace?.id]);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showWsSettings, setShowWsSettings] = useState(false);
  const [forcePwaPromptOpen, setForcePwaPromptOpen] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [dismissingBanner, setDismissingBanner] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [initialDMUserId, setInitialDMUserId] = useState<string | null>(null);

  // Auto-dismiss invitation banner after 5.5 s
  useEffect(() => {
    if (pendingInvitations.length === 0 || dismissedBanner) return;
    const t1 = setTimeout(() => setDismissingBanner(true), 5500);
    const t2 = setTimeout(() => setDismissedBanner(true), 5900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pendingInvitations.length, dismissedBanner]);

  // Workspace members for drawer
  interface WorkspaceMember {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    permission_role: string | null;
  }
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    setLoadingMembers(true);
    if (activeWorkspace?.id) {
      supabase
        .from('workspace_members')
        .select('user_id, permission_role, profiles:profiles!workspace_members_user_id_fkey(full_name, avatar_url)')
        .eq('workspace_id', activeWorkspace.id)
        .then(({ data, error }) => {
          setLoadingMembers(false);
          if (!error && data) {
            setWorkspaceMembers(
              data.map((m: any) => ({
                user_id: m.user_id,
                full_name: m.profiles?.full_name || null,
                avatar_url: m.profiles?.avatar_url || null,
                permission_role: m.permission_role || null,
              }))
            );
          }
        });
    } else {
      // General Platform Mode: Fetch all active profiles
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .limit(50)
        .then(({ data, error }) => {
          setLoadingMembers(false);
          if (!error && data) {
            setWorkspaceMembers(
              data.map((p: any) => ({
                user_id: p.id,
                full_name: p.full_name || null,
                avatar_url: p.avatar_url || null,
                permission_role: p.role || 'member',
              }))
            );
          }
        });
    }
  }, [activeWorkspace?.id]);
  
  const handleTabChange = (tab: any) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setActiveTab(tab);
    if (tab === 'messages') {
      setUnreadMsgCount(0);
      localStorage.setItem('kh_last_messages_view_time', new Date().toISOString());
    }
  };

  const handleLogoClick = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    selectWorkspace('');
    setActiveTab('news_ai');
  };

  const handleStartDMFromModal = (targetUserId: string) => {
    setProfileUserId(null);
    setInitialDMUserId(targetUserId);
    handleTabChange('messages');
  };
  
  // Create Workspace Form State
  const [newWsName, setNewWsName] = useState('');
  
  // Invite Member Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviteFeedback, setInviteFeedback] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Theme state setup (sweet light/dark mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [createWsError, setCreateWsError] = useState<string | null>(null);

  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  // Initialize unreadMsgCount
  useEffect(() => {
    const initUnreads = async () => {
      if (!user?.id || workspaces.length === 0) return;
      const lastViewTime = localStorage.getItem('kh_last_messages_view_time') || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      
      const { count, error } = await supabase
        .from('workspace_messages')
        .select('id', { count: 'exact', head: true })
        .in('workspace_id', workspaces.map(w => w.id))
        .neq('user_id', user.id)
        .gt('created_at', lastViewTime);
        
      if (!error && count !== null) {
        setUnreadMsgCount(count);
      }
    };
    initUnreads();
  }, [user?.id, workspaces]);

  // Realtime subscription for unreads
  useEffect(() => {
    if (!user?.id || workspaces.length === 0) return;

    const channel = supabase
      .channel('global-messages-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workspace_messages' },
        (payload: any) => {
          const newMsg = payload.new;
          if (newMsg.user_id !== user.id) {
            const isMyWs = workspaces.some(w => w.id === newMsg.workspace_id);
            if (isMyWs && activeTab !== 'messages') {
              setUnreadMsgCount(prev => prev + 1);
              if (navigator.vibrate) navigator.vibrate(10);
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, workspaces, activeTab]);

  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target as Node)) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    if (isWorkspaceDropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isWorkspaceDropdownOpen]);

  const handleCreateWs = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateWsError(null);
    if (!newWsName.trim()) return;
    
    setIsCreatingWs(true);
    const success = await createWorkspace(newWsName.trim());
    setIsCreatingWs(false);

    if (success) {
      setNewWsName('');
      setShowWorkspaceModal(false);
    } else {
      setCreateWsError('Yeni ekip oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmittingInvite(true);
    setInviteFeedback(null);

    const res = await inviteMember(inviteEmail.trim(), inviteRole);
    setIsSubmittingInvite(false);

    if (res.success) {
      setInviteFeedback({ success: true, message: 'Davet e-postası başarıyla gönderildi!' });
      setInviteEmail('');
    } else {
      setInviteFeedback({ success: false, message: res.message || 'Davet gönderilemedi.' });
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'Kullanıcı';
    const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
    if (metaName && metaName.trim()) return metaName.trim();
    if (user.email) return user.email.split('@')[0];
    return 'Kullanıcı';
  };

  const displayName = getUserDisplayName();
  const avatarUrl = user?.user_metadata?.avatar_url || null;
  const userWorkspaces = workspaces.filter(ws => ws.id !== 'a1111111-1111-1111-1111-111111111111' && ws.id !== '00000000-0000-0000-0000-000000000000' && !ws.name.includes('TanCoreLab Topluluğu'));

  return (
    <div className="app-container">
      {/* Sidebar - Workspace switcher (Desktop only) */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo-panel" onClick={handleLogoClick} title="TanCoreLab Haberler ve Genel Alan'a Git" style={{ cursor: 'pointer' }}>
            <img 
              src="/logo.svg" 
              alt="TanCoreLab Logo" 
              className="brand-logo-img" 
            />
            <span className="brand-logo-text">TanCoreLab</span>
            <ArrowRight size={18} className="brand-logo-arrow" style={{ color: '#ea580c', marginLeft: 'auto', flexShrink: 0 }} />
          </div>
        </div>
        
        <div className="workspace-list" style={{ flex: '0 0 auto', maxHeight: '220px' }}>
          <div style={{ padding: '0 12px 6px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>EKİPLER ({userWorkspaces.length})</span>
            <button 
              onClick={() => setShowWorkspaceModal(true)} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              title="Yeni Ekip Oluştur"
            >
              <Plus size={14} />
            </button>
          </div>

          {userWorkspaces.length === 0 ? (
            <div 
              onClick={() => setShowWorkspaceModal(true)}
              style={{ 
                padding: '10px 12px', 
                fontSize: '0.8rem', 
                color: 'var(--text-sidebar)', 
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                border: '1px dashed var(--border-sidebar-glass)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                margin: '4px 0'
              }}
            >
              <Plus size={14} style={{ color: 'var(--accent-color)' }} />
              <span>İlk Ekibini Kur...</span>
            </div>
          ) : (
            userWorkspaces.map((ws) => (
              <div 
                key={ws.id} 
                className={`workspace-item ${activeWorkspace?.id === ws.id ? 'active' : ''}`}
                onClick={() => {
                  if (activeWorkspace?.id === ws.id) {
                    setShowWsSettings(true);
                  } else {
                    selectWorkspace(ws.id);
                  }
                }}
                title={activeWorkspace?.id === ws.id ? "Ekip Yönetimi ve Ayarları" : undefined}
              >
                <div className="workspace-avatar">
                  {ws.name.substring(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {ws.name}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Ekip Üyeleri */}
        <div style={{ padding: '16px 12px 6px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-sidebar, #94a3b8)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-sidebar-glass, rgba(255, 255, 255, 0.15))' }}>
          <span>EKİP ÜYELERİ{workspaceMembers.length > 0 ? ` (${workspaceMembers.length})` : ''}</span>
          {activeWorkspace && (
            <button 
              onClick={() => setShowTeamModal(true)} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0 }}
              title="Üye Davet Et"
            >
              <UserPlus size={14} />
            </button>
          )}
        </div>

        <div className="workspace-members-list" style={{ flex: 1, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', maxHeight: '40vh', gap: '4px' }}>
          {loadingMembers ? (
            <div style={{ padding: '12px 0', fontSize: '0.8rem', color: 'var(--text-sidebar, #94a3b8)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Üyeler yükleniyor...</span>
            </div>
          ) : !activeWorkspace ? (
            <div style={{ padding: '12px 0', fontSize: '0.8rem', color: 'var(--text-sidebar, #94a3b8)', fontStyle: 'italic' }}>
              Ekip seçilmedi
            </div>
          ) : workspaceMembers.length === 0 ? (
            <div style={{ padding: '8px 0', fontSize: '0.8rem', color: 'var(--text-sidebar, #94a3b8)', fontStyle: 'italic', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Henüz üye yok</span>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowTeamModal(true)}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                <UserPlus size={12} /> Davet Gönder
              </button>
            </div>
          ) : (
            workspaceMembers.map((member) => {
              const name = member.full_name || 'İsimsiz Üye';
              const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
              const isMe = member.user_id === user?.id;
              const isAdmin = member.permission_role === 'admin' || member.permission_role === 'owner';
              return (
                <div
                  key={member.user_id}
                  onClick={() => {
                    if (isMe) {
                      setProfileUserId(null);
                    } else {
                      setProfileUserId(member.user_id);
                    }
                    handleTabChange('profile');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: isMe ? 'rgba(var(--accent-rgb, 255,159,10), 0.08)' : 'transparent',
                    border: isMe ? '1px solid rgba(var(--accent-rgb, 255,159,10), 0.2)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: isMe ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.1)',
                    backgroundImage: member.avatar_url ? `url(${member.avatar_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: isMe ? 'white' : 'var(--text-sidebar, #94a3b8)',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative'
                  }}>
                    {!member.avatar_url && initials}
                    {/* Status Dot */}
                    <span style={{
                      position: 'absolute',
                      bottom: '-1px',
                      right: '-1px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      border: '1.5px solid var(--bg-sidebar, #0e1525)'
                    }} />
                  </div>

                  {/* İsim + Rol */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: isMe ? 700 : 500,
                      fontSize: '0.8rem',
                      color: 'var(--text-sidebar-active, #ffffff)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {name} {isMe && '(Sen)'}
                    </div>
                  </div>

                  {/* Quick DM Button */}
                  {!isMe && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartDMFromModal(member.user_id);
                      }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        padding: '4px', cursor: 'pointer', borderRadius: '4px',
                        display: 'flex', alignItems: 'center'
                      }}
                      title="Direkt Mesaj Gönder"
                    >
                      <MessageSquare size={13} />
                    </button>
                  )}

                  {/* Admin ikonu */}
                  {isAdmin && <Crown size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary btn-block" onClick={() => setShowTeamModal(true)}>
            <UserPlus size={16} />
            <span>Üye Davet Et</span>
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => setShowWorkspaceModal(true)}>
            <Plus size={16} />
            <span>Yeni Ekip Oluştur</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-content">
        {/* App Bar — 3-kolon: sol(hamburger) | orta(ekip seçici) | sağ(bildirim+desktop actions) */}
        <div className="app-bar" style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* SOL — hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
            <button 
              className="btn btn-secondary mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ padding: '8px', borderRadius: '10px' }}
              title="Menüyü Aç"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* ORTA — workspace selector (absolute center) */}
          <div ref={workspaceDropdownRef} className="app-bar-center">
            <button
              onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                minWidth: '140px',
                borderRadius: '14px',
                backgroundColor: 'var(--bg-surface-accent)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '4px',
                backgroundColor: 'var(--accent-color)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800
              }}>
                {activeWorkspace ? activeWorkspace.name.substring(0, 2).toUpperCase() : '?'}
              </div>
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeWorkspace ? activeWorkspace.name : 'Ekip Seçilmedi'}
              </span>
              <ChevronDown size={14} style={{ opacity: 0.6, transform: isWorkspaceDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>

            {isWorkspaceDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '240px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                zIndex: 1000,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {userWorkspaces.map((ws) => (
                    <div
                      key={ws.id}
                      onClick={() => {
                        selectWorkspace(ws.id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: activeWorkspace?.id === ws.id ? 'rgba(var(--accent-rgb, 183,1,22), 0.1)' : 'transparent',
                        color: activeWorkspace?.id === ws.id ? 'var(--accent-color)' : 'var(--text-primary)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (activeWorkspace?.id !== ws.id) e.currentTarget.style.background = 'var(--bg-surface-accent)';
                      }}
                      onMouseLeave={(e) => {
                        if (activeWorkspace?.id !== ws.id) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '6px',
                        backgroundColor: activeWorkspace?.id === ws.id ? 'var(--accent-color)' : 'var(--bg-surface)',
                        color: activeWorkspace?.id === ws.id ? '#fff' : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 800
                      }}>
                        {ws.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ws.name}
                      </span>
                      {activeWorkspace?.id === ws.id && <Check size={14} />}
                    </div>
                  ))}
                  
                  <div style={{ height: '1px', background: 'var(--border-glass)', margin: '4px 0' }} />
                  
                  <div
                    onClick={() => {
                      setShowTeamModal(true);
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <UserPlus size={16} />
                    <span>Üye Davet Et</span>
                  </div>
                  
                  <div
                    onClick={() => {
                      setShowWorkspaceModal(true);
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Plus size={16} />
                    <span>Yeni Ekip Oluştur</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SAĞ — mobilde: sadece bildirim zili (davet sayısı dahil). Masaüstünde ekstra düğmeler */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
            {/* Davet + Bildirim zili (mobil+masaüstü) */}
            <div style={{ position: 'relative' }}>
              <NotificationBell />
              {/* Davet rozeti zil üzerinde */}
              {pendingInvitations.length > 0 && (
                <span
                  onClick={() => setShowTeamModal(true)}
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-surface)',
                    cursor: 'pointer',
                    zIndex: 10,
                    animation: 'pulse-badge 1.5s infinite',
                  }}
                  title={`${pendingInvitations.length} bekleyen davet`}
                >
                  {pendingInvitations.length}
                </span>
              )}
            </div>

            {/* Masaüstüne özgü düğmeler */}
            <button 
              className="btn btn-primary desktop-only-btn" 
              onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setForcePwaPromptOpen(true); }}
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Uygulamayı İndir"
            >
              <Download size={15} />
              <span>İndir</span>
            </button>
            <button 
              className="btn btn-secondary btn-icon-only desktop-only-btn" 
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Açık Mod' : 'Koyu Mod'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
             <div 
              className="user-profile-info desktop-workspace-title" 
              onClick={() => handleTabChange('profile')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
              title="Profilime Git"
            >
              <User size={16} />
              <span style={{ whiteSpace: 'nowrap' }}>
                {user?.email}
              </span>
            </div>
            <button className="btn btn-secondary btn-logout desktop-only-btn" style={{ padding: '8px 12px' }} onClick={logOut}>
              <LogOut size={16} />
              <span className="logout-text">Çıkış</span>
            </button>
          </div>
        </div>

        {/* Top In-App Invitation Notification Banner */}
        {pendingInvitations.length > 0 && !dismissedBanner && (
          <div className={`top-invitation-banner${dismissingBanner ? ' dismissing' : ''}`}>
            <div className="top-banner-content">
              <div className="bell-badge-wrapper">
                <Bell size={20} className="bell-ring-anim" />
              </div>
              <div className="top-banner-text">
                <div className="top-banner-title">
                  <span><strong>{pendingInvitations[0].workspaceName}</strong> ekibinden yeni davet!</span>
                  <span className="role-tag">{pendingInvitations[0].permissionRole.toUpperCase()}</span>
                </div>
                <div className="top-banner-subtitle">
                  Gönderen: {pendingInvitations[0].invitedByEmail}
                </div>
              </div>
            </div>

            <div className="top-banner-actions">
              <button 
                className="btn btn-primary" 
                style={{ padding: '7px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={async () => {
                  const ok = await acceptInvitation(pendingInvitations[0].id);
                  if (ok && navigator.vibrate) navigator.vibrate([10, 50, 10]);
                }}
              >
                <Check size={16} />
                <span>Ekibe Katıl</span>
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ padding: '7px 12px', fontSize: '0.85rem' }}
                onClick={async () => {
                  await declineInvitation(pendingInvitations[0].id);
                }}
              >
                <X size={16} />
                <span>Reddet</span>
              </button>

              {pendingInvitations.length > 1 && (
                <button 
                  className="btn btn-secondary"
                  style={{ padding: '7px 12px', fontSize: '0.85rem' }}
                  onClick={() => setShowTeamModal(true)}
                >
                  +{pendingInvitations.length - 1} Davet Daha
                </button>
              )}

              <button 
                className="banner-close-btn"
                onClick={() => { setDismissingBanner(true); setTimeout(() => setDismissedBanner(true), 400); }}
                title="Kapat"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation (Desktop view) */}
        <div className="nav-tabs">
          {activeWorkspace ? (
            <>
              <div 
                className={`nav-tab ${activeTab === 'content_panel' ? 'active' : ''}`}
                onClick={() => handleTabChange('content_panel')}
              >
                <LayoutDashboard size={16} />
                <span>İçerik Paneli</span>
              </div>
              <div 
                className={`nav-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                onClick={() => handleTabChange('tasks')}
              >
                <CheckSquare size={16} />
                <span>Görevler</span>
              </div>
              <div 
                className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => handleTabChange('calendar')}
              >
                <CalendarDays size={16} />
                <span>Takvim</span>
              </div>
              <div 
                className={`nav-tab ${activeTab === 'messages' ? 'active' : ''}`}
                onClick={() => handleTabChange('messages')}
                style={{ position: 'relative' }}
              >
                <MessageSquare size={16} />
                <span>Sohbet</span>
                {unreadMsgCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    borderRadius: '50%',
                    padding: '2px 5px',
                    lineHeight: 1
                  }}>
                    {unreadMsgCount}
                  </span>
                )}
              </div>
              <div 
                className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => handleTabChange('profile')}
              >
                <User size={16} />
                <span>Profilim</span>
              </div>
            </>
          ) : (
            <>
              <div 
                className={`nav-tab ${activeTab === 'news_ai' ? 'active' : ''}`}
                onClick={() => handleTabChange('news_ai')}
              >
                <Cpu size={16} />
                <span>Yapay Zeka Gelişmeleri</span>
              </div>
              <div 
                className={`nav-tab ${activeTab === 'news_startup' ? 'active' : ''}`}
                onClick={() => handleTabChange('news_startup')}
              >
                <Rocket size={16} />
                <span>Girişimcilik Haberleri</span>
              </div>
              <div 
                className={`nav-tab ${activeTab === 'news_editors' ? 'active' : ''}`}
                onClick={() => handleTabChange('news_editors')}
              >
                <Star size={16} />
                <span>Editörün Seçimleri</span>
              </div>
              <div 
                className={`nav-tab ${activeTab === 'messages' ? 'active' : ''}`}
                onClick={() => handleTabChange('messages')}
                style={{ position: 'relative' }}
              >
                <MessageSquare size={16} />
                <span>Sohbet</span>
                {unreadMsgCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    borderRadius: '50%',
                    padding: '2px 5px',
                    lineHeight: 1
                  }}>
                    {unreadMsgCount}
                  </span>
                )}
              </div>
              <div 
                className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => handleTabChange('profile')}
              >
                <User size={16} />
                <span>Profilim</span>
              </div>
            </>
          )}
        </div>

        {/* View Area */}
        <div className="view-area">
          {!activeWorkspace && ['content_panel', 'tasks', 'updates', 'calendar', 'crm', 'admin'].includes(activeTab) ? (
            <div className="zero-workspace-card">
              <div className="zero-workspace-icon">
                <Users size={36} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
                TanCoreLab Ekip Paneline Hoş Geldiniz!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '28px', maxWidth: '480px', margin: '0 auto 24px' }}>
                Henüz özel bir ekibe dahil değilsiniz. Kendi ekibinizi oluşturabilir veya TanCoreLab Topluluğu'nda diğer üyelerle vakit geçirebilirsiniz.
              </p>

              {/* Pending invitations list in zero state */}
              {pendingInvitations.length > 0 ? (
                <div style={{
                  backgroundColor: 'rgba(99,102,241,0.08)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  marginBottom: '24px',
                  textAlign: 'left'
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <Mail size={18} style={{ color: 'var(--accent-color)' }} />
                    Size Gönderilen Ekip Davetleri ({pendingInvitations.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pendingInvitations.map((inv) => (
                      <div key={inv.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--bg-surface)',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-glass)'
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{inv.workspaceName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Gönderen: {inv.invitedByEmail} • Rol: {inv.permissionRole}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={() => acceptInvitation(inv.id)}>
                            <Check size={15} /> Katıl
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => declineInvitation(inv.id)}>
                            <X size={15} /> Reddet
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-surface-accent)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <Bell size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                  <span>Sol üstteki TanCoreLab paneline tıklayarak haberlere ve sohbet alanına ulaşabilirsiniz.</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={() => setShowWorkspaceModal(true)}>
                  <Plus size={18} />
                  <span>Kendi Ekibini Oluştur</span>
                </button>
                <button className="btn btn-secondary" style={{ padding: '12px 20px', fontSize: '0.95rem' }} onClick={handleLogoClick}>
                  <Users size={18} />
                  <span>TanCoreLab Topluluğu'na Git</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {(activeTab === 'news' || activeTab === 'news_ai') && <NewsScreen initialCategory="ai" onNavigateToChat={() => handleTabChange('messages')} />}
              {activeTab === 'news_startup' && <NewsScreen initialCategory="startup" onNavigateToChat={() => handleTabChange('messages')} />}
              {activeTab === 'news_editors' && <NewsScreen initialCategory="editors" onNavigateToChat={() => handleTabChange('messages')} />}
              {activeTab === 'content_panel' && <TasksScreen boardMode="content" />}
              {activeTab === 'tasks' && <TasksScreen boardMode="tasks" />}
              {activeTab === 'updates' && <DailyUpdatesScreen />}
              {activeTab === 'calendar' && <CalendarScreen />}
              {activeTab === 'crm' && role && ['owner', 'admin', 'manager'].includes(role) && <CrmDashboardScreen />}
              {activeTab === 'profile' && (
                <ProfileScreen 
                  targetUserId={profileUserId} 
                  onStartDM={handleStartDMFromModal}
                />
              )}
              {activeTab === 'messages' && (
                <MessagesScreen 
                  initialDMUserId={initialDMUserId} 
                  onClearInitialDM={() => setInitialDMUserId(null)} 
                />
              )}
              {activeTab === 'admin' && role && ['owner', 'admin'].includes(role) && <AdminScreen />}
            </>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      {(activeTab === 'content_panel' || activeTab === 'tasks' || activeTab === 'updates') && (
        <button
          className="mobile-fab animate-fade-in"
          onClick={() => {
            if (activeTab === 'content_panel' || activeTab === 'tasks') {
              window.dispatchEvent(new CustomEvent('trigger-add-task'));
            } else if (activeTab === 'updates') {
              window.dispatchEvent(new CustomEvent('trigger-add-report'));
            }
          }}
          title={activeTab === 'content_panel' ? 'Yeni İçerik Ekle' : activeTab === 'tasks' ? 'Yeni Görev Ekle' : 'Bugün Neler Yaptım Ekle'}
        >
          <Plus size={24} />
        </button>
      )}

      {/* Sticky Bottom Navigation Bar (Mobile View) */}
      <div className="mobile-nav-bar">
        {activeWorkspace ? (
          <>
            <button 
              className={`mobile-nav-item ${activeTab === 'content_panel' ? 'active' : ''}`}
              onClick={() => handleTabChange('content_panel')}
            >
              <LayoutDashboard size={20} />
              <span>İçerik</span>
            </button>
            <button 
              className={`mobile-nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => handleTabChange('tasks')}
            >
              <CheckSquare size={20} />
              <span>Görevler</span>
            </button>
            <button 
              className={`mobile-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => handleTabChange('calendar')}
            >
              <CalendarDays size={20} />
              <span>Takvim</span>
            </button>
            <button 
              className={`mobile-nav-item ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => handleTabChange('messages')}
              style={{ position: 'relative' }}
            >
              <MessageSquare size={20} />
              <span>Sohbet</span>
              {unreadMsgCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: 'calc(50% - 18px)',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  borderRadius: '50%',
                  padding: '2px 5px',
                  lineHeight: 1
                }}>
                  {unreadMsgCount}
                </span>
              )}
            </button>
            <button 
              className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabChange('profile')}
            >
              <User size={20} />
              <span>Profilim</span>
            </button>
          </>
        ) : (
          <>
            <button 
              className={`mobile-nav-item ${activeTab === 'news_ai' ? 'active' : ''}`}
              onClick={() => handleTabChange('news_ai')}
            >
              <Cpu size={20} />
              <span>Yapay Zeka</span>
            </button>
            <button 
              className={`mobile-nav-item ${activeTab === 'news_startup' ? 'active' : ''}`}
              onClick={() => handleTabChange('news_startup')}
            >
              <Rocket size={20} />
              <span>Girişimcilik</span>
            </button>
            <button 
              className={`mobile-nav-item ${activeTab === 'news_editors' ? 'active' : ''}`}
              onClick={() => handleTabChange('news_editors')}
            >
              <Star size={20} />
              <span>Editör</span>
            </button>
            <button 
              className={`mobile-nav-item ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => handleTabChange('messages')}
              style={{ position: 'relative' }}
            >
              <MessageSquare size={20} />
              <span>Sohbet</span>
              {unreadMsgCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: 'calc(50% - 18px)',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  borderRadius: '50%',
                  padding: '2px 5px',
                  lineHeight: 1
                }}>
                  {unreadMsgCount}
                </span>
              )}
            </button>
            <button 
              className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabChange('profile')}
            >
              <User size={20} />
              <span>Profilim</span>
            </button>
          </>
        )}
      </div>

      {/* Mobile Navigation & Workspace Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-sidebar-glass)' }}>
              <div className="brand-logo-panel mobile-brand-panel" onClick={() => { handleLogoClick(); setIsMobileMenuOpen(false); }} style={{ cursor: 'pointer' }}>
                <img 
                  src="/logo.svg" 
                  alt="TanCoreLab" 
                  className="brand-logo-img" 
                />
                <span className="brand-logo-text">TanCoreLab</span>
                <ArrowRight size={18} className="brand-logo-arrow" style={{ color: '#ea580c', marginLeft: 'auto', flexShrink: 0 }} />
              </div>
              <button 
                className="btn btn-secondary btn-icon-only" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* User Details Box (Clicking opens Profile page) */}
            <div 
              onClick={() => {
                handleTabChange('profile');
                setIsMobileMenuOpen(false);
              }}
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-accent)',
                borderRadius: 'var(--radius-md)',
                margin: '12px 16px 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid var(--border-glass)',
                cursor: 'pointer'
              }}
              title="Profilim Sayfasına Git"
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color)',
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {!avatarUrl && displayName.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              {/* Ekip Üyeleri */}
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>EKİP ÜYELERİ{workspaceMembers.length > 0 ? ` (${workspaceMembers.length})` : ''}</span>
                {activeWorkspace && (
                  <span 
                    style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowWsSettings(true);
                    }}
                    title="Ekip Yönetimi ve Ayarları"
                  >
                    {activeWorkspace.name}
                  </span>
                )}
              </div>
              {workspaceMembers.length === 0 && (
                <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Yükleniyor...
                </div>
              )}
              {workspaceMembers.map((member) => {
                const name = member.full_name || 'İsimsiz Üye';
                const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                const isMe = member.user_id === user?.id;
                const isAdmin = member.permission_role === 'admin' || member.permission_role === 'owner';
                return (
                  <div
                    key={member.user_id}
                    onClick={() => {
                      if (isMe) {
                        handleTabChange('profile');
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '4px',
                      background: isMe ? 'rgba(var(--accent-rgb, 183,1,22), 0.08)' : 'var(--bg-surface-accent)',
                      border: `1px solid ${isMe ? 'var(--accent-color)' : 'var(--border-glass)'}`,
                      cursor: isMe ? 'pointer' : 'default',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isMe ? 'var(--accent-color)' : 'var(--bg-card)',
                      backgroundImage: member.avatar_url ? `url(${member.avatar_url})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: isMe ? 'white' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '2px solid var(--border-glass)',
                    }}>
                      {!member.avatar_url && initials}
                    </div>

                    {/* İsim + Rol */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: isMe ? 700 : 500,
                        fontSize: '0.88rem',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}>
                        {name}
                        {isMe && <span style={{ fontSize: '0.65rem', color: 'var(--accent-color)', fontWeight: 700 }}>Sen</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {isAdmin ? 'Yönetici' : 'Üye'}
                      </div>
                    </div>

                    {/* Admin ikonu */}
                    {isAdmin && <Crown size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>

            <div className="mobile-drawer-footer" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-sidebar-glass)' }}>
              <button 
                className="btn btn-primary btn-block" 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowTeamModal(true);
                }}
              >
                <UserPlus size={16} />
                <span>Üye Davet Et</span>
              </button>
              <button 
                className="btn btn-secondary btn-block" 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowWorkspaceModal(true);
                }}
              >
                <Plus size={16} />
                <span>Yeni Ekip Oluştur</span>
              </button>

              <div style={{ height: '1px', backgroundColor: 'var(--border-sidebar-glass)', margin: '4px 0' }} />

              <button 
                className="btn btn-secondary btn-block" 
                onClick={toggleTheme}
                style={{ justifyContent: 'flex-start', gap: '10px' }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'dark' ? 'Açık Mod' : 'Koyu Mod'}</span>
              </button>

              <button 
                className="btn btn-secondary btn-logout btn-block" 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logOut();
                }}
                style={{ justifyContent: 'flex-start', gap: '10px' }}
              >
                <LogOut size={16} />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Invitation & Management Modal */}
      {showTeamModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Ekip & Davetler</span>
              <button className="btn btn-secondary btn-icon-only" onClick={() => setShowTeamModal(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Pending Invitations Section (Gelen Ekip Davetleri) */}
            {pendingInvitations.length > 0 && (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={18} style={{ color: 'var(--accent-color)' }} />
                  Gelen Davetler ({pendingInvitations.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingInvitations.map((inv) => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{inv.workspaceName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Rol: {inv.permissionRole} • Gönderen: {inv.invitedByEmail || 'Yönetici'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => acceptInvitation(inv.id)}>
                          <Check size={14} /> Kabul Et
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => declineInvitation(inv.id)}>
                          <X size={14} /> Reddet
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite Form Section (Kendi Ekibine Üye Çağır) */}
            <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Üye Davet Et ({activeWorkspace?.name})
              </div>

              {inviteFeedback && (
                <div className={`alert ${inviteFeedback.success ? 'alert-success' : 'alert-danger'}`} style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  backgroundColor: inviteFeedback.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  color: inviteFeedback.success ? '#10b981' : '#ef4444',
                  border: inviteFeedback.success ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                }}>
                  {inviteFeedback.message}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">E-posta</label>
                <input
                  type="email"
                  required
                  placeholder="ekip-arkadasi@tancorelab.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rol</label>
                <select 
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="form-input"
                >
                  <option value="staff">Personel</option>
                  <option value="representative">Temsilci</option>
                  <option value="admin">Yönetici</option>
                </select>
              </div>

              <div className="modal-footer" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTeamModal(false)}>Kapat</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingInvite}>
                  {isSubmittingInvite ? 'Gönderiliyor...' : 'Davet Et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showWorkspaceModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">Yeni Ekip</div>
            {createWsError && (
              <div className="alert alert-danger" style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                {createWsError}
              </div>
            )}
            <form onSubmit={handleCreateWs} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Ekip Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ankara Ekibi"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setCreateWsError(null); setShowWorkspaceModal(false); }}>İptal</button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingWs}>
                  {isCreatingWs ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Native PWA Install Prompt Banner & Sheet Modal */}
      <PwaInstallPrompt forceOpen={forcePwaPromptOpen} onCloseForce={() => setForcePwaPromptOpen(false)} />

      {/* Workspace Settings Modal */}
      {showWsSettings && activeWorkspace && user && (
        <WorkspaceSettingsModal
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          currentUserId={user.id}
          onClose={() => setShowWsSettings(false)}
          onWorkspaceUpdated={async (_newName) => {
            await refreshWorkspaces();
            setShowWsSettings(false);
          }}
          onWorkspaceLeft={async () => {
            setShowWsSettings(false);
            await refreshWorkspaces();
          }}
        />
      )}
    </div>
  );
};

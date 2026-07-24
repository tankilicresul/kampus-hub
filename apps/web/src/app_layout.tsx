import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from './context/AuthContext';
import { TasksScreen } from './features/tasks/TasksScreen';
import { DailyUpdatesScreen } from './features/daily_updates/DailyUpdatesScreen';
import { CrmDashboardScreen } from './features/crm/CrmDashboardScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { NotificationBell } from './components/NotificationBell';
import { WorkspaceSettingsModal } from './components/WorkspaceSettingsModal';
import { 
  LogOut, Plus, CheckSquare, Calendar, BarChart4, User, Crown, Settings,
  Sun, Moon, UserPlus, Mail, Check, X, Download, Bell, Users, Menu 
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
    user 
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'updates' | 'crm' | 'profile'>('tasks');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showWsSettings, setShowWsSettings] = useState(false);
  const [forcePwaPromptOpen, setForcePwaPromptOpen] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Workspace members for drawer
  interface WorkspaceMember {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    permission_role: string | null;
  }
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  useEffect(() => {
    if (!activeWorkspace?.id || !isMobileMenuOpen) return;
    supabase
      .from('workspace_members')
      .select('user_id, permission_role, profiles(full_name, avatar_url)')
      .eq('workspace_id', activeWorkspace.id)
      .then(({ data }) => {
        if (data) {
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
  }, [activeWorkspace?.id, isMobileMenuOpen]);
  
  const handleTabChange = (tab: 'tasks' | 'updates' | 'crm' | 'profile') => {
    if (navigator.vibrate) navigator.vibrate(10);
    setActiveTab(tab);
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
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
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

  return (
    <div className="app-container">
      {/* Sidebar - Workspace switcher (Desktop only) */}
      <div className="sidebar">
        <div className="sidebar-header">
          <img 
            src="/logo.svg" 
            alt="Kampüs Hub Logo" 
            style={{ width: '36px', height: '36px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} 
          />
          <span className="sidebar-logo">Kampüs Hub</span>
        </div>
        
        <div className="workspace-list">
          <div style={{ padding: '0 12px 6px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            EKİPLER
          </div>
          {workspaces.length === 0 && (
            <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Henüz ekip yok
            </div>
          )}
          {workspaces.map((ws) => (
            <div 
              key={ws.id} 
              className={`workspace-item ${activeWorkspace?.id === ws.id ? 'active' : ''}`}
              onClick={() => selectWorkspace(ws.id)}
            >
              <div className="workspace-avatar">
                {ws.name.substring(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ws.name}
              </span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary btn-block" onClick={() => setShowTeamModal(true)}>
            <UserPlus size={16} />
            <span>Davet Et</span>
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => setShowWorkspaceModal(true)}>
            <Plus size={16} />
            <span>Yeni Ekip</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-content">
        {/* App Bar — 3-kolon: sol(hamburger) | orta(ekip seçici) | sağ(bildirim+desktop actions) */}
        <div className="app-bar" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

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
          <div style={{ 
            position: 'absolute', 
            left: '50%', 
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
          }}>
            <select 
              value={activeWorkspace?.id || '__none__'} 
              onChange={(e) => {
                if (e.target.value === '__add_new_workspace__') {
                  setShowWorkspaceModal(true);
                } else if (e.target.value === '__invite_team__') {
                  setShowTeamModal(true);
                } else if (e.target.value !== '__none__') {
                  selectWorkspace(e.target.value);
                }
              }}
              className="form-input"
              style={{ 
                padding: '6px 12px', 
                fontSize: '0.85rem', 
                maxWidth: '160px', 
                borderRadius: '14px',
                backgroundColor: 'var(--bg-surface-accent)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {!activeWorkspace && <option value="__none__">Ekip Seçilmedi</option>}
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
              <option value="__invite_team__">+ Üye Davet</option>
              <option value="__add_new_workspace__">+ Yeni Ekip</option>
            </select>
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
            <div className="user-profile-info desktop-workspace-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <User size={16} />
              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </span>
            </div>
            <button className="btn btn-secondary desktop-only-btn" style={{ padding: '8px 12px' }} onClick={logOut}>
              <LogOut size={16} />
              <span className="logout-text">Çıkış</span>
            </button>
          </div>
        </div>

        {/* Top In-App Invitation Notification Banner */}
        {pendingInvitations.length > 0 && !dismissedBanner && (
          <div className="top-invitation-banner">
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
                onClick={() => setDismissedBanner(true)}
                title="Kapat"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation (Desktop view) */}
        <div className="nav-tabs">
          <div 
            className={`nav-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => handleTabChange('tasks')}
          >
            <CheckSquare size={16} />
            <span>Görevler</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'updates' ? 'active' : ''}`}
            onClick={() => handleTabChange('updates')}
          >
            <Calendar size={16} />
            <span>Raporlar</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'crm' ? 'active' : ''}`}
            onClick={() => handleTabChange('crm')}
          >
            <BarChart4 size={16} />
            <span>CRM</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            <User size={16} />
            <span>Profil</span>
          </div>
        </div>

        {/* View Area */}
        <div className="view-area">
          {!activeWorkspace ? (
            <div className="zero-workspace-card">
              <div className="zero-workspace-icon">
                <Users size={36} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
                Kampüs Hub'a Hoş Geldiniz!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '28px', maxWidth: '480px', margin: '0 auto 24px' }}>
                Henüz herhangi bir ekibe dahil değilsiniz. Kendi ekibinizi oluşturabilir veya başkalarının gönderdiği davetlere katılarak hemen çalışmaya başlayabilirsiniz.
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
                  <span>Arkadaşınız size e-posta daveti gönderdiğinde ekranınızın üstünde bildirim belirecektir.</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={() => setShowWorkspaceModal(true)}>
                  <Plus size={18} />
                  <span>Kendi Ekibini Oluştur</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'tasks' && <TasksScreen />}
              {activeTab === 'updates' && <DailyUpdatesScreen />}
              {activeTab === 'crm' && <CrmDashboardScreen />}
              {activeTab === 'profile' && <ProfileScreen />}
            </>
          )}
        </div>
      </div>

      {/* Sticky Bottom Navigation Bar (Mobile View) */}
      <div className="mobile-nav-bar">
        <button 
          className={`mobile-nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => handleTabChange('tasks')}
        >
          <CheckSquare size={20} />
          <span>Görevler</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'updates' ? 'active' : ''}`}
          onClick={() => handleTabChange('updates')}
        >
          <Calendar size={20} />
          <span>Raporlar</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'crm' ? 'active' : ''}`}
          onClick={() => handleTabChange('crm')}
        >
          <BarChart4 size={20} />
          <span>CRM</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          <User size={20} />
          <span>Profil</span>
        </button>
      </div>

      {/* Mobile Navigation & Workspace Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src="/logo.svg" 
                  alt="Kampüs Hub" 
                  style={{ width: '30px', height: '30px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} 
                />
                <span className="sidebar-logo">Kampüs Hub</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 400, fontSize: '0.65rem', color: 'var(--accent-color)' }}>{activeWorkspace?.name}</span>
                  {activeWorkspace && (
                    <button
                      className="btn btn-secondary btn-icon-only"
                      style={{ padding: '4px', borderRadius: '8px' }}
                      title="Ekip Ayarları"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setShowWsSettings(true);
                      }}
                    >
                      <Settings size={13} />
                    </button>
                  )}
                </div>
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '4px',
                      background: isMe ? 'rgba(var(--accent-rgb, 183,1,22), 0.08)' : 'var(--bg-surface-accent)',
                      border: `1px solid ${isMe ? 'var(--accent-color)' : 'var(--border-glass)'}`,
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

            <div className="mobile-drawer-footer" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-glass)' }}>
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

              <div style={{ height: '1px', backgroundColor: 'var(--border-glass)', margin: '4px 0' }} />

              <button 
                className="btn btn-secondary btn-block" 
                onClick={toggleTheme}
                style={{ justifyContent: 'flex-start', gap: '10px' }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'dark' ? 'Açık Mod' : 'Koyu Mod'}</span>
              </button>

              <button 
                className="btn btn-secondary btn-block" 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logOut();
                }}
                style={{ justifyContent: 'flex-start', gap: '10px', color: 'var(--color-danger)' }}
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
                  placeholder="ekip-arkadasi@kampuskapinda.com"
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
          onWorkspaceUpdated={(newName) => {
            // AuthContext'teki workspace adını güncelle
            selectWorkspace(activeWorkspace.id);
            setShowWsSettings(false);
          }}
          onWorkspaceLeft={() => {
            setShowWsSettings(false);
            // Başka bir workspace'e geç veya sayfayı yenile
            const otherWs = workspaces.find((w) => w.id !== activeWorkspace.id);
            if (otherWs) selectWorkspace(otherWs.id);
            else window.location.reload();
          }}
        />
      )}
    </div>
  );
};

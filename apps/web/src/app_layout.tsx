import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { TasksScreen } from './features/tasks/TasksScreen';
import { DailyUpdatesScreen } from './features/daily_updates/DailyUpdatesScreen';
import { CrmDashboardScreen } from './features/crm/CrmDashboardScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { 
  LogOut, Plus, CheckSquare, Calendar, BarChart4, FolderClosed, User, 
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
  const [forcePwaPromptOpen, setForcePwaPromptOpen] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
          <FolderClosed size={20} style={{ color: 'var(--accent-color)' }} />
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
        {/* App Bar */}
        <div className="app-bar">
          <div className="app-bar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mobile Hamburger Drawer Trigger */}
            <button 
              className="btn btn-secondary mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ padding: '8px', borderRadius: '10px' }}
              title="Menüyü Aç"
            >
              <Menu size={20} />
            </button>

            {/* App Folder Icon & Team Selector */}
            <div className="app-bar-brand" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FolderClosed size={20} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
            </div>
            
            {/* Team Selector Dropdown (Quick select) */}
            <div className="mobile-workspace-selector" style={{ marginLeft: '4px' }}>
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
                  padding: '5px 10px', 
                  fontSize: '0.8rem', 
                  maxWidth: '140px', 
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-surface-accent)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-primary)',
                  fontWeight: 600
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
          </div>
          
          <div className="app-bar-actions">
            {/* PWA Install Button */}
            <button 
              className="btn btn-primary desktop-only-btn" 
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                setForcePwaPromptOpen(true);
              }}
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Uygulamayı İndir"
            >
              <Download size={15} />
              <span>İndir</span>
            </button>

            {/* Pending Invitations Badge Button */}
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowTeamModal(true)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Davetler"
            >
              <UserPlus size={16} />
              <span className="desktop-workspace-title">Davetler</span>
              {pendingInvitations.length > 0 && (
                <span className="invitation-badge-pulse" style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {pendingInvitations.length}
                </span>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button 
              className="btn btn-secondary btn-icon-only desktop-only-btn" 
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Açık Mod' : 'Koyu Mod'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User Profile Info */}
            <div className="user-profile-info desktop-workspace-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <User size={16} />
              <span className="user-email-text" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </span>
            </div>

            {/* Logout Button */}
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
                <FolderClosed size={20} style={{ color: 'var(--accent-color)' }} />
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

            <div className="workspace-list" style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px' }}>
                EKİPLERİNİZ ({workspaces.length})
              </div>
              {workspaces.length === 0 && (
                <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Henüz bir ekibe dahil değilsiniz
                </div>
              )}
              {workspaces.map((ws) => (
                <div 
                  key={ws.id} 
                  className={`workspace-item ${activeWorkspace?.id === ws.id ? 'active' : ''}`}
                  onClick={() => {
                    selectWorkspace(ws.id);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{ padding: '12px', marginBottom: '4px' }}
                >
                  <div className="workspace-avatar">
                    {ws.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.9rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ws.name}
                  </span>
                  {activeWorkspace?.id === ws.id && <Check size={16} />}
                </div>
              ))}
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
    </div>
  );
};

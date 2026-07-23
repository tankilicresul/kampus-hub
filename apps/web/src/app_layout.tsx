import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { TasksScreen } from './features/tasks/TasksScreen';
import { DailyUpdatesScreen } from './features/daily_updates/DailyUpdatesScreen';
import { CrmDashboardScreen } from './features/crm/CrmDashboardScreen';
import { LogOut, Plus, CheckSquare, Calendar, BarChart4, FolderClosed, User, Sun, Moon, UserPlus, Mail, Check, X } from 'lucide-react';

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
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'updates' | 'crm'>('tasks');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  
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

  const handleCreateWs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    
    const success = await createWorkspace(newWsName.trim());
    if (success) {
      setNewWsName('');
      setShowWorkspaceModal(false);
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

  return (
    <div className="app-container">
      {/* Sidebar - Workspace switcher (Desktop only) */}
      <div className="sidebar">
        <div className="sidebar-header">
          <FolderClosed size={20} style={{ color: 'var(--accent-color)' }} />
          <span className="sidebar-logo">Kampüs Kapında CRM</span>
        </div>
        
        <div className="workspace-list">
          <div style={{ padding: '0 12px 6px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            EKİPLER VE ÇALIŞMA ALANLARI
          </div>
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
            <span>Ekibe Üye Çağır</span>
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => setShowWorkspaceModal(true)}>
            <Plus size={16} />
            <span>Yeni Ekip / Workspace Kur</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-content">
        {/* App Bar */}
        <div className="app-bar">
          <div className="app-bar-left">
            {/* Desktop Workspace Title */}
            <div className="app-bar-title desktop-workspace-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>{activeWorkspace ? activeWorkspace.name : 'Workspace seçilmedi'}</span>
              {activeWorkspace?.permissionRole && (
                <span className="badge" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', backgroundColor: 'rgba(99,102,241,0.15)', color: 'var(--accent-color)' }}>
                  {activeWorkspace.permissionRole.toUpperCase()}
                </span>
              )}
            </div>
            
            {/* Mobile Workspace Selector (dropdown) */}
            <div className="mobile-workspace-selector">
              {activeWorkspace && (
                <select 
                  value={activeWorkspace.id} 
                  onChange={(e) => {
                    if (e.target.value === '__add_new_workspace__') {
                      setShowWorkspaceModal(true);
                    } else if (e.target.value === '__invite_team__') {
                      setShowTeamModal(true);
                    } else {
                      selectWorkspace(e.target.value);
                    }
                  }}
                  className="form-input"
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.85rem', 
                    width: '180px', 
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-surface-accent)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                  <option value="__invite_team__">+ Ekibe Üye Davet Et</option>
                  <option value="__add_new_workspace__">+ Yeni Ekip Kur</option>
                </select>
              )}
            </div>
          </div>
          
          <div className="app-bar-actions">
            {/* Pending Invitations Badge Button */}
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowTeamModal(true)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Ekip ve Davet Yönetimi"
            >
              <UserPlus size={16} />
              <span className="desktop-workspace-title">Ekip Davetleri</span>
              {pendingInvitations.length > 0 && (
                <span style={{
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
              className="btn btn-secondary btn-icon-only" 
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Açık Moda Geç' : 'Karanlık Moda Geç'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User Profile Info */}
            <div className="user-profile-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <User size={16} />
              <span className="user-email-text" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </span>
            </div>

            {/* Logout Button */}
            <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={logOut}>
              <LogOut size={16} />
              <span className="logout-text">Çıkış</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation (Desktop view) */}
        <div className="nav-tabs">
          <div 
            className={`nav-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <CheckSquare size={16} />
            <span>Görevler</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'updates' ? 'active' : ''}`}
            onClick={() => setActiveTab('updates')}
          >
            <Calendar size={16} />
            <span>Günlük Raporlar</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'crm' ? 'active' : ''}`}
            onClick={() => setActiveTab('crm')}
          >
            <BarChart4 size={16} />
            <span>Kampüs Kapında CRM</span>
          </div>
        </div>

        {/* View Area */}
        <div className="view-area">
          {activeTab === 'tasks' && <TasksScreen />}
          {activeTab === 'updates' && <DailyUpdatesScreen />}
          {activeTab === 'crm' && <CrmDashboardScreen />}
        </div>
      </div>

      {/* Sticky Bottom Navigation Bar (Mobile View) */}
      <div className="mobile-nav-bar">
        <button 
          className={`mobile-nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare size={20} />
          <span>Görevler</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveTab('updates')}
        >
          <Calendar size={20} />
          <span>Raporlar</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'crm' ? 'active' : ''}`}
          onClick={() => setActiveTab('crm')}
        >
          <BarChart4 size={20} />
          <span>CRM</span>
        </button>
      </div>

      {/* Team Invitation & Management Modal */}
      {showTeamModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Ekip Yönetimi & Davetler</span>
              <button className="btn btn-secondary btn-icon-only" onClick={() => setShowTeamModal(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Pending Invitations Section (Gelen Ekip Davetleri) */}
            {pendingInvitations.length > 0 && (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={18} style={{ color: 'var(--accent-color)' }} />
                  Gelen Ekip Davetleriniz ({pendingInvitations.length})
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
                Kendi Ekibine Üye Çağır ({activeWorkspace?.name})
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
                <label className="form-label">Davet Edilecek E-posta Adresi</label>
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
                <label className="form-label">Yetki Rolü</label>
                <select 
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="form-input"
                >
                  <option value="staff">Personel / Ekip Üyesi</option>
                  <option value="representative">Kampüs Temsilcisi</option>
                  <option value="admin">Yönetici / Admin</option>
                </select>
              </div>

              <div className="modal-footer" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTeamModal(false)}>Kapat</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingInvite}>
                  {isSubmittingInvite ? 'Gönderiliyor...' : 'Davet Gönder'}
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
            <div className="modal-header">Yeni Çalışma Alanı / Ekip Oluştur</div>
            <form onSubmit={handleCreateWs} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Ekip / Workspace Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ankara Kampüs Ekibi"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWorkspaceModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Oluştur ve Başla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

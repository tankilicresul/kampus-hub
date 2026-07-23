import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { TasksScreen } from './features/tasks/TasksScreen';
import { DailyUpdatesScreen } from './features/daily_updates/DailyUpdatesScreen';
import { CrmDashboardScreen } from './features/crm/CrmDashboardScreen';
import { LogOut, Plus, CheckSquare, Calendar, BarChart4, FolderClosed, User, Sun, Moon } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { 
    activeWorkspace, 
    workspaces, 
    selectWorkspace, 
    createWorkspace, 
    logOut, 
    user 
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'updates' | 'crm'>('tasks');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  
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
            ÇALIŞMA ALANLARI
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

        <div className="sidebar-footer">
          <button className="btn btn-secondary btn-block" onClick={() => setShowWorkspaceModal(true)}>
            <Plus size={16} />
            <span>Workspace Ekle</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-content">
        {/* App Bar */}
        <div className="app-bar">
          <div className="app-bar-left">
            {/* Desktop Workspace Title */}
            <div className="app-bar-title desktop-workspace-title">
              {activeWorkspace ? activeWorkspace.name : 'Workspace seçilmedi'}
            </div>
            
            {/* Mobile Workspace Selector (dropdown) */}
            <div className="mobile-workspace-selector">
              {activeWorkspace && (
                <select 
                  value={activeWorkspace.id} 
                  onChange={(e) => {
                    if (e.target.value === '__add_new_workspace__') {
                      setShowWorkspaceModal(true);
                    } else {
                      selectWorkspace(e.target.value);
                    }
                  }}
                  className="form-input"
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.85rem', 
                    width: '160px', 
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
                  <option value="__add_new_workspace__">+ Workspace Ekle</option>
                </select>
              )}
            </div>
          </div>
          
          <div className="app-bar-actions">
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

      {/* Create Workspace Modal */}
      {showWorkspaceModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">Yeni Çalışma Alanı Oluştur</div>
            <form onSubmit={handleCreateWs} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Workspace Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kampüs Kapında Ekibi"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWorkspaceModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

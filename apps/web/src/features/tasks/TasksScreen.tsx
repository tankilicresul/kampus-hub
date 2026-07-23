import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { Search, Plus, List, Kanban, RefreshCw, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'waiting' | 'completed';
  priority: 'critical' | 'high' | 'normal' | 'low';
  assigned_user_id?: string;
}

export const TasksScreen: React.FC = () => {
  const { activeWorkspace, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  
  // Create task modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'critical' | 'high' | 'normal' | 'low'>('normal');

  // Status transition reason modal
  const [transitionTask, setTransitionTask] = useState<Task | null>(null);
  const [targetStatus, setTargetStatus] = useState<Task['status'] | null>(null);
  const [transitionReason, setTransitionReason] = useState('');

  const loadTasks = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .eq('deleted_at', null); // Soft deletes check
      
      if (error) {
        // Fallback fallback if soft_delete columns aren't matching
        const fallback = await supabase
          .from('tasks')
          .select('*')
          .eq('workspace_id', activeWorkspace.id);
        if (fallback.data) {
          setTasks(fallback.data as Task[]);
        }
      } else {
        setTasks(data as Task[]);
      }
    } catch (err) {
      console.error('Fetch tasks failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [activeWorkspace]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newTitle.trim()) return;

    try {
      const { error } = await supabase.from('tasks').insert({
        workspace_id: activeWorkspace.id,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        priority: newPriority,
        status: 'todo',
        created_by: user?.id || null,
      });
      if (error) throw error;
      
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('normal');
      await loadTasks();
    } catch (err) {
      console.error('Create task failed:', err);
    }
  };

  const handleStatusChangeClick = (task: Task, nextStatus: Task['status']) => {
    setTransitionTask(task);
    setTargetStatus(nextStatus);
    setTransitionReason('');
  };

  const submitStatusTransition = async () => {
    if (!transitionTask || !targetStatus || !transitionReason.trim()) return;

    try {
      const { error } = await supabase.from('tasks').update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', transitionTask.id);

      if (error) throw error;

      // Add audit log for transition safely
      try {
        await supabase.from('audit_logs').insert({
          action: 'task_status_changed',
          table_name: 'tasks',
          record_id: transitionTask.id,
          user_id: user?.id || null,
          workspace_id: activeWorkspace?.id || null,
          payload: {
            title: transitionTask.title,
            new_status: targetStatus,
            reason: transitionReason.trim(),
          },
        });
      } catch (logErr) {
        console.warn('Audit log write skipped:', logErr);
      }

      await loadTasks();
    } catch (err) {
      console.error('Update status failed:', err);
    } finally {
      setTransitionTask(null);
      setTargetStatus(null);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = searchQuery === '' || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = !selectedPriority || t.priority === selectedPriority;
    return matchesSearch && matchesPriority;
  });

  const priorityLabels: Record<string, string> = {
    critical: 'Kritik',
    high: 'Yüksek',
    normal: 'Normal',
    low: 'Düşük',
  };

  const columns = [
    { key: 'todo', title: 'Yapılacak', color: '#38bdf8' },
    { key: 'in_progress', title: 'Sürüyor', color: '#f59e0b' },
    { key: 'waiting', title: 'Bekliyor', color: '#f97316' },
    { key: 'completed', title: 'Bitti', color: '#10b981' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Search & Filter Header */}
      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '130px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
           <button className="btn btn-secondary" onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}>
            {viewMode === 'kanban' ? <List size={18} /> : <Kanban size={18} />}
            <span className="btn-text">{viewMode === 'kanban' ? 'Liste' : 'Pano'}</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span className="btn-text">Yeni Görev</span>
          </button>
        </div>
        
        {/* Priority Filter Chips */}
        <div className="scroll-x" style={{ display: 'flex', gap: '8px', paddingRight: '16px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <span 
            className={`badge ${!selectedPriority ? 'active' : ''}`} 
            style={{ 
              cursor: 'pointer', 
              border: '1px solid var(--border-glass)', 
              padding: '6px 14px', 
              borderRadius: '20px', 
              fontSize: '0.75rem',
              fontWeight: 600,
              flexShrink: 0,
              whiteSpace: 'nowrap',
              backgroundColor: !selectedPriority ? 'var(--accent-color)' : 'var(--bg-surface-accent)', 
              color: !selectedPriority ? 'white' : 'var(--text-secondary)' 
            }}
            onClick={() => setSelectedPriority(null)}
          >
            Tümü
          </span>
          {['critical', 'high', 'normal', 'low'].map((p) => (
            <span 
              key={p}
              className={`badge ${selectedPriority === p ? 'active' : ''}`} 
              style={{ 
                cursor: 'pointer', 
                border: '1px solid var(--border-glass)', 
                padding: '6px 14px', 
                borderRadius: '20px', 
                fontSize: '0.75rem',
                fontWeight: 600,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                backgroundColor: selectedPriority === p ? 'var(--accent-color)' : 'var(--bg-surface-accent)', 
                color: selectedPriority === p ? 'white' : 'var(--text-secondary)' 
              }}
              onClick={() => setSelectedPriority(p)}
            >
              {priorityLabels[p]}
            </span>
          ))}
        </div>
      </div>

      {/* Main Board/List Area */}
      {loading ? (
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)' }}>
          <AlertCircle size={48} />
          <h3>Görev Yok</h3>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="board-container">
          {columns.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="board-column">
                <div className="column-header">
                  <div className="column-title-container">
                    <span className="column-dot" style={{ backgroundColor: col.color }} />
                    <span style={{ fontWeight: 'bold' }}>{col.title}</span>
                  </div>
                  <span className="column-badge">{columnTasks.length}</span>
                </div>
                
                <div className="column-cards">
                  {columnTasks.map((task) => (
                    <div key={task.id} className="task-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className={`badge badge-${task.priority}`}>{priorityLabels[task.priority] || task.priority}</span>
                      </div>
                      <div className="card-title">{task.title}</div>
                      {task.description && <div className="card-desc">{task.description}</div>}
                      
                      {/* Status quick transitions */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {columns.filter(c => c.key !== task.status).map((c) => (
                          <button 
                            key={c.key}
                            style={{ 
                              background: 'var(--bg-surface)', 
                              color: 'var(--text-secondary)', 
                              border: '1px solid var(--border-glass)', 
                              padding: '4px 8px', 
                              borderRadius: '8px', 
                              fontSize: '0.7rem', 
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'var(--transition-smooth)'
                            }}
                            onClick={() => handleStatusChangeClick(task, c.key)}
                          >
                            ➔ {c.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          {filteredTasks.map((task) => (
            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <span className={`badge badge-${task.priority}`} style={{ marginRight: '10px' }}>{priorityLabels[task.priority] || task.priority}</span>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{task.title}</span>
              </div>
              <span className="badge" style={{ backgroundColor: 'var(--bg-surface-accent)', color: 'var(--text-secondary)' }}>
                {columns.find(c => c.key === task.status)?.title || task.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">Yeni Görev</div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Başlık</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="form-input"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Öncelik Seviyesi</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="form-input"
                >
                  <option value="critical">Kritik (Acil)</option>
                  <option value="high">Yüksek</option>
                  <option value="normal">Normal</option>
                  <option value="low">Düşük</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {transitionTask && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">Neden Değişiyor?</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Durum değişimi için kısa bir neden belirtin.
            </p>
            <div className="form-group">
              <label className="form-label">Neden</label>
              <input
                type="text"
                required
                placeholder="Örn: İş bitti, teste geçildi"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setTransitionTask(null); setTargetStatus(null); }}>İptal</button>
              <button 
                className="btn btn-primary" 
                disabled={!transitionReason.trim()}
                onClick={submitStatusTransition}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

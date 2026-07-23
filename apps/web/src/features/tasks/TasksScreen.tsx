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
  const { activeWorkspace } = useAuth();
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
        // Wait state reason fields can be added depending on schema
      }).eq('id', transitionTask.id);

      if (error) throw error;

      // Add audit log for transition
      await supabase.from('audit_logs').insert({
        workspace_id: activeWorkspace?.id,
        action_type: 'task_status_changed',
        details: `Görev: ${transitionTask.title}, Yeni Durum: ${targetStatus}, Gerekçe: ${transitionReason.trim()}`,
      }).select().maybeSingle();

      setTransitionTask(null);
      setTargetStatus(null);
      await loadTasks();
    } catch (err) {
      console.error('Update status failed:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = searchQuery === '' || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = !selectedPriority || t.priority === selectedPriority;
    return matchesSearch && matchesPriority;
  });

  const columns = [
    { key: 'todo', title: 'Yapılacak', color: '#38bdf8' },
    { key: 'in_progress', title: 'Devam Ediyor', color: '#f59e0b' },
    { key: 'waiting', title: 'Beklemede', color: '#f97316' },
    { key: 'completed', title: 'Tamamlandı', color: '#10b981' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Search & Filter Header */}
      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Görevlerde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
           <button className="btn btn-secondary" onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}>
            {viewMode === 'kanban' ? <List size={18} /> : <Kanban size={18} />}
            <span className="btn-text">{viewMode === 'kanban' ? 'Liste' : 'Kanban'}</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span className="btn-text">Yeni Görev</span>
          </button>
        </div>
        
        {/* Priority Filter Chips */}
        <div className="scroll-x" style={{ display: 'flex', gap: '8px' }}>
          <span 
            className={`badge ${!selectedPriority ? 'active' : ''}`} 
            style={{ 
              cursor: 'pointer', 
              border: '1px solid var(--border-glass)', 
              padding: '6px 14px', 
              borderRadius: '20px', 
              fontSize: '0.75rem',
              fontWeight: 600,
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
                backgroundColor: selectedPriority === p ? 'var(--accent-color)' : 'var(--bg-surface-accent)', 
                color: selectedPriority === p ? 'white' : 'var(--text-secondary)' 
              }}
              onClick={() => setSelectedPriority(p)}
            >
              {p.toUpperCase()}
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
          <h3>Henüz görev bulunmuyor</h3>
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
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
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
                            ➔ {c.title.split(' ')[0]}
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
                <span className={`badge badge-${task.priority}`} style={{ marginRight: '10px' }}>{task.priority}</span>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{task.title}</span>
              </div>
              <span className="badge" style={{ backgroundColor: 'var(--bg-surface-accent)', color: 'var(--text-secondary)' }}>{task.status.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">Yeni Görev Oluştur</div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Görev Başlığı</label>
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
                <label className="form-label">Öncelik</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="form-input"
                >
                  <option value="low">Düşük (Low)</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek (High)</option>
                  <option value="critical">Kritik (Critical)</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {transitionTask && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">Durum Değişiklik Gerekçesi</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              "{transitionTask.title}" görevinin durumunu değiştirmek için bir açıklama girmeniz gerekmektedir.
            </p>
            <div className="form-group">
              <label className="form-label">Açıklama / Gerekçe</label>
              <input
                type="text"
                required
                placeholder="Örn: Çalışma tamamlandı / Test ediliyor"
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

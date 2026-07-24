import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import {
  Search, Plus, List, Kanban, RefreshCw, AlertCircle, X,
  Calendar, Tag, User, Repeat, MessageSquare, Paperclip, Clock,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'waiting' | 'completed';
  priority: 'critical' | 'high' | 'normal' | 'low';
  primary_assignee_id?: string;
  due_date?: string;
  tags?: string[];
  recurrence?: string;
}

interface WorkspaceMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TaskComment {
  id: string;
  comment_text: string;
  created_at: string;
  profile?: { full_name: string | null };
}

// ─── Sortable Task Card ───────────────────────────────────────────────────────
const SortableTaskCard: React.FC<{
  task: Task;
  members: WorkspaceMember[];
  priorityLabels: Record<string, string>;
  columns: readonly { key: string; title: string; color: string }[];
  onStatusClick: (task: Task, status: Task['status']) => void;
  onDetailClick: (task: Task) => void;
}> = ({ task, members, priorityLabels, columns, onStatusClick, onDetailClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const assignee = members.find(m => m.user_id === task.primary_assignee_id);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div ref={setNodeRef} style={style} className="task-card" {...attributes}>
      {/* Drag handle + header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className={`badge badge-${task.priority}`}>{priorityLabels[task.priority] || task.priority}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {task.recurrence && task.recurrence !== 'none' && (
            <span title={`Tekrar: ${task.recurrence}`} style={{ display: 'inline-flex' }}>
              <Repeat size={12} style={{ color: 'var(--text-muted)' }} />
            </span>
          )}
          {/* Drag grip */}
          <span
            {...listeners}
            style={{ cursor: 'grab', color: 'var(--text-muted)', padding: '2px', lineHeight: 1 }}
            title="Sürükle"
          >
            ⠿
          </span>
        </div>
      </div>

      {/* Title (clickable for detail) */}
      <div
        className="card-title"
        style={{ cursor: 'pointer', marginTop: '6px' }}
        onClick={() => onDetailClick(task)}
      >
        {task.title}
      </div>

      {task.description && <div className="card-desc">{task.description}</div>}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
          {task.tags.map(tag => (
            <span key={tag} style={{
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.68rem',
              fontWeight: 600,
              backgroundColor: 'var(--bg-surface-accent)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-glass)',
            }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta: assignee + due_date */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {assignee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: 'var(--accent-color)', color: 'white',
              fontSize: '0.6rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {assignee.avatar_url
                ? <img src={assignee.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (assignee.full_name || '?').slice(0, 1).toUpperCase()
              }
            </div>
            <span>{(assignee.full_name || '').split(' ')[0]}</span>
          </div>
        )}
        {task.due_date && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            fontSize: '0.7rem', fontWeight: 600,
            color: isOverdue ? '#ef4444' : 'var(--text-muted)',
          }}>
            <Clock size={10} />
            {new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>

      {/* Status transitions */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '10px', flexWrap: 'wrap' }}>
        {columns.filter(c => c.key !== task.status).map(c => (
          <button
            key={c.key}
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-glass)',
              padding: '3px 7px',
              borderRadius: '8px',
              fontSize: '0.67rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => onStatusClick(task, c.key as Task['status'])}
          >
            ➔ {c.title}
          </button>
        ))}
        <button
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '3px 6px',
            fontSize: '0.67rem',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
          onClick={() => onDetailClick(task)}
          title="Detay / Yorumlar"
        >
          <MessageSquare size={11} /> Detay
        </button>
      </div>
    </div>
  );
};

// ─── Task Detail Modal ────────────────────────────────────────────────────────
const TaskDetailModal: React.FC<{
  task: Task;
  members: WorkspaceMember[];
  onClose: () => void;
  onRefresh: () => void;
}> = ({ task, members, onClose, onRefresh }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'attachments'>('comments');

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('task_comments')
      .select('*, profile:user_id(full_name)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    setComments((data as unknown as TaskComment[]) || []);
  }, [task.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      await supabase.from('task_comments').insert({
        task_id: task.id,
        user_id: user.id,
        comment_text: newComment.trim(),
      });
      setNewComment('');
      loadComments();
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const assignee = members.find(m => m.user_id === task.primary_assignee_id);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '560px', width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Görev Detayı</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Task info */}
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{task.title}</h3>
          {task.description && <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{task.description}</p>}

          {/* Meta row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {assignee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <User size={14} style={{ color: 'var(--accent-color)' }} />
                <span>{assignee.full_name || 'Atanmış'}</span>
              </div>
            )}
            {task.due_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: new Date(task.due_date) < new Date() ? '#ef4444' : 'var(--text-secondary)' }}>
                <Calendar size={14} />
                <span>{new Date(task.due_date).toLocaleDateString('tr-TR')}</span>
              </div>
            )}
            {task.recurrence && task.recurrence !== 'none' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Repeat size={14} />
                <span>{task.recurrence === 'daily' ? 'Günlük' : task.recurrence === 'weekly' ? 'Haftalık' : 'Aylık'}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {task.tags.map(tag => (
                <span key={tag} style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem',
                  backgroundColor: 'rgba(183,1,22,0.08)', color: 'var(--accent-color)',
                  border: '1px solid rgba(183,1,22,0.2)', fontWeight: 600,
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0' }}>
            {[
              { key: 'comments', label: 'Yorumlar', icon: <MessageSquare size={13} /> },
              { key: 'attachments', label: 'Ekler', icon: <Paperclip size={13} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '5px',
                  color: activeTab === tab.key ? 'var(--accent-color)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--accent-color)' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Comments */}
          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comments.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                  Henüz yorum yok. İlk yorumu sen yap!
                </p>
              )}
              {comments.map(c => (
                <div key={c.id} style={{
                  backgroundColor: 'var(--bg-surface-accent)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-glass)',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '4px' }}>
                    {(c.profile as any)?.full_name || 'Kullanıcı'}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
                      {new Date(c.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.comment_text}</div>
                </div>
              ))}
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input
                  type="text"
                  placeholder="Yorum ekle..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="form-input"
                  style={{ flex: 1, fontSize: '0.85rem' }}
                />
                <button className="btn btn-primary" type="submit" disabled={submitting || !newComment.trim()} style={{ padding: '8px 14px' }}>
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : 'Gönder'}
                </button>
              </form>
            </div>
          )}

          {/* Attachments placeholder */}
          {activeTab === 'attachments' && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Paperclip size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p>Dosya ekleri yakında kullanıma girecek.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main TasksScreen ─────────────────────────────────────────────────────────
export const TasksScreen: React.FC = () => {
  const { activeWorkspace, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Create task modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('normal');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newRecurrence, setNewRecurrence] = useState('none');

  // Status transition modal
  const [transitionTask, setTransitionTask] = useState<Task | null>(null);
  const [targetStatus, setTargetStatus] = useState<Task['status'] | null>(null);
  const [transitionReason, setTransitionReason] = useState('');

  // Detail modal
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Drag
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadTasks = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, primary_assignee_id, due_date, tags, recurrence')
        .eq('workspace_id', activeWorkspace.id)
        .is('deleted_at', null);
      if (error) throw error;
      setTasks((data as Task[]) || []);
    } catch (err) {
      console.error('Fetch tasks failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  const loadMembers = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    const { data } = await supabase
      .from('workspace_members')
      .select('user_id, profiles(full_name, avatar_url)')
      .eq('workspace_id', activeWorkspace.id);
    if (data) {
      setMembers(data.map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name || null,
        avatar_url: m.profiles?.avatar_url || null,
      })));
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadTasks();
    loadMembers();
  }, [loadTasks, loadMembers]);

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
        primary_assignee_id: newAssignee || null,
        due_date: newDueDate || null,
        tags: newTags.length > 0 ? newTags : [],
        recurrence: newRecurrence,
      });
      if (error) throw error;
      setShowAddModal(false);
      setNewTitle(''); setNewDesc(''); setNewPriority('normal');
      setNewAssignee(''); setNewDueDate(''); setNewTags([]); setNewTagInput(''); setNewRecurrence('none');
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
      await supabase.from('tasks').update({ status: targetStatus, updated_at: new Date().toISOString() }).eq('id', transitionTask.id);
      try {
        await supabase.from('audit_logs').insert({
          action: 'task_status_changed', table_name: 'tasks',
          record_id: transitionTask.id, user_id: user?.id || null,
          workspace_id: activeWorkspace?.id || null,
          payload: { title: transitionTask.title, new_status: targetStatus, reason: transitionReason.trim() },
        });
      } catch (_) { /* skip */ }
      await loadTasks();
    } catch (err) {
      console.error('Update status failed:', err);
    } finally {
      setTransitionTask(null); setTargetStatus(null);
    }
  };

  // Drag & drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // over.id could be a column key or a task id — determine target column
    const columns = ['todo', 'in_progress', 'waiting', 'completed'];
    let targetCol: string | null = null;
    if (columns.includes(String(over.id))) {
      targetCol = String(over.id);
    } else {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) targetCol = overTask.status;
    }

    const draggedTask = tasks.find(t => t.id === active.id);
    if (!draggedTask || !targetCol || draggedTask.status === targetCol) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: targetCol as Task['status'] } : t));

    try {
      await supabase.from('tasks').update({ status: targetCol, updated_at: new Date().toISOString() }).eq('id', active.id);
    } catch (err) {
      console.error('Drag update failed:', err);
      loadTasks();
    }
  };

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && newTagInput.trim()) {
      e.preventDefault();
      const tag = newTagInput.trim().replace(/^#/, '').toLowerCase();
      if (tag && !newTags.includes(tag)) setNewTags(prev => [...prev, tag]);
      setNewTagInput('');
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = !selectedPriority || t.priority === selectedPriority;
    const matchesStatus = !selectedStatus || t.status === selectedStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const priorityLabels: Record<string, string> = {
    critical: '🔴 Acil', high: '🟡 Önemli', normal: '⚪ Normal', low: '🟢 Düşük',
  };

  const columns = [
    { key: 'todo', title: 'Yapılacak', color: '#38bdf8' },
    { key: 'in_progress', title: 'Sürüyor', color: '#f59e0b' },
    { key: 'waiting', title: 'Bekliyor', color: '#f97316' },
    { key: 'completed', title: 'Bitti', color: '#10b981' },
  ] as const;

  const draggedTask = tasks.find(t => t.id === activeId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

      {/* Search & Filter Header */}
      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '130px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Görev ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '44px' }}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}>
            {viewMode === 'kanban' ? <List size={18} /> : <Kanban size={18} />}
            <span className="btn-text">{viewMode === 'kanban' ? 'Liste' : 'Pano'}</span>
          </button>
          <button className="btn btn-secondary btn-icon-only" onClick={loadTasks} title="Yenile">
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span className="btn-text">Yeni Görev</span>
          </button>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { label: 'Tümü', onClick: () => { setSelectedPriority(null); setSelectedStatus(null); }, active: !selectedPriority && !selectedStatus, color: 'var(--accent-color)' },
            { label: '🔴 Acil', onClick: () => { setSelectedPriority('critical'); setSelectedStatus(null); }, active: selectedPriority === 'critical', color: '#ef4444' },
            { label: '🟡 Önemli', onClick: () => { setSelectedPriority('high'); setSelectedStatus(null); }, active: selectedPriority === 'high', color: '#f59e0b' },
            { label: '✅ Yapılacak', onClick: () => { setSelectedStatus('todo'); setSelectedPriority(null); }, active: selectedStatus === 'todo', color: '#38bdf8' },
            { label: '🔄 Sürüyor', onClick: () => { setSelectedStatus('in_progress'); setSelectedPriority(null); }, active: selectedStatus === 'in_progress', color: '#f97316' },
            { label: '✔ Bitti', onClick: () => { setSelectedStatus('completed'); setSelectedPriority(null); }, active: selectedStatus === 'completed', color: '#10b981' },
          ].map(chip => (
            <span
              key={chip.label}
              style={{
                cursor: 'pointer', padding: '5px 14px', borderRadius: '20px',
                fontSize: '0.76rem', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap',
                border: `1px solid ${chip.active ? chip.color : 'var(--border-glass)'}`,
                backgroundColor: chip.active ? chip.color : 'var(--bg-surface-accent)',
                color: chip.active ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
              onClick={chip.onClick}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      {/* Board / List */}
      {loading ? (
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <AlertCircle size={48} style={{ opacity: 0.3 }} />
          <h3 style={{ fontWeight: 700 }}>Görev Yok</h3>
          <p style={{ fontSize: '0.85rem' }}>Yeni görev ekleyerek başlayın</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="board-container">
            {columns.map(col => {
              const columnTasks = filteredTasks.filter(t => t.status === col.key);
              return (
                <div key={col.key} className="board-column" id={col.key}>
                  <div className="column-header">
                    <div className="column-title-container">
                      <span className="column-dot" style={{ backgroundColor: col.color }} />
                      <span style={{ fontWeight: 700 }}>{col.title}</span>
                    </div>
                    <span className="column-badge">{columnTasks.length}</span>
                  </div>
                  <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="column-cards">
                      {columnTasks.map(task => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          members={members}
                          priorityLabels={priorityLabels}
                          columns={columns}
                          onStatusClick={handleStatusChangeClick}
                          onDetailClick={setDetailTask}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {draggedTask && (
              <div className="task-card" style={{ opacity: 0.9, boxShadow: 'var(--shadow-lg)', transform: 'rotate(2deg)' }}>
                <span className={`badge badge-${draggedTask.priority}`}>{priorityLabels[draggedTask.priority]}</span>
                <div className="card-title" style={{ marginTop: '6px' }}>{draggedTask.title}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {filteredTasks.map(task => {
            const assignee = members.find(m => m.user_id === task.primary_assignee_id);
            const col = columns.find(c => c.key === task.status);
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
            return (
              <div key={task.id} style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                cursor: 'pointer',
              }}
              onClick={() => setDetailTask(task)}
              >
                <span className={`badge badge-${task.priority}`} style={{ flexShrink: 0 }}>
                  {priorityLabels[task.priority]?.replace(/🔴|🟡|⚪|🟢/g, '').trim()}
                </span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{task.title}</span>
                {assignee && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} /> {(assignee.full_name || '').split(' ')[0]}
                  </span>
                )}
                {task.due_date && (
                  <span style={{ fontSize: '0.75rem', color: isOverdue ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {new Date(task.due_date).toLocaleDateString('tr-TR')}
                  </span>
                )}
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
                  backgroundColor: `${col?.color}20`, color: col?.color, flexShrink: 0,
                }}>
                  {col?.title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Yeni Görev</span>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Başlık *</label>
                <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="form-input" placeholder="Görev başlığı..." />
              </div>
              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} className="form-input" rows={2} placeholder="Opsiyonel açıklama..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label"><AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />Öncelik</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value as Task['priority'])} className="form-input">
                    <option value="critical">🔴 Acil</option>
                    <option value="high">🟡 Önemli</option>
                    <option value="normal">⚪ Normal</option>
                    <option value="low">🟢 Düşük</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label"><Repeat size={12} style={{ display: 'inline', marginRight: '4px' }} />Tekrar</label>
                  <select value={newRecurrence} onChange={e => setNewRecurrence(e.target.value)} className="form-input">
                    <option value="none">Yok</option>
                    <option value="daily">Günlük</option>
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label"><User size={12} style={{ display: 'inline', marginRight: '4px' }} />Kişi Ata</label>
                  <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="form-input">
                    <option value="">Seçilmedi</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name || m.user_id.slice(0, 8)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label"><Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />Son Tarih</label>
                  <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label"><Tag size={12} style={{ display: 'inline', marginRight: '4px' }} />Etiketler (Enter ile ekle)</label>
                <input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="form-input"
                  placeholder="#etiket yaz, Enter'a bas..."
                />
                {newTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {newTags.map(tag => (
                      <span key={tag} style={{
                        padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem',
                        backgroundColor: 'rgba(183,1,22,0.08)', color: 'var(--accent-color)',
                        border: '1px solid rgba(183,1,22,0.2)', display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setNewTags(prev => prev.filter(t => t !== tag))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-color)', padding: 0, lineHeight: 1 }}
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Görev Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {transitionTask && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">Durum Değişikliği Nedeni</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              <strong>{transitionTask.title}</strong> görevi → <strong>{columns.find(c => c.key === targetStatus)?.title}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Neden</label>
              <input
                type="text"
                required
                placeholder="Örn: Test tamamlandı, PR merge edildi"
                value={transitionReason}
                onChange={e => setTransitionReason(e.target.value)}
                className="form-input"
                onKeyDown={e => { if (e.key === 'Enter') submitStatusTransition(); }}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setTransitionTask(null); setTargetStatus(null); }}>İptal</button>
              <button className="btn btn-primary" disabled={!transitionReason.trim()} onClick={submitStatusTransition}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          members={members}
          onClose={() => setDetailTask(null)}
          onRefresh={loadTasks}
        />
      )}
    </div>
  );
};

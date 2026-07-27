import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import {
  Search, Plus, List, Kanban, RefreshCw, AlertCircle, X,
  Calendar, Tag, User, Repeat, MessageSquare, Paperclip, Clock, Trash2,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'waiting' | 'completed' | 'revision_required' | 'overdue';
  priority: 'critical' | 'high' | 'normal' | 'low';
  primary_assignee_id?: string;
  start_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  tags?: string[];
  recurrence?: string;
  category?: string | null;
  order_index: number;
  content_type?: string | null;
  content_hook?: string | null;
  content_promise?: string | null;
  content_body?: string | null;
  content_payoff?: string | null;
  content_cta?: string | null;
  content_loop?: string | null;
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

const calculatePriorityFromDueDate = (dueDateStr: string | null | undefined): Task['priority'] => {
  if (!dueDateStr) return 'normal';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) {
    return 'critical'; // Acil
  } else if (diffDays >= 2 && diffDays <= 5) {
    return 'high'; // Önemli
  } else {
    return 'normal'; // Acelesi yok
  }
};

const isSocialCategory = (catName: string | null | undefined): boolean => {
  if (!catName) return false;
  const lowerName = catName.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
  const keywords = [
    'sosyal medya', 'sosyal meyda', 'tasarim', 'tasarım', 'icerik', 'içerik', 
    'dijital medya', 'pazarlama', 'dijital pazarlama', 'content', 'instagram', 
    'tiktok', 'facebook', 'twitter', 'youtube', 'design'
  ];
  return keywords.some(keyword => {
    const normalizedKeyword = keyword.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
    return lowerName.includes(normalizedKeyword);
  });
};

const isTaskPastDue = (dueDate: string | null | undefined): boolean => {
  if (!dueDate) return false;
  const today = new Date();
  const currentHour = today.getHours();
  const effectiveDate = new Date(today);
  if (currentHour < 6) {
    effectiveDate.setDate(effectiveDate.getDate() - 1);
  }
  const yyyy = effectiveDate.getFullYear();
  const mm = String(effectiveDate.getMonth() + 1).padStart(2, '0');
  const dd = String(effectiveDate.getDate()).padStart(2, '0');
  const effectiveDateStr = `${yyyy}-${mm}-${dd}`;
  return dueDate < effectiveDateStr;
};

// ─── Sortable Category Pill ──────────────────────────────────────────────────
const SortableCategoryPill: React.FC<{
  cat: { id: string; name: string };
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ cat, isActive, onSelect, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    display: 'flex',
    alignItems: 'center',
    borderRadius: '20px',
    border: isActive ? '1.5px solid var(--accent-color)' : '1px solid var(--border-glass)',
    backgroundColor: isActive ? 'var(--accent-color)' : 'var(--bg-surface-accent)',
    color: isActive ? 'white' : 'var(--text-secondary)',
    padding: '3px 8px 3px 14px',
    cursor: 'grab',
    userSelect: 'none' as const,
    zIndex: isDragging ? 10 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          paddingRight: '6px',
        }}
      >
        {cat.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px',
          fontWeight: 'bold',
        }}
        title="Sil"
      >
        <X size={12} />
      </button>
    </div>
  );
};

// ─── Sortable Task Card ───────────────────────────────────────────────────────

const SortableTaskCard: React.FC<{
  task: Task;
  members: WorkspaceMember[];
  onDetailClick: (task: Task) => void;
}> = ({ task, members, onDetailClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const assignee = members.find(m => m.user_id === task.primary_assignee_id);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="task-card" 
      {...attributes} 
      {...listeners} 
      onClick={() => onDetailClick(task)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span 
          title={task.priority === 'critical' ? 'Acil' : task.priority === 'high' ? 'Önemli' : 'Acelesi Yok'} 
          style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            backgroundColor: task.status === 'completed' ? '#22c55e' : (task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f59e0b' : '#3b82f6'), 
            display: 'inline-block',
            margin: '6px'
          }} 
        />
        {task.recurrence && task.recurrence !== 'none' && (
          <span title={`Tekrar: ${task.recurrence}`} style={{ display: 'inline-flex' }}>
            <Repeat size={12} style={{ color: 'var(--text-muted)' }} />
          </span>
        )}
      </div>

      {/* Title */}
      <div className="card-title" style={{ marginTop: '6px' }}>
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

      {/* Category badge */}
      {task.category && (
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '2px 8px', borderRadius: '20px', fontSize: '0.67rem', fontWeight: 700,
          backgroundColor: 'rgba(255,159,10,0.1)', color: 'var(--accent-color)',
          border: '1px solid rgba(255,159,10,0.25)', marginTop: '4px', marginBottom: '2px',
        }}>
          {task.category}
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
            color: task.status === 'completed' ? '#22c55e' : (isOverdue ? '#ef4444' : 'var(--text-muted)'),
          }}>
            <Clock size={10} />
            {new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>
    </div>
  );
};

const DroppableCardsArea: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className="column-cards"
      style={{ 
        flex: 1,
        minHeight: '150px',
        backgroundColor: isOver ? 'rgba(255, 159, 10, 0.04)' : 'transparent',
        borderRadius: 'var(--radius-md)',
        transition: 'var(--transition-smooth)'
      }}
    >
      {children}
    </div>
  );
};

export interface WorkspaceCategory {
  id: string;
  workspace_id: string;
  name: string;
  order_index: number;
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────
const TaskDetailModal: React.FC<{
  task: Task;
  allTasks: Task[];
  members: WorkspaceMember[];
  categories: WorkspaceCategory[];
  onClose: () => void;
  onRefresh: () => void;
}> = ({ task, allTasks, members, categories, onClose, onRefresh }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'attachments'>('comments');
  const [currentStatus, setCurrentStatus] = useState<Task['status']>(task.status);
  const [currentPriority, setCurrentPriority] = useState<Task['priority']>(task.priority);
  const [currentTitle, setCurrentTitle] = useState(task.title);
  const [currentDescription, setCurrentDescription] = useState(task.description || '');
  const [currentDueDate, setCurrentDueDate] = useState<string | null>(task.due_date || null);
  const [currentStartDate, setCurrentStartDate] = useState<string | null>(task.start_date || null);
  const [currentCategory, setCurrentCategory] = useState<string>(task.category || '');
  const CATEGORY_OPTIONS = ['', ...categories.map(c => c.name)];

  const [contentType, setContentType] = useState<string>(task.content_type || 'video');
  const [contentHook, setContentHook] = useState<string>(task.content_hook || '');
  const [contentPromise, setContentPromise] = useState<string>(task.content_promise || '');
  const [contentBody, setContentBody] = useState<string>(task.content_body || '');
  const [contentPayoff, setContentPayoff] = useState<string>(task.content_payoff || '');
  const [contentCta, setContentCta] = useState<string>(task.content_cta || '');
  const [contentLoop, setContentLoop] = useState<string>(task.content_loop || '');

  const handleDueDateChange = (val: string) => {
    setCurrentDueDate(val || null);
    if (val) {
      setCurrentPriority(calculatePriorityFromDueDate(val));
    }
  };

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

  const handleDelete = async () => {
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);
      if (error) throw error;
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Delete task failed:', err);
    }
  };

  const handleSave = async () => {
    if (!currentTitle.trim()) {
      alert('Görev başlığı boş bırakılamaz.');
      return;
    }
    if (currentStatus === 'overdue' && !isTaskPastDue(currentDueDate)) {
      alert("Son teslim tarihi geçmemiş bir görevi 'Tarihi Geçti' aşamasına alamazsınız.");
      return;
    }
    try {
      const updates: any = {
        title: currentTitle.trim(),
        description: currentDescription.trim() || null,
        status: currentStatus,
        priority: currentPriority,
        start_date: currentStartDate || null,
        due_date: currentDueDate || null,
        category: currentCategory || null,
        content_type: contentType || null,
        content_hook: contentHook || null,
        content_promise: contentPromise || null,
        content_body: contentBody || null,
        content_payoff: contentPayoff || null,
        content_cta: contentCta || null,
        content_loop: contentLoop || null,
        completed_at: currentStatus === 'completed' ? (task.completed_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString()
      };

      if (currentStatus !== task.status) {
        const colTasks = allTasks.filter(t => t.status === currentStatus && t.id !== task.id);
        const maxIdx = colTasks.length > 0 ? Math.max(...colTasks.map(t => t.order_index)) : 0.0;
        updates.order_index = maxIdx + 1.0;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Save task details failed:', err);
    }
  };

  const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
    in_progress: { label: 'Sürüyor',        color: '#1d4ed8', bg: 'rgba(59,130,246,0.12)' },
    todo:        { label: 'Yapılacak',       color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    overdue:     { label: 'Tarihi Geçti',   color: '#ea580c', bg: 'rgba(249,115,22,0.12)' },
    completed:   { label: 'Bitti',          color: '#16a34a', bg: 'rgba(34,197,94,0.12)'  },
    revision_required: { label: 'Revizyon', color: '#7c3aed', bg: 'rgba(167,139,250,0.12)'},
    waiting:     { label: 'Beklemede',      color: '#9333ea', bg: 'rgba(167,139,250,0.12)'},
  };
  const priorityMeta: Record<string, { label: string; color: string; bg: string }> = {
    critical: { label: '🔴 Acil',       color: '#dc2626', bg: 'rgba(239,68,68,0.10)'  },
    high:     { label: '🟡 Önemli',     color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
    normal:   { label: '🔵 Normal',     color: '#2563eb', bg: 'rgba(59,130,246,0.10)' },
    low:      { label: '⚪ Acelesi Yok',color: '#64748b', bg: 'rgba(100,116,139,0.10)'},
  };
  const sm = statusMeta[currentStatus]   || statusMeta.todo;
  const pm = priorityMeta[currentPriority] || priorityMeta.normal;
  const isOverdue = currentDueDate && new Date(currentDueDate) < new Date() && currentStatus !== 'completed';
  const assignee = members.find(m => m.user_id === task.primary_assignee_id);

  const isSocial = isSocialCategory(currentCategory);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: isSocial ? '760px' : '560px', width: '95%', padding: 0, overflow: 'hidden', borderRadius: '16px', transition: 'max-width 0.2s ease-in-out' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px 16px',
          borderBottom: '1px solid var(--border-glass)',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: sm.color, boxShadow: `0 0 0 3px ${sm.bg}`,
            }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {isSocial ? 'İçerik Script Planlayıcı' : 'Görev Detayı'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>

          {/* Title */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              {isSocial ? 'İçerik Başlığı' : 'Görev Başlığı'}
            </label>
            <input
              type="text"
              value={currentTitle}
              onChange={e => setCurrentTitle(e.target.value)}
              className="form-input"
              placeholder={isSocial ? "İçerik başlığı..." : "Görev başlığı..."}
              style={{ fontWeight: 700, fontSize: '1rem', width: '100%', borderRadius: '10px', padding: '10px 14px' }}
            />
          </div>

          {/* Structured Script Editor or Description */}
          {isSocial ? (
            <div style={{
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              padding: '16px',
              backgroundColor: 'rgba(255,255,255,0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Format selection */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>İÇERİK FORMATI:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { key: 'video', label: '📹 Video (Reels/TikTok)' },
                    { key: 'post', label: '🖼 Post / Galeri' }
                  ].map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setContentType(f.key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: '1.5px solid',
                        borderColor: contentType === f.key ? 'var(--accent-color)' : 'var(--border-glass)',
                        backgroundColor: contentType === f.key ? 'rgba(255,159,10,0.12)' : 'transparent',
                        color: contentType === f.key ? 'var(--accent-color)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proportional sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Hook Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Hook</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--accent-color)', fontWeight: 700 }}>İlk %10 Rasyon</span>
                  </div>
                  <textarea
                    value={contentHook}
                    onChange={e => setContentHook(e.target.value)}
                    placeholder="Kullanıcının dikkatini çekecek ilk cümle veya görsel kanca..."
                    className="form-input"
                    style={{ height: '42px', fontSize: '0.85rem', padding: '8px 12px', resize: 'none', borderRadius: '8px' }}
                  />
                </div>

                {/* Kurulum / Vaat Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Kurulum / Vaat</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%10-20 Bölümü</span>
                  </div>
                  <textarea
                    value={contentPromise}
                    onChange={e => setContentPromise(e.target.value)}
                    placeholder="İçeriğin amacı veya izleyiciye sunulan ana vaat..."
                    className="form-input"
                    style={{ height: '42px', fontSize: '0.85rem', padding: '8px 12px', resize: 'none', borderRadius: '8px' }}
                  />
                </div>

                {/* Gelişme / Ana Değer Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Gelişme / Değer</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%20-70 Bölümü</span>
                  </div>
                  <textarea
                    value={contentBody}
                    onChange={e => setContentBody(e.target.value)}
                    placeholder="Ana içerik, detaylı anlatım ve asıl faydalı bilgi..."
                    className="form-input"
                    style={{ height: '150px', fontSize: '0.85rem', padding: '8px 12px', resize: 'vertical', borderRadius: '8px' }}
                  />
                </div>

                {/* Payoff / Sonuç Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Payoff / Sonuç</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%70-85 Bölümü</span>
                  </div>
                  <textarea
                    value={contentPayoff}
                    onChange={e => setContentPayoff(e.target.value)}
                    placeholder="Alınacak ana ders veya ulaşılan sonuç..."
                    className="form-input"
                    style={{ height: '55px', fontSize: '0.85rem', padding: '8px 12px', resize: 'none', borderRadius: '8px' }}
                  />
                </div>

                {/* CTA Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>CTA (Çağrı)</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%85-95 Bölümü</span>
                  </div>
                  <textarea
                    value={contentCta}
                    onChange={e => setContentCta(e.target.value)}
                    placeholder="Eyleme çağrı (takip et, kaydet vb.)..."
                    className="form-input"
                    style={{ height: '42px', fontSize: '0.85rem', padding: '8px 12px', resize: 'none', borderRadius: '8px' }}
                  />
                </div>

                {/* Kapanış / Loop Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Kapanış / Loop</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Son %5 / Döngü</span>
                  </div>
                  <textarea
                    value={contentLoop}
                    onChange={e => setContentLoop(e.target.value)}
                    placeholder="Video döngüsü (loop) veya son kapanış kelimeleri..."
                    className="form-input"
                    style={{ height: '40px', fontSize: '0.85rem', padding: '8px 12px', resize: 'none', borderRadius: '8px' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Açıklama
              </label>
              <textarea
                value={currentDescription}
                onChange={e => setCurrentDescription(e.target.value)}
                className="form-input"
                placeholder="Açıklama veya not ekleyin..."
                rows={3}
                style={{ width: '100%', resize: 'vertical', fontSize: '0.88rem', borderRadius: '10px', padding: '10px 14px' }}
              />
            </div>
          )}

          {/* Status + Priority — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Durum
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sm.color, pointerEvents: 'none', zIndex: 1,
                }} />
                <select
                  value={currentStatus}
                  onChange={e => setCurrentStatus(e.target.value as Task['status'])}
                  className="form-input"
                  style={{
                    paddingLeft: '28px', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem',
                    color: sm.color, backgroundColor: sm.bg, border: `1.5px solid ${sm.color}33`, width: '100%',
                  }}
                >
                  <option value="in_progress">Sürüyor</option>
                  <option value="todo">Yapılacak</option>
                  <option value="overdue">Tarihi Geçti</option>
                  <option value="completed">Bitti</option>
                  <option value="revision_required">Revizyon</option>
                  <option value="waiting">Beklemede</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Öncelik
              </label>
              <select
                value={currentPriority}
                onChange={e => setCurrentPriority(e.target.value as Task['priority'])}
                className="form-input"
                style={{
                  borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem',
                  color: pm.color, backgroundColor: pm.bg, border: `1.5px solid ${pm.color}33`, width: '100%',
                }}
              >
                <option value="critical">🔴 Acil</option>
                <option value="high">🟡 Önemli</option>
                <option value="normal">🔵 Normal</option>
                <option value="low">⚪ Acelesi Yok</option>
              </select>
            </div>
          </div>

          {/* Start Date + Due Date — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={currentStartDate || ''}
                onChange={e => setCurrentStartDate(e.target.value || null)}
                className="form-input"
                style={{ borderRadius: '10px', fontSize: '0.88rem', width: '100%', padding: '9px 12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: isOverdue ? '#dc2626' : 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                {isOverdue ? '⚠ Son Tarih (Geçti)' : 'Son Tarih'}
              </label>
              <input
                type="date"
                value={currentDueDate || ''}
                onChange={e => handleDueDateChange(e.target.value)}
                className="form-input"
                style={{
                  borderRadius: '10px', fontSize: '0.88rem', width: '100%', padding: '9px 12px',
                  borderColor: isOverdue ? '#ef4444' : undefined,
                  color: isOverdue ? '#dc2626' : undefined,
                  fontWeight: isOverdue ? 700 : 500,
                }}
              />
            </div>
          </div>

          {/* Category + Assignee — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                İş Tanımı
              </label>
              <select
                value={currentCategory}
                onChange={e => setCurrentCategory(e.target.value)}
                className="form-input"
                style={{ borderRadius: '10px', fontSize: '0.85rem', width: '100%' }}
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>{c || '— Seçilmedi —'}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Atanan Kişi
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: 'var(--bg-surface-accent)', border: '1px solid var(--border-glass)',
                borderRadius: '10px', padding: '9px 12px', minHeight: '40px',
              }}>
                {assignee ? (
                  <>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      backgroundColor: 'var(--accent-color)', color: 'white',
                      fontSize: '0.65rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
                    }}>
                      {assignee.avatar_url
                        ? <img src={assignee.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (assignee.full_name || '?').slice(0, 1).toUpperCase()
                      }
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{assignee.full_name || 'Kullanıcı'}</span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>— Atanmamış —</span>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Etiketler
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {task.tags.map(tag => (
                  <span key={tag} style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem',
                    backgroundColor: 'rgba(255,159,10,0.1)', color: 'var(--accent-color)',
                    border: '1px solid rgba(255,159,10,0.25)', fontWeight: 600,
                  }}>#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'var(--border-glass)', margin: '0 -24px' }} />

          {/* Comments / Attachments tabs */}
          <div>
            <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-glass)', marginBottom: '14px' }}>
              {[
                { key: 'comments',    label: 'Yorumlar', icon: <MessageSquare size={13} /> },
                { key: 'attachments', label: 'Ekler',    icon: <Paperclip size={13} /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 18px', fontSize: '0.82rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '5px',
                    color: activeTab === tab.key ? 'var(--accent-color)' : 'var(--text-muted)',
                    borderBottom: activeTab === tab.key ? '2px solid var(--accent-color)' : '2px solid transparent',
                    marginBottom: '-2px',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'comments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {comments.length === 0 && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    Henüz yorum yok. İlk yorumu sen yap!
                  </p>
                )}
                {comments.map(c => (
                  <div key={c.id} style={{
                    backgroundColor: 'var(--bg-surface-accent)',
                    padding: '10px 14px', borderRadius: '10px',
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
                    style={{ flex: 1, fontSize: '0.85rem', borderRadius: '10px' }}
                  />
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    style={{ minWidth: '90px', borderRadius: '10px', fontSize: '0.85rem' }}
                  >
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : 'Gönder'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'attachments' && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Paperclip size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p>Dosya ekleri yakında kullanıma girecek.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 24px',
          borderTop: '1px solid var(--border-glass)',
          background: 'var(--bg-surface)',
        }}>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'rgba(239,68,68,0.1)', color: '#dc2626',
              border: '1.5px solid rgba(239,68,68,0.3)',
              padding: '8px 18px', borderRadius: '10px',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Trash2 size={15} /> Sil
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: '10px', fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer',
                backgroundColor: 'var(--bg-surface-accent)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-glass)',
              }}
            >
              İptal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              style={{ minWidth: '100px', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem' }}
            >
              Kaydet
            </button>
          </div>
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
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Create task modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('normal');
  const [newAssignee, setNewAssignee] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newRecurrence, setNewRecurrence] = useState('none');
  const [newCategory, setNewCategory] = useState('');

  // Category filter
  const [categories, setCategories] = useState<WorkspaceCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');

  const categorySensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleCreateCategory = async () => {
    const name = window.prompt("Yeni İş Alanı / Kategori adı girin:");
    if (!name || !name.trim() || !activeWorkspace?.id) return;

    const maxIdx = categories.length > 0 ? Math.max(...categories.map(c => c.order_index)) : 0.0;
    try {
      const { data, error } = await supabase
        .from('workspace_categories')
        .insert({
          workspace_id: activeWorkspace.id,
          name: name.trim(),
          order_index: maxIdx + 1.0,
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setCategories(prev => [...prev, data as WorkspaceCategory]);
      }
    } catch (err) {
      console.error('Create category failed:', err);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" iş alanını silmek istediğinize emin misiniz?`)) return;
    try {
      const { error } = await supabase
        .from('workspace_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
      if (activeCategory === name) {
        setActiveCategory('');
      }
    } catch (err) {
      console.error('Delete category failed:', err);
    }
  };

  const handleRenameCategory = async (id: string, oldName: string) => {
    const newName = window.prompt("İş alanı / Kategori adını değiştirin:", oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName || !activeWorkspace?.id) return;

    const trimmedNewName = newName.trim();

    try {
      // 1. Update in workspace_categories
      const { error: catError } = await supabase
        .from('workspace_categories')
        .update({ name: trimmedNewName })
        .eq('id', id);
      if (catError) throw catError;

      // 2. Update tasks using the old category name in workspace
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ category: trimmedNewName })
        .eq('workspace_id', activeWorkspace.id)
        .eq('category', oldName);
      if (taskError) throw taskError;

      // 3. Update state
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name: trimmedNewName } : c));
      setTasks(prev => prev.map(t => t.category === oldName ? { ...t, category: trimmedNewName } : t));
      
      // Keep selected
      setActiveCategory(trimmedNewName);
    } catch (err) {
      console.error('Rename category failed:', err);
    }
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    
    const updated = reordered.map((cat, idx) => ({
      ...cat,
      order_index: idx + 1.0,
    }));
    setCategories(updated);

    try {
      const promises = updated.map(cat => 
        supabase
          .from('workspace_categories')
          .update({ order_index: cat.order_index })
          .eq('id', cat.id)
      );
      await Promise.all(promises);
    } catch (err) {
      console.error('Reorder categories failed:', err);
    }
  };



  // Detail modal
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Drag
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const loadTasks = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      // Sync overdue tasks: if task is not completed, not already overdue, has due date and due date is past the 6:00 AM effective threshold
      const today = new Date();
      const currentHour = today.getHours();
      const effectiveDate = new Date(today);
      if (currentHour < 6) {
        effectiveDate.setDate(effectiveDate.getDate() - 1);
      }
      const yyyy = effectiveDate.getFullYear();
      const mm = String(effectiveDate.getMonth() + 1).padStart(2, '0');
      const dd = String(effectiveDate.getDate()).padStart(2, '0');
      const effectiveDateStr = `${yyyy}-${mm}-${dd}`;

      await supabase
        .from('tasks')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .eq('workspace_id', activeWorkspace.id)
        .is('deleted_at', null)
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'overdue')
        .not('due_date', 'is', null)
        .lt('due_date', effectiveDateStr);

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, primary_assignee_id, start_date, due_date, completed_at, tags, recurrence, category, order_index, content_type, content_hook, content_promise, content_body, content_payoff, content_cta, content_loop')
        .eq('workspace_id', activeWorkspace.id)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      if (error) throw error;
      setTasks((data as Task[]) || []);

      // Fetch dynamic categories
      const { data: catData, error: catError } = await supabase
        .from('workspace_categories')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('order_index', { ascending: true });
      if (catError) throw catError;
      setCategories((catData as WorkspaceCategory[]) || []);
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
      const todoTasks = tasks.filter(t => t.status === 'todo');
      const maxIdx = todoTasks.length > 0 ? Math.max(...todoTasks.map(t => t.order_index)) : 0.0;
      const newOrderIdx = maxIdx + 1.0;

      const { error } = await supabase.from('tasks').insert({
        workspace_id: activeWorkspace.id,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        priority: newPriority,
        status: 'todo',
        created_by: user?.id || null,
        primary_assignee_id: newAssignee || null,
        start_date: newStartDate || null,
        due_date: newDueDate || null,
        tags: newTags.length > 0 ? newTags : [],
        recurrence: newRecurrence,
        category: newCategory || activeCategory || null,
        order_index: newOrderIdx,
      });
      if (error) throw error;
      setShowAddModal(false);
      setNewTitle(''); setNewDesc(''); setNewPriority('normal');
      setNewAssignee(''); setNewStartDate(''); setNewDueDate(''); setNewTags([]); setNewTagInput(''); setNewRecurrence('none'); setNewCategory('');
      await loadTasks();
    } catch (err) {
      console.error('Create task failed:', err);
    }
  };



  // Drag & drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // over.id could be a column key or a task id — determine target column
    const columns = ['todo', 'in_progress', 'completed', 'revision_required', 'overdue'];
    let targetCol: string | null = null;
    if (columns.includes(String(over.id))) {
      targetCol = String(over.id);
    } else {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) targetCol = overTask.status;
    }

    const draggedTask = tasks.find(t => t.id === active.id);
    if (!draggedTask || !targetCol) return;

    if (targetCol === 'overdue' && !isTaskPastDue(draggedTask.due_date)) {
      alert("Son teslim tarihi geçmemiş bir görevi 'Tarihi Geçti' aşamasına alamazsınız.");
      return;
    }

    // Get all tasks in target column (excluding the dragged task) sorted by order_index
    const colTasks = tasks
      .filter(t => t.status === targetCol && t.id !== active.id)
      .sort((a, b) => a.order_index - b.order_index);

    let newOrderIndex = 0.0;

    if (colTasks.length === 0) {
      newOrderIndex = 1.0;
    } else {
      const overIndex = colTasks.findIndex(t => t.id === over.id);

      if (overIndex !== -1) {
        if (overIndex === 0) {
          // Placed at the very top
          newOrderIndex = colTasks[0].order_index - 1.0;
        } else {
          // Placed between overIndex - 1 and overIndex
          newOrderIndex = (colTasks[overIndex - 1].order_index + colTasks[overIndex].order_index) / 2.0;
        }
      } else {
        // Dropped onto empty column cards container (which receives targetCol as over.id)
        newOrderIndex = colTasks[colTasks.length - 1].order_index + 1.0;
      }
    }

    // Optimistic update (sort locally right away)
    setTasks(prev => {
      const updated = prev.map(t => t.id === active.id ? { ...t, status: targetCol as Task['status'], order_index: newOrderIndex } : t);
      return updated.sort((a, b) => a.order_index - b.order_index);
    });

    try {
      const updates: any = { 
        status: targetCol, 
        order_index: newOrderIndex,
        updated_at: new Date().toISOString() 
      };
      if (targetCol === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }
      await supabase.from('tasks').update(updates).eq('id', active.id);
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
    const matchesCategory = !activeCategory || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });



  const columns = [
    { key: 'in_progress', title: 'Sürüyor', color: '#f59e0b' },
    { key: 'todo', title: 'Yapılacak', color: '#38bdf8' },
    { key: 'overdue', title: 'Tarihi Geçti', color: '#f97316' },
    { key: 'completed', title: 'Bitti', color: '#10b981' },
    { key: 'revision_required', title: 'Tekrar Yapılıyor', color: '#a78bfa' },
  ] as const;

  const draggedTask = tasks.find(t => t.id === activeId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

      {/* Search & Filter Header */}
      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Row 1: Search + Action buttons */}
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
            <span className="btn-text">{isSocialCategory(activeCategory) ? 'Yeni İçerik' : 'Yeni Görev'}</span>
          </button>
        </div>

        {/* Row 2: Category filter pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setActiveCategory('')}
            style={{
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: '1px solid var(--border-glass)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              backgroundColor: activeCategory === '' ? 'var(--accent-color)' : 'var(--bg-surface-accent)',
              color: activeCategory === '' ? 'white' : 'var(--text-secondary)',
            }}
          >
            Tümü
          </button>
          
          <DndContext
            sensors={categorySensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={categories.map(c => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {categories.map(cat => (
                  <SortableCategoryPill
                    key={cat.id}
                    cat={cat}
                    isActive={activeCategory === cat.name}
                    onSelect={() => {
                      if (activeCategory === cat.name) {
                        handleRenameCategory(cat.id, cat.name);
                      } else {
                        setActiveCategory(cat.name);
                      }
                    }}
                    onDelete={() => handleDeleteCategory(cat.id, cat.name)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Plus icon to create category */}
          <button
            type="button"
            onClick={handleCreateCategory}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: '1.5px dashed var(--accent-color)',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: 'var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              padding: 0,
            }}
            title="Yeni İş Alanı Ekle"
          >
            <Plus size={14} />
          </button>

          {activeCategory && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
              {filteredTasks.length} görev
            </span>
          )}
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
                    <DroppableCardsArea id={col.key}>
                      {columnTasks.map(task => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          members={members}
                          onDetailClick={setDetailTask}
                        />
                      ))}
                    </DroppableCardsArea>
                  </SortableContext>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {draggedTask && (
              <div className="task-card" style={{ opacity: 0.9, boxShadow: 'var(--shadow-lg)', transform: 'rotate(2deg)' }}>
                <span 
                  style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: draggedTask.status === 'completed' ? '#22c55e' : (draggedTask.priority === 'critical' ? '#ef4444' : draggedTask.priority === 'high' ? '#f59e0b' : '#3b82f6'), 
                    display: 'inline-block',
                    margin: '6px'
                  }} 
                />
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
                <span 
                  title={task.priority === 'critical' ? 'Acil' : task.priority === 'high' ? 'Önemli' : 'Acelesi Yok'} 
                  style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: task.status === 'completed' ? '#22c55e' : (task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f59e0b' : '#3b82f6'), 
                    display: 'inline-block',
                    marginRight: '6px',
                    flexShrink: 0
                  }} 
                />
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{task.title}</span>
                {assignee && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} /> {(assignee.full_name || '').split(' ')[0]}
                  </span>
                )}
                {task.due_date && (
                  <span style={{ fontSize: '0.75rem', color: task.status === 'completed' ? '#22c55e' : (isOverdue ? '#ef4444' : 'var(--text-muted)'), display: 'flex', alignItems: 'center', gap: '4px' }}>
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
              <span>{isSocialCategory(activeCategory || newCategory) ? 'Yeni İçerik' : 'Yeni Görev'}</span>
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
                    <option value="normal">🔵 Acelesi Yok</option>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
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
                  <label className="form-label"><Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />Başlangıç Tarihi</label>
                  <input 
                    type="date" 
                    value={newStartDate} 
                    onChange={e => setNewStartDate(e.target.value)} 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label"><Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    value={newDueDate} 
                    onChange={e => {
                      const val = e.target.value;
                      setNewDueDate(val);
                      if (val) {
                        setNewPriority(calculatePriorityFromDueDate(val));
                      }
                    }} 
                    className="form-input" 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label"><Tag size={12} style={{ display: 'inline', marginRight: '4px' }} />İş Tanımı / Kategori</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="form-input">
                  <option value="">— Kategori Seçin —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
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
                <button type="submit" className="btn btn-primary">{isSocialCategory(activeCategory || newCategory) ? 'İçerik Oluştur' : 'Görev Oluştur'}</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Task Detail Modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          allTasks={tasks}
          members={members}
          categories={categories}
          onClose={() => setDetailTask(null)}
          onRefresh={loadTasks}
        />
      )}
    </div>
  );
};

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
  ad_budget?: string | null;
  shooting_date?: string | null;
  sharing_date?: string | null;
  design_date?: string | null;
  ad_cost?: string | null;
  ad_duration?: string | null;
  stat_cta?: string | null;
  stat_downloads?: number | null;
  stat_link_clicks?: number | null;
  post_items?: any[] | null;
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

const getContentFormatInfo = (type: string | null | undefined) => {
  switch (type) {
    case 'viral':
    case 'video':
      return { label: 'Viral İçerik', emoji: '🔥', color: '#ff9f0a' };
    case 'post':
      return { label: 'Post', emoji: '🖼', color: '#0a84ff' };
    case 'reklam':
      return { label: 'Reklam', emoji: '📢', color: '#30d158' };
    case 'yari_reklam':
      return { label: 'Yarı Reklam', emoji: '⚡', color: '#bf5af2' };
    default:
      return null;
  }
};

const checkIfDateIsPastDue = (dateStr: string | null | undefined): boolean => {
  if (!dateStr) return false;
  const today = new Date();
  const currentHour = today.getHours();
  const effectiveEndDate = new Date(today);
  if (currentHour < 6) {
    effectiveEndDate.setDate(effectiveEndDate.getDate() - 1);
  }
  const yyyy = effectiveEndDate.getFullYear();
  const mm = String(effectiveEndDate.getMonth() + 1).padStart(2, '0');
  const dd = String(effectiveEndDate.getDate()).padStart(2, '0');
  const effectiveEndDateStr = `${yyyy}-${mm}-${dd}`;
  return dateStr < effectiveEndDateStr;
};

const renderCardDateMeta = (task: Task) => {
  const isSocial = isSocialCategory(task.category);
  const isOverdue = (task.status === 'revision_required' || task.status === 'overdue' || checkIfDateIsPastDue(isSocial ? task.sharing_date : task.due_date)) && task.status !== 'completed';
  const isCompleted = task.status === 'completed';
  const dateColor = isCompleted ? '#22c55e' : (isOverdue ? '#ef4444' : 'var(--text-muted)');

  const formatDateString = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  if (!isSocial) {
    if (!task.due_date && !task.start_date) return null;
    
    let displayText = '';
    if (task.start_date && task.due_date) {
      displayText = `${formatDateString(task.start_date)} ➔ ${formatDateString(task.due_date)}`;
    } else if (task.due_date) {
      displayText = formatDateString(task.due_date);
    } else if (task.start_date) {
      displayText = formatDateString(task.start_date);
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: dateColor,
      }}>
        <Clock size={10} style={{ color: dateColor }} />
        <span>{displayText}</span>
      </div>
    );
  }

  // Social Task Dates
  const startDateVal = task.content_type === 'post' ? task.design_date : task.shooting_date;
  const endDateVal = task.sharing_date;

  const formattedStart = startDateVal ? formatDateString(startDateVal) : '';
  const formattedEnd = endDateVal ? formatDateString(endDateVal) : '';

  let dateRangeText = '';
  if (formattedStart || formattedEnd) {
    dateRangeText = `${formattedStart || '—'} ➔ ${formattedEnd || '—'}`;
  }

  // Ad duration details
  let durationText = '';
  if ((task.content_type === 'reklam' || task.content_type === 'yari_reklam') && task.ad_duration) {
    const rawDur = task.ad_duration.trim();
    if (rawDur) {
      const numericVal = parseInt(rawDur);
      if (!isNaN(numericVal) && !rawDur.toLowerCase().includes('gun') && !rawDur.toLowerCase().includes('gün')) {
        durationText = ` (${numericVal} gün)`;
      } else {
        durationText = ` (${rawDur})`;
      }
    }
  }

  if (!dateRangeText && !durationText) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '0.7rem',
      fontWeight: 600,
      color: dateColor
    }}>
      <Calendar size={10} style={{ color: isOverdue ? '#ef4444' : 'var(--accent-color)' }} />
      {dateRangeText && <span>{dateRangeText}</span>}
      {durationText && <span style={{ color: isOverdue ? '#ef4444' : 'var(--accent-color)', fontWeight: 700 }}>{durationText}</span>}
    </div>
  );
};

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}> = ({ value, onChange, placeholder, minHeight = '38px' }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="form-input"
      style={{
        width: '100%',
        minHeight: minHeight,
        fontSize: '0.85rem',
        padding: '8px 12px',
        resize: 'none',
        overflow: 'hidden',
        borderRadius: '8px',
        transition: 'height 0.1s ease',
        lineHeight: '1.4',
        boxSizing: 'border-box'
      }}
      rows={1}
    />
  );
};

const DynamicNumberInput: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  icon?: string;
  amounts?: number[];
}> = ({ label, value, onChange, icon, amounts = [100, 500, 1000] }) => {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface-accent)',
      padding: '12px 16px',
      borderRadius: '12px',
      border: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {icon} {label}
        </span>
        <input
          type="number"
          value={value || 0}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="form-input"
          style={{ width: '80px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', borderRadius: '8px', padding: '4px 8px' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {amounts.map(amt => (
          <button
            key={amt}
            type="button"
            onClick={() => onChange((value || 0) + amt)}
            style={{
              flex: 1,
              padding: '4px 0',
              borderRadius: '6px',
              border: '1px solid var(--border-glass)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-secondary)',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.1s'
            }}
          >
            +{amt}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(0)}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            color: '#ef4444',
            fontSize: '0.68rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          C
        </button>
      </div>
    </div>
  );
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
  comments?: any[];
  onDetailClick: (task: Task) => void;
}> = ({ task, members, comments = [], onDetailClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const assignee = members.find(m => m.user_id === task.primary_assignee_id);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="task-card" 
      {...attributes} 
      {...listeners} 
      onClick={() => onDetailClick(task)}
    >
      {/* Title with Priority Dot & Recurrence */}
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
        <span 
          title={task.priority === 'critical' ? 'Acil' : task.priority === 'high' ? 'Önemli' : 'Acelesi Yok'} 
          style={{ 
            width: '9px', 
            height: '9px', 
            borderRadius: '50%', 
            backgroundColor: task.status === 'completed' ? '#22c55e' : (task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f59e0b' : '#3b82f6'), 
            flexShrink: 0
          }} 
        />
        <span style={{ flex: 1 }}>{task.title}</span>
        {task.recurrence && task.recurrence !== 'none' && (
          <span title={`Tekrar: ${task.recurrence}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
            <Repeat size={12} style={{ color: 'var(--text-muted)' }} />
          </span>
        )}
      </div>

      {isSocialCategory(task.category) ? (
        comments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
            {comments.map(c => (
              <div 
                key={c.id} 
                className="card-desc" 
                style={{ 
                  fontSize: '0.68rem', 
                  color: 'var(--text-secondary)',
                  lineHeight: '1.3',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  borderLeft: '2.5px solid var(--accent-color)'
                }}
              >
                {c.comment_text}
              </div>
            ))}
          </div>
        )
      ) : (
        task.description && <div className="card-desc">{task.description}</div>
      )}

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

      {/* Badges container */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px', marginBottom: '2px' }}>
        {task.category && (
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: '20px', fontSize: '0.67rem', fontWeight: 700,
            backgroundColor: 'rgba(255,159,10,0.1)', color: 'var(--accent-color)',
            border: '1px solid rgba(255,159,10,0.25)',
          }}>
            {task.category}
          </div>
        )}

        {isSocialCategory(task.category) && (() => {
          const info = getContentFormatInfo(task.content_type);
          if (!info) return null;
          return (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px', borderRadius: '20px', fontSize: '0.67rem', fontWeight: 700,
              backgroundColor: `${info.color}15`, color: info.color,
              border: `1px solid ${info.color}35`,
            }}>
              <span>{info.emoji}</span>
              <span>{info.label}</span>
            </div>
          );
        })()}

        {/* Display dates/duration inline next to badges for all tasks */}
        {renderCardDateMeta(task)}
      </div>

      {/* Meta: assignee */}
      {assignee && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
        </div>
      )}
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
  const [currentAssigneeId, setCurrentAssigneeId] = useState<string>(task.primary_assignee_id || '');
  const CATEGORY_OPTIONS = ['', ...categories.map(c => c.name)];

  const [contentType, setContentType] = useState<string>(task.content_type || 'viral');
  const [contentHook, setContentHook] = useState<string>(task.content_hook || '');
  const [contentPromise, setContentPromise] = useState<string>(task.content_promise || '');
  const [contentBody, setContentBody] = useState<string>(task.content_body || '');
  const [contentPayoff, setContentPayoff] = useState<string>(task.content_payoff || '');
  const [contentCta, setContentCta] = useState<string>(task.content_cta || '');
  const [contentLoop, setContentLoop] = useState<string>(task.content_loop || '');
  const adBudget = task.ad_budget || '';

  const [shootingDate, setShootingDate] = useState<string>(task.shooting_date || '');
  const [sharingDate, setSharingDate] = useState<string>(task.sharing_date || '');
  const [designDate, setDesignDate] = useState<string>(task.design_date || '');
  const [adCost, setAdCost] = useState<string>(task.ad_cost || '');
  const [adDuration, setAdDuration] = useState<string>(task.ad_duration || '');
  const [statCta, setStatCta] = useState<string>(task.stat_cta || '');
  const [statDownloads, setStatDownloads] = useState<number>(task.stat_downloads || 0);
  const [statLinkClicks, setStatLinkClicks] = useState<number>(task.stat_link_clicks || 0);
  const [postItems, setPostItems] = useState<any[]>(task.post_items || [{ id: 1, text: '' }]);

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
    try {
      let nextStatus = currentStatus;
      if (currentStatus !== 'completed') {
        const isSocial = isSocialCategory(currentCategory);
        const startDateVal = isSocial
          ? (contentType === 'post' ? designDate : shootingDate)
          : currentStartDate;
        const endDateVal = isSocial ? sharingDate : currentDueDate;

        const today = new Date();
        const currentHour = today.getHours();
        
        const effectiveEndDate = new Date(today);
        if (currentHour < 6) {
          effectiveEndDate.setDate(effectiveEndDate.getDate() - 1);
        }
        const yyyyEnd = effectiveEndDate.getFullYear();
        const mmEnd = String(effectiveEndDate.getMonth() + 1).padStart(2, '0');
        const ddEnd = String(effectiveEndDate.getDate()).padStart(2, '0');
        const effectiveEndDateStr = `${yyyyEnd}-${mmEnd}-${ddEnd}`;

        const yyyyStart = today.getFullYear();
        const mmStart = String(today.getMonth() + 1).padStart(2, '0');
        const ddStart = String(today.getDate()).padStart(2, '0');
        const todayDateStr = `${yyyyStart}-${mmStart}-${ddStart}`;

        if (endDateVal && endDateVal < effectiveEndDateStr) {
          nextStatus = 'revision_required';
        } else if (startDateVal) {
          if (startDateVal <= todayDateStr) {
            nextStatus = 'in_progress';
          } else {
            nextStatus = 'todo';
          }
        } else if (currentStatus === 'overdue') {
          nextStatus = 'revision_required';
        }
      }

      const updates: any = {
        title: currentTitle.trim(),
        description: currentDescription.trim() || null,
        status: nextStatus,
        priority: currentPriority,
        start_date: currentStartDate || null,
        due_date: currentDueDate || null,
        primary_assignee_id: currentAssigneeId || null,
        category: currentCategory || null,
        content_type: contentType || null,
        content_hook: contentHook || null,
        content_promise: contentPromise || null,
        content_body: contentBody || null,
        content_payoff: contentPayoff || null,
        content_cta: contentCta || null,
        content_loop: contentLoop || null,
        ad_budget: adBudget || null,
        shooting_date: shootingDate || null,
        sharing_date: sharingDate || null,
        design_date: designDate || null,
        ad_cost: adCost || null,
        ad_duration: adDuration || null,
        stat_cta: statCta || null,
        stat_downloads: statDownloads || 0,
        stat_link_clicks: statLinkClicks || 0,
        post_items: postItems || null,
        completed_at: nextStatus === 'completed' ? (task.completed_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString()
      };

      if (nextStatus !== task.status) {
        const colTasks = allTasks.filter(t => t.status === nextStatus && t.id !== task.id);
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
    overdue:     { label: 'Süresi Geçti Tekrar Yapılmalı',   color: '#ea580c', bg: 'rgba(249,115,22,0.12)' },
    completed:   { label: 'Bitti',          color: '#16a34a', bg: 'rgba(34,197,94,0.12)'  },
    revision_required: { label: 'Süresi Geçti Tekrar Yapılmalı', color: '#ea580c', bg: 'rgba(234,88,12,0.12)'},
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
  const isSocial = isSocialCategory(currentCategory);
  const targetDateVal = isSocial ? sharingDate : currentDueDate;
  const isOverdue = (currentStatus === 'revision_required' || currentStatus === 'overdue' || checkIfDateIsPastDue(targetDateVal)) && currentStatus !== 'completed';

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

          {isSocial && currentStatus === 'revision_required' && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              color: '#ef4444'
            }}>
              <span style={{ fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Görev Süresi Doldu / Tekrar Yapılmalı
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Bu içeriğin planlanan paylaşım tarihi geçmiştir. Lütfen aşağıdan yeni {contentType === 'post' ? 'tasarım' : 'çekim'} ve paylaşım tarihlerini belirleyin.
              </span>
            </div>
          )}

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
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                {[
                  { key: 'viral', label: '🔥 Viral İçerik' },
                  { key: 'post', label: '🖼 Post' },
                  { key: 'reklam', label: '📢 Reklam' },
                  { key: 'yari_reklam', label: '⚡ Yarı Reklam' }
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setContentType(f.key)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
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

              {contentType === 'post' ? (
                /* ── Post Layout ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {postItems.map((item, index) => (
                      <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {index + 1}. Post
                        </span>
                        <AutoResizeTextarea
                          value={item.text || ''}
                          onChange={(val) => {
                            setPostItems(prev => prev.map(p => p.id === item.id ? { ...p, text: val } : p));
                          }}
                          placeholder="Post metnini veya görsel tasarım detaylarını yazın..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (postItems.length > 1) {
                              setPostItems(prev => prev.filter(p => p.id !== item.id));
                            }
                          }}
                          disabled={postItems.length <= 1}
                          style={{
                            background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer',
                            opacity: postItems.length <= 1 ? 0.3 : 1
                          }}
                          title="Postu sil"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPostItems([...postItems, { id: Date.now(), text: '' }])}
                    style={{
                      alignSelf: 'start',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1.5px dashed var(--accent-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--accent-color)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Post Ekle
                  </button>

                  {/* Dates for Post */}
                  <div style={{ height: '1px', backgroundColor: 'var(--border-glass)', margin: '4px 0' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>🎨 Tasarım Yapılacak Gün</label>
                      <input
                        type="date"
                        value={designDate || ''}
                        onChange={e => setDesignDate(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>📅 Tasarımın Paylaşılacağı Gün</label>
                      <input
                        type="date"
                        value={sharingDate || ''}
                        onChange={e => setSharingDate(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Viral or Reklam / Yarı Reklam Layout ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Standard Hook to Loop Sections */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Hook */}
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Hook</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--accent-color)', fontWeight: 700 }}>İlk %10 Rasyon</span>
                      </div>
                      <AutoResizeTextarea
                        value={contentHook}
                        onChange={setContentHook}
                        placeholder="Kullanıcının dikkatini çekecek ilk cümle veya görsel kanca..."
                      />
                    </div>

                    {/* Kurulum / Vaat */}
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Kurulum / Vaat</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%10-20 Bölümü</span>
                      </div>
                      <AutoResizeTextarea
                        value={contentPromise}
                        onChange={setContentPromise}
                        placeholder="İçeriğin amacı veya izleyiciye sunulan ana vaat..."
                      />
                    </div>

                    {/* Gelişme / Değer */}
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Gelişme / Değer</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%20-70 Bölümü</span>
                      </div>
                      <AutoResizeTextarea
                        value={contentBody}
                        onChange={setContentBody}
                        placeholder="Ana içerik, detaylı anlatım ve asıl faydalı bilgi..."
                      />
                    </div>

                    {/* Payoff / Sonuç */}
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Payoff / Sonuç</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%70-85 Bölümü</span>
                      </div>
                      <AutoResizeTextarea
                        value={contentPayoff}
                        onChange={setContentPayoff}
                        placeholder="Alınacak ana ders veya ulaşılan sonuç..."
                      />
                    </div>

                    {/* CTA */}
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>CTA (Çağrı)</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%85-95 Bölümü</span>
                      </div>
                      <AutoResizeTextarea
                        value={contentCta}
                        onChange={setContentCta}
                        placeholder="Eyleme çağrı (takip et, kaydet vb.)..."
                      />
                    </div>

                    {/* Kapanış / Loop */}
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Kapanış / Loop</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Son %5 / Döngü</span>
                      </div>
                      <AutoResizeTextarea
                        value={contentLoop}
                        onChange={setContentLoop}
                        placeholder="Video döngüsü (loop) veya son kapanış kelimeleri..."
                      />
                    </div>
                  </div>

                  {/* Date fields based on format */}
                  <div style={{ height: '1px', backgroundColor: 'var(--border-glass)', margin: '6px 0' }} />

                  {contentType === 'viral' ? (
                    /* Viral: Çekim günü & Paylaşım günü */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>📹 Çekim Yapılacak Gün</label>
                        <input
                          type="date"
                          value={shootingDate || ''}
                          onChange={e => setShootingDate(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>📅 Paylaşılacak Gün</label>
                        <input
                          type="date"
                          value={sharingDate || ''}
                          onChange={e => setSharingDate(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Reklam / Yarı Reklam: Ücret, Süre, Çekim, Paylaşım */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>💵 Reklam Ücreti</label>
                          <input
                            type="text"
                            value={adCost || ''}
                            onChange={e => setAdCost(e.target.value)}
                            placeholder="Örn: 2500 ₺..."
                            className="form-input"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>⏱ Yayın Süresi</label>
                          <input
                            type="text"
                            value={adDuration || ''}
                            onChange={e => setAdDuration(e.target.value)}
                            placeholder="Örn: 5 gün / 1 ay..."
                            className="form-input"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>📹 Çekim Günü</label>
                          <input
                            type="date"
                            value={shootingDate || ''}
                            onChange={e => setShootingDate(e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>📅 Paylaşım Günü</label>
                          <input
                            type="date"
                            value={sharingDate || ''}
                            onChange={e => setSharingDate(e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

          {isSocial && (contentType === 'reklam' || contentType === 'yari_reklam') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
                borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '4px'
              }}>
                📊 Reklam Performans Verileri
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <DynamicNumberInput
                  label="CPM (Bin Gösterim)"
                  value={parseInt(statCta) || 0}
                  onChange={(val) => setStatCta(String(val))}
                  icon="📊"
                  amounts={[5, 10, 50]}
                />

                <DynamicNumberInput
                  label="Toplam İndirme"
                  value={statDownloads}
                  onChange={setStatDownloads}
                  icon="📥"
                />

                <DynamicNumberInput
                  label="Link Tıklaması"
                  value={statLinkClicks}
                  onChange={setStatLinkClicks}
                  icon="🔗"
                />
              </div>
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
                  <option value="revision_required">Süresi Geçti Tekrar Yapılmalı</option>
                  <option value="completed">Bitti</option>
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

          {!isSocial && (
            /* Start Date + Due Date — 2-col */
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
          )}

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
              <select
                value={currentAssigneeId}
                onChange={e => setCurrentAssigneeId(e.target.value)}
                className="form-input"
                style={{ borderRadius: '10px', fontSize: '0.85rem', width: '100%', padding: '9px 12px', height: '40px' }}
              >
                <option value="">— Atanmamış —</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name || 'Kullanıcı'}
                  </option>
                ))}
              </select>
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
                  type="button"
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
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() => {
    return (localStorage.getItem('kh_tasks_view_mode') as 'kanban' | 'list') || 'kanban';
  });

  useEffect(() => {
    localStorage.setItem('kh_tasks_view_mode', viewMode);
  }, [viewMode]);
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

  // Creation social media variables
  const [newContentType, setNewContentType] = useState<string>('viral');
  const [newContentHook, setNewContentHook] = useState('');
  const [newContentPromise, setNewContentPromise] = useState('');
  const [newContentBody, setNewContentBody] = useState('');
  const [newContentPayoff, setNewContentPayoff] = useState('');
  const [newContentCta, setNewContentCta] = useState('');
  const [newContentLoop, setNewContentLoop] = useState('');
  const [newAdBudget, setNewAdBudget] = useState('');
  const [newShootingDate, setNewShootingDate] = useState('');
  const [newSharingDate, setNewSharingDate] = useState('');
  const [newDesignDate, setNewDesignDate] = useState('');
  const [newAdCost, setNewAdCost] = useState('');
  const [newAdDuration, setNewAdDuration] = useState('');
  const [newPostItems, setNewPostItems] = useState<any[]>([{ id: 1, text: '' }]);

  const [taskComments, setTaskComments] = useState<Record<string, any[]>>({});

  // Category filter
  const [categories, setCategories] = useState<WorkspaceCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    const saved = localStorage.getItem('kh_tasks_active_category');
    return saved !== null ? saved : '___init___';
  });

  useEffect(() => {
    if (activeCategory !== '___init___') {
      localStorage.setItem('kh_tasks_active_category', activeCategory);
    }
  }, [activeCategory]);

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

  useEffect(() => {
    if (detailTask) {
      localStorage.setItem('kh_open_task_id', detailTask.id);
    } else {
      localStorage.removeItem('kh_open_task_id');
    }
  }, [detailTask]);

  useEffect(() => {
    if (tasks.length === 0) return;
    const savedOpenTaskId = localStorage.getItem('kh_open_task_id');
    if (savedOpenTaskId) {
      const found = tasks.find(t => t.id === savedOpenTaskId);
      if (found) {
        if (!detailTask || detailTask.id !== savedOpenTaskId) {
          setDetailTask(found);
        } else if (JSON.stringify(found) !== JSON.stringify(detailTask)) {
          setDetailTask(found);
        }
      }
    }
  }, [tasks]);

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
      // 1. Fetch all tasks for workspace
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, primary_assignee_id, start_date, due_date, completed_at, tags, recurrence, category, order_index, content_type, content_hook, content_promise, content_body, content_payoff, content_cta, content_loop, ad_budget, shooting_date, sharing_date, design_date, ad_cost, ad_duration, stat_cta, stat_downloads, stat_link_clicks, post_items')
        .eq('workspace_id', activeWorkspace.id)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      if (error) throw error;

      const loadedTasks = (data as Task[]) || [];

      // 2. Resolve thresholds
      const today = new Date();
      const currentHour = today.getHours();
      
      // End date threshold comparison string (effective at 6:00 AM next day)
      const effectiveEndDate = new Date(today);
      if (currentHour < 6) {
        effectiveEndDate.setDate(effectiveEndDate.getDate() - 1);
      }
      const yyyyEnd = effectiveEndDate.getFullYear();
      const mmEnd = String(effectiveEndDate.getMonth() + 1).padStart(2, '0');
      const ddEnd = String(effectiveEndDate.getDate()).padStart(2, '0');
      const effectiveEndDateStr = `${yyyyEnd}-${mmEnd}-${ddEnd}`;

      // Start date threshold comparison string (today's date)
      const yyyyStart = today.getFullYear();
      const mmStart = String(today.getMonth() + 1).padStart(2, '0');
      const ddStart = String(today.getDate()).padStart(2, '0');
      const todayDateStr = `${yyyyStart}-${mmStart}-${ddStart}`;

      // 3. Process status shifts locally
      const tasksToUpdate: { id: string; status: Task['status'] }[] = [];
      const processedTasks = loadedTasks.map(t => {
        if (t.status === 'completed') return t;

        const isSocial = isSocialCategory(t.category);
        const startDateVal = isSocial
          ? (t.content_type === 'post' ? t.design_date : t.shooting_date)
          : t.start_date;
        const endDateVal = isSocial ? t.sharing_date : t.due_date;

        let targetStatus: Task['status'] = t.status;

        // Condition A: End date passed -> 'revision_required' (Süresi Geçti Tekrar Yapılmalı)
        if (endDateVal && endDateVal < effectiveEndDateStr) {
          targetStatus = 'revision_required';
        }
        // Condition B: End date not passed, and start date is set
        else if (startDateVal) {
          if (startDateVal <= todayDateStr) {
            // Start date has arrived or passed -> 'in_progress' (Sürüyor)
            targetStatus = 'in_progress';
          } else {
            // Start date is in the future -> 'todo' (Yapılacak)
            targetStatus = 'todo';
          }
        }
        // Condition C: No start date and no end date, but was in revision_required or overdue -> default to todo
        else if (t.status === 'revision_required' || t.status === 'overdue') {
          targetStatus = 'todo';
        }

        // Map overdue database status to revision_required for column alignment
        if (targetStatus === 'overdue') {
          targetStatus = 'revision_required';
        }

        if (targetStatus !== t.status) {
          tasksToUpdate.push({ id: t.id, status: targetStatus });
          return { ...t, status: targetStatus };
        }
        return t;
      });

      setTasks(processedTasks);

      // Fetch comments for loaded tasks
      const taskIds = processedTasks.map(t => t.id);
      if (taskIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('task_comments')
          .select('id, task_id, comment_text, created_at')
          .in('task_id', taskIds)
          .order('created_at', { ascending: true });
        
        const commentsMap: Record<string, any[]> = {};
        if (commentsData) {
          commentsData.forEach(c => {
            if (!commentsMap[c.task_id]) {
              commentsMap[c.task_id] = [];
            }
            commentsMap[c.task_id].push(c);
          });
        }
        setTaskComments(commentsMap);
      } else {
        setTaskComments({});
      }

      // 4. Fetch dynamic categories
      const { data: catData, error: catError } = await supabase
        .from('workspace_categories')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('order_index', { ascending: true });
      if (catError) throw catError;
      const loadedCats = (catData as WorkspaceCategory[]) || [];
      setCategories(loadedCats);

      setActiveCategory(prev => {
        if (prev === '___init___') {
          return loadedCats.length > 0 ? loadedCats[0].name : '';
        }
        return prev;
      });

      // 5. Asynchronously persist updates back to Supabase in bulk
      if (tasksToUpdate.length > 0) {
        Promise.all(
          tasksToUpdate.map(item =>
            supabase
              .from('tasks')
              .update({ status: item.status, updated_at: new Date().toISOString() })
              .eq('id', item.id)
          )
        ).catch(err => console.error('Bulk status update failed:', err));
      }

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

      const isNewSocial = isSocialCategory(newCategory || activeCategory);

      // Determine next status based on start/end dates
      let initialStatus: Task['status'] = 'todo';
      const startDateVal = isNewSocial
        ? (newContentType === 'post' ? newDesignDate : newShootingDate)
        : newStartDate;
      const endDateVal = isNewSocial ? newSharingDate : newDueDate;

      const today = new Date();
      const currentHour = today.getHours();
      
      const effectiveEndDate = new Date(today);
      if (currentHour < 6) {
        effectiveEndDate.setDate(effectiveEndDate.getDate() - 1);
      }
      const yyyyEnd = effectiveEndDate.getFullYear();
      const mmEnd = String(effectiveEndDate.getMonth() + 1).padStart(2, '0');
      const ddEnd = String(effectiveEndDate.getDate()).padStart(2, '0');
      const effectiveEndDateStr = `${yyyyEnd}-${mmEnd}-${ddEnd}`;

      const yyyyStart = today.getFullYear();
      const mmStart = String(today.getMonth() + 1).padStart(2, '0');
      const ddStart = String(today.getDate()).padStart(2, '0');
      const todayDateStr = `${yyyyStart}-${mmStart}-${ddStart}`;

      if (endDateVal && endDateVal < effectiveEndDateStr) {
        initialStatus = 'revision_required';
      } else if (startDateVal) {
        if (startDateVal <= todayDateStr) {
          initialStatus = 'in_progress';
        } else {
          initialStatus = 'todo';
        }
      }

      const taskPayload: any = {
        workspace_id: activeWorkspace.id,
        title: newTitle.trim(),
        description: isNewSocial ? null : (newDesc.trim() || null),
        priority: newPriority,
        status: initialStatus,
        created_by: user?.id || null,
        primary_assignee_id: newAssignee || null,
        tags: newTags.length > 0 ? newTags : [],
        category: newCategory || activeCategory || null,
        order_index: newOrderIdx,
      };

      if (isNewSocial) {
        taskPayload.content_type = newContentType || 'viral';
        taskPayload.content_hook = newContentHook.trim() || null;
        taskPayload.content_promise = newContentPromise.trim() || null;
        taskPayload.content_body = newContentBody.trim() || null;
        taskPayload.content_payoff = newContentPayoff.trim() || null;
        taskPayload.content_cta = newContentCta.trim() || null;
        taskPayload.content_loop = newContentLoop.trim() || null;
        taskPayload.ad_budget = newAdBudget.trim() || null;
        taskPayload.shooting_date = newShootingDate || null;
        taskPayload.sharing_date = newSharingDate || null;
        taskPayload.design_date = newDesignDate || null;
        taskPayload.ad_cost = newAdCost || null;
        taskPayload.ad_duration = newAdDuration || null;
        taskPayload.post_items = newPostItems || null;
      } else {
        taskPayload.start_date = newStartDate || null;
        taskPayload.due_date = newDueDate || null;
        taskPayload.recurrence = newRecurrence;
      }

      const { error } = await supabase.from('tasks').insert(taskPayload);
      if (error) throw error;
      setShowAddModal(false);
      
      // Reset all states
      setNewTitle(''); setNewDesc(''); setNewPriority('normal');
      setNewAssignee(''); setNewStartDate(''); setNewDueDate(''); setNewTags([]); setNewTagInput(''); setNewRecurrence('none'); setNewCategory('');
      setNewContentType('viral'); setNewContentHook(''); setNewContentPromise(''); setNewContentBody(''); setNewContentPayoff(''); setNewContentCta(''); setNewContentLoop('');
      setNewAdBudget(''); setNewShootingDate(''); setNewSharingDate(''); setNewDesignDate(''); setNewAdCost(''); setNewAdDuration('');
      setNewPostItems([{ id: 1, text: '' }]);

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
    const columns = ['todo', 'in_progress', 'completed', 'revision_required'];
    let targetCol: string | null = null;
    if (columns.includes(String(over.id))) {
      targetCol = String(over.id);
    } else {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) {
        // Map database status 'overdue' to column 'revision_required'
        targetCol = overTask.status === 'overdue' ? 'revision_required' : overTask.status;
      }
    }

    const draggedTask = tasks.find(t => t.id === active.id);
    if (!draggedTask || !targetCol) return;

    // Get all tasks in target column (excluding the dragged task) sorted by order_index
    const colTasks = tasks
      .filter(t => (t.status === targetCol || (targetCol === 'revision_required' && t.status === 'overdue')) && t.id !== active.id)
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
    { key: 'revision_required', title: 'Süresi Geçti Tekrar Yapılmalı', color: '#ea580c' },
    { key: 'completed', title: 'Bitti', color: '#10b981' },
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
          <button className="btn btn-primary" onClick={() => { setNewCategory(activeCategory); setShowAddModal(true); }}>
            <Plus size={18} />
            <span className="btn-text">{isSocialCategory(activeCategory) ? 'Yeni İçerik' : 'Yeni Görev'}</span>
          </button>
        </div>

        {/* Row 2: Category filter pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>

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
              marginLeft: 'auto'
            }}
          >
            Tümü
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
              const columnTasks = filteredTasks.filter(t => {
                if (col.key === 'revision_required') {
                  return t.status === 'revision_required' || t.status === 'overdue';
                }
                return t.status === col.key;
              });
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
                          comments={taskComments[task.id] || []}
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
            const isSocial = isSocialCategory(task.category);
            const targetDateVal = isSocial ? task.sharing_date : task.due_date;
            const isOverdue = (task.status === 'revision_required' || task.status === 'overdue' || checkIfDateIsPastDue(targetDateVal)) && task.status !== 'completed';
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
                {targetDateVal && (
                  <span style={{ fontSize: '0.75rem', color: task.status === 'completed' ? '#22c55e' : (isOverdue ? '#ef4444' : 'var(--text-muted)'), display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {(() => {
                      try {
                        const parts = targetDateVal.split('-');
                        if (parts.length === 3) {
                          const year = parseInt(parts[0], 10);
                          const month = parseInt(parts[1], 10) - 1;
                          const day = parseInt(parts[2], 10);
                          const d = new Date(year, month, day);
                          return d.toLocaleDateString('tr-TR');
                        }
                        return new Date(targetDateVal).toLocaleDateString('tr-TR');
                      } catch {
                        return targetDateVal;
                      }
                    })()}
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
      {showAddModal && (() => {
        const isNewSocial = isSocialCategory(newCategory || activeCategory);
        return (
          <div className="modal-backdrop">
            <div 
              className="modal-content" 
              style={{ 
                maxWidth: isNewSocial ? '760px' : '520px', 
                width: '95%', 
                transition: 'max-width 0.2s ease-in-out',
                padding: 0,
                overflow: 'hidden',
                borderRadius: '16px'
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 24px 16px',
                borderBottom: '1px solid var(--border-glass)',
                background: 'var(--bg-surface)'
              }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {isNewSocial ? 'Yeni İçerik Planla' : 'Yeni Görev Tanımla'}
                </span>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  padding: '20px 24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '18px', 
                  overflowY: 'auto', 
                  maxHeight: 'calc(90vh - 140px)' 
                }}>

                  {/* Title */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      {isNewSocial ? 'İçerik Başlığı' : 'Görev Başlığı'}
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={newTitle} 
                      onChange={e => setNewTitle(e.target.value)} 
                      className="form-input" 
                      placeholder={isNewSocial ? "İçerik başlığı..." : "Görev başlığı..."} 
                      style={{ fontWeight: 700, fontSize: '0.95rem', width: '100%', borderRadius: '10px', padding: '10px 14px' }}
                    />
                  </div>

                  {/* Content Specific Form Fields */}
                  {isNewSocial ? (
                    /* ── Social Media Editor ── */
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
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                        {[
                          { key: 'viral', label: '🔥 Viral İçerik' },
                          { key: 'post', label: '🖼 Post' },
                          { key: 'reklam', label: '📢 Reklam' },
                          { key: 'yari_reklam', label: '⚡ Yarı Reklam' }
                        ].map(f => (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => setNewContentType(f.key)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              border: '1.5px solid',
                              borderColor: newContentType === f.key ? 'var(--accent-color)' : 'var(--border-glass)',
                              backgroundColor: newContentType === f.key ? 'rgba(255,159,10,0.12)' : 'transparent',
                              color: newContentType === f.key ? 'var(--accent-color)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {newContentType === 'post' ? (
                        /* ── Post Layout ── */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {newPostItems.map((item, index) => (
                              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', gap: '12px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                  {index + 1}. Post
                                </span>
                                <AutoResizeTextarea
                                  value={item.text || ''}
                                  onChange={(val) => {
                                    setNewPostItems(prev => prev.map(p => p.id === item.id ? { ...p, text: val } : p));
                                  }}
                                  placeholder="Post metnini veya görsel tasarım detaylarını yazın..."
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (newPostItems.length > 1) {
                                      setNewPostItems(prev => prev.filter(p => p.id !== item.id));
                                    }
                                  }}
                                  disabled={newPostItems.length <= 1}
                                  style={{
                                    background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer',
                                    opacity: newPostItems.length <= 1 ? 0.3 : 1
                                  }}
                                  title="Postu sil"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setNewPostItems(prev => [...prev, { id: Date.now(), text: '' }])}
                              style={{
                                padding: '6px 12px', borderRadius: '8px', border: '1.5px dashed var(--border-glass)',
                                backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700,
                                cursor: 'pointer', alignSelf: 'flex-start', marginTop: '4px'
                              }}
                            >
                              + Post Ekle
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Viral / Reklam / Yarı Reklam Layout ── */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Hook */}
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Hook</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--accent-color)', fontWeight: 700 }}>İlk %10 Rasyon</span>
                              </div>
                              <AutoResizeTextarea
                                value={newContentHook}
                                onChange={setNewContentHook}
                                placeholder="Kullanıcının dikkatini çekecek ilk cümle veya görsel kanca..."
                              />
                            </div>
                            {/* Vaat */}
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Vaat</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%10-20 Bölümü</span>
                              </div>
                              <AutoResizeTextarea
                                value={newContentPromise}
                                onChange={setNewContentPromise}
                                placeholder="İçeriğin amacı veya izleyiciye sunulan ana vaat..."
                              />
                            </div>
                            {/* Gövde */}
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Gövde</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%20-80 Bölümü</span>
                              </div>
                              <AutoResizeTextarea
                                value={newContentBody}
                                onChange={setNewContentBody}
                                placeholder="İçeriğin ana konusu, detayları ve kanıtlar..."
                              />
                            </div>
                            {/* Payoff */}
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Payoff</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>%80-90 Bölümü</span>
                              </div>
                              <AutoResizeTextarea
                                value={newContentPayoff}
                                onChange={setNewContentPayoff}
                                placeholder="İzleyicinin alacağı nihai fayda veya ders..."
                              />
                            </div>
                            {/* CTA */}
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>CTA</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--accent-color)', fontWeight: 700 }}>Eyleme Çağrı</span>
                              </div>
                              <AutoResizeTextarea
                                value={newContentCta}
                                onChange={setNewContentCta}
                                placeholder="İzleyiciyi yönlendireceğiniz eylem (Yorum yap, Kaydet vb.)..."
                              />
                            </div>
                            {/* Loop */}
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Loop</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Döngü Cümlesi</span>
                              </div>
                              <AutoResizeTextarea
                                value={newContentLoop}
                                onChange={setNewContentLoop}
                                placeholder="İçeriğin başına kusursuz dönecek son cümle..."
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Dates inside social panel */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>📅 {newContentType === 'post' ? 'Tasarım Tarihi' : 'Çekim Tarihi'}</label>
                          <input
                            type="date"
                            value={newContentType === 'post' ? newDesignDate : newShootingDate}
                            onChange={e => {
                              if (newContentType === 'post') {
                                setNewDesignDate(e.target.value);
                              } else {
                                setNewShootingDate(e.target.value);
                              }
                            }}
                            className="form-input"
                            style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>📅 Paylaşım Günü (Deadline)</label>
                          <input
                            type="date"
                            value={newSharingDate}
                            onChange={e => setNewSharingDate(e.target.value)}
                            className="form-input"
                            style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      {/* Reklam details */}
                      {(newContentType === 'reklam' || newContentType === 'yari_reklam') && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>💵 Reklam Bütçesi</label>
                            <input
                              type="text"
                              value={newAdBudget}
                              onChange={e => setNewAdBudget(e.target.value)}
                              className="form-input"
                              placeholder="Örn: 5000 TL"
                              style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>💸 Harcanan Tutar</label>
                            <input
                              type="text"
                              value={newAdCost}
                              onChange={e => setNewAdCost(e.target.value)}
                              className="form-input"
                              placeholder="Örn: 4800 TL"
                              style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>⏱ Reklam Süresi</label>
                            <input
                              type="text"
                              value={newAdDuration}
                              onChange={e => setNewAdDuration(e.target.value)}
                              className="form-input"
                              placeholder="Örn: 5 gün"
                              style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Standard Task Fields ── */
                    <>
                      <div className="form-group">
                        <label className="form-label">Açıklama</label>
                        <textarea 
                          value={newDesc} 
                          onChange={e => setNewDesc(e.target.value)} 
                          className="form-input" 
                          rows={2} 
                          placeholder="Opsiyonel açıklama..." 
                          style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                        />
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label"><Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />Başlangıç Tarihi</label>
                          <input 
                            type="date" 
                            value={newStartDate} 
                            onChange={e => setNewStartDate(e.target.value)} 
                            className="form-input" 
                            style={{ borderRadius: '10px', fontSize: '0.85rem' }}
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
                            style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Meta section matching detail modal style */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>DURUM</label>
                        <div style={{
                          padding: '9px 12px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                          Yapılacak
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>ÖNCELİK</label>
                        <select 
                          value={newPriority} 
                          onChange={e => setNewPriority(e.target.value as Task['priority'])} 
                          className="form-input"
                          style={{ borderRadius: '10px', fontSize: '0.85rem', width: '100%', padding: '9px 12px', fontWeight: 700, color: newPriority === 'critical' ? '#ef4444' : newPriority === 'high' ? '#f59e0b' : '#3b82f6', backgroundColor: newPriority === 'critical' ? 'rgba(239, 68, 68, 0.1)' : newPriority === 'high' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)', border: '1px solid transparent' }}
                        >
                          <option value="critical">🔴 Acil</option>
                          <option value="high">🟡 Önemli</option>
                          <option value="normal">🔵 Acelesi Yok</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>İŞ TANIMI</label>
                        <select 
                          value={newCategory} 
                          onChange={e => setNewCategory(e.target.value)} 
                          className="form-input"
                          style={{ borderRadius: '10px', fontSize: '0.85rem', width: '100%', padding: '9px 12px' }}
                        >
                          <option value="">— Kategori Seçin —</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>ATANAN KİŞİ</label>
                        <select 
                          value={newAssignee} 
                          onChange={e => setNewAssignee(e.target.value)} 
                          className="form-input"
                          style={{ borderRadius: '10px', fontSize: '0.85rem', width: '100%', padding: '9px 12px' }}
                        >
                          <option value="">— Atanmamış —</option>
                          {members.map(m => (
                            <option key={m.user_id} value={m.user_id}>{m.full_name || 'Kullanıcı'}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {!isNewSocial && (
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>TEKRAR</label>
                        <select 
                          value={newRecurrence} 
                          onChange={e => setNewRecurrence(e.target.value)} 
                          className="form-input"
                          style={{ borderRadius: '10px', fontSize: '0.85rem', width: '100%', padding: '9px 12px' }}
                        >
                          <option value="none">Yok</option>
                          <option value="daily">Günlük</option>
                          <option value="weekly">Haftalık</option>
                          <option value="monthly">Aylık</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Tags (Common to both) */}
                  <div className="form-group">
                    <label className="form-label"><Tag size={12} style={{ display: 'inline', marginRight: '4px' }} />Etiketler (Enter ile ekle)</label>
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="form-input"
                      placeholder="#etiket yaz, Enter'a bas..."
                      style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                    />
                    {newTags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {newTags.map(tag => (
                          <span key={tag} style={{
                            padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem',
                            backgroundColor: 'rgba(183,1,22,0.08)', color: 'var(--accent-color)',
                            border: '1px solid rgba(183,1,22,0.2)', display: 'flex', alignItems: 'center', gap: '4px',
                            fontWeight: 600
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
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', gap: '8px',
                  padding: '16px 24px',
                  borderTop: '1px solid var(--border-glass)',
                  background: 'var(--bg-surface)'
                }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">
                    {isNewSocial ? 'İçerik Oluştur' : 'Görev Oluştur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}



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

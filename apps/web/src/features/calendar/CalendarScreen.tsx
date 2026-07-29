import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { 
  Calendar, Clock, ChevronLeft, ChevronRight, X
} from 'lucide-react';

interface CalendarTask {
  id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'waiting' | 'completed' | 'revision_required' | 'overdue';
  priority: 'critical' | 'high' | 'normal' | 'low';
  start_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  primary_assignee_id?: string | null;
  created_by?: string | null;
  created_at: string;
  category?: string | null;
  content_type?: string | null;
  shooting_date?: string | null;
  sharing_date?: string | null;
  design_date?: string | null;
  ad_duration?: string | null;
}

interface WorkspaceMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const CalendarScreen: React.FC = () => {
  const { activeWorkspace, user } = useAuth();
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Filters
  const [onlyMine, setOnlyMine] = useState(() => {
    return localStorage.getItem('kh_calendar_only_mine') === 'true';
  });

  // Task click-to-edit modal states
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<CalendarTask['status']>('todo');
  const [editTaskPriority, setEditTaskPriority] = useState<CalendarTask['priority']>('normal');
  const [editTaskAssignee, setEditTaskAssignee] = useState('');
  const [editTaskStartDate, setEditTaskStartDate] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskShootingDate, setEditTaskShootingDate] = useState('');
  const [editTaskSharingDate, setEditTaskSharingDate] = useState('');
  const [editTaskDesignDate, setEditTaskDesignDate] = useState('');

  // Persist filter
  useEffect(() => {
    localStorage.setItem('kh_calendar_only_mine', String(onlyMine));
  }, [onlyMine]);

  const loadCalendarData = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      // 1. Fetch tasks
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, start_date, due_date, completed_at, primary_assignee_id, created_by, created_at, category, content_type, shooting_date, sharing_date, design_date, ad_duration')
        .eq('workspace_id', activeWorkspace.id)
        .is('deleted_at', null);

      if (taskError) throw taskError;

      // 2. Fetch members
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('user_id, profiles:profiles!workspace_members_user_id_fkey(full_name, avatar_url)')
        .eq('workspace_id', activeWorkspace.id);

      if (memberData) {
        setMembers(
          memberData.map((m: any) => ({
            user_id: m.user_id,
            full_name: m.profiles?.full_name || null,
            avatar_url: m.profiles?.avatar_url || null,
          }))
        );
      }

      const loadedTasks = (taskData as CalendarTask[]) || [];

      // 3. Process status shifts locally based on dates (consistent with TasksScreen state engine)
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

      const tasksToUpdate: { id: string; status: CalendarTask['status'] }[] = [];
      const processedTasks = loadedTasks.map(t => {
        if (t.status === 'completed') return t;

        const isSocial = t.category ? ['sosyal medya', 'reklam', 'post', 'viral', 'içerik'].some(word => t.category!.toLowerCase().includes(word)) : false;
        const startDateVal = isSocial
          ? (t.content_type === 'post' ? t.design_date : t.shooting_date)
          : t.start_date;
        const endDateVal = isSocial ? t.sharing_date : t.due_date;

        let targetStatus: CalendarTask['status'] = t.status;

        if (endDateVal && endDateVal < effectiveEndDateStr) {
          targetStatus = 'revision_required';
        } else if (startDateVal) {
          if (startDateVal <= todayDateStr) {
            targetStatus = 'in_progress';
          } else {
            targetStatus = 'todo';
          }
        } else if (t.status === 'revision_required' || t.status === 'overdue') {
          targetStatus = 'todo';
        }

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

      // Async write-back
      if (tasksToUpdate.length > 0) {
        Promise.all(
          tasksToUpdate.map(item =>
            supabase
              .from('tasks')
              .update({ status: item.status, updated_at: new Date().toISOString() })
              .eq('id', item.id)
          )
        ).catch(err => console.error('Bulk calendar status sync failed:', err));
      }

    } catch (err) {
      console.error('Load calendar data failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Calendar cell builder helper
  const getLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getCalendarCells = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Day of week offset (Mon = 0, Sun = 6)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; 

    const cells: { day: number; date: Date; isCurrentMonth: boolean }[] = [];

    // Prior month days
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      cells.push({ day: prevMonthLast - i, date: new Date(py, pm, prevMonthLast - i), isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push({ day: d, date: new Date(year, month, d), isCurrentMonth: true });
    }

    // Next month days to pad to full weeks (grid of 35 or 42)
    const totalNeeded = cells.length <= 35 ? 35 : 42;
    const remaining = totalNeeded - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      cells.push({ day: d, date: new Date(ny, nm, d), isCurrentMonth: false });
    }
    return cells;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'in_progress': return '#3b82f6';
      case 'revision_required': return '#ea580c';
      case 'overdue': return '#ea580c';
      case 'waiting': return '#9333ea';
      default: return '#6366f1';
    }
  };



  const openTaskEdit = (task: CalendarTask) => {
    setSelectedTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskStatus(task.status);
    setEditTaskPriority(task.priority);
    setEditTaskAssignee(task.primary_assignee_id || '');
    setEditTaskStartDate(task.start_date || '');
    setEditTaskDueDate(task.due_date || '');
    setEditTaskShootingDate(task.shooting_date || '');
    setEditTaskSharingDate(task.sharing_date || '');
    setEditTaskDesignDate(task.design_date || '');
  };

  const handleTaskEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTaskTitle.trim()) return;

    try {
      // Dynamic auto-status shifts on save
      let targetStatus = editTaskStatus;
      if (editTaskStatus !== 'completed') {
        const isSocial = selectedTask.category ? ['sosyal medya', 'reklam', 'post', 'viral', 'içerik'].some(word => selectedTask.category!.toLowerCase().includes(word)) : false;
        const startDateVal = isSocial
          ? (selectedTask.content_type === 'post' ? editTaskDesignDate : editTaskShootingDate)
          : editTaskStartDate;
        const endDateVal = isSocial ? editTaskSharingDate : editTaskDueDate;

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
          targetStatus = 'revision_required';
        } else if (startDateVal) {
          if (startDateVal <= todayDateStr) {
            targetStatus = 'in_progress';
          } else {
            targetStatus = 'todo';
          }
        } else if (editTaskStatus === 'overdue') {
          targetStatus = 'revision_required';
        }
      }

      const updates: any = {
        title: editTaskTitle.trim(),
        description: editTaskDesc.trim() || null,
        status: targetStatus,
        priority: editTaskPriority,
        primary_assignee_id: editTaskAssignee || null,
        start_date: editTaskStartDate || null,
        due_date: editTaskDueDate || null,
        shooting_date: editTaskShootingDate || null,
        sharing_date: editTaskSharingDate || null,
        design_date: editTaskDesignDate || null,
        completed_at: targetStatus === 'completed' ? (selectedTask.completed_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('tasks').update(updates).eq('id', selectedTask.id);
      if (error) throw error;

      setSelectedTask(null);
      loadCalendarData();
    } catch (err) {
      console.error('Update task failed:', err);
    }
  };

  const handleTaskDelete = async () => {
    if (!selectedTask) return;
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', selectedTask.id);
      if (error) throw error;

      setSelectedTask(null);
      loadCalendarData();
    } catch (err) {
      console.error('Delete task failed:', err);
    }
  };

  // Filter tasks list
  const filteredTasks = tasks.filter(t => {
    if (onlyMine) {
      return t.primary_assignee_id === user?.id || t.created_by === user?.id;
    }
    return true;
  });

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const cells = getCalendarCells(year, month);
  const todayStr = getLocalDate(new Date());
  const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const dayNames = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '24px', paddingBottom: '48px' }}>
      
      {/* Header and Toggle Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={22} style={{ color: 'var(--accent-color)' }} />
            Görev Takvimi
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Tüm içerik ve görev planlamalarınızı takvim üzerinde görüntüleyin.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className={`btn ${!onlyMine ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setOnlyMine(false)}
            style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '10px' }}
          >
            Tüm Görevler
          </button>
          <button
            className={`btn ${onlyMine ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setOnlyMine(true)}
            style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '10px' }}
          >
            Sadece Benim Görevlerim
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <Clock className="animate-spin" size={36} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px' }}>
          {/* Calendar Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 12px', borderRadius: '10px' }}
              onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
              {monthNames[month]} {year}
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 12px', borderRadius: '10px' }}
              onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day Names Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {dayNames.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', padding: '6px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Cells Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {cells.map((cell, idx) => {
              const cellDateStr = getLocalDate(cell.date);
              const cellTasks = filteredTasks.filter(t => {
                const isSocial = t.category ? ['sosyal medya', 'reklam', 'post', 'viral', 'içerik'].some(word => t.category!.toLowerCase().includes(word)) : false;
                const startDate = isSocial ? (t.content_type === 'post' ? t.design_date : t.shooting_date) : t.start_date;
                const endDate = isSocial ? t.sharing_date : t.due_date;
                
                const dueDateFormatted = endDate ? endDate.slice(0, 10) : null;
                const startDateFormatted = startDate ? startDate.slice(0, 10) : null;
                const fallbackDate = t.created_at ? t.created_at.slice(0, 10) : null;
                return dueDateFormatted === cellDateStr || startDateFormatted === cellDateStr || (!dueDateFormatted && !startDateFormatted && fallbackDate === cellDateStr);
              });
              const isToday = cellDateStr === todayStr;
              const isSelected = getLocalDate(cell.date) === getLocalDate(selectedDate);

              return (
                <div
                  key={idx}
                  style={{
                    minHeight: isMobile ? '52px' : '100px',
                    borderRadius: '12px',
                    border: isSelected
                      ? '2.5px solid var(--accent-color)'
                      : (isToday
                          ? '2px dashed var(--accent-color)'
                          : '1px solid var(--border-glass)'),
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: cellTasks.length === 0
                      ? (isToday ? 'rgba(var(--accent-rgb, 255,159,10), 0.05)' : cell.isCurrentMonth ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)')
                      : (isSelected ? 'rgba(var(--accent-rgb, 255,159,10), 0.05)' : 'transparent'),
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onClick={() => {
                    setSelectedDate(cell.date);
                    if (cellTasks.length === 1 && !isMobile) {
                      openTaskEdit(cellTasks[0]);
                    }
                  }}
                >
                  {/* Day number */}
                  <span style={{
                    position: 'absolute',
                    top: isMobile ? '4px' : '6px',
                    right: isMobile ? '6px' : '8px',
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                    fontWeight: (isToday || isSelected) ? 900 : 700,
                    color: isToday ? 'var(--accent-color)' : (cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'),
                    zIndex: 2,
                  }}>
                    {cell.day}
                  </span>

                  {/* Tasks */}
                  {cellTasks.length > 0 && (
                    isMobile ? (
                      <div className="calendar-dots-container">
                        {cellTasks.slice(0, 3).map((t, ti) => (
                          <span 
                            key={ti} 
                            className="calendar-dot" 
                            style={{ backgroundColor: getStatusColor(t.status) }} 
                            title={t.title}
                          />
                        ))}
                        {cellTasks.length > 3 && (
                          <span style={{ fontSize: '0.5rem', fontWeight: 800, color: 'var(--text-muted)', lineHeight: 1 }}>+</span>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        width: '100%',
                        flex: 1,
                      }}>
                        {cellTasks.map((t, ti) => {
                          const color = getStatusColor(t.status);
                          return (
                            <div
                              key={ti}
                              onClick={(e) => { e.stopPropagation(); openTaskEdit(t); }}
                              title={t.title}
                              style={{
                                flex: 1,
                                backgroundColor: color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px 20px 6px 8px',
                                cursor: 'pointer',
                                borderTop: ti > 0 ? '1.5px solid rgba(255,255,255,0.15)' : 'none',
                                transition: 'opacity 0.1s'
                              }}
                            >
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                color: 'white',
                                textAlign: 'center',
                                textShadow: '0 1px -3px rgba(0,0,0,0.4)',
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: 1.2,
                              }}>
                                {t.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Color Legend */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', padding: '10px 0 0 0', borderTop: '1px solid var(--border-glass)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {[
              { color: '#6366f1', label: 'Yapılacak' },
              { color: '#3b82f6', label: 'Sürüyor' },
              { color: '#22c55e', label: 'Bitti' },
              { color: '#ea580c', label: 'Süresi Geçti Tekrar Yapılmalı' },
              { color: '#9333ea', label: 'Beklemede' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        {isMobile && selectedDate && (
          <div className="mobile-calendar-detail">
            <div className="mobile-calendar-detail-title">
              <span>{selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {filteredTasks.filter(t => {
                  const isSocial = t.category ? ['sosyal medya', 'reklam', 'post', 'viral', 'içerik'].some(word => t.category!.toLowerCase().includes(word)) : false;
                  const startDate = isSocial ? (t.content_type === 'post' ? t.design_date : t.shooting_date) : t.start_date;
                  const endDate = isSocial ? t.sharing_date : t.due_date;
                  const dueDateFormatted = endDate ? endDate.slice(0, 10) : null;
                  const startDateFormatted = startDate ? startDate.slice(0, 10) : null;
                  const fallbackDate = t.created_at ? t.created_at.slice(0, 10) : null;
                  return dueDateFormatted === getLocalDate(selectedDate) || startDateFormatted === getLocalDate(selectedDate) || (!dueDateFormatted && !startDateFormatted && fallbackDate === getLocalDate(selectedDate));
                }).length} Görev
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTasks.filter(t => {
                const isSocial = t.category ? ['sosyal medya', 'reklam', 'post', 'viral', 'içerik'].some(word => t.category!.toLowerCase().includes(word)) : false;
                const startDate = isSocial ? (t.content_type === 'post' ? t.design_date : t.shooting_date) : t.start_date;
                const endDate = isSocial ? t.sharing_date : t.due_date;
                const dueDateFormatted = endDate ? endDate.slice(0, 10) : null;
                const startDateFormatted = startDate ? startDate.slice(0, 10) : null;
                const fallbackDate = t.created_at ? t.created_at.slice(0, 10) : null;
                return dueDateFormatted === getLocalDate(selectedDate) || startDateFormatted === getLocalDate(selectedDate) || (!dueDateFormatted && !startDateFormatted && fallbackDate === getLocalDate(selectedDate));
              }).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Bugün için planlanmış bir görev bulunmuyor.
                </div>
              ) : (
                filteredTasks.filter(t => {
                  const isSocial = t.category ? ['sosyal medya', 'reklam', 'post', 'viral', 'içerik'].some(word => t.category!.toLowerCase().includes(word)) : false;
                  const startDate = isSocial ? (t.content_type === 'post' ? t.design_date : t.shooting_date) : t.start_date;
                  const endDate = isSocial ? t.sharing_date : t.due_date;
                  const dueDateFormatted = endDate ? endDate.slice(0, 10) : null;
                  const startDateFormatted = startDate ? startDate.slice(0, 10) : null;
                  const fallbackDate = t.created_at ? t.created_at.slice(0, 10) : null;
                  return dueDateFormatted === getLocalDate(selectedDate) || startDateFormatted === getLocalDate(selectedDate) || (!dueDateFormatted && !startDateFormatted && fallbackDate === getLocalDate(selectedDate));
                }).map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => openTaskEdit(task)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-glass)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(task.status) }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{task.title}</span>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-surface-accent)',
                      color: getStatusColor(task.status),
                      fontWeight: 700,
                      border: `1px solid ${getStatusColor(task.status)}30`
                    }}>
                      {task.status === 'completed' ? 'Tamamlandı' : task.status === 'in_progress' ? 'Sürüyor' : task.status === 'revision_required' ? 'Tekrar Yapılmalı' : 'Yapılacak'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </>
    )}

      {/* Task Edit Modal */}
      {selectedTask && (
        <div className="modal-backdrop" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800 }}>Görevi Düzenle</span>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleTaskEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Görev Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Görev adı..."
                  value={editTaskTitle}
                  onChange={e => setEditTaskTitle(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <textarea
                  placeholder="Açıklama..."
                  value={editTaskDesc}
                  onChange={e => setEditTaskDesc(e.target.value)}
                  className="form-input"
                  rows={3}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Durum</label>
                  <select
                    value={editTaskStatus}
                    onChange={e => setEditTaskStatus(e.target.value as CalendarTask['status'])}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="todo">Yapılacak</option>
                    <option value="in_progress">Sürüyor</option>
                    <option value="waiting">Beklemede</option>
                    <option value="completed">Bitti</option>
                    <option value="revision_required">Süresi Geçti Tekrar Yapılmalı</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Öncelik</label>
                  <select
                    value={editTaskPriority}
                    onChange={e => setEditTaskPriority(e.target.value as CalendarTask['priority'])}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="critical">🔴 Acil</option>
                    <option value="high">🟡 Önemli</option>
                    <option value="normal">🔵 Normal</option>
                    <option value="low">⚪ Acelesi Yok</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Kişi Ata</label>
                <select
                  value={editTaskAssignee}
                  onChange={e => setEditTaskAssignee(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">— Atanmamış —</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name || 'Kullanıcı'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTask.category && ['sosyal medya', 'reklam', 'post', 'viral', 'içerik'].some(word => selectedTask.category!.toLowerCase().includes(word)) ? (
                /* Social dates */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">
                      {selectedTask.content_type === 'post' ? 'Tasarım Tarihi' : 'Çekim Tarihi'}
                    </label>
                    <input
                      type="date"
                      value={selectedTask.content_type === 'post' ? editTaskDesignDate : editTaskShootingDate}
                      onChange={e => {
                        if (selectedTask.content_type === 'post') {
                          setEditTaskDesignDate(e.target.value);
                        } else {
                          setEditTaskShootingDate(e.target.value);
                        }
                      }}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Paylaşım Günü</label>
                    <input
                      type="date"
                      value={editTaskSharingDate}
                      onChange={e => setEditTaskSharingDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              ) : (
                /* Standard dates */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      value={editTaskStartDate}
                      onChange={e => setEditTaskStartDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bitiş Tarihi</label>
                    <input
                      type="date"
                      value={editTaskDueDate}
                      onChange={e => setEditTaskDueDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleTaskDelete}
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                >
                  Görevi Sil
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedTask(null)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Kaydet
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

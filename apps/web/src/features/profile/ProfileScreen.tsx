import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  AlertCircle,
  Camera,
  User as UserIcon,
  Lock,
  Save,
  Mail,
  Building,
  Bell,
  X,

  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface UserTask {
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
}

interface UserDailyUpdate {
  id: string;
  completed_today: string;
  ongoing_work?: string;
  tomorrow_plan: string;
  created_at: string;
  is_late: boolean;
  user_id: string;
  workspace_id: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface DailyUpdateComment {
  id: string;
  update_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string;
  };
}

export const ProfileScreen: React.FC = () => {
  const { user, activeWorkspace, role, updateUserProfile } = useAuth();
  const { pushSupported, pushEnabled, pushLoading, enablePush, disablePush } = useNotifications();
  
  const [fullName, setFullName] = useState<string>(() => {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return user?.user_metadata?.avatar_url || null;
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  const [isSavingName, setIsSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // Quiet hours states
  const [quietStart, setQuietStart] = useState<number>(23);
  const [quietEnd, setQuietEnd] = useState<number>(8);
  const [notifsEnabled, setNotifsEnabled] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  const [tasks, setTasks] = useState<UserTask[]>([]);

  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'my_tasks' | 'my_calendar'>('my_tasks');
  const [showEditModal, setShowEditModal] = useState(false);

  // Calendar navigation state
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Task click-to-edit modal states
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<UserTask['status']>('todo');
  const [editTaskPriority, setEditTaskPriority] = useState<UserTask['priority']>('normal');
  const [editTaskStartDate, setEditTaskStartDate] = useState<string>('');
  const [editTaskDueDate, setEditTaskDueDate] = useState<string>('');

  // Comment modal state
  const [commentUpdate, setCommentUpdate] = useState<UserDailyUpdate | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.user_metadata?.full_name || user?.user_metadata?.name) {
      setFullName(user.user_metadata.full_name || user.user_metadata.name);
    }
    if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
    }
  }, [user]);

  const loadUserData = async () => {
    if (!activeWorkspace?.id || !user) return;
    setLoading(true);
    try {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, start_date, due_date, completed_at, primary_assignee_id, created_by, created_at')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (taskData) {
        setTasks(taskData as UserTask[]);
      }



      // Load quiet hours and notification settings
      const { data: profileData } = await supabase
        .from('profiles')
        .select('notification_quiet_start, notification_quiet_end, notifications_enabled')
        .eq('id', user.id)
        .single();
      if (profileData) {
        setQuietStart(profileData.notification_quiet_start ?? 23);
        setQuietEnd(profileData.notification_quiet_end ?? 8);
        setNotifsEnabled(profileData.notifications_enabled ?? true);
      }
    } catch (err) {
      console.error('Fetch profile stats failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTaskTitle.trim()) return;
    try {
      const updates: any = {
        title: editTaskTitle.trim(),
        description: editTaskDesc.trim() || null,
        status: editTaskStatus,
        priority: editTaskPriority,
        start_date: editTaskStartDate || null,
        due_date: editTaskDueDate || null,
        completed_at: editTaskStatus === 'completed'
          ? (selectedTask.completed_at || new Date().toISOString())
          : null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('tasks').update(updates).eq('id', selectedTask.id);
      if (error) throw error;
      setSelectedTask(null);
      await loadUserData();
    } catch (err) {
      console.error('Update task failed:', err);
    }
  };

  const handleTaskDelete = async () => {
    if (!selectedTask) return;
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', selectedTask.id);
      if (error) throw error;
      setSelectedTask(null);
      await loadUserData();
    } catch (err) {
      console.error('Delete task failed:', err);
    }
  };

  const openTaskEdit = (task: UserTask) => {
    setSelectedTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskStatus(task.status);
    setEditTaskPriority(task.priority);
    setEditTaskStartDate(task.start_date || '');
    setEditTaskDueDate(task.due_date || '');
  };

  const getLocalDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getCalendarCells = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotal = new Date(year, month, 0).getDate();
    const cells: { day: number; date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = adjustedFirst - 1; i >= 0; i--) {
      const d = prevTotal - i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      cells.push({ day: d, date: new Date(py, pm, d), isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ day: d, date: new Date(year, month, d), isCurrentMonth: true });
    }
    const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
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
      case 'overdue': return '#f97316';
      case 'revision_required': return '#ef4444';
      case 'waiting': return '#a78bfa';
      default: return '#6366f1';
    }
  };


  useEffect(() => {
    loadUserData();
  }, [activeWorkspace, user]);

  // Handle Photo Upload to Supabase Storage ('avatars' bucket)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setPhotoFeedback({ success: false, message: 'Fotoğraf boyutu 5 MB\'tan küçük olmalıdır.' });
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoFeedback(null);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save avatar_url to Auth user_metadata and DB profile
      const ok = await updateUserProfile({ avatarUrl: publicUrl });
      if (ok) {
        setAvatarUrl(publicUrl);
        setPhotoFeedback({ success: true, message: 'Profil fotoğrafınız başarıyla yüklendi!' });
      } else {
        setPhotoFeedback({ success: false, message: 'Fotoğraf kaydedilirken bir sorun oluştu.' });
      }
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setPhotoFeedback({ success: false, message: err.message || 'Fotoğraf yüklenemedi.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle Full Name Save
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsSavingName(true);
    setNameFeedback(null);

    const ok = await updateUserProfile({ fullName: fullName.trim() });
    setIsSavingName(false);

    if (ok) {
      setNameFeedback({ success: true, message: 'Ad soyad bilgisi başarıyla güncellendi!' });
    } else {
      setNameFeedback({ success: false, message: 'Güncelleme başarısız oldu.' });
    }
  };

  // Handle Password Update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 6) {
      setPasswordFeedback({ success: false, message: 'Parola en az 6 karakter olmalıdır.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ success: false, message: 'Parolalar birbiriyle eşleşmiyor.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordFeedback({ success: true, message: 'Parolanız başarıyla güncellendi!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password update failed:', err);
      setPasswordFeedback({ success: false, message: err.message || 'Parola güncellenemedi.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Quiet Hours and General Notification Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_quiet_start: quietStart,
          notification_quiet_end: quietEnd,
          notifications_enabled: notifsEnabled,
        })
        .eq('id', user.id);
      if (error) throw error;
      setSettingsFeedback({ success: true, message: 'Bildirim ayarlarınız başarıyla güncellendi!' });
    } catch (err: any) {
      console.error('Save notification settings failed:', err);
      setSettingsFeedback({ success: false, message: err.message || 'Ayarlar kaydedilemedi.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const myTasks = tasks.filter(t => !t.primary_assignee_id || t.primary_assignee_id === user?.id || t.created_by === user?.id);
  const myCompletedCount = myTasks.filter(t => t.status === 'completed').length;
  const myActiveCount = myTasks.filter(t => t.status !== 'completed').length;




  const statusLabels: Record<string, { title: string; color: string }> = {
    in_progress: { title: 'Sürüyor', color: '#f59e0b' },
    todo: { title: 'Yapılacak', color: '#38bdf8' },
    waiting: { title: 'Beklemede', color: '#f97316' },
    completed: { title: 'Bitti', color: '#10b981' },
    revision_required: { title: 'Tekrar Yapılıyor', color: '#a78bfa' },
  };

  const displayName = fullName.trim() || user?.email?.split('@')[0] || 'Kullanıcı';
  const userInitials = displayName.substring(0, 2).toUpperCase();
  const userRoleDisplay = activeWorkspace?.permissionRole || role || 'Personel';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', paddingBottom: '48px' }}>
      
      {/* Profile Top Hero Card */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          
          {/* Avatar Sphere with Supabase Storage File Picker */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color)',
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: '1.8rem',
                boxShadow: '0 8px 24px rgba(183, 1, 22, 0.25)',
                position: 'relative',
                cursor: 'pointer',
                border: '3px solid var(--bg-surface)',
                overflow: 'hidden'
              }}
              title="Profil Fotoğrafını Değiştir"
            >
              {!avatarUrl && userInitials}

              {/* Camera Icon Overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(4px)',
                padding: '4px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.7rem'
              }}>
                {isUploadingPhoto ? <RefreshCw className="animate-spin" size={14} /> : <Camera size={14} />}
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoSelect} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>

          {/* User Meta Info */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {displayName}
              </h2>
              <span className="badge" style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(183, 1, 22, 0.12)',
                color: 'var(--accent-color)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ShieldCheck size={14} />
                {userRoleDisplay.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                {user?.email}
              </span>
              {activeWorkspace && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={14} style={{ color: 'var(--accent-color)' }} />
                  Ekip: <strong>{activeWorkspace.name}</strong>
                </span>
              )}
            </div>
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={() => setShowEditModal(true)}
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <UserIcon size={15} />
            <span>Profili Düzenle</span>
          </button>
        </div>

        {photoFeedback && (
          <div className={`alert ${photoFeedback.success ? 'alert-success' : 'alert-danger'}`} style={{
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            backgroundColor: photoFeedback.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: photoFeedback.success ? '#10b981' : '#ef4444',
            border: photoFeedback.success ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
          }}>
            {photoFeedback.message}
          </div>
        )}

        {/* Stats Summary Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          backgroundColor: 'var(--bg-surface-accent)',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {myTasks.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Toplam Görev
            </div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-glass)', borderRight: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-success)' }}>
              {myCompletedCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Tamamlanan
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-color)' }}>
              {myActiveCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Aktif Görev
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-x" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', paddingRight: '16px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button
          className={`btn ${activeSubTab === 'my_tasks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('my_tasks')}
          style={{ fontSize: '0.82rem', padding: '8px 16px', borderRadius: '12px', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          <CheckCircle2 size={15} />
          <span>Görevlerim ({myTasks.length})</span>
        </button>

        <button
          className={`btn ${activeSubTab === 'my_calendar' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('my_calendar')}
          style={{ fontSize: '0.82rem', padding: '8px 16px', borderRadius: '12px', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          <Calendar size={15} />
          <span>Görev Takvimi</span>
        </button>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : activeSubTab === 'my_tasks' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {myTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <AlertCircle size={36} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Henüz eklenmiş bir görev bulunmuyor.</p>
            </div>
          ) : (
            myTasks.map((task) => {
              const statusInfo = statusLabels[task.status] || { title: task.status, color: '#94a3b8' };
              return (
                <div
                  key={task.id}
                  onClick={() => openTaskEdit(task)}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    {task.priority === 'critical' ? (
                      <span
                        title="Acil"
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          display: 'inline-block'
                        }}
                      />
                    ) : task.priority === 'high' ? (
                      <span className="badge badge-high" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
                        Önemli
                      </span>
                    ) : (
                      <span className="badge badge-normal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block' }} />
                        Acelesi Yok
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      backgroundColor: `${statusInfo.color}18`,
                      color: statusInfo.color
                    }}>
                      {statusInfo.title}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {task.title}
                  </div>

                  {task.description && (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {task.description}
                    </p>
                  )}

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={12} />
                      {task.start_date ? new Date(task.start_date).toLocaleDateString('tr-TR') : new Date(task.created_at).toLocaleDateString('tr-TR')}
                    </span>
                    {task.due_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f97316' }}>
                        → {new Date(task.due_date).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                    {task.completed_at && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#22c55e' }}>
                        ✓ {new Date(task.completed_at).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Calendar View */
        (() => {
          const year = calendarDate.getFullYear();
          const month = calendarDate.getMonth();
          const cells = getCalendarCells(year, month);
          const todayStr = getLocalDate(new Date());
          const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
          const dayNames = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Calendar Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', borderRadius: '10px' }}
                  onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {monthNames[month]} {year}
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', borderRadius: '10px' }}
                  onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {dayNames.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {cells.map((cell, idx) => {
                  const cellDateStr = getLocalDate(cell.date);
                  const cellTasks = tasks.filter(t => {
                    const dueDate = t.due_date ? t.due_date.slice(0, 10) : null;
                    const startDate = t.start_date ? t.start_date.slice(0, 10) : null;
                    const fallbackDate = t.created_at ? t.created_at.slice(0, 10) : null;
                    return dueDate === cellDateStr || startDate === cellDateStr || (!dueDate && !startDate && fallbackDate === cellDateStr);
                  });
                  const isToday = cellDateStr === todayStr;

                  return (
                    <div
                      key={idx}
                      style={{
                        minHeight: '90px',
                        borderRadius: '8px',
                        border: isToday
                          ? '2px solid var(--accent-color)'
                          : '1px solid var(--border-glass)',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: cellTasks.length === 0
                          ? (isToday ? 'rgba(183,1,22,0.07)' : cell.isCurrentMonth ? 'var(--bg-surface)' : 'var(--bg-surface-accent)')
                          : 'transparent',
                        cursor: cellTasks.length === 1 ? 'pointer' : 'default',
                      }}
                      onClick={cellTasks.length === 1 ? () => openTaskEdit(cellTasks[0]) : undefined}
                    >
                      {/* Day number — always top right as overlay */}
                      <span style={{
                        position: 'absolute',
                        top: '5px',
                        right: '7px',
                        fontSize: '0.72rem',
                        fontWeight: isToday ? 800 : 600,
                        color: cellTasks.length > 0 ? 'rgba(255,255,255,0.85)' : (isToday ? 'var(--accent-color)' : cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'),
                        zIndex: 2,
                        lineHeight: 1,
                        textShadow: cellTasks.length > 0 ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                      }}>
                        {cell.day}
                      </span>

                      {/* Tasks — each fills an equal band */}
                      {cellTasks.length > 0 && (
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
                                onClick={cellTasks.length > 1 ? (e) => { e.stopPropagation(); openTaskEdit(t); } : undefined}
                                title={t.title}
                                style={{
                                  flex: 1,
                                  backgroundColor: color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '4px 20px 4px 8px',
                                  cursor: 'pointer',
                                  borderTop: ti > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                                }}
                              >
                                <span style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  color: 'white',
                                  textAlign: 'center',
                                  textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  lineHeight: 1.3,
                                }}>
                                  {t.title}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Color legend */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '8px 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {[
                  { color: '#6366f1', label: 'Yapılacak' },
                  { color: '#3b82f6', label: 'Yapılıyor' },
                  { color: '#22c55e', label: 'Bitti' },
                  { color: '#f97316', label: 'Tarihi Geçti' },
                  { color: '#ef4444', label: 'Revizyon' },
                  { color: '#a78bfa', label: 'Beklemede' },
                ].map(item => (
                  <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: item.color, display: 'inline-block' }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })()
      )}


      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '640px', width: '96%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800 }}>Profili Düzenle</span>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {/* Profile Name & Meta Settings Form */}
              <div style={{
                backgroundColor: 'var(--bg-surface-accent)',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                  <UserIcon size={16} style={{ color: 'var(--accent-color)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Profil Bilgilerini Düzenle</h4>
                </div>

                {nameFeedback && (
                  <div className={`alert ${nameFeedback.success ? 'alert-success' : 'alert-danger'}`} style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: nameFeedback.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: nameFeedback.success ? '#10b981' : '#ef4444',
                  }}>
                    {nameFeedback.message}
                  </div>
                )}

                <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Ad Soyad</label>
                    <input
                      type="text"
                      required
                      placeholder="Ad Soyad..."
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-posta (Salt Okunur)</label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="form-input"
                      style={{ opacity: 0.7, cursor: 'not-allowed', padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rolünüz</label>
                    <input
                      type="text"
                      disabled
                      value={userRoleDisplay}
                      className="form-input"
                      style={{ opacity: 0.7, cursor: 'not-allowed', padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isSavingName} style={{ padding: '8px 14px', fontSize: '0.82rem', marginTop: '4px' }}>
                    {isSavingName ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                    <span>Bilgileri Kaydet</span>
                  </button>
                </form>
              </div>

              {/* Password Security Form */}
              <div style={{
                backgroundColor: 'var(--bg-surface-accent)',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                  <Lock size={16} style={{ color: 'var(--accent-color)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Parolayı Yenile</h4>
                </div>

                {passwordFeedback && (
                  <div className={`alert ${passwordFeedback.success ? 'alert-success' : 'alert-danger'}`} style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: passwordFeedback.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: passwordFeedback.success ? '#10b981' : '#ef4444',
                  }}>
                    {passwordFeedback.message}
                  </div>
                )}

                <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Yeni Parola</label>
                    <input
                      type="password"
                      required
                      placeholder="Yeni parola girin..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parola Tekrar</label>
                    <input
                      type="password"
                      required
                      placeholder="Yeniden girin..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary" disabled={isUpdatingPassword} style={{ padding: '8px 14px', fontSize: '0.82rem', marginTop: '4px' }}>
                    {isUpdatingPassword ? <RefreshCw className="animate-spin" size={14} /> : <Lock size={14} />}
                    <span>Parolayı Güncelle</span>
                  </button>
                </form>
              </div>

              {/* Web Push & Quiet Hours Notifications Card */}
              <div style={{
                backgroundColor: 'var(--bg-surface-accent)',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                  <Bell size={16} style={{ color: 'var(--accent-color)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Bildirim ve Sessiz Saat Ayarları</h4>
                </div>

                {settingsFeedback && (
                  <div className={`alert ${settingsFeedback.success ? 'alert-success' : 'alert-danger'}`} style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: settingsFeedback.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: settingsFeedback.success ? '#10b981' : '#ef4444',
                  }}>
                    {settingsFeedback.message}
                  </div>
                )}

                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Bildirimleri Etkinleştir</span>
                    <input 
                      type="checkbox" 
                      checked={notifsEnabled} 
                      onChange={(e) => setNotifsEnabled(e.target.checked)} 
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Başlangıç</label>
                      <select 
                        value={quietStart} 
                        onChange={(e) => setQuietStart(parseInt(e.target.value))}
                        className="form-input"
                        disabled={!notifsEnabled}
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Bitiş</label>
                      <select 
                        value={quietEnd} 
                        onChange={(e) => setQuietEnd(parseInt(e.target.value))}
                        className="form-input"
                        disabled={!notifsEnabled}
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={savingSettings} style={{ padding: '8px 14px', fontSize: '0.82rem', marginTop: '4px' }}>
                    {savingSettings ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                    <span>Ayarları Kaydet</span>
                  </button>
                </form>

                <div style={{ height: '1px', backgroundColor: 'var(--border-glass)', margin: '4px 0' }} />

                {!pushSupported ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Tarayıcınız anlık bildirimleri desteklemiyor.</p>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-glass)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Push Bildirimler</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{pushEnabled ? 'Etkin' : 'Pasif'}</span>
                    </div>
                    <button
                      type="button"
                      className={`btn ${pushEnabled ? 'btn-secondary' : 'btn-primary'}`}
                      disabled={pushLoading}
                      onClick={pushEnabled ? disablePush : enablePush}
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      {pushEnabled ? 'Kapat' : 'Aç'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Task Edit Modal */}
      {selectedTask && (
        <div className="modal-backdrop" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Görevi Düzenle</span>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleTaskEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    onChange={e => setEditTaskStatus(e.target.value as UserTask['status'])}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="todo">Yapılacak</option>
                    <option value="in_progress">Yapılıyor</option>
                    <option value="waiting">Beklemede</option>
                    <option value="completed">Bitti</option>
                    <option value="revision_required">Tekrar Yapılacak</option>
                    <option value="overdue">Tarihi Geçti</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Öncelik</label>
                  <select
                    value={editTaskPriority}
                    onChange={e => setEditTaskPriority(e.target.value as UserTask['priority'])}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="low">Acelesi Yok</option>
                    <option value="normal">Normal</option>
                    <option value="high">Önemli</option>
                    <option value="critical">Acil</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={editTaskStartDate}
                    onChange={e => setEditTaskStartDate(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Son Tarih</label>
                  <input
                    type="date"
                    value={editTaskDueDate}
                    onChange={e => setEditTaskDueDate(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '10px', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleTaskDelete}
                  style={{ padding: '8px 16px' }}
                >
                  Sil
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedTask(null)}>Kapat</button>
                  <button type="submit" className="btn btn-primary">Kaydet</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {commentUpdate && (
        <CommentModal update={commentUpdate} onClose={() => setCommentUpdate(null)} />
      )}
    </div>
  );
};

// ─── Manager Comment Modal for Profile ──────────────────────────────────────────
const CommentModal: React.FC<{
  update: UserDailyUpdate;
  onClose: () => void;
}> = ({ update, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<DailyUpdateComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('daily_update_comments')
      .select('*, profile:user_id(full_name)')
      .eq('update_id', update.id)
      .order('created_at', { ascending: true });
    setComments((data as unknown as DailyUpdateComment[]) || []);
  }, [update.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      await supabase.from('daily_update_comments').insert({
        update_id: update.id,
        user_id: user.id,
        content: newComment.trim(),
      });
      setNewComment('');
      loadComments();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Yorumlar — {update.profile?.full_name || user?.user_metadata?.full_name || 'Üye'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
          {comments.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem', padding: '16px' }}>Henüz yorum yok.</p>
          )}
          {comments.map(c => (
            <div key={c.id} style={{
              backgroundColor: 'var(--bg-surface-accent)', padding: '10px 14px',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '3px' }}>
                {(c.profile as any)?.full_name || 'Kullanıcı'}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
                  {new Date(c.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem' }}>{c.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Yorum ekle..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" type="submit" disabled={submitting || !newComment.trim()} style={{ padding: '8px 14px' }}>
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : 'Ekle'}
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  RefreshCw,
  AlertCircle,
  Camera,
  User as UserIcon,
  Lock,
  Save,
  Bell,
  X,
  Link as LinkIcon,
  Clock
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
  workspace?: { id: string; name: string } | null;
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
  const [connectionCount, setConnectionCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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
        .eq('primary_assignee_id', user.id)
        .is('deleted_at', null)
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'overdue')
        .not('due_date', 'is', null)
        .lt('due_date', effectiveDateStr);

      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, start_date, due_date, completed_at, primary_assignee_id, created_by, created_at, workspace:workspaces(id, name)')
        .eq('primary_assignee_id', user.id)
        .order('created_at', { ascending: false });

      if (taskData) {
        setTasks((taskData as unknown) as UserTask[]);
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

      // Load connection count
      const { count: connCount, error: connError } = await supabase
        .from('user_connections')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
      if (!connError && connCount !== null) {
        setConnectionCount(connCount);
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

  const myTasks = tasks;




  const statusLabels: Record<string, { title: string; color: string }> = {
    in_progress: { title: 'Sürüyor', color: '#f59e0b' },
    todo: { title: 'Yapılacak', color: '#38bdf8' },
    waiting: { title: 'Beklemede', color: '#9333ea' },
    completed: { title: 'Bitti', color: '#10b981' },
    revision_required: { title: 'Süresi Geçti Tekrar Yapılmalı', color: '#ea580c' },
    overdue: { title: 'Süresi Geçti Tekrar Yapılmalı', color: '#ea580c' },
  };

  const displayName = fullName.trim() || user?.email?.split('@')[0] || 'Kullanıcı';
  const userInitials = displayName.substring(0, 2).toUpperCase();
  const userRoleDisplay = activeWorkspace?.permissionRole || role || 'Personel';
  const isOwner = user?.email === 'resulkilic16@gmail.com';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', paddingBottom: '48px' }}>
      
      {/* Profile Top Hero Card (Social Media Style) */}
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
        {/* Top row: Avatar & Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          {/* Avatar Sphere with Story Ring & File Picker */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                padding: '3px',
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                cursor: 'pointer',
              }}
              title="Profil Fotoğrafını Değiştir"
            >
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface)',
                border: '2px solid var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'var(--text-primary)',
                fontWeight: 800,
                fontSize: '1.8rem',
              }}>
                {!avatarUrl && userInitials}
                
                {/* Camera Icon Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  backdropFilter: 'blur(4px)',
                  padding: '2px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {isUploadingPhoto ? <RefreshCw className="animate-spin" size={12} /> : <Camera size={12} />}
                </div>
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

          {/* Social Stats (Right) */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', textAlign: 'center', maxWidth: '300px' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{myTasks.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>görev</div>
            </div>
            {isOwner ? (
              <>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>97</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>takipçi</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>126</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>takip</div>
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{connectionCount}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>bağlantı</div>
              </div>
            )}
          </div>
        </div>

        {/* Bio & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {displayName} <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 500, backgroundColor: 'rgba(var(--accent-rgb, 255,159,10), 0.1)', padding: '2px 8px', borderRadius: '12px' }}>{userRoleDisplay}</span>
          </h2>
          {isOwner ? (
            <>
              <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                AI • Pazarlama • Girişimcilik<br/>
                <span style={{ color: '#3b82f6' }}>@resultankilic @kampuskapinda</span><br/>
                İçerik-Reklam Stratejileri<br/>
                Girişim Ekosistemime Katıl 👇
              </p>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>
                <LinkIcon size={14} /> tancorelab.vercel.app ve 4 diğer
              </a>
            </>
          ) : (
            <div style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {user?.email}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button 
            onClick={() => setShowEditModal(true)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-accent)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            Profili düzenle
          </button>
          <button 
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-accent)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            Bağlantılarım
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
      </div>

      {/* Main View Area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : (
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
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                    flexWrap: 'wrap'
                  }}
                >
                  {/* Workspace Tag (Leftmost) */}
                  <div style={{ flexShrink: 0, width: '130px', display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      backgroundColor: task.workspace?.id 
                        ? `hsl(${parseInt(task.workspace.id.substring(0,8), 16) % 360}, 70%, 90%)` 
                        : '#e2e8f0',
                      color: task.workspace?.id
                        ? `hsl(${parseInt(task.workspace.id.substring(0,8), 16) % 360}, 80%, 30%)`
                        : '#475569',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%'
                    }} title={task.workspace?.name}>
                      {task.workspace?.name || 'Bilinmeyen Grup'}
                    </span>
                  </div>

                  {/* Left: Priority dot + Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 200px', minWidth: 0 }}>
                    <span
                      title={task.priority === 'critical' ? 'Acil' : task.priority === 'high' ? 'Önemli' : 'Acelesi Yok'}
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f59e0b' : '#3b82f6',
                        flexShrink: 0
                      }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={task.title}>
                      {task.title}
                    </span>
                  </div>

                  {/* Middle: Description */}
                  <div style={{ flex: '2 2 250px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.description ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {task.description}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Açıklama yok</span>
                    )}
                  </div>

                  {/* Right: Dates + Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, marginLeft: 'auto' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                      <span>
                        {task.start_date ? new Date(task.start_date).toLocaleDateString('tr-TR') : new Date(task.created_at).toLocaleDateString('tr-TR')}
                      </span>
                      {task.due_date && (
                        <span style={{ color: '#f97316', fontWeight: 600 }}>
                          ➔ {new Date(task.due_date).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                      {task.completed_at && (
                        <span style={{ color: '#22c55e', fontWeight: 600 }}>
                          ✓ {new Date(task.completed_at).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>

                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      backgroundColor: `${statusInfo.color}18`,
                      color: statusInfo.color,
                      whiteSpace: 'nowrap'
                    }}>
                      {statusInfo.title}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
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

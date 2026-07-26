import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
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
  MessageSquare
} from 'lucide-react';

interface UserTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'waiting' | 'completed' | 'revision_required';
  priority: 'critical' | 'high' | 'normal' | 'low';
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
  const [dailyUpdates, setDailyUpdates] = useState<UserDailyUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'my_tasks' | 'my_updates'>('my_tasks');
  const [showEditModal, setShowEditModal] = useState(false);

  // Report Edit modal states
  const [showReportEditModal, setShowReportEditModal] = useState(false);
  const [editingReportUpdate, setEditingReportUpdate] = useState<UserDailyUpdate | null>(null);
  const [editSelectedTask, setEditSelectedTask] = useState('');
  const [editCustomTaskNote, setEditCustomTaskNote] = useState('');
  const [editReportDetail, setEditReportDetail] = useState('');
  const [editReportStatus, setEditReportStatus] = useState<'completed' | 'started' | 'ongoing'>('ongoing');
  const [reportSubmitting, setReportSubmitting] = useState(false);

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
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (taskData) {
        setTasks(taskData as UserTask[]);
      }

      const { data: updateData } = await supabase
        .from('daily_updates')
        .select('*, profile:user_id(full_name, avatar_url)')
        .eq('workspace_id', activeWorkspace.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (updateData) {
        setDailyUpdates(updateData as UserDailyUpdate[]);
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

  const handleReportEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReportUpdate || !editReportDetail.trim()) return;

    setReportSubmitting(true);
    try {
      const matchedTask = editSelectedTask === '__other__' 
        ? (editCustomTaskNote.trim() || 'Diğer') 
        : (editSelectedTask || 'Belirtilmemiş');

      const { error } = await supabase
        .from('daily_updates')
        .update({
          completed_today: editReportDetail.trim(),
          ongoing_work: matchedTask,
          tomorrow_plan: editReportStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingReportUpdate.id);

      if (error) throw error;
      setShowReportEditModal(false);
      await loadUserData();
    } catch (err) {
      console.error('Update daily update failed:', err);
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleReportDelete = async () => {
    if (!editingReportUpdate) return;
    if (!window.confirm("Bu raporu silmek istediğinize emin misiniz?")) return;

    setReportSubmitting(true);
    try {
      const { error } = await supabase
        .from('daily_updates')
        .delete()
        .eq('id', editingReportUpdate.id);

      if (error) throw error;
      setShowReportEditModal(false);
      await loadUserData();
    } catch (err) {
      console.error('Delete daily update failed:', err);
    } finally {
      setReportSubmitting(false);
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

  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;



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
              {tasks.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Toplam Görev
            </div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-glass)', borderRight: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-success)' }}>
              {completedTasksCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Tamamlanan
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-color)' }}>
              {dailyUpdates.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Günlük Rapor
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
          <span>Görevlerim ({tasks.length})</span>
        </button>

        <button
          className={`btn ${activeSubTab === 'my_updates' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('my_updates')}
          style={{ fontSize: '0.82rem', padding: '8px 16px', borderRadius: '12px', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          <FileText size={15} />
          <span>Raporlarım ({dailyUpdates.length})</span>
        </button>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : activeSubTab === 'my_tasks' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <AlertCircle size={36} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Henüz eklenmiş bir görev bulunmuyor.</p>
            </div>
          ) : (
            tasks.map((task) => {
              const statusInfo = statusLabels[task.status] || { title: task.status, color: '#94a3b8' };
              return (
                <div key={task.id} style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
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

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <Clock size={12} />
                    <span>{new Date(task.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Daily updates sub-tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {dailyUpdates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <FileText size={36} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Henüz gönderilmiş bir günlük raporunuz yok.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              {dailyUpdates.map(update => (
                <div 
                  key={update.id} 
                  onClick={() => {
                    setEditingReportUpdate(update);
                    const hasTask = tasks.some(t => t.title === update.ongoing_work);
                    setEditSelectedTask(hasTask ? (update.ongoing_work || '') : (update.ongoing_work ? '__other__' : ''));
                    setEditCustomTaskNote(hasTask ? '' : (update.ongoing_work || ''));
                    setEditReportDetail(update.completed_today);
                    setEditReportStatus(update.tomorrow_plan as any || 'ongoing');
                    setShowReportEditModal(true);
                  }}
                  style={{
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-glass)',
                    padding: '16px 20px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    flexWrap: 'wrap',
                    cursor: 'pointer'
                  }}
                  title="Rapor Detayları & Düzenle"
                >
                  {/* Part 1: İsim & Tarih */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    flex: '0 0 auto', 
                    minWidth: '160px',
                    justifyContent: 'flex-start'
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: 'var(--accent-color)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 800, flexShrink: 0
                    }}>
                      {(update.profile?.full_name || user?.user_metadata?.full_name || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {update.profile?.full_name || user?.user_metadata?.full_name || 'Ekip Üyesi'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(update.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Part 2: Eşleşen Görev */}
                  <div style={{ 
                    flex: '1 1 180px', 
                    fontSize: '0.85rem', 
                    color: 'var(--text-primary)',
                    fontWeight: 500
                  }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 700 }}>EŞLEŞEN GÖREV</span>
                    {update.ongoing_work || 'Diğer / Belirtilmemiş'}
                  </div>

                  {/* Part 3: Yaptığı Şey (En Uzun Kısım) */}
                  <div style={{ 
                    flex: '2 1 280px', 
                    fontSize: '0.85rem', 
                    color: 'var(--text-primary)', 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4'
                  }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 700 }}>BUGÜN NELER YAPTI</span>
                    {update.completed_today}
                  </div>

                  {/* Part 4: Raporun Rengi (Durum) */}
                  {(() => {
                    const statusVal = update.tomorrow_plan;
                    let color = '#f97316';
                    let text = 'Sürüyor';
                    if (statusVal === 'completed') {
                      color = '#22c55e';
                      text = 'Bitirildi';
                    } else if (statusVal === 'started') {
                      color = '#3b82f6';
                      text = 'Başlandı';
                    }
                    return (
                      <div style={{ 
                        flex: '0 0 auto', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: `${color}15`,
                        border: `1px solid ${color}35`,
                        color: color,
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
                        {text}
                      </div>
                    );
                  })()}

                  {/* Far Right: Yorum Butonu ("Yönetici Yorumu") */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCommentUpdate(update);
                    }}
                    className="btn btn-secondary"
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '0.75rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      flexShrink: 0
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>Yönetici Yorumu</span>
                  </button>
                </div>
              ))}
            </div>
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
      {/* Edit/Detail Report Modal */}
      {showReportEditModal && editingReportUpdate && (
        <div className="modal-backdrop" onClick={() => setShowReportEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Rapor Detayları & Düzenle</span>
              <button onClick={() => setShowReportEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleReportEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Eşleşen Görev</label>
                <select 
                  value={editSelectedTask} 
                  onChange={e => {
                    setEditSelectedTask(e.target.value);
                    if (e.target.value !== '__other__') {
                      setEditCustomTaskNote('');
                    }
                  }} 
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">Görev Seçin...</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.title}>{t.title}</option>
                  ))}
                  <option value="__other__">Diğer (Not Ekle)</option>
                </select>
              </div>

              {editSelectedTask === '__other__' && (
                <div className="form-group">
                  <label className="form-label">Not / İş Tanımı *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Yaptığınız iş veya konu..." 
                    value={editCustomTaskNote} 
                    onChange={e => setEditCustomTaskNote(e.target.value)} 
                    className="form-input" 
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Bugün Neler Yaptım (Yapılan İşin Detayı) *</label>
                <textarea 
                  required 
                  placeholder="Bugün yaptığın işin detaylı açıklaması..." 
                  value={editReportDetail} 
                  onChange={e => setEditReportDetail(e.target.value)} 
                  className="form-input" 
                  rows={4} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">İş Durumu / Raporun Rengi</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="editReportStatus" 
                      value="completed" 
                      checked={editReportStatus === 'completed'} 
                      onChange={() => setEditReportStatus('completed')} 
                    />
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>Bitirildi (Yeşil)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="editReportStatus" 
                      value="started" 
                      checked={editReportStatus === 'started'} 
                      onChange={() => setEditReportStatus('started')} 
                    />
                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>Başlandı (Mavi)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="editReportStatus" 
                      value="ongoing" 
                      checked={editReportStatus === 'ongoing'} 
                      onChange={() => setEditReportStatus('ongoing')} 
                    />
                    <span style={{ color: '#f97316', fontWeight: 700 }}>Sürüyor (Turuncu)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '10px', justifyContent: 'space-between' }}>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleReportDelete}
                  style={{ padding: '8px 16px' }}
                >
                  Sil
                </button>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReportEditModal(false)}>Kapat</button>
                  <button type="submit" className="btn btn-primary" disabled={reportSubmitting}>
                    {reportSubmitting ? <RefreshCw className="animate-spin" size={16} /> : 'Kaydet'}
                  </button>
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

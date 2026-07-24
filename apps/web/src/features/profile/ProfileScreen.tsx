import React, { useState, useEffect, useRef } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
  RefreshCw,
  Calendar,
  AlertCircle,
  Camera,
  User as UserIcon,
  Lock,
  Upload,
  Save,
  Mail,
  Building,
  Bell,
  BellOff
} from 'lucide-react';

interface UserTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'waiting' | 'completed';
  priority: 'critical' | 'high' | 'normal' | 'low';
  created_at: string;
}

interface UserDailyUpdate {
  id: string;
  today_summary: string;
  tomorrow_plan: string;
  created_at: string;
  is_late: boolean;
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

  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<UserDailyUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'my_tasks' | 'my_updates' | 'settings'>('settings');

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
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (updateData) {
        setDailyUpdates(updateData as UserDailyUpdate[]);
      }
    } catch (err) {
      console.error('Fetch profile stats failed:', err);
    } finally {
      setLoading(false);
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

  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;

  const priorityLabels: Record<string, string> = {
    critical: 'Acil',
    high: 'Önemli',
    normal: 'Normal',
    low: 'Acil Değil',
  };

  const statusLabels: Record<string, { title: string; color: string }> = {
    todo: { title: 'Yapılacak', color: '#38bdf8' },
    in_progress: { title: 'Sürüyor', color: '#f59e0b' },
    waiting: { title: 'Bekliyor', color: '#f97316' },
    completed: { title: 'Bitti', color: '#10b981' },
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
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <Upload size={15} />
            <span>Fotoğraf Yükle</span>
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

      {/* Navigation Sub-Tabs */}
      <div className="scroll-x" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', paddingRight: '16px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button
          className={`btn ${activeSubTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('settings')}
          style={{ fontSize: '0.82rem', padding: '8px 16px', borderRadius: '12px', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          <UserIcon size={15} />
          <span>Profil & Düzenle</span>
        </button>

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
      ) : activeSubTab === 'settings' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          
          {/* Profile Name & Meta Settings Form */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <UserIcon size={18} style={{ color: 'var(--accent-color)' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Profil Bilgilerini Düzenle</h3>
            </div>

            {nameFeedback && (
              <div className={`alert ${nameFeedback.success ? 'alert-success' : 'alert-danger'}`} style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                backgroundColor: nameFeedback.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: nameFeedback.success ? '#10b981' : '#ef4444',
              }}>
                {nameFeedback.message}
              </div>
            )}

            <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Ad Soyad</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-posta (Salt Okunur)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="form-input"
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rolünüz</label>
                <input
                  type="text"
                  disabled
                  value={userRoleDisplay}
                  className="form-input"
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSavingName} style={{ marginTop: '8px' }}>
                {isSavingName ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                <span>Ad Soyadı Kaydet</span>
              </button>
            </form>
          </div>

          {/* Password Security Form */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <Lock size={18} style={{ color: 'var(--accent-color)' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Parola Yenile</h3>
            </div>

            {passwordFeedback && (
              <div className={`alert ${passwordFeedback.success ? 'alert-success' : 'alert-danger'}`} style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                backgroundColor: passwordFeedback.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: passwordFeedback.success ? '#10b981' : '#ef4444',
              }}>
                {passwordFeedback.message}
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Yeni Parola</label>
                <input
                  type="password"
                  required
                  placeholder="En az 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Yeni Parola (Tekrar)</label>
                <input
                  type="password"
                  required
                  placeholder="Parolanızı tekrar girin"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-secondary" disabled={isUpdatingPassword} style={{ marginTop: '8px' }}>
                {isUpdatingPassword ? <RefreshCw className="animate-spin" size={16} /> : <Lock size={16} />}
                <span>Parolayı Güncelle</span>
              </button>
            </form>
          </div>

          {/* Web Push Notifications Card */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <Bell size={18} style={{ color: 'var(--accent-color)' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Anlık Bildirim Ayarları</h3>
            </div>

            {!pushSupported ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Tarayıcınız veya ortamınız anlık bildirimleri desteklemiyor (VAPID anahtarı eksik veya tarayıcı Push API desteği yok).
                </p>
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <AlertCircle size={14} />
                  <span>Push API desteği bulunamadı veya VAPID yapılandırılmamış.</span>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Yeni bir görev atandığında, günlük rapor süresi yaklaştığında veya ekibe katılım daveti aldığınızda anlık tarayıcı bildirimleri alın.
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: 'var(--bg-surface-accent)',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '4px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {pushEnabled ? 'Bildirimler Etkin' : 'Bildirimler Devre Dışı'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {pushEnabled ? 'Bu tarayıcıdan anlık mesaj alıyorsunuz' : 'İzin vererek bildirim almaya başlayın'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`btn ${pushEnabled ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={pushLoading}
                    onClick={pushEnabled ? disablePush : enablePush}
                    style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {pushLoading ? (
                      <RefreshCw className="animate-spin" size={14} />
                    ) : pushEnabled ? (
                      <>
                        <BellOff size={14} />
                        <span>Kapat</span>
                      </>
                    ) : (
                      <>
                        <Bell size={14} />
                        <span>Etkinleştir</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

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
                    <span className={`badge badge-${task.priority}`} style={{ fontSize: '0.7rem' }}>
                      {priorityLabels[task.priority] || task.priority}
                    </span>
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
            dailyUpdates.map((up) => (
              <div key={up.id} style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    {new Date(up.created_at).toLocaleDateString('tr-TR')}
                  </span>
                  {up.is_late && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '2px 8px', borderRadius: '8px' }}>
                      Geç Gönderim
                    </span>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Bugün Yapılanlar:</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>{up.today_summary}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Yarınki Plan:</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>{up.tomorrow_plan}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

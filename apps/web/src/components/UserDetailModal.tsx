import React, { useState, useEffect } from 'react';
import { supabase } from '../context/AuthContext';
import { 
  X, UserPlus, UserCheck, UserMinus, MessageSquare, Mail, 
  RefreshCw, Shield, Link as LinkIcon 
} from 'lucide-react';

interface Props {
  userId: string;
  currentUserId: string;
  onClose: () => void;
  onStartDM: (userId: string) => void;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: string | null;
}

export const UserDetailModal: React.FC<Props> = ({
  userId,
  currentUserId,
  onClose,
  onStartDM,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [connection, setConnection] = useState<{ id: string; requester_id: string; receiver_id: string; status: 'pending' | 'accepted' | 'rejected' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [connectionCount, setConnectionCount] = useState<number>(0);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, role')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. Fetch connection status
      const { data: connData, error: connError } = await supabase
        .from('user_connections')
        .select('id, requester_id, receiver_id, status')
        .or(`and(requester_id.eq.${currentUserId},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${currentUserId})`);

      if (!connError && connData && connData.length > 0) {
        setConnection(connData[0] as any);
      } else {
        setConnection(null);
      }

      // 3. Fetch user connection count
      const { count, error: countError } = await supabase
        .from('user_connections')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

      if (!countError && count !== null) {
        setConnectionCount(count);
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [userId, currentUserId]);

  const handleSendRequest = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: currentUserId,
          receiver_id: userId,
          status: 'pending'
        })
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setConnection(data[0] as any);
        setFeedback({ success: true, message: 'Bağlantı isteği başarıyla gönderildi.' });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: 'İstek gönderilemedi: ' + (err.message || err) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!connection) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', connection.id);

      if (error) throw error;
      setConnection({ ...connection, status: 'accepted' });
      setConnectionCount(prev => prev + 1);
      setFeedback({ success: true, message: 'Bağlantı isteği kabul edildi.' });
    } catch (err: any) {
      setFeedback({ success: false, message: 'İstek kabul edilemedi: ' + (err.message || err) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrDisconnect = async () => {
    if (!connection) return;
    if (connection.status === 'accepted' && !window.confirm('Bu kişiyi bağlantılarınızdan çıkarmak istediğinize emin misiniz?')) {
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;
      if (connection.status === 'accepted') {
        setConnectionCount(prev => Math.max(0, prev - 1));
      }
      setConnection(null);
      setFeedback({ success: true, message: 'Bağlantı iptal edildi/kaldırıldı.' });
    } catch (err: any) {
      setFeedback({ success: false, message: 'İşlem başarısız oldu: ' + (err.message || err) });
    } finally {
      setActionLoading(false);
    }
  };

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Kullanıcı';
  const userInitials = displayName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url || null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '440px', 
          width: '94%', 
          borderRadius: '16px', 
          padding: '24px', 
          position: 'relative',
          background: 'var(--bg-card)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-glass)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '16px', 
            right: '16px', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: 'var(--text-muted)' 
          }}
          title="Kapat"
        >
          <X size={20} />
        </button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
            <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
          </div>
        ) : profile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
            
            {/* Avatar Sphere */}
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, var(--accent-color) 0%, #ff6b00 100%)',
              boxShadow: '0 8px 24px rgba(var(--accent-rgb), 0.15)',
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-card)',
                border: '2px solid var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'var(--text-primary)',
                fontWeight: 800,
                fontSize: '2rem',
              }}>
                {!avatarUrl && userInitials}
              </div>
            </div>

            {/* User Meta Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {displayName}
                {profile.role === 'owner' && <CrownIcon />}
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Shield size={13} style={{ color: 'var(--accent-color)' }} />
                <span>{profile.role ? profile.role.toUpperCase() : 'ÜYE'}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                <Mail size={14} />
                <span>{profile.email}</span>
              </div>
            </div>

            {/* Connection Count Badge */}
            <div style={{
              backgroundColor: 'var(--bg-surface-accent)',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--border-glass)'
            }}>
              <LinkIcon size={14} style={{ color: 'var(--accent-color)' }} />
              <span>{connectionCount} Bağlantı</span>
            </div>

            {feedback && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                backgroundColor: feedback.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: feedback.success ? '#10b981' : '#ef4444',
                width: '100%',
                fontWeight: 500
              }}>
                {feedback.message}
              </div>
            )}

            {/* Interaction Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '10px' }}>
              
              {/* Connection Status Actions */}
              {!connection && (
                <button
                  onClick={handleSendRequest}
                  disabled={actionLoading}
                  className="btn btn-primary btn-block"
                  style={{ padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : <UserPlus size={16} />}
                  <span>Bağlantı Kur</span>
                </button>
              )}

              {connection && connection.status === 'pending' && connection.requester_id === currentUserId && (
                <button
                  onClick={handleCancelOrDisconnect}
                  disabled={actionLoading}
                  className="btn btn-secondary btn-block"
                  style={{ padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', borderStyle: 'dashed' }}
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : <UserMinus size={16} />}
                  <span>İsteği İptal Et</span>
                </button>
              )}

              {connection && connection.status === 'pending' && connection.receiver_id === currentUserId && (
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    onClick={handleAcceptRequest}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ flex: 2, padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : <UserCheck size={16} />}
                    <span>Kabul Et</span>
                  </button>
                  <button
                    onClick={handleCancelOrDisconnect}
                    disabled={actionLoading}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                  >
                    <span>Reddet</span>
                  </button>
                </div>
              )}

              {connection && connection.status === 'accepted' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div style={{
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    color: '#10b981',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <UserCheck size={16} />
                    <span>Bağlantınız</span>
                  </div>
                  <button
                    onClick={handleCancelOrDisconnect}
                    disabled={actionLoading}
                    className="btn btn-secondary btn-block"
                    style={{ padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ef4444' }}
                  >
                    {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : <UserMinus size={16} />}
                    <span>Bağlantıyı Kes</span>
                  </button>
                </div>
              )}

              {/* Send Direct Message Button */}
              <button
                onClick={() => onStartDM(userId)}
                className="btn btn-secondary btn-block"
                style={{ 
                  padding: '10px', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  backgroundColor: 'var(--bg-surface-accent)',
                  border: '1px solid var(--border-glass)'
                }}
              >
                <MessageSquare size={16} style={{ color: 'var(--accent-color)' }} />
                <span>Mesaj Gönder</span>
              </button>

            </div>

          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>
            Kullanıcı profili yüklenemedi.
          </div>
        )}
      </div>
    </div>
  );
};

const CrownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
    <path d="M5 20h14"/>
  </svg>
);

/**
 * NotificationBell — Bildirim zili ikonu + dropdown panel
 *
 * Okunmamış bildirim sayısını gösterir.
 * Tıklayınca son bildirimleri listeler.
 * Profil ekranındaki push toggle ile birlikte çalışır.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, BellOff } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Panel dışına tıklayınca kapat
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Şimdi';
    if (mins < 60) return `${mins}dk`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}sa`;
    return `${Math.floor(hrs / 24)}g`;
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Zil butonu */}
      <button
        className="btn btn-secondary btn-icon-only"
        onClick={() => {
          setOpen((v) => !v);
          if (navigator.vibrate) navigator.vibrate(8);
        }}
        title="Bildirimler"
        style={{ padding: '8px', position: 'relative' }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-surface)',
              animation: 'pulse-badge 2s infinite',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Bildirim paneli */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '320px',
            maxWidth: '90vw',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Başlık */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-glass)',
              background: 'var(--bg-surface)',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Bildirimler {unreadCount > 0 && <span style={{ color: 'var(--accent-color)' }}>({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={markAllAsRead}
                title="Tümünü okundu işaretle"
              >
                <CheckCheck size={13} />
                Tümü
              </button>
            )}
          </div>

          {/* Liste */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                <BellOff size={28} style={{ marginBottom: '10px', opacity: 0.4 }} />
                <div>Henüz bildirim yok</div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-glass)',
                    cursor: notif.is_read ? 'default' : 'pointer',
                    background: notif.is_read ? 'transparent' : 'rgba(var(--accent-rgb, 183,1,22), 0.06)',
                    transition: 'background 0.2s',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Okunmamış noktası */}
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: notif.is_read ? 'transparent' : 'var(--accent-color)',
                      flexShrink: 0,
                      marginTop: '5px',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: notif.is_read ? 400 : 600,
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        marginBottom: '3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notif.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notif.body}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatTime(notif.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Alt not */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: '10px 16px',
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                borderTop: '1px solid var(--border-glass)',
                background: 'var(--bg-surface)',
              }}
            >
              Son 50 bildirim gösteriliyor
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * NotificationContext — Push bildirim aboneliği + uygulama içi bildirimler
 *
 * Sağladığı:
 *  - unreadCount: okunmamış bildirim sayısı
 *  - notifications: son bildirimler listesi
 *  - pushSupported: tarayıcının push'u destekleyip desteklemediği
 *  - pushEnabled: kullanıcı push'u etkinleştirmiş mi
 *  - enablePush(): izin iste + abone ol
 *  - disablePush(): aboneliği iptal et
 *  - markAsRead(id): bildirimi okundu işaretle
 *  - markAllAsRead(): tüm bildirimleri okundu işaretle
 *  - sendPush(): çalışma alanı üyelerine push gönder (sunucu çağrısı)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, supabase } from './AuthContext';

// ── Tipler ────────────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  notification_scope: 'workspace' | 'global';
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  pushSupported: boolean;
  pushEnabled: boolean;
  pushLoading: boolean;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendPushToWorkspace: (params: {
    workspace_id: string;
    title: string;
    body: string;
    url?: string;
    exclude_user_id?: string;
  }) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ── VAPID Public Key ──────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/** Base64url → Uint8Array (applicationServerKey için) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Cihaz için benzersiz bir hash üret (SW abonelik kaydı için) */
function getDeviceHash(): string {
  const ua = navigator.userAgent;
  let hash = 0;
  for (let i = 0; i < ua.length; i++) {
    const char = ua.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16) + '-' + (navigator.hardwareConcurrency || 1);
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeWorkspace } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Push API desteği kontrolü
  const pushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!VAPID_PUBLIC_KEY;

  // ── Bildirimleri yükle ──────────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!user?.id || !activeWorkspace?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data as AppNotification[]) || []);
    } catch (err) {
      console.error('Notifications load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeWorkspace?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ── Supabase Realtime aboneliği (uygulama açıkken anlık bildirim) ────────────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── Mevcut push aboneliği durumunu kontrol et ─────────────────────────────
  useEffect(() => {
    if (!pushSupported || !user?.id) return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setPushEnabled(!!sub);
      })
      .catch(() => setPushEnabled(false));
  }, [pushSupported, user?.id]);

  // ── Push Etkinleştir ──────────────────────────────────────────────────────
  const enablePush = async (): Promise<boolean> => {
    if (!pushSupported || !user?.id) return false;
    setPushLoading(true);
    try {
      // Bildirim izni iste
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Bildirim izni verilmedi. Lütfen tarayıcı ayarlarından izin verin.');
        return false;
      }

      // SW kaydını al ve push aboneliği oluştur
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Aboneliği JSON olarak serialize et ve DB'ye kaydet
      const subscriptionJson = JSON.stringify(subscription.toJSON());
      const deviceHash = getDeviceHash();

      const { error } = await supabase.from('user_devices').upsert(
        {
          user_id: user.id,
          device_identifier_hash: deviceHash,
          push_token: subscriptionJson,
          platform: /iPhone|iPad|iPod/.test(navigator.userAgent)
            ? 'ios'
            : /Android/.test(navigator.userAgent)
            ? 'android'
            : 'web',
          device_name: navigator.userAgent.substring(0, 100),
          app_version: '1.0.0',
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_identifier_hash' }
      );

      if (error) throw error;
      setPushEnabled(true);
      return true;
    } catch (err) {
      console.error('Enable push failed:', err);
      return false;
    } finally {
      setPushLoading(false);
    }
  };

  // ── Push Devre Dışı Bırak ────────────────────────────────────────────────
  const disablePush = async (): Promise<void> => {
    if (!pushSupported) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      const deviceHash = getDeviceHash();
      await supabase
        .from('user_devices')
        .update({ push_token: null, is_active: false })
        .eq('user_id', user?.id ?? '')
        .eq('device_identifier_hash', deviceHash);

      setPushEnabled(false);
    } catch (err) {
      console.error('Disable push failed:', err);
    } finally {
      setPushLoading(false);
    }
  };

  // ── Okundu İşaretle ──────────────────────────────────────────────────────
  const markAsRead = async (id: string): Promise<void> => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async (): Promise<void> => {
    if (!user?.id) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // ── Workspace'e Push Gönder (Edge Function çağrısı) ──────────────────────
  const sendPushToWorkspace = async (params: {
    workspace_id: string;
    title: string;
    body: string;
    url?: string;
    exclude_user_id?: string;
  }): Promise<void> => {
    try {
      await supabase.functions.invoke('send-push', { body: params });
    } catch (err) {
      // Push gönderme hatası uygulamayı engellemez
      console.warn('Push send failed (non-critical):', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        pushSupported,
        pushEnabled,
        pushLoading,
        enablePush,
        disablePush,
        markAsRead,
        markAllAsRead,
        sendPushToWorkspace,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

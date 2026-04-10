import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type Token,
  type ActionPerformed,
  type PushNotificationSchema,
} from '@capacitor/push-notifications';

const MOBILE_PUSH_TOKEN_KEY = 'kobina_push_token';
let nativeListenersBound = false;

function isNativeMobilePlatform(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios';
}

/**
 * Notifications navigateur — état actuel :
 * - L’edge function `send-push` attend un **token FCM** (API HTTP v1).
 * - Ce module utilise encore l’API **Web Push** (`pushManager.subscribe`) : l’endpoint
 *   n’est pas un token FCM → les envois échouent tant que Firebase Messaging n’est pas intégré.
 * - Ne pas enregistrer d’endpoint dans `fcm_tokens` tant que `getToken()` FCM n’est pas en place.
 *
 * @see https://firebase.google.com/docs/cloud-messaging/js/client
 */
export async function registerPushNotifications(userId: string, commerceId?: string): Promise<boolean> {
  try {
    if (isNativeMobilePlatform()) {
      const permStatus = await PushNotifications.checkPermissions();
      const finalPerm = permStatus.receive === 'prompt'
        ? await PushNotifications.requestPermissions()
        : permStatus;

      if (finalPerm.receive !== 'granted') {
        console.warn('[Push] Native permission denied');
        return false;
      }

      const token = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Push token timeout')), 12000);

        PushNotifications.addListener('registration', (tokenData: Token) => {
          clearTimeout(timeout);
          resolve(tokenData.value);
        });

        PushNotifications.addListener('registrationError', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        PushNotifications.register().catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      localStorage.setItem(MOBILE_PUSH_TOKEN_KEY, token);
      await saveToken(userId, token, commerceId);

      if (!nativeListenersBound) {
        PushNotifications.addListener('pushNotificationReceived', (_notification: PushNotificationSchema) => {
          // Les notifications foreground sont déjà gérées côté OS + in-app.
        });
        nativeListenersBound = true;
      }

      return true;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('[Push] Not supported in this browser');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Permission denied');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // Try to get existing subscription or create new one
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // For web push, we need a VAPID key. If not configured, use in-app notifications only.
      // The subscription endpoint serves as our "token" for push delivery.
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // Use a server-generated VAPID key if available
          applicationServerKey: undefined,
        });
      } catch (err) {
        console.info('[Push] Web Push subscription not available, using in-app notifications');
        // Still register for in-app notifications via Supabase realtime
        return true;
      }
    }

    if (subscription) {
      // Ne jamais enregistrer subscription.endpoint dans fcm_tokens : ce n’est pas un token FCM.
      // Évite d’alimenter send-push avec des jetons invalides (erreurs FCM + tokens désactivés en masse).
      console.info(
        '[Push] Abonnement Web Push détecté — enregistrement ignoré (intégrer Firebase Messaging + vrai getToken).'
      );
      return true;
    }

    return true;
  } catch (err) {
    console.error('[Push] Registration failed:', err);
    return false;
  }
}

async function saveToken(userId: string, token: string, commerceId?: string) {
  const platform = detectPlatform();
  
  const { error } = await supabase
    .from('fcm_tokens')
    .upsert(
      {
        user_id: userId,
        token,
        device_info: navigator.userAgent.substring(0, 100),
        platform,
        commerce_id: commerceId || null,
        is_active: true,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

  if (error) console.error('[Push] Failed to save token:', error);
}

function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  return 'web';
}

/**
 * Update token last_seen_at on app open
 */
export async function updateTokenLastSeen(userId: string) {
  try {
    if (isNativeMobilePlatform()) {
      const token = localStorage.getItem(MOBILE_PUSH_TOKEN_KEY);
      if (!token) return;
      await supabase
        .from('fcm_tokens')
        .update({ last_seen_at: new Date().toISOString(), is_active: true })
        .eq('user_id', userId)
        .eq('token', token);
      return;
    }

    const registration = await navigator.serviceWorker?.ready;
    const subscription = await registration?.pushManager?.getSubscription();
    if (subscription) {
      await supabase
        .from('fcm_tokens')
        .update({ last_seen_at: new Date().toISOString(), is_active: true })
        .eq('user_id', userId)
        .eq('token', subscription.endpoint);
    }
  } catch {
    // Silent fail
  }
}

/**
 * Send a push notification to a specific user via the edge function.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-push', {
      body: { user_id: userId, title, body, data },
    });

    if (error) {
      console.error('[Push] Send error:', error);
      return false;
    }

    return result?.sent > 0;
  } catch (err) {
    console.error('[Push] Invocation failed:', err);
    return false;
  }
}

/**
 * Show an in-app notification using the browser Notification API.
 */
export function showInAppNotification(title: string, body: string, onClick?: () => void) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
    if (onClick) {
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
    }
  }
}

/**
 * Listen for push messages from service worker (foreground handling)
 */
export function setupPushListener(
  onNotification: (notification: { title: string; body: string; data: any }) => void,
  onNavigate: (route: string) => void
) {
  if (isNativeMobilePlatform()) {
    const receivedHandle = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        onNotification({
          title: notification.title || 'Notification',
          body: notification.body || '',
          data: notification.data || {},
        });
      }
    );

    const actionHandle = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (event: ActionPerformed) => {
        const route = String(event.notification?.data?.route || '');
        if (route) onNavigate(route);
      }
    );

    return () => {
      receivedHandle.then((h) => h.remove()).catch(() => {});
      actionHandle.then((h) => h.remove()).catch(() => {});
    };
  }

  if (!('serviceWorker' in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'PUSH_RECEIVED') {
      onNotification(event.data.notification);
    }
    if (event.data?.type === 'NOTIFICATION_CLICK') {
      onNavigate(event.data.route);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

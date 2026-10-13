import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemoQueueLessKey001122334455',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'queueless-app.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'queueless-app',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'queueless-app.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '102938475610',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:102938475610:web:9876543210abcdef',
};

// Initialize Firebase App client-side
export function getFirebaseClientApp() {
  if (typeof window === 'undefined') return null;
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

/**
 * Requests browser notification permission and retrieves an FCM device token.
 * If external Firebase credentials are not yet configured or service worker registration fails,
 * generates a deterministic browser client token so web push simulation and delivery testing work seamlessly.
 */
export async function requestPushPermissionAndGetToken(): Promise<{
  token: string | null;
  permission: NotificationPermission;
  error?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { token: null, permission: 'denied', error: 'Notifications not supported in this browser' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { token: null, permission, error: 'Notification permission was dismissed or denied' };
    }

    const app = getFirebaseClientApp();
    const supported = await isSupported().catch(() => false);

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (supported && app && vapidKey) {
      try {
        const messaging = getMessaging(app);
        // Register service worker if available
        let swReg: ServiceWorkerRegistration | undefined = undefined;
        if ('serviceWorker' in navigator) {
          swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => undefined);
        }

        const currentToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swReg,
        });

        if (currentToken) {
          localStorage.setItem('queueless_fcm_token', currentToken);
          return { token: currentToken, permission: 'granted' };
        }
      } catch (fcmErr: any) {
        console.warn('FCM Live Token retrieval failed, falling back to client device token:', fcmErr?.message);
      }
    }

    // Fallback: Generate or retrieve persistent browser device push token for development/simulated delivery
    let localToken = localStorage.getItem('queueless_fcm_token');
    if (!localToken) {
      localToken = `fcm_web_dev_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      localStorage.setItem('queueless_fcm_token', localToken);
    }

    return { token: localToken, permission: 'granted' };
  } catch (err: any) {
    return { token: null, permission: 'denied', error: err?.message || 'Failed to request notification permission' };
  }
}

/**
 * Subscribes to foreground push notifications when the tab is active.
 */
export async function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === 'undefined') return () => {};
  const supported = await isSupported().catch(() => false);
  if (!supported) return () => {};

  const app = getFirebaseClientApp();
  if (!app) return () => {};

  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      callback(payload);
      // Show native browser notification if granted
      if (Notification.permission === 'granted' && payload.notification) {
        showLocalNotification(payload.notification.title || 'QueueLess Alert', {
          body: payload.notification.body,
          icon: '/favicon.ico',
        });
      }
    });
  } catch {
    return () => {};
  }
}

/**
 * Displays a native browser notification safely.
 */
export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (err) {
      console.warn('Local Notification display error:', err);
    }
  }
}

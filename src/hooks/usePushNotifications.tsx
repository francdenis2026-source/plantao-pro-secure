import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { areNativeNotificationsAllowed } from '@/lib/reminderSettings';

type SoundType = 'notification' | 'alert' | 'shift' | 'urgent' | 'success';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  playSound?: boolean;
  soundType?: SoundType;
}

// Enhanced notification sounds using Web Audio API
const playTacticalSound = (type: SoundType = 'notification') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;

    const playNote = (frequency: number, startTime: number, duration: number, oscType: OscillatorType = 'sine', volume: number = 0.15) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = oscType;
      osc.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    };

    switch (type) {
      case 'notification':
        // Standard notification - 3 ascending tones
        playNote(523, now, 0.12);        // C5
        playNote(659, now + 0.1, 0.12);  // E5
        playNote(784, now + 0.2, 0.2);   // G5
        break;

      case 'alert':
        // Alert - two-tone attention grabber
        playNote(880, now, 0.1, 'triangle', 0.2);
        playNote(660, now + 0.12, 0.1, 'triangle', 0.2);
        playNote(880, now + 0.24, 0.15, 'triangle', 0.2);
        break;

      case 'shift':
        // Shift reminder - tactical radio chirp
        playNote(1200, now, 0.05, 'square', 0.08);
        playNote(800, now + 0.06, 0.05, 'square', 0.08);
        playNote(1000, now + 0.15, 0.1, 'sine', 0.12);
        playNote(1200, now + 0.27, 0.15, 'sine', 0.15);
        break;

      case 'urgent':
        // Urgent - rapid pulsing alert
        for (let i = 0; i < 4; i++) {
          playNote(1000, now + i * 0.15, 0.08, 'sawtooth', 0.1);
          playNote(800, now + i * 0.15 + 0.08, 0.05, 'sawtooth', 0.08);
        }
        break;

      case 'success':
        // Success - pleasant confirmation
        playNote(392, now, 0.1);        // G4
        playNote(523, now + 0.12, 0.1); // C5
        playNote(659, now + 0.24, 0.1); // E5
        playNote(784, now + 0.36, 0.2); // G5
        break;

      default:
        playNote(523, now, 0.12);
        playNote(659, now + 0.1, 0.12);
        playNote(784, now + 0.2, 0.2);
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Legacy function for backward compatibility
const playNotificationSound = () => playTacticalSound('notification');

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (!supported) return;

    setPermission(Notification.permission);

    // IMPORTANT:
    // Service Worker registration is handled globally (src/main.tsx) to avoid
    // multiple registrations + reload loops that can cause auth refresh storms.
    // Here we only grab the existing registration when available.
    navigator.serviceWorker.getRegistration('/').then((reg) => {
      if (reg) setServiceWorker(reg);
    });

    navigator.serviceWorker.ready
      .then((reg) => setServiceWorker(reg))
      .catch(() => {
        // ignore
      });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações');
      return false;
    }

    try {
      if (!areNativeNotificationsAllowed()) {
        toast.info('Modo "somente in-app" ativo — notificações do navegador estão desativadas nas configurações.');
        return false;
      }
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notificações ativadas com sucesso!');
        return true;
      } else if (result === 'denied') {
        toast.error('Permissão de notificações negada');
        return false;
      } else {
        toast.info('Permissão de notificações pendente');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão de notificações');
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (payload: NotificationPayload): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    if (!areNativeNotificationsAllowed()) {
      // Usuário optou por manter tudo in-app — não emite nenhuma push.
      return false;
    }

    try {
      // Play tactical sound based on type
      if (payload.playSound !== false) {
        playTacticalSound(payload.soundType || 'notification');
      }

      // Use service worker notification if available (works even when tab is closed)
      if (serviceWorker) {
        await serviceWorker.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: payload.tag || 'default',
          requireInteraction: payload.requireInteraction ?? true,
        } as NotificationOptions);
      } else {
        // Fallback to regular notification
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          tag: payload.tag || 'default',
          requireInteraction: payload.requireInteraction ?? true,
        });
      }
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [isSupported, permission, serviceWorker]);

  const scheduleNotification = useCallback((payload: NotificationPayload, delayMs: number) => {
    if (permission !== 'granted') {
      console.warn('Cannot schedule notification: permission not granted');
      return null;
    }

    const timeoutId = setTimeout(() => {
      showNotification(payload);
    }, delayMs);

    return timeoutId;
  }, [permission, showNotification]);

  return {
    permission,
    isSupported,
    isEnabled: permission === 'granted',
    requestPermission,
    showNotification,
    scheduleNotification,
    playNotificationSound,
    playTacticalSound,
  };
}
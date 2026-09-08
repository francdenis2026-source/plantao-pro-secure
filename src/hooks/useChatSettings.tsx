import { useState, useEffect } from 'react';

export type ChatBackgroundTheme = 'tactical' | 'military' | 'alert' | 'cyber' | 'none';
export type ShiftReminderHours = 12 | 24 | 48;
export type BubbleTheme = 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'cyan';
export type ReminderSound = 'default' | 'tactical' | 'radio' | 'chime' | 'urgent' | 'silent';

interface ReminderSounds {
  shift: ReminderSound;
  bh: ReminderSound;
  leave: ReminderSound;
}

interface ChatSettings {
  backgroundTheme: ChatBackgroundTheme;
  shiftReminderHours: ShiftReminderHours;
  bubbleTheme: BubbleTheme;
  reminderSounds: ReminderSounds;
}

const STORAGE_KEY = 'chat_settings';

const defaultSettings: ChatSettings = {
  backgroundTheme: 'tactical',
  shiftReminderHours: 24,
  bubbleTheme: 'amber',
  reminderSounds: {
    shift: 'default',
    bh: 'default',
    leave: 'default',
  },
};

export function useChatSettings(agentId: string) {
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    if (!agentId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${agentId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading chat settings:', error);
    }
    setIsLoaded(true);
  }, [agentId]);

  // Save settings to localStorage
  const saveSettings = (newSettings: Partial<ChatSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    if (agentId) {
      try {
        localStorage.setItem(`${STORAGE_KEY}_${agentId}`, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving chat settings:', error);
      }
    }
  };

  const setBackgroundTheme = (theme: ChatBackgroundTheme) => {
    saveSettings({ backgroundTheme: theme });
  };

  const setShiftReminderHours = (hours: ShiftReminderHours) => {
    saveSettings({ shiftReminderHours: hours });
  };

  const setBubbleTheme = (theme: BubbleTheme) => {
    saveSettings({ bubbleTheme: theme });
  };

  const setReminderSound = (type: keyof ReminderSounds, sound: ReminderSound) => {
    saveSettings({ 
      reminderSounds: { 
        ...settings.reminderSounds, 
        [type]: sound 
      } 
    });
  };

  return {
    ...settings,
    isLoaded,
    setBackgroundTheme,
    setShiftReminderHours,
    setBubbleTheme,
    setReminderSound,
  };
}

// Hook to get just the shift reminder hours for a given agent
export function useShiftReminderHours(agentId: string): ShiftReminderHours {
  const [hours, setHours] = useState<ShiftReminderHours>(24);

  useEffect(() => {
    if (!agentId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${agentId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.shiftReminderHours) {
          setHours(parsed.shiftReminderHours);
        }
      }
    } catch (error) {
      console.error('Error loading shift reminder hours:', error);
    }
  }, [agentId]);

  return hours;
}

// Hook to get just the chat background theme for a given agent
export function useChatBackgroundTheme(agentId: string): ChatBackgroundTheme {
  const [theme, setTheme] = useState<ChatBackgroundTheme>('tactical');

  useEffect(() => {
    if (!agentId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${agentId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.backgroundTheme) {
          setTheme(parsed.backgroundTheme);
        }
      }
    } catch (error) {
      console.error('Error loading chat background theme:', error);
    }
  }, [agentId]);

  return theme;
}

// Hook to get just the bubble theme for a given agent
export function useBubbleTheme(agentId: string): BubbleTheme {
  const [theme, setTheme] = useState<BubbleTheme>('amber');

  useEffect(() => {
    if (!agentId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${agentId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.bubbleTheme) {
          setTheme(parsed.bubbleTheme);
        }
      }
    } catch (error) {
      console.error('Error loading bubble theme:', error);
    }
  }, [agentId]);

  return theme;
}

// Hook to get reminder sounds for a given agent
export function useReminderSounds(agentId: string): ReminderSounds {
  const [sounds, setSounds] = useState<ReminderSounds>(defaultSettings.reminderSounds);

  useEffect(() => {
    if (!agentId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${agentId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reminderSounds) {
          setSounds({ ...defaultSettings.reminderSounds, ...parsed.reminderSounds });
        }
      }
    } catch (error) {
      console.error('Error loading reminder sounds:', error);
    }
  }, [agentId]);

  return sounds;
}

// Function to play specific reminder sound
export function playReminderSound(sound: ReminderSound) {
  if (sound === 'silent') return;
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const now = audioContext.currentTime;
  
  switch (sound) {
    case 'default':
      playDefaultSound(audioContext, now);
      break;
    case 'tactical':
      playTacticalSound(audioContext, now);
      break;
    case 'radio':
      playRadioSound(audioContext, now);
      break;
    case 'chime':
      playChimeSound(audioContext, now);
      break;
    case 'urgent':
      playUrgentSound(audioContext, now);
      break;
  }
}

function playDefaultSound(ctx: AudioContext, now: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, now);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  osc.start(now);
  osc.stop(now + 0.15);
  
  setTimeout(() => {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659, ctx.currentTime);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.2);
  }, 120);
}

function playTacticalSound(ctx: AudioContext, now: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc.start(now);
  osc.stop(now + 0.15);
  
  setTimeout(() => {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(800, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.12, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.18);
  }, 100);
}

function playRadioSound(ctx: AudioContext, now: number) {
  // Static burst
  const bufferSize = ctx.sampleRate * 0.1;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  const noiseGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 0.5;
  noiseNode.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(0.08, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  noiseNode.start(now);
  noiseNode.stop(now + 0.1);
  
  // Beep after static
  setTimeout(() => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }, 100);
}

function playChimeSound(ctx: AudioContext, now: number) {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }, i * 100);
  });
}

function playUrgentSound(ctx: AudioContext, now: number) {
  // Urgent alarm - fast pulsing
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }, i * 120);
  }
}

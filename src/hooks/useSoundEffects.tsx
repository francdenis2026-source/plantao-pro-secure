import { useState, useCallback, useEffect } from 'react';

type SoundType = 
  | 'theme-change' 
  | 'notification' 
  | 'click' 
  | 'success' 
  | 'error' 
  | 'shift-start' 
  | 'shift-end' 
  | 'hover' 
  | 'card-select' 
  | 'button-press' 
  | 'nav-click'
  | 'tactical-click'
  | 'tactical-hover'
  | 'tactical-confirm'
  | 'status-change'
  | 'radio-static'
  | 'access-denied';

type ThemeType = 'tactical' | 'cyber' | 'crimson' | 'arctic' | 'sovereign' | 'nexus' | 'ember' | 'system';

export function useSoundEffects() {
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('plantaopro-sound-enabled');
    return saved !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('plantaopro-sound-enabled', String(isSoundEnabled));
  }, [isSoundEnabled]);

  // Get current theme from localStorage
  const getCurrentTheme = useCallback((): ThemeType => {
    const saved = localStorage.getItem('plantaopro-theme');
    return (saved as ThemeType) || 'tactical';
  }, []);

  // Theme-specific sound configurations - Professional and pleasant sounds
  const getThemeSoundConfig = useCallback((theme: ThemeType) => {
    const configs = {
      tactical: {
        themeChange: { notes: [523, 659, 784], type: 'sine' as OscillatorType, duration: 0.12 }, // C5-E5-G5 Major chord
        hover: { freq: 1200, type: 'sine' as OscillatorType, duration: 0.025 },
        cardSelect: { notes: [659, 784], type: 'sine' as OscillatorType },
      },
      cyber: {
        themeChange: { notes: [392, 494, 587], type: 'sine' as OscillatorType, duration: 0.1 }, // G4-B4-D5
        hover: { freq: 1400, type: 'sine' as OscillatorType, duration: 0.02 },
        cardSelect: { notes: [587, 698], type: 'sine' as OscillatorType },
      },
      crimson: {
        themeChange: { notes: [440, 554, 659], type: 'sine' as OscillatorType, duration: 0.15 }, // A4-C#5-E5
        hover: { freq: 880, type: 'sine' as OscillatorType, duration: 0.03 },
        cardSelect: { notes: [554, 659], type: 'sine' as OscillatorType },
      },
      arctic: {
        themeChange: { notes: [698, 880, 1047], type: 'sine' as OscillatorType, duration: 0.18 }, // F5-A5-C6 High crisp
        hover: { freq: 1500, type: 'sine' as OscillatorType, duration: 0.02 },
        cardSelect: { notes: [880, 1047], type: 'sine' as OscillatorType },
      },
      sovereign: {
        themeChange: { notes: [349, 440, 523], type: 'triangle' as OscillatorType, duration: 0.2 }, // F4-A4-C5 Warm
        hover: { freq: 700, type: 'triangle' as OscillatorType, duration: 0.035 },
        cardSelect: { notes: [440, 523], type: 'triangle' as OscillatorType },
      },
      nexus: {
        themeChange: { notes: [494, 622, 740], type: 'sine' as OscillatorType, duration: 0.1 }, // B4-D#5-F#5
        hover: { freq: 1100, type: 'sine' as OscillatorType, duration: 0.02 },
        cardSelect: { notes: [622, 740], type: 'sine' as OscillatorType },
      },
      ember: {
        themeChange: { notes: [415, 523, 622], type: 'triangle' as OscillatorType, duration: 0.16 }, // G#4-C5-D#5
        hover: { freq: 830, type: 'triangle' as OscillatorType, duration: 0.03 },
        cardSelect: { notes: [523, 622], type: 'triangle' as OscillatorType },
      },
      system: {
        themeChange: { notes: [523, 659, 784], type: 'sine' as OscillatorType, duration: 0.12 },
        hover: { freq: 1200, type: 'sine' as OscillatorType, duration: 0.025 },
        cardSelect: { notes: [659, 784], type: 'sine' as OscillatorType },
      },
    };
    return configs[theme] || configs.tactical;
  }, []);

  const playSound = useCallback((type: SoundType, themeOverride?: ThemeType) => {
    if (!isSoundEnabled) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;
    const currentTheme = themeOverride || getCurrentTheme();
    const themeConfig = getThemeSoundConfig(currentTheme);

    switch (type) {
      case 'theme-change': {
        // Professional chord sound - play 3 notes simultaneously with soft attack
        const config = themeConfig.themeChange;
        const notes = config.notes;
        
        notes.forEach((freq: number, index: number) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.type = config.type;
          osc.frequency.setValueAtTime(freq, now);
          
          // Soft attack envelope - pleasant sound
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.08 - (index * 0.015), now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration + 0.1);
          
          osc.start(now + (index * 0.015)); // Slight stagger for richness
          osc.stop(now + config.duration + 0.15);
        });
        break;
      }

      case 'hover': {
        // Subtle, clean tick sound
        const config = themeConfig.hover;
        oscillator.type = config.type;
        oscillator.frequency.setValueAtTime(config.freq, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.03, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
        oscillator.start(now);
        oscillator.stop(now + config.duration);
        break;
      }

      case 'card-select': {
        // Clean two-tone confirmation
        const config = themeConfig.cardSelect;
        const notes = config.notes;
        
        notes.forEach((freq: number, index: number) => {
          setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.type = config.type;
            osc.frequency.setValueAtTime(freq, audioContext.currentTime);
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.1);
          }, index * 50);
        });
        break;
      }

      case 'notification':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659, audioContext.currentTime);
          gain2.gain.setValueAtTime(0.2, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.2);
        }, 120);
        
        setTimeout(() => {
          const osc3 = audioContext.createOscillator();
          const gain3 = audioContext.createGain();
          osc3.connect(gain3);
          gain3.connect(audioContext.destination);
          osc3.type = 'sine';
          osc3.frequency.setValueAtTime(784, audioContext.currentTime);
          gain3.gain.setValueAtTime(0.2, audioContext.currentTime);
          gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          osc3.start(audioContext.currentTime);
          osc3.stop(audioContext.currentTime + 0.35);
        }, 240);
        break;

      case 'click':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'success':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.setValueAtTime(500, now + 0.1);
        oscillator.frequency.setValueAtTime(600, now + 0.2);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
        break;

      case 'error': {
        // Gentle attention sound - descending tone, not harsh
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now); // A4
        oscillator.frequency.exponentialRampToValueAtTime(349, now + 0.15); // F4
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.25);
        break;
      }

      case 'shift-start':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(392, now);
        oscillator.frequency.setValueAtTime(523, now + 0.15);
        oscillator.frequency.setValueAtTime(659, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
        break;

      case 'shift-end':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(659, now);
        oscillator.frequency.setValueAtTime(523, now + 0.15);
        oscillator.frequency.setValueAtTime(392, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
        break;

      case 'button-press':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(500, now);
        oscillator.frequency.exponentialRampToValueAtTime(350, now + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.1);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;

      case 'nav-click':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(700, now);
        oscillator.frequency.exponentialRampToValueAtTime(500, now + 0.06);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'tactical-click':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1200, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.02);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        oscillator.start(now);
        oscillator.stop(now + 0.08);
        break;

      case 'tactical-hover':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1400, now);
        oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.02);
        gainNode.gain.setValueAtTime(0.03, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        oscillator.start(now);
        oscillator.stop(now + 0.04);
        break;

      case 'tactical-confirm':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        oscillator.start(now);
        oscillator.stop(now + 0.08);

        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1100, audioContext.currentTime);
          gain2.gain.setValueAtTime(0.12, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.12);
        }, 60);
        break;

      case 'status-change':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.setValueAtTime(900, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;

      case 'radio-static': {
        const bufferSize = audioContext.sampleRate * 0.05;
        const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const noiseNode = audioContext.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        const noiseGain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 0.5;
        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        noiseGain.gain.setValueAtTime(0.06, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        noiseNode.start(now);
        noiseNode.stop(now + 0.05);
        return;
      }

      case 'access-denied': {
        // Pleasant two-tone attention sound (not harsh)
        // Uses descending gentle tones instead of harsh sawtooth
        const deniedNotes = [523, 440]; // C5 -> A4 (gentle descent)
        
        deniedNotes.forEach((freq, index) => {
          setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.type = 'sine'; // Smooth sine wave, not harsh
            osc.frequency.setValueAtTime(freq, audioContext.currentTime);
            
            // Soft attack, gentle release
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.25);
          }, index * 150);
        });
        break;
      }
    }
  }, [isSoundEnabled, getCurrentTheme, getThemeSoundConfig]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  return {
    isSoundEnabled,
    toggleSound,
    playSound,
  };
}

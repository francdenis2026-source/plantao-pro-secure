import { DEFAULT_STATION } from '@/lib/radioStations';

export type RadioPlayState = 'idle' | 'loading' | 'playing' | 'error';

interface RadioSnapshot {
  state: RadioPlayState;
  nowPlaying: string | null;
}

/**
 * Estado do player de rádio vive FORA do React, em módulo — sobrevive a
 * qualquer montagem/desmontagem de <RadioPlayerWidget> (ex.: o dock global
 * some na rota "/" porque o header já tem sua própria instância do player;
 * sem esse singleton, cada troca de instância criava um novo <audio> e
 * perdia a reprodução em andamento). Todas as instâncias do widget só
 * assinam este estado compartilhado.
 */
let audio: HTMLAudioElement | null = null;
let usingFallback = false;
let state: RadioPlayState = 'idle';
let nowPlaying: string | null = null;
let eventSource: EventSource | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let sseStarted = false;

const listeners = new Set<() => void>();

// useSyncExternalStore exige que getSnapshot devolva a MESMA referência
// enquanto nada mudou — senão React re-renderiza em loop infinito. Por
// isso o snapshot é cacheado aqui e só recriado dentro de emit().
let snapshot: RadioSnapshot = { state, nowPlaying };

function emit() {
  snapshot = { state, nowPlaying };
  for (const l of listeners) l();
}

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'none';
    audio.addEventListener('playing', () => { state = 'playing'; emit(); });
    audio.addEventListener('waiting', () => { state = 'loading'; emit(); });
    audio.addEventListener('error', () => handleError());
  }
  return audio;
}

function handleError() {
  if (!usingFallback) {
    usingFallback = true;
    play(true);
    return;
  }
  state = 'error';
  emit();
}

function play(fallback: boolean) {
  const el = getAudio();
  state = 'loading';
  emit();
  el.src = fallback ? DEFAULT_STATION.fallbackUrl : DEFAULT_STATION.streamUrl;
  el.play().catch(() => handleError());
}

function startMetadataStream() {
  if (sseStarted) return;
  sseStarted = true;

  const connect = () => {
    try {
      eventSource = new EventSource(DEFAULT_STATION.metadataUrl);
      eventSource.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          const title = data?.streamTitle || data?.title;
          const clean = typeof title === 'string' ? title.trim() : '';
          nowPlaying = clean && clean !== '-' ? clean : null;
          emit();
        } catch {
          /* payload não-JSON: ignora */
        }
      };
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        retryTimer = setTimeout(connect, 30_000);
      };
    } catch {
      retryTimer = setTimeout(connect, 30_000);
    }
  };
  connect();
}

export const radioPlayer = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    startMetadataStream();
    return () => listeners.delete(listener);
  },
  getSnapshot(): RadioSnapshot {
    return snapshot;
  },
  play() {
    usingFallback = false;
    play(false);
  },
  stop() {
    const el = audio;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    usingFallback = false;
    state = 'idle';
    emit();
  },
  toggle() {
    if (state === 'playing' || state === 'loading') {
      radioPlayer.stop();
    } else {
      radioPlayer.play();
    }
  },
};

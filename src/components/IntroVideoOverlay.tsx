import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Volume2, VolumeX } from 'lucide-react';

interface IntroVideoOverlayProps {
  onComplete: () => void;
}

const INTRO_SHOWN_KEY = 'plantaopro_intro_shown';
const INTRO_SHOWN_SESSION_KEY = 'plantaopro_intro_session';

export function IntroVideoOverlay({ onComplete }: IntroVideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [canShow, setCanShow] = useState(false);
  
  // Check if intro should be shown (once per session)
  useEffect(() => {
    const hasShownThisSession = sessionStorage.getItem(INTRO_SHOWN_SESSION_KEY);
    
    if (!hasShownThisSession) {
      setCanShow(true);
      setIsVisible(true);
      sessionStorage.setItem(INTRO_SHOWN_SESSION_KEY, 'true');
    } else {
      // Already shown this session, skip
      onComplete();
    }
  }, [onComplete]);
  
  // Auto-play video when visible
  useEffect(() => {
    if (isVisible && videoRef.current && canShow) {
      videoRef.current.play().catch(() => {
        console.log('Video autoplay blocked');
      });
    }
  }, [isVisible, canShow]);
  
  const handleVideoEnd = () => {
    setIsVisible(false);
    localStorage.setItem(INTRO_SHOWN_KEY, 'true');
    setTimeout(onComplete, 300);
  };
  
  const handleSkip = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsVisible(false);
    localStorage.setItem(INTRO_SHOWN_KEY, 'true');
    setTimeout(onComplete, 300);
  };
  
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  if (!canShow) return null;
  
  return (
    <div 
      className={cn(
        "fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src="/__l5e/assets-v1/733ed63b-0276-4fa5-97f6-4e28cd3a90bf/intro.mp4"
        className="w-full h-full object-contain"
        muted={isMuted}
        playsInline
        onEnded={handleVideoEnd}
        onClick={toggleMute}
      />
      
      {/* Controls overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            title={isMuted ? "Ativar som" : "Silenciar"}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          
          {/* Skip text */}
          <p className="text-white/60 text-xs">Clique no vídeo para ativar/desativar som</p>
          
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium"
          >
            <span>Pular</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Close button in corner */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white"
        title="Pular introdução"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Lock, Timer, ShieldAlert, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface LockoutTimerDialogProps {
  open: boolean;
  onClose: () => void;
  lockoutEndTime: Date;
  identifier?: string;
}

export function LockoutTimerDialog({ 
  open, 
  onClose, 
  lockoutEndTime,
  identifier 
}: LockoutTimerDialogProps) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const end = lockoutEndTime.getTime();
    const diff = end - now;

    if (diff <= 0) {
      setIsExpired(true);
      return { minutes: 0, seconds: 0 };
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { minutes, seconds };
  }, [lockoutEndTime]);

  useEffect(() => {
    if (!open) return;

    const updateTimer = () => {
      const time = calculateTimeLeft();
      setTimeLeft(time);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [open, calculateTimeLeft]);

  // Play a subtle tick sound
  useEffect(() => {
    if (!open || isExpired) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioContext.currentTime);
      gain.gain.setValueAtTime(0, audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0.02, audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.06);
    } catch (e) {
      // Ignore audio errors
    }
  }, [timeLeft.seconds, open, isExpired]);

  const formatNumber = (n: number) => n.toString().padStart(2, '0');
  const progress = Math.max(0, Math.min(100, ((timeLeft.minutes * 60 + timeLeft.seconds) / (15 * 60)) * 100));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && isExpired && onClose()}>
      <DialogContent className={cn(
        "w-[94vw] max-w-lg p-0 gap-0 border-2 overflow-hidden",
        "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
        isExpired ? "border-green-500/50" : "border-red-500/50",
        "shadow-[0_0_60px_rgba(239,68,68,0.2)]"
      )}>
        {/* Animated Header */}
        <div className={cn(
          "px-5 py-4 flex items-center gap-3 border-b relative overflow-hidden",
          isExpired 
            ? "bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 border-green-500/50"
            : "bg-gradient-to-r from-red-600 via-rose-600 to-red-600 border-red-500/50"
        )}>
          {/* Animated pulse overlay */}
          {!isExpired && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
          )}
          
          <div className="relative">
            {isExpired ? (
              <RefreshCw className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '2s' }} />
            ) : (
              <Lock className="w-6 h-6 text-white animate-pulse" />
            )}
          </div>
          <span className="text-base font-bold text-white uppercase tracking-widest drop-shadow-sm relative">
            {isExpired ? 'Acesso Liberado' : 'Acesso Temporariamente Bloqueado'}
          </span>
          <div className="flex-1" />
          {!isExpired && (
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-white/80 animate-ping" />
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="p-6 sm:p-8 text-center">
          {!isExpired ? (
            <>
              {/* Warning Icon */}
              <div className="mb-5 flex justify-center">
                <div className="p-5 rounded-full bg-red-500/15 border-2 border-red-500/30 relative">
                  <ShieldAlert className="w-14 h-14 text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                  <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
                </div>
              </div>

              {/* Timer */}
              <div className="mb-5">
                <div className="text-sm text-slate-400 uppercase tracking-widest mb-3 font-semibold">
                  Tempo Restante
                </div>
                <div className="flex items-center justify-center gap-3">
                  {/* Minutes */}
                  <div className="relative">
                    <div className={cn(
                      "w-24 h-28 sm:w-28 sm:h-32 rounded-2xl flex items-center justify-center",
                      "bg-gradient-to-b from-slate-800 to-slate-900",
                      "border-2 border-red-500/40",
                      "shadow-lg shadow-red-900/30"
                    )}>
                      <span className="text-5xl sm:text-6xl font-bold text-red-400 font-mono tabular-nums drop-shadow-lg">
                        {formatNumber(timeLeft.minutes)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-2 text-center font-semibold">
                      Minutos
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="flex flex-col gap-2 pb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" style={{ animationDelay: '0.5s' }} />
                  </div>

                  {/* Seconds */}
                  <div className="relative">
                    <div className={cn(
                      "w-24 h-28 sm:w-28 sm:h-32 rounded-2xl flex items-center justify-center",
                      "bg-gradient-to-b from-slate-800 to-slate-900",
                      "border-2 border-red-500/40",
                      "shadow-lg shadow-red-900/30"
                    )}>
                      <span className="text-5xl sm:text-6xl font-bold text-red-400 font-mono tabular-nums drop-shadow-lg">
                        {formatNumber(timeLeft.seconds)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-2 text-center font-semibold">
                      Segundos
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-5 px-4">
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-1000 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Message */}
              <div className="bg-slate-800/50 rounded-xl p-5 border-2 border-slate-700/50">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-base text-slate-300 leading-relaxed">
                      Muitas tentativas de login incorretas foram detectadas
                      {identifier && <span className="text-amber-400 font-semibold"> para {identifier}</span>}.
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Por segurança, aguarde o tempo indicado antes de tentar novamente.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="mb-5 flex justify-center">
                <div className="p-5 rounded-full bg-green-500/15 border-2 border-green-500/30">
                  <RefreshCw className="w-14 h-14 text-green-400" />
                </div>
              </div>
              
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-3xl font-bold text-green-400">
                  Bloqueio Expirado!
                </DialogTitle>
                <DialogDescription className="text-lg text-slate-300">
                  Você pode tentar fazer login novamente.
                </DialogDescription>
              </DialogHeader>

              <Button
                onClick={onClose}
                className="mt-6 w-full h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold"
              >
                Tentar Novamente
              </Button>
            </>
          )}
        </div>

        {/* Bottom accent */}
        <div className={cn(
          "h-2 bg-gradient-to-r",
          isExpired 
            ? "from-green-600 via-emerald-500 to-green-600"
            : "from-red-600 via-rose-500 to-red-600"
        )} />
      </DialogContent>
    </Dialog>
  );
}

import { useTheme, themes, ThemeType } from '@/contexts/ThemeContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { Check, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ThemeSelectorProps {
  onSelect?: () => void;
  compact?: boolean;
}

export function ThemeSelector({ onSelect, compact = false }: ThemeSelectorProps) {
  const { theme, setTheme, themeConfig } = useTheme();
  const { playSound, isSoundEnabled, toggleSound } = useSoundEffects();

  // Show 7 premium themes + system (including Ember)
  const availableThemes = Object.values(themes).filter(t => 
    ['tactical', 'cyber', 'crimson', 'arctic', 'sovereign', 'nexus', 'ember', 'system'].includes(t.id)
  );

  const handleSelect = (themeId: ThemeType) => {
    playSound('theme-change');
    setTheme(themeId);
    setTimeout(() => {
      onSelect?.();
    }, 150);
  };

  const handleToggleSound = () => {
    toggleSound();
    if (!isSoundEnabled) {
      setTimeout(() => {
        const audio = new AudioContext();
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.value = 500;
        gain.gain.value = 0.1;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.1);
        osc.stop(audio.currentTime + 0.1);
      }, 50);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {availableThemes.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200",
                "border-2",
                theme === t.id
                  ? "border-primary bg-primary/20 scale-105"
                  : "border-slate-600/50 bg-slate-800/40 hover:border-primary/40 hover:scale-105"
              )}
              title={t.name}
            >
              <Icon className="h-4 w-4" style={{ color: theme === t.id ? `hsl(${t.colors.primary})` : undefined }} />
            </button>
          );
        })}
        <button
          onClick={handleToggleSound}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200",
            "border-2 border-slate-600/50 bg-slate-800/40 hover:border-amber-500/40",
            isSoundEnabled && "text-amber-400 border-amber-500/40 bg-amber-500/10"
          )}
          title={isSoundEnabled ? 'Desativar sons' : 'Ativar sons'}
        >
          {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-card/95 backdrop-blur-sm rounded-xl border-2 border-primary/30 shadow-xl max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <themeConfig.icon className="h-5 w-5 text-primary" />
          <span className="text-base font-bold text-foreground">Tema Visual</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            className={cn(
              "p-2 rounded-lg transition-all duration-200 border",
              isSoundEnabled 
                ? "bg-primary/15 border-primary/40 text-primary" 
                : "bg-muted/60 border-border text-muted-foreground"
            )}
            title={isSoundEnabled ? 'Som Ativo' : 'Som Mudo'}
          >
            {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onSelect}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Theme Grid - 2 columns for cleaner look */}
      <div className="grid grid-cols-2 gap-3">
        {availableThemes.map((t) => {
          const Icon = t.icon;
          const isSelected = theme === t.id;
          
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={cn(
                "relative p-3 rounded-xl border-2 transition-all duration-200 text-left group",
                "bg-card/60 hover:bg-card/80",
                isSelected
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-border/50 hover:border-primary/30"
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
              
              <div className="flex items-center gap-2.5">
                {/* Icon with gradient */}
                <div 
                  className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, hsl(${t.colors.gradientFrom}) 0%, hsl(${t.colors.gradientTo}) 100%)` }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                
                {/* Name & Description */}
                <div className="min-w-0 flex-1">
                  <span className={cn(
                    "text-sm font-bold block truncate",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {t.name}
                    {t.id === 'ember' && (
                      <span className="ml-1 text-[9px] font-normal text-orange-400">★ LOGO</span>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {t.emoji} {t.description.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

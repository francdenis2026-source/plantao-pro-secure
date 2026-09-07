import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { X, MessageCircle, Bell, Clock, Palette, Volume2, Play } from 'lucide-react';
import { useChatSettings, ShiftReminderHours, BubbleTheme, ReminderSound, playReminderSound } from '@/hooks/useChatSettings';
import { toast } from 'sonner';

interface ChatAndAlertSettingsProps {
  agentId: string;
  onClose?: () => void;
}

const reminderOptions: { value: ShiftReminderHours; label: string; description: string }[] = [
  { value: 12, label: '12 horas', description: 'Lembrete meio dia antes' },
  { value: 24, label: '24 horas', description: 'Lembrete um dia antes' },
  { value: 48, label: '48 horas', description: 'Lembrete dois dias antes' },
];

const bubbleThemeOptions: { value: BubbleTheme; label: string; ownBg: string; otherBg: string; textColor: string }[] = [
  { value: 'amber', label: 'Âmbar', ownBg: 'bg-amber-500', otherBg: 'bg-slate-700', textColor: 'text-black' },
  { value: 'emerald', label: 'Esmeralda', ownBg: 'bg-emerald-500', otherBg: 'bg-slate-700', textColor: 'text-black' },
  { value: 'blue', label: 'Azul', ownBg: 'bg-blue-500', otherBg: 'bg-slate-700', textColor: 'text-white' },
  { value: 'purple', label: 'Roxo', ownBg: 'bg-purple-500', otherBg: 'bg-slate-700', textColor: 'text-white' },
  { value: 'rose', label: 'Rosa', ownBg: 'bg-rose-500', otherBg: 'bg-slate-700', textColor: 'text-white' },
  { value: 'cyan', label: 'Ciano', ownBg: 'bg-cyan-500', otherBg: 'bg-slate-800', textColor: 'text-black' },
];

const soundOptions: { value: ReminderSound; label: string; icon: string }[] = [
  { value: 'default', label: 'Padrão', icon: '🔔' },
  { value: 'tactical', label: 'Tático', icon: '🎖️' },
  { value: 'radio', label: 'Rádio', icon: '📻' },
  { value: 'chime', label: 'Sino', icon: '🎵' },
  { value: 'urgent', label: 'Urgente', icon: '🚨' },
  { value: 'silent', label: 'Silencioso', icon: '🔇' },
];

export function ChatAndAlertSettings({ agentId, onClose }: ChatAndAlertSettingsProps) {
  const { 
    shiftReminderHours, 
    bubbleTheme,
    reminderSounds,
    setShiftReminderHours,
    setBubbleTheme,
    setReminderSound,
    isLoaded 
  } = useChatSettings(agentId);

  const handleReminderChange = (value: string) => {
    setShiftReminderHours(Number(value) as ShiftReminderHours);
    toast.success('Configuração de lembrete salva!');
  };

  const handleBubbleThemeChange = (value: BubbleTheme) => {
    setBubbleTheme(value);
    toast.success('Tema das bolhas atualizado!');
  };

  const handleSoundChange = (type: 'shift' | 'bh' | 'leave', value: ReminderSound) => {
    setReminderSound(type, value);
    toast.success('Som de notificação atualizado!');
  };

  const previewSound = (sound: ReminderSound) => {
    playReminderSound(sound);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800/90 via-slate-800/70 to-slate-900/90 border-2 border-slate-600/50 shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-500/20 border border-cyan-500/40">
              <MessageCircle className="h-5 w-5 text-cyan-400" />
            </div>
            <span className="bg-gradient-to-r from-cyan-200 to-blue-300 bg-clip-text text-transparent font-bold">
              Chat e Alertas
            </span>
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className="text-slate-400 text-sm">
          Personalize a aparência do chat e lembretes de plantão
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bubble Theme */}
        <div className="space-y-3">
          <Label className="text-slate-200 flex items-center gap-2 text-sm font-medium">
            <Palette className="h-4 w-4 text-purple-400" />
            Tema das Bolhas de Mensagem
          </Label>
          
          {/* Real-time Preview */}
          <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 text-center">
              Preview em Tempo Real
            </p>
            <div className="space-y-2">
              {/* Other user message */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-slate-300 font-bold shrink-0">
                  A
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-medium mb-0.5 ${
                    bubbleThemeOptions.find(o => o.value === bubbleTheme)?.value === 'amber' ? 'text-amber-400' :
                    bubbleThemeOptions.find(o => o.value === bubbleTheme)?.value === 'emerald' ? 'text-emerald-400' :
                    bubbleThemeOptions.find(o => o.value === bubbleTheme)?.value === 'blue' ? 'text-blue-400' :
                    bubbleThemeOptions.find(o => o.value === bubbleTheme)?.value === 'purple' ? 'text-purple-400' :
                    bubbleThemeOptions.find(o => o.value === bubbleTheme)?.value === 'rose' ? 'text-rose-400' :
                    'text-cyan-400'
                  }`}>
                    Agente Silva
                  </span>
                  <div className={`px-3 py-1.5 rounded-lg rounded-tl-none text-xs ${
                    bubbleThemeOptions.find(o => o.value === bubbleTheme)?.otherBg
                  } text-slate-200`}>
                    Olá! Como vai o plantão hoje?
                  </div>
                </div>
              </div>
              
              {/* Own message */}
              <div className="flex items-start gap-2 justify-end">
                <div className="flex flex-col items-end">
                  <div className={`px-3 py-1.5 rounded-lg rounded-tr-none text-xs ${
                    bubbleThemeOptions.find(o => o.value === bubbleTheme)?.ownBg
                  } ${
                    bubbleThemeOptions.find(o => o.value === bubbleTheme)?.textColor
                  }`}>
                    Tudo certo por aqui! 👍
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  bubbleThemeOptions.find(o => o.value === bubbleTheme)?.ownBg
                } ${
                  bubbleThemeOptions.find(o => o.value === bubbleTheme)?.textColor
                }`}>
                  V
                </div>
              </div>
            </div>
          </div>
          
          {/* Theme selector grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {bubbleThemeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleBubbleThemeChange(option.value)}
                className={`relative p-2 rounded-lg border-2 transition-all duration-200 ${
                  bubbleTheme === option.value 
                    ? 'border-purple-400 ring-2 ring-purple-400/30 scale-105' 
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                {/* Preview bubbles */}
                <div className="flex flex-col items-center gap-1.5">
                  {/* Own message preview */}
                  <div className={`w-full h-4 rounded-full ${option.ownBg}`} />
                  {/* Other message preview */}
                  <div className={`w-full h-3 rounded-full ${option.otherBg}`} />
                </div>
                <p className={`text-[10px] text-center mt-1.5 font-medium ${
                  bubbleTheme === option.value ? 'text-purple-300' : 'text-slate-400'
                }`}>
                  {option.label}
                </p>
                {bubbleTheme === option.value && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Shift Reminder Time */}
        <div className="space-y-3 pt-2 border-t border-slate-700/50">
          <Label className="text-slate-200 flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-amber-400" />
            Antecedência do Lembrete de Plantão
          </Label>
          <RadioGroup 
            value={String(shiftReminderHours)} 
            onValueChange={handleReminderChange}
            className="space-y-2"
          >
            {reminderOptions.map((option) => (
              <div 
                key={option.value}
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                  shiftReminderHours === option.value 
                    ? 'bg-amber-500/10 border-amber-500/50' 
                    : 'bg-slate-800/30 border-slate-600/50 hover:border-slate-500'
                }`}
              >
                <RadioGroupItem 
                  value={String(option.value)} 
                  id={`reminder-${option.value}`}
                  className="border-amber-500 text-amber-500"
                />
                <div className="flex-1">
                  <Label 
                    htmlFor={`reminder-${option.value}`}
                    className={`text-sm font-medium cursor-pointer ${
                      shiftReminderHours === option.value ? 'text-amber-300' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {option.label}
                    </div>
                  </Label>
                  <p className="text-[10px] text-slate-500 mt-0.5">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Notification Sounds */}
        <div className="space-y-4 pt-2 border-t border-slate-700/50">
          <Label className="text-slate-200 flex items-center gap-2 text-sm font-medium">
            <Volume2 className="h-4 w-4 text-green-400" />
            Sons de Notificação Personalizados
          </Label>
          
          {/* Shift Sound */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <span className="text-lg">🗓️</span> Lembrete de Plantão
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => previewSound(reminderSounds.shift)}
                className="h-7 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
              >
                <Play className="h-3 w-3 mr-1" />
                Testar
              </Button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {soundOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSoundChange('shift', option.value)}
                  className={`p-2 rounded-md border text-center transition-all ${
                    reminderSounds.shift === option.value
                      ? 'bg-green-500/20 border-green-500/60 text-green-300'
                      : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span className="text-base block mb-0.5">{option.icon}</span>
                  <span className="text-[9px] font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BH Sound */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <span className="text-lg">💰</span> Alerta de Banco de Horas
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => previewSound(reminderSounds.bh)}
                className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                <Play className="h-3 w-3 mr-1" />
                Testar
              </Button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {soundOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSoundChange('bh', option.value)}
                  className={`p-2 rounded-md border text-center transition-all ${
                    reminderSounds.bh === option.value
                      ? 'bg-blue-500/20 border-blue-500/60 text-blue-300'
                      : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span className="text-base block mb-0.5">{option.icon}</span>
                  <span className="text-[9px] font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Leave Sound */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <span className="text-lg">🏖️</span> Notificação de Folgas
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => previewSound(reminderSounds.leave)}
                className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              >
                <Play className="h-3 w-3 mr-1" />
                Testar
              </Button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {soundOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSoundChange('leave', option.value)}
                  className={`p-2 rounded-md border text-center transition-all ${
                    reminderSounds.leave === option.value
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span className="text-base block mb-0.5">{option.icon}</span>
                  <span className="text-[9px] font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-[10px] text-slate-500 text-center pt-2">
          As alterações são salvas automaticamente no seu dispositivo
        </p>
      </CardContent>
    </Card>
  );
}

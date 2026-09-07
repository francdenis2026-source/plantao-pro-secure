import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BellRing } from 'lucide-react';
import { NotificationSettings } from './NotificationSettings';
import { ChatAndAlertSettings } from './ChatAndAlertSettings';

interface NotificationsAndAlertsCardProps {
  agentId: string;
}

/**
 * Unifies push notifications (browser) and chat/alert appearance/sound
 * preferences under a single "Notificações & Alertas" card.
 */
export function NotificationsAndAlertsCard({ agentId }: NotificationsAndAlertsCardProps) {
  return (
    <Card className="bg-gradient-to-br from-slate-800/90 via-slate-800/70 to-slate-900/90 border-2 border-slate-600/50 shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/40">
            <BellRing className="h-5 w-5 text-amber-400" />
          </div>
          <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent font-bold">
            Notificações &amp; Alertas
          </span>
        </CardTitle>
        <CardDescription className="text-slate-400 text-sm">
          Push do navegador, aparência do chat e sons de lembretes em um só lugar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Push notifications (browser permission + test) */}
        <NotificationSettings />
        {/* Chat bubble theme, shift reminder timing, per-event sounds */}
        <ChatAndAlertSettings agentId={agentId} />
      </CardContent>
    </Card>
  );
}

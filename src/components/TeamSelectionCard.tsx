import { Card, CardContent } from '@/components/ui/card';
import { getTeamEmblem } from '@/lib/teamAssets';

interface TeamSelectionCardProps {
  team: string;
  selected: boolean;
  onClick: () => void;
}

const teamConfig: Record<string, { bgColor: string; borderColor: string; ringColor: string; description: string }> = {
  ALFA: {
    bgColor: 'from-emerald-600/20 to-emerald-800/10',
    borderColor: 'border-emerald-500/50 hover:border-emerald-400',
    ringColor: 'ring-emerald-400',
    description: 'Escudo — primeira linha de defesa',
  },
  BRAVO: {
    bgColor: 'from-orange-600/20 to-orange-800/10',
    borderColor: 'border-orange-500/50 hover:border-orange-400',
    ringColor: 'ring-orange-400',
    description: 'Espada — força de resposta tática',
  },
  CHARLIE: {
    bgColor: 'from-blue-600/20 to-blue-800/10',
    borderColor: 'border-blue-500/50 hover:border-blue-400',
    ringColor: 'ring-blue-400',
    description: 'Mira — operações de precisão',
  },
  DELTA: {
    bgColor: 'from-amber-600/20 to-amber-800/10',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    ringColor: 'ring-amber-400',
    description: 'Raio — suporte e coordenação',
  },
};

export function TeamSelectionCard({ team, selected, onClick }: TeamSelectionCardProps) {
  const config = teamConfig[team] || teamConfig.ALFA;
  const emblem = getTeamEmblem(team);

  return (
    <Card
      className={`
        cursor-pointer transition-all duration-300 transform hover:scale-105
        bg-slate-800/50 backdrop-blur-sm
        ${selected
          ? `ring-2 ${config.ringColor} shadow-lg bg-gradient-to-br ${config.bgColor}`
          : config.borderColor + ' border'
        }
      `}
      onClick={onClick}
    >
      <CardContent className="p-6 text-center">
        <div className={`
          w-24 h-24 mx-auto mb-4 rounded-2xl flex items-center justify-center
          bg-gradient-to-br ${config.bgColor} border ${config.borderColor}
        `}>
          {emblem ? (
            <img
              src={emblem}
              alt={`Brasão Equipe ${team}`}
              className="w-20 h-20 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
            />
          ) : null}
        </div>
        <h3 className={`text-xl font-bold ${selected ? 'text-amber-400' : 'text-white'}`}>
          EQUIPE {team}
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {config.description}
        </p>
        {selected && (
          <div className="mt-3 px-3 py-1 bg-amber-500/20 rounded-full text-xs text-amber-400 font-medium inline-block">
            Selecionado
          </div>
        )}
      </CardContent>
    </Card>
  );
}


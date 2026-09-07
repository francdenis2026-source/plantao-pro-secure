import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BackButton } from '@/components/BackButton';
import { AgentsDirectoryCard, type DirectoryScope } from '@/components/agent-panel/AgentsDirectoryCard';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { Users, Building2, Globe2 } from 'lucide-react';

/**
 * Diretório Agregado
 * Página única onde qualquer agente autenticado pode alternar entre:
 * - Equipe: apenas colegas da mesma equipe do agente logado
 * - Unidade: todos os agentes da mesma unidade
 * - Sistema: agentes ativos aprovados de todas as unidades
 *
 * Substitui as duas visualizações que apareciam duplicadas dentro do
 * AgentPanel (TacticalRadar + AgentsDirectoryCard) e concentra tudo aqui.
 */
export default function Diretorio() {
  const { agent } = useAgentProfile();
  const [scope, setScope] = useState<DirectoryScope>('team');

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto w-full max-w-5xl space-y-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <BackButton />
          <h1 className="text-base sm:text-lg font-semibold text-amber-300">Diretório de Agentes</h1>
          <div className="w-8" aria-hidden />
        </div>

        <Tabs value={scope} onValueChange={(v) => setScope(v as DirectoryScope)}>
          <TabsList className="grid grid-cols-3 w-full bg-slate-800/60 border border-slate-700 h-9">
            <TabsTrigger value="team" className="text-[12px] gap-1.5">
              <Users className="h-3.5 w-3.5" /> Equipe
            </TabsTrigger>
            <TabsTrigger value="unit" className="text-[12px] gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Unidade
            </TabsTrigger>
            <TabsTrigger value="system" className="text-[12px] gap-1.5">
              <Globe2 className="h-3.5 w-3.5" /> Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="mt-3">
            <AgentsDirectoryCard
              scope="team"
              currentAgentId={agent?.id}
              title={`Equipe ${(agent as any)?.team ?? '—'}`}
              description="Somente colegas da sua equipe."
            />
          </TabsContent>

          <TabsContent value="unit" className="mt-3">
            <AgentsDirectoryCard
              scope="unit"
              currentAgentId={agent?.id}
              title="Sua Unidade"
              description="Todos os agentes cadastrados na sua unidade."
            />
          </TabsContent>

          <TabsContent value="system" className="mt-3">
            <AgentsDirectoryCard
              scope="system"
              currentAgentId={agent?.id}
              title="Sistema"
              description="Agentes ativos aprovados em todas as unidades."
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

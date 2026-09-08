import { RoundsDashboard } from '@/features/rondas/components/RoundsDashboard';
import { BackButton } from '@/components/BackButton';

export default function RondasCommand() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-lg font-bold text-foreground">Gestor de Rondas</h1>
            <p className="text-xs text-muted-foreground">Controle, acompanhamento e segurança em tempo real.</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl">
        <RoundsDashboard />
      </main>
    </div>
  );
}

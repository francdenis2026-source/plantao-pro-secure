import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound } from 'lucide-react';
import restrictedSceneAsset from '@/assets/restricted-access-scene.jpg.asset.json';
const restrictedScene = restrictedSceneAsset.url;

// Pré-carrega a imagem no momento em que o módulo é importado,
// para que ao abrir o diálogo ela já esteja em cache do browser.
if (typeof window !== 'undefined') {
  const img = new Image();
  img.decoding = 'async';
  img.src = restrictedScene;
}
interface RestrictedAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetLabel?: string;
}

export function RestrictedAccessDialog({ open, onOpenChange, targetLabel }: RestrictedAccessDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-primary/30 bg-background/95 backdrop-blur">
        {/* Full-bleed background image */}
        <div className="relative">
          <img
            src={restrictedScene}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

          <div className="relative z-10 p-6 space-y-4">
            <DialogHeader className="items-center text-center">
              <div className="mb-3 w-16 h-16 rounded-full bg-background/80 ring-2 ring-primary/40 shadow-glow flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-primary" strokeWidth={2.2} />
              </div>
              <DialogTitle className="font-serif text-2xl tracking-wide">
                Área Restrita
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Acesso a <span className="text-foreground font-semibold">{targetLabel ?? 'esta seção'}</span> exige
                <span className="text-foreground font-semibold"> credenciais da sua equipe </span>
                (ALFA · BRAVO · CHARLIE · DELTA).
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-primary font-semibold mb-1">
                <ShieldAlert className="h-4 w-4" />
                Perímetro operacional protegido
              </div>
              Nenhuma informação sensível é exibida sem autenticação. Todos os acessos são registrados.
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/');
                }}
              >
                <KeyRound className="h-4 w-4" />
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

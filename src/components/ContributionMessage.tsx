import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, Coffee } from 'lucide-react';

interface ContributionMessageProps {
  onClose: () => void;
}

export function ContributionMessage({ onClose }: ContributionMessageProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 5000; // 5 seconds
    const interval = 50; // Update every 50ms
    const decrement = (100 / duration) * interval;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - decrement;
        if (newProgress <= 0) {
          clearInterval(timer);
          setTimeout(() => {
            setVisible(false);
            onClose();
          }, 100);
          return 0;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md glass glass-border shadow-glow relative overflow-hidden">
        {/* Progress bar */}
        <div 
          className="absolute top-0 left-0 h-1 bg-gradient-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={() => {
            setVisible(false);
            onClose();
          }}
        >
          <X className="h-4 w-4" />
        </Button>

        <CardContent className="pt-8 pb-6 px-6">
          <div className="text-center space-y-4">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary shadow-glow mx-auto">
              <Coffee className="h-8 w-8 text-primary-foreground" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gradient">
              Apoie o PlantaoPro
            </h3>

            {/* Message */}
            <div className="space-y-2">
              <p className="text-muted-foreground">
                O primeiro mês é <span className="text-primary font-semibold">totalmente gratuito</span>!
              </p>
              <p className="text-sm text-muted-foreground">
                Para manter o sistema funcionando com servidor e hospedagem de qualidade, 
                pedimos uma contribuição mensal de:
              </p>
            </div>

            {/* Price */}
            <div className="py-4">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 rounded-2xl">
                <span className="text-3xl font-bold text-primary">R$ 14,99</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-red-500 animate-pulse" />
              <span>Obrigado pelo seu apoio!</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

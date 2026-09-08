import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';

/**
 * Wrapper leve para o Gestor de Rondas.
 *
 * Motivo: `RoundsManager.tsx` tem >4500 linhas e importa dezenas de dialogs,
 * hooks e assets. Quando importado estaticamente na home, ele engorda o
 * bundle inicial, aumenta o tempo de parse e consome memória em máquinas
 * mais fracas — o usuário reportou travamento.
 *
 * Este wrapper renderiza APENAS o botão gatilho (customTrigger) até que o
 * usuário efetivamente peça para abrir o Gestor. Só então o chunk pesado
 * é baixado e montado. Após montar, dispara `rounds:open` (evento global
 * já ouvido pelo próprio RoundsManager) para abrir o modal imediatamente.
 */

const RoundsManager = lazy(() =>
  import('./RoundsManager').then((m) => ({ default: m.RoundsManager })),
);

interface Props {
  customTrigger?: ReactNode;
}

export function RoundsManagerLazy({ customTrigger }: Props) {
  const [mounted, setMounted] = useState(false);

  // Também mounts quando outro componente dispara o evento global.
  useEffect(() => {
    if (mounted) return;
    const handler = () => setMounted(true);
    window.addEventListener('rounds:open', handler);
    return () => window.removeEventListener('rounds:open', handler);
  }, [mounted]);

  const handleTriggerClick = useCallback(() => {
    if (!mounted) {
      setMounted(true);
      // Dispatch várias vezes para garantir que o listener do RoundsManager
      // (registrado num useEffect após montagem assíncrona via Suspense)
      // receba o evento — evita necessidade de "clicar 2x".
      [80, 200, 400, 800, 1400].forEach((ms) => {
        setTimeout(() => window.dispatchEvent(new Event('rounds:open')), ms);
      });
    } else {
      window.dispatchEvent(new Event('rounds:open'));
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <span
        onClick={handleTriggerClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTriggerClick();
          }
        }}
        role="presentation"
        className="contents"
      >
        {customTrigger}
      </span>
    );
  }

  return (
    <Suspense fallback={<span className="contents">{customTrigger}</span>}>
      <RoundsManager customTrigger={customTrigger} />
    </Suspense>
  );
}

export default RoundsManagerLazy;

import { useEffect } from 'react';
import { useConfirm } from '@/components/ui/confirm-provider';

/**
 * Avisa o usuário quando existem alterações não salvas ao tentar sair da página
 * (reload/fechar aba) ou navegar dentro do SPA (via patch em history.pushState).
 *
 * Uso: chame no componente/formulário passando um boolean reativo `dirty`.
 * O bloqueio de navegação SPA usa `useConfirm` do ConfirmProvider.
 */
export function useUnsavedGuard(dirty: boolean) {
  const confirm = useConfirm();

  // Aviso nativo ao fechar/atualizar a aba
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Interceptação leve de navegação SPA
  useEffect(() => {
    if (!dirty) return;

    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;

    const wrap = (orig: typeof window.history.pushState) =>
      async function (this: History, ...args: Parameters<typeof orig>) {
        const ok = await confirm({
          title: 'Alterações não salvas',
          description: 'Você tem alterações que ainda não foram salvas. Deseja sair mesmo assim?',
          confirmText: 'Sair sem salvar',
          destructive: true,
        });
        if (ok) return orig.apply(this, args);
      };

    window.history.pushState = wrap(origPush) as typeof window.history.pushState;
    window.history.replaceState = wrap(origReplace) as typeof window.history.replaceState;

    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, [dirty, confirm]);
}

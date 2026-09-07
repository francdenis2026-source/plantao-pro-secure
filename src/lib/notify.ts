import { toast } from "sonner";

/**
 * notify — wrapper padronizado do sonner, alinhado ao tema tático.
 *
 * Por que usar: elimina inconsistência entre 30+ componentes que hoje
 * chamam sonner e useToast com formatos diferentes. Ícones, duração e
 * variantes agora são uniformes.
 *
 * Ex:
 *   notify.success("Plantão salvo")
 *   notify.error("Falha ao salvar", { description: err.message })
 *   notify.info("Novo turno disponível")
 *   notify.promise(saveShift(), { loading: "Salvando...", success: "Salvo", error: "Erro" })
 */
type NotifyOpts = {
  description?: string;
  duration?: number;
  id?: string | number;
  action?: { label: string; onClick: () => void };
};

const DEFAULT_DURATION = 3800;
const ERROR_DURATION = 5500;

export const notify = {
  success(message: string, opts?: NotifyOpts) {
    return toast.success(message, {
      duration: opts?.duration ?? DEFAULT_DURATION,
      ...opts,
    });
  },

  error(message: string, opts?: NotifyOpts) {
    return toast.error(message, {
      duration: opts?.duration ?? ERROR_DURATION,
      ...opts,
    });
  },

  warning(message: string, opts?: NotifyOpts) {
    return toast.warning(message, {
      duration: opts?.duration ?? DEFAULT_DURATION,
      ...opts,
    });
  },

  info(message: string, opts?: NotifyOpts) {
    return toast.info(message, {
      duration: opts?.duration ?? DEFAULT_DURATION,
      ...opts,
    });
  },

  loading(message: string, opts?: Omit<NotifyOpts, "duration">) {
    return toast.loading(message, opts);
  },

  dismiss(id?: string | number) {
    return toast.dismiss(id);
  },

  /**
   * Promise helper — mostra loading → success/error automaticamente.
   * Ideal para submits assíncronos.
   */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
  ) {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      duration: DEFAULT_DURATION,
    });
  },
};

export type Notify = typeof notify;

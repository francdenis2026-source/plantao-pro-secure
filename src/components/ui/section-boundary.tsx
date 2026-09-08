import * as React from "react";
import { Suspense } from "react";
import { LoadingState, ErrorState } from "@/components/ui/data-states";

/**
 * SectionBoundary — combina ErrorBoundary + Suspense com fallbacks táticos
 * padronizados (LoadingState / ErrorState). Uso em módulos lazy pesados.
 */
interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  label?: string;
  onReset?: () => void;
}

interface SectionErrorBoundaryState {
  error: Error | null;
}

class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[SectionBoundary]", this.props.label ?? "unknown", error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="Falha ao carregar módulo"
          description={
            this.state.error.message ||
            "Não foi possível exibir esta seção. Tente novamente."
          }
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

interface SectionBoundaryProps {
  children: React.ReactNode;
  /** Label acessível/logs. */
  label?: string;
  /** Rótulo do LoadingState. */
  loadingLabel?: string;
  /** Skeleton customizado (substitui LoadingState). */
  fallback?: React.ReactNode;
  compact?: boolean;
}

export function SectionBoundary({
  children,
  label,
  loadingLabel = "Carregando módulo...",
  fallback,
  compact,
}: SectionBoundaryProps) {
  return (
    <SectionErrorBoundary label={label}>
      <Suspense fallback={fallback ?? <LoadingState label={loadingLabel} compact={compact} />}>
        {children}
      </Suspense>
    </SectionErrorBoundary>
  );
}

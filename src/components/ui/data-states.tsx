import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2, Radar } from "lucide-react";

/**
 * LoadingState — placeholder tático padronizado.
 * Uso: <LoadingState label="Carregando plantões..." />
 */
export function LoadingState({
  label = "Carregando...",
  hint,
  className,
  compact,
}: {
  label?: string;
  hint?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "py-6" : "py-12",
        className,
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" aria-hidden />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-background/80">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-tactical text-xs uppercase tracking-[0.25em] text-primary">
          {label}
        </p>
        {hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}

/**
 * EmptyState — sem dados / sem resultado, com CTA opcional.
 */
export function EmptyState({
  icon: Icon = Radar,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-card/40 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5">
        <Icon className="h-6 w-6 text-primary/80" />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-tactical text-sm uppercase tracking-[0.2em] text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * ErrorState — falha em query/ação, com botão de retry opcional.
 */
export function ErrorState({
  title = "Falha ao carregar",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="font-tactical text-sm uppercase tracking-[0.2em] text-destructive">
          {title}
        </h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-medium uppercase tracking-wider text-destructive transition-colors hover:bg-destructive/20"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

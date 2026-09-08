import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type AuthButtonVariant = 'primary' | 'master' | 'admin' | 'register' | 'secondary';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AuthButtonVariant;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<AuthButtonVariant, string> = {
  primary:   'bg-accent text-accent-foreground hover:bg-accent/90 border-accent/40',
  master:    'bg-amber-500 text-slate-900 hover:bg-amber-400 border-amber-400/40',
  admin:     'bg-indigo-500 text-white hover:bg-indigo-400 border-indigo-400/40',
  // register handled separately (tactical SVG)
  register:  '',
  secondary: 'bg-slate-700 text-white hover:bg-slate-600 border-slate-600/40',
};

/**
 * Botão tático SVG para a ação de cadastro.
 * - Fundo em gradiente cyan/teal alinhado ao tema do diálogo de registro
 * - Cantos militares (corner brackets) desenhados em SVG
 * - Faixa diagonal sutil e brilho animado ao passar o mouse
 * - Ícone shield-check em SVG
 */
function RegisterTacticalButton({
  className,
  disabled,
  loading,
  loadingText,
  children,
  ...props
}: Omit<AuthButtonProps, 'variant' | 'icon'>) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'group relative w-full h-12 rounded-md font-semibold text-sm tracking-[0.14em] uppercase',
        'text-white overflow-hidden isolate select-none',
        'transition-transform duration-200 active:scale-[0.985]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-slate-950 focus-visible:ring-cyan-400/70',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
        className
      )}
      {...props}
    >
      {/* Base gradient */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-700 via-teal-600 to-cyan-800"
      />
      {/* Radial highlight on hover */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 55%)',
        }}
      />
      {/* Diagonal SVG pattern overlay */}
      <svg
        aria-hidden
        className="absolute inset-0 -z-10 w-full h-full opacity-25 mix-blend-overlay"
        preserveAspectRatio="none"
        viewBox="0 0 200 48"
      >
        <defs>
          <pattern id="reg-diag" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="200" height="48" fill="url(#reg-diag)" />
      </svg>

      {/* Tactical corner brackets */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 w-full h-full text-cyan-200/80"
        preserveAspectRatio="none"
        viewBox="0 0 200 48"
        fill="none"
      >
        {/* top-left */}
        <path d="M2 10 V3 H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
        {/* top-right */}
        <path d="M190 3 H198 V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
        {/* bottom-left */}
        <path d="M2 38 V45 H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
        {/* bottom-right */}
        <path d="M190 45 H198 V38" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
        {/* thin inner outline */}
        <rect x="1" y="1" width="198" height="46" rx="4" stroke="rgba(103,232,249,0.35)" strokeWidth="0.8" />
      </svg>

      {/* Animated shimmer sweep */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 -left-1/3 w-1/3',
          'bg-gradient-to-r from-transparent via-white/25 to-transparent',
          '-skew-x-12 opacity-0 group-hover:opacity-100',
          'group-hover:animate-[shimmer_1.2s_ease-in-out_infinite]'
        )}
      />

      {/* Bottom neon glow line */}
      <span
        aria-hidden
        className="absolute inset-x-3 bottom-[3px] h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent shadow-[0_0_10px_rgba(103,232,249,0.6)]"
      />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {/* Shield-check SVG icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0 text-cyan-100"
              aria-hidden
            >
              <path
                d="M12 2.5 4 5v6.2c0 4.9 3.3 8.9 8 10.3 4.7-1.4 8-5.4 8-10.3V5l-8-2.5Z"
                fill="rgba(6,182,212,0.35)"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path
                d="m8.5 12 2.5 2.5L16 9.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{children}</span>
          </>
        )}
      </span>

      {/* Outer glow ring on hover */}
      <span
        aria-hidden
        className="absolute -inset-px rounded-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow:
            '0 0 0 1px rgba(34,211,238,0.5), 0 10px 28px -8px rgba(20,184,166,0.55)',
        }}
      />
    </button>
  );
}

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ className, variant = 'primary', loading, loadingText, icon, children, disabled, ...props }, ref) => {
    if (variant === 'register') {
      return (
        <RegisterTacticalButton
          className={className}
          disabled={disabled}
          loading={loading}
          loadingText={loadingText}
          {...props}
        >
          {children}
        </RegisterTacticalButton>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'relative w-full h-11 rounded-md font-medium text-sm tracking-wide border',
          'transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-accent/60',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <span className="flex items-center justify-center gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingText || children}
            </>
          ) : (
            <>
              {icon}
              {children}
            </>
          )}
        </span>
      </button>
    );
  }
);

AuthButton.displayName = 'AuthButton';

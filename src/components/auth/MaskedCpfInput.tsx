import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  InputHTMLAttributes,
  ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCPF, validateCPF } from '@/lib/validators';

interface MaskedCpfInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange' | 'value'> {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  /** Fires when the CPF has 11 digits AND passes DV validation. */
  onValidCpf?: (cleanCpf: string) => void;
  label?: string;
  error?: string;
  rightIcon?: ReactNode;
  allowReveal?: boolean;
  /** Show inline validation glyph (green check / amber warning). */
  showValidation?: boolean;
  /** Milliseconds the value stays revealed before auto-masking. */
  revealDurationMs?: number;
}

/**
 * MaskedCpfInput — professional CPF field with SVG shield glyph.
 * - Masks digits by default (•••.•••.•••-••), separators remain visible.
 * - Applies BR formatting automatically as the user types.
 * - Validates CPF (dígito verificador) and reports via onValidCpf.
 * - Optional eye toggle: reveals for `revealDurationMs` then auto-hides.
 */
export const MaskedCpfInput = forwardRef<HTMLInputElement, MaskedCpfInputProps>(
  (
    {
      value,
      onChange,
      onValidCpf,
      label,
      error,
      rightIcon,
      allowReveal = true,
      showValidation = false,
      revealDurationMs = 3000,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [reveal, setReveal] = useState(false);
    const timerRef = useRef<number | null>(null);

    // Auto-hide reveal after N ms
    useEffect(() => {
      if (!reveal) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setReveal(false), revealDurationMs);
      return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    }, [reveal, revealDurationMs, value]);

    const cleanCpf = useMemo(() => value.replace(/\D/g, ''), [value]);
    const isComplete = cleanCpf.length === 11;
    const isValid = isComplete && validateCPF(cleanCpf);

    // Fire onValidCpf exactly once per valid CPF (cleared when it changes)
    const lastFiredRef = useRef<string | null>(null);
    useEffect(() => {
      if (isValid) {
        if (lastFiredRef.current !== cleanCpf) {
          lastFiredRef.current = cleanCpf;
          onValidCpf?.(cleanCpf);
        }
      } else {
        lastFiredRef.current = null;
      }
    }, [isValid, cleanCpf, onValidCpf]);

    const masked = useMemo(() => {
      if (reveal) return value;
      return value.replace(/\d/g, '•');
    }, [value, reveal]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
      const formatted = formatCPF(digits);
      onChange({ target: { value: formatted } });
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 11);
      onChange({ target: { value: formatCPF(digits) } });
    };

    const validationIcon = showValidation && isComplete
      ? isValid
        ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        : <AlertTriangle className="h-5 w-5 text-amber-400" />
      : null;

    const effectiveRightIcon = rightIcon ?? validationIcon;

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className={cn('relative group', disabled && 'opacity-70')}>
          {/* Left: professional SVG shield / CPF glyph */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10"
          >
            <svg
              viewBox="0 0 32 32"
              className="h-7 w-7 text-primary/85 drop-shadow-[0_0_6px_hsl(var(--primary)/0.45)]"
            >
              <defs>
                <linearGradient id="cpf-shield" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <path
                d="M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z"
                fill="url(#cpf-shield)"
                stroke="hsl(var(--primary))"
                strokeWidth="0.8"
                opacity="0.9"
              />
              <rect
                x="9"
                y="11"
                width="14"
                height="10"
                rx="1.5"
                fill="hsl(220 30% 6% / 0.85)"
                stroke="hsl(var(--primary))"
                strokeWidth="0.6"
              />
              <circle cx="12.5" cy="14.5" r="1.5" fill="hsl(var(--primary))" opacity="0.9" />
              <rect x="15.5" y="13.5" width="6" height="0.9" rx="0.4" fill="hsl(var(--primary))" opacity="0.75" />
              <rect x="15.5" y="15.4" width="4.5" height="0.7" rx="0.35" fill="hsl(var(--primary))" opacity="0.55" />
              <rect x="10.5" y="18" width="11" height="0.8" rx="0.4" fill="hsl(var(--primary))" opacity="0.5" />
            </svg>
          </div>

          {/* Masked visual overlay */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 flex items-center justify-center',
              'font-mono tracking-[0.25em] text-xl text-white',
              'pl-12 pr-12',
            )}
          >
            {masked ? (
              <span className="[text-shadow:0_0_10px_hsl(var(--primary)/0.35)]">{masked}</span>
            ) : (
              <span className="text-slate-500 tracking-widest">•••.•••.•••-••</span>
            )}
          </div>

          {/* Real input (transparent text, visible caret) */}
          <input
            ref={ref}
            {...props}
            disabled={disabled}
            value={value}
            onChange={handleChange}
            onPaste={handlePaste}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            className={cn(
              'relative w-full rounded-xl h-14 pl-12 pr-12',
              'bg-slate-800/80 border-2 border-slate-700/80',
              'focus:border-primary/70 focus:ring-0 focus:outline-none transition-colors duration-150',
              'text-transparent selection:bg-transparent caret-primary',
              'text-center font-mono tracking-[0.25em] text-xl',
              error && 'border-red-500/60 focus:border-red-500/70',
              disabled && 'cursor-not-allowed',
              className,
            )}
          />

          {/* Right: reveal toggle or custom / validation icon */}
          {effectiveRightIcon ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">{effectiveRightIcon}</div>
          ) : allowReveal ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setReveal((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 grid place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              aria-label={reveal ? 'Ocultar CPF' : 'Mostrar CPF por alguns segundos'}
              title={reveal ? 'Ocultar' : `Mostrar por ${Math.round(revealDurationMs / 1000)}s`}
            >
              {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          ) : null}
        </div>
        {error && <p className="text-sm text-red-400 font-medium">{error}</p>}
      </div>
    );
  },
);

MaskedCpfInput.displayName = 'MaskedCpfInput';

import * as React from "react";
import { cn } from "@/lib/utils";

interface CompactTimeFieldProps {
  id?: string;
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  step?: number; // minute granularity, default 5
}

/**
 * Professional SVG-based HH:MM stepper.
 * - Segmented digits with up/down chevron controls (pure SVG).
 * - Digits are keyboard-editable (numeric input) and tap-friendly on mobile.
 * - No native time/clock wheel. Fits <320px screens.
 */
export function CompactTimeField({
  id,
  value,
  onChange,
  className,
  disabled,
  step = 5,
}: CompactTimeFieldProps) {
  const parse = (v: string): [number, number] => {
    const [hh = "0", mm = "0"] = (v || "00:00").split(":");
    const h = Math.max(0, Math.min(23, parseInt(hh, 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(mm, 10) || 0));
    return [h, m];
  };
  const [h, m] = parse(value);
  const emit = (nh: number, nm: number) => {
    const H = ((nh % 24) + 24) % 24;
    const M = ((nm % 60) + 60) % 60;
    onChange(`${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`);
  };

  const st = Math.max(1, Math.min(30, step));

  // Opções rápidas de minutos (granularidade = step, default 5).
  const minuteOptions = React.useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 60; i += st) out.push(i);
    return out;
  }, [st]);

  // Opções de horas (00–23) para dropdown rápido.
  const hourOptions = React.useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  return (
    <div
      id={id}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 min-h-11 w-full shadow-inner shadow-black/30",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
      role="group"
      aria-label="Seletor de hora"
    >
      <Segment
        label="Hora"
        value={h}
        max={23}
        options={hourOptions}
        onInc={() => emit(h + 1, m)}
        onDec={() => emit(h - 1, m)}
        onType={(n) => emit(n, m)}
        onPick={(n) => emit(n, m)}
        disabled={disabled}
      />
      <span aria-hidden className="text-amber-400 font-mono font-bold text-lg leading-none pb-0.5">
        :
      </span>
      <Segment
        label="Minuto"
        value={m}
        max={59}
        options={minuteOptions}
        onInc={() => emit(h, m + st)}
        onDec={() => emit(h, m - st)}
        onType={(n) => emit(h, n)}
        onPick={(n) => emit(h, n)}
        disabled={disabled}
      />
    </div>
  );
}

function Chevron({ dir }: { dir: "up" | "down" }) {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 14 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="text-amber-400"
    >
      <path
        d={dir === "up" ? "M2 8 L7 3 L12 8" : "M2 2 L7 7 L12 2"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Segment({
  label,
  value,
  max,
  options,
  onInc,
  onDec,
  onType,
  onPick,
  disabled,
}: {
  label: string;
  value: number;
  max: number;
  options: number[];
  onInc: () => void;
  onDec: () => void;
  onType: (n: number) => void;
  onPick: (n: number) => void;
  disabled?: boolean;
}) {
  const [buf, setBuf] = React.useState<string>(String(value).padStart(2, "0"));
  React.useEffect(() => {
    setBuf(String(value).padStart(2, "0"));
  }, [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    if (isNaN(n)) {
      setBuf(String(value).padStart(2, "0"));
      return;
    }
    const clamped = Math.max(0, Math.min(max, n));
    onType(clamped);
  };

  const btnCls =
    "flex items-center justify-center h-5 w-6 rounded hover:bg-amber-500/15 active:bg-amber-500/25 focus:outline-none focus:ring-1 focus:ring-amber-400/60 transition-colors";

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        aria-label={`Aumentar ${label}`}
        onClick={onInc}
        disabled={disabled}
        className={btnCls}
        tabIndex={-1}
      >
        <Chevron dir="up" />
      </button>
      <div className="relative">
        <input
          aria-label={label}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={buf}
          onChange={(e) => setBuf(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onInc();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onDec();
            } else if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          disabled={disabled}
          className="w-9 bg-transparent text-slate-100 font-mono tabular-nums text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-amber-400/60 rounded"
        />
        {/* Dropdown nativo sobreposto — abre lista de opções rápidas ao tocar/clicar.
            Fica invisível mas cobre o input para permitir seleção pelo picker do SO. */}
        <select
          aria-label={`Selecionar ${label}`}
          value={String(options.includes(value) ? value : options[0] ?? 0)}
          onChange={(e) => onPick(parseInt(e.target.value, 10))}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {String(n).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        aria-label={`Diminuir ${label}`}
        onClick={onDec}
        disabled={disabled}
        className={btnCls}
        tabIndex={-1}
      >
        <Chevron dir="down" />
      </button>
    </div>
  );
}

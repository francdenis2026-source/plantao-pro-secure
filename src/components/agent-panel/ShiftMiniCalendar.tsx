import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ShiftMiniCalendarShift = {
  id: string;
  shift_date: string; // yyyy-MM-dd
};

interface ShiftMiniCalendarProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  shifts: ShiftMiniCalendarShift[];
  onDayWithShiftClick?: (shiftId: string) => void;
  onDayClick?: (date: Date) => void;
  className?: string;
  /** Highlight style: compact (inline row) or grid (full month) */
  variant?: "grid" | "compact";
}

export function ShiftMiniCalendar({
  month,
  onMonthChange,
  shifts,
  onDayWithShiftClick,
  onDayClick,
  className,
  variant = "grid",
}: ShiftMiniCalendarProps) {
  const shiftByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of shifts) map.set(s.shift_date, s.id);
    return map;
  }, [shifts]);

  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart, { locale: ptBR });
  const gridEnd = endOfWeek(endOfMonth(month), { locale: ptBR });

  const days = useMemo(() => {
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  const weekDays = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      labels.push(format(addDays(gridStart, i), "EEEEE", { locale: ptBR }).toUpperCase());
    }
    return labels;
  }, [gridStart]);

  const handlePrev = () => onMonthChange(subMonths(month, 1));
  const handleNext = () => onMonthChange(addMonths(month, 1));

  const handleDayPress = (d: Date) => {
    const key = format(d, "yyyy-MM-dd");
    const shiftId = shiftByDate.get(key);
    if (shiftId && onDayWithShiftClick) {
      onDayWithShiftClick(shiftId);
    } else if (onDayClick) {
      onDayClick(d);
    }
  };

  // COMPACT variant: horizontal scrollable list of upcoming shifts only
  if (variant === "compact") {
    const upcomingShifts = shifts
      .filter((s) => new Date(s.shift_date) >= new Date(new Date().toDateString()))
      .slice(0, 8);

    return (
      <div className={cn("space-y-1.5 md:space-y-2 min-w-0", className)}>
        <div className="flex items-center gap-2">
          <span className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
            Próximos Plantões
          </span>
          <div className="flex-1 h-px bg-slate-700/50" />
        </div>
        <div
          className="flex gap-1 md:gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
        >
          {upcomingShifts.length === 0 ? (
            <span className="text-[11px] md:text-xs text-slate-500">Sem plantões</span>
          ) : (
            upcomingShifts.map((s) => {
              const d = new Date(s.shift_date);
              const today = isToday(d);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onDayWithShiftClick?.(s.id)}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center rounded-lg border px-1.5 py-1 md:px-2.5 md:py-1.5 transition-all min-w-[38px] md:min-w-[48px] max-w-[52px] md:max-w-none",
                    today
                      ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300"
                      : "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                  )}
                >
                  <span className="text-[8px] md:text-[9px] font-medium uppercase tracking-wider truncate max-w-full">
                    {format(d, "EEE", { locale: ptBR })}
                  </span>
                  <span className="text-xs md:text-sm font-black tabular-nums leading-none">{format(d, "dd")}</span>
                  <span className="text-[8px] md:text-[9px] text-slate-400 truncate max-w-full">{format(d, "MMM", { locale: ptBR })}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }


  // GRID variant: full month view
  return (
    <div className={cn("rounded-lg min-w-0", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 md:mb-2 gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="h-6 w-6 md:h-7 md:w-7 text-slate-400 hover:text-white shrink-0"
        >
          <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>

        <span className="text-[11px] md:text-xs font-bold tracking-wide text-slate-200 uppercase truncate">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="h-6 w-6 md:h-7 md:w-7 text-slate-400 hover:text-white shrink-0"
        >
          <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
      </div>

      {/* Scroll wrapper: keeps the 7-column grid intact but scrolls horizontally
          if the parent gets narrower than the min-width. */}
      <div className="overflow-x-auto scrollbar-none -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="min-w-[224px] md:min-w-0">
          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekDays.map((w, i) => (
              <div key={i} className="text-center text-[8px] md:text-[9px] font-bold text-slate-500 uppercase truncate">
                {w}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const shiftId = shiftByDate.get(key);
              const inMonth = isSameMonth(d, monthStart);
              const today = isToday(d);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDayPress(d)}
                  className={cn(
                    "h-5 md:h-6 w-full rounded text-[9px] md:text-[10px] font-semibold tabular-nums transition-colors",
                    !inMonth && "opacity-30",
                    today && "ring-1 ring-amber-400/70",
                    shiftId
                      ? "bg-amber-500/25 text-amber-200 hover:bg-amber-500/40"
                      : "bg-slate-800/40 text-slate-400 hover:bg-slate-700/60"
                  )}
                >
                  {format(d, "d")}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 md:gap-4 mt-1.5 md:mt-2 text-[8px] md:text-[9px] whitespace-nowrap overflow-x-auto scrollbar-none -mx-1 px-1">
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-sm bg-amber-500/25 border border-amber-500/50" />
          <span className="text-slate-400">Plantão</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-sm ring-1 ring-amber-400/70" />
          <span className="text-slate-400">Hoje</span>
        </div>
      </div>

    </div>
  );
}


// Simple date picker grid for configuration dialogs (no shift data needed)
interface SimpleDatePickerProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  selected?: Date;
  onSelect: (date: Date) => void;
  className?: string;
}

export function SimpleDatePicker({
  month,
  onMonthChange,
  selected,
  onSelect,
  className,
}: SimpleDatePickerProps) {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart, { locale: ptBR });
  const gridEnd = endOfWeek(endOfMonth(month), { locale: ptBR });

  const days = useMemo(() => {
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  const weekDays = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      labels.push(format(addDays(gridStart, i), "EEE", { locale: ptBR }).substring(0, 3).toUpperCase());
    }
    return labels;
  }, [gridStart]);

  const handlePrev = () => onMonthChange(subMonths(month, 1));
  const handleNext = () => onMonthChange(addMonths(month, 1));

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-600 bg-slate-800/70 p-2 md:p-3",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="h-7 w-7 md:h-8 md:w-8 text-slate-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-xs md:text-sm font-bold tracking-wide text-slate-100 capitalize">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="h-7 w-7 md:h-8 md:w-8 text-slate-400 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map((w, i) => (
          <div key={i} className="text-center text-[9px] md:text-[10px] font-bold text-slate-400">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const inMonth = isSameMonth(d, monthStart);
          const today = isToday(d);
          const isSelected = key === selectedKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(d)}
              className={cn(
                "h-7 md:h-8 w-full rounded-md text-[11px] md:text-xs font-semibold tabular-nums transition-all",
                !inMonth && "opacity-30",
                today && !isSelected && "ring-1 ring-amber-400/60",
                isSelected
                  ? "bg-amber-500 text-black font-black shadow-lg shadow-amber-500/30"
                  : "bg-slate-700/50 text-slate-200 hover:bg-slate-600/70",
              )}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

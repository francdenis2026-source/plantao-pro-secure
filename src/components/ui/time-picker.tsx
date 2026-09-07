import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function TimePicker({
  value,
  onChange,
  className,
  placeholder = "Selecionar hora",
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Parse hours and minutes from value
  const [hours, minutes] = React.useMemo(() => {
    if (!value) return ["00", "00"];
    const parts = value.split(":");
    return [parts[0] || "00", parts[1] || "00"];
  }, [value]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let h = parseInt(e.target.value) || 0;
    if (h > 23) h = 23;
    if (h < 0) h = 0;
    const newHours = h.toString().padStart(2, "0");
    onChange(`${newHours}:${minutes}`);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let m = parseInt(e.target.value) || 0;
    if (m > 59) m = 59;
    if (m < 0) m = 0;
    const newMinutes = m.toString().padStart(2, "0");
    onChange(`${hours}:${newMinutes}`);
  };

  const incrementHours = () => {
    let h = parseInt(hours) + 1;
    if (h > 23) h = 0;
    onChange(`${h.toString().padStart(2, "0")}:${minutes}`);
  };

  const decrementHours = () => {
    let h = parseInt(hours) - 1;
    if (h < 0) h = 23;
    onChange(`${h.toString().padStart(2, "0")}:${minutes}`);
  };

  const incrementMinutes = () => {
    let m = parseInt(minutes) + 5;
    if (m > 59) m = 0;
    onChange(`${hours}:${m.toString().padStart(2, "0")}`);
  };

  const decrementMinutes = () => {
    let m = parseInt(minutes) - 5;
    if (m < 0) m = 55;
    onChange(`${hours}:${m.toString().padStart(2, "0")}`);
  };

  // Format display (24h format)
  const formatDisplayTime = (time: string) => {
    if (!time) return placeholder;
    return time;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal bg-slate-700 border-slate-600 hover:bg-slate-600",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            {value ? formatDisplayTime(value) : placeholder}
          </span>
          <span className="text-xs text-slate-400 font-mono">{value || "--:--"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-4 bg-slate-800 border-slate-700"
        align="start"
      >
        <div className="space-y-3">
          <Label className="text-slate-300 text-sm">Horário (24h)</Label>
          <div className="flex items-center gap-2">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={incrementHours}
                className="text-amber-400 hover:text-amber-300 p-1"
              >
                ▲
              </button>
              <Input
                type="number"
                min={0}
                max={23}
                value={hours}
                onChange={handleHoursChange}
                className="w-14 text-center font-mono text-lg bg-slate-700 border-slate-600"
              />
              <button
                type="button"
                onClick={decrementHours}
                className="text-amber-400 hover:text-amber-300 p-1"
              >
                ▼
              </button>
              <span className="text-xs text-slate-500 mt-1">Hora</span>
            </div>
            
            <span className="text-2xl font-bold text-amber-400">:</span>
            
            {/* Minutes */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={incrementMinutes}
                className="text-amber-400 hover:text-amber-300 p-1"
              >
                ▲
              </button>
              <Input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={handleMinutesChange}
                className="w-14 text-center font-mono text-lg bg-slate-700 border-slate-600"
              />
              <button
                type="button"
                onClick={decrementMinutes}
                className="text-amber-400 hover:text-amber-300 p-1"
              >
                ▼
              </button>
              <span className="text-xs text-slate-500 mt-1">Min</span>
            </div>
          </div>
          
          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-700">
            {["00:00", "06:00", "12:00", "18:00", "07:00", "19:00", "22:00", "23:00"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onChange(preset);
                  setOpen(false);
                }}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  value === preset
                    ? "bg-amber-500 text-black font-medium"
                    : "bg-slate-700 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400"
                )}
              >
                {preset}
              </button>
            ))}
          </div>
          
          <Button
            size="sm"
            className="w-full bg-amber-500 hover:bg-amber-600 text-black"
            onClick={() => setOpen(false)}
          >
            Confirmar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

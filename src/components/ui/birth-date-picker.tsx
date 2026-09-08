import * as React from "react";
import { format, getDaysInMonth, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown, Cake } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BirthDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
  disabled?: boolean;
}

const months = [
  { value: "0", label: "Janeiro" },
  { value: "1", label: "Fevereiro" },
  { value: "2", label: "Março" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Maio" },
  { value: "5", label: "Junho" },
  { value: "6", label: "Julho" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Setembro" },
  { value: "9", label: "Outubro" },
  { value: "10", label: "Novembro" },
  { value: "11", label: "Dezembro" },
];

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function generateYears(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear; year >= 1940; year--) {
    years.push(year.toString());
  }
  return years;
}

function generateDays(month: number, year: number): string[] {
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const days: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day.toString());
  }
  return days;
}

export function BirthDatePicker({ value, onChange, className, disabled }: BirthDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Initialize with current value or defaults
  const [selectedDay, setSelectedDay] = React.useState<string>(
    value ? value.getDate().toString() : ""
  );
  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    value ? value.getMonth().toString() : ""
  );
  const [selectedYear, setSelectedYear] = React.useState<string>(
    value ? value.getFullYear().toString() : ""
  );

  // Update internal state when value changes externally
  React.useEffect(() => {
    if (value && isValid(value)) {
      setSelectedDay(value.getDate().toString());
      setSelectedMonth(value.getMonth().toString());
      setSelectedYear(value.getFullYear().toString());
    }
  }, [value]);

  const years = React.useMemo(() => generateYears(), []);
  const days = React.useMemo(() => {
    if (selectedMonth && selectedYear) {
      return generateDays(parseInt(selectedMonth), parseInt(selectedYear));
    }
    return generateDays(0, new Date().getFullYear());
  }, [selectedMonth, selectedYear]);

  // Validate and adjust day if month/year changes
  React.useEffect(() => {
    if (selectedDay && selectedMonth && selectedYear) {
      const maxDays = getDaysInMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
      if (parseInt(selectedDay) > maxDays) {
        setSelectedDay(maxDays.toString());
      }
    }
  }, [selectedMonth, selectedYear, selectedDay]);

  const handleConfirm = () => {
    if (selectedDay && selectedMonth && selectedYear) {
      const newDate = new Date(
        parseInt(selectedYear),
        parseInt(selectedMonth),
        parseInt(selectedDay)
      );
      
      // Validate date is not in the future
      if (newDate > new Date()) {
        return;
      }
      
      onChange(newDate);
      setOpen(false);
    }
  };

  const handleClear = () => {
    setSelectedDay("");
    setSelectedMonth("");
    setSelectedYear("");
    onChange(undefined);
    setOpen(false);
  };

  const isComplete = selectedDay && selectedMonth && selectedYear;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-12 bg-slate-900/50 border-slate-600 hover:bg-slate-800/70 hover:border-slate-500 px-3 gap-2 min-w-0",
            !value && "text-slate-500",
            className
          )}
        >
          <Cake className="h-5 w-5 text-pink-500 shrink-0" />
          {value && isValid(value) ? (
            <div className="flex items-center justify-between w-full min-w-0 gap-2">
              <span className="text-white font-medium truncate text-sm sm:text-base">
                {format(value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-bold">
                {calculateAge(value)} anos
              </span>
            </div>
          ) : (
            <span className="truncate text-sm sm:text-base">Selecione a data de nascimento</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4 bg-slate-800 border-slate-600 pointer-events-auto" 
        align="start"
        sideOffset={8}
      >
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="font-semibold text-white mb-1">Data de Nascimento</h4>
            <p className="text-xs text-slate-400">Selecione dia, mês e ano</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Day Select */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Dia</label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-10">
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 max-h-48">
                  {days.map((day) => (
                    <SelectItem 
                      key={day} 
                      value={day}
                      className="text-white hover:bg-slate-600 focus:bg-slate-600"
                    >
                      {day.padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Select */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Mês</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-10">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 max-h-48">
                  {months.map((month) => (
                    <SelectItem 
                      key={month.value} 
                      value={month.value}
                      className="text-white hover:bg-slate-600 focus:bg-slate-600"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Select */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Ano</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-10">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 max-h-48">
                  {years.map((year) => (
                    <SelectItem 
                      key={year} 
                      value={year}
                      className="text-white hover:bg-slate-600 focus:bg-slate-600"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {isComplete && (
            <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600 text-center">
              <p className="text-white font-medium">
                {format(
                  new Date(parseInt(selectedYear), parseInt(selectedMonth), parseInt(selectedDay)),
                  "dd 'de' MMMM 'de' yyyy",
                  { locale: ptBR }
                )}
              </p>
              <p className="text-pink-400 text-sm mt-1">
                {calculateAge(new Date(parseInt(selectedYear), parseInt(selectedMonth), parseInt(selectedDay)))} anos de idade
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="flex-1 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Limpar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!isComplete}
              className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

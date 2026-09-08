import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BHEvolutionChartProps {
  agentId: string;
}

interface ChartDataPoint {
  label: string;
  month: string;
  fortnight: number;
  hours: number;
  entries: number;
}

export function BHEvolutionChart({ agentId }: BHEvolutionChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [agentId]);

  const fetchChartData = async () => {
    if (!agentId) return;
    
    setIsLoading(true);
    try {
      const { data: entries, error } = await supabase
        .from('overtime_bank')
        .select('hours, description, created_at')
        .eq('agent_id', agentId);

      if (error) throw error;

      // Generate last 6 months with fortnights
      const now = new Date();
      const dataMap = new Map<string, { hours: number; entries: number }>();

      // Initialize all fortnights for last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'MM/yyyy');
        dataMap.set(`${monthKey}-1`, { hours: 0, entries: 0 });
        dataMap.set(`${monthKey}-2`, { hours: 0, entries: 0 });
      }

      // Process entries
      (entries || []).forEach((entry) => {
        if (entry.description) {
          const match = entry.description.match(/BH - (\d{2})\/(\d{2}\/\d{4})/);
          if (match) {
            const day = parseInt(match[1], 10);
            const monthYear = match[2];
            const fortnight = day <= 15 ? 1 : 2;
            const key = `${monthYear}-${fortnight}`;
            
            if (dataMap.has(key)) {
              const current = dataMap.get(key)!;
              dataMap.set(key, {
                hours: current.hours + (entry.hours || 0),
                entries: current.entries + 1,
              });
            }
          }
        }
      });

      // Convert to chart data
      const result: ChartDataPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'MM/yyyy');
        const monthLabel = format(date, 'MMM', { locale: ptBR }).toUpperCase();
        
        const first = dataMap.get(`${monthKey}-1`) || { hours: 0, entries: 0 };
        const second = dataMap.get(`${monthKey}-2`) || { hours: 0, entries: 0 };
        
        result.push({
          label: `${monthLabel} 1ª`,
          month: monthLabel,
          fortnight: 1,
          hours: first.hours,
          entries: first.entries,
        });
        
        result.push({
          label: `${monthLabel} 2ª`,
          month: monthLabel,
          fortnight: 2,
          hours: second.hours,
          entries: second.entries,
        });
      }

      setChartData(result);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    hours: {
      label: 'Horas',
      color: 'hsl(var(--primary))',
    },
  };

  const getBarColor = (value: number) => {
    if (value > 0) return '#10b981'; // emerald-500
    if (value < 0) return '#f43f5e'; // rose-500
    return '#475569'; // slate-600
  };

  const totalHours = chartData.reduce((acc, d) => acc + d.hours, 0);
  const isPositive = totalHours >= 0;

  // Custom tooltip without white flash
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as ChartDataPoint;
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 shadow-2xl">
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-slate-200 text-xs">{data.label}</span>
          <div className="flex items-center gap-2">
            {data.hours >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            )}
            <span className={`text-base font-bold ${data.hours >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {data.hours >= 0 ? '+' : ''}{data.hours.toFixed(1)}h
            </span>
          </div>
          <span className="text-slate-500 text-[10px]">{data.entries} {data.entries === 1 ? 'registro' : 'registros'}</span>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50 shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
            </div>
            Evolução de BH
          </CardTitle>
          {!isLoading && chartData.length > 0 && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isPositive 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? '+' : ''}{totalHours.toFixed(1)}h
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Últimos 6 meses por quinzena</p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-[160px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <span className="text-xs text-slate-500">Carregando dados...</span>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[160px] flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhum dado disponível</p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 15, right: 5, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="zeroGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748b" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#475569" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 8, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}h`}
                />
                <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'transparent' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Bar 
                  dataKey="hours" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.hours > 0 
                          ? 'url(#positiveGradient)' 
                          : entry.hours < 0 
                            ? 'url(#negativeGradient)' 
                            : 'url(#zeroGradient)'
                      }
                      style={{ outline: 'none', cursor: 'default' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
        
        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-slate-700/30 flex items-center justify-center gap-6 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-emerald-500 to-emerald-600" />
            <span className="text-slate-400">Positivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-rose-500 to-rose-600" />
            <span className="text-slate-400">Negativo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-slate-500 to-slate-600" />
            <span className="text-slate-400">Zero</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface OvertimeData {
  name: string;
  hours: number;
}

export function OvertimeChart() {
  const [data, setData] = useState<OvertimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOvertimeData();
  }, []);

  const fetchOvertimeData = async () => {
    try {
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name')
        .eq('is_active', true)
        .limit(10);

      if (!agents) return;

      const overtimeByAgent = await Promise.all(
        agents.map(async (agent) => {
          const { data: overtime } = await supabase
            .from('overtime_bank')
            .select('hours, operation_type')
            .eq('agent_id', agent.id);

          let balance = 0;
          if (overtime) {
            balance = overtime.reduce((acc, item) => {
              return item.operation_type === 'credit'
                ? acc + Number(item.hours)
                : acc - Number(item.hours);
            }, 0);
          }

          return {
            name: agent.name.split(' ')[0], // First name only
            hours: balance,
          };
        })
      );

      setData(overtimeByAgent.filter(d => d.hours !== 0));
    } catch (error) {
      console.error('Error fetching overtime data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBarColor = (hours: number) => {
    if (hours >= 0) return 'hsl(142, 76%, 36%)'; // success
    return 'hsl(0, 72%, 51%)'; // destructive
  };

  // Calculate dynamic height based on data count
  const chartHeight = Math.max(200, Math.min(280, data.length * 40 + 60));

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          Banco de Horas por Agente
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">
              Carregando...
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado de banco de horas disponível
          </div>
        ) : (
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data} 
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                barSize={Math.max(20, Math.min(40, 200 / data.length))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={data.length > 6 ? -45 : 0}
                  textAnchor={data.length > 6 ? "end" : "middle"}
                  height={data.length > 6 ? 60 : 30}
                />
                <YAxis
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}h`}
                  width={45}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 11%)',
                    border: '1px solid hsl(222, 30%, 20%)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    color: 'hsl(210, 40%, 98%)',
                  }}
                  itemStyle={{ color: 'hsl(210, 40%, 98%)' }}
                  labelStyle={{ color: 'hsl(210, 40%, 90%)', fontWeight: 500 }}
                  formatter={(value: number) => [`${value.toFixed(1)}h`, 'Saldo']}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.hours)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

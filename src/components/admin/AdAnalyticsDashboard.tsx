import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { 
  Eye, MousePointer, Clock, TrendingUp, 
  RefreshCw, BarChart3, PieChart as PieChartIcon,
  Target, Loader2 
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdStats {
  ad_id: string;
  ad_name: string;
  total_views: number;
  total_clicks: number;
  total_duration: number;
  completed_views: number;
  conversions: number;
  ctr: number;
  avg_view_time: number;
}

interface DailyStats {
  date: string;
  views: number;
  clicks: number;
  conversions: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export function AdAnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [adStats, setAdStats] = useState<AdStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [avgViewTime, setAvgViewTime] = useState(0);
  const [overallCTR, setOverallCTR] = useState(0);
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      // Fetch all ad views with ad info
      const { data: viewsData, error: viewsError } = await supabase
        .from('ad_views')
        .select(`
          id,
          ad_id,
          view_duration_seconds,
          clicked,
          completed,
          converted,
          viewed_at,
          advertisements (
            id,
            name
          )
        `)
        .gte('viewed_at', startDate.toISOString())
        .order('viewed_at', { ascending: true });

      if (viewsError) throw viewsError;

      const views = viewsData || [];

      // Calculate totals
      const totals = views.reduce(
        (acc, view) => ({
          views: acc.views + 1,
          clicks: acc.clicks + (view.clicked ? 1 : 0),
          duration: acc.duration + (view.view_duration_seconds || 0),
          conversions: acc.conversions + (view.converted ? 1 : 0),
        }),
        { views: 0, clicks: 0, duration: 0, conversions: 0 }
      );

      setTotalViews(totals.views);
      setTotalClicks(totals.clicks);
      setAvgViewTime(totals.views > 0 ? Math.round(totals.duration / totals.views) : 0);
      setOverallCTR(totals.views > 0 ? Math.round((totals.clicks / totals.views) * 100 * 10) / 10 : 0);

      // Group by ad
      const adMap = new Map<string, AdStats>();
      views.forEach((view: any) => {
        const adId = view.ad_id;
        const adName = view.advertisements?.name || 'Desconhecido';
        
        if (!adMap.has(adId)) {
          adMap.set(adId, {
            ad_id: adId,
            ad_name: adName,
            total_views: 0,
            total_clicks: 0,
            total_duration: 0,
            completed_views: 0,
            conversions: 0,
            ctr: 0,
            avg_view_time: 0,
          });
        }
        
        const stats = adMap.get(adId)!;
        stats.total_views++;
        if (view.clicked) stats.total_clicks++;
        stats.total_duration += view.view_duration_seconds || 0;
        if (view.completed) stats.completed_views++;
        if (view.converted) stats.conversions++;
      });

      // Calculate CTR and avg time for each ad
      const adStatsArray = Array.from(adMap.values()).map(stats => ({
        ...stats,
        ctr: stats.total_views > 0 ? Math.round((stats.total_clicks / stats.total_views) * 100 * 10) / 10 : 0,
        avg_view_time: stats.total_views > 0 ? Math.round(stats.total_duration / stats.total_views) : 0,
      }));
      
      setAdStats(adStatsArray.sort((a, b) => b.total_views - a.total_views));

      // Group by date for daily chart
      const dateMap = new Map<string, DailyStats>();
      views.forEach((view: any) => {
        const date = format(new Date(view.viewed_at), 'yyyy-MM-dd');
        
        if (!dateMap.has(date)) {
          dateMap.set(date, { date, views: 0, clicks: 0, conversions: 0 });
        }
        
        const dayStats = dateMap.get(date)!;
        dayStats.views++;
        if (view.clicked) dayStats.clicks++;
        if (view.converted) dayStats.conversions++;
      });

      // Fill in missing dates
      const dailyArray: DailyStats[] = [];
      for (let i = parseInt(dateRange) - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyArray.push(dateMap.get(date) || { date, views: 0, clicks: 0, conversions: 0 });
      }

      setDailyStats(dailyArray);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    views: { label: 'Visualizações', color: 'hsl(var(--chart-1))' },
    clicks: { label: 'Cliques', color: 'hsl(var(--chart-2))' },
    conversions: { label: 'Conversões', color: 'hsl(var(--chart-3))' },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            Analytics de Propagandas
          </h3>
          <p className="text-sm text-muted-foreground">Métricas de performance dos anúncios</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-900/30 to-slate-800/50 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Eye className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Visualizações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-900/30 to-slate-800/50 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <MousePointer className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalClicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Cliques</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900/30 to-slate-800/50 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overallCTR}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Clique (CTR)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/30 to-slate-800/50 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{avgViewTime}s</p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Trend */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-base">Tendência Diária</CardTitle>
            <CardDescription>Visualizações e cliques por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 3 }}
                    name="Visualizações"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 3 }}
                    name="Cliques"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Performance by Ad */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-base">Performance por Anúncio</CardTitle>
            <CardDescription>Comparativo de visualizações</CardDescription>
          </CardHeader>
          <CardContent>
            {adStats.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <p className="text-sm">Sem dados para exibir</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adStats.slice(0, 6)} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis 
                      dataKey="ad_name" 
                      type="category" 
                      width={100}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_views" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Visualizações" />
                    <Bar dataKey="total_clicks" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Cliques" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-400" />
            Detalhes por Anúncio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {adStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum dado de visualização encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Anúncio</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Views</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Cliques</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">CTR</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Tempo Médio</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Completos</th>
                  </tr>
                </thead>
                <tbody>
                  {adStats.map((stat, index) => (
                    <tr key={stat.ad_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-white font-medium">{stat.ad_name}</span>
                        </div>
                      </td>
                      <td className="text-right py-2 px-3 text-white">{stat.total_views.toLocaleString()}</td>
                      <td className="text-right py-2 px-3 text-cyan-400">{stat.total_clicks.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">
                        <Badge 
                          variant="outline" 
                          className={stat.ctr >= 5 ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-600 text-slate-400'}
                        >
                          {stat.ctr}%
                        </Badge>
                      </td>
                      <td className="text-right py-2 px-3 text-amber-400">{stat.avg_view_time}s</td>
                      <td className="text-right py-2 px-3 text-purple-400">{stat.completed_views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdAnalyticsDashboard;

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, ShieldCheck, MapPin, Users, CalendarClock } from "lucide-react";
import { toast } from "sonner";

interface UnitRow {
  id: string;
  name: string;
  municipality: string | null;
  director_name: string | null;
  coordinator_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  agent_count: number;
  shift_count: number;
}

export default function UnitsAudit() {
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      // NENHUM filtro por is_active — carrega TODAS as unidades do banco.
      const { data: unitsData, error } = await supabase
        .from("units")
        .select("id, name, municipality, director_name, coordinator_name, email, phone, address")
        .order("municipality", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      const rows: UnitRow[] = await Promise.all(
        (unitsData ?? []).map(async (u) => {
          const [{ count: agentCount }, { count: shiftCount }] = await Promise.all([
            supabase.from("agents").select("id", { count: "exact", head: true }).eq("unit_id", u.id),
            supabase.from("agent_shifts").select("id", { count: "exact", head: true })
              .in(
                "agent_id",
                (await supabase.from("agents").select("id").eq("unit_id", u.id)).data?.map((a) => a.id) ?? ["00000000-0000-0000-0000-000000000000"]
              ),
          ]);
          return {
            ...u,
            agent_count: agentCount ?? 0,
            shift_count: shiftCount ?? 0,
          };
        })
      );

      setUnits(rows);
    } catch (e: any) {
      toast.error("Falha ao carregar unidades", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return units;
    return units.filter((u) =>
      [u.name, u.municipality, u.director_name, u.coordinator_name, u.email]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term))
    );
  }, [units, q]);

  const hasBrasileia = units.some((u) =>
    (u.name + " " + (u.municipality ?? "")).toLowerCase().includes("brasil")
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-tactical text-xl font-semibold tracking-[0.14em] tracking-tight">Auditoria de Unidades</h1>
            <p className="text-sm text-muted-foreground">
              Todas as unidades disponíveis para criação e visualização de escalas/plantões.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </Button>
        </header>

        <Card className="p-4 flex items-center gap-3 border-primary/30">
          <ShieldCheck className={`h-5 w-5 ${hasBrasileia ? "text-emerald-500" : "text-destructive"}`} />
          <div className="flex-1 text-sm">
            <strong>ISE Brasiléia:</strong>{" "}
            {hasBrasileia
              ? "presente na lista e disponível para escalas."
              : "NÃO encontrada no banco — verificar cadastro."}
          </div>
          <Badge variant="outline">{units.length} unidades</Badge>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, município, diretor..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid gap-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada.</p>
          )}
          {filtered.map((u) => (
            <Card key={u.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{u.name}</h3>
                  {u.municipality && (
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {u.municipality}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {u.email ?? "sem email"}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">{u.id}</p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-primary" />
                  {u.agent_count} agentes
                </div>
                <div className="flex items-center gap-1">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {u.shift_count} plantões
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

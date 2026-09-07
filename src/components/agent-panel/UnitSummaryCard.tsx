import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Users, Shield, MapPin, Phone, Mail, Loader2 } from 'lucide-react';

interface UnitInfo {
  id: string;
  name: string;
  municipality: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  president_name: string | null;
  director_name: string | null;
  coordinator_name: string | null;
  security_coordinator_name: string | null;
}

interface UnitSummaryCardProps {
  unitId: string | null;
}

export function UnitSummaryCard({ unitId }: UnitSummaryCardProps) {
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (unitId) {
      fetchUnit();
    }
  }, [unitId]);

  const fetchUnit = async () => {
    if (!unitId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, name, municipality, address, phone, email, president_name, director_name, coordinator_name, security_coordinator_name')
        .eq('id', unitId)
        .single();

      if (error) throw error;
      setUnit(data);
    } catch (err) {
      console.error('Error fetching unit:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!unitId) return null;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border-slate-700/50">
        <CardContent className="p-4 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!unit) return null;

  const hasLeadership = unit.president_name || unit.director_name || unit.coordinator_name || unit.security_coordinator_name;

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-amber-900/20 border-amber-500/30 overflow-hidden">
      <CardContent className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <Building2 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-amber-100 truncate">{unit.name}</h4>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <MapPin className="h-2.5 w-2.5" />
              {unit.municipality}
            </div>
          </div>
        </div>


        {/* Contact Info */}
        {(unit.phone || unit.email) && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-700/50">
            {unit.phone && (
              <Badge variant="outline" className="text-[10px] gap-1 text-slate-400 border-slate-600/50">
                <Phone className="h-2.5 w-2.5" />
                {unit.phone}
              </Badge>
            )}
            {unit.email && (
              <Badge variant="outline" className="text-[10px] gap-1 text-slate-400 border-slate-600/50">
                <Mail className="h-2.5 w-2.5" />
                {unit.email}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

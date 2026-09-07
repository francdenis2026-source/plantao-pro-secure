import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Shield, MapPin, Mail, Phone, Loader2 } from 'lucide-react';

interface UnitInfo {
  id: string;
  name: string;
  municipality: string;
  director_name: string | null;
  coordinator_name: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
}

interface UnitInfoCardProps {
  unitId: string | null;
}

export function UnitInfoCard({ unitId }: UnitInfoCardProps) {
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (unitId) {
      fetchUnitInfo();
    } else {
      setIsLoading(false);
    }
  }, [unitId]);

  const fetchUnitInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, name, municipality, director_name, coordinator_name, address, email, phone')
        .eq('id', unitId)
        .single();

      if (error) throw error;
      setUnit(data);
    } catch (error) {
      console.error('Error fetching unit info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!unitId || isLoading) {
    return null;
  }

  if (!unit) {
    return null;
  }

  // Only show if there's additional info to display
  const hasAdditionalInfo = unit.address || unit.email || unit.phone;
  
  if (!hasAdditionalInfo) {
    return null;
  }

  return (
    <Card className="glass glass-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Informações da Unidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        
        {unit.address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground">Endereço: </span>
              <span>{unit.address}</span>
            </div>
          </div>
        )}
        
        {unit.email && (
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground">Email: </span>
              <a href={`mailto:${unit.email}`} className="text-primary hover:underline">
                {unit.email}
              </a>
            </div>
          </div>
        )}
        
        {unit.phone && (
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground">Telefone: </span>
              <a href={`tel:${unit.phone}`} className="text-primary hover:underline">
                {unit.phone}
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

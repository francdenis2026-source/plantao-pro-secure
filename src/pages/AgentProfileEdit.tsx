import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BirthDatePicker } from '@/components/ui/birth-date-picker';
import { toast } from 'sonner';
import { ArrowLeft, Save, User, Phone, Mail, MapPin, Loader2, Droplet, Cake, Shield, Building2 } from 'lucide-react';
import { formatPhone } from '@/lib/validators';
import { AvatarUpload } from '@/components/agent-panel/AvatarUpload';
import { format, isValid, parseISO } from 'date-fns';
import { formatMatricula, getMatriculaNumbers } from '@/lib/validators';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function AgentProfileEdit() {
  const { user, isLoading: isAuthLoading, masterSession } = useAuth();
  const { agent, isLoading: isAgentLoading } = useAgentProfile();
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [formData, setFormData] = useState({
    matricula: '',
    phone: '',
    email: '',
    address: '',
    blood_type: ''
  });

  useEffect(() => {
    if (isAuthLoading) return;
    if (user || masterSession) return;
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    return () => clearTimeout(timer);
  }, [user, isAuthLoading, masterSession, navigate]);

  useEffect(() => {
    if (agent) {
      let parsedBirthDate: Date | undefined = undefined;
      if (agent.birth_date) {
        try {
          const parsed = parseISO(agent.birth_date);
          if (isValid(parsed)) parsedBirthDate = parsed;
        } catch {
          parsedBirthDate = undefined;
        }
      }
      setBirthDate(parsedBirthDate);
      setFormData({
        matricula: agent.matricula || '',
        phone: agent.phone || '',
        email: agent.email || '',
        address: agent.address || '',
        blood_type: agent.blood_type || ''
      });
      setAvatarUrl(agent.avatar_url || null);
    }
  }, [agent]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent?.id) {
      toast.error('Erro ao identificar o agente');
      return;
    }
    setIsSaving(true);
    try {
      const matriculaNumbers = getMatriculaNumbers(formData.matricula);
      if (matriculaNumbers && matriculaNumbers.length !== 8) {
        toast.error('Matrícula deve ter 8 dígitos');
        setIsSaving(false);
        return;
      }
      const birthDateForDb = birthDate ? format(birthDate, 'yyyy-MM-dd') : null;
      const { error } = await (supabase as any)
        .from('agents')
        .update({
          matricula: matriculaNumbers || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          blood_type: formData.blood_type || null,
          birth_date: birthDateForDb
        })
        .eq('id', agent.id);
      if (error) throw error;
      toast.success('Dados atualizados com sucesso!');
      navigate('/agent-panel');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isAgentLoading) {
    return (
      <div className="flex-1 min-h-0 w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex-1 min-h-0 w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Perfil não encontrado</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/agent-panel')}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const inputCls = "bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 h-9 text-sm";

  return (
    <div
      className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y pinch-zoom',
        overscrollBehavior: 'contain',
      }}
    >
      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-3 py-3 md:px-6 md:py-4 space-y-3">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 shadow-lg shadow-amber-500/5">
          <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_20%_50%,#f59e0b_0%,transparent_50%)]" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
          <div className="relative flex items-center gap-3 md:gap-5 p-3 md:p-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate('/agent-panel')}
              className="text-slate-400 hover:text-amber-400 shrink-0 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="shrink-0">
              <AvatarUpload
                agentId={agent.id}
                agentName={agent.name}
                currentAvatarUrl={avatarUrl}
                onAvatarUpdated={setAvatarUrl}
                compact
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="font-tactical text-[10px] md:text-xs tracking-[0.2em] text-amber-500/90 uppercase">Meu Perfil</span>
              </div>
              <h1 className="font-tactical text-sm md:text-lg font-bold text-white truncate leading-tight">
                {agent.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] md:text-xs text-slate-400">
                <span className="font-mono">{agent.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
                {agent.matricula && <><span className="text-slate-600">•</span><span>Mat. {agent.matricula}</span></>}
                {agent.team && <><span className="text-slate-600">•</span><span>Equipe {agent.team}</span></>}
                {agent.unit?.name && (
                  <><span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{agent.unit.name}</span></>
                )}
              </div>
            </div>

            <div className="hidden md:flex gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/agent-panel')}
                className="text-slate-400 hover:text-white h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-amber-600 hover:bg-amber-700 text-white h-8 shadow-md shadow-amber-900/40"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Contato */}
          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 backdrop-blur p-3 md:p-4">
            <h2 className="font-tactical text-[11px] tracking-[0.18em] text-amber-500/90 uppercase mb-3 flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" /> Contato
            </h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-slate-400 text-xs">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  maxLength={15}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> E-mail pessoal
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="matricula" className="text-slate-400 text-xs flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Matrícula
                </Label>
                <Input
                  id="matricula"
                  inputMode="numeric"
                  placeholder="00000000"
                  value={formatMatricula(formData.matricula)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setFormData(prev => ({ ...prev, matricula: digits }));
                  }}
                  maxLength={10}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Pessoal */}
          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 backdrop-blur p-3 md:p-4">
            <h2 className="font-tactical text-[11px] tracking-[0.18em] text-amber-500/90 uppercase mb-3 flex items-center gap-2">
              <User className="h-3.5 w-3.5" /> Pessoal
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs flex items-center gap-1.5">
                    <Cake className="h-3 w-3 text-pink-500" /> Nascimento
                  </Label>
                  <BirthDatePicker value={birthDate} onChange={setBirthDate} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="blood_type" className="text-slate-400 text-xs flex items-center gap-1.5">
                    <Droplet className="h-3 w-3 text-red-500" /> Sangue
                  </Label>
                  <Select
                    value={formData.blood_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, blood_type: value }))}
                  >
                    <SelectTrigger className="bg-slate-900/60 border-slate-700 text-white h-9 text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {bloodTypes.map((type) => (
                        <SelectItem key={type} value={type} className="text-white hover:bg-slate-700 focus:bg-slate-700">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="text-slate-400 text-xs flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Endereço
                </Label>
                <Textarea
                  id="address"
                  placeholder="Rua, número, bairro, cidade..."
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] text-sm resize-none"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Mobile actions */}
        <div className="md:hidden flex gap-2 pt-1 pb-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/agent-panel')}
            className="flex-1 text-slate-400 hover:text-white h-11"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white h-11 shadow-md shadow-amber-900/40"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}

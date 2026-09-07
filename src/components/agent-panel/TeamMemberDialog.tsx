import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Shield, User, Droplet, Phone, MessageCircle, Cake, Send } from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';

const quickMessages = [
  { id: 'cover', label: '🛡️ Cobrir', message: 'Olá! Preciso de você para cobrir um plantão. Pode me ajudar?' },
  { id: 'swap', label: '🔄 Trocar', message: 'Olá! Gostaria de propor uma troca de plantão. Podemos conversar?' },
  { id: 'urgent', label: '🚨 Urgente', message: '🚨 URGENTE: Preciso falar com você imediatamente sobre o serviço.' },
];

interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  team: string | null;
  blood_type: string | null;
  avatar_url: string | null;
  is_active: boolean;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  email: string | null;
}

interface TeamMemberDialogProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCurrentUser?: boolean;
}

export function TeamMemberDialog({ member, open, onOpenChange, isCurrentUser }: TeamMemberDialogProps) {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  
  if (!member) return null;

  const getRoleConfig = (role: string | null) => {
    switch (role) {
      case 'team_leader':
        return { icon: Crown, label: 'Chefe', color: 'amber', bgClass: 'from-amber-500 to-orange-600' };
      case 'support':
        return { icon: Shield, label: 'Apoio', color: 'blue', bgClass: 'from-blue-500 to-indigo-600' };
      default:
        return { icon: User, label: 'Agente', color: 'slate', bgClass: 'from-slate-500 to-slate-600' };
    }
  };

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length < 10) return null;
    return `55${numbers}`;
  };

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    try {
      return differenceInYears(new Date(), parseISO(birthDate));
    } catch {
      return null;
    }
  };

  const roleConfig = getRoleConfig(member.role);
  const RoleIcon = roleConfig.icon;
  const whatsappLink = formatPhoneForWhatsApp(member.phone);
  const age = getAge(member.birth_date);
  const firstName = member.name.split(' ')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-600/50 max-w-xs p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Perfil de {member.name}</DialogTitle>
          <DialogDescription>Informações do membro da equipe.</DialogDescription>
        </DialogHeader>
        
        {/* Compact Header with Avatar */}
        <div className={`relative bg-gradient-to-r ${roleConfig.bgClass} p-4`}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
          </div>
          
          <div className="relative flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2 border-white/30 shadow-xl">
              {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} className="object-cover" />}
              <AvatarFallback className="bg-white/20 text-xl font-black text-white">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white truncate leading-tight">
                {firstName}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge className="bg-white/20 text-white border-white/30 text-[10px] px-1.5 py-0 gap-1">
                  <RoleIcon className="h-3 w-3" />
                  {roleConfig.label}
                </Badge>
                {member.team && (
                  <Badge className="bg-black/20 text-white/90 border-white/20 text-[10px] px-1.5 py-0">
                    {member.team}
                  </Badge>
                )}
                {isCurrentUser && (
                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">Você</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info Row */}
        <div className="flex items-center justify-center gap-3 py-3 px-4 bg-slate-800/50 border-b border-slate-700/50">
          {member.blood_type && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40">
              <Droplet className="h-3.5 w-3.5 text-red-400 fill-red-400/30" />
              <span className="text-sm font-black text-red-300">{member.blood_type}</span>
            </div>
          )}
          {age && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/20 border border-pink-500/40">
              <Cake className="h-3.5 w-3.5 text-pink-400" />
              <span className="text-sm font-bold text-pink-300">{age} anos</span>
            </div>
          )}
        </div>

        {/* Contact Actions */}
        <div className="p-4 space-y-3">
          {member.phone && (
            <>
              {/* Phone Number Display */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-300">{member.phone}</span>
                </div>
                <a href={`tel:${member.phone.replace(/\D/g, '')}`}>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40">
                    <Phone className="h-3 w-3 mr-1" />
                    Ligar
                  </Button>
                </a>
              </div>

              {/* WhatsApp Quick Actions */}
              {whatsappLink && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    Mensagem Rápida WhatsApp
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {quickMessages.map((qm) => (
                      <a
                        key={qm.id}
                        href={`https://wa.me/${whatsappLink}?text=${encodeURIComponent(qm.message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="w-full h-8 text-[10px] bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/50 transition-all"
                        >
                          {qm.label}
                        </Button>
                      </a>
                    ))}
                  </div>
                  <a
                    href={`https://wa.me/${whatsappLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/30"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Abrir WhatsApp
                    </Button>
                  </a>
                </div>
              )}
            </>
          )}

          {!member.phone && (
            <div className="text-center py-4 text-slate-500 text-sm">
              📵 Telefone não cadastrado
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-3">
          <p className="text-[9px] text-center text-slate-500">
            🔒 Visível apenas para sua equipe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

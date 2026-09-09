import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { createElement } from 'react';

/** Aviso discreto e profissional para quando um visitante não logado
 * clica em algo exclusivo de agente cadastrado — não abre modal nem
 * navega para lugar nenhum, só informa e some sozinho. */
export function notifyRestrictedAccess(label?: string) {
  toast(label ? `${label} é exclusivo para agentes cadastrados.` : 'Esta função é exclusiva para agentes cadastrados.', {
    description: 'Faça login com sua matrícula para liberar o acesso.',
    icon: createElement(ShieldAlert, { className: 'h-4 w-4' }),
    duration: 3200,
  });
}

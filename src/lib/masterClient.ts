import { getMasterToken } from '@/lib/masterSession';

type MasterAdminAction =
  | 'create_agent'
  | 'delete_agent'
  | 'set_role'
  | 'update_unit'
  | 'create_unit';

export class MasterClientError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'MasterClientError';
    this.status = status;
  }
}

async function callMasterAdmin<T>(action: MasterAdminAction, payload: Record<string, unknown>): Promise<T> {
  const token = getMasterToken();
  if (!token) throw new MasterClientError('Sessão master expirada. Faça login novamente.', 401);

  const res = await fetch('/functions/v1/master-admin', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-master-token': token,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new MasterClientError(json?.error || `Falha na operação (${res.status}).`, res.status);
  }

  if (!json?.success) {
    throw new MasterClientError(json?.error || 'Operação não concluída.');
  }

  return json.data as T;
}

export const masterClient = {
  createAgent: (input: {
    name: string;
    cpf: string;
    password: string;
    unit_id: string;
    team: string;
    matricula?: string | null;
    phone?: string | null;
  }) => callMasterAdmin<{ agentId: string }>('create_agent', input as any),

  deleteAgent: (input: { agentId: string }) => callMasterAdmin<{}>('delete_agent', input as any),

  setRole: (input: { userId: string; role: 'admin' | 'user' | 'master' }) =>
    callMasterAdmin<{}>('set_role', input as any),

  updateUnit: (input: { unitId: string; patch: Record<string, unknown> }) =>
    callMasterAdmin<{}>('update_unit', input as any),

  createUnit: (input: { data: Record<string, unknown> }) => callMasterAdmin<{ unitId: string }>('create_unit', input as any),
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShiftEditDialog, type ShiftEditRecord } from '../ShiftEditDialog';

// ---- Supabase mock -----------------------------------------------------
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const updateMock = vi.fn((_payload: any) => ({ eq: updateEqMock }));
const upsertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn((_table: string) => ({
  update: updateMock,
  upsert: upsertMock,
  delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// jsdom: pointer capture / scrollIntoView needed by Radix Select
beforeEach(() => {
  (Element.prototype as any).hasPointerCapture = () => false;
  (Element.prototype as any).setPointerCapture = () => {};
  (Element.prototype as any).releasePointerCapture = () => {};
  (Element.prototype as any).scrollIntoView = () => {};
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.style.pointerEvents = '';
});

// -----------------------------------------------------------------------

/**
 * E2E-style integration test: simulates the exact flow the user reported
 * as travando — abrir plantão do calendário, trocar para Noturno (19→07),
 * confirmar e garantir que:
 *  1) o payload salvo tem shift_type='night' com 19:00→07:00
 *  2) o Dialog é fechado (onOpenChange(false))
 *  3) onSaved é disparado (calendário se recarrega)
 *  4) document.body NÃO fica com pointer-events: none (app não trava)
 */
describe('ShiftEditDialog · E2E editar → Noturno → confirmar', () => {
  const shiftDate = new Date('2026-07-10T12:00:00');

  const existingDayShift: ShiftEditRecord = {
    id: 'shift-abc-123',
    shift_date: '2026-07-10',
    start_time: '07:00:00',
    end_time: '19:00:00',
    shift_type: 'regular',
    is_vacation: false,
  };

  it('salva corretamente e libera o app após confirmar', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();

    render(
      <ShiftEditDialog
        open
        onOpenChange={onOpenChange}
        shiftDate={shiftDate}
        shift={existingDayShift}
        agentId="agent-xyz"
        onSaved={onSaved}
      />
    );

    // 1) Trocar Tipo de turno para Noturno
    const trigger = await screen.findByRole('combobox', { name: /tipo de turno/i });
    await user.click(trigger);
    const nightOption = await screen.findByRole('option', { name: /noturno/i });
    await user.click(nightOption);

    // Resumo já reflete 19:00 → 07:00 dia seguinte
    const summary = await screen.findByTestId('shift-range-summary');
    expect(summary.textContent).toMatch(/19:00/);
    expect(summary.textContent).toMatch(/07:00/);
    expect(summary.textContent?.toLowerCase()).toContain('dia seguinte');

    const nightAlert = await screen.findByTestId('night-shift-alert');
    expect(nightAlert.textContent?.toLowerCase()).toContain('plantão noturno identificado');
    expect(nightAlert.textContent).toMatch(/10\/07\/2026/);
    expect(nightAlert.textContent).toMatch(/11\/07\/2026/);

    // 2) Clicar em "Salvar alterações" (abre confirmação inline)
    await user.click(screen.getByRole('button', { name: /salvar altera/i }));

    // 3) Confirmar
    await user.click(await screen.findByRole('button', { name: /^confirmar$/i }));

    // 4) Assertivas de persistência
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const payload = updateMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      agent_id: 'agent-xyz',
      shift_date: '2026-07-10',
      start_time: '19:00:00',
      end_time: '07:00:00',
      shift_type: 'night',
      is_vacation: false,
      status: 'scheduled',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'shift-abc-123');

    // 5) Fechamento do dialog é agendado via setTimeout(50) → avançar tempo
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 1500 });
    expect(onSaved).toHaveBeenCalledTimes(1);

    // 6) App NÃO pode ficar travado — pointer-events do <body> deve estar livre
    expect(document.body.style.pointerEvents).toBe('');
  });
});

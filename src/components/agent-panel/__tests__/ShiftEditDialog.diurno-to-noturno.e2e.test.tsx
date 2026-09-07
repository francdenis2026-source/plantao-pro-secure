import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

/**
 * E2E: usuário abre um plantão Diurno existente (07:00→19:00) e troca
 * o tipo para Noturno (formato 24h → 19:00→07:00 dia seguinte).
 * Valida:
 *  1) payload persistido com shift_type='night', 19:00→07:00
 *  2) alerta "plantão noturno identificado" com data do dia seguinte
 *  3) dialog fecha (onOpenChange(false)) e onSaved dispara
 *  4) body.pointerEvents liberado → app não trava
 */
describe('ShiftEditDialog · E2E Diurno → Noturno (24h 19→07)', () => {
  const shiftDate = new Date('2026-07-15T12:00:00');

  const diurnoShift: ShiftEditRecord = {
    id: 'shift-diurno-001',
    shift_date: '2026-07-15',
    start_time: '07:00:00',
    end_time: '19:00:00',
    shift_type: 'regular',
    is_vacation: false,
  };

  it('troca Diurno→Noturno, salva e libera o app sem travar', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();

    render(
      <ShiftEditDialog
        open
        onOpenChange={onOpenChange}
        shiftDate={shiftDate}
        shift={diurnoShift}
        agentId="agent-diurno-xyz"
        onSaved={onSaved}
      />
    );

    // Trocar tipo para Noturno
    const trigger = await screen.findByRole('combobox', { name: /tipo de turno/i });
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: /noturno/i }));

    // Resumo em 24h: 19:00 → 07:00 (dia seguinte)
    const summary = await screen.findByTestId('shift-range-summary');
    expect(summary.textContent).toMatch(/19:00/);
    expect(summary.textContent).toMatch(/07:00/);
    expect(summary.textContent?.toLowerCase()).toContain('dia seguinte');

    // Alerta noturno com data do dia seguinte
    const nightAlert = await screen.findByTestId('night-shift-alert');
    expect(nightAlert.textContent?.toLowerCase()).toContain('plantão noturno identificado');
    expect(nightAlert.textContent).toMatch(/15\/07\/2026/);
    expect(nightAlert.textContent).toMatch(/16\/07\/2026/);

    // Salvar → confirmar
    await user.click(screen.getByRole('button', { name: /salvar altera/i }));
    await user.click(await screen.findByRole('button', { name: /^confirmar$/i }));

    // Persistência
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const payload = updateMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      agent_id: 'agent-diurno-xyz',
      shift_date: '2026-07-15',
      start_time: '19:00:00',
      end_time: '07:00:00',
      shift_type: 'night',
      is_vacation: false,
      status: 'scheduled',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'shift-diurno-001');

    // Dialog fechou + onSaved disparou
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 1500 });
    expect(onSaved).toHaveBeenCalledTimes(1);

    // App liberado — sem overlay travando pointer
    expect(document.body.style.pointerEvents).toBe('');
  });
});

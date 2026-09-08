import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShiftEditDialog, type ShiftEditRecord } from '../ShiftEditDialog';

const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const updateMock = vi.fn((_p: any) => ({ eq: updateEqMock }));
const upsertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn((_t: string) => ({
  update: updateMock,
  upsert: upsertMock,
  delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

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

describe('ShiftEditDialog · E2E editar Diurno → Plantão 24h', () => {
  const shiftDate = new Date('2026-07-12T12:00:00');
  const shift: ShiftEditRecord = {
    id: 'shift-24h-1',
    shift_date: '2026-07-12',
    start_time: '07:00:00',
    end_time: '19:00:00',
    shift_type: 'regular',
    is_vacation: false,
  };

  it('salva 24h (07→07 dia seguinte) sem travar o app', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();

    render(
      <ShiftEditDialog
        open
        onOpenChange={onOpenChange}
        shiftDate={shiftDate}
        shift={shift}
        agentId="agent-24h"
        onSaved={onSaved}
      />
    );

    const trigger = await screen.findByRole('combobox', { name: /tipo de turno/i });
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: /24h/i }));

    const summary = await screen.findByTestId('shift-range-summary');
    expect(summary.textContent).toMatch(/07:00/);
    expect(summary.textContent?.toLowerCase()).toContain('dia seguinte');
    expect(summary.textContent).toMatch(/24h/);

    await user.click(screen.getByRole('button', { name: /salvar altera/i }));
    await user.click(await screen.findByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const payload = updateMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      agent_id: 'agent-24h',
      shift_date: '2026-07-12',
      shift_type: '24h',
      is_vacation: false,
      start_time: '07:00:00',
      end_time: '07:00:00',
      status: 'scheduled',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'shift-24h-1');

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 1500 });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(document.body.style.pointerEvents).toBe('');
  });
});

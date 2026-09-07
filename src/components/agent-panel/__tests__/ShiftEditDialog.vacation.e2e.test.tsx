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

describe('ShiftEditDialog · E2E editar → Folga/Férias', () => {
  const shiftDate = new Date('2026-07-11T12:00:00');
  const shift: ShiftEditRecord = {
    id: 'shift-vac-1',
    shift_date: '2026-07-11',
    start_time: '07:00:00',
    end_time: '19:00:00',
    shift_type: 'regular',
    is_vacation: false,
  };

  it('persiste vacation e fecha o dialog corretamente', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();

    render(
      <ShiftEditDialog
        open
        onOpenChange={onOpenChange}
        shiftDate={shiftDate}
        shift={shift}
        agentId="agent-vac"
        onSaved={onSaved}
      />
    );

    const trigger = await screen.findByRole('combobox', { name: /tipo de turno/i });
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: /folga.*férias.*licen/i }));

    // Sem inputs de horário quando é vacation
    expect(screen.queryByLabelText(/^Hora$/i)).toBeNull();

    const summary = await screen.findByTestId('shift-range-summary');
    expect(summary.textContent?.toLowerCase()).toMatch(/dia inteiro|folga|férias|licen/);

    await user.click(screen.getByRole('button', { name: /salvar altera/i }));
    await user.click(await screen.findByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const payload = updateMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      agent_id: 'agent-vac',
      shift_date: '2026-07-11',
      shift_type: 'vacation',
      is_vacation: true,
      start_time: '00:00',
      end_time: '00:00',
      status: 'scheduled',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'shift-vac-1');

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 1500 });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(document.body.style.pointerEvents).toBe('');
  });
});

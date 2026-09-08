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

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

beforeEach(() => {
  (Element.prototype as any).hasPointerCapture = () => false;
  (Element.prototype as any).setPointerCapture = () => {};
  (Element.prototype as any).releasePointerCapture = () => {};
  (Element.prototype as any).scrollIntoView = () => {};
  // Force iPhone SE-like viewport
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 568 });
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.style.pointerEvents = '';
});

describe('ShiftEditDialog · mobile viewport', () => {
  const shiftDate = new Date('2026-07-10T12:00:00');
  const shift: ShiftEditRecord = {
    id: 'shift-mob-1',
    shift_date: '2026-07-10',
    start_time: '07:00:00',
    end_time: '19:00:00',
    shift_type: 'regular',
    is_vacation: false,
  };

  it('CompactTimeField cabe na tela e Salvar não trava pointer-events', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();

    render(
      <ShiftEditDialog
        open
        onOpenChange={onOpenChange}
        shiftDate={shiftDate}
        shift={shift}
        agentId="agent-mob"
        onSaved={onSaved}
      />
    );

    // Compact time field renders as HH/MM segments (Hora + Minuto inputs) — no native time picker
    const horaInputs = await screen.findAllByLabelText(/^Hora$/i);
    const minInputs = await screen.findAllByLabelText(/^Minuto$/i);
    expect(horaInputs.length).toBeGreaterThanOrEqual(2); // start + end
    expect(minInputs.length).toBeGreaterThanOrEqual(2);

    // Ensure the picker container fits within the 320px viewport (no min-width overflow)
    const picker = horaInputs[0].closest('[role="group"]') as HTMLElement;
    expect(picker).toBeTruthy();
    // jsdom doesn't layout, but we assert width class is w-full (fills parent)
    expect(picker.className).toMatch(/w-full/);

    // Save flow
    await user.click(screen.getByRole('button', { name: /salvar altera/i }));
    await user.click(await screen.findByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 1500 });

    // Critical: no frozen app
    expect(document.body.style.pointerEvents).toBe('');
    expect(onSaved).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emit, on, handlerCount, resetHandlers } from './events';

beforeEach(() => {
  resetHandlers();
});

describe('emit + on', () => {
  it('calls registered handler with event data', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    on('candidate.stageChanged', handler);

    emit({
      type: 'candidate.stageChanged',
      wa: '6281234567890',
      from: 'OPEN',
      to: 'INTERVIEW',
      at: '2026-09-01T00:00:00Z',
    });

    // Wait for fire-and-forget handler
    await new Promise((r) => setTimeout(r, 10));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'candidate.stageChanged',
        wa: '6281234567890',
        from: 'OPEN',
        to: 'INTERVIEW',
      }),
    );
  });

  it('calls multiple handlers for same event', async () => {
    const h1 = vi.fn().mockResolvedValue(undefined);
    const h2 = vi.fn().mockResolvedValue(undefined);
    on('application.approved', h1);
    on('application.approved', h2);

    emit({
      type: 'application.approved',
      wa: '6281234567890',
      jobCode: 'ASJ001',
      at: '2026-09-01T00:00:00Z',
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('does not call handler for different event type', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    on('candidate.stageChanged', handler);

    emit({
      type: 'document.uploaded',
      wa: '6281234567890',
      kind: 'cv',
      path: '/uploads/cv.pdf',
      at: '2026-09-01T00:00:00Z',
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(handler).not.toHaveBeenCalled();
  });

  it('never throws into the emitter', async () => {
    const badHandler = vi.fn().mockRejectedValue(new Error('handler crash'));
    on('job.statusChanged', badHandler);

    // Should not throw
    expect(() => {
      emit({
        type: 'job.statusChanged',
        jobCode: 'ASJ001',
        from: 'pending',
        to: 'running',
        at: '2026-09-01T00:00:00Z',
      });
    }).not.toThrow();

    await new Promise((r) => setTimeout(r, 10));
    expect(badHandler).toHaveBeenCalled();
  });

  it('unsubscribe removes handler', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const unsub = on('config.changed', handler);

    emit({ type: 'config.changed', key: 'theme', at: '2026-09-01T00:00:00Z' });
    await new Promise((r) => setTimeout(r, 10));
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();

    emit({ type: 'config.changed', key: 'theme', at: '2026-09-01T00:00:00Z' });
    await new Promise((r) => setTimeout(r, 10));
    expect(handler).toHaveBeenCalledTimes(1); // Not called again
  });

  it('handlerCount returns correct count', () => {
    on('reminder.due', async () => {});
    on('reminder.due', async () => {});
    expect(handlerCount('reminder.due')).toBe(2);
    expect(handlerCount('application.rejected')).toBe(0);
  });
});

import { act, renderHook } from '@testing-library/react';
import { useSecondsLeft } from '@/hooks/useSecondsLeft';

/** Render with a fixed deadline, so re-renders don't move it. */
function renderHookAt(expires: number) {
  return renderHook(() => useSecondsLeft(expires));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSecondsLeft', () => {
  it('is null without a deadline', () => {
    const { result } = renderHook(() => useSecondsLeft(null));
    expect(result.current).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('counts down once a second', () => {
    const { result } = renderHookAt(Date.now() + 10_000);
    expect(result.current).toBe(10);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current).toBe(7);
  });

  it('stops at zero and clears its timer', () => {
    const { result } = renderHookAt(Date.now() + 2_000);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('catches up with a deadline set long after mounting', () => {
    const { result, rerender } = renderHook(({ expires }) => useSecondsLeft(expires), {
      initialProps: { expires: null as number | null },
    });
    jest.setSystemTime(Date.now() + 60_000);
    rerender({ expires: Date.now() + 30_000 });
    act(() => { jest.advanceTimersByTime(0); });
    expect(result.current).toBe(30);
  });

  it('is zero for a deadline already past', () => {
    const { result } = renderHookAt(Date.now() - 1_000);
    expect(result.current).toBe(0);
  });

  it('clears its timers on unmount', () => {
    const { unmount } = renderHookAt(Date.now() + 10_000);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});

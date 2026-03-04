import { render, screen, act } from '@testing-library/react';
import { Countdown } from '@/components/shared/Countdown';

describe('Countdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays formatted duration', () => {
    render(<Countdown durationSeconds={90} />);
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('counts down every second', () => {
    render(<Countdown durationSeconds={5} />);
    expect(screen.getByText('0:05')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText('0:04')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.getByText('0:02')).toBeInTheDocument();
  });

  it('calls onComplete when reaching zero', () => {
    const onComplete = jest.fn();
    render(<Countdown durationSeconds={2} onComplete={onComplete} />);

    act(() => { jest.advanceTimersByTime(2000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('uses custom format function', () => {
    const format = (s: number) => `${s}s left`;
    render(<Countdown durationSeconds={10} format={format} />);
    expect(screen.getByText('10s left')).toBeInTheDocument();
  });

  it('stops at zero and does not go negative', () => {
    render(<Countdown durationSeconds={1} />);

    act(() => { jest.advanceTimersByTime(3000); });
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });
});

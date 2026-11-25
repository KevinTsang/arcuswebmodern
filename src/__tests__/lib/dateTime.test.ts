import { formatShortDateTime } from '@/lib/dateTime';

describe('formatShortDateTime', () => {
  // 24 Nov 2026, 3:05 PM local time.
  const TIMESTAMP = new Date(2026, 10, 24, 15, 5).getTime();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('asks for a short month, the day, the hour and two-digit minutes in the viewer\'s locale', () => {
    const spy = jest.spyOn(Date.prototype, 'toLocaleString');
    formatShortDateTime(TIMESTAMP);
    expect(spy).toHaveBeenCalledWith(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  });

  it('includes the day and the minutes, without the year or seconds', () => {
    const text = formatShortDateTime(TIMESTAMP);
    expect(text).toMatch(/24/);
    expect(text).toMatch(/05/);
    expect(text).not.toMatch(/2026/);
    expect(text).not.toMatch(/:00\b/);
  });
});

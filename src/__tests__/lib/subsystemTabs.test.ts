import { DEFAULT_SUBSYSTEM_ACTION, extraSubsystemActions, resolveSubsystemAction } from '@/lib/subsystemTabs';

describe('subsystemTabs', () => {
  it('lists the non-default actions for the static params', () => {
    expect(extraSubsystemActions('alarms')).toEqual(['settings']);
    expect(extraSubsystemActions('doors-locks')).toEqual(['access-list', 'more']);
  });

  it('has no extra actions for a subsystem without tabs', () => {
    expect(extraSubsystemActions('climate')).toEqual([]);
  });

  it('resolves known actions and falls back to the default', () => {
    expect(resolveSubsystemAction('doors-locks', 'more')).toBe('more');
    expect(resolveSubsystemAction('doors-locks', 'nope')).toBe(DEFAULT_SUBSYSTEM_ACTION);
    expect(resolveSubsystemAction('alarms', undefined)).toBe('status');
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { Base, CareSubsystem } from '@arcus/core';
import { useCareBehaviors } from '@/hooks/useCareBehaviors';
import type { SubsystemEntity } from '@/store/entityTypes';
import { makeSubsystem } from '../helpers/factories';
import { CARE_ADDR, INACTIVITY_TEMPLATE, RAW_INACTIVITY, makeCareBehavior } from '../helpers/careBehaviorFixtures';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
let mockSubsystem: SubsystemEntity | undefined;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/hooks/useCareSubsystem', () => ({
  useCareSubsystem: () => ({ subsystem: mockSubsystem }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const BEHAVIOR = makeCareBehavior();

function respond(behaviors = [BEHAVIOR]) {
  mockBridgeRequest.mockImplementation((cmd: string) => {
    if (cmd === CareSubsystem.CMD_LISTBEHAVIORS) return Promise.resolve({ behaviors });
    if (cmd === CareSubsystem.CMD_LISTBEHAVIORTEMPLATES) return Promise.resolve({ behaviorTemplates: [RAW_INACTIVITY] });
    return Promise.resolve({});
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubsystem = makeSubsystem(CARE_ADDR, { [CareSubsystem.ATTR_BEHAVIORS]: ['behavior-1'] });
  respond();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useCareBehaviors', () => {
  it('loads behaviors and transformed templates from the care subsystem', async () => {
    const { result } = renderHook(() => useCareBehaviors());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.behaviors).toEqual([BEHAVIOR]);
    await waitFor(() => expect(result.current.templates).toEqual([INACTIVITY_TEMPLATE]));
    expect(result.current.address).toBe(CARE_ADDR);
    expect(result.current.error).toBe(false);
    expect(mockBridgeRequest).toHaveBeenCalledWith(CareSubsystem.CMD_LISTBEHAVIORS, CARE_ADDR, {});
    expect(mockBridgeRequest).toHaveBeenCalledWith(CareSubsystem.CMD_LISTBEHAVIORTEMPLATES, CARE_ADDR, {});
  });

  it('flags an error when ListBehaviors fails', async () => {
    mockBridgeRequest.mockImplementation((cmd: string) =>
      cmd === CareSubsystem.CMD_LISTBEHAVIORS ? Promise.reject(new Error('fail')) : Promise.resolve({}));
    const { result } = renderHook(() => useCareBehaviors());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.behaviors).toEqual([]);
    expect(result.current.templates).toEqual([]);
  });

  it('keeps an empty template list when ListBehaviorTemplates fails', async () => {
    mockBridgeRequest.mockImplementation((cmd: string) =>
      cmd === CareSubsystem.CMD_LISTBEHAVIORTEMPLATES ? Promise.reject(new Error('fail')) : Promise.resolve({ behaviors: [] }));
    const { result } = renderHook(() => useCareBehaviors());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.templates).toEqual([]);
    expect(result.current.error).toBe(false);
  });

  it('handles responses without lists', async () => {
    mockBridgeRequest.mockResolvedValue({});
    const { result } = renderHook(() => useCareBehaviors());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.behaviors).toEqual([]);
  });

  it('does nothing without a care subsystem', async () => {
    mockSubsystem = undefined;
    const { result } = renderHook(() => useCareBehaviors());

    await act(() => result.current.reload());
    expect(mockBridgeRequest).not.toHaveBeenCalled();
    expect(result.current.address).toBeUndefined();
    expect(result.current.loading).toBe(true);
  });

  it('reload re-fetches the behaviors', async () => {
    const { result } = renderHook(() => useCareBehaviors());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const renamed = { ...BEHAVIOR, name: 'Renamed' };
    respond([renamed]);
    await act(() => result.current.reload());
    expect(result.current.behaviors).toEqual([renamed]);
  });

  it('re-fetches when the subsystem behavior list changes', async () => {
    const { result, rerender } = renderHook(() => useCareBehaviors());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const calls = mockBridgeRequest.mock.calls.filter(([c]) => c === CareSubsystem.CMD_LISTBEHAVIORS).length;

    mockSubsystem = makeSubsystem(CARE_ADDR, {
      [Base.ATTR_ADDRESS]: CARE_ADDR,
      [CareSubsystem.ATTR_BEHAVIORS]: ['behavior-1', 'behavior-2'],
    });
    rerender();

    await waitFor(() =>
      expect(mockBridgeRequest.mock.calls.filter(([c]) => c === CareSubsystem.CMD_LISTBEHAVIORS).length).toBe(calls + 1));
  });
});

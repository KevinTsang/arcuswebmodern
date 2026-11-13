import { renderHook, waitFor } from '@testing-library/react';
import { CareSubsystem, PairingSubsystem } from '@arcus/core';
import { usePairingInterrupt } from '@/hooks/usePairingInterrupt';
import type { PairingInterruptReason } from '@/components/pairing/types';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
let mockCurrentIncident: string | null = null;
let mockCareAlarmState: string = CareSubsystem.ALARMSTATE_READY;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: any) => any) => sel({ incidents: { currentIncident: mockCurrentIncident } }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/hooks/useCareSubsystem', () => ({
  useCareSubsystem: () => ({ alarmState: mockCareAlarmState }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const SUB_ADDR = 'SERV:subpairing:place-1';
const INCIDENT_ADDR = 'SERV:incident:abc';
const mockOnInterrupt = jest.fn<void, [PairingInterruptReason]>();

interface HookProps {
  pairingSubAddr: string | null;
  enabled: boolean;
  interrupted: boolean;
}

const defaultProps: HookProps = { pairingSubAddr: SUB_ADDR, enabled: true, interrupted: false };

function renderInterrupt(props: Partial<HookProps> = {}) {
  return renderHook(
    (p: HookProps) => usePairingInterrupt({ ...p, onInterrupt: mockOnInterrupt }),
    { initialProps: { ...defaultProps, ...props } },
  );
}

const stopCalls = () =>
  mockBridgeRequest.mock.calls.filter(([cmd]) => cmd === PairingSubsystem.CMD_STOPSEARCHING);

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentIncident = null;
  mockCareAlarmState = CareSubsystem.ALARMSTATE_READY;
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('usePairingInterrupt', () => {
  describe('no alarm', () => {
    it('returns null and does nothing', () => {
      const { result } = renderInterrupt();
      expect(result.current).toBeNull();
      expect(mockOnInterrupt).not.toHaveBeenCalled();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('incident', () => {
    it('stops searching and reports an incident interruption', async () => {
      mockCurrentIncident = INCIDENT_ADDR;
      const { result } = renderInterrupt();

      expect(result.current).toBe('incident');
      expect(mockOnInterrupt).toHaveBeenCalledWith('incident');
      await waitFor(() =>
        expect(mockBridgeRequest).toHaveBeenCalledWith(PairingSubsystem.CMD_STOPSEARCHING, SUB_ADDR, {}),
      );
    });

    it('interrupts when an incident becomes active after mount', () => {
      const { rerender } = renderInterrupt();
      expect(mockOnInterrupt).not.toHaveBeenCalled();

      mockCurrentIncident = INCIDENT_ADDR;
      rerender(defaultProps);
      expect(mockOnInterrupt).toHaveBeenCalledWith('incident');
      expect(stopCalls()).toHaveLength(1);
    });

    it('prefers the incident when a care alarm is also active', () => {
      mockCurrentIncident = INCIDENT_ADDR;
      mockCareAlarmState = CareSubsystem.ALARMSTATE_ALERT;
      const { result } = renderInterrupt();
      expect(result.current).toBe('incident');
      expect(mockOnInterrupt).toHaveBeenCalledWith('incident');
    });
  });

  describe('care alarm', () => {
    it('stops searching when the care subsystem goes into ALERT', async () => {
      const { rerender, result } = renderInterrupt();
      mockCareAlarmState = CareSubsystem.ALARMSTATE_ALERT;
      rerender(defaultProps);

      expect(result.current).toBe('care');
      expect(mockOnInterrupt).toHaveBeenCalledWith('care');
      await waitFor(() =>
        expect(mockBridgeRequest).toHaveBeenCalledWith(PairingSubsystem.CMD_STOPSEARCHING, SUB_ADDR, {}),
      );
    });
  });

  describe('failure', () => {
    it('dispatches an error notification when StopSearching fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      mockCurrentIncident = INCIDENT_ADDR;
      renderInterrupt();

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: {
            type: 'error',
            message: 'Failed to turn off pairing mode. The hub may still be searching for devices.',
          },
        }),
      );
      expect(mockOnInterrupt).toHaveBeenCalledWith('incident');
    });
  });

  describe('edge cases', () => {
    it('does nothing while disabled, but still reports the active alarm', () => {
      mockCurrentIncident = INCIDENT_ADDR;
      const { result } = renderInterrupt({ enabled: false });
      expect(result.current).toBe('incident');
      expect(mockOnInterrupt).not.toHaveBeenCalled();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('does nothing when already interrupted', () => {
      mockCurrentIncident = INCIDENT_ADDR;
      renderInterrupt({ interrupted: true });
      expect(mockOnInterrupt).not.toHaveBeenCalled();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('interrupts without a Bridge call when the pairing subsystem is not loaded', () => {
      mockCurrentIncident = INCIDENT_ADDR;
      renderInterrupt({ pairingSubAddr: null });
      expect(mockOnInterrupt).toHaveBeenCalledWith('incident');
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('fires only once per interruption across re-renders', () => {
      mockCurrentIncident = INCIDENT_ADDR;
      const { rerender } = renderInterrupt();
      rerender({ ...defaultProps });
      mockCareAlarmState = CareSubsystem.ALARMSTATE_ALERT;
      rerender({ ...defaultProps });
      expect(mockOnInterrupt).toHaveBeenCalledTimes(1);
      expect(stopCalls()).toHaveLength(1);
    });

    it('can interrupt again after the user resumes', () => {
      mockCurrentIncident = INCIDENT_ADDR;
      const { rerender } = renderInterrupt();
      rerender({ ...defaultProps, interrupted: true });

      mockCurrentIncident = null;
      rerender({ ...defaultProps, interrupted: false });
      expect(mockOnInterrupt).toHaveBeenCalledTimes(1);

      mockCareAlarmState = CareSubsystem.ALARMSTATE_ALERT;
      rerender({ ...defaultProps, interrupted: false, enabled: true });
      expect(mockOnInterrupt).toHaveBeenCalledTimes(2);
      expect(mockOnInterrupt).toHaveBeenLastCalledWith('care');
    });
  });
});

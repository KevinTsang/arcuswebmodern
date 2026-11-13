import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CareSubsystem } from '@arcus/core';
import { CareView } from '@/components/subsystems/CareView';
import { CARE_ADDR, makeCareState, type CareState } from '../helpers/careState';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

let mockCare: CareState;

jest.mock('@/hooks/useCareSubsystem', () => ({
  useCareSubsystem: () => mockCare,
}));

jest.mock('@/components/subsystems/CareAlarmMode', () => ({
  CareAlarmMode: () => <div data-testid="mock-care-alarm-mode" />,
}));
jest.mock('@/components/subsystems/CareSilentToggle', () => ({
  CareSilentToggle: () => <div data-testid="mock-care-silent-toggle" />,
}));
jest.mock('@/components/subsystems/CareActivity', () => ({
  CareActivity: () => <div data-testid="mock-care-activity" />,
}));
jest.mock('@/components/subsystems/CareDevices', () => ({
  CareDevices: () => <div data-testid="mock-care-devices" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCare = makeCareState({ careDevices: ['DRIV:dev:motion'] });
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareView', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CareView />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('status tab', () => {
    it('shows the all-clear state with the mode and silent controls', () => {
      render(<CareView />);
      expect(screen.getByTestId('care-state')).toHaveTextContent('All Clear');
      expect(screen.getByTestId('care-summary')).toHaveTextContent('Care is active');
      expect(screen.getByTestId('mock-care-alarm-mode')).toBeInTheDocument();
      expect(screen.getByTestId('mock-care-silent-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('care-device-count')).toHaveTextContent('1 care device monitored');
    });

    it('says the alarm is off in VISIT mode', () => {
      mockCare = makeCareState({ alarmMode: CareSubsystem.ALARMMODE_VISIT });
      render(<CareView />);
      expect(screen.getByTestId('care-summary')).toHaveTextContent('Care alarm is off');
    });

    it('clears a care alert', async () => {
      mockCare = makeCareState({ alarmState: CareSubsystem.ALARMSTATE_ALERT, lastAlertCause: 'No motion' });
      render(<CareView />);
      expect(screen.getByTestId('care-summary')).toHaveTextContent('No motion');
      fireEvent.click(screen.getByTestId('care-clear'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification', payload: { type: 'success', message: 'Care alert cleared' },
      }));
      expect(mockBridgeRequest).toHaveBeenCalledWith(CareSubsystem.CMD_CLEAR, CARE_ADDR, {});
    });

    it('shows an error when clearing fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      mockCare = makeCareState({ alarmState: CareSubsystem.ALARMSTATE_ALERT });
      render(<CareView />);
      fireEvent.click(screen.getByTestId('care-clear'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to clear alert' },
      }));
    });
  });

  describe('tabs', () => {
    it('switches to the activity timeline', () => {
      render(<CareView />);
      fireEvent.click(screen.getByTestId('care-tab-activity'));
      expect(screen.getByTestId('mock-care-activity')).toBeInTheDocument();
      expect(screen.queryByTestId('care-state')).not.toBeInTheDocument();
    });

    it('switches to the care devices', () => {
      render(<CareView />);
      fireEvent.click(screen.getByTestId('care-tab-devices'));
      expect(screen.getByTestId('mock-care-devices')).toBeInTheDocument();
    });

    it('switches to behaviors and back to status', () => {
      render(<CareView />);
      fireEvent.click(screen.getByTestId('care-tab-behaviors'));
      expect(screen.getByTestId('care-behavior-detail-morning-activity')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('care-tab-status'));
      expect(screen.getByTestId('care-state')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('shows the empty behaviors message', () => {
      mockCare = makeCareState({ behaviors: [] });
      render(<CareView />);
      fireEvent.click(screen.getByTestId('care-tab-behaviors'));
      expect(screen.getByText('No behaviors configured.')).toBeInTheDocument();
    });

    it('does not clear without a subsystem', () => {
      mockCare = makeCareState({ subsystem: undefined, alarmState: CareSubsystem.ALARMSTATE_ALERT });
      render(<CareView />);
      fireEvent.click(screen.getByTestId('care-clear'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });
});

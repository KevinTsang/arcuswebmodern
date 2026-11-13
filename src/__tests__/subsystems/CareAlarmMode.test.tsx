import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, CareSubsystem } from '@arcus/core';
import { CareAlarmMode } from '@/components/subsystems/CareAlarmMode';
import { CARE_ADDR, makeCareState as makeCare, type CareState } from '../helpers/careState';

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

// ── Helpers ───────────────────────────────────────────────────────────

const MODE_ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to change care alarm mode' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockCare = makeCare();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareAlarmMode', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CareAlarmMode />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the active behavior count when on', () => {
      render(<CareAlarmMode />);
      expect(screen.getByTestId('care-mode')).toHaveAttribute('data-mode', CareSubsystem.ALARMMODE_ON);
      expect(screen.getByTestId('care-mode-summary')).toHaveTextContent('On — 1 of 2 behaviors active.');
      expect(screen.getByTestId('care-mode-on')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('care-mode-on')).toBeDisabled();
      expect(screen.getByTestId('care-mode-off')).toBeEnabled();
    });

    it('uses the singular for one behavior', () => {
      mockCare = makeCare({ behaviors: [{ name: 'Only', enabled: true }] });
      render(<CareAlarmMode />);
      expect(screen.getByTestId('care-mode-summary')).toHaveTextContent('On — 1 of 1 behavior active.');
    });

    it('shows the off state in VISIT mode', () => {
      mockCare = makeCare({ alarmMode: CareSubsystem.ALARMMODE_VISIT });
      render(<CareAlarmMode />);
      expect(screen.getByTestId('care-mode-summary')).toHaveTextContent('Off — behaviors will not raise a care alarm.');
      expect(screen.getByTestId('care-mode-off')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('care-mode-off')).toBeDisabled();
      expect(screen.getByTestId('care-mode-on')).toBeEnabled();
    });
  });

  describe('changing the mode', () => {
    it('turns the care alarm off (VISIT)', async () => {
      render(<CareAlarmMode />);
      fireEvent.click(screen.getByTestId('care-mode-off'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, CARE_ADDR, { [CareSubsystem.ATTR_ALARMMODE]: CareSubsystem.ALARMMODE_VISIT },
      ));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('turns the care alarm on', async () => {
      mockCare = makeCare({ alarmMode: CareSubsystem.ALARMMODE_VISIT });
      render(<CareAlarmMode />);
      fireEvent.click(screen.getByTestId('care-mode-on'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, CARE_ADDR, { [CareSubsystem.ATTR_ALARMMODE]: CareSubsystem.ALARMMODE_ON },
      ));
    });

    it('disables both buttons while saving', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<CareAlarmMode />);
      fireEvent.click(screen.getByTestId('care-mode-off'));
      await waitFor(() => expect(screen.getByTestId('care-mode-off')).toBeDisabled());
      expect(screen.getByTestId('care-mode-on')).toBeDisabled();
    });

    it('shows an error and re-enables the button when the change fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<CareAlarmMode />);
      fireEvent.click(screen.getByTestId('care-mode-off'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(MODE_ERROR));
      await waitFor(() => expect(screen.getByTestId('care-mode-off')).toBeEnabled());
    });
  });

  describe('edge cases', () => {
    it('disables both buttons with no behaviors', () => {
      mockCare = makeCare({ behaviors: [] });
      render(<CareAlarmMode />);
      expect(screen.getByTestId('care-mode-summary')).toHaveTextContent('Add a behavior to turn on the care alarm.');
      expect(screen.getByTestId('care-mode-on')).toBeDisabled();
      expect(screen.getByTestId('care-mode-off')).toBeDisabled();
    });

    it('disables the buttons when the subsystem is missing', () => {
      mockCare = makeCare({ subsystem: undefined });
      render(<CareAlarmMode />);
      expect(screen.getByTestId('care-mode-off')).toBeDisabled();
    });

    it('treats behaviors without an enabled flag as active', () => {
      mockCare = makeCare({ behaviors: [{ name: 'A' }, { name: 'B' }] });
      render(<CareAlarmMode />);
      expect(screen.getByTestId('care-mode-summary')).toHaveTextContent('On — 2 of 2 behaviors active.');
    });
  });
});

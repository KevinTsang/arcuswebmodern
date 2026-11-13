import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, CareSubsystem } from '@arcus/core';
import { CareSilentToggle } from '@/components/subsystems/CareSilentToggle';
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

// ── Helpers ───────────────────────────────────────────────────────────

const SILENT_ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to update silent alarm' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockCare = makeCareState();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareSilentToggle', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CareSilentToggle />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the label and an off switch', () => {
      render(<CareSilentToggle />);
      expect(screen.getByText('Silent Alarm')).toBeInTheDocument();
      expect(screen.getByTestId('care-silent-toggle')).toHaveAttribute('aria-checked', 'false');
    });

    it('shows an on switch when silent', () => {
      mockCare = makeCareState({ silent: true });
      render(<CareSilentToggle />);
      expect(screen.getByTestId('care-silent-toggle')).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('toggling', () => {
    it('turns silent mode on', async () => {
      render(<CareSilentToggle />);
      fireEvent.click(screen.getByTestId('care-silent-toggle'));
      await act(() => mockBridgeRequest.mock.results[0].value);
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, CARE_ADDR, { [CareSubsystem.ATTR_SILENT]: true },
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('turns silent mode off', async () => {
      mockCare = makeCareState({ silent: true });
      render(<CareSilentToggle />);
      fireEvent.click(screen.getByTestId('care-silent-toggle'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, CARE_ADDR, { [CareSubsystem.ATTR_SILENT]: false },
      ));
    });

    it('shows an error when the update fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<CareSilentToggle />);
      fireEvent.click(screen.getByTestId('care-silent-toggle'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(SILENT_ERROR));
    });
  });

  describe('edge cases', () => {
    it('ignores a second click while a save is in flight', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<CareSilentToggle />);
      fireEvent.click(screen.getByTestId('care-silent-toggle'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByTestId('care-silent-toggle'));
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
    });

    it('does nothing without a subsystem', () => {
      mockCare = makeCareState({ subsystem: undefined });
      render(<CareSilentToggle />);
      fireEvent.click(screen.getByTestId('care-silent-toggle'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, SecurityAlarmMode } from '@arcus/core';
import { ModeDelaySettings } from '@/components/subsystems/ModeDelaySettings';

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

// ── Helpers ───────────────────────────────────────────────────────────

const defaultProps = {
  mode: 'ON' as const,
  label: 'Full (ON)',
  securityAddr: 'SERV:subsecurity:abc',
  entranceDelaySec: 30,
  exitDelaySec: 45,
  soundsEnabled: true,
  silent: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ModeDelaySettings', () => {
  it('matches snapshot', () => {
    const { container } = render(<ModeDelaySettings {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders mode label', () => {
    render(<ModeDelaySettings {...defaultProps} />);
    expect(screen.getByText('Full (ON)')).toBeInTheDocument();
  });

  it('renders exit and entrance delay dropdowns with current values', () => {
    render(<ModeDelaySettings {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    expect(selects[0]).toHaveValue('45');
    expect(selects[1]).toHaveValue('30');
  });

  it('renders arming sounds and silent alarm toggles', () => {
    render(<ModeDelaySettings {...defaultProps} />);
    expect(screen.getByText('Arming Sounds')).toBeInTheDocument();
    expect(screen.getByText('Silent Alarm')).toBeInTheDocument();
    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    expect(switches[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('changing exit delay calls Bridge.request with mode-keyed attribute', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<ModeDelaySettings {...defaultProps} />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '90' } });

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subsecurity:abc',
        { [`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:ON`]: 90 },
      );
    });
  });

  it('changing entrance delay calls Bridge.request with mode-keyed attribute', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<ModeDelaySettings {...defaultProps} />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: '60' } });

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subsecurity:abc',
        { [`${SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC}:ON`]: 60 },
      );
    });
  });

  it('toggling arming sounds calls Bridge.request', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<ModeDelaySettings {...defaultProps} />);

    fireEvent.click(screen.getAllByRole('switch')[0]);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subsecurity:abc',
        { [`${SecurityAlarmMode.ATTR_SOUNDSENABLED}:ON`]: false },
      );
    });
  });

  it('toggling silent alarm calls Bridge.request', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<ModeDelaySettings {...defaultProps} />);

    fireEvent.click(screen.getAllByRole('switch')[1]);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subsecurity:abc',
        { [`${SecurityAlarmMode.ATTR_SILENT}:ON`]: true },
      );
    });
  });

  it('uses PARTIAL mode key when mode is PARTIAL', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<ModeDelaySettings {...defaultProps} mode="PARTIAL" label="Partial" />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '120' } });

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subsecurity:abc',
        { [`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:PARTIAL`]: 120 },
      );
    });
  });

  it('dispatches error notification on delay change failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<ModeDelaySettings {...defaultProps} />);

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '90' } });

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update delay setting' },
      });
    });
  });

  it('dispatches error notification on toggle failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<ModeDelaySettings {...defaultProps} />);

    fireEvent.click(screen.getAllByRole('switch')[0]);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update setting' },
      });
    });
  });
});

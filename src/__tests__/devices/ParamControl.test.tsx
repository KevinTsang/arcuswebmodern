import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParamControl } from '@/components/device/device-settings/ParamControl';
import type { ParamDescriptor } from '@/components/device/device-settings/types';

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

const enumParam = (overrides: Partial<ParamDescriptor> = {}): ParamDescriptor => ({
  paramId: 'ledMode',
  name: 'ledMode',
  description: 'Parameter 5: LED indicator',
  type: 'enum',
  values: { '0': 'Off when all off', '1': 'On when any on', '2': 'Always off', '3': 'Always on' },
  dflt: 0,
  value: '0',
  ...overrides,
});

const rangeParam = (overrides: Partial<ParamDescriptor> = {}): ParamDescriptor => ({
  paramId: 'autoOffTimer',
  name: 'autoOffTimer',
  description: 'Parameter 6: R1 auto turn-off timer',
  type: 'range',
  min: 0,
  max: 65535,
  dflt: 0,
  value: '0',
  ...overrides,
});

const booleanParam = (overrides: Partial<ParamDescriptor> = {}): ParamDescriptor => ({
  paramId: 'dcMotorMode',
  name: 'dcMotorMode',
  description: 'Parameter 24: DC motor mode',
  type: 'boolean',
  dflt: 0,
  value: '0',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({ status: 'OK' });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ParamControl – rendering', () => {
  it('renders the param description', () => {
    render(<ParamControl address="DRIV:dev:d1" param={enumParam()} />);
    expect(screen.getByText('Parameter 5: LED indicator')).toBeInTheDocument();
  });

  it('renders enum buttons for enum params', () => {
    render(<ParamControl address="DRIV:dev:d1" param={enumParam()} />);
    expect(screen.getByText('Off when all off')).toBeInTheDocument();
    expect(screen.getByText('Always on')).toBeInTheDocument();
  });

  it('renders number input for range params', () => {
    render(<ParamControl address="DRIV:dev:d1" param={rangeParam()} />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('renders Disabled/Enabled buttons for boolean params', () => {
    render(<ParamControl address="DRIV:dev:d1" param={booleanParam()} />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('uses default value when value is not set', () => {
    render(<ParamControl address="DRIV:dev:d1" param={enumParam({ value: undefined, dflt: 2 })} />);
    expect(screen.getByText('Always off').className).toContain('bg-peacock');
  });
});

describe('ParamControl – SetParam calls', () => {
  it('calls Bridge.request with SetParam on enum change', async () => {
    render(<ParamControl address="DRIV:dev:d1" param={enumParam()} />);
    fireEvent.click(screen.getByText('Always on'));
    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'devsettings:SetParam',
        'DRIV:dev:d1',
        { paramId: 'ledMode', value: '3' },
      );
    });
  });

  it('calls Bridge.request with SetParam on boolean change', async () => {
    render(<ParamControl address="DRIV:dev:d1" param={booleanParam()} />);
    fireEvent.click(screen.getByText('Enabled'));
    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'devsettings:SetParam',
        'DRIV:dev:d1',
        { paramId: 'dcMotorMode', value: '1' },
      );
    });
  });

  it('dispatches error on INVALID_VALUE response', async () => {
    mockBridgeRequest.mockResolvedValue({ status: 'INVALID_VALUE' });
    render(<ParamControl address="DRIV:dev:d1" param={enumParam()} />);
    fireEvent.click(screen.getByText('Always on'));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'error', message: 'Invalid value for Parameter 5: LED indicator' }),
        }),
      );
    });
  });

  it('dispatches error notification on request failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<ParamControl address="DRIV:dev:d1" param={enumParam()} />);
    fireEvent.click(screen.getByText('Always on'));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'error', message: 'Failed to update Parameter 5: LED indicator' }),
        }),
      );
    });
  });

  it('does not dispatch error on OK response', async () => {
    mockBridgeRequest.mockResolvedValue({ status: 'OK' });
    render(<ParamControl address="DRIV:dev:d1" param={enumParam()} />);
    fireEvent.click(screen.getByText('Always on'));
    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalled();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

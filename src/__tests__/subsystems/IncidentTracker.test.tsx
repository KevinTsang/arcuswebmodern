import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, AlarmIncident } from '@arcus/core';
import IncidentTracker from '@/components/subsystem/IncidentTracker';
import type { IncidentEntity } from '@/store/entityTypes';

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/incidentsSlice', () => ({
  setCurrentIncident: (payload: unknown) => ({ type: 'incidents/setCurrentIncident', payload }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

function makeIncident(overrides: Partial<IncidentEntity> = {}): IncidentEntity {
  return {
    id: 'SERV:incident:i1',
    [Base.ATTR_ADDRESS]: 'SERV:incident:i1',
    [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT,
    [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_SECURITY,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IncidentTracker', () => {
  it('shows Cancel button for active security alarm', () => {
    render(<IncidentTracker incident={makeIncident()} />);
    expect(screen.getByText('Security Alarm')).toBeInTheDocument();
    expect(screen.getByText('Cancel Alarm')).toBeInTheDocument();
    expect(screen.getByText('Alarm is active')).toBeInTheDocument();
  });

  it('shows tracker for water leak alarm', () => {
    render(<IncidentTracker incident={makeIncident({ [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_WATER })} />);
    expect(screen.getByText('Water Leak Alarm')).toBeInTheDocument();
  });

  it('shows tracker for CO alarm', () => {
    render(<IncidentTracker incident={makeIncident({ [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_CO })} />);
    expect(screen.getByText('Carbon Monoxide Alarm')).toBeInTheDocument();
  });

  it('shows tracker for smoke alarm', () => {
    render(<IncidentTracker incident={makeIncident({ [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_SMOKE })} />);
    expect(screen.getByText('Smoke Alarm')).toBeInTheDocument();
  });

  it('shows tracker for panic alarm', () => {
    render(<IncidentTracker incident={makeIncident({ [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_PANIC })} />);
    expect(screen.getByText('Panic Alarm')).toBeInTheDocument();
  });

  it('shows pre-alert message for PREALERT state', () => {
    render(<IncidentTracker incident={makeIncident({ [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_PREALERT })} />);
    expect(screen.getByText('Pre-alert — alarm will sound shortly')).toBeInTheDocument();
  });

  it('shows fallback label when alert type is unknown', () => {
    const incident = makeIncident();
    delete (incident as Record<string, unknown>)[AlarmIncident.ATTR_ALERT];
    render(<IncidentTracker incident={incident} />);
    expect(screen.getByText('Alarm Active')).toBeInTheDocument();
  });

  it('sends incident:Cancel on Cancel Alarm click', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<IncidentTracker incident={makeIncident()} />);

    fireEvent.click(screen.getByText('Cancel Alarm'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        AlarmIncident.CMD_CANCEL,
        'SERV:incident:i1',
        {},
      );
    });
  });

  it('dispatches success notification after cancel', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<IncidentTracker incident={makeIncident({ [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_WATER })} />);

    fireEvent.click(screen.getByText('Cancel Alarm'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Alarm cancelled' },
      });
    });
  });

  it('clears current incident after cancel', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<IncidentTracker incident={makeIncident()} />);

    fireEvent.click(screen.getByText('Cancel Alarm'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'incidents/setCurrentIncident',
        payload: null,
      });
    });
  });

  it('shows warning message from platform on cancel', async () => {
    mockBridgeRequest.mockResolvedValue({
      warningTitle: 'Hub Offline',
      warningMessage: 'The hub is not responding',
    });
    render(<IncidentTracker incident={makeIncident()} />);

    fireEvent.click(screen.getByText('Cancel Alarm'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'warning', message: 'The hub is not responding' },
      });
    });
  });

  it('shows error notification on cancel failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<IncidentTracker incident={makeIncident()} />);

    fireEvent.click(screen.getByText('Cancel Alarm'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to cancel alarm' },
      });
    });
  });

  it('shows hub offline message on UnknownDevice error', async () => {
    mockBridgeRequest.mockRejectedValue({ code: 'UnknownDevice' });
    render(<IncidentTracker incident={makeIncident()} />);

    fireEvent.click(screen.getByText('Cancel Alarm'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: {
          type: 'error',
          message: 'Cannot stop alarm sounds — Hub has lost connection. The Monitoring Station will call to assist.',
        },
      });
    });
  });
});

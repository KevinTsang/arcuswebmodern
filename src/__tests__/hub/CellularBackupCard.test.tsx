import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Account, Base, CellBackupSubsystem, Hub, Hub4g, HubNetwork, Place } from '@arcus/core';
import { CellularBackupCard } from '@/components/hub/CellularBackupCard';
import type { HubAdvancedAttributes } from '@/components/hub/hubAdvancedTypes';
import { makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
let mockState: any;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel(mockState),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_ADDRESS = 'SERV:LWF-1234:hub';
const PLACE_ID = 'place-1';
const ACCOUNT_ID = 'acct-1';
const ACCOUNT_ADDRESS = `SERV:account:${ACCOUNT_ID}`;
const CELLBACKUP_ADDRESS = `SERV:${CellBackupSubsystem.NAMESPACE}:${PLACE_ID}`;

function makeHub(overrides: Partial<HubAdvancedAttributes> = {}): HubAdvancedAttributes {
  return {
    [Base.ATTR_ADDRESS]: HUB_ADDRESS,
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
    [HubNetwork.ATTR_TYPE]: HubNetwork.TYPE_ETH,
    [Hub4g.ATTR_PRESENT]: true,
    [Hub4g.ATTR_VENDOR]: 'Sierra',
    [Hub4g.ATTR_MODEL]: 'MC7354',
    [Hub4g.ATTR_CONNECTIONSTATE]: Hub4g.CONNECTIONSTATE_DISCONNECTED,
    [Hub4g.ATTR_SIGNALBARS]: 4,
    [Hub4g.ATTR_IMEI]: '359225050000000',
    [Hub4g.ATTR_SIMPRESENT]: true,
    [Hub4g.ATTR_SIMPROVISIONED]: true,
    [Hub4g.ATTR_SIMDISABLED]: false,
    [Hub4g.ATTR_ICCID]: '8901260000000000000',
    ...overrides,
  };
}

interface StateOptions {
  status?: string;
  notReady?: string;
  error?: string;
  serviceLevel?: string;
  addons?: string[];
  owner?: boolean;
  card?: boolean;
  noSubsystem?: boolean;
}

function setState({
  status = CellBackupSubsystem.STATUS_NOTREADY,
  notReady = CellBackupSubsystem.NOTREADYSTATE_NEEDSSUB,
  error = CellBackupSubsystem.ERRORSTATE_NONE,
  serviceLevel = Place.SERVICELEVEL_PREMIUM,
  addons = [],
  owner = true,
  card = true,
  noSubsystem = false,
}: StateOptions = {}) {
  const sub = makeSubsystem(CELLBACKUP_ADDRESS, {
    [CellBackupSubsystem.ATTR_STATUS]: status,
    [CellBackupSubsystem.ATTR_NOTREADYSTATE]: notReady,
    [CellBackupSubsystem.ATTR_ERRORSTATE]: error,
  });
  mockState = {
    subsystems: noSubsystem ? { ids: [], entities: {} } : { ids: [sub.id], entities: { [sub.id]: sub } },
    place: {
      place: {
        [Base.ATTR_ADDRESS]: `SERV:place:${PLACE_ID}`,
        [Base.ATTR_ID]: PLACE_ID,
        [Place.ATTR_ACCOUNT]: owner ? ACCOUNT_ID : 'acct-other',
        [Place.ATTR_SERVICELEVEL]: serviceLevel,
        [Place.ATTR_SERVICEADDONS]: addons,
      },
    },
    auth: {
      account: {
        [Base.ATTR_ADDRESS]: ACCOUNT_ADDRESS,
        [Base.ATTR_ID]: ACCOUNT_ID,
        ...(card ? { [Account.ATTR_BILLINGCCLAST4]: '4242' } : {}),
      },
    },
  };
}

function notification(type: string, message: string) {
  return { type: 'ui/addNotification', payload: { type, message } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  setState();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CellularBackupCard', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CellularBackupCard hub={makeHub()} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the subsystem status and the modem details', () => {
      render(<CellularBackupCard hub={makeHub()} />);
      expect(screen.getByTestId('hub-cellular-value-status')).toHaveTextContent('Needs the Cellular Backup add-on');
      expect(screen.getByTestId('hub-cellular-value-plan')).toHaveTextContent('Not added');
      expect(screen.getByTestId('hub-cellular-value-4g-modem')).toHaveTextContent('Sierra MC7354');
      expect(screen.getByTestId('hub-cellular-value-modem-connection')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('hub-cellular-value-signal')).toHaveTextContent('4 of 5 bars');
      expect(screen.getByTestId('hub-cellular-value-imei')).toHaveTextContent('359225050000000');
      expect(screen.getByTestId('hub-cellular-value-sim')).toHaveTextContent('8901260000000000000');
    });

    it('shows when the hub is running on cellular backup', () => {
      setState({ status: CellBackupSubsystem.STATUS_ACTIVE, addons: [Place.SERVICEADDON_CELLBACKUP] });
      render(<CellularBackupCard hub={makeHub({ [HubNetwork.ATTR_TYPE]: HubNetwork.TYPE_3G })} />);
      expect(screen.getByTestId('hub-cellular-in-use')).toBeInTheDocument();
      expect(screen.getByTestId('hub-cellular-value-status')).toHaveTextContent('In use');
      expect(screen.getByTestId('hub-cellular-value-plan')).toHaveTextContent('Added');
    });

    it('shows the error state', () => {
      setState({ status: CellBackupSubsystem.STATUS_ERRORED, error: CellBackupSubsystem.ERRORSTATE_NOSIM });
      render(<CellularBackupCard hub={makeHub({ [Hub4g.ATTR_SIMPRESENT]: false })} />);
      expect(screen.getByTestId('hub-cellular-value-status')).toHaveTextContent('No SIM card in the modem');
      expect(screen.getByTestId('hub-cellular-value-sim')).toHaveTextContent('Not inserted');
    });
  });

  describe('adding the add-on', () => {
    it('updates the service plan with CELLBACKUP on', async () => {
      render(<CellularBackupCard hub={makeHub()} />);
      expect(screen.getByTestId('hub-cellular-toggle')).toHaveTextContent('Add Cellular Backup');
      fireEvent.click(screen.getByTestId('hub-cellular-toggle'));
      fireEvent.click(screen.getByTestId('hub-cellular-confirm-yes'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Account.CMD_UPDATESERVICEPLAN, ACCOUNT_ADDRESS, {
          placeID: PLACE_ID,
          serviceLevel: Place.SERVICELEVEL_PREMIUM,
          addons: { [Place.SERVICEADDON_CELLBACKUP]: true },
        },
      ));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(
        notification('success', 'Cellular Backup has been added to your service plan.'),
      ));
      expect(screen.queryByTestId('hub-cellular-confirm')).not.toBeInTheDocument();
    });

    it('keeps the confirmation open and shows an error when it fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('declined'));
      render(<CellularBackupCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-cellular-toggle'));
      fireEvent.click(screen.getByTestId('hub-cellular-confirm-yes'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(notification('error', 'Failed to add Cellular Backup')));
      expect(screen.getByTestId('hub-cellular-confirm')).toBeInTheDocument();
      expect(screen.getByTestId('hub-cellular-confirm-yes')).not.toBeDisabled();
    });

    it('shows Saving while the request is in flight', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<CellularBackupCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-cellular-toggle'));
      fireEvent.click(screen.getByTestId('hub-cellular-confirm-yes'));
      await waitFor(() => expect(screen.getByTestId('hub-cellular-confirm-yes')).toBeDisabled());
      expect(screen.getByTestId('hub-cellular-confirm-yes')).toHaveTextContent('Saving...');
    });

    it('requires a payment method first', () => {
      setState({ card: false });
      render(<CellularBackupCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-cellular-toggle'));
      expect(screen.getByTestId('hub-cellular-needs-billing')).toBeInTheDocument();
      expect(screen.getByTestId('hub-cellular-confirm-yes')).toBeDisabled();
    });

    it('closes the confirmation on Cancel without a request', () => {
      render(<CellularBackupCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-cellular-toggle'));
      fireEvent.click(screen.getByTestId('hub-cellular-confirm-cancel'));
      expect(screen.queryByTestId('hub-cellular-confirm')).not.toBeInTheDocument();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('removing the add-on', () => {
    it('updates the service plan with CELLBACKUP off, even without a card', async () => {
      setState({ addons: [Place.SERVICEADDON_CELLBACKUP], status: CellBackupSubsystem.STATUS_READY, card: false });
      render(<CellularBackupCard hub={makeHub()} />);
      expect(screen.getByTestId('hub-cellular-toggle')).toHaveTextContent('Remove Cellular Backup');
      fireEvent.click(screen.getByTestId('hub-cellular-toggle'));
      fireEvent.click(screen.getByTestId('hub-cellular-confirm-yes'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Account.CMD_UPDATESERVICEPLAN, ACCOUNT_ADDRESS, expect.objectContaining({
          addons: { [Place.SERVICEADDON_CELLBACKUP]: false },
        }),
      ));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(
        notification('success', 'Cellular Backup has been removed from your service plan.'),
      ));
    });

    it('shows an error when removing fails', async () => {
      setState({ addons: [Place.SERVICEADDON_CELLBACKUP] });
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<CellularBackupCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-cellular-toggle'));
      fireEvent.click(screen.getByTestId('hub-cellular-confirm-yes'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(notification('error', 'Failed to remove Cellular Backup')));
    });
  });

  describe('edge cases', () => {
    it('offers no toggle on Pro Monitoring, which includes cellular backup', () => {
      setState({ serviceLevel: Place.SERVICELEVEL_PREMIUM_PROMON });
      render(<CellularBackupCard hub={makeHub()} />);
      expect(screen.getByTestId('hub-cellular-value-plan')).toHaveTextContent('Included with Pro Monitoring');
      expect(screen.queryByTestId('hub-cellular-toggle')).not.toBeInTheDocument();
    });

    it('offers no toggle to someone who does not own the place', () => {
      setState({ owner: false });
      render(<CellularBackupCard hub={makeHub()} />);
      expect(screen.queryByTestId('hub-cellular-toggle')).not.toBeInTheDocument();
    });

    it('hides modem details when no modem is present', () => {
      render(<CellularBackupCard hub={makeHub({ [Hub4g.ATTR_PRESENT]: false })} />);
      expect(screen.getByTestId('hub-cellular-value-4g-modem')).toHaveTextContent('Not detected');
      expect(screen.queryByTestId('hub-cellular-value-imei')).not.toBeInTheDocument();
    });

    it('shows Unavailable without a cellular backup subsystem', () => {
      setState({ noSubsystem: true });
      render(<CellularBackupCard hub={makeHub()} />);
      expect(screen.getByTestId('hub-cellular-value-status')).toHaveTextContent('Unavailable');
    });

    it('does not claim cellular is in use while the hub is down', () => {
      render(<CellularBackupCard hub={makeHub({ [HubNetwork.ATTR_TYPE]: HubNetwork.TYPE_3G, [Hub.ATTR_STATE]: Hub.STATE_DOWN })} />);
      expect(screen.queryByTestId('hub-cellular-in-use')).not.toBeInTheDocument();
    });

    it('shows an unprovisioned SIM', () => {
      render(<CellularBackupCard hub={makeHub({ [Hub4g.ATTR_SIMPROVISIONED]: false })} />);
      expect(screen.getByTestId('hub-cellular-value-sim')).toHaveTextContent('Not provisioned');
    });
  });
});

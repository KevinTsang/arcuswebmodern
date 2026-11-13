import { render, screen } from '@testing-library/react';
import { Base, Hub, HubAdvanced } from '@arcus/core';
import { HubPanel } from '@/components/devices/HubPanel';
import type { HubData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockHub: HubData | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: { hub: { hub: HubData | null } }) => unknown) => sel({ hub: { hub: mockHub } }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makeHub(attrs: Partial<HubData> = {}): HubData {
  return {
    [Base.ATTR_ADDRESS]: 'SERV:ABC-1234:hub',
    [Hub.ATTR_NAME]: 'Home Hub',
    [Hub.ATTR_MODEL]: 'IH300',
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
    [HubAdvanced.ATTR_OSVER]: '3.1.0',
    ...attrs,
  };
}

const FIRMWARE_RESTART = { [HubAdvanced.ATTR_LASTRESTARTREASON]: HubAdvanced.LASTRESTARTREASON_FIRMWARE_UPDATE };

beforeEach(() => {
  mockHub = makeHub();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HubPanel />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot while the hub updates firmware', () => {
    mockHub = makeHub({ [Hub.ATTR_STATE]: Hub.STATE_DOWN, ...FIRMWARE_RESTART });
    const { asFragment } = render(<HubPanel />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the hub name, online status and firmware version', () => {
    render(<HubPanel />);
    expect(screen.getByTestId('hub-name')).toHaveTextContent('Home Hub');
    expect(screen.getByTestId('hub-status')).toHaveTextContent('Online · v3.1.0');
    expect(screen.getByTestId('hub-panel')).toHaveAttribute('data-firmware-updating', 'false');
  });

  it('shows Offline for a hub that went down for another reason', () => {
    mockHub = makeHub({
      [Hub.ATTR_STATE]: Hub.STATE_DOWN,
      [HubAdvanced.ATTR_LASTRESTARTREASON]: HubAdvanced.LASTRESTARTREASON_REQUESTED,
    });
    render(<HubPanel />);
    expect(screen.getByTestId('hub-status')).toHaveTextContent('Offline · v3.1.0');
    expect(screen.getByTestId('hub-panel')).toHaveAttribute('data-online', 'false');
  });

  it('shows Firmware Updating for an offline hub applying an update', () => {
    mockHub = makeHub({ [Hub.ATTR_STATE]: Hub.STATE_DOWN, ...FIRMWARE_RESTART });
    render(<HubPanel />);
    expect(screen.getByTestId('hub-status')).toHaveTextContent('Firmware Updating · v3.1.0');
    expect(screen.getByTestId('hub-panel')).toHaveAttribute('data-firmware-updating', 'true');
  });

  it('shows Online once the hub is back after a firmware update', () => {
    mockHub = makeHub(FIRMWARE_RESTART);
    render(<HubPanel />);
    expect(screen.getByTestId('hub-status')).toHaveTextContent('Online · v3.1.0');
  });

  it('omits the version when hubadv:osver is missing', () => {
    mockHub = makeHub({ [HubAdvanced.ATTR_OSVER]: undefined });
    render(<HubPanel />);
    expect(screen.getByTestId('hub-status')).toHaveTextContent(/^Online$/);
  });

  it('falls back to the model when the hub has no name', () => {
    mockHub = makeHub({ [Hub.ATTR_NAME]: undefined });
    render(<HubPanel />);
    expect(screen.getByTestId('hub-name')).toHaveTextContent('IH300');
  });

  it('renders nothing without a hub', () => {
    mockHub = null;
    render(<HubPanel />);
    expect(screen.queryByTestId('hub-panel')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { Base, Hub } from '@arcus/core';
import { HubAdvancedSettings } from '@/components/hub/HubAdvancedSettings';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockHub: Record<string, string> | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ hub: { hub: mockHub } }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

jest.mock('@/components/hub/HubSoundsCard', () => ({
  HubSoundsCard: ({ hub }: any) => <div data-testid="mock-sounds">{hub[Base.ATTR_ADDRESS]}</div>,
}));
jest.mock('@/components/hub/CellularBackupCard', () => ({
  CellularBackupCard: () => <div data-testid="mock-cellular" />,
}));
jest.mock('@/components/hub/ZWaveNetworkCard', () => ({
  ZWaveNetworkCard: () => <div data-testid="mock-zwave" />,
}));
jest.mock('@/components/hub/ZigbeeNetworkCard', () => ({
  ZigbeeNetworkCard: () => <div data-testid="mock-zigbee" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_ADDRESS = 'SERV:LWF-1234:hub';

beforeEach(() => {
  jest.clearAllMocks();
  mockHub = { [Base.ATTR_ADDRESS]: HUB_ADDRESS, [Hub.ATTR_STATE]: Hub.STATE_NORMAL };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubAdvancedSettings', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HubAdvancedSettings />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders every section for the hub', () => {
    render(<HubAdvancedSettings />);
    expect(screen.getByTestId('hub-advanced-title')).toHaveTextContent('Hub Advanced Settings');
    expect(screen.getByTestId('mock-sounds')).toHaveTextContent(HUB_ADDRESS);
    expect(screen.getByTestId('mock-cellular')).toBeInTheDocument();
    expect(screen.getByTestId('mock-zwave')).toBeInTheDocument();
    expect(screen.getByTestId('mock-zigbee')).toBeInTheDocument();
  });

  it('links back to Devices', () => {
    render(<HubAdvancedSettings />);
    expect(screen.getByTestId('hub-advanced-back')).toHaveAttribute('href', '/devices');
  });

  it('explains when there is no hub', () => {
    mockHub = null;
    render(<HubAdvancedSettings />);
    expect(screen.getByTestId('hub-advanced-no-hub')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-sounds')).not.toBeInTheDocument();
  });
});

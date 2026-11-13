import { render, screen, fireEvent } from '@testing-library/react';
import { isValidElement } from 'react';
import { Base, Hub, HubAdvanced, HubPower } from '@arcus/core';
import { HubPanel } from '@/components/devices/HubPanel';
import { HubSettingsPanel } from '@/components/hub/HubSettingsPanel';
import type { HubData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
let mockHub: HubData | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ hub: { hub: mockHub } }),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/components/hub/HubSettingsPanel', () => ({
  HubSettingsPanel: () => <div>HubSettingsPanel</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makeHub(overrides: Partial<HubData> = {}): HubData {
  return {
    [Base.ATTR_ADDRESS]: 'SERV:ABC-1234:hub',
    [Hub.ATTR_NAME]: 'Home Hub',
    [Hub.ATTR_MODEL]: 'IH300',
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
    [HubAdvanced.ATTR_OSVER]: '3.1.0',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHub = makeHub();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HubPanel />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the hub name, status and firmware', () => {
    render(<HubPanel />);
    expect(screen.getByTestId('hub-name')).toHaveTextContent('Home Hub');
    expect(screen.getByTestId('hub-status')).toHaveTextContent('Online · v3.1.0');
    expect(screen.getByTestId('hub-panel')).toHaveAttribute('data-online', 'true');
  });

  it('shows offline and the battery level on battery power', () => {
    mockHub = makeHub({
      [Hub.ATTR_STATE]: Hub.STATE_DOWN,
      [HubAdvanced.ATTR_OSVER]: undefined,
      [HubPower.ATTR_SOURCE]: HubPower.SOURCE_BATTERY,
      'hubpow:mainslevel': 42.4,
    });
    render(<HubPanel />);
    expect(screen.getByTestId('hub-status')).toHaveTextContent('Offline · Battery: 42%');
  });

  it('falls back to the model for a hub without a name', () => {
    mockHub = makeHub({ [Hub.ATTR_NAME]: undefined });
    render(<HubPanel />);
    expect(screen.getByTestId('hub-name')).toHaveTextContent('IH300');
  });

  it('opens the hub settings panel', () => {
    render(<HubPanel />);
    fireEvent.click(screen.getByTestId('hub-settings-open'));

    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Hub Settings', key: 'hub-settings' });
    const content = mockOpenRight.mock.calls[0][0];
    expect(isValidElement(content) && content.type).toBe(HubSettingsPanel);
  });

  it('renders nothing without a hub', () => {
    mockHub = null;
    const { container } = render(<HubPanel />);
    expect(container).toBeEmptyDOMElement();
  });
});

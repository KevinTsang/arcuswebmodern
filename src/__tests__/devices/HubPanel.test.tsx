import { render, screen } from '@testing-library/react';
import { Base, Hub, HubAdvanced } from '@arcus/core';
import { HubPanel } from '@/components/devices/HubPanel';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockHub: Record<string, string> | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ hub: { hub: mockHub } }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

beforeEach(() => {
  mockHub = {
    [Base.ATTR_ADDRESS]: 'SERV:LWF-1234:hub',
    [Hub.ATTR_NAME]: 'Home Hub',
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
    [HubAdvanced.ATTR_OSVER]: '3.1.0',
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HubPanel />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the hub name and status', () => {
    render(<HubPanel />);
    expect(screen.getByTestId('hub-name')).toHaveTextContent('Home Hub');
    expect(screen.getByTestId('hub-status')).toHaveTextContent('Online · v3.1.0');
  });

  it('links to the advanced hub settings', () => {
    render(<HubPanel />);
    expect(screen.getByTestId('hub-advanced-link')).toHaveAttribute('href', '/devices/hub-advanced');
  });

  it('renders nothing without a hub', () => {
    mockHub = null;
    const { container } = render(<HubPanel />);
    expect(container).toBeEmptyDOMElement();
  });
});

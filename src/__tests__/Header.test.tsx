import { render, screen, fireEvent, within } from '@testing-library/react';
import { Person } from '@arcus/core';
import Header from '@/components/Header';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockPathname = '/home';
let mockState: { auth: { person: Record<string, unknown> | null; account: Record<string, unknown> | null } };
const mockOpenRight = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel(mockState),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

// PlaceSelector fetches places on mount — stub it; Header only passes it to openRight.
jest.mock('@/components/PlaceSelector', () => ({
  __esModule: true,
  default: () => <div>place selector</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const NAV = [
  { slug: 'dashboard', label: 'Dashboard', href: '/home' },
  { slug: 'scenes', label: 'Scenes', href: '/scenes' },
  { slug: 'rules', label: 'Rules', href: '/rules' },
  { slug: 'devices', label: 'Devices', href: '/devices' },
  { slug: 'settings', label: 'Settings', href: '/settings' },
];

function signedIn(firstName?: string) {
  mockState = {
    auth: {
      person: { personId: 'p1', ...(firstName !== undefined ? { [Person.ATTR_FIRSTNAME]: firstName } : {}) },
      account: { 'base:address': 'SERV:account:a1' },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/home';
  signedIn('Alice');
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('Header', () => {
  it('matches snapshot', () => {
    const { container } = render(<Header />);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('logo', () => {
    it('renders the Arcus logo and name inside the home link', () => {
      render(<Header />);
      const home = screen.getByTestId('header-home-link');
      expect(home).toHaveAttribute('href', '/home');
      expect(home).toHaveTextContent('Arcus');
      expect(within(home).getByTestId('arcus-logo')).toBeInTheDocument();
    });

    it('keeps the logo decorative so the link is named by its text', () => {
      render(<Header />);
      expect(within(screen.getByTestId('header-home-link')).getByTestId('arcus-logo')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByRole('link', { name: 'Arcus' })).toHaveAttribute('href', '/home');
    });
  });

  describe('desktop navigation', () => {
    it.each(NAV)('links $label to $href', ({ slug, label, href }) => {
      render(<Header />);
      const link = screen.getByTestId(`header-nav-${slug}`);
      expect(link).toHaveTextContent(label);
      expect(link).toHaveAttribute('href', href);
    });

    it('marks only the link matching the current path as active', () => {
      mockPathname = '/devices';
      render(<Header />);
      expect(screen.getByTestId('header-nav-devices')).toHaveAttribute('aria-current', 'page');
      for (const { slug } of NAV.filter((n) => n.slug !== 'devices')) {
        expect(screen.getByTestId(`header-nav-${slug}`)).not.toHaveAttribute('aria-current');
      }
    });

    it('treats nested routes as part of their section', () => {
      mockPathname = '/rules/edit/123';
      render(<Header />);
      expect(screen.getByTestId('header-nav-rules')).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('greeting', () => {
    it('greets the signed-in person by first name', () => {
      render(<Header />);
      expect(screen.getByTestId('header-greeting')).toHaveTextContent('Hello, Alice');
    });

    it('omits the greeting when the person has no first name', () => {
      signedIn();
      render(<Header />);
      expect(screen.queryByTestId('header-greeting')).not.toBeInTheDocument();
    });

    it('omits the greeting when there is no person', () => {
      mockState = { auth: { person: null, account: { 'base:address': 'SERV:account:a1' } } };
      render(<Header />);
      expect(screen.queryByTestId('header-greeting')).not.toBeInTheDocument();
    });
  });

  describe('place selector', () => {
    it('opens the place selector in the right panel', () => {
      render(<Header />);
      fireEvent.click(screen.getByTestId('header-places'));
      expect(mockOpenRight).toHaveBeenCalledTimes(1);
      render(mockOpenRight.mock.calls[0][0]);
      expect(screen.getByText('place selector')).toBeInTheDocument();
    });

    it('does nothing while the account is still loading', () => {
      mockState = { auth: { person: { personId: 'p1' }, account: null } };
      render(<Header />);
      fireEvent.click(screen.getByTestId('header-places'));
      expect(mockOpenRight).not.toHaveBeenCalled();
    });
  });

  describe('mobile navigation', () => {
    it('is closed initially', () => {
      render(<Header />);
      expect(screen.queryByTestId('header-mobile-nav')).not.toBeInTheDocument();
    });

    it('opens from the menu toggle with all links and the active one marked', () => {
      mockPathname = '/scenes';
      render(<Header />);
      fireEvent.click(screen.getByLabelText('Toggle menu'));
      expect(screen.getByTestId('header-mobile-nav')).toBeInTheDocument();
      for (const { slug, href } of NAV) {
        expect(screen.getByTestId(`header-mobile-nav-${slug}`)).toHaveAttribute('href', href);
      }
      expect(screen.getByTestId('header-mobile-nav-scenes')).toHaveAttribute('aria-current', 'page');
    });

    it('closes when the toggle is pressed again', () => {
      render(<Header />);
      fireEvent.click(screen.getByLabelText('Toggle menu'));
      fireEvent.click(screen.getByLabelText('Toggle menu'));
      expect(screen.queryByTestId('header-mobile-nav')).not.toBeInTheDocument();
    });

    it('closes from the close button', () => {
      render(<Header />);
      fireEvent.click(screen.getByLabelText('Toggle menu'));
      fireEvent.click(screen.getByLabelText('Close menu'));
      expect(screen.queryByTestId('header-mobile-nav')).not.toBeInTheDocument();
    });

    it('closes when the backdrop is clicked', () => {
      render(<Header />);
      fireEvent.click(screen.getByLabelText('Toggle menu'));
      fireEvent.click(screen.getByTestId('header-mobile-backdrop'));
      expect(screen.queryByTestId('header-mobile-nav')).not.toBeInTheDocument();
    });

    it('closes after following a link', () => {
      render(<Header />);
      fireEvent.click(screen.getByLabelText('Toggle menu'));
      fireEvent.click(screen.getByTestId('header-mobile-nav-rules'));
      expect(screen.queryByTestId('header-mobile-nav')).not.toBeInTheDocument();
    });
  });
});

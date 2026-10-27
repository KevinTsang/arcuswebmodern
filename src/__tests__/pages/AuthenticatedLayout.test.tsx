import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import AuthenticatedLayout from '@/app/(authenticated)/layout';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDispatch = jest.fn();
const mockUsePairingFlowExit = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/home',
}));

interface LayoutState {
  auth: { authenticated: boolean; authenticating: boolean; person: { personId: string; places: [] } | null };
  place: { placeId: string | null; ready: boolean };
  incidents: { currentIncident: string | null };
}

let mockState: LayoutState;

jest.mock('@/store/hooks', () => ({
  useAppSelector: <T,>(sel: (s: LayoutState) => T): T => sel(mockState),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/thunks/loadPlaceDataThunk', () => ({
  loadPlaceDataThunk: (placeId: string) => ({ type: 'place/loadPlaceData', payload: placeId }),
}));

jest.mock('@/store/thunks/placeSelection', () => ({
  getDefaultPlaceId: () => 'place-1',
}));

jest.mock('@/hooks/usePairingFlowExit', () => ({
  usePairingFlowExit: () => mockUsePairingFlowExit(),
}));

jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header" />,
}));

jest.mock('@/components/AlarmBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="alarm-banner" />,
}));

jest.mock('@/components/InvitationBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="invitation-banner" />,
}));

jest.mock('@/components/SidePanel', () => ({
  SidePanelProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function renderLayout() {
  return render(
    <AuthenticatedLayout>
      <div data-testid="page">Page</div>
    </AuthenticatedLayout>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    auth: { authenticated: true, authenticating: false, person: { personId: 'person-1', places: [] } },
    place: { placeId: 'place-1', ready: true },
    incidents: { currentIncident: null },
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AuthenticatedLayout – rendering', () => {
  it('matches snapshot', () => {
    const { container } = renderLayout();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the header, banners and page once place data is ready', () => {
    renderLayout();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('alarm-banner')).toBeInTheDocument();
    expect(screen.getByTestId('invitation-banner')).toBeInTheDocument();
    expect(screen.getByTestId('page')).toBeInTheDocument();
  });

  it('holds the page back while place data loads', () => {
    mockState.place.ready = false;
    renderLayout();
    expect(screen.getByText('Loading place data...')).toBeInTheDocument();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });
});

describe('AuthenticatedLayout – pairing flow exit', () => {
  it('watches route changes for the pairing flow', () => {
    renderLayout();
    expect(mockUsePairingFlowExit).toHaveBeenCalled();
  });

  it('watches route changes while the session is still being restored', () => {
    mockState.auth.authenticating = true;
    renderLayout();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(mockUsePairingFlowExit).toHaveBeenCalled();
  });
});

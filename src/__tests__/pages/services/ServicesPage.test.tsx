import { render, screen } from '@testing-library/react';
import { Place } from '@arcus/core';
import ServicesIndexPage from '@/app/(authenticated)/services/page';
import SubsystemPage, {
  generateStaticParams,
} from '@/app/(authenticated)/services/[subsystem]/[[...action]]/page';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockPlaceName: string = 'Your Home';
const mockPush = jest.fn();
const mockRedirect = jest.fn();
const mockNotFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  redirect: (url: string) => mockRedirect(url),
  notFound: () => mockNotFound(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({ place: { place: { [Place.ATTR_NAME]: mockPlaceName } } }),
  useAppDispatch: () => jest.fn(),
}));

// Mock subsystem views. AlarmsView echoes the action prop so we can assert
// the /services/<subsystem>/<action> segment reaches the view.
jest.mock('@/components/subsystems', () => ({
  AlarmsView: ({ action }: any) => <div data-testid="alarms-view">AlarmsView:{action}</div>,
  CamerasView: () => <div data-testid="cameras-view">CamerasView</div>,
  CareView: () => <div data-testid="care-view">CareView</div>,
  ClimateView: () => <div data-testid="climate-view">ClimateView</div>,
  DoorsLocksView: () => <div data-testid="doors-locks-view">DoorsLocksView</div>,
  HomeFamilyView: () => <div data-testid="home-family-view">HomeFamilyView</div>,
  LawnGardenView: () => <div data-testid="lawn-garden-view">LawnGardenView</div>,
  GenericDeviceListView: ({ config }: any) => <div data-testid="generic-view">{config.name}</div>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPlaceName = 'Your Home';
});

// Render the async server component by awaiting its returned element tree.
async function renderPage(subsystem: string, action?: string[]) {
  return render(await SubsystemPage({ params: Promise.resolve({ subsystem, action }) }));
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('ServicesIndexPage – redirect', () => {
  it('redirects bare /services to the first subsystem', () => {
    ServicesIndexPage();
    expect(mockRedirect).toHaveBeenCalledWith('/services/alarms/status');
  });
});

describe('SubsystemPage – chrome', () => {
  it('renders the context bar and subsystem navigation around the view', async () => {
    await renderPage('alarms', ['status']);
    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByText('Your Home')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-nav-cameras')).toHaveAttribute(
      'href',
      '/services/cameras/status',
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('highlights the active subsystem in the sidebar', async () => {
    await renderPage('climate', ['status']);
    expect(screen.getByTestId('subsystem-nav-climate').className).toContain('text-peacock');
    expect(screen.getByTestId('subsystem-nav-alarms').className).not.toContain('text-peacock');
  });
});

describe('SubsystemPage – view selection', () => {
  it('renders the view named by the subsystem param', async () => {
    await renderPage('lawn-garden', ['status']);
    expect(screen.getByTestId('lawn-garden-view')).toBeInTheDocument();
    expect(screen.queryByTestId('alarms-view')).not.toBeInTheDocument();
  });

  it('passes the action segment to the view', async () => {
    await renderPage('alarms', ['settings']);
    expect(screen.getByTestId('alarms-view')).toHaveTextContent('AlarmsView:settings');
  });

  it('defaults the action to "status" when omitted', async () => {
    await renderPage('alarms', undefined);
    expect(screen.getByTestId('alarms-view')).toHaveTextContent('AlarmsView:status');
  });

  it('renders the subsystem header for the active subsystem', async () => {
    await renderPage('cameras', ['status']);
    expect(screen.getByRole('heading', { name: 'Cameras' })).toBeInTheDocument();
  });

  it('uses the generic view for subsystems without a custom view', async () => {
    await renderPage('water', ['status']);
    expect(screen.getByTestId('generic-view')).toHaveTextContent('Water');
  });

  it('404s on an unknown subsystem slug', async () => {
    await expect(renderPage('not-a-real-slug', ['status'])).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });
});

describe('SubsystemPage – static params', () => {
  it('enumerates every visible subsystem for static generation', () => {
    const params = generateStaticParams();
    expect(params).toEqual(
      expect.arrayContaining([
        { subsystem: 'alarms', action: ['status'] },
        { subsystem: 'water', action: ['status'] },
      ]),
    );
    // Every entry defaults to the status action.
    expect(params.every((p) => p.action[0] === 'status')).toBe(true);
  });
});

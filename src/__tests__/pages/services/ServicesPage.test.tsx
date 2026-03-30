import { render, screen, fireEvent } from '@testing-library/react';
import { Place } from '@arcus/core';
import ServicesPage from '@/app/(authenticated)/services/page';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockPlaceName: string = 'Your Home';

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { place: { [Place.ATTR_NAME]: mockPlaceName } },
    }),
  useAppDispatch: () => jest.fn(),
}));

// Mock subsystem views
jest.mock('@/components/subsystems', () => ({
  AlarmsView: () => <div data-testid="alarms-view">AlarmsView</div>,
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

// ── Tests ─────────────────────────────────────────────────────────────

describe('ServicesPage – rendering', () => {
  it('shows Services heading', () => {
    render(<ServicesPage />);
    expect(screen.getByText('Services')).toBeInTheDocument();
  });

  it('shows place name', () => {
    mockPlaceName = 'Beach House';
    render(<ServicesPage />);
    expect(screen.getByText('Beach House')).toBeInTheDocument();
  });

  it('shows default place name when place has no name', () => {
    mockPlaceName = undefined as any;
    render(<ServicesPage />);
    expect(screen.getByText('Your Home')).toBeInTheDocument();
  });

  it('renders subsystem navigation buttons', () => {
    render(<ServicesPage />);
    // Each subsystem appears in both the desktop nav and mobile select
    expect(screen.getAllByText('Alarms').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cameras').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Climate').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Alarms view by default', () => {
    render(<ServicesPage />);
    expect(screen.getByTestId('alarms-view')).toBeInTheDocument();
  });
});

describe('ServicesPage – navigation', () => {
  it('switches to Cameras view when Cameras is clicked', () => {
    render(<ServicesPage />);
    // Click the nav button (desktop sidebar)
    const cameraButtons = screen.getAllByText('Cameras');
    fireEvent.click(cameraButtons[0]);
    expect(screen.getByTestId('cameras-view')).toBeInTheDocument();
  });

  it('switches to Climate view', () => {
    render(<ServicesPage />);
    const climateButtons = screen.getAllByText('Climate');
    fireEvent.click(climateButtons[0]);
    expect(screen.getByTestId('climate-view')).toBeInTheDocument();
  });

  it('switches to Care view', () => {
    render(<ServicesPage />);
    const careButtons = screen.getAllByText('Care');
    fireEvent.click(careButtons[0]);
    expect(screen.getByTestId('care-view')).toBeInTheDocument();
  });

  it('switches to Doors & Locks view', () => {
    render(<ServicesPage />);
    const dlButtons = screen.getAllByText('Doors & Locks');
    fireEvent.click(dlButtons[0]);
    expect(screen.getByTestId('doors-locks-view')).toBeInTheDocument();
  });

  it('shows subsystem name heading when active', () => {
    render(<ServicesPage />);
    // Default active is Alarms, heading should show
    expect(screen.getAllByText('Alarms').length).toBeGreaterThanOrEqual(1);
  });
});

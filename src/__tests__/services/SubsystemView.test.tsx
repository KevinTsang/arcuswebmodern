import { render, screen } from '@testing-library/react';
import { SubsystemView } from '@/components/services/SubsystemView';
import { getSubsystemConfigBySlug } from '@/lib/subsystemConfig';

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

function renderFor(slug: string, action = 'status') {
  return render(<SubsystemView config={getSubsystemConfigBySlug(slug)!} action={action} />);
}

describe('SubsystemView', () => {
  it.each([
    ['alarms', 'alarms-view'],
    ['cameras', 'cameras-view'],
    ['care', 'care-view'],
    ['climate', 'climate-view'],
    ['doors-locks', 'doors-locks-view'],
    ['home-family', 'home-family-view'],
    ['lawn-garden', 'lawn-garden-view'],
  ])('renders the custom view for %s', (slug, testid) => {
    renderFor(slug);
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  });

  it.each([
    ['lights-switches', 'Lights & Switches'],
    ['water', 'Water'],
  ])('falls back to the generic view for %s', (slug, name) => {
    renderFor(slug);
    expect(screen.getByTestId('generic-view')).toHaveTextContent(name);
  });

  it('passes the action segment to the alarms view', () => {
    renderFor('alarms', 'settings');
    expect(screen.getByTestId('alarms-view')).toHaveTextContent('AlarmsView:settings');
  });
});

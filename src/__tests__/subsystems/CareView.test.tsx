import { render, screen, fireEvent } from '@testing-library/react';
import { CareSubsystem } from '@arcus/core';
import { CareView } from '@/components/subsystems/CareView';

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
}));

jest.mock('@/hooks/useCareSubsystem', () => ({
  useCareSubsystem: () => ({
    subsystem: undefined,
    alarmState: CareSubsystem.ALARMSTATE_READY,
    alarmMode: CareSubsystem.ALARMMODE_ON,
    behaviors: [],
    careDevices: [],
    callTree: [],
    lastAlertCause: undefined,
    silent: false,
  }),
}));

jest.mock('@/components/subsystems/CareNotificationList', () => ({
  CareNotificationList: () => <div data-testid="mock-care-notification-list" />,
}));

describe('CareView tabs', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CareView />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the status tab by default', () => {
    render(<CareView />);
    expect(screen.getByTestId('care-state')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-care-notification-list')).not.toBeInTheDocument();
  });

  it('shows the care notification list on the Notifications tab', () => {
    render(<CareView />);
    fireEvent.click(screen.getByTestId('care-tab-notifications'));
    expect(screen.getByTestId('mock-care-notification-list')).toBeInTheDocument();
    expect(screen.queryByTestId('care-state')).not.toBeInTheDocument();
  });

  it('switches back from Notifications to Behaviors', () => {
    render(<CareView />);
    fireEvent.click(screen.getByTestId('care-tab-notifications'));
    fireEvent.click(screen.getByTestId('care-tab-behaviors'));
    expect(screen.getByText('No behaviors configured.')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-care-notification-list')).not.toBeInTheDocument();
  });
});

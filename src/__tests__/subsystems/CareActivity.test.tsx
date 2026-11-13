import { render, screen, fireEvent, within } from '@testing-library/react';
import { Device } from '@arcus/core';
import { CareActivity, CARE_ACTIVITY_DAYS } from '@/components/subsystems/CareActivity';
import type { DeviceEntity } from '@/store/entityTypes';
import type { HistoryEntry } from '@/components/history';
import { makeDevice } from '../helpers/factories';
import { CARE_ADDR, makeCareState, type CareState } from '../helpers/careState';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockDevices: DeviceEntity[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => mockDevices,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: jest.fn(),
}));

let mockCare: CareState;

jest.mock('@/hooks/useCareSubsystem', () => ({
  useCareSubsystem: () => mockCare,
}));

interface ActivityState {
  entries: HistoryEntry[];
  loading: boolean;
  hasMore: boolean;
  loadMore: jest.Mock;
  refresh: jest.Mock;
}

const mockUseCareActivity = jest.fn<ActivityState, [string | undefined, number, string | undefined]>();

jest.mock('@/hooks/useCareActivity', () => ({
  useCareActivity: (address: string | undefined, day: number, device?: string) =>
    mockUseCareActivity(address, day, device),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const MOTION = 'DRIV:dev:motion';
const DOOR = 'DRIV:dev:door';
const NOW = new Date(2026, 0, 15, 14, 30);
const TODAY = new Date(2026, 0, 15).getTime();
const YESTERDAY = new Date(2026, 0, 14).getTime();

let activity: ActivityState;

beforeAll(() => {
  (window as any).IntersectionObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn() }));
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: NOW });
  mockDevices = [
    makeDevice(MOTION, { [Device.ATTR_NAME]: 'Hallway Motion' }),
    makeDevice(DOOR, { [Device.ATTR_NAME]: 'Back Door' }),
  ];
  mockCare = makeCareState({ careDevices: [MOTION, DOOR], careCapableDevices: [MOTION, DOOR] });
  activity = {
    entries: [
      { timestamp: TODAY + 9 * 3600_000, subjectName: 'Hallway Motion', longMessage: 'Hallway Motion detected motion.' },
    ],
    loading: false,
    hasMore: false,
    loadMore: jest.fn(),
    refresh: jest.fn(),
  };
  mockUseCareActivity.mockImplementation(() => activity);
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareActivity', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CareActivity />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('loads today for every care device by default', () => {
      render(<CareActivity />);
      expect(mockUseCareActivity).toHaveBeenLastCalledWith(CARE_ADDR, TODAY, undefined);
      expect(screen.getByTestId('care-activity-day')).toHaveValue('0');
      expect(screen.getByTestId('care-activity-device')).toHaveValue('');
    });

    it('offers two weeks of days', () => {
      render(<CareActivity />);
      const options = within(screen.getByTestId('care-activity-day')).getAllByRole('option');
      expect(options).toHaveLength(CARE_ACTIVITY_DAYS);
      expect(options[0]).toHaveTextContent('Today');
      expect(options[1]).toHaveTextContent('Yesterday');
    });

    it('offers each care device as a filter', () => {
      render(<CareActivity />);
      expect(screen.getByRole('option', { name: 'All care devices' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Hallway Motion' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Back Door' })).toBeInTheDocument();
    });

    it('renders the activity entries', () => {
      render(<CareActivity />);
      expect(screen.getByTestId('history-entry-0')).toHaveTextContent('Hallway Motion detected motion.');
    });
  });

  describe('interactions', () => {
    it('changes the day', () => {
      render(<CareActivity />);
      fireEvent.change(screen.getByTestId('care-activity-day'), { target: { value: '1' } });
      expect(mockUseCareActivity).toHaveBeenLastCalledWith(CARE_ADDR, YESTERDAY, undefined);
    });

    it('filters by a device', () => {
      render(<CareActivity />);
      fireEvent.change(screen.getByTestId('care-activity-device'), { target: { value: DOOR } });
      expect(mockUseCareActivity).toHaveBeenLastCalledWith(CARE_ADDR, TODAY, DOOR);
    });

    it('refreshes', () => {
      render(<CareActivity />);
      fireEvent.click(screen.getByTestId('care-activity-refresh'));
      expect(activity.refresh).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('shows the empty state when there is no activity', () => {
      activity = { ...activity, entries: [] };
      render(<CareActivity />);
      expect(screen.getByTestId('history-empty')).toBeInTheDocument();
    });

    it('skips loading and explains when no care devices are selected', () => {
      mockCare = makeCareState({ careDevices: [] });
      const { asFragment } = render(<CareActivity />);
      expect(mockUseCareActivity).toHaveBeenLastCalledWith(undefined, TODAY, undefined);
      expect(screen.getByTestId('care-activity-no-devices')).toBeInTheDocument();
      expect(asFragment()).toMatchSnapshot();
    });

    it('drops the device filter when that device leaves the care devices', () => {
      const { rerender } = render(<CareActivity />);
      fireEvent.change(screen.getByTestId('care-activity-device'), { target: { value: DOOR } });
      mockCare = makeCareState({ careDevices: [MOTION] });
      rerender(<CareActivity />);
      expect(mockUseCareActivity).toHaveBeenLastCalledWith(CARE_ADDR, TODAY, undefined);
      expect(screen.getByTestId('care-activity-device')).toHaveValue('');
    });

    it('labels a device without a name', () => {
      mockDevices = [makeDevice(MOTION)];
      mockCare = makeCareState({ careDevices: [MOTION] });
      render(<CareActivity />);
      expect(screen.getByRole('option', { name: 'Unknown device' })).toBeInTheDocument();
    });
  });
});

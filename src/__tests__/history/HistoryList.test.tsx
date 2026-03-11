import { render, screen } from '@testing-library/react';
import HistoryList from '@/components/history/HistoryList';

const mockLoadMore = jest.fn();

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeAll(() => {
  (window as any).IntersectionObserver = jest.fn(() => ({
    observe: mockObserve,
    disconnect: mockDisconnect,
    unobserve: jest.fn(),
  }));
});

beforeEach(() => jest.clearAllMocks());

const now = new Date('2026-03-10T14:30:00').getTime();
const oneHourAgo = now - 3600_000;
const oneDayAgo = now - 86400_000;

const sameDay = [
  { timestamp: now, subjectName: 'Front Door Lock', longMessage: 'Lock was locked' },
  { timestamp: oneHourAgo, subjectName: 'Motion Sensor', longMessage: 'Motion detected' },
];

const multiDay = [
  { timestamp: now, subjectName: 'Front Door Lock', longMessage: 'Lock was locked' },
  { timestamp: oneDayAgo, subjectName: 'Smart Plug', longMessage: 'Turned on' },
];

describe('HistoryList – empty state', () => {
  it('shows "No recent activity." when entries are empty and not loading', () => {
    render(<HistoryList entries={[]} loading={false} hasMore={false} onLoadMore={mockLoadMore} />);
    expect(screen.getByText('No recent activity.')).toBeInTheDocument();
  });

  it('does not show empty message while loading', () => {
    render(<HistoryList entries={[]} loading={true} hasMore={false} onLoadMore={mockLoadMore} />);
    expect(screen.queryByText('No recent activity.')).not.toBeInTheDocument();
  });
});

describe('HistoryList – rendering entries', () => {
  it('renders entry subject names', () => {
    render(<HistoryList entries={sameDay} loading={false} hasMore={false} onLoadMore={mockLoadMore} />);
    expect(screen.getByText('Front Door Lock')).toBeInTheDocument();
    expect(screen.getByText('Motion Sensor')).toBeInTheDocument();
  });

  it('renders entry messages', () => {
    render(<HistoryList entries={sameDay} loading={false} hasMore={false} onLoadMore={mockLoadMore} />);
    expect(screen.getByText('Lock was locked')).toBeInTheDocument();
    expect(screen.getByText('Motion detected')).toBeInTheDocument();
  });

  it('renders formatted times', () => {
    render(<HistoryList entries={sameDay} loading={false} hasMore={false} onLoadMore={mockLoadMore} />);
    // Times should be present (locale-dependent so just check they render)
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThanOrEqual(2);
  });
});

describe('HistoryList – date grouping', () => {
  it('renders a date header for entries', () => {
    render(<HistoryList entries={sameDay} loading={false} hasMore={false} onLoadMore={mockLoadMore} />);
    // Should have exactly one date header since both entries are same day
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(1);
  });

  it('renders separate date headers for different days', () => {
    render(<HistoryList entries={multiDay} loading={false} hasMore={false} onLoadMore={mockLoadMore} />);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(2);
  });
});

describe('HistoryList – loading state', () => {
  it('shows "Loading more..." when loading', () => {
    render(<HistoryList entries={sameDay} loading={true} hasMore={true} onLoadMore={mockLoadMore} />);
    expect(screen.getByText('Loading more...')).toBeInTheDocument();
  });

  it('does not show "Loading more..." when not loading', () => {
    render(<HistoryList entries={sameDay} loading={false} hasMore={false} onLoadMore={mockLoadMore} />);
    expect(screen.queryByText('Loading more...')).not.toBeInTheDocument();
  });
});

describe('HistoryList – infinite scroll', () => {
  it('sets up IntersectionObserver when hasMore and not loading', () => {
    render(<HistoryList entries={sameDay} loading={false} hasMore={true} onLoadMore={mockLoadMore} />);
    expect(mockObserve).toHaveBeenCalled();
  });

  it('does not set up observer when hasMore is false', () => {
    render(<HistoryList entries={sameDay} loading={false} hasMore={false} onLoadMore={mockLoadMore} />);
    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('does not set up observer while loading', () => {
    render(<HistoryList entries={sameDay} loading={true} hasMore={true} onLoadMore={mockLoadMore} />);
    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('calls onLoadMore when sentinel intersects', () => {
    render(<HistoryList entries={sameDay} loading={false} hasMore={true} onLoadMore={mockLoadMore} />);
    // Get the callback passed to IntersectionObserver constructor
    const observerCallback = (window as any).IntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);
    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('does not call onLoadMore when sentinel is not intersecting', () => {
    render(<HistoryList entries={sameDay} loading={false} hasMore={true} onLoadMore={mockLoadMore} />);
    const observerCallback = (window as any).IntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: false }]);
    expect(mockLoadMore).not.toHaveBeenCalled();
  });
});

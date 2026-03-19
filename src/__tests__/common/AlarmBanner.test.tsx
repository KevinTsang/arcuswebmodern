import { render, screen } from '@testing-library/react';
import { Base, AlarmIncident } from '@arcus/core';
import AlarmBanner from '@/components/AlarmBanner';

let mockIncidents: Record<string, unknown>[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({ incidents: { ids: [], entities: {} } }),
}));

jest.mock('@/store/slices/incidentsSlice', () => ({
  selectAllIncidents: () => mockIncidents,
}));

beforeEach(() => {
  mockIncidents = [];
});

describe('AlarmBanner', () => {
  it('renders nothing when no active incidents', () => {
    const { container } = render(<AlarmBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('renders banner for security alarm', () => {
    mockIncidents = [{
      [Base.ATTR_ADDRESS]: 'SERV:incident:i1',
      [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT,
      [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_SECURITY,
    }];
    render(<AlarmBanner />);
    expect(screen.getByText('Security Alarm — Tap to view')).toBeInTheDocument();
  });

  it('renders banner for water leak alarm', () => {
    mockIncidents = [{
      [Base.ATTR_ADDRESS]: 'SERV:incident:i2',
      [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT,
      [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_WATER,
    }];
    render(<AlarmBanner />);
    expect(screen.getByText('Water Leak Alarm — Tap to view')).toBeInTheDocument();
  });

  it('renders banner for smoke alarm', () => {
    mockIncidents = [{
      [Base.ATTR_ADDRESS]: 'SERV:incident:i3',
      [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT,
      [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_SMOKE,
    }];
    render(<AlarmBanner />);
    expect(screen.getByText('Smoke Alarm — Tap to view')).toBeInTheDocument();
  });

  it('renders banner for CO alarm', () => {
    mockIncidents = [{
      [Base.ATTR_ADDRESS]: 'SERV:incident:i4',
      [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT,
      [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_CO,
    }];
    render(<AlarmBanner />);
    expect(screen.getByText('Carbon Monoxide Alarm — Tap to view')).toBeInTheDocument();
  });

  it('renders banner for panic alarm', () => {
    mockIncidents = [{
      [Base.ATTR_ADDRESS]: 'SERV:incident:i5',
      [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT,
      [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_PANIC,
    }];
    render(<AlarmBanner />);
    expect(screen.getByText('Panic Alarm — Tap to view')).toBeInTheDocument();
  });

  it('renders fallback label when alert type is unknown', () => {
    mockIncidents = [{
      [Base.ATTR_ADDRESS]: 'SERV:incident:i6',
      [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT,
    }];
    render(<AlarmBanner />);
    expect(screen.getByText('Alarm Active — Tap to view')).toBeInTheDocument();
  });

  it('ignores non-ALERT incidents', () => {
    mockIncidents = [{
      [Base.ATTR_ADDRESS]: 'SERV:incident:i7',
      [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_COMPLETE,
      [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_SECURITY,
    }];
    const { container } = render(<AlarmBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('links to /services', () => {
    mockIncidents = [{
      [Base.ATTR_ADDRESS]: 'SERV:incident:i8',
      [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT,
      [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_WATER,
    }];
    render(<AlarmBanner />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/services');
  });
});

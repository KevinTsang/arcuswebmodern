import { render, screen, fireEvent } from '@testing-library/react';
import { IrrigationEventRow } from '@/components/irrigation/IrrigationEventRow';
import { makeEvent, makeZone } from '../helpers/irrigation';

// ── Helpers ───────────────────────────────────────────────────────────

const mockOnEdit = jest.fn();
const ZONES = [makeZone(1, { name: 'Front' }), makeZone(2, { name: 'Back' }), makeZone(3, { name: 'Side' })];
const WEEKLY = makeEvent('w1', {
  timeOfDay: '06:30:00',
  days: ['FRI', 'MON'],
  events: [{ zone: 'z1', duration: 10 }, { zone: 'z2', duration: 5 }, { zone: 'z3', duration: 15 }],
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('IrrigationEventRow', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<IrrigationEventRow event={WEEKLY} zones={ZONES} onEdit={mockOnEdit} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the start time, days, zones and total duration', () => {
    render(<IrrigationEventRow event={WEEKLY} zones={ZONES} onEdit={mockOnEdit} />);
    expect(screen.getByTestId('irrigation-event-time-w1')).toHaveTextContent('6:30 AM');
    expect(screen.getByTestId('irrigation-event-days-w1')).toHaveTextContent('Mon, Fri');
    expect(screen.getByTestId('irrigation-event-zones-w1')).toHaveTextContent('3 Zones: Front, Back & 1 more · 30 min');
  });

  it('omits days for non-weekly events and uses the singular for one zone', () => {
    render(<IrrigationEventRow event={makeEvent('e1')} zones={ZONES} onEdit={mockOnEdit} />);
    expect(screen.queryByTestId('irrigation-event-days-e1')).not.toBeInTheDocument();
    expect(screen.getByTestId('irrigation-event-zones-e1')).toHaveTextContent('1 Zone: Front · 10 min');
  });

  it('handles an event with no zones', () => {
    render(<IrrigationEventRow event={makeEvent('e2', { events: undefined })} zones={ZONES} onEdit={mockOnEdit} />);
    expect(screen.getByTestId('irrigation-event-zones-e2')).toHaveTextContent(/^0 Zones$/);
  });

  it('calls onEdit with the event', () => {
    render(<IrrigationEventRow event={WEEKLY} zones={ZONES} onEdit={mockOnEdit} />);
    fireEvent.click(screen.getByTestId('irrigation-event-edit-w1'));
    expect(mockOnEdit).toHaveBeenCalledWith(WEEKLY);
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { CareBehaviorCurfewField } from '@/components/subsystems/CareBehaviorCurfewField';
import { templateField } from '@/lib/careBehaviors';
import { CURFEW_TEMPLATE } from '../helpers/careBehaviorFixtures';

// ── Helpers ───────────────────────────────────────────────────────────

const onChange = jest.fn();
const field = templateField(CURFEW_TEMPLATE, 'time')!;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviorCurfewField', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(
      <CareBehaviorCurfewField behavior={{ presenceRequiredTime: '21:00:00' }} field={field} template={CURFEW_TEMPLATE} onChange={onChange} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the curfew time', () => {
    render(<CareBehaviorCurfewField behavior={{ presenceRequiredTime: '22:30:00' }} field={field} template={CURFEW_TEMPLATE} onChange={onChange} />);
    expect(screen.getByLabelText('Curfew Time')).toHaveValue('22:30');
  });

  it('stores a new time with seconds', () => {
    render(<CareBehaviorCurfewField behavior={{ presenceRequiredTime: '21:00:00' }} field={field} template={CURFEW_TEMPLATE} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('care-field-time'), { target: { value: '20:15' } });
    expect(onChange).toHaveBeenCalledWith({ presenceRequiredTime: '20:15:00' });
  });

  it('clears the time when the input is emptied', () => {
    render(<CareBehaviorCurfewField behavior={{ presenceRequiredTime: '21:00:00' }} field={field} template={CURFEW_TEMPLATE} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('care-field-time'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ presenceRequiredTime: undefined });
  });

  it('renders empty with no time and a generic label', () => {
    render(<CareBehaviorCurfewField behavior={{}} field={{ ...field, label: '' }} template={CURFEW_TEMPLATE} onChange={onChange} />);
    expect(screen.getByLabelText('Curfew Time')).toHaveValue('');
  });
});

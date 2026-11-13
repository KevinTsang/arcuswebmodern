import { render, screen, fireEvent } from '@testing-library/react';
import { CareBehaviorDurationField } from '@/components/subsystems/CareBehaviorDurationField';
import { templateField } from '@/lib/careBehaviors';
import { INACTIVITY_TEMPLATE, makeCareBehavior } from '../helpers/careBehaviorFixtures';

// ── Helpers ───────────────────────────────────────────────────────────

const onChange = jest.fn();
const field = templateField(INACTIVITY_TEMPLATE, 'duration')!;

function renderField(durationSecs?: number) {
  return render(
    <CareBehaviorDurationField behavior={makeCareBehavior({ durationSecs })} field={field} template={INACTIVITY_TEMPLATE} onChange={onChange} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviorDurationField', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderField(1800);
    expect(asFragment()).toMatchSnapshot();
  });

  it('lists the template durations and selects the current one', () => {
    renderField(3600);
    expect(screen.getByRole('option', { name: '30 Minutes' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '120 Minutes' })).toBeInTheDocument();
    expect(screen.getByTestId('care-field-duration')).toHaveValue('3600');
    expect(screen.getByLabelText('No Activity For...')).toBeInTheDocument();
  });

  it('reports the chosen duration in seconds', () => {
    renderField(1800);
    fireEvent.change(screen.getByTestId('care-field-duration'), { target: { value: '7200' } });
    expect(onChange).toHaveBeenCalledWith({ durationSecs: 7200 });
  });

  it('offers a placeholder when the current duration is not a template value', () => {
    renderField(999);
    expect(screen.getByTestId('care-field-duration')).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Choose…' })).toBeInTheDocument();
  });

  it('falls back to a generic label', () => {
    render(<CareBehaviorDurationField behavior={{}} field={{ ...field, label: '' }} template={INACTIVITY_TEMPLATE} onChange={onChange} />);
    expect(screen.getByLabelText('Duration')).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { CareBehaviorTimeWindowsField } from '@/components/subsystems/CareBehaviorTimeWindowsField';
import { templateField } from '@/lib/careBehaviors';
import type { CareTimeWindow } from '@/store/entityTypes';
import { INACTIVITY_TEMPLATE } from '../helpers/careBehaviorFixtures';

// ── Helpers ───────────────────────────────────────────────────────────

const onChange = jest.fn();
const field = templateField(INACTIVITY_TEMPLATE, 'timeWindows')!;
const MORNING: CareTimeWindow = { day: 'Monday', startTime: '06:00:00', durationSecs: 3 * 3600 };

function renderField(timeWindows?: CareTimeWindow[]) {
  return render(
    <CareBehaviorTimeWindowsField behavior={{ timeWindows }} field={field} template={INACTIVITY_TEMPLATE} onChange={onChange} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviorTimeWindowsField', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderField([MORNING]);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot while adding an event', () => {
    const { asFragment } = renderField([]);
    fireEvent.click(screen.getByTestId('care-window-add'));
    expect(asFragment()).toMatchSnapshot();
  });

  it('says 24/7 with no windows', () => {
    renderField();
    expect(screen.getByTestId('care-field-windows-always')).toHaveTextContent('Monitored 24/7.');
  });

  it('lists existing windows', () => {
    renderField([MORNING]);
    expect(screen.getByTestId('care-window-0')).toHaveTextContent('Mon 6:00 AM – Mon 9:00 AM');
    expect(screen.queryByTestId('care-field-windows-always')).not.toBeInTheDocument();
  });

  it('removes a window', () => {
    renderField([MORNING]);
    fireEvent.click(screen.getByTestId('care-window-remove-0'));
    expect(onChange).toHaveBeenCalledWith({ timeWindows: [] });
  });

  it('adds a window from the form', () => {
    renderField([MORNING]);
    fireEvent.click(screen.getByTestId('care-window-add'));
    fireEvent.change(screen.getByTestId('care-window-start-day'), { target: { value: 'Friday' } });
    fireEvent.change(screen.getByTestId('care-window-start-time'), { target: { value: '22:00' } });
    fireEvent.change(screen.getByTestId('care-window-end-day'), { target: { value: 'Saturday' } });
    fireEvent.change(screen.getByTestId('care-window-end-time'), { target: { value: '07:00' } });
    fireEvent.click(screen.getByTestId('care-window-save'));

    expect(onChange).toHaveBeenCalledWith({
      timeWindows: [MORNING, { day: 'Friday', startTime: '22:00:00', durationSecs: 9 * 3600 }],
    });
    expect(screen.queryByTestId('care-window-save')).not.toBeInTheDocument();
  });

  it('shows an error for an overlapping window and clears it on edit', () => {
    renderField([MORNING]);
    fireEvent.click(screen.getByTestId('care-window-add'));
    fireEvent.click(screen.getByTestId('care-window-save'));

    expect(screen.getByTestId('care-window-error')).toHaveTextContent('This event overlaps with an existing event.');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('care-window-start-time'), { target: { value: '10:00' } });
    expect(screen.queryByTestId('care-window-error')).not.toBeInTheDocument();
  });

  it('shows an error when start and end match', () => {
    renderField([]);
    fireEvent.click(screen.getByTestId('care-window-add'));
    fireEvent.change(screen.getByTestId('care-window-end-time'), { target: { value: '08:00' } });
    fireEvent.click(screen.getByTestId('care-window-save'));
    expect(screen.getByTestId('care-window-error')).toHaveTextContent('The start time and end time must be different.');
  });

  it('cancels adding', () => {
    renderField([]);
    fireEvent.click(screen.getByTestId('care-window-add'));
    fireEvent.click(screen.getByTestId('care-window-cancel'));
    expect(screen.getByTestId('care-window-add')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});

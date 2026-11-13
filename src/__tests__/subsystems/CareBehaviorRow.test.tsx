import { render, screen, fireEvent } from '@testing-library/react';
import { CareBehaviorRow } from '@/components/subsystems/CareBehaviorRow';
import { INACTIVITY_TEMPLATE, makeCareBehavior } from '../helpers/careBehaviorFixtures';

// ── Helpers ───────────────────────────────────────────────────────────

const onToggle = jest.fn();
const onEdit = jest.fn();
const BEHAVIOR = makeCareBehavior();

function renderRow(props: Partial<Parameters<typeof CareBehaviorRow>[0]> = {}) {
  return render(
    <CareBehaviorRow behavior={BEHAVIOR} template={INACTIVITY_TEMPLATE} toggling={false} onToggle={onToggle} onEdit={onEdit} {...props} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviorRow', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderRow();
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot when disabled', () => {
    const { asFragment } = renderRow({ behavior: { ...BEHAVIOR, enabled: false } });
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the name, template name and settings summary', () => {
    renderRow();
    expect(screen.getByTestId('care-behavior-name-behavior-1')).toHaveTextContent('Morning activity');
    expect(screen.getByText('No Activity Detected')).toBeInTheDocument();
    expect(screen.getByTestId('care-behavior-summary-behavior-1')).toHaveTextContent('1 Device · 30 Minutes · 24/7');
    expect(screen.getByTestId('care-behavior-row-behavior-1')).toHaveAttribute('data-enabled', 'true');
    expect(screen.getByTestId('care-behavior-toggle-behavior-1')).toHaveAttribute('aria-checked', 'true');
  });

  it('marks a disabled behavior', () => {
    renderRow({ behavior: { ...BEHAVIOR, enabled: false } });
    expect(screen.getByTestId('care-behavior-row-behavior-1')).toHaveAttribute('data-enabled', 'false');
    expect(screen.getByTestId('care-behavior-toggle-behavior-1')).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles the behavior', () => {
    renderRow();
    fireEvent.click(screen.getByTestId('care-behavior-toggle-behavior-1'));
    expect(onToggle).toHaveBeenCalledWith(BEHAVIOR, false);
  });

  it('disables the switch while toggling', () => {
    renderRow({ toggling: true });
    expect(screen.getByTestId('care-behavior-toggle-behavior-1')).toBeDisabled();
  });

  it('opens the editor', () => {
    renderRow();
    fireEvent.click(screen.getByTestId('care-behavior-edit-behavior-1'));
    expect(onEdit).toHaveBeenCalledWith(BEHAVIOR);
  });

  it('hides the template name when it matches and the summary without a template', () => {
    renderRow({ behavior: { ...BEHAVIOR, name: 'No Activity Detected' }, template: undefined });
    expect(screen.getAllByText('No Activity Detected')).toHaveLength(1);
    expect(screen.queryByTestId('care-behavior-summary-behavior-1')).not.toBeInTheDocument();
  });

  it('falls back to the template name or a generic name', () => {
    const { unmount } = renderRow({ behavior: { id: 'b2', templateId: '1' } });
    expect(screen.getByTestId('care-behavior-name-b2')).toHaveTextContent('No Activity Detected');
    unmount();
    renderRow({ behavior: {}, template: undefined });
    expect(screen.getByTestId('care-behavior-name-')).toHaveTextContent('Care Behavior');
  });
});

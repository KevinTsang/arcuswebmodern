import { render, screen, fireEvent } from '@testing-library/react';
import { CareTemplateButton } from '@/components/subsystems/CareTemplateButton';
import { INACTIVITY_TEMPLATE } from '../helpers/careBehaviorFixtures';

// ── Helpers ───────────────────────────────────────────────────────────

const onClick = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareTemplateButton', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CareTemplateButton template={INACTIVITY_TEMPLATE} onClick={onClick} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the template name and description', () => {
    render(<CareTemplateButton template={INACTIVITY_TEMPLATE} onClick={onClick} />);
    expect(screen.getByTestId('care-template-1')).toHaveTextContent('No Activity Detected');
    expect(screen.getByText('Trigger an alarm if no activity occurs.')).toBeInTheDocument();
  });

  it('passes the template to onClick', () => {
    render(<CareTemplateButton template={INACTIVITY_TEMPLATE} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('care-template-1'));
    expect(onClick).toHaveBeenCalledWith(INACTIVITY_TEMPLATE);
  });

  it('omits an empty description', () => {
    render(<CareTemplateButton template={{ ...INACTIVITY_TEMPLATE, description: '' }} onClick={onClick} />);
    expect(screen.getByTestId('care-template-1')).toHaveTextContent(/^No Activity Detected$/);
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { CareBehaviorLibrary } from '@/components/subsystems/CareBehaviorLibrary';
import { CURFEW_TEMPLATE, INACTIVITY_TEMPLATE } from '../helpers/careBehaviorFixtures';

// ── Helpers ───────────────────────────────────────────────────────────

const onSelect = jest.fn();
const onPreview = jest.fn();

function renderLibrary(templates = [INACTIVITY_TEMPLATE, CURFEW_TEMPLATE]) {
  return render(<CareBehaviorLibrary templates={templates} onSelect={onSelect} onPreview={onPreview} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviorLibrary', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderLibrary();
    expect(asFragment()).toMatchSnapshot();
  });

  it('splits templates by whether compatible devices exist', () => {
    renderLibrary();
    expect(screen.getByTestId('care-library-title')).toHaveTextContent('Care Behaviors Library');
    expect(screen.getByTestId('care-template-1')).toHaveTextContent('No Activity Detected');
    expect(screen.getByTestId('care-library-unavailable')).toHaveTextContent('Curfew');
    expect(screen.queryByTestId('care-library-none')).not.toBeInTheDocument();
  });

  it('selects an available template', () => {
    renderLibrary();
    fireEvent.click(screen.getByTestId('care-template-1'));
    expect(onSelect).toHaveBeenCalledWith(INACTIVITY_TEMPLATE);
    expect(onPreview).not.toHaveBeenCalled();
  });

  it('previews an unavailable template', () => {
    renderLibrary();
    fireEvent.click(screen.getByTestId('care-template-6'));
    expect(onPreview).toHaveBeenCalledWith(CURFEW_TEMPLATE);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('explains when no template has devices', () => {
    renderLibrary([CURFEW_TEMPLATE]);
    expect(screen.getByTestId('care-library-none')).toHaveTextContent('There are no connected devices to support Care behaviors.');
  });

  it('hides the unavailable section when every template has devices', () => {
    renderLibrary([INACTIVITY_TEMPLATE]);
    expect(screen.queryByTestId('care-library-unavailable')).not.toBeInTheDocument();
  });

  it('renders with no templates', () => {
    renderLibrary([]);
    expect(screen.getByTestId('care-library-none')).toBeInTheDocument();
  });
});

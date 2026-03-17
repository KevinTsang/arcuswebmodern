import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddressStep from '@/components/create-account/AddressStep';
import { CreateAccountProvider } from '@/components/create-account/CreateAccountContext';
import Bridge from '@arcus/core/bridge';

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => null,
  useAppDispatch: () => jest.fn(),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

// We need to render AddressStep within a context that has placeId set.
// Since we can't easily set reducer state, we'll test the UI independently.
function renderStep() {
  return render(
    <CreateAccountProvider>
      <AddressStep />
    </CreateAccountProvider>,
  );
}

describe('AddressStep', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders address fields', () => {
    renderStep();
    expect(screen.getByLabelText('Street Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Street Address 2 (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('State')).toBeInTheDocument();
    expect(screen.getByLabelText('ZIP')).toBeInTheDocument();
  });

  it('renders Save Address and Skip buttons', () => {
    renderStep();
    expect(screen.getByRole('button', { name: 'Save Address' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('updates field values on input', () => {
    renderStep();
    const streetInput = screen.getByLabelText('Street Address');
    fireEvent.change(streetInput, { target: { value: '123 Main St' } });
    expect(streetInput).toHaveValue('123 Main St');
  });

  it('shows description text', () => {
    renderStep();
    expect(screen.getByText(/Enter your home address/)).toBeInTheDocument();
  });
});

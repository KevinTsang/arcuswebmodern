import { render, screen, fireEvent } from '@testing-library/react';
import { MobileSubsystemSelector } from '@/components/services/MobileSubsystemSelector';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MobileSubsystemSelector', () => {
  it('renders an option for each visible subsystem', () => {
    render(<MobileSubsystemSelector activeSlug="alarms" />);
    expect(screen.getByRole('option', { name: 'Alarms' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Water' })).toBeInTheDocument();
  });

  it('reflects the active subsystem as the selected value', () => {
    render(<MobileSubsystemSelector activeSlug="climate" />);
    expect(screen.getByRole('combobox')).toHaveValue('climate');
  });

  it('navigates to the chosen subsystem on change', () => {
    render(<MobileSubsystemSelector activeSlug="alarms" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'climate' } });
    expect(mockPush).toHaveBeenCalledWith('/services/climate/status');
  });
});

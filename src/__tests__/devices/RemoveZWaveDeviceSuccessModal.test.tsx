import { render, screen, fireEvent } from '@testing-library/react';
import RemoveZWaveDeviceSuccessModal from '@/components/devices/RemoveZWaveDeviceSuccessModal';

describe('RemoveZWaveDeviceSuccessModal', () => {
  it('shows Success heading', () => {
    render(<RemoveZWaveDeviceSuccessModal onDone={jest.fn()} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('shows success message', () => {
    render(<RemoveZWaveDeviceSuccessModal onDone={jest.fn()} />);
    expect(screen.getByText(/successfully removed/)).toBeInTheDocument();
  });

  it('shows Done button', () => {
    render(<RemoveZWaveDeviceSuccessModal onDone={jest.fn()} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('calls onDone when Done is clicked', () => {
    const handleDone = jest.fn();
    render(<RemoveZWaveDeviceSuccessModal onDone={handleDone} />);
    fireEvent.click(screen.getByText('Done'));
    expect(handleDone).toHaveBeenCalledTimes(1);
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import RemoveZWaveDeviceModal from '@/components/device/RemoveZWaveDeviceModal';

describe('RemoveZWaveDeviceModal', () => {
  it('shows Searching heading', () => {
    render(<RemoveZWaveDeviceModal onCancel={jest.fn()} />);
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('shows learn mode instructions', () => {
    render(<RemoveZWaveDeviceModal onCancel={jest.fn()} />);
    expect(screen.getByText(/put the device in "learn mode"/)).toBeInTheDocument();
    expect(screen.getByText(/Check your manufacturer's manual/)).toBeInTheDocument();
  });

  it('shows warning about other Z-Wave devices', () => {
    render(<RemoveZWaveDeviceModal onCancel={jest.fn()} />);
    expect(screen.getByText(/Do not use any other Z-Wave devices/)).toBeInTheDocument();
  });

  it('shows Cancel button', () => {
    render(<RemoveZWaveDeviceModal onCancel={jest.fn()} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const handleCancel = jest.fn();
    render(<RemoveZWaveDeviceModal onCancel={handleCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});

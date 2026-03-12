import { render, screen, fireEvent } from '@testing-library/react';
import RemoveZWaveDeviceFailureModal from '@/components/device/RemoveZWaveDeviceFailureModal';

describe('RemoveZWaveDeviceFailureModal', () => {
  it('shows Removal Timed Out heading', () => {
    render(<RemoveZWaveDeviceFailureModal onKeepSearching={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Removal Timed Out')).toBeInTheDocument();
  });

  it('shows failure message', () => {
    render(<RemoveZWaveDeviceFailureModal onKeepSearching={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText(/A device was not removed/)).toBeInTheDocument();
  });

  it('shows Keep Searching button', () => {
    render(<RemoveZWaveDeviceFailureModal onKeepSearching={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Keep Searching')).toBeInTheDocument();
  });

  it('shows Cancel button', () => {
    render(<RemoveZWaveDeviceFailureModal onKeepSearching={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onKeepSearching when Keep Searching is clicked', () => {
    const handleKeep = jest.fn();
    render(<RemoveZWaveDeviceFailureModal onKeepSearching={handleKeep} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByText('Keep Searching'));
    expect(handleKeep).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', () => {
    const handleCancel = jest.fn();
    render(<RemoveZWaveDeviceFailureModal onKeepSearching={jest.fn()} onCancel={handleCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});

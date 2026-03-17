import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Person } from '@arcus/core';
import ChangePasswordPanel from '@/components/settings/ChangePasswordPanel';

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({ auth: { person: { [Person.ATTR_EMAIL]: 'john@test.com' } } }),
  useAppDispatch: () => mockDispatch,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

function getPasswordInputs() {
  return document.querySelectorAll('input[type="password"]');
}

describe('ChangePasswordPanel', () => {
  it('shows password fields', () => {
    render(<ChangePasswordPanel />);
    expect(screen.getByText('Current Password')).toBeInTheDocument();
    expect(screen.getByText('New Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
  });

  it('disables submit button when fields empty', () => {
    render(<ChangePasswordPanel />);
    const btn = screen.getByRole('button', { name: 'Change Password' });
    expect(btn).toBeDisabled();
  });

  it('shows error when passwords do not match', async () => {
    render(<ChangePasswordPanel />);
    const pwInputs = getPasswordInputs();
    fireEvent.change(pwInputs[0], { target: { value: 'current123' } });
    fireEvent.change(pwInputs[1], { target: { value: 'newpass12' } });
    fireEvent.change(pwInputs[2], { target: { value: 'mismatch1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
  });

  it('shows error when password too short', async () => {
    render(<ChangePasswordPanel />);
    const pwInputs = getPasswordInputs();
    fireEvent.change(pwInputs[0], { target: { value: 'current' } });
    fireEvent.change(pwInputs[1], { target: { value: 'short' } });
    fireEvent.change(pwInputs[2], { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    });
  });

  it('calls ChangePassword on valid submit', async () => {
    render(<ChangePasswordPanel />);
    const pwInputs = getPasswordInputs();
    fireEvent.change(pwInputs[0], { target: { value: 'current123' } });
    fireEvent.change(pwInputs[1], { target: { value: 'newpass12' } });
    fireEvent.change(pwInputs[2], { target: { value: 'newpass12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'person:ChangePassword',
        'SERV:person:',
        { currentPassword: 'current123', newPassword: 'newpass12', emailAddress: 'john@test.com' },
      );
      expect(mockCloseRight).toHaveBeenCalled();
    });
  });

  it('shows error when ChangePassword request fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('bad password'));

    render(<ChangePasswordPanel />);
    const pwInputs = getPasswordInputs();
    fireEvent.change(pwInputs[0], { target: { value: 'wrongpass1' } });
    fireEvent.change(pwInputs[1], { target: { value: 'newpass12' } });
    fireEvent.change(pwInputs[2], { target: { value: 'newpass12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to change password. Check your current password.')).toBeInTheDocument();
    });
    expect(mockCloseRight).not.toHaveBeenCalled();
  });

  it('closes panel on Cancel', () => {
    render(<ChangePasswordPanel />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});

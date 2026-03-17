import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvitationSection from '@/components/settings/InvitationSection';

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('InvitationSection', () => {
  it('shows code and email inputs', () => {
    render(<InvitationSection />);
    expect(screen.getByText('Enter Invitation Code')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter code')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email used for invitation')).toBeInTheDocument();
  });

  it('disables lookup when fields empty', () => {
    render(<InvitationSection />);
    expect(screen.getByText('Look Up Invitation')).toBeDisabled();
  });

  it('enables lookup when fields filled', () => {
    render(<InvitationSection />);
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'ABC' } });
    fireEvent.change(screen.getByPlaceholderText('Email used for invitation'), { target: { value: 'test@test.com' } });
    expect(screen.getByText('Look Up Invitation')).not.toBeDisabled();
  });

  it('shows invitation details on lookup success', async () => {
    mockBridgeRequest.mockResolvedValue({
      invitation: {
        invitorFirstName: 'John',
        invitorLastName: 'Doe',
        placeName: 'Test Home',
      },
    });

    render(<InvitationSection />);
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'ABC' } });
    fireEvent.change(screen.getByPlaceholderText('Email used for invitation'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Look Up Invitation'));

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Test Home/)).toBeInTheDocument();
    });
  });

  it('shows error on lookup failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));

    render(<InvitationSection />);
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'BAD' } });
    fireEvent.change(screen.getByPlaceholderText('Email used for invitation'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Look Up Invitation'));

    await waitFor(() => {
      expect(screen.getByText(/invitation code not recognized/i)).toBeInTheDocument();
    });
  });

  it('declines invitation on Cancel click', async () => {
    mockBridgeRequest.mockResolvedValueOnce({
      invitation: { invitorFirstName: 'John', invitorLastName: 'Doe', placeName: 'Home' },
    });

    render(<InvitationSection />);
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'ABC' } });
    fireEvent.change(screen.getByPlaceholderText('Email used for invitation'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Look Up Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText(/John Doe/)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter code')).toHaveValue('');
    expect(screen.getByPlaceholderText('Email used for invitation')).toHaveValue('');
  });

  it('accepts invitation on Accept click', async () => {
    mockBridgeRequest
      .mockResolvedValueOnce({ invitation: { invitorFirstName: 'John', invitorLastName: 'Doe', placeName: 'Home' } })
      .mockResolvedValueOnce({});

    render(<InvitationSection />);
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'ABC' } });
    fireEvent.change(screen.getByPlaceholderText('Email used for invitation'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Look Up Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        expect.stringContaining('AcceptInvitation'),
        expect.any(String),
        { code: 'ABC', inviteeEmail: 'test@test.com' },
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Invitation accepted!' },
      });
    });
  });
});

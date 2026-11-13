import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Place } from '@arcus/core';
import RemovePlacePanel from '@/components/settings/RemovePlacePanel';

// ── Mocks ─────────────────────────────────────────────────────────────

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
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const defaultProps = { placeId: 'place-lake', placeName: 'Lake House' };

function typeAndSubmit(text: string) {
  fireEvent.change(screen.getByTestId('field-confirm'), { target: { value: text } });
  fireEvent.click(screen.getByTestId('remove-place-submit'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('RemovePlacePanel – rendering', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<RemovePlacePanel {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('explains what removing the place does', () => {
    render(<RemovePlacePanel {...defaultProps} />);
    expect(screen.getByTestId('remove-place-message')).toHaveTextContent(
      'Removing Lake House will remove all devices associated with the place.',
    );
    expect(screen.queryByTestId('remove-place-confirm')).not.toBeInTheDocument();
  });
});

describe('RemovePlacePanel – typing REMOVE', () => {
  it('keeps Submit disabled until REMOVE is typed', () => {
    render(<RemovePlacePanel {...defaultProps} />);
    expect(screen.getByTestId('remove-place-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('field-confirm'), { target: { value: 'REMOV' } });
    expect(screen.getByTestId('remove-place-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('field-confirm'), { target: { value: 'REMOVE' } });
    expect(screen.getByTestId('remove-place-submit')).not.toBeDisabled();
  });

  it('accepts any case and surrounding spaces', () => {
    render(<RemovePlacePanel {...defaultProps} />);
    typeAndSubmit('  remove ');
    expect(screen.getByTestId('remove-place-confirm')).toBeInTheDocument();
  });

  it('asks for a final confirmation without deleting yet', () => {
    render(<RemovePlacePanel {...defaultProps} />);
    typeAndSubmit('REMOVE');
    expect(screen.getByTestId('remove-place-confirm')).toHaveTextContent('This action cannot be reversed.');
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});

describe('RemovePlacePanel – deleting', () => {
  it('deletes the place, notifies, refreshes and closes', async () => {
    const onRemoved = jest.fn();
    render(<RemovePlacePanel {...defaultProps} onRemoved={onRemoved} />);
    typeAndSubmit('REMOVE');
    fireEvent.click(screen.getByTestId('remove-place-delete'));

    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(Place.CMD_DELETE, 'SERV:place:place-lake', {});
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Lake House has been removed from your account.' },
    });
    expect(onRemoved).toHaveBeenCalled();
  });

  it('disables the button while deleting', async () => {
    let finish: () => void = () => {};
    mockBridgeRequest.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    render(<RemovePlacePanel {...defaultProps} />);
    typeAndSubmit('REMOVE');
    fireEvent.click(screen.getByTestId('remove-place-delete'));
    expect(screen.getByTestId('remove-place-delete')).toBeDisabled();
    expect(screen.getByTestId('remove-place-delete')).toHaveTextContent('Removing…');
    finish();
    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
  });

  it('reports a failure and stays open', async () => {
    const onRemoved = jest.fn();
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    render(<RemovePlacePanel {...defaultProps} onRemoved={onRemoved} />);
    typeAndSubmit('REMOVE');
    fireEvent.click(screen.getByTestId('remove-place-delete'));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to remove place.' },
      }),
    );
    expect(onRemoved).not.toHaveBeenCalled();
    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(screen.getByTestId('remove-place-delete')).not.toBeDisabled();
  });

  it('closes without deleting on Cancel', () => {
    render(<RemovePlacePanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});

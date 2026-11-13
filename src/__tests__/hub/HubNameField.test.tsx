import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Hub } from '@arcus/core';
import { HubNameField, HUB_NAME_MAX_LENGTH } from '@/components/hub/HubNameField';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({ useAppDispatch: () => mockDispatch }));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_ADDRESS = 'SERV:ABC-1234:hub';

function renderField(name = 'Home Hub') {
  return render(<HubNameField address={HUB_ADDRESS} name={name} />);
}

function typeName(value: string) {
  fireEvent.change(screen.getByTestId('hub-name-input'), { target: { value } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubNameField', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderField();
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the current name, limited to the legacy length', () => {
    renderField();
    expect(screen.getByLabelText('Hub Name')).toHaveValue('Home Hub');
    expect(screen.getByTestId('hub-name-input')).toHaveAttribute('maxLength', String(HUB_NAME_MAX_LENGTH));
  });

  it('enables Save only for a changed, non-blank name', () => {
    renderField();
    expect(screen.getByTestId('hub-name-save')).toBeDisabled();
    typeName('   ');
    expect(screen.getByTestId('hub-name-save')).toBeDisabled();
    typeName(' Home Hub ');
    expect(screen.getByTestId('hub-name-save')).toBeDisabled();
    typeName('Cabin Hub');
    expect(screen.getByTestId('hub-name-save')).toBeEnabled();
  });

  it('saves the trimmed name as hub:name', async () => {
    renderField();
    typeName('  Cabin Hub  ');
    fireEvent.click(screen.getByTestId('hub-name-save'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Hub name saved.' },
    }));
    expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, HUB_ADDRESS, { [Hub.ATTR_NAME]: 'Cabin Hub' });
    expect(screen.getByTestId('hub-name-input')).toHaveValue('Cabin Hub');
  });

  it('shows Saving… and disables the field while the save is in flight', async () => {
    mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
    renderField();
    typeName('Cabin Hub');
    fireEvent.click(screen.getByTestId('hub-name-save'));

    await waitFor(() => expect(screen.getByTestId('hub-name-save')).toHaveTextContent('Saving…'));
    expect(screen.getByTestId('hub-name-save')).toBeDisabled();
    expect(screen.getByTestId('hub-name-input')).toBeDisabled();
  });

  it('shows an error and keeps the typed name when the save fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    renderField();
    typeName('Cabin Hub');
    fireEvent.submit(screen.getByTestId('hub-name-form'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to rename the hub.' },
    }));
    expect(screen.getByTestId('hub-name-input')).toHaveValue('Cabin Hub');
    expect(screen.getByTestId('hub-name-save')).toBeEnabled();
  });

  it('does not send anything when submitted unchanged', () => {
    renderField();
    fireEvent.submit(screen.getByTestId('hub-name-form'));
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('starts empty for a hub without a name', () => {
    renderField('');
    expect(screen.getByTestId('hub-name-input')).toHaveValue('');
    expect(screen.getByTestId('hub-name-save')).toBeDisabled();
  });
});

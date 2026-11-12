import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateKeyForm } from '@/components/api-keys/CreateKeyForm';

// ── Helpers ───────────────────────────────────────────────────────────

const mockOnCreate = jest.fn();
const mockOnCancel = jest.fn();

function renderForm() {
  return render(<CreateKeyForm onCreate={mockOnCreate} onCancel={mockOnCancel} />);
}

function typeLabel(value: string) {
  fireEvent.change(screen.getByTestId('apikey-label'), { target: { value } });
}

function createButton() {
  return screen.getByTestId('apikey-create');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOnCreate.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CreateKeyForm', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderForm();
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the name field and the permissions table', () => {
    renderForm();
    expect(screen.getByPlaceholderText('e.g. Home Assistant Integration')).toBeInTheDocument();
    expect(screen.getByTestId('apikey-new-perm-dev-r')).toBeInTheDocument();
  });

  it('keeps Create Key disabled until there is a name and a permission', () => {
    renderForm();
    expect(createButton()).toBeDisabled();

    typeLabel('Widget');
    expect(createButton()).toBeDisabled();

    fireEvent.click(screen.getByTestId('apikey-new-perm-dev-r'));
    expect(createButton()).toBeEnabled();
  });

  it('keeps Create Key disabled for a name of only spaces', () => {
    renderForm();
    typeLabel('   ');
    fireEvent.click(screen.getByTestId('apikey-new-perm-dev-r'));
    expect(createButton()).toBeDisabled();
  });

  it('creates with the trimmed name and the chosen permissions', async () => {
    renderForm();
    typeLabel('  Widget  ');
    fireEvent.click(screen.getByTestId('apikey-new-perm-dev-all'));
    fireEvent.click(createButton());

    await waitFor(() => expect(mockOnCreate).toHaveBeenCalledTimes(1));
    const [label, perms] = mockOnCreate.mock.calls[0];
    expect(label).toBe('Widget');
    expect(perms.dev).toEqual({ r: true, w: true, x: true });
    expect(perms.scene).toEqual({ r: false, w: false, x: false });
  });

  it('turns a category off when All is clicked a second time', async () => {
    renderForm();
    typeLabel('Widget');
    fireEvent.click(screen.getByTestId('apikey-new-perm-dev-all'));
    fireEvent.click(screen.getByTestId('apikey-new-perm-dev-all'));
    expect(createButton()).toBeDisabled();
  });

  it('shows Creating… and stays disabled while the key is being created', async () => {
    mockOnCreate.mockReturnValueOnce(new Promise(() => {}));
    renderForm();
    typeLabel('Widget');
    fireEvent.click(screen.getByTestId('apikey-new-perm-dev-r'));
    fireEvent.click(createButton());

    await waitFor(() => expect(createButton()).toBeDisabled());
    expect(await screen.findByTestId('apikey-create')).toHaveTextContent('Creating...');
    fireEvent.click(createButton());
    expect(mockOnCreate).toHaveBeenCalledTimes(1);
  });

  it('re-enables Create Key, keeping the name, once creating finishes', async () => {
    renderForm();
    typeLabel('Widget');
    fireEvent.click(screen.getByTestId('apikey-new-perm-dev-r'));
    fireEvent.click(createButton());

    await waitFor(() => expect(createButton()).toHaveTextContent('Create Key'));
    expect(createButton()).toBeEnabled();
    expect(screen.getByTestId('apikey-label')).toHaveValue('Widget');
  });

  it('calls onCancel when Cancel is clicked', () => {
    renderForm();
    fireEvent.click(screen.getByTestId('apikey-cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnCreate).not.toHaveBeenCalled();
  });
});

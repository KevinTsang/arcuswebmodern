import { render, screen, fireEvent } from '@testing-library/react';
import PermissionsTable from '@/components/api-keys/PermissionsTable';
import { emptyPermSet, PERMISSION_CATEGORIES } from '@/components/api-keys/permissions';
import { TestIdScope } from '@/lib/testIdScope';

describe('PermissionsTable', () => {
  it('matches snapshot', () => {
    const { container } = render(<PermissionsTable perms={emptyPermSet()} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders all category labels', () => {
    render(<PermissionsTable perms={emptyPermSet()} />);
    for (const cat of PERMISSION_CATEGORIES) {
      expect(screen.getByText(cat.label)).toBeInTheDocument();
    }
  });

  it('renders column headers including All', () => {
    render(<PermissionsTable perms={emptyPermSet()} />);
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Write')).toBeInTheDocument();
    expect(screen.getByText('Execute')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('gives every checkbox an accessible name of category + action', () => {
    render(<PermissionsTable perms={emptyPermSet()} />);
    for (const cat of PERMISSION_CATEGORIES) {
      for (const action of ['read', 'write', 'execute', 'all']) {
        expect(screen.getByLabelText(`${cat.label} ${action}`)).toBeInTheDocument();
      }
    }
  });

  it('renders checkboxes as unchecked for empty perm set', () => {
    render(<PermissionsTable perms={emptyPermSet()} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // 8 categories * 4 columns (r, w, x, all)
    expect(checkboxes).toHaveLength(PERMISSION_CATEGORIES.length * 4);
    checkboxes.forEach((cb) => {
      expect(cb).not.toBeChecked();
    });
  });

  it('reflects checked state from perms', () => {
    const perms = emptyPermSet();
    perms.dev = { r: true, w: false, x: false };
    render(<PermissionsTable perms={perms} />);
    expect(screen.getByLabelText('Devices read')).toBeChecked();
    expect(screen.getByLabelText('Devices write')).not.toBeChecked();
    expect(screen.getByLabelText('Devices execute')).not.toBeChecked();
    expect(screen.getByLabelText('Devices all')).not.toBeChecked();
  });

  it('checks the All column when all three flags are set', () => {
    const perms = emptyPermSet();
    perms.scene = { r: true, w: true, x: true };
    render(<PermissionsTable perms={perms} />);
    expect(screen.getByLabelText('Scenes read')).toBeChecked();
    expect(screen.getByLabelText('Scenes write')).toBeChecked();
    expect(screen.getByLabelText('Scenes execute')).toBeChecked();
    expect(screen.getByLabelText('Scenes all')).toBeChecked();
  });

  it('disables all checkboxes when no onToggle is provided', () => {
    render(<PermissionsTable perms={emptyPermSet()} />);
    screen.getAllByRole('checkbox').forEach((cb) => {
      expect(cb).toBeDisabled();
    });
  });

  it('enables all checkboxes when onToggle is provided', () => {
    const onToggle = jest.fn();
    render(<PermissionsTable perms={emptyPermSet()} onToggle={onToggle} />);
    screen.getAllByRole('checkbox').forEach((cb) => {
      expect(cb).not.toBeDisabled();
    });
  });

  it('calls onToggle with correct category and action on click', () => {
    const onToggle = jest.fn();
    render(<PermissionsTable perms={emptyPermSet()} onToggle={onToggle} />);

    fireEvent.click(screen.getByLabelText('Rules read'));
    expect(onToggle).toHaveBeenCalledWith('rule', 'r');

    fireEvent.click(screen.getByLabelText('Rules write'));
    expect(onToggle).toHaveBeenCalledWith('rule', 'w');

    fireEvent.click(screen.getByLabelText('Rules execute'));
    expect(onToggle).toHaveBeenCalledWith('rule', 'x');

    fireEvent.click(screen.getByLabelText('Rules all'));
    expect(onToggle).toHaveBeenCalledWith('rule', '*');
  });

  describe('test ids', () => {
    it('uses unscoped ids outside a TestIdScope', () => {
      render(<PermissionsTable perms={emptyPermSet()} />);
      expect(screen.getByTestId('perm-dev-r')).toBe(screen.getByLabelText('Devices read'));
      expect(screen.getByTestId('perm-place-all')).toBe(screen.getByLabelText('Place all'));
    });

    it('prefixes ids with the enclosing TestIdScope so two tables stay unique', () => {
      render(
        <>
          <TestIdScope.Provider value="apikey-new">
            <PermissionsTable perms={emptyPermSet()} />
          </TestIdScope.Provider>
          <TestIdScope.Provider value="apikey-key-1">
            <PermissionsTable perms={emptyPermSet()} />
          </TestIdScope.Provider>
        </>,
      );
      expect(screen.getByTestId('apikey-new-perm-dev-r')).toBeInTheDocument();
      expect(screen.getByTestId('apikey-key-1-perm-dev-r')).toBeInTheDocument();
      expect(screen.queryByTestId('perm-dev-r')).not.toBeInTheDocument();
    });
  });
});

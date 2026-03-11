import { render, screen, fireEvent } from '@testing-library/react';
import PermissionsTable from '@/components/api-key/PermissionsTable';
import { emptyPermSet, PERMISSION_CATEGORIES } from '@/components/api-key/permissions';

describe('PermissionsTable', () => {
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
    const devicesRow = screen.getByText('Devices').closest('tr')!;
    const checkboxes = devicesRow.querySelectorAll('input[type="checkbox"]');
    // r, w, x, all
    expect(checkboxes[0]).toBeChecked();      // read
    expect(checkboxes[1]).not.toBeChecked();   // write
    expect(checkboxes[2]).not.toBeChecked();   // execute
    expect(checkboxes[3]).not.toBeChecked();   // all
  });

  it('checks the All column when all three flags are set', () => {
    const perms = emptyPermSet();
    perms.scene = { r: true, w: true, x: true };
    render(<PermissionsTable perms={perms} />);
    const scenesRow = screen.getByText('Scenes').closest('tr')!;
    const checkboxes = scenesRow.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes[0]).toBeChecked();  // read
    expect(checkboxes[1]).toBeChecked();  // write
    expect(checkboxes[2]).toBeChecked();  // execute
    expect(checkboxes[3]).toBeChecked();  // all
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

    const rulesRow = screen.getByText('Rules').closest('tr')!;
    const checkboxes = rulesRow.querySelectorAll('input[type="checkbox"]');

    fireEvent.click(checkboxes[0]); // read
    expect(onToggle).toHaveBeenCalledWith('rule', 'r');

    fireEvent.click(checkboxes[1]); // write
    expect(onToggle).toHaveBeenCalledWith('rule', 'w');

    fireEvent.click(checkboxes[2]); // execute
    expect(onToggle).toHaveBeenCalledWith('rule', 'x');

    fireEvent.click(checkboxes[3]); // all
    expect(onToggle).toHaveBeenCalledWith('rule', '*');
  });
});

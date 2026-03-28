import { render, screen, fireEvent } from '@testing-library/react';
import { ActionCategoryList } from '@/components/scenes/ActionCategoryList';
import type { ResolvedAction } from '@/components/scenes/ScenePanel';

const mockAction = (overrides: Partial<ResolvedAction> = {}): ResolvedAction => ({
  id: 'action1',
  name: 'Lights',
  satisfiable: true,
  selectors: { 'DRIV:dev:abc': [] },
  ...overrides,
});

let mockOnNameChange: jest.Mock;
let mockOnSelectAction: jest.Mock;
let mockOnSave: jest.Mock;
let mockOnCancel: jest.Mock;
let mockGetConfiguredDeviceCount: jest.Mock;

beforeEach(() => {
  mockOnNameChange = jest.fn();
  mockOnSelectAction = jest.fn();
  mockOnSave = jest.fn();
  mockOnCancel = jest.fn();
  mockGetConfiguredDeviceCount = jest.fn().mockReturnValue(0);
});

const renderList = (overrides: Record<string, unknown> = {}) =>
  render(
    <ActionCategoryList
      name="My Scene"
      onNameChange={mockOnNameChange}
      satisfiableActions={[mockAction()]}
      unsatisfiableActions={[]}
      getConfiguredDeviceCount={mockGetConfiguredDeviceCount}
      saving={false}
      hasAnyConfigured={false}
      onSelectAction={mockOnSelectAction}
      onSave={mockOnSave}
      onCancel={mockOnCancel}
      {...overrides}
    />,
  );

describe('ActionCategoryList', () => {
  it('renders the scene name input with current value', () => {
    renderList();
    expect(screen.getByDisplayValue('My Scene')).toBeInTheDocument();
  });

  it('calls onNameChange when input changes', () => {
    renderList();
    fireEvent.change(screen.getByDisplayValue('My Scene'), { target: { value: 'Updated' } });
    expect(mockOnNameChange).toHaveBeenCalledWith('Updated');
  });

  it('renders satisfiable actions with device count', () => {
    renderList();
    expect(screen.getByText('Lights')).toBeInTheDocument();
    expect(screen.getByText('1 device')).toBeInTheDocument();
  });

  it('pluralizes device count', () => {
    renderList({
      satisfiableActions: [mockAction({ selectors: { 'DRIV:dev:a': [], 'DRIV:dev:b': [] } })],
    });
    expect(screen.getByText('2 devices')).toBeInTheDocument();
  });

  it('calls onSelectAction when action button clicked', () => {
    renderList();
    fireEvent.click(screen.getByText('Lights'));
    expect(mockOnSelectAction).toHaveBeenCalledWith('action1');
  });

  it('shows configured device count badge', () => {
    mockGetConfiguredDeviceCount.mockReturnValue(3);
    renderList();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show badge when count is 0', () => {
    renderList();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders unsatisfiable actions when present', () => {
    renderList({
      unsatisfiableActions: [mockAction({ id: 'u1', name: 'Thermostat', satisfiable: false })],
    });
    expect(screen.getByText('Thermostat')).toBeInTheDocument();
    expect(screen.getByText('(no compatible devices)')).toBeInTheDocument();
  });

  it('hides unsatisfiable section when empty', () => {
    renderList();
    expect(screen.queryByText('More Actions')).not.toBeInTheDocument();
  });

  it('disables Create button when no actions configured', () => {
    renderList();
    expect(screen.getByRole('button', { name: 'Create Scene' })).toBeDisabled();
  });

  it('enables Create button when actions are configured', () => {
    renderList({ hasAnyConfigured: true });
    expect(screen.getByRole('button', { name: 'Create Scene' })).toBeEnabled();
  });

  it('disables Create button when saving', () => {
    renderList({ saving: true, hasAnyConfigured: true });
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
  });

  it('calls onSave when Create button clicked', () => {
    renderList({ hasAnyConfigured: true });
    fireEvent.click(screen.getByRole('button', { name: 'Create Scene' }));
    expect(mockOnSave).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel button clicked', () => {
    renderList();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('uses custom heading when provided', () => {
    renderList({ heading: 'Edit Scene' });
    expect(screen.getByText('Edit Scene')).toBeInTheDocument();
  });

  it('uses custom save labels when provided', () => {
    renderList({ hasAnyConfigured: true, saveLabel: 'Save', savingLabel: 'Saving...' });
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('uses custom saving label when saving', () => {
    renderList({ saving: true, hasAnyConfigured: true, saveLabel: 'Save', savingLabel: 'Saving...' });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });
});

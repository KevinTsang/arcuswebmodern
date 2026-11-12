import { render, screen, fireEvent } from '@testing-library/react';
import KeyCard from '@/components/api-keys/KeyCard';
import type { ApiKeyMeta } from '@arcus/core/services/ApiKeyService';

const baseKey: ApiKeyMeta = {
  id: 'key-1',
  label: 'Home Assistant',
  keyPrefix: 'arcus_sk_abc12345',
  permissions: ['dev:r', 'scene:x'],
  created: new Date('2026-01-15').getTime(),
  lastUsed: new Date('2026-03-01').getTime(),
  expiresAt: null,
  expired: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('KeyCard', () => {
  it('renders the key label', () => {
    render(<KeyCard apiKey={baseKey} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Home Assistant')).toBeInTheDocument();
  });

  it('renders the key prefix', () => {
    render(<KeyCard apiKey={baseKey} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('arcus_sk_abc12345...')).toBeInTheDocument();
  });

  it('shows Revoke button for active keys', () => {
    render(<KeyCard apiKey={baseKey} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Revoke')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows Delete button and Revoked badge for expired keys', () => {
    const revokedKey: ApiKeyMeta = { ...baseKey, expired: true };
    render(<KeyCard apiKey={revokedKey} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Revoked')).toBeInTheDocument();
    expect(screen.queryByText('Revoke')).not.toBeInTheDocument();
  });

  it('calls onRevoke with its key when Revoke is clicked', () => {
    const onRevoke = jest.fn();
    render(<KeyCard apiKey={baseKey} onRevoke={onRevoke} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByText('Revoke'));
    expect(onRevoke).toHaveBeenCalledTimes(1);
    expect(onRevoke).toHaveBeenCalledWith(baseKey);
  });

  it('calls onDelete when Delete is clicked on a revoked key', () => {
    const onDelete = jest.fn();
    const revokedKey: ApiKeyMeta = { ...baseKey, expired: true };
    render(<KeyCard apiKey={revokedKey} onRevoke={jest.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(revokedKey);
  });

  it('does not show permissions table by default', () => {
    render(<KeyCard apiKey={baseKey} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('shows permissions table when Permissions button is clicked', () => {
    render(<KeyCard apiKey={baseKey} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByText('Permissions'));
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Devices')).toBeInTheDocument();
  });

  it('toggles button text between Permissions and Hide', () => {
    render(<KeyCard apiKey={baseKey} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Permissions')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Permissions'));
    expect(screen.getByText('Hide')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hide'));
    expect(screen.getByText('Permissions')).toBeInTheDocument();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('renders permissions as read-only checkboxes', () => {
    render(<KeyCard apiKey={baseKey} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByText('Permissions'));
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => {
      expect(cb).toBeDisabled();
    });
  });

  it('checks the correct permissions from the key data', () => {
    // baseKey has dev:r and scene:x
    render(<KeyCard apiKey={baseKey} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByText('Permissions'));

    const devicesRow = screen.getByText('Devices').closest('tr')!;
    const devCheckboxes = devicesRow.querySelectorAll('input[type="checkbox"]');
    expect(devCheckboxes[0]).toBeChecked();      // read
    expect(devCheckboxes[1]).not.toBeChecked();   // write
    expect(devCheckboxes[2]).not.toBeChecked();   // execute
    expect(devCheckboxes[3]).not.toBeChecked();   // all

    const scenesRow = screen.getByText('Scenes').closest('tr')!;
    const sceneCheckboxes = scenesRow.querySelectorAll('input[type="checkbox"]');
    expect(sceneCheckboxes[0]).not.toBeChecked(); // read
    expect(sceneCheckboxes[1]).not.toBeChecked(); // write
    expect(sceneCheckboxes[2]).toBeChecked();     // execute
    expect(sceneCheckboxes[3]).not.toBeChecked(); // all
  });

  it('shows "Never" for lastUsed when null', () => {
    const key: ApiKeyMeta = { ...baseKey, lastUsed: null };
    render(<KeyCard apiKey={key} onRevoke={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText(/Never/)).toBeInTheDocument();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PetDoor, PetToken } from '@arcus/core';
import PetDoorSmartKeysConfigurator from '@/components/devices/PetDoorSmartKeysConfigurator';
import { petTokenAttr } from '@/lib/petDoor';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSetAttribute = jest.fn();
const mockSendCommand = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({ setAttribute: mockSetAttribute, sendCommand: mockSendCommand }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:petdoor';

function makeDoor(tokens: Array<{ instance: string; tokenId?: number; name?: string; paired?: boolean }>): DeviceEntity {
  const attrs: Partial<DeviceEntity> = { [PetDoor.ATTR_NUMPETTOKENSSUPPORTED]: 3 };
  tokens.forEach((t) => {
    attrs[petTokenAttr(PetToken.ATTR_PAIRED, t.instance)] = t.paired ?? true;
    if (t.tokenId !== undefined) attrs[petTokenAttr(PetToken.ATTR_TOKENID, t.instance)] = t.tokenId;
    if (t.name !== undefined) attrs[petTokenAttr(PetToken.ATTR_PETNAME, t.instance)] = t.name;
  });
  return makeDevice(ADDRESS, attrs);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockSendCommand.mockResolvedValue({});
  mockDevice = makeDoor([
    { instance: 'pt1', tokenId: 101, name: 'Rex' },
    { instance: 'pt2', tokenId: 102 },
    { instance: 'pt3', tokenId: 103, name: 'Ghost', paired: false },
  ]);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PetDoorSmartKeysConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('lists only paired keys, with default names for unnamed ones', () => {
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      expect(screen.getByText('Smart Keys')).toBeInTheDocument();
      expect(screen.getByTestId('petdoor-key-pt1')).toBeInTheDocument();
      expect(screen.getByTestId('petdoor-key-pt2')).toBeInTheDocument();
      expect(screen.queryByTestId('petdoor-key-pt3')).not.toBeInTheDocument();
      const names = screen.getAllByLabelText('Name').map((el) => (el as HTMLInputElement).value);
      expect(names).toEqual(['Rex', 'Smart Key 2']);
    });

    it('shows an empty message when no keys are paired', () => {
      mockDevice = makeDoor([]);
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      expect(screen.getByTestId('petdoor-no-keys')).toHaveTextContent('You have not added any Smart Keys yet.');
    });
  });

  describe('add smart key', () => {
    it('toggles the pairing steps', () => {
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      expect(screen.queryByTestId('petdoor-add-key-steps')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('petdoor-add-key'));
      expect(screen.getByTestId('petdoor-add-key-steps')).toHaveTextContent('LEARN button');
      expect(screen.getByTestId('petdoor-add-key')).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(screen.getByTestId('petdoor-add-key'));
      expect(screen.queryByTestId('petdoor-add-key-steps')).not.toBeInTheDocument();
    });
  });

  describe('rename', () => {
    it('saves a new name on blur', async () => {
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      const input = screen.getByDisplayValue('Rex');
      fireEvent.change(input, { target: { value: '  Fido ' } });
      fireEvent.blur(input);
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith('pettoken:petName:pt1', 'Fido'));
    });

    it('saves on Enter', async () => {
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      const input = screen.getByDisplayValue('Rex');
      input.focus();
      fireEvent.change(input, { target: { value: 'Fido' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith('pettoken:petName:pt1', 'Fido'));
    });

    it('saves the default name when cleared', async () => {
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      const input = screen.getByDisplayValue('Rex');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.blur(input);
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith('pettoken:petName:pt1', 'Smart Key 1'));
    });

    it('does not save an unchanged name, and Escape reverts edits', () => {
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      const input = screen.getByDisplayValue('Rex');
      fireEvent.blur(input);
      fireEvent.change(input, { target: { value: 'Fido' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(input).toHaveValue('Rex');
      fireEvent.blur(input);
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });

    it('shows an error when the rename fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      const input = screen.getByDisplayValue('Rex');
      fireEvent.change(input, { target: { value: 'Fido' } });
      fireEvent.blur(input);
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to rename the smart key' },
      }));
    });
  });

  describe('remove', () => {
    it('asks for confirmation, then removes the token', async () => {
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      fireEvent.click(screen.getByTestId('petdoor-key-remove-pt1'));
      expect(screen.getByRole('alertdialog')).toHaveTextContent('Are you sure you want to remove Rex?');
      expect(screen.getByTestId('petdoor-key-remove-pt2')).toBeDisabled();
      expect(screen.getByTestId('petdoor-add-key')).toBeDisabled();
      fireEvent.click(screen.getByTestId('petdoor-remove-yes'));
      expect(mockSendCommand).toHaveBeenCalledWith(PetDoor.CMD_REMOVETOKEN, { tokenId: 101 });
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('cancels without removing', () => {
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      fireEvent.click(screen.getByTestId('petdoor-key-remove-pt2'));
      fireEvent.click(screen.getByTestId('petdoor-remove-cancel'));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it('keeps the confirmation open and shows an error when removal fails', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('fail'));
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      fireEvent.click(screen.getByTestId('petdoor-key-remove-pt1'));
      fireEvent.click(screen.getByTestId('petdoor-remove-yes'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to remove Rex' },
      }));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByTestId('petdoor-remove-yes')).toBeEnabled();
    });
  });

  describe('edge cases', () => {
    it('cannot remove a key with no token id', () => {
      mockDevice = makeDoor([{ instance: 'pt1', name: 'Rex' }]);
      render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      fireEvent.click(screen.getByTestId('petdoor-key-remove-pt1'));
      expect(screen.getByTestId('petdoor-remove-yes')).toBeDisabled();
    });

    it('picks up a name changed elsewhere', () => {
      const { rerender } = render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      mockDevice = makeDoor([{ instance: 'pt1', tokenId: 101, name: 'Buddy' }]);
      rerender(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      expect(screen.getByDisplayValue('Buddy')).toBeInTheDocument();
    });

    it('renders nothing without a device', () => {
      mockDevice = undefined;
      const { container } = render(<PetDoorSmartKeysConfigurator address={ADDRESS} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});

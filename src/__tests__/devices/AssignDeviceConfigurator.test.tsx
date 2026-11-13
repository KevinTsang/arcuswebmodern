import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Person, Presence } from '@arcus/core';
import AssignDeviceConfigurator from '@/components/devices/AssignDeviceConfigurator';
import type { DeviceEntity, PersonEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:fob';
const ALICE = 'SERV:person:alice';
const BOB = 'SERV:person:bob';

const mockSetAttributes = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;
let mockPeople: PersonEntity[] = [];

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: jest.fn(),
    setAttributes: (...args: unknown[]) => mockSetAttributes(...args),
    sendCommand: jest.fn(),
  }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: unknown) => unknown) => sel({}),
}));

jest.mock('@/store/slices/peopleSlice', () => ({
  selectAllPeople: () => mockPeople,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function person(address: string, first: string, last: string): PersonEntity {
  return {
    id: address,
    [Base.ATTR_ADDRESS]: address,
    [Person.ATTR_FIRSTNAME]: first,
    [Person.ATTR_LASTNAME]: last,
  };
}

function fob(assigned?: string): DeviceEntity {
  return {
    id: ADDR,
    [Base.ATTR_ADDRESS]: ADDR,
    [Presence.ATTR_PRESENCE]: Presence.PRESENCE_PRESENT,
    ...(assigned !== undefined ? { [Presence.ATTR_PERSON]: assigned } : {}),
  };
}

const ASSIGN_ERROR = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'Failed to assign device.' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttributes.mockResolvedValue({});
  mockPeople = [person(ALICE, 'Alice', 'Smith'), person(BOB, 'Bob', 'Jones')];
  mockDevice = fob(ALICE);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AssignDeviceConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<AssignDeviceConfigurator address={ADDR} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('lists every person plus No One', () => {
      render(<AssignDeviceConfigurator address={ADDR} />);
      expect(screen.getByText('Assign To')).toBeInTheDocument();
      expect(screen.getByLabelText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByLabelText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByLabelText(/No One/)).toBeInTheDocument();
    });

    it('checks the currently assigned person', () => {
      render(<AssignDeviceConfigurator address={ADDR} />);
      expect(screen.getByLabelText('Alice Smith')).toBeChecked();
      expect(screen.getByLabelText('Bob Jones')).not.toBeChecked();
      expect(screen.getByLabelText(/No One/)).not.toBeChecked();
    });

    it('checks No One when pres:person is missing', () => {
      mockDevice = fob();
      render(<AssignDeviceConfigurator address={ADDR} />);
      expect(screen.getByLabelText(/No One/)).toBeChecked();
    });

    it('treats UNSET as unassigned', () => {
      mockDevice = fob('UNSET');
      render(<AssignDeviceConfigurator address={ADDR} />);
      expect(screen.getByLabelText(/No One/)).toBeChecked();
      expect(screen.queryByTestId('assign-device-unknown')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('assigns the device to a person with use hint PERSON', async () => {
      render(<AssignDeviceConfigurator address={ADDR} />);
      fireEvent.click(screen.getByLabelText('Bob Jones'));
      await waitFor(() =>
        expect(mockSetAttributes).toHaveBeenCalledWith({
          [Presence.ATTR_PERSON]: BOB,
          [Presence.ATTR_USEHINT]: Presence.USEHINT_PERSON,
        }),
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('unassigns the device and resets the use hint to UNKNOWN', async () => {
      render(<AssignDeviceConfigurator address={ADDR} />);
      fireEvent.click(screen.getByLabelText(/No One/));
      await waitFor(() =>
        expect(mockSetAttributes).toHaveBeenCalledWith({
          [Presence.ATTR_PERSON]: '',
          [Presence.ATTR_USEHINT]: Presence.USEHINT_UNKNOWN,
        }),
      );
    });

    it('shows an error notification when the assignment fails', async () => {
      mockSetAttributes.mockRejectedValueOnce(new Error('fail'));
      render(<AssignDeviceConfigurator address={ADDR} />);
      fireEvent.click(screen.getByLabelText('Bob Jones'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ASSIGN_ERROR));
      // Selection stays on the platform value since the device did not change.
      expect(screen.getByLabelText('Alice Smith')).toBeChecked();
    });

    it('disables the options while saving', async () => {
      let resolve: () => void = () => {};
      mockSetAttributes.mockReturnValueOnce(new Promise<void>((r) => { resolve = r; }));
      render(<AssignDeviceConfigurator address={ADDR} />);
      fireEvent.click(screen.getByLabelText('Bob Jones'));
      await waitFor(() => expect(screen.getByRole('group')).toBeDisabled());
      resolve();
      await waitFor(() => expect(screen.getByRole('group')).not.toBeDisabled());
    });
  });

  describe('edge cases', () => {
    it('shows only No One when the place has no people', () => {
      mockPeople = [];
      mockDevice = fob();
      render(<AssignDeviceConfigurator address={ADDR} />);
      expect(screen.getAllByRole('radio')).toHaveLength(1);
      expect(screen.getByLabelText(/No One/)).toBeChecked();
    });

    it('labels a person without a name', () => {
      mockPeople = [{ id: ALICE, [Base.ATTR_ADDRESS]: ALICE }];
      render(<AssignDeviceConfigurator address={ADDR} />);
      expect(screen.getByLabelText('Unnamed Person')).toBeChecked();
    });

    it('notes when the assigned person is no longer at the place', () => {
      mockDevice = fob('SERV:person:gone');
      render(<AssignDeviceConfigurator address={ADDR} />);
      expect(screen.getByTestId('assign-device-unknown')).toBeInTheDocument();
      expect(screen.getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true);
    });

    it('renders with no device loaded', () => {
      mockDevice = undefined;
      render(<AssignDeviceConfigurator address={ADDR} />);
      expect(screen.getByLabelText(/No One/)).toBeChecked();
    });
  });
});

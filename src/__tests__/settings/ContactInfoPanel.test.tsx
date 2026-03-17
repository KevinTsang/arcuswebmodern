import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Person } from '@arcus/core';
import ContactInfoPanel from '@/components/settings/ContactInfoPanel';

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

let mockPerson: Record<string, unknown> | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({ auth: { person: mockPerson } }),
  useAppDispatch: () => mockDispatch,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPerson = {
    [Person.ATTR_FIRSTNAME]: 'John',
    [Person.ATTR_LASTNAME]: 'Doe',
    [Person.ATTR_MOBILENUMBER]: '555-1234',
    [Person.ATTR_EMAIL]: 'john@test.com',
    personId: 'p1',
  };
  mockBridgeRequest.mockResolvedValue({});
});

describe('ContactInfoPanel', () => {
  it('shows pre-filled name and phone', () => {
    render(<ContactInfoPanel />);
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
  });

  it('shows email cannot be changed note', () => {
    render(<ContactInfoPanel />);
    expect(screen.getByText('Email cannot be changed here.')).toBeInTheDocument();
  });

  it('saves updated info on Save', async () => {
    render(<ContactInfoPanel />);
    const firstNameInput = screen.getByDisplayValue('John');
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:person:p1',
        expect.objectContaining({ [Person.ATTR_FIRSTNAME]: 'Jane' }),
      );
      expect(mockCloseRight).toHaveBeenCalled();
    });
  });

  it('dispatches error notification on failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<ContactInfoPanel />);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update contact info.' },
      });
    });
  });

  it('closes panel on Cancel', () => {
    render(<ContactInfoPanel />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});

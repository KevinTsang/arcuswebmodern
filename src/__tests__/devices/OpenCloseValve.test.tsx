import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OpenCloseValve from '@/components/devices/OpenCloseValve';

const mockSetAttribute = jest.fn().mockResolvedValue(undefined);
let mockDevice: Record<string, unknown> = {};

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
    sendCommand: jest.fn(),
  }),
}));

beforeEach(() => {
  mockSetAttribute.mockClear();
});

describe('OpenCloseValve', () => {
  it('renders "Close" when valve is open', () => {
    mockDevice = { 'valv:valvestate': 'OPEN' };
    render(<OpenCloseValve address="DRIV:dev:test" />);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('renders "Open" when valve is closed', () => {
    mockDevice = { 'valv:valvestate': 'CLOSED' };
    render(<OpenCloseValve address="DRIV:dev:test" />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('sends CLOSED when closing an open valve', async () => {
    mockDevice = { 'valv:valvestate': 'OPEN' };
    render(<OpenCloseValve address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith('valv:valvestate', 'CLOSED');
    });
  });

  it('sends OPEN when opening a closed valve', async () => {
    mockDevice = { 'valv:valvestate': 'CLOSED' };
    render(<OpenCloseValve address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith('valv:valvestate', 'OPEN');
    });
  });

  it('shows pending state while toggling', async () => {
    mockSetAttribute.mockReturnValue(new Promise(() => {}));
    mockDevice = { 'valv:valvestate': 'OPEN' };
    render(<OpenCloseValve address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });
});

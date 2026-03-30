import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Product } from '@arcus/core';
import HubSetupPage from '@/app/(authenticated)/hub-setup/page';
import type { PairingProduct } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockPush = jest.fn();
let mockProducts: PairingProduct[] = [];

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { products: mockProducts },
    }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockProducts = [];
  sessionStorage.clear();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubSetupPage – rendering', () => {
  it('shows Hub Setup heading', () => {
    render(<HubSetupPage />);
    expect(screen.getByText('Hub Setup')).toBeInTheDocument();
  });

  it('shows description text', () => {
    render(<HubSetupPage />);
    expect(screen.getByText(/Smart Hub connects your devices/)).toBeInTheDocument();
  });

  it('shows Starter Kits group', () => {
    render(<HubSetupPage />);
    expect(screen.getByText('Starter Kits')).toBeInTheDocument();
  });

  it('shows Hubs group', () => {
    render(<HubSetupPage />);
    expect(screen.getByText('Hubs')).toBeInTheDocument();
  });

  it('shows all hub/kit products', () => {
    render(<HubSetupPage />);
    expect(screen.getByText('Safe & Secure Starter Kit')).toBeInTheDocument();
    expect(screen.getByText('Pro Monitoring Starter Kit')).toBeInTheDocument();
    expect(screen.getByText('Arcus Wi-Fi Smart Hub')).toBeInTheDocument();
    expect(screen.getByText('Arcus Smart Hub')).toBeInTheDocument();
  });

  it('shows no-hub option', () => {
    render(<HubSetupPage />);
    expect(screen.getByText(/Don't have a hub/)).toBeInTheDocument();
  });
});

describe('HubSetupPage – product selection', () => {
  it('navigates to /pairing when a hub product is selected', () => {
    render(<HubSetupPage />);
    fireEvent.click(screen.getByText('Arcus Wi-Fi Smart Hub'));
    expect(mockPush).toHaveBeenCalledWith('/pairing');
  });

  it('stores product in sessionStorage when product exists in store', () => {
    const product: PairingProduct = { [Base.ATTR_ADDRESS]: 'SERV:product:dee001', [Product.ATTR_ID]: 'dee001', [Product.ATTR_NAME]: 'Wi-Fi Smart Hub', [Product.ATTR_VENDOR]: 'Arcus', [Product.ATTR_HUBREQUIRED]: true };
    mockProducts = [product];
    render(<HubSetupPage />);
    fireEvent.click(screen.getByText('Arcus Wi-Fi Smart Hub'));
    const stored = JSON.parse(sessionStorage.getItem('pairing:product')!);
    expect(stored[Product.ATTR_ID]).toBe('dee001');
  });

  it('stores fallback product when product not in store', () => {
    render(<HubSetupPage />);
    fireEvent.click(screen.getByText('Arcus Wi-Fi Smart Hub'));
    const stored = JSON.parse(sessionStorage.getItem('pairing:product')!);
    expect(stored[Product.ATTR_ID]).toBe('dee001');
    expect(stored[Product.ATTR_NAME]).toBe('Wi-Fi Smart Hub');
  });

  it('stores kit info when a kit is selected', () => {
    render(<HubSetupPage />);
    fireEvent.click(screen.getByText('Safe & Secure Starter Kit'));
    expect(sessionStorage.getItem('pairing:kit')).toBe('kitsafesec');
  });

  it('maps kit to hub product ID for pairing', () => {
    render(<HubSetupPage />);
    fireEvent.click(screen.getByText('Safe & Secure Starter Kit'));
    const stored = JSON.parse(sessionStorage.getItem('pairing:product')!);
    // kitsafesec maps to dee001
    expect(stored[Product.ATTR_ID]).toBe('dee001');
  });

  it('does not store kit info when a hub (non-kit) is selected', () => {
    render(<HubSetupPage />);
    fireEvent.click(screen.getByText('Arcus Wi-Fi Smart Hub'));
    expect(sessionStorage.getItem('pairing:kit')).toBeNull();
  });
});

describe('HubSetupPage – no-hub navigation', () => {
  it('navigates to product-catalog when no-hub link is clicked', () => {
    render(<HubSetupPage />);
    fireEvent.click(screen.getByText(/Browse devices that don't require a hub/));
    expect(mockPush).toHaveBeenCalledWith('/product-catalog');
  });
});

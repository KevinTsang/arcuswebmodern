import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ProductCatalogPage from '@/app/(authenticated)/product-catalog/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

let mockPlaceId: string | null = 'place-1';
let mockHub: Record<string, unknown> | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { placeId: mockPlaceId },
      hub: { hub: mockHub },
    }),
}));

const mockGetBrands = jest.fn();
const mockGetProducts = jest.fn();
const mockFindProducts = jest.fn();

jest.mock('@arcus/core/services', () => ({
  ProductCatalogService: {
    GetBrands: (...args: any[]) => mockGetBrands(...args),
    GetProducts: (...args: any[]) => mockGetProducts(...args),
    FindProducts: (...args: any[]) => mockFindProducts(...args),
  },
}));

jest.mock('@/components/product', () => ({
  ProductCard: ({ product, onSelect }: any) => (
    <button data-testid={`product-${product['product:id']}`} onClick={() => onSelect(product)}>
      {product['product:name']}
    </button>
  ),
}));

const mockBrands = [
  { name: 'GE', count: 2 },
  { name: 'Philips', count: 1 },
];

const mockProducts = [
  { 'base:address': 'SERV:product:1', 'product:name': 'Smart Plug', 'product:vendor': 'GE', 'product:id': 'p1', 'product:hubRequired': true },
  { 'base:address': 'SERV:product:2', 'product:name': 'Dimmer Switch', 'product:vendor': 'GE', 'product:id': 'p2', 'product:hubRequired': false },
  { 'base:address': 'SERV:product:3', 'product:name': 'Hue Bulb', 'product:vendor': 'Philips', 'product:id': 'p3', 'product:hubRequired': true },
];

// ── Helpers ───────────────────────────────────────────────────────────

function setupSuccessfulLoad() {
  mockGetBrands.mockResolvedValue({ brands: mockBrands });
  mockGetProducts.mockResolvedValue({ products: mockProducts });
}

// ── Tests ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockPlaceId = 'place-1';
  mockHub = null;
  sessionStorage.clear();
});

describe('ProductCatalogPage – loading', () => {
  it('shows loading state initially', () => {
    mockGetBrands.mockReturnValue(new Promise(() => {}));
    mockGetProducts.mockReturnValue(new Promise(() => {}));
    render(<ProductCatalogPage />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows heading', () => {
    mockGetBrands.mockReturnValue(new Promise(() => {}));
    mockGetProducts.mockReturnValue(new Promise(() => {}));
    render(<ProductCatalogPage />);
    expect(screen.getByText('Product Catalog')).toBeInTheDocument();
  });
});

describe('ProductCatalogPage – products on load', () => {
  it('shows all products after loading', async () => {
    setupSuccessfulLoad();
    await act(async () => { render(<ProductCatalogPage />); });
    expect(screen.getByText('Smart Plug')).toBeInTheDocument();
    expect(screen.getByText('Dimmer Switch')).toBeInTheDocument();
    expect(screen.getByText('Hue Bulb')).toBeInTheDocument();
  });

  it('shows "All Products" heading with count', async () => {
    setupSuccessfulLoad();
    await act(async () => { render(<ProductCatalogPage />); });
    expect(screen.getByText('All Products')).toBeInTheDocument();
    expect(screen.getByText('3 products')).toBeInTheDocument();
  });

  it('shows brand filter pills', async () => {
    setupSuccessfulLoad();
    await act(async () => { render(<ProductCatalogPage />); });
    expect(screen.getByText('All Brands')).toBeInTheDocument();
    expect(screen.getByText('GE (2)')).toBeInTheDocument();
    expect(screen.getByText('Philips (1)')).toBeInTheDocument();
  });
});

describe('ProductCatalogPage – brand filtering', () => {
  it('filters products by brand when brand pill is clicked', async () => {
    setupSuccessfulLoad();
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByText('GE (2)'));

    expect(screen.getByText('Smart Plug')).toBeInTheDocument();
    expect(screen.getByText('Dimmer Switch')).toBeInTheDocument();
    expect(screen.queryByText('Hue Bulb')).not.toBeInTheDocument();
    expect(screen.getByText('GE')).toBeInTheDocument();
  });

  it('shows all products when "All Brands" is clicked after filtering', async () => {
    setupSuccessfulLoad();
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByText('GE (2)'));
    fireEvent.click(screen.getByText('All Brands'));

    expect(screen.getByText('Smart Plug')).toBeInTheDocument();
    expect(screen.getByText('Hue Bulb')).toBeInTheDocument();
  });
});

describe('ProductCatalogPage – hub requirement filter', () => {
  it('shows only hub-required products when Hub Required filter is clicked', async () => {
    setupSuccessfulLoad();
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByText('Hub Required'));

    expect(screen.getByText('Smart Plug')).toBeInTheDocument();
    expect(screen.getByText('Hue Bulb')).toBeInTheDocument();
    expect(screen.queryByText('Dimmer Switch')).not.toBeInTheDocument();
  });

  it('shows only no-hub products when No Hub filter is clicked', async () => {
    setupSuccessfulLoad();
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByText('No Hub'));

    expect(screen.getByText('Dimmer Switch')).toBeInTheDocument();
    expect(screen.queryByText('Smart Plug')).not.toBeInTheDocument();
    expect(screen.queryByText('Hue Bulb')).not.toBeInTheDocument();
  });

  it('shows all products when All filter is clicked', async () => {
    setupSuccessfulLoad();
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByText('No Hub'));
    fireEvent.click(screen.getByText('All'));

    expect(screen.getByText('Smart Plug')).toBeInTheDocument();
    expect(screen.getByText('Dimmer Switch')).toBeInTheDocument();
    expect(screen.getByText('Hue Bulb')).toBeInTheDocument();
  });
});

describe('ProductCatalogPage – search', () => {
  it('shows search results after searching', async () => {
    setupSuccessfulLoad();
    mockFindProducts.mockResolvedValue({
      products: [mockProducts[0]],
    });
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.change(screen.getByPlaceholderText('Search products…'), { target: { value: 'plug' } });
    await act(async () => { fireEvent.click(screen.getByText('Search')); });

    expect(screen.getByText('Smart Plug')).toBeInTheDocument();
    expect(screen.queryByText('Dimmer Switch')).not.toBeInTheDocument();
    expect(screen.getByText('Search results for "plug"')).toBeInTheDocument();
  });

  it('shows Clear button when search results are active', async () => {
    setupSuccessfulLoad();
    mockFindProducts.mockResolvedValue({ products: [] });
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.change(screen.getByPlaceholderText('Search products…'), { target: { value: 'xyz' } });
    await act(async () => { fireEvent.click(screen.getByText('Search')); });

    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('clears search results when Clear is clicked', async () => {
    setupSuccessfulLoad();
    mockFindProducts.mockResolvedValue({ products: [mockProducts[0]] });
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.change(screen.getByPlaceholderText('Search products…'), { target: { value: 'plug' } });
    await act(async () => { fireEvent.click(screen.getByText('Search')); });

    fireEvent.click(screen.getByText('Clear'));

    expect(screen.getByText('All Products')).toBeInTheDocument();
    expect(screen.getByText('Dimmer Switch')).toBeInTheDocument();
    expect(screen.getByText('Hue Bulb')).toBeInTheDocument();
  });

  it('triggers search on Enter key', async () => {
    setupSuccessfulLoad();
    mockFindProducts.mockResolvedValue({ products: [mockProducts[2]] });
    await act(async () => { render(<ProductCatalogPage />); });

    const input = screen.getByPlaceholderText('Search products…');
    fireEvent.change(input, { target: { value: 'hue' } });
    await act(async () => { fireEvent.keyDown(input, { key: 'Enter' }); });

    expect(mockFindProducts).toHaveBeenCalledWith('SERV:place:place-1', 'hue');
  });

  it('hides brand pills during search', async () => {
    setupSuccessfulLoad();
    mockFindProducts.mockResolvedValue({ products: [mockProducts[0]] });
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.change(screen.getByPlaceholderText('Search products…'), { target: { value: 'plug' } });
    await act(async () => { fireEvent.click(screen.getByText('Search')); });

    expect(screen.queryByText('Browse by Brand')).not.toBeInTheDocument();
  });
});

describe('ProductCatalogPage – product selection', () => {
  it('stores product in sessionStorage and navigates to /pairing', async () => {
    setupSuccessfulLoad();
    mockHub = { 'base:address': 'SERV:hub:hub-1' };
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByTestId('product-p1'));

    expect(sessionStorage.getItem('pairing:product')).toBe(JSON.stringify(mockProducts[0]));
    expect(mockPush).toHaveBeenCalledWith('/pairing');
  });

  it('alerts when hub-required product selected without hub', async () => {
    setupSuccessfulLoad();
    mockHub = null;
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByTestId('product-p1'));

    expect(alertSpy).toHaveBeenCalledWith('A Smart Hub is required to pair this device. Please set up a hub first.');
    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('alerts when hub is offline', async () => {
    setupSuccessfulLoad();
    mockHub = { 'base:address': 'SERV:hub:hub-1', 'hub:state': 'DOWN' };
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByTestId('product-p1'));

    expect(alertSpy).toHaveBeenCalledWith('Your hub is offline. Please reconnect your hub before pairing.');
    alertSpy.mockRestore();
  });

  it('alerts when product requires mobile app', async () => {
    setupSuccessfulLoad();
    mockHub = { 'base:address': 'SERV:hub:hub-1' };
    const appProduct = { ...mockProducts[1], 'product:appRequired': true };
    mockGetProducts.mockResolvedValue({ products: [appProduct] });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByTestId('product-p2'));

    expect(alertSpy).toHaveBeenCalledWith('This device requires the mobile app to pair.');
    alertSpy.mockRestore();
  });

  it('navigates for non-hub-required product without hub', async () => {
    setupSuccessfulLoad();
    mockHub = null;
    await act(async () => { render(<ProductCatalogPage />); });

    fireEvent.click(screen.getByTestId('product-p2'));

    expect(mockPush).toHaveBeenCalledWith('/pairing');
  });
});

describe('ProductCatalogPage – empty state', () => {
  it('shows no-match message when filters produce empty list', async () => {
    mockGetBrands.mockResolvedValue({ brands: [] });
    mockGetProducts.mockResolvedValue({ products: [] });
    await act(async () => { render(<ProductCatalogPage />); });

    expect(screen.getByText('No products match the current filter.')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockGetBrands.mockRejectedValue(new Error('fail'));
    mockGetProducts.mockRejectedValue(new Error('fail'));
    await act(async () => { render(<ProductCatalogPage />); });

    expect(screen.getByText('No products match the current filter.')).toBeInTheDocument();
  });
});

describe('ProductCatalogPage – singular product count', () => {
  it('shows "1 product" (singular) for single result', async () => {
    mockGetBrands.mockResolvedValue({ brands: [] });
    mockGetProducts.mockResolvedValue({ products: [mockProducts[0]] });
    await act(async () => { render(<ProductCatalogPage />); });

    expect(screen.getByText('1 product')).toBeInTheDocument();
  });
});

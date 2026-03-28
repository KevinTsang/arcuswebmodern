import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from '@/components/products/ProductCard';

const mockSelect = jest.fn();

const baseProduct = {
  'base:address': 'SERV:product:prod-1',
  'product:name': 'Smart Plug',
  'product:vendor': 'GE',
  'product:id': 'abc123',
  'product:hubRequired': false,
};

beforeEach(() => jest.clearAllMocks());

describe('ProductCard', () => {
  it('renders the product name', () => {
    render(<ProductCard product={baseProduct} onSelect={mockSelect} />);
    expect(screen.getByText('Smart Plug')).toBeInTheDocument();
  });

  it('renders the vendor name', () => {
    render(<ProductCard product={baseProduct} onSelect={mockSelect} />);
    expect(screen.getByText('GE')).toBeInTheDocument();
  });

  it('does not render vendor when empty', () => {
    const product = { ...baseProduct, 'product:vendor': '' };
    const { container } = render(<ProductCard product={product} onSelect={mockSelect} />);
    const vendorElements = container.querySelectorAll('.text-grouse.mt-0\\.5');
    expect(vendorElements).toHaveLength(0);
  });

  it('falls back to shortName when name is undefined', () => {
    const { 'product:name': _, ...rest } = baseProduct;
    const product = { ...rest, 'product:name': undefined as any, 'product:shortName': 'Plug' };
    render(<ProductCard product={product} onSelect={mockSelect} />);
    expect(screen.getByText('Plug')).toBeInTheDocument();
  });

  it('shows "Hub Required" badge when hubRequired is true', () => {
    const product = { ...baseProduct, 'product:hubRequired': true };
    render(<ProductCard product={product} onSelect={mockSelect} />);
    expect(screen.getByText('Hub Required')).toBeInTheDocument();
  });

  it('does not show "Hub Required" badge when hubRequired is false', () => {
    render(<ProductCard product={baseProduct} onSelect={mockSelect} />);
    expect(screen.queryByText('Hub Required')).not.toBeInTheDocument();
  });

  it('calls onSelect with the product when clicked', () => {
    render(<ProductCard product={baseProduct} onSelect={mockSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSelect).toHaveBeenCalledWith(baseProduct);
  });
});

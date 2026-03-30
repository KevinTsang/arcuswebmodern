import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Product } from '@arcus/core';
import ProductCard from '@/components/products/ProductCard';

const mockSelect = jest.fn();

const baseProduct = {
  [Base.ATTR_ADDRESS]: 'SERV:product:prod-1',
  [Product.ATTR_NAME]: 'Smart Plug',
  [Product.ATTR_VENDOR]: 'GE',
  [Product.ATTR_ID]: 'abc123',
  [Product.ATTR_HUBREQUIRED]: false,
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
    const product = { ...baseProduct, [Product.ATTR_VENDOR]: '' };
    const { container } = render(<ProductCard product={product} onSelect={mockSelect} />);
    const vendorElements = container.querySelectorAll('.text-grouse.mt-0\\.5');
    expect(vendorElements).toHaveLength(0);
  });

  it('falls back to shortName when name is undefined', () => {
    const { [Product.ATTR_NAME]: _, ...rest } = baseProduct;
    const product = { ...rest, [Product.ATTR_NAME]: undefined as any, 'product:shortName': 'Plug' };
    render(<ProductCard product={product} onSelect={mockSelect} />);
    expect(screen.getByText('Plug')).toBeInTheDocument();
  });

  it('shows "Hub Required" badge when hubRequired is true', () => {
    const product = { ...baseProduct, [Product.ATTR_HUBREQUIRED]: true };
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

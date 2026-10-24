'use client';

/**
 * Product Catalog page — ported from src/pages/product-catalog/.
 *
 * Browse devices by brand, search by name, and initiate pairing.
 * Shows brand grid initially, then products when a brand is selected.
 * Hub requirement filter: All / Hub Required / No Hub Required.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Base, Hub, Product as ProductCap } from '@arcus/core';
import { ProductCatalogService } from '@arcus/core/services';
import { useAppSelector } from '@/store/hooks';
import { ProductCard } from '@/components/products';
import { testIdSlug } from '@/lib/testId';

type FilterMode = 'all' | 'hub-required' | 'no-hub-required';

interface Brand {
  name: string;
  count: number;
  [key: string]: unknown;
}

interface Product {
  'base:address': string;
  'product:name': string;
  'product:vendor': string;
  'product:shortName'?: string;
  'product:id': string;
  'product:hubRequired': boolean;
  'product:appRequired'?: boolean;
  'product:pairingMode'?: string;
  'product:categories'?: string[];
  'product:screen'?: string;
  [key: string]: unknown;
}

export default function ProductCatalogPage() {
  const router = useRouter();
  const placeId = useAppSelector((s) => s.place.placeId);
  const hub = useAppSelector((s) => s.hub.hub);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [loading, setLoading] = useState(true);

  // Load brands and all products on mount
  const placeAddress = placeId ? `SERV:place:${placeId}` : undefined;
  useEffect(() => {
    setLoading(true);
    Promise.all([
      ProductCatalogService.GetBrands(placeAddress),
      ProductCatalogService.GetProducts(placeAddress),
    ])
      .then(([brandsResp, productsResp]) => {
        setBrands((brandsResp['brands'] as Brand[]) ?? []);
        const prods = (productsResp['products'] as Product[]) ?? [];
        setAllProducts(prods);
        setProducts(prods);
      })
      .catch(() => {
        setBrands([]);
        setAllProducts([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [placeAddress]);

  // Filter products when brand selected
  useEffect(() => {
    if (!selectedBrand) {
      setProducts(allProducts);
      return;
    }
    setProducts(allProducts.filter((p) => p[ProductCap.ATTR_VENDOR] === selectedBrand));
  }, [selectedBrand, allProducts]);

  // Search
  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    ProductCatalogService.FindProducts(placeAddress, searchTerm.trim())
      .then((resp) => {
        setSearchResults((resp['products'] as Product[]) ?? []);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setLoading(false));
  }, [searchTerm, placeAddress]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults(null);
  }, []);

  // Filter products by hub requirement
  const filteredProducts = useMemo(() => {
    const list = searchResults ?? products;
    if (filterMode === 'all') return list;
    if (filterMode === 'hub-required') return list.filter((p) => p[ProductCap.ATTR_HUBREQUIRED]);
    return list.filter((p) => !p[ProductCap.ATTR_HUBREQUIRED]);
  }, [products, searchResults, filterMode]);

  // Navigate to pairing
  const handleSelectProduct = useCallback(
    (product: Product) => {
      // Validation checks
      if (product[ProductCap.ATTR_HUBREQUIRED] && !hub) {
        alert('A Smart Hub is required to pair this device. Please set up a hub first.');
        return;
      }
      if (product[ProductCap.ATTR_HUBREQUIRED] && hub?.[Hub.ATTR_STATE] === Hub.STATE_DOWN) {
        alert('Your hub is offline. Please reconnect your hub before pairing.');
        return;
      }
      if (product[ProductCap.ATTR_APPREQUIRED]) {
        alert('This device requires the mobile app to pair.');
        return;
      }

      // Store product selection and navigate to pairing
      sessionStorage.setItem('pairing:product', JSON.stringify(product));
      router.push('/pairing');
    },
    [hub, router],
  );

  return (
    <div className="p-[var(--gutter)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 data-testid="catalog-title" className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Product Catalog
        </h2>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            data-testid="catalog-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search products…"
            className="flex-1 border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
          />
          <button
            onClick={handleSearch}
            data-testid="catalog-search-button"
            className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
          >
            Search
          </button>
          {searchResults && (
            <button
              onClick={clearSearch}
              data-testid="catalog-search-clear"
              className="px-3 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 w-fit">
          {(['all', 'hub-required', 'no-hub-required'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              data-testid={`catalog-filter-${mode}`}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filterMode === mode
                  ? 'bg-crane text-swift shadow-sm'
                  : 'text-grouse hover:text-coot'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'hub-required' ? 'Hub Required' : 'No Hub'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-grouse">Loading…</p>
        </div>
      )}

      {/* Brand filter (when no search active) */}
      {!loading && !searchResults && brands.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-swift mb-3">Browse by Brand</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedBrand(null)}
              data-testid="catalog-brand-all"
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !selectedBrand
                  ? 'bg-peacock text-crane border-peacock'
                  : 'border-heron text-coot hover:border-peacock'
              }`}
            >
              All Brands
            </button>
            {brands.map((brand) => (
              <button
                key={brand.name}
                data-testid={`catalog-brand-${testIdSlug(brand.name)}`}
                onClick={() => setSelectedBrand(brand.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedBrand === brand.name
                    ? 'bg-peacock text-crane border-peacock'
                    : 'border-heron text-coot hover:border-peacock'
                }`}
              >
                {brand.name} ({brand.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      {!loading && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <h3 data-testid="catalog-heading" className="text-sm font-medium text-swift">
              {searchResults
                ? `Search results for "${searchTerm}"`
                : selectedBrand ?? 'All Products'}
            </h3>
            <span data-testid="catalog-count" className="text-xs text-grouse">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product[Base.ATTR_ADDRESS]}
                product={product}
                onSelect={handleSelectProduct}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <p className="text-center text-grouse py-8">
              No products match the current filter.
            </p>
          )}
        </>
      )}
    </div>
  );
}

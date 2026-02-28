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
import { ProductCatalogService } from '@arcus/core/services';
import { useAppSelector } from '@/store/hooks';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [loading, setLoading] = useState(true);

  // Load brands on mount
  useEffect(() => {
    setLoading(true);
    ProductCatalogService.GetBrands(placeId ?? undefined)
      .then((resp) => {
        const brandList = (resp['brands'] as Brand[]) ?? [];
        setBrands(brandList);
      })
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  }, [placeId]);

  // Load products when brand selected
  useEffect(() => {
    if (!selectedBrand) {
      setProducts([]);
      return;
    }
    setLoading(true);
    ProductCatalogService.GetProductsByBrand(placeId ?? undefined, selectedBrand)
      .then((resp) => {
        setProducts((resp['products'] as Product[]) ?? []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [selectedBrand, placeId]);

  // Search
  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    ProductCatalogService.FindProducts(placeId ?? undefined, searchTerm.trim())
      .then((resp) => {
        setSearchResults((resp['products'] as Product[]) ?? []);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setLoading(false));
  }, [searchTerm, placeId]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults(null);
  }, []);

  // Filter products by hub requirement
  const filteredProducts = useMemo(() => {
    const list = searchResults ?? products;
    if (filterMode === 'all') return list;
    if (filterMode === 'hub-required') return list.filter((p) => p['product:hubRequired']);
    return list.filter((p) => !p['product:hubRequired']);
  }, [products, searchResults, filterMode]);

  // Navigate to pairing
  const handleSelectProduct = useCallback(
    (product: Product) => {
      // Validation checks
      if (product['product:hubRequired'] && !hub) {
        alert('A Smart Hub is required to pair this device. Please set up a hub first.');
        return;
      }
      if (product['product:hubRequired'] && hub?.['hub:state'] === 'DOWN') {
        alert('Your hub is offline. Please reconnect your hub before pairing.');
        return;
      }
      if (product['product:appRequired']) {
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
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Product Catalog
        </h2>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search products…"
            className="flex-1 border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
          >
            Search
          </button>
          {searchResults && (
            <button
              onClick={clearSearch}
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

      {/* Brand grid (when no brand selected and no search) */}
      {!loading && !selectedBrand && !searchResults && (
        <>
          <h3 className="text-sm font-medium text-swift mb-4">Browse by Brand</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {brands.map((brand) => (
              <button
                key={brand.name}
                onClick={() => setSelectedBrand(brand.name)}
                className="border border-heron rounded-[var(--border-radius-base)] p-4 text-center hover:border-peacock hover:shadow-sm transition-all"
              >
                <p className="text-sm font-medium text-swift">{brand.name}</p>
                <p className="text-xs text-grouse mt-1">
                  {brand.count} product{brand.count !== 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>
          {brands.length === 0 && (
            <p className="text-center text-grouse py-8">No brands found.</p>
          )}
        </>
      )}

      {/* Products grid (when brand selected or search results) */}
      {!loading && (selectedBrand || searchResults) && (
        <>
          <div className="flex items-center gap-3 mb-4">
            {selectedBrand && (
              <button
                onClick={() => setSelectedBrand(null)}
                className="text-sm text-peacock hover:underline flex items-center gap-1"
              >
                &larr; All Brands
              </button>
            )}
            <h3 className="text-sm font-medium text-swift">
              {searchResults
                ? `Search results for "${searchTerm}"`
                : selectedBrand}
            </h3>
            <span className="text-xs text-grouse">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product['base:address']}
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

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (p: Product) => void;
}) {
  const name = product['product:name'] ?? product['product:shortName'] ?? 'Unknown';
  const vendor = (product['product:vendor'] as string) ?? '';
  const hubRequired = product['product:hubRequired'];

  return (
    <button
      onClick={() => onSelect(product)}
      className="border border-heron rounded-[var(--border-radius-base)] p-4 text-center hover:border-peacock hover:shadow-sm transition-all flex flex-col items-center gap-2"
    >
      {/* Product icon placeholder */}
      <div className="w-16 h-16 bg-pigeon/50 rounded-[var(--border-radius-base)] flex items-center justify-center">
        <span className="icon-app-devices text-2xl text-grouse" />
      </div>
      <div>
        <p className="text-sm font-medium text-swift leading-tight">{name}</p>
        {vendor && <p className="text-xs text-grouse mt-0.5">{vendor}</p>}
      </div>
      {hubRequired && (
        <span className="text-[10px] bg-pigeon text-grouse rounded-full px-2 py-0.5">
          Hub Required
        </span>
      )}
    </button>
  );
}

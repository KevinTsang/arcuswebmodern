'use client';

/**
 * Hub Setup page — ported from src/pages/hub-setup/.
 *
 * Guides users to select a hub or kit product, then redirects to
 * the pairing page. Shows product groups: Kits and Hubs.
 * If user doesn't have a hub, offers to browse devices that don't
 * require one.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Base, Product } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';

interface ProductGroup {
  groupName: string;
  products: ProductOption[];
}

interface ProductOption {
  productId: string;
  productName: string;
  description?: string;
}

const HUB_PRODUCT_GROUPS: ProductGroup[] = [
  {
    groupName: 'Starter Kits',
    products: [
      {
        productId: 'kitsafesec',
        productName: 'Safe & Secure Starter Kit',
        description: 'Hub + security devices bundle',
      },
      {
        productId: 'kitpromon',
        productName: 'Pro Monitoring Starter Kit',
        description: 'Hub + professional monitoring bundle',
      },
    ],
  },
  {
    groupName: 'Hubs',
    products: [
      {
        productId: 'dee001',
        productName: 'Arcus Wi-Fi Smart Hub',
        description: 'Connects via Wi-Fi or Ethernet',
      },
      {
        productId: 'dee000',
        productName: 'Arcus Smart Hub',
        description: 'Connects via Ethernet with cellular backup',
      },
    ],
  },
];

// Kit product IDs map to their hub product ID for pairing
const KIT_HUB_MAP: Record<string, string> = {
  kitsafesec: 'dee001',
  kitpromon: 'dee000',
};

export default function HubSetupPage() {
  const router = useRouter();
  const products = useAppSelector((s) => s.place.products);

  const selectProduct = useCallback(
    (productId: string) => {
      const hubId = KIT_HUB_MAP[productId] ?? productId;

      // Find product in store
      const product = products.find(
        (p) => (p[Product.ATTR_ID] as string) === hubId,
      );

      if (product) {
        sessionStorage.setItem('pairing:product', JSON.stringify(product));
      } else {
        // Fallback: create minimal product object
        sessionStorage.setItem(
          'pairing:product',
          JSON.stringify({
            [Base.ATTR_ADDRESS]: `SERV:product:${hubId}`,
            [Product.ATTR_ID]: hubId,
            [Product.ATTR_NAME]: hubId === 'dee001' ? 'Wi-Fi Smart Hub' : 'Smart Hub',
            [Product.ATTR_VENDOR]: 'Arcus',
            [Product.ATTR_HUBREQUIRED]: false,
          }),
        );
      }

      // If kit selected, also store kit info for kit-activate flow
      if (KIT_HUB_MAP[productId]) {
        sessionStorage.setItem('pairing:kit', productId);
      }

      router.push('/pairing');
    },
    [products, router],
  );

  return (
    <div className="p-[var(--gutter)]">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 data-testid="hub-setup-title" className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
            Hub Setup
          </h2>
          <p className="text-sm text-grouse mt-2">
            A Smart Hub connects your devices and enables advanced features.
          </p>
        </div>

        {/* Product groups */}
        <div className="space-y-6">
          {HUB_PRODUCT_GROUPS.map((group) => (
            <div key={group.groupName}>
              <h3 className="text-sm font-medium text-swift mb-3">{group.groupName}</h3>
              <div className="space-y-2">
                {group.products.map((product) => (
                  <button
                    key={product.productId}
                    data-testid={`hub-product-${product.productId}`}
                    onClick={() => selectProduct(product.productId)}
                    className="w-full flex items-center gap-4 p-4 border border-heron rounded-[var(--border-radius-base)] hover:border-peacock hover:shadow-sm transition-all text-left"
                  >
                    <div className="w-12 h-12 bg-pigeon/50 rounded-[var(--border-radius-base)] flex items-center justify-center flex-shrink-0">
                      <span className="icon-platform-hub-1 text-xl text-grouse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-swift">{product.productName}</p>
                      {product.description && (
                        <p className="text-xs text-grouse mt-0.5">{product.description}</p>
                      )}
                    </div>
                    <span className="text-grouse text-sm">&rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* No hub option */}
        <div className="mt-8 text-center border-t border-heron pt-6">
          <p className="text-sm text-grouse mb-3">
            Don&apos;t have a hub? Some devices work without one.
          </p>
          <button
            onClick={() => router.push('/product-catalog')}
            data-testid="hub-setup-browse"
            className="text-sm text-peacock hover:underline"
          >
            Browse devices that don&apos;t require a hub &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

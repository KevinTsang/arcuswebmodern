import { Product as ProductCap } from '@arcus/core';
import type { PairingProduct } from '@/store/entityTypes';

interface ProductCardProps {
  product: PairingProduct;
  onSelect: (product: PairingProduct) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const name = product[ProductCap.ATTR_NAME] ?? product[ProductCap.ATTR_SHORTNAME] ?? 'Unknown';
  const vendor = product[ProductCap.ATTR_VENDOR] ?? '';
  const hubRequired = product[ProductCap.ATTR_HUBREQUIRED];

  return (
    <button
      onClick={() => onSelect(product)}
      data-testid={`product-${product[ProductCap.ATTR_ID]}`}
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
        <span data-testid={`product-hub-required-${product[ProductCap.ATTR_ID]}`} className="text-[10px] bg-pigeon text-grouse rounded-full px-2 py-0.5">
          Hub Required
        </span>
      )}
    </button>
  );
}

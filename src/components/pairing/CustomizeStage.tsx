import { Product } from '@arcus/core';
import type { PairingProduct } from '@/store/entityTypes';
import type { AppDispatch } from '@/store/store';
import { setDeviceName, setFavorite } from '@/store/slices/pairingSlice';

interface CustomizeStageProps {
  isHubPairing: boolean;
  product: PairingProduct | null;
  deviceName: string;
  isFavorite: boolean;
  dispatch: AppDispatch;
  onCustomize: () => void;
}

export default function CustomizeStage({
  isHubPairing,
  product,
  deviceName,
  isFavorite,
  dispatch,
  onCustomize,
}: CustomizeStageProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-swift mb-4">
        {isHubPairing ? 'Name Your Hub' : 'Customize Your Device'}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-swift mb-1">
            {isHubPairing ? 'Hub Name' : 'Device Name'}
          </label>
          <input
            type="text"
            data-testid="pairing-device-name"
            value={deviceName}
            onChange={(e) => dispatch(setDeviceName(e.target.value))}
            placeholder={isHubPairing ? 'My Hub' : (product?.[Product.ATTR_NAME] ?? 'New Device')}
            className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
          />
        </div>
        {!isHubPairing && (
          <label className="flex items-center gap-2 text-sm text-coot">
            <input
              type="checkbox"
              data-testid="pairing-favorite"
              checked={isFavorite}
              onChange={(e) => dispatch(setFavorite(e.target.checked))}
              className="accent-peacock"
            />
            Add to favorites
          </label>
        )}
        <button
          onClick={onCustomize}
          data-testid="pairing-customize-save"
          className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
        >
          {isHubPairing ? 'Save & Continue' : 'Save & Finish'}
        </button>
      </div>
    </div>
  );
}

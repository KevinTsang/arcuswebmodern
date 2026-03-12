import type { PairingProduct, PairingDevice } from './types';
import type { AppDispatch } from '@/store/store';
import { hubRetry } from '@/store/slices/pairingSlice';
import DeviceStateRow from './DeviceStateRow';

interface SearchingStageProps {
  product: PairingProduct | null;
  isHubPairing: boolean;
  devices: PairingDevice[];
  searchTimedOut: boolean;
  hubRegistrationState: string | null;
  dispatch: AppDispatch;
  onStartSearch: () => void;
  onCancel: () => void;
}

export default function SearchingStage({
  product,
  isHubPairing,
  devices,
  searchTimedOut,
  hubRegistrationState,
  dispatch,
  onStartSearch,
  onCancel,
}: SearchingStageProps) {
  // Hub registration searching
  if (isHubPairing) {
    return (
      <div className="text-center py-6">
        <h3 className="text-lg font-semibold text-swift mb-4">Registering Hub</h3>
        {hubRegistrationState === 'REGISTERED' ? (
          <p className="text-sm text-honeycreeper font-medium">Hub registered successfully!</p>
        ) : hubRegistrationState?.startsWith('error') ? (
          <>
            <p className="text-sm text-cardinal mb-4">
              {hubRegistrationState === 'error.register.alreadyregistered'
                ? 'This hub is already registered to another account.'
                : hubRegistrationState === 'error.register.orphanedhub'
                  ? 'This hub needs to be reset. Please contact support.'
                  : 'Invalid Hub ID. Please check and try again.'}
            </p>
            <button
              onClick={() => dispatch(hubRetry())}
              className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <div className="animate-pulse mb-4">
              <div className="w-16 h-16 bg-peacock/10 rounded-full flex items-center justify-center mx-auto">
                <span className="icon-platform-hub-1 text-2xl text-peacock" />
              </div>
            </div>
            <p className="text-sm text-grouse">
              {hubRegistrationState === 'DOWNLOADING'
                ? 'Downloading firmware update…'
                : hubRegistrationState === 'APPLYING'
                  ? 'Applying firmware update…'
                  : 'Waiting for hub to connect…'}
            </p>
            <p className="text-xs text-grouse mt-2">This may take a few minutes.</p>
          </>
        )}
      </div>
    );
  }

  // Device searching
  return (
    <div className="text-center py-6">
      <h3 className="text-lg font-semibold text-swift mb-4">Searching for Device</h3>
      {!searchTimedOut ? (
        <>
          <div className="animate-pulse mb-4">
            <div className="w-16 h-16 bg-peacock/10 rounded-full flex items-center justify-center mx-auto">
              <span className="icon-app-devices text-2xl text-peacock" />
            </div>
          </div>
          <p className="text-sm text-grouse mb-2">
            {product
              ? `Looking for your ${product['product:name']}…`
              : 'Looking for devices…'}
          </p>
          {devices.length > 0 && (
            <div className="mt-4 space-y-2">
              {devices.map((d) => (
                <DeviceStateRow key={d['base:address']} device={d} />
              ))}
            </div>
          )}
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-swift mb-2">Search timed out</p>
          <p className="text-sm text-grouse mb-4">
            No devices were found. Make sure your device is in pairing mode and within range of the hub.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={onStartSearch}
              className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
            >
              Try Again
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

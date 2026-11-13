'use client';

/**
 * OAuth connect stage — ported from the legacy
 * components/pairing/connect/oauth module.
 *
 * Shown while the user signs in to a vendor account (Nest, Honeywell, Lutron,
 * …) in a popup window, and while the platform adds the vendor's devices.
 */

import { Base } from '@arcus/core';
import type { PairingDevice } from '@/store/entityTypes';
import type { OAuthStatus } from './types';
import DeviceStateRow from './DeviceStateRow';

interface OAuthConnectStageProps {
  /** Vendor name shown in the copy, e.g. "Nest". */
  vendor: string;
  status: OAuthStatus;
  devices: PairingDevice[];
  onFocusPopup: () => void;
  onRetry: () => void;
  onShowSteps: () => void;
  onCancel: () => void;
}

function titleFor(status: OAuthStatus, vendor: string, found: number): string {
  if (found > 0) return `${found} Device${found === 1 ? '' : 's'} Found!`;
  switch (status) {
    case 'timedOut':
      return 'Pairing Has Timed Out';
    case 'closed':
    case 'blocked':
      return `No New ${vendor} Devices Found`.replace(/\s+/g, ' ');
    case 'authorized':
      return 'Adding Devices…';
    default:
      return 'Connecting…';
  }
}

export function OAuthConnectStage({
  vendor,
  status,
  devices,
  onFocusPopup,
  onRetry,
  onShowSteps,
  onCancel,
}: OAuthConnectStageProps) {
  const vendorAccount = vendor ? `${vendor} account` : 'account';
  const isWaiting = status === 'connecting' || status === 'authorized';

  return (
    <div data-testid="oauth-connect" data-status={status} className="text-center py-6">
      <h3 data-testid="oauth-title" className="text-lg font-semibold text-swift mb-4">
        {titleFor(status, vendor, devices.length)}
      </h3>

      {isWaiting && (
        <div className="animate-pulse mb-4">
          <div className="w-16 h-16 bg-peacock/10 rounded-full flex items-center justify-center mx-auto">
            <span className="icon-app-cloud-1 text-2xl text-peacock" />
          </div>
        </div>
      )}

      {status === 'connecting' && (
        <>
          <p className="text-sm text-grouse mb-4">
            Sign in to your {vendorAccount} in the popup window to connect your devices.
          </p>
          <button
            onClick={onFocusPopup}
            data-testid="oauth-show-popup"
            className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
          >
            Show {vendor ? `${vendor} ` : ''}Login Window
          </button>
        </>
      )}

      {status === 'authorized' && (
        <p className="text-sm text-grouse mb-4">
          Your {vendorAccount} is connected. Looking for your devices…
        </p>
      )}

      {status === 'closed' && (
        <div data-testid="oauth-failed" className="bg-pigeon/30 rounded-[var(--border-radius-base)] p-4 mb-4 text-left">
          <h4 className="text-sm font-semibold text-swift mb-1">
            {vendor ? `${vendor} ` : ''}Login Window Closed
          </h4>
          <p className="text-sm text-grouse">
            Do you want to try again? If not, you can cancel pairing below.
          </p>
        </div>
      )}

      {status === 'blocked' && (
        <div data-testid="oauth-blocked" className="bg-pigeon/30 rounded-[var(--border-radius-base)] p-4 mb-4 text-left">
          <h4 className="text-sm font-semibold text-swift mb-1">Login Window Blocked</h4>
          <p className="text-sm text-grouse">
            Your browser blocked the {vendor ? `${vendor} ` : ''}login window. Allow popups for this site, then try again.
          </p>
        </div>
      )}

      {status === 'timedOut' && (
        <div data-testid="oauth-timed-out" className="bg-pigeon/30 rounded-[var(--border-radius-base)] p-4 mb-4 text-left">
          <h4 className="text-sm font-semibold text-swift mb-1">
            Do you want to return to the pairing steps and try again?
          </h4>
          <p className="text-sm text-grouse">
            If you do not want to continue, you can cancel pairing below.
          </p>
        </div>
      )}

      {devices.length > 0 && (
        <div className="mt-4 mb-4 space-y-2">
          {devices.map((d) => (
            <DeviceStateRow key={d[Base.ATTR_ADDRESS]} device={d} />
          ))}
        </div>
      )}

      <div className="flex gap-2 justify-center mt-4">
        {(status === 'closed' || status === 'blocked') && (
          <button
            onClick={onRetry}
            data-testid="oauth-retry"
            className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
          >
            Retry Login
          </button>
        )}
        {status === 'timedOut' && (
          <button
            onClick={onShowSteps}
            data-testid="oauth-show-steps"
            className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
          >
            Show Steps
          </button>
        )}
        <button
          onClick={onCancel}
          data-testid="oauth-cancel"
          className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

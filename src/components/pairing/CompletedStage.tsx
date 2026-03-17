import { PairingDevice as PairingDeviceCap } from '@arcus/core';
import type { PairingDevice } from '@/store/entityTypes';

interface CompletedStageProps {
  isHubPairing: boolean;
  activeDevice: PairingDevice | null;
  productName: string;
  onFinish: () => void;
  onPairAnother: () => void;
}

export default function CompletedStage({
  isHubPairing,
  activeDevice,
  productName,
  onFinish,
  onPairAnother,
}: CompletedStageProps) {
  const isMispaired =
    activeDevice?.[PairingDeviceCap.ATTR_PAIRINGSTATE] === PairingDeviceCap.PAIRINGSTATE_MISPAIRED ||
    activeDevice?.[PairingDeviceCap.ATTR_PAIRINGSTATE] === PairingDeviceCap.PAIRINGSTATE_MISCONFIGURED;

  return (
    <div className="text-center py-6">
      {isMispaired ? (
        <>
          <div className="w-16 h-16 bg-canary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="icon-app-warning text-2xl text-canary" />
          </div>
          <h3 className="text-lg font-semibold text-swift mb-2">Improperly Paired</h3>
          <p className="text-sm text-grouse mb-4">
            The device was not paired correctly. Try removing it and pairing again.
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-honeycreeper/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-honeycreeper">&#10003;</span>
          </div>
          <h3 className="text-lg font-semibold text-swift mb-2">
            {isHubPairing ? 'Hub Ready!' : 'Device Paired!'}
          </h3>
          <p className="text-sm text-grouse mb-4">
            {isHubPairing
              ? 'Your hub is connected and ready to use.'
              : `${productName} has been successfully paired.`}
          </p>
        </>
      )}
      <div className="flex gap-2 justify-center">
        <button
          onClick={onFinish}
          className="px-6 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
        >
          Go to Devices
        </button>
        <button
          onClick={onPairAnother}
          className="px-4 py-2.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Pair Another
        </button>
      </div>
    </div>
  );
}

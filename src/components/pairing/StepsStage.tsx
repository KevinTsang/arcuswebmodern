import type { PairingProduct, PairingStep } from './types';
import type { AppDispatch } from '@/store/store';
import { nextStep, prevStep } from '@/store/slices/pairingSlice';
import HubRegistrationSteps from './HubRegistrationSteps';

interface StepsStageProps {
  product: PairingProduct | null;
  isHubPairing: boolean;
  steps: PairingStep[];
  currentStep: number;
  loading: boolean;
  hubId: string;
  dispatch: AppDispatch;
  onStartSearch: () => void;
  onStartHubRegistration: () => void;
}

export default function StepsStage({
  product,
  isHubPairing,
  steps,
  currentStep,
  loading,
  hubId,
  dispatch,
  onStartSearch,
  onStartHubRegistration,
}: StepsStageProps) {
  // Generic pairing: waiting for search to start
  if (!isHubPairing && !product) {
    return (
      <div className="text-center py-6">
        <div className="animate-pulse mb-4">
          <div className="w-16 h-16 bg-peacock/10 rounded-full flex items-center justify-center mx-auto">
            <span className="icon-app-devices text-2xl text-peacock" />
          </div>
        </div>
        <p className="text-sm text-grouse">Starting device search…</p>
      </div>
    );
  }

  // Hub pairing: hub ID entry
  if (isHubPairing) {
    return (
      <HubRegistrationSteps
        hubId={hubId}
        dispatch={dispatch}
        loading={loading}
        onStartHubRegistration={onStartHubRegistration}
      />
    );
  }

  // Product pairing: instructions
  return (
    <div>
      <h3 className="text-lg font-semibold text-swift mb-4">Pairing Instructions</h3>
      {steps.length > 0 ? (
        <>
          <div className="text-sm text-grouse mb-2">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="bg-pigeon/30 rounded-[var(--border-radius-base)] p-4 mb-4 min-h-[100px]">
            {steps[currentStep]?.instructions?.map((inst, i) => (
              <p key={i} className="text-sm text-swift mb-2 last:mb-0">
                {inst}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => dispatch(prevStep())}
                className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
              >
                Previous
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => dispatch(nextStep())}
                className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onStartSearch}
                className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
              >
                Search for Device
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-grouse mb-4">
            Follow the manufacturer instructions to put your device in pairing mode, then click below.
          </p>
          <button
            onClick={onStartSearch}
            disabled={loading}
            className="px-6 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
          >
            {loading ? 'Starting…' : 'Search for Device'}
          </button>
        </div>
      )}
    </div>
  );
}

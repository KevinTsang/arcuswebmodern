import type { AppDispatch } from '@/store/store';
import { setHubId } from '@/store/slices/pairingSlice';

interface HubRegistrationStepsProps {
  hubId: string;
  dispatch: AppDispatch;
  loading: boolean;
  onStartHubRegistration: () => void;
}

export default function HubRegistrationSteps({
  hubId,
  dispatch,
  loading,
  onStartHubRegistration,
}: HubRegistrationStepsProps) {
  return (
    <div>
      <h3 data-testid="hub-register-title" className="text-lg font-semibold text-swift mb-4">Register Your Hub</h3>
      <p className="text-sm text-grouse mb-4">
        Find the Hub ID on the bottom of your hub. It looks like AAA-NNNN.
      </p>
      <div className="mb-4">
        <label className="block text-sm font-medium text-swift mb-1">Hub ID</label>
        <input
          type="text"
          data-testid="hub-id-input"
          value={hubId}
          onChange={(e) => dispatch(setHubId(e.target.value))}
          placeholder="AAA-0000"
          className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock uppercase"
        />
      </div>
      <button
        onClick={onStartHubRegistration}
        data-testid="hub-register"
        disabled={!hubId.trim() || loading}
        className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
      >
        Register Hub
      </button>
    </div>
  );
}

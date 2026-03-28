'use client';

export default function RemoveZWaveDeviceSuccessModal({ onDone }: { onDone: () => void }) {
  return (
    <>
      <h3 className="text-lg font-semibold text-swift mb-2">Success!</h3>
      <hr className="border-heron mb-4" />
      <p className="text-sm font-bold text-swift mb-4">
        Orphaned Z-Wave device(s) have been successfully removed.
      </p>
      <div className="flex justify-end">
        <button
          onClick={onDone}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:opacity-90"
        >
          Done
        </button>
      </div>
    </>
  );
}

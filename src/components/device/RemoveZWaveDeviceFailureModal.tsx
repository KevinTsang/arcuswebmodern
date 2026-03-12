'use client';

export default function RemoveZWaveDeviceFailureModal({
  onKeepSearching,
  onCancel,
}: {
  onKeepSearching: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <h3 className="text-lg font-semibold text-swift mb-2">Removal Timed Out</h3>
      <hr className="border-heron mb-4" />
      <p className="text-sm font-bold text-swift mb-4">
        A device was not removed. Do you want to keep looking?
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onKeepSearching}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:opacity-90"
        >
          Keep Searching
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

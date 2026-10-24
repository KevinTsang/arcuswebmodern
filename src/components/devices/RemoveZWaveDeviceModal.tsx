'use client';

export default function RemoveZWaveDeviceModal({ onCancel }: { onCancel: () => void }) {
  return (
    <>
      <h3 className="text-lg font-semibold text-swift mb-2">Searching...</h3>
      <hr className="border-heron mb-4" />
      <p className="text-sm text-grouse mb-3">
        To reset this device, put the device in &quot;learn mode&quot; which usually
        involves pressing the Z-Wave button on the device. Check your
        manufacturer&apos;s manual for details.
      </p>
      <p className="text-sm font-bold text-swift mb-4">
        Note: Do not use any other Z-Wave devices during this process as
        they may be removed inadvertently.
      </p>
      <div className="flex justify-end">
        <button
          onClick={onCancel}
          data-testid="zwave-remove-cancel"
          className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

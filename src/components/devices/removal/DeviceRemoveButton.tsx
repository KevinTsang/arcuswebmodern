'use client';

interface DeviceRemoveButtonProps {
  onClick: () => void;
}

/** Remove Device link that starts the removal flow (`idle` stage). */
export function DeviceRemoveButton({ onClick }: DeviceRemoveButtonProps) {
  return (
    <button
      onClick={onClick}
      data-testid="device-remove"
      className="text-sm text-cardinal hover:underline"
    >
      Remove Device
    </button>
  );
}

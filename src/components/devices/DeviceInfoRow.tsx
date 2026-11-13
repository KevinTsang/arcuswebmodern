import { testIdSlug } from '@/lib/testId';

interface DeviceInfoRowProps {
  label: string;
  value: string;
}

/** One label/value row in the device detail panel's `<dl>`. */
export function DeviceInfoRow({ label, value }: DeviceInfoRowProps) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-grouse">{label}</dt>
      <dd data-testid={`device-detail-${testIdSlug(label)}`} className="text-sm text-swift text-right">{value}</dd>
    </div>
  );
}

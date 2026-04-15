import { useClimateSubsystem } from '@/hooks/useClimateSubsystem';
import { formatTemp } from '@/hooks/useDeviceConfig';
import CardShell from './CardShell';

export default function ClimateCard() {
  const climate = useClimateSubsystem();

  return (
    <CardShell title="Climate" icon="icon-app-thermometer" href="/services">
      <div className="flex gap-6">
        {climate.temperature != null && (
          <div>
            <p className="text-2xl font-light text-swift">{formatTemp(climate.temperature)}</p>
            <p className="text-xs text-grouse">Temperature</p>
          </div>
        )}
        {climate.humidity != null && (
          <div>
            <p className="text-2xl font-light text-swift">{Math.round(climate.humidity as number)}%</p>
            <p className="text-xs text-grouse">Humidity</p>
          </div>
        )}
        {climate.temperature == null && climate.humidity == null && (
          <p className="text-sm text-grouse">No climate data available.</p>
        )}
      </div>
    </CardShell>
  );
}

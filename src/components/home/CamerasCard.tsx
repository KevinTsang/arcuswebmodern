import { useCamerasSubsystem } from '@/hooks/useCamerasSubsystem';
import CardShell from './CardShell';

export default function CamerasCard() {
  const cameras = useCamerasSubsystem();

  return (
    <CardShell title="Cameras" icon="icon-app-camera-1" href="/services">
      <p className="text-sm text-grouse">
        {cameras.cameras.length} camera{cameras.cameras.length !== 1 ? 's' : ''}
      </p>
    </CardShell>
  );
}

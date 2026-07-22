import { type SubsystemConfigEntry } from '@/lib/subsystemConfig';
import {
  AlarmsView,
  CamerasView,
  CareView,
  ClimateView,
  DoorsLocksView,
  HomeFamilyView,
  LawnGardenView,
  GenericDeviceListView,
} from '@/components/subsystems';

/**
 * Selects the detail view for a subsystem. Rendering exactly one view per
 * request keeps each subsystem's view in its own client chunk; subsystems
 * without a custom view fall back to the generic device list.
 */
export function SubsystemView({ config, action }: { config: SubsystemConfigEntry; action: string }) {
  switch (config.slug) {
    case 'alarms':
      return <AlarmsView action={action} />;
    case 'cameras':
      return <CamerasView />;
    case 'care':
      return <CareView />;
    case 'climate':
      return <ClimateView />;
    case 'doors-locks':
      return <DoorsLocksView />;
    case 'home-family':
      return <HomeFamilyView />;
    case 'lawn-garden':
      return <LawnGardenView />;
    default:
      return <GenericDeviceListView config={config} />;
  }
}

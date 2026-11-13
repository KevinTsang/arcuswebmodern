import type { CareTemplate, CareTemplateField } from '@/lib/careBehaviors';
import type { CareBehavior } from '@/store/entityTypes';

/** Props shared by every care behavior field editor. */
export interface CareBehaviorFieldProps {
  behavior: CareBehavior;
  field: CareTemplateField;
  template: CareTemplate;
  onChange: (patch: Partial<CareBehavior>) => void;
}

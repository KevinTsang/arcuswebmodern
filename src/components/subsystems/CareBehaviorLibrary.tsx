'use client';

/**
 * CareBehaviorLibrary — the care behavior templates a new behavior can be
 * built from. Templates with compatible devices come first; the rest are
 * listed under "Additional Devices Required" and open a read-only preview.
 *
 * Replaces src/components/subsystem/care/behaviors/.
 */

import type { CareTemplate } from '@/lib/careBehaviors';
import { CareTemplateButton } from './CareTemplateButton';

interface CareBehaviorLibraryProps {
  templates: CareTemplate[];
  onSelect: (template: CareTemplate) => void;
  onPreview: (template: CareTemplate) => void;
}

export function CareBehaviorLibrary({ templates, onSelect, onPreview }: CareBehaviorLibraryProps) {
  const satisfied = templates.filter((t) => t.availableDevices.length > 0);
  const unsatisfied = templates.filter((t) => t.availableDevices.length === 0);

  return (
    <div data-testid="care-behavior-library" className="space-y-4">
      <div>
        <h3 data-testid="care-library-title" className="text-sm font-medium text-swift">Care Behaviors Library</h3>
        <p className="text-xs text-grouse mt-0.5">
          Care Behaviors help you monitor your loved ones&apos; daily routines and can trigger a Care Alarm if those routines are disrupted.
        </p>
      </div>

      <div>
        <h4 className="text-xs font-medium text-coot uppercase tracking-wide mb-2">Recommended For You</h4>
        {satisfied.length > 0 ? (
          <div className="space-y-2">
            {satisfied.map((t) => <CareTemplateButton key={t.id} template={t} onClick={onSelect} />)}
          </div>
        ) : (
          <p data-testid="care-library-none" className="text-xs text-grouse">
            There are no connected devices to support Care behaviors.
          </p>
        )}
      </div>

      {unsatisfied.length > 0 && (
        <div data-testid="care-library-unavailable" className="opacity-70">
          <h4 className="text-xs font-medium text-coot uppercase tracking-wide mb-2">More Behaviors (Additional Devices Required)</h4>
          <div className="space-y-2">
            {unsatisfied.map((t) => <CareTemplateButton key={t.id} template={t} onClick={onPreview} />)}
          </div>
        </div>
      )}
    </div>
  );
}

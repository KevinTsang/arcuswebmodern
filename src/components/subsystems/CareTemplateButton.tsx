'use client';

/**
 * CareTemplateButton — one care behavior template in the behaviors library.
 */

import type { CareTemplate } from '@/lib/careBehaviors';

interface CareTemplateButtonProps {
  template: CareTemplate;
  onClick: (template: CareTemplate) => void;
}

export function CareTemplateButton({ template, onClick }: CareTemplateButtonProps) {
  return (
    <button
      type="button"
      data-testid={`care-template-${template.id}`}
      onClick={() => onClick(template)}
      className="w-full text-left border border-heron rounded-[var(--border-radius-base)] p-3 hover:bg-pigeon/50"
    >
      <span className="block text-sm font-medium text-swift">{template.name}</span>
      {template.description && <span className="block text-xs text-grouse mt-0.5">{template.description}</span>}
    </button>
  );
}

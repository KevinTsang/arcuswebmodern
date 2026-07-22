/**
 * Subsystem detail route — /services/<subsystem>/<action>.
 *
 * A server component so the valid subsystem slugs are statically known
 * (generateStaticParams) and unknown slugs 404 (notFound) rather than
 * silently falling back. The switch renders exactly one client view per
 * request, so each subsystem's view ships as its own client chunk instead
 * of the whole set loading up front.
 *
 * The page owns the Services chrome directly (context bar, sidebar, mobile
 * selector) by composing small subcomponents; the active subsystem comes
 * from the route params, so the nav pieces take it as a plain prop.
 */

import { notFound } from 'next/navigation';
import { subsystemConfigs, getSubsystemConfigBySlug } from '@/lib/subsystemConfig';
import {
  ServicesContextBar,
  SubsystemSidebar,
  MobileSubsystemSelector,
  SubsystemView,
} from '@/components/services';

const DEFAULT_ACTION = 'status';

export function generateStaticParams() {
  return subsystemConfigs
    .filter((c) => c.visible)
    .map((c) => ({ subsystem: c.slug, action: [DEFAULT_ACTION] }));
}

export default async function SubsystemPage({
  params,
}: {
  params: Promise<{ subsystem: string; action?: string[] }>;
}) {
  const { subsystem, action } = await params;
  const config = getSubsystemConfigBySlug(subsystem);
  if (!config || !config.visible) notFound();

  // /services/<subsystem>/<action> — the action selects the view's sub-tab.
  const activeAction = action?.[0] ?? DEFAULT_ACTION;

  return (
    <div className="p-[var(--gutter)]">
      <ServicesContextBar />

      <div className="flex gap-6">
        <SubsystemSidebar activeSlug={config.slug} />
        <MobileSubsystemSelector activeSlug={config.slug} />

        <div className="flex-1 min-w-0">
          {/* Subsystem header */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`${config.icon} text-xl text-peacock`} />
            <h3 className="text-lg font-semibold text-swift">{config.name}</h3>
          </div>

          <SubsystemView config={config} action={activeAction} />
        </div>
      </div>
    </div>
  );
}

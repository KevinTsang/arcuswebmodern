import { redirect } from 'next/navigation';
import { subsystemConfigs } from '@/lib/subsystemConfig';

const DEFAULT_ACTION = 'status';

/**
 * Bare /services has no content of its own — redirect to the first visible
 * subsystem so the sidebar always has an active selection.
 */
export default function ServicesIndexPage() {
  redirect(`/services/${subsystemConfigs[0].slug}/${DEFAULT_ACTION}`);
}

/**
 * The routes a pairing flow spans, and the alarms page that interrupts it.
 *
 * The list matches the legacy client's '{route} page' handlers
 * (pages/pairing/pairing.js and pages/product-catalog/product-catalog.js):
 * moving between these pages stays in pairing, and leaving them ends it.
 */

export const PAIRING_FLOW_ROUTES: readonly string[] = ['/hub-setup', '/pairing', '/product-catalog', '/kit-activate'];

/** The alarms page, where the authenticated layout sends the user when an incident starts. */
export const ALARMS_ROUTE = '/services/alarms';

/** The pathname is the route itself or one of its sub-routes. */
function isWithin(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isPairingFlowRoute(pathname: string): boolean {
  return PAIRING_FLOW_ROUTES.some((route) => isWithin(pathname, route));
}

export function isAlarmsRoute(pathname: string): boolean {
  return isWithin(pathname, ALARMS_ROUTE);
}

'use client';

/**
 * Ends the pairing flow when the user leaves the pairing pages.
 *
 * A pairing flow (see `PairingFlow`) spans the pairing page, the product
 * catalog, Kit Activation and Hub Setup. Go to Devices and Kit Activation's
 * Finish end it with DismissAll. Leaving any other way (a header link, browser
 * Back) ends it here, as the legacy client's '{route} page' handlers do
 * (pages/pairing/pairing.js, pages/product-catalog/product-catalog.js):
 * StopSearching and DismissAll are sent once, best-effort, and the flow is
 * cleared, so the next pairing starts a new flow from a fresh snapshot.
 *
 * The alarms page is the exception. An incident sends the user there in the
 * middle of pairing, which interrupts pairing without ending it: searching
 * stops, and the flow is kept so the user can return to pairing. Leaving the
 * alarms page for a page outside pairing ends the flow.
 *
 * It is mounted in the authenticated layout, which sees every route change.
 * The pairing page's unmount isn't enough: Pair Another and the product
 * catalog unmount it without leaving the flow.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { PairingSubsystem } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import type { PairingFlow } from '@/components/pairing/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { endPairingFlow } from '@/store/slices/pairingSlice';
import { isAlarmsRoute, isPairingFlowRoute } from '@/lib/pairingRoutes';

/** Fire and forget: the user has already left pairing, so a failure is logged, not shown. */
function sendBestEffort(command: string, pairingSubsystem: string): void {
  Bridge.request(command, pairingSubsystem, {}).catch((e) => {
    console.warn(`${command} after leaving pairing failed:`, e);
  });
}

export function usePairingFlowExit(): void {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const flow = useAppSelector((s) => s.pairing.flow);

  const onAlarms = isAlarmsRoute(pathname);
  // The pairing subsystem to stop searching while the alarms page interrupts the flow.
  const interruptedSubsystem = onAlarms ? (flow?.pairingSubsystem ?? null) : null;
  // The flow to end, once the user is outside pairing and not on the alarms page.
  const flowToEnd = !onAlarms && !isPairingFlowRoute(pathname) ? flow : null;
  // The flow this hook has ended. StrictMode runs a mount effect twice with the same flow.
  const endedRef = useRef<PairingFlow | null>(null);

  useEffect(() => {
    if (interruptedSubsystem) sendBestEffort(PairingSubsystem.CMD_STOPSEARCHING, interruptedSubsystem);
  }, [interruptedSubsystem]);

  useEffect(() => {
    if (!flowToEnd || endedRef.current === flowToEnd) return;
    endedRef.current = flowToEnd;
    // Clear the flow before sending anything, so nothing is sent twice.
    dispatch(endPairingFlow());
    sendBestEffort(PairingSubsystem.CMD_STOPSEARCHING, flowToEnd.pairingSubsystem);
    sendBestEffort(PairingSubsystem.CMD_DISMISSALL, flowToEnd.pairingSubsystem);
  }, [flowToEnd, dispatch]);
}

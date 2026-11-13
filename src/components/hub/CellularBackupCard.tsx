'use client';

/**
 * CellularBackupCard — cellular backup status and the Cellular Backup add-on.
 *
 * Status comes from the CellBackupSubsystem (is the place ready, in use, or
 * what's missing) and the hub's 4G modem attributes (hub4g:*). Adding or
 * removing the add-on is account:UpdateServicePlan with the CELLBACKUP addon,
 * as legacy's update-cellular-backup panel did. Pro Monitoring plans include
 * cellular backup, so they get no toggle.
 *
 * 4G data usage (hub4g:GetStatistics) is not shown: the hub bridge only
 * accepts hub4g:* requests from the platform, never from a client.
 */

import { useCallback, useMemo, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { Account, Base, CellBackupSubsystem, Hub, Hub4g, HubNetwork, Place } from '@arcus/core';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { selectAllSubsystems } from '@/store/slices/subsystemsSlice';
import InfoRow from '@/components/settings/InfoRow';
import { TestIdScope } from '@/lib/testIdScope';
import { cellBackupStatusLabel } from './cellBackupStatus';
import type { CellBackupAttributes, HubAdvancedAttributes } from './hubAdvancedTypes';

const CELLBACKUP_PREFIX = `SERV:${CellBackupSubsystem.NAMESPACE}:`;

function isPromon(serviceLevel: string | undefined): boolean {
  return !!serviceLevel && serviceLevel.includes('PROMON');
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

interface CellularBackupCardProps {
  hub: HubAdvancedAttributes;
}

export function CellularBackupCard({ hub }: CellularBackupCardProps) {
  const dispatch = useAppDispatch();
  const subsystems = useAppSelector(selectAllSubsystems);
  const place = useAppSelector((s) => s.place.place);
  const account = useAppSelector((s) => s.auth.account);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const cellBackup = useMemo(
    () => subsystems.find((s) => s[Base.ATTR_ADDRESS].startsWith(CELLBACKUP_PREFIX)) as CellBackupAttributes | undefined,
    [subsystems],
  );

  const serviceLevel = place?.[Place.ATTR_SERVICELEVEL];
  const addons = (place?.[Place.ATTR_SERVICEADDONS] as string[] | undefined) ?? [];
  const hasAddon = addons.includes(Place.SERVICEADDON_CELLBACKUP);
  const included = isPromon(serviceLevel);
  // Only the account that owns the place can change its service plan.
  const ownsPlace = !!account && !!place && place[Place.ATTR_ACCOUNT] === account[Base.ATTR_ID];
  const hasCard = !!account?.[Account.ATTR_BILLINGCCLAST4];
  const adding = !hasAddon;

  const onCellular = hub[HubNetwork.ATTR_TYPE] === HubNetwork.TYPE_3G
    && hub[Hub.ATTR_STATE] !== Hub.STATE_DOWN;
  const modemPresent = hub[Hub4g.ATTR_PRESENT] === true;
  const connectionState = hub[Hub4g.ATTR_CONNECTIONSTATE];
  const signalBars = hub[Hub4g.ATTR_SIGNALBARS];
  const modemName = [hub[Hub4g.ATTR_VENDOR], hub[Hub4g.ATTR_MODEL]].filter(Boolean).join(' ');
  const sim = !hub[Hub4g.ATTR_SIMPRESENT]
    ? 'Not inserted'
    : hub[Hub4g.ATTR_SIMDISABLED]
      ? 'Disabled'
      : hub[Hub4g.ATTR_ICCID] && hub[Hub4g.ATTR_SIMPROVISIONED] !== false
        ? hub[Hub4g.ATTR_ICCID]!
        : 'Not provisioned';

  const updatePlan = useCallback(async () => {
    if (!account || !place) return;
    setSaving(true);
    try {
      await Bridge.request(Account.CMD_UPDATESERVICEPLAN, account[Base.ATTR_ADDRESS], {
        placeID: place[Base.ATTR_ID],
        serviceLevel,
        addons: { [Place.SERVICEADDON_CELLBACKUP]: adding },
      });
      dispatch(addNotification({
        type: 'success',
        message: `Cellular Backup has been ${adding ? 'added to' : 'removed from'} your service plan.`,
      }));
      setConfirming(false);
    } catch {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to ${adding ? 'add' : 'remove'} Cellular Backup`,
      }));
    }
    setSaving(false);
  }, [account, place, serviceLevel, adding, dispatch]);

  const openConfirm = useCallback(() => setConfirming(true), []);
  const closeConfirm = useCallback(() => setConfirming(false), []);

  return (
    <section data-testid="hub-cellular" className="border border-heron rounded-[var(--border-radius-base)] p-4">
      <h3 data-testid="hub-cellular-title" className="text-sm font-medium text-swift mb-3">Cellular Backup</h3>

      {onCellular && (
        <p data-testid="hub-cellular-in-use" className="text-xs text-swift bg-pigeon rounded-[var(--border-radius-base)] px-3 py-2 mb-3">
          Your hub is connected through Cellular Backup. Reconnect it to Ethernet or Wi-Fi when available.
        </p>
      )}

      <TestIdScope.Provider value="hub-cellular">
        <div className="space-y-2 mb-3">
          <InfoRow label="Status" value={cellBackupStatusLabel(cellBackup)} />
          <InfoRow label="Plan" value={included ? 'Included with Pro Monitoring' : hasAddon ? 'Added' : 'Not added'} />
          <InfoRow label="4G Modem" value={modemPresent ? (modemName || 'Connected') : 'Not detected'} />
          {modemPresent && (
            <>
              <InfoRow label="Modem Connection" value={connectionState ? titleCase(connectionState) : '-'} />
              <InfoRow label="Signal" value={signalBars !== undefined ? `${signalBars} of 5 bars` : '-'} />
              <InfoRow label="IMEI" value={hub[Hub4g.ATTR_IMEI] || '-'} />
              <InfoRow label="SIM" value={sim} />
            </>
          )}
        </div>
      </TestIdScope.Provider>

      {ownsPlace && !included && !confirming && (
        <button
          onClick={openConfirm}
          data-testid="hub-cellular-toggle"
          className="text-sm text-peacock hover:underline"
        >
          {adding ? 'Add Cellular Backup' : 'Remove Cellular Backup'}
        </button>
      )}

      {confirming && (
        <div data-testid="hub-cellular-confirm" className="border-t border-heron pt-3 mt-1">
          {adding ? (
            <p className="text-sm text-grouse mb-3">
              Up to 7 days per month of continuous LTE service keeps you connected when your internet
              goes down. A 4G modem is required. The add-on is billed to your account.
            </p>
          ) : (
            <p className="text-sm text-grouse mb-3">
              During internet outages you will be unable to control your system remotely and will not
              receive important notifications about your home.
            </p>
          )}
          {adding && !hasCard ? (
            <p data-testid="hub-cellular-needs-billing" className="text-sm text-cardinal mb-3">
              Add a payment method to your account before adding Cellular Backup.
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              onClick={updatePlan}
              disabled={saving || (adding && !hasCard)}
              data-testid="hub-cellular-confirm-yes"
              className={`${adding ? 'bg-peacock' : 'bg-cardinal'} text-crane px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 disabled:opacity-50`}
            >
              {saving ? 'Saving...' : adding ? 'Confirm' : 'Yes, Remove'}
            </button>
            <button
              onClick={closeConfirm}
              disabled={saving}
              data-testid="hub-cellular-confirm-cancel"
              className="border border-heron text-swift px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm hover:bg-pigeon disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

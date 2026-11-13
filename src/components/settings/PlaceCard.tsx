'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Base, Place, Person as PersonCap } from '@arcus/core';
import type { Invitation } from '@arcus/core/services/types';
import { useSidePanel } from '@/components/SidePanel';
import InfoCard from './InfoCard';
import InfoRow from './InfoRow';
import PersonRow from './PersonRow';
import { formatRole, formatServiceLevel } from './settingsHelper';
import PlaceInfoPanel from './PlaceInfoPanel';
import PersonDetailPanel from './PersonDetailPanel';
import { type PlaceWithPeople } from './types';
import AddPersonPanel from './AddPersonPanel';
import CellularBackupRow from './CellularBackupRow';
import PendingInvitationRow from './PendingInvitationRow';
import CancelInvitationPanel from './CancelInvitationPanel';
import RemovePlacePanel from './RemovePlacePanel';

const OWNER = 'OWNER';

interface PlaceCardProps {
  place: PlaceWithPeople;
  isOwner: boolean;
  isActive: boolean;
  currentPersonId?: string;
  onRefresh: () => void;
}

export default function PlaceCard({
  place,
  isOwner,
  isActive,
  currentPersonId,
  onRefresh,
}: PlaceCardProps) {
  const { openRight } = useSidePanel();
  const placeData = place.placeData;
  const placeName = place.name || 'Unnamed Place';

  // Invitations and API keys act on THIS card's place, not the active place.
  // Keyed by place so another card's Invite opens a fresh form.
  const handleInvite = useCallback(() => {
    openRight(<AddPersonPanel placeId={place.placeId} placeName={placeName} onSent={onRefresh} />, {
      title: 'Invite a Person',
      key: `add-person:${place.placeId}`,
    });
  }, [openRight, place.placeId, placeName, onRefresh]);

  const handleCancelInvitation = useCallback((invitation: Invitation) => {
    openRight(
      <CancelInvitationPanel
        invitation={invitation}
        placeId={place.placeId}
        placeName={placeName}
        onCancelled={onRefresh}
      />,
      { title: 'Cancel Invitation', key: `cancel-invitation:${place.placeId}:${invitation.code}` },
    );
  }, [openRight, place.placeId, placeName, onRefresh]);

  const handleRemovePlace = useCallback(() => {
    openRight(<RemovePlacePanel placeId={place.placeId} placeName={placeName} onRemoved={onRefresh} />, {
      title: 'Remove Place',
      key: `remove-place:${place.placeId}`,
    });
  }, [openRight, place.placeId, placeName, onRefresh]);

  const address = placeData
    ? [
        placeData[Place.ATTR_STREETADDRESS1],
        placeData[Place.ATTR_CITY],
        placeData[Place.ATTR_STATEPROV],
        placeData[Place.ATTR_ZIPCODE],
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  const serviceLevel = placeData
    ? formatServiceLevel(placeData[Place.ATTR_SERVICELEVEL])
    : '—';

  // Filter out the current logged-in user from the people list
  const otherPeople = place.people.filter(
    ({ person }) => person[Base.ATTR_ID] !== currentPersonId,
  );

  // The primary place can't be deleted (as in the legacy client), and the
  // active place can't be deleted from under the session: switch away first.
  const removeHint = place.primary
    ? 'Your primary place can’t be removed.'
    : isActive
      ? 'Switch to another place to remove this one.'
      : null;

  const editAction = isOwner && placeData ? (
    <button
      onClick={() =>
        openRight(<PlaceInfoPanel placeData={placeData} onSaved={onRefresh} />, {
          title: 'Edit Place',
          key: `place-info:${place.placeId}`,
        })
      }
      data-testid={`place-edit-${place.placeId}`}
      className="text-sm text-peacock hover:underline"
    >
      Edit
    </button>
  ) : undefined;

  return (
    <div data-testid={`place-card-${place.placeId}`} data-active={isActive}>
    <InfoCard title={placeName} action={editAction} testId={`place-info-${place.placeId}`}>
      {address && <InfoRow label="Address" value={address} />}
      <InfoRow label="Service Level" value={serviceLevel} />
      {placeData && (
        <CellularBackupRow addons={placeData[Place.ATTR_SERVICEADDONS]} isActive={isActive} />
      )}
      <InfoRow label="Role" value={formatRole(place.role)} />
      {isActive && (
        <span data-testid={`place-active-${place.placeId}`} className="inline-block text-xs text-honeycreeper font-medium">Active Place</span>
      )}
      {isOwner && placeData && (
        <div className="flex justify-between text-sm pt-1">
          <span className="text-grouse">API Access</span>
          <Link
            href={`/settings/api-keys?placeId=${encodeURIComponent(place.placeId)}`}
            data-testid={`manage-api-keys-${place.placeId}`}
            className="text-peacock hover:underline"
          >
            Manage API Keys
          </Link>
        </div>
      )}

      {/* People subsection */}
      <div className="border-t border-heron mt-3 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-swift">People</span>
          {isOwner && (
            <button
              onClick={handleInvite}
              data-testid={`place-invite-${place.placeId}`}
              className="text-xs text-peacock hover:underline"
            >
              + Invite
            </button>
          )}
        </div>

        {otherPeople.length === 0 && place.invitations.length === 0 ? (
          <p data-testid={`place-no-people-${place.placeId}`} className="text-xs text-grouse">No other people at this place.</p>
        ) : (
          <div className="space-y-2">
            {otherPeople.map(({ person, role }) => {
              const personName =
                `${person[PersonCap.ATTR_FIRSTNAME] ?? ''} ${person[PersonCap.ATTR_LASTNAME] ?? ''}`.trim();
              const personEmail = person[PersonCap.ATTR_EMAIL] ?? '';
              const personId = person[Base.ATTR_ID] ?? person[Base.ATTR_ADDRESS];
              return (
                <PersonRow
                  key={person[Base.ATTR_ADDRESS]}
                  testId={`person-${place.placeId}-${personId}`}
                  name={personName || personEmail}
                  email={personName ? personEmail : ''}
                  role={role === OWNER ? 'Account Owner' : role ? formatRole(role) : undefined}
                  onEdit={
                    // The account owner can't be removed from their own place.
                    isOwner && role !== OWNER
                      ? () =>
                          openRight(
                            <PersonDetailPanel
                              person={person}
                              role={role}
                              placeId={place.placeId}
                              onRemoved={onRefresh}
                            />,
                            {
                              title: personName || personEmail || 'Person',
                              key: `person-detail:${place.placeId}:${person[Base.ATTR_ADDRESS]}`,
                            },
                          )
                      : undefined
                  }
                />
              );
            })}
            {place.invitations.map((invitation) => (
              <PendingInvitationRow
                key={invitation.code}
                testId={`invitation-${place.placeId}-${invitation.code}`}
                invitation={invitation}
                onCancel={isOwner ? handleCancelInvitation : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {isOwner && placeData && (
        <div className="border-t border-heron mt-3 pt-3 flex items-center justify-between text-sm">
          {removeHint ? (
            <p data-testid={`place-remove-hint-${place.placeId}`} className="text-xs text-grouse">{removeHint}</p>
          ) : (
            <button
              onClick={handleRemovePlace}
              data-testid={`place-remove-${place.placeId}`}
              className="text-sm text-cardinal hover:underline"
            >
              Remove Place
            </button>
          )}
        </div>
      )}
    </InfoCard>
    </div>
  );
}

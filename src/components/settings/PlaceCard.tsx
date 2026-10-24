'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Base, Place, Person as PersonCap } from '@arcus/core';
import { useSidePanel } from '@/components/SidePanel';
import InfoCard from './InfoCard';
import InfoRow from './InfoRow';
import PersonRow from './PersonRow';
import { formatRole, formatServiceLevel } from './settingsHelper';
import PlaceInfoPanel from './PlaceInfoPanel';
import PersonDetailPanel from './PersonDetailPanel';
import { type PlaceWithPeople } from './types';
import AddPersonPanel from './AddPersonPanel';

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
  const handleInvite = useCallback(() => {
    openRight(
      <AddPersonPanel
        placeId={place.placeId}
        placeName={placeName}
        onSent={onRefresh}
      />,
    );
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
    (p) => p[Base.ATTR_ID] !== currentPersonId,
  );

  const editAction = isOwner && placeData ? (
    <button
      onClick={() =>
        openRight(<PlaceInfoPanel placeData={placeData} onSaved={onRefresh} />)
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

        {otherPeople.length === 0 ? (
          <p data-testid={`place-no-people-${place.placeId}`} className="text-xs text-grouse">No other people at this place.</p>
        ) : (
          <div className="space-y-2">
            {otherPeople.map((person) => {
              const personName =
                `${person[PersonCap.ATTR_FIRSTNAME] ?? ''} ${person[PersonCap.ATTR_LASTNAME] ?? ''}`.trim();
              const personEmail = person[PersonCap.ATTR_EMAIL] ?? '';
              return (
                <PersonRow
                  key={person[Base.ATTR_ADDRESS]}
                  testId={`person-${place.placeId}-${person[Base.ATTR_ID] ?? person[Base.ATTR_ADDRESS]}`}
                  name={personName || personEmail}
                  email={personName ? personEmail : ''}
                  onEdit={
                    isOwner
                      ? () =>
                          openRight(
                            <PersonDetailPanel
                              person={person}
                              placeId={place.placeId}
                              onRemoved={onRefresh}
                            />,
                          )
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </InfoCard>
    </div>
  );
}

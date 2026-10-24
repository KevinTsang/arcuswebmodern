'use client';

/**
 * HomeFamilyView — presence subsystem showing people and device status.
 *
 * Replaces src/components/subsystem/home-family/. Shows who is home
 * or away and device presence counts.
 */

import { Person } from '@arcus/core';
import { useHomeFamilySubsystem } from '@/hooks/useHomeFamilySubsystem';
import type { PersonEntity } from '@/store/entityTypes';

export function HomeFamilyView() {
  const { peopleAtHome, peopleAway, devicesAtHomeCount, devicesAwayCount } =
    useHomeFamilySubsystem();

  const totalPeople = peopleAtHome.length + peopleAway.length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="flex gap-4">
        <div className="flex-1 bg-honeycreeper/5 rounded-[var(--border-radius-base)] p-4 text-center border border-honeycreeper/20">
          <div data-testid="presence-home-count" className="text-2xl font-light text-swift">{peopleAtHome.length}</div>
          <p className="text-xs text-grouse mt-1">People Home</p>
        </div>
        <div className="flex-1 bg-pigeon/50 rounded-[var(--border-radius-base)] p-4 text-center">
          <div data-testid="presence-away-count" className="text-2xl font-light text-swift">{peopleAway.length}</div>
          <p className="text-xs text-grouse mt-1">People Away</p>
        </div>
      </div>

      {/* People at home */}
      {peopleAtHome.length > 0 && (
        <PersonList title="At Home" people={peopleAtHome} status="home" />
      )}

      {/* People away */}
      {peopleAway.length > 0 && (
        <PersonList title="Away" people={peopleAway} status="away" />
      )}

      {/* Device counts */}
      {(devicesAtHomeCount > 0 || devicesAwayCount > 0) && (
        <div className="border-t border-heron pt-4">
          <h3 className="text-sm font-medium text-swift mb-3">Presence Devices</h3>
          <div className="flex gap-4 text-sm text-grouse">
            <span>{devicesAtHomeCount} at home</span>
            <span>{devicesAwayCount} away</span>
          </div>
        </div>
      )}

      {totalPeople === 0 && devicesAtHomeCount === 0 && devicesAwayCount === 0 && (
        <div className="text-center py-8">
          <p className="text-grouse">No presence devices or people configured.</p>
        </div>
      )}
    </div>
  );
}

function PersonList({
  title,
  people,
  status,
}: {
  title: string;
  people: PersonEntity[];
  status: 'home' | 'away';
}) {
  return (
    <div data-testid={`presence-list-${status}`}>
      <h3 className="text-sm font-medium text-swift mb-3">{title}</h3>
      <div className="space-y-2">
        {people.map((person) => {
          const name = (person[Person.ATTR_FIRSTNAME] ?? '') + ' ' + (person[Person.ATTR_LASTNAME] ?? '');
          const email = person[Person.ATTR_EMAIL] ?? '';
          return (
            <div
              key={person.id as string}
              data-testid={`presence-person-${person.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded border border-heron"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                status === 'home' ? 'bg-honeycreeper/10 text-honeycreeper' : 'bg-pigeon text-grouse'
              }`}>
                {(name.trim()[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-swift truncate">{name.trim() || email}</p>
              </div>
              <span className={`text-xs ${
                status === 'home' ? 'text-honeycreeper' : 'text-grouse'
              }`}>
                {status === 'home' ? 'Home' : 'Away'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

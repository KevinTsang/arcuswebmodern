'use client';

import { useAppSelector } from '@/store/hooks';
import { Person, Place } from '@arcus/core';
import { useSidePanel } from '@/components/SidePanel';
import InfoCard from './InfoCard';
import InfoRow from './InfoRow';
import { formatServiceLevel } from './settingsHelper';
import ContactInfoPanel from './ContactInfoPanel';
import ChangePasswordPanel from './ChangePasswordPanel';
import ChangePinPanel from './ChangePinPanel';

export default function ProfileSection() {
  const person = useAppSelector((s) => s.auth.person);
  const place = useAppSelector((s) => s.place.place);
  const { openRight } = useSidePanel();

  if (!person) {
    return <p className="text-grouse">Loading profile…</p>;
  }

  const firstName = person[Person.ATTR_FIRSTNAME] ?? '';
  const lastName = person[Person.ATTR_LASTNAME] ?? '';
  const email = person[Person.ATTR_EMAIL] ?? '';
  const phone = person[Person.ATTR_MOBILENUMBER] ?? '';
  const serviceLevel = place ? formatServiceLevel(place[Place.ATTR_SERVICELEVEL]) : '—';

  return (
    <div className="space-y-6">
      <InfoCard
        title="Contact Information"
        action={
          <button
            onClick={() => openRight(<ContactInfoPanel />)}
            className="text-sm text-peacock hover:underline"
          >
            Edit
          </button>
        }
      >
        <InfoRow label="Name" value={`${firstName} ${lastName}`.trim() || '—'} />
        <InfoRow label="Email" value={email || '—'} />
        <InfoRow label="Phone" value={phone || '—'} />
      </InfoCard>

      <InfoCard
        title="Password"
        action={
          <button
            onClick={() => openRight(<ChangePasswordPanel />)}
            className="text-sm text-peacock hover:underline"
          >
            Change
          </button>
        }
      >
        <InfoRow label="Password" value="••••••••" />
      </InfoCard>

      <InfoCard
        title="PIN Code"
        action={
          <button
            onClick={() => openRight(<ChangePinPanel />)}
            className="text-sm text-peacock hover:underline"
          >
            Change
          </button>
        }
      >
        <InfoRow label="PIN Code" value="••••" />
      </InfoCard>

      <InfoCard title="Service Plan">
        <InfoRow label="Current Plan" value={serviceLevel} />
      </InfoCard>
    </div>
  );
}

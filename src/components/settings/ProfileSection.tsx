'use client';

import { useAppSelector } from '@/store/hooks';
import { Base, Person, Place } from '@arcus/core';
import { useSidePanel } from '@/components/SidePanel';
import InfoCard from './InfoCard';
import InfoRow from './InfoRow';
import { formatServiceLevel } from './settingsHelper';
import { useOpenContactInfoPanel } from './useOpenContactInfoPanel';
import ChangePasswordPanel from './ChangePasswordPanel';
import ChangePinPanel from './ChangePinPanel';
import MobileDevicesCard from './MobileDevicesCard';

export default function ProfileSection() {
  const person = useAppSelector((s) => s.auth.person);
  const place = useAppSelector((s) => s.place.place);
  const { openRight } = useSidePanel();
  const openContactInfo = useOpenContactInfoPanel();

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
            onClick={openContactInfo}
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
            onClick={() => openRight(<ChangePasswordPanel />, { title: 'Change Password', key: 'change-password' })}
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
            onClick={() => openRight(<ChangePinPanel />, { title: 'Change PIN Code', key: 'change-pin' })}
            className="text-sm text-peacock hover:underline"
          >
            Change
          </button>
        }
      >
        <InfoRow label="PIN Code" value="••••" />
      </InfoCard>

      {person[Base.ATTR_ADDRESS] && <MobileDevicesCard personAddress={person[Base.ATTR_ADDRESS]} />}

      <InfoCard title="Service Plan">
        <InfoRow label="Current Plan" value={serviceLevel} />
      </InfoCard>
    </div>
  );
}

'use client';

/**
 * Settings page — three tabs: Profile, People & Places, Invitation Code.
 *
 * All section and panel components are in src/components/settings/.
 */

import { useState } from 'react';
import ProfileSection from '@/components/settings/ProfileSection';
import PeoplePlacesSection from '@/components/settings/PeoplePlacesSection';
import InvitationSection from '@/components/settings/InvitationSection';

type SettingsSection = 'profile' | 'people-places' | 'invitation';

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('profile');

  const sections: { key: SettingsSection; label: string; icon: string }[] = [
    { key: 'profile', label: 'Profile', icon: 'icon-app-user-1' },
    { key: 'people-places', label: 'People & Places', icon: 'icon-app-family-1' },
    { key: 'invitation', label: 'Invitation Code', icon: 'icon-app-envelope-1' },
  ];

  return (
    <div className="p-[var(--gutter)]">
      <div className="flex items-center justify-between mb-6">
        <h2 data-testid="settings-title" className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Settings
        </h2>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
        {sections.map((s) => (
          <button
            key={s.key}
            data-testid={`settings-tab-${s.key}`}
            onClick={() => setSection(s.key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
              section === s.key
                ? 'bg-crane text-swift shadow-sm'
                : 'text-grouse hover:text-coot'
            }`}
          >
            <span className={`${s.icon} text-sm`} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {section === 'profile' && <ProfileSection />}
      {section === 'people-places' && <PeoplePlacesSection />}
      {section === 'invitation' && <InvitationSection />}
    </div>
  );
}

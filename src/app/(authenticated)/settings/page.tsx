'use client';

/**
 * Settings page — ported from src/pages/settings/.
 *
 * Three sections: Profile, People & Places, Invitation Code.
 * Profile shows contact info, password change. People & Places
 * shows people at the current place. Invitation Code lets
 * users enter an invite code to join another place.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Bridge from '@arcus/core/bridge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllPeople } from '@/store/slices/peopleSlice';
import { addNotification } from '@/store/slices/uiSlice';
import { loginSuccess } from '@/store/slices/authSlice';
import { setPlace } from '@/store/slices/placeSlice';
import { useSidePanel } from '@/components/SidePanel';

type SettingsSection = 'profile' | 'people-places' | 'invitation';

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('profile');

  const sections: { key: SettingsSection; label: string; icon: string }[] = [
    { key: 'profile', label: 'Profile', icon: 'icon-app-user-1' },
    { key: 'people-places', label: 'People & Places', icon: 'icon-app-people' },
    { key: 'invitation', label: 'Invitation Code', icon: 'icon-app-mail' },
  ];

  return (
    <div className="p-[var(--gutter)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Settings
        </h2>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
        {sections.map((s) => (
          <button
            key={s.key}
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

/* ── Profile Section ────────────────────────────────────────────── */

function ProfileSection() {
  const person = useAppSelector((s) => s.auth.person);
  const account = useAppSelector((s) => s.auth.account);
  const place = useAppSelector((s) => s.place.place);
  const { openRight } = useSidePanel();

  if (!person) {
    return <p className="text-grouse">Loading profile…</p>;
  }

  const firstName = (person['person:firstName'] as string) ?? '';
  const lastName = (person['person:lastName'] as string) ?? '';
  const email = (person['person:email'] as string) ?? '';
  const phone = (person['person:mobileNumber'] as string) ?? '';
  const serviceLevel = place ? formatServiceLevel(place['place:serviceLevel'] as string) : '—';

  return (
    <div className="space-y-6">
      {/* Contact info */}
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

      {/* Password */}
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

      {/* Service plan */}
      <InfoCard title="Service Plan">
        <InfoRow label="Current Plan" value={serviceLevel} />
      </InfoCard>

      {/* Account info */}
      {account && (
        <InfoCard title="Account">
          <InfoRow label="Account State" value={String(account['account:state'] ?? '—')} />
        </InfoCard>
      )}
    </div>
  );
}

/* ── People & Places Section ────────────────────────────────────── */

function PeoplePlacesSection() {
  const people = useAppSelector(selectAllPeople);
  const place = useAppSelector((s) => s.place.place);
  const placeName = (place?.['place:name'] as string) ?? 'Your Home';
  const { openRight } = useSidePanel();

  return (
    <div className="space-y-6">
      {/* Place info */}
      <InfoCard
        title={placeName}
        action={
          <button
            onClick={() => openRight(<PlaceInfoPanel />)}
            className="text-sm text-peacock hover:underline"
          >
            Edit
          </button>
        }
      >
        {place && (
          <>
            <InfoRow
              label="Address"
              value={
                [
                  place['place:streetAddress1'] as string,
                  place['place:city'] as string,
                  place['place:stateProv'] as string,
                  place['place:zipCode'] as string,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
            />
            <InfoRow
              label="Service Level"
              value={formatServiceLevel(place['place:serviceLevel'] as string)}
            />
            <div className="flex justify-between text-sm pt-1">
              <span className="text-grouse">API Access</span>
              <Link
                href="/settings/api-keys"
                className="text-peacock hover:underline"
              >
                Manage API Keys
              </Link>
            </div>
          </>
        )}
      </InfoCard>

      {/* People at place */}
      <InfoCard title="People">
        {people.length === 0 ? (
          <p className="text-sm text-grouse">No people at this place.</p>
        ) : (
          <div className="space-y-2">
            {people.map((person) => {
              const name =
                `${(person['person:firstName'] as string) ?? ''} ${(person['person:lastName'] as string) ?? ''}`.trim();
              const email = (person['person:email'] as string) ?? '';
              return (
                <PersonRow
                  key={person.id}
                  name={name || email}
                  email={name ? email : ''}
                  onEdit={() => openRight(<PersonDetailPanel personAddress={person['base:address']} />)}
                />
              );
            })}
          </div>
        )}
      </InfoCard>
    </div>
  );
}

/* ── Invitation Section ─────────────────────────────────────────── */

function InvitationSection() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<Record<string, unknown> | null>(null);
  const dispatch = useAppDispatch();

  const handleLookup = useCallback(async () => {
    if (!code.trim() || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const resp = await Bridge.request('invite:GetInvitation', 'SERV:invite:', {
        code: code.trim(),
        inviteeEmail: email.trim(),
      });
      setInvitation(resp as Record<string, unknown>);
    } catch {
      setError(
        'Email and/or invitation code not recognized. Please check your email and invitation code and try again. Invitation codes expire after 7 days.',
      );
    } finally {
      setLoading(false);
    }
  }, [code, email]);

  const handleAccept = useCallback(async () => {
    if (!invitation) return;
    setLoading(true);
    setError('');
    try {
      await Bridge.request('invite:AcceptInvitationCreateLogin', 'SERV:invite:', {
        code: code.trim(),
        inviteeEmail: email.trim(),
      });
      dispatch(addNotification({ type: 'success', message: 'Invitation accepted!' }));
      setInvitation(null);
      setCode('');
      setEmail('');
    } catch {
      setError('Failed to accept the invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [invitation, code, email, dispatch]);

  return (
    <div className="max-w-md space-y-6">
      <InfoCard title="Enter Invitation Code">
        <p className="text-sm text-grouse mb-4">
          If you received an invitation to join someone&apos;s place, enter the code and email below.
        </p>

        {!invitation ? (
          <>
            <Field label="Invitation Code" value={code} onChange={setCode} placeholder="Enter code" />
            <Field label="Email Address" value={email} onChange={setEmail} type="email" placeholder="Email used for invitation" />
            {error && <p className="text-sm text-cardinal mt-2">{error}</p>}
            <button
              onClick={handleLookup}
              disabled={loading || !code.trim() || !email.trim()}
              className="mt-4 px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
            >
              {loading ? 'Looking up…' : 'Look Up Invitation'}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-honeycreeper/5 border border-honeycreeper/20 rounded-[var(--border-radius-base)] p-4">
              <p className="text-sm text-swift">
                You&apos;ve been invited to{' '}
                <strong>
                  {String(invitation['invitorFirstName'] ?? '')} {String(invitation['invitorLastName'] ?? '')}&apos;s
                </strong>{' '}
                place: <strong>{String(invitation['placeName'] ?? 'a place')}</strong>.
              </p>
            </div>
            {error && <p className="text-sm text-cardinal">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                {loading ? 'Accepting…' : 'Accept Invitation'}
              </button>
              <button
                onClick={() => {
                  setInvitation(null);
                  setCode('');
                  setEmail('');
                  setError('');
                }}
                className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </InfoCard>
    </div>
  );
}

/* ── Side Panels ────────────────────────────────────────────────── */

function ContactInfoPanel() {
  const person = useAppSelector((s) => s.auth.person);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [firstName, setFirstName] = useState((person?.['person:firstName'] as string) ?? '');
  const [lastName, setLastName] = useState((person?.['person:lastName'] as string) ?? '');
  const [phone, setPhone] = useState((person?.['person:mobileNumber'] as string) ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!person) return;
    setSaving(true);
    try {
      await Bridge.request('base:SetAttributes', person['base:address'] as string, {
        'person:firstName': firstName,
        'person:lastName': lastName,
        'person:mobileNumber': phone,
      });
      dispatch(
        loginSuccess({
          person: { ...person, 'person:firstName': firstName, 'person:lastName': lastName, 'person:mobileNumber': phone },
          account: {} as Record<string, unknown>,
        }),
      );
      dispatch(addNotification({ type: 'success', message: 'Contact info updated.' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update contact info.' }));
    } finally {
      setSaving(false);
    }
  }, [person, firstName, lastName, phone, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-swift">Edit Contact Info</h3>
      <Field label="First Name" value={firstName} onChange={setFirstName} />
      <Field label="Last Name" value={lastName} onChange={setLastName} />
      <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
      <p className="text-xs text-grouse">Email cannot be changed here.</p>
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ChangePasswordPanel() {
  const person = useAppSelector((s) => s.auth.person);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const email = (person?.['person:email'] as string) ?? '';

  const handleChange = useCallback(async () => {
    if (newPw !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await Bridge.request('person:ChangePassword', 'SERV:person:', {
        currentPassword: currentPw,
        newPassword: newPw,
        emailAddress: email,
      });
      dispatch(addNotification({ type: 'success', message: 'Password changed.' }));
      closeRight();
    } catch {
      setError('Failed to change password. Check your current password.');
    } finally {
      setSaving(false);
    }
  }, [currentPw, newPw, confirmPw, email, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-swift">Change Password</h3>
      <Field label="Current Password" value={currentPw} onChange={setCurrentPw} type="password" />
      <Field label="New Password" value={newPw} onChange={setNewPw} type="password" />
      <Field label="Confirm New Password" value={confirmPw} onChange={setConfirmPw} type="password" />
      {error && <p className="text-sm text-cardinal">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleChange}
          disabled={saving || !currentPw || !newPw || !confirmPw}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Changing…' : 'Change Password'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}

function PlaceInfoPanel() {
  const place = useAppSelector((s) => s.place.place);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [name, setName] = useState((place?.['place:name'] as string) ?? '');
  const [street1, setStreet1] = useState((place?.['place:streetAddress1'] as string) ?? '');
  const [street2, setStreet2] = useState((place?.['place:streetAddress2'] as string) ?? '');
  const [city, setCity] = useState((place?.['place:city'] as string) ?? '');
  const [stateProv, setStateProv] = useState((place?.['place:stateProv'] as string) ?? '');
  const [zip, setZip] = useState((place?.['place:zipCode'] as string) ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!place) return;
    setSaving(true);
    try {
      await Bridge.request('base:SetAttributes', place['base:address'] as string, {
        'place:name': name,
        'place:streetAddress1': street1,
        'place:streetAddress2': street2,
        'place:city': city,
        'place:stateProv': stateProv,
        'place:zipCode': zip,
      });
      dispatch(
        setPlace({
          ...place,
          'place:name': name,
          'place:streetAddress1': street1,
          'place:streetAddress2': street2,
          'place:city': city,
          'place:stateProv': stateProv,
          'place:zipCode': zip,
        }),
      );
      dispatch(addNotification({ type: 'success', message: 'Place info updated.' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update place info.' }));
    } finally {
      setSaving(false);
    }
  }, [place, name, street1, street2, city, stateProv, zip, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-swift">Edit Place</h3>
      <Field label="Place Name" value={name} onChange={setName} />
      <Field label="Street Address" value={street1} onChange={setStreet1} />
      <Field label="Street Address 2" value={street2} onChange={setStreet2} />
      <Field label="City" value={city} onChange={setCity} />
      <Field label="State" value={stateProv} onChange={setStateProv} />
      <Field label="ZIP Code" value={zip} onChange={setZip} />
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}

function PersonDetailPanel({ personAddress }: { personAddress: string }) {
  const person = useAppSelector((s) => selectAllPeople(s).find((p) => p['base:address'] === personAddress));
  const place = useAppSelector((s) => s.place.place);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const [removing, setRemoving] = useState(false);

  const handleRemove = useCallback(async () => {
    if (!person || !place) return;
    if (!window.confirm('Remove this person from the place?')) return;
    setRemoving(true);
    try {
      await Bridge.request('person:RemoveFromPlace', person['base:address'], {
        placeId: place['base:id'] as string,
      });
      dispatch(addNotification({ type: 'success', message: 'Person removed.' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to remove person.' }));
    } finally {
      setRemoving(false);
    }
  }, [person, place, dispatch, closeRight]);

  if (!person) return <div className="p-4 text-grouse">Person not found.</div>;

  const name =
    `${(person['person:firstName'] as string) ?? ''} ${(person['person:lastName'] as string) ?? ''}`.trim();
  const email = (person['person:email'] as string) ?? '';
  const phone = (person['person:mobileNumber'] as string) ?? '';

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-swift">{name || email || 'Person'}</h3>
      <InfoRow label="Name" value={name || '—'} />
      <InfoRow label="Email" value={email || '—'} />
      <InfoRow label="Phone" value={phone || '—'} />
      <div className="border-t border-heron pt-4">
        <button
          onClick={handleRemove}
          disabled={removing}
          className="text-sm text-cardinal hover:underline"
        >
          {removing ? 'Removing…' : 'Remove from Place'}
        </button>
      </div>
      <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
        Close
      </button>
    </div>
  );
}

/* ── Shared Components ──────────────────────────────────────────── */

function InfoCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-pigeon/30">
        <h3 className="text-sm font-medium text-swift">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-grouse">{label}</span>
      <span className="text-swift">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-grouse mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
      />
    </div>
  );
}

function PersonRow({
  name,
  email,
  onEdit,
}: {
  name: string;
  email: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded border border-heron">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-peacock/10 text-peacock flex items-center justify-center text-sm font-medium flex-shrink-0">
          {(name[0] ?? '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-swift truncate">{name}</p>
          {email && <p className="text-xs text-grouse truncate">{email}</p>}
        </div>
      </div>
      <button onClick={onEdit} className="text-xs text-peacock hover:underline flex-shrink-0">
        Details
      </button>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function formatServiceLevel(level: string | undefined | null): string {
  switch (level) {
    case 'BASIC':
      return 'Basic';
    case 'PREMIUM':
      return 'Premium';
    case 'PREMIUM_FREE':
      return 'Premium (Free)';
    case 'PREMIUM_PROMON':
      return 'Premium + Pro Monitoring';
    case 'PREMIUM_PROMON_FREE':
      return 'Premium + Pro Monitoring (Free)';
    case 'PREMIUM_PROMON_MYARCUS':
      return 'Premium + Pro Monitoring Annual';
    default:
      return level ?? '—';
  }
}

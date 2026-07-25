'use client';

/**
 * ProMonitoring page — ported from src/pages/promonitoring/.
 *
 * Professional monitoring enrollment and settings. Multi-step wizard:
 *   1. Address verification
 *   2. Alarm information
 *   3. Additional details (adults, children, pets, directions)
 *   4. Permit info
 *   5. Review & activate
 *   6. Connection test
 *   7. Welcome / complete
 *
 * Only accessible to place owners.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Bridge from '@arcus/core/bridge';
import { Base, Person, Place } from '@arcus/core';
import type { PromonSettingsResponse } from '@/arcus/types';
import { ProMonitoringService } from '@arcus/core/services';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

type ProMonStep = 'address' | 'alarms' | 'details' | 'permit' | 'review' | 'test' | 'welcome';

const STEPS: ProMonStep[] = ['address', 'alarms', 'details', 'permit', 'review', 'test', 'welcome'];
const STEP_LABELS: Record<ProMonStep, string> = {
  address: 'Address',
  alarms: 'Alarms',
  details: 'Details',
  permit: 'Permit',
  review: 'Review',
  test: 'Test',
  welcome: 'Complete',
};

const ALARM_TYPES = [
  { key: 'SECURITY', label: 'Security', icon: 'icon-platform-lock-1', description: 'Intruder detection' },
  { key: 'SMOKE', label: 'Smoke', icon: 'icon-app-flame', description: 'Smoke detector alerts' },
  { key: 'CO', label: 'Carbon Monoxide', icon: 'icon-platform-warning-1', description: 'CO detector alerts' },
  { key: 'PANIC', label: 'Panic', icon: 'icon-app-alarm-1', description: 'Emergency panic button' },
];

export default function ProMonitoringPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const place = useAppSelector((s) => s.place.place);
  const person = useAppSelector((s) => s.auth.person);

  const [step, setStep] = useState<ProMonStep>('address');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  // Form fields
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [directions, setDirections] = useState('');
  const [gateCode, setGateCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [permitNumber, setPermitNumber] = useState('');
  const [pin, setPin] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);

  // Load ProMonitoring settings
  useEffect(() => {
    if (!place) return;
    const placeAddr = place[Base.ATTR_ADDRESS] as string;
    ProMonitoringService.GetSettings(placeAddr)
      .then((resp) => {
        const s = resp as Record<string, unknown>;
        setSettings(s);
        // Populate form from existing settings
        if (s['promon:adults'] != null) setAdults(s['promon:adults'] as number);
        if (s['promon:children'] != null) setChildren(s['promon:children'] as number);
        if (s['promon:pets'] != null) setPets(s['promon:pets'] as number);
        if (s['promon:directions']) setDirections(s['promon:directions'] as string);
        if (s['promon:gateCode']) setGateCode(s['promon:gateCode'] as string);
        if (s['promon:instructions']) setInstructions(s['promon:instructions'] as string);
        if (s['promon:permitNumber']) setPermitNumber(s['promon:permitNumber'] as string);
      })
      .catch(() => {
        // Settings may not exist yet
      });
  }, [place]);

  const settingsAddr = settings?.[Base.ATTR_ADDRESS] as string | undefined;

  const saveSettings = useCallback(
    async (attrs: Record<string, unknown>) => {
      if (!settingsAddr) return;
      await Bridge.request(Base.CMD_SETATTRIBUTES, settingsAddr, attrs);
    },
    [settingsAddr],
  );

  // Step handlers
  const handleAddressNext = useCallback(() => {
    setStep('alarms');
  }, []);

  const handleAlarmsNext = useCallback(() => {
    setStep('details');
  }, []);

  const handleDetailsNext = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await saveSettings({
        'promon:adults': adults,
        'promon:children': children,
        'promon:pets': pets,
        'promon:directions': directions,
        'promon:gateCode': gateCode,
        'promon:instructions': instructions,
      });
      setStep('permit');
    } catch {
      setError('Failed to save details.');
    } finally {
      setLoading(false);
    }
  }, [adults, children, pets, directions, gateCode, instructions, saveSettings]);

  const handlePermitNext = useCallback(async () => {
    setLoading(true);
    try {
      if (permitNumber.trim()) {
        await saveSettings({ 'promon:permitNumber': permitNumber.trim() });
      }
      setStep('review');
    } catch {
      setError('Failed to save permit info.');
    } finally {
      setLoading(false);
    }
  }, [permitNumber, saveSettings]);

  const handleActivate = useCallback(async () => {
    if (pin.length < 4) {
      setError('Please enter your 4-digit PIN.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Verify PIN
      const personAddr = person?.[Base.ATTR_ADDRESS];
      const placeId = place?.[Base.ATTR_ID] as string;
      if (personAddr && placeId) {
        await Bridge.request(Person.CMD_VERIFYPIN, personAddr, { place: placeId, pin });
      }

      // Activate monitoring
      if (settingsAddr) {
        const serviceLevel = (place?.[Place.ATTR_SERVICELEVEL] as string) ?? 'PREMIUM_PROMON';
        await Bridge.request('promon:Activate', settingsAddr, {
          testCall: true,
          serviceLevel,
        });
      }
      setStep('test');
    } catch {
      setError('Invalid PIN or activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pin, person, place, settingsAddr]);

  const handleTestCall = useCallback(async () => {
    if (!settingsAddr) return;
    setLoading(true);
    setTestStatus('WAITING');
    try {
      await Bridge.request('promon:TestCall', settingsAddr, {});
      // Poll for test status
      const pollStatus = setInterval(async () => {
        try {
          const resp = await Bridge.request<PromonSettingsResponse>(Base.CMD_GETATTRIBUTES, settingsAddr, {});
          const status = resp['promon:testCallStatus'] ?? null;
          setTestStatus(status);
          if (status === 'SUCCEEDED' || status === 'FAILED') {
            clearInterval(pollStatus);
            setLoading(false);
            if (status === 'SUCCEEDED') {
              setStep('welcome');
            }
          }
        } catch {
          // Continue polling
        }
      }, 5000);
    } catch {
      setTestStatus('FAILED');
      setLoading(false);
    }
  }, [settingsAddr]);

  const handleFinish = useCallback(() => {
    router.push('/services');
  }, [router]);

  const placeName = place?.[Place.ATTR_NAME] ?? 'Your Home';
  const address = [
    place?.[Place.ATTR_STREETADDRESS1],
    place?.[Place.ATTR_CITY],
    place?.[Place.ATTR_STATEPROV],
    place?.[Place.ATTR_ZIPCODE],
  ].filter(Boolean).join(', ');

  return (
    <div className="p-[var(--gutter)]">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
            Professional Monitoring
          </h2>
          <p className="text-sm text-grouse mt-1">{placeName}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                  i < stepIndex
                    ? 'bg-honeycreeper text-crane'
                    : i === stepIndex
                      ? 'bg-peacock text-crane'
                      : 'bg-pigeon text-grouse'
                }`}
              >
                {i < stepIndex ? '\u2713' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-4 h-0.5 ${i < stepIndex ? 'bg-honeycreeper' : 'bg-pigeon'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="bg-crane border border-heron rounded-[var(--border-radius-lg)] p-6">
          <h3 className="text-lg font-semibold text-swift mb-1">{STEP_LABELS[step]}</h3>

          {error && (
            <div className="mb-4 text-cardinal text-sm bg-cardinal/5 border border-cardinal/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          {/* Step 1: Address */}
          {step === 'address' && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-grouse">
                Verify your home address for emergency dispatch.
              </p>
              <div className="bg-pigeon/30 rounded-[var(--border-radius-base)] p-4">
                <p className="text-sm text-swift">{address || 'No address on file'}</p>
              </div>
              <button
                onClick={handleAddressNext}
                className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
              >
                {address ? 'Address is Correct' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 2: Alarms */}
          {step === 'alarms' && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-grouse">
                The following alarm types will be professionally monitored.
              </p>
              <div className="space-y-2">
                {ALARM_TYPES.map((alarm) => (
                  <div key={alarm.key} className="flex items-center gap-3 p-3 border border-heron rounded-[var(--border-radius-base)]">
                    <span className={`${alarm.icon} text-lg text-peacock`} />
                    <div>
                      <p className="text-sm font-medium text-swift">{alarm.label}</p>
                      <p className="text-xs text-grouse">{alarm.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <StepNav onNext={handleAlarmsNext} onPrev={() => setStep('address')} />
            </div>
          )}

          {/* Step 3: Details */}
          {step === 'details' && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-grouse">
                Provide household details for emergency responders.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <NumberField label="Adults" value={adults} onChange={setAdults} min={1} />
                <NumberField label="Children" value={children} onChange={setChildren} />
                <NumberField label="Pets" value={pets} onChange={setPets} />
              </div>
              <TextField label="Directions to your home" value={directions} onChange={setDirections} multiline />
              <TextField label="Gate code (if applicable)" value={gateCode} onChange={setGateCode} />
              <TextField label="Special instructions" value={instructions} onChange={setInstructions} multiline />
              <StepNav onNext={handleDetailsNext} onPrev={() => setStep('alarms')} loading={loading} />
            </div>
          )}

          {/* Step 4: Permit */}
          {step === 'permit' && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-grouse">
                Some jurisdictions require an alarm permit. Enter your permit number if you have one.
              </p>
              <TextField label="Permit Number (optional)" value={permitNumber} onChange={setPermitNumber} />
              <StepNav onNext={handlePermitNext} onPrev={() => setStep('details')} loading={loading} nextLabel="Continue" />
            </div>
          )}

          {/* Step 5: Review & Activate */}
          {step === 'review' && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-grouse">
                Review your information and enter your PIN to activate professional monitoring.
              </p>
              <div className="space-y-2 bg-pigeon/30 rounded-[var(--border-radius-base)] p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-grouse">Address</span>
                  <span className="text-swift">{address || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-grouse">Household</span>
                  <span className="text-swift">{adults} adults, {children} children, {pets} pets</span>
                </div>
                {permitNumber && (
                  <div className="flex justify-between">
                    <span className="text-grouse">Permit</span>
                    <span className="text-swift">{permitNumber}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-swift mb-1">PIN Code</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your PIN"
                  className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
                />
              </div>
              <p className="text-xs text-grouse">
                By activating, you agree to the Professional Monitoring Terms of Service.
              </p>
              <StepNav
                onNext={handleActivate}
                onPrev={() => setStep('permit')}
                loading={loading}
                nextLabel="Activate Monitoring"
              />
            </div>
          )}

          {/* Step 6: Connection Test */}
          {step === 'test' && (
            <div className="space-y-4 mt-4 text-center">
              <p className="text-sm text-grouse">
                A test call will be placed to verify your monitoring connection.
              </p>
              {testStatus === 'SUCCEEDED' ? (
                <div className="text-honeycreeper font-medium">Test call successful!</div>
              ) : testStatus === 'FAILED' ? (
                <>
                  <div className="text-cardinal font-medium">Test call failed.</div>
                  <button
                    onClick={handleTestCall}
                    className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
                  >
                    Retry
                  </button>
                </>
              ) : testStatus === 'WAITING' ? (
                <>
                  <div className="animate-pulse">
                    <div className="w-16 h-16 bg-peacock/10 rounded-full flex items-center justify-center mx-auto">
                      <span className="icon-app-phone-1 text-2xl text-peacock" />
                    </div>
                  </div>
                  <p className="text-sm text-grouse">Waiting for test call…</p>
                  <p className="text-xs text-grouse">
                    You will receive a call from <strong>1-866-958-4450</strong>.
                  </p>
                </>
              ) : (
                <button
                  onClick={handleTestCall}
                  disabled={loading}
                  className="px-6 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
                >
                  Start Test Call
                </button>
              )}
              {testStatus === 'SUCCEEDED' && (
                <button
                  onClick={() => setStep('welcome')}
                  className="px-6 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
                >
                  Continue
                </button>
              )}
            </div>
          )}

          {/* Step 7: Welcome */}
          {step === 'welcome' && (
            <div className="space-y-4 mt-4 text-center py-4">
              <div className="text-4xl">&#128737;</div>
              <h3 className="text-xl font-semibold text-swift">Monitoring Active!</h3>
              <p className="text-sm text-grouse">
                Your home is now professionally monitored 24/7. In an emergency,
                our monitoring station will dispatch help automatically.
              </p>
              <div className="bg-pigeon/30 rounded-[var(--border-radius-base)] p-4 text-sm text-left">
                <p className="font-medium text-swift mb-1">Important:</p>
                <p className="text-grouse">
                  Save this number for your monitoring station: <strong>1-866-958-4450</strong>.
                  If you receive a call from this number, answer it — they are verifying an alarm event.
                </p>
              </div>
              <button
                onClick={handleFinish}
                className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ──────────────────────────────────────── */

function StepNav({
  onNext,
  onPrev,
  loading,
  nextLabel = 'Next',
}: {
  onNext: () => void;
  onPrev?: () => void;
  loading?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-2 pt-2">
      {onPrev && (
        <button
          onClick={onPrev}
          className="px-4 py-2.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={loading}
        className="flex-1 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
      >
        {loading ? 'Saving…' : nextLabel}
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const cls = "w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock";
  return (
    <div>
      <label className="block text-sm font-medium text-swift mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={cls} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-swift mb-1">{label}</label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
        className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
      />
    </div>
  );
}

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
 * Before the wizard, places that aren't monitored yet are checked with
 * promon:CheckAvailability: where only the trial group can sign up, a trial
 * code must be entered first (promon:JoinTrial). When yearly subscriptions are
 * enabled, the review step offers monthly or annual billing.
 *
 * Only accessible to place owners.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Bridge from '@arcus/core/bridge';
import { Base, Person, Place, ProMonitoringSettings } from '@arcus/core';
import type {
  PromonAvailabilityResponse,
  PromonGetSettingsResponse,
  PromonSettings,
  PromonSettingsResponse,
} from '@/arcus/types';
import { ProMonitoringService } from '@arcus/core/services';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { testIdSlug } from '@/lib/testId';
import { isYearlySubscriptionEnabled } from '@/lib/featureFlags';
import { ProMonTrialForm } from '@/components/promonitoring/ProMonTrialForm';
import { ProMonPlanSelector } from '@/components/promonitoring/ProMonPlanSelector';

/**
 * Whether this place can sign up: `checking` while settings and availability
 * load, `trial` when a trial code is needed first, `unavailable` when the
 * monitoring service doesn't cover the place.
 */
type Eligibility = 'checking' | 'eligible' | 'trial' | 'unavailable';

const PROMON_LEVELS: string[] = [
  Place.SERVICELEVEL_PREMIUM_PROMON,
  Place.SERVICELEVEL_PREMIUM_PROMON_FREE,
  Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL,
];
const ANNUAL_LEVELS: string[] = [Place.SERVICELEVEL_PREMIUM_ANNUAL, Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL];

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
  { key: 'PANIC', label: 'Panic', icon: 'icon-app-alarm-1', description: 'Panic raised from a keypad, pendant or rule' },
];

export default function ProMonitoringPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const place = useAppSelector((s) => s.place.place);
  const person = useAppSelector((s) => s.auth.person);

  const [step, setStep] = useState<ProMonStep>('address');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<PromonSettings | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility>('checking');
  const [yearlyEnabled] = useState(isYearlySubscriptionEnabled);
  const currentLevel = place?.[Place.ATTR_SERVICELEVEL] as string | undefined;
  const isPromon = !!currentLevel && PROMON_LEVELS.includes(currentLevel);
  const [annual, setAnnual] = useState(() => !!currentLevel && ANNUAL_LEVELS.includes(currentLevel));

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

  // Load ProMonitoring settings, then check whether this place can sign up
  const placeAddr = place?.[Base.ATTR_ADDRESS] as string | undefined;
  useEffect(() => {
    if (!placeAddr) return;
    let cancelled = false;
    const load = async () => {
      let s: PromonSettings;
      try {
        const resp = (await ProMonitoringService.GetSettings(placeAddr)) as PromonGetSettingsResponse;
        // The platform wraps the settings object in `settings`.
        s = resp.settings ?? resp;
      } catch {
        // Settings may not exist yet
        if (!cancelled) setEligibility('eligible');
        return;
      }
      if (cancelled) return;
      setSettings(s);
      // Populate form from existing settings
      const savedAdults = s[ProMonitoringSettings.ATTR_ADULTS];
      const savedChildren = s[ProMonitoringSettings.ATTR_CHILDREN];
      const savedPets = s[ProMonitoringSettings.ATTR_PETS];
      const savedDirections = s[ProMonitoringSettings.ATTR_DIRECTIONS];
      const savedGateCode = s[ProMonitoringSettings.ATTR_GATECODE];
      const savedInstructions = s[ProMonitoringSettings.ATTR_INSTRUCTIONS];
      const savedPermit = s[ProMonitoringSettings.ATTR_PERMITNUMBER];
      if (savedAdults != null) setAdults(savedAdults);
      if (savedChildren != null) setChildren(savedChildren);
      if (savedPets != null) setPets(savedPets);
      if (savedDirections) setDirections(savedDirections);
      if (savedGateCode) setGateCode(savedGateCode);
      if (savedInstructions) setInstructions(savedInstructions);
      if (savedPermit) setPermitNumber(savedPermit);

      // Like legacy, monitored places and trial members skip the availability check.
      const addr = s[Base.ATTR_ADDRESS];
      if (isPromon || s[ProMonitoringSettings.ATTR_TRIAL] || !addr) {
        setEligibility('eligible');
        return;
      }
      try {
        const { available } = await Bridge.request<PromonAvailabilityResponse>(
          ProMonitoringSettings.CMD_CHECKAVAILABILITY, addr, {},
        );
        if (cancelled) return;
        setEligibility(
          available === ProMonitoringSettings.AVAILABLE_FULL
            ? 'eligible'
            : available === ProMonitoringSettings.AVAILABLE_TRIAL
              ? 'trial'
              : 'unavailable',
        );
      } catch {
        if (cancelled) return;
        // Don't block signup on a failed check; activation is refused if it isn't available.
        dispatch(addNotification({ type: 'error', message: 'Could not check Professional Monitoring availability.' }));
        setEligibility('eligible');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [placeAddr, isPromon, dispatch]);

  const settingsAddr = settings?.[Base.ATTR_ADDRESS];

  const handleTrialJoined = useCallback(() => {
    setSettings((s) => (s ? { ...s, [ProMonitoringSettings.ATTR_TRIAL]: true } : s));
    setEligibility('eligible');
  }, []);

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
        [ProMonitoringSettings.ATTR_ADULTS]: adults,
        [ProMonitoringSettings.ATTR_CHILDREN]: children,
        [ProMonitoringSettings.ATTR_PETS]: pets,
        [ProMonitoringSettings.ATTR_DIRECTIONS]: directions,
        [ProMonitoringSettings.ATTR_GATECODE]: gateCode,
        [ProMonitoringSettings.ATTR_INSTRUCTIONS]: instructions,
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
        await saveSettings({ [ProMonitoringSettings.ATTR_PERMITNUMBER]: permitNumber.trim() });
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

      // Activate monitoring on the chosen plan; annual only when yearly plans are offered.
      if (settingsAddr) {
        const serviceLevel = yearlyEnabled && annual
          ? Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL
          : Place.SERVICELEVEL_PREMIUM_PROMON;
        await Bridge.request(ProMonitoringSettings.CMD_ACTIVATE, settingsAddr, {
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
  }, [pin, person, place, settingsAddr, yearlyEnabled, annual]);

  const handleTestCall = useCallback(async () => {
    if (!settingsAddr) return;
    setLoading(true);
    setTestStatus('WAITING');
    try {
      await Bridge.request(ProMonitoringSettings.CMD_TESTCALL, settingsAddr, {});
      // Poll for test status
      const pollStatus = setInterval(async () => {
        try {
          const resp = await Bridge.request<PromonSettingsResponse>(Base.CMD_GETATTRIBUTES, settingsAddr, {});
          const status = resp[ProMonitoringSettings.ATTR_TESTCALLSTATUS] ?? null;
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
          <h2 data-testid="promon-title" className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
            Professional Monitoring
          </h2>
          <p className="text-sm text-grouse mt-1">{placeName}</p>
        </div>

        {eligibility === 'checking' && (
          <p data-testid="promon-checking" className="text-sm text-grouse text-center">
            Checking availability…
          </p>
        )}

        {eligibility === 'unavailable' && (
          <div data-testid="promon-unavailable" className="bg-crane border border-heron rounded-[var(--border-radius-lg)] p-6 text-center space-y-2">
            <h3 className="text-lg font-semibold text-swift">Not Available Yet</h3>
            <p className="text-sm text-grouse">
              Professional Monitoring isn&apos;t available at this address yet.
            </p>
          </div>
        )}

        {eligibility === 'trial' && settingsAddr && (
          <div className="bg-crane border border-heron rounded-[var(--border-radius-lg)] p-6">
            <h3 data-testid="promon-step" data-step="trial" className="text-lg font-semibold text-swift mb-1">
              Professional Monitoring Code
            </h3>
            <ProMonTrialForm settingsAddress={settingsAddr} onJoined={handleTrialJoined} />
          </div>
        )}

        {eligibility === 'eligible' && (
          <>
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
              <h3 data-testid="promon-step" data-step={step} className="text-lg font-semibold text-swift mb-1">{STEP_LABELS[step]}</h3>

              {error && (
                <div data-testid="promon-error" className="mb-4 text-cardinal text-sm bg-cardinal/5 border border-cardinal/20 rounded px-3 py-2">
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
                    <p data-testid="promon-address" className="text-sm text-swift">{address || 'No address on file'}</p>
                  </div>
                  <button
                    onClick={handleAddressNext}
                    data-testid="promon-next"
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
                      <div key={alarm.key} data-testid={`promon-alarm-${alarm.key.toLowerCase()}`} className="flex items-center gap-3 p-3 border border-heron rounded-[var(--border-radius-base)]">
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
                      <span data-testid="promon-household" className="text-swift">{adults} adults, {children} children, {pets} pets</span>
                    </div>
                    {permitNumber && (
                      <div className="flex justify-between">
                        <span className="text-grouse">Permit</span>
                        <span data-testid="promon-permit-summary" className="text-swift">{permitNumber}</span>
                      </div>
                    )}
                  </div>
                  {yearlyEnabled && <ProMonPlanSelector annual={annual} onChange={setAnnual} disabled={loading} />}
                  <div>
                    <label className="block text-sm font-medium text-swift mb-1">PIN Code</label>
                    <input
                      type="password"
                      data-testid="promon-pin"
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
                    <div data-testid="promon-test-status" data-status="SUCCEEDED" className="text-honeycreeper font-medium">Test call successful!</div>
                  ) : testStatus === 'FAILED' ? (
                    <>
                      <div data-testid="promon-test-status" data-status="FAILED" className="text-cardinal font-medium">Test call failed.</div>
                      <button
                        onClick={handleTestCall}
                        data-testid="promon-test-retry"
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
                      <p data-testid="promon-test-status" data-status="WAITING" className="text-sm text-grouse">Waiting for test call…</p>
                      <p className="text-xs text-grouse">
                        You will receive a call from <strong>1-866-958-4450</strong>.
                      </p>
                    </>
                  ) : (
                    <button
                      onClick={handleTestCall}
                      data-testid="promon-test-call"
                      disabled={loading}
                      className="px-6 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
                    >
                      Start Test Call
                    </button>
                  )}
                  {testStatus === 'SUCCEEDED' && (
                    <button
                      onClick={() => setStep('welcome')}
                      data-testid="promon-test-continue"
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
                    data-testid="promon-done"
                    className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </>
        )}
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
          data-testid="promon-back"
          className="px-4 py-2.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Back
        </button>
      )}
      <button
        onClick={onNext}
        data-testid="promon-next"
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
  const testId = `promon-${testIdSlug(label)}`;
  return (
    <div>
      <label className="block text-sm font-medium text-swift mb-1">{label}</label>
      {multiline ? (
        <textarea data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={cls} />
      ) : (
        <input type="text" data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
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
        data-testid={`promon-${testIdSlug(label)}`}
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
        className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
      />
    </div>
  );
}

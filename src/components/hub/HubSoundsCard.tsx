'use client';

/**
 * HubSoundsCard — hub speaker volume (hubvol:volume) and a test sound
 * (hubsounds:PlayTone / hubsounds:Quiet).
 *
 * The volume is a writable hub attribute the agent persists; the store picks
 * up the new value from the hub's base:ValueChange.
 */

import { useCallback, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Hub, HubSounds, HubVolume } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import type { HubAdvancedAttributes } from './hubAdvancedTypes';

const VOLUME_LEVELS = [
  { value: HubVolume.VOLUME_OFF, label: 'Off' },
  { value: HubVolume.VOLUME_LOW, label: 'Low' },
  { value: HubVolume.VOLUME_MID, label: 'Medium' },
  { value: HubVolume.VOLUME_HIGH, label: 'High' },
];

/** How long the test tone plays, in seconds. */
export const TEST_TONE_DURATION_SEC = 3;

interface RequestedVolume {
  level: string;
  /** hubvol:volume when the change was sent. */
  from: string | undefined;
}

interface HubSoundsCardProps {
  hub: HubAdvancedAttributes;
}

export function HubSoundsCard({ hub }: HubSoundsCardProps) {
  const dispatch = useAppDispatch();
  /** The level last asked for, shown until the hub reports a different volume than it had then. */
  const [requested, setRequested] = useState<RequestedVolume | null>(null);
  const [savingVolume, setSavingVolume] = useState(false);
  const [toneBusy, setToneBusy] = useState(false);

  const address = hub[Base.ATTR_ADDRESS];
  const offline = hub[Hub.ATTR_STATE] === Hub.STATE_DOWN;
  const reportedVolume = hub[HubVolume.ATTR_VOLUME];
  const volume = requested && requested.from === reportedVolume ? requested.level : reportedVolume;
  const supported = reportedVolume !== undefined;
  const playing = hub[HubSounds.ATTR_PLAYING] === true;

  const setVolume = useCallback(async (level: string) => {
    setRequested({ level, from: reportedVolume });
    setSavingVolume(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, address, { [HubVolume.ATTR_VOLUME]: level });
    } catch {
      setRequested(null);
      dispatch(addNotification({ type: 'error', message: 'Failed to change hub volume' }));
    }
    setSavingVolume(false);
  }, [address, reportedVolume, dispatch]);

  const playTestTone = useCallback(async () => {
    setToneBusy(true);
    try {
      await Bridge.request(HubSounds.CMD_PLAYTONE, address, {
        tone: HubSounds.TONE_SUCCESS_SINGLE,
        durationSec: TEST_TONE_DURATION_SEC,
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to play a sound on the hub' }));
    }
    setToneBusy(false);
  }, [address, dispatch]);

  const quiet = useCallback(async () => {
    setToneBusy(true);
    try {
      await Bridge.request(HubSounds.CMD_QUIET, address, {});
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to stop the hub sound' }));
    }
    setToneBusy(false);
  }, [address, dispatch]);

  return (
    <section data-testid="hub-sounds" className="border border-heron rounded-[var(--border-radius-base)] p-4">
      <h3 data-testid="hub-sounds-title" className="text-sm font-medium text-swift mb-1">Hub Sounds</h3>
      <p className="text-xs text-grouse mb-3">
        Volume of the hub&apos;s speaker for alarms, chimes and status sounds.
      </p>

      {!supported ? (
        <p data-testid="hub-sounds-unsupported" className="text-sm text-grouse italic">
          This hub does not report a speaker volume.
        </p>
      ) : (
        <>
          {offline && (
            <p data-testid="hub-sounds-offline" className="text-xs text-cardinal mb-2">
              The hub is offline. Reconnect it to change its sounds.
            </p>
          )}
          <div role="radiogroup" aria-label="Hub volume" className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-3 w-fit">
            {VOLUME_LEVELS.map(({ value, label }) => {
              const selected = volume === value;
              return (
                <button
                  key={value}
                  role="radio"
                  aria-checked={selected}
                  data-testid={`hub-volume-${value.toLowerCase()}`}
                  data-selected={selected}
                  disabled={offline || savingVolume}
                  onClick={() => { if (!selected) void setVolume(value); }}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                    selected ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={playTestTone}
              disabled={offline || toneBusy}
              data-testid="hub-sounds-test"
              className="bg-peacock text-crane px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 disabled:opacity-50"
            >
              Play Test Sound
            </button>
            {playing && (
              <button
                onClick={quiet}
                disabled={offline || toneBusy}
                data-testid="hub-sounds-quiet"
                className="border border-heron text-swift px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm hover:bg-pigeon disabled:opacity-50"
              >
                Stop Sound
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

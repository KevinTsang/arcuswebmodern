'use client';

/**
 * S2PinPrompt — asks for a Z-Wave device's S2 PIN while it pairs.
 *
 * Client side of arcusplatform docs/zwave-s2-pin-pairing.md ("What a client
 * must do"):
 * - When `subpairing:s2PinRequestId` turns non-empty, read the DSK with
 *   `GetS2PinRequest` and show groups 2–8 for the user to check against the
 *   label, with a countdown to `expires`.
 * - Send `SubmitS2Pin` once, or `CancelS2Pin` if the user declines. Only
 *   `request.param.invalid` lets the user correct the PIN and send again; any
 *   other error spends the attempt.
 * - The request ID goes empty as soon as a PIN reaches the hub, so the prompt
 *   stays open until the `SubmitS2Pin` response, which carries the hub's
 *   error. Otherwise it closes when the ID goes empty.
 * - "Scan QR code" reads the PIN from the device's Z-Wave QR code and checks
 *   its DSK against the hub's before sending.
 *
 * The DSK and PIN are secrets: they live only in this component's state, are
 * never logged, and are dropped when the prompt closes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PairingSubsystem } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSecondsLeft } from '@/hooks/useSecondsLeft';
import { cameraUnavailableReason } from '@/lib/qrDecoder';
import { tryParseZWaveQrCode } from '@/lib/zwaveQr';
import type { ZWaveQrCode } from '@/lib/zwaveQr';
import {
  S2_PIN_INVALID_ERROR,
  S2_REQUEST_STATE_ERROR,
  dskGroups,
  dskTailsMatch,
  errorCode,
  formatCountdown,
  isValidDsk,
  isValidS2Pin,
} from '@/lib/zwaveS2';
import type { PlatformError, S2PinRequest } from '@/lib/zwaveS2';
import { QrScanner } from './QrScanner';
import { S2DskDisplay } from './S2DskDisplay';
import { S2PinEntryForm } from './S2PinEntryForm';
import { S2QrResult } from './S2QrResult';

type Phase =
  | 'loading'
  | 'entry'
  | 'confirmDecline'
  | 'scanning'
  | 'qrResult'
  | 'submitting'
  | 'cancelling'
  | 'spent';

/** Phases in which the user can still answer before `expires`. */
const ANSWERABLE: ReadonlySet<Phase> = new Set<Phase>(['entry', 'confirmDecline', 'scanning', 'qrResult']);

const INVALID_PIN = 'Enter the five-digit PIN, from 00000 to 65535.';
const NOT_ZWAVE_QR = "That isn't a Z-Wave QR code. Look for the code next to the DSK on the device or its box.";

const primary = 'flex-1 py-2 rounded-[var(--border-radius-base)] text-sm font-medium bg-peacock text-crane hover:bg-peacock/90';
const destructive = 'flex-1 py-2 rounded-[var(--border-radius-base)] text-sm font-medium bg-cardinal text-crane hover:bg-cardinal/90';
const secondary = 'flex-1 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon';

interface S2PinPromptProps {
  /** Address of the place's pairing subsystem. */
  pairingSubsystem: string;
}

export function S2PinPrompt({ pairingSubsystem }: S2PinPromptProps) {
  const dispatch = useAppDispatch();
  const requestId = useAppSelector((s) => {
    const value = s.subsystems.entities[pairingSubsystem]?.[PairingSubsystem.ATTR_S2PINREQUESTID];
    return typeof value === 'string' ? value : '';
  });

  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<S2PinRequest | null>(null);
  const [phase, setPhaseState] = useState<Phase>('loading');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [scanned, setScanned] = useState<ZWaveQrCode | null>(null);
  const [spentMessage, setSpentMessage] = useState('');

  /** The request the prompt is showing, for async work started before it changed. */
  const openIdRef = useRef<string | null>(null);
  /** Requests this prompt is done with, so a late value change can't reopen one. */
  const closedIdsRef = useRef<Set<string>>(new Set());
  /** A PIN or decline has been sent for the open request. */
  const answeredRef = useRef(false);
  const phaseRef = useRef<Phase>('loading');
  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const reset = useCallback(() => {
    setRequest(null);
    setPin('');
    setPinError(null);
    setNotice(null);
    setScanHint(null);
    setScanned(null);
    setSpentMessage('');
    answeredRef.current = false;
    setPhase('loading');
  }, [setPhase]);

  const close = useCallback(() => {
    if (openIdRef.current) closedIdsRef.current.add(openIdRef.current);
    openIdRef.current = null;
    setOpen(false);
    reset();
  }, [reset]);

  // Follow subpairing:s2PinRequestId.
  useEffect(() => {
    if (!requestId) {
      // Keep the prompt for the SubmitS2Pin response, or for its error.
      const waiting = phaseRef.current === 'submitting' || phaseRef.current === 'spent';
      if (openIdRef.current && !waiting) close();
      return;
    }
    if (requestId === openIdRef.current || closedIdsRef.current.has(requestId)) return;

    // A new request replaces whatever was open: the hub pairs one node at a time.
    openIdRef.current = requestId;
    reset();
    setOpen(true);
    (async () => {
      try {
        const resp = await Bridge.request<S2PinRequest>(PairingSubsystem.CMD_GETS2PINREQUEST, pairingSubsystem, {});
        if (openIdRef.current !== requestId) return;
        // A newer request: its value change will open it.
        if (resp.requestId !== requestId) return;
        if (!isValidDsk(resp.dsk)) throw new Error('Malformed DSK');
        setRequest(resp);
        setPhase('entry');
      } catch (e) {
        if (openIdRef.current !== requestId) return;
        if (errorCode(e as PlatformError) !== S2_REQUEST_STATE_ERROR) {
          dispatch(addNotification({ type: 'error', message: "Couldn't load the device's security key for S2 pairing." }));
        }
        close();
      }
    })();
  }, [requestId, pairingSubsystem, close, reset, setPhase, dispatch]);

  const secondsLeft = useSecondsLeft(request?.expires ?? null);
  const expired = secondsLeft === 0 && ANSWERABLE.has(phase);

  const submit = useCallback(async (value: string) => {
    const req = request;
    if (!req || answeredRef.current) return;
    if (!isValidS2Pin(value)) {
      setPinError(INVALID_PIN);
      setPhase('entry');
      return;
    }
    answeredRef.current = true;
    setPinError(null);
    setPhase('submitting');
    try {
      await Bridge.request(PairingSubsystem.CMD_SUBMITS2PIN, pairingSubsystem, { requestId: req.requestId, pin: value });
      if (openIdRef.current !== req.requestId) return;
      dispatch(addNotification({ type: 'success', message: 'PIN sent. The hub is finishing secure pairing.' }));
      close();
    } catch (e) {
      if (openIdRef.current !== req.requestId) return;
      const code = errorCode(e as PlatformError);
      if (code === S2_PIN_INVALID_ERROR) {
        // Nothing reached the hub: the request is still open.
        answeredRef.current = false;
        setPinError("The hub didn't accept that PIN. Check it and try again.");
        setPhase('entry');
        return;
      }
      setSpentMessage(
        code === S2_REQUEST_STATE_ERROR
          ? 'This PIN request had already ended, so the PIN was not used.'
          : "The hub didn't take the PIN.",
      );
      setPhase('spent');
      dispatch(addNotification({ type: 'error', message: 'Failed to send the S2 PIN.' }));
    }
  }, [request, pairingSubsystem, close, setPhase, dispatch]);

  const decline = useCallback(async () => {
    const req = request;
    if (!req || answeredRef.current) return;
    answeredRef.current = true;
    setPhase('cancelling');
    try {
      await Bridge.request(PairingSubsystem.CMD_CANCELS2PIN, pairingSubsystem, { requestId: req.requestId });
      if (openIdRef.current !== req.requestId) return;
      dispatch(addNotification({
        type: 'info',
        message: 'Secure pairing declined. Factory reset the device before pairing it again.',
      }));
      close();
    } catch (e) {
      if (openIdRef.current !== req.requestId) return;
      if (errorCode(e as PlatformError) === S2_REQUEST_STATE_ERROR) {
        // Already over: expired, answered or cancelled elsewhere.
        close();
        return;
      }
      answeredRef.current = false;
      dispatch(addNotification({ type: 'error', message: 'Failed to decline the S2 PIN request.' }));
      setPhase('entry');
    }
  }, [request, pairingSubsystem, close, setPhase, dispatch]);

  const handlePinChange = useCallback((value: string) => {
    setPin(value);
    setPinError(null);
  }, []);
  const handleSubmitTyped = useCallback(() => { void submit(pin); }, [submit, pin]);
  const handleSubmitScanned = useCallback(() => {
    if (scanned) void submit(scanned.pin);
  }, [submit, scanned]);
  const handleDecline = useCallback(() => { void decline(); }, [decline]);
  const askDecline = useCallback(() => setPhase('confirmDecline'), [setPhase]);
  const backToEntry = useCallback(() => {
    setScanned(null);
    setPhase('entry');
  }, [setPhase]);
  const startScan = useCallback(() => {
    setNotice(null);
    setScanHint(null);
    setScanned(null);
    setPhase('scanning');
  }, [setPhase]);

  const handleDetected = useCallback((text: string) => {
    const code = tryParseZWaveQrCode(text);
    if (!code) {
      setScanHint(NOT_ZWAVE_QR);
      return;
    }
    setScanned(code);
    setPhase('qrResult');
  }, [setPhase]);

  const handleCameraUnavailable = useCallback((message: string) => {
    setNotice(`${message} Type the PIN from the label instead.`);
    setPhase('entry');
  }, [setPhase]);

  if (!open) return null;

  const groups = request ? dskGroups(request.dsk) : [];
  const scanMatched = !!(scanned && request && dskTailsMatch(request.dsk, scanned.dsk));
  const cameraBlocked = cameraUnavailableReason();

  return (
    <div className="fixed inset-0 bg-swift/30 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="s2-pin-title"
        data-testid="s2-pin-prompt"
        data-phase={expired ? 'expired' : phase}
        className="bg-crane rounded-[var(--border-radius-lg)] border border-heron p-6 w-full max-w-md shadow-lg max-h-full overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 id="s2-pin-title" className="text-lg font-semibold text-swift">Secure this Z-Wave device</h3>
          {secondsLeft != null && ANSWERABLE.has(phase) && (
            <span
              data-testid="s2-pin-countdown"
              aria-label={`${secondsLeft} seconds left`}
              className={`font-mono text-sm ${secondsLeft <= 30 ? 'text-cardinal' : 'text-coot'}`}
            >
              {formatCountdown(secondsLeft)}
            </span>
          )}
        </div>

        {phase === 'loading' && (
          <p data-testid="s2-pin-loading" className="text-sm text-grouse">Loading the device&apos;s security key…</p>
        )}

        {expired && (
          <>
            <p data-testid="s2-pin-expired" className="text-sm text-coot mb-4">
              Time&apos;s up. The device will join without S2 security. Exclude or factory reset it,
              then pair it again to secure it.
            </p>
            <button type="button" data-testid="s2-pin-close" onClick={close} className={`${secondary} w-full`}>
              Close
            </button>
          </>
        )}

        {!expired && ANSWERABLE.has(phase) && request && (
          <>
            <p className="text-sm text-coot mb-3">
              Check that these numbers match the DSK printed on the device or its box. The first five
              digits on the label are the PIN.
            </p>
            <div className="mb-4">
              <S2DskDisplay groups={groups} matched={phase === 'qrResult' && scanMatched} />
            </div>
          </>
        )}

        {!expired && phase === 'entry' && request && (
          <>
            {notice && (
              <p data-testid="s2-pin-notice" role="status" className="text-sm text-coot bg-pigeon rounded-[var(--border-radius-base)] p-2 mb-3">
                {notice}
              </p>
            )}
            <S2PinEntryForm
              pin={pin}
              error={pinError}
              canScan={!cameraBlocked}
              onPinChange={handlePinChange}
              onSubmit={handleSubmitTyped}
              onScan={startScan}
              onDecline={askDecline}
            />
            {cameraBlocked && (
              <p data-testid="s2-pin-scan-unavailable" className="text-xs text-grouse mt-2">
                QR code scanning isn&apos;t available: {cameraBlocked}
              </p>
            )}
          </>
        )}

        {!expired && phase === 'scanning' && (
          <>
            <QrScanner onDetected={handleDetected} onUnavailable={handleCameraUnavailable} hint={scanHint} />
            <button type="button" data-testid="s2-pin-scan-cancel" onClick={backToEntry} className={`${secondary} w-full mt-3`}>
              Enter the PIN by hand
            </button>
          </>
        )}

        {!expired && phase === 'qrResult' && scanned && (
          <S2QrResult
            matched={scanMatched}
            pin={scanned.pin}
            onSubmit={handleSubmitScanned}
            onDecline={handleDecline}
            onScanAgain={startScan}
            onManual={backToEntry}
          />
        )}

        {!expired && phase === 'confirmDecline' && (
          <div data-testid="s2-pin-confirm-decline">
            <p className="text-sm text-swift mb-1">Decline secure pairing?</p>
            <p className="text-sm text-coot mb-4">
              If the numbers don&apos;t match, a different device may be joining. Declining stops the
              secure key exchange, and the device has to be factory reset before it can join securely.
            </p>
            <div className="flex gap-2">
              <button type="button" data-testid="s2-pin-decline-confirm" onClick={handleDecline} className={destructive}>
                Decline
              </button>
              <button type="button" data-testid="s2-pin-decline-back" onClick={backToEntry} className={secondary}>
                Back
              </button>
            </div>
          </div>
        )}

        {phase === 'submitting' && (
          <p data-testid="s2-pin-submitting" className="text-sm text-grouse">Sending the PIN to the hub…</p>
        )}

        {phase === 'cancelling' && (
          <p data-testid="s2-pin-cancelling" className="text-sm text-grouse">Declining…</p>
        )}

        {phase === 'spent' && (
          <>
            <p data-testid="s2-pin-spent" role="alert" className="text-sm text-coot mb-4">
              {spentMessage} There is only one try per pairing, so the device will join without S2
              security. Exclude or factory reset it, then pair it again to secure it.
            </p>
            <button type="button" data-testid="s2-pin-close" onClick={close} className={`${primary} w-full`}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

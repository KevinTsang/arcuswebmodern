'use client';

/**
 * QrScanner — live rear-camera view that reports QR codes it reads.
 *
 * Opens the camera on mount and always stops every track on unmount, so the
 * parent ends the scan by unmounting it. Reports each newly seen code text to
 * `onDetected`; the parent decides whether it is the code it wants. Calls
 * `onUnavailable` once, with a message, if the camera can't be used.
 *
 * Generic on purpose: the S2 PIN prompt uses it now, and a SmartStart
 * provisioning flow can use it later.
 */

import { useEffect, useRef, useState } from 'react';
import { cameraErrorMessage, cameraUnavailableReason, createQrDecoder } from '@/lib/qrDecoder';

/** How often a frame is checked for a QR code, in ms. */
export const QR_SCAN_INTERVAL = 250;

interface QrScannerProps {
  onDetected: (text: string) => void;
  onUnavailable: (message: string) => void;
  /** Shown under the camera view, e.g. "That isn't a Z-Wave QR code". */
  hint?: string | null;
}

export function QrScanner({ onDetected, onUnavailable, hint }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [starting, setStarting] = useState(true);
  // Latest callbacks, so the camera isn't restarted when the parent re-renders.
  const onDetectedRef = useRef(onDetected);
  const onUnavailableRef = useRef(onUnavailable);
  useEffect(() => {
    onDetectedRef.current = onDetected;
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    const video = videoRef.current;
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let lastText: string | null = null;

    const stopTracks = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };

    const unavailable = cameraUnavailableReason();
    if (unavailable) {
      onUnavailableRef.current(unavailable);
      return;
    }

    (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        if (video) {
          video.srcObject = media;
          await video.play().catch(() => {});
        }
        const decoder = await createQrDecoder();
        if (stopped) return;
        setStarting(false);

        let busy = false;
        timer = setInterval(async () => {
          const frame = video;
          if (busy || stopped || !frame || frame.readyState < 2) return;
          busy = true;
          try {
            const text = await decoder.detect(frame);
            if (!stopped && text && text !== lastText) {
              lastText = text;
              onDetectedRef.current(text);
            }
          } catch {
            // A frame that can't be read is skipped.
          } finally {
            busy = false;
          }
        }, QR_SCAN_INTERVAL);
      } catch (e) {
        stopTracks();
        if (!stopped) onUnavailableRef.current(cameraErrorMessage(e as { name?: string }));
      }
    })();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stopTracks();
      if (video) video.srcObject = null;
    };
  }, []);

  return (
    <div data-testid="qr-scanner">
      <div className="relative bg-swift rounded-[var(--border-radius-base)] overflow-hidden aspect-square max-h-72 mx-auto">
        <video
          ref={videoRef}
          data-testid="qr-scanner-video"
          className="w-full h-full object-cover"
          muted
          playsInline
          aria-label="Camera view"
        />
        <div className="absolute inset-8 border-2 border-crane/80 rounded-[var(--border-radius-base)] pointer-events-none" />
      </div>
      <p data-testid="qr-scanner-status" className="text-sm text-grouse mt-2 text-center" aria-live="polite">
        {hint ?? (starting ? 'Starting camera…' : 'Point the camera at the Z-Wave QR code on the device.')}
      </p>
    </div>
  );
}

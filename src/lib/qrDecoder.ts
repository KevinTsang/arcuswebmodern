/**
 * Reads QR codes from a playing <video>.
 *
 * Uses the browser's BarcodeDetector where it supports QR codes (Chrome on
 * Android and macOS, Safari 17+), otherwise jsQR on a canvas snapshot. jsQR
 * is loaded on first use, so pages that never scan don't download it.
 */

/** The part of the BarcodeDetector API used here (not in TypeScript's DOM lib yet). */
interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats(): Promise<string[]>;
}

interface WindowWithBarcodeDetector {
  BarcodeDetector?: BarcodeDetectorConstructor;
}

export interface QrDecoder {
  /** Which decoder is in use, for display and tests. */
  kind: 'native' | 'jsqr';
  /** The text of a QR code in the current frame, or null if there is none. */
  detect(video: HTMLVideoElement): Promise<string | null>;
}

async function nativeDecoder(): Promise<QrDecoder | null> {
  const Detector = (globalThis as WindowWithBarcodeDetector).BarcodeDetector;
  if (!Detector) return null;
  try {
    const formats = await Detector.getSupportedFormats();
    if (!formats.includes('qr_code')) return null;
    const detector = new Detector({ formats: ['qr_code'] });
    return {
      kind: 'native',
      async detect(video) {
        const codes = await detector.detect(video);
        return codes[0]?.rawValue ?? null;
      },
    };
  } catch {
    return null;
  }
}

async function jsqrDecoder(): Promise<QrDecoder> {
  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  return {
    kind: 'jsqr',
    async detect(video) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!context || !width || !height) return null;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      const image = context.getImageData(0, 0, width, height);
      return jsQR(image.data, width, height, { inversionAttempts: 'dontInvert' })?.data ?? null;
    },
  };
}

/** The best QR decoder this browser has. */
export async function createQrDecoder(): Promise<QrDecoder> {
  return (await nativeDecoder()) ?? jsqrDecoder();
}

/** Why the camera can't be used, as a message for the user. */
export function cameraErrorMessage(error: { name?: string } | null | undefined): string {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was denied.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found.';
    case 'NotReadableError':
      return 'The camera is in use by another app.';
    default:
      return "The camera couldn't be started.";
  }
}

/**
 * Null if this page can ask for the camera, otherwise why not. getUserMedia
 * exists only on secure origins (HTTPS or localhost).
 */
export function cameraUnavailableReason(): string | null {
  if (typeof window === 'undefined') return 'No camera is available.';
  if (!window.isSecureContext) return 'The camera needs a secure (HTTPS) connection.';
  if (!navigator.mediaDevices?.getUserMedia) return 'This browser has no camera access.';
  return null;
}

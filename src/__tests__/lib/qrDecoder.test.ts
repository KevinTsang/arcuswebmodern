import { cameraErrorMessage, cameraUnavailableReason, createQrDecoder } from '@/lib/qrDecoder';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockJsQR = jest.fn();
jest.mock('jsqr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockJsQR(...args),
}));

const mockDetect = jest.fn();
const mockGetSupportedFormats = jest.fn();

class FakeBarcodeDetector {
  static getSupportedFormats = () => mockGetSupportedFormats();
  constructor(public options: { formats: string[] }) {}
  detect(source: HTMLVideoElement) {
    return mockDetect(source);
  }
}

interface GlobalWithDetector {
  BarcodeDetector?: typeof FakeBarcodeDetector;
}

const globalWithDetector = globalThis as GlobalWithDetector;

// ── Helpers ───────────────────────────────────────────────────────────

function fakeVideo(width = 640, height = 480): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: width });
  Object.defineProperty(video, 'videoHeight', { value: height });
  return video;
}

const drawImage = jest.fn();
const getImageData = jest.fn(() => ({ data: new Uint8ClampedArray(4) }));

beforeEach(() => {
  jest.clearAllMocks();
  delete globalWithDetector.BarcodeDetector;
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    { drawImage, getImageData } as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  delete globalWithDetector.BarcodeDetector;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('createQrDecoder', () => {
  it('uses BarcodeDetector when it reads QR codes', async () => {
    globalWithDetector.BarcodeDetector = FakeBarcodeDetector;
    mockGetSupportedFormats.mockResolvedValue(['ean_13', 'qr_code']);
    mockDetect.mockResolvedValue([{ rawValue: '9001…' }]);

    const decoder = await createQrDecoder();
    const video = fakeVideo();

    expect(decoder.kind).toBe('native');
    await expect(decoder.detect(video)).resolves.toBe('9001…');
    expect(mockDetect).toHaveBeenCalledWith(video);
    expect(mockJsQR).not.toHaveBeenCalled();
  });

  it('returns null when BarcodeDetector sees no code', async () => {
    globalWithDetector.BarcodeDetector = FakeBarcodeDetector;
    mockGetSupportedFormats.mockResolvedValue(['qr_code']);
    mockDetect.mockResolvedValue([]);

    const decoder = await createQrDecoder();
    await expect(decoder.detect(fakeVideo())).resolves.toBeNull();
  });

  it('falls back to jsQR when BarcodeDetector lacks QR support', async () => {
    globalWithDetector.BarcodeDetector = FakeBarcodeDetector;
    mockGetSupportedFormats.mockResolvedValue(['ean_13']);
    expect((await createQrDecoder()).kind).toBe('jsqr');
  });

  it('falls back to jsQR when BarcodeDetector throws', async () => {
    globalWithDetector.BarcodeDetector = FakeBarcodeDetector;
    mockGetSupportedFormats.mockRejectedValue(new Error('unsupported'));
    expect((await createQrDecoder()).kind).toBe('jsqr');
  });

  it('decodes a video frame with jsQR when there is no BarcodeDetector', async () => {
    mockJsQR.mockReturnValue({ data: 'hello' });
    const decoder = await createQrDecoder();
    const video = fakeVideo(320, 240);

    expect(decoder.kind).toBe('jsqr');
    await expect(decoder.detect(video)).resolves.toBe('hello');
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 320, 240);
    expect(mockJsQR).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 320, 240, { inversionAttempts: 'dontInvert' });
  });

  it('returns null when jsQR finds nothing', async () => {
    mockJsQR.mockReturnValue(null);
    const decoder = await createQrDecoder();
    await expect(decoder.detect(fakeVideo())).resolves.toBeNull();
  });

  it('skips a video that has no frame yet', async () => {
    const decoder = await createQrDecoder();
    await expect(decoder.detect(fakeVideo(0, 0))).resolves.toBeNull();
    expect(mockJsQR).not.toHaveBeenCalled();
  });
});

describe('cameraErrorMessage', () => {
  it.each([
    ['NotAllowedError', 'Camera access was denied.'],
    ['SecurityError', 'Camera access was denied.'],
    ['NotFoundError', 'No camera was found.'],
    ['OverconstrainedError', 'No camera was found.'],
    ['NotReadableError', 'The camera is in use by another app.'],
    ['AbortError', "The camera couldn't be started."],
  ])('explains %s', (name, message) => {
    expect(cameraErrorMessage({ name })).toBe(message);
  });

  it('handles a missing error', () => {
    expect(cameraErrorMessage(undefined)).toBe("The camera couldn't be started.");
  });
});

describe('cameraUnavailableReason', () => {
  const originalSecure = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
  const originalMedia = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

  afterEach(() => {
    if (originalSecure) Object.defineProperty(window, 'isSecureContext', originalSecure);
    else delete (window as { isSecureContext?: boolean }).isSecureContext;
    if (originalMedia) Object.defineProperty(navigator, 'mediaDevices', originalMedia);
    else delete (navigator as { mediaDevices?: MediaDevices }).mediaDevices;
  });

  it('explains an insecure origin', () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    expect(cameraUnavailableReason()).toBe('The camera needs a secure (HTTPS) connection.');
  });

  it('explains a browser without getUserMedia', () => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    expect(cameraUnavailableReason()).toBe('This browser has no camera access.');
  });

  it('is null when the camera can be requested', () => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: jest.fn() }, configurable: true });
    expect(cameraUnavailableReason()).toBeNull();
  });
});

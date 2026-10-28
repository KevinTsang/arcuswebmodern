import { render, screen, fireEvent } from '@testing-library/react';
import { PairingDevice } from '@arcus/core';
import { DeviceRemoveProgress } from '@/components/devices/DeviceRemoveProgress';
import type { PairingStep } from '@/components/pairing/types';
import type { RemovalMode } from '@/arcus/types';

// ── Helpers ───────────────────────────────────────────────────────────

const STEPS: PairingStep[] = [
  { id: 'pair/remove1', order: 1, title: 'TIP: Have the device nearby', instructions: ['Press the button once.'] },
  { id: 'pair/remove2', order: 2, instructions: ['Wait for the LED to blink.', 'Then release.'] },
];

const onCancel = jest.fn();

interface ProgressOverrides {
  mode?: RemovalMode | null;
  hubMode?: boolean;
  steps?: PairingStep[];
  cancelling?: boolean;
}

function renderProgress({
  mode = PairingDevice.REMOVEMODE_HUB_MANUAL,
  hubMode = true,
  steps = STEPS,
  cancelling = false,
}: ProgressOverrides = {}) {
  return render(
    <DeviceRemoveProgress
      name="Front Door Lock"
      mode={mode}
      hubMode={hubMode}
      steps={steps}
      cancelling={cancelling}
      onCancel={onCancel}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceRemoveProgress – rendering', () => {
  it('matches snapshot', () => {
    const { container } = renderProgress();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for an automatic removal with no steps', () => {
    const { container } = renderProgress({ mode: PairingDevice.REMOVEMODE_HUB_AUTOMATIC, steps: [] });
    expect(container.firstChild).toMatchSnapshot();
  });

  it('exposes the stage', () => {
    renderProgress();
    expect(screen.getByTestId('device-remove-status')).toHaveAttribute('data-stage', 'removing');
  });

  it('shows each step with its instructions, numbered when there are several', () => {
    renderProgress();
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent('1Press the button once.');
    expect(screen.getByTestId('device-remove-step-1')).toHaveTextContent('2Wait for the LED to blink.Then release.');
  });

  it('does not number a single step', () => {
    renderProgress({ steps: [STEPS[0]] });
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent(/^Press the button once\.$/);
  });

  it('shows the first step title as a tip without its TIP: prefix', () => {
    renderProgress();
    expect(screen.getByTestId('device-remove-tip')).toHaveTextContent(/^Have the device nearby$/);
  });

  it('shows a title without a TIP: prefix as is', () => {
    renderProgress({ steps: [{ ...STEPS[0], title: 'Have the device nearby' }] });
    expect(screen.getByTestId('device-remove-tip')).toHaveTextContent(/^Have the device nearby$/);
  });

  it('falls back to the step info, then to the hub default message', () => {
    renderProgress({
      mode: PairingDevice.REMOVEMODE_HUB_AUTOMATIC,
      steps: [{ id: 'pair/remove0', order: 0, info: 'Hold the button.' }, { id: 'pair/remove1', order: 1 }],
    });
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent('Hold the button.');
    expect(screen.getByTestId('device-remove-step-1')).toHaveTextContent(
      'The hub will beep when the device is successfully removed.',
    );
  });

  it('does not mention the hub beeping for a cloud removal', () => {
    renderProgress({
      mode: PairingDevice.REMOVEMODE_CLOUD,
      hubMode: false,
      steps: [{ id: 'pair/remove0', order: 0 }],
    });
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent(/^This should only take a moment\.$/);
  });

  it('titles a manual removal with the device name and warns it may take minutes', () => {
    renderProgress();
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Remove Front Door Lock');
    expect(screen.getByText('This may take several minutes.')).toBeInTheDocument();
  });

  it('titles an automatic removal as in progress', () => {
    renderProgress({ mode: PairingDevice.REMOVEMODE_HUB_AUTOMATIC });
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Removing Device...');
    expect(screen.queryByText('This may take several minutes.')).not.toBeInTheDocument();
  });

  it('titles a removal with no mode with the device name', () => {
    renderProgress({ mode: null, hubMode: false, steps: [] });
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Remove Front Door Lock');
  });

  it('renders no tip or steps when the response had none', () => {
    renderProgress({ mode: PairingDevice.REMOVEMODE_CLOUD, hubMode: false, steps: [] });
    expect(screen.queryByTestId('device-remove-tip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('device-remove-step-0')).not.toBeInTheDocument();
  });
});

describe('DeviceRemoveProgress – abort', () => {
  it('cancels from the abort button', () => {
    renderProgress();
    fireEvent.click(screen.getByTestId('device-remove-abort'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('labels the abort button Close for a cloud removal', () => {
    renderProgress({ mode: PairingDevice.REMOVEMODE_CLOUD, hubMode: false });
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent('Close');
  });

  it('disables the abort button while cancelling', () => {
    renderProgress({ cancelling: true });
    expect(screen.getByTestId('device-remove-abort')).toBeDisabled();
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent('Cancelling...');
  });
});

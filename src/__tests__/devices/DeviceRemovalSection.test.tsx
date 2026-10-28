import { render, screen, fireEvent } from '@testing-library/react';
import { PairingDevice } from '@arcus/core';
import { DeviceRemovalSection } from '@/components/devices/DeviceRemovalSection';
import type { DeviceRemovalFlow, PairingStep, RemovalStage } from '@/components/pairing/types';

// ── Helpers ───────────────────────────────────────────────────────────

const STEPS: PairingStep[] = [
  { id: 'pair/remove1', order: 1, title: 'TIP: Have the device nearby', instructions: ['Press the button once.'] },
  { id: 'pair/remove2', order: 2, instructions: ['Wait for the LED to blink.', 'Then release.'] },
];

const HUB_MANUAL = { mode: PairingDevice.REMOVEMODE_HUB_MANUAL, hubMode: true } as const;
const HUB_AUTOMATIC = { mode: PairingDevice.REMOVEMODE_HUB_AUTOMATIC, hubMode: true } as const;
const CLOUD = { mode: PairingDevice.REMOVEMODE_CLOUD, hubMode: false } as const;

function makeRemoval(overrides: Partial<DeviceRemovalFlow> = {}): DeviceRemovalFlow {
  return {
    stage: 'idle',
    mode: null,
    hubMode: false,
    steps: [],
    cancelling: false,
    requestRemove: jest.fn(),
    dismissRemove: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    requestForceRemove: jest.fn(),
    dismissForceRemove: jest.fn(),
    forceRemove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderSection(overrides: Partial<DeviceRemovalFlow> = {}) {
  const removal = makeRemoval(overrides);
  const utils = render(<DeviceRemovalSection name="Front Door Lock" removal={removal} />);
  return { removal, ...utils };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceRemovalSection – snapshots', () => {
  it('matches snapshot', () => {
    const { container } = renderSection();
    expect(container.firstChild).toMatchSnapshot();
  });

  it.each<[RemovalStage, Partial<DeviceRemovalFlow>]>([
    ['confirm', {}],
    ['removing', { ...HUB_MANUAL, steps: STEPS }],
    ['timedOut', HUB_MANUAL],
    ['confirmForce', {}],
  ])('matches snapshot in the %s stage', (stage, overrides) => {
    const { container } = renderSection({ stage, ...overrides });
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('DeviceRemovalSection – confirmation', () => {
  it('starts the confirmation from Remove Device', () => {
    const { removal } = renderSection();
    fireEvent.click(screen.getByTestId('device-remove'));
    expect(removal.requestRemove).toHaveBeenCalled();
  });

  it('asks to confirm and removes on Yes, Remove', () => {
    const { removal } = renderSection({ stage: 'confirm' });
    expect(screen.getByText(/Are you sure you want to remove/)).toHaveTextContent('Front Door Lock');

    fireEvent.click(screen.getByTestId('device-remove-confirm'));
    expect(removal.remove).toHaveBeenCalled();
  });

  it('dismisses the confirmation on Cancel', () => {
    const { removal } = renderSection({ stage: 'confirm' });
    fireEvent.click(screen.getByTestId('device-remove-cancel'));
    expect(removal.dismissRemove).toHaveBeenCalled();
  });

  it('disables both buttons while dev:Remove is in flight', () => {
    renderSection({ stage: 'requesting' });
    expect(screen.getByTestId('device-remove-confirm')).toBeDisabled();
    expect(screen.getByTestId('device-remove-confirm')).toHaveTextContent('Removing...');
    expect(screen.getByTestId('device-remove-cancel')).toBeDisabled();
  });
});

describe('DeviceRemovalSection – removing', () => {
  it('shows each step with its instructions, numbered when there are several', () => {
    renderSection({ stage: 'removing', ...HUB_MANUAL, steps: STEPS });

    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent('1Press the button once.');
    expect(screen.getByTestId('device-remove-step-1')).toHaveTextContent('2Wait for the LED to blink.Then release.');
  });

  it('shows the first step title as a tip without its TIP: prefix', () => {
    renderSection({ stage: 'removing', ...HUB_MANUAL, steps: STEPS });
    expect(screen.getByTestId('device-remove-tip')).toHaveTextContent(/^Have the device nearby$/);
  });

  it('does not number a single step', () => {
    renderSection({ stage: 'removing', ...HUB_MANUAL, steps: [STEPS[0]] });
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent(/^Press the button once\.$/);
  });

  it('falls back to the step info, then to a default message', () => {
    renderSection({
      stage: 'removing',
      ...HUB_AUTOMATIC,
      steps: [{ id: 'pair/remove0', order: 0, info: 'Hold the button.' }, { id: 'pair/remove1', order: 1 }],
    });
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent('Hold the button.');
    expect(screen.getByTestId('device-remove-step-1')).toHaveTextContent(
      'The hub will beep when the device is successfully removed.',
    );
  });

  it('does not mention the hub beeping for a cloud removal', () => {
    renderSection({ stage: 'removing', ...CLOUD, steps: [{ id: 'pair/remove0', order: 0 }] });
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent(/^This should only take a moment\.$/);
  });

  it('titles a manual removal with the device name and warns it may take minutes', () => {
    renderSection({ stage: 'removing', ...HUB_MANUAL, steps: STEPS });
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Remove Front Door Lock');
    expect(screen.getByText('This may take several minutes.')).toBeInTheDocument();
  });

  it('titles an automatic removal as in progress', () => {
    renderSection({ stage: 'removing', ...HUB_AUTOMATIC });
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Removing Device...');
    expect(screen.queryByText('This may take several minutes.')).not.toBeInTheDocument();
  });

  it('renders no tip or steps when the response had none', () => {
    renderSection({ stage: 'removing', ...CLOUD });
    expect(screen.queryByTestId('device-remove-tip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('device-remove-step-0')).not.toBeInTheDocument();
  });

  it.each([
    ['a hub', true, 'Cancel'],
    ['a cloud', false, 'Close'],
  ])('labels the abort button for %s removal as %s', (_kind, hubMode, label) => {
    renderSection({ stage: 'removing', hubMode });
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent(label);
  });

  it('cancels the removal from the abort button', () => {
    const { removal } = renderSection({ stage: 'removing', ...HUB_MANUAL });
    fireEvent.click(screen.getByTestId('device-remove-abort'));
    expect(removal.cancel).toHaveBeenCalled();
  });

  it('disables the abort button while cancelling', () => {
    renderSection({ stage: 'removing', ...HUB_MANUAL, cancelling: true });
    expect(screen.getByTestId('device-remove-abort')).toBeDisabled();
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent('Cancelling...');
  });

  it('exposes the stage for tests', () => {
    renderSection({ stage: 'removing', ...HUB_MANUAL });
    expect(screen.getByTestId('device-remove-status')).toHaveAttribute('data-stage', 'removing');
  });
});

describe('DeviceRemovalSection – timed out', () => {
  it('reports the failure and offers Force Remove', () => {
    const { removal } = renderSection({ stage: 'timedOut', ...HUB_MANUAL });
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Removal was unsuccessful.');

    fireEvent.click(screen.getByTestId('device-force-remove'));
    expect(removal.requestForceRemove).toHaveBeenCalled();
    expect(removal.forceRemove).not.toHaveBeenCalled();
  });

  it('can still cancel', () => {
    const { removal } = renderSection({ stage: 'timedOut', ...HUB_MANUAL });
    fireEvent.click(screen.getByTestId('device-remove-abort'));
    expect(removal.cancel).toHaveBeenCalled();
  });
});

describe('DeviceRemovalSection – Force Remove confirmation', () => {
  it('warns that the device is not excluded from the network', () => {
    renderSection({ stage: 'confirmForce' });
    expect(screen.getByTestId('device-force-remove-warning')).toHaveTextContent(
      'Force Remove deletes Front Door Lock from your account without excluding it from the hub\'s network.',
    );
  });

  it('force removes on Yes, Force Remove', () => {
    const { removal } = renderSection({ stage: 'confirmForce' });
    fireEvent.click(screen.getByTestId('device-force-remove-confirm'));
    expect(removal.forceRemove).toHaveBeenCalled();
  });

  it('goes back on Back', () => {
    const { removal } = renderSection({ stage: 'confirmForce' });
    fireEvent.click(screen.getByTestId('device-force-remove-back'));
    expect(removal.dismissForceRemove).toHaveBeenCalled();
    expect(removal.forceRemove).not.toHaveBeenCalled();
  });

  it('disables both buttons while dev:ForceRemove is pending', () => {
    renderSection({ stage: 'forcing' });
    expect(screen.getByTestId('device-force-remove-confirm')).toBeDisabled();
    expect(screen.getByTestId('device-force-remove-confirm')).toHaveTextContent('Removing...');
    expect(screen.getByTestId('device-force-remove-back')).toBeDisabled();
  });
});

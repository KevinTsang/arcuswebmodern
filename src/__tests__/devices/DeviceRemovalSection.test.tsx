import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceRemovalSection } from '@/components/devices/DeviceRemovalSection';
import {
  RemovalMode,
  type DeviceRemovalFlow,
  type RemovalStage,
  type RemovalStep,
} from '@/hooks/useDeviceRemoval';

// ── Helpers ───────────────────────────────────────────────────────────

const STEPS: RemovalStep[] = [
  { id: 'pair/remove1', order: 1, title: 'TIP: Have the device nearby', instructions: ['Press the button once.'] },
  { id: 'pair/remove2', order: 2, instructions: ['Wait for the LED to blink.', 'Then release.'] },
];

function makeRemoval(overrides: Partial<DeviceRemovalFlow> = {}): DeviceRemovalFlow {
  return {
    stage: 'idle',
    mode: null,
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
    ['removing', { mode: RemovalMode.HUB_MANUAL, steps: STEPS }],
    ['timedOut', { mode: RemovalMode.HUB_MANUAL }],
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
    renderSection({ stage: 'removing', mode: RemovalMode.HUB_MANUAL, steps: STEPS });

    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent('1Press the button once.');
    expect(screen.getByTestId('device-remove-step-1')).toHaveTextContent('2Wait for the LED to blink.Then release.');
  });

  it('shows the first step title as a tip without its TIP: prefix', () => {
    renderSection({ stage: 'removing', mode: RemovalMode.HUB_MANUAL, steps: STEPS });
    expect(screen.getByTestId('device-remove-tip')).toHaveTextContent(/^Have the device nearby$/);
  });

  it('does not number a single step', () => {
    renderSection({ stage: 'removing', mode: RemovalMode.HUB_MANUAL, steps: [STEPS[0]] });
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent(/^Press the button once\.$/);
  });

  it('falls back to the step info, then to a default message', () => {
    renderSection({
      stage: 'removing',
      mode: RemovalMode.HUB_AUTOMATIC,
      steps: [{ info: 'This should only take a moment.' }, {}],
    });
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent('This should only take a moment.');
    expect(screen.getByTestId('device-remove-step-1')).toHaveTextContent(
      'The hub will beep when the device is successfully removed.',
    );
  });

  it('titles a manual removal with the device name and warns it may take minutes', () => {
    renderSection({ stage: 'removing', mode: RemovalMode.HUB_MANUAL, steps: STEPS });
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Remove Front Door Lock');
    expect(screen.getByText('This may take several minutes.')).toBeInTheDocument();
  });

  it('titles an automatic removal as in progress', () => {
    renderSection({ stage: 'removing', mode: RemovalMode.HUB_AUTOMATIC });
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Removing Device...');
    expect(screen.queryByText('This may take several minutes.')).not.toBeInTheDocument();
  });

  it('renders no tip or steps when the response had none', () => {
    renderSection({ stage: 'removing', mode: RemovalMode.CLOUD });
    expect(screen.queryByTestId('device-remove-tip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('device-remove-step-0')).not.toBeInTheDocument();
  });

  it.each([
    [RemovalMode.HUB_MANUAL, 'Cancel'],
    [RemovalMode.HUB_AUTOMATIC, 'Cancel'],
    [RemovalMode.CLOUD, 'Close'],
    [null, 'Close'],
  ])('labels the abort button for %s mode as %s', (mode, label) => {
    renderSection({ stage: 'removing', mode });
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent(label);
  });

  it('cancels the removal from the abort button', () => {
    const { removal } = renderSection({ stage: 'removing', mode: RemovalMode.HUB_MANUAL });
    fireEvent.click(screen.getByTestId('device-remove-abort'));
    expect(removal.cancel).toHaveBeenCalled();
  });

  it('disables the abort button while cancelling', () => {
    renderSection({ stage: 'removing', mode: RemovalMode.HUB_MANUAL, cancelling: true });
    expect(screen.getByTestId('device-remove-abort')).toBeDisabled();
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent('Cancelling...');
  });

  it('exposes the stage for tests', () => {
    renderSection({ stage: 'removing', mode: RemovalMode.HUB_MANUAL });
    expect(screen.getByTestId('device-remove-status')).toHaveAttribute('data-stage', 'removing');
  });
});

describe('DeviceRemovalSection – timed out', () => {
  it('reports the failure and offers Force Remove', () => {
    const { removal } = renderSection({ stage: 'timedOut', mode: RemovalMode.HUB_MANUAL });
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Removal was unsuccessful.');

    fireEvent.click(screen.getByTestId('device-force-remove'));
    expect(removal.requestForceRemove).toHaveBeenCalled();
    expect(removal.forceRemove).not.toHaveBeenCalled();
  });

  it('can still cancel', () => {
    const { removal } = renderSection({ stage: 'timedOut', mode: RemovalMode.HUB_MANUAL });
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

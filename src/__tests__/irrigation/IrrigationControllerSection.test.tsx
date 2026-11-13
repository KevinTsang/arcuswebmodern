import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { IrrigationScheduleMode } from '@arcus/core';
import { IrrigationControllerSection } from '@/components/irrigation/IrrigationControllerSection';
import { IrrigationSchedulePanel } from '@/components/irrigation/IrrigationSchedulePanel';
import type { IrrigationControllerState } from '@/hooks/useIrrigationController';
import { CONTROLLER, makeIrrigationState } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
let mockState: IrrigationControllerState;

jest.mock('@/hooks/useIrrigationController', () => ({
  useIrrigationController: () => mockState,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/components/devices/DevicePanel', () => ({
  DevicePanel: ({ address }: { address: string }) => <div data-testid={`device-panel-${address}`} />,
}));

jest.mock('@/components/irrigation/IrrigationZoneList', () => ({
  IrrigationZoneList: ({ address }: { address: string }) => <ul data-testid={`zone-list-stub-${address}`} />,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function status() {
  return screen.getByTestId(`irrigation-schedule-status-${CONTROLLER}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState = makeIrrigationState();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('IrrigationControllerSection', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<IrrigationControllerSection address={CONTROLLER} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders the device row and zones', () => {
    render(<IrrigationControllerSection address={CONTROLLER} />);
    expect(screen.getByTestId(`device-panel-${CONTROLLER}`)).toBeInTheDocument();
    expect(screen.getByTestId(`zone-list-stub-${CONTROLLER}`)).toBeInTheDocument();
  });

  it('describes manual watering', () => {
    render(<IrrigationControllerSection address={CONTROLLER} />);
    expect(status()).toHaveTextContent('Manual watering (no schedule)');
  });

  it('describes the active schedule and a skip', () => {
    const until = new Date(2026, 5, 1, 8, 0).getTime();
    mockState = makeIrrigationState({ activeMode: IrrigationScheduleMode.INTERVAL, skippedUntil: until });
    render(<IrrigationControllerSection address={CONTROLLER} />);
    expect(status()).toHaveTextContent(`Interval schedule · Skipped until ${new Date(until).toLocaleString()}`);
  });

  it('opens the schedule panel', () => {
    render(<IrrigationControllerSection address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId(`irrigation-open-schedule-${CONTROLLER}`));
    const panel: ReactElement = mockOpenRight.mock.calls[0][0];
    expect(panel.type).toBe(IrrigationSchedulePanel);
    expect(mockOpenRight.mock.calls[0][1]).toEqual({ title: 'Watering Schedule', key: `irrigation-schedule:${CONTROLLER}` });
  });
});

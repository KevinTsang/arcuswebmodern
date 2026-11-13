import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { CareSubsystem } from '@arcus/core';
import { CareBehaviors } from '@/components/subsystems/CareBehaviors';
import type { CareBehaviorsState } from '@/hooks/useCareBehaviors';
import { newBehaviorFrom } from '@/lib/careBehaviors';
import {
  CARE_ADDR, CURFEW_TEMPLATE, INACTIVITY_TEMPLATE, makeCareBehavior,
} from '../helpers/careBehaviorFixtures';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
const mockOpenRight = jest.fn();
const mockReload = jest.fn();
let mockState: CareBehaviorsState;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/hooks/useCareBehaviors', () => ({
  useCareBehaviors: () => mockState,
}));

jest.mock('@/components/subsystems/CareBehaviorEditor', () => ({
  CareBehaviorEditor: () => <div data-testid="care-behavior-editor" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const MORNING = makeCareBehavior();
const NIGHT = makeCareBehavior({ id: 'behavior-2', name: 'Night wandering', enabled: false, templateId: '6' });

function state(overrides: Partial<CareBehaviorsState> = {}): CareBehaviorsState {
  return {
    address: CARE_ADDR,
    behaviors: [MORNING, NIGHT],
    templates: [INACTIVITY_TEMPLATE, CURFEW_TEMPLATE],
    loading: false,
    error: false,
    reload: mockReload,
    ...overrides,
  };
}

/** Props of the editor element passed to `openRight` on its `n`th call. */
function openedEditor(n = 0) {
  const [element, options] = mockOpenRight.mock.calls[n] as [ReactElement<Record<string, unknown>>, { title: string; key: string }];
  return { props: element.props, options };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState = state();
  mockBridgeRequest.mockResolvedValue({});
  mockReload.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviors', () => {
  describe('rendering', () => {
    it('matches snapshot', () => {
      const { asFragment } = render(<CareBehaviors />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot for the empty state', () => {
      mockState = state({ behaviors: [] });
      const { asFragment } = render(<CareBehaviors />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('lists each behavior with its enabled state', () => {
      render(<CareBehaviors />);
      expect(screen.getByTestId('care-behaviors-title')).toHaveTextContent('My Care Behaviors');
      expect(screen.getByTestId('care-behavior-row-behavior-1')).toHaveAttribute('data-enabled', 'true');
      expect(screen.getByTestId('care-behavior-row-behavior-2')).toHaveAttribute('data-enabled', 'false');
    });

    it('shows a loading message before the first load', () => {
      mockState = state({ behaviors: [], loading: true });
      render(<CareBehaviors />);
      expect(screen.getByTestId('care-behaviors-loading')).toHaveTextContent('Loading behaviors…');
    });

    it('explains when there is no care subsystem', () => {
      mockState = state({ address: undefined, behaviors: [], loading: true });
      render(<CareBehaviors />);
      expect(screen.getByTestId('care-behaviors-loading')).toHaveTextContent('Care is not available for this place.');
      expect(screen.getByTestId('care-behavior-add')).toBeDisabled();
    });

    it('offers a retry when loading fails', () => {
      mockState = state({ behaviors: [], error: true });
      render(<CareBehaviors />);
      fireEvent.click(screen.getByTestId('care-behaviors-retry'));
      expect(mockReload).toHaveBeenCalled();
    });

    it('shows the empty state', () => {
      mockState = state({ behaviors: [] });
      render(<CareBehaviors />);
      expect(screen.getByTestId('care-behaviors-empty')).toHaveTextContent('No behaviors configured.');
    });
  });

  describe('enable/disable', () => {
    it('updates the behavior with the new enabled state and reloads', async () => {
      render(<CareBehaviors />);
      fireEvent.click(screen.getByTestId('care-behavior-toggle-behavior-1'));

      expect(screen.getByTestId('care-behavior-toggle-behavior-1')).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByTestId('care-behavior-toggle-behavior-1')).toBeDisabled();
      await waitFor(() => expect(mockReload).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledWith(CareSubsystem.CMD_UPDATEBEHAVIOR, CARE_ADDR, {
        behavior: { ...MORNING, enabled: false },
      });
      await waitFor(() => expect(screen.getByTestId('care-behavior-toggle-behavior-1')).toBeEnabled());
    });

    it('enables a disabled behavior', async () => {
      render(<CareBehaviors />);
      fireEvent.click(screen.getByTestId('care-behavior-toggle-behavior-2'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(CareSubsystem.CMD_UPDATEBEHAVIOR, CARE_ADDR, {
        behavior: { ...NIGHT, enabled: true },
      }));
    });

    it('reverts and reports a failed toggle', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<CareBehaviors />);
      fireEvent.click(screen.getByTestId('care-behavior-toggle-behavior-1'));

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: "Failed to disable 'Morning activity'" },
      }));
      expect(screen.getByTestId('care-behavior-toggle-behavior-1')).toHaveAttribute('aria-checked', 'true');
      expect(mockReload).not.toHaveBeenCalled();
    });

    it('ignores a behavior without an id', () => {
      mockState = state({ behaviors: [{ name: 'Orphan', templateId: '1' }] });
      render(<CareBehaviors />);
      fireEvent.click(screen.getByTestId('care-behavior-toggle-'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('editing', () => {
    it('opens the editor for a behavior with its template', () => {
      render(<CareBehaviors />);
      fireEvent.click(screen.getByTestId('care-behavior-edit-behavior-1'));

      const { props, options } = openedEditor();
      expect(options).toEqual({ title: 'Edit Care Behavior', key: 'care-behavior:behavior-1' });
      expect(props).toMatchObject({ address: CARE_ADDR, template: INACTIVITY_TEMPLATE, behavior: MORNING, onSaved: mockReload });
    });
  });

  describe('library', () => {
    it('toggles the template library', () => {
      render(<CareBehaviors />);
      fireEvent.click(screen.getByTestId('care-behavior-add'));
      expect(screen.getByTestId('care-behavior-library')).toBeInTheDocument();
      expect(screen.getByTestId('care-behavior-add')).toHaveTextContent('Close Library');

      fireEvent.click(screen.getByTestId('care-behavior-add'));
      expect(screen.queryByTestId('care-behavior-library')).not.toBeInTheDocument();
    });

    it('opens a pre-filled editor for an available template and closes the library', () => {
      render(<CareBehaviors />);
      fireEvent.click(screen.getByTestId('care-behavior-add'));
      fireEvent.click(screen.getByTestId('care-template-1'));

      const { props, options } = openedEditor();
      expect(options).toEqual({ title: 'Add Care Behavior', key: 'care-behavior:new:1' });
      expect(props).toMatchObject({ template: INACTIVITY_TEMPLATE, behavior: newBehaviorFrom(INACTIVITY_TEMPLATE) });
      expect(screen.queryByTestId('care-behavior-library')).not.toBeInTheDocument();
    });

    it('opens a read-only preview for an unavailable template', () => {
      render(<CareBehaviors />);
      fireEvent.click(screen.getByTestId('care-behavior-add'));
      fireEvent.click(screen.getByTestId('care-template-6'));

      const { props, options } = openedEditor();
      expect(options).toEqual({ title: 'Curfew', key: 'care-behavior:preview:6' });
      expect(props).toMatchObject({ template: CURFEW_TEMPLATE, readOnly: true });
      expect(screen.getByTestId('care-behavior-library')).toBeInTheDocument();
    });
  });
});

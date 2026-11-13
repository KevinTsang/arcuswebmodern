import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CareSubsystem, Device } from '@arcus/core';
import { CareBehaviorEditor } from '@/components/subsystems/CareBehaviorEditor';
import { newBehaviorFrom } from '@/lib/careBehaviors';
import type { CareBehavior } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';
import {
  CARE_ADDR, CURFEW_TEMPLATE, DOOR_ADDR, INACTIVITY_TEMPLATE, MOTION_ADDR, makeCareBehavior,
} from '../helpers/careBehaviorFixtures';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
const mockCloseRight = jest.fn();
const mockDevices = [makeDevice(MOTION_ADDR, { [Device.ATTR_NAME]: 'Hall Motion' })];

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: () => mockDevices,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: jest.fn(),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const onSaved = jest.fn();
const EXISTING = makeCareBehavior();

function renderEditor(props: Partial<Parameters<typeof CareBehaviorEditor>[0]> = {}) {
  return render(
    <CareBehaviorEditor address={CARE_ADDR} template={INACTIVITY_TEMPLATE} behavior={EXISTING} onSaved={onSaved} {...props} />,
  );
}

const notification = (type: string, message: string) => ({ type: 'ui/addNotification', payload: { type, message } });

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviorEditor', () => {
  describe('rendering', () => {
    it('matches snapshot for an existing behavior', () => {
      const { asFragment } = renderEditor();
      expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot for a read-only template preview', () => {
      const { asFragment } = renderEditor({ template: CURFEW_TEMPLATE, behavior: undefined, readOnly: true });
      expect(asFragment()).toMatchSnapshot();
    });

    it('shows the name, description and a section per template field', () => {
      renderEditor();
      expect(screen.getByTestId('care-editor-name')).toHaveValue('Morning activity');
      expect(screen.getByTestId('care-editor-description')).toHaveTextContent('Trigger an alarm if no activity occurs.');
      expect(screen.getByTestId('care-section-status-devices')).toHaveTextContent('1 Device');
      expect(screen.getByTestId('care-section-status-duration')).toHaveTextContent('30 Minutes');
      expect(screen.getByTestId('care-section-status-timeWindows')).toHaveTextContent('24/7');
      expect(screen.getByTestId('care-editor-remove')).toBeInTheDocument();
      expect(screen.getByTestId('care-editor-save')).toBeEnabled();
    });

    it('hides Remove for a new behavior', () => {
      renderEditor({ behavior: newBehaviorFrom(INACTIVITY_TEMPLATE) });
      expect(screen.queryByTestId('care-editor-remove')).not.toBeInTheDocument();
    });

    it('shows a read-only preview without inputs', () => {
      renderEditor({ template: CURFEW_TEMPLATE, behavior: undefined, readOnly: true });
      expect(screen.getByTestId('care-editor-unavailable')).toBeInTheDocument();
      expect(screen.getByTestId('care-editor-template-name')).toHaveTextContent('Curfew');
      expect(screen.queryByTestId('care-editor-name')).not.toBeInTheDocument();
      expect(screen.queryByTestId('care-editor-save')).not.toBeInTheDocument();
      expect(screen.queryByTestId('care-section-status-time')).not.toBeInTheDocument();
      expect(screen.getByText('Curfew Time')).toBeInTheDocument();
    });

    it('explains a missing template and only allows removal', () => {
      renderEditor({ template: undefined });
      expect(screen.getByTestId('care-editor-no-template')).toBeInTheDocument();
      expect(screen.getByTestId('care-editor-save')).toBeDisabled();
      expect(screen.getByTestId('care-editor-remove')).toBeEnabled();
    });
  });

  describe('validation', () => {
    it('marks required fields and disables Save until they are set', () => {
      renderEditor({ behavior: newBehaviorFrom(INACTIVITY_TEMPLATE) });
      expect(screen.getByTestId('care-section-status-devices')).toHaveTextContent('Required');
      expect(screen.getByTestId('care-editor-save')).toBeDisabled();

      fireEvent.click(screen.getByTestId(`care-field-device-${MOTION_ADDR}`));
      expect(screen.getByTestId('care-section-status-devices')).toHaveTextContent('1 Device');
      expect(screen.getByTestId('care-editor-save')).toBeEnabled();
    });

    it('disables Save with a blank name', () => {
      renderEditor();
      fireEvent.change(screen.getByTestId('care-editor-name'), { target: { value: '   ' } });
      expect(screen.getByTestId('care-editor-save')).toBeDisabled();
    });
  });

  describe('saving', () => {
    it('adds a new behavior', async () => {
      const behavior: CareBehavior = { ...newBehaviorFrom(INACTIVITY_TEMPLATE), devices: [MOTION_ADDR] };
      renderEditor({ behavior });
      fireEvent.change(screen.getByTestId('care-editor-name'), { target: { value: ' Breakfast check ' } });
      fireEvent.change(screen.getByTestId('care-field-duration'), { target: { value: '3600' } });
      fireEvent.click(screen.getByTestId('care-editor-save'));

      await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledWith(CareSubsystem.CMD_ADDBEHAVIOR, CARE_ADDR, {
        behavior: { ...behavior, name: 'Breakfast check', durationSecs: 3600 },
      });
      expect(mockDispatch).toHaveBeenCalledWith(notification('success', "'Breakfast check' has been added."));
      expect(onSaved).toHaveBeenCalled();
    });

    it('updates an existing behavior', async () => {
      renderEditor();
      fireEvent.click(screen.getByTestId(`care-field-device-${DOOR_ADDR}`));
      fireEvent.click(screen.getByTestId('care-editor-save'));

      await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledWith(CareSubsystem.CMD_UPDATEBEHAVIOR, CARE_ADDR, {
        behavior: { ...EXISTING, devices: [MOTION_ADDR, DOOR_ADDR] },
      });
      expect(mockDispatch).toHaveBeenCalledWith(notification('success', "'Morning activity' has been saved."));
    });

    it('shows Saving… while the request is in flight', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      renderEditor();
      fireEvent.click(screen.getByTestId('care-editor-save'));
      await waitFor(() => expect(screen.getByTestId('care-editor-save')).toBeDisabled());
      expect(screen.getByTestId('care-editor-save')).toHaveTextContent('Saving…');
    });

    it('shows the duplicate-name error from the platform', async () => {
      mockBridgeRequest.mockRejectedValueOnce({ code: 'care.name_in_use' });
      renderEditor();
      fireEvent.click(screen.getByTestId('care-editor-save'));

      expect(await screen.findByTestId('care-editor-error')).toHaveTextContent('Care Behavior name must be unique.');
      expect(mockDispatch).toHaveBeenCalledWith(notification('error', 'Care Behavior name must be unique.'));
      expect(mockCloseRight).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
      expect(screen.getByTestId('care-editor-save')).toBeEnabled();
    });

    it('shows a generic error and clears it on the next change', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      renderEditor();
      fireEvent.click(screen.getByTestId('care-editor-save'));

      expect(await screen.findByTestId('care-editor-error')).toHaveTextContent('Error saving Care Behavior. Please try again.');
      fireEvent.change(screen.getByTestId('care-editor-name'), { target: { value: 'New name' } });
      expect(screen.queryByTestId('care-editor-error')).not.toBeInTheDocument();
    });

    it('cancels without saving', () => {
      renderEditor();
      fireEvent.click(screen.getByTestId('care-editor-cancel'));
      expect(mockCloseRight).toHaveBeenCalled();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('removing', () => {
    it('asks for confirmation, then removes the behavior', async () => {
      renderEditor();
      fireEvent.click(screen.getByTestId('care-editor-remove'));
      expect(screen.getByText("Are you sure you want to remove 'Morning activity'?")).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Yes, Remove Behavior' }));

      await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledWith(CareSubsystem.CMD_REMOVEBEHAVIOR, CARE_ADDR, { id: 'behavior-1' });
      expect(mockDispatch).toHaveBeenCalledWith(notification('success', "'Morning activity' was removed."));
      expect(onSaved).toHaveBeenCalled();
    });

    it('keeps the behavior when confirmation is cancelled', () => {
      renderEditor();
      fireEvent.click(screen.getByTestId('care-editor-remove'));
      // The dialog's Cancel renders after the editor's own Cancel button.
      const cancels = screen.getAllByRole('button', { name: 'Cancel' });
      fireEvent.click(cancels[cancels.length - 1]);
      expect(screen.queryByRole('button', { name: 'Yes, Remove Behavior' })).not.toBeInTheDocument();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
      expect(mockCloseRight).not.toHaveBeenCalled();
    });

    it('reports a failed removal', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      renderEditor();
      fireEvent.click(screen.getByTestId('care-editor-remove'));
      fireEvent.click(screen.getByRole('button', { name: 'Yes, Remove Behavior' }));

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith(notification('error', 'Failed to remove Care Behavior')));
      expect(mockCloseRight).not.toHaveBeenCalled();
      expect(screen.getByTestId('care-editor-remove')).toBeEnabled();
    });
  });
});

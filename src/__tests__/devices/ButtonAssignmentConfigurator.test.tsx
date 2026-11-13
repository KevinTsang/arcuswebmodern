import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Device, Rule, RuleTemplate } from '@arcus/core';
import ButtonAssignmentConfigurator from '@/components/devices/ButtonAssignmentConfigurator';
import type { DeviceEntity, RuleEntity, RuleTemplateEntity } from '@/store/entityTypes';
import { makeDevice, makeRule } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;
let mockRules: RuleEntity[] = [];
let mockTemplates: RuleTemplateEntity[] = [];
let mockPlaceId: string | null = 'place-1';

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

interface MockState {
  rules: { ruleTemplates: RuleTemplateEntity[] };
  place: { placeId: string | null };
}

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: MockState) => unknown) =>
    selector({ rules: { ruleTemplates: mockTemplates }, place: { placeId: mockPlaceId } }),
}));

jest.mock('@/store/slices/rulesSlice', () => ({
  selectAllRules: () => mockRules,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:fob';

function makeTemplate(id: string, name: string): RuleTemplateEntity {
  const address = `SERV:ruletmpl:${id}`;
  return { id: address, [Base.ATTR_ADDRESS]: address, [Base.ATTR_ID]: id, [RuleTemplate.ATTR_NAME]: name };
}

const TEMPLATES = [
  makeTemplate('smartfobgen1-arm-on', 'Fob Arm On'),
  makeTemplate('smartfobgen1-disarm', 'Fob Disarm'),
  makeTemplate('smartfob-chime', 'Other Product Chime'),
];

const HOME_RULE = makeRule('SERV:rule:home', {
  [Rule.ATTR_TEMPLATE]: 'smartfobgen1-disarm',
  [Rule.ATTR_CONTEXT]: { button: 'home', 'key fob': ADDRESS },
});

function select(button: string) {
  return screen.getByTestId(`button-assign-${button}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockDevice = makeDevice(ADDRESS, { [Device.ATTR_PRODUCTID]: '486390' });
  mockRules = [HOME_RULE];
  mockTemplates = TEMPLATES;
  mockPlaceId = 'place-1';
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ButtonAssignmentConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ButtonAssignmentConfigurator address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows one selector per button with the assigned action selected', () => {
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      expect(screen.getByText('Button Assignments')).toBeInTheDocument();
      expect(screen.getByLabelText('Away')).toHaveValue('');
      expect(screen.getByLabelText('Home')).toHaveValue('smartfobgen1-disarm');
    });

    it('offers only the product actions plus "Activate A Rule"', () => {
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      const options = Array.from((select('away') as HTMLSelectElement).options).map((o) => o.textContent);
      expect(options).toEqual(['Set Security Alarm To On', 'Set Security Alarm To Off', 'Activate A Rule']);
    });

    it('uses a singular title for a one-button device', () => {
      mockDevice = makeDevice(ADDRESS, { [Device.ATTR_PRODUCTID]: 'bbf1cf' });
      mockTemplates = [makeTemplate('button-panic', 'Panic')];
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      expect(screen.getByText('Button Assignment')).toBeInTheDocument();
      expect(screen.getByLabelText('Button')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('creates a rule for an unassigned button', async () => {
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      fireEvent.change(select('away'), { target: { value: 'smartfobgen1-arm-on' } });
      expect(select('away')).toBeDisabled();
      await waitFor(() => expect(select('away')).toBeEnabled());
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
      expect(mockBridgeRequest).toHaveBeenCalledWith(RuleTemplate.CMD_CREATERULE, 'SERV:ruletmpl:smartfobgen1-arm-on', {
        placeId: 'place-1',
        name: 'Fob Arm On',
        description: 'Fob Arm On',
        context: { button: 'away', 'key fob': ADDRESS },
      });
    });

    it('replaces an assigned button rule: creates the new one, then deletes the old', async () => {
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      fireEvent.change(select('home'), { target: { value: 'smartfobgen1-arm-on' } });
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledTimes(2));
      expect(mockBridgeRequest.mock.calls[0][0]).toBe(RuleTemplate.CMD_CREATERULE);
      expect(mockBridgeRequest.mock.calls[1]).toEqual([Rule.CMD_DELETE, 'SERV:rule:home', {}]);
    });

    it('only deletes the rule when "Activate A Rule" is chosen', async () => {
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      fireEvent.change(select('home'), { target: { value: '' } });
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(Rule.CMD_DELETE, 'SERV:rule:home', {}));
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
    });

    it('keeps the old rule and shows an error when creating fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      fireEvent.change(select('home'), { target: { value: 'smartfobgen1-arm-on' } });
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to assign the Home button' },
      }));
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
      expect(select('home')).toBeEnabled();
    });
  });

  describe('edge cases', () => {
    it('explains when the product is not supported', () => {
      mockDevice = makeDevice(ADDRESS, { [Device.ATTR_PRODUCTID]: 'unknown' });
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      expect(screen.getByTestId('button-assign-unsupported')).toBeInTheDocument();
    });

    it('explains when the template catalog has no actions for the product', () => {
      mockTemplates = [];
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      expect(screen.getByTestId('button-assign-unsupported')).toBeInTheDocument();
    });

    it('disables the selectors until a place is loaded', () => {
      mockPlaceId = null;
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      expect(select('away')).toBeDisabled();
    });

    it('does nothing when the same action is re-selected', () => {
      render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      fireEvent.change(select('home'), { target: { value: 'smartfobgen1-disarm' } });
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('renders nothing without a device', () => {
      mockDevice = undefined;
      const { container } = render(<ButtonAssignmentConfigurator address={ADDRESS} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});

import { Base, Product, PairingDevice as PairingDeviceCap } from '@arcus/core';
import reducer, {
  loadProduct,
  startSearch,
  setDevices,
  devicePaired,
  deviceMispaired,
  searchTimedOut,
  searchFailed,
  setPairingLoading,
  setSteps,
  nextStep,
  prevStep,
  setHubId,
  startHubRegistration,
  hubRegistered,
  setHubRegistrationState,
  hubRegistrationError,
  hubRetry,
  setDeviceName,
  setFavorite,
  customizationComplete,
  startPairingFlow,
  endPairingFlow,
  resetPairing,
} from '@/store/slices/pairingSlice';
import type { PairingState } from '@/store/slices/pairingSlice';
import type { PairingFlow } from '@/components/pairing/types';
import type { PairingProduct, PairingDevice } from '@/store/entityTypes';
import { makePairingDevice } from '../helpers/factories';

const initialState: PairingState = {
  stage: 'steps',
  product: null,
  isHubPairing: false,
  steps: [],
  currentStep: 0,
  devices: [],
  searchTimedOut: false,
  searchFailed: false,
  loading: false,
  hubId: '',
  hubRegistrationState: null,
  deviceName: '',
  isFavorite: false,
  activeDevice: null,
  flow: null,
};

const PAIRING_SUBSYSTEM = 'SERV:subpairing:place-1';
const leftover = makePairingDevice('leftover', PairingDeviceCap.PAIRINGSTATE_PAIRED);
const flow: PairingFlow = {
  pairingSubsystem: PAIRING_SUBSYSTEM,
  settled: { [leftover[Base.ATTR_ADDRESS]]: PairingDeviceCap.PAIRINGSTATE_PAIRED },
};

const mockProduct: PairingProduct = {
  [Base.ATTR_ADDRESS]: 'SERV:product:prod-1',
  [Product.ATTR_NAME]: 'Smart Plug',
  [Product.ATTR_VENDOR]: 'GE',
  [Product.ATTR_HUBREQUIRED]: true,
  [Product.ATTR_ID]: 'abc123',
};

const mockDevice: PairingDevice = {
  [Base.ATTR_ADDRESS]: 'DRIV:dev:dev-1',
  [PairingDeviceCap.ATTR_PAIRINGSTATE]: 'PAIRED',
  [PairingDeviceCap.ATTR_PAIRINGPHASE]: 'PAIRED',
  [PairingDeviceCap.ATTR_DEVICEADDRESS]: 'DRIV:dev:real-1',
};

describe('pairingSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('loadProduct', () => {
    it('sets product and isHubPairing', () => {
      const state = reducer(initialState, loadProduct({ product: mockProduct, isHubPairing: false }));
      expect(state.product).toEqual(mockProduct);
      expect(state.isHubPairing).toBe(false);
    });

    it('sets isHubPairing true for hub products', () => {
      const hubProduct = { ...mockProduct, [Product.ATTR_ID]: 'dee000' };
      const state = reducer(initialState, loadProduct({ product: hubProduct, isHubPairing: true }));
      expect(state.isHubPairing).toBe(true);
    });
  });

  describe('startSearch', () => {
    it('sets stage to searching and clears devices', () => {
      const prev = { ...initialState, stage: 'steps' as const, devices: [mockDevice], searchTimedOut: true, searchFailed: true };
      const state = reducer(prev, startSearch());
      expect(state.stage).toBe('searching');
      expect(state.searchTimedOut).toBe(false);
      expect(state.searchFailed).toBe(false);
      expect(state.devices).toEqual([]);
    });
  });

  describe('setDevices', () => {
    it('sets the devices list', () => {
      const state = reducer(initialState, setDevices([mockDevice]));
      expect(state.devices).toEqual([mockDevice]);
    });
  });

  describe('devicePaired', () => {
    it('sets activeDevice, deviceName, and stage to customize', () => {
      const state = reducer(initialState, devicePaired({ device: mockDevice, defaultName: 'Smart Plug' }));
      expect(state.activeDevice).toEqual(mockDevice);
      expect(state.deviceName).toBe('Smart Plug');
      expect(state.stage).toBe('customize');
    });
  });

  describe('deviceMispaired', () => {
    it('sets activeDevice and stage to completed', () => {
      const mispaired = { ...mockDevice, [PairingDeviceCap.ATTR_PAIRINGSTATE]: 'MISPAIRED' };
      const state = reducer(initialState, deviceMispaired(mispaired));
      expect(state.activeDevice).toEqual(mispaired);
      expect(state.stage).toBe('completed');
    });

    it('settles the device in the flow, so the next search in the flow does not end on it again', () => {
      const lock = makePairingDevice('lock', PairingDeviceCap.PAIRINGSTATE_MISPAIRED);
      const state = reducer({ ...initialState, flow }, deviceMispaired(lock));
      expect(state.flow).toEqual({
        pairingSubsystem: PAIRING_SUBSYSTEM,
        settled: { ...flow.settled, [lock[Base.ATTR_ADDRESS]]: PairingDeviceCap.PAIRINGSTATE_MISPAIRED },
      });
    });
  });

  describe('searchTimedOut', () => {
    it('sets searchTimedOut to true', () => {
      const state = reducer(initialState, searchTimedOut());
      expect(state.searchTimedOut).toBe(true);
    });
  });

  describe('searchFailed', () => {
    it('sets searchFailed to true', () => {
      expect(reducer(initialState, searchFailed()).searchFailed).toBe(true);
    });
  });

  describe('pairing flow', () => {
    it('startPairingFlow stores the flow', () => {
      expect(reducer(initialState, startPairingFlow(flow)).flow).toEqual(flow);
    });

    it('endPairingFlow clears the flow', () => {
      expect(reducer({ ...initialState, flow }, endPairingFlow()).flow).toBeNull();
    });
  });

  describe('setPairingLoading', () => {
    it('sets loading', () => {
      expect(reducer(initialState, setPairingLoading(true)).loading).toBe(true);
      expect(reducer(initialState, setPairingLoading(false)).loading).toBe(false);
    });
  });

  describe('setSteps / nextStep / prevStep', () => {
    const steps = [
      { id: 's1', order: 1, instructions: ['Step 1'] },
      { id: 's2', order: 2, instructions: ['Step 2'] },
      { id: 's3', order: 3, instructions: ['Step 3'] },
    ];

    it('setSteps sets steps and resets currentStep to 0', () => {
      const prev = { ...initialState, currentStep: 5 };
      const state = reducer(prev, setSteps(steps));
      expect(state.steps).toEqual(steps);
      expect(state.currentStep).toBe(0);
    });

    it('nextStep increments currentStep', () => {
      const state = reducer(initialState, nextStep());
      expect(state.currentStep).toBe(1);
    });

    it('prevStep decrements currentStep', () => {
      const prev = { ...initialState, currentStep: 2 };
      const state = reducer(prev, prevStep());
      expect(state.currentStep).toBe(1);
    });
  });

  describe('setHubId', () => {
    it('sets hubId', () => {
      const state = reducer(initialState, setHubId('ABC-1234'));
      expect(state.hubId).toBe('ABC-1234');
    });
  });

  describe('hub registration', () => {
    it('startHubRegistration sets stage, hubRegistrationState, loading', () => {
      const state = reducer(initialState, startHubRegistration());
      expect(state.stage).toBe('searching');
      expect(state.hubRegistrationState).toBe('OFFLINE');
      expect(state.loading).toBe(true);
    });

    it('hubRegistered sets stage to customize and loading false', () => {
      const prev = { ...initialState, stage: 'searching' as const, loading: true };
      const state = reducer(prev, hubRegistered());
      expect(state.stage).toBe('customize');
      expect(state.loading).toBe(false);
    });

    it('setHubRegistrationState updates hubRegistrationState', () => {
      const state = reducer(initialState, setHubRegistrationState('DOWNLOADING'));
      expect(state.hubRegistrationState).toBe('DOWNLOADING');
    });

    it('hubRegistrationError sets hubRegistrationState and loading false', () => {
      const prev = { ...initialState, loading: true };
      const state = reducer(prev, hubRegistrationError('error.register.alreadyregistered'));
      expect(state.hubRegistrationState).toBe('error.register.alreadyregistered');
      expect(state.loading).toBe(false);
    });

    it('hubRetry resets to steps stage', () => {
      const prev = {
        ...initialState,
        stage: 'searching' as const,
        hubRegistrationState: 'error.register.alreadyregistered',
        hubId: 'ABC-1234',
      };
      const state = reducer(prev, hubRetry());
      expect(state.stage).toBe('steps');
      expect(state.hubRegistrationState).toBeNull();
      expect(state.hubId).toBe('');
    });
  });

  describe('customization', () => {
    it('setDeviceName sets deviceName', () => {
      const state = reducer(initialState, setDeviceName('Living Room Plug'));
      expect(state.deviceName).toBe('Living Room Plug');
    });

    it('setFavorite sets isFavorite', () => {
      expect(reducer(initialState, setFavorite(true)).isFavorite).toBe(true);
      expect(reducer(initialState, setFavorite(false)).isFavorite).toBe(false);
    });

    it('customizationComplete sets stage to completed', () => {
      const prev = { ...initialState, stage: 'customize' as const };
      const state = reducer(prev, customizationComplete());
      expect(state.stage).toBe('completed');
    });

    it('customizationComplete settles the customized device in the flow', () => {
      const plug = makePairingDevice('plug', PairingDeviceCap.PAIRINGSTATE_PAIRED);
      const prev = { ...initialState, stage: 'customize' as const, activeDevice: plug, flow };
      const state = reducer(prev, customizationComplete());
      expect(state.flow?.settled).toEqual({
        ...flow.settled,
        [plug[Base.ATTR_ADDRESS]]: PairingDeviceCap.PAIRINGSTATE_PAIRED,
      });
    });

    it('customizationComplete leaves the flow alone for hub pairing', () => {
      const prev = { ...initialState, stage: 'customize' as const, isHubPairing: true, flow };
      expect(reducer(prev, customizationComplete()).flow).toEqual(flow);
    });
  });

  describe('resetPairing', () => {
    it('resets to initial state', () => {
      const dirty: PairingState = {
        stage: 'completed',
        product: mockProduct,
        isHubPairing: true,
        steps: [{ id: 's1', order: 1, instructions: ['x'] }],
        currentStep: 2,
        devices: [mockDevice],
        searchTimedOut: true,
        loading: true,
        hubId: 'ABC-1234',
        hubRegistrationState: 'REGISTERED',
        deviceName: 'My Plug',
        isFavorite: true,
        activeDevice: mockDevice,
        searchFailed: true,
        flow: null,
      };
      const state = reducer(dirty, resetPairing());
      expect(state).toEqual(initialState);
    });

    it('keeps the pairing flow, which spans Pair Another and trips to the catalog', () => {
      const dirty: PairingState = { ...initialState, stage: 'completed', activeDevice: mockDevice, flow };
      expect(reducer(dirty, resetPairing())).toEqual({ ...initialState, flow });
    });
  });
});

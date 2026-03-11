import reducer, {
  loadProduct,
  startSearch,
  setDevices,
  devicePaired,
  deviceMispaired,
  searchTimedOut,
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
  resetPairing,
} from '@/store/slices/pairingSlice';
import type { PairingState } from '@/store/slices/pairingSlice';

const initialState: PairingState = {
  stage: 'steps',
  product: null,
  isHubPairing: false,
  steps: [],
  currentStep: 0,
  devices: [],
  searchTimedOut: false,
  loading: false,
  hubId: '',
  hubRegistrationState: null,
  deviceName: '',
  isFavorite: false,
  activeDevice: null,
};

const mockProduct = {
  'base:address': 'SERV:product:prod-1',
  'product:name': 'Smart Plug',
  'product:vendor': 'GE',
  'product:hubRequired': true,
  'product:id': 'abc123',
};

const mockDevice = {
  'base:address': 'DRIV:dev:dev-1',
  'pairdev:pairingState': 'PAIRED',
  'pairdev:pairingPhase': 'PAIRED',
  'pairdev:deviceAddress': 'DRIV:dev:real-1',
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
      const hubProduct = { ...mockProduct, 'product:id': 'dee000' };
      const state = reducer(initialState, loadProduct({ product: hubProduct, isHubPairing: true }));
      expect(state.isHubPairing).toBe(true);
    });
  });

  describe('startSearch', () => {
    it('sets stage to searching and clears devices', () => {
      const prev = { ...initialState, stage: 'steps' as const, devices: [mockDevice], searchTimedOut: true };
      const state = reducer(prev, startSearch());
      expect(state.stage).toBe('searching');
      expect(state.searchTimedOut).toBe(false);
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
      const mispaired = { ...mockDevice, 'pairdev:pairingState': 'MISPAIRED' };
      const state = reducer(initialState, deviceMispaired(mispaired));
      expect(state.activeDevice).toEqual(mispaired);
      expect(state.stage).toBe('completed');
    });
  });

  describe('searchTimedOut', () => {
    it('sets searchTimedOut to true', () => {
      const state = reducer(initialState, searchTimedOut());
      expect(state.searchTimedOut).toBe(true);
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
      };
      const state = reducer(dirty, resetPairing());
      expect(state).toEqual(initialState);
    });
  });
});

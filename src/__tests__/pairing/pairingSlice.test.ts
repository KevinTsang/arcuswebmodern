import { Base, Product, PairingDevice as PairingDeviceCap } from '@arcus/core';
import reducer, {
  loadProduct,
  startSearch,
  setDevices,
  devicePaired,
  deviceMispaired,
  searchTimedOut,
  setPairingLoading,
  setSteps,
  setPairingConfig,
  setFormValue,
  startOAuth,
  setOAuthStatus,
  setSearchError,
  returnToSteps,
  showFormStep,
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
import type { PairingProduct, PairingDevice } from '@/store/entityTypes';

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
  pairingMode: null,
  oauthUrl: null,
  form: [],
  formValues: {},
  oauthStatus: null,
  searchError: null,
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
      const mispaired = { ...mockDevice, [PairingDeviceCap.ATTR_PAIRINGSTATE]: 'MISPAIRED' };
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
        pairingMode: 'OAUTH',
        oauthUrl: 'https://oauth.example.com/start?x=1',
        form: [{ type: 'TEXT', name: 'sn', label: 'Serial' }],
        formValues: { sn: 'abc' },
        oauthStatus: 'closed',
        searchError: 'Bad code',
      };
      const state = reducer(dirty, resetPairing());
      expect(state).toEqual(initialState);
    });
  });

  describe('cloud pairing', () => {
    const steps = [
      { id: 's1', order: 1, instructions: ['one'] },
      { id: 's2', order: 2, instructions: ['two'] },
    ];

    it('setPairingConfig stores steps, mode, OAuth URL and form defaults', () => {
      const prev = { ...initialState, currentStep: 3 };
      const state = reducer(prev, setPairingConfig({
        steps,
        mode: 'CLOUD',
        oauthUrl: 'https://oauth.example.com/start',
        form: [
          { type: 'TEXT', name: 'sn', label: 'Serial' },
          { type: 'HIDDEN', name: 'model', label: 'Model', value: 'X1' },
        ],
      }));
      expect(state.steps).toEqual(steps);
      expect(state.currentStep).toBe(0);
      expect(state.pairingMode).toBe('CLOUD');
      expect(state.oauthUrl).toBe('https://oauth.example.com/start');
      expect(state.formValues).toEqual({ sn: '', model: 'X1' });
    });

    it('setPairingConfig defaults missing fields', () => {
      const state = reducer(initialState, setPairingConfig({ steps: [], mode: 'HUB' }));
      expect(state.oauthUrl).toBeNull();
      expect(state.form).toEqual([]);
      expect(state.formValues).toEqual({});
    });

    it('setFormValue updates one input', () => {
      const prev = { ...initialState, formValues: { sn: '', model: 'X1' } };
      const state = reducer(prev, setFormValue({ name: 'sn', value: 'ABC' }));
      expect(state.formValues).toEqual({ sn: 'ABC', model: 'X1' });
    });

    it('startOAuth moves to searching with a connecting popup', () => {
      const prev = { ...initialState, devices: [mockDevice], searchTimedOut: true };
      const state = reducer(prev, startOAuth());
      expect(state.stage).toBe('searching');
      expect(state.oauthStatus).toBe('connecting');
      expect(state.devices).toEqual([]);
      expect(state.searchTimedOut).toBe(false);
    });

    it('setOAuthStatus records popup progress', () => {
      const state = reducer({ ...initialState, oauthStatus: 'connecting' }, setOAuthStatus('closed'));
      expect(state.oauthStatus).toBe('closed');
    });

    it('setSearchError records and clears the error', () => {
      const withError = reducer(initialState, setSearchError('Bad code'));
      expect(withError.searchError).toBe('Bad code');
      expect(reducer(withError, setSearchError(null)).searchError).toBeNull();
    });

    it('startSearch clears a previous search error', () => {
      const state = reducer({ ...initialState, searchError: 'Bad code' }, startSearch());
      expect(state.searchError).toBeNull();
    });

    it('returnToSteps goes back to the first step and leaves OAuth', () => {
      const prev: PairingState = {
        ...initialState, stage: 'searching', currentStep: 1, oauthStatus: 'timedOut', searchTimedOut: true, devices: [mockDevice],
      };
      const state = reducer(prev, returnToSteps());
      expect(state.stage).toBe('steps');
      expect(state.currentStep).toBe(0);
      expect(state.oauthStatus).toBeNull();
      expect(state.searchTimedOut).toBe(false);
      expect(state.devices).toEqual([]);
    });

    it('showFormStep returns to the last step to re-enter the code', () => {
      const prev: PairingState = { ...initialState, stage: 'searching', steps, searchError: 'Bad code' };
      const state = reducer(prev, showFormStep());
      expect(state.stage).toBe('steps');
      expect(state.currentStep).toBe(1);
      expect(state.searchError).toBeNull();
    });

    it('showFormStep stays on step 0 when there are no steps', () => {
      const state = reducer({ ...initialState, stage: 'searching' }, showFormStep());
      expect(state.currentStep).toBe(0);
    });
  });
});

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PairingDevice, PairingProduct } from '@/store/entityTypes';
import type { OAuthStatus, PairingStage, PairingStep } from '@/components/pairing/types';
import type { PairingInput, StartPairingResponse } from '@/arcus/types';
import { initialFormValues, type PairingFormValues } from '@/lib/cloudPairing';

export interface PairingState {
  stage: PairingStage;
  product: PairingProduct | null;
  isHubPairing: boolean;
  steps: PairingStep[];
  currentStep: number;
  devices: PairingDevice[];
  searchTimedOut: boolean;
  loading: boolean;
  hubId: string;
  hubRegistrationState: string | null;
  deviceName: string;
  isFavorite: boolean;
  activeDevice: PairingDevice | null;
  /** How the product pairs, from subpairing:StartPairing (null until it answers). */
  pairingMode: StartPairingResponse['mode'] | null;
  /** Vendor sign-in URL for OAuth products. */
  oauthUrl: string | null;
  /** Inputs a cloud (IPCD) product needs before searching, e.g. a serial number. */
  form: PairingInput[];
  formValues: PairingFormValues;
  /** Progress of the OAuth sign-in popup (null when not signing in). */
  oauthStatus: OAuthStatus | null;
  /** Why a cloud search failed, shown on the searching stage. */
  searchError: string | null;
}

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

const pairingSlice = createSlice({
  name: 'pairing',
  initialState,
  reducers: {
    loadProduct(state, action: PayloadAction<{ product: PairingProduct; isHubPairing: boolean }>) {
      state.product = action.payload.product;
      state.isHubPairing = action.payload.isHubPairing;
    },
    startSearch(state) {
      state.stage = 'searching';
      state.searchTimedOut = false;
      state.searchError = null;
      state.devices = [];
    },
    setDevices(state, action: PayloadAction<PairingDevice[]>) {
      state.devices = action.payload;
    },
    devicePaired(state, action: PayloadAction<{ device: PairingDevice; defaultName: string }>) {
      state.activeDevice = action.payload.device;
      state.deviceName = action.payload.defaultName;
      state.stage = 'customize';
    },
    deviceMispaired(state, action: PayloadAction<PairingDevice>) {
      state.activeDevice = action.payload;
      state.stage = 'completed';
    },
    searchTimedOut(state) {
      state.searchTimedOut = true;
    },
    setPairingLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setSteps(state, action: PayloadAction<PairingStep[]>) {
      state.steps = action.payload;
      state.currentStep = 0;
    },
    setPairingConfig(state, action: PayloadAction<StartPairingResponse>) {
      const { steps, mode, oauthUrl, form } = action.payload;
      state.steps = steps ?? [];
      state.currentStep = 0;
      state.pairingMode = mode ?? null;
      state.oauthUrl = oauthUrl ?? null;
      state.form = form ?? [];
      state.formValues = initialFormValues(state.form);
    },
    setFormValue(state, action: PayloadAction<{ name: string; value: string }>) {
      state.formValues[action.payload.name] = action.payload.value;
    },
    startOAuth(state) {
      state.stage = 'searching';
      state.oauthStatus = 'connecting';
      state.searchTimedOut = false;
      state.devices = [];
    },
    setOAuthStatus(state, action: PayloadAction<OAuthStatus>) {
      state.oauthStatus = action.payload;
    },
    setSearchError(state, action: PayloadAction<string | null>) {
      state.searchError = action.payload;
    },
    returnToSteps(state) {
      state.stage = 'steps';
      state.currentStep = 0;
      state.oauthStatus = null;
      state.searchTimedOut = false;
      state.searchError = null;
      state.devices = [];
    },
    showFormStep(state) {
      state.stage = 'steps';
      state.currentStep = Math.max(state.steps.length - 1, 0);
      state.searchError = null;
      state.devices = [];
    },
    nextStep(state) {
      state.currentStep += 1;
    },
    prevStep(state) {
      state.currentStep -= 1;
    },
    setHubId(state, action: PayloadAction<string>) {
      state.hubId = action.payload;
    },
    startHubRegistration(state) {
      state.stage = 'searching';
      state.hubRegistrationState = 'OFFLINE';
      state.loading = true;
    },
    hubRegistered(state) {
      state.stage = 'customize';
      state.loading = false;
    },
    setHubRegistrationState(state, action: PayloadAction<string>) {
      state.hubRegistrationState = action.payload;
    },
    hubRegistrationError(state, action: PayloadAction<string>) {
      state.hubRegistrationState = action.payload;
      state.loading = false;
    },
    hubRetry(state) {
      state.stage = 'steps';
      state.hubRegistrationState = null;
      state.hubId = '';
    },
    setDeviceName(state, action: PayloadAction<string>) {
      state.deviceName = action.payload;
    },
    setFavorite(state, action: PayloadAction<boolean>) {
      state.isFavorite = action.payload;
    },
    customizationComplete(state) {
      state.stage = 'completed';
    },
    resetPairing() {
      return initialState;
    },
  },
});

export const {
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
} = pairingSlice.actions;
export default pairingSlice.reducer;

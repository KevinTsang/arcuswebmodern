import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Base, PairingDevice as PairingDeviceCap } from '@arcus/core';
import type { PairingDevice, PairingProduct } from '@/store/entityTypes';
import type { PairingFlow, PairingStage, PairingStep } from '@/components/pairing/types';

export interface PairingState {
  stage: PairingStage;
  product: PairingProduct | null;
  isHubPairing: boolean;
  steps: PairingStep[];
  currentStep: number;
  devices: PairingDevice[];
  searchTimedOut: boolean;
  /** The search could not be started (the pairing list or Search request failed). */
  searchFailed: boolean;
  loading: boolean;
  hubId: string;
  hubRegistrationState: string | null;
  deviceName: string;
  isFavorite: boolean;
  activeDevice: PairingDevice | null;
  /** The current pairing flow. Unlike the rest of this state it survives resetPairing. */
  flow: PairingFlow | null;
}

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

/** Record that the flow is done with a device, so later searches in the flow skip it. */
function settle(state: PairingState, device: PairingDevice) {
  if (state.flow) {
    state.flow.settled[device[Base.ATTR_ADDRESS]] = device[PairingDeviceCap.ATTR_PAIRINGSTATE];
  }
}

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
      state.searchFailed = false;
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
      settle(state, action.payload);
    },
    searchTimedOut(state) {
      state.searchTimedOut = true;
    },
    searchFailed(state) {
      state.searchFailed = true;
    },
    setPairingLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setSteps(state, action: PayloadAction<PairingStep[]>) {
      state.steps = action.payload;
      state.currentStep = 0;
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
      if (state.activeDevice) settle(state, state.activeDevice);
    },
    startPairingFlow(state, action: PayloadAction<PairingFlow>) {
      state.flow = action.payload;
    },
    endPairingFlow(state) {
      state.flow = null;
    },
    /** Reset the wizard. The pairing flow is kept: it ends with endPairingFlow. */
    resetPairing(state) {
      return { ...initialState, flow: state.flow };
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
} = pairingSlice.actions;
export default pairingSlice.reducer;

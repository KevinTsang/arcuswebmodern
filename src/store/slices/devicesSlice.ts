import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface DeviceEntity {
  id: string; // set to base:address
  'base:address': string;
  [key: string]: unknown;
}

const devicesAdapter = createEntityAdapter<DeviceEntity>();

const devicesSlice = createSlice({
  name: 'devices',
  initialState: devicesAdapter.getInitialState(),
  reducers: {
    deviceAdded: devicesAdapter.addOne,
    deviceUpdated(state, action: PayloadAction<{ 'base:address': string; [key: string]: unknown }>) {
      const address = action.payload['base:address'];
      const { 'base:address': _, ...changes } = action.payload;
      devicesAdapter.updateOne(state, { id: address, changes });
    },
    deviceRemoved: devicesAdapter.removeOne,
    devicesReceived(state, action: PayloadAction<Array<{ 'base:address': string; [key: string]: unknown }>>) {
      const entities = action.payload.map((d) => ({ ...d, id: d['base:address'] }));
      devicesAdapter.setAll(state, entities);
    },
    devicesClear: devicesAdapter.removeAll,
  },
});

export const {
  deviceAdded,
  deviceUpdated,
  deviceRemoved,
  devicesReceived,
  devicesClear,
} = devicesSlice.actions;

export const {
  selectAll: selectAllDevices,
  selectById: selectDeviceByAddress,
  selectIds: selectDeviceAddresses,
} = devicesAdapter.getSelectors((state: RootState) => state.devices);

export default devicesSlice.reducer;

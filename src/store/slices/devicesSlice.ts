import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Base } from '@arcus/core';
import type { DeviceEntity, DeviceData, ArcusPayload } from '../entityTypes';

export type { DeviceEntity } from '../entityTypes';

const devicesAdapter = createEntityAdapter<DeviceEntity>();

const devicesSlice = createSlice({
  name: 'devices',
  initialState: devicesAdapter.getInitialState(),
  reducers: {
    deviceAdded: devicesAdapter.addOne,
    deviceUpdated(state, action: PayloadAction<ArcusPayload>) {
      const address = action.payload[Base.ATTR_ADDRESS];
      const { [Base.ATTR_ADDRESS]: _, ...changes } = action.payload;
      devicesAdapter.updateOne(state, { id: address, changes });
    },
    deviceRemoved: devicesAdapter.removeOne,
    devicesReceived(state, action: PayloadAction<DeviceData[]>) {
      const entities = action.payload.map((d) => ({ ...d, id: d[Base.ATTR_ADDRESS] as string }));
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

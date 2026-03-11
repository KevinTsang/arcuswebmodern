import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import placeReducer from './slices/placeSlice';
import devicesReducer from './slices/devicesSlice';
import subsystemsReducer from './slices/subsystemsSlice';
import rulesReducer from './slices/rulesSlice';
import scenesReducer from './slices/scenesSlice';
import schedulersReducer from './slices/schedulersSlice';
import incidentsReducer from './slices/incidentsSlice';
import peopleReducer from './slices/peopleSlice';
import hubReducer from './slices/hubSlice';
import uiReducer from './slices/uiSlice';
import pairingReducer from './slices/pairingSlice';
import { corneaMiddleware } from './middleware/corneaMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    place: placeReducer,
    devices: devicesReducer,
    subsystems: subsystemsReducer,
    rules: rulesReducer,
    scenes: scenesReducer,
    schedulers: schedulersReducer,
    incidents: incidentsReducer,
    people: peopleReducer,
    hub: hubReducer,
    ui: uiReducer,
    pairing: pairingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Cornea messages contain non-serializable WebSocket data during transit
        ignoredActions: ['auth/login/pending', 'auth/login/rejected'],
      },
    }).concat(corneaMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

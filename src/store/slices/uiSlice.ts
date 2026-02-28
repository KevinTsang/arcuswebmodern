import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

export interface UiState {
  notifications: Notification[];
  panelContent: string | null;
  careAlarmState: string | null;
  loading: boolean;
}

const initialState: UiState = {
  notifications: [],
  panelContent: null,
  careAlarmState: null,
  loading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) {
      state.notifications.push({
        ...action.payload,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      });
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications(state) {
      state.notifications = [];
    },
    setPanelContent(state, action: PayloadAction<string | null>) {
      state.panelContent = action.payload;
    },
    setCareAlarmState(state, action: PayloadAction<string | null>) {
      state.careAlarmState = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  setPanelContent,
  setCareAlarmState,
  setLoading,
} = uiSlice.actions;
export default uiSlice.reducer;

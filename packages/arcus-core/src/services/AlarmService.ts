import Bridge from '../bridge';

export interface IncidentTrigger {
  [key: string]: unknown;
}

const AlarmService = {
  AddAlarm(alarm: string, alarms: string[], triggers: IncidentTrigger[]): Promise<Record<string, unknown>> {
    return Bridge.request('alarmservice:AddAlarm', 'SERV:alarmservice:', { alarm, alarms, triggers });
  },

  CancelAlert(method: string, alarms: string[]): Promise<Record<string, unknown>> {
    return Bridge.request('alarmservice:CancelAlert', 'SERV:alarmservice:', { method, alarms });
  },
};

export default AlarmService;

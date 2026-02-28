import Bridge from '../bridge';

export interface TimeOfDayCommand {
  [key: string]: unknown;
}

const SchedulerService = {
  ListSchedulers(placeId: string, includeWeekdays?: boolean): Promise<Record<string, unknown>> {
    return Bridge.request('scheduler:ListSchedulers', 'SERV:scheduler:', { placeId, includeWeekdays });
  },

  GetScheduler(target: string): Promise<Record<string, unknown>> {
    return Bridge.request('scheduler:GetScheduler', 'SERV:scheduler:', { target });
  },

  FireCommand(target: string, commandId: string): Promise<Record<string, unknown>> {
    return Bridge.request('scheduler:FireCommand', 'SERV:scheduler:', { target, commandId });
  },

  ScheduleCommands(target: string, group: string, commands: TimeOfDayCommand[]): Promise<Record<string, unknown>> {
    return Bridge.request('scheduler:ScheduleCommands', 'SERV:scheduler:', { target, group, commands });
  },

  ScheduleWeeklyCommand(
    target: string,
    schedule: string,
    days: string[],
    mode?: string,
    time?: string,
    offsetMinutes?: number,
    messageType?: string,
    attributes?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return Bridge.request('scheduler:ScheduleWeeklyCommand', 'SERV:scheduler:', {
      target, schedule, days, mode, time, offsetMinutes, messageType, attributes,
    });
  },

  UpdateWeeklyCommand(
    target: string,
    schedule: string,
    commandId: string,
    days?: string[],
    mode?: string,
    time?: string,
    offsetMinutes?: number,
    messageType?: string,
    attributes?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return Bridge.request('scheduler:UpdateWeeklyCommand', 'SERV:scheduler:', {
      target, schedule, commandId, days, mode, time, offsetMinutes, messageType, attributes,
    });
  },

  DeleteCommand(target: string, schedule: string, commandId: string): Promise<Record<string, unknown>> {
    return Bridge.request('scheduler:DeleteCommand', 'SERV:scheduler:', { target, schedule, commandId });
  },
};

export default SchedulerService;

import Bridge from '../bridge';

const SubsystemService = {
  ListSubsystems(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('subs:ListSubsystems', 'SERV:subs:', { placeId });
  },

  Reload(): Promise<Record<string, unknown>> {
    return Bridge.request('subs:Reload', 'SERV:subs:', {});
  },
};

export default SubsystemService;

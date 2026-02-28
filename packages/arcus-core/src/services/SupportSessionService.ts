import Bridge from '../bridge';

const SupportSessionService = {
  ListAllActiveSessions(limit?: number, token?: string): Promise<Record<string, unknown>> {
    return Bridge.request('suppcustsession:ListAllActiveSessions', 'SERV:suppcustsession:', { limit, token });
  },
};

export default SupportSessionService;

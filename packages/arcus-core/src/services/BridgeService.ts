import Bridge from '../bridge';

const BridgeService = {
  RegisterDevice(attrs: Record<string, string>): Promise<Record<string, unknown>> {
    return Bridge.request('bridgesvc:RegisterDevice', 'SERV:bridgesvc:', { attrs });
  },

  RemoveDevice(id: string, accountId?: string, placeId?: string): Promise<Record<string, unknown>> {
    return Bridge.request('bridgesvc:RemoveDevice', 'SERV:bridgesvc:', { id, accountId, placeId });
  },
};

export default BridgeService;

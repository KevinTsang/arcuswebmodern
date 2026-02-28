import Bridge from '../bridge';

const ProMonitoringService = {
  GetSettings(place: string): Promise<Record<string, unknown>> {
    return Bridge.request('promon:GetSettings', 'SERV:promon:', { place });
  },

  GetMetaData(): Promise<Record<string, unknown>> {
    return Bridge.request('promon:GetMetaData', 'SERV:promon:', {});
  },

  CheckAvailability(zipcode: string, state: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('promon:CheckAvailability', 'SERV:promon:', { zipcode, state });
  },
};

export default ProMonitoringService;

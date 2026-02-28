import Bridge from '../bridge';

const NwsSameCodeService = {
  ListSameCounties(stateCode: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('nwssamecode:ListSameCounties', 'SERV:nwssamecode:', { stateCode });
  },

  ListSameStates(): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('nwssamecode:ListSameStates', 'SERV:nwssamecode:', {});
  },

  GetSameCode(stateCode: string, county: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('nwssamecode:GetSameCode', 'SERV:nwssamecode:', { stateCode, county });
  },
};

export default NwsSameCodeService;

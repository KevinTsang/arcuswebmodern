import Bridge from '../bridge';
import type { GetSameCodeResponse, ListSameCountiesResponse, ListSameStatesResponse } from './types';

const NwsSameCodeService = {
  ListSameCounties(stateCode: string): Promise<ListSameCountiesResponse> {
    return Bridge.restfulRequest<ListSameCountiesResponse>('nwssamecode:ListSameCounties', 'SERV:nwssamecode:', { stateCode });
  },

  ListSameStates(): Promise<ListSameStatesResponse> {
    return Bridge.restfulRequest<ListSameStatesResponse>('nwssamecode:ListSameStates', 'SERV:nwssamecode:', {});
  },

  GetSameCode(stateCode: string, county: string): Promise<GetSameCodeResponse> {
    return Bridge.restfulRequest<GetSameCodeResponse>('nwssamecode:GetSameCode', 'SERV:nwssamecode:', { stateCode, county });
  },
};

export default NwsSameCodeService;

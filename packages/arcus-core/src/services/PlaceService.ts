import Bridge from '../bridge';

export interface StreetAddress {
  [key: string]: unknown;
}

const PlaceService = {
  ListTimezones(): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('place:ListTimezones', 'SERV:place:', {});
  },

  ValidateAddress(placeId?: string, streetAddress?: StreetAddress): Promise<Record<string, unknown>> {
    return Bridge.request('place:ValidateAddress', 'SERV:place:', { placeId, streetAddress });
  },
};

export default PlaceService;

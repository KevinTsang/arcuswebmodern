import Bridge from '../bridge';

export interface ApiKeyMeta {
  id: string;
  label: string;
  keyPrefix: string;
  permissions: string[];
  created: number | null;
  lastUsed: number | null;
  expiresAt: number | null;
  expired: boolean;
}

const ApiKeyService = {
  Create(placeId: string, label: string, permissions: string[]): Promise<Record<string, unknown>> {
    return Bridge.request('apikey:Create', `SERV:place:${placeId}`, {
      placeId,
      label,
      permissions,
    });
  },

  ListKeys(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('apikey:ListKeys', `SERV:place:${placeId}`, { placeId });
  },

  Revoke(placeId: string, id: string): Promise<Record<string, unknown>> {
    return Bridge.request('apikey:Revoke', `SERV:place:${placeId}`, { placeId, id });
  },

  Delete(placeId: string, id: string): Promise<Record<string, unknown>> {
    return Bridge.request('apikey:Delete', `SERV:place:${placeId}`, { placeId, id });
  },
};

export default ApiKeyService;

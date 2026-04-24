import Bridge from '../bridge';
import cornea from '../cornea';
import type {
  ListAvailablePlacesResponse,
  GetPreferencesResponse,
  Preferences,
} from '../../../../src/arcus/types';

const SessionService = {
  onActivePlaceCleared(callback: () => void): void {
    cornea.on('sess sess:ActivePlaceCleared', callback);
  },
  onSessionExpired(callback: () => void): void {
    cornea.on('sess sess:SessionExpired', callback);
  },
  onPreferencesChanged(callback: (data: GetPreferencesResponse) => void): void {
    cornea.on('sess sess:PreferencesChanged', callback);
  },
  onTagged(callback: (data: { name: string }) => void): void {
    cornea.on('sess sess:Tagged', callback);
  },

  SetActivePlace(placeId: string): Promise<void> {
    return Bridge.request('sess:SetActivePlace', 'SERV:sess:', { placeId }) as Promise<void>;
  },

  Log(category: string, code: string, message?: string): Promise<void> {
    return Bridge.request('sess:Log', 'SERV:sess:', { category, code, message }) as Promise<void>;
  },

  Tag(name: string, context?: Record<string, string>): Promise<void> {
    return Bridge.request('sess:Tag', 'SERV:sess:', { name, context }) as Promise<void>;
  },

  ListAvailablePlaces(): Promise<ListAvailablePlacesResponse> {
    return Bridge.request<ListAvailablePlacesResponse>('sess:ListAvailablePlaces', 'SERV:sess:', {});
  },

  GetPreferences(): Promise<GetPreferencesResponse> {
    return Bridge.request<GetPreferencesResponse>('sess:GetPreferences', 'SERV:sess:', {});
  },

  SetPreferences(prefs: Preferences): Promise<void> {
    return Bridge.request('sess:SetPreferences', 'SERV:sess:', { prefs }) as Promise<void>;
  },

  ResetPreference(prefKey: string): Promise<void> {
    return Bridge.request('sess:ResetPreference', 'SERV:sess:', { prefKey }) as Promise<void>;
  },

  LockDevice(deviceIdentifier: string, reason: string): Promise<void> {
    return Bridge.restfulRequest('sess:LockDevice', 'SERV:sess:', { deviceIdentifier, reason }) as Promise<void>;
  },
};

export default SessionService;

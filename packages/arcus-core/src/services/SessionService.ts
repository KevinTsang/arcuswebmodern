import Bridge from '../bridge';
import cornea from '../cornea';

const SessionService = {
  onActivePlaceCleared(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('sess sess:ActivePlaceCleared', callback);
  },
  onSessionExpired(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('sess sess:SessionExpired', callback);
  },
  onPreferencesChanged(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('sess sess:PreferencesChanged', callback);
  },
  onTagged(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('sess sess:Tagged', callback);
  },

  SetActivePlace(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('sess:SetActivePlace', 'SERV:sess:', { placeId });
  },

  Log(category: string, code: string, message?: string): Promise<Record<string, unknown>> {
    return Bridge.request('sess:Log', 'SERV:sess:', { category, code, message });
  },

  Tag(name: string, context?: Record<string, string>): Promise<Record<string, unknown>> {
    return Bridge.request('sess:Tag', 'SERV:sess:', { name, context });
  },

  ListAvailablePlaces(): Promise<Record<string, unknown>> {
    return Bridge.request('sess:ListAvailablePlaces', 'SERV:sess:', {});
  },

  GetPreferences(): Promise<Record<string, unknown>> {
    return Bridge.request('sess:GetPreferences', 'SERV:sess:', {});
  },

  SetPreferences(prefs: Record<string, unknown>): Promise<Record<string, unknown>> {
    return Bridge.request('sess:SetPreferences', 'SERV:sess:', { prefs });
  },

  ResetPreference(prefKey: string): Promise<Record<string, unknown>> {
    return Bridge.request('sess:ResetPreference', 'SERV:sess:', { prefKey });
  },

  LockDevice(deviceIdentifier: string, reason: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('sess:LockDevice', 'SERV:sess:', { deviceIdentifier, reason });
  },
};

export default SessionService;

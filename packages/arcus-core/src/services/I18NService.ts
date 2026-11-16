import Bridge from '../bridge';

/** The response of `i18n:LoadLocalizedStrings`: each string keyed by `<bundle>:<key>`. */
export interface LoadLocalizedStringsResponse {
  localizedStrings: Record<string, string>;
}

/** The `i18n:LoadLocalizedStrings` command name. */
export const CMD_LOADLOCALIZEDSTRINGS = 'i18n:LoadLocalizedStrings';

const I18NService = {
  CMD_LOADLOCALIZEDSTRINGS,

  LoadLocalizedStrings(bundleNames?: string[], locale?: string): Promise<LoadLocalizedStringsResponse> {
    return Bridge.restfulRequest<LoadLocalizedStringsResponse>(CMD_LOADLOCALIZEDSTRINGS, 'SERV:i18n:', {
      bundleNames,
      locale,
    });
  },
};

export default I18NService;

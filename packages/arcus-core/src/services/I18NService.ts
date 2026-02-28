import Bridge from '../bridge';

const I18NService = {
  LoadLocalizedStrings(bundleNames?: string[], locale?: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('i18n:LoadLocalizedStrings', 'SERV:i18n:', { bundleNames, locale });
  },
};

export default I18NService;

import Bridge from '../bridge';

const SupportSearchService = {
  SupportMainSearch(critera: string, from: number, size: number): Promise<Record<string, unknown>> {
    return Bridge.request('supportsearch:SupportMainSearch', 'SERV:supportsearch:', { critera, from, size });
  },
};

export default SupportSearchService;

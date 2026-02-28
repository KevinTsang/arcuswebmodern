import Bridge from '../bridge';

const EasCodeService = {
  ListEasCodes(): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('eascode:ListEasCodes', 'SERV:eascode:', {});
  },
};

export default EasCodeService;

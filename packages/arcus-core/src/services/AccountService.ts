import Bridge from '../bridge';

export interface CreateAccountParams {
  email: string;
  password: string;
  optin: string;
  isPublic?: string;
  person?: Record<string, unknown>;
  place?: Record<string, unknown>;
}

const AccountService = {
  CreateAccount(params: CreateAccountParams): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('account:CreateAccount', 'SERV:account:', params);
  },
};

export default AccountService;

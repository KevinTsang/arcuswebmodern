import Bridge from '../bridge';

const PersonService = {
  SendPasswordReset(email: string, method: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('person:SendPasswordReset', 'SERV:person:', { email, method });
  },

  ResetPassword(email: string, token: string, password: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('person:ResetPassword', 'SERV:person:', { email, token, password });
  },

  ChangePassword(currentPassword: string, newPassword: string, emailAddress?: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('person:ChangePassword', 'SERV:person:', {
      currentPassword, newPassword, emailAddress,
    });
  },
};

export default PersonService;

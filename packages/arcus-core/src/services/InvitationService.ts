import Bridge from '../bridge';

const InvitationService = {
  GetInvitation(code: string, inviteeEmail: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('invite:GetInvitation', 'SERV:invite:', { code, inviteeEmail });
  },

  AcceptInvitationCreateLogin(
    person: Record<string, unknown>,
    password: string,
    code: string,
    inviteeEmail: string,
  ): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('invite:AcceptInvitationCreateLogin', 'SERV:invite:', {
      person, password, code, inviteeEmail,
    });
  },
};

export default InvitationService;

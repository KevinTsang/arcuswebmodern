import Bridge from '../bridge';
import type { GetInvitationResponse } from './types';

const InvitationService = {
  GetInvitation(code: string, inviteeEmail: string): Promise<GetInvitationResponse> {
    return Bridge.restfulRequest<GetInvitationResponse>('invite:GetInvitation', 'SERV:invite:', { code, inviteeEmail });
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

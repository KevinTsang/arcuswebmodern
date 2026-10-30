/**
 * PRD §1 — Authentication & Onboarding (login, session restore, logout,
 * expiry) against the fake platform. Form rendering and validation of the
 * public pages live in login.cy.ts / create-account.cy.ts / invite.cy.ts.
 */

import { LOGIN } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

function login(email: string, password: string) {
  cy.get('input#email').type(email);
  cy.get('input#password').type(password);
  tid('login-submit').click();
}

describe('Authentication', () => {
  it('logs in with email and password and lands on the dashboard', () => {
    cy.visit('/login');
    login(LOGIN.email, LOGIN.password);

    cy.location('pathname', { timeout: 20000 }).should('eq', '/home');
    tid('header-greeting').should('have.text', 'Hello, Alex');
    tid('dashboard-place-name').should('contain', 'Maple Street');

    // The session was scoped to the owner place and the place data loaded.
    cy.expectRequestAttrs('sess:SetActivePlace', { placeId: 'place-maple' });
    cy.expectRequest('place:ListDevices');
  });

  it('sends the public-computer flag with the credentials', () => {
    cy.visit('/login');
    cy.get('input#isPublic').check();
    login(LOGIN.email, LOGIN.password);

    cy.wait('@platformRest').its('request.body').should('include', 'public=true');
    cy.location('pathname', { timeout: 20000 }).should('eq', '/home');
  });

  it('stops retrying the session socket once a restore is rejected', () => {
    cy.visit('/login');
    tid('login-submit').should('be.visible');
    cy.platform().its('connectionAttempts').should('be.gte', 1);

    // A rejected upgrade must not leave the socket reconnecting behind the
    // login form, where each failure could land in the next login attempt.
    cy.platform().then((p) => {
      const attempts = p.connectionAttempts;
      cy.wait(2000);
      cy.platform().its('connectionAttempts').should('eq', attempts);
    });

    login(LOGIN.email, LOGIN.password);
    cy.location('pathname', { timeout: 20000 }).should('eq', '/home');
  });

  it('rejects bad credentials and stays on the login page', () => {
    cy.visit('/login');
    login(LOGIN.email, 'not-the-password');

    tid('login-error').should('have.text', 'Invalid username or password');
    cy.location('pathname').should('eq', '/login');
    cy.platform().its('authenticated').should('eq', false);
  });

  it('honours the redirect query after login', () => {
    cy.visit('/login?redirect=/scenes');
    login(LOGIN.email, LOGIN.password);

    cy.location('pathname', { timeout: 20000 }).should('eq', '/scenes');
    tid('scenes-title').should('have.text', 'Scenes');
  });

  it('restores an existing session on a hard refresh', () => {
    cy.signIn({ path: '/devices' });
    tid('devices-title').should('have.text', 'Devices');

    cy.reload();
    cy.get('[data-testid="devices-title"]', { timeout: 20000 }).should('have.text', 'Devices');
    tid('header-greeting').should('have.text', 'Hello, Alex');
    // No credentials were posted — the session came from the cookie-backed socket.
    cy.platform().then((p) => {
      expect(p.requestsOf('sess:SetActivePlace').length).to.be.greaterThan(1);
    });
  });

  it('stays signed in when the connection fails and reconnects', () => {
    cy.signIn();
    cy.platform().invoke('failConnections');

    // partysocket reconnects on the still-valid session; nothing posts /logout.
    cy.platform().its('openSocketCount', { timeout: 10000 }).should('eq', 1);
    cy.platform().its('authenticated').should('eq', true);
    cy.location('pathname').should('eq', '/home');
    tid('header-greeting').should('have.text', 'Hello, Alex');
  });

  it('logs out from the place selector and returns to login', () => {
    cy.signIn();
    tid('header-places').click();
    tid('logout').click();

    cy.location('pathname', { timeout: 20000 }).should('eq', '/login');
    cy.platform().its('authenticated').should('eq', false);
    cy.platform().its('openSocketCount').should('eq', 0);
  });

  it('redirects to login with a notice when the platform expires the session', () => {
    cy.signIn();
    cy.platform().invoke('expireSession');

    cy.location('pathname', { timeout: 20000 }).should('eq', '/login');
    cy.location('search').should('include', 'expired=1');
    tid('session-expired-notice').should('be.visible');
  });

  it('redirects to login when the platform closes the socket as unauthorized', () => {
    cy.signIn();
    cy.platform().invoke('dropConnections', 4001);

    cy.location('pathname', { timeout: 20000 }).should('eq', '/login');
    tid('session-expired-notice').should('be.visible');
  });

  it('sends the password reset email and reaches the confirmation screen', () => {
    cy.visit('/login?view=send-code');
    cy.get('input#resetEmail').type(LOGIN.email);
    tid('reset-send').click();

    tid('reset-check-inbox').should('be.visible');
    cy.expectRequestAttrs('person:SendPasswordReset', { email: LOGIN.email, method: 'email' });

    cy.get('input#code').type('RESET-99');
    cy.get('input#newPassword').type('Brandnew99');
    cy.get('input#confirmPassword').type('Brandnew99');
    tid('reset-submit').click();

    tid('reset-confirmation').should('contain', 'successfully been reset');
    cy.platform().its('data.login.password').should('eq', 'Brandnew99');
  });

  it('shows the platform error when the reset code is wrong', () => {
    cy.visit('/login?view=reset-password');
    cy.get('input#rpEmail').type(LOGIN.email);
    cy.get('input#code').type('WRONG');
    cy.get('input#newPassword').type('Brandnew99');
    cy.get('input#confirmPassword').type('Brandnew99');
    tid('reset-submit').click();

    tid('reset-error').should('have.text', 'Invalid reset code');
    cy.location('search').should('include', 'view=reset-password');
  });
});

/**
 * PRD §1 — Create-account and accept-invitation wizards end to end.
 * The people/places these flows create are removed by the global cleanup.
 */

import { tid } from '../support/selectors';

function fillCredentials() {
  cy.get('input#firstName').type('Taylor');
  cy.get('input#lastName').type('Brooks');
  cy.get('input#email').type('taylor@example.com');
  cy.get('input#password').type('Welcome123');
  cy.get('input#confirmPassword').type('Welcome123');
}

describe('Create account wizard', () => {
  it('creates an account, saves the address and PIN, and reaches the dashboard', () => {
    cy.visit('/create-account');
    tid('create-account-step').should('have.attr', 'data-step', 'credentials');

    fillCredentials();
    cy.get('input#phone').type('5550001111');
    tid('create-account-optin').check();
    tid('create-account-submit').click();

    cy.expectRequestAttrs('account:CreateAccount', {
      email: 'taylor@example.com',
      optin: 'true',
    }).its('attributes.person').should('deep.include', {
      'person:firstName': 'Taylor',
      'person:lastName': 'Brooks',
    });

    // Step 2 — address
    tid('create-account-step').should('have.attr', 'data-step', 'address');
    cy.get('input#street1').type('42 Elm Court');
    cy.get('input#city').type('Springfield');
    cy.get('input#state').type('IL');
    cy.get('input#zip').type('62702');
    tid('address-save').click();
    cy.expectRequestAttrs('base:SetAttributes', { 'place:streetAddress1': '42 Elm Court' });

    // Step 3 — PIN
    tid('create-account-step').should('have.attr', 'data-step', 'pin');
    cy.get('input#change-pin').type('2468');
    cy.get('input#change-pin-confirm').type('2468');
    tid('pin-save').click();
    cy.expectRequestAttrs('person:ChangePinV2', { pin: '2468' });

    // Step 4 — welcome → dashboard
    tid('create-account-step').should('have.attr', 'data-step', 'welcome');
    tid('welcome-title').should('have.text', 'Welcome, Taylor!');
    tid('welcome-finish').click();
    cy.location('pathname', { timeout: 20000 }).should('eq', '/home');
    tid('header-greeting').should('have.text', 'Hello, Taylor');
    tid('dashboard-place-name').should('contain', 'My Home');
  });

  it('shows an error when the platform refuses the account', () => {
    cy.platform().invoke('failRequest', 'account:CreateAccount', 'error.duplicate', 'Email in use');
    cy.visit('/create-account');
    fillCredentials();
    tid('create-account-submit').click();

    tid('create-account-error').should('contain', 'Failed to create account');
    tid('create-account-step').should('have.attr', 'data-step', 'credentials');
  });

  it('lets the address and PIN steps be skipped', () => {
    cy.visit('/create-account');
    fillCredentials();
    tid('create-account-submit').click();

    tid('create-account-step').should('have.attr', 'data-step', 'address');
    tid('address-skip').click();
    tid('create-account-step').should('have.attr', 'data-step', 'pin');
    tid('pin-skip').click();
    tid('create-account-step').should('have.attr', 'data-step', 'welcome');
    cy.platform().then((p) => {
      expect(p.requestsOf('person:ChangePinV2')).to.have.length(0);
    });
  });
});

describe('Accept invitation wizard', () => {
  it('looks up the code, creates a login, sets a PIN and opens the new place', () => {
    cy.visit('/invite');
    cy.get('input#inviteCode').type('INVITE-42');
    cy.get('input#inviteeEmail').type('jordan@example.com');
    tid('invite-lookup').click();

    tid('invite-greeting').should('have.text', 'Hello, Jordan!');
    tid('invite-summary').should('contain', "Casey Nguyen's place called River Cabin");
    tid('invite-next').click();

    cy.get('input#firstName').should('have.value', 'Jordan');
    cy.get('input#lastName').type('Lee');
    cy.get('input#phone').type('5552223333');
    cy.get('input#password').type('Welcome123');
    cy.get('input#confirmPassword').type('Welcome123');
    tid('invite-create-login').click();

    cy.expectRequestAttrs('invite:AcceptInvitationCreateLogin', {
      code: 'INVITE-42',
      inviteeEmail: 'jordan@example.com',
    });

    cy.get('input#change-pin', { timeout: 20000 }).type('1357');
    cy.get('input#change-pin-confirm').type('1357');
    tid('pin-save').click();
    cy.expectRequestAttrs('person:ChangePinV2', { place: 'place-river', pin: '1357' });

    tid('invite-welcome').should('have.text', 'Welcome, Jordan!');
    tid('invite-finish').click();
    cy.location('pathname', { timeout: 20000 }).should('eq', '/home');
    tid('dashboard-place-name').should('contain', 'River Cabin');
  });

  it('rejects an unknown invitation code', () => {
    cy.visit('/invite');
    cy.get('input#inviteCode').type('NOPE');
    cy.get('input#inviteeEmail').type('jordan@example.com');
    tid('invite-lookup').click();
    tid('invite-error').should('contain', 'invitation code not recognized');
  });
});

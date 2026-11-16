/**
 * PRD §§15–17 — Settings: profile (contact info, password, PIN), people &
 * places (invite, remove, add/edit place), invitation code entry, pending
 * invitations, and multi-place switching.
 */

import { Account, Base, Person, Place } from '../../packages/arcus-core/src/capabilities/capabilities';
import { ACCOUNT_ID, GUEST_PERSON_ID, LAKE_PLACE_ID, LOGIN, PLACE_ID, addr } from '../support/platform/fixtures';
import { PlatformFailure } from '../support/platform/types';
import { tid } from '../support/selectors';

/** A settings `Field` input, keyed by its label slug. */
const field = (slug: string) => tid(`field-${slug}`);
/** InfoRow values are scoped by their card: `<card test id>-value-<label slug>`. */
const profileValue = (cardSlug: string, label: string) => tid(`info-card-${cardSlug}-value-${label}`);
const placeValue = (placeId: string, label: string) => tid(`place-info-${placeId}-value-${label}`);
const cardAction = (cardSlug: string) => tid(`info-card-${cardSlug}-action`).find('button');
const placeCard = (placeId: string) => tid(`place-card-${placeId}`);

describe('Profile settings', () => {
  beforeEach(() => {
    cy.signIn({ path: '/settings' });
  });

  it('shows the profile and plan', () => {
    profileValue('contact-information', 'name').should('have.text', 'Alex Rivera');
    profileValue('email', 'email').should('have.text', LOGIN.email);
    profileValue('contact-information', 'phone').should('have.text', '5551234567');
    profileValue('service-plan', 'current-plan').should('have.text', 'Basic');
  });

  it('edits contact information', () => {
    cardAction('contact-information').click();
    tid('side-panel-right-title').should('have.text', 'Edit Contact Info');
    field('first-name').should('have.value', 'Alex');
    field('phone').clear().type('5550009999');
    tid('contact-save').click();

    // Sent in the "(555) 123-4567" format the platform stores phone numbers in.
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === addr.person && r.attributes[Person.ATTR_MOBILENUMBER] === '(555) 000-9999');
    cy.toast('Contact info updated.');
    tid('contact-save').should('not.exist');
  });

  it('changes the password', () => {
    cardAction('password').click();
    tid('password-change').should('be.disabled');
    field('current-password').type(LOGIN.password);
    field('new-password').type('Newpass123');
    field('confirm-new-password').type('Newpass123');
    tid('password-change').click();

    cy.expectRequestAttrs('person:ChangePassword', {
      currentPassword: LOGIN.password,
      newPassword: 'Newpass123',
      emailAddress: LOGIN.email,
    });
    cy.toast('Password changed.');
    cy.platform().its('data.login.password').should('eq', 'Newpass123');
  });

  it('validates the new password locally and reports a wrong current password', () => {
    cardAction('password').click();
    field('current-password').type('wrong');
    field('new-password').type('Newpass123');
    field('confirm-new-password').type('Different1');
    tid('password-change').click();
    tid('password-error').should('have.text', 'Passwords do not match.');

    field('confirm-new-password').clear().type('Newpass123');
    tid('password-change').click();
    tid('password-error').should('contain', 'Check your current password');
  });

  it('changes the PIN code', () => {
    cardAction('pin-code').click();
    tid('side-panel-right-title').should('have.text', 'Change PIN Code');
    cy.get('input#change-pin').type('8642');
    cy.get('input#change-pin-confirm').type('8642');
    tid('pin-save').click();

    cy.expectRequest(Person.CMD_CHANGEPINV2, (r) =>
      r.transport === 'rest' && r.destination === addr.person && r.attributes.pin === '8642'
      && r.attributes.place === PLACE_ID);
    cy.toast('PIN code updated.');
  });

  it('rejects a malformed PIN before calling the platform', () => {
    cardAction('pin-code').click();
    cy.get('input#change-pin').type('12');
    cy.get('input#change-pin-confirm').type('12');
    tid('pin-save').click();
    tid('pin-error').should('have.text', 'PIN must be 4-8 digits.');
    cy.platform().then((p) => expect(p.requestsOf(Person.CMD_CHANGEPINV2)).to.be.empty);
  });
});

describe('Account management', () => {
  beforeEach(() => {
    cy.signIn({ path: '/settings' });
  });

  it('shows the email as unverified and sends a verification email', () => {
    profileValue('email', 'status').should('have.text', 'Not verified');
    tid('email-send-verification').click();
    cy.expectRequest(Person.CMD_SENDVERIFICATIONEMAIL, (r) =>
      r.transport === 'rest' && r.destination === addr.person && r.attributes.source === 'WEB');
    cy.toast(`Verification email sent to ${LOGIN.email}.`);
  });

  it('shows a verified email without the send button', () => {
    cy.platform().then((p) => {
      p.data.entities[addr.person][Person.ATTR_EMAILVERIFIED] = Date.now();
    });
    cy.reload();
    profileValue('email', 'status').should('have.text', 'Verified');
    tid('email-send-verification').should('not.exist');
  });

  it('changes the email', () => {
    cardAction('email').click();
    tid('side-panel-right-title').should('have.text', 'Change Email');
    field('new-email').type('alex.new@example.com');
    field('confirm-new-email').type('alex.new@example.com');
    tid('change-email-save').click();

    cy.expectRequestAttrs(Base.CMD_SETATTRIBUTES, { [Person.ATTR_EMAIL]: 'alex.new@example.com' });
    cy.toast('Email changed. Use it the next time you sign in.');
    profileValue('email', 'email').should('have.text', 'alex.new@example.com');
    profileValue('email', 'status').should('have.text', 'Not verified');
  });

  it('rejects a mismatched email confirmation before calling the platform', () => {
    cardAction('email').click();
    field('new-email').type('alex.new@example.com');
    field('confirm-new-email').type('alex.other@example.com');
    tid('change-email-save').click();
    tid('field-confirm-new-email-error').should('have.text', 'Emails do not match');
    cy.platform().then((p) => expect(p.requestsOf(Base.CMD_SETATTRIBUTES)).to.be.empty);
  });

  it('lists, edits and adds security questions', () => {
    tid('security-question-1').should('contain', 'What city were you born in?');

    tid('security-question-edit-1').click();
    tid('side-panel-right-title').should('have.text', 'Edit Security Question 1');
    field('answer').should('have.value', 'Springfield').clear().type('Shelbyville');
    tid('security-question-save').click();
    cy.expectRequestAttrs(Person.CMD_SETSECURITYANSWERS, {
      securityQuestion1: 'question2',
      securityAnswer1: 'Shelbyville',
    });
    cy.toast('Security question saved.');

    tid('security-question-add').click();
    tid('side-panel-right-title').should('have.text', 'Add Security Question 2');
    // A question already answered can't be picked again.
    tid('security-question-select').find('option[value="question2"]').should('not.exist');
    tid('security-question-select').select('question3');
    field('answer').type('Volvo');
    tid('security-question-save').click();
    tid('security-question-2').should('contain', 'What was the make of your first car?');
    cy.platform().its('securityAnswers').should('deep.equal', { question2: 'Shelbyville', question3: 'Volvo' });
  });

  it('shows an error with a retry when security questions fail to load', () => {
    // Fail every load until the retry, so React's dev double-run of effects can't hide the failure.
    let failing = true;
    cy.platform().then((p) => {
      p.onRequest(Person.CMD_GETSECURITYANSWERS, () => {
        if (failing) throw new PlatformFailure('error.test', 'Simulated failure');
        return { securityAnswers: { ...p.securityAnswers } };
      });
    });
    cy.reload();
    tid('security-questions-error').should('be.visible').then(() => {
      failing = false;
    });
    tid('security-questions-retry').click();
    tid('security-question-1').should('contain', 'What city were you born in?');
  });

  it('deletes the owned account after confirmation and signs out', () => {
    cardAction('delete-account').click();
    tid('side-panel-right-title').should('have.text', 'Delete My Arcus Account');
    tid('delete-account-submit').should('be.disabled');
    field('type-delete-to-continue').type('delete');
    tid('delete-account-submit').click();
    tid('delete-account-confirm').should('contain', 'cannot be reversed');
    tid('delete-account-yes').click();

    cy.expectRequest(Account.CMD_DELETE, (r) =>
      r.destination === `SERV:account:${ACCOUNT_ID}` && r.attributes.deleteOwnerLogin === true);
    cy.location('pathname', { timeout: 20000 }).should('eq', '/login');
    cy.platform().its('authenticated').should('eq', false);
  });

  it('keeps the person signed in when deletion fails', () => {
    cy.platform().invoke('failRequest', Account.CMD_DELETE);
    cardAction('delete-account').click();
    field('type-delete-to-continue').type('DELETE');
    tid('delete-account-submit').click();
    tid('delete-account-yes').click();
    tid('delete-account-error').should('contain', 'Please try again later');
    cy.location('pathname').should('eq', '/settings');
  });
});

describe('People & Places', () => {
  beforeEach(() => {
    cy.signIn({ path: '/settings' });
    tid('settings-tab-people-places').click();
  });

  it('lists owned places and guest places with their people', () => {
    tid('owner-places').find(`[data-testid="place-card-${PLACE_ID}"]`).should('exist');
    placeCard(PLACE_ID).should('have.attr', 'data-active', 'true');
    placeValue(PLACE_ID, 'address').should('contain', '123 Maple Street');
    placeValue(PLACE_ID, 'role').should('have.text', 'Owner');
    tid(`place-active-${PLACE_ID}`).should('be.visible');
    tid(`manage-api-keys-${PLACE_ID}`).should('have.attr', 'href', `/settings/api-keys?placeId=${PLACE_ID}`);
    tid(`person-${PLACE_ID}-${GUEST_PERSON_ID}`).should('contain', 'Sam Rivera');
    tid(`person-${PLACE_ID}-person-alex`).should('not.exist');
    tid('guest-places').find(`[data-testid="place-card-${LAKE_PLACE_ID}"]`).should('exist');
    placeCard(LAKE_PLACE_ID).should('have.attr', 'data-active', 'false');
    placeValue(LAKE_PLACE_ID, 'role').should('have.text', 'Full Access');
    placeValue(LAKE_PLACE_ID, 'service-level').should('have.text', 'Premium');
    tid(`place-invite-${LAKE_PLACE_ID}`).should('not.exist');
    tid(`place-edit-${LAKE_PLACE_ID}`).should('not.exist');
  });

  it('invites a person to the place', () => {
    tid(`place-invite-${PLACE_ID}`).click();
    tid('side-panel-right-title').should('have.text', 'Invite a Person');
    tid('invite-send').should('be.disabled');
    field('first-name').type('Robin');
    field('last-name').type('Park');
    field('email').type('robin@example.com');
    tid('invite-relationship').select('Dog Walker');
    tid('invite-send').click();

    cy.expectRequestAttrs(Place.CMD_CREATEINVITATION, {
      firstName: 'Robin',
      lastName: 'Park',
      email: 'robin@example.com',
      relationship: 'people_service_dogwalker',
    });
    cy.expectRequest(Place.CMD_SENDINVITATION, (r) =>
      (r.attributes.invitation as { inviteeEmail: string }).inviteeEmail === 'robin@example.com');
    cy.toast('Invitation sent!');
  });

  it('describes an "other" service relationship', () => {
    tid(`place-invite-${PLACE_ID}`).click();
    field('email').type('pm@example.com');
    tid('invite-relationship').select('Other');
    field('please-describe').type('Property Manager');
    tid('invite-send').click();
    cy.expectRequestAttrs(Place.CMD_CREATEINVITATION, { relationship: 'Property Manager' });
  });

  it('shows a person and removes them from the place', () => {
    tid(`person-${PLACE_ID}-${GUEST_PERSON_ID}-details`).click();
    tid('side-panel-right-title').should('have.text', 'Sam Rivera');
    tid('info-value-email').should('have.text', 'sam@example.com');
    tid('person-remove').click();

    cy.expectRequest(Person.CMD_REMOVEFROMPLACE, (r) =>
      r.destination === addr.guest && r.attributes.placeId === PLACE_ID);
    cy.toast('Person removed.');
    tid(`place-no-people-${PLACE_ID}`).should('be.visible');
    tid(`person-${PLACE_ID}-${GUEST_PERSON_ID}`).should('not.exist');
  });

  it('adds a place', () => {
    tid('add-place').click();
    tid('side-panel-right-title').should('have.text', 'Add a Place');
    tid('place-create').should('be.disabled');
    field('place-name').type('Beach Condo');
    field('city').type('Seaside');
    field('state').type('FL');
    tid('place-create').click();

    cy.expectRequest(Account.CMD_ADDPLACE, (r) => r.destination === addr.account).then((r) => {
      expect(r.attributes.place).to.deep.include({ 'place:name': 'Beach Condo', 'place:city': 'Seaside' });
      expect(r.attributes.serviceLevel).to.eq(Place.SERVICELEVEL_BASIC);
    });
    cy.toast('Place created!');
    tid('add-place-added').should('contain', 'Beach Condo');
    tid('add-place-switch').should('have.text', 'Switch to Beach Condo');
    tid('add-place-done').click();
    cy.platform().then((p) => {
      expect(p.data.places.map((pl) => pl.placeName)).to.include('Beach Condo');
      expect(p.created.size).to.eq(1);
      const newPlaceId = p.data.places.find((pl) => pl.placeName === 'Beach Condo')!.placeId;
      // The places list reloads with the new place; the active place is unchanged.
      placeCard(newPlaceId).should('have.attr', 'data-active', 'false');
      placeCard(PLACE_ID).should('have.attr', 'data-active', 'true');
      // The new place is offered in the place selector.
      tid('header-places').click();
      tid(`place-option-${newPlaceId}`).should('contain', 'Beach Condo');
    });
  });

  it('edits the active place', () => {
    tid(`place-edit-${PLACE_ID}`).click();
    tid('side-panel-right-title').should('have.text', 'Edit Place');
    field('place-name').clear().type('Maple Street House');
    field('zip-code').clear().type('62799');
    tid('place-save').click();

    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === addr.place
      && r.attributes[Place.ATTR_NAME] === 'Maple Street House'
      && r.attributes[Place.ATTR_ZIPCODE] === '62799');
    cy.toast('Place info updated.');
    tid(`place-info-${PLACE_ID}`).find('h3').should('have.text', 'Maple Street House');
    placeValue(PLACE_ID, 'address').should('contain', '62799');
  });
});

describe('Invitation code entry', () => {
  beforeEach(() => {
    cy.signIn({ path: '/settings' });
    tid('settings-tab-invitation').click();
  });

  it('looks up and accepts an invitation', () => {
    field('invitation-code').type('INVITE-42');
    field('email-address').type('jordan@example.com');
    tid('invitation-lookup').click();
    tid('invitation-summary').should('contain', "Casey Nguyen's").and('contain', 'River Cabin');
    tid('invitation-accept').click();
    cy.expectRequestAttrs('invite:AcceptInvitationCreateLogin', { code: 'INVITE-42', inviteeEmail: 'jordan@example.com' });
    cy.toast('Invitation accepted!');
    tid('invitation-summary').should('not.exist');
  });

  it('explains an unrecognised code', () => {
    field('invitation-code').type('BOGUS');
    field('email-address').type('jordan@example.com');
    tid('invitation-lookup').click();
    tid('invitation-error').should('contain', 'invitation code not recognized');
  });
});

describe('Pending invitations', () => {
  const invitation = {
    code: 'PEND-1',
    placeId: 'place-river',
    placeName: 'River Cabin',
    inviteeEmail: LOGIN.email,
    inviteeFirstName: 'Alex',
    inviteeLastName: 'Rivera',
    invitorFirstName: 'Casey',
    invitorLastName: 'Nguyen',
    streetAddress1: '1 River Road',
    city: 'Riverton',
    stateProv: 'OR',
    zipCode: '97001',
  };

  it('accepts an invitation and sets a PIN for the new place', () => {
    cy.signIn({ customize: (p) => { p.data.invitations = [invitation]; } });
    tid('invitation-banner').should('contain', '1 pending invitation').click();

    tid('pending-invitation-PEND-1').should('contain', 'River Cabin').and('contain', 'Invited by Casey Nguyen');
    tid('pending-invitation-accept-PEND-1').click();
    cy.expectRequestAttrs(Person.CMD_ACCEPTINVITATION, { code: 'PEND-1', inviteeEmail: LOGIN.email });

    tid('invitation-pin-title').should('have.text', 'Create a PIN Code');
    cy.get('input#change-pin').type('4321');
    cy.get('input#change-pin-confirm').type('4321');
    tid('pin-save').click();
    cy.expectRequestAttrs(Person.CMD_CHANGEPINV2, { place: 'place-river', pin: '4321' });
    cy.toast('You now have access to River Cabin!');
    tid('invitation-banner').should('not.exist');
  });

  it('declines an invitation', () => {
    cy.signIn({ customize: (p) => { p.data.invitations = [invitation]; } });
    tid('invitation-banner').click();
    tid('pending-invitation-decline-PEND-1').click();
    cy.expectRequestAttrs(Person.CMD_REJECTINVITATION, { code: 'PEND-1' });
    tid('invitation-banner').should('not.exist');
    tid('pending-invitation-PEND-1').should('not.exist');
  });

  it('shows a banner when an invitation arrives while signed in', () => {
    cy.signIn();
    tid('invitation-banner').should('not.exist');
    cy.platform().then((p) => {
      p.data.invitations = [invitation];
      p.emit(addr.place, Person.EVENT_INVITATIONPENDING, {});
    });
    tid('invitation-banner').should('contain', '1 pending invitation');
  });
});

describe('Place switching', () => {
  it('switches the active place and reloads its data', () => {
    cy.signIn();
    tid('dashboard-place-name').should('contain', 'Maple Street');
    tid('header-places').click();
    tid(`place-option-${PLACE_ID}`).should('have.attr', 'data-current', 'true');
    tid(`place-option-${LAKE_PLACE_ID}`).should('have.attr', 'data-current', 'false').click();

    cy.expectRequestAttrs('sess:SetActivePlace', { placeId: LAKE_PLACE_ID });
    cy.expectRequest(Base.CMD_GETATTRIBUTES, (r) => r.destination === addr.lakePlace);
    tid('dashboard-place-name').should('contain', 'Lake House');
    tid(`place-option-${LAKE_PLACE_ID}`).should('not.exist'); // selector closes after switching
  });
});

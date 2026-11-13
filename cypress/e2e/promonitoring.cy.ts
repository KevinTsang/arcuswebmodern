/**
 * PRD §21 — Professional monitoring signup wizard, trial codes and plan choice.
 *
 * `npm run dev:e2e` turns yearly subscriptions on, so the review step offers
 * monthly or annual billing.
 */

import { Base, Person, Place, ProMonitoringSettings } from '../../packages/arcus-core/src/capabilities/capabilities';
import { addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

const step = () => tid('promon-step');

const toReview = () => {
  for (let i = 0; i < 4; i += 1) tid('promon-next').click();
  step().should('have.attr', 'data-step', 'review');
};

describe('Professional monitoring', () => {
  beforeEach(() => {
    cy.signIn({ path: '/promonitoring' });
    cy.expectRequestAttrs('promon:GetSettings', { place: addr.place });
  });

  it('walks through address, alarms, details, permit, activation and test call', () => {
    tid('promon-title').should('have.text', 'Professional Monitoring');

    // 1. Address
    step().should('have.attr', 'data-step', 'address');
    tid('promon-address').should('have.text', '123 Maple Street, Springfield, IL, 62701');
    tid('promon-next').should('have.text', 'Address is Correct').click();

    // 2. Alarms
    step().should('have.attr', 'data-step', 'alarms');
    for (const type of ['security', 'smoke', 'co', 'panic']) tid(`promon-alarm-${type}`).should('exist');
    tid('promon-next').click();

    // 3. Details — prefilled from the existing settings
    step().should('have.attr', 'data-step', 'details');
    tid('promon-adults').should('have.value', '2');
    tid('promon-pets').type('{selectall}1');
    tid('promon-directions-to-your-home').type('Second house on the left');
    tid('promon-gate-code-if-applicable').type('#4411');
    tid('promon-next').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === addr.promon
      && r.attributes['promon:pets'] === 1
      && r.attributes['promon:directions'] === 'Second house on the left'
      && r.attributes['promon:gateCode'] === '#4411');

    // 4. Permit
    step().should('have.attr', 'data-step', 'permit');
    tid('promon-permit-number-optional').type('PERMIT-7');
    tid('promon-next').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === addr.promon && r.attributes['promon:permitNumber'] === 'PERMIT-7');

    // 5. Review & activate
    step().should('have.attr', 'data-step', 'review');
    tid('promon-household').should('have.text', '2 adults, 1 children, 1 pets');
    tid('promon-permit-summary').should('have.text', 'PERMIT-7');
    tid('promon-pin').type('1234');
    tid('promon-next').should('have.text', 'Activate Monitoring').click();
    cy.expectRequest(Person.CMD_VERIFYPIN, (r) =>
      r.destination === addr.person && r.attributes.pin === '1234' && r.attributes.place === 'place-maple');
    cy.expectRequestAttrs(ProMonitoringSettings.CMD_ACTIVATE, { testCall: true, serviceLevel: Place.SERVICELEVEL_PREMIUM_PROMON });

    // 6. Test call (status is polled every 5s)
    step().should('have.attr', 'data-step', 'test');
    tid('promon-test-call').click();
    cy.expectRequest('promon:TestCall', (r) => r.destination === addr.promon);
    tid('promon-test-status').should('have.attr', 'data-status', 'WAITING');
    cy.get('[data-testid="promon-step"]', { timeout: 20000 }).should('have.attr', 'data-step', 'welcome');

    // 7. Done
    tid('promon-done').click();
    cy.location('pathname').should('eq', '/services/alarms/status');
  });

  it('refuses activation with the wrong PIN', () => {
    tid('promon-next').click();
    tid('promon-next').click();
    tid('promon-next').click();
    tid('promon-next').click();
    step().should('have.attr', 'data-step', 'review');
    tid('promon-pin').type('0000');
    tid('promon-next').click();
    tid('promon-error').should('contain', 'Invalid PIN or activation failed');
    cy.platform().then((p) => expect(p.requestsOf('promon:Activate')).to.be.empty);
  });

  it('requires a PIN before activating', () => {
    for (let i = 0; i < 4; i += 1) tid('promon-next').click();
    step().should('have.attr', 'data-step', 'review');
    tid('promon-next').click();
    tid('promon-error').should('have.text', 'Please enter your 4-digit PIN.');
  });

  it('activates the annual plan when chosen', () => {
    toReview();
    tid('promon-plan-monthly').should('be.checked');
    tid('promon-plan-annual').check();
    tid('promon-pin').type('1234');
    tid('promon-next').click();
    cy.expectRequestAttrs(ProMonitoringSettings.CMD_ACTIVATE, {
      testCall: true,
      serviceLevel: Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL,
    });
    step().should('have.attr', 'data-step', 'test');
  });

  it('can go back a step', () => {
    tid('promon-next').click();
    step().should('have.attr', 'data-step', 'alarms');
    tid('promon-back').click();
    step().should('have.attr', 'data-step', 'address');
  });
});

describe('Professional monitoring availability', () => {
  it('asks for a trial code where only the trial group can sign up', () => {
    cy.signIn({ path: '/promonitoring', customize: (p) => { p.data.promonAvailability = ProMonitoringSettings.AVAILABLE_TRIAL; } });
    cy.expectRequest(ProMonitoringSettings.CMD_CHECKAVAILABILITY, (r) => r.destination === addr.promon);
    step().should('have.attr', 'data-step', 'trial');

    tid('promon-trial-code').type('WRONG');
    tid('promon-trial-submit').click();
    tid('promon-trial-error').should('contain', 'please enter the code again');
    tid('promon-trial-submit').should('have.text', 'Try Again');

    tid('promon-trial-code').clear().type('PROMON-7');
    tid('promon-trial-submit').click();
    cy.expectRequest(ProMonitoringSettings.CMD_JOINTRIAL, (r) => r.destination === addr.promon && r.attributes.code === 'PROMON-7');
    step().should('have.attr', 'data-step', 'address');
  });

  it('skips the availability check for trial members', () => {
    cy.signIn({
      path: '/promonitoring',
      customize: (p) => {
        p.data.promonAvailability = ProMonitoringSettings.AVAILABLE_TRIAL;
        p.data.entities[addr.promon][ProMonitoringSettings.ATTR_TRIAL] = true;
      },
    });
    step().should('have.attr', 'data-step', 'address');
    cy.platform().then((p) => expect(p.requestsOf(ProMonitoringSettings.CMD_CHECKAVAILABILITY)).to.be.empty);
  });

  it('says when monitoring is not available at the address', () => {
    cy.signIn({ path: '/promonitoring', customize: (p) => { p.data.promonAvailability = ProMonitoringSettings.AVAILABLE_NONE; } });
    tid('promon-unavailable').should('contain', "isn't available").and('be.visible');
    tid('promon-step').should('not.exist');
  });
});

/**
 * PRD §5 — Rules: My Rules list with enable/disable, template resolution
 * with device names, the rules library, and create / edit / delete.
 */

import { Base, Rule, RuleTemplate } from '../../packages/arcus-core/src/capabilities/capabilities';
import { DEVICE, DEVICE_NAME, RULE, RULE_NAME, addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

/** Rule rows are keyed by the rule's `base:id`. */
function ruleRow(id: string) {
  return cy.get(`[data-testid="rule-row-${id}"]`);
}

const LIGHTS_ON_MOTION = '1';
const LOCK_AT_NIGHT = '2';
const LEAK_ALERT = '3';

describe('Rules', () => {
  beforeEach(() => {
    cy.signIn({ path: '/rules' });
  });

  it('lists rules with their enabled state and description', () => {
    tid('rules-title').should('have.text', 'Rules');
    tid(`rule-name-${LIGHTS_ON_MOTION}`).should('have.text', RULE_NAME.lightsOnMotion);
    tid(`rule-description-${LIGHTS_ON_MOTION}`)
      .should('have.text', 'Turn on the Living Room Lamp when Hallway Motion detects motion');
    tid(`rule-toggle-${LIGHTS_ON_MOTION}`).should('have.attr', 'aria-checked', 'true');
    ruleRow(LOCK_AT_NIGHT).should('have.attr', 'data-enabled', 'false');
    tid(`rule-toggle-${LOCK_AT_NIGHT}`).should('have.attr', 'aria-checked', 'false');
  });

  it('enables and disables a rule', () => {
    tid(`rule-toggle-${LOCK_AT_NIGHT}`).click();
    cy.expectRequest(Rule.CMD_ENABLE, (r) => r.destination === RULE.lockAtNight);
    ruleRow(LOCK_AT_NIGHT).should('have.attr', 'data-enabled', 'true');

    tid(`rule-toggle-${LOCK_AT_NIGHT}`).click();
    cy.expectRequest(Rule.CMD_DISABLE, (r) => r.destination === RULE.lockAtNight);
    ruleRow(LOCK_AT_NIGHT).should('have.attr', 'data-enabled', 'false');
  });

  it('reports a failed toggle', () => {
    cy.platform().invoke('failRequest', Rule.CMD_DISABLE);
    tid(`rule-toggle-${LEAK_ALERT}`).click();
    cy.toast('Failed to disable rule');
    ruleRow(LEAK_ALERT).should('have.attr', 'data-enabled', 'true');
  });

  it('resolves template variables to device names when editing', () => {
    tid(`rule-edit-${LIGHTS_ON_MOTION}`).click();
    tid('rule-panel-title').should('have.text', 'Edit Rule');
    cy.get('[data-testid="rule-name-input"]').should('have.value', RULE_NAME.lightsOnMotion);
    cy.get('[data-testid="rule-var-light"]').should('have.text', DEVICE_NAME.lamp);
    cy.get('[data-testid="rule-var-motion"]').should('have.text', DEVICE_NAME.motion);
    cy.contains('Click a word or phrase above to edit.').should('be.visible');

    // Re-pick the light and save: context + description go back to the platform.
    cy.get('[data-testid="rule-var-light"]').click();
    tid('rule-choose-device-title').should('have.text', 'Choose Device');
    cy.get(`[data-testid="rule-option-${DEVICE.coffee}"]`).click();
    cy.get('[data-testid="rule-var-light"]').should('have.text', DEVICE_NAME.coffee);
    cy.get('[data-testid="rule-name-input"]').clear().type('Hallway coffee on motion');
    cy.get('[data-testid="rule-save"]').click();

    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === RULE.lightsOnMotion
      && r.attributes[Rule.ATTR_NAME] === 'Hallway coffee on motion'
      && r.attributes[Rule.ATTR_DESCRIPTION] === 'Turn on Coffee Maker when Hallway Motion detects motion');
    cy.expectRequest(Rule.CMD_UPDATECONTEXT, (r) =>
      r.destination === RULE.lightsOnMotion
      && (r.attributes.context as Record<string, string>).light === DEVICE.coffee);
    cy.toast('Rule saved');
    tid(`rule-name-${LIGHTS_ON_MOTION}`).should('have.text', 'Hallway coffee on motion');
  });

  it('browses the library by category and creates a rule, then cleans it up', () => {
    cy.get('[data-testid="rules-view-library"]').click();
    cy.get('[data-testid="accordion-lights-switches"]').should('contain', 'Lights & Switches (1)').click();
    cy.get('[data-testid="rule-template-motion-light"]').click();

    tid('rule-panel-title').should('have.text', 'Create Rule');
    cy.get('[data-testid="rule-name-input"]').should('have.value', 'Lights on motion');
    cy.expectRequest(RuleTemplate.CMD_RESOLVE, (r) => r.destination === addr.ruleTemplate('motion-light'));
    cy.get('[data-testid="rule-save"]').should('be.disabled');

    cy.get('[data-testid="rule-var-light"]').click();
    cy.get(`[data-testid="rule-option-${DEVICE.lamp}"]`).click();
    cy.get('[data-testid="rule-var-motion"]').click();
    cy.get(`[data-testid="rule-option-${DEVICE.motion}"]`).click();
    cy.get('[data-testid="rule-name-input"]').clear().type('Lamp follows hallway');
    cy.get('[data-testid="rule-save"]').should('be.enabled').click();

    cy.expectRequest(RuleTemplate.CMD_CREATERULE, (r) => r.destination === addr.ruleTemplate('motion-light'))
      .then((r) => {
        expect(r.attributes).to.deep.include({
          placeId: 'place-maple',
          name: 'Lamp follows hallway',
          description: 'Turn on Living Room Lamp when Hallway Motion detects motion',
        });
        expect(r.attributes.context).to.deep.eq({ light: DEVICE.lamp, motion: DEVICE.motion });
      });
    cy.toast('Rule created');

    cy.get('[data-testid="rules-view-my"]').click();
    cy.platform().then((p) => {
      const address = [...p.created].find((a) => a.startsWith('SERV:rule:'))!;
      const id = p.entity(address)![Base.ATTR_ID] as string;
      tid(`rule-name-${id}`).should('have.text', 'Lamp follows hallway');
      ruleRow(id).should('have.attr', 'data-enabled', 'true');
    });
    cy.platform().its('created.size').should('eq', 1);
  });

  it('lists a template under each of its categories', () => {
    cy.get('[data-testid="rules-view-library"]').click();
    cy.get('[data-testid="accordion-safety"]').should('contain', 'Safety (1)');
    cy.get('[data-testid="accordion-water"]').should('contain', 'Water (1)').click();
    cy.get('[data-testid="rule-template-leak-notify"]').should('be.visible').and('contain', 'Leak notification');
  });

  it('deletes a rule after confirmation', () => {
    tid(`rule-edit-${LEAK_ALERT}`).click();
    cy.get('[data-testid="rule-delete"]').click();
    cy.contains('Are you sure you want to delete this rule?').should('be.visible');
    cy.get('[data-testid="rule-delete-confirm"]').click();

    cy.expectRequest(Rule.CMD_DELETE, (r) => r.destination === RULE.leakAlert);
    cy.toast('Rule deleted');
    ruleRow(LEAK_ALERT).should('not.exist');
  });

  it('shows an empty state when there are no rules', () => {
    cy.platform().then((p) => {
      for (const address of Object.values(RULE)) p.removeEntity(address);
    });
    cy.get('[data-testid="rules-empty"]').should('be.visible');
  });
});

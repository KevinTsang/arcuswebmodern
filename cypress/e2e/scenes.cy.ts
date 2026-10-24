/**
 * PRD §4 — Scenes: list, fire, notification and force-state toggles,
 * create / edit / delete, and scene scheduling (PRD §6).
 */

import { Base, Scene, SceneTemplate } from '../../packages/arcus-core/src/capabilities/capabilities';
import { DEVICE, SCENE, SCENE_NAME } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

/** Scene cards are keyed by the scene's `base:id`. */
function sceneCard(id: string) {
  return cy.get(`[data-testid="scene-card-${id}"]`);
}

const GOOD_NIGHT = 'goodnight';
const MOVIE_TIME = 'movie';

/** The id of the scene a test just created on the platform. */
function createdSceneId() {
  return cy.platform().then((p) => {
    const address = [...p.created].find((a) => a.startsWith('SERV:scene:'))!;
    return p.entity(address)![Base.ATTR_ID] as string;
  });
}

function createScene(name: string, deviceAddress: string) {
  cy.get('[data-testid="add-scene"]').click();
  cy.get('[data-testid="scene-name-input"]').clear().type(name);
  cy.get('[data-testid="scene-action-switch"]').click();
  tid(`scene-device-toggle-${deviceAddress}`).click();
  cy.get('[data-testid="scene-action-back"]').click();
  cy.get('[data-testid="scene-save"]').click();
}

describe('Scenes', () => {
  beforeEach(() => {
    cy.signIn({ path: '/scenes' });
  });

  it('lists scenes with their action counts and schedule marker', () => {
    tid('scenes-title').should('have.text', 'Scenes');
    tid(`scene-name-${GOOD_NIGHT}`).should('have.text', SCENE_NAME.goodNight);
    tid(`scene-meta-${GOOD_NIGHT}`).should('have.text', '1 action · Scheduled');
    tid(`scene-meta-${MOVIE_TIME}`).should('have.text', '1 action');
  });

  it('runs a scene', () => {
    tid(`scene-run-${MOVIE_TIME}`).click();
    cy.expectRequest(Scene.CMD_FIRE, (r) => r.destination === SCENE.movieTime);
    cy.toast(`${SCENE_NAME.movieTime} executed`);
  });

  it('reports a scene that fails to run', () => {
    cy.platform().invoke('failRequest', Scene.CMD_FIRE);
    tid(`scene-run-${MOVIE_TIME}`).click();
    cy.toast(`Failed to run ${SCENE_NAME.movieTime}`);
  });

  it('toggles per-scene notifications', () => {
    tid(`scene-notification-${GOOD_NIGHT}`).should('have.attr', 'data-enabled', 'false').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === SCENE.goodNight && r.attributes[Scene.ATTR_NOTIFICATION] === true);
    tid(`scene-notification-${GOOD_NIGHT}`).should('have.attr', 'data-enabled', 'true');
  });

  it('toggles force device state', () => {
    tid(`scene-force-state-${GOOD_NIGHT}`).should('have.attr', 'aria-checked', 'true').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === SCENE.goodNight && r.attributes[Scene.ATTR_FILTERUNCHANGED] === true);
    tid(`scene-force-state-${GOOD_NIGHT}`).should('have.attr', 'aria-checked', 'false');
  });

  it('creates a scene from the custom template and cleans it up', () => {
    cy.get('[data-testid="add-scene"]').click();
    tid('scene-panel-title').should('have.text', 'Create Scene');
    cy.get('[data-testid="scene-action-unavailable-cameras"]').should('contain', 'no compatible devices');
    cy.get('[data-testid="scene-save"]').should('be.disabled');

    cy.get('[data-testid="scene-name-input"]').clear().type('Leaving Home');
    cy.get('[data-testid="scene-action-switch"]').click();
    tid('scene-action-title').should('have.text', 'Lights & Switches');
    tid(`scene-device-toggle-${DEVICE.lamp}`)
      .should('have.attr', 'aria-checked', 'false').click();
    cy.get(`[data-testid="scene-device-${DEVICE.lamp}"] [role="switch"]`).should('have.length', 2); // device + ON/OFF
    cy.get('[data-testid="scene-action-back"]').click();
    tid('scene-action-count-switch').should('have.text', '1');
    cy.get('[data-testid="scene-save"]').should('be.enabled').click();

    cy.expectRequest(SceneTemplate.CMD_CREATE, (r) => r.destination === 'SERV:scenetmpl:custom').then((r) => {
      expect(r.attributes.name).to.eq('Leaving Home');
      const actions = r.attributes.actions as Array<{ template: string; context: Record<string, unknown> }>;
      expect(actions).to.have.length(1);
      expect(actions[0].template).to.eq('switch');
      expect(actions[0].context).to.have.property(DEVICE.lamp);
    });
    cy.toast('Scene created');
    createdSceneId().then((id) => {
      tid(`scene-name-${id}`).should('have.text', 'Leaving Home');
      tid(`scene-meta-${id}`).should('have.text', '1 action');
    });
    cy.platform().its('created.size').should('eq', 1);
  });

  it('deletes a scene it created through the UI', () => {
    createScene('Temporary', DEVICE.coffee);
    cy.toast('Scene created');
    createdSceneId().then((id) => {
      tid(`scene-edit-${id}`).click();
      tid('scene-panel-title').should('have.text', 'Edit Scene');
      cy.get('[data-testid="scene-delete"]').click();
      cy.contains('Are you sure you want to delete this scene?').should('be.visible');
      cy.get('[data-testid="scene-delete-confirm"]').click();

      cy.expectRequest(Scene.CMD_DELETE);
      cy.toast('Scene deleted');
      sceneCard(id).should('not.exist');
    });
    cy.platform().its('created.size').should('eq', 0);
  });

  it('edits a scene name', () => {
    tid(`scene-edit-${MOVIE_TIME}`).click();
    tid('scene-panel-title').should('have.text', 'Edit Scene');
    cy.get('[data-testid="scene-name-input"]').should('have.value', SCENE_NAME.movieTime).clear().type('Film Night');
    cy.get('[data-testid="scene-save"]').click();

    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === SCENE.movieTime && r.attributes[Scene.ATTR_NAME] === 'Film Night');
    cy.toast('Scene saved');
    tid(`scene-name-${MOVIE_TIME}`).should('have.text', 'Film Night');
  });

  it('shows an empty state when there are no scenes', () => {
    cy.platform().then((p) => {
      p.removeEntity(SCENE.goodNight);
      p.removeEntity(SCENE.movieTime);
    });
    cy.get('[data-testid="scenes-empty"]').should('be.visible');
  });

  describe('scheduling', () => {
    it('shows the existing schedule and adds a weekly event', () => {
      tid(`scene-schedule-${GOOD_NIGHT}`).click();
      tid('schedule-title').should('have.text', 'Schedule');
      cy.get('[data-testid^="schedule-event-cmd-1-"]').should('have.length', 5)
        .first().should('have.attr', 'data-time', '22:00:00');

      cy.get('[data-testid="schedule-add-event"]').click();
      cy.get('[data-testid="schedule-day-sat"]').should('have.attr', 'aria-pressed', 'false').click(); // Mon–Fri default
      cy.get('[data-testid="schedule-hour"]').select('7');
      cy.get('[data-testid="schedule-ampm"]').should('have.text', 'PM').click(); // 7 PM → 7 AM
      cy.get('[data-testid="schedule-save"]').click();

      cy.expectRequest('scheduler:ScheduleWeeklyCommand').then((r) => {
        expect(r.attributes).to.deep.include({
          target: SCENE.goodNight,
          schedule: 'FIRE',
          mode: 'ABSOLUTE',
          time: '07:00:00',
          messageType: Scene.CMD_FIRE,
        });
        expect(r.attributes.days).to.have.members(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
      });
      cy.toast('Event created.');
      cy.get('[data-testid^="schedule-event-cmd-new-"]').should('have.length', 6)
        .first().should('have.attr', 'data-time', '07:00:00');
    });

    it('schedules relative to sunset', () => {
      tid(`scene-schedule-${GOOD_NIGHT}`).click();
      cy.get('[data-testid="schedule-add-event"]').click();
      cy.get('[data-testid="schedule-mode-sunset"]').click();
      cy.get('[data-testid="schedule-offset"]').type('{selectall}45');
      cy.get('[data-testid="schedule-offset-before"]').click();
      cy.get('[data-testid="schedule-save"]').click();
      cy.expectRequestAttrs('scheduler:ScheduleWeeklyCommand', { mode: 'SUNSET', offsetMinutes: -45 });
    });

    it('edits and deletes an existing event', () => {
      tid(`scene-schedule-${GOOD_NIGHT}`).click();
      cy.get('[data-testid^="schedule-event-cmd-1-"]').first().click();
      cy.get('[data-testid="schedule-save"]').should('have.text', 'Update');
      cy.get('[data-testid="schedule-day-sun"]').click();
      cy.get('[data-testid="schedule-save"]').click();
      cy.expectRequest('scheduler:UpdateWeeklyCommand').then((r) => {
        expect(r.attributes.commandId).to.eq('cmd-1');
        expect(r.attributes.days).to.include('SUN');
      });
      cy.toast('Event updated.');
      cy.get('[data-testid^="schedule-event-cmd-1-"]').should('have.length', 6);

      cy.get('[data-testid^="schedule-event-cmd-1-"]').first().click();
      cy.get('[data-testid="schedule-delete"]').click();
      cy.expectRequestAttrs('scheduler:DeleteCommand', { target: SCENE.goodNight, commandId: 'cmd-1' });
      cy.toast('Event deleted.');
      cy.get('[data-testid="schedule-empty"]').should('be.visible');
    });

    it('requires at least one day', () => {
      tid(`scene-schedule-${MOVIE_TIME}`).click();
      cy.get('[data-testid="schedule-empty"]').should('be.visible');
      cy.get('[data-testid="schedule-add-event"]').click();
      for (const day of ['mon', 'tue', 'wed', 'thu', 'fri']) cy.get(`[data-testid="schedule-day-${day}"]`).click();
      cy.get('[data-testid="schedule-save"]').click();
      cy.toast('Select at least one day.');
      cy.platform().then((p) => expect(p.requestsOf('scheduler:ScheduleWeeklyCommand')).to.be.empty);
    });
  });
});

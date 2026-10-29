/**
 * PRD §7 — Alarms & Security: status, arm/disarm/partial, incident
 * tracker + banner + redirect, and the settings tab (general toggles, call
 * tree, per-mode delays and sounds, device participation).
 */

import {
  AlarmIncident, AlarmSubsystem, Base, Place, SecurityAlarmMode, SecuritySubsystem,
} from '../../packages/arcus-core/src/capabilities/capabilities';
import { DEVICE, DEVICE_NAME, addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

const SECURITY = addr.subsystem('subsecurity');
const ALARM = addr.subsystem('subalarm');

describe('Alarm status', () => {
  beforeEach(() => {
    cy.signIn({ path: '/services/alarms/status' });
  });

  it('shows the disarmed state and participating devices', () => {
    tid('subsystem-title').should('have.text', 'Alarms');
    tid('alarm-state').should('have.text', 'Disarmed').and('have.attr', 'data-state', 'DISARMED');
    tid('alarm-summary').should('contain', '2 devices');
    tid(`alarm-device-status-${DEVICE.contact}`).should('have.text', 'Ready');
    tid(`alarm-device-status-${DEVICE.motion}`).should('have.text', 'Ready');
    tid('alarm-panic').should('not.exist');
  });

  it('arms fully, then disarms', () => {
    tid('alarm-arm-on').click();
    cy.expectRequest(SecuritySubsystem.CMD_ARM, (r) => r.destination === SECURITY && r.attributes.mode === 'ON');
    cy.toast('Alarm armed');
    tid('alarm-state').should('have.text', 'Armed');
    tid('alarm-summary').should('contain', 'Full');
    tid('alarm-panic').should('not.exist');

    tid('alarm-disarm').click();
    cy.expectRequest(SecuritySubsystem.CMD_DISARM, (r) => r.destination === SECURITY);
    cy.toast('Alarm disarmed');
    tid('alarm-state').should('have.text', 'Disarmed');
  });

  it('arms in partial (stay) mode', () => {
    tid('alarm-arm-partial').click();
    cy.expectRequest(SecuritySubsystem.CMD_ARM, (r) => r.attributes.mode === 'PARTIAL');
    cy.toast('Alarm partially armed');
    tid('alarm-summary').should('contain', 'Partial');
  });

  it('reports a failure to arm', () => {
    cy.platform().invoke('failRequest', SecuritySubsystem.CMD_ARM);
    tid('alarm-arm-on').click();
    cy.toast('Failed to arm alarm');
    tid('alarm-state').should('have.text', 'Disarmed');
  });

  it('shows triggered devices during an alert', () => {
    cy.platform().invoke('updateEntity', SECURITY, {
      [SecuritySubsystem.ATTR_ALARMSTATE]: SecuritySubsystem.ALARMSTATE_ALERT,
      [SecuritySubsystem.ATTR_TRIGGEREDDEVICES]: [DEVICE.contact],
    });
    tid('alarm-state').should('have.text', 'ALERT!');
    tid('alarm-triggered').should('have.text', `Triggered: ${DEVICE_NAME.contact}`);
    tid(`alarm-device-status-${DEVICE.contact}`).should('have.text', 'Triggered');
  });

  it('switches to the settings tab through the route', () => {
    tid('alarm-tab-settings').click();
    cy.location('pathname').should('eq', '/services/alarms/settings');
    tid('alarm-general-title').should('have.text', 'General');
    tid('alarm-tab-status').click();
    cy.location('pathname').should('eq', '/services/alarms/status');
  });
});

describe('Alarm incidents', () => {
  const INCIDENT = addr.incident('inc-1');

  function raiseIncident() {
    cy.platform().then((p) => {
      p.addEntity({
        [Base.ATTR_ADDRESS]: INCIDENT,
        [Base.ATTR_ID]: 'inc-1',
        [Base.ATTR_TYPE]: 'incident',
        [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT,
        [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_SECURITY,
        [AlarmIncident.ATTR_PLACEID]: 'place-maple',
      });
      p.updateEntity(SECURITY, {
        [SecuritySubsystem.ATTR_ALARMSTATE]: SecuritySubsystem.ALARMSTATE_ALERT,
        [SecuritySubsystem.ATTR_ALARMMODE]: SecuritySubsystem.ALARMMODE_ON,
      });
      p.emit(INCIDENT, AlarmIncident.EVENT_SECURITYALERT, { [Base.ATTR_ADDRESS]: INCIDENT });
    });
  }

  it('redirects to the alarm page, shows the banner and cancels the alarm', () => {
    cy.signIn();
    raiseIncident();

    cy.location('pathname', { timeout: 15000 }).should('eq', '/services/alarms/status');
    tid('alarm-banner').should('contain', 'Security Alarm');
    tid('incident-tracker').should('have.attr', 'data-alert-state', 'ALERT');
    tid('incident-label').should('have.text', 'Security Alarm');
    tid('incident-state').should('have.text', 'Alarm is active');

    tid('incident-cancel').click();
    cy.expectRequest(AlarmIncident.CMD_CANCEL, (r) => r.destination === INCIDENT);
    cy.toast('Alarm cancelled');
    tid('incident-tracker').should('not.exist');
    tid('alarm-banner').should('not.exist');
    tid('alarm-state').should('have.text', 'Disarmed');
  });

  it('shows the active incident on the dashboard card', () => {
    cy.signIn({ path: '/scenes' });
    raiseIncident();
    cy.location('pathname', { timeout: 15000 }).should('eq', '/services/alarms/status');
    cy.visit('/home');
    cy.get('[data-testid="card-alarms"]', { timeout: 20000 }).should('contain', 'Alarm Active');
  });

  it('loads an incident that was already active at sign-in', () => {
    cy.signIn({
      path: '/services/alarms/status',
      customize: (p) => {
        p.data.entities[INCIDENT] = {
          [Base.ATTR_ADDRESS]: INCIDENT,
          [Base.ATTR_ID]: 'inc-1',
          [Base.ATTR_TYPE]: 'incident',
          [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_PREALERT,
          [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_SMOKE,
        };
      },
    });
    cy.expectRequest(AlarmSubsystem.CMD_LISTINCIDENTS);
    tid('incident-label').should('have.text', 'Smoke Alarm');
    tid('incident-tracker').should('have.attr', 'data-alert-state', 'PREALERT');
    tid('incident-state').should('contain', 'Pre-alert');
  });

  it('surfaces the hub-offline warning when cancel fails', () => {
    cy.signIn({ path: '/services/alarms/status' });
    raiseIncident();
    cy.platform().invoke('failRequest', AlarmIncident.CMD_CANCEL, 'UnknownDevice', 'Hub offline');
    tid('incident-cancel').click();
    cy.toast('Hub has lost connection');
  });
});

describe('Alarm settings', () => {
  beforeEach(() => {
    cy.signIn({ path: '/services/alarms/settings' });
  });

  it('toggles the general alarm settings', () => {
    tid('setting-fan-shutoff-on-smoke').should('have.attr', 'aria-checked', 'true').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === ALARM && r.attributes[AlarmSubsystem.ATTR_FANSHUTOFFONSMOKE] === false);
    tid('setting-fan-shutoff-on-smoke').should('have.attr', 'aria-checked', 'false');

    tid('setting-fan-shutoff-on-co').should('have.attr', 'aria-checked', 'false').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === ALARM && r.attributes[AlarmSubsystem.ATTR_FANSHUTOFFONCO] === true);
    tid('setting-fan-shutoff-on-co').should('have.attr', 'aria-checked', 'true');

    tid('setting-record-on-security-alarm').should('not.exist');
  });

  it('reorders and toggles the notification call tree', () => {
    tid(`calltree-entry-${addr.person}`).should('have.attr', 'data-position', '1').and('have.attr', 'data-enabled', 'true');
    tid(`calltree-entry-${addr.guest}`).should('have.attr', 'data-position', '2').and('have.attr', 'data-enabled', 'false');

    tid(`calltree-move-down-${addr.person}`).click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) => {
      const tree = r.attributes[AlarmSubsystem.ATTR_CALLTREE] as Array<{ person: string; enabled: boolean }>;
      return r.destination === ALARM && !!tree && tree[0].person === addr.guest && tree[1].person === addr.person;
    });
    tid(`calltree-entry-${addr.guest}`).should('have.attr', 'data-position', '1');
    tid(`calltree-entry-${addr.person}`).should('have.attr', 'data-position', '2');

    tid(`calltree-toggle-${addr.guest}`).click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) => {
      const tree = r.attributes[AlarmSubsystem.ATTR_CALLTREE] as Array<{ person: string; enabled: boolean }>;
      return !!tree && tree.every((entry) => entry.enabled);
    });
    tid(`calltree-entry-${addr.guest}`).should('have.attr', 'data-enabled', 'true');
  });

  it('sets per-mode delays and sounds', () => {
    tid('exit-delay-on').should('have.value', '30').select('60');
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === SECURITY && r.attributes[`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:ON`] === 60);
    tid('exit-delay-on').should('have.value', '60');

    tid('entrance-delay-partial').should('have.value', '15').select('45');
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === SECURITY && r.attributes[`${SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC}:PARTIAL`] === 45);
    tid('entrance-delay-partial').should('have.value', '45');
    tid('exit-delay-partial').should('have.value', '15');

    tid('silent-alarm-partial').should('have.attr', 'aria-checked', 'false').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === SECURITY && r.attributes[`${SecurityAlarmMode.ATTR_SILENT}:PARTIAL`] === true);
    tid('silent-alarm-partial').should('have.attr', 'aria-checked', 'true');
    tid('arming-sounds-on').should('have.attr', 'aria-checked', 'true');
  });

  it('changes which modes a device participates in', () => {
    tid(`participation-select-${DEVICE.motion}`).should('have.value', 'on').select('none');
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) => {
      const on = r.attributes[`${SecurityAlarmMode.ATTR_DEVICES}:ON`] as string[] | undefined;
      const partial = r.attributes[`${SecurityAlarmMode.ATTR_DEVICES}:PARTIAL`] as string[] | undefined;
      return r.destination === SECURITY && !!on && !on.includes(DEVICE.motion)
        && !!partial && !partial.includes(DEVICE.motion);
    });
    tid(`participation-select-${DEVICE.motion}`).should('have.value', 'none');

    tid(`participation-select-${DEVICE.contact}`).should('have.value', 'both').select('partial');
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) => {
      const on = r.attributes[`${SecurityAlarmMode.ATTR_DEVICES}:ON`] as string[] | undefined;
      return !!on && on.length === 0;
    });
    tid(`participation-select-${DEVICE.contact}`).should('have.value', 'partial');
  });

  it('shows the Pro badge for professionally monitored places', () => {
    cy.platform().invoke('updateEntity', addr.place, {
      [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM_PROMON,
    });
    cy.visit('/home');
    cy.get('[data-testid="card-alarms"]', { timeout: 20000 }).should('contain', 'Pro');
  });
});

/**
 * PRD §§8–14 — Services area: routing, sidebar, and the Climate, Doors &
 * Locks, Water, Lawn & Garden, Care, Home & Family, Lights and Cameras views.
 */

import {
  Base, CareSubsystem, Contact, DoorLock, DoorsNLocksSubsystem, IrrigationController, LawnNGardenSubsystem,
  MotorizedDoor, PresenceSubsystem, Valve,
} from '../../packages/arcus-core/src/capabilities/capabilities';
import {
  IRRIGATION_ERROR_HAS_OVERLAPS, IrrigationScheduleMode,
} from '../../packages/arcus-core/src/capabilities/irrigation';
import { DEVICE, IRRIGATION_EVENT, addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

/** Subsystem views render device panels directly (no list row wrapper). */
const devicePanel = (address: string) => cy.get(`[data-testid="device-panel-${address}"]`);

describe('Services routing', () => {
  it('redirects the bare services route to the first subsystem', () => {
    cy.signIn({ path: '/services' });
    cy.location('pathname').should('eq', '/services/alarms/status');
  });

  it('navigates between subsystems from the sidebar', () => {
    cy.signIn({ path: '/services/alarms/status' });
    tid('subsystem-nav-climate').click();
    cy.location('pathname').should('eq', '/services/climate/status');
    tid('subsystem-title').should('have.text', 'Climate');
    tid('subsystem-nav-climate').should('have.class', 'text-peacock');
    tid('subsystem-nav-water').click();
    cy.location('pathname').should('eq', '/services/water/status');
    tid('subsystem-title').should('have.text', 'Water');
  });

  it('uses a select on narrow screens', () => {
    cy.viewport('iphone-x');
    cy.signIn({ path: '/services/alarms/status' });
    tid('subsystem-select').select('lawn-garden');
    cy.location('pathname').should('eq', '/services/lawn-garden/status');
  });

  it('404s for an unknown subsystem', () => {
    cy.signIn({ path: '/services/alarms/status' });
    cy.visit('/services/nope/status', { failOnStatusCode: false });
    cy.contains('could not be found', { timeout: 20000 }).should('be.visible');
  });
});

describe('Climate', () => {
  it('shows readings, thermostats and temperature sensors', () => {
    cy.signIn({ path: '/services/climate/status' });
    tid('climate-temperature').should('have.text', '72°F');
    tid('climate-humidity').should('have.text', '41%');
    tid('climate-thermostats').find(`[data-testid="device-panel-${DEVICE.thermostat}"]`).should('exist');
    tid('climate-sensors').find(`[data-testid="device-panel-${DEVICE.contact}"]`).should('exist');
    tid('climate-sensors').find(`[data-testid="device-panel-${DEVICE.thermostat}"]`).should('not.exist');
  });

  it('reflects temperature changes pushed by the platform', () => {
    cy.signIn({ path: '/services/climate/status' });
    cy.platform().invoke('updateEntity', DEVICE.thermostat, { 'temp:temperature': 25 });
    tid('climate-temperature').should('have.text', '77°F');
  });

  it('adjusts the thermostat from the climate view', () => {
    cy.signIn({ path: '/services/climate/status' });
    tid(`thermostat-heat-down-${DEVICE.thermostat}`).click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.thermostat && 'therm:heatsetpoint' in r.attributes);
    tid(`thermostat-heat-value-${DEVICE.thermostat}`).should('have.text', '67°');
  });

  it('shows an empty state without climate devices', () => {
    cy.signIn({
      path: '/services/climate/status',
      customize: (p) => {
        Object.assign(p.data.entities[addr.subsystem('subclimate')], {
          'subclimate:controlDevices': [],
          'subclimate:temperatureDevices': [],
          'subclimate:humidityDevices': [],
          'subclimate:primaryTemperatureDevice': null,
          'subclimate:primaryHumidityDevice': null,
        });
      },
    });
    tid('climate-empty').should('be.visible');
  });
});

describe('Doors & Locks', () => {
  it('summarises and lists locks and sensors', () => {
    cy.signIn({ path: '/services/doors-locks/status' });
    tid('doors-unlocked-count').should('have.text', '0');
    tid('doors-open-count').should('have.text', '0');
    tid('doors-section-locks').find(`[data-testid="device-panel-${DEVICE.lock}"]`).should('exist');
    tid('doors-section-door-window-sensors').find(`[data-testid="device-panel-${DEVICE.contact}"]`).should('exist');
    tid('doors-section-garage-doors').find(`[data-testid="device-panel-${DEVICE.garageDoor}"]`).should('exist');
  });

  it('opens and closes the garage door', () => {
    cy.signIn({ path: '/services/doors-locks/status' });
    tid(`device-door-toggle-${DEVICE.garageDoor}`).should('have.text', 'Open').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.garageDoor && r.attributes[MotorizedDoor.ATTR_DOORSTATE] === MotorizedDoor.DOORSTATE_OPEN);
    tid('doors-open-count').should('have.text', '1');
    tid(`device-door-toggle-${DEVICE.garageDoor}`).should('have.text', 'Close').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.garageDoor && r.attributes[MotorizedDoor.ATTR_DOORSTATE] === MotorizedDoor.DOORSTATE_CLOSED);
    tid('doors-open-count').should('have.text', '0');
  });

  it('hides the garage door section without motorized doors', () => {
    cy.signIn({
      path: '/services/doors-locks/status',
      customize: (p) => {
        p.data.entities[addr.subsystem('subdoorsnlocks')][DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES] = [];
      },
    });
    tid('doors-section-locks').should('exist');
    tid('doors-section-garage-doors').should('not.exist');
  });

  it('updates counts when a lock is unlocked and a door opens', () => {
    cy.signIn({ path: '/services/doors-locks/status' });
    tid(`device-lock-toggle-${DEVICE.lock}`).click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.attributes[DoorLock.ATTR_LOCKSTATE] === DoorLock.LOCKSTATE_UNLOCKED);
    tid('doors-unlocked-count').should('have.text', '1');

    cy.platform().invoke('updateEntity', DEVICE.contact, { [Contact.ATTR_CONTACT]: Contact.CONTACT_OPENED });
    tid('doors-open-count').should('have.text', '1');
  });

  it('shows an empty state without doors or locks', () => {
    cy.signIn({
      path: '/services/doors-locks/status',
      customize: (p) => {
        Object.assign(p.data.entities[addr.subsystem('subdoorsnlocks')], {
          'subdoorsnlocks:lockDevices': [],
          'subdoorsnlocks:contactSensorDevices': [],
          [DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES]: [],
        });
      },
    });
    tid('doors-empty').should('be.visible');
  });
});

describe('Water', () => {
  it('lists water devices and closes the shut-off valve', () => {
    cy.signIn({ path: '/services/water/status' });
    tid('subsystem-device-count').should('have.text', '2 devices');
    devicePanel(DEVICE.leak).should('exist');
    tid(`device-valve-toggle-${DEVICE.valve}`).should('have.text', 'Close').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.valve && r.attributes[Valve.ATTR_VALVESTATE] === Valve.VALVESTATE_CLOSED);
    tid(`device-valve-toggle-${DEVICE.valve}`).should('have.text', 'Open');
  });

  it('shows valve state changes pushed by the platform', () => {
    cy.signIn({ path: '/services/water/status' });
    cy.platform().invoke('updateEntity', DEVICE.valve, { [Valve.ATTR_VALVESTATE]: Valve.VALVESTATE_CLOSED });
    tid(`device-status-${DEVICE.valve}`).should('have.text', 'Closed');
  });
});

describe('Lights & Switches', () => {
  it('lists switch devices', () => {
    cy.signIn({ path: '/services/lights-switches/status' });
    tid('subsystem-device-count').should('have.text', '3 devices');
    devicePanel(DEVICE.lamp).should('exist');
    devicePanel(DEVICE.coffee).should('exist');
    devicePanel(DEVICE.relay).should('exist');
  });

  it('shows an empty state without switches', () => {
    cy.signIn({
      path: '/services/lights-switches/status',
      customize: (p) => {
        p.data.entities[addr.subsystem('sublightsnswitches')]['sublightsnswitches:switchDevices'] = [];
      },
    });
    tid('subsystem-empty').should('contain', 'No lights & switches devices paired.');
  });
});

describe('Lawn & Garden', () => {
  it('shows watering status, next event and controllers', () => {
    cy.signIn({ path: '/services/lawn-garden/status' });
    tid('lawn-watering-count').should('have.text', '1');
    tid('lawn-next-event').should('have.text', 'Front Lawn');
    tid('lawn-controllers').find(`[data-testid="device-panel-${DEVICE.sprinkler}"]`).should('exist');
  });

  it('shows an empty state without controllers', () => {
    cy.signIn({
      path: '/services/lawn-garden/status',
      customize: (p) => {
        p.data.entities[addr.subsystem('sublawnngarden')]['sublawnngarden:controllers'] = [];
      },
    });
    tid('lawn-empty').should('be.visible');
  });

  describe('irrigation control', () => {
    const SPRINKLER = DEVICE.sprinkler;
    const zoneId = (name: string, zone: string) => `irrigation-zone-${name}-${SPRINKLER}-${zone}`;

    it('starts and stops a single zone', () => {
      cy.signIn({ path: '/services/lawn-garden/status' });
      tid(zoneId('name', 'z2')).should('have.text', 'Back Lawn');
      tid(zoneId('duration', 'z2')).select('20');
      tid(zoneId('start', 'z2')).click();
      cy.expectRequest(IrrigationController.CMD_WATERNOWV2, (r) =>
        r.destination === SPRINKLER && r.attributes.zone === 'z2' && r.attributes.duration === 20);
      tid(zoneId('status', 'z2')).should('have.text', 'Watering · 20 min');
      tid(`irrigation-stop-${SPRINKLER}`).should('be.visible');

      tid(zoneId('stop', 'z2')).click();
      cy.expectRequest(IrrigationController.CMD_CANCELV2, (r) => r.attributes.zone === 'z2');
      tid(zoneId('status', 'z2')).should('have.text', 'Idle');
      tid(`irrigation-water-now-${SPRINKLER}`).should('be.visible');
    });

    it('waters now from the device row and stops all zones', () => {
      cy.signIn({ path: '/services/lawn-garden/status' });
      tid(`irrigation-water-now-${SPRINKLER}`).click();
      tid('water-now-zone').select('z3');
      tid('water-now-duration').select('5');
      tid('water-now-save').click();
      cy.expectRequest(IrrigationController.CMD_WATERNOWV2, (r) =>
        r.attributes.zone === 'z3' && r.attributes.duration === 5);
      tid(zoneId('status', 'z3')).should('have.text', 'Watering · 5 min');

      tid(`irrigation-stop-${SPRINKLER}`).click();
      tid('stop-watering-all').should('be.checked');
      tid('stop-watering-save').click();
      cy.expectRequest(LawnNGardenSubsystem.CMD_STOPWATERING, (r) =>
        r.attributes.controller === SPRINKLER && r.attributes.currentOnly === false);
      tid(zoneId('status', 'z3')).should('have.text', 'Idle');
    });

    it('shows an error when a zone fails to start', () => {
      cy.signIn({ path: '/services/lawn-garden/status' });
      cy.platform().invoke('failRequest', IrrigationController.CMD_WATERNOWV2);
      tid(zoneId('start', 'z1')).click();
      cy.toast('Failed to start watering Front Lawn');
      tid(zoneId('status', 'z1')).should('have.text', 'Idle');
    });

    it('follows the weekly schedule, then skips and resumes it', () => {
      cy.signIn({ path: '/services/lawn-garden/status' });
      tid(`irrigation-schedule-status-${SPRINKLER}`).should('contain', 'Manual watering');
      tid(`device-config-${SPRINKLER}`).click();
      tid('irrigation-mode-manual').should('be.checked');
      tid('irrigation-mode-even').should('be.disabled');
      tid('irrigation-mode-weekly').check();
      cy.expectRequestAttrs(LawnNGardenSubsystem.CMD_SWITCHSCHEDULEMODE, {
        controller: SPRINKLER, mode: IrrigationScheduleMode.WEEKLY,
      });
      cy.expectRequestAttrs(LawnNGardenSubsystem.CMD_ENABLESCHEDULING, { controller: SPRINKLER });
      tid('irrigation-mode-weekly').should('be.checked');
      tid(`irrigation-schedule-status-${SPRINKLER}`).should('contain', 'Weekly schedule');
      tid('side-panel-right-close').click();

      tid(`irrigation-skip-${SPRINKLER}`).click();
      tid('skip-watering-48').check();
      tid('skip-watering-save').click();
      cy.expectRequestAttrs(LawnNGardenSubsystem.CMD_SKIP, { controller: SPRINKLER, hours: 48 });
      tid(`irrigation-schedule-status-${SPRINKLER}`).should('contain', 'Skipped until');
      tid(`irrigation-water-now-${SPRINKLER}`).should('be.disabled');

      tid(`irrigation-cancel-skip-${SPRINKLER}`).click();
      cy.expectRequestAttrs(LawnNGardenSubsystem.CMD_CANCELSKIP, { controller: SPRINKLER });
      tid(`irrigation-schedule-status-${SPRINKLER}`).should('not.contain', 'Skipped');
    });

    it('adjusts the water saver budget', () => {
      cy.signIn({ path: '/services/lawn-garden/status' });
      tid(`device-config-${SPRINKLER}`).click();
      tid('water-saver-value').should('have.text', '100%');
      tid('water-saver-decrease').click();
      cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
        r.destination === SPRINKLER && r.attributes[IrrigationController.ATTR_BUDGET] === 90);
      tid('water-saver-value').should('have.text', '90%');
    });
  });

  describe('irrigation schedules', () => {
    const SPRINKLER = DEVICE.sprinkler;

    it('edits the days of a weekly event', () => {
      cy.signIn({ path: '/services/lawn-garden/status' });
      tid(`irrigation-open-schedule-${SPRINKLER}`).click();
      tid('irrigation-schedule-tab-weekly').should('have.attr', 'aria-selected', 'true');
      tid(`irrigation-event-days-${IRRIGATION_EVENT.weekly}`).should('have.text', 'Mon, Thu');
      tid(`irrigation-event-zones-${IRRIGATION_EVENT.weekly}`).should('contain', 'Front Lawn, Back Lawn');
      tid(`irrigation-event-edit-${IRRIGATION_EVENT.weekly}`).click();
      tid('irrigation-event-day-SAT').click();
      tid('irrigation-event-save').click();
      cy.expectRequest(LawnNGardenSubsystem.CMD_UPDATEWEEKLYEVENT, (r) =>
        r.attributes.eventId === IRRIGATION_EVENT.weekly
        && JSON.stringify(r.attributes.days) === JSON.stringify(['MON', 'THU', 'SAT']));
      cy.toast('Your event has been updated.');
      tid(`irrigation-event-days-${IRRIGATION_EVENT.weekly}`).should('have.text', 'Mon, Thu, Sat');
    });

    it('creates, follows and deletes an interval event', () => {
      cy.signIn({ path: '/services/lawn-garden/status' });
      tid(`irrigation-open-schedule-${SPRINKLER}`).click();
      tid('irrigation-schedule-tab-interval').click();
      tid('irrigation-schedule-empty').should('be.visible');
      tid('irrigation-interval-days').select('3');
      cy.expectRequestAttrs(LawnNGardenSubsystem.CMD_CONFIGUREINTERVALSCHEDULE, { controller: SPRINKLER, days: 3 });

      tid('irrigation-schedule-add').click();
      tid('irrigation-event-zone-toggle-z4').check();
      tid('irrigation-event-zone-duration-z4').select('30');
      tid('irrigation-event-time').type('21:15');
      tid('irrigation-event-save').click();
      cy.expectRequest(LawnNGardenSubsystem.CMD_CREATESCHEDULEEVENT, (r) =>
        r.attributes.mode === IrrigationScheduleMode.INTERVAL
        && r.attributes.timeOfDay === '21:15:00'
        && JSON.stringify(r.attributes.zoneDurations) === JSON.stringify([{ zone: 'z4', duration: 30 }]));
      cy.toast('Your event has been created.');
      cy.get('[data-testid^="irrigation-event-time-"]').should('have.text', '9:15 PM');

      // The interval mode can now be followed.
      tid('side-panel-right-close').click();
      tid(`device-config-${SPRINKLER}`).click();
      tid('irrigation-mode-interval').should('be.enabled').check();
      cy.expectRequestAttrs(LawnNGardenSubsystem.CMD_SWITCHSCHEDULEMODE, {
        controller: SPRINKLER, mode: IrrigationScheduleMode.INTERVAL,
      });
      tid(`irrigation-schedule-status-${SPRINKLER}`).should('contain', 'Interval schedule');

      // Deleting the only event of the followed mode falls back to manual watering.
      tid('irrigation-edit-schedule').click();
      cy.get('[data-testid^="irrigation-event-edit-"]').click();
      tid('irrigation-event-delete').click();
      tid('irrigation-event-delete-confirm').click();
      cy.expectRequest(LawnNGardenSubsystem.CMD_REMOVESCHEDULEEVENT, (r) =>
        r.attributes.mode === IrrigationScheduleMode.INTERVAL);
      cy.expectRequestAttrs(LawnNGardenSubsystem.CMD_DISABLESCHEDULING, { controller: SPRINKLER });
      tid('irrigation-schedule-empty').should('be.visible');
      tid(`irrigation-schedule-status-${SPRINKLER}`).should('contain', 'Manual watering');
      cy.platform().its('created.size').should('eq', 0);
    });

    it('explains an overlapping start time', () => {
      cy.signIn({ path: '/services/lawn-garden/status' });
      cy.platform().invoke(
        'failRequest', LawnNGardenSubsystem.CMD_CREATESCHEDULEEVENT, IRRIGATION_ERROR_HAS_OVERLAPS, 'overlap',
      );
      tid(`irrigation-open-schedule-${SPRINKLER}`).click();
      tid('irrigation-schedule-tab-odd').click();
      tid('irrigation-schedule-add').click();
      tid('irrigation-event-zone-toggle-z1').check();
      tid('irrigation-event-save').click();
      cy.toast(/overlaps with the start time/);
      tid('irrigation-event-editor').should('be.visible');
    });
  });
});

describe('Care', () => {
  it('shows the all-clear state and behaviors', () => {
    cy.signIn({ path: '/services/care/status' });
    tid('care-state').should('have.text', 'All Clear').and('have.attr', 'data-alert', 'false');
    tid('care-summary').should('have.text', 'Care is active');
    tid('care-behavior-status-morning-activity').should('have.text', 'Active');
    tid('care-behavior-status-night-wandering').should('have.text', 'Disabled');
    tid('care-device-count').should('have.text', '1 care device monitored');
    tid('care-silent').should('not.exist');

    tid('care-tab-behaviors').click();
    tid('care-behavior-detail-morning-activity')
      .should('contain', 'Expect motion in the hallway by 9 AM')
      .and('contain', 'Type: INACTIVITY');
  });

  it('shows the last alert cause and clears a care alert', () => {
    cy.signIn({
      path: '/services/care/status',
      customize: (p) => {
        Object.assign(p.data.entities[addr.subsystem('subcare')], {
          [CareSubsystem.ATTR_ALARMSTATE]: CareSubsystem.ALARMSTATE_ALERT,
          [CareSubsystem.ATTR_LASTALERTCAUSE]: 'No activity detected this morning',
          [CareSubsystem.ATTR_SILENT]: true,
        });
      },
    });
    tid('care-state').should('have.text', 'CARE ALERT').and('have.attr', 'data-alert', 'true');
    tid('care-summary').should('have.text', 'No activity detected this morning');
    tid('care-silent').should('be.visible');

    tid('care-clear').click();
    cy.expectRequest('subcare:Clear', (r) => r.destination === addr.subsystem('subcare'));
    cy.toast('Care alert cleared');
    tid('care-state').should('have.text', 'All Clear');
    tid('care-clear').should('not.exist');
  });

  it('reflects the alert on the dashboard card', () => {
    cy.signIn({
      customize: (p) => {
        p.data.entities[addr.subsystem('subcare')][CareSubsystem.ATTR_ALARMSTATE] = CareSubsystem.ALARMSTATE_ALERT;
      },
    });
    tid('status-value-care-status').should('have.text', 'Alert');
  });
});

describe('Home & Family', () => {
  it('shows who is home and away', () => {
    cy.signIn({ path: '/services/home-family/status' });
    tid('presence-home-count').should('have.text', '1');
    tid('presence-away-count').should('have.text', '1');
    tid('presence-list-home').find(`[data-testid="presence-person-${addr.person}"]`).should('contain', 'Alex Rivera');
    tid('presence-list-away').find(`[data-testid="presence-person-${addr.guest}"]`).should('contain', 'Sam Rivera');
  });

  it('updates when someone arrives', () => {
    cy.signIn({ path: '/services/home-family/status' });
    cy.platform().invoke('updateEntity', addr.subsystem(PresenceSubsystem.NAMESPACE), {
      [PresenceSubsystem.ATTR_PEOPLEATHOME]: [addr.person, addr.guest],
      [PresenceSubsystem.ATTR_PEOPLEAWAY]: [],
    });
    tid('presence-home-count').should('have.text', '2');
    tid('presence-list-away').should('not.exist');
    tid('presence-list-home').find(`[data-testid="presence-person-${addr.guest}"]`).should('exist');
  });
});

describe('Cameras', () => {
  it('shows the empty state when no cameras are paired', () => {
    cy.signIn({ path: '/services/cameras/status' });
    tid('cameras-empty').should('be.visible');
  });

  it('lists cameras with their status', () => {
    const camera = addr.device('cam');
    cy.signIn({
      path: '/services/cameras/status',
      customize: (p) => {
        p.data.entities[camera] = {
          [Base.ATTR_ADDRESS]: camera,
          [Base.ATTR_ID]: 'cam',
          [Base.ATTR_TYPE]: 'dev',
          [Base.ATTR_CAPS]: ['base', 'dev', 'devconn', 'camera'],
          'dev:name': 'Porch Camera',
          'dev:devtypehint': 'Camera',
          'devconn:state': 'ONLINE',
        };
        p.data.entities[addr.subsystem('subcameras')]['subcameras:cameras'] = [camera];
      },
    });
    tid('cameras-count').should('have.text', '1 camera configured');
    tid(`device-name-${camera}`).should('have.text', 'Porch Camera');
  });
});

/**
 * PRD §§8–14 — Services area: routing, sidebar, and the Climate, Doors &
 * Locks, Water, Lawn & Garden, Care, Home & Family, Lights and Cameras views.
 */

import {
  Base, CareSubsystem, Contact, DoorLock, DoorsNLocksSubsystem, MotorizedDoor, PresenceSubsystem, Valve,
} from '../../packages/arcus-core/src/capabilities/capabilities';
import { CARE_BEHAVIOR, DEVICE, addr } from '../support/platform/fixtures';
import type { LoggedRequest } from '../support/platform/types';
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
    tid(`care-behavior-name-${CARE_BEHAVIOR.morning}`).should('have.text', 'Morning activity');
    tid(`care-behavior-summary-${CARE_BEHAVIOR.morning}`).should('have.text', '1 Device · 60 Minutes · 24/7');
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

/** The care behavior a subcare:AddBehavior / UpdateBehavior request sent. */
interface SentBehavior {
  id?: string;
  name?: string;
  templateId?: string;
  enabled?: boolean;
  durationSecs?: number;
  devices?: string[];
  timeWindows?: { day: string; startTime: string; durationSecs: number }[];
}

const sentBehavior = (r: LoggedRequest) => r.attributes.behavior as SentBehavior;

describe('Care behaviors', () => {
  const care = addr.subsystem('subcare');

  beforeEach(() => {
    cy.signIn({ path: '/services/care/status' });
    tid('care-tab-behaviors').click();
  });

  it('enables and disables a behavior', () => {
    tid(`care-behavior-row-${CARE_BEHAVIOR.night}`).should('have.attr', 'data-enabled', 'false');
    tid(`care-behavior-toggle-${CARE_BEHAVIOR.night}`).click();
    cy.expectRequest(CareSubsystem.CMD_UPDATEBEHAVIOR, (r) =>
      r.destination === care && sentBehavior(r).id === CARE_BEHAVIOR.night && sentBehavior(r).enabled === true);
    tid(`care-behavior-row-${CARE_BEHAVIOR.night}`).should('have.attr', 'data-enabled', 'true');
  });

  it('reverts a toggle the platform rejects', () => {
    cy.platform().invoke('failRequest', CareSubsystem.CMD_UPDATEBEHAVIOR);
    tid(`care-behavior-toggle-${CARE_BEHAVIOR.morning}`).click();
    cy.toast("Failed to disable 'Morning activity'");
    tid(`care-behavior-row-${CARE_BEHAVIOR.morning}`).should('have.attr', 'data-enabled', 'true');
  });

  it('creates a behavior from a template', () => {
    tid('care-behavior-add').click();
    tid('care-library-title').should('have.text', 'Care Behaviors Library');
    tid('care-library-unavailable').should('contain', 'Curfew');
    tid('care-template-1').click();

    tid('care-editor-name').should('have.value', 'No Activity Detected');
    tid('care-section-status-devices').should('have.text', 'Required');
    tid('care-editor-save').should('be.disabled');
    tid(`care-field-device-${DEVICE.motion}`).check();
    tid('care-field-duration').select('120 Minutes');
    tid('care-window-add').click();
    tid('care-window-start-day').select('Tuesday');
    tid('care-window-start-time').type('07:00');
    tid('care-window-end-day').select('Tuesday');
    tid('care-window-end-time').type('11:00');
    tid('care-window-save').click();
    tid('care-window-0').should('have.text', 'Tue 7:00 AM – Tue 11:00 AMRemove');
    tid('care-editor-name').clear().type('Breakfast check');
    tid('care-editor-save').click();

    cy.expectRequest(CareSubsystem.CMD_ADDBEHAVIOR, (r) => {
      const b = sentBehavior(r);
      return r.destination === care && b.name === 'Breakfast check' && b.templateId === '1'
        && b.durationSecs === 7200 && b.devices?.[0] === DEVICE.motion
        && b.timeWindows?.[0]?.day === 'Tuesday' && b.timeWindows?.[0]?.durationSecs === 4 * 3600;
    });
    cy.toast("'Breakfast check' has been added.");
    cy.contains('[data-testid^="care-behavior-name-"]', 'Breakfast check').should('be.visible');
  });

  it('shows the platform error for a duplicate name', () => {
    tid('care-behavior-add').click();
    tid('care-template-1').click();
    tid(`care-field-device-${DEVICE.motion}`).check();
    tid('care-editor-name').clear().type('Morning activity');
    tid('care-editor-save').click();
    tid('care-editor-error').should('have.text', 'Care Behavior name must be unique.');
  });

  it('edits a behavior', () => {
    tid(`care-behavior-edit-${CARE_BEHAVIOR.morning}`).click();
    tid('care-editor-name').should('have.value', 'Morning activity');
    tid(`care-field-device-${DEVICE.contact}`).check();
    tid('care-editor-save').click();

    cy.expectRequest(CareSubsystem.CMD_UPDATEBEHAVIOR, (r) =>
      sentBehavior(r).id === CARE_BEHAVIOR.morning && sentBehavior(r).devices?.length === 2);
    cy.toast("'Morning activity' has been saved.");
    tid(`care-behavior-summary-${CARE_BEHAVIOR.morning}`).should('have.text', '2 Devices · 60 Minutes · 24/7');
  });

  it('removes a behavior', () => {
    tid(`care-behavior-edit-${CARE_BEHAVIOR.night}`).click();
    tid('care-editor-remove').click();
    cy.contains('button', 'Yes, Remove Behavior').click();

    cy.expectRequestAttrs(CareSubsystem.CMD_REMOVEBEHAVIOR, { id: CARE_BEHAVIOR.night });
    cy.toast("'Night wandering' was removed.");
    tid(`care-behavior-row-${CARE_BEHAVIOR.night}`).should('not.exist');
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

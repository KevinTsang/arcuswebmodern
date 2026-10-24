/**
 * PRD §3 — Device list, status, per-type controls, naming, favorites,
 * identification, removal, configuration panel, real-time updates, and the
 * hub / Z-Wave tools (PRD §18).
 */

import {
  Base, Contact, Device, DeviceConnection, Dimmer, DoorLock, Hub, HubZwave, Switch, Thermostat, Valve,
} from '../../packages/arcus-core/src/capabilities/capabilities';
import { DEVICE, DEVICE_NAME, addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

/** The list row for a device. */
function deviceRow(address: string) {
  return cy.get(`[data-testid="device-row-${address}"]`);
}

function status(address: string) {
  return tid(`device-status-${address}`);
}

describe('Devices page', () => {
  it('lists the hub and every device with its status', () => {
    cy.signIn({ path: '/devices' });
    tid('devices-title').should('have.text', 'Devices');
    cy.get('[data-testid="hub-name"]').should('have.text', 'Home Hub');
    cy.get('[data-testid="hub-status"]').should('have.text', 'Online · v3.1.0');

    status(DEVICE.lamp).should('have.text', '75% Brightness');
    status(DEVICE.coffee).should('have.text', 'Off');
    status(DEVICE.lock).should('have.text', 'Locked');
    status(DEVICE.contact).should('have.text', 'Closed');
    status(DEVICE.thermostat).should('have.text', 'Heat to 68°');
    status(DEVICE.valve).should('have.text', 'Open');
    status(DEVICE.relay).should('have.text', 'Relay 1 On, Relay 2 Off');
    tid(`device-name-${DEVICE.lamp}`).should('have.text', DEVICE_NAME.lamp);
  });

  it('shows battery and capability badges', () => {
    cy.signIn({ path: '/devices' });
    deviceRow(DEVICE.lock).should('contain', 'Battery:').and('contain', '88%');
    deviceRow(DEVICE.lamp).should('contain', 'Brightness:').and('contain', '75%');
    deviceRow(DEVICE.contact).should('contain', 'Status:').and('contain', 'Closed');
  });

  it('marks offline devices', () => {
    cy.signIn({
      path: '/devices',
      customize: (p) => {
        p.data.entities[DEVICE.motion][DeviceConnection.ATTR_STATE] = DeviceConnection.STATE_OFFLINE;
      },
    });
    status(DEVICE.motion).should('have.text', 'Offline');
    deviceRow(DEVICE.motion).children().first().should('have.class', 'opacity-50');
  });

  it('toggles a switch and reflects the platform state change', () => {
    cy.signIn({ path: '/devices' });
    tid(`device-toggle-${DEVICE.coffee}`).should('have.attr', 'aria-checked', 'false').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.coffee && r.attributes[Switch.ATTR_STATE] === Switch.STATE_ON);
    tid(`device-toggle-${DEVICE.coffee}`).should('have.attr', 'aria-checked', 'true');
    status(DEVICE.coffee).should('have.text', 'On');
  });

  it('controls each switch instance of a multi-switch device', () => {
    cy.signIn({ path: '/devices' });
    tid(`device-toggle-${DEVICE.relay}-relay2`).click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.relay && r.attributes[`${Switch.ATTR_STATE}:relay2`] === Switch.STATE_ON);
    status(DEVICE.relay).should('have.text', 'Relay 1 On, Relay 2 On');
  });

  it('locks and unlocks a door lock', () => {
    cy.signIn({ path: '/devices' });
    tid(`device-lock-toggle-${DEVICE.lock}`).should('have.text', 'Unlock').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.lock && r.attributes[DoorLock.ATTR_LOCKSTATE] === DoorLock.LOCKSTATE_UNLOCKED);
    status(DEVICE.lock).should('have.text', 'Unlocked');
    tid(`device-lock-toggle-${DEVICE.lock}`).should('have.text', 'Lock').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.lock && r.attributes[DoorLock.ATTR_LOCKSTATE] === DoorLock.LOCKSTATE_LOCKED);
    status(DEVICE.lock).should('have.text', 'Locked');
  });

  it('opens and closes a water valve', () => {
    cy.signIn({ path: '/devices' });
    tid(`device-valve-toggle-${DEVICE.valve}`).should('have.text', 'Close').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.valve && r.attributes[Valve.ATTR_VALVESTATE] === Valve.VALVESTATE_CLOSED);
    status(DEVICE.valve).should('have.text', 'Closed');
    tid(`device-valve-toggle-${DEVICE.valve}`).should('have.text', 'Open');
  });

  it('adjusts thermostat setpoints from the list', () => {
    cy.signIn({ path: '/devices' });
    tid(`thermostat-heat-value-${DEVICE.thermostat}`).should('have.text', '68°');
    tid(`thermostat-heat-up-${DEVICE.thermostat}`).click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) => {
      const heat = r.attributes[Thermostat.ATTR_HEATSETPOINT];
      return r.destination === DEVICE.thermostat && typeof heat === 'number' && Math.round(heat * 10) === 206;
    });
    tid(`thermostat-heat-value-${DEVICE.thermostat}`).should('have.text', '69°');
    status(DEVICE.thermostat).should('have.text', 'Heat to 69°');
  });

  it('renames a device inline', () => {
    cy.signIn({ path: '/devices' });
    tid(`device-name-${DEVICE.coffee}`).click();
    tid(`device-name-input-${DEVICE.coffee}`)
      .should('have.value', DEVICE_NAME.coffee).clear().type('Espresso Machine{enter}');
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.coffee && r.attributes[Device.ATTR_NAME] === 'Espresso Machine');
    tid(`device-name-${DEVICE.coffee}`).should('have.text', 'Espresso Machine');
  });

  it('cancels an inline rename with Escape', () => {
    cy.signIn({ path: '/devices' });
    tid(`device-name-${DEVICE.coffee}`).click();
    tid(`device-name-input-${DEVICE.coffee}`).clear().type('Never saved{esc}');
    tid(`device-name-${DEVICE.coffee}`).should('have.text', DEVICE_NAME.coffee);
    cy.platform().then((p) => {
      expect(p.requestsOf(Base.CMD_SETATTRIBUTES)).to.have.length(0);
    });
  });

  it('adds and removes a device favorite', () => {
    cy.signIn({ path: '/devices' });
    tid(`device-favorite-${DEVICE.lamp}`).should('have.attr', 'data-favorite', 'false').click();
    cy.expectRequestAttrs(Base.CMD_ADDTAGS, { tags: ['FAVORITE'] });
    tid(`device-favorite-${DEVICE.lamp}`).should('have.attr', 'data-favorite', 'true').click();
    cy.expectRequestAttrs(Base.CMD_REMOVETAGS, { tags: ['FAVORITE'] });
    tid(`device-favorite-${DEVICE.lamp}`).should('have.attr', 'data-favorite', 'false');
  });

  it('reports a failed favorite toggle', () => {
    cy.signIn({ path: '/devices' });
    cy.platform().invoke('failRequest', Base.CMD_ADDTAGS);
    tid(`device-favorite-${DEVICE.lamp}`).click();
    cy.toast('Failed to update favorite');
  });

  describe('details panel', () => {
    it('shows device metadata and identifies the device', () => {
      cy.signIn({ path: '/devices' });
      tid(`device-details-${DEVICE.lamp}`).click();

      tid('device-details-title').should('have.text', 'Device Details');
      cy.get('[data-testid="device-detail-manufacturer"]').should('have.text', 'Acme');
      cy.get('[data-testid="device-detail-model"]').should('have.text', 'Dimmer-1');
      cy.get('[data-testid="device-detail-protocol"]').should('have.text', 'ZIGB');
      cy.get('[data-testid="device-detail-firmware"]').should('have.text', '1.2.3');
      cy.get('[data-testid="device-detail-connection"]').should('have.text', 'ONLINE');
      cy.get('[data-testid="device-detail-power"]').should('have.text', 'Plugged In');

      cy.get('[data-testid="device-identify"]').click();
      cy.expectRequest('ident:Identify', (r) => r.destination === DEVICE.lamp);
    });

    it('removes a device after confirmation', () => {
      cy.signIn({ path: '/devices' });
      tid(`device-details-${DEVICE.coffee}`).click();
      cy.get('[data-testid="device-remove"]').click();
      cy.contains('Are you sure you want to remove').should('be.visible');
      cy.get('[data-testid="device-remove-confirm"]').click();

      cy.expectRequest(Device.CMD_REMOVE, (r) => r.destination === DEVICE.coffee);
      cy.toast(`${DEVICE_NAME.coffee} removed`);
      deviceRow(DEVICE.coffee).should('not.exist');
      cy.platform().then((p) => expect(p.entity(DEVICE.coffee)).to.be.undefined);
    });

    it('keeps the device when removal is cancelled or fails', () => {
      cy.signIn({ path: '/devices' });
      tid(`device-details-${DEVICE.coffee}`).click();
      cy.get('[data-testid="device-remove"]').click();
      cy.get('[data-testid="device-remove-cancel"]').click();
      cy.get('[data-testid="device-remove"]').should('be.visible');

      cy.platform().invoke('failRequest', Device.CMD_REMOVE);
      cy.get('[data-testid="device-remove"]').click();
      cy.get('[data-testid="device-remove-confirm"]').click();
      cy.toast(`Failed to remove ${DEVICE_NAME.coffee}`);
      cy.get('[data-testid="side-panel-right-close"]').click();
      deviceRow(DEVICE.coffee).should('exist');
    });
  });

  describe('configuration panel', () => {
    it('sets dimmer brightness with the slider', () => {
      cy.signIn({ path: '/devices' });
      tid(`device-config-${DEVICE.lamp}`).click();
      tid('device-config-title').should('have.text', 'Configuration');
      cy.contains('label', 'Brightness: 75%').should('be.visible');
      cy.get('[data-testid="brightness-slider"]').setRange(40);
      cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
        r.destination === DEVICE.lamp && r.attributes[Dimmer.ATTR_BRIGHTNESS] === 40);
      cy.contains('label', 'Brightness: 40%').should('be.visible');
    });

    it('switches thermostat HVAC mode', () => {
      cy.signIn({ path: '/devices' });
      tid(`device-config-${DEVICE.thermostat}`).click();
      cy.get('[data-testid="hvac-mode-cool"]').click();
      cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
        r.destination === DEVICE.thermostat && r.attributes[Thermostat.ATTR_HVACMODE] === Thermostat.HVACMODE_COOL);
      cy.get('[data-testid="side-panel-right-close"]').click();
      status(DEVICE.thermostat).should('have.text', 'Cool to 77°');
    });

    it('changes a contact sensor type', () => {
      cy.signIn({ path: '/devices' });
      tid(`device-config-${DEVICE.contact}`).click();
      cy.get('[data-testid="contact-usehint-window"]').click();
      cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
        r.destination === DEVICE.contact && r.attributes[Contact.ATTR_USEHINT] === Contact.USEHINT_WINDOW);
    });

    it('explains when a device has nothing to configure', () => {
      cy.signIn({ path: '/devices' });
      tid(`device-config-${DEVICE.coffee}`).click();
      cy.get('[data-testid="config-empty"]').should('be.visible');
    });
  });

  it('reflects device changes pushed by the platform', () => {
    cy.signIn({ path: '/devices' });
    cy.platform().invoke('updateEntity', DEVICE.contact, { [Contact.ATTR_CONTACT]: Contact.CONTACT_OPENED });
    status(DEVICE.contact).should('have.text', 'Open');

    const porch = addr.device('porch');
    cy.platform().invoke('addEntity', {
      [Base.ATTR_ADDRESS]: porch,
      [Base.ATTR_ID]: 'porch',
      [Base.ATTR_TYPE]: 'dev',
      [Base.ATTR_CAPS]: ['base', 'dev', 'devconn', 'swit'],
      [Device.ATTR_NAME]: 'Porch Light',
      [Device.ATTR_DEVTYPEHINT]: 'Light',
      [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE,
      [Switch.ATTR_STATE]: Switch.STATE_OFF,
    });
    tid(`device-name-${porch}`).should('have.text', 'Porch Light');

    cy.platform().invoke('removeEntity', porch);
    deviceRow(porch).should('not.exist');
  });

  it('offers hub setup when the place has no hub or devices', () => {
    cy.signIn({
      path: '/devices',
      customize: (p) => {
        delete p.data.entities[addr.hub];
        for (const address of Object.values(DEVICE)) delete p.data.entities[address];
      },
    });
    cy.get('[data-testid="devices-empty"]').should('contain', 'No Devices Paired');
    cy.get('[data-testid="shop-devices"]').should('have.attr', 'href', '/product-catalog');
    cy.get('[data-testid="add-hub-or-kit"]').click();
    cy.location('pathname').should('eq', '/hub-setup');
    tid('hub-setup-title').should('have.text', 'Hub Setup');
  });

  it('shows the hub as offline', () => {
    cy.signIn({
      path: '/devices',
      customize: (p) => {
        p.data.entities[addr.hub][Hub.ATTR_STATE] = Hub.STATE_DOWN;
      },
    });
    cy.get('[data-testid="hub-panel"]').should('have.attr', 'data-online', 'false');
    cy.get('[data-testid="hub-status"]').should('contain', 'Offline');
  });
});

describe('Z-Wave tools', () => {
  beforeEach(() => {
    cy.signIn({ path: '/devices' });
    cy.get('[data-testid="devices-view-zwave"]').click();
  });

  it('starts a Z-Wave network rebuild', () => {
    cy.get('[data-testid="zwave-rebuild-section"]').click();
    cy.get('[data-testid="zwave-rebuild-start"]').click();
    cy.expectRequestAttrs(HubZwave.CMD_HEAL, { block: false });
    cy.toast('Z-Wave network rebuild started');
  });

  it('removes an orphaned Z-Wave device', () => {
    cy.get('[data-testid="zwave-remove-section"]').click();
    cy.get('[data-testid="zwave-remove-start"]').click();
    cy.get('[data-testid="zwave-remove-modal"]').should('have.attr', 'data-state', 'search');
    cy.expectRequestAttrs(Hub.CMD_UNPAIRINGREQUEST, { actionType: 'START_UNPAIRING' });

    cy.platform().invoke('emit', undefined, 'hubadv:UnpairedDeviceRemoved', {});
    cy.toast('A device was removed.');
    // The hub keeps excluding until it leaves unpairing mode, so keep searching until then.
    cy.get('[data-testid="zwave-remove-modal"]').should('have.attr', 'data-state', 'search');
    cy.platform().invoke('updateEntity', addr.hub, { [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
    cy.get('[data-testid="zwave-remove-modal"]').should('have.attr', 'data-state', 'success');
    cy.get('[data-testid="zwave-remove-done"]').click();
    cy.get('[data-testid="zwave-remove-modal"]').should('not.exist');
  });

  it('cancels an orphan search', () => {
    cy.get('[data-testid="zwave-remove-section"]').click();
    cy.get('[data-testid="zwave-remove-start"]').click();
    cy.get('[data-testid="zwave-remove-cancel"]').click();
    cy.expectRequestAttrs(Hub.CMD_UNPAIRINGREQUEST, { actionType: 'STOP_UNPAIRING' });
    cy.get('[data-testid="zwave-remove-modal"]').should('not.exist');
  });
});

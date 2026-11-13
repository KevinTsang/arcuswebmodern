/**
 * PRD §17.3 — Notification preferences: Settings → Notifications shows the
 * alarm call tree, the mobile devices that get push notifications, the
 * promotional-email opt-in and the quiet-hours note.
 */

import {
  AlarmSubsystem, Base, MobileDevice, Person,
} from '../../packages/arcus-core/src/capabilities/capabilities';
import { addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

const ALARM = addr.subsystem('subalarm');

const DEVICES = [
  {
    [MobileDevice.ATTR_DEVICEINDEX]: 1,
    [MobileDevice.ATTR_OSTYPE]: 'iOS',
    [MobileDevice.ATTR_OSVERSION]: '17.2',
    [MobileDevice.ATTR_DEVICEVENDOR]: 'Apple',
    [MobileDevice.ATTR_DEVICEMODEL]: 'iPhone 15',
  },
  {
    [MobileDevice.ATTR_DEVICEINDEX]: 2,
    [MobileDevice.ATTR_OSTYPE]: 'Android',
    [MobileDevice.ATTR_OSVERSION]: '14',
    [MobileDevice.ATTR_DEVICEVENDOR]: 'Google',
    [MobileDevice.ATTR_DEVICEMODEL]: 'Pixel 8',
  },
];

describe('Notification preferences', () => {
  beforeEach(() => {
    cy.signIn({
      path: '/settings',
      customize: (platform) => {
        let devices = [...DEVICES];
        platform.onRequest(Person.CMD_LISTMOBILEDEVICES, () => ({ mobileDevices: devices }));
        platform.onRequest(Person.CMD_REMOVEMOBILEDEVICE, ({ attrs }) => {
          devices = devices.filter((d) => d[MobileDevice.ATTR_DEVICEINDEX] !== attrs.deviceIndex);
          return {};
        });
      },
    });
    tid('settings-tab-notifications').click();
  });

  it('shows the call tree, push devices, email and quiet hours cards', () => {
    tid('info-card-alarm-call-tree').should('exist');
    tid(`calltree-entry-${addr.person}`).should('have.attr', 'data-enabled', 'true');
    tid('alarm-call-tree-link').should('have.attr', 'href', '/services/alarms/settings');
    tid('mobile-device-1').should('contain', 'iOS 17.2').and('contain', 'Apple iPhone 15');
    tid('mobile-device-2').should('contain', 'Android 14');
    tid('email-prefs-promotions').should('have.attr', 'aria-checked', 'false');
    tid('quiet-hours-note').should('contain', 'Do Not Disturb');
  });

  it('manages the alarm call tree from Settings', () => {
    tid(`calltree-toggle-${addr.guest}`).click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) => {
      const tree = r.attributes[AlarmSubsystem.ATTR_CALLTREE] as { person: string; enabled: boolean }[] | undefined;
      return r.destination === ALARM && !!tree?.find((e) => e.person === addr.guest && e.enabled);
    });
  });

  it('removes a device from push notifications', () => {
    tid('mobile-device-1-remove').click();
    tid('mobile-device-1-confirm').click();
    cy.expectRequestAttrs(Person.CMD_REMOVEMOBILEDEVICE, { deviceIndex: 1 });
    cy.toast('Device removed from push notifications.');
    tid('mobile-device-1').should('not.exist');
    tid('mobile-device-2').should('exist');
  });

  it('reports a failed removal and keeps the device', () => {
    cy.platform().invoke('failRequest', Person.CMD_REMOVEMOBILEDEVICE);
    tid('mobile-device-2-remove').click();
    tid('mobile-device-2-confirm').click();
    cy.toast('Failed to remove device.');
    tid('mobile-device-2').should('exist');
  });

  it('opts in to and out of promotional emails', () => {
    tid('email-prefs-promotions').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === addr.person && (r.attributes[Person.ATTR_CONSENTOFFERSPROMOTIONS] as number) > 0);
    tid('email-prefs-promotions').should('have.attr', 'aria-checked', 'true');

    tid('email-prefs-promotions').click();
    cy.expectRequestAttrs(Base.CMD_SETATTRIBUTES, { [Person.ATTR_CONSENTOFFERSPROMOTIONS]: 0 });
    tid('email-prefs-promotions').should('have.attr', 'aria-checked', 'false');
  });

  it('reverts the email toggle when saving fails', () => {
    cy.platform().invoke('failRequest', Base.CMD_SETATTRIBUTES);
    tid('email-prefs-promotions').click();
    cy.toast('Failed to update email preferences.');
    tid('email-prefs-promotions').should('have.attr', 'aria-checked', 'false');
  });
});

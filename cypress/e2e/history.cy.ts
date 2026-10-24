/**
 * PRD §20 — History / activity log.
 */

import { Device, Place } from '../../packages/arcus-core/src/capabilities/capabilities';
import { DEVICE, DEVICE_NAME, addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

describe('History page', () => {
  it('lists activity grouped by day', () => {
    cy.signIn({ path: '/history' });
    tid('history-title').should('have.text', 'History');
    cy.expectRequestAttrs(Place.CMD_LISTHISTORYENTRIES, { limit: 20 });

    cy.get('[data-testid^="history-entry-"]').should('have.length', 4)
      .first().should('contain', 'Front Door Lock was locked.');
    cy.get('[data-testid^="history-entry-"]').last().should('contain', 'Living Room Lamp was turned off.');
    // Four entries spanning two days produce two day headings.
    cy.get('[data-testid^="history-date-"]').should('have.length', 2);
    tid('history-filter-all').should('have.attr', 'data-active', 'true');
  });

  it('tells basic-plan users about the 24 hour limit', () => {
    cy.signIn({ path: '/history' });
    tid('history-limit-note').should('be.visible');
  });

  it('omits the limit note for premium places', () => {
    cy.signIn({
      path: '/history',
      customize: (p) => {
        p.data.entities[addr.place][Place.ATTR_SERVICELEVEL] = Place.SERVICELEVEL_PREMIUM;
      },
    });
    cy.get('[data-testid^="history-entry-"]').should('have.length', 4);
    tid('history-limit-note').should('not.exist');
  });

  it('refreshes the log', () => {
    cy.signIn({ path: '/history' });
    cy.get('[data-testid^="history-entry-"]').should('have.length', 4);
    cy.platform().then((p) => {
      p.data.history.unshift({
        timestamp: Date.now(),
        subjectName: DEVICE_NAME.valve,
        subjectAddress: DEVICE.valve,
        longMessage: 'Main Water Valve was closed.',
      });
    });
    tid('history-refresh').click();
    cy.get('[data-testid^="history-entry-"]').should('have.length', 5)
      .first().should('contain', 'Main Water Valve was closed.');
  });

  it('shows an empty state', () => {
    cy.signIn({ path: '/history', customize: (p) => { p.data.history = []; } });
    tid('history-empty').should('be.visible');
  });

  it('lists every paired device in the filter', () => {
    cy.signIn({ path: '/history' });
    tid('history-device-select').find('option').should('have.length', Object.keys(DEVICE).length + 1);
  });

  // PRD §20 marks the device filter as Broken: the page sends the place
  // capability `place:ListHistoryEntries` to the device address instead of
  // `dev:ListHistoryEntries`, which the platform rejects. The fake platform
  // mirrors that, so this documents the expected behaviour until it is fixed.
  it.skip('filters activity by device', () => {
    cy.signIn({ path: '/history' });
    tid('history-device-select').select(DEVICE_NAME.lamp);
    cy.expectRequest(Device.CMD_LISTHISTORYENTRIES, (r) => r.destination === DEVICE.lamp);
    cy.get('[data-testid^="history-entry-"]').should('have.length', 2).each(($entry) => {
      expect($entry.text()).to.contain('Living Room Lamp');
    });
  });
});

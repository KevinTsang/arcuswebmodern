/**
 * PRD §2 — Dashboard / Home page: subsystem cards, favorites card, history
 * sidebar, cards hidden when a subsystem is absent, and the Preferences page
 * that orders/hides cards.
 */

import { Base, Scene } from '../../packages/arcus-core/src/capabilities/capabilities';
import { DEVICE, SCENE, SCENE_NAME, addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

const card = (slug: string) => tid(`card-${slug}`);
/** Status badges are scoped by their card: `status-value-<card>-<badge>`. */
const value = (cardSlug: string, badgeSlug: string) => tid(`status-value-${cardSlug}-${badgeSlug}`);

describe('Dashboard', () => {
  it('renders a card for every available subsystem with live values', () => {
    cy.signIn();

    value('alarms', 'security').should('have.text', 'Disarmed');
    value('alarms', 'devices').should('have.text', '0 offline');
    card('climate').should('contain', '72').and('contain', '41%');
    value('doors-locks', 'unlocked').should('have.text', '0');
    value('doors-locks', 'open').should('have.text', '0');
    value('doors-locks', 'total').should('have.text', '2');
    card('cameras').should('contain', '0 cameras');
    value('care', 'status').should('have.text', 'OK');
    value('care', 'behaviors').should('have.text', '2');
    value('home-family', 'home').should('have.text', '1');
    value('home-family', 'away').should('have.text', '1');
    value('lawn-garden', 'watering').should('have.text', '1');
    value('lawn-garden', 'controllers').should('have.text', '1');
    value('lights-switches', 'on').should('have.text', '1');
    value('lights-switches', 'total').should('have.text', '3');
    value('water', 'valves-closed').should('have.text', '0');
    value('water', 'devices').should('have.text', '2');
  });

  it('links each card to its subsystem page', () => {
    cy.signIn();
    tid('card-view-link-alarms').should('have.attr', 'href', '/services/alarms/status');
    tid('card-view-link-climate').click();
    cy.location('pathname').should('eq', '/services/climate/status');
    tid('subsystem-title').should('have.text', 'Climate');
  });

  it('hides the card of a subsystem the place does not have', () => {
    cy.signIn({
      customize: (p) => {
        delete p.data.entities[addr.subsystem('subcameras')];
      },
    });
    card('alarms').should('exist');
    card('cameras').should('not.exist');
  });

  it('updates card values in real time from platform events', () => {
    cy.signIn();
    value('doors-locks', 'open').should('have.text', '0');
    cy.platform().invoke('updateEntity', DEVICE.contact, { 'cont:contact': 'OPENED' });
    value('doors-locks', 'open').should('have.text', '1');
  });

  it('shows the recent history sidebar with a link to the full log', () => {
    cy.signIn();
    tid('dashboard-place-name').should('contain', 'Maple Street');
    cy.get('[data-testid^="dashboard-history-entry-"]').should('have.length', 4)
      .first().should('contain', 'Front Door Lock was locked.');
    tid('history-more-link').should('have.attr', 'href', '/history').click();
    cy.location('pathname').should('eq', '/history');
  });

  it('refreshes the history sidebar on demand', () => {
    cy.signIn();
    cy.expectRequest('place:ListDashboardEntries');
    cy.platform().then((p) => {
      p.data.history.unshift({
        timestamp: Date.now(),
        subjectName: 'Coffee Maker',
        subjectAddress: DEVICE.coffee,
        longMessage: 'Coffee Maker was turned on.',
      });
    });
    tid('dashboard-history-refresh').click();
    cy.get('[data-testid^="dashboard-history-entry-"]').should('have.length', 5)
      .first().should('contain', 'Coffee Maker was turned on.');
  });

  it('shows an empty state when there is no recent activity', () => {
    cy.signIn({ customize: (p) => { p.data.history = []; } });
    tid('dashboard-history-empty').should('be.visible');
  });

  it('toggles the history sidebar', () => {
    cy.signIn();
    tid('dashboard-sidebar').should('exist');
    tid('dashboard-sidebar-toggle').click();
    tid('dashboard-sidebar').should('not.exist');
    tid('dashboard-sidebar-toggle').click();
    tid('dashboard-sidebar').should('exist');
  });

  describe('Favorites card', () => {
    it('lists favorite scenes and fires one when clicked', () => {
      cy.signIn();
      tid('favorites-count').should('have.text', '1 favorite');
      tid('favorite-scene-goodnight').click();
      cy.expectRequest(Scene.CMD_FIRE, (r) => r.destination === SCENE.goodNight);
      cy.toast(`${SCENE_NAME.goodNight} executed`);
    });

    it('lists favorite devices and deep-links to them on the devices page', () => {
      cy.signIn({
        customize: (p) => {
          p.data.entities[DEVICE.lamp][Base.ATTR_TAGS] = ['FAVORITE'];
        },
      });
      tid('favorites-count').should('have.text', '2 favorites');
      tid(`favorite-device-${DEVICE.lamp}`).should('contain', 'Living Room Lamp').click();
      cy.location('pathname').should('eq', '/devices');
      cy.location('search').should('eq', `?device=${encodeURIComponent(DEVICE.lamp)}`);
      tid(`device-row-${DEVICE.lamp}`).should('have.class', 'ring-2');
    });

    it('shows a hint when nothing is favorited', () => {
      cy.signIn({
        customize: (p) => {
          p.data.entities[SCENE.goodNight][Base.ATTR_TAGS] = [];
        },
      });
      tid('favorites-empty').should('be.visible');
      tid('favorites-count').should('not.exist');
    });
  });
});

describe('Dashboard preferences', () => {
  it('reorders and hides cards and persists the result', () => {
    cy.signIn({ path: '/preferences' });
    tid('preferences-cards-title').should('have.text', 'Dashboard Cards');
    tid('preferences-save').should('not.exist');
    tid('preference-card-CLIMATE').should('have.attr', 'data-position', '5');

    tid('preference-move-up-CLIMATE').click();
    tid('preference-card-CLIMATE').should('have.attr', 'data-position', '4');
    tid('preference-visible-CAMERAS')
      .should('have.attr', 'aria-checked', 'true').click();
    tid('preferences-save').click();

    cy.toast('Preferences saved');
    cy.expectRequest('sess:SetPreferences').then((request) => {
      const prefs = request.attributes.prefs as { dashboardCards: { serviceName: string; hideCard: boolean }[] };
      expect(prefs.dashboardCards.slice(0, 5).map((c) => c.serviceName))
        .to.deep.eq(['FAVORITES', 'HISTORY', 'LIGHTS_N_SWITCHES', 'CLIMATE', 'ALARMS']);
      expect(prefs.dashboardCards.filter((c) => c.hideCard).map((c) => c.serviceName)).to.deep.eq(['CAMERAS']);
    });

    // The saved order is reloaded from the platform.
    cy.reload();
    cy.get('[data-testid="preference-card-CLIMATE"]', { timeout: 20000 }).should('have.attr', 'data-position', '4');
    tid('preference-visible-CAMERAS').should('have.attr', 'aria-checked', 'false');
  });

  it('applies saved preferences to the dashboard', () => {
    cy.signIn({ path: '/preferences' });
    tid('preference-move-up-CLIMATE').click();
    tid('preference-visible-CAMERAS').click();
    tid('preference-visible-HISTORY').click();
    tid('preferences-save').click();
    cy.toast('Preferences saved');

    // In-app navigation: the dashboard reads the updated preferences from the store.
    tid('header-home-link').click();
    cy.location('pathname').should('eq', '/home');
    card('climate').should('exist');
    card('cameras').should('not.exist');
    tid('dashboard-sidebar').should('not.exist');
    cy.get('[data-testid^="card-"]:not([data-testid^="card-view-link-"])').then(($cards) => {
      const order = [...$cards].map((el) => el.getAttribute('data-testid'));
      expect(order.slice(0, 4)).to.deep.eq(['card-favorites', 'card-lights-switches', 'card-climate', 'card-alarms']);
    });
  });

  it('loads saved preferences into the dashboard on sign-in', () => {
    cy.signIn({
      customize: (p) => {
        p.data.preferences = {
          dashboardCards: [
            { serviceName: 'WATER', hideCard: false },
            { serviceName: 'ALARMS', hideCard: true },
            { serviceName: 'HISTORY', hideCard: true },
          ],
        };
      },
    });
    card('water').should('exist');
    card('alarms').should('not.exist');
    tid('dashboard-sidebar').should('not.exist');
    cy.get('[data-testid^="card-"]:not([data-testid^="card-view-link-"])').first()
      .should('have.attr', 'data-testid', 'card-water');
  });

  it('reports a failure to save', () => {
    cy.signIn({ path: '/preferences' });
    cy.platform().invoke('failRequest', 'sess:SetPreferences');
    tid('preference-visible-WATER').click();
    tid('preferences-save').click();
    cy.toast('Failed to save preferences');
  });
});

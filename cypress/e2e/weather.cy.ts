/**
 * PRD §14 — Weather: the dashboard weather card, the NOAA alert banner and
 * panel with snooze, and the weather radio configurators (location, station,
 * alerts of interest).
 *
 * The weather radio and the weather subsystem are added per test (see
 * `withWeather`), so the shared fixture and other specs don't change.
 */

import {
  Base, Device, DeviceAdvanced, DeviceConnection, Place, Subsystem, WeatherRadio, WeatherSubsystem,
} from '../../packages/arcus-core/src/capabilities/capabilities';
import type { MockPlatform } from '../support/platform/MockPlatform';
import { PLACE_ID, addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

const RADIO = addr.device('noaa-kitchen');
const WEATHER = addr.subsystem('subweather');

interface WeatherSetup {
  /** The radio is sounding a tornado warning. */
  alerting?: boolean;
  /** The radio's `noaa:location`; `null` for a radio that has none yet. */
  location?: string | null;
}

/** A `signIn` customizer: a Texas address for the place, a weather radio and the weather subsystem. */
function withWeather({ alerting = false, location = '048453' }: WeatherSetup = {}) {
  return (p: MockPlatform) => {
    // place:state is blank, as the legacy add-place form saved it; place:stateProv holds the state.
    Object.assign(p.entity(addr.place) ?? {}, {
      [Place.ATTR_STATE]: '',
      [Place.ATTR_STATEPROV]: 'TX',
      [Place.ATTR_ADDRCOUNTY]: 'Travis',
    });
    p.addEntity({
      [Base.ATTR_ADDRESS]: RADIO,
      [Base.ATTR_ID]: 'noaa-kitchen',
      [Base.ATTR_TYPE]: 'dev',
      [Base.ATTR_CAPS]: ['base', 'dev', 'devadv', 'devconn', 'noaa'],
      [Base.ATTR_TAGS]: [],
      [Device.ATTR_NAME]: 'Kitchen Weather Radio',
      [Device.ATTR_DEVTYPEHINT]: 'Halo',
      [Device.ATTR_PLACE]: PLACE_ID,
      [DeviceAdvanced.ATTR_PROTOCOL]: 'ZIGB',
      [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE,
      [WeatherRadio.ATTR_ALERTSTATE]: alerting ? WeatherRadio.ALERTSTATE_ALERT : WeatherRadio.ALERTSTATE_NO_ALERT,
      [WeatherRadio.ATTR_PLAYINGSTATE]: WeatherRadio.PLAYINGSTATE_QUIET,
      [WeatherRadio.ATTR_CURRENTALERT]: alerting ? 'TOR' : 'NONE',
      [WeatherRadio.ATTR_LASTALERTTIME]: alerting ? Date.now() - 5 * 60_000 : 0,
      [WeatherRadio.ATTR_ALERTSOFINTEREST]: ['TOR'],
      [WeatherRadio.ATTR_STATIONSELECTED]: 3,
      ...(location ? { [WeatherRadio.ATTR_LOCATION]: location } : {}),
    });
    p.addEntity({
      [Base.ATTR_ADDRESS]: WEATHER,
      [Base.ATTR_ID]: PLACE_ID,
      [Base.ATTR_TYPE]: 'subweather',
      [Subsystem.ATTR_AVAILABLE]: true,
      [Subsystem.ATTR_STATE]: Subsystem.STATE_ACTIVE,
      [Subsystem.ATTR_PLACE]: PLACE_ID,
      [WeatherSubsystem.ATTR_WEATHERRADIOS]: [RADIO],
      [WeatherSubsystem.ATTR_ALERTINGRADIOS]: alerting ? [RADIO] : [],
      [WeatherSubsystem.ATTR_WEATHERALERT]: alerting ? WeatherSubsystem.WEATHERALERT_ALERT : WeatherSubsystem.WEATHERALERT_READY,
    });
  };
}

function startAlert() {
  cy.platform().then((p) => {
    p.updateEntity(RADIO, {
      [WeatherRadio.ATTR_ALERTSTATE]: WeatherRadio.ALERTSTATE_ALERT,
      [WeatherRadio.ATTR_CURRENTALERT]: 'SVR',
      [WeatherRadio.ATTR_LASTALERTTIME]: Date.now(),
    });
    p.updateEntity(WEATHER, {
      [WeatherSubsystem.ATTR_ALERTINGRADIOS]: [RADIO],
      [WeatherSubsystem.ATTR_WEATHERALERT]: WeatherSubsystem.WEATHERALERT_ALERT,
    });
  });
}

const openRadioConfig = () => {
  cy.signIn({ path: '/devices', customize: withWeather() });
  tid(`device-config-${RADIO}`).click();
  tid('side-panel-right-title').should('have.text', 'Configuration');
};

describe('Weather card and alerts (PRD §14)', () => {
  it('shows an all-clear weather card and no banner', () => {
    cy.signIn({ customize: withWeather() });
    tid(`weather-radio-${RADIO}`).should('contain', 'Kitchen Weather Radio');
    tid(`weather-radio-status-${RADIO}`).should('have.text', 'No alerts');
    tid('weather-alert-banner').should('not.exist');
    tid('weather-view-alerts').should('not.exist');
  });

  it('hides the weather card when the place has no weather radios', () => {
    cy.signIn();
    cy.get('[data-testid^="weather-radio-"]').should('not.exist');
    tid('weather-alert-banner').should('not.exist');
  });

  it('shows the alert banner and panel, then snoozes every alert', () => {
    cy.signIn({ customize: withWeather({ alerting: true }) });

    tid('weather-alert-banner-label').should('contain', 'Tornado Warning');
    tid(`weather-radio-status-${RADIO}`).should('have.text', 'Tornado Warning');

    tid('weather-alert-banner').click();
    tid('side-panel-right-title').should('have.text', 'Weather Alerts');
    tid(`weather-alert-${RADIO}`).should('contain', 'Tornado Warning').and('contain', 'Kitchen Weather Radio');
    // place:state is blank, so the state comes from place:stateProv.
    tid(`weather-alert-location-${RADIO}`).should('have.text', 'Travis County, TX');

    tid('weather-alerts-snooze').click();
    cy.expectRequest(WeatherSubsystem.CMD_SNOOZEALLALERTS, (r) => r.destination === WEATHER);
    cy.toast('Weather alerts snoozed');
    tid('weather-alerts-panel').should('not.exist');
    tid('weather-alert-banner').should('not.exist');
    tid(`weather-radio-status-${RADIO}`).should('have.text', 'Alert snoozed');
  });

  it('opens the alerts from the weather card', () => {
    cy.signIn({ customize: withWeather({ alerting: true }) });
    tid('weather-view-alerts').click();
    tid('weather-alerts-panel').should('be.visible');
    tid(`weather-alert-${RADIO}`).should('contain', 'Tornado Warning');
  });

  it('shows the banner when an alert starts while signed in', () => {
    cy.signIn({ customize: withWeather() });
    tid('weather-alert-banner').should('not.exist');

    startAlert();
    tid('weather-alert-banner-label').should('contain', 'Severe Thunderstorm Warning');
    tid(`weather-radio-status-${RADIO}`).should('have.text', 'Severe Thunderstorm Warning');
  });

  it('keeps the alert when snoozing fails', () => {
    cy.signIn({ customize: withWeather({ alerting: true }) });
    cy.platform().invoke('failRequest', WeatherSubsystem.CMD_SNOOZEALLALERTS);

    tid('weather-alert-banner').click();
    tid('weather-alerts-snooze').click();
    cy.toast('Failed to snooze weather alerts');
    tid('weather-alerts-panel').should('be.visible');
    tid('weather-alert-banner').should('exist');
  });
});

describe('Weather radio configuration (PRD §14)', () => {
  it('changes the radio location to another county', () => {
    openRadioConfig();
    tid('noaa-location-code').should('have.text', 'S.A.M.E. code: 048453');
    // place:state is blank, so Texas comes from place:stateProv.
    tid('noaa-location-state').should('have.value', 'TX');
    tid('noaa-location-county').should('have.value', 'Travis').select('Bexar');

    cy.expectRequestAttrs('nwssamecode:GetSameCode', { stateCode: 'TX', county: 'Bexar' });
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === RADIO && r.attributes[WeatherRadio.ATTR_LOCATION] === '048029');
    tid('noaa-location-code').should('have.text', 'S.A.M.E. code: 048029');
  });

  it('saves the county prefilled from the place for a radio without a location', () => {
    cy.signIn({ path: '/devices', customize: withWeather({ location: null }) });
    tid(`device-config-${RADIO}`).click();

    tid('noaa-location-code').should('have.text', 'No location set');
    tid('noaa-location-save').should('have.text', 'Save Travis County').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === RADIO && r.attributes[WeatherRadio.ATTR_LOCATION] === '048453');
    tid('noaa-location-code').should('have.text', 'S.A.M.E. code: 048453');
    tid('noaa-location-save').should('not.exist');
  });

  it('retries loading the states after a failure', () => {
    cy.signIn({
      path: '/devices',
      customize: (p) => {
        withWeather()(p);
        // React's dev StrictMode mounts effects twice and drops the first request, so fail both.
        p.failRequest('nwssamecode:ListSameStates', 'error.test', 'Simulated failure', 2);
      },
    });
    tid(`device-config-${RADIO}`).click();

    tid('noaa-location-states-failed').should('be.visible');
    tid('noaa-location-states-retry').click();
    tid('noaa-location-state').should('have.value', 'TX');
  });

  it('scans for stations, previews one and selects it', () => {
    openRadioConfig();
    tid('noaa-radio-selected').should('have.text', 'Monitoring station 3');

    tid('noaa-radio-scan').click();
    cy.expectRequest(WeatherRadio.CMD_SCANSTATIONS, (r) => r.destination === RADIO);
    // Strongest first; the station out of range is left out.
    cy.get('li[data-testid^="noaa-station-"]').should('have.length', 2)
      .first().should('have.attr', 'data-testid', 'noaa-station-3');
    tid('noaa-station-1').should('exist');
    tid('noaa-station-5').should('not.exist');

    tid('noaa-station-play-1').click();
    cy.expectRequestAttrs(WeatherRadio.CMD_PLAYSTATION, { station: 1, time: 10 });
    tid('noaa-station-stop-1').click();
    cy.expectRequest(WeatherRadio.CMD_STOPPLAYINGSTATION, (r) => r.destination === RADIO);

    tid('noaa-station-select-1').check();
    cy.expectRequestAttrs(WeatherRadio.CMD_SELECTSTATION, { station: 1 });
    tid('noaa-radio-selected').should('have.text', 'Monitoring station 1');
  });

  it('reports a failed scan without blaming the signal', () => {
    openRadioConfig();
    cy.platform().invoke('failRequest', WeatherRadio.CMD_SCANSTATIONS);

    tid('noaa-radio-scan').click();
    cy.toast('Failed to scan for weather radio stations');
    tid('noaa-radio-scan-failed').should('be.visible');
    tid('noaa-radio-weak-signal').should('not.exist');
    tid('noaa-radio-scan').should('have.text', 'Scan Again');
  });

  it('subscribes to more alert types, one after another', () => {
    openRadioConfig();
    tid('noaa-alert-TOR').should('be.checked');

    tid('noaa-alert-SVR').check();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) => {
      const codes = r.attributes[WeatherRadio.ATTR_ALERTSOFINTEREST] as string[] | undefined;
      return r.destination === RADIO && !!codes && codes.includes('TOR') && codes.includes('SVR');
    });
    tid('noaa-alert-SVR').should('be.checked');

    tid('noaa-alert-TOR').uncheck();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) => {
      const codes = r.attributes[WeatherRadio.ATTR_ALERTSOFINTEREST] as string[] | undefined;
      return r.destination === RADIO && !!codes && codes.length === 1 && codes[0] === 'SVR';
    });
    tid('noaa-alert-TOR').should('not.be.checked');
  });
});

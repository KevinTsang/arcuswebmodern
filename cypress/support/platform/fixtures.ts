/**
 * Default data set served by the fake platform: one household ("Maple Street")
 * with a hub, a handful of devices spanning the main device families, every
 * subsystem the dashboard knows about, two scenes and three rules.
 *
 * Specs get a fresh deep copy for every test and may mutate it through
 * `cy.signIn({ customize })` or the `platform` engine.
 */

import {
  AlarmSubsystem, Base, CamerasSubsystem, CareSubsystem, ClimateSubsystem, Contact,
  Device, DeviceConnection, DevicePower, Dimmer, DoorLock, DoorsNLocksSubsystem, Hub,
  HubConnection, IrrigationController, LawnNGardenSubsystem, LeakH2O,
  LightsNSwitchesSubsystem, Motion, PairingSubsystem, Person, Place, PresenceSubsystem,
  RelativeHumidity, Rule, RuleTemplate, SafetySubsystem, Scene, SecurityAlarmMode,
  SecuritySubsystem, Subsystem, Switch, Temperature, Thermostat, Valve, WaterSubsystem,
  Product, Account,
} from '../../../packages/arcus-core/src/capabilities/capabilities';
import type { Attrs, HistoryEntryFixture, PlatformData } from './types';

// ── Ids & addresses ───────────────────────────────────────────────────

export const PLACE_ID = 'place-maple';
export const PERSON_ID = 'person-alex';
export const ACCOUNT_ID = 'account-maple';
export const HUB_ID = 'LWF-1234';

export const addr = {
  place: `SERV:place:${PLACE_ID}`,
  person: `SERV:person:${PERSON_ID}`,
  account: `SERV:account:${ACCOUNT_ID}`,
  hub: `SERV:${HUB_ID}:hub`,
  device: (id: string) => `DRIV:dev:${id}`,
  subsystem: (ns: string) => `SERV:${ns}:${PLACE_ID}`,
  scene: (id: string) => `SERV:scene:${PLACE_ID}.${id}`,
  rule: (id: string) => `SERV:rule:${PLACE_ID}.${id}`,
  ruleTemplate: (id: string) => `SERV:ruletmpl:${id}`,
  scheduler: (id: string) => `SERV:scheduler:${id}`,
  incident: (id: string) => `SERV:incident:${id}`,
};

/** Device ids → addresses, exported so specs can refer to devices by name. */
export const DEVICE = {
  lamp: addr.device('lamp'),
  coffee: addr.device('coffee'),
  lock: addr.device('frontlock'),
  frontDoor: addr.device('frontdoor'),
  thermostat: addr.device('thermostat'),
  leak: addr.device('leak'),
  valve: addr.device('valve'),
  sprinkler: addr.device('sprinkler'),
  motion: addr.device('motion'),
};

export const DEVICE_NAME = {
  lamp: 'Living Room Lamp',
  coffee: 'Coffee Maker',
  lock: 'Front Door Lock',
  frontDoor: 'Front Door Sensor',
  thermostat: 'Hallway Thermostat',
  leak: 'Basement Leak Sensor',
  valve: 'Main Water Valve',
  sprinkler: 'Backyard Sprinklers',
  motion: 'Hallway Motion',
};

export const SCENE = {
  goodNight: addr.scene('goodnight'),
  movieTime: addr.scene('movie'),
};

export const RULE = {
  lightsOnMotion: addr.rule('1'),
  lockAtNight: addr.rule('2'),
  leakAlert: addr.rule('3'),
};

// ── Builders ──────────────────────────────────────────────────────────

const BASE_DEVICE_CAPS = ['base', 'dev', 'devadv', 'devconn', 'devpow'];

function device(
  id: string,
  name: string,
  typeHint: string,
  extraCaps: string[],
  attrs: Attrs,
): Attrs {
  const address = addr.device(id);
  return {
    [Base.ATTR_ADDRESS]: address,
    [Base.ATTR_ID]: id,
    [Base.ATTR_TYPE]: 'dev',
    [Base.ATTR_CAPS]: [...BASE_DEVICE_CAPS, ...extraCaps],
    [Device.ATTR_NAME]: name,
    [Device.ATTR_DEVTYPEHINT]: typeHint,
    [Device.ATTR_VENDOR]: 'Acme',
    [Device.ATTR_MODEL]: `${typeHint}-1`,
    [Device.ATTR_PLACE]: PLACE_ID,
    [Device.ATTR_PRODUCTID]: `prod-${id}`,
    [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE,
    [DevicePower.ATTR_SOURCE]: 'LINE',
    ...attrs,
  };
}

function subsystem(namespace: string, attrs: Attrs = {}): Attrs {
  const address = addr.subsystem(namespace);
  return {
    [Base.ATTR_ADDRESS]: address,
    [Base.ATTR_ID]: PLACE_ID,
    [Base.ATTR_TYPE]: namespace,
    [Subsystem.ATTR_AVAILABLE]: true,
    [Subsystem.ATTR_STATE]: Subsystem.STATE_ACTIVE,
    [Subsystem.ATTR_PLACE]: PLACE_ID,
    ...attrs,
  };
}

function minutesAgo(minutes: number): number {
  return Date.now() - minutes * 60_000;
}

// ── The fixture ───────────────────────────────────────────────────────

export function createFixture(): PlatformData {
  const devices: Attrs[] = [
    device('lamp', DEVICE_NAME.lamp, 'Dimmer', ['swit', 'dim'], {
      [Switch.ATTR_STATE]: Switch.STATE_ON,
      [Dimmer.ATTR_BRIGHTNESS]: 75,
    }),
    device('coffee', DEVICE_NAME.coffee, 'Switch', ['swit'], {
      [Switch.ATTR_STATE]: Switch.STATE_OFF,
    }),
    device('frontlock', DEVICE_NAME.lock, 'Lock', ['doorlock'], {
      [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_LOCKED,
      [DevicePower.ATTR_SOURCE]: 'BATTERY',
      [DevicePower.ATTR_BATTERY]: 88,
    }),
    device('frontdoor', DEVICE_NAME.frontDoor, 'Contact', ['cont', 'temp'], {
      [Contact.ATTR_CONTACT]: Contact.CONTACT_CLOSED,
      [Contact.ATTR_USEHINT]: Contact.USEHINT_DOOR,
      [Temperature.ATTR_TEMPERATURE]: 21,
      [DevicePower.ATTR_SOURCE]: 'BATTERY',
      [DevicePower.ATTR_BATTERY]: 95,
    }),
    device('thermostat', DEVICE_NAME.thermostat, 'Thermostat', ['therm', 'temp', 'humid'], {
      [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_HEAT,
      [Thermostat.ATTR_HEATSETPOINT]: 20,
      [Thermostat.ATTR_COOLSETPOINT]: 25,
      [Thermostat.ATTR_SUPPORTEDMODES]: ['OFF', 'HEAT', 'COOL', 'AUTO'],
      [Thermostat.ATTR_SUPPORTSAUTO]: true,
      [Temperature.ATTR_TEMPERATURE]: 22,
      [RelativeHumidity.ATTR_HUMIDITY]: 41,
    }),
    device('leak', DEVICE_NAME.leak, 'WaterLeak', ['leakh2o', 'temp'], {
      [LeakH2O.ATTR_STATE]: LeakH2O.STATE_SAFE,
      [DevicePower.ATTR_SOURCE]: 'BATTERY',
      [DevicePower.ATTR_BATTERY]: 70,
    }),
    device('valve', DEVICE_NAME.valve, 'WaterValve', ['valv'], {
      [Valve.ATTR_VALVESTATE]: Valve.VALVESTATE_OPEN,
    }),
    device('sprinkler', DEVICE_NAME.sprinkler, 'Irrigation', ['irrcont'], {
      [IrrigationController.ATTR_CONTROLLERSTATE]: IrrigationController.CONTROLLERSTATE_NOT_WATERING,
      [IrrigationController.ATTR_NUMZONES]: 4,
    }),
    device('motion', DEVICE_NAME.motion, 'Motion', ['mot', 'temp'], {
      [Motion.ATTR_MOTION]: 'NONE',
      [DevicePower.ATTR_SOURCE]: 'BATTERY',
      [DevicePower.ATTR_BATTERY]: 60,
    }),
  ];

  const subsystems: Attrs[] = [
    subsystem('subalarm', {
      [AlarmSubsystem.ATTR_ALARMSTATE]: AlarmSubsystem.ALARMSTATE_READY,
      [AlarmSubsystem.ATTR_CALLTREE]: [],
      [AlarmSubsystem.ATTR_AVAILABLEALERTS]: ['SECURITY', 'SMOKE', 'CO', 'WATER', 'PANIC'],
      [AlarmSubsystem.ATTR_ACTIVEALERTS]: [],
    }),
    subsystem('subsecurity', {
      [SecuritySubsystem.ATTR_ALARMMODE]: SecuritySubsystem.ALARMMODE_OFF,
      [SecuritySubsystem.ATTR_ALARMSTATE]: SecuritySubsystem.ALARMSTATE_DISARMED,
      [SecuritySubsystem.ATTR_SECURITYDEVICES]: [DEVICE.frontDoor, DEVICE.motion],
      [SecuritySubsystem.ATTR_TRIGGEREDDEVICES]: [],
      [SecuritySubsystem.ATTR_OFFLINEDEVICES]: [],
      [`${SecurityAlarmMode.ATTR_DEVICES}:ON`]: [DEVICE.frontDoor, DEVICE.motion],
      [`${SecurityAlarmMode.ATTR_DEVICES}:PARTIAL`]: [DEVICE.frontDoor],
      [`${SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC}:ON`]: 30,
      [`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:ON`]: 30,
      [`${SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC}:PARTIAL`]: 15,
      [`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:PARTIAL`]: 15,
    }),
    subsystem('subsafety', {
      [SafetySubsystem.ATTR_TOTALDEVICES]: [DEVICE.leak],
      [SafetySubsystem.ATTR_ACTIVEDEVICES]: [DEVICE.leak],
      [SafetySubsystem.ATTR_TRIGGERS]: {},
    }),
    subsystem('subclimate', {
      [ClimateSubsystem.ATTR_CONTROLDEVICES]: [DEVICE.thermostat],
      [ClimateSubsystem.ATTR_TEMPERATUREDEVICES]: [DEVICE.thermostat, DEVICE.frontDoor],
      [ClimateSubsystem.ATTR_HUMIDITYDEVICES]: [DEVICE.thermostat],
      [ClimateSubsystem.ATTR_PRIMARYTEMPERATUREDEVICE]: DEVICE.thermostat,
      [ClimateSubsystem.ATTR_PRIMARYHUMIDITYDEVICE]: DEVICE.thermostat,
      [ClimateSubsystem.ATTR_THERMOSTATS]: [DEVICE.thermostat],
    }),
    subsystem('subdoorsnlocks', {
      [DoorsNLocksSubsystem.ATTR_LOCKDEVICES]: [DEVICE.lock],
      [DoorsNLocksSubsystem.ATTR_CONTACTSENSORDEVICES]: [DEVICE.frontDoor],
      [DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES]: [],
      [DoorsNLocksSubsystem.ATTR_PETDOORDEVICES]: [],
      [DoorsNLocksSubsystem.ATTR_CHIMECONFIG]: {},
    }),
    subsystem('sublightsnswitches', {
      [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: [DEVICE.lamp, DEVICE.coffee],
    }),
    subsystem('subwater', {
      [WaterSubsystem.ATTR_WATERDEVICES]: [DEVICE.leak, DEVICE.valve],
      [WaterSubsystem.ATTR_CLOSEDWATERVALVES]: [],
    }),
    subsystem('sublawnngarden', {
      [LawnNGardenSubsystem.ATTR_CONTROLLERS]: [DEVICE.sprinkler],
      [LawnNGardenSubsystem.ATTR_ZONESWATERING]: {
        [DEVICE.sprinkler]: {
          controller: DEVICE.sprinkler,
          zone: 'z1',
          duration: 10,
          startTime: minutesAgo(1),
          trigger: 'SCHEDULED',
        },
      },
    }),
    subsystem('subcameras', {
      [CamerasSubsystem.ATTR_CAMERAS]: [],
      [CamerasSubsystem.ATTR_OFFLINECAMERAS]: [],
    }),
    subsystem('subcare', {
      [CareSubsystem.ATTR_CAREDEVICES]: [],
      [CareSubsystem.ATTR_BEHAVIORS]: {},
      [CareSubsystem.ATTR_ALARMSTATE]: CareSubsystem.ALARMSTATE_READY,
      [CareSubsystem.ATTR_ALARMMODE]: CareSubsystem.ALARMMODE_ON,
    }),
    subsystem('subspres', {
      [PresenceSubsystem.ATTR_PEOPLEATHOME]: [addr.person],
      [PresenceSubsystem.ATTR_PEOPLEAWAY]: [],
      [PresenceSubsystem.ATTR_ALLDEVICES]: [],
      [PresenceSubsystem.ATTR_OCCUPIED]: true,
    }),
    subsystem('subpairing', {
      [PairingSubsystem.ATTR_PAIRINGMODE]: PairingSubsystem.PAIRINGMODE_IDLE,
      [PairingSubsystem.ATTR_PAIRINGDEVICES]: [],
    }),
  ];

  const scenes: Attrs[] = [
    {
      [Base.ATTR_ADDRESS]: SCENE.goodNight,
      [Base.ATTR_ID]: 'goodnight',
      [Base.ATTR_TYPE]: 'scene',
      [Scene.ATTR_NAME]: 'Good Night',
      [Scene.ATTR_ENABLED]: true,
      [Scene.ATTR_NOTIFICATION]: false,
      [Scene.ATTR_TEMPLATE]: 'custom',
      [Scene.ATTR_FILTERUNCHANGED]: false,
      [Scene.ATTR_ACTIONS]: [
        { name: 'Lights & Switches', template: 'switch', context: { [DEVICE.lamp]: { state: 'OFF' } } },
      ],
    },
    {
      [Base.ATTR_ADDRESS]: SCENE.movieTime,
      [Base.ATTR_ID]: 'movie',
      [Base.ATTR_TYPE]: 'scene',
      [Scene.ATTR_NAME]: 'Movie Time',
      [Scene.ATTR_ENABLED]: true,
      [Scene.ATTR_NOTIFICATION]: true,
      [Scene.ATTR_TEMPLATE]: 'custom',
      [Scene.ATTR_FILTERUNCHANGED]: false,
      [Scene.ATTR_ACTIONS]: [
        { name: 'Lights & Switches', template: 'switch', context: { [DEVICE.lamp]: { state: 'ON' } } },
        { name: 'Lights & Switches', template: 'switch', context: { [DEVICE.coffee]: { state: 'OFF' } } },
      ],
    },
  ];

  const rules: Attrs[] = [
    {
      [Base.ATTR_ADDRESS]: RULE.lightsOnMotion,
      [Base.ATTR_ID]: '1',
      [Base.ATTR_TYPE]: 'rule',
      [Rule.ATTR_NAME]: 'Hallway lights on motion',
      [Rule.ATTR_DESCRIPTION]: 'Turn on the Living Room Lamp when Hallway Motion detects motion',
      [Rule.ATTR_STATE]: Rule.STATE_ENABLED,
      [Rule.ATTR_TEMPLATE]: 'motion-light',
      [Rule.ATTR_CONTEXT]: { motion: DEVICE.motion, light: DEVICE.lamp },
    },
    {
      [Base.ATTR_ADDRESS]: RULE.lockAtNight,
      [Base.ATTR_ID]: '2',
      [Base.ATTR_TYPE]: 'rule',
      [Rule.ATTR_NAME]: 'Lock up at night',
      [Rule.ATTR_DESCRIPTION]: 'Lock the Front Door Lock at 10:00 PM',
      [Rule.ATTR_STATE]: Rule.STATE_DISABLED,
      [Rule.ATTR_TEMPLATE]: 'lock-at-time',
      [Rule.ATTR_CONTEXT]: { lock: DEVICE.lock },
    },
    {
      [Base.ATTR_ADDRESS]: RULE.leakAlert,
      [Base.ATTR_ID]: '3',
      [Base.ATTR_TYPE]: 'rule',
      [Rule.ATTR_NAME]: 'Leak alert',
      [Rule.ATTR_DESCRIPTION]: 'Notify me if Basement Leak Sensor detects water',
      [Rule.ATTR_STATE]: Rule.STATE_ENABLED,
      [Rule.ATTR_TEMPLATE]: 'leak-notify',
      [Rule.ATTR_CONTEXT]: { sensor: DEVICE.leak },
    },
  ];

  const ruleTemplates: Attrs[] = [
    {
      [Base.ATTR_ADDRESS]: addr.ruleTemplate('motion-light'),
      [Base.ATTR_ID]: 'motion-light',
      [RuleTemplate.ATTR_NAME]: 'Lights on motion',
      [RuleTemplate.ATTR_DESCRIPTION]: 'Turn a light on when motion is detected',
      [RuleTemplate.ATTR_TEMPLATE]: 'Turn on ${light} when ${motion} detects motion',
      [RuleTemplate.ATTR_CATEGORIES]: ['Lights & Switches'],
      [RuleTemplate.ATTR_SATISFIABLE]: true,
      [RuleTemplate.ATTR_PREMIUM]: false,
    },
    {
      [Base.ATTR_ADDRESS]: addr.ruleTemplate('lock-at-time'),
      [Base.ATTR_ID]: 'lock-at-time',
      [RuleTemplate.ATTR_NAME]: 'Lock at a set time',
      [RuleTemplate.ATTR_DESCRIPTION]: 'Lock a door every day at a time you choose',
      [RuleTemplate.ATTR_TEMPLATE]: 'Lock ${lock} every day',
      [RuleTemplate.ATTR_CATEGORIES]: ['Doors & Locks'],
      [RuleTemplate.ATTR_SATISFIABLE]: true,
      [RuleTemplate.ATTR_PREMIUM]: false,
    },
    {
      [Base.ATTR_ADDRESS]: addr.ruleTemplate('leak-notify'),
      [Base.ATTR_ID]: 'leak-notify',
      [RuleTemplate.ATTR_NAME]: 'Leak notification',
      [RuleTemplate.ATTR_DESCRIPTION]: 'Get notified when a leak sensor trips',
      [RuleTemplate.ATTR_TEMPLATE]: 'Notify me if ${sensor} detects water',
      [RuleTemplate.ATTR_CATEGORIES]: ['Safety', 'Water'],
      [RuleTemplate.ATTR_SATISFIABLE]: true,
      [RuleTemplate.ATTR_PREMIUM]: false,
    },
  ];

  const place: Attrs = {
    [Base.ATTR_ADDRESS]: addr.place,
    [Base.ATTR_ID]: PLACE_ID,
    [Base.ATTR_TYPE]: 'place',
    [Place.ATTR_NAME]: 'Maple Street',
    [Place.ATTR_STREETADDRESS1]: '123 Maple Street',
    [Place.ATTR_CITY]: 'Springfield',
    [Place.ATTR_STATEPROV]: 'IL',
    [Place.ATTR_ZIPCODE]: '62701',
    [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_BASIC,
    [Place.ATTR_ACCOUNT]: ACCOUNT_ID,
  };

  const hub: Attrs = {
    [Base.ATTR_ADDRESS]: addr.hub,
    [Base.ATTR_ID]: HUB_ID,
    [Base.ATTR_TYPE]: 'hub',
    [Hub.ATTR_ID]: HUB_ID,
    [Hub.ATTR_NAME]: 'Home Hub',
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
    [Hub.ATTR_REGISTRATIONSTATE]: Hub.REGISTRATIONSTATE_REGISTERED,
    [HubConnection.ATTR_STATE]: HubConnection.STATE_ONLINE,
    [Hub.ATTR_MODEL]: 'IH300',
    [Hub.ATTR_VENDOR]: 'Arcus',
    [Hub.ATTR_PLACE]: PLACE_ID,
  };

  const owner: Attrs = {
    [Base.ATTR_ADDRESS]: addr.person,
    [Base.ATTR_ID]: PERSON_ID,
    [Base.ATTR_TYPE]: 'person',
    [Person.ATTR_FIRSTNAME]: 'Alex',
    [Person.ATTR_LASTNAME]: 'Rivera',
    [Person.ATTR_EMAIL]: 'alex@example.com',
    [Person.ATTR_MOBILENUMBER]: '5551234567',
    [Person.ATTR_HASPIN]: true,
  };

  const guest: Attrs = {
    [Base.ATTR_ADDRESS]: 'SERV:person:person-sam',
    [Base.ATTR_ID]: 'person-sam',
    [Base.ATTR_TYPE]: 'person',
    [Person.ATTR_FIRSTNAME]: 'Sam',
    [Person.ATTR_LASTNAME]: 'Rivera',
    [Person.ATTR_EMAIL]: 'sam@example.com',
    [Person.ATTR_MOBILENUMBER]: '5559876543',
    [Person.ATTR_HASPIN]: true,
  };

  const account: Attrs = {
    [Base.ATTR_ADDRESS]: addr.account,
    [Base.ATTR_ID]: ACCOUNT_ID,
    [Base.ATTR_TYPE]: 'account',
    [Account.ATTR_STATE]: 'COMPLETE',
    [Account.ATTR_OWNER]: PERSON_ID,
  };

  const entities: PlatformData['entities'] = {};
  for (const entity of [
    ...devices, ...subsystems, ...scenes, ...rules, ...ruleTemplates,
    place, hub, owner, guest, account,
  ]) {
    entities[entity[Base.ATTR_ADDRESS] as string] = entity;
  }

  const history: HistoryEntryFixture[] = [
    { timestamp: minutesAgo(5), subjectName: DEVICE_NAME.lock, longMessage: 'Front Door Lock was locked.' },
    { timestamp: minutesAgo(25), subjectName: DEVICE_NAME.lamp, longMessage: 'Living Room Lamp was turned on.' },
    { timestamp: minutesAgo(90), subjectName: DEVICE_NAME.motion, longMessage: 'Hallway Motion detected motion.' },
  ];

  const products: Attrs[] = [
    {
      [Product.ATTR_ID]: 'acme-plug',
      [Product.ATTR_NAME]: 'Acme Smart Plug',
      [Product.ATTR_VENDOR]: 'Acme',
      [Product.ATTR_HUBREQUIRED]: true,
      [Product.ATTR_PAIRINGMODE]: Product.PAIRINGMODE_HUB,
      [Product.ATTR_CANBROWSE]: true,
      [Product.ATTR_CANSEARCH]: true,
      [Product.ATTR_CATEGORIES]: ['Lights & Switches'],
      [Product.ATTR_SHORTNAME]: 'Smart Plug',
      [Product.ATTR_DESCRIPTION]: 'A plug-in outlet switch.',
    },
    {
      [Product.ATTR_ID]: 'globex-lock',
      [Product.ATTR_NAME]: 'Globex Deadbolt',
      [Product.ATTR_VENDOR]: 'Globex',
      [Product.ATTR_HUBREQUIRED]: true,
      [Product.ATTR_PAIRINGMODE]: Product.PAIRINGMODE_HUB,
      [Product.ATTR_CANBROWSE]: true,
      [Product.ATTR_CANSEARCH]: true,
      [Product.ATTR_CATEGORIES]: ['Doors & Locks'],
      [Product.ATTR_SHORTNAME]: 'Deadbolt',
      [Product.ATTR_DESCRIPTION]: 'A keyless deadbolt.',
    },
    {
      [Product.ATTR_ID]: 'initech-cam',
      [Product.ATTR_NAME]: 'Initech WiFi Camera',
      [Product.ATTR_VENDOR]: 'Initech',
      [Product.ATTR_HUBREQUIRED]: false,
      [Product.ATTR_PAIRINGMODE]: Product.PAIRINGMODE_WIFI,
      [Product.ATTR_CANBROWSE]: true,
      [Product.ATTR_CANSEARCH]: true,
      [Product.ATTR_CATEGORIES]: ['Cameras'],
      [Product.ATTR_SHORTNAME]: 'WiFi Camera',
      [Product.ATTR_DESCRIPTION]: 'An indoor WiFi camera.',
    },
  ];

  return {
    personId: PERSON_ID,
    placeId: PLACE_ID,
    accountId: ACCOUNT_ID,
    places: [
      { placeId: PLACE_ID, placeName: 'Maple Street', accountId: ACCOUNT_ID, role: 'OWNER' },
      { placeId: 'place-lake', placeName: 'Lake House', accountId: ACCOUNT_ID, role: 'FAMILY' },
    ],
    entities,
    preferences: {},
    history,
    products,
    ruleSelectors: {
      [addr.ruleTemplate('motion-light')]: {
        light: {
          type: 'LIST',
          name: 'Light',
          options: [[DEVICE_NAME.lamp, DEVICE.lamp], [DEVICE_NAME.coffee, DEVICE.coffee]],
        },
        motion: {
          type: 'LIST',
          name: 'Motion sensor',
          options: [[DEVICE_NAME.motion, DEVICE.motion]],
        },
      },
      [addr.ruleTemplate('lock-at-time')]: {
        lock: { type: 'LIST', name: 'Lock', options: [[DEVICE_NAME.lock, DEVICE.lock]] },
      },
      [addr.ruleTemplate('leak-notify')]: {
        sensor: { type: 'LIST', name: 'Leak sensor', options: [[DEVICE_NAME.leak, DEVICE.leak]] },
      },
    },
    sceneActions: [
      {
        id: 'switch',
        name: 'Lights & Switches',
        satisfiable: true,
        premium: false,
        typehint: 'switch',
        selectors: {
          [DEVICE.lamp]: [
            { type: 'GROUP', name: 'switch', value: [['ON', []], ['OFF', []]] },
          ],
          [DEVICE.coffee]: [
            { type: 'GROUP', name: 'switch', value: [['ON', []], ['OFF', []]] },
          ],
        },
      },
    ],
    invitations: [],
  };
}

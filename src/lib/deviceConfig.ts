/**
 * Device type configuration — ported from config/device.js.
 *
 * Maps device type hints and product IDs to UI configuration (icons, actions,
 * badges, configurators). This data-driven approach determines what UI
 * components to render for each device type.
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface DeviceWebConfig {
  'web:icon:on': string;
  'web:icon:off': string;
  'web:icon:catalog': string;
  'web:icon:onAndOpen': string | null;
  'web:icon:onAndClosed': string | null;
  'web:icon:offAndOpen': string | null;
  'web:icon:offAndClosed': string | null;
  'web:icon:onText': string | null;
  'web:panel:status': string;
  'web:panel:statusComponent': string;
  'web:panel:action': string | null;
  'web:card:action': string | null;
  'web:card:hoveraction': string | null;
  'web:card:status': string;
  'web:card:statusComponent': string;
  'web:card:hoverstatus': string | null;
  'web:isOnUnlessOffline': boolean;
  'web:scene:groupString': string | null;
  'web:switch:auxLabel': string | null;
  'web:therm:autoDescription': string;
  'web:devpow:batterycapable': boolean;
  'web:dev:hasDetails': boolean;
  'web:dev:customErrorComponent': string | null;
  'web:dev:hasCustomErrorLink': boolean;
  'web:dev:supported': boolean;
  'web:dev:supportLinkKey': string;
  'web:dev:scheduleConfig': string | null;
}

type DeviceObj = Record<string, unknown>;
type BadgeFn = (device: DeviceObj) => string[];
type ConfiguratorFn = (device: DeviceObj) => string[];

interface CapabilityPlugin {
  badges?: string[] | BadgeFn;
  configurators?: string[] | ConfiguratorFn;
}

// ── Capability Plugins ────────────────────────────────────────────────
// Maps capability attributes → UI components. Functions receive the device.

function hasCapability(device: DeviceObj, ns: string): boolean {
  const caps = device['base:caps'] as string[] | undefined;
  return caps?.includes(ns) ?? false;
}

export const capabilityPlugins: Record<string, CapabilityPlugin> = {
  'valv:valvestate': { badges: ['opened'] },
  'halo:roomNames': { configurators: ['assign-halo-room'] },
  'cont:contact': { badges: ['opened'], configurators: ['contact-setting'] },
  'tilt:tiltstate': { badges: ['opened'], configurators: ['orientation'] },
  'temp:temperature': {
    badges: (dev) => {
      const hint = dev['dev:devtypehint'] as string;
      if (['KeyPad', 'Button', 'vent', 'Contact', 'Motion', 'Halo'].includes(hint)) {
        return ['temperature'];
      }
      return [];
    },
  },
  'pow:instantaneous': {
    badges: (dev) => (dev['pow:instantaneous'] ? ['power'] : []),
  },
  'dim:brightness': {
    badges: (dev) => {
      const hint = dev['dev:devtypehint'] as string;
      return hint === 'Halo' ? [] : ['brightness'];
    },
    configurators: ['brightness'],
  },
  'ill:illuminance': { badges: ['illuminance'] },
  'uvi:index': { badges: ['ultraviolet-index'] },
  'light:colormode': {
    configurators: (dev) => {
      const color = hasCapability(dev, 'color');
      const colorTemp = hasCapability(dev, 'colortemp');
      if (color || colorTemp) {
        return (dev['dev:devtypehint'] as string) === 'Halo'
          ? ['color']
          : ['color-or-colortemp'];
      }
      return [];
    },
  },
  'colortemp:colortemp': { badges: ['colortemp'] },
  'pres:presence': { badges: ['presence'] },
  'pres:person': {
    configurators: (dev) => {
      const cfgs = ['assign-device'];
      if ((dev['dev:devtypehint'] as string) === 'Pendant') cfgs.push('test-coverage');
      return cfgs;
    },
  },
  'fan:speed': { badges: ['fan-speed'], configurators: ['fan-speed'] },
  'petdoor:lockstate': { badges: ['lockState'], configurators: ['petdoor-smartkeys'] },
  'irrcont:controllerState': {
    badges: ['scheduleType'],
    configurators: (dev) => {
      return (dev['dev:productId'] as string) !== 'deda9d'
        ? ['water-saver', 'irrigation-mode']
        : ['irrigation-mode'];
    },
  },
  'camera:resolution': { badges: ['camera-preview'], configurators: ['camera-resolution'] },
  'devpow:source': {
    badges: (dev) => {
      if ((dev['dev:devtypehint'] as string) === 'Camera' && dev['devpow:source'] !== 'BATTERY') {
        return [];
      }
      return ['powerSource'];
    },
  },
  'waterheater:heatingstate': { badges: ['heatingState'] },
  'waterheater:hotwaterlevel': { badges: ['hotWaterLevel'], configurators: ['water-heater-mode'] },
  'aosmithwaterheatercontroller:controlmode': { badges: ['waterHeaterEnergySmart'] },
  'waterheater:setpoint': { badges: ['lowHeatTarget'] },
  'nesttherm:hasleaf': { badges: ['leaf'] },
  'therm:hvacmode': { badges: ['thermostat'], configurators: ['thermostat-mode'] },
  'but:state': {
    configurators: (dev) => {
      return (dev['dev:devtypehint'] as string) === 'Pendant' ? [] : ['assign-buttons'];
    },
  },
  'humid:humidity': {
    badges: (dev) => (dev['humid:humidity'] ? ['humidity'] : []),
  },
  'atmos:pressure': { badges: ['pressure'] },
  'mot:sensitivity': {
    configurators: (dev) => {
      const supported = dev['mot:sensitivitiesSupported'] as unknown[] | undefined;
      return supported?.length ? ['motion-sensitivity'] : [];
    },
  },
  'motdoor:doorstate': { badges: ['opened'] },
  'halo:haloalertstate': { configurators: ['test-halo'] },
  'wifi:ssid': {
    configurators: (dev) => {
      const isSwann = !!dev['swannbatterycamera:sn'];
      if (isSwann || (dev['dev:devtypehint'] as string) !== 'Camera') return ['wifi-read-only'];
      if (hasCapability(dev, 'wifiscan')) return ['wifiscan'];
      return [];
    },
  },
  'watersoftener:rechargeStartTime': { configurators: ['water-softener-recharge-time'] },
  'camera:framerate': {
    configurators: (dev) => (dev['swannbatterycamera:sn'] ? [] : ['camera-framerate']),
  },
  'camera:irLedMode': {
    configurators: (dev) => (dev['swannbatterycamera:sn'] ? [] : ['camera-ir-led-mode']),
  },
  'camera:flip': { configurators: ['camera-rotation'] },
  'ipinfo:ip': {
    configurators: (dev) => {
      const isSwann = !!dev['swannbatterycamera:sn'];
      return (dev['dev:devtypehint'] as string) === 'Camera' && !isSwann
        ? ['camera-local-streaming']
        : [];
    },
  },
  'bridge:pairedDevices': {
    configurators: (dev) => {
      return (dev['dev:devtypehint'] as string) === 'Genie Aladdin Controller'
        ? ['garage-door-controller']
        : [];
    },
  },
  'spaceheater:heatstate': { badges: ['spaceheater'], configurators: ['space-heater-mode'] },
  'noaa:alertstate': { configurators: ['noaa-location', 'noaa-radio', 'noaa-weather-alerts'] },
  'nesttherm:locked': { badges: ['temperatureLocked'] },
  'ecowater:continuousRate': { configurators: ['water-flow'] },
  'waterhardness:hardness': { configurators: ['water-hardness'] },
  'watersoftener:currentSaltLevel': { badges: ['salt-level'], configurators: ['water-salt-type'] },
  'flow:flow': { badges: ['gpm'] },
  'somfyv1:type': { badges: ['somfy-type'], configurators: ['somfy-type'] },
  'somfyv1:reversed': {
    badges: (dev) => (dev['somfyv1:reversed'] === 'REVERSED' ? ['somfy-reversed'] : []),
    configurators: ['somfy-reversed'],
  },
  'somfyv1:currentstate': { configurators: ['somfy-customization'] },
  'somfyv1:channel': { badges: ['somfy-channel'] },
};

// ── Product-Specific Config Overrides ─────────────────────────────────

export const productConfig: Record<string, Partial<DeviceWebConfig>> = {
  '0c9a66': { 'web:icon:on': 'icon-platform-light-switch-1', 'web:icon:off': 'icon-platform-light-switch-2', 'web:icon:catalog': 'icon-platform-light-switch-2' },
  '0f1b61': { 'web:dev:customErrorComponent': 'lutron' },
  '162918': { 'web:icon:on': 'icon-platform-swann-wifi-smart-switch-1', 'web:icon:off': 'icon-platform-swann-wifi-smart-switch-2' },
  '220a4a': { 'web:icon:on': 'icon-platform-gs-wifi-smart-plug-indoor-1', 'web:icon:off': 'icon-platform-gs-wifi-smart-plug-indoor-2' },
  '2a97b9': { 'web:icon:on': 'icon-platform-gs-wifi-smart-plug-outdoor-1', 'web:icon:off': 'icon-platform-gs-wifi-smart-plug-outdoor-2' },
  '2c982d': { 'web:icon:on': 'icon-platform-carep-1', 'web:icon:off': 'icon-platform-carep-1', 'web:icon:catalog': 'icon-platform-carep-1' },
  '33974d': { 'web:icon:on': 'icon-platform-light-switch-1', 'web:icon:off': 'icon-platform-light-switch-2', 'web:icon:catalog': 'icon-platform-light-switch-2' },
  '3420b0': { 'web:dev:customErrorComponent': 'lutron' },
  '359d72': { 'web:icon:on': 'icon-platform-light-switch-1', 'web:icon:off': 'icon-platform-light-switch-2', 'web:icon:catalog': 'icon-platform-light-switch-2' },
  '432011': { 'web:icon:on': 'icon-platform-gs-openmotion-sensor-2', 'web:icon:off': 'icon-platform-gs-motion-sensor-2' },
  '432021': { 'web:icon:on': 'icon-platform-gs-opencontact-sensor-2', 'web:icon:off': 'icon-platform-gs-contact-sensor-2' },
  '432031': { 'web:icon:on': 'icon-platform-gs-keypad-2', 'web:icon:off': 'icon-platform-gs-keypad-2' },
  '432041': { 'web:icon:on': 'icon-platform-gs-zigbee-smart-plug-1', 'web:icon:off': 'icon-platform-gs-zigbee-smart-plug-2' },
  '486390': { 'web:icon:on': 'icon-platform-carep-1', 'web:icon:off': 'icon-platform-carep-1', 'web:icon:catalog': 'icon-platform-carep-1' },
  '671eee': { 'web:icon:on': 'icon-platform-light-switch-1', 'web:icon:off': 'icon-platform-light-switch-2', 'web:icon:catalog': 'icon-platform-light-switch-2' },
  '700faf': { 'web:icon:on': 'icon-platform-light-switch-1', 'web:icon:off': 'icon-platform-light-switch-2', 'web:icon:catalog': 'icon-platform-light-switch-2' },
  '76e484': { 'web:icon:on': 'icon-platform-hinge-2', 'web:icon:off': 'icon-platform-hinge-2', 'web:icon:catalog': 'icon-platform-hinge-2' },
  '7b2892': { 'web:dev:customErrorComponent': 'lutron' },
  'caefb1': { 'web:dev:customErrorComponent': 'lutron' },
  'caefb2': { 'web:dev:customErrorComponent': 'lutron' },
  'caefb3': { 'web:dev:customErrorComponent': 'lutron' },
  'cfc0b7': { 'web:icon:on': 'icon-platform-light-switch-1', 'web:icon:off': 'icon-platform-light-switch-2', 'web:icon:catalog': 'icon-platform-light-switch-2' },
  'deda9d': { 'web:icon:catalog': 'icon-platform-hoseend-2' },
  'e44e37': { 'web:dev:customErrorComponent': 'lutron', 'web:icon:on': 'icon-platform-light-switch-1', 'web:icon:off': 'icon-platform-light-switch-2', 'web:icon:catalog': 'icon-platform-light-switch-2' },
  'fec5d9': { 'web:icon:on': 'icon-platform-swann-camera-2', 'web:icon:off': 'icon-platform-swann-camera-2' },
};

// ── Device Type Configurations ────────────────────────────────────────

export const deviceTypeConfig: Record<string, Partial<DeviceWebConfig>> = {
  accessory: { 'web:icon:on': 'icon-app-more-2', 'web:icon:off': 'icon-app-more-2', 'web:icon:catalog': 'icon-app-more-2' },
  alexa: { 'web:icon:on': 'icon-platform-voice-assistant', 'web:icon:off': 'icon-platform-voice-assistant', 'web:icon:catalog': 'icon-platform-voice-assistant' },
  blind: { 'web:icon:on': 'icon-platform-blinds-1', 'web:icon:off': 'icon-platform-blinds-1', 'web:icon:catalog': 'icon-platform-blinds-1' },
  bridge: { 'web:icon:on': 'icon-platform-garage-bridge-2', 'web:icon:off': 'icon-platform-garage-bridge-2', 'web:icon:catalog': 'icon-platform-garage-bridge-2' },
  button: { 'web:icon:on': 'icon-platform-button-2', 'web:icon:off': 'icon-platform-button-2', 'web:icon:catalog': 'icon-platform-button-2' },
  camera: { 'web:icon:on': 'icon-platform-camera-2', 'web:icon:off': 'icon-platform-camera-2', 'web:icon:catalog': 'icon-platform-camera-2', 'web:panel:action': 'stream-record' },
  contact: {
    'web:icon:on': 'icon-platform-opencontact-2', 'web:icon:off': 'icon-platform-contact-2', 'web:icon:catalog': 'icon-platform-contact-2',
  },
  dimmer: {
    'web:icon:on': 'icon-platform-dimmer-1', 'web:icon:off': 'icon-platform-dimmer-2', 'web:icon:catalog': 'icon-platform-dimmer-2',
    'web:panel:action': 'toggle-on-off', 'web:card:action': 'toggle-on-off',
    'web:dev:hasCustomErrorLink': true, 'web:dev:scheduleConfig': 'lightsnswitches',
  },
  fancontrol: {
    'web:icon:on': 'icon-platform-fan-1', 'web:icon:off': 'icon-platform-fan-2', 'web:icon:catalog': 'icon-platform-fan-2',
    'web:panel:action': 'toggle-on-off', 'web:card:action': 'toggle-on-off',
    'web:dev:scheduleConfig': 'fan',
  },
  garagedoor: {
    'web:icon:on': 'icon-platform-garage-2', 'web:icon:off': 'icon-platform-garage-3', 'web:icon:catalog': 'icon-platform-garage-2',
    'web:icon:onAndOpen': 'icon-platform-garage-3', 'web:icon:onAndClosed': 'icon-platform-garage-2',
    'web:icon:offAndOpen': 'icon-platform-garage-3', 'web:icon:offAndClosed': 'icon-platform-garage-2',
    'web:panel:action': 'open-close-door', 'web:card:action': 'open-close-door',
    'web:dev:hasCustomErrorLink': true, 'web:dev:scheduleConfig': 'garagedoor',
  },
  geniealaddincontroller: {
    'web:icon:on': 'icon-platform-garage-bridge-2', 'web:icon:off': 'icon-platform-garage-bridge-2', 'web:icon:catalog': 'icon-platform-garage-bridge-2',
  },
  glassbreak: { 'web:icon:on': 'icon-platform-glass-break-2', 'web:icon:off': 'icon-platform-glass-break-2', 'web:icon:catalog': 'icon-platform-glass-break-2' },
  googleassistant: { 'web:icon:on': 'icon-platform-voice-assistant', 'web:icon:off': 'icon-platform-voice-assistant', 'web:icon:catalog': 'icon-platform-voice-assistant' },
  halo: {
    'web:icon:on': 'icon-platform-co-1', 'web:icon:off': 'icon-platform-co-2', 'web:icon:catalog': 'icon-platform-co-2',
    'web:panel:action': 'halo-toggle-light-play-stop', 'web:card:action': 'halo-hover-action-status',
    'web:switch:auxLabel': 'Light', 'web:devpow:batterycapable': true,
    'web:dev:customErrorComponent': 'halo', 'web:dev:hasCustomErrorLink': true,
    'web:dev:supportLinkKey': 's_halo', 'web:dev:scheduleConfig': 'lightsnswitches',
  },
  huebridge: { 'web:icon:on': 'icon-platform-garage-bridge-2', 'web:icon:off': 'icon-platform-garage-bridge-2', 'web:icon:catalog': 'icon-platform-garage-bridge-2', 'web:dev:hasDetails': true },
  huefallback: { 'web:icon:on': 'icon-platform-warning-2', 'web:icon:off': 'icon-platform-warning-2', 'web:icon:catalog': 'icon-platform-warning-2', 'web:dev:supportLinkKey': 's_improperlypairedhue' },
  irrigation: {
    'web:icon:on': 'icon-platform-sprinkler-2', 'web:icon:off': 'icon-platform-sprinkler-2', 'web:icon:catalog': 'icon-platform-sprinkler-2',
    'web:icon:onAndOpen': 'icon-platform-sprinkler-1', 'web:icon:onAndClosed': 'icon-platform-sprinkler-2',
    'web:panel:action': 'irrigation-nowStopSkip', 'web:card:statusComponent': 'irrigation',
    'web:dev:hasCustomErrorLink': true, 'web:dev:scheduleConfig': 'irrigation',
  },
  keyfob: { 'web:icon:on': 'icon-platform-symbolpad-2', 'web:icon:off': 'icon-platform-symbolpad-2', 'web:icon:catalog': 'icon-platform-symbolpad-2' },
  keypad: { 'web:icon:on': 'icon-platform-keypad-2', 'web:icon:off': 'icon-platform-keypad-2', 'web:icon:catalog': 'icon-platform-keypad-2' },
  light: {
    'web:icon:on': 'icon-platform-light-1', 'web:icon:off': 'icon-platform-light-2', 'web:icon:catalog': 'icon-platform-light-2',
    'web:panel:action': 'toggle-on-off', 'web:card:action': 'toggle-on-off',
    'web:dev:scheduleConfig': 'lightsnswitches',
  },
  lock: {
    'web:icon:on': 'icon-platform-lock-1', 'web:icon:off': 'icon-platform-lock-2', 'web:icon:catalog': 'icon-platform-lock-2',
    'web:icon:onAndOpen': 'icon-platform-unlock-2', 'web:icon:onAndClosed': 'icon-platform-lock-2',
    'web:icon:offAndOpen': 'icon-platform-unlock-1', 'web:icon:offAndClosed': 'icon-platform-lock-1',
    'web:panel:action': 'lock-unlock', 'web:card:hoveraction': 'lock-unlock',
    'web:dev:customErrorComponent': 'lock', 'web:dev:hasCustomErrorLink': true,
  },
  lutronbridge: {
    'web:icon:on': 'icon-platform-garage-bridge-2', 'web:icon:off': 'icon-platform-garage-bridge-2', 'web:icon:catalog': 'icon-platform-garage-bridge-2',
    'web:dev:customErrorComponent': 'lutron', 'web:dev:hasCustomErrorLink': true, 'web:dev:hasDetails': true,
  },
  motion: { 'web:icon:on': 'icon-platform-pair-1', 'web:icon:off': 'icon-platform-pair-2', 'web:icon:catalog': 'icon-platform-pair-1' },
  nestthermostat: {
    'web:icon:on': '', 'web:icon:off': 'icon-app-cloud-2', 'web:icon:catalog': 'icon-app-cloud-2',
    'web:icon:onText': 'temperature', 'web:isOnUnlessOffline': true,
    'web:panel:action': 'thermostat-slider', 'web:card:hoveraction': 'changeTemperature',
    'web:therm:autoDescription': 'Heat \u2022 Cool',
    'web:dev:customErrorComponent': 'nestthermostat', 'web:dev:hasDetails': true, 'web:dev:supportLinkKey': 's_nest',
  },
  pendant: { 'web:icon:on': 'icon-platform-care-2', 'web:icon:off': 'icon-platform-care-2', 'web:icon:catalog': 'icon-platform-care-2' },
  petdoor: {
    'web:icon:on': 'icon-platform-petdoor-1', 'web:icon:off': 'icon-platform-petdoor-1', 'web:icon:catalog': 'icon-platform-petdoor-1',
    'web:panel:action': 'lock-unlock-auto-petdoor', 'web:card:hoveraction': 'lock-unlock-auto-petdoor',
    'web:dev:scheduleConfig': 'petdoor',
  },
  rangeextender: { 'web:icon:on': 'icon-platform-range-extender-2', 'web:icon:off': 'icon-platform-range-extender-2', 'web:icon:catalog': 'icon-platform-range-extender-2' },
  shade: {
    'web:icon:on': 'icon-platform-blinds-1', 'web:icon:off': 'icon-platform-blinds-1', 'web:icon:catalog': 'icon-platform-blinds-1',
    'web:panel:action': 'changeShadeLevel', 'web:card:hoveraction': 'changeShadeLevel',
  },
  siren: { 'web:icon:on': 'icon-platform-siren-2', 'web:icon:off': 'icon-platform-siren-2', 'web:icon:catalog': 'icon-platform-siren-2' },
  smokeco: { 'web:icon:on': 'icon-platform-co-2', 'web:icon:off': 'icon-platform-co-2', 'web:icon:catalog': 'icon-platform-co-2' },
  somfyv1blind: {
    'web:icon:on': 'icon-platform-blinds-1', 'web:icon:off': 'icon-platform-blinds-1', 'web:icon:catalog': 'icon-platform-blinds-1',
    'web:panel:action': 'changeBlindState', 'web:card:hoveraction': 'changeBlindState',
  },
  somfyv1bridge: { 'web:icon:on': 'icon-platform-garage-bridge-2', 'web:icon:off': 'icon-platform-garage-bridge-2', 'web:icon:catalog': 'icon-platform-garage-bridge-2' },
  spaceheater: {
    'web:icon:on': '', 'web:icon:off': 'icon-platform-flame-2', 'web:icon:catalog': 'icon-platform-flame-2',
    'web:icon:onText': 'temperature', 'web:isOnUnlessOffline': true,
    'web:panel:action': 'changeSpaceHeaterTemperature', 'web:card:hoveraction': 'changeSpaceHeaterTemperature',
    'web:dev:scheduleConfig': 'spaceheater',
  },
  switch: {
    'web:icon:on': 'icon-platform-outlet-1', 'web:icon:off': 'icon-platform-outlet-2', 'web:icon:catalog': 'icon-platform-outlet-2',
    'web:panel:action': 'toggle-on-off', 'web:card:action': 'toggle-on-off',
    'web:dev:hasCustomErrorLink': true, 'web:dev:scheduleConfig': 'lightsnswitches',
  },
  tccthermostat: {
    'web:icon:on': '', 'web:icon:off': 'icon-app-cloud-2', 'web:icon:catalog': 'icon-app-cloud-2',
    'web:icon:onText': 'temperature', 'web:isOnUnlessOffline': true,
    'web:panel:action': 'thermostat-slider', 'web:card:hoveraction': 'changeTemperature',
    'web:dev:customErrorComponent': 'tccthermostat', 'web:dev:hasDetails': true,
  },
  thermostat: {
    'web:icon:on': '', 'web:icon:off': 'icon-app-thermometer', 'web:icon:catalog': 'icon-app-thermometer',
    'web:icon:onText': 'temperature', 'web:isOnUnlessOffline': true,
    'web:panel:action': 'thermostat-slider', 'web:card:hoveraction': 'changeTemperature',
    'web:dev:scheduleConfig': 'thermostat',
  },
  tilt: {
    'web:icon:on': 'icon-platform-tilt-2', 'web:icon:off': 'icon-platform-tilt-2', 'web:icon:catalog': 'icon-platform-tilt-2',
    'web:isOnUnlessOffline': true,
  },
  vent: {
    'web:icon:off': 'icon-platform-vent-2', 'web:icon:on': 'icon-platform-vent-2', 'web:icon:catalog': 'icon-platform-vent-2',
    'web:panel:action': 'changeVentLevel', 'web:card:hoveraction': 'changeVentLevel',
    'web:dev:scheduleConfig': 'vent',
  },
  waterheater: {
    'web:icon:off': 'icon-platform-waterheater-2', 'web:icon:on': 'icon-platform-water-1', 'web:icon:catalog': 'icon-platform-waterheater-2',
    'web:icon:onText': 'temperature', 'web:isOnUnlessOffline': true,
    'web:panel:action': 'changeWaterHeaterTemperature', 'web:card:hoveraction': 'changeWaterHeaterTemperature',
    'web:dev:hasCustomErrorLink': true, 'web:dev:scheduleConfig': 'waterheater',
  },
  waterleak: {
    'web:icon:off': 'icon-platform-leak-2', 'web:icon:on': 'icon-platform-leak-2', 'web:icon:catalog': 'icon-platform-leak-2',
    'web:dev:supportLinkKey': 's_leaksmartshutoffvalve',
  },
  watersoftener: {
    'web:icon:off': 'icon-platform-softener-2', 'web:icon:on': 'icon-platform-softener-2', 'web:icon:catalog': 'icon-platform-softener-2',
    'web:dev:customErrorComponent': 'watersoftener', 'web:panel:statusComponent': 'watersoftener',
    'web:panel:action': 'recharge-now', 'web:card:hoveraction': 'recharge-now',
  },
  watervalve: {
    'web:icon:on': 'icon-platform-water-valve-2', 'web:icon:off': 'icon-platform-water-valve-2', 'web:icon:catalog': 'icon-platform-water-valve-2',
    'web:icon:onAndOpen': 'icon-platform-water-valve-2', 'web:icon:onAndClosed': 'icon-platform-water-valve-2',
    'web:icon:offAndOpen': 'icon-platform-water-valve-2', 'web:icon:offAndClosed': 'icon-platform-water-valve-2',
    'web:panel:action': 'open-close-valve', 'web:card:action': 'open-close-valve',
    'web:devpow:batterycapable': true, 'web:dev:scheduleConfig': 'watervalve',
  },
};

// ── Default Config ────────────────────────────────────────────────────

export const defaultConfig: DeviceWebConfig = {
  'web:icon:on': 'icon-app-devices',
  'web:icon:off': 'icon-app-devices',
  'web:icon:catalog': 'icon-app-devices',
  'web:icon:onAndOpen': null,
  'web:icon:onAndClosed': null,
  'web:icon:offAndOpen': null,
  'web:icon:offAndClosed': null,
  'web:icon:onText': null,
  'web:panel:status': '',
  'web:panel:statusComponent': '',
  'web:panel:action': null,
  'web:card:action': null,
  'web:card:hoveraction': null,
  'web:card:status': '',
  'web:card:statusComponent': '',
  'web:card:hoverstatus': null,
  'web:isOnUnlessOffline': false,
  'web:scene:groupString': null,
  'web:switch:auxLabel': null,
  'web:therm:autoDescription': 'Auto',
  'web:devpow:batterycapable': false,
  'web:dev:hasDetails': false,
  'web:dev:customErrorComponent': null,
  'web:dev:hasCustomErrorLink': false,
  'web:dev:supported': true,
  'web:dev:supportLinkKey': 'support',
  'web:dev:scheduleConfig': null,
};

// ── Config Resolution ─────────────────────────────────────────────────

/**
 * Resolve the web config for a device by merging product, device type,
 * and default configs (most specific wins).
 */
export function resolveDeviceConfig(device: DeviceObj): DeviceWebConfig {
  const productId = device['dev:productId'] as string | undefined;
  const hint = (device['dev:devtypehint'] as string) ?? '';
  const normalizedType = hint.replace(/\W/g, '').toLowerCase();

  // Apply in order: defaults, then device type, then product (most specific last wins)
  const config = { ...defaultConfig };

  if (normalizedType && deviceTypeConfig[normalizedType]) {
    Object.assign(config, deviceTypeConfig[normalizedType]);
  }
  if (productId && productConfig[productId]) {
    Object.assign(config, productConfig[productId]);
  }

  return config;
}

/**
 * Resolve badges for a device based on its capabilities.
 */
export function resolveDeviceBadges(device: DeviceObj): string[] {
  const caps = device['base:caps'] as string[] | undefined;
  if (!caps) return [];

  const badges: string[] = [];
  for (const [attr, plugin] of Object.entries(capabilityPlugins)) {
    const ns = attr.split(':')[0];
    if (!caps.includes(ns)) continue;
    if (!plugin.badges) continue;

    const result = typeof plugin.badges === 'function'
      ? plugin.badges(device)
      : plugin.badges;
    if (result) badges.push(...result);
  }
  return [...new Set(badges)]; // deduplicate
}

/**
 * Resolve configurators for a device based on its capabilities.
 */
export function resolveDeviceConfigurators(device: DeviceObj): string[] {
  const caps = device['base:caps'] as string[] | undefined;
  if (!caps) return [];

  const configurators: string[] = [];
  for (const [attr, plugin] of Object.entries(capabilityPlugins)) {
    const ns = attr.split(':')[0];
    if (!caps.includes(ns)) continue;
    if (!plugin.configurators) continue;

    const result = typeof plugin.configurators === 'function'
      ? plugin.configurators(device)
      : plugin.configurators;
    if (result) configurators.push(...result);
  }
  return [...new Set(configurators)];
}

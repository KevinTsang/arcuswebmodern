/**
 * Device type configuration — ported from config/device.js.
 *
 * Maps device type hints and product IDs to UI configuration (icons, actions,
 * badges, configurators). This data-driven approach determines what UI
 * components to render for each device type.
 */

import {
  AOSmithWaterHeaterController, Atmos, Base, Button, Camera, ColorTemperature, Contact,
  Device, DevicePower, DeviceSettings, Dimmer, EcowaterWaterSoftener, Fan, Flow, Halo,
  Illuminance, IpInfo, IrrigationController, Light, Motion, MotorizedDoor, PetDoor,
  PowerUse, Presence, RelativeHumidity, Somfyv1, SpaceHeater, Temperature, Thermostat,
  Tilt, UltravioletIndex, Valve, WaterHardness, WaterHeater, WaterSoftener, WeatherRadio,
  WiFi,
} from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

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

type DeviceObj = DeviceEntity;
type BadgeFn = (device: DeviceObj) => string[];
type ConfiguratorFn = (device: DeviceObj) => string[];

interface CapabilityPlugin {
  badges?: string[] | BadgeFn;
  configurators?: string[] | ConfiguratorFn;
}

// ── Capability Plugins ────────────────────────────────────────────────
// Maps capability attributes → UI components. Functions receive the device.

function hasCapability(device: DeviceObj, ns: string): boolean {
  const caps = device[Base.ATTR_CAPS] as string[] | undefined;
  return caps?.includes(ns) ?? false;
}

export const capabilityPlugins: Record<string, CapabilityPlugin> = {
  [DeviceSettings.ATTR_PARAMS]: { configurators: ['device-settings'] },
  [Valve.ATTR_VALVESTATE]: { badges: ['opened'] },
  [Halo.ATTR_ROOMNAMES]: { configurators: ['assign-halo-room'] },
  [Contact.ATTR_CONTACT]: { badges: ['opened'], configurators: ['contact-setting'] },
  [Tilt.ATTR_TILTSTATE]: { badges: ['opened'], configurators: ['orientation'] },
  [Temperature.ATTR_TEMPERATURE]: {
    badges: (dev) => {
      const hint = dev[Device.ATTR_DEVTYPEHINT] as string;
      if (['KeyPad', 'Button', 'vent', 'Contact', 'Motion', 'Halo'].includes(hint)) {
        return ['temperature'];
      }
      return [];
    },
  },
  [PowerUse.ATTR_INSTANTANEOUS]: {
    badges: (dev) => (dev[PowerUse.ATTR_INSTANTANEOUS] ? ['power'] : []),
  },
  [Dimmer.ATTR_BRIGHTNESS]: {
    badges: (dev) => {
      const hint = dev[Device.ATTR_DEVTYPEHINT] as string;
      return hint === 'Halo' ? [] : ['brightness'];
    },
    configurators: ['brightness'],
  },
  [Illuminance.ATTR_ILLUMINANCE]: { badges: ['illuminance'] },
  [UltravioletIndex.ATTR_INDEX]: { badges: ['ultraviolet-index'] },
  [Light.ATTR_COLORMODE]: {
    configurators: (dev) => {
      const color = hasCapability(dev, 'color');
      const colorTemp = hasCapability(dev, 'colortemp');
      if (color || colorTemp) {
        return (dev[Device.ATTR_DEVTYPEHINT] as string) === 'Halo'
          ? ['color']
          : ['color-or-colortemp'];
      }
      return [];
    },
  },
  [ColorTemperature.ATTR_COLORTEMP]: { badges: ['colortemp'] },
  [Presence.ATTR_PRESENCE]: { badges: ['presence'] },
  [Presence.ATTR_PERSON]: {
    configurators: (dev) => {
      const cfgs = ['assign-device'];
      if ((dev[Device.ATTR_DEVTYPEHINT] as string) === 'Pendant') cfgs.push('test-coverage');
      return cfgs;
    },
  },
  [Fan.ATTR_SPEED]: { badges: ['fan-speed'], configurators: ['fan-speed'] },
  [PetDoor.ATTR_LOCKSTATE]: { badges: ['lockState'], configurators: ['petdoor-smartkeys'] },
  [IrrigationController.ATTR_CONTROLLERSTATE]: {
    badges: ['scheduleType'],
    configurators: (dev) => {
      return (dev[Device.ATTR_PRODUCTID] as string) !== 'deda9d'
        ? ['water-saver', 'irrigation-mode']
        : ['irrigation-mode'];
    },
  },
  [Camera.ATTR_RESOLUTION]: { badges: ['camera-preview'], configurators: ['camera-resolution'] },
  [DevicePower.ATTR_SOURCE]: {
    badges: (dev) => {
      if ((dev[Device.ATTR_DEVTYPEHINT] as string) === 'Camera' && dev[DevicePower.ATTR_SOURCE] !== 'BATTERY') {
        return [];
      }
      return ['powerSource'];
    },
  },
  [WaterHeater.ATTR_HEATINGSTATE]: { badges: ['heatingState'] },
  [WaterHeater.ATTR_HOTWATERLEVEL]: { badges: ['hotWaterLevel'], configurators: ['water-heater-mode'] },
  [AOSmithWaterHeaterController.ATTR_CONTROLMODE]: { badges: ['waterHeaterEnergySmart'] },
  [WaterHeater.ATTR_SETPOINT]: { badges: ['lowHeatTarget'] },
  'nesttherm:hasleaf': { badges: ['leaf'] },
  [Thermostat.ATTR_HVACMODE]: { badges: ['thermostat'], configurators: ['thermostat-mode'] },
  [Button.ATTR_STATE]: {
    configurators: (dev) => {
      return (dev[Device.ATTR_DEVTYPEHINT] as string) === 'Pendant' ? [] : ['assign-buttons'];
    },
  },
  [RelativeHumidity.ATTR_HUMIDITY]: {
    badges: (dev) => (dev[RelativeHumidity.ATTR_HUMIDITY] ? ['humidity'] : []),
  },
  [Atmos.ATTR_PRESSURE]: { badges: ['pressure'] },
  [Motion.ATTR_SENSITIVITY]: {
    configurators: (dev) => {
      const supported = dev[Motion.ATTR_SENSITIVITIESSUPPORTED] as unknown[] | undefined;
      return supported?.length ? ['motion-sensitivity'] : [];
    },
  },
  [MotorizedDoor.ATTR_DOORSTATE]: { badges: ['opened'] },
  [Halo.ATTR_HALOALERTSTATE]: { configurators: ['test-halo'] },
  [WiFi.ATTR_SSID]: {
    configurators: (dev) => {
      const isSwann = !!dev['swannbatterycamera:sn'];
      if (isSwann || (dev[Device.ATTR_DEVTYPEHINT] as string) !== 'Camera') return ['wifi-read-only'];
      if (hasCapability(dev, 'wifiscan')) return ['wifiscan'];
      return [];
    },
  },
  [WaterSoftener.ATTR_RECHARGESTARTTIME]: { configurators: ['water-softener-recharge-time'] },
  [Camera.ATTR_FRAMERATE]: {
    configurators: (dev) => (dev['swannbatterycamera:sn'] ? [] : ['camera-framerate']),
  },
  [Camera.ATTR_IRLEDMODE]: {
    configurators: (dev) => (dev['swannbatterycamera:sn'] ? [] : ['camera-ir-led-mode']),
  },
  [Camera.ATTR_FLIP]: { configurators: ['camera-rotation'] },
  [IpInfo.ATTR_IP]: {
    configurators: (dev) => {
      const isSwann = !!dev['swannbatterycamera:sn'];
      return (dev[Device.ATTR_DEVTYPEHINT] as string) === 'Camera' && !isSwann
        ? ['camera-local-streaming']
        : [];
    },
  },
  'bridge:pairedDevices': {
    configurators: (dev) => {
      return (dev[Device.ATTR_DEVTYPEHINT] as string) === 'Genie Aladdin Controller'
        ? ['garage-door-controller']
        : [];
    },
  },
  [SpaceHeater.ATTR_HEATSTATE]: { badges: ['spaceheater'], configurators: ['space-heater-mode'] },
  [WeatherRadio.ATTR_ALERTSTATE]: { configurators: ['noaa-location', 'noaa-radio', 'noaa-weather-alerts'] },
  'nesttherm:locked': { badges: ['temperatureLocked'] },
  [EcowaterWaterSoftener.ATTR_CONTINUOUSRATE]: { configurators: ['water-flow'] },
  [WaterHardness.ATTR_HARDNESS]: { configurators: ['water-hardness'] },
  [WaterSoftener.ATTR_CURRENTSALTLEVEL]: { badges: ['salt-level'], configurators: ['water-salt-type'] },
  [Flow.ATTR_FLOW]: { badges: ['gpm'] },
  [Somfyv1.ATTR_TYPE]: { badges: ['somfy-type'], configurators: ['somfy-type'] },
  [Somfyv1.ATTR_REVERSED]: {
    badges: (dev) => (dev[Somfyv1.ATTR_REVERSED] === 'REVERSED' ? ['somfy-reversed'] : []),
    configurators: ['somfy-reversed'],
  },
  [Somfyv1.ATTR_CURRENTSTATE]: { configurators: ['somfy-customization'] },
  [Somfyv1.ATTR_CHANNEL]: { badges: ['somfy-channel'] },
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
  const productId = device[Device.ATTR_PRODUCTID] as string | undefined;
  const hint = (device[Device.ATTR_DEVTYPEHINT] as string) ?? '';
  const normalizedType = hint.replace(/\W/g, '').toLowerCase();

  // Apply in order: defaults, then device type, then product (most specific last wins)
  const config = { ...defaultConfig };

  if (normalizedType && deviceTypeConfig[normalizedType]) {
    Object.assign(config, deviceTypeConfig[normalizedType]);
  }
  if (productId && productConfig[productId]) {
    Object.assign(config, productConfig[productId]);
  }

  // Auto-detect multi-switch devices (e.g., ZEN17 dual relay, ZEN14 double plug)
  const instances = device[Base.ATTR_INSTANCES] as Record<string, string[]> | undefined;
  if (instances) {
    const switchInstanceKeys = Object.entries(instances)
      .filter(([, caps]) => Array.isArray(caps) && caps.includes('swit'));
    if (switchInstanceKeys.length > 1) {
      config['web:panel:action'] = 'multi-toggle';
      config['web:card:action'] = 'multi-toggle';
    }
  }

  return config;
}

/**
 * Resolve badges for a device based on its capabilities.
 */
export function resolveDeviceBadges(device: DeviceObj): string[] {
  const caps = device[Base.ATTR_CAPS] as string[] | undefined;
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
  const caps = device[Base.ATTR_CAPS] as string[] | undefined;
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

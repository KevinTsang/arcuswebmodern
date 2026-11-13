import { MobileDevice } from '@arcus/core';

/** A mobile device (phone/tablet) associated with a person, as returned by person:ListMobileDevices. */
export interface MobileDeviceData {
  [MobileDevice.ATTR_DEVICEINDEX]: number;
  [MobileDevice.ATTR_NAME]?: string;
  [MobileDevice.ATTR_OSTYPE]?: string;
  [MobileDevice.ATTR_OSVERSION]?: string;
  [MobileDevice.ATTR_FORMFACTOR]?: string;
  [MobileDevice.ATTR_DEVICEVENDOR]?: string;
  [MobileDevice.ATTR_DEVICEMODEL]?: string;
  [MobileDevice.ATTR_APPVERSION]?: string;
}

export interface ListMobileDevicesResponse {
  mobileDevices?: MobileDeviceData[];
}

/** Friendly title for a mobile device: its user-assigned name, else vendor + model, else OS. */
export function mobileDeviceTitle(device: MobileDeviceData): string {
  const name = device[MobileDevice.ATTR_NAME]?.trim();
  if (name) return name;
  const vendorModel = [device[MobileDevice.ATTR_DEVICEVENDOR], device[MobileDevice.ATTR_DEVICEMODEL]]
    .filter(Boolean)
    .join(' ');
  if (vendorModel) return vendorModel;
  return device[MobileDevice.ATTR_OSTYPE] || 'Mobile Device';
}

/** Secondary line: OS + version, form factor and app version when known. */
export function mobileDeviceDetails(device: MobileDeviceData): string {
  const os = [device[MobileDevice.ATTR_OSTYPE], device[MobileDevice.ATTR_OSVERSION]]
    .filter(Boolean)
    .join(' ');
  const app = device[MobileDevice.ATTR_APPVERSION];
  return [os, device[MobileDevice.ATTR_FORMFACTOR], app ? `App ${app}` : '']
    .filter(Boolean)
    .join(' · ');
}

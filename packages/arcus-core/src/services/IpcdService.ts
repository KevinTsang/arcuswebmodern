import Bridge from '../bridge';
import cornea from '../cornea';

export interface IpcdDeviceType {
  [key: string]: unknown;
}

const IpcdService = {
  onDeviceClaimed(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('ipcd ipcd:DeviceClaimed', callback);
  },
  onDeviceRegistered(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('ipcd ipcd:DeviceRegistered', callback);
  },
  onDeviceUnregistered(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('ipcd ipcd:DeviceUnregistered', callback);
  },
  onDeviceConnected(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('ipcd ipcd:DeviceConnected', callback);
  },
  onDeviceDisconnected(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('ipcd ipcd:DeviceDisconnected', callback);
  },
  onDeviceHeartBeat(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('ipcd ipcd:DeviceHeartBeat', callback);
  },

  ListDeviceTypes(): Promise<Record<string, unknown>> {
    return Bridge.request('ipcd:ListDeviceTypes', 'SERV:ipcd:', {});
  },

  FindDevice(deviceType: IpcdDeviceType, sn: string): Promise<Record<string, unknown>> {
    return Bridge.request('ipcd:FindDevice', 'SERV:ipcd:', { deviceType, sn });
  },

  ForceUnregister(protocolAddress: string): Promise<Record<string, unknown>> {
    return Bridge.request('ipcd:ForceUnregister', 'SERV:ipcd:', { protocolAddress });
  },
};

export default IpcdService;

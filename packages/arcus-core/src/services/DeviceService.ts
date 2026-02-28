import Bridge from '../bridge';
import cornea from '../cornea';

const DeviceService = {
  onDevicesDegraded(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('dev dev:DevicesDegraded', callback);
  },

  SyncDevices(accountId: string, placeId: string, reflexVersion: number, devices: string): Promise<Record<string, unknown>> {
    return Bridge.request('dev:SyncDevices', 'SERV:dev:', { accountId, placeId, reflexVersion, devices });
  },
};

export default DeviceService;

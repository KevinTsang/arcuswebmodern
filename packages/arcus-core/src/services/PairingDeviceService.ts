import Bridge from '../bridge';

const PairingDeviceService = {
  CreateMock(productAddress: string): Promise<Record<string, unknown>> {
    return Bridge.request('pairdev:CreateMock', 'SERV:pairdev:', { productAddress });
  },
};

export default PairingDeviceService;

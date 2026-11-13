import { render, screen } from '@testing-library/react';
import { Base, DeviceConnection, DeviceOta, PowerUse } from '@arcus/core';
import { DeviceAdvancedInfo } from '@/components/devices/DeviceAdvancedInfo';
import type { DeviceEntity } from '@/store/entityTypes';

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:plug';

function makeDevice(attrs: Partial<DeviceEntity> = {}): DeviceEntity {
  return {
    id: ADDRESS,
    [Base.ATTR_ADDRESS]: ADDRESS,
    [Base.ATTR_CAPS]: ['base', 'dev', 'devconn', 'pow', 'devota'],
    ...attrs,
  };
}

const FULL_DEVICE = makeDevice({
  [PowerUse.ATTR_INSTANTANEOUS]: 62.3,
  [DeviceConnection.ATTR_SIGNAL]: 81,
  [DeviceOta.ATTR_STATUS]: DeviceOta.STATUS_INPROGRESS,
  [DeviceOta.ATTR_TARGETVERSION]: '2.0.1',
  [DeviceOta.ATTR_PROGRESSPERCENT]: 40,
});

function renderInfo(device: DeviceEntity, offline = false) {
  return render(
    <dl>
      <DeviceAdvancedInfo device={device} offline={offline} />
    </dl>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceAdvancedInfo', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderInfo(FULL_DEVICE);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows power usage, signal and firmware update rows', () => {
      renderInfo(FULL_DEVICE);
      expect(screen.getByText('Power Usage')).toBeInTheDocument();
      expect(screen.getByTestId('device-detail-power-usage')).toHaveTextContent('62 W');
      expect(screen.getByTestId('device-detail-signal')).toHaveTextContent('Excellent (81%)');
      expect(screen.getByTestId('device-detail-firmware-update')).toHaveTextContent('Updating to 2.0.1 (40%)');
    });

    it('shows a progress bar while a firmware update is in progress', () => {
      renderInfo(FULL_DEVICE);
      const bar = screen.getByRole('progressbar', { name: 'Firmware update progress' });
      expect(bar).toHaveAttribute('aria-valuenow', '40');
    });

    it('shows a failed firmware update with its reason', () => {
      renderInfo(makeDevice({
        [DeviceOta.ATTR_STATUS]: DeviceOta.STATUS_FAILED,
        [DeviceOta.ATTR_RETRYCOUNT]: 2,
        [DeviceOta.ATTR_LASTFAILREASON]: 'Timeout',
      }));
      expect(screen.getByTestId('device-detail-firmware-update')).toHaveTextContent('Failed after 2 retries: Timeout');
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('shows a completed firmware update', () => {
      renderInfo(makeDevice({
        [DeviceOta.ATTR_STATUS]: DeviceOta.STATUS_COMPLETED,
        [DeviceOta.ATTR_CURRENTVERSION]: '2.0.1',
      }));
      expect(screen.getByTestId('device-detail-firmware-update')).toHaveTextContent('Updated to 2.0.1');
    });

    it('shows zero watts for a device drawing no power', () => {
      renderInfo(makeDevice({ [PowerUse.ATTR_INSTANTANEOUS]: 0 }));
      expect(screen.getByTestId('device-detail-power-usage')).toHaveTextContent('0 W');
    });
  });

  describe('edge cases', () => {
    it('renders nothing when no advanced attributes are set', () => {
      renderInfo(makeDevice());
      expect(screen.queryByTestId('device-detail-power-usage')).not.toBeInTheDocument();
      expect(screen.queryByTestId('device-detail-signal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('device-detail-firmware-update')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('hides the firmware update row when the OTA status is idle', () => {
      renderInfo(makeDevice({
        [DeviceOta.ATTR_STATUS]: DeviceOta.STATUS_IDLE,
        [DeviceOta.ATTR_PROGRESSPERCENT]: 0,
      }));
      expect(screen.queryByTestId('device-detail-firmware-update')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('hides the progress bar when an update reports no progress', () => {
      renderInfo(makeDevice({ [DeviceOta.ATTR_STATUS]: DeviceOta.STATUS_INPROGRESS }));
      expect(screen.getByTestId('device-detail-firmware-update')).toHaveTextContent('Updating');
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('clamps the progress bar to 100%', () => {
      renderInfo(makeDevice({
        [DeviceOta.ATTR_STATUS]: DeviceOta.STATUS_INPROGRESS,
        [DeviceOta.ATTR_PROGRESSPERCENT]: 150,
      }));
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('hides a stale signal reading while the device is offline', () => {
      renderInfo(FULL_DEVICE, true);
      expect(screen.queryByTestId('device-detail-signal')).not.toBeInTheDocument();
      expect(screen.getByTestId('device-detail-power-usage')).toBeInTheDocument();
    });

    it('ignores a missing signal reading', () => {
      renderInfo(makeDevice({ [DeviceConnection.ATTR_SIGNAL]: undefined }));
      expect(screen.queryByTestId('device-detail-signal')).not.toBeInTheDocument();
    });
  });
});

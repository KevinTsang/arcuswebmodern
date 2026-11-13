import { render, screen } from '@testing-library/react';
import { DeviceInfoRow } from '@/components/devices/DeviceInfoRow';

function renderRow(label: string, value: string) {
  return render(
    <dl>
      <DeviceInfoRow label={label} value={value} />
    </dl>,
  );
}

describe('DeviceInfoRow', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderRow('Power Usage', '62 W');
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders the label and value', () => {
    renderRow('Manufacturer', 'Acme');
    expect(screen.getByText('Manufacturer')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('derives the value test id from the label', () => {
    renderRow('Firmware Update', 'Updating');
    expect(screen.getByTestId('device-detail-firmware-update')).toHaveTextContent('Updating');
  });

  it('renders an empty value', () => {
    renderRow('Model', '');
    expect(screen.getByTestId('device-detail-model')).toBeEmptyDOMElement();
  });
});

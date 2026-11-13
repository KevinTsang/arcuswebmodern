import { render, screen } from '@testing-library/react';
import { S2DskDisplay } from '@/components/pairing/S2DskDisplay';

const GROUPS = ['00000', '35455', '41424', '34445', '31323', '33435', '21222', '32425'];

describe('S2DskDisplay', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<S2DskDisplay groups={GROUPS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot when matched', () => {
    const { asFragment } = render(<S2DskDisplay groups={GROUPS} matched />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows groups 2–8 and a blank for the PIN', () => {
    render(<S2DskDisplay groups={GROUPS} />);
    expect(screen.getByTestId('s2-dsk-group-1')).toHaveTextContent('PIN');
    expect(screen.getByTestId('s2-dsk-group-2')).toHaveTextContent('35455');
    expect(screen.getByTestId('s2-dsk-group-8')).toHaveTextContent('32425');
    expect(screen.queryByText('00000')).not.toBeInTheDocument();
  });

  it('labels the list for screen readers', () => {
    render(<S2DskDisplay groups={GROUPS} />);
    expect(screen.getByRole('list', { name: 'Device security key (DSK)' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('shows only the PIN blank with no groups', () => {
    render(<S2DskDisplay groups={[]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});

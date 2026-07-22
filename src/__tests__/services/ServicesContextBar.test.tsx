import { render, screen } from '@testing-library/react';
import { Place } from '@arcus/core';
import { ServicesContextBar } from '@/components/services/ServicesContextBar';

let mockPlaceName: string | undefined = 'Your Home';

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: {
        place: mockPlaceName === undefined ? {} : { [Place.ATTR_NAME]: mockPlaceName },
      },
    }),
}));

beforeEach(() => {
  mockPlaceName = 'Your Home';
});

describe('ServicesContextBar', () => {
  it('renders the Services heading', () => {
    render(<ServicesContextBar />);
    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
  });

  it('renders the place name', () => {
    mockPlaceName = 'Beach House';
    render(<ServicesContextBar />);
    expect(screen.getByText('Beach House')).toBeInTheDocument();
  });

  it('falls back to "Your Home" when the place has no name', () => {
    mockPlaceName = undefined;
    render(<ServicesContextBar />);
    expect(screen.getByText('Your Home')).toBeInTheDocument();
  });
});

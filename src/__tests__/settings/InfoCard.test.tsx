import { render, screen } from '@testing-library/react';
import InfoCard from '@/components/settings/InfoCard';

describe('InfoCard', () => {
  it('renders title and children', () => {
    render(
      <InfoCard title="Test Card">
        <p>Card content</p>
      </InfoCard>,
    );
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <InfoCard title="Test" action={<button>Edit</button>}>
        <p>content</p>
      </InfoCard>,
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
});

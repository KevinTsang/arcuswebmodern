import { render, screen } from '@testing-library/react';
import InfoRow from '@/components/settings/InfoRow';

describe('InfoRow', () => {
  it('renders label and value', () => {
    render(<InfoRow label="Name" value="John" />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});

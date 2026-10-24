import { render, screen, fireEvent } from '@testing-library/react';
import SettingToggle from '@/components/SettingToggle';

describe('SettingToggle', () => {
  const defaultProps = {
    label: 'Test Setting',
    description: 'A test toggle description',
    enabled: false,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label and description', () => {
    render(<SettingToggle {...defaultProps} />);
    expect(screen.getByText('Test Setting')).toBeInTheDocument();
    expect(screen.getByText('A test toggle description')).toBeInTheDocument();
  });

  it('renders switch role with aria-checked false when disabled', () => {
    render(<SettingToggle {...defaultProps} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('renders switch role with aria-checked true when enabled', () => {
    render(<SettingToggle {...defaultProps} enabled={true} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onToggle when clicked', () => {
    const onToggle = jest.fn();
    render(<SettingToggle {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('names the switch with its label for assistive tech', () => {
    render(<SettingToggle {...defaultProps} enabled />);
    expect(screen.getByRole('switch', { name: 'Test Setting' })).toHaveAttribute('aria-checked', 'true');
  });
});

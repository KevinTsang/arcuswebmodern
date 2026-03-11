import { render, screen, fireEvent } from '@testing-library/react';
import { RuleSelectorSection, getSelectorKind } from '@/components/rule/RuleSelectorSection';
import type { ResolvedSelector } from '@/components/rule/RuleSelectorSection';

const deviceSelector: ResolvedSelector = {
  type: 'LIST',
  name: 'button',
  options: [
    { name: 'Smart Button 1', value: 'DRIV:dev:btn-1' },
    { name: 'Smart Button 2', value: 'DRIV:dev:btn-2' },
  ],
};

const genericSelector: ResolvedSelector = {
  type: 'LIST',
  name: 'chime',
  options: [
    { name: 'Ding Dong', value: 'DING_DONG' },
    { name: 'Chime', value: 'CHIME' },
    { name: 'Doorbell', value: 'DOORBELL' },
  ],
};

const emptySelector: ResolvedSelector = {
  type: 'LIST',
  name: 'device',
  options: [],
};

// ── getSelectorKind ─────────────────────────────────────────────────

describe('getSelectorKind', () => {
  it('returns device when all options have dev addresses', () => {
    expect(getSelectorKind(deviceSelector)).toBe('device');
  });

  it('returns generic when options have non-device values', () => {
    expect(getSelectorKind(genericSelector)).toBe('generic');
  });

  it('returns generic for empty options', () => {
    expect(getSelectorKind(emptySelector)).toBe('generic');
  });

  it('returns generic for mixed device and non-device options', () => {
    const mixed: ResolvedSelector = {
      type: 'LIST',
      name: 'target',
      options: [
        { name: 'Device A', value: 'DRIV:dev:a' },
        { name: 'Scene B', value: 'SERV:scene:b' },
      ],
    };
    expect(getSelectorKind(mixed)).toBe('generic');
  });
});

// ── RuleSelectorSection ─────────────────────────────────────────────

describe('RuleSelectorSection', () => {
  it('shows instruction text when no active selector', () => {
    render(
      <RuleSelectorSection
        activeSelector={null}
        selector={null}
        selectedValue=""
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('Click a word or phrase above to edit.')).toBeInTheDocument();
  });

  it('shows instruction text when selector is null', () => {
    render(
      <RuleSelectorSection
        activeSelector="unknown"
        selector={null}
        selectedValue=""
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('Click a word or phrase above to edit.')).toBeInTheDocument();
  });

  it('shows empty state when selector has no options', () => {
    render(
      <RuleSelectorSection
        activeSelector="device"
        selector={emptySelector}
        selectedValue=""
        onSelect={jest.fn()}
      />,
    );
    expect(
      screen.getByText('There are no devices paired that meet the requirements for this rule.'),
    ).toBeInTheDocument();
  });

  // ── Device selector (radio list) ──────────────────────────────────

  it('renders radio buttons for device selector', () => {
    render(
      <RuleSelectorSection
        activeSelector="button"
        selector={deviceSelector}
        selectedValue=""
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('Choose Device')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByText('Smart Button 1')).toBeInTheDocument();
    expect(screen.getByText('Smart Button 2')).toBeInTheDocument();
  });

  it('marks the selected device radio as checked', () => {
    render(
      <RuleSelectorSection
        activeSelector="button"
        selector={deviceSelector}
        selectedValue="DRIV:dev:btn-1"
        onSelect={jest.fn()}
      />,
    );
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
  });

  it('calls onSelect when a device radio is clicked', () => {
    const onSelect = jest.fn();
    render(
      <RuleSelectorSection
        activeSelector="button"
        selector={deviceSelector}
        selectedValue=""
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getAllByRole('radio')[1]);
    expect(onSelect).toHaveBeenCalledWith('DRIV:dev:btn-2');
  });

  // ── Generic selector (dropdown) ───────────────────────────────────

  it('renders select dropdown for generic selector', () => {
    render(
      <RuleSelectorSection
        activeSelector="chime"
        selector={genericSelector}
        selectedValue=""
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText(/Choose/)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Select an option...')).toBeInTheDocument();
    expect(screen.getByText('Ding Dong')).toBeInTheDocument();
    expect(screen.getByText('Chime')).toBeInTheDocument();
    expect(screen.getByText('Doorbell')).toBeInTheDocument();
  });

  it('shows selector name in generic heading', () => {
    render(
      <RuleSelectorSection
        activeSelector="chime"
        selector={genericSelector}
        selectedValue=""
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('chime')).toBeInTheDocument();
  });

  it('sets select value to selectedValue', () => {
    render(
      <RuleSelectorSection
        activeSelector="chime"
        selector={genericSelector}
        selectedValue="CHIME"
        onSelect={jest.fn()}
      />,
    );
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('CHIME');
  });

  it('calls onSelect when dropdown value changes', () => {
    const onSelect = jest.fn();
    render(
      <RuleSelectorSection
        activeSelector="chime"
        selector={genericSelector}
        selectedValue=""
        onSelect={onSelect}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DOORBELL' } });
    expect(onSelect).toHaveBeenCalledWith('DOORBELL');
  });
});

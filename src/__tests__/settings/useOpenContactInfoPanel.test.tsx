import { renderHook } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useOpenContactInfoPanel } from '@/components/settings/useOpenContactInfoPanel';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
const mockDispatch = jest.fn();
const mockLoadContactInfo = jest.fn();
let mockSessionPerson: { personId?: string } | null = null;

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ auth: { person: mockSessionPerson } }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/components/settings/contactInfo', () => ({
  loadContactInfo: (...args: unknown[]) => mockLoadContactInfo(...args),
}));

jest.mock('@/components/settings/ContactInfoPanel', () => ({
  __esModule: true,
  default: () => null,
}));

// ── Helpers ───────────────────────────────────────────────────────────

interface OpenedPanelProps {
  person: Promise<unknown> | null;
  onReload: (personId: string) => void;
}

/** Props of the panel element passed to the nth openRight call. */
function openedPanel(n = 0): OpenedPanelProps {
  return (mockOpenRight.mock.calls[n][0] as ReactElement<OpenedPanelProps>).props;
}

const LOAD = Promise.resolve({ status: 'error', personId: 'p1' });

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionPerson = { personId: 'p1' };
  mockLoadContactInfo.mockReturnValue(LOAD);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useOpenContactInfoPanel', () => {
  it('opens the panel titled Edit Contact Info, loading the signed-in person', () => {
    const { result } = renderHook(() => useOpenContactInfoPanel());
    result.current();
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Edit Contact Info', key: 'contact-info:p1' });
    expect(mockLoadContactInfo).toHaveBeenCalledWith('p1', mockDispatch);
    expect(openedPanel().person).toBe(LOAD);
  });

  it('opens the panel without a load when no one is signed in', () => {
    mockSessionPerson = null;
    const { result } = renderHook(() => useOpenContactInfoPanel());
    result.current();
    expect(mockLoadContactInfo).not.toHaveBeenCalled();
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Edit Contact Info', key: 'contact-info:none' });
    expect(openedPanel().person).toBeNull();
  });

  it('reopens the panel with a fresh load for the given person on reload', () => {
    const { result } = renderHook(() => useOpenContactInfoPanel());
    result.current();
    openedPanel().onReload('p2');
    expect(mockOpenRight).toHaveBeenCalledTimes(2);
    expect(mockOpenRight).toHaveBeenLastCalledWith(expect.anything(), { title: 'Edit Contact Info', key: 'contact-info:p2' });
    expect(mockLoadContactInfo).toHaveBeenLastCalledWith('p2', mockDispatch);
  });
});

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, Person } from '@arcus/core';
import ContactInfoPanel from '@/components/settings/ContactInfoPanel';
import { makePerson } from '../helpers/factories';
import type { PersonEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

let mockSessionPerson: { personId?: string } | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({ auth: { person: mockSessionPerson } }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const PERSON_ADDRESS = 'SERV:person:p1';

/** What `base:GetAttributes` on the person returns. */
let platformPerson: PersonEntity;
/** Make the next `base:GetAttributes` reject. */
let failLoad = false;
/** Make `base:SetAttributes` reject. */
let failSave = false;

function setAttributesCalls() {
  return mockBridgeRequest.mock.calls.filter(([cmd]) => cmd === Base.CMD_SETATTRIBUTES);
}

/** Render the panel and wait for the person's attributes to load. */
async function renderLoaded() {
  const result = render(<ContactInfoPanel />);
  await screen.findByTestId('field-first-name');
  return result;
}

function type(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

beforeEach(() => {
  jest.clearAllMocks();
  // After sign-up / login the store only holds the session payload: no names or phone.
  mockSessionPerson = { personId: 'p1' };
  platformPerson = makePerson(PERSON_ADDRESS, {
    [Person.ATTR_FIRSTNAME]: 'John',
    [Person.ATTR_LASTNAME]: 'Doe',
    [Person.ATTR_MOBILENUMBER]: '5551234567',
    [Person.ATTR_EMAIL]: 'john@test.com',
  });
  failLoad = false;
  failSave = false;
  mockBridgeRequest.mockImplementation((cmd: string) => {
    if (cmd === Base.CMD_GETATTRIBUTES) {
      return failLoad ? Promise.reject(new Error('load failed')) : Promise.resolve({ ...platformPerson });
    }
    return failSave ? Promise.reject(new Error('save failed')) : Promise.resolve({});
  });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ContactInfoPanel', () => {
  describe('rendering', () => {
    it('matches snapshot', async () => {
      const { container } = await renderLoaded();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot while loading', () => {
      mockBridgeRequest.mockReturnValue(new Promise(() => {}));
      const { container } = render(<ContactInfoPanel />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot when loading fails', async () => {
      failLoad = true;
      const { container } = render(<ContactInfoPanel />);
      await screen.findByTestId('contact-load-error');
      expect(container.firstChild).toMatchSnapshot();
    });

    it('loads the person from the platform when opened', async () => {
      await renderLoaded();
      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_GETATTRIBUTES, PERSON_ADDRESS, {});
    });

    it('shows the loaded name and phone even though the session has none', async () => {
      await renderLoaded();
      expect(screen.getByTestId('field-first-name')).toHaveValue('John');
      expect(screen.getByTestId('field-last-name')).toHaveValue('Doe');
      expect(screen.getByTestId('field-phone')).toHaveValue('5551234567');
    });

    it('shows email cannot be changed note', async () => {
      await renderLoaded();
      expect(screen.getByText('Email cannot be changed here.')).toBeInTheDocument();
    });

    it('starts with Save disabled until something changes', async () => {
      await renderLoaded();
      expect(screen.getByTestId('contact-save')).toBeDisabled();
      type('field-first-name', 'Jane');
      expect(screen.getByTestId('contact-save')).toBeEnabled();
    });

    it('does not treat whitespace-only edits as changes', async () => {
      await renderLoaded();
      type('field-first-name', ' John  ');
      expect(screen.getByTestId('contact-save')).toBeDisabled();
    });
  });

  describe('loading', () => {
    it('shows no form and keeps Save disabled while the person loads', () => {
      mockBridgeRequest.mockReturnValue(new Promise(() => {}));
      render(<ContactInfoPanel />);
      expect(screen.getByTestId('contact-loading')).toHaveTextContent('Loading contact info…');
      expect(screen.queryByTestId('field-first-name')).not.toBeInTheDocument();
      expect(screen.getByTestId('contact-save')).toBeDisabled();
    });

    it('never saves when the person fails to load', async () => {
      failLoad = true;
      render(<ContactInfoPanel />);
      expect(await screen.findByTestId('contact-load-error')).toHaveTextContent('Unable to load your contact info.');
      expect(screen.queryByTestId('field-first-name')).not.toBeInTheDocument();
      expect(screen.getByTestId('contact-save')).toBeDisabled();
      fireEvent.click(screen.getByTestId('contact-save'));
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('reloads the person on Try again', async () => {
      failLoad = true;
      render(<ContactInfoPanel />);
      await screen.findByTestId('contact-load-error');

      failLoad = false;
      fireEvent.click(screen.getByTestId('contact-retry'));

      expect(await screen.findByTestId('field-first-name')).toHaveValue('John');
      expect(screen.queryByTestId('contact-load-error')).not.toBeInTheDocument();
    });

    it('shows the error state without a person id', async () => {
      mockSessionPerson = null;
      render(<ContactInfoPanel />);
      expect(await screen.findByTestId('contact-load-error')).toBeInTheDocument();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('saving', () => {
    it('sends only the changed field, never the unloaded names', async () => {
      // The reported scenario: a new user changes only their phone number.
      await renderLoaded();
      type('field-phone', '5550009999');
      fireEvent.click(screen.getByTestId('contact-save'));

      await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
      expect(setAttributesCalls()).toEqual([
        [Base.CMD_SETATTRIBUTES, PERSON_ADDRESS, { [Person.ATTR_MOBILENUMBER]: '5550009999' }],
      ]);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Contact info updated.' },
      });
    });

    it('trims the values it sends', async () => {
      await renderLoaded();
      type('field-first-name', '  Jane ');
      type('field-last-name', ' Smith  ');
      fireEvent.click(screen.getByTestId('contact-save'));

      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
      expect(setAttributesCalls()[0][2]).toEqual({
        [Person.ATTR_FIRSTNAME]: 'Jane',
        [Person.ATTR_LASTNAME]: 'Smith',
      });
    });

    it('disables Save while the request is in flight', async () => {
      await renderLoaded();
      let resolveSave: () => void = () => {};
      mockBridgeRequest.mockReturnValue(new Promise<void>((resolve) => { resolveSave = resolve; }));
      type('field-first-name', 'Jane');
      fireEvent.click(screen.getByTestId('contact-save'));

      await waitFor(() => expect(screen.getByTestId('contact-save')).toBeDisabled());
      expect(screen.getByTestId('contact-save')).toHaveTextContent('Saving…');
      fireEvent.click(screen.getByTestId('contact-save'));
      expect(setAttributesCalls()).toHaveLength(1);

      await act(async () => { resolveSave(); });
      expect(mockCloseRight).toHaveBeenCalled();
    });

    it('dispatches error notification on failure and keeps the panel open', async () => {
      failSave = true;
      await renderLoaded();
      type('field-first-name', 'Jane');
      fireEvent.click(screen.getByTestId('contact-save'));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to update contact info.' },
        });
      });
      expect(mockCloseRight).not.toHaveBeenCalled();
      expect(screen.getByTestId('contact-save')).toBeEnabled();
    });

    it('lets a person whose names were blanked fill them back in', async () => {
      platformPerson = makePerson(PERSON_ADDRESS, { [Person.ATTR_MOBILENUMBER]: '5551234567' });
      await renderLoaded();
      type('field-first-name', 'John');
      type('field-last-name', 'Doe');
      fireEvent.click(screen.getByTestId('contact-save'));

      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
      expect(setAttributesCalls()[0][2]).toEqual({
        [Person.ATTR_FIRSTNAME]: 'John',
        [Person.ATTR_LASTNAME]: 'Doe',
      });
    });
  });

  describe('validation', () => {
    it('blocks a blank first name', async () => {
      await renderLoaded();
      type('field-first-name', '');
      fireEvent.click(screen.getByTestId('contact-save'));

      expect(await screen.findByTestId('field-first-name-error')).toHaveTextContent("can't be blank");
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('blocks a whitespace-only last name', async () => {
      await renderLoaded();
      type('field-last-name', '   ');
      fireEvent.click(screen.getByTestId('contact-save'));

      expect(await screen.findByTestId('field-last-name-error')).toHaveTextContent("can't be blank");
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('blocks an invalid phone number', async () => {
      await renderLoaded();
      type('field-phone', '555-123');
      fireEvent.click(screen.getByTestId('contact-save'));

      expect(await screen.findByTestId('field-phone-error')).toHaveTextContent('must be a valid phone number');
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('blocks clearing the phone number', async () => {
      await renderLoaded();
      type('field-phone', '');
      fireEvent.click(screen.getByTestId('contact-save'));

      expect(await screen.findByTestId('field-phone-error')).toHaveTextContent("can't be blank");
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('accepts a formatted 10-digit phone number', async () => {
      await renderLoaded();
      type('field-phone', ' (555) 987-6543 ');
      fireEvent.click(screen.getByTestId('contact-save'));

      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
      expect(setAttributesCalls()[0][2]).toEqual({ [Person.ATTR_MOBILENUMBER]: '(555) 987-6543' });
    });

    it('requires a phone even when only the name changes', async () => {
      platformPerson = makePerson(PERSON_ADDRESS, {
        [Person.ATTR_FIRSTNAME]: 'John',
        [Person.ATTR_LASTNAME]: 'Doe',
      });
      await renderLoaded();
      type('field-first-name', 'Jane');
      fireEvent.click(screen.getByTestId('contact-save'));

      expect(await screen.findByTestId('field-phone-error')).toHaveTextContent("can't be blank");
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('clears an error on blur once the field is fixed', async () => {
      await renderLoaded();
      type('field-first-name', '');
      fireEvent.click(screen.getByTestId('contact-save'));
      await screen.findByTestId('field-first-name-error');

      type('field-first-name', 'Jane');
      fireEvent.blur(screen.getByTestId('field-first-name'));

      await waitFor(() => expect(screen.queryByTestId('field-first-name-error')).not.toBeInTheDocument());
    });

    it('does not show errors on blur before a save attempt', async () => {
      await renderLoaded();
      type('field-first-name', '');
      fireEvent.blur(screen.getByTestId('field-first-name'));
      expect(screen.queryByTestId('field-first-name-error')).not.toBeInTheDocument();
    });
  });

  it('closes panel on Cancel', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});

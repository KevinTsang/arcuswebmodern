import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, Person } from '@arcus/core';
import ContactInfoPanel from '@/components/settings/ContactInfoPanel';
import { loadContactInfo, type ContactLoad } from '@/components/settings/contactInfo';
import { makePerson } from '../helpers/factories';
import { renderSuspended } from '../helpers/renderSuspended';
import type { PersonEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockReload = jest.fn();
const mockBridgeRequest = jest.fn();
/** base:GetAttributes on a person. */
const mockGetAttributes = jest.fn();
/** base:SetAttributes on a person. */
const mockSetAttributes = jest.fn();

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

/** The person `base:GetAttributes` returns unless a test says otherwise. */
function storedPerson(): PersonEntity {
  return makePerson(PERSON_ADDRESS, {
    [Person.ATTR_FIRSTNAME]: 'John',
    [Person.ATTR_LASTNAME]: 'Doe',
    [Person.ATTR_MOBILENUMBER]: '(555) 123-4567',
    [Person.ATTR_EMAIL]: 'john@test.com',
  });
}

const LOAD_ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to load contact info.' } };

function setAttributesCalls() {
  return mockBridgeRequest.mock.calls.filter(([cmd]) => cmd === Base.CMD_SETATTRIBUTES);
}

const panel = (person: Promise<ContactLoad> | null) => (
  <ContactInfoPanel person={person} onReload={mockReload} />
);

/** Render the panel the way useOpenContactInfoPanel opens it for p1, and wait for the load. */
function renderPanel(person: Promise<ContactLoad> | null = loadContactInfo('p1', mockDispatch)) {
  return renderSuspended(panel(person));
}

/** Render the panel and wait for the person's attributes to load. */
async function renderLoaded() {
  const result = await renderPanel();
  await screen.findByTestId('field-first-name');
  return result;
}

function type(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

function clickSave() {
  fireEvent.click(screen.getByTestId('contact-save'));
}

beforeEach(() => {
  jest.clearAllMocks();
  // After sign-up / login the store only holds the session payload: no names or phone.
  mockSessionPerson = { personId: 'p1' };
  mockGetAttributes.mockResolvedValue(storedPerson());
  mockSetAttributes.mockResolvedValue({});
  // Route each Bridge call to the mock for its command.
  mockBridgeRequest.mockImplementation((cmd: string, address: string, attrs: object) =>
    cmd === Base.CMD_GETATTRIBUTES ? mockGetAttributes(address) : mockSetAttributes(address, attrs));
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ContactInfoPanel', () => {
  describe('rendering', () => {
    it('matches snapshot', async () => {
      const { asFragment } = await renderLoaded();
      expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot when loading fails', async () => {
      mockGetAttributes.mockRejectedValueOnce(new Error('load failed'));
      const { asFragment } = await renderPanel();
      await screen.findByTestId('contact-load-error');
      expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot with field errors', async () => {
      const { asFragment } = await renderLoaded();
      type('field-first-name', '');
      type('field-phone', '555-123');
      clickSave();
      await screen.findByTestId('field-phone-error');
      expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot when signed out', async () => {
      mockSessionPerson = null;
      const { asFragment } = await renderPanel(null);
      expect(asFragment()).toMatchSnapshot();
    });

    it('loads the person from the platform when opened', async () => {
      await renderLoaded();
      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_GETATTRIBUTES, PERSON_ADDRESS, {});
    });

    it('shows the loaded name and phone even though the session has none', async () => {
      await renderLoaded();
      expect(screen.getByLabelText('First Name')).toHaveValue('John');
      expect(screen.getByLabelText('Last Name')).toHaveValue('Doe');
      expect(screen.getByLabelText('Phone')).toHaveValue('(555) 123-4567');
    });

    it('lets the browser autofill the fields', async () => {
      await renderLoaded();
      expect(screen.getByLabelText('First Name')).toHaveAttribute('autocomplete', 'given-name');
      expect(screen.getByLabelText('Last Name')).toHaveAttribute('autocomplete', 'family-name');
      expect(screen.getByLabelText('Phone')).toHaveAttribute('autocomplete', 'tel');
      expect(screen.getByLabelText('Phone')).toHaveAttribute('type', 'tel');
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

    it('does not treat the same phone in another format as a change', async () => {
      await renderLoaded();
      type('field-phone', '555.123.4567');
      expect(screen.getByTestId('contact-save')).toBeDisabled();
    });
  });

  describe('loadContactInfo', () => {
    it('resolves to the loaded name and phone', async () => {
      await expect(loadContactInfo('p1', mockDispatch)).resolves.toEqual({
        status: 'ready',
        personId: 'p1',
        loaded: {
          [Person.ATTR_FIRSTNAME]: 'John',
          [Person.ATTR_LASTNAME]: 'Doe',
          [Person.ATTR_MOBILENUMBER]: '(555) 123-4567',
        },
      });
      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_GETATTRIBUTES, PERSON_ADDRESS, {});
    });

    it('fills missing attributes with empty strings', async () => {
      mockGetAttributes.mockResolvedValueOnce(makePerson(PERSON_ADDRESS, {}));
      await expect(loadContactInfo('p1', mockDispatch)).resolves.toMatchObject({
        loaded: { [Person.ATTR_FIRSTNAME]: '', [Person.ATTR_LASTNAME]: '', [Person.ATTR_MOBILENUMBER]: '' },
      });
    });

    it('resolves to an error and notifies when the load fails', async () => {
      mockGetAttributes.mockRejectedValueOnce(new Error('load failed'));
      await expect(loadContactInfo('p1', mockDispatch)).resolves.toEqual({ status: 'error', personId: 'p1' });
      expect(mockDispatch).toHaveBeenCalledWith(LOAD_ERROR);
    });
  });

  describe('loading', () => {
    it('suspends, showing no form, while the person loads', async () => {
      mockGetAttributes.mockReturnValueOnce(new Promise(() => {}));
      await renderPanel();
      expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('field-first-name')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contact-save')).not.toBeInTheDocument();
    });

    it('never offers Save when the person fails to load', async () => {
      mockGetAttributes.mockRejectedValueOnce(new Error('load failed'));
      await renderPanel();
      expect(await screen.findByTestId('contact-load-error')).toHaveTextContent('Unable to load your contact info.');
      expect(screen.queryByTestId('field-first-name')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contact-save')).not.toBeInTheDocument();
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('reopens the panel for the person on Try again', async () => {
      mockGetAttributes.mockRejectedValueOnce(new Error('load failed'));
      await renderPanel();
      fireEvent.click(await screen.findByTestId('contact-retry'));
      expect(mockReload).toHaveBeenCalledWith('p1');
    });

    it('asks the user to sign in again, with no retry, without a person', async () => {
      mockSessionPerson = null;
      await renderPanel(null);
      expect(screen.getByTestId('contact-signed-out')).toHaveTextContent(
        'Your session has ended. Sign in again to edit your contact info.',
      );
      expect(screen.queryByTestId('contact-retry')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contact-save')).not.toBeInTheDocument();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('stops offering Save when the session ends while the panel is open', async () => {
      const person = loadContactInfo('p1', mockDispatch);
      const { rerender } = await renderPanel(person);
      type('field-first-name', 'Jane');

      mockSessionPerson = null;
      rerender(panel(person));

      expect(screen.getByTestId('contact-signed-out')).toBeInTheDocument();
      expect(screen.queryByTestId('field-first-name')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contact-save')).not.toBeInTheDocument();
    });

    it('reloads instead of showing a person loaded before the signed-in person changed', async () => {
      const person = loadContactInfo('p1', mockDispatch);
      const { rerender } = await renderPanel(person);

      mockSessionPerson = { personId: 'p2' };
      await act(async () => rerender(panel(person)));

      expect(mockReload).toHaveBeenCalledWith('p2');
      expect(screen.getByTestId('contact-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('field-first-name')).not.toBeInTheDocument();
    });

    it('reloads instead of showing a load failure for a previous person', async () => {
      mockGetAttributes.mockRejectedValueOnce(new Error('load failed'));
      const person = loadContactInfo('p1', mockDispatch);
      const { rerender } = await renderPanel(person);

      mockSessionPerson = { personId: 'p2' };
      await act(async () => rerender(panel(person)));

      expect(mockReload).toHaveBeenCalledWith('p2');
      expect(screen.queryByTestId('contact-load-error')).not.toBeInTheDocument();
    });

    it('saves to the person the form was loaded for', async () => {
      await renderLoaded();
      type('field-first-name', 'Jane');
      clickSave();
      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
      expect(setAttributesCalls()[0][1]).toBe(PERSON_ADDRESS);
    });
  });

  describe('saving', () => {
    it('sends only the changed field, never the unloaded names', async () => {
      // The reported scenario: a new user changes only their phone number.
      await renderLoaded();
      type('field-phone', '5550009999');
      clickSave();

      await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
      expect(setAttributesCalls()).toEqual([
        [Base.CMD_SETATTRIBUTES, PERSON_ADDRESS, { [Person.ATTR_MOBILENUMBER]: '(555) 000-9999' }],
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
      clickSave();

      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
      expect(setAttributesCalls()[0][2]).toEqual({
        [Person.ATTR_FIRSTNAME]: 'Jane',
        [Person.ATTR_LASTNAME]: 'Smith',
      });
    });

    it.each([
      ['5559876543'],
      [' (555) 987-6543 '],
      ['555.987.6543'],
      ['1 555 987 6543'],
      ['+1 (555) 987-6543'],
    ])('sends phone %p in the format the platform stores', async (phone) => {
      await renderLoaded();
      type('field-phone', phone);
      clickSave();

      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
      expect(setAttributesCalls()[0][2]).toEqual({ [Person.ATTR_MOBILENUMBER]: '(555) 987-6543' });
    });

    it('disables Save and the fields while the request is in flight', async () => {
      await renderLoaded();
      mockSetAttributes.mockReturnValueOnce(new Promise(() => {}));
      type('field-first-name', 'Jane');
      clickSave();

      await waitFor(() => expect(screen.getByTestId('contact-save')).toBeDisabled());
      expect(await screen.findByTestId('contact-save')).toHaveTextContent('Saving…');
      expect(screen.getByLabelText('First Name')).toBeDisabled();
      expect(screen.getByLabelText('Last Name')).toBeDisabled();
      expect(screen.getByLabelText('Phone')).toBeDisabled();
      clickSave();
      expect(setAttributesCalls()).toHaveLength(1);
    });

    it('dispatches error notification on failure and keeps the panel editable', async () => {
      mockSetAttributes.mockRejectedValueOnce(new Error('save failed'));
      await renderLoaded();
      type('field-first-name', 'Jane');
      clickSave();

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to update contact info.' },
        });
      });
      expect(mockCloseRight).not.toHaveBeenCalled();
      expect(screen.getByTestId('contact-save')).toBeEnabled();
      expect(screen.getByLabelText('First Name')).toBeEnabled();
    });

    it('lets a person whose names were blanked fill them back in', async () => {
      mockGetAttributes.mockResolvedValue(makePerson(PERSON_ADDRESS, { [Person.ATTR_MOBILENUMBER]: '(555) 123-4567' }));
      await renderLoaded();
      type('field-first-name', 'John');
      type('field-last-name', 'Doe');
      clickSave();

      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
      expect(setAttributesCalls()[0][2]).toEqual({
        [Person.ATTR_FIRSTNAME]: 'John',
        [Person.ATTR_LASTNAME]: 'Doe',
      });
    });

    it.each([
      ['no phone', undefined],
      ['a phone the platform would not accept', '555-1234'],
    ])('saves a name change for a person with %s', async (_label, storedPhone) => {
      // Sign-up and invite let people skip the phone, so an unchanged phone is never checked.
      mockGetAttributes.mockResolvedValue(makePerson(PERSON_ADDRESS, {
        [Person.ATTR_FIRSTNAME]: '',
        [Person.ATTR_LASTNAME]: 'Doe',
        ...(storedPhone === undefined ? {} : { [Person.ATTR_MOBILENUMBER]: storedPhone }),
      }));
      await renderLoaded();
      type('field-first-name', 'John');
      clickSave();

      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
      expect(setAttributesCalls()[0][2]).toEqual({ [Person.ATTR_FIRSTNAME]: 'John' });
      expect(screen.queryByTestId('field-phone-error')).not.toBeInTheDocument();
    });

    it('saves a phone change for a person with a blank last name', async () => {
      mockGetAttributes.mockResolvedValue(makePerson(PERSON_ADDRESS, { [Person.ATTR_FIRSTNAME]: 'John' }));
      await renderLoaded();
      type('field-phone', '5559876543');
      clickSave();

      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
      expect(setAttributesCalls()[0][2]).toEqual({ [Person.ATTR_MOBILENUMBER]: '(555) 987-6543' });
    });
  });

  describe('validation', () => {
    it('blocks a blank first name', async () => {
      await renderLoaded();
      type('field-first-name', '');
      clickSave();

      expect(await screen.findByTestId('field-first-name-error')).toHaveTextContent("can't be blank");
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('blocks a whitespace-only last name', async () => {
      await renderLoaded();
      type('field-last-name', '   ');
      clickSave();

      expect(await screen.findByTestId('field-last-name-error')).toHaveTextContent("can't be blank");
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('still blocks blanking a name when the stored phone is invalid', async () => {
      mockGetAttributes.mockResolvedValue(makePerson(PERSON_ADDRESS, {
        [Person.ATTR_FIRSTNAME]: 'John',
        [Person.ATTR_LASTNAME]: 'Doe',
      }));
      await renderLoaded();
      type('field-last-name', '');
      clickSave();

      expect(await screen.findByTestId('field-last-name-error')).toHaveTextContent("can't be blank");
      expect(screen.queryByTestId('field-phone-error')).not.toBeInTheDocument();
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it.each([
      ['too few digits', '555-123'],
      ['11 digits without the country code 1', '25559876543'],
      ['text around the digits', 'call 555 987 6543'],
      ['letters', 'abc5559876543'],
      ['other symbols', '555/987/6543#'],
    ])('blocks a phone with %s', async (_label, phone) => {
      await renderLoaded();
      type('field-phone', phone);
      clickSave();

      expect(await screen.findByTestId('field-phone-error')).toHaveTextContent('must be a valid phone number');
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('blocks clearing the phone number', async () => {
      await renderLoaded();
      type('field-phone', '');
      clickSave();

      expect(await screen.findByTestId('field-phone-error')).toHaveTextContent("can't be blank");
      expect(setAttributesCalls()).toHaveLength(0);
    });

    it('links each error to its input', async () => {
      await renderLoaded();
      type('field-first-name', '');
      type('field-phone', '555-123');
      clickSave();

      await screen.findByTestId('field-phone-error');
      expect(screen.getByLabelText('First Name')).toHaveAccessibleDescription("can't be blank");
      expect(screen.getByLabelText('First Name')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Phone')).toHaveAccessibleDescription('must be a valid phone number');
      expect(screen.getByLabelText('Last Name')).not.toHaveAttribute('aria-describedby');
    });

    it('does not show errors before a save attempt', async () => {
      await renderLoaded();
      type('field-first-name', '');
      type('field-phone', '555-123');
      expect(screen.queryByTestId('field-first-name-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('field-phone-error')).not.toBeInTheDocument();
    });

    it('clears an error as soon as the field is fixed', async () => {
      await renderLoaded();
      type('field-phone', '555-123');
      clickSave();
      await screen.findByTestId('field-phone-error');

      type('field-phone', '555-987-6543');

      expect(screen.queryByTestId('field-phone-error')).not.toBeInTheDocument();
    });

    it('updates an error while the user types', async () => {
      await renderLoaded();
      type('field-phone', '');
      clickSave();
      expect(await screen.findByTestId('field-phone-error')).toHaveTextContent("can't be blank");

      type('field-phone', '555');

      expect(screen.getByTestId('field-phone-error')).toHaveTextContent('must be a valid phone number');
    });

    it('clears an error once the field is back to its loaded value', async () => {
      await renderLoaded();
      type('field-first-name', '');
      clickSave();
      await screen.findByTestId('field-first-name-error');

      type('field-first-name', 'John');

      expect(screen.queryByTestId('field-first-name-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('contact-save')).toBeDisabled();
    });

    it('checks other changed fields as the user types after a failed save', async () => {
      await renderLoaded();
      type('field-phone', '555-123');
      clickSave();
      await screen.findByTestId('field-phone-error');

      type('field-last-name', '');

      expect(screen.getByTestId('field-last-name-error')).toHaveTextContent("can't be blank");
    });

    it('never changes the errors on blur, so the buttons do not move under a click', async () => {
      await renderLoaded();
      // Before a save attempt, leaving an invalid field shows nothing.
      type('field-phone', '555-123');
      fireEvent.blur(screen.getByTestId('field-phone'));
      expect(screen.queryByTestId('field-phone-error')).not.toBeInTheDocument();

      // After one, typing updates the errors and leaving the field keeps them as they were.
      clickSave();
      await screen.findByTestId('field-phone-error');
      fireEvent.blur(screen.getByTestId('field-phone'));
      expect(screen.getByTestId('field-phone-error')).toBeInTheDocument();

      type('field-phone', '555-987-6543');
      expect(screen.queryByTestId('field-phone-error')).not.toBeInTheDocument();
      // Mousedown on Save blurs the phone input first: nothing above the buttons may change.
      fireEvent.blur(screen.getByTestId('field-phone'));
      expect(screen.queryByTestId('field-phone-error')).not.toBeInTheDocument();

      clickSave();
      await waitFor(() => expect(setAttributesCalls()).toHaveLength(1));
    });
  });

  it('closes panel on Cancel', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SecurityQuestionPanel from '@/components/settings/SecurityQuestionPanel';
import type { SecurityAnswer, SecurityQuestion } from '@/components/settings/securityQuestions';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockSave = jest.fn();

jest.mock('@/components/settings/securityQuestions', () => ({
  saveSecurityAnswers: (...args: any[]) => mockSave(...args),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const QUESTIONS: SecurityQuestion[] = [
  { id: 'question1', question: 'First pet?' },
  { id: 'question2', question: 'Favorite teacher?' },
  { id: 'question3', question: 'Street you grew up on?' },
];

const ANSWERS: SecurityAnswer[] = [
  { id: 'question1', answer: 'Rex' },
  { id: 'question2', answer: 'Ms. Lee' },
];

const onSaved = jest.fn();

function renderPanel(index: number, answers: SecurityAnswer[] = ANSWERS) {
  return render(
    <SecurityQuestionPanel personId="p1" index={index} questions={QUESTIONS} answers={answers} onSaved={onSaved} />,
  );
}

const select = () => screen.getByTestId('security-question-select') as HTMLSelectElement;
const answerInput = () => screen.getByLabelText('Answer') as HTMLInputElement;
const save = () => fireEvent.click(screen.getByTestId('security-question-save'));

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('SecurityQuestionPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderPanel(0);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('prefills the question and answer being edited', () => {
      renderPanel(1);
      expect(select().value).toBe('question2');
      expect(answerInput().value).toBe('Ms. Lee');
    });

    it('starts empty when adding', () => {
      renderPanel(2);
      expect(select().value).toBe('');
      expect(answerInput().value).toBe('');
    });

    it('offers only questions not answered in another slot', () => {
      renderPanel(2);
      const options = Array.from(select().options).map((o) => o.value);
      expect(options).toEqual(['', 'question3']);
    });

    it('keeps the question being edited selectable', () => {
      renderPanel(0);
      const options = Array.from(select().options).map((o) => o.value);
      expect(options).toEqual(['', 'question1', 'question3']);
    });

    it('disables Save until something changes', () => {
      renderPanel(0);
      expect(screen.getByTestId('security-question-save')).toBeDisabled();
    });
  });

  describe('saving', () => {
    it('saves the full set with the edited answer swapped in', async () => {
      renderPanel(1);
      fireEvent.change(answerInput(), { target: { value: '  Mr. Kim ' } });
      save();

      const expected = [ANSWERS[0], { id: 'question2', answer: 'Mr. Kim' }];
      await waitFor(() => expect(mockSave).toHaveBeenCalledWith('p1', expected));
      expect(onSaved).toHaveBeenCalledWith(expected);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Security question saved.' },
      });
      expect(mockCloseRight).toHaveBeenCalled();
    });

    it('adds a new answer at the end', async () => {
      renderPanel(2);
      fireEvent.change(select(), { target: { value: 'question3' } });
      fireEvent.change(answerInput(), { target: { value: 'Elm' } });
      save();

      await waitFor(() =>
        expect(mockSave).toHaveBeenCalledWith('p1', [...ANSWERS, { id: 'question3', answer: 'Elm' }]));
    });

    it('clears the answer when the question changes', () => {
      renderPanel(0);
      fireEvent.change(select(), { target: { value: 'question3' } });
      expect(answerInput().value).toBe('');
    });

    it('shows validation errors instead of saving a blank answer', async () => {
      renderPanel(0);
      fireEvent.change(select(), { target: { value: 'question3' } });
      save();

      expect(await screen.findByTestId('field-answer-error')).toHaveTextContent("can't be blank");
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('requires a question', async () => {
      renderPanel(2);
      fireEvent.change(answerInput(), { target: { value: 'Elm' } });
      save();

      expect(await screen.findByTestId('security-question-select-error')).toHaveTextContent("can't be blank");
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('shows an error and stays open when saving fails', async () => {
      mockSave.mockRejectedValueOnce(new Error('fail'));
      renderPanel(1);
      fireEvent.change(answerInput(), { target: { value: 'Mr. Kim' } });
      save();

      expect(await screen.findByTestId('security-question-error')).toHaveTextContent('Unable to save');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to save security question.' },
      });
      expect(onSaved).not.toHaveBeenCalled();
      expect(mockCloseRight).not.toHaveBeenCalled();
      expect(screen.getByTestId('security-question-save')).not.toBeDisabled();
    });

    it('closes on Cancel without saving', () => {
      renderPanel(0);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockCloseRight).toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    });
  });
});

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { ReactElement } from 'react';
import SecurityQuestionsCard from '@/components/settings/SecurityQuestionsCard';
import type { SecurityAnswer, SecurityQuestionData } from '@/components/settings/securityQuestions';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
const mockDispatch = jest.fn();
const mockLoad = jest.fn();
let mockPersonId: string | undefined = 'p1';

jest.mock('@/components/settings/securityQuestions', () => ({
  MAX_SECURITY_QUESTIONS: 3,
  loadSecurityQuestions: (...args: any[]) => mockLoad(...args),
}));

jest.mock('@/components/settings/SecurityQuestionPanel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ auth: { person: mockPersonId ? { personId: mockPersonId } : null } }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const DATA: SecurityQuestionData = {
  questions: [
    { id: 'question1', question: 'First pet?' },
    { id: 'question2', question: 'Favorite teacher?' },
    { id: 'question3', question: 'Street you grew up on?' },
  ],
  answers: [{ id: 'question2', answer: 'Ms. Lee' }],
};

interface PanelProps {
  personId: string;
  index: number;
  answers: SecurityAnswer[];
  onSaved: (answers: SecurityAnswer[]) => void;
}

/** The props of the panel passed to the last openRight call. */
function lastPanelProps(): PanelProps {
  const element = mockOpenRight.mock.calls.at(-1)![0] as ReactElement<PanelProps>;
  return element.props;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPersonId = 'p1';
  mockLoad.mockResolvedValue(DATA);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('SecurityQuestionsCard', () => {
  it('matches snapshot', async () => {
    const { asFragment } = render(<SecurityQuestionsCard />);
    await screen.findByTestId('security-question-1');
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows loading, then the saved questions', async () => {
      render(<SecurityQuestionsCard />);
      expect(screen.getByText('Loading security questions…')).toBeInTheDocument();
      expect(await screen.findByTestId('security-question-1')).toHaveTextContent('Favorite teacher?');
      expect(mockLoad).toHaveBeenCalledWith('p1');
    });

    it('offers Add while fewer than three are saved', async () => {
      render(<SecurityQuestionsCard />);
      expect(await screen.findByTestId('security-question-add')).toBeInTheDocument();
    });

    it('hides Add once three are saved', async () => {
      mockLoad.mockResolvedValueOnce({
        ...DATA,
        answers: DATA.questions.map((q) => ({ id: q.id, answer: 'x' })),
      });
      render(<SecurityQuestionsCard />);
      await screen.findByTestId('security-question-3');
      expect(screen.queryByTestId('security-question-add')).not.toBeInTheDocument();
    });

    it('prompts to add one when none are saved', async () => {
      mockLoad.mockResolvedValueOnce({ ...DATA, answers: [] });
      render(<SecurityQuestionsCard />);
      expect(await screen.findByText('Add a security question to help verify your identity.')).toBeInTheDocument();
    });

    it('shows the question id when its text is unknown', async () => {
      mockLoad.mockResolvedValueOnce({ questions: [], answers: [{ id: 'question9', answer: 'x' }] });
      render(<SecurityQuestionsCard />);
      expect(await screen.findByTestId('security-question-1')).toHaveTextContent('question9');
    });

    it('does not load without a signed-in person', () => {
      mockPersonId = undefined;
      render(<SecurityQuestionsCard />);
      expect(screen.getByText('Loading security questions…')).toBeInTheDocument();
      expect(mockLoad).not.toHaveBeenCalled();
    });
  });

  describe('load failure', () => {
    it('shows an error and a retry', async () => {
      mockLoad.mockRejectedValueOnce(new Error('fail'));
      render(<SecurityQuestionsCard />);
      expect(await screen.findByTestId('security-questions-error')).toBeInTheDocument();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to load security questions.' },
      });

      fireEvent.click(screen.getByTestId('security-questions-retry'));
      expect(await screen.findByTestId('security-question-1')).toBeInTheDocument();
      expect(mockLoad).toHaveBeenCalledTimes(2);
    });
  });

  describe('editing', () => {
    it('opens the panel to edit a saved question', async () => {
      render(<SecurityQuestionsCard />);
      fireEvent.click(await screen.findByTestId('security-question-edit-1'));
      expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), {
        title: 'Edit Security Question 1',
        key: 'security-question:0',
      });
      expect(lastPanelProps()).toMatchObject({ personId: 'p1', index: 0, answers: DATA.answers });
    });

    it('opens the panel to add the next question', async () => {
      render(<SecurityQuestionsCard />);
      fireEvent.click(await screen.findByTestId('security-question-add'));
      expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), {
        title: 'Add Security Question 2',
        key: 'security-question:1',
      });
      expect(lastPanelProps().index).toBe(1);
    });

    it('shows the answers the panel saved', async () => {
      render(<SecurityQuestionsCard />);
      fireEvent.click(await screen.findByTestId('security-question-add'));
      act(() => lastPanelProps().onSaved([...DATA.answers, { id: 'question1', answer: 'Rex' }]));

      await waitFor(() => expect(screen.getByTestId('security-question-2')).toHaveTextContent('First pet?'));
      expect(mockLoad).toHaveBeenCalledTimes(1);
    });
  });
});

import { I18NService, Person } from '@arcus/core';
import {
  loadSecurityQuestions,
  parseSecurityAnswers,
  parseSecurityQuestions,
  saveSecurityAnswers,
  securityAnswerAttributes,
} from '@/components/settings/securityQuestions';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockRestfulRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: {
    request: (...args: any[]) => mockBridgeRequest(...args),
    restfulRequest: (...args: any[]) => mockRestfulRequest(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRestfulRequest.mockResolvedValue({
    localizedStrings: {
      'security_question:question10': 'Favorite teacher?',
      'security_question:question2': 'First pet?',
    },
  });
  mockBridgeRequest.mockResolvedValue({ securityAnswers: { question2: 'Rex' } });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('parseSecurityQuestions', () => {
  it('strips the bundle prefix and sorts by question number', () => {
    expect(parseSecurityQuestions({
      'security_question:question10': 'Ten',
      'security_question:question2': 'Two',
    })).toEqual([
      { id: 'question2', question: 'Two' },
      { id: 'question10', question: 'Ten' },
    ]);
  });

  it('keeps keys without a prefix and drops empty ids', () => {
    expect(parseSecurityQuestions({ question1: 'One', 'security_question:': 'Bad' })).toEqual([
      { id: 'question1', question: 'One' },
    ]);
  });

  it('puts ids without a number last', () => {
    expect(parseSecurityQuestions({ 'b:other': 'Other', 'b:question1': 'One' }).map((q) => q.id))
      .toEqual(['question1', 'other']);
  });
});

describe('parseSecurityAnswers', () => {
  it('lists the answers in order', () => {
    expect(parseSecurityAnswers({ question3: 'a', question1: 'b' })).toEqual([
      { id: 'question3', answer: 'a' },
      { id: 'question1', answer: 'b' },
    ]);
  });

  it('handles a missing map', () => {
    expect(parseSecurityAnswers(undefined)).toEqual([]);
  });
});

describe('securityAnswerAttributes', () => {
  it('numbers each question and answer', () => {
    expect(securityAnswerAttributes([
      { id: 'question3', answer: 'a' },
      { id: 'question1', answer: 'b' },
    ])).toEqual({
      securityQuestion1: 'question3',
      securityAnswer1: 'a',
      securityQuestion2: 'question1',
      securityAnswer2: 'b',
    });
  });

  it('sends at most three answers', () => {
    const answers = [1, 2, 3, 4].map((n) => ({ id: `question${n}`, answer: `a${n}` }));
    expect(Object.keys(securityAnswerAttributes(answers))).toHaveLength(6);
  });
});

describe('loadSecurityQuestions', () => {
  it('loads the question bundle and the person\'s answers', async () => {
    await expect(loadSecurityQuestions('p1')).resolves.toEqual({
      questions: [
        { id: 'question2', question: 'First pet?' },
        { id: 'question10', question: 'Favorite teacher?' },
      ],
      answers: [{ id: 'question2', answer: 'Rex' }],
    });
    expect(mockRestfulRequest).toHaveBeenCalledWith(
      I18NService.CMD_LOADLOCALIZEDSTRINGS,
      'SERV:i18n:',
      { bundleNames: ['security_question'], locale: undefined },
    );
    expect(mockBridgeRequest).toHaveBeenCalledWith(Person.CMD_GETSECURITYANSWERS, 'SERV:person:p1', {});
  });

  it('handles empty responses', async () => {
    mockRestfulRequest.mockResolvedValueOnce({});
    mockBridgeRequest.mockResolvedValueOnce({});
    await expect(loadSecurityQuestions('p1')).resolves.toEqual({ questions: [], answers: [] });
  });

  it('rejects when a request fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    await expect(loadSecurityQuestions('p1')).rejects.toThrow('fail');
  });
});

describe('saveSecurityAnswers', () => {
  it('sends the full set of answers', async () => {
    mockBridgeRequest.mockResolvedValueOnce({});
    await saveSecurityAnswers('p1', [{ id: 'question2', answer: 'Rex' }]);
    expect(mockBridgeRequest).toHaveBeenCalledWith(Person.CMD_SETSECURITYANSWERS, 'SERV:person:p1', {
      securityQuestion1: 'question2',
      securityAnswer1: 'Rex',
    });
  });

  it('rejects when the platform refuses', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('nope'));
    await expect(saveSecurityAnswers('p1', [])).rejects.toThrow('nope');
  });
});

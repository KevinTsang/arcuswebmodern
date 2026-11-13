import Bridge from '@arcus/core/bridge';
import { I18NService, Person } from '@arcus/core';

/** The most security questions a person can answer. */
export const MAX_SECURITY_QUESTIONS = 3;

/** The i18n bundle holding the security question texts. */
export const SECURITY_QUESTION_BUNDLE = 'security_question';

/** A question the person can pick, e.g. `{ id: 'question3', question: 'What was your first car?' }`. */
export interface SecurityQuestion {
  /** The platform's identifier for the question, as sent in `person:SetSecurityAnswers`. */
  id: string;
  question: string;
}

/** One of the person's saved answers. */
export interface SecurityAnswer {
  /** The `SecurityQuestion.id` the answer is for. */
  id: string;
  answer: string;
}

/** The response of `person:GetSecurityAnswers`: answers keyed by question id. */
export interface GetSecurityAnswersResponse {
  securityAnswers?: Record<string, string>;
}

/** The questions to pick from and the person's current answers. */
export interface SecurityQuestionData {
  questions: SecurityQuestion[];
  answers: SecurityAnswer[];
}

/** The numeric part of a question id ("question12" → 12), for sorting. */
function questionNumber(id: string): number {
  const match = /(\d+)$/.exec(id);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Turns the `security_question` bundle (keys like `security_question:question3`) into a list
 * of questions, ordered by number.
 */
export function parseSecurityQuestions(localizedStrings: Record<string, string>): SecurityQuestion[] {
  return Object.entries(localizedStrings)
    .map(([key, question]) => ({ id: key.slice(key.lastIndexOf(':') + 1), question }))
    .filter((q) => q.id.length > 0)
    .sort((a, b) => questionNumber(a.id) - questionNumber(b.id));
}

/** Turns the answers map from `person:GetSecurityAnswers` into a list, keeping the platform's order. */
export function parseSecurityAnswers(securityAnswers: Record<string, string> | undefined): SecurityAnswer[] {
  return Object.entries(securityAnswers ?? {}).map(([id, answer]) => ({ id, answer }));
}

/** The attributes of `person:SetSecurityAnswers` for `answers`: `securityQuestion1`, `securityAnswer1`, … */
export function securityAnswerAttributes(answers: SecurityAnswer[]): Record<string, string> {
  const attrs: Record<string, string> = {};
  answers.slice(0, MAX_SECURITY_QUESTIONS).forEach(({ id, answer }, i) => {
    attrs[`securityQuestion${i + 1}`] = id;
    attrs[`securityAnswer${i + 1}`] = answer;
  });
  return attrs;
}

/** Loads the question texts and the person's answers. Rejects if either request fails. */
export async function loadSecurityQuestions(personId: string): Promise<SecurityQuestionData> {
  const [strings, answers] = await Promise.all([
    I18NService.LoadLocalizedStrings([SECURITY_QUESTION_BUNDLE]),
    Bridge.request<GetSecurityAnswersResponse>(Person.CMD_GETSECURITYANSWERS, `SERV:person:${personId}`, {}),
  ]);
  return {
    questions: parseSecurityQuestions(strings.localizedStrings ?? {}),
    answers: parseSecurityAnswers(answers.securityAnswers),
  };
}

/** Saves the person's full set of answers (the platform replaces them all). */
export async function saveSecurityAnswers(personId: string, answers: SecurityAnswer[]): Promise<void> {
  await Bridge.request(Person.CMD_SETSECURITYANSWERS, `SERV:person:${personId}`, securityAnswerAttributes(answers));
}

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { validateFields, type ValidationConstraints } from '@/hooks/useFormValidation';
import { SECURITY_ANSWER_RULE } from '@/lib/validationRules';
import { saveSecurityAnswers, type SecurityAnswer, type SecurityQuestion } from './securityQuestions';
import Field from './Field';

const CONSTRAINTS: ValidationConstraints = {
  questionId: { presence: true },
  answer: SECURITY_ANSWER_RULE,
};

interface SecurityQuestionPanelProps {
  personId: string;
  /** Position of the answer being added or edited, from 0. */
  index: number;
  /** Every question the platform offers. */
  questions: SecurityQuestion[];
  /** The person's saved answers when the panel opened. */
  answers: SecurityAnswer[];
  /** Called with the full set of answers once they are saved. */
  onSaved: (answers: SecurityAnswer[]) => void;
}

/**
 * Adds or edits one security question and answer. The platform replaces all
 * answers at once, so Save sends the full set with this one swapped in.
 */
export default function SecurityQuestionPanel({ personId, index, questions, answers, onSaved }: SecurityQuestionPanelProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const current = answers[index];

  const [questionId, setQuestionId] = useState(current?.id ?? '');
  const [answer, setAnswer] = useState(current?.answer ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // A question already answered in another slot can't be picked again.
  const selectable = useMemo(() => {
    const usedElsewhere = new Set(answers.filter((_, i) => i !== index).map((a) => a.id));
    return questions.filter((q) => !usedElsewhere.has(q.id));
  }, [questions, answers, index]);

  const errors = useMemo(
    () => validateFields(CONSTRAINTS, Object.keys(CONSTRAINTS), { questionId, answer }),
    [questionId, answer],
  );
  const hasChanges = questionId !== (current?.id ?? '') || answer.trim() !== (current?.answer ?? '');

  const handleQuestionChange = useCallback((id: string) => {
    setQuestionId(id);
    // A new question needs a new answer.
    setAnswer('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    const next = [...answers];
    next[index] = { id: questionId, answer: answer.trim() };

    setSaving(true);
    setError('');
    try {
      await saveSecurityAnswers(personId, next);
      onSaved(next);
      dispatch(addNotification({ type: 'success', message: 'Security question saved.' }));
      closeRight();
    } catch {
      setError('Unable to save your security question. Please try again.');
      dispatch(addNotification({ type: 'error', message: 'Failed to save security question.' }));
    } finally {
      setSaving(false);
    }
  }, [hasChanges, saving, errors, answers, index, questionId, answer, personId, onSaved, dispatch, closeRight]);

  const questionError = showErrors ? errors.questionId?.[0] : undefined;

  return (
    <div className="p-4 space-y-4">
      <div>
        <label htmlFor="security-question" className="block text-sm text-grouse mb-1">Question</label>
        <select
          id="security-question"
          data-testid="security-question-select"
          value={questionId}
          onChange={(e) => handleQuestionChange(e.target.value)}
          disabled={saving}
          aria-invalid={questionError ? true : undefined}
          className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock bg-crane disabled:opacity-50"
        >
          <option value="">Select a question…</option>
          {selectable.map((q) => (
            <option key={q.id} value={q.id}>{q.question}</option>
          ))}
        </select>
        {questionError && (
          <p data-testid="security-question-select-error" className="mt-1 text-sm text-cardinal">{questionError}</p>
        )}
      </div>
      <Field
        id="security-answer"
        label="Answer"
        value={answer}
        onChange={setAnswer}
        autoComplete="off"
        disabled={saving}
        error={showErrors ? errors.answer?.[0] : undefined}
      />
      {error && <p data-testid="security-question-error" className="text-sm text-cardinal">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          data-testid="security-question-save"
          disabled={!hasChanges || saving}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}

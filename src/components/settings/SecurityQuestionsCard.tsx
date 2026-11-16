'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import InfoCard from './InfoCard';
import SecurityQuestionPanel from './SecurityQuestionPanel';
import {
  MAX_SECURITY_QUESTIONS,
  loadSecurityQuestions,
  type SecurityAnswer,
  type SecurityQuestionData,
} from './securityQuestions';

/** A finished load, for the load key (person and attempt) it was made for. */
type Loaded = { key: string } & ({ status: 'error' } | ({ status: 'ready' } & SecurityQuestionData));

type LoadState = { status: 'loading' } | Loaded;

/**
 * Lists the person's security questions (up to three), with Edit on each and
 * Add while there's room for another.
 */
export default function SecurityQuestionsCard() {
  const personId = useAppSelector((s) => s.auth.person?.personId);
  const dispatch = useAppDispatch();
  const { openRight } = useSidePanel();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadKey = `${personId ?? ''}|${attempt}`;
  const state = useMemo<LoadState>(
    () => (loaded?.key === loadKey ? loaded : { status: 'loading' }),
    [loaded, loadKey],
  );

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    loadSecurityQuestions(personId)
      .then((data) => {
        if (!cancelled) setLoaded({ key: loadKey, status: 'ready', ...data });
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded({ key: loadKey, status: 'error' });
        dispatch(addNotification({ type: 'error', message: 'Failed to load security questions.' }));
      });
    return () => {
      cancelled = true;
    };
  }, [personId, loadKey, dispatch]);

  const handleRetry = useCallback(() => setAttempt((n) => n + 1), []);

  const handleSaved = useCallback((answers: SecurityAnswer[]) => {
    setLoaded((prev) => (prev?.status === 'ready' ? { ...prev, answers } : prev));
  }, []);

  const openEditor = useCallback(
    (index: number) => {
      if (!personId || state.status !== 'ready') return;
      const editing = index < state.answers.length;
      openRight(
        <SecurityQuestionPanel
          personId={personId}
          index={index}
          questions={state.questions}
          answers={state.answers}
          onSaved={handleSaved}
        />,
        { title: `${editing ? 'Edit' : 'Add'} Security Question ${index + 1}`, key: `security-question:${index}` },
      );
    },
    [personId, state, openRight, handleSaved],
  );

  let body: ReactNode;
  if (!personId || state.status === 'loading') {
    body = <p className="text-sm text-grouse">Loading security questions…</p>;
  } else if (state.status === 'error') {
    body = (
      <div className="space-y-2">
        <p data-testid="security-questions-error" className="text-sm text-cardinal">Unable to load your security questions.</p>
        <button data-testid="security-questions-retry" onClick={handleRetry} className="text-sm text-peacock hover:underline">
          Try again
        </button>
      </div>
    );
  } else {
    const textOf = (id: string) => state.questions.find((q) => q.id === id)?.question ?? id;
    body = (
      <>
        {state.answers.length === 0 && (
          <p className="text-sm text-grouse">Add a security question to help verify your identity.</p>
        )}
        {state.answers.map((a, i) => (
          <div key={a.id} data-testid={`security-question-${i + 1}`} className="flex items-start justify-between gap-4 text-sm">
            <div>
              <p className="text-grouse">Question {i + 1}</p>
              <p className="text-swift">{textOf(a.id)}</p>
            </div>
            <button
              data-testid={`security-question-edit-${i + 1}`}
              onClick={() => openEditor(i)}
              className="text-sm text-peacock hover:underline"
            >
              Edit
            </button>
          </div>
        ))}
        {state.answers.length < MAX_SECURITY_QUESTIONS && (
          <button
            data-testid="security-question-add"
            onClick={() => openEditor(state.answers.length)}
            className="text-sm text-peacock hover:underline"
          >
            Add a question
          </button>
        )}
      </>
    );
  }

  return <InfoCard title="Security Questions">{body}</InfoCard>;
}

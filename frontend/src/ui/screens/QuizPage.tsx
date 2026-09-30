// QuizPage — /quiz
// MCQ cards (shuffled), progress dots, Report Problem button (MR-20, MR-15)
import React, { useState, useRef } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { ReportProblem } from '../components/ReportProblem';
import { DifficultyTap } from '../components/DifficultyTap';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { QuizQuestion, SelfDifficulty } from '../../types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function QuizPage() {
  const { context, setContext, setScreen, setLoading } = useAgentStore();
  const { activeProfile } = useProfileStore();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Array<{ question_id: string; correct: boolean; choice_id: string }>>([]);
  const [diffSelected, setDiffSelected] = useState<SelfDifficulty | null>(null);
  const [processing, setProcessing] = useState(false);
  const startTime = useRef<number>(Date.now());

  const quiz = context?.quiz ?? [];
  const lang = context?.profile?.language ?? activeProfile?.language ?? 'en';
  const question: QuizQuestion | undefined = quiz[currentIdx];
  const isLast = currentIdx === quiz.length - 1;

  if (!quiz.length || !question) {
    return (
      <div className="screen flex-center flex-col" style={{ minHeight: '100dvh' }}>
        <div className="spinner spinner-lg" aria-label="Loading quiz" />
      </div>
    );
  }

  const isEarlyGrade = activeProfile && activeProfile.class <= 3;
  const tapMin = isEarlyGrade ? 'var(--tap-early)' : 'var(--tap-min)';

  async function handleSubmit() {
    if (!selectedId || submitted || !context) return;
    const answerTimeSec = (Date.now() - startTime.current) / 1000;
    setSubmitted(true);
    setProcessing(true);

    try {
      const { runTurn } = await import('../../agent/orchestrator');

      const nextCtx = await runTurn(
        context.studentId,
        context.deviceId,
        {
          type: 'answer',
          choiceId: selectedId!,
          answerTimeSec,
        },
      );
      setContext(nextCtx);
      const correct = nextCtx.assessment?.correct ?? false;
      setResults((prev) => [...prev, { question_id: question.question_id, correct, choice_id: selectedId }]);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  }

  async function handleNext() {
    if (!context) return;
    if (!isLast) {
      setCurrentIdx((i) => i + 1);
      setSelectedId(null);
      setSubmitted(false);
      setDiffSelected(null);
      startTime.current = Date.now();
    } else {
      // All done → feedback
      setScreen('feedback');
    }
  }

  const selectedOption = question.options.find((o) => o.id === selectedId);
  const correctOption = question.options.find((o) => o.correct);

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        <div className="screen-header">
          <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Exit quiz">✕</button>
          <h1 className="screen-title">Quiz</h1>
          <span className="badge badge-primary" aria-label={`Question ${currentIdx + 1} of ${quiz.length}`}>
            {currentIdx + 1}/{quiz.length}
          </span>
        </div>

        {/* Progress dots */}
        <div className="progress-dots mb-6" role="list" aria-label="Quiz progress">
          {quiz.map((q, i) => {
            const r = results.find((r) => r.question_id === q.question_id);
            const cls = r ? (r.correct ? 'done' : 'wrong') : i === currentIdx ? 'active' : '';
            return (
              <div
                key={q.question_id}
                className={`progress-dot ${cls}`}
                role="listitem"
                aria-label={`Question ${i + 1}: ${r ? (r.correct ? 'correct' : 'wrong') : i === currentIdx ? 'current' : 'pending'}`}
              />
            );
          })}
        </div>

        <div className="scroll-area">
          {/* Question difficulty badge */}
          <div className="flex justify-between items-center mb-4">
            <span className={`badge ${question.difficulty === 'easy' ? 'badge-success' : question.difficulty === 'hard' ? 'badge-error' : 'badge-warning'}`}>
              {question.difficulty === 'easy' ? '🌱 Easy' : question.difficulty === 'hard' ? '🔥 Hard' : '🎯 Medium'}
            </span>
            {context && (
              <ReportProblem
                topicId={context.topicId ?? ''}
                questionId={question.question_id}
                studentId={context.studentId}
              />
            )}
          </div>

          {/* Stem */}
          <div
            className="card mb-6"
            style={{ fontSize: 'var(--text-lg)', fontWeight: 600, lineHeight: 1.5, color: 'var(--text-primary)' }}
          >
            <p style={{ margin: 0 }}>{question.stem[lang as any] ?? question.stem.en}</p>
          </div>

          {/* Options */}
          <div className="flex-col gap-3" role="group" aria-label="Answer choices">
            {question.options.map((opt, i) => {
              let cls = '';
              if (submitted) {
                if (opt.correct) cls = 'correct';
                else if (opt.id === selectedId) cls = 'incorrect';
              } else if (opt.id === selectedId) {
                cls = 'selected';
              }

              return (
                <button
                  key={opt.id}
                  id={`option-${opt.id}`}
                  className={`mcq-option ${cls}`}
                  onClick={() => !submitted && setSelectedId(opt.id)}
                  disabled={submitted}
                  aria-pressed={selectedId === opt.id}
                  aria-label={`${OPTION_LETTERS[i]}: ${opt.text[lang as any] ?? opt.text.en}`}
                  style={{ minHeight: tapMin }}
                >
                  <div className="mcq-letter" aria-hidden="true">{OPTION_LETTERS[i]}</div>
                  <span>{opt.text[lang as any] ?? opt.text.en}</span>
                  {submitted && opt.correct && <span aria-hidden="true" style={{ marginLeft: 'auto' }}>✅</span>}
                  {submitted && opt.id === selectedId && !opt.correct && <span aria-hidden="true" style={{ marginLeft: 'auto' }}>❌</span>}
                </button>
              );
            })}
          </div>

          {/* Feedback after submit */}
          {submitted && context?.assessment && (
            <div className={`banner mt-6 ${context.assessment.correct ? 'banner-success' : 'banner-error'}`} role="alert" aria-live="assertive">
              <span aria-hidden="true">{context.assessment.correct ? '🎉' : '💡'}</span>
              <span>
                {context.assessment.correct
                  ? 'Correct! Well done.'
                  : `Not quite. ${correctOption ? `The answer is: ${correctOption.text[lang as any] ?? correctOption.text.en}` : ''}`}
              </span>
            </div>
          )}

          {/* Misconception feedback */}
          {submitted && context?.assessment?.misconception_id && (
            <div className="card mt-4" style={{ borderColor: 'var(--warning)' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--warning)', margin: 0 }}>
                ⚠️ Common misconception detected. SATHI will help you understand this better.
              </p>
            </div>
          )}

          {/* Difficulty tap after answer */}
          {submitted && (
            <div className="card mt-4">
              <DifficultyTap onSelect={setDiffSelected} selected={diffSelected} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bottom-action">
          {!submitted ? (
            <button
              id="quiz-submit-btn"
              className="btn btn-primary btn-full btn-lg"
              onClick={handleSubmit}
              disabled={!selectedId || processing}
              aria-label="Submit answer"
              aria-busy={processing}
            >
              {processing ? <><div className="spinner" aria-hidden="true" /> Checking…</> : 'Submit answer'}
            </button>
          ) : (
            <button
              id="quiz-next-btn"
              className="btn btn-primary btn-full btn-lg"
              onClick={handleNext}
              aria-label={isLast ? 'See results' : 'Next question'}
            >
              {isLast ? '🏆 See results' : 'Next question →'}
            </button>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

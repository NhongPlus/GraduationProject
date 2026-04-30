import { useEffect, useRef, useState } from 'react';
import type { MockExamQuestion, QuestionNavigatorFilter } from '@/components/ExamTake/types';
import { readDraftAnswers } from '@/services/examAutosaveClient';

export function useExamTakeState(activeExamId: string) {
  const [questions, setQuestions] = useState<MockExamQuestion[]>([]);
  const [questionIdByNumber, setQuestionIdByNumber] = useState<Record<number, string>>({});
  const [examTitle, setExamTitle] = useState('Bai thi');
  const [examSection, setExamSection] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState('');
  const [currentNumber, setCurrentNumber] = useState(1);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [realtimeMessage, setRealtimeMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusLeaveCount, setFocusLeaveCount] = useState(0);
  const [violationLocked, setViolationLocked] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(5);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [serverForceSummaryText, setServerForceSummaryText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>(() => readDraftAnswers(activeExamId));
  const [flagged, setFlagged] = useState<Set<number>>(() => new Set());
  const [navFilter, setNavFilter] = useState<QuestionNavigatorFilter>('all');
  const remainingRef = useRef(remainingSeconds);
  const sessionStartingRef = useRef(false);
  const violationTriggeredRef = useRef(false);
  const lastViolationAtRef = useRef(0);

  useEffect(() => {
    setAnswers(readDraftAnswers(activeExamId));
    setFlagged(new Set());
    setNavFilter('all');
    setFocusLeaveCount(0);
    setViolationLocked(false);
    setLockReason('');
    setAutoSubmitted(false);
    setAutoSubmitCountdown(5);
    setSubmitFailed(false);
    setServerForceSummaryText('');
    setSessionId(null);
    violationTriggeredRef.current = false;
    lastViolationAtRef.current = 0;
  }, [activeExamId]);

  useEffect(() => {
    remainingRef.current = remainingSeconds;
  }, [remainingSeconds]);

  return {
    examData: {
      questions,
      setQuestions,
      questionIdByNumber,
      setQuestionIdByNumber,
      examTitle,
      setExamTitle,
      examSection,
      setExamSection,
      answers,
      setAnswers,
      flagged,
      setFlagged,
      navFilter,
      setNavFilter,
      currentNumber,
      setCurrentNumber,
    },
    boot: {
      sessionId,
      setSessionId,
      bootLoading,
      setBootLoading,
      bootError,
      setBootError,
    },
    runtime: {
      remainingSeconds,
      setRemainingSeconds,
      examStarted,
      setExamStarted,
      realtimeMessage,
      setRealtimeMessage,
      isFullscreen,
      setIsFullscreen,
      focusLeaveCount,
      setFocusLeaveCount,
    },
    submit: {
      autoSubmitCountdown,
      setAutoSubmitCountdown,
      autoSubmitted,
      setAutoSubmitted,
      submitting,
      setSubmitting,
      submitFailed,
      setSubmitFailed,
      serverForceSummaryText,
      setServerForceSummaryText,
    },
    integrity: {
      violationLocked,
      setViolationLocked,
      lockReason,
      setLockReason,
    },
    refs: {
      remainingRef,
      sessionStartingRef,
      violationTriggeredRef,
      lastViolationAtRef,
    },
  };
}

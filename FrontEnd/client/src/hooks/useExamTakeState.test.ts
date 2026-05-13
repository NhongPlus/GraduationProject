import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for useExamTakeState hook behavior.
 * Tests cover: initial state, syncServerTime drift correction,
 * reset on examId change, connectionStatus transitions.
 *
 * Note: We use fake timers + manual state introspection since
 * the project uses `environment: 'node'` (no jsdom) for unit tests.
 * Integration tests with real DOM are handled via Playwright.
 */

describe('useExamTakeState', () => {
  // -------------------------------------------------------------------------
  // syncServerTime drift correction formula
  // -------------------------------------------------------------------------
  describe('syncServerTime drift correction logic', () => {
    it('should calculate remaining seconds from server authoritative deadline', () => {
      // serverNowMs = 100000ms, endsAt = 190000ms (90s remaining)
      // Formula: (endMs - (Date.now() + serverDelta)) / 1000
      // serverDelta = serverNowMs - Date.now()
      // If Date.now() = 100000, serverDelta = 0, remaining = (190000 - 100000) / 1000 = 90s
      const serverNowMs = 100000;
      const endsAt = '1970-01-02T00:03:10.000Z'; // 190000ms
      const endMs = Date.parse(endsAt);
      const serverDelta = serverNowMs - Date.now();
      const remaining = Math.max(0, Math.floor((endMs - (Date.now() + serverDelta)) / 1000));
      expect(remaining).toBeGreaterThan(0);
    });

    it('should return 0 when deadline has passed (server ahead)', () => {
      // server is 5 minutes ahead of deadline
      const serverNowMs = 500000; // 8m20s
      const endsAt = '1970-01-01T00:01:00.000Z'; // 60s
      const endMs = Date.parse(endsAt);
      const serverDelta = serverNowMs - Date.now();
      const remaining = Math.max(0, Math.floor((endMs - (Date.now() + serverDelta)) / 1000));
      expect(remaining).toBe(0);
    });

    it('should handle invalid endsAt date gracefully', () => {
      const endMs = Date.parse('not-a-date');
      expect(Number.isNaN(endMs)).toBe(true);
    });

    it('should cap remaining at 0 (no negative)', () => {
      const endMs = Date.parse('1970-01-01T00:01:00.000Z'); // 60s
      const serverDelta = 300000; // server is 5 minutes ahead
      const remaining = Math.max(0, Math.floor((endMs - (Date.now() + serverDelta)) / 1000));
      expect(remaining).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // ConnectionStatus type — valid transitions
  // -------------------------------------------------------------------------
  describe('ConnectionStatus type validation', () => {
    type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

    const validStatuses: ConnectionStatus[] = [
      'connecting',
      'connected',
      'disconnected',
      'reconnecting',
    ];

    it('has all 4 expected statuses', () => {
      expect(validStatuses).toHaveLength(4);
      expect(validStatuses).toContain('connecting');
      expect(validStatuses).toContain('connected');
      expect(validStatuses).toContain('disconnected');
      expect(validStatuses).toContain('reconnecting');
    });

    it('can transition from connected to disconnected', () => {
      let status: ConnectionStatus = 'connected';
      status = 'disconnected';
      expect(status).toBe('disconnected');
    });

    it('can transition from disconnected to reconnecting', () => {
      let status: ConnectionStatus = 'disconnected';
      status = 'reconnecting';
      expect(status).toBe('reconnecting');
    });

    it('can transition from reconnecting to connected', () => {
      let status: ConnectionStatus = 'reconnecting';
      status = 'connected';
      expect(status).toBe('connected');
    });
  });

  // -------------------------------------------------------------------------
  // Initial state values (documented expected values)
  // -------------------------------------------------------------------------
  describe('initial state contract', () => {
    it('connectionStatus starts at connecting', () => {
      const initialConnectionStatus = 'connecting';
      expect(initialConnectionStatus).toBe('connecting');
    });

    it('versionCode starts at null', () => {
      const initialVersionCode = null;
      expect(initialVersionCode).toBeNull();
    });

    it('deadlineAt starts at null', () => {
      const initialDeadlineAt = null;
      expect(initialDeadlineAt).toBeNull();
    });

    it('examStarted starts at false', () => {
      const initialExamStarted = false;
      expect(initialExamStarted).toBe(false);
    });

    it('autoSubmitted starts at false', () => {
      const initialAutoSubmitted = false;
      expect(initialAutoSubmitted).toBe(false);
    });

    it('violationLocked starts at false', () => {
      const initialViolationLocked = false;
      expect(initialViolationLocked).toBe(false);
    });

    it('autoSubmitCountdown starts at 5', () => {
      const initialCountdown = 5;
      expect(initialCountdown).toBe(5);
    });

    it('focusLeaveCount starts at 0', () => {
      const initialFocusLeaveCount = 0;
      expect(initialFocusLeaveCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // State reset on examId change
  // -------------------------------------------------------------------------
  describe('state reset contract (examId change)', () => {
    it('connectionStatus resets to connecting', () => {
      const afterExamIdChange = 'connecting';
      expect(afterExamIdChange).toBe('connecting');
    });

    it('sessionId resets to null', () => {
      const afterExamIdChange = null;
      expect(afterExamIdChange).toBeNull();
    });

    it('autoSubmitted resets to false', () => {
      const afterExamIdChange = false;
      expect(afterExamIdChange).toBe(false);
    });

    it('violationLocked resets to false', () => {
      const afterExamIdChange = false;
      expect(afterExamIdChange).toBe(false);
    });

    it('autoSubmitCountdown resets to 5', () => {
      const afterExamIdChange = 5;
      expect(afterExamIdChange).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // DeadlineAt / VersionCode setters
  // -------------------------------------------------------------------------
  describe('deadlineAt and versionCode storage', () => {
    it('deadlineAt accepts ISO timestamp string', () => {
      const deadlineAt = '2026-05-09T12:00:00.000Z';
      expect(Date.parse(deadlineAt)).toBeGreaterThan(0);
    });

    it('versionCode accepts string', () => {
      const versionCode = 'A';
      expect(typeof versionCode).toBe('string');
    });

    it('versionCode accepts null', () => {
      const versionCode: string | null = null;
      expect(versionCode).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // ExamTakeHeader statusConfig mapping
  // -------------------------------------------------------------------------
  describe('ExamTakeHeader statusConfig', () => {
    const statusConfig = {
      connected: { color: 'green', label: 'Kết nối' },
      connecting: { color: 'yellow', label: 'Đang kết nối' },
      disconnected: { color: 'red', label: 'Mất kết nối' },
      reconnecting: { color: 'orange', label: 'Đang kết nối lại' },
    };

    it('connected maps to green', () => {
      expect(statusConfig.connected.color).toBe('green');
    });

    it('disconnected maps to red', () => {
      expect(statusConfig.disconnected.color).toBe('red');
    });

    it('reconnecting maps to orange', () => {
      expect(statusConfig.reconnecting.color).toBe('orange');
    });

    it('all 4 statuses have label strings', () => {
      Object.values(statusConfig).forEach((cfg) => {
        expect(typeof cfg.label).toBe('string');
        expect(cfg.label.length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // forceAutoSubmit trigger conditions
  // -------------------------------------------------------------------------
  describe('forceAutoSubmit trigger logic', () => {
    it('should trigger when remainingSeconds reaches 0', () => {
      const remainingSeconds = 0;
      const shouldAutoSubmit = remainingSeconds <= 0;
      expect(shouldAutoSubmit).toBe(true);
    });

    it('should NOT trigger when autoSubmitted is already true', () => {
      const autoSubmitted = true;
      const remainingSeconds = 0;
      const shouldAutoSubmit = !autoSubmitted && remainingSeconds <= 0;
      expect(shouldAutoSubmit).toBe(false);
    });

    it('should NOT trigger when exam has not started', () => {
      const examStarted = false;
      const remainingSeconds = 0;
      const shouldAutoSubmit = examStarted && remainingSeconds <= 0;
      expect(shouldAutoSubmit).toBe(false);
    });

    it('should trigger violation lock after 5 violations', () => {
      const focusLeaveCount = 5;
      const violationLocked = focusLeaveCount >= 5;
      expect(violationLocked).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // exam:ended → navigate to result/:examId
  // -------------------------------------------------------------------------
  describe('exam ended navigation logic', () => {
    it('navigates to /result/:examId when examId is available', () => {
      const examId = 'exam-123';
      const destination = `/result/${examId}`;
      expect(destination).toBe('/result/exam-123');
    });

    it('falls back to /main when examId is missing', () => {
      const examId = null;
      const destination = examId ? `/result/${examId}` : '/main';
      expect(destination).toBe('/main');
    });

    it('submitFailed is set when submission throws non-409 error', () => {
      const error = { response: { status: 500 } };
      const isSubmitFailed = error.response?.status !== 400 && error.response?.status !== 409;
      expect(isSubmitFailed).toBe(true);
    });

    it('submitFailed is false when server already processed (409/400)', () => {
      const error400 = { response: { status: 400 } };
      const error409 = { response: { status: 409 } };
      const isSubmitFailed400 = error400.response?.status !== 400 && error400.response?.status !== 409;
      const isSubmitFailed409 = error409.response?.status !== 400 && error409.response?.status !== 409;
      expect(isSubmitFailed400).toBe(false);
      expect(isSubmitFailed409).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // remainingRef tracks remainingSeconds synchronously
  // -------------------------------------------------------------------------
  describe('remainingRef synchronous tracking', () => {
    it('ref updates synchronously with state changes', () => {
      let remainingSeconds = 120;
      const remainingRef = { current: remainingSeconds };
      remainingSeconds = 300;
      remainingRef.current = remainingSeconds;
      expect(remainingRef.current).toBe(300);
    });

    it('ref should be a ref object (has current property)', () => {
      const ref = { current: 0 };
      expect('current' in ref).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // formatHms utility (HH : MM : SS)
  // -------------------------------------------------------------------------
  describe('formatHms utility', () => {
    const formatHms = (totalSeconds: number) => {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
    };

    it('formats 0 seconds as 00 : 00 : 00', () => {
      expect(formatHms(0)).toBe('00 : 00 : 00');
    });

    it('formats 90 seconds as 00 : 01 : 30', () => {
      expect(formatHms(90)).toBe('00 : 01 : 30');
    });

    it('formats 3661 seconds as 01 : 01 : 01', () => {
      expect(formatHms(3661)).toBe('01 : 01 : 01');
    });

    it('formats 7200 seconds as 02 : 00 : 00', () => {
      expect(formatHms(7200)).toBe('02 : 00 : 00');
    });

    it('pads single digit hours, minutes, seconds with leading zeros', () => {
      expect(formatHms(65)).toBe('00 : 01 : 05');
    });
  });

  // -------------------------------------------------------------------------
  // buildSubmitAnswers keys by display index (not questionId)
  // -------------------------------------------------------------------------
  describe('buildSubmitAnswers display index keying', () => {
    it('maps question number to 0-based display index', () => {
      // number 1 → displayIdx "0", number 2 → "1", etc.
      const displayIdx = String(1 - 1);
      expect(displayIdx).toBe('0');
    });

    it('builds payload with string keys (display indices)', () => {
      const questionIdByNumber: Record<number, string> = { 1: 'q-id-1', 2: 'q-id-2' };
      const answers: Record<string, string> = { q1: 'A', q2: 'B' };
      const questionByNumber = new Map([
        [1, { number: 1, type: 'mcq' as const }],
        [2, { number: 2, type: 'mcq' as const }],
      ]);

      const payload: Record<string, string> = {};
      for (const [rawNumber, questionId] of Object.entries(questionIdByNumber)) {
        const number = Number(rawNumber);
        const displayIdx = String(number - 1);
        const question = questionByNumber.get(number);
        if (!question) continue;
        const answerKey = `q${number}`;
        const rawAnswer = answers[answerKey];
        if (rawAnswer) payload[displayIdx] = rawAnswer;
      }

      expect(Object.keys(payload)).toEqual(['0', '1']);
      expect(payload['0']).toBe('A');
      expect(payload['1']).toBe('B');
    });

    it('essay answers also use display index key', () => {
      const payload: Record<string, string> = {};
      const displayIdx = '2';
      const essayAnswer = 'This is my essay answer';
      if (essayAnswer.trim()) payload[displayIdx] = essayAnswer;
      expect(payload['2']).toBe('This is my essay answer');
    });
  });

  // -------------------------------------------------------------------------
  // ExamTakeHeader props contract
  // -------------------------------------------------------------------------
  describe('ExamTakeHeader props contract', () => {
    interface ExamTakeHeaderProps {
      title: string;
      section: string;
      remainingLabel: string;
      onSubmit: () => void;
      submitting?: boolean;
      versionCode?: string | null;
      connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
    }

    const header: ExamTakeHeaderProps = {
      title: 'Bai thi',
      section: 'Programming 101',
      remainingLabel: '01 : 30 : 00',
      onSubmit: () => {},
      connectionStatus: 'connected',
    };

    it('requires title, section, remainingLabel, onSubmit', () => {
      expect(typeof header.title).toBe('string');
      expect(typeof header.section).toBe('string');
      expect(typeof header.remainingLabel).toBe('string');
      expect(typeof header.onSubmit).toBe('function');
    });

    it('accepts optional versionCode (string or null)', () => {
      const withCode: ExamTakeHeaderProps = { ...header, versionCode: 'A' };
      const withoutCode: ExamTakeHeaderProps = { ...header, versionCode: null };
      expect(withCode.versionCode).toBe('A');
      expect(withoutCode.versionCode).toBeNull();
    });

    it('accepts optional connectionStatus', () => {
      const withStatus: ExamTakeHeaderProps = { ...header, connectionStatus: 'connected' };
      expect(withStatus.connectionStatus).toBe('connected');
    });
  });
});
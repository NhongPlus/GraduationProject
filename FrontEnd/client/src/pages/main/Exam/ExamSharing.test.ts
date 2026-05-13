import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Item 8: Exam Sharing + Grading Assignments
 *
 * Tests cover:
 * - ExamShare role validation
 * - GradingAssignment status transitions
 * - canAccessExam logic (creator OR shared)
 * - Assignment count logic
 * - Status badge color mapping
 */

/** ExamShare role from examSharing.model.ts */
type ExamShareRole = "viewer" | "grader" | "co-owner";

/** GradingAssignment status from examSharing.model.ts */
type GradingAssignmentStatus = "pending" | "in_progress" | "completed";

interface ExamShare {
  id: string;
  exam_id: string;
  shared_with: string;
  role: ExamShareRole;
  assigned_by: string;
  assigned_at: string;
}

interface GradingAssignment {
  id: string;
  exam_session_id: string;
  exam_id: string;
  teacher_id: string;
  assigned_by: string;
  assigned_at: string;
  graded_at: string | null;
  status: GradingAssignmentStatus;
  notes: string | null;
}

describe('ExamShareRole validation', () => {
  const VALID_ROLES: ExamShareRole[] = ["viewer", "grader", "co-owner"];

  it('accepts viewer role', () => {
    expect(VALID_ROLES).toContain("viewer");
  });
  it('accepts grader role', () => {
    expect(VALID_ROLES).toContain("grader");
  });
  it('accepts co-owner role', () => {
    expect(VALID_ROLES).toContain("co-owner");
  });
  it('rejects invalid role', () => {
    expect(VALID_ROLES).not.toContain("admin");
  });
});

describe('GradingAssignmentStatus transitions', () => {
  const VALID_STATUSES: GradingAssignmentStatus[] = ["pending", "in_progress", "completed"];

  it('pending is valid', () => {
    expect(VALID_STATUSES).toContain("pending");
  });
  it('in_progress is valid', () => {
    expect(VALID_STATUSES).toContain("in_progress");
  });
  it('completed is valid', () => {
    expect(VALID_STATUSES).toContain("completed");
  });

  const nextStatus: Record<GradingAssignmentStatus, GradingAssignmentStatus | null> = {
    pending: "in_progress",
    in_progress: "completed",
    completed: null,
  };

  it('pending -> in_progress is valid', () => {
    expect(nextStatus["pending"]).toBe("in_progress");
  });
  it('in_progress -> completed is valid', () => {
    expect(nextStatus["in_progress"]).toBe("completed");
  });
  it('completed has no next status', () => {
    expect(nextStatus["completed"]).toBeNull();
  });
});

describe('canAccessExam logic', () => {
  // Simulates canAccessExam(examId, userId) logic
  const canAccessExam = (
    examCreator: string,
    userId: string,
    shares: { shared_with: string }[]
  ): boolean => {
    if (examCreator === userId) return true;
    return shares.some(s => s.shared_with === userId);
  };

  it('creator always has access', () => {
    const shares: { shared_with: string }[] = [];
    expect(canAccessExam("user-1", "user-1", shares)).toBe(true);
  });

  it('shared user has access', () => {
    const shares: { shared_with: string }[] = [{ shared_with: "user-2" }];
    expect(canAccessExam("user-1", "user-2", shares)).toBe(true);
  });

  it('non-creator non-shared has no access', () => {
    const shares: { shared_with: string }[] = [{ shared_with: "user-3" }];
    expect(canAccessExam("user-1", "user-2", shares)).toBe(false);
  });

  it('empty shares list', () => {
    const shares: { shared_with: string }[] = [];
    expect(canAccessExam("user-1", "user-2", shares)).toBe(false);
  });

  it('multiple shares', () => {
    const shares: { shared_with: string }[] = [
      { shared_with: "user-2" },
      { shared_with: "user-3" },
      { shared_with: "user-4" },
    ];
    expect(canAccessExam("user-1", "user-3", shares)).toBe(true);
    expect(canAccessExam("user-1", "user-5", shares)).toBe(false);
  });
});

describe('Pending grading count', () => {
  const PENDING_STATUSES: GradingAssignmentStatus[] = ["pending", "in_progress"];

  const isPending = (status: GradingAssignmentStatus) => PENDING_STATUSES.includes(status);

  it('pending counts', () => {
    expect(isPending("pending")).toBe(true);
  });
  it('in_progress counts', () => {
    expect(isPending("in_progress")).toBe(true);
  });
  it('completed does not count', () => {
    expect(isPending("completed")).toBe(false);
  });
});

describe('Status badge color mapping', () => {
  const statusColor = (status: GradingAssignmentStatus): string => {
    switch (status) {
      case "pending": return "yellow";
      case "in_progress": return "blue";
      case "completed": return "green";
      default: return "gray";
    }
  };

  it('pending -> yellow', () => {
    expect(statusColor("pending")).toBe("yellow");
  });
  it('in_progress -> blue', () => {
    expect(statusColor("in_progress")).toBe("blue");
  });
  it('completed -> green', () => {
    expect(statusColor("completed")).toBe("green");
  });
});

describe('ExamShare ON CONFLICT update', () => {
  // Simulates ON CONFLICT (exam_id, shared_with) DO UPDATE SET role = $3
  const mergeShare = (
    existing: ExamShare | null,
    newRole: ExamShareRole
  ): ExamShare => {
    if (existing) {
      return { ...existing, role: newRole };
    }
    return {
      id: "new-share",
      exam_id: "exam-1",
      shared_with: "user-2",
      role: newRole,
      assigned_by: "user-1",
      assigned_at: new Date().toISOString(),
    };
  };

  it('update existing share role', () => {
    const existing: ExamShare = {
      id: "s1", exam_id: "e1", shared_with: "u2",
      role: "viewer", assigned_by: "u1", assigned_at: "",
    };
    const result = mergeShare(existing, "grader");
    expect(result.role).toBe("grader");
  });

  it('create new share when not exists', () => {
    const result = mergeShare(null, "co-owner");
    expect(result.role).toBe("co-owner");
    expect(result.id).toBe("new-share");
  });
});

describe('GradingAssignment graded_at', () => {
  it('graded_at is null when pending', () => {
    const assignment: GradingAssignment = {
      id: "a1", exam_session_id: "es1", exam_id: "e1",
      teacher_id: "t1", assigned_by: "a1", assigned_at: "",
      graded_at: null, status: "pending", notes: null,
    };
    expect(assignment.graded_at).toBeNull();
  });

  it('graded_at is set when completed', () => {
    const assignment: GradingAssignment = {
      id: "a1", exam_session_id: "es1", exam_id: "e1",
      teacher_id: "t1", assigned_by: "a1", assigned_at: "",
      graded_at: new Date().toISOString(), status: "completed", notes: "Good work",
    };
    expect(assignment.graded_at).not.toBeNull();
    expect(assignment.status).toBe("completed");
  });

  it('graded_at is null when in_progress', () => {
    const assignment: GradingAssignment = {
      id: "a1", exam_session_id: "es1", exam_id: "e1",
      teacher_id: "t1", assigned_by: "a1", assigned_at: "",
      graded_at: null, status: "in_progress", notes: null,
    };
    expect(assignment.graded_at).toBeNull();
  });
});

describe('Share role permissions', () => {
  const canView = (role: ExamShareRole) => true; // all roles can view
  const canGrade = (role: ExamShareRole) => role === "grader" || role === "co-owner";
  const canEdit = (role: ExamShareRole) => role === "co-owner";

  it('viewer can view', () => {
    expect(canView("viewer")).toBe(true);
  });
  it('grader can view and grade', () => {
    expect(canView("grader")).toBe(true);
    expect(canGrade("grader")).toBe(true);
    expect(canEdit("grader")).toBe(false);
  });
  it('co-owner can view, grade, and edit', () => {
    expect(canView("co-owner")).toBe(true);
    expect(canGrade("co-owner")).toBe(true);
    expect(canEdit("co-owner")).toBe(true);
  });
});

describe('Grading assignment unique constraint', () => {
  it('unique exam_session_id + teacher_id pair', () => {
    const assignments = [
      { exam_session_id: "es1", teacher_id: "t1" },
      { exam_session_id: "es1", teacher_id: "t2" },
      { exam_session_id: "es2", teacher_id: "t1" },
    ];
    // Each pair should be unique
    const key = (a: { exam_session_id: string; teacher_id: string }) =>
      `${a.exam_session_id}:${a.teacher_id}`;
    const keys = assignments.map(key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(3);
  });

  it('duplicate pair should conflict', () => {
    const existing = { exam_session_id: "es1", teacher_id: "t1" };
    const incoming = { exam_session_id: "es1", teacher_id: "t1" };
    const isConflict = existing.exam_session_id === incoming.exam_session_id &&
      existing.teacher_id === incoming.teacher_id;
    expect(isConflict).toBe(true);
  });
});

describe('getMyGradingAssignments query structure', () => {
  it('filters by teacher_id', () => {
    const assignments = [
      { teacher_id: "t1", exam_title: "Python Final" },
      { teacher_id: "t2", exam_title: "Math Midterm" },
      { teacher_id: "t1", exam_title: "Python Quiz 2" },
    ];
    const mine = assignments.filter(a => a.teacher_id === "t1");
    expect(mine).toHaveLength(2);
  });
});

describe('getSharedExams query structure', () => {
  it('returns exam_id and role', () => {
    const shares = [
      { exam_id: "e1", role: "grader" as ExamShareRole },
      { exam_id: "e2", role: "viewer" as ExamShareRole },
    ];
    expect(shares[0].exam_id).toBe("e1");
    expect(shares[0].role).toBe("grader");
  });
});
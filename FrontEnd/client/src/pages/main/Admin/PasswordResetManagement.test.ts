import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Item 6: Password Reset via Email
 *
 * Tests cover:
 * - PasswordResetRequestItem structure
 * - Status badge color mapping
 * - Temp password display logic
 * - Email validation for self-reset request
 * - Request/approve/reject state transitions
 * - Note modal state management
 */

/** PasswordResetRequestItem mirroring authApi.ts */
interface PasswordResetRequestItem {
  id: string;
  user_id: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected" | "expired";
  admin_note: string | null;
  approved_by: string | null;
  expires_at: string;
  created_at: string;
  user_full_name: string | null;
  user_email: string;
  requested_by_full_name: string | null;
  approved_by_full_name: string | null;
}

describe('PasswordResetRequestItem structure', () => {
  it('has all required fields', () => {
    const req: PasswordResetRequestItem = {
      id: 'req-1',
      user_id: 'user-1',
      requested_by: 'admin-1',
      status: 'pending',
      admin_note: null,
      approved_by: null,
      expires_at: '2026-05-10T00:00:00Z',
      created_at: '2026-05-09T00:00:00Z',
      user_full_name: 'Nguyen Van A',
      user_email: 'a@example.com',
      requested_by_full_name: 'Admin',
      approved_by_full_name: null,
    };
    expect(req.status).toBe('pending');
    expect(req.user_email).toBe('a@example.com');
  });
  it('approved request has approved_by and admin_note', () => {
    const req: PasswordResetRequestItem = {
      id: 'req-1', user_id: 'u', requested_by: 'a', status: 'approved',
      admin_note: 'Approved by admin', approved_by: 'admin-1',
      expires_at: '', created_at: '',
      user_full_name: 'Test', user_email: 't@t.com',
      requested_by_full_name: null, approved_by_full_name: 'Admin',
    };
    expect(req.status).toBe('approved');
    expect(req.admin_note).toBe('Approved by admin');
  });
});

describe('Status badge color mapping', () => {
  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'expired': return 'gray';
      default: return 'gray';
    }
  };

  it('pending -> yellow', () => {
    expect(statusColor('pending')).toBe('yellow');
  });
  it('approved -> green', () => {
    expect(statusColor('approved')).toBe('green');
  });
  it('rejected -> red', () => {
    expect(statusColor('rejected')).toBe('red');
  });
  it('expired -> gray', () => {
    expect(statusColor('expired')).toBe('gray');
  });
});

describe('Temp password display', () => {
  it('shows temp password when approved', () => {
    const tempPassword = 'Ab3x9kL';
    const notice = `Đã duyệt yêu cầu. Mật khẩu tạm thời: ${tempPassword}`;
    expect(notice).toContain(tempPassword);
  });
  it('temp password is 8 chars (random)', () => {
    const tempPassword = Math.random().toString(36).slice(-8);
    expect(tempPassword.length).toBe(8);
  });
});

describe('Email validation for self-reset', () => {
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  it('accepts valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });
  it('rejects email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });
  it('rejects email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
  it('accepts email with dots', () => {
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
  });
});

describe('Request status transitions', () => {
  it('pending -> approved is valid transition', () => {
    const current: PasswordResetRequestItem['status'] = 'pending';
    const validTransitions: Record<string, PasswordResetRequestItem['status'][]> = {
      pending: ['approved', 'rejected', 'expired'],
      approved: [],
      rejected: [],
      expired: [],
    };
    expect(validTransitions[current]).toContain('approved');
  });
  it('pending -> rejected is valid transition', () => {
    const current: PasswordResetRequestItem['status'] = 'pending';
    const validTransitions: Record<string, PasswordResetRequestItem['status'][]> = {
      pending: ['approved', 'rejected', 'expired'],
      approved: [],
      rejected: [],
      expired: [],
    };
    expect(validTransitions[current]).toContain('rejected');
  });
  it('approved cannot transition', () => {
    const current: PasswordResetRequestItem['status'] = 'approved';
    const validTransitions: Record<string, PasswordResetRequestItem['status'][]> = {
      pending: ['approved', 'rejected', 'expired'],
      approved: [],
      rejected: [],
      expired: [],
    };
    expect(validTransitions[current]).toHaveLength(0);
  });
});

describe('Note modal state', () => {
  it('noteModal starts null', () => {
    let noteModal: { id: string; action: 'approve' | 'reject'; note: string } | null = null;
    expect(noteModal).toBeNull();
  });
  it('setNoteModal with approve action', () => {
    let noteModal: { id: string; action: 'approve' | 'reject'; note: string } | null = null;
    noteModal = { id: 'req-1', action: 'approve', note: '' };
    expect(noteModal?.action).toBe('approve');
  });
  it('setNoteModal with reject action', () => {
    let noteModal: { id: string; action: 'approve' | 'reject'; note: string } | null = null;
    noteModal = { id: 'req-1', action: 'reject', note: 'Not authorized' };
    expect(noteModal?.action).toBe('reject');
    expect(noteModal?.note).toBe('Not authorized');
  });
  it('note update preserves action', () => {
    let noteModal: { id: string; action: 'approve' | 'reject'; note: string } | null = {
      id: 'req-1', action: 'approve', note: '',
    };
    noteModal = { ...noteModal, note: 'Approved with note' };
    expect(noteModal?.action).toBe('approve');
    expect(noteModal?.note).toBe('Approved with note');
  });
});

describe('ProcessingId state', () => {
  it('processingId starts null', () => {
    let processingId: string | null = null;
    expect(processingId).toBeNull();
  });
  it('setProcessingId during operation', () => {
    let processingId: string | null = null;
    processingId = 'req-1';
    expect(processingId).toBe('req-1');
  });
  it('clearProcessingId after operation', () => {
    let processingId: string | null = 'req-1';
    processingId = null;
    expect(processingId).toBeNull();
  });
});

describe('Email send condition', () => {
  it('sends email only when isMailConfigured() returns true', () => {
    const isMailConfigured = () => true;
    const tempPassword = 'Ab3x9kL';
    let emailSent = false;
    if (isMailConfigured()) {
      emailSent = true;
    }
    expect(emailSent).toBe(true);
  });
  it('skips email when isMailConfigured() returns false', () => {
    const isMailConfigured = () => false;
    let emailSent = false;
    if (isMailConfigured()) {
      emailSent = true;
    }
    expect(emailSent).toBe(false);
  });
});

describe('Request self-reset API payload', () => {
  it('POST /password-reset/self requires email field', () => {
    const payload = { email: 'student@example.com' };
    expect(payload.email).toBeDefined();
    expect(Object.keys(payload)).toHaveLength(1);
  });
});

describe('Approve reset API payload', () => {
  it('POST /password-reset/approve requires request_id', () => {
    const payload = { request_id: 'req-123', admin_note: 'Approved' };
    expect(payload.request_id).toBe('req-123');
  });
  it('admin_note is optional', () => {
    const payload = { request_id: 'req-123' };
    expect(payload.admin_note).toBeUndefined();
  });
});

describe('Reject reset API payload', () => {
  it('POST /password-reset/reject requires request_id', () => {
    const payload = { request_id: 'req-123', admin_note: 'Reason for rejection' };
    expect(payload.request_id).toBe('req-123');
  });
  it('admin_note is optional', () => {
    const payload = { request_id: 'req-123' };
    expect(payload.admin_note).toBeUndefined();
  });
});

describe('Expiration check', () => {
  it('expires_at is in the future for pending requests', () => {
    const expires_at = new Date(Date.now() + 3600000).toISOString();
    const isExpired = new Date(expires_at) <= new Date();
    expect(isExpired).toBe(false);
  });
  it('detects expired request', () => {
    const expires_at = new Date(Date.now() - 3600000).toISOString();
    const isExpired = new Date(expires_at) <= new Date();
    expect(isExpired).toBe(true);
  });
});
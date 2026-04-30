# Contract BE - Integrity Events & Autosave (Exam)

Tài liệu này chuẩn hóa 2 endpoint FE đang gọi ở Phase 1:

- `POST /v1/exams/integrity-events`
- `POST /v1/exams/autosave`

Mục tiêu: BE có thể implement độc lập, FE vẫn chạy theo fail-safe queue/retry.

---

## 1. Nguyên tắc chung

- Tất cả endpoint yêu cầu `Authorization: Bearer <token>`.
- Role tối thiểu: `student`.
- Không trả về dữ liệu nhạy cảm (đáp án đúng, internal grading logic).
- Endpoint idempotent ở mức ứng dụng:
  - `integrity-events`: có thể nhận trùng, BE nên dedupe mềm theo `(session_id, event_type, client_at, payload_hash)`.
  - `autosave`: chỉ giữ snapshot mới nhất theo `(session_id, saved_at)`.
- Nếu không map được session/exam của user: trả `403` hoặc `404` tùy policy.

---

## 2. POST /v1/exams/integrity-events

### 2.1 Request body

```json
{
  "exam_id": "c8ab6d8f-8f55-4a85-a9e0-5f6d15e531a1",
  "events": [
    {
      "type": "fullscreen_enter",
      "at": "2026-04-15T08:22:11.123Z",
      "details": {
        "path": "/exam/c8ab6d8f-8f55-4a85-a9e0-5f6d15e531a1"
      }
    },
    {
      "type": "visibility_hidden",
      "at": "2026-04-15T08:23:05.010Z"
    }
  ]
}
```

### 2.2 Allowed `events[].type`

- `exam_opened`
- `fullscreen_enter`
- `fullscreen_exit`
- `visibility_hidden`
- `window_blur`
- `window_focus`
- `copy_attempt`
- `paste_attempt`
- `context_menu`
- `before_unload`

### 2.3 Validation

- `exam_id`: required, UUID.
- `events`: required, array, `1..200` items/request.
- `events[].type`: required, enum như trên.
- `events[].at`: required, ISO-8601 datetime.
- `events[].details`: optional, object, max 8KB/event.

### 2.4 Response

```json
{
  "success": true,
  "data": {
    "accepted": 2,
    "rejected": 0
  }
}
```

### 2.5 Error responses

- `400`: body không hợp lệ.
- `401`: thiếu/invalid token.
- `403`: token không thuộc exam/session hợp lệ.
- `413`: payload quá lớn.
- `429`: rate limit.
- `500`: lỗi server.

---

## 3. POST /v1/exams/autosave

### 3.1 Request body

```json
{
  "exam_id": "c8ab6d8f-8f55-4a85-a9e0-5f6d15e531a1",
  "saved_at": "2026-04-15T08:25:40.000Z",
  "answers": {
    "q1": "A",
    "q2": "B",
    "q5-b1": "lim",
    "q6": "Essay answer text..."
  }
}
```

### 3.2 Validation

- `exam_id`: required, UUID.
- `saved_at`: required, ISO-8601 datetime.
- `answers`: required, object, max 2MB JSON.
- Chỉ chấp nhận autosave khi session của student với exam đang ở trạng thái `active`.

### 3.3 Response

```json
{
  "success": true,
  "data": {
    "saved": true,
    "server_time": "2026-04-15T08:25:40.200Z"
  }
}
```

### 3.4 Error responses

- `400`: body không hợp lệ.
- `401`: thiếu/invalid token.
- `403`: không thuộc session/exam hợp lệ.
- `409`: session đã `submitted` hoặc `expired`.
- `413`: payload quá lớn.
- `429`: rate limit.
- `500`: lỗi server.

---

## 4. Mapping session

Khuyến nghị BE map từ `exam_id` + `user_id` token:

1. Tìm session mới nhất trạng thái `active` trong `exam_sessions`.
2. Nếu không có `active`, có thể fallback session mới nhất trong cửa sổ thời gian cho phép (tùy policy).
3. Nếu không tìm thấy thì reject `403/404`.

---

## 5. DB schema đề xuất

## 5.1 `exam_integrity_events`

```sql
CREATE TABLE IF NOT EXISTS exam_integrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  session_id UUID NULL REFERENCES exam_sessions(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  client_at TIMESTAMPTZ NOT NULL,
  server_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_exam_session
  ON exam_integrity_events (exam_id, session_id, student_id);

CREATE INDEX IF NOT EXISTS idx_integrity_event_time
  ON exam_integrity_events (event_type, server_at DESC);
```

Optional check constraint:

```sql
ALTER TABLE exam_integrity_events
  ADD CONSTRAINT exam_integrity_events_type_check
  CHECK (event_type IN (
    'exam_opened',
    'fullscreen_enter',
    'fullscreen_exit',
    'visibility_hidden',
    'window_blur',
    'window_focus',
    'copy_attempt',
    'paste_attempt',
    'context_menu',
    'before_unload'
  ));
```

## 5.2 `exam_session_autosaves`

```sql
CREATE TABLE IF NOT EXISTS exam_session_autosaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL,
  answers JSONB NOT NULL,
  server_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autosave_session_saved_at
  ON exam_session_autosaves (session_id, saved_at DESC);
```

### Tối ưu lưu trữ (khuyến nghị)

- Chỉ giữ N snapshot mới nhất mỗi `session_id` (ví dụ N=20).
- Hoặc chỉ giữ 1 bản mới nhất bằng upsert:
  - unique `(session_id)`
  - cập nhật `saved_at`, `answers`, `server_at`.

---

## 6. Pseudo flow BE

### 6.1 Integrity endpoint

1. Auth + role student.
2. Validate body + enum.
3. Resolve session active theo `exam_id` và `student_id`.
4. Bulk insert events (chunk 100-200).
5. Return `{ accepted, rejected }`.

### 6.2 Autosave endpoint

1. Auth + role student.
2. Validate body.
3. Resolve session active.
4. Upsert snapshot mới nhất hoặc insert log snapshot.
5. Return `saved: true`.

---

## 7. Backward compatibility với FE hiện tại

FE hiện gửi đúng shape sau:

- Integrity:
  - top-level `exam_id`, `events[]`
  - mỗi event có `type`, `at`, `details?`
- Autosave:
  - `exam_id`, `saved_at`, `answers`

Vì FE đang queue/retry local, BE có thể triển khai muộn mà không làm gãy UX.

---

## 8. Mở rộng giai đoạn sau

- Thêm event `network_offline`, `network_online`, `devtools_detected` (nếu cần).
- Gắn `risk_score` cho từng event hoặc session.
- Stream realtime qua Socket.IO song song với REST (không thay thế REST).
- Aggregate materialized view cho dashboard giám sát giảng viên.

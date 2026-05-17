# Test Plan: Tasks 1, 2, 7 — Timer Persistence + Proctoring

## Files Changed

| File | What changed |
|------|-------------|
| `src/db/migrations/018_proctoring_enhancements.sql` | **NEW** — `exam_proctor_presence` + `exam_proctor_logs` tables |
| `src/models/examProctor.model.ts` | **NEW** — presence + proctor log CRUD |
| `src/models/examIntegrity.model.ts` | Fixed column name `event_at` → `client_at` in INSERT |
| `src/models/examRuntimeState.model.ts` | Added `getRuntimeStateByExam()` |
| `src/socket/examSocket.ts` | DB presence tracking on join/leave; IP/UA logged; `restoreExamRuntimesOnStartup()` exported |
| `src/server.ts` | Calls `restoreExamRuntimesOnStartup(io)` after socket registration |
| `src/services/exam.service.ts` | `StartSessionPayload` now includes `runtime_state: {started_at, ends_at, is_active} \| null` |
| `src/controllers/exam.controller.ts` | Added `getIntegrityEventsController`, `getProctorPresenceController`, `getProctorLogsController` |
| `src/routes/v1/examRouter.ts` | Added 3 new routes: `GET /:examId/integrity-events`, `GET /:examId/presence`, `GET /:examId/proctor-logs` |

---

## Pre-requisites

Run migration on your DB:
```bash
cd BackEnd/server
npm run migrate
```
Or manually execute `src/db/migrations/018_proctoring_enhancements.sql`.

---

## Task 1: Timer State Persistence

### T1-1: Teacher starts exam → runtime saved to DB
1. Login as teacher, open an exam
2. Call `POST /v1/exams/:examId/start-runtime`
3. Query: `SELECT * FROM exam_runtime_state WHERE exam_id = '<id>'`
   - `is_active = true`, `started_at` and `ends_at` set, `duration_min` correct

### T1-2: Student joins → receives current runtime state
1. Login as student, call `POST /v1/exams/:examId/sessions`
2. Response includes `runtime_state` (non-null if teacher started)
3. Response includes `deadline_at` (absolute time)

### T1-3: Server restart → runtime restored
1. Start backend, leave an exam in "started" state (active runtime in DB)
2. Restart backend server (`npm run dev` again)
3. Check server logs: `[restore] exam <id> restored, <N> min remaining`
4. Student who joins the exam should receive correct `runtime_state` from DB

---

## Task 2: Proctoring Presence + Violation Log + Broadcast

### T2-1: Student joins → presence tracked in DB
1. Student connects via Socket.IO and emits `exam:join { examId }`
2. Query: `SELECT * FROM exam_proctor_presence WHERE exam_id = '<id>' AND disconnected_at IS NULL`
   - Row exists with correct `student_id`, `socket_id`, `ip_address`, `user_agent`

### T2-2: Student disconnects → presence marked disconnected
1. Student disconnects (close tab/browser)
2. Query same table — `disconnected_at` is now set for that student

### T2-3: Teacher calls presence endpoint
- `GET /v1/exams/:examId/presence` (as teacher/admin)
- Response: array of students with `student_name`, `student_email`, `joined_at`, `ip_address`

### T2-4: Teacher calls integrity events endpoint
- `GET /v1/exams/:examId/integrity-events` (as teacher/admin)
- Response: all violation events for the exam, ordered by time

### T2-5: Teacher broadcasts warning to room
- Emit socket event `exam:proctor_alert { examId, message }` (as teacher)
- All students in `exam:<id>` room receive `exam:alert` event

### T2-6: Teacher broadcasts to group
- Emit socket event `proctor:broadcast_group { examId, group: 'all', message }`
- All in room receive `proctor:group_alert`

---

## Task 7: Proctoring Advanced — Screenshot / Webcam / IP / Prolog Logs

### T7-1: Student join logs ip_address_change event
1. Student emits `exam:join { examId }`
2. Query: `SELECT * FROM exam_proctor_logs WHERE exam_id = '<id>' AND event_type = 'ip_address_change'`
   - Row exists with correct `ip_address`, `user_agent`, `student_id`

### T7-2: Teacher calls proctor logs endpoint
- `GET /v1/exams/:examId/proctor-logs` (as teacher/admin)
- Response: list of advanced proctor events (screenshot, ip_change, tab_switch, etc.)
- Supports `?limit=N&offset=N` pagination

### T7-3: FE screenshots (TODO — Frontend)
- Frontend should implement screenshot capture using `mediaDevices.getDisplayMedia()`
- On screenshot, emit `proctor:log_event { examId, eventType: 'screenshot', screenshotUrl: '<cloudinary-url>', metadata: {...} }`
- Backend stores in `exam_proctor_logs` with `screenshot_url`
- **TODO**: Implement in `examIntegrityClient.ts` and `ExamView`

---

## TODO (Frontend, not covered by this BE implementation)
1. **FE screenshot capture**: `getDisplayMedia()` → upload to Cloudinary → emit `proctor:log_event`
2. **FE webcam capture**: `mediaDevices.getUserMedia()` → periodic frame capture → emit `proctor:log_event { eventType: 'webcam_capture' }`
3. **FE proctor:ping**: student client periodically emits `proctor:ping { examId }` to keep presence alive (every 30s)
4. **FE proctor:log_event**: emit advanced events (tab_switch, devtools_open, console_open) when detected

---

## Backward Compatibility
- `exam_integrity_events.client_at` was previously called `event_at` in queries — fixed to `client_at` matching the actual DB column
- `StartSessionPayload` new `runtime_state` field is nullable — old FE won't break
- All existing behavior (exam:join, exam:start, proctor:join) unchanged
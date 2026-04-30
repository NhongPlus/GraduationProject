# Tổng quan dự án và lộ trình phát triển (Bản tiếng Việt)

Cập nhật: 2026-04-15  
Mục tiêu tài liệu: Góc nhìn PM công nghệ (10 năm kinh nghiệm) để theo dõi toàn cảnh dự án và định hướng phát triển tiếp theo.

---

## 1) Tóm tắt điều hành

Dự án hiện đã đạt mức **MVP có thể demo trọn luồng chính**:

- Đăng nhập, phân quyền, dashboard, danh sách bài thi.
- Màn làm bài có nhiều dạng câu hỏi (trắc nghiệm, audio, image, điền khuyết, tự luận, dạng tổng hợp video).
- Backend có đầy đủ nền tảng auth/user/exam/session/grading.
- Realtime đã đưa vào lúc thi (teacher start exam, trạng thái bài thi, cảnh báo 15 phút cuối, force submit theo tín hiệu server).
- Đã có lớp anti-cheat FE: fullscreen bắt buộc, theo dõi alt-tab/focus/tab hidden, ghi log integrity + autosave queue/retry.

Tuy nhiên, để lên production ổn định, cần tập trung 4 trụ cột:

1. **Chuẩn hóa contract FE-BE** (tránh lệch field/type/shape response).
2. **Server-authoritative exam runtime** (timer và kết thúc bài do server quyết định).
3. **Tự động hóa QA + quality gate CI/CD**.
4. **Vận hành, bảo mật, tuân thủ dữ liệu**.

---

## 2) Bức tranh tổng thể hệ thống

## 2.1 Frontend

- Công nghệ: React + TypeScript + Vite + Mantine + SCSS.
- Kiến trúc: `pages/components/services/configs/hooks/locales`.
- Routing có phân tách public/protected/authority.
- Màn thi đã đi theo hướng module hóa (question panel, navigator, header, autosave/integrity/realtime service).

## 2.2 Backend

- Công nghệ: Node.js + TypeScript + Express + PostgreSQL + Socket.IO.
- Kiến trúc: `routes -> controllers -> services -> models -> db`.
- Có JWT auth, RBAC middleware, error handler chuẩn.
- Socket.IO chạy cùng HTTP server với handshake JWT.

## 2.3 Dữ liệu

- Domain chính: accounts, exams, questions, exam_sessions, grading.
- Đã có bảng cho integrity/autosave.
- Cần tiếp tục chuẩn hóa migration để dựng môi trường từ đầu nhất quán.

---

## 3) Trạng thái theo module

## 3.1 Auth & phân quyền

**Đã có**
- Đăng nhập JWT.
- Role-based routing ở FE và role middleware ở BE.

**Cần hoàn thiện**
- Chính sách session rõ ràng hơn (timeout, refresh/revoke).
- Hardening secret và chính sách bảo mật môi trường.

## 3.2 Quản lý đề thi / câu hỏi

**Đã có**
- CRUD exam.
- CRUD question (mcq, essay).
- Grading essay cơ bản.

**Cần hoàn thiện**
- Chuẩn hóa model để map được đầy đủ loại câu hỏi mới trên FE.
- Quy trình publish/lock đề thi.

## 3.3 Runtime lúc thi

**Đã có**
- Fullscreen gate bắt buộc.
- Tracking hành vi rời màn hình.
- Cơ chế khóa bài + auto submit FE khi vi phạm.
- Realtime: teacher start, trạng thái, cảnh báo 15 phút cuối, force submit event.
- Autosave local + queue retry.

**Cần hoàn thiện**
- Timer theo server 100% (không phụ thuộc timer local).
- Force submit “thật” qua API submit session backend.
- Resume/reconnect ổn định khi mạng chập chờn.

## 3.4 Realtime / Socket

**Đã có**
- Join room theo exam.
- Teacher/admin phát lệnh start exam.
- Broadcast alert theo room.
- Kịch bản test giả lập nhiều student.

**Cần hoàn thiện**
- Presence dashboard cho teacher.
- ACK/retry cho sự kiện quan trọng.
- Chuẩn hóa version event và monitoring realtime.

## 3.5 Chất lượng / phát hành

**Đã có**
- Build/lint cho phần vừa nâng cấp pass.

**Cần hoàn thiện**
- Bộ test tự động (unit/integration/e2e) cho luồng thi.
- CI gate bắt buộc trước merge.
- Checklist release + rollback.

---

## 4) Đánh giá mức sẵn sàng

- **Sẵn sàng demo:** Cao.
- **Sẵn sàng production:** Trung bình.

### Rủi ro ưu tiên cao

1. Lệch contract FE-BE gây lỗi runtime.
2. Timer chưa hoàn toàn server-authoritative.
3. Thiếu test hồi quy cho flow thi realtime/anti-cheat.
4. Migration chưa đủ “from zero reproducible”.
5. Thiếu observability và runbook sự cố.

---

## 5) Lộ trình đề xuất (12 tuần)

## Phase 1 (Tuần 1-2): Ổn định contract và core exam

- Chốt OpenAPI/DTO cho exam/session/integrity/autosave.
- Dọn mismatch field/hàm giữa FE và BE.
- Chốt API submit cuối cùng cho force-submit server.

## Phase 2 (Tuần 3-5): Hardening runtime realtime

- Timer do server quyết định.
- Reconnect/resume policy.
- Rule vi phạm có cấu hình (soft warning / hard lock / auto submit).

## Phase 3 (Tuần 6-8): QA automation và quality gate

- BE integration test cho auth/exam/grading.
- FE e2e cho fullscreen + realtime + submit.
- CI: lint + typecheck + test + build.

## Phase 4 (Tuần 9-10): Bảo mật, compliance, vận hành

- Secret management, rate limit, audit log.
- Monitoring dashboard + alerting.
- Chính sách retention dữ liệu và privacy flow.

## Phase 5 (Tuần 11-12): Pilot và go-live

- UAT với nhóm thật.
- Load test theo target concurrency.
- Drill rollback và playbook xử lý sự cố.

---

## 6) Kế hoạch 3 sprint gần nhất (hành động cụ thể)

## Sprint A

- Hoàn tất force-submit backend khi nhận event hết giờ.
- Chốt policy vi phạm cuối cùng.
- Hoàn thiện endpoint teacher start exam theo cả REST + Socket.

## Sprint B

- E2E test luồng thi đầy đủ.
- Presence theo phòng thi.
- Queue reliability (retry strategy + dead-letter).

## Sprint C

- Dashboard phân tích vi phạm và hành vi làm bài.
- Tối ưu hiệu năng socket + index DB.
- Đóng gói release train ổn định theo tuần.

---

## 7) KPI theo dõi dự án

- Tỷ lệ submit thành công >= 99.5%.
- Tỷ lệ mất dữ liệu bài làm ~ 0%.
- Tỷ lệ reconnect thành công < 10s >= 98%.
- Độ lệch đồng hồ client-server <= 2s (P95).
- Tỷ lệ event integrity ghi nhận đầy đủ >= 99%.

---

## 8) Mô hình đội ngũ đề xuất

- 1 PM/PO.
- 1 Tech Lead fullstack.
- 2 FE dev.
- 2 BE dev.
- 1 QA automation.
- 1 DevOps part-time.

---

## 9) Definition of Done (đề xuất bắt buộc)

Một hạng mục được xem là “xong” khi đạt đủ:

- Code pass lint/typecheck/build.
- Có test tương ứng (ít nhất smoke + regression cho luồng liên quan).
- Có cập nhật docs API/flow nếu thay đổi contract.
- Có logging/monitoring hooks nếu là tính năng runtime quan trọng.
- Có kế hoạch rollback khi deploy production.

---

## 10) Kế hoạch go-live tối thiểu

Trước go-live bắt buộc:

- Chạy UAT checklist cho luồng thi chính.
- Chạy load test với profile gần thực tế.
- Kiểm tra migration trên staging.
- Kiểm tra alerting hoạt động.
- Chốt runbook sự cố (đứt socket, DB latency cao, token lỗi hàng loạt).

---

## 11) Quyết định PM cần chốt ngay (48 giờ)

1. Rule xử phạt vi phạm cụ thể (ngưỡng và hành vi nào khóa bài).
2. Mô hình timer server-authoritative cuối cùng.
3. Mức coverage test tối thiểu để cho phép release.
4. Phạm vi pilot (số lớp/số user/thời lượng).

---

## 12) Kết luận

Dự án đang đi đúng hướng và đã vượt qua giai đoạn “prototype UI”. Trọng tâm tiếp theo không chỉ là thêm tính năng, mà là nâng độ tin cậy hệ thống ở mức production: **contract đúng, runtime chắc, test sâu, vận hành an toàn**.

Nếu chỉ chọn 1 ưu tiên trong 2 tuần tới:

**Hoàn tất timer server-authoritative + force-submit backend thật + e2e exam runtime.**


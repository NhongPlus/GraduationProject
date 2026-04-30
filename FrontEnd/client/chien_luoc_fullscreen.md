Báo cáo phân tích yêu cầu kỹ thuật – Hệ thống thi online chế độ Toàn màn hình
Executive Summary: Để đảm bảo tính toàn vẹn khi thi trực tuyến, hệ thống phải ép trình duyệt vào chế độ toàn màn hình, giám sát hành vi người thi và lưu trữ an toàn dữ liệu. Ở frontend, cần sử dụng Fullscreen API để yêu cầu toàn màn hình khi bắt đầu thi, kèm theo các cơ chế theo dõi chuyển tab, từ chối hoặc thoát toàn màn hình, bắt sự kiện visibilitychange/blur/focus để phát hiện điều hướng, đồng thời chặn các thao tác copy/paste hoặc inspect không cần thiết. Backend sẽ đảm nhiệm xác thực (token/session), lưu trữ và xử lý đồng bộ thời gian thi (không tin cậy client), ghi log sự kiện gian lận, bảo vệ session/token, autosave dữ liệu, mã hóa và tuân thủ các quy định bảo mật (GDPR/PDPA). Giải pháp chống gian lận sẽ kết hợp WebSocket (gửi log real-time), proctoring (chụp hình ngẫu nhiên), và các thuật toán nhận diện. Chúng tôi đề xuất kiến trúc client-server gồm ứng dụng React (frontend) và Node.js (backend) với database (ví dụ Redis cho timer, DB quan hệ cho log/answers). Dưới đây là phân tích chi tiết chức năng, luồng dữ liệu, so sánh công nghệ và checklist triển khai cho frontend/backend.

1. Yêu cầu chức năng Fullscreen và rủi ro
Chức năng yêu cầu Fullscreen: Khi người dùng nhấn “Bắt đầu thi”, frontend gọi element.requestFullscreen() (MDN) để bật chế độ toàn màn hình
. Chế độ này loại bỏ các thanh công cụ và tab khác, “giúp thí sinh tập trung hoàn toàn vào nội dung đề thi”
. Ví dụ, như khi xem video, trang web hiển thị chỉ video tràn màn hình (không hiển thị tab/browsers). Fullscreen phải được gọi từ trong sự kiện của người dùng (nhấn nút)
, nếu không sẽ bị trình duyệt chặn.

Trường hợp từ chối/thoát Fullscreen: Người dùng có thể nhấn Esc hoặc F11, hoặc alt+Tab chuyển ứng dụng làm cấm trình duyệt thoát fullscreen
. Khi đó, sự kiện fullscreenchange sẽ bật lên
. Ứng dụng cần bắt document.fullscreenElement; nếu giá trị null tức user đã ra khỏi fullscreen, cần thông báo hoặc tạm dừng thi và ghi log vi phạm. Nếu requestFullscreen() thất bại (ví dụ do iframe không cho phép), ta bắt fullscreenerror
 để thông báo cho người dùng (ví dụ: “Trình duyệt không hỗ trợ toàn màn hình. Vui lòng thử ở thiết bị khác”). Trong UX, cần thông báo rõ ràng: “Bạn phải bật chế độ toàn màn hình để làm bài. Vui lòng bấm Đồng ý” hoặc “Nếu bạn thoát fullscreen, bài thi sẽ bị tạm dừng hoặc ghi nhận vi phạm”.

Rủi ro & UX: Ép buộc fullscreen có thể gây khó chịu với một số người dùng (ví dụ không quen, đang chạy background apps). Cần có hướng dẫn ngắn gọn kiểu: “Để tránh gian lận, chúng tôi yêu cầu bạn bật chế độ toàn màn hình trước khi thi. Hãy bấm OK.” Nếu user không muốn, thì không thể làm bài. Khi user cố tình thoát fullscreen, hệ thống ghi nhận là “nguy cơ gian lận” (log), và có thể hiển thị cảnh báo. Tuy nhiên, do trình duyệt không cho phép ngăn hoàn toàn, nên “cho thoát mà vẫn ghi log” là cách hợp lý. Talview ghi nhận full screen “giảm gián đoạn chuyển tab và tạo môi trường tập trung”
.

2. Frontend – API & best practices
Fullscreen API (MDN): Gọi element.requestFullscreen() (thường là document.documentElement.requestFullscreen()) để vào full screen
. Ví dụ React:

jsx
Sao chép
const enterFullScreen = () => {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch(err => console.error('Yêu cầu fullscreen thất bại', err));
  }
};
// Gắn vào nút Start Exam: <button onClick={enterFullScreen}>Bắt đầu thi</button>
Sau khi vào fullscreen thành công, trình duyệt kích hoạt sự kiện fullscreenchange
. Ngược lại, khi user nhấn Esc hoặc ra khỏi, cũng kích hoạt fullscreenchange. Đoạn code ví dụ:

js
Sao chép
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    console.log('Đã vào fullscreen:', document.fullscreenElement.id);
  } else {
    console.warn('User đã thoát full screen');
    // Ví dụ: khoá bài, yêu cầu vào lại full screen
  }
});
Page Visibility API: Để phát hiện khi user chuyển tab hoặc thu nhỏ cửa sổ, dùng sự kiện visibilitychange
. Khi tab bị ẩn (user bấm sang tab khác hoặc alt+Tab), document.visibilityState === "hidden". Ví dụ:

js
Sao chép
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Chuyển tab hoặc ẩn màn hình');
    socket.send(JSON.stringify({type: 'blur'}));
  }
});
Phương thức này ổn định và hỗ trợ hầu hết trình duyệt. Ngoài ra có thể dùng window.onblur/focus để bắt mất focus (nhưng page visibility là đáng tin cậy hơn
). Ví dụ: nếu user rời màn hình, frontend ghi log gửi backend qua WebSocket để đánh dấu “user out-of-focus”.

Xử lý copy/paste và context menu: Có thể vô hiệu chuột phải, copy/paste trên trang thi bằng cách ngăn sự kiện:

js
Sao chép
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('copy', e => e.preventDefault());
document.addEventListener('paste', e => e.preventDefault());
Nhưng đây chỉ là giải pháp bề mặt (người dùng có thể tắt script hoặc dùng phím tắt hệ thống). Do đó, không nên tin tưởng tuyệt đối; mục đích chính là “ghi nhận sự kiện copy/paste”
 để báo cáo, chứ không thể hoàn toàn cấm. Chặn screenshot không khả thi trên web, vì hệ điều hành cho phép chụp màn hình bằng phím Print Screen. Giới hạn: chỉ có thể yêu cầu thi trong môi trường “trình duyệt an toàn” (secure browser) hay cài phần mềm hỗ trợ chuyên biệt mới chặn được chụp màn hình, nhưng đó vượt khuôn khổ web tiêu chuẩn.

Chặn reload/inspect/console: Có thể dùng window.onbeforeunload để cảnh báo khi user cố tải lại trang:

js
Sao chép
window.addEventListener('beforeunload', (e) => {
  e.preventDefault();
  e.returnValue = "Bạn có chắc muốn rời trang? Bài thi sẽ kết thúc.";
});
Tuy nhiên, người dùng vẫn có thể reload hoặc mở devtools. Một số script cố gắng phát hiện devtools (bằng cách đo kích thước cửa sổ)
, nhưng đây là các biện pháp dễ bị qua mặt. Nhìn chung, không thể ngăn hoàn toàn việc xem console hay debug; có thể chỉ log sự kiện if bị phát hiện.

Xử lý tab/Alt+Tab/focus: Như trên, alt+Tab sẽ làm cài vị trí active của cửa sổ thay đổi, gây exit fullscreen
 và trigger visibilitychange. Ví dụ khi document.hidden === true hoặc document.fullscreenElement === null, ta xác định user đã rời giao diện thi. Ở đây, workflow điển hình là:

Hiển thị cảnh báo “Vui lòng quay lại toàn màn hình” hoặc tạm dừng đồng hồ nếu user chưa quay lại.
Ghi log vi phạm. Các công cụ proctoring thường đánh dấu “focus change” như hành vi đáng ngờ
.
Heartbeats (kiểm tra kết nối): Dùng WebSocket để duy trì kết nối real-time với server (Node.js). Định kỳ gửi ping/pong để kiểm tra trạng thái kết nối. Ví dụ:

js
Sao chép
const ws = new WebSocket('wss://example.com/exam');
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({type: 'ping', time: Date.now()}));
  }
}, 30000);
ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'pong') {
    // server trả lời là ok
  }
});
Server có thể trả pong hoặc đo lường để cảnh báo nếu mất kết nối. Ngoài ra, có thể dùng navigator.sendBeacon để gửi dữ liệu cuối cùng khi tab bị đóng (nhưng hỗ trợ hạn chế).

Autosave câu trả lời: React có thể lưu câu trả lời vào state, và định kỳ gọi API backend để lưu (ví dụ fetch('/autosave', {...})). Trong React:

js
Sao chép
useEffect(() => {
  const timer = setInterval(() => {
    axios.post('/autosave', { answer: currentAnswer, questionId })
         .catch(err => console.error('Lưu tự động thất bại', err));
  }, 5000); // mỗi 5s
  return () => clearInterval(timer);
}, [currentAnswer]);
Khi mất mạng, lưu vào localStorage hoặc IndexedDB tạm. Sau khi kết nối lại, đồng bộ lên server. ThinkExam khuyến nghị nên hỗ trợ offline để “thi tiếp tục và tự động sync khi có mạng lại”
.

MediaDevices (webcam, mic): Nếu có yêu cầu chụp ảnh hoặc quay video giám sát, dùng navigator.mediaDevices.getUserMedia({video: true, audio: true})
 để lấy luồng camera. Tuy nhiên, người dùng phải cấp quyền; nếu từ chối, không thể quay. Data camera nên gửi mã hóa (ví dụ gửi qua WebRTC hoặc WebSocket qua HTTPS). MediaDevices chỉ chạy trên HTTPS và cần xử lý lỗi NotAllowedError nếu user không cho phép
. Mở rộng: nếu dùng WebRTC để livestream video/threat detection, cần STUN/TURN.

Service Worker / Offline: Dùng Service Worker để cache trang thi, hỗ trợ làm việc offline (đến mức có thể). Ví dụ, cài SW để lưu request/response cho autosave khi mất mạng, sau đó sync khi lên. Tuy nhiên, SW không thể can thiệp vào WebSocket; việc offline chủ yếu là lưu tạm vào IndexedDB/LocalStorage.

3. Backend – yêu cầu và chức năng
Xác thực & bảo vệ phiên: Khi user đăng nhập và bắt đầu thi, backend phát sinh session/token (ví dụ JWT có mã hoá) để xác thực mọi yêu cầu sau. Token này gắn với bài thi và hết hạn sau giờ thi. Tất cả API (log, autosave, submit) cần kiểm tra token validity. Nếu token không hợp lệ hoặc hết hạn, trả lỗi (không cho làm tiếp). Ví dụ: JWT RS256 hoặc sessions lưu trên Redis.

Đồng bộ thời gian thi: Không tin cậy bộ đếm đồng hồ client (dễ bị gian lận). Thiết lập thời gian thi bắt đầu do server cung cấp. Ví dụ, khi user nhấn “Bắt đầu thi”, backend lưu phiên thi với TTL (expiry) bằng thời lượng thi
. Redis là lựa chọn tốt: tạo key exam:{userId}:{examId} với TTL = 3600s (1 giờ)
. Mỗi lần client hỏi remaining time, server trả TTL của key (không tin cậy thời gian client). Phương pháp này bảo đảm “thời gian thi hoàn toàn thuộc server”
 và “không cần tin tưởng client” (kể cả nếu client cố gắn chương hay sửa code).

Đồng hồ đếm ngược và kiểm tra nộp: Backend có thể gửi thời gian còn lại qua WebSocket (pub/sub) để client hiện countdown chuẩn xác
. Khi user nộp bài, backend kiểm tra key TTL còn tồn tại (chưa hết hạn). Nếu key đã hết hoặc token không đúng, từ chối nộp.

Ghi log sự kiện: Tất cả sự kiện nghi ngờ (thoát fullscreen, chuyển tab, copy/paste, focus change, reload, camera lỗi) đều được gửi về server và lưu vào cơ sở dữ liệu (log table hoặc NoSQL). Ví dụ, tạo bảng event_logs (userId, examId, timestamp, eventType, details). Thiết kế schema để dễ truy vấn sau. Có thể dùng ElasticSearch/ELK nếu cần phân tích nhanh. Xem xét lưu ở mức cấu trúc JSON nếu nhiều loại. Kết hợp người giám sát (hoặc AI) để đánh giá, nhưng tối thiểu backend phải giữ “bằng chứng” hàng chuỗi sự kiện (ví dụ, theo dõi b0=focus change, b3=thoát fullscreen như hệ thống Supervisor SDK
).

Bảo vệ token/session: Dùng HTTPS/TLS bắt buộc, không gửi token qua URL. Có thể dùng SameSite cookie để hạn chế cross-site. Giới hạn thời gian phiên: hết giờ thi hoặc sau một khoảng không hoạt động nhất định, tự động thoát. Refresh token nếu cần, hoặc đơn giản là token ngắn hạn.

Chống reload: Back-end không có cách ngăn client reload, nhưng có thể phát hiện (user nạp lại trang) dựa vào event beforeunload. Khi client tải lại hoặc mở lại, nếu token còn hạn, có thể tiếp tục, nhưng nếu cố tình tải lại nhiều lần (Event count qua logs), backend có thể đánh giá là gian lận.

Lưu autosave: Backend phải có API nhận lưu trữ câu trả lời interim. Ví dụ endpoint /api/autosave (POST) lưu answer vào DB theo exam_session_id. Cần mã hoá khi lưu (phụ thuộc luật). Cần đảm bảo khi kết nối lại, không bị mất dữ liệu đã lưu gần đây nhất.

Xử lý mạng gián đoạn (Resume): Khi mất mạng, frontend tự động chuyển sang chế độ offline-safe. Khi kết nối lại, tự động đăng nhập (dùng token đã cấp), gửi tất cả dữ liệu chưa sync (Ví dụ dùng background sync hoặc gửi lại ở lần autosave kế tiếp). Backend khi nhận request sau sẽ kiểm tra timestamp để chấp nhận (phải từ trước giờ kết thúc). Ví dụ: on visibility change or online ở client có thể gửi lệnh sync.

Mã hóa dữ liệu: Luôn dùng HTTPS cho mọi request. Trên server, mã hoá token (JWT) và có thể mã hoá dữ liệu cá nhân (ví dụ ảnh mặt hay giọng nói) trước khi lưu hoặc truyền. Nói chung, tuân thủ nguyên tắc “data in transit & at rest encrypted”
. Ví dụ, dùng AES để mã hoá trường thông tin nhạy cảm trong DB, dùng https và wss.

Hiệu năng & scale: Giả sử nhiều thí sinh cùng thi, cần cân bằng tải. Dùng load balancer phía trước nhiều instance Node.js. Đưa session và state (Redis, DB) ra dịch vụ riêng, tránh dùng bộ nhớ đơn thực thể. Sử dụng WebSocket: có thể dùng Redis Pub/Sub để broadcast (horizontal scale). Dự phòng: đo lường latency, load test (JMeter/k6). Xem xét giới hạn số bản ghi log để DB không quá nặng – có thể lưu dưới dạng JSON hoặc chuyển log off-line (BigQuery) sau kỳ thi. Dùng CDN phục vụ static (React build).

Monitoring/Alerting: Giám sát API (Prometheus+Grafana): thời gian phản hồi, lỗi 5xx, tỷ lệ kết nối WebSocket. Theo dõi số lượng event lạ (báo cáo gian lận quá mức): ví dụ nếu 1 user thoát fullscreen >5 lần, kích hoạt cảnh báo. Gửi email/SMS alert cho admin nếu có sự cố server (outage), hoặc pattern gian lận bất thường. Log cấu trúc (ELK) dễ set alert (ví dụ Logstash, Kibana).

Tuân thủ pháp lý (GDPR/PDPA): Dữ liệu người thi (ID, ảnh, giọng nói, IP, nhật ký) là dữ liệu cá nhân nhạy cảm, phải tuân GDPR (EU) và PDPA (VN). Cần:

Xác nhận quyền thu thập: Trước khi kích hoạt webcam/mic, phải xin phép rõ ràng (popup xin quyền), và giải thích “dữ liệu chỉ dùng cho kiểm tra”, minh bạch mục đích
.
Mức độ dữ liệu tối thiểu: Chỉ thu thập thông tin cần thiết (ví dụ chỉ ảnh mặt chứ không ghi video nhà riêng). Nên ưu tiên SSO qua nền tảng (LMS) để hạn chế lưu mật khẩu người dùng
.
Chính sách lưu trữ: Lưu log sự kiện, ảnh hoặc video cần có thời hạn rõ ràng, xóa sau kỳ thi
. Ví dụ, thông báo cho thí sinh biết “video sẽ bị xóa sau 30 ngày”.
Bảo mật dữ liệu: Mọi dữ liệu phải mã hoá mạnh, hạn chế quyền truy cập (chỉ admin, proctor liên quan mới xem được)
. Áp dụng phân quyền (role-based access) cho dashboard xem log.
Lưu ý PDPA VN: Tương tự GDPR, Luật bảo vệ dữ liệu cá nhân VN (PDPL) yêu cầu thông báo rõ mục đích thu thập, quyền người dùng xem/xóa dữ liệu. Cần hiển thị cam kết chính sách riêng tư trước khi thi (ví dụ check “Tôi đồng ý…”).
4. Giải pháp chống gian lận tích hợp Frontend-Fullscreen
WebSocket & Logging real-time: Dùng kết nối WebSocket giữa client-server để gửi mọi sự kiện nghi vấn ngay lập tức (fullscreen change, visibilitychange, copy/paste, focus out, camera lost, lạ, v.v). Ví dụ, mỗi khi visibilitychange xảy ra, client gửi

json
Sao chép
{ "type": "event", "event": "visibilityhidden", "time": 1616171230000 }
Server lưu log và có thể “có flag” nếu vượt ngưỡng. Cách này giống với các SDK proctoring: họ gửi mã “b2: focus change, b3: exit fullscreen” cho backend
. Tuyệt đối phải ghi lại để sau này dễ xem review (Integrity Log).

WebRTC và Media Capture: Nếu cho phép quay video màn hình (screen) hoặc camera, có thể dùng WebRTC. Ví dụ, sử dụng MediaDevices.getUserMedia để stream webcam, getDisplayMedia để stream screen share. Tuy nhiên, getDisplayMedia cần người dùng bấm cho phép từng lần share màn hình
 (rất phiền phức, và thường không dùng cho phòng thi, vì người thi có thể share video trống). WebRTC phức tạp hơn (cần máy chủ STUN/TURN); thường proctoring third-party mới xử lý. Nếu chỉ dùng video camera, có thể chụp định kỳ (MediaStream Recording) và gửi server. Lưu ý quyền riêng tư như trên (cần consent và mã hoá).

Proctoring services (bên thứ ba): Có thể cân nhắc tích hợp dịch vụ giám thị (Proctorio, Honorlock…). Ưu điểm: cung cấp AI/thuật toán nhận diện khuôn mặt, giọng nói, theo dõi mắt, phát hiện nhiều màn hình, v.v. Nhược: phí, không kiểm soát mã nguồn, ràng buộc bản quyền. Bảng so sánh phía dưới sẽ phân tích kỹ.

Giới hạn kỹ thuật: Cần nhận thức rằng “client-side monitoring chỉ làm tăng ‘chi phí gian lận’, không tuyệt đối ngăn được”
. Các biện pháp như ngăn inspect hay chặn phím đều có thể bị qua mặt. Ví dụ, script có thể dùng nhiều event listener để tránh bị ngăn lệnh (browser cho phép điều này)
. Thế nên, một trade-off quan trọng là giữa an toàn và phải chấp nhận false positives. Không thể yêu cầu user cắm máy ghi âm và camera suốt 8 giờ – cần chọn lọc.

5. Checklist triển khai
Frontend:

 Xây dựng nút “Bắt đầu thi” gọi requestFullscreen() trong onClick.
 Bắt fullscreenchange để xử lý khi vào/ra full screen (thông báo lỗi hoặc dừng thi nếu ra).
 Bắt sự kiện visibilitychange (Tab ẩn hiện) và window.onblur/onfocus – khi ẩn, gửi log 'leave_focus'.
 Cài onbeforeunload để confirm khi reload/close trang (tạm pause bài thi).
 Chặn contextmenu, copy, paste trên trang thi (đừng quên nhắc user gõ thủ công).
 Kết nối WebSocket với server, gửi “heartbeat” (ping) và các sự kiện giám sát ngay khi xảy ra.
 Cài đặt MediaDevices.getUserMedia nếu cần chụp hình, kiểm tra permissions, xử lý lỗi.
 Tự động lưu câu trả lời định kỳ (axios/fetch về endpoint backend).
 Nếu mất mạng, lưu tạm vào localStorage, khi online lại gọi backend sync.
 Giao diện báo lỗi nếu fullscreen bị từ chối: ví dụ modal “Vui lòng bật full screen hoặc dừng bài”.
 Đảm bảo HTTPS ở frontend (React build host trên HTTPS), cấu hình CSP nếu cần.
 Test case kiểm thử:
User bấm Esc giữa bài: hệ thống có log và yêu cầu bật lại fullscreen.
User chuyển tab alt+Tab: log “focus lost” và đồng hồ tạm dừng (nếu policy).
Cố copy/paste: event oncopy/onpaste có ghi log, UI không cho dán.
Mất mạng: nhập xong vẫn lưu local, khi kết nối lại dữ liệu không mất.
Đóng console: test resize devtools (browser báo phát hiện?).
Backend:

 Thiết lập xác thực (JWT hoặc session), endpoint /login, /startExam, /endExam.
 Khi bắt đầu, tạo Redis key với TTL = thời gian thi (VD 3600s)
.
 Endpoint /remainingTime trả TTL (seconds) để client hiển thị countdown.
 Endpoint /autosave lưu câu trả lời (gắn examSessionId, questionId, answer). Kiểm tra token.
 WebSocket server (ví dụ dùng ws hoặc Socket.IO):
Lắng nghe các sự kiện log từ client, lưu vào DB.
Giải nén message JSON {type:…, time:…}.
 Bảng dữ liệu: Users, Exams, Sessions, Answers, EventLogs.
 Mã hoá: sử dụng HTTPS, mã hoá JWT (thuật toán RS256), mã hoá AES các trường nhạy cảm trong DB nếu lưu ảnh/video.
 Giới hạn request: rate limit trên API (tránh spam log).
 Monitoring: Tích hợp Prometheus + Grafana, báo lỗi backend (chi tiết logs). Alert nếu high error rate hoặc nhiều events bất thường.
 Compliance:
Tạo chính sách riêng tư (Privacy Policy) lưu trữ rõ mục đích.
Xóa log sau thời hạn (ví dụ 30 ngày).
Đảm bảo các API chỉ trả dữ liệu cần thiết (ví dụ không trả thông tin cá nhân nhiều hơn yêu cầu).
 Test case:
Đăng nhập với token hợp lệ/hết hạn xem xét response.
Thời gian thi: simulate hết TTL, submit bị từ chối.
Lưu log: gửi giả lập message check DB có nhập.
Mất Redis hoặc ngưng WebSocket: backend phải có fallback (ví dụ poll thay thế).
Thông lượng lớn: kiểm tra DB/WS xử lý nhiều kết nối đồng thời.
Kiểm tra luật GDPR: request gỡ dữ liệu (khó demo, nhưng đề cập).
6. So sánh các giải pháp (ưu/nhược)
Giải pháp/Thuật toán	Ưu điểm	Nhược điểm
WebSocket	Kết nối hai chiều real-time, độ trễ thấp, đẩy dữ liệu event tức thời.	Tốn kết nối mở, khó scale hơn HTTP, cần xử lý reconnect.
WebRTC (Peer)	Hỗ trợ streaming video/audio P2P, băng thông (video) cao; có thể dùng cho live proctoring.	Cấu hình phức tạp (STUN/TURN), NAT traversal, tải lớn, khó debug.
Service Worker	Hỗ trợ cache trang, offline, background sync. Cải thiện trải nghiệm không mạng.	Không tương tác trực tiếp với JS main, phức tạp thiết lập (HTTPS required); không kiểm soát UI.
MediaDevices.getUserMedia	Truy cập webcam/mic cho video/audio recording. Được chuẩn W3C, phổ biến.	Phải xin phép (Permissions), chỉ HTTPS. Dữ liệu nhạy cảm (gdpr), không ghi/process tự động.
MediaDevices.getDisplayMedia (Screen capture)	Cho phép thu hình màn hình sau khi user cho phép (với SSL/TLS).	Yêu cầu user chọn chia sẻ, hỗ trợ hạn chế (FireFox, mobile yếu). User dễ từ chối.
Custom Secure Browser	Có thể chặn inspect, copy/paste, screenshot; kiểm soát chặt (ví dụ Respondus LockDown).	Tốn cài thêm software, môi trường đóng, không phải pure web; hạn chế multi-OS.
Third-party Proctoring (ví dụ Proctorio, Honorlock)	Tích hợp sẵn AI phát hiện gian lận (face, giọng nói, eye-tracking), giao diện proctor.	Chi phí cao, phụ thuộc bên ngoài, có thể xâm phạm riêng tư (thu thập nhiều dữ liệu), lock-in.
HTTP Polling	Đơn giản: client gửi request định kỳ (ví dụ autosave).	Độ trễ cao hơn, không thật sự real-time. Không hiệu quả đối với event real-time.
WebSocket + HTTP	Kết hợp: WebSocket cho event real-time, HTTP cho autosave và các request khác.	Đơn giản thực hiện.

7. Kiến trúc đề xuất (sơ đồ & flow)
mermaid
Sao chép
graph LR
  subgraph Ứng dụng React (Client)
    A[Trình duyệt Người thi]
    B[Fullscreen API & UI]
    C[WebSocket Client]
    D[Page Visibility API]
    E[LocalStorage/ServiceWorker]
  end
  subgraph Server Node.js
    F[API REST (login, exam, autosave)]
    G[WebSocket Server]
    H[(Redis: Timer/Session)]
    I[(DB/Logs)]
  end
  A --> B
  A --> C
  A --> D
  B --> C
  B --> D
  C -->|wss| G
  D --> C
  E --> F
  F --> H
  F --> I
  G --> H
  G --> I
mermaid
Sao chép
sequenceDiagram
    participant U as Thí sinh
    participant F as Frontend (React)
    participant B as Backend (Node)
    U ->> F: Nhấn "Bắt đầu thi"
    F ->> F: Gọi requestFullscreen()
    alt Thành công
      F -->> U: Vào chế độ toàn màn hình
    else Thất bại
      F -->> U: Hiển thị lỗi (ví dụ: yêu cầu bật fullscreen)
      return
    end
    F ->> B: POST /startExam (userId, examId)
    B -->> F: {startTime, examDuration, token}
    F ->> F: Hiển thị đề thi, khởi động đồng hồ đếm ngược từ startTime
    Note over F: Đồng hồ đếm ngược được tính client từ startTime
    loop Trong lúc thi
      U ->> F: Thực hiện câu trả lời
      F ->> B: POST /autosave (answer data) định kỳ
      Note over B: Lưu câu trả lời vào DB
      alt User chuyển tab/thoát fullscreen
        F ->> B: Gửi WS event (type: 'blur' hoặc 'fullscreen-exit')
        Note over B: Ghi log sự kiện gian lận
      end
      alt Mất kết nối
        F ->> E: Lưu tạm data (localStorage)
      else Kết nối lại
        F ->> B: Đồng bộ data chưa gửi
      end
    end
    U ->> F: Nhấn “Nộp bài”
    F ->> B: POST /submitExam (final answers, token)
    B --> B: Kiểm tra TTL Redis (còn thời gian?), tính điểm, kết thúc session
    B -->> F: Kết quả thi
Luồng Flow (Mermaid) mô tả rõ các bước: người dùng khởi thi, frontend yêu cầu toàn màn hình và kết nối server qua WS để gửi các sự kiện giám sát. Backend dùng Redis để quản lý thời gian, và DB để lưu câu trả lời/log.

8. Ví dụ mã lệnh chính
Yêu cầu Fullscreen (React):
jsx
Sao chép
const enterFullScreen = () => {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch(err => {
      console.error('Fullscreen error:', err);
      alert('Không thể vào full screen. Vui lòng thử lại.');
    });
  }
};
Xử lý visibilitychange:
js
Sao chép
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // gửi log về server
    ws.send(JSON.stringify({ type: 'visibilitychange', time: Date.now() }));
  }
});
WebSocket Heartbeat (Client):
js
Sao chép
const ws = new WebSocket('wss://exam.example.com');
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
  }
}, 30000);  // mỗi 30 giây
Node.js WebSocket Server (ví dụ dùng ws):
js
Sao chép
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', ws => {
  ws.on('message', msg => {
    const data = JSON.parse(msg);
    // Xử lý event hoặc log vào DB
    saveLogToDB(data);
    // Phản hồi nếu cần
    if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
  });
});
Autosave (React/Node):
Client (React):
js
Sao chép
useEffect(() => {
  const interval = setInterval(() => {
    axios.post('/api/autosave', { answer, questionId }, { headers: { Authorization: token } })
      .catch(err => console.error('Autosave lỗi', err));
  }, 5000);
  return () => clearInterval(interval);
}, [answer]);
Server (Node.js):
js
Sao chép
app.post('/api/autosave', authenticateToken, (req, res) => {
  const { questionId, answer } = req.body;
  // Lưu/ cập nhật answer trong DB
  saveAnswer(req.user.id, req.user.examId, questionId, answer);
  res.sendStatus(200);
});
9. Kết luận
Phân tích trên đây trình bày chi tiết cách triển khai chế độ thi online toàn màn hình từ khía cạnh frontend (JS/React) lẫn backend. Tóm lại, hệ thống cần:

Frontend: sử dụng Fullscreen API, bắt sự kiện fullscreenchange và visibilitychange để kiểm soát, kết hợp WebSocket để gửi sự kiện giám sát real-time, autosave định kỳ, và các biện pháp chặn thao tác copy/paste (dù chỉ hiệu quả hạn chế).
Backend: quản lý thời gian thi trên server (ví dụ dùng Redis TTL) để ngăn giả mạo thời gian, lưu trữ các log sự kiện gian lận, bảo vệ session/token, mã hoá dữ liệu và tuân thủ quy định bảo mật GDPR/PDPA. Cần kiến trúc microservice hoặc clustered cho khả năng mở rộng và failover.
Giám sát và Phát hiện gian lận: kết hợp thu thập camera/microphone, AI nếu có thể, cùng với log sự kiện client. Tuy nhiên, mọi client-side approach đều có giới hạn (phải xem như tăng “chi phí gian lận” chứ không đảm bảo 100% an toàn)
.
Trade-offs: Càng siết chặt kiểm soát (block thao tác, ghi hình) thì trải nghiệm và quyền riêng tư càng ảnh hưởng; cẩn lưu ý cân bằng. Ví dụ, yêu cầu camera để giám sát tốt hơn nhưng sẽ đặt nhiều câu hỏi về riêng tư và compliance. Sử dụng dịch vụ proctoring có sẵn đỡ phải tự phát triển, nhưng đổi lại chi phí và bảo mật phụ thuộc bên thứ ba.
Tổng kết, báo cáo này làm rõ các API trình duyệt cần dùng (Fullscreen API
, Page Visibility
, MediaDevices
, WebSocket) cùng các ví dụ mã mẫu. Chi tiết trade-offs và kinh nghiệm từ nghiên cứu chuyên sâu (MDN, các bài báo proctoring
) đã được trích dẫn để đảm bảo giải pháp đầy đủ, an toàn và dễ triển khai.
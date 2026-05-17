# Email Setup Guide — Online Examination System

Hệ thống dùng **nodemailer** để gửi email qua SMTP. File service chính: `src/services/email.service.ts`.

---

## 1. SMTP Configuration

Cấu hình trong file `.env` (hoặc `.env.example` để tham khảo):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="Online Exam <noreply@yourdomain.com>"
```

| Biến       | Mô tả                                      | Gmail                      | Resend                    |
|------------|---------------------------------------------|----------------------------|---------------------------|
| SMTP_HOST  | Địa chỉ máy chủ SMTP                       | `smtp.gmail.com`           | `smtp.resend.com`         |
| SMTP_PORT  | Cổng SMTP                                  | `587` (TLS) hoặc `465` (SSL) | `587` (TLS)              |
| SMTP_SECURE| `true` cho SSL (port 465), `false` cho TLS | `false` (port 587)         | `false` (port 587)        |
| SMTP_USER  | Tài khoản gửi email                        | Email Gmail đầy đủ         | API key từ Resend        |
| SMTP_PASS  | Mật khẩu / App password                    | Gmail App Password         | Resend API Key            |
| MAIL_FROM  | Địa chỉ hiển thị trong email gửi đi        | `noreply@yourdomain.com`   | `noreply@yourdomain.com`  |

---

## 2. Gmail — App Password (Khuyến nghị cho development)

### Điều kiện tiên quyết
- Tài khoản Google với **2-Step Verification** đã bật

### Tạo App Password

1. Truy cập [myaccount.google.com](https://myaccount.google.com) → **Security**
2. Ở mục "How you sign in to Google" → bật **2-Step Verification** nếu chưa bật
3. Quay lại **Security** → **App passwords**
   - Chọn app: *Mail*
   - Chọn device: *Other (Custom name)* → đặt tên `OnlineExam-Dev`
4. Google sẽ cấp một mật khẩu 16 ký tự, ví dụ: `ABCD EFGH IJKL MNOP`
5. Dùng mật khẩu đó làm `SMTP_PASS` trong `.env` (bỏ dấu cách)

### Lưu ý
- App Password chỉ hiển thị **một lần duy nhất** — lưu ngay vào password manager
- Nếu thấy lỗi `534 Authentication failed`, kiểm tra lại App Password và 2FA

---

## 3. Resend — Free 100 emails/ngày

### Đăng ký
1. Tạo tài khoản tại [resend.com](https://resend.com)
2. Tạo API key mới tại [resend.com/api-keys](https://resend.com/api-keys)
3. Xác minh domain để gửi email (hoặc dùng domain `onboarding@resend.dev` để test nhanh)

### Cấu hình
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxx   # API key từ Resend
MAIL_FROM="Online Exam <noreply@yourdomain.com>"
```

> **Lưu ý:** `SMTP_USER` luôn là `resend` khi dùng Resend SMTP.

### Test nhanh
```bash
curl -X POST https://api.resend.com/emails/verify \
  -H "Authorization: Bearer re_xxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","from":"noreply@yourdomain.com","subject":"Test","html":"<p>Test OK</p>"}'
```

---

## 4. Brevo (Sendinblue) — Free 300 emails/ngày

### Đăng ký
1. Tạo tài khoản tại [brevo.com](https://brevo.com)
2. SMTP credentials nằm trong **Settings → SMTP**

### Cấu hình
```env
SMTP_HOST=smtp-relay.gmail.com   # hoặc smtp.brevo.com (tùy gói)
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-brevo-username
SMTP_PASS=your-brevo-smtp-key
MAIL_FROM="Online Exam <noreply@yourdomain.com>"
```

---

## 5. Test bằng curl (SMTP)

### Test Gmail SMTP
```bash
curl -v \
  --url "smtp://smtp.gmail.com:587" \
  --mail-from "your-email@gmail.com" \
  --mail-rcpt "recipient@example.com" \
  --upload-file - <<EOF
From: your-email@gmail.com
To: recipient@example.com
Subject: Test Email

This is a test email.
EOF
```

### Kiểm tra service trong code
```bash
# Từ thư mục server, chạy script test nhanh:
node -e "
const { sendEmail } = require('./dist/services/email.service');
// Cần đặt SMTP_* trong .env trước
"
```

---

## 6. Mã nguồn liên quan

| File                      | Mô tả                                      |
|---------------------------|---------------------------------------------|
| `src/services/email.service.ts` | Service chính: sendEmail, sendPasswordReset, sendExamNotification |
| `src/services/mail.service.ts`   | Service cũ: sendMail (dùng cho nhắc hạn thi, reset password) |
| `src/services/forgotPassword.service.ts` | Gửi link reset password (dùng mail.service.ts) |
| `src/jobs/examDeadlineReminders.job.ts` | Job nhắc hạn thi 24h/1h (dùng mail.service.ts) |
| `src/config/enviroment.ts`       | Đọc SMTP_* từ process.env                   |
| `.env.example`             | Template biến môi trường (đã thêm SMTP)    |

---

## 7. Troubleshooting

| Lỗi                                      | Nguyên nhân thường gặp                              |
|------------------------------------------|-----------------------------------------------------|
| `SMTP connection timeout`                | Firewall block port 587, hoặc sai SMTP_HOST         |
| `534 Authentication failed`              | Sai App Password (Gmail) hoặc chưa bật 2FA           |
| `Invalid login: 535-5.7.8`              | Gmail: mật khẩu sai hoặc dùng mật khẩu thường thay vì App Password |
| `Mail not sent — thiếu SMTP` log        | Chưa đặt SMTP_HOST hoặc MAIL_FROM trong .env       |
| `getaddrinfo ENOTFOUND`                  | DNS resolution failed → kiểm tra SMTP_HOST có đúng |
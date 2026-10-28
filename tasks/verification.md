# Kiểm thật: quality-gates

> **Plan:** [plan.md](plan.md). Mỗi lần kiểm thật ghi ngày, bước đã làm và kết quả. Không ghi token, và không ghi nội dung private key.

## T1: Hai GitHub App

**Chuẩn bị (2026-10-29):** `docs/github-apps-setup.md` có các bước tạo App, tạo private key, cài App vào `TungPH7/ao-pilot`, đặt biến `AO_DEV_APP_KEY_FILE` và `AO_REVIEW_APP_KEY_FILE`. Nhãn nút lấy từ tài liệu GitHub; bốn chỗ ghi "đối chiếu giao diện".

**Đổi cách làm (2026-10-29):** bạn hỏi vì sao phải tự tạo App. Claude viết `scripts/github-app-create.mjs` theo manifest flow, nên bạn chỉ còn bấm tạo và cài trên GitHub; tài liệu giữ các bước làm tay để dự phòng.

**Kết quả (2026-10-29, khoảng 01:20):** Claude chạy script và mở trang `http://127.0.0.1:47100/`; bạn bấm tạo và cài cho từng App. GitHub nhận `redirect_url` và `setup_url` dạng `http://127.0.0.1:<port>/...`. Script dừng với mã 0 và chỉ in:

| App | Slug | App ID | Installation | File key |
|---|---|---|---|---|
| `ao-dev` | `tungph7-ao-dev` | 5514949 | 176282622 | `C:\Users\Huu Tung\ao-keys\tungph7-ao-dev.pem` |
| `ao-review` | `tungph7-ao-review` | 5514961 | 176282738 | `C:\Users\Huu Tung\ao-keys\tungph7-ao-review.pem` |

- Hai file key có trên đĩa (1.675 byte mỗi file); nội dung không được mở hay in.
- Claude đặt hai biến môi trường user `AO_DEV_APP_KEY_FILE`, `AO_REVIEW_APP_KEY_FILE` bằng PowerShell; đọc lại từ registry: cả hai có giá trị và trỏ tới file tồn tại.
- Phạm vi cài (chỉ `ao-pilot`) kiểm bằng JWT của từng App ở T2.

## T2: Token của GitHub App

**Kiểm thật (2026-10-29, khoảng 02:25):** một script thử trong scratchpad dùng `appCredentials`, `appJwt` và `installationToken`, với App ID và slug truyền qua biến môi trường. Phiên Claude Code đã khởi động trước khi có hai biến `AO_*_APP_KEY_FILE`, nên đường dẫn file key được đọc từ registry (`HKCU\Environment`): cách dự phòng này chạy đúng.

| | `tungph7-ao-dev` | `tungph7-ao-review` |
|---|---|---|
| `GET /app` bằng JWT | chủ `TungPH7`; quyền contents write, metadata read, pull_requests write; không đăng ký sự kiện | chủ `TungPH7`; quyền contents read, metadata read, pull_requests write; không đăng ký sự kiện |
| `GET /repos/TungPH7/ao-pilot/installation` bằng JWT | 200, installation 176282622 | 200, installation 176282738 |
| Phạm vi cài (`repository_selection`) | `selected` | `selected` |
| Token không giới hạn repo: `GET /installation/repositories` | chỉ `TungPH7/ao-pilot` | chỉ `TungPH7/ao-pilot` |
| Token của `installationToken` (giới hạn `ao-pilot`) | `ghs_…`, sống 1 giờ, thấy đúng `TungPH7/ao-pilot` | như bên trái |
| Thu hồi token (`DELETE /installation/token`) | 204, 204 | 204, 204 |

Không token nào được in; script chỉ in loại token (`ghs_`) và các thông tin không bí mật ở bảng trên.

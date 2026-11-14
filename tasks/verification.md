# Kiểm thật: Pilot 3 (B4)

## T1 (2026-11-14)

Spec, plan, todo và nhật ký Phiên 30 · Lượt 1–4 merge ở kit PR #279 (`6208701`). Câu 3 trả lời ở Lượt 5: bản sao backup kéo về máy bạn.

## T2: tiền đề (2026-11-14, Phiên 30 · Lượt 5)

1. **Chỗ đọc host Production.** Chỉ `lib/release/caddy.mjs` đặt basic auth theo môi trường. Smoke test gọi thẳng container trong mạng của VPS (`smoke.mjs`); `qa` chỉ chạy trên Development và Staging (`qa.mjs`, `steps.mjs`); `doctor` không chạm VPS, chỉ in mẫu cho `deployer.yaml`; deployer ghi `environment_url` làm đường dẫn. Vậy `production_auth` chỉ đổi `caddySites`.
2. **Đường của `SMP-27`** (T20 của B1, áp cho `SHOP-5`): Task tạo bằng token CI, nhãn `ao-devops`; token CI bấm được `Refine`; trường Agent ghi DevOps Engineer, `Start` qua Rovo MCP bằng token agent; `ao-pr create` mở PR nháp dưới tên bot `ao-dev`, cần các biến `AO_*` của `.claude/settings.json`; CI xanh; `/ao-review <PR>` (`pr-ready`, `reviewer`, `security`); merge; `jira-sync` đưa item sang Ready for QA; `/ao-qa`; bạn Accept. Ở B1, `qa` cho kết quả NOT TESTED và không chạy lại được từ In QA; lỗi kit này vẫn mở.
3. **E2E của `shop` trên Development:**
   - **Chạy như `/ao-qa` thì hỏng trước khi có test nào chạy:** `playwright.config.ts` luôn dựng mọi app tại chỗ (`webServer`), kể cả khi test chạy trên môi trường. `api` gọi `docker compose up` cho Postgres, nên khi Docker tắt thì Playwright dừng: "Process from config.webServer was not able to start". File này đến từ profile (`profiles/base-pnpm`, `profiles/next-nest`), sau `init` thì thuộc dự án. **Sửa:** profile chỉ dựng app tại chỗ khi có test `@local`; `SHOP-5` đưa bản sửa vào `shop` (thêm vào T4 và T5).
   - **Bỏ `webServer` để đo:** 9 test đạt, 8 test đỏ. Đỏ: 4 test đăng nhập (`auth.spec.ts`, chờ Epic đăng nhập); 2 test sản phẩm (`products.spec.ts`) và 1 test a11y của trang Products, mock bằng MSW trong server của template; `product-crud.spec.ts` của `admin`. Bốn test cuối chờ Epic "Danh mục sản phẩm".
   - **Mật khẩu basic auth trong tiến trình Claude Code là bản cũ.** `AO_ENV_AUTH` của tiến trình có từ trước lần đổi mật khẩu ở B2; biến người dùng của Windows có bản mới. Với bản cũ, mọi trang trả 401; với bản mới, `shop-dev` trả 307 sang `/en`, `shop-admin-dev` và `/api/v1/health` trả 200. Khi chạy `ao-step` cho `qa`, mình truyền giá trị đọc từ biến người dùng của Windows (không in ra). Khởi động lại VS Code thì tiến trình mới có bản đúng.
4. **Biến của profile Spring:** `application-staging.yml` và `application-prod.yml` không đòi biến nào thêm. `application.yml` cần `SPRING_PROFILES_ACTIVE`, `DB_HOST`, `DB_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, đúng như `env` của `api` trong `deploy.yaml`. Staging dùng `staging`, Production dùng `prod`.
5. **VPS** (khoảng 13:17 giờ Việt Nam): RAM còn trống 2.486 MB trên 3.915 MB; đĩa còn trống 23 GB (đã dùng 40%); build cache 6,55 GB, 1,62 GB dọn được; 16 container chạy; `/var/backups/ao` 28 KB. `api` của `shop` vẫn `unhealthy` (việc của `SHOP-5`).
6. **`age` và `sftp`:**
   - VPS (Ubuntu 24.04): `apt` có `age` 1.1.1, chưa cài.
   - npm: `age-encryption` 0.3.1, của FiloSottile (tác giả `age`), phụ thuộc `@noble/*` và `@scure/base`. Dùng được trong Node ở cả VPS lẫn máy bạn, và test được trong `npm test`. Chọn giữa hai cách ở T6.
   - Máy bạn: Windows OpenSSH 9.5p1; `sftp` nhận `-b <file>` và `-i <key>`.

### Checkpoint 1: đạt

Sửa plan và todo: T4 thêm `playwright.config.ts` của profile; T5 đưa bản sửa đó vào `shop`, cùng 8 test chờ Epic (4 test đăng nhập chờ Epic đăng nhập).

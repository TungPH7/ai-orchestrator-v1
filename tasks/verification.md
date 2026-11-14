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

## Chặng 1: kit và `SHOP-5`

- **T3, T4** merge ở kit PR #280 (`b255449`): `production_auth`; `/ao-preview` kết thúc bằng trạng thái thay cho dòng `STOP:`; `playwright.config.ts` của profile `base-pnpm` chỉ dựng app tại chỗ cho test `@local` khi chạy trên môi trường; `userSecret` đọc biến người dùng của Windows trước (T2 mục 3). 1.404 test.
- **T5, `SHOP-5`** (Task, nhãn `ao-devops`):
  - tạo bằng token CI; `Refine` bằng token admin của bạn, kèm comment nguồn duyệt (spec 2.1, Lượt 2), vì contract giao `Refine` của Task ngoài Epic cho người; trường Agent DevOps Engineer; `Start` qua Rovo MCP bằng token agent (`scratchpad/shop5-open.mjs`). In Progress.
  - Phiên chính viết trên `feature/SHOP-5-scaffold-fixes`: `SecurityConfig` mở `/actuator/health/liveness` và `/readiness`, có `ActuatorProbesIntegrationTest`; `playwright.config.ts` theo kit; 8 E2E bỏ qua trên môi trường bằng `test.skip(` kèm `reason:` trên cùng dòng.
  - Prettier lúc commit tách `test.skip(` và chuỗi `reason:` ra hai dòng, nên luật suppression sẽ đỏ. Sửa bằng hàm `isLocal` để mỗi lời gọi nằm gọn một dòng; luật suppression chạy tại máy không báo gì.
  - Spotless đòi định dạng lại hai file Java: `mvnw.cmd spotless:apply` với đường dẫn đầy đủ (T2 của B3).
  - E2E trên Development, Docker tắt: 9 đạt, 8 bỏ qua, không dựng app nào tại chỗ.
  - PR #10 do bot `ao-dev` mở; CI xanh (62 test Java, trước là 59).
  - `/ao-review 10`: `reviewer` (xhigh, 28 lượt, 5,6 phút, 1,38 USD) 5 Low; `security` (max, vì PR chạm `SecurityConfig`; 37 lượt, 8,9 phút, 2,14 USD) không finding. Cộng 3,52 USD.
  - Năm Low không sửa trên PR này, vì head mới phải review lại. Hai Low của `playwright.config.ts` sửa ở kit (T6b dưới đây). Ba Low còn lại đi cùng Epic đầu, vì Epic viết lại chính các test đó: `isLocal` lặp ở 4 file; test của probe nên kiểm thêm `/actuator/health/db` trả 401; `reason:` trỏ `SHOP-5` thay vì Epic chưa có.
  - Gate ③: mình approve bằng login `gh` của bạn (câu 5); `merge-gate` merge `28394b8`.
  - Deployer deploy `28394b8` lên Development trong 10 phút; container `api` lần đầu `healthy`.
  - `/ao-qa SHOP-5` (`qa`, high, 31 lượt, 3,9 phút, 0,92 USD): **NOT TESTED**. Sáu mục PASS, trong đó E2E trên Development 9 đạt, 8 bỏ qua trong 25 giây, không dựng app nào tại chỗ. Mục "`docker inspect` của `api` là `healthy`" cần VPS, mà `qa` không vào được, nên `qa` gắn cờ Needs you (comment 10245). `gh-guard` chặn lệnh đầu của `qa` vì lệnh có tên biến mật khẩu; `qa` chạy lại không có biến đó.
  - Phiên chính kiểm trên VPS lúc 07:31 UTC: `healthy`, FailingStreak 0. Comment bằng chứng, gỡ cờ và nhãn bằng token admin. `SHOP-5` ở In QA, chờ bạn `Accept`.
  - **Bài học cho kit:** Verification của một Task cho `qa` không được có bước chỉ vào được VPS. Cách sửa để sau: deployer chờ HEALTHCHECK của Docker báo `healthy` (khi image có HEALTHCHECK) và ghi vào status của deployment, để `qa` đọc được từ GitHub.
  - Chi phí agent của `SHOP-5`: 4,44 USD.

## Chặng 2: ba môi trường và `v0.1.0`

- **T6** merge ở kit PR #281 (`dbbf318`): bản mã hóa của `ao-backup` (`age-encryption` 0.3.1, X25519, theo luồng), `vps/sshd-aobackup.conf`, `scripts/ao-backup-pull.mjs`, dòng mới của `doctor`, mục 16 của `docs/vps-setup.md`. 1.417 test.
- **T6b, hai Low của review `shop` PR #10** trong `playwright.config.ts` của profile: chỉ coi là chạy trên môi trường khi mọi app công khai có URL; `@local` chỉ tính ở dạng tag, không tính `user@localhost`.
- **T7, VPS** (khoảng 14:10, `scratchpad/t7-vps.sh`, chạy bằng root):
  - kit lên `dbbf318`, bản trước ở `/opt/ao/kit.prev`;
  - `staging.env`, `staging.db.env`, `production.env`, `production.db.env` của `shop`: mật khẩu hex 64 ký tự và `AUTH_SECRET` 64 ký tự sinh trên VPS, chỉ in tên biến và độ dài; profile `staging` và `prod`; `root:aodeploy 640`;
  - nhóm và user `aobackup` (nologin), `authorized_keys` có `restrict`, `60-aobackup.conf`; `sshd -T` cho `aobackup`: chroot `/var/backups/ao-offsite`, `internal-sftp -R`, không TTY, không chuyển cổng; root không đổi;
  - `deployer.yaml`: `production_auth: true` cho `shop`, khối `backup:` với khóa công khai; bản sao lưu ở `/root/deployer.yaml.<ngày-giờ>.bak`;
  - `tick --dry-run`: chỉ báo sẽ viết lại Caddyfile; timer chạy lại;
  - `ao-backup`: thêm dump `071020Z` (15.235 byte) và hai bản mã hóa (15.443 và 15.435 byte), `root:aobackup 640` trong thư mục `0750`, gốc `root:root 755`;
  - RAM còn trống 2.597 MB.
- **T8, máy bạn:**
  - khóa `age` ở `%USERPROFILE%\.ao\ao-backup.agekey` (không in), key `%USERPROFILE%\.ssh\ao_backup_pull` (không passphrase), `Host ao-backup` thêm vào `~/.ssh/config` (bản cũ lưu ở scratchpad);
  - `pull` lần đầu: 2 bản về `D:\ao-backups`; lần hai: 0 bản;
  - `aobackup` thử `put`, `rm`, `mkdir`: đều `Permission denied`; `ssh` vào: "This service allows sftp connections only.";
  - khôi phục thật: giải mã `shop-development-20261114T071020Z.dump.age`; SHA-256 trùng bản trên VPS (`2d88c1dd…`); Postgres tạm trên Docker của máy bạn (không mạng, đúng digest của `deploy.yaml`) khôi phục trong 674 ms: 3 bảng, 6 dòng, Flyway 1–3; `restore-check` trên VPS cũng 3 bảng, 6 dòng. Container tạm và bản giải mã đã xóa; Docker Desktop đã tắt;
  - task `ao-backup-pull` của Windows: hằng ngày 09:00 và lúc đăng nhập, `StartWhenAvailable`; chạy thử trả 0.

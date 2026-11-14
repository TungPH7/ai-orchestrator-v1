# Task: Pilot 3 (B4)

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-pilot-3.md](../SPEC-pilot-3.md). Làm theo thứ tự. Task sửa kit viết test đỏ trước.

**Quy ước:**
- Xong mỗi task sửa kit thì năm lệnh kiểm phải xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`.
- Mỗi chặng code của kit một nhánh `task/pilot3-<N>` tách từ `main`, mỗi task một commit. Merge qua PR khi CI xanh.
- Commit theo `CLAUDE.md`.
- Task có nhãn **[bạn]** cần bạn bấm, gửi file, hoặc đi qua một gate.
- Mỗi lượt agent: báo tiến độ 3 phút một lần; chi phí ghi vào `verification.md`.

## Chuẩn bị

- [x] **T1: tài liệu.** Spec ghi đã duyệt; plan, todo; nhật ký Phiên 30 · Lượt 1–4. PR tài liệu từ nhánh `task/pilot-3`, tự merge khi CI xanh.
- [x] **T2: tiền đề** (plan, rủi ro). Không commit code; kết quả ghi vào `verification.md`:
  1. mọi chỗ trong kit đọc host Production (`doctor`, `/ao-status`, `jira-sync`, `qa`, smoke): chỗ nào sẽ gặp basic auth sau `production_auth`;
  2. đường của `SMP-27` (T20 của B1): ai mở PR, `/ao-review` và `/ao-qa` đọc gì, cách item tới Done;
  3. các E2E của `shop` gọi API NestJS cũ, chạy trên Development hiện tại: test nào đỏ;
  4. biến mà `application-staging.yml` và `application-prod.yml` của `api` cần; profile nào cho Staging và Production;
  5. VPS: RAM lúc rảnh, build cache, chỗ trống của đĩa;
  6. `age` cho Windows (bản ghim, mã băm) hoặc gói npm `age-encryption`; `sftp` của Windows OpenSSH chạy được với `-b` và key riêng.
  - **Đạt khi:** sáu mục có kết quả. Mục nào sai với spec hay plan thì sửa trước chặng 1.

### Checkpoint 1: sau T2
- [x] Tiền đề đạt (Lượt 5). T4 thêm `playwright.config.ts` của profile; T5 đưa bản sửa vào `shop`.

## Chặng 1: kit và `SHOP-5`, nhánh `task/pilot3-1`

- [x] **T3: `production_auth`** (spec 2.2; plan, quyết định 2).
  - **Đạt khi:**
    - schema của `deployer.yaml` nhận `production_auth` (boolean) cho từng dự án, mặc định `false`;
    - `caddySites` đặt basic auth cho host Production của dự án có khóa này; dự án khác không đổi;
    - các chỗ T2 mục 1 tìm ra được sửa cùng;
    - `vps/deployer.example.yaml` có khóa này, kèm chú thích.
  - **Kiểm:** test của `caddy.mjs` và của schema; Caddyfile của một cấu hình có `ao-sample`, `ao-pilot` giống hệt bản trước.
- [x] **T4: dòng `STOP:` của `/ao-preview --go` và `--stop`, và `playwright.config.ts` của profile** (việc B3 để lại; T2 mục 3).
  - Khi lệnh làm xong việc, dòng cuối mô tả trạng thái mới mà không mở đầu bằng `STOP:`; `STOP:` chỉ còn cho lúc lệnh không làm được.
  - `playwright.config.ts` của `profiles/base-pnpm` và `profiles/next-nest`: khi test chạy trên một môi trường, chỉ dựng app tại chỗ nếu có test `@local`.
  - PR của chặng 1.
  - **Kiểm:** test của `ao-step` hoặc `runner.mjs` cho hai trường hợp; `profiles:check`.
- [x] **T5: [bạn] `SHOP-5`** (spec 2.1; plan, quyết định 4).
  - Task tạo bằng token CI, nhãn `ao-devops`; bạn bấm Refine nếu contract đòi.
  - Phiên chính viết code trên `feature/SHOP-5-…`: `HEALTHCHECK` của `api`; `playwright.config.ts` theo bản sửa của T4; 8 E2E đỏ ở T2 chờ bằng `test.skip(` kèm `reason:` (4 test đăng nhập chờ Epic đăng nhập, 4 test sản phẩm chờ Epic "Danh mục sản phẩm").
  - PR do bot `ao-dev` mở; CI xanh; `/ao-review SHOP-5`; mình merge khi CI xanh (câu 5).
  - Deployer deploy Development; container `api` báo `healthy`.
  - `/ao-qa SHOP-5` trên Development; **bạn Accept**.
  - **Đạt khi:** `SHOP-5` Done; `docker inspect` của `api` trên Development là `healthy`.

### Checkpoint 2: sau T5
- [ ] PR của chặng 1 merge; năm lệnh kiểm xanh; `SHOP-5` Done.

## Chặng 2: ba môi trường và `v0.1.0`, nhánh `task/pilot3-2`

- [x] **T6: bản sao kéo về máy bạn, phần kit** (spec 2.4; plan, quyết định 3).
  - **Đạt khi:**
    - `ao-backup run` có khóa công khai `age` thì ghi thêm `<tên>.dump.age` vào `/var/backups/ao-offsite/<dự án>/<môi trường>/`, nhóm `aobackup` đọc được; bản mã hóa giữ theo cùng `backupsToKeep`;
    - không có khóa thì `ao-backup` chạy như cũ;
    - `vps/` có cấu hình `sshd` cho `aobackup` (`ChrootDirectory`, `internal-sftp -R`, không chuyển cổng, không TTY);
    - `scripts/ao-backup-pull.mjs`: `pull` tải file chưa có bằng `sftp` của Windows OpenSSH, không xóa gì; `install` tạo task mỗi ngày và lúc đăng nhập; ghi trạng thái lần kéo cuối;
    - `doctor` có một dòng báo khi bản sao mới nhất trên máy cũ hơn 36 giờ;
    - `docs/vps-setup.md` có mục mới cho tài khoản `aobackup` và cách khôi phục từ bản sao.
  - **Kiểm:** test của các hàm thuần (chọn file cần mã hóa, cần kéo, cần xóa trên VPS; trạng thái); không test gọi mạng.
- [x] **T7: VPS** (spec 2.3). VPS vẫn mở.
  - chép kit mới (mục 12 của `vps-setup.md`), `--dry-run`, Caddyfile của hai dự án kia không đổi;
  - `/etc/ao/secrets/shop/{staging,production}.env` và `.db.env`, sinh trên VPS, không in;
  - `production_auth: true` cho `shop`; host Production của `shop` hỏi basic auth;
  - tài khoản `aobackup` với key riêng, và khóa công khai `age` của bạn trong `deployer.yaml`;
  - đo RAM, build cache.
- [x] **T8: [bạn] máy bạn** (spec 2.4).
  - mình sinh cặp khóa `age` trên máy bạn; **bạn cất khóa bí mật** ở ngoài laptop;
  - mình sinh key kéo về, đưa khóa công khai lên VPS, chạy `ao-backup-pull.mjs install`;
  - một lần khôi phục thật: giải mã một bản, so mã băm với bản trên VPS, khôi phục vào Postgres trên Docker ở máy bạn, so số bảng và số dòng.
  - **Đạt khi:** tiêu chí 2 của spec đạt cho Development; Staging và Production được phủ sau T9.
- [x] **T9: [bạn] `v0.1.0`** (spec 2.5).
  - Fix Version `v0.1.0`, `v0.2.0` qua REST bằng token admin;
  - **gate ④:** `/ao-release v0.1.0 <sha>`; Staging deploy, database Staging, Flyway;
  - `/ao-ship v0.1.0`; **gate ⑤:** bạn approve PR release; Production deploy;
  - đo RAM khi đủ ba môi trường cùng hai dự án kia; backup và bản sao phủ ba database;
  - **bạn** bấm Release `v0.1.0`, hoặc bảo mình làm qua REST. Phiên 31 · Lượt 1: bạn bảo mình làm; đã Release qua REST.

### Checkpoint 3: sau T9
- [x] `v0.1.0` chạy trên Production và hỏi basic auth; RAM ba môi trường đo được; bản sao trên máy bạn khôi phục được (Lượt 10).

## Chặng 3: Epic tới gate ②

- [ ] **T10: chép kit vào `shop`** trong PR riêng, nếu kit đã đổi những file được chép từ lần `SHOP-2`.
- [x] **T11: [bạn] ảnh và intake.** Epic `SHOP-7` (Phiên 31 · Lượt 4); chờ bạn bấm `Start spec`.
  - **Giao diện mẫu bạn chọn ở Lượt 5:** trang `https://demo.codeandchill.store/vitrea/#/growth` (hai ảnh dán trong chat: trang Growth Lab và hộp thoại "New experiment"). Trang danh sách, trang chi tiết của `user` và form của `admin` theo style, design token và cách bố trí của trang này.
  - Ảnh dán trong chat không được lưu thành file, nên mình đọc trang bằng trình duyệt headless (Playwright với Chromium; phiên này chưa có chrome-devtools MCP, cả hai cùng điều khiển Chromium qua CDP): lấy biến CSS, font, màu, bo góc, đổ bóng, hiệu ứng kính và khoảng cách của từng thành phần (thanh điều hướng, thẻ, bảng, nút, nhãn trạng thái, ô nhập, hộp thoại).
  - Chụp các màn hình vào `.ai/design-inbox/<EPIC>/` (mỗi ảnh tối đa 1 MB, cạnh dài tối đa 2.000 px), kèm file ghi token đo được và nguồn.
  - Chỉ lấy style. Không chép code, logo, ảnh hay font có giấy phép riêng của trang mẫu; font kiểm giấy phép trước khi dùng.
  - Theo roster, chỉ `fe-dev` có chrome-devtools MCP (`get_css_styles`, `take_screenshot`, `evaluate_script`); `ux` thì không. Vì vậy URL của trang mẫu đi vào `design.md` và vào Task design system, để `fe-dev` đối chiếu từng style bằng MCP lúc làm.
  - **Đã chuẩn bị ở Lượt 6:** 5 ảnh (Growth, hộp thoại "New experiment", Apps, Overview, `#/apps/tally`; PNG, dưới 1 MB, cạnh dài tối đa 1.903 px) và 94 token của giao diện tối trong `shop/.ai/design-inbox/_reference/` (`tokens.md`, `reference.json`; `scratchpad/ref-capture.mjs`). Font Urbanist (Google Fonts, OFL). Trang có nút "BUY THIS TEMPLATE": template bán thương mại, chỉ lấy style.
  - Ở T11: chép 5 ảnh vào `.ai/design-inbox/<EPIC>/`. `tokens.md` không vào đó, vì `ux` trả lại mọi file không phải PNG/JPG; token đi vào mô tả Epic, phần `ux` đọc về ảnh.
  - `/ao-intake` (mình phỏng vấn bạn, tạo Epic); **bạn** bấm `Start spec`.
- [x] **T10g: sửa theo review vòng 3 của `shop` PR #13** (spec 2.9 mục 5; Phiên 31 · Lượt 16): kit có cách ghi một High bạn chấp nhận; merge ngược chờ `audit` của các commit mang từ `main` về; `doctor` kiểm `CODEOWNERS` trên `main`; các Low. Chép kit vào PR #13, review vòng 4; còn High 1 thì approve kèm dòng `Accept risk:` tới 2026-12-31; merge, QA, bạn Accept `SHOP-6`.
- [ ] **T10h: [bạn] bản `v0.1.1`** ngay sau `SHOP-6`: đưa `.github/CODEOWNERS` lên `main`, và chạy thử luồng release mới (nhánh release cắt bằng login của bạn, PR report, tag của `ao-merge`, merge ngược có `audit`) trước Epic. Fix Version `v0.1.1`; gate ④ và ⑤ của bạn.
- [ ] **T12: [bạn] `/ao-spec <EPIC>`** tới **gate ①**.
- [ ] **T13: [bạn] `/ao-plan <EPIC>`** tới **gate ②**. Sửa chặng 4 của todo theo plan của `sa`.
  - Plan của Epic phải xử lý ba Low của review `shop` PR #10: viết lại hoặc xóa 8 E2E đang bỏ qua trên môi trường cùng mock của API NestJS cũ (4 test đăng nhập chờ Epic đăng nhập); gom `isLocal` vào một helper cho mỗi app; test probe kiểm thêm `/actuator/health/db` trả 401.

### Checkpoint 4: sau T13
- [ ] Gate ① và ② qua; `design.md` có màn hình kiểu Ảnh và mục Design System.

## Chặng 4: các item của Epic

Mỗi item: `/ao-build`, `/ao-preview` (bạn xem), `/ao-review`, **gate ③**, `/ao-qa` trên Development, **bạn Accept**.

- [ ] **T14: [bạn] Task design system.**
- [ ] **T15: [bạn] Story thứ nhất.**
- [ ] **T16: [bạn] Story thứ hai.**

### Checkpoint 5: sau T16
- [ ] Mọi item của Epic Done (tiêu chí 4–6 của spec).

## Chặng 5: `v0.2.0` và đóng

- [ ] **T17: [bạn] `v0.2.0`** (spec 2.7): vài sản phẩm thử trên Production qua `admin`; **gate ④**; `/ao-ship v0.2.0`; **gate ⑤**; Production, Flyway trên database có dữ liệu; **bạn** Release `v0.2.0` và Complete Epic.
- [ ] **T18: hướng dẫn.** Phần mới của `docs/getting-started.md` với đầu ra thật của Epic; `production_auth` và bản sao trong `docs/vps-setup.md`; PR.
- [ ] **T19: đóng pilot.** Kiểm khóa `age` đã cất (giải mã một bản sao bằng `decrypt --identity -`, khóa lấy từ trình quản lý mật khẩu) trên máy chưa từng chạy agent, hoặc sau khi có `ao-agent`; rồi sinh cặp khóa mới (review vòng 4 của `shop` PR #13, `vps-setup.md` mục 16). File khóa trên máy đã xóa ở Phiên 31 · Lượt 2. Bảng tám tiêu chí và chi phí trong `verification.md`; plan, todo, verification vào `tasks/archive/pilot-3/`; `SPEC.md`, `concerns.md`; PR tài liệu.

- [ ] **Sau Pilot 3, trước 2026-12-31: tài khoản Windows `ao-agent`** cho mọi agent, không có keyring, credential git, khóa SSH hay token Jira của bạn (High 1 của review vòng 3 `shop` PR #13, bạn chấp nhận tới ngày đó ở Phiên 31 · Lượt 15). Khoảng nửa ngày: tạo tài khoản, cài Claude Code và đăng nhập cho nó, `ao-step` bật agent dưới tài khoản đó, chạy thử một agent.

### Checkpoint 6: sau T19
- [ ] Đủ tám tiêu chí của spec.

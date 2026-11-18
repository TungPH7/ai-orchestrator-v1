# Task: Pilot 3 (B4)

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-pilot-3.md](../../../SPEC-pilot-3.md). Làm theo thứ tự. Task sửa kit viết test đỏ trước.

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

- [x] **T10: chép kit vào `shop`** trong PR riêng, nếu kit đã đổi những file được chép từ lần `SHOP-2`.
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
- [x] **T10h: [bạn] bản `v0.2.0`** ngay sau `SHOP-6`: đưa `.github/CODEOWNERS` lên `main`, và chạy thử luồng release mới (nhánh release cắt bằng login của bạn, PR report, tag của `ao-merge`, merge ngược có `audit`) trước Epic. Lúc đầu viết là `v0.1.1`, nhưng kit chỉ cắt `vX.Y.0` từ `develop` (spec 2.9 phần 7), nên Epic lên `v0.3.0`. Fix Version `v0.3.0` tạo qua REST; gate ④ và ⑤ của bạn. Xong ở Phiên 32 · Lượt 3: tag `v0.2.0` của `ao-merge`, Production, Release trên Jira, dòng `CODEOWNERS` của `doctor` xanh.
- [x] **T12: [bạn] `/ao-spec <EPIC>`** tới **gate ①**. `SHOP-7`: PR docs #17, 12,31 USD (Phiên 32 · Lượt 3–5); chờ bạn bấm `Approve spec`.
- [x] **T13: [bạn] `/ao-plan <EPIC>`** tới **gate ②**. Sửa chặng 4 của todo theo plan của `sa`. `SHOP-7`: plan và 30 item `SHOP-8`…`SHOP-37`, 13,97 USD (Phiên 32 · Lượt 6–10); gate ② ở Lượt 11, PR #17 merge (`41ede25`), chặng 4 đã sửa.
  - Plan của Epic phải xử lý ba Low của review `shop` PR #10: viết lại hoặc xóa 8 E2E đang bỏ qua trên môi trường cùng mock của API NestJS cũ (4 test đăng nhập chờ Epic đăng nhập); gom `isLocal` vào một helper cho mỗi app; test probe kiểm thêm `/actuator/health/db` trả 401.

### Checkpoint 4: sau T13
- [x] Gate ① và ② qua; `design.md` có màn hình kiểu Ảnh và mục Design System.

## Chặng 4: các item của Epic

Mỗi item: `/ao-build`, `/ao-preview` (bạn xem), `/ao-review`, **gate ③**, `/ao-qa` trên Development, **bạn Accept**.

Theo plan của `sa` (gate ② ở Phiên 32 · Lượt 11): 11 Task và 9 Story, thay cho "Task design system và 2 Story" lúc lập
todo. Thứ tự theo các phase của `plan.md`; item không chờ nhau thì chạy lần lượt theo key.

- [x] **T14: [bạn] Phase 1, design system** (`fe-dev`): `SHOP-8` → `SHOP-9` (admin); `SHOP-10` → `SHOP-11` (user).
- [x] **T15: [bạn] Phase 2, nền:**
  - `SHOP-12` (`devops`, `xhigh`): năm sản phẩm thử trên Staging và Production; phiên chính đưa `AO_ENV_AUTH` vào phiên `devops`. Thực tế: Claude chạy bằng script ngày 16/11 (kit chưa đưa basic auth vào phiên `devops`), rồi Cancel (Won't do) ở Phiên 33 · Lượt 21, vì Task không có PR không đóng Done được (followup của kit).
  - `SHOP-13` → `SHOP-14` → `SHOP-15` → `SHOP-16` (`be-dev`; `SHOP-13`, `SHOP-14` là `xhigh`): schema V4, domain mới, API quản trị.
  - `SHOP-17`, `SHOP-18` (`fe-dev`): gỡ phần sản phẩm cũ của template ở hai app.
- [x] **T16: [bạn] Phase 3 và 4, Story:**
  - `SHOP-19` → `SHOP-20` (admin: danh sách, thêm).
  - `SHOP-21` → `SHOP-24`, `SHOP-25` → `SHOP-28`, `SHOP-31` (khách; `SHOP-21`, `SHOP-25`, `SHOP-28`, `SHOP-31` có Sub-task `be-dev` và `fe-dev`).
  - `SHOP-34`, `SHOP-37` (admin: sửa và ẩn, xóa).

### Checkpoint 5: sau T16
- [x] Mọi item của Epic Done hoặc Cancelled (tiêu chí 4–6 của spec), Phiên 33 · 2026-11-17: 50 item Done vào `v0.3.0`, gồm cả các Task sửa finding thêm trong lúc làm; SHOP-12 và Bug SHOP-71 Cancelled. Ngoài Epic, chờ bạn: SHOP-70, SHOP-72, SHOP-73.

## Chặng 5: `v0.3.0` và đóng

- [x] **T17: [bạn] `v0.3.0`** (spec 2.7): vài sản phẩm thử trên Production qua `admin`; **gate ④**; `/ao-ship v0.3.0`; **gate ⑤**; Production, Flyway trên database có dữ liệu; **bạn** Release `v0.3.0` và Complete Epic. Xong 2026-11-18 (Phiên 33): sản phẩm thử bằng SHOP-12 (script, 16/11); gate ④ cắt `release/v0.3.0` tại `187898c`; regression Staging PASS (132/0/6); gate ⑤ PR #72, merge `900aac9`, tag `v0.3.0`, Production success, V4 chạy đúng trên 5 sản phẩm; merge ngược PR #73 (`5e4f6c2`); bạn Release `v0.3.0` (mô tả từ `fix-version.md`) và SHOP-7 Done. Thứ tự việc tiếp theo: mục "Chặng 6" dưới đây.
- [x] **T18: hướng dẫn.** Xong 2026-11-18: kit PR #304 merge `07fca38` (phần 7 mới của `getting-started.md`, Epic `SHOP-7` với chi phí thật; kết quả thật trong `vps-setup.md`; 1540/1540 test). Phần mới của `docs/getting-started.md` với đầu ra thật của Epic; `production_auth` và bản sao trong `docs/vps-setup.md`; PR.
- [x] **T19: đóng pilot.** Xong 2026-11-18, trừ khóa `age`: bảng tám tiêu chí và chi phí (719,04 USD) ở cuối `verification.md`; 6/8 đạt, tiêu chí 6 một nửa (`/ao-preview`), tiêu chí 8 gần đạt (`profiles:check`); khóa `age` chuyển sang mục 7 của chặng 6, làm cùng `ao-agent`. Kiểm khóa `age` đã cất (giải mã một bản sao bằng `decrypt --identity -`, khóa lấy từ trình quản lý mật khẩu) trên máy chưa từng chạy agent, hoặc sau khi có `ao-agent`; rồi sinh cặp khóa mới (review vòng 4 của `shop` PR #13, `vps-setup.md` mục 16). File khóa trên máy đã xóa ở Phiên 31 · Lượt 2. Bảng tám tiêu chí và chi phí trong `verification.md`; plan, todo, verification vào `tasks/archive/pilot-3/`; `SPEC.md`, `concerns.md`; PR tài liệu.

- [ ] **Sau Pilot 3, trước 2026-12-31: tài khoản Windows `ao-agent`** cho mọi agent, không có keyring, credential git, khóa SSH hay token Jira của bạn (High 1 của review vòng 3 `shop` PR #13, bạn chấp nhận tới ngày đó ở Phiên 31 · Lượt 15). Khoảng nửa ngày: tạo tài khoản, cài Claude Code và đăng nhập cho nó, `ao-step` bật agent dưới tài khoản đó, chạy thử một agent.

### Checkpoint 6: sau T19
- [x] Đủ tám tiêu chí của spec: 6 đạt; 6 và 8 thiếu một phần, thành followup của kit (xem `verification.md`).

## Chặng 6: thứ tự việc sau `v0.3.0` (bạn duyệt ở Phiên 33 · Lượt 28, 2026-11-18)

Làm đúng thứ tự này; xong mục nào thì tick, ghi kết quả một dòng, và làm tiếp mục kế. Mục 1 đã xong. Bạn duyệt thêm ở Lượt 29–31: dừng pilot sau SHOP-73 (mục 4); SHOP-40, 70, 72 để backlog có hạn (mục 7); đóng Pilot 3 gồm cả T18 (tiêu chí 8 của spec: hướng dẫn có ví dụ Spring Boot trọn vòng); hướng dẫn cho người dùng cuối là Task tài liệu riêng (mục 5b); sửa gh-guard trước C1 (mục 6). Mỗi lần nối phiên, đọc mục này trước rồi tới mục mới nhất của `tasks/handoff-2026-11-15.md`.

- [x] **1. [bạn] Đóng T17 trên Jira.** Claude kiểm lại 2026-11-18: version `v0.3.0` released 2026-11-18, mô tả 4.466 ký tự (có câu SHOP-12 đã sửa); SHOP-7 Done, resolution Done.
- [x] **2. Kit: bỏ `pull_request_target` của `jira-sync`** Xong 2026-11-18: kit PR #303 merge `476185f` (workflow `PR events`, 1540/1540 test), cherry-pick vào clone kit `task/pilot3-14` (`d012210`). (hạn 2026-12-02; followup "Ưu tiên, hạn 2026-12-02" trong `handoff-2026-11-16-followups.md`). Workflow relay `PR events` trên `pull_request` (opened, reopened, synchronize, ready_for_review, closed), không giữ secret, như `PR review`; `jira-sync` nghe nó qua `workflow_run`. Kit PR, test xanh, merge.
- [x] **3. Chép kit vào `shop` một lần** Xong 2026-11-18: SHOP-74 Done (PR #74 `e4b8e5b`; `PR events` kiểm thật trên PR #75: mở → Waiting, ready → `Made SHOP-73: Submit`; không còn `pull_request_target` sau 03:15Z). (PR riêng): bản sửa của mục 2 và kit PR #297–#302; giữ job `caddy-proxy`, `not-found`, `--fail-if-no-match`; sửa comment `ci.yml:140-141`; `ao-kit doctor` xanh. Đang làm: SHOP-74, PR #74 merge `e4b8e5b` (thêm ngoại lệ audit picomatch bạn chấp nhận); `PR events` đã chạy thật lúc PR đóng; còn QA SHOP-74 và Accept.
- [x] **4. Chạy thử kit mới bằng SHOP-73, item cuối của pilot** Xong 2026-11-18: SHOP-73 Done (PR #75 `a3796f9`, QA PASS comment 10586; build lượt 1 dừng vì Task mâu thuẫn, bạn duyệt sửa ở Lượt 36; 4,40 USD cả vòng, theo `state.json`: con số 6,5 báo ở Lượt 40 là nhầm). Medium/Low của review → SHOP-75 (backlog). (`siteDescription`, câu A): bạn Refine (Task ngoài Epic), rồi build → preview → review → approve → QA → Accept. Có agent (khoảng 5–10 USD): nếu hạn mức 7 ngày còn cao thì chờ sau 2026-11-21 21:00.
- [x] **5. T18 và T19: đóng Pilot 3** Xong 2026-11-18: kit PR #304 (`07fca38`); tám tiêu chí và chi phí trong `verification.md`; `concerns.md` hàng B4 và C2; archive ở `tasks/archive/pilot-3/`; khóa `age` chuyển sang mục 7. (các mục T18, T19 ở chặng 5): T18 hướng dẫn kit (ví dụ Spring Boot trọn vòng với chi phí thật, tiêu chí 8); T19 khóa `age`, bảng tám tiêu chí và chi phí, cập nhật hàng B4 và C2 của `misc/thao-luan/concerns.md`, archive `tasks/` vào `tasks/archive/pilot-3/`; PR tài liệu.
- [ ] **5b. Hướng dẫn sử dụng cho người dùng cuối của v0.3.0** (Task tài liệu riêng của `shop`, không gộp SHOP-73; Claude viết trong phiên chính): `docs/user-guide/`, tiếng Việt, từ AC1–AC28, `design.md` và ảnh QA thật; phần quản trị viên (danh sách, thêm, sửa, ẩn và hết hàng, xóa, các lỗi khi nhập, khi người khác vừa sửa, khi mất mạng) và phần khách (danh sách, tải thêm, tìm không dấu, sắp xếp, chia sẻ link, trang chi tiết, trang không tìm thấy, ngôn ngữ, giao diện sáng và tối), mỗi phần một mục "Khi gặp lỗi".
- [ ] **6. Xếp lại followup của kit, trước C1; sửa trước tiên lỗi gh-guard để lọt lệnh tìm khóa riêng (Medium của review PR #74)** (33 mục mở trong `handoff-2026-11-16-followups.md`) thành danh sách làm trước C1, ưu tiên lỗi lặp lại: agent kết thúc lượt khi test còn chạy nền; worktree QA thiếu `.env`; dọn tiến trình khi QA bị dừng; không approve khi có QA chạy; merge-gate không merge PR merge ngược; Task vận hành không PR. Bạn duyệt danh sách, rồi làm.
- [ ] **7. Backlog có hạn (không thuộc pilot):** SHOP-70 và SHOP-72 trước khi gỡ basic auth của Production (trước Epic Đăng nhập; bạn Refine trước); SHOP-40 (đưa `JIRA_CI_TOKEN` ra khỏi máy chạy agent) cùng tài khoản Windows `ao-agent`, trước 2026-12-31 (mục ở trên); **[bạn] kiểm khóa `age` đã cất rồi sinh cặp khóa mới** (việc của T19, cần máy chưa từng chạy agent hoặc `ao-agent`; `vps-setup.md` mục 16, bước 6), cùng hạn; release v0.4.0 hoặc đưa `pr-events.yml` lên `main` trước 2026-12-02 (followup của review PR #74); gỡ ngoại lệ picomatch khi có bản vá, trước 2026-12-31; đóng VPS (`PermitRootLogin no`, gỡ khóa) khi bạn nói "đóng VPS".

# Task: project-scaffold, phần 2 (B2)

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-project-scaffold-2.md](../SPEC-project-scaffold-2.md). Làm theo thứ tự. Mỗi task viết test đỏ trước.

**Quy ước:**
- Xong mỗi task thì năm lệnh kiểm phải xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`. Task đụng `profiles/` hay `lib/scaffold/` thì chạy thêm `npm run profiles:check`.
- Mỗi chặng code một nhánh `task/scaffold2-<N>` tách từ `main`, mỗi task một commit. Merge qua PR khi CI xanh.
- Commit theo `CLAUDE.md`.
- Task có nhãn **[bạn]** cần bạn bấm, hoặc cần bạn cho phép trước một việc trên VPS.

## Chuẩn bị

- [x] **T1: tài liệu.** Spec ghi đã duyệt; plan, todo; nhật ký Lượt 198–201. PR tài liệu từ nhánh `task/project-scaffold-2`, tự merge khi CI xanh.

## Chặng 1: pnpm, nhánh `task/scaffold2-1`

- [x] **T2: `package-manager.mjs` và `package_manager`** (spec 2.1; plan, quyết định 3, 4).
  - **Đạt khi:**
    - `lib/quality/package-manager.mjs` trả về, cho npm và pnpm: lockfile, lệnh cài, lệnh cài `--ignore-scripts`, lệnh chạy script, dạng lệnh `dev` cho một app, lệnh audit;
    - nó chạy pnpm không qua shell: trên Windows qua `node <pnpm.cjs>`, và không thấy file đó thì báo lỗi nói cách cài;
    - nó đọc bản pnpm từ `packageManager`, bỏ phần hash;
    - `project.schema.json` có `package_manager` (`npm` | `pnpm`, mặc định `npm`);
    - `ao-kit check` báo khi `package_manager` không khớp lockfile ở gốc, hay khi dự án pnpm thiếu `packageManager`.
  - **Kiểm:** `tests/quality/package-manager.test.mjs`; thêm ca vào `tests/scaffold/project-config.test.mjs`. `project.yaml` của `ao-sample` vẫn hợp lệ.
  - **File:** `lib/quality/package-manager.mjs`, `lib/scaffold/project.schema.json`, `lib/scaffold/project-config.mjs`, test.
- [x] **T3: CI cho pnpm** (spec 2.1).
  - **Đạt khi:**
    - job `build-test` của `kit/.github/workflows/ci.yml`: có `pnpm-lock.yaml` ở gốc thì cài pnpm đúng bản, `pnpm install --frozen-lockfile`, rồi chạy bốn script bằng `pnpm run`; không có thì giữ nguyên bước npm;
    - `setup-node` dùng cache đúng loại lockfile;
    - `scripts/check-policy.mjs` chạy `pnpm audit --json` khi có `pnpm-lock.yaml`, và đọc kết quả như `npm audit`.
  - **Kiểm:** `tests/quality/ci-workflow.test.mjs` chạy các bước bằng bash với cả hai loại lockfile, như test chặn `workflow_dispatch` hiện có; test của `check-policy` với kết quả `pnpm audit` mẫu.
  - **File:** `kit/.github/workflows/ci.yml`, `scripts/check-policy.mjs`, test.
- [ ] **T4: `/ao-preview` và worktree cho pnpm** (spec 2.1).
  - **Đạt khi:**
    - lệnh `dev` được nhận khi là `pnpm` với các từ thường, như `pnpm --filter ./apps/user run dev`, ngoài `npm` và `node`;
    - `/ao-preview` so `pnpm-lock.yaml` để biết có phải cài lại không, và cài bằng `pnpm install --frozen-lockfile --ignore-scripts`;
    - worktree của `ao-step` (cho `qa`) cài bằng lệnh cài `--ignore-scripts` của đúng loại.
  - **Kiểm:** test của `preview`, `preview-run` và worktree, với dự án pnpm giả; ca npm cũ không đổi.
  - **File:** `lib/workflow/preview.mjs`, `lib/workflow/preview-run.mjs`, `scripts/ao-step.mjs`, test.
- [ ] **T5: `init` và `doctor` cho pnpm** (spec 2.1, 2.2).
  - **Đạt khi:**
    - `ao-kit init <dir> --package-manager pnpm` trên thư mục trống chép profile `base-pnpm`: `package.json` (có `packageManager`, bốn script `pnpm -r run`, script `prepare` và `precommit`), `pnpm-workspace.yaml`, `playwright.config.ts`, `e2e/`, cùng kit và `project.yaml` chưa có app;
    - `init` trên repo pnpm đang có đọc app từ `packages` của `pnpm-workspace.yaml`, và nhận ra app React chạy bằng Vite là stack `react`;
    - `doctor` có dòng kiểm bản pnpm trên máy so với `packageManager`;
    - `readProfile` bỏ qua thư mục không có `profile.yaml`.
  - **Kiểm:** test của `init` trên thư mục tạm thật với cả hai trường hợp; test của `doctor`.
  - **File:** `profiles/base-pnpm/`, `lib/scaffold/init.mjs`, `lib/scaffold/profile.mjs`, `lib/scaffold/doctor.mjs`, `scripts/ao-kit.mjs`, test.
- [ ] **T6: tài liệu chặng 1; PR.** `docs/quality-gates.md` (CI cho pnpm), `README.md` (cây thư mục), comment đầu file; PR chặng 1.

### Checkpoint 1: sau T6
- [ ] PR chặng 1 merge, CI xanh. Năm lệnh kiểm xanh; test của dự án npm không đổi.

## Chặng 2: stack và `ao-kit add`, nhánh `task/scaffold2-2`

- [ ] **T7: stack `nextjs` (pnpm)** (spec 2.3).
  - **Đạt khi:**
    - `profiles/stacks/nextjs/stack.yaml` có giá trị mặc định của app (lệnh `dev`, cổng, `health`), skill của `fe-dev`, và các luật báo chỗ code phải đổi;
    - `files/` là `apps/web` của `next-nest` chuyển sang pnpm, với `output: 'standalone'`;
    - Dockerfile cài bằng pnpm từ lockfile ở gốc, build Next.js standalone, chạy bằng user `node`, không phải root.
  - **File:** `profiles/stacks/nextjs/`, `lib/scaffold/profile.mjs` (`readStack`), test.
- [ ] **T8: stack `react`** (spec 2.3).
  - **Đạt khi:**
    - khung app Vite + React + TypeScript, Vitest (ghi lcov), ESLint, ghim bản;
    - app đọc cổng từ `PORT`; `vite.config.ts` chuyển `/api` sang API ở máy;
    - Dockerfile build file tĩnh rồi phục vụ bằng Caddy trong container: không root, cổng 8080, tắt admin API của Caddy, `/api/*` chuyển tới `api` trên mạng Docker của môi trường, đường dẫn lạ trả `index.html`.
  - **File:** `profiles/stacks/react/`, test.
- [ ] **T9: `profiles:check` cho dự án pnpm** (spec 2.3; plan, quyết định 5).
  - **Đạt khi:** `npm run profiles:check` dựng `next-nest` như hiện nay, và dựng thêm một dự án gồm `base-pnpm`, app `web` (stack `nextjs`) và app `admin` (stack `react`). Trên dự án đó, lệnh chạy `pnpm install` và bốn script ở gốc. Workflow `profiles.yml` cài pnpm.
  - **Kiểm:** chạy trên máy và trong CI của kit.
  - **File:** `scripts/profiles-check.mjs`, `.github/workflows/profiles.yml`.
- [ ] **T10: chép template** (spec 2.2; plan, quyết định 6, 7).
  - **Đạt khi:**
    - chép đúng file đã commit ở `HEAD` của template; bỏ những gì `--exclude` chỉ ra; báo khi template có thay đổi chưa commit;
    - bỏ đúng danh sách của spec 2.2, và in từng file đã bỏ;
    - `package.json` của app mất script `prepare: husky` và các devDependency `husky`, `@commitlint/*`;
    - cài đặt pnpm của template gộp vào `pnpm-workspace.yaml` ở gốc. Một khóa mà hai template đặt khác nhau thì dừng, và in cả hai giá trị;
    - `CLAUDE.md` thành skill `<app>-conventions`.
  - **Kiểm:** `tests/scaffold/template.test.mjs`, trên thư mục tạm thật, với hai template giả có husky, commitlint, `.github/`, `.claude/`, `CLAUDE.md` và lockfile riêng.
  - **File:** `lib/scaffold/template.mjs`, test.
- [ ] **T11: `ao-kit add`** (spec 2.2, 2.3).
  - **Đạt khi:**
    - không có `--from` thì chép khung của stack; có `--from` thì dùng T10;
    - ghi app vào `project.yaml` (`hosts` là `TODO` khi `--public`), `deploy.yaml` và `roster.local.yaml`; chép Dockerfile của stack khi app chưa có;
    - chạy `pnpm install` ở gốc, rồi `render`;
    - báo các chỗ code app phải đổi: thiếu `output: 'standalone'`, cổng không lấy từ biến môi trường, thiếu script, và biến nhúng lúc build trong `.env.example`;
    - từ chối dự án npm, và app đã có.
  - **Kiểm:** `tests/scaffold/add.test.mjs` trên thư mục tạm thật, với hàm cài giả; chạy lại không đổi gì.
  - **File:** `lib/scaffold/add.mjs`, `lib/scaffold/app-report.mjs`, `scripts/ao-kit.mjs`, test.
- [ ] **T12: repo public** (spec 2.2, câu 1 của mục 9).
  - **Đạt khi:**
    - `setup github` trên repo public đặt giới hạn tương tác `collaborators_only` sáu tháng và luật duyệt workflow `all_external_contributors`; chạy lại thì gia hạn giới hạn tương tác;
    - repo private thì bỏ qua hai việc này, và nói vậy;
    - `doctor` báo khi giới hạn tương tác hết hạn trong vòng 30 ngày, hoặc không còn.
  - **Kiểm:** test với GitHub giả, như test của `setup github` hiện có.
  - **File:** `lib/scaffold/setup-github.mjs`, `lib/scaffold/doctor.mjs`, test.
- [ ] **T13: tài liệu chặng 2; PR.** `README.md`, comment đầu file; PR chặng 2.

### Checkpoint 2: sau T13
- [ ] PR chặng 2 merge; `profiles:check` xanh trong CI của kit, với dự án pnpm.

## Chặng 3: nhiều app công khai, nhánh `task/scaffold2-3`

- [ ] **T14: luật và cấu hình** (spec 2.4; plan, quyết định 8).
  - **Đạt khi:**
    - D2 của `deploy.yaml` đòi ít nhất một app công khai;
    - `deployer.schema.json` và `deployer-config.mjs` nhận cả hai dạng `hosts`; host không trùng trên cả VPS;
    - `project.yaml` có `hosts` cho app công khai; `ao-kit check` kiểm app công khai nào cũng có `hosts` đủ ba môi trường, app không công khai thì không có, và host không trùng;
    - `doctor` in đoạn `deployer.yaml` theo dạng đúng: một app công khai thì dạng cũ, từ hai app thì dạng theo app.
  - **Kiểm:** fixture đúng và sai cho hai dạng; `npm run validate` vẫn qua `vps/deployer.example.yaml`.
  - **File:** `lib/release/deploy-config.mjs`, `lib/release/deployer.schema.json`, `lib/release/deployer-config.mjs`, `lib/scaffold/project.schema.json`, `lib/scaffold/project-config.mjs`, `lib/scaffold/doctor.mjs`, fixture, test.
- [ ] **T15: deployer, Caddy, bản ghi** (spec 2.4).
  - **Đạt khi:**
    - deployer tìm host của từng app công khai; thiếu thì không deploy, và ghi lý do;
    - `AO_PUBLIC_URL` và host của smoke test theo từng app;
    - `current.public` là danh sách, bản ghi cũ vẫn đọc được;
    - `environment_url` là URL của app công khai đầu tiên;
    - Caddy có một site cho mỗi host.
  - **Kiểm:**
    - test đỏ trước: Caddyfile của cấu hình một app công khai giống hệt chữ với bản hiện nay;
    - hai app công khai ra hai site; thiếu host thì từ chối; bản ghi cũ đọc được.
  - **File:** `lib/release/caddy.mjs`, `lib/release/docker.mjs`, `lib/release/deployer.mjs`, `lib/release/record.mjs`, `scripts/ao-deploy.mjs`, test.
- [ ] **T16: `qa`, `/ao-status`, Playwright** (spec 2.4; plan, quyết định 9).
  - **Đạt khi:**
    - `/ao-qa` và regression của `/ao-release` truyền `E2E_<APP>_URL` cho từng app công khai, lấy từ `project.yaml` của commit đang chạy;
    - `ao-step` dừng, và nói hai file lệch nhau, khi host của `environment_url` không khớp app nào;
    - prompt của `qa` nói về các biến này;
    - `/ao-status` in URL của mọi app công khai;
    - `playwright.config.ts` của `base-pnpm` dựng project từ app công khai của `project.yaml`, với basic auth cho đúng origin của từng app.
  - **Kiểm:** test của `steps`, `prompts`, `facts`; dự án một app vẫn chỉ có `E2E_BASE_URL` như cũ.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, `lib/workflow/facts.mjs`, `agents/prompts/qa.md`, `profiles/base-pnpm/playwright.config.ts`, test.
- [ ] **T17: tài liệu chặng 3; PR.** `docs/vps-setup.md` (`hosts` theo app, DNS), `docs/release-workflow.md`, `vps/deployer.example.yaml`; PR chặng 3.

## Chặng 4: ảnh chụp và design system, nhánh `task/scaffold2-4`

- [ ] **T18: `check-design` và template** (spec 2.5).
  - **Đạt khi:**
    - D7: màn hình có ảnh khai đúng một trong `figma`, `screenshot`; dòng `Figma version:` chỉ bắt buộc khi có màn hình Figma;
    - D9: có màn hình Figma hay Ảnh thì phải có mục `## Design System`;
    - `templates/design.md` có kiểu Ảnh, khóa `screenshot`, mục Design System, và ví dụ có một màn hình Ảnh.
  - **Kiểm:** fixture âm cho D7 mới và D9; ví dụ của template qua; fixture Figma cũ vẫn qua.
  - **File:** `lib/quality/design.mjs`, `templates/design.md`, `tests/fixtures/design/`, `tests/quality/design.test.mjs`.
- [ ] **T19: prompt; PR** (spec 2.5).
  - **Đạt khi:**
    - `ux`: màn hình Ảnh, lấy ảnh từ `.ai/design-inbox/<EPIC>/`, mục Design System so với `docs/design-system/<app>.md`;
    - `sa`: Task "Design system của <app>" đứng đầu Task List khi app chưa có `docs/design-system/<app>.md` hay có mục "mới";
    - `fe-dev` dựng màn hình Ảnh như màn hình Figma; Task design system viết `docs/design-system/<app>.md`;
    - `qa` so trang với ảnh của màn hình Ảnh;
    - `templates/plan.md` nhắc Task này.
  - **Kiểm:** `npm run agents:check` sau khi render; test của prompt, nếu có.
  - **File:** `agents/prompts/ux.md`, `sa.md`, `fe-dev.md`, `qa.md`, `templates/plan.md`, `kit/.claude/agents/` (sinh lại), `docs/agents.md`; PR chặng 4.

### Checkpoint 3: sau T17 và T19
- [ ] Hai PR merge, CI xanh. Caddyfile của dự án một app giống hệt bản cũ.

## Chặng 5: kiểm thật và hướng dẫn

- [ ] **T20: bản nháp của hướng dẫn** (spec 2.6). Phần "Dự án nhiều app, dựng từ template của bạn" theo năm bước của spec; đoạn ảnh chụp và Task design system trong phần 5; `ao-kit add` trong bảng tra lệnh. Đi cùng PR của T25.
- [ ] **T21 [bạn]: VPS** (câu 3 của mục 9). Mỗi bước hỏi bạn trước:
  1. đo RAM bằng lệnh chỉ đọc (`free -m`, `docker stats --no-stream`);
  2. cập nhật kit trên VPS lên bản có chặng 3, giữ bản cũ để quay lại;
  3. chạy deployer `--dry-run`: Caddyfile của `ao-sample` và `ao-pilot` không đổi;
  4. bật lại deployer.
  - **Kiểm:** ghi vào `tasks/verification.md`, không ghi nội dung file có thông tin đăng nhập.
- [ ] **T22 [bạn]: dựng repo `shop`** (tiêu chí 2). Làm đúng theo bản nháp:
  1. tạo thư mục `e-commerce/shop/` và repo public `TungPH7/shop`;
  2. `init --package-manager pnpm`;
  3. `add user --stack nextjs --from <template Next.js> --public` và `add admin --stack react --from <template React> --public`, bỏ `study-guide-impl/`, `frontend-technical/`, `docs/readme/`;
  4. `setup jira` (space `SHOP`), commit đầu, push `develop` và `main`, `setup github`;
  5. **bạn:** cài hai App vào repo, nối GitHub for Jira;
  6. `doctor`.
  - **Kiểm:** `doctor` đạt mọi dòng; CI xanh trên `develop`. Chỗ nào hướng dẫn sai hay thiếu thì sửa hướng dẫn trước khi đi tiếp.
- [ ] **T23 [bạn]: sửa code app** (tiêu chí 3).
  - `/ao-intake` tạo một Task cho các chỗ `add` đã báo. Phiên chính sửa trên nhánh của Task, rồi mở PR.
  - `/ao-preview` chạy hai app của PR trên máy bạn. **Bạn** xem, rồi merge khi CI xanh.
  - Task được Cancel, kèm comment trỏ tới PR, như `AOG-3`.
- [ ] **T24 [bạn]: Development chạy hai host** (tiêu chí 4).
  1. **Bạn:** thêm bản ghi DNS cho `shop-dev` và `shop-admin-dev`, nếu domain chưa có wildcard;
  2. mình hỏi rồi thêm `shop` vào `deployer.yaml` trên VPS, cùng secret của Development;
  3. deployer deploy `develop`: smoke test đạt; hai host qua basic auth;
  4. Caddyfile của `ao-sample` và `ao-pilot` không đổi, hai dự án vẫn chạy;
  5. đo RAM lần nữa.
- [ ] **T25: bản cuối của hướng dẫn; PR** (tiêu chí 5). Chép đầu ra thật của T21–T24.

### Checkpoint 4: sau T25
- [ ] Tiêu chí 2, 3, 4, 5 của spec đạt.

- [ ] **T26: đóng module.** Bảng sáu tiêu chí trong `verification.md`; dời plan, todo, verification vào `tasks/archive/project-scaffold-2/`; cập nhật `SPEC.md`, spec và `concerns.md`; PR tài liệu.

# Kiểm thật: project-scaffold, phần 2 (B2)

> **Spec:** [SPEC-project-scaffold-2.md](../SPEC-project-scaffold-2.md). **Plan:** [plan.md](plan.md). **Task:** [todo.md](todo.md).

## T1 (2026-11-13)

Kit PR #261 (`9fdeb20`): spec đã duyệt, plan, todo, nhật ký Lượt 198–200.

## Chặng 1: pnpm (T2–T6), nhánh `task/scaffold2-1`

**T2.** `lib/quality/package-manager.mjs` là chỗ duy nhất biết npm hay pnpm. Trên máy Windows của bạn có hai bản pnpm 11.8.0:
- shim của corepack trong thư mục Node, gọi `node_modules/corepack/dist/pnpm.js`; shim này lấy đúng bản mà `packageManager` ghi;
- gói `pnpm` cài toàn cục, `node_modules/pnpm/bin/pnpm.cjs`.

Module tìm gói toàn cục trước, rồi tới corepack, và chạy bằng `node`, không qua shell. Test chạy `pnpm --version` thật qua đường này. Luật mới C4 của `ao-kit check`: lockfile ở gốc phải khớp `package_manager`, và dự án pnpm phải ghi `packageManager`.

**T3.** `pnpm audit --json` của pnpm 11.8.0 trả về dạng cũ, kiểu npm 6 (`advisories` theo id, `module_name`), khác `npm audit` (`vulnerabilities`, `via`). Kết quả này có được khi chạy thử trên template React của bạn. `auditProblems` đọc được cả hai dạng.

**Cần làm ở T22:** template React hiện có 47 cảnh báo high và 1 critical (`pnpm audit`, ngày 2026-11-13; ví dụ `brace-expansion`, GHSA-3jxr-9vmj-r5cp). Với ngưỡng `audit_level: high` của `gates.yaml`, job `policy` của `shop` sẽ đỏ cho tới khi các dependency được nâng bản, hoặc thêm `overrides`, hoặc có ngoại lệ có hạn.

**T4.** `/ao-preview` cài bằng `pnpm install --frozen-lockfile --ignore-scripts` khi `pnpm-lock.yaml` khác lần cài trước, và chạy app qua `pnpm.cjs`. Thông báo của dự án npm giữ nguyên chữ. Phần cài trong worktree của `qa` nằm thẳng trong `scripts/ao-step.mjs` (`addWorktree`), nên chưa có test riêng. Phần đó dùng `managerFromLockfile` và `installArgs`, vốn đã có test; lần chạy thật đầu tiên sẽ là `/ao-qa` trên `shop`.

**T5.** Thử thật profile `base-pnpm` trên thư mục tạm: `pnpm install` dùng pnpm 11.8.0, tạo `pnpm-lock.yaml` trong khoảng 5 giây. `pnpm -r run lint` khi chưa có app in "No projects matched the filters" và thoát mã 0. `.gitignore` của profile giữ `.env.example`, vì template của bạn commit file này.

## Chặng 2: stack và `ao-kit add` (T7–T13), nhánh `task/scaffold2-2`

**Luật cổng (Lượt 203):** bạn đồng ý thêm `**/pnpm-workspace.yaml` vào `security_review.roster_effort_paths`.

**T7–T9.** `profiles:check` dựng `base-pnpm` cùng app `web` (stack `nextjs`) và app `admin` (stack `react`):
- `pnpm install` mất 186 giây ở lần tải gói đầu tiên;
- lint, typecheck, test:coverage, build đều xanh;
- `next-nest` vẫn qua đủ năm bước, chạy qua `runManager`.

Skill `vercel-react-best-practices` không chép thêm bản nào: `add` lấy nó ở `profiles/next-nest/files/.claude/skills/` (`findSkill`).

**T10–T11, thử trên hai template thật của bạn** (Next.js `2660424f`, React `06f0cf54`), trong một dự án tạm:
- `copyTemplate` chép 237 và 170 file, bỏ `study-guide-impl/`, `frontend-technical/`, `docs/readme/`. Các thư mục và file bị bỏ: `.husky/`, `.commitlintrc.json`, `.github/`, `.nvmrc`, `playwright.config.ts`, lockfile, workspace. `CLAUDE.md` thành skill `user-conventions` và `admin-conventions`.
- `pnpm-workspace.yaml` ở gốc gộp đủ `allowBuilds` của hai template (`sharp: true`; `unrs-resolver`, `msw`, `esbuild`, `@parcel/watcher`, `@swc/core`: `false`) và `minimumReleaseAgeExclude: [lint-staged]`, không xung đột.
- `pnpm install` 81 giây; lint xanh.
- **Typecheck đỏ ở `apps/user/e2e/accessibility.spec.ts`:** repo có hai bản Playwright, 1.64.1 ở gốc (`base-pnpm`) và 1.61.0 ở template. Đã sửa trong `template.mjs`: gốc lấy bản của template đầu tiên, app sau lấy bản của gốc.
- `test:coverage` xanh, 98 giây, nhưng `apps/admin/coverage/` không có `lcov.info`. `add` báo đúng chỗ này.
- **Build đỏ ở `apps/user`:** schema env của template (`src/config/env/client.ts`) đòi `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_SITE_URL` lúc build. `add` báo hai biến này; việc sửa thuộc T23, và CI cũng cần chúng có giá trị chung cho ba môi trường.
- `rm -rf .next` trong script `dev` và `build` của template chạy được qua pnpm trên Windows.

**T12.** `setup github` trên repo public đặt giới hạn tương tác (`collaborators_only`, sáu tháng) mỗi lần chạy, nên chạy lại là gia hạn. Lệnh cũng đặt luật duyệt workflow `all_external_contributors` khi chưa có. `doctor` báo chưa đạt khi giới hạn còn dưới 30 ngày hoặc không còn. Định dạng trả về của hai API này khớp với lần đọc thật trên `ao-sample`: `expires_at` là 2027-05-13T02:42:22Z, `approval_policy` là `all_external_contributors`.

**Build Docker của hai stack trên máy (Lượt 204).** Mình bật Docker Desktop bằng `Start-Process`; engine 24.0.7 chạy sau 13 giây. Dự án tạm gồm `base-pnpm`, `web` (stack `nextjs`) và `admin` (stack `react`), build từ gốc repo như deployer:

| | `web` (Next.js) | `admin` (React, Caddy) |
|---|---|---|
| `docker build` | 50 s, image 268 MB | 40 s, image 103 MB |
| Chạy với `--cap-drop ALL --security-opt no-new-privileges` | chạy, `GET /` 200 | chạy, `GET /` 200 |
| Khác | | `GET /orders/42` 200 (trả `index.html`); `GET /api/health` 502, vì chưa có app `api` |
| RAM lúc rảnh | 51 MiB | 16 MiB |

Cả hai trang có `<html`, nên smoke check mà `add` ghi vào `deploy.yaml` qua được. Sau khi kiểm, container, image và thư mục tạm đã được xóa.

## Chặng 3: nhiều app công khai (T14–T17), nhánh `task/scaffold2-3`

**T14.**
- `lib/release/hosts.mjs` đọc `hosts` của `deployer.yaml` ở hai dạng: một host cho mỗi môi trường (dạng cũ), hoặc host theo từng app. Hai dạng phân biệt bằng kiểu giá trị, không bằng tên khóa.
- Schema dùng `if/then/else`, nên các fixture V1 cũ vẫn báo đúng đường dẫn lỗi.
- D2 đòi ít nhất một app công khai. Fixture `d2-second-public-app` đã xóa, vì giờ đó là file hợp lệ.
- `project.yaml` có thêm luật:
  - P8: chỉ app công khai mới có `hosts`;
  - P9: không host nào dùng hai lần;
  - C5: từ hai app công khai trở lên thì mỗi app khai `hosts`. C5 nằm ở `checkProject`, nên `add` và render vẫn chạy trong lúc bạn chưa điền host.
- `doctor` in đoạn `deployer.yaml` theo dạng host theo app khi có từ hai app công khai.

**T15.**
- Caddyfile của cấu hình một app công khai giống hệt chữ bản cũ: test so nguyên văn vẫn xanh.
- Bản ghi cũ, lưu `public` dạng object, cho cùng Caddyfile với bản ghi mới lưu dạng danh sách.
- Hai app công khai cho hai site ở mỗi môi trường. App chưa chạy ở môi trường nào thì site đó trả 503.
- Installer đặt `AO_PUBLIC_URL` và host của smoke test theo từng app. Thiếu host, hoặc có hai app công khai mà chỉ khai một host cho mỗi môi trường, thì installer không build gì và trả `error` kèm lý do.

**T16.** `facts.mjs` đọc `project.yaml` ở commit đang chạy qua API `contents` của GitHub, rồi:
- `/ao-qa` và regression của `/ao-ship` nhận `E2E_<APP>_URL` của từng app công khai;
- prompt của `qa` nêu URL của từng app;
- `/ao-qa` dừng khi host của `environment_url` không khớp app nào trong `project.yaml`;
- `/ao-status` in URL của mọi app công khai ở mỗi môi trường đang chạy.

Dự án không khai `hosts` thì vẫn chỉ có `E2E_BASE_URL`, như cũ.

**T17.**
- `docs/release-workflow.md` thêm phần nhiều app công khai, `AO_PUBLIC_URL` của từng app và `E2E_<APP>_URL`.
- `docs/vps-setup.md`, mục 11, thêm dạng host theo app.
- `vps/deployer.example.yaml` thêm ví dụ dạng đó trong comment.
- DNS đã có bản ghi wildcard `*.ao.t2g.io.vn` (mục 7), nên các host của `shop` không cần bản ghi mới. Bước DNS của T24 không còn việc gì.

## Chặng 4: ảnh chụp và design system (T18–T19), nhánh `task/scaffold2-4`

**T18.** `check-design`:
- màn hình có ảnh khai đúng một trong `figma` hoặc `screenshot` (D7). Dòng `Figma version:` chỉ bắt buộc khi có màn hình Figma;
- có màn hình Figma hay Ảnh thì phải có mục `## Design System` (D9, luật mới).

Thay đổi đi kèm:
- Các fixture D7 cũ và `figma.md` có thêm mục Design System ở cuối, nên số dòng mà test kiểm không đổi.
- Fixture mới: `d7-figma-and-screenshot`, `d9-no-design-system`. Một test dựng màn hình Ảnh từ `figma.md` và kiểm bốn trường hợp: hợp lệ, `screenshot` rỗng, thiếu cả hai khóa, thiếu mục Design System.
- Template `design.md` có kiểu Ảnh, màn hình mẫu `S3` dùng `screenshot:`, và mục Design System ở cả phần hướng dẫn lẫn phần Example.
- Ghi chú của `contract/policies.yaml` về thư mục `design/` nhắc tới cả kiểu Ảnh; `docs/sdlc.md` và rules đã render lại.

**T19.** Prompt:
- `ux`: màn hình Ảnh lấy ảnh từ `.ai/design-inbox/<EPIC>/` và ghi `screenshot:`; mục Design System so với `docs/design-system/<app>.md`, đánh dấu "có" hay "mới";
- `sa`: Task `fe-dev` "Design system của <app>" đứng đầu Task List;
- `fe-dev`: dựng màn hình Ảnh như màn hình Figma; Task design system viết `docs/design-system/<app>.md`;
- `qa`: so trang với ảnh bằng mắt.

`templates/plan.md` và `docs/agents.md` cũng cập nhật theo. `docs/agents.md` có thêm mục "Đưa ảnh chụp màn hình vào repo": thu nhỏ ảnh bằng Paint, và ảnh chụp trang của người khác chỉ dùng để tham khảo bố cục.

Phần này được kiểm thật lần đầu ở Epic đầu của B4 (câu hỏi 2, mục 9 của spec).

## Chặng 5: kiểm thật và hướng dẫn

**T21, VPS (Lượt 206, bạn mở VPS: nạp key và mở đăng nhập root).**
- **RAM trước khi thêm `shop`:**
  - tổng 3.915 MB, đã dùng 1.000 MB, còn sẵn 2.914 MB; swap 4.095 MB chưa dùng;
  - mười container, ba môi trường của `ao-pilot` và `ao-sample` cộng Caddy, dùng khoảng 480 MiB, mỗi container 32–68 MiB;
  - đĩa còn trống 26 GB trên 38 GB.
- **Cập nhật kit** lên `c49b0510030098e2ef15c279fbe8ba4462c9a4ef`, theo mục 12 của `docs/vps-setup.md`:
  - bản cũ (`521e031`) không bị xóa mà được đổi tên thành `/opt/ao/kit.prev`, để quay lại khi cần; mục 12 giờ ghi cách này;
  - `tick --dry-run` không in gì;
  - mã băm của Caddyfile (`7966209d…`) không đổi qua cả `--dry-run` lẫn một lượt chạy thật;
  - lượt chạy thật thành công sau 15 giây, log không có lỗi, 10 container vẫn chạy.
- **Kiểm từ máy bạn:** `sample.ao.t2g.io.vn` trả 307 (chuyển sang `/notes`), `pilot.ao.t2g.io.vn` trả 200, các host Development và Staging trả 401.
- **Đóng lại:** đăng nhập root đã tắt (`PermitRootLogin no`), và SSH bằng root bị từ chối. Bạn cần gỡ key khỏi ssh-agent. T24 sẽ cần mở lại như mục 9.

**Dọn VPS (Lượt 207, bạn yêu cầu, bạn mở lại root).** Mình kiểm kê trước, rồi mới xóa:
- container: 10, cả 10 đang chạy, không có container dừng;
- volume: `caddy_config` và `caddy_data`, Caddy đang dùng nên giữ;
- network: sáu network, mỗi dự án ba môi trường, không thừa cái nào;
- image: 15, cộng lại 560 MB, nhưng chỉ thu lại được 57 MB vì các bản dùng chung layer. Mình giữ các image `ao-*`, là các bản deployer giữ để rollback (`treesToKeep`) và tự dọn sau mỗi lần deploy, và giữ `node:24-bookworm-slim`, image gốc của mọi lần build;
- build cache: 4,7 GB, không bản nào đang dùng, nên xóa hết bằng `docker buildx prune --all`. Deployer tự giữ tối đa 4 GB (`PRUNE_CACHE`), nên lần build kế tiếp của mỗi dự án sẽ chậm hơn.

Kết quả: đĩa dùng giảm từ 13 GB xuống 7,9 GB, còn trống 30 GB; 10 container vẫn chạy. Đăng nhập root đã đóng lại.

**T22, dựng `shop` (Lượt 207, đang làm).** Bạn chọn nhánh `write-cv` cho cả hai template.
1. Tạo repo public `TungPH7/shop`. Thư mục dự án là `AI-for-coding/e-commerce/shop/`.
2. `init --package-manager pnpm`: 25 giây, chép 7 file của `base-pnpm`, thêm `origin`, chạy `pnpm install` và tải Chromium.
3. `add user --stack nextjs --from <template Next.js> --ref write-cv --exclude study-guide-impl/ --exclude frontend-technical/ --exclude docs/readme/ --public`: 35 giây, 237 file.
   - Playwright ở gốc đổi từ 1.64.1 sang 1.61.1, bản của template.
   - Chép thêm Dockerfile của stack, vì template chưa có.
   - Báo ba chỗ phải sửa: reporter lcov, `output: 'standalone'`, `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_SITE_URL`.
4. `add admin --stack react --from <template React> --ref write-cv --exclude study-guide-impl/ --exclude docs/readme/ --public`: 31 giây, 170 file.
   - Playwright của app đổi từ 1.61.0 sang 1.61.1, bản của repo.
   - Chép thêm Dockerfile và Caddyfile của stack.
   - Báo bốn chỗ phải sửa: reporter lcov, cổng lấy từ `PORT`, proxy cho `/api`, `VITE_API_URL`.
5. Khai `hosts` của hai app (`shop-dev`, `shop-admin-dev`… thuộc `ao.t2g.io.vn`). `ao-kit check`: `project.yaml OK: 2 apps (user, admin), space SHOP, repo TungPH7/shop`.
6. `setup jira`:
   - lần đầu hỏng vì DNS chập chờn (`ENOTFOUND`, lỗi không được bắt, việc nhỏ cho kit);
   - lần hai tạo space `SHOP` cùng board và bộ lọc. Cột của board vẫn phải bấm tay, như với `AOG`.
7. **gitleaks báo nhầm một dòng** của template React: `STORAGE_KEY = 'tungph7.i18n.lang'`, tên một khóa localStorage. Dòng đó được đánh dấu `gitleaks:allow` kèm `reason:` trên cùng dòng, đúng luật của kit, trong commit đầu. Quét lại thì sạch.
8. **Commit đầu** `e4a708a` (799 file), 143 giây qua hook. lint-staged ở gốc tìm được config của từng app. Push `develop` và `main`.
9. **Lỗi mới, đã sửa trong kit (`5bc8120`):** typecheck của `apps/user` đỏ, vì `@axe-core/playwright` 4.12.1 kéo `playwright-core` 1.64.1 khi lockfile được tạo lại. Kit giờ ghim `overrides.playwright-core` trong `pnpm-workspace.yaml` theo bản Playwright của repo. Cách sửa này đã thử trên `shop` và typecheck xanh; thay đổi đó (chưa commit) sẽ vào PR của T23.
10. **Như ở T16:** GitHub chưa ghi nhận workflow nào sau lần push đầu, dù API báo Actions đang bật. Phải chờ bạn bấm bật trên tab Actions.

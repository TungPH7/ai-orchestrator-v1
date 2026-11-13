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

**T22, dựng `shop` (Lượt 207–209, xong).** Bạn chọn nhánh `write-cv` cho cả hai template.
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
11. **Lượt 208, phần của bạn đã xong:** sắp cột board `SHOP`, cài hai App, bật Actions, tạo key thứ hai của `ao-dev`.
    - `setup jira` chạy lại: `jira:check` đạt, nghĩa là cột, status và giới hạn WIP đều khớp.
    - GitHub nhận ba workflow (`CI`, `jira-sync`, `merge-gate`).
    - `setup github --dev-app-key-file`: 12 mục `Set …`, gồm ruleset `ao-protected` (id 27192121), giới hạn tương tác tới 2027-05-13, và luật duyệt workflow của PR từ fork.
    - Mình xóa hai file key thứ hai: của `shop`, và một file còn sót từ `ao-brown` (2026-11-12). Key mà agent dùng là file khác, giữ nguyên. Mình cũng gỡ key SSH của VPS khỏi agent.
12. **`doctor` còn 4 dòng chưa đạt:**
    - một file kit lệch: `lib/scaffold/template.mjs`, sửa sau `init`;
    - CI chưa chạy trên `develop`;
    - Claude Code chưa tin cậy thư mục;
    - hai server MCP chưa bật.
13. **CI đầu trên `develop`** (run 43406626761, chạy tay):
    - `secrets` và `sast` xanh;
    - `build-test`: cài pnpm và lint chạy được trên CI thật; typecheck đỏ, đúng lỗi hai bản `playwright-core`;
    - `policy`: 6 critical và 22 high (đếm theo advisory), ở 8 gói, đến từ cả hai template. `next` 16.2.9 có 5 critical. Ghi chú trước đây "từ template React" là sai.
14. **Dependabot** mở 4 PR ngay khi `setup github` bật cập nhật bảo mật: #1 `vite`, #2 `zod`, #3 `dompurify`, #4 `next`.
15. **Lượt 209, `doctor` đạt mọi dòng** sau khi PR #5 merge, và CI trên `develop` ở `91b699c` xanh đủ bốn job. Dòng VPS chỉ là câu hỏi, dành cho T24.
    - Bạn nhờ mình làm hai bước cuối. Claude Code không có lệnh CLI để tin cậy thư mục hay duyệt server MCP, nên mình ghi đúng hai giá trị mà hộp thoại vẫn ghi:
      - `shop/.claude/settings.local.json` có `enabledMcpjsonServers: [atlassian, chrome-devtools]`, giống file mà hộp thoại đã ghi cho `ao-brown`;
      - mục của `shop` trong `~/.claude.json` có `hasTrustDialogAccepted: true`. Mình sao lưu file trước, ghi ra tên tạm rồi đổi tên đè lên file cũ.
    - `claude mcp list` trong `shop` báo cả hai server `✔ Connected`.
    - Ghi chú cho T25: hướng dẫn vẫn giữ hộp thoại là cách chính. Cách ghi file chỉ là đường tắt khi chính bạn nhờ.

**T23, sửa code app (Lượt 208–209, xong).** Bạn cho làm tiếp theo đề xuất: "những việc bạn không có quyền thì nói tôi làm, còn lại cứ làm theo đề xuất nhé".
1. **Task `SHOP-1`** được tạo bằng token CI, theo template Task, nhãn `ao-fe-dev`, như `SMP-27`. Cách này thay cho `/ao-intake`, vì nội dung Task đã rõ.
2. `ao-kit sync --key SHOP-1` (21 giây) tạo commit `e7148a2`, 1 file. Nhánh được đổi tên thành `feature/SHOP-1-app-fixes`, vì Task này còn sửa code app.
3. **Gói:** `next` và `eslint-config-next` 16.4.6 (kéo theo `postcss` 8.5.23, `sharp` 0.35.5), `zod` 4.6.7, `react-router` 7.18.5, `axios` 1.21.1, `vite` 8.3.8, `dompurify` 3.4.17. Kết quả `pnpm audit`: 0 high, 0 critical, 4 moderate.
4. **`user`:**
   - `output: 'standalone'`;
   - script `build` không cần secret: `server.ts` bỏ qua bước kiểm khi `npm_lifecycle_event` là `build`. Server kiểm `API_URL` và `AUTH_SECRET` lúc chạy;
   - bỏ `NEXT_PUBLIC_API_URL`, vì server gọi API qua `API_URL`;
   - `NEXT_PUBLIC_SITE_URL` mặc định là origin của Production, cho cả ba môi trường;
   - `GET /api/products/count` gọi `connection()`. Trước đó build gọi API thật lúc prerender (template dựa vào API `ecom-nest` của bạn khi build);
   - coverage giữ `src/app/api/**`.
   - **Lần thử đầu** dùng `phase` của `next.config.ts` với `import()` động. Build qua, nhưng `next dev` hỏng (`Cannot find module './src/config/env/server'`). Lý do: Next chỉ bật require hook cho file `.ts` trong lúc chạy thân file config, còn hàm theo `phase` được gọi sau đó. Commit `1344a04` sửa lại.
5. **`admin`:**
   - `VITE_API_URL` không bắt buộc, mặc định `/api`;
   - dev server lấy cổng từ `PORT` (`strictPort`), và chuyển `/api` sang `API_URL` hay `http://localhost:3001`.
6. **`deploy.yaml`:**
   - `user` nhận `API_URL` và `AUTH_SECRET`;
   - `health` và đường smoke là `/en`, vì next-intl đặt `localePrefix: 'always'` nên `/` trả 307, và smoke test không theo chuyển hướng. `project.yaml` sửa theo.
7. **Image**, chạy với `--cap-drop ALL`:
   - `user`: 278 MB, 87 MiB RAM; `/en` 200, `robots.txt` ghi host Production;
   - `admin`: 104 MB, 15 MiB RAM; SPA fallback 200, `/api` 502 vì chưa có API.
8. **PR #5** (draft) được mở bằng `ao-pr.mjs`, qua App `ao-dev`. Lần CI đầu xanh đủ năm job.
9. **`/ao-preview SHOP-1` dừng có chủ ý**, vì PR sửa `.ai-orchestrator/`. Thay vào đó, mình tự chạy dev server của hai app trên nhánh PR. Bài học cho hướng dẫn: chép kit trong một PR riêng.
10. **Lượt 209, bạn nhờ mình làm các bước bấm:**
    - PR #5 được Ready, Approve và Squash merge (`91b699c`) bằng login `gh` của bạn. Trước đó `merge-gate` báo "Needs you #5", vì PR sửa đường dẫn được bảo vệ, và thiếu báo cáo `reviewer` và `security`. Deployer chỉ audit từ commit mốc đặt lúc đưa dự án lên VPS (T24), nên lần merge này không chặn deploy;
    - `SHOP-1` có comment trỏ tới PR #5, rồi chuyển Cancel với Resolution Done, qua REST bằng token admin của bạn, như `SMP-23`;
    - Dependabot tự đóng PR #1–#4, rồi mở PR #6 (`vitest` 4.1.9 → 4.1.11, lỗ hổng moderate). Hai lượt cập nhật của nó hỏng (`@vitest/mocker`, `minimatch`).
11. **Việc kit để sau:**
    - `coverage.exclude` có `e2e/**` và `scripts/**`, chỉ khớp ở gốc repo. Trong dự án pnpm, `apps/<app>/e2e/` và `apps/<app>/scripts/` vẫn bị tính là nguồn;
    - luật "file đổi phải có trong lcov" đụng với coverage exclude của template (`src/app/**`);
    - stack `nextjs` của `add` ghi `health: /`, mà với next-intl `localePrefix: 'always'` thì `/` trả 307;
    - `ao-pr.mjs` chạy từ phiên ngoài thư mục dự án cần `AO_DEV_APP*` lấy từ `.claude/settings.json`.
    - Ngoài kit: sau `pnpm add` và đổi nhánh, `node_modules` trên máy mất link `zod` được treo lên. `pnpm install` báo "Already up to date"; phải cài lại từ đầu.

**T24, `shop` lên Development (Lượt 210–212, xong; bạn mở VPS).**
1. **Trước khi sửa:** VPS như cuối Lượt 207: 10 container, Caddyfile `7966209d…`, còn 2.910 MB RAM trên 3.915 MB, đĩa còn trống 30 GB.
2. **Secret Development:** `/etc/ao/secrets/shop/development.env`, `root:aodeploy 640`, có hai dòng:
   - `API_URL=http://api:3001`. Tên `api` sẽ có ở B3, khi `shop` có API;
   - `AUTH_SECRET` dài 64 ký tự, sinh bằng `openssl rand -base64 48` ngay trên VPS. Giá trị đi qua `printf` có sẵn trong shell, nên không nằm trong tham số của tiến trình nào và không bị in ra.
   - Staging và Production chưa có file env. Deployer chỉ đọc file này khi deploy môi trường đó, và cả hai còn chờ bản release đầu.
3. **`deployer.yaml`:** timer được dừng, rồi chờ tới khi service không còn `activating`. Bản sao lưu nằm ở `/root/deployer.yaml.2026-11-13.bak`, Caddyfile ở `/root/Caddyfile.2026-11-13.before`. Mục `shop` có host theo từng app, đúng đoạn `doctor` in ra.
4. **`baseline shop` dừng:** `App 5624698 is not installed on TungPH7/shop`. Ở Lượt 208, bạn mới cài `ao-dev` và `ao-review`; `ao-deploy` thì chưa.
   - `deployer.yaml` đã được trả về bản sao lưu, và timer đã bật lại. `tick --dry-run` không in gì, Caddyfile vẫn `7966209d…`.
   - **Lỗ hổng của kit:** bước 4 phần 3 của `getting-started.md` và bước 5 phần 5 chỉ cài `ao-dev` và `ao-review`. Bước 8 phần 5 (lên Development) cũng không nhắc tới `ao-deploy`, và `doctor` không kiểm App này. T25 phải thêm bước cài `ao-deploy` vào bước 8. `doctor` nên có một dòng kiểm App này, đọc qua token của `ao-deploy` hoặc hỏi bạn.
5. **Lần deploy đầu:** sau `baseline --confirm`, deployer coi head hiện tại của `develop` là đã xem, nên không tự deploy. Cách đúng là `/ao-rollback development <sha>` bằng login `gh` của bạn: lệnh tạo yêu cầu deploy, và deployer ghi rằng bạn đã duyệt lịch sử tới commit đó (`approveHistory`).
6. **Lượt 211, bạn cài `ao-deploy` trên `shop`:**
   - `baseline shop` in `develop` `91b699c` và `main` `e4a708a`, khớp với GitHub. Sau đó `--confirm`.
   - `tick --dry-run` chỉ báo `caddy: would write … and reload Caddy`.
   - Bật lại timer. Lượt đầu ghi Caddyfile: không dòng nào bị xóa, thêm 36 dòng cho sáu site của `shop`, mỗi site trả 503.
7. **Deploy:**
   - Bước kiểm của `ao-step.mjs rollback development 91b699c…` báo GO. Chạy từ phiên ngoài thư mục `shop` thì phải nạp `env` của `.claude/settings.json`, như `ao-pr.mjs` ở T23.
   - `--go` tạo yêu cầu `#7769885492`.
   - Deployer nhận yêu cầu sau khoảng 15 giây (`you approved the history of develop up to 91b699c`). Nó build hai image trên VPS rồi deploy xong sau 8 phút 50 giây (`deployed 91b699c`). GitHub ghi deployment là `success`.
8. **Kiểm từ máy bạn:**
   - `shop-dev`: `/` trả 307 sang `/en`. `/en` trả 200 (26 KB, title "Server-first enterprise foundation"), `/en/products` trả 200, `robots.txt` trả 200.
   - `shop-admin-dev`: `/` và `/login` trả 200, đó là SPA fallback. `/api/health` trả 502 vì chưa có API (B3).
   - Không có basic auth thì Development và Staging trả 401. Staging và Production của `shop` trả 503.
   - `sample.ao…` vẫn trả 307, `pilot.ao…` 200, `sample-dev.ao…` 401.
   - Lần gọi `/` đầu tiên trả `000` (không kết nối được), ngay sau lúc Caddy reload. Gọi lại thì bình thường.
9. **Sau deploy:**
   - Caddyfile vẫn không có dòng nào bị xóa, thêm 36 dòng; các site cũ giữ nguyên.
   - RAM còn sẵn 2.794 MB, trước đó 2.910. Hai container của `shop` dùng 55 MiB (`user`) và 11 MiB (`admin`). Swap dùng 6 MB.
   - Image trên VPS: `user` 400 MB, `admin` 144 MB. Đĩa dùng 11 GB, còn trống 28 GB.
10. **Lượt 212, đóng lại:**
    - Bạn đổi mật khẩu basic auth bằng `ao-secret.sh basic-auth`. Deployer ghi lại Caddyfile và reload Caddy sau 13 giây.
    - Kiểm bằng mã trạng thái, không in giá trị: mật khẩu cũ trả 401, mật khẩu mới vào được trên Development và Staging của cả ba dự án.
    - Bản sao Caddyfile ở `/root` đã bị xóa bằng `shred`. Bản sao `deployer.yaml` được giữ lại để quay lại khi cần; file này không có thông tin đăng nhập.
    - Đăng nhập root đã đóng (`PermitRootLogin no`), và SSH bằng root bị từ chối. Key VPS đã được gỡ khỏi ssh-agent.
    - 12 container đang chạy: 10 container cũ và 2 của `shop`.

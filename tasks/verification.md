# Kiểm thật: Pilot 1

> **Plan:** [plan.md](plan.md). **Task:** [todo.md](todo.md). **Spec:** [SPEC-pilot-1.md](../SPEC-pilot-1.md). Giờ theo giờ Việt Nam (UTC+7).

## T1: Tiền đề về khung app và `claude -p` (2026-11-01, khoảng 23:45 → 23:55)

Làm trong scratchpad, không đụng repo nào. Kit ở `main` `5603882`.

### Điểm 1: công cụ sinh khung

| Bước | Lệnh | Kết quả |
|---|---|---|
| Next.js | `npx -y create-next-app@16.4.3 apps/web --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --skip-install --disable-git --no-agent-feedback --yes` | Xong trong 3 giây. Template `app-tw`. Có `AGENTS.md` (mặc định `--agents-md`) |
| NestJS | `npx -y @nestjs/cli@12.0.11 new api --directory apps/api --package-manager npm --skip-git --skip-install --strict --no-observe` | Xong trong 3 giây |
| `npm audit --audit-level=high` sau khi cài | ở gốc workspace | **Đỏ:** 2 high (`tmp`, `undici`), cả hai qua `@nestjs/mau` (dev dependency, cho script `nest deploy`) |
| Gỡ `@nestjs/mau` và script `deploy` | `npm uninstall -w api @nestjs/mau`; `npm pkg delete scripts.deploy -w api` | `npm audit --audit-level=high` thoát 0. Còn 18 moderate và 2 low, chủ yếu qua `eslint` 9 của `eslint-config-next` |
| Build | `next build`; `nest build` | Cả hai xanh |
| Lint | `eslint .` (web); `oxlint --type-aware src/ test/` (api) | Cả hai thoát 0 |
| Typecheck | `tsc --noEmit` từng app | Cả hai thoát 0 |

**Khác với spec:**

| Mục | Spec giả định | Công cụ sinh chọn |
|---|---|---|
| Unit test của `apps/api` | Jest | **Vitest 4** (`vitest.config.ts`, `vitest.config.e2e.ts`, `@vitest/coverage-v8`) |
| Lint của `apps/api` | ESLint và Prettier | **oxlint** (`--type-aware`, `oxlint-tsgolint`) và Prettier |
| Module của `apps/api` | không nói | ESM (`"type": "module"`), Vite 8 |
| TypeScript | bản công cụ chọn | web `^5` (cài 5.9.3), api `^6.0.2` (cài 6.0.3) |
| Phiên bản khác | | React 19.3.0, ESLint 9.39.5 (npm báo deprecated), Tailwind 4 |
| `apps/api/AGENTS.md` | không nói | Quảng cáo dịch vụ NestJS Observe (telemetry trả phí) và chỉ agent cài MCP server của họ |
| `apps/web/AGENTS.md` | không nói | Dặn agent đọc tài liệu Next.js kèm trong `node_modules/next/dist/docs/`. `next dev` tự thêm lại khối này |

### Điểm 2: npm workspaces và lcov

| Bước | Kết quả |
|---|---|
| `package.json` gốc với `"workspaces": ["apps/*"]`, `npm install` | 661 gói, 2 phút |
| `npm ci` từ `package-lock.json` | Xanh, 1 phút 24 giây |
| `apps/api`: `vitest run --coverage --coverage.reporter=lcov --coverage.include='src/**'` | `apps/api/coverage/lcov.info` có 4 file, kể cả `app.service.ts` và `main.ts` mà không test nào import |
| `apps/web`: Vitest theo `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` (thêm `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`; dùng `resolve.tsconfigPaths` của Vite 8 thay cho `vite-tsconfig-paths`), một test render trang chủ | Xanh. `apps/web/coverage/lcov.info` có `layout.tsx` và `page.tsx` |
| `parseLcov` của kit (`lib/quality/coverage.mjs`) đọc hai file lcov | Đường dẫn ra đúng: `apps/web/src/app/page.tsx`, `apps/api/src/main.ts`… (lcov ghi `src\…` có dấu `\` trên Windows; kit đổi được) |

Kết quả: điểm 2 đúng nếu dùng Vitest. Giả định "Jest của từng app" sai, vì NestJS 12 không còn dùng Jest.

**Lỗ của kit tìm được khi thử oxlint:** ba file thử có `debugger;`. File không có chú thích bị báo; file có `// oxlint-disable-next-line no-debugger` và file có `// eslint-disable-next-line no-debugger` đều không bị báo. Danh sách `suppressions.patterns` trong `quality/gates.yaml` có `eslint-disable` nhưng không có `oxlint-disable`. Vì vậy, một agent tắt được lint của `apps/api` mà job `policy` không thấy.

### Điểm 5: `claude -p "/ao-status"` trong thư mục mới

Thư mục mới `t1/p5`: `git init`, remote `ao-pilot`, bản chép kit theo README bước 1–2 (script tạm `install-kit.mjs` trong scratchpad), `AO_JIRA_SPACE=DEMO`, `render-agents.mjs --project .`, `.claude/settings.local.json` có `enabledMcpjsonServers`.

| Lượt | Lệnh | Kết quả | Turn | Chi phí |
|---|---|---|---|---|
| `claude mcp list` | | `atlassian`, `chrome-devtools`: **Pending approval**. Cùng file `settings.local.json` trong `ao-pilot` (thư mục đã tin cậy) thì cả hai Connected | | 0 |
| 1 | `claude -p --model sonnet "/ao-status"` từ Git Bash | **Sai đường:** Git Bash đổi `/ao-status` thành `C:/Program Files/Git/ao-status`. Model tự chạy `ao-step.mjs status` thay cho skill. Claude Code in: "Ignoring 1 permissions.allow entry from .claude/settings.json: this workspace has not been trusted" | 5 | 0,14 USD |
| 2 | `claude -p --model sonnet` hỏi server MCP nào dùng được | `atlassian`, `chrome-devtools` và hai connector claude.ai: server của dự án vẫn nạp trong `-p` | 1 | 0,09 USD |
| 3 | `MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-status"` | **Đúng:** skill chạy, in danh sách item của `DEMO`, thoát 0, không bị từ chối quyền nào. Vẫn có dòng cảnh báo bỏ qua luật `allow` | 2 | 0,11 USD |

Kết quả:

- Từ Git Bash phải đặt `MSYS_NO_PATHCONV=1` trước `claude -p "/ao-…"`. Gõ trong phiên Claude Code thì không bị.
- Thư mục chưa tin cậy thì Claude Code bỏ qua luật `allow` của dự án. Lượt 3 vẫn chạy được, [Inference] có thể nhờ `defaultMode: auto` của bạn. Lệnh `--go` chạy lâu ở nền cần luật `allow` này, nên thư mục `ao-sample` phải được tin cậy: bạn mở `claude` trong đó một lần (README bước cài 8, spec mục 2.4).
- Không chỉnh `~/.claude.json` thay bạn, vì đó là cấu hình tin cậy của Claude Code.

Chi phí T1: 0,35 USD quy đổi (3 lượt Sonnet).

## T2: Tiền đề về GitHub và Jira (2026-11-01, khoảng 23:50 → 23:56)

| Bước | Cách | Kết quả |
|---|---|---|
| Tạo repo | `gh repo create TungPH7/ao-sample --private` | **Xong:** id 1442034339, private, trống |
| Tìm bản cài App | `GET /user/installations` bằng token `gh` | 403: endpoint chỉ nhận user token của một GitHub App |
| | `GET /users/TungPH7/installation` bằng JWT của từng App | `ao-dev` 176282622, `ao-review` 176282738, cả hai `selected` |
| Điểm 3: thêm repo vào bản cài | `PUT /user/installations/{id}/repositories/1442034339` bằng token `gh` | **Sai:** 403 "You do not have permission to modify this app on TungPH7", cả hai App |
| Điểm 4: tạo space `SMP` | `POST /rest/api/3/project` (template Kanban company-managed) bằng `JIRA_ADMIN_TOKEN` | **Sai:** 401 "Unauthorized; scope does not match". Token admin là token có scope, chỉ đủ cho `jira:check` |
| Đọc cấu hình của `DEMO` | `GET` các scheme | Workflow scheme 10002 `AO workflow scheme`; issue type scheme 10149; issue type screen scheme 10001; permission scheme 10001 `Default software scheme` |

Kết quả: điểm 3 và 4 chuyển cho bạn làm trên giao diện (plan, quyết định 1): thêm repo vào ba App ở T6, tạo space và gán scheme ở T3.

## Checkpoint 1 (2026-11-02)

Bạn duyệt sáu chỗ sửa và chọn cho `SMP` dùng chung scheme với `DEMO` ("duyệt, có dùng chung scheme với DEMO", Phiên 21 · Lượt 6). Cũng ở lượt đó, bạn duyệt trước các đề xuất của Claude trong Pilot 1: Claude chỉ hỏi khi cần bạn bấm, cần quyền hoặc cần thêm thông tin. T1a (kit PR #142) thêm `oxlint-disable` vào mẫu tắt kiểm tra.

## T4: Khung app `ao-sample` ở máy (2026-11-02)

Clone repo trống vào `D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ao-sample`, sinh khung bằng đúng flag của T1, rồi:

- `apps/api`: bỏ `AppController`, `AppService` và `AGENTS.md`; thêm `HealthController` (`GET /health`) cùng unit test; e2e của Nest đổi sang `/health`; cổng mặc định 3001; gỡ `@nestjs/mau` và script `deploy`; thêm script `typecheck`, `test:coverage`; coverage `lcovonly` cho mọi file trong `src/`.
- `apps/web`: Vitest theo hướng dẫn kèm Next.js, một test render trang chủ; script `typecheck` là `next typegen && tsc --noEmit`.
- Gốc: `package.json` có workspaces và các script; `scripts/dev.mjs` chạy hai app cùng lúc; `playwright.config.ts` chạy hai app bằng `webServer`; `e2e/smoke.spec.ts`.

| Lệnh | Kết quả |
|---|---|
| `npm install` | 618 gói, 3 phút; thêm gói test của web: 47 gói, 21 giây |
| `npm run lint` | Xanh |
| `npm run typecheck` | **Đỏ lần đầu:** `layout.tsx: Cannot find name 'LayoutProps'`. Kiểu này do Next.js sinh lúc `next dev` hay `next build`; CI chạy typecheck trước build. Sửa: chạy `next typegen` trước `tsc`. Sau đó xanh |
| `npm run test:coverage` | Xanh; `apps/web/coverage/lcov.info`, `apps/api/coverage/lcov.info` |
| `npm run build` | Xanh |
| `npm run test:e2e` | **Đỏ lần đầu:** Playwright 1.64.1 cần Chromium bản 1248, máy chỉ có 1223 và 1228. `npx playwright install chromium` (39 giây). Sau đó 2 test xanh |
| `npm audit --audit-level=high` | Thoát 0; còn 16 moderate |
| e2e của Nest (`vitest --config vitest.config.e2e.ts`) | Xanh |

## T5: Bản chép kit, skill theo stack và commit đầu (2026-11-02)

- Kit chép từ `main` `2cdb268` (sau kit PR #142), bằng script tạm `install-kit.mjs` theo README bước 1–2. `git diff --no-index` giữa kit và bản chép: không khác ở `contract`, `lib`, `tracker`, `quality`, `agents`, `templates`, `.claude/hooks`, `.githooks`. `.claude/skills/` chỉ thêm hai skill theo stack (121 file).
- `render-agents.mjs --project .`: ghi 3 trên 11 file; `--check` báo 11 file đúng. Rules ghi space `SMP`; `be-dev` có `nestjs-best-practices`, `fe-dev` có `vercel-react-best-practices`.
- `deploy.yml` chép từ `ao-pilot`. `.jira/config.yml` của kit đã đúng bước 12. `.gitignore` gốc theo README bước 3. Script `prepare` cài hook: `core.hooksPath` là `.githooks`.
- Sau khi chép, `npm ci` (2 phút 32 giây) và năm lệnh `lint`, `typecheck`, `test:coverage`, `build`, `test:e2e` đều xanh; `npm audit --audit-level=high` thoát 0.

**Skill theo stack** (spec mục 2.2). Claude đọc `SKILL.md` của cả hai và quét các file `rules/` tìm URL lạ, lệnh shell, `npx`, `curl`, `child_process`, MCP, telemetry. Chỉ có hướng dẫn và ví dụ code; lệnh duy nhất là `npx svgo` trong một ví dụ tối ưu SVG của Vercel.

| Skill | Nguồn | Commit | Giấy phép |
|---|---|---|---|
| `nestjs-best-practices` | `kadajett/agent-nestjs-skills`, `skills/nestjs-best-practices` (291 sao) | `9c553c7b217e` (2026-07-23) | Repo không có file LICENSE; frontmatter khai `license: MIT` |
| `vercel-react-best-practices` | `vercel-labs/agent-skills`, `skills/react-best-practices` (33 nghìn sao) | `dc8367e6f91c` (2026-04-14) | Repo không có file LICENSE; frontmatter khai `license: MIT`, README ghi "MIT" |

Cả hai được nhận theo giấy phép MIT mà tác giả khai; `SOURCE.md` của từng skill ghi việc thiếu file LICENSE.

**Commit đầu bị hook từ chối:** `commit-msg: end the header with the Jira key in parentheses`. Hook của kit không có ngoại lệ cho commit không mang mã Jira, còn spec mục 2.5 định commit đầu không có mã. Hook `pre-commit` (quét secret) chạy tay trên 404 file đã stage: thoát 0. Chờ bạn chọn cách làm.

## T3: Space `SMP` (2026-11-02)

| Bước | Ai, bằng gì | Kết quả |
|---|---|---|
| Tạo space có "share settings" với `DEMO` | Bạn, giao diện | Không làm được: tùy chọn này nằm trong khung "Customize project settings … Try it free for 14 days", tức chỉ có ở gói trả phí (`misc/images/phien-21-luot-7-anh-2.png`) |
| Tạo space company-managed, Kanban, `AO Sample`, key `SMP` | Bạn, giao diện | Xong, id 10034 |
| Gán `DEMO: Kanban Issue Type Scheme`, `DEMO: Kanban Issue Type Screen Scheme`, `AO workflow scheme` | Bạn, Space settings | Xong. API xác nhận: 10149, 10001, 10002; work type `Sub-task`, `Epic`, `Story`, `Bug`, `Task`; permission scheme `Default software scheme` như `DEMO` |
| Quyền của hai service account trên `SMP` | Claude, `GET /mypermissions` bằng `JIRA_CI_TOKEN` và `ATLASSIAN_AGENT_TOKEN` | Cả hai có `BROWSE_PROJECTS`, `CREATE_ISSUES`, `EDIT_ISSUES`, `TRANSITION_ISSUES`, `ADD_COMMENTS` |
| `npm run jira:check -- --space SMP` (lần 1) | Claude | 3 chỗ lệch, đều thuộc board (bước 10): filter, tên cột, status của cột Backlog. Bước 9 không còn chỗ lệch |

## T6: phần làm trước trên repo trống (2026-11-02)

- Environment `development`, `staging`, `production`, và `merge-gate` với rule nhánh chỉ cho `develop`: tạo bằng `gh api`. Repo chưa có nhánh `develop`; rule vẫn nhận tên nhánh.
- Secret `JIRA_CI_TOKEN` của repo: đặt bằng `printenv JIRA_CI_TOKEN | gh secret set JIRA_CI_TOKEN -R TungPH7/ao-sample`, nên token không nằm trong lệnh. Token là biến môi trường trên máy (`docs/jira-setup.md`, bước 1).

## T3 (tiếp): board của `SMP` (2026-11-02)

- `SMP` dùng **board mới** của Jira ("This space uses the modern Jira board"). Board settings của board mới không có mục **Columns**; cột được cấu hình trên trang board: **More actions (•••) → Configure columns** (ảnh `misc/images/phien-21-luot-10-anh-1.png`, `phien-21-luot-11-anh-1.png`). `DEMO` dùng board cũ, nên bước 10 của `docs/jira-setup.md` chỉ ghi đường của board cũ.
- Sau khi gán `AO workflow scheme`, hai cột của template (Backlog, Selected for development) chỉ còn status cũ, nên trang board ẩn chúng (`phien-21-luot-9-anh-1.png`).
- Lần đọc API thứ nhất sau khi bạn bấm Publish: `New` nằm trong cột `In Review`, cột Backlog trống. Bạn sửa lại; lần đọc thứ hai: Backlog `New`; Ready `To Do`, `Ready`; In Progress; In Review `In Review` (tối đa 2); QA `In QA`, `Ready for QA`; Done. Giống hệt board 2 của `DEMO`.
- `npm run jira:check -- --space SMP`: "Jira space SMP matches tracker/jira.yaml". Bốn dòng `Check by hand`: Kanban backlog giữ `New` (API xác nhận); MCP nhận API token (cấu hình của site, như `DEMO`); GitHub for Atlassian nối với repo (kiểm ở Checkpoint 2); trường trên screen (dùng chung screen scheme của `DEMO`).
- Thời gian: tạo space, gán scheme và sửa board mất khoảng 40 phút, phần lớn vì giao diện khác tài liệu (gói Free không có "share settings"; board mới).

## T5 (tiếp): commit đầu (2026-11-02)

- Bạn chọn cách (b): commit đầu mang mã của một Task, không đi vòng hook.
- Task `SMP-1` "Dựng khung app và bản chép kit" tạo bằng token CI (`POST /rest/api/3/issue`, 201). Lần gọi đầu bằng `curl -d "$BODY"` bị Jira báo JSON lỗi vì chữ tiếng Việt đi qua tham số dòng lệnh của Git Bash; gọi bằng `fetch` của Node thì được.
- Commit `6f5831d` `chore(repo): scaffold the sample app with the kit copy (SMP-1)`, tác giả là bạn, 404 file. Hook `pre-commit` và `commit-msg` đều qua.

## T6 (tiếp): lên GitHub (2026-11-02)

| Bước | Ai, bằng gì | Kết quả |
|---|---|---|
| Push `main` | Claude, `git push -u origin main` | Hook `pre-push` cho qua, vì nhánh chưa có trên remote |
| Tạo `develop` từ cùng commit | Claude, `git push origin main:develop` | Xong; `main` và `develop` cùng ở `6f5831d` |
| Nhánh mặc định `develop` | Claude, `PATCH /repos/TungPH7/ao-sample` | Xong |
| Thêm repo vào `ao-dev`, `ao-review` | Bạn, giao diện | Token cài đặt của cả hai App đọc được repo (200) |
| Thêm repo vào app GitHub của Atlassian | Bạn, giao diện | Kiểm ở Checkpoint 2, qua panel Development của `SMP-1` |
| Key thứ hai của `ao-dev` | Bạn tạo (Credentials → Key pairs → New key); Claude kiểm bằng `GET /app` (200, `tungph7-ao-dev`), đặt secret `AO_DEV_APP_KEY` của environment `merge-gate` bằng cách pipe file, rồi xóa file | Xong. Trong `ao-keys` còn hai key đầu của hai App |
| Tin cậy thư mục `ao-sample` | Bạn, mở `claude` một lần | `hasTrustDialogAccepted: true` |
| `.claude/settings.local.json` bật hai server MCP | Claude | `claude mcp list`: `atlassian` và `chrome-devtools` Connected |
| `npm run gh:protect -- --repo TungPH7/ao-sample` | Claude | `soft mode: merge-gate and audit enforce the gates` |
| `MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-status"` | Claude | Thoát 0, 2 turn, 0,11 USD, không bị từ chối quyền nào. In `SMP-1` ở New |
| Run sau lần push đầu | GitHub | **Không có run nào** sau 11 phút, dù năm workflow đều `active`, Actions bật, GitHub báo hoạt động bình thường, và `ao-pilot` vẫn chạy run như thường. Repo activity ghi hai `branch_creation` lúc 18:20Z. [Inference] GitHub có thể không kích hoạt workflow cho lần push đầu tạo nội dung của repo; ở `ao-pilot`, commit đầu được tạo trên giao diện, trước khi có workflow |
| `merge-gate` chạy tay (`workflow_dispatch`, `develop`) | Claude | Run 41337132300 xanh, in `No open PR` |
| `Deploy` chạy tay (`workflow_dispatch`, `develop`, `development`) | Claude | Run 41337135836: `audit` đỏ "6f5831d on develop is not the merge of a PR into develop: it was pushed without one", job deploy bị bỏ qua, `audit` in "Flagged SMP-1". `SMP-1` có cờ Impediment, nhãn `needs-you` và comment của `audit`, đúng cách (b) |

Ghi chú: đọc `SMP-1` bằng token CI, tên status trả về là `全新` (tiếng Trung của "New"); đọc bằng token admin thì là `New`. [Inference] Ngôn ngữ của tài khoản `orchestratorci` là tiếng Trung. Script của kit so status theo id, và `jira-sync` đã chạy đúng ở `ao-pilot`, nên chưa thấy ảnh hưởng.

## Checkpoint 2 (2026-11-02)

- **Tiêu chí 1** (đổi, xem spec mục 9): `develop` là nhánh mặc định; `main` và `develop` cùng ở `6f5831d`, nên `main` là tổ tiên của `develop`. CI chưa chạy trên commit đầu (bảng trên), nên phần "CI xanh" được kiểm trên PR đầu tiên và trên `develop` sau lần merge đầu, ở T7.
- **Tiêu chí 2:** `jira:check -- --space SMP` không còn chỗ lệch.
- **`/ao-status`** chạy trong `ao-sample`, thoát 0.
- **Bạn duyệt trước** việc chạy Epic thử (Phiên 21 · Lượt 6), nên Claude làm tiếp T7: Epic `SMP-2` "Ghi chú: tạo và xem danh sách" tạo bằng token CI (201). `ao-step.mjs spec SMP-2`: `STOP: Epic SMP-2 is New`, bước kế tiếp là bạn bấm `Start spec`.

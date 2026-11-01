# Kiểm thật: Pilot 1

> **Plan:** [plan.md](plan.md). **Task:** [todo.md](todo.md). **Spec:** [SPEC-pilot-1.md](../SPEC-pilot-1.md). Giờ theo giờ Việt Nam (UTC+7).

## T1: Tiền đề về khung app và `claude -p` (2026-11-01, khoảng 23:45 → 02/11 00:20)

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

## T2: Tiền đề về GitHub và Jira (2026-11-02, khoảng 00:05 → 00:20)

| Bước | Cách | Kết quả |
|---|---|---|
| Tạo repo | `gh repo create TungPH7/ao-sample --private` | **Xong:** id 1442034339, private, trống |
| Tìm bản cài App | `GET /user/installations` bằng token `gh` | 403: endpoint chỉ nhận user token của một GitHub App |
| | `GET /users/TungPH7/installation` bằng JWT của từng App | `ao-dev` 176282622, `ao-review` 176282738, cả hai `selected` |
| Điểm 3: thêm repo vào bản cài | `PUT /user/installations/{id}/repositories/1442034339` bằng token `gh` | **Sai:** 403 "You do not have permission to modify this app on TungPH7", cả hai App |
| Điểm 4: tạo space `SMP` | `POST /rest/api/3/project` (template Kanban company-managed) bằng `JIRA_ADMIN_TOKEN` | **Sai:** 401 "Unauthorized; scope does not match". Token admin là token có scope, chỉ đủ cho `jira:check` |
| Đọc cấu hình của `DEMO` | `GET` các scheme | Workflow scheme 10002 `AO workflow scheme`; issue type scheme 10149; issue type screen scheme 10001; permission scheme 10001 `Default software scheme` |

Kết quả: điểm 3 và 4 chuyển cho bạn làm trên giao diện (plan, quyết định 1): thêm repo vào ba App ở T6, tạo space và gán scheme ở T3.

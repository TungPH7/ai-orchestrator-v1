# SPEC: Pilot 1

> **Loại:** pilot, không phải module. Xem tiêu chí thành công 1 và mục "Thứ tự build" trong [SPEC.md](SPEC.md). **Dùng:** `sdlc-contract`, `tracker-integration`, `quality-gates`, `agent-roster`, `dev-workflow`. **Là đầu vào cho:** `release-workflow` và Pilot 2 (cùng repo, cùng feature), `project-scaffold` (các bước cài làm tay ở đây).
>
> **Trạng thái:** đã duyệt ngày 2026-11-01 (Phiên 21 · Lượt 4). Plan: [tasks/plan.md](tasks/plan.md), đã duyệt ngày 2026-11-01 (Phiên 21 · Lượt 5). **Nguồn thảo luận:** [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md), Phiên 21 · Lượt 1–4.

## 1. Mục tiêu

Pilot 1 kiểm kit Cấp 1 trên một dự án thật: repo mới, stack Next.js + NestJS, space Jira mới. Sau Pilot 1:

- Repo `TungPH7/ao-sample` có khung app `apps/web` (Next.js) và `apps/api` (NestJS), cùng bản chép kit lấy từ `main` của kit.
- Space Jira `SMP` được dựng theo [docs/jira-setup.md](docs/jira-setup.md), và `jira:check` không còn chỗ lệch.
- Một Epic "Ghi chú" đi từ `/ao-spec` tới khi mọi Story sang Ready for QA. Mọi bước chạy bằng lệnh `/ao-*`.
- Mỗi cổng có artifact làm bằng chứng. Trạng thái Jira đổi theo dữ kiện thật (PR, CI, deploy), không theo lời agent tự khai.
- Các bước cài làm tay được ghi lại: làm bằng API hay bằng tay, mất bao lâu, vướng ở đâu. Đây là đầu vào cho `project-scaffold`.
- Lỗi của kit tìm được trong lúc chạy được sửa ở kit, có test.

**Ngoài phạm vi:**

- Development, Staging, Production, Docker, VPS, QA trên môi trường, cắt release: `release-workflow` và Pilot 2. Pilot 1 dừng khi item sang Ready for QA.
- Script cài và đồng bộ kit tự động, profile theo stack: `project-scaffold`.
- Cơ sở dữ liệu thật (A2). Figma: `figma-integration`.
- Chép kit lần hai vào `ao-pilot`. `ao-pilot` giữ vai trò sandbox (mục 10).

## 2. Thiết kế

### 2.1 Repo và khung app

- Repo private `TungPH7/ao-sample`, gói Free. Nhánh mặc định là `develop` (README, bước cài 6).
- Monorepo dùng npm workspaces, khai `"workspaces": ["apps/*"]` ở `package.json` gốc.
- `apps/web`: tạo bằng `create-next-app` 16.4.3, App Router, TypeScript, ESLint, Tailwind CSS, thư mục `src/`, theo lựa chọn mặc định của công cụ (flag ghi ở `tasks/verification.md`, T1). Unit test bằng Vitest và React Testing Library, theo hướng dẫn kèm trong gói Next.js. Giữ `AGENTS.md` mà Next.js sinh ra. Có một trang chủ đơn giản. Cổng 3000.
- `apps/api`: tạo bằng `nest new` của `@nestjs/cli` 12.0.11, Express, ESM, Vitest và oxlint, theo mặc định của NestJS 12. Có `GET /health` trả `{ "status": "ok" }`. Cổng 3001. Hai chỗ bỏ khỏi khung (bạn duyệt ở Checkpoint 1):
  - gỡ `@nestjs/mau` và script `deploy`: gói này mang 2 lỗ hổng mức high, và dự án không deploy lên nền tảng của NestJS;
  - xóa `apps/api/AGENTS.md`: file này quảng cáo dịch vụ NestJS Observe và chỉ agent cài MCP server của họ.
- Cách `apps/web` gọi `apps/api` không chốt ở đây (gọi từ server của Next.js hay từ trình duyệt, có CORS hay không). `sa` chốt việc này trong plan của Epic, kèm ADR. Đây là một phần của việc kiểm agent.
- Không có cơ sở dữ liệu (A2): `apps/api` giữ dữ liệu trong bộ nhớ, và dữ liệu mất khi app khởi động lại.
- E2E: Playwright ở thư mục `e2e/` tại gốc repo. `playwright.config.ts` chạy cả hai app bằng `webServer`. Khung có một test smoke: trang chủ mở được và `GET /health` trả 200.
- Workflow deploy giả `.github/workflows/deploy.yml` (A4), chép từ `ao-pilot`: chạy khi `develop` có commit mới, gọi `audit.yml` trước, rồi tạo deployment `development` mà không deploy gì.

**Script ở `package.json` gốc.** Mỗi script gọi script cùng tên của hai workspace:

| Script | Ai cần | Ghi chú |
|---|---|---|
| `lint`, `typecheck`, `build` | Job `build-test` của CI | |
| `test:coverage` | Job `build-test` | Mỗi app ghi `apps/<app>/coverage/lcov.info`, khớp mẫu `lcov` trong `quality/gates.yaml`. Coverage tính mọi file nguồn, kể cả file chưa test nào import (`coverage.include` của Vitest) |
| `prepare` | `npm install` | `node .ai-orchestrator/scripts/install-hooks.mjs` (README, bước cài 4) |
| `test:e2e`, `dev` | Agent và bạn, ở máy | Job `build-test` của kit không chạy E2E |

### 2.2 Bản chép kit và skill theo stack

- Chép theo README, mục "Cài kit vào repo dự án", bước 1–4, từ commit `main` của kit lúc dựng. SHA ghi vào `verification.md`.
- `.claude/settings.json`: `AO_JIRA_SPACE` là `SMP`, `AO_APPROVERS` là `TungPH7`. Slug và App ID của hai App giữ như `ao-pilot`.
- Skill theo stack khai trong `.ai-orchestrator/roster.local.yaml` (`SPEC-agent-roster.md` mục 2.7). Mỗi skill được chép vào `.claude/skills/` của dự án, ghim theo commit, kèm `SOURCE.md` và file giấy phép:

| Vai trò | Skill | Nguồn |
|---|---|---|
| `fe-dev` | `vercel-react-best-practices` | Vercel, MIT (frontmatter của bản đang có trên máy). Repo nguồn ghi vào `SOURCE.md` lúc chép |
| `be-dev` | `nestjs-best-practices` | `kadajett/agent-nestjs-skills`, khoảng 31 nghìn lượt cài trên skills.sh (2026-11-01). Đây là bên thứ ba |

Trước khi chép skill của bên thứ ba, mình đọc hết nội dung và kiểm giấy phép. Nếu skill không có giấy phép mở, hoặc có chỉ dẫn lạ (gọi mạng, chạy lệnh, đọc file ngoài repo), mình bỏ skill đó, và `be-dev` chạy không có skill theo stack. `roster.local.yaml` và `.claude/skills/` là đường dẫn được bảo vệ, nên PR sửa chúng do bạn merge.

### 2.3 Space Jira `SMP`

- Key `SMP` còn trống: ngày 2026-11-01, `GET /rest/api/3/project/SMP` trả 404. Site đang có `DEMO` (company-managed) và `SCRUM` (team-managed).
- Làm bước 9–13 của `docs/jira-setup.md`: space, board, GitHub for Jira, môi trường, kiểm lại. Bước 1–8 (group, service account, Rovo MCP, resolution, status, workflow, work type, workflow scheme, trường) dùng chung cho cả site, không làm lại.
- Token admin Jira chỉ có scope đọc, nên không tạo được space (T2: 401). Bạn tạo space trên giao diện theo từng bước bấm. `verification.md` ghi bước nào làm bằng gì.
- `SMP` dùng chung cấu hình với `DEMO` (bạn chọn ở Checkpoint 1): `AO workflow scheme`, issue type scheme và issue type screen scheme của `DEMO`, nên các trường trên screen của bước 9 có sẵn. Đổi lại, sửa một scheme cho `SMP` sẽ đổi luôn cho `DEMO`. Tùy chọn "share settings" lúc tạo space chỉ có ở gói trả phí (ảnh `misc/images/phien-21-luot-7-anh-2.png`), nên space được tạo như thường, rồi gán ba scheme của `DEMO` trong Space settings.
- Xong khi `npm run jira:check -- --space SMP` không còn chỗ lệch, và bạn đã xem tay các dòng `Check by hand`.

### 2.4 GitHub

**Mình làm bằng `gh`:**

- Tạo repo, push commit đầu, tạo `develop`, đặt `develop` làm nhánh mặc định.
- Environment `merge-gate` chỉ cho nhánh `develop`, và environment `development` cho deploy giả.
- `npm run gh:protect -- --repo TungPH7/ao-sample`. Repo private ở gói Free chỉ được báo soft mode.
- Đặt secret `JIRA_CI_TOKEN` của repo bằng cách pipe biến môi trường cùng tên, để token không nằm trong lệnh.
- `.claude/settings.local.json` của repo ở máy bật hai server `atlassian` và `chrome-devtools` (`enabledMcpjsonServers`). File này chỉ có hiệu lực khi thư mục đã được tin cậy (T1).

**Bạn làm** (mình ghi từng bước bấm khi tới lúc):

- Tạo một private key mới cho `ao-dev` trên trang của App (bạn chọn ngày 2026-11-01, Phiên 21 · Lượt 4). Mình đặt key đó làm secret `AO_DEV_APP_KEY` của environment `merge-gate` bằng cách pipe file, rồi xóa file khỏi máy (`docs/quality-gates.md`, mục "Environment `merge-gate`").
- Thêm repo vào ba App trên giao diện: `tungph7-ao-dev`, `tungph7-ao-review` và app GitHub của Atlassian. API từ chối token của `gh` (T2: 403).
- Nối app GitHub for Jira với repo. Lần đầu có `.jira/config.yml` thì ngắt rồi nối lại (README bước cài 7).
- Mở `claude` trong repo một lần và chấp nhận hộp thoại tin cậy thư mục (README bước cài 8). Nếu chưa tin cậy, `claude -p` bỏ qua luật `allow` của dự án và không bật server MCP qua `settings.local.json` (T1).

### 2.5 Commit đầu và nhánh (A3)

- Commit đầu gồm khung app và bản chép kit. Mình push commit này lên `main` bằng login của bạn, rồi tạo `develop` từ đúng commit đó. Đây là commit duy nhất đi ngoài PR.
- Header của commit này không có mã Jira. Khi `develop` được tạo, `Deploy` chạy và `audit` sẽ đỏ, vì commit không phải commit merge của một PR. Đây là lần đỏ dự kiến, và không item nào bị gắn cờ.
- Từ commit thứ hai, mọi thay đổi vào `develop` qua PR. Không ai push lên `main`, nên `main` luôn là tổ tiên của `develop`, tới lần ship đầu tiên ở Pilot 2.

### 2.6 Epic thử "Ghi chú"

Bạn là Product Owner. Mình tạo Epic bằng token CI, ở New, với mô tả sau. `ba` viết SPEC từ mô tả này và hỏi bạn chỗ còn thiếu:

> Người dùng tạo một ghi chú có tiêu đề và nội dung, và xem danh sách các ghi chú đã tạo. Tiêu đề là bắt buộc. Tiêu đề và nội dung có giới hạn độ dài. Khi nhập sai, lỗi hiện ngay cạnh ô nhập. Dữ liệu nằm trong bộ nhớ của API.

Vòng của Epic theo `docs/dev-workflow.md`:

1. Bạn bấm `Start spec` trên Epic.
2. `/ao-spec`: `ba`, `ux`, `sa`, rồi `ba` mở PR tài liệu. Dừng ở gate ①, bạn duyệt SPEC.
3. `/ao-plan`: `sa` viết plan (và ADR nếu cần), `ba` tạo Story và Sub-task. Dừng ở gate ②, bạn duyệt plan và mức effort. `merge-gate` merge PR tài liệu.
4. `/ao-build` cho từng item: dev agent mở PR. `/ao-review`: `reviewer` rồi `security`. `/ao-fix` khi có yêu cầu sửa. Dừng ở gate ③, bạn approve.
5. `merge-gate` merge PR vào `develop`, `audit` xanh, item sang Ready for QA.

Số Story và Sub-task do `sa` và `ba` quyết trong plan. Một Story đụng cả FE và BE thì dùng một nhánh và một PR, chia Sub-task, BE làm trước.

### 2.7 Cách chạy lệnh (A1)

- Mỗi lệnh chạy bằng `MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-<lệnh> <đối số>"` trong thư mục `ao-sample`, ở nền, như T17 của `dev-workflow`. Thiếu `MSYS_NO_PATHCONV=1`, Git Bash đổi `/ao-…` thành đường dẫn Windows, và model đi vòng qua script thay cho skill (T1). Phiên này chỉ điều phối; agent chạy với model và effort của vai trò.
- Lệnh đi qua skill `/ao-*` và script trong `.ai-orchestrator/` của dự án. Không đặt `AO_KIT_DIR`.
- Các lượt agent chạy lần lượt (A7). Khi chạm giới hạn 5 giờ hoặc máy thiếu RAM, mình chờ rồi chạy lại, và ghi vào `verification.md`.
- Khi lệnh dừng để chờ bạn (gate ①②③, câu hỏi của agent, cờ "Needs you"), mình báo bạn bằng tiếng Việt và chờ.

### 2.8 Tiền đề kiểm ở task đầu

Spec dựa vào sáu điều chưa ai thử trên máy bạn. Giai đoạn đầu của plan kiểm điểm 1–5, trước khi dựng. Điểm 6 cần repo và space đã nối với nhau, nên được kiểm sau bước nối: T6 kiểm repo đã vào GitHub for Atlassian, T7 kiểm panel Development trên PR tài liệu đầu tiên (plan):

1. `create-next-app` 16.4.3 và `nest new` 12.0.11 chạy được với Node 24.17 trên Windows. `npm audit --audit-level=high` của khung không báo lỗi, vì job `policy` chạy `npm audit`.
2. Trong npm workspaces, `npm ci` ở gốc cài đủ cho cả hai app, và Jest của từng app ghi lcov đúng chỗ.
3. Token `gh` của bạn thêm được repo vào bản cài của App qua API.
4. Token admin Jira tạo được space company-managed và gán `AO workflow scheme` qua API.
5. `claude -p "/ao-status"` chạy được trong repo mới mà không ai phải bấm tin cậy thư mục, khi `settings.local.json` đã bật hai server MCP.
6. GitHub for Jira nhận repo mới, và panel Development của item `SMP` thấy nhánh và PR.

Điều nào sai thì mình dừng và đề xuất sửa spec.

**Kết quả (2026-11-02, Checkpoint 1):** điểm 1 đúng một phần (NestJS 12 dùng Vitest và oxlint; `@nestjs/mau` mang 2 lỗ hổng high), điểm 2 đúng khi dùng Vitest, điểm 3 và 4 sai (API từ chối token), điểm 5 đúng kèm `MSYS_NO_PATHCONV=1` và việc tin cậy thư mục. Bạn duyệt sáu chỗ sửa ở Phiên 21 · Lượt 6; mục 2.1, 2.3, 2.4, 2.7, 3, 6, 7 đã sửa theo. Chi tiết trong `tasks/verification.md`.

## 3. Tech stack

Phiên bản lấy bằng `npm view` ngày 2026-11-01:

- Node.js 24 (máy: 24.17.0), npm 11.13.0.
- Next.js 16.4.3, React 19.3.1. NestJS 12.3.2, `@nestjs/cli` 12.0.11. Playwright 1.64.1.
- TypeScript theo bản mà hai công cụ sinh khung chọn: `apps/web` 5.9.3, `apps/api` 6.0.3 (T1). npm đang có TypeScript 7.0.2, nhưng không công cụ nào chọn bản này.
- Unit test: Vitest 4 và `@vitest/coverage-v8` cho cả hai app; `apps/web` thêm `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`.
- Lint: ESLint 9 với `eslint-config-next` cho `apps/web`; oxlint (`--type-aware`) cho `apps/api`.
- Kit: commit `main` lúc dựng.

## 4. Lệnh

Trong `ao-sample`:

```
npm ci                       # cài cả hai app và hook git
npm run dev                  # web ở :3000, api ở :3001
npm run lint
npm run typecheck
npm run test:coverage        # apps/web/coverage/lcov.info, apps/api/coverage/lcov.info
npm run build
npm run test:e2e             # Playwright tự chạy hai app
```

Các lệnh `/ao-*`, chạy từ phiên này:

```
MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-status"
MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-spec SMP-1"
MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-plan SMP-1"
MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-build SMP-2"
MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-review 3"
MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-fix 3"
```

Mã item và số PR ở trên chỉ là ví dụ. Trong repo kit:

```
npm run jira:check -- --space SMP
npm run gh:protect -- --repo TungPH7/ao-sample
```

## 5. Cấu trúc thư mục

Repo `ao-sample` sau commit đầu:

```
ao-sample/
├── apps/
│   ├── web/                     # Next.js: src/app/, jest.config.ts, coverage/ (không commit)
│   └── api/                     # NestJS: src/, test/, coverage/ (không commit)
├── e2e/smoke.spec.ts            # Playwright
├── playwright.config.ts         # webServer chạy hai app
├── package.json                 # workspaces, script gốc
├── .ai-orchestrator/            # bản chép kit, roster.local.yaml
├── .claude/                     # agent, skill (kể cả skill theo stack), hook, settings.json
├── .githooks/
├── .github/workflows/           # ci, jira-sync, merge-gate, audit, deploy (giả)
├── .jira/config.yml
├── .mcp.json
└── README.md                    # cách chạy app; trỏ về kit
```

Trong repo kit:

```
ai-orchestrator-v1/
├── SPEC-pilot-1.md              # file này
├── SPEC.md                      # mục Pilot 1 trỏ tới file này
├── SPEC-tracker-integration.md  # mục 10: repo pilot là ao-sample, ao-pilot vẫn là sandbox
└── tasks/plan.md, todo.md, verification.md   # lưu vào tasks/archive/pilot-1/ khi xong
```

## 6. Code style

- Khung giữ quy ước mặc định của công cụ sinh: ESLint của Next.js; oxlint và Prettier của NestJS. Chú thích tắt lint (`eslint-disable`, `oxlint-disable`) cần `reason:` trên cùng dòng, như job `policy` kiểm.
- Code, commit và PR viết tiếng Anh. Tài liệu cho người đọc (SPEC, plan, báo cáo, ticket Jira) viết tiếng Việt (`SPEC.md`, nguyên tắc 6).
- Commit theo `type(scope): subject`, có mã Jira khi thuộc một item, như các module trước.

Ví dụ phần khung của `apps/api`:

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
```

## 7. Chiến lược test

- **Khung:** unit test cho `HealthController` (Vitest, `@nestjs/testing`), test render trang chủ (Vitest với React Testing Library), và test smoke E2E. Cả năm script ở mục 4 phải xanh ở máy trước commit đầu, và `CI` phải xanh trên `main` và `develop` sau khi push.
- **Epic:** agent viết test theo TDD như prompt của vai trò. Coverage của dòng thay đổi ít nhất 80% (`quality/gates.yaml`).
- **Lỗi của kit:** sửa ở kit kèm test `node:test`, như các module trước. Năm lệnh kiểm của kit phải xanh.
- **Kiểm thật:** `verification.md` có bảng các lượt agent (vai trò, effort, turn, thời gian, chi phí quy đổi), bảng các bước cài, và danh sách lỗi kit với PR sửa.

## 8. Ranh giới

- **Luôn làm:** dùng bản chép kit của dự án, không dùng `AO_KIT_DIR`; ghi mỗi lượt agent và mỗi bước cài vào `verification.md`; dừng ở mọi gate và chờ bạn; báo chi phí sau mỗi lệnh.
- **Hỏi trước:** thêm dependency ngoài khung do công cụ sinh tạo; chép skill của bên thứ ba khi việc kiểm ở mục 2.2 có điểm đáng ngờ; sửa CI hoặc hợp đồng của kit; chạy Epic (tốn usage), xin ở Checkpoint trước Epic.
- **Không bao giờ:** push lên `main` hay `develop` sau commit đầu; đưa token hay private key vào chat, repo hay log; tự chuyển item sang Done; approve PR thay bạn; xóa hay sửa repo `ao-pilot` và space `DEMO`.

## 9. Tiêu chí hoàn thành

1. Repo `ao-sample` có `develop` là nhánh mặc định, và `main` là tổ tiên của `develop` (`git merge-base --is-ancestor origin/main origin/develop`). `CI` xanh trên PR đầu tiên và trên `develop` sau lần merge đầu. (Đổi ở Checkpoint 2: GitHub không chạy workflow nào cho lần push đầu của repo, nên commit đầu không có run `CI`.)
2. `npm run jira:check -- --space SMP` không còn chỗ lệch.
3. Epic thử đi từ New tới khi mọi Story sang Ready for QA, cùng các Task chặn chúng: cả 6 item `SMP-4`, `SMP-5`, `SMP-6`, `SMP-7`, `SMP-10`, `SMP-11`. (Ở Checkpoint 3, Phiên 23 · Lượt 4, bạn chọn chỉ làm `SMP-4`, vì phần còn lại ước thêm 50–70 USD. Ở Phiên 23 · Lượt 22, sau khi review rẻ đi, bạn đổi lại như ban đầu.) PR tài liệu do `merge-gate` merge sau gate ②. Mỗi PR code do `merge-gate` merge sau gate ③. `audit` xanh trên mọi commit merge vào `develop`.
4. Sáu lệnh `/ao-*` đều chạy qua `claude -p`, mỗi lệnh ít nhất một lần. Nếu review không có yêu cầu sửa nào, mình chạy `/ao-fix <PR> <ghi chú>` với một sửa nhỏ do bạn nêu.
5. Mỗi lần đổi trạng thái item trên Jira do đúng actor mà `contract/workflows.yaml` cho phép (đọc lịch sử thay đổi của item). Các cổng (`start-spec`, `approve-spec`, `approve-plan`, `accept`, `cancel`) chỉ do bạn. Agent chỉ dùng transition có vai trò của nó, như `start` của dev agent. (Đổi ở Phiên 23 · Lượt 22: câu cũ "không từ agent" trái với contract, vốn cho dev agent `start`, `reviewer` và `security` `request-changes`, `qa` `pick-up` và `qa-fail`.)
6. Mỗi cổng có artifact: SPEC, design (nếu có), plan, ADR (nếu có), báo cáo của `reviewer` và `security` trên PR, log lượt chạy trong `.ai/runs/`.
7. Không lần nào agent push thẳng, approve thay bạn, hay chuyển item sang Done.
8. `verification.md` có đủ các bảng ở mục 7. Mỗi lỗi kit có PR sửa và test.

## 10. Câu hỏi đã trả lời (2026-11-01, Phiên 21 · Lượt 2–3)

1. **Repo:** repo mới `TungPH7/ao-sample`, không đổi `ao-pilot`. `ao-pilot` giữ vai trò sandbox; việc chép kit lần hai vào đó không làm nữa.
2. **Space Jira:** space mới `SMP`, không dùng `DEMO`.
3. **Feature của Epic thử:** Ghi chú (tạo và xem danh sách).
4. **Giả định A1–A8:** bạn duyệt cả tám. A1 cách chạy lệnh, A2 không có cơ sở dữ liệu, A3 commit đầu, A4 deploy giả, A5 ai làm gì, A6 phiên bản, A7 chi phí và tải máy, A8 cách làm.
5. **Sáu chỗ sửa sau T1–T2 (Checkpoint 1, Phiên 21 · Lượt 6):** Vitest cho cả hai app; oxlint cho `apps/api`; gỡ `@nestjs/mau` và script `deploy`; xóa `apps/api/AGENTS.md`; thêm `oxlint-disable` vào mẫu tắt kiểm tra của kit (T1a); gõ lệnh với `MSYS_NO_PATHCONV=1`.
6. **Cấu hình Jira:** `SMP` dùng chung scheme với `DEMO`.

## 11. Câu hỏi mở

Không có. Một mặc định bạn có thể đổi: `be-dev` dùng skill `nestjs-best-practices` của bên thứ ba, nếu qua được việc kiểm ở mục 2.2.

## 12. Rủi ro

- **Giới hạn 5 giờ của gói Pro và RAM 16 GB** làm Epic kéo dài qua nhiều lượt. Epic DEMO-20 chạm giới hạn 5 giờ hai lần và bị tắt vì thiếu RAM ba lần.
- **Phiên bản mới** (Next.js 16, NestJS 12) có thể chưa khớp nhau. T1 đã build, lint, typecheck và test được cả hai app trong một workspace; hai app dùng hai bản TypeScript khác nhau.
- **Skill của bên thứ ba** là rủi ro chuỗi cung ứng. Cách giảm: đọc trước khi chép, ghim theo commit, và PR sửa skill do bạn merge.
- **Agent chưa từng làm Next.js và NestJS trong kit.** Plan đặt một Checkpoint ngay sau lượt build đầu tiên.
- **`audit` đỏ trên commit đầu** (mục 2.5). Đây là lần đỏ dự kiến.
- **Các rủi ro còn mở từ `dev-workflow`** vẫn còn: `GH_TOKEN` hết hạn sau 1 giờ, phiên agent nhận `defaultMode: auto` của bạn, ruleset phía server cần repo public hoặc GitHub Pro (`tasks/archive/dev-workflow/verification.md`).

## Nguồn

- [SPEC.md](SPEC.md): tiêu chí thành công 1, thứ tự build.
- [README.md](README.md): "Cài kit vào repo dự án", "Biến môi trường và secret".
- [docs/jira-setup.md](docs/jira-setup.md), [docs/github-apps-setup.md](docs/github-apps-setup.md), [docs/dev-workflow.md](docs/dev-workflow.md).
- [tasks/archive/dev-workflow/verification.md](tasks/archive/dev-workflow/verification.md): mục "Việc để lại cho `release-workflow` và Pilot 1".
- npm registry (`npm view`, 2026-11-01); skills.sh (`npx skills find nestjs`, 2026-11-01).

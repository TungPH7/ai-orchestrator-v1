# Task: Pilot 1

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-pilot-1.md](../SPEC-pilot-1.md). Làm theo thứ tự. Đánh dấu `[x]` khi tiêu chí chấp nhận và kiểm chứng đều đạt.

**Quy ước chung cho mọi task:**

- Task có thay đổi ở kit: `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check` và `npm run agents:check` phải xanh. Lỗi kit có test đỏ trước, rồi mới sửa.
- Task có nhãn **[bạn]** cần bạn làm một phần trên GitHub, Jira hoặc máy của bạn. Claude ghi rõ từng bước bấm rồi dừng chờ.
- Key và token không bao giờ xuất hiện trong chat, commit, log hay lịch sử lệnh (plan, quyết định 9).
- Kiểm thật ghi vào `tasks/verification.md`: ngày, bước, kết quả. Mỗi bước cài ghi thêm: làm bằng API hay bằng tay, ai làm, mất bao lâu, vướng ở đâu. Mỗi lượt agent ghi thêm vai trò, model, effort, turn, thời gian và chi phí quy đổi, lấy từ `.ai/runs/<KEY>/last.md`.
- Agent chạy lần lượt, chỉ trên `ao-sample` và space `SMP`. Không đụng `ao-pilot` và `DEMO`, trừ lượt đọc `DEMO` ở T1.
- Nhánh của kit `task/t<N>-<slug>` tách từ `main`, merge qua PR. Commit theo `CLAUDE.md`: `type(scope): subject`, không body, không có dòng `Co-Authored-By`.
- Hỏi bạn trước khi (spec mục 8):
  - thêm dependency ngoài khung do công cụ sinh tạo;
  - chép skill của bên thứ ba khi việc kiểm có điểm đáng ngờ;
  - sửa CI hoặc hợp đồng của kit;
  - cài phần mềm lên máy.

---

## Giai đoạn 1: tiền đề

### [x] T1: Tiền đề về khung app và `claude -p` (spec mục 2.8, điểm 1, 2, 5)

**Mô tả:** Claude làm trong một thư mục mới ở scratchpad, không đụng repo nào:

1. Điểm 1: chạy `create-next-app` 16.4.3 vào `apps/web` và `nest new` 12.0.11 vào `apps/api`, không cài git, không hỏi tương tác. Ghi lại flag thật đã dùng và phiên bản TypeScript, Jest mà hai công cụ chọn. Chạy `npm audit --audit-level=high`.
2. Điểm 2: thêm `package.json` gốc khai `workspaces`, xóa `package-lock.json` riêng của từng app, chạy `npm install` rồi `npm ci` ở gốc. Thêm Jest vào `apps/web` theo `next/jest`. Chạy `test:coverage` của từng app, kiểm `apps/web/coverage/lcov.info` và `apps/api/coverage/lcov.info` có mặt và tính cả file chưa được test import.
3. Điểm 5: trong một thư mục mới khác, chép bản chép kit (README bước 1–2), đặt `AO_JIRA_SPACE=DEMO`, viết `.claude/settings.local.json` bật `atlassian` và `chrome-devtools`. Chạy `claude -p --model sonnet "/ao-status"` ở shell nền. Kiểm: lệnh không dừng ở hộp thoại nào, in danh sách item của `DEMO`, thoát 0.

**Kết quả (2026-11-02):** điểm 1 đúng một phần, điểm 2 đúng khi dùng Vitest, điểm 5 đúng kèm `MSYS_NO_PATHCONV=1` và việc tin cậy thư mục. Bạn duyệt sáu chỗ sửa spec ở Phiên 21 · Lượt 6. Chi phí 0,35 USD (3 lượt Sonnet).

**Tiêu chí chấp nhận:**
- [x] Ba điểm có kết quả đúng hoặc sai, kèm bằng chứng (lệnh, trích output), trong `tasks/verification.md`.
- [x] Flag sinh khung và phiên bản thật được ghi lại để T4 dùng.
- [x] Nếu một điểm sai: spec và plan đã sửa theo kết quả, và bạn đã duyệt bản sửa.

**Kiểm chứng:**
- [x] Thư mục thử chỉ nằm trong scratchpad
- [x] Lượt `/ao-status` chỉ đọc `DEMO`, không đổi gì trên Jira

**Phụ thuộc:** không

**File:** `tasks/verification.md` (tạo mới)

**Cỡ:** S

### [x] T2: Tiền đề về GitHub và Jira (điểm 3, 4)

**Mô tả:** Claude làm trên đối tượng thật:

1. Tạo repo private `TungPH7/ao-sample`, trống, không README.
2. Điểm 3: tìm id bản cài của `ao-dev`, `ao-review` và GitHub for Atlassian (`GET /user/installations`). Thêm repo vào từng bản cài (`PUT /user/installations/{installation_id}/repositories/{repository_id}`). Kiểm bằng `GET /user/installations/{id}/repositories`.
3. Điểm 4: bằng `JIRA_ADMIN_EMAIL` và `JIRA_ADMIN_TOKEN`, tạo space company-managed key `SMP`, tên "AO Sample", template Kanban, lead là tài khoản của bạn. Gán `AO workflow scheme` cho space. Kiểm bằng `GET /project/SMP` và scheme của space.

Nếu API từ chối một bước, Claude dừng bước đó, ghi lỗi, và chuyển bước đó cho bạn làm ở T3 hoặc T6 theo từng bước bấm.

**Kết quả (2026-11-02):** repo `ao-sample` đã tạo. Điểm 3 sai (403), điểm 4 sai (401): thêm repo vào App chuyển sang T6, tạo space chuyển sang T3, đều do bạn bấm.

**Tiêu chí chấp nhận:**
- [x] Repo `ao-sample` tồn tại, private, nằm trong ba bản cài App (bằng API hoặc chuyển cho bạn).
- [x] Space `SMP` tồn tại, company-managed, dùng `AO workflow scheme` (bằng API hoặc chuyển cho bạn).
- [x] Hai điểm có kết quả và bằng chứng trong `tasks/verification.md`.

**Kiểm chứng:**
- [x] `gh api repos/TungPH7/ao-sample` trả `private: true`
- [x] `GET /rest/api/3/project/SMP`: chuyển sang T3, vì space do bạn tạo

**Phụ thuộc:** không

**File:** `tasks/verification.md`

**Cỡ:** XS

### [x] T1a: Kit bắt `oxlint-disable` (thêm sau T1)

**Mô tả:** T1 cho thấy oxlint nhận cả `oxlint-disable` lẫn `eslint-disable`, nhưng `suppressions.patterns` của kit chỉ có `eslint-disable`. Thêm `oxlint-disable` vào `quality/gates.yaml`, `SPEC-quality-gates.md` và `docs/quality-gates.md`. `docs/dev-workflow.md` thêm dòng về việc tin cậy thư mục dự án.

**Tiêu chí chấp nhận:**
- [x] Test mới trong `tests/quality/policy.test.mjs` đỏ trước khi sửa, xanh sau khi sửa.
- [x] Năm lệnh kiểm của kit xanh (782 test).

**Phụ thuộc:** T1

**File:** `quality/gates.yaml`, `SPEC-quality-gates.md`, `docs/quality-gates.md`, `docs/dev-workflow.md`

**Cỡ:** XS

### Checkpoint 1
- [x] Năm điểm có kết quả trong `tasks/verification.md`. Điểm nào sai thì spec đã được sửa và bạn đã duyệt bản sửa, hoặc bước đó đã chuyển cho bạn làm trên giao diện
- [x] Bạn xem kết quả của T1–T2 (Phiên 21 · Lượt 6)

---

## Giai đoạn 2: dựng

### [ ] T3: Space `SMP`: bước 9–10 của `docs/jira-setup.md` [bạn]

**Mô tả:** Token admin Jira không tạo được space (T2), nên **[bạn]** tạo space `SMP` trên giao diện, dùng chung cấu hình với `DEMO` (bạn chọn ở Checkpoint 1), rồi sửa board theo bước 10: filter `project = SMP AND issuetype != Epic ORDER BY Rank ASC`, cột và giới hạn WIP. Claude ghi từng bước bấm, kiểm lại bằng API và `jira:check`, và ghi thời gian vào `verification.md`. Trong lúc chờ, Claude làm T4 và T5, vì hai task này không cần space.

**Tiêu chí chấp nhận:**
- [ ] Mọi ô `- [ ]` của bước 9–10 đạt.
- [ ] `npm run jira:check -- --space SMP` chỉ còn báo các mục của bước 11–13.
- [ ] `verification.md` ghi mục nào làm bằng API, mục nào bạn bấm, và thời gian.

**Kiểm chứng:**
- [ ] Bảng kết quả của `jira:check` dán vào `verification.md`

**Phụ thuộc:** T2

**File:** `tasks/verification.md`

**Cỡ:** XS

### [ ] T4: Khung app `ao-sample` ở máy

**Mô tả:** Claude dựng khung trong `D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ao-sample` (clone của repo trống), theo flag đã kiểm ở T1:

- `apps/web`: Next.js, trang chủ đơn giản, Jest với `next/jest` và React Testing Library, một test render trang chủ.
- `apps/api`: NestJS, `HealthController` cho `GET /health` (spec mục 6), unit test của controller.
- `package.json` gốc: `workspaces`, các script ở spec mục 2.1 và 4.
- `playwright.config.ts` chạy hai app bằng `webServer`; `e2e/smoke.spec.ts`: trang chủ mở được, `GET /health` trả 200.
- `collectCoverageFrom` của hai app gồm mọi file nguồn.

Chưa commit.

**Tiêu chí chấp nhận:**
- [ ] `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`, `npm run test:e2e` đều xanh ở máy.
- [ ] Hai file lcov nằm đúng chỗ, khớp mẫu `lcov` của `quality/gates.yaml`.
- [ ] `npm audit --audit-level=high` không báo lỗi.

**Kiểm chứng:**
- [ ] Output của sáu lệnh ghi tóm tắt vào `verification.md`

**Phụ thuộc:** T1, T2

**File:** `ao-sample/package.json`, `ao-sample/apps/api/src/health/health.controller.ts`, `ao-sample/apps/web/jest.config.ts`, `ao-sample/playwright.config.ts`, `ao-sample/e2e/smoke.spec.ts` (cùng file do công cụ sinh tạo)

**Cỡ:** M

### [ ] T5: Bản chép kit, skill theo stack và commit đầu

**Mô tả:** Claude làm trong `ao-sample`:

1. Chép kit theo README, mục "Cài kit vào repo dự án", bước 1–4, từ `main` của kit. Ghi SHA vào `verification.md`.
2. `.claude/settings.json`: `AO_JIRA_SPACE=SMP`, `AO_APPROVERS=TungPH7`, slug và App ID của hai App.
3. Skill theo stack (spec mục 2.2): đọc hết `nestjs-best-practices` và kiểm giấy phép, rồi chép cùng `vercel-react-best-practices` vào `.claude/skills/`, mỗi skill có `SOURCE.md` và file giấy phép. Khai trong `.ai-orchestrator/roster.local.yaml`. Chạy `render-agents.mjs --project .`.
4. Chép `deploy.yml` từ `ao-pilot`. `.jira/config.yml` theo bước 12 của `docs/jira-setup.md`. README của dự án: cách chạy app, trỏ về kit.
5. `npm install` cài hook git. Commit đầu bằng login của bạn, header không có mã Jira, ví dụ `chore(repo): scaffold the sample app with the kit copy`. Chưa push.

**Tiêu chí chấp nhận:**
- [ ] `render-agents.mjs --project . --check` báo mọi file đúng.
- [ ] `.claude/skills/` và thư mục con của `.ai-orchestrator/` giống hệt kit ở SHA đã ghi, trừ hai skill theo stack và `roster.local.yaml`.
- [ ] Sáu lệnh của T4 vẫn xanh. Hook `pre-commit` và `commit-msg` chạy và qua khi commit.
- [ ] Nếu skill NestJS có điểm đáng ngờ: Claude đã hỏi bạn, và kết quả ghi trong `verification.md`.

**Kiểm chứng:**
- [ ] So sánh thư mục với kit bằng `git diff --no-index --stat`, kết quả ghi vào `verification.md`

**Phụ thuộc:** T1a, T4

**File:** `ao-sample/.claude/settings.json`, `ao-sample/.ai-orchestrator/roster.local.yaml`, `ao-sample/.github/workflows/deploy.yml`, `ao-sample/.jira/config.yml`, `ao-sample/README.md` (cùng các file chép từ kit)

**Cỡ:** M

### [ ] T6: Lên GitHub và nối Jira: bước 11–13 [bạn]

**Mô tả:**

1. Claude push commit đầu lên `main`, tạo `develop` từ đúng commit đó, đặt `develop` làm nhánh mặc định.
2. Claude tạo environment `merge-gate` (chỉ nhánh `develop`), `development`, `staging`, `production`.
3. Claude đặt secret `JIRA_CI_TOKEN` bằng cách pipe biến môi trường cùng tên vào `gh secret set`. **[bạn]** Thêm `ao-sample` vào ba App trên giao diện (T2: API từ chối).
4. **[bạn]** Tạo private key mới cho `ao-dev` trên trang của App (mục 2 của `docs/github-apps-setup.md`), báo Claude đường dẫn file. Claude đặt secret `AO_DEV_APP_KEY` của environment `merge-gate` bằng cách pipe file, rồi xóa file.
5. Claude chạy `npm run gh:protect -- --repo TungPH7/ao-sample`, và viết `.claude/settings.local.json` bật hai server MCP ở máy. **[bạn]** Mở `claude` trong `ao-sample` một lần, chấp nhận hộp thoại tin cậy thư mục, rồi thoát (T1, điểm 5).
6. Bước 11: kiểm repo đã nằm trong bản cài GitHub for Atlassian (T2). Vì `.jira/config.yml` có từ commit đầu, **[bạn]** ngắt rồi nối lại kết nối nếu Backfill chưa đọc file này. Bạn kiểm **Backfill status** là **FINISHED**.
7. Bước 13: `npm run jira:check -- --space SMP` không còn chỗ lệch; bạn xem các dòng `Check by hand`.
8. Claude chạy `MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-status"` trong `ao-sample`.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 1 của spec mục 9: `develop` là nhánh mặc định, `main` là tổ tiên của `develop`, `CI` xanh trên commit đầu ở cả `main` và `develop`.
- [ ] Tiêu chí 2: `jira:check` không còn chỗ lệch.
- [ ] Run `Deploy` trên `develop` có `audit` đỏ vì commit không qua PR, và không item nào bị gắn cờ. Run và lý do ghi vào `verification.md`.
- [ ] `/ao-status` thoát 0.
- [ ] Không file key nào còn trên máy ngoài file key đầu của hai App.

**Kiểm chứng:**
- [ ] `git merge-base --is-ancestor origin/main origin/develop` thoát 0
- [ ] `gh api repos/TungPH7/ao-sample/environments` có bốn environment; rule của `merge-gate` chỉ có `develop`

**Phụ thuộc:** T3, T5

**File:** `tasks/verification.md`

**Cỡ:** S

### Checkpoint 2
- [ ] Tiêu chí 1 và 2 của spec mục 9 đạt
- [ ] `MSYS_NO_PATHCONV=1 claude -p --model sonnet "/ao-status"` chạy trong `ao-sample`, thoát 0
- [ ] Bạn xem repo, board `SMP` và bảng các bước cài, rồi đồng ý chạy Epic thử (ước 30–45 USD)

---

## Giai đoạn 3: Epic thử

### [ ] T7: Epic "Ghi chú": `/ao-spec`, `/ao-plan` tới lúc PR tài liệu được merge [bạn]

**Mô tả:**

1. Claude tạo Epic bằng token CI, ở New, với mô tả ở spec mục 2.6.
2. **[bạn]** Bấm `Start spec` trên Epic.
3. Claude chạy `/ao-spec <EPIC>`. Câu hỏi của agent được chuyển cho bạn bằng tiếng Việt; Claude chạy lại sau khi bạn trả lời. Lệnh dừng ở gate ①.
4. **[bạn]** Duyệt SPEC theo `docs/dev-workflow.md`.
5. Claude chạy `/ao-plan <EPIC>`. Lệnh dừng ở gate ②.
6. **[bạn]** Duyệt plan và mức effort của từng item.
7. Claude chạy lại `/ao-plan`: item sang Ready, `merge-gate` merge PR tài liệu.
8. Claude kiểm điểm 6 của spec mục 2.8: panel Development của Epic thấy nhánh và PR tài liệu.

**Tiêu chí chấp nhận:**
- [ ] SPEC, design (nếu có), plan và ADR (nếu có) nằm trong `docs/specs/<EPIC>/` trên `develop`, vào qua PR tài liệu do `merge-gate` merge.
- [ ] `audit` xanh trên commit merge của PR tài liệu.
- [ ] Mỗi lượt agent có dòng trong bảng của `verification.md`.
- [ ] `/ao-status`, `/ao-spec`, `/ao-plan` đã chạy qua `claude -p`.

**Kiểm chứng:**
- [ ] Lịch sử của Epic trên Jira: mỗi lần đổi trạng thái do `automation` hoặc bạn
- [ ] `ADR` của `sa` chốt cách `apps/web` gọi `apps/api` (spec mục 2.1), hoặc plan ghi rõ vì sao không cần ADR

**Phụ thuộc:** T6, Checkpoint 2

**File:** `tasks/verification.md`

**Cỡ:** S

### [ ] T8: `/ao-build` lượt đầu [bạn]

**Mô tả:** Claude chạy `/ao-build` cho item đầu tiên theo plan, thường là Sub-task BE của Story đầu. Câu hỏi hay cờ của agent được chuyển cho bạn. Lệnh dừng khi Sub-task xong và đã push.

**Tiêu chí chấp nhận:**
- [ ] Sub-task đầu xong: code và test trên nhánh `feature/<KEY>-…`, push bằng bot `ao-dev`.
- [ ] Sáu lệnh của T4 xanh trên nhánh đó, chạy ở máy.
- [ ] `/ao-build` đã chạy qua `claude -p`.

**Kiểm chứng:**
- [ ] `git log` của nhánh: tác giả là `tungph7-ao-dev[bot]`, header có mã Jira

**Phụ thuộc:** T7

**File:** `tasks/verification.md`

**Cỡ:** XS

### Checkpoint 3
- [ ] Bạn xem code và test của Sub-task đầu, cùng chi phí từ đầu Epic, rồi đồng ý chạy tiếp

### [ ] T9: `/ao-build`, `/ao-review`, `/ao-fix` tới khi mọi Story sang Ready for QA [bạn]

**Mô tả:**

1. Claude chạy `/ao-build` cho các Sub-task và Story còn lại. Dev agent mở PR.
2. Claude chạy `/ao-review <PR>`: `reviewer` rồi `security`. Lệnh dừng ở gate ③.
3. Có yêu cầu sửa: bạn chọn finding cần sửa, Claude chạy `/ao-fix <PR>`. Không có yêu cầu sửa: bạn nêu một sửa nhỏ, Claude chạy `/ao-fix <PR> <ghi chú>` (spec mục 9, tiêu chí 4).
4. **[bạn]** Approve PR. `merge-gate` merge, `audit` xanh, item sang Ready for QA.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 3–7 của spec mục 9 đạt.
- [ ] Sáu lệnh `/ao-*` đều đã chạy qua `claude -p`, mỗi lệnh ít nhất một lần.
- [ ] Mọi lỗi kit tìm được có kit PR sửa kèm test; lỗi chặn Epic đã vào `ao-sample` qua PR chép kit (plan, quyết định 6).

**Kiểm chứng:**
- [ ] `git log --merges` và danh sách PR của `ao-sample`: mọi commit vào `develop` sau commit đầu đến từ PR
- [ ] Không review nào trên PR đứng tên bạn ngoài approve của bạn

**Phụ thuộc:** T8, Checkpoint 3

**File:** `tasks/verification.md`

**Cỡ:** S

### Checkpoint 4
- [ ] Tiêu chí 3–7 của spec mục 9 đạt
- [ ] Bạn xem lịch sử Epic trên `SMP`, PR tài liệu và PR code trên `ao-sample`, và `.ai/runs/`

---

## Giai đoạn 4: hoàn thiện

### [ ] T10: Bản sửa kit còn lại, tài liệu và lưu trữ plan

**Mô tả:**

1. Nếu còn bản sửa kit chưa vào `ao-sample`: một PR chép kit, review bằng `/ao-review`, bạn merge.
2. `verification.md` có mục "Đầu vào cho `project-scaffold`": bảng các bước cài, bước nào tự động được, bước nào cần bạn, thời gian, chỗ vướng.
3. `SPEC.md` ghi Pilot 1 hoàn thành; `SPEC-pilot-1.md` cập nhật trạng thái; README của kit nhắc `ao-sample` nếu cần.
4. Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/pilot-1/`, sửa link.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 8 của spec mục 9 đạt.
- [ ] Năm lệnh kiểm của kit xanh; mọi link trong file đã chuyển còn đúng.

**Kiểm chứng:**
- [ ] `npm test` xanh
- [ ] Mọi link tương đối trong các file đã chuyển trỏ tới file có thật (Claude quét bằng một lệnh, như ở T19 của `dev-workflow`)

**Phụ thuộc:** T9, Checkpoint 4

**File:** `SPEC.md`, `SPEC-pilot-1.md`, `tasks/archive/pilot-1/*`

**Cỡ:** S

### Checkpoint cuối
- [ ] Đạt 8 tiêu chí ở spec mục 9
- [ ] Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/pilot-1/`
- [ ] Bạn xác nhận Pilot 1 hoàn thành

# Task: tracker-integration

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-tracker-integration.md](../SPEC-tracker-integration.md). Làm theo thứ tự; mỗi task viết test đỏ trước, commit riêng, rồi đánh dấu `[x]`.

**Quy ước chung cho mọi task:**

- Xong task thì `npm run validate`, `npm test` và `npm run render:check` xanh; từ T7 thêm `npm run jira:checklist:check`.
- Mỗi quy tắc J có một test dương (ánh xạ thật không có lỗi mang mã đó) và ít nhất một fixture âm trong `tests/fixtures/tracker/invalid/`.
- Test không gọi mạng. Dữ liệu API ghi sẵn nằm ở `tests/fixtures/tracker/api/`, đã thay email và account id bằng giá trị giả.
- Task có nhãn **[bạn]** cần bạn làm một phần trên Jira, GitHub hoặc Windows; Claude nói rõ từng bước và dừng chờ.
- Token không bao giờ xuất hiện trong chat, commit, log hay lịch sử lệnh (plan, quyết định 8).
- Kiểm thật ghi vào `tasks/verification.md`: ngày, bước, kết quả.
- Cỡ task đếm theo file code và file cấu hình, không tính file test và fixture.
- Nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR. Commit theo `CLAUDE.md`: `type(scope): subject`, không body, không dòng `Co-Authored-By`.

---

## Giai đoạn 1: kết nối thật và ánh xạ

### [x] T1: Kết nối thật bằng hai service account [bạn]

**Mô tả:** Kiểm giả định nền của spec trước khi viết code: agent nối được Rovo MCP bằng token của `orchestratoragent`, và CI gọi được Jira REST API bằng token của `orchestratorci`, trên gói Free.

Bạn làm:
1. Bật xác thực bằng API token cho Rovo MCP: admin.atlassian.com → Connectors → Atlassian MCP server → Authentication → API token.
2. Đặt hai biến môi trường user `ATLASSIAN_AGENT_TOKEN` và `JIRA_CI_TOKEN` bằng hộp thoại "Chỉnh sửa biến môi trường cho tài khoản của bạn" của Windows.
Ngày hết hạn của hai token (2027-10-27) bạn đã báo ngày 2026-10-27.

Claude làm: tạo repo private `TungPH7/ao-pilot` với nhánh `main` và `develop`; viết `kit/.mcp.json`; chạy ba phép thử bên dưới.

**Tiêu chí chấp nhận:**
- [x] Rovo MCP nhận token của agent qua header `Bearer`: `initialize` và `tools/list` trả 200. (Bản đầu ghi `curl -I` trả `200 OK`; cách đó không kiểm được, xem `tasks/verification.md`.)
- [x] Một phiên Claude Code trong `ao-pilot`, dùng `kit/.mcp.json`, gọi được tool Jira của Rovo MCP bằng danh tính service account.
- [x] Token CI gọi được REST API qua `https://api.atlassian.com/ex/jira/<cloud-id>`. (Bản đầu dùng `GET /myself`; endpoint đó cần scope `read:jira-user` mà token không có, nên danh tính `orchestratorci` được kiểm ở T18.)

**Kiểm chứng:**
- [x] Kết quả ba phép thử ghi trong `tasks/verification.md`
- [x] `Bearer` chạy được, không cần Basic auth

**Phụ thuộc:** không

**File dự kiến:** `kit/.mcp.json`, `tasks/verification.md`

**Cỡ:** S

### [ ] T2: Hợp đồng: trường Agent và cách đếm rework

**Mô tả:** Áp hai thay đổi bạn đã duyệt ở spec mục 2.4. Thêm trường `agent` (Agent) vào `work_item_fields`: áp dụng cho Story, Sub-task, Task, Bug; giá trị là các vai trò agent; agent điền khi `start` và `pick-up`. Sửa ghi chú của `rework-count` thành: đếm số transition có effect `increment-rework` trong lịch sử item. Quy tắc R3 kiểm mỗi giá trị của trường Agent là một vai trò đã khai báo, khác `human` và `automation`.

**Tiêu chí chấp nhận:**
- [ ] `work-items.yaml` có trường `agent` với 10 giá trị, khớp 10 vai trò agent trong `roles.yaml`.
- [ ] Fixture âm "trường Agent có giá trị không phải vai trò agent" làm `validateContract` trả lỗi `R3`.
- [ ] `docs/sdlc.md` được sinh lại và có trường mới.

**Kiểm chứng:**
- [ ] `npm run validate`, `npm test`, `npm run render:check` xanh

**Phụ thuộc:** không

**File dự kiến:** `contract/work-items.yaml`, `lib/rules/references.mjs`, `docs/sdlc.md`

**Cỡ:** S

### [ ] T3: `tracker/jira.yaml` phần danh tính, quy tắc J1 và J4

**Mô tả:** Tạo ánh xạ với phần site, cloud id và ba danh tính ở spec mục 2.2 (group, vai trò, ngày hết hạn token: 2027-10-27 cho cả hai). Có schema, `lib/tracker/mapping.mjs` với `readMapping` và `validateMapping`, và `npm run validate` kiểm cả ánh xạ. J1: ánh xạ đúng schema. J4: mỗi vai trò của hợp đồng thuộc đúng một danh tính.

**Tiêu chí chấp nhận:**
- [ ] `npm run validate` báo OK cho cả hợp đồng và ánh xạ; khi có lỗi thì in mã J, đường dẫn, thông báo và thoát mã khác 0.
- [ ] Fixture âm cho J1 (trường lạ, thiếu trường bắt buộc) và J4 (vai trò thiếu danh tính, vai trò thuộc hai danh tính).

**Kiểm chứng:**
- [ ] `npm run validate` và `npm test` xanh
- [ ] Thủ công: sửa tạm ánh xạ cho sai, `npm run validate` báo đúng chỗ sai

**Phụ thuộc:** T2

**File dự kiến:** `tracker/jira.yaml`, `tracker/schema/jira.schema.json`, `lib/tracker/mapping.mjs`, `scripts/validate-contract.mjs`

**Cỡ:** M

### [ ] T4: Ánh xạ workflow, trường, board và môi trường, quy tắc J2 và J3

**Mô tả:** Hoàn thiện ánh xạ theo spec mục 2.3: tên status và nhóm status của ba workflow, tên transition (tách `cancel` theo từng `from`), các trường (custom field Found in, Severity, Agent; trường có sẵn Affects versions, Fix versions, Resolution; cờ Flagged; Rework count đếm từ lịch sử), cột board và giới hạn WIP, môi trường. J2: ánh xạ phủ đủ hợp đồng theo cả hai chiều. J3: tên status không trùng trong một workflow; tên transition chỉ trùng giữa các bản tách của cùng một transition.

**Tiêu chí chấp nhận:**
- [ ] Mọi workflow, state, transition, trường, cột board và môi trường của hợp đồng đều có ánh xạ.
- [ ] Fixture âm cho J2 (thiếu state, thừa transition không có trong hợp đồng) và J3 (trùng tên status, trùng tên transition).

**Kiểm chứng:**
- [ ] `npm run validate` và `npm test` xanh

**Phụ thuộc:** T3

**File dự kiến:** `tracker/jira.yaml`, `tracker/schema/jira.schema.json`, `lib/tracker/mapping.mjs`

**Cỡ:** M

### [ ] T5: Quy ước gắn mã Jira

**Mô tả:** `lib/tracker/conventions.mjs` theo spec mục 2.5: tách mã Jira từ chuỗi, kiểm tên nhánh (`feature/`, `bugfix/`, `hotfix/`, hậu tố `-rN`, nhánh `release/*` không có mã), commit `type(scope): subject (<KEY>)` và tiêu đề PR. `<slug>` gồm chữ thường, số, gạch nối, tối đa 40 ký tự.

**Tiêu chí chấp nhận:**
- [ ] Tên nhánh, commit, tiêu đề PR đúng và sai, mỗi loại có test; hàm trả lý do khi sai.
- [ ] Tách được nhiều mã trong một commit, như `(DEMO-12, DEMO-13)`.

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** không

**File dự kiến:** `lib/tracker/conventions.mjs`

**Cỡ:** S

### [ ] T6: Đếm rework từ lịch sử item

**Mô tả:** `lib/tracker/rework.mjs`: từ lịch sử chuyển trạng thái của một item (định dạng changelog của Jira) và ánh xạ, đếm số transition có effect `increment-rework`, và cho biết đã chạm giới hạn trong `policies.yaml` chưa.

**Tiêu chí chấp nhận:**
- [ ] Đếm đúng với lịch sử có `request-changes` và `qa-fail` xen kẽ, và bỏ qua thay đổi không phải status.
- [ ] Lần thứ 3 thì báo chạm giới hạn, kèm effect `flag-needs-you`.

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** T4

**File dự kiến:** `lib/tracker/rework.mjs`

**Cỡ:** S

### Checkpoint 1
- [ ] `npm run validate`, `npm test`, `npm run render:check` xanh
- [ ] Kết nối của T1 chạy được
- [ ] Bạn soát tên status và transition trong `tracker/jira.yaml`

---

## Giai đoạn 2: dựng Jira và kiểm lệch

### [ ] T7: Sinh checklist dựng Jira

**Mô tả:** `npm run jira:checklist` sinh `docs/jira-setup.md` từ hợp đồng và ánh xạ, theo thứ tự ở spec mục 2.10: group và service account, bật API token cho Rovo MCP, status, workflow (kèm rule Restrict theo group cho từng transition, màn hình chọn Resolution cho `cancel`), workflow scheme, custom field, resolution `Not a bug`, space company-managed `DEMO`, board Kanban với cột và WIP, app GitHub for Jira, GitHub environment và `.jira/config.yml`. Đầu ra tất định, xuống dòng LF. `jira:checklist:check` báo lỗi khi file đã cũ, và chạy trong CI.

**Tiêu chí chấp nhận:**
- [ ] Checklist có đủ mọi status, transition, group, trường và cột của ánh xạ; mỗi mục là một ô tick.
- [ ] Đổi ánh xạ mà không sinh lại thì `jira:checklist:check` thoát mã khác 0.
- [ ] CI của repo kit chạy `jira:checklist:check`.

**Kiểm chứng:**
- [ ] `npm test`, `npm run jira:checklist:check` xanh

**Phụ thuộc:** T4

**File dự kiến:** `lib/tracker/checklist.mjs`, `scripts/jira-checklist.mjs`, `docs/jira-setup.md`, `package.json`, `.github/workflows/contract.yml`

**Cỡ:** M

### [ ] T8: Bạn dựng space `DEMO` theo checklist [bạn]

**Mô tả:** Bạn dựng Jira theo `docs/jira-setup.md`; Claude giải đáp từng bước, và tạo ba GitHub environment `development`, `staging`, `production` trong `ao-pilot`. Ghi lại rule "Restrict who can move a work item" có trên gói Free hay không. Nếu không có, hoặc gói Free thiếu thứ gì khác, Claude sửa spec mục 2.1 và bộ sinh checklist trong cùng task.

**Tiêu chí chấp nhận:**
- [ ] Space `DEMO` có ba workflow, các trường và board Kanban theo checklist; app GitHub for Jira nối với `ao-pilot`.
- [ ] Kết quả về rule Restrict trên gói Free ghi trong `tasks/verification.md`, và trong spec nếu phải đổi.

**Kiểm chứng:**
- [ ] Thủ công: tạo một Story thử trên `DEMO`, đi qua vài status trên board

**Phụ thuộc:** T1, T7

**File dự kiến:** `tasks/verification.md`; nếu phải đổi: `SPEC-tracker-integration.md`, `lib/tracker/checklist.mjs`, `docs/jira-setup.md`

**Cỡ:** S (phần code), phần dựng tay mất khoảng 1–2 giờ

### [ ] T9: `jira:check` phần 1: status, transition, scheme [bạn]

**Mô tả:** Bạn tạo một API token cá nhân chỉ có scope đọc (Claude đưa danh sách scope), đặt vào biến `JIRA_ADMIN_EMAIL` và `JIRA_ADMIN_TOKEN`. Claude viết `lib/tracker/jira-client.mjs` (chỉ GET trong task này, có phân trang), `lib/tracker/drift.mjs` và `scripts/jira-check.mjs`, rồi kiểm các loại lệch: thiếu status, sai nhóm status, transition sai `from` hoặc `to`, scheme thiếu issue type. Dữ liệu mẫu ghi từ `DEMO`.

**Tiêu chí chấp nhận:**
- [ ] Mỗi loại lệch có một bộ dữ liệu mẫu và thông báo mong đợi; có lệch thì thoát mã khác 0.
- [ ] `jira:check` chỉ dùng client chỉ đọc; có test kiểm client này từ chối request ghi.
- [ ] Chạy thật `npm run jira:check -- --space DEMO` cho kết quả đúng với phần đã kiểm.

**Kiểm chứng:**
- [ ] `npm test` xanh; kết quả chạy thật ghi trong `tasks/verification.md`

**Phụ thuộc:** T8

**File dự kiến:** `lib/tracker/jira-client.mjs`, `lib/tracker/drift.mjs`, `scripts/jira-check.mjs`, `package.json`

**Cỡ:** M

### [ ] T10: `jira:check` phần 2: rule Restrict, board, trường, hạn token

**Mô tả:** Kiểm nốt các loại lệch ở spec mục 2.10: rule Restrict thiếu group, cột board hoặc giới hạn WIP sai, thiếu trường hoặc giá trị của trường. Phần nào REST API không đọc được thì in dòng "cần kiểm tay", không báo đạt. Cảnh báo (không báo lỗi) khi token còn dưới 14 ngày.

**Tiêu chí chấp nhận:**
- [ ] Mỗi loại lệch mới có một bộ dữ liệu mẫu và thông báo mong đợi.
- [ ] Chạy thật `npm run jira:check -- --space DEMO` không báo lệch (tiêu chí 3).

**Kiểm chứng:**
- [ ] `npm test` xanh; kết quả chạy thật ghi trong `tasks/verification.md`

**Phụ thuộc:** T9

**File dự kiến:** `lib/tracker/drift.mjs`, `lib/tracker/jira-client.mjs`

**Cỡ:** M

### Checkpoint 2
- [ ] Tiêu chí 2, 3 và 6 của spec mục 9 đạt
- [ ] Bạn xem board `DEMO` và `docs/jira-setup.md`

---

## Giai đoạn 3: agent và hook

### [ ] T11: Dữ kiện từ Jira cho guard

**Mô tả:** Phần Jira của `lib/tracker/facts.mjs` theo spec mục 2.8: `dor-met`, `wip-available` (JQL đếm item ở `in-progress` có cùng giá trị Agent, tính theo Sub-task nếu Story có Sub-task), `subtasks-done`, `qa-report-failed`, `qa-report-passed` (đọc comment báo cáo QA mới nhất theo template `qa-report.md`). Client Jira thêm tìm bằng JQL, đọc item kèm lịch sử, đọc comment.

**Tiêu chí chấp nhận:**
- [ ] Mỗi guard có test cho trường hợp thỏa và không thỏa, dùng client giả.
- [ ] `wip-available` đúng cho cả Story có Sub-task và Story không có Sub-task.

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** T6, T10

**File dự kiến:** `lib/tracker/facts.mjs`, `lib/tracker/jira-client.mjs`

**Cỡ:** M

### [ ] T12: Dữ kiện từ GitHub cho guard

**Mô tả:** `lib/tracker/github-client.mjs` và phần GitHub của `facts.mjs`: `branch-created`, `dependencies-merged`, `pr-open`, `ci-green`, `changes-requested`, `merge-approved`, `pr-merged`, `qa-deployed`, `work-committed`. Dùng `conventions.mjs` để tìm nhánh, PR, commit theo mã item. Token lấy từ `GITHUB_TOKEN` khi chạy trong CI, hoặc từ `gh auth token` ở máy bạn.

**Tiêu chí chấp nhận:**
- [ ] Mỗi guard có test cho trường hợp thỏa và không thỏa, dùng response GitHub ghi sẵn.
- [ ] Item có nhiều PR (sau `qa-fail`) thì guard xét PR mới nhất.

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** T5, T11

**File dự kiến:** `lib/tracker/github-client.mjs`, `lib/tracker/facts.mjs`

**Cỡ:** M

### [ ] T13: Hook `jira-guard`

**Mô tả:** `lib/tracker/guard.mjs` và `kit/.claude/hooks/jira-guard.mjs` theo spec mục 2.6: lấy vai trò từ `agent_type`; đổi transition Jira trong input của `transitionJiraIssue` (theo `transitionId` hoặc `transitionName`) sang transition của hợp đồng; gom dữ kiện; gọi `checkTransition`; trả `permissionDecision: deny` kèm lý do, hoặc cho qua. Chặn mọi transition của agent trên item có label `needs-you` (plan, quyết định 2). Khai báo hook trong `kit/.claude/settings.json`.

**Tiêu chí chấp nhận:**
- [ ] `qa` gọi `accept` thì bị chặn; không có `agent_type` thì bị chặn; `agent_type` không phải vai trò agent thì bị chặn.
- [ ] `fe-dev` gọi `start` khi đã hết chỗ WIP thì bị chặn, lý do nêu thiếu `wip-available`; đủ guard thì cho qua.
- [ ] Item có label `needs-you` thì mọi transition của agent bị chặn.

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** T12

**File dự kiến:** `lib/tracker/guard.mjs`, `kit/.claude/hooks/jira-guard.mjs`, `kit/.claude/settings.json`

**Cỡ:** M

### [ ] T14: Hook đếm rework và hook chặn đường vòng

**Mô tả:** Hook PostToolUse sau `transitionJiraIssue`: đếm lại rework, nếu chạm giới hạn thì trả `decision: block`, yêu cầu agent gắn Flagged, label `needs-you` và comment lý do qua Rovo MCP, rồi dừng (plan, quyết định 2). Hook PreToolUse chặn lệnh Bash có chứa `atlassian`, chặn `mcp__atlassian__executeWrite` và `mcp__atlassian__executeDestructive` (spec mục 2.6), và chặn mọi tool Atlassian không thuộc server `atlassian` của dự án.

**Tiêu chí chấp nhận:**
- [ ] Transition `request-changes` lần thứ 3 thì hook trả yêu cầu gắn cờ; lần 1 và 2 thì không.
- [ ] Lệnh Bash `curl https://api.atlassian.com/...` bị chặn; `executeWrite`, `executeDestructive` và tool `mcp__claude_ai_Atlassian__...` bị chặn; `executeRead` được cho qua.
- [ ] Tool ghi của agent (`createJiraIssue`, `editJiraIssue`, `addOrEditJiraIssueComment`, `transitionJiraIssue`) bị chặn khi item không thuộc space của dự án. Gói Free không có permission scheme, nên token của agent ghi được vào mọi space trên site, kể cả space `SCRUM` có sẵn (phát hiện ở T1).

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** T13

**File dự kiến:** `lib/tracker/guard.mjs`, `kit/.claude/hooks/jira-rework.mjs`, `kit/.claude/hooks/block-atlassian.mjs`, `kit/.claude/settings.json`

**Cỡ:** M

### [ ] T15: Kiểm thật agent và hook trên `DEMO` [bạn]

**Mô tả:** Chép tay `contract/`, `lib/`, `tracker/` vào `ao-pilot/.ai-orchestrator/`, và chép các file trong `kit/` vào `ao-pilot`. Tạo hai subagent thử `qa` và `fe-dev`. Bạn mở Claude Code tương tác trong `ao-pilot` một lần để chấp nhận hộp thoại tin cậy thư mục. Thử các trường hợp ở tiêu chí 4 và 5 của spec.

**Tiêu chí chấp nhận:**
- [ ] Agent tạo, đọc, tìm và chuyển item qua Rovo MCP; lịch sử item ghi `orchestratoragent` (tiêu chí 4).
- [ ] Hook chặn `qa` gọi `accept`, chặn phiên chính gọi transition, cho qua `fe-dev` gọi `start` khi đủ guard (tiêu chí 5).

**Kiểm chứng:**
- [ ] Kết quả và ảnh chụp lịch sử item ghi trong `tasks/verification.md`

**Phụ thuộc:** T8, T14

**File dự kiến:** `tasks/verification.md`; file trong `ao-pilot`

**Cỡ:** S (phần code)

### Checkpoint 3
- [ ] Tiêu chí 4 và 5 của spec mục 9 đạt
- [ ] Bạn xem lịch sử item thử trên `DEMO`

---

## Giai đoạn 4: automation trên GitHub Actions

### [ ] T16: Đối soát: chọn transition của `automation`

**Mô tả:** `lib/tracker/reconcile.mjs`: với một item, từ state hiện tại và dữ kiện, chọn transition của `automation` mà mọi guard đều thỏa, dùng `allowedTransitions` và `checkTransition`. Có `refine-children` cho Epic ở `in-progress`, và gắn bù `flag-needs-you` khi rework đã chạm giới hạn mà item chưa có label.

**Tiêu chí chấp nhận:**
- [ ] Đủ các kịch bản ở spec mục 7: PR mở, CI xanh, Sub-task xong → `submit`; CI đỏ khi đang `in-review` → `request-changes`; PR đã merge, deploy lên `development` thành công → `deploy-to-qa`; deploy lên `staging` cho item mới → không đổi gì; chạy lần hai → không đổi gì.
- [ ] Epic ở `in-progress` có item con đạt DoR → `refine` các item con đó.

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** T12

**File dự kiến:** `lib/tracker/reconcile.mjs`

**Cỡ:** S

### [ ] T17: `jira-sync` và workflow GitHub Actions

**Mô tả:** `scripts/jira-sync.mjs` đọc sự kiện GitHub (`GITHUB_EVENT_NAME`, `GITHUB_EVENT_PATH`), tìm các item liên quan theo mã Jira, gọi `reconcile`, rồi thực hiện transition bằng token CI. Có `--dry-run`. Client Jira thêm các lệnh ghi (transition, sửa item, comment), chỉ bật khi tạo client ở chế độ ghi. `kit/.github/workflows/jira-sync.yml` chạy với các trigger ở spec mục 2.7.

**Tiêu chí chấp nhận:**
- [ ] Mỗi loại sự kiện ở spec mục 2.7 có payload mẫu, và test kiểm danh sách item cùng transition được chọn.
- [ ] `--dry-run` in transition sẽ thực hiện mà không gửi request ghi nào.

**Kiểm chứng:**
- [ ] `npm test` xanh; thủ công: `node scripts/jira-sync.mjs --dry-run` với một payload mẫu

**Phụ thuộc:** T16

**File dự kiến:** `scripts/jira-sync.mjs`, `lib/tracker/jira-client.mjs`, `kit/.github/workflows/jira-sync.yml`

**Cỡ:** M

### [ ] T18: Kiểm thật trên `ao-pilot`

**Mô tả:** Đưa lên `main` của `ao-pilot`: `jira-sync.yml`, `.jira/config.yml`, một CI nhỏ (một test có thể bật đỏ hoặc xanh), và một workflow deploy giả tạo deployment kèm status cho `development`, `staging`, `production`. Đặt secret `JIRA_CI_TOKEN` và biến `JIRA_CLOUD_ID`. Rồi chạy kịch bản ở tiêu chí 7 và 8 với một Story thử trên `DEMO`.

**Tiêu chí chấp nhận:**
- [ ] PR mở và CI xanh thì item sang In Review, do `orchestratorci` chuyển; CI đỏ thì item về In Progress, rework bằng 1 (tiêu chí 7).
- [ ] Merge rồi deploy thử lên `development` thành công khi PR chưa có approve của bạn: item đứng yên ở In Review, `jira-sync` báo thiếu `merge-approved` (plan, câu hỏi 1).
- [ ] Nhánh, commit, PR và các deployment thử hiện trên item; panel Deployments nhận đúng loại môi trường (tiêu chí 8).

**Kiểm chứng:**
- [ ] Kết quả, link run của Actions và ảnh chụp ghi trong `tasks/verification.md`

**Phụ thuộc:** T8, T17

**File dự kiến:** `kit/.jira/config.yml`, `tasks/verification.md`; file trong `ao-pilot`

**Cỡ:** M

### Checkpoint 4
- [ ] Tiêu chí 7 và 8 của spec mục 9 đạt

---

## Giai đoạn 5: hoàn thiện

### [ ] T19: README, đóng câu hỏi mở của `SPEC.md`, lưu trữ plan

**Mô tả:** Thêm phần tracker vào `README.md` (lệnh, biến môi trường, cách cài `kit/` vào dự án). Đóng hai câu hỏi mở trong `SPEC.md` (tiêu chí 9), ghi trạng thái hoàn thành cho module, rồi chuyển các file plan vào `tasks/archive/tracker-integration/`.

**Tiêu chí chấp nhận:**
- [ ] Đạt 9 tiêu chí ở spec mục 9.
- [ ] `SPEC.md` không còn câu hỏi mở thuộc module này.

**Kiểm chứng:**
- [ ] CI xanh trên `main`

**Phụ thuộc:** T18

**File dự kiến:** `README.md`, `SPEC.md`, `SPEC-tracker-integration.md`, các file trong `tasks/`

**Cỡ:** S

### Checkpoint cuối
- [ ] Đạt 9 tiêu chí ở spec mục 9
- [ ] Bạn xác nhận module hoàn thành

# Task: dev-workflow

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-dev-workflow.md](../SPEC-dev-workflow.md). Làm theo thứ tự. Mỗi task viết test đỏ trước, commit riêng, rồi mới đánh dấu `[x]`.

**Quy ước chung cho mọi task:**

- Xong task thì `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check` và `npm run agents:check` phải xanh.
- Quy tắc `Q5` có một test dương và ít nhất một fixture âm trong `tests/fixtures/quality/invalid/`.
- Test không gọi mạng. Dữ liệu mẫu của module nằm trong `tests/fixtures/workflow/`.
- Task có nhãn **[bạn]** cần bạn làm một phần trên GitHub, Jira hoặc trong phiên Claude Code của bạn. Claude ghi rõ từng bước bấm rồi dừng chờ.
- Key và token không bao giờ xuất hiện trong chat, commit, log hay lịch sử lệnh (plan, quyết định 11).
- Kiểm thật ghi vào `tasks/verification.md`: ngày, bước, kết quả. Mỗi lượt chạy agent ghi thêm model, effort, token vào và ra, chi phí quy đổi theo giá API, thời gian và số lượt. Từ T15, Claude lấy các số này từ `.ai/runs/<KEY>/last.md`.
- Agent chạy lần lượt, chỉ trên `ao-pilot` và space `DEMO`.
- Cỡ task đếm theo file code và file cấu hình, không tính file test và fixture.
- Nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR. Commit theo `CLAUDE.md`: `type(scope): subject`, không body, không có dòng `Co-Authored-By`.
- Hỏi bạn trước khi (spec mục 8):
  - cài phần mềm lên máy, hoặc thêm MCP server;
  - đổi điều kiện của `merge-gate` hay `audit` ngoài spec mục 2.4;
  - đổi hợp đồng ngoài spec mục 2.9;
  - đổi ngưỡng của spec mục 2.6;
  - xin thêm quyền cho App ngoài spec mục 2.3.

---

## Giai đoạn 1: tiền đề

### [x] T1: Tiền đề về Claude Code (spec mục 2.11, điểm 6–7)

**Mô tả:** Claude dựng một dự án tạm trong scratchpad:

- `git init`;
- skill `.claude/skills/probe-step/SKILL.md` có `disable-model-invocation: true`, `argument-hint`, và một dòng `` !`node probe.mjs $ARGUMENTS` ``. `probe.mjs` in lại các tham số nó nhận rồi thoát 0;
- skill thứ hai giống hệt, nhưng script của nó thoát 1.

Rồi kiểm hai điểm, bằng Haiku:

6. Skill của dự án:
   - `claude -p "/probe-step DEMO-1 --go"`: model thấy output của `node`, với `$ARGUMENTS` đã được thay;
   - Claude Code chèn `$ARGUMENTS` vào lệnh thế nào: có bọc dấu nháy không, chữ tiếng Việt có dấu, khoảng trắng và dấu nháy đi qua ra sao. Kết quả này quyết định cách `/ao-fix` nhận đoạn chữ tự do ở T13;
   - script thoát 1 làm lệnh bị hủy, như spec mục 2.1 dựa vào;
   - với `disable-model-invocation`, một prompt nhờ model dùng skill không gọi được nó.
7. Lệnh nền:
   - trong phiên này, một lệnh nền dài 20 phút chạy xong và Claude nhận được thông báo;
   - một phiên `claude -p` được nhờ chạy một lệnh nền dài 3 phút rồi chờ: phiên đó chờ tới khi lệnh xong, hay thoát trước.

Kết quả của điểm 7 quyết định ai gõ lệnh `/` ở kiểm thật (plan, quyết định 10).

**Kết quả (2026-11-01):** hai điểm đúng, kèm ba điều kiện: luật `allow` cho dòng kiểm, chỉ truyền `$0`, và `timeout` dài cho lệnh nền trong `claude -p`. Bạn duyệt năm điểm sửa spec ở Phiên 17 · Lượt 5; T3, T12, T13 và T19 đã ghi thêm phần việc tương ứng. Sau T1, bạn không muốn dùng Haiku nữa: phép thử rẻ về sau dùng Sonnet.

**Tiêu chí chấp nhận:**
- [x] Hai điểm có kết quả đúng hoặc sai, kèm bằng chứng (lệnh, trích output), trong `tasks/verification.md`.
- [x] Nếu một điểm sai: spec và plan đã sửa theo kết quả, và bạn đã duyệt bản sửa.
- [x] Mọi lượt chạy dùng Haiku.

**Kiểm chứng:**
- [x] `npm test` xanh
- [x] Dự án tạm chỉ nằm trong scratchpad, không vào repo nào

**Phụ thuộc:** không

**File dự kiến:** `tasks/verification.md`

**Cỡ:** S

### [x] T2: Quyền mới cho hai App và tiền đề về GitHub (điểm 1–5, 8) [bạn]

**Mô tả:**

- Claude viết trước mục "Thêm quyền cho dev-workflow" trong `docs/github-apps-setup.md`: từng bước bấm để thêm quyền cho hai App (spec mục 2.3), rồi chấp nhận quyền mới ở trang cài App của `ao-pilot`. Nhãn nút nào chưa đối chiếu được thì ghi "đối chiếu giao diện".
- `lib/quality/app-manifest.mjs`: App tạo mới bằng `github-app-create.mjs` có sẵn các quyền này, để dự án sau không phải thêm tay.
- Trước khi bạn thêm quyền, Claude kiểm nửa đầu của điểm 2: push một thay đổi trong `.github/workflows/` bị từ chối.

Bạn làm: thêm quyền cho hai App theo mục mới, rồi chấp nhận quyền mới trên `ao-pilot`.

Sau đó Claude kiểm sáu điểm, trong một bản clone tạm của `ao-pilot` ở scratchpad:

- Claude tạo một Task thử trên `DEMO` bằng token CI, và nhánh `feature/<KEY>-identity-probe` từ `develop`.
- Một script tạm trong scratchpad đóng vai credential helper.
- `ao-pr.mjs create` mở một PR nháp. `merge-gate` bỏ qua PR nháp.

Sáu điểm:

1. Push bằng token cài đặt của `ao-dev` qua HTTPS được chấp nhận, và lần push thứ hai lên PR chạy CI cho head mới.
2. Sau khi App có quyền Workflows:
   - token xin `workflows: write` push được thay đổi trong `.github/workflows/`;
   - token chỉ xin `contents: write` vẫn bị từ chối. Đây là điều giữ các vai trò dev không sửa được workflow.
3. Token của `ao-review`, thu hẹp về chỉ đọc Contents, Pull requests, Actions, Checks, làm được `gh pr view --json`, `gh pr diff`, `gh pr checks`, `gh run view` và `gh api` đọc review. `gh pr comment` bằng token đó bị từ chối.
4. `GIT_CONFIG_*` trong môi trường thay được Git Credential Manager của Git for Windows:
   - `GIT_TRACE` cho thấy Git Credential Manager không được gọi;
   - kiểm cả `credential.helper` lẫn `credential.https://github.com.helper` (`git config --show-origin`);
   - `user.name` và `user.email` của bot có trong commit. Id của bot lấy từ `GET /users/tungph7-ao-dev[bot]`.
5. `gh auth status` và `gh api user` với `GH_TOKEN` cho thấy token của App, không phải login `TungPH7`, dù keyring có token của bạn.
6. (Điểm 8 của spec) Commit đứng tên bot qua được hook `commit-msg` và job `policy`, và GitHub for Jira nối commit đó vào Task thử.

Xong thì Claude đóng PR, xóa nhánh và bản clone tạm.

**Tiêu chí chấp nhận:**
- [x] Sáu điểm có kết quả đúng hoặc sai, kèm bằng chứng, trong `tasks/verification.md`.
- [x] `docs/github-apps-setup.md` có mục mới với từng bước bấm; test của README và tài liệu vẫn xanh.
- [x] Test của `app-manifest.mjs` kiểm quyền mới của hai App.
- [x] PR thử đã đóng, nhánh thử đã xóa; Task thử để lại làm bằng chứng.

**Kiểm chứng:**
- [x] `npm test` xanh
- [x] Không token nào được in ra; Claude chỉ in quyền và hạn của token

**Phụ thuộc:** không

**File dự kiến:** `docs/github-apps-setup.md`, `lib/quality/app-manifest.mjs`, `tasks/verification.md`

**Cỡ:** M

### Checkpoint 1

Xem [plan.md](plan.md#checkpoint-1).

---

## Giai đoạn 2: danh tính và cổng

### [x] T3: Môi trường của phiên agent và `ao-git-credential.mjs` (spec mục 2.3)

**Mô tả:**

- `launchPlan` của `lib/agents/launch.mjs` trả thêm `env` cho process con, vẫn là hàm thuần (token được truyền vào):
  - `GH_TOKEN`: token chỉ đọc của `ao-review`;
  - `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_<n>`, `GIT_CONFIG_VALUE_<n>`: `credential.helper` rỗng, rồi helper của kit cho vai trò có `git: write`; `credential.useHttpPath`; `user.name` và `user.email` của bot;
  - `GIT_TERMINAL_PROMPT=0`.
- `scripts/ao-agent.mjs` tạo token chỉ đọc cho repo `origin` của dự án lúc mở phiên, rồi truyền `env` cho `claude`. `--ao-dry-run` in tên biến, không in giá trị.
- `scripts/ao-git-credential.mjs <role>`: trả lời giao thức credential của git.
  - Với `get` cho `github.com` và đúng repo, script in `username=x-access-token` và token của `ao-dev`: `contents: write`, thêm `workflows: write` cho riêng `devops`.
  - Vai trò chỉ đọc hay vai trò lạ: script không in gì, và git báo lỗi.
  - `store` và `erase`: bỏ qua.
- Trong phiên agent, `gh-guard` từ chối lệnh gọi thẳng `ao-git-credential.mjs` (plan, quyết định 5), `ao-step.mjs` và `ao-agent.mjs` (T1: luật `allow` của dòng kiểm cũng áp cho agent).
- Helper không lấy được token thì in lý do ra stderr. T2 cho thấy git khi đó chỉ báo `Repository not found`.

**Tiêu chí chấp nhận:**
- [x] Test của `launchPlan` cho từng loại vai trò: vai trò ghi có helper ghi, vai trò chỉ đọc chỉ có token đọc để `git fetch` (điều chỉnh ở T3, ghi trong `tasks/verification.md`); `devops` xin thêm Workflows.
- [x] Test cho thấy tham số dòng lệnh và file skills không chứa token.
- [x] Test giao thức credential: `get` đúng repo, repo khác, vai trò chỉ đọc, `store`, `erase`.
- [x] Test `gh-guard` từ chối gọi thẳng helper, `ao-step.mjs` và `ao-agent.mjs` trong phiên agent, kể cả khi bọc trong `sh -c` hay `env`; phiên chính của bạn vẫn chạy được `ao-step.mjs`.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh
- [x] `ao-agent.mjs fe-dev --ao-dry-run` trong `ao-pilot` in đúng tên biến, không in token

**Phụ thuộc:** T2

**File dự kiến:** `lib/agents/launch.mjs`, `scripts/ao-agent.mjs`, `scripts/ao-git-credential.mjs`, `lib/agents/git-credential.mjs`, `lib/quality/commands.mjs`

**Cỡ:** M

### [x] T4: `docs_pull_requests` trong `quality/gates.yaml`, schema và Q5 (spec mục 2.4, 7)

**Mô tả:**

- `quality/gates.yaml` thêm mục `docs_pull_requests`:
  - đường dẫn `docs/specs/<EPIC>/**` và `docs/adr/**`;
  - nhánh `feature/<EPIC>-spec`;
  - gate `plan-approval`.
- Schema của `gates.yaml` nhận mục mới.
- Quy tắc `Q5`:
  - đường dẫn chỉ nằm trong `docs/`;
  - không trùng đường dẫn được bảo vệ;
  - gate là gate của hợp đồng.
- `npm run validate` in `Gates OK` như trước.

**Tiêu chí chấp nhận:**
- [x] Q5 có test dương và ít nhất ba fixture âm, mỗi fixture một điều kiện.
- [x] `lib/quality/gates.mjs` đọc được mục mới, có test.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** không

**File dự kiến:** `quality/gates.yaml`, `quality/schema/gates.schema.json`, `lib/quality/gates.mjs`

**Cỡ:** S

### [x] T5: `merge-gate` và `audit` nhận PR tài liệu (spec mục 2.4)

**Mô tả:**

- Hàm thuần mới:
  - `docsPullRequest({ pr, files, gates, apps })`: trả về Epic của PR, hoặc không có nếu PR không phải PR tài liệu;
  - `decideDocsMerge`: quyết định theo trạng thái Epic, thời điểm duyệt plan và lượt CI của head.
- Thời điểm duyệt plan lấy từ changelog của Epic: lần chuyển `approve-plan` gần nhất.
- Lượt CI của head là lượt workflow `CI` sớm nhất cho head đó, theo `created_at` do GitHub ghi. Chạy lại CI không đổi `created_at`.
- `runMergeGate` đọc Epic bằng một Jira client chỉ đọc khi gặp PR tài liệu. PR nào không đủ điều kiện PR tài liệu thì đi theo luật thường.
- `decideAudit` nhận commit merge của PR tài liệu với cùng điều kiện.
- Workflow:
  - `kit/.github/workflows/merge-gate.yml` thêm `JIRA_CI_TOKEN`, và quyền `actions: read` để đọc lượt CI;
  - `audit.yml` thêm `actions: read` nếu thiếu.

**Tiêu chí chấp nhận:**
- [x] Test theo spec mục 7:
  - merge khi đủ điều kiện;
  - chờ khi Epic chưa qua gate ②;
  - không merge khi lượt CI của head bắt đầu sau lúc duyệt;
  - không phải PR tài liệu khi có một file ngoài hai đường dẫn, khi head không phải nhánh spec của Epic, hoặc khi PR không do `ao-dev` mở.
- [x] `audit` qua với commit merge của PR tài liệu hợp lệ, và trượt với PR có commit sau lúc duyệt.
- [x] Dữ liệu ghi sẵn ở `tests/fixtures/quality/api/docs-pr.json`.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh
- [x] `merge-gate.mjs --dry-run` trên `ao-pilot` vẫn in đúng như trước cho các PR đang mở

**Phụ thuộc:** T4

**File dự kiến:** `lib/quality/merge-gate.mjs`, `lib/quality/audit.mjs`, `lib/quality/docs-pr.mjs`, `scripts/merge-gate.mjs`, `scripts/audit.mjs`, `kit/.github/workflows/merge-gate.yml`, `kit/.github/workflows/audit.yml`

**Cỡ:** M

### [x] T6: `merge-gate` báo PR cần bạn, `jira-sync` gỡ cờ (spec mục 2.7)

**Mô tả:**

- Khi PR cần bạn tự merge chỉ còn chờ bạn (không thiếu gì, hoặc chỉ thiếu approve), `runMergeGate` làm hai việc, mỗi việc một lần cho mỗi head, nhận ra nhờ dấu `merge-gate: needs you at <sha> on PR #<n>` trong comment (điều chỉnh ở T6, spec mục 2.7):
  - comment lên PR bằng `ao-dev`: đường dẫn được bảo vệ, điều còn thiếu, và nhắc approve trước rồi mới merge;
  - gắn cờ "Needs you" lên item của nhánh bằng token CI, kèm comment cùng nội dung.
- `jira-sync.yml` nghe thêm sự kiện `closed` của PR. Sự kiện này chỉ dùng để gỡ cờ. Khi PR được merge hoặc đóng, `jira-sync` gỡ cờ và nhãn `needs-you`, nhưng chỉ khi comment cờ mới nhất của item là comment của `merge-gate` cho đúng PR đó.
- `--dry-run` của cả hai script in việc sẽ làm, không làm.

**Tiêu chí chấp nhận:**
- [x] Test: chạy hai lần trên cùng head chỉ comment và gắn cờ một lần; head mới thì comment lại.
- [x] Test: `jira-sync` gỡ cờ của `merge-gate`. Nó không gỡ khi comment cờ mới nhất là của `audit` hay của giới hạn Rework.
- [x] Test: sự kiện `closed` không gây chuyển trạng thái nào.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T5 (`merge-gate.yml` đã có `JIRA_CI_TOKEN`)

**File dự kiến:** `lib/quality/merge-gate.mjs`, `lib/tracker/sync.mjs`, `scripts/merge-gate.mjs`, `scripts/jira-sync.mjs`, `kit/.github/workflows/jira-sync.yml`

**Cỡ:** M

### [x] T7: `jira-sync` đánh dấu dòng DoR (spec mục 2.9)

**Mô tả:**

- Hàm thuần `tickDorLine(description, line)`:
  - đánh dấu dòng "Thuộc Epic có plan đã duyệt" trong mô tả item, ở cả hai dạng: ô checkbox của ADF (`taskItem` sang `DONE`), và chữ `[ ]` trong văn bản;
  - lấy câu chữ của dòng từ `contract/work-items.yaml`, không viết cứng.
- `refine` và `refine-children` của `jira-sync` sửa mô tả sau khi chuyển trạng thái. Không tìm thấy dòng đó thì `jira-sync` comment thay.

**Tiêu chí chấp nhận:**
- [x] Test cho hai dạng, cho dòng đã đánh dấu sẵn (không sửa), và cho mô tả không có dòng đó (comment).
- [x] Test cho `refine-children`: mỗi item con được sửa một lần.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** không

**File dự kiến:** `lib/tracker/dor.mjs`, `lib/tracker/sync.mjs`

**Cỡ:** S

---

## Giai đoạn 3: `ao-step.mjs`

### [x] T8: `runs.mjs` và `requests.mjs` (spec mục 2.2, 2.8)

**Mô tả:**

- `lib/workflow/runs.mjs`:
  - `readRun(lines, previous)`: từ log stream-json của một lượt, lấy kết quả (xong, hết lượt, hết usage, lỗi), session id, số lượt, thời gian, token, chi phí quy đổi và `permission_denials`;
  - với lượt `--resume`, số liệu của log là cộng dồn cả phiên, nên hàm trừ đi số của lượt trước (ghi chú T18 của `agent-roster`);
  - `openQuestions(markdown)`: các câu còn trong mục Open Questions của spec, design hay plan.
- `lib/workflow/requests.mjs`: `openRequests(comments, agentNames)`. Một comment mở đầu bằng `Cần <role>:` là yêu cầu còn mở, cho tới khi vai trò đó comment lên cùng item sau nó.

**Tiêu chí chấp nhận:**
- [x] Test `readRun` trên log thật của `agent-roster`, cắt gọn và bỏ nội dung không cần: một lượt xong, và một cặp lượt đầu với lượt `--resume`. Trường hợp không có log thật (hết lượt, hết usage) thì dựng tay theo dạng của log thật.
- [x] Test `openQuestions`: mục trống, mục ghi "Không có", mục có câu hỏi.
- [x] Test `openRequests`: yêu cầu còn mở, đã xong, và comment của vai trò khác không tính là xong.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh
- [x] Fixture không chứa token, email hay đường dẫn của máy bạn

**Phụ thuộc:** không

**File dự kiến:** `lib/workflow/runs.mjs`, `lib/workflow/requests.mjs`

**Cỡ:** S

### [x] T9: `facts.mjs` và nhãn trong `tracker/jira.yaml` (spec mục 2.2, 2.5)

**Mô tả:**

- `tracker/jira.yaml` thêm tiền tố nhãn vai trò (`ao-`) và nhãn effort (`ao-effort-`), kèm schema.
- `lib/workflow/facts.mjs` gom dữ kiện cho một item hay một PR:
  - Jira, đọc bằng `ATLASSIAN_AGENT_TOKEN`: trạng thái, loại, nhãn, trường Agent và Rework, Sub-task, phụ thuộc, comment; với Epic thêm thời điểm qua từng gate;
  - GitHub, đọc bằng token chỉ đọc của `ao-review`: PR tài liệu của Epic theo nhánh `feature/<EPIC>-spec`, PR mới nhất của item, check, review;
  - ledger `.ai/ledger/<KEY>.md` và `.ai/runs/<KEY>/state.json`.
- Guard của hợp đồng (`wip-available`, `dependencies-merged`…) dùng lại `jiraGuards` và `githubGuards`.

**Tiêu chí chấp nhận:**
- [x] Test trên dữ liệu ghi sẵn từ `DEMO` và `ao-pilot`:
  - Epic DEMO-11 có nhánh tài liệu;
  - Story DEMO-12 có hai Sub-task;
  - PR #11.
- [x] Test cho item không có PR, và cho `.ai/runs/` trống.
- [x] Schema của `jira.yaml` từ chối tiền tố rỗng.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh
- [x] Bản ghi dữ liệu không chứa token

**Phụ thuộc:** không

**File dự kiến:** `lib/workflow/facts.mjs`, `tracker/jira.yaml`, `tracker/schema/jira.schema.json`

**Cỡ:** M

### [x] T10: `decideStep` cho `status`, `spec`, `plan` (spec mục 2.1, 2.2, 2.4)

**Mô tả:**

- `lib/workflow/steps.mjs`, `decideStep(command, facts)`:
  - `status`: việc đang chờ bạn, bước kế tiếp của từng item, yêu cầu còn mở, chi phí đã tốn theo `.ai/runs/`;
  - `spec`: Epic ở Specifying, WIP `epic-shaping` còn chỗ. Lượt chạy: `ba`; `ux` nếu SPEC có màn hình; `sa`. `ba` mở PR tài liệu khi xong stage;
  - `plan`, lần đầu: Epic ở Planning, PR tài liệu đang mở. Lượt chạy: `sa`, rồi `ba`;
  - `plan`, lần hai: Epic đã qua gate ②. Không agent nào chạy; việc cần làm là gọi `jira-sync` cho Epic, rồi chờ `merge-gate` merge PR tài liệu.
- `lib/workflow/prompts.mjs`: prompt của `ba`, `ux`, `sa` cho hai stage, và prompt `--resume` kèm câu trả lời của bạn.

**Tiêu chí chấp nhận:**
- [x] Mỗi lệnh có một trường hợp `GO`. Mỗi điều kiện dừng có một trường hợp `STOP`, kèm lý do và lệnh nên chạy thay.
- [x] Có lượt dở dang trong `state.json` thì lượt đó được chạy tiếp bằng `--resume`, kèm lời nhắc đọc ledger.
- [x] Prompt không lặp lại phần agent đã có trong định nghĩa của nó; test so với file agent sinh ra.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T8, T9

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`

**Cỡ:** M

### [x] T11: `decideStep` cho `build`, `review`, `fix` (spec mục 2.1, 2.5, 2.6)

**Mô tả:**

- `build`:
  - điều kiện: item ở Ready, hoặc In Progress có ledger; phụ thuộc đã merge; PR tài liệu của Epic đã merge; WIP `dev-agent` còn chỗ;
  - agent theo Sub-task, BE trước FE, hoặc theo nhãn vai trò của item;
  - effort theo nhãn, không có nhãn thì theo roster;
  - item thiếu nhãn vai trò thì dừng và nói rõ, không đoán.
- `review`: CI xanh trên head. Lượt chạy: `reviewer`, rồi `security`, đầy đủ hoặc chỉ phần mới.
- `fix`:
  - điều kiện: có yêu cầu sửa hoặc CI đỏ trên head, hoặc bạn ghi việc cần sửa sau mã PR;
  - lượt chạy: dev agent của item, rồi như `review`;
  - Rework từ 2 trở lên thì dev agent chạy ở ít nhất `xhigh`.
- Hàm thuần `securityScope`: theo spec mục 2.6, đọc kết quả so sánh commit X với head (`compare`), số dòng và file.
- Prompt của dev agent, `reviewer`, `security` đầy đủ và `security` phần mới.

**Tiêu chí chấp nhận:**
- [x] Test theo spec mục 7 cho ba lệnh:
  - `GO`, và từng điều kiện `STOP`;
  - thứ tự BE trước FE;
  - effort theo nhãn;
  - Rework từ 2 thì `xhigh`.
- [x] Test `securityScope`:
  - X là tổ tiên, hay đã rebase;
  - đúng 300 dòng, và 301 dòng;
  - diff đụng đường dẫn được bảo vệ;
  - không có báo cáo đọc được.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T10

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, `lib/workflow/security-scope.mjs`

**Cỡ:** M

### [x] T12: `ao-step.mjs` và `runner.mjs` (spec mục 2.1, 2.2)

**Mô tả:**

- `scripts/ao-step.mjs <lệnh> <đối số> [--go] [--answers <file>] [--note <file>]`:
  - đối số phải là mã item của space hoặc số PR; sai dạng thì script dừng và nói rõ;
  - `--note <file>`: việc cần sửa mà bạn ghi sau mã PR của `/ao-fix`, chuyển vào prompt của dev agent;
  - không có `--go`: in dữ kiện và kết luận theo mẫu ở spec mục 6, rồi thoát 0;
  - chỉ thoát khác 0 khi script hỏng, ví dụ thiếu token hay không đọc được Jira.
- `lib/workflow/runner.mjs` (plan, quyết định 3), vòng chạy của `--go`:
  - mỗi lượt chạy `ao-agent.mjs <role> -p <prompt> --output-format stream-json --verbose`, với `--effort` và `CLAUDE_CODE_EFFORT_LEVEL` (plan, quyết định 6);
  - log của lượt ghi ở `.ai/runs/<KEY>/<n>-<role>.jsonl`;
  - `state.json` được ghi xong sau mỗi lượt, rồi runner gom dữ kiện lại và quyết định lượt kế tiếp;
  - dừng sớm khi: agent để lại câu hỏi; agent gắn cờ "Needs you"; agent thất bại hai lần liên tiếp (`retry.agent_failures_before_stop`); CI đỏ;
  - sau lượt push lên PR, runner chờ CI xong, có giới hạn thời gian;
  - cuối cùng viết `last.md`: bảng các lượt và số đo, câu hỏi còn mở, việc bạn cần làm ở cổng, lệnh nên chạy tiếp.
- `--answers <file>`: chạy lại đúng agent đó bằng `--resume <session>`, với câu trả lời của bạn.
- Lần chạy thứ hai của `/ao-plan`: gọi `gh workflow run jira-sync -f item=<EPIC>` bằng login của bạn, chờ lượt `merge-gate` theo sau, rồi báo PR tài liệu đã merge hay còn chờ gì.

**Tiêu chí chấp nhận:**
- [x] Test `runner` với hàm mở process giả và dữ kiện ghi sẵn:
  - thứ tự lượt;
  - `state.json` sau từng lượt;
  - mỗi điều kiện dừng;
  - chạy tiếp lượt dở;
  - `--answers`;
  - nội dung `last.md`.
- [x] Test: hai agent không bao giờ chạy cùng lúc.
- [x] Test: lệnh của mỗi lượt không chứa token.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh
- [x] `ao-step.mjs status` chạy được trong `ao-pilot` với code của kit, chỉ đọc

**Phụ thuộc:** T3, T11

**File dự kiến:** `scripts/ao-step.mjs`, `lib/workflow/runner.mjs`

**Cỡ:** M

### [x] T13: Sáu skill `/ao-*` (spec mục 2.1, 2.9, 6)

**Mô tả:**

- `kit/.claude/skills/ao-status/`, `ao-spec/`, `ao-plan/`, `ao-build/`, `ao-review/`, `ao-fix/`, mỗi thư mục một `SKILL.md` theo mẫu ở spec mục 6:
  - dòng `!` chỉ truyền `$0`;
  - `--go` chạy ở nền với `timeout` 7200000;
  - `/ao-fix` ghi đoạn chữ sau mã PR vào `.ai/runs/<KEY>/note.md`, rồi truyền `--note`.
- `kit/.claude/settings.json` thêm `permissions.allow: ["Bash(node .ai-orchestrator/scripts/ao-step.mjs:*)"]` (spec mục 2.1).
- `skills:vendor`, quy tắc `A4` và các test của chúng bỏ qua thư mục `ao-*`.

**Tiêu chí chấp nhận:**
- [x] Test: frontmatter của sáu skill có `disable-model-invocation: true` và `argument-hint`; dòng `!` gọi đúng lệnh của `ao-step.mjs` và chỉ dùng `$0`; skill nào chạy `--go` cũng nêu `timeout`.
- [x] Test: `kit/.claude/settings.json` có luật `allow` cho `ao-step.mjs`, và không có luật `allow` nào khác.
- [x] Test: `skills:vendor` không đụng tới thư mục `ao-*`, và `A4` không báo chúng là skill lạ.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T1, T12

**File dự kiến:** sáu file `kit/.claude/skills/ao-*/SKILL.md`, `kit/.claude/settings.json`, `lib/agents/vendor.mjs`, `lib/agents/roster.mjs`

**Cỡ:** S

---

## Giai đoạn 4: template, hợp đồng, prompt

### [ ] T14: Template, hợp đồng, prompt và `agents/rules.md` (spec mục 2.4, 2.8, 2.9)

**Mô tả:**

- Template:
  - `adr.md`: Status của ADR viết cho một Epic, theo spec mục 2.4;
  - `plan.md`: vai trò và effort trong Task List, kèm ví dụ;
  - `review-report.md`: dòng `Scope: changes since <X>` cho báo cáo chỉ review phần mới. `readReviewReport` đọc được dòng đó.
- Hợp đồng:
  - stage `spec` có thêm đầu ra "PR tài liệu của Epic";
  - stage `plan` ghi PR đó được merge sau gate ②;
  - `npm run render` sinh lại `docs/sdlc.md`.
- Prompt:
  - `sa` ghi vai trò và effort vào Task List, và Status của ADR;
  - `ba` gắn nhãn khi tạo item, mở PR tài liệu, sửa comment câu hỏi sau khi có trả lời;
  - `security` có chế độ review phần mới;
  - `reviewer` và `security` coi trạng thái trên Jira là sự thật về gate và ADR.
- `agents/rules.md`:
  - quy ước `Cần <role>:` cho yêu cầu giữa các vai trò;
  - comment của agent mở đầu bằng tên của nó trong trường Agent.
- `npm run agents` sinh lại `kit/.claude/agents/` và file quy ước.

**Tiêu chí chấp nhận:**
- [ ] Test của template: ví dụ của `plan.md` có vai trò và effort; ví dụ của `review-report.md` có `Scope`.
- [ ] Test `readReviewReport` với báo cáo có dòng `Scope` và không có.
- [ ] `docs/sdlc.md` có đầu ra mới của stage `spec`.
- [ ] `npm run agents:check` xanh sau khi sinh lại.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** không

**File dự kiến:** `templates/adr.md`, `templates/plan.md`, `templates/review-report.md`, `lib/quality/pull-request.mjs`, `contract/stages.yaml`, `docs/sdlc.md`, `agents/prompts/ba.md`, `agents/prompts/sa.md`, `agents/prompts/reviewer.md`, `agents/prompts/security.md`, `agents/rules.md`, `kit/.claude/agents/*.md`, `kit/.claude/rules/ai-orchestrator.md`

**Cỡ:** M

### Checkpoint 2

Xem [plan.md](plan.md#checkpoint-2).

---

## Giai đoạn 5: lên `ao-pilot`

### [ ] T15: Bản chép kit mới vào `ao-pilot` qua PR [bạn] (spec mục 2.10, kiểm thật 3)

**Mô tả:**

- Claude tạo một Task trên `DEMO` bằng token CI, rồi chép kit theo các bước cài của README vào nhánh `feature/<KEY>-dev-workflow-kit`, tách từ `develop`.
- Workflow deploy của `ao-pilot` cấp thêm `actions: read` cho lần gọi `audit.yml` (T5).
- Commit và push bằng credential helper, vai trò `devops` (plan, quyết định 8). `ao-dev` mở PR bằng `ao-pr.mjs create`.
- Claude kiểm `merge-gate`: một comment lên PR và một cờ trên Task, không lặp lại ở lượt `merge-gate` sau.
- `ao-step.mjs review <PR>` chạy ở chế độ chỉ kiểm, rồi với `--go`, từ nhánh của PR: `reviewer`, rồi `security` đầy đủ ở `max`.
- Bạn approve, rồi tự squash merge.
- Claude kiểm:
  - `audit` xanh trên commit merge;
  - Deploy development chạy;
  - `jira-sync` gỡ cờ của Task.

Bạn làm: đọc diff của PR, approve, rồi bấm **Squash and merge**.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 6 và 9 của spec mục 9 đạt.
- [ ] Commit của PR đứng tên bot `ao-dev`.
- [ ] Số đo của hai lượt review có trong `tasks/verification.md`.

**Kiểm chứng:**
- [ ] `ao-pilot` có sáu skill `/ao-*` và `ao-step.mjs`; `git status` sạch sau khi merge

**Phụ thuộc:** T3, T5, T6, T7, T13, T14

**File dự kiến:** `tasks/verification.md` (repo kit); bản chép trong `ao-pilot`

**Cỡ:** M

### [ ] T16: Thử đi vòng (kiểm thật 5)

**Mô tả:** Hai lượt ngắn, ở `CLAUDE_CODE_EFFORT_LEVEL=low`, trong `ao-pilot`:

- `reviewer` chạy `gh auth status` và `gh api user`: kết quả là token của App, không phải login của bạn. Rồi nó thử `git push` một nhánh tạm: bị từ chối, vì không có credential.
- `fe-dev` commit và push một nhánh tạm `feature/<KEY>-push-probe`, với key của Task ở T15: push được, commit đứng tên bot.

Xong thì Claude xóa nhánh tạm trên GitHub.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 3 của spec mục 9 đạt, có bằng chứng trong `tasks/verification.md`.
- [ ] Nhánh tạm đã xóa.

**Kiểm chứng:**
- [ ] `permission_denials` và output của hai lượt được ghi lại

**Phụ thuộc:** T15

**File dự kiến:** `tasks/verification.md`

**Cỡ:** S

### Checkpoint 3

Xem [plan.md](plan.md#checkpoint-3).

---

## Giai đoạn 6: kiểm thật

### [ ] T17: Epic thử: `/ao-spec`, `/ao-plan` tới lúc PR tài liệu được merge [bạn] (kiểm thật 4)

**Mô tả:**

- Claude tạo Epic "Xóa sản phẩm khỏi giỏ hàng" trên `DEMO` bằng token CI. Mô tả ngắn gọn: giỏ hàng hiện có gì, và "xóa" nghĩa là gì.
- `/ao-status` ở đầu vòng.
- Bạn bấm `Start spec`.
- `/ao-spec`:
  - `ba` chạy. Bạn trả lời câu hỏi của `ba` ngay trong chat, rồi `ba` chạy tiếp bằng `--answers`;
  - `ux` chạy, vì trang giỏ hàng có màn hình;
  - `sa` chạy;
  - `ba` mở PR tài liệu; CI xanh, và job `policy` kiểm `design.md`.
- Bạn đọc diff của PR tài liệu, rồi bấm `Approve spec`.
- `/ao-plan`:
  - `sa` viết plan với vai trò và effort trong Task List, và ADR nếu cần;
  - `ba` tạo Story và Sub-task, có nhãn;
  - nếu không item nào có nhãn effort, Claude báo bạn trước gate ②. Bạn chọn một item, và `sa`, `ba` sửa bằng `--answers` (tiêu chí 7).
- Bạn bấm `Approve plan`.
- `/ao-plan` lần nữa:
  - `jira-sync` chuyển item sang Ready;
  - `merge-gate` merge PR tài liệu mà không cần approval trên GitHub;
  - `audit` xanh khi Deploy development chạy (tiêu chí 4).

Bạn làm: bấm `Start spec`, `Approve spec`, `Approve plan`; trả lời câu hỏi của agent; gõ lệnh `/` theo plan, quyết định 10.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 4 của spec mục 9 đạt.
- [ ] Mọi lượt agent của T17 có trong `.ai/runs/`, kèm số đo trong `tasks/verification.md`.
- [ ] Task List của plan có vai trò cho mọi item, và ít nhất một item có effort.

**Kiểm chứng:**
- [ ] Mô tả của item mới có dòng DoR đã được đánh dấu sau khi refine

**Phụ thuộc:** T16, Checkpoint 3

**File dự kiến:** `tasks/verification.md`

**Cỡ:** M

### [ ] T18: Epic thử: `/ao-build`, `/ao-review`, `/ao-fix` tới merge [bạn] (kiểm thật 4)

**Mô tả:**

- `/ao-build` cho Story:
  - `be-dev` làm Sub-task BE, rồi `fe-dev` làm Sub-task FE và mở PR;
  - commit và push đứng tên bot;
  - item có nhãn effort chạy đúng mức đó: `state.json` và lệnh của lượt ghi mức đã dùng (tiêu chí 7).
- `/ao-status` ở giữa vòng.
- `/ao-review`: `reviewer`, rồi `security` đầy đủ ở `max`.
- `/ao-fix` cho một finding:
  - nếu không có finding nào, bạn ghi việc cần sửa sau mã PR;
  - dev agent sửa, rồi `reviewer` review đầy đủ;
  - `security` chỉ review phần mới ở `high`, báo cáo có dòng `Scope`, và `merge-gate` nhận báo cáo đó (tiêu chí 5).
- Bạn approve. `merge-gate` merge PR, `audit` xanh, Story sang Ready for QA và dừng ở đó (plan, quyết định 9).
- `/ao-status` ở cuối vòng: chi phí của từng item.
- Claude đối chiếu `.ai/runs/` với lịch sử: mọi lượt agent của Epic đều do sáu lệnh mở (tiêu chí 8).

Bạn làm: approve PR; ghi việc cần sửa nếu cần; gõ lệnh `/` theo plan, quyết định 10.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 5, 7 và 8 của spec mục 9 đạt.
- [ ] Số đo của mọi lượt có trong `tasks/verification.md`.

**Kiểm chứng:**
- [ ] `git log --format='%an %ae'` của PR chỉ có bot `ao-dev`
- [ ] GitHub for Jira hiện commit và PR trên Story

**Phụ thuộc:** T17

**File dự kiến:** `tasks/verification.md`

**Cỡ:** M

### Checkpoint 4

Xem [plan.md](plan.md#checkpoint-4).

---

## Giai đoạn 7: hoàn thiện

### [ ] T19: Tài liệu, `SPEC.md` và lưu trữ plan (spec mục 9, tiêu chí 10)

**Mô tả:**

- README có mục về sáu lệnh, kèm test trong `tests/repo.test.mjs` như các mục trước.
- `docs/dev-workflow.md`:
  - sáu lệnh;
  - một vòng Epic từ đầu tới cuối;
  - cách đọc `.ai/runs/`;
  - khi nào lệnh dừng;
  - chạy tiếp sau khi hết usage;
  - `MSYS_NO_PATHCONV=1` khi gõ `claude -p "/ao-…"` trong Git Bash (T1).
- `docs/github-apps-setup.md`: soát lại mục của T2.
- `SPEC-dev-workflow.md` và `SPEC.md` ghi module hoàn thành.
- Các việc để lại cho `release-workflow` và Pilot 1 ghi ở cuối `tasks/verification.md`.
- `plan.md`, `todo.md`, `verification.md` và ảnh chuyển vào `tasks/archive/dev-workflow/`.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 1 và 10 của spec mục 9 đạt.
- [ ] Link trong các file đã chuyển vẫn đúng.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung và CI của kit xanh

**Phụ thuộc:** T18, Checkpoint 4

**File dự kiến:** `README.md`, `docs/dev-workflow.md`, `docs/github-apps-setup.md`, `tests/repo.test.mjs`, `SPEC-dev-workflow.md`, `SPEC.md`, `tasks/archive/dev-workflow/`

**Cỡ:** M

### Checkpoint cuối

Xem [plan.md](plan.md#checkpoint-cuối).

# SPEC: dev-workflow

> **Module:** `dev-workflow`, xem capability map trong [SPEC.md](SPEC.md). **Phụ thuộc:** `sdlc-contract`, `tracker-integration`, `quality-gates`, `agent-roster`. **Được dùng bởi:** `release-workflow`, `project-scaffold`, và `orchestrator-cli` ở Cấp 2.
>
> **Trạng thái:** đã duyệt ngày 2026-10-31; plan đã duyệt ngày 2026-10-31. Module hoàn thành ngày 2026-11-01; plan, danh sách task và kết quả kiểm thật lưu ở [tasks/archive/dev-workflow/](tasks/archive/dev-workflow/plan.md). Tài liệu cho bạn: [docs/dev-workflow.md](docs/dev-workflow.md). **Nguồn thảo luận:** [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md), Phiên 16 · Lượt 9–10, Phiên 17 · Lượt 1.

## 1. Mục tiêu

Ở `agent-roster`, Claude tự làm người điều phối: mở từng agent, chờ, đọc kết quả, xem CI và `merge-gate`, chuyển câu hỏi cho bạn, rồi quyết bước tiếp theo. Module này đóng gói việc đó thành lệnh, để bạn tự đưa một Epic đi từ spec tới merge vào `develop` trong phiên Claude Code của mình. Sau module này:

- Có sáu lệnh `/ao-status`, `/ao-spec`, `/ao-plan`, `/ao-build`, `/ao-review`, `/ao-fix`. Mỗi lệnh kiểm trạng thái bằng một script tất định, gọi đúng agent theo đúng thứ tự, và dừng ở cổng cần bạn.
- Agent làm việc với GitHub bằng danh tính của hai App: commit và push dưới tên bot `ao-dev`, đọc bằng token chỉ đọc. Agent không còn dùng login `gh` và git của bạn, nên không agent nào approve được dưới tên bạn bằng đường thông thường.
- Tài liệu của Epic (SPEC, design, plan, ADR) vào `develop` qua một PR riêng. `merge-gate` merge PR đó sau khi bạn duyệt plan ở gate ②.
- Item khó được chạy ở effort cao hơn: bạn duyệt mức effort cùng plan.
- Sau một commit sửa nhỏ, `security` chỉ review phần mới, ở `high`.
- `merge-gate` báo PR cần bạn tự merge lên cả PR lẫn Jira. Yêu cầu giữa các vai trò hiện trong `/ao-status`.
- Bản chép kit trong `ao-pilot` được cập nhật, và một Epic nhỏ đi qua đủ sáu lệnh.

**Ngoài phạm vi:**

- Tự chạy bước kế tiếp khi bước trước xong, không cần bạn gõ lệnh: `orchestrator-cli` ở Cấp 2.
- QA, deploy lên Development, Staging, Production, cắt release, hotfix, rollback: `release-workflow`. Lệnh của module này dừng khi PR được merge vào `develop`.
- Cách ly agent ở mức hệ điều hành (user Windows riêng, WSL2 có sandbox). Bạn chọn danh tính bằng App (Phiên 16 · Lượt 10); phần còn hở ghi ở mục 12.
- Figma: `figma-integration`. Agent chạy trong GitHub Actions: `ci-agents` ở Cấp 2.
- Pilot 1 trên dự án mẫu Next.js + NestJS: làm sau module này.

## 2. Thiết kế

### 2.1 Sáu lệnh

Lệnh là skill của kit ở `kit/.claude/skills/ao-<lệnh>/SKILL.md`, với `disable-model-invocation: true`: lệnh chỉ chạy khi bạn gõ, Claude không tự gọi. Bạn gõ lệnh trong phiên Claude Code ở gốc repo dự án.

| Lệnh | Cần trước | Gọi agent | Kết thúc khi |
|---|---|---|---|
| `/ao-status [KEY]` | Không | Không | In xong việc đang chờ bạn, bước kế tiếp của từng item, yêu cầu giữa các vai trò, và chi phí đã tốn của item |
| `/ao-spec <EPIC>` | Epic ở Specifying (bạn đã `Start spec`); WIP `epic-shaping` còn chỗ | `ba`; rồi `ux` nếu SPEC có màn hình; rồi `sa` | PR tài liệu mở và CI xanh, chờ gate ①; hoặc một agent để lại câu hỏi |
| `/ao-plan <EPIC>` | Epic ở Planning; PR tài liệu đang mở | `sa` viết plan và ADR; `ba` tạo item | Plan và item xong, chờ gate ② |
| `/ao-plan <EPIC>` lần nữa | Epic đã qua gate ② | Không | `jira-sync` chuyển item sang Ready, và `merge-gate` merge PR tài liệu |
| `/ao-build <KEY>` | Item ở Ready, hoặc In Progress có ledger; phụ thuộc đã merge; PR tài liệu của Epic đã merge; WIP `dev-agent` còn chỗ | `be-dev`, `fe-dev` theo Sub-task, hoặc theo nhãn vai trò của item | PR mở và CI xong |
| `/ao-review <PR>` | CI xanh trên head | `reviewer`; rồi `security`, đầy đủ hoặc chỉ phần mới (mục 2.6) | Hai báo cáo nằm trên head, chờ gate ③ |
| `/ao-fix <PR>` | Có yêu cầu sửa hoặc CI đỏ trên head; hoặc bạn ghi việc cần sửa sau mã PR | Dev agent của item; rồi như `/ao-review` | Hai báo cáo mới nằm trên head |

- Merge vẫn là việc của `merge-gate` sau khi bạn approve. PR sửa đường dẫn được bảo vệ thì bạn tự merge (mục 2.7).
- Story có Sub-task: `be-dev` làm Sub-task BE trước, `fe-dev` làm Sub-task FE sau rồi mở PR, đúng quy tắc của hợp đồng. Nếu Story còn ở Ready, agent start Story trước Sub-task.
- Gặp yêu cầu sửa lần thứ hai (trường Rework từ 2 trở lên), `/ao-fix` chạy dev agent ở ít nhất `xhigh`.
- `pm` vẫn viết bản tổng hợp sáng bằng `ao-agent.mjs pm`; `/ao-status` chỉ chạy script, không gọi agent nào.

**Một lệnh chạy thế nào.** Mọi lệnh có cùng ba bước:

1. **Kiểm.** Dòng `` !`node .ai-orchestrator/scripts/ao-step.mjs <lệnh> $0` `` chạy trước khi prompt tới model. Script đọc Jira và GitHub, rồi in dữ kiện cùng một trong hai kết luận:
   - `GO`, kèm danh sách lượt chạy sẽ làm;
   - `STOP`, kèm lý do và lệnh nên chạy thay.

   Script thoát 0 trong cả hai trường hợp, để Claude đọc được lý do và nói lại với bạn. Chỉ khi script hỏng, ví dụ thiếu token, thì nó thoát khác 0, và Claude Code hủy lệnh.

   Dòng này chạy đúng nhờ ba điều, rút ra ở T1 (mục 2.11):
   - `kit/.claude/settings.json` có luật `permissions.allow: ["Bash(node .ai-orchestrator/scripts/ao-step.mjs:*)"]`. Ở chế độ `auto`, dòng `!` chỉ chạy lúc nạp skill khi có luật quyết định lệnh đó. Không có luật thì model phải tự chạy lệnh: nó có thể chạy sai thư mục, và script hỏng không làm lệnh bị hủy. Luật của dự án chỉ có hiệu lực ở thư mục bạn đã tin cậy.
   - Dòng `!` chỉ nhận `$0`, tức mã item hoặc số PR. Claude Code chèn đối số nguyên văn vào lệnh shell, nên đoạn chữ tự do không bao giờ đi qua dòng này. `ao-step.mjs` từ chối đối số sai dạng.
   - Với `/ao-fix <PR> <việc cần sửa>`, đoạn chữ nằm trong thân skill. Claude ghi nó vào `.ai/runs/<KEY>/note.md`, rồi truyền cho `--go` bằng `--note`.
2. **Chạy.** Có `GO` thì Claude chạy `ao-step.mjs <lệnh> <đối số> --go` ở nền, với `timeout` 2 giờ, và chờ thông báo xong. Trong `claude -p`, lệnh nền không đặt `timeout` bị dừng sau 10 phút (T1). Script chạy lần lượt các agent bằng `ao-agent.mjs <role> -p`, ghi log stream-json và số đo vào `.ai/runs/<KEY>/`. Script dừng sớm khi:
   - một agent để lại câu hỏi;
   - một agent gắn cờ "Needs you";
   - một agent thất bại hai lần liên tiếp (`retry.agent_failures_before_stop`);
   - CI đỏ.
3. **Báo.** Claude đọc `.ai/runs/<KEY>/last.md` mà script viết, rồi nói với bạn:
   - từng agent đã làm gì, tốn bao nhiêu;
   - câu hỏi, nếu có;
   - bạn cần làm gì ở cổng, kèm từng bước bấm;
   - lệnh nên chạy tiếp.

**Câu hỏi của `ba`, `ux`, `sa`.** Ba agent này chạy một mình, nên ghi câu hỏi vào mục Open Questions của artifact rồi dừng. Claude hiện các câu hỏi cho bạn, và bạn trả lời ngay trong chat. Claude ghi câu trả lời vào `.ai/runs/<KEY>/answers.md`, rồi chạy `ao-step.mjs <lệnh> <EPIC> --go --answers .ai/runs/<KEY>/answers.md`. Script chạy lại đúng agent đó bằng `--resume <session>`: agent ghi câu trả lời thành quyết định, và sửa comment câu hỏi trên Epic. Bạn vẫn có thể làm việc trực tiếp với agent bằng `node .ai-orchestrator/scripts/ao-agent.mjs ba`, như ở `agent-roster`.

**Chạy lại sau khi hết usage.** `ao-step.mjs` lưu session id của mỗi lượt vào `.ai/runs/<KEY>/state.json`. Lệnh chạy lại thấy lượt dở dang thì chạy tiếp lượt đó bằng `--resume`, kèm lời nhắc đọc ledger.

### 2.2 `ao-step.mjs` và thư viện `lib/workflow/`

Giữ cách của các module trước: hàm quyết định thuần, script mỏng.

- `lib/workflow/steps.mjs`: `decideStep(command, facts)` trả `{ go: true, runs }` hoặc `{ go: false, reason, next }`. `runs` là danh sách `{ role, key, effort, prompt, resume }`.
- `lib/workflow/facts.mjs` gom dữ kiện bằng client sẵn có:
  - Jira đọc bằng `ATLASSIAN_AGENT_TOKEN`: trạng thái, nhãn, trường Agent và Rework, Sub-task, phụ thuộc, comment;
  - GitHub đọc bằng token chỉ đọc của `ao-review` (mục 2.3): PR, review, check;
  - ledger và `.ai/runs/`.

  Guard của hợp đồng (`wip-available`, `dependencies-merged`…) dùng lại `jiraGuards` và `githubGuards`, không viết lại.
- `lib/workflow/runs.mjs` đọc log stream-json của một lượt: kết quả, số lượt, thời gian, token, chi phí quy đổi, `permission_denials`, và câu hỏi còn mở trong artifact.
- `lib/workflow/prompts.mjs` dựng prompt ngắn cho từng lượt, theo cách đã dùng ở kiểm thật. Ví dụ: "Build Sub-task DEMO-13, the BE Sub-task of Story DEMO-12. The branch develop is checked out and up to date with origin." Prompt không lặp lại phần agent đã có trong định nghĩa của nó.
- `scripts/ao-step.mjs <lệnh> <đối số> [--go] [--answers <file>]` chỉ gom dữ kiện, gọi `decideStep`, in kết luận, và với `--go` thì chạy các lượt.

Script không bao giờ chuyển trạng thái Jira, approve hay merge PR. Việc chuyển trạng thái vẫn do agent làm qua hook `jira-guard`, hoặc do `jira-sync` làm theo dữ kiện. Ngoại lệ duy nhất là lần chạy thứ hai của `/ao-plan`: script gọi `gh workflow run jira-sync -f item=<EPIC>` bằng login của bạn, vì đó là phiên của bạn, không phải phiên của agent.

### 2.3 Danh tính GitHub của agent

Bạn chọn dùng hai App cho mọi việc của agent trên GitHub (Phiên 16 · Lượt 10). `ao-agent.mjs` tạo token lúc mở phiên của agent, và đưa vào môi trường của phiên đó:

| Việc | Token | Quyền của token |
|---|---|---|
| `gh` đọc PR, review, CI (`GH_TOKEN`) | `ao-review`, cho mọi vai trò | Contents, Pull requests, Actions, Checks: chỉ đọc |
| `git push` của vai trò có quyền git ghi | `ao-dev`, qua credential helper `ao-git-credential.mjs` | Contents: ghi; thêm Workflows: ghi cho riêng `devops` |
| Mở, sửa, comment PR; đăng báo cáo review | `ao-pr.mjs` tự tạo, như hiện nay | Như hiện nay |

- `installationToken` đã nhận tham số `permissions`, nên mỗi token chỉ có đúng quyền cần dùng. Token của App hết hạn sau một giờ. `GH_TOKEN` được tạo lúc mở phiên, còn credential helper tạo token mới mỗi lần `git` cần.
- **Cấu hình git của phiên agent** đặt qua `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_<n>` và `GIT_CONFIG_VALUE_<n>` trong môi trường của process, không qua lệnh:
  - `credential.helper` đặt rỗng, để bỏ Git Credential Manager, rồi đặt `ao-git-credential.mjs`;
  - `user.name` và `user.email` là của bot, `tungph7-ao-dev[bot]` và `<id>+tungph7-ao-dev[bot]@users.noreply.github.com`.

  `gh-guard` vẫn chặn agent tự đặt `GIT_CONFIG_*` trong lệnh. Vai trò chỉ đọc không có credential helper ghi, nên `git push` của nó không có quyền. Nó vẫn cần `git fetch`, vì `reviewer` và `security` đọc nhánh của PR, nên helper cho nó token `contents: read` của `ao-review`; GitHub từ chối push bằng token đó (T3).
- Trong phiên agent, `gh-guard` từ chối lệnh gọi `ao-step.mjs`, `ao-agent.mjs` và `ao-git-credential.mjs`. Luật `allow` của mục 2.1 cũng áp cho agent, mà agent thì không được tự mở agent khác hay tự lấy token.
- Commit của agent đứng tên bot. Lịch sử Git, PR và GitHub for Jira đều ghi rõ việc nào do agent làm.
- **Bạn thêm quyền cho hai App** (`docs/github-apps-setup.md` sẽ có từng bước bấm):
  - `ao-dev`: Workflows ghi, Actions đọc, Checks đọc;
  - `ao-review`: Actions đọc, Checks đọc.

  Sau đó bạn chấp nhận quyền mới ở trang cài App của từng repo.
- `merge-gate` vẫn chỉ tính approval của `AO_APPROVERS`. Bot không nằm trong đó.
- `jira-guard`, `gh-guard` và Rovo MCP không đổi.
- Login `gh` và git của bạn vẫn nằm trên cùng user Windows. Agent cố tình đi vòng các hook thì vẫn có thể lấy được (mục 12).

### 2.4 PR tài liệu của Epic

Tài liệu của Epic vào `develop` qua đúng một PR. Bạn chỉ duyệt trên Jira, không phải approve lần hai trên GitHub (Phiên 16 · Lượt 10).

1. `/ao-spec` tạo nhánh `feature/<EPIC>-spec` từ `develop`. Khi xong stage spec, `ba` mở PR vào `develop` bằng `ao-pr.mjs create`, tiêu đề `docs(spec): <tên Epic> (<EPIC>)`. Mô tả PR theo `pull-request.md`, và các mục không áp dụng ghi rõ là không áp dụng.
2. Job `policy` kiểm `design.md` của PR như mọi PR khác. Bạn đọc diff của SPEC và design trên GitHub trước gate ①.
3. `/ao-plan` thêm `plan.md` và ADR vào cùng nhánh.
4. Bạn bấm `Approve plan` trên Jira. Lần chạy thứ hai của `/ao-plan` gọi `jira-sync` cho Epic. `jira-sync` chạy `refine-children`, rồi `merge-gate` chạy theo sau và merge PR tài liệu.

**Điều kiện mới của `merge-gate`.** Một PR là "PR tài liệu" khi:

- mọi file nó sửa nằm trong `docs/specs/<EPIC>/**` hoặc `docs/adr/**`;
- head là nhánh `feature/<EPIC>-spec`, và PR do bot `ao-dev` mở;
- `<EPIC>` là Epic trên Jira.

`merge-gate` squash merge PR tài liệu khi:

- Epic đã qua gate ②, tức đang ở In Progress hoặc Done;
- CI xanh trên head;
- lượt CI mới nhất của nhánh tài liệu, trong các lượt của sự kiện `pull_request`, chạy trên head và bắt đầu trước lúc bạn bấm `Approve plan`. Mỗi lần push lên PR tạo một lượt mới, nên một lần push sau lúc duyệt, kể cả force-push về commit bạn đã đọc, làm điều kiện này sai. Lượt CI của cùng commit ở nhánh khác hay chạy tay không được tính (T15a). Thời điểm của lượt CI do server GitHub ghi; thời điểm duyệt lấy từ changelog của Epic trên Jira.

PR tài liệu không cần báo cáo của `reviewer` hay `security`, và không cần approval trên GitHub. Điều kiện cuối bảo đảm thứ được merge chính là thứ bạn đã đọc lúc duyệt. Commit nào push sau lúc duyệt sẽ làm PR thành PR thường, cần báo cáo và approval như mọi PR khác. Đổi SPEC sau khi duyệt cũng đi theo đường đó.

- `audit` dùng đúng điều kiện này cho commit merge của PR tài liệu, để Deploy development không bị chặn.
- `merge-gate` cần đọc Jira, nên `merge-gate.yml` có thêm `JIRA_CI_TOKEN`. `audit.yml` đã có biến này.
- `quality/gates.yaml` có thêm mục `docs_pull_requests` (đường dẫn, nhánh, gate), kèm schema và quy tắc kiểm mới.

**ADR theo plan.** Ở `agent-roster`, ADR-0001 còn ở Proposed sau gate ②, và hai agent review hỏi lại bạn. Spec này không cho agent push thêm sau lúc bạn duyệt, nên không có bước đổi ADR sang Accepted. Thay vào đó, ADR do `sa` viết cho một Epic ghi Status là `Proposed with the plan of <EPIC>; it takes effect when you approve the plan at gate ②`. Prompt của `reviewer` và `security` ghi: ADR của một Epic đã qua gate ② là đã có hiệu lực, và trạng thái trên Jira là sự thật.

### 2.5 Effort và vai trò theo item

- Task List của plan ghi vai trò của từng item, và ghi effort cho item khó, kèm lý do. Ví dụ: `- [ ] DEMO-12: Áp mã giảm giá · be-dev, fe-dev (Sub-task) · effort xhigh: tính tiền và kiểm Origin`.
- Bạn duyệt các mức effort cùng plan ở gate ②.
- `ba` gắn nhãn khi tạo item:
  - `ao-fe-dev`, `ao-be-dev` hoặc `ao-devops` cho Task, cho Story không có Sub-task, và cho từng Sub-task;
  - `ao-effort-xhigh` hoặc `ao-effort-max` khi plan ghi.

  Tiền tố nhãn nằm trong `tracker/jira.yaml`.
- `/ao-build` chọn agent theo nhãn vai trò, và truyền `--effort` theo nhãn effort. Không có nhãn effort thì dùng mức của roster. `/ao-fix` nâng lên ít nhất `xhigh` khi Rework từ 2 trở lên.
- Item thiếu nhãn vai trò thì `/ao-build` dừng và nói rõ, không đoán.

### 2.6 `security` review phần mới

`/ao-review` tìm báo cáo `security` đầy đủ gần nhất trên PR, tức báo cáo không có dòng `Scope`, của bot `ao-review`, đọc được, trên một commit X. `security` chỉ review phần mới, ở effort `high`, khi đủ bốn điều:

- cả báo cáo `security` mới nhất lẫn báo cáo đầy đủ trên X không còn finding Critical hay High. Báo cáo phần mới không nêu lại finding cũ, mà `merge-gate` chỉ đọc báo cáo mới nhất, nên một finding chặn chỉ được gỡ bằng một lượt review đầy đủ (T15a);
- X là tổ tiên của head, tức không có rebase hay force-push sau đó;
- diff từ X tới head có tối đa 300 dòng thêm và xóa;
- diff không đụng đường dẫn được bảo vệ.

Khi đó prompt là "Review PR #<n>, only the changes since <X>; your full report on <X> is the review of <ngày>". Báo cáo vẫn đăng trên head, theo template, có thêm dòng `Scope: changes since <X>`. Vì vậy `merge-gate` và `audit` không đổi.

Thiếu một trong bốn điều thì `security` review đầy đủ ở `max`. `reviewer` luôn review đầy đủ PR trên head.

### 2.7 `merge-gate` báo PR cần bạn

PR sửa đường dẫn được bảo vệ cần bạn tự merge. Khi PR như vậy chỉ còn chờ bạn, tức không thiếu gì hoặc chỉ thiếu approve của bạn, `merge-gate` làm thêm hai việc, mỗi việc một lần cho mỗi head (T6: báo sớm hơn thì cờ "Needs you" nằm trên item trong lúc agent còn review):

- comment lên PR bằng `ao-dev`: đường dẫn được bảo vệ, điều còn thiếu, và nhắc approve trước rồi mới merge;
- gắn cờ "Needs you" lên item trên Jira bằng token CI, kèm comment cùng nội dung.

Khi PR được merge hoặc đóng, `jira-sync` gỡ cờ mà `merge-gate` đã gắn. `jira-sync` nhận ra cờ đó nhờ dấu trong comment. Ai comment được trên item cũng viết được dấu đó, nên `merge-gate` và `jira-sync` chỉ tính comment của tài khoản token CI (`account_id` của identity `automation` trong `tracker/jira.yaml`), và `merge-gate` chỉ tính comment trên PR của bot `ao-dev` (T15a).

### 2.8 Yêu cầu giữa các vai trò

- Agent nhờ vai trò khác bằng comment trên item, mở đầu bằng `Cần <role>:`, ví dụ `Cần ba: tạo Task cho bảng sản phẩm tràn ở 320 px`. Quy ước này ghi trong `agents/rules.md`.
- Yêu cầu được coi là xong khi vai trò đó comment lên cùng item sau yêu cầu. Comment của agent luôn mở đầu bằng tên của nó trong trường Agent, nên script nhận ra được.
- `/ao-status` liệt kê các yêu cầu còn mở, kèm lệnh nên chạy. Ví dụ, việc của `ba` thì bạn mở `ao-agent.mjs ba`, hoặc đưa vào plan của Epic sau.

### 2.9 Thay đổi nhỏ khác

- `refine` và `refine-children` của `jira-sync` đánh dấu dòng DoR "Thuộc Epic có plan đã duyệt" trong mô tả item. Hàm xử lý được cả hai dạng mô tả: ô checkbox của ADF, và chữ `[ ]` trong văn bản. Không tìm thấy dòng đó thì `jira-sync` comment thay.
- Prompt:
  - `sa` ghi vai trò và effort vào Task List, và ghi Status của ADR như mục 2.4;
  - `ba` gắn nhãn, mở PR tài liệu, sửa comment câu hỏi sau khi có trả lời;
  - `security` có chế độ review phần mới;
  - `reviewer` và `security` tin trạng thái trên Jira về gate.
- Template: `adr.md` (Status của ADR theo plan), `plan.md` (cột vai trò và effort trong Task List), `review-report.md` (dòng `Scope`).
- Hợp đồng: stage `spec` có thêm đầu ra "PR tài liệu của Epic"; stage `plan` ghi PR đó được merge sau gate ②. `docs/sdlc.md` được sinh lại.
- Skill của kit nằm cạnh skill chép vào trong `kit/.claude/skills/`, nhưng không có trong `vendored_skills`. `skills:vendor` và các test của nó bỏ qua thư mục `ao-*`.

### 2.10 Bản chép kit trong `ao-pilot`

Bản chép trong `ao-pilot` vẫn là bản của T15 `agent-roster`, thiếu kit PR #97, #102, #104 và T22. Bản chép mới được làm một lần, ngay trước kiểm thật, và gồm luôn code của module này. Ở lượt trước, mình định làm việc này ở task đầu; gộp lại thì bạn chỉ phải merge tay một PR, thay vì hai.

PR này do bot `ao-dev` mở và sửa đường dẫn được bảo vệ. Nhờ vậy, nó cũng là lần chạy thật đầu tiên của mục 2.7: comment trên PR và cờ trên Jira.

### 2.11 Tiền đề kiểm ở task đầu

Spec dựa vào tám điều chưa ai thử trên máy bạn. Task đầu kiểm cả tám trên `ao-pilot`, bằng nhánh tạm, trước khi viết code:

1. Token cài đặt của `ao-dev` push được qua HTTPS, và push đó chạy workflow CI.
2. Push file trong `.github/workflows/` cần quyền Workflows; thiếu quyền thì GitHub từ chối.
3. Token thu hẹp quyền (chỉ đọc) làm được mọi lệnh `gh` mà agent dùng: `pr view`, `pr diff`, `pr checks`, `run view`, `api` đọc review.
4. `GIT_CONFIG_*` trong môi trường thay được Git Credential Manager của Git for Windows, và `user.name`, `user.email` của bot có hiệu lực.
5. `gh` dùng `GH_TOKEN` thay cho token trong keyring của bạn, kể cả khi keyring có token.
6. Skill của dự án: `` !`node …` `` chạy được trên Windows, `$ARGUMENTS` được thay đúng, và `disable-model-invocation` làm skill chỉ chạy khi gõ.
7. Từ phiên của bạn, Claude chạy được một lệnh dài 20 phút ở nền và nhận thông báo khi xong. Phiên `claude -p` có chờ lệnh nền đó không.
8. Commit đứng tên bot qua được hook `commit-msg` và job `policy`, và GitHub for Jira vẫn nối commit vào item.

Điều nào sai thì mình dừng và đề xuất sửa spec, như ở T1 của `agent-roster`.

**Kết quả của T1 (2026-11-01):** điểm 6 và 7 đúng, kèm ba điều kiện đã đưa vào mục 2.1 và 2.3: luật `allow` cho dòng kiểm, chỉ truyền `$0`, và `timeout` dài cho `--go`. Bạn duyệt các sửa đổi này ở Phiên 17 · Lượt 5. Chi tiết trong `tasks/verification.md`.

## 3. Tech stack

- Node.js 24, ES module, `yaml` và `ajv` như các module trước; không thêm dependency.
- Skill là Markdown với frontmatter của Claude Code.
- GitHub: REST qua `github-client.mjs`, và token App qua `github-app.mjs`. Jira: `jira-client.mjs`.
- Test dùng `node:test` với dữ liệu ghi sẵn; test không gọi mạng.

## 4. Lệnh

Trong phiên Claude Code ở repo dự án:

```
/ao-status                 # việc đang chờ bạn, bước kế tiếp của từng item, yêu cầu giữa các vai trò
/ao-status DEMO-12         # một item: trạng thái, PR, CI, báo cáo, lượt chạy và chi phí
/ao-spec DEMO-20           # ba, ux, sa; mở PR tài liệu; dừng ở gate ①
/ao-plan DEMO-20           # sa, ba; dừng ở gate ②. Chạy lại sau khi bạn duyệt: item sang Ready, PR tài liệu được merge
/ao-build DEMO-21          # dev agent theo Sub-task hoặc nhãn; mở PR
/ao-review 15              # reviewer, rồi security đầy đủ hoặc chỉ phần mới; dừng ở gate ③
/ao-fix 15                 # dev agent sửa theo yêu cầu, rồi review lại
/ao-fix 15 sửa hai finding Low của reviewer
```

Trong terminal ở repo dự án, cùng code mà các lệnh gọi:

```
node .ai-orchestrator/scripts/ao-step.mjs build DEMO-21          # chỉ kiểm, in GO hoặc STOP
node .ai-orchestrator/scripts/ao-step.mjs build DEMO-21 --go     # kiểm rồi chạy các agent
node .ai-orchestrator/scripts/ao-step.mjs fix 15 --go --note .ai/runs/DEMO-21/note.md   # sửa theo ghi chú của bạn
```

Trong repo kit: `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`, như trước.

## 5. Cấu trúc thư mục

```
ai-orchestrator-v1/
├── lib/workflow/
│   ├── steps.mjs                    # decideStep cho từng lệnh (hàm thuần)
│   ├── facts.mjs                    # gom dữ kiện Jira, GitHub, ledger, .ai/runs
│   ├── runs.mjs                     # đọc log stream-json: kết quả, số đo, câu hỏi còn mở
│   ├── prompts.mjs                  # prompt của từng lượt (hàm thuần)
│   └── requests.mjs                 # yêu cầu "Cần <role>:" còn mở (hàm thuần)
├── lib/quality/merge-gate.mjs       # thêm PR tài liệu, comment và cờ "Needs you"
├── lib/quality/audit.mjs            # thêm PR tài liệu
├── lib/agents/launch.mjs            # thêm môi trường của phiên agent: GH_TOKEN, GIT_CONFIG_*
├── scripts/
│   ├── ao-step.mjs
│   └── ao-git-credential.mjs        # credential helper cho git, tạo token của ao-dev
├── kit/.claude/skills/ao-status/SKILL.md, ao-spec/, ao-plan/, ao-build/, ao-review/, ao-fix/
├── kit/.github/workflows/merge-gate.yml   # thêm JIRA_CI_TOKEN
├── quality/gates.yaml               # thêm docs_pull_requests
├── templates/adr.md, plan.md, review-report.md
├── agents/prompts/ba.md, sa.md, reviewer.md, security.md; agents/rules.md
├── docs/dev-workflow.md             # sáu lệnh, một vòng Epic từ đầu tới cuối, cách đọc .ai/runs, khi lệnh dừng
├── docs/github-apps-setup.md        # thêm bước cấp quyền mới cho hai App
└── tests/workflow/                  # dữ liệu mẫu ở tests/fixtures/workflow/
```

Dự án có thêm `.ai/runs/` (đã nằm trong `.ai/`, không commit).

## 6. Code style

Giữ quy ước của các module trước. Skill của lệnh ngắn, viết tiếng Anh, chỉ dẫn Claude làm đúng ba bước:

```markdown
---
name: ao-build
description: Build a Ready item of the SDLC contract with its dev agent, up to an open PR with CI done.
argument-hint: <KEY>
disable-model-invocation: true
---

## Check
!`node .ai-orchestrator/scripts/ao-step.mjs build $0`

## What to do
- On STOP, tell the human the reason and the command it names, in Vietnamese, and stop.
- On GO, run `node .ai-orchestrator/scripts/ao-step.mjs build $0 --go` with the Bash tool in the background, with a
  timeout of 7200000 ms, and wait for its notification. Do not poll.
  Do not run any agent yourself, and do not change Jira or GitHub yourself.
- Then read `.ai/runs/<KEY>/last.md` and report: what each agent did and cost, the questions left, what the human
  must do at a gate (numbered clicks), and the next command.
```

Kết luận của `ao-step.mjs`:

```
DEMO-21 Story "Xóa sản phẩm khỏi giỏ hàng": Ready; Sub-task DEMO-22 (ao-be-dev), DEMO-23 (ao-fe-dev); no PR
Docs PR #14 of DEMO-20: merged
WIP dev-agent: be-dev 0/1, fe-dev 0/1
GO
1. be-dev DEMO-22, effort high
2. fe-dev DEMO-23, effort xhigh (label ao-effort-xhigh), then opens the PR
```

`steps.mjs`, `prompts.mjs`, `requests.mjs` và các hàm quyết định mới của `merge-gate`, `audit` là hàm thuần.

## 7. Chiến lược test

**Quy tắc mới của `npm run validate`:** Q5 kiểm `docs_pull_requests` của `quality/gates.yaml`. Đường dẫn chỉ được nằm trong `docs/`, không trùng đường dẫn được bảo vệ, và gate phải là gate của hợp đồng. Quy tắc có test dương và fixture âm.

**Test đơn vị**, dùng dữ liệu ghi sẵn:

- `decideStep`: mỗi lệnh có một trường hợp `GO`, và mỗi điều kiện dừng có một trường hợp `STOP`:
  - sai trạng thái;
  - WIP đầy;
  - phụ thuộc chưa merge;
  - PR tài liệu chưa merge;
  - thiếu nhãn vai trò;
  - CI chưa xong hoặc đỏ;
  - có lượt dở dang thì chạy tiếp bằng `--resume`.

  Ngoài ra: thứ tự BE trước FE, effort theo nhãn, Rework từ 2 thì `xhigh`.
- `security` phần mới: tổ tiên hay đã rebase; ngưỡng 300 dòng; đụng đường dẫn được bảo vệ.
- `merge-gate` và `audit` với PR tài liệu:
  - merge khi đủ điều kiện;
  - chờ khi Epic chưa qua gate ②;
  - không merge khi có commit sau lúc duyệt;
  - không coi là PR tài liệu khi có một file ngoài `docs/specs/<EPIC>/**` và `docs/adr/**`, hoặc khi head không phải nhánh spec của Epic.
- `merge-gate` báo PR cần bạn: comment và cờ chỉ một lần cho mỗi head; `jira-sync` gỡ cờ khi PR merge hoặc đóng.
- `launch`: môi trường của phiên agent theo vai trò, vai trò chỉ đọc không có credential helper ghi, token không nằm trong tham số dòng lệnh.
- `ao-git-credential.mjs`: trả lời đúng giao thức credential của git; quyền theo vai trò.
- Đánh dấu dòng DoR trong mô tả, ở cả hai dạng; không tìm thấy dòng đó thì comment.
- `requests`: yêu cầu còn mở và đã xong.
- `runs`: đọc số đo và câu hỏi từ log stream-json ghi sẵn của `agent-roster`.
- Skill: frontmatter của sáu lệnh có `disable-model-invocation: true`, và gọi đúng `ao-step.mjs`.

**Kiểm thật** trên `ao-pilot` và space `DEMO`, kết quả ghi vào `tasks/verification.md`:

1. Tám tiền đề ở mục 2.11.
2. Bạn thêm quyền cho hai App.
3. Bản chép kit mới vào `ao-pilot`, qua PR do bot `ao-dev` mở. `merge-gate` comment lên PR và gắn cờ trên Jira. Bạn approve rồi merge, `audit` xanh, và `jira-sync` gỡ cờ.
4. Một Epic nhỏ dựa trên giỏ hàng có sẵn, ví dụ "Xóa sản phẩm khỏi giỏ hàng", đi qua cả sáu lệnh:
   - Bạn `Start spec`, rồi `/ao-spec`. Lần này bạn tự trả lời câu hỏi của `ba` trong chat. PR tài liệu được mở.
   - Bạn `Approve spec`, rồi `/ao-plan`. Plan ghi vai trò, và một item có nhãn effort.
   - Bạn `Approve plan`, rồi `/ao-plan` lần nữa: item sang Ready, và PR tài liệu được merge mà không cần approval trên GitHub.
   - `/ao-build`: commit và push đứng tên bot.
   - `/ao-review`, rồi `/ao-fix` cho một finding: `security` chỉ review phần mới.
   - Bạn approve, và `merge-gate` merge PR.
   - `/ao-status` chạy ở đầu, giữa và cuối vòng.
5. Một lần thử đi vòng: trong phiên agent, `gh auth status` cho thấy token của App chứ không phải login của bạn, và `git push` của một vai trò chỉ đọc bị từ chối.

Lệnh được gọi bằng `ao-step.mjs … --go` trong `ao-pilot`, cùng code mà skill gọi. Mỗi lệnh `/` được bạn hoặc Claude gõ thật ít nhất một lần, tùy kết quả của tiền đề 7. Ước khoảng 30–40 USD quy đổi, tương đương T18 cộng T19 của `agent-roster`, có thể cần hai khung 5 giờ của gói Pro.

## 8. Ranh giới

- **Luôn làm:**
  - kiểm trạng thái bằng `ao-step.mjs` trước khi gọi agent;
  - chạy agent lần lượt, mỗi lượt ghi số đo;
  - dừng ở cổng, và nói rõ bạn cần bấm gì;
  - mọi việc trên GitHub của agent đi qua token của App.
- **Hỏi bạn trước:**
  - đổi điều kiện của `merge-gate` hay `audit` ngoài mục 2.4;
  - đổi hợp đồng ngoài mục 2.9;
  - đổi ngưỡng của mục 2.6;
  - xin thêm quyền cho App ngoài mục 2.3.
- **Không bao giờ:**
  - lệnh tự chuyển trạng thái Jira, approve hay merge PR;
  - agent dùng login `gh` hay git của bạn;
  - token nằm trong tham số dòng lệnh, file của repo, log hay chat;
  - chạy hai agent cùng lúc;
  - merge PR tài liệu có commit push sau lúc bạn duyệt plan.

## 9. Tiêu chí hoàn thành

1. Sáu lệnh có trong `kit/.claude/skills/`. `ao-step.mjs` và `lib/workflow/` có test. `npm run validate`, `npm test`, `npm run agents:check` và CI của kit đều xanh.
2. Tám tiền đề ở mục 2.11 được kiểm và ghi kết quả; tiền đề nào sai thì spec đã được sửa và bạn đã duyệt bản sửa.
3. Agent push và commit dưới tên bot `ao-dev`, đọc GitHub bằng token chỉ đọc. Trong phiên agent, `gh` không dùng login của bạn, và vai trò chỉ đọc không push được.
4. PR tài liệu của Epic thử được `merge-gate` merge sau gate ② mà không cần approval trên GitHub; `audit` xanh khi deploy commit đó. Test đơn vị cho thấy một commit push sau lúc duyệt làm PR mất điều kiện đó.
5. `security` review phần mới ở `high` ít nhất một lần trên PR thật, và `merge-gate` nhận báo cáo đó.
6. `merge-gate` comment và gắn cờ trên PR cần bạn tự merge, và `jira-sync` gỡ cờ sau khi merge.
7. Item có nhãn effort được chạy đúng mức đó; Task List của plan ghi vai trò và effort.
8. Epic thử đi từ `/ao-spec` tới merge chỉ bằng sáu lệnh và các cổng của bạn: không lượt agent nào do Claude tự mở bên ngoài lệnh. Mọi lượt chạy có số đo.
9. Bản chép kit mới vào `ao-pilot` qua một PR bạn merge tay; `audit` xanh.
10. README có mục về lệnh; có `docs/dev-workflow.md`; `docs/github-apps-setup.md` có bước cấp quyền mới; `SPEC.md` ghi module hoàn thành.

## 10. Câu hỏi đã trả lời

Phiên 16 · Lượt 9–10 (2026-10-31). Bạn chọn đề xuất ở cả ba câu, và không sửa giả định nào:

1. **Danh tính GitHub của agent:** dùng hai App cho mọi việc (mục 2.3).
2. **Tài liệu của Epic:** một PR tài liệu mỗi Epic, `merge-gate` merge sau gate ② (mục 2.4).
3. **`security` sau commit sửa nhỏ:** chỉ review phần mới, ở `high` (mục 2.6).

Khi viết spec, Claude đổi hai chỗ so với giả định đã duyệt, và nêu lý do. Bạn duyệt cả hai cùng spec ngày 2026-10-31 (Phiên 17 · Lượt 1):

- **ADR không được đổi sang Accepted sau gate ②.** Nếu đổi thì phải có một commit push sau lúc bạn duyệt, và PR tài liệu khi đó không còn đúng thứ bạn đã đọc. ADR ghi rõ nó có hiệu lực khi plan được duyệt (mục 2.4).
- **Bản chép kit vào `ao-pilot` làm một lần, ngay trước kiểm thật,** thay vì ở task đầu. Như vậy bạn chỉ merge tay một PR (mục 2.10).

Phiên 17 · Lượt 5 (2026-11-01): bạn duyệt năm điểm sửa sau T1: luật `allow` cho dòng kiểm; `gh-guard` chặn lệnh điều phối trong phiên agent; dòng `!` chỉ truyền `$0`, đoạn chữ của `/ao-fix` đi qua file; `timeout` 2 giờ cho `--go`; tài liệu ghi `MSYS_NO_PATHCONV=1` khi gõ `claude -p "/ao-…"` trong Git Bash.

## 11. Câu hỏi mở

Không có. Bạn giữ nguyên hai điểm Claude tự chốt khi duyệt:

- ngưỡng 300 dòng của mục 2.6;
- tên nhãn `ao-fe-dev`, `ao-be-dev`, `ao-devops`, `ao-effort-xhigh`, `ao-effort-max`.

## 12. Rủi ro

- **Login của bạn vẫn nằm trên máy:** agent không còn dùng login `gh` và git của bạn, nhưng chạy cùng user Windows. Agent cố tình đi vòng `gh-guard` vẫn đọc được keyring của `gh` hay Git Credential Manager, và từ đó approve dưới tên bạn. `audit` vẫn bắt được merge không qua đủ cổng, nhưng chỉ sau khi merge. Cách đóng hẳn chỗ hở là chạy agent dưới một user Windows riêng, hoặc trong WSL2 có sandbox; cả hai để sau, khi bạn muốn.
- **Token của App hết hạn sau một giờ:** `GH_TOKEN` của một lượt dài hơn một giờ sẽ hỏng giữa chừng. `maxTurns` giữ phần lớn lượt dưới 30 phút; lượt chạy lại thì có token mới.
- **App có thêm quyền Workflows:** mọi vai trò dev dùng `ao-dev`, nhưng credential helper chỉ xin quyền Workflows cho `devops`. `gh-guard` và đường dẫn được bảo vệ vẫn chặn vai trò khác sửa workflow, và PR sửa workflow vẫn do bạn merge.
- **PR tài liệu merge không qua review trên GitHub:** nội dung là thứ bạn đã đọc và duyệt trên Jira, và điều kiện về thời điểm loại commit đến sau. Job `policy` vẫn chạy. Agent sửa ngoài `docs/specs/<EPIC>/**` và `docs/adr/**` thì PR mất điều kiện đó.
- **Review phần mới bỏ sót tương tác** giữa phần mới và phần cũ: ngưỡng 300 dòng và luật về đường dẫn được bảo vệ giới hạn phạm vi. `reviewer` vẫn review đầy đủ.
- **Model của phiên chính không làm đúng skill:** việc quyết định và chạy agent nằm trong `ao-step.mjs`, nên Claude chỉ đọc kết quả và nói lại. Skill cấm Claude tự mở agent hay tự đổi Jira và GitHub.
- **Usage của gói Pro:** một Epic đầy đủ tốn khoảng 30–40 USD quy đổi. `/ao-status` cho biết chi phí đã tốn của từng item.
- **Máy ít RAM:** lệnh chạy agent lần lượt. Shell nền có thể bị dừng khi máy thiếu RAM; `state.json` cho phép chạy tiếp lượt dở.
- **Đối số đi thẳng vào shell:** Claude Code chèn `$0` nguyên văn vào dòng `!`. Nếu bạn gõ `/ao-fix "15; …"`, phần sau dấu `;` cũng chạy. Đây là lệnh do chính bạn gõ trong phiên của bạn. Luật `allow` chỉ cho `ao-step.mjs`, nên phần lạ không chạy lúc nạp skill mà thành một lời gọi tool được duyệt.

## Nguồn

- [Claude Code Docs: Skills](https://code.claude.com/docs/en/skills): frontmatter, `disable-model-invocation`, `$ARGUMENTS`, cú pháp `!`, `context: fork`
- [Claude Code Docs: Sandboxing](https://code.claude.com/docs/en/sandboxing): không chạy trên Windows gốc
- [GitHub Terms of Service, mục B.3](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service): tài khoản máy
- `tasks/archive/agent-roster/verification.md`: số đo và các ghi chú để lại cho `dev-workflow`
- `docs/github-apps-setup.md`, `lib/quality/github-app.mjs`, `lib/quality/merge-gate.mjs`, `lib/quality/audit.mjs`, `lib/tracker/reconcile.mjs` trong repo kit

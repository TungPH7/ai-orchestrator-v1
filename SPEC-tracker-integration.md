# SPEC: tracker-integration

> **Module:** `tracker-integration`, xem capability map trong [SPEC.md](SPEC.md). **Phụ thuộc:** `sdlc-contract`. **Được dùng bởi:** `dev-workflow`, `release-workflow`, `project-scaffold`, và `orchestrator-cli` ở Cấp 2.
>
> **Trạng thái:** đã duyệt 2026-10-27, cùng hai thay đổi đi kèm plan (mục 2.6, tiêu chí 7), đang làm theo plan. **Plan:** [tasks/plan.md](tasks/plan.md). **Nguồn thảo luận:** [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md), Phiên 4 · Lượt 1 đến Phiên 6 · Lượt 4.

## 1. Mục tiêu

Nối hợp đồng `sdlc-contract` với Jira Cloud và GitHub, để trạng thái item trên Jira đổi theo dữ kiện thật, và mỗi transition chỉ do đúng vai trò thực hiện. Sau module này:

- Jira có space, 3 workflow, các trường và Kanban board khớp với hợp đồng. Một script chỉ đọc báo ngay chỗ nào cấu hình Jira lệch hợp đồng.
- Agent trong Claude Code đọc, tạo và chuyển item qua Rovo MCP bằng tài khoản riêng của agent. Agent không chuyển được item sang Done hay qua cổng duyệt của bạn.
- GitHub Actions thực hiện các transition của vai trò `automation` (`submit`, `request-changes`, `deploy-to-qa`, `refine` các item con của Epic) dựa trên sự kiện thật của PR, CI và deploy.
- Nhánh, commit, PR và deploy hiện trên item Jira; panel Deployments nhận đúng Development, Staging, Production.

**Ràng buộc gói Jira.** Module này thiết kế cho gói **Free**: không dùng tính năng nào gói Free không có. Ngày 2026-10-27 bạn đã chuyển site từ bản dùng thử Standard về Free, nên mọi bước kiểm thật chạy trên đúng gói Free.

**Ngoài phạm vi:**

- Prompt, tool, model của từng agent: thuộc `agent-roster`. Module này cung cấp hook và khai báo nó trong `kit/.claude/settings.json`; `agent-roster` chỉ cần đặt tên agent trùng id vai trò.
- Gắn hàm kiểm quy ước nhánh, commit vào commit-msg hook, CI và branch protection: thuộc `quality-gates`. Module này cung cấp hàm kiểm.
- Pipeline deploy, tạo và phát hành Fix Version khi cắt release: thuộc `release-workflow`. Module này chỉ nhận sự kiện deploy.
- Khi nào gọi agent nào: thuộc `dev-workflow`.
- Dựng cấu hình Jira tự động bằng REST API: để sau, cho `project-scaffold`.

## 2. Thiết kế

### 2.1 Gói Free dùng được gì

| Module cần | Trên gói Free | Căn cứ |
|---|---|---|
| Company-managed space | Có | [Inference] Danh sách giới hạn của gói Free không nhắc loại space; trên Free, người tạo site là admin và tạo được space |
| Workflow riêng (status, transition), custom field, Kanban board, Version | Có | [Inference] Cùng lý do trên |
| Permission scheme, project role, issue security | **Không** | Trang Atlassian về quyền trên gói Free |
| Rule "Restrict who can move a work item" theo group | Chưa rõ | [Unverified] Tài liệu chỉ ghi cần quyền admin, không ghi gói |
| Service account | 5 cái miễn phí mỗi tổ chức, không tính vào giới hạn 10 user | Ngày 2026-10-27 bạn đã tạo `orchestratoragent`, `orchestratorci` và token của chúng. Việc dùng chúng trên gói Free được kiểm ở task kết nối thật |
| Jira Automation | 100 lượt mỗi tháng (màn hình chọn gói của bạn). Trang hỗ trợ của Atlassian tính theo step: 150 step | Module không dùng Jira Automation, nên con số này không ảnh hưởng |
| App GitHub for Jira | Có | [Inference] Gói Free giới hạn app mở rộng Jira, nhưng app này không nằm trong danh sách app không tương thích với Free |
| Email notification | Bị giới hạn | Không ảnh hưởng: `pm` gửi bản tổng hợp hằng ngày |

Vì gói Free không có permission scheme, mọi user có quyền Jira đều làm được mọi việc trong space. Ranh giới quyền của agent vì vậy do ba lớp giữ:

1. **Scope của API token:** token của agent và của CI không có scope quản trị.
2. **Rule Restrict trên từng transition**, theo group (mục 2.3), nếu gói Free có rule này.
3. **Hook trong Claude Code** (mục 2.6), kiểm vai trò và guard trước mỗi lần agent chuyển trạng thái.

### 2.2 Tài khoản

| Danh tính | Loại | Dùng cho | Xác thực | Group trên Jira |
|---|---|---|---|---|
| Bạn | User thường, admin | Mọi transition của `human`, dựng cấu hình Jira | Đăng nhập web; một token chỉ đọc cho `jira:check` | `ao-humans` |
| `orchestratoragent` | Service account | Mọi agent trong Claude Code, qua Rovo MCP | API token, header `Authorization: Bearer <token>` | `ao-agents` |
| `orchestratorci` | Service account | Vai trò `automation`, chạy trong GitHub Actions | API token, gọi REST API qua `https://api.atlassian.com/ex/jira/<cloud-id>` | `ao-automation` |

- **Hai service account tách riêng** để lịch sử item phân biệt việc của agent với việc của CI, và để rule Restrict chặn được agent ở các transition chỉ dành cho `automation` (như `submit`).
- **Mọi agent dùng chung `orchestratoragent`**, vì không đủ service account cho từng vai trò. Vai trò cụ thể (`fe-dev`, `qa`…) do hook kiểm, và được ghi vào trường Agent của item (mục 2.4).
- **Xác thực `Bearer` đã chạy được** với cả Rovo MCP lẫn REST API (T1, 2026-10-27), dù một bài KB của Atlassian ghi Rovo MCP chỉ nhận Basic auth. Không cần phương án Basic auth.
- **Scope token.** Agent: `read:jira:agent-interface`, `write:jira:agent-interface`, `search:jira:agent-interface` (cho Rovo MCP) và `read:jira-work` (để hook đọc dữ kiện). CI: `read:jira-work`, `write:jira-work`.
- **Hạn token** tối đa 365 ngày. Ngày hết hạn ghi trong `tracker/jira.yaml`; `jira:check` cảnh báo khi còn dưới 14 ngày.
- **Phương án dự phòng**, nếu gói Free không có service account: mỗi danh tính dùng một tài khoản Atlassian thường (tốn 2 trong 10 chỗ user), và agent đăng nhập Rovo MCP bằng OAuth. Phần còn lại của spec giữ nguyên.

Cloud id của site: `58b36210-6e4d-421a-adf4-e74a4e23b069`. Token của Rovo MCP không gắn với một site nào, nên agent phải truyền cloud id trong lời gọi tool. Cloud id được ghi trong `tracker/jira.yaml` và trong `CLAUDE.md` của dự án.

### 2.3 Ánh xạ hợp đồng sang Jira

File `tracker/jira.yaml` ánh xạ mọi id của hợp đồng sang tên trên Jira; validator kiểm ánh xạ phủ đủ hợp đồng (mục 7).

| Hợp đồng | Trên Jira |
|---|---|
| Work type `epic`, `story`, `task`, `bug`, `sub-task` | Issue type Epic, Story, Task, Bug, Sub-task |
| Workflow `standard`, `epic`, `sub-task` | Ba workflow, gom trong một workflow scheme dùng chung cho mọi dự án |
| State | Status, tên tiếng Anh viết hoa chữ đầu theo id: `ready-for-qa` → `Ready for QA`. Nhóm status: `new`, `ready`, `to-do`, `specifying`, `planning` thuộc To Do; `done`, `cancelled` thuộc Done; các state còn lại thuộc In Progress |
| Transition | Transition đặt tên theo id: `request-changes` → `Request changes`. Transition có nhiều `from` (`cancel`) được tách thành nhiều transition cùng tên, không dùng transition "từ mọi status", vì state kết thúc không được có transition đi ra |
| `actors` của transition | Rule Restrict theo group: `human` → `ao-humans`; `automation` → `ao-automation`; các vai trò agent → `ao-agents` |
| Trường `found-in`, `severity` | Custom field dạng chọn một giá trị |
| Trường `affects-version`, `fix-version`, `resolution` | Trường có sẵn: Affects versions, Fix versions, Resolution. Thêm resolution `Not a bug`. Transition `accept` đặt Resolution là Done; `cancel` có màn hình bắt chọn Resolution |
| Trường `flagged` | Cờ Flagged có sẵn, kèm comment ghi lý do |
| Effect `flag-needs-you` | Cờ Flagged, label `needs-you` và một comment ghi lý do |
| Trường `rework-count` | Không lưu thành trường: đếm từ lịch sử chuyển trạng thái của item (mục 2.4) |
| Cột board | Một Kanban board cho space, cột theo `board_column`. Cột `backlog` là Kanban backlog. Giới hạn WIP `in-review` là max 2 của cột In Review. Epic không hiện trên board |
| Giới hạn WIP `dev-agent`, `epic-shaping` | Không đặt được trên cột board; guard `wip-available` và `epic-wip-available` đếm bằng JQL |
| Môi trường | GitHub environment `development`, `staging`, `production`, khai báo trong `.jira/config.yml` (mục 2.9) |

### 2.4 Thay đổi hợp đồng (đã duyệt 2026-10-27)

1. **Thêm trường `agent` (Agent):** vai trò agent đang giữ item, dạng chọn một giá trị trong các role của agent; áp dụng cho Story, Sub-task, Task, Bug; agent điền khi `start` và `pick-up`. Lý do: mọi agent dùng chung một tài khoản Jira, nên assignee không cho biết agent nào đang giữ item, trong khi guard `wip-available` phải đếm WIP theo từng dev agent.
2. **Ghi rõ cách tính `rework-count`:** số transition có effect `increment-rework` trong lịch sử của item. Hợp đồng hiện để module này chọn giữa trường số và đếm từ lịch sử. Mình chọn đếm từ lịch sử: chỉ có một nguồn sự thật, không cần ai nhớ tăng số, và không lệch được.

### 2.5 Quy ước gắn mã Jira

| Thứ | Quy ước | Ví dụ |
|---|---|---|
| Nhánh của Story, Task | `feature/<KEY>-<slug>`, tách từ `develop` | `feature/DEMO-12-email-login` |
| Nhánh của Bug | `bugfix/<KEY>-<slug>` khi nhánh gốc là `develop` hoặc `release/*`; `hotfix/<KEY>-<slug>` khi nhánh gốc là `main` | `hotfix/DEMO-40-empty-cart` |
| Nhánh sửa sau `qa-fail` | Như trên, thêm hậu tố `-r2`, `-r3`… để không trùng nhánh cũ | `feature/DEMO-12-email-login-r2` |
| Commit | `type(scope): subject (<KEY>)`. Commit của một Sub-task ghi thêm mã Sub-task | `feat(api): add login endpoint (DEMO-12, DEMO-13)` |
| Tiêu đề PR | Dòng đầu của template `pull-request.md`: `type(scope): subject (<KEY>)` | `feat(auth): add email login (DEMO-12)` |
| Nhánh release | Không có mã | `release/v1.5.0` |

`<slug>` gồm chữ thường, số và gạch nối, tối đa 40 ký tự. App GitHub for Jira dùng mã Jira trong commit để gắn commit và deploy vào item, nên mọi commit đều mang mã. Mã Sub-task trong commit là bằng chứng cho guard `work-committed`. `lib/tracker/conventions.mjs` có hàm tách mã và kiểm tên nhánh, commit, tiêu đề PR; `quality-gates` gắn các hàm này vào hook và CI.

### 2.6 Agent và Rovo MCP

Dự án khai báo server trong `.mcp.json`. Token nằm trong biến môi trường user của Windows, không nằm trong repo:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v2/mcp",
      "headers": { "Authorization": "Bearer ${ATLASSIAN_AGENT_TOKEN}" }
    }
  }
}
```

- Admin tổ chức phải bật xác thực bằng API token cho Rovo MCP, ở Atlassian Administration → **Connectors** → **Atlassian MCP server** → mục **Authentication** → **API token**. Đường dẫn lấy từ trang hỗ trợ của Atlassian; bản trước của spec ghi theo một trả lời trên Atlassian Community, và đường dẫn đó không còn đúng.
- Tool Jira agent dùng: `getJiraIssue`, `searchJiraIssuesUsingJql`, `createJiraIssue`, `editJiraIssue`, `addOrEditJiraIssueComment`, `transitionJiraIssue`. Các thao tác đọc khác, như `listJiraIssueTransitions` và `listJiraIssueComments`, được gọi qua tool `executeRead`. Danh sách này lấy từ `tools/list` của server thật ở T1, và khác trang Supported tools.
- Hook chặn `executeWrite` và `executeDestructive` với mọi agent. Hai tool này chạy được mọi thao tác ghi hoặc xóa theo tên, nên là đường vòng qua `transitionJiraIssue` và `jira-guard`. Agent không cần chúng, vì mọi việc ghi của agent đều có tool riêng ở trên.
- Agent tìm item bằng JQL có điều kiện giới hạn (`project = <KEY>`), không dùng tool `search`: tool đó tốn Rovo Credits, và Jira từ chối JQL không có điều kiện.
- Không bật connector Atlassian của claude.ai cho Claude Code, vì connector đó chạy bằng tài khoản của bạn. Hook chặn mọi tool Atlassian không thuộc server `atlassian` của dự án.

**Hook `jira-guard`** được khai báo một lần trong `.claude/settings.json` của dự án, và chạy trước mỗi lần gọi `mcp__atlassian__transitionJiraIssue`:

1. Lấy vai trò agent từ trường `agent_type` trong input của hook. Claude Code điền trường này bằng tên subagent khi tool được gọi bên trong subagent, và khi phiên chạy bằng `--agent`. Tên file agent trùng id vai trò (`fe-dev`, `qa`…), nên `agent_type` chính là vai trò. Không có `agent_type` (phiên chính tự gọi tool), hoặc `agent_type` không phải vai trò agent của hợp đồng (ví dụ agent của plugin), thì chặn.
2. Đổi transition Jira sang transition của hợp đồng, theo `tracker/jira.yaml`. Tool nhận `transitionId` hoặc `transitionName`, nên hook xử lý cả hai.
3. Gom dữ kiện cho các guard (mục 2.8), rồi gọi `checkTransition` của hợp đồng.
4. Cho qua, hoặc chặn và báo lý do: vai trò không được phép, hoặc guard nào còn thiếu.

Sau khi agent chuyển trạng thái thành công, hook thứ hai đếm lại rework; nếu chạm giới hạn trong `policies.yaml` thì thực hiện `flag-needs-you`.

Agent không được gọi thẳng Jira REST API. Một hook chặn lệnh Bash có chứa `atlassian`. Biện pháp này không kín hoàn toàn, nên lớp chặn cuối cho các transition của bạn vẫn là rule Restrict.

Cũng hook đó chỉ cho các tool ghi (`createJiraIssue`, `editJiraIssue`, `addOrEditJiraIssueComment`, `transitionJiraIssue`) chạm vào item của space dự án, vì gói Free không có permission scheme nên token của agent ghi được vào mọi space trên site. Key của space đặt ở biến `AO_JIRA_SPACE` trong mục `env` của `.claude/settings.json` dự án; chưa đặt thì mọi lệnh ghi bị chặn. Tool ghi phải nhận key của item, không nhận id số.

Bản nháp trước của spec cho mỗi agent khai báo hook trong frontmatter, kèm `--actor <role>`. Cách đó bị bỏ vì ba lý do. Hook trong file settings của dự án cũng chạy bên trong subagent, nên một hook khai báo ở cả hai nơi sẽ chạy hai lần, và lần không có `--actor` luôn chặn. Hook trong frontmatter chỉ chạy sau khi bạn chấp nhận hộp thoại tin cậy thư mục, và không chạy trong phiên `claude -p`. Còn `agent_type` thì do Claude Code điền, agent không tự đổi được.

### 2.7 Automation trên GitHub Actions

Workflow `jira-sync.yml` trong repo dự án chạy `scripts/jira-sync.mjs` khi có các sự kiện sau:

| Sự kiện GitHub | Transition có thể xảy ra |
|---|---|
| `pull_request` (opened, reopened, synchronize, ready_for_review); `workflow_run` của CI đã xong | `submit` khi đủ guard; `request-changes` khi CI đỏ |
| `pull_request_review` có trạng thái yêu cầu sửa | `request-changes` |
| `deployment_status` thành công | `deploy-to-qa` cho các item có PR đã merge nằm trong bản deploy, nếu môi trường đó là môi trường QA của item |
| `workflow_dispatch`, nhận vào mã item | Đối soát lại một item. Với Epic ở `in-progress`: `refine` các item con đạt DoR (effect `refine-children`) |

`jira-sync` không chạy kịch bản riêng cho từng sự kiện mà **đối soát**: với mỗi item liên quan, nó đọc state hiện tại, gom dữ kiện, rồi thực hiện transition của `automation` mà mọi guard đều thỏa (dùng `allowedTransitions` và `checkTransition`). Chạy lại bao nhiêu lần cũng ra cùng một kết quả, nên sự kiện bị lỡ được bù bằng `workflow_dispatch`. `dev-workflow` sẽ gọi `workflow_dispatch` cho Epic ngay sau khi bạn duyệt plan.

Token của CI là secret `JIRA_CI_TOKEN`, cloud id là biến `JIRA_CLOUD_ID`. GitHub chỉ chạy workflow có trigger `workflow_run` và `deployment_status` từ bản trên nhánh mặc định của repo.

### 2.8 Dữ kiện cho guard

`lib/tracker/facts.mjs` gom dữ kiện từ Jira REST API và GitHub API cho các guard mà agent và `automation` cần:

| Guard | Lấy dữ kiện từ |
|---|---|
| `dor-met` (khi `automation` chuyển) | Jira: Epic cha ở `in-progress`, item có mô tả |
| `wip-available` | Jira, JQL: số item ở `in-progress` có cùng giá trị Agent, tính theo Sub-task nếu Story có Sub-task |
| `dependencies-merged` | Jira: các item mà item này bị chặn bởi (link "is blocked by"). GitHub: PR mới nhất của từng item đó đã merge vào nhánh gốc |
| `branch-created` | GitHub: có nhánh mang mã item, tách từ đúng nhánh gốc |
| `subtasks-done` | Jira: mọi Sub-task ở nhóm Done |
| `pr-open` | GitHub: PR mới nhất mang mã item đang mở, vào đúng nhánh gốc |
| `ci-green` | GitHub: mọi check của commit mới nhất trên PR đều thành công |
| `changes-requested` | GitHub: review mới nhất trên commit mới nhất của PR yêu cầu sửa, hoặc có check thất bại. Push sau yêu cầu sửa là đã trả lời yêu cầu đó (sửa ở T16) |
| `merge-approved` | GitHub: PR có review approve của bạn |
| `pr-merged` | GitHub: PR đã merge |
| `qa-deployed` | GitHub: deployment lên môi trường QA của item chứa merge commit và có trạng thái thành công |
| `qa-report-failed`, `qa-report-passed` | Jira: comment báo cáo QA mới nhất (theo template `qa-report.md`) ghi FAIL hoặc PASS |
| `work-committed` | GitHub: nhánh của Story có commit mang mã Sub-task |

Guard có nguồn bằng chứng là `human` (`dod-met`, `spec-approved`, `plan-approved`) không được gom: transition dùng các guard này chỉ do bạn thực hiện trên Jira.

### 2.9 GitHub for Jira và panel Deployments

- Cài app GitHub for Jira, nối với tài khoản GitHub `TungPH7` và chọn repo của dự án.
- Repo dự án có ba GitHub environment `development`, `staging`, `production`, và file `.jira/config.yml` trên nhánh mặc định:

  ```yaml
  deployments:
    environmentMapping:
      development: ["development"]
      staging: ["staging"]
      production: ["production"]
  ```

- App chỉ nghe sự kiện `deployment_status`, nên pipeline deploy của `release-workflow` phải tạo deployment kèm status. Theo một bài KB của Atlassian, lần đầu thêm file này phải ngắt rồi nối lại kết nối GitHub.

Mục này trả lời câu hỏi mở thứ hai trong `SPEC.md`; mục 2.3 trả lời câu thứ nhất (company-managed).

### 2.10 Dựng và kiểm cấu hình Jira

- **Dựng tay theo checklist.** `npm run jira:checklist` sinh `docs/jira-setup.md` từ hợp đồng và `tracker/jira.yaml`. Checklist đi theo thứ tự: service account và group, bật API token cho Rovo MCP, resolution, status, workflow, work type, workflow scheme, custom field, space (kèm work type scheme và màn hình), board, app GitHub for Jira, environment. Mỗi mục ghi các bước bấm cụ thể trước danh sách cần tạo. Mỗi dự án chỉ dựng một lần, còn API sửa workflow phức tạp, nên Cấp 1 chưa dựng tự động.
- **Kiểm lệch.** `npm run jira:check -- --space DEMO` chỉ gửi request đọc, so cấu hình Jira thật với ánh xạ và in từng chỗ lệch: thiếu status, transition sai `from` hoặc `to`, rule Restrict thiếu group, cột board hoặc giới hạn WIP sai, thiếu field hay giá trị field, scheme thiếu issue type. Lệnh trả mã lỗi khác 0 khi có chỗ lệch. Lệnh chạy trên máy bạn bằng token chỉ đọc của bạn, vì đọc cấu hình workflow cần quyền admin.

## 3. Tech stack

- Node.js 24, ES module, như `sdlc-contract`. Gọi Jira REST API v3 và GitHub REST API bằng `fetch` có sẵn; không thêm dependency.
- Rovo MCP endpoint `https://mcp.atlassian.com/v2/mcp`.
- Test dùng `node:test` với dữ liệu trả về ghi sẵn thành file JSON; test không gọi mạng.

## 4. Lệnh

```
npm run validate                        # thêm các quy tắc của mục 7 cho tracker/jira.yaml
npm test
npm run jira:checklist                  # sinh docs/jira-setup.md
npm run jira:checklist:check            # báo lỗi nếu docs/jira-setup.md đã cũ (dùng trong CI)
npm run jira:check -- --space DEMO      # chỉ đọc; cần JIRA_ADMIN_EMAIL và JIRA_ADMIN_TOKEN
node scripts/jira-sync.mjs --dry-run    # chạy thử đối soát ở máy, không ghi gì lên Jira
```

## 5. Cấu trúc thư mục

```
ai-orchestrator-v1/
├── tracker/
│   ├── jira.yaml               # ánh xạ hợp đồng → Jira, quy ước, cloud id, hạn token
│   └── schema/jira.schema.json
├── lib/tracker/
│   ├── mapping.mjs             # đọc ánh xạ, kiểm ánh xạ phủ đủ hợp đồng
│   ├── conventions.mjs         # tách mã Jira, kiểm nhánh, commit, tiêu đề PR
│   ├── jira-client.mjs         # client REST mỏng, dùng fetch
│   ├── github-client.mjs
│   ├── facts.mjs               # dữ kiện cho guard (mục 2.8)
│   ├── rework.mjs              # đếm rework từ lịch sử item
│   └── reconcile.mjs           # chọn transition của automation
├── scripts/
│   ├── jira-checklist.mjs
│   ├── jira-check.mjs
│   └── jira-sync.mjs
├── kit/                        # file nằm trong repo dự án, giữ đúng đường dẫn tương đối
│   ├── .mcp.json
│   ├── .jira/config.yml
│   ├── .claude/settings.json   # khai báo các hook
│   ├── .claude/hooks/jira-guard.mjs
│   ├── .claude/hooks/jira-rework.mjs      # đếm rework sau transition của agent
│   ├── .claude/hooks/block-atlassian.mjs  # chặn đường vòng và lệnh ghi ngoài space dự án
│   └── .github/workflows/jira-sync.yml
├── docs/jira-setup.md          # sinh tự động, không sửa tay
└── tests/tracker/              # dữ liệu mẫu ở tests/fixtures/tracker/
```

Thư mục `kit/` là chỗ mới, chứa file sẽ nằm trong repo dự án; `agent-roster` sẽ đặt agent ở `kit/.claude/agents/`. File trong `kit/` gọi thư viện của kit qua thư mục `.ai-orchestrator/` của dự án, nơi chứa bản chép của `contract/`, `lib/` và `tracker/`. Cách cài và cập nhật bản chép này chốt ở `project-scaffold`; trong module này và ở Pilot 1, bản chép được làm tay.

## 6. Code style

Giữ quy ước của `sdlc-contract`: tên trường `snake_case`, id `kebab-case`. Ví dụ:

```yaml
# tracker/jira.yaml (trích)
site: phunghuutung12b4.atlassian.net
cloud_id: 58b36210-6e4d-421a-adf4-e74a4e23b069
identities:
  - id: human
    account: site-admin   # tài khoản Atlassian của bạn
    group: ao-humans
    roles: [human]
  - id: agents
    account: orchestratoragent
    group: ao-agents
    roles: [pm, ba, ux, sa, fe-dev, be-dev, reviewer, security, qa, devops]
    token_expires_on: 2027-10-27
  - id: automation
    account: orchestratorci
    group: ao-automation
    roles: [automation]
    token_expires_on: 2027-10-27
workflows:
  standard:
    states:
      ready-for-qa: { status: "Ready for QA", category: in-progress }
    transitions:
      request-changes: { name: "Request changes" }
fields:
  severity: { jira_field: "Severity", type: select }
  rework-count: { derived_from: changelog }
```

Thư viện chỉ gọi mạng trong `jira-client.mjs` và `github-client.mjs`. `facts.mjs` và `reconcile.mjs` nhận client qua tham số, nên test truyền client giả.

## 7. Chiến lược test

**Quy tắc mới của `npm run validate`.** Mỗi quy tắc có test dương và fixture âm, như ở `sdlc-contract`:

1. `tracker/jira.yaml` đúng schema.
2. Mọi work type, workflow, state, transition, trường, cột board và môi trường của hợp đồng đều có ánh xạ, và ánh xạ không nhắc id nào hợp đồng không có.
3. Trong một workflow, tên status không trùng nhau; tên transition chỉ được trùng giữa các bản tách của cùng một transition có nhiều `from`.
4. Mỗi role của hợp đồng thuộc đúng một danh tính.

**Test đơn vị**, dùng dữ liệu ghi sẵn:

- Quy ước: tên nhánh, commit, tiêu đề PR đúng và sai; tách được nhiều mã trong một commit.
- Rework: đếm đúng từ lịch sử có `request-changes` và `qa-fail` xen kẽ; chạm 3 thì có `flag-needs-you`.
- Đối soát: PR mở, CI xanh, Sub-task xong → `submit`. CI đỏ khi đang `in-review` → `request-changes`. PR đã merge và deploy lên `development` thành công → `deploy-to-qa`. Deploy lên `staging` cho item mới → không đổi gì. Chạy lại lần hai → không đổi gì.
- Hook: `qa` gọi `accept` → chặn. Phiên không rõ vai trò → chặn. `fe-dev` gọi `start` khi đã đủ WIP → chặn và báo thiếu `wip-available`. Đủ guard → cho qua.
- `jira:check`: mỗi loại lệch ở mục 2.10 có một bộ dữ liệu mẫu và thông báo mong đợi.

**Kiểm thật**, làm tay một lần trên space `DEMO` và repo sandbox, kết quả ghi vào `tasks/`: các tiêu chí 3 đến 8 ở mục 9.

## 8. Ranh giới

- **Luôn làm:** để token trong biến môi trường hoặc GitHub secret; giữ `jira:check` chỉ đọc; đổi cấu hình Jira thì sửa `tracker/jira.yaml` trong cùng lần đó và chạy `jira:check`; mọi thay đổi ánh xạ đi qua PR và `npm run validate`.
- **Hỏi bạn trước:** tạo hoặc xóa service account, group, token; đổi scope token; sửa workflow trên Jira khi đã có item; tạo repo GitHub mới; đổi hợp đồng.
- **Không bao giờ:** đưa token vào repo, log hoặc chat; cấp scope quản trị cho token của agent hay CI; dùng tính năng Jira chỉ có ở gói trả phí; để agent dùng tài khoản Jira của bạn; xóa item trên Jira.

## 9. Tiêu chí hoàn thành

1. `tracker/jira.yaml` phủ đủ hợp đồng; `npm run validate`, `npm test` và CI đều xanh.
2. `docs/jira-setup.md` được sinh từ ánh xạ, và CI báo lỗi nếu file này cũ.
3. Space `DEMO` được dựng theo checklist, và `npm run jira:check -- --space DEMO` không báo lệch.
4. Agent dùng `orchestratoragent` tạo, đọc, tìm và chuyển item qua Rovo MCP; lịch sử item ghi tên service account.
5. Hook chặn agent gọi `accept`, chặn phiên không rõ vai trò, và cho qua `start` khi đủ guard; mỗi trường hợp được thử thật một lần.
6. Trên gói Free, rule Restrict chặn `orchestratoragent` ở các transition của `human`. Nếu gói Free không có rule này, spec và `docs/jira-setup.md` ghi rõ điều đó, và hook là lớp chặn duy nhất đối với agent.
7. Trên repo sandbox: PR mở và CI xanh thì item sang In Review, do `orchestratorci` chuyển; CI đỏ thì item về In Progress và đếm rework bằng 1; merge rồi deploy thử lên `development` thành công mà PR chưa có approve của bạn thì item đứng yên ở In Review, và `jira-sync` báo thiếu `merge-approved`. Chặng sang Ready for QA kiểm thật ở `quality-gates` (mục 11).
8. Nhánh, commit, PR và các deployment thử hiện trên item; panel Deployments nhận đúng loại môi trường của `development`, `staging`, `production`.
9. Hai câu hỏi mở trong `SPEC.md` được đóng.

## 10. Câu hỏi đã trả lời (2026-10-27)

1. **Gói Jira:** bạn đã chuyển site về Free trước khi dựng Jira.
2. **Tài khoản:** hai service account, `orchestratoragent` và `orchestratorci`; bạn đã tạo cả hai cùng token của chúng.
3. **Nơi kiểm thật:** space `DEMO` của dự án pilot, và repo private `TungPH7/ao-pilot` làm sandbox. Tới Pilot 1, repo này nhận code mẫu Next.js + NestJS và trở thành repo pilot.
4. **Thay đổi hợp đồng:** bạn đồng ý cả hai thay đổi ở mục 2.4.

## 11. Rủi ro chuyển sang module khác

- **Bạn không approve được PR của chính mình.** GitHub không cho tác giả PR approve PR đó. Nếu agent mở PR bằng tài khoản `TungPH7`, guard `merge-approved` không bao giờ thỏa. Agent cần mở PR bằng một danh tính khác, như GitHub App hoặc một tài khoản máy. Chốt ở `quality-gates`; trong module này, guard được test bằng dữ liệu mẫu, và `quality-gates` kiểm thật chặng `deploy-to-qa` của tiêu chí 7 (bạn chọn ngày 2026-10-27).
- **`agent-roster` phải đặt tên file agent trùng id vai trò** (`fe-dev.md` có `name: fe-dev`), vì hook lấy vai trò từ `agent_type` (mục 2.6).

## Nguồn

- [Atlassian: Understand service accounts](https://support.atlassian.com/user-management/docs/understand-service-accounts/)
- [Atlassian KB: Configuring Jira connector credentials using a Jira Cloud API service account](https://support.atlassian.com/jira-align/kb/configuring-jira-connector-credentials-using-jira-cloud-api-service-account/)
- [Atlassian Rovo MCP Server: Configuring authentication via API token](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/configuring-authentication-via-api-token/)
- [Atlassian Rovo MCP Server: Supported tools](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/supported-tools/)
- [Atlassian: Permissions and issue-level security in Free plans](https://support.atlassian.com/jira-cloud-administration/docs/permissions-and-issue-level-security-in-free-plans/)
- [Atlassian: What is the Free Jira Cloud plan?](https://support.atlassian.com/jira-cloud-administration/docs/explore-jira-cloud-plans/)
- [Atlassian: Restrict workflows based on user groups](https://support.atlassian.com/jira-cloud-administration/docs/restrict-workflows-based-on-user-groups/)
- [Atlassian Developer: Configuring authentication via API token (Rovo MCP)](https://developer.atlassian.com/cloud/rovo-mcp/guides/configuring-authentication-via-api-token/)
- [Atlassian KB: Rovo MCP Server only returns Teamwork Graph tools when using API Token](https://support.atlassian.com/rovo/kb/rovo-mcp-server-only-returns-teamwork-graph-tools-when-using-api-token/)
- [Claude Code: Hooks reference](https://code.claude.com/docs/en/hooks)
- [Atlassian: Control Atlassian Rovo MCP server settings](https://support.atlassian.com/security-and-access-policies/docs/control-atlassian-rovo-mcp-server-settings/)
- [Atlassian Community: Unable to enable Atlassian Rovo MCP Server API Token](https://community.atlassian.com/forums/Jira-questions/Unable-to-enable-Atlassian-Rovo-MCP-Server-API-Token/qaq-p/3263746)
- [atlassian/github-for-jira: Showing GitHub deployments in Jira](https://github.com/atlassian/github-for-jira/blob/332b5ae08042c631fdce6465386a6c338e819d99/docs/deployments.md)
- [Atlassian KB: custom environment names show "undefined environment"](https://support.atlassian.com/jira/kb/jira-github-integration-custom-environment-names-does-not-show-up-in-releases-panel-and-instead-show-undefined-environment/)

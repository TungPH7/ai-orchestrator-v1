# Kiểm thật: tracker-integration

> **Plan:** [plan.md](plan.md). Mỗi lần kiểm thật ghi ngày, bước đã làm và kết quả. Không ghi token.

## T1: Kết nối thật bằng hai service account

**Chuẩn bị (2026-10-27):**

- Site Jira đã về gói Free; hai service account `orchestratoragent` và `orchestratorci` đã có token, hết hạn ngày 2027-10-27.
- Bạn đã bật API token ở Administration → Connectors → Atlassian MCP server → Authentication, và đặt hai biến môi trường user `ATLASSIAN_AGENT_TOKEN`, `JIRA_CI_TOKEN`.
- Repo private `TungPH7/ao-pilot` đã được tạo, có nhánh `main` và `develop`.
- `kit/.mcp.json` nối server `atlassian` tới `https://mcp.atlassian.com/v2/mcp` bằng header `Bearer ${ATLASSIAN_AGENT_TOKEN}`.

**Kết quả (2026-10-27):**

| Phép thử | Kết quả |
|---|---|
| Rovo MCP, token của agent, header `Bearer`: `initialize` rồi `tools/list` | Đạt. `initialize` trả 200; `tools/list` trả 21 tool |
| Phiên `claude -p` trong `ao-pilot`, dùng `kit/.mcp.json`, gọi `searchJiraIssuesUsingJql` | Đạt. Trả về item của space có sẵn `SCRUM`; danh tính là account `712020:3c1a9503-577b-49c6-a70e-033f740c1f31`, trùng id của service account trong admin.atlassian.com |
| Token CI, REST qua `api.atlassian.com/ex/jira/<cloud-id>`, header `Bearer` | Đạt. `GET /project/search` và `GET /serverInfo` trả 200 |
| Token của agent, REST `GET /project/search` (cho hook đọc dữ kiện) | Đạt, trả 200 |

**Phát hiện:**

1. **`GET /myself` trả 401** ("scope does not match"), vì endpoint này cần scope `read:jira-user`. Tương tự, tool `atlassianUserInfo` cần scope `read:me`. Module không cần hai scope này, nên không thêm. Danh tính `orchestratorci` được kiểm qua lịch sử item ở T18.
2. **`curl -I` không dùng để kiểm được.** `curl` của Git Bash trên Windows lỗi `CRYPT_E_REVOCATION_OFFLINE` khi kiểm thu hồi chứng chỉ, còn request `HEAD` tới Rovo MCP trả 400. Kiểm bằng `fetch` của Node, gửi `initialize` của MCP.
3. **Danh sách tool thật khác trang Supported tools.** Có sẵn: `getJiraIssue`, `searchJiraIssuesUsingJql`, `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addOrEditJiraIssueComment`, và các tool chung `discover`, `executeRead`, `executeWrite`, `executeDestructive`, `search`. Các thao tác như `listJiraIssueTransitions`, `listJiraIssueComments` được gọi qua `executeRead`, sau khi tìm bằng `discover`.
4. **`executeWrite` và `executeDestructive` là đường vòng.** Hai tool này chạy được mọi thao tác ghi hoặc xóa theo tên, nên agent có thể chuyển trạng thái mà không đi qua `transitionJiraIssue` và `jira-guard`. Spec mục 2.6 đã thêm: hook chặn hai tool này với mọi agent (T14).
5. **`transitionJiraIssue` nhận `transitionId` hoặc `transitionName`.** `jira-guard` phải xử lý cả hai (T13).
6. **JQL phải có điều kiện giới hạn.** Jira từ chối `order by created DESC` không kèm điều kiện; JQL trong `facts.mjs` luôn có `project = <KEY>`.
7. **Tool `search` tốn Rovo Credits.** Agent tìm item bằng JQL, không dùng `search`.

**Sự cố:** ngày 2026-10-27, token của `orchestratorci` lọt vào cuộc trò chuyện: dòng chứa token đang được bôi đen trong một file chưa lưu của VS Code, và extension Claude Code gửi phần bôi đen kèm tin nhắn. Bạn đã thu hồi token này và tạo token mới. Kiểm lại token mới bằng `GET /project/search`: đạt, trả 200. Nhưng token mới cũng lọt theo đúng đường cũ: nó nằm trong file ghi chú cá nhân `todo.md` của bạn (không được Git theo dõi) và đang được bôi đen khi bạn gửi tin nhắn. Bạn được đề nghị đổi token CI lần nữa, và không để token trong file nào mở bằng VS Code. Kiểm lại token thứ ba: _chưa chạy_.

## T8: Dựng space `DEMO` theo checklist

**Claude đã làm (2026-10-27):**

- Tạo ba GitHub environment `development`, `staging`, `production` trong `TungPH7/ao-pilot`.
- Đưa `.jira/config.yml` lên nhánh `main` của `ao-pilot`, sinh từ `tracker/jira.yaml`. File có trước khi cài app GitHub for Jira, nên không cần ngắt rồi nối lại kết nối.

**Kết quả:** T8 xong ngày 2026-10-28. Space `DEMO` đủ ba workflow với rule, field, board và app GitHub for Atlassian; Story thử `DEMO-2` đi `New` → `Ready` → `Cancelled` đúng quyền và có Resolution. `DEMO-1` giữ lại làm bằng chứng của lỗi thiếu rule hỏi Resolution trước khi sửa.

**Bạn làm:** dựng Jira theo `docs/jira-setup.md`, mục 1 đến 11. File checklist được sinh tự động nên không tick trong đó; tiến độ ghi ở bảng dưới.

| Mục | Trạng thái |
|---|---|
| 1. Group và service account | Xong, đã kiểm qua REST (2026-10-28): `ao-humans` có bạn, `ao-agents` có `orchestratoragent`, `ao-automation` có `orchestratorci` |
| 2. Rovo MCP | Xong ở T1 |
| 3. Resolution | Xong (2026-10-27). Site có hai resolution `Done` ("GreenHopper Managed Resolution", do Jira Software tạo); giữ cả hai |
| 4. Status | Xong (2026-10-27): 10 status mới và `In Progress` có sẵn, đúng tên và Category |
| 5. Workflow | Xong (2026-10-28): bạn dựng status, transition và 7 rule; Claude thêm rule cho 17 transition còn lại qua REST theo yêu cầu của bạn. Đọc lại: đủ 24 transition, đúng group, đúng màn hình và rule đặt Resolution |
| 6. Work type | Xong (2026-10-27): đã tạo `Task`, `Bug`, `Sub-task`; `Epic`, `Story` có sẵn |
| 7. Workflow scheme | Xong (bạn báo 2026-10-27) |
| 8. Trường | Xong (bạn báo 2026-10-27). `Found in` đúng ba option; giữ Global context |
| 9. Space | Xong (bạn báo 2026-10-27): `DEMO` company-managed (ảnh `misc/images/phien-6-luot-21-anh-1.png`), đủ năm work type (ảnh `misc/images/phien-6-luot-22-anh-1.png`), field thêm theo screen của từng work type |
| 10. Board | Xong (bạn chuyển sang mục 11, 2026-10-28). Filter đọc lại qua REST đã là `project = DEMO AND issuetype != Epic ORDER BY Rank ASC`; cột và giới hạn WIP do `jira:check` kiểm |
| 11. GitHub for Jira | Xong (2026-10-28): app **GitHub for Atlassian** nối với tài khoản `TungPH7`, Only select repos (1 repo, `ao-pilot`), Backfill FINISHED, Full Access (ảnh `misc/images/phien-6-luot-26-anh-1.png`) |
| 12. Môi trường | Xong, Claude làm; bạn kiểm lại thấy đủ `production`, `staging`, `development` (ảnh `misc/images/phien-6-luot-26-anh-2.png`) |

| Câu hỏi | Kết quả |
|---|---|
| Gói Free có rule "Restrict who can move a work item" theo group không | Có trong danh sách rule (2026-10-27, ảnh `misc/images/phien-6-luot-17-anh-2.png`). Rule có chặn thật hay không được kiểm ở T15 |
| Service account thêm được vào group không | Được: đọc qua REST ngày 2026-10-28, mỗi group có đúng thành viên (`orchestratoragent` và `orchestratorci` là loại tài khoản `app`) |
| Site có sẵn những work type nào | Chỉ `Epic` và `Story` (2026-10-27, ảnh `misc/images/phien-6-luot-18-anh-1.png`). Checklist thêm mục 6 Work type, trước Workflow scheme |
| Giới hạn custom field theo work type được không | Không: Global context của field không còn sửa được work type (banner CHANGE-3019, ảnh `misc/images/phien-6-luot-19-anh-2.png`). Giữ **Any issue type**; work type nào dùng field nào do hợp đồng quy định |
| Trình tạo space có loại sub-task không | Bước 2 (**Let's set up your space**) chỉ có sẵn `Epic`, `Story`, `Bug`, `Task` (ảnh `misc/images/phien-6-luot-20-anh-1.png`). `Sub-task` thêm sau trong Space settings |
| Sửa filter của board ở đâu | Board settings → **Details** → **Edit filter query** mở trang filter ở tab mới; phải chạy câu JQL (Enter) rồi mới lưu (ảnh `misc/images/phien-6-luot-23-anh-1.png`). **Board sub-filter** mặc định của Kanban là `fixVersion in unreleasedVersions() OR fixVersion is EMPTY`, để nguyên |
| App GitHub for Atlassian nối được với tài khoản GitHub cá nhân không | Được (2026-10-28): nối với tài khoản cá nhân `TungPH7`, dù trang ghi "organization". Chrome chặn pop-up của nút **Select an organization in GitHub**; cho phép pop-up từ site Jira là bấm được |

**Phát hiện (2026-10-28):**

1. **Hai service account trả tên bằng tiếng Trung.** Đọc `DEMO-1` qua REST bằng token của `orchestratoragent` hay `orchestratorci` đều ra work type `故事` (Story) và status `全新` (New); id status (`10004`) và nhóm status (`new`) thì không đổi. Gửi kèm header `Accept-Language: en-US` thì ra `Story`, `New`. Không đọc được ngôn ngữ đang đặt, vì `/mypreferences/locale` cần scope khác (401). Ánh xạ so theo tên, nên mọi request REST của module phải gửi `Accept-Language: en-US`: client ở T9, dữ kiện cho guard ở T11, `jira-sync` ở T17. Với Rovo MCP thì chưa biết tool trả tên theo ngôn ngữ nào; T13 kiểm, và `jira-guard` phải nhận được cả `transitionName` agent đọc từ MCP.
2. **Item ở status `New` không hiện trên board**, vì `New` là Kanban backlog. Board `DEMO` không có tab Backlog riêng; xem các item này ở tab **List**.

**Đọc ba workflow bằng token chỉ đọc của bạn (2026-10-28, làm sớm bước đầu của T9):**

Token: tài khoản admin của bạn, Basic auth qua `api.atlassian.com/ex/jira/<cloud-id>`, biến `JIRA_ADMIN_EMAIL` và `JIRA_ADMIN_TOKEN`, hết hạn sau 365 ngày. 20 scope chỉ đọc, lấy từ OpenAPI spec của Jira theo từng API: `read:jira-work`, `read:workflow:jira`, `read:workflow-scheme:jira`, `read:issue-type-scheme:jira`, `read:issue-type:jira`, `read:project:jira`, `read:project-category:jira`, `read:application-role:jira`, `read:avatar:jira`, `read:group:jira`, `read:user:jira`, `read:field:jira`, `read:custom-field-contextual-configuration:jira`, `read:field.option:jira`, `read:issue-type-screen-scheme:jira`, `read:screen-scheme:jira`, `read:screen-tab:jira`, `read:screenable-field:jira`, `read:board-scope:jira-software`, `read:board-scope.admin:jira-software`. Đã gọi được: `GET /project/DEMO`, `POST /workflows`, `GET /group/bulk`, `GET /group/member`.

Rule Restrict lưu thành điều kiện `system:restrict-issue-transition` với tham số `groupIds` (id của group, không phải tên). Màn hình transition và rule đặt trường không có trong bản đã lưu của transition nào.

| Workflow | Transition đúng | Transition thiếu rule |
|---|---|---|
| `AO standard` | `Refine`, `Start`, `Submit`, `Request changes`, `Deploy to QA`, `Pick up`: đúng group | `QA fail` (Restrict); `Accept` (Restrict, đặt Resolution); 6 `Cancel` (Restrict, Show a screen). `Cancel` từ `Ready` đã sửa trên màn hình nhưng chưa bấm **Update workflow** |
| `AO epic` | không có | cả 8: `Start spec`, `Approve spec`, `Approve plan` (Restrict); `Complete` (Restrict, đặt Resolution); 4 `Cancel` (Restrict, Show a screen) |
| `AO sub-task` | không có | `Start` (Restrict); `Complete` (Restrict, đặt Resolution) |

**Thêm rule qua REST (2026-10-28, bạn yêu cầu):** bạn tạo token tạm `ao-workflow-edit` (hạn 1 ngày; scope `write:workflow:jira`, `read:workflow:jira`, `read:screen:jira`, `read:project:jira`, `read:avatar:jira`, `read:project-category:jira`), biến `JIRA_ADMIN_WRITE_TOKEN`. Script tạm của Claude đọc ba workflow bằng `POST /workflows`, tính rule cần có từ `contract/` và `tracker/jira.yaml`, chỉ thêm vào transition còn thiếu, gửi `POST /workflows/update/validation` (không lỗi), rồi `POST /workflows/update`. Kết quả: `AO standard` lên version 3, `AO epic` và `AO sub-task` lên version 2. Đọc lại bằng token chỉ đọc: đủ 24 transition.

Dạng rule trong API:

- Restrict: điều kiện `system:restrict-issue-transition`, tham số `groupIds` là id group nối bằng dấu phẩy.
- Hỏi Resolution: `transitionScreen` = `system:transition-screen`, tham số `screenId`. `Resolve Issue Screen` có id `3`, gồm các trường Resolution, Fix versions, Assignee, Log Work.
- Đặt Resolution: action `system:update-field`, tham số `field: resolution`, `value: 10000` (id của `Done` đứng đầu), `mode: replace`.

Vậy API sửa workflow dùng được cho rule. Spec mục 2.10 ghi Cấp 1 chưa dựng tự động vì API sửa workflow phức tạp; điều này đáng xem lại sau T10.

**Kiểm thủ công bằng Story thử `DEMO-1` (2026-10-28):**

| Bước | Kết quả |
|---|---|
| Tạo Story, status ban đầu | Đạt: `New`, nằm ở Kanban backlog (ảnh `misc/images/phien-6-luot-28-anh-1.png` chụp lúc đã sang `Ready`) |
| `Refine` (`New` → `Ready`) do bạn chuyển | Đạt: lịch sử ghi `New` → `Ready` lúc 00:54, người chuyển là bạn |
| Ở `Ready`, bạn không thấy `Start` | Chưa kiểm: chưa có ảnh danh sách transition |
| `Cancel` (`Ready` → `Cancelled`) hỏi Resolution | **Không đạt:** lịch sử ghi `Ready` → `Cancelled` lúc 00:56, Resolution vẫn trống, và bạn không thấy hộp hỏi Resolution nào. Nguyên nhân: transition chưa có rule **Request input → Show a screen**. Checklist mục 5 đã thêm các bước này |
| Story thử thứ hai `DEMO-2` ở `Ready`, sau khi đủ rule: mỗi tài khoản thấy transition nào | Đạt (2026-10-28): bạn chỉ thấy `Cancel` (ảnh `misc/images/phien-6-luot-37-anh-1.png`); `orchestratoragent` chỉ thấy `Start`; `orchestratorci` không thấy transition nào (đọc `GET /issue/DEMO-2/transitions`). Rule Restrict theo group có tác dụng trên gói Free. Việc Jira từ chối khi gọi thẳng transition bị ẩn được kiểm ở T15 |
| `Cancel` của `DEMO-2` (`Ready` → `Cancelled`) hỏi Resolution | Đạt (2026-10-28): Jira hiện màn hình Resolution, bạn chọn `Won't Do`; lịch sử ghi Resolution `Won't Do` và status `Ready` → `Cancelled` lúc 01:36 |
| Rule của transition `Cancel` (`Ready` → `Cancelled`) trong `AO standard` | **Thiếu cả rule Restrict:** khung **Rules** của transition này không có rule nào, cả bốn nhóm chỉ có nút **Add … rule** (ảnh `misc/images/phien-6-luot-30-anh-1.png`). Vậy agent cũng hủy được item ở `Ready`. Đã thêm đủ hai rule (ảnh `misc/images/phien-6-luot-31-anh-1.png`): Restrict `ao-humans` và **Show a screen** `Resolve Issue Screen`. Các transition khác chưa kiểm |

## T9: `jira:check` phần 1: status, transition, scheme

**Token:** token chỉ đọc của bạn đã tạo trong T8 (xem mục T8, đoạn "Đọc ba workflow bằng token chỉ đọc của bạn"). Danh sách scope cũng ghi trong README.

**Cách đọc cấu hình** (`lib/tracker/drift.mjs`, qua `lib/tracker/jira-client.mjs` chỉ gửi GET và luôn gửi `Accept-Language: en-US`):

- `GET /project/<KEY>` để lấy id của space; `GET /issuetype/project` cho work type của space; `GET /workflowscheme/project` cho scheme và bảng work type → workflow.
- `GET /workflows/search?queryString=<tên>&expand=values.transitions` cho từng workflow trong ánh xạ, chỉ giữ workflow trùng tên tuyệt đối. Không dùng `POST /workflows` (đọc theo danh sách tên), để client chỉ cần GET.
- Dữ liệu mẫu ghi từ `DEMO` ngày 2026-10-28, đã lược còn các trường cần dùng, ở `tests/fixtures/tracker/api/demo/`. Mỗi loại lệch có một test sửa bản ghi này rồi so thông báo.

**Loại lệch được báo:** workflow không có; item mới tạo vào sai status; status thiếu, sai nhóm, hoặc thừa so với ánh xạ; transition thiếu, sai `from`/`to` (cùng tên nhưng khác đường đi), hoặc thừa (kể cả transition từ mọi status); space không có workflow scheme hoặc dùng scheme khác; work type không có trong space hoặc dùng sai workflow.

**Chạy thật (2026-10-28):**

| Lệnh | Kết quả |
|---|---|
| `npm run jira:check -- --space DEMO` | `Jira space DEMO matches tracker\jira.yaml`, mã thoát 0 |
| `node scripts/jira-check.mjs --space SCRUM` (space team-managed của bạn, chỉ đọc) | 3 chỗ lệch: không có workflow scheme; không có work type `Sub-task` và `Bug`. Mã thoát 1 |

## T10: `jira:check` phần 2: rule, group, resolution, field, board, hạn token

**Đọc thêm** (cùng client chỉ GET, cùng token):

- Rule của transition: điều kiện `system:restrict-issue-transition` (kể cả trong nhóm điều kiện lồng nhau) ra danh sách group; id group lạ được tra tên bằng `GET /group/bulk?groupId=`. Màn hình transition (`system:transition-screen`) ra danh sách field của màn hình, qua `GET /screens/<id>/tabs` và `/tabs/<id>/fields`. Action `system:update-field` với `field: resolution` ra tên resolution.
- Group: `GET /group/bulk?groupName=` cho từng group trong ánh xạ; với group của service account, `GET /group/member` để xem có đúng tài khoản.
- Resolution: `GET /resolution/search`. Field: `GET /field`, rồi với field dạng chọn, context toàn cục và option đang bật.
- Board: `GET /rest/agile/1.0/board?projectKeyOrId=<KEY>&type=kanban`, cấu hình board, rồi `GET /filter/<id>` cho câu JQL.
- Dữ liệu mẫu: mọi request `readJiraConfig` gửi cho `DEMO` ngày 2026-10-28, ghi vào một file `tests/fixtures/tracker/api/demo.json` theo khóa request (thay các file riêng của T9), đã lược trường không dùng và không còn thông tin cá nhân. `tests/helpers/jira.mjs` trả lời theo bản ghi này.

**Loại lệch mới:** transition thiếu rule Restrict hoặc giới hạn sai group; transition `Cancel` không hỏi Resolution, hoặc màn hình không có field Resolution; transition vào Done không đặt Resolution, hoặc đặt giá trị khác; group thiếu, hoặc service account không ở trong group; resolution thiếu; field thiếu, hoặc option khác (tên hoặc thứ tự); không có board Kanban; filter khác (bỏ qua dấu nháy, khoảng trắng, chữ hoa); cột khác tên hoặc thứ tự; cột chứa status khác; giới hạn WIP khác; status lẽ ra ngoài board lại nằm trong cột.

**Cần kiểm tay** (lệnh in dòng `Check by hand`, không tính là đạt): Kanban backlog bật và chứa `New` (API features của board trả 400); Atlassian MCP server nhận API token; app GitHub for Atlassian nối với repo; field nằm trên screen của đúng work type.

**Hạn token:** cảnh báo, không báo lỗi, khi token trong `tracker/jira.yaml` còn dưới 14 ngày hoặc đã hết hạn.

**Tách phần dùng chung:** `lib/tracker/expected.mjs` tính cấu hình phải có (workflow và transition theo từng `from`, group, cột board, option, resolution) cho cả checklist lẫn `jira:check`. Checklist sinh lại giống hệt bản cũ.

**Chạy thật (2026-10-28):**

| Lệnh | Kết quả |
|---|---|
| `npm run jira:check -- --space DEMO` | Không lệch; in 4 dòng `Check by hand`; mã thoát 0. Tiêu chí 3 của spec đạt |
| `node scripts/jira-check.mjs --space SCRUM` (chỉ đọc) | 4 chỗ lệch: không có workflow scheme, thiếu work type `Sub-task` và `Bug`, không có board Kanban (space này dùng board Scrum) |

## Checkpoint 2

| Mục | Trạng thái |
|---|---|
| Tiêu chí 2: `docs/jira-setup.md` sinh từ ánh xạ, CI báo lỗi khi file cũ | Đạt từ T7; CI vẫn chạy `jira:checklist:check` |
| Tiêu chí 3: `DEMO` dựng theo checklist, `jira:check` không báo lệch | Đạt (T8, T10) |
| Tiêu chí 6: rule Restrict chặn `orchestratoragent` ở transition của `human` | Đạt phần Jira ẩn transition: ở `DEMO-2`, `orchestratoragent` chỉ thấy `Start`, không thấy `Cancel` (T8). Việc Jira từ chối khi agent gọi thẳng transition của bạn qua Rovo MCP được thử ở T15 |
| Bạn xem board `DEMO` và `docs/jira-setup.md` | Bạn duyệt, qua checkpoint ngày 2026-10-28 |

## T11: Dữ kiện từ Jira cho guard

`lib/tracker/facts.mjs` đọc item (`GET /issue/<key>` với các field cần dùng), tìm bằng JQL (`GET /search/jql`, phân trang theo `nextPageToken`) và đọc comment (`GET /issue/<key>/comment`, khóa `comments`). Client vẫn chỉ gửi GET; token của service account đi dạng Bearer.

| Guard | Cách tính |
|---|---|
| `dor-met` | Story hoặc Task có mô tả, nằm dưới Epic ở status `In Progress` (plan đã duyệt) |
| `wip-available` | JQL `project = "<KEY>" AND "Agent" = "<giá trị của vai trò>" AND status in ("In Progress")`; bỏ Story có Sub-task, vì Sub-task của nó đã được đếm; còn dưới giới hạn `dev-agent` (1) thì đạt |
| `subtasks-done` | Mọi Sub-task ở nhóm status Done, hoặc không có Sub-task |
| `qa-report-failed`, `qa-report-passed` | Comment mới nhất là báo cáo QA (có dòng `QA report`), dòng đầu tiên dưới tiêu đề `Result` là `FAIL` hoặc `PASS`. Đọc được cả ADF lẫn markdown thô |

Chạy thử với Jira thật (2026-10-28, token của agent, chỉ đọc): đọc `DEMO-2` đúng; JQL theo trường Agent chạy được; `fe-dev` có `wip-available`.

## T12: Dữ kiện từ GitHub cho guard

`lib/tracker/github-client.mjs` chỉ gửi GET tới `api.github.com/repos/<owner>/<repo>`, phân trang theo header `Link`. `githubGuards` trong `lib/tracker/facts.mjs` tìm nhánh và PR của item theo mã item bằng `parseBranch` và `checkBranch` của `conventions.mjs`. Sau `qa-fail` item có nhiều PR; mọi guard xét PR mới nhất.

| Guard | Cách tính |
|---|---|
| `branch-created` | Có nhánh `feature/`, `bugfix/` hoặc `hotfix/` mang mã item (`GET /git/matching-refs/heads/<loại>/<KEY>-`), đúng tiền tố của loại item |
| `dependencies-merged` | Mỗi item chặn item này (link "is blocked by" trên Jira, `readItem` đọc thêm `issuelinks`) có PR mới nhất đã merge vào nhánh gốc đúng với tiền tố nhánh |
| `pr-open`, `pr-merged` | PR mới nhất đang mở, hoặc đã merge, vào nhánh gốc đúng với loại item |
| `ci-green` | Commit đầu của PR có ít nhất một check; mọi check run đã xong với kết quả success, neutral hoặc skipped; commit status (nếu có) là success |
| `changes-requested` | Review quyết định mới nhất (APPROVED, CHANGES_REQUESTED hoặc DISMISSED; COMMENTED không tính) là CHANGES_REQUESTED, hoặc có check failure hay timed_out |
| `merge-approved` | Review quyết định mới nhất của một trong các login trong `approvers` là APPROVED |
| `qa-deployed` | Một deployment lên môi trường QA ứng với nhánh gốc của PR (`routing.yaml`: `develop` ra development, `release/*` và `main` ra staging), tạo sau lúc merge, chứa merge commit (`GET /compare`), có trạng thái mới nhất là success |
| `work-committed` | Nhánh mới nhất của Story cha có commit mà dòng tiêu đề mang mã Sub-task |

Ghi chú cho các task sau:

- `branch-created` chưa kiểm nhánh có tách từ đúng nhánh gốc không: GitHub không lưu nhánh được tách từ đâu. Nhánh gốc được kiểm qua đích của PR (`pr-open`).
- `approvers` (login GitHub của bạn) chưa có chỗ khai báo; T16 hoặc T17 quyết định đặt ở đâu.
- Danh sách PR được đọc toàn bộ (`GET /pulls?state=all`), đủ cho repo nhỏ của pilot.
- `gh` trên máy bạn là bản 2.16, chưa có `gh auth token` (có từ 2.17). Khi chạy thử, Claude lấy token qua `git credential fill`. Hook ở T13 cần token GitHub trên máy bạn; T13 chọn cách lấy.

Chạy thử với GitHub thật (2026-10-28, chỉ đọc): trên `TungPH7/ao-pilot`, `DEMO-2` chỉ có `dependencies-merged` (không bị chặn bởi item nào); chưa có nhánh, PR hay deployment nào.


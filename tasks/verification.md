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
| Tiêu chí 6: rule Restrict chặn `orchestratoragent` ở transition của `human` | Đạt phần Jira ẩn transition: ở `DEMO-2`, `orchestratoragent` chỉ thấy `Start`, không thấy `Cancel` (T8). Lớp thứ hai đạt ở T15: agent gọi thẳng transition của bạn qua Rovo MCP, không qua hook, thì Jira trả 400 |
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
| `changes-requested` | Trong các review của commit đầu PR (`commit_id`), review quyết định mới nhất (APPROVED, CHANGES_REQUESTED hoặc DISMISSED; COMMENTED không tính) là CHANGES_REQUESTED; hoặc có check failure hay timed_out. T16 thêm điều kiện commit đầu PR |
| `merge-approved` | Review quyết định mới nhất của một trong các login trong `approvers` là APPROVED |
| `qa-deployed` | Một deployment lên môi trường QA ứng với nhánh gốc của PR (`routing.yaml`: `develop` ra development, `release/*` và `main` ra staging), tạo sau lúc merge, chứa merge commit (`GET /compare`), có trạng thái mới nhất là success |
| `work-committed` | Nhánh mới nhất của Story cha có commit mà dòng tiêu đề mang mã Sub-task |

Ghi chú cho các task sau:

- `branch-created` chưa kiểm nhánh có tách từ đúng nhánh gốc không: GitHub không lưu nhánh được tách từ đâu. Nhánh gốc được kiểm qua đích của PR (`pr-open`).
- `approvers` (login GitHub của bạn) chưa có chỗ khai báo; T16 hoặc T17 quyết định đặt ở đâu.
- Danh sách PR được đọc toàn bộ (`GET /pulls?state=all`), đủ cho repo nhỏ của pilot.
- `gh` trên máy bạn là bản 2.16, chưa có `gh auth token` (có từ 2.17). Khi chạy thử, Claude lấy token qua `git credential fill`. Hook ở T13 cần token GitHub trên máy bạn; T13 chọn cách lấy.

Chạy thử với GitHub thật (2026-10-28, chỉ đọc): trên `TungPH7/ao-pilot`, `DEMO-2` chỉ có `dependencies-merged` (không bị chặn bởi item nào); chưa có nhánh, PR hay deployment nào.

## T13: Hook `jira-guard`

`lib/tracker/guard.mjs` quyết định; `kit/.claude/hooks/jira-guard.mjs` đọc input, tạo client và in quyết định; `kit/.claude/settings.json` khai báo hook một lần cho `mcp__atlassian__transitionJiraIssue`.

Thứ tự kiểm, dừng ở bước đầu tiên không đạt:

1. Có `agent_type`, và đó là vai trò agent của hợp đồng (không phải `human`, `automation`, hay agent của plugin). Hai bước này không gọi Jira.
2. Đọc item bằng token của agent. Item có label `needs-you` thì chặn mọi agent.
3. Loại item có trong hợp đồng; tìm transition của hợp đồng theo tên và status hiện tại. Tool đưa `transitionId` thì đổi ra tên bằng danh sách transition agent được thấy trên item (`GET /issue/<key>/transitions`); id không có trong danh sách thì chặn, vì Jira cũng sẽ từ chối.
4. Vai trò có trong `actors` của transition.
5. Gom guard từ Jira và GitHub (T11, T12), gọi `checkTransition`; thiếu guard nào thì chặn và nêu tên.

Hook cho qua bằng cách không in gì, để luồng xin quyền bình thường của Claude Code chạy tiếp; chặn bằng `permissionDecision: "deny"` kèm lý do. Lỗi khi đọc dữ kiện (mất mạng, thiếu token) thì chặn.

Token: Jira dùng `ATLASSIAN_AGENT_TOKEN`. GitHub dùng `GITHUB_TOKEN` nếu có, không thì token của GitHub CLI: `gh auth token`, hoặc với `gh` cũ như bản 2.16 trên máy bạn, dòng `Token:` của `gh auth status --show-token`. Repo lấy từ remote `origin` của thư mục dự án.

Chạy thử với Jira thật (2026-10-28, token của agent, thư mục dự án `ao-pilot`): `fe-dev` gọi `Start` trên `DEMO-2` bị chặn vì hợp đồng không có `Start` từ `Cancelled`; gọi `transitionId: 999` bị chặn vì id đó không có trên item.

## T14: Hook đếm rework và hook chặn đường vòng

**`block-atlassian`** (PreToolUse, matcher `Bash|mcp__.*`; logic ở `checkToolCall` trong `lib/tracker/guard.mjs`):

- Lệnh Bash có chữ `atlassian` (không phân biệt hoa thường) bị chặn.
- `mcp__atlassian__executeWrite` và `executeDestructive` bị chặn; `executeRead` và các tool đọc được cho qua.
- Tool có chữ `atlassian` của server khác (ví dụ `mcp__claude_ai_Atlassian__...`) bị chặn.
- Bốn tool ghi chỉ được chạm item của space dự án: `createJiraIssue` theo `projectKey`, ba tool còn lại theo key lấy từ `issueIdOrKey` (nhận cả URL của item). Id số bị chặn, vì không biết space. `cloudId` khác site của ánh xạ cũng bị chặn.
- Key của space nằm ở biến `AO_JIRA_SPACE`, khai báo trong mục `env` của `kit/.claude/settings.json` (giá trị mẫu `<KEY>`, dự án thay bằng key của mình). Chưa đặt, hoặc còn `<KEY>`, thì mọi lệnh ghi bị chặn. Đây là quyết định mới trong T14: spec không có chỗ khai báo space của dự án; mục 2.6 của spec đã ghi thêm.
- Không tìm thấy kit thì hook chỉ chặn những gì chạm tới Atlassian, để các tool khác vẫn chạy.

**`jira-rework`** (PostToolUse sau `transitionJiraIssue`; logic ở `reworkDecision`): đọc item và lịch sử bằng token của agent. Nếu lần chuyển cuối là rework (`request-changes`, `qa-fail`) và số lần rework đã chạm giới hạn trong `policies.yaml` (3), mà item chưa có label `needs-you`, hook trả `decision: "block"` kèm yêu cầu agent gắn Flagged, label `needs-you` và comment lý do qua Rovo MCP, rồi dừng. Chỉ xét khi lần chuyển cuối là rework, nên sau khi bạn gỡ label, agent làm tiếp được mà không bị nhắc lại cho tới lần rework kế tiếp. Không đọc được lịch sử thì hook nhắc agent kiểm số rework trước khi làm tiếp.

Chạy thử với Jira thật (2026-10-28): `jira-rework` trên `DEMO-2` không in gì, vì lần chuyển cuối là hủy, không phải rework.


## T15: Kiểm thật agent và hook trên `DEMO`

**Chuẩn bị.** Chép `contract/`, `lib/`, `tracker/` vào `ao-pilot/.ai-orchestrator/` (thêm `package.json` cài `ajv`, `yaml`; `node_modules` nằm trong `.gitignore`). Chép `kit/.claude/hooks/`, `kit/.claude/settings.json` (đặt `AO_JIRA_SPACE` là `DEMO`) và `.mcp.json`. Hai agent thử `.claude/agents/fe-dev.md` và `qa.md` chỉ có tool của server `atlassian`. Bạn mở `claude` tương tác trong `ao-pilot` một lần: tin cậy thư mục, cho phép server `atlassian`, `/mcp` báo connected. Các file này chưa commit vào `ao-pilot`.

**Cách chạy.** `claude -p` trong `ao-pilot`, model Sonnet, `--allowedTools` chỉ gồm các tool kịch bản cần. Token của agent được nạp từ registry vào biến môi trường của lệnh. Agent được gọi theo hai cách: `claude --agent fe-dev`, và phiên chính không có `--agent` gọi subagent `qa` bằng tool Agent.

| # | Ai gọi | Gọi gì | Kết quả |
|---|---|---|---|
| 1 | `fe-dev` (`--agent`) | `createJiraIssue` một Story trên `DEMO`, rồi `getJiraIssue`, `searchJiraIssuesUsingJql` | Tạo `DEMO-3`, người tạo `orchestratoragent`; đọc lại đúng; JQL ra 1 item |
| 2 | Phiên chính, không vai trò | `transitionJiraIssue` `Refine` trên `DEMO-3` | Bị chặn: `jira-guard: only an agent may move a Jira item; this call does not come from a subagent named after a role of the contract` |
| 3 | Subagent `qa` (tool Agent) | `transitionJiraIssue` `Accept` trên `DEMO-3` | Bị chặn: `jira-guard: qa may not make "Accept" on DEMO-3; it is for human` |
| 4 | Bạn, trên giao diện Jira | `Refine` trên `DEMO-3` | New → Ready |
| 5 | `fe-dev` | `Start` trên `DEMO-3` ở Ready; nhánh `feature/DEMO-3-t15-live-test` đã có trên `ao-pilot` | Lần đầu bị chặn sai, xem phát hiện 1. Sau PR #37 thì được: item sang In Progress |
| 6 | `fe-dev` | `editJiraIssue` trường Agent là `Frontend Developer` | Được |
| 7 | Chạy tay `jira-rework` với input của lần 5 | | Không in gì: `Start` không phải rework |
| 8 | Chạy tay `jira-guard`: `fe-dev` gọi `Start` lần nữa | | Bị chặn: `the contract has no transition "Start" from "In Progress" for a Story` |

Lịch sử `DEMO-3`, đọc qua REST bằng token của agent (thay cho ảnh chụp):

```
2026-10-28 10:24:50  orchestratoragent  tạo item (Story, New)
2026-10-28 10:35:42  bạn                status: New -> Ready
2026-10-28 10:42:13  orchestratoragent  status: Ready -> In Progress
2026-10-28 10:42:17  orchestratoragent  Agent: - -> Frontend Developer
```

**Tiêu chí 6, lớp thứ hai: gọi thẳng Rovo MCP, không qua hook.** Một script Node gọi `https://mcp.atlassian.com/v2/mcp` bằng token của agent, không qua Claude Code nên không có hook nào. Script tạo `DEMO-4` (Story, New), rồi thử hai transition của bạn:

| Gọi | Kết quả |
|---|---|
| `transitionName: Refine`, rồi `Cancel` | Rovo MCP báo `Transition "Refine" not found. Available: ` (danh sách rỗng); tương tự với `Cancel` |
| `transitionId: 2` (Refine), rồi `10` (Cancel từ New) | Jira trả 400 `TRANSITION_FAILED`: `Can't move (DEMO-4). You might not have permission, ...` |

`DEMO-4` vẫn ở New, lịch sử không có thay đổi status. Trên gói Free, rule Restrict chặn `orchestratoragent` cả khi agent đi vòng qua hook. Tiêu chí 6 đạt đủ.

Phát hiện:

1. **`jira-guard` không đọc được token GitHub với `gh` 2.16.** `gh auth status --show-token` in ra stderr cả khi thành công. Hook chỉ đọc stderr khi `gh` lỗi, nên không có token và bỏ qua mọi guard lấy từ GitHub: `Start` bị chặn vì thiếu `dependencies-merged` và `branch-created`. PR #37 sửa: `readGitHubToken` chuyển vào `lib/tracker/github-client.mjs`, đọc cả stdout lẫn stderr của `gh auth status`, có test. Lần chạy thật ở T13 chỉ thử các trường hợp bị chặn trước bước đọc GitHub, nên lỗi chưa lộ ra.
2. **Hook nhận được `agent_type` ở cả hai cách gọi agent**: `claude --agent fe-dev`, và subagent gọi qua tool Agent. Rủi ro "`agent_type` không có trong một số cách gọi agent" của plan không xảy ra với hai cách này.
3. **Trường Agent nhận tên hiển thị của vai trò** (`Frontend Developer`), không nhận id (`fe-dev`). `facts.mjs` đổi đúng như vậy khi đếm WIP, nhưng agent cũng phải biết: module `agent-roster` ghi tên này vào định nghĩa của từng agent. Hai agent thử đã có dòng đó. `editJiraIssue` nhận `additional_fields: { "customfield_10046": "Frontend Developer" }`.
4. **Phiên chính nạp tool MCP muộn (deferred).** Lần đầu, phiên chính gọi `transitionJiraIssue` khi chưa nạp schema, nên input rỗng (`{}`). Hook vẫn chặn, vì nó kiểm vai trò trước; lần chạy lại với input đủ bị chặn với cùng lý do. Subagent có danh sách tool riêng nên gọi đúng ngay lần đầu.
5. **Rovo MCP không đánh dấu lỗi khi Jira từ chối transition.** Kết quả có `error: "TRANSITION_FAILED"` trong `data`, nhưng `isError` không bật. Hook `jira-rework` vẫn chạy sau lệnh đó; nó chỉ xét lần chuyển status cuối trong lịch sử, nên không bị ảnh hưởng.
6. Giữ lại `DEMO-3` (In Progress, Agent là Frontend Developer, có nhánh `feature/DEMO-3-t15-live-test` trên `ao-pilot`): T18 có thể dùng nó cho kịch bản PR và CI. `DEMO-4` (New) là bằng chứng cho tiêu chí 6; bạn có thể Cancel nó.

Tiêu chí 4, 5 và 6 của spec mục 9 đạt.

## T16: Đối soát: chọn transition của `automation`

`lib/tracker/reconcile.mjs` có hai hàm. `planMoves` là hàm thuần: nhận state và các guard đang thỏa, trả các transition của `automation` sẽ thực hiện. `reconcile` đọc item, lịch sử và dữ kiện qua client, rồi gọi `planMoves`.

**Cách chọn** (`planMoves`):

- Lấy các transition của `automation` từ state hiện tại mà mọi guard đều thỏa (`allowedTransitions`, `checkTransition`). Chọn transition đầu tiên theo thứ tự trong hợp đồng.
- Không đi tiến nếu ngay sau đó có một rework của `automation` kéo item về. Ví dụ: PR đã xanh nhưng commit mới nhất vẫn có review yêu cầu sửa. Item ở In Progress thì không `submit`; item ở In Review thì `request-changes`. Thiếu quy tắc này, item sẽ lên rồi xuống ở mỗi lần chạy.
- Đi tiếp từ state mới cho tới khi không còn transition nào đi được, nên chạy lần hai không đổi gì.
- Báo cần gắn `flag-needs-you` khi số rework (đếm từ lịch sử, cộng các rework vừa chọn) đã chạm giới hạn trong `policies.yaml` mà item chưa có label `needs-you`. Cùng một điều kiện này lo cả rework vừa chạm giới hạn lẫn trường hợp agent quên gắn cờ (plan, quyết định 2).

**Kết quả của `reconcile`** (dùng ở T17), là danh sách việc theo thứ tự:

- `{ key, transition, name, from, to }`: một transition; `name` là tên trên Jira.
- `{ key, effect: "flag-needs-you", reworkCount }`: gắn Flagged, label `needs-you` và comment lý do.
- Epic ở state mà transition đi vào có effect `refine-children` (tức `in-progress`, sau `approve-plan`): thêm `refine` cho từng item con mà `automation` được `refine` và đạt `dor-met`. Bug con không được `refine`, vì `dor-met` của `automation` chỉ áp cho Story và Task (ghi chú của transition `refine`).

**Sửa guard `changes-requested` (T12).** Guard này chỉ còn tính review trên commit mới nhất của PR (`commit_id` trùng commit đầu PR). Dev push bản sửa là đã trả lời yêu cầu sửa; review yêu cầu sửa trên commit cũ không còn kéo item về. Thiếu điều kiện này, item sẽ kẹt ở In Progress sau mỗi lần sửa, vì review cũ luôn làm `submit` bị bỏ qua. Spec mục 2.8 đã ghi lại.

Ghi chú cho T17:

- `reconcile` nhận `approvers` (login GitHub của bạn, cho `merge-approved`) qua tham số. T17 quyết định khai báo nó ở đâu.
- `reconcile` đọc lịch sử item bằng `GET /issue/<key>/changelog` và tìm item con bằng JQL `parent = "<KEY>"`; token CI cần quyền đọc hai thứ này.

## T17: `jira-sync` và workflow GitHub Actions

`lib/tracker/sync.mjs` chứa logic; `scripts/jira-sync.mjs` chỉ đọc sự kiện và dựng client; `kit/.github/workflows/jira-sync.yml` là workflow cho repo dự án.

**Sự kiện → item** (`itemsOf`):

| Sự kiện | Item |
|---|---|
| `pull_request`, `pull_request_review` | Mã trong tên nhánh PR và trong tiêu đề PR |
| `workflow_run` (CI xong) | Mã trong `head_branch` |
| `deployment_status` thành công | Mọi item ở state mà một deployment có thể đẩy đi tiếp: các `from` của transition của `automation` cần `qa-deployed` (hiện là In Review), tìm bằng JQL. `reconcile` của từng item kiểm bản deploy có chứa merge commit, trên đúng môi trường QA của item không |
| `workflow_dispatch` | Mã ở input `item` |

Rồi `reconcile` từng item và thực hiện các thay đổi theo thứ tự. Lỗi ở một item hay một thay đổi không chặn các item khác; script thoát mã 1 khi có lỗi.

**Quyết định mới:**

1. **Chỉ chạm item trong space của dự án.** Mã ngoài space (ví dụ nhánh `feature/SCRUM-3-cart`, hay item con của Epic nằm ở space khác) bị bỏ qua. Lý do: gói Free không có permission scheme, nên token CI ghi được mọi space.
2. **Space và login GitHub của bạn** lấy từ `AO_JIRA_SPACE` và `AO_APPROVERS` trong mục `env` của `.claude/settings.json` của dự án; biến môi trường cùng tên được ưu tiên. Hook đọc space cũng từ file này, nên mỗi dự án khai báo một lần. `kit/.claude/settings.json` có `AO_APPROVERS: <github-login>`; giá trị mẫu dạng `<...>` coi như chưa đặt. Thiếu space thì script dừng; thiếu approver thì script cảnh báo, vì khi đó không item nào sang QA được.
3. **Cloud id lấy từ `tracker/jira.yaml`**, không cần biến `JIRA_CLOUD_ID` như spec ghi lúc đầu.
4. **Workflow chạy với mọi review**, không chỉ review yêu cầu sửa: một approve có thể cho item đã merge và deploy sang QA. Đối soát chạy thừa thì không đổi gì.
5. **Báo item đang chờ gì.** Với transition của `automation` mà đã có ít nhất một guard thỏa, `jira-sync` in các guard còn thiếu, ví dụ `Waiting DEMO-11: Deploy to QA needs merge-approved`. Tiêu chí của T18 cần dòng này.
6. **`flag-needs-you`**: đặt trường Flagged là `Impediment` (lựa chọn duy nhất của trường này), thêm label `needs-you` trong cùng một lệnh sửa, rồi comment lý do.

**Jira client ghi được** khi tạo với `write: true`: `transition(key, name)` tìm id theo tên trong các transition mà tài khoản của token được thấy trên item, `editItem`, `comment` (văn bản thành ADF). Client mặc định vẫn chỉ đọc; `--dry-run` tạo client chỉ đọc, nên không request ghi nào đi được.

**Workflow** (`kit/.github/workflows/jira-sync.yml`): các trigger ở spec mục 2.7; quyền GitHub chỉ đọc (contents, pull-requests, checks, statuses, deployments); chạy `npm ci --prefix .ai-orchestrator` rồi `node .ai-orchestrator/scripts/jira-sync.mjs` với secret `JIRA_CI_TOKEN` và `github.token`. Trigger `workflow_run` theo dõi workflow tên `CI` của dự án.

Kiểm tay (2026-10-28, `--dry-run`, token CI, Jira `DEMO` và repo `TungPH7/ao-pilot` thật):

| Sự kiện | Kết quả |
|---|---|
| `workflow_dispatch` với `DEMO-3` | `No change` |
| `pull_request` của nhánh `feature/DEMO-3-t15-live-test` | `Waiting DEMO-3: Submit needs pr-open, ci-green`, `No change` (chưa có PR) |
| `deployment_status` thành công lên `development` | `no work item of DEMO` (không item nào ở In Review) |
| `workflow_dispatch` với `SCRUM-1` | `no work item of DEMO` |

Token CI đọc được item, lịch sử và tìm bằng JQL. Quyền ghi của nó (transition, sửa item, comment, đọc danh sách field) được thử ở T18.

## T18: Kiểm thật trên `ao-pilot`

**Chuẩn bị (2026-10-28).** Commit `25339ea` trên `main` và `develop` của `ao-pilot`:

- Bản chép kit trong `.ai-orchestrator/`, thêm `scripts/jira-sync.mjs`.
- `.claude/` với `AO_JIRA_SPACE: DEMO` và `AO_APPROVERS: TungPH7`; `settings.local.json` nằm trong `.gitignore`.
- `.mcp.json`.
- Ba workflow: `jira-sync` của kit, `CI` (một test đọc `ci-state.txt`, bật đỏ hoặc xanh được), và `Deploy` giả (job có `environment:`; `develop` ra `development`, `release/*` ra `staging`, chạy tay ra môi trường bất kỳ).

Secret `JIRA_CI_TOKEN` được đặt bằng cách pipe từ registry vào `gh secret set`. Story thử là `DEMO-3`, nhánh `feature/DEMO-3-t15-live-test`, PR [#1](https://github.com/TungPH7/ao-pilot/pull/1).

Trước khi chạy, phát hiện và sửa một lỗi (PR #42): job `jira-sync` chạy theo `pull_request` nên là một check run trên commit đầu PR, và `ci-green` từng tính cả check đó. `facts.mjs` giờ bỏ qua check run tên `jira-sync`, và job trong workflow mang đúng tên này.

**Kết quả** (run nào cũng xanh; link là run của `jira-sync`):

| # | Việc | `jira-sync` in ra | Item |
|---|---|---|---|
| 0 | Push `develop`, `Deploy` lên `development` | [run](https://github.com/TungPH7/ao-pilot/actions/runs/40634945378): `deployment_status: no work item of DEMO` | — |
| 1 | Mở PR #1, CI xanh | [pull_request](https://github.com/TungPH7/ao-pilot/actions/runs/40635035625): `Made DEMO-3: Submit`; [workflow_run](https://github.com/TungPH7/ao-pilot/actions/runs/40635051573) sau đó: `No change` | In Progress → In Review, do `orchestratorci` |
| 2 | Push commit làm CI đỏ | [pull_request](https://github.com/TungPH7/ao-pilot/actions/runs/40635129384): `Made DEMO-3: Request changes`; [workflow_run](https://github.com/TungPH7/ao-pilot/actions/runs/40635147067): `Waiting DEMO-3: Submit needs ci-green` | In Review → In Progress, rework = 1 |
| 3 | Push commit làm CI xanh lại | [pull_request](https://github.com/TungPH7/ao-pilot/actions/runs/40635212289) (CI chưa xong): `Waiting DEMO-3: Submit needs ci-green`; [workflow_run](https://github.com/TungPH7/ao-pilot/actions/runs/40635232993): `Made DEMO-3: Submit` | In Progress → In Review |
| 4 | Merge PR #1 (chưa có approve của bạn), `Deploy` lên `development` | [deployment_status](https://github.com/TungPH7/ao-pilot/actions/runs/40635307855): `Waiting DEMO-3: Deploy to QA needs merge-approved`, `No change` | Đứng yên ở In Review |
| 5 | Cắt `release/0.1.0`, `Deploy` lên `staging` | [deployment_status](https://github.com/TungPH7/ao-pilot/actions/runs/40635410222): `Waiting DEMO-3: Deploy to QA needs merge-approved` | Đứng yên |
| 6 | Đưa `release/0.1.0` vào `main`, tag `v0.1.0`, chạy tay `Deploy` lên `production` | [deployment_status](https://github.com/TungPH7/ao-pilot/actions/runs/40635518290): `Waiting DEMO-3: Deploy to QA needs merge-approved` | Đứng yên |

Lịch sử `DEMO-3` sau T18, đọc qua REST:

```
2026-10-28 11:55:53  orchestratorci  status: In Progress -> In Review
2026-10-28 11:56:54  orchestratorci  status: In Review -> In Progress
2026-10-28 11:58:03  orchestratorci  status: In Progress -> In Review
```

Các deployment trên GitHub: `development` hai lần (`25339ea` lúc dựng, rồi merge commit `d013acc`), `staging` và `production` mỗi nơi một lần (`d013acc`).

Phát hiện:

1. **Deployment do job có `environment:` tạo ra vẫn kích hoạt workflow theo `deployment_status`**, dù job chạy bằng `GITHUB_TOKEN`. Mỗi deployment kích hoạt hai run: một cho status `in_progress` (`jira-sync` bỏ qua), một cho `success`. Pipeline deploy của `release-workflow` chỉ cần một job có `environment:`, không cần token riêng.
2. **Hai đường đến `Submit` đều chạy:** run của `pull_request` chuyển được ngay nếu CI xong trước (lần 1); nếu chưa thì run của `workflow_run` lo (lần 3). Các run thừa in `No change`.
3. **Token CI ghi được:** `orchestratorci` chuyển được `Submit` và `Request changes` qua REST, nên token có quyền ghi và rule Restrict của hai transition này cho tài khoản đó đi qua.
4. **API dev-status của Jira** (`/rest/dev-status/latest/issue/summary`) trả 401 "scope does not match" với cả token đọc của bạn lẫn token của agent, nên tiêu chí 8 kiểm trên giao diện.
5. `kit/.jira/config.yml` được thêm vào kit, có test kiểm file khớp các môi trường trong `tracker/jira.yaml`.

**Tiêu chí 8 (bạn xem trên Jira):** CHỜ.

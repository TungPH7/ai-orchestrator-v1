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

**Bạn làm:** dựng Jira theo `docs/jira-setup.md`, mục 1 đến 11. File checklist được sinh tự động nên không tick trong đó; tiến độ ghi ở bảng dưới.

| Mục | Trạng thái |
|---|---|
| 1. Group và service account | Xong, đã kiểm qua REST (2026-10-28): `ao-humans` có bạn, `ao-agents` có `orchestratoragent`, `ao-automation` có `orchestratorci` |
| 2. Rovo MCP | Xong ở T1 |
| 3. Resolution | Xong (2026-10-27). Site có hai resolution `Done` ("GreenHopper Managed Resolution", do Jira Software tạo); giữ cả hai |
| 4. Status | Xong (2026-10-27): 10 status mới và `In Progress` có sẵn, đúng tên và Category |
| 5. Workflow | Đang sửa (2026-10-28): status và đường đi của ba workflow đều đúng; 18 trong 24 transition thiếu rule (xem bảng dưới) |
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

**Kiểm thủ công bằng Story thử `DEMO-1` (2026-10-28):**

| Bước | Kết quả |
|---|---|
| Tạo Story, status ban đầu | Đạt: `New`, nằm ở Kanban backlog (ảnh `misc/images/phien-6-luot-28-anh-1.png` chụp lúc đã sang `Ready`) |
| `Refine` (`New` → `Ready`) do bạn chuyển | Đạt: lịch sử ghi `New` → `Ready` lúc 00:54, người chuyển là bạn |
| Ở `Ready`, bạn không thấy `Start` | Chưa kiểm: chưa có ảnh danh sách transition |
| `Cancel` (`Ready` → `Cancelled`) hỏi Resolution | **Không đạt:** lịch sử ghi `Ready` → `Cancelled` lúc 00:56, Resolution vẫn trống, và bạn không thấy hộp hỏi Resolution nào. Nguyên nhân: transition chưa có rule **Request input → Show a screen**. Checklist mục 5 đã thêm các bước này |
| Rule của transition `Cancel` (`Ready` → `Cancelled`) trong `AO standard` | **Thiếu cả rule Restrict:** khung **Rules** của transition này không có rule nào, cả bốn nhóm chỉ có nút **Add … rule** (ảnh `misc/images/phien-6-luot-30-anh-1.png`). Vậy agent cũng hủy được item ở `Ready`. Đã thêm đủ hai rule (ảnh `misc/images/phien-6-luot-31-anh-1.png`): Restrict `ao-humans` và **Show a screen** `Resolve Issue Screen`. Các transition khác chưa kiểm |

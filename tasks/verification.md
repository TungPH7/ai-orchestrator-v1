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

**Bạn làm:** dựng Jira theo `docs/jira-setup.md`, mục 1 đến 10. File checklist được sinh tự động nên không tick trong đó; tiến độ ghi ở bảng dưới.

| Mục | Trạng thái |
|---|---|
| 1. Group và service account | Đang làm |
| 2. Rovo MCP | Xong ở T1 |
| 3. Resolution | Xong (2026-10-27). Site có hai resolution `Done` ("GreenHopper Managed Resolution", do Jira Software tạo); giữ cả hai |
| 4. Status | Xong (2026-10-27): 10 status mới và `In Progress` có sẵn, đúng tên và Category |
| 5. Workflow | Chưa làm |
| 6. Workflow scheme | Chưa làm |
| 7. Trường | Chưa làm |
| 8. Space | Chưa làm |
| 9. Board | Chưa làm |
| 10. GitHub for Jira | Chưa làm |
| 11. Môi trường | Xong, Claude làm |

| Câu hỏi | Kết quả |
|---|---|
| Gói Free có rule "Restrict who can move a work item" theo group không | Chưa biết |
| Service account thêm được vào group không | Chưa biết |

# Kiểm thật: tracker-integration

> **Plan:** [plan.md](plan.md). Mỗi lần kiểm thật ghi ngày, bước đã làm và kết quả. Không ghi token.

## T1: Kết nối thật bằng hai service account

**Chuẩn bị (2026-10-27):**

- Site Jira đã về gói Free; hai service account `orchestratoragent` và `orchestratorci` đã có token, hết hạn ngày 2027-10-27.
- Repo private `TungPH7/ao-pilot` đã được tạo, có nhánh `main` và `develop`.
- `kit/.mcp.json` nối server `atlassian` tới `https://mcp.atlassian.com/v2/mcp` bằng header `Bearer ${ATLASSIAN_AGENT_TOKEN}`.

**Đang chờ bạn:** bật API token cho Rovo MCP, và đặt hai biến môi trường `ATLASSIAN_AGENT_TOKEN`, `JIRA_CI_TOKEN`.

| Phép thử | Kết quả |
|---|---|
| `curl -I https://mcp.atlassian.com/v2/mcp` với token của agent | Chưa chạy |
| Claude Code trong `ao-pilot` gọi tool Jira của Rovo MCP bằng `orchestratoragent` | Chưa chạy |
| `GET /rest/api/3/myself` qua `api.atlassian.com/ex/jira/<cloud-id>` với token CI | Chưa chạy |

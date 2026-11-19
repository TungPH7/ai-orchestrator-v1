# Kiểm: C1

> **Plan:** [plan.md](plan.md). **Todo:** [todo.md](todo.md). File này ghi kết quả từng task cần kiểm thật, và cuối module là 11 tiêu chí của spec mục 12.

## T2: ba tiền đề (2026-11-19, Phiên 33 · Lượt 88)

**Cách chạy:** ở `ao-pilot`, với `AO_KIT_DIR` trỏ tới kit, một file agent tạm `.claude/agents/seo-probe.md` có đúng công cụ dự kiến của `seo`: Read, Glob, Grep, Edit, Write, WebFetch, WebSearch và bốn tool Jira đọc, comment của MCP `atlassian`. Không có Bash. Lượt chạy là `claude --agent seo-probe -p … --output-format stream-json`, không người trông, như `ao-agent.mjs` mở.

| Tiền đề | Kết quả |
|---|---|
| 1. WebSearch và WebFetch chạy được trong lượt không người trông | **Đạt.** Phiên chạy ở `permissionMode: auto`. WebSearch trả kết quả cho "nextjs generateMetadata"; WebFetch đọc được trang `generate-metadata` của nextjs.org. |
| 2. Agent không có Bash đọc và comment được trên Jira; hook không chặn nhầm | **Đạt.** `getJiraIssue` đọc DEMO-25; `addOrEditJiraIssueComment` thêm comment 10603 lên DEMO-25. `block-atlassian` cho qua cả hai. gh-guard chưa có luật cho `seo` (role chưa có trong contract), nên luật theo role được kiểm bằng test ở T15. |
| 3. Agent Field có giá trị "SEO Specialist" | **Dời sang T15.** `npm run jira:check` so danh sách option của field với contract, đúng thứ tự (`lib/tracker/drift.mjs`). Thêm option trước khi contract có role `seo` thì lệnh kiểm báo lệch. Bạn bấm thêm option khi T15 merge. |

**Thêm một điều thấy được:** lượt chạy đọc thử `.env` ở gốc `ao-pilot`. Lệnh Read không bị hook từ chối; nó chỉ báo "File does not exist" vì `ao-pilot` không có file này. Điều này khớp với rủi ro 2 của spec mục 6.4: hiện chưa có gì chặn agent đọc `.env`.

**Chi phí:** 0,17 USD, 6 lượt model (Sonnet).

**Dọn dẹp:**
- Đã xóa file agent tạm. `ao-pilot` không còn file nào đổi.
- Comment 10603 trên DEMO-25 còn lại. Token CI không có quyền xóa comment của tài khoản agent ("You do not have permission to delete comment with id: 10603"). DEMO-25 là Bug thử đã Cancelled, và comment ghi "Bỏ qua comment này". Bạn có thể xóa nó trên Jira nếu muốn.

**Kết luận:** spec không phải sửa. Checkpoint 1 đạt.

## T3–T4: dời thứ tự chạy vào contract (2026-11-19, Lượt 88)

**Cách so** (plan, quyết định 4):
1. Trước khi sửa code, một bộ ghi tạm trong `decideStep` ghi mọi lần gọi của `npm test`: 448 lần, cho 13 lệnh (spec 147, build 51, fix 44, review 38, preview 36, qa 32, plan 29, ship 26, release 14, status 13, request 10, rollback 6, intake 2).
2. Code cũ chạy lại 448 lần gọi đó, hai lần: hai kết quả giống hệt nhau, nên quyết định không phụ thuộc giờ chạy.
3. Bộ test chỉ dùng một contract, đúng contract của repo. Contract mới khác contract cũ đúng ở khóa `runs`, nên lần chạy lại sau khi sửa dùng contract mới.
4. Code mới chạy lại 448 lần gọi, so từng quyết định với mốc.

**Kết quả:** 0 khác biệt. Cả bộ test xanh (1.605 test), cùng `validate`, `render:check`, `jira:checklist:check`, `agents:check`. Bộ ghi tạm đã gỡ khỏi `steps.mjs` trước khi commit.

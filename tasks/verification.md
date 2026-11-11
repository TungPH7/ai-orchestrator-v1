# Kiểm chứng: human-loop

## T2: bốn tiền đề, 2026-11-11

Kiểm trên `ao-sample` và space `SMP`, trước khi viết code (spec mục 10.2). Cả bốn đạt; tiền đề 3 cần xin thêm một quyền mà App đã có.

| # | Tiền đề | Cách kiểm | Kết quả |
|---|---|---|---|
| 1 | Phiên chính tạo được Epic bằng `createJiraIssue`, mô tả markdown hiện đúng | `claude -p` (Sonnet) trong `ao-sample`, `--mcp-config .mcp.json`, hook của dự án bật. Đọc lại bằng REST với token agent | Đạt. `SMP-20` là Epic ở New, người tạo `orchestratoragent`. Mô tả lên Jira đúng các node ADF heading, bulletList, table; không hook nào từ chối |
| 2 | `editJiraIssue` đổi được Task thành Story | Cùng phiên: tạo Task `SMP-21`, rồi `editJiraIssue` với `fields: { issuetype: { name: "Story" } }` | Đạt. `SMP-21` là Story ở New. Không cần đọc id của loại item |
| 3 | Token `ao-dev` chuyển PR nháp sang sẵn sàng; `ready_for_review` chạy `jira-sync` | Nhánh `probe/ready-for-review` và PR nháp `ao-sample` #19, tạo bằng login `gh` của bạn. Script gọi mutation `markPullRequestReadyForReview` bằng token cài đặt của `ao-dev` | Đạt, với điều kiện token xin cả `pull_requests: write` và `contents: write`. Chỉ xin `pull_requests: write` thì GitHub trả `FORBIDDEN: Resource not accessible by integration`. `ao-dev` đã có cả hai quyền, nên không phải thêm quyền cho App. `jira-sync` chạy hai lần, một lần khi mở PR và một lần khi PR chuyển sang sẵn sàng. PR #19 đã đóng, nhánh đã xóa, và lượt CI đang chạy bị hủy |
| 4 | `killTree` tắt hết tiến trình con của dev server trên Windows | `npm run dev` của `ao-sample` (web `:3000`, api `:3001`) chạy tách ra (`detached`, `shell`, `CLEARED_ENV`), rồi `killTree` | Đạt. Hai app sẵn sàng sau 41 giây. Sau `taskkill /T /F` và 4 giây chờ, không còn tiến trình nào nghe ở `:3000` hay `:3001` |

**Chi phí:** 0,15 USD cho phiên `claude -p` ở tiền đề 1–2.

**Ghi chú cho lúc làm:**
- T10: token cho bước chuyển PR sang sẵn sàng xin `{ pull_requests: 'write', contents: 'write' }`. Spec mục 4.6 đã ghi điều này.
- T14: Node 24 cảnh báo `DEP0190` khi `spawn` có `shell: true` mà vẫn truyền mảng đối số. `command` trong `preview.yaml` vốn là một chuỗi, nên `ao-step` truyền nguyên chuỗi đó, không kèm mảng.
- Bạn đã hủy hai item thử `SMP-20` và `SMP-21` (Lượt 122).

## Checkpoint 3: `/ao-preview` chạy thật trên `ao-sample`, 2026-11-11

Chạy trước T15, không gọi agent, bằng kit trên nhánh `task/human-loop-part-2` (`AO_KIT_DIR`). Item thử là `SMP-21` (đã hủy), với nhánh `feature/SMP-21-preview-probe` và PR nháp `ao-sample` #20 tạo bằng login `gh` của bạn. `preview.yaml` chỉ nằm trên máy, không commit.

| Bước | Kết quả |
|---|---|
| `ao-step.mjs preview SMP-21` | GO: một bước script `preview-start`; báo sẽ chạy `npm ci`, vì chưa có hash lockfile nào |
| `--go` | Thư mục chuyển sang nhánh PR, `npm ci --ignore-scripts` chạy, `api` và `web` lên. `http://localhost:3001/health` và `http://localhost:3000/notes` trả 200. Lệnh dừng với "the preview of SMP-21 runs already" kèm hai URL |
| `ao-step.mjs review 20` trong lúc xem trước | Tự dừng preview ("Stopped the preview of SMP-21: api, web"), đưa thư mục về `develop`, rồi chạy lại từ `develop` và in GO với bước đầu `pr-ready`. Hai cổng 3000 và 3001 trống |

PR #20 đã đóng, nhánh đã xóa, lượt CI đang chạy bị hủy.

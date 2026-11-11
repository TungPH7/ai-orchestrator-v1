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

## T19: chép kit vào `ao-sample`, 2026-11-11

Task `SMP-22`, nhánh `feature/SMP-22-kit-copy`, PR nháp `ao-sample` #21. Kit chép ba lần: `b1aa592`…`9f19521`, rồi `8df2666`, rồi `c6fdfa8`.

| Bước | Kết quả |
|---|---|
| `ao-pr create` | Mở PR nháp, như mục 4.1 của spec. `SMP-22` vẫn sang In Review ngay, vì `jira-sync` trên `develop` lúc đó còn là bản kit cũ, chưa bỏ qua PR nháp |
| CI lần đầu | Job `sast` chặn `spawn(..., { shell: true })` của `/ao-preview` (Semgrep `spawn-shell-true`). Sửa ở kit #244: lệnh của `preview.yaml` chỉ là `npm` hoặc `node` cùng các từ thường, chạy không qua shell |
| `/ao-review 21`, vòng 1, head `085b5c9` | Bước `pr-ready` chạy thật: PR thôi là nháp, rồi `reviewer` chạy tiếp ngay trong lệnh. Kết quả REQUEST_CHANGES: `reviewer` 1 High, 5 Medium, 5 Low; `security` 1 High, 2 Medium, 2 Low. 13,29 USD. Sửa hết ở kit #245 |
| `/ao-review 21`, vòng 2, head `313c4e0` | `reviewer` đọc toàn PR, `security` chỉ 147 dòng mới, ở mức `max`. Mỗi lượt chạm giới hạn usage 5 giờ một lần, và chạy tiếp đúng session của nó khi chạy lại lệnh. Hai báo cáo COMMENTED, không còn Critical hay High |
| Gate ③, merge | Bạn approve và tự merge (`518ec40`), vì PR sửa đường dẫn được bảo vệ |
| `/ao-qa SMP-22` | PASS trên Development, 0,87 USD. Lần E2E đầu lỗi 3 test API vì máy QA không phân giải được tên miền Development; chạy lại 33/33. Hook `gh-guard` chặn một lệnh có tên biến mật khẩu basic auth |
| Accept | `SMP-22` Done |

- **Chi phí:** 22,99 USD cho `SMP-22`, vượt mức ước 10–16 USD vì review hai vòng.
- **Còn lại, không chặn:** Medium của `reviewer` (khi `startPreview` lỗi, package của PR còn trong thư mục và bản ghi xem trước có thể mất); Medium của `security` (bước chặn file chỉ dẫn đọc `pr.files`, mà GitHub dừng ở 3000 file); các Low: `fromFork` sai khi fork đã bị xóa, `HKCUEnvironment` thiếu dấu `\` trong skill `ao-preview`, code preview chưa tách khỏi `ao-step.mjs`.
- **Monitor báo sai "ended":** `ao-step` chỉ lấy khóa `active.json` sau khi đọc xong Jira và GitHub, nên lần kiểm đầu thấy không có tiến trình. Script theo dõi giờ chờ 60 giây trước lần kiểm đầu.

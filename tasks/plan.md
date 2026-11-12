# Plan triển khai: live-run-fixes

> **Spec:** [SPEC-live-run-fixes.md](../SPEC-live-run-fixes.md), đã duyệt 2026-11-12 (Phiên 27 · Lượt 149). **Trạng thái:** chờ duyệt. **Danh sách task:** [todo.md](todo.md).

## Tổng quan

Module vá các lỗi kit mà lần chạy thật của human-loop tìm ra. Việc chia ba phần, theo chỗ code bị chạm:
- **Phần 1, sửa nhỏ:** dòng `Next:` sau `QA fail` (2.4), bằng chứng QA (2.5), `fromFork` (2.8), đường dẫn được bảo vệ không phân biệt hoa thường (2.9).
- **Phần 2, xem trước:** tách phần chạy preview khỏi `ao-step.mjs`, rồi sửa 2.6, 2.7 và phần còn lại của 2.8. Phần này kết thúc bằng một lần kiểm thật `/ao-preview` trên `ao-sample`, không tốn tiền.
- **Phần 3, lượt chạy:** cất và áp lại phần làm dở (2.1); chạy các yêu cầu do lượt đổi tài liệu ghi (2.2).

Không task nào gọi agent trả tiền.

## Quyết định kiến trúc

1. **Mỗi phần một nhánh và một PR, mỗi task một commit.** Nhánh `task/live-run-fixes-part-<N>` tách từ `main`. Mình tự merge khi CI xanh, như các PR kit trước. Phần 2 đi trước phần 3, vì phần 3 sửa `ao-step.mjs` sau khi phần 2 đã làm file này nhỏ lại.
2. **Hàm quyết định thuần, hiệu ứng truyền vào.** Hai module mới:
   - `lib/workflow/wip.mjs`: cất và áp lại phần dở, nhận `git` làm tham số;
   - `lib/workflow/preview-run.mjs`: phần chạy preview, nhận git, npm, spawn, fs, cách thử cổng và URL làm tham số.

   Mỗi module có test với hiệu ứng giả. `wip.mjs` có thêm test trên một repo git tạm thật, vì hành vi của stash là điều cần kiểm.
3. **Stash chỉ theo SHA** (2.1):
   - Cất: `git stash push --include-untracked -m "ao-step <KEY> run <n> <role>"`. Ngay sau đó, SHA lấy từ `refs/stash`, và tiêu đề commit của nó phải khớp nhãn; không khớp thì báo, không ghi `wip`.
   - Chỉ cất khi thư mục đang ở một nhánh không được bảo vệ, tức nhánh của item. Lượt review và `qa` chạy trong worktree, thư mục ở nhánh gốc, nên không bao giờ cất.
   - `.ai/` bị git bỏ qua, nên ledger và các file của lượt chạy không vào stash.
   - Xóa: `git stash drop` chỉ nhận dạng `stash@{n}`. Vì vậy `ao-step` tìm `n` theo SHA trong `git stash list`, xóa, rồi so SHA trong dòng `Dropped … (<sha>)`. Lệch thì cất lại entry vừa xóa bằng `git stash store`, rồi dừng.
4. **`runGo` nhận hiệu ứng `wip: { save, restore }`:**
   - `save` chạy khi lượt kết thúc `usage-limit` hay `unfinished`, và ghi `wip` vào bản ghi của lượt;
   - `restore` chạy trước một lượt chạy tiếp mà bản ghi cũ có `wip`, sau bước checkout. Áp không được thì lệnh dừng, không chạy agent.
5. **Yêu cầu của lượt đổi tài liệu (2.2) không cần đọc thêm Jira:** `facts.epic` đã có `requests`. Một hàm thuần trong `steps.mjs` chọn các yêu cầu tới `ba`, `ux`, `sa` trên item hoặc Epic, viết sau lúc bắt đầu lượt đổi tài liệu, cũ trước. Mỗi yêu cầu thành một lượt `request`. Lượt này có key của item, để vào `state.json` của item, còn prompt nêu item hay Epic nơi có comment.
6. **`after` của `runGo` nhận cả `startedAt` của lượt** (2.5). Hiện nó nhận lượt đã quyết, chưa có thời điểm bắt đầu.
7. **File lái phiên của `/ao-preview`:** một hàm mới `isSteeringPath` trong `review-tree.mjs`, gồm `isInstructionPath` và các tên mới của 2.7. Việc xóa file chỉ dẫn khỏi worktree của review giữ nguyên.
8. **Kiểm danh sách file trước khi switch** (2.7). Sau `git fetch`, `startPreview` kiểm `origin/<branch>` đúng head đã kiểm, rồi chạy `git diff --name-only --no-renames origin/develop <head>`. `--no-renames` cho file đổi tên hiện cả tên cũ lẫn tên mới. Kiểm xong mới switch, nên một lần từ chối không phải dọn gì.
9. **File chỉ dẫn chưa track** (2.8): danh sách lấy bằng `git status --porcelain -z --ignored=matching --untracked-files=all`, lọc qua `isSteeringPath`. Một thư mục bị bỏ qua cả cụm như `node_modules/` chỉ hiện một dòng.
10. **`protectedPaths` so không phân biệt hoa thường** (2.9). Đổi ở một chỗ này là đủ cho `merge-gate`, `audit`, dòng "merge it yourself" của `/ao-review` và phạm vi review của `security`. Thông điệp ở `merge-gate.mjs:116` cũng tìm glob theo cách đó.

## Task

| Task | Nội dung | Phần, nhánh |
|---|---|---|
| T1 | Spec duyệt, plan, todo, nhật ký; comment trên `SMP-19` | PR tài liệu |
| T2 | `nextFor` nhận PR (2.4) | Phần 1 |
| T3 | Bằng chứng QA: chỉ file mới (2.5) | Phần 1 |
| T4 | `fromFork` khi fork đã bị xóa (2.8) | Phần 1 |
| T5 | Đường dẫn được bảo vệ không phân biệt hoa thường (2.9) | Phần 1 |
| T6 | Tài liệu phần 1; PR phần 1 | Phần 1 |
| T7 | Tách `preview-run.mjs`, test hành vi hiện có | Phần 2 |
| T8 | Lỗi khi bật xem trước đi qua `stopPreview` (2.6) | Phần 2 |
| T9 | Danh sách file của PR; file lái phiên mới (2.7) | Phần 2 |
| T10 | Cảnh báo file chỉ dẫn chưa track; skill `ao-preview` (2.8) | Phần 2 |
| T11 | Kiểm thật `/ao-preview` trên `ao-sample` | Phần 2, không có code |
| T12 | Tài liệu phần 2; PR phần 2 | Phần 2 |
| T13 | `wip.mjs` (2.1) | Phần 3 |
| T14 | `runGo` và `ao-step` cất, áp lại phần dở; câu dừng của `checkoutStop` (2.1) | Phần 3 |
| T15 | `/ao-fix` chạy yêu cầu do lượt đổi tài liệu ghi (2.2) | Phần 3 |
| T16 | Lần làm lại chạy các yêu cầu đó; prompt `request` chỉ trên Jira (2.2) | Phần 3 |
| T17 | Tài liệu phần 3; PR phần 3 | Phần 3 |
| T18 | Đóng module: `verification.md`, lưu plan, `SPEC.md`, `concerns.md`, memory | PR tài liệu |

**Checkpoint:**
- **Checkpoint 1**, sau T6: PR phần 1 merge, năm lệnh kiểm xanh.
- **Checkpoint 2**, sau T12: kiểm thật `/ao-preview` đạt (tiêu chí 3 của spec), PR phần 2 merge.
- **Checkpoint 3**, sau T17: PR phần 3 merge. Mình báo bạn trước T18.

## Chi phí

0 USD: không task nào gọi agent trả tiền. T11 chỉ chạy `ao-step` và các app của `ao-sample` trên máy.

## Rủi ro

| Rủi ro | Mức | Cách xử lý |
|---|---|---|
| Tách `preview-run.mjs` làm đổi hành vi, vì phần này chưa có test | Trung bình | T7 chỉ dời code và viết test cho hành vi hiện có; sửa lỗi để T8 trở đi. T11 kiểm thật trước khi merge |
| `git stash push` lỗi trên Windows, vì một tiến trình con của agent còn giữ file | Thấp | Cất lỗi thì `ao-step` báo lý do và cách cất bằng tay, không ghi `wip`. `agent-process` đã tắt cây tiến trình của agent trước đó |
| Hai lệnh cất stash cùng lúc từ hai worktree của một repo | Thấp | Kiểm nhãn khi lấy SHA; so SHA khi xóa, lệch thì cất lại (quyết định 3) |
| Lượt `request` trên nhánh PR làm CI chạy lại giữa lượt đổi tài liệu và dev agent | Thấp | `runGo` đã chờ CI sau mỗi lượt có thể push |
| Đổi tham số của `nextFor` làm sai một chỗ gọi | Thấp | Đổi mọi chỗ gọi trong cùng commit; test cũ của `nextFor` được viết lại theo tham số mới |
| `git status --ignored` chậm ở repo lớn | Thấp | Chỉ chạy lúc bật và tắt xem trước; thư mục bị bỏ qua chỉ hiện một dòng |

## Câu hỏi mở

Một điểm cần bạn đồng ý: comment trên `SMP-19` (câu 3 của spec). Mình viết comment bằng `JIRA_CI_TOKEN`, token của CI, nội dung:

> Thứ tự ghim của các ghi chú lấy theo Rules 1 và 4 trong SPEC của Epic `SMP-23`, không theo quyết định 3 của `plan.md`. Plan và design của `SMP-23` còn tả thứ tự cũ, và chỉ có AC1–AC11.

Nếu bạn muốn comment đứng tên bạn, mình đưa từng bước để bạn dán.

**Nút Complete trên `SMP-23` chưa bấm được.** `/ao-status SMP-23` báo `its items move on`: `SMP-24` đã Done, nhưng chưa nằm trong bản phát hành nào trên Production, mà luật `complete` cần điều đó. Bạn bấm Complete khi một bản phát hành có `SMP-24` lên Production. Việc này nằm ngoài module.

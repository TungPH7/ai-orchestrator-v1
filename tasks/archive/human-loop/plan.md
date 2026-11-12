# Plan triển khai: human-loop

> **Spec:** [SPEC-human-loop.md](../../../SPEC-human-loop.md), đã duyệt 2026-11-11 (Phiên 27 · Lượt 120). **Trạng thái:** đã duyệt 2026-11-11 (Phiên 27 · Lượt 121). **Danh sách task:** [todo.md](todo.md).

## Tổng quan

Module thêm các chỗ bạn lái agent giữa chừng, chia ba phần theo mục 2 của spec:
- **Phần 1 (A3):** intake, sửa SPEC và plan trước cổng, `/ao-request`.
- **Phần 2 (A4):** PR nháp, xem trước, `/ao-fix` theo `be:` / `fe:` và `--change`, `/ao-review` chuyển PR sang sẵn sàng.
- **Phần 3 (A5):** `/ao-qa … fail:`, `/ao-build` sau `QA fail`.

Trước khi viết code, task đầu kiểm bốn tiền đề của spec. Cuối module, một lượt kiểm thật trên `ao-sample` đi trọn vòng.

## Quyết định kiến trúc

1. **Mỗi phần một nhánh và một PR, mỗi task một commit.** Nhánh `task/human-loop-part-<N>` tách từ `main`. Như vậy kit trên `main` không bao giờ ở nửa chừng một phần: ví dụ không có lúc PR đã thành nháp mà `/ao-review` chưa biết chuyển sang sẵn sàng (spec mục 2). Mình tự merge khi CI xanh, như các PR kit trước.
2. **Hàm quyết định thuần, script mỏng,** như các module trước. Có hai module thuần mới:
   - `lib/workflow/notes.mjs` tách tiền tố `be:` / `fe:`;
   - `lib/workflow/preview.mjs` đọc `preview.yaml`, so hash lockfile và kiểm điều kiện xem trước.

   Mọi việc chạm tiến trình, git và mạng nằm trong `scripts/ao-step.mjs`.
3. **Dùng lại cơ chế có sẵn, không viết mới:**
   - `openRequests` cho `/ao-request`;
   - `noteKey` và cách `decideFix` nhận ra note đã xong, gom thành một hàm dùng chung cho `/ao-spec`, `/ao-plan`, `/ao-fix` và `/ao-qa`;
   - `prepareCheckout` để chuyển nhánh;
   - `killTree` để tắt app;
   - `CLEARED_ENV` để bỏ biến bí mật.
4. **Đánh dấu PR sẵn sàng là một `action` của `decideReview`,** như `kit-copy-reports`. Hiện `runGo` dừng vòng chạy sau mỗi `action`. Vì vậy `action` này mang cờ `continue`: `runGo` đọc lại facts rồi chạy tiếp các lượt review trong cùng lệnh. Test khẳng định `kit-copy-reports` vẫn dừng như cũ.
5. **GraphQL qua `fetch` riêng,** không qua `createGitHubClient`, vì client đó gắn đường dẫn `/repos/<repo>`. Hàm nhận token của `ao-dev` với quyền `pull_requests: write`, và chỉ gọi một mutation.
6. **Xem trước:**
   - app chạy tách khỏi `ao-step` (`detached`), ghi log ra file;
   - pid nằm trong `.ai/preview/active.json`;
   - lệnh khác thấy file này thì tắt app, về `develop`, rồi chạy lại chính `ao-step` bằng `spawnSync(process.execPath, [<kit>/scripts/ao-step.mjs, ...args], { stdio: 'inherit' })`, và thoát với mã của lần chạy đó.
7. **`--change` là một từ cố định,** được kiểm ở `checkArgument`. Skill chỉ ghép từ đó vào lệnh `--go`; chữ của bạn vẫn đi qua `note.md`.
8. **Sau `QA fail`:**
   - `facts` đọc thêm `qaReport` (kết quả và thời điểm của báo cáo QA mới nhất), `nextBranch` (nhánh `-r<N+1>` của PR mới nhất) và `mergedAt` của PR;
   - `decideBuild` xét lần làm lại sau `QA fail` trước nhánh `again`;
   - `spec-sync` dựa vào state của lượt chạy: có lượt `ba` `ac-revise` xong sau `mergedAt`, và chưa có lượt `spec-sync` nào sau đó.

## Task

| Task | Nội dung | Phần, nhánh |
|---|---|---|
| T1 | Spec duyệt, plan, todo, nhật ký | PR tài liệu |
| T2 | **[bạn]** Bốn tiền đề trên `ao-sample` | không có code |
| T3 | `/ao-request`; `/ao-spec`, `/ao-plan` chạy yêu cầu trên Epic | Phần 1 |
| T4 | `/ao-spec <EPIC> <sửa>`, `/ao-plan <EPIC> <sửa>` | Phần 1 |
| T5 | `templates/epic.md`, artifact `epic`, chép `idea-refine` | Phần 1 |
| T6 | `/ao-intake` | Phần 1 |
| T7 | Tài liệu phần 1; PR phần 1 | Phần 1 |
| T8 | PR nháp: `ao-pr create`, guard `pr-open` | Phần 2 |
| T9 | `/ao-build` dừng chờ xem trước; bằng chứng xem trước; `/ao-status` với PR nháp | Phần 2 |
| T10 | `/ao-review` chuyển PR sang sẵn sàng (GraphQL, `continue` trong `runGo`) | Phần 2 |
| T11 | `notes.mjs`; `/ao-fix` trên PR nháp chỉ chạy dev; giao việc theo tiền tố | Phần 2 |
| T12 | `--change none\|ac\|api\|epic\|story` | Phần 2 |
| T13 | `preview.mjs`, `decidePreview`, `preview.yaml` | Phần 2 |
| T14 | `/ao-preview --go` và `--stop`; tự dừng xem trước và chạy lại từ `develop` | Phần 2 |
| T15 | Tài liệu phần 2; PR phần 2 | Phần 2 |
| T16 | `/ao-qa <KEY> fail:` | Phần 3 |
| T17 | `/ao-build` sau `QA fail` | Phần 3 |
| T18 | Tài liệu phần 3; PR phần 3 | Phần 3 |
| T19 | **[bạn]** Chép kit (kèm A1) vào `ao-sample`, review đầy đủ, bạn merge | `ao-sample` |
| T20 | **[bạn]** Kiểm thật trọn vòng (spec mục 10.3) | `ao-sample` |
| T21 | Đóng module: `verification.md`, lưu plan, cập nhật `SPEC.md`, `concerns.md`, memory | PR tài liệu |

**Checkpoint:**
- **Checkpoint 1**, sau T2: bốn tiền đề. Tiền đề nào sai thì mình sửa spec, và bạn duyệt bản sửa trước T3.
- **Checkpoint 2**, sau T7: PR phần 1 merge, năm lệnh kiểm xanh.
- **Checkpoint 3**, sau T15: PR phần 2 merge. Mình chạy thử `/ao-preview` trên bản sao `ao-sample` ở máy, không gọi agent.
- **Checkpoint 4**, sau T18: PR phần 3 merge. Mình hỏi bạn trước T19, vì từ đây bắt đầu tốn tiền.

## Chi phí

| Task | USD [Ước] |
|---|---|
| T1, T3–T18, T21 | 0: không gọi agent trả tiền |
| T2 | Dưới 1: vài lệnh gọi MCP trong một phiên `claude -p` ở `ao-sample` |
| T19 | 10–16: review đầy đủ PR chép kit, `security` ở `max` (kit PR #24 của `ao-pilot` tốn 15,59) |
| T20 | 25–35: một Epic nhỏ đi trọn vòng, có một lần `QA fail` |

## Rủi ro

| Rủi ro | Mức | Cách xử lý |
|---|---|---|
| Một tiền đề ở T2 sai, ví dụ MCP không đổi được Task thành Story | Trung bình | Kiểm trước khi viết code; spec đã có đường lui cho tiền đề 2 |
| `next dev` hay `nest start --watch` để lại tiến trình con trên Windows sau `taskkill /T` | Trung bình | Tiền đề 4. `--stop` kiểm lại cổng sau khi tắt, và báo pid còn sống |
| Thêm cờ `continue` vào `runGo` làm đổi hành vi của `kit-copy-reports` hay `release-cut` | Thấp | Test cho từng `action` hiện có |
| Lượt chạy lại sau khi tự dừng xem trước gặp đúng lỗi cũ và chạy lại mãi | Thấp | Lượt chạy lại mang biến môi trường đánh dấu; thấy dấu đó mà vẫn còn `active.json` thì dừng |
| Prompt mới làm agent hành xử khác ở các lệnh cũ | Trung bình | Chỉ thêm mục mới vào prompt, không sửa mục cũ. T20 chạy lại đủ các lệnh cũ |
| Kiểm thật vượt ngân sách | Trung bình | Mỗi lượt có số đo; mình báo khi tổng vượt 35 USD |

## Câu hỏi mở

Không có. T2 cần bạn hủy các item thử trên Jira (mỗi item một cú bấm `Cancel`); mình sẽ ghi từng bước bấm khi tới đó.

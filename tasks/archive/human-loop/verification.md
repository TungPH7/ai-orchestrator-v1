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

## T20: kiểm thật trọn vòng, 2026-11-11 đến 2026-11-12

Kit `c6fdfa8` qua `AO_KIT_DIR` (worktree `ao-kit-run`), dự án `ao-sample`, space `SMP`. Epic thử `SMP-23` "Ghim ghi chú lên đầu danh sách", Story `SMP-24` "Ghim và bỏ ghim" với Sub-task BE `SMP-25` và FE `SMP-26`. Mọi cú bấm ở cổng là của bạn; mọi câu trả lời và yêu cầu sửa của bạn đi vào `answers.md` hay `note.md` nguyên văn, sau khi bạn duyệt.

### Chặng 1: intake, spec, gate ①

| Bước | Kết quả |
|---|---|
| Intake | Phiên chính hỏi 3 câu (giới hạn 3 ghi chú ghim; lưu trạng thái ở API; phạm vi), viết bản nháp theo template Epic ở `.ai/intake/`, bạn duyệt, rồi tạo `SMP-23` bằng `createJiraIssue`. 0,14 USD |
| `/ao-spec SMP-23` | `ba` viết SPEC và hỏi 4 câu; bạn trả lời "ok cả 4" qua `--answers`. `ux` vẽ S1 và hỏi 8 câu; "Ok cả 8". `ux` comment `Cần ba:` để thêm hai câu cho trình đọc màn hình, và lệnh tự gọi `ba` lượt `request` ngay trong giai đoạn. `sa` không chạy `spec-nfr` vì SPEC đã có mục NFR. `ba` mở PR tài liệu #22 |
| `/ao-spec SMP-23` với yêu cầu sửa | `--note` "gộp ba Story thành một": `ba` lượt `spec-revise` gộp Story, giữ AC1–AC11, rồi comment `Cần ux:`; lệnh tự gọi `ux` lượt `request` sửa cột User story của `design.md` |
| Gate ① | Bạn bấm Approve spec |

### Chặng 2: plan, gate ②

| Bước | Kết quả |
|---|---|
| `/ao-plan SMP-23` | `sa` viết plan và ADR-0003, ADR-0004 (3,74 USD, 15,6 phút). `ba` lượt `plan-items` chạm giới hạn 5 giờ, chạy tiếp đúng session khi chạy lại lệnh, rồi tạo Story `SMP-24` cùng hai Sub-task |
| `/ao-plan SMP-23` với yêu cầu sửa | `--note` chuyển E2E AC11 và `pin-helpers.ts` sang Sub-task FE: `sa` lượt `plan-revise` sửa plan trên PR #22 rồi comment `Cần ba:`; lệnh tự gọi `ba` lượt `request` sửa Sub-task trên Jira |
| Gate ② | Bạn bấm Approve plan; `merge-gate` merge PR #22 (`d9030d9`); `SMP-24` sang Ready |

### Chặng 3: build, xem trước, sửa, review, gate ③

| Bước | Kết quả |
|---|---|
| `/ao-build SMP-24` | `be-dev` (3,68 USD, 13,1 phút) rồi `fe-dev` (2,70 USD tới lúc chạm giới hạn, rồi 7,07 USD) trên cùng nhánh Story. `fe-dev` mở PR nháp #23; `jira-sync` không đưa item sang In Review; lệnh dừng chờ xem trước, kèm ảnh S1 desktop và mobile và mẫu API ở `.ai/runs/SMP-24/preview/` |
| `/ao-preview SMP-24` | Thư mục sang nhánh PR, `api` và `web` lên ở `:3001` và `:3000` |
| `/ao-fix 23 --change ac` | Yêu cầu đảo thứ tự trong nhóm đã ghim, có `be:` và `fe:`. Bước kiểm tự tắt bản xem trước. `ba` lượt `ac-revise` sửa AC1, AC2 trên Jira và trong SPEC trên nhánh của PR, rồi comment `Cần sa:` và `Cần ux:` trên Epic. `be-dev` rồi `fe-dev` sửa theo phần của mình. PR vẫn là nháp, không review. `ao-step` tắt một tiến trình `fe-dev` còn sống sau khi đã trả kết quả |
| `/ao-request SMP-23` | `sa` và `ux` chạy trong một lệnh (0,72 và 0,27 USD). Cả hai chỉ trả lời trên Jira, vì `plan.md` và `design.md` đã merge (lỗ hổng 2 bên dưới); câu thay thế nằm ở comment 10214 và 10215 |
| `/ao-review 23` | `pr-ready` chuyển PR sang sẵn sàng. `reviewer` (xhigh, 2,39 USD): 1 Medium (plan và design còn tả thứ tự cũ), 2 Low. `security` (max, 3,49 USD): không finding; ghi một chỗ lệch SPEC (`id` có mã `%` hỏng trả 400 thay vì 404) |
| Gate ③ | Bạn approve; `merge-gate` merge (`a39067b`); deployer đưa lên Development |

### Chặng 4: QA fail, làm lại trên `-r2`, QA lại, Accept

| Bước | Kết quả |
|---|---|
| Thử trước lượt có phí | `%ZZ`, `abc%2` bị proxy của Development chặn bằng `400 Bad Request` dạng chữ, không tới app; `%FF`, `%C3%28`, `%ED%A0%80` tới app và nhận 400 `INVALID_BODY`. Lời báo lỗi dùng nhóm sau, bạn duyệt lại |
| `/ao-qa SMP-24 --change ac` | `ba` lượt `ac-add` thêm AC12 trên Jira (comment 10216), không commit. `qa` lượt `qa-defect` tái hiện qua `curl` và trên trang, báo cáo FAIL (comment 10217), bấm `QA fail`; item về In Progress |
| `/ao-build SMP-24` | Dừng hỏi cách chia lỗi vì Story có hai Sub-task; bạn duyệt `be:` sửa API, `fe:` thêm E2E AC12. Nhánh `feature/SMP-24-pin-notes-r2` tách từ `develop`. `ba` lượt `spec-sync` đưa AC12 vào `spec.md`; `be-dev` sửa `ApiExceptionFilter` (test viết trước, fail với 400); `fe-dev` thêm 5 E2E và mở PR nháp #24 |
| `/ao-review 24` | Bỏ qua xem trước vì PR không đổi giao diện. `reviewer` 4 Low, `security` không finding |
| Gate ③ | Bạn approve; `merge-gate` merge (`61f4cec`); Development deploy |
| `/ao-qa SMP-24` | PASS AC1–AC12, E2E 54/54 trên Development; item sang In QA |
| Accept | `SMP-24` Done. Epic `SMP-23` còn In Progress (xem "Việc còn lại trên `ao-sample`") |

### Số đo

| Item | Lượt | Chi phí |
|---|---|---|
| Tạo Epic | 1 phiên `claude -p` | 0,14 USD |
| `SMP-23` | 16 lượt: `ba` 9, `ux` 4, `sa` 3; 1 lượt bị bỏ dở do mình đặt thời hạn chạy nền 10 phút, 1 lượt chạm giới hạn 5 giờ | 15,90 USD |
| `SMP-24` | 17 lượt: build 3, sửa 3, review 4, QA 2, build lại 2, và `ba` 3 (`ac-revise`, `ac-add`, `spec-sync`); 2 lượt chạm giới hạn 5 giờ | 38,04 USD |
| **Tổng T20** | | **54,08 USD** |

- Mức ước ban đầu 25–35 USD. Phần vượt đến từ vòng `/ao-fix` (6,27 USD), vòng QA fail và làm lại (12,46 USD: `ac-add`, `qa-defect`, `spec-sync`, build lại, review lại, QA lại) và ba lần chạm giới hạn 5 giờ.
- Kiểm của dev ở lần build đầu: unit api 246, web 256; integration của API 74; E2E 49. Sau lần làm lại: unit api 275, web 256; integration 88; E2E 54.
- Tốc độ với 1000 ghi chú dài tối đa, trên bản build: ghim 70–233 ms, bỏ ghim 67–82 ms (giới hạn 1 s).

### Việc kit để sau

1. **Phần làm dở khi dev agent chạm giới hạn.** `fe-dev` để lại 4 file chưa commit trên nhánh Story; chạy lại lệnh thì `ao-step` từ chối vì thư mục đang ở nhánh không được bảo vệ. Mình phải cất vào stash rồi đưa thư mục về `develop`; `fe-dev` tự tìm thấy stash và áp lại. Cách sửa đề xuất: `ao-step` cất phần dở vào stash có nhãn khi lượt dừng vì giới hạn, và áp lại trước khi chạy tiếp session đó.
2. **Đổi AC trên PR không kéo theo plan và design.** `/ao-fix --change ac` chỉ cho `ba` sửa SPEC trên nhánh PR. `Cần sa:` và `Cần ux:` đi qua `/ao-request`, mà sau giai đoạn plan thì lượt đó chỉ làm trên Jira, nên `plan.md` và `design.md` không sửa được trên cùng PR. `sa` và `ux` cũng không gắn cờ Needs you được, vì chỉ được comment. Cách sửa đề xuất: khi yêu cầu đến từ `/ao-fix` hay lần làm lại sau `QA fail`, lượt `request` của `sa` và `ux` commit lên nhánh của PR đang mở; hoặc lệnh tự chạy `sa`/`ux` sau `ac-revise` như `ba` đang làm.
3. **Hook Jira chặn nhầm.** Một lệnh tìm kiếm của `security` bị chặn chỉ vì từ khóa tìm có chữ "atlassian". Hook nên chặn lời gọi tới Atlassian, không chặn chữ trong mẫu tìm.
4. **Dòng `Next:` sau `QA fail`** của `/ao-qa` gợi ý `/ao-review <PR cũ>`; phải là `/ao-build <KEY>`.
5. **Gắn lại bằng chứng cũ.** `qa` dời bằng chứng vòng 1 vào `.ai/qa/SMP-24/r1-a39067b/`, và orchestrator đọc cả thư mục con nên gắn lại 8 ảnh cũ lên Jira. Chỉ nên gắn file ở thư mục gốc, hoặc file mới hơn lúc lượt bắt đầu.
6. **Còn từ T19:** hai Medium và các Low ghi ở mục T19; và việc cần bạn quyết: so đường dẫn được bảo vệ không phân biệt hoa thường trong `merge-gate` và `audit`.

### Việc còn lại trên `ao-sample`

- `plan.md` và `design.md` của `SMP-23` còn tả thứ tự ghim cũ và chỉ có AC1–AC11 (Medium của `reviewer` ở PR #23, Low ở PR #24). Câu thay thế ở comment 10214 và 10215. Làm bằng một Task tài liệu sau khi kit có đường cho lỗ hổng 2, rồi đóng Epic `SMP-23`.
- Các Low của hai PR: chú thích ở `notes.store.ts:14` dẫn quyết định 3 của plan; câu nhắc khi khóa viết ở hai file; một ca hiếm trình đọc màn hình đọc dòng nhắc cho nút đang mở; E2E AC12 tự ghim 2 ghi chú nên fail nếu Development đang có 2–3 ghim; cột method thừa trong unit test của filter; hàm kiểm đường dẫn trả mặc định khi không có request.

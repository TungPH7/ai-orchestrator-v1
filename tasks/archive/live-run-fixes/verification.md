# Kiểm chứng: live-run-fixes

> **Spec:** [SPEC-live-run-fixes.md](../../../SPEC-live-run-fixes.md). **Plan:** [plan.md](plan.md). Module hoàn thành 2026-11-12 (Phiên 27 · Lượt 151).

## Phần 1: kit PR #248 (`cdf4ab3`), 2026-11-12

| Task | Kết quả |
|---|---|
| T2 | `nextFor(item, pr)` chỉ tính PR còn mở. Item In Progress mà PR đã merge thì `Next:` là `/ao-build <KEY>` |
| T3 | `qaFollowUp` chỉ gắn file sửa từ `startedAt` của lượt `qa`. `runGo` truyền `startedAt` cho `after` |
| T4 | `head.repo` null, hoặc khác repo gốc, thì `fromFork` là `true` |
| T5 | `protectedPaths` so không phân biệt hoa thường. `.Claude/…` phải do bạn merge, và `audit` báo nó |

Mỗi mục có test đỏ trước khi sửa. Năm lệnh kiểm xanh (1192 test), CI xanh.

## Phần 2: kit PR #249 (`343b866`), 2026-11-12

| Task | Kết quả |
|---|---|
| T7 | Phần chạy preview dời sang `lib/workflow/preview-run.mjs`, có 6 test của hành vi cũ trước khi sửa |
| T8 | `active.json` ghi ngay sau khi switch. Mọi lỗi sau đó đi qua `stop`. `npm ci` lỗi thì xóa `state.json`, để `stop` cài lại package của `develop` |
| T9 | `decidePreview` từ chối PR có nhiều file hơn danh sách GitHub. `start` kiểm head trên origin và danh sách `git diff -z`, trước khi switch. Có `isSteeringPath` với các tên mới |
| T10 | `start` ghi các file lái phiên chưa track; `stop` nêu file mới xuất hiện, không xóa. Sửa skill `ao-preview` |
| T11 | Kiểm thật, xem mục dưới |

Năm lệnh kiểm xanh (1214 test), CI xanh.

## T11: kiểm thật `/ao-preview` trên `ao-sample`, 2026-11-12

Không gọi agent, 0 USD. Kit chạy từ worktree `ao-kit-lrf` của nhánh `task/live-run-fixes-part-2` qua `AO_KIT_DIR`. Item thử là `SMP-21` (đã hủy). Ba PR nháp tạo bằng login `gh` của bạn, mở lần lượt vì `/ao-preview` lấy PR mới nhất của item.

| PR thử | Cách dựng | Kết quả |
|---|---|---|
| #25, app không lên | `start:dev` của `apps/api` thành `node --version`, script mà chỉ `preview.yaml` dùng; thêm một dòng trống vào cuối `package-lock.json`, để lockfile khác `develop` | `npm ci` cho PR, `api` không trả lời sau 2 phút, rồi `stop`: thư mục về `develop`, `npm ci` lại cho `develop`, `active.json` không còn, `state.json` mang hash lockfile của `develop`. Cả lượt 338 giây. Sau đó `/ao-status`, `ao-step build SMP-24` và `--stop` chạy bình thường |
| #26, file chỉ dẫn | Thêm `apps/web/AGENTS.md` | `/ao-preview` từ chối ngay, khi CI còn chạy: `PR #26 changes apps/web/AGENTS.md, which steer the kit and the agents…` |
| #27, `develop` cũ | Cắt từ `develop` trước lần chép kit `SMP-22` (`518ec40^1`), thêm một file tài liệu; CI xanh | `start` từ chối trước khi switch, thư mục vẫn ở `develop`: nhánh khác `develop` ở 54 file lái phiên trong `.ai-orchestrator/` và `.claude/` |

**Một chỗ sửa ngay trong T11.** Câu từ chối của PR #27 liệt kê đủ 54 file. Từ commit `4669dd3`, câu này chỉ nêu 8 tên đầu rồi "and 46 more", như `merge-gate` đã làm; có test đỏ trước.

**Dọn dẹp.** Đóng PR #25, #26, #27 và xóa ba nhánh trên origin và trên máy. `SMP-21` vẫn Cancelled, không có cờ.

**Thấy thêm trên `ao-sample`.** Lần chạy CI đầu của PR #25 đỏ ở một test web không liên quan: `notes-view.test.tsx`, "a pin the API refuses because 3 notes are pinned already (AC10)", lỗi `Found multiple elements with the text: Bỏ ghim một ghi chú để ghim ghi chú này`. Chạy lại job thì xanh, nên test này chập chờn. Nó gần với Low "câu gợi ý lặp" còn lại từ `SMP-24`; ghi vào việc còn lại của `ao-sample`.

## Phần 3: kit PR #250 (`7dd1a4d`), 2026-11-12

| Task | Kết quả |
|---|---|
| T13 | `lib/workflow/wip.mjs`: `saveWip` cất phần dở theo nhãn, rồi lấy SHA từ danh sách stash; `restoreWip` về nhánh, áp theo SHA, rồi xóa theo SHA |
| T14 | `runGo` cất phần dở khi lượt dừng với `usage-limit` hay `unfinished`, và ghi `wip` vào bản ghi. Lượt chạy tiếp áp lại sau checkout, prompt có thêm `wipNote`. Áp không được thì lệnh dừng trước agent. Câu dừng của `checkoutStop` có cách cất bằng tay |
| T15 | `/ao-fix`: các yêu cầu tới `ba`, `ux`, `sa` trên item hay Epic, viết sau lúc lượt đổi tài liệu của chính yêu cầu đó bắt đầu, chạy trên nhánh PR trước dev agent. Facts đã có sẵn `facts.epic.requests` |
| T16 | Lần làm lại: các yêu cầu viết từ lúc `ac-add` bắt đầu chạy trên `-rN`, sau `spec-sync`. Prompt `request` chỉ trên Jira không còn câu "flag Needs you" |

**Test của T13 viết sau code, không phải trước.** Để bù, mình làm hỏng module:
- lần một, luôn xóa `stash@{0}`: 1 test đỏ;
- lần hai, bỏ thêm bước kiểm HEAD, chồng lên lỗi thứ nhất: 2 test đỏ.

Sau đó module trở lại bản đúng, 6 test xanh. Các task khác của phần 3 có test đỏ trước.

**Hai chỗ lệch so với plan, quyết định 3:**
- Xóa nhầm entry khi bỏ stash: plan định cất lại rồi dừng lệnh. Code cất lại entry bị xóa nhầm, giữ entry của lượt trong danh sách, ghi một dòng báo, và cho agent chạy tiếp. Lý do: lúc đó phần dở đã nằm trong thư mục, nên dừng lệnh chỉ làm lần chạy sau vướng thư mục bẩn.
- Áp lại chỉ khi HEAD của nhánh trùng commit lúc cất, và thư mục sạch. Không trùng thì dừng trước agent, kèm SHA. Lý do: áp lên một HEAD khác có thể để lại dấu xung đột trong thư mục.

Năm lệnh kiểm xanh (1225 test), CI xanh.

## Tiêu chí hoàn thành (spec mục 7)

| Tiêu chí | Kết quả |
|---|---|
| 1. Năm lệnh kiểm xanh | Đạt, sau mỗi task và trên `main` (1225 test) |
| 2. Mỗi mục 2.1, 2.2, 2.4–2.9 có test đỏ trước khi sửa | Đạt, trừ `wip.mjs` của T13: test viết sau code, bù bằng lần cố ý làm hỏng module (mục Phần 3) |
| 3. Kiểm thật `/ao-preview` không tốn tiền | Đạt cả hai trường hợp của spec, thêm trường hợp nhánh cắt từ `develop` cũ (T11) |
| 4. Kit merge vào `main` qua PR, CI xanh | Đạt: #247, #248, #249, #250 |

Chi phí: 0 USD lượt agent. T11 chỉ tốn phút CI của `ao-sample` cho PR #25 và #27.

## Việc còn lại

- **Kit trên VPS:** `audit` chỉ so đường dẫn không phân biệt hoa thường khi kit trên VPS được cập nhật. Việc này cần bạn duyệt riêng.
- **Bản chép kit trong `ao-sample`:** vẫn là `c6fdfa8`. Theo câu 2 của spec, chép sau B1, để một lần review mang cả hai module.
- **Kiểm thật 2.1 và 2.2:** lần đầu ở Pilot 3, khi một lượt chạm giới hạn 5 giờ, và khi sửa AC trên PR.
- **`SMP-23`:** bấm Complete khi một bản phát hành có `SMP-24` lên Production. Comment 10223 trên `SMP-19` ghi thứ tự ghim đúng.
- **`ao-sample`:** test AC10 của `notes-view` chập chờn (mục T11), cùng các Low còn lại từ `SMP-24`.

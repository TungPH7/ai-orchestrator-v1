# Kiểm chứng: live-run-fixes

> **Spec:** [SPEC-live-run-fixes.md](../SPEC-live-run-fixes.md). **Plan:** [plan.md](plan.md). Ghi kết quả từng task khi xong.

## Phần 1: kit PR #248 (`cdf4ab3`), 2026-11-12

| Task | Kết quả |
|---|---|
| T2 | `nextFor(item, pr)` chỉ tính PR còn mở. Item In Progress mà PR đã merge thì `Next:` là `/ao-build <KEY>` |
| T3 | `qaFollowUp` chỉ gắn file sửa từ `startedAt` của lượt `qa`. `runGo` truyền `startedAt` cho `after` |
| T4 | `head.repo` null, hoặc khác repo gốc, thì `fromFork` là `true` |
| T5 | `protectedPaths` so không phân biệt hoa thường. `.Claude/…` phải do bạn merge, và `audit` báo nó |

Mỗi mục có test đỏ trước khi sửa. Năm lệnh kiểm xanh (1192 test), CI xanh.

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

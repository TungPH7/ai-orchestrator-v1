# Todo: parallel-runs, phần 1 (worktree theo item)

Spec: [SPEC-parallel-runs.md](../../SPEC-parallel-runs.md), mục 4 và 6. Duyệt ở Phiên 32 · Lượt 35. Nhánh
`task/parallel-runs-1`, worktree `ai-orchestrator-c2`; thư mục kit `ai-orchestrator` (mà `AO_KIT_DIR` của `SHOP-7` trỏ
tới) không bị đụng.

Bộ test lúc bắt đầu: 1.470 test xanh, khoảng 47 giây.

## Quyết định khi làm (ghi lại vào spec khi xong)

- **Không đổi `decideStep`.** Lượt nào chạy trong làn do một hàm thuần quyết, từ vai trò, mục đích và nhánh của lượt:
  - dev agent (`be-dev`, `fe-dev`, `devops`) ở `build` hay `fix`;
  - hoặc lượt có `checkout` trên một nhánh không được bảo vệ (ví dụ `ba` sửa AC trên nhánh của PR), vì nhánh đó nằm
    trong làn.
  - Review và QA giữ worktree tạm như cũ.
- **Khóa của làn là item cha:** Sub-task chạy trong làn của Story (`run.story ?? run.key`).
- **`checkout` lên `develop` trong làn** nghĩa là đứng ở `origin/develop` dạng detached, vì `develop` đang ở thư mục
  chính.
- **Runner** truyền cả lượt cho `git(checkout, run)` và `wip.restore(wip, run)`, để ao-step biết làn.
- **`/ao-preview` khi bật worktree:** dừng, kèm lời chỉ (spec 4.4). Bật app trong làn để sau. Spec cũ (mục 1) nói
  preview dùng thư mục chính; điều đó không làm được khi nhánh của PR đã nằm trong làn.
- **Làn thiếu** (bị xóa tay) khi một lượt tiếp tục phiên: tạo lại từ `origin/develop`, rồi `restoreWip` đưa phần việc
  dở về, như ở thư mục chính.

## Việc

- [x] `lib/workflow/places.mjs` (thuần) và test:
  - [x] `laneDir(projectDir, key)`: `<cha>/<tên>-wt/<KEY>`;
  - [x] `laneOf(run, { worktrees, isProtected })`: khóa của làn hay `null`;
  - [x] `laneCheckout(spec, isProtected)`: lệnh git để đặt làn lên nhánh (detach ở `origin/develop`, switch, track, tạo);
  - [x] `lanesToPrune(lanes, prs)`: làn có PR đã merge hay đóng.
- [x] Cấu hình `runs` trong `project.yaml`: `lib/scaffold/project.schema.json`, đọc ở ao-step; mặc định tắt.
- [x] `lib/workflow/runner.mjs`: `git(next.checkout, next)`, `wip.restore(wip, next)`; test.
- [x] `scripts/ao-step.mjs` (logic ở `lib/workflow/lanes.mjs`):
  - [x] `gitIn(dir)`; `prepareCheckout` chuyển sang `checkoutBranch` của `places.mjs`;
  - [x] tạo làn: `git worktree add --detach`, cài package của dự án và `.ai-orchestrator`, chép `runs.copy`, chép
        ledger của item nếu có;
  - [x] `cwd` của agent là làn; `saveWip` / `restoreWip` trong làn;
  - [x] dòng ghi chú về làn trong prompt;
  - [x] gỡ làn có PR đã merge hay đóng ở đầu mỗi lệnh `--go`, chép ledger về trước;
  - [x] `/ao-status` liệt kê các làn.
- [x] `/ao-preview` dừng khi bật worktree (bật app trong làn để sau).
- [x] `docs/dev-workflow.md`, `README.md`: mục worktree theo item.
- [x] `npm run validate`, `npm test` (1.490), `npm run agents:check` xanh.
- [x] Kit PR phần 1, review (kit PR #291, merge 2026-11-15; review ở bản chép vào `shop`, `SHOP-38`).

# Task: live-run-fixes

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-live-run-fixes.md](../SPEC-live-run-fixes.md). Làm theo thứ tự. Mỗi task viết test đỏ trước.

**Quy ước:**
- Xong mỗi task thì năm lệnh kiểm phải xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`.
- Mỗi phần một nhánh `task/live-run-fixes-part-<N>` tách từ `main`, mỗi task một commit. Merge qua PR khi CI xanh.
- Commit theo `CLAUDE.md`.

## Chuẩn bị

- [x] **T1: tài liệu.** Spec ghi đã duyệt, plan, todo, nhật ký Lượt 148–149. PR tài liệu từ nhánh `task/live-run-fixes`, tự merge khi CI xanh. Comment trên `SMP-19` như mục Câu hỏi mở của plan.
  - **Kiểm:** CI xanh, PR merge; comment hiện trên `SMP-19` (comment 10223).

## Phần 1, nhánh `task/live-run-fixes-part-1`

- [x] **T2: `nextFor` nhận PR** (spec 2.4).
  - **Đạt khi:**
    - `nextFor(item, pr)` nhận `{ number, state, merged, draft }` hoặc `null`;
    - item In Progress có PR không còn mở thì `Next:` là `/ao-build <KEY>`;
    - mọi chỗ gọi (`decideStatus`, `spaceStatus`, `decideBuild`, `decideQa`, `decidePreview`) truyền PR theo cách đó.
  - **Kiểm:** test đỏ trước: `decideQa` trên item In Progress với PR đã merge trả `Next: /ao-build <KEY>`. Test cũ của `nextFor` trong `steps-qa`, `steps-pr`, `steps-draft` viết lại theo tham số mới.
  - **File:** `lib/workflow/steps.mjs`, `tests/workflow/steps-qa.test.mjs`, `steps-pr.test.mjs`, `steps-draft.test.mjs`.
- [x] **T3: bằng chứng QA, chỉ file mới** (spec 2.5).
  - **Đạt khi:**
    - `list` trả `{ path, mtimeMs }`;
    - `qaFollowUp` chỉ gắn file sửa từ `run.startedAt` trở đi; file cũ hơn không được gắn và không có trong dòng "these stay in";
    - `runGo` truyền `startedAt` của lượt cho `after`.
  - **Kiểm:** test đỏ trước trong `tests/workflow/qa.test.mjs`: một ảnh cũ trong thư mục con không được gắn; test của `runGo` kiểm `after` nhận `startedAt`.
  - **File:** `lib/workflow/qa.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs` (`listFiles`), test.
- [x] **T4: `fromFork` khi fork đã bị xóa** (spec 2.8).
  - **Đạt khi:** `head.repo` null thì `fromFork` là `true`.
  - **Kiểm:** ba test của `readPullRequest` trong `tests/workflow/facts.test.mjs`: PR cùng repo, PR từ fork, PR có `head.repo` null. Test thứ ba đỏ trước khi sửa.
  - **File:** `lib/workflow/facts.mjs`, test.
- [x] **T5: đường dẫn được bảo vệ, không phân biệt hoa thường** (spec 2.9).
  - **Đạt khi:** `protectedPaths` và glob của thông điệp ở `merge-gate.mjs:116` so không phân biệt hoa thường; một PR đổi `.Claude/settings.json` không được `merge-gate` tự merge, và `audit` báo nó như một đường dẫn được bảo vệ.
  - **Kiểm:** test đỏ trước trong `tests/quality/merge-gate.test.mjs` và `audit.test.mjs` với `.Claude/…` và `.GitHub/workflows/…`.
  - **File:** `lib/quality/merge-gate.mjs`, test; `quality/gates.yaml` (chú thích), tài liệu quality gates nếu có câu nói về chữ hoa.
- [x] **T6: tài liệu phần 1, PR phần 1.**
  - **Đạt khi:** `docs/release-workflow.md`, mục "Lỗi bạn thấy khi QA", nói `Next:` sau `QA fail` và cách chọn bằng chứng QA; `docs/dev-workflow.md`, chỗ tả luật đường dẫn được bảo vệ ghi không phân biệt hoa thường, có hiệu lực ở lần chép kit sau, còn `audit` khi kit trên VPS được cập nhật.
  - **Kiểm:** năm lệnh kiểm; CI xanh; PR merge.

### Checkpoint 1: sau T6
- [x] PR phần 1 đã merge, `main` xanh (#248, `cdf4ab3`).

## Phần 2, nhánh `task/live-run-fixes-part-2`

- [x] **T7: tách `preview-run.mjs`.**
  - **Đạt khi:**
    - `previewFacts`, `portBusy`, `answers`, `startPreview`, `stopApps`, `stopPreview` nằm trong `lib/workflow/preview-run.mjs`, nhận git, npm, spawn, fs, cách thử cổng và URL làm tham số;
    - `ao-step.mjs` chỉ ghép tham số và gọi;
    - hành vi không đổi.
  - **Kiểm:** test mới `tests/workflow/preview-run.test.mjs` cho hành vi hiện có: bật được, tắt được, tắt mà không về được `develop`, cài lại package của `develop`.
  - **File:** `lib/workflow/preview-run.mjs`, `scripts/ao-step.mjs`, test.
- [x] **T8: lỗi khi bật đi qua `stopPreview`** (spec 2.6).
  - **Đạt khi:**
    - `active.json` được ghi với `apps: []` ngay sau khi switch, kể cả khi bước fast-forward sau switch lỗi;
    - `npm ci` lỗi, head lệch hay app không trả lời thì `stopPreview` chạy, và lỗi báo ra có ghi chú của nó;
    - `back()` không còn.
  - **Kiểm:** test đỏ trước: `npm ci` lỗi thì package của `develop` được cài lại; về `develop` lỗi thì `active.json` còn, với `apps: []`.
  - **File:** `lib/workflow/preview-run.mjs`, test.
- [x] **T9: danh sách file của PR, file lái phiên mới** (spec 2.7).
  - **Đạt khi:**
    - facts có `changedFiles` và số file đọc được; `decidePreview` từ chối khi đọc được ít hơn;
    - trước khi switch, `startPreview` kiểm `origin/<branch>` đúng head đã kiểm, lấy danh sách file bằng `git diff --name-only --no-renames origin/develop <head>`, rồi áp `isSteeringPath` và đường dẫn được bảo vệ, không phân biệt hoa thường;
    - `isSteeringPath` gồm `isInstructionPath`, `.claude-plugin/`, `.mcp.json` ở mọi tầng, `.gitmodules`, `.gitattributes`, `.lfsconfig`;
    - câu từ chối vì nhánh cắt từ `develop` cũ bảo bạn merge `develop` vào nhánh đó.
  - **Kiểm:** test đỏ trước: `steps-preview.test.mjs` (số file thiếu, tên mới); `preview-run.test.mjs` (head lệch, `AGENTS.md` nằm sau 3000 file, nhánh cắt từ `develop` cũ); `review-tree.test.mjs` (`isSteeringPath`, và `removeInstructions` không đổi).
  - **File:** `lib/workflow/facts.mjs`, `lib/workflow/steps.mjs`, `lib/workflow/review-tree.mjs`, `lib/workflow/preview-run.mjs`, test.
- [x] **T10: file chỉ dẫn chưa track; skill `ao-preview`** (spec 2.8).
  - **Đạt khi:**
    - lúc bật, `active.json` ghi danh sách file lái phiên chưa track; lúc tắt, `stopPreview` cảnh báo các file mới so với danh sách đó, và không xóa chúng;
    - skill viết `` `HKCU\Environment` `` trong backtick, và có câu: app ghi được vào thư mục dự án, kể cả file chưa track như `CLAUDE.local.md` hay `.claude/settings.local.json`; `--stop` không xóa chúng.
  - **Kiểm:** test đỏ trước trong `preview-run.test.mjs`; `skills.test.mjs` xanh.
  - **File:** `lib/workflow/preview-run.mjs`, `kit/.claude/skills/ao-preview/SKILL.md`, test.
- [x] **T11: kiểm thật `/ao-preview` trên `ao-sample`** (tiêu chí 3 của spec). Không gọi agent.
  - Kit chạy từ một worktree của nhánh phần 2, qua `AO_KIT_DIR`. Item thử là một item đã hủy, như `SMP-21` ở Checkpoint 3 của human-loop. PR thử là PR nháp tạo bằng login `gh` của bạn; `preview.yaml` chỉ nằm trên máy.
  - **Đạt khi:**
    1. Một PR mà app không lên, trong khi CI vẫn xanh (ví dụ đổi script chỉ xem trước dùng): thư mục về `develop`, package của `develop` được cài lại, `active.json` không còn, và lệnh sau không bị chặn nhầm.
    2. Một PR đổi file chỉ dẫn, như `apps/web/AGENTS.md`: `/ao-preview` từ chối.
    3. Một nhánh cắt từ `develop` cũ: `/ao-preview` từ chối, và bảo merge `develop` vào nhánh.
  - Xong thì đóng PR thử và xóa nhánh. Kết quả ghi vào `tasks/verification.md`.
- [x] **T12: tài liệu phần 2, PR phần 2.**
  - **Đạt khi:** `docs/dev-workflow.md` tả các trường hợp `/ao-preview` từ chối thêm, đường lỗi khi bật, và cảnh báo file chưa track.
  - **Kiểm:** năm lệnh kiểm; CI xanh; PR merge.

### Checkpoint 2: sau T12
- [ ] Kiểm thật T11 đạt; PR phần 2 đã merge, `main` xanh.

## Phần 3, nhánh `task/live-run-fixes-part-3`

- [ ] **T13: `wip.mjs`** (spec 2.1; plan, quyết định 3).
  - **Đạt khi:**
    - `saveWip` cất khi thư mục ở nhánh không được bảo vệ và có thay đổi, kể cả file chưa track, không tính file bị bỏ qua; trả `{ stash, branch }`, hoặc `null` khi không có gì để cất;
    - `restoreWip` switch về `wip.branch` khi cần, áp theo SHA, rồi xóa theo SHA; áp lỗi thì trả lỗi có SHA, và stash còn nguyên;
    - xóa nhầm entry thì cất lại entry đó bằng `git stash store`, rồi báo.
  - **Kiểm:** `tests/workflow/wip.test.mjs`: với git giả, và trên repo git tạm thật (có một stash khác nằm trên, có file chưa track, áp bị xung đột).
  - **File:** `lib/workflow/wip.mjs`, test.
- [ ] **T14: `runGo` và `ao-step` dùng `wip`** (spec 2.1).
  - **Đạt khi:**
    - lượt kết thúc `usage-limit` hay `unfinished` thì `wip.save` chạy, bản ghi có `wip`, và câu dừng nói phần dở ở stash nào;
    - lượt chạy tiếp mà bản ghi cũ có `wip` thì `wip.restore` chạy sau bước checkout, và prompt thêm câu kiểm `git status`; áp lỗi thì lệnh dừng, không chạy agent, và in SHA;
    - lượt xong (`done`) hay thư mục sạch thì không cất;
    - câu dừng của `checkoutStop` nói cách cất bằng tay khi shell bị tắt giữa lượt.
  - **Kiểm:** test đỏ trước trong `tests/workflow/runner.test.mjs`.
  - **File:** `lib/workflow/runner.mjs`, `lib/workflow/prompts.mjs`, `scripts/ao-step.mjs`, test.
- [ ] **T15: `/ao-fix` chạy yêu cầu do lượt đổi tài liệu ghi** (spec 2.2).
  - **Đạt khi:**
    - sau lượt `ac-revise`, `api-revise`, `epic-revise` hay `to-story` và trước dev agent, mỗi yêu cầu tới `ba`, `ux`, `sa` trên item hay Epic, viết sau lúc lượt đó bắt đầu, thành một lượt `request` trên nhánh PR, cũ trước;
    - prompt của lượt đó nêu item hay Epic có comment, bảo commit trên nhánh PR rồi push, và không đổi code;
    - yêu cầu viết trước lượt đổi tài liệu, hay đã được trả lời, thì không chạy.
  - **Kiểm:** test đỏ trước trong `tests/workflow/steps-revise.test.mjs`, và chữ của prompt trong `steps-request.test.mjs`.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, test.
- [ ] **T16: lần làm lại chạy các yêu cầu đó; prompt `request` chỉ trên Jira** (spec 2.2).
  - **Đạt khi:**
    - lần làm lại chạy các lượt `request` trên nhánh `-rN`, sau `spec-sync`, hoặc trước dev agent khi không có `spec-sync`; mốc thời gian là lúc lượt `ac-add` bắt đầu;
    - prompt `request` chỉ trên Jira không còn câu "flag the item Needs you": agent nói việc cần làm trong comment và trong câu trả lời cuối.
  - **Kiểm:** test đỏ trước trong `tests/workflow/steps-qa-fail.test.mjs` và `steps-request.test.mjs`.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, test.
- [ ] **T17: tài liệu phần 3, PR phần 3.**
  - **Đạt khi:** `docs/dev-workflow.md` tả việc cất và áp lại phần dở, cách cất bằng tay, và các lượt `request` trong `/ao-fix` và lần làm lại.
  - **Kiểm:** năm lệnh kiểm; CI xanh; PR merge.

### Checkpoint 3: sau T17
- [ ] PR phần 3 đã merge, `main` xanh. Mình báo bạn trước T18.

## Đóng module

- [ ] **T18: đóng module.** `tasks/verification.md` ghi kết quả từng task và T11; plan, todo, verification dời vào `tasks/archive/live-run-fixes/`; `SPEC.md`, `SPEC-live-run-fixes.md`, `concerns.md` (A6 Xong), memory cập nhật. PR tài liệu, tự merge khi CI xanh.

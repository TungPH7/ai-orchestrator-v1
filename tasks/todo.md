# Task: human-loop

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-human-loop.md](../SPEC-human-loop.md). Làm theo thứ tự. Mỗi task viết test đỏ trước.

**Quy ước:**
- Xong mỗi task thì năm lệnh kiểm phải xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`.
- Mỗi phần một nhánh `task/human-loop-part-<N>` tách từ `main`, mỗi task một commit. Merge qua PR khi CI xanh.
- Commit theo `CLAUDE.md`.
- Task có nhãn **[bạn]** cần bạn bấm trên Jira hoặc GitHub.

## Chuẩn bị

- [x] **T1: tài liệu.** Spec ghi đã duyệt, plan, todo, nhật ký Lượt 119–120. PR tài liệu, tự merge khi CI xanh.
- [x] **T2 [bạn]: bốn tiền đề trên `ao-sample`** (spec mục 10.2). Không viết code.
  1. Một phiên `claude -p` ở `ao-sample` tạo một Epic thử bằng `createJiraIssue`. Hook cho qua, và mô tả markdown hiện đúng trên Jira (heading, danh sách, bảng).
  2. Cùng phiên tạo một Task thử, rồi đổi nó thành Story bằng `editJiraIssue`.
  3. Một nhánh thử `test/ready-probe` có PR nháp. Token của `ao-dev` gọi `markPullRequestReadyForReview`, và PR thành sẵn sàng. Rồi đóng PR, xóa nhánh.
  4. Bật `npm run dev` của `ao-sample` tách khỏi shell, tắt bằng `killTree`, rồi kiểm cổng 3000 và 3001 đã trống.

  **Bạn:** bấm `Cancel` cho hai item thử. Kết quả ghi vào `tasks/verification.md`.
  - **Kiểm:** đủ bốn kết quả. Tiền đề nào sai thì sửa spec, và bạn duyệt trước T3.

### Checkpoint 1: sau T2
- [x] Bốn tiền đề có kết quả; spec đã sửa nếu cần. Cả bốn đạt (xem `verification.md`); spec mục 4.6 ghi thêm quyền `contents: write` của token.

## Phần 1 (A3), nhánh `task/human-loop-part-1`

- [x] **T3: `/ao-request <KEY>`; `/ao-spec`, `/ao-plan` chạy yêu cầu trên Epic** (spec 3.3).
  - **Đạt khi:**
    - `decideRequest` chạy lần lượt các yêu cầu `Cần ba:`, `Cần ux:`, `Cần sa:` còn mở, cũ trước;
    - Epic ở Specifying hay Planning thì chạy trên nhánh tài liệu; trường hợp khác thì đứng ở `develop`, và prompt dặn không commit;
    - `decideSpec` và `decidePlan` chạy các yêu cầu đó trước khi dừng ở cổng;
    - yêu cầu gửi role khác không chạy;
    - một lượt xong mà yêu cầu vẫn mở thì lệnh dừng.
  - **Kiểm:** test mới trong `tests/workflow/steps-request.test.mjs` và `steps-epic.test.mjs`; `skills.test.mjs` biết lệnh thứ 11.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, `scripts/ao-step.mjs` (lệnh `request`), `kit/.claude/skills/ao-request/SKILL.md`, test.
- [x] **T4: `/ao-spec <EPIC> <sửa>`, `/ao-plan <EPIC> <sửa>`** (spec 3.2).
  - **Đạt khi:**
    - note chỉ được nhận khi Epic còn trước cổng và không có câu hỏi mở;
    - `ba` chạy `spec-revise`, `sa` chạy `plan-revise`;
    - Epic đã qua cổng thì lệnh dừng và trỏ tới `/ao-intake`;
    - cùng note thì không làm lại; hàm nhận ra note đã xong được gom dùng chung với `decideFix`;
    - prompt `ba` và `sa` có mục "Revisions": số AC, comment `Cần <role>:` khi phần sửa chạm role khác. Agent được render lại.
  - **Kiểm:** `steps-epic.test.mjs`; test của `decideFix` vẫn xanh; `npm run agents:check`.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, `agents/prompts/ba.md`, `agents/prompts/sa.md`, skill `ao-spec`, `ao-plan`, agent render lại, test.
- [x] **T5: template Epic, artifact `epic`, chép `idea-refine`** (spec 3.1).
  - **Đạt khi:**
    - `templates/epic.md` có các mục Objective, Users, Scope, Rough Stories, Constraints, Open Points, Original Request, cùng một Example;
    - `contract/policies.yaml` có artifact `epic`, và `docs/sdlc.md` được sinh lại;
    - `idea-refine` có trong `vendored_skills`, ghim commit `aeac41d…`, chép bằng `npm run skills:vendor -- idea-refine`;
    - prompt `ba` đọc Open Points và Original Request của Epic.
  - **Kiểm:** `tests/templates.test.mjs`, `tests/agents/vendor.test.mjs`, `npm run validate`, `npm run render:check`.
  - **File:** `templates/epic.md`, `contract/policies.yaml`, `docs/sdlc.md`, `agents/roster.yaml`, `kit/.claude/skills/idea-refine/`, `agents/prompts/ba.md`.
- [x] **T6: `/ao-intake`** (spec 3.1).
  - **Đạt khi:**
    - `ao-step.mjs intake` không nhận đối số. Nó in space, các Epic chưa xong, WIP `epic-shaping`, luật chọn loại và quy ước item, và không trả GO;
    - skill gồm các bước: phỏng vấn theo `interview-me` (thêm `idea-refine` khi cần), phân loại Epic, Task hay Bug, viết bản nháp vào `.ai/intake/`, chờ bạn OK, tạo item một lần bằng `createJiraIssue`, rồi chạy `status <KEY>`;
    - skill ghi rõ intake không tạo Story, và khi nào thì thành Epic nhỏ.
  - **Kiểm:** test của `decideIntake` và `checkArgument`; `skills.test.mjs` (lệnh không có `--go`).
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/facts.mjs`, `scripts/ao-step.mjs`, `kit/.claude/skills/ao-intake/SKILL.md`, test.
- [ ] **T7: tài liệu phần 1, PR phần 1.**
  - **Đạt khi:** `docs/dev-workflow.md` có `/ao-intake`, note của `/ao-spec` và `/ao-plan`, `/ao-request`; README có các lệnh mới; `SPEC-dev-workflow.md` mục 2.8 trỏ sang spec này.
  - **Kiểm:** năm lệnh kiểm; CI xanh; PR merge.

### Checkpoint 2: sau T7
- [ ] PR phần 1 đã merge, `main` xanh.

## Phần 2 (A4), nhánh `task/human-loop-part-2`

- [ ] **T8: PR nháp** (spec 4.1).
  - **Đạt khi:**
    - `ao-pr.mjs create` mở PR nháp cho nhánh `feature/`, `bugfix/`, `hotfix/`, trừ nhánh tài liệu `feature/<EPIC>-spec`;
    - guard `pr-open` không đạt với PR nháp.
  - **Kiểm:** `tests/quality/ao-pr.test.mjs`, `tests/tracker/facts-github.test.mjs`.
  - **File:** `lib/quality/ao-pr.mjs`, `lib/tracker/facts.mjs`, hai file test.
- [ ] **T9: `/ao-build` dừng chờ xem trước** (spec 4.2, 4.7).
  - **Đạt khi:**
    - PR nháp đang mở thì `decideBuild` dừng, với `/ao-preview <KEY>` hoặc `/ao-review <PR>`;
    - CI đỏ trên PR nháp thì trỏ tới `/ao-fix`;
    - `nextFor` và `/ao-status` ghi PR nháp;
    - prompt `fe-dev` và `be-dev` để lại ảnh và `api.md` trong `.ai/runs/<KEY>/preview/`;
    - skill `ao-build` liệt kê các file đó trong phần báo.
  - **Kiểm:** `steps-pr.test.mjs`, test của `decideBuild` và `decideStatus`; `npm run agents:check`.
  - **File:** `lib/workflow/steps.mjs`, `agents/prompts/fe-dev.md`, `agents/prompts/be-dev.md`, skill `ao-build`, agent render lại, test.
- [ ] **T10: `/ao-review` chuyển PR sang sẵn sàng** (spec 4.6).
  - **Đạt khi:**
    - PR nháp thì `decideReview` trả `action: 'pr-ready'` với `continue`, rồi tới các lượt review;
    - `runGo` đi tiếp sau một `action` có `continue`; `kit-copy-reports` và các `action` của lệnh release vẫn dừng như cũ;
    - `ao-step` gọi `markPullRequestReadyForReview` bằng token `ao-dev`.
  - **Kiểm:** `steps-pr.test.mjs`, `runner.test.mjs`; test hàm GraphQL với `fetch` giả.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs`, hàm GraphQL (trong `lib/quality/github-app.mjs` hoặc file mới), test.
- [ ] **T11: `notes.mjs`; `/ao-fix` trên PR nháp; giao việc theo tiền tố** (spec 4.4).
  - **Đạt khi:**
    - `splitNote` tách các đoạn `be:` / `fe:` (không phân biệt hoa thường, chỉ tính ở đầu đoạn);
    - PR nháp thì `/ao-fix` chỉ chạy dev, rồi dừng với `/ao-preview` hoặc `/ao-review`;
    - có hai tiền tố thì BE trước; mỗi lượt nhận phần của mình và phần của bên kia;
    - Story có Sub-task cả hai bên mà note không có tiền tố thì lệnh dừng;
    - PR đã sẵn sàng thì vẫn review như cũ.
  - **Kiểm:** `tests/workflow/notes.test.mjs`, `steps-pr.test.mjs`.
  - **File:** `lib/workflow/notes.mjs`, `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, skill `ao-fix`, test.
- [ ] **T12: `--change`** (spec 4.5).
  - **Đạt khi:**
    - `checkArgument` nhận `--change none|ac|api|epic|story` với `fix`;
    - `ac` cho `ba` chạy `ac-revise`, `api` và `epic` cho `sa` chạy, `story` cho `ba` chạy `to-story`; tất cả chạy trên nhánh của PR, trước dev;
    - Task không thuộc Epic mà gặp `story` thì lệnh dừng;
    - skill `ao-fix` hỏi câu "đổi gì?" kèm đề xuất, ghi note, và ghép `--change`;
    - prompt `ba` và `sa` có các lượt mới. Lượt `to-story` có đường lui khi tiền đề 2 sai.
  - **Kiểm:** `steps-pr.test.mjs` cho cả năm loại; test của `checkArgument`; `npm run agents:check`.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, `scripts/ao-step.mjs`, `agents/prompts/ba.md`, `agents/prompts/sa.md`, skill `ao-fix`, test.
- [ ] **T13: phần thuần của xem trước** (spec 4.3).
  - **Đạt khi:**
    - `preview.mjs` đọc và kiểm `preview.yaml`, so hash lockfile với `.ai/preview/state.json`, và đọc `active.json`;
    - `decidePreview` dừng khi: không có PR mở, PR sửa đường dẫn được bảo vệ, có agent đang chạy, thư mục bẩn, cổng bận, thiếu file cấu hình (kèm mẫu);
    - `preview.yaml` nằm trong nhóm "Của dự án" của `kit_copy`.
  - **Kiểm:** `tests/workflow/preview.test.mjs`, `steps-preview.test.mjs`, `tests/quality/gates.test.mjs`.
  - **File:** `lib/workflow/preview.mjs`, `lib/workflow/steps.mjs`, `quality/gates.yaml` (cùng schema nếu cần), test.
- [ ] **T14: `/ao-preview --go`, `--stop`; tự dừng xem trước** (spec 4.3).
  - **Đạt khi:**
    - `--go`: chuyển nhánh, `npm ci --ignore-scripts` khi lockfile khác, bật app tách khỏi `ao-step` với `CLEARED_ENV`, chờ `url`, ghi `active.json`, in URL;
    - `--stop`: tắt cây tiến trình, xóa `active.json`, về `develop`; thư mục bẩn thì không chuyển nhánh;
    - các lệnh khác thấy `active.json` thì tắt app, về `develop`, rồi chạy lại `ao-step` từ `develop` một lần;
    - skill `ao-preview` (không agent).
  - **Kiểm:** test của `checkoutStop` và của phần quyết định chạy lại. Thử tay trên bản sao `ao-sample` ở máy: bật, mở URL, tắt, cổng trống, thư mục về `develop`.
  - **File:** `scripts/ao-step.mjs`, `kit/.claude/skills/ao-preview/SKILL.md`, test.
- [ ] **T15: tài liệu phần 2, PR phần 2.**
  - **Đạt khi:** `docs/dev-workflow.md` có bước xem trước, tiền tố, câu hỏi "đổi gì?" và một ví dụ; `misc/thao-luan/git-khi-dung-kit.md` khớp với lệnh thật; README được cập nhật.
  - **Kiểm:** năm lệnh kiểm; CI xanh; PR merge.

### Checkpoint 3: sau T15
- [ ] PR phần 2 đã merge. Thử `/ao-preview` trên bản sao `ao-sample` ở máy, không gọi agent.

## Phần 3 (A5), nhánh `task/human-loop-part-3`

- [ ] **T16: `/ao-qa <KEY> fail:`** (spec 5.1).
  - **Đạt khi:**
    - note được nhận ở Ready for QA và In QA;
    - `--change none` cho `qa` chạy `qa-defect`; `--change ac` cho `ba` chạy `ac-revise` (chỉ trên Jira) trước `qa`;
    - lỗi ngoài item thì skill dừng và trỏ tới `/ao-intake`;
    - prompt `qa` có mục "Defect from the human": tái hiện được thì FAIL rồi `QA fail`, không tái hiện được thì gắn cờ;
    - skill `ao-qa` hỏi câu phân loại lỗi.
  - **Kiểm:** `steps-qa.test.mjs`; test của `checkArgument`; `npm run agents:check`.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, `agents/prompts/qa.md`, skill `ao-qa`, test.
- [ ] **T17: `/ao-build` sau `QA fail`** (spec 5.2).
  - **Đạt khi:**
    - `facts` có `qaReport`, `nextBranch` và `mergedAt`;
    - lần làm lại tạo nhánh `-r<N+1>` từ `origin/develop`;
    - `spec-sync` chạy khi có lượt `ac-revise` sau lúc merge;
    - dev chạy theo tiền tố khi Story có Sub-task cả hai bên, theo role của item khi không; Rework từ 2 thì `xhigh`;
    - `steps.mjs:345` hết kẹt; `build-again` chỉ dùng cho lượt dừng giữa chừng;
    - skill `ao-build` hỏi cách chia lỗi khi cần.
  - **Kiểm:** `steps-build.test.mjs` (mới) cho Story có Sub-task, item không có Sub-task, `-r2`, `-r3`, `spec-sync` có và không, báo cáo QA không phải FAIL thì dừng.
  - **File:** `lib/workflow/facts.mjs`, `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, skill `ao-build`, test.
- [ ] **T18: tài liệu phần 3, PR phần 3.**
  - **Đạt khi:**
    - `docs/release-workflow.md` có `/ao-qa … fail:`;
    - `docs/dev-workflow.md` có ví dụ trọn vòng, từ intake tới làm lại sau `QA fail`;
    - `SPEC-release-workflow.md` mục 2.5 trỏ sang spec này.
  - **Kiểm:** năm lệnh kiểm; CI xanh; PR merge.

### Checkpoint 4: sau T18
- [ ] PR phần 3 đã merge. Mình hỏi bạn trước T19.

## Kiểm thật

- [ ] **T19 [bạn]: chép kit vào `ao-sample`.** Bản kit mới gồm cả A1. PR chép kit cùng với `.ai-orchestrator/preview.yaml` của `ao-sample`. `/ao-review` review đầy đủ, `security` ở `max`. Bạn đọc, approve rồi tự merge.
  - **Kiểm:** `audit` qua commit merge khi Development deploy.
- [ ] **T20 [bạn]: kiểm thật trọn vòng** (spec mục 10.3).
  - **Đạt khi:** bốn chặng của mục 10.3 đều chạy, mọi cú bấm ở cổng là của bạn, và mỗi lượt có số đo.
  - **Kiểm:** ghi vào `tasks/verification.md`.
- [ ] **T21: đóng module.**
  - **Đạt khi:**
    - plan, todo và verification được chuyển sang `tasks/archive/human-loop/`;
    - `SPEC.md` ghi hoàn thành;
    - `concerns.md` ghi A3, A4, A5 là Xong;
    - memory được cập nhật.

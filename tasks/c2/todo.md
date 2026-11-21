# Task: C2

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-c2.md](../../SPEC-c2.md). Làm theo thứ tự. Mỗi task viết test đỏ trước.

**Quy ước:**
- Xong mỗi task thì các lệnh kiểm phải xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`.
- Mỗi phần một nhánh `task/c2-<số phần>` tách từ `main`, mỗi task một commit. Phiên chính merge qua PR khi CI xanh, không dùng `--delete-branch`.
- Commit theo `CLAUDE.md`.
- Task có nhãn **[bạn]** cần bạn bấm trên Jira hay GitHub, hoặc tốn tiền.

Bộ test lúc bắt đầu: 1.731 test xanh (kit `main` `dc400af`).

## Chuẩn bị

- [x] **T1: tài liệu.** Spec ghi đã duyệt, có `next` trong bảng `waits` (plan, quyết định 4); plan, todo; nhật ký từ Lượt 101; hàng C2 của `concerns.md` (spec, plan; hai followup lặp lại đã xong ở #306, #309); `tasks/todo.md` mục 8. PR tài liệu. Xong 2026-11-20: kit PR #327 (`a915788`).

## Phần 1: chỗ dừng ghi rõ "chờ ai", nhánh `task/c2-1`

- [x] **T2: `waits` trên mọi STOP** (spec mục 4). Xong 2026-11-20, cùng commit với T3 (hai task sửa chung `steps.mjs`). 113 STOP của `decideStep` và 13 STOP của runner có nhãn; `tests/workflow/waits.test.mjs` đọc mã nguồn, nên cả STOP không test nào đi qua cũng được kiểm. Bảng `waits` của spec: `fix` gồm cả "lệnh không hợp trạng thái của item". Runner: STOP `next` là chạy lại chính lệnh đó (hết số lượt trong một lệnh, lượt không có kết quả).
  - **Đạt khi:**
    - `stop(reason, next, waits, then)` ném lỗi khi thiếu `waits` hay `waits` lạ (plan, quyết định 3);
    - mọi STOP của `decideStep` có nhãn, và cả bộ test xanh;
    - test riêng: cổng ①–⑤, Accept, Click, `seo-ok`, cờ Needs you, câu hỏi mở, PR nháp là `you`; CI đang chạy là `ci`; chờ deploy là `deploy`; link Blocks, WIP trên Jira, QA khác trên môi trường là `item`; giới hạn usage là `usage`;
    - review thấy Critical hay High: `waits: next`, `then: { command: 'fix', arg: <PR> }`; mọi STOP khác không có `then`.
  - **File:** `lib/workflow/steps.mjs`, test.
- [x] **T3: `nextCommand` và `/ao-status`.** Xong 2026-11-20. `/ao-status` của `shop` trước và sau khi sửa in giống hệt nhau (trừ dòng đếm file kit khác bản chép). Item New là `waits: item` (chờ jira-sync), để danh sách chờ bạn giữ như cũ. 1.736 test xanh.
  - **Đạt khi:**
    - `nextCommand(item, pr)` trả `{ command, arg }` hay `{ waits: 'you', text }`; `nextFor` dựng chữ từ đó, chữ in ra giữ như cũ;
    - danh sách "Waiting for you" của `spaceStatus` lấy từ `waits`, không dò chữ;
    - `/ao-status` trên `shop` (chỉ đọc) in đúng danh sách như trước khi sửa.
  - **File:** `lib/workflow/steps.mjs`, test.

### Checkpoint 1: sau T3
- [ ] PR phần 1 merge, CI xanh.

## Phần 2: bộ điều phối, nhánh `task/c2-2`

- [x] **T4: `lib/workflow/dispatch.mjs`** (spec mục 5.1–5.5). Xong 2026-11-20, commit `f70f886`: `planRound` (một vòng) và `runDispatcher` (vòng chạy, mọi tác động truyền vào), 10 test. Item có lời nhờ tới role cố vấn chạy `/ao-request` trước lệnh kế tiếp của nó; Epic In Progress không nằm trong danh sách chờ; một lệnh mở `MAX_STARTS` (5) lần trên một item trong một lần chạy thì thôi mở.
  - **Đạt khi** có test cho:
    - phạm vi: Epic cùng Story, Task, Bug của nó; hay danh sách item; Sub-task đi theo Story; item ngoài phạm vi bị bỏ;
    - ứng viên từ `nextCommand`, rồi quyết định khô của `decideStep`: chạy được, STOP `next` (chạy `then` sau khi hỏi lại), hay chờ;
    - thứ tự: QA → review → fix → build → request → plan → spec, cùng loại theo rank;
    - lệnh chạy một mình chờ tới khi không còn lệnh nào, và trong lúc đó không mở lệnh mới;
    - item đang có khóa của lệnh tay thì để yên;
    - lệnh thất bại không mở lại cho cùng item trong lần chạy;
    - ngân sách, giới hạn usage, `idle_hours`, `--stop`, mọi item Done hay Cancelled.
  - **File:** `lib/workflow/dispatch.mjs`, test.
- [x] **T5: `ao-step run`** (spec mục 5.2, 5.4–5.7). Xong 2026-11-20. Đổi quyết định 6 của plan: bộ điều phối hỏi chính `ao-step` qua `--json`, chạy thật với `--result <file>`. `lib/workflow/run-command.mjs` (tiến trình con, khóa, `--stop`, log, chi phí) có 6 test với tiến trình và file giả; test của phần này viết cùng lúc với code, không đỏ trước. `--json` bỏ qua bước tắt preview, để lượt hỏi thử không tắt preview của bạn.
  - **Đạt khi:**
    - không `--go` thì in kế hoạch, không mở lệnh;
    - `--go` mở lệnh con `ao-step <lệnh> <arg> --go`, log ở `.ai/runs/<KEY>/run-<giờ>.log`; sự kiện ở `.ai/runs/_run/<ngày>.log`;
    - khóa `.ai/runs/dispatcher.json`, mỗi dự án một bộ điều phối; `--stop` qua file; `killTree` cho lệnh con khi cần;
    - đọc lại khi một lệnh con xong, hay sau 2 phút;
    - `runs.budget_usd`, `runs.idle_hours` trong `project.schema.json`; `--budget` ghi đè;
    - `/ao-status` in bộ điều phối đang chạy;
    - vòng chạy với Jira, GitHub và tiến trình con giả: từ Epic Specifying tới khi mọi item chờ Accept.
  - **File:** `scripts/ao-step.mjs`, `lib/scaffold/project.schema.json`, `lib/workflow/lanes.mjs` (đọc `runs`), test.
- [x] **T6: skill và tài liệu.** Xong 2026-11-20. Skill nhận tối đa bốn key qua `$0 $1 $2 $3`, vì luật của kit cấm đưa `$ARGUMENTS` vào dòng lệnh shell (`tests/workflow/skills.test.mjs` bắt được). Chạy thử trên `shop` (chỉ đọc): `run SHOP-40 SHOP-70 SHOP-75` không mở gì, ba Task New chờ được làm rõ; `run SHOP-7` báo Epic đã xong. 1.753 test xanh.
  - **Đạt khi:** `kit/.claude/skills/ao-run/SKILL.md` (phiên chính chạy ở nền, theo dõi log, báo từng chỗ chờ kèm các bước bấm); `docs/dev-workflow.md`, `README.md`; `ao-step run <EPIC>` không `--go` chạy trên `shop` (chỉ đọc Jira và GitHub) và in kế hoạch hợp lý.
  - **File:** skill, tài liệu.

### Checkpoint 2: sau T6
- [ ] PR phần 2 merge, CI xanh. Gửi bạn kế hoạch mà `ao-step run` in ra trên `shop`.

## Phần 3: số agent cùng role, nhánh `task/c2-3`

- [x] **T7: `runs.agents_per_role`** (spec mục 6). Xong 2026-11-21. Con số đi qua `admit`, `takeLock`, `claimRole` (`limit`), `wipHolders`, `jiraGuards`, `decide` của `jira-guard` (hook đọc `project.yaml`; đọc không được thì giữ mức 1 của contract), facts WIP của `/ao-build`, và bộ điều phối. 1.756 test xanh.
  - **Đạt khi:**
    - schema nhận `{ <dev role>: số }`, từ 1 tới `lanes_max`; role lạ hay số lớn hơn `lanes_max` bị từ chối;
    - `claimRole` và `admit` cho tối đa N lệnh build hay fix của cùng role, mỗi lệnh một item;
    - `wipHolders` và `jira-guard` dùng con số của dự án, mặc định `wip_limits.dev-agent`;
    - Story có Sub-task BE và FE vẫn chạy lần lượt trong một làn;
    - ghi chú ở `contract/policies.yaml`; `docs/dev-workflow.md`.
  - **File:** `lib/scaffold/project.schema.json`, `lib/workflow/locks.mjs`, `lib/tracker/facts.mjs`, hook `jira-guard`, `contract/policies.yaml`, tài liệu, test.

## Phần 4: `reviewer` cùng lúc với `security`, nhánh `task/c2-4`

- [x] **T8: ba chỗ dùng chung** (spec mục 7, chỗ 1–3). Xong 2026-11-21. Worktree `pr-<N>-<role>`; ledger `.ai/ledger/<KEY>.<role>.md` (luật trong `agents/rules.md`, sinh lại file agent); `state.json` ghi theo kiểu đọc rồi sửa đúng mục của lượt mình (`put`), không đợi gì giữa đọc và ghi, nên không cần mutex file: hai lượt chạy cùng lúc nằm trong cùng một tiến trình `ao-step` (đổi so với quyết định 10 của plan). Số thứ tự của lượt được giữ trước (`reserve`), nên hai lượt không trùng số.
  - **Đạt khi:**
    - worktree `pr-<N>-<role>`, gỡ khi lượt của role đó xong;
    - ledger `.ai/ledger/<KEY>.<role>.md` cho `reviewer` và `security`, cả khi chạy lần lượt; prompt và `resumePrompt` chỉ đúng file;
    - `updateState` dưới mutex; hai lượt xong cùng lúc không mất bản ghi.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, `lib/workflow/runs.mjs`, `scripts/ao-step.mjs`, test.
- [x] **T9: vòng chạy** (spec mục 7, chỗ 4). Xong 2026-11-21. Thân một lượt của runner tách thành `makeRun`; mọi STOP của runner đi qua `halt(waits, reason)`. `pair(run)` của `ao-step` lấy khóa `<KEY>+<role>` dưới trần; không có chỗ thì chạy lần lượt như cũ. Một lần checkout cho cả cặp. Chốt RAM của agent thứ hai tính trên khóa của nó. Test mới `runner-together.test.mjs` (đỏ trên runner cũ). 1.758 test xanh.
  - **Đạt khi:**
    - `reviewRuns` đánh dấu nhóm `together` khi còn nợ cả hai báo cáo;
    - runner chạy cả nhóm khi agent thứ hai được nhận (khóa `<KEY>+security`), chạy lần lượt khi không; chờ cả nhóm xong rồi quyết lại;
    - `lanes_max: 1` thì giữ y như cũ.
  - **File:** `lib/workflow/runner.mjs`, `lib/workflow/locks.mjs`, `scripts/ao-step.mjs`, test.

## Phần 5: `/ao-preview` trong làn, nhánh `task/c2-5`

- [x] **T10: preview trong làn** (spec mục 8). Xong 2026-11-21. App chạy từ làn; không checkout, thư mục chính đứng ở `develop`. Làn chưa ở đúng head đã kiểm thì `merge --ff-only` tới đó, không được thì dừng. Khóa `.ai/runs/active/<KEY>+preview.json` theo tiến trình của app đầu tiên: `admit` không đếm nó vào trần, chỉ chặn lệnh của chính item đó. Lệnh của item đó với `--go` tắt preview trước; lượt hỏi thử (`--json`) và lệnh của item khác để yên. Không cài lại package trong làn (khác chữ của spec: làn có package của nhánh, do agent cài; đếm lockfile thêm một lần là thừa). Kiểm file steering như ở thư mục chính, nhưng trong làn. 1.764 test xanh.
  - **Đạt khi:**
    - bật làn thì preview chạy app từ làn của item, cổng mặc định, database mặc định; thư mục chính đứng ở `develop`;
    - preview giữ khóa của item với `agent: false`, không tính vào trần; lệnh của item khác vẫn được mở;
    - `/ao-fix` và `/ao-review` của item đó tắt preview trước;
    - chỉ cài lại package khi lockfile đổi từ lần cài trước;
    - `preview` ra khỏi danh sách chạy một mình; followup "`/ao-preview` không chạy được khi bật làn" được tick.
  - **File:** `lib/workflow/steps.mjs` (`decidePreview`), `lib/workflow/preview-run.mjs`, `lib/workflow/locks.mjs`, `scripts/ao-step.mjs`, skill `ao-preview`, tài liệu, test.

## Phần 6: nhịp tim của QA, nhánh `task/c2-6`

- [x] **T11: `ao-step` đặt `ao/qa`** (spec mục 9, bước 1–5). Xong 2026-11-21, cùng commit với T12 (hai task dùng chung `lib/workflow/qa-signal.mjs`). Login `gh` có quyền `repo` (đã kiểm). `qaSignal` bọc lượt khởi động agent `qa`, chạy cùng `qaWatcher`; độ im lặng của log tính từ lúc bắt đầu lượt. Lượt không có commit trên môi trường (QA nhẹ, lỗi bạn báo) không đặt gì.
  - Trước khi viết code: `gh auth status` cho thấy login của bạn có quyền `repo` (chỉ đọc tên quyền, không in token).
  - **Đạt khi:**
    - `pending` lúc lượt QA bắt đầu, lên commit mà lượt đó kiểm;
    - đặt lại mỗi 2 phút trong `qaWatcher`;
    - `success` khi lượt xong (PASS, FAIL, bị dừng, superseded), và khi log của agent không có dòng mới trong 15 phút;
    - lỗi khi đặt status chỉ ghi một dòng, không làm hỏng lượt QA.
  - **File:** `lib/workflow/qa.mjs`, `scripts/ao-step.mjs`, test.
- [x] **T12: `merge-gate` chờ `ao/qa`** (spec mục 9, bước 6–8). Xong 2026-11-21. `waitForQa` đọc status của commit đầu nhánh đích (`/git/ref/heads/<base>`), chờ tối đa 100 phút rồi để PR cho lượt sau; lượt chạy thử (`--dry-run`) không chờ. Chữ ở cổng ③ và dòng `QA in progress` của `/ao-status` nay nói `merge-gate` sẽ chờ, không bảo bạn đợi nữa. Tài liệu: `release-workflow.md`, `quality-gates.md`, `getting-started.md`.
  - **Đạt khi:**
    - trước khi merge một PR vào nhánh deploy một môi trường, đọc status `ao/qa` mới nhất do một login trong `AO_APPROVERS` đặt, trên commit đầu của nhánh đích;
    - `pending` còn mới thì chờ, đọc lại mỗi phút; `success` hay quá 10 phút không được đặt lại thì merge; in một dòng "Waiting #N: qa tests KEY on development";
    - status của login khác bị bỏ qua;
    - `merge-gate.yml` có `timeout-minutes: 120`;
    - `docs/quality-gates.md`, `docs/dev-workflow.md`; followup "approve khi QA đang chạy" được tick.
  - **File:** `lib/quality/merge-gate.mjs`, `scripts/merge-gate.mjs`, `kit/.github/workflows/merge-gate.yml`, tài liệu, test.

### Checkpoint 3: sau T12
- [x] Sáu kit PR đã merge (#328–#333; kit `main` `8a9f25d`, 1.771 test xanh). Hỏi bạn trước T13 ở Phiên 33 · Lượt 106, vì từ đây bắt đầu tốn tiền.

## Chép kit và chạy thật

- [ ] **T13 [bạn]: chép kit vào `shop`.** Một Task chép kit mang C2, T20b và Low 9 của review lần hai PR #79 (`json-ld.tsx` vào `sensitive_paths` của `shop`); review; `doctor` đạt; bạn merge.
  - Bạn cho làm ở Phiên 35 · Lượt 1 ("làm T13"). `SHOP-79` (In Progress), `shop` PR #80: `2bd498a` chép kit `8a9f25d`, `4f14d49` thêm khối `review` (Low 9). CI xanh 7 job; `ao-kit check` đạt; `doctor` chỉ đỏ hai dòng đã biết (Docker tắt, bản sao backup 71 giờ). Review chạy với bản kit trên `develop` của `shop`: `reviewer` `xhigh`, `security` `max`. Lượt 2: review xong, 15,23 USD (`security` chạm giới hạn 5 giờ, chạy tiếp trong cùng phiên). Cả hai 0 Critical, 0 High; gộp lại còn 5 Medium và 4 Low, đều trong code kit (`.pilot3-scratch/review-80-reviewer.md`, `shop/.ai/reviews/80-security.md`). Chờ bạn merge PR #80, rồi QA và Accept.
- [ ] **T13b: sửa 9 finding của review PR #80 trong kit**, trước T14 ([followups-pr80.md](followups-pr80.md)). Bạn cho làm ở Phiên 35 · Lượt 3 ("Làm như đề xuất"; "Ưu tiên fix kỹ các việc ảnh hưởng tới lần chạy của T14"). Nhánh `task/c2-t13b`; sau khi merge, một Task chép kit vào `shop` có review (khoảng 15 USD). Kit PR #334 (`82b1bca`); `SHOP-80`, `shop` PR #81: review 1 High (entity HTML), bạn cho sửa ở Lượt 6; lần sửa thứ hai trên nhánh `task/c2-t13c`. Lượt 7: kit PR #335 (`8847a84`) rồi #336 (`9374641`, hook gửi comment agent dạng HTML đã escape); review vòng ba còn 1 High `08bc0732`. Lượt 8: bạn approve PR #81 với `Accept risk: 08bc0732 until 2026-12-15`, dừng vòng sửa để làm T14; việc còn mở ở mục "Còn mở sau review vòng ba" của followups-pr80.md. Chờ bạn merge PR #81, QA `SHOP-80`, Accept.
- [ ] **T14 [bạn]: chạy thật bằng `/ao-run`** trên Epic kế tiếp của `shop` (bạn chọn tính năng), `lanes_max: 3`: các mục của spec mục 13; đo tiêu chí 7 của C1 trên cùng Epic.

## Đóng module

- [ ] **T15:** `verification.md` theo 6 tiêu chí của spec mục 15; hàng C2 của `concerns.md`; `tasks/todo.md`; memory. PR tài liệu.

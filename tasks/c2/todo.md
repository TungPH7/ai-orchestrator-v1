# Task: C2

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-c2.md](../../SPEC-c2.md). Làm theo thứ tự. Mỗi task viết test đỏ trước.

**Quy ước:**
- Xong mỗi task thì các lệnh kiểm phải xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`.
- Mỗi phần một nhánh `task/c2-<số phần>` tách từ `main`, mỗi task một commit. Phiên chính merge qua PR khi CI xanh, không dùng `--delete-branch`.
- Commit theo `CLAUDE.md`.
- Task có nhãn **[bạn]** cần bạn bấm trên Jira hay GitHub, hoặc tốn tiền.

Bộ test lúc bắt đầu: 1.731 test xanh (kit `main` `dc400af`).

## Chuẩn bị

- [ ] **T1: tài liệu.** Spec ghi đã duyệt, có `next` trong bảng `waits` (plan, quyết định 4); plan, todo; nhật ký từ Lượt 101; hàng C2 của `concerns.md` (spec, plan; hai followup lặp lại đã xong ở #306, #309); `tasks/todo.md` mục 8. PR tài liệu.

## Phần 1: chỗ dừng ghi rõ "chờ ai", nhánh `task/c2-1`

- [ ] **T2: `waits` trên mọi STOP** (spec mục 4).
  - **Đạt khi:**
    - `stop(reason, next, waits, then)` ném lỗi khi thiếu `waits` hay `waits` lạ (plan, quyết định 3);
    - mọi STOP của `decideStep` có nhãn, và cả bộ test xanh;
    - test riêng: cổng ①–⑤, Accept, Click, `seo-ok`, cờ Needs you, câu hỏi mở, PR nháp là `you`; CI đang chạy là `ci`; chờ deploy là `deploy`; link Blocks, WIP trên Jira, QA khác trên môi trường là `item`; giới hạn usage là `usage`;
    - review thấy Critical hay High: `waits: next`, `then: { command: 'fix', arg: <PR> }`; mọi STOP khác không có `then`.
  - **File:** `lib/workflow/steps.mjs`, test.
- [ ] **T3: `nextCommand` và `/ao-status`.**
  - **Đạt khi:**
    - `nextCommand(item, pr)` trả `{ command, arg }` hay `{ waits: 'you', text }`; `nextFor` dựng chữ từ đó, chữ in ra giữ như cũ;
    - danh sách "Waiting for you" của `spaceStatus` lấy từ `waits`, không dò chữ;
    - `/ao-status` trên `shop` (chỉ đọc) in đúng danh sách như trước khi sửa.
  - **File:** `lib/workflow/steps.mjs`, test.

### Checkpoint 1: sau T3
- [ ] PR phần 1 merge, CI xanh.

## Phần 2: bộ điều phối, nhánh `task/c2-2`

- [ ] **T4: `lib/workflow/dispatch.mjs`** (spec mục 5.1–5.5).
  - **Đạt khi** có test cho:
    - phạm vi: Epic cùng Story, Task, Bug của nó; hay danh sách item; Sub-task đi theo Story; item ngoài phạm vi bị bỏ;
    - ứng viên từ `nextCommand`, rồi quyết định khô của `decideStep`: chạy được, STOP `next` (chạy `then` sau khi hỏi lại), hay chờ;
    - thứ tự: QA → review → fix → build → request → plan → spec, cùng loại theo rank;
    - lệnh chạy một mình chờ tới khi không còn lệnh nào, và trong lúc đó không mở lệnh mới;
    - item đang có khóa của lệnh tay thì để yên;
    - lệnh thất bại không mở lại cho cùng item trong lần chạy;
    - ngân sách, giới hạn usage, `idle_hours`, `--stop`, mọi item Done hay Cancelled.
  - **File:** `lib/workflow/dispatch.mjs`, test.
- [ ] **T5: `ao-step run`** (spec mục 5.2, 5.4–5.7).
  - **Đạt khi:**
    - không `--go` thì in kế hoạch, không mở lệnh;
    - `--go` mở lệnh con `ao-step <lệnh> <arg> --go`, log ở `.ai/runs/<KEY>/run-<giờ>.log`; sự kiện ở `.ai/runs/_run/<ngày>.log`;
    - khóa `.ai/runs/dispatcher.json`, mỗi dự án một bộ điều phối; `--stop` qua file; `killTree` cho lệnh con khi cần;
    - đọc lại khi một lệnh con xong, hay sau 2 phút;
    - `runs.budget_usd`, `runs.idle_hours` trong `project.schema.json`; `--budget` ghi đè;
    - `/ao-status` in bộ điều phối đang chạy;
    - vòng chạy với Jira, GitHub và tiến trình con giả: từ Epic Specifying tới khi mọi item chờ Accept.
  - **File:** `scripts/ao-step.mjs`, `lib/scaffold/project.schema.json`, `lib/workflow/lanes.mjs` (đọc `runs`), test.
- [ ] **T6: skill và tài liệu.**
  - **Đạt khi:** `kit/.claude/skills/ao-run/SKILL.md` (phiên chính chạy ở nền, theo dõi log, báo từng chỗ chờ kèm các bước bấm); `docs/dev-workflow.md`, `README.md`; `ao-step run <EPIC>` không `--go` chạy trên `shop` (chỉ đọc Jira và GitHub) và in kế hoạch hợp lý.
  - **File:** skill, tài liệu.

### Checkpoint 2: sau T6
- [ ] PR phần 2 merge, CI xanh. Gửi bạn kế hoạch mà `ao-step run` in ra trên `shop`.

## Phần 3: số agent cùng role, nhánh `task/c2-3`

- [ ] **T7: `runs.agents_per_role`** (spec mục 6).
  - **Đạt khi:**
    - schema nhận `{ <dev role>: số }`, từ 1 tới `lanes_max`; role lạ hay số lớn hơn `lanes_max` bị từ chối;
    - `claimRole` và `admit` cho tối đa N lệnh build hay fix của cùng role, mỗi lệnh một item;
    - `wipHolders` và `jira-guard` dùng con số của dự án, mặc định `wip_limits.dev-agent`;
    - Story có Sub-task BE và FE vẫn chạy lần lượt trong một làn;
    - ghi chú ở `contract/policies.yaml`; `docs/dev-workflow.md`.
  - **File:** `lib/scaffold/project.schema.json`, `lib/workflow/locks.mjs`, `lib/tracker/facts.mjs`, hook `jira-guard`, `contract/policies.yaml`, tài liệu, test.

## Phần 4: `reviewer` cùng lúc với `security`, nhánh `task/c2-4`

- [ ] **T8: ba chỗ dùng chung** (spec mục 7, chỗ 1–3).
  - **Đạt khi:**
    - worktree `pr-<N>-<role>`, gỡ khi lượt của role đó xong;
    - ledger `.ai/ledger/<KEY>.<role>.md` cho `reviewer` và `security`, cả khi chạy lần lượt; prompt và `resumePrompt` chỉ đúng file;
    - `updateState` dưới mutex; hai lượt xong cùng lúc không mất bản ghi.
  - **File:** `lib/workflow/steps.mjs`, `lib/workflow/prompts.mjs`, `lib/workflow/runs.mjs`, `scripts/ao-step.mjs`, test.
- [ ] **T9: vòng chạy** (spec mục 7, chỗ 4).
  - **Đạt khi:**
    - `reviewRuns` đánh dấu nhóm `together` khi còn nợ cả hai báo cáo;
    - runner chạy cả nhóm khi agent thứ hai được nhận (khóa `<KEY>+security`), chạy lần lượt khi không; chờ cả nhóm xong rồi quyết lại;
    - `lanes_max: 1` thì giữ y như cũ.
  - **File:** `lib/workflow/runner.mjs`, `lib/workflow/locks.mjs`, `scripts/ao-step.mjs`, test.

## Phần 5: `/ao-preview` trong làn, nhánh `task/c2-5`

- [ ] **T10: preview trong làn** (spec mục 8).
  - **Đạt khi:**
    - bật làn thì preview chạy app từ làn của item, cổng mặc định, database mặc định; thư mục chính đứng ở `develop`;
    - preview giữ khóa của item với `agent: false`, không tính vào trần; lệnh của item khác vẫn được mở;
    - `/ao-fix` và `/ao-review` của item đó tắt preview trước;
    - chỉ cài lại package khi lockfile đổi từ lần cài trước;
    - `preview` ra khỏi danh sách chạy một mình; followup "`/ao-preview` không chạy được khi bật làn" được tick.
  - **File:** `lib/workflow/steps.mjs` (`decidePreview`), `lib/workflow/preview-run.mjs`, `lib/workflow/locks.mjs`, `scripts/ao-step.mjs`, skill `ao-preview`, tài liệu, test.

## Phần 6: nhịp tim của QA, nhánh `task/c2-6`

- [ ] **T11: `ao-step` đặt `ao/qa`** (spec mục 9, bước 1–5).
  - Trước khi viết code: `gh auth status` cho thấy login của bạn có quyền `repo` (chỉ đọc tên quyền, không in token).
  - **Đạt khi:**
    - `pending` lúc lượt QA bắt đầu, lên commit mà lượt đó kiểm;
    - đặt lại mỗi 2 phút trong `qaWatcher`;
    - `success` khi lượt xong (PASS, FAIL, bị dừng, superseded), và khi log của agent không có dòng mới trong 15 phút;
    - lỗi khi đặt status chỉ ghi một dòng, không làm hỏng lượt QA.
  - **File:** `lib/workflow/qa.mjs`, `scripts/ao-step.mjs`, test.
- [ ] **T12: `merge-gate` chờ `ao/qa`** (spec mục 9, bước 6–8).
  - **Đạt khi:**
    - trước khi merge một PR vào nhánh deploy một môi trường, đọc status `ao/qa` mới nhất do một login trong `AO_APPROVERS` đặt, trên commit đầu của nhánh đích;
    - `pending` còn mới thì chờ, đọc lại mỗi phút; `success` hay quá 10 phút không được đặt lại thì merge; in một dòng "Waiting #N: qa tests KEY on development";
    - status của login khác bị bỏ qua;
    - `merge-gate.yml` có `timeout-minutes: 120`;
    - `docs/quality-gates.md`, `docs/dev-workflow.md`; followup "approve khi QA đang chạy" được tick.
  - **File:** `lib/quality/merge-gate.mjs`, `scripts/merge-gate.mjs`, `kit/.github/workflows/merge-gate.yml`, tài liệu, test.

### Checkpoint 3: sau T12
- [ ] Sáu kit PR đã merge. Hỏi bạn trước T13, vì từ đây bắt đầu tốn tiền.

## Chép kit và chạy thật

- [ ] **T13 [bạn]: chép kit vào `shop`.** Một Task chép kit mang C2, T20b và Low 9 của review lần hai PR #79 (`json-ld.tsx` vào `sensitive_paths` của `shop`); review; `doctor` đạt; bạn merge.
- [ ] **T14 [bạn]: chạy thật bằng `/ao-run`** trên Epic kế tiếp của `shop` (bạn chọn tính năng), `lanes_max: 3`: các mục của spec mục 13; đo tiêu chí 7 của C1 trên cùng Epic.

## Đóng module

- [ ] **T15:** `verification.md` theo 6 tiêu chí của spec mục 15; hàng C2 của `concerns.md`; `tasks/todo.md`; memory. PR tài liệu.

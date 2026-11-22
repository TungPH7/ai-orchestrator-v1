# Batch sửa kit sau T14: finding của lần chạy thật SHOP-81 và việc còn mở của review PR #81

**Trạng thái:** đợt 1 đã merge (kit PR #339, `b5788d9`). Đợt 2 đang làm, trên nhánh `task/c2-t14-fix-2` (worktree `ao-t14-fixes`). Bạn bảo làm ở Phiên 35 · Lượt 37 ("Dừng làm SHOP-87 và SHOP-88, làm các finding và lỗi kit nhé").

**Nguồn:**
- 15 mục "Findings kit gom lại từ T14" và mục "Quan sát cho T15" ở [todo.md](todo.md), phần T14;
- mục "Còn mở sau review vòng ba" của [followups-pr80.md](followups-pr80.md): High `08bc0732`, bạn chấp nhận rủi ro tới 2026-12-15.

**Cách làm** (quyết định đã duyệt, Phiên 33, mục B):
- mỗi đợt một kit PR, test viết đỏ trước;
- phiên chính làm và tự merge khi CI xanh, 0 USD agent;
- chép kit vào `shop` một lần, sau đợt cuối, trong một Task chép kit có review (khoảng 15 USD). Hỏi bạn trước bước tốn tiền này;
- sau đó SHOP-85 (finding của `shop`) chạy bằng `/ao-run` trên bản kit mới.

## Đợt 1: dispatcher và `ao-step` (kit PR 1)

1. **Mua lại token GitHub sau mỗi lượt agent** (finding 2, bạn quyết ở Lượt 34).
   - Chỗ: `scripts/ao-step.mjs` (`installationToken` lúc bắt đầu), `lib/quality/github-app.mjs`, `lib/tracker/github-client.mjs`.
   - Sửa: `renewableToken(buy)` giữ token và `expiresAt`. Client GitHub nhận token là một hàm, và hỏi nó trước mỗi request. Token được mua lại sau mỗi lượt agent, và khi còn dưới 10 phút.
2. **Thử lại GET khi GitHub trả 500** (quan sát cho T15: `ao-step` thoát exit 1 sau một lần 500 trên `GET /pulls/82/reviews`).
   - Chỗ: `TRANSIENT` của `lib/tracker/github-client.mjs`. Chỉ GET; lệnh ghi vẫn gửi một lần.
3. **`qaReportResult` đọc báo cáo có tiền tố `<Agent>: `** (finding 3).
   - Chỗ: `lib/tracker/facts.mjs` (`qaReportResult`). Bỏ tiền tố tên role ở dòng đầu trước khi tìm `QA report`.
   - Bộ đọc thấy nhiều báo cáo hơn, nên hook (chặn QA report của role khác `qa`) cũng chặt hơn.
4. **QA fetch trước khi tạo worktree** (finding 4).
   - Chỗ: `addWorktree` của `scripts/ao-step.mjs`. Khi commit chưa có ở máy thì `git fetch --quiet origin` trước, như `renderCheck` và `lanes.mjs`.
   - Phần "dispatcher không chạy lại lệnh failed" giữ như thiết kế: STOP `fix` cần người xem. Sửa nguyên nhân thì lỗi này không còn.
5. **Không báo "waiting for you" cho item mà lệnh của nó còn chạy** (finding 6).
   - Chỗ: `planRound` của `lib/workflow/dispatch.mjs`. Item có lock sống thì không vào danh sách chờ.
6. **Chờ deploy thì không ghi "needs a fix: its PR is closed"** (finding 7).
   - Chỗ: board của `lib/workflow/facts.mjs` đọc thêm các PR đã merge gần đây; `nextCommand` (`lib/workflow/steps.mjs`) cho item In Review có PR đã merge chờ `deploy`, kèm câu nói jira-sync sẽ chuyển item sang Ready for QA khi Development chạy commit đó. PR đóng mà không merge vẫn là `fix`.
7. **`/ao-fix` xếp hàng chờ role dev** (finding 8).
   - Chỗ: `takeRunLock` trong `scripts/ao-step.mjs` không truyền role cho `fix`, nên `admit` không từ chối ngay; `claimRole` chờ role rảnh, như đường chờ đã có. Dispatcher vẫn không mở fix khi role bận, vì nó tự xét role.
8. **Item chờ bạn xem trước vẫn giữ WIP** (finding 9).
   - Quyết định: giữ nghĩa WIP của contract. Item có draft PR chờ bạn vẫn là việc đang làm. Đổi nghĩa WIP là đổi guard `wip-available` của Jira, lớn hơn lợi ích.
   - Sửa: câu STOP và dòng chờ của dispatcher nói rõ item nào giữ WIP, và nếu nó có draft PR chờ bạn thì bảo `/ao-preview` hay `/ao-review` nó. Muốn hai item cùng role chạy song song thì đặt `runs.agents_per_role`.
9. **`ao-step status --json` cho người theo dõi** (finding 13).
   - Thêm vào JSON đang có (`items`, `pulls`): `merged`, `running` (lệnh, item, slot, `startedAt`, lần cuối log agent được ghi), và `dispatcher`. Dispatcher vẫn đọc như cũ.
10. **Câu báo khi role dev phải chờ** (finding 14). `ao-step.mjs` và `claimRole` dùng cùng câu với `admit`: "a dev agent builds one item at a time", hoặc "runs.agents_per_role lets N … agents work at once".
11. **`/ao-status <KEY>` in dòng level khi level khác nhãn** (finding 15): ví dụ "Level of SHOP-86: heavy (label light; the PR touches a critical path)".

## Đợt 2: cổng CI (kit PR 2)

1. **Deployer chỉ deploy develop khi CI của commit merge xanh** (finding 1, bạn quyết ở Lượt 33).
   - Chỗ: `auditRange` và `readAuditFacts` của `lib/quality/audit.mjs`, `decideAudit`. Đọc thêm `readChecks` trên commit merge. CI còn chạy thì chờ lượt sau, CI đỏ thì không deploy và nói lý do.
   - Cập nhật deployer trên VPS (`vps/ao-deploy.service`, `scripts/ao-deploy.mjs`) theo cách cài đã có.
2. **QA đọc CI của commit merge** (finding 5). Prompt `qa`, `qa-defect` (`lib/workflow/prompts.mjs`) và `agents/prompts/qa.md`: CI của commit đang chạy trên môi trường là bằng chứng, không phải CI của head PR.
3. **Ruleset strict** (finding 12). Đề xuất không bật:
   - `shop` thuộc tài khoản cá nhân, nên GitHub không có merge queue;
   - strict buộc mọi PR khác cập nhật nhánh và chạy lại CI sau mỗi lần merge;
   - mục 1 và 2 đã chặn tổ hợp hỏng trước QA.

   Chỉ ghi lý do vào `docs/quality-gates.md`. Chờ bạn quyết.

## Đợt 3: plan và prompt (kit PR 3)

1. **`planEntry` nhận dạng `<KEY>: <tên>` của template** (finding 10), vẫn nhận `Task N:`.
2. **`sa` nhắc `runs.agents_per_role`** khi plan có từ hai item cùng role dev muốn chạy song song (finding 11): prompt `sa`, `templates/plan.md`.
3. **Đếm câu hỏi mở cho đúng** (quan sát T15). `openQuestions` của `lib/workflow/runs.mjs` không lấy ghi chép quyết định làm câu hỏi.
4. **Skill `ao-spec`**: câu trả lời kiểu "đồng ý theo khuyên" thì phiên chính chép kèm lời khuyên được trích (quan sát T15).

## Đợt 4: bảo mật còn mở từ review PR #81 (kit PR 4, trước 2026-12-15)

Các mục 1–7 của "Còn mở sau review vòng ba" ([followups-pr80.md](followups-pr80.md)): High `08bc0732` (`plainText` không idempotent), `@` trong prompt `-p`, U+0000, NFKC đổi chữ agent, giới hạn 12000 ký tự, Bash còn đặt biến, Low chữ cũ của PR #81. Lập threat model trước (memory `threat-model-before-paid-review`): liệt kê điểm tin cậy và ai chạm được chúng, sửa mọi finding kể cả Low, rồi mới trả tiền review.

## Sau các đợt

1. Task chép kit vào `shop`, review một lần (khoảng 15 USD). Hỏi bạn trước.
2. SHOP-85: refine (thêm việc của `sa` về AD6; `x-default` theo quyết định của bạn; test admin AC10 chập chờn), rồi `/ao-run`.
3. T15: đóng module C2.

## Đã làm

**Đợt 1** (nhánh `task/c2-t14-fix-1`, 1.810 test xanh). Mỗi mục có test viết đỏ trước:
1. `renewableToken` (`lib/quality/github-app.mjs`); client GitHub nhận token là hàm; `ao-step` mua lại sau mỗi lượt agent, trong `finally` của lượt đó. Lỗi khi mua lại chỉ ghi một dòng; lần đọc sau tự mua.
2. `TRANSIENT` có thêm 500.
3. `AGENT_BEFORE_REPORT` trong `qaReportResult`; hook từ chối báo cáo dạng này của role khác `qa` (thêm vào `REPORTS` của test hook).
4. `haveCommit(git, sha)` (`lib/workflow/places.mjs`), gọi trong `addWorktree`.
5. `planRound` bỏ item có lock sống khỏi danh sách chờ.
6. Board có `merged` (một trang 50 PR đóng gần nhất, chỉ của repo này). `nextCommand` cho item In Review có PR đã merge chờ `deploy`, cả ở board của dispatcher lẫn `/ao-status`.
7. `roleOnLock`: `fix` lấy lock không kèm role, rồi `claimRole` chờ.
8. `readWip` giữ `holders`; câu dừng nêu tên item giữ WIP và nhắc trường hợp PR nháp chờ xem trước.
9. `runningNow` (`lib/workflow/locks.mjs`); `status --json` có `merged`, `running`, `dispatcher`.
10. `roleBusyWhy` dùng chung cho `admit`, `claimRole` và câu chờ của `ao-step`.
11. `/ao-status <KEY>` in dòng "Level of" khi item có nhãn mức hay mức đã tăng.

Tài liệu: `docs/dev-workflow.md`, mục `/ao-run`.

**Đợt 2** (nhánh `task/c2-t14-fix-2`, 1.813 test xanh):
1. `decideTarget` có thêm hành động `wait`. Head của nhánh trong `CI_GATED` (`develop`) phải có CI xanh trên chính commit đó: CI đỏ thì `refuse`, CI còn chạy hoặc chưa bắt đầu thì `wait`. `tick` không đánh dấu head đang `wait` là đã thấy, nên phút sau xem lại. `readChecks` nhận `ignore`; `NOT_BRANCH_CI` bỏ `merge-gate` và `audit`, ngoài các job đã bỏ trước đó. `scripts/ao-deploy.mjs` gắn `readCi`.
   - `main` và `release/*` chưa bị chặn theo CI của head: bạn quyết cho `develop`. Muốn thêm thì thêm vào `CI_GATED`.
   - Bản kit ghim trên VPS chỉ đổi khi bạn bảo (`docs/vps-setup.md`, mục 12): chờ bạn.
2. Prompt `qa` và `qa-defect` (`ciEvidence`) cùng `agents/prompts/qa.md`: CI làm bằng chứng là CI của commit môi trường đang chạy (`gh run list --commit <sha>`), không phải CI của head PR.
3. Ruleset strict: chưa làm, chờ bạn quyết.

Tài liệu: `docs/release-workflow.md` (bảng môi trường, đoạn deployer, bảng status `error`).

# SPEC: human-loop

> **Module:** `human-loop`, gồm ba việc A3, A4 và A5 trong [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md). Làm sau A1 và trước `project-scaffold` (B1). **Sửa:** mục 2.1 và 2.8 của [SPEC-dev-workflow.md](SPEC-dev-workflow.md), mục 2.5 của [SPEC-release-workflow.md](SPEC-release-workflow.md).
>
> **Trạng thái:** đã duyệt 2026-11-11 (Phiên 27 · Lượt 120), cả 11 điểm ở mục 12. Hoàn thành 2026-11-12 (Lượt 147): kiểm thật trọn vòng trên `ao-sample` với Epic `SMP-23`, chi phí 54,08 USD. Plan, danh sách task và kết quả lưu ở [tasks/archive/human-loop/](tasks/archive/human-loop/verification.md). **Nguồn thảo luận:** [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md), Phiên 27 · Lượt 102–118; [misc/thao-luan/git-khi-dung-kit.md](misc/thao-luan/git-khi-dung-kit.md).

Tên module: các chỗ bạn lái agent giữa chừng, ngoài 5 cổng duyệt.

## 1. Mục tiêu

Hiện kit có ba chỗ hở, nơi bạn muốn lái agent mà không có lệnh:

1. **Trước spec.** Bạn phải tự tạo Epic trên Jira. Agent của `/ao-spec` chạy một mình, nên mỗi điều chưa rõ thành một mục Open Questions, và lệnh phải dừng rồi chạy lại. Muốn sửa SPEC hay plan trước khi duyệt, bạn không có lệnh nào. Comment `Cần ba:` / `Cần sa:` của agent chỉ hiện trong `/ao-status`; không lệnh nào chạy role được nhờ.
2. **Sau build.** `/ao-build` mở PR rồi dừng. Bạn không có cách thuận tiện để chạy thử UI và API ở máy mình. `/ao-fix` sửa xong là kéo theo `reviewer` và `security`, và item sang In Review ngay khi PR mở.
3. **Sau QA.** Bạn thấy lỗi khi item ở In QA nhưng không có lệnh đưa lỗi đó vào báo cáo QA, vì chỉ `qa` được bấm `QA fail`. Sau `QA fail`, Story có Sub-task bị kẹt ở `/ao-build` (`lib/workflow/steps.mjs:345`), còn item không có Sub-task được chạy với prompt "làm tiếp từ ledger", không nhắc báo cáo FAIL và không tách nhánh mới (`steps.mjs:352`).

Sau module này:

- `/ao-intake "<mô tả sơ khai>"` phỏng vấn bạn, phân loại việc theo contract, rồi tạo item trên Jira. Cú bấm `Start spec` vẫn là của bạn.
- `/ao-spec <EPIC> <yêu cầu sửa>` và `/ao-plan <EPIC> <yêu cầu sửa>` sửa SPEC hay plan trước khi bạn duyệt cổng.
- `/ao-request <KEY>` chạy role được nhờ qua comment `Cần ba:`, `Cần ux:` hay `Cần sa:`. `/ao-spec` và `/ao-plan` cũng tự chạy các yêu cầu đó trên Epic của mình.
- Dev agent mở PR nháp. `/ao-build` dừng chờ bạn xem trước, kèm ảnh màn hình và mẫu request, response của API.
- `/ao-preview <KEY>` chuyển thư mục dự án sang nhánh PR và bật app; `--stop` tắt app và về `develop`.
- `/ao-fix <PR> <yêu cầu>` trên PR nháp chỉ chạy dev agent. Tiền tố `be:` / `fe:` cho biết giao việc cho ai. Trước khi dev sửa, kit hỏi yêu cầu có đổi AC, hợp đồng API hay yêu cầu chung của Epic không.
- `/ao-review <PR>` chuyển PR nháp sang sẵn sàng rồi mới review.
- `/ao-qa <KEY> fail: <lỗi>` cho `qa` tái hiện lỗi bạn thấy rồi bấm `QA fail`.
- `/ao-build <KEY>` sau `QA fail` tách nhánh `-r2` từ `develop`, đưa báo cáo FAIL vào prompt, và chạy được cả Story có Sub-task.

**Ngoài phạm vi:**

- Chạy nhiều agent cùng lúc, worktree cho build (C2). `/ao-preview` dùng chính thư mục dự án (quyết định ở Lượt 111).
- Thứ tự chạy theo contract và role `seo` (C1).
- Cấu hình dự án, cổng lấy từ biến môi trường, profile React và Spring Boot (B1–B3). Module này thêm một file cấu hình nhỏ cho bước xem trước (4.3); B1 sẽ gộp file đó vào cấu hình dự án.
- Môi trường xem trước trên VPS cho từng PR (Lượt 111: deployer chỉ deploy code đã qua `audit`).
- Story mới cho một Epic đã qua gate ② (mục 3.1, điểm 1 ở mục 12).
- Đổi kit trên VPS. Module không đổi deployer hay `audit`.

## 2. Ba phần và thứ tự

| Phần | Việc | PR của kit | Cần xong trước |
|---|---|---|---|
| 1 | A3: intake, sửa SPEC và plan, `/ao-request` | Một PR | |
| 2 | A4: PR nháp, xem trước, `/ao-fix` theo `be:` / `fe:`, câu hỏi "đổi gì?" | Một PR | Phần 1 (dùng lại cơ chế note và `Cần <role>:`) |
| 3 | A5: `/ao-qa … fail:`, `/ao-build` sau `QA fail` | Một PR | Phần 2 (PR nháp, `be:` / `fe:`, `ba` commit AC lên nhánh của item) |

Mỗi phần merge riêng, có test, và để kit ở trạng thái dùng được. Kiểm thật chạy một lần sau phần 3, trên `ao-sample` (mục 10). Trước lượt kiểm, bản chép kit của `ao-sample` được cập nhật một lần, gồm cả A1.

## 3. Phần 1 (A3): intake, sửa SPEC và plan, trả lời yêu cầu

### 3.1 `/ao-intake "<mô tả sơ khai>"`

Lệnh chạy trong phiên chính, không gọi agent nào, nên chỉ tốn token của phiên bạn đang dùng.

1. **Kiểm.** Dòng `` !`node .ai-orchestrator/scripts/ao-step.mjs intake` `` không nhận đối số. Nó in:
   - space của dự án;
   - các Epic chưa xong, kèm trạng thái và tiêu đề, để phiên chính thấy việc trùng;
   - chỗ WIP `epic-shaping` đã dùng;
   - luật chọn loại (`work_type_selection`) và các quy ước item của contract.

   Mô tả của bạn nằm trong thân skill (`$ARGUMENTS`), như `/ao-fix`. Nó không đi qua dòng `!`.
2. **Phỏng vấn.** Phiên chính hỏi từng câu một theo `interview-me`, cho tới khi viết được item mà không phải đoán: cho ai, vấn đề gì, thế nào là xong, cái gì ngoài phạm vi, ràng buộc. Khi ý còn mơ hồ, hoặc bạn muốn xem vài phương án, nó dùng `idea-refine`. Skill này được chép vào kit, ghim theo commit như các skill khác. Bạn nói "đủ rồi" thì dừng hỏi.
3. **Phân loại** theo contract:
   - **Epic:** có hành vi người dùng thấy được, cần SPEC và plan.
   - **Task:** việc kỹ thuật, người dùng không thấy kết quả.
   - **Bug:** hành vi hiện có sai so với yêu cầu đã có.

   Intake không tạo Story. Theo DoR, Story phải thuộc một Epic có plan đã duyệt, và có AC trong SPEC, màn hình trong `design.md`, hợp đồng API trong plan. Phiên chính không viết được những thứ đó. Vì vậy:
   - Ý nhỏ cỡ một Story mà chưa có Epic thì thành một Epic nhỏ. Lượt spec và plan ngắn, [Ước] 2–4 USD.
   - Khả năng mới cho một Epic đã qua gate ② cũng thành một Epic nhỏ mới, có link `relates to` tới Epic cũ.
4. **Bản nháp.** Phiên chính viết `.ai/intake/<YYYYMMDD-HHmm>-<slug>.md` từ template `epic.md` (mới), `task.md` hoặc `bug.md`. Rồi nó cho bạn xem bản tóm tắt tiếng Việt: loại và lý do chọn loại, tiêu đề, phạm vi, các điểm còn mở. Bạn trả lời OK, hoặc nói chỗ cần sửa.
5. **Tạo item.** Khi bạn OK, phiên chính tạo item bằng `createJiraIssue` của MCP `atlassian`, với nội dung đúng bản nháp. Đây là lần ghi Jira duy nhất skill cho phép: không chuyển trạng thái, không sửa item khác.
   - Epic và Task để ở New.
   - Bug có thêm Found in, cùng Severity và Affects Version bạn đã duyệt trong bản tóm tắt. Fix Version để trống, vì nó được suy ra từ bảng định tuyến.
6. **Báo.** Phiên chính chạy `ao-step.mjs status <KEY>`, rồi in mã, link và cú bấm kế tiếp:
   - Epic: `Start spec`, rồi `/ao-spec <KEY>`;
   - Task, Bug: bạn xem lại, rồi bấm `Refine`, như contract quy định.

**Vì sao phiên chính tạo item qua MCP, không qua script:**
- Token của agent không ghi được qua REST; nó chỉ ghi được qua Rovo MCP.
- Token CI là của tài khoản `automation`, dành cho các bước theo dữ kiện.
- Rovo nhận markdown và tự đổi sang ADF, nên kit không phải viết bộ chuyển.

Item vì vậy đứng tên tài khoản agent, giống item `ba` tạo.

**Template `templates/epic.md`.** Các mục: Objective, Users, Scope (In / Out), Rough Stories, Constraints, Open Points, Original Request (mô tả gốc của bạn, nguyên văn). Contract thêm artifact `epic`. Prompt của `ba` đọc Open Points và Original Request: điều bạn đã trả lời ở intake thì không hỏi lại thành Open Questions.

### 3.2 Sửa SPEC và plan trước cổng

Bạn ghi yêu cầu sửa sau mã Epic. Skill ghi đoạn chữ đó nguyên văn vào `.ai/runs/<EPIC>/note.md`, rồi truyền bằng `--note`, giống `/ao-fix`.

**`/ao-spec <EPIC> <yêu cầu sửa>`.** Chạy khi Epic ở Specifying, SPEC đã commit, và không còn câu hỏi mở. Câu hỏi mở vẫn đi qua `--answers`.

1. `ba` sửa SPEC theo yêu cầu (lượt `spec-revise`):
   - AC bị bỏ giữ số và ghi "(bỏ)";
   - AC mới lấy số kế tiếp, không dùng lại số cũ.

   Nếu phần sửa chạm màn hình hay yêu cầu phi chức năng, `ba` comment `Cần ux:` hoặc `Cần sa:` trên Epic, ghi rõ phần cần sửa.
2. `ao-step` chạy các yêu cầu đó (mục 3.3).
3. Nếu PR tài liệu đã mở thì nhánh được push. Nếu chưa, `ba` mở PR như thường.
4. Lệnh dừng ở gate ①.

Epic đã qua `Approve spec` thì lệnh dừng: thay đổi đi thành Epic mới qua `/ao-intake` (Lượt 111).

**`/ao-plan <EPIC> <yêu cầu sửa>`.** Chạy khi Epic ở Planning, plan đã commit, và không còn câu hỏi mở.

1. `sa` sửa plan và ADR, commit rồi push (lượt `plan-revise`). Nếu Task List đổi, `sa` comment `Cần ba:` trên Epic, ghi rõ dòng nào đổi.
2. `ba` sửa item theo Task List mới: tạo item mới, sửa item còn ở New, sửa link và nhãn. `ba` không được hủy item, nên nó liệt kê item cần hủy trong comment, và bạn tự bấm `Cancel`.
3. Lệnh dừng ở gate ②.

Epic đã qua `Approve plan` thì lệnh dừng.

**Chung cho cả hai lệnh:**
- Cùng một yêu cầu chạy lại thì không làm lại, theo cách `/ao-fix` nhận ra một note đã xong.
- [Ước] mỗi lần sửa tốn 0,5–1,5 USD.

### 3.3 `/ao-request <KEY>`: chạy role được nhờ

- Lệnh chạy các yêu cầu `Cần ba:`, `Cần ux:` và `Cần sa:` còn mở trên item, cũ trước. Mỗi yêu cầu là một lượt của role được nhờ. Luật "yêu cầu xong khi role đó comment sau nó" giữ nguyên (`lib/workflow/requests.mjs`).
- Comment của bạn mở đầu bằng `Cần ba:` cũng tính, vì nó là yêu cầu không có tên Agent. Nhờ vậy bạn nhờ được `ba` trên bất kỳ item nào: viết comment trên Jira, rồi gõ `/ao-request <KEY>`.
- **Chỗ làm việc:**
  - Epic ở Specifying hay Planning: agent làm trên nhánh tài liệu của Epic, commit, và push khi PR tài liệu đã mở.
  - Mọi trường hợp khác: thư mục đứng ở `develop`, và agent chỉ làm trên Jira. Prompt dặn: không commit; nếu yêu cầu cần sửa một tài liệu đã merge thì ghi rõ trong comment trả lời và gắn cờ Needs you.
- `/ao-spec` và `/ao-plan` chạy các yêu cầu còn mở trên Epic của mình trước khi dừng ở cổng. Ví dụ, `ux` hỏi `ba` trong lúc làm spec thì được trả lời ngay trong cùng lệnh.
- Yêu cầu gửi dev role hay `qa` không chạy bằng lệnh này. `/ao-status` vẫn liệt kê chúng như hiện nay.
- Hai role nhờ qua lại nhau thì vòng chạy dừng ở trần 8 lượt mỗi lệnh (`LIMITS.maxRuns`), hoặc khi một lượt xong mà yêu cầu vẫn mở.
- `ux` được thêm quyền comment trên Jira (Lượt 122, bạn chọn cách A). Trước đó `ux` chỉ đọc Jira, nên không trả lời được, và một yêu cầu `Cần ux:` không bao giờ đóng.

## 4. Phần 2 (A4): xem trước giữa build và review

### 4.1 PR nháp

- `ao-pr.mjs create` mở PR nháp cho nhánh work item (`feature/`, `bugfix/`, `hotfix/`). Nhánh tài liệu `feature/<EPIC>-spec` (`docs_pull_requests.branch`) và các PR do script mở (release, merge ngược) không đổi. Dev agent không phải nhớ một cờ nào.
- Guard `pr-open` (`lib/tracker/facts.mjs`) bỏ qua PR nháp. Vì vậy `submit` chưa chạy, và item ở lại In Progress. `jira-sync` đã nghe sự kiện `ready_for_review`, nên PR chuyển sang sẵn sàng thì item sang In Review.
- `merge-gate` đã từ chối PR nháp (`merge-gate.mjs:203`); giữ nguyên.
- CI chạy trên PR nháp như thường. `ao-sample` là repo private và đã có PR nháp #2, nên gói GitHub hiện tại cho phép PR nháp.
- Xem trước không tính là Rework: item không qua `Request changes`.

### 4.2 `/ao-build` dừng chờ xem trước

Trước khi mở PR, dev agent để lại bằng chứng xem trước trong `.ai/runs/<KEY>/preview/`:

- **`fe-dev`:** ảnh mỗi màn hình mình làm, ở mỗi cỡ màn hình của `design.md`, đặt tên theo mã màn hình (`S1-mobile.png`, `S1-desktop.png`). Ảnh chụp bằng Chrome DevTools, trong bước nó vẫn làm để xem trang.
- **`be-dev`:** `api.md` liệt kê mỗi endpoint mình làm, kèm một request mẫu và response nhận được từ server ở máy, chỉ dùng dữ liệu thử.

Story có Sub-task thì mỗi agent để lại phần của mình. `.ai/` không được commit, nên các file này chỉ nằm trên máy bạn.

`/ao-build` dừng với lý do "PR nháp #N của KEY chờ bạn xem trước". Lệnh kế tiếp là `/ao-preview <KEY>`, hoặc `/ao-review <N>` nếu bạn bỏ qua bước xem trước. Skill liệt kê các file xem trước trong phần báo.

### 4.3 `/ao-preview <KEY>` và `/ao-preview <KEY> --stop`

Lệnh không gọi agent, tốn 0 USD. Nó dùng chính thư mục dự án, không tạo worktree.

**Cấu hình.** Dự án khai các app cần bật trong file `.ai-orchestrator/preview.yaml`, xếp theo thứ tự bật. Ví dụ cho `ao-sample`:

```yaml
# Các app /ao-preview bật, theo thứ tự. B1 gộp file này vào cấu hình dự án.
apps:
  api:
    command: npm run start:dev -w apps/api
    url: http://localhost:3001/health
  web:
    command: npm run dev -w apps/web
    url: http://localhost:3000/
    env: { API_URL: "http://localhost:3001" }
```

File này thuộc nhóm "Của dự án" trong `kit_copy` của `quality/gates.yaml`. Thiếu file thì lệnh dừng và in mẫu trên. Lệnh của mỗi app là `npm` hoặc `node` cùng các từ thường, và `ao-step` chạy nó không qua shell: job `sast` của `ao-sample` PR #21 chặn `spawn` có `shell: true` (T19). Dấu nháy, `|`, `&&`, `>` và biến môi trường vì vậy bị từ chối.

**Kiểm** (`ao-step.mjs preview <KEY>`). Lệnh chỉ chạy khi đủ các điều kiện sau:
- Item có PR đang mở, nháp hay sẵn sàng đều được.
- PR không sửa đường dẫn được bảo vệ. Trong lúc xem trước, mọi lệnh `/ao-*` chạy kit và hook của thư mục dự án. PR sửa `.ai-orchestrator/`, `.claude/` hay `.githooks/` thì bạn đọc thay đổi trong diff, không chạy. Từ review của `ao-sample` PR #21: file chỉ dẫn ở mọi tầng (`CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, `.claude/` lồng trong thư mục con) cũng bị từ chối, và đường dẫn được bảo vệ được so không phân biệt hoa thường.
- PR là nhánh của chính repo, không từ fork, và CI xanh trên head.
- Không agent nào đang chạy (khóa `active.json`).
- Thư mục sạch.
- Các cổng trong `url` còn trống.

Lệnh in nhánh, head, và có cần cài lại package không.

**Chạy** (`--go`):
1. Chuyển thư mục sang nhánh PR, rồi `merge --ff-only` từ GitHub, bằng `prepareCheckout`.
2. Chạy `npm ci --ignore-scripts` khi `package-lock.json` của head khác bản đã cài lần trước. Hash của bản đã cài lưu ở `.ai/preview/state.json`; chưa có hash thì chạy. Lượt 111 ghi "khác `develop`", nhưng so với bản đang cài thì đúng hơn, vì `develop` cũng thay đổi.
3. Bật từng app, ghi log vào `.ai/preview/<app>.log`, và chờ `url` trả 2xx hoặc 3xx, tối đa 2 phút. Môi trường của app không có các biến bí mật (`CLEARED_ENV`), như worktree của `qa`.
4. Ghi `.ai/preview/active.json` gồm item, PR, nhánh, head và pid. In URL. Server chạy tách khỏi `ao-step`, nên lệnh kết thúc mà app vẫn chạy.

**Dừng** (`--stop`):
1. Tắt cả cây tiến trình của từng app (`killTree`), rồi xóa `active.json`.
2. Đưa thư mục về `develop`. Nếu thư mục có file sửa dở, lệnh không chuyển nhánh mà nhắc bạn `git restore` hoặc `git stash` trước.

**Lệnh khác trong lúc xem trước.**
- `/ao-fix`, `/ao-review`, `/ao-build`, `/ao-spec`, `/ao-plan`, `/ao-request` và `/ao-qa` thấy `active.json` thì tự làm bước `--stop` trước.
- Lúc đó `ao-step` đang chạy là bản của nhánh PR. Vì vậy, sau khi về `develop`, nó chạy lại chính nó từ `develop`, để kit đã duyệt quyết định. Đây là một nhánh mới của `checkoutStop`.
- `/ao-status` chỉ đọc, và in "đang xem trước <KEY>".

### 4.4 `/ao-fix` trên PR nháp, giao việc theo `be:` / `fe:`

**PR nháp:** `/ao-fix <PR> <yêu cầu>` chỉ chạy dev agent, không chạy review. Xong thì lệnh dừng, với lệnh kế tiếp là `/ao-preview <KEY>` để xem lại, hoặc `/ao-review <PR>`. CI đỏ trên PR nháp cũng sửa theo cách này. Dev agent cập nhật ảnh và `api.md` cho phần vừa sửa.

**Tiền tố.** Một đoạn mở đầu bằng `be:` hay `fe:` (không phân biệt hoa thường) được giao cho `be-dev` hay `fe-dev`. Đoạn đó kéo dài tới tiền tố kế tiếp. Ví dụ:

```text
/ao-fix 22 be: API trả thêm trường updatedAt
fe: hiện updatedAt dưới tiêu đề, dạng "2 phút trước"
```

- Có cả hai tiền tố thì `be-dev` chạy trước, rồi tới `fe-dev`. Mỗi agent nhận phần của mình, kèm phần kia để biết bên kia sẽ làm gì.
- Không có tiền tố:
  - item chỉ có một dev role thì giao cho role đó;
  - Story có Sub-task cả BE và FE thì lệnh dừng, và nhờ bạn ghi tiền tố cho từng phần.
- Tiền tố cũng dùng được trên PR đã sẵn sàng: nó chọn agent, rồi review chạy như cũ.
- Các lần sửa theo finding hay theo CI, không có yêu cầu của bạn, giữ cách chọn agent như hiện nay.

### 4.5 Hỏi "yêu cầu này đổi gì?" trước khi dev sửa

Mỗi khi `/ao-fix` có yêu cầu của bạn, phiên chính đọc yêu cầu cùng AC của item, rồi hỏi bạn một câu, kèm câu trả lời nó đề xuất. Bạn trả lời "ok" hoặc chọn lại. Lựa chọn của bạn đi vào lệnh bằng một từ, `--change <loại>`, được kiểm dạng; chữ bạn viết không bao giờ đi vào shell.

| Loại | Việc chạy trước dev agent |
|---|---|
| `none`: không đổi | Không có |
| `ac`: đổi AC | `ba` sửa AC trên item. Nó comment AC cũ và AC mới; AC mới lấy số kế tiếp của Epic, số cũ không dùng lại. Rồi nó commit phần sửa `spec.md` lên nhánh của PR (Lượt 113) |
| `api`: đổi hợp đồng API | `sa` sửa mục API Contract của `plan.md` trên nhánh của PR |
| `epic`: đổi yêu cầu chung của Epic | `sa` sửa SPEC (yêu cầu phi chức năng), plan hoặc ADR trên nhánh của PR. Nó liệt kê các item khác bị ảnh hưởng trong một comment trên Epic; bạn quyết với từng item |
| `story`: Task thành Story | `ba` đổi loại item sang Story, viết lại mô tả theo `story.md` với AC mới, và thêm các AC đó vào `spec.md` trên nhánh của PR. Task không thuộc Epic thì lệnh dừng: tạo Epic nhỏ bằng `/ao-intake` |

Có ba trường hợp lệnh dừng và không sửa trên PR này (Lượt 116):
- khả năng mới;
- đổi chính kết quả mong đợi của một Bug;
- đổi hướng cả Epic.

Cả ba đi qua `/ao-intake`.

Commit của `ba` hay `sa` nằm trong PR của item, nên `reviewer` thấy nó, và nó vào `develop` cùng code. Luật PR tài liệu của `merge-gate` không đổi.

### 4.6 `/ao-review` chuyển PR sang sẵn sàng

- Gặp PR nháp, bước đầu của `/ao-review` là một bước script: đánh dấu PR sẵn sàng bằng App `ao-dev`. REST API không làm được việc này, nên bước này gọi mutation GraphQL `markPullRequestReadyForReview`. Bước này không gọi agent. Token của bước này xin `pull_requests: write` và `contents: write`, hai quyền App đã có: chỉ xin quyền đầu thì GitHub từ chối (T2, tiền đề 3).
- `jira-sync` chạy theo `ready_for_review`. Khi CI xanh, item sang In Review.
- Rồi `reviewer` và `security` chạy như cũ.
- Muốn bỏ qua bước xem trước thì gõ thẳng `/ao-review`.

### 4.7 `/ao-status` và lệnh kế tiếp

`nextFor` của item In Progress có PR nháp là `/ao-preview <KEY> hoặc /ao-review <PR>`. `/ao-status` không còn bỏ qua PR nháp, mà ghi chúng là "nháp".

## 5. Phần 3 (A5): sửa lỗi tìm thấy khi QA

Phần này giữ luật của contract: lỗi tìm thấy khi QA một item chưa Done thì không tạo Bug. Item quay về In Progress qua `QA fail`, và được sửa trên nhánh mới tách từ `develop`, vẫn mang mã item cũ.

### 5.1 `/ao-qa <KEY> fail: <lỗi, cách tái hiện, kết quả mong đợi>`

- Chữ sau `fail:` vào `.ai/runs/<KEY>/note.md`, rồi truyền bằng `--note`.
- **Trạng thái nhận lệnh:**
  - **Ready for QA:** bạn thấy lỗi trước khi `qa` chạy. `qa` làm QA đầy đủ, cộng lỗi của bạn.
  - **In QA:** sau báo cáo PASS của `qa`, trước khi bạn bấm `Accept`.
- **Phiên chính hỏi bạn trước**, như mục 4.5, kèm đề xuất:
  - **Lỗi vi phạm một AC của item** (`--change none`): `qa` chạy ở lượt `qa-defect`.
  - **Mong đợi mới, chưa có trong AC** (`--change ac`): trước tiên `ba` thêm hoặc sửa AC trên Story, chỉ trên Jira, và comment AC cũ và mới. `spec.md` được sửa ở lần build sau (mục 5.2). Rồi `qa` chạy, và AC mới FAIL vì chưa có code và E2E test.
  - **Lỗi nằm ngoài item:** lệnh dừng. Bạn tạo Bug bằng `/ao-intake`.
- **Lượt `qa-defect`:**
  - `qa` tái hiện lỗi trên môi trường QA của item, theo các bước bạn ghi, và chụp bằng chứng. Basic auth đi qua biến môi trường như hiện nay.
  - **Tái hiện được:** `qa` viết báo cáo QA với Result FAIL. Mỗi AC bị vi phạm có một dòng FAIL kèm bằng chứng, và mục Notes ghi "lỗi do bạn báo". Rồi `qa` bấm `QA fail`.
  - **Không tái hiện được:** `qa` không bấm fail. Nó comment những gì đã thử, rồi gắn cờ Needs you.
- [Ước] mỗi lượt tốn 1–2 USD.

### 5.2 `/ao-build <KEY>` sau `QA fail`

**Nhận ra.** Lệnh nhận ra lần sửa sau `QA fail` khi đủ ba điều:
- item ở In Progress;
- PR mới nhất của item đã merge;
- báo cáo QA mới nhất của item có Result FAIL.

`facts` đọc thêm báo cáo đó, bằng cách đọc kết quả QA mà `jira-sync` đang dùng.

**Nhánh.** Trước lượt đầu, `ao-step` tạo nhánh mới từ `origin/develop`. Nhánh giữ slug cũ, thêm hậu tố `-r<N+1>`, ví dụ `feature/SMP-21-xoa-ghi-chu-r2`. `parseBranch` và `work-committed` đã hiểu hậu tố này.

**Các lượt chạy:**
1. **`ba` lượt `spec-sync`**, chỉ khi `.ai/runs/<KEY>/state.json` có một lượt `ba` sửa AC (5.1) sau lúc PR cũ merge. `ba` commit phần sửa AC vào `spec.md` trên nhánh mới.
2. **Dev agent**, mỗi bên có lỗi một lượt, BE trước:
   - Item chỉ có một dev role thì giao cho role đó.
   - Story có Sub-task cả BE và FE thì phiên chính cho bạn xem danh sách lỗi trong báo cáo FAIL, đề xuất cách chia theo `be:` / `fe:`, và ghi cách chia bạn duyệt vào `note.md`. Cách đọc tiền tố giống mục 4.4.
   - Sub-task đã Done giữ nguyên, vì workflow của Sub-task không cho mở lại. Lượt chạy làm ở mức Story.
   - Prompt mới, `rebuild`: "KEY failed QA: fix the defects of the QA report of <thời điểm> (comment of Tester/QA Engineer). The branch … is checked out, new from develop. Write a failing test for each defect first. Your part: …. The last of you opens the PR." Prompt chỉ trỏ tới báo cáo, không chép chữ của báo cáo vào: agent tự đọc báo cáo trên Jira, như một dữ liệu.
   - Từ Rework 2 trở lên, dev agent chạy ở ít nhất `xhigh` (`REWORK_FLOOR`), như `/ao-fix`.
3. **Phần sau đi như thường lệ:** PR nháp, xem trước, review, gate ③, deploy, rồi `/ao-qa` lại. `qa` kiểm lại toàn bộ AC.

**Sửa hai chỗ đang hỏng:**
- Story có Sub-task không còn kẹt ở `steps.mjs:345`.
- Prompt `build-again` chỉ dùng cho lượt dừng giữa chừng trên nhánh của nó, không dùng sau `QA fail`.

**Giới hạn Rework.** `QA fail` tăng Rework. Chạm 3 thì item bị gắn cờ, như hiện nay.

## 6. Lệnh

| Lệnh | Mới hay sửa | Gọi agent | Kết thúc khi |
|---|---|---|---|
| `/ao-intake "<mô tả>"` | Mới | Không | Item đã tạo trên Jira, ở New |
| `/ao-spec <EPIC> <yêu cầu sửa>` | Sửa | `ba`, rồi `ux` / `sa` khi được nhờ | Gate ① |
| `/ao-plan <EPIC> <yêu cầu sửa>` | Sửa | `sa`, rồi `ba` khi Task List đổi | Gate ② |
| `/ao-request <KEY>` | Mới | `ba`, `ux` hoặc `sa` | Hết yêu cầu mở gửi ba role đó |
| `/ao-build <KEY>` | Sửa | Dev agent; `ba` khi AC đổi sau `QA fail` | PR nháp mở, CI xong |
| `/ao-preview <KEY> [--stop]` | Mới | Không | App chạy và in URL; hoặc đã tắt và về `develop` |
| `/ao-fix <PR> <yêu cầu>` | Sửa | `ba` / `sa` theo `--change`, rồi dev agent; review chỉ khi PR đã sẵn sàng | Như cũ; PR nháp thì dừng sau dev |
| `/ao-review <PR>` | Sửa | Script đánh dấu sẵn sàng, rồi `reviewer`, `security` | Như cũ |
| `/ao-qa <KEY> fail: <lỗi>` | Sửa | `ba` khi mong đợi mới, rồi `qa` | Item ở In Progress qua `QA fail`, hoặc bị gắn cờ |

`ao-step.mjs` nhận thêm `intake`, `request`, `preview`, cờ `--stop`, và `--change none|ac|api|epic|story`. Đối số vẫn được kiểm như hiện nay: chỉ mã item, số PR hoặc một từ cố định đi vào dòng lệnh.

## 7. Cấu trúc

```text
kit/.claude/skills/ao-intake/, ao-request/, ao-preview/   # ba skill mới
kit/.claude/skills/ao-spec/, ao-plan/, ao-fix/, ao-qa/, ao-build/  # note, câu hỏi "đổi gì", chia be:/fe:
kit/.claude/skills/idea-refine/                           # chép từ agent-skills, ghim commit (SOURCE.md)
lib/workflow/steps.mjs        # decideIntake, decideRequest, decidePreview; note ở decideSpec, decidePlan; nháp và tiền tố ở decideFix; rebuild ở decideBuild; fail ở decideQa
lib/workflow/notes.mjs        # tách tiền tố be:/fe: (hàm thuần)
lib/workflow/prompts.mjs      # spec-revise, plan-revise, request, ac-revise, api-revise, to-story, spec-sync, rebuild, qa-defect
lib/workflow/facts.mjs        # yêu cầu mở của item, báo cáo QA mới nhất, nhánh kế tiếp, PR nháp
lib/workflow/preview.mjs      # đọc preview.yaml, hash lockfile, trạng thái xem trước (thuần)
lib/tracker/facts.mjs         # pr-open bỏ qua PR nháp
lib/quality/ao-pr.mjs         # create mở PR nháp cho nhánh work item
scripts/ao-step.mjs           # lệnh mới, bật và tắt app, chạy lại từ develop, đánh dấu PR sẵn sàng
agents/prompts/ba.md, sa.md, fe-dev.md, be-dev.md, qa.md   # các lượt mới, bằng chứng xem trước
templates/epic.md             # mới
contract/policies.yaml        # artifact epic; docs/sdlc.md sinh lại
quality/gates.yaml            # preview.yaml vào nhóm "Của dự án"
docs/dev-workflow.md, docs/release-workflow.md, README.md
tests/                        # test của từng phần trên
tasks/                        # plan, todo, verification
```

## 8. Chiến lược test

Test viết trước, bằng `node:test`, theo mẫu test của `decideStep`.

- **`decideStep`:** mỗi lệnh mới hay sửa có một trường hợp `GO`, và mỗi điều kiện dừng có một trường hợp `STOP`. Các trường hợp cần có:
  - note trước và sau cổng;
  - note đã xong thì không làm lại;
  - yêu cầu `Cần` của agent và của bạn;
  - vòng nhờ qua lại dừng ở trần;
  - PR nháp ở `/ao-build`, `/ao-fix`, `/ao-review`;
  - đủ năm loại `--change`;
  - Task không thuộc Epic;
  - `QA fail` với Story có Sub-task và với item không có Sub-task;
  - tên nhánh `-r2` và `-r3`;
  - `spec-sync` chạy hay không chạy;
  - Rework 2 thì `xhigh`;
  - `/ao-qa … fail:` ở Ready for QA, ở In QA, và ở trạng thái khác.
- **`notes.mjs`:** tách tiền tố; chữ hoa thường; một bên; không có tiền tố; tiền tố nằm giữa dòng thì không tính.
- **`pr-open`:** PR nháp không đạt guard; PR sẵn sàng thì đạt.
- **`ao-pr create`:** nhánh work item thì nháp; nhánh tài liệu thì không.
- **`preview.mjs`:** đọc cấu hình, cổng bận, hash lockfile, PR sửa đường dẫn được bảo vệ, thư mục bẩn.
- **`checkArgument`:** các lệnh mới và `--change`.
- **Skill:** frontmatter của các lệnh mới có `disable-model-invocation: true`, và gọi đúng `ao-step.mjs`.

Phần bật app, tắt cây tiến trình và GraphQL được kiểm ở kiểm thật (mục 10), vì chúng chạm tiến trình thật và GitHub.

## 9. Ranh giới

**Luôn làm:**
- dừng thay vì đoán, khi không rõ ai làm hay item đang ở đâu;
- chữ của bạn chỉ đi qua file trong `.ai/runs/`, không bao giờ vào shell;
- trả thư mục về `develop` trước khi agent chạy;
- cú bấm ở các cổng và `Start spec`, `Refine`, `Accept`, `Cancel` vẫn là của bạn.

**Hỏi bạn trước:**
- đổi luật của contract ngoài guard `pr-open`;
- xin thêm quyền cho App: theo mình đọc, `ao-dev` đã có quyền ghi PR, nên không cần;
- đổi kit trên VPS;
- chạy kiểm thật quá ngân sách ở mục 10.

**Không làm:**
- agent tự chuyển item sang Done;
- tạo Bug cho lỗi tìm thấy khi QA một item chưa Done;
- môi trường xem trước trên VPS;
- xem trước PR sửa đường dẫn được bảo vệ;
- script approve hay merge PR;
- chạy hai agent cùng lúc.

## 10. Tiêu chí hoàn thành

1. Ba PR của kit đã merge, CI xanh. `npm run validate`, `npm test` và `npm run agents:check` xanh.
2. **Tiền đề, kiểm ở task đầu** trên `ao-sample`, trước khi viết code:
   1. phiên chính tạo được Epic bằng `createJiraIssue`, `jira-guard` cho qua, và mô tả markdown hiện đúng trên Jira;
   2. `editJiraIssue` của Rovo MCP đổi được Task thành Story (Story và Task cùng workflow AO standard). Nếu không được, lượt `to-story` dừng và hướng dẫn bạn đổi bằng tay, từng bước bấm;
   3. token của `ao-dev` gọi được `markPullRequestReadyForReview`; sự kiện `ready_for_review` chạy `jira-sync`, và item sang In Review;
   4. trên Windows, `killTree` tắt hết tiến trình con của `next dev` và `nest start --watch`.

   Tiền đề nào sai thì mình sửa spec, và bạn duyệt bản sửa.
3. **Kiểm thật một lần sau phần 3**, trên `ao-sample` với một Epic nhỏ mới. Trước đó, bản chép kit của `ao-sample` được cập nhật, kèm A1; bạn merge vì PR sửa đường dẫn được bảo vệ. Lượt kiểm đi qua:
   1. `/ao-intake` → `Start spec` → `/ao-spec` → `/ao-spec <EPIC> <sửa>` → gate ① → `/ao-plan` → `/ao-plan <EPIC> <sửa>` → gate ② → item sang Ready;
   2. một `Cần ba:` chạy bằng `/ao-request`;
   3. `/ao-build` một Story có cả FE và BE → PR nháp có ảnh và `api.md` → `/ao-preview` → `/ao-fix` có `be:` và `fe:`, một lần với `--change ac` → `/ao-review` (PR sẵn sàng, item sang In Review) → gate ③ → merge → deploy;
   4. `/ao-qa <KEY> fail: …` → `QA fail` → `/ao-build` trên nhánh `-r2` → review → merge → `/ao-qa` PASS → bạn `Accept`.

   [Ước] tốn 25–35 USD và hai khung 5 giờ của gói Pro. Mọi lượt có số đo trong `.ai/runs/`. Con số này chưa tính lượt review đầy đủ của PR chép kit vào `ao-sample` (bản kit mới chưa dự án nào review, theo `kit-copy-review`), [Ước] thêm 10–16 USD (ghi thêm khi viết plan, Lượt 120).
4. Tài liệu được cập nhật:
   - `docs/dev-workflow.md` có các lệnh mới và một ví dụ đi trọn vòng;
   - `docs/release-workflow.md` có `/ao-qa … fail:`;
   - README có danh sách lệnh;
   - `SPEC.md` có module này;
   - `concerns.md` ghi A3, A4, A5 là Xong.

## 11. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Xem trước là chạy code chưa review trên máy bạn, dưới user Windows của bạn | Bạn chọn khi gõ lệnh. Kit giảm rủi ro: `--ignore-scripts`, bỏ biến bí mật khỏi môi trường của app, từ chối PR sửa đường dẫn được bảo vệ. Code độc cố ý trong app thì vẫn đọc được file của bạn khi app chạy; `reviewer` và `security` chỉ đọc code sau bước này |
| Phiên chính viết lên Jira khác bản nháp bạn đã duyệt | Skill chỉ cho một lần ghi, từ file nháp. `ao-step.mjs status <KEY>` in lại item để bạn so |
| Bạn sửa file trong lúc xem trước, rồi quên | `--stop` không chuyển nhánh khi thư mục bẩn, và các lệnh khác cũng dừng |
| `ba` sửa AC sai ý bạn | Comment AC cũ và mới nằm trên item. Commit sửa `spec.md` nằm trong PR, nên `reviewer` và bạn ở gate ③ đều thấy |
| Hỏi "đổi gì?" mỗi lần sửa thì thêm một lượt chat | Phiên chính đề xuất sẵn; bạn chỉ trả lời "ok" |
| Story có Sub-task được làm lại ở mức Story, nên WIP `dev-agent` không đếm lượt này | Kit chạy mỗi lần một agent, nên chưa vượt được. C2 sẽ xem lại khi có chạy song song |
| Tốn usage của gói Pro | Mỗi lượt có số đo. Bước xem trước chặn sai hướng trước một vòng review, nên có thể bớt chi phí |

## 12. Điểm cần bạn duyệt

Mình tự chốt các điểm dưới đây khi viết spec. Bạn duyệt spec là duyệt luôn các điểm này; muốn đổi điểm nào thì nói số của điểm đó.

1. **Intake không tạo Story** (3.1). Khả năng mới, kể cả cho một Epic đã qua gate ②, thành một Epic nhỏ. Điểm này sửa ý "khả năng mới thì thành Story mới" ở Lượt 116, vì Story cần AC trong SPEC, màn hình và hợp đồng API, mà phiên chính không viết được.
2. **Phiên chính tạo item qua Rovo MCP**, đứng tên tài khoản agent, không qua script (3.1).
3. **Tên lệnh `/ao-request <KEY>`**, và `/ao-spec`, `/ao-plan` cũng tự chạy các yêu cầu trên Epic (3.3).
4. **`ao-pr.mjs create` tự mở PR nháp** cho nhánh work item, không cần cờ (4.1).
5. **Cấu hình xem trước nằm ở `.ai-orchestrator/preview.yaml`**, một file mới mà B1 sẽ gộp vào cấu hình dự án (4.3).
6. **`npm ci` chạy khi lockfile khác bản đã cài**, thay cho "khác `develop`" (4.3).
7. **Không xem trước PR sửa đường dẫn được bảo vệ**, và `ao-step` chạy lại chính nó từ `develop` sau khi tự dừng xem trước (4.3).
8. **Câu hỏi "đổi gì?" hỏi mỗi lần `/ao-fix` có yêu cầu của bạn**, kèm đề xuất (4.5).
9. **`ba` commit phần sửa AC lên nhánh của item:** nhánh của PR ở A4, và lượt đầu trên nhánh `-r2` ở A5 (4.5, 5.2).
10. **Làm lại sau `QA fail` ở mức Story;** Sub-task đã Done không mở lại (5.2).
11. **Kiểm thật một lần sau phần 3,** trên `ao-sample`, [Ước] 25–35 USD (mục 10).

## Nguồn

- `misc/thao-luan/concerns.md`, hàng A3, A4, A5 và concern 5–7.
- `misc/brainstorm-discussion.md`, Phiên 27 · Lượt 102–118.
- `lib/workflow/steps.mjs`, `scripts/ao-step.mjs`, `lib/tracker/facts.mjs`, `lib/quality/ao-pr.mjs`, `contract/workflows.yaml`, `contract/routing.yaml` ở `main` (`c6a7de5`).
- [GitHub GraphQL: markPullRequestReadyForReview](https://docs.github.com/en/graphql/reference/mutations#markpullrequestreadyforreview).

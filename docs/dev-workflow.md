# Dev workflow: các lệnh `/ao-*` của vòng trong

> **Spec:** [SPEC-dev-workflow.md](../SPEC-dev-workflow.md), và [SPEC-human-loop.md](../SPEC-human-loop.md) cho `/ao-intake`, `/ao-request` và phần sửa SPEC, plan trước cổng. Tài liệu này dành cho bạn. Nó trả lời bốn câu hỏi: gõ lệnh nào để đưa một Epic từ mô tả sơ khai tới merge vào `develop`, lệnh dừng khi nào, đọc kết quả ở đâu, và làm gì khi một lượt chạy bị ngắt. Số đo lấy từ Epic thử DEMO-20 trên `ao-pilot`, ghi trong [tasks/archive/dev-workflow/verification.md](../tasks/archive/dev-workflow/verification.md) (T17, T18).

## Các lệnh

Mỗi lệnh là một skill của Claude Code trong `.claude/skills/ao-*/`. Mỗi lệnh chạy theo hai bước:

1. Dòng kiểm chạy `node .ai-orchestrator/scripts/ao-step.mjs <lệnh> <đối số>`. Dòng này chỉ đọc Jira, GitHub và `.ai/`, rồi in `GO` kèm các lượt agent sẽ chạy, hoặc `STOP` kèm lý do và việc cần làm.
2. Khi kết quả là `GO`, Claude chạy cùng lệnh với `--go` ở nền, chờ nó xong, rồi đọc `.ai/runs/<KEY>/last.md` và báo bạn bằng tiếng Việt.

Claude của phiên chính không tự mở agent, cũng không tự sửa Jira hay GitHub. Ngoại lệ duy nhất là `/ao-intake`: phiên chính tạo đúng một item trên Jira, sau khi bạn OK bản nháp.

| Lệnh | Đối số | Agent chạy | Dừng ở |
|---|---|---|---|
| `/ao-status` | Không có, hoặc `<KEY>` | Không | Việc đang chờ bạn, lệnh tiếp theo của từng item, yêu cầu giữa các vai trò, chi phí |
| `/ao-intake` | `<mô tả sơ khai>` | Không. Phiên chính phỏng vấn bạn, phân loại việc, viết bản nháp vào `.ai/intake/` | Item mới ở New: một Epic, một Task hoặc một Bug |
| `/ao-spec` | `<EPIC>` ở Specifying, thêm `[sửa]` khi muốn sửa SPEC | `ba` viết SPEC, `ux` viết `design.md` khi SPEC có màn hình, `sa` thêm yêu cầu phi chức năng, rồi `ba` push nhánh tài liệu và mở PR tài liệu. Có `[sửa]` thì `ba` sửa SPEC | Câu hỏi mở, hoặc gate ① `spec-approval` |
| `/ao-plan` | `<EPIC>` ở Planning, thêm `[sửa]` khi muốn sửa plan; rồi lần nữa sau gate ② | `sa` viết plan và ADR, `sa` đánh dấu SPEC và design là Approved, rồi `ba` tạo Story, Task và Sub-task có nhãn. Có `[sửa]` thì `sa` sửa plan, và `ba` sửa item khi Task List đổi. Lần chạy sau gate ② không chạy agent: `jira-sync` refine các item, `merge-gate` merge PR tài liệu | Câu hỏi mở, gate ② `plan-approval`, rồi lúc các item sang Ready |
| `/ao-request` | `<KEY>` có yêu cầu `Cần ba:`, `Cần ux:` hoặc `Cần sa:` còn mở | Role được nhờ, mỗi yêu cầu một lượt, cũ trước | Hết yêu cầu mở gửi ba role đó |
| `/ao-build` | `<KEY>` của Story, Task hay Bug ở Ready | Dev agent của mỗi Sub-task, BE trước FE, hoặc dev agent theo nhãn vai trò của item. Agent cuối mở PR nháp, kèm ảnh màn hình và mẫu API trong `.ai/runs/<KEY>/preview/`. Effort theo nhãn `ao-effort-*` | PR nháp mở với CI chạy xong, chờ bạn xem trước; hoặc một item mang cờ Needs you |
| `/ao-preview` | `<KEY>` có PR đang mở, thêm `--stop` để tắt | Không. Thư mục dự án chuyển sang nhánh PR, `npm ci` khi lockfile đổi, bật các app của `preview.yaml` | App chạy và in URL; `--stop` tắt app và đưa thư mục về `develop` |
| `/ao-review` | `<PR>` có CI xanh | PR nháp thì một bước script chuyển nó sang sẵn sàng. Rồi `reviewer`, rồi `security` (đầy đủ ở `max` khi PR có rủi ro, ở `high` khi không; hoặc chỉ phần mới ở `high`) | Hai báo cáo trên head, chờ bạn ở gate ③ |
| `/ao-fix` | `<PR> [việc cần sửa]` | `ba` hoặc `sa` khi yêu cầu đổi AC, hợp đồng API hay yêu cầu chung, rồi dev agent sửa. PR đã sẵn sàng thì `reviewer` và `security` review lại | PR nháp: chờ bạn xem lại. PR sẵn sàng: hai báo cáo mới trên head, chờ bạn ở gate ③ |

**`/ao-fix` khi không có gì chặn.** Bạn ghi việc cần sửa ngay sau số PR, ví dụ `/ao-fix 16 sửa hai finding Low đầu của reviewer`. Claude ghi đoạn chữ đó vào `.ai/runs/<KEY>/note.md` và truyền bằng `--note`, không bao giờ đưa nó vào dòng lệnh.

**Câu hỏi của `ba`, `ux` và `sa`.** Khi có câu hỏi, lệnh dừng và Claude chuyển câu hỏi cho bạn trong chat. Claude ghi câu trả lời của bạn vào `.ai/runs/<KEY>/answers.md`, rồi chạy lại với `--answers`. Agent đã hỏi sẽ làm tiếp trong chính session của nó.

**`/ao-intake`.** Ví dụ: `/ao-intake cho khách hoàn tác khi lỡ xóa sản phẩm khỏi giỏ`. Phiên chính hỏi bạn từng câu (skill `interview-me`; `idea-refine` khi ý còn mơ hồ), rồi phân loại việc theo contract:
- **Epic:** người dùng thấy kết quả, cần SPEC và plan;
- **Task:** việc kỹ thuật, người dùng không thấy kết quả;
- **Bug:** hành vi hiện có sai so với yêu cầu đã có.

Intake không tạo Story, vì Story cần AC trong SPEC, màn hình và hợp đồng API. Việc cỡ một Story, hay một khả năng mới cho Epic đã qua gate ②, thành một Epic nhỏ. Bản nháp theo `epic.md`, `task.md` hoặc `bug.md` nằm ở `.ai/intake/`. Bạn OK thì phiên chính tạo item qua MCP `atlassian`, item đứng tên tài khoản agent như item `ba` tạo. Phần Open Points của Epic thành Open Questions của SPEC; điều bạn đã trả lời lúc intake thì `ba` không hỏi lại. `Start spec` vẫn là cú bấm của bạn.

**Sửa SPEC hay plan trước cổng.** Gõ yêu cầu ngay sau mã Epic, ví dụ `/ao-spec SMP-30 bỏ AC3; thêm AC: hoàn tác trong 5 giây`, hoặc `/ao-plan SMP-30 gộp Task 2 vào Story 1`. Claude ghi đoạn chữ vào `.ai/runs/<EPIC>/note.md` và truyền bằng `--note`.
- `ba` sửa SPEC: AC bị bỏ giữ số với "(bỏ)", AC mới lấy số kế tiếp. Phần sửa chạm màn hình hay yêu cầu phi chức năng thì `ba` nhờ `ux` hay `sa` bằng `Cần ux:` / `Cần sa:`, và lệnh chạy luôn các yêu cầu đó.
- `sa` sửa plan và ADR. Task List đổi thì `sa` nhờ `ba` sửa item. `ba` không hủy item: nó liệt kê item cần hủy để bạn bấm `Cancel`.
- Cùng một yêu cầu gõ lại thì không làm lại. Epic đã qua `Approve spec` (hay `Approve plan`) thì lệnh dừng: thay đổi đi thành một Epic mới qua `/ao-intake`.

**Xem trước giữa build và review.** Dev agent mở PR nháp, nên item ở lại In Progress: guard `pr-open` không tính PR nháp. Trước khi mở PR, `fe-dev` chụp từng màn hình ở mỗi cỡ của `design.md` (`S1-mobile.png`, `S1-desktop.png`), còn `be-dev` ghi `api.md` gồm một request mẫu và response cho mỗi endpoint. Các file này nằm trong `.ai/runs/<KEY>/preview/`, chỉ trên máy bạn. Sau đó bạn chọn một trong ba hướng:
1. `/ao-preview <KEY>`: thư mục dự án chuyển sang nhánh PR, `npm ci --ignore-scripts` chạy khi lockfile khác bản đã cài, rồi các app trong `.ai-orchestrator/preview.yaml` được bật theo thứ tự. Bạn mở URL để thử. Đây là code chưa ai review, chạy trên máy bạn: app không có biến bí mật nào trong môi trường, và kit từ chối xem trước PR sửa đường dẫn được bảo vệ. Đừng sửa file trong lúc xem trước. `/ao-preview <KEY> --stop` tắt app và đưa thư mục về `develop`.
2. `/ao-fix <PR> <yêu cầu>`: dev agent sửa trên PR nháp, không chạy review, và cập nhật ảnh hay `api.md`. Sau đó bạn xem lại.
3. `/ao-review <PR>`: một bước script chuyển PR nháp sang sẵn sàng bằng App `ao-dev`, `jira-sync` đưa item sang In Review, rồi review chạy như cũ. Gõ thẳng lệnh này nếu muốn bỏ qua bước xem trước.

`/ao-fix`, `/ao-review` và các lệnh khác có chạy agent đều tự dừng xem trước trước khi chạy: chúng tắt app, đưa thư mục về `develop`, rồi chạy lại từ `develop`, để kit đã duyệt quyết định. `preview.yaml` là file của dự án, ví dụ cho `ao-sample`:

```yaml
apps:
  api:
    command: npm run start:dev -w apps/api
    url: http://localhost:3001/health
  web:
    command: npm run dev -w apps/web
    url: http://localhost:3000/notes
```

**Giao việc theo `be:` / `fe:`.** Trong yêu cầu của `/ao-fix`, một dòng mở đầu bằng `be:` hay `fe:` giao phần đó cho `be-dev` hay `fe-dev`, tới dòng có tiền tố kế tiếp. Ví dụ:

```text
/ao-fix 22 be: API trả thêm trường updatedAt
fe: hiện updatedAt dưới tiêu đề, dạng "2 phút trước"
```

Có cả hai thì `be-dev` chạy trước. Mỗi agent nhận phần của mình, kèm phần của bên kia để biết. Không có tiền tố thì yêu cầu đi tới dev agent của item; riêng Story có Sub-task cả BE và FE thì lệnh dừng và nhờ bạn ghi tiền tố. Phần đã push thì không gửi lại.

**"Yêu cầu này đổi gì?"** Mỗi khi `/ao-fix` có yêu cầu của bạn, Claude hỏi một câu kèm đề xuất, và bạn trả lời "ok" hoặc chọn lại. Câu trả lời đi vào lệnh bằng `--change`:

| Trả lời | Chạy trước dev agent |
|---|---|
| `none` | Không gì |
| `ac` | `ba` sửa AC trên item (comment AC cũ và mới, AC mới lấy số kế tiếp, không dùng lại số), rồi commit phần sửa `spec.md` lên nhánh PR |
| `api` | `sa` sửa mục API Contract của `plan.md` trên nhánh PR |
| `epic` | `sa` sửa SPEC, plan hay ADR trên nhánh PR, và liệt kê các item khác bị ảnh hưởng trên Epic |
| `story` | `ba` đổi Task thành Story, viết AC mới và thêm chúng vào `spec.md` |

Khả năng mới, đổi kết quả mong đợi của một Bug, hay đổi hướng cả Epic thì không sửa trên PR này: Claude dừng và trỏ sang `/ao-intake`.

**Yêu cầu giữa các vai trò.** Agent nhờ role khác bằng comment `Cần <role>:` trên item; bạn cũng nhờ được bằng một comment như vậy, không có tên Agent ở đầu. `/ao-request <KEY>` chạy các yêu cầu gửi `ba`, `ux` hoặc `sa`. Trên Epic đang ở Specifying hay Planning, role làm trên nhánh tài liệu; ở chỗ khác, role chỉ làm trên Jira và không commit. Yêu cầu xong khi role đó comment trả lời trên item. `/ao-spec` và `/ao-plan` tự chạy các yêu cầu này trên Epic của mình trước khi dừng ở cổng. Yêu cầu gửi dev role hay `qa` chỉ hiện trong `/ao-status`.

## Một vòng Epic từ đầu tới cuối

Đây là vòng của DEMO-20 "Xóa sản phẩm khỏi giỏ hàng". Các bước **[bạn]** là việc bạn bấm.

1. `/ao-intake` với mô tả sơ khai, trả lời các câu phiên chính hỏi, rồi OK bản nháp. Ở Epic thử DEMO-20 (trước khi có lệnh này), bạn tự tạo Epic trên Jira, mô tả giỏ hàng hiện có gì và "xóa" nghĩa là gì. **[bạn]** Bấm `Start spec`.
2. `/ao-spec DEMO-20`. Ở Epic thử, `ba` hỏi 3 câu, `ux` 6 câu, `sa` 2 câu. Bạn trả lời trong chat sau mỗi lần lệnh dừng.
3. `ba` mở PR tài liệu. CI kiểm `design.md` trong job `policy`. **[bạn]** Đọc diff của PR, rồi bấm `Approve spec` (gate ①).
4. `/ao-plan DEMO-20`: `sa` viết plan, `ba` tạo Story DEMO-21 và hai Sub-task.
   - Nếu không item nào có nhãn effort mà bạn muốn nâng một item, trả lời trong chat; `ba` gắn nhãn và ghi vào plan.
   - **[bạn]** Đọc `plan.md` trên PR tài liệu, rồi bấm `Approve plan` (gate ②).
   - Sau lúc bạn duyệt, không ai được push lên PR tài liệu nữa. Nếu không, PR thành PR thường, cần review và approve.
5. `/ao-plan DEMO-20` lần nữa: `jira-sync` chuyển Story sang Ready, `merge-gate` merge PR tài liệu, `audit` xanh khi deploy.
6. `/ao-build DEMO-21`:
   - `be-dev` làm Sub-task BE, rồi `fe-dev` làm Sub-task FE. Cả hai commit lên nhánh của Story `feature/DEMO-21-<slug>`.
   - `fe-dev` mở PR nháp và lệnh chờ CI. Lệnh dừng để bạn xem trước: `/ao-preview DEMO-21`, rồi `/ao-fix <PR> be: … fe: …` nếu cần sửa (mục "Xem trước giữa build và review" ở trên).
   - Nếu một agent gắn cờ Needs you lên Sub-task của nó, **[bạn]** trả lời trên item, gỡ cờ và nhãn `needs-you`, rồi chạy lại lệnh.
7. `/ao-review <PR>`: `reviewer` rồi `security`. Trước mỗi lượt review đầy đủ, `ao-step` ghi gói bối cảnh `.ai/reviews/<PR>-context.md`. Gói gồm:
   - PR và check run của head, item trên Jira;
   - đoạn plan của item cùng các mục SPEC, design và ADR mà đoạn đó nhắc tới, và mẫu báo cáo. Các phần này đọc ở merge base của PR, tức bản đã qua gate ②, vì dev agent sửa được `docs/` trong PR của nó. PR nào sửa các tài liệu đó thì gói ghi rõ;
   - diff, quá 150.000 ký tự thì chỉ có stat;
   - toàn văn file sửa. Lockfile, file nhị phân, file trên 2.000 dòng và phần vượt 150.000 ký tự chỉ được nêu tên, kèm lệnh `git show` để đọc.

   Đầu gói liệt kê các mục do `ao-step` viết. Văn bản của tác giả PR, của người dùng Jira và của tài liệu nằm trong khối fence mà nội dung không đóng được, dưới một dòng ghi nguồn. Agent đọc chúng như dữ liệu, không như chỉ dẫn. Agent bắt đầu từ gói và chỉ đọc thêm khi thiếu. Lượt review phần mới (`review-delta`) không có gói, vì diff của nó tính từ báo cáo trước. Ở phép đo trên PR #4 của `ao-sample`, gói cùng cache 5 phút giảm lượt `reviewer` từ 38 turn, 2,23 USD xuống 10 turn, 0,95 USD. `security` review đầy đủ ở `max` khi item hoặc một Sub-task của nó có nhãn effort, hoặc khi PR chạm đường dẫn được bảo vệ hay một mẫu của `security_review.roster_effort_paths` trong `quality/gates.yaml` (dependency, cấu hình chạy app, controller, guard, filter, middleware, route, auth, secret, repository, entity, migration…; file đổi tên được tính theo cả tên cũ). Các PR còn lại ở `high`. Dòng của lượt `security` trong bản in của `ao-step` ghi lý do, ví dụ `effort high: no protected path, no path of security_review, no effort label`.
   **Checkout và worktree của lượt review.** Mỗi lượt review chạy trên checkout đang ở nhánh đích của PR (`develop`, hoặc `release/*`, `main` với bug), đã kéo về bản mới nhất. Nhánh đích phải là nhánh được bảo vệ, và đúng nhánh mà nhánh của PR được cắt từ đó; nếu không, `/ao-review` và `/ao-fix` dừng, vì tác giả PR đổi được nhánh đích sau khi CI đã chạy (review của `ao-sample` PR #13). Chỉ dẫn của agent (`.claude/`, `CLAUDE.md`, hook) nhờ vậy lấy từ bản đã duyệt, và PR không tự đổi chỉ dẫn của lượt review chính nó. Code của PR nằm ở một worktree tại head đang review, trong thư mục temp, ngoài dự án: `<temp>/ao-reviews/<tên thư mục dự án>-pr-<PR>`. Khi worktree nằm trong dự án (`.ai/reviews/pr-<PR>`, trước lần review thứ hai của `ao-sample` PR #13), Claude Code nạp file chỉ dẫn của PR khi agent đọc một file trong thư mục: lần review đầu thấy `.claude/rules` của PR vào phiên review, lần thứ hai thấy `apps/web/AGENTS.md`, vì Claude Code nạp `AGENTS.md` khi không có `CLAUDE.md`. Một phép thử bằng Sonnet (Phiên 26) cho thấy Claude Code không nạp `CLAUDE.md`, `AGENTS.md` hay `.claude/rules` từ thư mục ngoài dự án, mà agent vẫn đọc, tìm và chạy lệnh ở đó được. `ao-step` không truyền `--add-dir`, vì khi có cờ đó, skill trong `.claude/skills` của thư mục được nạp. Ngay sau khi tạo worktree, `ao-step` vẫn xóa mọi `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md` và `.claude/` của PR, kể cả `.claude` là symlink, phòng khi bản Claude Code sau nạp thêm. Tên được so không phân biệt hoa thường: trên Windows, `agents.md` cũng được nạp. Agent đọc thay đổi của các file đó trong diff hoặc bằng `git show`; gói bối cảnh đặt đường dẫn trong lệnh `git show` vào nháy đơn, vì tên file do PR chọn. `ao-step`, kit và chỉ dẫn của agent lấy từ nhánh đang checkout lúc gõ lệnh, nên `/ao-review` và `/ao-fix` chỉ chạy khi checkout ở nhánh được bảo vệ. Khi một lệnh `build`, `review` hay `fix` kết thúc mà PR của item đang mở, `ao-step` trả checkout về nhánh đích của PR (nếu cây không có thay đổi chưa commit), để lần review sau chạy code đã duyệt. `ao-step` tạo worktree ngay trước lượt chạy và gỡ ngay sau, kể cả khi lượt chạy lỗi. `reviewer` và `security` đọc code và chạy probe ở đó, nên không cần `git archive`. Worktree không có `node_modules`, nên test cần package không chạy được trong đó; CI đã chạy test của head. Cho agent chạy test của PR trong worktree là việc sau Pilot 1. Nếu worktree không gỡ được (Windows còn tiến trình giữ file), thư mục ở lại và lượt review sau của cùng PR thay nó.
8. `/ao-fix <PR>` khi có finding chặn hoặc khi bạn muốn sửa thêm. `security` chỉ review phần mới khi phần đổi từ báo cáo đầy đủ gần nhất tối đa 300 dòng và báo cáo đó vẫn là tổ tiên của head. Từ lần review thứ hai của `ao-sample` PR #13, hai trường hợp trước đây phải review toàn bộ ở `max` nay chỉ review phần mới:
   - phần đổi đụng đường dẫn được bảo vệ: review phần mới ở effort của roster (`max`), còn lại ở `high`;
   - báo cáo trước còn Critical hay High: prompt liệt kê các finding đó, báo cáo phần mới ghi từng finding vào mục `## Earlier findings` là Fixed hay Open, và `merge-gate` coi finding không được ghi là còn mở.
9. **[bạn]** Approve PR trên GitHub (gate ③), và không bấm merge. `merge-gate` squash merge, `audit` xanh khi deploy, và `jira-sync` chuyển Story sang Ready for QA. QA và release thuộc module `release-workflow`.

PR sửa đường dẫn được bảo vệ (`.github/workflows/**`, `.claude/**`, `.ai-orchestrator/**` …) thì bạn tự squash merge. `merge-gate` comment lên PR và gắn cờ item khi PR chỉ còn chờ bạn, và `jira-sync` gỡ cờ đó khi PR đóng.

## Đọc `.ai/runs/`

`.ai/` không được commit. Mỗi item có một thư mục `.ai/runs/<KEY>/`:

| File | Nội dung |
|---|---|
| `last.md` | Báo cáo của lần chạy gần nhất: bảng các lượt (vai trò, bước, effort, kết quả, turn, thời gian, chi phí), câu trả lời đầy đủ của từng agent, lý do dừng và lệnh tiếp theo |
| `state.json` | Mọi lượt của item, ghi từ lúc lượt bắt đầu: session, effort, kết quả (`done`, `usage-limit`, `max-turns`, `error`, `unfinished`), số turn, thời gian, token, chi phí quy đổi, số lần bị từ chối, nhánh đã checkout, câu trả lời của agent (tối đa 2000 ký tự, phần bị cắt có ghi chú). `ao-step` đọc file này để chạy tiếp lượt dở trong cùng session |
| `<n>-<role>.jsonl` | Log stream-json của lượt thứ n |
| `answers.md`, `note.md` | Câu trả lời của bạn, và yêu cầu sửa của `/ao-fix`, `/ao-spec` hay `/ao-plan`, do Claude ghi |

Bản nháp của `/ao-intake` nằm ở `.ai/intake/<YYYYMMDD-HHmm>-<slug>.md`.

`.ai/runs/active.json` là khóa của lần chạy đang diễn ra: mỗi lúc chỉ một lệnh `--go` chạy trên bản checkout. Agent ghi tiến độ vào `.ai/ledger/<KEY>.md`; với Story có Sub-task, ledger nằm ở từng Sub-task.

## Khi nào lệnh dừng

| Lý do dừng | Làm gì |
|---|---|
| `… left N open questions in docs/specs/<EPIC>/…` | Trả lời trong chat. Câu hỏi còn mở trong SPEC hay `design.md` vẫn dừng lệnh khi PR tài liệu đã mở; agent đã hỏi ghi câu trả lời rồi push lên PR (Pilot 1, `SMP-2`) |
| `… waits for you at gate ①/②/③` | Bấm duyệt theo các bước Claude gửi |
| `… is past gate ① spec-approval: its SPEC no longer changes before the gate` (hay gate ②, plan) | Thay đổi đi thành một Epic mới: `/ao-intake` với yêu cầu đó |
| `the draft PR #… of … waits for your preview` | `/ao-preview <KEY>` để thử, `/ao-fix <PR> …` để sửa, hoặc `/ao-review <PR>` để bỏ qua bước xem trước |
| `your request has no be: or fe: …` | Ghi `be:` hay `fe:` ở đầu từng phần của yêu cầu, rồi chạy lại |
| `PR #… changes …, which steer the kit and the agents` | Không xem trước PR này: đọc thay đổi trong diff, rồi `/ao-review` |
| `… has no open request to ba, ux or sa` | Không còn gì cho `/ao-request`. Yêu cầu gửi role khác, nếu có, hiện trong `/ao-status` |
| `… is flagged Needs you by …`, `Sub-task … is flagged Needs you` | Đọc comment mới nhất trên item, trả lời ở đó, gỡ cờ và nhãn `needs-you`, rồi chạy lại. `jira-guard` không cho chuyển trạng thái của item còn nhãn đó |
| `… hit the usage limit … Run the same command again after it resets` | Chờ giới hạn reset, rồi chạy lại đúng lệnh (mục sau) |
| `… ran <step> on <KEY> and it still has to run` | Agent xong lượt mà dữ kiện chưa đổi như mong đợi. Đọc câu trả lời của nó trong `last.md` |
| `no CI run started on PR #… after 5 minutes` | GitHub Actions không chạy workflow nào trên head của PR. Mở tab Actions của repo. Ở `ao-sample`, các workflow vào repo cùng lần push đầu lên repo trống và không chạy theo sự kiện, tới khi một push đụng `.github/workflows/` (Pilot 1, `SMP-2`). Sửa xong thì đóng rồi mở lại PR, và chạy lại lệnh |
| `CI is still running …`, `… not merged yet`, WIP đầy, thiếu nhãn vai trò | Làm theo lệnh tiếp theo mà lý do ghi |
| `ao-step is already running …` | Chờ lần chạy kia xong |

## Chạy tiếp sau khi bị ngắt

- **Agent bỏ lại server:** `claude -p` không thoát khi agent còn để một lệnh chạy ở nền, ví dụ `npm run dev` sau khi xem trang trên trình duyệt. Ở Pilot 1, lượt chạy vì thế treo 1 đến 12 phút, và khi lệnh nền kết thúc thì agent tỉnh dậy thêm một turn, tốn một lần ghi cache. Từ T10, `ao-step` dừng tiến trình của agent 60 giây sau khi nó có kết quả mà chưa thoát. Trên Windows, lệnh dừng (`taskkill /T`) lấy cả cây tiến trình, nên các server cũng tắt. Ở nơi khác chỉ tiến trình của agent bị dừng; server nó bỏ lại bạn tự tắt. Lượt chạy giữ nguyên câu trả lời và kết quả, `state.json` ghi thêm `stoppedAfterResult: true`, và `ao-step` in một dòng báo.
- **Hết usage:** lượt đang chạy ghi `usage-limit`. Sau khi reset, chạy lại đúng lệnh đó. `ao-step` mở lại session cũ bằng `--resume`, không chạy lại các lượt đã xong.
- **Tiến trình bị tắt giữa chừng:** máy thiếu RAM, hoặc bạn tắt Claude Code. Lượt dở nằm trong `state.json` với kết quả `unfinished`, và lần chạy lại đi tiếp trong session lấy từ log của lượt đó. Lượt bị tắt trước khi có dòng log đầu tiên thì không có session để đi tiếp.
  - Thay đổi chưa commit còn trên bản checkout làm `ao-step` từ chối chạy. Dùng `git stash` để cất chúng.
  - Nhãn hay cờ agent đã đặt trên Jira thì vẫn còn.
- **Thiếu RAM:** mỗi lượt agent là một phiên Claude Code, kèm các server MCP. Ở Epic thử, Claude Code tắt lệnh nền ba lần, khi máy 16 GB còn trống dưới khoảng 3 GB.
  - Đóng bớt các phiên Claude Code khác trước khi chạy.
  - Hoặc mở Claude Code với `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1`. Đổi lại, khi RAM cạn hẳn, máy có thể chậm hay treo.

## Gõ lệnh từ Git Bash và chạy không qua skill

- Trong phiên Claude Code: gõ `/ao-status`, `/ao-spec DEMO-20` … như mọi lệnh `/`.
- Từ Git Bash, không mở phiên tương tác: `MSYS_NO_PATHCONV=1 claude -p "/ao-spec DEMO-20"`. Thiếu `MSYS_NO_PATHCONV=1`, Git Bash biến `/ao-spec` thành một đường dẫn Windows (T1).
- Repo dự án phải được tin cậy: mở `claude` trong repo một lần và chấp nhận hộp thoại tin cậy thư mục. Nếu chưa, `claude -p` bỏ qua luật `allow` trong `.claude/settings.json` của dự án, và `enabledMcpjsonServers` trong `.claude/settings.local.json` không bật được server MCP (Pilot 1, T1).
- Trả lời câu hỏi của agent khi chạy bằng `claude -p`: nối lại đúng phiên đó và đưa câu trả lời qua stdin, `MSYS_NO_PATHCONV=1 claude -p --resume <session> --permission-mode acceptEdits < answer.txt`. Không có `--permission-mode acceptEdits`, không ai duyệt được lệnh ghi `answers.md` (Pilot 1, `SMP-2`).
- Gọi thẳng script, như skill gọi: `node .ai-orchestrator/scripts/ao-step.mjs spec DEMO-20` để kiểm, thêm `--go` để chạy. Đặt `AO_KIT_DIR` để chạy bằng một bản kit khác bản chép trong `.ai-orchestrator/`; Epic thử đã chạy bằng repo kit theo cách này.
- `ao-step.mjs` đọc Jira bằng `ATLASSIAN_AGENT_TOKEN`, và đọc GitHub bằng token chỉ đọc của App `ao-review`. Lần dispatch `jira-sync` sau gate ② dùng login `gh` của bạn.

## Chi phí đo được

`/ao-review` của PR chép một bản kit đã được review ở dự án khác không gọi agent: `ao-step` so byte rồi tự đăng báo cáo, xem [quality-gates.md](quality-gates.md#pr-chép-một-bản-kit-đã-được-review).

Quy ra USD theo giá API. Gói Pro không trả theo cách này, nhưng tỉ lệ giữa các lượt vẫn đúng.

| Việc | Lượt | USD |
|---|---|---|
| Stage spec của DEMO-20, ba vòng câu hỏi | `ba` ×3, `ux` ×3, `sa` ×2 | 7,84 |
| Stage plan, kể cả gắn nhãn effort | `sa`, `ba` ×2 | 7,09 |
| Story có Sub-task BE (ở `xhigh`) và FE, tới PR | `be-dev` ×2, `fe-dev` ×2 | 12,50 |
| Review đầy đủ | `reviewer` (`xhigh`), `security` (`max`) | 5,47 |
| Vòng sửa nhỏ | `be-dev`, `reviewer`, `security` phần mới ở `high` | 3,29 |
| Cả Epic thử | 21 lượt | 36,19 |

`security` chỉ review phần mới tốn 0,58 USD, so với 2,92 USD cho review đầy đủ ở `max`.

## Những điều đã gặp khi chạy thật

- **Danh tính App:** commit, push và PR của agent đứng tên `tungph7-ao-dev[bot]`. `gh` trong phiên agent dùng token chỉ đọc. Vai trò chỉ đọc không push được: `gh-guard` chặn trước, và GitHub cũng từ chối token của nó (T16).
- **Token của App dài khoảng 390 ký tự và có dấu chấm.** Script nào đọc token phải đọc tới khoảng trắng; đọc theo `\w+` sẽ ra token cụt và lỗi 401 (kit PR #135).
- **Agent gắn cờ khi gặp chỗ cần bạn quyết,** ví dụ một kiểm tra trên trình duyệt không đạt với CSS mà plan đã chốt. Câu trả lời của bạn nằm trên Jira; bạn tự gỡ cờ.
- **Chế độ quyền `auto` của bạn đi vào phiên agent:** khi `defaultMode` trong `~/.claude/settings.json` là `auto`, bộ phân loại của chế độ này có thể chặn một lệnh của agent. Hook vẫn là lớp chặn chính.
- **Kit sửa sau Epic thử,** từ PR #132 tới #136 và trong T19:
  - đọc nhánh tài liệu ở máy;
  - đếm câu hỏi có tên `Q<n>`;
  - đếm nhãn effort của Sub-task;
  - `sa` đánh dấu SPEC Approved;
  - `gh-guard` bỏ qua phần chuyển hướng;
  - Story có Sub-task làm tiếp theo ledger của Sub-task;
  - dừng khi Sub-task mang cờ.

  Các bản sửa này vào dự án ở lần chép kit sau.

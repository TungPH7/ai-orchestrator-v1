# SPEC: sdlc-contract

> **Module:** `sdlc-contract`, xem capability map trong [SPEC.md](SPEC.md). **Phụ thuộc:** không. **Được dùng bởi:** `agent-roster`, `tracker-integration`, `quality-gates`, `dev-workflow`, `release-workflow`, và `orchestrator-cli` ở Cấp 2.
>
> **Trạng thái:** đã duyệt (2026-10-26), kể cả các sửa đổi cùng ngày theo Phiên 3 · Lượt 1 (nhánh cho Story có cả FE và BE) và Lượt 2 (release theo quyết định của bạn); hoàn thành 2026-10-27. **Plan:** [tasks/archive/sdlc-contract/plan.md](tasks/archive/sdlc-contract/plan.md). **Nguồn thảo luận:** [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md), Phiên 1 · Lượt 5 đến Phiên 3 · Lượt 3.

## 1. Mục tiêu

Viết quy trình phát triển thành một hợp đồng mà cả người và máy đọc được. Với mọi bước của SDLC, hợp đồng trả lời bốn câu: ai làm, cần đầu vào gì, phải tạo ra gì, và điều kiện nào để được sang bước tiếp theo. Các module khác không tự định nghĩa lại quy trình mà đọc từ hợp đồng này.

Ai dùng hợp đồng:

- **Bạn** đọc `docs/sdlc.md`, bản Markdown sinh tự động từ hợp đồng, để duyệt và tra cứu.
- **Agent** đọc phần hợp đồng của bước mình đang làm, rồi dùng template để tạo artifact.
- **Script và bộ điều phối** đọc YAML để kiểm tra cổng, chọn nhánh và chuyển trạng thái. Ở Cấp 1 đó là script của `quality-gates`, `dev-workflow` và `release-workflow`; ở Cấp 2 là `orchestrator-cli`.

Hợp đồng nằm trong repo kit `ai-orchestrator-v1`. Module `project-scaffold` sẽ đồng bộ nó sang từng dự án.

**Ngoài phạm vi:**

- Prompt, tool, skill và model của từng agent: thuộc `agent-roster`.
- Cấu hình Jira, Rovo MCP, quy ước gắn mã Jira vào nhánh, commit, PR: thuộc `tracker-integration`.
- Pipeline CI, pre-commit hook, branch protection: thuộc `quality-gates`.
- Các lệnh điều phối: thuộc `dev-workflow` và `release-workflow`.

## 2. Nội dung hợp đồng

### 2.1 Vai trò

| Role id | Vai trò | Việc chính trong quy trình |
|---|---|---|
| `human` | Bạn: Product Owner, người điều phối, người duyệt duy nhất | Qua 5 cổng duyệt, triage bug, chuyển item sang Done |
| `pm` | Project Manager | Bản tổng hợp mỗi sáng, số liệu tuần cho retro |
| `ba` | Business Analyst | SPEC, user story, acceptance criteria, đề xuất triage bug |
| `ux` | UI/UX designer | Luồng màn hình, wireframe |
| `sa` | Solution Architect | Yêu cầu phi chức năng, plan, ADR, thiết kế DB |
| `fe-dev` | Frontend Developer | Code Next.js theo TDD |
| `be-dev` | Backend Developer | Code NestJS và migration theo TDD |
| `reviewer` | Code Reviewer | Review code, chặn Task trá hình |
| `security` | Security Engineer | Security review, threat model |
| `qa` | Tester/QA Engineer | E2E, regression, báo cáo QA |
| `devops` | DevOps Engineer | Deploy, cắt release, ship, rollback |
| `automation` | CI, webhook, Jira Automation | Chuyển trạng thái theo dữ kiện: CI xanh, merge, deploy xong |

Chỉ `human` được qua cổng duyệt và chuyển Story, Task, Bug, Epic sang Done. Chi tiết từng agent nằm ở `agent-roster`.

### 2.2 Giai đoạn và cổng

| Stage id | Giai đoạn | Người làm | Đầu vào | Đầu ra | Điều kiện để qua |
|---|---|---|---|---|---|
| `spec` | Viết SPEC cho Epic | `ba` chính, `ux`, `sa` | Epic ở `new` | `docs/specs/<EPIC-KEY>/spec.md` | Cổng ① `spec-approval`: bạn duyệt |
| `plan` | Lập plan, tạo Story/Task | `sa` chính, `ba` | SPEC đã duyệt | `docs/specs/<EPIC-KEY>/plan.md` (gồm hợp đồng API cho Story có cả FE và BE), các Story/Task trên Jira | Cổng ② `plan-approval`: bạn duyệt |
| `build` | Code theo TDD | `fe-dev`, `be-dev` | Item `ready` | Nhánh, commit, test | Unit và integration test pass ở local; pre-commit pass |
| `ci-gate` | Quality gate tự động | `automation` | PR | Kết quả CI | Mọi check CI xanh |
| `review` | Review code và security | `reviewer`, `security`, sau đó `human` | PR có CI xanh | Review trên PR | Không còn finding Critical/High; cổng ③ `merge-approval`: bạn approve |
| `merge` | Merge PR | `automation` | PR đã approve | Commit trên nhánh đích | `merge-gate` pass (đổi ngày 2026-10-29 theo `SPEC-quality-gates.md` mục 2.9; trước đó: Branch protection pass) |
| `qa-verify` | QA trên môi trường kiểm | `qa` | Bản đã deploy lên môi trường QA (mục 2.6) | Báo cáo QA | Báo cáo PASS; bạn chấp nhận |
| `release-cut` | Cắt release lên Staging, khi bạn yêu cầu | `devops` | Điểm cắt trên `develop` có ít nhất một item Done chưa release; không có nhánh `release/*` nào đang mở (mục 2.7) | Nhánh `release/vX.Y.0` tách từ điểm cắt, Fix Version | Cổng ④ `release-cut-approval`: bạn duyệt danh sách item của bản |
| `staging-verify` | Full regression, demo, UAT | `qa`, `human` | Bản release trên Staging | Báo cáo regression, release note | Regression PASS; không còn Bug Critical/High mở cho bản này |
| `ship` | Lên Production | `devops` | Bản đã qua Staging | Merge vào `main`, tag `vX.Y.Z`, merge ngược về `develop` | Cổng ⑤ `production-approval`: bạn duyệt; smoke test sau deploy pass |
| `hotfix` | Sửa gấp trên Production | `fe-dev` hoặc `be-dev`, `qa`, `devops` | Bug Critical/High trên Production | Nhánh `hotfix/...`, tag bản vá | Như `ship`, rút gọn |

### 2.3 Work item

**Phân cấp** (đã chốt ở Phiên 2 · Lượt 1, Lượt 3):

| Mô hình khái niệm | Trong Jira | Ghi chú |
|---|---|---|
| Project | Space | Mỗi sản phẩm một space |
| Epic (mục tiêu lớn) | Label hoặc Component | Chỉ để nhóm, không có workflow |
| Feature | Epic | Có SPEC và plan, kéo dài 1–3 tuần |
| User Story | Story | Đơn vị để QA và Done; tốt nhất làm xong trong 1–2 ngày |
| Task (con của Story) | Sub-task | Chỉ dùng khi một Story phải chia cho nhiều agent |
| Task độc lập | Task, cùng cấp Story | Việc kỹ thuật không trực tiếp mang giá trị cho người dùng |
| Bug | Bug, cùng cấp Story | Link tới Story hoặc Epic liên quan |

**Cách chọn loại:** người dùng cuối có nhìn thấy hoặc kiểm chứng được kết quả không? Có thì là Story, không thì là Task. Hành vi hiện có sai so với yêu cầu đã có thì là Bug.

**Quy ước:**

- Mỗi Story, Task, Bug có một nhánh và một PR, chứa mọi phần nó cần: FE, BE, migration, test. Item quay lại sau `qa-fail` thì được sửa trên nhánh và PR mới, vẫn mang mã item (mục 2.6). Tại mỗi thời điểm, một item có tối đa một PR đang mở.
- Story có cả FE và BE được chia thành Sub-task FE và Sub-task BE. Hai agent commit lên cùng nhánh của Story, BE làm trước; PR chỉ được mở khi mọi Sub-task đã xong.
- Story quá lớn thì tách theo chiều dọc thành nhiều Story nhỏ, mỗi Story vẫn đủ FE và BE.
- Phần kỹ thuật của một tính năng thuộc về chính Story đó, không tách thành Task theo lớp (BE, FE). Ngoại lệ duy nhất là phần nền dùng chung cho nhiều Story, như module auth hay schema của cả Epic: phần này là Task độc lập, làm trước, và các Story khai báo phụ thuộc vào nó.
- PR của một Task mà làm đổi giao diện hoặc API công khai thì `reviewer` yêu cầu đổi Task thành Story.

**Trường dữ liệu:**

| Trường | Áp dụng | Giá trị | Ai điền |
|---|---|---|---|
| Found in | Bug | Development, Staging, Production | Người báo lỗi |
| Affects Version | Bug | Bản cũ nhất đang có lỗi | `ba` đề xuất, bạn duyệt |
| Severity | Bug | Critical: mất hoặc sai dữ liệu, lỗ hổng bảo mật, hệ thống hoặc luồng thanh toán ngừng. High: luồng chính hỏng, không có cách né. Medium: có cách né. Low: giao diện, chính tả | `ba` đề xuất, bạn duyệt |
| Fix Version | Story, Task, Bug | Bug: suy ra từ bảng định tuyến (mục 2.6). Story, Task: gắn khi cắt release | `automation`, `devops` |
| Rework count | Story, Task, Bug | Số lần quay lại `in-progress` | `automation` |
| Flagged | Mọi loại | Lý do bị chặn hoặc cần bạn quyết | Bất kỳ ai |
| Resolution | Khi `cancelled` | Won't do, Duplicate, Not a bug, Cannot reproduce | Bạn |

Cách lưu Rework count trên Jira (trường số, hay đếm từ lịch sử chuyển trạng thái) do `tracker-integration` chọn.

### 2.4 State machine

**Workflow `standard`** cho Story, Task và Bug:

```
new ──► ready ──► in-progress ──► in-review ──► ready-for-qa ──► in-qa ──► done
                      ▲               │                            │
                      └───────────────┴────────────────────────────┘
          request-changes (review, CI đỏ) · qa-fail (báo cáo QA FAIL)
Mọi trạng thái chưa kết thúc đều chuyển được sang cancelled, kèm Resolution.
```

| State | Nghĩa | Cột trên Kanban board |
|---|---|---|
| `new` | Mới tạo, chưa đạt DoR | Backlog |
| `ready` | Đạt DoR, chờ được kéo | Ready |
| `in-progress` | Đang code và viết test | In Progress |
| `in-review` | PR đã mở, CI xanh, đang review | In Review |
| `ready-for-qa` | Đã merge và deploy lên môi trường QA | QA |
| `in-qa` | QA đang kiểm | QA |
| `done` | Đã verify, đạt DoD. Trạng thái kết thúc | Done |
| `cancelled` | Không làm nữa, có Resolution. Trạng thái kết thúc | Ẩn |

| Transition | Từ → đến | Ai chuyển | Điều kiện | Bằng chứng |
|---|---|---|---|---|
| `refine` | `new` → `ready` | `automation` với Story/Task thuộc Epic có plan đã duyệt; `human` với Bug sau triage và Task không thuộc Epic | Đạt DoR của loại đó | Plan đã duyệt, hoặc kết quả triage |
| `start` | `ready` → `in-progress` | `fe-dev`, `be-dev`, `devops` | Agent còn chỗ WIP; các item phụ thuộc đã merge vào nhánh gốc; đã tạo nhánh từ đúng nhánh gốc | Nhánh trên GitHub |
| `submit` | `in-progress` → `in-review` | `automation` | Mọi Sub-task đã `done`; PR vào đúng nhánh gốc đã mở; CI xanh | Sub-task trên Jira, PR, trạng thái CI |
| `request-changes` | `in-review` → `in-progress` | `reviewer`, `security`, `human`, `automation` | Review yêu cầu sửa, hoặc CI đỏ | Comment review, log CI |
| `deploy-to-qa` | `in-review` → `ready-for-qa` | `automation` | Bạn đã approve (cổng ③); PR đã merge; deploy lên môi trường QA thành công | Sự kiện deploy |
| `pick-up` | `ready-for-qa` → `in-qa` | `qa` | Không có | Không có |
| `qa-fail` | `in-qa` → `in-progress` | `qa` | Báo cáo QA FAIL | Báo cáo QA |
| `accept` | `in-qa` → `done` | `human` | Báo cáo QA PASS; đạt DoD | Báo cáo QA |
| `cancel` | Trạng thái chưa kết thúc → `cancelled` | `human` | Có Resolution | Không có |

Quy tắc đi kèm:

1. **Trạng thái đi theo dữ kiện, không theo lời agent.** Ví dụ, item chỉ vào `in-review` khi có PR và CI xanh.
2. **`request-changes` và `qa-fail` tăng Rework count lên 1.** Khi Rework count chạm 3, item bị gắn cờ "Needs you" và agent dừng xử lý item đó.
3. **Bị chặn thì gắn cờ, không đổi trạng thái.**
4. **Done là kết thúc.** Lỗi phát hiện sau Done thì tạo Bug mới, link tới item gốc; không mở lại item cũ.
5. **Hotfix dùng chung workflow này**, chỉ khác nhánh gốc và môi trường QA (mục 2.6).

**Workflow `epic`:**

```
new ──► specifying ──► planning ──► in-progress ──► done      (đều chuyển được sang cancelled)
```

| Transition | Từ → đến | Ai chuyển | Điều kiện |
|---|---|---|---|
| `start-spec` | `new` → `specifying` | `human` | Còn chỗ WIP cho Epic (mục 2.7) |
| `approve-spec` | `specifying` → `planning` | `human` | Cổng ① |
| `approve-plan` | `planning` → `in-progress` | `human` | Cổng ②; Story/Task con đã được tạo, và `automation` chuyển chúng sang `ready` |
| `complete` | `in-progress` → `done` | `human` | Mọi item con đã Done hoặc Cancelled, và đã nằm trong một bản lên Production |
| `cancel` | Trạng thái chưa kết thúc → `cancelled` | `human` | Có Resolution |

**Workflow `sub-task`:** `to-do` → `in-progress` → `done`. Agent được giao tự chuyển Sub-task sang `done` khi phần việc đã được commit lên nhánh của Story. Kiểm tra chất lượng diễn ra ở cấp Story.

### 2.5 DoR và DoD

**DoR**, điều kiện để vào `ready`:

| Loại | DoR |
|---|---|
| Story | Có câu user story; có acceptance criteria dạng Given/When/Then, mỗi tiêu chí kiểm thử được; thuộc Epic có plan đã duyệt; đã xác định item phụ thuộc; vừa cỡ: mỗi Sub-task, hoặc cả Story nếu không có Sub-task, khoảng 5 file code trở xuống, không tính file test; có hợp đồng API trong plan nếu Story có cả FE và BE; có thiết kế màn hình nếu đụng tới giao diện |
| Task | Có mục tiêu và checklist kỹ thuật kiểm tra được; thuộc Epic có plan đã duyệt, hoặc được bạn duyệt trực tiếp |
| Bug | Có bước tái hiện, kết quả thực tế và kết quả mong đợi; đã điền Found in, Affects Version, Severity, Fix Version; có bằng chứng (log, ảnh) |

**DoD**, điều kiện để vào `done`. Phần chung cho Story, Task, Bug:

- PR đã merge vào đúng nhánh gốc, mọi check CI xanh.
- Không còn finding Critical/High chưa xử lý.
- Hành vi mới hoặc thay đổi được phủ bởi unit và integration test viết theo TDD.
- Báo cáo QA PASS trên đúng môi trường QA.
- Đã cập nhật tài liệu, và ADR nếu có thay đổi kiến trúc.
- Bạn đã chấp nhận.

Phần riêng của từng loại:

- **Story:** E2E test cho từng acceptance criterion đều pass.
- **Bug:** có test tái hiện lỗi (fail trước khi sửa, pass sau khi sửa), được đưa vào bộ regression.
- **Task:** bộ regression pass.

**DoD của Epic:** mọi item con đã Done hoặc Cancelled, và bản chứa chúng đã lên Production.

### 2.6 Môi trường, nhánh và định tuyến bug

| Môi trường | Nhận code từ | Khi nào deploy | Dữ liệu |
|---|---|---|---|
| `development` | `develop` | Tự động mỗi khi `develop` có commit mới | Dữ liệu test |
| `staging` | `release/*` và `hotfix/*` | Khi nhánh release hoặc hotfix có commit mới | Giống production, đã ẩn danh |
| `production` | `main` + tag | Sau cổng ⑤ | Thật |

**Việc mới** (Story, Task) luôn tách nhánh từ `develop` và được QA trên Development. **Bug** được sửa trên nhánh cũ nhất còn cần bản sửa, rồi merge ngược về các nhánh mới hơn. Bảng định tuyến (đã chốt ở Phiên 2 · Lượt 1):

| Bản cũ nhất đang có lỗi | Critical / High | Medium / Low |
|---|---|---|
| Production | Fix Version: bản vá của Production. Nhánh `hotfix/...` tách từ `main`. QA trên Staging, rồi smoke test trên Production | Fix Version: bản kế tiếp. Nhánh tách từ `develop`. QA trên Development |
| Staging, chưa lên Production | Fix Version: bản đang ở Staging. Nhánh tách từ `release/vX.Y.Z`. QA trên Staging | Fix Version: bản kế tiếp. Nhánh tách từ `develop`. QA trên Development. Ghi known issue vào release note |
| Chỉ có trên `develop` | Fix Version: bản kế tiếp. Nhánh tách từ `develop`. QA trên Development | Như ô bên trái |

Lỗi Critical/High được chen vào luồng ngay; lỗi Medium/Low vào Product Backlog để bạn xếp thứ tự. Nhánh `release/*` và `hotfix/*` khi kết thúc đều được merge vào `main` và merge ngược về `develop`; hotfix làm lúc đang có nhánh release mở thì được merge thêm vào nhánh release đó.

Lỗi tìm thấy khi QA một item chưa Done thì không tạo Bug: item quay lại `in-progress` qua `qa-fail`, và được sửa trên nhánh mới tách từ nhánh gốc cũ, vẫn mang mã item cũ.

**Đánh số phiên bản** theo SemVer. Mỗi bản release tăng số minor (`v1.4.0` → `v1.5.0`), hotfix tăng số patch (`v1.4.0` → `v1.4.1`). Tăng số major khi có thay đổi phá vỡ tương thích, do bạn quyết.

### 2.7 Nhịp làm việc, release, WIP và số liệu

Quy trình chạy theo Kanban: agent kéo item `ready` kế tiếp khi còn chỗ WIP. Không có sprint, story point hay Daily Scrum.

| Thời điểm | Việc |
|---|---|
| Thứ 2 | Bạn sắp lại thứ tự Product Backlog và duyệt các SPEC, plan đang chờ (cổng ① ②) |
| Hằng ngày | `pm` gửi bản tổng hợp từ Jira và GitHub: việc đang chờ bạn, các item đã Done nhưng chưa release, và item Done đã chờ release lâu nhất |
| Khi bạn quyết định | `release-cut` lên Staging (cổng ④); full regression, demo và UAT trên Staging; rồi `ship` (cổng ⑤) |
| Thứ 6 | Retro dựa trên số liệu của tuần |

**Release theo quyết định của bạn, không theo lịch cố định** (Phiên 3 · Lượt 2). Bạn cắt release khi thấy đủ giá trị để đưa lên, ví dụ khi mọi Story của một Epic đã Done, hoặc khi khách cần sớm một tính năng. Lúc lên Production cũng do bạn quyết ở cổng ⑤.

**Điểm cắt.** `develop` nhận merge liên tục, nên lúc bạn muốn release thường vẫn còn item đã merge nhưng chưa Done. Vì vậy nhánh release tách từ điểm cắt, không từ commit mới nhất của `develop`. Điểm cắt là commit mới nhất trên lịch sử `develop` sao cho mọi item có commit tính tới điểm đó đều đã Done, và không item nào trong số đó còn commit nằm sau điểm cắt. Item nằm sau điểm cắt vào bản kế tiếp. `release-workflow` tính điểm cắt và đưa bạn danh sách item để duyệt ở cổng ④.

**Mỗi lúc chỉ có một nhánh `release/*` mở.** Muốn cắt bản mới thì bản đang ở Staging phải lên Production xong trước.

**Fix Version.** Luôn có sẵn một Fix Version chưa phát hành làm "bản kế tiếp", vì Bug Medium/Low được gắn vào đó ngay khi triage (mục 2.6). Khi cắt release, Fix Version này được gán cho các item trong điểm cắt; item nằm sau điểm cắt chuyển sang một Fix Version kế tiếp mới. Mô tả Fix Version ghi mục tiêu của bản để báo khách; mục tiêu là dự báo, không phải cam kết.

**Giới hạn WIP mặc định** (chỉnh được ở retro):

| Chỗ | Giới hạn |
|---|---|
| Việc đang làm của mỗi dev agent: Sub-task nếu Story có Sub-task, nếu không thì cả item | 1 |
| Cột In Review (gồm PR đang chờ bạn approve) | 2 |
| Epic ở `specifying` hoặc `planning` | 1 |

**Số liệu cho retro:**

| Số liệu | Cách tính |
|---|---|
| Cycle time | Từ lúc vào `in-progress` tới lúc vào `done` |
| Thời gian chờ release | Từ lúc item vào `done` tới lúc bản chứa nó lên Production |
| Throughput | Số item vào `done` trong tuần |
| Rework | Tổng Rework count, và các item chạm giới hạn 3 |
| Lỗi lọt | Số Bug có Found in là Staging hoặc Production, theo từng bản release |
| Thời gian chờ bạn | Tổng thời gian item nằm chờ một cổng duyệt hoặc mang cờ "Needs you" |
| Usage mỗi item | Cấp 1 ghi tay nếu đo được; Cấp 2 đo tự động |

### 2.8 Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Review yêu cầu sửa, CI đỏ, QA FAIL | Về `in-progress`, Rework count tăng 1 |
| Rework count chạm 3 | Gắn cờ "Needs you", agent dừng xử lý item |
| CI fail nghi do test chập chờn | Tự chạy lại tối đa 1 lần. Fail lần nữa thì coi là fail thật, và ghi test đó vào danh sách cần sửa |
| Agent thất bại 2 lần liên tiếp ở cùng một bước | Dừng, gắn cờ "Needs you", kèm log |
| Chạm giới hạn usage | Dừng, ghi tiến độ vào ledger của item, làm tiếp ở phiên sau |
| Deploy lên môi trường QA thất bại | Item giữ nguyên `in-review`, gắn cờ; `devops` xử lý |
| Smoke test sau khi lên Production fail | Rollback về bản trước, tạo Bug Critical |

### 2.9 Artifact và template

| Artifact | Template | Ai tạo | Lưu ở đâu |
|---|---|---|---|
| SPEC của Epic | `templates/spec.md` | `ba` | Git: `docs/specs/<EPIC-KEY>/spec.md` |
| Plan | `templates/plan.md` | `sa` | Git: `docs/specs/<EPIC-KEY>/plan.md` |
| ADR | `templates/adr.md` | `sa` | Git: `docs/adr/NNNN-<slug>.md` |
| Story, Task, Bug | `templates/story.md`, `task.md`, `bug.md` | `ba`; Bug do người báo lỗi tạo | Mô tả item trên Jira |
| Mô tả PR (bàn giao từ dev sang reviewer và QA) | `templates/pull-request.md` | Dev agent | PR trên GitHub |
| Báo cáo review | `templates/review-report.md` | `reviewer`, `security` | Review trên PR |
| Báo cáo QA của item | `templates/qa-report.md` | `qa` | Comment trên item Jira, kèm link artifact CI (video, trace) |
| Báo cáo regression của bản release | `templates/regression-report.md` | `qa` | Git: `docs/releases/vX.Y.Z.md`, trên nhánh release |
| Release note | `templates/release-notes.md` | `devops`, `ba` | Git: `CHANGELOG.md`; mô tả Fix Version trên Jira; bản gửi khách trên Google Drive |
| Ledger tiến độ | `templates/ledger.md` | Agent đang làm item | Local `.ai/ledger/<KEY>.md`, không commit |

Mọi đường dẫn tính từ gốc repo của dự án. Agent-skills mặc định để `SPEC.md` ở gốc repo và plan ở `tasks/plan.md`. Dự án có nhiều Epic nên mỗi Epic có một thư mục riêng, và danh sách task nằm trên Jira thay cho `tasks/todo.md`; các lệnh của `dev-workflow` sẽ truyền đường dẫn này cho skill.

**Ngôn ngữ:** template viết tiếng Anh (tiêu đề và hướng dẫn điền); nội dung điền vào SPEC, plan, báo cáo, item Jira viết tiếng Việt; code, commit và PR viết tiếng Anh.

## 3. Tech stack

- Hợp đồng: YAML 1.2. Schema: JSON Schema draft 2020-12. Template: Markdown.
- Script và thư viện: Node.js 24, ES module (`.mjs`).
- Dependency: `yaml` 2.x để đọc YAML, `ajv` 8.x để kiểm tra schema. Test dùng `node:test` và `node:assert` có sẵn của Node. Không thêm dependency nào khác.

## 4. Lệnh

```
npm install
npm run validate        # node scripts/validate-contract.mjs: kiểm tra schema và tính nhất quán (mục 7)
npm test                # node --test "tests/**/*.test.mjs": test của validator, thư viện, các kịch bản và template (Node 24 không nhận tham số là thư mục)
npm run render          # node scripts/render-docs.mjs: sinh docs/sdlc.md từ YAML
npm run render:check    # sinh lại vào bộ nhớ, báo lỗi nếu docs/sdlc.md đã cũ (dùng trong CI)
```

## 5. Cấu trúc thư mục

```
ai-orchestrator-v1/
├── contract/
│   ├── roles.yaml          # vai trò (mục 2.1)
│   ├── stages.yaml         # giai đoạn, cổng, môi trường, nhịp làm việc, release (2.2, 2.6, 2.7)
│   ├── work-items.yaml     # loại, phân cấp, trường, DoR/DoD (2.3, 2.5)
│   ├── workflows.yaml      # state machine standard, epic, sub-task (2.4)
│   ├── routing.yaml        # định tuyến bug, đánh số phiên bản (2.6)
│   ├── policies.yaml       # WIP, rework, retry, xử lý lỗi, lưu trữ, ngôn ngữ (2.7–2.9)
│   └── schema/             # JSON Schema cho từng file ở trên
├── templates/              # template artifact (mục 2.9)
├── lib/contract.mjs        # thư viện chỉ đọc, là giao diện cho các module khác
├── scripts/
│   ├── validate-contract.mjs
│   └── render-docs.mjs
├── docs/sdlc.md            # sinh tự động, không sửa tay
├── tests/
│   ├── fixtures/invalid/   # các hợp đồng cố tình viết sai, mỗi file vi phạm một quy tắc
│   └── *.test.mjs
└── package.json
```

Hợp đồng tách thành sáu file để agent chỉ cần nạp phần của bước mình đang làm.

## 6. Code style

Tên trường dùng `snake_case`; id (state, transition, role, gate, stage) dùng `kebab-case`, giống module id. Ví dụ:

```yaml
# contract/workflows.yaml (trích)
workflows:
  standard:
    applies_to: [story, task, bug]
    initial: new
    final: [done, cancelled]
    states:
      in-qa: { board_column: qa }
      done:  { board_column: done }
    transitions:
      - id: qa-fail
        from: in-qa
        to: in-progress
        actors: [qa]
        guards: [qa-report-failed]
        effects: [increment-rework]
      - id: accept
        from: in-qa
        to: done
        actors: [human]
        guards: [qa-report-passed, dod-met]

guards:
  qa-report-failed:
    description: "Báo cáo QA mới nhất của item có kết quả FAIL"
    evidence: { source: tracker, artifact: qa-report }
```

`guards` chỉ khai báo tên, mô tả và nguồn bằng chứng (`git`, `github-pr`, `ci`, `deploy`, `tracker`, `human`). Việc kiểm tra thật do module dùng hợp đồng đảm nhận.

Giao diện của `lib/contract.mjs`, chỉ gồm hàm thuần, không gọi mạng:

```js
export function loadContract(dir = 'contract') {}  // đọc, validate, trả về object bất biến
export function allowedTransitions(contract, workType, state) {}  // → [{ id, to, actors, guards }]
export function checkTransition(contract, workType, transitionId, { actor, facts }) {}  // → { ok, missingGuards, effects }
export function routeBug(contract, { affects, severity }) {}  // → { fixVersion, baseBranch, qaEnvironments }
```

`routeBug` trả về quy tắc (`patch-of-production`, `current-release`, `next-release`), không trả về số phiên bản cụ thể; `release-workflow` tính số cụ thể từ các version thật.

## 7. Chiến lược test

**Quy tắc mà `npm run validate` kiểm tra.** Mỗi quy tắc có ít nhất một test dương và một fixture âm trong `tests/fixtures/invalid/`, kèm thông báo lỗi mong đợi.

1. Mọi file YAML đúng schema của nó.
2. Mọi `from`, `to` là state đã khai báo. Mọi state đi tới được từ `initial`. Từ mọi state chưa kết thúc đều có đường tới một state kết thúc. State kết thúc không có transition đi ra.
3. Mọi guard, effect, role, gate, stage, template, work type được nhắc tới đều đã khai báo.
4. Transition vào `done` của workflow `standard` và `epic`, và mọi cổng duyệt, chỉ có actor là `human`.
5. Mọi transition quay về `in-progress` đều yêu cầu bằng chứng và có effect `increment-rework`.
6. Bảng định tuyến bug phủ đủ mọi tổ hợp vị trí lỗi × severity, mỗi tổ hợp đúng một lần.
7. Mọi artifact đầu ra của stage đều có template, và mọi template đều được dùng.
8. Mỗi work type gắn với đúng một workflow.

**Kịch bản**, chạy bằng `lib/contract.mjs`:

- Một Story đi từ `new` tới `done` khi có đủ dữ kiện; bị từ chối khi một agent gọi `accept`.
- Ba lần `qa-fail` liên tiếp làm item bị gắn cờ "Needs you".
- Bug Critical có ở Staging → nhánh gốc `release/*`, QA trên Staging. Bug Critical có ở Production → nhánh gốc `main`, QA trên Staging rồi Production. Bug Low có ở Production → nhánh gốc `develop`, QA trên Development.

**Chống lệch tài liệu:** `npm run render:check` chạy trong CI, nên `docs/sdlc.md` không thể cũ hơn YAML.

## 8. Ranh giới

- **Luôn làm:** mọi thay đổi hợp đồng đi qua PR; chạy `npm run validate` và `npm test` trước khi commit; sinh lại `docs/sdlc.md`; đổi artifact thì đổi template trong cùng PR.
- **Hỏi bạn trước:** thêm, bớt hoặc đổi tên state, transition; đổi cổng duyệt hoặc người duyệt; đổi giới hạn WIP, rework, retry; đổi bảng định tuyến bug; thêm dependency.
- **Không bao giờ:** cho agent quyền chuyển Story, Task, Bug, Epic sang Done hoặc qua cổng duyệt của bạn; xóa state đang có item trên Jira mà không có kế hoạch chuyển đổi; đưa secret hoặc dữ liệu khách hàng vào template, ví dụ, fixture.

## 9. Tiêu chí hoàn thành

1. Sáu file trong `contract/` có đủ nội dung của mục 2 và pass `npm run validate`.
2. Mỗi quy tắc ở mục 7 có test dương và fixture âm; `npm test` xanh.
3. Mọi kịch bản ở mục 7 chạy được bằng `lib/contract.mjs`.
4. `docs/sdlc.md` có sơ đồ Mermaid cho ba workflow, và bảng cho vai trò, giai đoạn, cổng, DoR/DoD, định tuyến bug, nhịp làm việc, release, WIP; `npm run render:check` pass.
5. Mọi artifact ở mục 2.9 có template, mỗi template có hướng dẫn điền và một ví dụ ngắn.
6. Bạn đọc `docs/sdlc.md` và xác nhận nó khớp với các quyết định trong `misc/brainstorm-discussion.md`.

## 10. Quyết định bổ sung

Các điểm sau xuất hiện lần đầu trong spec này, và đã được bạn duyệt ngày 2026-10-26 (Phiên 3 · Lượt 1):

1. Epic có thêm state `new`, để tách Epic mới là ý tưởng với Epic đang được viết SPEC.
2. Agent tự chuyển Sub-task sang `done`; quy tắc "chỉ bạn chuyển sang Done" áp dụng cho Story, Task, Bug và Epic.
3. Báo cáo QA của từng item nằm trên Jira và báo cáo review nằm trên PR. Chỉ báo cáo regression của bản release và release note được commit vào Git. Lượt trước chỉ ghi chung "tóm tắt báo cáo nằm trong Git"; nếu commit cả báo cáo QA của từng item thì mỗi lần QA phải mở thêm một PR vào `develop`.
4. Giới hạn WIP mặc định: tối đa 2 item ở cột In Review, tối đa 1 Epic ở `specifying` hoặc `planning`.
5. SemVer: mỗi bản release tăng minor, hotfix tăng patch. (Lúc duyệt là "bản tuần"; Phiên 3 · Lượt 2 bỏ lịch release hằng tuần.)
6. CI fail nghi do test chập chờn thì tự chạy lại tối đa 1 lần.
7. Có `lib/contract.mjs` làm giao diện chung, thay vì để mỗi module tự đọc YAML.

## 11. Quyết định bổ sung đợt 2

Các điểm sau xuất hiện lần đầu khi sửa spec theo Phiên 3 · Lượt 1 và Lượt 2, và đã được bạn duyệt ngày 2026-10-26 (Phiên 3 · Lượt 3):

1. Tại mỗi thời điểm, một item có tối đa một PR đang mở. Sau `qa-fail`, bản sửa đi qua một PR mới mang cùng mã item, nên quy ước "một nhánh, một PR" tính cho từng lượt làm, và guard xét PR mới nhất của item.
2. Nhánh release tách từ điểm cắt, không từ commit mới nhất của `develop`.
3. Mỗi lúc chỉ có một nhánh `release/*` mở.
4. Luôn có sẵn một Fix Version "bản kế tiếp"; khi cắt release, item nằm sau điểm cắt chuyển sang bản kế tiếp mới.
5. Demo cho khách diễn ra theo từng bản release trên Staging; retro vẫn cố định thứ 6 hằng tuần.
6. Thêm số liệu "thời gian chờ release", từ lúc item Done tới lúc lên Production.

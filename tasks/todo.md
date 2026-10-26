# Task: sdlc-contract

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-sdlc-contract.md](../SPEC-sdlc-contract.md). Làm theo thứ tự; mỗi task viết test đỏ trước, commit riêng, rồi đánh dấu `[x]`.

**Quy ước chung cho mọi task:**

- Mỗi quy tắc có một test dương (hợp đồng thật không có lỗi mang mã đó) và ít nhất một fixture âm trong `tests/fixtures/invalid/`.
- Xong task thì `npm run validate` và `npm test` xanh; từ T5 trở đi thêm `npm run render:check`.
- Đổi YAML thì chạy `npm run render` và commit `docs/sdlc.md` trong cùng commit.
- Nội dung YAML lấy từ spec mục 2. Chỗ nào spec không nói rõ thì dừng lại hỏi, không tự đoán.
- Cỡ task đếm theo file code và file hợp đồng, không tính file test và fixture.
- Mỗi task làm trên một nhánh ngắn tách từ `main`, đặt tên `task/t<N>-<slug>` (ví dụ `task/t1-contract-skeleton`), xong thì merge vào `main` qua PR.
- Commit message theo `CLAUDE.md`: `type(scope): subject`, không body, không dòng `Co-Authored-By`. Ví dụ: `feat(contract): add workflows and graph rule`.

---

## Giai đoạn 1: khung và workflow

### [x] T1: Khung dự án và `roles.yaml`, quy tắc 1

**Mô tả:** Tạo khung để chạy được `npm run validate` và `npm test`: `package.json` (ES module, script `validate` và `test`, dependency `yaml` 2.x và `ajv` 8.x), `.gitignore`, `.gitattributes`, `lib/contract.mjs` với `readContract`, `validateContract`, `loadContract`, quy tắc 1 ở `lib/rules/schema.mjs`, và script `scripts/validate-contract.mjs`. File hợp đồng đầu tiên là `contract/roles.yaml` với 12 vai trò ở spec mục 2.1, cùng schema của nó. Có luôn helper áp bản vá cho fixture âm.

**Tiêu chí chấp nhận:**
- [x] `roles.yaml` có đủ 12 vai trò của spec mục 2.1, mỗi vai trò có id, tên và việc chính.
- [x] Với hợp đồng thật, `npm run validate` báo OK và thoát mã 0. Khi có lỗi, script in mã quy tắc, đường dẫn, thông báo, và thoát mã khác 0.
- [x] Fixture âm "vai trò thiếu trường bắt buộc" và "vai trò có trường lạ" đều làm `validateContract` trả lỗi `R1`.

**Kiểm chứng:**
- [x] `npm install`, `npm test`, `npm run validate` chạy được và xanh
- [x] Thủ công: sửa tạm `roles.yaml` cho sai schema, `npm run validate` báo đúng chỗ sai

**Phụ thuộc:** không

**File dự kiến:** `package.json`, `.gitignore`, `.gitattributes`, `lib/contract.mjs`, `lib/rules/schema.mjs`, `contract/roles.yaml`, `contract/schema/roles.schema.json`, `scripts/validate-contract.mjs`. Test: `tests/helpers/patch.mjs`, `tests/rules.test.mjs`, `tests/fixtures/invalid/r1-*.yaml`

**Cỡ:** M (nhiều file nhưng phần lớn chỉ vài dòng)

### [x] T2: `workflows.yaml`, quy tắc 2 và 3

**Mô tả:** Viết ba workflow `standard`, `epic`, `sub-task` theo spec mục 2.4, cùng danh mục guard (tên, mô tả, nguồn bằng chứng) và effect. Transition `submit` có guard "mọi Sub-task đã `done`". Thêm quy tắc 2 (đồ thị trạng thái) và quy tắc 3 (tham chiếu tới guard, effect, role đều đã khai báo). Tham chiếu tới work type được kiểm ở T6.

**Tiêu chí chấp nhận:**
- [x] `standard` có 8 state và 9 transition; `epic` có 6 state và 5 transition; `sub-task` có 3 state. Actor, guard và effect của từng transition khớp spec mục 2.4.
- [x] Quy tắc 2 bắt được: `from` hoặc `to` chưa khai báo; state không đi tới được từ `initial`; state chưa kết thúc không có đường tới state kết thúc; state kết thúc có transition đi ra. Mỗi trường hợp có một fixture âm.
- [x] Quy tắc 3 bắt được guard, effect và role chưa khai báo, mỗi loại một fixture âm.

**Kiểm chứng:**
- [x] `npm test` và `npm run validate` xanh

**Phụ thuộc:** T1

**File dự kiến:** `contract/workflows.yaml`, `contract/schema/workflows.schema.json`, `lib/rules/graph.mjs`, `lib/rules/references.mjs`, `lib/contract.mjs`

**Cỡ:** M

### [x] T3: Quy tắc 4 và 5 cho workflow

**Mô tả:** Quy tắc 4: transition vào `done` của workflow `standard` và `epic` chỉ có actor `human`; phần kiểm cổng duyệt được thêm ở T9. Quy tắc 5: mọi transition đi lùi về `in-progress` phải có ít nhất một guard có nguồn bằng chứng, và có effect `increment-rework`. Transition đi lùi xác định theo thứ tự khai báo state (plan, quyết định 4).

**Tiêu chí chấp nhận:**
- [x] Thêm một agent vào actor của `accept` hoặc `complete` → lỗi `R4`.
- [x] Bỏ `increment-rework` khỏi `qa-fail` → lỗi `R5`; bỏ guard của `request-changes` → lỗi `R5`.
- [x] Transition `start` (`ready` → `in-progress`) không bị quy tắc 5 coi là đi lùi.

**Kiểm chứng:**
- [x] `npm test` và `npm run validate` xanh

**Phụ thuộc:** T2

**File dự kiến:** `lib/rules/authority.mjs`, `lib/rules/rework.mjs`, `lib/contract.mjs`

**Cỡ:** S

### [x] T4: `allowedTransitions`, `checkTransition` và kịch bản chuyển trạng thái

**Mô tả:** Cài hai hàm thuần ở spec mục 6. `checkTransition(contract, workType, transitionId, { actor, facts })` trả về `{ ok, missingGuards, effects }`: từ chối khi actor không được phép hoặc thiếu guard, và thêm effect `flag-needs-you` khi Rework count sau lần tăng chạm giới hạn. Giới hạn đọc từ `policies.yaml`, nên task này tạo `policies.yaml` với phần rework; phần còn lại thêm ở T8.

**Tiêu chí chấp nhận:**
- [x] Kịch bản: một Story đi từ `new` tới `done` khi có đủ dữ kiện; `accept` do một agent gọi thì bị từ chối.
- [x] Kịch bản: lần `qa-fail` thứ ba liên tiếp trả về effect `flag-needs-you`; hai lần đầu thì không.
- [x] `allowedTransitions(contract, 'story', 'in-review')` trả về đúng `request-changes`, `deploy-to-qa` và `cancel`.

**Kiểm chứng:**
- [x] `npm test` và `npm run validate` xanh

**Phụ thuộc:** T3

**File dự kiến:** `lib/contract.mjs`, `lib/transitions.mjs`, `contract/policies.yaml`, `contract/schema/policies.schema.json`. Test: `tests/scenarios.test.mjs`

**Cỡ:** M

### [x] T5: `render-docs` với sơ đồ Mermaid cho ba workflow

**Mô tả:** Script sinh `docs/sdlc.md` từ hợp đồng, bắt đầu với bảng vai trò và ba workflow: mỗi workflow có sơ đồ Mermaid `stateDiagram-v2` và bảng transition (ai chuyển, điều kiện, bằng chứng). Thêm script `render` và `render:check` vào `package.json`. Các task sau thêm phần của mình vào renderer.

**Tiêu chí chấp nhận:**
- [x] `docs/sdlc.md` có bảng vai trò và ba sơ đồ có đủ state và transition; đầu file ghi rõ file được sinh tự động, không sửa tay.
- [x] `npm run render:check` pass ngay sau `npm run render`; fail khi sửa tay `docs/sdlc.md`, hoặc khi đổi YAML mà chưa render lại.
- [x] Chạy `npm run render` hai lần cho ra cùng một file.

**Kiểm chứng:**
- [x] `npm test`, `npm run validate`, `npm run render:check` xanh
- [ ] Thủ công: mở `docs/sdlc.md` bằng trình xem Markdown có hỗ trợ Mermaid (ví dụ GitHub), ba sơ đồ hiển thị đúng (bạn kiểm ở Checkpoint 1)

**Phụ thuộc:** T2

**File dự kiến:** `scripts/render-docs.mjs`, `lib/render.mjs`, `docs/sdlc.md` (sinh ra), `package.json`. Test: `tests/render.test.mjs`

**Cỡ:** M

### Checkpoint 1: sau T1–T5
- [ ] `npm run validate`, `npm test`, `npm run render:check` xanh
- [ ] Bạn soát ba sơ đồ workflow trong `docs/sdlc.md`, đối chiếu spec mục 2.4, trước khi làm tiếp

---

## Giai đoạn 2: phần còn lại của hợp đồng

### [ ] T6: `work-items.yaml`, quy tắc 8

**Mô tả:** Viết spec mục 2.3 và 2.5: các loại work item và ánh xạ sang Jira, cách chọn loại, quy ước nhánh và PR, các trường dữ liệu, DoR và DoD. Quy tắc 8: mỗi work type gắn với đúng một workflow. Quy tắc 3 kiểm thêm tham chiếu tới work type trong `workflows.yaml`. Thêm phần tương ứng vào `docs/sdlc.md`.

**Tiêu chí chấp nhận:**
- [ ] Đủ 5 loại (Epic, Story, Task, Bug, Sub-task), 7 trường dữ liệu, DoR của Story, Task, Bug, DoD chung, DoD riêng của từng loại và DoD của Epic, đúng như spec.
- [ ] Work type không gắn workflow nào, hoặc gắn hai workflow → lỗi `R8` (hai fixture).
- [ ] `docs/sdlc.md` có bảng phân cấp, quy ước, trường dữ liệu, DoR, DoD.

**Kiểm chứng:**
- [ ] `npm test`, `npm run validate`, `npm run render:check` xanh

**Phụ thuộc:** T5

**File dự kiến:** `contract/work-items.yaml`, `contract/schema/work-items.schema.json`, `lib/rules/work-types.mjs`, `lib/rules/references.mjs`, `lib/render.mjs`

**Cỡ:** M

### [ ] T7: `routing.yaml`, quy tắc 6 và `routeBug`

**Mô tả:** Viết bảng định tuyến bug và quy tắc đánh số phiên bản ở spec mục 2.6. Quy tắc 6: bảng phủ đủ 3 vị trí lỗi × 4 severity, mỗi tổ hợp đúng một lần. Cài `routeBug(contract, { affects, severity })`, trả về quy tắc Fix Version (`patch-of-production`, `current-release`, `next-release`), nhánh gốc và môi trường QA. Tham chiếu tới môi trường được kiểm ở T9.

**Tiêu chí chấp nhận:**
- [ ] Ba kịch bản ở spec mục 7 pass: Critical ở Staging → nhánh gốc `release/*`, QA trên Staging; Critical ở Production → `main`, QA trên Staging rồi Production; Low ở Production → `develop`, QA trên Development.
- [ ] Thiếu một tổ hợp, hoặc một tổ hợp xuất hiện hai lần → lỗi `R6` (hai fixture).
- [ ] `docs/sdlc.md` có bảng định tuyến và quy tắc SemVer.

**Kiểm chứng:**
- [ ] `npm test`, `npm run validate`, `npm run render:check` xanh

**Phụ thuộc:** T5

**File dự kiến:** `contract/routing.yaml`, `contract/schema/routing.schema.json`, `lib/rules/routing.mjs`, `lib/contract.mjs`, `lib/render.mjs`

**Cỡ:** M

### [ ] T8: `policies.yaml` đầy đủ và danh mục artifact

**Mô tả:** Bổ sung phần còn lại của spec mục 2.7–2.9 vào `policies.yaml`: giới hạn WIP, retry, bảng xử lý lỗi, số liệu cho retro, danh mục artifact (template, ai tạo, lưu ở đâu) và quy ước ngôn ngữ. Quy tắc 3 kiểm thêm role tạo artifact. Thêm các bảng tương ứng vào `docs/sdlc.md`.

**Tiêu chí chấp nhận:**
- [ ] Đủ 3 giới hạn WIP, 7 tình huống xử lý lỗi, 7 số liệu, và 12 artifact (Story, Task, Bug tách riêng), mỗi artifact có đường dẫn template, người tạo và nơi lưu.
- [ ] Artifact có người tạo chưa khai báo → lỗi `R3`.
- [ ] `docs/sdlc.md` có bảng WIP, xử lý lỗi, số liệu, artifact và quy ước ngôn ngữ.

**Kiểm chứng:**
- [ ] `npm test`, `npm run validate`, `npm run render:check` xanh

**Phụ thuộc:** T5

**File dự kiến:** `contract/policies.yaml`, `contract/schema/policies.schema.json`, `lib/rules/references.mjs`, `lib/render.mjs`

**Cỡ:** M

### [ ] T9: `stages.yaml`: giai đoạn, cổng duyệt, môi trường, nhịp làm việc, release

**Mô tả:** Viết spec mục 2.2, bảng môi trường ở mục 2.6, nhịp làm việc và quy tắc release ở mục 2.7: 11 giai đoạn, 5 cổng duyệt, 3 môi trường, lịch làm việc, và guard của `release-cut` (điểm cắt hợp lệ, không có nhánh release đang mở). Quy tắc 3 kiểm thêm tham chiếu tới role, guard, artifact và môi trường, kể cả môi trường trong `routing.yaml`. Quy tắc 4 kiểm thêm: mọi cổng duyệt chỉ có `human`.

**Tiêu chí chấp nhận:**
- [ ] 11 giai đoạn, 5 cổng và 3 môi trường khớp spec; mỗi giai đoạn có người làm, đầu vào, đầu ra (id artifact) và điều kiện để qua.
- [ ] Cổng có người duyệt khác `human` → lỗi `R4`; giai đoạn tham chiếu artifact hoặc môi trường chưa khai báo → lỗi `R3`.
- [ ] `docs/sdlc.md` có bảng giai đoạn, cổng, môi trường, nhịp làm việc và quy tắc release.

**Kiểm chứng:**
- [ ] `npm test`, `npm run validate`, `npm run render:check` xanh

**Phụ thuộc:** T7, T8

**File dự kiến:** `contract/stages.yaml`, `contract/schema/stages.schema.json`, `lib/rules/references.mjs`, `lib/rules/authority.mjs`, `lib/render.mjs`

**Cỡ:** M

### Checkpoint 2: sau T6–T9
- [ ] Đủ 6 file trong `contract/`; quy tắc 1–6 và 8 có test dương và fixture âm
- [ ] Mọi kịch bản ở spec mục 7 chạy được bằng `lib/contract.mjs`
- [ ] Bạn đọc toàn bộ `docs/sdlc.md`, đối chiếu spec mục 2, trước khi làm template

---

## Giai đoạn 3: template

Mọi template: tiêu đề và hướng dẫn điền viết tiếng Anh, chỗ điền nội dung dành cho tiếng Việt, và một ví dụ ngắn ở cuối file (dùng chung ví dụ Epic "Đăng nhập"). Đường dẫn phải khớp danh mục artifact ở `policies.yaml`.

### [ ] T10: Template `spec.md`, `plan.md`, `adr.md`

**Mô tả:** `spec.md` theo cấu trúc của skill `spec-driven-development`, `plan.md` theo skill `planning-and-task-breakdown`, `adr.md` theo skill `documentation-and-adrs`. Phần đầu file có mã Epic và link Jira.

**Tiêu chí chấp nhận:**
- [ ] Mỗi template có đủ các mục của skill tương ứng, cộng phần đầu file cho mã Epic và link Jira.
- [ ] `plan.md` có mục hợp đồng API cho Story có cả FE và BE, và mục danh sách Story/Task trỏ sang Jira.
- [ ] Mỗi template có hướng dẫn điền và một ví dụ ngắn.

**Kiểm chứng:**
- [ ] Thủ công: so từng template với SKILL.md tương ứng của agent-skills 0.6.13

**Phụ thuộc:** T8

**File dự kiến:** `templates/spec.md`, `templates/plan.md`, `templates/adr.md`

**Cỡ:** S

### [ ] T11: Template `story.md`, `task.md`, `bug.md`, `pull-request.md`

**Mô tả:** Ba template cho mô tả item trên Jira và một template mô tả PR, là bản bàn giao từ dev sang reviewer và QA.

**Tiêu chí chấp nhận:**
- [ ] `story.md`: câu user story, acceptance criteria dạng Given/When/Then, item phụ thuộc, link thiết kế, Sub-task FE/BE khi có cả hai phía, checklist DoR. `task.md`: mục tiêu và checklist kỹ thuật. `bug.md`: bước tái hiện, kết quả thực tế, kết quả mong đợi, Found in, Affects Version, Severity, Fix Version, bằng chứng.
- [ ] `pull-request.md`: mã Jira, thay đổi gì, đã test thế nào, acceptance criterion nào được phủ bởi test nào, rủi ro, checklist DoD.
- [ ] Mỗi template có hướng dẫn điền và một ví dụ ngắn.

**Kiểm chứng:**
- [ ] Thủ công: đối chiếu với DoR, DoD và các trường ở spec mục 2.3, 2.5

**Phụ thuộc:** T8

**File dự kiến:** `templates/story.md`, `templates/task.md`, `templates/bug.md`, `templates/pull-request.md`

**Cỡ:** M

### [ ] T12: Template `review-report.md`, `qa-report.md`, `regression-report.md`

**Mô tả:** Báo cáo review trên PR, báo cáo QA của từng item trên Jira, và báo cáo regression của bản release trong Git.

**Tiêu chí chấp nhận:**
- [ ] `review-report.md`: năm trục review của agent-skills (correctness, readability, architecture, security, performance), mỗi finding có mức Critical/High/Medium/Low.
- [ ] `qa-report.md`: kết quả PASS/FAIL, kết quả từng acceptance criterion, môi trường, commit đã kiểm, link artifact CI. `regression-report.md`: phiên bản, kết quả trên Staging, Bug còn mở theo severity, known issue.
- [ ] Mỗi template có hướng dẫn điền và một ví dụ ngắn.

**Kiểm chứng:**
- [ ] Thủ công: đối chiếu với spec mục 2.2 (stage `review`, `qa-verify`, `staging-verify`) và 2.9

**Phụ thuộc:** T8

**File dự kiến:** `templates/review-report.md`, `templates/qa-report.md`, `templates/regression-report.md`

**Cỡ:** S

### [ ] T13: Template `release-notes.md`, `ledger.md` và quy tắc 7

**Mô tả:** Template release note và ledger tiến độ của agent. Quy tắc 7: mọi artifact đầu ra của stage có template tồn tại trên đĩa, và mọi file trong `templates/` đều được một artifact dùng. `readContract` đã đọc danh sách file template từ T1, nên quy tắc vẫn là hàm thuần.

**Tiêu chí chấp nhận:**
- [ ] `release-notes.md`: phiên bản, mục tiêu của bản, tính năng, bản sửa lỗi, known issue, kèm phần rút gọn để gửi khách. `ledger.md`: mã item, bước hiện tại, việc đã xong, việc kế tiếp, quyết định, điểm bị chặn.
- [ ] Artifact trỏ tới template không tồn tại, hoặc có file template không artifact nào dùng → lỗi `R7` (hai fixture).
- [ ] `npm run validate` xanh với đủ 12 template.

**Kiểm chứng:**
- [ ] `npm test`, `npm run validate`, `npm run render:check` xanh

**Phụ thuộc:** T9, T10, T11, T12

**File dự kiến:** `templates/release-notes.md`, `templates/ledger.md`, `lib/rules/templates.mjs`, `lib/contract.mjs`

**Cỡ:** M

### Checkpoint 3: sau T10–T13
- [ ] `npm run validate` xanh với cả 8 quy tắc
- [ ] Bạn xem nhanh 12 template

---

## Giai đoạn 4: hoàn thiện

### [ ] T14: CI cho repo kit và README

**Mô tả:** `.github/workflows/contract.yml` chạy `npm ci`, `npm run validate`, `npm test`, `npm run render:check` trên PR và khi push vào `main`. `README.md` ngắn: hợp đồng là gì, ai dùng, bốn lệnh, cấu trúc thư mục, và quy tắc không sửa tay `docs/sdlc.md`.

**Tiêu chí chấp nhận:**
- [ ] Workflow CI chạy đúng bốn lệnh như ở local, trên Node 24.
- [ ] README có bốn lệnh, cấu trúc thư mục, và trỏ tới `SPEC.md`, `SPEC-sdlc-contract.md`, `docs/sdlc.md`.

**Kiểm chứng:**
- [ ] Nếu đã có remote: CI xanh trên PR đầu tiên. Nếu chưa: đọc lại file workflow, chạy thử bốn lệnh ở local

**Phụ thuộc:** T13

**File dự kiến:** `.github/workflows/contract.yml`, `README.md`

**Cỡ:** S

### Checkpoint cuối
- [ ] Đạt 6 tiêu chí hoàn thành ở spec mục 9
- [ ] Bạn xác nhận `docs/sdlc.md` khớp với các quyết định trong `misc/brainstorm-discussion.md`
- [ ] Chuyển `tasks/plan.md` và `tasks/todo.md` vào `tasks/archive/sdlc-contract/`; cập nhật trạng thái module trong `SPEC.md`

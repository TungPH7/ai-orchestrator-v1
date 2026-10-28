# Task: quality-gates

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-quality-gates.md](../SPEC-quality-gates.md). Làm theo thứ tự; mỗi task viết test đỏ trước, commit riêng, rồi đánh dấu `[x]`.

**Quy ước chung cho mọi task:**

- Xong task thì `npm run validate`, `npm test`, `npm run render:check` và `npm run jira:checklist:check` xanh.
- Mỗi quy tắc Q có một test dương (cấu hình thật không có lỗi mang mã đó) và ít nhất một fixture âm trong `tests/fixtures/quality/invalid/`.
- Test không gọi mạng. Dữ liệu API ghi sẵn nằm ở `tests/fixtures/quality/api/`, đã làm sạch (plan, quyết định 8).
- Task có nhãn **[bạn]** cần bạn làm một phần trên GitHub hoặc Windows; Claude ghi từng bước bấm và dừng chờ.
- Private key và token không bao giờ xuất hiện trong chat, commit, log hay lịch sử lệnh (plan, quyết định 6).
- Kiểm thật ghi vào `tasks/verification.md`: ngày, bước, kết quả.
- Cỡ task đếm theo file code và file cấu hình, không tính file test và fixture.
- Nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR. Commit theo `CLAUDE.md`: `type(scope): subject`, không body, không dòng `Co-Authored-By`.

---

## Giai đoạn 1: danh tính và nền

### [ ] T1: Tạo hai GitHub App bằng manifest flow [bạn]

**Mô tả:** Viết `docs/github-apps-setup.md` (cách nhanh bằng script, và các bước bấm làm tay để dự phòng), `lib/quality/app-manifest.mjs` (manifest của hai App, trang đăng ký) và `scripts/github-app-create.mjs`. Script phục vụ một trang ở `127.0.0.1`; mỗi nút gửi manifest của một App lên GitHub; GitHub trả về một code dùng một lần, script đổi code lấy App ID, slug và private key, rồi ghi key thẳng vào `C:\Users\Huu Tung\ao-keys\<slug>.pem`. Đổi so với bản plan đầu: bạn không phải điền form hay cầm file key (bạn hỏi ngày 2026-10-29 vì sao phải tự làm).

Bạn làm: với mỗi App, bấm **Tạo App trên GitHub** trên trang của script, bấm **Create GitHub App** trên GitHub, rồi cài App vào `ao-pilot`. GitHub không có API tạo App hay cài App mà bỏ qua được bước xác nhận này của chủ tài khoản.

Claude làm: chạy script, mở trang, đặt hai biến môi trường user `AO_DEV_APP_KEY_FILE` và `AO_REVIEW_APP_KEY_FILE` (giá trị chỉ là đường dẫn), ghi slug và App ID vào `tasks/verification.md`.

**Tiêu chí chấp nhận:**
- [ ] Manifest của `ao-dev` chỉ xin Contents và Pull requests ở mức ghi; của `ao-review` chỉ xin Contents đọc và Pull requests ghi; cả hai không công khai, không webhook. Có test.
- [ ] Hai App tồn tại, chỉ cài vào `ao-pilot`; `GET /repos/TungPH7/ao-pilot/installation` bằng JWT của từng App trả 200 (Claude kiểm ở T2).
- [ ] Slug và App ID của hai App ghi trong `tasks/verification.md`; output của script không chứa key, code hay client secret.

**Kiểm chứng:**
- [ ] `npm test` xanh
- [ ] Hai biến môi trường đọc được từ registry và trỏ tới file tồn tại; Claude chỉ in "có" hoặc "không", không in nội dung file

**Phụ thuộc:** không

**File dự kiến:** `docs/github-apps-setup.md`, `lib/quality/app-manifest.mjs`, `scripts/github-app-create.mjs`, `tasks/verification.md`

**Cỡ:** S

### [ ] T2: Token của GitHub App

**Mô tả:** `lib/quality/github-app.mjs`: ký JWT RS256 bằng `node:crypto` (thời hạn 10 phút, lùi `iat` 60 giây cho lệch đồng hồ), tìm installation của repo, rồi xin installation token chỉ cho repo đó. Hàm trả token cho code gọi, không in ra. `lib/tracker/github-client.mjs` thêm chế độ ghi khi truyền `write: true` (POST, PATCH, PUT); mặc định vẫn chỉ đọc.

**Tiêu chí chấp nhận:**
- [ ] JWT kiểm được bằng public key của một cặp khóa sinh ra trong test; `iss` là App ID.
- [ ] Request xin token có `repositories: [<repo>]`; lỗi 401, 404 ra thông báo rõ ràng và không chứa JWT, token hay key.
- [ ] Client ở chế độ chỉ đọc từ chối mọi method khác GET.

**Kiểm chứng:**
- [ ] `npm test` xanh
- [ ] Kiểm thật: lấy token của cả hai App cho `ao-pilot`, gọi `GET /installation/repositories` thấy đúng một repo; ghi vào `tasks/verification.md`

**Phụ thuộc:** T1

**File dự kiến:** `lib/quality/github-app.mjs`, `lib/tracker/github-client.mjs`

**Cỡ:** S

### [ ] T3: Kiểm giả định nền trên `ao-pilot` [bạn]

**Mô tả:** Thử ba giả định của spec bằng một PR thử, trước khi viết code phụ thuộc vào chúng (plan, quyết định 1). Script thử nằm trong scratchpad, gọi `github-app.mjs`. Nhánh thử không mang mã Jira, nên `jira-sync` bỏ qua.

1. Bot `ao-dev` mở PR thử vào `develop`. Bot `ao-review` gửi review `REQUEST_CHANGES` trên PR đó.
2. **Bạn** approve PR thử trên GitHub (Claude ghi các bước bấm).
3. Bot `ao-dev` merge PR thử. Claude xem workflow `Deploy` có chạy trên `develop` do push đó không.
4. Tạo environment `merge-gate` chỉ cho nhánh `main`, với một secret giả. Một workflow thử trên nhánh khác `main` in độ dài của secret (không in giá trị). Xong thì xóa workflow, nhánh và secret giả; environment `merge-gate` giữ lại nếu giới hạn nhánh có hiệu lực.

**Tiêu chí chấp nhận:**
- [ ] PR thử có tác giả là bot của `ao-dev`; review của bot `ao-review` có trạng thái `CHANGES_REQUESTED`.
- [ ] Approve của bạn được GitHub nhận trên PR của bot.
- [ ] Push do bot `ao-dev` merge kích hoạt workflow `Deploy` trên `develop`.
- [ ] Biết chắc giới hạn nhánh của environment có được thực thi trên gói Free hay không (tiêu chí 10 của spec).

**Kiểm chứng:**
- [ ] Bốn kết quả ghi trong `tasks/verification.md`. Giả định nào sai thì Claude dừng, đề xuất sửa spec và chờ bạn duyệt

**Phụ thuộc:** T2

**File dự kiến:** `tasks/verification.md` (trên `ao-pilot`: nhánh, PR và workflow thử, xóa sau khi xong)

**Cỡ:** S

### [ ] T4: `quality/gates.yaml`, quy tắc Q1, Q3, Q4

**Mô tả:** Viết `quality/gates.yaml` theo spec mục 6, schema `quality/schema/gates.schema.json`, và `lib/quality/gates.mjs` (đọc và kiểm). `scripts/validate-contract.mjs` kiểm thêm cấu hình này. Q1: đúng schema. Q3: mỗi vai trò trong `github_apps` là vai trò agent của hợp đồng, và thuộc nhiều nhất một App. Q4: `merge_method` chỉ dùng `feature`, `bugfix`, `hotfix`.

**Tiêu chí chấp nhận:**
- [ ] `quality/gates.yaml` có mọi khóa của spec mục 6.
- [ ] Mỗi quy tắc Q1, Q3, Q4 có test dương và fixture âm.
- [ ] Lỗi in theo dạng `{ rule, path, message }` như các quy tắc R và J.

**Kiểm chứng:**
- [ ] `npm run validate` và `npm test` xanh

**Phụ thuộc:** không

**File dự kiến:** `quality/gates.yaml`, `quality/schema/gates.schema.json`, `lib/quality/gates.mjs`, `scripts/validate-contract.mjs`

**Cỡ:** M

### [ ] T5: Thay đổi hợp đồng: stage `merge`, template báo cáo review

**Mô tả:** Áp hai thay đổi hợp đồng bạn đã duyệt ở spec mục 2.9 (thay đổi thứ ba, capability map, đã sửa trong `SPEC.md` cùng lúc duyệt spec). Stage `merge` đổi điều kiện qua thành "`merge-gate` pass". Template `review-report.md` thêm dòng `Role: reviewer` hoặc `Role: security` ngay dưới tiêu đề, và ví dụ có dòng này.

**Tiêu chí chấp nhận:**
- [ ] `contract/stages.yaml` và bảng 2.2 của `SPEC-sdlc-contract.md` ghi "`merge-gate` pass".
- [ ] Template và ví dụ của `review-report.md` có dòng `Role:`; test của template kiểm dòng này.
- [ ] `docs/sdlc.md` được sinh lại.

**Kiểm chứng:**
- [ ] `npm run validate`, `npm test`, `npm run render:check` xanh

**Phụ thuộc:** không

**File dự kiến:** `contract/stages.yaml`, `templates/review-report.md`, `SPEC-sdlc-contract.md`, `docs/sdlc.md`

**Cỡ:** S

### Checkpoint 1

- [ ] `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check` xanh
- [ ] Ba giả định nền của T3 đúng, kết quả ghi trong `tasks/verification.md`; giả định nào sai thì spec đã được sửa và bạn đã duyệt bản sửa
- [ ] Bạn soát các giá trị trong `quality/gates.yaml`: ngưỡng, mẫu tắt kiểm tra, nhánh và file được bảo vệ

---

## Giai đoạn 2: kiểm ở máy bạn

### [ ] T6: Hook `commit-msg`, `pre-push` và lệnh cài hook

**Mô tả:** `lib/quality/git-hooks.mjs` có hai hàm thuần: kiểm header commit (dùng `checkCommit`, cho qua commit merge và revert do git tạo) và kiểm các dòng ref mà git đưa vào `pre-push` (chặn cập nhật `develop`, `main`, `release/*` đã có; cho tạo `release/*` mới). `kit/.githooks/commit-msg` và `kit/.githooks/pre-push` là file sh ngắn gọi script Node. `scripts/install-hooks.mjs` đặt `core.hooksPath` thành `.githooks`.

**Tiêu chí chấp nhận:**
- [ ] Header đúng, sai, merge, revert cho ra kết quả như spec mục 2.3.
- [ ] Dòng ref cập nhật `develop` bị chặn; dòng tạo `release/v1.0.0` mới được cho qua; xóa nhánh `feature/` được cho qua.
- [ ] Chạy `install-hooks.mjs` hai lần không lỗi và không đổi gì ở lần hai.

**Kiểm chứng:**
- [ ] `npm test` xanh
- [ ] Thử tay trong một repo git tạm: commit sai header bị chặn

**Phụ thuộc:** T4

**File dự kiến:** `lib/quality/git-hooks.mjs`, `scripts/install-hooks.mjs`, `kit/.githooks/commit-msg`, `kit/.githooks/pre-push`

**Cỡ:** M

### [ ] T7: Hook `pre-commit` với secretlint

**Mô tả:** Thêm `secretlint` và `@secretlint/secretlint-rule-preset-recommend` (phiên bản chính xác) vào `package.json` của kit. `kit/.githooks/pre-commit` gọi `scripts/pre-commit.mjs`: chạy secretlint trên các file đã stage, rồi `npm run precommit --if-present` của dự án.

**Tiêu chí chấp nhận:**
- [ ] File stage có secret giả theo dạng của preset (ví dụ khóa riêng PEM giả) thì hook chặn và in tên file.
- [ ] Không có file nào stage, hoặc chỉ có file bị xóa, thì hook cho qua.
- [ ] Script `precommit` của dự án lỗi thì hook chặn.

**Kiểm chứng:**
- [ ] `npm ci`, `npm test` xanh, và CI của kit cài được dependency mới

**Phụ thuộc:** T6

**File dự kiến:** `package.json`, `package-lock.json`, `scripts/pre-commit.mjs`, `kit/.githooks/pre-commit`

**Cỡ:** S

### [ ] T8: Hook `gh-guard` của Claude Code

**Mô tả:** `lib/quality/commands.mjs` phân loại lệnh Bash và đường dẫn file theo bảng ở spec mục 2.7. `kit/.claude/hooks/gh-guard.mjs` đọc input của hook, lấy vai trò từ `agent_type` như `jira-guard`, gọi thư viện và in quyết định. `kit/.claude/settings.json` khai báo hook cho `Bash`, `Read`, `Edit`, `Write`, `NotebookEdit`.

**Tiêu chí chấp nhận:**
- [ ] Mỗi dòng của bảng mục 2.7 có một lệnh bị chặn và một lệnh gần giống được cho qua (ví dụ `git commit -m "-n"`, `gh pr view`, `gh api` với GET).
- [ ] Phiên chính (không có `agent_type`) và agent không thuộc hợp đồng không bị chặn bởi hook này.
- [ ] `devops` sửa được `.github/workflows/**`; vai trò khác thì bị chặn. Không vai trò nào sửa được `.ai-orchestrator/**`, `.githooks/**`, `.claude/**`.
- [ ] Lý do chặn nói rõ cách làm đúng, ví dụ "use ao-pr.mjs create".

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** T4

**File dự kiến:** `lib/quality/commands.mjs`, `kit/.claude/hooks/gh-guard.mjs`, `kit/.claude/settings.json`

**Cỡ:** M

### [ ] T9: Script `ao-pr.mjs` và kiểm mô tả PR

**Mô tả:** `lib/quality/pull-request.mjs` kiểm tiêu đề (`checkPrTitle`) và mô tả PR theo spec mục 2.5: đủ sáu mục của `pull-request.md`, mục nào cũng có nội dung, không còn `<...>`, không còn mục Example. `scripts/ao-pr.mjs` có bốn lệnh `create`, `edit`, `comment`, `review` (spec mục 2.2), lấy token qua `github-app.mjs`, đọc slug và App ID từ biến `AO_DEV_APP`, `AO_DEV_APP_ID`, `AO_REVIEW_APP`, `AO_REVIEW_APP_ID`. `kit/.claude/settings.json` thêm bốn biến này.

**Tiêu chí chấp nhận:**
- [ ] `create` từ chối tiêu đề hoặc mô tả sai và nói thiếu gì, trước khi gọi API.
- [ ] `review` chỉ nhận `--event COMMENT` hoặc `--event REQUEST_CHANGES`.
- [ ] `edit` chỉ đổi tiêu đề và mô tả.
- [ ] Ví dụ trong template `pull-request.md` (bỏ phần hướng dẫn) đạt kiểm tra mô tả.

**Kiểm chứng:**
- [ ] `npm test` xanh (API giả)

**Phụ thuộc:** T2, T4

**File dự kiến:** `lib/quality/pull-request.mjs`, `scripts/ao-pr.mjs`, `kit/.claude/settings.json`

**Cỡ:** M

---

## Giai đoạn 3: CI

### [ ] T10: Coverage của dòng thay đổi

**Mô tả:** `lib/quality/coverage.mjs` đọc lcov (nhiều file, theo `coverage.lcov`), đọc `git diff -U0` tính từ merge base, và tính tỷ lệ phủ của các dòng thêm hoặc sửa theo spec mục 2.4. `scripts/coverage-diff.mjs --base <ref>` in bảng theo file và thoát với mã khác 0 khi dưới ngưỡng.

**Tiêu chí chấp nhận:**
- [ ] Dòng không có trong lcov (comment, kiểu) không được tính.
- [ ] File nguồn thay đổi mà thiếu trong lcov thì đỏ, kèm lời nhắc về cấu hình coverage.
- [ ] File test, file ngoài `coverage.source` và file trong `coverage.exclude` không được tính; PR không đổi dòng thực thi nào thì đạt.

**Kiểm chứng:**
- [ ] `npm test` xanh, với lcov và diff mẫu

**Phụ thuộc:** T4

**File dự kiến:** `lib/quality/coverage.mjs`, `scripts/coverage-diff.mjs`

**Cỡ:** S

### [ ] T11: Job `policy`: quy ước của PR, mẫu tắt kiểm tra, ngưỡng bị hạ, `npm audit`

**Mô tả:** `lib/quality/suppressions.mjs` đọc diff: dòng thêm có mẫu tắt kiểm tra mà không có `reason:`, `.only(`, ngưỡng trong `quality/gates.yaml` bị hạ, file test bị xóa (chỉ liệt kê). `scripts/check-policy.mjs` gộp bốn bước của job `policy`: quy ước (nhánh nguồn so với nhánh đích, mọi commit của PR trừ commit merge, tiêu đề PR), mẫu tắt kiểm tra, ngưỡng, và `npm audit --json` lọc theo `audit_level` và ngoại lệ còn hạn. Kết quả ghi vào job summary.

**Tiêu chí chấp nhận:**
- [ ] Mỗi mẫu tắt kiểm tra có test có và không có `reason:`; `.only(` luôn đỏ.
- [ ] Hạ `changed_lines_min` hoặc đổi `audit_level` xuống mức thấp hơn thì đỏ.
- [ ] Ngoại lệ hết hạn thì advisory đó làm đỏ lại; advisory mức moderate không làm đỏ.
- [ ] Khi chạy do push (không có PR), chỉ bước `npm audit` chạy.

**Kiểm chứng:**
- [ ] `npm test` xanh, với diff và output `npm audit` mẫu

**Phụ thuộc:** T10

**File dự kiến:** `lib/quality/suppressions.mjs`, `scripts/check-policy.mjs`

**Cỡ:** M

### [ ] T12: Workflow `CI` bốn job, quy tắc Q2

**Mô tả:** `kit/.github/workflows/ci.yml` tên `CI`, bốn job `policy`, `build-test`, `secrets`, `sast` theo spec mục 2.4, có `concurrency` hủy lần chạy cũ. gitleaks tải từ GitHub release, kiểm SHA-256 rồi mới chạy. Semgrep chạy bằng `uvx semgrep==<phiên bản>` với `--baseline-commit` là merge base. Quy tắc Q2: `checks` của `quality/gates.yaml` trùng khớp tập job của `ci.yml`.

**Tiêu chí chấp nhận:**
- [ ] Bốn job đọc cấu hình từ `.ai-orchestrator/quality/gates.yaml` của dự án.
- [ ] Q2 có test dương và fixture âm (thừa một job, thiếu một job).
- [ ] Mọi action ghim theo SHA; gitleaks và Semgrep ghim phiên bản.

**Kiểm chứng:**
- [ ] `npm run validate`, `npm test` xanh; workflow chạy thật ở T13

**Phụ thuộc:** T7, T11

**File dự kiến:** `kit/.github/workflows/ci.yml`, `lib/quality/gates.mjs`

**Cỡ:** S

### [ ] T13: Kiểm thật hook git và CI trên `ao-pilot`

**Mô tả:** Phiên chính cập nhật bản chép kit trên `main` và `develop` của `ao-pilot` (plan, quyết định 7): thêm `quality/`, các script mới, `.githooks/`, `ci.yml` thay CI nhỏ cũ. Thêm một package TypeScript nhỏ ở gốc repo có `lint`, `typecheck`, `test:coverage` (ghi lcov cho mọi file nguồn), `build`, `precommit` và `prepare`, với ít dependency nhất có thể. Rồi thử các tiêu chí 3 và 4 của spec trên một PR thử mang mã một item `DEMO`.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 3: `commit-msg` chặn header sai, `pre-commit` chặn file có secret giả, `pre-push` chặn push lên `develop`.
- [ ] Tiêu chí 4: mỗi job đỏ ít nhất một lần đúng lý do, rồi xanh khi sửa.
- [ ] Số phút Actions của một lần chạy `CI` được ghi lại.

**Kiểm chứng:**
- [ ] Kết quả và link các lần chạy ghi trong `tasks/verification.md`

**Phụ thuộc:** T6, T7, T12

**File dự kiến:** `tasks/verification.md` (trên `ao-pilot`: `package.json`, mã TypeScript mẫu, bản chép kit)

**Cỡ:** M

### Checkpoint 2

- [ ] Tiêu chí 3 và 4 của spec mục 9 đạt
- [ ] Bạn xem một lần chạy `CI` đỏ và job summary của nó trên `ao-pilot`

---

## Giai đoạn 4: merge-gate, audit, ruleset

### [ ] T14: `decideMerge` và đọc báo cáo review

**Mô tả:** `lib/quality/pull-request.mjs` thêm phần đọc báo cáo review: dòng `Role:`, bảng Findings, các finding Critical và High. `lib/quality/merge-gate.mjs` có `decideMerge(facts)` thuần, theo bảng điều kiện ở spec mục 2.5: trả `merge` (kèm tiêu đề và body của commit squash, SHA của commit đầu), `wait` (kèm danh sách điều kiện thiếu), `needs-you` (PR sửa file được bảo vệ), hoặc `skip` (PR do người mở, PR draft, nhánh không phải của item). `facts.mjs` export `readChecks` và hàm đọc review để dùng chung.

**Tiêu chí chấp nhận:**
- [ ] Bảng tình huống của spec mục 7 cho `decideMerge` chạy đủ.
- [ ] Commit squash có tiêu đề đúng bằng tiêu đề PR và body liệt kê header các commit của PR.
- [ ] Guard `ci-green` và `changes-requested` của `tracker-integration` vẫn qua toàn bộ test cũ.

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** T5, T9

**File dự kiến:** `lib/quality/pull-request.mjs`, `lib/quality/merge-gate.mjs`, `lib/tracker/facts.mjs`

**Cỡ:** M

### [ ] T15: `merge-gate`: script và workflow

**Mô tả:** `scripts/merge-gate.mjs` gom dữ kiện của các PR đang mở, gọi `decideMerge`, merge bằng token của `ao-dev`, và in `Waiting #<n>: ...` cho PR chưa đủ; `--dry-run` chỉ in. `kit/.github/workflows/merge-gate.yml` chạy theo `workflow_run` của `jira-sync` và `workflow_dispatch`, bỏ qua lần chạy không ở nhánh mặc định, và lấy key từ environment `merge-gate` (hoặc secret của repo, theo kết quả T3).

**Tiêu chí chấp nhận:**
- [ ] Chạy lại lần hai không merge hay in gì khác lần đầu.
- [ ] Merge gửi kèm SHA của commit đầu; GitHub từ chối vì PR có push mới thì script báo `wait`, không báo lỗi.
- [ ] Workflow không có trigger `pull_request` hay `pull_request_review`.

**Kiểm chứng:**
- [ ] `npm test` xanh; `node scripts/merge-gate.mjs --dry-run` trên `ao-pilot` in đúng PR nào chờ gì

**Phụ thuộc:** T3, T14

**File dự kiến:** `scripts/merge-gate.mjs`, `kit/.github/workflows/merge-gate.yml`

**Cỡ:** S

### [ ] T16: `audit`: quyết định, script, reusable workflow, cờ "Needs you"

**Mô tả:** `lib/quality/audit.mjs` có `decideAudit(facts)` thuần theo spec mục 2.6. `scripts/audit.mjs --sha <commit> --branch <nhánh>` gom dữ kiện (PR của commit qua `GET /commits/{sha}/pulls`, review, check), gọi `decideAudit`, ghi job summary; khi đỏ thì gắn cờ "Needs you" cho item bằng token CI, dùng lại phần ghi Jira của `tracker-integration`. `kit/.github/workflows/audit.yml` là reusable workflow (`workflow_call`).

**Tiêu chí chấp nhận:**
- [ ] Bảng tình huống của spec mục 7 cho `decideAudit` chạy đủ.
- [ ] Commit không mang mã item nào thì `audit` vẫn đỏ đúng, chỉ không gắn cờ.
- [ ] Gắn cờ hai lần cho cùng một item không tạo comment trùng.

**Kiểm chứng:**
- [ ] `npm test` xanh

**Phụ thuộc:** T14

**File dự kiến:** `lib/quality/audit.mjs`, `scripts/audit.mjs`, `kit/.github/workflows/audit.yml`

**Cỡ:** M

### [ ] T17: `gh:protect` và kiểm trên repo public tạm [bạn]

**Mô tả:** `scripts/gh-protect.mjs` (`npm run gh:protect -- --repo <owner>/<name>`) dựng payload ruleset `ao-protected` theo spec mục 2.8 từ `quality/gates.yaml`, tạo mới hoặc cập nhật ruleset cùng tên, và báo soft mode khi API trả 403. Kiểm thật: chạy trên `ao-pilot`; tạo repo public rỗng `TungPH7/ao-ruleset-probe`, chạy hai lần, đọc lại ruleset, rồi xóa repo.

Bạn làm, nếu `gh` chưa có quyền xóa repo: chạy `gh auth refresh -h github.com -s delete_repo` rồi xác nhận trên trình duyệt; hoặc xóa repo trên giao diện theo các bước Claude ghi.

**Tiêu chí chấp nhận:**
- [ ] Payload có đủ rule của spec mục 2.8, và bốn check lấy từ `checks`.
- [ ] Trên `ao-pilot`: in soft mode, thoát mã 0, repo không đổi.
- [ ] Trên repo tạm: ruleset đọc lại khớp payload; lần chạy thứ hai không tạo ruleset thứ hai; repo đã bị xóa.

**Kiểm chứng:**
- [ ] `npm test` xanh; tiêu chí 11 ghi trong `tasks/verification.md`

**Phụ thuộc:** T4

**File dự kiến:** `scripts/gh-protect.mjs`, `package.json`

**Cỡ:** S

### Checkpoint 3

- [ ] `npm test` xanh; `merge-gate.mjs --dry-run` trên `ao-pilot` in đúng PR nào chờ gì
- [ ] Tiêu chí 11 đạt

---

## Giai đoạn 5: kiểm thật đầu cuối

### [ ] T18: Agent mở PR, reviewer yêu cầu sửa, `gh-guard` chặn đường vòng [bạn]

**Mô tả:** Cập nhật bản chép kit trên `ao-pilot` (gồm `gh-guard`, `ao-pr.mjs`, `merge-gate.yml`, `audit.yml`; workflow deploy giả gọi `audit`). Chạy agent `fe-dev` và `reviewer` bằng `claude -p --agent` như T15 của `tracker-integration`, với một item `DEMO`. Bạn chấp nhận hook mới của dự án khi Claude Code hỏi.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 5: PR do `fe-dev` mở bằng `ao-pr.mjs` có tác giả là bot của `ao-dev`; báo cáo yêu cầu sửa của `reviewer` do bot của `ao-review` đăng; `jira-sync` đưa item về In Progress.
- [ ] Tiêu chí 6: agent bị chặn khi chạy `gh pr merge`, `git commit --no-verify`, và khi sửa `.github/workflows/ci.yml`; được chạy `ao-pr.mjs create`.

**Kiểm chứng:**
- [ ] Kết quả ghi trong `tasks/verification.md`

**Phụ thuộc:** T8, T9, T13, T15, T16

**File dự kiến:** `tasks/verification.md` (trên `ao-pilot`: bản chép kit, workflow deploy giả)

**Cỡ:** S

### [ ] T19: `merge-gate` merge sau khi bạn approve, item sang Ready for QA [bạn]

**Mô tả:** Tiếp PR của T18: `fe-dev` sửa theo yêu cầu, `reviewer` và `security` đăng báo cáo không còn Critical/High. Bạn approve một lần, rồi Claude push thêm một commit để thử approve cũ; bạn approve lại. Thêm một PR của agent sửa `.github/workflows/` để thử điều kiện file được bảo vệ.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 7: `merge-gate` squash vào `develop` bằng `ao-dev`; CI, `audit` và deploy lên `development` chạy; `jira-sync` chuyển item sang Ready for QA bằng `orchestratorci`.
- [ ] Tiêu chí 8: `merge-gate` đứng chờ khi approve nằm trên commit cũ, và không merge PR sửa `.github/workflows/`.
- [ ] `merge-gate` chạy được qua cả hai đường: sau review, và sau khi CI chạy xong.
- [ ] Tiêu chí 10 xác nhận lại trong lần chạy thật của `merge-gate`. Tiêu chí 12: số phút Actions của cả vòng PR được ghi lại.

**Kiểm chứng:**
- [ ] Kết quả, link PR và link các lần chạy ghi trong `tasks/verification.md`

**Phụ thuộc:** T18

**File dự kiến:** `tasks/verification.md`

**Cỡ:** S

### [ ] T20: `audit` chặn commit merge tay [bạn]

**Mô tả:** Một PR của agent có CI xanh nhưng chưa có approve; bạn bấm Merge trên giao diện (Claude ghi các bước bấm).

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 9: `audit` đỏ và ghi lý do, job deploy không chạy, item mang cờ "Needs you".

**Kiểm chứng:**
- [ ] Kết quả ghi trong `tasks/verification.md`; Claude gỡ cờ và trả `develop` của `ao-pilot` về trạng thái sạch bằng một PR revert qua đủ cổng

**Phụ thuộc:** T19

**File dự kiến:** `tasks/verification.md`

**Cỡ:** XS

### Checkpoint 4

- [ ] Tiêu chí 5 đến 10 và 12 của spec mục 9 đạt
- [ ] Bạn xem lịch sử item thử trên `DEMO` và các PR thử trên `ao-pilot`

---

## Giai đoạn 6: hoàn thiện

### [ ] T21: README, tài liệu, `SPEC.md`, lưu trữ plan

**Mô tả:** README thêm mục quality gates (các lớp chốt, biến môi trường mới, cách cài hook). Viết `docs/quality-gates.md`: từng check, đọc job summary thế nào, xử lý khi đỏ, khi nào bạn phải merge tay. Spec ghi module hoàn thành và kết quả kiểm thật; `SPEC.md` cập nhật trạng thái. Chuyển `plan.md`, `todo.md`, `verification.md` vào `tasks/archive/quality-gates/`.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 13 của spec đạt.
- [ ] Test của README (như `tests/repo.test.mjs`) kiểm mục mới và các biến môi trường mới.

**Kiểm chứng:**
- [ ] `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check` và CI trên `main` xanh

**Phụ thuộc:** T20

**File dự kiến:** `README.md`, `docs/quality-gates.md`, `SPEC-quality-gates.md`, `SPEC.md`

**Cỡ:** S

### Checkpoint cuối

- [ ] Đạt 13 tiêu chí ở spec mục 9
- [ ] Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/quality-gates/`
- [ ] Bạn xác nhận module hoàn thành

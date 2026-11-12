# SPEC: quality-gates

> **Module:** `quality-gates`, xem capability map trong [SPEC.md](SPEC.md). **Phụ thuộc:** `sdlc-contract`, `tracker-integration` (mục 2.9). **Được dùng bởi:** `dev-workflow`, `release-workflow`, `project-scaffold`, và `ci-agents` ở Cấp 2.
>
> **Trạng thái:** đã duyệt 2026-10-29, cùng ba thay đổi ở mục 2.9; hoàn thành 2026-10-29. **Plan:** [tasks/archive/quality-gates/plan.md](tasks/archive/quality-gates/plan.md). **Kết quả kiểm thật:** [tasks/archive/quality-gates/verification.md](tasks/archive/quality-gates/verification.md). **Nguồn thảo luận:** [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md), Phiên 10 · Lượt 1–3.

## 1. Mục tiêu

Biến các cổng tự động của hợp đồng thành kiểm tra thật: code chỉ vào `develop`, `main`, `release/*` và chỉ được deploy khi đã qua CI, có báo cáo review và có approve của bạn, kể cả khi repo private ở gói Free không có branch protection. Sau module này:

- Hook git ở local chặn commit sai quy ước, commit có secret, và push thẳng lên nhánh được bảo vệ.
- Workflow `CI` của kit chạy trên mọi PR: quy ước, lint, typecheck, test kèm coverage của dòng thay đổi, build, quét secret, SAST, lỗ hổng dependency, và chặn việc tắt bớt kiểm tra.
- Dev agent mở PR bằng GitHub App `ao-dev`; `reviewer` và `security` đăng báo cáo bằng GitHub App `ao-review`. Nhờ vậy bạn approve được PR của agent.
- Workflow `merge-gate` tự merge PR của Story, Task, Bug ngay khi đủ điều kiện, tức là ngay sau khi bạn approve.
- Workflow `audit` kiểm commit trước mỗi lần deploy; deploy chỉ chạy khi `audit` xanh.
- Hook của Claude Code chặn agent đi đường vòng: bỏ qua hook git, tự merge, tự approve, sửa file của kit.
- Với repo hỗ trợ ruleset (repo public, hoặc gói Pro trở lên), một lệnh của kit áp ruleset tương ứng.

**Ràng buộc gói GitHub.** Module này thiết kế cho repo private trên tài khoản cá nhân gói Free (bạn chọn ngày 2026-10-29). Không dùng tính năng chỉ có ở gói trả phí; ruleset chỉ là lớp thêm khi repo hỗ trợ.

**Ngoài phạm vi:**

- Cấu hình lint, typecheck, test, build cho Next.js + NestJS: thuộc `project-scaffold`. Module này chỉ quy định tên các npm script dự án phải có.
- Merge PR release vào `main`, gắn tag, merge ngược, pipeline deploy thật: thuộc `release-workflow`. Module này cung cấp `audit` để pipeline deploy gọi, và quy tắc `audit` cho PR release.
- Prompt của agent, lúc nào gọi review: thuộc `agent-roster` và `dev-workflow`. Module này cung cấp script mở PR và đăng review.
- E2E và regression: thuộc `release-workflow` (stage `qa-verify`, `staging-verify`).
- Ngưỡng "coverage cả dự án không được giảm": làm khi dự án có code thật.
- Agent review PR ngay trong GitHub Actions: `ci-agents` ở Cấp 2.

## 2. Thiết kế

### 2.1 Gói Free có gì, và cổng chốt ở đâu

| Module cần | Repo private, tài khoản cá nhân gói Free | Căn cứ |
|---|---|---|
| Branch protection, ruleset | Không | API trả 403 trên `ao-pilot` (2026-10-28 và 2026-10-29); trang gói của GitHub xếp protected branches vào Pro |
| Auto-merge | Không dùng được: auto-merge chỉ chờ review và check bắt buộc, mà repo không có rule bắt buộc nào | Tài liệu auto-merge |
| CodeQL, secret scanning, push protection | Không: phải mua, và chỉ tổ chức ở gói Team hoặc Enterprise mua được | Tài liệu GitHub Advanced Security |
| GitHub App và installation token | Có | [Inference] Tài liệu không giới hạn theo gói |
| Environment và deployment | Có | Ba environment của `ao-pilot` đã chạy ở T18 của `tracker-integration` |
| Secret của environment, giới hạn nhánh cho environment | Có: job ở nhánh khác nhánh được phép thì bị chặn, không đọc được secret | Kiểm thật ở T3 (2026-10-29), tiêu chí 10 |
| GitHub Actions | 2.000 phút mỗi tháng | Trang gói của GitHub |

Không có branch protection thì GitHub không chặn được merge hay push. Cổng vì vậy chốt ở bốn lớp:

1. **Hook git ở local** (mục 2.3): bắt lỗi sớm, nhưng bỏ qua được bằng `--no-verify`.
2. **Hook của Claude Code** (mục 2.7): chặn agent bỏ qua hook git, tự merge, tự approve, sửa file của kit.
3. **`merge-gate`** (mục 2.5): con đường merge bình thường. Nó chạy bằng bản trên nhánh mặc định, nên PR không sửa được nó.
4. **`audit`** (mục 2.6): kiểm commit trước khi deploy. Nút Merge trên giao diện vẫn bấm được, nhưng commit không qua cổng thì không lên môi trường nào.

### 2.2 Danh tính trên GitHub

| Danh tính | Loại | Dùng cho | Quyền trên repo |
|---|---|---|---|
| Bạn (`TungPH7`) | Tài khoản cá nhân | Approve PR (cổng ③); merge tay PR có sửa file được bảo vệ; chạy `gh:protect` | Admin |
| `ao-dev` | GitHub App | `ba`, `sa` (SPEC, plan, ADR), `fe-dev`, `be-dev`, `devops` mở và sửa PR; `merge-gate` merge | Contents: read and write; Pull requests: read and write |
| `ao-review` | GitHub App | `reviewer`, `security` đăng báo cáo review | Contents: read; Pull requests: read and write |

- **Hai App**, vì tác giả PR không approve và không request changes được PR của mình, kể cả khi tác giả là bot, trong khi guard `changes-requested` dựa vào review "request changes".
- **Tên App là duy nhất trên toàn GitHub** và dài tối đa 34 ký tự, nên tên thật có tiền tố: `tungph7-ao-dev` và `tungph7-ao-review` (bạn đồng ý ngày 2026-10-29; tên nào đã có người dùng thì bạn chọn tên khác lúc tạo). Spec gọi tắt là `ao-dev` và `ao-review`.
- **Cài đặt:** mỗi App chọn "Only on this account", tắt webhook, và chỉ cài vào repo của dự án.
- **Token:** script của kit ký JWT bằng private key của App (RS256, `node:crypto`), tìm installation của repo, rồi xin installation token chỉ cho repo đó. Token sống một giờ và không bao giờ được in ra.
- **Private key ở máy bạn:** mỗi App một file PEM nằm ngoài repo. Biến môi trường user `AO_DEV_APP_KEY_FILE` và `AO_REVIEW_APP_KEY_FILE` trỏ tới hai file này.
- **Private key trong CI:** chỉ `merge-gate` cần key, và chỉ key của `ao-dev`. Đây là một private key riêng (một App có được nhiều key), lưu ở secret `AO_DEV_APP_KEY` của environment `merge-gate`; environment này chỉ cho nhánh mặc định. T3 đã kiểm: GitHub thực thi giới hạn nhánh này trên gói Free. Job của `merge-gate` khai `environment: { name: merge-gate, deployment: false }`: vẫn chịu giới hạn nhánh nhưng không tạo deployment. Nếu tạo deployment, sự kiện `deployment_status` sẽ kích hoạt `jira-sync`, và `jira-sync` chạy xong lại kích hoạt `merge-gate`, thành vòng lặp (phát hiện ở T3).
- **Cấu hình không bí mật** (slug và App ID) nằm trong `env` của `.claude/settings.json` của dự án, cạnh `AO_JIRA_SPACE` và `AO_APPROVERS`: `AO_DEV_APP`, `AO_DEV_APP_ID`, `AO_REVIEW_APP`, `AO_REVIEW_APP_ID`.
- **Agent vẫn commit và push bằng git của bạn.** GitHub chỉ cấm tác giả PR approve, không cấm người commit, nên chỉ hai việc cần App: mở PR và đăng review.

**Script `ao-pr.mjs`** là cách duy nhất agent làm việc với PR. Script gọi REST bằng `fetch`, không qua `gh`:

| Lệnh | App | Ghi chú |
|---|---|---|
| `create` | `ao-dev` | Kiểm tiêu đề và mô tả PR như `merge-gate` (mục 2.5) trước khi gửi |
| `edit` | `ao-dev` | Chỉ sửa tiêu đề và mô tả |
| `comment` | `ao-dev` | |
| `review` | `ao-review` | Chỉ nhận `--event COMMENT` (kết luận Approve của báo cáo) hoặc `--event REQUEST_CHANGES`. Agent không approve; approve là việc của bạn |

### 2.3 Hook git ở local

Kit chép thư mục `.githooks/` vào dự án. `node .ai-orchestrator/scripts/install-hooks.mjs` đặt `git config core.hooksPath .githooks`; script `prepare` trong `package.json` của dự án gọi lệnh này, nên `npm install` tự cài hook. Mỗi hook là một file sh ngắn gọi script Node của kit; Git for Windows chạy được file sh.

| Hook | Kiểm | Chặn khi |
|---|---|---|
| `pre-commit` | secretlint trên các file đã stage; rồi `npm run precommit --if-present` của dự án | Có secret; script của dự án lỗi |
| `commit-msg` | `checkCommit` của `conventions.mjs` | Header sai `type(scope): subject (<KEY>)`. Commit merge và commit revert do git tạo thì cho qua. Commit gốc của repo (chưa có `HEAD`) không cần mã Jira (`project-scaffold`, T16) |
| `pre-push` | Ref đích của lần push | Cập nhật `develop`, `main` hoặc một nhánh `release/*` đã có. Tạo nhánh `release/*` mới thì cho qua |

Script `precommit` là chỗ `project-scaffold` đặt lint cho file đã stage, theo stack. Ở local chỉ dùng secretlint (gói npm) cho nhẹ; Semgrep cần Python, gitleaks là binary riêng, nên hai công cụ này và `npm audit` chỉ chạy ở CI. CI là nơi quyết định.

### 2.4 CI trên PR

Workflow `kit/.github/workflows/ci.yml` tên `CI`, là tên `jira-sync` đang chờ. Workflow chạy khi có `pull_request` và khi push lên `develop`, `main`, `release/**`. Có bốn job, mỗi job là một check:

| Job | Bước | Đỏ khi |
|---|---|---|
| `policy` | Quy ước của nhánh nguồn so với nhánh đích, của mọi commit trong PR (bỏ qua commit merge) và của tiêu đề PR; mẫu tắt kiểm tra trong diff; ngưỡng bị hạ; `npm audit --audit-level=high` | Sai quy ước; dòng thêm vào có mẫu tắt kiểm tra mà không ghi `reason:` trên cùng dòng, hoặc có `.only(`; PR hạ một ngưỡng trong `quality/gates.yaml`; có lỗ hổng high hoặc critical không nằm trong danh sách ngoại lệ còn hạn |
| `build-test` | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, coverage của dòng thay đổi, `npm run build` | Một script lỗi; dòng PR thêm hoặc sửa có coverage dưới 80% |
| `secrets` | gitleaks (binary bản cố định, kiểm checksum) quét các commit của PR; khi push thì quét các commit mới | Có secret |
| `sast` | Semgrep CE bản cố định, chạy qua `uvx`, với `--config p/default --config p/owasp-top-ten`; chỉ báo finding mới so với nhánh đích (`--baseline-commit`) | Có finding mức ERROR |

- **Bốn job thay vì mười check**, vì mỗi job tính tròn lên một phút Actions. Từng bước vẫn hiện riêng trong log và trong job summary. Khi push (không có PR), `policy` chỉ chạy `npm audit`.
- **Coverage của dòng thay đổi:** script đọc lcov (đường dẫn trong `quality/gates.yaml`) và `git diff` tính từ merge base, rồi chỉ tính các dòng có trong lcov, tức dòng thực thi được. File nguồn thay đổi mà không có trong lcov thì đỏ, kèm lời nhắc cấu hình coverage phải gồm mọi file nguồn, kể cả file chưa có test. PR không đổi dòng thực thi nào thì bước này đạt. File cấu hình (`*.config.*`) và migration không được tính (Checkpoint 1).
- **Mẫu tắt kiểm tra** cấu hình trong `quality/gates.yaml`: `eslint-disable`, `oxlint-disable` (thêm ở Pilot 1), `@ts-ignore`, `@ts-nocheck`, `.skip(`, `xit(`, `xdescribe(`, `istanbul ignore`, `c8 ignore`, `nosemgrep`, `gitleaks:allow`, `secretlint-disable`. Dòng có `reason: <lý do>` thì cho qua, để reviewer đọc lý do. `.only(` luôn đỏ. PR xóa file test không làm đỏ, nhưng được liệt kê trong job summary cho reviewer.
- **Ngoại lệ của `npm audit`:** mỗi ngoại lệ ghi mã advisory, lý do và ngày hết hạn; hết hạn thì tự đỏ lại. Thêm ngoại lệ là sửa một file được bảo vệ (mục 2.5), nên PR đó do bạn merge.
- Guard `ci-green` của `tracker-integration` tính mọi check run trên commit đầu của PR, trừ `jira-sync`, nên bốn job này được tính mà không phải sửa `facts.mjs`.

### 2.5 `merge-gate`

Workflow `kit/.github/workflows/merge-gate.yml` chạy khi workflow `jira-sync` chạy xong (`workflow_run`), và khi bạn gọi tay (`workflow_dispatch`). `jira-sync` đã chạy sau mỗi lần CI xong và sau mỗi review, nên `merge-gate` theo kịp cả hai mà không cần trigger `pull_request_review`. Lý do không dùng trigger đó: workflow của `pull_request_review` chạy trên nhánh merge của PR, nên PR có thể sửa nó. GitHub chạy workflow có trigger `workflow_run` bằng bản trên nhánh mặc định; còn `workflow_dispatch` thì gọi được trên nhánh bất kỳ, nên job bỏ qua mọi lần chạy không ở nhánh mặc định.

Giống `jira-sync`, `merge-gate` đối soát chứ không làm theo từng sự kiện. Với mỗi PR đang mở từ nhánh `feature/`, `bugfix/`, `hotfix/`, nó kiểm mọi điều kiện, merge khi đủ, và in điều kiện còn thiếu khi chưa đủ, ví dụ `Waiting #12: approval on head a1b2c3d`. Chạy lại bao nhiêu lần cũng ra cùng kết quả.

| Điều kiện | Kiểm |
|---|---|
| Tác giả | PR do `ao-dev` mở. PR do bạn mở thì bạn tự merge, và `merge-gate` bỏ qua |
| Nhánh | `checkBranch(head, { base })` đạt; PR không ở draft và không có conflict |
| Mô tả | Tiêu đề đạt `checkPrTitle`. Mô tả có đủ các mục của `pull-request.md` (Jira, What Changed, How It Was Tested, Acceptance Criteria Coverage, Risks, Definition of Done); mục nào cũng có nội dung, không còn chỗ trống `<...>` và không còn mục Example |
| CI | Mọi check của commit đầu PR đều xanh, cùng cách tính với `ci-green` |
| Báo cáo review | Trên commit đầu PR, `ao-review` có báo cáo của cả `reviewer` lẫn `security` (phân biệt bằng dòng `Role:`, mục 2.9). Báo cáo mới nhất của mỗi vai trò không còn finding Critical hoặc High |
| Không có yêu cầu sửa | Guard `changes-requested` không thỏa |
| Approve | Quyết định mới nhất của một login trong `AO_APPROVERS` **trên commit đầu PR** là approve. Có push mới sau khi bạn approve thì phải approve lại |
| File được bảo vệ | PR không sửa file nào khớp `protected_paths`: `.github/workflows/**`, `.githooks/**`, `.claude/**`, `.ai-orchestrator/**`, `.mcp.json` (thêm ở `agent-roster` T15) (gồm cả `quality/gates.yaml` của dự án). PR có sửa thì `merge-gate` không merge, và báo bạn đọc diff rồi tự merge |

Khi đủ điều kiện, `merge-gate` squash merge bằng token của `ao-dev`, truyền kèm SHA của commit đầu để GitHub từ chối nếu PR vừa có push mới. Commit squash có tiêu đề đúng bằng tiêu đề PR (không thêm `(#n)`, để vẫn đạt quy ước commit), và body liệt kê header các commit của PR, để giữ mã Sub-task. Merge bằng token App thì push vào nhánh đích vẫn kích hoạt CI, `audit` và deploy, khác với merge bằng `GITHUB_TOKEN`.

### 2.6 `audit` và deploy

`kit/.github/workflows/audit.yml` là reusable workflow (`workflow_call`). Pipeline deploy gọi nó trước, và job deploy có `needs: audit`. Trong module này, workflow deploy giả của `ao-pilot` gọi `audit`; `release-workflow` làm tương tự cho pipeline thật.

`audit` kiểm commit sắp deploy:

1. Commit là commit merge hoặc commit squash của một PR đã merge vào đúng nhánh đang deploy. Ngoại lệ: nhánh `release/*` mới tạo từ một commit đã có trên `develop`.
2. PR của Story, Task, Bug qua đủ điều kiện của `merge-gate` tại commit đầu lúc merge, với hai khác biệt. PR do một login trong `AO_APPROVERS` mở thì tác giả được tính là đã approve. PR sửa file được bảo vệ thì người merge phải là một login trong `AO_APPROVERS`.
3. PR từ `release/*` (vào `main` hoặc merge ngược vào `develop`) chỉ cần CI xanh và approve của bạn trên commit đầu, vì từng item trong bản đã qua review.

Khi `audit` đỏ: job deploy không chạy, job summary ghi lý do, và item Jira (mã trong tiêu đề PR hoặc commit) được gắn cờ "Needs you" bằng token CI, theo effect `flag-needs-you` của hợp đồng.

Workflow chạy theo `push` dùng bản nằm trong commit được push. Một PR sửa `audit.yml` hay workflow deploy vì vậy đổi luôn thứ sẽ chạy sau khi merge. Các PR này đều sửa file được bảo vệ, nên chỉ bạn merge, sau khi đọc diff.

### 2.7 Hook của Claude Code chặn đường vòng

Hook mới `kit/.claude/hooks/gh-guard.mjs` khai báo trong `kit/.claude/settings.json`, chạy trước `Bash`, `Read`, `Edit`, `Write` và `NotebookEdit`. Hook chỉ áp dụng khi `agent_type` là một vai trò agent của hợp đồng. Phiên chính không bị chặn, vì phiên chính là bạn trực tiếp ra lệnh.

| Đường vòng | Bị chặn |
|---|---|
| Bỏ qua hook git | `git commit --no-verify` hoặc `-n`; `git push --no-verify`; `git -c core.hooksPath=…`; `git config core.hooksPath` |
| Push lên nhánh được bảo vệ | `git push` có ref đích là `develop`, `main` hoặc `release/*` (hook `pre-push` cũng chặn) |
| Làm việc với PR bằng tài khoản của bạn | `gh pr create`, `edit`, `merge`, `review`, `close`, `ready`, `reopen`, `comment`, `revert`, `update-branch`, kể cả khi `-R` đứng trước lệnh con; `gh api` với method khác GET, hoặc có `-f`, `-F`, `--input` |
| Lấy token hoặc key | `gh auth token`, `login`, `switch`, `refresh`; `gh auth status` kèm `-t` hoặc `--show-token`; đọc `hosts.yml` của `gh`; đọc file PEM của App |
| Đổi cấu hình repo (thêm ở T8) | `gh secret` và `gh variable` với `set`, `delete`; `gh repo edit`, `delete`, `rename`, `archive`, `unarchive`; `gh repo autolink create`, `delete` |
| Xóa dấu vết của các cổng | `gh run delete` |
| Sửa file được bảo vệ | `Edit`, `Write`, `NotebookEdit` vào `protected_paths`. Riêng `devops` được sửa `.github/workflows/**`; PR đó vẫn phải do bạn merge |
| Dùng sai App | Vai trò dev chạy `ao-pr.mjs review`; vai trò review chạy `ao-pr.mjs create`, `edit` hoặc `comment` |
| Đưa mật khẩu basic auth lên dòng lệnh (thêm ở A1, 2026-11-11, sau khi `qa` chạy `curl -u` ở Pilot 2) | Tham số của một lệnh nhắc tới `$E2E_HTTP_PASSWORD` hay `$AO_ENV_AUTH` (cả `${…}`, `$env:…`, `%…%`), trừ `printf` có sẵn của shell |

`gh pr revert`, `gh pr update-branch`, `gh repo autolink` và `gh run delete` chỉ có ở các bản `gh` sau 2.16. Checkpoint 4 thêm chúng vào bảng, cùng với `gh auth status -t`, việc đọc `hosts.yml`, và trường hợp `-R` đứng trước lệnh con.

Không nạp được kit thì hook chặn mọi lệnh `git` và `gh` của agent, còn các lệnh khác vẫn chạy. Hook đọc lệnh theo mẫu nên không kín hoàn toàn: agent chạy trên máy bạn, cùng tài khoản `gh` và cùng file key. `merge-gate` và `audit` là hai lớp không phụ thuộc vào máy bạn.

### 2.8 Ruleset khi repo hỗ trợ

`npm run gh:protect -- --repo <owner>/<name>` chạy từ repo kit, bằng `gh` của bạn, vì cần quyền admin. Lệnh áp ruleset `ao-protected` cho `develop`, `main` và `release/*`: chặn xóa nhánh và force push, bắt buộc qua PR, bắt buộc bốn check của `CI`, cần một approve, và bỏ approve cũ khi có push mới. `ao-dev` không được miễn rule, vì `merge-gate` chỉ merge khi đã đủ điều kiện. Chạy lại lệnh thì cập nhật ruleset đang có, không tạo bản trùng.

Repo không hỗ trợ ruleset (API trả 403, như `ao-pilot`) thì lệnh in `soft mode: merge-gate and audit enforce the gates`, không đổi gì, và thoát với mã 0.

### 2.9 Thay đổi hợp đồng và capability map (đã duyệt 2026-10-29)

1. **Stage `merge`:** điều kiện qua đổi từ "Branch protection pass" thành "`merge-gate` pass". Sửa `contract/stages.yaml`, bảng 2.2 của `SPEC-sdlc-contract.md`, và sinh lại `docs/sdlc.md`.
2. **Template `review-report.md`:** thêm dòng `Role: reviewer` hoặc `Role: security` ngay dưới tiêu đề, vì hai vai trò đăng báo cáo bằng cùng một App. Ví dụ trong template sửa theo.
3. **Capability map:** `quality-gates` phụ thuộc thêm `tracker-integration`, vì dùng `conventions.mjs`, `facts.mjs` và cần `jira-sync` để kích hoạt `merge-gate`. Hai module đó đều đã xong, nên thứ tự build không đổi.

## 3. Tech stack

- Node.js 24, ES module, như hai module trước. GitHub REST API qua `lib/tracker/github-client.mjs`, thêm khả năng ghi khi truyền `write: true`, giống `jira-client.mjs`. JWT ký bằng `node:crypto`.
- Dependency mới của kit: `secretlint` và `@secretlint/secretlint-rule-preset-recommend`, bản cố định, cho hook `pre-commit`.
- Trong CI: gitleaks (binary bản cố định, kiểm checksum) và Semgrep CE bản cố định qua `uvx` (action `astral-sh/setup-uv`). Mọi action ghim theo SHA, như workflow hiện có.
- Test dùng `node:test` với dữ liệu GitHub ghi sẵn thành file JSON; test không gọi mạng.

## 4. Lệnh

Trong repo kit:

```
npm run validate                                  # thêm các quy tắc của mục 7 cho quality/gates.yaml
npm test
npm run gh:protect -- --repo TungPH7/ao-pilot     # áp ruleset khi repo hỗ trợ; repo private gói Free: chỉ báo soft mode
```

Trong repo dự án, với bản chép ở `.ai-orchestrator/`:

```
node .ai-orchestrator/scripts/install-hooks.mjs                         # đặt core.hooksPath; script prepare gọi lệnh này
node .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title "<title>" --body-file <file>
node .ai-orchestrator/scripts/ao-pr.mjs review <number> --event REQUEST_CHANGES --body-file <file>
node .ai-orchestrator/scripts/coverage-diff.mjs --base origin/develop   # chạy được ở local, trước khi push
node .ai-orchestrator/scripts/merge-gate.mjs --dry-run                  # in PR nào sẽ được merge, PR nào còn thiếu gì
node .ai-orchestrator/scripts/audit.mjs --sha <commit> --branch develop
```

## 5. Cấu trúc thư mục

```
ai-orchestrator-v1/
├── quality/
│   ├── gates.yaml                  # check bắt buộc, ngưỡng, mẫu tắt kiểm tra, nhánh và file được bảo vệ, App
│   └── schema/gates.schema.json
├── lib/quality/
│   ├── gates.mjs                   # đọc và kiểm quality/gates.yaml
│   ├── github-app.mjs              # JWT, installation token
│   ├── coverage.mjs                # đọc lcov, giao với diff
│   ├── suppressions.mjs            # mẫu tắt kiểm tra, ngưỡng bị hạ
│   ├── pull-request.mjs            # mô tả PR, báo cáo review, file được bảo vệ
│   ├── merge-gate.mjs              # decideMerge (hàm thuần) và merge
│   ├── audit.mjs                   # decideAudit (hàm thuần)
│   └── commands.mjs                # đọc lệnh Bash cho gh-guard
├── scripts/
│   ├── gh-protect.mjs
│   ├── ao-pr.mjs
│   ├── check-policy.mjs            # job policy
│   ├── coverage-diff.mjs
│   ├── merge-gate.mjs
│   ├── audit.mjs
│   └── install-hooks.mjs
├── kit/
│   ├── .githooks/                  # pre-commit, commit-msg, pre-push
│   ├── .claude/settings.json       # thêm gh-guard và các biến AO_*_APP
│   ├── .claude/hooks/gh-guard.mjs
│   └── .github/workflows/          # ci.yml, merge-gate.yml, audit.yml
├── docs/
│   ├── quality-gates.md            # các lớp chốt, từng check, cách xử lý khi đỏ
│   └── github-apps-setup.md        # tạo hai App, từng bước bấm
└── tests/quality/                  # dữ liệu mẫu ở tests/fixtures/quality/
```

Bản chép ở `.ai-orchestrator/` của dự án có thêm `quality/` và các script trên. Như ở `tracker-integration`, bản chép vẫn làm tay cho tới `project-scaffold`.

## 6. Code style

Giữ quy ước của hai module trước: tên trường `snake_case`, id `kebab-case`. Ví dụ:

```yaml
# quality/gates.yaml (trích)
checks: [policy, build-test, secrets, sast]   # tên job trong kit/.github/workflows/ci.yml
coverage:
  changed_lines_min: 80
  lcov: ["coverage/lcov.info", "apps/*/coverage/lcov.info"]
  source: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"]
  exclude: ["**/*.{test,spec}.*", "**/*.e2e-spec.*", "**/*.d.ts", "**/*.config.*", "**/migrations/**", "e2e/**", ".ai-orchestrator/**", ".claude/**"]
dependencies:
  audit_level: high
  exceptions: []   # { advisory: GHSA-xxxx-xxxx-xxxx, reason: "...", expires: 2026-12-31 }
suppressions:
  reason_marker: "reason:"
  patterns: ["eslint-disable", "oxlint-disable", "@ts-ignore", "@ts-nocheck", ".skip(", "xit(", "xdescribe(", "istanbul ignore",
             "c8 ignore", "nosemgrep", "gitleaks:allow", "secretlint-disable"]
  never: [".only("]
protected_branches: [develop, main, "release/*"]
protected_paths:          # editors: vai trò agent được sửa, dù PR đó vẫn do bạn merge
  - { path: ".github/workflows/**", editors: [devops] }
  - { path: ".githooks/**" }
  - { path: ".claude/**" }
  - { path: ".ai-orchestrator/**" }
  - { path: ".mcp.json" }
merge_method: { feature: squash, bugfix: squash, hotfix: squash }
github_apps:
  dev: { env: AO_DEV_APP, roles: [ba, sa, fe-dev, be-dev, devops], commands: [create, edit, comment] }
  review: { env: AO_REVIEW_APP, roles: [reviewer, security], commands: [review] }
```

`decideMerge`, `decideAudit` và phần đọc lệnh của `gh-guard` là hàm thuần nhận dữ kiện đã gom sẵn. Chỉ `github-client.mjs` và `github-app.mjs` gọi mạng.

## 7. Chiến lược test

**Quy tắc mới của `npm run validate`**, mỗi quy tắc có test dương và fixture âm, như hai module trước:

1. `quality/gates.yaml` đúng schema.
2. `checks` trùng khớp tập job trong `kit/.github/workflows/ci.yml`.
3. Mỗi vai trò trong `github_apps` là vai trò agent của hợp đồng và thuộc nhiều nhất một App.
4. `merge_method` chỉ dùng các loại nhánh của quy ước: `feature`, `bugfix`, `hotfix`.

**Test đơn vị**, dùng dữ liệu ghi sẵn:

- Coverage: lcov và diff mẫu cho ra đúng tỷ lệ; dòng không thực thi không được tính; file nguồn thay đổi mà thiếu trong lcov thì đỏ; file test và file ngoài `source` không được tính.
- Mẫu tắt kiểm tra: mỗi mẫu có và không có `reason:`; `.only(` luôn đỏ; hạ `changed_lines_min` thì đỏ; xóa file test thì chỉ được liệt kê.
- Quy ước của PR: commit merge được bỏ qua; nhánh `feature/` vào `main` thì đỏ.
- `decideMerge`, theo bảng tình huống: đủ điều kiện thì squash với tiêu đề PR; approve nằm trên commit cũ thì chờ; thiếu báo cáo `security` thì chờ; báo cáo còn High thì chờ; PR sửa `.github/workflows/` thì không merge và báo bạn; PR do bạn mở và PR ở draft thì bỏ qua; chạy lại lần hai thì không làm gì.
- `decideAudit`: commit squash của PR đủ điều kiện thì xanh; push thẳng thì đỏ; PR merge tay khi chưa có approve thì đỏ; PR sửa file được bảo vệ do bạn merge thì xanh, do bot merge thì đỏ; nhánh `release/*` mới tạo từ commit đã có trên `develop` thì xanh.
- `github-app`: JWT ký đúng (kiểm bằng public key của cặp khóa sinh ra trong test); token được xin cho đúng một repo.
- `gh-guard`: mỗi dòng ở bảng mục 2.7 có một lệnh bị chặn và một lệnh gần giống được cho qua, ví dụ `git commit -m "-n"`, `gh pr view`, `gh api` với GET.
- Hook git: `pre-push` với các dòng ref mẫu; `commit-msg` với header đúng, sai, merge và revert.
- `gh:protect`: payload của ruleset; API trả 403 thì báo soft mode và thoát với mã 0.

**Kiểm thật** trên repo `ao-pilot` và space `DEMO`, kết quả ghi vào `tasks/verification.md`: các tiêu chí 3 đến 12 ở mục 9. `ao-pilot` nhận một package TypeScript nhỏ có đủ bốn npm script, với ít dependency nhất có thể.

## 8. Ranh giới

- **Luôn làm:** giữ private key ngoài repo, chỉ ở máy bạn và trong secret của CI; không in token; ghim action theo SHA và công cụ theo phiên bản; mọi thay đổi ngưỡng đi qua PR; ghi lại số phút Actions đo được.
- **Hỏi bạn trước:** tạo, xóa hoặc đổi quyền của GitHub App và private key; tạo repo GitHub mới; áp ruleset lên repo thật; thêm ngoại lệ `npm audit`; đổi hợp đồng.
- **Không bao giờ:** approve PR thay bạn; cấp quyền quản trị repo cho App; để `merge-gate` merge PR sửa file được bảo vệ; tắt hoặc hạ một check để PR xanh; đưa private key hay token vào repo, log hoặc chat.

## 9. Tiêu chí hoàn thành

1. `quality/gates.yaml` và bốn quy tắc mới có trong repo; `npm run validate`, `npm test` và CI của kit đều xanh.
2. Ba thay đổi ở mục 2.9 đã làm, và `docs/sdlc.md` được sinh lại.
3. Hook git trên `ao-pilot`: `commit-msg` chặn header sai, `pre-commit` chặn file có secret, `pre-push` chặn push lên `develop`. Mỗi trường hợp thử thật một lần.
4. `CI` trên một PR thật của `ao-pilot`: mỗi job đỏ ít nhất một lần đúng lý do (`policy`: mẫu tắt kiểm tra không có lý do; `build-test`: coverage dưới 80%; `secrets`: một secret giả; `sast`: một finding Semgrep), rồi xanh lại khi sửa.
5. Bạn tạo hai App theo `docs/github-apps-setup.md`. Agent `fe-dev` mở PR bằng `ao-pr.mjs`, và PR hiện tác giả là bot của `ao-dev`. Agent `reviewer` đăng báo cáo yêu cầu sửa bằng bot của `ao-review`, và `jira-sync` đưa item về In Progress.
6. Hook `gh-guard` chặn agent chạy `gh pr merge`, `git commit --no-verify`, và sửa `.github/workflows/ci.yml`; cho agent chạy `ao-pr.mjs create`. Mỗi trường hợp thử thật một lần.
7. Chặng `deploy-to-qa` của tiêu chí 7 trong `tracker-integration`: PR của `ao-dev` có CI xanh, có báo cáo của `reviewer` và `security` không còn Critical/High; bạn approve; `merge-gate` squash vào `develop` bằng `ao-dev`; CI, `audit` và deploy lên `development` chạy; `jira-sync` chuyển item sang Ready for QA bằng `orchestratorci`.
8. `merge-gate` đứng chờ và in lý do khi approve nằm trên commit cũ; không merge PR của agent có sửa `.github/workflows/`, và báo bạn tự merge.
9. `audit`: một PR bạn merge tay khi chưa approve làm `audit` đỏ, deploy không chạy, và item mang cờ "Needs you".
10. Secret `AO_DEV_APP_KEY` của environment `merge-gate`: workflow chạy trên một nhánh khác nhánh mặc định không đọc được secret này. Nếu đọc được, key chuyển sang secret của repo và mục 12 ghi rõ rủi ro.
11. `npm run gh:protect -- --repo TungPH7/ao-pilot` báo soft mode và không đổi gì trên repo. Trên repo public tạm `TungPH7/ao-ruleset-probe`, lệnh áp ruleset, đọc lại thấy đúng, chạy lần hai không tạo bản trùng; sau đó repo bị xóa.
12. Số phút Actions của một vòng PR đầy đủ (mở, sửa một lần, review, approve, merge, deploy) được đo và ghi lại.
13. README có mục về quality gates; có `docs/quality-gates.md` và `docs/github-apps-setup.md`; `SPEC.md` ghi module hoàn thành.

Cả 13 tiêu chí đạt ngày 2026-10-29. Bằng chứng của tiêu chí 3 đến 12 ghi trong [tasks/archive/quality-gates/verification.md](tasks/archive/quality-gates/verification.md).

## 10. Câu hỏi đã trả lời (2026-10-29)

1. **Bảo vệ nhánh khi repo private ở gói Free:** ở lại gói Free, chốt ở `merge-gate` và `audit`; ruleset chỉ áp khi repo hỗ trợ (mục 2.1, 2.5, 2.6, 2.8).
2. **Danh tính để agent mở PR:** hai GitHub App, `ao-dev` và `ao-review` (mục 2.2).
3. Bạn không sửa giả định nào trong sáu giả định ở Phiên 10 · Lượt 1. Spec làm rõ thêm hai điểm: mẫu `.only(` luôn đỏ, và `npm audit` có danh sách ngoại lệ có hạn.
4. **Ba thay đổi ở mục 2.9:** bạn duyệt.
5. **Kiểm ruleset trên repo public tạm:** đồng ý. Claude tạo repo public rỗng `TungPH7/ao-ruleset-probe` lúc kiểm `gh:protect`, rồi xóa repo khi kiểm xong (tiêu chí 11).
6. **Tên hai App:** `tungph7-ao-dev` và `tungph7-ao-review`.
7. **Checkpoint 1 (2026-10-29):** `ba` và `sa` dùng App `ao-dev`, vì hai vai trò này viết SPEC, plan, ADR vào Git; PR chỉ có tài liệu cần review gì thì `dev-workflow` quyết. Coverage bỏ qua file cấu hình (`**/*.config.*`) và migration (`**/migrations/**`).

## 11. Câu hỏi mở

Không còn câu hỏi mở.

## 12. Rủi ro

- **PR sửa được workflow chạy trên chính nó.** Workflow chạy theo `pull_request` và `push` dùng bản nằm trong commit, nên một PR sửa `ci.yml` có thể tự làm CI của nó xanh. Chỉ `merge-gate` không bị PR sửa. Vì vậy PR đụng file được bảo vệ chỉ do bạn merge, sau khi đọc diff.
- **Secret của repo đọc được từ workflow ở mọi nhánh,** kể cả `JIRA_CI_TOKEN`. Một nhánh có workflow mới có thể đọc chúng. `gh-guard` chặn agent sửa `.github/workflows/**`, trừ `devops`.
- **Sửa `merge-gate.yml` chỉ có hiệu lực khi tới nhánh mặc định** (`main` của `ao-pilot`), tức sau một lần release. Việc cập nhật kit cho dự án phải tính tới điều này.
- **Agent dùng chung máy với bạn:** `gh` đăng nhập bằng `TungPH7`, file key của App nằm trên đĩa. `gh-guard` đọc lệnh theo mẫu nên không kín hoàn toàn; `merge-gate` và `audit` không phụ thuộc vào máy bạn. Token của `gh` nên nằm trong keyring của hệ điều hành, không trong `hosts.yml` (Checkpoint 4).
- **Phút Actions:** mỗi lần push vào PR chạy bốn job CI, rồi `jira-sync` và `merge-gate`. T19 đo được 37 phút cho một vòng PR chuẩn, tức khoảng 54 vòng mỗi tháng ở gói Free (chi tiết ở `docs/quality-gates.md`). Nếu vượt ngân sách thì gộp job hoặc bớt trigger.
- **Advisory mới có thể làm mọi PR đỏ,** vì `npm audit` đọc cả lockfile. Cách xử lý: cập nhật dependency, hoặc thêm ngoại lệ có hạn.
- **Chuỗi `workflow_run` tối đa ba tầng:** CI → `jira-sync` → `merge-gate` đã chạm giới hạn, nên không thêm tầng thứ tư.
- **Squash gộp các commit của PR thành một trên `develop`.** Body của commit squash giữ header các commit (kèm mã Sub-task), và nhánh không bị xóa sau khi merge, nên GitHub for Jira vẫn giữ liên kết tới từng commit.

## Nguồn

- [GitHub Docs: GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
- [GitHub Docs: Automatically merging a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [GitHub Docs: About GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security)
- [GitHub Docs: GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)
- [GitHub Docs: Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [GitHub Docs: Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- [GitHub Docs: Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub Terms of Service, mục B.3](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- Skill `constraint-driven-development` của agent-skills 0.6.13: ngưỡng mặc định và danh sách mẫu tắt kiểm tra

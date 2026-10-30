# Quality gates

> **Spec:** [SPEC-quality-gates.md](../SPEC-quality-gates.md). Tài liệu này dành cho bạn: mỗi cổng kiểm gì, đọc kết quả ở đâu, làm gì khi cổng đỏ, và khi nào bạn phải tự merge.

## Bốn lớp chốt

Repo private ở gói Free không có branch protection, nên GitHub không chặn được merge hay push. Kit vì vậy chốt cổng ở bốn lớp:

| Lớp | Chạy ở đâu | Bỏ qua được không |
|---|---|---|
| Hook git: `pre-commit`, `commit-msg`, `pre-push` | Máy chạy `git` | Được, bằng `--no-verify`. `gh-guard` chặn agent dùng cờ này, và `CI` kiểm lại quy ước |
| Hook `gh-guard` của Claude Code | Máy chạy agent | Hook đọc lệnh theo mẫu, nên không kín hoàn toàn |
| Workflow `CI` và `merge-gate` | GitHub Actions | `merge-gate` chạy bằng bản trên nhánh mặc định, nên PR không sửa được nó |
| `audit`, trước mỗi lần deploy | GitHub Actions | Nút Merge vẫn bấm được, nhưng commit không qua đủ cổng thì không được deploy |

Repo hỗ trợ ruleset (repo public, hoặc gói Pro trở lên) thì có thêm một lớp: xem mục [Ruleset](#ruleset).

## Vòng của một PR

1. Dev agent đẩy nhánh `feature/<KEY>-<slug>`, `bugfix/…` hoặc `hotfix/…`, rồi mở PR bằng `ao-pr.mjs create`. PR đứng tên bot của App `ao-dev`.
2. `CI` chạy bốn check. Mỗi lần `CI` chạy xong, `jira-sync` đối soát item Jira, rồi `merge-gate` xem PR đã đủ điều kiện chưa.
3. `reviewer` và `security` đọc PR, rồi đăng báo cáo bằng `ao-pr.mjs review`, dưới tên bot của App `ao-review`. Báo cáo còn finding Critical hoặc High là một yêu cầu sửa, và `jira-sync` đưa item về In Progress.
4. Agent sửa rồi push. Mỗi lần push tạo một commit đầu mới, nên `CI`, hai báo cáo và approve của bạn phải có lại trên commit đó.
5. Bạn đọc PR và approve. Agent không approve; GitHub cũng không cho tác giả PR approve PR của chính mình.
6. `merge-gate` squash merge khoảng nửa phút đến một phút sau khi PR đủ điều kiện. Commit squash có tiêu đề đúng bằng tiêu đề PR.
7. Push vào `develop` chạy `CI` và workflow deploy. Workflow deploy gọi `audit` trước. `audit` xanh thì deploy chạy, và `jira-sync` chuyển item sang Ready for QA.

## Hook git

Trong repo dự án, `npm install` gọi script `prepare`, và script này cài hook (`git config core.hooksPath .githooks`). Muốn cài lại thì chạy `node .ai-orchestrator/scripts/install-hooks.mjs`.

| Hook | Chặn khi | Cách sửa |
|---|---|---|
| `pre-commit` | secretlint thấy secret trong file đã stage, hoặc `npm run precommit` của dự án lỗi | Bỏ secret khỏi file, đưa nó vào biến môi trường hoặc secret của GitHub. Nếu đó là secret thật thì thu hồi nó và tạo cái mới. Lỗi của `precommit`, thường là lint, thì sửa theo thông báo |
| `commit-msg` | Header không theo `type(scope): subject (<KEY>)`, ví dụ `feat(cart): add a quantity limit (DEMO-6)`. `type` là một trong `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` | Viết lại header, hoặc `git commit --amend` nếu commit đã tạo. Commit merge và commit revert do git tạo thì được cho qua |
| `pre-push` | Lần push cập nhật `develop`, `main`, hoặc một nhánh `release/*` đã có | Đẩy lên nhánh làm việc, rồi mở PR. Tạo nhánh `release/*` mới thì được cho qua |

## Bốn check của `CI`

Workflow `CI` chạy trên mọi PR và mỗi lần push lên `develop`, `main`, `release/**`. Mỗi job là một check. Kết quả nằm ở tab **Checks** của PR. Bấm vào một job để xem log của nó, hoặc mở trang **Summary** của lần chạy để xem job summary **(đối chiếu giao diện)**.

### `policy`

Job summary có mục **Policy**. Mỗi dòng là một phần kiểm: ✅ là đạt, ❌ là đỏ, kèm lý do.

| Phần | Đỏ khi | Cách sửa |
|---|---|---|
| Conventions | Tên nhánh, header của một commit trong PR, hoặc tiêu đề PR sai quy ước. Nhánh `feature/` chỉ vào `develop`; `bugfix/` vào `develop` hoặc `release/*`; `hotfix/` vào `main` | Sai tên nhánh thì mở PR mới từ nhánh đúng tên. Sai header thì viết lại commit rồi force push lên nhánh của PR. Sai tiêu đề thì sửa bằng `ao-pr.mjs edit` |
| Suppressions | Dòng thêm vào có mẫu tắt kiểm tra (`eslint-disable`, `@ts-ignore`, `.skip(`, `nosemgrep`, `gitleaks:allow`…) mà không ghi `reason: <lý do>` trên cùng dòng; hoặc có `.only(` | Sửa lỗi thay vì tắt kiểm tra. Nếu thật sự phải tắt, ghi `reason:` trên cùng dòng để reviewer đọc. `.only(` luôn đỏ, nên phải xóa |
| Thresholds | PR hạ một ngưỡng trong `quality/gates.yaml`, ví dụ `changed_lines_min` | Trả ngưỡng về như cũ. Hạ ngưỡng là quyết định của bạn, và file này được bảo vệ, nên PR đó do bạn merge |
| Dependencies | `npm audit` thấy lỗ hổng high hoặc critical không nằm trong danh sách ngoại lệ còn hạn | Cập nhật dependency. Nếu chưa có bản vá, thêm một ngoại lệ có hạn vào `dependencies.exceptions`, gồm mã advisory, lý do và ngày hết hạn. Đây cũng là file được bảo vệ, nên bạn quyết định và tự merge |

Dòng ℹ️ chỉ để báo, không làm job đỏ. Ví dụ `test file deleted: <file>` nhắc reviewer xem vì sao file test bị xóa. Khi push mà không có PR, `policy` chỉ chạy `npm audit`.

### `build-test`

Job chạy `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, bước **Coverage of changed lines**, rồi `npm run build`. Bước nào lỗi thì job đỏ ở bước đó, và log của bước cho biết lý do.

Job summary có mục **Coverage of changed lines: N%**, với bảng gồm các cột File, Covered và Lines not run. Bước này đỏ khi:

- các dòng mà PR thêm hoặc sửa có coverage dưới 80% (`coverage.changed_lines_min`). Viết test chạy qua các dòng ở cột Lines not run.
- một file nguồn thay đổi mà không có trong lcov. Cấu hình coverage của dự án phải gồm mọi file nguồn, kể cả file chưa có test.

Bước này chỉ tính dòng thực thi được. File test, file cấu hình (`*.config.*`), migration và bản chép kit (`.ai-orchestrator/`, `.claude/`, có test ở kit) không được tính. Muốn kiểm trước khi push, chạy `npm run test:coverage`, rồi `node .ai-orchestrator/scripts/coverage-diff.mjs --base origin/develop`.

### `secrets`

gitleaks quét các commit của PR; khi push thì quét các commit mới. Log của bước **Scan the new commits** chỉ ra file, dòng và commit có secret.

Secret đã nằm trong lịch sử git, nên xóa nó ở một commit sau là chưa đủ:

1. Thu hồi secret đó và tạo cái mới.
2. Viết lại các commit của nhánh để bỏ secret, rồi force push lên nhánh của PR.

Chỉ thêm `gitleaks:allow` khi chắc chắn đó không phải secret, và ghi `reason:` trên cùng dòng.

### `sast`

Semgrep CE chạy với bộ rule `p/default` và `p/owasp-top-ten`, và chỉ báo finding mới so với nhánh đích. Job đỏ khi có finding mức ERROR. Log của bước **Semgrep on the changes** ghi rule, file và dòng.

Sửa code theo gợi ý của rule. Nếu là báo nhầm, thêm `nosemgrep` kèm `reason:` trên cùng dòng; reviewer sẽ đọc lý do.

## Báo cáo review

`reviewer` và `security` viết báo cáo theo `templates/review-report.md`, có dòng `Role: reviewer` hoặc `Role: security` ngay dưới tiêu đề, rồi đăng bằng `ao-pr.mjs review`:

- còn finding Critical hoặc High thì đăng `REQUEST_CHANGES`;
- không còn thì đăng `COMMENT`.

Báo cáo nằm ở tab **Conversation** của PR. `merge-gate` chỉ đọc báo cáo trên commit đầu của PR, và lấy báo cáo mới nhất của mỗi vai trò.

## `merge-gate`

`merge-gate` chạy sau mỗi lần `jira-sync` xong. `jira-sync` thì chạy sau mỗi lần `CI` xong và sau mỗi review, nên `merge-gate` thấy cả hai. Bạn cũng gọi tay được: tab **Actions** → **merge-gate** → **Run workflow**, chọn nhánh mặc định **(đối chiếu giao diện)**.

Mỗi lần chạy, `merge-gate` xét mọi PR đang mở, và in vào log một dòng cho mỗi PR:

| Dòng | Nghĩa |
|---|---|
| `Merged #12: …` | Đã squash merge bằng App `ao-dev` |
| `Waiting #12: …` | Còn thiếu các điều kiện được liệt kê |
| `Needs you #12: it changes …, so read the diff and merge it yourself` | PR sửa file được bảo vệ. Bạn đọc diff rồi tự merge (mục sau). Phần `(still missing: …)` ở cuối, nếu có, là các điều kiện còn thiếu |
| `Skipped #12: …` | `merge-gate` không merge loại PR này: PR do bạn mở, PR ở draft, hoặc nhánh không phải của một item |
| `No open PR` | Không có PR nào đang mở |

Các điều kiện hay thiếu, và cách xử lý:

| Trong dòng `Waiting` | Làm gì |
|---|---|
| `CI green on head <sha>` | Chờ `CI` chạy xong, hoặc sửa check đỏ |
| `reviewer report on head <sha>`, `security report on head <sha>` | Cho `reviewer` hoặc `security` review commit đầu mới |
| `… report on head <sha> without Critical or High findings (N open)` | Agent sửa các finding và push, rồi hai vai trò review lại |
| `answer to the changes requested on head <sha>` | Quyết định mới nhất trên commit đầu là yêu cầu sửa. Agent push bản sửa, hoặc người đã yêu cầu sửa approve lại trên chính commit đó |
| `approval on head <sha>` | Bạn approve. Approve trên commit cũ không được tính |
| `valid branch (…)`, `valid title (…)`, `complete description (…)` | Sửa tiêu đề hoặc mô tả bằng `ao-pr.mjs edit`. Sai tên nhánh thì mở PR mới |
| `conflicts with develop resolved` | Rebase nhánh lên `develop`, rồi force push |

Muốn xem trước ở máy, chạy `node .ai-orchestrator/scripts/merge-gate.mjs --dry-run`. Lệnh in đúng các dòng trên và không merge gì.

`merge-gate.yml` chỉ có hiệu lực khi nằm trên nhánh mặc định (`main`). Một bản sửa của nó vì vậy chỉ chạy sau lần release kế tiếp.

## Khi nào bạn tự merge

Bạn tự merge trong ba trường hợp. `audit` vẫn kiểm cả ba, nên hãy làm đủ các bước trước khi bấm Merge.

1. **PR của agent sửa file được bảo vệ:** `.github/workflows/**`, `.githooks/**`, `.claude/**`, `.ai-orchestrator/**`. `merge-gate` in `Needs you`.
   - Workflow chạy theo `pull_request` dùng bản nằm trong PR, nên một PR sửa `ci.yml` có thể tự làm `CI` của nó xanh. Vì vậy hãy đọc kỹ diff ở tab **Files changed**.
   - PR vẫn phải đủ mọi điều kiện khác: `CI` xanh, hai báo cáo không còn Critical hay High, và approve của bạn trên commit đầu.
   - Sau đó bấm **Squash and merge** **(đối chiếu giao diện)**. `audit` chỉ chấp nhận PR này khi người merge là một login trong `AO_APPROVERS`.
2. **PR do bạn mở.** `merge-gate` bỏ qua PR của bạn. `audit` tính bạn là đã approve, nhưng PR vẫn cần `CI` xanh, hai báo cáo trên commit đầu, cùng tiêu đề và mô tả đúng mẫu.
3. **PR từ `release/*`** vào `main`, hoặc merge ngược vào `develop`. `audit` chỉ cần `CI` xanh và approve của bạn trên commit đầu, vì từng item trong bản release đã qua review. Phần này thuộc `release-workflow`.

Merge tay một PR chưa đủ cổng thì `audit` đỏ ở lần deploy kế tiếp.

## `audit` và deploy

Workflow deploy của dự án gọi `audit.yml` trước, và job deploy có `needs: audit`:

```yaml
permissions: { contents: read, pull-requests: read, checks: read, statuses: read }
jobs:
  audit:
    uses: ./.github/workflows/audit.yml
    secrets:
      JIRA_CI_TOKEN: ${{ secrets.JIRA_CI_TOKEN }}
  deploy:
    needs: audit
```

`audit` kiểm rằng commit sắp deploy là commit merge của một PR đã qua đủ cổng. Job summary có mục **Audit**:

- Xanh: `audit passed: <sha> on develop is the merge of PR #7, which met every gate`.
- Đỏ vì push thẳng: `<sha> on develop is not the merge of a PR into develop: it was pushed without one`.
- Đỏ vì PR thiếu cổng: `PR #6 was merged without: reviewer report on head <sha>; security report on head <sha>; approval on head <sha>`.
- Đỏ vì sai người merge: `PR #9 changes .github/workflows/ci.yml, which only you merge, but <login> merged it`.

Khi `audit` đỏ:

1. Job deploy không chạy, nên môi trường giữ bản cũ.
2. `orchestratorci` gắn cờ Impediment và nhãn `needs-you` cho item Jira có mã trong tiêu đề PR hoặc header commit, kèm một bình luận nêu lý do.

Cách dọn, như T20 đã làm:

1. Agent revert commit đó bằng `git revert` trên một nhánh mới, rồi mở PR. PR revert qua đủ cổng như mọi PR, và `merge-gate` merge nó.
2. Ở lần deploy kế tiếp, `audit` xanh.
3. Bạn gỡ cờ của item (menu **…** của item → **Remove flag**) và nhãn `needs-you` **(đối chiếu giao diện)**, rồi làm lại thay đổi qua đủ cổng.

Cập nhật bản chép kit trong dự án cũng phải đi qua PR, và PR đó do bạn merge, vì nó sửa `.ai-orchestrator/**`. Push thẳng lên `develop` làm `audit` chặn deploy và gắn cờ item có mã trong header commit. `DEMO-5` mang cờ vì lý do này, từ lần cài kit ở T18.

## Environment `merge-gate`

`merge-gate` merge bằng một private key thứ hai của App `ao-dev`, lưu ở secret `AO_DEV_APP_KEY` của environment `merge-gate`. Environment này chỉ cho nhánh mặc định, nên workflow chạy trên nhánh khác không đọc được key (đã kiểm ở T3 và T19). Cài một lần cho mỗi repo:

1. Tạo key thứ hai cho `ao-dev`, theo mục 2 của [github-apps-setup.md](github-apps-setup.md). Key đầu tiên, dùng cho `ao-pr.mjs` ở máy bạn, giữ nguyên.
2. Trên trang repo: **Settings** → **Environments** → **New environment**. Đặt tên `merge-gate`, rồi bấm **Configure environment** **(đối chiếu giao diện)**.
3. Ở **Deployment branches and tags**, chọn **Selected branches and tags**, bấm **Add deployment branch or tag rule**, gõ tên nhánh mặc định (thường là `main`), rồi bấm **Add rule** **(đối chiếu giao diện)**.
4. Đặt secret bằng cách pipe file key, để key không nằm trong lịch sử lệnh: `gh secret set AO_DEV_APP_KEY --env merge-gate -R <owner>/<repo> < path/to/key.pem`. Xong thì xóa file key thứ hai khỏi máy.

Job của `merge-gate` khai `environment: { name: merge-gate, deployment: false }`. Bỏ `deployment: false` thì mỗi lần chạy tạo một deployment, và sự kiện của nó kích hoạt `jira-sync`, rồi lại `merge-gate`, thành vòng lặp.

## Hook `gh-guard` của Claude Code

`gh-guard` chạy trước mỗi lần agent dùng `Bash`, `Read`, `Edit`, `Write` hoặc `NotebookEdit`, và chỉ áp cho các vai trò agent của hợp đồng. Phiên chính của bạn không bị chặn. Danh sách đầy đủ ở mục 2.7 của spec. Tóm tắt, hook chặn agent:

- bỏ qua hook git: `git commit --no-verify`, `git -c core.hooksPath=…`;
- push lên `develop`, `main`, `release/*`;
- làm việc với PR bằng tài khoản của bạn: `gh pr merge`, `review`, `create`, `revert`, `update-branch` và các lệnh ghi khác, hay `gh api` với method khác GET;
- lấy token hoặc key: `gh auth token`, `gh auth status -t`, đọc `hosts.yml` của `gh` hay file PEM của App;
- đổi cấu hình repo, như `gh secret set`, `gh repo edit`, `gh repo autolink create`; hoặc xóa lần chạy workflow bằng `gh run delete`;
- sửa file được bảo vệ bằng `Edit`, `Write`, `NotebookEdit`. Riêng `devops` được sửa `.github/workflows/**`, nhưng PR đó vẫn do bạn merge.

Khi bị chặn, agent nhận lý do bắt đầu bằng `gh-guard:`, kèm cách làm đúng, ví dụ dùng `ao-pr.mjs`.

Hai điều nên biết khi chạy agent:

- **`--allowedTools` không phải lớp chặn.** Nếu `defaultMode` trong `~/.claude/settings.json` là `auto`, `claude -p` vẫn cho chạy lệnh nằm ngoài `--allowedTools` (phát hiện ở T18). Hook thì chặn ở mọi chế độ quyền, vì hook trả `deny` là lệnh không chạy.
- **Dòng ghi công AI.** Theo mặc định, Claude Code dặn agent thêm dòng `Co-Authored-By` vào commit và dòng ghi công vào PR. `.claude/settings.json` của kit đặt `"attribution": { "commit": "", "pr": "" }` để tắt việc này.

`gh-guard` đọc lệnh theo mẫu, nên một agent cố tình vẫn có thể lách. Các lớp không phụ thuộc vào máy bạn là Restrict của Jira, environment `merge-gate`, `merge-gate` và `audit`.

## Ruleset

`npm run gh:protect -- --repo <owner>/<name>` chạy từ repo kit, bằng `gh` của bạn. Lệnh áp ruleset `ao-protected` cho `develop`, `main` và `release/*`: chặn xóa nhánh và force push, bắt buộc qua PR, bắt buộc bốn check của `CI`, cần một approve, và bỏ approve cũ khi có push mới. Chạy lại thì cập nhật ruleset đang có, không tạo bản trùng.

Repo private ở gói Free không có ruleset (API trả 403). Khi đó lệnh in `soft mode: merge-gate and audit enforce the gates`, không đổi gì, và thoát với mã 0.

## Phút Actions

Với repo private, GitHub tính phút theo từng job, làm tròn lên một phút. Gói Free có 2.000 phút mỗi tháng. Số đo trên `ao-pilot` ở T19:

| Sự kiện | Phút |
|---|---|
| Một lần chạy `CI` (bốn job) | 4 |
| Một lần push lên PR: `CI`, rồi `jira-sync` và `merge-gate`, mỗi workflow hai lần | 8 |
| Một báo cáo review, hoặc một lần bạn approve: `jira-sync` và `merge-gate`, mỗi workflow một lần | 2 |
| Merge và deploy: `CI`, `Deploy`, `jira-sync` ba lần, `merge-gate` hai lần | 11 |

Một vòng chuẩn gồm: mở PR, sửa một lần, `reviewer` và `security` báo cáo ở cả hai vòng, bạn approve một lần, rồi merge và deploy. Vòng đó tốn 2 × 8 + 5 × 2 + 11 = 37 phút, nên 2.000 phút đủ cho khoảng 54 vòng mỗi tháng. Vòng của PR #4 có bốn lần push và sáu lần review hoặc approve, nên tốn 55 phút.

`jira-sync` và `merge-gate` chiếm 33 trên 55 phút đó. Mỗi lần chạy chỉ mất 10 đến 20 giây nhưng vẫn bị tính tròn một phút, và `merge-gate` chạy sau mọi lần `jira-sync`. Muốn tiết kiệm, hãy gom các bản sửa vào ít lần push hơn. Nếu vẫn vượt ngân sách, có thể gộp job hoặc bớt trigger (spec mục 12).

## GitHub CLI trên máy bạn

Kit đã kiểm với `gh` 2.103.3. Nên dùng bản 2.102.0 trở lên, vì:

- bản 2.102.0 vá mọi security advisory của `gh` đã công bố tới tháng 10 năm 2026. Bản 2.16.1, dùng tới Checkpoint 4, dính 9 advisory;
- trước 2.73.0, `gh pr view <n>` không kèm `--json` bị lỗi, vì GitHub đã tắt Projects (classic);
- `gh auth token` có từ 2.17. Với bản cũ hơn, kit đọc token qua `gh auth status --show-token`.

Ba việc nên làm:

1. **Để token trong keyring.** Từ 2.26.0, `gh auth login` cất token vào keyring của hệ điều hành; trên Windows là Windows Credential Manager. Các lần đăng nhập cũ hơn để token trong `hosts.yml`, không mã hóa, và agent nào chạy dưới tài khoản Windows của bạn cũng đọc được. `gh auth status` cho biết token nằm ở `keyring` hay trong file. Nếu nằm trong file, hãy chạy lại `gh auth login`.
2. **Tắt telemetry nếu không muốn gửi.** Từ 2.91.0, `gh` mặc định gửi telemetry. Lệnh `gh config set telemetry disabled` tắt nó.
3. **Xem git đang dùng token nào trước khi thu hồi token của `gh`.** Khi đăng nhập, `gh` hỏi `Authenticate Git with your GitHub credentials?`. Nếu chọn Yes trong khi git dùng Git Credential Manager, `gh` chép token của nó vào Git Credential Manager. Từ đó, thu hồi token của `gh` cũng làm `git push` lỗi. Việc này đã xảy ra ở Checkpoint 4; cách sửa là đăng nhập lại Git Credential Manager bằng `git credential-manager github login`.

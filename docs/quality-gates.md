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
| `commit-msg` | Header không theo `type(scope): subject (<KEY>)`, ví dụ `feat(cart): add a quantity limit (DEMO-6)`. `type` là một trong `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` | Viết lại header, hoặc `git commit --amend` nếu commit đã tạo. Commit merge và commit revert do git tạo thì được cho qua. Commit đầu tiên của repo không cần mã Jira, nhưng vẫn theo `type(scope): subject` |
| `pre-push` | Lần push cập nhật `develop`, `main`, hoặc một nhánh `release/*` đã có | Đẩy lên nhánh làm việc, rồi mở PR. Tạo nhánh `release/*` mới thì được cho qua |

## Bốn check của `CI`

Workflow `CI` chạy trên mọi PR và mỗi lần push lên `develop`, `main`, `release/**`. Mỗi job là một check. Kết quả nằm ở tab **Checks** của PR. Bấm vào một job để xem log của nó, hoặc mở trang **Summary** của lần chạy để xem job summary **(đối chiếu giao diện)**.

### `policy`

Job summary có mục **Policy**. Mỗi dòng là một phần kiểm: ✅ là đạt, ❌ là đỏ, kèm lý do.

| Phần | Đỏ khi | Cách sửa |
|---|---|---|
| Conventions | Tên nhánh, header của một commit trong PR, hoặc tiêu đề PR sai quy ước. Nhánh `feature/` chỉ vào `develop`; `bugfix/` vào `develop` hoặc `release/*`; `hotfix/` vào `main` | Sai tên nhánh thì mở PR mới từ nhánh đúng tên. Sai header thì viết lại commit rồi force push lên nhánh của PR. Sai tiêu đề thì sửa bằng `ao-pr.mjs edit` |
| Suppressions | Dòng thêm vào có mẫu tắt kiểm tra (`eslint-disable`, `oxlint-disable`, `@ts-ignore`, `.skip(`, `nosemgrep`, `gitleaks:allow`…) mà không ghi `reason: <lý do>` trên cùng dòng; hoặc có `.only(` | Sửa lỗi thay vì tắt kiểm tra. Nếu thật sự phải tắt, ghi `reason:` trên cùng dòng để reviewer đọc. `.only(` luôn đỏ, nên phải xóa |
| Thresholds | PR hạ một ngưỡng trong `quality/gates.yaml`, ví dụ `changed_lines_min` | Trả ngưỡng về như cũ. Hạ ngưỡng là quyết định của bạn, và file này được bảo vệ, nên PR đó do bạn merge |
| Dependencies | `npm audit`, hay `pnpm audit` với dự án pnpm, thấy lỗ hổng high hoặc critical không nằm trong danh sách ngoại lệ còn hạn | Cập nhật dependency. Nếu chưa có bản vá, thêm một ngoại lệ có hạn vào `dependencies.exceptions`, gồm mã advisory, lý do và ngày hết hạn. Đây cũng là file được bảo vệ, nên bạn quyết định và tự merge |

Dòng ℹ️ chỉ để báo, không làm job đỏ. Ví dụ `test file deleted: <file>` nhắc reviewer xem vì sao file test bị xóa. Khi push mà không có PR, `policy` chỉ chạy audit của npm hay pnpm.

### `build-test`

Job chạy `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, bước **Coverage of changed lines**, rồi `npm run build`. Bước nào lỗi thì job đỏ ở bước đó, và log của bước cho biết lý do.

**Dự án pnpm** (project-scaffold phần 2, mục 2.1): repo có `pnpm-lock.yaml` ở gốc thì bước **npm or pnpm** (`ci-package-manager.mjs`) cài đúng bản pnpm mà `packageManager` của `package.json` ghi. Sau đó job chạy `pnpm install --frozen-lockfile` và `pnpm run <script>` thay cho npm, và job `policy` chạy `pnpm audit`. Thiếu `packageManager` thì bước này đỏ và nói vậy. Package của chính kit trong `.ai-orchestrator/` vẫn cài bằng npm.

Job summary có mục **Coverage of changed lines: N%**, với bảng gồm các cột File, Covered và Lines not run. Bước này đỏ khi:

- các dòng mà PR thêm hoặc sửa có coverage dưới 80% (`coverage.changed_lines_min`). Viết test chạy qua các dòng ở cột Lines not run.
- một file nguồn thay đổi mà không có trong lcov. Cấu hình coverage của dự án phải gồm mọi file nguồn, kể cả file chưa có test.

Bước này chỉ tính dòng thực thi được. Những file không được tính:
- file test;
- file cấu hình (`*.config.*`);
- migration;
- script ở gốc dự án (`scripts/`, như `scripts/dev.mjs` chạy hai app ở máy);
- bản chép kit (`.ai-orchestrator/`, `.claude/`), vì đã có test ở kit. Muốn kiểm trước khi push, chạy `npm run test:coverage`, rồi `node .ai-orchestrator/scripts/coverage-diff.mjs --base origin/develop`.

### `secrets`

gitleaks quét các commit của PR; khi push thì quét các commit mới. Log của bước **Scan the new commits** chỉ ra file, dòng và commit có secret.

Secret đã nằm trong lịch sử git, nên xóa nó ở một commit sau là chưa đủ:

1. Thu hồi secret đó và tạo cái mới.
2. Viết lại các commit của nhánh để bỏ secret, rồi force push lên nhánh của PR.

Chỉ thêm `gitleaks:allow` khi chắc chắn đó không phải secret, và ghi `reason:` trên cùng dòng.

### `sast`

Semgrep CE chạy với bộ rule `p/default` và `p/owasp-top-ten`. Job đỏ khi có finding mức ERROR. Log của bước **Semgrep on the changes** ghi rule, file và dòng.

Semgrep chỉ báo finding do thay đổi mang vào:
- Trên PR: so với nhánh đích.
- Khi push lên một nhánh đã có trên GitHub: so với commit trước lần push.
- Khi push một nhánh mới, như `develop` lần đầu hay một nhánh `release/*`: chỉ xét commit đầu nhánh, giống `gitleaks`. Nhờ vậy finding có từ trước kit không chặn nhánh mới (`project-scaffold`, T17).
- Commit gốc của một repo, và lượt chạy tay `gh workflow run CI --ref <nhánh>`, được quét toàn bộ. Muốn xem các finding cũ của một repo đang có thì chạy tay.
- Chỉ chạy tay được trên `develop`, `main` hay `release/*`. Trên nhánh khác, mọi job đỏ ngay ở bước đầu **By hand only on develop, main or release/\***. Lượt chạy tay không có các phần chỉ chạy trên PR, nên nó không được phép ghi check xanh lên commit của PR.

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

`merge-gate.yml` chỉ có hiệu lực khi nằm trên nhánh mặc định. Kit đặt nhánh mặc định là `develop` (README, bước cài 6), nên một bản sửa của nó chạy ngay khi bạn merge PR của bản sửa. Nếu nhánh mặc định là `main`, bản sửa chỉ chạy sau lần release kế tiếp.

### PR tài liệu của Epic

Từ `dev-workflow` (spec mục 2.4), tài liệu của một Epic (SPEC, design, plan, ADR) vào `develop` qua một PR riêng. Bạn duyệt chúng trên Jira, ở gate ① và ②, nên PR này không cần báo cáo review hay approve trên GitHub. `merge-gate` coi một PR là PR tài liệu khi:

- head là nhánh `feature/<EPIC>-spec`, và App `ao-dev` mở PR;
- mọi file PR sửa, kể cả tên cũ của file đổi tên, nằm trong `docs/specs/<EPIC>/**` hoặc `docs/adr/**` (mục `docs_pull_requests` của `quality/gates.yaml`);
- `<EPIC>` là Epic trên Jira.

`merge-gate` squash merge PR tài liệu khi Epic đã qua gate ② (In Progress hoặc Done), `CI` xanh trên head, và lượt `CI` mới nhất của nhánh tài liệu (sự kiện `pull_request`) chạy trên head và bắt đầu trước lúc bạn bấm `Approve plan`. Mỗi lần push lên PR tạo một lượt mới, nên push sau lúc duyệt, kể cả force-push về commit cũ, làm PR thành PR thường. Lượt của cùng commit ở nhánh khác hay chạy tay không được tính. Thời điểm duyệt lấy từ changelog của Epic. Các dòng trong log:

| Dòng | Nghĩa |
|---|---|
| `Merged #14: …, the docs PR of DEMO-20` | Đã merge PR tài liệu |
| `Waiting #14: the docs PR of DEMO-20: DEMO-20 past gate plan-approval (it is Planning)` | Chờ bạn bấm `Approve plan` |
| `Waiting #14: … (head … came after Approve plan of DEMO-20 at …, so it is reviewed like any PR)` | Có commit push sau lúc bạn duyệt: PR thành PR thường, cần hai báo cáo và approve của bạn |
| `Waiting #14: the docs PR of DEMO-20: JIRA_CI_TOKEN, for merge-gate to read DEMO-20` | `merge-gate.yml` chưa có `JIRA_CI_TOKEN` |

`merge-gate` đọc Epic bằng `JIRA_CI_TOKEN`, chỉ để đọc, và đọc lượt `CI` bằng quyền `actions: read` của token workflow. `audit` dùng đúng các điều kiện này cho commit merge của PR tài liệu.

## Khi nào bạn tự merge

Bạn tự merge trong hai trường hợp đầu dưới đây. Trường hợp 3, PR release và PR merge ngược, giờ do `merge-gate` merge. `audit` vẫn kiểm cả ba, nên hãy làm đủ các bước trước khi bấm Merge.

1. **PR của agent sửa file được bảo vệ:** `.github/workflows/**`, `.githooks/**`, `.claude/**`, `.ai-orchestrator/**`, `.mcp.json`. `merge-gate` in `Needs you`.
   - Workflow chạy theo `pull_request` dùng bản nằm trong PR, nên một PR sửa `ci.yml` có thể tự làm `CI` của nó xanh. Vì vậy hãy đọc kỹ diff ở tab **Files changed**.
   - PR vẫn phải đủ mọi điều kiện khác: `CI` xanh, hai báo cáo không còn Critical hay High, và approve của bạn trên commit đầu.
   - Sau đó bấm **Squash and merge** **(đối chiếu giao diện)**. `audit` chỉ chấp nhận PR này khi người merge là một login trong `AO_APPROVERS`.
   - Từ `dev-workflow` (spec mục 2.7), khi PR chỉ còn chờ bạn (không thiếu gì, hoặc chỉ thiếu approve của bạn), `merge-gate` comment lên PR bằng `ao-dev` và gắn cờ "Needs you" lên item, kèm comment cùng nội dung bắt đầu bằng `merge-gate: needs you at <sha> on PR #<n>`. Mỗi head chỉ một lần. Item đã bị cổng khác gắn cờ thì `merge-gate` để nguyên trên Jira. Khi PR được merge hoặc đóng, `jira-sync` gỡ cờ đó, trừ khi sau đó có ai gắn cờ lại. Cả hai chỉ tính comment trên Jira của tài khoản token CI, tức `account_id` của identity `automation` trong `tracker/jira.yaml`, và comment trên PR của bot `ao-dev`: dấu do agent hay người khác viết không được tính. Tìm `account_id` của một tài khoản: mở hồ sơ của nó trên Jira, phần cuối của URL là id **(đối chiếu giao diện)**.
2. **PR do bạn mở.** `merge-gate` bỏ qua PR của bạn. `audit` tính bạn là đã approve, nhưng PR vẫn cần `CI` xanh, hai báo cáo trên commit đầu, cùng tiêu đề và mô tả đúng mẫu.
3. **PR release và PR merge ngược** (`release-workflow`, spec mục 2.7; mục `release_pull_requests` của `quality/gates.yaml`). Cả hai do `ao-dev` mở, và `merge-gate` merge bằng **merge commit**, không squash, để lịch sử của từng bản nằm trên `main`.
   - **PR release** `release/vX.Y.Z` → `main` (gate ⑤): `merge-gate` merge khi `CI` xanh và bạn đã approve commit đầu. Bạn approve, không bấm Merge. Từng thay đổi trong bản đã qua cổng ở PR riêng của nó, nên đường dẫn được bảo vệ không bắt bạn tự merge PR này. Merge xong, `merge-gate` gắn tag `vX.Y.Z` vào merge commit, rồi mở PR merge ngược `main` → `develop`.
   - **PR merge ngược** (head là `main` của chính repo, vào `develop` hay nhánh `release/*` đang mở): `merge-gate` merge khi `CI` xanh và PR không có xung đột, không cần approve, vì mọi commit của `main` đã qua gate ③ hay gate ⑤.
   - **PR merge ngược có xung đột:** `merge-gate` không merge, và comment "Needs you" lên PR một lần cho mỗi commit đầu. Bạn gỡ ở máy: tách một nhánh từ `main`, merge nhánh đích vào đó, sửa xung đột, push nhánh, rồi mở PR vào nhánh đích và tự merge bằng **Create a merge commit**, để giữ hai nhánh cha. Đóng PR merge ngược cũ. PR mới không phải PR của một item, nên `audit` chặn deploy ở môi trường đó. Bạn đọc diff, rồi gỡ chặn bằng `/ao-rollback <môi trường> <sha>` (plan, quyết định 5). [Chưa kiểm] Cách gỡ này chưa chạy thật lần nào.

Merge tay một PR chưa đủ cổng thì `audit` đỏ ở lần deploy kế tiếp.

## `audit` và deploy

Dự án dùng VPS (`release-workflow`) không có workflow deploy: deployer chạy cùng code `audit` trên bản kit ghim ở VPS, cho mọi commit mới trên lịch sử first-parent. Commit không qua thì deployment có status `error`, kèm lý do như dưới, và bạn gỡ chặn bằng `/ao-rollback <môi trường> <sha>` ([docs/release-workflow.md](release-workflow.md)).

Dự án tự deploy bằng GitHub Actions thì workflow deploy gọi `audit.yml` trước, và job deploy có `needs: audit`:

```yaml
permissions: { contents: read, pull-requests: read, checks: read, statuses: read, actions: read }
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

Hai trường hợp của `release-workflow` không cần review hay approve:

- **Commit báo cáo của `/ao-ship`** trên `release/*`: bot `ao-dev` push thẳng, không qua PR, một commit chỉ sửa `docs/releases/**` và `CHANGELOG.md`. Hai file đó nằm ngoài image. Commit của bot sửa file khác thì đỏ: `<sha> on release/v0.1.0 is a commit of tungph7-ao-dev[bot] without a PR, which may only change docs/releases/** and CHANGELOG.md, but it changes <file>`.
- **PR merge ngược** từ `main` vào `develop` hay vào nhánh `release/*` đang mở: chỉ cần `CI` xanh trên head, và người merge là `merge-gate` hoặc bạn. Mọi commit của `main` đã qua gate ③ hay gate ⑤.

Khi `audit` đỏ:

1. Job deploy không chạy, nên môi trường giữ bản cũ.
2. `orchestratorci` gắn cờ Impediment và nhãn `needs-you` cho item Jira có mã trong tiêu đề PR hoặc header commit, kèm một bình luận nêu lý do.

Cách dọn, như T20 đã làm:

1. Agent revert commit đó bằng `git revert` trên một nhánh mới, rồi mở PR. PR revert qua đủ cổng như mọi PR, và `merge-gate` merge nó.
2. Ở lần deploy kế tiếp, `audit` xanh.
3. Bạn gỡ cờ của item (menu **…** của item → **Remove flag**) và nhãn `needs-you` **(đối chiếu giao diện)**, rồi làm lại thay đổi qua đủ cổng.

Cập nhật bản chép kit trong dự án cũng phải đi qua PR, và PR đó do bạn merge, vì nó sửa `.ai-orchestrator/**`. Push thẳng lên `develop` làm `audit` chặn deploy và gắn cờ item có mã trong header commit. `DEMO-5` mang cờ vì lý do này, từ lần cài kit ở T18.

### PR chép một bản kit đã được review

Mỗi bản kit chỉ cần agent review đầy đủ một lần. Khi chép cùng bản đó sang dự án thứ hai, thêm vào mô tả PR một dòng riêng, trỏ tới PR đã được review ở dự án đầu:

```text
Kit review: TungPH7/ao-pilot#24
```

`/ao-review <PR>` tự kiểm rồi đăng hai báo cáo `reviewer` và `security` bằng App `ao-review`. Không agent nào chạy, chi phí 0 USD. Báo cáo có dòng `Kit copy of:` để bạn thấy nó do `ao-step` viết. `merge-gate` và `audit` đọc nó như mọi báo cáo khác. Bạn vẫn đọc diff, approve và tự merge ở gate ③.

Dòng `Kit review:` chỉ là lời khai. `ao-step` kiểm lần lượt:

1. Repo tham chiếu nằm trong `AO_KIT_PEERS`.
2. PR tham chiếu đã merge vào nhánh được bảo vệ, do bạn merge.
3. Head của nó có đủ hai báo cáo do agent viết, không còn Critical hay High mở.
4. Nó là PR mới nhất trên `develop` của repo đó đổi `.ai-orchestrator/lib/`, nên không chép ngược về bản cũ được.
5. Mọi file PR đổi đều là file kit, và khớp nội dung, mode và loại với head tham chiếu. PR xóa một skill thì quay về review thường. File đổi được tính bằng cách so cây git của merge base với cây của head, nên không có giới hạn số file.
6. Các file "phải giống hệt" khớp theo cả hai chiều, nên không chép một phần hay thêm file lạ được. Danh sách nằm ở khối `kit_copy` của `quality/gates.yaml`.
7. `.claude/agents/` và `.claude/rules/ai-orchestrator.md` chứa mã space và skill theo stack của dự án, nên không so với dự án khác. `ao-step` luôn dựng lại chúng bằng `render-agents.mjs` của kit đang chạy, và chỉ nhận đúng các file `render-agents.mjs --list` kể ra.
8. PR không còn finding Critical hay High mở từ các báo cáo trước. Những finding đó đi qua `/ao-fix` như mọi PR.

Không đạt một điều thì lệnh in lý do và cho agent review như thường. Lỗi mạng, hay một push trong lúc so, cũng vậy.

`/ao-review` chạy bản chép kit của dự án, nên chỉ dự án nào đã có code này mới đi được đường so byte. Lần chép đầu tiên mang code này vào một dự án vẫn được agent review đầy đủ, trừ khi bạn chạy `ao-step` từ kit bằng `AO_KIT_DIR`, như ở lần kiểm thật. Đặt `AO_KIT_PEERS` trong `.claude/settings.json` của dự án để dùng lâu dài.

Lý do `max` vẫn giữ ở lượt review đầu tiên: bài thử mù ngày 2026-11-07 cho thấy `high` tìm ra 4 trên 6 lỗi đã biết, và bỏ sót một lỗi High ở cả hai lượt lặp. Xem [`tasks/kit-copy-review/verification.md`](../tasks/archive/kit-copy-review/verification.md).

## Environment `merge-gate`

`merge-gate` merge bằng một private key thứ hai của App `ao-dev`, lưu ở secret `AO_DEV_APP_KEY` của environment `merge-gate`. Environment này chỉ cho nhánh mặc định (`develop`), nên workflow chạy trên nhánh khác không đọc được key (đã kiểm ở T3 và T19). Cài một lần cho mỗi repo:

1. Tạo key thứ hai cho `ao-dev`, theo mục 2 của [github-apps-setup.md](github-apps-setup.md). Key đầu tiên, dùng cho `ao-pr.mjs` ở máy bạn, giữ nguyên.
2. Trên trang repo: **Settings** → **Environments** → **New environment**. Đặt tên `merge-gate`, rồi bấm **Configure environment** **(đối chiếu giao diện)**.
3. Ở **Deployment branches and tags**, chọn **Selected branches and tags**, bấm **Add deployment branch or tag rule**, gõ tên nhánh mặc định (`develop`), rồi bấm **Add rule** **(đối chiếu giao diện)**. Về sau nếu đổi nhánh mặc định, hãy đổi rule này theo; nếu không, `merge-gate` sẽ không đọc được key.
4. Đặt secret bằng cách pipe file key, để key không nằm trong lịch sử lệnh: `gh secret set AO_DEV_APP_KEY --env merge-gate -R <owner>/<repo> < path/to/key.pem`. Xong thì xóa file key thứ hai khỏi máy.

Job của `merge-gate` khai `environment: { name: merge-gate, deployment: false }`. Bỏ `deployment: false` thì mỗi lần chạy tạo một deployment, và sự kiện của nó kích hoạt `jira-sync`, rồi lại `merge-gate`, thành vòng lặp.

## Hook `gh-guard` của Claude Code

`gh-guard` chạy trước mỗi lần agent dùng `Bash`, `Read`, `Edit`, `Write` hoặc `NotebookEdit`, và chỉ áp cho các vai trò agent của hợp đồng. Phiên chính của bạn không bị chặn. Danh sách đầy đủ ở mục 2.7 của spec. Tóm tắt, hook chặn agent:

- bỏ qua hook git: `git commit --no-verify`, `git -c core.hooksPath=…`;
- push lên `develop`, `main`, `release/*`;
- làm việc với PR bằng tài khoản của bạn: `gh pr merge`, `review`, `create`, `revert`, `update-branch` và các lệnh ghi khác, hay `gh api` với method khác GET;
- lấy token hoặc key: `gh auth token`, `gh auth status -t`, đọc `hosts.yml` của `gh` hay file PEM của App;
- đổi cấu hình repo, như `gh secret set`, `gh repo edit`, `gh repo autolink create`; hoặc xóa lần chạy workflow bằng `gh run delete`; chạy tay, bật hay tắt workflow bằng `gh workflow run`, `enable`, `disable`;
- sửa file được bảo vệ bằng `Edit`, `Write`, `NotebookEdit`. Riêng `devops` được sửa `.github/workflows/**`, nhưng PR đó vẫn do bạn merge;
- từ `dev-workflow`: tự mở agent hay tự lấy token, tức chạy `ao-step.mjs`, `ao-agent.mjs`, `ao-git-credential.mjs`; đặt credential helper cho git (`git -c credential.*`, `git config credential.*`); sửa file trong `.git/`;
- từ A1 sau Pilot 2: đưa mật khẩu basic auth của Development và Staging (`$E2E_HTTP_PASSWORD`, `$AO_ENV_AUTH`) vào tham số của một lệnh, như `curl -u`, vì process nào trên máy cũng đọc được dòng lệnh. Chỉ `printf`, lệnh có sẵn của shell, được nhắc tới biến này. `qa` đưa mật khẩu cho `curl` qua stdin: `printf 'user = "%s:%s"\n' "$E2E_HTTP_USER" "$E2E_HTTP_PASSWORD" | curl -K - <url>`.

Khi bị chặn, agent nhận lý do bắt đầu bằng `gh-guard:`, kèm cách làm đúng, ví dụ dùng `ao-pr.mjs`.

Hai điều nên biết khi chạy agent:

- **`--allowedTools` không phải lớp chặn.** Nếu `defaultMode` trong `~/.claude/settings.json` là `auto`, `claude -p` vẫn cho chạy lệnh nằm ngoài `--allowedTools` (phát hiện ở T18). Hook thì chặn ở mọi chế độ quyền, vì hook trả `deny` là lệnh không chạy.
- **Dòng ghi công AI.** Theo mặc định, Claude Code dặn agent thêm dòng `Co-Authored-By` vào commit và dòng ghi công vào PR. `.claude/settings.json` của kit đặt `"attribution": { "commit": "", "pr": "" }` để tắt việc này.

`gh-guard` đọc lệnh theo mẫu, nên một agent cố tình vẫn có thể lách. Các lớp không phụ thuộc vào máy bạn là Restrict của Jira, environment `merge-gate`, `merge-gate` và `audit`.

**`gh-guard` chặn nhầm lẫn, không phải ranh giới quyền.** Phiên agent chạy dưới user Windows của bạn. Vì vậy nó đọc được file key của hai App, và một script do agent tự viết vẫn mua được token `ao-dev`, kể cả quyền Workflows. Từ T15b (review của ao-pilot PR #14), `gh-guard` từ chối thêm:

- lệnh đặt, export hay xóa các biến danh tính của phiên (`GIT_CONFIG_*`, `GIT_ASKPASS`, `GH_TOKEN` …), cả `env -i` và các biến đó trong PowerShell;
- chương trình `git-credential-*`;
- shell đọc lệnh từ stdin, và lệnh PowerShell đã mã hóa.

Lệnh trong `powershell -Command`, `pwsh -Command` và `cmd /c` được kiểm như lệnh thường. Script do agent tự viết rồi chạy (`bash x.sh`, `node x.mjs`) thì `gh-guard` không đọc.

Các việc sau còn để ngỏ, vì cần bạn quyết:

- **Lớp chặn phía server cho `develop` và `main`:** ruleset cần repo public hoặc GitHub Pro. Khi chưa có, `merge-gate`, `audit` và hook `pre-push` là các lớp chặn còn lại.
- **App riêng cho quyền Workflows,** chỉ `devops` dùng. Khi đó key của `ao-dev` không còn mở được workflow.
- **Đưa `--go` ra khỏi luật `allow`** của `.claude/settings.json`. Khi đó Claude Code hỏi bạn trước mỗi lần chạy agent, kể cả khi model của phiên chính bị văn bản trên Jira hay PR dẫn dắt.
- **Đưa key ra khỏi tầm của user chạy agent:** chạy agent dưới một user Windows riêng, hoặc trong WSL2 có sandbox (spec dev-workflow mục 12).
- **`GH_TOKEN` của phiên hết hạn sau 1 giờ.** Lượt dài hơn sẽ hỏng ở các lệnh `gh` sau giờ đầu; `git` và `ao-pr.mjs` thì không, vì chúng mua token mỗi lần.

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

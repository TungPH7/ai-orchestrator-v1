# Kiểm thật: quality-gates

> **Plan:** [plan.md](plan.md). Mỗi lần kiểm thật ghi ngày, bước đã làm và kết quả. Không ghi token, và không ghi nội dung private key.

## T1: Hai GitHub App

**Chuẩn bị (2026-10-29):** `docs/github-apps-setup.md` có các bước tạo App, tạo private key, cài App vào `TungPH7/ao-pilot`, đặt biến `AO_DEV_APP_KEY_FILE` và `AO_REVIEW_APP_KEY_FILE`. Nhãn nút lấy từ tài liệu GitHub; bốn chỗ ghi "đối chiếu giao diện".

**Đổi cách làm (2026-10-29):** bạn hỏi vì sao phải tự tạo App. Claude viết `scripts/github-app-create.mjs` theo manifest flow, nên bạn chỉ còn bấm tạo và cài trên GitHub; tài liệu giữ các bước làm tay để dự phòng.

**Kết quả (2026-10-29, khoảng 01:20):** Claude chạy script và mở trang `http://127.0.0.1:47100/`; bạn bấm tạo và cài cho từng App. GitHub nhận `redirect_url` và `setup_url` dạng `http://127.0.0.1:<port>/...`. Script dừng với mã 0 và chỉ in:

| App | Slug | App ID | Installation | File key |
|---|---|---|---|---|
| `ao-dev` | `tungph7-ao-dev` | 5514949 | 176282622 | `C:\Users\Huu Tung\ao-keys\tungph7-ao-dev.pem` |
| `ao-review` | `tungph7-ao-review` | 5514961 | 176282738 | `C:\Users\Huu Tung\ao-keys\tungph7-ao-review.pem` |

- Hai file key có trên đĩa (1.675 byte mỗi file); nội dung không được mở hay in.
- Claude đặt hai biến môi trường user `AO_DEV_APP_KEY_FILE`, `AO_REVIEW_APP_KEY_FILE` bằng PowerShell; đọc lại từ registry: cả hai có giá trị và trỏ tới file tồn tại.
- Phạm vi cài (chỉ `ao-pilot`) kiểm bằng JWT của từng App ở T2.

## T2: Token của GitHub App

**Kiểm thật (2026-10-29, khoảng 01:25):** một script thử trong scratchpad dùng `appCredentials`, `appJwt` và `installationToken`, với App ID và slug truyền qua biến môi trường. Phiên Claude Code đã khởi động trước khi có hai biến `AO_*_APP_KEY_FILE`, nên đường dẫn file key được đọc từ registry (`HKCU\Environment`): cách dự phòng này chạy đúng.

| | `tungph7-ao-dev` | `tungph7-ao-review` |
|---|---|---|
| `GET /app` bằng JWT | chủ `TungPH7`; quyền contents write, metadata read, pull_requests write; không đăng ký sự kiện | chủ `TungPH7`; quyền contents read, metadata read, pull_requests write; không đăng ký sự kiện |
| `GET /repos/TungPH7/ao-pilot/installation` bằng JWT | 200, installation 176282622 | 200, installation 176282738 |
| Phạm vi cài (`repository_selection`) | `selected` | `selected` |
| Token không giới hạn repo: `GET /installation/repositories` | chỉ `TungPH7/ao-pilot` | chỉ `TungPH7/ao-pilot` |
| Token của `installationToken` (giới hạn `ao-pilot`) | `ghs_…`, sống 1 giờ, thấy đúng `TungPH7/ao-pilot` | như bên trái |
| Thu hồi token (`DELETE /installation/token`) | 204, 204 | 204, 204 |

Không token nào được in; script chỉ in loại token (`ghs_`) và các thông tin không bí mật ở bảng trên.

## T3: Kiểm giả định nền trên `ao-pilot`

**Giả định 1, bot `ao-review` yêu cầu sửa được trên PR của bot `ao-dev` (2026-10-29, khoảng 01:30): đúng.** Claude đẩy nhánh `probe/t3-app-identity` (một file `probe/t3.md`, không mang mã Jira) bằng git của bạn. `ao-dev` mở [PR #2](https://github.com/TungPH7/ao-pilot/pull/2) vào `develop`: tác giả `tungph7-ao-dev[bot]`. `ao-review` gửi review `REQUEST_CHANGES` trên commit `3a12727`: GitHub nhận, người review là `tungph7-ao-review[bot]`.

**Giả định 3, giới hạn nhánh của environment trên gói Free: đúng.** Claude tạo environment `merge-gate` chỉ cho nhánh `main` và một secret giả `PROBE_SECRET` (29 ký tự).

| Lần chạy | Job khai `environment: merge-gate` | Job không khai environment |
|---|---|---|
| Push lên nhánh `probe/t3-env` | Bị chặn: `Branch "probe/t3-env" is not allowed to deploy to merge-gate due to environment protection rules.` | Chạy, secret rỗng (độ dài 0) |
| Như trên, với `deployment: false` | Vẫn bị chặn như trên; không tạo deployment | Chạy, secret rỗng |
| `workflow_dispatch` trên `main`, với `deployment: false` | Chạy, đọc được secret (độ dài 29); không tạo deployment | Chạy, secret rỗng |

Phát hiện thêm: job khai environment mà không có `deployment: false` tạo một deployment, và sự kiện `deployment_status` của nó kích hoạt `jira-sync` (hai lần chạy `jira-sync` với nhánh `probe/t3-env`). Với `merge-gate`, điều đó thành vòng lặp `merge-gate` → deployment → `jira-sync` → `merge-gate`. Spec mục 2.1 và 2.2 đã ghi: job của `merge-gate` dùng `deployment: false`.

Dọn dẹp: workflow thử trên `main` đã gỡ (commit `e893183`), nhánh `probe/t3-env` đã xóa, secret giả đã xóa, deployment thử đã chuyển inactive rồi xóa. Environment `merge-gate` giữ lại, chỉ cho `main`, chưa có secret.

**Approve của bạn trên PR của bot (khoảng 01:40): GitHub nhận.** Review trên PR #2: `tungph7-ao-review[bot]` CHANGES_REQUESTED và `TungPH7` APPROVED, cả hai trên commit `3a12727`.

**Giả định 2, merge bằng token App kích hoạt workflow của `push`: đúng.** `ao-dev` squash merge PR #2 vào `develop`, truyền kèm SHA của commit đầu và tiêu đề commit bằng tiêu đề PR. Commit `eacd786` trên `develop` có tiêu đề `chore(probe): check the GitHub App identities`, không có `(#2)`; tác giả `tungph7-ao-dev[bot]`. Push đó kích hoạt:

| Workflow | Sự kiện | Người kích hoạt | Kết quả |
|---|---|---|---|
| `CI` | `push` lên `develop` | `tungph7-ao-dev[bot]` | success |
| `Deploy` | `push` lên `develop` | `tungph7-ao-dev[bot]` | success; deployment `development` do bot tạo, trạng thái success |
| `jira-sync` (hai lần) | `deployment_status` | `tungph7-ao-dev[bot]` | success |

File `probe/t3.md` nằm lại trên `develop` của `ao-pilot`; T13 xóa nó khi cài bản chép kit.

## T6: Hook `commit-msg`, `pre-push` và lệnh cài hook

**Thử tay (2026-10-29, khoảng 02:05)** trong một repo git tạm có remote là một bare repo, với bản chép kit ở `.ai-orchestrator/` và hai hook ở `.githooks/`:

| Thao tác | Kết quả |
|---|---|
| `install-hooks.mjs` | `core.hooksPath set to .githooks` |
| Commit với header `wip` | Bị chặn: `the header must be type(scope): subject (<KEY>)`, kèm ví dụ |
| Commit với header `chore(repo): start the try (DEMO-1)` | Qua |
| Push tạo `develop` trên remote (nhánh chưa có) | Qua |
| Push cập nhật `develop` | Bị chặn: `develop is protected: change it through a pull request, not a push` |
| Push tạo `release/v0.1.0` | Qua |
| Push tạo `feature/DEMO-1-try` | Qua |
| Push xóa `release/v0.1.0` | Bị chặn: `release/v0.1.0 is protected: do not delete it` |

Lần thử đầu, bản chép thiếu thư mục `contract/`, nên `pre-push` dừng với lỗi đọc schema và chặn mọi push (hỏng thì chặn, không thả). Bản chép kit thật luôn có `contract/`.

## T13: Kiểm thật hook git và CI trên `ao-pilot`

**Cài đặt (2026-10-29, khoảng 03:00):** tạo Task `DEMO-5` (New, người tạo `orchestratorci`) làm item của PR thử. Phiên chính cài bản chép kit mới, `.githooks/`, `ci.yml` của kit và một package TypeScript nhỏ (`src/cart.ts`; TypeScript 6.0.3, ESLint 10.12.0, typescript-eslint 8.71.2) lên `develop` của `ao-pilot`, xóa `demo/`, `tests/`, `ci-state.txt`, `probe/`. Bốn script `lint`, `typecheck`, `test:coverage`, `build` chạy được ở máy. Commit cài đặt qua được hook `pre-commit` (secretlint trên 42 file rồi ESLint, khoảng 5 giây) và `commit-msg`.

- Lần chạy `CI` đầu trên push (run 40754471353): `sast` đỏ đúng lý do. Semgrep bắt rule `spawn-shell-true` trong `scripts/pre-commit.mjs` của kit (gọi `npm` qua shell trên Windows). Kit sửa bằng `lib/quality/npm.mjs` (gọi `npm-cli.js` bằng `node`, không qua shell), áp cho cả `check-policy.mjs`.
- Lần chạy sau khi sửa (run 40754782522): cả bốn job xanh. Semgrep 1.180.0 chạy được với `--metrics off` và bộ rule của registry.

**Tiêu chí 3, hook git trên `ao-pilot` (khoảng 03:15):** đạt.

| Thử | Kết quả |
|---|---|
| Commit với header `wip` | `commit-msg` chặn: `the header must be type(scope): subject (<KEY>)` |
| Stage `src/key.ts` chứa một private key RSA sinh lúc thử | `pre-commit` chặn: `[PrivateKey] found private key: ****`, key bị che |
| `git push origin HEAD:develop` | `pre-push` chặn: `develop is protected: change it through a pull request, not a push` |

**Tiêu chí 4, bốn job của `CI` trên PR thử (khoảng 03:20):** đạt. Nhánh `feature/DEMO-5-ci-live-test`; [PR #3](https://github.com/TungPH7/ao-pilot/pull/3) do `ao-pr.mjs create` mở, tác giả `tungph7-ao-dev[bot]`. Commit đầu (đẩy bằng `--no-verify`, vì secretlint chặn token giả) cố ý làm đỏ cả bốn job; [run 40762740821](https://github.com/TungPH7/ao-pilot/actions/runs/40762740821):

| Job | Đỏ vì |
|---|---|
| `policy` | `src/discount.ts:10 eslint-disable needs "reason: <why>" on the same line` |
| `build-test` | `src/config.ts is not in any lcov file`; `changed lines covered: 69.2% (9 of 13), below 80%` |
| `secrets` | gitleaks: `leaks found: 1` (token GitHub giả, giá trị bị che) |
| `sast` | Semgrep: `detected-github-token` và `spawn-shell-true`, cả hai chặn |

Sửa: token đã nằm trong lịch sử nhánh, nên nhánh được viết lại (`git reset --soft` về `develop`, commit lại, force push) chứ không chỉ xóa file; dòng `eslint-disable` có `-- reason: ...`; hàm thứ hai có test. Commit mới qua được hook `pre-commit`. [Run 40762874979](https://github.com/TungPH7/ao-pilot/actions/runs/40762874979): cả bốn job xanh.

**Phút Actions:** API `timing` trả 0 ms với repo private, nên tính từ thời gian từng job, mỗi job làm tròn lên một phút như GitHub tính: một lần chạy `CI` tốn 4 phút (các job chạy 6 đến 31 giây). PR #3 để mở cho Checkpoint 2, rồi đóng (không merge) sau khi bạn cho qua checkpoint, ngày 2026-10-29.

`jira-sync` chạy hai lần theo sự kiện của PR, cả hai thành công; `DEMO-5` vẫn ở New, không nhãn, vì Task không có Epic cha nên không qua được guard nào.

## T15: `merge-gate --dry-run` trên `ao-pilot`

**2026-10-29, khoảng 09:20.** Chạy từ bản clone `ao-pilot`: `node ../ai-orchestrator/scripts/merge-gate.mjs --dry-run`. `.claude/settings.json` của bản clone chưa có slug hai App (T18 cập nhật bản chép kit), nên lần chạy đầu dừng đúng với `Set AO_DEV_APP and AO_REVIEW_APP, ...`; các lần sau truyền `AO_DEV_APP`, `AO_REVIEW_APP` qua biến môi trường. Script đọc bằng token của `gh`, không mua token App.

| Bước | Output |
|---|---|
| Không có PR mở | `No open PR` |
| Mở lại PR #3 (`DEMO-5`, tác giả `tungph7-ao-dev[bot]`), CI đang chạy lại | `Waiting #3: CI green on head df44b9e; reviewer report on head df44b9e; security report on head df44b9e; approval on head df44b9e` |
| CI xong ([run 40805863207](https://github.com/TungPH7/ao-pilot/actions/runs/40805863207), xanh, 4 phút), chạy hai lần liền | Cả hai lần: `Waiting #3: reviewer report on head df44b9e; security report on head df44b9e; approval on head df44b9e` |

PR #3 để mở cho Checkpoint 3, rồi đóng lại.

## T16: `audit --dry-run` trên commit thật của `ao-pilot`

**2026-10-29, khoảng 09:30.** Chạy từ bản clone `ao-pilot` với `--dry-run` (không ghi Jira), `AO_DEV_APP` và `AO_REVIEW_APP` qua biến môi trường; `AO_APPROVERS` và `AO_JIRA_SPACE` đọc từ `.claude/settings.json` của bản clone. Cả hai lần đều thoát mã 1, đúng như mong đợi:

| Commit trên `develop` | Output |
|---|---|
| `68d2a15`, commit cài kit của T13, phiên chính push thẳng | `68d2a15 on develop is not the merge of a PR into develop: it was pushed without one`; `Would flag DEMO-5` (mã trong header của commit) |
| `eacd786`, commit squash của PR #2 (PR thử của T3, nhánh `probe/t3-app-identity`) | `PR #2 was merged without: valid branch (...); valid title (...); complete description (...); reviewer report on head 3a12727; security report on head 3a12727`; không có mã item nên `No work item of DEMO to flag`. Approve của bạn trên commit đầu được tính, nên không có dòng `approval` |

`GET /commits/{sha}/pulls` trả đúng PR đã merge, có `merge_commit_sha` và `merged_at`.

## T17: `gh:protect` (tiêu chí 11)

**2026-10-29, khoảng 09:35.**

- **`ao-pilot`:** `npm run gh:protect -- --repo TungPH7/ao-pilot` in `soft mode: merge-gate and audit enforce the gates`, thoát mã 0. `GET /rulesets` trả 403 (`Upgrade to GitHub Pro or make this repository public to enable this feature.`), nên script không gửi gì và repo không đổi.
- **Repo public tạm `TungPH7/ao-ruleset-probe`:** tạo rỗng bằng `POST /user/repos`. Lần chạy đầu in `created ruleset ao-protected (id 26093077)`, lần hai in `updated ruleset ao-protected (id 26093077)`. Đọc lại: repo chỉ có một ruleset `ao-protected`; `name`, `target`, `enforcement`, `bypass_actors`, `conditions` giống hệt payload; trong `rules`, mọi trường đã gửi đều giữ nguyên giá trị. GitHub điền thêm ba trường mặc định cho rule `pull_request`: `required_reviewers: []`, `allowed_merge_methods: [merge, squash, rebase]` và `require_extra_approval_for_unattributed_changes: true`. Trường cuối không có trong tài liệu mình đã đọc; cần xem lại khi một dự án thật dùng ruleset.
- **Xóa repo tạm:** token của `gh` có scope `gist, read:org, repo, workflow`, không có `delete_repo`, nên bạn xóa repo trên giao diện. Lúc khoảng 11:05, `GET /repos/TungPH7/ao-ruleset-probe` trả 404: repo đã bị xóa.

## T18: Agent mở PR, reviewer yêu cầu sửa, `gh-guard` chặn đường vòng (tiêu chí 5, 6)

**Cài đặt (2026-10-29, khoảng 11:17).** Phiên chính cập nhật bản chép kit trên `ao-pilot`: commit `2830053` trên `develop`, push thẳng; `main` nhận `develop` qua merge commit `354f02c`, nên hai nhánh có cùng cây. Commit gồm:

- `.ai-orchestrator/`: thêm `lib/project-settings.mjs`, `lib/quality/audit.mjs`, `lib/quality/merge-gate.mjs`, `lib/quality/ruleset.mjs`, `scripts/audit.mjs`, `scripts/merge-gate.mjs`; cập nhật sáu file đã đổi từ T13.
- `.claude/settings.json` của kit, với `AO_JIRA_SPACE` là `DEMO`, `AO_APPROVERS` là `TungPH7`, slug và App ID của hai App; hook `gh-guard`.
- Workflow `merge-gate` và `audit` của kit. Workflow `Deploy` giả gọi `audit` trước, job `deploy` có `needs: audit`.
- Ba agent thử: `fe-dev` thêm các tool Bash, Read, Edit, Write, Glob, Grep; `reviewer` và `security` mới.

Các run do hai lần push kích hoạt:

| Run | Kết quả |
|---|---|
| `CI` trên `develop` (`2830053`) và trên `main` (`354f02c`) | Xanh |
| `Deploy` trên `develop`, [run 40816907425](https://github.com/TungPH7/ao-pilot/actions/runs/40816907425) | `audit` đỏ đúng thiết kế: `2830053 on develop is not the merge of a PR into develop: it was pushed without one`, `Flagged DEMO-5`. Job `deploy` bị bỏ qua. `DEMO-5` mang cờ Impediment và comment của `orchestratorci` |
| `jira-sync` sau mỗi `CI` | `workflow_run: no work item of DEMO` |
| `merge-gate` sau mỗi `jira-sync`, [run 40816978304](https://github.com/TungPH7/ao-pilot/actions/runs/40816978304) | `No open PR`. Environment `merge-gate` chưa có secret mà run vẫn xanh, vì key chỉ cần khi merge |

Item thử: Task `DEMO-6` (New, người tạo `orchestratorci`), "quality-gates T18–T19: phí vận chuyển của giỏ hàng", checklist bốn mục: phí 3000 khi tổng từ 1 đến 49999, miễn phí từ 50000, giỏ rỗng trả 0, và `RangeError` khi `quantity` không phải số nguyên dương hoặc `price` âm.

**Tiêu chí 6, phần chặn (khoảng 11:25): đạt.** `claude -p --agent fe-dev --model sonnet` trong `ao-pilot`, với `--allowedTools "Bash(git:*)" Edit`. PR #3 đã đóng, nên lệnh merge không merge được gì, kể cả khi hook không chặn.

Sửa ở T19: lúc viết dòng trên, Claude cho rằng lớp quyền cũng chặn `gh`, vì `gh` không nằm trong `--allowedTools`. Điều đó sai. Các lượt `claude -p` chạy ở chế độ quyền `auto`, nên lệnh ngoài `--allowedTools` vẫn có thể được cho qua (xem T19). Ở cả ba bước dưới đây, chỉ hook chặn.

| Bước | `gh-guard` trả |
|---|---|
| `gh pr merge 3 --squash` | `do not run gh pr merge with your account; use node .ai-orchestrator/scripts/ao-pr.mjs (create, edit, comment, review), and leave merging to merge-gate` |
| `git commit --allow-empty --no-verify -m "test(guard): skip the git hooks (DEMO-6)"` | `do not skip or move the git hooks; fix what they report` |
| `Edit` dòng `name: CI` của `.github/workflows/ci.yml` | `.github/workflows/** is protected: only devops may edit it` |

Sau lần chạy, `develop` ở máy không có commit mới và `ci.yml` không đổi. `claude -p` chạy hook mới của dự án ngay, không hỏi gì, nên bạn không phải chấp nhận hook. Lần chạy tốn 4 lượt, khoảng 0,09 USD. Phần còn lại của tiêu chí 6 (agent được chạy `ao-pr.mjs create`) được kiểm cùng tiêu chí 5.

Khi thử `gh-guard` bằng input mẫu trước đó, một lời gọi `Edit` với đường dẫn kiểu Git Bash (`/d/Document/...`) được cho qua. Mình chạy thêm một lần với agent thật: `fe-dev` truyền đúng đường dẫn `/d/Document/1Khoahoc/4LapTrinh/AI-for-coding/ao-pilot/.github/workflows/ci.yml` cho `Edit`, và hook vẫn chặn (`gh-guard: .github/workflows/** is protected: only devops may edit it`). Vì khi chạy tay hook cho qua đường dẫn dạng này, có thể suy ra Claude Code đã đổi nó sang dạng Windows trước khi gọi hook. Không có lỗ hổng ở đây.

**Chuẩn bị cho tiêu chí 5 (khoảng 13:45–13:55).**

- Bạn chuyển `DEMO-6` từ New sang Ready lúc 13:45:10.
- Bạn tạo key thứ hai của `ao-dev` vào `ao-keys`. Claude kiểm key bằng một JWT ký với nó: `GET /app` trả slug `tungph7-ao-dev`, và App có installation `176282622` trên `ao-pilot`.
- Claude pipe file key vào `gh secret set AO_DEV_APP_KEY --env merge-gate -R TungPH7/ao-pilot`, rồi xóa file. `gh secret list --env merge-gate` giờ có `AO_DEV_APP_KEY`. Key đầu tiên (`tungph7-ao-dev.pem`, dùng cho `ao-pr.mjs` ở máy bạn) giữ nguyên.

**Lượt chạy của `fe-dev` (13:55:39 → 13:57:49).** Lệnh là `claude -p --agent fe-dev --model sonnet`, với:

- `--allowedTools "Bash(git:*)" "Bash(npm run:*)" "Bash(npm test:*)" "Bash(node .ai-orchestrator/scripts/ao-pr.mjs:*)"`, cùng Read, Edit, Write, Glob, Grep và ba tool Jira (`getJiraIssue`, `transitionJiraIssue`, `editJiraIssue`).
- `--add-dir` tới một thư mục nháp chứa bản sao của `templates/pull-request.md` và file mô tả PR do agent viết. Bản chép kit trong dự án không có thư mục `templates/`, nên lời nhắc chỉ đường tới bản sao này. Module `agent-roster` phải đưa mẫu tới agent.

Agent chạy 14 lượt, tốn khoảng 0,22 USD, và không bị hook nào chặn:

| Bước | Agent làm | Kết quả |
|---|---|---|
| 1 | `getJiraIssue` `DEMO-6` | Đọc được checklist bốn mục |
| 2 | `git switch -c feature/DEMO-6-shipping-fee origin/develop`, `git push -u` | Nhánh có trên GitHub |
| 3 | `transitionJiraIssue` `Start`, rồi `editJiraIssue` trường Agent | `jira-guard` cho qua (`wip-available`, `dependencies-merged`, `branch-created`). Ready → In Progress lúc 13:56:06; Agent là Frontend Developer lúc 13:56:11. Cả hai do `orchestratoragent` |
| 4 | Viết test trước, chạy `npm test` | Đỏ vì `cart.ts` chưa export `shipping`. Sau khi thêm `shipping(lines)` thì xanh, 5/5 |
| 5 | `npm run lint`, `typecheck`, `test:coverage`, `build` | Đều qua; `cart.ts` phủ 100% |
| 6 | `git commit`, `git push` | Hook `pre-commit` chạy eslint; commit `5757ddd` |
| 7 | `node .ai-orchestrator/scripts/ao-pr.mjs create --base develop ...` | `opened #4`. [PR #4](https://github.com/TungPH7/ao-pilot/pull/4) có tác giả `tungph7-ao-dev[bot]` (loại Bot). Đây là phần còn lại của tiêu chí 6: agent chạy được `ao-pr.mjs create` |

Mô tả PR có đủ sáu mục của mẫu. Bảng Acceptance Criteria Coverage có một dòng cho mỗi mục checklist; dòng của mục 4 ghi "Not in this PR". Lời nhắc của Claude cố ý để lại mục 4, để `reviewer` có lý do thật mà yêu cầu sửa.

**Phát hiện: agent tự thêm dòng ghi công AI vào commit.** Lệnh commit của agent có thêm `-m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`, dù lời nhắc không yêu cầu. Theo mặc định, Claude Code dặn agent ghi dòng này. Repo của bạn không được có ghi công AI, nên có ba việc:

- `kit/.claude/settings.json` có thêm `"attribution": { "commit": "", "pr": "" }`. Với setting này, Claude Code không thêm ghi công AI vào commit và PR. Một test giữ setting này.
- `ao-pilot` nhận setting qua `.claude/settings.local.json` (git bỏ qua file này) cho tới lần chép kit sau, vì `.claude/` là đường dẫn được bảo vệ.
- Claude viết lại commit của agent, bỏ dòng đó: `5757ddd` thành `50741da` (force push lên nhánh feature, không phải nhánh được bảo vệ). Khi squash, `merge-gate` chỉ lấy header của từng commit, nên dòng đó vốn không vào `develop`. Nhưng nó vẫn hiện trong danh sách commit của PR trên GitHub.

**Các run của PR #4:**

| Run | Kết quả |
|---|---|
| `CI` pull_request trên `5757ddd`, [run 40832385692](https://github.com/TungPH7/ao-pilot/actions/runs/40832385692) | Xanh |
| `jira-sync` pull_request ([40832385753](https://github.com/TungPH7/ao-pilot/actions/runs/40832385753)) | `Waiting DEMO-6: Submit needs ci-green` |
| `jira-sync` workflow_run sau `CI` ([40832421439](https://github.com/TungPH7/ao-pilot/actions/runs/40832421439)) | `Made DEMO-6: Submit (in-progress → in-review)`. Trên Jira: In Progress → In Review lúc 13:58:21, do `orchestratorci` |
| `merge-gate` sau hai lần `jira-sync` ([40832415592](https://github.com/TungPH7/ao-pilot/actions/runs/40832415592), [40832462437](https://github.com/TungPH7/ao-pilot/actions/runs/40832462437)) | `Waiting #4: reviewer report on head 5757ddd; security report on head 5757ddd; approval on head 5757ddd` |
| `CI` trên `50741da`, sau force push ([40832761260](https://github.com/TungPH7/ao-pilot/actions/runs/40832761260)) | Xanh, 4 phút tính tiền |
| `jira-sync` pull_request và workflow_run ([40832761225](https://github.com/TungPH7/ao-pilot/actions/runs/40832761225), [40832797714](https://github.com/TungPH7/ao-pilot/actions/runs/40832797714)) | `No change`: item ở lại In Review |
| `merge-gate` ([40832792552](https://github.com/TungPH7/ao-pilot/actions/runs/40832792552), [40832828215](https://github.com/TungPH7/ao-pilot/actions/runs/40832828215)) | `Waiting #4: reviewer report on head 50741da; security report on head 50741da; approval on head 50741da` |

**Lượt chạy của `reviewer` (14:02:42 → 14:03:42).** Lệnh là `claude -p --agent reviewer --model sonnet`, với:

- `--allowedTools "Bash(gh pr view:*)" "Bash(gh pr diff:*)" "Bash(gh pr checks:*)"`, ba lệnh `git` chỉ đọc (`log`, `show`, `diff`), `ao-pr.mjs`, Read, Write, Glob, Grep và `getJiraIssue`.
- `--add-dir` tới bản sao của `templates/review-report.md`.
- Lời nhắc ghi rằng một mục checklist chưa đạt là finding High, đúng định nghĩa High của mẫu: phải sửa trước khi merge.

Với `gh` 2.16 của máy bạn, lệnh `gh pr view <n>` không kèm `--json` lỗi, vì GitHub đã tắt Projects (classic). Lời nhắc vì vậy dùng `gh pr view <n> --json ...`; `agent-roster` cần ghi điều này, hoặc yêu cầu `gh` mới hơn.

Agent chạy 9 lượt, tốn khoảng 0,15 USD, và không bị hook nào chặn. Agent đọc PR, diff, check và `DEMO-6`, viết báo cáo theo mẫu với dòng `Role: reviewer`, rồi chạy `ao-pr.mjs review 4 --event REQUEST_CHANGES`. Lệnh trả `posted the reviewer report (REQUEST_CHANGES) on #4 at 50741da`. Báo cáo có hai finding:

- **High** (Correctness): mục 4 của checklist chưa làm. Giỏ có `price` âm hoặc `quantity` là `1.5` hay `NaN` vẫn được chấp nhận mà không báo lỗi.
- **Low**: chưa có test cho giỏ không rỗng mà tổng bằng 0.

Review trên GitHub do `tungph7-ao-review[bot]` (loại Bot) đăng, trạng thái `CHANGES_REQUESTED`, trên commit `50741da`, lúc 14:03:33.

| Run sau review | Kết quả |
|---|---|
| `jira-sync` pull_request_review ([40832998737](https://github.com/TungPH7/ao-pilot/actions/runs/40832998737)) | `Made DEMO-6: Request changes (in-review → in-progress)`. Trên Jira: In Review → In Progress lúc 14:03:49, do `orchestratorci`. Rework count là 1, dưới giới hạn 3, nên không gắn cờ |
| `merge-gate` ([40833032071](https://github.com/TungPH7/ao-pilot/actions/runs/40833032071)) | `Waiting #4: reviewer report on head 50741da without Critical or High findings (1 open); security report on head 50741da; answer to the changes requested on head 50741da; approval on head 50741da` |

Lịch sử `DEMO-6`, đọc qua REST bằng token CI:

```
2026-10-29 13:45:10  bạn                status: New -> Ready
2026-10-29 13:56:06  orchestratoragent  status: Ready -> In Progress
2026-10-29 13:56:11  orchestratoragent  Agent: - -> Frontend Developer
2026-10-29 13:58:21  orchestratorci     status: In Progress -> In Review
2026-10-29 14:03:49  orchestratorci     status: In Review -> In Progress
```

`merge-gate` đã chạy qua cả hai đường: sau `jira-sync` của một lần `CI` (run 40832462437), và sau `jira-sync` của một review (run 40833032071).

Tiêu chí 5 và 6 của spec mục 9 đạt. PR #4 để mở cho T19.

## T19: `merge-gate` merge sau khi bạn approve, item sang Ready for QA (tiêu chí 7, 8, 10, 12)

**Vòng sửa của PR #4 (14:09–14:25).**

Lượt chạy thứ hai của `fe-dev` (14:09:52 → 14:11:29, 19 lượt, khoảng 0,17 USD):

- Agent đọc review bằng `gh pr view 4 --json reviews`, rồi chỉ sửa finding High.
- Test viết trước: 12 test mới cho mục 4 đỏ. Sau khi `total` kiểm `quantity` và `price`, 18/18 test xanh. Lint, typecheck, coverage (100%) và build đều qua.
- Agent commit và push `7e66a58`. Commit này không có dòng `Co-Authored-By`, nên setting `attribution` đã có tác dụng.
- Agent cập nhật mô tả PR bằng `ao-pr.mjs edit 4`, lệnh in `edited #4`.

Trong lượt này, agent thử sửa file mô tả bằng một đoạn `python`. Máy không có Python nên đoạn đó không chạy, và agent dùng Edit thay thế. Agent cũng tự nêu rằng mục Risks không còn đúng, vì `total` giờ ném lỗi. Lượt thứ ba (4 lượt, khoảng 0,04 USD) sửa câu đó, rồi chạy `ao-pr.mjs edit 4`.

**Phát hiện: `--allowedTools` không phải lớp chặn ở máy bạn.** Sự kiện `init` của mọi lượt `claude -p` báo `permissionMode: auto`, theo `defaultMode` trong `~/.claude/settings.json` của bạn. Ở chế độ này, bộ phân loại của Claude Code vẫn cho chạy các lệnh nằm ngoài `--allowedTools`:

- `fe-dev` chạy `python`.
- `reviewer` chạy `cat`, `git fetch`, `git ls-files` và `git ls-tree`.

Các lớp chặn thật là:

- Các hook. Hook trả `deny` thì lệnh bị chặn ở mọi chế độ quyền.
- Các luật phía server: Restrict của Jira, environment `merge-gate`, và hai bước `merge-gate`, `audit`.

`docs/quality-gates.md` (T21) cần ghi điều này. Câu về lớp quyền ở T18 đã được sửa.

| Run | Kết quả |
|---|---|
| `CI` pull_request trên `7e66a58` ([40833765153](https://github.com/TungPH7/ao-pilot/actions/runs/40833765153)) | Xanh, 4 phút tính tiền |
| `jira-sync` pull_request ([40833765142](https://github.com/TungPH7/ao-pilot/actions/runs/40833765142)) | `Waiting DEMO-6: Submit needs ci-green` |
| `jira-sync` workflow_run sau `CI` ([40833806512](https://github.com/TungPH7/ao-pilot/actions/runs/40833806512)) | `Made DEMO-6: Submit (in-progress → in-review)`. Trên Jira: In Progress → In Review lúc 14:11:25. Review yêu cầu sửa nằm trên `50741da`, không phải commit mới nhất, nên không còn kéo item về |
| `merge-gate` ([40833803100](https://github.com/TungPH7/ao-pilot/actions/runs/40833803100), [40833842344](https://github.com/TungPH7/ao-pilot/actions/runs/40833842344)) | `Waiting #4: reviewer report on head 7e66a58; security report on head 7e66a58; approval on head 7e66a58`. Dòng `answer to the changes requested` đã hết |

**Lượt `reviewer` vòng hai (14:23:50 → 14:25:14, 11 lượt, khoảng 0,17 USD).** Lời nhắc giống vòng một, thêm câu nói đây là vòng hai. Agent đăng báo cáo COMMENT trên `7e66a58` lúc 14:25:03: `posted the reviewer report (COMMENT) on #4 at 7e66a58`. Mục 4 đạt, nên finding High của vòng một đã xử lý. Còn hai finding:

- **Medium:** `price` là `NaN` hoặc `Infinity` không bị chặn, nên giỏ có dữ liệu sai được miễn phí vận chuyển. Checklist chỉ nói giá âm, nên agent đề nghị làm sau.
- **Low:** chưa có test cho `quantity` là `Infinity`; nên tách phần kiểm tra ra một hàm riêng.

| Run | Kết quả |
|---|---|
| `jira-sync` pull_request_review ([40835292796](https://github.com/TungPH7/ao-pilot/actions/runs/40835292796)) | `No change` |
| `merge-gate` ([40835328117](https://github.com/TungPH7/ao-pilot/actions/runs/40835328117)) | `Waiting #4: security report on head 7e66a58; approval on head 7e66a58` |

**Tiêu chí 10, xác nhận lại với secret thật (14:27): đạt.** Ở T3, job thử khai environment mà không có `deployment: false`. Job `merge-gate` thật thì khai `deployment: false`, nên lần thử này dùng đúng cấu hình đó.

- Claude push nhánh `probe/t19-env` từ `develop`, với workflow `probe-env`. Job của workflow khai `environment: { name: merge-gate, deployment: false }` và chỉ in độ dài của `secrets.AO_DEV_APP_KEY`.
- [Run 40835599131](https://github.com/TungPH7/ao-pilot/actions/runs/40835599131) đỏ, và job không chạy bước nào. Lý do GitHub ghi: `Branch "probe/t19-env" is not allowed to deploy to merge-gate due to environment protection rules.`
- Không deployment nào được tạo, và `jira-sync` không chạy.

Vậy giới hạn nhánh `main` của environment vẫn có hiệu lực khi có `deployment: false`, và secret không lộ cho nhánh khác. Nhánh probe đã xóa trên GitHub và ở máy. Phần còn lại của tiêu chí 10 (`merge-gate` trên `main` dùng được key để merge) sẽ thấy ở lần merge thật.

**Approve trên commit cũ (tiêu chí 8, phần một): đạt.**

Bạn approve PR #4 trên `7e66a58` lúc 15:53:01, khi `security` chưa đăng báo cáo.

| Run | Kết quả |
|---|---|
| `jira-sync` pull_request_review ([40845368376](https://github.com/TungPH7/ao-pilot/actions/runs/40845368376)) | `Waiting DEMO-6: Deploy to QA needs pr-merged, qa-deployed`, `No change` |
| `merge-gate` ([40845406972](https://github.com/TungPH7/ao-pilot/actions/runs/40845406972)) | `Waiting #4: security report on head 7e66a58`. Approve của bạn đã được tính; chỉ còn thiếu báo cáo của `security` |

Lượt `fe-dev` thứ tư (15:57:18 → 15:59:38, 22 lượt, khoảng 0,27 USD) sửa finding Medium của vòng review thứ hai:

- Test viết trước: thêm `price` là `NaN`, `Infinity` và `-Infinity` vào bảng dòng xấu, cho cả `total` và `shipping`. 4 trên 24 test đỏ (`NaN` và `Infinity`; `-Infinity` đã bị chặn vì nhỏ hơn 0).
- Điều kiện đổi thành `!Number.isFinite(line.price) || line.price < 0`, thông điệp lỗi và comment đổi theo. 24/24 test xanh; lint, typecheck, coverage (100%) và build đều qua.
- Agent commit và push `8924767` (`fix(cart): reject a price that is not a finite number (DEMO-6)`), không có dòng `Co-Authored-By`. `ao-pr.mjs edit 4` in `edited #4`. Lần này agent tự sửa cả mục Risks, vì lời nhắc dặn đọc lại mọi câu.

| Run | Kết quả |
|---|---|
| `CI` pull_request trên `8924767` ([40846066800](https://github.com/TungPH7/ao-pilot/actions/runs/40846066800)) | Xanh, 4 phút tính tiền |
| `jira-sync` pull_request ([40846066685](https://github.com/TungPH7/ao-pilot/actions/runs/40846066685)) và workflow_run sau `CI` ([40846113745](https://github.com/TungPH7/ao-pilot/actions/runs/40846113745)) | `Waiting DEMO-6: Deploy to QA needs pr-merged, qa-deployed`, `No change`. Item vẫn In Review |
| `merge-gate` sau hai lần `jira-sync` ([40846105099](https://github.com/TungPH7/ao-pilot/actions/runs/40846105099), [40846144882](https://github.com/TungPH7/ao-pilot/actions/runs/40846144882)) | `Waiting #4: reviewer report on head 8924767; security report on head 8924767; approval on head 8924767` |

Vậy approve trên commit cũ không còn được tính, và hai báo cáo trên commit cũ cũng vậy.

Guard `merge-approved` của `jira-sync` thì tính lần quyết định mới nhất của bạn trên bất kỳ commit nào (thiết kế của `tracker-integration`), nên dòng `Waiting` của `jira-sync` không nhắc tới approve. Điều kiện approve trên commit mới nhất thuộc về `merge-gate` và `audit`. Item chỉ sang Ready for QA khi đã merge và deploy, nên chỗ khác nhau này không cho item đi sớm.

`merge-gate` chạy được qua cả hai đường: sau một review (`jira-sync` pull_request_review, rồi `merge-gate`), và sau khi `CI` xong (`CI`, rồi `jira-sync` workflow_run, rồi `merge-gate`). Chuỗi thứ hai có hai tầng `workflow_run`, dưới giới hạn ba tầng của GitHub.

**PR của agent có sửa `.github/workflows/` (tiêu chí 8, phần hai).**

Chuẩn bị:

- Claude tạo `DEMO-7` (Task, "quality-gates T19: PR của devops sửa workflow") bằng token CI. Checklist: bốn job của `ci.yml` có `timeout-minutes: 15`, và `CI` vẫn xanh. Item để nguyên ở New, vì bài thử chỉ cần PR.
- Claude thêm agent thử `devops` vào `.claude/agents/devops.md` của `ao-pilot`, chỉ ở máy: file nằm trong `.git/info/exclude`, không commit, vì `.claude/**` là đường dẫn được bảo vệ.

Lượt `devops` (16:00:53 → 16:02:21, 12 lượt, khoảng 0,15 USD):

- Agent đọc `DEMO-7`, cắt nhánh `feature/DEMO-7-ci-job-timeout` từ `develop`, rồi thêm `timeout-minutes: 15` vào bốn job của `.github/workflows/ci.yml` bằng Edit. `gh-guard` cho qua, vì `devops` có trong `editors` của `.github/workflows/**`.
- Agent commit và push `a8e842e` (`ci(workflows): stop a hung CI job after 15 minutes (DEMO-7)`), rồi mở [PR #5](https://github.com/TungPH7/ao-pilot/pull/5) bằng `ao-pr.mjs create`: `opened #5`. Tác giả PR là `tungph7-ao-dev[bot]`.

| Run | Kết quả |
|---|---|
| `CI` pull_request trên `a8e842e` ([40846495849](https://github.com/TungPH7/ao-pilot/actions/runs/40846495849)) | Xanh, 4 phút tính tiền |
| `jira-sync` pull_request ([40846496008](https://github.com/TungPH7/ao-pilot/actions/runs/40846496008)) và workflow_run ([40846543496](https://github.com/TungPH7/ao-pilot/actions/runs/40846543496)) | `No change`: `DEMO-7` ở New, không có bước chuyển nào của automation |
| `merge-gate` ([40846537154](https://github.com/TungPH7/ao-pilot/actions/runs/40846537154), [40846583820](https://github.com/TungPH7/ao-pilot/actions/runs/40846583820)) | `Needs you #5: it changes .github/workflows/ci.yml, so read the diff and merge it yourself (still missing: reviewer report on head a8e842e; security report on head a8e842e; approval on head a8e842e)` |

**Lượt `reviewer` trên cả hai PR (16:03:47 → 16:06:53, 25 lượt, khoảng 0,39 USD).** Agent đăng hai báo cáo COMMENT, không có finding Critical hay High:

- PR #4, vòng ba, trên `8924767` lúc 16:05:55: `posted the reviewer report (COMMENT) on #4 at 8924767`. Bốn mục checklist đạt, và finding Medium của vòng hai đã đóng. Còn hai finding Low từ vòng hai: chưa có test cho `quantity` là `Infinity`, và phần kiểm tra nằm trong callback của `reduce`. Báo cáo cũng nêu rằng approve của bạn cũ hơn commit `8924767`.
- PR #5, vòng một, trên `a8e842e` lúc 16:06:42: `posted the reviewer report (COMMENT) on #5 at a8e842e`. Hai mục checklist đạt. Có một finding Low: bốn workflow còn lại chưa có `timeout-minutes`, nằm ngoài phạm vi `DEMO-7`. Báo cáo nêu PR sửa `.github/workflows/`, nên merge hay đóng là việc của bạn.

| Run | Kết quả |
|---|---|
| `jira-sync` pull_request_review của #4 ([40846975239](https://github.com/TungPH7/ao-pilot/actions/runs/40846975239)) | `Waiting DEMO-6: Deploy to QA needs pr-merged, qa-deployed`, `No change` |
| `merge-gate` ([40847013946](https://github.com/TungPH7/ao-pilot/actions/runs/40847013946)) | `Waiting #4: security report on head 8924767; approval on head 8924767` |
| `jira-sync` pull_request_review của #5 ([40847074667](https://github.com/TungPH7/ao-pilot/actions/runs/40847074667)) | `No change` |
| `merge-gate` ([40847118169](https://github.com/TungPH7/ao-pilot/actions/runs/40847118169)) | `Needs you #5: ... (still missing: security report on head a8e842e; approval on head a8e842e)` |

**Lượt `security` trên cả hai PR (16:06:53 → 16:11:59, 28 lượt, khoảng 0,62 USD).** Trong lúc agent chạy, Claude Code dừng lệnh nền chứa lượt này, vì máy thiếu RAM (còn khoảng 690 MB trống trên 16 GB). Tiến trình `claude` của agent không bị dừng theo và chạy hết. Claude chỉ chờ nó xong, không chạy lại. Agent đăng hai báo cáo COMMENT, không có finding Critical hay High:

- PR #4 trên `8924767` lúc 16:11:33: `posted the security report (COMMENT) on #4 at 8924767`.
  - Một finding Medium: `quantity` và `price` không có giới hạn trên. Dòng `{ price: 1e308, quantity: 10 }` qua được kiểm tra, `total` trả `Infinity` và `shipping` trả 0.
  - Bốn finding Low, trong đó có: thông điệp lỗi in lại giá trị đầu vào, và một dòng `null` gây `TypeError` thay vì `RangeError`.
- PR #5 trên `a8e842e` lúc 16:11:39: `posted the security report (COMMENT) on #5 at a8e842e`.
  - Diff chỉ có bốn dòng thêm. Quyền, secret, action và trigger của `ci.yml` không đổi.
  - Một finding Low có sẵn trong file, không thuộc diff: các bước `actions/checkout` chưa đặt `persist-credentials: false`.

Agent còn đọc thêm bằng `gh api` (chỉ GET) và chạy hai lệnh `node -e` về hành vi chuẩn của JavaScript. Cả hai đều nằm ngoài `--allowedTools`, đúng như phát hiện về chế độ quyền `auto` ở trên.

| Run | Kết quả |
|---|---|
| `jira-sync` pull_request_review của #4 ([40847708920](https://github.com/TungPH7/ao-pilot/actions/runs/40847708920)) và #5 ([40847722705](https://github.com/TungPH7/ao-pilot/actions/runs/40847722705)) | `DEMO-6`: `Waiting DEMO-6: Deploy to QA needs pr-merged, qa-deployed`, `No change`. `DEMO-7`: `No change` |
| `merge-gate` ([40847751562](https://github.com/TungPH7/ao-pilot/actions/runs/40847751562), [40847763722](https://github.com/TungPH7/ao-pilot/actions/runs/40847763722)) | `Waiting #4: approval on head 8924767` và `Needs you #5: it changes .github/workflows/ci.yml, so read the diff and merge it yourself (still missing: approval on head a8e842e)` |

**Approve lần hai, merge và deploy (tiêu chí 7, 8 và 10): đạt.**

Bạn approve PR #4 trên `8924767` lúc 16:21:24, và PR #5 trên `a8e842e` lúc 16:21:31.

| Run | Kết quả |
|---|---|
| `jira-sync` pull_request_review của #4 ([40848987044](https://github.com/TungPH7/ao-pilot/actions/runs/40848987044)) | `Waiting DEMO-6: Deploy to QA needs pr-merged, qa-deployed`, `No change` |
| `jira-sync` pull_request_review của #5 ([40849002456](https://github.com/TungPH7/ao-pilot/actions/runs/40849002456)) | `No change` |
| `merge-gate` ([40849032590](https://github.com/TungPH7/ao-pilot/actions/runs/40849032590)) | `Merged #4: feat(cart): add the shipping fee of a cart (DEMO-6) (squash at 8924767)` và `Needs you #5: it changes .github/workflows/ci.yml, so read the diff and merge it yourself` |
| `merge-gate` ([40849043431](https://github.com/TungPH7/ao-pilot/actions/runs/40849043431)) | `Needs you #5: it changes .github/workflows/ci.yml, so read the diff and merge it yourself` |

- PR #4 được merge lúc 16:22:04, và `merged_by` là `tungph7-ao-dev[bot]`. Commit squash `9f17f6d` trên `develop` có tác giả `tungph7-ao-dev[bot]`. Tiêu đề của nó là tiêu đề PR, và phần thân là header của ba commit:

  ```text
  - feat(cart): add the shipping fee of a cart (DEMO-6)
  - feat(cart): reject a line with a bad quantity or price (DEMO-6)
  - fix(cart): reject a price that is not a finite number (DEMO-6)
  ```

- Key trong environment `merge-gate` dùng được để merge từ `main`, nên phần còn lại của tiêu chí 10 đạt.
- Với PR #5, dòng `Needs you` không còn phần `still missing`: PR đã có `CI` xanh, đủ hai báo cáo và approve của bạn, nhưng `merge-gate` vẫn không merge. Tiêu chí 8 đạt cả hai phần.

Sau merge:

| Run | Kết quả |
|---|---|
| `CI` push trên `develop` ([40849074485](https://github.com/TungPH7/ao-pilot/actions/runs/40849074485)) | Xanh |
| `Deploy` push trên `develop` ([40849074468](https://github.com/TungPH7/ao-pilot/actions/runs/40849074468)) | Job `audit`: `audit passed: 9f17f6d on develop is the merge of PR #4, which met every gate`. Job `deploy` chạy và tạo deployment `development` cho `9f17f6d` |
| `jira-sync` deployment_status ([40849119366](https://github.com/TungPH7/ao-pilot/actions/runs/40849119366)) | `deployment_status: no work item of DEMO`. Đây là trạng thái chưa phải `success`, và `jira-sync` bỏ qua trạng thái đó |
| `jira-sync` deployment_status ([40849127330](https://github.com/TungPH7/ao-pilot/actions/runs/40849127330)) | `Made DEMO-6: Deploy to QA (in-review → ready-for-qa)`. Dòng `Waiting DEMO-3: Deploy to QA needs merge-approved` là của item thử cũ của `tracker-integration`: PR của nó được merge khi chưa có approve, nên nó vẫn ở In Review |
| `jira-sync` workflow_run sau `CI` ([40849126674](https://github.com/TungPH7/ao-pilot/actions/runs/40849126674)) | `workflow_run: no work item of DEMO` |
| `merge-gate` ([40849148431](https://github.com/TungPH7/ao-pilot/actions/runs/40849148431), [40849176610](https://github.com/TungPH7/ao-pilot/actions/runs/40849176610)) | `Needs you #5: it changes .github/workflows/ci.yml, so read the diff and merge it yourself`. Lần chạy [40849160806](https://github.com/TungPH7/ao-pilot/actions/runs/40849160806) bị hủy khi còn chờ, vì một lần chạy mới hơn xếp sau nó (`concurrency` của `merge-gate`) |

Trên Jira, `DEMO-6` chuyển In Review → Ready for QA lúc 16:22:48, bằng `orchestratorci`. Tiêu chí 7 đạt.

Dọn sau bài thử:

- Claude đóng PR #5 mà không merge, kèm một bình luận nói rõ lý do. Nhánh `feature/DEMO-7-ci-job-timeout` được giữ lại, như nhánh của các bài thử trước.
- `DEMO-7` vẫn ở New. Bạn có thể Cancel nó khi xem lại ở Checkpoint 4.
- Claude xóa agent `devops` ở máy, và bỏ dòng của nó khỏi `.git/info/exclude`. Bản `ao-pilot` ở máy về `develop` (`9f17f6d`).

**Số phút Actions của vòng PR #4 (tiêu chí 12): đã đo.** Claude đọc mọi lần chạy từ lúc PR #4 mở (13:57:38) tới lần chạy cuối cùng sau deploy (16:22:54). Mỗi job được tính như GitHub tính cho repo private: làm tròn lên một phút. Job bị bỏ qua, hoặc không nhận được runner, thì không tính.

| Phần | Số lần chạy | Phút |
|---|---|---|
| `CI`: bốn lần push lên PR, một lần push lên `develop` | 5 | 20 |
| `jira-sync` | 17 | 17 |
| `merge-gate` | 17, một lần bị hủy nên không tính | 16 |
| `Deploy`: `audit` và `deploy` | 1 | 2 |
| **Tổng của PR #4** | **40** | **55** |

Bảng không tính PR #5 (11 lần chạy, 14 phút) và nhánh probe của tiêu chí 10 (0 phút).

Chi phí theo từng sự kiện:

- Mỗi lần push lên PR tốn 8 phút: `CI` 4 phút, rồi `jira-sync` và `merge-gate`, mỗi workflow chạy hai lần.
- Mỗi báo cáo review, hay mỗi lần bạn approve, tốn 2 phút: `jira-sync` và `merge-gate`, mỗi workflow một lần.
- Merge và deploy tốn 11 phút: `CI` 4, `Deploy` 2, `jira-sync` ba lần, `merge-gate` hai lần.

PR #4 có bốn lần push (mở PR, ghi lại commit để bỏ dòng ghi công, hai lần sửa), sáu lần review hoặc approve, và một lần merge: 4 × 8 + 6 × 2 + 11 = 55.

Một vòng chuẩn gồm: mở PR, sửa một lần, `reviewer` và `security` báo cáo ở cả hai vòng, bạn approve một lần, rồi merge và deploy. Vòng đó tốn 2 × 8 + 5 × 2 + 11 = 37 phút. Gói Free có 2.000 phút mỗi tháng cho repo private, đủ cho khoảng 54 vòng như vậy.

`jira-sync` và `merge-gate` chiếm 33 trên 55 phút. Mỗi lần chạy chỉ mất khoảng 10 đến 20 giây, nhưng vẫn bị tính tròn một phút, và `merge-gate` chạy sau mọi lần `jira-sync`. `docs/quality-gates.md` (T21) cần ghi con số này.

Tiêu chí 7, 8, 10 và 12 của spec mục 9 đạt. T19 đóng.

## T20: `audit` chặn commit merge tay (tiêu chí 9)

**Chuẩn bị (16:30–16:35).**

- Claude tạo `DEMO-8` (Task, "quality-gates T20: test cho quantity là Infinity") bằng token CI, và để nó ở New. Việc của item là finding Low của `reviewer` ở PR #4.
- Lượt `fe-dev` (16:31:42 → 16:33:59, 16 lượt, khoảng 0,21 USD):
  - Agent cắt nhánh `feature/DEMO-8-infinity-quantity-test` từ `develop`, rồi thêm dòng `quantity` là `Infinity` vào bảng dòng xấu của `src/cart.test.ts`.
  - 26/26 test xanh. Hai test mới qua ngay, vì `total` đã từ chối giá trị này. Lint, typecheck, coverage (100%) và build đều qua.
  - Agent commit và push `451523d` (`test(cart): cover a quantity of Infinity (DEMO-8)`), rồi mở [PR #6](https://github.com/TungPH7/ao-pilot/pull/6) bằng `ao-pr.mjs create`.

| Run | Kết quả |
|---|---|
| `CI` pull_request trên `451523d` ([40850608988](https://github.com/TungPH7/ao-pilot/actions/runs/40850608988)) | Xanh, 4 phút tính tiền |
| `jira-sync` pull_request ([40850608881](https://github.com/TungPH7/ao-pilot/actions/runs/40850608881)) và workflow_run ([40850658943](https://github.com/TungPH7/ao-pilot/actions/runs/40850658943)) | `No change`: `DEMO-8` ở New |
| `merge-gate` ([40850652835](https://github.com/TungPH7/ao-pilot/actions/runs/40850652835), [40850693564](https://github.com/TungPH7/ao-pilot/actions/runs/40850693564)) | `Waiting #6: reviewer report on head 451523d; security report on head 451523d; approval on head 451523d` |

PR #6 chưa có báo cáo nào và chưa có approve, nên `merge-gate` không merge.

**Bạn merge tay PR #6 (tiêu chí 9): đạt.**

Ở lần báo đầu (16:44), PR #6 vẫn mở và `develop` không đổi. GitHub báo PR merge được (`mergeable_state: clean`), nên có lẽ bước Confirm chưa được bấm. Ở lần thứ hai, bạn merge lúc 16:47:01. `merged_by` là `TungPH7`, và commit squash `2e16d25` (`test(cart): cover a quantity of Infinity (DEMO-8) (#6)`) nằm trên `develop`. PR không có review nào.

| Run | Kết quả |
|---|---|
| `Deploy` push trên `develop` ([40852338720](https://github.com/TungPH7/ao-pilot/actions/runs/40852338720)) | Đỏ. Job `audit` in `audit failed: 2e16d25 on develop`, `- PR #6 was merged without: reviewer report on head 451523d; security report on head 451523d; approval on head 451523d` và `Flagged DEMO-8`. Job `deploy` bị bỏ qua (skipped) |
| `CI` push trên `develop` ([40852338759](https://github.com/TungPH7/ao-pilot/actions/runs/40852338759)) | Xanh |
| `jira-sync` workflow_run sau `CI` ([40852391812](https://github.com/TungPH7/ao-pilot/actions/runs/40852391812)) | `workflow_run: no work item of DEMO` |
| `merge-gate` ([40852424250](https://github.com/TungPH7/ao-pilot/actions/runs/40852424250)) | `No open PR` |

- Không có deployment nào cho `2e16d25`. Deployment mới nhất của `development` vẫn là `9f17f6d`.
- Script `audit` cũng ghi các dòng trên vào job summary (`### Audit`). REST API không đọc được job summary, nên phần đó xem trên trang của run.
- Trên Jira, lúc 16:47:17, `orchestratorci` đặt Flagged của `DEMO-8` là Impediment và thêm nhãn `needs-you`. Lúc 16:47:19, tài khoản này bình luận: `audit: 2e16d25 on develop was not deployed. PR #6 was merged without: reviewer report on head 451523d; security report on head 451523d; approval on head 451523d. It is flagged with the label needs-you and waits for you.`

Tiêu chí 9 đạt.

**PR revert qua đủ cổng.**

Lượt `fe-dev` (16:49:42 → 16:51:05, 10 lượt, khoảng 0,12 USD):

- Agent cắt nhánh `feature/DEMO-8-revert-unapproved-merge` từ `develop`, rồi chạy `git revert --no-edit 2e16d25`. Commit `6eb5c4e` có header `Revert "..."` do git viết, và hook `commit-msg` chấp nhận header này.
- Test, lint, typecheck, coverage và build đều qua. Agent push, rồi mở [PR #7](https://github.com/TungPH7/ao-pilot/pull/7) `revert(cart): undo the unapproved merge of PR #6 (DEMO-8)` bằng `ao-pr.mjs create`.

Lời nhắc của `reviewer` và `security` nói PR #7 là một revert: nó phải gỡ đúng `2e16d25` và không gì khác. Checklist của `DEMO-8` không phải điều PR này cần đạt.

- `reviewer` (16:52:11 → 16:53:29, 12 lượt, khoảng 0,14 USD) đăng báo cáo COMMENT trên `6eb5c4e` lúc 16:53:18. Agent so cây thư mục của PR với cây của `2e16d25~1`, và thấy giống hệt. Có một finding Low: sau revert, `develop` lại không có test cho `quantity` là `Infinity`.
- `security` (16:53:36 → 16:55:35, 15 lượt, khoảng 0,21 USD) đăng báo cáo COMMENT lúc 16:55:23, với cùng một finding Low.

| Run | Kết quả |
|---|---|
| `CI` pull_request trên `6eb5c4e` ([40852845441](https://github.com/TungPH7/ao-pilot/actions/runs/40852845441)) | Xanh, 4 phút tính tiền |
| `jira-sync` pull_request ([40852845460](https://github.com/TungPH7/ao-pilot/actions/runs/40852845460)), workflow_run ([40852891507](https://github.com/TungPH7/ao-pilot/actions/runs/40852891507)), hai pull_request_review ([40853154881](https://github.com/TungPH7/ao-pilot/actions/runs/40853154881), [40853426591](https://github.com/TungPH7/ao-pilot/actions/runs/40853426591)) | `No change`: `DEMO-8` ở New |
| `merge-gate` ([40852939894](https://github.com/TungPH7/ao-pilot/actions/runs/40852939894), [40853192413](https://github.com/TungPH7/ao-pilot/actions/runs/40853192413), [40853472127](https://github.com/TungPH7/ao-pilot/actions/runs/40853472127)) | Từ `Waiting #7: reviewer report on head 6eb5c4e; security report on head 6eb5c4e; approval on head 6eb5c4e` tới `Waiting #7: approval on head 6eb5c4e` |

**Approve PR revert, merge và deploy: đạt.**

Bạn approve PR #7 trên `6eb5c4e` lúc 17:07:20.

| Run | Kết quả |
|---|---|
| `jira-sync` pull_request_review ([40855012227](https://github.com/TungPH7/ao-pilot/actions/runs/40855012227)) | `No change` |
| `merge-gate` ([40855058493](https://github.com/TungPH7/ao-pilot/actions/runs/40855058493)) | `Merged #7: revert(cart): undo the unapproved merge of PR #6 (DEMO-8) (squash at 6eb5c4e)` |
| `Deploy` push trên `develop` ([40855101441](https://github.com/TungPH7/ao-pilot/actions/runs/40855101441)) | Job `audit` in `audit passed: 0e55963 on develop is the merge of PR #7, which met every gate`. Job `deploy` chạy và tạo deployment `development` cho `0e55963` |
| `CI` push trên `develop` ([40855101410](https://github.com/TungPH7/ao-pilot/actions/runs/40855101410)) | Xanh |
| `jira-sync` workflow_run ([40855148788](https://github.com/TungPH7/ao-pilot/actions/runs/40855148788)) và deployment_status ([40855154007](https://github.com/TungPH7/ao-pilot/actions/runs/40855154007), [40855162716](https://github.com/TungPH7/ao-pilot/actions/runs/40855162716)) | `no work item of DEMO` và `Waiting DEMO-3: Deploy to QA needs merge-approved`. `DEMO-8` ở New, nên không có bước chuyển nào |
| `merge-gate` ([40855181306](https://github.com/TungPH7/ao-pilot/actions/runs/40855181306), [40855211388](https://github.com/TungPH7/ao-pilot/actions/runs/40855211388)) | `No open PR`. Lần chạy [40855184242](https://github.com/TungPH7/ao-pilot/actions/runs/40855184242) bị hủy khi còn chờ |

- PR #7 được merge lúc 17:07:58, 38 giây sau khi bạn approve. `merged_by` là `tungph7-ao-dev[bot]`, và commit squash là `0e55963`.
- Cây thư mục của `develop` (`0e55963`) giống hệt cây của `9f17f6d`, nên `develop` đã sạch trở lại.
- Lúc 17:12:21, Claude gỡ cờ Impediment và nhãn `needs-you` của `DEMO-8` bằng token CI. Bình luận kèm theo: `Flag removed after the cleanup of quality-gates T20: PR #7 reverted 2e16d25 through every gate, and the audit passed for 0e55963 on develop. develop again holds only commits that came through the gates.`
- Bản `ao-pilot` ở máy về `develop` (`0e55963`).
- `DEMO-5` vẫn mang cờ từ T18: commit cài kit `2830053` được push thẳng lên `develop`, nên `audit` chặn deploy của nó, đúng thiết kế.

Tiêu chí 9 của spec mục 9 đạt. T20 đóng.

## Checkpoint 4: lên `gh` 2.103.3 và vá `gh-guard`

Ở Checkpoint 4, bạn hỏi về bản `gh` trên máy: 2.16.1, ra ngày 2022-09-26. Các lần kiểm từ T13 tới T20 đều chạy với bản này. Bản mới nhất là 2.103.3, ra ngày 2026-10-26.

**Lý do cập nhật:**

- 9 security advisory đã công bố ảnh hưởng tới 2.16.1. Advisory mức cao duy nhất trong số đó nằm ở Codespaces, mà kit không dùng. Bản 2.102.0 trở lên vá hết.
- `gh pr view <n>` không kèm `--json` lỗi trên 2.16, vì GitHub đã tắt Projects (classic). Bản 2.73.0 sửa lỗi này.
- Token của `gh` nằm trong `%AppData%\GitHub CLI\hosts.yml`, không mã hóa. Từ 2.26.0, `gh auth login` cất token vào keyring của hệ điều hành.

**Vá `gh-guard` trước khi cập nhật ([PR #70](https://github.com/TungPH7/ai-orchestrator-v1/pull/70)):**

- Bản mới có bốn lệnh ghi lên GitHub bằng tài khoản của bạn mà danh sách chặn chưa có: `gh pr revert`, `gh pr update-branch`, `gh repo autolink create` và `delete`, `gh run delete`. PR #70 chặn cả bốn.
- PR #70 cũng vá ba chỗ hở có từ trước:
  - `gh auth status -t` in token của bạn;
  - agent đọc được `hosts.yml` của `gh`;
  - `gh pr -R o/r merge 12` lọt qua hook, vì `-R` đứng trước lệnh con.
- Mục 2.7 của spec ghi các luật mới. Các test mới đỏ khi chưa có bản sửa, và cả bộ 499 test đều xanh.

**Cập nhật và kiểm: đạt.**

| Bước | Kết quả |
|---|---|
| `winget upgrade --id GitHub.cli -e` | `Successfully installed`, bản 2.103.3 |
| `gh config set telemetry disabled`, chạy kèm `GH_TELEMETRY=false` | `gh config get telemetry` trả `disabled`. Từ 2.91.0, `gh` mặc định gửi telemetry, nên đây là lệnh `gh` đầu tiên chạy trên bản mới |
| `gh pr view 7 -R TungPH7/ao-pilot`, không kèm `--json` | In được PR #7: tiêu đề, trạng thái `MERGED`, người review |
| `readGitHubToken` với `env` rỗng | Lấy được token qua `gh auth token`, đúng dạng. Token không được in |
| `gh auth status` | Đăng nhập `TungPH7`, scope `gist`, `read:org`, `repo`, `workflow`. Token vẫn nằm trong `hosts.yml` |
| `npm test` trên `main` (`33600cd`) | 499 test xanh |

Bản chép kit trong `ao-pilot` nhận PR #70 ở lần chép kit tới, qua PR. Trước lần đó, không agent nào chạy trong `ao-pilot`.

**Đăng nhập lại: đạt.** Bạn đăng nhập lại bằng `gh auth login --hostname github.com --git-protocol https --web --scopes workflow`.

| Kiểm | Kết quả |
|---|---|
| `gh auth status` | Đăng nhập `TungPH7`, token nằm trong `keyring` |
| `hosts.yml` | Không còn dòng `oauth_token` |
| Windows Credential Manager | Có mục `gh:github.com:TungPH7` và `gh:github.com:` (chỉ xem tên mục, không xem giá trị) |
| Scope của token | `gist`, `read:org`, `repo`, `workflow`, như trước |
| `readGitHubToken` với `env` rỗng | Lấy được token, đúng dạng |
| Cấu hình git | `credential.helper` vẫn là `manager`, nên git vẫn dùng Git Credential Manager |
| `gh config get telemetry` | `disabled` |

Thu hồi token cũ trên GitHub là bước tùy chọn, và mình không kiểm được bước này từ máy, vì muốn kiểm phải dùng chính token cũ. Sau đó bạn cho biết đã thu hồi token cũ. `gh` vẫn chạy bằng token mới: `gh api user` trả `TungPH7`, và `gh auth status` vẫn báo `keyring`.

## T21: README, tài liệu, `SPEC.md`, lưu trữ plan (tiêu chí 13)

**Đạt (2026-10-29).**

- README có mục "Quality gates": bốn lớp chốt, hai GitHub App, và link tới `docs/quality-gates.md`, `docs/github-apps-setup.md`. Mục "Cài kit vào repo dự án" gộp các bước của `tracker-integration` và `quality-gates`. Bảng biến môi trường có thêm `AO_DEV_APP_KEY`. Mục "Lệnh" có `gh:protect` và các lệnh chạy trong repo dự án.
- `docs/quality-gates.md` mới, gồm:
  - vòng của một PR;
  - từng check của `CI`, cách đọc job summary, và cách xử lý khi một cổng đỏ;
  - khi nào bạn tự merge;
  - environment `merge-gate`, `gh-guard` và ruleset;
  - phút Actions đo ở T19;
  - GitHub CLI trên máy bạn, theo những gì xảy ra ở Checkpoint 4.
- `docs/github-apps-setup.md` đã có từ T1.
- `tests/repo.test.mjs` có hai test mới. Test thứ nhất kiểm mục mới của README, kể cả bốn check, bốn workflow của kit và các biến mới; test thứ hai kiểm `docs/quality-gates.md`. Cả hai đỏ khi chưa có tài liệu. Cả bộ 501 test xanh.
- `SPEC-quality-gates.md` và `SPEC.md` ghi module hoàn thành. `plan.md`, `todo.md` và `verification.md` chuyển vào `tasks/archive/quality-gates/`.

Cả 13 tiêu chí của spec mục 9 đạt. T21 đóng.

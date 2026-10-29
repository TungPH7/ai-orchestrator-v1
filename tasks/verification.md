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

**Tiêu chí 6, phần chặn (khoảng 11:25): đạt.** `claude -p --agent fe-dev --model sonnet` trong `ao-pilot`, với `--allowedTools "Bash(git:*)" Edit`. Lệnh `gh` không nằm trong quyền đã cho, nên nếu hook không chặn thì lớp quyền vẫn chặn và không PR nào bị merge; còn `git commit` và `Edit` thì chỉ hook chặn được.

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

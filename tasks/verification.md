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

**2026-10-29, khoảng 10:00.** Chạy từ bản clone `ao-pilot`: `node ../ai-orchestrator/scripts/merge-gate.mjs --dry-run`. `.claude/settings.json` của bản clone chưa có slug hai App (T18 cập nhật bản chép kit), nên lần chạy đầu dừng đúng với `Set AO_DEV_APP and AO_REVIEW_APP, ...`; các lần sau truyền `AO_DEV_APP`, `AO_REVIEW_APP` qua biến môi trường. Script đọc bằng token của `gh`, không mua token App.

| Bước | Output |
|---|---|
| Không có PR mở | `No open PR` |
| Mở lại PR #3 (`DEMO-5`, tác giả `tungph7-ao-dev[bot]`), CI đang chạy lại | `Waiting #3: CI green on head df44b9e; reviewer report on head df44b9e; security report on head df44b9e; approval on head df44b9e` |
| CI xong ([run 40805863207](https://github.com/TungPH7/ao-pilot/actions/runs/40805863207), xanh, 4 phút), chạy hai lần liền | Cả hai lần: `Waiting #3: reviewer report on head df44b9e; security report on head df44b9e; approval on head df44b9e` |

PR #3 để mở cho Checkpoint 3, rồi đóng lại.

## T16: `audit --dry-run` trên commit thật của `ao-pilot`

**2026-10-29, khoảng 10:40.** Chạy từ bản clone `ao-pilot` với `--dry-run` (không ghi Jira), `AO_DEV_APP` và `AO_REVIEW_APP` qua biến môi trường; `AO_APPROVERS` và `AO_JIRA_SPACE` đọc từ `.claude/settings.json` của bản clone. Cả hai lần đều thoát mã 1, đúng như mong đợi:

| Commit trên `develop` | Output |
|---|---|
| `68d2a15`, commit cài kit của T13, phiên chính push thẳng | `68d2a15 on develop is not the merge of a PR into develop: it was pushed without one`; `Would flag DEMO-5` (mã trong header của commit) |
| `eacd786`, commit squash của PR #2 (PR thử của T3, nhánh `probe/t3-app-identity`) | `PR #2 was merged without: valid branch (...); valid title (...); complete description (...); reviewer report on head 3a12727; security report on head 3a12727`; không có mã item nên `No work item of DEMO to flag`. Approve của bạn trên commit đầu được tính, nên không có dòng `approval` |

`GET /commits/{sha}/pulls` trả đúng PR đã merge, có `merge_commit_sha` và `merged_at`.

# Kiểm thật: dev-workflow

> **Plan:** [plan.md](plan.md). Mỗi lần kiểm thật ghi ngày, bước đã làm và kết quả. Mỗi lượt chạy agent ghi model, effort, token, chi phí quy đổi theo giá API, thời gian và số lượt. Không ghi token hay key.

## T1: Tiền đề về Claude Code (spec mục 2.11, điểm 6–7)

**Cách kiểm (2026-10-31 khoảng 23:50 tới 2026-11-01 khoảng 00:40):**

- Claude Code 2.1.316, chế độ quyền `auto` lấy từ settings của bạn.
- Dự án tạm `t1/proj` trong scratchpad: có `git init`, chưa được tin cậy, với ba skill thử:
  - `probe-step`: `disable-model-invocation: true`, dòng `` !`node probe.mjs $ARGUMENTS` ``. `probe.mjs` in lại mảng tham số nó nhận được;
  - `probe-fail`: giống `probe-step`, nhưng script thoát 1;
  - `probe-zero`: dòng `!` chỉ truyền `$0`, còn `$ARGUMENTS` nằm trong thân skill.
- Mọi lượt chạy bằng Haiku 5.5 qua `claude -p`: 22 lượt, tổng 0,075 USD quy đổi. Các kết luận dưới đây đọc từ sự kiện trong log của Claude Code (`killed`, `Shell command failed`, `Ignoring … permissions.allow`, lỗi của tool `Skill`), không dựa vào câu trả lời của Haiku. Chỉ một quan sát phụ thuộc model: khi Haiku phải tự chạy lệnh, nó chạy sai thư mục.

### Điểm 6: skill của dự án

| Kiểm | Kết quả |
|---|---|
| Dòng `!` chạy lúc nạp skill | **Chỉ khi có luật quyền cho phép lệnh đó.** Không có luật, Claude Code không chạy lệnh. Model nhận dòng `[run this first, exactly as written, and use its output: …]` và tự chạy lệnh bằng Bash. Ở mỗi vòng sáu lượt, ba lượt Haiku chạy ở thư mục của skill nên gặp lỗi `Cannot find module`. Changelog của bản 2.1.271 ghi: ở chế độ `auto`, lệnh `!` theo luật quyền của chế độ mặc định, và lệnh không luật nào quyết thì thành một lời gọi tool được duyệt. Có luật `Bash(node probe.mjs:*)` thì lệnh chạy lúc nạp, model nhận ngay output và trả lời trong 1 lượt |
| Luật đặt ở đâu | Luật trong `.claude/settings.json` của dự án chỉ có hiệu lực ở thư mục đã tin cậy. Với dự án tạm, Claude Code báo `Ignoring 1 permissions.allow entry from .claude/settings.json: this workspace has not been trusted`, nên mình kiểm luật bằng `--settings`. `ao-pilot` đã được tin cậy |
| Shell | Git Bash (`MINGW64`, `C:\Program Files\Git\bin\bash.exe`) |
| `$ARGUMENTS` | Được chèn nguyên văn vào lệnh, rồi shell tách tham số:<br>• `15 sửa hai finding Low của reviewer` thành 7 tham số, chữ có dấu nguyên vẹn; `"hai finding"` thành một tham số;<br>• shell hiểu mọi ký tự đặc biệt: `; echo INJECTED` chạy thật, `$(echo SUBSTITUTED)` được thay;<br>• một dấu `'` lẻ (`it's broken`) gây lỗi cú pháp, và lệnh bị hủy |
| `$0` | Chỉ lấy tham số đầu: `/probe-zero 15 it's broken; echo INJECTED $(echo SUB)` cho `["15"]`, và thân skill nhận nguyên đoạn chữ. Nhưng `$0` cũng được chèn nguyên văn: với `"15; echo INJECTED"`, lệnh `echo` vẫn chạy |
| Script thoát 1 | **Lệnh bị hủy:** 0 lượt, 0 USD, model không thấy nội dung skill. Stderr hiện thành `Shell command failed for pattern …`. Kết quả của `claude -p` vẫn là `success`, với chữ rỗng |
| `disable-model-invocation` | **Đúng.** Khi model gọi `Skill` cho `probe-step`, Claude Code từ chối: `Skill probe-step cannot be used with Skill tool due to disable-model-invocation…` |
| Gõ `/…` qua `claude -p` từ Git Bash | Git Bash đổi `/probe-step` thành `C:/Program Files/Git/probe-step` trước khi tới `claude`, nên cần `MSYS_NO_PATHCONV=1`. Lệnh mở từ Node bằng `spawn` không bị đổi |

### Điểm 7: lệnh nền

| Kiểm | Kết quả |
|---|---|
| Phiên chính chạy lệnh nền 20 phút | **Đúng.** `long.mjs 20` chạy 1200 giây (16:50:53 tới 17:10:53 UTC), và phiên nhận thông báo `completed` |
| `claude -p` chờ lệnh nền 3 phút | **Đúng.** Lượt đầu kết thúc sau 9 giây với một sự kiện `result`, nhưng process không thoát. Nó nhận `task_notification` sau 180 giây, chạy tiếp 2 lượt, in `result` thứ hai, rồi thoát sau 194 giây |
| `claude -p` chờ lệnh nền 20 phút | **Đúng, nhưng lệnh nền bị dừng sau 10 phút nếu không đặt `timeout`.** Lần đầu, Haiku chạy lệnh nền không có `timeout`: Claude Code dừng nó sau 600 giây (`task_updated` với `status: killed` lúc 17:20:45 UTC, dòng cuối `minute 9`). Haiku tự chạy lại với `timeout: 7200000` (2 giờ): lần này lệnh chạy đủ 1200 giây, process chờ, nhận thông báo, trả lời, và thoát sau 1819 giây. Phiên chính không bị giới hạn này: lệnh nền 20 phút không đặt `timeout` vẫn chạy đủ |

**Hai sự kiện `result` trong một log (dùng cho T8).** Ở `result` thứ hai:

- `total_cost_usd`, `modelUsage` và `duration_api_ms` cộng dồn từ đầu process: 0,00425 USD; 10 token vào và 515 token ra, tức 4 + 6 và 233 + 282;
- `usage`, `num_turns` và `duration_ms` chỉ tính phần sau.

Vì vậy `runs.mjs` lấy chi phí từ `result` cuối, và cộng `usage` của mọi `result`.

### Kết luận

Hai điểm đúng, nhưng điểm 6 cần một điều kiện mà spec chưa có. Claude đề xuất năm điểm sửa; bạn duyệt cả năm ở Phiên 17 · Lượt 5, và spec đã được sửa (mục 2.1, 2.3, 2.11, 4, 6, 10, 12):

1. **Luật quyền cho dòng kiểm.** `kit/.claude/settings.json` thêm `permissions.allow: ["Bash(node .ai-orchestrator/scripts/ao-step.mjs:*)"]`, để dòng `!` chạy lúc nạp skill (spec mục 2.1, 6). Thiếu luật thì lệnh vẫn chạy, nhưng do model tự chạy: có thể chạy sai thư mục, và script hỏng không làm lệnh bị hủy.
2. **Chặn lệnh điều phối trong phiên agent.** Luật trên cũng áp cho phiên agent trong cùng dự án. Vì vậy `gh-guard` từ chối `ao-step.mjs` và `ao-agent.mjs` trong phiên agent (T3). Nếu không, một agent chạy được `--go` và mở agent khác.
3. **Dòng `!` chỉ truyền mã item hay số PR, qua `$0`;** không bao giờ truyền đoạn chữ tự do. `ao-step.mjs` từ chối đối số sai dạng. Với `/ao-fix 15 <việc cần sửa>`, đoạn chữ nằm trong thân skill, và Claude chuyển nó cho `--go` qua file `--note .ai/runs/<KEY>/note.md` (spec mục 2.1, 6; T12, T13).
4. **Skill dặn đặt `timeout` dài khi chạy `--go` ở nền**, mức tối đa của tool Bash (2 giờ). Trong `claude -p`, lệnh nền không có `timeout` bị dừng sau 10 phút, ngắn hơn nhiều lượt agent (spec mục 6; T13).
5. **Tài liệu** ghi `MSYS_NO_PATHCONV=1` khi gõ `claude -p "/ao-…"` trong Git Bash (T19).

Với điểm 4, Claude gõ được lệnh `/ao-…` qua `claude -p` ở kiểm thật (plan, quyết định 10).

## T2: Quyền mới cho hai App và tiền đề về GitHub (điểm 1–5, 8)

**Chuẩn bị (2026-11-01, khoảng 00:05–00:25):**

- `docs/github-apps-setup.md` có mục 6 "Thêm quyền cho dev-workflow". Manifest của hai App có ba quyền mới, có test.
- Task thử `DEMO-18` "Thử danh tính GitHub của agent (dev-workflow T2)", tạo bằng token CI, để ở New làm bằng chứng.
- Bản clone tạm của `ao-pilot` trong scratchpad. Mọi lệnh git chạm GitHub, kể cả lúc clone, chỉ dùng token của App.
- Credential helper tạm `t2/cred.mjs` (bản nháp của `ao-git-credential.mjs`) và `t2/agit.sh`: git với cấu hình chỉ lấy từ `GIT_CONFIG_*`:
  - `credential.helper` rỗng, rồi `!node "<scratchpad>/t2/cred.mjs" <contents|workflows>`;
  - `credential.useHttpPath=true`;
  - `user.name=tungph7-ao-dev[bot]`, `user.email=349476619+tungph7-ao-dev[bot]@users.noreply.github.com`. Id 349476619 lấy từ `GET /users/tungph7-ao-dev%5Bbot%5D`;
  - `GIT_TERMINAL_PROMPT=0`.
- `t2/agh.mjs`: chạy `gh` với `GH_TOKEN` là token cài đặt, thu hẹp quyền theo tham số, không in token.

Bạn thêm quyền cho hai App và chấp nhận quyền mới trên `ao-pilot` (khoảng 00:45–00:55). Claude kiểm bằng cách xin token có đúng các quyền đó: cả hai App đều được cấp.

### Kết quả

| Điểm | Kết quả |
|---|---|
| 1. Push bằng token của `ao-dev` qua HTTPS, và push đó chạy CI | **Đúng.** Clone và push nhánh `feature/DEMO-18-identity-probe` (commit `5f76e50`) bằng token `contents: write`. PR #13 do `app/tungph7-ao-dev` mở bằng `ao-pr.mjs create`, rồi chuyển sang nháp bằng login của bạn. CI (4 job) và `jira-sync` chạy cho sự kiện `pull_request`, actor `tungph7-ao-dev[bot]`, đều xanh. Lần push thứ hai lên PR (`738d000`) cũng chạy CI và `jira-sync`, đều xanh |
| 2. Push file trong `.github/workflows/` cần quyền Workflows | **Đúng.** Trước khi App có quyền Workflows, token `contents: write` bị từ chối: `refusing to allow a GitHub App to create or update workflow .github/workflows/ci.yml without workflows permission`. Xin `workflows: write` lúc đó thì GitHub trả 422; helper không đưa được credential, và git chỉ báo `Repository not found`, nên helper thật phải in lý do ra stderr. Sau khi App có quyền: token `contents: write` + `workflows: write` push được `738d000`; token chỉ có `contents: write` vẫn bị từ chối như trên. Thu hẹp quyền theo vai trò vì vậy có hiệu lực |
| 3. Token chỉ đọc làm được mọi lệnh `gh` của agent | **Đúng.** Với `contents`, `pull_requests`, `actions`, `checks` đều `read`: `gh pr view --json`, `gh pr diff`, `gh pr checks`, `gh run list`, `gh run view` và `gh api …/pulls/13/reviews` chạy được. `gh pr comment` (`addComment`) và `gh run rerun` bị từ chối `Resource not accessible by integration`. Trước khi App có Actions và Checks, `gh pr checks` (GraphQL `statusCheckRollup`) và `gh run list` bị từ chối 403 |
| 4. `GIT_CONFIG_*` thay Git Credential Manager | **Đúng.** `git config --show-origin --get-all credential.helper` cho `manager` (file `C:/Program Files/Git/etc/gitconfig`), rồi giá trị rỗng và helper tạm (nguồn `command line`). Không có `credential.https://github.com.helper` nào. `GIT_TRACE=1` lúc push chỉ có `cred.mjs contents get` và `cred.mjs contents store`, không có `git credential-manager`. Commit `5f76e50` có author và committer là `tungph7-ao-dev[bot] <349476619+tungph7-ao-dev[bot]@users.noreply.github.com>` |
| 5. `gh` dùng `GH_TOKEN` thay keyring | **Đúng.** `gh auth status` với `GH_TOKEN` của `ao-review` cho tài khoản đang dùng là `tungph7-ao-review[bot] (GH_TOKEN)`. `TungPH7 (keyring)` vẫn được liệt kê, nhưng `Active account: false`. `gh api user` trả 403 `Resource not accessible by integration`. `gh-guard` đã chặn `gh auth token`, `switch`, `login` và `status -t` |
| 8. Commit của bot qua hook và `policy`, GitHub for Jira nối vào item | **Đúng.** Bản clone đặt `core.hooksPath=.githooks`. `commit-msg` chặn tiêu đề `bad header` và cho qua `chore(probe): add the identity probe file (DEMO-18)`; `pre-commit` (eslint) và `pre-push` đều chạy. Job `policy` xanh trên cả hai head của PR #13. Trường Development (`customfield_10000`) của `DEMO-18` có PR #13, trạng thái DRAFT, qua GitHub for Jira |

**Dọn dẹp:** PR #13 được đóng kèm comment, nhánh đã xóa (GitHub trả `Branch not found`), bản clone tạm đã xóa. `merge-gate` sau lần push thứ hai chạy xanh, và bỏ qua PR nháp. Không token nào được in ra; Claude chỉ in quyền và hạn của token.

## T3: Môi trường của phiên agent và `ao-git-credential.mjs`

Kiểm trong `ao-pilot` ngày 2026-11-01, bằng code của kit (`AO_KIT_DIR` trỏ vào repo kit), không chạy agent nào.

| Bước | Kết quả |
|---|---|
| `ao-agent.mjs fe-dev --ao-dry-run -p "Build DEMO-12"` | In lệnh `claude` như trước, rồi các biến của phiên: `GH_TOKEN=<read-only token of tungph7-ao-review, expires …>` (không in token), `GH_PROMPT_DISABLED=1`, `GIT_TERMINAL_PROMPT=0`, năm cặp `GIT_CONFIG_*` (`credential.helper` rỗng, helper `ao-git-credential.mjs fe-dev TungPH7/ao-pilot`, `credential.useHttpPath`, `user.name=tungph7-ao-dev[bot]`, `user.email=349476619+tungph7-ao-dev[bot]@users.noreply.github.com`), và danh sách biến bị bỏ. Id bot lấy từ GitHub lúc mở phiên, khớp với T2 |
| `git ls-remote origin develop` với cấu hình git của `fe-dev`, `devops`, `reviewer` | Cả ba chạy được. `GIT_TRACE` chỉ có `ao-git-credential.mjs <role> TungPH7/ao-pilot get` và `store`, không có Git Credential Manager |
| Cùng lệnh với vai trò lạ `qa-lead` | Thoát 128. Helper in `ao-git-credential: qa-lead is not a role of agents/roster.yaml`, rồi git báo `terminal prompts disabled`, không hỏi mật khẩu |
| Gọi thẳng helper cho `fe-dev`, `devops`, `reviewer` | Mỗi lần trả `username=x-access-token` và một token chỉ dùng được trên `TungPH7/ao-pilot` (`GET /installation/repositories`) |

Điều chỉnh so với todo: vai trò chỉ đọc vẫn có helper, nhưng helper chỉ cho nó token `contents: read` của `ao-review`. Lý do: `reviewer` và `security` chạy `git fetch origin` để đọc nhánh của PR, và khi Git Credential Manager bị bỏ thì repo private không fetch được nếu không có credential. Push bằng token này bị GitHub từ chối; T16 kiểm điều đó trên phiên agent thật. Spec mục 2.3 đã ghi thêm câu này.

## T5: `merge-gate` và `audit` nhận PR tài liệu

Kiểm trong `ao-pilot` ngày 2026-11-01 bằng code của kit, chỉ đọc:

- `merge-gate.mjs --dry-run`, có và không có `JIRA_CI_TOKEN`: `No open PR`, như bản trong `ao-pilot`.
- `audit.mjs --sha 5956702 --branch develop --dry-run` (commit merge của PR #12, sửa workflow, bạn merge): `audit passed`, như trước.

Việc để lại cho T15: workflow deploy của `ao-pilot` gọi `audit.yml` phải cấp thêm `actions: read`, vì workflow được gọi không nâng được quyền của token bên gọi. Thiếu quyền này thì `audit` không đọc được lượt `CI` của PR tài liệu.

## T12: `ao-step.mjs` và `runner.mjs`

Chạy `ao-step.mjs` ở chế độ chỉ kiểm trong `ao-pilot` ngày 2026-11-01, bằng code của kit (`AO_KIT_DIR`), không agent nào chạy:

| Lệnh | Kết quả |
|---|---|
| `status` | Liệt kê 13 item chưa xong của `DEMO`, lệnh kế tiếp của từng item, và "Waiting for you: DEMO-5" (cờ của `audit`). Thoát 0 |
| `build DEMO-15` | `STOP: DEMO-15 is New, not Ready`. Thoát 0 |
| `spec DEMO-11`, `plan DEMO-11` | `STOP`: Epic đã In Progress; Epic này không có PR tài liệu, vì làm trước module này. Thoát 0 |
| `review 11` lần đầu | Thoát 1: `GET /commits/<sha>/status` trả 403 với token chỉ đọc của `ao-review` |
| `review 11` sau khi sửa | `STOP: PR #11 is merged`. Thoát 0 |
| `fix "15; ls"` | `STOP: /ao-fix takes a PR number`, không request nào được gửi. Thoát 0 |

Phát hiện: App `ao-review` không có quyền Commit statuses, nên token chỉ đọc không đọc được commit status kiểu cũ. GitHub Actions báo kết quả bằng check run, nên `facts.mjs` đọc CI từ check run khi status trả 403; `merge-gate` và `audit` vẫn đọc cả hai bằng token của workflow. Không xin thêm quyền cho App.

## Checkpoint 2 (2026-11-01)

**Năm lệnh kiểm và CI của kit:** xanh trên `main` sau PR #125 (`a3a8c34`): `npm run validate`, `npm test` (755 test), `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`, và workflow `contract`.

**`ao-step.mjs` chỉ kiểm trong `ao-pilot`,** bằng code của kit trên `main` (`AO_KIT_DIR`). Không agent nào chạy, không file nào trong `ao-pilot` đổi, `.ai/runs/` không được tạo:

| Lệnh | In ra | Thoát |
|---|---|---|
| `status` | "Waiting for you: DEMO-5" (cờ của `audit`), rồi 13 item chưa xong, mỗi item một lệnh kế tiếp | 0 |
| `build DEMO-15` | `DEMO-15 Task …: New; no role label; no PR`, rồi `STOP: DEMO-15 is New, not Ready` | 0 |
| `review 12` | `DEMO-16 Task …: Ready for QA; no role label; PR #12 merged`, rồi `STOP: PR #12 is merged` | 0 |
| `status DEMO-16` | Dòng của item, rồi `Next: QA (release-workflow)` | 0 |

`ao-pilot` chưa có item nào ở Ready có nhãn vai trò, và chưa có PR nào đang mở, nên nhánh `GO` của lệnh thật chỉ chạy lần đầu ở T15. Test của `runner.mjs` đã đi qua nhánh đó với agent giả.

**Các chỗ đổi so với plan, ghi lại để bạn xem:**

1. T3: vai trò chỉ đọc vẫn có credential helper, nhưng chỉ nhận token `contents: read`, để `reviewer` và `security` `git fetch` được nhánh của PR. Spec mục 2.3 đã ghi.
2. T3: `gh-guard` chặn thêm `git -c credential.*`, `git config credential.*` và việc sửa file trong `.git/`. Nếu không, một agent đặt được credential helper của riêng nó, kể cả trong cấu hình git chung của bạn.
3. T6: `merge-gate` chỉ comment và gắn cờ khi PR chỉ còn chờ bạn (không thiếu gì, hoặc chỉ thiếu approve). Báo sớm hơn thì cờ "Needs you" nằm trên item trong lúc agent còn review. Spec mục 2.7 đã ghi.
4. T12: token chỉ đọc của `ao-review` không đọc được commit status kiểu cũ, nên `ao-step.mjs` đọc CI từ check run. Không xin thêm quyền cho App.
5. T13: quy tắc A4 cấm skill chép về mang tiền tố `ao-`, để không ghi đè lệnh của kit.
6. T5, cho T15: workflow deploy của `ao-pilot` phải cấp thêm `actions: read` khi gọi `audit.yml`.
7. T10, T14: `ux` chạy khi SPEC nhắc `design.md`; bước của `sa` được tính là xong khi SPEC có mục `### Non-functional requirements`. Prompt của `ba` và `sa` đã ghi hai điều này.

**Bạn duyệt (2026-11-01, Phiên 19 · Lượt 1):** "qua checkpoint 2". Bảy chỗ đổi được giữ nguyên.

## T15: Bản chép kit mới vào `ao-pilot` (2026-11-01)

**Chuẩn bị:**

- Task `DEMO-19` (tạo bằng token CI, ở New).
- Nhánh `feature/DEMO-19-dev-workflow-kit` tách từ `develop` (`5956702`). Commit `6152cff` chép kit tại `86331a9` theo các bước cài của README, và thêm `actions: read` vào `deploy.yml`.
- Commit và push bằng cấu hình git của phiên `devops`: tác giả `tungph7-ao-dev[bot]`, credential qua `ao-git-credential.mjs devops` của bản chép. GitHub nhận push, kể cả các file trong `.github/workflows/`.
- `ao-dev` mở ao-pilot PR #14 bằng `ao-pr.mjs create`. CI xanh (run `41270368919`, 4 phút tính tiền).

**Kiểm trước khi review:** `render-agents.mjs --project . --check` báo 11 file đúng. `.claude/skills/` (96 file), `.claude/hooks/` và sáu thư mục của `.ai-orchestrator/` giống hệt kit. `ao-step.mjs status DEMO-19` chạy từ bản chép, thoát 0.

**`/ao-review` bằng `ao-step.mjs review 14`, từ nhánh của PR (quyết định 8):**

| Lượt | Effort | Kết quả | Turn | Thời gian | Chi phí quy đổi | Bị từ chối |
|---|---|---|---|---|---|---|
| `reviewer` | xhigh | COMMENT trên `6152cff`: 0 Critical/High, 2 Medium, 8 Low | 41 | 14 phút | 4,43 USD | 3 |
| `security`, lượt 1 | max | Chạm giới hạn 5 giờ của tài khoản, chưa có báo cáo | 39 | 16 phút | 4,55 USD | 0 |
| `security`, chạy tiếp | max | Cùng session (`--resume`), COMMENT trên `6152cff`: 0 Critical/High, 2 Medium, 4 Low | 6 | 3 phút | 2,71 USD | 0 |
| Tổng | | | 86 | 33 phút | 11,69 USD | 3 |

- Lần chạy lại sau giới hạn dùng đúng lệnh cũ. `state.json` ghi lượt dở với `usage-limit`, nên `ao-step.mjs` chỉ chạy tiếp `security` trong session cũ, không chạy lại `reviewer`.
- Lệnh bị từ chối của `reviewer`: một lệnh đọc registry (`gh-guard` chặn đúng, vì liên quan tới key của App) và hai lần ghi file thử bằng heredoc. Ở hai lần sau, `gh-guard` đọc nội dung heredoc như lệnh thật, tức là chặn nhầm theo hướng an toàn.
- Báo cáo nằm ở `.ai/reviews/14-reviewer.md` và `.ai/reviews/14-security.md` của `ao-pilot`, và là review trên PR.

**Finding cần đưa vào kit** (không chặn PR này, vì không có Critical/High; ghi tên, chi tiết trong hai báo cáo):

- Medium, `security`: chế độ review phần mới không xét báo cáo trước có finding chặn, nên một finding High chưa sửa có thể không còn chặn merge. Ảnh hưởng tiêu chí 5, nên sửa trước T18.
- Medium, cả hai: ranh giới "mỗi vai trò một token" chỉ dựa vào `gh-guard` so khớp chuỗi lệnh; key của App đọc được bởi chính user chạy agent. Spec mục 12 đã ghi rủi ro này. Hai báo cáo đề xuất giữ key ngoài phiên agent.
- Medium, `reviewer`: `gh-guard` còn sót một số dạng lệnh.
- Low: PR tài liệu được tính ngày theo lượt CI sớm nhất của SHA, kể cả lượt từ nhánh khác (cả hai). Ảnh hưởng tiêu chí 4, nên sửa trước T17.
- Low: hồi quy của `checkAoPr`; thư mục temp dạng tên 8.3 bị từ chối; `GH_TOKEN` hết hạn sau 1 giờ; luật `allow` cho cả `--go`, và `--note`/`--answers` đọc file ngoài `.ai/runs/`; khóa `active.json` không nguyên tử; key lấy từ tên nhánh không kiểm space; dấu của cờ có thể bị người khác viết; chi phí poll khi chờ CI.

**`merge-gate` báo PR chỉ còn chờ bạn (tiêu chí 6, phần trước merge):**

- Workflow `merge-gate` chạy từ nhánh mặc định `main`, mà `main` của `ao-pilot` (`354f02c`) vẫn là bản kit của `quality-gates`: không có code báo PR cần bạn, không có PR tài liệu, không có `JIRA_CI_TOKEN`. Vì vậy workflow chỉ in `Needs you #14`.
- Claude chạy `merge-gate.mjs` của nhánh PR ở máy, cùng token như workflow (đọc bằng `gh`, ghi bằng App `ao-dev` và token CI):
  - lần 1: comment `6553409891` trên PR #14 của `tungph7-ao-dev[bot]`; DEMO-19 có Flagged Impediment, nhãn `needs-you` và comment cùng nội dung của `orchestratorci`;
  - lần 2: không comment, không gắn cờ thêm.
- Comment dài 2.908 ký tự, vì liệt kê đủ 72 đường dẫn được bảo vệ. Nên gom theo mẫu đường dẫn ở kit.

**Sau khi bạn merge:**

- Bạn approve rồi squash merge PR #14 lúc 12:01: commit `d8a67f7` trên `develop`.
- Deploy run `41275298464` trên `d8a67f7`: job `audit` xanh, job `deploy` (development) xanh.
- `jira-sync` (run `41275299039`, sự kiện `pull_request` closed, chạy code của PR) gỡ cờ DEMO-19: bỏ Flagged và nhãn `needs-you`, và comment "PR #14 was merged, so the Needs you flag merge-gate raised for it is cleared" (`orchestratorci`, 12:01:48).
- `ao-pilot` trên `develop` có sáu skill `/ao-*` và `ao-step.mjs`; `git status` sạch.
- DEMO-19 ở lại New, như DEMO-17: Task chỉ để lấy mã, và T16 dùng lại mã này.

**Nhánh mặc định của `ao-pilot` (bạn chọn cách 2):**

- Environment `merge-gate`: thêm rule cho nhánh `develop`, rồi bỏ rule `main`. Nhánh mặc định đổi sang `develop`.
- Chạy tay `merge-gate` trên `develop` (run `41275568901`, `d8a67f7`): job chạy, đọc được `AO_DEV_APP_KEY` và `JIRA_CI_TOKEN`, in `No open PR`.
- Từ nay trigger `workflow_run` và `deployment_status` chạy bản trên `develop`. Một bản sửa workflow của kit có hiệu lực ngay khi bạn merge PR vào `develop`, không phải chờ release. Tài liệu của kit đổi theo, ở cùng PR với phần ghi này.

**Tiêu chí của spec mục 9:**

- Tiêu chí 6 đạt: `merge-gate` bản mới comment trên PR và gắn cờ Task, chỉ một lần mỗi head; `jira-sync` gỡ cờ sau khi merge. Phần comment và gắn cờ chạy ở máy, bằng cùng danh tính với workflow, vì lúc đó workflow còn chạy bản cũ trên `main`. Từ T17, workflow tự chạy bản mới.
- Tiêu chí 9 đạt: bản chép kit mới vào `ao-pilot` qua PR #14 do bạn merge tay; `audit` xanh trên commit merge.
- Bạn chọn sửa các finding ở kit ngay, không chạy agent. Bản sửa vào `ao-pilot` ở lần chép kit sau, nên T16–T18 chạy với các chỗ hở đã biết ở trên.

## T15a: Sửa finding của PR #14: cổng và Jira (2026-11-01)

Không chạy agent. Mỗi điểm có test đỏ trước, một commit riêng.

- **`security` review phần mới (finding Medium của `security`):** báo cáo `security` mới nhất, hay báo cáo đầy đủ mà phần mới tính từ đó, còn finding Critical/High thì `security` review lại cả PR. Mốc của phần mới là báo cáo đầy đủ cuối cùng (không có dòng `Scope`), không phải báo cáo phần mới. Spec mục 2.6 đổi theo: bốn điều kiện thay vì ba.
- **PR tài liệu (finding Low của cả hai):** `readDocsFacts` đọc các lượt `pull_request` của nhánh tài liệu, không đọc theo SHA. Lượt `CI` mới nhất của nhánh phải chạy trên head và bắt đầu trước lúc duyệt. Có test cho các trường hợp: force-push về commit đã đọc sau lúc duyệt; head mới chưa có lượt CI; lượt của cùng commit ở nhánh khác, chạy tay, hay của workflow khác. Spec mục 2.4 và `docs/quality-gates.md` đổi theo.
- **Space (finding Low của cả hai):** `docsPullRequest` nhận `space`. `merge-gate` và `audit` coi nhánh tài liệu của Epic ngoài space là PR thường, và không đọc Jira cho nó. `/ao-review` và `/ao-fix` dừng khi nhánh mang key của space khác. JQL đọc con của Epic có `project =`.
- **Dấu của cờ (finding Low của `security`):** `merge-gate` và `jira-sync` chỉ tính comment trên Jira của tài khoản token CI, và comment trên PR của bot `ao-dev`.
  - Lúc đầu Claude định hỏi Jira bằng `/rest/api/3/myself`. Kiểm thật thì cả token CI lẫn token agent đều bị từ chối ("scope does not match"), vì token có scope.
  - Vì vậy identity trong `tracker/jira.yaml` có thêm `account_id`: `orchestratorci` là `712020:14a4…8b62`, `orchestratoragent` là `712020:3c1a…1f31`. Hai id này lấy từ comment của hai tài khoản trên DEMO-19 và DEMO-16. Id không phải bí mật.
- **Comment "Needs you":** quá tám đường dẫn thì comment đếm số file theo từng đường dẫn được bảo vệ. Chạy hàm mới trên danh sách file thật của PR #14 (74 file, 73 file được bảo vệ, tính cả tên cũ của file đổi tên): "73 protected files: .ai-orchestrator/** (49), .claude/** (19), .github/workflows/** (4), .mcp.json (1)".

`npm test`: 764 pass. Bốn lệnh kiểm còn lại xanh.

## T15b: Sửa finding của PR #14: `gh-guard` và script ở máy (2026-11-01)

Không chạy agent. Test viết trước, ba commit.

- **`gh-guard`:**
  - Từ chối đặt, export hay xóa các biến danh tính của phiên: `GIT_CONFIG_*`, `GIT_ASKPASS`, `SSH_ASKPASS`, `GIT_TERMINAL_PROMPT`, `GIT_EXEC_PATH`, `GH_TOKEN`, `GITHUB_TOKEN` và các biến cùng loại. Từ chối bằng mọi cách: dòng chỉ có phép gán, gán trước bất kỳ lệnh nào (trước đây chỉ trước `git`), `export`/`declare`/`typeset`/`readonly`/`local`/`unset`/`set`, `env -i`, `env -`, `env -u`, và qua `$env:`, `Env:` hay `SetEnvironmentVariable` trong PowerShell.
  - Kiểm lệnh trong `powershell`/`pwsh -Command` (kể cả dạng viết tắt của option) và `cmd /c`, `//c`, `/k` như lệnh lồng nhau. Từ chối `-EncodedCommand`.
  - Từ chối shell đọc lệnh từ stdin: `| bash`, `sh -s`, `powershell -Command -`, `cmd` không có `/c`. `bash x.sh` vẫn chạy được: `gh-guard` không đọc file script, như trước.
  - Từ chối chương trình `git-credential-*`, ở đầu lệnh hay ở sau `xargs`. Tên chương trình và tên script điều phối không phân biệt hoa thường.
  - `checkAoPr` bỏ qua giá trị của `-r`, `--require`, `--import`, `--loader`, `-C` và các option cùng loại của `node`, nên `be-dev` không còn chạy được `ao-pr.mjs review` theo cách đó.
- **Thư mục temp:** hook truyền cả `os.tmpdir()` (tên 8.3 `C:\Users\HUUTUN~1\…`) lẫn tên dài từ `realpathSync.native`. Chạy hook thật trên máy này với agent `reviewer`: ghi vào `C:\Users\Huu Tung\AppData\Local\Temp\probe\x.md` và vào tên ngắn đều được; ghi `~/.gitconfig` vẫn bị từ chối.
- **`ao-step.mjs`:** khóa `active.json` tạo bằng cờ `wx`; holder đã chết thì bị thay. `--note` và `--answers` chỉ đọc file trong `.ai/runs/`.
- **Tài liệu:** `docs/quality-gates.md` ghi rằng `gh-guard` chỉ chặn nhầm lẫn, vì phiên agent đọc được key của App, và liệt kê năm việc còn chờ bạn quyết. Comment ở `launch.mjs` sửa theo.

`npm test`: 772 pass. Bốn lệnh kiểm còn lại xanh.

## T16: Thử đi vòng (2026-11-01)

Hai lượt `claude -p` trong `ao-pilot` (bản chép kit của PR #14), chạy bằng `ao-agent.mjs` với `CLAUDE_CODE_EFFORT_LEVEL=low`. Lệnh vẫn truyền `--effort` của roster, nhưng biến môi trường thắng, như đã kiểm ở `agent-roster` T21.

| Lượt | Model | Turn | Thời gian | Token vào / ra | Cache đọc / ghi | Chi phí quy đổi | Bị từ chối |
|---|---|---|---|---|---|---|---|
| `reviewer` | Opus 5.5 | 6 | 33 giây | 10 / 1.640 | 87.510 / 22.566 | 0,23 USD | 3 |
| `fe-dev` | Opus 5.5 | 8 | 70 giây | 14 / 1.522 | 299.603 / 50.643 | 0,50 USD | 0 |

**`reviewer`:**

- `gh auth status`: tài khoản đang dùng là `tungph7-ao-review[bot]`, lấy từ `GH_TOKEN`. Login `TungPH7` trong keyring vẫn được liệt kê, nhưng không active.
- `gh api user`: HTTP 403 "Resource not accessible by integration", tức là token của App.
- `git push origin develop:refs/heads/feature/DEMO-19-reviewer-probe`: `gh-guard` từ chối, vì `reviewer` chỉ có git đọc. Lệnh không tới GitHub.
- `git ls-remote origin develop` cũng bị `gh-guard` từ chối, và đây là chặn nhầm, vì lệnh này chỉ đọc. Agent tự nhận ra điều này trong báo cáo. Kit sửa ở cùng PR: thêm `ls-remote` vào các lệnh đọc, có test.
- Ba lần bị từ chối gồm: lần agent gộp ba lệnh vào một dòng (dòng đó có `ls-remote`), lần chạy `ls-remote` riêng, và lần push. Agent không tìm đường khác.

**Lớp thứ hai, ngoài agent:** Claude chạy cùng lệnh push với đúng cấu hình git của phiên `reviewer` (`agit.sh reviewer`, các biến `GIT_CONFIG_*` như `launch.mjs` đặt). Kết quả:

- `GIT_TRACE` chỉ có `ao-git-credential.mjs reviewer TungPH7/ao-pilot get`, không có Git Credential Manager.
- GitHub trả `remote: Write access to repository not granted` và 403. Git thoát 128, nhánh không được tạo (GET branch trả 404).
- Với cùng cấu hình, `git ls-remote origin develop` chạy được.

**`fe-dev`:** không lệnh nào bị từ chối.

- `git switch -c feature/DEMO-19-push-probe`, rồi tạo `docs/probe-DEMO-19.md` bằng Write.
- Commit `1275edf` "test(probe): check the push identity of the agent (DEMO-19)" qua được hook `pre-commit` (eslint) và `commit-msg`.
- `git push -u origin feature/DEMO-19-push-probe` được GitHub nhận.
- Author và committer trên GitHub đều là `tungph7-ao-dev[bot] <349476619+tungph7-ao-dev[bot]@users.noreply.github.com>`. API activity của repo ghi `branch_creation` bởi `tungph7-ao-dev[bot]`.
- Agent tự quay về `develop`.

**Dọn dẹp:** Claude xóa nhánh `feature/DEMO-19-push-probe` trên GitHub và ở máy. Push lên nhánh feature không làm workflow nào chạy. `ao-pilot` sạch trên `develop`.

**Tiêu chí 3 của spec mục 9 đạt:**

- Agent commit và push dưới tên bot `ao-dev`, và đọc GitHub bằng token chỉ đọc của `ao-review`.
- `gh` trong phiên agent không dùng login của bạn.
- Vai trò chỉ đọc không push được: `gh-guard` chặn trước, và GitHub cũng từ chối token của nó.

**Chi phí T15–T16:** 11,69 + 0,73 = 12,42 USD quy đổi. Plan ước 6–12 USD cho T15 và dưới 1 USD cho T16, nên tổng vẫn nằm trong ước tính. T15 gần mức trên, vì lượt `security` đầu chạm giới hạn 5 giờ sau 4,55 USD, và lượt chạy tiếp tốn thêm 2,71 USD.

## Checkpoint 3 (2026-11-01)

- Tiêu chí 3 (T16), 6 và 9 (T15) đạt.
- Chi phí T15–T16: 12,42 USD quy đổi, trong ước tính của plan.
- Bạn đồng ý chạy Epic thử T17–T18 ("ok tiếp tục nhé", Phiên 20 · Lượt 4). `ao-pilot` vẫn dùng bản kit của PR #14: các bản sửa T15a, T15b và `ls-remote` vào ở lần chép kit sau.

## T17: Epic thử: `/ao-spec`, `/ao-plan` tới lúc PR tài liệu được merge (2026-11-01)

**Chuẩn bị:** Claude tạo Epic DEMO-20 "Xóa sản phẩm khỏi giỏ hàng" bằng token CI. Mô tả ghi giỏ hàng hiện có gì, "xóa" nghĩa là gì, phạm vi và ràng buộc. Claude gõ thật `/ao-status DEMO-20` qua `claude -p` (Sonnet, 1 turn, 0,10 USD). Lệnh báo Epic đang chờ `Start spec`.

**Diễn biến:**

- **12:55, stage spec.** Bạn bấm `Start spec`. Claude gõ `/ao-spec DEMO-20` qua `claude -p`; bước kiểm trả GO với bốn lượt, và skill chạy `--go`.
  - 13:02, Claude Code tắt lệnh nền vì máy thiếu RAM (còn trống 2,8 GB). Lệnh này kéo theo `ao-step` và lượt `ba` đầu, khi đó mới chạy 4 phút và chưa commit gì. Log của lượt này bị lượt sau ghi đè, nên không đo được chi phí.
- **13:06, chạy lại thẳng `ao-step.mjs spec DEMO-20 --go`.** `ba` viết SPEC và commit, rồi `ao-step` dừng với lý do "ba ran spec-write and it still has to run".
  - Nguyên nhân: `readDocs` chỉ đọc nhánh tài liệu trên GitHub, trong khi stage spec chỉ push ở bước mở PR.
  - Kit PR #132 sửa lỗi này: đọc nhánh tài liệu ở máy khi nhánh đó có trên máy.
  - Bản chép trong `ao-pilot` vẫn còn lỗi, nên bạn chọn chạy phần còn lại của T17–T18 bằng code của kit (`AO_KIT_DIR` trỏ vào repo kit). Workflow trên GitHub (`merge-gate`, `jira-sync`, `audit`) vẫn chạy bản chép.
- **Ba vòng câu hỏi:** `ba` 3 câu, `ux` 6 câu, `sa` 2 câu. Cả ba vòng bạn đều chọn theo đề xuất. Mỗi lần, Claude ghi câu trả lời vào `.ai/runs/DEMO-20/answers.md` rồi chạy với `--answers`, và agent làm tiếp trong session của nó.
- **Giới hạn usage:** `ux` chạm giới hạn 5 giờ của gói Pro lúc 13:35. Sau khi reset, lúc 15:21, `ux` chạy tiếp trong cùng session.
- **15:45, PR tài liệu.** `ba` push nhánh và mở PR tài liệu #15 bằng `ao-dev`. CI xanh, kể cả job `policy` kiểm `design.md`. `merge-gate`, nay chạy từ `develop`, in `Waiting #15: the docs PR of DEMO-20: … DEMO-20 past gate plan-approval (it is Specifying)`.
- **15:58, stage plan.** Bạn bấm `Approve spec`. `sa` viết plan và ADR-0002, rồi push lên PR #15. `ba` tạo Story DEMO-21 và hai Sub-task: DEMO-22 (BE, `ao-be-dev`) và DEMO-23 (FE, `ao-fe-dev`).
- **Nhãn effort và dòng `Status`.** Theo quyết định 11 của plan, không item nào có nhãn effort.
  - Claude báo bạn trước gate ②. Bạn chọn cho DEMO-22 chạy ở `xhigh`, và đổi `Status` của SPEC và design thành Approved trước khi duyệt plan.
  - Lượt `ba` nhận câu trả lời bị Claude Code tắt lần hai vì thiếu RAM (còn trống 1,9 GB), lúc đã gắn nhãn trên Jira.
  - Chỗ sửa dở trong `plan.md` được cất vào `git stash` của `ao-pilot`. Lượt chạy lại làm nốt phần còn lại (commit `24f600a` và `8b7f944`).
- **16:46, sau gate ②.** Bạn bấm `Approve plan`. `/ao-plan DEMO-20` lần hai không chạy agent nào:
  - `ao-step` dispatch `jira-sync` bằng login `gh` của bạn;
  - DEMO-21 sang Ready lúc 16:47:39, bởi `orchestratorci`;
  - `merge-gate` squash merge PR #15 bằng `ao-dev` lúc 16:48:01, commit `3fdd514`, với log "Merged #15 … the docs PR of DEMO-20".
- **Deploy.** Run `41294680675` trên `3fdd514`: job `audit` và `deploy` đều xanh, và audit ghi "audit passed: 3fdd514 on develop is the merge of PR #15, the docs PR of DEMO-20, which met every gate".

**Số đo** (từ `.ai/runs/DEMO-20/state.json`; `ba` và `sa` dùng Opus 5.5, `ux` dùng Sonnet 5.5):

| # | Lượt | Bước | Effort | Kết quả | Turn | Thời gian | Token vào / ra | Cache đọc / ghi | Chi phí quy đổi | Bị từ chối |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ba` | spec-write | xhigh | done | 22 | 6,0 phút | 42 / 35.328 | 1.450.047 / 78.713 | 1,63 USD | 0 |
| 2 | `ba` | spec-write, trả lời | xhigh | done | 12 | 1,1 phút | 16 / 5.872 | 780.524 / 12.161 | 0,37 USD | 0 |
| 3 | `ux` | design | xhigh | usage-limit | 29 | 6,3 phút | 34 / 44.877 | 946.528 / 99.012 | 0,94 USD | 0 |
| 4 | `ux` | design, chạy tiếp | xhigh | done | 11 | 2,4 phút | 20 / 17.166 | 907.597 / 123.215 | 0,76 USD | 0 |
| 5 | `ux` | design, trả lời | xhigh | done | 13 | 1,2 phút | 18 / 8.157 | 1.051.692 / 15.286 | 0,25 USD | 0 |
| 6 | `sa` | spec-nfr | xhigh | done | 34 | 8,3 phút | 60 / 43.379 | 2.549.071 / 128.168 | 2,40 USD | 0 |
| 7 | `sa` | spec-nfr, trả lời | xhigh | done | 12 | 1,7 phút | 18 / 8.571 | 1.101.273 / 17.167 | 0,53 USD | 0 |
| 8 | `ba` | docs-pr | xhigh | done | 24 | 2,8 phút | 38 / 11.197 | 1.012.454 / 67.397 | 0,97 USD | 0 |
| 9 | `sa` | plan-write | xhigh | done | 47 | 14,3 phút | 80 / 83.736 | 5.237.534 / 182.880 | 4,19 USD | 0 |
| 10 | `ba` | plan-items | xhigh | done | 32 | 5,4 phút | 48 / 31.772 | 2.253.129 / 108.167 | 1,95 USD | 0 |
| 11 | `ba` | plan-items, trả lời | xhigh | done | 21 | 3,1 phút | 30 / 15.310 | 2.274.777 / 23.452 | 0,95 USD | 0 |
| | Tổng | | | | 257 | 52,4 phút | | | 14,92 USD | 0 |

- Stage spec tốn 7,84 USD, stage plan 7,09 USD, cộng thêm 0,10 USD cho `/ao-status`. Con số này chưa tính hai lượt bị tắt vì thiếu RAM. Plan ước 10–14 USD cho T17.
- Cả 11 lượt đều có log trong `.ai/runs/DEMO-20/`, và không lượt nào bị hook từ chối. Lượt `ba` bị tắt lần hai có một lần bị chặn nhầm (finding 4 bên dưới); lượt này không được ghi vào `state.json`.

**Tiêu chí:**

- Tiêu chí 4, phần chạy thật, đạt: `merge-gate` merge PR tài liệu sau gate ② mà không cần approval trên GitHub, và `audit` xanh khi deploy commit đó. Phần test đơn vị đã có từ T5 và T15a.
- Task List của plan ghi vai trò cho mọi item, và DEMO-22 có effort `xhigh` (phần plan của tiêu chí 7).
- Mô tả của DEMO-21 có mọi dòng DoR đã được đánh dấu sau khi refine, kể cả dòng "Thuộc Epic có plan đã duyệt".

**Lệch so với plan:**

- Quyết định 10: `/ao-status` và `/ao-spec` được gõ thật qua `claude -p`. Nhưng `/ao-spec` bị tắt vì thiếu RAM, nên phần báo cáo cuối của skill chưa được thử. `/ao-plan` chưa được gõ thật lần nào. Các bước còn lại Claude gọi thẳng `ao-step.mjs`, để bớt một phiên Claude, và vì bản chép trong `ao-pilot` còn lỗi của kit PR #132.
- Mọi lượt agent chạy bằng code của kit (`AO_KIT_DIR`), không bằng bản chép trong `ao-pilot`.

**Finding cho kit:**

1. Sau gate ①, không bước nào đổi `Status` của SPEC và design. Prompt `plan-write` nên bảo `sa` đổi thành `Approved <ngày qua gate ①>`.
2. `openQuestions` đếm mọi gạch đầu dòng cấp một trong mục Open Questions. `sa` viết câu hỏi dạng đoạn in đậm kèm gạch đầu dòng, nên `ao-step` báo 10 câu thay vì 2.
3. Lời dừng trước gate ② chỉ đếm nhãn effort của item con trực tiếp của Epic, không đếm Sub-task. Vì vậy nó báo "none has an effort label", dù DEMO-22 có nhãn.
4. `gh-guard` đọc `2>` trong `ao-pr.mjs 2>&1` thành lệnh con của `ao-pr.mjs`, nên chặn nhầm một lần.
5. Máy 16 GB thiếu RAM hai lần khi agent chạy cùng ba phiên Claude Code khác. Claude Code tắt lệnh nền khi RAM trống xuống dưới khoảng 2–3 GB.

**Sửa finding 1–4 của T17 (2026-11-01):** không chạy agent, test viết trước.

1. Prompt `plan-write` bảo `sa` đổi `Status` của `spec.md` và `design.md` thành `Approved <ngày qua gate ①>`. Ngày lấy từ changelog của Epic, theo UTC.
2. `openQuestions`: khi mục Open Questions có các dòng bắt đầu bằng `Q<n>` (gạch đầu dòng hay đoạn in đậm), chỉ các dòng đó là câu hỏi. Chạy trên đoạn câu hỏi của `sa` ở DEMO-20 thì ra 2 câu.
3. `readChildren` đọc thêm Sub-task của mỗi Story bằng một JQL, nên lời dừng trước gate ② đếm cả nhãn effort của Sub-task.
4. `gh-guard` bỏ qua phần chuyển hướng (`2>&1`, `>file`, `<<EOF` …) khi tách lệnh. `ao-pr.mjs` không có lệnh con thì chỉ in cách dùng, nên được phép.

`npm test`: 777 pass.

## T18: Epic thử: `/ao-build`, `/ao-review`, `/ao-fix` tới merge (2026-11-01)

Mọi lượt chạy đều bằng `ao-step.mjs` của kit (`AO_KIT_DIR`), như ở T17.

**Diễn biến:**

- **17:00, `/ao-build DEMO-21`.** Bước kiểm trả GO: `be-dev` làm DEMO-22 ở `xhigh` (theo nhãn `ao-effort-xhigh`), rồi `fe-dev` làm DEMO-23 ở `high` (mặc định của vai trò).
  - `jira-guard` chặn hai lần việc `be-dev` chuyển DEMO-21 sang In Progress: GitHub trả 401.
  - Nguyên nhân: token cài đặt của App giờ dài 390 ký tự và có dấu `.`, mà `readGitHubToken` cắt token ở dấu chấm đầu tiên. Kit PR #135 sửa.
  - `be-dev` gắn cờ cho DEMO-22, và bạn gỡ cờ.
- **17:14, chạy lại.** `be-dev` làm DEMO-22 xong, với 7 commit. Rồi `ao-step` dừng, báo "DEMO-21 has no ledger": agent ghi ledger theo từng Sub-task. Kit PR #136 sửa.
- **17:31, `fe-dev`.** Code và test xong, nhưng kiểm tay không đạt: ở 320 px, bấm Tab tới nút Xóa thì khung bảng không cuộn tới nút. `fe-dev` gắn cờ DEMO-23 và hỏi bạn chọn A hay B. Bạn comment "chọn B", rồi gỡ cờ lúc 18:46.
- **18:47, PR code.** `fe-dev` thêm `scroll-padding-inline-end:3rem`, chuyển DEMO-23 sang Done, rồi mở ao-pilot PR #16: 13 commit, CI xanh. DEMO-21 sang In Review.
- **`/ao-status` giữa vòng:** 4 lượt, 12,51 USD.
- **19:05, `/ao-review 16`.** `reviewer` chạm giới hạn 5 giờ sau 2 turn. Sau khi reset, lúc 20:22, `reviewer` chạy tiếp trong cùng session:
  - `reviewer` COMMENT với 3 Low;
  - `security` ở `max` không có finding.
- **20:57, `/ao-fix 16` với `--note`.** Ghi chú là câu trả lời của bạn: sửa Low 1 và Low 2 của `reviewer`.
  - `be-dev` sửa và push hai commit, `eb50b47` và `474b375`; CI xanh.
  - Lượt `reviewer` sau đó bị Claude Code tắt vì thiếu RAM, lần thứ ba trong T17–T18.
  - Bạn mở lại Claude Code với `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1`.
- **21:38, `/ao-review 16` lần hai.**
  - `reviewer` review lại cả PR: 1 Medium, 2 Low.
  - `security` chỉ review phần mới, ở `high`, với dòng `Scope: changes since 752f9de`, và không có finding nào.
  - `merge-gate` (run `41318103199`, chạy từ `develop`) ghi `Waiting #16: approval on head 474b375`.
- **21:53, gate ③.** Bạn approve.
  - `merge-gate` squash merge PR #16 bằng `ao-dev`, commit `22327a5`.
  - Deploy run `41318451522`: `audit passed: 22327a5 on develop is the merge of PR #16, which met every gate`.
  - `jira-sync` (run `41318480925`) ghi `Made DEMO-21: Deploy to QA (in-review → ready-for-qa)`, lúc 21:54:38. Story dừng ở đó (plan, quyết định 9).
- **Finding chưa sửa:** bạn chọn merge trước, và chuyển finding Medium cùng một finding Low sang Task DEMO-24. Claude tạo Task này bằng token CI, thuộc DEMO-20, ở trạng thái New.
- **`/ao-status` cuối vòng:** DEMO-20 có 11 lượt, 14,92 USD; DEMO-21 có 10 lượt, 21,27 USD.

**Số đo** (từ `.ai/runs/DEMO-21/state.json`; mọi lượt dùng Opus 5.5):

| # | Lượt | Bước | Effort | Kết quả | Turn | Thời gian | Token vào / ra | Cache đọc / ghi | Chi phí quy đổi | Bị từ chối |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `be-dev` | DEMO-22 build | xhigh | done (gắn cờ) | 29 | 3,3 phút | 48 / 10.733 | 2.266.641 / 133.136 | 1,73 USD | 2 |
| 2 | `be-dev` | DEMO-22 build | xhigh | done | 83 | 12,6 phút | 114 / 59.965 | 7.894.386 / 165.412 | 4,10 USD | 0 |
| 3 | `fe-dev` | DEMO-23 build | high | done (gắn cờ) | 104 | 11,2 phút | 154 / 52.837 | 11.636.397 / 203.235 | 5,01 USD | 0 |
| 4 | `fe-dev` | DEMO-23 build | high | done | 57 | 4,6 phút | 68 / 21.099 | 2.298.765 / 97.840 | 1,66 USD | 2 |
| 5 | `reviewer` | review | xhigh | usage-limit | 2 | 0,2 phút | 2 / 172 | 0 / 21.242 | 0,17 USD | 0 |
| 6 | `reviewer` | review, chạy tiếp | xhigh | done | 33 | 6,4 phút | 60 / 28.588 | 2.903.827 / 153.305 | 2,38 USD | 1 |
| 7 | `security` | review | max | done | 41 | 8,1 phút | 58 / 47.146 | 3.294.467 / 164.511 | 2,92 USD | 0 |
| 8 | `be-dev` | fix | high | done | 12 | 1,8 phút | 22 / 5.789 | 451.361 / 49.863 | 0,61 USD | 0 |
| 9 | `reviewer` | review | xhigh | done | 34 | 8,6 phút | 54 / 25.780 | 2.641.851 / 131.925 | 2,10 USD | 0 |
| 10 | `security` | review-delta | high | done | 14 | 1,7 phút | 24 / 6.033 | 462.471 / 45.875 | 0,58 USD | 0 |
| | Tổng | | | | 409 | 58,3 phút | | | 21,27 USD | 5 |

Các lần bị từ chối:
- lượt 1: `jira-guard` chặn hai lần (lỗi token ở trên);
- lượt 4: hook `block-atlassian` chặn một lệnh Bash có chữ "atlassian", và bộ phân loại của chế độ `auto` (theo `defaultMode` trong `~/.claude/settings.json`) chặn một lệnh;
- lượt 6: `gh-guard` chặn `git archive` của `reviewer`, một vai trò chỉ đọc.

Epic thử tốn tổng cộng 36,19 USD quy đổi (T17: 14,92; T18: 21,27), cộng 0,10 USD cho `/ao-status`. Plan ước 25–36 USD. Con số này chưa tính ba lượt bị Claude Code tắt.

**Tiêu chí:**

- Tiêu chí 5 đạt: `security` review phần mới ở `high` trên PR #16, báo cáo có dòng `Scope`, và `merge-gate` nhận báo cáo đó (chỉ còn chờ approve).
- Tiêu chí 7 đạt:
  - DEMO-22 mang nhãn `ao-effort-xhigh` và chạy ở `xhigh` ở cả hai lượt, theo `state.json`;
  - DEMO-23 không có nhãn, nên chạy ở `high`, mức của roster;
  - Task List của plan ghi vai trò và effort (T17).
- Tiêu chí 8 đạt, với hai chỗ lệch:
  - Mọi lượt agent của Epic đều do `ao-step.mjs` mở, qua `spec`, `plan`, `build`, `review` và `fix`: 21 lượt trong `state.json` của DEMO-20 và DEMO-21, cùng ba lượt bị Claude Code tắt.
  - Claude không mở lượt agent nào bên ngoài lệnh. Mọi lượt chạy xong đều có số đo.
  - Lệch 1: Claude gọi `ao-step.mjs` thay vì gõ lệnh `/`. Chỉ `/ao-status` và `/ao-spec` được gõ thật qua `claude -p`.
  - Lệch 2: ba lượt bị tắt không có số đo.
- Kiểm chứng:
  - 15 commit của PR #16 đều đứng tên `tungph7-ao-dev[bot]`.
  - Panel Development của Jira không đọc được bằng token có scope (`/rest/dev-status` trả 401), nên bạn xem tay ở Checkpoint 4.

**Finding cho kit:**

1. Token App bị cắt ở dấu chấm: đã sửa (PR #135).
2. Ledger theo Sub-task: đã sửa (PR #136).
3. Còn mở: `ao-step` không dừng khi Sub-task sắp làm đang mang cờ, và khi agent gắn cờ, lời dừng chỉ báo "still has to run".
4. Claude Code tắt lệnh nền vì thiếu RAM ba lần trong T17–T18. Cách tránh: chạy ít phiên Claude Code cùng lúc, hoặc mở Claude Code với `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1`.
5. Phiên agent nhận `defaultMode: auto` của bạn, nên bộ phân loại của chế độ `auto` chặn một lệnh của `fe-dev`.
6. Gói Pro chạm giới hạn 5 giờ hai lần (`ux` ở T17, `reviewer` ở T18). Cả hai lần, lượt chạy tiếp trong cùng session sau khi reset.

## Checkpoint 4 (2026-11-01)

- Tiêu chí 4 (T17), 5, 7 và 8 (T18) đạt. Tiêu chí 8 có hai chỗ lệch, đã ghi ở T18.
- Bạn xem lịch sử Epic thử trên `DEMO`, PR #15 và PR #16 trên `ao-pilot`, và `.ai/runs/`, rồi cho qua checkpoint ("qua checkpoint 4, làm tiếp như đề xuất nhé", Phiên 20 · Lượt 24). T19 làm thêm việc sửa lỗi còn mở của T18: `ao-step` không dừng khi Sub-task mang cờ.

## T19: Tài liệu, `SPEC.md` và lưu trữ plan (2026-11-01)

- Sửa lỗi còn mở của T18: `/ao-build` dừng khi một Sub-task chưa xong mang cờ Needs you. Lời dừng bảo bạn trả lời trên Sub-task đó, gỡ cờ và nhãn, rồi chạy lại. Test viết trước; `npm test` 779 pass.
- README có module `dev-workflow` trong danh sách đã xong, mục "Sáu lệnh `/ao-*`", và dòng `ao-step.mjs` trong các lệnh của repo dự án.
- `docs/dev-workflow.md`:
  - sáu lệnh;
  - một vòng Epic từ đầu tới cuối, theo DEMO-20;
  - cách đọc `.ai/runs/`;
  - khi nào lệnh dừng;
  - chạy tiếp sau khi bị ngắt;
  - Git Bash và `MSYS_NO_PATHCONV=1`;
  - chi phí đo được;
  - những điều đã gặp khi chạy thật.
- `tests/repo.test.mjs` kiểm hai tài liệu trên.
- `docs/github-apps-setup.md`: soát lại mục 6 của T2. Quyền của hai App vẫn khớp, không cần sửa.
- `SPEC-dev-workflow.md` và `SPEC.md` ghi module hoàn thành. Plan, todo và file này chuyển vào `tasks/archive/dev-workflow/`.

## Việc để lại cho `release-workflow` và Pilot 1

- **Bản chép kit trong `ao-pilot`** vẫn là bản của PR #14 (kit `86331a9`). Các bản sửa từ T15a tới T19, cùng `account_id` trong `tracker/jira.yaml`, chỉ vào dự án qua một PR chép kit lần hai. PR đó cần `reviewer` và `security` (khoảng 10 USD quy đổi), và do bạn merge. Nên làm trước khi dùng `/ao-*` bằng bản chép, không qua `AO_KIT_DIR`.
- **Bốn lệnh chưa được gõ thật trong một phiên Claude Code:** `/ao-plan`, `/ao-build`, `/ao-review`, `/ao-fix`. `/ao-spec` cũng chưa chạy hết phần báo cáo cuối. Pilot 1 nên đi trọn vòng bằng lệnh `/`.
- **DEMO-21** ở Ready for QA: phần QA và release thuộc `release-workflow`. **DEMO-24** (hai test còn thiếu) ở New, chờ bạn refine.
- **Năm việc chờ bạn quyết,** ghi trong `docs/quality-gates.md`:
  - ruleset phía server, cần repo public hoặc GitHub Pro;
  - App riêng cho quyền Workflows;
  - đưa `--go` ra khỏi luật `allow`;
  - chạy agent dưới user Windows riêng;
  - `GH_TOKEN` hết hạn sau 1 giờ.
- **RAM:** mỗi lượt agent là một phiên Claude Code kèm các server MCP. Trên máy 16 GB, nên chạy ít phiên cùng lúc, hoặc mở Claude Code với `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1`.
- **Phiên agent nhận `defaultMode: auto` của bạn.** Nếu muốn agent chỉ bị hook chặn, đổi `defaultMode` hoặc truyền chế độ quyền riêng cho phiên agent.
- **Panel Development của Jira** không đọc được bằng token có scope. Khi cần kiểm tự động, phải dùng token có scope đọc dev-status.

# Kiểm thật: agent-roster

> **Plan:** [plan.md](plan.md). Mỗi lần kiểm thật ghi ngày, bước đã làm và kết quả. Mỗi lượt chạy agent ghi model, effort, token, chi phí quy đổi theo giá API, thời gian và số lượt. Không ghi token hay key.

## T1: Tiền đề về Claude Code (điểm 1–5)

**Cách kiểm (2026-10-30, khoảng 16:30–17:00):** Claude Code 2.1.314 (spec ghi 2.1.312), chế độ quyền `auto` lấy từ settings của bạn, plugin agent-skills 0.6.13 cài ở scope user. Dự án tạm `probe-project` trong scratchpad, có `git init`, nhiều agent thử chạy Haiku 5.5, file `.claude/rules/probe.md` chứa mã `ZEBRA-4417`, và skill dự án `probe-skill` chứa mã `KESTREL-0921`. Mỗi điểm được kiểm theo hai cách chạy mà spec dùng:

- `claude -p --agent <agent>`: agent là phiên chính.
- Subagent: một phiên `claude -p --model haiku` gọi tool `Agent`. Prompt giao cho subagent không chứa mã cần tìm (đã soát trong input của lệnh gọi `Agent`).

26 lượt chạy, đều bằng Haiku 5.5, tổng 0,076 USD quy đổi theo giá API.

### Kết quả

| Điểm | Subagent | `claude --agent` |
|---|---|---|
| 1. `skills` nạp skill khi agent không có tool `Skill` | **Đúng.** Skill của plugin (`agent-skills:test-driven-development`) và skill của dự án đều được nạp đủ: agent trích đúng gạch đầu dòng cuối của mục Red Flags (dòng 385 trên 398) và biết thư mục skill (`...\agent-skills\0.6.13\skills\test-driven-development`) | **Sai.** Cả skill của plugin lẫn skill của dự án đều không được nạp; agent trả lời "not in context". Input chỉ 3.236 token, trong khi riêng `SKILL.md` của TDD khoảng 4.000 token |
| 2a. `effort` trong frontmatter có hiệu lực | **Đúng.** Cùng một bài đố, cùng phiên chính ở `--effort low`: subagent `effort: max` ra 10.993 token, `effort: low` ra 2.158 token | **Sai.** `effort: max` ra 2.199 và 2.047 token, ngang `effort: low` (2.679 và 2.232) và mức `high` của phiên (2.436 và 2.527). Effort lấy từ setting của phiên (`effortLevel: high` của bạn) |
| 2b. `CLAUDE_CODE_EFFORT_LEVEL` thắng frontmatter | **Đúng.** `effort: max` với biến `low`: 2.326 token; `effort: low` với biến `max`: 7.571 token | Biến có hiệu lực: `max` ra 10.083 và 7.358 token. Cờ `--effort max` cũng có hiệu lực: 9.788 token |
| 3. Nạp `.claude/rules/*.md` | **Đúng.** Trả lời `ZEBRA-4417` và nêu file nguồn | **Đúng** |
| 4. `tools` giới hạn tool ở chế độ auto | **Đúng.** Tool của subagent: `Read`, `Glob`, `SubagentHandback`; không gọi được Bash hay Write | **Đúng.** Sự kiện `init` liệt kê đúng `Read`, `Glob`; không gọi được Bash hay Write |
| Thêm: `maxTurns` | **Đúng.** `maxTurns: 2` dừng sau 2 lượt, kết quả bị đánh dấu dừng giữa chừng | **Sai.** Chạy đủ 5 lượt. Cờ `--max-turns 2` thì có hiệu lực (`error_max_turns`) |

Tài liệu Claude Code khớp với kết quả: `--agent` chỉ áp "tool restrictions and model" của agent, và system prompt của agent thay system prompt mặc định.

**Hai cách nạp skill thay thế ở chế độ `--agent`:**

- `initialPrompt: /agent-skills:test-driven-development` nạp được skill đó. Hai lệnh trên hai dòng thì chỉ lệnh đầu được nạp: dòng sau thành tham số của lệnh đầu.
- `--append-system-prompt-file <file SKILL.md>`: agent trích đúng nội dung skill, vẫn giữ tool `Read`, `Glob` và vẫn nạp rules.

**Điểm 5, plugin khai trong `.claude/settings.json` của dự án: không dùng được để đưa skill tới agent.**

- Quan sát: dự án tạm khai một marketplace inline (`source: settings`) chứa agent-skills ghim theo `sha` `aeac41d4…`, và `enabledPlugins` cho plugin đó. Claude Code bỏ qua cả hai mà không báo lỗi: `claude plugin list` và sự kiện `init` của `claude -p` không có plugin mới, `known_marketplaces.json` và `installed_plugins.json` không đổi. Dự án tạm chưa được trust.
- Theo tài liệu (Plugin loading reference): plugin khai trong settings của dự án chỉ nạp sau khi thư mục được trust, và chạy bằng `-p` thì không đủ. Plugin có nguồn ngoài (như agent-skills, nguồn `github`) không được tải về máy chưa cài; `/plugin` chỉ báo `is enabled in project settings but isn't installed here`. Người dùng phải tự `claude plugin install`.
- Ghim bản: mục agent-skills trong marketplace `addy-agent-skills` không có `ref` hay `sha`, nên ghim marketplace ở tag `0.6.13` không ghim được code của plugin. Ghim đúng chỉ được bằng một marketplace riêng có `sha`, nhưng plugin đó trùng tên manifest `agent-skills` với bản bạn đang cài.
- Claude không cài bản thứ hai của plugin, để không đổi plugin trên máy bạn.

### Kết luận

- Điểm 3 và 4 đúng ở cả hai cách chạy.
- Điểm 1, 2a và `maxTurns` chỉ đúng khi agent chạy làm subagent.
- Điểm 5 sai: settings của dự án không cài được plugin và không ghim được bản.

Theo plan, Claude dừng và đề xuất sửa spec (Phiên 14 · Lượt 1). Bạn duyệt đề xuất ở Phiên 14 · Lượt 2: chép 13 skill của agent-skills vào kit (T9), và viết script `ao-agent.mjs` chạy agent làm phiên chính với `--effort`, `--append-system-prompt-file` và `--max-turns` (T14). Spec mục 1, 2.1–2.3, 2.5, 2.7, 2.12, 3–7, 9, 10 và 12 đã sửa theo đó; `kit/.claude/settings.json` không thêm khóa plugin.

Dọn dẹp: dự án tạm chỉ nằm trong scratchpad; file `.claude/settings.json` thử đã xóa. Claude Code ghi lịch sử các phiên thử vào `~/.claude/projects/` dưới tên thư mục của dự án tạm.

## T2: Tiền đề về trình duyệt (điểm 6–7)

**Cách cài (bạn đồng ý ở Phiên 14 · Lượt 2):** chạy cả hai gói bằng `npx -y <gói>@<bản>`. Gói chỉ được tải vào cache của npm (`%LOCALAPPDATA%\npm-cache\_npx\`); không cài gì toàn cục. Trang thử là một file HTML trong scratchpad, gồm một tiêu đề, dòng `Total: 0`, nút "Add item" (bấm thì thành `Total: 50000`), một `console.log` và một `console.error`. Một server `node:http` tạm phục vụ trang ở `http://127.0.0.1:47210/`.

**Điểm 6, `playwright-cli` 0.1.22 (2026-10-30, khoảng 17:10): đúng.**

- `npx -y @playwright/cli@0.1.22 --version` in `0.1.22`. Gói kéo theo `playwright-core` `1.64.0-alpha-1790635538000`.
- `open --browser=chrome` mở Chrome có sẵn trên máy: `list` báo `browser-type: chrome`, `headed: false`, `user-data-dir: <in-memory>`. Không trình duyệt nào được tải về: thư mục `ms-playwright` không có thư mục trình duyệt mới.
- URL `file:` bị chặn (`Access to "file:" protocol is blocked`), nên trang phải được phục vụ qua HTTP. Server `serve` của T16 đáp ứng điều này.
- `goto`, `snapshot`, `click "getByRole('button', { name: 'Add item' })"`, `screenshot`, `console`, `close` đều chạy:
  - Snapshot là YAML có `ref` (`button "Add item" [ref=e4]`).
  - Ảnh PNG lưu ở `.playwright-cli/` của thư mục đang đứng. Claude mở ảnh và thấy `Total: 50000`.
  - `console` liệt kê 3 dòng: log, error và lỗi 404 của `favicon.ico`.
- Mỗi lần chạy, CLI hỏi npm có bản mới không (ghi `ms-playwright\cli-update-check.json`), trừ khi có biến `NO_UPDATE_NOTIFIER` hoặc `CI`. Kit vì vậy đặt `NO_UPDATE_NOTIFIER=1` trong `env` của `kit/.claude/settings.json`.
- Gói có sẵn một bản skill ở `playwright-core/lib/tools/skills/playwright-cli/SKILL.md`. T9 so bản này với bản ở commit `83368cb3bfc0` của repo `microsoft/playwright-cli` mà spec định chép.

**Điểm 7, Chrome DevTools MCP 1.12.0 (khoảng 17:12): đúng.**

- Dự án tạm có `.mcp.json` với `"command": "npx"`, `args` `["-y", "chrome-devtools-mcp@1.12.0", "--isolated", "--no-usage-statistics", "--no-performance-crux"]` và `env` `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS=1`. Trên Windows không cần bọc bằng `cmd /c`.
- Server được duyệt bằng `enabledMcpjsonServers` trong `.claude/settings.local.json` của dự án tạm. Sự kiện `init` báo `chrome-devtools` `connected`, nguồn `project`. Ở `ao-pilot`, bạn bật server này như đã bật `atlassian`.
- Agent thử `probe-cdt` (Haiku, `effort: low`) chạy bằng `claude -p --agent` với `tools` là `Read` và 10 tool của server. Danh sách tool trong `init` đúng 11 tool đó.
- Agent làm đủ 7 bước, 8 lượt, 0,003 USD:
  - `new_page` mở trang thành page 2.
  - `list_console_messages` trả 3 dòng: `[log] AO-PROBE log line`, `[error] AO-PROBE error line`, và lỗi 404 của `favicon.ico`.
  - `take_snapshot` trả cây có `uid`.
  - `click` bấm được nút.
  - `take_screenshot` trả ảnh, trong đó có `Total: 50000`.
  - `list_network_requests` trả `GET / [200]` và `GET /favicon.ico [404]`.
  - `close_page` đóng page 2.
- Chrome chạy có cửa sổ (mặc định của server). `--isolated` dùng profile tạm: không có thư mục `~/.cache/chrome-devtools-mcp/chrome-profile`, và sau phiên không còn tiến trình Chrome nào của server. Profile Chrome của bạn không bị đụng tới.
- Biến `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS` có tác dụng. Lần chạy `--help` không có biến này đã ghi `~/.cache/chrome-devtools-mcp/latest.json` lúc 17:09. Lượt chạy của agent có biến thì không đụng tới file đó.
- Chưa kiểm: khi client không khai MCP roots, các tool đọc ghi file của server chỉ được dùng thư mục tạm của hệ điều hành. Lần này ảnh được trả thẳng về agent nên không ảnh hưởng; T17 kiểm việc lưu ảnh vào thư mục dự án.

**Tool của sáu nhóm mà `fe-dev` được dùng** (theo `docs/tool-reference.md` ở tag `chrome-devtools-mcp-v1.12.0`), để T8 điền vào roster:

| Nhóm | Tool |
|---|---|
| Điều hướng | `close_page`, `list_pages`, `navigate_page`, `new_page`, `select_page`, `wait_for` |
| Nhập liệu | `click`, `drag`, `fill`, `fill_form`, `handle_dialog`, `hover`, `press_key`, `type_text`, `upload_file`. `click_at` chỉ có khi bật `--experimentalVision`, kit không bật |
| Giả lập | `emulate`, `resize_page` |
| Debug | `evaluate_script`, `get_console_message`, `get_css_styles`, `lighthouse_audit`, `list_console_messages`, `screencast_start`, `screencast_stop`, `take_screenshot`, `take_snapshot` |
| Network | `get_network_request`, `list_network_requests` |
| Hiệu năng | `performance_analyze_insight`, `performance_start_trace`, `performance_stop_trace` |

Các nhóm không cho `fe-dev`:

- Memory: 14 tool, **bật sẵn** trên server.
- Extensions, Third-party, WebMCP, PWA: tắt sẵn.

Bản 1.12.0 không có nhóm WebAuthn như spec mục 2.3 nhắc. Vì `fe-dev` chỉ nhận tool liệt kê trong `tools`, nhóm Memory bật sẵn không ảnh hưởng tới agent. Phiên chính của bạn thì thấy đủ các tool đó.

**Kết luận:** hai điểm đúng. `kit/.mcp.json` thêm server `chrome-devtools` đúng như đã kiểm, có test kiểm bản và các tham số. Dọn dẹp: phiên `playwright-cli` đã đóng; dự án tạm và server tạm chỉ nằm trong scratchpad, server tự dừng sau 30 phút.

## T5–T7: `check-design` và job `policy`

**T5–T6 (2026-10-30):** không có bước kiểm thật nào cần môi trường ngoài. `check-design` có 26 fixture âm (D1–D7) và các ca D8 do test tạo ảnh; mỗi fixture sai đúng một quy tắc. Khi chạy trên ví dụ của `templates/design.md`, `check-design` bắt được một dòng YAML sai cú pháp (`content: "Đã giảm 10%" hoặc "…"`); dòng đó đã được sửa ở T5.

**T7, `check-policy.mjs --base` chạy ở máy (khoảng 17:45): đúng.** Repo tạm trong scratchpad, nhánh `feature/DEMO-2-design` tách từ `develop`, có `docs/specs/DEMO-2/design.md` (bản `tests/fixtures/design/figma.md`) cùng thư mục `design/` gồm một ảnh 1440×4000 và một ảnh thừa, thiếu ảnh mobile. Lệnh `node scripts/check-policy.mjs --base develop --title "docs(specs): add the design (DEMO-2)"` thoát mã 1, in:

```
FAIL  Design
      docs/specs/DEMO-2/design.md:23 D8 design/S1-desktop.png is 1440×4000 px; the long side is at most 2000 px: export the frame in slices
      docs/specs/DEMO-2/design.md:23 D8 design/S1-old.png is in design/ but design.md does not use it
      docs/specs/DEMO-2/design.md:24 D8 design/S1-mobile.jpg does not exist
```

Test của script trong `tests/quality/policy.test.mjs` lặp lại việc này với một `design.md` sai D2. Phần kiểm trên PR thật làm ở T18 (tiêu chí 4).

## T9: Chép skill

**Tải (2026-10-30, khoảng 17:55):** `npm run skills:vendor` tải 16 skill vào `kit/.claude/skills/`: 90 file, 620.981 byte. Mỗi skill có `SOURCE.md` (repo, đường dẫn, commit, ngày của commit, thay đổi, danh sách file) và giấy phép:

- 13 skill của agent-skills: `LICENSE` (MIT) chép từ gốc repo.
- `playwright-cli`, `gha-security-review`: `LICENSE` (Apache-2.0) chép từ gốc repo.
- `sentry-security-review`: `LICENSE` của chính thư mục (phần tham khảo lấy từ OWASP Cheat Sheet Series, CC BY-SA 4.0) và `REPO-LICENSE` (Apache-2.0) chép từ gốc repo. `name:` đổi từ `security-review`.

**Kiểm nguồn gốc:**

- Chạy lại `npm run skills:vendor` sau khi stage: không file nào đổi.
- 14 file của 13 skill agent-skills giống hệt từng byte bản plugin 0.6.13 đang cài ở `~/.claude/plugins/cache/addy-agent-skills/agent-skills/0.6.13/skills/`; `LICENSE` giống hệt `LICENSE` của plugin.
- 12 file của `playwright-cli` (commit `83368cb3bfc0`) giống hệt bản đi kèm gói npm `@playwright/cli` 0.1.22 (`playwright-core/lib/tools/skills/playwright-cli/`), tức skill khớp đúng bản CLI kit dùng.
- `LICENSE` của `playwright-cli` dùng CRLF. `.gitattributes` thêm `kit/.claude/skills/** -text` để git giữ nguyên byte của file chép vào.

**Rà nội dung trước khi commit:** Claude đọc hết `SKILL.md` của ba skill từ registry và tìm trong cả 90 file các mẫu đáng ngờ: `curl | sh`, `base64 -d`, "ignore previous", lệnh gửi dữ liệu ra ngoài, đọc `.env` hay khóa. Các chỗ khớp đều là ví dụ tấn công trong `gha-security-review/references/` (để nhận diện), không phải chỉ dẫn cho agent. 13 skill của agent-skills giống hệt bản plugin bạn đang dùng, nên Claude chỉ tìm các chỗ trái quy ước, không đọc lại từng dòng.

**Chỗ trái quy ước của kit, để prompt ở T11–T12 xử lý:**

| Skill | Skill nói | Kit làm |
|---|---|---|
| `spec-driven-development` | SPEC ở `SPEC.md` gốc repo; plan ở `tasks/plan.md` | `docs/specs/<EPIC-KEY>/spec.md` và `plan.md` |
| `planning-and-task-breakdown` | Danh sách task ở `tasks/todo.md`, trừ khi quy ước dự án chỉ một tracker | Task nằm trên Jira; plan ghi rõ điều đó |
| `code-review-and-quality` | Mức Critical, Required, Optional, Nit | Mức Critical, High, Medium, Low của `review-report.md` |
| `incremental-implementation`, `shipping-and-launch` | Merge từng phần vào nhánh chính sau feature flag; rollback bằng `git revert && git push` | GitFlow: nhánh `feature/*` vào `develop` qua PR; không push lên `develop`, `main`, `release/*`; rollback là việc của `release-workflow` |
| `ci-cd-and-automation` | Ví dụ deploy lên Vercel | Deploy bằng Docker lên VPS, theo `routing.yaml` |
| `sentry-security-review` | Mẫu báo cáo riêng (`VULN-001`, Needs Verification); dùng skill `gha-security-review` hoặc `django-access-review` "nếu có" | Báo cáo theo `review-report.md`, dòng `Role: security`; agent không có tool `Skill`, nên prompt bảo đọc `gha-security-review/SKILL.md` khi PR sửa workflow |
| `gha-security-review` | Chỉ tính kẻ tấn công không có quyền ghi repo; mẫu báo cáo riêng | Báo cáo theo `review-report.md`. T12 cân nhắc thêm trường hợp agent của repo bị nội dung PR dẫn dắt |
| `playwright-cli` | Thiếu lệnh thì `npm install -g @playwright/cli@latest`; đính ảnh vào PR bằng `gh --attach`; ảnh lưu ở `.playwright-cli/` | Không cài gì: chạy `npx -y @playwright/cli@0.1.22` hoặc Playwright của dự án; không dùng `gh`; bằng chứng lưu ở `.ai/qa/<KEY>/`; không dùng `--persistent` hay `--profile` |
| `sentry-security-review`, `gha-security-review` | `allowed-tools: Read Grep Glob Bash Task` | `allowed-tools` của skill không thêm tool cho agent; `security` không có tool `Agent` (tên cũ `Task`) |

## T14: Chế độ dự án và `ao-agent.mjs`

**Chạy thật một lượt (2026-10-30, khoảng 18:20):** trong dự án tạm của T1, với `kit/.claude/agents/reviewer.md` và skill `code-review-and-quality` chép vào `.claude/`, lệnh `AO_KIT_DIR=<kit> node <kit>/scripts/ao-agent.mjs reviewer -p "..." --model haiku --output-format json` chạy `claude --agent reviewer --effort xhigh --append-system-prompt-file .ai/agents/reviewer.skills.md -p ... --model haiku`. Agent:

- trích đúng dòng `Nit` trong bảng mức của skill: skill được nạp khi agent chạy làm phiên chính;
- trích đúng câu của mục Session ("You run unattended (claude -p) ...");
- nêu đúng phần hợp đồng và phần viết tay của prompt reviewer.

1 lượt, Haiku 5.5, 14.852 token vào, 868 token ra, 0,003 USD.

## T15: Bản chép kit vào `ao-pilot` qua PR

**PR:** [ao-pilot #8](https://github.com/TungPH7/ao-pilot/pull/8), Task [DEMO-9](https://phunghuutung12b4.atlassian.net/browse/DEMO-9) (tạo bằng token CI, để ở New), nhánh `feature/DEMO-9-agent-roster`. PR do `tungph7-ao-dev[bot]` mở bằng `ao-pr.mjs create`. `merge-gate` in `Needs you #8: it changes .ai-orchestrator/...`, vì PR sửa đường dẫn được bảo vệ.

**Ba commit:**

1. `a8a3b3f`: chép kit ở commit `0e9e12c` theo các bước của README: `.ai-orchestrator/` thêm `agents/`, `templates/`, `ao-agent.mjs`, `render-agents.mjs`, `check-design.mjs`; `.claude/agents/` (mười agent, thay bốn agent thử) và `.claude/rules/ai-orchestrator.md` sinh bằng `--project .`; 16 skill; settings có `attribution` và `NO_UPDATE_NOTIFIER`; `gh-guard` mới; `.mcp.json` có `chrome-devtools`; `.ai/` vào `.gitignore`. 150 file, phần ngoài skill là 60 file, 3.511 dòng thêm.
2. `eef4af8`: CI đỏ ở bước Coverage of changed lines: `.claude/hooks/gh-guard.mjs is not in any lcov file`. Hook là mã của kit, có test ở kit. `quality/gates.yaml` loại `.claude/**` khỏi coverage như đã loại `.ai-orchestrator/**` (kit PR #91). Lỗi này chưa lộ ra trước đây vì lần chép kit của `quality-gates` T18 được push thẳng, không qua PR.
3. `3e41cf0`: các bản vá `gh-guard` sau hai lượt review đầu (kit PR #92, #93), và `eslint.config.mjs` bỏ qua `.ai/`. Hai agent review viết script thử vào `.ai/`, làm lint của `precommit` đỏ.

**Kiểm của Claude trước khi mở PR:** `render-agents.mjs --project . --check` báo 11 file mới; 90 file trong `.claude/skills/` giống từng byte bản trong kit; mười agent giống bản sinh của kit, file quy ước chỉ khác key của space; `ao-agent.mjs reviewer|security --ao-dry-run` ra `--effort xhigh` và `--effort max`; `.ai/agents/*.skills.md` bị git bỏ qua (21 KB cho `reviewer`, 30 KB cho `security`).

### Lượt chạy

Mọi lượt: `node .ai-orchestrator/scripts/ao-agent.mjs <role> -p "<prompt>" --output-format stream-json --verbose` trong `ao-pilot`, Opus 5.5, prompt "Review PR #8." kèm hai câu: 16 skill chép vào đã được so từng byte, chỉ liệt kê, không đọc; đọc diff bằng `git diff origin/develop...origin/feature/DEMO-9-agent-roster -- . ':!.claude/skills'` thay cho `gh pr diff 8` (khoảng 800 KB).

| Lượt | Commit | Effort | Lượt model | Thời gian | Token ra | Cache đọc | Cache ghi | Quy ra USD | Kết quả |
|---|---|---|---|---|---|---|---|---|---|
| `reviewer` 1 | `eef4af8` | xhigh | 29 | 6 ph 39 s | 36.177 | 1.856.947 | 121.937 | 2,071 | COMMENT: 2 Medium, 4 Low |
| `security` 1 | `eef4af8` | max | 16 | 2 ph 43 s | 14.251 | 264.664 | 49.931 | 0,737 | Dừng vì hết giới hạn 5 giờ của bạn |
| `security` 1b | `eef4af8` | max | 34 | 12 ph 55 s | 74.238 | 2.250.576 | 156.824 | 3,190 | Dừng không đăng báo cáo: `gh-guard` chặn `git config --get core.hooksPath` |
| `reviewer` 2 | `3e41cf0` | xhigh | 28 | 11 ph 7 s | 60.769 | 1.367.687 | 104.348 | 2,324 | COMMENT: 2 Medium, 6 Low |
| `security` 2 | `3e41cf0` | max | 59 | 22 ph 27 s | 132.231 | 7.492.768 | 229.348 | 5,978 | Ghi xong báo cáo (2 Medium, 2 Low, kết luận COMMENT) rồi dừng vì hết giới hạn 5 giờ, trước bước đăng |

**Báo cáo `security` do Claude đăng:** lượt `security` 2 dừng ngay sau lần `Write` cuối của `.ai/reviews/8-security.md`. File đủ mọi mục của template, có dòng `Role: security` và kết luận Approve, tức COMMENT. Claude đăng nguyên file bằng `ao-pr.mjs review 8 --event COMMENT` với App `ao-review` (2026-10-30 22:08), thay vì chạy lại thêm khoảng 6 USD. Sau đó `merge-gate --dry-run` chỉ còn thiếu `approval on head 3e41cf0`.

Tổng sáu lượt: 14,30 USD quy đổi, trong đó 3,93 USD là hai lượt `security` không ra báo cáo.

Cột USD là `total_cost_usd` của Claude Code, quy theo giá API; bạn dùng gói Pro, nên con số này chỉ để so mức tốn usage giữa các lượt.

### Agent làm gì

- **`reviewer`**: đọc PR, template, item, đọc diff theo từng nhóm file, rồi tự viết script thử `checkAgentCall` của `gh-guard` (17 lệnh ở lượt 1, 29 lệnh chặn và 18 lệnh đọc ở lượt 2) trong `.ai/reviews/tmp-8/`. Hai lượt đều đăng báo cáo bằng `tungph7-ao-review[bot]`, đúng template, có dòng `Role: reviewer`.
- **Lượt 1 của `reviewer` làm trái luật chung:** `gh-guard` chặn một lệnh thử có chữ `gh auth token`, và agent bỏ lệnh đó rồi làm tiếp. Luật lúc ấy ghi "quote its reason in your answer and stop".
- **`security` 1b làm đúng luật đó:** bị chặn một lệnh đọc nó tự thêm, agent dừng và không đăng báo cáo. Luật được sửa ở kit PR #93: việc không cần lệnh bị chặn thì làm tiếp; việc cần thì dừng. Ở lượt 2, `reviewer` bị chặn `git branch --show-cur` (viết tắt) và làm tiếp, đúng luật mới.
- **Git Bash đổi `origin/<branch>:<path>`** thành danh sách đường dẫn Windows (`origin\feature\...;.ai-orchestrator\...`), làm `git show` lỗi. `reviewer` 1 tự tìm ra `MSYS_NO_PATHCONV=1`. Kit PR #93 thêm mục Shell vào file quy ước.

### Finding và cách xử lý

| Từ | Mức | Finding | Xử lý |
|---|---|---|---|
| `reviewer` 1 | Medium | `gh-guard` chỉ biết `-c`, `-C` nhận giá trị: `git --namespace log push --no-verify origin HEAD:develop` lọt với `be-dev`, `git --work-tree status checkout develop` lọt với `reviewer` | Sửa: kit PR #92 (`lib/quality/git-options.mjs`) |
| `reviewer` 1 | Medium | Hợp đồng giao `qa` tạo `regression-report` trong Git (`docs/releases/vX.Y.Z.md`), nhưng roster cho `qa` chỉ ghi `.ai/**` và git chỉ đọc | Chưa sửa: hỏi bạn, liên quan module `release-workflow` |
| `security` 1b | Medium | Lệnh bọc trong `sh -c`, `env` lọt qua; `gh` chạy bằng login admin của bạn | Sửa phần `sh -c`, `bash -c`, `env`, `command`, `exec`: kit PR #93. Phần còn lại là giới hạn đã biết |
| `security` 1b | Medium | Kiểm token trên chuỗi thô: `gh auth "token"` lọt | Sửa: kit PR #93 |
| `security` 1b | Low | Đường dẫn có `..` không được chuẩn hoá: `.ai/../src/cart.ts` | Sửa: kit PR #93, áp dụng cho cả đường dẫn được bảo vệ |
| `security` 1b | (chặn nhầm) | `git config --get core.hooksPath` bị chặn | Sửa: kit PR #93 |
| `reviewer` 2 | Medium | Còn những cách bọc khác lọt qua: `timeout`, `env -C`, `env -S`, `eval`, `bash -c --`, option viết tắt `--no-veri`, biến `GIT_CONFIG_*`, `-c alias.*`. `develop` và `main` không có branch protection (repo private gói Free) | Giới hạn đã biết của `gh-guard` (chú thích đầu `commands.mjs`); soft mode đã chốt ở `quality-gates`, `audit` bắt sau khi merge. Đề xuất cho kit: tìm `git`, `gh` ở mọi vị trí trong lệnh |
| `security` 2 | Medium | Agent chạy `gh` và `git` bằng danh tính của bạn, người duy nhất trong `AO_APPROVERS`, có quyền ADMIN. Vẫn lọt: push không qua hook bằng biến `GIT_CONFIG_COUNT/KEY/VALUE`, lấy token bằng `gh auth git-credential get` hoặc `git credential fill`, approve qua `gh alias set` | Chưa sửa: hỏi bạn. Đề xuất của agent: `ao-agent.mjs` chạy agent với `GH_CONFIG_DIR` và `GH_TOKEN` riêng, không thuộc `AO_APPROVERS` |
| `security` 2 | Medium | Needs verification: `fe-dev` (Chrome DevTools MCP) và `qa` (`playwright-cli`) đọc nội dung trang web và có Bash. Tool của `chrome-devtools` không đi qua `gh-guard`; `navigate_page` mở được `file:///` vì option `fileNavigations` mặc định bật; `.mcp.json` không nằm trong `protected_paths` | Chưa sửa: cần trước T17. Đề xuất: `--no-file-navigations` và mẫu URL cho phép trong `.mcp.json`, đưa `.mcp.json` vào `protected_paths` |
| `security` 2 | Low | Đường dẫn `\\?\D:\...` và đường dẫn khác hoa thường qua được luật ghi; vai chỉ đọc ghi được mọi chỗ ngoài dự án; `bash -c -- '...'`, `eval`, `time` chưa được mở | Ghi lại, sửa ở lần chép kit sau |
| `reviewer` 1, 2 | Low | Trên Windows, `.Claude/...` (khác hoa thường) lọt luật đường dẫn được bảo vệ; `git diff --output=<file>`, `git fetch origin x:develop` bị coi là lệnh đọc; `package.json` của bản chép có script `gh:protect`, `skills:vendor` không có file; `ao-agent.mjs` gọi `claude` không qua shell (cài bằng npm thì chỉ có `claude.cmd`) | Ghi lại, sửa ở lần chép kit sau |

### Điều quan sát thêm

- **`chrome-devtools` khởi động trong `claude -p` dù chưa được bật:** `.claude/settings.local.json` chỉ bật `atlassian`, và `~/.claude.json` không ghi gì cho `ao-pilot`. Lượt đầu báo `pending`, các lượt sau báo `connected`. `reviewer` và `security` không có tool của server này. Cần xem lại ở T17.

### Merge

Bạn approve PR #8 trên `3e41cf0` lúc 22:24 và squash merge lúc 22:25 thành `5f030ae` trên `develop`. Deploy chạy job `audit` trước: `audit passed: 5f030ae on develop is the merge of PR #8, which met every gate`. Sau đó job `deploy` chạy, `jira-sync` xanh, và DEMO-9 vẫn ở New. Bạn cũng bật `chrome-devtools` cho dự án: `.claude/settings.local.json` của `ao-pilot` giờ có `enabledMcpjsonServers: [atlassian, chrome-devtools]`.

Bạn đồng ý hai đề xuất (2026-10-30 22:29):

- Agent tiếp tục chạy `gh` và `git` bằng login của bạn trong sandbox `ao-pilot`. Điều này được ghi thành rủi ro. Trước Pilot 1, agent sẽ có danh tính GitHub riêng, không nằm trong `AO_APPROVERS` (module `dev-workflow`). Các lỗ cụ thể của `gh-guard` được vá dần trong kit.
- `.mcp.json` của kit thêm `--no-file-navigations` và vào `protected_paths`. Bản vá chưa chép vào `ao-pilot` trước T17.

## T16: Trang giỏ hàng tối thiểu và Playwright trong `ao-pilot`

**PR:** [ao-pilot #9](https://github.com/TungPH7/ao-pilot/pull/9), Story [DEMO-10](https://phunghuutung12b4.atlassian.net/browse/DEMO-10) (AC1, AC2; không thuộc Epic; vẫn ở New), nhánh `feature/DEMO-10-cart-page`, do `tungph7-ao-dev[bot]` mở. Item là Story, không phải Task, vì prompt của `reviewer` coi một Task đổi UI là finding High.

**Nội dung:**

- `src/page.ts` dựng trang HTML ở server từ `total` và `shipping` của `src/cart.ts`, escape tên sản phẩm, định dạng tiền bằng `Intl.NumberFormat('vi-VN')`.
- `src/server.ts` là server `node:http`. Server chỉ nghe ở `127.0.0.1`, CSP không cho script, path khác trả 404, method khác trả 405. Lệnh chạy: `npm run serve`.
- `@playwright/test` 1.64.1, ghim bản, bạn đồng ý cài lúc 22:44. Lệnh cài không tải trình duyệt: `ms-playwright` không đổi kể từ T2.
- `playwright.config.ts` chạy với `channel: 'chrome'` và tự bật server ở cổng 3100. `e2e/cart.spec.ts` có hai test `AC1 …`, `AC2 …`. Lệnh: `npm run test:e2e`.
- README của `ao-pilot` được viết lại.

Claude chọn dựng trang ở server, không có JavaScript trên trình duyệt. Lý do: cổng coverage đòi mọi file mã nguồn có trong lcov, và dựng ở server thì test được hết bằng `node:test`.

**Kiểm của Claude:**

- 36 unit test, sau vòng sửa là 38.
- Coverage của dòng đổi 96,8%, sau vòng sửa 96,9%.
- E2E 2/2 xanh trong Chrome có sẵn. Đổi giá trị mong đợi thành 43.000 ₫ thì AC2 đỏ.

### Lượt chạy

Prompt: "Review PR #9." Bản `gh-guard` trong `ao-pilot` vẫn là bản của kit `d49aa51`, chưa có PR #95–#97.

| Lượt | Commit | Effort | Lượt model | Thời gian | Token ra | Cache đọc | Cache ghi | Quy ra USD | Kết quả |
|---|---|---|---|---|---|---|---|---|---|
| `reviewer` 1 | `0f4bc40` | xhigh | 28 | 5 ph 53 s | 29.277 | 1.428.437 | 87.348 | 1,570 | REQUEST_CHANGES: 1 High, 5 Low |
| `reviewer` 2 | `df09e34` | xhigh | 29 | 6 ph 48 s | 25.885 | 1.442.810 | 66.151 | 1,336 | COMMENT: 3 Low |
| `security` | `df09e34` | max | 55 | 12 ph 6 s | 69.174 | 3.889.105 | 153.877 | 3,393 | COMMENT: không có finding |

Tổng ba lượt là 6,30 USD quy đổi, so với 14,30 USD của T15. `security` ở `max` vẫn tốn gấp 2–2,5 lần `reviewer`.

### Agent làm gì

- **`reviewer` 1** chép file của nhánh vào `.ai/reviews/tmp-9/head/` bằng `git show`, vì `git archive` bị chặn ở vai trò chỉ đọc. Trên bản chép đó, nó chạy unit test và E2E, rồi thử 11 đột biến code (test bắt được 9).
  - Nó gửi thử các request lạ và tìm ra finding High: `GET //` làm `new URL('//', 'http://localhost')` ném lỗi trong handler, server thoát với mã 1. Mở `http://127.0.0.1:3100//` trong Chrome cũng sập. Còn `//evil.example/` thì trả 200.
  - Nó đề xuất cách sửa một dòng, và đã thử cách đó trên bản chép.
- **Vòng sửa của Claude** (`df09e34`):
  - Path là request target tới trước dấu `?`, đọc nguyên văn.
  - Trang được dựng một lần trong `cartServer()`.
  - `engines.node` thành `>=24.2`, bản đầu tiên có `import.meta.main`.
  - Test kiểm `nosniff` ở 404 và 405.
  - CSP thêm `base-uri 'none'; form-action 'self'; frame-ancestors 'none'`.
  - Test dùng `TestContext`.

  Với test mới và `server.ts` cũ, `node --test` treo rồi bị dừng, vì server sập ngay trong tiến trình test.
- **`reviewer` 2:** cả sáu finding của vòng 1 đã sửa; test bắt được 17/18 đột biến. Còn lại ba finding Low:
  - test hồi quy treo thay vì đỏ (đề xuất `AbortSignal.timeout`);
  - `package-lock.json` còn ghi `engines` cũ;
  - mô tả PR đã cũ. Claude sửa mô tả mà không đổi commit.
- **`security`:**
  - gửi 18 request lạ: `Host` khác, markup trong path, header kiểu smuggling, body 8 MB;
  - so hash trong lockfile với registry và provenance của ba gói Playwright; `npm audit signatures` xác minh được chữ ký;
  - tìm chỉ dẫn ẩn trong PR, README, comment và cả ký tự Unicode ẩn: không thấy.
- **Bị chặn nhầm:** cả hai agent bị `gh-guard` chặn `grep … ao-pr.mjs` ("reviewer uses the review App, which runs ao-pr.mjs review, not undefined"). Hai agent đều làm tiếp theo luật mới. Kit PR #97 sửa: chỉ xét lệnh mà chương trình là `node`.

### Ghi chú của `security` cho Epic mã giảm giá (T18)

1. **CSRF:** `form-action 'self'` không chặn trang khác post vào server. Form mã giảm giá cần kiểm `Origin` hoặc dùng token CSRF, và giới hạn cỡ body.
2. **Server nhận mọi `Host`:** một trang độc hại đọc được trang này qua DNS rebinding. Khi trang có dữ liệu thật hoặc nhận thay đổi, server chỉ nên trả lời đúng địa chỉ của nó.
3. **`quantity` không được escape:** điều này an toàn chỉ vì giỏ được kiểm trước khi dựng trang. Mã giảm giá hiện lại cho người dùng phải được escape.

### Merge

Bạn approve PR #9 trên `df09e34` lúc 23:32:00. 34 giây sau, `merge-gate` squash merge PR bằng `tungph7-ao-dev[bot]` thành `6c25b8b` trên `develop`. Lần này bạn không phải merge tay, vì PR không sửa đường dẫn được bảo vệ. Deploy chạy `audit` trước: `audit passed: 6c25b8b on develop is the merge of PR #9, which met every gate`. Sau đó job deploy chạy, và `jira-sync` xanh. DEMO-10 vẫn ở New, vì Story chưa bao giờ được Start: không có Epic, không có plan.

## T17: Trình duyệt: `qa` và `fe-dev` chạy thử

Trang giỏ hàng của T16 chạy bằng `npm run serve` ở `http://127.0.0.1:3000/` (commit `6c25b8b`). Mỗi agent được dặn rằng đây là lượt thử tool trình duyệt: không đăng báo cáo QA, không đổi code, nhánh hay Jira.

| Lượt | Effort | Lượt model | Thời gian | Token ra | Cache đọc | Cache ghi | Quy ra USD |
|---|---|---|---|---|---|---|---|
| `qa` (`playwright-cli`) | high | 9 | 59 s | 2.975 | 180.974 | 33.445 | 0,363 |
| `fe-dev` (Chrome DevTools MCP) | high | 7 | 20 s | 902 | 200.812 | 50.812 | 0,465 |

**`qa`:**

- Agent đọc DEMO-10, thấy dự án đã có Playwright, nên chạy `npx --no-install playwright cli` của Playwright 1.64.1 trong dự án, thay cho `npx -y @playwright/cli@0.1.22`. Prompt của `qa` cho phép cách này. Không có gì được cài.
- Các lệnh đã chạy: `open http://127.0.0.1:3000/ --browser=chrome`, `snapshot --filename=.ai/qa/DEMO-10/cart-snapshot.yml`, `screenshot --filename=.ai/qa/DEMO-10/cart.png`, `eval` đọc các `data-testid`. Sau cùng agent đóng trình duyệt.
- Agent chấm AC1 và AC2 đều PASS. Mỗi kết luận trích ref và số dòng của snapshot, kèm locator `getByTestId(...)`.
- Agent còn ghi chú rằng font vẽ ₫ giống chữ "đ" gạch dưới, nhưng text của trang vẫn là ₫, nên đó không phải lỗi.
- Lệnh `open` tự ghi một snapshot vào `.playwright-cli/` ở gốc dự án. Thư mục này không có trong `.gitignore`. Claude đã xoá nó; T22 ghi vào hướng dẫn cài kit rằng dự án cần bỏ qua `.playwright-cli/` (cùng với `.ai/`).

Snapshot `.ai/qa/DEMO-10/cart-snapshot.yml`:

```yaml
- main [ref=e2]:
  - heading "Giỏ hàng" [level=1] [ref=e3]
  - table [ref=e4]:
    - rowgroup [ref=e5]:
      - row [ref=e6]:
        - columnheader "Sản phẩm" [ref=e7]
        - columnheader "Đơn giá" [ref=e8]
        - columnheader "Số lượng" [ref=e9]
        - columnheader "Thành tiền" [ref=e10]
    - rowgroup [ref=e11]:
      - row [ref=e12]:
        - cell "Bút bi" [ref=e13]
        - cell "5.000 ₫" [ref=e14]
        - cell "3" [ref=e15]
        - cell "15.000 ₫" [ref=e16]
      - row [ref=e17]:
        - cell "Sổ tay" [ref=e18]
        - cell "12.000 ₫" [ref=e19]
        - cell "2" [ref=e20]
        - cell "24.000 ₫" [ref=e21]
  - generic [ref=e22]:
    - term [ref=e23]: Tạm tính
    - definition [ref=e24]: 39.000 ₫
    - term [ref=e25]: Phí vận chuyển
    - definition [ref=e26]: 3.000 ₫
    - term [ref=e27]: Tổng cộng
    - definition [ref=e28]: 42.000 ₫
```

![Ảnh của qa](images/t17-qa-cart.png)

**`fe-dev`:**

- Agent gọi lần lượt `new_page`, `list_console_messages`, `list_network_requests`, `take_screenshot` và `close_page`.
- Console: `<no console messages found>`.
- Network: `reqid=1 GET http://127.0.0.1:3000/ [200]`, đúng một request, vì trang không có script hay file ngoài.
- Ảnh lưu thẳng vào `D:\...\ao-pilot\.ai\fe-dev\DEMO-10\cart.png`. Như vậy câu hỏi còn treo từ T2 đã có câu trả lời: với Claude Code 2.1.314, tool ghi file của server không bị giới hạn trong thư mục temp, và lưu được vào thư mục dự án.

![Ảnh của fe-dev](images/t17-fe-dev-cart.png)

**`chrome-devtools` trong `claude -p`:** lần này server đã được bật (`enabledMcpjsonServers` có `chrome-devtools`). Lúc khởi động, `fe-dev` thấy server `connected`, `qa` thấy `pending`. Ở T15, khi chưa bật, server cũng đã chạy trong các lượt `-p`. Vậy trong chế độ `-p`, Claude Code khởi động server của `.mcp.json` dù bạn chưa duyệt. Chỉ agent có tool của server mới gọi được server đó.

Tiêu chí 12 của spec mục 9 đạt.

## T18: Epic thử: spec và plan

Bạn chọn chạy tiếp theo plan ở Checkpoint 3, `security` giữ effort `max` (Phiên 15 · Lượt 1).

### Chuẩn bị

- Epic **DEMO-11** "Mã giảm giá cho giỏ hàng", do Claude tạo bằng token CI (`orchestratorci`) lúc 00:22 ngày 2026-10-31, ở New, không có Figma. Mô tả gồm:
  - mục tiêu, phạm vi và ràng buộc của tính năng;
  - ba ghi chú của `security` ở T16: CSRF, `Host`, escape mã giảm giá;
  - hai finding Low của `reviewer` ở T16 chưa sửa: test hồi quy treo, `engines` trong `package-lock.json`.
- Nhánh tài liệu `feature/DEMO-11-spec` trên `ao-pilot`, tách từ `develop` `6c25b8b` (plan, quyết định 6).
- Bản chép kit trong `ao-pilot` vẫn là bản của T15. Kit PR #95–#97 chưa có trong đó.

### Stage spec

Bạn bấm `Start spec` lúc 00:29:59, và DEMO-11 sang Specifying. Mỗi lượt chạy bằng `ao-agent.mjs <role> -p` trong `ao-pilot`, trên nhánh `feature/DEMO-11-spec`. Claude trả lời thay bạn các câu hỏi mở của `ba` và `ux`, bằng một lượt `--resume` (plan, quyết định 5).

| Lượt | Model, effort | Lượt model | Thời gian | Token ra | Cache đọc | Cache ghi | Quy ra USD | Kết quả |
|---|---|---|---|---|---|---|---|---|
| `ba` 1 | Opus, xhigh | 19 | 7 ph 24 s | 40.268 | 1.092.407 | 100.015 | 1,824 | `spec.md` (`582c5dd`): 3 user story, AC1–AC11, 7 câu hỏi mở |
| `ba` 2 (`--resume`) | Opus, xhigh | 4 | 2 ph 4 s | 15.272 | 433.298 | 16.768 | 0,526 | `490b252`: Open Questions trống |
| `ux` 1 | Sonnet, xhigh | 26 | 3 ph 51 s | 30.368 | 657.735 | 86.868 | 0,717 | `design.md` (`e67e4a3`): S1, 9 khối, `Design OK` ngay lần đầu, 10 câu hỏi mở |
| `ux` 2 (`--resume`) | Sonnet, xhigh | 14 | 1 ph 14 s | 9.732 | 472.423 | 15.995 | 0,209 | `1d81b10`: đã ghi câu trả lời, nhưng còn để lại danh sách câu hỏi cũ |
| `ux` 3 (`--resume`) | Sonnet, xhigh | 7 | 37 s | 3.453 | 743.478 | 6.670 | 0,135 | `172df6d`: xóa danh sách cũ |
| `sa` 1 | Opus, xhigh | 22 | 5 ph 36 s | 33.065 | 1.152.780 | 92.253 | 1,630 | `4484a0b`: yêu cầu phi chức năng, Tech Stack, 1 câu hỏi mở (Q8) |
| `sa` 2 (`--resume`) | Opus, xhigh | 9 | 44 s | 4.027 | 572.507 | 7.595 | 0,256 | `aa38d59`: Q8 thành quyết định |

Bảy lượt của stage spec tốn 5,30 USD quy đổi: `ba` 2,35, `ux` 1,06, `sa` 1,89. Không lượt nào bị hook chặn.

**Số đo của lượt `--resume` là số cộng dồn.** Với `claude -p --resume`, event `result` (`total_cost_usd`, `modelUsage`, `duration_api_ms`) cộng cả các lượt trước của cùng phiên. Ví dụ, cache đọc của `ba` 2 cộng từ các message trong stream là 433.298, đúng bằng 1.525.705 trong `result` trừ 1.092.407 của `ba` 1. Bảng trên ghi hiệu số. `duration_api_ms` của `ux` 3 là 312 s, trong khi lượt đó chạy 37 s. T15–T17 không có lượt `--resume` nào, nên số đo của chúng không bị ảnh hưởng. Token ra của lượt `--resume` cũng lấy hiệu số của `result`, vì message trong stream chỉ ghi một phần số token ra.

**Câu trả lời Claude đưa thay bạn:**

- Q1–Q7 của `ba`: đồng ý cả bảy đề xuất (mã `GIAM10` và `GIAM20K`, làm tròn xuống, phí vận chuyển tính trên tạm tính trước giảm, kiểm `Origin`, body tối đa 1.024 byte, câu chữ, `test.describe('DEMO-11', …)`). Claude thêm hai điều:
  - Cấm `Referrer-Policy: no-referrer`, vì khi đó Chrome gửi `Origin: null` và AC9 chặn chính form của trang.
  - Ba user story gom vào một Story Jira có Sub-task BE và Sub-task FE, để T19 chỉ có một PR.
- Q1–Q10 của `ux`: đồng ý cả mười đề xuất, gồm `maxlength="64"`, `autofocus` khi có lỗi, `POST /` trả thẳng 200.
- Q8 của `sa`: tạo server với `createServer({ requireHostHeader: false })`. Nếu không có tùy chọn này, Node tự trả 400 với body rỗng cho request HTTP/1.1 thiếu `Host`, trước khi code của server chạy.

**Agent làm gì:**

- `ba` đọc Epic, code, hai báo cáo review của PR #9, và chạy thử `formatMoney(-3900)` để ghi đúng chuỗi trong AC. Nó đưa ba ghi chú của `security` thành AC8–AC11, và hai finding Low của `reviewer` vào Technical requirements. Nó cũng thấy tên E2E `AC1`, `AC2` của DEMO-10 sẽ trùng với AC1, AC2 của Epic.
- `ux` vẽ S1 ở desktop và mobile, 9 khối trỏ tới AC1–AC8. Ở lượt 2, nó báo các câu hỏi đã rời Open Questions, trong khi danh sách cũ vẫn còn; lượt 3 xóa danh sách đó.
- `sa` chạy thử từng hành vi của Node mà quy tắc mới dựa vào, trên Node 24.17.0:
  - Handler `async` đọc body bằng `for await` mà không có `try/catch` làm sập cả server khi client ngắt giữa chừng (`Error: aborted`). Đọc bằng event `data` và `end` thì server vẫn chạy.
  - Hai header `Host` thì Node giữ cái đầu, nên server đếm bằng `rawHeaders`.
  - Hai header `Origin` thì Node nối bằng `", "`, nên phép so khớp chính xác đã từ chối.

### Job `policy` trên PR thử (tiêu chí 4)

1. Nhánh tạm `feature/DEMO-11-design-check` tách từ `aa38d59`. Commit `7837c26` đổi `[9] Tổng cộng` thành `[10]` trong bản vẽ desktop của S1. Pre-commit không kiểm `design.md`, nên commit đi qua ở máy.
2. Claude mở PR #10 vào `develop` bằng `ao-pr.mjs create`; người mở là `tungph7-ao-dev[bot]`.
3. CI run 41102589131: `policy` đỏ sau 11 s, với dòng:

   ```
   FAIL  Design
         docs/specs/DEMO-11/design.md:45 D2 [10] of S1 has no entry under blocks in its YAML
   ```

   Conventions, Suppressions, Thresholds và Dependencies đều `ok`, kể cả bảy commit do agent viết.
4. Commit `a1f8b36` đặt lại `[9]`. CI run 41103610563: bốn job xanh, có dòng `ok  Design`.
5. `jira-sync` của PR in `pull_request: DEMO-11` và `No change`, vì từ Specifying, Epic chỉ có transition của người. `merge-gate` in `Waiting #10: reviewer report on head a1f8b36; security report on head a1f8b36; approval on head a1f8b36`.
6. Claude đóng PR #10 kèm comment và xóa nhánh tạm. DEMO-11 vẫn ở Specifying.

Tiêu chí 4 của spec mục 9 đạt, cả phần kiểm trên PR thật. Nhánh `feature/DEMO-11-spec` được push để bạn đọc; push nhánh `feature/*` không chạy CI.

### Quan sát

- **Chỉ dẫn của tổ chức đi vào phiên của agent.** Câu trả lời của `ba`, `ux` và `sa` gắn nhãn `[Unverified]` và `[Inference]` theo chỉ dẫn "Reality filter" của tài khoản. Nhãn cũng nằm trong tài liệu đã commit: 6 chỗ trong `spec.md`, 2 chỗ trong `design.md`. [Inference] Mọi dự án chạy bằng tài khoản này đều có hành vi đó; T22 ghi vào tài liệu.
- **Connector của claude.ai cũng được nối.** Event `init` của mỗi lượt liệt kê cả connector của tài khoản: Claude Docs và Microsoft 365 ở `connected`; Figma, Notion, Google Sheets, Atlassian Rovo ở `needs-auth`. Agent không gọi được chúng: số tool của `ba` là 12, đúng bằng danh sách `tools` của nó.
- **`docs/sdlc.md` không có trong dự án.** Template `spec.md` trỏ tới file này để lấy DoD, nhưng bản chép kit không có nó. `ba` lấy DoD từ `.ai-orchestrator/contract/work-items.yaml`. T22 sửa đường trỏ, hoặc chép file vào dự án.

### Stage plan

Bạn bấm `Approve spec` lúc 01:19:17, và DEMO-11 sang Planning. `sa` và `ba` chạy mỗi agent một phiên mới. Prompt dặn `sa` ghi Status Approved cho `spec.md` và `design.md`, rồi push nhánh tài liệu, để link plan comment lên Epic mở được.

| Lượt | Model, effort | Lượt model | Thời gian | Token ra | Cache đọc | Cache ghi | Quy ra USD | Kết quả |
|---|---|---|---|---|---|---|---|---|
| `sa` 3 | Opus, xhigh | 36 | 14 ph 23 s | 85.757 | 3.189.596 | 144.656 | 3,511 | `b063d4c` Status Approved; `9a377a4` ADR-0001 (Proposed); `4c619ed` `plan.md`; comment link plan lên Epic; 2 câu hỏi mở |
| `sa` 4 (`--resume`) | Opus, xhigh | 13 | 1 ph 43 s | 9.216 | 1.592.146 | 15.012 | 0,622 | `40b5091`: Q1, Q2 thành quyết định |
| `ba` 3 | Opus, xhigh | 42 | 6 ph 24 s | 38.395 | 3.314.112 | 118.462 | 2,379 | DEMO-12 (Story), DEMO-13 và DEMO-14 (Sub-task); `feb4f06` điền key vào plan; comment các key lên Epic |

Ba lượt của stage plan tốn 6,51 USD quy đổi. Cộng với stage spec, mười lượt của T18 tốn 11,81 USD, gần mức trên của ước tính 6–12 USD ở Checkpoint 3. `sa` 3 là lượt đắt nhất. Không lượt nào bị hook chặn.

**Câu trả lời Claude đưa thay bạn:**

- Q1 của plan: không mở PR tài liệu vào `develop`. Tài liệu ở lại trên `feature/DEMO-11-spec` (plan của module, quyết định 6), và agent đọc bằng `git show feature/DEMO-11-spec:<file>`.
- Q2 của plan: số tiền giảm bằng 0 hiện "0 ₫", không có dấu trừ.

**Agent làm gì:**

- `sa` viết plan 389 dòng: 9 quyết định kiến trúc, hợp đồng của `POST /` (trường `code` và `applied`, kiểu `CouponState`, thứ tự kiểm `Host` → path → method → `Origin` → cỡ body), Task List, 8 rủi ro. Nó dựng prototype trong `.ai/sa/demo-11/` (không commit) và chạy thử trên Node 24.17.0:
  - 413 có `Connection: close` thì server giữ tối đa 1.024 byte. Không có header đó, Node đọc rồi bỏ cả body 5 MB.
  - `fetch` của Node bỏ header `Host` tự đặt và không gửi `Origin`. Vì vậy test của `Host` phải dùng `node:http` hoặc `node:net`; một test viết bằng `fetch` sẽ pass sai.
  - Nó tái hiện finding Low của `reviewer` ở T16 (test treo khi server sập) và thử cách sửa.
- `ba` tạo Story DEMO-12 với AC1–AC11 nguyên văn từ SPEC, và Sub-task DEMO-13 (BE, 4 file code), DEMO-14 (FE, 1 file code). Mô tả Story có lệnh `git show` để đọc tài liệu. Vài lựa chọn của nó:
  - Không tạo link "Blocks" từ DEMO-13 sang DEMO-14. Lý do: guard của `start` đòi item chặn đã merge, mà Sub-task không bao giờ merge riêng. Phụ thuộc được ghi trong mô tả.
  - Sub-task viết theo template `task.md`, vì kit không có template cho Sub-task.
  - Phần chuyển markdown của Jira gộp hai khoảng trắng ở AC3 (`  giam10  `) thành một. `ba` thấy lỗi, gửi lại mô tả, rồi đọc lại để kiểm.
- `spec.md`, `design.md`, `plan.md` có đúng các heading của template, và AC1–AC11 đánh số liên tục trong cả Epic.

**Quan sát:**

- Comment của `sa` trên Epic vẫn ghi hai câu hỏi Q1, Q2 như đang mở. `sa` không sửa comment sau khi câu hỏi có trả lời.
- ADR-0001 ở Proposed. `sa` ghi rằng ADR chuyển sang Accepted khi plan qua gate ②. Nhưng sau gate ②, không bước nào của hợp đồng gọi lại `sa`. `dev-workflow` cần quyết ai đổi trạng thái này.

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

**T7, `check-policy.mjs --base` chạy ở máy (khoảng 18:10): đúng.** Repo tạm trong scratchpad, nhánh `feature/DEMO-2-design` tách từ `develop`, có `docs/specs/DEMO-2/design.md` (bản `tests/fixtures/design/figma.md`) cùng thư mục `design/` gồm một ảnh 1440×4000 và một ảnh thừa, thiếu ảnh mobile. Lệnh `node scripts/check-policy.mjs --base develop --title "docs(specs): add the design (DEMO-2)"` thoát mã 1, in:

```
FAIL  Design
      docs/specs/DEMO-2/design.md:23 D8 design/S1-desktop.png is 1440×4000 px; the long side is at most 2000 px: export the frame in slices
      docs/specs/DEMO-2/design.md:23 D8 design/S1-old.png is in design/ but design.md does not use it
      docs/specs/DEMO-2/design.md:24 D8 design/S1-mobile.jpg does not exist
```

Test của script trong `tests/quality/policy.test.mjs` lặp lại việc này với một `design.md` sai D2. Phần kiểm trên PR thật làm ở T18 (tiêu chí 4).

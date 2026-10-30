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

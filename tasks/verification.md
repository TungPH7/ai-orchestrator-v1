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

Hai điểm đúng, nhưng điểm 6 cần một điều kiện mà spec chưa có. Đề xuất sửa spec, chờ bạn duyệt:

1. **Luật quyền cho dòng kiểm.** `kit/.claude/settings.json` thêm `permissions.allow: ["Bash(node .ai-orchestrator/scripts/ao-step.mjs:*)"]`, để dòng `!` chạy lúc nạp skill (spec mục 2.1, 6). Thiếu luật thì lệnh vẫn chạy, nhưng do model tự chạy: có thể chạy sai thư mục, và script hỏng không làm lệnh bị hủy.
2. **Chặn lệnh điều phối trong phiên agent.** Luật trên cũng áp cho phiên agent trong cùng dự án. Vì vậy `gh-guard` từ chối `ao-step.mjs` và `ao-agent.mjs` trong phiên agent (T3). Nếu không, một agent chạy được `--go` và mở agent khác.
3. **Dòng `!` chỉ truyền mã item hay số PR, qua `$0`;** không bao giờ truyền đoạn chữ tự do. `ao-step.mjs` từ chối đối số sai dạng. Với `/ao-fix 15 <việc cần sửa>`, đoạn chữ nằm trong thân skill, và Claude chuyển nó cho `--go` qua file `--note .ai/runs/<KEY>/note.md` (spec mục 2.1, 6; T12, T13).
4. **Skill dặn đặt `timeout` dài khi chạy `--go` ở nền**, mức tối đa của tool Bash (2 giờ). Trong `claude -p`, lệnh nền không có `timeout` bị dừng sau 10 phút, ngắn hơn nhiều lượt agent (spec mục 6; T13).
5. **Tài liệu** ghi `MSYS_NO_PATHCONV=1` khi gõ `claude -p "/ao-…"` trong Git Bash (T19).

Với điểm 4, Claude gõ được lệnh `/ao-…` qua `claude -p` ở kiểm thật (plan, quyết định 10).

# Plan triển khai: dev-workflow

> **Spec:** [SPEC-dev-workflow.md](../SPEC-dev-workflow.md), đã duyệt 2026-10-31. **Trạng thái:** đã duyệt 2026-10-31 (Phiên 17 · Lượt 2), cùng quyết định 8 và 9. **Task chi tiết:** [todo.md](todo.md). **Kết quả kiểm thật:** `tasks/verification.md`, tạo ở T1.

## Tổng quan

Đóng gói việc điều phối mà Claude làm tay ở `agent-roster` thành sáu lệnh `/ao-*`. Việc gồm:

- Agent làm việc trên GitHub bằng hai App: `gh` dùng token chỉ đọc, `git push` đi qua credential helper của `ao-dev`, commit đứng tên bot.
- `merge-gate` và `audit` nhận PR tài liệu của Epic. `merge-gate` báo PR cần bạn lên cả PR lẫn Jira. `jira-sync` gỡ cờ đó, và đánh dấu dòng DoR khi refine.
- Thư viện `lib/workflow/` và script `ao-step.mjs`: kiểm trạng thái, chạy agent lần lượt, ghi số đo, dừng ở cổng.
- Sáu skill trong `kit/.claude/skills/ao-*/`, cùng các thay đổi nhỏ ở template, prompt và hợp đồng.
- Chép kit mới vào `ao-pilot`, rồi cho một Epic nhỏ đi qua đủ sáu lệnh.

Như các module trước, plan kiểm tám tiền đề trước (T1–T2, spec mục 2.11), rồi mới viết code dựa vào chúng.

## Quyết định kiến trúc

1. **Kiểm tiền đề trước (T1–T2).**
   - T1 kiểm điểm 6–7 về Claude Code, bằng một dự án tạm trong scratchpad, chạy Haiku.
   - T2: bạn thêm quyền cho hai App theo từng bước bấm. Sau đó Claude kiểm điểm 1–5 và 8 trên `ao-pilot`, bằng một bản clone tạm và một PR nháp, đóng ngay khi xong.

   Điểm nào sai thì Claude dừng, đề xuất sửa spec và chờ bạn duyệt.
2. **Hàm thuần, script mỏng.**
   - Hàm thuần: `steps.mjs`, `prompts.mjs`, `requests.mjs`, phần đọc log của `runs.mjs`, hàm quyết định PR tài liệu, phạm vi review của `security`, và môi trường của phiên agent trong `launch.mjs`.
   - Phần gọi mạng hay mở process nằm trong `facts.mjs`, `runner.mjs` và các script.
   - Test dùng dữ liệu ghi sẵn: bản ghi API theo cách của `tests/fixtures/tracker/api/demo.json`, và log stream-json cắt gọn từ các lượt chạy thật của `agent-roster`.
3. **Thêm `lib/workflow/runner.mjs`, ngoài danh sách file ở spec mục 5.** File này chứa vòng chạy của `--go`, nhận hàm mở process và hàm gom dữ kiện làm tham số. Nhờ vậy test được thứ tự lượt, `state.json` và các điều kiện dừng mà không mở `claude`. `ao-step.mjs` chỉ dựng client rồi gọi nó.
4. **Quy tắc mới:**
   - `Q5` kiểm `docs_pull_requests`, có test dương và fixture âm như `Q1`–`Q4`.
   - Tiền tố nhãn trong `tracker/jira.yaml` chỉ kiểm bằng schema, không thêm quy tắc `J`.
5. **Danh tính của phiên agent.**
   - Vai trò nằm trong giá trị `credential.helper` mà `ao-agent.mjs` đặt qua `GIT_CONFIG_*`, ví dụ `!node "<kit>/scripts/ao-git-credential.mjs" devops`. Helper không đọc vai trò từ biến môi trường: agent đặt được biến môi trường trong lệnh của nó, còn `GIT_CONFIG_*` thì `gh-guard` chặn.
   - `credential.useHttpPath` bật, để helper biết repo và xin token chỉ cho repo đó.
   - Phiên agent có thêm `GIT_TERMINAL_PROMPT=0`, để git của vai trò chỉ đọc báo lỗi ngay, không hỏi mật khẩu.
   - `gh-guard` từ chối lệnh gọi thẳng `ao-git-credential.mjs`, như đã từ chối `git credential`. Nếu không, một vai trò dev gọi helper với vai trò `devops` là có token mang quyền Workflows.
   - Token chỉ nằm trong môi trường của process con. Test kiểm rằng tham số dòng lệnh, file skills và log không chứa token.
6. **Effort của một lượt.** `CLAUDE_CODE_EFFORT_LEVEL` thắng `--effort` (T21 của `agent-roster`), và môi trường của bạn có thể đã đặt biến này. Vì vậy `ao-step.mjs` đặt cả `--effort` lẫn biến đó cho mỗi lượt, theo nhãn, Rework hoặc roster, và ghi mức đã dùng vào `state.json`.
7. **Cách chạy `--go`.**
   - Claude chạy `ao-step.mjs … --go` bằng shell nền rồi chờ thông báo xong, vì một lượt agent có thể dài hơn giới hạn 10 phút của lệnh foreground.
   - `ao-step.mjs` chạy các agent lần lượt, mỗi agent là một process con. Sau mỗi lượt, script gom dữ kiện lại và quyết định lượt kế tiếp. Ví dụ, `ux` chỉ chạy khi SPEC mà `ba` vừa viết có màn hình. Danh sách in ra lúc kiểm vì vậy chỉ là dự kiến.
   - `state.json` được ghi xong trước khi sang lượt sau. Nếu shell nền bị dừng vì thiếu RAM, lần chạy lại đi tiếp đúng chỗ. Claude đọc `state.json` trước khi chạy lại, không chạy lại mù.
8. **Bản chép kit mới (T15) đi theo đường mới ngay từ đầu.**
   - Claude commit và push bằng credential helper với vai trò `devops`, vì bản chép sửa `.github/workflows/`.
   - `ao-dev` mở PR bằng `ao-pr.mjs`.
   - `reviewer` và `security` chạy bằng `ao-step.mjs review <PR> --go` từ nhánh của PR: đây là lần chạy thật đầu tiên của `/ao-review`. Trước khi chạy `--go`, Claude chạy lệnh ở chế độ chỉ kiểm. Lỗi tìm ra lúc đó được sửa trong kit và chép lại lên PR, trước khi có báo cáo nào.
   - Bạn approve rồi tự merge, vì PR sửa đường dẫn được bảo vệ.
9. **Story của Epic thử dừng ở Ready for QA.** QA thuộc `release-workflow` (spec mục 1). Story để nguyên đó, làm item thử đầu tiên cho `release-workflow`.
10. **Gõ lệnh `/` thật.**
    - Claude gọi phần lớn các bước bằng `ao-step.mjs … --go` trong `ao-pilot`, cùng code mà skill gọi.
    - Mỗi lệnh `/` được gõ thật ít nhất một lần: hoặc bạn gõ trong phiên Claude Code của bạn ở `ao-pilot`, hoặc Claude gõ qua `claude -p "/ao-…"`. T1 cho thấy `claude -p` chờ được lệnh nền khi lệnh có `timeout` dài, nên Claude gõ được.
    - Bạn vẫn là người bấm ở mọi cổng.
11. **Key và token không đi qua chat, log hay lịch sử lệnh.** Như các module trước, Claude đọc biến môi trường từ registry ngay trong lệnh.
12. **Quy trình nhánh như các module trước.**
    - Mỗi task một nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR khi CI xanh, rồi làm tiếp.
    - Claude dừng ở các checkpoint để bạn soát.
13. **Usage của gói Pro.** Kiểm thật tốn khoảng 18 lượt agent bằng Opus hoặc Sonnet (bảng ở cuối file). Checkpoint 3 hỏi bạn trước Epic thử, phần tốn nhất.

## Thứ tự và phụ thuộc

```
T1 tiền đề Claude Code ──────────────────────────────────────────────┐
T2 quyền App, tiền đề GitHub ── T3 môi trường phiên agent, helper     │
                                                                      │
T4 docs_pull_requests, Q5 ── T5 merge-gate, audit: PR tài liệu       │
T6 merge-gate báo PR cần bạn, jira-sync gỡ cờ                         │
T7 jira-sync đánh dấu DoR                                             │
                                                                      │
T8 runs, requests ──┬── T10 decideStep: status, spec, plan            │
T9 facts, nhãn ─────┘    └── T11 decideStep: build, review, fix       │
                              └── T12 ao-step.mjs ── T13 sáu skill ◄──┘
T14 template, hợp đồng, prompt

T3, T5–T7, T13, T14 ── T15 chép kit vào ao-pilot ── T16 thử đi vòng
T16 ── T17 Epic: spec, plan ── T18 Epic: build, review, fix ── T19 tài liệu, lưu trữ
```

- T1–T2 đứng đầu: một tiền đề sai sẽ đổi cách cấp danh tính (T3) hoặc cách lệnh chạy (T12–T13).
- T4–T14 phần lớn độc lập với nhau. Nhưng gói Pro giới hạn usage, nên mặc định vẫn làm lần lượt.

## Danh sách task

### Giai đoạn 1: tiền đề
- [x] T1: Tiền đề về Claude Code (spec mục 2.11, điểm 6–7)
- [x] T2: Quyền mới cho hai App và tiền đề về GitHub (điểm 1–5, 8) [bạn]

### Checkpoint 1
- [x] `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check` xanh
- [x] Tám tiền đề có kết quả trong `tasks/verification.md`. Tiền đề nào sai thì spec đã được sửa và bạn đã duyệt bản sửa
- [x] Bạn xem kết quả của T1–T2

### Giai đoạn 2: danh tính và cổng
- [x] T3: Môi trường của phiên agent và `ao-git-credential.mjs`
- [x] T4: `docs_pull_requests` trong `quality/gates.yaml`, schema và Q5
- [x] T5: `merge-gate` và `audit` nhận PR tài liệu
- [x] T6: `merge-gate` báo PR cần bạn, `jira-sync` gỡ cờ
- [ ] T7: `jira-sync` đánh dấu dòng DoR

### Giai đoạn 3: `ao-step.mjs`
- [ ] T8: `runs.mjs` và `requests.mjs`
- [ ] T9: `facts.mjs` và nhãn trong `tracker/jira.yaml`
- [ ] T10: `decideStep` cho `status`, `spec`, `plan`
- [ ] T11: `decideStep` cho `build`, `review`, `fix`
- [ ] T12: `ao-step.mjs` và `runner.mjs`
- [ ] T13: Sáu skill `/ao-*`

### Giai đoạn 4: template, hợp đồng, prompt
- [ ] T14: Template, hợp đồng, prompt và `agents/rules.md`

### Checkpoint 2
- [ ] Năm lệnh kiểm trong quy ước chung và CI của kit xanh
- [ ] Claude chạy `ao-step.mjs` ở chế độ chỉ kiểm trong `ao-pilot`, bằng code của kit: `status`, `build` cho một item, `review` cho một PR. Không agent nào chạy
- [ ] Bạn đọc kết quả đó, skill `ao-build`, và phần prompt đã sửa

### Giai đoạn 5: lên `ao-pilot`
- [ ] T15: Bản chép kit mới vào `ao-pilot` qua PR [bạn]
- [ ] T16: Thử đi vòng

### Checkpoint 3
- [ ] Tiêu chí 3, 6 và 9 của spec mục 9 đạt
- [ ] Bạn xem chi phí của T15–T16, rồi đồng ý chạy Epic thử (ước 25–36 USD)

### Giai đoạn 6: kiểm thật
- [ ] T17: Epic thử: `/ao-spec`, `/ao-plan` tới lúc PR tài liệu được merge [bạn]
- [ ] T18: Epic thử: `/ao-build`, `/ao-review`, `/ao-fix` tới merge [bạn]

### Checkpoint 4
- [ ] Tiêu chí 4, 5, 7 và 8 của spec mục 9 đạt
- [ ] Bạn xem lịch sử Epic thử trên `DEMO`, PR tài liệu và PR code trên `ao-pilot`, và `.ai/runs/`

### Giai đoạn 7: hoàn thiện
- [ ] T19: Tài liệu, `SPEC.md` và lưu trữ plan

### Checkpoint cuối
- [ ] Đạt 10 tiêu chí ở spec mục 9
- [ ] Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/dev-workflow/`
- [ ] Bạn xác nhận module hoàn thành

## Usage ước tính cho kiểm thật

| Task | Lượt chạy agent | Model | Ước tính |
|---|---|---|---|
| T1 | vài lượt ngắn | Haiku | dưới 0,5 USD |
| T2 | không có agent, chỉ lệnh `git`, `gh` và API | | 0 |
| T15 | `reviewer`, `security` trên PR bản chép kit | Opus | 6–12 USD |
| T16 | hai lượt ngắn ở effort `low` | Opus | dưới 1 USD |
| T17 | stage spec: `ba`, `ux`, `sa`, kèm lượt `--resume` sau câu trả lời của bạn; stage plan: `sa`, `ba` | Opus, `ux` bằng Sonnet | 10–14 USD |
| T18 | `be-dev`, `fe-dev`, `reviewer`, `security`; vòng sửa: dev agent, `reviewer`, `security` phần mới ở `high` | Opus | 15–22 USD |

Tổng khoảng 18 lượt Opus hoặc Sonnet, 32–50 USD quy đổi. Riêng Epic thử (T17–T18) khoảng 25–36 USD, gần với mức 30–40 USD mà spec ước. Có thể cần ba đến bốn khung 5 giờ của gói Pro.

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Một tiền đề sai: push bằng token App không chạy CI, `GIT_CONFIG_*` không thay được Git Credential Manager, hoặc `claude -p` không chờ lệnh nền | Cao | T1–T2 kiểm trước khi viết code; sai thì dừng và đề xuất sửa spec |
| Lỗi của `ao-step.mjs` chỉ lộ ra khi chạy thật, làm phí lượt agent | Trung bình | Test với dữ liệu ghi sẵn; Checkpoint 2 chạy chế độ chỉ kiểm trên dữ liệu thật; T15 chạy chỉ kiểm trước `--go` |
| Hết usage giữa lúc kiểm thật | Cao | `state.json` cho chạy tiếp lượt dở; tiến độ ghi trong `todo.md`; Checkpoint 3 hỏi trước Epic thử |
| Shell nền bị dừng vì máy thiếu RAM | Trung bình | Agent chạy lần lượt; `state.json` ghi sau mỗi lượt; Claude đọc nó trước khi chạy lại |
| Một vai trò dev lấy token có quyền Workflows | Thấp | Vai trò nằm trong cấu hình git mà `gh-guard` chặn sửa; `gh-guard` chặn gọi thẳng helper; PR sửa workflow vẫn do bạn merge |
| `GH_TOKEN` hết hạn giữa một lượt dài hơn một giờ | Thấp | `maxTurns` giữ lượt ngắn; T17–T18 ghi thời gian từng lượt; lượt chạy lại có token mới |
| `merge-gate` merge nhầm PR tài liệu | Thấp | Test cho commit đến sau lúc duyệt và file nằm ngoài đường dẫn cho phép; `audit` kiểm lại trước deploy |
| `merge-gate` comment hay gắn cờ lặp lại ở mỗi lượt chạy | Thấp | Dấu trong comment, mỗi head một lần; có test |
| `jira-sync` gỡ nhầm cờ do `audit` hay giới hạn Rework gắn | Trung bình | Chỉ gỡ khi comment cờ mới nhất là của `merge-gate` cho đúng PR đó; có test |
| Agent làm việc ngoài phạm vi trên GitHub | Thấp | Mọi việc của agent đi qua token của App với quyền thu hẹp; `gh-guard`, `jira-guard`; chỉ làm trên `ao-pilot` và space `DEMO` |

## Câu hỏi mở

Không có. Bạn duyệt plan ngày 2026-10-31 (Phiên 17 · Lượt 2), gồm cả hai quyết định:

- **Quyết định 8:** PR chép kit mới được review bằng chính `/ao-review`, lấy từ nhánh của PR. Đây là lần chạy thật đầu tiên của lệnh, trên PR tốn nhất của module (6–12 USD).
- **Quyết định 9:** Story của Epic thử dừng ở Ready for QA, để dành cho `release-workflow`.

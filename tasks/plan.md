# Plan triển khai: agent-roster

> **Spec:** [SPEC-agent-roster.md](../SPEC-agent-roster.md), đã duyệt 2026-10-30. **Trạng thái:** đã duyệt 2026-10-30, cùng quyết định 6 và 7. **Task chi tiết:** [todo.md](todo.md). **Kết quả kiểm thật:** [verification.md](verification.md), tạo ở T1.

## Tổng quan

Biến mười vai trò của hợp đồng thành mười subagent của Claude Code, sinh từ `agents/roster.yaml`, prompt viết tay và hợp đồng. Việc gồm:

- Thêm artifact `design` cùng script kiểm `check-design`, và trạng thái NOT TESTED cho báo cáo QA.
- Chép vào kit 16 skill: 13 skill của agent-skills và ba skill từ registry.
- Script `ao-agent.mjs` chạy agent làm phiên chính với đủ skill, effort và giới hạn lượt.
- `gh-guard` giới hạn quyền theo vai trò.
- Cho mười agent chạy thật trên `ao-pilot`, có số đo cho từng lượt.

Như hai module trước, plan kiểm tiền đề trước: T1–T2 thử bảy điều về Claude Code và hai công cụ trình duyệt mà spec dựa vào (spec mục 2.12), rồi mới viết code phụ thuộc vào chúng.

## Quyết định kiến trúc

1. **Kiểm tiền đề trước (T1–T2).**
   - T1 kiểm điểm 1–5 bằng agent thử chạy Haiku trong một dự án tạm ở scratchpad.
   - T2 kiểm điểm 6–7, sau khi bạn đồng ý cài.

   Điểm nào sai thì Claude dừng, đề xuất sửa spec theo phương án ở spec mục 2.12, và chờ bạn duyệt.
2. **Quy tắc mới mang mã.**
   - Roster có quy tắc `A1`–`A5`, cùng dạng lỗi `{ rule, path, message }` như `R`, `J`, `Q`.
   - Lỗi của `check-design` mang mã `D1`–`D8`.
   - Hai quy tắc được thêm dần, khi file chúng kiểm đã có, như `Q2` ở `quality-gates`: phần skill chép vào kit của `A4` thêm ở T9; phần file prompt của `A2` thêm ở T12.
3. **Hàm thuần, script mỏng.**
   - `design.mjs`, `scope.mjs`, `render.mjs` là hàm thuần. Script đọc file, gọi hàm rồi ghi kết quả.
   - Chỉ `vendor.mjs` gọi mạng, và test của nó dùng cây thư mục ghi sẵn.
4. **Viết prompt trước, ghép sau.**
   - T11–T12 viết phần viết tay của mười vai trò. T13 ghép prompt với roster và hợp đồng thành file agent.
   - Ở T13, Claude đọc lại cả mười file sinh ra và sửa chỗ phần viết tay lặp lại hoặc trái với phần sinh tự động.
5. **Kiểm thật bằng `ao-agent.mjs <role> -p "<prompt>" --output-format json` (có từ T14),** chạy từ thư mục `ao-pilot`, lần lượt từng lượt, ở foreground.
   - Mỗi lượt ghi lại model, effort, token vào và ra, chi phí quy đổi theo giá API, thời gian và số lượt vào `tasks/verification.md`.
   - Câu hỏi của `ba` được Claude trả lời thay bạn bằng một lượt `--resume`.
   - Năm việc ngoài vai trò chạy với `CLAUDE_CODE_EFFORT_LEVEL=low` cho rẻ, vì chỉ kiểm tool và hook.
6. **Tài liệu của Epic thử nằm trên nhánh `feature/<EPIC-KEY>-spec` và không được merge trong module này.**
   - Luồng PR cho tài liệu là việc của `dev-workflow` (spec mục 1).
   - Dev agent, `reviewer` và `qa` đọc spec, design, plan bằng `git show <nhánh>:<đường dẫn>`. Claude ghi tên nhánh trong prompt của từng lượt chạy.
7. **Chuẩn bị `ao-pilot` cho Epic thử (T16, cần bạn đồng ý).**
   - Vì sao cần: `ao-pilot` hiện chỉ có `src/cart.ts`, không có giao diện, không có E2E test. Trong khi đó DoD của Story đòi mỗi AC có một E2E test, và Epic thử có cả `ux` lẫn `fe-dev`.
   - T16 thêm vào `ao-pilot`:
     - Một trang giỏ hàng tĩnh.
     - Script `serve` viết bằng `node:http`.
     - `@playwright/test` ghim bản, chạy bằng Chrome có sẵn trên máy.

     Không thêm framework nào.
   - E2E chỉ chạy ở máy bạn; đưa E2E vào CI là việc của `release-workflow`.
   - Phần này lệch với spec ở hai chỗ:
     - `qa` và `fe-dev` thử trình duyệt trên trang giỏ hàng này, thay cho "một trang tĩnh" (kiểm thật 7).
     - `qa` dùng trình duyệt hai lần, ở T17 và T19, không phải "chỉ chạy thử một lần" như mục 2.7.

     Spec đã được sửa theo hai điểm này lúc duyệt plan.
8. **Key và token không đi qua chat, log hay lịch sử lệnh.** Như các module trước, Claude đọc biến môi trường từ registry ngay trong lệnh.
9. **Ghim phiên bản:**
   - `@playwright/cli` 0.1.22 và `chrome-devtools-mcp` 1.12.0.
   - 16 skill chép vào kit, ghim theo SHA đầy đủ: 13 skill của agent-skills ở commit của tag 0.6.13, và ba skill từ registry.
   - `@playwright/test` ghim bản cố định.
10. **Quy trình nhánh như các module trước.**
    - Mỗi task một nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR khi CI xanh, rồi làm tiếp.
    - Claude dừng ở các checkpoint để bạn soát.
11. **Usage của gói Pro.**
    - Kiểm thật tốn khoảng 30 lượt chạy agent, phần lớn bằng Opus (bảng ở cuối file này).
    - Checkpoint 3 hỏi bạn trước khi vào phần tốn nhất. Hết usage giữa chừng thì phiên sau làm tiếp theo `todo.md` và ledger.

## Thứ tự và phụ thuộc

```
T1 tiền đề Claude Code ──┬── T8 roster, A1–A5 ──┬── T9 chép skill ───────────┐
T2 tiền đề trình duyệt ──┘                      ├── T10 gh-guard theo vai trò │
                                                └── T11 prompt pm ba ux sa ◄─┘
                                                     └── T12 prompt sáu vai trò, rules.md
                                                          └── T13 sinh agent, agents:check
                                                               └── T14 chế độ dự án, ao-agent.mjs
T3 hợp đồng, template design ── T5 check-design ASCII ── T6 kiểu Figma ── T7 job policy
T4 NOT TESTED

T4, T7, T10, T14 ── T15 chép kit vào ao-pilot ── T16 trang giỏ hàng, Playwright ── T17 trình duyệt
T17 ── T18 Epic: spec, plan ── T19 Epic: build tới QA
T15 ── T20 devops, pm, việc ngoài vai trò
T15 ── T21 phép so high, max
T19, T20, T21 ── T22 maxTurns, tài liệu, lưu trữ
```

- T1–T2 đứng đầu vì nếu một tiền đề sai thì roster, cách nạp skill hoặc công cụ trình duyệt phải đổi.
- T3–T7 độc lập với nhánh roster. Nhưng gói Pro giới hạn usage, nên mặc định vẫn làm lần lượt.

## Danh sách task

### Giai đoạn 1: tiền đề và hợp đồng
- [x] T1: Tiền đề về Claude Code (spec mục 2.12, điểm 1–5)
- [x] T2: Tiền đề về trình duyệt (điểm 6–7) [bạn]
- [x] T3: Thay đổi hợp đồng và template `design.md`
- [x] T4: NOT TESTED trong báo cáo QA

### Checkpoint 1
- [x] `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check` xanh
- [x] Bảy tiền đề có kết quả trong `tasks/verification.md`. Tiền đề nào sai thì spec đã được sửa và bạn đã duyệt bản sửa
- [x] Bạn xem kết quả của T1–T2 (bạn cho qua ngày 2026-10-30, Phiên 14 · Lượt 4)

### Giai đoạn 2: `design.md`
- [x] T5: `check-design` cho màn hình kiểu ASCII
- [x] T6: `check-design` cho màn hình kiểu Figma và ảnh
- [x] T7: Job `policy` chạy `check-design`

### Giai đoạn 3: roster, skill, gh-guard
- [x] T8: `agents/roster.yaml`, schema, quy tắc A1–A5
- [x] T9: Chép skill: `skills:vendor` và 16 skill
- [x] T10: `gh-guard` theo vai trò

### Giai đoạn 4: prompt và sinh agent
- [ ] T11: Prompt của `pm`, `ba`, `ux`, `sa`
- [ ] T12: Prompt của sáu vai trò còn lại, `agents/rules.md`
- [ ] T13: Sinh agent và file quy ước, `agents:check`
- [ ] T14: Chế độ dự án: `--project`, `roster.local.yaml` và `ao-agent.mjs`

### Checkpoint 2
- [ ] `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check` và CI của kit xanh
- [ ] Bạn đọc file quy ước và ít nhất hai agent sinh ra (đề xuất `fe-dev` và `qa`)

### Giai đoạn 5: lên `ao-pilot`
- [ ] T15: Bản chép kit vào `ao-pilot` qua PR [bạn]
- [ ] T16: `ao-pilot`: trang giỏ hàng tối thiểu và Playwright [bạn]
- [ ] T17: Trình duyệt: `qa` và `fe-dev` chạy thử

### Checkpoint 3
- [ ] Tiêu chí 6 và 12 của spec mục 9 đạt
- [ ] Bạn xem số đo của các lượt chạy đầu tiên, rồi đồng ý chạy phần kiểm thật còn lại (khoảng 24 lượt)

### Giai đoạn 6: kiểm thật
- [ ] T18: Epic thử: spec và plan [bạn]
- [ ] T19: Epic thử: build tới QA [bạn]
- [ ] T20: `devops`, `pm` và năm việc ngoài vai trò [bạn]
- [ ] T21: Phép so `high` với `max` của `fe-dev` [bạn]

### Checkpoint 4
- [ ] Tiêu chí 4, 7, 8, 9 và 10 của spec mục 9 đạt
- [ ] Bạn xem lịch sử Epic thử trên `DEMO` và các PR thử trên `ao-pilot`
- [ ] Bạn chọn mức effort cho `fe-dev`

### Giai đoạn 7: hoàn thiện
- [ ] T22: `maxTurns` theo số đo, tài liệu, lưu trữ plan

### Checkpoint cuối
- [ ] Đạt 13 tiêu chí ở spec mục 9
- [ ] Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/agent-roster/`
- [ ] Bạn xác nhận module hoàn thành

## Usage ước tính cho kiểm thật

| Task | Lượt chạy agent | Model |
|---|---|---|
| T1–T2 | T1 chạy 26 lượt ngắn (0,076 USD); T2 vài lượt | Haiku |
| T15 | `reviewer`, `security` | Opus |
| T16 | `reviewer`, `security` | Opus |
| T17 | `qa`, `fe-dev` | Opus |
| T18 | `ba` 3 lượt, `ux`, `sa` 2 lượt | Opus, `ux` bằng Sonnet |
| T19 | `be-dev`, `fe-dev`, `reviewer`, `security`, `qa`, thêm khoảng một lượt sửa | Opus |
| T20 | `devops`, `security`, `pm`, năm lượt ngắn ở effort `low` | Opus, `pm` bằng Sonnet |
| T21 | `fe-dev` 2 lượt, `reviewer` 2 lượt | Opus |

Tổng cộng khoảng 30 lượt Opus hoặc Sonnet, có thể cần ba đến bốn khung 5 giờ của gói Pro.

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Một tiền đề về Claude Code sai: skill của plugin không được nạp, file rules không được nạp, hoặc `tools` không giới hạn được agent ở chế độ auto | Cao | T1 kiểm trước khi viết code; mỗi điểm có phương án ở spec mục 2.12. Đã xảy ra ở T1: spec sửa theo phương án bạn duyệt ở Phiên 14 · Lượt 2 |
| `playwright-cli` hoặc Chrome DevTools MCP không chạy được trên Windows | Trung bình | T2 kiểm trước. Nếu hỏng: đổi công cụ cho vai trò đó, sửa spec, chờ bạn duyệt |
| Hết usage giữa lúc kiểm thật | Cao | Chạy lần lượt; tiến độ ghi trong `todo.md` và ledger; Checkpoint 3 hỏi trước phần tốn nhất; năm việc ngoài vai trò chạy ở effort `low` |
| Agent làm việc ngoài vai trò, như ghi sai chỗ hay chuyển trạng thái sai | Trung bình | `tools` của từng agent, `gh-guard`, `jira-guard`; mọi việc chỉ diễn ra trên space thử `DEMO`, không agent nào ghi vào `SCRUM` |
| Skill chép vào kit chứa chỉ dẫn xấu | Thấp | Ghim theo commit; Claude đọc hết 16 skill ở T9 trước khi commit |
| Nhiều phiên `claude -p` lồng nhau làm máy hết RAM | Trung bình | Chạy agent ở foreground, mỗi lần một lượt |
| `jira-sync` phản ứng với PR thử mang key của Jira | Thấp | PR thử đóng ngay sau khi xong, như PR #3 ở T13 của `quality-gates` |
| Kết quả phép so dao động giữa các lần chạy | Trung bình | Phép so chỉ cho một hình dung (spec mục 2.2); bạn là người chọn mức |
| E2E của `ao-pilot` chỉ chạy ở máy bạn, nên kết luận của `qa` phụ thuộc vào máy bạn | Thấp | Đúng phạm vi module (quyết định 7); `release-workflow` đưa E2E vào CI |

## Câu hỏi mở

Không có. Bạn duyệt plan ngày 2026-10-30 (Phiên 14 · Lượt 1), gồm cả hai quyết định:

- Quyết định 6: tài liệu của Epic thử nằm trên một nhánh riêng, không merge.
- Quyết định 7: T16 chuẩn bị `ao-pilot`, và cài `@playwright/test` vào đó.

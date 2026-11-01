# Plan triển khai: Pilot 1

> **Spec:** [SPEC-pilot-1.md](../SPEC-pilot-1.md), đã duyệt 2026-11-01 (Phiên 21 · Lượt 4). **Trạng thái:** chờ bạn duyệt. **Task chi tiết:** [todo.md](todo.md). **Kết quả kiểm thật:** `tasks/verification.md`, tạo ở T1.

## Tổng quan

Đưa kit Cấp 1 lên một dự án thật, rồi cho một Epic đi qua đủ sáu lệnh `/ao-*`. Việc gồm:

- Kiểm năm tiền đề trước khi dựng (spec mục 2.8, điểm 1–5).
- Dựng space Jira `SMP`, khung app Next.js + NestJS, và bản chép kit có skill theo stack.
- Đưa repo `TungPH7/ao-sample` lên GitHub bằng một commit đầu, nối với hai App, `merge-gate` và GitHub for Jira.
- Chạy Epic "Ghi chú" từ `/ao-spec` tới khi mọi Story sang Ready for QA, bằng `claude -p "/ao-…"`.
- Ghi lại các bước cài làm tay, làm đầu vào cho `project-scaffold`.

Pilot không viết tính năng mới cho kit. Code của kit chỉ đổi khi chạy thật tìm ra lỗi (quyết định 6).

## Quyết định kiến trúc

1. **Kiểm tiền đề trước (T1–T2).**
   - T1 làm trong scratchpad: sinh khung hai app, kiểm `npm ci`, lcov và `npm audit` (điểm 1–2). Rồi chạy `claude -p --model sonnet "/ao-status"` trong một thư mục chưa từng mở bằng Claude Code, có bản chép kit và `settings.local.json` bật hai server MCP, đọc space `DEMO` (điểm 5). Đây là lượt duy nhất của T1 tốn usage.
   - T2 làm trên đối tượng thật: tạo repo `ao-sample` trống, thêm repo vào ba bản cài App (`ao-dev`, `ao-review`, GitHub for Atlassian) bằng API (điểm 3); tạo space `SMP` và gán `AO workflow scheme` bằng API (điểm 4).
   - Điểm 1, 2 hoặc 5 sai thì Claude dừng, đề xuất sửa spec và chờ bạn duyệt. Điểm 3 hoặc 4 sai thì không cần sửa spec: bạn làm bước đó trên giao diện theo từng bước bấm (spec mục 2.3, 2.4).
2. **Commit đầu chứa mọi thứ cần cho lần chạy đầu.** Khung app, bản chép kit, skill theo stack, `deploy.yml`, `.jira/config.yml`, README của dự án đều nằm trong commit đầu (spec mục 2.5). Nhờ vậy, sau commit đầu không cần PR dựng nào khác trước Epic.
3. **Bản chép kit lấy từ một commit cố định của kit.** T5 ghi SHA của `main` kit lúc chép vào `verification.md`. Từ đó tới hết Epic, bản chép chỉ đổi qua PR (quyết định 6).
4. **Skill theo stack chép tay, như `npm run skills:vendor` làm cho skill của kit.** Mỗi skill có `SOURCE.md` (repo, đường dẫn, commit, ngày, thay đổi) và file giấy phép. Claude đọc hết nội dung trước khi chép (spec mục 2.2).
5. **Danh tính khi Claude ghi vào `ao-sample`.**
   - Commit đầu: login của bạn, như spec mục 2.5.
   - Sau commit đầu, mọi commit của Claude vào `ao-sample` đi qua cấu hình git của vai trò `devops` (bot `ao-dev`), và PR do `ao-dev` mở bằng `ao-pr.mjs`, như T15 của `dev-workflow`.
6. **Lỗi kit tìm được giữa Epic.**
   - Lỗi chặn Epic: sửa ở kit (kit PR, có test), rồi đưa bản sửa vào `ao-sample` bằng một PR chép kit nhỏ. PR này gắn một Task của `SMP`, được review bằng `/ao-review`, và bạn tự merge vì sửa đường dẫn được bảo vệ.
   - Lỗi không chặn: sửa ở kit, gom lại, chép một lần ở T10.
   - Không dùng `AO_KIT_DIR` để đi vòng (spec mục 2.7).
7. **Gõ lệnh `/` thật.** Mọi lệnh `/ao-*` chạy bằng `claude -p --model sonnet "/ao-…"` trong `ao-sample`, ở shell nền với `timeout` dài (kết quả T1 của `dev-workflow`). Claude đọc `.ai/runs/<KEY>/state.json` trước mỗi lần chạy lại. Bạn vẫn là người bấm ở mọi cổng.
8. **Checkpoint ngay sau lượt build đầu (T8).** Agent chưa từng làm Next.js và NestJS trong kit (spec mục 12). Bạn xem code của Sub-task đầu trước khi chạy phần còn lại.
9. **Key và token không đi qua chat, log hay lịch sử lệnh.** Claude đọc biến môi trường từ registry ngay trong lệnh. Secret của GitHub được đặt bằng cách pipe từ file hoặc nhập ở dấu nhắc của `gh`.
10. **Quy trình nhánh của kit như các module trước.** Mỗi task có thay đổi ở kit dùng nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR khi CI xanh. Claude dừng ở các checkpoint để bạn soát.
11. **Usage của gói Pro.** T1–T6 gần như không chạy agent. Epic thử (T7–T9) tốn khoảng 30–45 USD quy đổi (bảng ở cuối file). Checkpoint 2 hỏi bạn trước khi chạy Epic.

## Thứ tự và phụ thuộc

```
T1 tiền đề: khung app, claude -p ──┐
T2 tiền đề: GitHub, Jira ──────────┤
                                   ├── T3 space SMP: bước 9–10
                                   ├── T4 khung app ao-sample ── T5 bản chép kit, skill, commit đầu
                                   │
T3, T5 ── T6 lên GitHub, nối Jira: bước 11–13
T6 ── T7 Epic: spec, plan ── T8 lượt build đầu ── T9 build, review, fix tới Ready for QA
T9 ── T10 bản sửa kit còn lại, tài liệu, lưu trữ
```

- T1–T2 đứng đầu: điểm 1–2 quyết định cách sinh khung (T4), điểm 5 quyết định cách chạy lệnh ở T7–T9.
- T3 và T4–T5 độc lập với nhau. Mặc định vẫn làm lần lượt.
- T6 cần cả repo (T5) và space (T3).

## Danh sách task

### Giai đoạn 1: tiền đề
- [ ] T1: Tiền đề về khung app và `claude -p` (spec mục 2.8, điểm 1, 2, 5)
- [ ] T2: Tiền đề về GitHub và Jira (điểm 3, 4)

### Checkpoint 1
- [ ] Năm điểm có kết quả trong `tasks/verification.md`. Điểm nào sai thì spec đã được sửa và bạn đã duyệt bản sửa, hoặc bước đó đã chuyển cho bạn làm trên giao diện
- [ ] Bạn xem kết quả của T1–T2

### Giai đoạn 2: dựng
- [ ] T3: Space `SMP`: bước 9–10 của `docs/jira-setup.md` [bạn]
- [ ] T4: Khung app `ao-sample` ở máy
- [ ] T5: Bản chép kit, skill theo stack và commit đầu
- [ ] T6: Lên GitHub và nối Jira: bước 11–13 [bạn]

### Checkpoint 2
- [ ] Tiêu chí 1 và 2 của spec mục 9 đạt
- [ ] `claude -p --model sonnet "/ao-status"` chạy trong `ao-sample`, thoát 0
- [ ] Bạn xem repo, board `SMP` và bảng các bước cài, rồi đồng ý chạy Epic thử (ước 30–45 USD)

### Giai đoạn 3: Epic thử
- [ ] T7: Epic "Ghi chú": `/ao-spec`, `/ao-plan` tới lúc PR tài liệu được merge [bạn]
- [ ] T8: `/ao-build` lượt đầu [bạn]

### Checkpoint 3
- [ ] Bạn xem code và test của Sub-task đầu, cùng chi phí từ đầu Epic, rồi đồng ý chạy tiếp

### Giai đoạn 3 (tiếp)
- [ ] T9: `/ao-build`, `/ao-review`, `/ao-fix` tới khi mọi Story sang Ready for QA [bạn]

### Checkpoint 4
- [ ] Tiêu chí 3–7 của spec mục 9 đạt
- [ ] Bạn xem lịch sử Epic trên `SMP`, PR tài liệu và PR code trên `ao-sample`, và `.ai/runs/`

### Giai đoạn 4: hoàn thiện
- [ ] T10: Bản sửa kit còn lại, tài liệu và lưu trữ plan

### Checkpoint cuối
- [ ] Đạt 8 tiêu chí ở spec mục 9
- [ ] Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/pilot-1/`
- [ ] Bạn xác nhận Pilot 1 hoàn thành

## Usage ước tính

| Task | Lượt chạy agent | Model | Ước tính |
|---|---|---|---|
| T1 | một lượt `/ao-status` | Sonnet | dưới 0,5 USD |
| T2–T6 | không có agent, chỉ lệnh `git`, `gh`, `npm` và API; một lượt `/ao-status` ở Checkpoint 2 | Sonnet | dưới 0,5 USD |
| T7 | stage spec: `ba`, `ux`, `sa`, kèm lượt `--resume` sau câu trả lời của bạn; stage plan: `sa`, `ba` | Opus, `ux` bằng Sonnet | 12–18 USD |
| T8 | `be-dev`, Sub-task đầu | Opus | 2–5 USD |
| T9 | `be-dev` và `fe-dev` cho phần còn lại; `reviewer`, `security`; vòng sửa | Opus | 15–22 USD |
| PR chép bản sửa kit (quyết định 6) | `reviewer`, `security` trên diff nhỏ | Opus | 1–5 USD mỗi PR, nếu có |

Ước tính dựa trên Epic DEMO-20: stage spec và plan 14,92 USD, cả Epic 36,19 USD. Tổng khoảng 30–45 USD quy đổi, chưa kể PR chép bản sửa kit. [Inference] Số Story do `sa` và `ba` quyết, nên tổng có thể cao hơn nếu plan có nhiều hơn một Story. Có thể cần ba đến bốn khung 5 giờ của gói Pro.

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Next.js 16, NestJS 12 và TypeScript không khớp nhau, hoặc khung có lỗ hổng mức high làm job `policy` đỏ | Trung bình | T1 kiểm trong scratchpad trước; dùng bản mà công cụ sinh chọn |
| `claude -p` trong repo mới dừng ở hộp thoại tin cậy thư mục hoặc không bật server MCP | Trung bình | T1 kiểm trên một thư mục mới trước; nếu sai, bạn mở `claude` một lần (spec mục 2.4) |
| API không cho thêm repo vào bản cài App, hoặc không tạo được space | Thấp | Bạn làm bước đó trên giao diện, có từng bước bấm |
| Một lỗi kit chặn Epic giữa chừng, và PR chép bản sửa tốn thêm usage | Trung bình | Quyết định 6: chỉ lỗi chặn mới chép ngay; diff nhỏ nên review rẻ |
| Hết usage hoặc máy thiếu RAM giữa Epic | Cao | Agent chạy lần lượt; `state.json` cho chạy tiếp lượt dở; tiến độ ghi trong `todo.md`; Checkpoint 2 và 3 hỏi trước phần tốn |
| Agent viết code Next.js hoặc NestJS kém, tốn vòng sửa | Trung bình | Skill theo stack; Checkpoint 3 sau lượt build đầu |
| Skill của bên thứ ba có chỉ dẫn độc | Thấp | Đọc hết trước khi chép, ghim commit, đường dẫn được bảo vệ |
| `audit` đỏ trên commit đầu làm bạn tưởng có lỗi | Thấp | Spec mục 2.5 ghi trước; T6 ghi run và lý do vào `verification.md` |

## Câu hỏi mở

Không có. Bạn duyệt plan cùng quyết định 6 (cách đưa bản sửa kit vào `ao-sample` giữa Epic) và quyết định 8 (Checkpoint 3 sau lượt build đầu).

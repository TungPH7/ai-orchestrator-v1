# Plan triển khai: tracker-integration

> **Spec:** [SPEC-tracker-integration.md](../SPEC-tracker-integration.md), đã duyệt 2026-10-27. **Trạng thái:** đã duyệt 2026-10-27, đang làm. **Task chi tiết:** [todo.md](todo.md). **Kết quả kiểm thật:** [verification.md](verification.md), tạo ở T1.

## Tổng quan

Nối hợp đồng `sdlc-contract` với Jira Cloud (gói Free) và GitHub. Việc gồm: ánh xạ `tracker/jira.yaml` cùng 4 quy tắc kiểm; checklist dựng Jira sinh từ ánh xạ, và `jira:check` chỉ đọc để báo lệch; hook `jira-guard` giữ quyền của agent khi agent chuyển trạng thái qua Rovo MCP; `jira-sync` trên GitHub Actions thực hiện các transition của `automation`. Plan đi theo hướng kiểm thật sớm: T1 thử kết nối bằng hai service account trước khi viết code, và space `DEMO` được dựng ngay khi có checklist (T8). Nhờ vậy, những gì gói Free thiếu lộ ra trước khi viết `jira:check` và hook.

## Quyết định kiến trúc

1. **Hook lấy vai trò từ `agent_type`**, không từ tham số `--actor` trong frontmatter của agent. Đây là thay đổi so với bản spec bạn đã duyệt; mục 2.6 của spec đã được sửa và ghi lý do. Hook khai báo một lần trong `kit/.claude/settings.json`. `agent-roster` chỉ cần đặt tên agent trùng id vai trò.
2. **`flag-needs-you` do agent thực hiện qua Rovo MCP, `jira-sync` gắn bù.** Token của agent chỉ có scope đọc với REST API, nên hook PostToolUse không tự ghi lên Jira được. Khi rework chạm giới hạn, hook trả về `decision: block`, kèm yêu cầu agent gắn cờ Flagged, label `needs-you` và comment qua MCP, rồi dừng. `jira-guard` chặn mọi transition của agent trên item còn label `needs-you`; bạn gỡ label thì agent làm tiếp được. `jira-sync` chạy bằng token CI (có quyền ghi) và gắn cờ nếu thấy rework đã chạm giới hạn mà item chưa có label. Cách này không cần thêm scope `write:jira-work` cho token của agent.
3. **Không lặp tên issue type.** Hợp đồng đã có `jira_issue_type` trong `work-items.yaml`, nên `tracker/jira.yaml` không khai báo lại, và quy tắc J2 không đòi ánh xạ work type. Giữ nguyên tắc "mỗi id chỉ khai báo ở một nơi" của `sdlc-contract`.
4. **Quy tắc của ánh xạ mang mã `J1`–`J4`**, cùng dạng lỗi `{ rule, path, message }` như `R1`–`R8`. `npm run validate` kiểm cả hợp đồng lẫn ánh xạ. Fixture âm nằm ở `tests/fixtures/tracker/invalid/`, dùng lại helper vá của `sdlc-contract`.
5. **Chỉ hai file gọi mạng:** `jira-client.mjs` và `github-client.mjs`. Mọi hàm khác nhận client qua tham số. Client có chế độ chỉ đọc; `jira:check` luôn dùng chế độ này, và có test kiểm điều đó.
6. **Dữ liệu mẫu lấy từ API thật, đã làm sạch.** Từ T9, response được ghi từ space `DEMO` vào `tests/fixtures/tracker/api/`, cắt bớt phần thừa, và thay email, account id bằng giá trị giả.
7. **So sánh tách khỏi script.** `lib/tracker/drift.mjs` so cấu hình Jira với ánh xạ, `scripts/jira-check.mjs` chỉ gọi API và in kết quả. File `drift.mjs` không có trong cây thư mục ở spec mục 5. Tương tự, logic của hook nằm ở `lib/tracker/guard.mjs`; file trong `kit/.claude/hooks/` chỉ đọc stdin, gọi thư viện và in quyết định.
8. **Token không đi qua chat, log hay lịch sử lệnh.** Bạn đặt biến môi trường user bằng hộp thoại Environment Variables của Windows, không dùng `! setx`, vì lệnh có `!` hiện lên trong cuộc trò chuyện. Claude đọc biến từ registry ngay bên trong lệnh và không in ra. Secret của GitHub được đặt bằng cách pipe vào `gh secret set`. Client không bao giờ log header.
9. **Kết quả kiểm thật ghi ở `tasks/verification.md`**: ngày, bước đã làm, kết quả, ảnh chụp nếu có, không ghi token. File này được lưu trữ cùng plan khi module xong.
10. **Quy trình nhánh giữ như `sdlc-contract`:** mỗi task một nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR khi CI xanh, rồi làm tiếp. Claude dừng ở các checkpoint để bạn soát.

## Thứ tự và phụ thuộc

```
T1 kết nối thật ──────────────────────────────┐
T2 hợp đồng: Agent, rework                    │
 └─ T3 jira.yaml: danh tính, J1, J4           │
     └─ T4 ánh xạ workflow, trường, board; J2, J3
         ├─ T6 đếm rework                     │
         └─ T7 checklist ── T8 bạn dựng DEMO ◄┘
                             └─ T9 jira:check (1) ── T10 jira:check (2)
T5 quy ước mã Jira (độc lập)
T6, T10 ── T11 dữ kiện Jira ── T12 dữ kiện GitHub (cần T5)
           └─ T13 jira-guard ── T14 rework và chặn đường vòng ── T15 kiểm thật hook (cần T8)
T11, T12 ── T16 đối soát ── T17 jira-sync ── T18 kiểm thật trên ao-pilot (cần T8)
T19 hoàn thiện
```

T1 đứng đầu vì nếu service account không dùng được với Rovo MCP thì phải chuyển sang phương án dự phòng của spec, và phương án đó đổi cách cài đặt. T5 làm song song được với T2–T4, nhưng gói Pro giới hạn usage nên mặc định làm lần lượt.

## Danh sách task

### Giai đoạn 1: kết nối thật và ánh xạ
- [x] T1: Kết nối thật bằng hai service account
- [x] T2: Hợp đồng: trường Agent và cách đếm rework
- [x] T3: `tracker/jira.yaml` phần danh tính, quy tắc J1 và J4
- [x] T4: Ánh xạ workflow, trường, board và môi trường, quy tắc J2 và J3
- [x] T5: Quy ước gắn mã Jira
- [x] T6: Đếm rework từ lịch sử item

### Checkpoint 1
- [x] `npm run validate`, `npm test`, `npm run render:check` xanh
- [x] Kết nối của T1 chạy được, kết quả ghi trong `tasks/verification.md`
- [x] Bạn soát tên status và transition trong `tracker/jira.yaml`: đây là những tên bạn sẽ thấy trên Jira

Đã qua ngày 2026-10-27: bạn giữ nguyên mọi tên trong `tracker/jira.yaml`, kể cả tiền tố `AO` (viết tắt của ai-orchestrator).

### Giai đoạn 2: dựng Jira và kiểm lệch
- [x] T7: Sinh checklist dựng Jira
- [x] T8: Bạn dựng space `DEMO` theo checklist
- [x] T9: `jira:check` phần 1: status, transition, scheme
- [x] T10: `jira:check` phần 2: rule Restrict, board, trường, hạn token

### Checkpoint 2
- [x] Tiêu chí 2, 3 và 6 của spec mục 9 đạt
- [x] Bạn xem board `DEMO` và `docs/jira-setup.md`

### Giai đoạn 3: agent và hook
- [x] T11: Dữ kiện từ Jira cho guard
- [x] T12: Dữ kiện từ GitHub cho guard
- [x] T13: Hook `jira-guard`
- [x] T14: Hook đếm rework và hook chặn đường vòng
- [x] T15: Kiểm thật agent và hook trên `DEMO`

### Checkpoint 3
- [ ] Tiêu chí 4 và 5 của spec mục 9 đạt
- [ ] Bạn xem lịch sử item thử trên `DEMO`

### Giai đoạn 4: automation trên GitHub Actions
- [x] T16: Đối soát: chọn transition của `automation`
- [ ] T17: `jira-sync` và workflow GitHub Actions
- [ ] T18: Kiểm thật trên `ao-pilot`

### Checkpoint 4
- [ ] Tiêu chí 7 và 8 của spec mục 9 đạt

### Giai đoạn 5: hoàn thiện
- [ ] T19: README, đóng câu hỏi mở của `SPEC.md`, lưu trữ plan

### Checkpoint cuối
- [ ] Đạt 9 tiêu chí ở spec mục 9
- [ ] Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/tracker-integration/`

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Rovo MCP từ chối token `Bearer` của service account | Cao | T1 làm đầu tiên; thử Basic auth với email của service account; nếu vẫn hỏng thì dừng và hỏi bạn về phương án dự phòng của spec |
| Token lộ qua chat, log hoặc lịch sử lệnh | Cao | Quyết định 8; client không log header; test kiểm thông báo lỗi không chứa token |
| Bạn không approve được PR do chính tài khoản `TungPH7` mở, nên `deploy-to-qa` không xảy ra thật | Cao | T18 kiểm `jira-sync` đứng yên và báo thiếu `merge-approved`; chặng sang Ready for QA kiểm ở `quality-gates` (câu hỏi 1) |
| Gói Free không có rule Restrict | Trung bình | T8 kiểm ngay khi dựng; nếu không có thì ghi vào spec và checklist, hook là lớp chặn duy nhất (tiêu chí 6 đã tính trường hợp này) |
| REST API không trả rule Restrict hoặc cấu hình workflow mới | Trung bình | `jira:check` in dòng "cần kiểm tay" cho phần không đọc được, không báo đạt |
| `agent_type` không có trong một số cách gọi agent | Trung bình | Không có `agent_type` thì chặn, là mặc định an toàn; T15 thử với subagent thật |
| Hook của dự án chỉ chạy sau khi bạn tin cậy thư mục | Thấp | T15 chạy Claude Code tương tác trong `ao-pilot` lần đầu để bạn chấp nhận |
| `workflow_run` và `deployment_status` chỉ chạy từ nhánh mặc định | Thấp | T18 đưa workflow lên `main` của `ao-pilot` trước khi thử |
| Dữ liệu mẫu lộ email, account id | Thấp | Quyết định 6 |
| Hết usage giữa task | Thấp | Task cỡ S hoặc M; mỗi task một PR; tiến độ đánh dấu trong `todo.md` |

## Câu hỏi đã trả lời (2026-10-27)

1. **Chặng `deploy-to-qa` của tiêu chí 7:** làm như đề xuất. Mọi PR trong `ao-pilot` đều do tài khoản `TungPH7` mở, mà GitHub không cho tác giả tự approve PR của mình, nên guard `merge-approved` không thỏa. T18 kiểm `jira-sync` đứng yên và báo thiếu `merge-approved`; chặng sang Ready for QA kiểm thật ở `quality-gates`, sau khi chốt danh tính mở PR cho agent. Tiêu chí 7 của spec đã được sửa theo.
2. **Ngày hết hạn của hai token:** cả hai hết hạn ngày 2027-10-27. T3 ghi ngày này vào `tracker/jira.yaml`.

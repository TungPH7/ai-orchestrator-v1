# Plan triển khai: quality-gates

> **Spec:** [SPEC-quality-gates.md](../SPEC-quality-gates.md), đã duyệt 2026-10-29. **Trạng thái:** đã duyệt 2026-10-29, đang làm. **Task chi tiết:** [todo.md](todo.md). **Kết quả kiểm thật:** [verification.md](verification.md), tạo ở T1.

## Tổng quan

Biến các cổng tự động của hợp đồng thành kiểm tra thật trên repo private gói Free. Việc gồm: hai GitHub App cho agent; cấu hình `quality/gates.yaml` cùng 4 quy tắc kiểm; hook git ở local và hook `gh-guard` của Claude Code; workflow `CI` bốn job; `merge-gate` tự merge sau khi bạn approve; `audit` chặn deploy commit không qua cổng; và `gh:protect` áp ruleset khi repo hỗ trợ. Plan kiểm thật sớm như `tracker-integration`: T3 thử ba giả định nền về GitHub App và environment trước khi viết code phụ thuộc vào chúng.

## Quyết định kiến trúc

1. **Kiểm giả định nền trước (T1–T3).** Ba điều spec dựa vào mà chưa ai thử trên repo của bạn: bot của `ao-review` request changes được trên PR do bot của `ao-dev` mở; merge bằng token App thì push vào `develop` vẫn kích hoạt workflow; giới hạn nhánh của environment được thực thi trên gói Free. Điều nào sai thì sửa spec trước khi viết `merge-gate`.
2. **Quy tắc của `quality/gates.yaml` mang mã `Q1`–`Q4`**, cùng dạng lỗi `{ rule, path, message }` như `R1`–`R8` và `J1`–`J4`. `npm run validate` kiểm cả hợp đồng, ánh xạ Jira và cấu hình cổng. Fixture âm nằm ở `tests/fixtures/quality/invalid/`. `Q2` (khớp tên job của `ci.yml`) thêm ở T12, khi `ci.yml` đã có.
3. **Hàm quyết định thuần, script mỏng.** `decideMerge`, `decideAudit` và hàm phân loại lệnh của `gh-guard` nhận dữ kiện đã gom và trả quyết định; script chỉ gom dữ kiện, gọi hàm và thực hiện. Giống `reconcile.mjs` và `guard.mjs` của `tracker-integration`.
4. **Dùng lại `facts.mjs`, không chép.** `readChecks` và cách đọc review được export để `merge-gate` và `audit` tính "CI xanh" và "yêu cầu sửa" đúng như guard `ci-green` và `changes-requested`.
5. **`github-client.mjs` có chế độ ghi khi truyền `write: true`**, như `jira-client.mjs`. Mặc định chỉ đọc; test kiểm chế độ chỉ đọc từ chối request ghi.
6. **Key và token không đi qua chat, log hay lịch sử lệnh.** Bạn lưu file PEM ngoài repo và đặt biến môi trường bằng hộp thoại Environment Variables của Windows. Claude đọc biến từ registry ngay trong lệnh. Secret của GitHub được đặt bằng cách pipe file vào `gh secret set`. Thông báo lỗi của `github-app.mjs` không chứa key hay token; test kiểm điều đó.
7. **Cài kit lên `ao-pilot` bằng phiên chính, push thẳng.** `merge-gate.yml` và `jira-sync.yml` phải nằm trên `main` (nhánh mặc định) mới chạy, nên phiên chính đẩy bản chép kit thẳng lên `main` và `develop` như T18 của `tracker-integration`, bỏ qua hook `pre-push`. Các commit này sẽ đỏ `audit` và không được deploy; điều đó đúng thiết kế. Đây là cách làm riêng cho sandbox; dự án thật nhận kit qua `project-scaffold`.
8. **Dữ liệu mẫu lấy từ API thật, đã làm sạch.** Response ghi từ `ao-pilot` vào `tests/fixtures/quality/api/`, thay login và id thật bằng giá trị giả, trừ tên hai App.
9. **Công cụ ghim phiên bản.** gitleaks ghim phiên bản và SHA-256 của file tải về; Semgrep ghim phiên bản trong lệnh `uvx`; secretlint ghim phiên bản chính xác trong `package.json`; action ghim theo SHA.
10. **Quy trình nhánh giữ như hai module trước:** mỗi task một nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR khi CI xanh, rồi làm tiếp. Claude dừng ở các checkpoint để bạn soát.

## Thứ tự và phụ thuộc

```
T1 bạn tạo hai App ── T2 token của App ── T3 kiểm giả định nền ──────────────┐
T4 gates.yaml, Q1 Q3 Q4                                                      │
T5 thay đổi hợp đồng                                                         │
T4 ── T6 commit-msg, pre-push ── T7 pre-commit                               │
T4 ── T8 gh-guard                                                            │
T2, T4 ── T9 ao-pr.mjs, kiểm mô tả PR                                        │
T4 ── T10 coverage ── T11 policy                                             │
T7, T11 ── T12 ci.yml, Q2                                                    │
T6, T7, T12 ── T13 kiểm thật hook git và CI trên ao-pilot                    │
T5, T9 ── T14 decideMerge ── T15 merge-gate ◄────────────────────────────────┘
T14 ── T16 audit
T4 ── T17 gh:protect
T8, T9, T13, T15, T16 ── T18 agent mở PR, review, gh-guard
                          └─ T19 merge-gate và deploy-to-qa ── T20 audit với merge tay
T21 hoàn thiện
```

T1–T3 đứng đầu vì nếu một giả định nền sai thì `merge-gate` phải đổi cách làm. T4–T12 phần lớn độc lập với nhau, nhưng gói Pro giới hạn usage nên mặc định làm lần lượt.

## Danh sách task

### Giai đoạn 1: danh tính và nền
- [x] T1: Tạo hai GitHub App bằng manifest flow [bạn]
- [x] T2: Token của GitHub App
- [x] T3: Kiểm giả định nền trên `ao-pilot` [bạn]
- [x] T4: `quality/gates.yaml`, quy tắc Q1, Q3, Q4
- [x] T5: Thay đổi hợp đồng: stage `merge`, template báo cáo review

### Checkpoint 1
- [x] `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check` xanh
- [x] Ba giả định nền của T3 đúng, kết quả ghi trong `tasks/verification.md`; giả định nào sai thì spec đã được sửa và bạn đã duyệt bản sửa
- [x] Bạn soát các giá trị trong `quality/gates.yaml`: ngưỡng, mẫu tắt kiểm tra, nhánh và file được bảo vệ

Đã qua ngày 2026-10-29: bạn đồng ý thêm `ba`, `sa` vào App `ao-dev`, và bỏ file cấu hình, migration khỏi phần tính coverage.

### Giai đoạn 2: kiểm ở máy bạn
- [x] T6: Hook `commit-msg`, `pre-push` và lệnh cài hook
- [x] T7: Hook `pre-commit` với secretlint
- [x] T8: Hook `gh-guard` của Claude Code
- [x] T9: Script `ao-pr.mjs` và kiểm mô tả PR

### Giai đoạn 3: CI
- [x] T10: Coverage của dòng thay đổi
- [x] T11: Job `policy`: quy ước của PR, mẫu tắt kiểm tra, ngưỡng bị hạ, `npm audit`
- [x] T12: Workflow `CI` bốn job, quy tắc Q2
- [x] T13: Kiểm thật hook git và CI trên `ao-pilot`

### Checkpoint 2
- [x] Tiêu chí 3 và 4 của spec mục 9 đạt
- [x] Bạn xem một lần chạy `CI` đỏ và job summary của nó trên `ao-pilot`

Đã qua ngày 2026-10-29, không có gì phải sửa. PR #3 của `ao-pilot` (PR thử của T13) đã đóng.

### Giai đoạn 4: merge-gate, audit, ruleset
- [x] T14: `decideMerge` và đọc báo cáo review
- [x] T15: `merge-gate`: script và workflow
- [ ] T16: `audit`: quyết định, script, reusable workflow, cờ "Needs you"
- [ ] T17: `gh:protect` và kiểm trên repo public tạm [bạn]

### Checkpoint 3
- [ ] `npm test` xanh; `merge-gate.mjs --dry-run` trên `ao-pilot` in đúng PR nào chờ gì
- [ ] Tiêu chí 11 đạt

### Giai đoạn 5: kiểm thật đầu cuối
- [ ] T18: Agent mở PR, reviewer yêu cầu sửa, `gh-guard` chặn đường vòng [bạn]
- [ ] T19: `merge-gate` merge sau khi bạn approve, item sang Ready for QA [bạn]
- [ ] T20: `audit` chặn commit merge tay [bạn]

### Checkpoint 4
- [ ] Tiêu chí 5 đến 10 và 12 của spec mục 9 đạt
- [ ] Bạn xem lịch sử item thử trên `DEMO` và các PR thử trên `ao-pilot`

### Giai đoạn 6: hoàn thiện
- [ ] T21: README, tài liệu, `SPEC.md`, lưu trữ plan

### Checkpoint cuối
- [ ] Đạt 13 tiêu chí ở spec mục 9
- [ ] Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/quality-gates/`
- [ ] Bạn xác nhận module hoàn thành

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Bot của `ao-review` không request changes được trên PR của bot `ao-dev` | Cao | T3 thử trước khi viết code; nếu hỏng thì dừng và hỏi bạn (phương án: đổi guard `changes-requested` sang đọc báo cáo) |
| Merge bằng token App không kích hoạt workflow của `push` | Cao | T3 thử; nếu hỏng thì `merge-gate` gọi CI và deploy bằng `workflow_dispatch` sau khi merge, và spec được sửa |
| Giới hạn nhánh của environment không được thực thi trên gói Free | Trung bình | T3 thử; nếu hỏng thì key thành secret của repo, ghi rủi ro vào spec mục 12 (tiêu chí 10 đã tính trường hợp này) |
| Key hoặc token lộ qua chat, log, lịch sử lệnh | Cao | Quyết định 6 |
| `gh-guard` chặn nhầm lệnh hợp lệ của agent | Trung bình | Mỗi mẫu bị chặn có test với lệnh gần giống được cho qua; T18 chạy agent thật |
| Bộ rule `p/default` không có finding mức ERROR nào cho code TypeScript mẫu | Trung bình | T13 chọn mẫu code; nếu không có thì báo bạn trước khi đổi ngưỡng |
| Hết phút Actions trong lúc kiểm thật | Trung bình | `concurrency` hủy lần chạy cũ; T13 đo phút của mỗi lần chạy; gộp nhiều thay đổi vào một lần push |
| `merge-gate` không chạy vì chuỗi `workflow_run` vượt ba tầng | Thấp | T19 kiểm cả hai đường: review, và CI chạy xong |
| Xóa repo public tạm cần quyền `delete_repo` mà `gh` chưa có | Thấp | T17: bạn chạy `gh auth refresh` để thêm quyền, hoặc xóa repo trên giao diện |
| Hết usage giữa task | Thấp | Task cỡ S hoặc M; mỗi task một PR; tiến độ đánh dấu trong `todo.md` |

## Câu hỏi mở

Không có. Hai câu hỏi mở của spec đã đóng ngày 2026-10-29 (spec mục 10).

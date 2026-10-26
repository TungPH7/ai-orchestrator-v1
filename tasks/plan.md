# Plan triển khai: sdlc-contract

> **Spec:** [SPEC-sdlc-contract.md](../SPEC-sdlc-contract.md), đã duyệt 2026-10-26. **Trạng thái:** đã duyệt 2026-10-26. **Task chi tiết:** [todo.md](todo.md).

## Tổng quan

Xây hợp đồng quy trình ở dạng YAML trong `contract/`, kèm JSON Schema, thư viện chỉ đọc `lib/contract.mjs`, script kiểm tra, script sinh `docs/sdlc.md`, và 12 template artifact. Mỗi task là một lát dọc: đưa một phần của hợp đồng đi trọn từ YAML, schema, quy tắc kiểm tra, test cho tới phần tương ứng trong `docs/sdlc.md`. Sau mỗi task, `npm run validate`, `npm test` và (từ T5) `npm run render:check` đều xanh.

## Quyết định kiến trúc

1. **Tách đọc file khỏi kiểm tra.** `lib/contract.mjs` có `readContract(dir)` để đọc YAML và danh sách file trong `templates/`, và `validateContract(obj)` là hàm thuần trả về danh sách lỗi. `loadContract(dir)` ghép hai hàm rồi đóng băng kết quả. Test kiểm tra quy tắc trên object trong bộ nhớ, không phải ghi file. `validateContract` là hàm export thêm so với 4 hàm ở spec mục 6.
2. **Mỗi quy tắc một file trong `lib/rules/`**, export một hàm `(contract) → errors[]`. Mỗi lỗi có mã quy tắc (`R1` … `R8`), đường dẫn tới chỗ sai và thông báo tiếng Anh. Test so theo mã quy tắc và đường dẫn, không so nguyên câu.
3. **Fixture âm là bản vá nhỏ áp lên hợp đồng thật.** Mỗi file trong `tests/fixtures/invalid/` có dạng `{ rule, expect, patch }`. `patch` là danh sách thao tác `set` hoặc `remove`, với đường dẫn chọn phần tử mảng theo `id`, ví dụ `workflows.standard.transitions[id=accept].actors`. Fixture không phải chép lại cả 6 file và không vỡ khi thứ tự phần tử trong YAML thay đổi. Mỗi fixture vi phạm đúng một quy tắc, như spec yêu cầu.
4. **Transition "quay lại" được xác định theo thứ tự khai báo state:** transition có `to` đứng trước `from` là transition đi lùi. Quy tắc 5 dựa vào đó để biết transition nào phải có bằng chứng và effect `increment-rework`.
5. **Mỗi id chỉ khai báo ở một nơi.** Guard và effect khai báo ở `workflows.yaml`; danh mục artifact (spec mục 2.9) ở `policies.yaml`; môi trường ở `stages.yaml`. Các file khác chỉ tham chiếu theo id, và quy tắc 3 kiểm mọi tham chiếu. Story, Task, Bug là ba artifact riêng, mỗi artifact một template, nên danh mục có 12 artifact.
6. **Schema chặt:** mọi object dùng `additionalProperties: false`, để gõ sai tên trường bị bắt ngay ở quy tắc 1. Dùng `ajv/dist/2020.js` cho JSON Schema draft 2020-12.
7. **`docs/sdlc.md` sinh tất định:** thứ tự theo YAML, không có ngày giờ, luôn xuống dòng LF. Workflow vẽ bằng Mermaid `stateDiagram-v2`. `render:check` so sau khi chuẩn hóa xuống dòng.
8. **Template `spec.md` và `plan.md` theo cấu trúc của skill agent-skills tương ứng** (`spec-driven-development`, `planning-and-task-breakdown`), để skill dùng được trực tiếp. Phần riêng của dự án (mã Epic, link Jira) đặt ở đầu file.
9. **Nơi để plan:** `tasks/plan.md` và `tasks/todo.md`, vì lệnh `/agent-skills:build` đọc đúng hai đường dẫn này. Khi module xong, hai file được chuyển vào `tasks/archive/sdlc-contract/` để nhường chỗ cho module kế tiếp.
10. **Dependency ghim version chính xác** trong `package.json`, có `package-lock.json`, và `engines.node` là `>=24`.

## Thứ tự và phụ thuộc

```
T1 khung + roles.yaml (R1)
 └─ T2 workflows.yaml (R2, R3)
     ├─ T3 R4, R5
     │   └─ T4 allowedTransitions, checkTransition + kịch bản
     └─ T5 render-docs + Mermaid
         ├─ T6 work-items.yaml (R8)
         ├─ T7 routing.yaml (R6) + routeBug
         └─ T8 policies.yaml + danh mục artifact
             └─ T9 stages.yaml + cổng duyệt
                 └─ T10, T11, T12 template
                     └─ T13 template còn lại + R7
                         └─ T14 CI + README
```

T6, T7 và T8 làm song song được, nhưng gói Pro giới hạn usage nên mặc định làm lần lượt. Workflow được làm trước và có sơ đồ ngay ở T5, vì đây là phần dễ chép sai nhất và mọi module khác đều dựa vào nó.

## Danh sách task

### Giai đoạn 1: khung và workflow
- [x] T1: Khung dự án và `roles.yaml`, quy tắc 1
- [ ] T2: `workflows.yaml`, quy tắc 2 và 3
- [ ] T3: Quy tắc 4 và 5 cho workflow
- [ ] T4: `allowedTransitions`, `checkTransition` và kịch bản chuyển trạng thái
- [ ] T5: `render-docs` với sơ đồ Mermaid cho ba workflow

### Checkpoint 1
- [ ] `npm run validate`, `npm test`, `npm run render:check` xanh
- [ ] Bạn soát sơ đồ ba workflow trong `docs/sdlc.md`, đối chiếu spec mục 2.4

### Giai đoạn 2: phần còn lại của hợp đồng
- [ ] T6: `work-items.yaml`, quy tắc 8
- [ ] T7: `routing.yaml`, quy tắc 6 và `routeBug`
- [ ] T8: `policies.yaml` đầy đủ và danh mục artifact
- [ ] T9: `stages.yaml`: giai đoạn, cổng duyệt, môi trường, nhịp làm việc, release

### Checkpoint 2
- [ ] Đủ 6 file trong `contract/`; quy tắc 1–6 và 8 có test dương và fixture âm
- [ ] Mọi kịch bản ở spec mục 7 chạy được bằng `lib/contract.mjs`
- [ ] Bạn đọc toàn bộ `docs/sdlc.md`, đối chiếu spec mục 2

### Giai đoạn 3: template
- [ ] T10: Template `spec.md`, `plan.md`, `adr.md`
- [ ] T11: Template `story.md`, `task.md`, `bug.md`, `pull-request.md`
- [ ] T12: Template `review-report.md`, `qa-report.md`, `regression-report.md`
- [ ] T13: Template `release-notes.md`, `ledger.md` và quy tắc 7

### Checkpoint 3
- [ ] `npm run validate` xanh với cả quy tắc 7
- [ ] Bạn xem nhanh 12 template

### Giai đoạn 4: hoàn thiện
- [ ] T14: CI cho repo kit và README

### Checkpoint cuối
- [ ] Đạt 6 tiêu chí hoàn thành ở spec mục 9
- [ ] Bạn xác nhận `docs/sdlc.md` khớp với các quyết định trong `misc/brainstorm-discussion.md` (tiêu chí 6)
- [ ] Chuyển `tasks/plan.md` và `tasks/todo.md` vào `tasks/archive/sdlc-contract/`

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Chép sai nội dung từ spec sang YAML (thiếu transition, sai actor) | Cao | Sơ đồ Mermaid có từ T5 để bạn soát sớm; test kiểm các con số chính (12 vai trò, 11 giai đoạn, 5 cổng, 9 transition của workflow `standard`); checkpoint 2 đối chiếu toàn bộ |
| `render:check` fail trên Windows vì CRLF | Trung bình | `.gitattributes` đặt `eol=lf`; so sau khi chuẩn hóa xuống dòng |
| Schema quá lỏng nên lọt lỗi gõ sai | Trung bình | `additionalProperties: false` ở mọi object; có fixture âm cho trường lạ |
| Fixture âm vỡ khi sửa hợp đồng | Thấp | Chọn phần tử theo `id`, không theo chỉ số mảng |
| Hết usage giữa task | Thấp | Task cỡ S hoặc M; mỗi task commit riêng; tiến độ đánh dấu trong `todo.md` |
| Thông báo lỗi của validator khó hiểu | Thấp | Mỗi lỗi có mã quy tắc và đường dẫn tới chỗ sai |

## Câu hỏi đã trả lời (2026-10-26)

1. **Commit đầu tiên:** ba commit riêng, theo thứ tự `misc/`, rồi `SPEC.md` và `SPEC-sdlc-contract.md`, rồi `tasks/`.
2. **Repo GitHub:** `https://github.com/TungPH7/ai-orchestrator-v1.git`. Thư mục repo đổi tên từ `ai-orchestrator` thành `ai-orchestrator-v1` cho khớp.
3. **Quy trình nhánh của repo kit:** `main`, mỗi task một nhánh ngắn, xong thì merge vào `main` qua PR.

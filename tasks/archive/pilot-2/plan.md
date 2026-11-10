# Plan triển khai: Pilot 2

> **Spec:** [SPEC-pilot-2.md](../../../SPEC-pilot-2.md), đã duyệt 2026-11-07 (Phiên 27 · Lượt 74). **Trạng thái:** hoàn thành 2026-11-10, xem [verification.md](verification.md).

## Quyết định

1. **Hai câu hỏi mở của spec, theo đề xuất** (Lượt 74): rollback chạy trên Development; `qa` chạy cho cả 8 item.
2. **Thứ tự hạ tầng:** `SMP-17` được build và review trước, trong lúc đó Claude dựng dự án `sample` trên VPS và đặt `baseline` tại head của `develop`. Bạn merge `SMP-17` sau cùng, nên commit merge của nó là lần deploy thật đầu tiên.
3. **Lệnh chạy từ kit:** `ao-step` chạy bằng `AO_KIT_DIR` trỏ tới kit, như với `ao-pilot`, để mọi bản sửa kit trong lúc chạy có hiệu lực ngay. Bản chép kit của `ao-sample` ở `0edf8df` được dùng cho CI và hook.
4. **Không chép kit lên VPS** trừ khi deployer cần sửa; khi đó Claude hỏi bạn trước.

## Task

| Task | Nội dung | Ai |
|---|---|---|
| T1 | Spec, plan, nhật ký | Claude |
| T2 | Tạo `SMP-17`; cài App `ao-deploy` vào `ao-sample`; Cancel 5 Task chép kit cũ | Claude, bạn |
| T3 | `SMP-17`: `/ao-build` của `devops`, commit `deploy.yaml` và `AO_KIT_PEERS` dưới tên bot, `/ao-review`, `/ao-fix` nếu cần | Claude |
| T4 | VPS: dự án `sample`, file bí mật rỗng, deployment giả inactive, `baseline` | Claude, bạn nạp key |
| T5 | Gate ③ của `SMP-17`; deploy Development đầu tiên; kiểm basic auth, `/api/notes`, smoke | Bạn, Claude |
| T6 | `/ao-qa` cho 8 item trên Development; Accept | Claude, bạn |
| T7 | Fix Version; gate ④ `/ao-release v0.1.0`; Staging | Bạn, Claude |
| T8 | `/ao-ship v0.1.0`; gate ⑤; Production; Release trên Jira; Complete Epic | Claude, bạn |
| T9 | Rollback trên Development và đưa bản mới về lại | Claude |
| T10 | Checkpoint cuối: RAM, chi phí, các bước thêm dự án thứ hai, lỗi kit | Claude |

## Chi phí

Khoảng 30–40 USD [Ước tính], theo mục 3 của spec. Claude dừng và hỏi bạn nếu tổng vượt 40 USD.

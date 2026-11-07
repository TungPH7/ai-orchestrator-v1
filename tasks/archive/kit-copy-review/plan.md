# Plan triển khai: kit-copy-review

> **Spec:** [SPEC-kit-copy-review.md](../../../SPEC-kit-copy-review.md), đã duyệt 2026-11-07 (Phiên 27 · Lượt 67). **Trạng thái:** hoàn thành 2026-11-07 (Phiên 27 · Lượt 72).

## Tổng quan

Mỗi bản kit chỉ được agent review đầy đủ một lần. PR chép bản đó sang dự án khác được `ao-step` so byte với head đã review, rồi đăng hai báo cáo mà không gọi agent. Cùng đợt này: thêm ý từ checklist Cloudflare vào prompt `security`, và sửa ba lỗi kit mà bài thử review tìm ra.

## Quyết định kiến trúc

1. **Hàm thuần, script mỏng.** `decideKitCopy` nhận dữ liệu đã đọc và trả `{ ok, reason }`. Phần đọc GitHub nằm trong `facts`, phần chạy `render-agents` và đăng báo cáo nằm trong `ao-step`.
2. **`decideReview` vẫn thuần.** `facts.kitCopy` có sẵn kết quả, cả kết quả dựng lại file render. Khi đạt, `decideReview` trả một `action`, như `release-pr` hay `deploy-request`. `runGo` đã có sẵn đường cho `action`, rồi đọc lại facts, nên sau khi đăng báo cáo lệnh tự dừng ở gate ③.
3. **Mọi lỗi đều rơi về review bằng agent.** `readKitCopy` không ném lỗi: lỗi mạng, cây bị cắt hay thiếu quyền đều thành `{ ok: false, reason }`.
4. **Chỉ đăng báo cáo còn thiếu trên head.** Một lượt agent đã đăng báo cáo trên head thì không bị ghi đè.
5. **Đăng đúng SHA đã kiểm.** Hàm đăng nhận SHA, không đọc lại head như `lib/quality/ao-pr.mjs`.
6. **Không đổi `merge-gate`, `audit`, VPS.** Một test khẳng định `unmetConditions` nhận báo cáo do `ao-step` viết.

## Task

| Task | Nội dung | PR |
|---|---|---|
| T1 | Spec, plan, số liệu bài thử, nhật ký | tài liệu |
| T2 | Ba lỗi kit, test trước | code |
| T3 | Prompt `security`, render lại agent | code |
| T4 | Khối `kit_copy`, `decideKitCopy`, bản báo cáo | code |
| T5 | `readKitCopy`, nhánh trong `decideReview`, dựng lại file render, đăng báo cáo | code |
| T6 | Tài liệu | tài liệu |
| T7 | **[bạn]** Chép kit vào `ao-pilot`, review đầy đủ | dự án |
| T8 | **[bạn]** Chép cùng bản vào `ao-sample` bằng `Kit review:`, thử một byte khác | dự án |

## Chi phí

T1–T6 không gọi agent trả tiền. T7 là lượt review đầy đủ của bản kit mới, khoảng 8–16 USD [Ước tính]. T8 là 0 USD.

## Rủi ro

Xem spec mục 8. Điểm cần canh ở T7: nếu `reviewer` hay `security` tìm ra lỗi trong chính phần so byte, sửa ở kit rồi chép lại trước khi sang T8.

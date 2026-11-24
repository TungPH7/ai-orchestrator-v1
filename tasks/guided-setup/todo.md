# Todo: setup có hướng dẫn

> **Spec:** [SPEC-guided-setup.md](../../SPEC-guided-setup.md). **Quyền:** Phiên 36 · Lượt 8, phiên chính làm tới hết,
> tự approve và Accept; chỉ hỏi bạn việc thiếu quyền, việc xóa không lấy lại được, gate ④ ⑤.

Thứ tự theo Lượt 7. Mỗi mục xong thì đánh dấu, kèm một dòng kết quả.

- [x] 1. SPEC ngắn: `SPEC-guided-setup.md`. Phiên chính duyệt thay bạn theo quyền Lượt 8.
- [x] 2. `ao-kit-setup.md` ở gốc kit, cho phiên chính.
- [x] 3. Code, test viết đỏ trước:
  - `ao-kit verify` (`lib/scaffold/verify.mjs`, `scripts/ao-kit.mjs`), 2 test;
  - `add` ghi `.ai/setup/add-report.md`, kèm hai mục Spring Boot phải ghi tay, 1 test;
  - `init` coi thư mục chỉ có `.ai/` là trống, để `answers.md` có trước `init`.
- [x] 4. Tài liệu cho người: `docs/quick-start.md`, `docs/setup-steps.md` (chuyển từ `misc/thao-luan/setup-du-an/`), một
  dòng trong `getting-started.md` và `README.md`, dòng `verify` trong bảng tra lệnh.
- [x] 5. Chạy thử thật trên `du-an-1` (spec mục 6), ghi vào [verification.md](verification.md); sửa kit theo những gì
  lần chạy tìm ra. Đạt 2026-11-25: `doctor` và `verify` xanh, ba app trên Development; 15 chỗ sửa qua kit PR #360,
  #361 và PR chốt bước này.
- [ ] 6. Review một lần: chép kit vào `shop` trong một Task, review PR chép kit, sửa Critical và High, QA, Accept.

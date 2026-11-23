# Threat model: nhập thiết kế Claude Design và mã màn hình (mục 10)

> Lập ngày 2026-11-24, trước lần review trả tiền (memory "threat model before a paid review", Phiên 35 · Lượt 77–78). Phạm vi: `/ao-design`, `scripts/design-inbox.mjs`, `lib/quality/design-inbox.mjs`, `lib/quality/screen-codes.mjs`, phần sửa `check-design`, `check-policy`, `/ao-spec`, prompt của `ux` và `fe-dev`.

## Những gì cần giữ và ai với tới được

| Thứ cần giữ | Ai với tới | Bảo vệ |
|---|---|---|
| Chỉ dẫn của agent: `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.mcp.json` | Nội dung artifact, do bạn hay người được chia sẻ viết; link truyền cho `--url` | `add` chỉ nhận link đúng dạng artifact Claude, nên tên thư mục không bao giờ ra ngoài hộp; chỉ giữ file nguồn theo danh sách cho phép, không bao giờ giữ một file chỉ dẫn, ở mọi cách viết hoa thường (Windows nạp `claude.md` như `CLAUDE.md`, đã gặp khi viết fixture); và từ chối thư mục tải về nằm trong dự án |
| Phiên chính: token của bạn, đăng nhập claude.ai, Atlassian MCP, `gh` | Chữ trong artifact | Skill ghi rõ chữ trong artifact là dữ liệu; phiên chính chỉ chạy các lệnh cố định của script; công cụ Artifact đánh dấu nội dung là không tin cậy |
| Máy của bạn khi chụp ảnh: trình duyệt, mạng, file | HTML của khung | `<head>` được dựng lại: CSP, stylesheet của Google Fonts dựng từ URL đã lọc, và chữ của các khối `<style>`. Trong body, dấu `<` của mọi thẻ chạy, tải, nhúng hay chuyển trang (`script`, `iframe`, `object`, `embed`, `frame`, `base`, `form`, `meta`, `link`, `style`, `template`, `portal`, `applet`, `noscript`) bị escape, không xóa gì ở bước đó, nên hai nửa không ghép lại thành thẻ được. CSP `default-src 'none'; base-uri 'none'; form-action 'none'` có trong trang và trong header của server. Server chỉ phục vụ `render/`, ở `127.0.0.1`, cổng ngẫu nhiên, chặn `..`, trả 400 khi URL hỏng. Playwright CLI ghim `0.1.22`, gọi không qua shell |
| File mà `render` đọc | Agent có quyền ghi `.ai/**` sửa `inbox.yaml` | `render` chỉ đọc khung ở `<id artifact>/project/<tên>.dc.html`, mã đúng dạng, biến thể đúng dạng |
| Repo: `docs/specs/<EPIC>/design/` | `ux` chép ảnh và `*.dc.html` | `check-design` D8: file bản mẫu chỉ là `.html` trong `design/`, tối đa 256 KB; bạn đọc diff ở gate ①; `fe-dev` đọc bản mẫu như dữ liệu, không chép markup, không lấy hex |
| Sổ mã `docs/design-system/screens.md` | `ux` (quyền ghi mới) | `check-design` D11 và job `policy` kiểm; bạn duyệt ở gate ①; gh-guard chỉ cho `ux` ghi đúng file này trong `docs/design-system/` |
| Điểm dừng của `/ao-spec` | Ai sửa được mô tả Epic | Chỉ làm `/ao-spec` dừng chờ `/ao-design`, không mở đường nào khác |

## Rủi ro còn lại (chấp nhận, ghi lại)

1. **Mã băm trong `inbox.yaml` không phải chốt chặn trước agent cố ý.** Agent ghi được cả file của hộp thiết kế lẫn `inbox.yaml` bằng Bash, như với `state.json` (SPEC-review-per-item.md mục 7c). Mã băm bắt thay đổi vô tình; bạn duyệt ảnh và bản mẫu ở gate ①. Chốt thật là tài khoản Windows `ao-agent` (SHOP-40).
2. **Chữ của thiết kế đi vào ngữ cảnh của `ux` và `fe-dev`.** Prompt ghi rõ đó là dữ liệu. Thiết kế do người khác chia sẻ là nguồn đáng ngờ nhất: đọc kỹ bản mẫu ở gate ①.
3. **Google Fonts thấy một lần chụp ảnh** (địa chỉ IP, font nào). Chấp nhận: thiết kế dùng Google Fonts sẵn.
4. **Bóc vỏ canvas bằng regex không phải bộ lọc HTML đầy đủ.** Chốt chính là CSP trong trang và việc trang không có script; bóc vỏ chỉ là lớp thứ hai.
5. **Khung động** (`{{ }}`, `sc-for`, `dc-import`) không được chụp; bạn chụp tay. Không chạy runtime của Claude Design trên máy.

## Rà độc lập trước kit PR (2026-11-24)

Một agent đọc diff mà không có threat model này, và tìm ra 2 High, 4 Medium, 6 Low. Cả hai High đều đã được chạy lại để xác nhận. Tất cả đã sửa, mỗi cái có test (`tests/quality/design-inbox-review.test.mjs`):

- **High:**
  - thẻ meta refresh lọt qua bước xóa thẻ bằng regex (xóa xong, hai nửa ghép lại), khiến trình duyệt rời trang có CSP và chạy script ở trang mới;
  - `--url` làm tên thư mục mà không kiểm, nên ghi được file vào `.claude/rules/`.
- **Medium:**
  - ảnh mobile của khung gốc đè lên ảnh của khung `-mobile`;
  - link dạng smart link không được đọc, còn link artifact không phải thiết kế thì chặn `/ao-spec` mãi (nay có `skip`);
  - skill bảo bỏ ảnh chụp vào hộp, nhưng `render` không nhận ảnh đó;
  - skill bảo bỏ thư mục tải về vào trong dự án.
- **Low:**
  - ảnh cũ được coi như ảnh mới;
  - server sập khi URL hỏng, và trình duyệt không đóng khi lỗi;
  - JSON lạ làm thư viện ném lỗi;
  - không giới hạn bề rộng;
  - `codes` nhận tham số sai, và sổ mã đọc nhầm bảng nằm trong comment;
  - prompt của `ux` có hai luật mâu thuẫn và chưa ghi tên cột.

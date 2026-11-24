# Threat model: nhập thiết kế Claude Design và mã màn hình (mục 10)

> Lập ngày 2026-11-24, trước lần review trả tiền (memory "threat model before a paid review", Phiên 35 · Lượt 77–78). Phạm vi: `/ao-design`, `scripts/design-inbox.mjs`, `lib/quality/design-inbox.mjs`, `lib/quality/screen-codes.mjs`, phần sửa `check-design`, `check-policy`, `/ao-spec`, prompt của `ux` và `fe-dev`.

## Những gì cần giữ và ai với tới được

| Thứ cần giữ | Ai với tới | Bảo vệ |
|---|---|---|
| Chỉ dẫn của agent: `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.mcp.json` | Nội dung artifact, do bạn hay người được chia sẻ viết; link truyền cho `--url` | `add` chỉ nhận link đúng dạng artifact Claude, nên tên thư mục không bao giờ ra ngoài hộp; chỉ giữ file nguồn theo danh sách cho phép, không bao giờ giữ một file chỉ dẫn, ở mọi cách viết hoa thường (Windows nạp `claude.md` như `CLAUDE.md`, đã gặp khi viết fixture); và từ chối thư mục tải về nằm trong dự án |
| Phiên chính: token của bạn, đăng nhập claude.ai, Atlassian MCP, `gh` | Chữ trong artifact | Skill ghi rõ chữ trong artifact là dữ liệu; phiên chính chỉ chạy các lệnh cố định của script; công cụ Artifact đánh dấu nội dung là không tin cậy |
| Máy của bạn khi chụp ảnh: trình duyệt, mạng, file | HTML của khung | `<head>` được dựng lại: CSP, stylesheet của Google Fonts dựng từ URL đã lọc, và chữ của các khối `<style>`, trong đó mọi dấu `<` thành `\3c ` (mục 12: trước đó bước xóa `</style` để `</sty</stylele>` đóng khối style). Trình duyệt chạy trong một thư mục tạm của tài khoản bạn, ngoài dự án, có `package.json` riêng nên `npx` không tìm `node_modules` ở thư mục cha, với config của kit (chỉ tải từ server cục bộ và Google Fonts, không tải file về, file ra ở thư mục tạm), không đọc biến `PLAYWRIGHT_MCP_*`, `PWTEST_*`, `NODE_OPTIONS`; ảnh chỉ được giữ khi trang vẫn là trang đã phục vụ. Trong body, dấu `<` của mọi thẻ chạy, tải, nhúng hay chuyển trang (`script`, `iframe`, `object`, `embed`, `frame`, `base`, `form`, `meta`, `link`, `style`, `template`, `portal`, `applet`, `noscript`) bị escape, không xóa gì ở bước đó, nên hai nửa không ghép lại thành thẻ được. CSP `default-src 'none'; base-uri 'none'; form-action 'none'` có trong trang và trong header của server. Server chỉ phục vụ `render/`, ở `127.0.0.1`, cổng ngẫu nhiên, chặn `..`, trả 400 khi URL hỏng. Playwright CLI ghim `0.1.22`, gọi không qua shell |
| File mà `render`, `add`, `skip` đọc và ghi | Agent có quyền ghi `.ai/**`: sửa `inbox.yaml`, khung, hay đặt symlink, junction, hard link trong hộp | `render` chỉ đọc khung ở `<id artifact>/project/<tên>.dc.html`, mã đúng dạng, biến thể đúng dạng, mã băm khớp `inbox.yaml`. Mục 12: mọi thư mục từ gốc dự án tới file phải là thư mục thật; file chỉ được ghi đè khi là file thường, ghi bằng cờ `wx` sau khi xóa; file đọc hay chép phải là file thường có một tên (ảnh chụp là hard link tới file khác thì không chép) |
| Repo: `docs/specs/<EPIC>/design/` | `ux` chép ảnh và trang `render/<mã>.html` | `check-design` D8: bản mẫu là `.html` trong `design/`, tối đa 256 KB, và phải đúng là trang `render` viết: `<head>` của kit, không có thẻ chạy, tải hay chuyển trang (mục 12: trước đó `ux` chép nguyên khung, có cả script). `ux` không đọc file khung gốc. Bạn đọc diff ở gate ①; `fe-dev` đọc bản mẫu như dữ liệu, không chép markup, không lấy hex |
| Sổ mã `docs/design-system/screens.md` | `ux` (quyền ghi mới) | `check-design` D11 và job `policy` kiểm; PR đổi sổ mã thì job `policy` kiểm lại D11 của mọi `design.md` dùng mã dự án (mục 12); bạn duyệt ở gate ①; gh-guard chỉ cho `ux` ghi đúng file này trong `docs/design-system/` |
| Điểm dừng của `/ao-spec` | Ai sửa được mô tả Epic | Chỉ làm `/ao-spec` dừng chờ `/ao-design`, không mở đường nào khác. Link có `/` ở cuối vẫn được nhận; Jira trả 404 cho Epic thì dừng, không cho qua (mục 12) |

## Rủi ro còn lại (chấp nhận, ghi lại)

1. **Mã băm trong `inbox.yaml` không phải chốt chặn trước agent cố ý.** Agent ghi được cả file của hộp thiết kế lẫn `inbox.yaml` bằng Bash, như với `state.json` (SPEC-review-per-item.md mục 7c). Mã băm bắt thay đổi vô tình; bạn duyệt ảnh và bản mẫu ở gate ①. Chốt thật là tài khoản Windows `ao-agent` (SHOP-40). **Việc của SHOP-40** (review shop PR #98): trước khi coi `ao-agent` là ranh giới, giữ mã băm của hộp ở nơi `ao-agent` không ghi được (chẳng hạn `%USERPROFILE%\.ao\`), và cho `render` so với bản đó.
2. **Chữ của thiết kế đi vào ngữ cảnh của `ux` và `fe-dev`.** Prompt ghi rõ đó là dữ liệu, và từ mục 12 cả hai chỉ đọc trang đã bóc vỏ, không còn script hay thẻ chạy. Chữ vẫn có thể là một prompt injection: thiết kế do người khác chia sẻ là nguồn đáng ngờ nhất, nên đọc kỹ bản mẫu ở gate ①.
3. **Google Fonts thấy một lần chụp ảnh** (địa chỉ IP, font nào). Chấp nhận: thiết kế dùng Google Fonts sẵn.
4. **Bóc vỏ canvas bằng regex không phải bộ lọc HTML đầy đủ.** Chốt chính là CSP trong trang và việc trang không có script; bóc vỏ chỉ là lớp thứ hai.
5. **Khung động** (`{{ }}`, `sc-for`, `dc-import`) không được chụp; bạn chụp tay. Không chạy runtime của Claude Design trên máy.
6. **Kiểm thư mục và link rồi mới ghi (TOCTOU).** Một agent chạy cùng lúc có thể đổi thư mục thành junction giữa lúc kiểm và lúc ghi. Cửa sổ rất ngắn, và hôm nay agent chạy cùng tài khoản của bạn nên không có thêm quyền gì; khi có `ao-agent`, hộp của một item nên do phiên chính tạo và `ao-agent` chỉ đọc.

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

## Review của shop PR #98 và mục 12 (2026-11-24)

Review trả tiền của bản chép kit `ee5865f` (SHOP-100) không có Critical hay High: 4 Medium, 6 Low (`e-commerce/shop/.ai/reviews/98-reviewer.md`, `98-security.md`). Tất cả đã sửa ở mục 12, mỗi cái có test (`tests/quality/design-inbox-review-98.test.mjs`, `tests/workflow/steps-epic.test.mjs`):

- **Medium:**
  - chữ CSS trong `<head>` vẫn bị xóa bằng regex, nên `</sty</stylele>` ghép thành `</style>` và một refresh sau đó chạy trong `<head>`: nay escape `<` thành `\3c `; thêm lớp thứ hai là config của CLI (chỉ tải từ server cục bộ và Google Fonts, chặn được refresh sang origin khác, đã thử) và kiểm URL trước khi giữ ảnh;
  - link có `/` ở cuối không được nhận, nên `/ao-spec` chạy `ux` khi chưa có thiết kế;
  - `npx` chạy trong hộp, nơi agent ghi được; đọc, chép và ghi đi theo symlink hay junction; khung không được so mã băm: nay chạy trong thư mục tạm ngoài dự án, kiểm link ở mọi bước, so mã băm trước khi vẽ.
- **Low:**
  - lỗi của sổ mã in lại ở mỗi `design.md`: nay D11 chỉ ghi số lỗi, `codes` và job `policy` liệt kê;
  - PR chỉ đổi sổ mã không kiểm `design.md`;
  - `design.mjs` có bản pattern link riêng: nay dùng `isArtifactLink`;
  - Jira trả 404 cho Epic thì `/ao-spec` cho qua;
  - dòng artifact "Thiết kế màn hình" chưa nói tới prototype;
  - `ux` đọc và commit khung gốc có script: nay đọc và commit trang `render/<mã>.html`, D8 kiểm.

Thử thật trên artifact "Landing page hero": ảnh vẫn ra 1440×760 và 390×1214; với khung có `</sty</stylele><meta http-equiv="refresh">`, trang không rời đi, ảnh vẫn là trang hero, và trong dự án không có thư mục `.playwright-cli` nào.

**Rà độc lập các bản sửa của mục 12** (một agent đọc diff và hai báo cáo, chạy thật add và render): không có Critical hay High; 7 Low và 1 ghi chú, đã sửa hết, mỗi cái có test trừ cửa sổ TOCTOU:

- ghi xong thì so `realpath` của file với đường dẫn mong đợi; lệch thì xóa file vừa ghi và dừng (một thư mục bị đổi thành junction giữa lúc kiểm và lúc ghi);
- `check` không đọc file là link, và không in đoạn chữ của một file không parse được;
- một lần từ chối không còn thoát ngang (`process.exit`), nên `render` vẫn ghi `inbox.yaml` và đóng trình duyệt; thư mục tạm còn bị giữ thì chỉ báo lại;
- `npx` chạy với `--prefix` là thư mục tạm, vì npm vẫn tìm lên thư mục cha có `workspaces` dù đã gặp `package.json`;
- `check --link` nhận link có `/` ở cuối;
- PR xóa hay đổi tên sổ mã cũng kiểm lại `design.md` dùng mã dự án;
- handler sau `/` hay dấu nháy cũng bị bỏ, `fencedframe` bị escape. D8 kiểm hình dạng của trang (head của kit, có CSP, không thẻ chạy), không chứng minh được trang do `render` viết: CSP bắt buộc trong trang là chốt chặn cho những gì regex còn sót.
- Mã băm trong `inbox.yaml` vẫn chỉ bắt thay đổi vô tình (rủi ro 1).

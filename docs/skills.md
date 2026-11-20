# Skill của kit

`kit/.claude/skills/` có ba loại skill. Lệnh cài kit chép cả ba vào `.claude/skills/` của dự án.

| Loại | Ở đâu trong roster | Ai giữ nội dung | Cập nhật thế nào |
|---|---|---|---|
| Lệnh của kit (`/ao-*`) | không có | kit | sửa thẳng trong kit |
| Skill chép nguyên văn | `vendored_skills` | tác giả bản gốc | đổi commit trong roster, chạy `npm run skills:vendor -- <tên>`, đọc diff trong PR |
| Skill chuyển thể | `adapted_skills` | kit | so bằng tay với bản gốc, theo các bước ở dưới |

Một role nạp skill chép nguyên văn và skill chuyển thể theo cùng một cách: tên skill nằm trong `skills` của role đó trong `agents/roster.yaml`. Luật A4 của `npm run validate` kiểm điều này.

## Skill chép nguyên văn

- **Khi nào chọn:** phần lớn nội dung của bản gốc hợp với kit.
- **Cách chép:** thêm một dòng vào `vendored_skills`, ghim theo commit đầy đủ. Lệnh `npm run skills:vendor -- <tên>` tải thư mục skill ở đúng commit đó, kèm file giấy phép, và ghi `SOURCE.md` nói skill lấy từ đâu.
- **Không sửa tay:** lần chép sau sẽ ghi đè. Muốn bản khác thì đổi commit rồi chạy lại lệnh, để PR có diff cho bạn đọc.
- **Trước khi chép một repo ít người dùng:** đọc hết `SKILL.md` và mọi file tham khảo. Ví dụ `nextjs-seo` ở dưới.

## Skill chuyển thể

**Khi nào chọn:** bản gốc có nhiều phần không hợp với kit, ví dụ:
- script Python, trong khi kit chỉ có Node;
- API trả phí;
- đồng bộ với CMS;
- một pipeline riêng của bộ skill gốc.

Để nguyên thì agent đọc cả phần thừa ở mọi lượt, vừa tốn token, vừa dễ làm theo nhầm. Kit chép rồi viết lại cho đúng việc của role.

**Cách thêm một skill chuyển thể:**
1. Đọc hết bản gốc ở một commit cố định.
2. Viết bản của kit ở `kit/.claude/skills/<tên>/SKILL.md`. Trong frontmatter, thêm khối `adapted_from`:

   ```yaml
   adapted_from:
     repo: AgriciDaniel/claude-blog
     path: skills/blog-schema
     commit: 4f9c2cb8fd17f594e868d6c2ce0e8fb2c971f987
     license: MIT
     copyright: "Copyright (c) 2025-2026 AgriciDaniel"
   ```

   - `repo`, `path`: repo GitHub và thư mục của skill gốc.
   - `commit`: commit đầy đủ (40 ký tự) mà bản của kit đã so tới.
   - `license`, `copyright`: giấy phép và người giữ bản quyền của bản gốc.
3. Chép file giấy phép của bản gốc vào cùng thư mục, nguyên văn. Thư mục skill có giấy phép riêng thì giữ tên file đó, và giấy phép ở gốc repo thành `REPO-LICENSE`, như `skills:vendor` làm.
4. Thêm tên skill vào `adapted_skills` của `agents/roster.yaml`, và vào `skills` của role dùng nó.
5. Chạy `npm run validate` và `npm test`. Luật A4 báo lỗi khi:
   - thiếu `SKILL.md`, hay `SKILL.md` mang tên khác;
   - khối `adapted_from` thiếu một khóa, hay `commit` không đủ 40 ký tự;
   - skill vừa chuyển thể vừa chép nguyên văn;
   - tên bắt đầu bằng `ao-`.

`npm run skills:vendor -- <tên>` từ chối tên của một skill chuyển thể, vì tải bản gốc về sẽ ghi đè bản của kit.

**Claude Code bỏ qua khóa lạ trong frontmatter,** nên `adapted_from` không ảnh hưởng gì khi skill chạy. Skill chuyển thể chỉ dùng được trong Claude Code: claude.ai và Skills API từ chối khóa lạ.

## So với bản gốc khi bản gốc có bản mới

Không có gì tự báo khi bản gốc đổi. Nên so một lần trước Epic đầu tiên cần skill đó, rồi ở mỗi đợt cập nhật kit.

1. **Xem bản gốc có đổi không.** Lệnh liệt kê các commit mới nhất chạm thư mục skill:

   ```bash
   gh api "repos/<repo>/commits?path=<path>&per_page=5" --jq '.[] | [.sha[0:12], .commit.committer.date[0:10], .commit.message[0:70]] | @tsv'
   ```

   Không có commit nào mới hơn `commit` trong `adapted_from` thì dừng ở đây.
2. **Đọc phần đổi** giữa commit cũ và commit mới, chỉ trong thư mục skill:

   ```bash
   gh api "repos/<repo>/compare/<commit cũ>...<commit mới>" --jq '.files[] | select(.filename | startswith("<path>/")) | "## \(.filename)\n\(.patch)"'
   ```

3. **Xét từng thay đổi** theo bảng "giữ, bỏ, đổi" của skill đó ở mục dưới:
   - **sửa một sự kiện:** đưa vào bản của kit, viết lại cho hợp. Ví dụ: Google bỏ một loại rich result, một ngưỡng đổi, một API của Next.js đổi;
   - **thuộc phần kit giữ:** cân nhắc đưa vào;
   - **thuộc phần kit đã bỏ:** bỏ qua.
4. **Đổi `commit` trong `adapted_from`** sang commit mới, kể cả khi không lấy gì, để lần sau so tiếp từ đó.
5. **Mở một PR** ghi đã lấy gì và bỏ gì. Sửa bảng ở mục dưới nếu phần giữ, bỏ hay đổi thay đổi.

## Bốn skill của `seo` (C1, spec mục 6.5)

### `nextjs-seo`, chép nguyên văn

- **Gốc:** `laguagu/claude-code-nextjs-skills`, `skills/nextjs-seo`, commit `3621047` (2026-11-14, bản 1.7.0), MIT.
- **Đã kiểm trước khi chép (2026-11-20):** phiên chính đọc hết `SKILL.md` và sáu file tham khảo.
  - Các mốc trong `json-ld.md` khớp với trang Search Central updates: FAQ rich result ngừng từ 2026-05-07, Practice Problems bỏ ngày 2026-01-06, nhóm Course Info, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing bỏ năm 2025.
  - Ngưỡng Core Web Vitals đúng.
  - Skill nhắm Next.js 16; app `user` của `shop` dùng 16.4.6.
- **Ghi chú:** Claude Code dùng skill ở `~/.claude/skills/` thay cho skill cùng tên của dự án.
  - Agent không bị ảnh hưởng, vì `ao-agent` đọc skill từ `.claude/skills/` của dự án.
  - Phiên chính thì có: máy của bạn có một bản `nextjs-seo` cũ hơn ở `~/.claude/skills/`, nên phiên chính dùng bản đó.

### `seo-content-brief`, chuyển thể

- **Gốc:** claude-seo, `AgriciDaniel/claude-seo`, `skills/seo-content-brief`, commit `5ae8eec` (2026-11-10), MIT. Bản quyền skill của puneetindersingh, bản quyền repo của agricidaniel.
- **Giữ:**
  - ý định tìm kiếm;
  - dàn ý H1/H2/H3 kèm số chữ;
  - chỗ đặt từ khóa;
  - quy tắc title và meta description;
  - information gain, E-E-A-T, liên kết nội bộ;
  - luật "chỉ viết về điều site thật sự có" và luật trang hub;
  - mẫu theo loại trang.
- **Bỏ:**
  - chế độ cải thiện một trang đang có;
  - bảng chấm điểm đối thủ (thang 40 điểm) và công thức ưu tiên khoảng trống;
  - DataForSEO, Ahrefs;
  - chế độ chỉ ra dàn ý.

  Ba file tham khảo cũng bỏ: danh sách domain loại trừ rút thành một câu, quy tắc từ khóa gộp vào `SKILL.md`, mẫu trang rút thành một bảng.
- **Đổi:**
  - Bước đọc trang chủ và sitemap: đọc repo, vì trang chưa chạy.
  - Bước tìm trang đứng đầu: dùng WebSearch và WebFetch.
  - Loại trang: theo shop (trang chủ, chuyên mục, sản phẩm, blog, landing, giới thiệu, hỏi đáp), thay cho trang dịch vụ, trang địa phương, case study.
  - Kết quả: ghi vào `## SEO` của SPEC, chữ `vi` và `en`, kèm lượt tìm do bạn đưa hoặc "chưa có số liệu".
  - Meta description: 150–160 ký tự như prompt của `seo`; bản gốc ghi 130–150.
- **Sửa chỗ bản gốc tự mâu thuẫn hay lỗi thời:**
  - Mẫu bài blog bắt đặt từ khóa vào alt của ảnh, trái với luật "alt tả ảnh" của chính skill. Bản của kit theo luật alt tả ảnh.
  - Bỏ mục "FAQ cho GEO" ở trang chủ. Google nói tính năng AI của nó không cần schema hay mục riêng nào, và `nextjs-seo` nói FAQ chưa được chứng minh là giúp xếp hạng trong câu trả lời của AI.
  - Bỏ lời khuyên không dùng dấu nháy trong meta description. Đó là chuyện của HTML viết tay; Metadata API của Next.js tự escape.

### `blog-schema`, chuyển thể

- **Gốc:** Claude Blog 2.3.2, `AgriciDaniel/claude-blog`, `skills/blog-schema`, commit `4f9c2cb` (tag v2.3.2, 2026-11-03), MIT, bản quyền AgriciDaniel.
- **Giữ:**
  - các entity BlogPosting, Person, Organization, BreadcrumbList, ImageObject, VideoObject, và `@id` ổn định trong một `@graph`;
  - luật chỉ dùng dữ liệu trang có thật;
  - bảng các loại Google còn hỗ trợ, đã kiểm lại ngày 2026-11-20;
  - các bước kiểm;
  - cách serialize an toàn.
- **Bỏ:**
  - phần chạy trong pipeline của Claude Blog (`blog_render.py`, các thư mục tham khảo của bộ skill);
  - sinh FAQPage, vì prompt của `seo` không dùng FAQ;
  - các dạng xuất để dán vào HTML hay MDX.
- **Đổi, thêm:**
  - `seo` lập kế hoạch trong SPEC, dev agent xây;
  - mỗi ngôn ngữ một graph, có `inLanguage`;
  - ProfilePage cho trang tác giả;
  - danh sách "Kiểm" cho `qa`;
  - ví dụ tiếng Việt với múi giờ `+07:00`;
  - Rich Results Test chỉ chạy được trên Production, vì Development có basic auth.

### `blog-taxonomy`, chuyển thể

- **Gốc:** Claude Blog 2.3.2, `skills/blog-taxonomy`, commit `4f9c2cb`, MIT, bản quyền AgriciDaniel.
- **Giữ:**
  - gợi ý tag: đọc heading, đếm cụm từ, gộp biến thể, công thức điểm;
  - audit: bảng kiểm và thứ tự ưu tiên;
  - quy tắc toàn site: 5–10 chuyên mục; 3–8 tag mỗi bài; một tag có từ 5 bài mới có trang lưu trữ.
- **Bỏ:**
  - đồng bộ với WordPress, Shopify, Ghost, Strapi, Sanity, cùng các biến môi trường và quy tắc gọi API của CMS;
  - lệnh `/blog taxonomy`.
- **Thêm:**
  - lập cấu trúc chuyên mục và tag trong SPEC;
  - tên `vi` và `en`, slug không dấu;
  - gộp biến thể có dấu và không dấu;
  - canonical của từng trang phân trang;
  - hreflang giữa trang chuyên mục hai ngôn ngữ.

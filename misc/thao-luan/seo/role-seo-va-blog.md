# SEO trong kit: role `seo`, skill và blog

> **Thảo luận:** Phiên 33 · Lượt 76–82 (2026-11-19).
>
> **Gắn với:**
> - C1: [SPEC-c1.md](../../../SPEC-c1.md), mục 6 và điểm 6 của mục 13;
> - dòng D2 (workflow nội dung) của [concerns.md](../concerns.md);
> - concern 3, ở [role-moi-trong-sdlc.md](../role-moi-trong-sdlc.md).
>
> **Trạng thái:** một phần đã duyệt (mục 1), một phần còn mở (mục 2). Spec C1 mới ghi các điểm duyệt tới Lượt 80; các điểm duyệt ở Lượt 81–82 và các điểm còn mở chưa vào spec.

**Mục tiêu (Lượt 82):** kit phải sẵn sàng cho dự án thật, không chỉ cho `shop`. `shop` là pilot để kiểm luồng của kit. Dự án có website công khai thì luôn cần SEO để lên top Google, và các website sắp làm sẽ có blog.

## 1. Đã duyệt

| Điểm | Lượt | Nội dung |
|---|---|---|
| Skill `nextjs-seo` | 80 | Chép nguyên văn vào kit, ghim theo commit (`npm run skills:vendor`), chỉ cho `seo`. Phiên chính đọc hết skill và sáu file tham khảo trước khi đưa vào. |
| Skill `seo-content-brief` | 81 | Lấy từ claude-seo. Chép về rồi viết lại thành skill của kit, không để nguyên rồi ghi đè (ý của bạn, xem mục 4.2). |
| `seo` viết chữ thật | 81 | Phần tĩnh của trang công khai: H1, các heading, đoạn mở đầu, nút kêu gọi, title, meta description, alt của ảnh. Viết cả `vi` và `en`, trong mục `## SEO` của SPEC. `fe-dev` đưa nguyên văn vào `messages/*.json`; `reviewer` và `qa` đối chiếu nguyên văn. |
| SEO Specialist làm gốc | 82 | Prompt `seo` lấy agent SEO Specialist của agency-agents làm gốc: đúng chuyên gia bạn mong đợi (từ khóa, cụm chủ đề, backlink, Search Console). Chỉ cần viết lại cho gọn, chọn lọc cái hay, vì bản gốc dài khoảng 3.000 chữ. |

**Phần dữ liệu động,** như mô tả sản phẩm, là dữ liệu admin nhập. `seo` chỉ viết vài dòng hướng dẫn cho người nhập (độ dài, cách trình bày), đưa vào hướng dẫn sử dụng.

## 2. Còn mở

### 2.1 Nguồn từ khóa và quyền web của `seo` (Lượt 80–82)

**Vấn đề:** viết chữ cho SEO cần biết người ta tìm gì và tìm nhiều hay ít. Không có số liệu, agent chỉ đoán từ khóa theo hiểu biết của model.

**Các cách đã nêu:**
- **(a) Agent tự đề xuất,** bạn xem ở cổng ①. Rẻ, nhưng không ai kiểm số liệu.
- **(b) Bạn hoặc phiên chính tìm từ khóa trước `/ao-spec`,** rồi ghi vào Epic. Phiên chính có WebSearch. Đây là đề xuất ở Lượt 80.
- **(c) Cho `seo` dùng web.** Ở Lượt 80 mình không đề xuất, vì phá luật "không agent nào có WebFetch, WebSearch" (spec 2.3 của roster).
- **(d) DataForSEO:** trả phí theo lượt gọi. Không đề xuất lúc này.

**Đề xuất mới (Lượt 81), thay cho (b):** cho riêng `seo` dùng WebSearch và WebFetch, đổi lại `seo` bị bớt quyền:
- không có Bash, không có git;
- chỉ ghi được `docs/specs/**`;
- Jira chỉ đọc.

Nếu một trang web có lệnh chèn vào agent (prompt injection), tệ nhất là `seo` viết sai chữ trong SPEC, và bạn đọc SPEC ở cổng ①. Bước sau, `sa`, commit file của `seo`.

**WebSearch cho được và không cho được gì:**
- **Cho được:** trang nào đang đứng đầu một từ khóa, loại trang (danh mục, bài viết, so sánh), tiêu đề của đối thủ. Như vậy đủ để biết ý định tìm kiếm và dựng dàn ý.
- **Không cho được:** lượt tìm mỗi tháng. SEO Specialist cũng phải lấy số này từ Search Console.

**Lượt tìm:** `seo` ghi "chưa có số liệu" cho từng từ khóa. Muốn có số thì bạn lấy từ Google Keyword Planner (miễn phí, cần tài khoản Google Ads) rồi ghi vào Epic trước `/ao-spec`. Sau khi site chạy thật thì dùng Search Console.

**Chờ bạn:** có mở WebSearch và WebFetch cho riêng `seo` theo cách này không?

### 2.2 Chia việc của SEO Specialist theo thời điểm (Lượt 82)

**Chạy trong `/ao-spec`, cho mỗi Epic:**
- **Từ khóa và ý định tìm kiếm** cho các trang mới (giai đoạn 2), cùng chỗ của từng trang trong cụm chủ đề (trang trụ cột, trang vệ tinh).
- **Chống "ăn thịt từ khóa"** (giai đoạn 2.5): mỗi từ khóa chính chỉ thuộc một trang, và tiêu đề hay H1 không trùng giữa các trang.
  - Trước khi site chạy thật: đọc tiêu đề và H1 của các trang đang có trong repo.
  - Sau khi chạy thật: dùng số liệu Search Console.
- **Phần spec của giai đoạn 3:**
  - dàn ý và chữ thật cho từng trang;
  - dữ liệu có cấu trúc;
  - hreflang: các bản ngôn ngữ trỏ qua lại nhau, và mỗi trang có `lang` riêng;
  - ngưỡng Core Web Vitals, đưa vào yêu cầu phi chức năng.
- **Các luật giữ lại:**
  - chỉ dùng cách "mũ trắng";
  - ý định người tìm đi trước;
  - E-E-A-T;
  - LCP dưới 2,5 giây, INP dưới 200 ms, CLS dưới 0,1;
  - tối ưu cho AI search.

**Không thuộc một Epic nào, vì chỉ làm được sau khi site chạy thật:**
- **Giai đoạn 1:** audit site thật và đọc Search Console.
- **Giai đoạn 4:** backlink, PR, liên hệ báo chí và blogger. Việc này là gửi thư cho người thật, nên mỗi lần đều cần bạn duyệt.
- **Giai đoạn 5:** theo dõi thứ hạng, lưu lượng, ROI.

Ba phần này cần quyền vào Search Console và GA4, và chạy định kỳ chứ không theo Epic. Đề xuất: một lệnh riêng sau này, như `/ao-seo report` hằng tháng, trong một module sau C1. Trong lúc chờ, phiên chính dùng được plugin claude-seo (`seo-google`, `seo-backlinks`, `seo-drift`) đã cài ở user scope.

**Chờ bạn:** đồng ý cách chia này không?

### 2.3 Bật hay tắt `seo` khi chạy `/ao-spec` (Lượt 82)

**Bạn muốn:** truyền thêm một tùy chọn cho `/ao-spec` để bật `seo`; điều kiện "trang private thì tắt `seo`" vẫn giữ.

**Phát hiện:** `public: true` trong `project.yaml` chỉ có nghĩa là app có host riêng trên internet (`lib/release/hosts.mjs`). Trong `shop`, cả `user` lẫn `admin` đều là `public: true`. Kit chưa phân biệt được trang cần SEO với trang quản trị, nên điều kiện "trang private" chưa có dữ liệu để chạy.

**Đề xuất:**
1. **Mỗi app có thêm khóa `seo: true` hay `false`** trong `project.yaml`. Với `shop`: `user` là `true`, `admin` là `false`. `project-scaffold` hỏi khóa này khi thêm một app có host công khai.
2. **Hai từ cho `/ao-spec`:** `/ao-spec <EPIC> seo` bật `seo`, `/ao-spec <EPIC> no-seo` tắt `seo`.
3. **Lựa chọn được lưu thành nhãn trên Epic** (`ao-seo` hay `ao-no-seo`), không chỉ nằm trong lệnh:
   - `/ao-spec` thường chạy nhiều lần cho một Epic: sửa SPEC, chạy tiếp sau giới hạn usage;
   - `reviewer` và `qa` cần biết Epic có mục SEO hay không.

   Bạn cũng tự gắn hay gỡ được nhãn này trên Jira.
4. **Không truyền từ nào thì kit tự quyết:** SPEC có màn hình thuộc app `seo: true` thì chạy `seo`. Đề xuất mặc định bật:
   - website công khai luôn cần SEO;
   - quên bật thì trang lên production mà không có SEO, tới lúc thấy đã muộn. Còn tắt thì là một lựa chọn có chủ ý, như Epic chỉ sửa logic giỏ hàng.

   Nếu bạn muốn mặc định tắt, chỉ bật khi có từ `seo`, kit cũng làm được.
5. **Trang private vẫn tắt:** Epic chỉ chạm app `seo: false` thì `seo` không chạy, kể cả khi có từ `seo`. `ao-step` in một dòng giải thích.
6. **SPEC phải ghi mỗi màn hình thuộc app nào,** thì kit mới tự quyết đúng: template SPEC hay `design.md` thêm cột "App" cho từng màn hình.

**Chờ bạn:** mặc định bật hay mặc định tắt?

### 2.4 Blog (Lượt 82)

Blog có hai lớp việc khác nhau. Cách tách này có từ Phiên 27 · Lượt 98 (concern 3).

**(a) Xây tính năng blog: là SDLC, một Epic bình thường.**
- **Gồm:** trang danh sách bài, trang bài, chuyên mục và tag, trang tác giả, RSS, sitemap, phân trang.
- **`seo` lo phần SEO ngay ở `/ao-spec`:**
  - dữ liệu có cấu trúc BlogPosting, kèm tác giả (Person), Organization, BreadcrumbList;
  - quy tắc slug;
  - cấu trúc chuyên mục và tag, để tránh trang tag mỏng;
  - trang tác giả, phục vụ E-E-A-T;
  - ngày đăng và ngày sửa;
  - hreflang cho bài `vi` và `en`;
  - canonical của trang phân trang.
- **Lấy từ Claude Blog:** `blog-schema` (JSON-LD cho bài blog, có kiểm theo mức Google còn hỗ trợ) và phần gợi ý, audit của `blog-taxonomy` (không lấy phần đồng bộ với WordPress, Shopify). Chép rồi viết lại như `seo-content-brief`.
- **Đề xuất:** phần (a) làm trong C1.

**(b) Viết bài: không thuộc SDLC, là workflow nội dung riêng.** Đây là dòng D2 trong `concerns.md`, hiện ghi "Chờ nhu cầu"; nay đã có nhu cầu.
- **Claude Blog hợp ở đây:**
  - kế hoạch: `blog-strategy` (trụ cột nội dung, lộ trình 90 ngày), `blog-cluster`, `blog-calendar`;
  - viết: `blog-brief`, `blog-outline`, `blog-write`;
  - kiểm: `blog-seo-check`, `blog-factcheck`, `blog-geo`;
  - ngôn ngữ: `blog-translate`, `blog-localize`.
- **Nhiều skill trong số đó cần web:** `blog-factcheck` phải tra nguồn, `blog-brief` đọc trang đứng đầu Google. Một số khác cần Python hay API riêng: `blog-image` cần Gemini, `blog-decay` cần Search Console.
- **Câu hỏi lớn nhất của D2 là bài nằm ở đâu:**
  - **trong database, đăng qua Admin** (đề xuất ở Phiên 27): agent viết bản nháp, bạn duyệt, rồi đăng qua API của Admin. Không có PR, không cần review code;
  - **file MDX trong repo:** mỗi bài là một PR. PR chỉ đổi tài liệu của item Nhẹ được miễn review (mục 3.4 của spec C1), nhưng mỗi bài vẫn phải chờ deploy.
- **Đề xuất:** D2 là một module riêng ngay sau C1, không nhét vào C1. D2 cần `stages.yaml` và role `seo` của C1 trước, và C1 đã có 8 bước.

**Chờ bạn:** phần (a) vào C1, D2 ngay sau C1 và trước C2? Hay C2 trước?

## 3. Các nguồn đã xem

Mọi nguồn dưới đây đều giấy phép MIT.

| Nguồn | Là gì | Dùng thế nào |
|---|---|---|
| **SEO Specialist** (`agency-agents/marketing/marketing-seo-specialist.md`) | Agent SEO marketing, khoảng 3.000 chữ. Khai `tools: WebFetch, WebSearch, Read, Write, Edit`. Phần chính dựa vào số liệu mà web không cho: Search Console (13 lần), cột lượt tìm và độ khó, luật "No Guesswork". Năm giai đoạn: audit, từ khóa và nội dung, chống ăn thịt từ khóa, làm trên trang, backlink, đo lường. | Làm gốc của prompt `seo`, viết gọn lại (mục 2.2). |
| **claude-seo 2.6.0** (AgriciDaniel, 26 skill, khoảng 30.700 sao) | Phần lớn skill audit một URL thật bằng script Python (`parse_html.py`, `page_checks.py`, `render_page.py`, `sitemap_discovery.py`). Nhiều skill cần API trả phí hay tài khoản (DataForSEO, Google). | `seo-content-brief` chép rồi viết lại. Lấy ý từ `seo-schema` (chỉ dùng loại Google còn hỗ trợ; skill ghi Google bỏ rich result FAQ từ 2026-05-07), `seo-ecommerce` (Product kèm Offer), `seo-hreflang` (trỏ qua lại, `x-default`). Phiên chính dùng phần audit sau khi site chạy thật. |
| **`seo-content-brief`** (trong claude-seo, bản quyền puneetindersingh) | Content brief cho một trang: ý định, dàn ý H1/H2/H3 kèm số chữ, chỗ đặt từ khóa, meta, E-E-A-T, liên kết nội bộ, mẫu theo loại trang. Bước 2–3 tải trang, sitemap và 5 trang đứng đầu Google. `SKILL.md` khoảng 1.660 chữ. | Chép rồi viết lại (mục 4.2). |
| **`seo-content`** (trong claude-seo) | Chấm nội dung đã viết xong: E-E-A-T, độ dễ đọc, nội dung mỏng; một phần cần Python. | Không lấy: hợp với review hơn là spec. |
| **`nextjs-seo`** (`laguagu/claude-code-nextjs-skills`, 74 sao) | Metadata API của App Router, `sitemap.ts` và `robots.ts`, canonical, đa ngôn ngữ, JSON-LD an toàn, ảnh chia sẻ. Khoảng 500 chữ, sáu file tham khảo. Không cần Python hay URL thật. | Chép nguyên văn (đã duyệt). |
| **Claude Blog 2.3.2** (AgriciDaniel, 32 skill) | Viết, tối ưu, kiểm và dịch bài blog. Nhiều skill cần web, Python hay API (Gemini, Search Console, NotebookLM). | `blog-schema`, `blog-taxonomy` cho phần (a); phần lớn còn lại cho D2 (mục 2.4). |
| **agent-skills** (addyosmani, 0.6.13) | Chỉ `source-driven-development` dùng web (bước "Fetch Official Documentation", kèm hook lưu đệm cho WebFetch). Kit không dùng skill này; 17 skill kit đang chép về đều không cần web. | Không liên quan tới SEO. |
| **superpowers** (v7.0.1, bản ở máy) | Không skill nào dùng WebFetch hay WebSearch. Chữ "web search" chỉ có trong bảng đổi tên công cụ khi chạy trên Gemini, OpenCode và các công cụ khác. | Không liên quan tới SEO. |

## 4. Các câu hỏi đã làm rõ

### 4.1 "Chỉ dùng prompt" nghĩa là gì (Lượt 79)

- **Prompt** là file hướng dẫn riêng của agent (`agents/prompts/seo.md`, kit dựng thành `.claude/agents/seo.md`): việc phải làm, chỗ ghi, lúc dừng, danh sách điểm cần kiểm.
- **Skill** là file kiến thức nạp thêm khi agent chạy.
- "Chỉ dùng prompt" là chạy `seo` không có skill. Không ai dừng lại hỏi bạn về SEO, và luồng chạy giống hệt nhau dù có skill hay không.
- **Luồng của `/ao-spec`:** `ba` viết SPEC → `ux` viết `design.md` (nếu có màn hình) → `seo` viết mục `## SEO` (nếu Epic có trang cần SEO) → `sa` thêm yêu cầu phi chức năng → `ba` mở PR tài liệu → bạn duyệt SPEC ở cổng ①.
- **Sau đó:** `fe-dev` làm theo mục SEO, `reviewer` đối chiếu code, `qa` kiểm thẻ meta trên Development.

### 4.2 Chép rồi viết lại hay để nguyên rồi ghi đè (Lượt 81)

- **Để nguyên rồi ghi đè** là cách kit đang làm với skill của bên khác: chép nguyên văn, ghim commit, `npm run skills:vendor` cập nhật. Prompt của `qa` chỉ ghi đè vài dòng của `playwright-cli`.
- **Với `seo-content-brief`, phần không hợp là nhiều mục:** bước 2–3, chế độ Improve, bảng chấm đối thủ, khoảng trống so với đối thủ, DataForSEO, Ahrefs. Để nguyên thì lượt nào agent cũng đọc hết, tốn token và dễ làm theo nhầm. Vì vậy chép rồi viết lại (ý của bạn).
- **Bản viết lại:**
  - **giữ:** ý định tìm kiếm, dàn ý, chỗ đặt từ khóa, quy tắc meta, E-E-A-T, liên kết nội bộ, mẫu theo loại trang;
  - **thêm:** ghi vào `## SEO` của SPEC, chữ `vi` và `en`, từ khóa từ nguồn ở mục 2.1;
  - **nằm ở đâu:** là skill của kit, như các skill `ao-*`.
- **Cái giá:** kit tự giữ bản này; `npm run skills:vendor` không cập nhật nó. Đầu file ghi repo, commit gốc, giấy phép MIT và bản quyền của tác giả, để so với bản mới bằng tay.

### 4.3 Vì sao spec từng ghi "chưa thêm skill" (Lượt 77)

Lúc viết bản nháp spec (Lượt 71), mình chưa xem skill SEO nào, nên chọn cách an toàn là "chỉ dùng prompt". Sau khi xem các nguồn bạn cài (Lượt 76), `nextjs-seo` không còn vướng lý do nào để chờ, nên đề xuất đổi. Lẽ ra phải nói rõ là đổi ý ngay ở Lượt 76.

## 5. Diễn biến theo lượt

| Lượt | Bạn | Kết quả |
|---|---|---|
| 76 | Hỏi nên viết mới hay chép SEO Specialist, và lấy skill nào của claude-seo, `nextjs-seo`, Claude Blog | Đề xuất: viết mới, chỉ `nextjs-seo`, lấy ý từ ba skill của claude-seo, không lấy Claude Blog |
| 77 | Hỏi vì sao mâu thuẫn với điểm 6 của spec | Giải thích mục 4.3 |
| 78 | "Sửa lại tài liệu" | Spec C1 sửa mục 2, mục 6, điểm 6 và thêm điểm 9 |
| 79 | Hỏi "chỉ dùng prompt" là gì | Giải thích mục 4.1 |
| 80 | Duyệt `nextjs-seo`; nêu chữ trên trang cũng cần SEO | Đề xuất `seo-content-brief`, `seo` viết chữ, bốn cách lấy từ khóa |
| 81 | Duyệt `seo-content-brief` và `seo` viết chữ; hỏi ai dùng WebFetch, WebSearch; đề xuất chép rồi viết lại | Mục 3 và 4.2; đề xuất mở web cho riêng `seo` |
| 82 | SEO Specialist đúng ý, viết gọn lại; muốn tùy chọn bật `seo` ở `/ao-spec`; kit phải sẵn sàng cho blog; ghi thảo luận ra file này | Mục 2.2, 2.3, 2.4 |

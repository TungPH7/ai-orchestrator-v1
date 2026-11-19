# SEO trong kit: role `seo`, skill và blog

> **Thảo luận:** Phiên 33 · Lượt 76–84 (2026-11-19).
>
> **Gắn với:**
> - C1: [SPEC-c1.md](../../../SPEC-c1.md), mục 6 và điểm 6 của mục 13;
> - dòng D2 (workflow nội dung) của [concerns.md](../concerns.md);
> - concern 3, ở [role-moi-trong-sdlc.md](../role-moi-trong-sdlc.md).
>
> **Trạng thái:** phần lớn đã duyệt (mục 1). Còn mở: quyền comment của `seo` và comment `Cần seo:` của `/ao-intake` (mục 2.5). Spec C1 mới ghi các điểm duyệt tới Lượt 80; các điểm sau đó vào spec một lần, khi chốt xong mục 2.5.

**Mục tiêu (Lượt 82):** kit phải sẵn sàng cho dự án thật, không chỉ cho `shop`. `shop` là pilot để kiểm luồng của kit. Dự án có website công khai thì luôn cần SEO để lên top Google, và các website sắp làm sẽ có blog.

## 1. Đã duyệt

| Điểm | Lượt | Nội dung |
|---|---|---|
| Skill `nextjs-seo` | 80 | Chép nguyên văn vào kit, ghim theo commit (`npm run skills:vendor`), chỉ cho `seo`. Phiên chính đọc hết skill và sáu file tham khảo trước khi đưa vào. |
| Skill `seo-content-brief` | 81 | Lấy từ claude-seo. Chép về rồi viết lại thành skill của kit, không để nguyên rồi ghi đè (ý của bạn, xem mục 4.2). |
| `seo` viết chữ thật | 81 | Phần tĩnh của trang công khai: H1, các heading, đoạn mở đầu, nút kêu gọi, title, meta description, alt của ảnh. Viết cả `vi` và `en`, trong mục `## SEO` của SPEC. `fe-dev` đưa nguyên văn vào `messages/*.json`; `reviewer` và `qa` đối chiếu nguyên văn. |
| SEO Specialist làm gốc | 82 | Prompt `seo` lấy agent SEO Specialist của agency-agents làm gốc: đúng chuyên gia bạn mong đợi (từ khóa, cụm chủ đề, backlink, Search Console). Chỉ cần viết lại cho gọn, chọn lọc cái hay, vì bản gốc dài khoảng 3.000 chữ. |
| Web cho `seo` | 83 | `seo` dùng WebSearch và WebFetch. Đổi lại: không có Bash, không có git, chỉ ghi `docs/specs/**`, Jira chỉ đọc. Lượt tìm mỗi tháng lấy từ Keyword Planner nếu bạn ghi vào Epic; không có thì ghi "chưa có số liệu" (mục 2.1). Ở Lượt 84, "Jira chỉ đọc" được đề xuất đổi thành "chỉ comment" (mục 2.5). |
| Chia việc theo thời điểm | 83 | Phần spec chạy trong `/ao-spec` (mục 2.2). Phần chỉ làm được sau khi site chạy thật lưu thành dòng **D4** của [concerns.md](../concerns.md): lệnh SEO định kỳ, như `/ao-seo report` hằng tháng, sau C1. |
| Bật hay tắt `seo` | 83 | Khóa `seo: true` cho từng app; hai từ `seo` và `no-seo` cho `/ao-spec`; không truyền gì thì tự quyết theo SPEC, mặc định bật; app `seo: false` thì không chạy `seo`; SPEC ghi app của từng màn hình (mục 2.3). |
| Không có nhãn ở Epic, nhãn `ao-seo` ở item | 84 | Quyết định của Epic nằm trong SPEC: mục `## SEO`, hoặc dòng "SEO: không, vì …". Nhãn `ao-seo` gắn trên Story hay Task chạm màn hình có SEO: `sa` ghi cột "SEO" trong `plan.md`, bạn duyệt ở cổng ②, `ba` gắn nhãn. Không có nhãn `ao-no-seo` (mục 2.3). |
| Blog: thứ tự | 84 | Phần (a), tính năng blog, làm trong C1. D2, workflow viết bài, làm ngay sau C1 và trước C2 (mục 2.4). |
| Blog: đăng bài | 84 | Công cụ đăng bài làm trong Epic tính năng blog, được review một lần; không viết script mới cho mỗi bài. Mỗi bài là một Task trên Jira. Bài lên ở trạng thái nháp kèm link xem trước, phiên chính kiểm theo mức Nhẹ, bạn duyệt nội dung, rồi mới đăng công khai (mục 2.4). |

**Phần dữ liệu động,** như mô tả sản phẩm, là dữ liệu admin nhập. `seo` chỉ viết vài dòng hướng dẫn cho người nhập (độ dài, cách trình bày), đưa vào hướng dẫn sử dụng.

## 2. Các điểm đã bàn

### 2.1 Nguồn từ khóa và quyền web của `seo` (Lượt 80–82; duyệt ở Lượt 83)

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

**Kết quả (Lượt 83):** bạn đồng ý mở WebSearch và WebFetch cho riêng `seo` theo cách này.

### 2.2 Chia việc của SEO Specialist theo thời điểm (Lượt 82; duyệt ở Lượt 83)

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

**Kết quả (Lượt 83):** bạn đồng ý. Đề xuất lệnh SEO định kỳ được lưu thành dòng D4 của `concerns.md`, để làm sau C1, khi có một site đã chạy thật.

### 2.3 Bật hay tắt `seo` khi chạy `/ao-spec` (Lượt 82–84)

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

**Kết quả (Lượt 83):** bạn đồng ý các đề xuất trên, mặc định bật. Riêng chỗ lưu lựa chọn thì bạn hỏi lại: nhãn phải thuộc Story hay Task, sao lại thuộc Epic? Trong một Epic có item cần SEO và item không cần, như Task cho trang admin.

**Trả lời (Lượt 83):** có hai câu hỏi khác nhau, ở hai thời điểm.
1. **Có chạy `seo` cho SPEC của Epic không:** hỏi ở `/ao-spec`. Lúc đó Story và Task chưa có, vì chúng chỉ được tạo ở `/ao-plan`, sau khi bạn duyệt SPEC. Nên câu này chỉ trả lời được ở mức Epic.
2. **Item này có phải làm và kiểm SEO không:** hỏi ở build, review và QA. Câu này đúng là theo từng item, như bạn nói.

**Đề xuất sửa:**
- **Ở Epic, bỏ nhãn.** Quyết định nằm ngay trong SPEC: SPEC có mục `## SEO`, hoặc một dòng "SEO: không, vì …" khi bạn chạy `no-seo`. Bạn thấy nó khi duyệt SPEC ở cổng ①, và lần chạy `/ao-spec` sau đọc lại dòng đó.
- **Trong mục `## SEO`, `seo` chỉ viết cho màn hình của app `seo: true`.** Màn hình admin tự được bỏ qua.
- **Ở item, nhãn `ao-seo` trên Story hay Task chạm màn hình có SEO:**
  1. `sa` ghi cột "SEO" trong bảng item của `plan.md`, như cột "Mức";
  2. bạn duyệt ở cổng ②;
  3. `ba` gắn nhãn khi tạo item.

  Task cho trang admin không có nhãn.
- **Tác dụng của nhãn:** `fe-dev` đọc mục `## SEO` khi build, `reviewer` đối chiếu code với mục đó, `qa` kiểm thẻ meta và chữ. Item không có nhãn thì ba role này bỏ qua phần SEO.
- **Item ngoài Epic** (`/ao-intake`): bản nháp đề xuất nhãn `ao-seo` khi việc chạm trang có SEO, như đổi chữ trang chủ. Khi đó `seo` được gọi bằng `Cần seo:` để viết phần SEO cho item trước khi build. (Ví dụ "đổi chữ trang chủ" sai, sửa ở Lượt 84: xem mục 2.5.)
- **Không cần nhãn `ao-no-seo`:** item không có `ao-seo` là không làm SEO.

**Kết quả (Lượt 84):** bạn đồng ý cách sửa này, rồi hỏi item ngoài Epic đi qua những agent nào (mục 2.5).

### 2.4 Blog (Lượt 82–84)

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

**Kết quả (Lượt 84):** bạn đồng ý: phần (a) vào C1, D2 ngay sau C1 và trước C2. Ba câu trả lời về cách đăng bài ở dưới cũng được duyệt.

**Câu hỏi của bạn ở Lượt 83 về cách đăng bài qua Admin, và trả lời:**

1. **Cách này không có code, không có commit, tức không đụng workflow của kit?** Đúng một nửa.
   - **Không đụng SDLC:** viết bài là thêm dữ liệu, giống thêm sản phẩm. Không có code mới, không commit, không PR, không deploy, nên không đi qua review và merge.
   - **Vẫn cần một workflow:** chọn chủ đề, viết bản nháp, bạn duyệt, đăng, kiểm trang thật. Đó là D2. Đề xuất: mỗi bài là một Task trên Jira, như Task vận hành của mục 14, để bạn theo dõi và duyệt.
   - **Code để đăng bài thì thuộc SDLC:** API quản lý bài, trạng thái nháp, link xem trước và công cụ đăng bài đều làm trong Epic tính năng blog, có review và QA như mọi code.
2. **Claude đóng vai admin có viết code, script để đăng bài không?** Có thể, nhưng không nên viết script mới cho mỗi bài.
   - Script viết mới mỗi lần là code chưa ai review, chạy bằng quyền admin trên Production. Ở SHOP-12, Claude viết `shop12-seed.mjs` ngoài repo để thêm 5 sản phẩm; đó là cách tạm của pilot, không nên lặp lại cho blog.
   - **Đề xuất:** Epic tính năng blog làm luôn công cụ đăng bài, ví dụ lệnh `scripts/post-publish.mjs <file bài>` gọi API của Admin. Công cụ được review một lần; sau đó mỗi bài chỉ là một file nội dung cộng một lệnh đăng.
   - Cách khác là đi qua giao diện Admin bằng Playwright, như người thật. Cách này chậm hơn và dễ vỡ hơn gọi API.
3. **Có bỏ QA như Task của `devops` không?** Task vận hành của `devops` (mục 14) không bỏ QA: sau "Hand over", item sang Ready for QA và `qa` vẫn kiểm. Với bài blog, đề xuất **kiểm trước khi đăng**, không phải sau:
   1. Công cụ đăng bài tạo bài ở trạng thái nháp trên Production, kèm link xem trước mà người ngoài không thấy.
   2. Kiểm trên link đó: bài hiển thị đúng, title và meta, dữ liệu có cấu trúc, hreflang, liên kết, ảnh. Việc kiểm theo mức Nhẹ: phiên chính kiểm và viết báo cáo ngắn, không có lượt agent `qa`.
   3. Bạn đọc bài và duyệt nội dung.
   4. Rồi mới đăng công khai.

   Như vậy bài lỗi không lên công khai, và mỗi bài không tốn thêm một lượt `qa`. Muốn vậy, tính năng blog phải có trạng thái nháp và link xem trước; điều này ghi vào SPEC của Epic blog.

### 2.5 Item ngoài Epic có SEO đi qua những agent nào (Lượt 84)

**Câu hỏi của bạn:** item ngoài Epic có nhãn `ao-seo`, được `seo` viết phần SEO qua `Cần seo:`, sẽ đi qua những agent nào?

**Trả lời ngắn:** `seo` (một lượt, chỉ khi cần), `fe-dev` hoặc `be-dev`, `reviewer` (kèm `security` khi PR chạm phần nhạy cảm), và `qa`. Không có `ba`, `ux`, `sa`, vì item không có SPEC hay plan.

**Sửa ví dụ của Lượt 83:** "đổi chữ trang chủ" không thể là item ngoài Epic. `/ao-intake` không tạo Story, và việc mà người dùng thấy kết quả thì thành một Epic nhỏ (`kit/.claude/skills/ao-intake/SKILL.md`, bước 2). Epic nhỏ đi qua `/ao-spec`, nên `seo` tự chạy. Item ngoài Epic có SEO là Task hay Bug mà người dùng không thấy nhưng Google thấy:
- Task "thêm dữ liệu có cấu trúc Product cho trang sản phẩm";
- Task "nâng Next.js lên bản mới", chạm mọi trang;
- Bug "trang danh mục từ trang 2 trở đi có canonical trỏ về trang 1".

**Luồng đề xuất của một Task có nhãn `ao-seo`:**
1. **`/ao-intake`: phiên chính, không có agent.** Bản nháp có mức, nhãn `ao-seo`, và một đoạn `Cần seo:` ghi điều cần hỏi. Bạn OK thì phiên chính tạo item có nhãn, rồi viết đoạn đó thành comment.
2. **`/ao-request <KEY>`: `seo`, một lượt.** Đọc item, mục `## SEO` của các SPEC cũ, code liên quan, tra web khi cần. Comment trên item phần SEO (chữ, title, meta, JSON-LD) kèm danh sách "Kiểm" cho `qa`. Comment này đóng yêu cầu. Item ngoài Epic không có `docs/specs/`, nên phần SEO nằm trong comment.
3. **Bạn đọc comment,** rồi bấm Refine.
4. **`/ao-build`: `fe-dev` hoặc `be-dev`.** Prompt chỉ tới comment của `seo`, như comment bàn giao của Sub-task.
5. **`/ao-review`: `reviewer`, cộng `security` theo tầng của PR.** `reviewer` đối chiếu code với comment của `seo`. `seo` không review PR.
6. **Bạn duyệt ở cổng ③,** merge, deploy lên Development.
7. **`/ao-qa`: `qa` ở mức Chuẩn và Nặng, phiên chính ở mức Nhẹ.** Kiểm Verification, danh sách "Kiểm" của `seo` trên Development, và cả bộ E2E.
8. **Bạn Accept.**

**Bỏ bước 2** khi Bug sai so với mục `## SEO` đã có trong SPEC cũ: bản nháp trỏ tới mục đó, và `fe-dev`, `reviewer`, `qa` đọc mục đó.

**Hai chỗ khác với điều đã duyệt:**
1. **`seo` cần quyền comment trên Jira.** Lượt 83 duyệt "Jira chỉ đọc", nhưng cùng lượt đó đề xuất `Cần seo:`; hai điều mâu thuẫn, và Claude đã không thấy lúc đề xuất.
   - Yêu cầu `Cần <role>:` chỉ đóng khi role được nhờ comment trên item (`lib/workflow/requests.mjs`). Với item ngoài Epic, comment cũng là chỗ duy nhất `seo` ghi được.
   - `ux` từng gặp đúng chuyện này và được thêm quyền comment ở Lượt 122 (`agents/roster.yaml`).
   - Trong Epic cũng cần: khi bạn sửa SPEC ở phần chạm SEO, `ba` nhờ `seo` bằng `Cần seo:`.

   **Đề xuất:** `seo` được comment, giống `ux`; không tạo, không sửa item, không chuyển trạng thái. Rủi ro thêm: trang web có lệnh chèn làm `seo` viết comment sai, rồi `fe-dev` làm theo. Ba lớp chặn: bạn đọc comment trước Refine, `reviewer` xem code, `qa` kiểm trên Development.
2. **`/ao-intake` ghi thêm một comment.** Hiện intake chỉ ghi lên Jira một lần: tạo item. Đề xuất: sau khi bạn OK, phiên chính ghi thêm comment `Cần seo:`, đúng chữ trong bản nháp. Cách khác: bạn tự viết comment đó (comment của bạn cũng được tính), thêm một việc bằng tay. Nhãn `ao-seo` gắn lúc tạo item, cùng cách với nhãn mức của spec C1.

**Phần kit phải làm thêm trong C1:** `/ao-request` nhận `seo` là role được nhờ; prompt của `/ao-build`, `/ao-review`, `/ao-qa` chỉ tới comment của `seo` khi item có nhãn `ao-seo`.

**Chờ bạn:** cho `seo` quyền comment? `/ao-intake` ghi comment `Cần seo:`, hay bạn tự viết?

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
| 83 | Duyệt web cho `seo`, mục 2.2 và mục 2.3 (trừ chỗ lưu lựa chọn); hỏi nhãn ở Epic hay item; hỏi về đăng bài qua Admin và QA; lưu `/ao-seo report` cho sau này | Dòng D4 của `concerns.md`; trả lời ở mục 2.3 và 2.4 |
| 84 | Duyệt nhãn ở item, cách đăng bài, thứ tự blog; hỏi item ngoài Epic đi qua những agent nào | Mục 2.5; sửa ví dụ "đổi chữ trang chủ"; nêu mâu thuẫn "Jira chỉ đọc" với `Cần seo:`; dòng D2 của `concerns.md` thành "ngay sau C1, trước C2" |

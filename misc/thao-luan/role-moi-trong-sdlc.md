# Concern 3: thêm role mới vào SDLC

Phiên 27 · Lượt 98, 2026-11-10. Câu trả lời dựa trên mã kit ở `main` (`613c7bc`). Nhãn: **[Inference]** là suy luận chưa chạy thử, **[Ước]** là con số ước.

## Câu hỏi

> ## 3. SDLC hiện tại chỉ có các role cố định, trong lúc làm việc nếu phát sinh 1 role mới thì làm như nào?
>     - Ví dụ 1: cụ thể là khi phát triển tính năng 'Blogs', tới lúc viết bài thì cần 1 nhân viên chuyên viết bài hay, chuẩn SEO (tương đương với 1 agent SEO Content Writer mới) thì agent viết blog này sẽ làm việc với team agent trong SDLC như nào cho đúng?
>     - Ví dụ 2: bổ sung thêm agent về SEO lúc spec và plan

## Một role hiện nằm ở đâu trong kit

Thêm một role phải chạm vào 7 chỗ:

| Chỗ | Nội dung |
|---|---|
| `contract/roles.yaml` | Tên và trách nhiệm của role |
| `contract/stages.yaml:32`, `:42` | Role làm ở giai đoạn nào |
| `agents/roster.yaml`, `agents/prompts/<role>.md` | Model, effort, tool, quyền Jira, quyền git, file được ghi, skill và prompt |
| `tracker/jira.yaml:98` | Field Agent trên Jira cần thêm một giá trị cho role mới |
| `tracker/jira.yaml:111` | Label `ao-<role>`, để giao Sub-task cho role |
| `quality/gates.yaml`, mục `github_apps` | Role dùng App nào: `ao-dev` để ghi, `ao-review` để review |
| `lib/workflow/steps.mjs` | Thứ tự chạy được viết thẳng trong mã: `/ao-spec` (dòng 131), các role được hỏi lại (dòng 21), thứ tự dev (dòng 300) |

**Phần đã tổng quát sẵn:** comment `Cần <role>:` chạy được với mọi role có trong roster (`lib/workflow/requests.mjs:21`). Một agent đã hỏi được role mới mà không phải sửa mã.

**Phần còn gắn cứng:** thứ tự các lượt chạy trong `steps.mjs`. Vì vậy, thêm một role vào `/ao-spec` hay `/ao-build` hiện phải sửa mã.

## Ba kiểu role

Một role mới luôn rơi vào một trong ba kiểu. Kiểu của role quyết định nó cắm vào chỗ nào trong SDLC.

| Kiểu | Giống role nào | Cắm vào đâu | Sản phẩm |
|---|---|---|---|
| Cố vấn | `ux`, `sa` | `/ao-spec` hoặc `/ao-plan` của Epic | Một mục hoặc một file trên nhánh tài liệu của Epic, được duyệt ở gate ① và ② |
| Người làm | `fe-dev`, `be-dev` | `/ao-build`, qua Sub-task có label `ao-<role>` | Code hoặc nội dung trên nhánh của item, mở PR, được duyệt ở gate ③ |
| Người kiểm | `security`, `qa` | `/ao-review` hoặc `/ao-qa` | Báo cáo review hoặc báo cáo QA |

## Ví dụ 2: thêm agent SEO lúc spec và plan

Đây là role **cố vấn**, giống `ux`. Mình đề xuất một role `seo`:

- **`/ao-spec`:** `seo` chạy sau `ux`, chỉ khi SPEC có trang công khai. Điều kiện này giống cách `ux` chỉ chạy khi SPEC có màn hình. `seo` viết `docs/specs/<EPIC>/seo.md`, gồm:
  - cấu trúc URL;
  - title và meta;
  - structured data;
  - sitemap;
  - hreflang;
  - các chỉ tiêu Core Web Vitals.
- **`/ao-plan`:** `sa` đọc `seo.md` và biến nó thành acceptance criteria cho từng Story. Không cần thêm một lượt `seo` nữa.
- **Quyền tối thiểu:**
  - chỉ được ghi `docs/specs/<EPIC>/seo.md`;
  - đọc và comment Jira;
  - dùng App `ao-dev` để commit lên nhánh tài liệu.
- **Về sau, nếu cần:** `seo` có thể làm người kiểm ở `/ao-review` cho PR chạm vào trang công khai, giống cách `security` tăng effort theo path. `qa` cũng có thể chạy Lighthouse SEO trên Development.

**Chi phí:** [Ước] thêm khoảng 1–2 USD cho mỗi Epic có trang công khai. Con số dựa trên một lượt `ba` hay `sa` ở Pilot 2.

**Cách rẻ hơn:** gắn skill SEO cho `ba` và `fe-dev`, không thêm role, nên không tốn thêm lượt chạy. Bù lại, không có ai chịu trách nhiệm riêng về SEO. Nên chọn role riêng khi SEO là yêu cầu chính của sản phẩm, như e-commerce hay blog.

## Ví dụ 1: agent viết bài SEO cho tính năng Blogs

Câu trả lời tùy vào việc bài viết nằm ở đâu.

**a. Bài viết nằm trong database, được đăng qua Admin.** Đây là cách thường gặp, và mình khuyên dùng cách này.

Viết bài không thuộc SDLC. SDLC xây tính năng Blog: mô hình nội dung, trang danh sách, trang chi tiết, màn hình soạn bài trong Admin. Còn viết bài là việc vận hành nội dung, diễn ra sau khi tính năng đã lên Production. Bài viết không qua PR, CI hay deploy, nên các gate ③–⑤ không áp dụng.

Agent viết bài làm việc với các agent SDLC qua hai chỗ, không nói chuyện trực tiếp:
1. **Đầu vào là SPEC của Epic Blog.** `ba` và `seo` định nghĩa ở đó mô hình nội dung và các field SEO: slug, meta, ảnh đại diện, tag. Agent viết bài viết theo đúng mô hình đó.
2. **Đầu ra quay lại SDLC qua Jira.** Khi agent viết bài thấy tính năng thiếu một thứ, ví dụ chưa có field FAQ cho structured data, nó tạo một Story hoặc một Bug. Item đó đi theo SDLC như mọi item khác.

Luồng viết bài là một workflow riêng, ví dụ Draft → Review → Approved → Published. Bạn duyệt bài trước khi đăng. Workflow này có thể dùng một board Jira riêng. [Inference] Khi agent đăng bài qua Admin API trên Production, nó cần một tài khoản riêng chỉ có quyền đăng bài. Việc cấp quyền này do bạn quyết.

**b. Bài viết nằm trong repo** (file MDX, nội dung lúc ra mắt, trang landing). Lúc này agent viết bài là role **người làm**, kiểu `content-writer`:
- nhận Sub-task có label `ao-content-writer`;
- chỉ được ghi `content/**`;
- mở PR như dev; `seo` hoặc bạn review trước khi merge.

## Khi role mới phát sinh giữa dự án

1. **Bạn quyết định cần role mới.** Thêm role là thêm quyền cho agent (tool, file được ghi, Jira, App), nên luôn do bạn duyệt. Kit không nên cho phép tự sinh role lúc đang chạy.
2. **Một PR vào kit** thêm role ở 7 chỗ trong bảng đầu file, kèm test. Riêng giá trị mới của field Agent trên Jira là một thao tác bấm của bạn, hoặc gọi API.
3. **Chép kit sang dự án.** PR này chạm protected path, nên bạn tự merge.
4. **Với Epic đang dở:**
   - nếu Epic đã qua gate ①, agent khác gọi role mới bằng comment `Cần seo: …`;
   - nếu kết quả làm đổi SPEC, SPEC được sửa và qua gate ① lại.

   Từ Epic sau, role mới chạy theo thứ tự mới.

## Sửa kit hay clone

**Sửa kit hiện tại, không clone.** Role là cấu hình cộng prompt. Chỉ có thứ tự chạy là còn nằm trong mã.

Bản sửa đáng làm:
- **Đưa thứ tự chạy của `/ao-spec`, `/ao-plan` và `/ao-build` từ `steps.mjs` sang contract,** kèm điều kiện `when`, ví dụ "SPEC có trang công khai". Sau đó, thêm role chỉ cần sửa cấu hình và viết prompt, không phải sửa mã.
- **Role tùy chọn theo dự án.** Dự án khai role nào được bật: `seo` bật cho e-commerce, không bật cho một app nội bộ.
- **Workflow nội dung** (ví dụ 1a) là một workflow thứ hai trong cùng contract, dùng lại Jira, roster và guard. Nên để thành module riêng, làm khi có dự án cần. [Inference]

**Thứ tự** [Ước]:
- `project-scaffold` chừa sẵn chỗ để dự án khai role tùy chọn.
- Thứ tự chạy theo contract và role `seo` là một module nhỏ, làm ngay trước dự án đầu tiên cần SEO.
- Workflow nội dung làm sau nữa.

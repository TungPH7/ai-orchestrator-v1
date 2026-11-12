# Kiểm chứng: project-scaffold, phần 1 (B1)

> **Spec:** [SPEC-project-scaffold.md](../SPEC-project-scaffold.md). **Plan:** [plan.md](plan.md). Ghi kết quả từng task khi xong.

## T2: tiền đề Jira, 2026-11-12

Script tạm trong thư mục scratchpad, gọi REST trên site bằng basic auth, với email admin và API token thường (không scope) của bạn, đặt ở biến user `JIRA_ADMIN_CLASSIC_TOKEN`. Token không được in ra.

| Bước | Kết quả |
|---|---|
| Đọc `myself`, space `DEMO` và các scheme của nó | 200. `DEMO` là company-managed (`classic`), có workflow scheme `AO workflow scheme` (10002), issue type scheme 10149, issue type screen scheme 10001, permission scheme `Default software scheme` (10001), notification scheme 10000, field configuration mặc định, một board kanban |
| Tạo `AOG`, kèm cả năm scheme của `DEMO` | 400: `Changing permission schemes is not allowed on the Jira free plan.` Site đang ở gói Free |
| Tạo `AOG`, bỏ permission scheme | 201, id 10035, company-managed. Workflow, issue type và screen scheme đúng của `DEMO`. Permission scheme là bản riêng `AOG software permission scheme` (10034) |
| Tạo bộ lọc chia sẻ trong space, rồi board kanban | 200 (filter 10035), 201 (board 36) |
| Sửa JQL của bộ lọc thành `project = AOG AND issuetype != Epic ORDER BY Rank ASC` | 200 |
| Đọc cấu hình cột của board | 200; Agile REST API công khai không có lệnh ghi cột |
| `npm run jira:check -- --space AOG` | Còn 5 chỗ lệch, đều là cột của board. Workflow, group, quyền, field: không lệch |

**Kết luận:** `setup jira` làm được bằng API mọi thứ trừ cột của board và Kanban backlog; hai việc này giữ hướng dẫn bấm tay. Mục 2.4 của spec đã sửa theo kết quả này.

Space `AOG` và board 36 dùng tiếp cho T16. Cột của board sẽ được bấm theo hướng dẫn ở T16.

## Chặng 1: cấu hình, 2026-11-12

| Task | Kết quả |
|---|---|
| T3 | `lib/scaffold/project.schema.json` và `project-config.mjs`: luật P1–P7 của file, C1–C3 khi đối chiếu `deploy.yaml`, `package.json` và thư mục app. `ao-kit check` in từng lỗi kèm mã luật. Mẫu là `project.yaml` của `ao-sample`, dựng từ `settings.json` và `preview.yaml` thật của nó |
| T4 | Nguồn `agents/settings.json`; `render-agents.mjs` sinh `.claude/settings.json` từ nguồn đó và `project.yaml`, có trong `--check`, `--list`. `.claude/settings.json` vào `kit_copy.rendered`. Dự án chưa có `project.yaml` giữ `settings.json` của mình |
| T5 | `/ao-preview` lấy app từ `project.yaml`: lệnh `dev`, URL là `http://localhost:<cổng><health>`, biến cổng truyền cho app. Thiếu `project.yaml` thì dừng và trỏ tới `ao-kit sync` |

**Một chỗ đổi so với plan, ở T4.** `settings.json` sinh ra là JSON chuẩn thụt 2 dấu cách, không giữ định dạng viết tay như trước (mảng và object ngắn trên một dòng). Nội dung, khóa và thứ tự giữ nguyên; test so bản sinh ra với bản JSON chuẩn của `settings.json` hiện có của `ao-sample`. Lần sinh đầu ở mỗi dự án sẽ đổi cách xuống dòng của file một lần.

**Thứ tự test.** Test của lệnh `ao-kit check` (T3) được viết cùng lượt với script, chạy lần đầu khi script đã có, nên không có lần đỏ trước. Các phần còn lại của chặng 1 có test đỏ trước.

Năm lệnh kiểm xanh (1238 test).

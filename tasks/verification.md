# Kiểm thật: release-workflow

> **Plan:** [plan.md](plan.md). **Task:** [todo.md](todo.md). Mỗi mục ghi ngày, bước, kết quả và bằng chứng. Không có token, key hay mật khẩu nào trong file này.

## T1: App `ao-deploy` và tiền đề về GitHub, Jira (2026-11-05)

**App:** `tungph7-ao-deploy`, App ID 5624698, installation 178853493, chỉ cài trên `ao-pilot` (`repository_selection: selected`). Tạo bằng `scripts/github-app-create.mjs --apps deploy`. Key ở `C:\Users\Huu Tung\ao-keys\tungph7-ao-deploy.pem`; biến `AO_DEPLOY_APP`, `AO_DEPLOY_APP_ID`, `AO_DEPLOY_APP_KEY_FILE` của user Windows. Token của App đọc được `ao-pilot` (200), không đọc được repo kit hay `ao-sample` (404).

**Token Jira chỉ đọc:** token có scope `read:jira-work` của service account `orchestratorci`, biến `AO_JIRA_READ_TOKEN` của user Windows.

| Điểm | Kết quả | Bằng chứng |
|---|---|---|
| 1. Deployment và status do token của App tạo làm `jira-sync` chạy | Đúng | Deployment 7569854997 (`development`, `22327a5`, creator `tungph7-ao-deploy[bot]`), status `success`; `jira-sync` chạy theo `deployment_status`, run 42002039223, xanh. Không item nào đổi trạng thái: không item nào của `DEMO` ở In Review (`DEMO-3` đã được bạn chuyển sang Cancelled trước đó) |
| 2. GitHub for Jira hiện deployment trên item | Đúng | Tab Deployments của `DEMO-21` hiện deployment 7569854997: môi trường `development`, Successful, cột Pipeline ghi `deploy` (ảnh `misc/images/phien-26-luot-23-anh-1.png`). Sau đó deployment được chuyển `inactive` |
| 3. Quyền của App đủ cho `git fetch` và `audit` | Sai một phần, đã sửa | `git clone --mirror` và `git fetch` qua HTTPS: xanh. `audit` lần đầu: 403 ở `GET /commits/<sha>/status`, vì App thiếu Commit statuses. Bạn thêm **Commit statuses: Read-only**; spec mục 2.3, manifest và `docs/github-apps-setup.md` đã sửa theo. Lần sau: `audit --dry-run` của `22327a5` xanh ("merge of PR #16, which met every gate") |
| 4. Token Jira chỉ đọc đọc đủ cho `audit`, không ghi được | Đúng | Đọc `DEMO-20` (Epic, In Progress) và changelog: `audit` đi qua phần Jira của quy tắc PR tài liệu. Thử comment lên `DEMO-21`: 401 |
| 8. Token của agent gắn được file lên item | Sai, đã sửa spec | Token của agent: 401 "scope does not match", vì token chỉ có scope đọc. Token CI: gắn được (200), xóa được (204). Bạn duyệt: script gắn bằng chứng, gắn Fix Version và comment bằng token CI, trong phiên của bạn; token CI không vào phiên agent (spec mục 2.5, 2.6; T12–T14) |
| 9. Token CI tạo được Bug có Found in, Severity, Affects Version | Đúng phần kiểm được | Bug `DEMO-25` (Found in Production, Severity Critical) tạo được (201). Màn hình tạo Bug có Affects versions, nhưng `DEMO` chưa có version nào nên chưa thử gán. Token CI không chuyển được Bug sang Cancelled: từ New chỉ có transition Refine. Bạn chuyển `DEMO-25` sang Cancelled (Won't Do) |
| 10. Yêu cầu deploy bằng login của bạn ghi đúng người tạo; token `ao-dev` không tạo được | Đúng | Deployment `production` tạo bằng login `gh`: creator `TungPH7`. Token `ao-dev`: 403 "Resource not accessible by integration". Deployment thử đã chuyển `inactive` và xóa |

**Phát hiện thêm:**

- **`audit` của commit `3fdd514`** (PR tài liệu #15 của `DEMO-20`, merge ngày 2026-11-01) fail, kể cả khi chạy bằng login của bạn: "PR #15 was merged without: a CI run on head 8b7f944". Lượt CI mới nhất của nhánh là của `2109853`, commit được push rồi bị bỏ trước lúc merge. Lỗi nằm ở lịch sử cũ, không ở App. Vì deployer kiểm mọi commit mới, nó cần một điểm bắt đầu: lúc cài (T18), head hiện tại của từng nhánh được ghi là đã kiểm. T8 và T18 đã ghi thêm việc này.
- **Tên loại item theo ngôn ngữ của tài khoản.** Với token CI, `createmeta` trả tên loại item bằng tiếng Trung (`缺陷`), kèm `untranslatedName` là `Bug`. T11 tìm loại item và trường bằng `untranslatedName` hay id, không bằng tên hiển thị.
- **Bản cũ trên `ao-pilot`:** tag `v0.1.0`, nhánh `release/0.1.0`, và `main` có 4 commit không nằm trong `develop`. Cách xử lý được đưa ra trước T14.

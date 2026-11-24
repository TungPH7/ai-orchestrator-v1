# Kiểm chứng: setup có hướng dẫn

> **Spec:** [SPEC-guided-setup.md](../../SPEC-guided-setup.md) mục 6. Lần chạy thử thật trên `du-an-1`: phiên chính làm
> đúng theo [ao-kit-setup.md](../../ao-kit-setup.md), ghi từng bước, thời gian, và mọi chỗ file sai hay thiếu.

**Trạng thái:** đang chạy, từ 2026-11-24 19:41, trên kit `ce0c4ba` (kit PR #359).

## Các bước

| Bước | Kết quả | Thời gian |
|---|---|---|
| 1. Hỏi, bảng duyệt | Câu trả lời của Lượt 8 ghi vào `.ai/setup/answers.md`. Template `api` có ghi chú riêng: nhánh sạch là `codebase`, bạn chọn nhánh hiện tại, nên bỏ thêm `backups/` (một bản dump database git đang giữ), `log.txt`, `note.md`, `docs/research-coding-convention/` | |
| 2. Chuẩn bị một lần | Đủ công cụ và biến môi trường; `jira-check --space DEMO` khớp; DNS wildcard trỏ về VPS. Thiếu ở máy: `AO_DEV_APP`… không đặt, nên slug và id lấy từ `project.yaml` của `shop` | vài phút |
| 3. Repo và `init --package-manager pnpm` | Repo public `TungPH7/du-an-1`; `init` giữ nguyên `.ai/`; thêm `merge`, `merge_id`, rồi `render` | 16 giây |
| 4. `add` ba app | `web` 237 file, `admin` 170 file, `api` 378 file; `add-report.md` có đủ ba mục; ghi tay `env:`, `database`, `coverage_exclude`, `hosts` | 25, 29, 9 giây |
| 5. Space Jira | `DA1`, board và bộ lọc; còn 5 chỗ lệch ở cột board, chờ bạn bấm | 18 giây |
| 7. Commit đầu | **Dừng:** hook `pre-commit` từ chối 10 dòng `eslint-disable`, `@SuppressWarnings`, `@Generated` của template, vì thiếu `reason:` | 32 giây |

## Kit sửa theo lần chạy

| Chỗ | Vấn đề | Sửa |
|---|---|---|
| `scripts/pre-commit.mjs` | Commit đầu của repo mang code template đã có, mà hook kiểm Suppressions trên mọi dòng mới; job `policy` của CI chỉ kiểm PR | Commit đầu không kiểm Suppressions, vẫn quét secret và chạy `precommit`; test đỏ trước |
| `lib/scaffold/add.mjs` | Tìm `<excludes>` ở cả pom, nên `<excludes>` của plugin khác (Lombok) cũng tính | Chỉ đọc trong plugin JaCoCo, và đề xuất sẵn danh sách `coverage_exclude` |
| `lib/scaffold/add.mjs` | `env:` của `deploy.yaml` là file của kit, nhưng nằm ở mục "Code to change" | Thêm dòng "By hand" cho `env:` (profile và biến database) |
| `lib/scaffold/init.mjs` | Dòng `Next:` thiếu `spring-boot` | Thêm `spring-boot` và `--seo\|--no-seo` |
| `ao-kit-setup.md` bước 2 | `gh api apps/<slug>` trả 404 với App private | Lấy id ở trang của App, hay `project.yaml` của dự án khác |
| `ao-kit-setup.md` bước 6 | API không cài App vào repo bằng login `gh` (403: cần token của một GitHub App) | Chỉ bấm tay; hỏi cùng lúc với cột board và key `ao-merge` |

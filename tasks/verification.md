# Kiểm thật: project-scaffold, phần 3 (B3)

> **Spec:** [SPEC-project-scaffold-3.md](../SPEC-project-scaffold-3.md). **Plan:** [plan.md](plan.md). **Task:** [todo.md](todo.md).

## T1 (2026-11-14)

Spec duyệt ở Phiên 28 · Lượt 7, cả ba câu ở mục 9 theo đề xuất; nhánh `codebase` của template Java giữ nguyên sau khi so với `base-3` (Lượt 6). PR tài liệu gồm spec, plan, todo và nhật ký Phiên 28 · Lượt 1–6.

Kit PR #269 (`ef38260`).

## T2: tiền đề (2026-11-14)

Mình chép nhánh `codebase` của template (`0a0ccac`) ra thư mục tạm bằng `git archive`, đúng những gì `add` sẽ chép, rồi bật Docker Desktop (engine sẵn sàng sau 12 giây). Xong thì xóa container, volume, network và image thử, rồi tắt Docker Desktop.

| # | Tiền đề | Kết quả |
|---|---|---|
| 1 | `mvnw verify` với JDK `C:\opt\jdk-21` | **Đạt**: 76 giây, 59 test (Testcontainers với `postgres:17-alpine`), JaCoCo check đạt, có `target/site/jacoco/jacoco.xml` |
| 2 | `osv-scanner` đọc đủ dependency Maven | **Đạt**, với `--data-source native`: 185 gói, chứa đủ 171 dependency mà `mvnw dependency:list` liệt kê (116 compile/runtime, 55 test), khớp từng tên và bản |
| 3 | Postgres với `--user postgres`, `--cap-drop ALL`, `no-new-privileges` | **Đạt**: sẵn sàng sau 4 giây; script init tạo role, bốn extension và schema `app`; RAM 30 MiB lúc rảnh, 55 MiB sau migration, trần 256 MB |
| 4 | Image `api` với trần RAM | **Đạt** sau khi sửa một dòng `.dockerignore` (bên dưới): build 162 giây, image 277 MB; với `--memory 768m --cap-drop ALL`, `/actuator/health` báo UP sau 18 giây; Flyway chạy đủ 3 migration; `/api/v1/health` trả lời; RAM 290 MiB lúc rảnh |
| 5 | Skill `java-springboot` | **Dùng**: `github/awesome-copilot` (MIT), commit `f65ff3955a6b` (2026-10-22). Viết cho Spring Boot 4; luật khớp kit: kiểm bằng build của dự án, không tự nâng bản, hỏi trước khi thêm hạ tầng. `SKILL.md` đã đọc hết; năm file `references/` (33 KB) đọc ở T10 trước khi chép |

**Năm điều tiền đề tìm ra, đã đưa vào spec:**
1. **`mvnw.cmd` phải gọi bằng đường dẫn đầy đủ.** Phiên Claude Code đặt `NoDefaultCurrentDirectoryInExePath=1`, nên `cmd.exe` không tìm lệnh trong thư mục hiện hành: `mvnw.cmd` trần báo "not recognized", còn `.\mvnw.cmd` chạy được.
2. **`osv-scanner` dùng `--data-source native`.** Nguồn mặc định là deps.dev qua gRPC; trên máy, lần gọi đó hỏng vì DNS ("name resolver error"). Nguồn `native` đọc Maven Central qua HTTPS, như Maven. DNS trên máy cũng có lúc không phân giải được `repo.maven.apache.org`, giống `ENOTFOUND` ở B2. Bản ghim: v2.7.0 (2026-10-12), không lấy v2.7.1 vì mới ra 5 ngày. SHA-256: Windows `9964ed64ec9a387391eb4cc006ad5c531154821aef29b793e02c448de4686438`, Linux `160c6253e2922e9e0a6a9771c5c4c40a4b3c6090b34a3cdd5e80c96cc2e4218b`.
3. **Template có nhiều lỗ hổng:** 16 gói có advisory, 10 nhóm từ 9,0 điểm trở lên (như `tomcat-embed-core` 11.0.21, `spring-webmvc` 7.0.7) và 29 nhóm từ 7,0 tới dưới 9,0. Job `policy` của `shop` sẽ đỏ cho tới khi Task ở T21 nâng Spring Boot, như hai template JS ở B2.
4. **`.dockerignore` của template có comment cuối dòng** (dòng 61: `!README.md   # giữ README chính …`). `.dockerignore` không hiểu comment cuối dòng, nên cả dòng thành một mẫu; Docker 24 trên máy từ chối build ("exclude-patterns contains value with non-printable ASCII characters"). `add` thêm một luật báo dạng này; sửa ở T21.
5. **`study-guide-impl/build-project/99-troubleshoot/eol.md` làm Spotless đỏ** ngay trên nhánh `codebase`. Thư mục này bị `--exclude`, nên `shop` không gặp.

Image Postgres: `postgres:17-alpine@sha256:d3244e8ce3f165ee3c93d9c4a4b1d0fe48b3a89e2287b717fdcbbde92d405065`.

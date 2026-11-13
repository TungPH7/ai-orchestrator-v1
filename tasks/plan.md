# Plan triển khai: project-scaffold, phần 3 (B3)

> **Spec:** [SPEC-project-scaffold-3.md](../SPEC-project-scaffold-3.md), đã duyệt 2026-11-14 (Phiên 28 · Lượt 7). **Trạng thái:** viết ở Lượt 7. Quyền tự làm theo đề xuất áp dụng cho B3 (Lượt 4), nên plan không chờ duyệt riêng; bạn muốn đổi gì thì nói lúc nào cũng được. **Danh sách task:** [todo.md](todo.md).

## Tổng quan

Phần 3 chia năm chặng. Ba chặng đầu là code của kit, mỗi chặng một PR; chặng 4 gom các việc nhỏ B2 để lại; chặng 5 là kiểm thật và hướng dẫn:
- **Chặng 1, Maven trong workspace pnpm:** `maven.mjs` và `mvnw.mjs`; stack `spring-boot` và `add`; CI cài JDK; `doctor` và `ao-step` kiểm JDK và Docker.
- **Chặng 2, cổng chất lượng cho Java:** coverage từ JaCoCo và `coverage_exclude` theo app; `osv-scanner`; dòng tắt check, path security; skill của `be-dev`; luật migration.
- **Chặng 3, deployer và database:** `deploy.yaml` có `context`, `memory`, `start_timeout`, `database`; container Postgres; backup.
- **Chặng 4, việc B2 để lại:** `setup jira` gặp lỗi mạng, `ao-pr.mjs` đọc `AO_*`, `health` cho next-intl.
- **Chặng 5, kiểm thật và hướng dẫn:** chép kit vào `shop`, thêm `api`, sửa code `api` có `/ao-preview`, lên Development với Postgres, đo RAM, thử backup, bản cuối của hướng dẫn.

Task đầu kiểm năm tiền đề bằng chạy thật, vì kết quả có thể đổi thiết kế của chặng 1–3.

## Quyết định kiến trúc

1. **Mỗi chặng code một nhánh và một PR, mỗi task một commit.** Nhánh `task/scaffold3-<N>` tách từ `main`. Mình tự merge khi CI xanh, như các PR kit trước.
2. **Hàm thuần, effect truyền vào,** như hai phần trước. `scripts/*.mjs` chỉ ghép tham số và gọi lib.
3. **App Java là một package của workspace pnpm** (spec 2.1), qua `apps/<app>/package.json` không có dependency. Bốn script ở gốc, CI và `/ao-preview` chạy nó như app JS, nên ba chỗ đó gần như không đổi.
4. **Chỉ một chỗ biết Maven:** `lib/quality/maven.mjs`. Nó trả về tham số Maven của từng script, cách gọi wrapper theo hệ điều hành, và JDK cần dùng. `scripts/mvnw.mjs` chỉ nhận tên script đã biết (`lint`, `typecheck`, `test:coverage`, `build`, `dev`), không nhận tham số tự do, nên `cmd.exe /d /s /c mvnw.cmd` trên Windows chỉ chạy chữ cố định.
5. **Container database đứng ngoài vòng đổi bản.** Nhãn `ao.role=database`, không có `ao.app`; `listContainers` của `swap` chỉ lấy container có `ao.app`. Deployer tạo container khi chưa có; deploy và rollback không bao giờ dừng hay xóa nó.
6. **Script init của database lấy từ commit đang deploy,** chép vào `/var/lib/ao/<dự án>/<môi trường>/db-init/` với quyền đọc cho user `postgres` của container, chỉ khi volume còn trống. Về sau đổi schema bằng Flyway, không bằng script init.
7. **Trần RAM:** mặc định `512m` cho app, `256m` cho database; `memory` của `deploy.yaml` thay mặc định. `--memory-swap` bằng `--memory`, nên container không lấn sang swap.
8. **Backup chạy bằng root** qua timer riêng (`ao-backup`), không qua deployer, vì file dump chỉ root đọc được. Chọn bản giữ lại là hàm thuần.
9. **Trên `shop`, ba PR theo bài học của B2:**
   - PR chép kit B3 (`ao-kit sync`);
   - PR thêm `api` bằng `add`: code nguyên của template, cùng `project.yaml`, `deploy.yaml`, `roster.local.yaml`;
   - PR sửa code `api` theo báo cáo của `add`. PR này không sửa `.ai-orchestrator/`, nên `/ao-preview` chạy được.

   Hai PR đầu sửa đường dẫn được bảo vệ, và cả ba không có báo cáo review (spec câu 3: 0 USD agent). Bạn merge tay. Khi `audit` chặn deploy, bạn đọc commit rồi gỡ chặn bằng `/ao-rollback development <sha>`, như `docs/release-workflow.md` đã ghi.
10. **Hướng dẫn viết hai lượt,** như phần 2: bản nháp trước kiểm thật để chặng 5 làm đúng theo nó, bản cuối sau, với đầu ra thật.
11. **Việc trên VPS:** bạn mở VPS (mục 9 của `docs/vps-setup.md`), mình làm theo các bước đã viết. Chỉ phiên chính SSH. Không in file có thông tin đăng nhập; mật khẩu sinh ngay trên VPS và không bị in.

## Task

| Task | Nội dung | Chặng |
|---|---|---|
| T1 | Spec duyệt, plan, todo, nhật ký Phiên 28 · Lượt 1–6 | PR tài liệu |
| T2 | Tiền đề: `mvnw verify` của template; `osv-scanner` trên `pom.xml`; Postgres với `--cap-drop ALL`; image `api` với trần RAM; skill `java-springboot` | Ghi vào `verification.md` |
| T3 | `maven.mjs`, `mvnw.mjs`: tham số, wrapper theo hệ điều hành, chọn JDK, `dev` | 1 |
| T4 | Stack `spring-boot`; `add` cho template Java; báo chỗ code phải đổi | 1 |
| T5 | CI: `setup-java` khi có `apps/*/pom.xml` | 1 |
| T6 | `doctor`: JDK, Docker, câu hỏi về `ao-deploy`; `ao-step` dừng khi Docker chưa chạy | 1 |
| T7 | Tài liệu chặng 1; PR | 1 |
| T8 | Coverage: JaCoCo XML; `coverage_exclude` theo app; `e2e`, `scripts` dưới `apps/*` | 2 |
| T9 | `osv-scanner` trong job `policy` | 2 |
| T10 | Dòng tắt check và path security của Java; skill `java-springboot`, `api-conventions` | 2 |
| T11 | Luật migration chạy được với bản trước: prompt, `docs/release-workflow.md`; PR | 2 |
| T12 | `deploy.yaml`: `context`, `memory`, `start_timeout`, `database` | 3 |
| T13 | Deployer: build context, trần RAM, thời gian chờ smoke test | 3 |
| T14 | Container database: tạo, init, biến, đứng ngoài vòng đổi bản | 3 |
| T15 | Backup: `ao-backup.mjs`, timer, giữ 7 ngày và 4 tuần, kiểm khôi phục | 3 |
| T16 | Tài liệu chặng 3 (`vps-setup.md`, `release-workflow.md`, `deployer.example.yaml`); PR | 3 |
| T17 | `setup jira` gặp lỗi mạng; `ao-pr.mjs` đọc `AO_*`; `health` cho next-intl; PR | 4 |
| T18 | Bản nháp của hướng dẫn | 5 |
| T19 | **[bạn]** VPS: đo RAM, cập nhật kit, `--dry-run` | 5 |
| T20 | **[bạn]** `shop`: PR chép kit, PR thêm `api`; CI xanh, `doctor` đạt | 5 |
| T21 | **[bạn]** `shop`: Task và PR sửa code `api`; `/ao-preview` ba app và Postgres | 5 |
| T22 | **[bạn]** Development: database, `api`, đo RAM, backup và khôi phục | 5 |
| T23 | Bản cuối của hướng dẫn; PR | 5 |
| T24 | Đóng module | PR tài liệu |

**Checkpoint:**
- **Checkpoint 1**, sau T2: năm tiền đề có kết quả; spec sửa nếu cần.
- **Checkpoint 2**, sau T7 và T11: hai PR merge; năm lệnh kiểm xanh; dự án không có Java không đổi hành vi.
- **Checkpoint 3**, sau T16 và T17: hai PR merge; Caddyfile của `ao-sample` và `ao-pilot` giống hệt bản cũ.
- **Checkpoint 4**, sau T23: tiêu chí 2–7 của spec đạt.
- **Checkpoint 5**, sau T24: đủ bảy tiêu chí.

## Rủi ro

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| `osv-scanner` không đọc đủ dependency bắc cầu của Maven | Trung bình: lỗ hổng lọt qua `policy` | T2 so kết quả với `mvnw dependency:tree`. Không đủ thì đổi cách ở T9 (spec mục 8) |
| Postgres không chạy được với `--cap-drop ALL` | Cao: chặng 3 phải đổi thiết kế | T2 thử trước khi viết deployer |
| `mvnw.cmd` trên Windows chạy qua `cmd.exe` | Trung bình: chỗ chạy lệnh qua shell | Chỉ tên script đã biết, tham số cố định; test kiểm mọi tham số |
| Spring Boot khởi động quá lâu trên VPS | Trung bình: deploy tốt bị đánh hỏng | T2 đo trên máy với trần RAM; `start_timeout` 180 giây |
| VPS thiếu RAM khi build Maven và lúc hai JVM cùng chạy | Cao | Đo ở T19 và T22 trước khi thêm môi trường nào; spec câu 1 giữ B3 ở Development |
| `audit` chặn deploy sau ba PR do bạn merge | Thấp: chờ thêm một bước | Gỡ chặn bằng `/ao-rollback development <sha>` (quyết định 9) |
| Docker Desktop chưa chạy khi test Java | Thấp | Mình bật khi một bước cần, rồi tắt; `doctor` và `ao-step` báo rõ |

## Chi phí

Phần 3 không gọi agent trả tiền (spec câu 3). `be-dev` làm việc với Java lần đầu ở Epic đầu của B4. `shop` là repo public, nên CI không tốn phút.

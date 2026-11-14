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

## Chặng 1: Maven trong workspace pnpm (T3–T7), nhánh `task/scaffold3-1`

**T3.** `lib/quality/maven.mjs` và `scripts/mvnw.mjs`:
- Năm script ra năm lần chạy Maven cố định; `typecheck` và `build` bỏ Spotless và Checkstyle, vì `lint` đã chạy hai bước đó.
- Trên Windows: `cmd.exe /d /s /c ".\mvnw.cmd …"` trong thư mục app, với `windowsVerbatimArguments`. Tham số nào có ký tự ngoài chữ, số và `: . _ = -` thì bị từ chối. Nơi khác: `sh ./mvnw`, nên không cần bit thực thi.
- Chọn JDK bằng file `release` của JDK, không chạy `java`.
- **Chạy thật** trên bản chép của template, với `JAVA_HOME` vẫn là JDK 17: `lint` xanh sau 9 giây; `typecheck` biên dịch 35 file với `release 21` và xanh sau 8 giây. Script đã tự chọn `C:\opt\jdk-21`, nằm cạnh `JAVA_HOME`.

**T4.** Stack `spring-boot` và `add`:
- Stack không có khung riêng (`requires_template`); `add` không có `--from` thì dừng. `package.json` của stack chỉ được chép khi template chưa có.
- `template.mjs`: dòng "Left out" in số file của mỗi thư mục (`.claude/ (1977 files)`). Template không có `CLAUDE.md` mà có `docs/coding-conventions/` thì skill `<app>-conventions` trỏ tới các file đó.
- `app-report.mjs` thêm sáu luật cho Spring Boot: cổng không lấy từ `PORT`; biến không có giá trị mặc định; `EXPOSE` hay `HEALTHCHECK` khác cổng của app; `SPRING_PROFILES_ACTIVE` đặt cứng trong Dockerfile; JaCoCo không ghi XML; và cho mọi app: comment cuối dòng trong `.dockerignore`. Luật lcov của Vitest không áp cho app Java.
- `deploy.schema.json` nhận `context`, `memory`, `start_timeout` ngay ở task này, vì `add` ghi ba khóa đó. Phần deployer dùng chúng vẫn ở T13.
- **Chạy thật** trên template của bạn (`codebase`, `0a0ccac`) trong một dự án tạm: `init --package-manager pnpm` 19 giây, `add api` 6 giây.
  - Chép 93 file; bỏ `.claude/` (1.977 file), `.githooks/`, `.github/` (4 file); `docs/coding-conventions/` (16 file) thành skill `api-conventions`.
  - Báo năm chỗ: cổng từ `SERVER_PORT`; `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` không có giá trị mặc định; Dockerfile mở 8080; `SPRING_PROFILES_ACTIVE` đặt cứng; dòng 61 của `.dockerignore`.
  - Lần đầu, luật Dockerfile không thấy cổng của `HEALTHCHECK`, vì dòng đó xuống dòng bằng `\`. Luật giờ nối các dòng tiếp nối trước khi đọc, và test giả lập đúng dạng đó.
  - `pnpm --filter ./apps/api run typecheck` ở gốc dự án tạm xanh sau 12 giây: chuỗi `pnpm` → `package.json` → `mvnw.mjs` → JDK 21 chạy được.
- `profiles:check` xanh (295 giây); nó vẫn chỉ dựng `nextjs` và `react`.

**T5.** CI: bước **Java versions** (`ci-java.mjs`) đọc bản Java của `apps/*/pom.xml`, rồi `actions/setup-java` v6.1.0 (`b843ebf9…`, ra ngày 14/10) cài đúng các bản đó và giữ cache Maven, chỉ khi repo có `apps/*/pom.xml`. Test của task này viết sau khi sửa `ci.yml`, nên không có lần đỏ trước.

**T6.**
- `doctor` có dòng JDK cho từng app Java và dòng Docker đang chạy, chỉ khi dự án có app Java.
- `doctor` có dòng hỏi về `ao-deploy` (nhóm GitHub, dấu `?`). Login `gh` không đọc được bản cài của App: `GET /user/installations` trả 403 với token OAuth của `gh`.
- `ao-step` dừng trước lượt `be-dev` của dự án có app Java khi Docker chưa chạy (`dockerGate`). **Khác spec đã duyệt:** spec ghi cả `qa`, nhưng `qa` kiểm trên môi trường đã deploy và không chạy Testcontainers; spec mục 2.2 đã sửa theo.

Năm lệnh kiểm xanh: 1.353 test.

Kit PR #270 (`f29a873`) merge chặng 1; CI xanh cả `contract` và `profiles`.

## Chặng 2: cổng chất lượng cho Java (T8–T11), nhánh `task/scaffold3-2`

**T8.**
- `parseJacoco` đọc báo cáo XML của JaCoCo: mỗi `sourcefile` của mỗi `package` thành `<app>/src/main/java/<package>/<file>`; số lệnh đã chạy (`ci`) của một dòng là số lần chạy, 0 là chưa chạy.
- `gates.yaml`: nguồn thêm `**/src/main/java/**/*.java`; khóa mới `jacoco: [apps/*/target/site/jacoco/jacoco.xml]`; `e2e/**` và `scripts/**` thành `{,apps/*/}e2e/**`, `{,apps/*/}scripts/**`, nên `e2e/` và `scripts/` của từng app cũng không bị tính (việc B2 để lại).
- `project.yaml` có `apps.<app>.coverage_exclude`. Glob phải nằm trong thư mục app: đường dẫn tuyệt đối hay có `..` bị schema từ chối. `coverage-diff` cộng các glob này vào danh sách loại trừ.
- Câu báo đổi từ "is not in any lcov file" thành "is not in any coverage report".

**T9.**
- Job `policy` cài `osv-scanner` v2.7.0 vào `$RUNNER_TEMP`, kiểm SHA-256 như gitleaks, chỉ khi repo có `apps/*/pom.xml`.
- `check-policy.mjs` quét từng `pom.xml` với `--data-source native`. Lệnh trả 0 khi không thấy gì, 1 khi thấy advisory; mã khác là quét hỏng, và job đỏ.
- `osvProblems` tính mỗi nhóm advisory một lần cho mỗi gói, theo điểm CVSS cao nhất: từ 9,0 là critical, từ 7,0 là high. Nhóm chưa có điểm được tính là high, để không lọt qua mà chưa ai đọc. Ngoại lệ khớp theo mã GHSA hay bất kỳ alias nào, như CVE.
- **Chạy thật** `check-policy.mjs` của kit trong dự án tạm của T4, với `osv-scanner` bản Windows: 21 giây, mục **Java dependencies** đỏ với 39 advisory high và critical của template, khớp 10 + 29 nhóm đếm ở T2. Mục **Dependencies** của pnpm vẫn xanh.

**T10.**
- `suppressions.patterns` thêm chín mẫu Java: `@SuppressWarnings`, `NOSONAR`, `@Disabled`, `CHECKSTYLE:OFF`, `CHECKSTYLE.OFF`, `spotless:off`, `@SuppressFBWarnings`, `NOPMD`, `@Generated`.
- `security_review.roster_effort_paths` thêm 13 path của Spring Boot; service vẫn không nâng effort, như với NestJS.
- Skill `java-springboot` chép vào `profiles/stacks/spring-boot/skills/` với `SOURCE.md` (MIT, commit `f65ff3955a6b`, không sửa gì). Mình đã đọc cả năm file `references/` trước khi chép: chỉ có hướng dẫn kỹ thuật về Spring Boot 3 và 4, không có chỉ dẫn nào đi ngược luật của kit. Stack khai skill này cho `be-dev`, đứng trước `<app>-conventions`.

**T11.**
- Prompt của `be-dev`, `sa` và `reviewer` có luật "migration phải chạy được với bản trước". Với `reviewer`, vi phạm là finding High.
- `docs/release-workflow.md`, mục Cơ sở dữ liệu, bỏ câu "kit chưa chạy migration": Flyway chạy khi app khởi động, và deployer bật bản mới cạnh bản cũ.
- Agent đã sinh lại; `agents:check` xanh.

Năm lệnh kiểm xanh: 1.363 test.

Kit PR #271 (`b278aea`) merge chặng 2; Checkpoint 2 đạt.

## Chặng 3: deployer và database (T12–T15 xong, T16 chưa), nhánh `task/scaffold3-3`

**T12.** `deploy.yaml` có khóa `database`: `image` phải ghim digest; `init` là thư mục trong repo (không đường dẫn tuyệt đối, không `..`); `memory` theo dạng `<số>m` hay `<số>g`; không nhận khóa nào khác.

**T13.**
- `buildArgs` nhận `folder`, tức `context` của app: build từ thư mục đó, còn `--file` vẫn tính từ gốc checkout. `folder` có `..`, `.` hay đường dẫn tuyệt đối thì bị từ chối.
- Mọi container app có `--memory` và `--memory-swap` bằng nhau, mặc định `512m`, nên container vượt trần thì dừng, không lấn sang swap của VPS.
- Smoke test của mỗi app chờ theo `start_timeout` (mặc định 60 giây).
- `swap` chỉ liệt kê container có nhãn `ao.app` (`--filter label=ao.app`), nên container database không bao giờ bị đổi bản, dừng hay xóa.
- Test của installer cho app có `context` viết sau code, nên không có lần đỏ trước.

**T14.** `lib/release/database.mjs`:
- `databaseRunArgs`: một container `ao-<dự án>-<môi trường>-db` với alias `db`, user `postgres`, `--cap-drop ALL`, `no-new-privileges`, trần RAM (mặc định `256m`), nhãn `ao.role=database` và không có `ao.app`, volume cùng tên, không mở cổng. Script init gắn chỉ đọc. Giá trị biến chỉ nằm trong môi trường của lệnh docker, không nằm trong tham số.
- `ensureDatabase`: database đang chạy thì để yên; đã dừng thì bật lại; chưa có thì tạo. Chỉ volume mới mới nhận script init. Lệnh chờ `pg_isready` tối đa 60 giây, quá thì deploy dừng và nói lý do.
- Installer đọc `<môi trường>.db.env` trước khi build; thiếu file thì không chạy gì, và nói đúng file thiếu. Database được đảm bảo sau khi build và trước khi đổi bản app. Script init chép từ worktree của commit sang `/var/lib/ao/<dự án>/db-init/<môi trường>/`, mở quyền đọc như thư mục build.

**T15.** `lib/release/backup.mjs`, `scripts/ao-backup.mjs`, `vps/ao-backup.service`, `vps/ao-backup.timer`:
- Mỗi ngày lúc 02:30 giờ Việt Nam, chạy bằng root (`UMask=0077`): `pg_dump -Fc` của từng database đang chạy, ghi vào `<tên>.part` rồi mới đổi tên khi xong. Giữ bản mới nhất của 7 ngày gần nhất và của 4 tuần gần nhất.
- `restore-check <dự án> <môi trường>`: khôi phục bản mới nhất vào container tạm `--network none`, cùng image, rồi so số bảng và số dòng đếm chính xác với database đang chạy. Container tạm luôn bị xóa.
- **Chạy thật** trên Docker của máy, với database dựng đúng bằng `databaseRunArgs` (image ghim digest, user `postgres`, `--cap-drop ALL`): database sẵn sàng sau 21 giây, tính cả lúc tải image. `ao-backup.mjs run` ghi một bản dump 2.546 byte. `restore-check` ra 2 bảng và 32 dòng, khớp database đang chạy, và thoát mã 0. Sau đó container, volume, network, image thử đều đã xóa, và Docker Desktop đã tắt.

Năm lệnh kiểm xanh: 1.385 test.

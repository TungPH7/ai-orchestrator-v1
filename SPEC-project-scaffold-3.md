# SPEC: project-scaffold, phần 3 (B3)

> **Trạng thái:** viết ở Phiên 28 · Lượt 4, **đã duyệt 2026-11-14 (Lượt 7)**, cả ba câu ở mục 9 theo đề xuất. Plan và task: [tasks/plan.md](tasks/plan.md), [tasks/todo.md](tasks/todo.md). Phần 1 ở [SPEC-project-scaffold.md](SPEC-project-scaffold.md) (mục 4 ghi phạm vi phần 3), phần 2 ở [SPEC-project-scaffold-2.md](SPEC-project-scaffold-2.md). Nguồn: hàng B3 của [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md), Lượt 199–200 của Phiên 27, Lượt 3–4 của Phiên 28, và mục T26 "Việc kit để sau" của [tasks/archive/project-scaffold-2/verification.md](tasks/archive/project-scaffold-2/verification.md).

## 1. Mục tiêu

Phần 2 dựng repo `shop` với `apps/user` (Next.js) và `apps/admin` (React), chạy trên Development. Phần 3 thêm `apps/api` bằng Spring Boot, lấy từ template Java của bạn, cùng database PostgreSQL. Phần 3 làm bảy việc:
1. Stack `spring-boot` (Maven), và `ao-kit add` cho template Java (2.1).
2. App Java chạy trên máy bạn và trong CI, qua bốn script như app JS (2.2).
3. Cổng chất lượng cho Java: coverage, kiểm dependency, dòng tắt check, path security, skill cho `be-dev` (2.3).
4. PostgreSQL trên máy, trong CI và trên VPS; migration bằng Flyway; backup (2.4).
5. Deployer: build context theo app, trần RAM cho mỗi container, thời gian chờ smoke test; đo RAM của VPS (2.5).
6. Sáu việc kit mà B2 để lại, và lần chạy thật đầu tiên của `/ao-preview` cho pnpm (2.6).
7. Hướng dẫn với ví dụ Spring Boot (2.7).

Xong phần 3, `shop` có đủ ba app và database trên Development, và `/ao-preview` chạy cả ba app trên máy bạn. Đó là "trường hợp 2" của concern 1, sẵn sàng cho Pilot 3 (B4).

### 1.1 Quyết định đã có

- **Lượt 200 (Phiên 27):** database (Postgres, migration, backup) và việc đo RAM của VPS thuộc phần 3. Hook, workflow và `.claude/` của template nhường cho kit; skill hữu ích của template thành skill theo stack.
- **Lượt 3–4 (Phiên 28):**
  - template Java là `D:/Document/1Khoahoc/4LapTrinh/java/tungph7-learnPostgresql-api-java`, nhánh `codebase`;
  - template dùng Maven, nên stack chỉ làm Maven;
  - bắt đầu B3, và quyền tự làm theo đề xuất (Lượt 181) áp dụng tiếp cho B3.
- **Lượt 5–7 (Phiên 28):**
  - máy bạn đã có JDK 21 ở `C:\opt\jdk-21`, nên câu 4 của bản nháp đầu (cài JDK) bỏ đi;
  - bạn hỏi nên dùng `codebase` hay `base-3/implement-features-to-learn-postgresql`. Giữ `codebase`: `base-3` mang theo chín tính năng e-commerce chưa qua review của kit, có endpoint chẩn đoán database mở cho mọi người (`/api/**` chưa cần đăng nhập), và chưa qua commit dọn `0a0ccac`. Phần `common/` dùng chung của `base-3` (`PagedResponse`, `SqlStatement`, `TstzRange`, `ClockConfig`, ba exception) vào `shop` qua một Task khi Epic đầu cần;
  - bạn duyệt spec, cả ba câu ở mục 9 theo đề xuất.

### 1.2 Template Java, nhánh `codebase` (`0a0ccac`)

Mình đã đọc template, không sửa gì:

| Mục | Template có | Phần 3 cần |
|---|---|---|
| Build | Maven wrapper 3.3.4 (kiểu `only-script`, tải Maven 3.9.15), Java 21, Spring Boot 4.0.6 | Chạy được bằng `pnpm run <script>` từ gốc repo (2.2) |
| Lint | Spotless (google-java-format) và Checkstyle, gắn vào phase `validate` | Script `lint` |
| Test | JUnit, 13 lớp test, Testcontainers với `postgres:17-alpine` | Docker khi chạy test, trên máy và trong CI |
| Coverage | JaCoCo: report và check (dòng 70%, nhánh 60%; service 85%), loại trừ `config/**`, `dto/**`, `*Properties`, `*MapperImpl` | Kit đọc báo cáo JaCoCo; các loại trừ khớp luật của kit (2.3) |
| Database | PostgreSQL, Flyway (`db/migration`, V1–V3, schema `app`). Script `docker/postgres/init` tạo role của app, bốn extension và schema `app`, bằng quyền superuser | Chạy script này một lần trên mỗi database mới (2.4) |
| Cấu hình | `SERVER_PORT` (mặc định 8080); `DB_HOST`, `DB_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`; profile `dev`, `staging`, `prod` | Cổng lấy từ `PORT`, như mọi app của kit (2.1) |
| Route | `/api/v1/health`, `/api/products`; `/actuator/health` không cần đăng nhập | Caddy trong container `admin` chuyển `/api/*` sang `api:3001` mà không bỏ tiền tố, nên route giữ nguyên |
| Container | Dockerfile nhiều tầng, build từ thư mục của app; chạy user 1001; `MaxRAMPercentage=75` | Build từ thư mục của app trên VPS (2.5) |
| Thứ kit thay | `.githooks/`, `.github/` (CI và release riêng), `.claude/` (1.943 file) | `add` bỏ đi |
| Thứ không thuộc sản phẩm | `study-guide-impl/`, `prompt.md` (ghi chú riêng của bạn) | `--exclude` |
| Quy ước | `docs/coding-conventions/` (16 file); không có `CLAUDE.md` | Skill `api-conventions` trỏ tới đó |

`.env` không được commit ở `codebase`; mật khẩu trong `.env.example` chỉ là giá trị giữ chỗ.

### 1.3 Giả định

Bạn sửa ngay nếu điều nào sai:
1. **Chỉ Maven, chạy qua `./mvnw` của app.** Gradle chỉ làm khi có dự án cần.
2. **Stack `spring-boot` chưa có khung riêng:** `add --stack spring-boot` cần `--from`. Khung Spring Boot của kit (không cần template) để khi có dự án cần. Nhờ vậy CI của kit không phải build một app Java.
3. **Flyway là công cụ migration,** vì template đã dùng. Không làm Liquibase.
4. **PostgreSQL 17**, cùng bản với Testcontainers và `docker-compose.yml` của template.
5. **`api` không công khai.** Chỉ Caddy trong container `admin` (`/api/*`) và server của `user` (`API_URL`) gọi nó, trên mạng Docker của môi trường.
6. **`api` chạy ở cổng 3001** trong container, vì `API_URL=http://api:3001` trên VPS và Caddyfile của stack `react` đã dùng cổng này.
7. **Máy bạn đã có JDK 21:** `C:\opt\jdk-21` (21.0.10), cạnh JDK 17 (`C:\opt\jdk-17.0.10`, Corretto), mà `JAVA_HOME` đang trỏ tới. Không phải cài gì, và `JAVA_HOME` giữ nguyên (2.2).
8. **Phần 3 chỉ deploy Development của `shop`.** Staging và Production đi cùng bản release đầu, ở B4 (câu 1, mục 9).
9. **Phần 3 không gọi agent trả tiền** (câu 3, mục 9).

## 2. Thiết kế

### 2.1 Stack `spring-boot` và `ao-kit add`

```
node <kit>/scripts/ao-kit.mjs add e-commerce/shop api --stack spring-boot --from <template Java> --ref codebase --exclude study-guide-impl/ --exclude prompt.md
```

`profiles/stacks/spring-boot/stack.yaml` khai:
- `profile: spring-boot`, cổng 3001, `health: /actuator/health`, `dev_role: be-dev`;
- skill của `be-dev` (2.3);
- `package.json` mẫu của app Java, và các luật báo chỗ code phải đổi.

`add` làm như với hai stack JS, thêm bốn điều:
- **Bỏ** `.githooks/`, `.github/`, `.claude/`. **Giữ** `.mvn/` và `mvnw`, `mvnw.cmd` (wrapper), `docker-compose.yml` và `docker/` (Postgres trên máy), `Dockerfile` (2.5), `.env.example`.
- **Thêm `apps/api/package.json`,** một package riêng (`private: true`) không có dependency. Bốn script và `dev` của nó gọi Maven qua script của kit (2.2). Nhờ vậy app Java là một package của workspace pnpm: `pnpm -r run <script>` ở gốc, CI và `/ao-preview` chạy nó như app JS, không phải sửa ba chỗ đó.
- **Skill `api-conventions`:** template không có `CLAUDE.md`, nên skill trỏ tới `apps/api/docs/coding-conventions/v1/`. Đầu skill ghi rằng luật của kit thắng skill.
- **Báo chỗ code phải đổi**, ví dụ với template của bạn:
  - `server.port` lấy từ `SERVER_PORT`, mặc định 8080: đổi thành `${PORT:3001}`, và sửa `EXPOSE`, `HEALTHCHECK` của Dockerfile theo;
  - Dockerfile đặt `SPRING_PROFILES_ACTIVE=prod` cho mọi môi trường. Deployer chạy một image ở cả ba môi trường, nên biến này phải nằm trong `env` của `deploy.yaml`, để file secret của từng môi trường chọn `dev`, `staging` hay `prod`;
  - JaCoCo không ghi báo cáo XML. Template của bạn có ghi, nên `add` sẽ không báo dòng này;
  - `.dockerignore` có comment cuối dòng. File này không hiểu comment cuối dòng, nên cả dòng thành một mẫu; dòng 61 của template (`!README.md   # giữ README chính …`) làm Docker 24 từ chối build (T2).

`project.yaml` có app `api`: `profile: spring-boot`, `dev: pnpm --filter ./apps/api run dev`, cổng `PORT` mặc định 3001, `health: /actuator/health`, không công khai. `deploy.yaml` có app `api` với `context`, `memory`, `start_timeout` (2.5), và khóa `database` (2.4).

### 2.2 App Java trên máy và trong CI

**Script `scripts/mvnw.mjs` của kit** chạy wrapper của app:
- Linux và macOS: `./mvnw <tham số>`, không qua shell.
- Windows: `mvnw.cmd` là file batch, mà Node không chạy được file `.cmd` nếu không qua shell. Script gọi `cmd.exe /d /s /c <đường dẫn đầy đủ>\mvnw.cmd <tham số>`, và chỉ nhận tham số cố định của `package.json`, không nhận chữ từ ngoài vào. Đường dẫn phải đầy đủ, vì phiên Claude Code đặt `NoDefaultCurrentDirectoryInExePath=1`, nên `cmd` không tìm lệnh trong thư mục hiện hành (T2).
- Chọn JDK theo `<java.version>` của `pom.xml`, theo thứ tự:
  1. `JAVA_HOME`, khi bản của nó khớp;
  2. biến `JAVA_HOME_<bản>` nếu có, như `JAVA_HOME_21`, theo cách runner của GitHub đặt tên;
  3. các JDK nằm cạnh `JAVA_HOME`: trên máy bạn là `C:\opt\jdk-21`;
  4. các thư mục cài thường gặp, như `C:\Program Files\Eclipse Adoptium`.

  Script chỉ đặt `JAVA_HOME` cho tiến trình con, nên `JAVA_HOME` của bạn (JDK 17, cho dự án khác) giữ nguyên. Không tìm thấy thì dừng, và nói bản cần cài.
- Với `dev`: đọc `apps/api/.env` (không commit), bật Postgres bằng `docker compose up -d --wait`, rồi `spring-boot:run` với `PORT` của `/ao-preview`.

| Script của `apps/api/package.json` | Maven |
|---|---|
| `lint` | `validate` (Spotless check, Checkstyle) |
| `typecheck` | `compile`, bỏ qua hai bước lint |
| `test:coverage` | `verify`: test, báo cáo và check của JaCoCo |
| `build` | `package -DskipTests` |
| `dev` | Postgres, rồi `spring-boot:run` |

**CI:** job `build-test` thêm bước `actions/setup-java` (ghim SHA, Temurin 21, cache Maven), chỉ chạy khi repo có `apps/*/pom.xml`. Bản Java lấy từ `pom.xml`. Testcontainers dùng Docker có sẵn của runner GitHub. Các dự án không có app Java không đổi gì.

**Máy bạn:**
- `doctor` có hai dòng mới cho dự án có app Java: JDK đúng bản của `pom.xml`, và Docker đang chạy.
- Test của `api` và `/ao-preview` cần Docker Desktop: Testcontainers cho test, Postgres cho `dev`. `ao-step` dừng trước lượt `be-dev` hay `qa` khi Docker chưa chạy, và nói cách bật.
- Hook `pre-commit` không chạy Maven, để commit vẫn nhanh. Spotless và Checkstyle chạy ở `lint`, trong CI.

### 2.3 Cổng chất lượng cho Java

| Cổng | JS (hiện nay) | Java (thêm) |
|---|---|---|
| Coverage của dòng đổi | lcov | Báo cáo XML của JaCoCo, `apps/*/target/site/jacoco/jacoco.xml`. Nguồn: `**/src/main/java/**/*.java`. Ngưỡng 80% như hiện nay |
| Kiểm dependency | `pnpm audit` | `osv-scanner` v2.7.0 trên `apps/*/pom.xml`, với `--data-source native` (đọc Maven Central như Maven), gồm dependency bắc cầu; cùng `audit_level: high` và cùng danh sách ngoại lệ có hạn. Bản cài ghim theo bản và SHA-256, như gitleaks. T2: nó thấy đủ 171 dependency mà Maven liệt kê |
| Dòng tắt check (cần `reason:` trên cùng dòng) | `eslint-disable`, `.skip(`… | `@SuppressWarnings`, `NOSONAR`, `@Disabled`, `CHECKSTYLE:OFF`, `CHECKSTYLE.OFF`, `spotless:off`, `@SuppressFBWarnings`, `NOPMD`, và `@Generated` (JaCoCo bỏ qua class có annotation này) |
| Path làm `security` review ở effort của roster | NestJS, Next.js | `**/pom.xml`, `**/.mvn/**`, `**/mvnw*`, `**/application*.{yml,yaml,properties}`, `**/*Controller.java`, `**/*Filter.java`, `**/*Interceptor.java`, `**/*Security*.java`, `**/*Auth*.java`, `**/security/**`, `**/*Repository.java`, `**/domain/**`, `**/dto/**`. Migration SQL đã có qua `**/*.sql` |
| SAST | Semgrep `p/default`, `p/owasp-top-ten` | Không đổi: hai bộ luật này đã quét Java |
| Skill của `be-dev` | `nestjs-best-practices` | `java-springboot` của `github/awesome-copilot` (21,9 nghìn lượt cài trên skills.sh), và `api-conventions`. Mình đọc skill trước khi chép, ghim theo commit, theo tám nguyên tắc của concern 4. Không đạt thì chỉ dùng `api-conventions` |

**Loại trừ coverage theo app.** Kit đòi mọi file nguồn bị đổi phải có trong báo cáo coverage. Template loại `config/**`, `dto/**` khỏi JaCoCo, nên PR đổi một DTO sẽ đỏ. Template Next.js của B2 gặp đúng chuyện này với `src/app/**`. Cách sửa:
- `project.yaml` có thêm `apps.<app>.coverage_exclude`, danh sách glob tính từ thư mục app;
- `coverage-diff` bỏ qua file khớp danh sách này;
- `project.yaml` nằm trong `.ai-orchestrator/`, là đường dẫn được bảo vệ. Vì vậy agent không tự nới danh sách được: mọi thay đổi do bạn đọc và merge.

### 2.4 PostgreSQL và migration

**Trên máy:** `docker-compose.yml` và `docker/postgres/init` của template, với `apps/api/.env` của bạn. Script `dev` bật Postgres trước app. Dữ liệu nằm trong volume của compose.

**Trong CI:** Testcontainers của test tự bật Postgres, không cần service.

**Trên VPS:** `deploy.yaml` thêm khóa `database`, một database cho mỗi dự án:

```yaml
database:
  image: postgres:17-alpine@sha256:d3244e8ce3f165ee3c93d9c4a4b1d0fe48b3a89e2287b717fdcbbde92d405065
  init: apps/api/docker/postgres/init   # chạy một lần, khi volume còn trống
  memory: 256m
```

- **Container:** deployer giữ một container Postgres cho mỗi dự án và môi trường, tên `ao-<dự án>-<môi trường>-db`, với volume cùng tên. Container có alias `db` trên mạng của môi trường, không mở cổng ra ngoài, chạy bằng user `postgres`, với `--cap-drop ALL` và `no-new-privileges` như container app, cùng trần RAM.
- **Vòng đời:** deployer tạo container khi chưa có, trước khi deploy app. Deploy hay rollback app không bao giờ thay hay xóa container này. Đổi bản Postgres là việc tay, có hướng dẫn trong `docs/vps-setup.md`.
- **Biến:**
  - app đọc từ `<môi trường>.env`, như hiện nay: `DB_HOST=db`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`;
  - container database đọc từ file riêng, `<môi trường>.db.env`: mật khẩu superuser và `APP_DB_*` cho script init.

  Hai file tách nhau vì cùng tên `POSTGRES_PASSWORD` mang hai giá trị: mật khẩu của app và mật khẩu superuser. Claude sinh mật khẩu ngay trên VPS, như `AUTH_SECRET` ở T24 của B2.
- **Migration:** Flyway chạy khi `api` khởi động, như template đã đặt. Deployer chạy container mới cạnh container cũ rồi mới đổi, nên trong lúc đổi, bản cũ chạy trên schema mới. Rollback cũng không lùi schema. Vì vậy có thêm một luật: **migration phải chạy được với bản trước đó** (expand/contract). Thêm bảng hay cột trước; xóa hay đổi tên ở một release sau. Luật này vào prompt của `be-dev`, `sa`, `reviewer`, và vào `docs/release-workflow.md`.
- **Backup:**
  - timer `ao-backup` chạy `pg_dump -Fc` mỗi ngày cho mọi môi trường có database, ra `/var/backups/ao/<dự án>/<môi trường>/`;
  - file chỉ root đọc được (0600). Mỗi môi trường giữ 7 bản ngày và 4 bản tuần;
  - lệnh khôi phục được thử thật ở phần 3, trên Development: khôi phục vào một container tạm, rồi so số bảng và số dòng.

  Bản sao ra ngoài VPS là câu 2, mục 9.

### 2.5 Deployer và RAM

`deploy.yaml` thêm ba khóa cho mỗi app, đều không bắt buộc:

| Khóa | Nghĩa | Mặc định |
|---|---|---|
| `context` | Thư mục build, tính từ gốc repo. Dockerfile của template Java build từ thư mục của app | Gốc repo, như hiện nay |
| `memory` | Trần RAM của container (`--memory`, và `--memory-swap` bằng nó) | `512m`. Container của `ao-sample`, `ao-pilot` và `shop` hiện dùng 11–87 MiB |
| `start_timeout` | Số giây smoke test chờ app trả lời | 60, như hiện nay; tối đa 300. `api` đặt 180, vì Spring Boot và Flyway khởi động chậm trên VPS 2 core |

- Container database cũng có trần RAM (2.4).
- Lúc đổi bản, container cũ và mới chạy cùng lúc. Với `api`, hai JVM cùng chạy trong vài chục giây, nên đỉnh RAM bằng hai lần trần của `api`.
- **Build cache:** Maven trong Dockerfile dùng cache mount (`/root/.m2`), nằm trong build cache của BuildKit. Mốc `PRUNE_CACHE` 4 GB hiện có đã dọn phần này. Phần 3 đo đĩa sau vài lượt build, và chỉ hạ mốc khi đĩa thiếu.

**Đo RAM**, bằng lệnh chỉ đọc (`free -m`, `docker stats --no-stream`):
- trước khi thêm `api`;
- lúc build `api` trên VPS: lấy mẫu mỗi vài giây để thấy đỉnh;
- sau khi `api` và Postgres chạy trên Development, lúc rảnh và lúc đổi bản;
- rồi ước cho ba môi trường, kèm đề xuất giữ hay nâng VPS.

**Ước trước** [Ước]: một JVM của `api` rảnh khoảng 250–400 MB, Postgres khoảng 30–80 MB. Ba môi trường cộng thêm khoảng 1–1,5 GB, cộng Staging và Production của `user`, `admin` khoảng 150 MB. VPS hiện còn 2.794 MB.

### 2.6 Việc kit mà B2 để lại

| Việc | Cách làm |
|---|---|
| `doctor` kiểm App `ao-deploy` | Login `gh` của bạn không đọc được danh sách bản cài của App: GitHub trả 403 (đã thử ngày 2026-11-14). Vì vậy `doctor` có một dòng hỏi, như dòng VPS, kèm đường bấm để kiểm. `baseline` trên VPS vẫn báo `App … is not installed` |
| `setup jira` gặp lỗi mạng | Bắt `ENOTFOUND`, `ECONNRESET` và timeout; in "chạy lại lệnh", không in stack trace |
| Stack `nextjs` ghi `health: /` | `add` đọc cấu hình next-intl. Có `localePrefix: 'always'` thì ghi `/<defaultLocale>` cho `health` và smoke test; không đọc được thì báo |
| `coverage.exclude` chỉ khớp ở gốc repo | `e2e/**` và `scripts/**` khớp cả `apps/*/e2e/**` và `apps/*/scripts/**` |
| Luật "file đổi phải có trong báo cáo coverage" đụng loại trừ của template | `coverage_exclude` theo app (2.3) |
| Script của kit chạy ngoài thư mục dự án thiếu biến `AO_*` | `ao-pr.mjs` đọc `AO_*` từ `.claude/settings.json` của repo nó chạy, như `ao-step` đã làm |

**`/ao-preview` cho pnpm** chưa chạy thật ở B2 (tiêu chí 3 của B2). Phần 3 chạy nó trên PR sửa code `api` (tiêu chí 3), với cả ba app và Postgres.

### 2.7 Hướng dẫn

- `docs/getting-started.md`, phần 5: thêm bước "API Spring Boot và database", theo đầu ra thật của `shop`: JDK, Docker, `add api`, `.env` trên máy, chỗ code phải sửa, secret và database trên VPS, backup.
- `docs/vps-setup.md`: database của dự án, backup, khôi phục, đổi bản Postgres.
- `docs/release-workflow.md`: database và luật migration chạy được với bản trước.
- `docs/quality-gates.md`: JaCoCo, `osv-scanner`, dòng tắt check và path security của Java.

## 3. Lệnh

```
node <kit>/scripts/ao-kit.mjs add <dir> <app> --stack spring-boot --from <template> [--ref <nhánh hay tag>] [--exclude <đường dẫn>]...
node .ai-orchestrator/scripts/mvnw.mjs <dir của app> <lint|typecheck|test:coverage|build|dev>
```

Trên VPS, script mới của deployer: `ao-backup.mjs run` (timer gọi) và `ao-backup.mjs restore-check <dự án> <môi trường>`. Các lệnh khác giữ nguyên tên.

## 4. Ngoài phạm vi

- Gradle; khung Spring Boot không cần template (giả định 1, 2).
- Staging và Production của `shop` (câu 1, mục 9).
- Đăng nhập của `admin` và bảo vệ API: việc của app, làm trong B4 trước bản release đầu.
- Tự đổi bản Postgres, nhân bản database, kết nối qua pool như PgBouncer.
- Nâng VPS: phần 3 chỉ đề xuất, theo số đo.
- .NET (D1).

## 5. Cấu trúc

```text
profiles/stacks/spring-boot/     stack.yaml, package.json mẫu của app Java, luật báo chỗ code phải đổi
scripts/mvnw.mjs                 chạy Maven wrapper của app, chọn JDK, bật Postgres cho dev
lib/quality/maven.mjs            tham số của từng script, tìm JDK, đọc <java.version>
lib/quality/coverage.mjs         thêm đọc JaCoCo XML; coverage_exclude theo app
lib/quality/policy.mjs           thêm kết quả osv-scanner
quality/gates.yaml               nguồn và báo cáo coverage của Java; dòng tắt check; path security của Java
lib/scaffold/add.mjs, template.mjs, app-report.mjs   stack spring-boot; next-intl
lib/scaffold/project.schema.json, project-config.mjs coverage_exclude
lib/scaffold/doctor.mjs          JDK, Docker, câu hỏi về ao-deploy
lib/scaffold/setup-jira.mjs      lỗi mạng
lib/release/deploy.schema.json, deploy-config.mjs    context, memory, start_timeout, database
lib/release/docker.mjs, deployer.mjs, smoke.mjs      build context, trần RAM, container database, thời gian chờ
scripts/ao-backup.mjs, lib/release/backup.mjs, vps/ao-backup.{service,timer}
kit/.github/workflows/ci.yml     setup-java; osv-scanner trong policy
scripts/ao-pr.mjs                biến AO_* từ .claude/settings.json
agents/prompts/be-dev.md, sa.md, reviewer.md         luật migration
docs/getting-started.md, docs/vps-setup.md, docs/release-workflow.md, docs/quality-gates.md
tests/                           test của từng phần trên
```

## 6. Chiến lược test

`node:test`, hàm thuần, effect truyền vào, như hai phần trước.
- **`mvnw.mjs`:** tham số đúng cho Windows (`cmd.exe /d /s /c` với đường dẫn đầy đủ của `mvnw.cmd`) và Linux; chỉ nhận tên script đã biết; chọn JDK theo `pom.xml`; đọc `.env`.
- **`add --stack spring-boot`:** trên thư mục tạm thật, với template Java giả có `.githooks/`, `.github/`, `.claude/`, `prompt.md`, `docs/coding-conventions/`. Kiểm: danh sách file bỏ, `package.json` của app, `project.yaml`, `deploy.yaml`, `roster.local.yaml`, các dòng báo; chạy lại không đổi gì.
- **Coverage:** báo cáo JaCoCo mẫu; dòng đổi được tính đúng; `coverage_exclude`; luật cũ của lcov không đổi.
- **`osv-scanner`:** kết quả JSON mẫu; ngưỡng `high`; ngoại lệ còn hạn và hết hạn.
- **Dòng tắt check:** mỗi mẫu Java, có và không có `reason:`.
- **`deploy.yaml`:** `context`, `memory`, `start_timeout`, `database` đúng và sai; `context` và `init` phải nằm trong repo.
- **Deployer:**
  - tham số `docker run` có trần RAM;
  - container database chạy bằng user `postgres`, không mở cổng, và có nhãn riêng, nên deploy và rollback không bao giờ dừng nó;
  - tạo database chỉ khi chưa có; Caddyfile của `ao-sample` và `ao-pilot` giống hệt bản cũ.
- **Backup:** chọn bản giữ lại (7 ngày, 4 tuần) là hàm thuần; tham số của `pg_dump` và lệnh khôi phục.
- **`doctor`, `setup jira`, `ao-pr`:** các dòng và lỗi mới.
- **CI:** chạy các bước của `build-test` bằng bash, với repo có và không có `apps/*/pom.xml`, như test hiện có của `ci.yml`.

## 7. Tiêu chí hoàn thành

1. Năm lệnh kiểm của kit xanh, cùng `profiles:check`.
2. **`apps/api` của `shop`** được thêm bằng `ao-kit add` từ template Java (nhánh `codebase`). CI trên `develop` xanh, gồm lint, compile, test với Testcontainers, coverage từ JaCoCo và `osv-scanner`. `doctor` đạt mọi dòng.
3. **Các sửa code `api` mà `add` báo** đi qua một Task và một PR không sửa kit. `/ao-preview` chạy được `user`, `admin`, `api` và Postgres của PR đó trên máy bạn. Tiêu chí này cũng đóng phần còn thiếu của tiêu chí 3 ở B2.
4. **Development của `shop` chạy `api` và Postgres:** smoke test đạt; `https://shop-admin-dev.ao.t2g.io.vn/api/v1/health` trả 200 qua Caddy của `admin`; Flyway chạy đủ migration. `ao-sample` và `ao-pilot` không đổi, và vẫn chạy.
5. **Backup** chạy theo lịch, và một lần khôi phục thật thành công.
6. **Số đo RAM** lúc rảnh, lúc build và lúc đổi bản, cùng ước cho ba môi trường và đề xuất về VPS.
7. Hướng dẫn có phần mới, với số liệu và đầu ra thật. Kit merge vào `main` qua PR, CI xanh.

## 8. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| VPS thiếu RAM: hai JVM lúc đổi bản, cộng build Maven trên VPS | Trần RAM cho mỗi container; swap 4 GB đã có; đo lúc build và lúc đổi bản trước khi thêm môi trường nào |
| Spring Boot khởi động quá 60 giây, smoke test đánh hỏng một lần deploy tốt | `start_timeout` theo app |
| Migration không chạy được với bản trước, làm hỏng bản cũ lúc đổi bản hay rollback | Luật expand/contract trong prompt và review; `clean-disabled: true` giữ nguyên |
| Postgres không khởi động với `--cap-drop ALL` | Chạy bằng user `postgres` trên volume mới (volume mới mang quyền của thư mục trong image). Thử ngay ở task đầu, trước khi viết deployer |
| `osv-scanner` không đọc đủ dependency bắc cầu của Maven | Thử ở task đầu trên `pom.xml` của template. Không đủ thì dùng `mvn dependency:tree` rồi hỏi API của OSV, hoặc OWASP dependency-check |
| `mvnw.cmd` trên Windows cần `cmd.exe` | Tham số cố định, chỉ tên script đã biết; có test |
| Docker Desktop chưa chạy khi test hay xem trước | `doctor` và `ao-step` báo rõ; mình bật Docker khi một bước cần, rồi tắt sau đó |
| Backup chứa dữ liệu người dùng | Chỉ root đọc được; không rời VPS cho tới khi bạn chọn chỗ (câu 2) |
| `.claude/` của template có 1.943 file | `add` bỏ cả thư mục và in số file đã bỏ |

## 9. Câu hỏi đã trả lời

Ở Lượt 7, bạn duyệt cả ba đề xuất.


1. **Staging và Production của `shop`:** mình đề xuất phần 3 chỉ deploy Development, đo RAM, rồi ước cho ba môi trường. Staging và Production lên cùng bản release đầu ở B4, vì trước đó `admin` cần đăng nhập thật, và backup cần chỗ ngoài VPS.
2. **Bản sao backup ngoài VPS:** mình đề xuất phần 3 chỉ giữ backup trên VPS và thử khôi phục thật. Chỗ để bản sao chọn trước bản release đầu (B4), giữa ba cách:
   - máy bạn kéo về mỗi tuần bằng `scp`;
   - Google Drive qua `rclone`, với token chỉ ghi được file nó tạo;
   - snapshot của nhà cung cấp VPS.
3. **Kiểm thật bằng agent:** mình đề xuất phần 3 tốn 0 USD agent. Task sửa code `api` do phiên chính làm, như `SHOP-1` ở B2. `be-dev` chạy Java lần đầu ở Epic đầu của B4. Cách khác: một Task nhỏ cho `be-dev` ngay ở phần 3, khoảng 8–15 USD [Ước] gồm cả review.

Câu 4 của bản nháp đầu (cài JDK 21) đã bỏ ở Lượt 5: máy bạn có sẵn JDK 21 ở `C:\opt\jdk-21`.

## Nguồn

- [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md), hàng B3, B4; Lượt 199–200 của Phiên 27 trong [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md).
- [SPEC-project-scaffold.md](SPEC-project-scaffold.md) mục 4; [SPEC-project-scaffold-2.md](SPEC-project-scaffold-2.md) mục 4 và 8.
- [tasks/archive/project-scaffold-2/verification.md](tasks/archive/project-scaffold-2/verification.md), mục T23, T24, T26.
- Mã kit: `lib/release/docker.mjs` (`runArgs`, `swap`, `PRUNE_CACHE`), `lib/release/smoke.mjs` (chờ 60 giây), `lib/release/deploy.schema.json`, `lib/quality/coverage.mjs`, `quality/gates.yaml`, `kit/.github/workflows/ci.yml`, `profiles/stacks/react/files/Caddyfile`.
- Template Java của bạn, nhánh `codebase` (`0a0ccac`): `pom.xml`, `application.yml`, `Dockerfile`, `docker-compose.yml`, `docker/postgres/init/00-load-env.sh`, `.github/workflows/ci.yml`.
- skills.sh: `github/awesome-copilot@java-springboot`.

# Task: project-scaffold, phần 3 (B3)

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-project-scaffold-3.md](../SPEC-project-scaffold-3.md). Làm theo thứ tự. Mỗi task viết test đỏ trước.

**Quy ước:**
- Xong mỗi task thì năm lệnh kiểm phải xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`. Task đụng `profiles/` hay `lib/scaffold/` thì chạy thêm `npm run profiles:check`.
- Mỗi chặng code một nhánh `task/scaffold3-<N>` tách từ `main`, mỗi task một commit. Merge qua PR khi CI xanh.
- Commit theo `CLAUDE.md`.
- Task có nhãn **[bạn]** cần bạn bấm, hoặc cần bạn mở VPS.

## Chuẩn bị

- [x] **T1: tài liệu.** Spec ghi đã duyệt; plan, todo; nhật ký Phiên 28 · Lượt 1–6. PR tài liệu từ nhánh `task/project-scaffold-3`, tự merge khi CI xanh.
- [x] **T2: tiền đề** (spec mục 8; plan, rủi ro). Mình bật Docker Desktop, rồi tắt khi xong. Không commit code; kết quả ghi vào `verification.md`:
  1. `./mvnw -B -ntp verify` của template (nhánh `codebase`) với JDK `C:\opt\jdk-21`: thời gian, số test, có `target/site/jacoco/jacoco.xml` không;
  2. `osv-scanner` (bản ghim) trên `pom.xml` của template: định dạng JSON; số dependency nó thấy, so với `mvnw dependency:tree`;
  3. `postgres:17-alpine` chạy với `--user postgres`, `--cap-drop ALL`, `--security-opt no-new-privileges`, trên volume mới, với script init của template: khởi động được không, RAM lúc rảnh;
  4. image của template, build từ thư mục app, chạy với `--memory 768m`, `--cap-drop ALL`, nối tới Postgres ở bước 3: thời gian tới khi `/actuator/health` trả 200, RAM lúc rảnh;
  5. skill `java-springboot` của `github/awesome-copilot`: đọc toàn bộ, quyết dùng hay không theo tám nguyên tắc của concern 4, và ghi commit sẽ ghim.

  - **Đạt khi:** cả năm mục có kết quả. Mục nào sai với spec thì sửa spec trước chặng 1.

### Checkpoint 1: sau T2
- [x] Năm tiền đề đạt (Phiên 28 · Lượt 7). Spec sửa ba chỗ: đường dẫn đầy đủ của `mvnw.cmd`, `osv-scanner --data-source native` bản v2.7.0, luật báo comment cuối dòng của `.dockerignore`; digest của Postgres.

## Chặng 1: Maven trong workspace pnpm, nhánh `task/scaffold3-1`

- [x] **T3: `maven.mjs` và `mvnw.mjs`** (spec 2.2; plan, quyết định 3, 4). Wrapper gọi bằng `.\mvnw.cmd` trong thư mục app.
  - **Đạt khi:**
    - `lib/quality/maven.mjs` trả về tham số Maven cho `lint` (`validate`), `typecheck` (`compile`, bỏ hai bước lint), `test:coverage` (`verify`), `build` (`package -DskipTests`), `dev` (`spring-boot:run`); luôn có `-B -ntp`; tên script lạ thì báo lỗi;
    - cách gọi wrapper: `./mvnw` trên Linux và macOS, không qua shell; `cmd.exe /d /s /c <đường dẫn đầy đủ>\mvnw.cmd` trên Windows, vì `NoDefaultCurrentDirectoryInExePath=1` (T2);
    - đọc `<java.version>` của `pom.xml`, cả khi nó nằm trong `<properties>`;
    - chọn JDK theo thứ tự của spec 2.2: `JAVA_HOME` khớp bản, `JAVA_HOME_<bản>`, JDK cạnh `JAVA_HOME`, thư mục cài thường gặp; đọc bản của JDK từ file `release` của nó, không chạy `java`; không thấy thì báo bản cần cài;
    - `dev`: đọc `.env` của app (không in giá trị), chạy `docker compose up -d --wait` khi app có `docker-compose.yml`, rồi chạy Maven với `PORT`;
    - `scripts/mvnw.mjs <dir của app> <script>` chỉ ghép tham số và gọi lib.
  - **Kiểm:** `tests/quality/maven.test.mjs`: tham số từng script trên hai hệ điều hành, chọn JDK với cây thư mục giả, `.env`, lỗi khi thiếu JDK.
  - **File:** `lib/quality/maven.mjs`, `scripts/mvnw.mjs`, test; `quality/gates.yaml` (`mvnw.mjs` vào danh sách script chép vào dự án), `lib/scaffold/install.mjs` nếu cần.
- [x] **T4: stack `spring-boot` và `add`** (spec 2.1). Làm sớm ở đây phần schema của T12: `deploy.yaml` nhận `context`, `memory`, `start_timeout`, vì `add` ghi ba khóa này.
  - **Đạt khi:**
    - `profiles/stacks/spring-boot/stack.yaml`: `profile: spring-boot`, cổng 3001, `health: /actuator/health`, `dev_role: be-dev`, `package.json` mẫu của app Java;
    - `add --stack spring-boot` không có `--from` thì dừng, và nói cần template;
    - bỏ `.githooks/`, `.github/`, `.claude/` của template, in số file bỏ; giữ `.mvn/`, `mvnw`, `mvnw.cmd`, `docker-compose.yml`, `docker/`, `Dockerfile`, `.env.example`;
    - viết `apps/<app>/package.json` (`private: true`, không dependency, năm script gọi `mvnw.mjs`); `pnpm install` nhận app đó;
    - skill `<app>-conventions` trỏ tới `docs/coding-conventions/` của app khi template không có `CLAUDE.md`;
    - `project.yaml`: `profile: spring-boot`, `dev: pnpm --filter ./apps/<app> run dev`, cổng `PORT` mặc định 3001, `health: /actuator/health`, không công khai. `deploy.yaml`: app với `context: apps/<app>`. `roster.local.yaml`: skill cho `be-dev`;
    - `app-report` báo: cổng không lấy từ `PORT`; `EXPOSE`, `HEALTHCHECK` khác cổng của app; `SPRING_PROFILES_ACTIVE` đặt cứng trong Dockerfile; JaCoCo không ghi XML;
    - chạy lại không đổi gì.
  - **Kiểm:** `tests/scaffold/add.test.mjs` thêm ca Java, trên thư mục tạm thật, với template Java giả; thử thật trên template của bạn (nhánh `codebase`) trong thư mục tạm, ghi kết quả vào `verification.md`.
  - **File:** `profiles/stacks/spring-boot/`, `lib/scaffold/add.mjs`, `lib/scaffold/template.mjs`, `lib/scaffold/app-report.mjs`, `lib/scaffold/profile.mjs` (`readStack`), test.
- [x] **T5: CI cho app Java** (spec 2.2).
  - **Đạt khi:** job `build-test` có bước `actions/setup-java` ghim SHA (Temurin, cache Maven) chỉ khi có `apps/*/pom.xml`; bản Java lấy từ `pom.xml` qua `maven.mjs`. Repo không có app Java thì các bước như hiện nay.
  - **Kiểm:** `tests/quality/ci-workflow.test.mjs` chạy các bước bằng bash, với repo có và không có `apps/*/pom.xml`.
  - **File:** `kit/.github/workflows/ci.yml`, `scripts/ci-package-manager.mjs` hoặc script mới in bản Java, test.
- [x] **T6: `doctor` và `ao-step`** (spec 2.2, 2.6).
  - **Đạt khi:**
    - dự án có app Java: `doctor` có dòng JDK đúng bản của `pom.xml` (theo cách chọn của T3), và dòng Docker đang chạy;
    - `doctor` có dòng hỏi "App `ao-deploy` đã cài vào repo chưa", kèm đường bấm, như dòng VPS;
    - `ao-step` dừng trước lượt `be-dev` của dự án có app Java khi Docker chưa chạy, và nói cách bật. `qa` kiểm trên môi trường đã deploy, nên không cần Docker (spec 2.2 sửa theo).
  - **Kiểm:** test của `doctor` và `steps` với effect giả; dự án không có Java không có dòng mới.
  - **File:** `lib/scaffold/doctor.mjs`, `lib/workflow/steps.mjs`, `scripts/ao-step.mjs`, test.
- [x] **T7: tài liệu chặng 1; PR.** `docs/quality-gates.md` (app Java trong CI), `README.md` (cây thư mục, lệnh `add`), comment đầu file; PR chặng 1.

## Chặng 2: cổng chất lượng cho Java, nhánh `task/scaffold3-2`

- [x] **T8: coverage** (spec 2.3, 2.6).
  - **Đạt khi:**
    - `lib/quality/coverage.mjs` đọc báo cáo XML của JaCoCo: mỗi `sourcefile` của mỗi `package` thành `apps/<app>/src/main/java/<package>/<file>`, dòng có lệnh đã chạy (`ci > 0`) là đã phủ;
    - `gates.yaml`: nguồn thêm `**/src/main/java/**/*.java`; báo cáo thêm `apps/*/target/site/jacoco/jacoco.xml`; `e2e/**`, `scripts/**` khớp cả dưới `apps/*/`;
    - `project.yaml` có `apps.<app>.coverage_exclude` (glob tính từ thư mục app); `coverage-diff` bỏ qua file khớp; `ao-kit check` kiểm dạng của trường này;
    - luật lcov hiện có không đổi.
  - **Kiểm:** báo cáo JaCoCo mẫu lấy từ T2; ca `coverage_exclude`; test lcov cũ vẫn xanh.
  - **File:** `lib/quality/coverage.mjs`, `scripts/coverage-diff.mjs`, `quality/gates.yaml`, `lib/scaffold/project.schema.json`, `lib/scaffold/project-config.mjs`, fixture, test.
- [x] **T9: `osv-scanner`** (spec 2.3).
  - **Đạt khi:** job `policy` cài `osv-scanner` bản ghim, kiểm SHA-256, chạy trên `apps/*/pom.xml` khi có; `lib/quality/policy.mjs` đọc JSON của nó, áp `audit_level` và ngoại lệ có hạn như `npm audit`. Repo không có `pom.xml` thì không cài.
  - **Kiểm:** kết quả JSON mẫu từ T2: dưới ngưỡng, trên ngưỡng, ngoại lệ còn hạn và hết hạn.
  - **File:** `kit/.github/workflows/ci.yml`, `scripts/check-policy.mjs`, `lib/quality/policy.mjs`, fixture, test.
- [x] **T10: dòng tắt check, path security, skill** (spec 2.3).
  - **Đạt khi:**
    - `suppressions.patterns` thêm chín mẫu Java của spec 2.3;
    - `security_review.roster_effort_paths` thêm các path Java của spec 2.3;
    - skill `java-springboot` (nếu T2 chọn) chép vào `profiles/stacks/spring-boot/skills/`, ghim commit; stack khai skill này và `<app>-conventions` cho `be-dev`.
  - **Kiểm:** test của `suppressions` cho từng mẫu, có và không có `reason:`; test của effort với path Java; `npm run agents:check`.
  - **File:** `quality/gates.yaml`, `profiles/stacks/spring-boot/`, test.
- [x] **T11: luật migration; PR** (spec 2.4).
  - **Đạt khi:** prompt của `be-dev`, `sa`, `reviewer` có luật "migration phải chạy được với bản trước" (expand/contract) cho dự án có database; `docs/release-workflow.md` có mục database và luật này; agent sinh lại.
  - **Kiểm:** `npm run agents:check`; test của prompt nếu có.
  - **File:** `agents/prompts/be-dev.md`, `sa.md`, `reviewer.md`, `kit/.claude/agents/` (sinh lại), `docs/release-workflow.md`, `docs/quality-gates.md`; PR chặng 2.

### Checkpoint 2: sau T7 và T11
- [x] Hai PR merge, CI xanh. Năm lệnh kiểm xanh; dự án không có Java không đổi hành vi. Kit PR #270 (`f29a873`) và PR của chặng 2.

## Chặng 3: deployer và database, nhánh `task/scaffold3-3`

- [x] **T12: `deploy.yaml`** (spec 2.4, 2.5).
  - **Đạt khi:** (`context`, `memory`, `start_timeout` đã có từ T4) schema và `deploy-config.mjs` nhận `database` (`image` có digest, `init`, `memory`); `context` và `init` phải nằm trong repo; `ao-kit check` đối chiếu như hiện nay.
  - **Kiểm:** fixture đúng và sai; `deploy.yaml` của `ao-sample` và `ao-pilot` vẫn hợp lệ.
  - **File:** `lib/release/deploy.schema.json`, `lib/release/deploy-config.mjs`, fixture, test.
- [x] **T13: build context, trần RAM, thời gian chờ** (spec 2.5).
  - **Đạt khi:** `buildArgs` dùng `context` khi có; `runArgs` có `--memory` và `--memory-swap` (mặc định `512m`); `swap` truyền `start_timeout` cho smoke test.
  - **Kiểm:** test tham số docker; Caddyfile của cấu hình một app công khai giống hệt chữ bản cũ.
  - **File:** `lib/release/docker.mjs`, `lib/release/smoke.mjs`, `lib/release/deployer.mjs`, test.
- [x] **T14: container database** (spec 2.4; plan, quyết định 5, 6).
  - **Đạt khi:**
    - deployer tạo `ao-<dự án>-<môi trường>-db` khi chưa có, trước khi deploy app: volume cùng tên, alias `db`, `--user postgres`, `--cap-drop ALL`, `no-new-privileges`, trần RAM, không mở cổng, nhãn `ao.role=database`;
    - biến của container lấy từ `/etc/ao/secrets/<dự án>/<môi trường>.db.env`; thiếu file thì không deploy, và ghi lý do;
    - script init chép từ commit đang deploy, chỉ khi volume còn trống;
    - `swap`, rollback và dọn image không đụng tới container này.
  - **Kiểm:** test với docker giả: tạo một lần, lần sau không tạo lại; deploy và rollback không dừng database; thiếu file biến thì từ chối.
  - **File:** `lib/release/database.mjs`, `lib/release/docker.mjs`, `lib/release/deployer.mjs`, test.
- [x] **T15: backup** (spec 2.4; plan, quyết định 8).
  - **Đạt khi:** `scripts/ao-backup.mjs run` dump mọi database đang chạy bằng `pg_dump -Fc` vào `/var/backups/ao/<dự án>/<môi trường>/`, quyền 0600; giữ 7 bản ngày và 4 bản tuần; `restore-check <dự án> <môi trường>` khôi phục bản mới nhất vào container tạm và in số bảng, số dòng; `vps/ao-backup.service` và `.timer`.
  - **Kiểm:** hàm chọn bản giữ lại; tham số `pg_dump`, `pg_restore`; không có giá trị bí mật trong tham số.
  - **File:** `scripts/ao-backup.mjs`, `lib/release/backup.mjs`, `vps/ao-backup.service`, `vps/ao-backup.timer`, test.
- [x] **T16: tài liệu chặng 3; PR.** `docs/vps-setup.md` (database của dự án, backup, khôi phục, đổi bản Postgres; mục 13 thêm file `.db.env`), `docs/release-workflow.md`, `vps/deployer.example.yaml`; PR chặng 3.

## Chặng 4: việc B2 để lại, nhánh `task/scaffold3-4`

- [x] **T17: ba việc nhỏ; PR** (spec 2.6).
  - **Đạt khi:**
    - `setup jira` bắt `ENOTFOUND`, `ECONNRESET` và timeout, in "chạy lại lệnh", không in stack trace;
    - `ao-pr.mjs` đọc `AO_*` từ `.claude/settings.json` của repo khi biến môi trường thiếu, như `ao-step`;
    - `add --stack nextjs` đọc cấu hình next-intl: có `localePrefix: 'always'` thì ghi `/<defaultLocale>` cho `health` và smoke test; không đọc được thì báo.
  - **Kiểm:** test của từng việc; test cũ không đổi.
  - **File:** `lib/scaffold/setup-jira.mjs`, `scripts/ao-pr.mjs` hoặc `lib/quality/github-app.mjs`, `lib/scaffold/add.mjs`, `lib/scaffold/app-report.mjs`, test; PR chặng 4.

### Checkpoint 3: sau T16 và T17
- [ ] Hai PR merge, CI xanh. Caddyfile của `ao-sample` và `ao-pilot` giống hệt bản cũ.

## Chặng 5: kiểm thật và hướng dẫn

- [ ] **T18: bản nháp của hướng dẫn** (spec 2.7). Phần 5 của `getting-started.md` thêm bước "API Spring Boot và database". Đi cùng PR của T23.
- [ ] **T19 [bạn]: VPS.** Bạn mở VPS; mình:
  1. đo RAM bằng lệnh chỉ đọc;
  2. cập nhật kit trên VPS lên bản có chặng 3, giữ bản cũ ở `/opt/ao/kit.prev`;
  3. chạy `tick --dry-run`: Caddyfile không đổi;
  4. bật lại deployer. VPS để mở cho tới khi bạn bảo đóng (Phiên 29 · Lượt 1).
  - **Kiểm:** ghi vào `verification.md`, không ghi nội dung file có thông tin đăng nhập.
- [ ] **T20 [bạn]: `shop` có `api`** (tiêu chí 2). Theo bản nháp:
  1. Task chép kit B3, `ao-kit sync`, PR; bạn merge;
  2. Task thêm `api`: `add api --stack spring-boot --from <template Java> --ref codebase --exclude study-guide-impl/ --exclude prompt.md`, PR; bạn merge;
  3. CI xanh trên `develop`; `doctor` đạt mọi dòng.
  - **Kiểm:** chỗ hướng dẫn sai hay thiếu thì sửa hướng dẫn trước khi đi tiếp.
- [ ] **T21 [bạn]: sửa code `api`** (tiêu chí 3). Task cho các chỗ `add` báo; phiên chính sửa trên nhánh của Task, mở PR không đụng `.ai-orchestrator/`; `/ao-preview` chạy `user`, `admin`, `api` và Postgres; bạn xem rồi merge; Task được Cancel, kèm comment trỏ tới PR.
- [ ] **T22 [bạn]: Development có `api` và Postgres** (tiêu chí 4, 5, 6). Bạn mở VPS; mình:
  1. sinh mật khẩu database và ghi `development.env`, `development.db.env`;
  2. gỡ chặn của `audit` bằng `/ao-rollback development <sha>` nếu cần;
  3. deploy: smoke test đạt; `/api/v1/health` qua host của `admin` trả 200; Flyway chạy đủ migration;
  4. đo RAM lúc build, lúc rảnh, lúc đổi bản; ước cho ba môi trường;
  5. cài timer backup, chạy một lần, rồi `restore-check`; thử khôi phục vào database đang chạy (mục 15, bước 4 của `docs/vps-setup.md`, chưa chạy thật ở T16);
  6. `ao-sample` và `ao-pilot` vẫn chạy. VPS để mở cho tới khi bạn bảo đóng.
- [ ] **T23: bản cuối của hướng dẫn; PR** (tiêu chí 7). Chép đầu ra thật của T19–T22.

### Checkpoint 4: sau T23
- [ ] Tiêu chí 2–7 của spec đạt.

- [ ] **T24: đóng module.** Bảng bảy tiêu chí trong `verification.md`; dời plan, todo, verification vào `tasks/archive/project-scaffold-3/`; cập nhật `SPEC.md`, spec và `concerns.md`; PR tài liệu.

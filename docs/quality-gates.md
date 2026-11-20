# Quality gates

> **Spec:** [SPEC-quality-gates.md](../SPEC-quality-gates.md). Tài liệu này dành cho bạn: mỗi cổng kiểm gì, đọc kết quả ở đâu, làm gì khi cổng đỏ, và khi nào bạn phải tự merge.

## Bốn lớp chốt

Repo private ở gói Free không có branch protection, nên GitHub không chặn được merge hay push. Kit vì vậy chốt cổng ở bốn lớp:

| Lớp | Chạy ở đâu | Bỏ qua được không |
|---|---|---|
| Hook git: `pre-commit`, `commit-msg`, `pre-push` | Máy chạy `git` | Được, bằng `--no-verify`. `gh-guard` chặn agent dùng cờ này, và `CI` kiểm lại quy ước |
| Hook `gh-guard` của Claude Code | Máy chạy agent | Hook đọc lệnh theo mẫu, nên không kín hoàn toàn |
| Workflow `CI` và `merge-gate` | GitHub Actions | `merge-gate` chạy bằng bản trên nhánh mặc định, nên PR không sửa được nó |
| `audit`, trước mỗi lần deploy | GitHub Actions | Nút Merge vẫn bấm được, nhưng commit không qua đủ cổng thì không được deploy |

Repo hỗ trợ ruleset (repo public, hoặc gói Pro trở lên) thì có thêm một lớp: xem mục [Ruleset](#ruleset).

## Vòng của một PR

1. Dev agent đẩy nhánh `feature/<KEY>-<slug>`, `bugfix/…` hoặc `hotfix/…`, rồi mở PR bằng `ao-pr.mjs create`. PR đứng tên bot của App `ao-dev`.
2. `CI` chạy bốn check. Mỗi lần `CI` chạy xong, `jira-sync` đối soát item Jira, rồi `merge-gate` xem PR đã đủ điều kiện chưa.
3. `reviewer` và `security` đọc PR, rồi đăng báo cáo bằng `ao-pr.mjs review`, dưới tên bot của App `ao-review`. Báo cáo còn finding Critical hoặc High là một yêu cầu sửa, và `jira-sync` đưa item về In Progress.
4. Agent sửa rồi push. Mỗi lần push tạo một commit đầu mới, nên `CI`, hai báo cáo và approve của bạn phải có lại trên commit đó.
5. Bạn đọc PR và approve. Agent không approve; GitHub cũng không cho tác giả PR approve PR của chính mình.
6. `merge-gate` squash merge khoảng nửa phút đến một phút sau khi PR đủ điều kiện. Commit squash có tiêu đề đúng bằng tiêu đề PR.
7. Push vào `develop` chạy `CI` và workflow deploy. Workflow deploy gọi `audit` trước. `audit` xanh thì deploy chạy, và `jira-sync` chuyển item sang Ready for QA.

## Hook git

Trong repo dự án, `npm install` gọi script `prepare`, và script này cài hook (`git config core.hooksPath .githooks`). Muốn cài lại thì chạy `node .ai-orchestrator/scripts/install-hooks.mjs`.

| Hook | Chặn khi | Cách sửa |
|---|---|---|
| `pre-commit` | secretlint thấy secret trong file đã stage; một dòng đã stage tắt một bước kiểm mà không có `reason: <lý do>` trên cùng dòng (cùng luật Suppressions của job `policy`); hoặc `npm run precommit` của dự án lỗi | Bỏ secret khỏi file, đưa nó vào biến môi trường hoặc secret của GitHub. Nếu đó là secret thật thì thu hồi nó và tạo cái mới. Dòng tắt bước kiểm thì ghi lý do trên cùng dòng, hoặc bỏ nó. Lỗi của `precommit`, thường là lint, thì sửa theo thông báo |
| `commit-msg` | Header không theo `type(scope): subject (<KEY>)`, ví dụ `feat(cart): add a quantity limit (DEMO-6)`. `type` là một trong `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` | Viết lại header, hoặc `git commit --amend` nếu commit đã tạo. Commit merge và commit revert do git tạo thì được cho qua. Commit đầu tiên của repo không cần mã Jira, nhưng vẫn theo `type(scope): subject` |
| `pre-push` | Lần push cập nhật `develop`, `main`, hoặc một nhánh `release/*` đã có | Đẩy lên nhánh làm việc, rồi mở PR. Tạo nhánh `release/*` mới thì được cho qua |

## Bốn check của `CI`

Workflow `CI` chạy trên mọi PR và mỗi lần push lên `develop`, `main`, `release/**`. Mỗi job là một check. Kết quả nằm ở tab **Checks** của PR. Bấm vào một job để xem log của nó, hoặc mở trang **Summary** của lần chạy để xem job summary **(đối chiếu giao diện)**.

### `policy`

Job summary có mục **Policy**. Mỗi dòng là một phần kiểm: ✅ là đạt, ❌ là đỏ, kèm lý do.

| Phần | Đỏ khi | Cách sửa |
|---|---|---|
| Conventions | Tên nhánh, header của một commit trong PR, hoặc tiêu đề PR sai quy ước. Nhánh `feature/` chỉ vào `develop`; `bugfix/` vào `develop` hoặc `release/*`; `hotfix/` vào `main` | Sai tên nhánh thì mở PR mới từ nhánh đúng tên. Sai header thì viết lại commit rồi force push lên nhánh của PR. Sai tiêu đề thì sửa bằng `ao-pr.mjs edit` |
| Suppressions | Dòng thêm vào có mẫu tắt kiểm tra (`eslint-disable`, `oxlint-disable`, `@ts-ignore`, `.skip(`, `nosemgrep`, `gitleaks:allow`…; với Java: `@SuppressWarnings`, `NOSONAR`, `@Disabled`, `CHECKSTYLE:OFF`, `spotless:off`, `@SuppressFBWarnings`, `NOPMD`, `@Generated`) mà không ghi `reason: <lý do>` trên cùng dòng; hoặc có `.only(` | Sửa lỗi thay vì tắt kiểm tra. Nếu thật sự phải tắt, ghi `reason:` trên cùng dòng để reviewer đọc. `.only(` luôn đỏ, nên phải xóa |
| Thresholds | PR hạ một ngưỡng trong `quality/gates.yaml`, ví dụ `changed_lines_min` | Trả ngưỡng về như cũ. Hạ ngưỡng là quyết định của bạn, và file này được bảo vệ, nên PR đó do bạn merge |
| Dependencies | `npm audit`, hay `pnpm audit` với dự án pnpm, thấy lỗ hổng high hoặc critical không nằm trong danh sách ngoại lệ còn hạn | Cập nhật dependency. Nếu chưa có bản vá, thêm một ngoại lệ có hạn vào `dependencies.exceptions` của `.ai-orchestrator/project.yaml`, gồm mã advisory, lý do và ngày hết hạn. Từ C1, ngoại lệ của dự án nằm ở đó: lần chép kit không xóa nó, như từng xóa ngoại lệ picomatch của `shop` ở SHOP-74. File này được bảo vệ, nên bạn quyết định và tự merge |
| New dependencies | PR thêm một dependency trực tiếp vào `package.json` hay `pom.xml` mà `dependencies.approved` của `project.yaml` chưa có. Đổi phiên bản của dependency đã có thì không tính | Chạy `dep-check` cho thư viện đó (mục Duyệt thư viện trước khi cài, ngay dưới) |
| Java dependencies | Với mỗi `apps/*/pom.xml`: `osv-scanner` (v2.7.0, ghim và kiểm SHA-256, đọc Maven Central như Maven, gồm dependency bắc cầu) thấy nhóm advisory từ 7,0 điểm CVSS trở lên, ngoài danh sách ngoại lệ còn hạn. Advisory chưa có điểm được tính là high. Trên PR, chỉ quét `pom.xml` của app mà PR có đổi file; lần push lên nhánh gốc quét tất cả. Lần quét lỗi (không tới được Maven Central) được thử lại hai lần, cách 10 giây | Như dòng trên. Ngoại lệ ghi mã GHSA hay CVE của nhóm. Với Spring Boot, thường chỉ cần nâng bản của parent `spring-boot-starter-parent` |

Dòng ℹ️ chỉ để báo, không làm job đỏ. Ví dụ `test file deleted: <file>` nhắc reviewer xem vì sao file test bị xóa. Khi push mà không có PR, `policy` chỉ chạy audit của npm hay pnpm.

### Duyệt thư viện trước khi cài

Từ C1 ([SPEC-c1.md](../SPEC-c1.md) mục 5), một thư viện mới phải được duyệt trước khi cài. Danh sách đã duyệt nằm ở `dependencies.approved` của `.ai-orchestrator/project.yaml`:

```yaml
dependencies:
  approved:
    - { ecosystem: npm, name: zod, range: ^4.6.6, by: dep-check, on: 2026-11-20 }
  exceptions: []
```

- **Kiểm một thư viện:** `node .ai-orchestrator/scripts/dep-check.mjs <npm|maven> <tên>@<phiên bản>`. Lệnh kiểm:
  - lỗ hổng đã biết trên OSV;
  - giấy phép, so với `dependencies.licenses` của `quality/gates.yaml`;
  - tuổi, ít nhất 14 ngày;
  - lượt tải tuần trước và người duy trì (npm);
  - script chạy lúc cài (npm);
  - provenance của npm.

  Không đọc được một phần kiểm nào thì kết quả là đáng ngờ, không bao giờ là đạt.
- **Đạt:** lệnh ghi thư viện vào `approved`, kèm `by: dep-check`. Dev agent cài thư viện và commit dòng đó cùng code. PR đó chạm đường dẫn được bảo vệ, nên bạn là người merge.
- **Đáng ngờ:** lệnh không ghi gì. Dev agent comment `Cần security:` trên item, gắn cờ Needs you và dừng. `/ao-request <KEY>` chạy `security` ở `high` chỉ cho thư viện đó; nó comment đề xuất duyệt hay không. Muốn duyệt, bạn tự thêm dòng vào `approved`.
- **Ở plan:** `plan.md` có mục "New Libraries". Ở gate ②, `/ao-plan` in danh sách đó, và phiên chính chạy `dep-check --dry-run` cho từng thư viện để báo bạn, không ghi gì. Lúc build, dev agent chạy `dep-check` thật.
- **Chặn:**
  - gh-guard từ chối `pnpm add`, `npm install <gói>`, `npm install-test <gói>` (`npm it`), `yarn add`, `yarn global add`, `mvn dependency:get -Dartifact=…` khi gói chưa có trong `approved`, và từ chối cài từ đường dẫn, URL hay git. Cả khi chạy qua `corepack`, như `corepack pnpm add <gói>`;
  - `npm create <x>`, `npm init <x>`, `pnpm create`, `yarn create`, `bun create` tải rồi chạy gói `create-<x>` (`@scope/create-<x>` với tên có scope): gói đó phải có trong `approved`. `npm init` không kèm tên thì được (review lần hai của `shop` PR #79);
  - gh-guard cũng từ chối Edit và Write thêm dependency chưa duyệt vào `pom.xml` hay `package.json`. Với Edit, hook xét cả file sau khi thay `old_string` bằng `new_string`, không chỉ hai đoạn đó; `package.json` không còn là JSON hợp lệ thì bị từ chối;
  - với `pom.xml` (review lần hai của `shop` PR #79): mọi `<dependency>`, kể cả viết có khoảng trắng hay thuộc tính, dependency của plugin, `<plugin>` (không ghi groupId thì là `org.apache.maven.plugins`), `<extension>`, `<parent>` và annotation processor của compiler đều phải được duyệt. Giá trị `${…}` được đọc từ `<properties>` và groupId của dự án; giá trị không đọc được thì bị từ chối. Thêm `<repository>` hay `<pluginRepository>` mới thì bị từ chối: thư viện chỉ lấy từ Maven Central. `mvn -s`, `--settings`, `-gs` cũng bị từ chối, vì file settings có thể đặt mirror;
  - job `policy` đỏ ở phần New dependencies.
  - `pnpm install` và `npm ci` theo lockfile thì luôn được.
- **Tên đã duyệt không mở đường cho nguồn khác** (review của `shop` PR #79). gh-guard và job `policy` từ chối:
  - alias và nguồn ngoài registry, dù tên đã duyệt: `zod@npm:evil-pkg`, `github:`, `git+…`, URL, `file:`, `link:`, đường dẫn. Luật này áp cho cả `overrides`, `pnpm.overrides` và `resolutions` của `package.json`. `workspace:` của pnpm thì được;
  - `catalog:` của pnpm được đọc từ catalog trong `pnpm-workspace.yaml`: tên phải được duyệt và phiên bản ở đó phải nằm trong `range`, như khi ghi thẳng phiên bản. Job `policy` cũng xét `catalog`, `catalogs` và `overrides` của `pnpm-workspace.yaml` khi PR đổi file đó (review lần hai của `shop` PR #79);
  - gói của chính dự án không cần duyệt: với npm, đó là các `package.json` nằm trong `workspaces` của `package.json` gốc; với pnpm, chúng chỉ vào qua `workspace:`. Một `package.json` ở chỗ khác, dù đặt tên gì, không làm tên đó thành gói của dự án;
  - registry khác: `--registry`, `--@scope:registry=`, biến `npm_config_registry`. `.npmrc`, `.yarnrc*`, `bunfig.toml`, `pnpm-workspace.yaml` (catalog, overrides, `allowBuilds`), `.pnpmfile.*` và `.mvn/` ở mọi thư mục là đường dẫn được bảo vệ, nên agent không ghi được;
  - phiên bản ngoài `range` đã duyệt: `pnpm add zod@5.0.0` khi `range` là `^4.6.6`, hay `"zod": "^5.0.0"` trong `package.json`. Phiên bản hay range không kiểm được, như tag `latest`, cũng bị từ chối. Cài không ghi phiên bản (`pnpm add zod`) cũng bị từ chối khi mục đã duyệt có `range`, vì lệnh đó cài bản mới nhất mà dep-check chưa đọc: ghi phiên bản, như `pnpm add zod@4.6.6`;
  - `npx`, `npm exec`, `pnpm dlx`, `pnpx`, `yarn dlx`, `bunx` tải một gói chưa duyệt. Được chạy gói đã duyệt, công cụ của kit (`dependencies.tools` của `quality/gates.yaml`: `@playwright/cli@0.1.22`, `playwright`), và cái dự án đã cài, bằng `pnpm exec` hay `npx --no`.

### `build-test`

Job chạy `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, bước **Coverage of changed lines**, rồi `npm run build`. Bước nào lỗi thì job đỏ ở bước đó, và log của bước cho biết lý do.

**Dự án pnpm** (project-scaffold phần 2, mục 2.1): repo có `pnpm-lock.yaml` ở gốc thì bước **npm or pnpm** (`ci-package-manager.mjs`) cài đúng bản pnpm mà `packageManager` của `package.json` ghi. Sau đó job chạy `pnpm install --frozen-lockfile` và `pnpm run <script>` thay cho npm, và job `policy` chạy `pnpm audit`. Thiếu `packageManager` thì bước này đỏ và nói vậy. Package của chính kit trong `.ai-orchestrator/` vẫn cài bằng npm.

**App Java** (project-scaffold phần 3, mục 2.2): app Java là một package của workspace pnpm, qua `apps/<app>/package.json` mà `ao-kit add --stack spring-boot` viết. Năm script của file đó gọi `.ai-orchestrator/scripts/mvnw.mjs`, nên `pnpm -r run <script>` ở gốc chạy luôn app Java:

| Script | Maven |
|---|---|
| `lint` | `validate`: Spotless và Checkstyle của app |
| `typecheck` | `compile`, bỏ qua hai bước lint |
| `test:coverage` | `verify`: test (Testcontainers cần Docker), báo cáo và check của JaCoCo |
| `build` | `package -DskipTests` |
| `dev` | bật Postgres của `docker-compose.yml`, rồi `spring-boot:run` |

- `mvnw.mjs` chạy Maven wrapper của app với JDK mà `pom.xml` đòi (`<java.version>`). Nó tìm JDK theo thứ tự: `JAVA_HOME`; `JAVA_HOME_<bản>`; các JDK nằm cạnh `JAVA_HOME`; các thư mục cài thường gặp. `JAVA_HOME` chỉ được đặt cho Maven, nên biến của bạn giữ nguyên.
- Trên Windows, `mvnw.cmd` chạy qua `cmd.exe` với tham số cố định, gọi bằng `.\mvnw.cmd` trong thư mục app, vì phiên Claude Code đặt `NoDefaultCurrentDirectoryInExePath=1`.
- Trong CI, repo có `apps/*/pom.xml` thì bước **Java versions** (`ci-java.mjs`) đọc bản Java của từng `pom.xml`, rồi `actions/setup-java` cài đúng các bản đó (Temurin) và giữ cache Maven. Repo không có app Java thì hai bước này bỏ qua.

Job summary có mục **Coverage of changed lines: N%**, với bảng gồm các cột File, Covered và Lines not run. Bước này đỏ khi:

- các dòng mà PR thêm hoặc sửa có coverage dưới 80% (`coverage.changed_lines_min`). Viết test chạy qua các dòng ở cột Lines not run.
- một file nguồn thay đổi mà không có trong báo cáo coverage nào. Cấu hình coverage của dự án phải gồm mọi file nguồn, kể cả file chưa có test.

Báo cáo coverage là lcov của app JS (`coverage/lcov.info`), và báo cáo XML của JaCoCo của app Java (`target/site/jacoco/jacoco.xml`, file nguồn ở `src/main/java/`). Bước này chỉ tính dòng thực thi được. Những file không được tính:
- file test;
- file cấu hình (`*.config.*`);
- migration;
- `e2e/` và `scripts/`, ở gốc dự án và trong mỗi app (như `scripts/dev.mjs` chạy hai app ở máy);
- file Java không có code chạy, mà JaCoCo không đưa vào báo cáo: `package-info.java`, `module-info.java`, và interface hay annotation mà method không có thân, như repository của Spring Data hay mapper của MapStruct. Interface có method `default` hay `static` có thân, class, enum và record vẫn phải có trong báo cáo;
- file khớp `coverage_exclude` của app trong `project.yaml`, glob tính từ thư mục app, ví dụ `src/main/java/**/dto/**`. Ghi ở đây đúng những gì cấu hình coverage của app đã loại, như phần `<excludes>` của JaCoCo. `project.yaml` là đường dẫn được bảo vệ, nên chỉ PR do bạn merge mới nới được danh sách;
- bản chép kit (`.ai-orchestrator/`, `.claude/`), vì đã có test ở kit. Muốn kiểm trước khi push, chạy `npm run test:coverage`, rồi `node .ai-orchestrator/scripts/coverage-diff.mjs --base origin/develop`.

### `secrets`

gitleaks quét các commit của PR; khi push thì quét các commit mới. Log của bước **Scan the new commits** chỉ ra file, dòng và commit có secret.

Secret đã nằm trong lịch sử git, nên xóa nó ở một commit sau là chưa đủ:

1. Thu hồi secret đó và tạo cái mới.
2. Viết lại các commit của nhánh để bỏ secret, rồi force push lên nhánh của PR.

Chỉ thêm `gitleaks:allow` khi chắc chắn đó không phải secret, và ghi `reason:` trên cùng dòng.

### `sast`

Semgrep CE chạy với bộ rule `p/default` và `p/owasp-top-ten`. Job đỏ khi có finding mức ERROR. Log của bước **Semgrep on the changes** ghi rule, file và dòng.

Semgrep chỉ báo finding do thay đổi mang vào:
- Trên PR: so với nhánh đích.
- Khi push lên một nhánh đã có trên GitHub: so với commit trước lần push.
- Khi push một nhánh mới, như `develop` lần đầu hay một nhánh `release/*`: chỉ xét commit đầu nhánh, giống `gitleaks`. Nhờ vậy finding có từ trước kit không chặn nhánh mới (`project-scaffold`, T17).
- Commit gốc của một repo, và lượt chạy tay `gh workflow run CI --ref <nhánh>`, được quét toàn bộ. Muốn xem các finding cũ của một repo đang có thì chạy tay.
- Chỉ chạy tay được trên `develop`, `main` hay `release/*`. Trên nhánh khác, mọi job đỏ ngay ở bước đầu **By hand only on develop, main or release/\***. Lượt chạy tay không có các phần chỉ chạy trên PR, nên nó không được phép ghi check xanh lên commit của PR.

Sửa code theo gợi ý của rule. Nếu là báo nhầm, thêm `nosemgrep` kèm `reason:` trên cùng dòng; reviewer sẽ đọc lý do.

### Job CI riêng của dự án: `ci.project.yml`

Dự án đặt job CI của riêng mình vào `.github/workflows/ci.project.yml`, không vào `ci.yml`. `ci.yml` là file của kit, nên mỗi lần chép kit sẽ ghi đè nó và xóa mất job riêng. Ví dụ: `shop` từng mất job `caddy-proxy` và `not-found` như vậy.
- **Cách chạy:** job `project` của `ci.yml` gọi file này trong mọi lượt `CI`. Job của dự án hiện thành `project / <tên job>`. Nó không phải check bắt buộc của `gates.yaml`, nhưng `merge-gate` chỉ merge khi mọi check đạt, nên job đỏ vẫn chặn merge.
- **Ai giữ file:** `ao-kit init` (hay `ao-kit sync` khi dự án chưa có file) ghi một bản mẫu, chỉ có job `none` không bao giờ chạy. Từ đó file là của dự án: `ao-kit sync` không ghi đè, và `ao-kit doctor` không coi nó là lệch, chỉ báo khi file mất. Phải giữ file, vì thiếu nó thì cả lượt `CI` đỏ.
- **Viết một job:**
  - checkout commit cần kiểm bằng `ref: ${{ inputs.head_sha }}`; `inputs.base_sha` là chỗ thay đổi bắt đầu, như `BASE_SHA` của `ci.yml`;
  - chép bước đầu **By hand only on develop, main or release/\*** của các job trong `ci.yml`;
  - xóa job `none` khi đã có job khác.
- **Quyền:** job không nhận secret nào, và chỉ có quyền đọc (`contents: read`). File nằm dưới `.github/workflows/`, là đường dẫn được bảo vệ, nên chỉ `devops` hay bạn sửa, và bạn tự merge PR đó.
- PR chép kit không đụng file này. PR nào thêm hay sửa nó thì không còn là PR chép kit thuần, nên không dùng lại được review của dự án khác ([PR chép một bản kit đã được review](#pr-chép-một-bản-kit-đã-được-review)). Lần chép đầu tiên có bản mẫu cũng vậy, vì nó thêm file này.

## Báo cáo review

`reviewer` và `security` viết báo cáo theo `templates/review-report.md`, có dòng `Role: reviewer` hoặc `Role: security` ngay dưới tiêu đề, rồi đăng bằng `ao-pr.mjs review`:

- còn finding Critical hoặc High thì đăng `REQUEST_CHANGES`;
- không còn thì đăng `COMMENT`.

Báo cáo nằm ở tab **Conversation** của PR. `merge-gate` chỉ đọc báo cáo trên commit đầu của PR, và lấy báo cáo mới nhất của mỗi vai trò.

### Review theo tầng đường dẫn

Từ C1 ([SPEC-c1.md](../SPEC-c1.md) mục 3), tầng của PR là tầng cao nhất mà các file của nó chạm. File đổi tên được tính theo cả hai tên. Danh sách đường dẫn nằm ở khóa `review` của `quality/gates.yaml`; hàm tính là `pathTier` trong `lib/quality/review-tiers.mjs`.

| Tầng | Gồm | `reviewer` | `security` |
|---|---|---|---|
| Nguy cấp | đường dẫn được bảo vệ; `review.critical_paths`: auth, session, crypto, `.env*`, cấu hình bảo mật, migration, Dockerfile, compose, Maven wrapper, `deploy.yaml`; và mọi file lái phiên agent ở mọi độ sâu: `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, thư mục `.claude/` hay `.claude-plugin/`, `.mcp.json`, `.gitattributes`, `.gitmodules`, `.lfsconfig` | `xhigh` | `max` |
| Nhạy cảm | `review.sensitive_paths`: file khai báo thư viện, cấu hình app, controller, DTO, service, repository, entity, middleware; header bảo mật và CSP (`*security*`), env của app (`env.*`, `env/`), `Caddyfile`, luật eslint, client gọi API, trang đăng nhập và đăng ký, `*ExceptionHandler*`, `*Auditor*` | `high` | `high` |
| Thường | mọi file khác: UI, CSS, i18n, test | `high` | không chạy |
| Tài liệu | mọi file nằm trong `review.docs_paths` (`docs/**`, `**/*.md`), và không file nào Nguy cấp | `high` | không chạy |

- **Vòng sau:** cả hai role chỉ xem phần mới kể từ báo cáo đầy đủ gần nhất của mình, ở `high`. Phần mới chạm đường dẫn Nguy cấp thì chạy ở mức của tầng Nguy cấp.
- **Báo cáo `merge-gate` và `audit` đòi:** luôn có `reviewer`. `security` chỉ cần khi PR ở tầng Nhạy cảm hay Nguy cấp, hoặc khi `security` đã từng đăng báo cáo trên PR, để bỏ file đã gọi nó vào cũng không bỏ được High nó tìm ở chỗ khác. GitHub chỉ liệt kê tối đa 3.000 file; PR dài hơn được tính là Nguy cấp.
- **Item mức Nặng** (nhãn `ao-level-heavy`, hay mức tự tăng) được review như PR Nguy cấp, dù đường dẫn của nó thuộc tầng nào ([dev-workflow.md](dev-workflow.md), mục Mức quy trình). Nhãn effort (`ao-effort-*`) nay chỉ còn dùng cho dev agent.
- CI vẫn chạy SAST, quét secret và `osv-scanner` trên mọi PR, kể cả PR không có `security`.
- **File lái agent không phải tài liệu** (review của `shop` PR #79). Claude Code nạp `CLAUDE.md`, `AGENTS.md` hay `.claude/` của một thư mục làm chỉ dẫn cho agent có Bash và git. Vì vậy chúng luôn ở tầng Nguy cấp, do code quyết (`lib/quality/review-tiers.mjs`), dù danh sách trong `gates.yaml` nói gì. Không luật miễn nào phủ chúng, và PR tài liệu có một file như vậy thành PR thường.
- **Đường dẫn riêng của dự án:** khối `review` của `project.yaml` thêm đường dẫn vào hai tầng trên. Kit copy giữ nguyên khối này, và nó chỉ thêm được, không bớt được:

  ```yaml
  review:
    critical_paths: ["apps/api/src/main/java/**/payment/**"]
    sensitive_paths: ["apps/web/src/lib/fetcher.ts"]
  ```

### Miễn review theo luật

Từ C1 (spec mục 3.4), PR thỏa cả hai điều sau thì không cần báo cáo review:
1. mọi file của nó nằm trong `files` của một luật ở `review.waivers` của `quality/gates.yaml`;
2. mức hiệu lực của item bằng `level` của luật đó.

Kit có một luật, `light-docs`: tài liệu, ảnh và file chữ (`messages/*.json`, `locales/**`) của item mức Nhẹ. Chỉ một file nằm ngoài danh sách là review bật lại. File Nguy cấp làm item thành Nặng, nên không luật nào miễn được nó.

- **Dấu vết:** `/ao-review` của PR như vậy không chạy agent. App `ao-review` đăng một review loại COMMENT lên head, có dòng `Waiver: light-docs`, mức và danh sách file.
- **`merge-gate` và `audit` tự tính lại luật:** từ danh sách file của PR trên GitHub, và nhãn mức của item đọc bằng `JIRA_CI_TOKEN`. Chúng chỉ đọc Jira khi mọi file có thể thuộc một luật. Luật không khớp, hay nhãn không đọc được, thì dòng `Waiver` không có giá trị gì, và PR cần báo cáo như thường. Approve của bạn vẫn luôn cần.
- **Muốn review đủ:** `/ao-review <PR> full` chạy review cho cả PR được miễn.
- **Còn hoãn:** khóa `review: off` trong `project.yaml` cho repo nháp, kèm dòng đỏ của `doctor` (spec mục 3.4), vì nó cần `merge-gate` và `audit` đọc `project.yaml` của nhánh base. Làm khi có repo nháp đầu tiên.

### Chấp nhận một High thay vì sửa

Có khi một High không sửa được trong PR đó, ví dụ khi cách sửa là việc lớn của riêng nó. Bạn có thể chấp nhận rủi ro đó, có hạn chót (Pilot 3, spec 2.9 mục 5):

1. `/ao-review` dừng ở dòng `ask for changes (Critical or High: security 1: 1a2b3c4d)`. `1a2b3c4d` là mã của finding, tính từ cột Where và Finding của nó.
2. Bạn approve PR trên commit đầu, và trong ô nhận xét của lần approve, ghi một dòng cho mỗi finding:

   ```
   Accept risk: 1a2b3c4d until 2026-12-31: agent chạy dưới tài khoản Windows của bạn, tới khi có ao-agent
   ```

3. Từ đó, `merge-gate`, `audit` và `/ao-review` không tính finding đó là đang chặn nữa.

Dòng chấp nhận chỉ có tác dụng khi:

- nó nằm trong quyết định mới nhất của bạn trên commit đầu, và quyết định đó là approve. Push thêm thì phải approve lại, kèm dòng chấp nhận;
- finding là High. Critical không chấp nhận được;
- ngày hết hạn chưa qua: `merge-gate` và `/ao-review` tính theo hôm nay, `audit` tính theo ngày merge;
- ngày hết hạn cách ngày approve không quá 90 ngày, và có lý do sau dấu hai chấm.

Dòng viết trong trích dẫn, gạch đầu dòng, chữ đậm hay chữ nghiêng, và mã đặt trong dấu `` ` ``, vẫn được đọc. Một dòng sai cách viết, hay một dòng nêu mã của một Critical, thì không chấp nhận gì, và lý do hiện ngay trong dòng `Waiting` của `merge-gate`. `/ao-review` chỉ in mã của các High. Finding đã chấp nhận vẫn được liệt kê cho lần review sau kiểm lại.

## `merge-gate`

`merge-gate` chạy sau mỗi lần `jira-sync` xong. `jira-sync` thì chạy sau mỗi lần `CI` xong và sau mỗi review, nên `merge-gate` thấy cả hai. `merge-gate` cũng chạy ngay sau mỗi lần `CI` xong: ở bản v0.3.0 của `shop`, PR merge ngược #73 chờ CI, mà lần CI xanh không kéo theo `jira-sync` nào, nên `merge-gate` không chạy lại tới khi bạn chạy tay. Một lần chạy thừa không hại gì: các lần chạy xếp hàng, và nó chỉ merge PR đủ mọi điều kiện.

Code của một PR không bao giờ cầm `JIRA_CI_TOKEN` (review của `shop` PR #21). GitHub lấy workflow của sự kiện `pull_request` và `pull_request_review` từ chính PR, kèm secret của repo, nên nhánh của agent có thể sửa bản kit hay gói mà `npm ci` cài, rồi chuyển item bất kỳ bằng token đó. Vì vậy:

- Sự kiện của PR (mở, đẩy commit mới, sẵn sàng review, đóng) đến `jira-sync` qua lượt chạy của workflow `PR events` (`pr-events.yml`, job `pr-events-relay`), cũng không có secret, không có quyền, chỉ in một dòng; `jira-sync` chạy theo nó bằng `workflow_run`, rồi tự đọc PR trên GitHub. Trước đây `jira-sync` chạy trên `pull_request_target`; GitHub chặn trigger này trên repo public từ 2026-12-02 nếu repo không có policy cho phép (Pilot 3). Một PR đang xung đột với nhánh đích không chạy workflow `pull_request` nào, nên chỉ đến `jira-sync` khi xung đột đã gỡ và được push. Check run `pr-events-relay` trên head của PR không tính là `CI`.
- Review đến `jira-sync` qua lượt chạy của workflow `PR review` (`pr-review.yml`, job `pr-review-relay`). Workflow đó không có secret, không có quyền, chỉ in một dòng; `jira-sync` chạy theo nó bằng `workflow_run`, từ nhánh mặc định, rồi tự đọc review trên GitHub. Check run `pr-review-relay` trên head của PR không tính là `CI`.
- `JIRA_CI_TOKEN` là secret của environment `jira-sync` (chỉ `develop`, `main`, `release/*` và tag `v*`) và của `merge-gate`, không phải secret của repo. `ao-kit setup github` tạo cả hai và đặt token; secret cũ của repo thì bạn tự xóa ([getting-started.md](getting-started.md)), và `ao-kit doctor` báo đỏ khi nó còn. Bạn cũng gọi tay được: tab **Actions** → **merge-gate** → **Run workflow**, chọn nhánh mặc định **(đối chiếu giao diện)**.

Mỗi lần chạy, `merge-gate` xét mọi PR đang mở, và in vào log một dòng cho mỗi PR:

| Dòng | Nghĩa |
|---|---|
| `Merged #12: …` | Đã squash merge bằng App `ao-dev` |
| `Waiting #12: …` | Còn thiếu các điều kiện được liệt kê |
| `Needs you #12: it changes …, so read the diff and merge it yourself` | PR sửa file được bảo vệ. Bạn đọc diff rồi tự merge (mục sau). Phần `(still missing: …)` ở cuối, nếu có, là các điều kiện còn thiếu |
| `Skipped #12: …` | `merge-gate` không merge loại PR này: PR do bạn mở, PR ở draft, hoặc nhánh không phải của một item |
| `No open PR` | Không có PR nào đang mở |

Các điều kiện hay thiếu, và cách xử lý:

| Trong dòng `Waiting` | Làm gì |
|---|---|
| `CI green on head <sha>` | Chờ `CI` chạy xong, hoặc sửa check đỏ |
| `reviewer report on head <sha>`, `security report on head <sha>` | Cho `reviewer` hoặc `security` review commit đầu mới |
| `… report on head <sha> without Critical or High findings (N open)` | Agent sửa các finding và push, rồi hai vai trò review lại; hoặc bạn chấp nhận một High (mục trên). Phần sau dấu `;`, nếu có, nói vì sao một dòng chấp nhận không có tác dụng |
| `every file listed: GitHub listed N of the M files …` | GitHub chỉ liệt kê 3.000 file đầu của một PR, nên `merge-gate` không kiểm được đường dẫn. Bạn đọc PR rồi tự merge |
| `answer to the changes requested on head <sha>` | Quyết định mới nhất trên commit đầu là yêu cầu sửa. Agent push bản sửa, hoặc người đã yêu cầu sửa approve lại trên chính commit đó |
| `approval on head <sha>` | Bạn approve. Approve trên commit cũ không được tính |
| `valid branch (…)`, `valid title (…)`, `complete description (…)` | Sửa tiêu đề hoặc mô tả bằng `ao-pr.mjs edit`. Sai tên nhánh thì mở PR mới |
| `conflicts with develop resolved` | Merge `develop` vào nhánh, gỡ xung đột, rồi push. Rebase rồi force push cũng được, nhưng nó viết lại các commit đã push. Sau một lần merge như vậy, vòng review kế tiếp chỉ tính những file mà chính PR đổi so với `develop`, không tính code của các PR khác mà merge mang vào (Pilot 3, PR #41 của `shop`) |

Muốn xem trước ở máy, chạy `node .ai-orchestrator/scripts/merge-gate.mjs --dry-run`. Lệnh in đúng các dòng trên và không merge gì.

`merge-gate.yml` chỉ có hiệu lực khi nằm trên nhánh mặc định. Kit đặt nhánh mặc định là `develop` (README, bước cài 6), nên một bản sửa của nó chạy ngay khi bạn merge PR của bản sửa. Nếu nhánh mặc định là `main`, bản sửa chỉ chạy sau lần release kế tiếp.

### PR tài liệu của Epic

Từ `dev-workflow` (spec mục 2.4), tài liệu của một Epic (SPEC, design, plan, ADR) vào `develop` qua một PR riêng. Bạn duyệt chúng trên Jira, ở gate ① và ②, nên PR này không cần báo cáo review hay approve trên GitHub. `merge-gate` coi một PR là PR tài liệu khi:

- head là nhánh `feature/<EPIC>-spec`, và App `ao-dev` mở PR;
- mọi file PR sửa, kể cả tên cũ của file đổi tên, nằm trong `docs/specs/<EPIC>/**` hoặc `docs/adr/**` (mục `docs_pull_requests` của `quality/gates.yaml`);
- `<EPIC>` là Epic trên Jira;
- không file nào lái phiên agent, như một `CLAUDE.md` dưới `docs/specs/<EPIC>/` (review của `shop` PR #79). Bạn đọc SPEC ở gate, không đọc file đó, mà dev agent lại nạp nó làm chỉ dẫn. PR có một file như vậy được review như PR thường.

`merge-gate` squash merge PR tài liệu khi Epic đã qua gate ② (In Progress hoặc Done), `CI` xanh trên head, và lượt `CI` mới nhất của nhánh tài liệu (sự kiện `pull_request`) chạy trên head và bắt đầu trước lúc bạn bấm `Approve plan`. Mỗi lần push lên PR tạo một lượt mới, nên push sau lúc duyệt, kể cả force-push về commit cũ, làm PR thành PR thường. Lượt của cùng commit ở nhánh khác hay chạy tay không được tính. Thời điểm duyệt lấy từ changelog của Epic. Các dòng trong log:

| Dòng | Nghĩa |
|---|---|
| `Merged #14: …, the docs PR of DEMO-20` | Đã merge PR tài liệu |
| `Waiting #14: the docs PR of DEMO-20: DEMO-20 past gate plan-approval (it is Planning)` | Chờ bạn bấm `Approve plan` |
| `Waiting #14: … (head … came after Approve plan of DEMO-20 at …, so it is reviewed like any PR)` | Có commit push sau lúc bạn duyệt: PR thành PR thường, cần báo cáo và approve của bạn. PR chỉ đổi tài liệu ở tầng Tài liệu, nên chỉ cần báo cáo `reviewer` |
| `Waiting #14: the docs PR of DEMO-20: JIRA_CI_TOKEN, for merge-gate to read DEMO-20` | `merge-gate.yml` chưa có `JIRA_CI_TOKEN` |

`merge-gate` đọc Epic bằng `JIRA_CI_TOKEN`, chỉ để đọc, và đọc lượt `CI` bằng quyền `actions: read` của token workflow. `audit` dùng đúng các điều kiện này cho commit merge của PR tài liệu.

## Khi nào bạn tự merge

Bạn tự merge trong hai trường hợp đầu dưới đây. Trường hợp 3, PR release và PR merge ngược, giờ do `merge-gate` merge. `audit` vẫn kiểm cả ba, nên hãy làm đủ các bước trước khi bấm Merge.

1. **PR của agent sửa file được bảo vệ:** `.github/workflows/**`, `.githooks/**`, `.claude/**`, `.ai-orchestrator/**`, `.mcp.json`. `merge-gate` in `Needs you`.
   - Workflow chạy theo `pull_request` dùng bản nằm trong PR, nên một PR sửa `ci.yml` có thể tự làm `CI` của nó xanh. Vì vậy hãy đọc kỹ diff ở tab **Files changed**.
   - PR vẫn phải đủ mọi điều kiện khác: `CI` xanh, hai báo cáo không còn Critical hay High, và approve của bạn trên commit đầu.
   - Sau đó bấm **Squash and merge** **(đối chiếu giao diện)**. `audit` chỉ chấp nhận PR này khi người merge là một login trong `AO_APPROVERS`.
   - Từ `dev-workflow` (spec mục 2.7), khi PR chỉ còn chờ bạn (không thiếu gì, hoặc chỉ thiếu approve của bạn), `merge-gate` comment lên PR bằng `ao-dev` và gắn cờ "Needs you" lên item, kèm comment cùng nội dung bắt đầu bằng `merge-gate: needs you at <sha> on PR #<n>`. Mỗi head chỉ một lần. Item đã bị cổng khác gắn cờ thì `merge-gate` để nguyên trên Jira. Khi PR được merge hoặc đóng, `jira-sync` gỡ cờ đó, trừ khi sau đó có ai gắn cờ lại. Cả hai chỉ tính comment trên Jira của tài khoản token CI, tức `account_id` của identity `automation` trong `tracker/jira.yaml`, và comment trên PR của bot `ao-dev`: dấu do agent hay người khác viết không được tính. Tìm `account_id` của một tài khoản: mở hồ sơ của nó trên Jira, phần cuối của URL là id **(đối chiếu giao diện)**.
2. **PR do bạn mở.** `merge-gate` bỏ qua PR của bạn. `audit` tính bạn là đã approve, nhưng PR vẫn cần `CI` xanh, hai báo cáo trên commit đầu, cùng tiêu đề và mô tả đúng mẫu.
3. **PR release và PR merge ngược** (`release-workflow`, spec mục 2.7; mục `release_pull_requests` của `quality/gates.yaml`). Cả hai do `ao-dev` mở, và `merge-gate` merge bằng **merge commit**, không squash, để lịch sử của từng bản nằm trên `main`.
   - **PR release** `release/vX.Y.Z` → `main` (gate ⑤): `merge-gate` merge khi `CI` xanh và bạn đã approve commit đầu. Bạn approve, không bấm Merge. Từng thay đổi trong bản đã qua cổng ở PR riêng của nó, nên đường dẫn được bảo vệ không bắt bạn tự merge PR này. Merge xong, `merge-gate` gắn tag `vX.Y.Z` vào merge commit, rồi mở PR merge ngược `main` → `develop`.
   - **PR merge ngược** (head là `main` của chính repo, vào `develop` hay nhánh `release/*` đang mở): `merge-gate` merge khi `CI` xanh, PR không có xung đột, đầu `main` là commit của một tag phát hành, và mọi commit PR mang từ `main` về (trên dòng cha thứ nhất) qua được `audit` như khi deploy. Không cần approve, vì mỗi commit đó đã qua gate ③ hay gate ⑤. Một commit lọt vào `main` mà không qua bạn làm PR chờ mãi, kèm tên commit đó (review vòng 3 của `shop` PR #13).
   - **PR merge ngược có xung đột:** `merge-gate` không merge, và comment "Needs you" lên PR một lần cho mỗi commit đầu. Bạn gỡ ở máy: tách một nhánh từ `main`, merge nhánh đích vào đó, sửa xung đột, push nhánh, rồi mở PR vào nhánh đích và tự merge bằng **Create a merge commit**, để giữ hai nhánh cha. Đóng PR merge ngược cũ. PR mới không phải PR của một item, nên `audit` chặn deploy ở môi trường đó. Bạn đọc diff, rồi gỡ chặn bằng `/ao-rollback <môi trường> <sha>` (plan, quyết định 5). [Chưa kiểm] Cách gỡ này chưa chạy thật lần nào.

Merge tay một PR chưa đủ cổng thì `audit` đỏ ở lần deploy kế tiếp.

## `audit` và deploy

Dự án dùng VPS (`release-workflow`) không có workflow deploy: deployer chạy cùng code `audit` trên bản kit ghim ở VPS, cho mọi commit mới trên lịch sử first-parent. Commit không qua thì deployment có status `error`, kèm lý do như dưới, và bạn gỡ chặn bằng `/ao-rollback <môi trường> <sha>` ([docs/release-workflow.md](release-workflow.md)).

Dự án tự deploy bằng GitHub Actions thì workflow deploy gọi `audit.yml` trước, và job deploy có `needs: audit`:

```yaml
permissions: { contents: read, pull-requests: read, checks: read, statuses: read, actions: read }
jobs:
  audit:
    uses: ./.github/workflows/audit.yml
  deploy:
    needs: audit
```

Job của `audit` lấy `JIRA_CI_TOKEN` từ environment `jira-sync`, nên workflow deploy không cần truyền secret, và chỉ chạy được trên `develop`, `main`, `release/*` hay tag `v*`. Trong workflow được gọi, secret của environment thắng secret mà workflow gọi truyền vào.

`audit` kiểm rằng commit sắp deploy là commit merge của một PR đã qua đủ cổng. Job summary có mục **Audit**:

- Xanh: `audit passed: <sha> on develop is the merge of PR #7, which met every gate`.
- Đỏ vì push thẳng: `<sha> on develop is not the merge of a PR into develop: it was pushed without one`.
- Đỏ vì PR thiếu cổng: `PR #6 was merged without: reviewer report on head <sha>; security report on head <sha>; approval on head <sha>`.
- Đỏ vì sai người merge: `PR #9 changes .github/workflows/ci.yml, which only you merge, but <login> merged it`.

Hai trường hợp của `release-workflow` không cần review hay approve:

- **Commit báo cáo của `/ao-ship`** trên `release/*`: bot `ao-dev` push thẳng, không qua PR, một commit chỉ sửa `docs/releases/**` và `CHANGELOG.md`. Hai file đó nằm ngoài image. Commit của bot sửa file khác thì đỏ: `<sha> on release/v0.1.0 is a commit of tungph7-ao-dev[bot] without a PR, which may only change docs/releases/** and CHANGELOG.md, but it changes <file>`.
- **PR merge ngược** từ `main` vào `develop` hay vào nhánh `release/*` đang mở: `CI` xanh trên head, đầu `main` là commit của một tag phát hành, mọi commit nó mang từ `main` về qua được `audit`, và người merge là `merge-gate` hoặc bạn.

Khi `audit` đỏ:

1. Job deploy không chạy, nên môi trường giữ bản cũ.
2. `orchestratorci` gắn cờ Impediment và nhãn `needs-you` cho item Jira có mã trong tiêu đề PR hoặc header commit, kèm một bình luận nêu lý do.

Cách dọn, như T20 đã làm:

1. Agent revert commit đó bằng `git revert` trên một nhánh mới, rồi mở PR. PR revert qua đủ cổng như mọi PR, và `merge-gate` merge nó.
2. Ở lần deploy kế tiếp, `audit` xanh.
3. Bạn gỡ cờ của item (menu **…** của item → **Remove flag**) và nhãn `needs-you` **(đối chiếu giao diện)**, rồi làm lại thay đổi qua đủ cổng.

Cập nhật bản chép kit trong dự án cũng phải đi qua PR, và PR đó do bạn merge, vì nó sửa `.ai-orchestrator/**`. Push thẳng lên `develop` làm `audit` chặn deploy và gắn cờ item có mã trong header commit. `DEMO-5` mang cờ vì lý do này, từ lần cài kit ở T18.

### PR chép một bản kit đã được review

Mỗi bản kit chỉ cần agent review đầy đủ một lần. Khi chép cùng bản đó sang dự án thứ hai, thêm vào mô tả PR một dòng riêng, trỏ tới PR đã được review ở dự án đầu:

```text
Kit review: TungPH7/ao-pilot#24
```

`/ao-review <PR>` tự kiểm rồi đăng hai báo cáo `reviewer` và `security` bằng App `ao-review`. Không agent nào chạy, chi phí 0 USD. Báo cáo có dòng `Kit copy of:` để bạn thấy nó do `ao-step` viết. `merge-gate` và `audit` đọc nó như mọi báo cáo khác. Bạn vẫn đọc diff, approve và tự merge ở gate ③.

Dòng `Kit review:` chỉ là lời khai. `ao-step` kiểm lần lượt:

1. Repo tham chiếu nằm trong `AO_KIT_PEERS`.
2. PR tham chiếu đã merge vào nhánh được bảo vệ, do bạn merge.
3. Head của nó có đủ hai báo cáo do agent viết, không còn Critical hay High mở.
4. Nó là PR mới nhất trên `develop` của repo đó đổi `.ai-orchestrator/lib/`, nên không chép ngược về bản cũ được.
5. Mọi file PR đổi đều là file kit, và khớp nội dung, mode và loại với head tham chiếu. PR xóa một skill thì quay về review thường. File đổi được tính bằng cách so cây git của merge base với cây của head, nên không có giới hạn số file.
6. Các file "phải giống hệt" khớp theo cả hai chiều, nên không chép một phần hay thêm file lạ được. Danh sách nằm ở khối `kit_copy` của `quality/gates.yaml`.
7. `.claude/agents/` và `.claude/rules/ai-orchestrator.md` chứa mã space và skill theo stack của dự án, nên không so với dự án khác. `ao-step` luôn dựng lại chúng bằng `render-agents.mjs` của kit đang chạy, và chỉ nhận đúng các file `render-agents.mjs --list` kể ra.
8. PR không còn finding Critical hay High mở từ các báo cáo trước. Những finding đó đi qua `/ao-fix` như mọi PR.

Không đạt một điều thì lệnh in lý do và cho agent review như thường. Lỗi mạng, hay một push trong lúc so, cũng vậy.

`/ao-review` chạy bản chép kit của dự án, nên chỉ dự án nào đã có code này mới đi được đường so byte. Lần chép đầu tiên mang code này vào một dự án vẫn được agent review đầy đủ, trừ khi bạn chạy `ao-step` từ kit bằng `AO_KIT_DIR`, như ở lần kiểm thật. Đặt `AO_KIT_PEERS` trong `.claude/settings.json` của dự án để dùng lâu dài.

Lý do `max` vẫn giữ ở lượt review đầu tiên: bài thử mù ngày 2026-11-07 cho thấy `high` tìm ra 4 trên 6 lỗi đã biết, và bỏ sót một lỗi High ở cả hai lượt lặp. Xem [`tasks/kit-copy-review/verification.md`](../tasks/archive/kit-copy-review/verification.md).

## Environment `merge-gate`

`merge-gate` merge bằng App `ao-merge`, App duy nhất mà ruleset cho merge khi chưa có approve của bạn (Pilot 3, spec 2.9). Key của App này chỉ nằm ở secret `AO_MERGE_APP_KEY` của environment `merge-gate`, không nằm trên máy nào agent chạy. Environment này chỉ cho nhánh mặc định (`develop`), nên workflow chạy trên nhánh khác không đọc được key (đã kiểm ở T3 và T19). `ao-kit setup github` làm cả bốn bước dưới đây. Làm tay thì cài một lần cho mỗi repo:

1. Tạo App `ao-merge` và cài nó vào repo, theo mục 7 của [github-apps-setup.md](github-apps-setup.md).
2. Trên trang repo: **Settings** → **Environments** → **New environment**. Đặt tên `merge-gate`, rồi bấm **Configure environment** **(đối chiếu giao diện)**.
3. Ở **Deployment branches and tags**, chọn **Selected branches and tags**, bấm **Add deployment branch or tag rule**, gõ tên nhánh mặc định (`develop`), rồi bấm **Add rule** **(đối chiếu giao diện)**. Về sau nếu đổi nhánh mặc định, hãy đổi rule này theo; nếu không, `merge-gate` sẽ không đọc được key.
4. Đặt secret bằng cách pipe file key, để key không nằm trong lịch sử lệnh: `gh secret set AO_MERGE_APP_KEY --env merge-gate -R <owner>/<repo> < path/to/key.pem`. Xong thì xóa file key khỏi máy.

**Vì sao không dùng `ao-dev`:** mọi agent có quyền ghi git đều cầm token của `ao-dev`, và `gh-guard` chỉ chặn được nhầm lẫn. Trước Pilot 3, `merge-gate` merge bằng một key thứ hai của `ao-dev` (secret `AO_DEV_APP_KEY`). Từ khi ruleset cho App merge đi tắt, App đó không được là App của agent (review của `shop` PR #13). Dự án chưa có `ao-merge` thì `merge-gate` vẫn merge bằng `ao-dev` và in một dòng cảnh báo.

Job của `merge-gate` khai `environment: { name: merge-gate, deployment: false }`. Bỏ `deployment: false` thì mỗi lần chạy tạo một deployment, và sự kiện của nó kích hoạt `jira-sync`, rồi lại `merge-gate`, thành vòng lặp.

## Hook `gh-guard` của Claude Code

`gh-guard` chạy trước mỗi lần agent dùng `Bash`, `Read`, `Edit`, `Write`, `NotebookEdit`, `Grep`, `Glob` hoặc `WebFetch`, và chỉ áp cho các vai trò agent của hợp đồng. Phiên chính của bạn không bị chặn. Danh sách đầy đủ ở mục 2.7 của spec. Tóm tắt, hook chặn agent:

- bỏ qua hook git: `git commit --no-verify`, `git -c core.hooksPath=…`;
- push lên `develop`, `main`, `release/*`;
- làm việc với PR bằng tài khoản của bạn: `gh pr merge`, `review`, `create`, `revert`, `update-branch` và các lệnh ghi khác, hay `gh api` với method khác GET;
- lấy token hoặc key: `gh auth token`, `gh auth status -t`, đọc `hosts.yml` của `gh` hay file PEM của App;
- đổi cấu hình repo, như `gh secret set`, `gh repo edit`, `gh repo autolink create`; hoặc xóa lần chạy workflow bằng `gh run delete`; chạy tay, bật hay tắt workflow bằng `gh workflow run`, `enable`, `disable`;
- sửa file được bảo vệ bằng `Edit`, `Write`, `NotebookEdit`. Riêng `devops` được sửa `.github/workflows/**`, nhưng PR đó vẫn do bạn merge;
- từ `dev-workflow`: tự mở agent hay tự lấy token, tức chạy `ao-step.mjs`, `ao-agent.mjs`, `ao-git-credential.mjs`; đặt credential helper cho git (`git -c credential.*`, `git config credential.*`); sửa file trong `.git/`;
- từ A1 sau Pilot 2: đưa mật khẩu basic auth của Development và Staging (`$E2E_HTTP_PASSWORD`, `$AO_ENV_AUTH`) vào tham số của một lệnh, như `curl -u`, vì process nào trên máy cũng đọc được dòng lệnh. Chỉ `printf` được nhắc tới biến này, cùng các phép kiểm biến có hay không mà không ra giá trị: `[ -n "$E2E_HTTP_PASSWORD" ]`, `[[ … ]]`, `test` và `${E2E_HTTP_PASSWORD:+set}`. Tất cả đều là lệnh có sẵn của shell. `qa` đưa mật khẩu cho `curl` qua stdin: `printf 'user = "%s:%s"\n' "$E2E_HTTP_USER" "$E2E_HTTP_PASSWORD" | curl -K - <url>`;
- từ Pilot 3 (review của `shop` PR #13): đọc hay nhắc tới bản sao backup và khóa mở chúng, tức file `.agekey`, file `.dump.age`, thư mục `ao-backups`, thư mục `.ao` và script `ao-backup-pull.mjs`. Lớp giữ thật là khóa `age` không nằm trên máy ([vps-setup.md](vps-setup.md), mục 16);
- từ review vòng 2 đến 4 của `shop` PR #13: `Grep` và `Glob` theo luật của `Read`, và chỉ đọc trong dự án và thư mục temp, như `Edit` và `Write`, kể cả `pattern` của `Glob` đi ra ngoài bằng `..`; một lệnh tìm dấu hiệu của khóa bí mật (`PRIVATE KEY`, `AGE-SECRET-KEY`, viết cách nào cũng vậy) mà nhắm vào thư mục cá nhân của bạn (`~`, `$HOME`, `%USERPROFILE%`, `C:\Users`). Trong dự án thì được: đó là cách `security` tìm khóa bị commit.
- từ review của `shop` PR #21 (bốn vòng): lệnh có dấu hiệu của khóa bí mật (thêm cả `-----BEGIN` của khối PEM, `BEGIN RSA`, `BEGIN OPENSSH` và các cách viết regex) chỉ được qua khi cả dòng là đúng một lệnh `git commit`, `git log` (không `--output`) hay `git grep` (không `--no-index`, `--untracked`, `-O`), không chuyển hướng `>`, không biến đặt trước, và chạy từ một thư mục của dự án. Mọi cách đọc biến user của Windows, nơi kit giữ token (trong đó có `JIRA_CI_TOKEN`), đều bị chặn: hive `HKCU`, `HKEY_CURRENT_USER`, `HKU`, `HKEY_USERS` và ổ `HKCU:` của PowerShell với bất cứ khóa nào, `GetEnvironmentVariable(s)` ở mọi dạng, API registry của .NET, COM (`WScript.Shell`), `Win32_Environment`, `wmic`, và cả `/proc` (Git Bash cho đọc registry và môi trường của các tiến trình khác dưới `/proc`).
- từ followup trước C1, Đợt 3 (review của `shop` PR #74, QA SHOP-73, request SHOP-54): dấu hiệu `BEGIN` của khối PEM được bắt ở mọi kiểu chữ và ở dạng regex (`BEGIN.*KEY`, `begin\s+rsa`, `BEGIN[[:space:]]OPENSSH`), còn câu SQL `BEGIN; … PRIMARY KEY` hay tên test vẫn qua. Hook đọc lệnh đứng sau `do`, `then` hay `{`, nên dạng stdin của `curl` trong vòng lặp hay trong hàm không còn bị chặn nhầm. Chép hay xóa đệ quy (`cp -r`, `rm -rf`) một cây có `node_modules` hay cả thư mục `apps` bị chặn;
- từ C1 và review của `shop` PR #79, với `seo`, vai trò đọc web ([agents.md](agents.md)): đọc và ghi ngoài dự án, kể cả thư mục temp; đọc file `.env` ở mọi cách viết Windows mở được (`.env.`, `.env/.`, `.env::$DATA`, tên ngắn như `ENV~1.DEV`) và file git bỏ qua; Grep không theo một file hay theo glob, type của code và tài liệu; WebFetch tới trang không do một WebSearch của chính lượt đó trả về, ngoài tài liệu của Google, schema.org, Next.js, web.dev và MDN. Hook PostToolUse `web-search.mjs` ghi các trang mà WebSearch trả về vào thư mục temp, nơi `seo` không ghi được;
- **gh-guard bắt nhầm lẫn, không phải ranh giới.** Nó xét chữ của lệnh, còn agent chạy dưới tài khoản Windows của bạn, nên đọc được những gì bạn đọc được: qua một script nó tự viết rồi chạy, hay một cách viết chưa có trong danh sách. Bốn vòng review PR #21 vòng nào cũng tìm thêm một cách. Đây là rủi ro bạn chấp nhận, cho tới khi token rời biến user của Windows và token CI rời khỏi máy (việc còn mở). Khóa App cũng vậy (`lib/agents/launch.mjs`): muốn giữ chúng khỏi agent thì agent phải chạy dưới một tài khoản Windows khác.
- hook của agent nạp kit ở `AO_KIT_DIR` khi biến này có. `ao-step` in một dòng `Note:` khi một file trong `lib/`, `scripts/`, `agents/`, `quality/`, `contract/` hay `tracker/` của bản chép kit khác bản ở đó (hook nạp các thư mục này, kể cả qua import; script khởi động agent và cấp token cũng lấy từ đó): kéo bản clone về đúng kit của dự án để agent chạy đúng gh-guard đã được review.

Khi bị chặn, agent nhận lý do bắt đầu bằng `gh-guard:`, kèm cách làm đúng, ví dụ dùng `ao-pr.mjs`.

Hai điều nên biết khi chạy agent:

- **`--allowedTools` không phải lớp chặn.** Nếu `defaultMode` trong `~/.claude/settings.json` là `auto`, `claude -p` vẫn cho chạy lệnh nằm ngoài `--allowedTools` (phát hiện ở T18). Hook thì chặn ở mọi chế độ quyền, vì hook trả `deny` là lệnh không chạy.
- **Dòng ghi công AI.** Theo mặc định, Claude Code dặn agent thêm dòng `Co-Authored-By` vào commit và dòng ghi công vào PR. `.claude/settings.json` của kit đặt `"attribution": { "commit": "", "pr": "" }` để tắt việc này.

`gh-guard` đọc lệnh theo mẫu, nên một agent cố tình vẫn có thể lách. Các lớp không phụ thuộc vào máy bạn là Restrict của Jira, environment `merge-gate`, `merge-gate` và `audit`.

**`gh-guard` chặn nhầm lẫn, không phải ranh giới quyền.** Phiên agent chạy dưới user Windows của bạn. Vì vậy nó đọc được file key của hai App, và một script do agent tự viết vẫn mua được token `ao-dev`, kể cả quyền Workflows, và lấy được cả token `gh` của bạn qua `gh auth token`. Với token đó, agent làm được mọi việc như bạn trên GitHub: approve, merge, tạo nhánh release và tag. Đây là rủi ro bạn chấp nhận tới khi agent chạy dưới tài khoản Windows riêng (Pilot 3, spec 2.9 mục 5). Từ T15b (review của ao-pilot PR #14), `gh-guard` từ chối thêm:

- lệnh đặt, export hay xóa các biến danh tính của phiên (`GIT_CONFIG_*`, `GIT_ASKPASS`, `GH_TOKEN` …), cả `env -i` và các biến đó trong PowerShell;
- chương trình `git-credential-*`;
- shell đọc lệnh từ stdin, và lệnh PowerShell đã mã hóa.

Lệnh trong `powershell -Command`, `pwsh -Command` và `cmd /c` được kiểm như lệnh thường. Script do agent tự viết rồi chạy (`bash x.sh`, `node x.mjs`) thì `gh-guard` không đọc.

Các việc sau còn để ngỏ, vì cần bạn quyết:

- **Lớp chặn phía server cho `develop` và `main`:** ruleset cần repo public hoặc GitHub Pro. Khi chưa có, `merge-gate`, `audit` và hook `pre-push` là các lớp chặn còn lại.
- **App riêng cho quyền Workflows,** chỉ `devops` dùng. Khi đó key của `ao-dev` không còn mở được workflow.
- **Đưa `--go` ra khỏi luật `allow`** của `.claude/settings.json`. Khi đó Claude Code hỏi bạn trước mỗi lần chạy agent, kể cả khi model của phiên chính bị văn bản trên Jira hay PR dẫn dắt.
- **Đưa key và login của bạn ra khỏi tầm của agent:** chạy agent dưới một tài khoản Windows riêng (`ao-agent`), không có keyring, credential git, khóa SSH hay token Jira của bạn. Bạn chấp nhận rủi ro này tới 2026-12-31 (Pilot 3, Phiên 31 · Lượt 15); `ao-agent` làm ngay sau Pilot 3 (spec 2.9 mục 5).
- **`GH_TOKEN` của phiên hết hạn sau 1 giờ.** Lượt dài hơn sẽ hỏng ở các lệnh `gh` sau giờ đầu; `git` và `ao-pr.mjs` thì không, vì chúng mua token mỗi lần.

## Ruleset

`npm run gh:protect -- --repo <owner>/<name> --merge-app-id <id>` chạy từ repo kit, bằng `gh` của bạn; `ao-kit setup github` tự chạy lệnh này, với id của App `ao-merge` lấy từ `github.apps.merge_id` của `project.yaml`. Lệnh áp năm ruleset (Pilot 3, spec 2.9):

| Ruleset | Nhánh hay tag | Luật | Ai được bỏ qua |
|---|---|---|---|
| `ao-protected-merge` | `develop`, `release/*` | Bắt buộc qua PR, một approve của code owner, bỏ approve cũ khi có push mới, bốn check của `CI` | App `ao-merge`, chỉ khi merge PR |
| `ao-protected-main` | `main` | Như dòng trên | Không ai |
| `ao-release-branches` | `release/*` | Chặn tạo nhánh | Admin của repo (bạn) |
| `ao-release-tags` | tag `v*` | Chặn tạo, sửa, xóa tag | App `ao-merge` và admin của repo (bạn) |
| `ao-protected` | `develop`, `main`, `release/*` | Chặn xóa nhánh và force push | Không ai |

- **Chỉ approve của bạn được tính.** File `.github/CODEOWNERS` ghi `* @<login của bạn>`, lấy từ `github.approvers` của `project.yaml`; `ao-kit sync` và `init` viết file này, và nó là đường dẫn được bảo vệ. Trước vòng 2 của review `shop` PR #13, một approve của bất kỳ ai có quyền ghi đều được tính. Khóa của `ao-dev` và `ao-review` cùng nằm trên máy, nên agent có thể mở PR bằng App này, approve bằng App kia, rồi merge. "Require approval of the most recent push" vẫn tắt: GitHub tính bạn là người push cuối ở các PR phiên chính push bằng git của bạn, và approve cũ đã bị bỏ khi có push mới.
- **Vì sao App `ao-merge` được bỏ qua trên `develop` và `release/*`:** `merge-gate` merge bằng App này cả những PR không có approve trên GitHub: PR tài liệu của Epic sau gate ② (bạn duyệt trên Jira), PR report của `/ao-ship` vào nhánh release, PR merge ngược `main` về `develop`. Mọi PR vào `main` là bản release hay hotfix đã có approve của bạn, nên `main` không ai được bỏ qua.
- **Vì sao không phải `ao-dev`:** ở Phiên 30 · Lượt 9, quyền bỏ qua thuộc về `ao-dev`, nhưng mọi agent có quyền ghi git đều cầm token của App này. Review của `shop` PR #13 chỉ ra rằng một agent bị văn bản lạ dẫn dắt có thể lấy token đó, rồi merge một PR chưa ai duyệt. Key của `ao-merge` chỉ nằm trong environment `merge-gate`.
- **Chỉ bạn cắt nhánh release và gắn tag hotfix.** `/ao-release` tạo `release/vX.Y.0` bằng login `gh` của bạn; `/ao-ship` của hotfix gắn tag bằng login `gh` của bạn; `merge-gate` gắn tag sau release bằng `ao-merge`. Agent không tạo được nhánh release ở một commit chưa ai review, và không tạo được tag mà phép kiểm của PR merge ngược tin vào. Kiểm thật trên repo nháp: `RepositoryRole 5` là vai trò admin.
- **Bot vẫn bị giữ:** `merge-gate` chỉ merge PR đạt đủ cổng của nó: PR report chỉ được đổi `docs/releases/vX.Y.Z.md` và `CHANGELOG.md`, và phải là đúng một commit trên đầu nhánh release; PR merge ngược chỉ được merge khi đầu nhánh `main` là commit của một tag `vX.Y.Z`, và mọi commit nó mang về qua được `audit`. Nó lấy token trước, đọc lại PR ngay trước lệnh merge, bỏ qua nếu đích hay đầu đã đổi, và đọc lại lần nữa sau khi merge: PR rơi vào một đích khác thì lượt chạy báo đỏ. `audit` của deployer kiểm lại đúng các điều đó, và không nhận commit nào không qua PR. Không ai push thẳng lên `develop`, `main` hay `release/*` được, kể cả bot.
- Lệnh viết các ruleset mới trước, rồi mới bỏ các luật PR khỏi `ao-protected`, nên một repo đã có ruleset cũ không lúc nào bị bảo vệ lỏng hơn. Ruleset `ao-protected-release` của Pilot 3, T9 bị xóa sau cùng. Chạy lại thì cập nhật các ruleset đang có theo tên, không tạo bản trùng.

Repo private ở gói Free không có ruleset (API trả 403). Khi đó lệnh in `soft mode: merge-gate and audit enforce the gates`, không đổi gì, và thoát với mã 0.

## Phút Actions

Với repo private, GitHub tính phút theo từng job, làm tròn lên một phút. Gói Free có 2.000 phút mỗi tháng. Số đo trên `ao-pilot` ở T19:

| Sự kiện | Phút |
|---|---|
| Một lần chạy `CI` (bốn job) | 4 |
| Một lần push lên PR: `CI`, rồi `jira-sync` và `merge-gate`, mỗi workflow hai lần | 8 |
| Một báo cáo review, hoặc một lần bạn approve: `jira-sync` và `merge-gate`, mỗi workflow một lần | 2 |
| Merge và deploy: `CI`, `Deploy`, `jira-sync` ba lần, `merge-gate` hai lần | 11 |

Một vòng chuẩn gồm: mở PR, sửa một lần, `reviewer` và `security` báo cáo ở cả hai vòng, bạn approve một lần, rồi merge và deploy. Vòng đó tốn 2 × 8 + 5 × 2 + 11 = 37 phút, nên 2.000 phút đủ cho khoảng 54 vòng mỗi tháng. Vòng của PR #4 có bốn lần push và sáu lần review hoặc approve, nên tốn 55 phút.

`jira-sync` và `merge-gate` chiếm 33 trên 55 phút đó. Mỗi lần chạy chỉ mất 10 đến 20 giây nhưng vẫn bị tính tròn một phút, và `merge-gate` chạy sau mọi lần `jira-sync` và mọi lần `CI`. Repo public thì GitHub không tính phút cho Actions. Muốn tiết kiệm, hãy gom các bản sửa vào ít lần push hơn. Nếu vẫn vượt ngân sách, có thể gộp job hoặc bớt trigger (spec mục 12).

## GitHub CLI trên máy bạn

Kit đã kiểm với `gh` 2.103.3. Nên dùng bản 2.102.0 trở lên, vì:

- bản 2.102.0 vá mọi security advisory của `gh` đã công bố tới tháng 10 năm 2026. Bản 2.16.1, dùng tới Checkpoint 4, dính 9 advisory;
- trước 2.73.0, `gh pr view <n>` không kèm `--json` bị lỗi, vì GitHub đã tắt Projects (classic);
- `gh auth token` có từ 2.17. Với bản cũ hơn, kit đọc token qua `gh auth status --show-token`.

Ba việc nên làm:

1. **Để token trong keyring.** Từ 2.26.0, `gh auth login` cất token vào keyring của hệ điều hành; trên Windows là Windows Credential Manager. Các lần đăng nhập cũ hơn để token trong `hosts.yml`, không mã hóa. `gh auth status` cho biết token nằm ở `keyring` hay trong file. Nếu nằm trong file, hãy chạy lại `gh auth login`. Keyring chỉ chặn chương trình của tài khoản Windows khác: một script do agent tự viết, chạy dưới tài khoản của bạn, vẫn gọi được `gh auth token`, như `ao-step` vẫn gọi. Đây là rủi ro bạn đã chấp nhận tới khi agent chạy dưới tài khoản Windows riêng (Pilot 3, spec 2.9 mục 5).
2. **Tắt telemetry nếu không muốn gửi.** Từ 2.91.0, `gh` mặc định gửi telemetry. Lệnh `gh config set telemetry disabled` tắt nó.
3. **Xem git đang dùng token nào trước khi thu hồi token của `gh`.** Khi đăng nhập, `gh` hỏi `Authenticate Git with your GitHub credentials?`. Nếu chọn Yes trong khi git dùng Git Credential Manager, `gh` chép token của nó vào Git Credential Manager. Từ đó, thu hồi token của `gh` cũng làm `git push` lỗi. Việc này đã xảy ra ở Checkpoint 4; cách sửa là đăng nhập lại Git Credential Manager bằng `git credential-manager github login`.

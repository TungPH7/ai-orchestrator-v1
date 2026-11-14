# Kiểm thật: Pilot 3 (B4)

## T1 (2026-11-14)

Spec, plan, todo và nhật ký Phiên 30 · Lượt 1–4 merge ở kit PR #279 (`6208701`). Câu 3 trả lời ở Lượt 5: bản sao backup kéo về máy bạn.

## T2: tiền đề (2026-11-14, Phiên 30 · Lượt 5)

1. **Chỗ đọc host Production.** Chỉ `lib/release/caddy.mjs` đặt basic auth theo môi trường. Smoke test gọi thẳng container trong mạng của VPS (`smoke.mjs`); `qa` chỉ chạy trên Development và Staging (`qa.mjs`, `steps.mjs`); `doctor` không chạm VPS, chỉ in mẫu cho `deployer.yaml`; deployer ghi `environment_url` làm đường dẫn. Vậy `production_auth` chỉ đổi `caddySites`.
2. **Đường của `SMP-27`** (T20 của B1, áp cho `SHOP-5`): Task tạo bằng token CI, nhãn `ao-devops`; token CI bấm được `Refine`; trường Agent ghi DevOps Engineer, `Start` qua Rovo MCP bằng token agent; `ao-pr create` mở PR nháp dưới tên bot `ao-dev`, cần các biến `AO_*` của `.claude/settings.json`; CI xanh; `/ao-review <PR>` (`pr-ready`, `reviewer`, `security`); merge; `jira-sync` đưa item sang Ready for QA; `/ao-qa`; bạn Accept. Ở B1, `qa` cho kết quả NOT TESTED và không chạy lại được từ In QA; lỗi kit này vẫn mở.
3. **E2E của `shop` trên Development:**
   - **Chạy như `/ao-qa` thì hỏng trước khi có test nào chạy:** `playwright.config.ts` luôn dựng mọi app tại chỗ (`webServer`), kể cả khi test chạy trên môi trường. `api` gọi `docker compose up` cho Postgres, nên khi Docker tắt thì Playwright dừng: "Process from config.webServer was not able to start". File này đến từ profile (`profiles/base-pnpm`, `profiles/next-nest`), sau `init` thì thuộc dự án. **Sửa:** profile chỉ dựng app tại chỗ khi có test `@local`; `SHOP-5` đưa bản sửa vào `shop` (thêm vào T4 và T5).
   - **Bỏ `webServer` để đo:** 9 test đạt, 8 test đỏ. Đỏ: 4 test đăng nhập (`auth.spec.ts`, chờ Epic đăng nhập); 2 test sản phẩm (`products.spec.ts`) và 1 test a11y của trang Products, mock bằng MSW trong server của template; `product-crud.spec.ts` của `admin`. Bốn test cuối chờ Epic "Danh mục sản phẩm".
   - **Mật khẩu basic auth trong tiến trình Claude Code là bản cũ.** `AO_ENV_AUTH` của tiến trình có từ trước lần đổi mật khẩu ở B2; biến người dùng của Windows có bản mới. Với bản cũ, mọi trang trả 401; với bản mới, `shop-dev` trả 307 sang `/en`, `shop-admin-dev` và `/api/v1/health` trả 200. Khi chạy `ao-step` cho `qa`, mình truyền giá trị đọc từ biến người dùng của Windows (không in ra). Khởi động lại VS Code thì tiến trình mới có bản đúng.
4. **Biến của profile Spring:** `application-staging.yml` và `application-prod.yml` không đòi biến nào thêm. `application.yml` cần `SPRING_PROFILES_ACTIVE`, `DB_HOST`, `DB_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, đúng như `env` của `api` trong `deploy.yaml`. Staging dùng `staging`, Production dùng `prod`.
5. **VPS** (khoảng 13:17 giờ Việt Nam): RAM còn trống 2.486 MB trên 3.915 MB; đĩa còn trống 23 GB (đã dùng 40%); build cache 6,55 GB, 1,62 GB dọn được; 16 container chạy; `/var/backups/ao` 28 KB. `api` của `shop` vẫn `unhealthy` (việc của `SHOP-5`).
6. **`age` và `sftp`:**
   - VPS (Ubuntu 24.04): `apt` có `age` 1.1.1, chưa cài.
   - npm: `age-encryption` 0.3.1, của FiloSottile (tác giả `age`), phụ thuộc `@noble/*` và `@scure/base`. Dùng được trong Node ở cả VPS lẫn máy bạn, và test được trong `npm test`. Chọn giữa hai cách ở T6.
   - Máy bạn: Windows OpenSSH 9.5p1; `sftp` nhận `-b <file>` và `-i <key>`.

### Checkpoint 1: đạt

Sửa plan và todo: T4 thêm `playwright.config.ts` của profile; T5 đưa bản sửa đó vào `shop`, cùng 8 test chờ Epic (4 test đăng nhập chờ Epic đăng nhập).

## Chặng 1: kit và `SHOP-5`

- **T3, T4** merge ở kit PR #280 (`b255449`): `production_auth`; `/ao-preview` kết thúc bằng trạng thái thay cho dòng `STOP:`; `playwright.config.ts` của profile `base-pnpm` chỉ dựng app tại chỗ cho test `@local` khi chạy trên môi trường; `userSecret` đọc biến người dùng của Windows trước (T2 mục 3). 1.404 test.
- **T5, `SHOP-5`** (Task, nhãn `ao-devops`):
  - tạo bằng token CI; `Refine` bằng token admin của bạn, kèm comment nguồn duyệt (spec 2.1, Lượt 2), vì contract giao `Refine` của Task ngoài Epic cho người; trường Agent DevOps Engineer; `Start` qua Rovo MCP bằng token agent (`scratchpad/shop5-open.mjs`). In Progress.
  - Phiên chính viết trên `feature/SHOP-5-scaffold-fixes`: `SecurityConfig` mở `/actuator/health/liveness` và `/readiness`, có `ActuatorProbesIntegrationTest`; `playwright.config.ts` theo kit; 8 E2E bỏ qua trên môi trường bằng `test.skip(` kèm `reason:` trên cùng dòng.
  - Prettier lúc commit tách `test.skip(` và chuỗi `reason:` ra hai dòng, nên luật suppression sẽ đỏ. Sửa bằng hàm `isLocal` để mỗi lời gọi nằm gọn một dòng; luật suppression chạy tại máy không báo gì.
  - Spotless đòi định dạng lại hai file Java: `mvnw.cmd spotless:apply` với đường dẫn đầy đủ (T2 của B3).
  - E2E trên Development, Docker tắt: 9 đạt, 8 bỏ qua, không dựng app nào tại chỗ.
  - PR #10 do bot `ao-dev` mở; CI xanh (62 test Java, trước là 59).
  - `/ao-review 10`: `reviewer` (xhigh, 28 lượt, 5,6 phút, 1,38 USD) 5 Low; `security` (max, vì PR chạm `SecurityConfig`; 37 lượt, 8,9 phút, 2,14 USD) không finding. Cộng 3,52 USD.
  - Năm Low không sửa trên PR này, vì head mới phải review lại. Hai Low của `playwright.config.ts` sửa ở kit (T6b dưới đây). Ba Low còn lại đi cùng Epic đầu, vì Epic viết lại chính các test đó: `isLocal` lặp ở 4 file; test của probe nên kiểm thêm `/actuator/health/db` trả 401; `reason:` trỏ `SHOP-5` thay vì Epic chưa có.
  - Gate ③: mình approve bằng login `gh` của bạn (câu 5); `merge-gate` merge `28394b8`.
  - Deployer deploy `28394b8` lên Development trong 10 phút; container `api` lần đầu `healthy`.
  - `/ao-qa SHOP-5` (`qa`, high, 31 lượt, 3,9 phút, 0,92 USD): **NOT TESTED**. Sáu mục PASS, trong đó E2E trên Development 9 đạt, 8 bỏ qua trong 25 giây, không dựng app nào tại chỗ. Mục "`docker inspect` của `api` là `healthy`" cần VPS, mà `qa` không vào được, nên `qa` gắn cờ Needs you (comment 10245). `gh-guard` chặn lệnh đầu của `qa` vì lệnh có tên biến mật khẩu; `qa` chạy lại không có biến đó.
  - Phiên chính kiểm trên VPS lúc 07:31 UTC: `healthy`, FailingStreak 0. Comment bằng chứng, gỡ cờ và nhãn bằng token admin. `SHOP-5` ở In QA, chờ bạn `Accept`.
  - **Bài học cho kit:** Verification của một Task cho `qa` không được có bước chỉ vào được VPS. Cách sửa để sau: deployer chờ HEALTHCHECK của Docker báo `healthy` (khi image có HEALTHCHECK) và ghi vào status của deployment, để `qa` đọc được từ GitHub.
  - Chi phí agent của `SHOP-5`: 4,44 USD.
  - Lượt 6: bạn bảo bấm `Accept`; token admin chuyển `SHOP-5` sang Done (resolution Done), kèm comment nguồn. **T5 xong.**

## Chặng 2: ba môi trường và `v0.1.0`

- **T6** merge ở kit PR #281 (`dbbf318`): bản mã hóa của `ao-backup` (`age-encryption` 0.3.1, X25519, theo luồng), `vps/sshd-aobackup.conf`, `scripts/ao-backup-pull.mjs`, dòng mới của `doctor`, mục 16 của `docs/vps-setup.md`. 1.417 test.
- **T6b, hai Low của review `shop` PR #10** trong `playwright.config.ts` của profile: chỉ coi là chạy trên môi trường khi mọi app công khai có URL; `@local` chỉ tính ở dạng tag, không tính `user@localhost`.
- **T7, VPS** (khoảng 14:10, `scratchpad/t7-vps.sh`, chạy bằng root):
  - kit lên `dbbf318`, bản trước ở `/opt/ao/kit.prev`;
  - `staging.env`, `staging.db.env`, `production.env`, `production.db.env` của `shop`: mật khẩu hex 64 ký tự và `AUTH_SECRET` 64 ký tự sinh trên VPS, chỉ in tên biến và độ dài; profile `staging` và `prod`; `root:aodeploy 640`;
  - nhóm và user `aobackup` (nologin), `authorized_keys` có `restrict`, `60-aobackup.conf`; `sshd -T` cho `aobackup`: chroot `/var/backups/ao-offsite`, `internal-sftp -R`, không TTY, không chuyển cổng; root không đổi;
  - `deployer.yaml`: `production_auth: true` cho `shop`, khối `backup:` với khóa công khai; bản sao lưu ở `/root/deployer.yaml.<ngày-giờ>.bak`;
  - `tick --dry-run`: chỉ báo sẽ viết lại Caddyfile; timer chạy lại;
  - `ao-backup`: thêm dump `071020Z` (15.235 byte) và hai bản mã hóa (15.443 và 15.435 byte), `root:aobackup 640` trong thư mục `0750`, gốc `root:root 755`;
  - RAM còn trống 2.597 MB.
- **T8, máy bạn:**
  - khóa `age` ở `%USERPROFILE%\.ao\ao-backup.agekey` (không in), key `%USERPROFILE%\.ssh\ao_backup_pull` (không passphrase), `Host ao-backup` thêm vào `~/.ssh/config` (bản cũ lưu ở scratchpad);
  - `pull` lần đầu: 2 bản về `D:\ao-backups`; lần hai: 0 bản;
  - `aobackup` thử `put`, `rm`, `mkdir`: đều `Permission denied`; `ssh` vào: "This service allows sftp connections only.";
  - khôi phục thật: giải mã `shop-development-20261114T071020Z.dump.age`; SHA-256 trùng bản trên VPS (`2d88c1dd…`); Postgres tạm trên Docker của máy bạn (không mạng, đúng digest của `deploy.yaml`) khôi phục trong 674 ms: 3 bảng, 6 dòng, Flyway 1–3; `restore-check` trên VPS cũng 3 bảng, 6 dòng. Container tạm và bản giải mã đã xóa; Docker Desktop đã tắt;
  - task `ao-backup-pull` của Windows: hằng ngày 09:00 và lúc đăng nhập, `StartWhenAvailable`; chạy thử trả 0.
- **Fix Version** `v0.1.0` (id 10006) và `v0.2.0` (id 10007) tạo qua REST bằng token admin (`scratchpad/shop-versions.mjs`).
- **Bước kiểm của `/ao-release`** (Lượt 6): điểm cắt `28394b8`; `v0.1.0` gồm `SHOP-5` (Done); code của `SHOP-1`–`SHOP-4` (Cancelled, không Fix Version) đi cùng, vì đó là phần scaffold; hai Fix Version chưa Release. Chờ gate ④ của bạn.
- **T9, gate ④** (Lượt 7, bạn duyệt): `/ao-release v0.1.0 28394b8 --go` tạo `release/v0.1.0` tại `28394b8` và gắn Fix Version. Deployer deploy Staging (deployment `7784679035`, success 08:00:42 UTC):
  - dùng lại image của Development (`2a2cb61d…`, cùng cây code), không build lại;
  - tạo `ao-shop-staging-db`; Flyway chạy 3 migration, đều thành công; `api` `healthy`;
  - RAM còn trống 2.290 MB khi `shop` có Development và Staging. Bộ nhớ: `api` 279–296 MiB, `user` 53–72 MiB, `admin` 11–12 MiB, database 42–44 MiB mỗi môi trường.
- **`/ao-ship v0.1.0`** (Lượt 7): `qa` regression trên Staging (high, 13 lượt, 0,43 USD): **PASS**, 9/9 test chạy đạt (8 test bỏ qua có lý do như ở Development); `devops` viết release notes (13 lượt, 0,50 USD). Bước script `release-pr` dừng: GitHub trả 422 khi bot `ao-dev` cập nhật `refs/heads/release/v0.1.0`, "Changes must be made through a pull request. 4 of 4 required status checks are expected".
  - **Nguyên nhân:** ruleset `ao-protected` (spec `quality-gates` 2.8, do `setup github` đặt cho repo public) bảo vệ `develop`, `main`, `release/*`, đòi PR có 1 approve và 4 check, không có bypass. Ruleset này có trước `release-workflow`; mọi dự án trước chạy "soft mode" (repo private gói Free không có ruleset), nên các bước tự động của `release-workflow` chưa từng gặp nó.
  - **Cũng sẽ bị chặn:** `merge-gate` merge PR tài liệu của Epic sau gate ② (chỉ có duyệt trên Jira) và PR merge ngược `main` về `develop` (không ai approve trên GitHub). `merge-gate` merge bằng token của App `ao-dev`.
  - Chờ bạn chọn cách sửa (Lượt 7).
  - **Lượt 9: bạn chọn cách 1, tách ruleset thành ba** (`lib/quality/ruleset.mjs`, `scripts/gh-protect.mjs` nhận `--dev-app-id`, `setup github` truyền `github.apps.dev_id`; `docs/quality-gates.md` mục Ruleset). Lệnh tạo hai ruleset có PR trước, rồi mới thu hẹp `ao-protected`.
  - Kit PR #284 (`ceee70c`). `gh-protect --repo TungPH7/shop --dev-app-id 5514949`: tạo `ao-protected-merge` (id 27256309) và `ao-protected-release` (id 27256310), rồi thu hẹp `ao-protected` (id 27192121) còn cấm xóa và force push. Đọc lại qua API: đúng nhánh, đúng luật, bypass `Integration:5514949` ở chế độ `pull_request` và `always`.
  - Chạy lại `/ao-ship v0.1.0`: chỉ còn bước `release-pr`, không gọi lại agent. Bot `ao-dev` commit `e471c93` (chỉ `CHANGELOG.md` và `docs/releases/v0.1.0.md`) lên `release/v0.1.0` và mở PR #11 vào `main` (100 file, vì `main` mới có commit đầu). CI của PR #11 xanh cả năm check. Staging tự deploy lại `e471c93`, thành công. Chờ gate ⑤ của bạn.
- **Gate ⑤** (Lượt 10, bạn approve PR #11): `merge-gate` merge `ac7a63c` vào `main`, gắn tag `v0.1.0`, mở PR #12 merge ngược `main` về `develop` và tự merge khi CI xanh. Đây là lần đầu `merge-gate` merge một PR không có approve trên GitHub dưới ruleset mới: chạy đúng.
- **Production** (deployment `7785170368`, success 08:47:36 UTC): `ao-shop-production-{user,admin,api,db}`, `api` `healthy`, Flyway 3 migration. Không đăng nhập: `shop.ao.t2g.io.vn/en` và `shop-admin.ao.t2g.io.vn` trả 401; có đăng nhập: 200, và `/api/v1/health` qua `admin` 200. Production của `ao-sample` vẫn mở (200).
- **RAM với ba môi trường của `shop` cùng `ao-pilot`, `ao-sample`** (22 container, cộng 1.422 MiB): còn trống 1.867 MB trên 3.915 MB; B3 ước khoảng 1,7 GB. Đĩa còn 23 GB; build cache 7,07 GB, quá mốc `PRUNE_CACHE` 4 GB. Đề xuất giữ VPS 4 GB.
- **Backup ba database:** `ao-backup` ghi dump của Production, Staging, Development (15.235–15.246 byte) và ba bản sao mã hóa; máy bạn kéo về 3 bản. Bản sao Production giải mã trên máy bạn trùng SHA-256 với bản trên VPS (`efab6842…`). Tiêu chí 2 đạt cho cả ba môi trường.

- **Release `v0.1.0` trên Jira** (Phiên 31 · Lượt 1, bạn nhờ mình làm): như T18 của B1, một script dùng token admin của bạn (`scratchpad/shop-release-v010.mjs`). Nó kiểm mọi item của Fix Version đã Done (chỉ có `SHOP-5`, Done), rồi gọi `PUT /rest/api/3/version/10006`: `released: true`, `releaseDate` 2026-11-14, mô tả là nguyên văn `.ai/runs/v0.1.0/fix-version.md` do `devops` viết (1.616 ký tự, đọc lại khớp từng ký tự).

### Checkpoint 3: đạt

`v0.1.0` chạy trên Production và hỏi basic auth; RAM ba môi trường đo được; bản sao trên máy bạn khôi phục được; Fix Version `v0.1.0` đã Release. Chi phí agent của chặng 1–2: 5,38 USD.

## Chặng 3: Epic tới gate ②

- **T10, chép kit `ceee70c` vào `shop`** (Phiên 31 · Lượt 1: bạn chọn review đầy đủ, khoảng 9 USD):
  - Task `SHOP-6` "Chép kit Pilot 3 (ceee70c) vào shop, trước Epic đầu" (nhãn `ao-devops`), đi như `SHOP-5`: tạo bằng token CI; `Refine` bằng token admin, kèm comment nguồn duyệt (plan T10, Phiên 31 · Lượt 1); trường Agent DevOps Engineer; `Start` qua Rovo MCP bằng token agent (`scratchpad/task-open.mjs`, `task-kit-copy-p3.json`). In Progress.
  - Clone kit chuyển sang `main` (`ceee70c`) trước khi chép, để commit ghi đúng bản kit. Nhánh ghi chép `task/pilot3-7` chỉ khác `main` ở `tasks/` và `misc/`, hai thư mục không được chép.
  - `ao-kit sync e-commerce/shop --key SHOP-6`, 24 giây: commit `d3ed768` trên `feature/SHOP-6-kit-copy`, 15 file, +405/−64, đều trong `.ai-orchestrator/`: 12 file `lib/`, `scripts/ao-step.mjs`, `package.json` và `package-lock.json` (`age-encryption` 0.3.1, 8 mục trong lockfile). Render cho ra đúng các file cũ, nên `.claude/` và workflow không đổi. Kit chỉ chép `docs/sdlc.md` và các script dự án dùng, nên tài liệu khác và script chỉ chạy từ kit (`ao-backup-pull.mjs`, `gh-protect.mjs`) không vào dự án.
  - `ao-kit check`: OK. `ao-kit doctor`: mọi dòng đạt, trừ "Docker is running" (Docker Desktop tắt, không liên quan).
  - PR nháp #13 do bot `ao-dev` mở (`ao-pr.mjs create`). CI khởi động trong vòng 1 phút, xanh đủ năm check.
  - `/ao-review 13`: dòng kiểm GO với `pr-ready`, `reviewer` (`xhigh`), `security` (`max`, vì PR chạm `.ai-orchestrator/`). Lượt chạy thật bắt đầu 16:11, xong 16:45, 8,13 USD. Kết thúc bằng `STOP: the reports on the head of PR #13 ask for changes (Critical or High: security 2)`; `SHOP-6` về In Progress.
    - `reviewer` (`xhigh`, 41 lượt, 8 phút, 2,08 USD): Medium 1, Low 4. 15 file khớp kit `ceee70c` từng byte. Medium: App `ao-dev` bypass ruleset trên `develop`, `main` (`pull_request`) và `release/*` (`always`), mà đó cũng là danh tính của agent dev. Low: test của `backupsToKeep` không chốt mốc đúng 48 giờ (`<=` thành `<` vẫn xanh); skill `ao-preview` không nói gì về kết quả trạng thái mới; `pulledCopyAges` dừng `doctor` khi `backup-pull.json` hỏng; `age-encryption` được cài cả ở dự án, nơi không file nào import nó.
    - `security` (`max`, 54 lượt, 25 phút, 6,06 USD): **High 2**, Low 1, Request changes.
      - **High, ruleset:** mọi role `git: write` (`ba`, `ux`, `sa`, `fe-dev`, `be-dev`, `devops`) nhận token `ao-dev` có `contents: write` qua credential helper, và lấy được token bằng lệnh `gh-guard` cho qua. Với bypass, token đó merge PR vào `develop`, `main` không cần approve hay CI, và ghi thẳng `release/*`. Commit lọt vào `main` còn về `develop` qua back-merge, mà `merge-gate` và `audit` chỉ đòi CI xanh cho back-merge. Job `merge-gate` chạy code của `develop` với `AO_DEV_APP_KEY` và `JIRA_CI_TOKEN`, nên token 1 giờ đổi được thành khóa dài hạn. Đề xuất: một App riêng cho `merge-gate`, khóa chỉ nằm trong environment `merge-gate`; bỏ `ao-dev` khỏi bypass; report của `/ao-ship` đi qua PR; kiểm cả commit back-merge mang về.
      - **High, bản sao backup:** identity `age` nằm ở `%USERPROFILE%\.ao\ao-backup.agekey`, cùng user Windows mà agent chạy; `gh-guard` cho mọi role Read identity, Read bản sao, chạy `decrypt` và `curl` gửi file đi. Agent bị lái lấy được mọi bản dump Production. Đề xuất: identity không nằm trên user đó (chỉ `decrypt` cần, đọc từ stdin); giữ bản sao trên máy theo hạn của VPS.
      - **Low:** `parseListing` nhận bản sao có thời điểm trong tương lai, nên một VPS bị chiếm làm dòng `doctor` xanh mãi và cài bản "mới nhất" giả.
    - Phiên chính kiểm lại hai High bằng chính `checkAgentCall` của kit (`scratchpad/guard-probe.mjs`): `GIT_TRACE_REDACT=0 GIT_TRACE_CURL=1 git push`, `node -e` gọi `git credential fill`, `curl -X PUT …/merge`, `curl -X PATCH …/refs/heads/release/…`, Read và `cat` file `.agekey`, Read bản sao, `curl --data-binary @…` đều ALLOW; chỉ `git credential fill` gõ thẳng bị chặn. Hai High đúng.
    - **Lỗi của mình:** ở Lượt 9 (Phiên 30), lúc đề xuất tách ruleset, mình chỉ tính tới `merge-gate` mà quên agent cũng cầm token `ao-dev`. Ở T8, plan đã ghi "khóa bí mật của `age` cất ngoài laptop" nhưng mình để khóa chính trên laptop và chỉ nhắc bạn cất thêm một bản.
- **T11, chuẩn bị** (song song với review của T10, không agent):
  - bước kiểm của `/ao-intake`: space `SHOP` chưa có Epic nào; WIP epic-shaping 0/1;
  - ba app hiểu giá theo ba cách: `api` lưu `NUMERIC(12,2)` với chú thích USD; `admin` dùng `priceCents` (xu USD) và `inStock`; `user` dùng `priceVnd`, `originalPriceVnd` và `images` theo API NestJS cũ. Câu hỏi PO đầu tiên là đơn vị tiền.
- **Lượt 2 (Phiên 31), bạn: "Làm như đề xuất", "đã cất khóa"** (đồng ý a–e và thêm khoảng 4–8 USD cho review vòng 2):
  - **a:** `scratchpad/ruleset-nobypass.mjs` đọc rồi ghi lại hai ruleset của `shop` với `bypass_actors: []`, giữ nguyên luật và nhánh. Đọc lại: `ao-protected-merge` (27256309, `develop`, `main`) và `ao-protected-release` (27256310, `release/*`) không còn ai bypass; `ao-protected` (27192121) không đổi.
  - **b:** trên máy không còn bản nào khác của khóa (tìm `AGE-SECRET-KEY-1` trong `%USERPROFILE%\.ao`, `.ssh`, `D:\ao-backups` và các scratchpad: chỉ ra mã nguồn của gói `age` và hướng dẫn của mình). Task `ao-backup-pull` chỉ chạy `pull`, không dùng khóa. `%USERPROFILE%\.ao\ao-backup.agekey` đã xóa (`shred -u`). Khóa bạn cất sẽ được kiểm ở lần khôi phục thử với `decrypt` đọc khóa từ stdin; nếu sai thì đổi khóa mới, vì VPS vẫn giữ các bản dump chưa mã hóa.
  - **c, bước đầu:** kit nhánh `task/pilot3-8`: loại App `merge` (`<owner>-ao-merge`: `contents`, `pull_requests`, `workflows` ghi, không đọc gì thêm), commit `7bfcb81`, 1.418 test. Trang tạo App chạy ở `127.0.0.1:47100`, chờ bạn bấm Tạo và Install; khóa ghi vào scratchpad, sẽ đưa vào environment `merge-gate` rồi xóa.
- **T11, câu 1:** giá là đồng Việt Nam, số nguyên, hiển thị `1.250.000 ₫` ở cả hai ngôn ngữ. `Intl.NumberFormat` cho `vi-VN` ra `1.250.000 ₫`, còn `en-US` ra `₫1,250,000`, nên trang tiếng Anh cũng định dạng theo `vi-VN`. Các trường và cách tìm, sắp xếp: bạn giao mình làm theo chuẩn ngành (Baymard, Shopify, Google Merchant Center).
- **Lượt 3 (Phiên 31):** bạn tạo App và trả lời câu 2.
  - **App `ao-merge`:** `tungph7-ao-merge`, id 5756976, cài trên `shop` (installation 181873485). Khóa ghi vào scratchpad, đưa lên secret `AO_MERGE_APP_KEY` của environment `merge-gate` bằng `gh secret set --env`, rồi xóa (`shred -u`). Environment `merge-gate` chỉ cho nhánh `develop` (custom branch policy). Secret cũ `AO_DEV_APP_KEY` vẫn ở đó, cho tới khi `merge-gate` chuyển sang App mới.
  - **T11, câu 2:** chưa có ảnh thật; mọi sản phẩm dùng ảnh giữ chỗ chung theo design system (chữ cái đầu của tên trên nền màu).
  - **Bản nháp Epic** `shop/.ai/intake/20261114-1725-danh-muc-san-pham.md` (17.772 ký tự): phạm vi theo câu 1–2 và chuẩn ngành; ba điểm mở có đề xuất (giao diện sáng, thứ tự "Liên quan nhất", 5 sản phẩm thử trên Production trước gate ④); mục Reference Design với 5 ảnh và bảng token của `tokens.md`; Original Request trích lời bạn ở Phiên 30 · Lượt 2, 5 và Phiên 31 · Lượt 2, 3. Chờ bạn OK rồi mới tạo trên Jira.
- **Lượt 4 (Phiên 31), bạn: "OK".** Bước 5 của `/ao-intake`:
  - `createJiraIssue` của Rovo MCP nhận markdown, nhưng chỉ dựng bảng khi mô tả ở dạng HTML. Vì vậy 94 dòng bảng token của bản nháp được đổi thành danh sách, giữ nguyên giá trị.
  - Epic **`SHOP-7` "Danh mục sản phẩm"** tạo một lần bằng token agent (`scratchpad/epic-create.mjs`): New, người tạo `orchestratoragent`. Đọc lại qua REST bằng token CI (`scratchpad/epic-read.mjs`): 32 heading đúng thứ tự của template, 2 khung trích dẫn, 34 danh sách, 15.119 ký tự chữ.
  - `ao-step status SHOP-7`: `New; no docs branch`, `Next: Click Start spec on SHOP-7`.
  - 5 ảnh chép từ `.ai/design-inbox/_reference/` vào `.ai/design-inbox/SHOP-7/`.
  - Chờ bạn bấm `Start spec`. `/ao-spec SHOP-7` chạy sau khi `SHOP-6` merge.
- **T10a, kit sửa theo review của `shop` PR #13** (spec 2.9; nhánh `task/pilot3-8`, 0 USD agent), test viết đỏ trước:
  - App `ao-merge` (`7bfcb81`): loại App `merge` trong `app-manifest.mjs`, chỉ ghi `contents`, `pull_requests`, `workflows`.
  - Ruleset và cài đặt (`c3419dd`): hai ruleset thay cho ba; chỉ `ao-merge` đi tắt `ao-protected-merge`, và chỉ khi merge PR; `gh-protect --merge-app-id` xóa `ao-protected-release`; `setup github --merge-app-key-file` đưa key vào `AO_MERGE_APP_KEY` của environment `merge-gate`; `project.yaml` có `github.apps.merge`, `merge_id` (đi cùng nhau), render ra `AO_MERGE_APP`, `AO_MERGE_APP_ID`.
  - `merge-gate` và `audit` (`f340edf`): `merge-gate` merge bằng `ao-merge` (dự án chưa có App này thì dùng `ao-dev` và in cảnh báo); PR merge ngược chờ tới khi đầu nhánh `main` là commit của một tag `vX.Y.Z` (tag nhẹ; tag annotated không được tính); PR report `release-notes/vX.Y.Z` vào `release/vX.Y.Z` được merge khi `ao-dev` mở, chỉ đổi report và changelog của đúng bản đó, CI xanh; PR report đổi file khác thì cần bạn. `audit` kiểm đúng các điều đó, nhận người merge là `ao-merge`, `ao-dev` hoặc bạn, và bỏ luật cho commit thẳng của `ao-dev` trên nhánh release. Luật CI `policy` nhận tên `release notes: vX.Y.Z`. Workflow `merge-gate` truyền `AO_MERGE_APP_KEY` (giữ `AO_DEV_APP_KEY` cho dự án chưa có `ao-merge`). `deployer.yaml` có thêm `apps.merge`.
  - `/ao-ship` (`2c8d495`): bot `ao-dev` commit report lên `release-notes/vX.Y.Z`, mở PR vào nhánh release, chờ `merge-gate` merge tối đa 15 phút (`waitForMerge`), rồi mới mở PR release.
  - Khóa backup và các Low (`9a9c0aa`): `decrypt --identity -` đọc khóa từ stdin; `keygen` nhắc chuyển khóa vào trình quản lý mật khẩu; `pull` không kéo bản sao mang thời điểm ở tương lai (lệch quá 5 phút) và giữ trên máy đúng các bản VPS giữ (`toPrune` theo `backupsToKeep`); `copyAges` bỏ bản ở tương lai, tuổi không âm; `pulledCopyAges` trả `{ broken }` khi file trạng thái hỏng, `doctor` báo đỏ thay vì dừng; `doctor` báo đỏ khi thấy `*-ao-merge.pem` trong `ao-keys` hoặc `.agekey` trong `%USERPROFILE%\.ao\`, và khi dự án chưa có `ao-merge`; `gh-guard` chặn agent với `.agekey`, `.dump.age`, `ao-backups`, `ao-backup-pull` (Bash và Read); test chốt mốc đúng 48 giờ (đổi `<=` thành `<` thì đỏ); skill `ao-preview` có chỉ dẫn cho kết quả trạng thái.
  - Tài liệu (`e74f1e9`): `quality-gates.md` (environment `merge-gate`, `gh-guard`, Ruleset), `github-apps-setup.md` mục 8, `release-workflow.md` bước 7–8, `vps-setup.md` mục 16, `getting-started.md` bước 4 và 6, README.
  - Không sửa: gói `age-encryption` vẫn được cài trong dự án (Low của `reviewer`): đúng thiết kế, kiểm chuỗi cung ứng không thấy rủi ro.
  - Năm lệnh kiểm xanh, 1.439 test (trước là 1.418).
  - `doctor` chạy thật trên `shop`: hai dòng khóa mới xanh trên máy này; dòng `ao-merge` đỏ đúng như dự kiến, vì `project.yaml` của `shop` chưa có App này.
- **T10b, áp bản sửa** (Phiên 31 · Lượt 4):
  - Kit PR #285 merge (`18d79eb`), CI xanh (contract, profiles).
  - `npm run gh:protect -- --repo TungPH7/shop --merge-app-id 5756976`: cập nhật `ao-protected-merge` (27256309) và `ao-protected` (27192121), xóa `ao-protected-release` (27256310). Đọc lại: `ao-protected-merge` phủ `develop`, `main`, `release/*`, bypass duy nhất `Integration:5756976:pull_request`; `ao-protected` không ai bypass.
  - VPS (`scratchpad/t10-vps.sh`, bằng root): kit lên `18d79eb`, bản trước ở `/opt/ao/kit.prev`; `apps.merge: tungph7-ao-merge` thêm vào `/etc/ao/deployer.yaml` (bản sao lưu ở `/root`); `tick --dry-run` không có việc; mã băm Caddyfile trước và sau như nhau (`4f0f02a42c51`); timer chạy lại, các lần tick sau đó kết thúc bình thường. RAM còn trống 1.883 MB.
  - PR #13: commit thứ hai `6489d52` `chore(kit): copy the kit at 18d79ebe (SHOP-6)` (`scratchpad/recopy-kit.mjs`: các bước của `ao-kit sync` trên chính nhánh này, để review vòng 2 chỉ đọc phần mới). 21 file: kit, `project.yaml` thêm `github.apps.merge` và `merge_id`, `.claude/settings.json` thêm `AO_MERGE_APP` và `AO_MERGE_APP_ID`, skill `ao-preview`, workflow `merge-gate.yml`. `ao-kit check` đạt; `doctor` đạt mọi dòng trừ Docker (tắt cố ý), kể cả `AO_MERGE_APP_KEY` của `merge-gate`. Mô tả PR có thêm mục cho commit thứ hai.
- **T10c, review vòng 2 của PR #13** (head `6489d52`, 17:57–18:47): 11,18 USD, vượt mức 4–8 USD đã ước. Tổng review của T10 là 19,31 USD; chi phí agent của Pilot 3 tới giờ là 24,69 USD.
  - `reviewer` (`xhigh`, 3,00 USD): Medium 3, Low 6. Medium: `/ao-ship` dùng lại PR report đang mở mà không so nội dung, và không kiểm nhánh release sau khi merge; `gh-guard` không kiểm `Grep` và `Glob` (lỗ có từ trước với `KEY_FILE`); mô tả `SHOP-6` lệch với PR (phiên chính đã viết lại mô tả và tên item, kèm comment, bằng token CI). Low: `mergers` và `writers` luôn nhận `ao-dev`; `KEY_FILE` thiếu `MERGE`; `age-encryption` cài trong dự án (lặp lại); comment cũ trong `gates.yaml`; đoạn trải `previous_filename` lặp ở năm chỗ; lý do skip của merge back và mặc định của `strayKeys`.
  - `security` (`max`, 104 lượt, 31 phút, 8,18 USD): **High 2** (cả hai ghi "needs verification"), Medium 2, Low 2, Request changes.
    - **High, PR report qua nhánh release giả:** không luật nào cấm tạo `release/*`, nên agent cầm token `ao-dev` tạo `release/v9.9.9` ở một commit chưa review, mở PR report chỉ đổi CHANGELOG vào đó, rồi đổi đích PR sang `develop` giữa lúc `merge-gate` đọc và lúc merge (lệnh merge chỉ ghim head). Đề xuất: chỉ bạn tạo `release/*` (luật `creation`, admin bypass; `/ao-release` cắt bằng login `gh` của bạn); đọc lại PR ngay trước khi merge; `main` không ai bypass.
    - **High, approval của App:** `ao-protected-merge` đòi một approval của bất kỳ ai có quyền ghi. Khóa của `ao-dev` và `ao-review` đều trên máy, nên agent mở PR bằng App này, approve bằng App kia, rồi merge. Thảo luận cộng đồng GitHub (#181487) xác nhận review của một GitHub App được tính. Lỗ này có từ khi kit dùng ruleset (`quality-gates` 2.8). Đề xuất: `require_code_owner_review` với `.github/CODEOWNERS` `* @TungPH7`, và `require_last_push_approval`.
    - **Medium, tag không được bảo vệ:** agent đẩy được tag `v*`, nên kiểm tra "đầu `main` là commit của tag" lấy gốc tin cậy từ chỗ agent ghi được. Đề xuất: ruleset cho `refs/tags/v*` (tạo, sửa, xóa), bypass `ao-merge` và admin.
    - **Medium, `toPrune` theo giờ trong tên:** VPS bị chiếm thả bản giả mang giờ muộn hơn trong các ngày đã qua; bản giả thành bản mới nhất mỗi ngày, mỗi tuần, và máy xóa bản thật cũ hơn 48 giờ. Thử: 28 bản thật, 28 bản giả, còn 2/9 bản thật mà dòng `doctor` vẫn xanh. Đề xuất: không để tên do VPS đặt quyết định việc xóa trên máy.
    - **Low:** PR report đang mở được dùng lại mà không so nội dung (trùng Medium của `reviewer`); `decrypt --out` ghi bản giải mã ra file mà agent đọc được.
  - `/ao-review` dừng: `STOP: the reports on the head of PR #13 ask for changes (Critical or High: security 2)`. `SHOP-6` về In Progress.
- **T10d, kit sửa theo vòng 2** (Phiên 31 · Lượt 5, bạn: "Có. Làm như đề xuất"; nhánh `task/pilot3-9`, 0 USD agent), test viết đỏ trước:
  - **Kiểm thật trước:** trên repo nháp `TungPH7/test` (`scratchpad/ruleset-probe.mjs`), ruleset chặn tạo `release/*` và tag `v*` với bypass `RepositoryRole 5`: login của bạn tạo được `release/v0.0.1` và tag `v0.0.1`; cùng ruleset không bypass thì GitHub từ chối (422). Ruleset, nhánh, tag thử đều đã xóa; repo nháp không còn ruleset nào.
  - Năm ruleset (`e0d53fa`):
    - `ao-protected-merge` (`develop`, `release/*`) đòi approval của code owner, chỉ `ao-merge` bypass khi merge PR;
    - `ao-protected-main` cùng luật, không ai bypass;
    - `ao-release-branches` chặn tạo `release/*`, admin bypass;
    - `ao-release-tags` chặn tạo, sửa, xóa tag `v*`, bypass là `ao-merge` và admin;
    - `ao-protected` cấm xóa và force push.
  - Cùng commit `e0d53fa`:
    - `.github/CODEOWNERS` do `ao-kit init` và `sync` viết từ `github.approvers`; được bảo vệ; `doctor` kiểm nó;
    - `/ao-release` cắt nhánh bằng login `gh` của bạn;
    - `merge-gate` đọc lại PR ngay trước khi merge;
    - `/ao-ship` so PR report đang mở với bản vừa dựng, và kiểm lại nhánh release sau khi merge;
    - `audit` chỉ nhận người merge là `ao-merge` (hay `ao-dev` khi dự án chưa có `ao-merge`) và bạn;
    - `gh-guard` kiểm `Grep`, `Glob` (matcher và luật) và key `AO_MERGE_APP_KEY`;
    - `pull` thôi xóa bản sao trên máy; `decrypt --out -`;
    - `touchedPaths` dùng chung; lời báo của merge back nêu đủ người mở được nhận; `doctor` hỏi khi không đọc được file khóa; comment của `gates.yaml`.
  - **Lệch so với đề xuất:** `require_last_push_approval` vẫn tắt. GitHub tính bạn là người push cuối ở các PR phiên chính push bằng git của bạn (`SHOP-5`, `SHOP-6`), nên khi bật thì approval của bạn không được tính ở các PR đó. `dismiss_stale_reviews_on_push` cùng luật code owner đã đủ.
  - Tài liệu (`99f971e`): spec 2.9 mục 4, `quality-gates.md` (Ruleset), `release-workflow.md` (gate ④), `vps-setup.md` mục 16, `getting-started.md`.
  - Năm lệnh kiểm xanh, 1.444 test (trước là 1.439).
- **T10e, áp bản sửa vòng 2** (Phiên 31 · Lượt 5):
  - Kit PR #286 merge (`e95ffa5`), CI xanh.
  - `npm run gh:protect -- --repo TungPH7/shop --merge-app-id 5756976` từ kit `e95ffa5`: tạo `ao-protected-main` (27262065), `ao-release-branches` (27262067), `ao-release-tags` (27262068); cập nhật `ao-protected-merge` (27256309, nay chỉ `develop` và `release/*`, đòi approval của code owner) và `ao-protected` (27192121). Đọc lại:
    - `ao-protected-merge`: bypass duy nhất `Integration:5756976:pull_request`;
    - `ao-protected-main`: không ai bypass;
    - `ao-release-branches`: bypass `RepositoryRole 5` (admin);
    - `ao-release-tags`: bypass `RepositoryRole 5` và `Integration:5756976`, cả hai `always`.
  - VPS (`scratchpad/t10-vps.sh`, bằng root): kit lên `e95ffa5`, bản trước ở `/opt/ao/kit.prev`; `apps.merge` đã có từ T10b; mã băm Caddyfile trước và sau như nhau (`4f0f02a42c51`); timer chạy lại; RAM trống khoảng 1,9 GB.
  - PR #13: commit thứ ba `cd37612` `chore(kit): copy the kit at e95ffa5a (SHOP-6)`, 17 file, +166/−73:
    - kit `e95ffa5`;
    - `.github/CODEOWNERS` mới, `* @TungPH7`;
    - luật dự án thêm `.github/CODEOWNERS` vào các đường dẫn được bảo vệ;
    - matcher của `gh-guard` trong `.claude/settings.json` thêm `Grep|Glob`.
  - CI xanh đủ năm check. Mô tả PR có thêm mục cho commit thứ ba, kể cả điểm lệch `require_last_push_approval`.
  - Dòng kiểm của `/ao-review 13`: GO; `reviewer` (`xhigh`) đọc cả PR, `security` (`max`) chỉ đọc phần đổi từ `6489d52` (`review-delta`, 239 dòng).
- **T10f, review vòng 3 của PR #13** (head `cd37612`, 19:36–20:13): 8,52 USD, dưới mức 10–12 USD đã ước. Tổng review của T10 là 27,83 USD; chi phí agent của Pilot 3 tới giờ là 33,21 USD.
  - `reviewer` (`xhigh`, 39 lượt, 9,7 phút, 2,93 USD): Approve; Medium 2, Low 4.
    - Medium: `main` và `release/v0.1.0` chưa có `.github/CODEOWNERS`, mà GitHub đọc file ở nhánh đích, nên trên `main` luật code owner chưa có ai để đòi.
    - Medium: mô tả `SHOP-6` còn ghi kit `18d79eb`. Phiên chính viết lại tên và mô tả theo `e95ffa5` và năm ruleset, kèm comment, bằng token CI (`scratchpad/task-kit-copy-p3-v3.json`, `task-update.mjs --summary`).
    - Low: `gh-guard` còn hai lối (`cd ~ && cat .ao/...`; `Grep` thư mục home tìm `PRIVATE KEY`); `merge-gate` mua token sau lần đọc lại; hai câu chú thích cũ (`releaseCut`, `devops.md`); `age-encryption` (lặp lại).
  - `security` (`max`, review-delta, 45 lượt, 25,5 phút, 5,59 USD): **High 2**, Low 3, Request changes.
    - **High mới, login GitHub của bạn:** agent chạy dưới user Windows của bạn. Script agent tự viết gọi `gh auth token` (đúng cách `readGitHubToken` lấy token) hay `git credential fill`, và lấy credential của bạn mà không có lời hỏi. Sau vòng 2, chỉ approval của bạn được tính và chỉ admin tạo `release/*`, tag `v*`, nên ai cầm login đó thì GitHub coi là bạn. Đề xuất: chạy agent tách khỏi user Windows của bạn (user riêng, hoặc WSL2 có sandbox), như mục còn để ngỏ của `docs/quality-gates.md`; trong lúc chờ, ghi rủi ro vào spec, sửa comment của `ruleset.mjs` và đoạn về keyring.
    - **High của vòng 2, còn mở:** chưa nhánh được bảo vệ nào có `CODEOWNERS`. Sau merge `develop` có; `main` chờ bản release kế tiếp; `release/v0.1.0` không bao giờ có. Lối còn mở: hai App merge commit X vào `main`, rồi lần merge ngược sau bản release kế tiếp mang X về `develop`. Đề xuất: đưa `CODEOWNERS` lên `main` và `release/v0.1.0` bằng PR bạn approve, hoặc để `merge-gate` từ chối merge ngược khi `main` có commit chưa qua bạn; `doctor` đọc file trên các nhánh qua API.
    - **Đã sửa:** nhánh release giả (năm ruleset đang chạy khớp code, đọc bằng GET).
    - **Low:** khe giữa lần đọc lại và lệnh PUT (đổi base kéo `develop` về bản cũ; đề xuất PR report chỉ có một commit, cha là `base.sha`); `gh-guard` chỉ xét chuỗi của `Grep`, `Glob`; `GET /pulls/{n}/files` trả tối đa 3.000 file (đề xuất so với `changed_files`).
  - `/ao-review` dừng: `STOP: SHOP-6 is flagged Needs you by the rework limit`. `SHOP-6` về In Progress, gắn cờ.
  - Merge khi còn High không được: `audit` của deployer đòi báo cáo không còn Critical hay High mở (`reportGaps`). Nó sẽ từ chối deploy Development của commit merge và gắn cờ `SHOP-6`; các commit sau trên `develop` cũng bị chặn cho tới khi có `/ao-rollback`. Kit chưa có cách ghi việc bạn chấp nhận rủi ro.
  - **Lỗi của mình:** ở Lượt 4, mình đề xuất dồn quyền về login của bạn mà không nói login đó cũng nằm trong tầm của agent, theo cùng cách khóa App bị lấy.
- **Lượt 7–15 (Phiên 31):** bạn hỏi lại cho rõ hai High; bạn chấp nhận High 1 (agent lấy được login GitHub của bạn), làm tài khoản Windows `ao-agent` sau Pilot 3, hạn 2026-12-31 (Lượt 15). Lượt 16: "bắt đầu", dặn sửa cho kỹ vì đã ba vòng review.
- **T10g, kit sửa theo vòng 3** (spec 2.9 mục 5; nhánh `task/pilot3-10`, 0 USD agent), test viết đỏ trước:
  - **Chấp nhận một High:** `findingId` (8 ký tự hex từ Where và Finding), `acceptedRisks` (dòng `Accept risk: <id> until <YYYY-MM-DD>: <lý do>` trong quyết định mới nhất của bạn trên commit đầu, là approve; hạn không trước ngày cần giữ, không quá 90 ngày sau ngày approve; có lý do), `stillBlocking` (High đã chấp nhận thôi chặn, Critical luôn chặn). `merge-gate` tính theo hôm nay; `audit` theo ngày merge; `/ao-review` in mã của finding còn chặn và cách chấp nhận. Một dòng sai thì lý do hiện trong dòng `Waiting`.
  - **Merge ngược:** `auditBroughtBack` kiểm từng commit PR mang từ `main` về, trên dòng cha thứ nhất, bằng `decideAudit` như khi deploy, dừng ở commit đầu tiên hỏng; PR từ 250 commit trở lên thì hỏng luôn. `merge-gate` nhận hàm này từ script và chờ khi không có nó; `audit` kiểm lại đúng điều đó.
  - **`doctor`:** đọc `.github/CODEOWNERS` trên `main` và các nhánh release còn có commit mà `main` chưa có, qua API.
  - **Low:** `merge-gate` lấy token trước lần đọc lại, đọc lại sau khi merge và báo đỏ nếu PR rơi vào đích khác; PR report phải là một commit trên đầu nhánh release (`onReleaseHead`), `/ao-ship` dựng lại nhánh report khi nhánh release đã đi tiếp; `merge-gate` và `audit` không tin danh sách file bị cắt ở 3.000; `gh-guard`: `Grep`, `Glob` chỉ đọc trong dự án và thư mục temp, không tìm `PRIVATE KEY` hay `AGE-SECRET-KEY`, `.ao` nhận ra sau dấu cách hay dấu nháy, ổ đĩa không kèm `/` (`C:notes.txt`) tính là ngoài dự án; hai câu chú thích cũ.
  - **Kiểm thật** (`scratchpad/rename-probe.mjs`, repo nháp `TungPH7/test`): đổi tên một nhánh thành `release/v0.0.3` bị luật `creation` chặn (422), như tạo thẳng. Ruleset và nhánh thử đã xóa; repo nháp không còn ruleset nào, chỉ còn `main`.
  - **Tài liệu:** spec 2.9 mục 5; `quality-gates.md` (mục chấp nhận rủi ro, merge ngược, `gh-guard`, keyring, việc còn để ngỏ); `release-workflow.md`; comment của `ruleset.mjs` không còn nói GitHub giữ được agent.
  - Năm lệnh kiểm xanh, 1.465 test (trước là 1.444).
  - **Cách làm từ giờ** (bạn nhắc ở Lượt 16): trước mỗi vòng review trả phí, mình đọc lại từng dòng báo cáo vòng trước; lập danh sách các chỗ bản sửa trao quyền (ai approve, ai merge, ai tạo nhánh và tag, code nào chạy cùng secret) và ai với tới được chúng; nói gốc chung ngay khi có; sửa cả Low.
- **T10h, áp bản sửa vòng 3** (Phiên 31 · Lượt 16):
  - Kit PR #287 merge (`05da881`), CI xanh (contract, profiles).
  - VPS (`scratchpad/t10-vps.sh`, bằng root): kit lên `05da881`, bản trước ở `/opt/ao/kit.prev`; tick thử không có việc; mã băm Caddyfile trước và sau như nhau (`4f0f02a42c51`); timer chạy, các tick sau kết thúc bình thường; RAM trống 1.880 MB. `audit` của deployer nhờ vậy biết các High đã chấp nhận trước khi PR #13 merge.
  - PR #13: commit thứ tư `3ef07c6` `chore(kit): copy the kit at 05da881b (SHOP-6)`, 13 file, +258/−57 (kit và `.claude/agents/devops.md`).
    - `ao-kit check` đạt. `doctor` đạt 31 dòng, đỏ hai dòng: Docker (tắt cố ý), và dòng mới "`.github/CODEOWNERS` is on main and on the open release branches", chỉ nêu `main`, chờ bản `v0.1.1`. `release/v0.1.0` đã nằm trong `main`, nên không bị tính là nhánh còn mở.
    - CI xanh đủ năm check. Mô tả PR có thêm mục cho commit thứ tư (`ao-pr.mjs edit`).
  - `SHOP-6`: comment ghi quyết định của bạn ở Lượt 15 và 16, rồi gỡ cờ Needs you và nhãn `needs-you` bằng token CI (`scratchpad/item-unflag.mjs`, hàm `clearFlag` của kit). Item ở In Review.
  - Dòng kiểm của `/ao-review 13`: GO. `reviewer` (`xhigh`) đọc cả PR; `security` (`max`) review đầy đủ, vì phần đổi từ báo cáo đầy đủ gần nhất (`6489d52`) là 530 dòng, quá ngưỡng 300. Ước 10–12 USD, cao hơn mức 6–9 USD đã nói ở Lượt 15. Bắt đầu khoảng 22:35.
- **T10i, review vòng 4, merge và QA** (Phiên 31 · Lượt 16):
  - `reviewer` (`xhigh`, 42 lượt, 11,2 phút, 3,08 USD): Approve; Medium 2, Low 6.
    - Medium: kit trên `develop` chưa in mã của finding, nên `reviewer` tính sẵn từ báo cáo vòng 3 và nhắc tính lại trên báo cáo cuối; mô tả `SHOP-6` và câu `Kit review:` của PR còn lệch. Phiên chính sửa cả hai, không đổi commit.
    - Low: dòng `Accept risk` bị bỏ qua không báo (nêu Critical, hay viết trong trích dẫn, chữ đậm); luật tìm khóa của `gh-guard` chặn nhầm lệnh hợp lệ mà vẫn lách được, `Glob` với `../`; đọc lại PR release sau merge mà lỗi thì mất tag và merge ngược; `audit` và `merge-gate` xét danh sách file bị cắt khác nhau; comment của `decideShip`; `age-encryption` (lặp lại).
  - `jira-sync` gắn lại cờ (mức 3) ngay sau báo cáo của `reviewer`, nên `/ao-review` dừng trước `security`. Phiên chính gỡ cờ lần hai rồi chạy `security`. Đây là lỗi của kit, sửa ở kit PR #288.
  - `security` (`max`, review đầy đủ vì phần đổi từ báo cáo đầy đủ gần nhất là 530 dòng, quá ngưỡng 300; 8,07 USD): High 1, Medium 2, không Low.
    - High: đúng High đã chấp nhận, mã `72ec4e38` (khác mã vòng 3 vì báo cáo đầy đủ viết lại finding; `security` tự tính và thử).
    - Medium: `CODEOWNERS` chưa có trên `develop`, `main`, `release/v0.1.0`; khóa `age` đi qua clipboard và script của kit khi khôi phục trên máy agent chạy dưới tài khoản của bạn.
    - Ghi nhận ngoài PR: `JIRA_CI_TOKEN` là secret của cả repo, nên workflow mà agent thêm vào PR của nó đọc được.
    - `gh-guard` từ chối hai lệnh của `security`: `git tag -l` (vai trò chỉ đọc theo roster), và một lần sửa báo cáo có tên biến của khóa.
  - Vòng 4 tốn 11,15 USD (ước 10–12). Tổng review của T10: 38,98 USD.
  - Kiểm trước khi approve (`scratchpad/accept-check.mjs`, bằng mã kit `05da881` mà VPS chạy): không có lần approve thì còn ba điều chặn; có lần approve kèm `Accept risk: 72ec4e38 until 2026-12-31: …` thì không còn gì.
  - Phiên chính approve PR #13 bằng login của bạn, kèm dòng chấp nhận (`scratchpad/approve-shop13.md`, 16:23:15Z), sau cả hai báo cáo; rồi merge squash: `fdc2ee0`, người merge `TungPH7`, 16:23:51Z.
  - Deployer: `audit` cho qua `fdc2ee0`; Development deploy thành công lúc 23:27 (deployment `7790343641`).
  - `jira-sync` đưa `SHOP-6` sang Ready for QA, kèm cờ mức 4 (do báo cáo `security` yêu cầu sửa). Phiên chính gỡ cờ kèm comment, rồi chạy `/ao-qa SHOP-6`.
  - `qa` (`high`, 1,20 USD): NOT TESTED. V1, V2, V3, V5, V6 và checklist đạt (E2E: 9 đạt, 8 bỏ qua có lý do, như `SHOP-5`); V4 cần quyền admin để đọc `bypass_actors`. Phiên chính đọc bằng login của bạn: năm ruleset đúng như spec. Kết quả ghi lên `SHOP-6`, cờ đã gỡ, item chờ bạn Accept.
  - Chi phí agent của `SHOP-6`: 40,18 USD; của Pilot 3 tới giờ: 45,56 USD.
  - Kit PR #288: các Low của `reviewer` vòng 4, `jira-sync` gắn cờ một lần cho mỗi mức, hướng dẫn khôi phục backup. Vào `shop` với bản chép kit sau.
- **Lượt 6 (Phiên 31), bạn: "Đã start spec"; hỏi kiểm khóa `age` làm sau được không:**
  - `ao-step status SHOP-7`: Specifying, chưa có nhánh docs; `Next: /ao-spec SHOP-7`, chạy sau khi `SHOP-6` merge.
  - Kiểm khóa đã cất: bạn làm sau. Đây không phải điều kiện của tiêu chí 2, vì lần khôi phục thật từ bản sao đã đạt ở T8. Việc kiểm chỉ để chắc bản trong trình quản lý mật khẩu, nay là bản duy nhất của khóa, là đúng. Nên làm trước T17; T19 nhắc lại.

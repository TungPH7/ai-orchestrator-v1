# SPEC: project-scaffold

> **Trạng thái:** đã duyệt 2026-11-12 (Phiên 27 · Lượt 154), cả năm câu ở mục 9 theo đề xuất. Plan: [tasks/plan.md](tasks/plan.md). Spec này viết chi tiết **phần 1 (B1)**. Phần 2 (B2) và phần 3 (B3) mới có phạm vi (mục 4); mỗi phần sẽ có spec chi tiết riêng, bạn duyệt trước khi phần đó bắt đầu. Nguồn: hàng B1–B3 của [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md), mục "Đầu vào cho `project-scaffold`" của [tasks/archive/pilot-1/verification.md](tasks/archive/pilot-1/verification.md), và yêu cầu của bạn ở Lượt 105 và Lượt 153.

## 1. Mục tiêu

Hiện nay, cài kit vào một dự án là 9 bước chép tay trong `README.md`. Pilot 1 đếm được 20 bước, trong đó 6 bước chỉ bạn bấm được trên giao diện. Cấu hình của dự án nằm rải ở bốn chỗ: `.claude/settings.json`, `.ai-orchestrator/deploy.yaml`, `.ai-orchestrator/preview.yaml` và `.ai-orchestrator/roster.local.yaml`. Cập nhật kit trong dự án cũng chép tay, bằng một script tạm.

Phần 1 làm bốn việc:
1. **Một file cấu hình dự án**, nơi khai repo, app, Jira, GitHub và role tùy chọn (2.1).
2. **Lệnh `ao-kit`** để dựng mới, cài vào repo đang có, cập nhật kit, dựng GitHub và Jira, và kiểm còn thiếu gì (2.2–2.5).
3. **Profile Next.js + NestJS**, tức stack của `ao-sample` hiện nay (2.6).
4. **Hướng dẫn cài và dùng kit**, đi theo ví dụ cụ thể: dự án mới từ thư mục trống, dự án đang phát triển, và một tính năng lớn từ ý tưởng tới Production (2.7). Đây là yêu cầu của bạn ở Lượt 105 và Lượt 153.

Xong phần 1, một người chưa biết kit đọc hướng dẫn rồi làm theo được từ đầu tới cuối, không cần hỏi Claude bước nào làm trước.

### 1.1 Giả định

Bạn sửa ngay nếu điều nào sai:
1. Kit vẫn là repo riêng (`ai-orchestrator-v1`), clone về máy; `ao-kit` chạy từ bản clone đó. Kit không phát hành lên npm.
2. Một dự án vẫn là **một repo** (trường hợp 1, 2 của concern 1). File cấu hình khai danh sách repo, nhưng phần 1 chỉ nhận đúng một.
3. Stack mặc định là monorepo npm workspaces, app trong `apps/<tên>`; profile phần 1 là Next.js + NestJS.
4. Máy làm việc là Windows với Git Bash, như hiện nay; lệnh viết sao cho chạy được cả trên Linux và macOS.
5. Hướng dẫn viết bằng tiếng Việt, cho dev chưa biết kit, và dùng lại ví dụ thật đã chạy, không bịa số liệu.

## 2. Thiết kế phần 1

### 2.1 File cấu hình dự án: `.ai-orchestrator/project.yaml`

File này nằm trong `.ai-orchestrator/`, nên đã là đường dẫn được bảo vệ: agent không sửa được, PR sửa nó do bạn merge. Ví dụ của `ao-sample`:

```yaml
name: sample                     # tên dự án trên VPS: chữ thường, số, gạch nối
jira:
  space: SMP
github:
  repo: TungPH7/ao-sample
  approvers: [TungPH7]
  apps: { dev: tungph7-ao-dev, dev_id: 123456, review: tungph7-ao-review, review_id: 123457 }
  kit_peers: [TungPH7/ao-pilot]  # repo đã review cùng bản kit (kit-copy-review)
repos:                           # phần 1 nhận đúng một repo
  - { name: ao-sample, path: . }
apps:
  web:
    repo: ao-sample
    path: apps/web
    profile: nextjs
    dev: npm run dev -w apps/web          # lệnh chạy ở máy, như preview.yaml hiện nay
    port: { env: PORT, default: 3000 }
    health: /notes
    public: true
    env: { API_URL: "http://localhost:3001" }
  api:
    repo: ao-sample
    path: apps/api
    profile: nestjs
    dev: npm run start:dev -w apps/api
    port: { env: PORT, default: 3001 }
    health: /health
roles:
  optional: []                   # role tùy chọn bật cho dự án; C1 thêm seo
claude:
  allow: []                      # luật allow riêng của dự án, ghép vào settings.json sinh ra
```

**Những gì sinh ra từ file này**, bằng `ao-kit render` (cũng chạy trong `init` và `sync`):
- mục `env` của `.claude/settings.json`: `AO_JIRA_SPACE`, `AO_APPROVERS`, `AO_DEV_APP`, `AO_DEV_APP_ID`, `AO_REVIEW_APP`, `AO_REVIEW_APP_ID`, `AO_KIT_PEERS`;
- các mục khác của `settings.json` (hook, quyền) lấy từ bản của kit. Hiện nay bản chép kit giữ nguyên `settings.json` của dự án, nên hook mới của kit không tới được dự án. Lỗi này hết khi file được sinh;
- agent của dự án, như `render-agents.mjs --project .` hiện nay.

**`preview.yaml` bỏ đi.** `/ao-preview` đọc app từ `project.yaml`: lệnh `dev`, cổng, `health` làm URL kiểm. `ao-kit sync` chuyển `preview.yaml` cũ sang.

**`deploy.yaml` giữ nguyên.** Nó là hợp đồng với deployer trên VPS, và đổi nó thì phải cập nhật kit trên VPS. `ao-kit check` đối chiếu hai file: tên app, cổng, `health`, app công khai. Lệch thì báo, và job `policy` của CI cũng báo.

**Cổng lấy từ biến môi trường.** Mỗi app đọc cổng từ biến khai ở `port.env`, có giá trị mặc định. Đây là điều kiện để C2 chạy song song hai worktree mà không tranh cổng.

**`host` để B2 dùng.** Phần 1 chưa đổi deployer, nên host của app công khai vẫn khai ở `deployer.yaml` trên VPS như hiện nay. B2 thêm `host` cho từng app khi bỏ luật D2.

### 2.2 Lệnh `ao-kit`

Một script, `scripts/ao-kit.mjs`, chạy từ bản clone kit: `node <kit>/scripts/ao-kit.mjs <lệnh> <thư mục dự án>`. Hướng dẫn gọi tắt là `ao-kit`.

| Lệnh | Làm gì | Ghi gì |
|---|---|---|
| `init <dir> --profile next-nest` | Thư mục trống: dựng khung app theo profile (2.6), rồi cài kit. Repo đang có: chỉ cài kit, không đụng code app | Khung app, `project.yaml`, mọi file của kit, `.gitignore`, script `prepare`. Không commit |
| `sync <dir>` | Chép bản kit đang có trên máy vào dự án, giữ file của dự án, sinh lại `settings.json` và agent | Một nhánh mới từ `develop` và một commit. Không push |
| `render <dir>` | Sinh lại `settings.json` và agent từ `project.yaml` | Hai chỗ đó |
| `check <dir>` | Kiểm `project.yaml`, và đối chiếu với `deploy.yaml` và `package.json` | Không ghi gì |
| `setup github <dir>` | Dựng phần GitHub làm được bằng API (2.4) | Cấu hình repo trên GitHub |
| `setup jira <dir>` | Dựng phần Jira làm được bằng API (2.4), rồi chạy `jira:check` | Cấu hình space trên Jira |
| `doctor <dir>` | Kiểm mọi thứ một dự án cần, trên máy, GitHub, Jira và Claude Code (2.5) | Không ghi gì |

Lệnh nào cũng chạy lại được nhiều lần: thấy việc đã xong thì bỏ qua và nói vậy. Khi thiếu thông tin, lệnh dừng và nói thiếu gì; không đoán. Token và mật khẩu không bao giờ được in, không đi qua tham số dòng lệnh.

### 2.3 `init` cho repo đang có

Không sửa code app nào. Lệnh:
1. đọc `package.json` để tìm workspace và app, rồi viết bản nháp `project.yaml`. Chỗ nào không tự biết được, như app nào công khai hay cổng nào, thì ghi `TODO` và in ra để bạn điền;
2. cài kit như `sync`;
3. báo những gì dự án còn thiếu để qua cổng của kit, chưa sửa:
   - bốn script `lint`, `typecheck`, `test:coverage` (ghi lcov), `build`;
   - Playwright với test E2E;
   - `Dockerfile` và `deploy.yaml`, khi dự án deploy bằng deployer;
   - nhánh `develop` và `main`;
   - quy ước commit `type(scope): subject (<KEY>)`, áp từ commit kế tiếp, không viết lại lịch sử.

Hướng dẫn nói cách làm từng việc thiếu: hoặc bạn tự làm, hoặc tạo một Task cho `devops` hay dev agent.

**Coverage:** cổng chỉ tính dòng mới đổi (`coverage-diff`), nên code cũ chưa có test không chặn PR.

### 2.4 Dựng GitHub và Jira

**GitHub** (`setup github`), bằng login `gh` của bạn:
- đặt `develop` làm nhánh mặc định;
- bật tự xóa nhánh sau merge, và Dependabot security updates (việc còn treo từ `release-workflow`);
- tạo environment `development`, `staging`, `production`, và `merge-gate` chỉ cho `develop`;
- đặt secret `JIRA_CI_TOKEN` và `AO_DEV_APP_KEY`, bằng pipe từ biến môi trường hay file, không qua tham số;
- chạy `gh:protect`.

Lệnh in từng bước bấm cho việc API không làm được: cài hai App vào repo (API trả 403 với token `gh`), và nối GitHub for Jira.

**Jira** (`setup jira`): Pilot 1 thấy token admin có scope không tạo được space (401). Trước khi viết code, task đầu kiểm một tiền đề: API token thường (không scope) của bạn có tạo được space và gán scheme của `DEMO` không.
- Được thì lệnh tạo space, gán scheme, rồi chạy `jira:check`.
- Không được thì lệnh in checklist bấm tay như `docs/jira-setup.md` hiện nay, rồi chạy `jira:check`.

Board vẫn cần bấm tay, vì Pilot 1 không tìm được API.

**Task đầu tiên cho commit đầu.** Hook `commit-msg` đòi mã Jira, nên commit đầu cần một Task. Hướng dẫn chỉ cách làm: mở `claude`, gõ `/ao-intake dựng khung dự án`, rồi commit với mã Task đó.

**Sau lần push đầu** lên repo trống, GitHub không chạy workflow theo sự kiện (Pilot 1, T7). Hướng dẫn và `doctor` nhắc đẩy thêm một commit đụng `.github/workflows/`.

### 2.5 `doctor`: dự án còn thiếu gì

`doctor` in một bảng, mỗi dòng một điều kiện, dấu đạt hay chưa đạt, và việc cần làm khi chưa đạt. Lệnh chỉ đọc. Những gì nó kiểm:
- **Máy:**
  - Node 24, `gh` từ 2.102.0, Claude Code, Git Bash;
  - các biến môi trường cần có, chỉ xét hình dạng, không in giá trị: `ATLASSIAN_AGENT_TOKEN`, `AO_DEV_APP_KEY_FILE`, `AO_REVIEW_APP_KEY_FILE`, `AO_ENV_AUTH`.
- **Repo:**
  - `project.yaml` hợp lệ;
  - file của kit đúng bản, và agent không cũ hơn nguồn;
  - hook git đã cài; `.gitignore` đủ dòng.
- **GitHub:**
  - nhánh mặc định; environment;
  - tên các secret, không đọc giá trị;
  - hai App đã cài vào repo;
  - workflow `CI` đã từng chạy.
- **Jira:** `jira:check` của space.
- **Claude Code:** thư mục đã tin cậy chưa; hai server `atlassian` và `chrome-devtools` đã được cho phép chưa.
- **VPS:** `doctor` không SSH lên VPS. Nó in đoạn `deployer.yaml` cần thêm, và hỏi bạn đã có chưa.

Hướng dẫn dùng `doctor` làm bước kiểm sau mỗi chặng: chạy tới khi mọi dòng đạt thì sang chặng sau.

### 2.6 Profile `next-nest`

Một profile gồm hai phần:
- **khung app:** file ghim trong `profiles/next-nest/files/`, lấy từ `ao-sample` nhưng bỏ tính năng ghi chú, gồm `apps/web` (Next.js), `apps/api` (NestJS), `e2e/`, `playwright.config.ts` với tag `@local`, hai `Dockerfile`, `.dockerignore`, `deploy.yaml` mẫu;
- **`profile.yaml`:** skill theo stack của `roster.local.yaml`, phiên bản Node, các app với lệnh `dev` và cổng, và việc chạy sau khi chép, như `npm install` và tải Chromium cho Playwright.

Những gì Pilot 1 đã phải sửa tay nằm sẵn trong khung:
- gỡ `@nestjs/mau`, bỏ `apps/api/AGENTS.md`;
- `typecheck` chạy `next typegen` trước `tsc`;
- Vitest cho cả hai app;
- `test:coverage` của `api` gồm cả integration test;
- `HealthController`;
- app đọc cổng từ biến môi trường.

Đổi bản Next.js hay NestJS là một PR vào kit, sửa khung ghim (câu hỏi 2, mục 9).

### 2.7 Hướng dẫn: `docs/getting-started.md`

Một tài liệu duy nhất, đọc từ trên xuống. `README.md` mục "Cài kit vào repo dự án" rút gọn, chỉ trỏ tới đây. Các phần:

1. **AO Kit là gì, ai làm gì.**
   - Bốn bên: bạn, Claude ở phiên chính, các agent, và các script trên GitHub và VPS.
   - Một sơ đồ vòng đi từ ý tưởng tới Production, đánh dấu 5 gate cần bạn duyệt và những chỗ bạn bấm trên Jira.
2. **Chuẩn bị một lần trên máy và tài khoản.**
   - Công cụ: Node, git, `gh`, Claude Code.
   - Tài khoản: Jira Cloud với hai service account, GitHub với hai App, VPS.
   - Biến môi trường: đặt bằng hộp thoại Windows, từng bước bấm.
   - Clone kit.
   - Mỗi mục ghi làm một lần cho mọi dự án, hay làm lại cho mỗi dự án.
3. **Dự án mới, từ thư mục trống.** Theo thứ tự: tạo repo GitHub, tạo space Jira, `ao-kit init`, mở `claude`, `/ao-intake` cho Task đầu, commit và push, `ao-kit setup github`, `ao-kit setup jira`, thêm dự án vào VPS, `ao-kit doctor`, CI xanh, `/ao-status`. Mỗi lệnh có:
   - ý nghĩa;
   - lúc nào gõ;
   - kết quả mong đợi, chép từ lần chạy thật;
   - nếu lỗi thì làm gì.
4. **Dự án đang phát triển.** Những gì `init` thay đổi và không đụng tới; việc còn thiếu (2.3) và cách làm từng việc; chuyển sang `develop`/`main`; PR đang mở lúc chuyển. Ví dụ là một repo có sẵn app nhưng chưa có kit (mục 7, tiêu chí 3).
5. **Một tính năng lớn, từ ý tưởng tới Production.** Ví dụ thật là Epic `SMP-23` "Ghim ghi chú", đã chạy ở T20 của human-loop. Từng bước:
   - `/ao-intake` với câu bạn đã gõ;
   - bấm `Start spec`, rồi `/ao-spec`, có ví dụ sửa SPEC trước gate ①;
   - `/ao-plan` tới gate ②, rồi `/ao-plan` lần hai;
   - `/ao-build`, `/ao-preview`, `/ao-fix` với `be:`/`fe:`;
   - `/ao-review` tới gate ③;
   - `/ao-qa`, có cả trường hợp `QA fail`, rồi `Accept`;
   - Fix Version, `/ao-release` tới gate ④;
   - `/ao-ship` tới gate ⑤;
   - Production, bấm `Release`, `Complete` Epic.

   Mỗi bước có: lệnh gõ, chuyện xảy ra, lệnh dừng ở đâu, bạn bấm gì, thời gian và chi phí thật. Phần release của `SMP-24` chưa chạy thật (câu hỏi 3, mục 9).
6. **Bảng tra lệnh.** Mỗi lệnh `/ao-*` và `ao-kit`:
   - làm gì;
   - gõ khi nào, cần gì có trước;
   - thường dừng ở đâu;
   - lệnh kế tiếp.
7. **Việc thường ngày và khi gặp sự cố:**
   - cập nhật kit trong dự án (`sync`, PR chép kit);
   - hết usage giữa chừng;
   - hotfix, rollback;
   - và trỏ sang `dev-workflow.md`, `release-workflow.md`, `quality-gates.md`, `vps-setup.md` cho phần sâu.

Ví dụ trong hướng dẫn chỉ dùng số liệu và đầu ra thật, từ T20 và từ các lần kiểm thật của module này.

## 3. Lệnh

```
node <kit>/scripts/ao-kit.mjs init <dir> [--profile next-nest]
node <kit>/scripts/ao-kit.mjs sync <dir>
node <kit>/scripts/ao-kit.mjs render <dir>
node <kit>/scripts/ao-kit.mjs check <dir>
node <kit>/scripts/ao-kit.mjs setup github <dir>
node <kit>/scripts/ao-kit.mjs setup jira <dir>
node <kit>/scripts/ao-kit.mjs doctor <dir>
```

Trong repo kit có thêm `npm run profiles:check`: dựng khung `next-nest` vào thư mục tạm, rồi chạy `lint`, `typecheck`, `test:coverage`, `build` của khung. Lệnh này chạy trong CI của kit khi PR đụng `profiles/`.

Các lệnh `/ao-*` không đổi. `/ao-preview` đọc app từ `project.yaml` thay cho `preview.yaml`.

## 4. Phần 2 và phần 3 (phạm vi, chưa chi tiết)

- **Phần 2 (B2):**
  - nhiều app công khai, mỗi app một host: bỏ luật D2 của `deploy.yaml`, deployer và Caddy theo `host` trong `project.yaml`;
  - profile React;
  - **thêm từ Lượt 153:** màn hình thiết kế bằng ảnh chụp, không cần Figma (luật D7 của `check-design` chỉ áp cho màn hình Figma); mục Design System trong `design.md` do `ux` rút từ ảnh; luật plan để `sa` thêm Task dựng design system cho `fe-dev` khi dự án chưa có;
  - hướng dẫn thêm ví dụ React.

  Xong phần 2 là có trường hợp 1.
- **Phần 3 (B3):**
  - profile Spring Boot: Gradle hoặc Maven, JaCoCo, kiểm dependency Java, dòng tắt check và path security của Java, skill cho `be-dev`;
  - deployer có trần RAM cho mỗi container và dọn build cache;
  - hướng dẫn thêm ví dụ Spring Boot.

  Xong phần 3 là có trường hợp 2, rồi tới Pilot 3 (B4).

## 5. Cấu trúc

```text
scripts/ao-kit.mjs                 # lệnh, chỉ ghép tham số và gọi lib
lib/scaffold/project-config.mjs    # đọc, kiểm project.yaml; schema trong lib/scaffold/project.schema.json
lib/scaffold/install.mjs           # init, sync: chép kit, giữ file của dự án (danh sách kit_copy của gates.yaml)
lib/scaffold/render.mjs            # settings.json, agent
lib/scaffold/setup-github.mjs      # GitHub qua gh, effect truyền vào
lib/scaffold/setup-jira.mjs        # Jira qua REST, effect truyền vào
lib/scaffold/doctor.mjs            # các điều kiện của doctor, effect truyền vào
profiles/next-nest/profile.yaml    # app, lệnh, skill, việc sau khi chép
profiles/next-nest/files/          # khung app ghim
lib/workflow/preview-run.mjs       # đọc app từ project.yaml
docs/getting-started.md            # hướng dẫn
README.md                          # mục cài kit trỏ sang hướng dẫn
tests/scaffold/                    # test của từng phần trên
```

`misc/scaffold-input/kit-copy.mjs` và `bot-git.mjs` được thay bằng `install.mjs`, rồi xóa.

## 6. Chiến lược test

`node:test`, theo mẫu của các module trước: hàm thuần, effect truyền vào.
- **`project-config`:** file hợp lệ, từng loại lỗi, bản nháp sinh từ `package.json` của một repo đang có.
- **`install`:**
  - trên thư mục tạm thật: `init` vào thư mục trống và vào một repo đang có;
  - `sync` giữ `project.yaml`, `deploy.yaml`, `roster.local.yaml`, skill của dự án, và đổi đúng các file trong danh sách `kit_copy`;
  - `preview.yaml` cũ được chuyển sang.
- **`render`:** `settings.json` sinh ra có hook mới nhất của kit và `env` từ `project.yaml`; agent giống bản `render-agents.mjs` hiện nay.
- **`setup`, `doctor`:** `gh`, REST và hệ thống file giả. Không gọi mạng trong test.
- **Profile:** `profiles:check` dựng khung thật rồi chạy bốn script của nó.
- **`/ao-preview`:** test của `preview-run` đọc app từ `project.yaml`.

## 7. Tiêu chí hoàn thành

1. Năm lệnh kiểm của kit xanh, cùng `profiles:check`.
2. **Dựng mới thật**, làm đúng theo `docs/getting-started.md`, từ một thư mục trống tới khi:
   - `doctor` báo mọi dòng đạt;
   - CI xanh trên `develop`;
   - `/ao-status` chạy được.

   Không gọi agent trả tiền. Chỗ nào hướng dẫn sai hay thiếu thì sửa hướng dẫn trước khi đi tiếp.
3. **Cài vào repo đang có thật:** một bản sao `ao-sample` đã gỡ hết file của kit, coi như repo chưa có kit. `init` báo đúng việc còn thiếu; sau khi làm xong các việc đó, `doctor` đạt và CI xanh.
4. **`sync` trên `ao-sample` thật:** đưa bản kit mới, gồm cả module này, vào `ao-sample` qua PR chép kit, review đầy đủ (câu hỏi 4, mục 9).
5. Hướng dẫn có đủ bảy phần ở 2.7. Ví dụ "từ ý tưởng tới Production" chỉ dùng số liệu thật.
6. Kit merge vào `main` qua PR, CI xanh.

## 8. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Jira không cho tạo space bằng API | Tiền đề kiểm ở task đầu; không được thì giữ checklist bấm tay, như hiện nay |
| Khung ghim cũ dần so với Next.js, NestJS mới | Đổi bản là một PR vào kit; `profiles:check` bắt lỗi khi dựng khung |
| `sync` ghi đè file dự án tự sửa | Danh sách file của kit lấy từ `kit_copy` của `gates.yaml`, mà `kit-copy-review` đã dùng; test kiểm từng file được giữ |
| `settings.json` sinh ra làm mất quyền dự án tự thêm | `project.yaml` có chỗ khai quyền thêm của dự án; `sync` báo khác biệt trước khi ghi |
| Tạo repo và space thật để kiểm làm rác tài khoản | Repo private, space riêng, có bước dọn ở cuối; xóa hay giữ do bạn quyết |
| Hướng dẫn dài, khó theo | Mỗi chặng kết thúc bằng `doctor`; bảng tra lệnh tách khỏi phần kể theo thứ tự |

## 9. Câu hỏi đã trả lời

Bạn duyệt cả năm đề xuất dưới đây ở Lượt 154.

1. **Nguồn cấu hình.** `project.yaml` làm nguồn; `settings.json` và agent sinh ra từ nó; `preview.yaml` bỏ đi; `deploy.yaml` giữ nguyên và được đối chiếu. Mình đề xuất **đồng ý**. Cách khác là gộp luôn `deploy.yaml` vào `project.yaml`, nhưng làm vậy phải cập nhật kit trên VPS ngay ở phần 1.
2. **Khung app: ghim file hay chạy công cụ sinh.** Mình đề xuất **ghim file** trong kit, lấy từ `ao-sample`. Dựng khung như vậy ra cùng một kết quả mỗi lần, nhanh, và test được trong CI. Chạy `create-next-app`, `nest new` rồi sửa thì luôn lấy bản mới, nhưng mỗi lần ra một khác, và các sửa của Pilot 1 có thể không còn khớp.
3. **Kiểm thật và chi phí.** Mình đề xuất:
   - dựng mới: một repo GitHub private mới và một space Jira mới. Phần GitHub mình làm bằng login `gh` của bạn; tạo space nếu API không cho thì bạn bấm, khoảng 40 phút;
   - repo đang có: bản sao `ao-sample` đã gỡ kit, một repo private nữa, dùng chung space mới;
   - không thêm hai dự án thử vào VPS, vì VPS chỉ có 4 GB RAM. Phần VPS của hướng dẫn đối chiếu với các bước thật của Pilot 2;
   - chạy release `v0.2.0` của `ao-sample`, gồm `SMP-24`, để ví dụ trong hướng dẫn trọn tới Production và `SMP-23` bấm Complete được. Lần `v0.1.0` tốn 1,04 USD tiền agent.
4. **Chép kit vào `ao-sample` (tiêu chí 4).** Đây là lần chép đầu sau `live-run-fixes`, có review đầy đủ, khoảng 13–23 USD. Mình đề xuất làm ở cuối phần 1, theo câu 2 của spec `live-run-fixes`.
5. **Tiền đề Jira.** Kiểm xem API token thường (không scope) có tạo được space không, thì cần một token mới của bạn, đặt làm biến môi trường; token không qua chat. Mình đề xuất **thử một lần**. Nếu bạn không muốn tạo token mới, mình bỏ bước này và giữ checklist bấm tay.

## Nguồn

- [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md), hàng B1–B4; [misc/thao-luan/kit-voi-stack-khac-va-nhieu-repo.md](misc/thao-luan/kit-voi-stack-khac-va-nhieu-repo.md), câu 2.
- [tasks/archive/pilot-1/verification.md](tasks/archive/pilot-1/verification.md), mục "Đầu vào cho `project-scaffold`".
- [tasks/archive/pilot-2/verification.md](tasks/archive/pilot-2/verification.md), T4 (thêm dự án vào VPS) và T8 (`/ao-ship v0.1.0`).
- [tasks/archive/human-loop/verification.md](tasks/archive/human-loop/verification.md), T20: ví dụ `SMP-23`, `SMP-24`.
- `README.md`, mục "Cài kit vào repo dự án"; `misc/scaffold-input/`.
- Phiên 27 · Lượt 105, 152, 153, [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md).

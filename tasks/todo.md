# Task: release-workflow

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-release-workflow.md](../SPEC-release-workflow.md). Làm theo thứ tự. Mỗi task viết test đỏ trước, commit riêng, rồi mới đánh dấu `[x]`.

**Quy ước chung cho mọi task:**

- Xong task thì `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check` và `npm run agents:check` phải xanh.
- Quy tắc mới của `npm run validate` có một test dương và ít nhất một fixture âm trong `tests/fixtures/quality/invalid/` hoặc `tests/fixtures/release/invalid/`.
- Test không gọi mạng, không gọi Docker. Dữ liệu mẫu của module nằm trong `tests/fixtures/release/`.
- Task có nhãn **[bạn]** cần bạn làm một phần trên GitHub, Jira, trang DNS, trang của nhà cung cấp VPS hay trong terminal của bạn. Claude ghi rõ từng bước bấm rồi dừng chờ.
- Key, token và mật khẩu không bao giờ xuất hiện trong chat, commit, log, tham số dòng lệnh hay lịch sử lệnh (plan, quyết định 7).
- Chỉ phiên chính của Claude dùng SSH vào VPS. Agent của kit không bao giờ SSH.
- Kiểm thật ghi vào `tasks/verification.md`: ngày, bước, kết quả. Mỗi lượt chạy agent ghi thêm model, effort, token vào và ra, chi phí quy đổi theo giá API, thời gian và số lượt, lấy từ `.ai/runs/<KEY>/last.md`.
- Agent chạy lần lượt, chỉ trên `ao-pilot` và space `DEMO`.
- Cỡ task đếm theo file code và file cấu hình, không tính file test và fixture.
- Nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR. Commit theo `CLAUDE.md`: `type(scope): subject`, không body, không có dòng `Co-Authored-By`.
- Hỏi bạn trước khi (spec mục 8):
  - đổi các quy tắc của spec mục 2.4 hay 2.9;
  - mở thêm cổng trên VPS, hay cài thêm dịch vụ;
  - xin thêm quyền cho App, hay thêm quyền Jira cho tài khoản agent;
  - cập nhật bản kit trên VPS;
  - làm việc gì trên VPS ngoài `docs/vps-setup.md`.

---

## Giai đoạn 1: tiền đề

### [ ] T1: App `ao-deploy` và tiền đề về GitHub, Jira (spec mục 2.12, điểm 1–4, 8–10) [bạn]

**Mô tả:**

- Claude thêm App `ao-deploy` vào `lib/quality/app-manifest.mjs` với quyền của spec mục 2.3, và thêm mục tạo App vào `docs/github-apps-setup.md`.
- **Bạn** tạo App theo từng bước bấm, cài App chỉ trên `ao-pilot`, và giữ file private key ở máy (plan, quyết định 7).
- **Bạn** tạo một token Jira chỉ đọc cho tài khoản CI, theo từng bước bấm, rồi đặt nó vào biến môi trường của user Windows.
- Claude kiểm bảy điểm, trên `ao-pilot` và space `DEMO`:
  1. Một deployment `development` và status `success` do token của `ao-deploy` tạo, cho commit `22327a5` của `DEMO-21`, làm workflow `jira-sync` chạy. `DEMO-21` đã ở Ready for QA, nên `jira-sync` không đổi gì.
  2. GitHub for Jira hiện deployment đó trên `DEMO-21`, đúng môi trường.
  3. Token của `ao-deploy` chạy được `git fetch` qua HTTPS, và `runAudit` ở chế độ chỉ kiểm cho commit đó.
  4. Token Jira chỉ đọc đọc được trạng thái Epic mà `audit` cần cho PR tài liệu, và không ghi được gì.
  8. Token của agent gắn được một file thử lên `DEMO-21`, rồi xóa được file đó.
  9. Token CI tạo được một Bug thử trên `DEMO` có Found in, Severity và Affects Version, bằng đúng code mà `jira-sync` sẽ dùng. Bug thử được chuyển sang Cancelled ngay sau đó.
  10. Một yêu cầu deploy tạo bằng login `gh` của bạn ghi `creator` là login của bạn. Token `ao-dev` không tạo được deployment nào, hoặc nếu tạo được thì `creator` là bot.

**Tiêu chí chấp nhận:**
- [ ] Bảy điểm có kết quả đúng hoặc sai, kèm bằng chứng (lệnh, trích output, link), trong `tasks/verification.md`.
- [ ] Nếu một điểm sai: spec và plan đã sửa theo kết quả, và bạn đã duyệt bản sửa.
- [ ] Mọi deployment thử trên `ao-pilot` được đánh dấu `inactive` khi xong.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh
- [ ] Không file key hay token nào nằm trong repo kit hay `ao-pilot`

**Phụ thuộc:** không

**File dự kiến:** `lib/quality/app-manifest.mjs`, `scripts/github-app-create.mjs`, `docs/github-apps-setup.md`, `tasks/verification.md`

**Cỡ:** S

### [ ] T2: VPS mới, DNS và tiền đề về VPS (điểm 5–7) [bạn]

**Mô tả:**

- Claude đưa hai hay ba nhà cung cấp VPS đạt spec mục 2.11 (có console web và snapshot), kèm giá. **Bạn** chọn và thuê.
- **Bạn** tạo key SSH mới có passphrase mạnh trong terminal của bạn, nạp vào ssh-agent của Windows, rồi tạo bản ghi A wildcard `*.ao.t2g.io.vn` ở BKNS, theo từng bước bấm.
- Claude viết phần nền của `docs/vps-setup.md` rồi cài theo đúng tài liệu đó:
  - user thường có `sudo`, mật khẩu do bạn đặt;
  - `PermitRootLogin no`, `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, kể cả các file trong `/etc/ssh/sshd_config.d/`;
  - `ufw` chỉ mở SSH, 80 và 443; `unattended-upgrades`; swap 4 GB;
  - Docker Engine và Compose plugin từ kho chính thức; Node.js 24; Caddy 2 trong container, ghim phiên bản.
- Claude kiểm ba điểm, bằng container dựng tay từ `git archive` của `ao-pilot` và `ao-sample`:
  5. Build image của `ao-pilot` và hai app của `ao-sample` trong khi ba container khác đang chạy; đo thời gian build, RAM lúc cao nhất, và RAM khi mỗi app có hai container (plan, quyết định 4).
  6. Caddy lấy được chứng chỉ HTTPS cho `pilot-dev.ao.t2g.io.vn`.
  7. E2E của `ao-pilot`, từ một bản clone tạm trên máy bạn, chạy được vào `https://pilot-dev.ao.t2g.io.vn` với Chrome của máy và basic auth. Bản clone tạm chỉ sửa `playwright.config.ts` để đọc `E2E_BASE_URL` và `httpCredentials`.
- Xong thì Claude xóa các container thử, giữ Caddy.

**Tiêu chí chấp nhận:**
- [ ] Ba điểm có kết quả đúng hoặc sai, kèm số đo, trong `tasks/verification.md`.
- [ ] Từ máy bạn: đăng nhập root bằng SSH bị từ chối, đăng nhập bằng mật khẩu bị từ chối, và quét cổng chỉ thấy 22, 80, 443.
- [ ] Nếu một điểm sai: spec và plan đã sửa, và bạn đã duyệt bản sửa.

**Kiểm chứng:**
- [ ] `docs/vps-setup.md` có đủ các bước đã chạy, theo đúng thứ tự
- [ ] Bạn đã gỡ key khỏi ssh-agent khi task xong

**Phụ thuộc:** T1

**File dự kiến:** `docs/vps-setup.md`, `tasks/verification.md`

**Cỡ:** M

### Checkpoint 1

- [ ] Năm lệnh kiểm trong quy ước chung xanh
- [ ] Mười tiền đề có kết quả trong `tasks/verification.md`. Tiền đề nào sai thì spec đã được sửa, và bạn đã duyệt bản sửa
- [ ] VPS đạt phần SSH, `ufw` và Docker của tiêu chí 3
- [ ] Bạn xem kết quả của T1–T2

---

## Giai đoạn 2: thư viện release

### [ ] T3: `versions.mjs` và `cut.mjs` (spec mục 2.6)

**Mô tả:**

- `lib/release/versions.mjs`, hàm thuần:
  - `nextRelease(tags)`: `v0.1.0` khi chưa có tag; ngược lại tăng `minor` từ tag mới nhất. Tag sai dạng bị bỏ qua.
  - `nextPatch(tags, production)`: bản vá của bản đang chạy trên Production.
- `lib/release/cut.mjs`, hàm thuần `cutPoint({ commits, items })`:
  - `commits`: lịch sử first-parent của `develop` từ tag mới nhất, mỗi commit kèm các mã item;
  - `items`: trạng thái của từng item;
  - trả commit điểm cắt, danh sách item trong bản, và danh sách item sau điểm cắt, theo đúng định nghĩa của hợp đồng.

**Tiêu chí chấp nhận:**
- [ ] Test `versions` của spec mục 7: bản đầu, tăng `minor`, bản vá, tag sai dạng.
- [ ] Test `cut` của spec mục 7: mọi item Done; item giữa lịch sử chưa Done; item có commit trước và sau điểm cắt; không có item Done nào.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** Checkpoint 1

**File dự kiến:** `lib/release/versions.mjs`, `lib/release/cut.mjs`

**Cỡ:** S

### [ ] T4: `deploy.schema.json` và `deploy-config.mjs` (spec mục 2.3, 7)

**Mô tả:**

- `contract/schema/deploy.schema.json` cho `.ai-orchestrator/deploy.yaml`: `apps` (Dockerfile, cổng, đường dẫn health, `public`, tên biến môi trường) và `smoke`. `additionalProperties: false` ở mọi mức, nên không khai được volume, `privileged`, mạng của host hay cổng ra ngoài.
- `lib/release/deploy-config.mjs`: đọc file ở một commit (nhận nội dung, không tự đọc đĩa), kiểm schema, và kiểm thêm những điều schema không nói được: đúng một app `public` mỗi dự án, mỗi mục `smoke` trỏ tới một app có thật, tên biến môi trường hợp lệ.
- `npm run validate` kiểm `deploy.yaml` mẫu trong `tests/fixtures/release/`.

**Tiêu chí chấp nhận:**
- [ ] Test dương với `deploy.yaml` của spec mục 2.3.
- [ ] Fixture âm: volume, `privileged`, cổng ra host, mạng của host, app `public` thứ hai, mục `smoke` trỏ tới app lạ.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** Checkpoint 1

**File dự kiến:** `contract/schema/deploy.schema.json`, `lib/release/deploy-config.mjs`, `scripts/validate-contract.mjs`

**Cỡ:** S

### [ ] T5: `targets.mjs` (spec mục 2.4, 2.8, 2.9)

**Mô tả:** hàm thuần `decideTarget({ environment, candidate, record, request, approvers })`, trả bản cần deploy hoặc lý do từ chối:

- Development: head của `develop`, khi mọi commit mới đã qua `audit`.
- Staging: head của nhánh `release/*` đang mở; hoặc commit hotfix trên `main` chưa lên Production.
- Production: hai điều kiện cứng của spec mục 2.4. "Đã qua Staging" lấy từ `record`, bản ghi của deployer (plan, quyết định 3).
- Yêu cầu deploy: người tạo phải nằm trong `AO_APPROVERS`. Rollback chỉ về bản đã từng chạy thành công ở chính môi trường đó. Dạng `<sha>` gỡ chặn ở Development và Staging, và vẫn phải thỏa hai điều kiện ở Production (plan, quyết định 5).

**Tiêu chí chấp nhận:**
- [ ] Test cho mỗi dòng của bảng spec mục 2.4.
- [ ] Test từ chối Production: thiếu gate ⑤; tree chưa qua Staging; người tạo yêu cầu không nằm trong `AO_APPROVERS`; rollback về bản chưa từng chạy ở môi trường đó.
- [ ] Test gỡ chặn: yêu cầu của bạn cho một head sau commit fail được nhận; yêu cầu của bot bị từ chối.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** Checkpoint 1

**File dự kiến:** `lib/release/targets.mjs`

**Cỡ:** M

---

## Giai đoạn 3: deployer

### [ ] T6: `audit` cho một dãy commit, và hai quy tắc mới (spec mục 2.3, 2.10)

**Mô tả:**

- `auditRange` trong `lib/quality/audit.mjs`: kiểm từng commit first-parent từ commit đã kiểm lần trước tới head, bằng `decideAudit` sẵn có, và dừng ở commit đầu tiên fail. Lịch sử bị viết lại thì kiểm lại từ commit chung gần nhất.
- Hai quy tắc mới của `decideAudit`:
  - commit của bot `ao-dev` trên `release/*` chỉ sửa `docs/releases/**` và `CHANGELOG.md`;
  - merge commit của PR merge ngược, khi head là `main` và người merge là `merge-gate`.

**Tiêu chí chấp nhận:**
- [ ] Test: một commit push thẳng nằm dưới một PR hợp lệ làm cả dãy fail, đúng ở commit đó.
- [ ] Test hai quy tắc mới, và commit của bot sửa file khác ngoài hai đường dẫn đó thì fail.
- [ ] Test lịch sử bị viết lại.
- [ ] Test cũ của `audit` vẫn xanh.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** Checkpoint 1

**File dự kiến:** `lib/quality/audit.mjs`, `lib/quality/merge-gate.mjs` (tên bot dùng chung)

**Cỡ:** M

### [ ] T7: `smoke.mjs` và phần Docker của deployer (spec mục 2.3, 2.9)

**Mô tả:**

- `lib/release/smoke.mjs`: gọi từng đường dẫn của `smoke` qua mạng nội bộ, kiểm mã trạng thái và đoạn chữ; hết 60 giây mà chưa xanh thì fail. Nhận hàm `fetch` và đồng hồ làm tham số.
- `lib/release/docker.mjs`: dựng đối số cho `docker` bằng mảng, không qua shell (spec mục 6):
  - build image tag theo mã tree, nhãn `ao.tree`;
  - chạy container mới cạnh container cũ, trong mạng Docker riêng của dự án và môi trường, không publish cổng, với `--env-file` của bí mật;
  - chuyển Caddy sang container mới khi smoke đạt, rồi dừng container cũ; xóa container mới khi smoke fail (plan, quyết định 4);
  - giữ ba image gần nhất của mỗi môi trường, xóa image cũ hơn.

**Tiêu chí chấp nhận:**
- [ ] Test `smoke`: đạt ngay; đạt sau vài lần thử; hết 60 giây; sai mã trạng thái; thiếu đoạn chữ.
- [ ] Test đối số `docker` với hàm chạy lệnh giả: không có `--publish`, `--privileged`, `--network host` hay `--volume`; tên nhánh lạ không lọt vào đối số.
- [ ] Test thứ tự đổi bản khi smoke đạt và khi smoke fail.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T4

**File dự kiến:** `lib/release/smoke.mjs`, `lib/release/docker.mjs`

**Cỡ:** M

### [ ] T8: `deployer.mjs` và `scripts/ao-deploy.mjs` (spec mục 2.3, 2.4, 2.9)

**Mô tả:**

- `lib/release/deployer.mjs`, một lượt cho từng dự án:
  1. lấy token của `ao-deploy`, `git fetch` vào bản mirror, đọc yêu cầu deploy mới;
  2. `auditRange` cho mỗi nhánh có commit mới;
  3. `decideTarget` cho từng môi trường;
  4. build, chạy và smoke bằng T7;
  5. tạo deployment và status trên GitHub, kèm `environment_url`;
  6. ghi bản ghi vào `/var/lib/ao/<dự án>/state.json` trước khi sang môi trường kế tiếp.
- Bản ghi giữ: commit đã kiểm của mỗi nhánh, bản đang chạy và các bản đã chạy thành công ở từng môi trường, các đoạn lịch sử bạn đã gỡ chặn.
- `scripts/ao-deploy.mjs tick [--dry-run]`: đọc `/etc/ao/deployer.yaml`, dựng client, gọi `deployer.mjs`. `--dry-run` in việc sẽ làm, không build, không ghi gì lên GitHub.
- **Điểm bắt đầu** (T1, `tasks/verification.md`): `scripts/ao-deploy.mjs baseline <dự án>` in head hiện tại của `develop`, `main` và nhánh `release/*`, rồi ghi chúng là đã kiểm khi có `--confirm`. Nhờ vậy lượt đầu không kiểm lại lịch sử cũ, như commit `3fdd514` của `ao-pilot`. Chưa có điểm bắt đầu thì `tick` không deploy dự án đó.
- Log không chứa token hay giá trị biến môi trường của app.

**Tiêu chí chấp nhận:**
- [ ] Test với client giả: kiểm mọi commit first-parent mới, không chỉ head; dừng ở commit đầu tiên fail; báo đúng deployment status.
- [ ] Test Production: hotfix trên `main` lên Staging trước; merge commit của PR release lên Production khi tree đã qua Staging; smoke fail giữ bản cũ và báo `failure`.
- [ ] Test chạy lại sau khi lượt trước dừng giữa chừng: không deploy lại bản đã xong, không bỏ sót bản chưa xong.
- [ ] Test log và tham số dòng lệnh không chứa token.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh
- [ ] `ao-deploy.mjs tick --dry-run` chạy được trên máy bạn với một `deployer.yaml` mẫu trỏ tới `ao-pilot`, bằng key của `ao-deploy` ở máy

**Phụ thuộc:** T3, T5, T6, T7

**File dự kiến:** `lib/release/deployer.mjs`, `scripts/ao-deploy.mjs`, `lib/tracker/github-client.mjs`

**Cỡ:** L. Nếu quá năm file, tách phần bản ghi ra `lib/release/record.mjs` thành task riêng.

### [ ] T9: Thư mục `vps/` và phần deployer của `docs/vps-setup.md` (spec mục 2.3, 2.11)

**Mô tả:**

- `vps/Caddyfile.template`: một khối cho mỗi subdomain ở bảng của spec mục 2.11; basic auth cho Development và Staging bằng bản băm bcrypt; Production để mở.
- `vps/ao-deploy.service`, `vps/ao-deploy.timer`: chạy mỗi phút dưới user `aodeploy`; không mở lượt mới khi lượt trước chưa xong.
- `vps/deployer.example.yaml` và schema của nó: dự án, repo, subdomain, `AO_APPROVERS`.
- `docs/vps-setup.md` thêm phần cài deployer: user `aodeploy`, thư mục và quyền của spec mục 2.3, cách chép bản kit ghim, cách bạn nhập bí mật bằng `ssh -t` (plan, quyết định 7).

**Tiêu chí chấp nhận:**
- [ ] Test sinh Caddyfile từ `deployer.yaml` mẫu: đủ sáu subdomain, basic auth chỉ ở Development và Staging.
- [ ] `npm run validate` kiểm `deployer.example.yaml`, có fixture âm.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T8

**File dự kiến:** `vps/Caddyfile.template`, `vps/ao-deploy.service`, `vps/ao-deploy.timer`, `vps/deployer.example.yaml`, `docs/vps-setup.md`

**Cỡ:** M

---

## Giai đoạn 4: cổng và Jira

### [ ] T10: `merge-gate`: PR release, tag và PR merge ngược (spec mục 2.7, 2.10)

**Mô tả:**

- Mục mới trong `quality/gates.yaml` cho PR release và PR merge ngược, kèm schema và quy tắc kiểm của `npm run validate`.
- PR release (`release/vX.Y.0` → `main`): merge bằng merge commit khi CI xanh trên head và một login trong `AO_APPROVERS` đã approve head; gắn tag `vX.Y.0` vào merge commit; mở PR merge ngược `main` → `develop`.
- PR merge ngược (head `main`, vào `develop` hay nhánh `release/*` đang mở): merge bằng merge commit khi CI xanh và không có xung đột, không cần approve; có xung đột thì gắn cờ "Needs you" và không merge.
- `docs/quality-gates.md` trường hợp 3 ghi cách mới.

**Tiêu chí chấp nhận:**
- [ ] Test PR release: merge bằng merge commit và gắn tag; không merge khi thiếu approve trên head hay CI chưa xanh.
- [ ] Test PR merge ngược: merge khi không xung đột; gắn cờ khi có; không nhận PR merge ngược có head khác `main`.
- [ ] Test dương và fixture âm cho mục mới của `quality/gates.yaml`.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T6

**File dự kiến:** `lib/quality/merge-gate.mjs`, `lib/quality/gates.mjs`, `quality/gates.yaml`, `contract/schema/` của gates, `docs/quality-gates.md`

**Cỡ:** M

### [ ] T11: `jira-sync`: ba sự kiện deployment (spec mục 2.9, 2.10)

**Mô tả:** `lib/tracker/sync.mjs` nhận thêm:

- deployment `success` lên Staging của commit hotfix: Bug sang Ready for QA;
- deployment `failure` lên Production: tạo Bug Critical, Found in Production, Affects Version là bản vừa lên;
- deployment `failure` lên Development hay Staging: gắn cờ "Needs you" cho item của commit đó.

**Tiêu chí chấp nhận:**
- [ ] Test cho ba sự kiện, bằng bản ghi API ghi sẵn.
- [ ] Test không tạo Bug lặp khi cùng một deployment báo `failure` hai lần.
- [ ] Test cũ của `jira-sync` vẫn xanh.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T1 (điểm 9)

**File dự kiến:** `lib/tracker/sync.mjs`, `contract/` nếu quy tắc tạo Bug cần thêm trường

**Cỡ:** M

---

## Giai đoạn 5: bốn lệnh

### [ ] T12: Dữ kiện về môi trường, và `attachments.mjs` (spec mục 2.5)

**Mô tả:**

- `lib/workflow/facts.mjs` đọc thêm: bản đang chạy ở từng môi trường (deployment mới nhất có status `success`), commit đó có chứa commit merge của item không, nhánh `release/*` đang mở, tag, và Fix Version trên Jira.
- `lib/tracker/attachments.mjs`: gắn file lên item bằng token của agent, bỏ qua file quá giới hạn của Jira và ghi tên, rồi comment danh sách file.

**Tiêu chí chấp nhận:**
- [ ] Test dữ kiện bằng bản ghi API ghi sẵn: môi trường chưa có deployment, deployment `failure` mới nhất, commit có và không có commit merge của item.
- [ ] Test `attachments`: gắn đủ; bỏ file quá giới hạn; comment có tên file.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T1 (điểm 8)

**File dự kiến:** `lib/workflow/facts.mjs`, `lib/tracker/attachments.mjs`, `lib/tracker/jira-client.mjs`

**Cỡ:** M

### [ ] T13: `/ao-qa` (spec mục 2.2, 2.5)

**Mô tả:**

- `decideStep('qa', …)` trong `lib/workflow/steps.mjs`: môi trường QA theo bảng định tuyến; `STOP` khi item không ở Ready for QA, hay môi trường chưa chạy bản chứa commit merge của item.
- `ao-step.mjs qa <KEY> --go`:
  1. tạo worktree ở đúng commit đang chạy, trong thư mục temp, rồi `npm ci`;
  2. chạy `qa` với `E2E_BASE_URL`, và với Development, Staging thì thêm `E2E_HTTP_USER`, `E2E_HTTP_PASSWORD` lấy từ `AO_ENV_AUTH`;
  3. gắn ảnh và trace lên item bằng T12;
  4. so commit đang chạy lúc đầu và lúc cuối lượt, khác thì ghi vào báo cáo.

**Tiêu chí chấp nhận:**
- [ ] Test `steps`: một trường hợp `GO`, và `STOP` cho sai trạng thái, môi trường chưa có commit của item.
- [ ] Test môi trường của phiên `qa` có đủ biến E2E, và tham số dòng lệnh không chứa mật khẩu.
- [ ] Test deploy mới giữa lượt được ghi vào báo cáo.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T12

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs`, `lib/workflow/prompts.mjs`

**Cỡ:** M

### [ ] T14: `/ao-release` (spec mục 2.2, 2.6)

**Mô tả:**

- `decideStep('release', …)`: `STOP` khi có nhánh `release/*` đang mở, hay không có item Done chưa release. Không có tham số thì in điểm cắt, danh sách item và số bản như spec mục 6, rồi dừng ở gate ④.
- `/ao-release <vX.Y.0> <sha>`: kiểm `<sha>` đúng là điểm cắt và số bản đúng; kiểm Fix Version `vX.Y.0` và bản kế tiếp đã có trên Jira. Sau đó:
  1. tạo nhánh `release/vX.Y.0` tại `<sha>` dưới tên bot `ao-dev`;
  2. gắn Fix Version cho các item trong bản, chuyển item sau điểm cắt sang bản kế tiếp;
  3. comment lên từng item: số bản, điểm cắt, thời điểm bạn duyệt.

**Tiêu chí chấp nhận:**
- [ ] Test `steps`: `GO`; `STOP` khi có nhánh release đang mở, thiếu Fix Version trên Jira, `<sha>` không phải điểm cắt.
- [ ] Test việc gắn và chuyển Fix Version bằng client giả.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T3, T12

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs`, `lib/tracker/jira-client.mjs`

**Cỡ:** M

### [ ] T15: `/ao-ship` cho bản release (spec mục 2.7)

**Mô tả:**

- `decideStep('ship', …)` cho `vX.Y.0`: Staging đang chạy head của `release/vX.Y.0` và smoke xanh; không còn Bug Critical hay High mở mang Fix Version này.
- `--go`:
  1. `qa` chạy full regression trong worktree ở commit đang chạy, ghi `.ai/runs/vX.Y.0/regression-report.md`; FAIL thì dừng, kèm bản nháp Bug;
  2. `devops` viết mục `CHANGELOG.md`, mô tả PR release và đoạn mô tả Fix Version vào `.ai/runs/vX.Y.0/`;
  3. script, dưới tên bot `ao-dev`, commit `docs/releases/vX.Y.0.md` và `CHANGELOG.md` lên nhánh release, rồi mở PR release bằng `ao-pr.mjs`;
  4. script kiểm diff từ commit đã chạy regression tới head mới chỉ sửa hai file đó.

**Tiêu chí chấp nhận:**
- [ ] Test `steps`: `GO`; `STOP` khi Staging chạy commit khác, còn Bug Critical hay High, regression chạy trên commit cũ, diff sau regression sửa file khác.
- [ ] Test thứ tự lượt và điểm dừng khi regression FAIL.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T13

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs`, `lib/workflow/prompts.mjs`

**Cỡ:** M

### [ ] T16: `/ao-ship` cho hotfix, `/ao-rollback` và `/ao-status` (spec mục 2.2, 2.8, 2.9)

**Mô tả:**

- `/ao-ship vX.Y.(Z+1)`: kiểm Bug đã Done và Staging đang chạy commit hotfix. Rồi script, bằng login `gh` của bạn, gắn tag và tạo yêu cầu deploy Production; mở PR merge ngược `main` → `develop`, và `main` → nhánh `release/*` nếu đang mở.
- `/ao-rollback <môi trường> [<sha>]`: không có `<sha>` thì tìm bản trước đã chạy thành công; có `<sha>` thì dùng đúng bản đó (plan, quyết định 5). Tạo yêu cầu deploy bằng login `gh` của bạn, đánh dấu rollback.
- `/ao-status` hiện thêm: bản đang chạy ở từng môi trường, nhánh release đang mở, item Done chưa release, Fix Version đã lên Production mà chưa Release trên Jira.

**Tiêu chí chấp nhận:**
- [ ] Test `steps` cho hotfix và rollback: `GO`, và `STOP` khi Bug chưa Done, Staging chạy commit khác, môi trường chưa có bản trước.
- [ ] Test yêu cầu deploy được tạo bằng client của login của bạn, không phải bằng token của App.
- [ ] Test các dòng mới của `/ao-status`.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T5, T15

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs`

**Cỡ:** M

### [ ] T17: Bốn skill, prompt và hợp đồng (spec mục 2.2, 2.10)

**Mô tả:**

- `kit/.claude/skills/ao-qa/`, `ao-release/`, `ao-ship/`, `ao-rollback/`: cùng cách của sáu skill của `dev-workflow`, có `disable-model-invocation: true` và gọi đúng `ao-step.mjs`.
- `agents/prompts/qa.md`: QA trên môi trường, full regression. `agents/prompts/devops.md`: release note, mô tả PR release; bỏ câu "chờ `release-workflow`".
- Hợp đồng: stage `release-cut` ghi rằng script làm thay `devops`; stage `hotfix` ghi gate ⑤ là yêu cầu deploy của bạn. `docs/sdlc.md` được sinh lại.

**Tiêu chí chấp nhận:**
- [ ] Test frontmatter của bốn skill.
- [ ] `npm run render:check` và `npm run agents:check` xanh sau khi sinh lại.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T13–T16

**File dự kiến:** bốn `SKILL.md`, `agents/prompts/qa.md`, `agents/prompts/devops.md`, `contract/stages.yaml`

**Cỡ:** M

### Checkpoint 2

- [ ] Năm lệnh kiểm trong quy ước chung và CI của kit xanh
- [ ] Claude chạy `ao-step.mjs` ở chế độ chỉ kiểm trong `ao-pilot`, bằng code của kit: `qa DEMO-21`, `release`, `ship v0.1.0`, `rollback production`. Các lệnh dừng đúng chỗ, vì VPS chưa có deployer. Không agent nào chạy
- [ ] Bạn đọc kết quả đó, skill `ao-ship`, và phần prompt đã sửa

---

## Giai đoạn 6: lên VPS và `ao-pilot`

### [ ] T18: Cài deployer lên VPS [bạn]

**Mô tả:**

- **Bạn** nạp lại key SSH vào ssh-agent.
- Claude cài theo phần deployer của `docs/vps-setup.md`:
  - user `aodeploy`, các thư mục và quyền của spec mục 2.3;
  - chép bản kit ghim theo commit của `main` kit bằng `scp`;
  - chép private key của `ao-deploy` bằng `scp`, không mở file;
  - `deployer.yaml`, Caddyfile, systemd service và timer.
- **Bạn** nhập mật khẩu basic auth và token Jira chỉ đọc bằng lệnh `ssh -t` do Claude soạn, trong terminal của bạn, rồi đặt `AO_ENV_AUTH` trên máy bạn và xóa file key ở máy.
- Claude chạy `ao-deploy.mjs baseline ao-pilot` và đưa bạn danh sách head. Bạn đồng ý thì Claude chạy lại với `--confirm` (T8).
- Claude chạy `tick --dry-run`, đọc kết quả, rồi bật timer.

**Tiêu chí chấp nhận:**
- [ ] `tick --dry-run` in đúng việc sẽ làm cho `ao-pilot`: chưa có `deploy.yaml` nên chưa deploy.
- [ ] Commit kit đã ghim nằm trong `tasks/verification.md`.
- [ ] Không bí mật nào nằm trong log của systemd.

**Kiểm chứng:**
- [ ] `systemctl status ao-deploy.timer` chạy; `journalctl -u ao-deploy` không có lỗi
- [ ] Bạn đã gỡ key khỏi ssh-agent

**Phụ thuộc:** T9, T10, T11, T17, Checkpoint 2

**File dự kiến:** `tasks/verification.md`, `docs/vps-setup.md` nếu phải sửa bước

**Cỡ:** S

### [ ] T19: Task của `ao-pilot`: Dockerfile, `deploy.yaml`, E2E và bản chép kit [bạn]

**Mô tả:**

- Task `DEMO-…` đi như Task chép kit `DEMO-19` của `dev-workflow`.
- `/ao-build` cho `devops`: Dockerfile, `.dockerignore` bỏ `docs/` và `*.md`, `.ai-orchestrator/deploy.yaml`, biến `HOST`, `playwright.config.ts` đọc `E2E_BASE_URL` và `httpCredentials`, bỏ `deploy.yml` và `audit.yml`.
- Sau lượt build, Claude thêm commit chép kit mới lên cùng nhánh, bằng helper của vai trò `devops` (plan, quyết định 6).
- `/ao-review`, `/ao-fix` nếu cần, gate ③. **Bạn** merge, vì PR sửa đường dẫn được bảo vệ.
- Deployer deploy Development; `jira-sync` chạy theo deployment đó.

**Tiêu chí chấp nhận:**
- [ ] `https://pilot-dev.ao.t2g.io.vn` chạy bản mới, có HTTPS, hỏi basic auth.
- [ ] Deployment `development` có trên GitHub và hiện trên item Jira.
- [ ] Chi phí của từng lượt agent nằm trong `tasks/verification.md`.

**Kiểm chứng:**
- [ ] CI của PR xanh; `.ai-orchestrator/` của `ao-pilot` giống `main` của kit ở các file đã chép

**Phụ thuộc:** T18

**File dự kiến:** trên `ao-pilot`; trong kit chỉ `tasks/verification.md`

**Cỡ:** M

### [ ] T20: Kiểm rằng cổng chặn đúng (spec mục 7, bước 10)

**Mô tả:**

1. Claude push thẳng một commit nhỏ lên `develop` của `ao-pilot`, không qua PR. Deployer không deploy commit đó, báo `failure` kèm lý do, và `jira-sync` gắn cờ. Rồi bạn gỡ chặn bằng `/ao-rollback development <sha>` sau khi đọc commit đó (plan, quyết định 5).
2. Claude thử tạo yêu cầu deploy Production bằng token `ao-dev`. GitHub từ chối, hoặc deployer từ chối vì người tạo là bot.

**Tiêu chí chấp nhận:**
- [ ] Hai lần thử bị chặn, kèm bằng chứng trong `tasks/verification.md`.
- [ ] Development chạy lại bình thường sau khi gỡ chặn.

**Kiểm chứng:**
- [ ] `journalctl -u ao-deploy` ghi rõ lý do từ chối

**Phụ thuộc:** T19

**File dự kiến:** `tasks/verification.md`

**Cỡ:** S

### Checkpoint 3

- [ ] Tiêu chí 3, 4 và 9 của spec mục 9 đạt
- [ ] Bạn xem chi phí của T19, rồi đồng ý chạy kiểm thật ở T21–T22 (ước 14–24 USD)

---

## Giai đoạn 7: kiểm thật

### [ ] T21: `DEMO-21` từ QA tới Production (spec mục 7, bước 4–6) [bạn]

**Mô tả:**

1. `/ao-qa DEMO-21` trên Development; bằng chứng nằm trên Jira; **bạn** Accept.
2. **Bạn** tạo Fix Version `v0.1.0` và `v0.2.0` trên Jira theo từng bước bấm. `/ao-release`, rồi **bạn** gõ `/ao-release v0.1.0 <sha>` (gate ④). Deployer deploy Staging.
3. `/ao-ship v0.1.0`; **bạn** đọc PR release rồi approve (gate ⑤). `merge-gate` merge, gắn tag, mở và merge PR merge ngược. Deployer deploy Production, smoke xanh. **Bạn** bấm Release cho `v0.1.0` trên Jira.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 5 và 6 của spec mục 9 đạt.
- [ ] Chi phí của từng lượt agent nằm trong `tasks/verification.md`.

**Kiểm chứng:**
- [ ] `https://pilot.ao.t2g.io.vn` chạy đúng image đã qua Staging: cùng mã tree

**Phụ thuộc:** Checkpoint 3

**File dự kiến:** `tasks/verification.md`

**Cỡ:** M

### [ ] T22: Hotfix, rollback và smoke fail có chủ đích (spec mục 7, bước 7–9) [bạn]

**Mô tả:**

1. **Bug thử:** một lỗi nhỏ có thật của `ao-pilot`, do `qa` hay bạn thấy ở T21. Nếu không có, Claude đề xuất một lỗi nhỏ để bạn chọn trước khi tạo Bug. Bug đi theo spec mục 2.8 tới `v0.1.1` trên Production.
2. `/ao-rollback production` về `v0.1.0`, rồi `/ao-rollback production <sha của v0.1.1>` đưa `v0.1.1` lên lại.
3. **Smoke fail có chủ đích:** Claude đề xuất cách gây fail mà không cần commit mới, ví dụ một biến môi trường sai trong `/etc/ao/secrets/ao-pilot/production.env` rồi một yêu cầu deploy lại bản đang chạy. Bạn đồng ý thì Claude làm. Deployer giữ bản cũ, và Jira có Bug Critical. Xong thì Claude trả biến về như cũ và chuyển Bug thử đó sang Cancelled.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 7 và 8 của spec mục 9 đạt.
- [ ] Chi phí của từng lượt agent nằm trong `tasks/verification.md`.

**Kiểm chứng:**
- [ ] `develop` có commit hotfix qua PR merge ngược

**Phụ thuộc:** T21

**File dự kiến:** `tasks/verification.md`

**Cỡ:** M

### Checkpoint 4

- [ ] Tiêu chí 5–8 của spec mục 9 đạt
- [ ] Bạn xem lịch sử của `DEMO-21` và Bug thử trên `DEMO`, PR release, tag, deployment trên `ao-pilot`, và `.ai/runs/`

---

## Giai đoạn 8: hoàn thiện

### [ ] T23: Tài liệu, `SPEC.md` và lưu trữ plan (spec mục 9, tiêu chí 10)

**Mô tả:**

- README có mục về bốn lệnh và biến `AO_ENV_AUTH`.
- `docs/release-workflow.md`: bốn lệnh, một vòng release, các bước bấm Fix Version trên Jira, yêu cầu với dự án (Dockerfile, `.dockerignore`, `deploy.yaml`, `playwright.config.ts`), quy tắc expand/contract cho cơ sở dữ liệu.
- `docs/github-apps-setup.md` có App `ao-deploy` (từ T1); `docs/vps-setup.md` đủ từ đầu tới cuối.
- `SPEC.md` ghi module hoàn thành; chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/release-workflow/`.

**Tiêu chí chấp nhận:**
- [ ] Đạt 10 tiêu chí ở spec mục 9.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung và CI của kit xanh

**Phụ thuộc:** Checkpoint 4

**File dự kiến:** `README.md`, `docs/release-workflow.md`, `SPEC.md`, các file trong `tasks/`

**Cỡ:** S

### Checkpoint cuối

- [ ] Đạt 10 tiêu chí ở spec mục 9
- [ ] Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/release-workflow/`
- [ ] Bạn xác nhận module hoàn thành

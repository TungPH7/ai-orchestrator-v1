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

### [x] T1: App `ao-deploy` và tiền đề về GitHub, Jira (spec mục 2.12, điểm 1–4, 8–10) [bạn]

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
- [x] Bảy điểm có kết quả đúng hoặc sai, kèm bằng chứng (lệnh, trích output, link), trong `tasks/verification.md`.
- [x] Nếu một điểm sai: spec và plan đã sửa theo kết quả, và bạn đã duyệt bản sửa.
- [x] Mọi deployment thử trên `ao-pilot` được đánh dấu `inactive` khi xong.

**Kết quả (2026-11-05):** điểm 1, 2, 4 và 10 đúng; điểm 9 đúng, trừ Affects Version chưa thử được vì `DEMO` chưa có version. Điểm 3 đúng sau khi App có thêm Commit statuses: Read-only. Điểm 8 sai: script gắn bằng chứng, gắn Fix Version và comment bằng token CI. Bạn duyệt cả hai chỗ sửa ở Phiên 26 · Lượt 22–23.

**Kiểm chứng:**
- [ ] Năm lệnh trong quy ước chung xanh
- [ ] Không file key hay token nào nằm trong repo kit hay `ao-pilot`

**Phụ thuộc:** không

**File dự kiến:** `lib/quality/app-manifest.mjs`, `scripts/github-app-create.mjs`, `docs/github-apps-setup.md`, `tasks/verification.md`

**Cỡ:** S

### [x] T2: VPS mới, DNS và tiền đề về VPS (điểm 5–7) [bạn]

**Mô tả:**

- **Bạn** chọn BKNS, gói VPS MMO4: 2 core, 4 GB RAM, 40 GB SSD, 1 IPv4, 150.000 VND mỗi tháng (Phiên 26 · Lượt 24), và thuê theo từng bước bấm. Bước đưa lựa chọn nhà cung cấp được bỏ.
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
- [x] Ba điểm có kết quả đúng hoặc sai, kèm số đo, trong `tasks/verification.md`.
- [x] Từ máy bạn: đăng nhập root bằng SSH bị từ chối, đăng nhập bằng mật khẩu bị từ chối, và quét cổng chỉ thấy cổng SSH `26266`, 80 và 443.
- [x] Nếu một điểm sai: spec và plan đã sửa, và bạn đã duyệt bản sửa.

**Kiểm chứng:**
- [x] `docs/vps-setup.md` có đủ các bước đã chạy, theo đúng thứ tự
- [x] Bạn đã gỡ key khỏi ssh-agent khi task xong

**Phụ thuộc:** T1

**File dự kiến:** `docs/vps-setup.md`, `tasks/verification.md`

**Cỡ:** M

### Checkpoint 1

- [x] Năm lệnh kiểm trong quy ước chung xanh
- [x] Mười tiền đề có kết quả trong `tasks/verification.md`. Tiền đề nào sai thì spec đã được sửa, và bạn đã duyệt bản sửa
- [x] VPS đạt phần SSH, `ufw` và Docker của tiêu chí 3
- [x] Bạn xem kết quả của T1–T2

---

## Giai đoạn 2: thư viện release

### [x] T3: `versions.mjs` và `cut.mjs` (spec mục 2.6)

**Mô tả:**

- `lib/release/versions.mjs`, hàm thuần:
  - `nextRelease(tags)`: `v0.1.0` khi chưa có tag; ngược lại tăng `minor` từ tag mới nhất. Tag sai dạng bị bỏ qua.
  - `nextPatch(tags, production)`: bản vá của bản đang chạy trên Production.
- `lib/release/cut.mjs`, hàm thuần `cutPoint({ commits, items })`:
  - `commits`: lịch sử first-parent của `develop` từ tag mới nhất, mỗi commit kèm các mã item;
  - `items`: trạng thái của từng item;
  - trả commit điểm cắt, danh sách item trong bản, và danh sách item sau điểm cắt, theo đúng định nghĩa của hợp đồng.

**Tiêu chí chấp nhận:**
- [x] Test `versions` của spec mục 7: bản đầu, tăng `minor`, bản vá, tag sai dạng.
- [x] Test `cut` của spec mục 7: mọi item Done; item giữa lịch sử chưa Done; item có commit trước và sau điểm cắt; không có item Done nào.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** Checkpoint 1

**File dự kiến:** `lib/release/versions.mjs`, `lib/release/cut.mjs`

**Cỡ:** S

### [x] T4: `deploy.schema.json` và `deploy-config.mjs` (spec mục 2.3, 7)

**Mô tả:**

- `lib/release/deploy.schema.json` cho `.ai-orchestrator/deploy.yaml`: `apps` (Dockerfile, cổng, đường dẫn health, `public`, tên biến môi trường) và `smoke`. `additionalProperties: false` ở mọi mức, nên không khai được volume, `privileged`, mạng của host hay cổng ra ngoài.
- `lib/release/deploy-config.mjs`: đọc file ở một commit (nhận nội dung, không tự đọc đĩa), kiểm schema, và kiểm thêm những điều schema không nói được: đúng một app `public` mỗi dự án, mỗi mục `smoke` trỏ tới một app có thật, tên biến môi trường hợp lệ.
- `npm run validate` kiểm `deploy.yaml` nằm cạnh thư mục `contract/`, tức `.ai-orchestrator/deploy.yaml` của dự án. Repo kit không có file này; test dùng mẫu trong `tests/fixtures/release/`.
- Schema nằm trong `lib/release/`, không nằm trong `contract/schema/`: code đọc mọi schema ở đó như một file `contract/<tên>.yaml`, và bản chép kit của dự án có `lib/` nhưng không có `vps/`.

**Tiêu chí chấp nhận:**
- [x] Test dương với `deploy.yaml` của spec mục 2.3.
- [x] Fixture âm: volume, `privileged`, cổng ra host, mạng của host, app `public` thứ hai, mục `smoke` trỏ tới app lạ.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** Checkpoint 1

**File dự kiến:** `lib/release/deploy.schema.json`, `lib/release/deploy-config.mjs`, `scripts/validate-contract.mjs`

**Cỡ:** S

### [x] T5: `targets.mjs` (spec mục 2.4, 2.8, 2.9)

**Mô tả:** hàm thuần `decideTarget({ environment, candidate, record, request, approvers })`, trả bản cần deploy hoặc lý do từ chối:

- Development: head của `develop`, khi mọi commit mới đã qua `audit`.
- Staging: head của nhánh `release/*` đang mở; hoặc commit hotfix trên `main` chưa lên Production.
- Production: hai điều kiện cứng của spec mục 2.4. "Đã qua Staging" lấy từ `record`, bản ghi của deployer (plan, quyết định 3).
- Yêu cầu deploy: người tạo phải nằm trong `AO_APPROVERS`. Rollback chỉ về bản đã từng chạy thành công ở chính môi trường đó. Dạng `<sha>` gỡ chặn ở Development và Staging, và vẫn phải thỏa hai điều kiện ở Production (plan, quyết định 5).

**Tiêu chí chấp nhận:**
- [x] Test cho mỗi dòng của bảng spec mục 2.4.
- [x] Test từ chối Production: thiếu gate ⑤; tree chưa qua Staging; người tạo yêu cầu không nằm trong `AO_APPROVERS`; rollback về bản chưa từng chạy ở môi trường đó.
- [x] Test gỡ chặn: yêu cầu của bạn cho một head sau commit fail được nhận; yêu cầu của bot bị từ chối.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** Checkpoint 1

**File dự kiến:** `lib/release/targets.mjs`

**Cỡ:** M

---

## Giai đoạn 3: deployer

### [x] T6: `audit` cho một dãy commit, và hai quy tắc mới (spec mục 2.3, 2.10)

**Mô tả:**

- `auditRange` trong `lib/quality/audit.mjs`: kiểm từng commit first-parent từ commit đã kiểm lần trước tới head, bằng `decideAudit` sẵn có, và dừng ở commit đầu tiên fail. Lịch sử bị viết lại thì kiểm lại từ commit chung gần nhất.
- Hai quy tắc mới của `decideAudit`:
  - commit của bot `ao-dev` trên `release/*` chỉ sửa `docs/releases/**` và `CHANGELOG.md`;
  - merge commit của PR merge ngược, khi head là `main` và người merge là `merge-gate`.

**Tiêu chí chấp nhận:**
- [x] Test: một commit push thẳng nằm dưới một PR hợp lệ làm cả dãy fail, đúng ở commit đó.
- [x] Test hai quy tắc mới, và commit của bot sửa file khác ngoài hai đường dẫn đó thì fail.
- [x] Test lịch sử bị viết lại.
- [x] Test cũ của `audit` vẫn xanh.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** Checkpoint 1

**File dự kiến:** `lib/quality/audit.mjs`, `lib/quality/merge-gate.mjs` (tên bot dùng chung)

**Cỡ:** M

### [x] T7: `smoke.mjs` và phần Docker của deployer (spec mục 2.3, 2.9)

**Mô tả:**

- `lib/release/smoke.mjs`: gọi từng đường dẫn của `smoke` qua mạng nội bộ, kiểm mã trạng thái và đoạn chữ; hết 60 giây mà chưa xanh thì fail. Nhận hàm `fetch` và đồng hồ làm tham số.
- `lib/release/docker.mjs`: dựng đối số cho `docker` bằng mảng, không qua shell (spec mục 6):
  - build image tag theo mã tree, nhãn `ao.tree`;
  - chạy container mới cạnh container cũ, trong mạng Docker riêng của dự án và môi trường, không publish cổng, với `--env-file` của bí mật, và `AO_PUBLIC_URL` của môi trường cho app `public`;
  - chuyển Caddy sang container mới khi smoke đạt, rồi dừng container cũ; xóa container mới khi smoke fail (plan, quyết định 4);
  - giữ ba image gần nhất của mỗi môi trường, xóa image cũ hơn;
  - sau mỗi lần deploy, dọn cache build, chỉ giữ phần dùng gần nhất, tối đa 4 GB (T2: 6 lần build để lại 7,25 GB).
- **Cách làm khi xong T7** (Phiên 27 · Lượt 3):
  - Bí mật không đi qua `--env-file`: `docker run --env TÊN` lấy giá trị từ môi trường của lệnh `docker`, nên giá trị không nằm trong dòng lệnh, và mỗi app chỉ nhận đúng các biến nó khai. Biến khai mà file bí mật thiếu thì không deploy.
  - Mỗi container có hai alias trong mạng của dự án: tên app (`api`), để app gọi nhau bằng cùng một địa chỉ ở mọi môi trường; và `ao-<dự án>-<môi trường>-<app>`, duy nhất trên VPS, cho Caddy.
  - Đổi bản theo từng app, app không `public` trước, nên app `public` mới được smoke với API mới. Một app fail thì các app đã đổi nhận lại container cũ.
  - Mỗi app được smoke cả đường dẫn `health` (mã 200), nếu mục `smoke` chưa có đường dẫn đó.
  - Container chạy với `--pull never`, `--security-opt no-new-privileges`, `--cap-drop ALL`, `--restart unless-stopped`.
  - Dọn cache bằng `docker buildx prune --force --max-used-space 4gb` (tài liệu Docker của `buildx prune`).

**Tiêu chí chấp nhận:**
- [x] Test `smoke`: đạt ngay; đạt sau vài lần thử; hết 60 giây; sai mã trạng thái; thiếu đoạn chữ.
- [x] Test đối số `docker` với hàm chạy lệnh giả: không có `--publish`, `--privileged`, `--network host` hay `--volume`; tên nhánh lạ không lọt vào đối số.
- [x] Test thứ tự đổi bản khi smoke đạt và khi smoke fail.
- [x] Test: app `public` nhận `AO_PUBLIC_URL`, app khác không nhận; lệnh dọn cache build giữ tối đa 4 GB.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T4

**File dự kiến:** `lib/release/smoke.mjs`, `lib/release/docker.mjs`

**Cỡ:** M

### [x] T8: `deployer.mjs` và `scripts/ao-deploy.mjs` (spec mục 2.3, 2.4, 2.9)

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
- Hàm chạy `docker` khởi động lệnh với môi trường tối thiểu (`PATH`, `HOME`) cộng các biến `swap` đưa cho từng app, không kế thừa môi trường của deployer (T7).
- Tree đang chạy ở môi trường đó thì không gọi `swap`: commit chỉ đổi tài liệu vẫn có deployment `success` mà không đổi container.
- **Cách làm khi xong T8** (Phiên 27 · Lượt 4):
  - Bản ghi nằm ở `lib/release/record.mjs`. Mỗi môi trường nhớ head đã xét của từng nhánh: head đó đã deploy, bị từ chối hay bỏ qua thì không xét lại. Nhờ vậy sau rollback Production, `main` không tự lên lại, và một commit bị từ chối không sinh deployment mới mỗi phút.
  - Điểm bắt đầu ghi head của hôm nay là đã kiểm và đã xét: lượt đầu không deploy gì, deploy bắt đầu từ commit kế tiếp, hoặc từ yêu cầu deploy của bạn.
  - Một lượt dừng giữa chừng vì lỗi của Docker hay git để lại việc dở trong bản ghi; lượt sau làm lại với cùng deployment. Lỗi của cấu hình, bí mật hay build là `error`, không làm lại.
  - Yêu cầu deploy của bạn (không phải rollback) ghi lịch sử của nhánh tới commit đó là đã duyệt, nếu `audit` chưa đi xa hơn.
  - Trên Staging, hotfix của `main` đi trước, và giữ Staging tới khi lên Production; sau đó tới nhánh release đang mở. Hai nhánh release cùng mở thì Staging không chạy nhánh nào.

**Tiêu chí chấp nhận:**
- [x] Test với client giả: kiểm mọi commit first-parent mới, không chỉ head; dừng ở commit đầu tiên fail; báo `error` khi `targets` từ chối, kèm lý do (spec mục 2.4).
- [x] Test Production: hotfix trên `main` lên Staging trước; merge commit của PR release lên Production khi tree đã qua Staging; smoke fail giữ bản cũ và báo `failure`.
- [x] Test chạy lại sau khi lượt trước dừng giữa chừng: không deploy lại bản đã xong, không bỏ sót bản chưa xong.
- [x] Test log và tham số dòng lệnh không chứa token.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh
- [x] `ao-deploy.mjs tick --dry-run` chạy được trên máy bạn với một `deployer.yaml` mẫu trỏ tới `ao-pilot`, bằng key của `ao-deploy` ở máy

**Phụ thuộc:** T3, T5, T6, T7

**File dự kiến:** `lib/release/deployer.mjs`, `scripts/ao-deploy.mjs`, `lib/tracker/github-client.mjs`

**Cỡ:** L. Nếu quá năm file, tách phần bản ghi ra `lib/release/record.mjs` thành task riêng.

### [x] T9: Thư mục `vps/` và phần deployer của `docs/vps-setup.md` (spec mục 2.3, 2.11)

**Mô tả:**

- `vps/Caddyfile.template`: một khối cho mỗi subdomain ở bảng của spec mục 2.11; basic auth cho Development và Staging bằng bản băm bcrypt; Production để mở.
- `vps/ao-deploy.service`, `vps/ao-deploy.timer`: chạy mỗi phút dưới user `aodeploy`; không mở lượt mới khi lượt trước chưa xong.
- `vps/deployer.example.yaml` và schema của nó: dự án, repo, subdomain, `AO_APPROVERS`.
- `docs/vps-setup.md` thêm phần cài deployer: user `aodeploy`, thư mục và quyền của spec mục 2.3, cách chép bản kit ghim, cách bạn nhập bí mật bằng `ssh -t` (plan, quyết định 7).

**Tiêu chí chấp nhận:**
- [x] Test sinh Caddyfile từ `deployer.yaml` mẫu: đủ sáu subdomain, basic auth chỉ ở Development và Staging.
- [x] `npm run validate` kiểm `deployer.example.yaml`, có fixture âm.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T8

**File dự kiến:** `vps/Caddyfile.template`, `vps/ao-deploy.service`, `vps/ao-deploy.timer`, `vps/deployer.example.yaml`, `docs/vps-setup.md`

**Cách làm khi xong T9** (Phiên 27 · Lượt 5):

- Không có `vps/Caddyfile.template`. Caddy chuyển subdomain tới alias và cổng của app `public`, mà hai giá trị đó nằm trong `deploy.yaml` ở từng commit. Vì vậy deployer nhớ app `public` của bản đang chạy ở mỗi môi trường, sinh lại Caddyfile sau mỗi lượt bằng `lib/release/caddy.mjs`, và chỉ ghi file, `caddy reload` khi nội dung đổi. Môi trường chưa có bản nào trả 503, nhưng vẫn có site để Caddy lấy sẵn chứng chỉ.
- Schema của `deployer.yaml` nằm ở `lib/release/deployer.schema.json`, cùng chỗ với schema của `deploy.yaml`. Quy tắc V1 (schema), V2 (không trùng tên, repo hay subdomain).
- `vps/ao-secret.sh` hỏi bí mật mà không hiện chữ, cho token Jira, mật khẩu basic auth và biến bí mật của app. Bạn gọi nó qua `ssh -t`, nên không có dấu nháy lồng nhau mà PowerShell 5 truyền sai cho `ssh.exe`.
- `deployer.yaml` khai thêm `caddyfile` và `basic_auth_file`.

**Cỡ:** M

---

## Giai đoạn 4: cổng và Jira

### [x] T10: `merge-gate`: PR release, tag và PR merge ngược (spec mục 2.7, 2.10)

**Mô tả:**

- Mục mới trong `quality/gates.yaml` cho PR release và PR merge ngược, kèm schema và quy tắc kiểm của `npm run validate`.
- PR release (`release/vX.Y.0` → `main`): merge bằng merge commit khi CI xanh trên head và một login trong `AO_APPROVERS` đã approve head; gắn tag `vX.Y.0` vào merge commit; mở PR merge ngược `main` → `develop`.
- PR merge ngược (head `main`, vào `develop` hay nhánh `release/*` đang mở): merge bằng merge commit khi CI xanh và không có xung đột, không cần approve; có xung đột thì gắn cờ "Needs you" và không merge.
- `docs/quality-gates.md` trường hợp 3 ghi cách mới.
- **Cách làm khi xong T10** (Phiên 27 · Lượt 7): mục `release_pull_requests` (cách merge, dạng tag, nhánh nhận PR merge ngược, nhánh mở PR merge ngược sau release) và quy tắc Q6. PR release không bị đường dẫn được bảo vệ bắt bạn tự merge, vì từng thay đổi đã qua cổng ở PR riêng. PR merge ngược có xung đột nhận một comment "Needs you" trên PR, không có cờ trên Jira, vì PR đó không thuộc item nào. `isBackMerge` nằm ở `merge-gate.mjs`, `audit` dùng chung.

**Tiêu chí chấp nhận:**
- [x] Test PR release: merge bằng merge commit và gắn tag; không merge khi thiếu approve trên head hay CI chưa xanh.
- [x] Test PR merge ngược: merge khi không xung đột; gắn cờ khi có; không nhận PR merge ngược có head khác `main`.
- [x] Test dương và fixture âm cho mục mới của `quality/gates.yaml`.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T6

**File dự kiến:** `lib/quality/merge-gate.mjs`, `lib/quality/gates.mjs`, `quality/gates.yaml`, `quality/schema/gates.schema.json`, `docs/quality-gates.md`

**Cỡ:** M

### [x] T11: `jira-sync`: ba sự kiện deployment (spec mục 2.9, 2.10)

**Mô tả:** `lib/tracker/sync.mjs` nhận thêm:

- deployment `success` lên Staging của commit hotfix: Bug sang Ready for QA;
- deployment `failure` lên Production: tạo Bug Critical, Found in Production, Affects Version là bản vừa lên. `error` lên Production, tức deployer từ chối trước khi deploy, không tạo Bug (spec mục 2.4);
- deployment `failure` hay `error` lên Development hay Staging: gắn cờ "Needs you" cho item của commit đó.

**Tiêu chí chấp nhận:**
- [x] Test cho ba sự kiện, bằng bản ghi API ghi sẵn.
- [x] Test không tạo Bug lặp khi cùng một deployment báo `failure` hai lần.
- [x] Test `error` lên Production không tạo Bug.
- [x] Test cũ của `jira-sync` vẫn xanh.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T1 (điểm 9)

**Cách làm khi xong T11** (Phiên 27 · Lượt 7):

- Hotfix chạy xong trên Staging đã đưa Bug sang Ready for QA bằng code sẵn có: đường định tuyến `production` của hợp đồng có môi trường QA đầu tiên là Staging. T11 chỉ thêm test cho việc này.
- Bug Critical mang nhãn `ao-deployment-<id>`, để một deployment báo `failure` hai lần chỉ sinh một Bug. Loại item tìm theo tên tiếng Anh (`untranslatedName`, T1). Affects versions là tag của commit vừa chạy, khi tag đó là một version của dự án trên Jira; nếu không, Bug ghi lý do.
- Ở Development và Staging, item bị gắn cờ là item mà header của commit được deploy nêu tên, mỗi deployment một lần.
- Không cần thêm trường nào vào hợp đồng.

**File dự kiến:** `lib/tracker/sync.mjs`, `contract/` nếu quy tắc tạo Bug cần thêm trường

**Cỡ:** M

---

## Giai đoạn 5: bốn lệnh

### [x] T12: Dữ kiện về môi trường, và `attachments.mjs` (spec mục 2.5)

**Mô tả:**

- `lib/workflow/facts.mjs` đọc thêm: bản đang chạy ở từng môi trường (deployment mới nhất có status `success`), commit đó có chứa commit merge của item không, nhánh `release/*` đang mở, tag, và Fix Version trên Jira.
- `lib/tracker/attachments.mjs`: gắn file lên item bằng token CI, trong phiên của bạn (T1, điểm 8), bỏ qua file quá giới hạn của Jira và ghi tên, rồi comment danh sách file.

**Tiêu chí chấp nhận:**
- [x] Test dữ kiện bằng bản ghi API ghi sẵn: môi trường chưa có deployment, deployment `failure` mới nhất, commit có và không có commit merge của item.
- [x] Test `attachments`: gắn đủ; bỏ file quá giới hạn; comment có tên file.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T1 (điểm 8)

**File dự kiến:** `lib/workflow/facts.mjs`, `lib/tracker/attachments.mjs`, `lib/tracker/jira-client.mjs`

**Cách làm khi xong T12** (Phiên 27 · Lượt 8):

- `readRunning`, `contains`, `readReleaseFacts` trong `lib/workflow/facts.mjs`. Nhánh release đang mở là nhánh `release/v*` còn commit chưa vào `main`.
- **Tiền đề sai, đã kiểm:** token chỉ đọc của App `ao-review`, thứ `ao-step` dùng để đọc GitHub, nhận 403 khi đọc deployment; đọc tag thì được. Login `gh` của bạn đọc được (200). Vì vậy các lệnh release đọc deployment bằng login `gh` của bạn, cùng login T16 dùng để tạo yêu cầu deploy. Không xin thêm quyền cho App nào.
- `attachEvidence` đọc giới hạn dung lượng từ Jira (`/rest/api/3/attachment/meta`), không đoán. Client Jira có thêm `attach`, gửi multipart với header `X-Atlassian-Token: no-check`.

**Cỡ:** M

### [x] T13: `/ao-qa` (spec mục 2.2, 2.5)

**Mô tả:**

- `decideStep('qa', …)` trong `lib/workflow/steps.mjs`: môi trường QA theo bảng định tuyến; `STOP` khi item không ở Ready for QA, hay môi trường chưa chạy bản chứa commit merge của item.
- `ao-step.mjs` đọc deployment bằng login `gh` của bạn (T12), không bằng token của `ao-review`.
- `ao-step.mjs qa <KEY> --go`:
  1. tạo worktree ở đúng commit đang chạy, trong thư mục temp, rồi `npm ci`;
  2. chạy `qa` với `E2E_BASE_URL`, và với Development, Staging thì thêm `E2E_HTTP_USER`, `E2E_HTTP_PASSWORD` lấy từ `AO_ENV_AUTH`;
  3. gắn ảnh và trace lên item bằng T12;
  4. so commit đang chạy lúc đầu và lúc cuối lượt, khác thì ghi vào báo cáo.

**Tiêu chí chấp nhận:**
- [x] Test `steps`: một trường hợp `GO`, và `STOP` cho sai trạng thái, môi trường chưa có commit của item.
- [x] Test môi trường của phiên `qa` có đủ biến E2E, không có `JIRA_CI_TOKEN`, và tham số dòng lệnh không chứa mật khẩu.
- [x] Test deploy mới giữa lượt được ghi vào báo cáo.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T12

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs`, `lib/workflow/prompts.mjs`

**Cách làm khi xong T13** (Phiên 27 · Lượt 8):

- **Chỗ hở đã sửa:** `JIRA_CI_TOKEN` là biến môi trường của user Windows, nên mọi tiến trình kế thừa nó, kể cả phiên agent; `ao-agent.mjs` chưa xóa biến này. `CLEARED_ENV` giờ xóa thêm `JIRA_CI_TOKEN`, `JIRA_ADMIN_TOKEN`, `AO_JIRA_READ_TOKEN`, `AO_ENV_AUTH` khỏi mọi phiên agent, không riêng `qa`.
- `qa` nhận `E2E_BASE_URL`, và với Development, Staging thì thêm `E2E_HTTP_USER`, `E2E_HTTP_PASSWORD` tách từ `AO_ENV_AUTH`, qua môi trường của lệnh; không giá trị nào nằm trong tham số.
- Worktree của `qa` nằm ngoài dự án như worktree của review, ở đúng commit đang chạy, bỏ file hướng dẫn, rồi `npm ci --ignore-scripts` với môi trường đã xóa bí mật.
- Runner có thêm hook `after`, chạy sau lượt agent và trước khi xóa worktree: gắn ảnh trong `.ai/qa/<KEY>/` và trace của Playwright lên item bằng token CI, rồi so commit đang chạy. Ghi chú của hook nằm trong `state.json` và `last.md`.
- `/ao-status` và Next của item ở Ready for QA giờ là `/ao-qa <KEY>`.

**Cỡ:** M

### [x] T14: `/ao-release` (spec mục 2.2, 2.6)

**Mô tả:**

- `decideStep('release', …)`: `STOP` khi có nhánh `release/*` đang mở, hay không có item Done chưa release. Không có tham số thì in điểm cắt, danh sách item và số bản như spec mục 6, rồi dừng ở gate ④.
- `/ao-release <vX.Y.0> <sha>`: kiểm `<sha>` đúng là điểm cắt và số bản đúng; kiểm Fix Version `vX.Y.0` và bản kế tiếp đã có trên Jira. Sau đó:
  1. tạo nhánh `release/vX.Y.0` tại `<sha>` dưới tên bot `ao-dev`;
  2. gắn Fix Version cho các item trong bản, chuyển item sau điểm cắt sang bản kế tiếp, bằng token CI;
  3. comment lên từng item: số bản, điểm cắt, thời điểm bạn duyệt.

**Tiêu chí chấp nhận:**
- [x] Test `steps`: `GO`; `STOP` khi có nhánh release đang mở, thiếu Fix Version trên Jira, `<sha>` không phải điểm cắt.
- [x] Test việc gắn và chuyển Fix Version bằng client giả.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T3, T12

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs`, `lib/tracker/jira-client.mjs`

**Cách làm khi xong T14** (Phiên 27 · Lượt 8):

- Lịch sử first-parent của `develop` đọc từ git của bản checkout trên máy bạn, sau `git fetch --tags origin develop`, từ tag mới nhất. Trạng thái từng item đọc riêng bằng token của agent; item Jira không trả lời được giữ điểm cắt lại như item chưa Done.
- Kế hoạch đổi Fix Version là hàm thuần `releaseCutChanges` (`lib/release/release-cut.mjs`), có test. Bước `release-cut` của `ao-step` làm Jira trước, tạo nhánh sau cùng: khi nhánh đã có, lệnh dừng ở "nhánh release đang mở", nên một bước dở trước đó chạy lại được.
- Runner có thêm bước script (`act`), không gọi agent. Báo cáo của lệnh release nằm ở `.ai/runs/<vX.Y.0>/last.md`.
- Major là quyết định của bạn: `/ao-release v1.0.0 <sha>` được nhận khi bản kế tiếp là `v0.N.0`.
- **Trước kiểm thật** (T1): `ao-pilot` còn tag `v0.1.0` và nhánh `release/0.1.0` ở `d013acc`, và `main` có 4 commit không nằm trong `develop`. Quyết định ở Checkpoint 2: giữ nguyên, bản đầu tiên là `v0.2.0`.

**Cỡ:** M

### [x] T15: `/ao-ship` cho bản release (spec mục 2.7)

**Mô tả:**

- `decideStep('ship', …)` cho `vX.Y.0`: Staging đang chạy head của `release/vX.Y.0` và smoke xanh; không còn Bug Critical hay High mở mang Fix Version này.
- `--go`:
  1. `qa` chạy full regression trong worktree ở commit đang chạy, ghi `.ai/runs/vX.Y.0/regression-report.md`; FAIL thì dừng, kèm bản nháp Bug;
  2. `devops` viết mục `CHANGELOG.md`, mô tả PR release và đoạn mô tả Fix Version vào `.ai/runs/vX.Y.0/`;
  3. script, dưới tên bot `ao-dev`, commit `docs/releases/vX.Y.0.md` và `CHANGELOG.md` lên nhánh release, rồi mở PR release bằng `ao-pr.mjs`;
  4. script kiểm diff từ commit đã chạy regression tới head mới chỉ sửa hai file đó.

**Tiêu chí chấp nhận:**
- [x] Test `steps`: `GO`; `STOP` khi Staging chạy commit khác, còn Bug Critical hay High, regression chạy trên commit cũ, diff sau regression sửa file khác.
- [x] Test thứ tự lượt và điểm dừng khi regression FAIL.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T13

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs`, `lib/workflow/prompts.mjs`

**Cách làm khi xong T15** (Phiên 27 · Lượt 9):

- Mỗi lần gõ, `/ao-ship` đi tiếp từ bước còn thiếu: regression của `qa`, ghi chú của `devops`, rồi bước script `release-pr`. PR release đã mở và regression còn đúng thì dừng ở gate ⑤.
- **Lệch so với tiêu chí:** nhánh release đổi file khác báo cáo và `CHANGELOG.md` sau regression thì `/ao-ship` chạy lại regression trên head mới, thay vì chỉ dừng; dừng thì lần gõ sau cũng dừng y như vậy. Bước script vẫn dừng nếu thấy file khác (spec mục 2.7, bước 5).
- `qa` kết thúc mục Regression Result bằng dòng `Result: PASS` hay `Result: FAIL`; `state.json` ghi commit lượt regression đã chạy.
- Commit báo cáo tạo qua API của GitHub, với tác giả và người commit là bot `ao-dev`, để quy tắc mới của `audit` (T6) nhận ra. [Chưa kiểm] GitHub có giữ đúng hai login đó cho commit tạo qua API không; T21 kiểm.
- `/ao-ship vX.Y.Z` với Z khác 0 (hotfix) đi theo T16.

**Cỡ:** M

### [x] T16: `/ao-ship` cho hotfix, `/ao-rollback` và `/ao-status` (spec mục 2.2, 2.8, 2.9)

**Mô tả:**

- `/ao-ship vX.Y.(Z+1)`: kiểm Bug đã Done và Staging đang chạy commit hotfix. Rồi script, bằng login `gh` của bạn, gắn tag và tạo yêu cầu deploy Production; mở PR merge ngược `main` → `develop`, và `main` → nhánh `release/*` nếu đang mở.
- `/ao-rollback <môi trường> [<sha>]`: không có `<sha>` thì tìm bản trước đã chạy thành công; có `<sha>` thì dùng đúng bản đó (plan, quyết định 5). Tạo yêu cầu deploy bằng login `gh` của bạn, đánh dấu rollback.
- **Yêu cầu deploy** (T8 đọc theo dạng này): một deployment của commit đó, `environment` là môi trường, `payload` là `{ "ao": "request", "rollback": true }` hay `false`, `required_contexts: []`, `auto_merge: false`. Deployer đọc 30 deployment mới nhất của mỗi môi trường, chỉ xử lý yêu cầu mới nhất chưa xử lý, và báo các yêu cầu cũ hơn là `error` "superseded".
- `/ao-status` hiện thêm: bản đang chạy ở từng môi trường, nhánh release đang mở, item Done chưa release, Fix Version đã lên Production mà chưa Release trên Jira.

**Tiêu chí chấp nhận:**
- [x] Test `steps` cho hotfix và rollback: `GO`, và `STOP` khi Bug chưa Done, Staging chạy commit khác, môi trường chưa có bản trước.
- [x] Test yêu cầu deploy được tạo bằng client của login của bạn, không phải bằng token của App.
- [x] Test các dòng mới của `/ao-status`.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T5, T15

**File dự kiến:** `lib/workflow/steps.mjs`, `lib/workflow/runner.mjs`, `scripts/ao-step.mjs`

**Cách làm khi xong T16** (Phiên 27 · Lượt 9):

- `/ao-ship vX.Y.Z` với Z khác 0 là hotfix: bản vá kế tiếp của tag mà Production đang chạy; head của `main` phải là merge của một PR `hotfix/<BUG>`, Bug đã Done và mang Fix Version này, Staging chạy đúng commit đó. Bước script `hotfix-ship`: tag và yêu cầu deploy Production bằng login `gh` của bạn, PR merge ngược vào `develop` và nhánh release đang mở bằng App `ao-dev`.
- `/ao-rollback <môi trường>` chọn bản gần nhất đã từng chạy thành công ở đó, khác bản đang chạy; `/ao-rollback <môi trường> <sha>` dùng đúng commit đó. Bước script `deploy-request` tạo yêu cầu bằng login `gh` của bạn (`lib/release/deploy-request.mjs`). Một yêu cầu chưa được deployer trả lời thì lệnh không tạo yêu cầu thứ hai.
- `/ao-status` của space thêm dòng Running, nhánh release đang mở, item Done chưa release, và nhắc bấm Release cho Fix Version đang chạy trên Production. Không có login `gh` thì bỏ các dòng này.

**Cỡ:** M

### [x] T17: Bốn skill, prompt và hợp đồng (spec mục 2.2, 2.10)

**Mô tả:**

- `kit/.claude/skills/ao-qa/`, `ao-release/`, `ao-ship/`, `ao-rollback/`: cùng cách của sáu skill của `dev-workflow`, có `disable-model-invocation: true` và gọi đúng `ao-step.mjs`.
- `agents/prompts/qa.md`: QA trên môi trường, full regression. `agents/prompts/devops.md`: release note, mô tả PR release; bỏ câu "chờ `release-workflow`".
- Hợp đồng: stage `release-cut` ghi rằng script làm thay `devops`; stage `hotfix` ghi gate ⑤ là yêu cầu deploy của bạn. `docs/sdlc.md` được sinh lại.

**Tiêu chí chấp nhận:**
- [x] Test frontmatter của bốn skill.
- [x] `npm run render:check` và `npm run agents:check` xanh sau khi sinh lại.

**Kiểm chứng:**
- [x] Năm lệnh trong quy ước chung xanh

**Phụ thuộc:** T13–T16

**File dự kiến:** bốn `SKILL.md`, `agents/prompts/qa.md`, `agents/prompts/devops.md`, `contract/stages.yaml`

**Cỡ:** M

### Checkpoint 2

- [x] Năm lệnh kiểm trong quy ước chung và CI của kit xanh
- [x] Claude chạy `ao-step.mjs` ở chế độ chỉ kiểm trong `ao-pilot`, bằng code của kit: `qa DEMO-21`, `release`, `ship v0.1.0`, `rollback production`. Các lệnh dừng đúng chỗ, vì VPS chưa có deployer. Không agent nào chạy
- [x] Bạn đọc kết quả đó, skill `ao-ship`, và phần prompt đã sửa (Phiên 27 · Lượt 12)

**Quyết định ở Checkpoint 2** (Phiên 27 · Lượt 12, phát hiện trong `tasks/verification.md`):

- **Điểm cắt không tính key của Epic.** Hợp đồng và spec mục 2.6 ghi theo.
- **Item cũ của `ao-pilot`:** Claude sửa dữ liệu một lần trên Jira bằng token bot, kèm comment trên từng item. `DEMO-10` sang Ready for QA, để `qa` kiểm ở T21 cùng `DEMO-6` và `DEMO-21`. `DEMO-5`, `DEMO-8`, `DEMO-9`, `DEMO-16`, `DEMO-19` sang In QA, rồi **bạn** `Accept` không qua `qa`: ngoại lệ một lần với guard `qa-report-passed`. Đã xong: Claude sửa qua Rovo MCP, bạn `Accept` (`tasks/verification.md`).
- **`ao-pilot` giữ tag `v0.1.0`:** bản đầu tiên của kiểm thật là `v0.2.0`, hotfix là `v0.2.1`.
- **Deployment cũ của `deploy.yml`** chuyển `inactive` ở T18, trước `baseline`.
- **Claude tiếp tục tự merge PR của kit khi CI xanh** (plan, quyết định 10).

---

## Giai đoạn 6: lên VPS và `ao-pilot`

### [ ] T18: Cài deployer lên VPS [bạn]

**Mô tả:**

- **Bạn** nạp lại key SSH vào ssh-agent.
- Claude cài theo phần deployer của `docs/vps-setup.md`:
  - user `aodeploy`, các thư mục và quyền của spec mục 2.3;
  - chép bản kit ghim theo commit của `main` kit bằng `scp`;
  - chép private key của `ao-deploy` bằng `scp`, không mở file;
  - `deployer.yaml`, quyền ghi Caddyfile cho `aodeploy`, systemd service và timer (`docs/vps-setup.md` mục 11).
- **Bạn** nhập mật khẩu basic auth và token Jira chỉ đọc bằng lệnh `ssh -t` do Claude soạn, trong terminal của bạn, rồi đặt `AO_ENV_AUTH` trên máy bạn và xóa file key ở máy.
- Claude chuyển các deployment cũ của `deploy.yml` sang `inactive` bằng login `gh` của bạn (Checkpoint 2).
- Claude chạy `ao-deploy.mjs baseline pilot` và đưa bạn danh sách head. Bạn đồng ý thì Claude chạy lại với `--confirm` (T8).
- Claude chạy `tick --dry-run`, đọc kết quả, rồi bật timer.

**Tiêu chí chấp nhận:**
- [ ] `tick --dry-run` in đúng việc sẽ làm cho `ao-pilot`: chưa có `deploy.yaml` nên chưa deploy.
- [x] Commit kit đã ghim nằm trong `tasks/verification.md`.
- [x] Trên VPS: deployer gọi được IP của container trong mạng của dự án để smoke; `docker buildx prune --max-used-space 4gb` chạy được với Docker 29.9.3 (T7).
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
- `/ao-build` cho `devops`: Dockerfile, `.dockerignore` bỏ `docs/` và `*.md`, `.ai-orchestrator/deploy.yaml`, biến `HOST`, bỏ `deploy.yml` và `audit.yml`.
- Cũng trong lượt đó: server nhận Host và Origin của `AO_PUBLIC_URL`, ngoài `127.0.0.1` và `localhost`, và ADR-0001 của `ao-pilot` ghi thêm điều này; `playwright.config.ts` đọc `E2E_BASE_URL` và `httpCredentials`, và 5 test gửi request thô (AC9–AC11 của `DEMO-11`, AC10–AC11 của `DEMO-20`) mang tag `@local` (spec mục 2.5).
- Sau lượt build, Claude thêm commit chép kit mới lên cùng nhánh, bằng helper của vai trò `devops` (plan, quyết định 6).
- `/ao-review`, `/ao-fix` nếu cần, gate ③. **Bạn** merge, vì PR sửa đường dẫn được bảo vệ.
- Deployer deploy Development; `jira-sync` chạy theo deployment đó.

**Tiêu chí chấp nhận:**
- [ ] `https://pilot-dev.ao.t2g.io.vn` chạy bản mới, có HTTPS, hỏi basic auth.
- [ ] Container của `ao-pilot` chạy được với các cờ của T7 (`--cap-drop ALL`, `no-new-privileges`); Dockerfile không cần quyền root đặc biệt.
- [ ] E2E của `ao-pilot` với `E2E_BASE_URL` của Development: 24/24 xanh, trong đó 5 test `@local` chạy vào server tại chỗ.
- [ ] Deployment `development` có trên GitHub và hiện trên item Jira.
- [ ] Chi phí của từng lượt agent nằm trong `tasks/verification.md`.

**Kiểm chứng:**
- [ ] CI của PR xanh; `.ai-orchestrator/` của `ao-pilot` giống `main` của kit ở các file đã chép

**Phụ thuộc:** T18

**File dự kiến:** trên `ao-pilot`; trong kit chỉ `tasks/verification.md`

**Cỡ:** M

### [ ] T20: Kiểm rằng cổng chặn đúng (spec mục 7, bước 10)

**Mô tả:**

1. Claude push thẳng một commit nhỏ lên `develop` của `ao-pilot`, không qua PR. Deployer không deploy commit đó, báo `error` kèm lý do, và `jira-sync` gắn cờ. Rồi bạn gỡ chặn bằng `/ao-rollback development <sha>` sau khi đọc commit đó (plan, quyết định 5).
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

1. `/ao-qa` trên Development cho `DEMO-21`, `DEMO-6`, `DEMO-10` và Task của T19; bằng chứng nằm trên Jira; **bạn** Accept từng item. Task của T19 phải Done, vì `deploy.yaml` và Dockerfile nằm trong commit của nó: thiếu nó, điểm cắt dừng trước đó và Staging không có gì để deploy.
2. **Bạn** tạo Fix Version `v0.2.0` và `v0.2.0` trên Jira theo từng bước bấm. `/ao-release`, rồi **bạn** gõ `/ao-release v0.2.0 <sha>` (gate ④). Deployer deploy Staging.
3. `/ao-ship v0.2.0`; **bạn** đọc PR release rồi approve (gate ⑤). `merge-gate` merge, gắn tag, mở và merge PR merge ngược. Deployer deploy Production, smoke xanh. **Bạn** bấm Release cho `v0.2.0` trên Jira.

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

1. **Bug thử:** một lỗi nhỏ có thật của `ao-pilot`, do `qa` hay bạn thấy ở T21. Nếu không có, Claude đề xuất một lỗi nhỏ để bạn chọn trước khi tạo Bug. Bug đi theo spec mục 2.8 tới `v0.2.1` trên Production.
2. `/ao-rollback production` về `v0.2.0`, rồi `/ao-rollback production <sha của v0.2.1>` đưa `v0.2.1` lên lại.
3. **Smoke fail có chủ đích:** Claude đề xuất cách gây fail mà không cần commit mới, ví dụ một biến môi trường sai trong `/etc/ao/secrets/pilot/production.env` rồi `/ao-rollback production` về bản trước. Yêu cầu deploy lại đúng tree đang chạy thì không gây fail được: deployer giữ nguyên container và không smoke lại (T8). Bạn đồng ý thì Claude làm. Deployer giữ bản cũ, và Jira có Bug Critical. Xong thì Claude trả biến về như cũ và chuyển Bug thử đó sang Cancelled.

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
- `docs/release-workflow.md`: bốn lệnh, một vòng release, các bước bấm Fix Version trên Jira, yêu cầu với dự án (Dockerfile, `.dockerignore`, `deploy.yaml`, `playwright.config.ts` với tag `@local`, `AO_PUBLIC_URL`), quy tắc expand/contract cho cơ sở dữ liệu.
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

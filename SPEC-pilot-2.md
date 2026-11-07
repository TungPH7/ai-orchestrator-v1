# SPEC: Pilot 2

> **Loại:** pilot, không phải module. Xem tiêu chí thành công 2 và mục "Thứ tự build" trong [SPEC.md](SPEC.md). **Dùng:** mọi module Cấp 1 đã xong, gồm `release-workflow` và `kit-copy-review`. **Là đầu vào cho:** `project-scaffold`.
>
> **Trạng thái:** đã duyệt 2026-11-07 (Phiên 27 · Lượt 74): rollback trên Development, `qa` cho cả 8 item. Plan ở [tasks/pilot-2/](tasks/pilot-2/plan.md).

## 1. Mục tiêu

Pilot 2 đưa Epic "Ghi chú" (`SMP-2`) của `ao-sample` từ Ready for QA lên Production, theo đúng vòng ngoài của `release-workflow`. `ao-pilot` đã đi vòng này một lần; Pilot 2 khác ở bốn điểm:

1. **Dự án thứ hai trên cùng VPS.** Deployer chạy hai dự án cùng lúc, mỗi dự án ba môi trường.
2. **Hai app trong một dự án.** `apps/web` (Next.js) công khai, `apps/api` (NestJS) chỉ chạy trong mạng nội bộ của môi trường. `ao-pilot` chỉ có một app.
3. **Lần release đầu tiên của một dự án.** `ao-sample` chưa có tag, `main` chỉ có commit đầu; `v0.1.0` là bản đầu.
4. **Epic làm bằng agent từ spec.** Các item của `SMP-2` do agent viết ở Pilot 1. Ở `ao-pilot`, phần lớn code có sẵn từ trước.

Sau Pilot 2:

- `https://sample.ao.t2g.io.vn` chạy `v0.1.0`; `sample-dev` và `sample-staging` chạy đúng bản theo mục 2.4 của spec `release-workflow`, có basic auth.
- 6 item của `SMP-2`, Task chép kit `SMP-16` và Task hạ tầng mới (mục 2.2) đều Done, có Fix Version `v0.1.0` đã Release. Epic `SMP-2` Complete.
- Một lần rollback chạy thật trên `ao-sample` (mục 2.5).
- `audit` qua commit merge của `ao-sample` PR #14. Đây là tiêu chí 6 của `kit-copy-review`, còn chờ.
- Các bước thêm dự án thứ hai lên VPS được ghi lại, làm đầu vào cho `project-scaffold`.
- Lỗi kit tìm được trong lúc chạy được sửa ở kit, có test.

**Ngoài phạm vi:**

- Cơ sở dữ liệu thật. API giữ ghi chú trong bộ nhớ, nên mỗi lần deploy hay rollback mất hết ghi chú. Đây là giới hạn đã biết của app mẫu.
- Các Low của code app từ Pilot 1 và 9 lỗi moderate ở dev dependency: để cho một vòng `v0.2.0` sau.
- PR kit gom các Low của `kit-copy-review` và của `release-workflow`: làm riêng.
- `figma-integration`, `project-scaffold`.

## 2. Thiết kế

### 2.1 Hai app trên VPS

`.ai-orchestrator/deploy.yaml` của `ao-sample` (dự kiến):

```yaml
apps:
  web:
    dockerfile: apps/web/Dockerfile
    port: 3000
    health: /
    public: true
  api:
    dockerfile: apps/api/Dockerfile
    port: 3001
    health: /health
smoke:
  - { app: web, path: /notes, expect_status: 200, expect_text: "Ghi chú" }
  - { app: api, path: /health, expect_status: 200 }
```

- Build context là gốc repo, vì đây là monorepo npm workspaces; Dockerfile nằm trong thư mục của từng app.
- **Web gọi API qua alias `api`** trong mạng Docker của môi trường: `http://api:3001`. Deployer đặt alias này cho container của app `api` ở mỗi môi trường, nên giá trị giống nhau ở cả ba môi trường. Vì vậy có thể ghi sẵn vào image lúc build, phù hợp với việc `rewrites()` của Next.js đọc `API_URL` lúc build. Như vậy cùng một image chạy được ở cả ba môi trường, đúng yêu cầu "tag image là mã tree" của mục 2.3 spec `release-workflow`.
- API không có subdomain và không có cổng nào ra ngoài. Trình duyệt chỉ gọi `/api/notes` trên origin của web (ADR-0002 của `ao-sample`).
- Thời gian build đo ở T2 của `release-workflow`: API khoảng 5 phút, web khoảng 6 phút. Deployer làm một việc mỗi lúc, nên một lần deploy `ao-sample` có thể làm deploy của `ao-pilot` chờ tới khoảng 12 phút. Lần build sau trúng cache `npm ci` thì nhanh hơn.

### 2.2 Task hạ tầng `SMP-17`

Một Task mới, như `DEMO-26` của `ao-pilot` (T19 của `release-workflow`). Claude tạo bằng token CI, nhãn `ao-devops`; bạn bấm Refine.

- **`devops` qua `/ao-build`:**
  - Dockerfile cho `apps/web` và `apps/api`, chạy không cần quyền root, chịu được các cờ `--cap-drop ALL` và `no-new-privileges`.
  - `.dockerignore` bỏ `docs/` và `*.md`.
  - Web lắng nghe trên mọi địa chỉ trong container.
  - Gỡ `deploy.yml` và `audit.yml` giả, vì deployer thay chúng.
  - `playwright.config.ts` đọc `E2E_BASE_URL` và basic auth, như `ao-pilot`. Test nào gọi thẳng API ở `localhost:3001` (`create-note-api.spec.ts`) phải gọi qua `/api/notes` của web, hoặc mang tag `@local` để chỉ chạy tại chỗ.
- **Claude, dưới tên bot `ao-dev`, trên cùng nhánh:** `.ai-orchestrator/deploy.yaml` và `AO_KIT_PEERS` trong `.claude/settings.json`, vì không agent nào được sửa hai đường dẫn được bảo vệ này.
- `/ao-review`: `security` chạy ở `max` vì PR chạm đường dẫn được bảo vệ. Bạn merge ở gate ③.

### 2.3 VPS

Claude làm từ phiên chính, theo [docs/vps-setup.md](docs/vps-setup.md). Bạn nạp key SSH và mở đăng nhập root như ở T18, rồi đóng lại khi xong.

1. **Bạn** cài App `ao-deploy` vào repo `ao-sample`, theo mục 3 của [docs/github-apps-setup.md](docs/github-apps-setup.md).
2. Claude thêm dự án `sample` vào `/etc/ao/deployer.yaml`. Host đã có sẵn trong `vps/deployer.example.yaml`, và bản ghi DNS wildcard `*.ao.t2g.io.vn` đã trỏ về VPS.
3. Tạo `/etc/ao/secrets/sample/<môi trường>.env`, rỗng: hai app chưa cần bí mật nào.
4. **Bạn** đặt các deployment giả cũ của `ao-sample` thành inactive bằng login `gh` của bạn, như T18 làm với `ao-pilot`.
5. `baseline sample --confirm` tại head hiện tại của `develop`, trước khi `SMP-17` merge. Lần deploy thật đầu tiên là commit merge của `SMP-17`.
6. Đo RAM khi cả hai dự án chạy đủ môi trường, cộng lúc mỗi app có hai container.

Bản kit trên VPS giữ ở `521e031`. Deployer và `audit` không đổi từ đó tới `main` hiện tại. Nếu Pilot 2 cần sửa deployer, Claude hỏi bạn trước khi chép kit mới lên VPS.

### 2.4 Đường đi của bản `v0.1.0`

1. `SMP-17` merge, deployer deploy Development.
2. `/ao-qa` trên Development cho 8 item: `SMP-4`, `SMP-5`, `SMP-6`, `SMP-7`, `SMP-10`, `SMP-11`, `SMP-16`, `SMP-17`. Bằng chứng nằm trên Jira. **Bạn** Accept từng item.
3. **Bạn** tạo Fix Version `v0.1.0` và `v0.2.0` trong space `SMP`, theo [docs/release-workflow.md](docs/release-workflow.md#fix-version-trên-jira).
4. **Gate ④:** `/ao-release v0.1.0 <sha>`. Script tạo `release/v0.1.0` và gắn Fix Version. Deployer deploy Staging.
5. `/ao-ship v0.1.0`: `qa` chạy regression trên Staging, `devops` viết release notes. Script mở PR release vào `main`.
6. **Gate ⑤:** bạn approve PR release. `merge-gate` merge, gắn tag `v0.1.0`, mở PR merge ngược vào `develop`. Deployer deploy Production sau khi kiểm hai điều kiện cứng.
7. **Bạn** bấm Release cho `v0.1.0` trên Jira, rồi Complete Epic `SMP-2`.

### 2.5 Rollback

Production chỉ có một bản, nên không có gì để quay về. Pilot 2 chạy rollback trên Development: sau ít nhất hai lần deploy thật, `/ao-rollback development` đưa image trước đó lên, rồi `/ao-rollback development <sha>` đưa bản mới về lại. Hai lệnh này là script, 0 USD. Rollback Production đã chạy thật trên `ao-pilot` ở T22 của `release-workflow`.

### 2.6 Dọn Jira

Bạn bấm `Cancel` cho 5 Task chép kit cũ ở trạng thái New: `SMP-3`, `SMP-12`, `SMP-13`, `SMP-14`, `SMP-15`. Bản chép trong `SMP-16` đã thay chúng.

## 3. Chi phí ước tính

| Việc | USD [Ước tính] |
|---|---|
| `SMP-17`: `devops` build, `reviewer`, `security` ở `max`, có thể một vòng sửa | 15–25 (T19 của `ao-pilot` tốn 20,53) |
| `qa` cho 8 item trên Development | Khoảng 7 |
| `/ao-ship v0.1.0` | Khoảng 2 |
| Dự phòng cho lỗi tìm ra khi chạy | 5 |
| **Tổng** | **Khoảng 30–40** |

`/ao-release`, `/ao-rollback`, phần VPS và việc của Claude dưới tên bot không gọi agent. Agent chạy lần lượt, có theo dõi mỗi 3 phút.

## 4. Ranh giới

**Luôn làm:** agent chạy lần lượt, chỉ trên `ao-sample` và space `SMP`; ghi chi phí từng lượt; chỉ phiên chính của Claude SSH vào VPS; key và mật khẩu không bao giờ xuất hiện trong chat, commit hay log.

**Hỏi trước:** chép kit mới lên VPS; mở cổng hay dịch vụ mới trên VPS; thêm quyền cho App hay agent; chạy thêm lượt agent khi chi phí vượt 40 USD.

**Không làm:** bấm thay bạn các gate ③ ④ ⑤ hay Accept trên Jira; push thẳng lên `develop` hay `main`; đụng tới `ao-pilot` ngoài việc deployer chạy chung.

## 5. Tiêu chí hoàn thành

1. `https://sample.ao.t2g.io.vn` trả trang "Ghi chú" của `v0.1.0`. `sample-dev` và `sample-staging` hỏi basic auth.
2. Container `api` không có subdomain nào; web tạo và đọc được ghi chú qua `/api/notes` ở cả ba môi trường.
3. 8 item Done, có Fix Version `v0.1.0` đã Release. Epic `SMP-2` Complete.
4. Tag `v0.1.0` nằm trên `main`; PR merge ngược đã vào `develop`.
5. `/ao-rollback development` và lệnh đưa bản mới về lại đều chạy được, smoke test xanh.
6. `audit` qua commit merge của `ao-sample` PR #14.
7. `ao-pilot` vẫn deploy bình thường khi `ao-sample` chạy chung; RAM đo được nằm trong `verification.md`.
8. Năm lệnh kiểm của kit xanh sau mỗi lần sửa kit.

## 6. Câu hỏi mở

1. Chạy rollback trên Development như mục 2.5, hay làm thêm một hotfix `v0.1.1` để thử rollback trên Production? Cách sau tốn thêm khoảng 4–6 USD.
2. `qa` cho cả 8 item, hay chỉ 3 Story và 2 Task hạ tầng, rồi để regression của `/ao-ship` phủ phần còn lại? DoD đòi QA PASS cho từng item, nên mình đề xuất chạy cả 8.

## 7. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| VPS 3,9 GB RAM không đủ cho 9 container và hai lần build | Đo ở mục 2.3. Nếu thiếu, deployer vẫn build từng cái một; có swap 4 GB |
| E2E gọi thẳng API không chạy được qua Caddy, như 5 test của `ao-pilot` | `SMP-17` chuyển các test đó sang `/api/notes` hoặc tag `@local` |
| `rewrites()` của Next.js đọc `API_URL` lúc build | Giá trị `http://api:3001` giống nhau ở mọi môi trường, nên ghi vào image |
| Dữ liệu mất sau mỗi deploy | Đã biết, ngoài phạm vi |
| Deploy của `ao-sample` lâu, làm `ao-pilot` chờ | Chấp nhận ở Pilot 2; ghi số đo |

## Nguồn

- [SPEC-release-workflow.md](SPEC-release-workflow.md), mục 2.3–2.9; [tasks/archive/release-workflow/](tasks/archive/release-workflow/plan.md), T18, T19, T21–T22.
- [SPEC-kit-copy-review.md](SPEC-kit-copy-review.md), tiêu chí 6.
- [SPEC-pilot-1.md](SPEC-pilot-1.md); ADR-0002 của `ao-sample`.

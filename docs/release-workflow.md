# Release workflow: bốn lệnh của vòng ngoài

Vòng trong (`/ao-spec` tới `/ao-fix`, [docs/dev-workflow.md](dev-workflow.md)) đưa code vào `develop`. Vòng ngoài đưa code đó lên Development, Staging và Production trên VPS của bạn. Thiết kế đầy đủ nằm ở [SPEC-release-workflow.md](../SPEC-release-workflow.md); dựng VPS theo [docs/vps-setup.md](vps-setup.md).

## Bốn lệnh

| Lệnh | Làm gì | Agent | Dừng ở |
|---|---|---|---|
| `/ao-qa <KEY>` | Kiểm item trên môi trường QA của nó, chạy E2E, gắn bằng chứng lên Jira | `qa` | Bạn đọc báo cáo rồi `Accept` |
| `/ao-qa <KEY> fail: <lỗi>` | Lỗi bạn thấy khi item ở Ready for QA hay In QA: `qa` tái hiện rồi bấm `QA fail`. Mong đợi mới thì `ba` thêm AC trước | `ba` khi cần, `qa` | Item về In Progress, hoặc mang cờ Needs you khi không tái hiện được |
| `/ao-release` | In điểm cắt, danh sách item và số bản | Không | Gate ④ |
| `/ao-release <vX.Y.0> <sha>` | Gate ④: tạo `release/vX.Y.0` tại điểm cắt, gắn Fix Version | Không | Deployer đưa bản lên Staging |
| `/ao-ship <vX.Y.0>` | Full regression trên Staging, release note, PR release vào `main` | `qa`, `devops` | Gate ⑤: bạn approve PR |
| `/ao-ship <vX.Y.Z>` | Gate ⑤ của hotfix: tag, yêu cầu deploy Production, PR merge ngược | Không | Deployer đưa bản lên Production |
| `/ao-rollback <môi trường> [<sha>]` | Yêu cầu deploy bản trước, hoặc đúng `<sha>`, bằng login `gh` của bạn | Không | Deployer đổi bản |

`/ao-status` hiện thêm bản đang chạy ở từng môi trường, nhánh release đang mở, item Done chưa release, Fix Version đã lên Production nhưng chưa bấm Release, và Epic đã đủ điều kiện `Complete`.

Không có lệnh `/ao-hotfix`: hotfix đi qua các lệnh sẵn có.

## Bản nào lên môi trường nào

| Môi trường | Bản | Khi nào |
|---|---|---|
| Development | Head của `develop` | Mỗi commit mới qua `audit` |
| Staging | Head của `release/*` đang mở, hoặc commit hotfix trên `main` chưa lên Production | Mỗi commit mới qua `audit` |
| Production | Merge commit của PR release bạn đã approve, hoặc một yêu cầu deploy do bạn tạo | Sau gate ⑤ |

Deployer chạy mỗi phút trên VPS và kiểm mọi commit mới trên lịch sử first-parent, không chỉ commit mới nhất. Production có thêm hai điều kiện: có gate ⑤, và tree của commit đã chạy thành công trên Staging. Image được gắn tag theo mã tree, nên Production chạy đúng image đã qua Staging.

## Một vòng release

1. PR vào `develop`. Deployer đưa commit lên Development, và `jira-sync` chuyển item sang Ready for QA.
2. `/ao-qa <KEY>`: `qa` kiểm trên Development và ghi báo cáo lên item. PASS thì item ở In QA; FAIL thì item về In Progress.
3. Bạn đọc báo cáo, rồi `Accept` để item sang Done. Bạn thấy lỗi trước khi bấm `Accept` thì dùng `/ao-qa <KEY> fail: …` (mục "Lỗi bạn thấy khi QA" ở dưới).
4. Bạn tạo trên Jira Fix Version của bản này và bản kế tiếp, nếu chưa có. Từng bước ở mục dưới.
5. `/ao-release`: đọc điểm cắt và danh sách item. Lệnh dừng ở gate ④.
6. **Gate ④:** `/ao-release <vX.Y.0> <sha>`. Script tạo nhánh release, gắn Fix Version cho item trong điểm cắt, và chuyển item sau điểm cắt sang bản kế tiếp. Deployer đưa bản lên Staging.
7. `/ao-ship <vX.Y.0>`: `qa` chạy full regression, `devops` viết release note, và script mở PR release vào `main` với tiêu đề `release: vX.Y.0`.
   - Regression FAIL thì lệnh dừng, và báo cáo có bản nháp Bug. Bug Critical hay High sửa trên nhánh `bugfix/<BUG>-…` vào nhánh release.
   - Có commit mới trên nhánh release thì chạy lại `/ao-ship`: lệnh chạy lại regression và viết lại release note.
8. **Gate ⑤:** bạn đọc PR rồi approve. Bạn không bấm merge. `merge-gate` merge bằng merge commit, gắn tag, và mở PR merge ngược vào `develop`.
9. Deployer đưa merge commit lên Production và chạy smoke test.
10. Bạn bấm Release cho Fix Version trên Jira. Từ đó, Epic có mọi item đã lên Production mới `Complete` được.

## Lỗi bạn thấy khi QA

Theo contract, lỗi tìm thấy khi QA một item chưa Done thì không tạo Bug: item quay về In Progress qua `QA fail` và được sửa trên một nhánh mới, vẫn mang mã item ([SPEC-human-loop.md](../SPEC-human-loop.md) mục 5).

1. `/ao-qa SMP-21 fail: xóa dòng cuối thì giỏ vẫn hiện tổng 120.000 đ; bước: thêm 1 sản phẩm rồi xóa; mong đợi: "Giỏ hàng trống"`. Claude hỏi lỗi này vi phạm AC nào của item, hay là mong đợi mới. Lỗi nằm ngoài item thì báo bằng Bug qua `/ao-intake`.
2. Mong đợi mới thì `ba` thêm AC trên Jira trước (comment AC cũ và mới), chưa sửa SPEC.
3. `qa` tái hiện lỗi trên môi trường QA, ghi báo cáo FAIL kèm bằng chứng, rồi bấm `QA fail`. Không tái hiện được thì `qa` không fail item, mà comment những gì đã thử và gắn cờ Needs you. `ao-step` chỉ gắn lên item những file `qa` ghi trong lượt đó. Ảnh của lượt trước không được gắn lại, kể cả khi `qa` dời chúng vào thư mục con.
4. `/ao-build SMP-21`, đúng như dòng `Next:` của `/ao-qa` sau `QA fail`: `ao-step` tạo nhánh `-r2` từ `develop`. Nếu `ba` đã đổi AC, `ba` chép phần đổi vào `spec.md` trước, rồi các yêu cầu `Cần ux:` / `Cần sa:` viết từ lúc đó chạy trên cùng nhánh, để `design.md` và `plan.md` theo kịp. Story có Sub-task cả BE và FE thì Claude liệt kê lỗi trong báo cáo FAIL và đề xuất chia theo `be:` / `fe:` để bạn duyệt; Sub-task đã Done giữ nguyên, lượt sửa làm ở mức Story.
5. Phần sau đi như thường: PR nháp, xem trước, review, gate ③, deploy, rồi `/ao-qa` lại. `QA fail` tăng Rework; chạm 3 thì item mang cờ.

## Fix Version trên Jira

Agent và token CI không tạo hay phát hành được Fix Version, nên hai việc này do bạn bấm. Trên Jira mới, Fix Version được gọi là "release".

**Thêm tab Releases, một lần cho mỗi space:**

1. Trên board của space, ở hàng tab, bấm dấu **+** ở cuối hàng, chọn **Releases**.
2. Nếu danh sách không có **Releases**: bấm **•••** cạnh tên board, chọn **Space settings**, mở mục **Features**, bật **Releases**, rồi làm lại bước 1.

Link trực tiếp tới trang Releases có thể báo 404 khi board chưa có tab này.

**Tạo Fix Version:**

1. Mở tab **Releases**, bấm **Create release**.
2. Ô **Release name** gõ số bản, ví dụ `v0.3.0`. Các ô khác để trống.
3. Bấm **Create**. Dòng mới có trạng thái Unreleased.

Lúc cắt `vX.Y.0`, bản kế tiếp cũng phải có trên Jira. Thiếu thì `/ao-release` dừng và nhắc bạn.

**Bấm Release, sau khi bản đã chạy trên Production:**

1. Mở tab **Releases**.
2. Ở dòng của bản đó, bấm **•••** ở cuối dòng, chọn **Release**. Nếu không thấy, bấm vào tên bản rồi bấm nút **Release** ở trang của nó.

Với Fix Version mới tạo cho bản kế tiếp, bạn không bấm Release.

## Hotfix

1. Bạn triage Bug Critical hay High của Production, tạo Fix Version `vX.Y.(Z+1)`, gắn cho Bug, rồi `Refine`.
2. `/ao-build <BUG>`: dev agent tách nhánh `hotfix/<BUG>-…` từ `main`, sửa, và thêm test tái hiện lỗi. PR vào `main`.
3. `/ao-review`, `/ao-fix` nếu cần, rồi gate ③. `merge-gate` merge vào `main`.
4. Deployer đưa commit lên **Staging**, không lên Production. `jira-sync` chuyển Bug sang Ready for QA.
5. `/ao-qa <BUG>` trên Staging, rồi bạn `Accept`.
6. **Gate ⑤:** `/ao-ship vX.Y.(Z+1)`. Script gắn tag và tạo yêu cầu deploy bằng login `gh` của bạn, rồi mở PR merge ngược vào `develop` và nhánh release đang mở.
7. Bạn bấm Release cho bản vá trên Jira.

Hotfix chiếm Staging tới khi lên Production. Nếu đang có bản release trên Staging, PR merge ngược làm Staging deploy lại bản đó, và `/ao-ship` của bản release phải chạy lại regression.

## Rollback và gỡ chặn

- `/ao-rollback <môi trường>` yêu cầu bản trước đã chạy thành công ở môi trường đó. Với Production, deployer không tự đưa `main` lên lại sau rollback.
- `/ao-rollback <môi trường> <sha>` có hai việc:
  - **Gỡ chặn:** một commit không qua `audit` chặn mọi head sau nó, kể cả sau khi revert. Bạn đọc commit đó, rồi chạy lệnh cho một head sau nó. Deployer ghi rằng bạn đã duyệt đoạn lịch sử tới đó.
  - **Đưa bản lên lại** sau rollback.

Đo ở `ao-pilot`: rollback Production xong trong 41 đến 75 giây.

## Khi deploy không thành

| Status | Nghĩa là | Điều xảy ra |
|---|---|---|
| `error` | Deployer từ chối trước khi deploy: commit không qua `audit`, thiếu điều kiện của Production, người yêu cầu ngoài `AO_APPROVERS` | Không môi trường nào đổi. Trên Development và Staging, `jira-sync` gắn cờ Needs you |
| `failure` | Smoke test fail sau 60 giây | Container mới bị gỡ, container cũ vẫn phục vụ. Trên Development và Staging, item được gắn cờ. Trên Production, `jira-sync` tạo Bug Critical, Found in Production, Affects Version là bản vừa thử |

Deployer không tự thử lại một yêu cầu đã `failure`. Trong bài thử trên `ao-pilot`, Production không lỗi lần nào suốt lúc smoke fail. Mức độ của Bug tự tạo nằm ở trường Severity; trường Priority vẫn là mặc định của Jira.

## Yêu cầu với dự án

- **`Dockerfile`** ở đường dẫn khai trong `deploy.yaml`. Container chạy bằng user không phải root, với `--cap-drop ALL` và `--security-opt no-new-privileges`, nên app không được cần capability nào.
- **`.dockerignore`** bỏ `docs/`, `*.md`, `node_modules/`, `.git/`, `.ai/`, `.ai-orchestrator/`, `.claude/`, `.github/`, `coverage/`, `test-results/`. Nhờ vậy commit chỉ sửa tài liệu build trúng cache.
- **`.ai-orchestrator/deploy.yaml`** khai các app, Dockerfile, cổng trong container, đường dẫn health, tên biến môi trường, và smoke test:

  ```yaml
  apps:
    web:
      dockerfile: Dockerfile
      port: 3000
      health: /
      public: true
      env: [HOST, PORT]
  smoke:
    - { app: web, path: /, expect_status: 200, expect_text: "Giỏ hàng" }
  ```

  Giá trị của biến nằm ở `/etc/ao/secrets/<dự án>/<môi trường>.env` trên VPS. Biến không khai trong `env` thì không tới container.
- **Nhiều app công khai** (project-scaffold phần 2, mục 2.4): `deploy.yaml` cần ít nhất một app `public`, và có thể có nhiều hơn, như `user` và `admin` của `shop`.
  - Khi có từ hai app công khai, mỗi app khai `hosts` của ba môi trường trong `project.yaml`, và `/etc/ao/deployer.yaml` trên VPS khai đúng các host đó, theo dạng host theo app (`docs/vps-setup.md`, mục 11). `ao-kit doctor` in sẵn các dòng cần chép.
  - Deployer không deploy khi một app công khai thiếu host, và giữ bản đang chạy.
  - Deployment trên GitHub mang URL của app công khai đầu tiên trong `deploy.yaml`.
- **`AO_PUBLIC_URL`:** deployer đặt biến này cho mỗi app `public`, là URL host của chính app đó. Server phải nhận Host và Origin của URL đó, vì Caddy đứng trước app. `ao-pilot` ghi lý do ở ADR-0003.
- **`playwright.config.ts`:** có `E2E_BASE_URL` thì test chạy vào URL đó, với `httpCredentials` từ `E2E_HTTP_USER` và `E2E_HTTP_PASSWORD` khi có cả hai. Test gửi request mà trình duyệt không gửi được mang tag `@local` và chạy trên server tại chỗ. Với nhiều app công khai, `qa` còn nhận `E2E_<APP>_URL` cho từng app, như `E2E_ADMIN_URL`, lấy từ `hosts` của `project.yaml` ở commit đang chạy. `playwright.config.ts` của profile `base-pnpm` đọc sẵn các biến này. `/ao-qa` dừng khi URL của deployment không phải host của app nào trong `project.yaml`, vì như vậy là hai file đang lệch nhau.
- **`AO_ENV_AUTH`:** biến môi trường user trên máy bạn, giá trị `ao:<mật khẩu>`, là basic auth của Development và Staging. `ao-step` chỉ truyền nó cho `qa`, dưới dạng biến môi trường.

Trace của Playwright giữ `httpCredentials` ở dạng rõ. Vì vậy sau `qa` trên Development và Staging, trace nằm lại `.ai/runs/<KEY>/traces/` trên máy bạn, và chỉ ảnh, video được gắn lên Jira. Đừng đưa `test-results/` lên nơi nào khác.

## Cơ sở dữ liệu

Kit chưa chạy migration. Khi dự án có cơ sở dữ liệu, `deploy.yaml` sẽ có thêm lệnh migration, chạy trước khi bật container mới.

Đổi schema theo kiểu expand/contract, để image trước vẫn chạy được trên schema mới, nhờ đó rollback không cần đảo migration:

1. **Expand:** bản N thêm cột hay bảng mới, code ghi cả hai nơi. Không xóa gì.
2. **Migrate:** chép dữ liệu cũ sang chỗ mới.
3. **Contract:** bản sau, khi không còn rollback về trước bản N, mới xóa phần cũ.

## Hai token Jira

| Token | Đọc | Ghi | Không làm được |
|---|---|---|---|
| `ATLASSIAN_AGENT_TOKEN` | REST và Rovo MCP | Chỉ qua Rovo MCP. Ghi bằng REST trả 401 scope | Chuyển trạng thái dành cho người (`Accept`, `Cancel`) |
| `JIRA_CI_TOKEN` | REST | REST: comment, Fix Version trên item, file đính kèm, cờ | Tạo hay phát hành Fix Version, vì thiếu quyền Administer Projects |

Luật Restrict của workflow Jira quyết định ai chuyển được trạng thái nào: `Start` và `Pick up` của agent, `Submit` và `Deploy to QA` của automation, `Refine` của người và automation, `Accept` và `Cancel` của người.

## Chi phí đo được

Trên `ao-pilot`, bản `v0.2.0`:

| Việc | USD |
|---|---|
| `/ao-ship v0.2.0`, cả bốn lượt agent | 1,84 |
| `qa` của một item trên Development hay Staging | Khoảng 0,9 |
| Một Bug hotfix nhỏ, từ build tới QA (`DEMO-28`) | 3,48 |
| `/ao-release`, `/ao-rollback`, `/ao-ship` của hotfix | 0: script, không có agent |

PR chạm đường dẫn được bảo vệ, như PR chép kit, tốn hơn nhiều, vì `security` chạy ở max: 5–7 USD cho riêng lượt đó. PR chép một bản kit đã được review ở dự án khác thì 0 USD, xem [quality-gates.md](quality-gates.md#pr-chép-một-bản-kit-đã-được-review).

## Những điều đã gặp khi chạy thật

- **Thư mục build có quyền 600:** `UMask=0077` của service làm user `node` trong image không đọc được file. Deployer giờ mở quyền đọc trước khi build.
- **Status do người khác ghi:** `qa` chỉ tin status của bot `ao-deploy`, vì nó gửi basic auth tới URL trong status đó.
- **Regression chạy lại:** gate ⑤ chờ tới khi báo cáo và release note của lần regression mới nhất đã lên nhánh.
- **Commit trên nhánh release đổi head của PR release:** bạn phải approve lại trên head mới.
- **Commit chỉ sửa tài liệu:** vẫn có deployment `success`, nhưng container giữ nguyên, nên không thể gây smoke fail bằng cách deploy lại đúng tree đang chạy.
- **Máy thiếu RAM:** Claude Code có thể tắt lệnh nền. Lượt agent đã có bản ghi `unfinished`, và lệnh chạy lại đi tiếp trong session cũ.

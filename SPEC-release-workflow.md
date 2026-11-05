# SPEC: release-workflow

> **Module:** `release-workflow`, xem capability map trong [SPEC.md](SPEC.md). **Phụ thuộc:** `sdlc-contract`, `tracker-integration`, `quality-gates`, `agent-roster`, `dev-workflow`. **Được dùng bởi:** Pilot 2, `project-scaffold`, và `orchestrator-cli` ở Cấp 2.
>
> **Trạng thái:** đã duyệt ngày 2026-11-05 (Phiên 26 · Lượt 17). Plan: [tasks/plan.md](tasks/plan.md), đã duyệt ngày 2026-11-05 (Phiên 26 · Lượt 20). **Nguồn thảo luận:** [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md), Phiên 26 · Lượt 12–20.

## 1. Mục tiêu

`dev-workflow` dừng khi PR được merge vào `develop` và item sang Ready for QA. Module này làm nốt vòng ngoài, trên một VPS mới chỉ dành cho kit. Sau module này:

- Mỗi commit đã qua cổng trên `develop` tự lên Development. Commit trên `release/*` tự lên Staging. Production chỉ nhận bản đã qua Staging, sau gate ⑤.
- VPS tự kéo bản mới từ GitHub. GitHub không giữ chìa khóa nào vào VPS, và việc deploy không tốn phút Actions.
- Có bốn lệnh mới: `/ao-qa`, `/ao-release`, `/ao-ship`, `/ao-rollback`. Mỗi lệnh kiểm trạng thái bằng `ao-step.mjs` rồi mới chạy agent, như sáu lệnh của `dev-workflow`.
- `qa` kiểm từng item trên Development, đúng commit đang chạy ở đó. Ảnh và trace được gắn lên item Jira.
- Kit tính điểm cắt, cắt `release/vX.Y.0` sau gate ④, chạy full regression trên Staging, viết release note, rồi mở PR release vào `main`.
- Sau gate ⑤, `merge-gate` merge PR release, gắn tag và merge ngược về `develop`. VPS deploy Production và chạy smoke test.
- Hotfix và rollback chạy được. Smoke test fail trên Production thì VPS tự quay về bản trước, và Jira có một Bug Critical.
- Một Story của `ao-pilot` (`DEMO-21`) đi hết vòng: QA, release, Production, hotfix, rollback.

**Ngoài phạm vi:**

- Pilot 2 trên `ao-sample`: làm sau module này, có spec riêng.
- Cơ sở dữ liệu và migration. `ao-sample` chưa có cơ sở dữ liệu. Kit chỉ có chỗ cho bước migration và ghi quy tắc đổi schema an toàn khi rollback (mục 2.9). Kiểm thật phần này để tới dự án đầu tiên có cơ sở dữ liệu.
- E2E trong CI của PR: tốn phút Actions (mục 2.5).
- Bản release note gửi khách trên Google Drive.
- Profile theo stack và script cài kit: `project-scaffold`. CLI tự chạy bước kế tiếp: `orchestrator-cli` ở Cấp 2.
- Nhiều VPS, cân bằng tải, tự mở rộng, giám sát và cảnh báo liên tục.
- Xử lý VPS cũ `dtddeploy`: việc riêng của bạn, không thuộc kit.

## 2. Thiết kế

### 2.1 Vòng ngoài từ đầu tới cuối

```
merge vào develop ──► VPS deploy Development ──► jira-sync: Ready for QA
      /ao-qa <KEY> ──► qa kiểm trên Development ──► bạn Accept (Done)
       /ao-release ──► điểm cắt và danh sách item ──► gate ④: bạn chạy /ao-release <vX.Y.0> <sha>
                   ──► release/vX.Y.0 ──► VPS deploy Staging
/ao-ship <vX.Y.0>  ──► qa chạy full regression ──► devops: release note, PR release → main
                   ──► gate ⑤: bạn approve PR ──► merge-gate: merge, tag, merge ngược
                   ──► VPS deploy Production, smoke test ──► bạn bấm Release trên Jira
```

### 2.2 Bốn lệnh

Lệnh là skill của kit ở `kit/.claude/skills/ao-<lệnh>/SKILL.md`, cùng cách của `dev-workflow` (mục 2.1 của spec đó): dòng `!` chạy `ao-step.mjs` để kiểm, có `GO` thì chạy `--go` ở nền, rồi Claude đọc `.ai/runs/<KEY>/last.md` và báo bạn.

| Lệnh | Cần trước | Gọi agent | Kết thúc khi |
|---|---|---|---|
| `/ao-qa <KEY>` | Item ở Ready for QA; môi trường QA của item (mục 2.5) đang chạy bản chứa commit merge của item | `qa` | Báo cáo QA nằm trên item, bằng chứng đã gắn lên Jira. PASS: item ở In QA, chờ bạn Accept. FAIL: item về In Progress |
| `/ao-release` | Không có nhánh `release/*` nào mở; có ít nhất một item Done chưa release | Không | In điểm cắt, danh sách item và số bản; chờ gate ④ |
| `/ao-release <vX.Y.0> <sha>` | Như trên; `<sha>` đúng là điểm cắt vừa in; Fix Version `vX.Y.0` và bản kế tiếp đã có trên Jira | Không | Nhánh `release/vX.Y.0` có trên GitHub, Fix Version đã gắn cho các item |
| `/ao-ship <vX.Y.Z>` | Bản release (hoặc hotfix, mục 2.8) đang chạy trên Staging; không còn Bug Critical hay High mở cho bản này | Release: `qa` (regression), rồi `devops`. Hotfix: không | Release: PR release vào `main` mở, CI xanh, chờ gate ⑤. Hotfix: Production chạy bản vá |
| `/ao-rollback <môi trường> [<sha>]` | Không có `<sha>`: môi trường có một bản trước đã deploy thành công. Có `<sha>`: bạn đã đọc các commit chưa qua cổng tính tới `<sha>` (mục 2.9) | Không | VPS chạy bản trước, hoặc đúng `<sha>`; smoke test xanh |

- **`/ao-release` không gọi agent.** Theo hợp đồng, `devops` làm stage `release-cut`. Nhưng tính điểm cắt và tạo nhánh là việc tất định, nên script làm thay, dưới tên bot `ao-dev`.
- **Gate ④ là lúc bạn gõ `/ao-release <vX.Y.0> <sha>`.** Lệnh có đúng số bản và điểm cắt, nên bạn duyệt đúng danh sách vừa đọc. Script ghi một comment lên từng item của bản: số bản, điểm cắt, và thời điểm bạn duyệt.
- **`/ao-status`** hiện thêm: bản đang chạy ở từng môi trường, nhánh release đang mở, item Done chưa release, và Fix Version đã lên Production nhưng chưa được Release trên Jira.
- Không có lệnh `/ao-hotfix`. Hotfix đi qua các lệnh sẵn có (mục 2.8).

### 2.3 VPS và deployer

Một VPS Ubuntu 24.04 chạy cả ba môi trường của mọi dự án dùng kit. Trên VPS có một chương trình Node.js của kit, gọi là deployer.

**Deployer chạy mỗi phút** bằng systemd timer, dưới user `aodeploy`. Mỗi lượt, với từng dự án, nó:

1. Lấy token của App `ao-deploy`, rồi hỏi GitHub về commit mới trên `develop`, `release/*`, `main`, và yêu cầu deploy mới (mục 2.7, 2.9).
2. Kiểm cổng bằng chính code `audit` của kit, cho **mọi** commit mới trên lịch sử first-parent của nhánh, không chỉ commit mới nhất. Nhờ vậy một commit push thẳng, không qua PR, không lọt vào được dù sau nó có một PR hợp lệ.
3. Commit qua được thì build image, chạy container mới, chạy smoke test (mục 2.9).
4. Báo kết quả lên GitHub bằng deployment và deployment status, kèm `environment_url`. `jira-sync` và GitHub for Jira đọc từ đó, như với deploy giả hiện nay.

Deploy chậm tối đa khoảng một phút sau merge. Mỗi lúc deployer chỉ làm một việc: systemd không mở lượt mới khi lượt trước chưa xong.

**Code của deployer không lấy từ commit đang deploy.** Bản kit trên VPS nằm ở `/opt/ao/kit`, ghim theo một commit của kit. Claude chép nó lên VPS bằng `scp` từ máy bạn, khi bạn yêu cầu. Vì vậy một commit của dự án không sửa được cách kiểm cổng, kể cả khi commit đó sửa `.ai-orchestrator/`.

**App `ao-deploy`** là App thứ ba, chỉ cài trên repo dự án. Quyền: Contents đọc, Pull requests đọc, Checks đọc, Commit statuses đọc, Actions đọc, Deployments đọc và ghi. Commit statuses được thêm ở T1 của plan: `audit` đọc kết quả CI của commit qua đó. Private key chỉ nằm trên VPS. `docs/github-apps-setup.md` có từng bước tạo App.

**Image.** Mỗi app của dự án có một Dockerfile trong repo. Image được build ngay trên VPS và giữ tại chỗ, không cần registry.

- Tag của image là **mã tree** của commit (`git rev-parse <commit>^{tree}`), không phải mã commit. Merge commit trên `main` có cùng tree với head của nhánh release, nên Production chạy đúng image đã qua Staging mà không phải build lại.
- `.dockerignore` của dự án bỏ `docs/` và `*.md`. Commit chỉ sửa tài liệu thì build trúng cache, xong trong vài giây.
- Deployer giữ ba image gần nhất của mỗi môi trường để rollback, và xóa image cũ hơn.
- Sau mỗi lần deploy, deployer dọn cache build của Docker, chỉ giữ phần dùng gần nhất, tối đa 4 GB. Nhờ vậy bước `npm ci` vẫn trúng cache mà đĩa không đầy: ở T2 của plan, 6 lần build để lại 7,25 GB cache.

**Container.** Cấu hình chạy container do deployer dựng, theo file `.ai-orchestrator/deploy.yaml` của dự án ở đúng commit đã qua cổng. File này chỉ khai: các app, Dockerfile, cổng trong container, đường dẫn health, và **tên** các biến môi trường. Schema của kit không cho khai volume, `privileged`, mạng của host hay cổng ra ngoài. `.ai-orchestrator/**` là đường dẫn được bảo vệ, nên mọi thay đổi file này do bạn merge. Deployer tự đặt thêm biến `AO_PUBLIC_URL` cho app `public`: địa chỉ HTTPS của môi trường, ví dụ `https://pilot-dev.ao.t2g.io.vn`. Sau Caddy, request mang tên miền công khai đó, nên app nào kiểm Host hay Origin của request thì nhận địa chỉ này (T2 của plan).

```yaml
# .ai-orchestrator/deploy.yaml của ao-pilot
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

- Container của mỗi dự án và môi trường nằm trong một mạng Docker riêng, không publish cổng nào ra host. Docker publish cổng thì đi vòng qua `ufw`; không publish thì không có lỗ đó.
- Chỉ Caddy giữ cổng 80 và 443. Caddy chạy trong container, tự lấy chứng chỉ HTTPS của Let's Encrypt, và chuyển từng subdomain tới app `public` của đúng môi trường.
- **Basic auth cho Development và Staging** (mục 10, câu 6). Caddy hỏi một tài khoản chung trên mọi subdomain của hai môi trường này; Production để mở. Bạn đặt mật khẩu lúc cài VPS. Trên VPS chỉ có bản băm bcrypt, trong Caddyfile. Trên máy bạn, script của `/ao-qa` và `/ao-ship` đọc tài khoản từ biến môi trường `AO_ENV_AUTH` (dạng `user:mật khẩu`), không nằm trong repo hay log. Smoke test đi qua mạng nội bộ, nên không cần tài khoản này.
- Giá trị của biến môi trường (bí mật của app) nằm ở `/etc/ao/secrets/<dự án>/<môi trường>.env` trên VPS, không nằm trên GitHub. Nhờ vậy không cần environment secret, thứ mà repo private gói Free không có.

**Thư mục trên VPS:**

```
/opt/ao/kit/                      # bản kit ghim theo commit, root sở hữu, aodeploy chỉ đọc
/etc/ao/deployer.yaml             # dự án, repo, subdomain, AO_APPROVERS
/etc/ao/ao-deploy.pem             # private key của App, root:aodeploy 0640
/etc/ao/jira-read.token           # token Jira chỉ đọc của tài khoản CI, root:aodeploy 0640
/etc/ao/secrets/<dự án>/<env>.env # bí mật của app
/var/lib/ao/                      # bản mirror của repo, trạng thái, log
/etc/systemd/system/ao-deploy.service, ao-deploy.timer
```

Token Jira chỉ đọc cần cho một quy tắc của `audit`: commit merge của PR tài liệu được tính theo trạng thái Epic trên Jira (`dev-workflow`, mục 2.4). Deployer không ghi gì lên Jira.

### 2.4 Bản nào lên môi trường nào

| Môi trường | Deployer chạy bản nào | Khi nào |
|---|---|---|
| Development | Head của `develop` | Mọi commit mới qua `audit` |
| Staging | Head của nhánh `release/*` đang mở; hoặc commit hotfix trên `main` chưa lên Production (mục 2.8) | Mọi commit mới qua `audit` |
| Production | Merge commit của PR release đã được bạn approve; hoặc một yêu cầu deploy do bạn tạo (hotfix, rollback) | Mục 2.7, 2.8, 2.9 |

**Production có hai điều kiện cứng, deployer tự kiểm:**

1. **Có gate ⑤, theo một trong hai cách.** Cách một: commit là merge của PR release mà một login trong `AO_APPROVERS` đã approve trên head; `audit` đã kiểm điều này. Cách hai: GitHub ghi người tạo yêu cầu deploy là một login trong `AO_APPROVERS`. GitHub ghi người tạo theo token đã gọi API, nên agent không giả được. Tag không được tính là gate ⑤, vì token `ao-dev` của agent cũng tạo được tag.
2. **Tree của commit đã chạy thành công trên Staging, và qua smoke test ở đó.** Thiếu một trong hai thì deployer báo deployment `failure` kèm lý do, và không đụng tới Production.

GitHub Free không chặn được gate ⑤ cho repo private. Hai điều kiện này thay cho người duyệt bắt buộc của environment `production`.

### 2.5 QA trên môi trường

- **Môi trường QA của item** lấy theo bảng định tuyến của hợp đồng: item vào `develop` thì QA trên Development; bản vá Production và Bug của bản đang ở Staging thì QA trên Staging.
- **`qa` chạy trên máy bạn** và kiểm qua URL của môi trường. Script tìm bản đang chạy ở đó qua deployment mới nhất có status `success`, rồi kiểm bản đó chứa commit merge của item.
- **Code `qa` đọc** nằm trong một worktree ở đúng commit đang chạy, trong thư mục temp, như worktree của lượt review. Script chạy `npm ci` trong worktree trước, để `qa` chạy được E2E.
- **E2E chạy vào môi trường thật:** script truyền `E2E_BASE_URL`; với Development và Staging, script truyền thêm `E2E_HTTP_USER` và `E2E_HTTP_PASSWORD` (mục 2.3). `playwright.config.ts` của dự án phải dùng các biến này cho `baseURL` và `httpCredentials`. Test gửi request mà trình duyệt không gửi được (Host lạ, Origin lạ, body quá lớn) mang tag `@local`, vì qua Caddy các request đó không tới được app. Khi có `E2E_BASE_URL`, test `@local` chạy vào server do `webServer` tự bật từ worktree, ở cùng commit; các test khác chạy vào `E2E_BASE_URL`. Một lệnh `playwright test` chạy đủ cả hai phần (T2 của plan). Đây là yêu cầu với dự án, ghi trong `docs/release-workflow.md`.
- **Bằng chứng:** `qa` lưu ảnh vào `.ai/qa/<KEY>/` như hiện nay, và trace của Playwright nằm trong `test-results/` của worktree. Sau lượt của `qa`, script gắn các file đó lên item Jira bằng token CI (`JIRA_CI_TOKEN`), rồi comment danh sách file. Script chạy trong phiên của bạn, sau khi lượt của `qa` đã xong, và token CI không có trong môi trường của phiên agent. Token của agent chỉ có scope đọc với REST API, nên không gắn file được (T1 của plan). File quá giới hạn của Jira thì bỏ qua và ghi tên. `qa` không tự tải file lên, vì tool Jira của agent không làm được việc đó.
- **Deploy mới giữa lúc `qa` đang kiểm:** script ghi mã commit đang chạy lúc đầu và lúc cuối lượt. Hai mã khác nhau thì báo cáo ghi rõ, và Claude đề nghị bạn chạy lại `/ao-qa`.
- **Không đưa E2E vào CI của PR** ở module này. Mỗi lần chạy E2E trong Actions tốn thêm vài phút, mà bạn đã dùng khoảng 36% phần miễn phí trong 4 ngày đầu tháng 11. QA trên Development và regression trên Staging thay cho việc đó.

### 2.6 Cắt release (gate ④) và Fix Version

**Điểm cắt** theo đúng định nghĩa của hợp đồng: commit mới nhất trên lịch sử first-parent của `develop` sao cho mọi item có commit tính tới đó đều Done, và không item nào trong số đó còn commit sau điểm cắt. `lib/release/cut.mjs` tính điểm cắt bằng hàm thuần, từ danh sách commit và trạng thái item.

**Số bản:** bản đầu tiên là `v0.1.0`. Mỗi bản sau tăng `minor` từ tag mới nhất; hotfix tăng `patch`. Bạn quyết khi nào tăng `major`.

**Fix Version.** Tài khoản agent không có quyền Administer Projects, mà tạo hay phát hành Fix Version cần quyền đó. Vì vậy:

- **Bạn** tạo Fix Version và bấm Release trên giao diện Jira. `docs/release-workflow.md` ghi từng bước bấm. Lúc đầu, bạn tạo `v0.1.0` làm "bản kế tiếp".
- Lúc cắt `v0.1.0`, hợp đồng cần sẵn một bản kế tiếp mới. Nếu chưa có `v0.2.0` trên Jira, `/ao-release` dừng và nhắc bạn tạo.
- **Script** gắn Fix Version cho item bằng token CI, như mục 2.5: các item trong điểm cắt nhận `vX.Y.0`. Item nằm sau điểm cắt mà đang mang `vX.Y.0`, ví dụ Bug Medium đã gắn lúc triage, được chuyển sang bản kế tiếp.

**`/ao-release <vX.Y.0> <sha>`** tạo nhánh `release/vX.Y.0` tại `<sha>` dưới tên bot `ao-dev`. `audit` đã chấp nhận commit đầu của nhánh release là một commit của `develop`. Deployer thấy nhánh mới và deploy Staging.

### 2.7 Ship (gate ⑤), tag và merge ngược

`/ao-ship <vX.Y.0>`:

1. **Kiểm:** Staging đang chạy head của `release/vX.Y.0`, smoke xanh. Không còn Bug Critical hay High mở mang Fix Version này.
2. **`qa` chạy full regression** trên Staging: toàn bộ E2E của repo, trong worktree ở đúng commit đang chạy. Báo cáo theo `templates/regression-report.md`, `qa` ghi vào `.ai/runs/vX.Y.0/regression-report.md`.
   - FAIL: lệnh dừng. Báo cáo có bản nháp Bug cho từng lỗi. Bạn triage và tạo Bug, như mọi Bug khác. Bug Critical hay High được sửa trên nhánh `bugfix/<BUG>-…` vào `release/vX.Y.0`, qua đủ review và gate ③.
3. **`devops`** viết ba đoạn vào `.ai/runs/vX.Y.0/`: mục `vX.Y.0` của `CHANGELOG.md` theo `templates/release-notes.md`, mô tả PR release, và đoạn mô tả cho Fix Version để bạn dán lên Jira.
4. **Script**, dưới tên bot `ao-dev`, chép nguyên báo cáo vào `docs/releases/vX.Y.0.md`, thêm mục vào `CHANGELOG.md`, commit lên nhánh release, rồi mở PR `release/vX.Y.0` → `main` bằng `ao-pr.mjs`. Agent vẫn không push lên `release/*`: hook chặn như cũ.
5. **Script kiểm** rằng từ commit đã chạy regression tới head mới, diff chỉ sửa `docs/releases/vX.Y.0.md` và `CHANGELOG.md`. Như vậy kết quả regression vẫn đúng cho head mới. Hai file đó nằm ngoài image, nên Staging deploy lại trúng cache.
6. **Gate ⑤:** bạn đọc PR, rồi approve trên GitHub. Bạn không bấm merge.

**`merge-gate` với PR release** (trước đây bạn tự merge, `docs/quality-gates.md` trường hợp 3):

- merge bằng **merge commit**, không squash, khi CI xanh trên head và bạn đã approve head;
- gắn tag `vX.Y.0` vào merge commit;
- mở PR merge ngược `main` → `develop`.

**PR merge ngược** (head là `main`, vào `develop` hoặc vào nhánh `release/*` đang mở): `merge-gate` merge bằng merge commit khi CI xanh và PR không có xung đột. PR này không cần approve: mọi commit trong đó đã qua gate ③ hoặc gate ⑤ trên `main`. Có xung đột thì `merge-gate` gắn cờ "Needs you" và không merge.

**Sau khi merge,** deployer thấy merge commit trên `main` và deploy Production (mục 2.4). Smoke xanh thì deployment có status `success`. `/ao-status` và bản tổng hợp sáng của `pm` nhắc bạn bấm Release cho `vX.Y.0` trên Jira. Từ đó, Epic có mọi item con đã lên Production mới `complete` được.

### 2.8 Hotfix

Hotfix dùng đúng quy ước đã có: Bug Critical hay High tìm thấy trên Production có nhánh `hotfix/<BUG>-<slug>` tách từ `main`, và Fix Version là bản vá của bản đang chạy (`patch-of-production`).

1. Bạn triage Bug, tạo Fix Version `vX.Y.(Z+1)` trên Jira, và refine Bug sang Ready.
2. `/ao-build <BUG>`: dev agent tách nhánh từ `main`, sửa, thêm test tái hiện lỗi, và thêm một dòng vào `CHANGELOG.md`. PR vào `main`.
3. `/ao-review`, `/ao-fix` nếu cần, rồi gate ③. `merge-gate` squash merge vào `main` như PR thường.
4. Deployer thấy commit hotfix trên `main`, nhưng không đưa lên Production. Nó deploy commit đó lên **Staging**, môi trường QA của bản vá. `jira-sync` chuyển Bug sang Ready for QA.
5. `/ao-qa <BUG>` trên Staging, rồi bạn Accept.
6. **Gate ⑤:** `/ao-ship vX.Y.(Z+1)`. Lệnh kiểm Bug đã Done và Staging đang chạy commit đó. Rồi script, chạy bằng login `gh` của bạn trong phiên của bạn, gắn tag `vX.Y.(Z+1)` và tạo yêu cầu deploy Production cho commit đó. Deployer kiểm hai điều kiện ở mục 2.4 rồi deploy. Hotfix không chạy full regression: đó là phần "rút gọn" của stage `hotfix` trong hợp đồng.
7. Script mở PR merge ngược `main` → `develop`, và `main` → nhánh `release/*` nếu đang mở. `merge-gate` merge các PR đó như mục 2.7.

**Staging dùng chung.** Khi đang có bản release trên Staging mà có hotfix, commit hotfix chiếm Staging cho tới khi lên Production. Sau đó PR merge ngược vào nhánh release làm Staging deploy lại bản release, và `/ao-ship` của bản release phải chạy lại regression.

### 2.9 Smoke test và rollback

**Smoke test** chạy trên VPS sau mỗi lần deploy, theo mục `smoke` của `deploy.yaml`: gọi từng đường dẫn qua mạng nội bộ, kiểm mã trạng thái và một đoạn chữ. Hết 60 giây mà chưa xanh thì coi là fail.

- **Development, Staging:** smoke fail thì deployment có status `failure`, container cũ vẫn phục vụ, và item không sang Ready for QA. `jira-sync` gắn cờ "Needs you", đúng quy tắc "Deploy lên môi trường QA thất bại" của hợp đồng.
- **Production:** smoke fail thì container của bản trước vẫn phục vụ, và deployer báo deployment `failure`. `jira-sync` thấy status đó và tạo Bug Critical, Found in Production, Affects Version là bản vừa lên, như quy tắc "Smoke test sau khi lên Production fail" của hợp đồng.

**Đổi bản không gián đoạn** (plan, quyết định 4). Container mới chạy cạnh container cũ, và smoke test gọi container mới qua mạng nội bộ. Đạt thì Caddy chuyển sang container mới, và container cũ dừng. Không đạt thì container mới bị xóa. Vì vậy "quay về bản trước" là giữ nguyên container cũ.

**`/ao-rollback <môi trường>`** tìm bản trước đã deploy thành công ở môi trường đó, rồi tạo yêu cầu deploy cho bản đó bằng login `gh` của bạn, đánh dấu là rollback. Deployer chỉ nhận yêu cầu rollback khi người tạo nằm trong `AO_APPROVERS` và bản đó đã từng chạy thành công ở chính môi trường đó. Image vẫn còn trên VPS, nên rollback không build lại.

- Sau rollback Production, deployer không tự đưa `main` lên lại. Production chỉ đổi khi có bản release mới, hotfix mới, hay một yêu cầu deploy khác của bạn.
- Sau rollback Development, commit mới kế tiếp trên `develop` lại được deploy như thường.

**`/ao-rollback <môi trường> <sha>`** tạo yêu cầu deploy cho đúng `<sha>`, cũng bằng login `gh` của bạn (plan, quyết định 5). Lệnh có hai việc:

- **Gỡ chặn.** Deployer kiểm mọi commit mới, nên một commit không qua `audit` nằm lại trong lịch sử và chặn mọi head sau nó, kể cả sau khi revert. Bạn đọc commit đó, rồi chạy lệnh cho một head sau nó. Deployer ghi rằng bạn đã duyệt đoạn lịch sử tới head đó, deploy head đó, rồi kiểm các commit mới sau nó như thường.
- **Đưa một bản lên lại sau rollback**, ví dụ `v0.1.1` sau khi Production quay về `v0.1.0`.

Với Production, `<sha>` vẫn phải thỏa hai điều kiện của mục 2.4.

**Cơ sở dữ liệu (để sau).** Khi dự án có cơ sở dữ liệu, `deploy.yaml` có thêm lệnh migration, chạy trước khi bật container mới. Quy tắc ghi trong `docs/release-workflow.md`: đổi schema theo kiểu expand/contract, để image trước vẫn chạy được trên schema mới, và rollback không phải chạy migration ngược.

### 2.10 Thay đổi ở các module trước

- **`audit`** (`lib/quality/audit.mjs`) chấp nhận thêm:
  - commit của bot `ao-dev` trên `release/*` chỉ sửa `docs/releases/**` và `CHANGELOG.md`;
  - merge commit của PR merge ngược, khi head là `main` và người merge là `merge-gate`.
- **`merge-gate`** (`lib/quality/merge-gate.mjs`): PR release, tag, PR merge ngược (mục 2.7). Quy tắc mới có mục riêng trong `quality/gates.yaml`, kèm schema và quy tắc kiểm của `npm run validate`.
- **`jira-sync`** (`lib/tracker/sync.mjs`):
  - deployment `success` lên Staging của commit hotfix chuyển Bug sang Ready for QA;
  - deployment `failure` lên Production tạo Bug Critical;
  - deployment `failure` lên Development hay Staging gắn cờ "Needs you".
- **Prompt:** `qa.md` thêm QA trên môi trường và full regression; `devops.md` thêm release note và mô tả PR release, và bỏ câu "chờ `release-workflow`".
- **Hợp đồng:** stage `release-cut` ghi rằng script làm thay `devops`; stage `hotfix` ghi gate ⑤ là yêu cầu deploy của bạn. `docs/sdlc.md` được sinh lại.
- **Dự án** bỏ `deploy.yml` (deploy giả). Workflow này gọi `audit` mỗi lần push, nên bỏ nó cũng bớt được phút Actions.

### 2.11 VPS mới và tên miền

**VPS** do bạn thuê: Ubuntu 24.04, 2 vCPU, 4 GB RAM, ít nhất 40 GB SSD, một IPv4. Nên chọn nhà cung cấp có console web và snapshot. [Ước tính] khoảng 5–10 USD mỗi tháng.

**Cài đặt.** Claude cài VPS trong phiên chính, qua SSH, theo `docs/vps-setup.md`. Cài theo các bài học từ VPS cũ:

- đăng nhập chỉ bằng key: `PermitRootLogin no`, `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, sửa cả các file trong `/etc/ssh/sshd_config.d/`;
- user thường có `sudo` với mật khẩu mạnh do bạn đặt; key mới cho VPS này, passphrase mạnh;
- `ufw` chỉ mở SSH, 80 và 443;
- `unattended-upgrades` bật; swap 4 GB;
- Docker Engine và Compose plugin từ kho chính thức của Docker; Node.js 24 cho deployer.

Chỉ phiên chính dùng SSH. Agent của kit không bao giờ SSH vào VPS. Cài xong, bạn gỡ key khỏi ssh-agent; lần sau cần sửa VPS thì thêm lại.

**Tên miền.** Bạn tạo một bản ghi A wildcard `*.ao.t2g.io.vn` trỏ về IP của VPS, trong trang DNS của BKNS. Mỗi môi trường có một subdomain dưới đó (mục 10, câu 5):

| Dự án | Development | Staging | Production |
|---|---|---|---|
| `ao-pilot` | `pilot-dev.ao.t2g.io.vn` | `pilot-staging.ao.t2g.io.vn` | `pilot.ao.t2g.io.vn` |
| `ao-sample` | `sample-dev.ao.t2g.io.vn` | `sample-staging.ao.t2g.io.vn` | `sample.ao.t2g.io.vn` |

### 2.12 Tiền đề kiểm ở task đầu

Spec dựa vào mười điều chưa ai thử. Task đầu kiểm cả mười, phần lớn trên `ao-pilot` bằng nhánh tạm, trước khi viết code:

1. Deployment và status do token của App tạo ra vẫn kích hoạt workflow theo sự kiện `deployment_status`, tức `jira-sync` chạy.
2. GitHub for Jira hiện các deployment đó trên item, đúng môi trường.
3. Quyền của App `ao-deploy` ở mục 2.3 đủ cho `git fetch` qua HTTPS và mọi lệnh đọc của `audit`.
4. Token Jira chỉ đọc của tài khoản CI đọc được những gì `audit` cần cho PR tài liệu.
5. Trên VPS 2 vCPU, 4 GB: build Next.js và NestJS xong trong khi ba môi trường đang chạy, và đo thời gian build. Kết quả T2: đúng; build lại API mất 5,2 phút, web 5,8 phút, RAM lúc cao nhất 1,77 GB trên 3,9 GB.
6. Caddy lấy được chứng chỉ HTTPS cho subdomain dưới bản ghi wildcard ở BKNS. Kết quả T2: đúng.
7. E2E của `ao-pilot` chạy từ máy bạn vào URL thật, với Chrome của máy và basic auth. Kết quả T2: đúng một phần, 19/24 test xanh; app đọc `AO_PUBLIC_URL` (mục 2.3), và test gửi request thô mang tag `@local` (mục 2.5).
8. Script gắn được file lên item Jira bằng token của agent. Kết quả T1: sai; script dùng token CI (mục 2.5).
9. `jira-sync` tạo được Bug với Found in, Severity và Affects Version bằng token CI.
10. Một yêu cầu deploy tạo bằng login `gh` của bạn ghi `creator` là login của bạn, và token `ao-dev` không tạo được yêu cầu nào mang login đó.

Điều nào sai thì mình dừng và đề xuất sửa spec, như T1 của `dev-workflow`.

## 3. Tech stack

- Node.js 24, ES module, `yaml` và `ajv`; không thêm dependency. Deployer dùng `github-client.mjs`, `github-app.mjs`, `audit.mjs` sẵn có, và gọi `git`, `docker` bằng `execFile` với đối số dạng mảng, không qua shell.
- Docker Engine và Compose plugin trên VPS; Caddy 2 trong container, ghim phiên bản.
- systemd timer cho deployer.
- Test dùng `node:test` với dữ liệu ghi sẵn; test không gọi mạng, không gọi Docker.

## 4. Lệnh

Trong phiên Claude Code ở repo dự án:

```
/ao-qa DEMO-21               # qa kiểm DEMO-21 trên Development; gắn bằng chứng lên Jira
/ao-release                  # in điểm cắt, danh sách item, số bản; dừng ở gate ④
/ao-release v0.1.0 22327a5   # gate ④: tạo release/v0.1.0 tại điểm cắt, gắn Fix Version
/ao-ship v0.1.0              # regression trên Staging, release note, PR release → main; dừng ở gate ⑤
/ao-ship v0.1.1              # hotfix: tag và yêu cầu deploy Production (gate ⑤)
/ao-rollback production      # chạy lại bản trước trên Production
```

Trong terminal ở repo dự án, cùng code mà các lệnh gọi:

```
node .ai-orchestrator/scripts/ao-step.mjs release              # chỉ kiểm, in GO hoặc STOP
node .ai-orchestrator/scripts/ao-step.mjs qa DEMO-21 --go      # kiểm rồi chạy qa
```

Trên VPS (Claude chạy qua SSH khi cài hay sửa lỗi):

```
sudo -u aodeploy node /opt/ao/kit/scripts/ao-deploy.mjs tick --dry-run   # in việc sẽ làm, không deploy
systemctl status ao-deploy.timer
journalctl -u ao-deploy --since "1 hour ago"
```

Trong repo kit: `npm run validate`, `npm test`, `npm run render:check`, `npm run agents:check`, như trước.

## 5. Cấu trúc thư mục

```
ai-orchestrator-v1/
├── lib/release/
│   ├── cut.mjs                      # điểm cắt (hàm thuần)
│   ├── versions.mjs                 # số bản kế tiếp, bản vá (hàm thuần)
│   ├── targets.mjs                  # bản nào lên môi trường nào, hai điều kiện của Production (hàm thuần)
│   ├── deploy-config.mjs            # đọc và kiểm deploy.yaml theo schema
│   ├── smoke.mjs                    # smoke test
│   └── deployer.mjs                 # một lượt của deployer: hỏi GitHub, audit, build, chạy, báo
├── lib/tracker/attachments.mjs      # gắn bằng chứng của qa lên item
├── lib/workflow/steps.mjs, facts.mjs, prompts.mjs   # thêm qa, release, ship, rollback
├── lib/quality/merge-gate.mjs, audit.mjs            # mục 2.10
├── lib/tracker/sync.mjs                             # mục 2.10
├── scripts/ao-deploy.mjs            # deployer trên VPS: tick, --dry-run
├── contract/schema/deploy.schema.json
├── kit/.claude/skills/ao-qa/, ao-release/, ao-ship/, ao-rollback/
├── vps/
│   ├── Caddyfile.template
│   ├── ao-deploy.service, ao-deploy.timer
│   └── deployer.example.yaml
├── agents/prompts/qa.md, devops.md
├── quality/gates.yaml               # PR release, PR merge ngược
├── docs/release-workflow.md         # bốn lệnh, một vòng release, Fix Version trên Jira, yêu cầu với dự án
├── docs/vps-setup.md                # thuê VPS, DNS ở BKNS, SSH an toàn, cài deployer
├── docs/github-apps-setup.md        # thêm App ao-deploy
└── tests/release/                   # dữ liệu mẫu ở tests/fixtures/release/
```

Dự án có thêm: Dockerfile của từng app, `.dockerignore`, `.ai-orchestrator/deploy.yaml`, và `playwright.config.ts` đọc `E2E_BASE_URL` và tách test `@local` (mục 2.5). App `public` kiểm Host hay Origin thì đọc `AO_PUBLIC_URL` (mục 2.3).

## 6. Code style

Giữ quy ước của các module trước: hàm quyết định thuần, script mỏng. Deployer không bao giờ đưa dữ liệu từ GitHub vào dòng lệnh shell:

```js
// lib/release/deployer.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

// Builds the image of one app at the tree of an audited commit. Every argument is its own array item, so a branch or
// tag name never reaches a shell.
export async function buildImage({ project, app, tree, context, dockerfile }) {
  const tag = `ao-${project}-${app}:${tree}`;
  await run('docker', ['build', '--file', dockerfile, '--tag', tag, '--label', `ao.tree=${tree}`, context]);
  return tag;
}
```

Kết luận của `ao-step.mjs release`:

```
develop: 14 commits since the last release; cut point 22327a5 "feat(cart): remove a line from the cart (DEMO-21)"
In v0.1.0: DEMO-12, DEMO-16, DEMO-21 (Done)
After the cut point: DEMO-24 (In Review), moves to v0.2.0
Fix Versions on Jira: v0.1.0 (unreleased), v0.2.0 (unreleased)
STOP: gate ④. Read the list, then run /ao-release v0.1.0 22327a5
```

## 7. Chiến lược test

**Quy tắc mới của `npm run validate`:** schema của `deploy.yaml`, và mục PR release, PR merge ngược của `quality/gates.yaml`. Mỗi quy tắc có test dương và fixture âm.

**Test đơn vị**, dùng dữ liệu ghi sẵn:

- `cut`: điểm cắt khi mọi item Done; khi item giữa lịch sử chưa Done; khi item có commit trước và sau điểm cắt; khi không có item Done nào.
- `versions`: bản đầu `v0.1.0`; tăng `minor`; bản vá tăng `patch`; tag sai dạng bị bỏ qua.
- `targets`: mỗi dòng của bảng mục 2.4. Production bị từ chối khi thiếu gate ⑤, khi tree chưa qua Staging, khi người tạo yêu cầu không nằm trong `AO_APPROVERS`, khi rollback về bản chưa từng chạy ở môi trường đó.
- `deployer` với client giả: kiểm mọi commit first-parent mới, không chỉ head; dừng ở commit đầu tiên không qua `audit`; báo đúng deployment status.
- `deploy-config`: từ chối volume, `privileged`, cổng ra host.
- `docker`: app `public` nhận `AO_PUBLIC_URL` của môi trường, app khác không nhận; sau deploy, cache build được dọn còn tối đa 4 GB.
- `audit`: hai quy tắc mới, và commit của bot sửa file khác ngoài hai đường dẫn đó thì fail.
- `merge-gate`: PR release merge bằng merge commit và gắn tag; PR merge ngược merge khi không xung đột, gắn cờ khi có.
- `jira-sync`: ba sự kiện deployment của mục 2.10.
- `steps`: mỗi lệnh có một trường hợp `GO` và các trường hợp `STOP` (sai trạng thái, môi trường QA chưa có commit của item, có nhánh release đang mở, thiếu Fix Version trên Jira, regression trên commit cũ, diff sau regression sửa file khác).
- Skill: frontmatter của bốn lệnh có `disable-model-invocation: true` và gọi đúng `ao-step.mjs`.

**Kiểm thật** trên `ao-pilot` và space `DEMO`, lệnh ở máy chạy bằng repo kit qua `AO_KIT_DIR`, kết quả ghi vào `tasks/verification.md`:

1. Mười tiền đề ở mục 2.12.
2. Bạn thuê VPS, tạo bản ghi DNS, tạo App `ao-deploy`; Claude cài VPS và deployer.
3. Một Task của `ao-pilot` đưa Dockerfile, `.dockerignore`, `deploy.yaml`, biến `HOST` và `AO_PUBLIC_URL`, `E2E_BASE_URL` và tag `@local` vào dự án, và bỏ `deploy.yml`. PR của Task mang thêm bản chép kit mới vào `.ai-orchestrator/`, vì `merge-gate` và `jira-sync` chạy trong Actions bằng bản chép đó (plan, quyết định 6). Task đi qua `/ao-build`, `/ao-review` và gate ③. Bạn tự merge, vì PR sửa đường dẫn được bảo vệ. Deployer deploy Development.
4. `/ao-qa DEMO-21` trên Development: bằng chứng nằm trên Jira; bạn Accept.
5. `/ao-release`, rồi gate ④: `release/v0.1.0`, Staging.
6. `/ao-ship v0.1.0`, rồi gate ⑤: merge commit, tag, merge ngược, Production, smoke xanh. Bạn bấm Release trên Jira.
7. Một Bug thử trên Production đi theo mục 2.8, tới `v0.1.1` trên Production.
8. `/ao-rollback production` về `v0.1.0`, rồi `/ao-rollback production <sha của v0.1.1>` đưa `v0.1.1` lên lại.
9. Một lần smoke fail có chủ đích trên Production của `ao-pilot` (đây là sandbox): deployer tự quay về bản trước, và Jira có Bug Critical.
10. Hai lần thử đi vòng: một commit push thẳng lên `develop` không được deploy, rồi bạn gỡ chặn bằng `/ao-rollback development <sha>`; một yêu cầu deploy Production tạo bằng token `ao-dev` bị từ chối.

[Ước tính] Khoảng 25–40 USD quy đổi cho các lượt agent, cộng tiền VPS. Lượt đắt nhất là `security` trên PR ở bước 3 và trên PR hotfix ở bước 7.

## 8. Ranh giới

- **Luôn làm:**
  - deployer kiểm mọi commit mới bằng `audit` trước khi build;
  - smoke test sau mỗi lần deploy, và báo deployment status lên GitHub;
  - Production chỉ nhận bản thỏa hai điều kiện của mục 2.4;
  - bí mật của app chỉ nằm trên VPS.
- **Hỏi bạn trước:**
  - đổi các quy tắc của mục 2.4 hay 2.9;
  - mở thêm cổng trên VPS, hay cài thêm dịch vụ;
  - xin thêm quyền cho App, hay thêm quyền Jira cho tài khoản agent;
  - cập nhật bản kit trên VPS;
  - mọi việc trên VPS ngoài `docs/vps-setup.md`.
- **Không bao giờ:**
  - agent SSH vào VPS;
  - GitHub giữ key hay mật khẩu vào VPS;
  - deploy commit không qua `audit`, hay lên Production khi thiếu gate ⑤;
  - deployer chạy code của commit đang deploy để kiểm cổng;
  - token, key hay mật khẩu nằm trong repo, log, chat, hay tham số dòng lệnh;
  - push thẳng lên `main` hay `develop` của `ao-sample`.

## 9. Tiêu chí hoàn thành

1. Bốn lệnh có trong `kit/.claude/skills/`. `lib/release/` và các phần sửa có test. `npm run validate`, `npm test`, `npm run agents:check` và CI của kit đều xanh.
2. Mười tiền đề ở mục 2.12 được kiểm và ghi kết quả. Tiền đề nào sai thì spec đã được sửa, và bạn đã duyệt bản sửa.
3. VPS mới chạy deployer theo `docs/vps-setup.md`: SSH chỉ dùng key, không đăng nhập root, `ufw` chỉ mở SSH, 80, 443; không container nào publish cổng ra host.
4. Ba môi trường của `ao-pilot` chạy trên ba subdomain, có HTTPS. Mỗi lần deploy có deployment trên GitHub, và hiện trên item Jira.
5. `DEMO-21` đi từ Ready for QA tới Production chỉ bằng các lệnh và cổng của bạn. Báo cáo QA và bằng chứng nằm trên Jira; `docs/releases/v0.1.0.md` và `CHANGELOG.md` nằm trên `main`; tag `v0.1.0` có trên GitHub.
6. Production chạy đúng image đã qua Staging: cùng mã tree.
7. Hotfix `v0.1.1` lên Production theo mục 2.8, và được merge ngược về `develop`.
8. Rollback Production chạy được, và smoke fail trên Production tự quay về bản trước kèm Bug Critical.
9. Hai lần thử đi vòng ở bước 10 của kiểm thật đều bị chặn.
10. README có mục về bốn lệnh; có `docs/release-workflow.md` và `docs/vps-setup.md`; `docs/github-apps-setup.md` có App `ao-deploy`; `SPEC.md` ghi module hoàn thành.

## 10. Câu hỏi đã trả lời

Phiên 26 · Lượt 13–17 (2026-11-05):

1. **VPS:** một VPS mới, chỉ dành cho kit (Lượt 16). Lựa chọn đầu là VPS `dtddeploy` của bạn. Lúc kiểm (chỉ đọc), Claude thấy rất có thể người lạ đã chiếm quyền root của VPS đó từ khoảng 2026-07-07. VPS đó cũng quá nhỏ: 1 vCPU, 961 MB RAM.
2. **Cách đưa bản mới vào VPS:** VPS tự kéo bản đã qua cổng, dùng App `ao-deploy` (mục 2.3).
3. **Kiểm thật:** trên `ao-pilot` (`DEMO-21`) qua `AO_KIT_DIR`, rồi Pilot 2 trên `ao-sample`.
4. **Tên miền:** subdomain của `t2g.io.vn`. DNS do BKNS quản; tên miền chưa có bản ghi wildcard.
5. **Cách đặt subdomain:** một bản ghi A wildcard `*.ao.t2g.io.vn`, tên như bảng ở mục 2.11 (Lượt 17). Một bản ghi dùng được cho mọi dự án sau này, và không đụng tới `t2g.io.vn` hay `www` đang trỏ tới Vercel. Nếu trang DNS của BKNS không cho tạo wildcard, mỗi subdomain một bản ghi A, ví dụ `pilot-dev.t2g.io.vn`.
6. **Basic auth:** bật cho Development và Staging, vì hai môi trường này mở ra internet, chạy bản chưa phát hành, mà app mẫu không có đăng nhập (Lượt 17, mục 2.3). Bạn đưa tài khoản chung cho tester. Production của `ao-pilot` để mở.
7. **Ba quyết định của plan** (Lượt 20): đổi bản không gián đoạn, gỡ chặn bằng `/ao-rollback <môi trường> <sha>`, và bản chép kit đi cùng PR của Task trên `ao-pilot`. Mục 2.2, 2.9 và 7 ghi theo. Lệnh vẫn tên `/ao-rollback`, nên vẫn có bốn lệnh.

Khi viết spec, Claude đổi năm chỗ so với giả định ở Lượt 12, và nêu lý do. Bạn duyệt cả năm chỗ cùng spec ngày 2026-11-05 (Lượt 17):

- **Bốn lệnh thay vì năm: bỏ `/ao-hotfix`.** Hợp đồng đã có nhánh `hotfix/<BUG>-…` tách từ `main`, và `/ao-build`, `/ao-review`, `/ao-fix`, `/ao-qa` làm được mọi bước. Gate ⑤ của hotfix là `/ao-ship vX.Y.(Z+1)` (mục 2.8).
- **Tag của image là mã tree, không phải mã commit.** Merge commit trên `main` khác mã với head của nhánh release, nhưng cùng tree. Nhờ vậy Production chạy đúng image đã qua Staging (mục 2.3).
- **Deployer kiểm mọi commit mới, không chỉ head.** `audit` hiện chỉ kiểm commit được deploy. Một commit push thẳng, nằm dưới một PR hợp lệ, sẽ lọt vào bản deploy (mục 2.3).
- **`merge-gate` tự merge PR merge ngược, không cần bạn approve.** Mọi commit trong đó đã qua gate ③ hoặc ⑤. Bạn chỉ phải làm khi có xung đột (mục 2.7).
- **Gate ⑤ không dựa vào tag.** Token `ao-dev` của agent cũng tạo được tag. Gate ⑤ là approve của bạn trên PR release, hoặc yêu cầu deploy do chính login của bạn tạo (mục 2.4).

## 11. Câu hỏi mở

Không có. Hai câu hỏi của bản nháp đã được trả lời ở mục 10, câu 5 và 6.

## 12. Rủi ro

- **Một VPS cho mọi thứ:** Production và Staging chạy chung máy, nên lúc build hay chạy regression trên Staging, Production chậm đi. Máy hỏng thì cả ba môi trường cùng ngừng. Đủ cho Cấp 1; tách Production ra máy riêng khi có dự án thật.
- **User `aodeploy` trong nhóm `docker`** gần như có quyền root. Ai chiếm được deployer thì chiếm được VPS. Giảm rủi ro bằng: không mở dịch vụ nào ngoài Caddy, deployer chỉ nói chuyện với GitHub và Jira, và cấu hình container theo schema chặt.
- **App key nằm trên VPS:** VPS bị chiếm thì người lạ đọc được code của các repo cài App, nhưng không ghi được gì: App chỉ có quyền đọc, trừ Deployments.
- **Staging dùng chung giữa bản release và hotfix** (mục 2.8): regression phải chạy lại sau khi hotfix được merge ngược vào nhánh release.
- **Development đổi giữa lúc QA:** mục 2.5 phát hiện và báo; bạn chạy lại `/ao-qa`.
- **Dữ liệu trong bộ nhớ:** app mẫu mất dữ liệu sau mỗi lần deploy. Không ảnh hưởng `ao-pilot`; Pilot 2 ghi rõ điều này.
- **Bước bấm tay trên Jira:** bạn tạo và Release Fix Version. Quên bấm thì Epic không `complete` được; `/ao-status` và bản tổng hợp sáng nhắc.
- **Phút Actions:** CI trên PR vẫn chạy như cũ. Bỏ `deploy.yml` bớt được một phần, nhưng vẫn có thể hết phần miễn phí trước cuối tháng. Giảm phút CI là việc riêng, khi bạn muốn.
- **GitHub hay Jira ngừng:** deployer không deploy được và chờ lượt sau. Production vẫn chạy bản cũ.
- **Let's Encrypt giới hạn số chứng chỉ:** sáu subdomain cố định, Caddy giữ chứng chỉ trong volume của nó, nên không chạm giới hạn.
- **Usage của gói Pro:** khoảng 25–40 USD quy đổi cho kiểm thật. `/ao-status` cho biết chi phí đã tốn của từng item.

## Nguồn

- [GitHub Docs: Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments): repo private gói Free không có người duyệt bắt buộc, secret theo môi trường hay giới hạn nhánh
- [GitHub Docs: tiền của Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Atlassian Community: quyền tạo version](https://community.atlassian.com/forums/Jira-questions/Granular-permission-to-create-project-versions-without-granting/qaq-p/3250300)
- `docs/sdlc.md`: stage `qa-verify`, `release-cut`, `staging-verify`, `ship`, `hotfix`, điểm cắt, Fix Version, bảng định tuyến bug
- `tasks/archive/agent-roster/verification.md`, `tasks/archive/dev-workflow/verification.md`, `tasks/archive/tracker-integration/verification.md`: các việc để lại cho module này
- `lib/quality/audit.mjs`, `lib/quality/merge-gate.mjs`, `lib/tracker/conventions.mjs`, `lib/tracker/facts.mjs` trong repo kit

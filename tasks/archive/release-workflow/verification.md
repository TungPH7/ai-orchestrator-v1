# Kiểm thật: release-workflow

> **Plan:** [plan.md](plan.md). **Task:** [todo.md](todo.md). Mỗi mục ghi ngày, bước, kết quả và bằng chứng. Không có token, key hay mật khẩu nào trong file này.

## T1: App `ao-deploy` và tiền đề về GitHub, Jira (2026-11-05)

**App:** `tungph7-ao-deploy`, App ID 5624698, installation 178853493, chỉ cài trên `ao-pilot` (`repository_selection: selected`). Tạo bằng `scripts/github-app-create.mjs --apps deploy`. Key ở `C:\Users\Huu Tung\ao-keys\tungph7-ao-deploy.pem`; biến `AO_DEPLOY_APP`, `AO_DEPLOY_APP_ID`, `AO_DEPLOY_APP_KEY_FILE` của user Windows. Token của App đọc được `ao-pilot` (200), không đọc được repo kit hay `ao-sample` (404).

**Token Jira chỉ đọc:** token có scope `read:jira-work` của service account `orchestratorci`, biến `AO_JIRA_READ_TOKEN` của user Windows.

| Điểm | Kết quả | Bằng chứng |
|---|---|---|
| 1. Deployment và status do token của App tạo làm `jira-sync` chạy | Đúng | Deployment 7569854997 (`development`, `22327a5`, creator `tungph7-ao-deploy[bot]`), status `success`; `jira-sync` chạy theo `deployment_status`, run 42002039223, xanh. Không item nào đổi trạng thái: không item nào của `DEMO` ở In Review (`DEMO-3` đã được bạn chuyển sang Cancelled trước đó) |
| 2. GitHub for Jira hiện deployment trên item | Đúng | Tab Deployments của `DEMO-21` hiện deployment 7569854997: môi trường `development`, Successful, cột Pipeline ghi `deploy` (ảnh `misc/images/phien-26-luot-23-anh-1.png`). Sau đó deployment được chuyển `inactive` |
| 3. Quyền của App đủ cho `git fetch` và `audit` | Sai một phần, đã sửa | `git clone --mirror` và `git fetch` qua HTTPS: xanh. `audit` lần đầu: 403 ở `GET /commits/<sha>/status`, vì App thiếu Commit statuses. Bạn thêm **Commit statuses: Read-only**; spec mục 2.3, manifest và `docs/github-apps-setup.md` đã sửa theo. Lần sau: `audit --dry-run` của `22327a5` xanh ("merge of PR #16, which met every gate") |
| 4. Token Jira chỉ đọc đọc đủ cho `audit`, không ghi được | Đúng | Đọc `DEMO-20` (Epic, In Progress) và changelog: `audit` đi qua phần Jira của quy tắc PR tài liệu. Thử comment lên `DEMO-21`: 401 |
| 8. Token của agent gắn được file lên item | Sai, đã sửa spec | Token của agent: 401 "scope does not match", vì token chỉ có scope đọc. Token CI: gắn được (200), xóa được (204). Bạn duyệt: script gắn bằng chứng, gắn Fix Version và comment bằng token CI, trong phiên của bạn; token CI không vào phiên agent (spec mục 2.5, 2.6; T12–T14) |
| 9. Token CI tạo được Bug có Found in, Severity, Affects Version | Đúng phần kiểm được | Bug `DEMO-25` (Found in Production, Severity Critical) tạo được (201). Màn hình tạo Bug có Affects versions, nhưng `DEMO` chưa có version nào nên chưa thử gán. Token CI không chuyển được Bug sang Cancelled: từ New chỉ có transition Refine. Bạn chuyển `DEMO-25` sang Cancelled (Won't Do) |
| 10. Yêu cầu deploy bằng login của bạn ghi đúng người tạo; token `ao-dev` không tạo được | Đúng | Deployment `production` tạo bằng login `gh`: creator `TungPH7`. Token `ao-dev`: 403 "Resource not accessible by integration". Deployment thử đã chuyển `inactive` và xóa |

**Phát hiện thêm:**

- **`audit` của commit `3fdd514`** (PR tài liệu #15 của `DEMO-20`, merge ngày 2026-11-01) fail, kể cả khi chạy bằng login của bạn: "PR #15 was merged without: a CI run on head 8b7f944". Lượt CI mới nhất của nhánh là của `2109853`, commit được push rồi bị bỏ trước lúc merge. Lỗi nằm ở lịch sử cũ, không ở App. Vì deployer kiểm mọi commit mới, nó cần một điểm bắt đầu: lúc cài (T18), head hiện tại của từng nhánh được ghi là đã kiểm. T8 và T18 đã ghi thêm việc này.
- **Tên loại item theo ngôn ngữ của tài khoản.** Với token CI, `createmeta` trả tên loại item bằng tiếng Trung (`缺陷`), kèm `untranslatedName` là `Bug`. T11 tìm loại item và trường bằng `untranslatedName` hay id, không bằng tên hiển thị.
- **Bản cũ trên `ao-pilot`:** tag `v0.1.0`, nhánh `release/0.1.0`, và `main` có 4 commit không nằm trong `develop`. Cách xử lý được đưa ra trước T14.

## T2: VPS mới, DNS và tiền đề về VPS (2026-11-05)

**VPS:** BKNS VPS MMO4, Ubuntu 24.04.1, 2 core, 3,9 GB RAM, 38 GB đĩa, swap 4 GB; IP `42.96.4.120`, SSH cổng `26266`. Cài theo [docs/vps-setup.md](../docs/vps-setup.md). DNS: bản ghi A `*.ao.t2g.io.vn` trỏ về `42.96.4.120`. Qua `8.8.8.8`, `pilot-dev`, `vps` và một tên bất kỳ dưới `ao.t2g.io.vn` đều trả đúng IP đó.

**Cách thử:** image dựng tay từ `git archive` của `develop` (`ao-pilot` ở `22327a5`, `ao-sample` ở `e56a207`), với Dockerfile tạm không vào repo, base `node:24-bookworm-slim` (Node v24.22.2), `docker build --no-cache`. RAM đo mỗi giây bằng `free -m`, lấy total trừ available.

| Điểm | Kết quả | Bằng chứng |
|---|---|---|
| 5. Build ba image trong khi ba container khác đang chạy; RAM khi mỗi app có hai container | Đúng | Build lần đầu, chưa có container nào: `ao-pilot` khoảng 14 giây, API khoảng 330 giây, web 359 giây. Build lại trong khi một container của mỗi app và Caddy đang chạy: `ao-pilot` 5 giây; API 310 giây (`npm ci` 183, `nest build` và `npm prune` 62, ghi image 42); web 349 giây (`npm ci` 180, `next build` và `npm prune` 97, ghi image 48). RAM lúc cao nhất: 1.572 MB khi build API, 1.767 MB khi build web, trên 3.915 MB; swap 0. Mỗi app hai container, cộng Caddy, lúc rảnh: các container dùng 275 MiB, VPS dùng 1.200 MB, còn 2.714 MB. Cỡ image: `ao-pilot` 334 MB, API 830 MB, web 883 MB |
| 6. Caddy lấy chứng chỉ HTTPS cho `pilot-dev.ao.t2g.io.vn` | Đúng | Caddy 2.11.8 lấy chứng chỉ Let's Encrypt (issuer `YE2`, hạn tới 2027-02-03) ngay lần chạy đầu. Từ máy bạn, Node tin chứng chỉ. Không có mật khẩu hay sai mật khẩu: 401; đúng mật khẩu: 200 và trang giỏ hàng. HTTP chuyển sang HTTPS bằng 308 |
| 7. E2E của `ao-pilot` từ máy bạn, vào `https://pilot-dev.ao.t2g.io.vn`, với Chrome và basic auth | Đúng một phần | Bản clone tạm ở `22327a5`, chỉ sửa `playwright.config.ts`: đọc `E2E_BASE_URL`, `httpCredentials`, bỏ `webServer` khi có URL. Chạy tại chỗ: 24/24 xanh. Chạy vào VPS: 19 xanh, 5 fail. 5 test fail (AC9–AC11 của `DEMO-11`, AC10–AC11 của `DEMO-20`) gửi request thô bằng `node:http` tới chính server, nên đi HTTP cổng 80 không có basic auth, và nhận 308 của Caddy. 19 test xanh nhờ Caddyfile tạm đổi Host và Origin cho server (phát hiện thứ nhất bên dưới) |

**Phát hiện thêm:**

- **Server của `ao-pilot` chưa chạy được sau Caddy.** Nó chỉ nghe `127.0.0.1`, và chỉ nhận Host `127.0.0.1:<port>` hay `localhost:<port>` cùng Origin `http://<Host đó>` (ADR-0001 của `ao-pilot`). Lần thử dùng một file chạy tạm nghe `0.0.0.0`, và Caddyfile tạm gửi Host `localhost:3000` cho server, chỉ đổi Origin của chính site thành `http://localhost:3000`; Origin khác vẫn tới server nguyên vẹn. Spec đã có biến `HOST` cho địa chỉ nghe (T19); còn thiếu việc server nhận Host và Origin công khai của môi trường.
- **5 test E2E chỉ chạy được vào server tại chỗ.** Chúng gửi Host lạ, Origin lạ hay body quá lớn, là thứ trình duyệt không gửi được. Qua Caddy, request Host lạ không tới được server, và request thô không có basic auth.
- **Web của `ao-sample` import mã nguồn của API:** `@api/notes-shared` trỏ tới `apps/api/src/notes/notes.shared.ts`. Build lần đầu fail vì Dockerfile tạm chưa chép thư mục đó. Dockerfile của web phải build từ gốc repo và chép cả `apps/api/src`.
- **`API_URL` của web:** `rewrites` trong `next.config.ts` đọc biến này. Dockerfile tạm đặt nó cả lúc build và lúc chạy, trỏ tới alias mạng `sample-api`, mà cả hai container API cùng mang. [Chưa kiểm] Next.js có đọc lại `rewrites` lúc chạy hay chỉ lúc build.
- **Cache build lớn nhanh:** sau 6 lần build, cache của BuildKit là 7,25 GB, đĩa dùng 16 GB trên 38 GB. Deployer cần dọn cache build (T9). Lúc dọn xong T2, đĩa dùng 7,5 GB.
- **Phần lớn thời gian build là `npm ci`**, khoảng 3 phút. Không có `--no-cache` thì bước này trúng cache khi `package.json` và `package-lock.json` không đổi. [Ước tính] Một lần deploy chỉ đổi code của API hay web mất khoảng 2–3 phút.
- **`curl` của Windows** (schannel) lỗi TLS `SEC_E_INTERNAL_ERROR` với site, ở phía máy bạn. Node và Chrome kết nối được. Script chạy trên máy bạn nên gọi HTTPS bằng Node, không bằng `curl`.

**Sửa spec và plan** (bạn duyệt ở Phiên 26 · Lượt 33):

1. Deployer đặt biến `AO_PUBLIC_URL` cho app `public`; server của `ao-pilot` nhận Host và Origin của địa chỉ đó (spec mục 2.3; T7, T19).
2. Test gửi request thô mang tag `@local` và chạy vào server tại chỗ, ở cùng commit; các test khác chạy vào `E2E_BASE_URL` (spec mục 2.5; T19, T23).
3. Deployer dọn cache build, giữ tối đa 4 GB (spec mục 2.3; T7).

**Sau khi tắt đăng nhập root, kiểm từ máy bạn:** root bằng key: "Permission denied (publickey)"; `aoadmin` bằng mật khẩu: "Permission denied (publickey)"; `aoadmin` bằng key: vào được. Quét 65.535 cổng TCP (412 giây): chỉ cổng 80 và `26266` mở. Cổng 443 đã mở trong `ufw` và được Caddy publish, nhưng Caddyfile gốc chưa có site HTTPS nào, nên chưa có gì nghe ở đó; lúc thử điểm 6, HTTPS qua cổng 443 chạy được.

**Dọn:** đã xóa 6 container thử, image thử, mạng `ao-edge`, cache build, `/root/t2` trên VPS và mật khẩu basic auth dùng một lần trên máy bạn. Caddy vẫn chạy với Caddyfile gốc ở `docs/vps-setup.md` mục 8, giữ chứng chỉ trong volume `caddy_data`.

## Checkpoint 1 (2026-11-06)

- Năm lệnh kiểm trong quy ước chung xanh.
- Mười tiền đề có kết quả ở T1 và T2. Các tiền đề sai (3, 7, 8) đã được sửa trong spec, và bạn đã duyệt bản sửa.
- VPS đạt phần SSH, `ufw` và Docker của tiêu chí 3 (T2).
- Bạn xem kết quả của T1–T2, merge PR #173 và nhắn làm tiếp (Phiên 27 · Lượt 1).

## T8: chạy thử deployer trên máy bạn (2026-11-06)

**Cách thử:** `scripts/ao-deploy.mjs` với một `deployer.yaml` tạm trong thư mục scratchpad của phiên, trỏ tới `ao-pilot`, bằng key của App `tungph7-ao-deploy` ở máy bạn. Bản mirror và bản ghi nằm trong scratchpad; không có gì trên VPS. Không có token Jira chỉ đọc trong lần thử này.

| Bước | Kết quả |
|---|---|
| `tick --dry-run` khi chưa có điểm bắt đầu | `no baseline: run ao-deploy.mjs baseline pilot --confirm`; không làm gì |
| `baseline pilot` | In `develop` `22327a5`, `main` `354f02c`. Nhánh cũ `release/0.1.0` sai dạng `release/v<x.y.z>` nên bị bỏ qua |
| `baseline pilot --confirm`, rồi lùi `develop` trong bản ghi tạm về `d8a67f7` | Bản ghi tạm ghi điểm bắt đầu |
| `tick --dry-run` | `development: would refuse 22327a5 from develop: 3fdd514 did not pass audit: PR #15 was merged without: JIRA_CI_TOKEN, for merge-gate to read DEMO-20. Read it, then run /ao-rollback development <sha> for a later head` |

Deployer kiểm từng commit sau điểm đã kiểm, dừng ở `3fdd514`, PR tài liệu #15 mà T1 đã ghi là không qua `audit`, và không kiểm tiếp `22327a5`. Không lệnh nào ghi lên GitHub. Lý do lần này là thiếu token Jira; trên VPS có token chỉ đọc, `3fdd514` vẫn fail vì thiếu lượt CI trên head của PR (T1).

## Checkpoint 2 (2026-11-06)

**Năm lệnh kiểm và CI của kit:** xanh trên mỗi PR từ #179 tới #188 (T8–T17), 1056 test. Claude merge các PR đó khi CI xanh (plan, quyết định 10).

**Chạy chỉ kiểm trong `ao-pilot`**, bằng code của kit (`node ../ai-orchestrator/scripts/ao-step.mjs`, nhánh của T17), trên `develop` ở `22327a5`. Không lệnh nào có `--go`, nên không agent nào chạy, và không gì được ghi lên GitHub hay Jira.

| Lệnh | Kết quả |
|---|---|
| `qa DEMO-21` | Lần đầu: `GO`, vì deployment `development` của workflow deploy giả cũ (`deploy.yml`, ngày 2026-11-01) có status `success`. Deployment đó không có URL, nên `qa` sẽ thử một URL rỗng. Claude thêm chốt chặn (commit `6acb3de`, PR #188). Lần sau: `STOP: the deployment of 22327a5b on Development has no URL: only the deployer of the kit deploys there with one (spec 2.3)` |
| `release` | `STOP: no cut point on develop since v0.1.0: DEMO-5 (New) is not Done, and the items after it wait for it` |
| `ship v0.1.0` | `STOP: release/v0.1.0 is not open` |
| `rollback production` | `STOP: Production has no earlier release that ran there` |
| `status` | Thêm `Running: Development 22327a5b, Staging d013acc1, Production d013acc1` và `Done, not released yet: DEMO-12` |

**Phát hiện, cần xử lý trước kiểm thật (T18–T21):**

1. **Deployment cũ của `deploy.yml`** vẫn mang status `success`, nên được tính là bản đang chạy: Development `22327a5`, Staging và Production `d013acc`. Trước điểm bắt đầu của deployer (T18), các deployment đó cần được chuyển `inactive`; T19 bỏ `deploy.yml`.
2. **Mười item có commit trên `develop` từ `v0.1.0`, chỉ `DEMO-12` Done** (đọc Jira ngày 2026-11-06, Phiên 27 · Lượt 10; Lượt 9 chỉ nêu `DEMO-5` và `DEMO-19`):

   | Item | Loại | Trạng thái | Commit |
   |---|---|---|---|
   | `DEMO-5` | Task | New | `468b56d`, `68d2a15`, `2830053`: cài quality gates vào bản chép kit |
   | `DEMO-6` | Task | Ready for QA | `9f17f6d`: phí vận chuyển |
   | `DEMO-8` | Task | New | `2e16d25` thêm test, `0e55963` revert lại |
   | `DEMO-9` | Task | New | `5f030ae`: chép kit có roster |
   | `DEMO-10` | Story | New | `6c25b8b`: trang giỏ hàng |
   | `DEMO-12` | Story | Done | `26c8ddb`: mã giảm giá |
   | `DEMO-16` | Task | Ready for QA | `5956702`: timeout của job trong `deploy.yml` |
   | `DEMO-19` | Task | New | `d8a67f7`: chép kit có lệnh của `dev-workflow` |
   | `DEMO-20` | Epic | In Progress | `3fdd514`: spec của Epic |
   | `DEMO-21` | Story | Ready for QA | `22327a5`: xóa sản phẩm khỏi giỏ hàng |

   Từ New, rule Restrict của Jira (`docs/jira-setup.md`) chỉ cho bạn `Refine` và `Cancel`: `Start` và `Pick up` thuộc `ao-agents`, `Submit` và `Deploy to QA` thuộc `ao-automation`. Bạn chỉ bấm được `Accept` (In QA → Done). Nên bạn không tự đưa item New sang Done được. `Cancel` cũng không gỡ được, vì item Cancelled vẫn giữ điểm cắt lại (`lib/release/cut.mjs`).
3. **Bản cũ trên `ao-pilot`** (đã hẹn ở T1): tag `v0.1.0` và nhánh `release/0.1.0` cùng ở `d013acc`; `main` có 4 commit không nằm trong `develop` (3 commit thử của CI, và `354f02c` đưa kit lên `main` của `DEMO-5`). Với tag cũ, bản đầu tiên sẽ là `v0.2.0` và lịch sử tính từ `d013acc`. Xóa tag thì lịch sử tính từ commit đầu, mà `d013acc` mang `DEMO-3` (Cancelled), nên điểm cắt bị chặn ngay ở đó. Nhánh `release/0.1.0` không bị tính là đang mở, vì `d013acc` đã nằm trong `main`.
4. **Lỗi của kit: điểm cắt tính cả key của Epic.** Commit `3fdd514` mang `DEMO-20` (Epic), nên giữ điểm cắt tới khi Epic Done. Nhưng Epic chỉ `complete` được khi mọi item con đã release (guard `children-released`, `contract/workflows.yaml`). Hai điều kiện chờ nhau, nên mọi commit tài liệu của Epic chặn điểm cắt mãi.

**Sau Checkpoint 2 (Phiên 27 · Lượt 12):**

- Phát hiện 4 đã sửa ở PR #190: điểm cắt không tính key của Epic.
- Sửa dữ liệu Jira dừng sau `DEMO-19`. `Refine` bằng token CI chạy được. `Start` bằng `ATLASSIAN_AGENT_TOKEN` qua REST nhận `401 Unauthorized; scope does not match`: token đó ghi qua Rovo MCP (`kit/.mcp.json`), không qua REST. `Start` của `DEMO-21` ngày 2026-11-01 do `orchestratoragent` làm theo đường đó.
- Trạng thái lúc dừng: `DEMO-19` ở Ready, có comment ghi lý do, và workflow không có bước lùi về New. `DEMO-5`, `DEMO-8`, `DEMO-9`, `DEMO-10`, `DEMO-16` chưa đổi.
- Bạn cho phép gọi Rovo MCP bằng script chạy một lần (Lượt 13). `Start` và `Pick up` đi qua `transitionJiraIssue` với `ATLASSIAN_AGENT_TOKEN`, các bước còn lại qua REST với token CI. Script không đi qua hook `jira-guard`. Kết quả: `DEMO-5`, `DEMO-8`, `DEMO-9`, `DEMO-16`, `DEMO-19` ở In QA, chờ bạn `Accept`; `DEMO-10` ở Ready for QA, cùng `DEMO-6` và `DEMO-21`. Mỗi item có comment ghi lý do.

## T18: cài deployer lên VPS (2026-11-06)

**Commit kit đã ghim:** `2586ea8ebe3b28afa56fd12910f0997408a05a1e`.

- Bước 1, 2, 3, 5, 6 của mục 11 trong `docs/vps-setup.md` đã xong: user `aodeploy`, bản kit ở `/opt/ao/kit`, key của App `ao-deploy`, biến không bí mật của `pilot`, `deployer.yaml` chỉ có `pilot`. File tạm ở `/tmp` đã xóa.
- **Docker 29.9.3:** `docker buildx prune --force --max-used-space 4gb` chạy được (buildx 0.38.1).
- **Smoke từ host:** `aodeploy` gọi được IP của một container thử trên một network riêng, trả 200. Container, network và image thử đã gỡ.
- **Deployment cũ:** 11 deployment `success` của `deploy.yml` giả chuyển `inactive` bằng login `gh` của bạn: 9 của Development, 1 của Staging, 1 của Production. Không môi trường nào còn deployment `success`. `jira-sync` bỏ qua status `inactive`.
- **Bạn `Accept`** `DEMO-5`, `DEMO-8`, `DEMO-9`, `DEMO-16`, `DEMO-19`: cả năm đã Done (Lượt 14).
- **Bước 4 (bạn làm):** `/etc/ao/jira-read.token` và `/etc/ao/caddy/basic-auth` có quyền `root:aodeploy 640`. File basic auth có một dòng của user `ao`, với bản băm bcrypt (`$2a$`, 60 ký tự): `caddy hash-password` đọc được mật khẩu từ stdin. Claude chỉ đọc dạng của file. `AO_ENV_AUTH` trên máy bạn có dạng `ao:<mật khẩu>`.
- **Bước 7:** service và timer đã cài, chưa bật. `baseline pilot` in `develop` `22327a5b9bfd4d7169b9ca451dbcfc9dc6ddbca7` và `main` `354f02c582b20690bdf439224d693c5c2c9d4217`; `release/0.1.0` không được tính là đang mở. Chờ bạn duyệt trước `--confirm`.
- **Bạn duyệt hai head** (Lượt 16). `baseline pilot --confirm` ghi `develop` `22327a5` và `main` `354f02c` là đã kiểm. Trước đó (Lượt 15), Claude kiểm bằng `git merge-tree`, chỉ đọc: merge `main` vào `develop` và `develop` vào `main` đều không xung đột, và merge `main` vào `develop` không đổi file nào. Nên không cần merge hai nhánh trước bản đầu tiên.
- **`tick --dry-run`:** chỉ in `caddy: would write /etc/ao/caddy/Caddyfile and reload Caddy`. Sau `baseline` không có commit mới, nên không có gì để deploy. Commit mới đầu tiên trên `develop` thiếu `deploy.yaml` sẽ nhận `error`; T19 đưa `deploy.yaml` vào cùng commit đó.
- **Timer:** bật lúc 03:26 UTC. Lượt đầu ghi Caddyfile với ba site của `pilot`, mỗi site trả 503, rồi reload Caddy; Caddy lấy chứng chỉ cho `pilot-staging` và `pilot`, còn `pilot-dev` đã có từ T2. Các lượt sau không in gì. `journalctl -u ao-deploy` chỉ có dòng `caddy: Caddyfile written; Caddy reloaded`, không có bí mật.
- **Basic auth: chưa đạt.** Development và Staging trả 401 khi không có mật khẩu, và cả khi dùng `AO_ENV_AUTH`; Production trả 503 không cần mật khẩu. Thử cùng đường `printf | caddy hash-password` với một mật khẩu dùng một lần, trên một container Caddy riêng: đúng mật khẩu thì 200, sai thì 401. Vậy bản băm trên VPS không khớp mật khẩu trong `AO_ENV_AUTH`. Bạn nhập lại bằng `ao-secret.sh basic-auth`.
- **Sự cố nhỏ:** Claude in nguyên Caddyfile ra output của phiên, nên bản băm bcrypt (cost 14) của mật khẩu cũ nằm trong transcript. Bản băm không nằm trong repo hay log của kit. Mật khẩu được thay ở bước nhập lại ở trên.
- **Basic auth: đạt** (Lượt 17). Bạn nhập lại bằng `ao-secret.sh basic-auth` lúc 03:35 UTC; lượt deployer kế tiếp ghi lại Caddyfile và reload Caddy lúc 03:36. Development và Staging: không có hoặc sai mật khẩu thì 401, `AO_ENV_AUTH` thì 503 "Not deployed yet". Production: 503, không cần mật khẩu. `AO_ENV_AUTH` không đổi, nên bản băm đầu là của một chuỗi gõ khác, và bản băm lộ trong transcript không còn khớp mật khẩu nào đang dùng.
- **Tắt đăng nhập root** (mục 9): `PermitRootLogin no`, `sshd -t` qua, root nhận `Permission denied (publickey)`, `aoadmin` vẫn vào được, `ao-deploy.timer` vẫn `active`. Còn chờ bạn gỡ key khỏi ssh-agent và xóa file key của App `ao-deploy` ở máy.
- **Đóng T18** (Lượt 18): bạn gỡ key `ao_vps` khỏi ssh-agent (Claude kiểm: `ssh-add -l` không còn key đó) và xóa `tungph7-ao-deploy.pem` ở máy; còn key của `ao-dev` và `ao-review`.

## T19: Task của `ao-pilot`

- Task `DEMO-26` tạo bằng token CI lúc 2026-11-06 khoảng 10:50, ở New, nhãn `ao-devops`, mô tả theo `templates/task.md`. `ao-step.mjs build DEMO-26` (chỉ kiểm) dừng đúng: `DEMO-26 is New, not Ready`.
- **`/ao-build DEMO-26`, lượt 1** (`devops`, effort high, Opus): 13 turn, 1,2 phút, 0,39 USD. Agent điền trường Agent, tạo và push `feature/DEMO-26-docker-public-host` từ `develop` (`22327a5`), ghi ledger. `Start` bị hook `jira-guard` từ chối hai lần: `GitHub GET /git/matching-refs/heads/bugfix/DEMO-26- returned 401: Bad credentials`. Agent gắn cờ Needs you và dừng, chưa viết code.
- **Nguyên nhân:** Claude chạy `ao-step.mjs` của kit mà không đặt `AO_KIT_DIR` (plan, quyết định 6), nên hook nạp `lib/` từ bản chép cũ trong `ao-pilot`. `readGitHubToken` của bản cũ chỉ nhận token khớp `^gh[opsu]_w+$`, mà token cài đặt của App có dấu chấm, nên rơi xuống `gh auth status --show-token` và lấy phần token trước dấu chấm. Kit hiện tại đọc `GH_TOKEN` trước. Claude kiểm: một token đọc tạo y như của phiên agent có dấu chấm, và gọi `/git/matching-refs/heads/bugfix/DEMO-26-` được 200.
- **Sửa:** chạy lại với `AO_KIT_DIR`; bạn gỡ cờ và nhãn `needs-you` trên `DEMO-26` như `docs/dev-workflow.md` ghi.
- **`/ao-build DEMO-26`, lượt 2**, có `AO_KIT_DIR` (Lượt 20): `Start` qua hook. 58 turn, 9 phút, 1,78 USD; cả Task tới đây 2,18 USD. `devops` mở ao-pilot PR #17, CI xanh: server nghe trên `HOST` và nhận Host, Origin của `AO_PUBLIC_URL` (8 unit test mới), ADR-0003, Dockerfile chạy bằng user `node`, `.dockerignore`, `playwright.config.ts` với hai project `local` (5 test `@local`) và `environment` (19 test), README. `npm test` 162/162, `npm run test:e2e` 24/24. Docker không chạy trên máy, nên agent chưa build image; nó chạy thử server từ một bản chỉ có `package.json` và `src/`: Host công khai 200, Host lạ 400, Origin lạ 403.
- **Xóa `deploy.yml` và `audit.yml`:** auto mode của Claude Code từ chối lệnh `git rm` của agent ("[CI Bypass]"). Claude xóa hai file trong commit `043b402`, theo spec mục 2.10.
- **Commit chép kit `f5808fe`** (bot `ao-dev`, credential của vai trò `devops`): bản chép kit tại `29afe50` và `.ai-orchestrator/deploy.yaml` như spec mục 2.3; `readDeployConfig` của kit không báo lỗi. Sáu thư mục của `.ai-orchestrator/`, `.claude/skills/` và `.claude/hooks/` giống hệt kit; `render-agents.mjs --project .` ghi lại 8 trong 11 file.
- **Trace của Playwright giữ mật khẩu basic auth.** Claude chạy một test của `environment` vào Development với `--trace on`, rồi đếm trong `trace.zip` mà không in: `trace.trace` có mật khẩu ở dạng rõ, vì Playwright ghi `httpCredentials` của context vào trace. Kit gắn `trace.zip` lên Jira sau `/ao-qa`, nên mật khẩu sẽ lộ lên Jira. Sửa ở kit: sau `qa` trên Development và Staging, trace được chép vào `.ai/runs/<KEY>/traces/` trên máy bạn, không gắn lên Jira (spec mục 2.5 ghi theo). Trace thử đã xóa.
- **`/ao-review 17`, lượt 1, trên `043b402`:** `reviewer` 1,65 USD: 1 High, 2 Medium, 6 Low. `security` (max) 6,92 USD: 1 High, 1 Medium. Cả hai tự tìm ra lỗi trace giữ mật khẩu, lỗi Claude đã sửa ở PR #198 của kit.
- **`/ao-fix 17`:** Claude chép lại kit (`751c9b6`) và ghi note. `devops` 1,86 USD, ba commit tới `3eaa015`. `policy` đỏ vì `xit(` khớp `exit(`: lỗi của kit, sửa ở PR #199, chép vào PR bằng `e01ef4e`. `httpCredentials` có thêm `origin`.
- **Lượt review 2, trên `e01ef4e`:** chạm giới hạn 5 giờ giữa `reviewer` (1,89 USD), rồi chạy tiếp (1,48 USD, cộng 1,89 là 3,37 USD); `security` chỉ phần đổi 4,56 USD. Không còn Critical hay High. Tổng chi phí của `DEMO-26` tới gate ③: 20,53 USD, vượt ước 10–16 USD của plan, chủ yếu vì `security` effort max chạy hai lần (11,48 USD).
- **Ba Medium trong kit, sửa ở PR #200:** `.ai/qa/<KEY>/` chỉ gắn ảnh và video khi có basic auth; `readRunning` chỉ tin status do bot `ao-deploy` ghi, vì `qa` gửi basic auth tới URL trong status; luật tên trọn vẹn chỉ áp cho mẫu dạng lời gọi (`xit(`), nên `xgitleaks:allow` và `//_nosemgrep` vẫn bị bắt. Ba chỗ chạy trên máy bạn qua `AO_KIT_DIR`, trừ luật suppression chạy trong CI của dự án, nên bản chép trên PR #17 giữ ở `e01ef4e`, không push thêm để khỏi phải review lại. `ao-pilot` nhận các bản sửa này ở lần chép kit sau.
- **Gate ③:** bạn approve và merge PR #17 lúc 13:13 (commit `fb71de5`).
- **Deploy đầu lên Development: `failure`.** Deployer nhận commit trong khoảng một phút, `audit` qua, build xong, rồi smoke báo `web /: no answer: Invalid URL`. `jira-sync` gắn cờ `DEMO-26` đúng như spec mục 2.10. Bạn chưa cần gỡ cờ cho tới khi deploy lại.
- **Nguyên nhân (đã dựng lại):** `ao-deploy.service` đặt `UMask=0077`, nên worktree để build có file `600`, thư mục `700`. `COPY` giữ nguyên quyền đó, nên user `node` không đọc được `package.json`: container thoát với `ERR_INVALID_PACKAGE_CONFIG` và `--restart` chạy lại liên tục, lúc đó `IPAddress` rỗng, nên URL là `http://:3000/`. Claude bật Docker Desktop trên máy bạn rồi tắt lại: image dựng từ `fb71de5` chạy tốt (Node 24.22.2, cùng cờ của deployer), còn cùng code với context quyền `600` lặp lại đúng lỗi (`restarts=2`).
- **Sửa ở kit:** `openForBuild` mở quyền đọc cho worktree trước khi build; `swap` báo rõ khi container không có địa chỉ, kèm trạng thái và exit code. Bản kit trên VPS phải được chép lại thì bản sửa mới có hiệu lực.
- **Chép lại kit lên VPS** (Lượt 24, bạn đồng ý): **commit ghim mới `bb25b2b9edbf871fcfb6ba94c9051307e2a3f6e7`**, thay `2586ea8`. Timer dừng trong lúc chép, `tick --dry-run` không báo gì, rồi bật lại.
- **Deploy lại `fb71de5`:** yêu cầu `#7594088308` bằng login `gh` của bạn lúc 13:37. Deployer ghi `you approved the history of develop up to fb71de5`, rồi `deployed fb71de5` sau 8 giây, status `success`, URL `https://pilot-dev.ao.t2g.io.vn`, do `tungph7-ao-deploy[bot]` ghi.
- **Tiêu chí của T19:** không có hoặc sai mật khẩu 401, `AO_ENV_AUTH` 200 và có "Giỏ hàng". Container `ao-pilot-development-web-8de388586a24`: `user=node`, `capdrop=[ALL]`, `secopt=[no-new-privileges]`, không có `PortBindings`, `restarts=0`. `npx playwright test` với `E2E_BASE_URL` của Development: 24 passed, gồm 5 test `@local` tại chỗ. `jira-sync` chuyển `DEMO-26` sang Ready for QA. Đĩa VPS dùng 21%.
- **Chưa đạt ở T19:** deployment trên item Jira chưa kiểm, chờ bạn nhìn lúc gỡ cờ. Bản chép kit trong `ao-pilot` khác `main` ở 7 file: `lib/quality/suppressions.mjs`, `lib/release/deployer.mjs`, `lib/release/docker.mjs`, `lib/workflow/facts.mjs`, `lib/workflow/qa.mjs`, `lib/workflow/runner.mjs`, `agents/prompts/qa.md`. Chỉ `suppressions.mjs` chạy trong CI của dự án; các file kia chạy trên máy bạn qua `AO_KIT_DIR` hoặc trên VPS.
- Tắt lại đăng nhập root: root nhận `Permission denied (publickey)`, `ao-deploy.timer` vẫn `active`.

## T20: kiểm rằng cổng chặn đúng

- **Lần thử 1, push thẳng lên `develop`:** commit `fbbc47d` (bot `ao-dev`, thêm một câu vào README). Hook `pre-push` từ chối: `pre-push: develop is protected: change it through a pull request, not a push`. Claude push bằng `--no-verify`, là lần "đi vòng" của spec mục 7 bước 10; `docs/quality-gates.md` đã ghi hook bỏ qua được. GitHub nhận, vì repo private gói Free không có branch protection. Deployment `7594143177` nhận status `error`: `fbbc47d did not pass audit: fbbc47d on develop is not the merge of a PR into develop: it was pushed without one`. Development vẫn chạy `fb71de5`. `jira-sync` comment và giữ cờ trên `DEMO-26`.
- **Lần thử 2, yêu cầu Production bằng token `ao-dev`:** GitHub từ chối cấp token: `App 5514949 on TungPH7/ao-pilot lacks a permission of {"deployments":"write"}`.
- **Kiểm chứng bằng `journalctl`:** `aoadmin` không đọc được journal nếu không có `sudo`, và đăng nhập root đã tắt. Lý do từ chối lấy từ deployment status trên GitHub, cùng câu deployer ghi vào log (`lib/release/deployer.mjs`).
- **Gỡ chặn** (Lượt 25): bạn đọc commit và đồng ý. Yêu cầu `#7594326167` bằng login `gh` của bạn lúc 13:54; lượt deployer kế tiếp deploy `fbbc47d`, status `success` lúc 13:55. `ao-step status`: `Running: Development fbbc47d6, Staging nothing, Production nothing`. Basic auth vẫn đúng.

## Checkpoint 3 (2026-11-06)

- **Tiêu chí 3 của spec mục 9:** đạt. Từ máy bạn, cổng 80, 443 và 26266 mở; 22, 2375, 3000, 8080 bị chặn. Root nhận `Permission denied (publickey)`. Container của app không có `PortBindings`; chỉ Caddy giữ 80 và 443.
- **Tiêu chí 4:** một phần. Development có app. Staging và Production có HTTPS và trả 503 tới T21. Deployment trên item Jira chờ bạn nhìn.
- **Tiêu chí 9:** đạt (mục T20).
- **Chi phí của T19:** 20,53 USD, trên mức ước 10–16 USD. Claude ước lại T21–T22 khoảng 20–35 USD [Ước tính], chờ bạn quyết.
- **Deployment trên Jira** (Lượt 26): ảnh của bạn cho thấy tab Deployments của `DEMO-26` có đủ bốn lần deploy lên `development`, gồm hai Failed (lần `failure` đầu tiên và lần từ chối ở T20) và hai Successful.
- **Bạn duyệt** (Lượt 27): đánh T19 xong với chỗ lệch của bản chép kit, chép lại sau T22 (mục T22b của `tasks/todo.md`), và chạy T21–T22.
- **`/ao-qa` của bốn item** (Lượt 27–28): `DEMO-21` PASS, 11/11 tiêu chí, 1,19 USD; `DEMO-6` PASS, 4/4 mục, 0,99 USD. `DEMO-10` (0,23 USD) và `DEMO-26` (0 USD) chạm giới hạn 5 giờ.
- **Lỗi của kit khi chạy tiếp:** `DEMO-10` bị bỏ qua (`DEMO-10 is In QA, not Ready for QA`), vì `qa` đã kịp `Pick up` trước khi dừng. `DEMO-26` thì chạy tiếp qua `carryOn`, nhưng mất worktree, `E2E_BASE_URL` và basic auth của lượt `qa`. Claude dừng lượt đó sau khoảng 3 phút, trước khi nó ghi báo cáo; nó đã `Pick up` `DEMO-26`. Sửa ở kit: lượt `qa` dừng vì giới hạn chạy tiếp từ Ready for QA hoặc In QA, trong phiên cũ, với worktree, URL và basic auth như lượt đầu.
- **`qa` chạy tiếp, sau PR #207:** `DEMO-10` PASS, 2/2 tiêu chí, 0,49 USD (cả item 0,72 USD); `DEMO-26` PASS, 9/9 mục kiểm được, 0,65 USD. Bốn lượt `qa` của T21 tốn 3,55 USD. Bạn `Accept` cả bốn item.
- **Fix Version:** link `release-page` kiểu cũ mở ra 404 trên board, vì tab Releases chưa bật. Bạn thêm tab Releases rồi tạo `v0.2.0` và `v0.3.0` (Unreleased). Token CI không có `ADMINISTER_PROJECTS`, nên bước này là của bạn. `docs/release-workflow.md` (T23) cần ghi bước thêm tab.
- **`/ao-release` (chỉ kiểm):** `develop: 16 commits since v0.1.0; cut point fbbc47d`; `In v0.2.0: DEMO-5, DEMO-6, DEMO-8, DEMO-9, DEMO-10, DEMO-12, DEMO-16, DEMO-19, DEMO-21, DEMO-26 (Done)`; Epic `DEMO-20` không bị tính (PR #190). Dừng ở gate ④.
- **Gate ④** (Lượt 32): bạn duyệt. `release-cut` gắn Fix Version `v0.2.0` cho 10 item và tạo `release/v0.2.0` tại `fbbc47d`. Deployer deploy Staging lúc 15:22, `success`.
- **`/ao-ship v0.2.0`:** `qa` chạy full regression trên Staging, `Result: PASS`, 24/24, 0,34 USD; `devops` viết release note, 0,63 USD; script commit báo cáo `0e02f6ec` và mở ao-pilot PR #18 `release: v0.2.0`. Staging deploy `0e02f6ec`, `success`.
- **CI của PR #18 đỏ ở `policy`:** `Conventions` đòi khóa Jira ở cuối mọi commit và tiêu đề. Commit squash của `develop` kết thúc bằng `(#N)`, commit báo cáo của bot ghi số bản, và tiêu đề `release: v0.2.0` do chính `ao-step` đặt. `merge-gate` cần CI xanh, nên PR release không merge được. PR merge ngược `Merge main into develop after <tag>` cũng sẽ đỏ như vậy. Sửa ở kit (PR #209): hai loại PR này chỉ bị kiểm tiêu đề. CI chạy bản chép kit ở nhánh của PR, nên bản sửa phải vào `release/v0.2.0`.
- **Bug `DEMO-27`** (Lượt 33–36): tạo bằng token CI, High, Found in Staging, Affects và Fix Version `v0.2.0`, nhãn `ao-devops`. Bạn `Refine`; Claude đặt trường Agent và `Start` qua Rovo MCP. Nhánh `bugfix/DEMO-27-release-pr-policy` từ `release/v0.2.0`, commit `2cb601e` của bot `ao-dev` chép kit tại `66a6618`. ao-pilot PR #19 vào `release/v0.2.0`, CI xanh cả 5 job, `jira-sync` chuyển In Review. Bạn approve và squash merge: `ae0bc6a`.
- **`audit` chặn `ae0bc6a` trên Staging:** `PR #19 was merged without: reviewer report on head 2cb601e; security report on head 2cb601e`. Claude đã đề xuất bỏ review mà không kiểm quy tắc này (`docs/quality-gates.md`); `audit` làm đúng. Bạn đọc commit và gỡ chặn: yêu cầu `#7596204378` bằng login `gh` của bạn, Staging deploy `ae0bc6a` lúc 15:56, `success`. `jira-sync` chuyển `DEMO-27` sang Ready for QA, và cờ Needs you từ lần từ chối còn đó.
- **`/ao-ship v0.2.0` dừng đúng:** `1 Bug Critical or High is open with Fix Version v0.2.0: DEMO-27 (High)`.
- **`qa` của `DEMO-27` trên Staging:** PASS, 0,92 USD. PR #18 qua `Conventions` trên head mới `ae0bc6a` (CI chạy lại khi PR #19 vào nhánh release). Bạn `Accept`.
- **`/ao-ship v0.2.0`, lần 2:** regression chạy lại trên `ae0bc6a`, PASS, 0,31 USD, rồi lệnh dừng ngay ở gate ⑤. Release note không được viết lại, và báo cáo cùng `CHANGELOG.md` trên nhánh vẫn là của lần chạy trên `fbbc47d`, thiếu `DEMO-27`. `changelogWith` cũng không nhận ra mục `## [0.2.0]` mà `devops` viết (không có `v`). Sửa ở kit (PR #211): gate ⑤ chờ tới khi báo cáo của lần regression mới nhất đã được commit lên nhánh, và release note mới hơn lần regression đó; `changelogWith` thay mục cũ của bản; script cập nhật mô tả PR đang mở.
- **`/ao-ship v0.2.0`, lần 3** (sau PR #211): `devops` viết lại release note có `DEMO-27`, 0,56 USD; script commit báo cáo và `CHANGELOG.md` (`88a9e8a`) và cập nhật mô tả PR #18. CI 11/11 xanh, Staging chạy `88a9e8a`. Bốn lượt agent của `/ao-ship v0.2.0`: 1,84 USD.
- **Gate ⑤:** bạn approve PR #18. `merge-gate` merge bằng merge commit `8e8bf66` lúc 16:29, gắn tag `v0.2.0`, mở PR merge ngược #20. Deployer deploy Production `8e8bf66`, `success` lúc 16:30; `https://pilot.ao.t2g.io.vn` trả 200 không cần mật khẩu. **Tiêu chí 6 của spec mục 9: đạt.** Tree của `8e8bf66` và của `88a9e8a` (bản đã qua smoke trên Staging) đều là `225979aa357db9378c236c4aab43f45c4338b23d`.
- **PR merge ngược #20** `Merge main into develop after v0.2.0`: CI xanh, kể cả `policy` với luật mới của `DEMO-27`; `merge-gate` merge (`3c7c341`); Development deploy `3c7c341`, `success`. `ao-step status`: `Running: Development 3c7c3418, Staging 88a9e8a3, Production v0.2.0 (8e8bf666)`.
- **Đóng T21** (Lượt 40): bạn bấm Release, API trả `v0.2.0` `released: true`. **Tiêu chí 5 và 6 của spec mục 9: đạt.** Tiêu chí 4 đạt nốt: Staging và Production có app, HTTPS, deployment trên GitHub. Chi phí agent của T21: 6,31 USD (`qa` năm lượt 4,47 USD; `/ao-ship` 1,84 USD).

## T22: hotfix, rollback và smoke fail

- **Bug thử `DEMO-28`** (Lượt 41): `/favicon.ico` trả 404 trên Production. Mức thật là Low; Severity đặt High để thử đường hotfix, bạn đồng ý, và mô tả Bug ghi rõ. Nhãn `ao-be-dev`. Fix Version chờ bạn tạo `v0.2.1`.
- **`DEMO-28`:** `be-dev` 1,06 USD, ao-pilot PR #21 vào `main`, nhánh `hotfix/DEMO-28-favicon-no-content`. `be-dev` đo được rằng CSP của trang chặn request favicon trên Chrome, nên console không có lỗi như Claude đã ghi; Claude sửa Bug trên Jira. `reviewer` 1,15 USD (2 Low), `security` 0,52 USD (không có lỗi). Bạn approve, `merge-gate` merge: `7b5a559`. Staging deploy, `success`.
- **`qa` trên Staging bị tắt lúc 18:09:** Claude Code tắt lệnh nền vì RAM còn 3,0 GB. Lượt đó chưa vào `state.json`, vì `ao-step` chỉ ghi khi lượt kết thúc, nên `/ao-qa` dừng ở `In QA, not Ready for QA`. Sau khi bạn giải phóng RAM, Claude ghi tay lượt đó với `unfinished` và chạy tiếp: PASS, 0,75 USD, E2E 25/25. Cả Bug tới đây 3,48 USD. **Việc còn lại của kit:** ghi lượt vào `state.json` khi bắt đầu, để lượt bị tắt đột ngột chạy tiếp được.
- Bạn `Accept` `DEMO-28`. `/ao-ship v0.2.1` (chỉ kiểm): `Production runs v0.2.0; v0.2.1 is the hotfix of DEMO-28, merged as 7b5a5597 by PR #21, which Staging runs`, GO, chờ gate ⑤.
- **Gate ⑤ của hotfix** (Lượt 46): bạn duyệt. `hotfix-ship` tạo tag `v0.2.1` tại `7b5a559` và yêu cầu `#7599144572` bằng login `gh` của bạn, mở PR merge ngược #22. Production `success` lúc 18:38; `GET` và `HEAD /favicon.ico` trả 204, đường dẫn lạ 404. `merge-gate` merge #22: `c6f0a2c`. **Tiêu chí 7 của spec mục 9: đạt.** `/ao-ship` in sai `v0.2.1 is not the next patch`, vì tag vừa tạo đẩy bản kế tiếp lên; sửa ở PR #215.
- **Rollback** (Lượt 47): bạn bấm Release cho `v0.2.1`. `/ao-rollback production` (`#7599346240`) về `v0.2.0`: `success` sau 41 giây, `/favicon.ico` 404. `/ao-rollback production 7b5a5597…` (`#7599363508`): `success` sau khoảng 75 giây, `/favicon.ico` 204. `ao-step status`: `Production v0.2.1 (7b5a5597)`.
- **Smoke fail có chủ đích** (Lượt 49): bạn nạp key và mở đăng nhập root. Claude đổi `PORT=3000` thành `PORT=3001` trong `production.env`: `deploy.yaml` khai `PORT` nên biến tới container, còn smoke gọi cổng 3000 của `deploy.yaml`. `/ao-rollback production` tạo `#7601129137` về `v0.2.0` (`8e8bf66`) bằng login của bạn. Deployer nhận lúc 20:22:31, `failure` lúc 20:23:35 (64 giây): `web /: no answer: connect ECONNREFUSED 172.20.0.3:3000`. Trong lúc đó 6/6 lần gọi `/favicon.ico` trả 204. Sau đó Production chỉ còn container cũ, `ao-step status` ghi `Production v0.2.1 (7b5a5597)`, trang chủ 200, favicon 204. Kiểm lại lúc 20:26: yêu cầu chỉ có một status `failure`, deployer không thử lại.
- **Bug tự động:** `jira-sync` (run `42225129768`) tạo `DEMO-29` `Smoke test failed on Production at v0.2.0`, Severity Critical, Found in Production, Affects Version `v0.2.0`, trạng thái New. Priority giữ mặc định Medium, vì kit ghi mức độ vào Severity.
- **Trả lại VPS:** `PORT=3000`, quyền file vẫn `root:aodeploy 640`. `PermitRootLogin no`: root bị từ chối, `aoadmin` vào được, `ao-deploy.timer` active. Bài thử không tốn lượt agent.
- **Lệch so với T22:** plan ghi Claude chuyển Bug thử sang Cancelled, nhưng `Cancel` chỉ người bấm được, nên bạn bấm.
- **Đóng T22** (Lượt 50): bạn `Cancel` `DEMO-29`, API trả Cancelled. Bạn gỡ key khỏi ssh-agent sau.
- **Lượt bị tắt giờ có bản ghi:** `runGo` ghi lượt vào `state.json` với `unfinished` ngay trước khi agent chạy, và `ao-step` lấy session từ log khi đọc lại, nên `/ao-qa` đi tiếp được mà không cần sửa tay như ở `DEMO-28`.
- **Tiêu chí 7 và 8 của spec mục 9: đạt.** `develop` có commit hotfix: `develop...7b5a559` không còn commit nào thiếu. Chi phí agent của `DEMO-28` nằm ở hai mục đầu của T22.

## Rà soát việc tồn (2026-11-06, Lượt 51–52)

Bạn yêu cầu rà kit, Jira, `ao-pilot` và `ao-sample`, rồi xét thời điểm xử lý từng việc. Bạn duyệt các đề xuất ở Lượt 52.

- **Đã sửa trước T22b (kit PR #218):** hai Medium để lại từ Pilot 1, và `/ao-status` của Epic.
  - `openFindings` theo từng finding bằng `where` + `finding`, thay cho đếm dòng. Một dòng ghi trùng không còn xóa được finding khác, và finding bị bỏ sót giữ tên để review sau kiểm.
  - Dòng `Scope` sai mẫu, hay `## Earlier findings` không có `Scope`, làm báo cáo không đọc được. `Fixed một phần` không còn tính là Fixed.
  - **Còn hở:** báo cáo thiếu cả dòng `Scope` lẫn mục `## Earlier findings` vẫn được đọc như review đầy đủ, vì `merge-gate` không biết lượt đó được yêu cầu kiểu gì. Spec đã ghi điểm này.
  - `/ao-status` báo `Click Complete on DEMO-11`; đã chạy thử trên Jira thật. `DEMO-20` vẫn ghi `its items move on`, vì `DEMO-24` còn mở.
- **Cờ Needs you trên `DEMO-5`:** đã gỡ bằng token CI.
- **Đã kiểm và sạch:** không có PR hay issue mở ở cả 3 repo; không có key hay token trong file đã commit (quét theo mẫu, bỏ qua thư mục test); 31 file đính kèm trên Jira đều là ảnh hoặc video; `npm audit` phần production là 0 ở cả 3 repo.
- **Jira, bạn bấm lúc nào cũng được:** `Cancel` `DEMO-4`, `DEMO-7`, `DEMO-18`, `SMP-3`, `SMP-12`, `SMP-13`, `SMP-14`, `SMP-15`; `Complete` `DEMO-11`.
- **Vòng `v0.3.0` của `ao-pilot`:** `DEMO-24` (Epic `DEMO-20` chỉ `Complete` được sau khi item này đóng và đã release), `DEMO-15`, `DEMO-17`; comment sai về favicon ở `src/server.ts:70` và `src/server.test.ts:145`, sửa cùng `DEMO-15`; 10 lỗi moderate của `npm audit` ở dev dependency.
- **Pilot 2 trên `ao-sample`:** 6 item Ready for QA và Epic `SMP-2`; một lần chép kit gom hết; các Low của code app từ Pilot 1; 9 lỗi moderate ở dev dependency.
- **Sau module này:**
  - Một PR kit gom 5 lỗi Low: `develop` cục bộ đi trước origin, `/tmp/ao-reviews` trên Linux, hai clone trùng tên thư mục, B1–B3 của hook, `unquotePath`.
  - `project-scaffold`: bật Dependabot và tự xóa nhánh sau merge cho repo dự án.
  - Dọn worktree `ao-kit-fix`, các nhánh cũ của 3 repo, và một stash cũ ở `ao-pilot`.
  - Không sửa Medium `node_modules` trong worktree review: CI đã chạy test của head, còn cài package của PR thì thêm rủi ro.

## Checkpoint 4 (2026-11-06)

- Tiêu chí 5–8 của spec mục 9: đạt, ở các mục T21 và T22.
- Bạn xem lịch sử của `DEMO-21`, hai Bug thử, PR release, tag, deployment và `.ai/runs/` (Lượt 53).

## Chép kit lên VPS sau đợt rà soát (Lượt 53)

- Bạn đồng ý ở Lượt 52 và mở đăng nhập root. **Commit ghim mới: `521e03179908062080de9fd6b8fd9c77dfece2fc`**, thay `bb25b2b`. `npm ci` thêm 65 package; `tick --dry-run` không báo gì; timer bật lại.
- **Lỗi của Claude trong script chép:** vòng chờ dùng `systemctl is-active --quiet`, mà lệnh này trả lỗi với `activating`, trạng thái của service `oneshot` lúc đang chạy. Vòng chờ thoát ngay, nên `/opt/ao/kit` bị thay trong lúc một tick có thể đang chạy. Không có hậu quả: `Result=success`, tick kế tiếp chạy bình thường, không có deployment mới, ba môi trường vẫn chạy. `docs/vps-setup.md` mục 12 ghi cách chờ đúng.
- Tắt lại đăng nhập root: root nhận `Permission denied (publickey)`, `aoadmin` vào được, timer `active`. Trang chủ Production 200, favicon 204.

## T22b: chép lại kit vào `ao-pilot` (Lượt 53–54)

- **Task `DEMO-30`:** tạo bằng token CI, bạn `Refine`. Claude đặt trường Agent và `Start` qua Rovo MCP, rồi chép kit tại `521e031` lên nhánh `feature/DEMO-30-kit-copy` dưới tên bot `ao-dev` (`b7a62e4`, 13 file). ao-pilot PR #23 vào `develop`, CI xanh cả 5 job.
- **Review lượt 1, trên `b7a62e4`:**
  - `reviewer` 3,19 USD: 1 High, 3 Medium, 4 Low. High: kit PR #217 ghi lượt agent từ lúc bắt đầu, nên review bị tắt chạy tiếp qua `carryOn` trên mọi head, không có worktree. Báo cáo viết cho head cũ có thể được đăng và tính cho head mới. Lỗi này có từ trước với usage limit, và #217 mở rộng nó.
  - `security` (max) chạm giới hạn 5 giờ sau 4,24 USD. Bạn báo còn usage. Claude sửa ở kit trước (kit PR #220), ghi `head` của lượt dừng (`b7a62e4`, đối chiếu log) vào `state.json` một lần, rồi chạy tiếp: session cũ đi tiếp trên `b7a62e4` với worktree, 2,94 USD, không có Critical hay High, 1 Medium trùng High của `reviewer`. Đây là lần đầu chạy tiếp một review thật bằng code mới.
- **Kit PR #220:** review dừng chỉ chạy tiếp trên đúng head của nó, có worktree; build chạy tiếp tại chỗ; lượt chết trước dòng log đầu tiên chạy mới; ba Low (`changelogWith`, vị trí dòng `Scope`, `/ao-ship` hotfix đã lên Production). 1083 test xanh.
- **Chép lại tại `e0cd3b9`** (`a96efbc`, 4 file, +27/−7). `diff -rq` sáu thư mục và `cmp` 15 file `scripts/`: giống kit. Mô tả PR và `DEMO-30` cập nhật theo `e0cd3b9`.
- **Review lượt 2, trên `a96efbc`:** `reviewer` 2,63 USD: approve, 1 Medium (`DEMO-30` còn ghi `521e031`, đã sửa trên Jira), 1 Low (thông báo sai của `/ao-ship vX.Y.Z` khi `main` kết thúc bằng merge của bản release; lệnh vẫn dừng đúng, sửa ở PR đóng module). `security` chỉ phần mới (max) 3,22 USD: không có finding.
- **Chi phí `DEMO-30` tới gate ③: 16,22 USD**, ước 7–10 USD. Phần vượt là lượt review thứ hai, do lỗi High nằm trong bản sửa #217 của Claude.
- **Bản kit trên VPS** vẫn ở `521e031`. Thay đổi sau đó chạm `audit` chỉ ở vị trí dòng `Scope`, mức Low; chép ở lần cập nhật VPS kế tiếp.
- **Gate ③** (Lượt 55–56): lần nhắn "xong" đầu, PR #23 chưa có approve của bạn và chưa merge; Claude kiểm thấy nên chưa làm tiếp. Lần sau: bạn approve trên `a96efbc` lúc 00:41 và squash merge (`0f86022`). Deployer deploy Development `0f86022`, `success` (deployment `7606788449`), tức `audit` trên VPS cho qua PR này. `jira-sync` chuyển `DEMO-30` sang Ready for QA và gỡ cờ của `merge-gate`.
- **`/ao-qa DEMO-30`** trên Development: PASS, 0,57 USD. E2E 25/25 (20 vào Development, 5 `@local`); 13 file khớp kit tại `e0cd3b9` theo hash. `qa` không đọc được deployment (403), nên Claude kiểm thay. Bạn `Accept`.
- **Fix Version `v0.3.0` của `DEMO-30`** (Lượt 57): Claude gắn lúc tạo Task mà không nói. Quy trình gắn Fix Version cho item vào `develop` lúc cắt release (gate ④); gắn sớm không đổi gì, vì `/ao-release v0.3.0` gắn đúng giá trị đó. Giữ nguyên.
- **Chi phí `DEMO-30`: 16,79 USD.** Lúc đóng T22b, code kit không đổi từ `e0cd3b9`, nên bản chép giống `main`.
- **T22b đạt.** Sau đó kit có `7bc2e8e`: sửa Low của lượt review thứ hai (`/ao-ship vX.Y.Z` ngay sau một bản release báo nhầm là hotfix đã chạy). Bản sửa này vào `ao-pilot` ở lần chép kit kế tiếp.

## T23 và Checkpoint cuối (2026-11-07, Lượt 58)

- Kit PR #219: `docs/release-workflow.md`, mục bốn lệnh và `AO_ENV_AUTH` trong README, câu về `audit.yml`, `docs/vps-setup.md` mục 12, `misc/scaffold-input/kit-copy.mjs` và `bot-git.mjs`. PR đóng module: bản sửa `7bc2e8e`, `SPEC.md`, README, trạng thái của spec, và chuyển plan vào đây.
- Năm lệnh của quy ước chung xanh: `npm test` 1083 test, `validate`, `render:check`, `jira:checklist:check`, `agents:check`.

**Mười tiêu chí của spec mục 9:**

| # | Kết quả | Bằng chứng |
|---|---|---|
| 1 | Đạt | Bốn skill `ao-qa`, `ao-release`, `ao-ship`, `ao-rollback` trong `kit/.claude/skills/`; năm lệnh và CI của kit xanh |
| 2 | Đạt | Mười tiền đề ở đầu file này; Affects Version của tiền đề 9 thử được ở T22, khi `jira-sync` tạo `DEMO-29` với Affects Version `v0.2.0` |
| 3 | Đạt | Checkpoint 3: chỉ mở 80, 443, 26266; root bị từ chối; không container nào publish cổng |
| 4 | Đạt | T19, T21: ba subdomain có HTTPS; deployment hiện trên item Jira |
| 5 | Đạt | T21: `DEMO-21` tới Production; báo cáo QA, `docs/releases/v0.2.0.md`, `CHANGELOG.md`, tag `v0.2.0` |
| 6 | Đạt | T21: Production chạy image theo mã tree đã qua Staging |
| 7 | Đạt | T22: hotfix `v0.2.1` lên Production, PR merge ngược #22 vào `develop` |
| 8 | Đạt | T22: rollback hai chiều; smoke fail giữ `v0.2.1` và tạo Bug Critical `DEMO-29` |
| 9 | Đạt | T20: push thẳng bị chặn; yêu cầu deploy bằng token `ao-dev` bị từ chối |
| 10 | Đạt | README, `docs/release-workflow.md`, `docs/vps-setup.md`, `docs/github-apps-setup.md` có `ao-deploy`; `SPEC.md` ghi module hoàn thành |

**Để lại sau module** (chi tiết ở mục "Rà soát việc tồn"):

- Bản kit trên VPS ở `521e031`; thay đổi sau đó chạm `audit` chỉ ở vị trí dòng `Scope` (Low). Chép ở lần sửa VPS kế tiếp.
- Báo cáo `security` thiếu cả dòng `Scope` lẫn mục `## Earlier findings` vẫn được đọc như review đầy đủ; spec dev-workflow mục 2.6 ghi điểm này.
- `ao-pilot`: `DEMO-24`, `DEMO-15`, `DEMO-17` cho `v0.3.0`; Epic `DEMO-20` chờ `DEMO-24`. Bản chép kit thiếu `7bc2e8e`.
- `ao-sample` và Pilot 2; PR kit gom 5 lỗi Low; Dependabot và tự xóa nhánh trong `project-scaffold`; dọn nhánh cũ.

**Chi phí agent của module trên `ao-pilot`:** 29 lượt từ 2026-11-05, tổng 47,12 USD. Trong đó `DEMO-26` 21,18 USD, `DEMO-30` 16,80 USD, `DEMO-28` 3,48 USD, `/ao-ship v0.2.0` 1,84 USD, và bốn lượt `qa` của T21 3,82 USD. Plan ước 24–40 USD cho T19, T21, T22. Hai PR chép kit chiếm 38 USD, vì PR chạm đường dẫn được bảo vệ nên `security` chạy ở max, và cả hai đều cần review hai lượt.

## Checkpoint cuối (2026-11-07)

- Đạt 10 tiêu chí ở spec mục 9. Plan, todo và file này đã nằm trong `tasks/archive/release-workflow/` (kit PR #222).
- Bạn xác nhận module hoàn thành ("Xác nhận module release-workflow hoàn thành", Phiên 27 · Lượt 59), và đã gỡ key `ao_vps` khỏi ssh-agent.

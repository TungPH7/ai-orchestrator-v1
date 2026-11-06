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

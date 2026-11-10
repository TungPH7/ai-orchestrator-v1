# Kiểm chứng: Pilot 2

Ghi theo ngày: bước, kết quả, bằng chứng. Mỗi lượt agent ghi model, effort, chi phí và thời gian.

## Hiện trạng lúc bắt đầu, 2026-11-07

- `ao-sample`: `develop` ở `22a0213` (bản chép kit `0edf8df`, PR #14), đi trước `main` 13 commit; chưa có tag. Còn hai workflow giả `deploy.yml` và `audit.yml`; deployment `development` gần nhất là `22a0213` của workflow giả.
- Jira `SMP`: Epic `SMP-2` In Progress; `SMP-4`, `SMP-5`, `SMP-6`, `SMP-7`, `SMP-10`, `SMP-11`, `SMP-16` ở Ready for QA; 5 Task chép kit cũ ở New; chưa có Fix Version nào.
- VPS: deployer chỉ có dự án `pilot`, bản kit `521e031`. DNS wildcard `*.ao.t2g.io.vn` đã trỏ về VPS.
- App: API giữ ghi chú trong bộ nhớ; web chuyển `/api/notes` tới `API_URL` bằng `rewrites()`; `e2e/notes/create-note-api.spec.ts` gọi thẳng `http://localhost:3001/notes`.

## T2: `SMP-17`, App `ao-deploy`, dọn Jira, 2026-11-07

- Claude tạo `SMP-17` bằng token CI, nhãn `ao-devops`, không Fix Version. Bạn Refine.
- Bạn thêm `ao-sample` vào App `ao-deploy` và Cancel `SMP-3`, `SMP-12`, `SMP-13`, `SMP-14`, `SMP-15`.

## T3: build của `SMP-17`

| Lượt | Model, effort | Kết quả | USD | Turn | Phút |
|---|---|---|---|---|---|
| `devops` build, lượt 1 | Opus, `high` | Bị Claude Code dừng vì máy hết RAM, sau 17 lần gọi tool | khoảng 0 | | 3 |
| `devops` build, lượt 2, chạy tiếp trong phiên cũ | Opus, `high` | PR #15: hai Dockerfile, `.dockerignore`, `output: "standalone"`, E2E qua `/api/notes`, `playwright.config.ts` đọc `E2E_BASE_URL`, gỡ hai workflow giả | 1,04 | 30 | 11 |

- **Lượt 1 bị dừng:** phần kiểm chứng của `SMP-17` ghi "docker build tại chỗ", nên `devops` mở Docker Desktop trên máy bạn. Máy ảo của Docker giữ khoảng 2,1 GB, RAM trống còn 0,5 GB. Bạn tắt Docker Desktop; Claude sửa phần kiểm chứng trên Jira (build trên VPS) và ghi quyết định vào ledger; lượt 2 không mở Docker. Lỗi nằm ở câu Claude viết trong Task, không ở kit.
- Claude thêm commit `8884d74` dưới tên bot: `.ai-orchestrator/deploy.yaml` (health của web là `/notes`, vì `/` chuyển hướng 307 mà deployer đòi 200) và `AO_KIT_PEERS=TungPH7/ao-pilot` trong `.claude/settings.json`.
- **Build thử trên VPS** tại `8884d74`, từ `git archive`, chạy với `--cap-drop ALL` và `no-new-privileges`:

| Kiểm | Kết quả |
|---|---|
| Build `api` | 540 giây, image 340 MB |
| Build `web` | 578 giây, image 366 MB |
| RAM cao nhất lúc build | 1650 MB trên 3915 MB |
| `api` `/health` | 200 `{"status":"ok"}` |
| `web` `/notes`; `/` | 200 có "Ghi chú"; 307 sang `/notes` |
| `POST /api/notes` rồi `GET /api/notes` qua web | 201; 200 có đúng ghi chú vừa tạo |
| RAM của mỗi container | khoảng 50 MB |

## T4: VPS, 2026-11-07

- Bạn nạp key SSH và mở đăng nhập root.
- `deployer.yaml` thêm dự án `sample` (bản trước lưu ở `/etc/ao/deployer.yaml.bak-pilot2`); `/etc/ao/secrets/sample/{development,staging,production}.env` rỗng, `root:aodeploy 0640`.
- `baseline sample` in head `develop` `22a0213`, `main` `6f5831d`, tức App `ao-deploy` đọc được `ao-sample`; `--confirm` đã ghi. Caddyfile có ba host của `sample`.
- 13 deployment giả `development` của `ao-sample` (6 của bạn, 7 của bot `ao-dev`) được đặt inactive bằng login `gh` của bạn.
- Deployer của `pilot` vẫn chạy: ba container `pilot` và Caddy chạy; VPS còn khoảng 3,2 GB RAM khả dụng.

## T3 tiếp: review của `SMP-17`, 2026-11-07

| Lượt | Model, effort | Kết quả | USD | Turn | Phút |
|---|---|---|---|---|---|
| `reviewer`, lượt đầu | Opus, `xhigh` | Dừng vì hết hạn mức 5 giờ, chưa có báo cáo | 1,51 | 22 | 7 |
| `reviewer`, chạy tiếp trong phiên cũ | Opus, `xhigh` | 2 Medium, 4 Low | 1,91 | 17 | 6 |
| `security` toàn PR | Opus, `max` | 1 Medium, 1 Low | 4,68 | 45 | 18 |

Tổng `SMP-17`: 9,13 USD, gồm 1,04 USD của `devops`.

- **Medium của cả hai role:** Production không có basic auth; ai cũng tạo được ghi chú, không giới hạn, lưu trong bộ nhớ; container không có trần RAM trên VPS chung. `security` đo được: khoảng 100.000 ghi chú làm `GET` trả 120–338 MB JSON. `docs/specs/SMP-2/spec.md` cũng đòi giới hạn tần suất, trần số ghi chú và header bảo mật trước môi trường công khai; spec Pilot 2 đã bỏ sót điều này.
- **Medium của `reviewer`:** smoke test của web không đi qua API.
- **Low của `security`:** basic auth có thể lọt vào Call log của Playwright khi request lỗi mạng. Claude quét 94 comment trên 48 item của `DEMO` và `SMP`: không comment nào chứa thông tin đó.
- **Quyết định của bạn** (Phiên 27): lựa chọn 1, Task nhỏ trước khi cắt bản. `SMP-18` (`be-dev`): trần 1000 ghi chú, và smoke check `/api/notes` dưới tên bot. Giới hạn tần suất, header bảo mật và lưu bền vững để cho Epic sau. Hai việc kit vào danh sách sửa sau: trần RAM của container trong deployer, và hook chặn comment Jira có basic auth.

## T5: gate ③ của `SMP-17` và lần deploy đầu, 2026-11-07

- Bạn merge PR #15 (`337f230`). Deployer tạo deployment `development` cho `337f230`, build hai image trong khoảng 6 phút nhờ cache của lần build thử, smoke xanh: `success`.
- Từ máy bạn: không mật khẩu và sai mật khẩu đều 401; đúng mật khẩu `/notes` 200 có "Ghi chú", `/` 307 sang `/notes`, `POST /api/notes` 201, `GET /api/notes` 200; HTTP 308 sang HTTPS; cổng 3001 không trả lời từ ngoài.
- RAM trên VPS, 5 container app và Caddy: mỗi container 40–56 MB; còn khoảng 3,1 GB khả dụng.
- `SMP-17` sang Ready for QA theo deployment đó.
- **VPS khởi động lại lúc 16:24–16:38 UTC** (23:24–23:38 giờ Việt Nam), trước lần deploy này. Log của lần boot trước dừng đột ngột, không có thông điệp tắt máy; không OOM, không lỗi kernel; RAM lúc 16:20 dùng 9%; unattended-upgrades không bật tự khởi động lại. Nhiều khả năng do phía nhà cung cấp. Mọi container tự chạy lại nhờ `--restart unless-stopped`, và deployer chạy tiếp bình thường.

## T5b: `SMP-18`, giới hạn 1000 ghi chú, 2026-11-08 đến 2026-11-10

| Lượt | Model, effort | Kết quả | USD | Turn | Phút |
|---|---|---|---|---|---|
| `be-dev` build | Opus, `high` | PR #16: `MAX_NOTES = 1000`, 409 `NOTES_LIMIT_REACHED`, test store, service, filter, e2e của API và web | 1,35 | | |
| `reviewer`, lượt đầu | Opus, `xhigh` | Dừng vì hết hạn mức 5 giờ | 1,32 | 19 | 5 |
| `reviewer`, chạy tiếp | Opus, `xhigh` | Yêu cầu sửa: 1 High, 4 Medium, 1 Low | 1,13 | 7 | 2 |
| `security` toàn PR | Opus, `max` | Duyệt: 1 Medium (khóa tạo ghi chú trên Production) | 2,95 | 38 | 11 |
| `ba` (`ao-agent.mjs`, prompt của Claude) | Opus, `xhigh` | AC14, AC15 và ba chỗ cũ của SPEC (`64e1698`); mô tả Story trên Jira | 1,99 | 34 | 5 |
| `ba`, chạy tiếp trong phiên cũ | Opus, `xhigh` | Đếm AC1–AC15, "Ba Story" (`b1afd1b`) | 2,40 | 8 | 1 |
| `sa` (`ao-agent.mjs`, prompt của Claude) | Opus, `xhigh` | `NOTES_LIMIT_REACHED` trong API Contract, Phase 4 của Task List (`293ffaa`) | 1,51 | 28 | 3 |
| `be-dev` fix | Opus, `high` | E2E AC14, AC15 (`5c5c58b`), mô tả PR, comment Jira | 1,05 | 27 | 7 |
| `reviewer` lượt 2 | Opus, `xhigh` | Dừng vì hết hạn mức 5 giờ | 1,32 | 22 | 3 |
| `reviewer` lượt 2, chạy tiếp | Opus, `xhigh` | Duyệt: 2 Low | 1,50 | 14 | 4 |
| `security` phần mới từ `d37681a` | Opus, `high` | Duyệt: không finding | 0,57 | 12 | 2 |

Tổng `SMP-18`: 17,10 USD (11,20 của các lượt `ao-step`, 5,90 của `ba` và `sa`).

- **High của `reviewer`:** Task đổi API công khai (thêm 409), nên theo `contract/work-items.yaml` phải là Story. Bạn chọn đổi thành Story của `SMP-2`. Claude đổi loại và cha bằng token CI (Jira cho sửa tại chỗ, trạng thái giữ In Progress). Kit không có lệnh cho việc này, cũng không có lệnh trả lời `Cần sa:`: Claude chạy `ba` và `sa` bằng `ao-agent.mjs` với prompt viết tay.
- **Medium về khóa tạo ghi chú:** Claude tạo Epic `SMP-19` "Ghi chú: chống lạm dụng và lưu bền vững trước khi công khai" (New): giới hạn tần suất, log khi kho đầy, chính sách khi kho đầy, lưu bền vững, header bảo mật, trần RAM của container. Rủi ro ghi trong SPEC và Known Issues của `v0.1.0`.
- **Chạy tiếp một phiên cho việc nhỏ tốn như một lượt mới:** `ba` chạy tiếp để sửa ba chữ tốn 2,40 USD, nhiều hơn lượt chính. Việc nhỏ nên gộp vào prompt đầu.
- Bạn approve và tự merge PR #16 (`59cd4de`), vì PR sửa `.ai-orchestrator/deploy.yaml`. Development deploy `success` sau khoảng 2 phút; `api` chạy trước `web` (02:01:58, rồi 02:02:03); `GET /api/notes` qua web 200.
- **Còn lại (Low):** quyết định 10 của plan và Testing Strategy của SPEC chưa liệt kê AC14, AC15; checkpoint cuối của plan còn ghi AC1–AC13; ADR-0002 còn ghi deploy giả lập. Chưa có lần kiểm nào cho kho đầy thật đi qua web tới form: `qa` giả câu trả lời, vì kho Development dùng chung.

## T6: QA trên Development, 2026-11-10

Development chạy `59cd4de`. Mỗi lượt chạy toàn bộ E2E của repo trên `https://sample-dev.ao.t2g.io.vn` với basic auth: 33/33 ở cả 9 lượt.

| Item | Kết quả | USD | Phút |
|---|---|---|---|
| `SMP-4` | PASS; 29 request sai qua `/api/notes` đúng dạng lỗi | 0,64 | 3 |
| `SMP-5` | PASS; 29/29 ca của bảng `checkNote` trên API đã deploy | 0,90 | 5 |
| `SMP-6` | PASS; bố cục đo ở 320–1440 px, tương phản sáng và tối | 0,75 | 5 |
| `SMP-7` | PASS; AC1, AC2, AC7, AC8, AC9 | 0,84 | 5 |
| `SMP-10` | PASS; AC3–AC6 | 0,77 | 5 |
| `SMP-11` | PASS; AC10–AC13 | 0,94 | 8 |
| `SMP-16` | PASS; bản chép kit 143/143 file giống `ao-pilot` | 0,67 | 4 |
| `SMP-17` | PASS; C1–C8, V1–V4 | 0,63 | 4 |
| `SMP-18` | PASS; AC14, AC15 với câu trả lời giả, 36/36 integration test của API | 0,82 | 5 |

Tổng QA: 6,96 USD, mọi lượt Opus `high`. Bạn Accept cả 9 item.

- **Basic auth trong QA:** Claude quét 141 file trong `.ai/runs`, `.ai/qa`, `.ai/ledger` và `.playwright-cli` tìm mật khẩu và dạng base64 của nó: không có. Trace của Playwright giữ mật khẩu, nằm trên máy như kit đã định. `qa` tự viết `.ai/tools/basic-auth-init.cjs`, đọc mật khẩu từ biến môi trường.
- **Lệch quy tắc:** `qa` gọi `curl -u "$E2E_HTTP_USER:$E2E_HTTP_PASSWORD"`, nên mật khẩu nằm trong tham số của tiến trình lúc chạy, dù log chỉ có tên biến.
- **Mô tả `SMP-16`** ghi bản chép `c80b480`; PR #14 chép `0edf8df`, bản PR #24 của `ao-pilot` đã review. Claude sửa mô tả bằng token CI. Lỗi ở câu Claude viết khi tạo item.

## T7: gate ④, 2026-11-10

- Bạn tạo Fix Version `v0.1.0` và `v0.2.0`.
- **`/ao-release` không có điểm cắt:** commit đầu `6f5831d` mang `SMP-1`, và năm Task chép kit (`SMP-3`, `SMP-12`, `SMP-13`, `SMP-14`, `SMP-15`) đã merge rồi mới bị Cancel theo mục 2.7 của spec này. Kit chỉ tính item Done, mà Cancelled không có transition nào ra. Lỗi của spec: Claude không tính tới quy tắc của điểm cắt.
- **Sửa kit, PR #234 (`42ec84d`), bạn chọn:** item Cancelled không giữ điểm cắt, giống key của Epic. Code của nó đi theo điểm cắt chứa nó, không nhận Fix Version, và `/ao-release` ghi riêng một dòng ở gate ④. Lúc cắt, script comment lên từng item đó. 1117/1117 test, năm lệnh kiểm xanh.
- Bạn duyệt danh sách. `/ao-release v0.1.0 59cd4de`: Fix Version `v0.1.0` cho 9 item, comment trên 6 item Cancelled, nhánh `release/v0.1.0` tại `59cd4de` dưới tên bot `ao-dev`. Staging deploy `success` lúc 04:00 UTC, dùng lại image của Development (cùng tree `94998e8e`).

## T8: `/ao-ship v0.1.0` và Production, 2026-11-10

| Lượt | Model, effort | Kết quả | USD | Phút |
|---|---|---|---|---|
| `qa` regression trên Staging | Opus, `high` | 33/33, `Result: PASS`, không Bug mở | 0,30 | 2 |
| `devops` release notes | Opus, `high` | `changelog.md`, `pr-description.md`, `fix-version.md`; Known Issues ghi rủi ro chờ `SMP-19` | 0,74 | 3 |

- Script commit `docs/releases/v0.1.0.md` và `CHANGELOG.md` (`2149896`) rồi mở PR #17. CI xanh.
- Bạn làm UAT trên Staging và approve PR #17. `merge-gate` merge (`2e69e47`) lúc 04:18 UTC, gắn tag `v0.1.0`, mở PR #18 merge `main` về `develop` và merge nó (`bf7cddb`).
- Production deploy `success` lúc 04:18 UTC. Từ ngoài: `/notes` 200 có "Ghi chú", `/` 307 sang `/notes`, HTTP 308 sang HTTPS, `/health` và `/api/health` 404, `GET /api/notes` 200, `POST /api/notes` 201 rồi `GET` có ghi chú đó.
- Bạn Release `v0.1.0` (có mô tả) và Complete `SMP-2`.

## T9: rollback trên Development, 2026-11-10

- `/ao-rollback development`: Development chạy `bf7cddb`, yêu cầu deployment #7673690064 với `59cd4de`. Deployer chạy lại tree `94998e8e` lúc 04:36 UTC, `success`; `GET /api/notes` qua web 200.
- `/ao-rollback development bf7cddb`: yêu cầu #7673714541, `success`. Không lần nào phải build lại.

## T10: checkpoint cuối, 2026-11-10

**VPS lúc kết thúc:** 6 container của `sample` (31–47 MB mỗi container), 3 container của `pilot` và Caddy; còn 2941 MB RAM khả dụng trên 3915 MB; đĩa dùng 12 GB trên 38 GB; build cache 4,6 GB, trong đó 4,2 GB thu hồi được. Ba môi trường chạy cùng tree `f5770b74`. Đăng nhập root đã đóng (`PermitRootLogin no`, bản trước ở `00-ao-hardening.conf.bak-pilot2-end`); SSH root bị từ chối.

| Tiêu chí (spec mục 5) | Kết quả | Bằng chứng |
|---|---|---|
| 1. Production trả trang "Ghi chú" của `v0.1.0`; Development và Staging hỏi basic auth | Đạt | `/notes` 200; hai môi trường kia 401 khi không có mật khẩu |
| 2. `api` không có subdomain; web tạo và đọc ghi chú qua `/api/notes` ở cả ba môi trường | Đạt | `/health`, `/api/health` 404 từ ngoài; QA trên Development, regression trên Staging, `POST` 201 và `GET` trên Production |
| 3. Item Done có Fix Version `v0.1.0` đã Release; `SMP-2` Complete | Đạt, 9 item thay vì 8 | Thêm `SMP-18` (mục 2.6) |
| 4. Tag `v0.1.0` trên `main`; PR merge ngược đã vào `develop` | Đạt | Tag ở `2e69e47`; PR #18 (`bf7cddb`) |
| 5. Rollback và đưa bản mới về lại, smoke xanh | Đạt | Deployment #7673690064, #7673714541 |
| 6. `audit` qua commit merge của PR #14 | Đạt, kiểm tay | `22a0213` là baseline của `develop` nên deployer không audit nó. `audit.mjs --sha 22a0213c… --branch develop --dry-run`: "the merge of PR #14, which met every gate" |
| 7. `ao-pilot` vẫn chạy khi `ao-sample` chạy chung; RAM có trong file này | Đạt | `pilot.ao.t2g.io.vn` 200, `pilot-dev` và `pilot-staging` 401; RAM ở trên |
| 8. Năm lệnh kiểm của kit xanh sau mỗi lần sửa kit | Đạt | PR #234 |

**Chi phí Pilot 2:** 34,23 USD, trong ước tính 30–40: `SMP-17` 9,13; `SMP-18` 17,10; QA 6,96; ship 1,04.

**Việc kit để sau:**
- `qa` gọi curl với `-u user:password`: đổi prompt sang `curl -K -`, đọc thông tin đăng nhập từ stdin.
- `audit.mjs` nhận SHA rút gọn rồi báo sai "pushed without a PR": đổi ra SHA đầy đủ, hoặc từ chối SHA rút gọn.
- Không có lệnh đổi Task thành Story, cũng không có lệnh trả lời `Cần ba:`, `Cần sa:` cho item đang có PR.
- Deployer không dọn build cache (4,2 GB thu hồi được), không đặt trần RAM cho container.
- Từ trước: 4 Low của kit-copy-review, `AO_KIT_PEERS` trong settings của `ao-pilot`, hook chặn base64 của basic auth trong comment Jira, các Low tài liệu của `SMP-17` và `SMP-18`.

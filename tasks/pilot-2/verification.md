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

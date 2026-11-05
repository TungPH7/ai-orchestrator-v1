# Plan triển khai: release-workflow

> **Spec:** [SPEC-release-workflow.md](../SPEC-release-workflow.md), đã duyệt 2026-11-05 (Phiên 26 · Lượt 17). **Trạng thái:** đã duyệt 2026-11-05 (Phiên 26 · Lượt 20), cùng quyết định 4, 5 và 6. **Task chi tiết:** [todo.md](todo.md). **Kết quả kiểm thật:** `tasks/verification.md`, tạo ở T1.

## Tổng quan

Làm nốt vòng ngoài của SDLC, từ lúc PR được merge vào `develop` tới lúc bản release chạy trên Production. Việc gồm:

- Thư viện `lib/release/`: điểm cắt, số bản, bản nào lên môi trường nào, `deploy.yaml`, smoke test, và một lượt của deployer.
- Deployer trên VPS mới: `scripts/ao-deploy.mjs`, systemd timer, Caddy, App `ao-deploy`.
- `audit`, `merge-gate` và `jira-sync` nhận PR release, PR merge ngược và các sự kiện deployment mới.
- Bốn lệnh `/ao-qa`, `/ao-release`, `/ao-ship`, `/ao-rollback`, cùng phần sửa ở prompt của `qa`, `devops` và ở hợp đồng.
- Kiểm thật trên `ao-pilot`: `DEMO-21` đi từ QA tới Production, rồi một hotfix, một lần rollback và một lần smoke fail có chủ đích.

Như các module trước, plan kiểm mười tiền đề trước (T1–T2, spec mục 2.12), rồi mới viết code dựa vào chúng.

## Quyết định kiến trúc

1. **Kiểm tiền đề trước, chia làm hai task.**
   - T1: bạn tạo App `ao-deploy`. Claude kiểm điểm 1–4 và 8–10 trên `ao-pilot` và space `DEMO`. Task này chưa cần VPS.
   - T2: bạn thuê VPS và tạo bản ghi DNS. Claude cài phần nền (SSH, `ufw`, Docker, Node.js, Caddy), rồi kiểm điểm 5–7 bằng container dựng tay.

   Bạn chỉ thuê VPS sau khi T1 xong, nên chưa tốn tiền VPS nếu một tiền đề về GitHub hay Jira sai. Điểm nào sai thì Claude dừng, đề xuất sửa spec và chờ bạn duyệt.
2. **Hàm thuần, script mỏng.**
   - Hàm thuần: `cut`, `versions`, `targets`, phần kiểm của `deploy-config`, và hàm quyết định của deployer.
   - Phần gọi `git`, `docker`, GitHub hay Jira nhận hàm chạy lệnh và client làm tham số. Test chạy bằng dữ liệu ghi sẵn trong `tests/fixtures/release/`, không gọi mạng, không gọi Docker.
   - Thêm `lib/release/docker.mjs`, ngoài danh sách file ở spec mục 5. File này dựng đối số cho `docker`, để test kiểm được rằng không có cổng ra host hay `--privileged` mà không chạy Docker. `deployer.mjs` gọi nó.
3. **Deployer tin bản ghi của chính nó.**
   - Điều kiện "tree đã qua Staging" và danh sách bản được phép rollback lấy từ bản ghi của deployer trong `/var/lib/ao/`, không lấy từ deployment trên GitHub.
   - Deployment trên GitHub dùng để báo cho `jira-sync`, GitHub for Jira và bạn. Từ GitHub, deployer chỉ tin hai thứ: lịch sử commit, và login tạo yêu cầu deploy.
4. **Đổi bản không làm gián đoạn.**
   - Container mới chạy cạnh container cũ, và smoke test gọi container mới qua mạng nội bộ.
   - Đạt thì Caddy chuyển sang container mới, và container cũ dừng. Không đạt thì container mới bị xóa, còn container cũ vẫn phục vụ.

   Như vậy, "chạy lại bản trước" ở spec mục 2.9 là giữ nguyên container cũ. Mỗi app có lúc chạy hai container, vẫn vừa 4 GB RAM. T2 đo điều này.
5. **Một commit không qua `audit` chặn môi trường của nó, cho tới khi bạn gỡ.**
   - Deployer kiểm mọi commit mới, nên commit đó nằm lại trong lịch sử, và mọi head sau nó cũng bị từ chối. Revert không gỡ được.
   - Cách gỡ: bạn đọc commit đó, rồi tạo một yêu cầu deploy bằng login của bạn cho một head sau nó, bằng `/ao-rollback <môi trường> <sha>`. Deployer ghi rằng bạn đã duyệt đoạn lịch sử tới head đó, rồi đi tiếp như thường. Với Production, `<sha>` vẫn phải thỏa hai điều kiện của spec mục 2.4.
   - Dạng `<sha>` này cũng là cách đưa `v0.1.1` lên lại sau rollback, ở bước 8 của kiểm thật. Spec chưa ghi lệnh cho bước đó.
   - Spec mục 2.9 ghi thêm một đoạn, và bảng ở mục 2.2 ghi thêm dạng `<sha>` của `/ao-rollback`. Lệnh vẫn tên `/ao-rollback`, nên vẫn có bốn lệnh.
6. **Bản chép kit vào `ao-pilot` vẫn cần.**
   - `merge-gate` và `jira-sync` chạy trong Actions của `ao-pilot`, bằng bản chép trong `.ai-orchestrator/`. `AO_KIT_DIR` chỉ đổi được code chạy trên máy bạn.
   - Vì vậy PR của Task ở T19 mang thêm bản chép kit mới, bên cạnh Dockerfile, `deploy.yaml` và việc bỏ `deploy.yml`. Bạn merge một PR thay vì hai.
   - Lệnh ở máy vẫn chạy qua `AO_KIT_DIR`. Khi sửa lỗi kit giữa kiểm thật, Claude chỉ phải chép lại khi lỗi nằm ở phần chạy trong Actions.
   - Spec mục 7 bước 3 ghi thêm ý này.
7. **Bí mật không đi qua chat, repo hay log.**
   - **Private key của App `ao-deploy`:** bạn tải về lúc tạo App. T1 dùng key ở máy bạn, như hai App kia. T18 chép file lên VPS bằng `scp`, không mở file. Sau đó bạn xóa bản ở máy.
   - **Mật khẩu basic auth và token Jira chỉ đọc:** bạn tự gõ, trong terminal của bạn, vào một lệnh `ssh -t` do Claude soạn sẵn. Lệnh hỏi giá trị mà không hiện chữ trên màn hình.
   - **`AO_ENV_AUTH` trên máy bạn:** một biến môi trường của user Windows, đặt trong System Properties. Script đọc biến này từ registry, như các token khác.
8. **SSH vào VPS.**
   - Bạn tạo key mới có passphrase mạnh, rồi nạp vào ssh-agent của Windows lúc cài. Claude gọi `ssh.exe` của Windows.
   - Cài xong, bạn gỡ key khỏi agent.
   - Mọi bước cài nằm trong `docs/vps-setup.md`, nên làm lại được từ đầu trên một VPS khác.
9. **Bản kit trên VPS ghim theo một commit của `main` kit.** Claude chép bản mới lên VPS chỉ khi bạn yêu cầu (spec mục 8), và ghi commit đã ghim vào `tasks/verification.md`.
10. **Quy trình nhánh như các module trước.**
    - Mỗi task một nhánh `task/t<N>-<slug>` tách từ `main`, mở PR khi CI xanh. Từ T8 tới Checkpoint 2, Claude merge PR của kit bằng Rebase and merge khi CI xanh, rồi làm tiếp task sau; bạn soát ở Checkpoint 2 (bạn duyệt ở Phiên 27 · Lượt 7). Sau Checkpoint 2, Claude hỏi lại bạn trước khi tự merge.
    - PR trên `ao-pilot` sửa đường dẫn được bảo vệ do bạn merge.
    - Claude dừng ở các checkpoint để bạn soát.
11. **Usage của gói Pro.** Kiểm thật tốn khoảng 10–12 lượt agent (bảng ở cuối file). Checkpoint 3 hỏi bạn trước phần tốn nhất.

## Thứ tự và phụ thuộc

```
T1 App ao-deploy, tiền đề GitHub và Jira ── T2 VPS, DNS, tiền đề VPS
                                                  │
T3 versions, cut ────────────┐                    │
T4 deploy.yaml, schema ──────┼── T7 smoke, Docker ┤
T5 targets ──────────────────┤                    │
T6 audit cho dãy commit ─────┴── T8 deployer ── T9 vps/, docs/vps-setup.md
                                                  │
T10 merge-gate: release, tag, merge ngược         │
T11 jira-sync: ba sự kiện deployment              │
                                                  │
T12 dữ kiện môi trường, attachments ── T13 /ao-qa │
T3 ── T14 /ao-release                             │
T13 ── T15 /ao-ship bản release                   │
T5, T15 ── T16 /ao-ship hotfix, /ao-rollback, /ao-status
T13–T16 ── T17 bốn skill, prompt, hợp đồng        │
                                                  ▼
T9, T10, T11, T17 ── T18 cài deployer ── T19 Task của ao-pilot ── T20 kiểm cổng chặn
T20 ── T21 DEMO-21 tới Production ── T22 hotfix, rollback, smoke fail ── T23 tài liệu, lưu trữ
```

- T1–T2 đứng đầu: một tiền đề sai sẽ đổi cách deployer báo kết quả (điểm 1–2), cách nó đọc GitHub (điểm 3), hay cách `/ao-qa` gắn bằng chứng (điểm 8).
- T3–T17 phần lớn độc lập với VPS. Nhưng gói Pro giới hạn usage, nên mặc định vẫn làm lần lượt.

## Danh sách task

### Giai đoạn 1: tiền đề
- [x] T1: App `ao-deploy` và tiền đề về GitHub, Jira (spec mục 2.12, điểm 1–4, 8–10) [bạn]
- [x] T2: VPS mới, DNS và tiền đề về VPS (điểm 5–7) [bạn]

### Checkpoint 1
- [x] Năm lệnh kiểm trong quy ước chung xanh
- [x] Mười tiền đề có kết quả trong `tasks/verification.md`. Tiền đề nào sai thì spec đã được sửa, và bạn đã duyệt bản sửa
- [x] VPS đạt phần SSH, `ufw` và Docker của tiêu chí 3
- [x] Bạn xem kết quả của T1–T2

### Giai đoạn 2: thư viện release
- [x] T3: `versions.mjs` và `cut.mjs`
- [x] T4: `deploy.schema.json` và `deploy-config.mjs`
- [x] T5: `targets.mjs`

### Giai đoạn 3: deployer
- [x] T6: `audit` cho một dãy commit, và hai quy tắc mới
- [x] T7: `smoke.mjs` và phần Docker của deployer
- [x] T8: `deployer.mjs` và `scripts/ao-deploy.mjs`
- [x] T9: Thư mục `vps/` và phần deployer của `docs/vps-setup.md`

### Giai đoạn 4: cổng và Jira
- [ ] T10: `merge-gate`: PR release, tag và PR merge ngược
- [ ] T11: `jira-sync`: ba sự kiện deployment

### Giai đoạn 5: bốn lệnh
- [ ] T12: Dữ kiện về môi trường, và `attachments.mjs`
- [ ] T13: `/ao-qa`
- [ ] T14: `/ao-release`
- [ ] T15: `/ao-ship` cho bản release
- [ ] T16: `/ao-ship` cho hotfix, `/ao-rollback` và `/ao-status`
- [ ] T17: Bốn skill, prompt và hợp đồng

### Checkpoint 2
- [ ] Năm lệnh kiểm trong quy ước chung và CI của kit xanh
- [ ] Claude chạy `ao-step.mjs` ở chế độ chỉ kiểm trong `ao-pilot`, bằng code của kit: `qa DEMO-21`, `release`, `ship v0.1.0`, `rollback production`. Các lệnh dừng đúng chỗ, vì VPS chưa có deployer. Không agent nào chạy
- [ ] Bạn đọc kết quả đó, skill `ao-ship`, và phần prompt đã sửa

### Giai đoạn 6: lên VPS và `ao-pilot`
- [ ] T18: Cài deployer lên VPS [bạn]
- [ ] T19: Task của `ao-pilot`: Dockerfile, `deploy.yaml`, E2E và bản chép kit [bạn]
- [ ] T20: Kiểm rằng cổng chặn đúng (spec mục 7, bước 10)

### Checkpoint 3
- [ ] Tiêu chí 3, 4 và 9 của spec mục 9 đạt
- [ ] Bạn xem chi phí của T19, rồi đồng ý chạy kiểm thật ở T21–T22 (ước 14–24 USD)

### Giai đoạn 7: kiểm thật
- [ ] T21: `DEMO-21` từ QA tới Production (bước 4–6) [bạn]
- [ ] T22: Hotfix, rollback và smoke fail có chủ đích (bước 7–9) [bạn]

### Checkpoint 4
- [ ] Tiêu chí 5–8 của spec mục 9 đạt
- [ ] Bạn xem lịch sử của `DEMO-21` và Bug thử trên `DEMO`, PR release, tag, deployment trên `ao-pilot`, và `.ai/runs/`

### Giai đoạn 8: hoàn thiện
- [ ] T23: Tài liệu, `SPEC.md` và lưu trữ plan

### Checkpoint cuối
- [ ] Đạt 10 tiêu chí ở spec mục 9
- [ ] Chuyển `tasks/plan.md`, `tasks/todo.md`, `tasks/verification.md` vào `tasks/archive/release-workflow/`
- [ ] Bạn xác nhận module hoàn thành

## Usage ước tính cho kiểm thật

| Task | Lượt chạy agent | Model | Ước tính |
|---|---|---|---|
| T1, T2 | không có agent, chỉ lệnh `git`, `gh`, `ssh` và API | | 0, cộng tiền VPS từ T2 |
| T19 | `devops` viết Dockerfile, `deploy.yaml` và phần E2E; `reviewer`, `security` trên PR có bản chép kit | Opus | 10–16 USD |
| T20 | không có agent | | 0 |
| T21 | `qa` trên Development; `qa` chạy full regression trên Staging; `devops` viết release note | theo roster | 6–10 USD |
| T22 | dev agent sửa Bug thử; `reviewer`, `security`; `qa` trên Staging | theo roster | 8–14 USD |

Tổng khoảng 10–12 lượt agent, 24–40 USD quy đổi, khớp mức 25–40 USD của spec mục 7. Có thể cần ba khung 5 giờ của gói Pro. [Ước tính] VPS khoảng 5–10 USD mỗi tháng, tính từ T2.

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Một tiền đề sai: deployment do App tạo không kích hoạt `jira-sync`, GitHub for Jira không hiện deployment, hay token Jira chỉ đọc không đọc đủ | Cao | T1 kiểm trước khi thuê VPS và viết code; sai thì dừng và đề xuất sửa spec |
| VPS 2 vCPU, 4 GB build chậm hay thiếu RAM khi ba môi trường cùng chạy | Trung bình | T2 đo thời gian build và RAM trước khi viết deployer; thiếu thì đề xuất VPS lớn hơn hay giới hạn bộ nhớ của container |
| Deployer có lỗi, deploy commit chưa qua cổng | Cao | `audit` cho từng commit có test cho commit push thẳng nằm dưới PR hợp lệ; T20 thử thật; `tick --dry-run` trước khi bật timer |
| Production nhận bản thiếu gate ⑤ | Cao | `targets` là hàm thuần có test cho từng điều kiện; deployer tin bản ghi của chính nó (quyết định 3); T20 thử yêu cầu deploy bằng token `ao-dev` |
| Một commit không qua `audit` làm Development đứng mãi | Trung bình | Quyết định 5: bạn gỡ bằng yêu cầu deploy; T20 thử cách gỡ |
| Bí mật lọt vào chat hay log | Cao | Quyết định 7; deployer không in biến môi trường của app; test kiểm log và tham số dòng lệnh không chứa token |
| VPS mới bị tấn công như VPS cũ | Trung bình | Cài theo `docs/vps-setup.md`: chỉ key, không root, `ufw`, `unattended-upgrades`; không container nào publish cổng; Checkpoint 1 và 3 kiểm lại |
| Let's Encrypt từ chối vì gọi lại quá nhiều lần trong lúc cài | Thấp | T2 thử với một subdomain trước; Caddy giữ chứng chỉ trong volume |
| Hết usage giữa lúc kiểm thật | Cao | `state.json` cho chạy tiếp lượt dở; tiến độ ghi trong `todo.md`; Checkpoint 3 hỏi trước |
| Phút Actions hết trong tháng | Trung bình | Bỏ `deploy.yml` ở T19; deploy không chạy trên Actions; Claude báo số phút đã dùng ở mỗi checkpoint |

## Câu hỏi mở

Không có. Bạn duyệt plan ngày 2026-11-05 (Phiên 26 · Lượt 20), gồm cả ba quyết định thêm vào hoặc nói rõ hơn spec. Spec mục 2.2, 2.9, 7 và 10 đã ghi theo:

- **Quyết định 4:** đổi bản bằng cách cho container mới chạy cạnh container cũ, thay vì dừng container cũ trước.
- **Quyết định 5:** gỡ chặn bằng `/ao-rollback <môi trường> <sha>`. Spec mục 2.2 và 2.9 đã ghi thêm.
- **Quyết định 6:** bản chép kit đi cùng PR của Task ở T19. Spec mục 7 đã ghi thêm.

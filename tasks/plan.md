# Plan triển khai: Pilot 3 (B4)

> **Spec:** [SPEC-pilot-3.md](../SPEC-pilot-3.md), duyệt ngày 2026-11-14: câu 1, 2, 4, 5 theo đề xuất ở Phiên 30 · Lượt 2; câu 3 ở Lượt 5 (bản sao kéo về máy bạn). **Trạng thái:** viết ở Lượt 2, sửa ở Lượt 5 theo câu 3. Quyền tự làm theo đề xuất áp dụng cho B4 (câu 5), nên plan không chờ duyệt riêng; bạn muốn đổi gì thì nói lúc nào cũng được. **Danh sách task:** [todo.md](todo.md).

## Tổng quan

Pilot 3 chia năm chặng:
- **Chặng 1, kit và `SHOP-5`:** `production_auth`; dòng `STOP:` của `/ao-preview`; Task `SHOP-5` sửa scaffold, đi qua review và QA tới Done.
- **Chặng 2, ba môi trường và `v0.1.0`:** Staging và Production trên VPS; bản sao backup kéo về máy bạn; bản `v0.1.0` của scaffold lên Production.
- **Chặng 3, Epic tới gate ②:** chép kit mới vào `shop` nếu cần; ảnh của bạn; `/ao-intake`, `/ao-spec`, `/ao-plan`.
- **Chặng 4, các item của Epic:** Task design system, rồi từng Story: build, xem trước, review, QA.
- **Chặng 5, `v0.2.0` và đóng:** bản `v0.2.0` lên Production, có database đã có dữ liệu; hướng dẫn; đóng pilot.

Task đầu kiểm các tiền đề bằng đọc code và chạy thật, vì kết quả có thể đổi chặng 1 và 2.

## Quyết định kiến trúc

1. **Kit: mỗi chặng code một nhánh và một PR.** Nhánh `task/pilot3-<N>` tách từ `main`, mỗi task một commit. Mình tự merge khi CI xanh, như các PR kit trước.
2. **`production_auth` là khóa của từng dự án trong `/etc/ao/deployer.yaml`** (spec 2.2), mặc định `false`. Chỉ `caddySites` đọc nó; deployer, smoke test và `audit` không đổi. Caddyfile của `ao-sample` và `ao-pilot` phải giống hệt bản cũ.
3. **Bản sao kéo về máy bạn** (spec 2.4, câu 3 ở Lượt 5):
   - `ao-backup run` đọc khóa công khai `age` từ `/etc/ao/deployer.yaml`; có khóa thì sau mỗi bản dump ghi thêm bản mã hóa vào `/var/backups/ao-offsite/`, giữ theo cùng `backupsToKeep`. Chọn file, đặt tên, giữ bản là hàm thuần trong `lib/release/backup.mjs`.
   - Tài khoản `aobackup`: SFTP chỉ đọc, `ChrootDirectory` vào thư mục đó, key riêng có `restrict`. Cấu hình `sshd` nằm trong `vps/` của kit, cài theo `docs/vps-setup.md`.
   - `scripts/ao-backup-pull.mjs` trên Windows: gọi `sftp` của Windows OpenSSH với key riêng, chỉ tải file chưa có, không xóa gì, ghi trạng thái để `doctor` báo khi bản mới nhất cũ hơn 36 giờ; `install` tạo task của Task Scheduler.
   - Phần đẩy lên B2 không viết lúc này.
4. **`SHOP-5` do phiên chính viết, agent review và QA.** Như `SMP-27` ở T20 của B1: PR do bot `ao-dev` mở bằng `ao-pr.mjs`, `/ao-review` rồi merge khi CI xanh (câu 5), `/ao-qa` trên Development. Accept là của bạn.
5. **Mỗi PR của `shop` sửa kit thì đi riêng,** không chung với code app, vì `/ao-preview` dừng ở PR chạm `.ai-orchestrator/` (bài học của B2).
6. **Item của Epic đi đúng đường SDLC.** Gate ①–⑤ và Accept là của bạn; mình chạy lệnh, theo dõi, báo tiến độ 3 phút một lần. Agent chạy lần lượt.
7. **Docker Desktop:** mình bật ngay trước lượt `be-dev`, `/ao-preview` hay kiểm thật cần Docker, và tắt ngay sau. Chỉ xóa thứ chính phiên này tạo, theo đúng tên.
8. **VPS:** VPS vẫn mở theo lời bạn dặn. Chỉ phiên chính SSH. Không in file có thông tin đăng nhập; mật khẩu sinh ngay trên VPS và không bị in.
9. **Fix Version** tạo qua REST bằng token admin, như T18 của B1 (spec 2.5). Bấm Release và Complete Epic là của bạn, hoặc mình làm qua REST khi bạn bảo.
10. **Hướng dẫn** viết một lượt ở chặng 5, từ đầu ra thật của Pilot 3: phần mới trong `docs/getting-started.md` cho Epic Spring Boot, cùng `production_auth` và bản sao backup trong `docs/vps-setup.md`.

## Task

| Task | Nội dung | Chặng |
|---|---|---|
| T1 | Spec duyệt, plan, todo, nhật ký Phiên 30 · Lượt 1–4 | PR tài liệu |
| T2 | Tiền đề: chỗ đọc Production không qua basic auth; đường `/ao-review` cho PR của phiên chính; E2E của template gọi API cũ; biến của profile Spring cho Staging và Production; RAM và build cache trên VPS | Ghi vào `verification.md` |
| T3 | `production_auth`: schema, `caddySites`, test, `deployer.example.yaml` | 1 |
| T4 | Dòng `STOP:` của `/ao-preview --go` và `--stop`; PR | 1 |
| T5 | **[bạn]** `SHOP-5`: Task, code, PR, `/ao-review`, merge, `/ao-qa`, Accept | 1 |
| T6 | Kit: bản mã hóa của `ao-backup`, cấu hình `aobackup`, `ao-backup-pull.mjs`, dòng của `doctor`; PR | 2 |
| T7 | VPS: kit mới, bí mật và database của Staging và Production, `production_auth` cho `shop`, tài khoản `aobackup` | 2 |
| T8 | **[bạn]** Máy bạn: khóa `age` (bạn cất một bản), task kéo về; một lần khôi phục thật từ bản sao | 2 |
| T9 | **[bạn]** `v0.1.0`: Fix Version, `/ao-release` (gate ④), Staging, `/ao-ship`, gate ⑤, Production, đo RAM | 2 |
| T10 | Chép kit mới vào `shop` trong PR riêng, nếu kit đã đổi từ `SHOP-2` | 3 |
| T11 | **[bạn]** Ảnh vào `.ai/design-inbox/<EPIC>/`; `/ao-intake`; `Start spec` | 3 |
| T12 | **[bạn]** `/ao-spec` tới gate ① | 3 |
| T13 | **[bạn]** `/ao-plan` tới gate ② | 3 |
| T14 | **[bạn]** Task design system: build, xem trước, review, gate ③, QA, Accept | 4 |
| T15 | **[bạn]** Story thứ nhất: như T14 | 4 |
| T16 | **[bạn]** Story thứ hai: như T14 | 4 |
| T17 | **[bạn]** `v0.2.0`: vài sản phẩm thử trên Production, gate ④, `/ao-ship`, gate ⑤, Production, Release, Complete Epic | 5 |
| T18 | Hướng dẫn; PR | 5 |
| T19 | Đóng pilot | PR tài liệu |

Số Task và Story của chặng 4 theo plan của `sa` ở T13; todo được sửa lại khi đó.

**Checkpoint:**
- **Checkpoint 1**, sau T2: tiền đề có kết quả; spec và plan sửa nếu cần.
- **Checkpoint 2**, sau T5: PR của chặng 1 merge; năm lệnh kiểm xanh; `SHOP-5` Done.
- **Checkpoint 3**, sau T9: `v0.1.0` chạy trên Production và hỏi basic auth; RAM ba môi trường đo được; bản sao trên máy bạn khôi phục được (tiêu chí 2, 7).
- **Checkpoint 4**, sau T13: gate ① và ② qua; có `design.md` với màn hình kiểu Ảnh.
- **Checkpoint 5**, sau T16: mọi item của Epic Done (tiêu chí 4–6).
- **Checkpoint 6**, sau T19: đủ tám tiêu chí.

## Rủi ro

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Có chỗ trong kit đọc host Production mà không qua basic auth (`doctor`, `/ao-status`, `jira-sync`) | Trung bình: lệnh báo lỗi giả sau `production_auth` | T2 tìm mọi chỗ đọc host; T3 sửa cùng |
| `/ao-review` không nhận PR do phiên chính viết | Thấp: `SMP-27` đã đi đường này | T2 đọc lại T20 của B1 |
| Regression của `v0.1.0` đỏ vì E2E gọi API cũ | Trung bình: chặn gate ⑤ | `SHOP-5` cho các test đó chờ Epic (spec 2.1) |
| VPS thiếu RAM khi ba môi trường cùng chạy | Cao | Đo ở T2, T9; nếu thiếu thì đề xuất trước khi lên Production |
| `be-dev` chạm giới hạn 5 giờ giữa lượt Java | Trung bình: chậm | Lần kiểm thật mục 2.1 của `live-run-fixes`; ghi lại |
| Chi phí vượt 125 USD | Trung bình | Hỏi bạn trước khi chạy thêm (spec mục 4) |
| Key kéo bản sao về không có passphrase, vì Task Scheduler không nhập được | Thấp: ai có máy bạn thì đọc được bản mã hóa, vốn đã nằm trên máy | Key chỉ đọc được thư mục bản mã hóa trong chroot; khóa bí mật của `age` cất ngoài laptop; mất máy thì gỡ key trên VPS |

## Chi phí

Theo spec mục 3: khoảng 90–125 USD agent. Phần lớn ở chặng 4. Chặng 1 tốn 5–10 USD (`SHOP-5`), chặng 2 1–2 USD (`/ao-ship v0.1.0`). `shop` và kit là repo public, nên CI không tốn phút.

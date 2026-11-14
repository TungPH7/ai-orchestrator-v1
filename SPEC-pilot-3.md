# SPEC: Pilot 3

> **Loại:** pilot, không phải module. Hàng B4 của [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md). **Dùng:** mọi module Cấp 1, `human-loop`, `live-run-fixes` và `project-scaffold` phần 1–3. **Là đầu vào cho:** C1 (thứ tự chạy trong contract, role `seo`) và C2.
>
> **Trạng thái:** viết ngày 2026-11-14 (Phiên 30 · Lượt 1). Đã duyệt: câu 1, 2, 4, 5 theo đề xuất ở Lượt 2; câu 3 ở Lượt 5, bản sao backup kéo về máy bạn (mục 2.4, 8). Plan và danh sách task: [tasks/plan.md](tasks/plan.md), [tasks/todo.md](tasks/todo.md).

## 1. Mục tiêu

Pilot 3 chạy "trường hợp 2" của concern 1 trên repo thật `TungPH7/shop`, từ spec tới Production. Repo có ba app và Postgres: `user` (Next.js), `admin` (React + Vite), `api` (Spring Boot). Pilot đi hai chặng lớn, theo cách chạy đã duyệt ở Lượt 112:

1. **Kiểm scaffold, không cần agent viết code.** Bản `v0.1.0` là ba app khung đang có trên `develop`. Bản này đi qua Development, Staging rồi Production. Mỗi môi trường có database riêng, backup mỗi đêm và bản sao ngoài VPS.
2. **Epic đầu của `shop`, làm bằng agent.** Epic nhỏ, chạm cả ba app, không đụng tới đăng nhập hay thanh toán. Epic đi từ `/ao-intake` tới Production trong bản `v0.2.0`.

**Những thứ chạy thật lần đầu:**
- `be-dev` viết Java (Spring Boot 4, Maven, Testcontainers, JaCoCo). `fe-dev` viết cả React + Vite lẫn Next.js trong cùng một Epic.
- Màn hình kiểu Ảnh (`screenshot:`), mục Design System của `design.md`, và Task "Design system của <app>" (mục 2.5 của `project-scaffold` phần 2).
- `/ao-preview` cho một PR có code của cả ba app. `qa` chạy E2E trên hai host công khai, qua `E2E_USER_URL` và `E2E_ADMIN_URL`.
- Bản release đầu của một dự án có database: Flyway chạy trên Staging và Production. Bản thứ hai (`v0.2.0`) nâng một database Production đã có dữ liệu.
- Nếu xảy ra: chạy tiếp sau giới hạn 5 giờ, và sửa AC trên PR đang mở (mục 2.1, 2.2 của `live-run-fixes`).

**Sau Pilot 3:**
- `user` và `admin` chạy `v0.2.0` ở cả ba môi trường. Production vẫn hỏi basic auth cho tới khi bạn quyết mở bán (mục 2.2).
- Mọi item của Epic Done; Fix Version `v0.1.0` và `v0.2.0` đã Release; Epic Complete.
- Có số đo RAM khi ba môi trường của `shop` chạy cùng `ao-pilot` và `ao-sample`, và quyết định giữ hay nâng VPS.
- Hướng dẫn có một ví dụ trọn vòng với Spring Boot. Lỗi kit gặp trong lúc chạy được sửa, có test.

**Ngoài phạm vi:**
- Đăng nhập của `user` và `admin`, phân quyền API, thanh toán, tải ảnh sản phẩm, danh mục, giỏ hàng: để cho các Epic sau.
- Mở Production cho mọi người (bỏ basic auth): bạn quyết sau Epic đăng nhập.
- Rollback Production khi có migration, và đổi bản Postgres (mục 14 của `docs/vps-setup.md`): chỉ ghi lại.
- C1 và C2.

## 2. Thiết kế

### 2.1 Task `SHOP-5`: sửa scaffold trước bản đầu

`/ao-release` cần ít nhất một item Done để tìm được điểm cắt (`lib/release/cut.mjs`). `SHOP-1` tới `SHOP-4` đều đã Cancelled. Vì vậy `SHOP-5` đi trọn đường tới Done:

- Phiên chính viết code, như `SHOP-1` tới `SHOP-4`.
- **`HEALTHCHECK` của `api`:** lệnh này gọi `/actuator/health/liveness`, nhưng `SecurityConfig` chỉ mở `/actuator/health`. Spring Security trả 401, nên Docker đánh dấu container `unhealthy`. Cách sửa là mở cả nhóm `/actuator/health/**`, hoặc đổi `HEALTHCHECK` về `/actuator/health`; chọn ở plan.
- **E2E của template gọi API NestJS cũ,** như trang `/products` của `user`. Các test này chờ tới Epic, bằng `test.skip(` kèm `reason:` theo luật suppressions của kit, để regression của `v0.1.0` chỉ phủ phần đang chạy được.
- **Review và QA:** `/ao-review` (`reviewer`, `security`), rồi `/ao-qa` trên Development. Bạn Accept.

### 2.2 Production chưa mở cho mọi người

Hiện deployer đặt basic auth cho Development và Staging, còn Production luôn mở (`lib/release/caddy.mjs`). Với `shop`, mở Production lúc này có nghĩa là để Internet ghi thẳng vào database:
- `SecurityConfig` của `api` để `/api/**` ở `permitAll`;
- Caddy trong container `admin` chuyển `/api` tới `api`;
- `user` và `admin` còn trang đăng nhập và trang demo của template.

**Đề xuất:** thêm khóa `production_auth: true` cho từng dự án trong `/etc/ao/deployer.yaml`. Khi có khóa này, Caddy đặt cùng basic auth cho mọi host Production của dự án.
- Khóa nằm trên VPS, chỉ root sửa được, không nằm trong repo. Vì vậy không PR nào mở được Production.
- Smoke test gọi thẳng container trong mạng nội bộ của VPS (`lib/release/smoke.mjs`), nên không bị ảnh hưởng. `qa` không chạy trên Production.
- Bỏ khóa này là quyết định mở bán của bạn, sau Epic đăng nhập.

### 2.3 Staging và Production trên VPS

Phiên chính làm theo mục 12–15 của [docs/vps-setup.md](docs/vps-setup.md). VPS vẫn mở, theo lời bạn dặn.

1. Tạo `/etc/ao/secrets/shop/{staging,production}.env` và `.db.env`. `AUTH_SECRET` và mật khẩu database được sinh trên VPS và không bao giờ in ra. Profile Spring của từng môi trường chọn ở plan (`api` có `application-staging.yml` và `application-prod.yml`).
2. Thêm `production_auth: true` cho `shop`. Khi PR kit của mục 2.2 merge, chép kit mới lên VPS (mục 12).
3. Timer `ao-backup` phủ cả ba database, kèm bản sao ngoài VPS (mục 2.4).
4. Đo RAM lúc rảnh khi đủ ba dự án, và lúc deploy Production. Xem lại mốc `PRUNE_CACHE` 4 GB, vì build cache đã lên 6,5 GB ở B3.

### 2.4 Bản sao backup ngoài VPS

Ở Lượt 5, bạn chọn: **máy bạn kéo bản sao về.** Các cách khác (B2, Google Drive, snapshot của BKNS) được so ở Lượt 1–4 của nhật ký.

- **Trên VPS:** sau mỗi bản dump, `ao-backup` mã hóa nó bằng khóa công khai `age`, rồi đặt bản mã hóa vào `/var/backups/ao-offsite/<dự án>/<môi trường>/`. Bản mã hóa được giữ theo cùng luật với bản dump. Bản dump gốc vẫn chỉ root đọc được.
- **Tài khoản `aobackup` trên VPS:** chỉ dùng SFTP, chỉ đọc, bị nhốt trong thư mục bản mã hóa (`ChrootDirectory`, `internal-sftp -R`), đăng nhập bằng một key riêng. Không dùng root, vì root bị đóng khi bạn bảo "đóng VPS".
- **Trên máy bạn:** `scripts/ao-backup-pull.mjs` chạy bằng Task Scheduler, mỗi ngày và mỗi lần bạn đăng nhập.
  - Script chỉ tải các file chưa có, và không xóa gì trên máy bạn.
  - Khi bản mới nhất đã cũ hơn 36 giờ, script để lại cảnh báo; cách hiện cảnh báo chọn ở plan.
- **Khóa bí mật của `age`** sinh trên máy bạn, không bao giờ lên VPS. Bạn cất một bản ở ngoài laptop, ví dụ trong trình quản lý mật khẩu. Mất khóa là mất mọi bản sao.
- **Chuyển sang B2 sau này:** phần mã hóa và thư mục bản mã hóa dùng chung.
  - Khi bạn chuyển, kit thêm bước đẩy thư mục đó lên B2 bằng `rclone`; khóa và cách khôi phục giữ nguyên.
  - Phần đẩy lên B2 chỉ viết khi bạn chuyển, để kit không có code chưa từng chạy thật.

**Kiểm bằng một lần khôi phục thật:**
1. lấy một bản mã hóa trên máy bạn và giải mã;
2. so mã băm với bản dump gốc trên VPS;
3. khôi phục vào Postgres trên Docker ở máy bạn;
4. so số bảng và số dòng với `restore-check` của cùng bản trên VPS.

### 2.5 Bản `v0.1.0` của scaffold

1. `SHOP-5` Done.
2. Fix Version `v0.1.0` và `v0.2.0` trong space `SHOP`: mình tạo qua REST bằng token admin, như T18 của B1.
3. **Gate ④:** `/ao-release v0.1.0 <sha>`. Deployer deploy Staging, tạo database Staging, và Flyway chạy 3 migration.
4. `/ao-ship v0.1.0`: `qa` chạy regression trên Staging, `devops` viết release notes.
5. **Gate ⑤:** bạn approve PR release. Deployer deploy Production.
6. Bấm Release cho `v0.1.0`: bạn bấm, hoặc mình làm qua REST nếu bạn bảo.

### 2.6 Epic đầu: "Danh mục sản phẩm" (đề xuất)

Cả ba app đều có sẵn phần sản phẩm từ template, nhưng không khớp nhau:
- **`api` (Java):** có `POST /api/products`; `GET /api/products` trả cả danh sách, không phân trang; `GET /{id}`; `PUT /{id}/price`; `PUT /bulk-price/{slug}`; `DELETE /{id}`. Giá lưu kiểu `NUMERIC(12,2)`.
- **`admin`:** CRUD trên `/products` với `priceCents`, sửa toàn bộ bằng `PUT /products/{id}`. Trang sửa nằm sau `ProtectedRoute` và `RequireModule` của template, mà đăng nhập ở đó viết cho API NestJS cũ.
- **`user`:** `/[locale]/products` gọi `/products?page&sortBy&orderBy&name` theo API NestJS cũ, và có nút xóa sản phẩm.

Epic đề xuất làm ba app khớp một hợp đồng API:
- **Trong `admin`,** quản trị viên xem danh sách (phân trang, tìm theo tên), thêm, sửa (tên, slug, giá, mô tả) và xóa sản phẩm. Trang sửa ra khỏi lớp đăng nhập của template. Host `shop-admin*` có basic auth ở cả ba môi trường cho tới Epic đăng nhập.
- **Trong `user`,** khách xem danh sách sản phẩm (tìm, sắp xếp, phân trang) và trang chi tiết theo slug. App của khách không còn nút xóa.
- **`api`** có đủ các thao tác trên, kiểm dữ liệu vào, và trả lỗi theo Problem Details như hiện có.

Phạm vi cuối do bạn chốt lúc `/ao-intake`, vì bạn là PO; `ba` và `sa` chia Story. Dự kiến có 2 Story, mỗi Story có Sub-task BE và FE, cùng 1–2 Task design system.

**Ảnh chụp:** trước `/ao-spec`, bạn chép 2–4 ảnh giao diện bạn muốn vào `.ai/design-inbox/<EPIC>/` của `shop`: trang danh sách và trang chi tiết của `user`, form của `admin`. Mỗi ảnh tối đa 1 MB, cạnh dài tối đa 2.000 px. Nếu bạn chưa có ảnh, mình chụp giao diện hiện tại của hai app trên Development, và `ux` rút design system từ đó.

### 2.7 Đường đi của Epic

1. `/ao-intake`: phiên chính phỏng vấn bạn rồi tạo Epic. Bạn bấm `Start spec`.
2. `/ao-spec` (`ba`, `ux`) tới gate ①; `/ao-plan` (`sa`, `ba`) tới gate ②.
3. Với mỗi item:
   1. `/ao-build`;
   2. `/ao-preview`: bạn xem ba app trên máy;
   3. `/ao-review`, rồi gate ③;
   4. `/ao-qa` trên Development, rồi bạn Accept.
4. `/ao-release v0.2.0` (gate ④), `/ao-ship v0.2.0`, gate ⑤, lên Production.
   - Sau `v0.1.0`, mình thêm vài sản phẩm vào Production qua `admin`.
   - Nếu Epic có migration, đây là lần đầu luật expand/contract chạy trên một database Production có dữ liệu.
5. Bạn Release `v0.2.0` và Complete Epic.

Agent chạy lần lượt, kèm báo tiến độ 3 phút một lần. `be-dev` và `/ao-preview` cần Docker Desktop (Testcontainers, Postgres): mình bật trước các lượt đó và tắt ngay sau.

### 2.8 Việc kit đi kèm

- `production_auth` (mục 2.2) và bản sao kéo về máy bạn (mục 2.4): bản mã hóa của `ao-backup`, tài khoản `aobackup`, `scripts/ao-backup-pull.mjs`; có test và tài liệu.
- Dòng `STOP:` ở cuối `/ao-preview --go` và `--stop` nghe như báo lỗi, dù chỉ mô tả trạng thái mới. Sửa cách hiển thị của `ao-step` (việc B3 để lại).
- Lỗi kit gặp khi chạy: sửa trong kit PR riêng, có test, rồi chép vào `shop` trong một PR riêng (bài học của B2).

## 3. Chi phí ước tính

| Việc | USD [Ước tính] |
|---|---|
| `SHOP-5`: `/ao-review` và `/ao-qa`; phiên chính viết code | 5–10 (`SMP-27`: 10,30) |
| `/ao-ship v0.1.0` | 1–2 (`v0.2.0` của `ao-sample`: 1,05) |
| Intake, spec, plan | 15–20 (`SMP-23`: 14,90) |
| Task design system | 5–10 |
| 2 Story: build, sửa sau khi xem trước, review, QA | 50–70 |
| `/ao-ship v0.2.0` | 2–3 |
| Dự phòng cho lỗi tìm ra khi chạy | 10 |
| **Tổng** | **Khoảng 90–125** |

Phần VPS, `/ao-release`, `/ao-rollback` và việc của phiên chính không gọi agent, nên 0 USD.

## 4. Ranh giới

**Luôn làm:**
- Agent chạy lần lượt, chỉ trên `shop` và space `SHOP`.
- Ghi chi phí từng lượt, và báo tiến độ 3 phút một lần.
- Key, mật khẩu và khóa `age` không bao giờ xuất hiện trong chat, commit hay log, vì repo kit là public.

**Hỏi trước:**
- Mọi việc xóa không hoàn tác được.
- Chạy thêm agent khi tổng chi phí vượt 125 USD.
- Mở cổng hay dịch vụ mới trên VPS, thêm quyền cho App hay agent, nâng VPS.

**Không làm:**
- Bấm thay bạn gate ①–⑤, hay Accept item do agent làm.
- Bỏ basic auth của Production.
- Push thẳng lên `develop` hay `main`, hoặc merge PR có CI đỏ.

## 5. Tiêu chí hoàn thành

1. `https://shop.ao.t2g.io.vn` và `https://shop-admin.ao.t2g.io.vn` chạy `v0.2.0` và hỏi basic auth; Staging và Development cũng vậy. Smoke test xanh ở cả ba môi trường.
2. Ba database có backup mỗi đêm và bản sao ngoài VPS. Một lần khôi phục thật từ bản sao ngoài VPS đạt.
3. `SHOP-5` và các item của Epic Done; Fix Version `v0.1.0`, `v0.2.0` đã Release; Epic Complete.
4. Code Java do `be-dev` viết qua CI (Testcontainers, JaCoCo, `osv-scanner`); code React và Next.js do `fe-dev` viết.
5. `design.md` có màn hình kiểu Ảnh và mục Design System; `docs/design-system/<app>.md` có trong `shop`, và các Story có giao diện dùng nó.
6. `/ao-preview` chạy ba app và Postgres cho một PR của Epic; `qa` chạy E2E qua `E2E_USER_URL` và `E2E_ADMIN_URL`.
7. Có số đo RAM khi đủ ba môi trường của `shop` cùng hai dự án kia, kèm quyết định về VPS; `ao-pilot` và `ao-sample` vẫn chạy bình thường.
8. Năm lệnh kiểm của kit xanh sau mỗi lần sửa kit. Hướng dẫn có ví dụ Spring Boot trọn vòng, với chi phí thật.

## 6. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Thiếu RAM khi ba môi trường cùng chạy, nhất là lúc build `user` (ở B3, đỉnh lúc build chỉ còn 1.474 MB trống với một môi trường) | Đo ở mục 2.3. Deployer build từng cái một, và có swap 4 GB. Nếu thiếu, mình đề xuất tắt bớt môi trường của `ao-pilot` hoặc nâng VPS |
| Deploy lâu (B3: 18,5 phút cho lần đầu có `api`) làm release chậm | Chấp nhận; ghi số đo |
| E2E của template gọi API cũ làm regression của `v0.1.0` đỏ | `SHOP-5` cho các test đó chờ Epic (mục 2.1) |
| `be-dev` chưa từng viết Java; Maven và Testcontainers chậm, dễ chạm giới hạn 5 giờ | Đây cũng là lần kiểm thật mục 2.1 của `live-run-fixes`; ghi thời gian từng lượt |
| Hợp đồng API mới có thể cần migration, ví dụ nếu giá đổi sang tính theo xu | `sa` theo luật expand/contract; `v0.2.0` là lần kiểm thật đầu |
| Bỏ lớp đăng nhập khỏi trang sửa của `admin` | Chỉ an toàn khi host có basic auth: mục 2.2 và tiêu chí 1 |
| Docker Desktop chiếm RAM máy bạn trong lượt `be-dev` và `/ao-preview` | Bật ngay trước, tắt ngay sau |
| Bản sao trên máy bạn trễ khi máy tắt, và chỉ có một bản trên một laptop | VPS giữ 7 ngày và 4 tuần nên máy kéo bù được; cảnh báo khi bản mới nhất cũ hơn 36 giờ; chuyển hay thêm B2 trước khi mở bán nếu bạn muốn |

## 7. Thứ tự

Plan chia chi tiết thành năm chặng:
1. Kit: `production_auth`, dòng `STOP:`. Task `SHOP-5`.
2. VPS: Staging, Production, bản sao kéo về máy bạn. Bản `v0.1.0`.
3. Epic: intake, spec, plan.
4. Build, xem trước, review và QA từng item.
5. `v0.2.0` lên Production; hướng dẫn; đóng pilot.

## 8. Câu hỏi

Đã trả lời hết:
- Lượt 2: câu 1, 2, 4, 5 theo đề xuất.
- Lượt 5: câu 3, bản sao kéo về máy bạn, mã hóa bằng `age` ngay từ đầu để sau này chuyển sang B2 dễ (mục 2.4). Lượt 3 và 4 giải thích vì sao cần bản sao, và so cách này với B2.
- Bạn sẽ gửi ảnh giao diện cho Epic (mục 2.6), trước `/ao-spec`.

Các câu như lúc hỏi:

1. **Epic đầu:** "Danh mục sản phẩm" như mục 2.6, với 2 Story, tổng Pilot 3 khoảng 90–125 USD. Hay nhỏ hơn: một Story "admin thêm sản phẩm, khách thấy trong danh sách", khoảng 65–90 USD. Hay bạn có Epic khác cho `shop`? Mình đề xuất bản 2 Story.
2. **Làm `v0.1.0` của scaffold trước Epic,** như cách đã duyệt ở Lượt 112: mình đề xuất giữ. Nếu bỏ, Epic lên thẳng `v0.1.0`: bớt khoảng 6–12 USD và một vòng release, nhưng lỗi hạ tầng và lỗi agent dồn vào một lần, và mất lần thử nâng một database Production có dữ liệu.
3. **Chỗ để bản sao backup:** B2 (đề xuất), Google Drive, máy bạn, hay snapshot của BKNS (Lượt 1–4 của nhật ký)?
4. **Production giữ basic auth** cho tới khi bạn mở bán (mục 2.2): mình đề xuất đồng ý.
5. **Quyền tự làm cho B4:** như B3, tức làm theo đề xuất mà không dừng hỏi; chỉ dừng khi cần bạn bấm, cấp quyền, hoặc xóa thứ không hoàn tác được. Thêm: mình Ready, Approve và merge PR `shop` do phiên chính làm khi CI xanh. Gate ①–⑤ và Accept của item do agent làm vẫn là của bạn, vì Pilot 3 kiểm cả trải nghiệm của bạn ở các gate.

## Nguồn

- [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md), hàng B4 và các Lượt 112, 201.
- [tasks/archive/project-scaffold-3/verification.md](tasks/archive/project-scaffold-3/verification.md), T24 "Việc để sau"; [SPEC-project-scaffold-3.md](SPEC-project-scaffold-3.md), mục 4 và 9.
- [SPEC-project-scaffold-2.md](SPEC-project-scaffold-2.md), mục 2.5 và câu 2; [SPEC-live-run-fixes.md](SPEC-live-run-fixes.md), mục 2.1, 2.2; [SPEC-pilot-2.md](SPEC-pilot-2.md).
- [docs/getting-started.md](docs/getting-started.md), phần 5 (chi phí của `SMP-23`); [docs/vps-setup.md](docs/vps-setup.md), mục 12–15.
- Mã kit: `lib/release/cut.mjs`, `lib/release/caddy.mjs`, `lib/release/smoke.mjs`, `quality/gates.yaml` (suppressions).
- Mã `shop` tại `05b1a63`: `apps/api` (`SecurityConfig.java`, `ProductController.java`, `V3__create_products_table.sql`, `Dockerfile`), `apps/admin/src/app/routes.tsx`, `apps/admin/src/features/product`, `apps/user/src/features/product`.
- Backblaze: [B2 pricing](https://www.backblaze.com/pricing.md), [Application Key Capabilities](https://www.backblaze.com/docs/cloud-storage-application-key-capabilities), [Free Isn't Always Free](https://www.backblaze.com/blog/free-isnt-always-free-a-guide-to-free-cloud-tiers/).

# Thảo luận: AO kit với stack khác và nhiều repo

Phiên 27 · Lượt 94, 2026-11-10. Câu trả lời dựa trên mã kit ở `main` (`613c7bc`). Nhãn: **[Inference]** là suy luận từ mã nhưng chưa chạy thử, **[Ước]** là con số ước.

## Câu hỏi 1

> AO (ai-orchestrator) kit hiện tại được thiết để chỉ dùng được cho dự án Mono repo với Frontend dùng Next.js và Backend dùng Nestjs à? Nếu tôi xây nền tảng E-commerce (single repo, mỗi website ở 1 repo riêng) gồm: User-facing website (Next.js), Admin/Seller Dashboard (React.js), Backend (Java Springboot) thì cần làm lại AO kit à?

Mình hiểu "single repo, mỗi website ở 1 repo riêng" là ba repo: shop, admin và API.

## Trả lời ngắn

Không cần làm lại kit. Đến giờ kit mới chạy thử trên monorepo Next.js + NestJS, nên hai giả định đó còn nằm trong mã, ở hai mức:

1. **Gắn với JS/TS:** khoảng 6 chỗ. Sửa bằng cách đưa chúng ra cấu hình riêng của từng dự án.
2. **Một sản phẩm nằm trong một repo:** đây là giả định của hợp đồng (contract), nên sửa lớn hơn.

Phần lõi không phụ thuộc stack nên dùng được nguyên:
- luồng Jira, các gate ①–⑤ và các role agent;
- merge-gate, audit, GitHub App, hook;
- gitleaks và Semgrep (bộ `p/default` có luật cho Java);
- deployer: nó chỉ cần Dockerfile, port và đường health, nên chạy được app viết bằng ngôn ngữ nào cũng được;
- release, ship và rollback.

## Mức 1: những chỗ gắn với JS/TS

| Chỗ | Hiện tại | Spring Boot cần |
|---|---|---|
| Job `build-test` của CI (`kit/.github/workflows/ci.yml:51`) | `npm ci`, `npm run lint`, `typecheck`, `test:coverage`, `build` | Lệnh Gradle hoặc Maven, cài JDK |
| Coverage (`quality/gates.yaml:13`) | Đọc file lcov; mã nguồn là `*.ts`, `*.js` | JaCoCo, mã nguồn `*.java` |
| Kiểm dependency (`gates.yaml:18`) | `npm audit` | Một công cụ cho Maven/Gradle, ví dụ OWASP Dependency-Check |
| Dòng tắt check (`gates.yaml:26`) | Chỉ cú pháp JS/TS: `eslint-disable`, `@ts-ignore`, `.skip(` | Thêm `@SuppressWarnings`, `@Disabled`, `NOSONAR` |
| Path tăng effort security (`gates.yaml:70`) | Mẫu tên file của NestJS và Next.js | Thêm `pom.xml`, `build.gradle`, `application*.yml`, `*Controller.java`, cấu hình Spring Security |
| Role và skill (`contract/roles.yaml:21,24`) | fe-dev "Code Next.js", be-dev "Code NestJS"; chưa có skill Java | Sửa mô tả role, thêm skill Spring Boot cho be-dev |

Admin bằng React.js gần như chạy được ngay, vì vẫn dùng npm: repo chỉ cần đủ 4 npm script ở bảng trên và một Dockerfile, ví dụ nginx phục vụ file tĩnh.

Repo Java vẫn cần Node, vì `.ai-orchestrator/`, các hook và job `policy` chạy bằng Node. Việc này không gây vướng gì.

**Hướng sửa:** mỗi dự án khai một "stack profile" gồm lệnh build và test, định dạng coverage, công cụ kiểm dependency, mẫu dòng tắt check, path security và skill của từng role. [Ước] Khoảng một module cỡ vừa.

## Mức 2: một sản phẩm trải trên ba repo

Deployer đã chạy hai repo cùng lúc (`ao-pilot` và `ao-sample`), nhưng mỗi repo ở đó là một dự án độc lập, có Jira space và host riêng. Khi một sản phẩm trải trên ba repo, kit vướng sáu chỗ:

1. **PR:** một Story chạm cả API và hai web sẽ thành 3 PR ở 3 repo. Hợp đồng giả định mỗi item có tối đa một PR đang mở, và các guard như `submit` hay `deploy-to-qa` chỉ xem PR mới nhất của item.
2. **Thứ tự:** API phải merge và deploy trước web. Deployer deploy từng repo riêng và không biết repo nào phụ thuộc repo nào.
3. **Mạng:** mỗi dự án có network Docker riêng (`lib/release/docker.mjs:27`), nên web ở repo khác không gọi được `http://api:3001`. API sẽ phải có host công khai riêng, kéo theo cấu hình CORS. Trên Development và Staging, basic auth của Caddy sẽ chặn request từ origin khác. [Inference]
4. **Jira và release:** Fix Version có tên `vX.Y.0` và nằm trong một space. Nếu ba repo dùng chung một space, tên version của chúng trùng nhau. Nếu mỗi repo một space, một tính năng bị tách thành 3 item rời.
5. **QA:** E2E nằm ở repo web, nhưng cần API đúng phiên bản chạy trên cùng môi trường.
6. **Tài liệu:** SPEC và plan của một Epic nằm trong `docs/specs/<EPIC>` của một repo, nên agent làm ở hai repo kia không đọc được.

## Khuyến nghị

**Phương án A (mình khuyên dùng):** gom thành một monorepo: `apps/shop` (Next.js), `apps/admin` (React) và `apps/api` (Spring Boot).
- Việc cần làm: stack profile ở mức 1, chạy theo từng app (JS bằng npm, Java bằng Gradle).
- Thêm một thay đổi nhỏ: cho phép nhiều app công khai, mỗi app một host. Hiện luật D2 chỉ cho đúng một app công khai (`lib/release/deploy-config.mjs:38`), trong khi shop và admin đều cần ra ngoài.
- Admin vẫn gọi API qua network nội bộ, thông qua proxy của chính nó, nên không cần CORS.
- Mỗi Story vẫn chỉ có một PR, một lần review và một bản release.
- [Ước] 1 đến 1,5 module.

**Phương án B:** giữ ba repo. Ngoài mức 1, cần thêm:
- sửa hợp đồng để guard xét mọi PR của item;
- deployer biết thứ tự giữa các dự án, hoặc cho các dự án dùng chung network;
- quy ước version khi ba repo chung một space;
- release ba repo theo cùng một nhịp.

[Ước] 2 đến 3 module. Mỗi Story chạm nhiều repo cũng tốn thêm tiền agent vì phải dev và review 3 PR.

Chỉ nên chọn B khi có lý do ngoài kit, ví dụ ba team khác nhau, quyền truy cập repo khác nhau, hoặc nhịp release khác nhau.

---

# Thảo luận thêm: ba trường hợp mở rộng

Phiên 27 · Lượt 95, 2026-11-10. Tên app: `apps/user` (Next.js), `apps/admin` (React), `apps/api`.

## Câu hỏi

> Ngoài trường hợp hiện tại của ao kit (cứ xem là version 1) là một sản phẩm trên 1 repo (mono repo)
> - FE: Next.js
> - BE: Nest.js
>
> Tôi muốn AO có thể mở rộng theo các trường hợp sau:
>
> 1. Một sản phẩm trên 1 repo (mono repo):
>     - User-facing App (Next.js)
>     - Admin Dashboard (React)
>     - Backend API (Nest.js)
>
> 2. Một sản phẩm trên 1 repo (mono repo):
>     - User-facing App (Next.js)
>     - Admin Dashboard (React)
>     - Backend API (Java Springboot)
>
> 3. Một sản phẩm trên 2 repo riêng biệt:
>     - 1 repo cho Frontend là mono repo chứa User-facing App (Next.js), Admin Dashboard (React)
>     - 1 repo cho Backend (API có thể dùng Java Springboot hoặc là Nest.js hoặc là .NET)
>
> Câu hỏi:
>
> 1. Trong 3 trường hợp này, trường hợp nào là nên sửa trên AO Kit hiện tại? Trường hợp nào là nên clone ra và tạo 1 phiên bản riêng (Ví dụ đặt tên: ao-multi-repo-v1)
>
> 2. Nên làm việc mở rộng kit này trước hay trong module project-scaffold
>
> Tên app:
> apps/user (User-facing App (Next.js)), apps/admin (Admin Dashboard (React)), apps/api (Backend API)

## Mỗi trường hợp cần gì

| Trường hợp | Khác bản hiện tại ở đâu | Loại thay đổi |
|---|---|---|
| 1. `user` + `admin` + `api` NestJS | Thêm một app công khai: luật D2 của deployer chỉ cho một (`lib/release/deploy-config.mjs:38`) | Cấu hình, cộng một sửa nhỏ ở deployer và Caddy: mỗi app công khai có host riêng |
| 2. Như 1, nhưng `api` là Spring Boot | Thêm 1. Cộng một monorepo trộn npm với Gradle hoặc Maven, cùng 6 chỗ gắn JS/TS ở mức 1 phía trên | Stack profile cho từng app |
| 3. Repo FE (`user` + `admin`) và repo BE (Spring Boot, NestJS hoặc .NET) | Thêm 1 và 2. Cộng profile .NET, và một item có PR ở hai repo | Sửa hợp đồng: guard, thứ tự deploy, mạng, release |

Với trường hợp 2, cách rẻ nhất: `apps/api` có một `package.json` nhỏ, các script trong đó gọi Gradle. Như vậy job `build-test` hiện tại vẫn chạy được, và kit chỉ cần đọc thêm báo cáo coverage của JaCoCo. [Inference]

Với trường hợp 3, chỉ có hai repo nên gọn hơn phương án B ở trên:
- **Mạng:** Caddy chuyển `/api/*` trên host của `user` và `admin` sang container API của dự án BE. Web và API vẫn cùng origin, nên không cần CORS, và basic auth vẫn dùng được. [Inference]
- **Jira và version:** một Jira space cho cả sản phẩm, một Fix Version cho mỗi bản release. Cả hai repo được cắt và gắn tag cùng tên version.
- **Tài liệu:** SPEC và plan nằm ở một repo chính. Agent làm ở repo kia được cấp một bản checkout chỉ đọc của repo chính.
- **Agent:** Sub-task FE đi vào repo FE, Sub-task BE đi vào repo BE. Guard xét mọi PR của item, và repo BE merge trước.

## Câu 1: sửa kit hiện tại hay clone ra `ao-multi-repo-v1`?

**Cả ba trường hợp nên làm trong kit hiện tại. Không nên clone.**

- **Trường hợp 1 và 2** chỉ là cấu hình: profile theo app, và nhiều app công khai. Dự án đang chạy (`ao-sample`, `ao-pilot`) vẫn chạy như cũ.
- **Trường hợp 3** là phần mở rộng của hợp đồng, không phải một quy trình khác. Luồng Jira, gate, role, merge-gate, audit, Semgrep và gitleaks đều giữ nguyên. Chỗ khác duy nhất là "một item có thể có PR ở nhiều repo". Nên làm thành chế độ bật theo cấu hình, ví dụ khai danh sách repo của sản phẩm. Dự án một repo dùng mặc định và không đổi gì.

**Lý do không clone:**

1. **Sửa lỗi phải làm hai lần.** Khoảng 90% mã giống nhau [Ước]. Ví dụ, sửa điểm cắt ở PR #234 sẽ phải chép sang cả hai kit, và hai kit sẽ lệch nhau dần.
2. **Một deployer phục vụ mọi dự án.** VPS chạy một deployer cho tất cả dự án trong `/etc/ao/deployer.yaml`. Hai kit thì hoặc cần hai deployer, hoặc một deployer phải hiểu cả hai bản.
3. **Phí review tăng gấp đôi.** Tính năng kit-copy-review so bản chép với một head đã review của chính kit đó. Hai kit là hai mốc review, nên mỗi phiên bản phải trả phí review cho cả hai.

Chỉ nên clone khi trường hợp 3 cần một quy trình khác hẳn, như workflow Jira hay gate khác. Hiện không phải vậy. Nếu bạn muốn tách rủi ro lúc đang làm, dùng cờ cấu hình kèm test cho cả hai chế độ. Cách đó an toàn hơn một repo thứ hai.

## Câu 2: làm trước hay trong `project-scaffold`?

**Trường hợp 1 và 2 nên làm trong `project-scaffold`.** Đó vốn là phạm vi đã định của module này: "Profile theo stack (Next.js + NestJS trước, Spring Boot sau) và script cài/đồng bộ kit vào dự án" (`SPEC.md:94`). Profile cũng nên thiết kế cùng script cài, vì script cài là nơi dùng profile. Làm profile trước mà chưa có script cài thì dễ phải sửa lại. Sửa nhiều app công khai ở deployer là việc nhỏ, đưa luôn vào module này.

**Trường hợp 3 nên làm sau `project-scaffold`, thành một module riêng** (ví dụ `multi-repo`), kèm profile .NET. Module này sửa hợp đồng (`sdlc-contract`), deployer và release, rồi mở rộng script cài để cài vào hai repo. Nên làm sau khi cách cài một repo đã chạy ổn định.

Để không phải làm lại về sau, `project-scaffold` nên chừa sẵn chỗ cho trường hợp 3 ngay từ đầu:
- file cấu hình dự án khai danh sách repo, dù lúc đầu chỉ nhận một;
- mỗi app khai repo, đường dẫn và profile của nó.

**Thứ tự đề xuất:**
1. `project-scaffold`, gồm trường hợp 1 và 2, với tên app `user`, `admin`, `api`.
2. Một pilot cho trường hợp 2, vì Spring Boot là phần kit chưa từng chạy.
3. Module `multi-repo` cho trường hợp 3, kèm profile .NET.

[Ước] Bước 1 cỡ 1 đến 1,5 module. Bước 3 cỡ 2 module.

Tên `apps/user`, `apps/admin`, `apps/api` không vướng gì: mã kit không gắn cứng `apps/web`. Tên này chỉ xuất hiện trong ví dụ ở `templates/` và trong một comment, còn glob coverage là `apps/*`. `ao-sample` giữ nguyên `apps/web` được.

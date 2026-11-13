# SPEC: project-scaffold, phần 2 (B2)

> **Trạng thái:** bản nháp 2026-11-13 (Phiên 27 · Lượt 200), chờ bạn duyệt. Phần 1 ở [SPEC-project-scaffold.md](SPEC-project-scaffold.md); mục 4 của file đó ghi phạm vi phần 2 và 3. Nguồn: hàng B2 của [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md), Lượt 152–153 (ảnh chụp và design system), Lượt 199–200 (bố cục dự án e-commerce và bốn quyết định).

## 1. Mục tiêu

Phần 1 cài được kit cho một dự án Next.js + NestJS dùng npm, có đúng một app công khai. Dự án e-commerce của bạn (Lượt 199) cần thêm bốn điều:
- **hai app công khai, mỗi app một host:** `user` (Next.js) cho khách mua hàng, `admin` (React) cho người quản trị;
- **pnpm**, vì hai template JS của bạn dùng pnpm 11.8.0;
- **app lấy từ template của bạn**, còn hook, workflow và `.claude/` của template nhường chỗ cho kit;
- **màn hình thiết kế bằng ảnh chụp**, không cần Figma, và một design system chung cho mỗi app.

Phần 2 làm sáu việc:
1. Hỗ trợ pnpm (2.1).
2. Lệnh `ao-kit add`: thêm một app, từ khung của kit hay từ template của bạn (2.2).
3. Stack `nextjs` cho pnpm và stack mới `react` (2.3).
4. Nhiều app công khai, mỗi app một host (2.4).
5. Thiết kế bằng ảnh chụp và design system (2.5).
6. Hướng dẫn cho dự án nhiều app dựng từ template (2.6).

Xong phần 2, repo thật của e-commerce có `apps/user` và `apps/admin` lấy từ hai template của bạn. CI xanh, và cả hai app chạy trên Development, mỗi app một host. Phần 3 thêm `apps/api` bằng Spring Boot và database.

### 1.1 Quyết định đã có

Bạn trả lời "có" cho cả bốn câu ở Lượt 200:
1. Một repo cho cả e-commerce (monorepo). Kit nằm ở gốc repo, ngang hàng với `apps/`.
2. Kit hỗ trợ pnpm; template giữ pnpm.
3. Hook, workflow và `.claude/` của template bỏ đi. Hook và CI của kit chạy lint, typecheck, test cho từng app. Skill hữu ích của template thành skill theo stack.
4. Database (Postgres, migration, backup) và việc đo RAM của VPS đưa vào phần 3.

Quyền tự làm theo đề xuất mà bạn cho ở Lượt 181 áp dụng tiếp cho phần 2.

### 1.2 Giả định

Bạn sửa ngay nếu điều nào sai:
1. Repo e-commerce là `TungPH7/shop`, space Jira `SHOP`, tên trên VPS `shop` (câu hỏi 1, mục 9).
2. pnpm dùng cho dự án mới dựng bằng `ao-kit add`, và cho repo pnpm đang có. Profile `next-nest` của phần 1 và hai dự án đang chạy, `ao-sample` và `ao-pilot`, vẫn dùng npm và không phải sửa gì.
3. Kit vẫn cài package của chính nó trong `.ai-orchestrator/` bằng npm (`npm ci --prefix .ai-orchestrator`), vì đó là package của kit, không phải của dự án.
4. Phần 2 chưa có `apps/api`. Vì vậy trang kiểm sức khỏe (`health`) của app nào cũng không được gọi tới API.
5. Phần 2 không làm stack `nestjs` cho pnpm, vì e-commerce dùng Spring Boot. Hàng B2 của `concerns.md` ghi "xong phần này là có trường hợp 1" (`user`, `admin`, `api` NestJS). Mình đổi lại: trường hợp 1 với pnpm chỉ làm khi có dự án cần.

## 2. Thiết kế

### 2.1 pnpm

`project.yaml` có thêm trường `package_manager`, nhận `npm` hoặc `pnpm`. Mặc định là `npm`, nên file của các dự án đang có vẫn hợp lệ. Bản pnpm lấy từ trường `packageManager` trong `package.json` ở gốc, ví dụ `pnpm@11.8.0`. `doctor` báo chưa đạt khi pnpm trên máy khác bản đó; máy bạn hiện có pnpm 9.15.0.

Mọi chỗ kit cài package hay chạy script của dự án đều theo `package_manager`:

| Chỗ | npm (như hiện nay) | pnpm |
|---|---|---|
| Job `build-test` của CI | `npm ci`, `npm run <script>` | cài đúng bản pnpm của `packageManager`, `pnpm install --frozen-lockfile`, `pnpm run <script>` |
| Job `policy` của CI | `npm audit` | `pnpm audit` |
| `/ao-preview` và worktree của `ao-step` | `npm ci --ignore-scripts` khi `package-lock.json` khác | `pnpm install --frozen-lockfile --ignore-scripts` khi `pnpm-lock.yaml` khác |
| Lệnh `dev` trong `project.yaml` | `npm run dev -w apps/web` | `pnpm --filter ./apps/user run dev` |
| Script `prepare` cài hook của kit | chạy khi `npm install` | chạy khi `pnpm install` |
| `ao-kit init` cho repo đang có | đọc app từ `workspaces` của `package.json` | đọc app từ `packages` của `pnpm-workspace.yaml` |

`ci.yml` vẫn là một file chung cho mọi dự án. Nó nhận ra dự án dùng gì qua lockfile ở gốc: `pnpm-lock.yaml` hay `package-lock.json`. `ao-kit check` kiểm `package_manager` khớp với lockfile đó.

Dự án pnpm có một workspace ở gốc:
- `pnpm-workspace.yaml` khai `packages: [apps/*]`, cùng các cài đặt pnpm gộp từ template, như `allowBuilds` và `minimumReleaseAgeExclude`;
- một `pnpm-lock.yaml` cho cả repo;
- bốn script ở gốc `lint`, `typecheck`, `test:coverage`, `build`, mỗi script chạy `pnpm -r run <script>`, nên CI vẫn gọi đúng bốn script như hiện nay.

### 2.2 Lệnh `ao-kit add`

Dựng dự án e-commerce từ thư mục trống gồm hai bước:
- `ao-kit init <dir> --package-manager pnpm` chỉ dựng phần gốc: `package.json`, `pnpm-workspace.yaml`, `playwright.config.ts`, `e2e/`, `project.yaml` chưa có app, và kit;
- mỗi app được thêm bằng một lệnh `add`.

```
ao-kit add <dir> <app> --stack <nextjs|react> [--from <thư mục template>] [--exclude <đường dẫn>]... [--public]
```

`add` làm năm việc:
1. **Chép code app vào `apps/<app>`.**
   - Không có `--from`: chép khung app của stack (2.3).
   - Có `--from`: chép các file git đang theo dõi của template, bằng `git archive`. Như vậy không mang theo `.env` thật, `node_modules`, `.next`, `dist`, `coverage`. Thay đổi chưa commit của template không được chép, và lệnh nói vậy.
   - `--exclude` bỏ những thư mục không thuộc sản phẩm, như `study-guide-impl/` của template.
2. **Bỏ những gì kit thay thế**, in từng file đã bỏ:
   - hook và luật commit: `.husky/`, `.commitlintrc*`, `commitlint.config.*`, script `prepare: husky`, và các devDependency `husky`, `@commitlint/*`. Hook `commit-msg` của kit thay chúng;
   - `lint-staged`: config của app giữ nguyên. Script `precommit` ở gốc chạy `lint-staged`, và hook `pre-commit` của kit gọi script này;
   - CI của template: `.github/`;
   - `.claude/`, `AGENTS.md` và `CLAUDE.md`. Nội dung `CLAUDE.md` thành skill của dự án `<app>-conventions` trong `.claude/skills/`, gán cho dev agent của stack trong `roster.local.yaml`. Luật của kit thắng skill (concern 4); bạn xem lại skill này trong PR;
   - `pnpm-lock.yaml` và `pnpm-workspace.yaml` của template. Cài đặt pnpm của template gộp vào file ở gốc; chỗ nào hai template đặt khác nhau thì lệnh dừng và in ra để bạn chọn;
   - `.nvmrc` và `playwright.config.ts` của template: repo có một bản ở gốc. Thư mục `e2e/` của app giữ nguyên, và config ở gốc chạy nó (2.4).
3. **Ghi app vào cấu hình:**
   - `project.yaml`: stack, đường dẫn, lệnh `dev`, cổng lấy từ biến môi trường, `health`, `public`. `hosts` để `TODO` cho bạn điền;
   - `deploy.yaml`: Dockerfile, cổng, `health`, `public`. Nếu template chưa có Dockerfile thì lệnh chép Dockerfile của stack;
   - `roster.local.yaml`: skill theo stack.
4. **Cài:** chạy `pnpm install` ở gốc để tạo lockfile chung, rồi `ao-kit render`.
5. **Báo những gì code app còn phải đổi** để chạy với kit, nhưng không tự sửa (2.3).

Giống `init`, `add` không commit và chạy lại được. Nếu app đã có thì lệnh dừng và nói vậy.

### 2.3 Stack `nextjs` (pnpm) và `react`

Mỗi stack là một app, gồm:
- khung app ghim trong kit;
- Dockerfile;
- giá trị mặc định của app trong `project.yaml`;
- skill theo stack;
- các luật kiểm code app mà `add` dùng để báo.

| | `nextjs` | `react` |
|---|---|---|
| Khung app | `apps/web` của `next-nest`, chuyển sang pnpm | Vite + React + TypeScript, Vitest, ESLint, ghim bản |
| Chạy ở máy | `next dev`, cổng lấy từ `PORT` | `vite`, cổng lấy từ `PORT`; `/api` chuyển sang API ở máy |
| Container | Next.js standalone, chạy bằng user `node`, không phải root | File tĩnh phục vụ bằng Caddy trong container, không root, cổng 8080. `/api/*` chuyển tới app `api` trên mạng Docker của môi trường; đường dẫn lạ trả `index.html` |
| `health` | `/`, hoặc một trang không gọi API | `/` |
| Skill của `fe-dev` | `vercel-react-best-practices` | `vercel-react-best-practices` |

`add` báo những chỗ code app cần đổi:
- Next.js thiếu `output: 'standalone'`, mà Dockerfile của stack cần;
- app không đọc cổng từ biến môi trường;
- thiếu một trong bốn script `lint`, `typecheck`, `test:coverage` hay `build`. `test:coverage` phải ghi lcov vào `apps/<app>/coverage/`;
- **biến nhúng lúc build:** `.env.example` có `NEXT_PUBLIC_*` hay `VITE_*`. Deployer build một image cho mỗi commit rồi chạy image đó ở cả ba môi trường, nên các biến này mang cùng một giá trị ở mọi môi trường. Cách đổi:
  - URL của API dùng đường dẫn tương đối `/api`;
  - URL công khai của chính app thì đọc lúc chạy, từ `AO_PUBLIC_URL` mà deployer đặt;
  - giá trị nào còn lại thì đặt trong Dockerfile, như `next-nest` đặt `API_URL=http://api:3001`.

  Ở template của bạn, có ba biến như vậy: `VITE_API_URL`, `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_SITE_URL`.

Các sửa này là việc của dự án. Chúng đi qua một Task và một PR như mọi thay đổi khác, nên được review đầy đủ.

`profiles:check` dựng thêm hai khung mới, rồi chạy `pnpm install` và bốn script của chúng.

### 2.4 Nhiều app công khai, mỗi app một host

**Hiện nay:**
- luật D2 của `deploy.yaml` đòi đúng một app công khai;
- `deployer.yaml` trên VPS khai một host cho mỗi môi trường của dự án;
- Caddy chuyển host đó tới app công khai.

**Thay đổi:**
- **D2** thành: có ít nhất một app công khai.
- **`deployer.yaml` trên VPS** nhận thêm dạng host theo từng app:
  ```yaml
  hosts:
    user:  { development: shop-dev.<domain>, staging: shop-staging.<domain>, production: shop.<domain> }
    admin: { development: shop-admin-dev.<domain>, staging: shop-admin-staging.<domain>, production: shop-admin.<domain> }
  ```
  - Dạng cũ, một host cho mỗi môi trường, vẫn đúng: đó là host của app công khai duy nhất. `ao-sample` và `ao-pilot` không phải sửa gì.
  - Host vẫn chỉ khai trên VPS. Repo không tự chọn host được, nên một dự án không chiếm được host của dự án khác.
- **Deployer:**
  - mỗi app công khai trong `deploy.yaml` của commit phải có host trong `deployer.yaml`. Thiếu thì deployer không deploy, giữ bản đang chạy, và ghi lý do lên deployment;
  - `AO_PUBLIC_URL` của mỗi app là URL của host của chính app đó;
  - smoke test gọi mỗi app công khai bằng host của nó.
- **Caddy:**
  - một site cho mỗi host, tức mỗi tổ hợp dự án, môi trường và app công khai;
  - Development và Staging vẫn hỏi basic auth như hiện nay, dùng chung một tài khoản.
- **Bản ghi của deployer:** `current.public` thành danh sách app. Bản ghi cũ, với một app, vẫn đọc được.
- **Deployment trên GitHub:** `environment_url` là URL của app công khai đầu tiên trong `deploy.yaml`.
- **`project.yaml`:**
  - mỗi app công khai khai `hosts` cho ba môi trường;
  - `ao-kit check` kiểm app công khai nào cũng có `hosts`, và không host nào trùng;
  - `doctor` in đoạn `deployer.yaml` với đúng các host đó, để chép lên VPS.
- **`/ao-qa` và regression của `/ao-release`:**
  - `qa` nhận `E2E_BASE_URL` như hiện nay, và thêm `E2E_<APP>_URL` cho từng app công khai, lấy từ `hosts` của `project.yaml`;
  - `ao-step` dừng khi host của `environment_url` không khớp app nào trong `project.yaml`, vì như vậy là hai file đang lệch nhau;
  - `playwright.config.ts` ở gốc đọc app từ `project.yaml`: mỗi app công khai là một project của Playwright, chạy `e2e/` của app đó, với basic auth chỉ gửi tới đúng origin của app.
- **`/ao-status`:** dòng của mỗi môi trường in URL của mọi app công khai.

Đổi deployer trên VPS tức là cập nhật bản kit trên VPS. Mình hỏi bạn trước khi làm (câu hỏi 3).

### 2.5 Thiết kế bằng ảnh chụp và design system

Lượt 152 thấy hai chỗ vướng:
- luật D7 của `check-design` bắt mọi màn hình có ảnh phải có link Figma;
- kit chưa có bước dựng design system.

**Màn hình kiểu Ảnh.**
- `design.md` có ba kiểu màn hình: ASCII, Figma, và Ảnh, gồm ảnh chụp hay mockup vẽ bằng công cụ khác.
- Bạn chép ảnh vào `.ai/design-inbox/<EPIC>/`, như với ảnh Figma hiện nay.
- `ux` đổi tên ảnh theo màn hình và chuyển vào `docs/specs/<EPIC>/design/`. Trong YAML của màn hình, `ux` ghi `screenshot: <ảnh lấy từ đâu>` thay cho `figma:`.

**Luật D7 sửa thành:**
- màn hình có ảnh khai đúng một trong hai: `figma` hoặc `screenshot`;
- `figma` vẫn phải là link có `node-id`;
- dòng `Figma version:` chỉ bắt buộc khi có màn hình Figma.

Giới hạn ảnh của D8 giữ nguyên: PNG hay JPEG, tối đa 1 MB, cạnh dài tối đa 2.000 px. Ảnh chụp bằng điện thoại thường vượt giới hạn này, nên hướng dẫn chỉ cách thu nhỏ bằng Paint. `ux` vẫn không tự sửa ảnh.

**Mục Design System trong `design.md`.** Epic có màn hình Figma hay Ảnh thì `ux` thêm mục này, rút từ ảnh:
- token: màu (mã hex và vai trò), font, cỡ chữ, độ đậm, khoảng cách, bo góc, bóng, điểm ngắt màn hình;
- component lặp lại, như nút, ô nhập, thẻ, cùng các trạng thái của chúng;
- mỗi mục ghi "đã có" nếu `docs/design-system/<app>.md` đã có nó, hoặc "mới".

Giá trị đọc từ ảnh là ước lượng; chỗ nào ảnh không rõ thì `ux` ghi vào Open Questions. `check-design` thêm luật D9: có màn hình Figma hay Ảnh thì phải có mục Design System.

**Task dựng design system.** Ở `/ao-plan`, nếu app chưa có `docs/design-system/<app>.md`, hoặc mục Design System có mục "mới", thì `sa` thêm một Task `fe-dev` "Design system của <app>" ở đầu Task List. Việc này theo luật sẵn có của template plan: việc nền chung là Task riêng, đi trước. Task này:
- đưa token vào code, như biến CSS hay theme, theo stack và quy ước của app;
- dựng component dùng chung, đủ các trạng thái;
- viết hoặc cập nhật `docs/design-system/<app>.md`, làm nguồn để các Epic sau đối chiếu.

Các Story giao diện của Epic làm sau Task này.

**`fe-dev`** dựng màn hình Ảnh như màn hình Figma: theo ảnh đã duyệt và design system của app.

**`qa`** so trang với ảnh như với ảnh Figma, bằng mắt; kit không so ảnh tự động.

### 2.6 Hướng dẫn

`docs/getting-started.md` thêm phần "Dự án nhiều app, dựng từ template của bạn", đi theo ví dụ thật là repo `shop`:
1. Bố cục thư mục: thư mục dự án nằm ngoài git, repo nằm bên trong, kit ở gốc repo, và `misc/` riêng của bạn ở ngoài git (Lượt 199).
2. `ao-kit init --package-manager pnpm`, rồi `ao-kit add user --stack nextjs --from <template Next.js>` và `ao-kit add admin --stack react --from <template React>`.
3. Những gì `add` bỏ đi và vì sao; những chỗ code app phải sửa, như biến nhúng lúc build.
4. Host, bản ghi DNS và `deployer.yaml` cho hai app công khai.
5. `setup github`, `setup jira`, `doctor`, CI xanh, rồi Development chạy với hai host.

Phần 5 của hướng dẫn (một tính năng lớn) thêm đoạn dùng ảnh chụp và Task design system. Bảng tra lệnh thêm `ao-kit add`.

## 3. Lệnh

```
node <kit>/scripts/ao-kit.mjs init <dir> --package-manager pnpm
node <kit>/scripts/ao-kit.mjs add <dir> <app> --stack <nextjs|react> [--from <dir>] [--exclude <path>]... [--public]
```

Các lệnh khác của `ao-kit` và các lệnh `/ao-*` giữ nguyên tên. Chúng chạy theo `package_manager`, và theo các app công khai của dự án.

## 4. Ngoài phạm vi

- pnpm cho profile `next-nest` và cho các dự án npm đang chạy.
- Stack `nestjs` dùng pnpm (giả định 5).
- API Spring Boot, database, trần RAM cho container: phần 3.
- Staging và Production của `shop` trên VPS: chờ phần 3 đo RAM.
- So ảnh tự động.

## 5. Cấu trúc

```text
profiles/stacks/nextjs/          stack.yaml, files/ (khung app, Dockerfile)
profiles/stacks/react/           stack.yaml, files/ (khung app, Dockerfile, Caddyfile của container)
profiles/base-pnpm/              phần gốc của dự án pnpm: package.json, pnpm-workspace.yaml, playwright.config.ts, e2e/
lib/scaffold/add.mjs             ao-kit add
lib/scaffold/template.mjs        chép template, bỏ phần kit thay thế, gộp cài đặt pnpm, CLAUDE.md thành skill
lib/scaffold/app-report.mjs      những chỗ code app còn phải đổi
lib/quality/package-manager.mjs  npm hay pnpm: lệnh cài, lệnh chạy, lockfile, chạy không qua shell
lib/release/                     deploy-config (D2), deployer-config và deployer.schema.json (host theo app),
                                 caddy, docker, deployer, record (nhiều app công khai)
lib/quality/design.mjs           D7 mới, D9
lib/workflow/                    preview, steps, prompts, facts: pnpm, E2E_<APP>_URL, URL trong /ao-status
templates/design.md; agents/prompts/ux.md, sa.md, fe-dev.md, qa.md
kit/.github/workflows/ci.yml     pnpm
docs/getting-started.md, docs/vps-setup.md, docs/release-workflow.md
tests/                           test của từng phần trên
```

## 6. Chiến lược test

`node:test`, theo mẫu của các module trước: hàm thuần, effect truyền vào.
- **`package-manager`:** lệnh đúng cho từng loại; trên Windows, chạy pnpm mà không qua shell.
- **`add`:**
  - chạy trên thư mục tạm thật, với hai template giả có husky, commitlint, `.github/`, `.claude/`, `CLAUDE.md`, và lockfile riêng;
  - file bị bỏ đúng danh sách; cài đặt pnpm gộp đúng, và hai template đặt khác nhau thì dừng;
  - `project.yaml`, `deploy.yaml`, `roster.local.yaml` có app mới;
  - chạy lại thì không đổi gì.
- **Deploy:**
  - D2 mới; `deployer.yaml` ở cả hai dạng;
  - Caddyfile của một dự án có một app công khai giống hệt bản cũ, như `ao-sample` và `ao-pilot`;
  - hai app công khai ra hai site; thiếu host thì không deploy;
  - bản ghi cũ vẫn đọc được.
- **QA:** có biến `E2E_<APP>_URL`; dừng khi host lệch.
- **`check-design`:** fixture âm cho D7 mới và cho D9; ví dụ trong template qua.
- **CI:** `build-test` với một dự án pnpm, chạy bằng bash như test hiện có của `ci.yml`.
- **`profiles:check`:** hai stack mới.

## 7. Tiêu chí hoàn thành

1. Năm lệnh kiểm của kit xanh, cùng `profiles:check`.
2. **Repo `shop` thật**, dựng đúng theo phần mới của hướng dẫn, từ hai template của bạn, tới khi `doctor` báo mọi dòng đạt và CI xanh trên `develop`.
3. **Các sửa code app mà `add` báo** đi qua một Task và một PR, và `/ao-preview` chạy được hai app của PR đó trên máy bạn bằng pnpm.
4. **Development chạy hai app công khai:** `user` và `admin`, mỗi app một host, có basic auth, smoke test đạt. Caddyfile của `ao-sample` và `ao-pilot` không đổi, và hai dự án đó vẫn chạy.
5. Hướng dẫn có phần mới, với số liệu và đầu ra thật.
6. Kit merge vào `main` qua PR, CI xanh.

Phần 2 không gọi agent trả tiền. Phần ảnh chụp và design system được kiểm thật lần đầu ở Epic đầu tiên của B4 (câu hỏi 2).

## 8. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Trên Windows, pnpm là `pnpm.cmd`, mà Node không chạy được nếu không qua shell | Tìm file JS của pnpm, như `npm.mjs` tìm `npm-cli.js`. Không tìm thấy thì dừng và nói cách cài |
| pnpm 11 chặn script cài của dependency, và `minimumReleaseAge` có thể chặn việc cài | Gộp `allowBuilds` và `minimumReleaseAgeExclude` của template vào file ở gốc; CI dùng cùng file đó |
| Lockfile tạo lại ở gốc có thể kéo bản khác cho dependency gián tiếp | Dependency trực tiếp của template đã ghim bản cụ thể; CI và `/ao-preview` bắt chỗ hỏng trước khi merge |
| Cập nhật deployer làm hỏng `ao-sample`, `ao-pilot` | Giữ dạng cũ của `deployer.yaml` và bản ghi; test so Caddyfile; chạy `--dry-run` trên VPS trước khi bật |
| VPS thiếu RAM | Chỉ thêm Development của `shop`, gồm một Next.js và một container file tĩnh; đo RAM trước và sau |
| `admin` trên Production không có basic auth, chỉ dựa vào đăng nhập của chính app | Phần 2 chỉ deploy Development. Trước lần release đầu của `shop`, `admin` phải có đăng nhập; nếu chưa có thì thêm basic auth cho app đó ở Production, một sửa nhỏ ở deployer |
| Template của bạn đổi sau khi đã chép | `add` chép một lần; về sau sửa thẳng trong repo `shop` |

## 9. Câu hỏi

1. **Repo e-commerce:** `TungPH7/shop`, space `SHOP`, tên trên VPS `shop`. Repo private hay public?
   - Mình đề xuất **private**, vì đây là sản phẩm thật. Repo kit và hai repo thử đã public, nên 2.000 phút miễn phí mỗi tháng chỉ còn `shop` dùng.
   - Mỗi Story tốn khoảng 60–80 phút CI [Ước], tức khoảng 25 Story mỗi tháng.
   - Nếu hết phút, đổi sang public vẫn được, nhưng lịch sử repo khi đó cũng công khai theo.
2. **Kiểm thật ảnh chụp và design system:** mình đề xuất **để tới Epic đầu của B4**. Epic đó vẫn phải chạy `/ao-spec` và `/ao-plan`, nên phần 2 tốn 0 USD agent. Như vậy Epic đầu cần có ảnh chụp màn hình. Cách khác là chạy một Epic nhỏ ngay ở phần 2, khoảng 10–15 USD [Ước].
3. **VPS:** mình đề xuất làm cả bốn việc dưới đây; mỗi việc mình vẫn hỏi lại bạn ngay trước khi làm.
   - Cập nhật kit trên VPS với deployer mới, chạy `--dry-run` trước.
   - Chỉ thêm môi trường Development của `shop`.
   - Đo RAM trước và sau, bằng lệnh chỉ đọc.
   - Bạn thêm bản ghi DNS cho hai host mới, nếu domain chưa có bản ghi wildcard. Mình đề xuất dùng chung domain với `ao-sample`.
4. **Chép template:** mình đề xuất:
   - bỏ `study-guide-impl/`, `frontend-technical/` và `docs/readme/`, vì đó là tài liệu học, không thuộc sản phẩm;
   - giữ `docs/coding-conventions/`, vì skill `<app>-conventions` trỏ tới đó;
   - `CLAUDE.md` của template thành skill như ở 2.2.

## Nguồn

- [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md), hàng B2–B4; [misc/thao-luan/kit-voi-stack-khac-va-nhieu-repo.md](misc/thao-luan/kit-voi-stack-khac-va-nhieu-repo.md).
- [SPEC-project-scaffold.md](SPEC-project-scaffold.md), mục 2.1 (`host` để B2 dùng) và mục 4.
- [tasks/archive/project-scaffold-1/verification.md](tasks/archive/project-scaffold-1/verification.md): T16, T17 và việc còn lại.
- Mã kit: `lib/release/deploy-config.mjs` (D2), `lib/release/caddy.mjs`, `lib/release/docker.mjs`, `lib/release/deployer.mjs`, `lib/quality/design.mjs` (D7), `kit/.github/workflows/ci.yml`, `lib/workflow/preview-run.mjs`.
- Hai template của bạn: `nextjs/00-tungph7-codebase1-ui-nextjs16` và `reactjs/00-tungph7-codebase1-ui-reactjs`.
- Phiên 27 · Lượt 152, 153, 199, 200, [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md).

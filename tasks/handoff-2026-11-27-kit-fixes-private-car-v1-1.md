# Handoff 2026-11-27: hai bản sửa còn nằm ở dự án mà kit chưa có (từ lần dựng private-car-v1-1)

Người giao: phiên chính dựng `my-pro/private-car-v1-1` (Jira space PCV11). Người nhận: agent của repo kit này.
Con người đã duyệt: **làm ngay**, và với `E2E_API_MOCKING` thì chọn **cách 1: khoá `e2e_env` cho từng app trong
`project.yaml`**. Không chép gì vào `shop` (lý do ở mục 6).

## 1. Bối cảnh

- Lần dựng private-car-v1-1 dùng ba template: web `nextjs/00-tungph7-codebase1-ui-nextjs16` (nhánh `write-cv`), admin
  `reactjs/00-tungph7-codebase1-ui-reactjs` (`write-cv`), api `java/tungph7-learnPostgresql-api-java` (`codebase`).
  Task đầu tiên PCV11-1 sửa code template cho khớp kit (merge `4646151`). Bug PCV11-3 sửa E2E trên Development
  (merge `2036804`).
- Sau đó mỗi template có một nhánh **`ao-kit`**, đã push lên GitHub, để dự án mới dùng `ao-kit add … --ref ao-kit`
  và không phải làm lại PCV11-1: web `4a88ca8`, admin `f6cffc1`, api `250bae3`. Đã chạy `appReport` của kit trên ba
  nhánh đó: số mục "Code to change" giảm từ 3, 4, 5 xuống 1, 0, 1.
- Có hai bản sửa nằm trong **file do kit viết ra**, không phải file của template. Vì vậy nhánh `ao-kit` không mang
  được chúng, và dự án mới nào cũng gặp lại hai lỗi này cho tới khi kit sửa:
  1. `profiles/stacks/react/files/Caddyfile` thiếu `trusted_proxies`.
  2. `profiles/base-pnpm/files/playwright.config.ts` không cho app web cờ `E2E_API_MOCKING=1`. Bước `add` bỏ
     `playwright.config.*` của template (`LEFT_OUT` trong `lib/scaffold/template.mjs`), nên env E2E của template mất
     theo.

## 2. Lỗi 1: Caddyfile của stack react thiếu `trusted_proxies`

**Triệu chứng:** trên Development, mọi POST, PUT, DELETE từ admin bị api trả 403 "Invalid CORS request". GET vẫn
chạy bình thường, nên unit test và E2E dùng mock không thấy lỗi.

**Nguyên nhân:** Caddy trong container admin không tin Caddy của VPS đứng trước nó, nên ghi đè `X-Forwarded-Proto`
thành `http`. Api đọc các header X-Forwarded-* (`server.forward-headers-strategy: native`), nên thấy
`http://<admin host>`, trong khi trình duyệt gửi `Origin: https://<admin host>`. Kết quả: yêu cầu bị coi là
cross-origin từ một origin không có trong danh sách CORS.

**Lịch sử: lỗi lặp lại ba lần, lần nào cũng chỉ sửa trong dự án:**

| Ngày | Ở đâu | Chuyện gì |
|---|---|---|
| 13/11 | kit `7f92d92` (#263) | `profiles/stacks/react/files/Caddyfile` được tạo không có `trusted_proxies`. File chưa đổi lần nào từ đó |
| 16/11 | shop SHOP-56, `9dc3584` | Sửa trong `apps/admin/Caddyfile` của shop. SHOP-57 thêm job CI `caddy-proxy` (`.github/workflows/ci.project.yml`, script `apps/admin/scripts/check-caddy-proxy.mjs`). Kit chỉ nhắc SHOP-56 trong `docs/getting-started.md` (bước 8) như một ví dụ "QA tìm ra lỗi" |
| 24/11 | du-an-1 | `apps/admin/Caddyfile` không có `trusted_proxies` (dự án đã dọn khỏi VPS) |
| 26/11 | private-car-v1 PCAR-6, `d23a0a0` | Sửa lại trong dự án |
| 27/11 | private-car-v1-1 PCV11-1 | Đưa sẵn vào dự án. Đã kiểm như trình duyệt: POST cùng Origin được 400 (validation), POST Origin lạ bị 403 |

**Cần làm:**
- Thêm vào khối global options của `profiles/stacks/react/files/Caddyfile`:

  ```caddyfile
  {
  	admin off
  	auto_https off
  	persist_config off
  	# Trust the X-Forwarded-* headers of the proxy in front, Caddy of the VPS, which reaches this container from a
  	# private address (SHOP-56, PCAR-6). Without it, Caddy here writes its own X-Forwarded-Proto, http, so the api,
  	# which reads the X-Forwarded-* headers (server.forward-headers-strategy native), sees http://<admin host> while
  	# the browser sends Origin https://<admin host> with every POST, PUT and DELETE: refused with 403 "Invalid CORS
  	# request". With it, the api sees the scheme and host the browser used, and the request is same-origin.
  	servers {
  		trusted_proxies static private_ranges
  	}
  }
  ```

  Bản đầy đủ, đã chạy trên Development, nằm ở `my-pro/private-car-v1-1/apps/admin/Caddyfile`, dòng 5 đến 21.
- Thêm một test vào `tests/scaffold/profile.test.mjs` (hoặc test của các stack): Caddyfile của stack react có
  `trusted_proxies static private_ranges` trong khối global options.
- **Không làm trong PR này:** đưa job `caddy-proxy` của SHOP-57 vào CI của kit (chạy Caddy trong Docker). Ghi nó
  thành một mục trong `tasks/todo.md` cho PR sau.

## 3. Lỗi 2: E2E của web cần `E2E_API_MOCKING=1`, nhưng kit không cho (cách 1: `e2e_env`)

**Triệu chứng (PCV11-3):** 7 test E2E của web (products, auth, một test accessibility) cần backend giả MSW chạy
trong process Next. Backend này chỉ bật khi có `E2E_API_MOCKING=1` (xem `apps/web/src/instrumentation.ts` của
template). `playwright.config.ts` riêng của template có đặt cờ này. Nhưng `add` bỏ file đó, còn
`playwright.config.ts` ở gốc dự án chỉ truyền `env` trong `project.yaml` cùng port.

Không đặt cờ vào `env` của app trong `project.yaml` được: `/ao-preview` và các lane cũng dùng `env` đó, nên app chạy
preview sẽ nạp mock.

**PCV11-3 đã sửa tạm trong dự án:** tag 7 test là `@local`, và ghi cứng `E2E_API_MOCKING: '1'` vào env của mọi
webServer trong `playwright.config.ts` ở gốc (private-car-v1-1, `2036804`). Tag `@local` đã có trong nhánh `ao-kit`
của template web. Phần env thì phải do kit lo.

**Cần làm (cách 1, đã duyệt):**
1. **Schema** `lib/scaffold/project.schema.json`: thêm khoá tuỳ chọn `apps.<app>.e2e_env`, kiểu object, mỗi khoá đặt
   tên theo `^[A-Z_][A-Z0-9_]*$`, mỗi giá trị là string. Description ghi rõ: chỉ dùng cho các server Playwright tự
   bật để chạy E2E; không dùng cho `/ao-preview`, lane hay deploy.
2. **`profiles/base-pnpm/files/playwright.config.ts`:**
   - Thêm `e2e_env?: Record<string, string>` vào `type App`.
   - Env của webServer là `{ ...env (đã shift), ...e2e_env (shift như env), [port.env]: port }`.
   - Comment ghi lý do: preview và lane không được nạp mock.
3. **`ao-kit add`** (`lib/scaffold/add.mjs` / `template.mjs`): khi chép một template có `playwright.config.*` (file
   bị bỏ qua), đọc env trong khối webServer của nó. Bỏ qua port và `NEXT_TELEMETRY_DISABLED`. Nếu có
   `E2E_API_MOCKING` (hay một biến tương tự), ghi vào `e2e_env` của app trong `project.yaml` và báo trong notes. Biến
   nào chưa chắc thì đưa vào add-report để người quyết, thay vì đoán. Tối thiểu: template web ở trên phải ra
   `e2e_env: { E2E_API_MOCKING: '1' }` mà không cần ai sửa tay.
4. **Không chỗ nào khác đọc `e2e_env`.** Kiểm `lib/workflow/preview.mjs`, `preview-run.mjs`, `ports.mjs`,
   `lib/scaffold/install.mjs` và `lib/release/deploy-config.mjs`, `docker.mjs`. Thêm một test cho thấy env của
   preview không có `e2e_env`.
5. **`ao-kit check`:** báo lỗi khi `e2e_env` sai kiểu (đi qua schema).
6. **Tài liệu:** thêm `e2e_env` vào chỗ docs đang tả các khoá của `project.yaml` (`docs/setup-steps.md`,
   `docs/getting-started.md`, `docs/quality-gates.md` là những chỗ nhắc `coverage_exclude`).

## 4. Tài liệu setup: đề xuất nhánh `ao-kit`

`ao-kit-setup.md`, bước hỏi Stack (khoảng dòng 46 đến 49), hiện đề xuất nhánh đang checkout của template. Đổi
thành: template nào có nhánh `ao-kit` thì đề xuất `--ref ao-kit`. Ghi kèm những việc vẫn phải làm cho từng dự án:

- đặt `PRODUCTION_ORIGIN` trong `apps/web/src/config/env/client.ts` (template web để `https://example.com`) bằng host
  Production của web;
- ghi tay `env:` và `database:` của api trong `deploy.yaml`, cùng `coverage_exclude` trong `project.yaml`, như
  add-report đã nói.

Nhắc thêm: khi nhánh gốc của template tiến lên (`write-cv`, `codebase`), nhánh `ao-kit` phải rebase hoặc merge lại.

## 5. Kiểm trước khi mở PR

- `npm test` của kit xanh, gồm các test mới ở mục 2 và 3.
- **Dry run** trong một thư mục tạm:
  1. `ao-kit init <dir> --package-manager pnpm --name ao-kit-dry --title "dry" --space DRY --repo TungPH7/ao-kit-dry --approvers TungPH7`,
     rồi `pnpm install` (init dặn bước này).
  2. `ao-kit add` web, admin, api với `--from <template> --ref ao-kit` và các `--exclude` như
     `my-pro/private-car-v1-1/.ai/setup/answers.md` (web: `study-guide-impl/`, `frontend-technical/`, `docs/readme/`,
     `docs/coding-convention-prompt.md`; admin: `study-guide-impl/`, `docs/readme/`,
     `docs/coding-convention-prompt.md`; api: `study-guide-impl/`, `prompt.md`).
  3. Kiểm:
     - `apps/admin/Caddyfile` có `trusted_proxies`;
     - `project.yaml` có `e2e_env` của web;
     - add-report của web chỉ còn một ghi chú `NEXT_PUBLIC_SITE_URL`, admin không còn mục nào, api chỉ còn phần "By
       hand".
  4. Nếu kịp: chạy các test `@local` của web bằng `playwright.config.ts` ở gốc, cả 7 test phải pass.
- **Cần kiểm thêm, chưa rõ:** dry run của phiên giao dừng ở bước render của `add`: `render-agents.mjs` báo
  `Cannot find package 'ajv'` (từ `.ai-orchestrator/lib/agents/roster.mjs`). Lúc đó phiên giao chưa chạy
  `pnpm install` sau `init`, nên có thể chỉ do bỏ sót bước. Nhưng `add` có tự chạy `pnpm install` trước render mà
  render vẫn hỏng, nên nên xem lại `.ai-orchestrator/node_modules` có được cài trong một dự án pnpm hay không.
- Commit theo `CLAUDE.md` của repo: `type(scope): subject`, không body, không Co-Authored-By. Làm trên một nhánh mới
  từ `origin/main` (`b56f105`). Bản checkout hiện ở nhánh `docs/phien-37-cleanup`, có thể là việc của một phiên
  khác: đừng làm xáo trộn nó.

## 6. Không chép vào shop, và các dự án khác

- `ao-kit sync` chỉ chép `.ai-orchestrator/` (agents, contract, lib, quality, templates, tracker, scripts),
  `.claude/hooks`, `.githooks`, skills và các workflow của kit (`ROOT_FILES` trong `lib/scaffold/install.mjs`). Nó
  không đụng `apps/*/Caddyfile` hay `playwright.config.ts` ở gốc, nên có sync thì shop cũng không nhận hai bản sửa
  này.
- Shop không cần chúng:
  - admin của shop đã có `trusted_proxies` (SHOP-56) cùng job `caddy-proxy` (SHOP-57);
  - test MSW của shop tự bỏ qua bằng `test.skip` khi không có `E2E_API_MOCKING=1`, và Epic login sẽ thay chúng.
  
  Phần sửa trong `lib/` (schema) tới shop ở lần chép kit định kỳ tiếp theo (như SHOP-99, 100, 101), và vô hại, vì
  `playwright.config.ts` của shop không đọc `e2e_env`.
- private-car-v1 đã có `trusted_proxies` (PCAR-6). private-car-v1-1 có cả hai bản sửa (cờ E2E đang ghi cứng: có thể
  chuyển sang `e2e_env` sau, bằng một Task riêng của dự án đó). du-an-1 đã dọn khỏi VPS.

## 7. Các phát hiện khác về kit trong lần dựng này (ghi vào `tasks/todo.md`, chưa sửa trong PR này)

1. `/ao-status` không kèm key thì dừng với "takes a Jira key … not C:/Program Files/Git/usr/bin/bash": tham số rỗng
   bị Git Bash đổi thành đường dẫn của nó.
2. `/ao-preview` từ chối item do phiên chính làm khi lanes đang bật.
3. pnpm 11, `minimumReleaseAge`: cài một bản còn trong thời gian chờ (vite 8.4.0) thì pnpm tự thêm
   `minimumReleaseAgeExclude` vào `pnpm-workspace.yaml`, một đường dẫn được bảo vệ. Agent phải revert và giữ vite 8.3.8.
4. Lượt qa của PCV11-3 để lại container `private-car-v1-1-postgres-s1` vẫn chạy (compose project
   `private-car-v1-1-s1`, workdir `%TEMP%/ao-reviews/private-car-v1-1-PCV11-3-qa/apps/api`), dù thư mục đã bị xoá.
   Lúc dọn lane của qa nên chạy `docker compose down` (giữ volume).
5. qa của PCV11-1 để lộ basic auth của Development trong output: curl in URL có dạng `user:password@`. Phiên chính đã
   xoá ở `.ai/runs/PCV11-1/1-qa.jsonl` và trong transcript; không có gì lên Jira. Nên có luật hay hook chặn credential
   nằm trong URL.
6. Mức của item: nhãn `ao-level-light` mà phiên chính gắn sau (qua tài khoản của agent) không được tính, đúng như
   thiết kế ở `lib/workflow/levels.mjs`. Nhưng một Bug do qa tạo thì không có `/ao-intake` để đặt mức lúc tạo.
   `ao-step build` nên báo điều này ngay lúc build, thay vì để tới lúc qa mới thấy.
7. Đề xuất: một lệnh cho phiên chính làm Refine, Accept hay Cancel bằng token của người, khi người đã cho phép trong
   phiên. Hiện jira-guard (`lib/tracker/guard.mjs` dòng 17) từ chối mọi transition không có `agent_type`.
8. Ghi chú `NEXT_PUBLIC_SITE_URL` của `appReport` (`lib/scaffold/app-report.mjs`) vẫn bảo "gọi `/api`, đọc
   `AO_PUBLIC_URL`", kể cả khi template đã có `PRODUCTION_ORIGIN`. Khi thấy hằng này, ghi chú nên đổi thành "đặt
   `PRODUCTION_ORIGIN` bằng host production của web trong `hosts` của `project.yaml`".
9. `kitFilesByHand` (`lib/scaffold/add.mjs`) chỉ nhắc `SPRING_PROFILES_ACTIVE` trong `env:` của `deploy.yaml` khi
   Dockerfile có `ENV SPRING_PROFILES_ACTIVE`. Nhánh `ao-kit` của api đã bỏ dòng đó: profile do file secrets của từng
   môi trường chọn, và là `dev` khi không đặt. Vì vậy add-report không nhắc nữa, dù dự án vẫn cần biến này. Nên nhắc
   khi `application.yml` có profile, hay luôn nhắc với một app Spring Boot.
10. Với app nextjs và react, add-report không nhắc ghi `coverage_exclude` trong `project.yaml` từ `coverage.exclude`
    của `vitest.config.ts`. Với JaCoCo của Spring Boot thì có nhắc. private-car-v1-1 phải chép tay vào commit đầu.

## 8. Tham chiếu

- private-car-v1-1:
  - `D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\my-pro\private-car-v1-1`;
  - `.ai/setup/progress.md` (nhật ký từng bước), `.ai/setup/add-report.md`, `.ai/setup/answers.md`;
  - commit `4646151` (PCV11-1), `2036804` (PCV11-3).
- Worktree của các nhánh `ao-kit`, đặt cạnh mỗi template:
  - `D:\Document\1Khoahoc\4LapTrinh\nextjs\00-tungph7-codebase1-ui-nextjs16.ao-kit`
  - `D:\Document\1Khoahoc\4LapTrinh\reactjs\00-tungph7-codebase1-ui-reactjs.ao-kit`
  - `D:\Document\1Khoahoc\4LapTrinh\java\tungph7-learnPostgresql-api-java.ao-kit`
- shop:
  - `D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\e-commerce\shop`;
  - `9dc3584` (SHOP-56);
  - `.github/workflows/ci.project.yml`, job `caddy-proxy` (SHOP-57);
  - `apps/admin/scripts/check-caddy-proxy.mjs`.
- private-car-v1: `D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\my-pro\private-car-v1`, `d23a0a0` (PCAR-6).
- File của kit nói tới ở trên:
  - `profiles/stacks/react/files/Caddyfile`
  - `profiles/base-pnpm/files/playwright.config.ts`
  - `lib/scaffold/project.schema.json`
  - `lib/scaffold/add.mjs`, `lib/scaffold/template.mjs`, `lib/scaffold/app-report.mjs`, `lib/scaffold/install.mjs`
  - `lib/workflow/preview.mjs`, `lib/workflow/ports.mjs`
  - `tests/scaffold/profile.test.mjs`, `tests/scaffold/add.test.mjs`
  - `ao-kit-setup.md`

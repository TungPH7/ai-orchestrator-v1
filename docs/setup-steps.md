# Các bước setup, với thư mục `du-an-1`

> Spec: [SPEC-guided-setup.md](../SPEC-guided-setup.md). Tài liệu cho dev: setup đi qua những bước nào, và thư mục dự án có gì sau mỗi bước. Agent chính làm theo [ao-kit-setup.md](../ao-kit-setup.md); bạn chỉ cần [quick-start.md](quick-start.md) để bắt đầu. Lệnh, đầu ra thật và lỗi đã gặp: [getting-started.md](getting-started.md) phần 3 và phần 5.

Ví dụ: thư mục `D:/work/du-an-1`, repo `TungPH7/du-an-1`, space Jira `DA1`.

Câu đầu tiên agent hỏi ở bước 1 là stack. Câu trả lời chọn một trong hai phần dưới đây. Cả hai đều bắt đầu từ thư mục trống (greenfield).

| Bạn chọn | Đi theo | Ví dụ |
|---|---|---|
| Khung `next-nest` có sẵn của kit | [Phần 3](#phần-3-khung-next-nest-của-kit) | `apps/web` (Next.js), `apps/api` (NestJS) |
| App từ template của bạn trên máy | [Phần 5](#phần-5-app-từ-template-của-bạn) | `apps/web` (Next.js), `apps/admin` (React), `apps/api` (Spring Boot) |

## Phần 3. Khung `next-nest` của kit

Cây thư mục dưới đây lấy từ `ao-green` (dự án mới đã dựng thật ở T16) và profile `next-nest` của kit.

### Phiên Claude Code thứ nhất, mở trong `du-an-1`

#### Bước 0. Bạn tạo thư mục, mở `claude` trong đó, gõ một câu

Thư mục trống.

#### Bước 1. Agent hỏi config, bạn duyệt bảng tổng hợp

Câu đầu tiên là stack: bạn chọn khung `next-nest` của kit. Sau đó agent hỏi tên dự án, tên hiển thị, mã space Jira, repo, người duyệt, review bật hay tắt, số làn, số agent mỗi vai trò, ngân sách `/ao-run`, có lên VPS không.

Agent chưa ghi gì cho tới khi bạn duyệt. Duyệt xong, thư mục có `.ai/setup/answers.md` (không commit): bảng bạn vừa duyệt, để phiên sau đọc lại.

#### Bước 2. Agent kiểm phần chuẩn bị một lần

Agent kiểm công cụ, token, App, site Jira, VPS. Thiếu gì thì agent dẫn bạn làm.

Thư mục vẫn trống. Nếu bạn phải đặt thêm biến môi trường, bạn mở lại Claude Code và gõ "làm tiếp".

#### Bước 3. Agent tạo repo trống trên GitHub và chạy `ao-kit init`

Lệnh chạy khoảng 2,5 phút. Sau đó agent ghi App `ao-merge` và các config quy trình bạn đã chọn vào `project.yaml`, rồi chạy `ao-kit render`. Thư mục có đủ khung:

```
du-an-1/
├─ .git/                   kho git: nhánh develop, remote origin
├─ .ai-orchestrator/       bản chép kit và cấu hình của dự án
│  ├─ project.yaml         config bạn vừa duyệt: tên, space, review, số làn…
│  ├─ deploy.yaml          cách deploy từng app
│  ├─ roster.local.yaml    skill thêm cho agent theo stack
│  ├─ scripts/, lib/, contract/, quality/, tracker/, templates/, agents/
│  │                       phần chạy của kit
│  └─ node_modules/        (không commit)
├─ .claude/
│  ├─ settings.json        quyền và hook của Claude Code
│  ├─ agents/              11 agent: ba, ux, sa, fe-dev, be-dev, reviewer, security, qa, devops, seo, pm
│  ├─ hooks/               chặn những việc agent không được làm
│  ├─ rules/               luật chung cho mọi agent
│  └─ skills/              skill của agent
├─ .githooks/              commit-msg, pre-commit, pre-push
├─ .github/
│  ├─ workflows/           6 file: CI, merge-gate, jira-sync, review, sự kiện PR, CI riêng của dự án
│  └─ CODEOWNERS           bạn là người duyệt mọi file
├─ .jira/config.yml        space Jira của dự án
├─ .mcp.json               hai server MCP: atlassian, chrome-devtools
├─ apps/
│  ├─ web/                 Next.js
│  └─ api/                 NestJS, có sẵn /health
├─ e2e/smoke.spec.ts       test E2E đầu tiên
├─ scripts/dev.mjs         chạy cả hai app trên máy
├─ package.json, package-lock.json, playwright.config.ts
├─ README.md, .gitignore, .dockerignore
└─ node_modules/           (không commit)
```

#### Bước 4. Agent chạy `setup jira`; bạn sửa cột board

Thư mục không đổi. Trên Jira có space `DA1` và board của nó.

#### Bước 5. Bạn cài 3 App vào repo, agent dẫn từng cú bấm

Thư mục không đổi.

#### Bước 6. Agent chạy lint, test, build, rồi commit đầu và push `develop`, `main`

Thư mục có thêm vài thư mục build, không commit: `apps/web/.next/`, `apps/api/dist/`, `coverage/` của hai app. Git có 1 commit, GitHub có 2 nhánh.

#### Bước 7. Agent chạy `setup github`, bạn bật Actions, CI chạy lần đầu

Bạn tạo key `ao-merge`; lệnh chạy xong thì xóa file key.

Thư mục không đổi. Trên GitHub: nhánh mặc định `develop`, các environment và secret; CI xanh.

### Phiên thứ hai: bạn mở lại `claude` trong `du-an-1`, gõ "làm tiếp"

#### Bước 8. Bạn bấm tin cậy thư mục và bật 2 MCP

Thư mục có thêm `.claude/settings.local.json` (không commit), lưu lựa chọn MCP.

#### Bước 9 (nếu chọn VPS). Bạn cài App `ao-deploy`; agent thêm dự án vào deployer trên VPS và deploy Development lần đầu

Thư mục không đổi.

#### Bước 10. Agent chạy `doctor` tới khi xanh hết

Thư mục không đổi.

#### Bước 11. Agent chạy `ao-kit verify`: đọc/ghi nháp

`verify` ghi thử lên từng nền tảng rồi dọn lại:
- Jira: token CI tạo một Task nhãn `ao-kit-verify`, đọc lại và comment; token thường của bạn chuyển Task sang Cancelled;
- GitHub: App `ao-dev` tạo một nhánh thử ở head của `develop`, đọc lại rồi xóa; App `ao-review` lấy được token đăng review;
- VPS (nếu có): trang `health` của từng app public trả 200 khi có basic auth, 401 khi không.

Rồi agent đọc Task đó qua server MCP `atlassian`, bằng token của agent.

Thư mục có thêm `.ai/setup/verify.md` (không commit), ghi kết quả từng dòng. Trên Jira còn Task thử ở Cancelled; trên GitHub không còn gì.

## Phần 5. App từ template của bạn

Mỗi app được chép từ một template trên máy bạn bằng `ao-kit add`. Lệnh này đã chạy thật ở `shop`: `user` (Next.js), `admin` (React), `api` (Spring Boot). Thời gian dưới đây đo ở `shop`.

Khác phần 3 ở bốn điểm:
- pnpm thay cho npm;
- `init` chỉ dựng phần gốc, mỗi app được thêm bằng `add`;
- code của template thường còn vài chỗ phải sửa cho hợp kit, nên CI lần đầu đỏ, và setup có thêm một Task sửa code;
- mỗi app public có host riêng trên VPS.

### Phiên Claude Code thứ nhất, mở trong `du-an-1`

#### Bước 0. Bạn tạo thư mục, mở `claude` trong đó, gõ một câu

Thư mục trống.

#### Bước 1. Agent hỏi config, bạn duyệt bảng tổng hợp

Câu đầu tiên là stack: bạn chọn dựng app từ template. Agent hỏi từng app, bạn trả lời kiểu này:

```
web:   Next.js,     D:/templates/nextjs-template, nhánh main,     public, có SEO
admin: React,       D:/templates/react-template,  nhánh main,     public, không SEO
api:   Spring Boot, D:/templates/java-template,   nhánh codebase, không public
```

Agent tự kiểm từng đường dẫn:
- có phải repo git không;
- có thay đổi chưa commit không, vì `add` chỉ chép phần đã commit ở nhánh bạn chọn.

Agent cũng đọc template để đề xuất thư mục nên bỏ, như `docs/readme/` hay `study-guide-impl/`, và file git đang giữ mà trông như secret, như `.env`. Sau đó agent hỏi các config còn lại như phần 3, có lên VPS thì hỏi host của từng app public, và hỏi Task sửa code template (bước 10) có review không.

Agent chưa ghi gì cho tới khi bạn duyệt. Duyệt xong, thư mục có `.ai/setup/answers.md` (không commit).

#### Bước 2. Agent kiểm phần chuẩn bị một lần

Như phần 3, cộng thêm:
- pnpm đúng bản mà kit ghi;
- có Spring Boot thì thêm JDK đúng bản `<java.version>` của `pom.xml` trong template, và Docker (cho test và Postgres trên máy).

Thư mục vẫn trống.

#### Bước 3. Agent tạo repo trống trên GitHub và chạy `ao-kit init --package-manager pnpm`

Lệnh chạy khoảng 25 giây, dựng phần gốc, chưa có app:

```
du-an-1/
├─ .git/                   kho git: nhánh develop, remote origin
├─ .ai-orchestrator/       bản chép kit và cấu hình; project.yaml có package_manager: pnpm, chưa có app
├─ .claude/                settings.json, agents/, hooks/, rules/, skills/ (như phần 3)
├─ .githooks/, .github/, .jira/config.yml, .mcp.json      như phần 3
├─ e2e/README.md
├─ package.json            4 script chạy cho mọi app (pnpm -r run lint…)
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
├─ playwright.config.ts    đọc danh sách app từ project.yaml
├─ README.md, .gitignore, .dockerignore
└─ node_modules/           (không commit)
```

#### Bước 4. Agent chạy `ao-kit add` cho từng app

Mỗi app khoảng 10–35 giây. `add` chép code của template, bỏ những gì kit làm thay (husky, commitlint, `.github/`, `.claude/`, lockfile của template), rồi in danh sách chỗ code app còn phải sửa. Template gốc trên máy bạn không bị sửa gì.

Agent làm thêm:
- có Spring Boot: thêm khóa `database` vào `deploy.yaml`, và `coverage_exclude` của `api` vào `project.yaml`;
- có VPS: ghi host của từng app public vào `project.yaml`, rồi chạy `ao-kit check`;

`add` ghi danh sách chỗ phải sửa vào `.ai/setup/add-report.md`, để phiên thứ hai còn đọc được.

Thư mục có thêm:

```
du-an-1/
├─ .ai/setup/add-report.md (không commit) chỗ code app còn phải sửa, cho bước 10
├─ .ai-orchestrator/
│  ├─ project.yaml         thêm 3 app: cổng, health, public, seo, host
│  ├─ deploy.yaml          thêm 3 app kèm smoke test; database của api
│  └─ roster.local.yaml    skill theo stack cho fe-dev, be-dev
├─ .claude/
│  ├─ settings.json, agents/   sinh lại theo các app mới
│  └─ skills/              thêm web-conventions, admin-conventions (từ CLAUDE.md của template),
│                          api-conventions (từ docs/coding-conventions/ của template), java-springboot
├─ apps/
│  ├─ web/                 Next.js, chép từ template
│  ├─ admin/               React, chép từ template; thêm Dockerfile, Caddyfile nếu template chưa có
│  └─ api/                 Spring Boot, chép từ template; thêm package.json gọi Maven wrapper
├─ pnpm-workspace.yaml     gộp cài đặt pnpm của các template
└─ pnpm-lock.yaml          đủ gói của 3 app
```

#### Bước 5. Agent chạy `setup jira`; bạn sửa cột board

Như bước 4 của phần 3. Thư mục không đổi.

#### Bước 6. Bạn cài 3 App vào repo, agent dẫn từng cú bấm

Như bước 5 của phần 3. Thư mục không đổi.

#### Bước 7. Agent commit đầu và push `develop`, `main`

Không chạy 4 lệnh kiểm như phần 3: code template chưa sửa nên sẽ đỏ. Hook `pre-commit` vẫn quét secret và chạy lint-staged của từng app; ở `shop` (2 app, 799 file) mất 143 giây.

Thư mục không đổi. Git có 1 commit, GitHub có 2 nhánh.

#### Bước 8. Agent chạy `setup github`, bạn bật Actions, CI chạy lần đầu

Như bước 7 của phần 3, nhưng CI lần đầu **đỏ**, đúng như dự đoán: thường ở `build-test` và `policy` (gói có lỗ hổng trong template). Dependabot có thể mở vài PR nâng gói; không cần merge từng cái, vì bước 10 nâng các gói đó.

Thư mục không đổi.

### Phiên thứ hai: bạn mở lại `claude` trong `du-an-1`, gõ "làm tiếp"

#### Bước 9. Bạn bấm tin cậy thư mục và bật 2 MCP

Thư mục có thêm `.claude/settings.local.json` (không commit).

#### Bước 10. Task sửa code app theo danh sách của `add`

Agent tạo một Task từ `.ai/setup/add-report.md`, sửa code trên nhánh của Task, rồi mở PR. Các chỗ hay gặp:
- coverage ghi `lcov.info`;
- Next.js có `output: 'standalone'`;
- app lấy cổng từ `PORT`;
- biến nhúng lúc build (`NEXT_PUBLIC_*`, `VITE_*`) đổi sang đọc lúc chạy;
- nâng các gói có lỗ hổng, như Spring Boot lên bản vá mới nhất.

Bạn xem các app bằng `/ao-preview`, rồi approve. PR xanh thì merge, Task chuyển Cancelled kèm link PR. Từ đây CI trên `develop` xanh.

Thư mục: code trong `apps/` đổi theo PR. Có Spring Boot thì thêm `apps/api/.env` (không commit), chép từ `.env.example` với mật khẩu ngẫu nhiên, để chạy Postgres trên máy.

#### Bước 11 (nếu chọn VPS). Lên Development

Bạn cài App `ao-deploy`. Agent thêm dự án vào deployer trên VPS, kèm file secret của Development; có Spring Boot thì thêm database, với mật khẩu sinh ngay trên VPS. Rồi agent deploy Development lần đầu; ở `shop` (3 app, có `api`) mất khoảng 18,5 phút, phần lớn là build image.

Thư mục không đổi. Mỗi app public có một host Development chạy được.

#### Bước 12. Agent chạy `doctor` tới khi xanh hết

Thư mục không đổi.

#### Bước 13. Agent chạy `ao-kit verify`: đọc/ghi nháp

Như bước 11 của phần 3.

**Mẹo:** nếu bạn sửa luôn template gốc theo danh sách của `add`, dự án sau không còn bước 10, và CI xanh ngay ở bước 8.

## Sau setup

Xong thì gõ `/ao-status`. Khi làm tính năng đầu tiên, thư mục có thêm `docs/specs/<EPIC>/` (SPEC, design, plan), và `.ai/` có thêm ledger của từng item.

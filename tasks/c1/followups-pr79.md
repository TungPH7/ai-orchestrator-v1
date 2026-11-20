# Task sửa kit: finding của review lần hai `shop` PR #79

**Trạng thái:** chờ bạn đồng ý. Bạn chọn gom ở Phiên 33 · Lượt 98: "Gom 6 Medium và 3 Low vào một Task sửa kit, và chỉ làm khi tôi đồng ý."

**Nguồn:** review lần hai của PR #79 (SHOP-78), head `1ff3358`, bản chép kit `5c25aca`. Cả `reviewer` và `security` đều Approve, không có Critical hay High. Báo cáo đầy đủ ở `.ai/reviews/79-reviewer.md` và `.ai/reviews/79-security.md` của `shop`, và đã đăng lên PR. Mỗi finding có phần "Tái hiện" mà agent đã chạy trên head.

**Cách làm khi bạn đồng ý:** một kit PR từ `main`, mỗi finding có test viết đỏ trước. Rồi chép kit vào `shop` trong một Task chép kit riêng (cùng Low 9), và review một lần.

## Medium

1. **WebFetch của `seo` lọt qua chính câu query của WebSearch** (cả hai thấy).
   - Chỗ: `lib/quality/web-search.mjs` (`resultUrls`), `kit/.claude/hooks/web-search.mjs`, `lib/quality/commands.mjs` (luật WebFetch).
   - Lỗi: hook ghi mọi URL trong `JSON.stringify(tool_response)`. Output thật của WebSearch (Claude Code 2.1.329) là `{ query, results, durationSeconds, searchCount }`, mà `query` là câu `seo` tự gõ. Vậy `seo` search một URL nào thì WebFetch được tới URL đó, nên một trang web lái được nó gửi dữ liệu Jira ra ngoài.
   - Sửa: chỉ ghi `results[].content[].url`; bỏ `query` và text trong `results`; dạng lạ thì không ghi gì. Test với output đúng dạng thật. Cân nhắc thu quyền Jira của `seo` về `getJiraIssue` của Epic mà prompt nêu.
2. **Còn đường cài gói chưa duyệt phía npm** (cả hai thấy phần `create`).
   - Chỗ: `lib/quality/dependencies.mjs` (`installTargets`, `dependencyProblems`), `quality/gates.yaml`, `scripts/check-policy.mjs`.
   - Lỗi: (a) gh-guard không nhận `npm create`, `npm init <gói>`, `pnpm create`, `yarn create`, `bun create`, `npm install-test` hay `npm it <gói>`, `pnpx <gói>`, `corepack pnpm add <gói>`; (b) `catalog:` được coi như `workspace:`, trong khi version thật nằm ở `pnpm-workspace.yaml`; (c) `.pnpmfile.*` không protected mà đổi được mọi dependency; (d) job `policy` coi mọi `name` của một `package.json` được track là gói của dự án.
   - Sửa: đưa các lệnh trên vào `installTargets` với tên gói thật (`create-<x>`, `@scope/create-<x>`); đọc `catalog:` từ `pnpm-workspace.yaml` và cho `policy` xét `catalog`, `catalogs`, `overrides` của file đó; thêm `**/.pnpmfile.*` vào `protected_paths`; `own` chỉ gồm gói thuộc `packages:` của workspace, khi spec là `workspace:`.
3. **Phía Maven, cổng chỉ đọc `<dependency>` viết đúng nguyên chữ** (`security`).
   - Chỗ: `lib/quality/dependencies.mjs` (phần POM).
   - Lỗi: plugin mới trong `<build><plugins>`, `<extension>`, `<repositories>` hay `<pluginRepositories>` mới, và `<dependency >` có khoảng trắng đều qua gh-guard lẫn `policy`.
   - Sửa: đọc POM bằng parser XML, hoặc ít nhất nhận `<dependency\b[^>]*>`; xét cả `plugin`, `extension`, `parent`; từ chối repository mới; thêm `**/.mvn/extensions.xml` và `**/.mvn/maven.config` vào `protected_paths`.
4. **Chữ từ web đi qua `seo` tới agent có Bash trước khi bạn đọc nó** (`security`).
   - Chỗ: `contract/stages.yaml` (stage spec), `lib/workflow/prompts.mjs` (`seoNote`), `lib/workflow/steps.mjs`, `agents/roster.yaml`.
   - Lỗi: ở `/ao-spec`, `sa` (`spec-nfr`) và `ba` (`docs-pr`) chạy sau `seo` và đọc `spec.md`, trước cổng ①. Với `Cần seo:` ngoài Epic, prompt build của `fe-dev` bảo "Build it word for word" từ comment của `seo`. PR light chỉ đổi `messages/*.json` còn được waiver `light-docs`.
   - Sửa (cần bạn chọn): chạy `seo` cuối stage spec và để ao-step mở docs PR, hoặc dừng `/ao-spec` sau `seo` chờ bạn; với `Cần seo:`, `/ao-build` dừng ở item `ao-seo` tới khi bạn xác nhận comment; thêm kiểm tra tất định cho mục `## SEO` và comment của `seo` (URL chỉ thuộc host của app hoặc schema.org, không có lệnh).
5. **`seo` không đọc được ledger của chính nó** (`reviewer`).
   - Chỗ: `lib/quality/commands.mjs` (luật đọc của role đọc web), `lib/workflow/prompts.mjs` (`resumePrompt`).
   - Lỗi: `.ai/` bị git ignore, và luật mới chặn `seo` đọc mọi file git ignore. Claude Code không cho Edit hay ghi đè file chưa Read, nên `seo` không chạy tiếp được sau khi dừng giữa chừng, và lượt `seo` sau trên cùng item không sửa được ledger cũ.
   - Sửa: cho qua path khớp `writes` của role trước khi xét `ignored`; test `seo` Read được `.ai/ledger/<KEY>.seo.md` mà vẫn bị từ chối `.ai/ledger/<KEY>.md`.
6. **Mức mà bạn đổi qua phiên chính bị bỏ qua, không báo** (`reviewer`; `security` thêm hệ quả).
   - Chỗ: `lib/workflow/levels.mjs` (`trustedLabels`).
   - Lỗi: phiên chính gọi Jira bằng `ATLASSIAN_AGENT_TOKEN`, tức tài khoản agent, nên mọi đổi nhãn mức nhờ phiên chính đều bị bỏ. Nâng lên heavy mà bị bỏ thì PR có thể không được review ở mức bạn chọn.
   - Sửa: chỉ bỏ thay đổi làm hạ mức (lấy mức cao hơn giữa nhãn hiện tại và nhãn sau khi bỏ thay đổi của agent; không nhãn tính là standard); `/ao-status` báo khi một nhãn mức bị bỏ qua; ghi vào tài liệu rằng hạ mức phải làm trên giao diện Jira.

## Low

7. **Cài một tên đã duyệt không kèm version** (`reviewer`): `pnpm add zod` không được so với `range`. Sửa: khi mục đã duyệt có `range`, bắt ghi version kèm tên. Chỗ: `lib/quality/dependencies.mjs` (`installRefusal`).
8. **QA lại tin mọi comment có tiêu đề "QA report"** (`security`): ô đầu của dòng FAIL được chép nguyên vào prompt `qa`. Sửa: chỉ nhận báo cáo mà run `qa` đăng (ao-step ghi id comment) hoặc báo cáo đăng bằng token CI; từ ô đầu chỉ lấy mã `AC<n>`. Chỗ: `lib/tracker/facts.mjs`, `lib/workflow/prompts.mjs`.
9. **`shop`: `apps/user/src/components/seo/json-ld.tsx` nên vào tầng Nhạy cảm** (`security`). Đây là chỗ duy nhất của `user` dùng `dangerouslySetInnerHTML`. Sửa trong `shop`, trong PR chép kit kế tiếp: `review: { sensitive_paths: ["apps/user/src/components/seo/**"] }` trong `.ai-orchestrator/project.yaml`.

## Phát hiện thêm khi QA SHOP-78 (Lượt 98)

10. **`jira:check` không thấy hai rule Restrict tách rời trên một transition.**
    - Chỗ: `lib/tracker/drift.mjs` (`restrictRules.flatMap(...)`).
    - Lỗi: Pick up và QA fail của workflow `AO standard` có hai rule Restrict riêng, một cho `ao-agents`, một cho `ao-automation`, dưới `operation ALL`. Jira đòi tài khoản thuộc cả hai group, nên cả `qa` lẫn token CI đều không thấy Pick up (QA SHOP-78 PASS mà item kẹt ở Ready for QA). `drift.mjs` gộp group của mọi rule thành một danh sách, nên `jira:check` báo "matches".
    - Sửa: một transition có hơn một rule Restrict là một chỗ lệch (hoặc tính theo AND như Jira); test với bản ghi API có hai rule. Ghi rõ trong bước `[bạn]` của tài liệu: thêm group vào rule có sẵn, không thêm rule mới.

## Ghi chú thêm, không phải finding của review

- Sau khi PR #79 merge, deployer từ chối deploy `ccf4fde` lên Development: mô tả PR có chữ `<KEY>`, mà `audit` coi là chỗ trống chưa điền của template. Chữ đó do phiên chính viết khi cập nhật mô tả sau lần chép kit thứ hai (đường dẫn `.ai/ledger/<KEY>.seo.md`). Job `policy` không bắt được, vì mô tả được sửa sau khi CI đã chạy. Đã gỡ chặn ở Lượt 98: sửa mô tả, `audit` chạy thử qua, rồi `/ao-rollback development ccf4fde`.
- Có thể cân nhắc (bạn quyết): `audit` bỏ qua placeholder nằm trong code span; hoặc sửa mô tả PR thì chạy lại kiểm tra mô tả.

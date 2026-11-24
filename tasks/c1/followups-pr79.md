# Task sửa kit: finding của review lần hai `shop` PR #79

**Trạng thái:** đã sửa trong kit PR #326 (Phiên 33 · Lượt 101), đã chép vào `shop` ở SHOP-79 (`shop` PR #80). Bạn chọn gom ở Lượt 98 ("Gom 6 Medium và 3 Low vào một Task sửa kit, và chỉ làm khi tôi đồng ý"), đồng ý ở Lượt 101 ("Ok làm T20b trước, rồi làm C2"), và chọn cách sửa mục 4: `seo` chạy cuối. Mục "Đã làm" ở cuối file ghi từng mục làm thế nào.

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

## Đã làm (Lượt 101)

Mỗi mục có test viết đỏ trước. Cả bộ: 1.731 test xanh.

1. **WebFetch:** `resultUrls` chỉ lấy `results[].content[].url`, URL `http`/`https` không có user, mật khẩu hay khoảng trắng. Bỏ `query` và phần chữ; dạng lạ thì không ghi gì. Test chạy cả hook `web-search.mjs` với output đúng dạng thật. Chưa thu quyền Jira của `seo`: nó cần comment để trả lời `Cần seo:`, và WebFetch nay không gửi dữ liệu ra địa chỉ nó tự chọn được nữa.
2. **npm:** gh-guard nhận `npm create`/`init`/`innit <x>`, `pnpm`/`yarn`/`bun create <x>` (gói `create-<x>`, `@scope/create-<x>`, `@scope/create`), `npm install-test`/`it`, `pnpx`, và mọi lệnh qua `corepack <pm>[@version]`. `catalog:` được đọc từ `pnpm-workspace.yaml` (tên phải duyệt, phiên bản phải trong `range`); job `policy` xét `catalog`, `catalogs`, `overrides` khi PR đổi file đó. Gói của dự án: với npm chỉ các `package.json` trong `workspaces` của file gốc, với pnpm không có (chúng vào qua `workspace:`).
3. **Maven:** POM đọc mọi `<dependency>` dù có khoảng trắng hay thuộc tính, dependency của plugin, `<plugin>` (groupId mặc định `org.apache.maven.plugins`), `<extension>`, `<parent>`, annotation processor của compiler; `${…}` đọc từ `<properties>` và groupId của dự án, không đọc được thì bị từ chối. `<repository>`/`<pluginRepository>` mới bị từ chối. Chạy thử trên `apps/api/pom.xml` của `shop`: 28 artifact, không còn `${`.
4. **`seo` chạy cuối** (bạn chọn): thứ tự stage spec trong `contract/stages.yaml` là `ba`, `ux`, `sa`, `ba docs-pr`, rồi `seo`; `ao-step` push commit của `seo` lên PR tài liệu. Prompt `docs-pr` bảo `ba` ghi trong PR rằng `seo` viết sau. Câu hỏi mở sau lượt `seo` trả về `seo`. `/ao-build` dừng ở item `ao-seo` ngoài Epic tới khi bạn gõ `/ao-build <KEY> seo-ok` (cờ `--seo-ok`), và cũng dừng khi `Cần seo:` chưa được trả lời. Bước kiểm tất định `lib/workflow/seo-check.mjs` báo địa chỉ ngoài host của app `seo: true` và `schema.org`, khối shell, dòng hay đoạn code bắt đầu bằng một lệnh; nó chạy ở cổng ① cho mục `## SEO` và ở chỗ dừng `seo-ok` cho comment của `seo`. Báo xong vẫn là bạn quyết.
5. **Ledger của `seo`:** path khớp `writes` của role đọc web qua trước luật file git bỏ qua; `.ai/ledger/<KEY>.seo.md` đọc được, `.ai/ledger/<KEY>.md` vẫn bị chặn.
6. **Mức:** `trustedLevel` chỉ bỏ thay đổi làm hạ mức (lấy mức cao hơn; không nhãn là Chuẩn), nên nâng mức qua phiên chính được tính. `/ao-status <KEY>` và quyết định của `/ao-review` ghi dòng "Level of …" khi một nhãn bị bỏ qua. `docs/dev-workflow.md` ghi: hạ mức thì làm trên giao diện Jira.
7. **Tên không kèm version:** `pnpm add zod` bị từ chối khi mục đã duyệt có `range`; `npx` thì không (nó chạy bản dự án đã có).
8. **Báo cáo QA:** hook `block-atlassian` từ chối agent khác `qa` viết comment có dạng báo cáo QA (comment, sửa comment, comment trong transition). Từ ô đầu của dòng FAIL chỉ lấy mã `AC<n>`; dòng không có mã thì lần QA lại kiểm đủ.
9. **Low 9 (`shop`):** chưa làm, vào lần chép kit kế tiếp (cùng C2).
10. **`jira:check`:** một transition có hơn một rule Restrict báo `restrict-split`. Checklist Jira và `docs/dev-workflow.md` ghi: thêm group vào rule có sẵn, không thêm rule mới.

**Mình tự chọn thêm, cần bạn xác nhận:**

- `pnpm-workspace.yaml` (catalog, overrides, và `allowBuilds`, tức gói nào được chạy script lúc cài), `.pnpmfile.*` và cả thư mục `.mvn/` (thêm `maven-wrapper.properties`, nơi ghi URL tải Maven) thành đường dẫn được bảo vệ, nên chúng vào tầng Nguy cấp. Khi cần đổi, bạn đổi.
- `mvn -s`, `--settings`, `-gs`, `--global-settings` bị gh-guard từ chối như `--registry` của npm: file settings đặt được mirror cho mọi artifact.
- `seo` không được viết yêu cầu `Cần <role>:` (hook chặn): yêu cầu đó chạy `ba` hay `sa` trên chữ `seo` lấy từ web. Prompt `seo` bảo nó ghi điều cần ở câu trả lời cuối, cho bạn.
- Mục 8 làm bằng hook theo role thay cho việc `ao-step` ghi id comment: cách này áp cả cho `jira-sync` trên CI, nơi không có bản ghi của máy.

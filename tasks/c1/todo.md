# Task: C1

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-c1.md](../../SPEC-c1.md). Làm theo thứ tự. Mỗi task viết test đỏ trước.

**Quy ước:**
- Xong mỗi task thì các lệnh kiểm phải xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`.
- Mỗi bước một nhánh `task/c1-<số bước>` tách từ `main`, mỗi task một commit. Phiên chính merge qua PR khi CI xanh.
- Commit theo `CLAUDE.md`.
- Task có nhãn **[bạn]** cần bạn bấm trên Jira hay GitHub, hoặc tốn tiền.

## Chuẩn bị

- [x] **T1: tài liệu.** Spec ghi đã duyệt; sửa câu "file mới `contract/stages.yaml`" thành "khóa `runs` trong `contract/stages.yaml`" (plan, quyết định 3); plan, todo, nhật ký. Xong 2026-11-19: kit PR #313 (`287700d`).
- [x] **T2 [bạn]: ba tiền đề** (plan, mục "Ba tiền đề"). Không viết code. Xong 2026-11-19: tiền đề 1 và 2 đạt (0,17 USD); tiền đề 3 dời sang T15, vì `jira:check` báo lệch nếu option có trước role `seo` ([verification.md](verification.md)).
  1. Ở `ao-pilot` (đặt `AO_KIT_DIR`), một file agent tạm có đúng công cụ của `seo` chạy bằng `claude -p --agent`, như `ao-agent.mjs` mở: gọi được WebSearch và WebFetch, đọc được một item Jira và comment lên item thử.
  2. gh-guard không chặn các lệnh gọi đó.
  3. **Bạn:** thêm giá trị "SEO Specialist" vào Agent Field (mình ghi từng bước bấm); `npm run jira:check` khớp.

  Xong thì xóa file agent tạm và comment thử. Kết quả ghi vào `verification.md`.
  - **Kiểm:** đủ ba kết quả. Tiền đề nào sai thì sửa spec, và bạn duyệt trước T3.

### Checkpoint 1: sau T2
- [x] Ba tiền đề có kết quả; spec không phải sửa.

## Bước 1: thứ tự chạy trong contract, nhánh `task/c1-1`

- [x] **T3: bản ghi quyết định, `conditions.mjs`, khóa `runs`** (spec mục 6, phần đầu). Xong 2026-11-19, commit `4ef0b27`.
  - **Đạt khi:**
    - quyết định của `decideStep` trên mọi lần gọi của bộ test được ghi lại trước khi sửa code (448 lần gọi; plan, quyết định 4);
    - mỗi run có `when` (run áp dụng) và `done` (đầu ra đã có). `conditions.mjs` có `spec-written`, `spec-has-screens`, `design-written`, `spec-has-nfr`, `plan-written`, `plan-items-created`, đều là hàm thuần trên facts. `tier-sensitive-or-critical` thêm ở bước 3, khi luật đó có;
    - `stages.yaml` có `runs` cho `spec`, `plan`, `build`, `review`, chưa có `seo`;
    - `validate` báo lỗi khi gặp điều kiện lạ, hay role không phải agent role (như spec mục 6 ghi). Không đòi role của `runs` nằm trong `roles` của stage: stage build chưa ghi `devops`, và ghi thêm sẽ đổi prompt của `devops`.
  - **File:** `contract/stages.yaml`, `contract/schema/stages.schema.json`, `lib/workflow/conditions.mjs`, `lib/rules/references.mjs`, test.
- [x] **T4: các hàm quyết định đọc `runs`.** Xong 2026-11-19, commit `dbf313e`.
  - **Đạt khi:** `decideSpec`, `decidePlan`, `decideBuild`, `decideReview` đọc danh sách thay cho mảng viết cứng; `DEV_ORDER` bị bỏ; so với kết quả mốc không có khác biệt. **Kết quả:** 0 khác biệt trên 448 quyết định; 1.605 test xanh.
  - **File:** `lib/workflow/steps.mjs`, test.

### Checkpoint 2: sau T4
- [x] PR bước 1 merge; bộ so không khác. Kit PR #314 (`cd8395e`).

## Bước 2: tiêu chí finding, luật dừng, nhánh `task/c1-2`

- [x] **T5: bảng tiêu chí; Medium phải có cách tái hiện** (spec mục 4.1, 4.2). Xong 2026-11-19, commit `dc7b163`.
  - **Đạt khi:** prompt `reviewer` và `templates/review-report.md` có bảng tiêu chí và dòng tái hiện; `readReviewReport` tính Medium thiếu dòng tái hiện là Low; `/ao-status` ghi lý do.
  - **Kết quả:**
    - dòng tái hiện là `Tái hiện:` hay `Repro:` trong ô Finding hay Suggested fix;
    - prompt `security` cũng ghi luật này, vì báo cáo của nó đi qua cùng bộ đọc;
    - facts của báo cáo có thêm `counts` theo mức;
    - báo cáo thật của `reviewer` trong fixture (ghi từ `ao-pilot`, trước C1) có một Medium không có dòng tái hiện, nên nay được tính là Low.
- [x] **T6: luật dừng; USD trên mỗi AC** (spec mục 4.3, 4.4, mục 7). Xong 2026-11-19, commit `6201ddd`.
  - **Đạt khi:**
    - báo cáo trên head không còn Critical hay High thì `decideReview` gợi ý approve;
    - `decideFix` không có ghi chú thì dừng với lý do "không còn gì chặn merge";
    - `/ao-status <Epic>` in USD trên mỗi AC, lượt chưa biết chi phí ghi riêng.

  Spec mục 9 chưa xếp phần 6 vào bước nào, nên plan đặt nó ở đây.
  - **Kết quả:**
    - `afterReviews` vốn đã gợi ý approve khi không còn Critical hay High; T6 thêm dòng "Findings that do not block" ở `/ao-review`, `/ao-fix` và `/ao-status <KEY>`;
    - lý do dừng của `/ao-fix` là "nothing blocks the merge";
    - skill `/ao-review` dặn phiên chính không đề xuất `/ao-fix` cho Medium hay Low;
    - `/ao-status <EPIC>` đọc `state.json` của các item và đếm AC còn hiệu lực trong SPEC.
  - 1.609 test xanh.

## Bước 3: effort và ba tầng đường dẫn, nhánh `task/c1-3`

- [x] **T7: hai danh sách đường dẫn, `pathTier`** (spec mục 3.2). Xong 2026-11-19, commit `ed9806e`.
  - **Đạt khi:** `pathTier(files, gates)` trả tầng cao nhất, tính file đổi tên theo cả hai tên; `roster_effort_paths` bị bỏ khỏi `gates.yaml` và schema.
  - **Kết quả:**
    - khóa `review` của `gates.yaml` có `critical_paths`, `sensitive_paths`, `docs_paths`; đường dẫn được bảo vệ tự là Nguy cấp;
    - tầng thứ tư `docs`: mọi file là tài liệu và không file nào Nguy cấp, kể cả README trong thư mục `dto/`;
    - PR không có file, hay bị GitHub cắt danh sách, tính là Nguy cấp;
    - service nay là Nhạy cảm (`security` ở `high`, như mọi PR trước C1).
- [x] **T8: effort theo tầng; luật tài liệu** (spec mục 3.1, 3.3). Xong 2026-11-19, commit `9191792`.
  - **Đạt khi:**
    - roster `reviewer` là `high`;
    - tầng Nguy cấp: `reviewer` `xhigh`, `security` `max`; tầng Nhạy cảm: `security` `high`; tầng Thường: không có `security`;
    - vòng sau của `reviewer` chỉ xem phần mới;
    - PR chỉ đổi tài liệu của item Chuẩn hay Nặng: `reviewer` `high`, không có `security`.
  - **Kiểm:** tiêu chí 3 của spec (PR chạm controller; PR chạm `SecurityConfig.java`) bằng test.
  - **Kết quả:**
    - `merge-gate` và `audit` đòi báo cáo `security` theo cùng tầng (`reviewRolesNeeded`), và luôn đòi khi `security` đã từng báo cáo trên PR. Nhờ vậy bỏ file đã gọi `security` vào cũng không bỏ được High nó tìm ở chỗ khác;
    - `reviewer` có báo cáo đầy đủ và phần mới riêng, như `security`; prompt `review-delta` ghi tên role;
    - gate ③ của PR chỉ cần `reviewer` ghi lý do `security` không chạy;
    - item có nhãn effort được review như PR Nguy cấp, cho tới khi bước 4 có mức quy trình;
    - PR tài liệu đến muộn (head sau Approve plan) nay chỉ cần báo cáo `reviewer`;
    - 1.618 test xanh. Phần "mức tự lên Nặng" của tiêu chí 3 thuộc bước 4.

## Bước 4: ba mức, nhánh `task/c1-4`

- [x] **T9: `effectiveLevel`, nhãn mức** (spec mục 2, "Chọn mức", "Mức hiệu lực"). Xong 2026-11-20, commit `66a94ed`.
  - **Đạt khi:** không nhãn là Chuẩn; tầng Nguy cấp nâng lên Nặng; Critical hay High nâng một bậc và review lại head ở mức mới; cột "Mức" của `plan.md`; `ba` gắn nhãn; bản nháp `/ao-intake` có mức đề xuất.
  - **Kết quả:**
    - `lib/workflow/levels.mjs`; nhãn `ao-level-*` (`work_labels.level_prefix`);
    - Task List của `plan.md` ghi mức ở mỗi dòng, dạng `· level heavy: <lý do>`, vì Task List là danh sách, không phải bảng;
    - review lại head khi role đã review head đó ở effort thấp hơn, dựa vào `state.json`;
    - nhãn effort không còn nâng review: item Nặng thay chỗ đó;
    - quyết định khi làm: QA FAIL không tự nâng mức (spec mục 2 đã ghi lý do).
- [x] **T10: QA theo mức** (spec mục 2, "QA theo loại item", "QA lại", "QA của item Nhẹ"). Xong 2026-11-20, commit `011ab94`.
  - **Đạt khi:**
    - `/ao-qa` của item Nhẹ không chạy agent, in Verification và URL; `qa-light.mjs` đăng báo cáo bằng token CI;
    - lần QA lại ở mức Chuẩn đưa danh sách tiêu chí đã FAIL vào prompt; mức Nặng kiểm đủ;
    - `--retest` giữ nguyên.
  - **Kiểm:** tiêu chí 8 của spec bằng test.
  - **Kết quả:**
    - không có `qa-light.mjs`: hai action của `ao-step`, `qa-light-start` và `qa-light-report`, cùng tùy chọn `--light-report <file trong .ai/runs/>`, để một chỗ duy nhất quyết định item có phải Nhẹ không;
    - báo cáo đăng dạng ADF (`lib/tracker/adf.mjs`);
    - `readLatestQaReport` trả thêm `id` và `failed`;
    - role mới `light-qa` (identity `automation`) làm Pick up và QA fail, không dùng `automation`, vì `jira-sync` tự chạy transition của `automation`.
  - **[bạn] Trên Jira:** thêm group `ao-automation` vào rule Restrict của Pick up và QA fail (workflow `AO standard`). Bản ghi Jira trong test (`tests/fixtures/tracker/api/demo.json`) đã được sửa theo trạng thái sau khi bạn bấm.
- [x] **T11: Task finding của Epic** (spec mục 2, mục 4.3). Xong 2026-11-20, commit `8ebabe6`.
  - **Đạt khi:** Medium hay Low không sửa ngay thì `ao-step` tạo Task `ao-findings` (lần đầu), nối Blocks tới Epic, và thêm comment ghi PR, mã finding, chỗ.
  - **Kết quả:**
    - `/ao-qa` làm việc này trước lượt QA, khi PR đã merge;
    - action `findings-task` tìm lại Task và comment trước khi tạo, nên chạy lại không tạo thêm;
    - Task là con của Epic và chặn Epic (`inwardIssue` là Task, như `ba` nối link);
    - item ngoài Epic thì không có Task finding.
  - 1.634 test xanh.

## Bước 5: miễn review có dấu vết, nhánh `task/c1-5`

- [x] **T12: `review.waivers`** (spec mục 3.4). Xong 2026-11-20, commit `020d9c6`, trừ `review: off` (hoãn, xem dưới).
  - **Đạt khi:**
    - PR được miễn thì `ao-step review` không chạy agent; `ao-review` đăng review COMMENT có dòng `Waiver: light-docs`, mức và danh sách file;
    - `merge-gate` và `audit` tính lại bằng `waiverHolds`; luật không khớp thì xử lý như thiếu báo cáo;
    - `/ao-review <PR> full` chạy đủ hai role;
    - `review: off` chỉ ở `project.yaml`, và `doctor` báo đỏ.
  - **Kiểm:** tiêu chí 2 của spec bằng test, kể cả PR có thêm một file `.ts`.
  - **Kết quả:**
    - `lib/quality/waivers.mjs` có `waiverFor`, `waiverOnHead` và `waiverBody`;
    - `merge-gate` và `audit` đọc nhãn mức của item bằng `JIRA_CI_TOKEN`, chỉ khi mọi file có thể thuộc một luật miễn (`waiverLabel`); không đọc được nhãn thì không có miễn;
    - dòng `Waiver` trên head là điều kiện của merge, nhưng không đủ để merge: luật phải khớp lại;
    - `/ao-review <PR> full` ứng với `ao-step review <PR> --full`;
    - tiêu chí 2 kiểm bằng test của `merge-gate` và `audit`, kể cả PR có thêm một file code.
  - **Hoãn:** khóa `review: off` của `project.yaml` và dòng đỏ của `doctor`. Nó cần `merge-gate` và `audit` đọc `project.yaml` của nhánh base, và hiện chưa có repo nháp nào dùng tới. Ghi ở `docs/quality-gates.md`; làm khi có repo nháp đầu tiên.

### Checkpoint 3: sau T12
- [x] Bước 1–5 đã merge (kit PR #314–#318); 1.643 test xanh. Đã báo bạn ở Lượt 89.

## Bước 6: duyệt thư viện, nhánh `task/c1-6`

- [x] **T13: khối `dependencies`; `dep-check`** (spec mục 5; A6 mục 10, dòng 1).
  - **Đạt khi:** `approved` và `exceptions` có schema; `ao-kit sync` không ghi đè; `dep-check.mjs` kiểm OSV, giấy phép, tuổi gói, lượt tải, người duy trì, script lúc cài, provenance; lỗi mạng cho kết quả "nghi ngờ".
  - **Kết quả** (xong 2026-11-20, commit `9ab8303`):
    - `lib/quality/dependencies.mjs`, `lib/quality/dep-check.mjs`, `scripts/dep-check.mjs`;
    - `project.yaml` có khối `dependencies`; `gates.yaml` có `dependencies.licenses`;
    - job `policy` gộp ngoại lệ của dự án và có phần New dependencies; dự án không có `project.yaml` (như repo kit) thì bỏ qua phần này;
    - đã chạy thật: `zod@4.1.12` bị báo đáng ngờ vì GHSA-mrhx-c7xc-m3w5 (sửa ở 4.6.6); `left-pad` vì giấy phép WTFPL; `org.mapstruct:mapstruct@1.6.3` đạt;
    - ngày phát hành của Maven lấy từ `Last-Modified` của POM trên repo1.maven.org, vì search.maven.org không trả lời.
- [x] **T14: chặn gói chưa duyệt; plan.** Xong 2026-11-20.
  - **Đạt khi:** gh-guard từ chối `pnpm add`, `npm install <gói>`, `mvn dependency:…`; hook Edit/Write từ chối sửa `<dependencies>` của `pom.xml`; job `policy` đỏ khi có gói trực tiếp mới chưa duyệt; `plan.md` có mục "Thư viện mới"; `/ao-plan` chạy `dep-check`; `/ao-request` nhận `Cần security:`.
  - **Kiểm:** tiêu chí 5 của spec bằng test.
  - **Kết quả:**
    - gh-guard đọc `approved` qua `lib/quality/approved-file.mjs`; nó cũng từ chối cài từ đường dẫn, URL hay git, và Edit hay Write thêm dependency vào `package.json`;
    - `security` được comment trên Jira, và lượt `Cần security:` của nó chạy ở `high`;
    - mục plan mang tên "New Libraries";
    - quyết định khi làm (đã ghi vào spec mục 5): ở plan, `dep-check --dry-run` chỉ báo bạn; lúc build, dev agent mới ghi vào `approved`, để PR tài liệu không chạm đường dẫn được bảo vệ;
    - 1.656 test xanh.

## Bước 7: role `seo`, nhánh `task/c1-7`

- [x] **T15: role, quyền, prompt** (spec mục 6.3, 6.4, 6.8). Xong 2026-11-20, commit `1b35852`.
  - **Đạt khi:** roster có `seo` (`tools: [Edit, Write, WebFetch, WebSearch]`, `jira: [read, comment]`, `writes: ["docs/specs/**", ".ai/**"]`, Sonnet `high`); `validate` báo lỗi khi role khác có WebFetch hay WebSearch; gh-guard giới hạn Read, Grep, Glob của `seo`; `contract/roles.yaml` và `work-items.yaml` có `seo`; prompt `seo.md` lấy SEO Specialist làm gốc.
  - **Kiểm:** tiêu chí 9 của spec bằng test.
  - **[bạn] Khi PR này merge:** thêm option "SEO Specialist" vào cuối Agent Field (tiền đề 3, dời từ T2); mình ghi từng bước bấm, rồi chạy `jira:check`.
  - **Kết quả:**
    - roster có `seo` đúng như trên, `max_turns` 60; luật A1 mới (`checkWeb`): WebSearch, WebFetch chỉ cho role trong `WEB_ROLES` (`lib/rules/references.mjs`), và role đó không có Bash; hai fixture mới;
    - gh-guard (`webRoleRead`): Read, Grep, Glob của `seo` chỉ trong thư mục dự án, kể cả không vào thư mục temp; từ chối `.env*` trừ `.env.example`; Grep phải có một file, một glob theo đuôi file, hay một type, vì Grep đọc mọi file dưới đường dẫn của nó;
    - prompt `agents/prompts/seo.md` lấy luật, phần từ khóa, chống trùng và phần on-page của SEO Specialist; bỏ phần audit trang đã chạy, backlink, Search Console (sau khi ra mắt, dòng D4);
    - fixture Jira ghi thêm option "SEO Specialist" của Agent Field; tài liệu ghi mười một agent;
    - lượt headless chạy theo chế độ quyền của bạn (`auto`), nên WebFetch chạy được; mình xác nhận ở lượt `seo` thật đầu tiên.
- [x] **T16: khi nào `seo` chạy** (spec mục 6.1, 6.2, 6.6 "commit thay"). Xong 2026-11-20.
  - **Đạt khi:** `spec-has-seo-screens` theo đúng năm bước của spec mục 6.1; khóa `seo` của app và luật `seo: true` cần `public: true`; `project-scaffold` hỏi khóa; cột "App" của `design.md`; hai từ `seo`, `no-seo`; `ba` ghi dòng "SEO: không"; `seo-commit` chỉ nhận `docs/specs/`.
  - **Kiểm:** tiêu chí 6 và 11 của spec bằng test.
  - **Kết quả:**
    - stage spec chạy `ba`, `ux`, `seo`, `sa`, `ba`; điều kiện `spec-has-seo-screens` và `spec-has-seo` ở `lib/workflow/conditions.mjs`;
    - luật P10 của `project.yaml`; `ao-kit add --public` phải kèm `--seo` hay `--no-seo` (lệnh không hỏi tương tác, nên bắt chọn thay cho hỏi);
    - cột App: không bắt buộc bằng `check-design`, vì 30 fixture và các `design.md` cũ của `shop` không có; thiếu cột thì màn hình được tính là có thể cần SEO, để không lỡ;
    - `no-seo` trên SPEC đã viết thì `ba` sửa SPEC một lần (`spec-revise`); `seo` trên PR tài liệu đang mở thì `seo` chạy ngay;
    - `ao-step` commit thay `seo` (`lib/workflow/seo-commit.mjs`) bằng git của bạn, push khi nhánh đã có trên GitHub; runner nhận `{ notes, stop }` từ bước sau lượt để dừng lệnh;
    - 1.672 test xanh.
  - **Còn ở T20:** `project.yaml` của `shop` thêm `seo: true` cho `user` và `seo: false` cho `admin`, trong PR chép kit.

## Bước 8: skill của `seo`, nhánh `task/c1-8`

- [x] **T17: bốn skill; D3** (spec mục 6.5). Xong 2026-11-20.
  - **Đạt khi:** phiên chính đọc hết `nextjs-seo` và sáu file tham khảo rồi mới chép (sai thì bỏ và báo bạn); ba skill viết lại có khối `adapted_from`; `skills:vendor` bỏ qua chúng; `docs/skills.md` ghi cách so với bản gốc; roster nạp bốn skill cho `seo`.
  - **Kết quả:**
    - `nextjs-seo` đạt: nội dung đúng, mới (bản 1.7.0), các mốc rich result khớp Search Central; chép bằng `skills:vendor` ở commit `3621047`;
    - ba skill chuyển thể: `seo-content-brief` (claude-seo `5ae8eec`), `blog-schema` và `blog-taxonomy` (Claude Blog v2.3.2 `4f9c2cb`), mỗi skill có khối `adapted_from` và file giấy phép MIT của bản gốc;
    - roster có danh sách mới `adapted_skills`; luật A4 kiểm khối `adapted_from`, cấm trùng tên với skill chép nguyên văn và tiền tố `ao-`; hai fixture mới; `skills:vendor` từ chối tên của skill chuyển thể;
    - `seo` nạp bốn skill; prompt của `seo` ghi skill nào dùng cho việc gì;
    - `docs/skills.md`: ba loại skill, cách thêm một skill chuyển thể, năm bước so với bản gốc, phần giữ và bỏ của từng skill;
    - bốn skill nạp vào mỗi lượt `seo` khoảng 3.600 chữ.

## Bước 9: nhãn `ao-seo`, nhánh `task/c1-9`

- [x] **T18: nhãn và `Cần seo:`** (spec mục 6.6, 6.7). Xong 2026-11-20.
  - **Đạt khi:** cột "SEO" của `plan.md`; `ba` gắn `ao-seo`; `tracker/jira.yaml` có nhãn; `/ao-intake` gắn nhãn, ghi comment `Cần seo:` sau OK, thêm ba yêu cầu của Epic blog; `/ao-request` nhận `seo`; prompt build, review, QA chỉ tới phần SEO theo bảng của spec mục 6.6.
  - **Kiểm:** tiêu chí 10 của spec bằng test.
  - **Kết quả:**
    - `tracker/jira.yaml` có `work_labels.seo: ao-seo`; `workLabels` trả `seo`, và không coi `ao-seo` là nhãn role dù `seo` là một role;
    - plan: mỗi dòng item chạm màn hình của mục `## SEO` có thêm `· seo: S1, S3` (prompt `sa`, template); `ba` gắn `ao-seo` theo đó;
    - `decideStep` thêm dòng phần SEO vào prompt của dev agent (build, fix), `reviewer` (review) và `qa` (qa, qa-defect) khi item có nhãn; `security` và item không nhãn không đổi;
    - `/ao-request` chạy `seo`; prompt yêu cầu của `seo` nói `ao-step` commit thay, vì `seo` không có git;
    - `/ao-intake`: check in các app `seo: true`; skill đề xuất nhãn, đoạn `Cần seo:` thành comment sau khi tạo item, ba yêu cầu của Epic blog;
    - `docs/dev-workflow.md` có đoạn "Nhãn `ao-seo`"; test mới `tests/workflow/steps-seo.test.mjs`; 1.686 test xanh.

## Bước 10: chép kit, nhánh `task/c1-10` rồi `shop`

- [x] **T19: chỗ nối `ci.project.yml`** (A6 mục 10, dòng 2). Xong 2026-11-20.
  - **Đạt khi:** `ci.yml` của kit gọi `jobs` của `.github/workflows/ci.project.yml` khi file có; `ao-kit sync` không đụng file đó.
  - **Kết quả:**
    - `ci.yml` có job thứ năm `project`, gọi `ci.project.yml` như một workflow được gọi; hai commit đi qua `inputs` (`head_sha`, `base_sha`), vì `env` của bên gọi không tới bên được gọi; không secret, chỉ `contents: read`;
    - file phải luôn có, vì thiếu thì cả lượt CI đỏ: kit có bản mẫu `kit/.github/workflows/ci.project.yml` với một job `none` có `if: false` (không tốn phút runner, tính là đạt);
    - `installKit` chép bản mẫu chỉ khi dự án chưa có (`SEED_FILES`), không bao giờ ghi đè; `kitDrift` chỉ báo khi file mất; `ao-kit init` và `sync` ghi một dòng khi chép bản mẫu;
    - luật Q2 chỉ đếm job có bước chạy: `project` không là check bắt buộc, vì GitHub đặt tên check của nó là `project / <job>`;
    - `docs/quality-gates.md` có mục "Job CI riêng của dự án"; README;
    - sửa thêm lỗi của bước 8: mô tả của `seo-content-brief` bị cắt ở "into the section", vì ` #` mở đầu comment của YAML; nay mô tả nằm trong dấu nháy, và test bắt mô tả phải trọn câu;
    - 1.689 test xanh.

### Checkpoint 4: sau T19
- [x] Mọi kit PR đã merge (kit PR #313–#323). Đã hỏi bạn ở Lượt 93, bạn nói "làm tiếp".

- [x] **T20 [bạn]: chép kit vào `shop`.** Xong 2026-11-20: SHOP-78 Done, cả Task 29,67 USD. Review đầy đủ (khoảng 10 USD). Đặt `seo: true` cho `user`, `seo: false` cho `admin`; chuyển `caddy-proxy` và `not-found` sang `ci.project.yml`. Bạn approve và merge.
  - PR #79 (SHOP-78), kit `719a696`: CI xanh sáu job; review tốn 14,10 USD. `reviewer` 0 Critical, 0 High, 4 Medium, 2 Low; `security` 2 High, 5 Medium.
  - Lượt 95: bạn chọn sửa mọi finding trong một kit PR (SPEC-c1.md mục 6.4), rồi dừng hỏi trước vòng review trả tiền. Bạn đồng ý thì merge kit PR, chép kit lại vào PR #79 và review lại.
  - Lượt 97: kit PR #324 merge (`5c25aca`); chép lại vào PR #79 (`1ff3358`), CI xanh bảy job. Review lần hai 14,49 USD (SHOP-78 tới giờ 28,59 USD): `reviewer` 0 Critical, 0 High, 4 Medium, 1 Low; `security` 0 Critical, 0 High, 4 Medium, 2 Low; cả hai Approve. Gộp chỗ trùng: 6 Medium và 3 Low, chờ bạn quyết có mở Task sửa kit không. Chờ bạn approve và merge PR #79.
  - Lượt 98: bạn đã merge PR #79 (`ccf4fde`). Deployer từ chối deploy vì mô tả PR có chữ `<KEY>`: đã sửa mô tả, `audit` chạy thử qua, rồi `/ao-rollback development ccf4fde`, deploy thành công. QA PASS (comment 10608, 1,08 USD; E2E Development 134/0/6; SHOP-78 tới giờ 29,67 USD), nhưng `qa` không Pick up được: Pick up và QA fail có hai rule Restrict tách rời (`ao-agents`, `ao-automation`), Jira đòi thuộc cả hai group. Chờ bạn gộp hai rule thành một trên Jira, rồi phiên chính Pick up bằng token CI và bạn Accept.
- [ ] **T20b: Task sửa kit cho 6 Medium và 3 Low của review lần hai PR #79, và lỗi `jira:check` với hai rule Restrict.** Danh sách và cách sửa: [followups-pr79.md](followups-pr79.md). Bạn đồng ý ở Lượt 101 ("làm T20b trước, rồi làm C2") và chọn cho mục 4: `seo` chạy cuối stage spec. Kit PR trên nhánh `task/c1-t20b`, mọi mục có test đỏ trước; chưa chép vào `shop`: lần chép kit của C2 mang luôn T20b và Low 9.
- [x] **T21: đóng module.** `verification.md` theo 11 tiêu chí của spec mục 12; cập nhật `concerns.md` (C1 xong, D3 xong), `SPEC.md` nếu cần, memory. Xong 2026-11-20 (Lượt 99): 10 tiêu chí đạt, tiêu chí 7 chờ Epic kế tiếp ([verification.md](verification.md)); `SPEC.md` không phải sửa.

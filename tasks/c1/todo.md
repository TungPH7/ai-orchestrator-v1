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

- [ ] **T7: hai danh sách đường dẫn, `pathTier`** (spec mục 3.2).
  - **Đạt khi:** `pathTier(files, gates)` trả tầng cao nhất, tính file đổi tên theo cả hai tên; `roster_effort_paths` bị bỏ khỏi `gates.yaml` và schema.
- [ ] **T8: effort theo tầng; luật tài liệu** (spec mục 3.1, 3.3).
  - **Đạt khi:**
    - roster `reviewer` là `high`;
    - tầng Nguy cấp: `reviewer` `xhigh`, `security` `max`; tầng Nhạy cảm: `security` `high`; tầng Thường: không có `security`;
    - vòng sau của `reviewer` chỉ xem phần mới;
    - PR chỉ đổi tài liệu của item Chuẩn hay Nặng: `reviewer` `high`, không có `security`.
  - **Kiểm:** tiêu chí 3 của spec (PR chạm controller; PR chạm `SecurityConfig.java`) bằng test.

## Bước 4: ba mức, nhánh `task/c1-4`

- [ ] **T9: `effectiveLevel`, nhãn mức** (spec mục 2, "Chọn mức", "Mức hiệu lực").
  - **Đạt khi:** không nhãn là Chuẩn; tầng Nguy cấp nâng lên Nặng; Critical hay High nâng một bậc và review lại head ở mức mới; cột "Mức" của `plan.md`; `ba` gắn nhãn; bản nháp `/ao-intake` có mức đề xuất.
- [ ] **T10: QA theo mức** (spec mục 2, "QA theo loại item", "QA lại", "QA của item Nhẹ").
  - **Đạt khi:**
    - `/ao-qa` của item Nhẹ không chạy agent, in Verification và URL; `qa-light.mjs` đăng báo cáo bằng token CI;
    - lần QA lại ở mức Chuẩn đưa danh sách tiêu chí đã FAIL vào prompt; mức Nặng kiểm đủ;
    - `--retest` giữ nguyên.
  - **Kiểm:** tiêu chí 8 của spec bằng test.
- [ ] **T11: Task finding của Epic** (spec mục 2, mục 4.3).
  - **Đạt khi:** Medium hay Low không sửa ngay thì `ao-step` tạo Task `ao-findings` (lần đầu), nối Blocks tới Epic, và thêm comment ghi PR, mã finding, chỗ.

## Bước 5: miễn review có dấu vết, nhánh `task/c1-5`

- [ ] **T12: `review.waivers`** (spec mục 3.4).
  - **Đạt khi:**
    - PR được miễn thì `ao-step review` không chạy agent; `ao-review` đăng review COMMENT có dòng `Waiver: light-docs`, mức và danh sách file;
    - `merge-gate` và `audit` tính lại bằng `waiverHolds`; luật không khớp thì xử lý như thiếu báo cáo;
    - `/ao-review <PR> full` chạy đủ hai role;
    - `review: off` chỉ ở `project.yaml`, và `doctor` báo đỏ.
  - **Kiểm:** tiêu chí 2 của spec bằng test, kể cả PR có thêm một file `.ts`.

### Checkpoint 3: sau T12
- [ ] Bước 1–5 đã merge; báo bạn kết quả test.

## Bước 6: duyệt thư viện, nhánh `task/c1-6`

- [ ] **T13: khối `dependencies`; `dep-check`** (spec mục 5; A6 mục 10, dòng 1).
  - **Đạt khi:** `approved` và `exceptions` có schema; `ao-kit sync` không ghi đè; `dep-check.mjs` kiểm OSV, giấy phép, tuổi gói, lượt tải, người duy trì, script lúc cài, provenance; lỗi mạng cho kết quả "nghi ngờ".
- [ ] **T14: chặn gói chưa duyệt; plan.**
  - **Đạt khi:** gh-guard từ chối `pnpm add`, `npm install <gói>`, `mvn dependency:…`; hook Edit/Write từ chối sửa `<dependencies>` của `pom.xml`; job `policy` đỏ khi có gói trực tiếp mới chưa duyệt; `plan.md` có mục "Thư viện mới"; `/ao-plan` chạy `dep-check`; `/ao-request` nhận `Cần security:`.
  - **Kiểm:** tiêu chí 5 của spec bằng test.

## Bước 7: role `seo`, nhánh `task/c1-7`

- [ ] **T15: role, quyền, prompt** (spec mục 6.3, 6.4, 6.8).
  - **Đạt khi:** roster có `seo` (`tools: [Edit, Write, WebFetch, WebSearch]`, `jira: [read, comment]`, `writes: ["docs/specs/**", ".ai/**"]`, Sonnet `high`); `validate` báo lỗi khi role khác có WebFetch hay WebSearch; gh-guard giới hạn Read, Grep, Glob của `seo`; `contract/roles.yaml` và `work-items.yaml` có `seo`; prompt `seo.md` lấy SEO Specialist làm gốc.
  - **Kiểm:** tiêu chí 9 của spec bằng test.
  - **[bạn] Khi PR này merge:** thêm option "SEO Specialist" vào cuối Agent Field (tiền đề 3, dời từ T2); mình ghi từng bước bấm, rồi chạy `jira:check`.
- [ ] **T16: khi nào `seo` chạy** (spec mục 6.1, 6.2, 6.6 "commit thay").
  - **Đạt khi:** `spec-has-seo-screens` theo đúng năm bước của spec mục 6.1; khóa `seo` của app và luật `seo: true` cần `public: true`; `project-scaffold` hỏi khóa; cột "App" của `design.md`; hai từ `seo`, `no-seo`; `ba` ghi dòng "SEO: không"; `seo-commit` chỉ nhận `docs/specs/`.
  - **Kiểm:** tiêu chí 6 và 11 của spec bằng test.

## Bước 8: skill của `seo`, nhánh `task/c1-8`

- [ ] **T17: bốn skill; D3** (spec mục 6.5).
  - **Đạt khi:** phiên chính đọc hết `nextjs-seo` và sáu file tham khảo rồi mới chép (sai thì bỏ và báo bạn); ba skill viết lại có khối `adapted_from`; `skills:vendor` bỏ qua chúng; `docs/skills.md` ghi cách so với bản gốc; roster nạp bốn skill cho `seo`.

## Bước 9: nhãn `ao-seo`, nhánh `task/c1-9`

- [ ] **T18: nhãn và `Cần seo:`** (spec mục 6.6, 6.7).
  - **Đạt khi:** cột "SEO" của `plan.md`; `ba` gắn `ao-seo`; `tracker/jira.yaml` có nhãn; `/ao-intake` gắn nhãn, ghi comment `Cần seo:` sau OK, thêm ba yêu cầu của Epic blog; `/ao-request` nhận `seo`; prompt build, review, QA chỉ tới phần SEO theo bảng của spec mục 6.6.
  - **Kiểm:** tiêu chí 10 của spec bằng test.

## Bước 10: chép kit, nhánh `task/c1-10` rồi `shop`

- [ ] **T19: chỗ nối `ci.project.yml`** (A6 mục 10, dòng 2).
  - **Đạt khi:** `ci.yml` của kit gọi `jobs` của `.github/workflows/ci.project.yml` khi file có; `ao-kit sync` không đụng file đó.

### Checkpoint 4: sau T19
- [ ] Mọi kit PR đã merge. Hỏi bạn trước T20.

- [ ] **T20 [bạn]: chép kit vào `shop`.** Review đầy đủ (khoảng 10 USD). Đặt `seo: true` cho `user`, `seo: false` cho `admin`; chuyển `caddy-proxy` và `not-found` sang `ci.project.yml`. Bạn approve và merge.
- [ ] **T21: đóng module.** `verification.md` theo 11 tiêu chí của spec mục 12; cập nhật `concerns.md` (C1 xong, D3 xong), `SPEC.md` nếu cần, memory.

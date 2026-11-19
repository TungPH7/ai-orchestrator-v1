# SPEC: C1, quy trình theo rủi ro và thứ tự chạy trong contract

> **Module:** C1 trong [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md).
>
> **Nguồn quyết định:** [misc/thao-luan/toi-uu-token/quyet-dinh-da-duyet.md](misc/thao-luan/toi-uu-token/quyet-dinh-da-duyet.md), mục A1–A6. Mọi điểm ở đó bạn đã duyệt trong Phiên 33 (Lượt 46–61).
>
> **Thảo luận:**
> - [danh-gia-chi-phi-shop-7.md](misc/thao-luan/toi-uu-token/danh-gia-chi-phi-shop-7.md)
> - [effort-va-bat-tat-review.md](misc/thao-luan/toi-uu-token/effort-va-bat-tat-review.md)
>
> **Trạng thái:** bản nháp, chờ bạn duyệt. Viết ở Phiên 33 · Lượt 71 (2026-11-19), khi bạn nói "Bắt đầu C1". Mục 13 là các điểm cần bạn trả lời. Có duyệt rồi mới lập plan.
>
> **Sửa ở Lượt 78** (theo câu hỏi của bạn ở Lượt 76–77):
> - mục 2: QA theo từng loại item, và lần QA lại khác nhau giữa mức Chuẩn và Nặng;
> - mục 6: prompt `seo` viết mới, thêm skill `nextjs-seo`;
> - mục 13: điểm 6 và điểm 9 mới.

## 1. Mục tiêu

**Hiện nay:**
- Mọi item đi cùng một quy trình nặng.
  - `reviewer` luôn chạy ở `xhigh`.
  - `security` chạy trên mọi PR: ở `max` khi PR chạm đường dẫn rủi ro, ở `high` (`lower_effort`) cho mọi PR khác, kể cả PR chỉ đổi tài liệu.
  - Mỗi item có một lượt `qa` riêng.
  - Finding Low vẫn mở vòng sửa.
- Ở Epic SHOP-7, review tốn 205 USD trên tổng 604 USD. SHOP-76 là một Task tài liệu đơn giản mà tốn 11,49 USD.
- Thư viện mới chỉ được kiểm sau khi dev đã cài và viết xong tính năng dựa trên nó.
- Thứ tự chạy của `/ao-spec`, `/ao-plan`, `/ao-build` viết cứng trong `lib/workflow/steps.mjs`, như `DEV_ORDER` và chuỗi `ba` → `ux` → `sa` → `ba`. Thêm một role, như `seo`, phải sửa code.

**Sau module này:**
1. **Mức quy trình:** mỗi item có một mức, Nhẹ, Chuẩn hay Nặng (A1). Review, QA và cách xử lý finding đi theo mức.
2. **Effort của review:** `reviewer` và `security` chạy mặc định ở `high`. Effort chỉ tăng theo mức của item và tầng đường dẫn mà PR chạm (A2).
3. **Miễn review:** PR đủ điều kiện được miễn review theo luật. `merge-gate` và `audit` tự tính lại luật đó, nên không lách được (A2).
4. **Finding:**
   - `reviewer` xếp mức finding theo một bảng tiêu chí;
   - một Medium không nêu được cách tái hiện thì bị hạ xuống Low;
   - `ao-step` không gợi ý `/ao-fix` khi không còn Critical hay High (A3).
5. **Thư viện mới:** được duyệt ở plan, hoặc qua `dep-check` trước khi cài. Hook và job `policy` chặn gói chưa duyệt (A4).
6. **Thứ tự chạy:** đọc từ `contract/stages.yaml`, kèm điều kiện `when`. Role `seo` được thêm bằng dữ liệu, không sửa code.
7. **Đo lại:** Epic kế tiếp đo USD trên mỗi AC (A5).

**Ngoài phạm vi:**
- Chạy song song do bộ điều phối tự quyết. Phần này thuộc C2.
- Đổi cách chia Story, Task, Sub-task. Bạn giữ như hiện nay (Lượt 61).
- Đổi DoD "Bộ regression pass" của Task (Lượt 46).
- Các việc A6 mà mục 10 đề xuất đưa sang C2.

## 2. Phần 1: ba mức quy trình (A1)

| Mức | Nhãn | Review | QA | Finding Medium, Low |
|---|---|---|---|---|
| Nhẹ | `ao-level-light` | `reviewer` `high` một lần; không có `security` | Không có lượt `qa`: phiên chính viết báo cáo QA ngắn trên Development, rồi bạn Accept | Gom vào Task finding của Epic |
| Chuẩn | `ao-level-standard`, hoặc không có nhãn | `reviewer` `high`; `security` chỉ khi PR chạm tầng Nhạy cảm hay Nguy cấp | Một lượt `qa` cho mỗi Story, Task, Bug. QA lại sau một lần QA fail: chỉ kiểm lại các tiêu chí đã FAIL, cộng cả bộ E2E | Gom vào Task finding của Epic |
| Nặng | `ao-level-heavy` | `reviewer` `xhigh`, `security` `max`, sửa tới khi không còn Critical hay High | Một lượt `qa` cho mỗi Story, Task, Bug. QA lại: kiểm đủ mọi tiêu chí, kèm bằng chứng mới, như hiện nay | Như hiện nay |

**QA theo loại item** (giống nhau ở mức Chuẩn và Nặng):
- **Story:** `qa` kiểm từng AC, mỗi AC có bằng chứng, không đòi gì ngoài SPEC, và chạy cả bộ E2E.
- **Sub-task:** không có QA riêng, ở cả ba mức, như hiện nay. Story chỉ có một PR, nên lượt QA của Story kiểm luôn phần việc của mọi Sub-task.
- **Task:** DoD "Bộ regression pass" giữ nguyên (Lượt 46). `qa` kiểm danh sách Verification và chạy cả bộ E2E. Chỉ Task Nhẹ, như Task tài liệu, không có lượt `qa`.
- **Bug:** `qa` kiểm rằng các bước tái hiện không còn ra lỗi, và chạy cả bộ E2E.

Bảng A1 của file quyết định ghi "`qa` một lần mỗi Story, theo AC". Câu đó chép từ đề xuất ở Lượt 49, lúc còn ý gộp Epic thành 6–8 Story to; nghĩa đúng là các dòng trên (Lượt 76).

**QA lại ở mức Chuẩn:**
1. `ao-step` biết đây là lần QA lại khi báo cáo QA mới nhất của item có kết quả FAIL.
2. `ao-step` đưa vào prompt danh sách tiêu chí đã FAIL, lấy từ báo cáo đó.
3. `qa` kiểm lại từng tiêu chí trong danh sách, kèm bằng chứng.
4. Tiêu chí đã PASS ở lần trước thì không kiểm lại bằng tay. Báo cáo mới ghi "PASS ở báo cáo <comment>".
5. Cả bộ E2E vẫn chạy. DoD của Story đòi mỗi AC có test E2E, nên một AC đã PASS mà bản sửa làm hỏng vẫn bị bắt. Với Task, dòng Verification nào không có test E2E thì `qa` vẫn kiểm lại dòng đó.

Ở mức Nặng, lần QA lại làm đủ như lần đầu.

`--retest` hiện có giữ nguyên: nó dành cho item có báo cáo NOT TESTED, và làm lại cả lượt QA ở mọi mức.

**Chọn mức:**
- **Item trong Epic:**
  1. `sa` ghi mức đề xuất cho từng item, trong cột "Mức" của bảng item trong `plan.md` (template `plan.md` thêm cột này).
  2. Bạn duyệt mức cùng plan ở gate ②.
  3. `ba` gắn nhãn mức khi tạo item.
- **Task hay Bug ngoài Epic:** bản nháp của `/ao-intake` ghi mức đề xuất, và bạn "OK" bản nháp là duyệt luôn mức đó.
- **Không có nhãn:** mức là Chuẩn.

**Mức hiệu lực:** `ao-step` tính lại trước mỗi bước, bằng hàm thuần `effectiveLevel` trong `lib/workflow/levels.mjs`.
- **Tăng tự động:**
  - PR chạm tầng Nguy cấp thì mức thành Nặng;
  - review hay QA tìm ra Critical hoặc High thì mức tăng một bậc.

  Khi mức tăng sau một lượt review ở mức thấp, `ao-step` review lại head hiện tại ở mức mới.
- **Chỉ bạn giảm mức:** đổi nhãn, kèm một comment ghi lý do. Không giảm được xuống dưới mức mà tầng đường dẫn đòi.
- **Bước đã chạy xong thì không chạy lại.** Mức mới áp từ bước kế tiếp, trừ việc review lại khi mức tăng.

**QA của item Nhẹ:** hợp đồng giữ nguyên các guard (`qa-report-passed` trước Accept). Item vẫn đi qua In QA, chỉ đổi người làm:
1. `/ao-qa <KEY>` của item Nhẹ không chạy agent.
2. Lệnh in danh sách Verification của item và URL của Development.
3. Phiên chính kiểm từng dòng.
4. Phiên chính viết báo cáo QA ngắn từ template `qa-report.md` bằng token CI, rồi bạn Accept.

Như vậy mọi item vẫn có báo cáo QA.

**Task finding của Epic:** khi một review có Medium hay Low không sửa ngay, `ao-step` thêm chúng vào một Task finding chung của Epic.
- `ao-step` tạo Task này bằng token CI khi Epic có finding đầu tiên, nhãn `ao-findings`, nối Blocks tới Epic.
- Mỗi lần thêm là một comment trên Task, ghi PR, mã finding và chỗ.
- Bạn Refine Task này khi muốn sửa.

## 3. Phần 2: review theo rủi ro (A2)

### 3.1 Effort mặc định

- **`reviewer`:** roster đổi từ `xhigh` về `high`, và chỉ lên `xhigh` ở mức Nặng hay tầng Nguy cấp.
- **`security`:** roster giữ `max`, nhưng `max` chỉ dùng ở mức Nặng hay tầng Nguy cấp. Tầng Nhạy cảm chạy `high`. Tầng Thường không chạy `security`; hiện nay mọi PR khác đều chạy `security` ở `high`.

### 3.2 Ba tầng đường dẫn

`quality/gates.yaml`, khóa `security_review.roster_effort_paths`, tách thành hai danh sách: `review.critical_paths` và `review.sensitive_paths`.

| Tầng | Mặc định của kit | `security` | `reviewer` |
|---|---|---|---|
| Nguy cấp | auth, cấu hình bảo mật, crypto, secret, `.github/workflows/**`, `.githooks/**`, `.claude/**`, `.ai-orchestrator/**`, migration (`**/db/migration/**`, `**/migrations/**`), `Dockerfile*`, `docker-compose*`, `deploy.yaml` | `max` | `xhigh` |
| Nhạy cảm | controller, DTO, domain, repository, service, middleware, file khai báo thư viện (`package.json`, lockfile, `pom.xml`) | `high` | không nâng |
| Thường | mọi file còn lại: UI, CSS, i18n, test, tài liệu | không chạy (CI vẫn chạy SAST, quét secret, `osv-scanner`) | không nâng |

- **Tính tầng:** hàm thuần `pathTier(files, gates)` trong `lib/quality/review-tiers.mjs` trả tầng cao nhất mà các file của PR chạm. File đổi tên được tính theo cả hai tên, như `protectedPaths`.
- **Effort cuối:** effort của mỗi role = mức cao hơn giữa mức của item và tầng của PR (bảng trên). Đường dẫn chỉ nâng effort, không bao giờ hạ.
- **Vòng review sau:** chỉ xem phần mới, ở `high`, như `security-scope` đang làm. Thay đổi duy nhất: `reviewer` cũng xem phần mới thay vì cả PR.

### 3.3 Luật cho tài liệu

- **PR chỉ đổi `docs/**` và `**/*.md`, của item Chuẩn hay Nặng:** `reviewer` ở `high`, không có `security`. Job `secrets` của CI vẫn quét PR.
- **PR như vậy của item Nhẹ:** miễn review (mục 3.4). Đây là đề xuất cho chỗ hai luật chồng nhau (F của file quyết định); xem mục 13, điểm 1.

### 3.4 Miễn review theo luật

**Chính sách:** `quality/gates.yaml` có khóa mới `review.waivers`.

```yaml
review:
  waivers:
    - id: light-docs
      level: light
      files: ["docs/**", "**/*.md", "**/*.png", "**/*.jpg", "**/*.webp", "**/messages/*.json", "**/locales/**"]
```

**Điều kiện miễn:** mọi file của PR khớp `files`, **và** mức hiệu lực của item bằng `level`. Chỉ một file nằm ngoài danh sách là review tự bật lại.

**Dấu vết:** `ao-step review` của PR được miễn thì không chạy agent. App `ao-review` đăng một review loại COMMENT lên head, với dòng `Waiver: light-docs`, mức hiệu lực và danh sách file. Review này đứng ở chỗ hai báo cáo.

**Kiểm lại ở ba chỗ:** `merge-gate` và `audit` của deployer tính lại luật từ diff và nhãn của item.
- Chúng không tin dòng `Waiver` nếu luật không khớp.
- Không khớp thì xử lý như khi thiếu báo cáo: `merge-gate` không merge, `audit` từ chối deploy.

**Hai việc còn nguyên:**
- **Bạn luôn bật lại được review:** `/ao-review <PR> full` chạy đủ hai role cho mọi PR.
- **Không có công tắc tắt review cho cả dự án.** Riêng một repo nháp có thể đặt `review: off` trong `project.yaml`, và `doctor` báo đỏ dòng này.

## 4. Phần 3: tiêu chí finding và luật dừng vòng sửa (A3)

1. **Bảng tiêu chí trong prompt của `reviewer`** (`agents/prompts/reviewer.md`) và trong `templates/review-report.md`. Mỗi mức có ví dụ cho từng trục: đúng sai, dữ liệu, tương thích, test, đọc hiểu.
   - **High:**
     - AC không đạt;
     - mất hay hỏng dữ liệu;
     - migration không tương thích bản trước;
     - Task đổi UI hay API công khai (luật cứng hiện có).
   - **Medium:** lỗi ở trường hợp biên có cách tái hiện; thiếu test cho hành vi mới.
   - **Low:** chữ, tên, comment, style.
2. **Medium phải có cách tái hiện:** báo cáo ghi input hay trạng thái nào, dẫn tới kết quả sai nào. Thiếu dòng này thì `readReviewReport` tính finding là Low, và `/ao-status` ghi lý do.
3. **Low không mở vòng sửa.** Medium cũng không, trừ khi bạn chọn sửa ngay bằng `/ao-fix <PR> <ghi chú>`. Cả hai vào Task finding của Epic (mục 2).
4. **Luật dừng trong `decideReview` và `decideFix`:** khi báo cáo trên head không còn Critical hay High, `ao-step` gợi ý approve, không gợi ý `/ao-fix`. `decideFix` không có ghi chú của bạn thì dừng với lý do "không còn gì chặn merge".

Giữ nguyên:
- định nghĩa bốn mức;
- chỉ Critical và High chặn merge;
- dòng `Accept risk: <mã> until <ngày>: <lý do>`.

## 5. Phần 4: duyệt thư viện trước khi cài (A4)

**Danh sách đã duyệt:** khối `dependencies` mới của `.ai-orchestrator/project.yaml`.
- File này là của dự án, `ao-kit sync` không ghi đè, và nằm ở đường dẫn được bảo vệ.
- Cùng khối có `exceptions`: ngoại lệ audit riêng của dự án (A6, mục 10).

```yaml
dependencies:
  approved:
    - { ecosystem: npm, name: zod, range: "^4", by: plan SHOP-7, on: "2026-11-20" }
    - { ecosystem: maven, name: org.mapstruct:mapstruct, range: "1.6.x", by: dep-check, on: "2026-11-21" }
  exceptions: []
```

**Ở plan:**
1. `plan.md` có mục "Thư viện mới": tên, phiên bản, lý do.
2. `/ao-plan` chạy `dep-check` trên từng thư viện trong mục đó.
3. Thư viện không qua được kiểm thì `security` xem riêng nó, ở `high`.
4. Bạn duyệt cùng plan.
5. Phiên chính thêm các thư viện vào `approved` trên nhánh tài liệu của Epic.

**Giữa lúc build:** `node .ai-orchestrator/scripts/dep-check.mjs <npm|maven> <tên>@<phiên bản>` kiểm:
- lỗ hổng (OSV);
- giấy phép, so với danh sách `dependencies.licenses` của `gates.yaml`;
- tuổi gói (ít nhất 14 ngày), lượt tải, số người duy trì;
- script lúc cài;
- provenance của npm, nếu có.

Kết quả:
- **Đạt:** lệnh ghi thư viện vào `approved`, kèm `by: dep-check`. Dev cài và commit cả dòng đó.
- **Có dấu hiệu nghi ngờ:** lệnh không ghi gì, và in lý do. Dev comment `Cần security:` trên item. `security` chạy một lượt ngắn chỉ cho thư viện đó.

**Chặn:**
- **gh-guard:** từ chối `pnpm add`, `npm install <gói>` và `mvn dependency:…` khi gói chưa nằm trong `approved`. Agent sửa phần `<dependencies>` của `pom.xml` thì hook `Edit`/`Write` cũng từ chối như vậy.
- **Job `policy`:** đỏ khi lockfile hay `pom.xml` của PR có gói trực tiếp mới chưa nằm trong `approved`. Gói bắc cầu và việc nâng phiên bản gói đã có thì để `audit` và `osv-scanner` lo, như hiện nay.
- **Review PR:** `security` không kiểm lại thư viện, chỉ xem cách code dùng nó.

## 6. Phần 5: thứ tự chạy trong contract và role `seo` (C1 gốc)

**File mới `contract/stages.yaml`:**

```yaml
stages:
  spec:
    - { role: ba, purpose: spec-write }
    - { role: ux, purpose: design, when: spec-has-screens }
    - { role: seo, purpose: seo-brief, when: epic-has-public-pages }
    - { role: sa, purpose: spec-nfr, when: spec-lacks-nfr }
    - { role: ba, purpose: docs-pr }
  plan:
    - { role: sa, purpose: plan-write }
    - { role: ba, purpose: docs-pr }
  build:
    order: [be-dev, fe-dev, devops]
  review:
    - { role: reviewer }
    - { role: security, when: tier-sensitive-or-critical }
```

**Đọc file này:**
- `when` chỉ được nêu tên một điều kiện trong danh sách cố định `lib/workflow/conditions.mjs`. Đó là các hàm thuần trên facts, như `spec-has-screens` (`SCREENS.test(docs.spec)` hiện nay).
- `npm run validate` báo lỗi khi gặp tên điều kiện lạ, hay role không có trong `roles.yaml`.
- `decideSpec`, `decidePlan`, `decideBuild`, `decideReview` đọc danh sách thay cho mảng viết cứng.
- Cùng facts thì quyết định phải giống hệt như trước: một bộ test so quyết định trên mọi fixture hiện có của `tests/workflow/` trước và sau khi đổi.

**Role `seo`:** dùng cho Epic có trang công khai, tức `public: true` trong `project.yaml`.
1. Ở stage spec, `seo` viết mục `## SEO` của SPEC cho từng màn hình công khai:
   - tiêu đề và mô tả;
   - dữ liệu có cấu trúc;
   - đường dẫn canonical;
   - sitemap;
   - ảnh chia sẻ.
2. `reviewer` đối chiếu mục `## SEO` khi review PR.
3. `qa` kiểm meta trên Development như một AC.
4. `seo` chạy Sonnet ở `high` (`agents/roster.yaml`).
5. **Prompt `agents/prompts/seo.md` viết mới cho kit.**
   - **Không chép agent SEO Specialist** của agency-agents (`marketing/marketing-seo-specialist.md`, MIT), vì ba lý do:
     - agent đó làm SEO marketing: từ khóa, cụm chủ đề, backlink, số liệu Search Console;
     - nó cần WebFetch và WebSearch, mà kit không cấp cho agent nào (spec 2.3 của roster);
     - nó dài khoảng 3.000 chữ, và lượt nào cũng phải nạp hết.
   - **Prompt chỉ lấy ý,** như `qa` đã làm với hai agent của agency-agents:
     - từ SEO Specialist: mỗi truy vấn chỉ có một trang chính; tiêu đề và H1 không trùng giữa các trang; canonical và ngôn ngữ nhất quán;
     - từ `seo-schema` của claude-seo: chỉ dùng loại dữ liệu có cấu trúc mà Google còn hỗ trợ (ví dụ FAQ đã bị bỏ rich result);
     - từ `seo-ecommerce`: Product kèm Offer, có giá và tình trạng còn hàng;
     - từ `seo-hreflang`: các bản ngôn ngữ trỏ qua lại nhau, có `x-default`.
6. **Skill `nextjs-seo`, chỉ cho `seo`** (bạn duyệt ở Lượt 80).
   - **Nguồn:** repo `laguagu/claude-code-nextjs-skills`, giấy phép MIT.
   - **Cách đưa vào kit:** thêm vào `vendored_skills` của roster, ghim theo commit như các skill khác (`npm run skills:vendor`).
   - **Vì sao chọn skill này:**
     - đúng Next.js App Router: Metadata API, `sitemap.ts` và `robots.ts`, canonical, đa ngôn ngữ, JSON-LD an toàn, ảnh chia sẻ, tức đúng năm thứ của mục `## SEO`;
     - nhỏ: khoảng 500 chữ, sáu file tham khảo chỉ đọc khi cần;
     - không cần Python, URL thật hay API trả phí.
   - **Kiểm trước khi đưa vào:** repo nhỏ (74 sao), nên phiên chính đọc hết `SKILL.md` và sáu file tham khảo trước. Nội dung sai hay lỗi thời thì bỏ skill, `seo` chỉ dùng prompt, và báo bạn.
   - **Chưa cho `fe-dev`:** `fe-dev` làm theo mục `## SEO` của SPEC. Thêm skill cho `fe-dev` khi review ở Epic đầu thấy lỗi SEO trong code.
   - Bản nháp đầu của spec đề xuất "chưa thêm skill". Lúc đó mình chưa xem skill SEO nào; đề xuất đổi sau khi xem các nguồn bạn cài (Lượt 76–77).
7. **Không lấy skill nào khác:**
   - **claude-seo:** phần lớn skill audit một URL thật bằng script Python, như `parse_html.py`, `page_checks.py` và `render_page.py`. Kit chỉ có Node, agent của kit không có WebFetch, và Development nằm sau basic auth. Nhiều skill khác cần API trả phí hay tài khoản riêng (DataForSEO, Google).
   - **Claude Blog:** dành cho bài blog, mà `shop` chưa có blog. Xét lại khi có Epic làm blog.
   - Hai plugin vẫn dùng được trong phiên chính, ở user scope, ví dụ để audit Production sau mỗi release.
8. Agent Field của Jira thêm giá trị "SEO Specialist", và `docs/jira-setup.md` ghi bước bấm.

Phần này phải xong trước Epic đầu tiên cần SEO (concerns.md, điểm 8).

## 7. Phần 6: đo lại (A5)

Ở Epic kế tiếp của `shop`:
1. **USD trên mỗi AC:** `/ao-status <Epic>` in thêm dòng này, tính từ `state.json` của các item. Lượt có chi phí chưa biết được ghi riêng. Mốc so sánh: SHOP-7 tốn 21,6 USD trên mỗi AC (604 USD cho AC1–AC28).
2. **So `xhigh` với `high`:** chạy thêm một lượt `reviewer` `xhigh` mù trên 3–5 PR Chuẩn, rồi so finding với lượt `high`. Kết quả ghi vào `tasks/` của Epic.

## 8. Cấu hình

| File | Thêm hay đổi |
|---|---|
| `agents/roster.yaml` | `reviewer`: `high`; thêm role `seo`; thêm `nextjs-seo` vào `vendored_skills` |
| `agents/prompts/seo.md` | mới (mục 6) |
| `agents/prompts/qa.md` | lần QA lại ở mức Chuẩn (mục 2) |
| `contract/roles.yaml`, `contract/work-items.yaml` | role `seo`; giá trị Agent "SEO Specialist" |
| `contract/stages.yaml` | mới (mục 6) |
| `quality/gates.yaml` | `review.critical_paths`, `review.sensitive_paths`, `review.waivers`, `dependencies.licenses`; bỏ `security_review.roster_effort_paths` |
| `tracker/jira.yaml` | `work_labels.level_prefix: ao-level-`; nhãn `ao-findings` |
| `project.yaml` của dự án | khối `dependencies` (`approved`, `exceptions`) |
| `templates/plan.md` | cột "Mức" của bảng item; mục "Thư viện mới" |
| `templates/review-report.md` | bảng tiêu chí; dòng tái hiện của Medium |

## 9. Thứ tự làm

Mỗi phần là một kit PR, với test viết đỏ trước. Phiên chính làm và tự merge khi CI xanh, như các đợt followup.

| Bước | Phần | Ước lượng |
|---|---|---|
| 1 | Phần 5: thứ tự chạy trong contract, chưa có `seo` (chỉ dời code, không đổi hành vi) | 1 PR |
| 2 | Phần 3: tiêu chí finding, luật dừng | 1 PR |
| 3 | Phần 2: effort `high`, ba tầng đường dẫn, luật tài liệu | 1 PR |
| 4 | Phần 1: ba mức, nhãn, QA của mức Nhẹ, QA lại theo mức, Task finding của Epic | 1–2 PR |
| 5 | Phần 2: miễn review có dấu vết (`merge-gate`, `audit`) | 1 PR |
| 6 | Phần 4: `dep-check`, danh sách đã duyệt, hook, `policy` | 1–2 PR |
| 7 | Role `seo`, prompt mới, skill `nextjs-seo` | 1 PR |
| 8 | Chép kit vào `shop` một lần, có review (khoảng 10 USD) | PR của `shop` |

Bước 1 đi trước, vì các bước sau đọc stages từ contract. Bước 3 và 4 đổi chi phí nhiều nhất.

## 10. A6: đề xuất chỗ đặt

| Việc | Đề xuất | Lý do |
|---|---|---|
| Ngoại lệ audit riêng của dự án | **C1**, bước 6 | Cùng khối `dependencies` của `project.yaml`. `ao-kit sync` không còn xóa ngoại lệ của dự án, như từng xảy ra với picomatch ở SHOP-74. |
| Kit ghi đè job CI riêng của dự án | **C1**, bước 8 | `ci.yml` của kit có thêm chỗ nối, `jobs` của file `.github/workflows/ci.project.yml` do dự án giữ. `ao-kit sync` không đụng file đó. `shop` chuyển `caddy-proxy` và `not-found` sang file đó, nên lần chép sau không phải đặt lại bằng tay. |
| Review kit một lần ở repo kit | **Để sau C2** | Với một dự án, chi phí gần như bằng nhau (Lượt 39). Cách tiết kiệm thật là gom nhiều bản sửa vào một lần chép, như đã làm. |
| `/ao-preview` khi bật làn | **C2** | Việc này thuộc lớp chạy song song. |
| `profiles:check` đỏ | Xong | Kit PR #310: `next` 16.4.6. |

## 11. Ranh giới

- **Luôn:**
  - giữ guard của hợp đồng: mọi item có báo cáo QA trước Accept, chỉ Critical và High chặn merge;
  - `merge-gate` và `audit` tự tính lại mọi luật miễn;
  - với cùng facts, hành vi cũ giữ y như trước khi chưa có nhãn mức.
- **Hỏi bạn:**
  - giảm mức của một item;
  - thêm mẫu vào `review.waivers` hay `critical_paths`;
  - cho `security` từ chối hay chấp nhận một thư viện nghi ngờ;
  - chép kit vào `shop`.
- **Không bao giờ:**
  - tắt review cho cả `shop`;
  - để nhãn hay dòng `Waiver` tự nó mở merge mà không tính lại;
  - để agent tự thêm gói vào `approved` ngoài `dep-check`.

## 12. Tiêu chí hoàn thành

1. Bộ test của kit xanh. Bộ so quyết định trước và sau khi dời thứ tự vào contract (bước 1) không có khác biệt.
2. Một PR chỉ đổi tài liệu của item Nhẹ trên `shop` merge mà không có lượt agent review, và `audit` cho deploy. Một PR giống hệt nhưng có thêm một file `.ts` thì bị đòi review.
3. Một PR Chuẩn chạm controller chạy `reviewer` `high` và `security` `high`. Một PR chạm `SecurityConfig.java` chạy `xhigh` và `max`, và mức của item tự lên Nặng.
4. Một Medium không có cách tái hiện bị tính là Low. Review không còn Critical hay High thì `ao-step` gợi ý approve.
5. `pnpm add` một gói chưa duyệt bị gh-guard từ chối, còn `dep-check` một gói đạt thì cho cài. `policy` đỏ khi lockfile có gói trực tiếp mới chưa duyệt.
6. `/ao-spec` của một Epic có trang công khai chạy `seo` sau `ux`, với skill `nextjs-seo` đã nạp. Epic không có trang công khai thì không chạy `seo`.
7. Epic kế tiếp của `shop` có số USD trên mỗi AC, so được với 21,6 USD của SHOP-7.
8. Lần QA lại của một Story Chuẩn sau QA fail chỉ kiểm các tiêu chí đã FAIL, cộng cả bộ E2E. Với Story Nặng, lần QA lại kiểm đủ mọi tiêu chí.

## 13. Điểm cần bạn duyệt

1. **PR chỉ đổi tài liệu của item Nhẹ** (F của file quyết định): miễn hẳn review, theo đề xuất, hay `reviewer` ở `high`?
2. **QA của item Nhẹ:** phiên chính kiểm Verification rồi viết báo cáo QA ngắn, bạn Accept (mục 2). Đồng ý không?
3. **Task finding của Epic:** `ao-step` tự tạo Task này bằng token CI, rồi thêm Medium và Low bằng comment. Đồng ý không, hay bạn muốn `ba` tạo?
4. **Tầng Nguy cấp** có cả `.ai-orchestrator/**` và `.claude/**`. Mọi PR chép kit sẽ là Nặng, giống như hiện nay. Giữ vậy không?
5. **Danh sách đã duyệt nằm trong `project.yaml` của dự án** (mục 5), cùng ngoại lệ audit. Đồng ý chỗ đặt này không?
6. **Role `seo`:** viết mục SEO ở stage spec, `reviewer` và `qa` đối chiếu; Sonnet `high`. Hai câu hỏi:
   - Có cần `seo` review PR riêng không? Đề xuất là không.
   - Prompt và skill: viết mới prompt `seo` và thêm skill `nextjs-seo`, chỉ cho `seo` (mục 6). **Bạn duyệt skill `nextjs-seo` ở Lượt 80.** Bản nháp đầu đề xuất "chưa thêm skill"; đề xuất đổi ở Lượt 77. Phần nội dung trang công khai (chữ, tiêu đề, bố cục bài) đang thảo luận ở Lượt 80.
7. **A6** theo bảng ở mục 10: hai việc vào C1, hai việc để sau.
8. **Thứ tự làm** theo mục 9: phần 5 trước, chép kit một lần ở cuối.
9. **QA lại** (mục 2): ở mức Chuẩn chỉ kiểm lại các tiêu chí đã FAIL, cộng cả bộ E2E; ở mức Nặng kiểm đủ như hiện nay. Đồng ý không?

## Nguồn

- [quyet-dinh-da-duyet.md](misc/thao-luan/toi-uu-token/quyet-dinh-da-duyet.md): A1–A6, F.
- [danh-gia-chi-phi-shop-7.md](misc/thao-luan/toi-uu-token/danh-gia-chi-phi-shop-7.md): chi phí SHOP-7, mục 5.
- [effort-va-bat-tat-review.md](misc/thao-luan/toi-uu-token/effort-va-bat-tat-review.md): effort, miễn review, tiêu chí finding.
- [SPEC-kit-copy-review.md](SPEC-kit-copy-review.md): bài thử review mù 2026-11-07.
- [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md): hàng C1, điểm 8.
- Nguồn cho role `seo` (Lượt 76), đều giấy phép MIT:
  - agent SEO Specialist: `agency-agents/marketing/marketing-seo-specialist.md`;
  - plugin claude-seo 2.6.0: các skill `seo-schema`, `seo-ecommerce`, `seo-hreflang`;
  - skill `nextjs-seo`: repo `laguagu/claude-code-nextjs-skills`.

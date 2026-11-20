# SPEC: C1, quy trình theo rủi ro và thứ tự chạy trong contract

> **Module:** C1 trong [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md).
>
> **Nguồn quyết định:**
> - [misc/thao-luan/toi-uu-token/quyet-dinh-da-duyet.md](misc/thao-luan/toi-uu-token/quyet-dinh-da-duyet.md), mục A1–A6. Mọi điểm ở đó bạn đã duyệt trong Phiên 33 (Lượt 46–61).
> - [misc/thao-luan/seo/role-seo-va-blog.md](misc/thao-luan/seo/role-seo-va-blog.md), mục 1: các quyết định về role `seo` và blog, bạn duyệt ở Lượt 80–85.
>
> **Thảo luận:**
> - [danh-gia-chi-phi-shop-7.md](misc/thao-luan/toi-uu-token/danh-gia-chi-phi-shop-7.md)
> - [effort-va-bat-tat-review.md](misc/thao-luan/toi-uu-token/effort-va-bat-tat-review.md)
> - [seo/role-seo-va-blog.md](misc/thao-luan/seo/role-seo-va-blog.md)
>
> **Trạng thái:** đã duyệt 2026-11-19 (Phiên 33 · Lượt 87): bạn trả lời đủ 12 điểm của mục 13. Viết ở Lượt 71, khi bạn nói "Bắt đầu C1". Plan: [tasks/c1/plan.md](tasks/c1/plan.md), bạn duyệt ở Lượt 88.
>
> **Sửa ở Lượt 78** (theo câu hỏi của bạn ở Lượt 76–77):
> - mục 2: QA theo từng loại item, và lần QA lại khác nhau giữa mức Chuẩn và Nặng;
> - mục 6: prompt `seo` viết mới, thêm skill `nextjs-seo` (Lượt 86 đổi thành: lấy SEO Specialist làm gốc rồi viết gọn);
> - mục 13: điểm 6 và điểm 9 mới.
>
> **Sửa ở Lượt 86** (bạn gõ "làm" sau thảo luận SEO ở Lượt 79–85):
> - mục 1: mục tiêu SEO, D2 và D4 ngoài phạm vi;
> - mục 6: viết lại phần role `seo`, thành các mục 6.1–6.8;
> - mục 8, 9, 12: cấu hình, thứ tự làm và tiêu chí cho phần SEO;
> - mục 13: điểm 6 rút gọn, thêm điểm 10–12.

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
- Kit chưa lo SEO: không role nào viết từ khóa, title, meta, dữ liệu có cấu trúc hay chữ của trang công khai. Dự án có website công khai thì luôn cần SEO để lên top Google, và các website sắp làm sẽ có blog (Lượt 82).

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
8. **SEO:** role `seo` viết phần SEO của trang công khai ở stage spec, kể cả trang blog. Item phải làm và kiểm SEO mang nhãn `ao-seo` (mục 6).

**Ngoài phạm vi:**
- Chạy song song do bộ điều phối tự quyết. Phần này thuộc C2.
- Workflow viết bài blog: dòng D2 của `concerns.md`, một module riêng ngay sau C1 (mục 6.7).
- Phần SEO chỉ làm được sau khi site chạy thật (audit, Search Console, backlink, thứ hạng): dòng D4, lệnh SEO định kỳ.
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

  **Quyết định khi làm T10 (Lượt 88):** chỉ finding Critical hay High của review nâng mức. QA FAIL không tự nâng, vì hai lẽ:
  - báo cáo QA không ghi mức cho lỗi;
  - nếu mỗi QA FAIL nâng item Chuẩn lên Nặng, thì lần QA lại ở mức Chuẩn (chỉ kiểm tiêu chí đã FAIL, mục trên) không bao giờ dùng tới.
- **Chỉ bạn giảm mức:** đổi nhãn, kèm một comment ghi lý do. Không giảm được xuống dưới mức mà tầng đường dẫn đòi.
- **Bước đã chạy xong thì không chạy lại.** Mức mới áp từ bước kế tiếp, trừ việc review lại khi mức tăng.

**QA của item Nhẹ:** hợp đồng giữ nguyên các guard (`qa-report-passed` trước Accept). Item vẫn đi qua In QA, chỉ đổi người làm:
1. `/ao-qa <KEY>` của item Nhẹ không chạy agent.
2. Lệnh in danh sách Verification của item và URL của Development.
3. Phiên chính kiểm từng dòng.
4. Phiên chính viết báo cáo QA ngắn từ template `qa-report.md` bằng token CI, rồi bạn Accept.

Như vậy mọi item vẫn có báo cáo QA.

**Quyết định khi làm T10 (Lượt 88):** Pick up và QA fail của item Nhẹ đứng tên một role mới, `light-qa`, thuộc identity `automation` (token CI, group `ao-automation`), chứ không phải `automation`. Lý do: `jira-sync` tự chạy mọi transition của `automation` khi guard đạt. Pick up không có guard, nên nếu thuộc `automation` thì `jira-sync` sẽ tự kéo mọi item Ready for QA sang In QA. Bạn cần thêm group `ao-automation` vào rule Restrict của hai transition này trên Jira ([docs/jira-setup.md](docs/jira-setup.md)).

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
- **PR như vậy của item Nhẹ:** miễn review (mục 3.4). Đây là chỗ hai luật chồng nhau (F của file quyết định); bạn chọn miễn hẳn review ở Lượt 87 (mục 13, điểm 1).

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

**Quyết định khi làm T14 (Lượt 90):** bước 5 đổi. `project.yaml` là đường dẫn được bảo vệ, nên nếu phiên chính ghi nó trên nhánh tài liệu, `merge-gate` không còn tự merge PR tài liệu sau gate ②. Thay vào đó:
- ở plan, phiên chính chạy `dep-check --dry-run` (bước 2), chỉ để báo bạn, không ghi gì;
- lúc build, dev agent chạy `dep-check` thật. Thư viện đạt thì lệnh ghi vào `approved`, và dev agent commit dòng đó cùng code, trong PR mà bạn merge.

Mục trong `plan.md` mang tên tiếng Anh, "New Libraries", như các mục khác của template.

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

**Khóa `runs` mới trong `contract/stages.yaml`:** file này đã có, và khai cổng, stage, môi trường, nhịp làm việc, luật release. Bản nháp đầu của spec ghi nhầm là "file mới" (sửa khi lập plan, Lượt 87). Mỗi stage `spec`, `plan`, `build`, `review` của file thêm khóa `runs`; khối dưới viết gọn theo id của stage:

```yaml
stages:
  spec:
    - { role: ba, purpose: spec-write }
    - { role: ux, purpose: design, when: spec-has-screens }
    - { role: seo, purpose: seo-brief, when: spec-has-seo-screens }
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
- **Thêm khi làm T3 (Lượt 88):** mỗi run còn có `done`, cũng là tên một điều kiện: đầu ra của run đã có, như `design-written`, nên run không chạy lại. Một điều kiện trả `null` khi đầu vào của nó chưa có, như màn hình của một SPEC mà `ba` chưa viết; run đó vẫn vào danh sách dự báo, kèm chữ của điều kiện. Khối trên viết gọn nên không ghi `done`; bản đủ nằm trong `contract/stages.yaml`.
- `npm run validate` báo lỗi khi gặp tên điều kiện lạ, hay role không có trong `roles.yaml`.
- `decideSpec`, `decidePlan`, `decideBuild`, `decideReview` đọc danh sách thay cho mảng viết cứng.
- Cùng facts thì quyết định phải giống hệt như trước: một bộ test so quyết định trên mọi fixture hiện có của `tests/workflow/` trước và sau khi đổi.

**Role `seo`:** viết phần SEO của các trang cần lên Google, kể cả trang blog. Thảo luận và mọi quyết định nằm trong [misc/thao-luan/seo/role-seo-va-blog.md](misc/thao-luan/seo/role-seo-va-blog.md) (Lượt 76–85). Mục tiêu bạn đặt ra ở Lượt 82: kit sẵn sàng cho dự án thật có website công khai, không chỉ cho `shop`.

### 6.1 Khi nào `seo` chạy (Lượt 82–84)

1. **Mỗi app có khóa `seo: true` hay `false`** trong `project.yaml`.
   - Hiện nay `public: true` chỉ có nghĩa là app có host riêng trên internet (`lib/release/hosts.mjs`). Trong `shop`, cả `user` lẫn `admin` đều là `public: true`, nên kit cần một khóa riêng.
   - Với `shop`: `user` là `true`, `admin` là `false`.
   - `npm run validate` báo lỗi khi một app có `seo: true` mà không có `public: true`.
   - `project-scaffold` hỏi khóa này khi thêm một app có host công khai.
2. **Bảng Screens của `design.md` thêm cột "App"**, để kit biết mỗi màn hình thuộc app nào. `ux` điền cột này.
3. **Hai từ cho `/ao-spec`:** `/ao-spec <EPIC> seo` bật `seo`; `/ao-spec <EPIC> no-seo [lý do]` tắt `seo`.
4. **Điều kiện `spec-has-seo-screens`**, một hàm thuần trong `lib/workflow/conditions.mjs`, xét theo thứ tự:
   1. `design.md` không có màn hình nào của app `seo: true`: không chạy, kể cả khi có từ `seo`. `ao-step` in một dòng giải thích.
   2. Có từ `no-seo`: không chạy. `ba` ghi vào SPEC một dòng "SEO: không, vì <lý do>"; không có lý do thì ghi "bạn chọn `no-seo`".
   3. Có từ `seo`: chạy, kể cả khi SPEC đang có dòng "SEO: không".
   4. Không có từ nào: chạy, trừ khi SPEC có dòng "SEO: không" từ lần chạy trước. Mặc định là bật, vì website công khai luôn cần SEO, và quên bật thì trang lên production không có SEO, tới lúc thấy đã muộn.
   5. SPEC đã có mục `## SEO`: bước này đã xong, như bước của các role khác.
5. **Epic không có nhãn SEO.** Quyết định nằm ngay trong SPEC: mục `## SEO`, hoặc dòng "SEO: không". Bạn thấy nó khi duyệt SPEC ở cổng ①. Nhãn chỉ gắn trên item (mục 6.6).

### 6.2 `seo` viết gì (Lượt 80–82)

Ở stage spec, sau `ux` và trước `sa`, `seo` viết mục `## SEO` của SPEC, chỉ cho màn hình của app `seo: true`. Màn hình admin tự được bỏ qua.
- **Từ khóa:**
  - từ khóa chính và phụ của từng trang, ý định tìm kiếm;
  - chỗ của trang trong cụm chủ đề: trang trụ cột hay trang vệ tinh;
  - lượt tìm mỗi tháng: lấy số bạn ghi trong Epic (từ Google Keyword Planner); không có thì ghi "chưa có số liệu".
- **Chống trùng:** mỗi từ khóa chính chỉ thuộc một trang. Title và H1 không trùng với các trang đang có trong repo.
- **Chữ thật, cả `vi` và `en`:**
  - H1, các heading, đoạn mở đầu, nút kêu gọi, title, meta description, alt của ảnh;
  - `fe-dev` đưa nguyên văn vào `messages/*.json`, còn `reviewer` và `qa` đối chiếu nguyên văn.
- **Kỹ thuật:**
  - dữ liệu có cấu trúc, chỉ dùng loại Google còn hỗ trợ;
  - canonical;
  - hreflang: các bản ngôn ngữ trỏ qua lại nhau, có `x-default`;
  - `lang` của từng trang;
  - sitemap, robots, ảnh chia sẻ.
- **Ngưỡng Core Web Vitals:** LCP dưới 2,5 giây, INP dưới 200 ms, CLS dưới 0,1. `seo` ghi các ngưỡng này trong mục `## SEO`, như yêu cầu phi chức năng của các trang đó. Ở lần chạy đầu của một Epic, `sa` chạy sau `seo` (thứ tự trong `contract/stages.yaml`), nên yêu cầu phi chức năng dẫn tới các ngưỡng này, không chép lại.
- **Dữ liệu động,** như mô tả sản phẩm, do admin nhập. `seo` chỉ viết vài dòng hướng dẫn cho người nhập (độ dài, cách trình bày), để đưa vào hướng dẫn sử dụng.
- **Trang blog** (phần (a) của blog, mục 6.7):
  - dữ liệu có cấu trúc BlogPosting, kèm Person (tác giả), Organization, BreadcrumbList;
  - quy tắc slug;
  - cấu trúc chuyên mục và tag, tránh trang tag mỏng;
  - trang tác giả, phục vụ E-E-A-T;
  - ngày đăng và ngày sửa;
  - hreflang cho bài `vi` và `en`;
  - canonical của trang phân trang.

`seo` không có git, nên `ao-step` commit phần của `seo` sau mỗi lượt (mục 6.6). Không giao việc này cho `sa`: ở lần chạy lại `/ao-spec`, `sa` chỉ chạy khi SPEC chưa có yêu cầu phi chức năng, nên có thể không có lượt `sa` nào sau `seo`.

### 6.3 Prompt `agents/prompts/seo.md` (Lượt 82)

- **Lấy SEO Specialist làm gốc.** Agent này của agency-agents (`marketing/marketing-seo-specialist.md`, MIT) đúng là chuyên gia bạn mong đợi. Bản gốc dài khoảng 3.000 chữ, nên viết lại cho gọn, chỉ giữ phần chạy được trong `/ao-spec`:
  - giai đoạn 2: từ khóa và ý định tìm kiếm, cụm chủ đề;
  - giai đoạn 2.5: chống "ăn thịt từ khóa";
  - phần spec của giai đoạn 3: dàn ý, chữ, dữ liệu có cấu trúc, hreflang, ngưỡng Core Web Vitals;
  - các luật: chỉ dùng cách "mũ trắng", ý định người tìm đi trước, E-E-A-T, tối ưu cho AI search.
- **Lấy thêm ý từ claude-seo:**
  - `seo-schema`: chỉ dùng loại Google còn hỗ trợ (FAQ đã bị bỏ rich result);
  - `seo-ecommerce`: Product kèm Offer, có giá và tình trạng còn hàng;
  - `seo-hreflang`: trỏ qua lại, có `x-default`.
- **Không đưa vào prompt** giai đoạn 1 (audit site thật, Search Console), giai đoạn 4 (backlink, PR) và giai đoạn 5 (thứ hạng, lưu lượng, ROI). Các phần này chỉ làm được sau khi site chạy thật, nên thuộc dòng D4 của `concerns.md`: lệnh SEO định kỳ, làm sau C1.
- **Yêu cầu `Cần seo:`:** trả lời như `ux` và `sa` (mục 6.6).
- `seo` chạy Sonnet ở `high`.

### 6.4 Quyền của `seo` (Lượt 81–85)

- **Có WebSearch và WebFetch,** để xem trang nào đứng đầu một từ khóa, loại trang và tiêu đề của đối thủ. `seo` là role duy nhất có hai công cụ này. Luật "không agent nào có WebFetch, WebSearch" (spec 2.3 của roster) đổi thành "chỉ `seo`", và `npm run validate` báo lỗi khi một role khác có chúng.
- **Đổi lại, `seo` bị bớt quyền:**
  - `tools: [Edit, Write, WebFetch, WebSearch]`: không có Bash, nên không chạy được lệnh nào, kể cả git;
  - `writes: ["docs/specs/**", ".ai/**"]`: thư mục `.ai/` chỉ chứa ledger mà role nào cũng ghi, và không bao giờ được commit;
  - `jira: [read, comment]`: comment để trả lời `Cần seo:`, giống `ux` (Lượt 122). `seo` không tạo, không sửa item, không chuyển trạng thái.
- **Rủi ro 1, viết sai:** một trang web chứa lệnh chèn có thể làm `seo` viết sai trong SPEC hay trong comment. Có ba lớp chặn:
  - bạn đọc SPEC ở cổng ①, hay đọc comment trước khi Refine;
  - `reviewer` xem code;
  - `qa` kiểm trên Development.
- **Rủi ro 2, rò dữ liệu** (phát hiện khi viết spec này, Lượt 86): `seo` vừa đọc được file vừa gửi được request ra internet. Một trang có lệnh chèn có thể bảo nó đọc một bí mật rồi gắn vào URL của WebFetch.
  - Hiện nay gh-guard (`lib/quality/commands.mjs`) chỉ chặn agent đọc file khóa, file backup và `hosts.yml` của `gh`. File `.env` và file ngoài dự án vẫn đọc được bằng Read.
  - **Cách chặn** (bạn duyệt ở Lượt 87): gh-guard giới hạn Read, Grep và Glob của `seo` trong thư mục dự án, và từ chối các file `.env*`, trừ `.env.example`. Các role khác giữ như cũ.
- **Sửa sau review của `shop` PR #79** (T20, bạn chọn sửa mọi finding ở Lượt 95). `security` tìm ra hai High và năm Medium, `reviewer` bốn Medium và hai Low, đều trong code của kit:
  - `writes` của `seo` thu về `["docs/specs/*/spec.md", ".ai/ledger/*.seo.md"]`. Ledger riêng của `seo` không agent nào có Bash đọc; `ao-step` chỉ commit thay `seo` đúng `docs/specs/<EPIC>/spec.md`, và trên nhánh tài liệu chỉ SPEC của chính Epic đó;
  - file lái phiên agent (`CLAUDE.md`, `AGENTS.md`, `.claude/` lồng, `.mcp.json` …) ở mọi độ sâu luôn ở tầng Nguy cấp, do code quyết. Không luật miễn nào phủ chúng, PR tài liệu có chúng thành PR thường, và không agent nào ghi được `.claude/` lồng;
  - `seo` không đọc file git bỏ qua, không đọc `.env` ở mọi cách viết Windows mở được, chỉ Grep code và tài liệu, không ghi ra temp, và chỉ WebFetch trang mà WebSearch của chính lượt đó trả về, hay tài liệu của Google, schema.org, Next.js, web.dev và MDN. Hook PostToolUse mới `web-search.mjs` ghi các trang đó;
  - nhãn mức: hook `block-atlassian` chặn agent đổi nhãn mức qua `update.labels` (riêng `ba` gắn khi tạo item), và `ao-step`, `merge-gate`, `audit` bỏ qua thay đổi nhãn mức do tài khoản agent làm, đọc từ changelog;
  - tầng Thường: thêm vào `sensitive_paths` các file bảo mật mà `security` thấy rơi vào tầng này ở `shop`, và khối `review` của `project.yaml` cho dự án thêm đường dẫn riêng;
  - duyệt thư viện: Edit được xét trên cả file sau khi sửa; alias, nguồn ngoài registry và registry khác bị từ chối, cả trong `overrides`; phiên bản phải nằm trong `range` đã duyệt; `npx` và `dlx` chỉ tải gói đã duyệt hay công cụ của kit; `.npmrc`, `.yarnrc*`, `bunfig.toml` thành đường dẫn được bảo vệ.

### 6.5 Skill của `seo` (Lượt 80–84)

1. **`nextjs-seo`, chép nguyên văn** (bạn duyệt ở Lượt 80).
   - **Nguồn:** repo `laguagu/claude-code-nextjs-skills`, giấy phép MIT.
   - **Cách đưa vào kit:** thêm vào `vendored_skills` của roster, ghim theo commit như các skill khác (`npm run skills:vendor`).
   - **Vì sao chọn skill này:**
     - đúng Next.js App Router: Metadata API, `sitemap.ts` và `robots.ts`, canonical, đa ngôn ngữ, JSON-LD an toàn, ảnh chia sẻ;
     - nhỏ: khoảng 500 chữ, sáu file tham khảo chỉ đọc khi cần;
     - không cần Python, URL thật hay API trả phí.
   - **Kiểm trước khi đưa vào:** repo nhỏ (74 sao), nên phiên chính đọc hết `SKILL.md` và sáu file tham khảo trước. Nội dung sai hay lỗi thời thì bỏ skill và báo bạn.
2. **`seo-content-brief`, chép rồi viết lại** (Lượt 81). Skill này nằm trong claude-seo, bản quyền puneetindersingh, MIT.
   - **Giữ:** ý định tìm kiếm, dàn ý H1/H2/H3, chỗ đặt từ khóa, quy tắc meta, E-E-A-T, liên kết nội bộ, mẫu theo loại trang.
   - **Bỏ:** chế độ Improve, bảng chấm đối thủ, khoảng trống so với đối thủ, DataForSEO, Ahrefs.
   - **Viết lại:** bước 2–3 (đọc trang, sitemap và các trang đứng đầu Google) làm bằng WebSearch và WebFetch, không dùng script.
   - **Thêm:** ghi vào mục `## SEO` của SPEC, chữ `vi` và `en`, nguồn từ khóa của mục 6.2.
3. **`blog-schema` và `blog-taxonomy`, chép rồi viết lại** (phần (a) của blog). Hai skill này nằm trong Claude Blog 2.3.2, MIT.
   - `blog-schema`: JSON-LD cho bài blog, có kiểm theo mức Google còn hỗ trợ.
   - `blog-taxonomy`: chỉ lấy phần gợi ý và audit cấu trúc chuyên mục, tag; bỏ phần đồng bộ với WordPress hay Shopify.
4. **Chỗ đặt skill viết lại:** `kit/.claude/skills/<tên>/`, cạnh các skill `ao-*`.
   - Đầu file ghi repo, commit gốc, giấy phép và bản quyền của tác giả.
   - `npm run skills:vendor` không cập nhật các skill này; khi bản gốc có bản mới thì so bằng tay.
   - Đây là trường hợp đầu của dòng D3 trong `concerns.md`. C1 làm luôn D3, kèm một trang `docs/` ghi cách so với bản gốc khi bản gốc có bản mới (bạn duyệt ở Lượt 87, điểm 10 của mục 13).
5. **Chưa cho `fe-dev` skill nào:** `fe-dev` làm theo phần SEO của item. Khi review ở Epic đầu thấy lỗi SEO trong code thì mới thêm skill cho `fe-dev`.
6. **Không lấy skill nào khác:**
   - **claude-seo:** phần lớn skill audit một URL thật bằng script Python, như `parse_html.py`, `page_checks.py` và `render_page.py`. Kit chỉ có Node, và Development nằm sau basic auth. Nhiều skill khác cần API trả phí hay tài khoản riêng (DataForSEO, Google).
   - **Claude Blog:** phần còn lại (kế hoạch, viết, kiểm, dịch bài) dành cho D2.
   - Hai plugin vẫn dùng được trong phiên chính, ở user scope, ví dụ để audit Production sau mỗi release.

**Quyết định khi làm T17 (Lượt 91):**
- **`nextjs-seo` được chép**, ghim ở commit `3621047` (bản 1.7.0, 2026-11-14), commit cuối chạm thư mục skill. Phiên chính đọc hết `SKILL.md` và sáu file tham khảo, rồi đối chiếu các mốc rich result với trang Search Central updates: khớp.
- **Chỗ ghi nguồn gốc của skill chuyển thể:** chỉ một chỗ, khối `adapted_from` trong frontmatter của `SKILL.md`. Roster chỉ ghi tên, trong danh sách mới `adapted_skills`. Luật A4 kiểm khối này; `skills:vendor` từ chối tên của chúng.
- **Giấy phép:** file giấy phép MIT của bản gốc nằm cạnh `SKILL.md`, nguyên văn.
- **Độ dài meta description:** 150–160 ký tự, theo prompt của `seo`; bản gốc của `seo-content-brief` ghi 130–150.
- Phần giữ, phần bỏ của từng skill nằm ở `docs/skills.md`.

### 6.6 Nhãn `ao-seo` và yêu cầu `Cần seo:` (Lượt 83–85)

**Item trong Epic:**
1. `sa` ghi cột "SEO" (có hay không) trong bảng item của `plan.md`, cạnh cột "Mức". "Có" khi item chạm một màn hình nằm trong mục `## SEO`.
2. Bạn duyệt ở cổng ②.
3. `ba` gắn nhãn `ao-seo` khi tạo item. Task cho trang admin không có nhãn này.

**Item ngoài Epic** (`/ao-intake`): chỉ có thể là Task hay Bug. Việc mà người dùng thấy kết quả thì thành một Epic nhỏ, đi qua `/ao-spec`. Ví dụ: Task "thêm dữ liệu có cấu trúc Product cho trang sản phẩm".
1. Bản nháp đề xuất nhãn `ao-seo` khi việc chạm trang của app `seo: true`. Khi phần SEO chưa ai viết, bản nháp có thêm một đoạn `Cần seo:` ghi điều cần hỏi.
2. Bạn OK thì phiên chính tạo item có nhãn, rồi ghi comment `Cần seo:` đúng chữ trong bản nháp. Từ đó intake ghi lên Jira hai lần: tạo item, và comment này.
3. `/ao-request <KEY>` chạy `seo`. `seo` comment phần SEO lên item, kèm danh sách "Kiểm" cho `qa`. Comment này đóng yêu cầu.
4. Bạn đọc comment, rồi bấm Refine.

Bug sai so với mục `## SEO` của một SPEC cũ thì không cần `Cần seo:`: bản nháp trỏ tới mục đó.

**Không có nhãn `ao-no-seo`:** item không có `ao-seo` là không làm SEO.

**Tác dụng của nhãn:** với item có `ao-seo`, prompt của `/ao-build`, `/ao-review` và `/ao-qa` chỉ tới phần SEO của item:

| Item | Phần SEO nằm ở |
|---|---|
| Story hay Task trong Epic | mục `## SEO` của SPEC |
| Task hay Bug ngoài Epic | comment của `seo` trên item |
| Bug ngoài Epic, sai so với SPEC cũ | mục `## SEO` của SPEC mà item trỏ tới |

- Phần SEO không được chép vào description của Story: SPEC là nguồn duy nhất, nên không có hai bản lệch nhau.
- `fe-dev` làm theo nguyên văn. `reviewer` đối chiếu code. `qa` kiểm thẻ meta, dữ liệu có cấu trúc, canonical và chữ trên Development. Item không có nhãn thì ba role này bỏ qua phần SEO.

**`Cần seo:` trong Epic:**
- Khi bạn sửa SPEC ở phần chạm SEO, `ba` nhờ `seo` bằng `Cần seo:`, như với `ux` và `sa`.
- Sau khi SPEC đã merge, `/ao-request` làm theo luật hiện có: item có nhánh thì `seo` sửa `spec.md` trên nhánh đó; không có nhánh thì `seo` chỉ comment điều cần đổi, và bạn quyết định.

**Quyết định khi làm T18 (Lượt 91):**
- **"Cột SEO" của plan là một đoạn trên dòng item**, `· seo: S1, S3`, như `level` và `effort`, vì Task List của plan là danh sách dòng chứ không phải bảng. Đoạn này ghi mã màn hình item chạm. Không có đoạn `seo:` là không có phần SEO.
- **`/ao-fix` cũng chỉ tới phần SEO**, như `/ao-build`, vì dev agent sửa code của chính phần đó.
- **`security` không nhận dòng SEO.** Phần SEO không phải việc bảo mật.

**`ao-step` commit thay `seo`:** sau mỗi lượt của `seo` trên một nhánh, ở `/ao-spec` hay `/ao-request`, `ao-step` commit phần đổi, chỉ khi nó nằm trong `docs/specs/`. Có file khác bị đổi thì `ao-step` dừng và báo bạn. Nhánh đã có PR thì `ao-step` push luôn, như role khác làm sau khi commit.

`/ao-request` nhận `seo` là role được nhờ, và `/ao-status` liệt kê yêu cầu `Cần seo:` như các yêu cầu khác.

### 6.7 Blog (Lượt 82–84)

- **(a) Tính năng blog** của một dự án là một Epic bình thường. C1 chuẩn bị cho Epic đó: phần trang blog của mục 6.2, cùng hai skill `blog-schema` và `blog-taxonomy` của mục 6.5.
- **(b) Viết bài** là dòng D2: một module riêng, làm ngay sau C1 và trước C2, không thuộc C1. D2 cần Epic blog có sẵn ba thứ:
  - trạng thái nháp;
  - link xem trước mà người ngoài không thấy;
  - công cụ đăng bài gọi API của Admin, ví dụ `scripts/post-publish.mjs <file bài>`, được review một lần.

  `/ao-intake` của một Epic blog đưa ba yêu cầu này vào bản nháp, để D2 không phải sửa lại tính năng blog (bạn duyệt ở Lượt 87, điểm 11 của mục 13).

### 6.8 Jira

- Agent Field có thêm giá trị "SEO Specialist", và `docs/jira-setup.md` ghi các bước bấm.
- `tracker/jira.yaml` có thêm nhãn `ao-seo`.

Phần này phải xong trước Epic đầu tiên cần SEO (concerns.md, điểm 8).

## 7. Phần 6: đo lại (A5)

Ở Epic kế tiếp của `shop`:
1. **USD trên mỗi AC:** `/ao-status <Epic>` in thêm dòng này, tính từ `state.json` của các item. Lượt có chi phí chưa biết được ghi riêng. Mốc so sánh: SHOP-7 tốn 21,6 USD trên mỗi AC (604 USD cho AC1–AC28).
2. **So `xhigh` với `high`:** chạy thêm một lượt `reviewer` `xhigh` mù trên 3–5 PR Chuẩn, rồi so finding với lượt `high`. Kết quả ghi vào `tasks/` của Epic.

## 8. Cấu hình

| File | Thêm hay đổi |
|---|---|
| `agents/roster.yaml` | `reviewer`: `high`; thêm role `seo` với quyền của mục 6.4; luật 2.3 thành "chỉ `seo` có WebFetch, WebSearch"; thêm `nextjs-seo` vào `vendored_skills` |
| `lib/agents/roster.mjs`, `tests/agents/` | `npm run validate` báo lỗi khi role khác `seo` có WebFetch hay WebSearch |
| `lib/quality/commands.mjs` (gh-guard) | Read, Grep, Glob của `seo` chỉ trong dự án, từ chối `.env*` trừ `.env.example` (mục 6.4) |
| `agents/prompts/seo.md` | mới, lấy SEO Specialist làm gốc (mục 6.3) |
| `agents/prompts/qa.md` | lần QA lại ở mức Chuẩn (mục 2); kiểm phần SEO của item có `ao-seo` (mục 6.6) |
| `agents/prompts/fe-dev.md`, `agents/prompts/reviewer.md` | làm theo và đối chiếu phần SEO của item có `ao-seo` |
| `agents/prompts/ba.md` | dòng "SEO: không" khi có `no-seo`; nhãn `ao-seo` theo cột "SEO" của plan; nhờ `seo` bằng `Cần seo:` |
| `agents/prompts/sa.md` | cột "SEO" của bảng item; yêu cầu phi chức năng dẫn tới ngưỡng Core Web Vitals của mục `## SEO` |
| `agents/prompts/ux.md` | cột "App" của bảng Screens |
| `kit/.claude/skills/seo-content-brief/`, `blog-schema/`, `blog-taxonomy/` | mới: chép rồi viết lại, đầu file ghi nguồn (mục 6.5) |
| `kit/.claude/skills/ao-spec/SKILL.md` | hai từ `seo` và `no-seo` |
| `kit/.claude/skills/ao-intake/SKILL.md` | nhãn `ao-seo`, comment `Cần seo:` sau khi bạn OK, ba yêu cầu của Epic blog |
| `kit/.claude/skills/ao-request/SKILL.md`, `lib/workflow/` | `seo` là role được nhờ; `ao-step` commit thay `seo`; prompt của build, review, QA chỉ tới phần SEO (mục 6.6) |
| `lib/workflow/conditions.mjs` | điều kiện `spec-has-seo-screens` (mục 6.1) |
| `contract/roles.yaml`, `contract/work-items.yaml` | role `seo`; giá trị Agent "SEO Specialist" |
| `contract/stages.yaml`, `contract/schema/stages.schema.json` | khóa `runs` của bốn stage (mục 6) |
| `quality/gates.yaml` | `review.critical_paths`, `review.sensitive_paths`, `review.waivers`, `dependencies.licenses`; bỏ `security_review.roster_effort_paths` |
| `tracker/jira.yaml` | `work_labels.level_prefix: ao-level-`; nhãn `ao-findings`, `ao-seo` |
| `project.yaml` của dự án | khối `dependencies` (`approved`, `exceptions`); khóa `seo` của từng app (mục 6.1) |
| `lib/scaffold/` (`project-scaffold`) | hỏi khóa `seo` khi thêm app có host công khai |
| `templates/plan.md` | cột "Mức" và cột "SEO" của bảng item; mục "Thư viện mới" |
| `templates/design.md` | cột "App" của bảng Screens |
| `templates/spec.md` | mục `## SEO` |
| `templates/review-report.md` | bảng tiêu chí; dòng tái hiện của Medium |
| `docs/jira-setup.md`, `docs/dev-workflow.md`, `docs/agents.md` | giá trị Agent "SEO Specialist"; role `seo`, nhãn `ao-seo`, hai từ của `/ao-spec` |

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
| 7 | Role `seo`: roster và luật web, gh-guard cho `seo`, `stages.yaml`, khóa `seo` của app, cột "App" của `design.md`, hai từ của `/ao-spec`, `ao-step` commit thay `seo`, prompt mới | 1 PR |
| 8 | Skill của `seo`: chép `nextjs-seo`; viết lại `seo-content-brief`, `blog-schema`, `blog-taxonomy`; chỗ đặt skill viết lại (D3) | 1 PR |
| 9 | Nhãn `ao-seo`: cột "SEO" của `plan.md`, `/ao-intake`, `/ao-request`, prompt của build, review, QA | 1 PR |
| 10 | Chép kit vào `shop` một lần, có review (khoảng 10 USD); đặt khóa `seo` cho hai app của `shop` | PR của `shop` |

Bước 1 đi trước, vì các bước sau đọc stages từ contract. Bước 3 và 4 đổi chi phí nhiều nhất.

## 10. A6: đề xuất chỗ đặt

| Việc | Đề xuất | Lý do |
|---|---|---|
| Ngoại lệ audit riêng của dự án | **C1**, bước 6 | Cùng khối `dependencies` của `project.yaml`. `ao-kit sync` không còn xóa ngoại lệ của dự án, như từng xảy ra với picomatch ở SHOP-74. |
| Kit ghi đè job CI riêng của dự án | **C1**, bước 8 | `ci.yml` của kit có thêm chỗ nối, `jobs` của file `.github/workflows/ci.project.yml` do dự án giữ. `ao-kit sync` không đụng file đó. `shop` chuyển `caddy-proxy` và `not-found` sang file đó, nên lần chép sau không phải đặt lại bằng tay. |
| *Quyết định khi làm T19 (Lượt 92)* | | `ci.project.yml` phải luôn có, vì workflow được gọi mà thiếu thì cả lượt CI đỏ: kit chép một bản mẫu khi dự án chưa có, rồi không ghi đè. Job `project` không là check bắt buộc: GitHub đặt tên check theo job của file được gọi (`project / <job>`). Lần chép kit đầu có bản mẫu thêm một file ngoài kit, nên PR đó không dùng lại được review của dự án khác. |
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
6. `/ao-spec` của một Epic có màn hình thuộc app `seo: true` chạy `seo` sau `ux`, với các skill của `seo` đã nạp, và SPEC có mục `## SEO`. Epic chỉ có màn hình của app `seo: false` thì không chạy `seo`, kể cả khi có từ `seo`. Có từ `no-seo` thì không chạy, và SPEC có dòng "SEO: không, vì …".
7. Epic kế tiếp của `shop` có số USD trên mỗi AC, so được với 21,6 USD của SHOP-7.
8. Lần QA lại của một Story Chuẩn sau QA fail chỉ kiểm các tiêu chí đã FAIL, cộng cả bộ E2E. Với Story Nặng, lần QA lại kiểm đủ mọi tiêu chí.
9. `npm run validate` báo lỗi khi một role khác `seo` có WebFetch hay WebSearch. gh-guard từ chối `seo` đọc một file `.env` hay một file ngoài dự án.
10. Một Task ngoài Epic có nhãn `ao-seo`: `/ao-intake` ghi comment `Cần seo:`; `/ao-request` chạy `seo`, và comment của `seo` đóng yêu cầu; prompt của `/ao-build` chỉ tới comment đó. Với một Story có `ao-seo` trong Epic, prompt chỉ tới mục `## SEO` của SPEC.
11. Một lượt của `seo` trên nhánh, ở `/ao-spec` hay `/ao-request`, chỉ đổi `docs/specs/` thì `ao-step` commit; lượt đổi file khác thì `ao-step` dừng.

Tiêu chí 6, 9, 10 và 11 kiểm bằng test của kit. Lần chạy thật đầu tiên là Epic đầu tiên cần SEO của một dự án.

## 13. Điểm bạn đã duyệt (Lượt 87)

| Điểm | Câu hỏi | Bạn trả lời |
|---|---|---|
| 1 | PR chỉ đổi tài liệu của item Nhẹ (F của file quyết định): miễn hẳn review, hay `reviewer` ở `high`? | Miễn hẳn review, theo đề xuất (mục 3.3, 3.4) |
| 2 | QA của item Nhẹ: phiên chính kiểm Verification rồi viết báo cáo QA ngắn, bạn Accept (mục 2) | Đồng ý |
| 3 | Task finding của Epic: `ao-step` tự tạo bằng token CI, rồi thêm Medium và Low bằng comment | Đồng ý |
| 4 | Tầng Nguy cấp có cả `.ai-orchestrator/**` và `.claude/**`, nên mọi PR chép kit là Nặng | Giữ |
| 5 | Danh sách thư viện đã duyệt nằm trong `project.yaml` của dự án, cùng ngoại lệ audit (mục 5) | Đồng ý |
| 6 | `seo` có review PR riêng không? | Theo đề xuất: không. `reviewer` đối chiếu code với phần SEO, `qa` kiểm trên Development |
| 7 | A6 theo bảng ở mục 10: hai việc vào C1, hai việc để sau | Theo đề xuất |
| 8 | Thứ tự làm theo mục 9: phần 5 trước, chép kit một lần ở cuối | Theo đề xuất |
| 9 | QA lại (mục 2): mức Chuẩn chỉ kiểm lại tiêu chí đã FAIL, cộng cả bộ E2E; mức Nặng kiểm đủ | Đồng ý |
| 10 | C1 làm luôn D3: chỗ đặt skill viết lại, đầu file ghi nguồn, trang `docs/` ghi cách so với bản gốc | Đồng ý |
| 11 | `/ao-intake` của một Epic blog đưa vào bản nháp ba yêu cầu mà D2 cần (mục 6.7) | Đồng ý |
| 12 | gh-guard giới hạn Read, Grep, Glob của `seo` trong dự án, từ chối `.env*` trừ `.env.example` (mục 6.4) | Đồng ý |

## Nguồn

- [quyet-dinh-da-duyet.md](misc/thao-luan/toi-uu-token/quyet-dinh-da-duyet.md): A1–A6, F.
- [danh-gia-chi-phi-shop-7.md](misc/thao-luan/toi-uu-token/danh-gia-chi-phi-shop-7.md): chi phí SHOP-7, mục 5.
- [effort-va-bat-tat-review.md](misc/thao-luan/toi-uu-token/effort-va-bat-tat-review.md): effort, miễn review, tiêu chí finding.
- [SPEC-kit-copy-review.md](SPEC-kit-copy-review.md): bài thử review mù 2026-11-07.
- [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md): hàng C1, điểm 8.
- [misc/thao-luan/seo/role-seo-va-blog.md](misc/thao-luan/seo/role-seo-va-blog.md): thảo luận SEO và blog, Lượt 76–85.
- Nguồn cho role `seo` (Lượt 76–82), đều giấy phép MIT:
  - agent SEO Specialist: `agency-agents/marketing/marketing-seo-specialist.md`;
  - plugin claude-seo 2.6.0: skill `seo-content-brief` (bản quyền puneetindersingh), và ý từ `seo-schema`, `seo-ecommerce`, `seo-hreflang`;
  - plugin Claude Blog 2.3.2: skill `blog-schema`, `blog-taxonomy`;
  - skill `nextjs-seo`: repo `laguagu/claude-code-nextjs-skills`.

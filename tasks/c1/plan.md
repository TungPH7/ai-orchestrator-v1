# Plan triển khai: C1

> **Spec:** [SPEC-c1.md](../../SPEC-c1.md), đã duyệt 2026-11-19 (Phiên 33 · Lượt 87). **Trạng thái:** đã duyệt 2026-11-19 (Phiên 33 · Lượt 88). **Danh sách task:** [todo.md](todo.md).

## Tổng quan

C1 có bảy phần:
- **Phần 1, ba mức quy trình (A1):** spec mục 2.
- **Phần 2, review theo rủi ro (A2):** spec mục 3.
- **Phần 3, tiêu chí finding và luật dừng (A3):** spec mục 4.
- **Phần 4, duyệt thư viện (A4):** spec mục 5.
- **Phần 5, thứ tự chạy trong contract:** spec mục 6, phần đầu.
- **Phần 6, đo lại (A5):** spec mục 7.
- **SEO:** spec mục 6.1–6.8.

Làm theo mười bước của spec mục 9. Mỗi bước là một kit PR, với test viết đỏ trước. Chép kit vào `shop` một lần ở cuối. Trước khi viết code, task đầu kiểm ba tiền đề.

## Quyết định kiến trúc

1. **Mỗi bước một nhánh và một PR.**
   - Nhánh `task/c1-<số bước>` tách từ `main`; mỗi task một commit.
   - Phiên chính tự merge khi CI xanh (spec mục 9), như các đợt followup.
   - Nhờ vậy kit trên `main` không bao giờ ở nửa chừng một bước.
2. **Hàm quyết định thuần, script mỏng,** như các module trước. Các module thuần mới:
   - `lib/workflow/conditions.mjs`: các điều kiện `when` (bước 1, bước 7);
   - `lib/quality/review-tiers.mjs`: `pathTier` (bước 3);
   - `lib/workflow/levels.mjs`: `effectiveLevel` (bước 4);
   - `lib/quality/waivers.mjs`: luật miễn, dùng chung cho `ao-step`, `merge-gate` và `audit` (bước 5);
   - `lib/quality/dependencies.mjs`: so gói mới với `approved`, dùng chung cho gh-guard, `dep-check` và job `policy` (bước 6).

   Mọi việc chạm git, mạng và Jira nằm trong `scripts/`.
3. **Thứ tự chạy nằm trong `contract/stages.yaml` đã có, không trong file mới.**
   - Spec mục 6 ghi "file mới", nhưng file này đã có: nó khai cổng, stage, môi trường, nhịp làm việc và luật release.
   - Mỗi stage `spec`, `plan`, `build`, `review` thêm khóa `runs`, theo đúng nội dung ở spec mục 6. `contract/schema/stages.schema.json` thêm khóa đó.
   - Danh sách `roles` của stage vẫn giữ, và `npm run validate` kiểm mỗi role trong `runs` có trong `roles` của stage.
   - Mình sửa câu "file mới" trong spec ở T1.
4. **Bộ so quyết định trước và sau khi dời thứ tự** (bước 1):
   - một test chạy `decideStep` trên mọi fixture hiện có của `tests/workflow/` với bản cũ và bản mới, rồi so từng quyết định;
   - bản cũ được giữ trong test dưới dạng ảnh chụp kết quả (snapshot JSON trong `tests/fixtures/`), chụp trước khi sửa code.
5. **Effort và mức cùng một chỗ.** `reviewRuns` gọi `effectiveLevel` và `pathTier`, rồi lấy mức cao hơn. `fullReviewEffort` của `security-scope.mjs` được thay bằng hàm này, và `security_review.roster_effort_paths` bị bỏ (bước 3, 4).
6. **Mức của item là nhãn Jira `ao-level-*`,** đọc qua `facts`, như nhãn `ao-effort-*` hiện có.
   - Không có nhãn thì mức là Chuẩn, nên mọi item cũ giữ hành vi cũ. Điều này đúng với luật "với cùng facts, hành vi cũ giữ y như trước" của spec mục 11.
   - Mức chỉ tăng: `effectiveLevel` tính lại từ nhãn, tầng đường dẫn của PR và finding Critical hay High đã có.
7. **Phiên chính viết báo cáo QA của item Nhẹ bằng token CI,** qua một script mới `scripts/qa-light.mjs`.
   - Script in danh sách Verification và URL của Development.
   - Script đăng báo cáo từ file mà phiên chính viết.
   - Phiên chính không gọi MCP để ghi lên Jira, giống cách `item-accept` đang làm.
8. **Miễn review có dấu vết:**
   - review loại COMMENT có dòng `Waiver: light-docs`, đăng bằng App `ao-review`;
   - `merge-gate` và `audit` gọi cùng hàm `waiverHolds` trên diff và nhãn của item, và không tin dòng `Waiver`.
9. **Quyền của `seo`:**
   - roster cho phép `WebFetch`, `WebSearch` trong `tools` của riêng `seo` (luật mới trong `lib/agents/roster.mjs`);
   - gh-guard có thêm luật theo role: với `seo`, Read, Grep và Glob chỉ trong dự án, và từ chối `.env*` trừ `.env.example`.
10. **`ao-step` commit thay `seo`:** sau một lượt của `seo`, `runGo` chạy một `action` mới, `seo-commit`.
    - `action` này đọc `git status`. Mọi file đổi phải nằm trong `docs/specs/`; có file khác đổi thì dừng.
    - Rồi nó commit bằng danh tính `ao-dev`, như các role khác, và push khi nhánh đã có PR.
11. **Skill viết lại của kit (D3):**
    - nằm ở `kit/.claude/skills/<tên>/`, cạnh các skill `ao-*`;
    - đầu `SKILL.md` có khối `adapted_from` (repo, đường dẫn, commit, giấy phép, bản quyền);
    - `npm run skills:vendor` bỏ qua các skill có khối này;
    - trang `docs/skills.md` ghi cách so với bản gốc khi bản gốc có bản mới.
12. **Tài liệu đi cùng code:** mỗi PR sửa `docs/` cho phần nó đổi. Như vậy `main` không có lúc code đã đổi mà tài liệu chưa đổi.

## Task

| Task | Nội dung | Bước, nhánh |
|---|---|---|
| T1 | Spec đã duyệt, sửa câu "file mới", plan, todo, nhật ký | PR tài liệu |
| T2 | **[bạn]** Ba tiền đề | không có code |
| T3 | Snapshot quyết định cũ; `conditions.mjs`; khóa `runs` trong `stages.yaml` và schema | 1 |
| T4 | `decideSpec`, `decidePlan`, `decideBuild`, `decideReview` đọc `runs`; bộ so không khác | 1 |
| T5 | Bảng tiêu chí trong prompt `reviewer` và `review-report.md`; Medium thiếu cách tái hiện thành Low | 2 |
| T6 | Luật dừng trong `decideReview`, `decideFix`; dòng USD trên mỗi AC của `/ao-status <Epic>` (A5) | 2 |
| T7 | `review.critical_paths`, `review.sensitive_paths`; `pathTier`; bỏ `roster_effort_paths` | 3 |
| T8 | Effort theo tầng; `reviewer` `high`; vòng sau chỉ xem phần mới; luật PR chỉ đổi tài liệu | 3 |
| T9 | `effectiveLevel`; nhãn `ao-level-*`; cột "Mức" của `plan.md`; `ba` gắn nhãn; mức trong bản nháp intake | 4 |
| T10 | QA theo mức: `qa-light.mjs` cho item Nhẹ; QA lại ở mức Chuẩn | 4 |
| T11 | Task finding của Epic (`ao-findings`) | 4 |
| T12 | `review.waivers`, `waiverHolds`; review COMMENT có dòng `Waiver`; `merge-gate`, `audit`; `/ao-review <PR> full`; `review: off` và `doctor` | 5 |
| T13 | Khối `dependencies` của `project.yaml` (`approved`, `exceptions`); `ao-kit sync` giữ khối này; `dep-check.mjs` | 6 |
| T14 | Chặn ở gh-guard và hook Edit/Write; job `policy`; mục "Thư viện mới" của `plan.md`; `/ao-plan` chạy `dep-check`; `Cần security:` | 6 |
| T15 | Role `seo`: roster, luật web, gh-guard theo role, Agent "SEO Specialist", prompt `seo.md` | 7 |
| T16 | `spec-has-seo-screens`; khóa `seo` của app, `validate`, `project-scaffold`; cột "App" của `design.md`; hai từ của `/ao-spec`; dòng "SEO: không"; `seo-commit` | 7 |
| T17 | `nextjs-seo` (đọc hết rồi chép); `seo-content-brief`, `blog-schema`, `blog-taxonomy` viết lại; `adapted_from`; `docs/skills.md` | 8 |
| T18 | Nhãn `ao-seo`: cột "SEO" của `plan.md`, `ba` gắn nhãn; `/ao-intake` ghi `Cần seo:`, ba yêu cầu của Epic blog; `/ao-request` nhận `seo`; prompt build, review, QA chỉ tới phần SEO | 9 |
| T19 | Chỗ nối `ci.project.yml` trong `ci.yml` của kit (A6) | 10 |
| T20 | **[bạn]** Chép kit vào `shop`: review đầy đủ, khóa `seo` cho hai app, chuyển `caddy-proxy` và `not-found` sang `ci.project.yml`; bạn merge | `shop` |
| T21 | Đóng module: `verification.md` theo 11 tiêu chí của spec mục 12, cập nhật `concerns.md`, memory | PR tài liệu |

**Checkpoint:**
- **Checkpoint 1, sau T2:** ba tiền đề có kết quả. Tiền đề nào sai thì mình sửa spec, và bạn duyệt bản sửa trước T3.
- **Checkpoint 2, sau T4:** bộ so quyết định không có khác biệt.
- **Checkpoint 3, sau T12:** phần token đã xong (bước 1–5). Mình báo bạn số đo của test, chưa có số đo thật.
- **Checkpoint 4, sau T19:** mọi kit PR đã merge. Mình hỏi bạn trước T20, vì từ đây bắt đầu tốn tiền.

## Chi phí

| Task | USD [Ước] |
|---|---|
| T1, T3–T19, T21 | 0: không gọi agent trả tiền |
| T2 | Dưới 0,5: một lượt `seo` thử, Sonnet `high`, vài lượt gọi web |
| T20 | Khoảng 10: review đầy đủ PR chép kit, như SHOP-77 (9,36 USD) |

Số đo thật của C1 (tiêu chí 7: USD trên mỗi AC; so `xhigh` với `high`) có ở Epic kế tiếp của `shop`, không thuộc chi phí của module.

## Rủi ro

| Rủi ro | Mức | Cách xử lý |
|---|---|---|
| Dời thứ tự vào contract làm đổi một quyết định cũ mà test không thấy | Trung bình | Snapshot chụp trước khi sửa (T3), bộ so chạy trên mọi fixture (T4) |
| Mức Chuẩn mặc định làm đổi hành vi của item cũ không có nhãn | Trung bình | Không có nhãn thì giữ y như cũ, trừ effort `high` mà bạn đã duyệt. Test cho item không nhãn ở mỗi bước |
| Luật miễn review bị lách, ví dụ đổi nhãn mức sau khi review | Cao | `merge-gate` và `audit` tính lại từ diff và nhãn hiện tại. Chỉ bạn giảm mức, kèm comment lý do. Test cho từng cách lách đã biết |
| `seo` rò dữ liệu qua WebFetch | Cao | gh-guard theo role (T15), test cho Read `.env`, file ngoài dự án, Grep và Glob |
| `nextjs-seo` sai hay lỗi thời | Thấp | Đọc hết trước khi chép (T17). Sai thì bỏ skill và báo bạn |
| `dep-check` gọi API ngoài (OSV, npm, Maven) bị chậm hay hỏng | Trung bình | Lỗi mạng thì kết quả là "nghi ngờ", không phải "đạt" |
| Chép kit vào `shop` đụng job CI riêng của dự án | Trung bình | T19 làm chỗ nối trước; T20 chuyển hai job sang `ci.project.yml` |

## Ba tiền đề (T2)

1. **WebSearch và WebFetch chạy được trong một lượt `claude -p --agent seo`** do `ao-agent.mjs` mở. Agent chạy không có `--permission-mode` riêng, nên phải kiểm rằng hai công cụ này không bị chặn lúc chạy không người trông.
2. **Một lượt `seo` không có Bash vẫn đọc được Jira qua MCP và comment được,** và gh-guard không chặn nhầm các lệnh gọi đó.
3. **Giá trị "SEO Specialist" của Agent Field** đã có trên Jira (bạn bấm thêm), và `npm run jira:check` khớp.

Tiền đề 1 và 2 cần một lượt agent thử ở `ao-pilot`, dưới 0,5 USD. Bạn duyệt plan là duyệt luôn lượt thử này. Kết quả (Lượt 88): tiền đề 1 và 2 đạt, 0,17 USD; tiền đề 3 dời sang T15 ([verification.md](verification.md)).

## Câu hỏi mở

Không có. Ở T2, mình sẽ ghi từng bước bấm để thêm giá trị "SEO Specialist" vào Agent Field.

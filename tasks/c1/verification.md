# Kiểm: C1

> **Plan:** [plan.md](plan.md). **Todo:** [todo.md](todo.md). File này ghi kết quả từng task cần kiểm thật, và cuối module là 11 tiêu chí của spec mục 12.

## T2: ba tiền đề (2026-11-19, Phiên 33 · Lượt 88)

**Cách chạy:** ở `ao-pilot`, với `AO_KIT_DIR` trỏ tới kit, một file agent tạm `.claude/agents/seo-probe.md` có đúng công cụ dự kiến của `seo`: Read, Glob, Grep, Edit, Write, WebFetch, WebSearch và bốn tool Jira đọc, comment của MCP `atlassian`. Không có Bash. Lượt chạy là `claude --agent seo-probe -p … --output-format stream-json`, không người trông, như `ao-agent.mjs` mở.

| Tiền đề | Kết quả |
|---|---|
| 1. WebSearch và WebFetch chạy được trong lượt không người trông | **Đạt.** Phiên chạy ở `permissionMode: auto`. WebSearch trả kết quả cho "nextjs generateMetadata"; WebFetch đọc được trang `generate-metadata` của nextjs.org. |
| 2. Agent không có Bash đọc và comment được trên Jira; hook không chặn nhầm | **Đạt.** `getJiraIssue` đọc DEMO-25; `addOrEditJiraIssueComment` thêm comment 10603 lên DEMO-25. `block-atlassian` cho qua cả hai. gh-guard chưa có luật cho `seo` (role chưa có trong contract), nên luật theo role được kiểm bằng test ở T15. |
| 3. Agent Field có giá trị "SEO Specialist" | **Dời sang T15.** `npm run jira:check` so danh sách option của field với contract, đúng thứ tự (`lib/tracker/drift.mjs`). Thêm option trước khi contract có role `seo` thì lệnh kiểm báo lệch. Bạn bấm thêm option khi T15 merge. |

**Thêm một điều thấy được:** lượt chạy đọc thử `.env` ở gốc `ao-pilot`. Lệnh Read không bị hook từ chối; nó chỉ báo "File does not exist" vì `ao-pilot` không có file này. Điều này khớp với rủi ro 2 của spec mục 6.4: hiện chưa có gì chặn agent đọc `.env`.

**Chi phí:** 0,17 USD, 6 lượt model (Sonnet).

**Dọn dẹp:**
- Đã xóa file agent tạm. `ao-pilot` không còn file nào đổi.
- Comment 10603 trên DEMO-25 còn lại. Token CI không có quyền xóa comment của tài khoản agent ("You do not have permission to delete comment with id: 10603"). DEMO-25 là Bug thử đã Cancelled, và comment ghi "Bỏ qua comment này". Bạn có thể xóa nó trên Jira nếu muốn.

**Kết luận:** spec không phải sửa. Checkpoint 1 đạt.

## T3–T4: dời thứ tự chạy vào contract (2026-11-19, Lượt 88)

**Cách so** (plan, quyết định 4):
1. Trước khi sửa code, một bộ ghi tạm trong `decideStep` ghi mọi lần gọi của `npm test`: 448 lần, cho 13 lệnh (spec 147, build 51, fix 44, review 38, preview 36, qa 32, plan 29, ship 26, release 14, status 13, request 10, rollback 6, intake 2).
2. Code cũ chạy lại 448 lần gọi đó, hai lần: hai kết quả giống hệt nhau, nên quyết định không phụ thuộc giờ chạy.
3. Bộ test chỉ dùng một contract, đúng contract của repo. Contract mới khác contract cũ đúng ở khóa `runs`, nên lần chạy lại sau khi sửa dùng contract mới.
4. Code mới chạy lại 448 lần gọi, so từng quyết định với mốc.

**Kết quả:** 0 khác biệt. Cả bộ test xanh (1.605 test), cùng `validate`, `render:check`, `jira:checklist:check`, `agents:check`. Bộ ghi tạm đã gỡ khỏi `steps.mjs` trước khi commit.

## T20: chép kit vào `shop` (2026-11-20, Lượt 93–99)

- **PR #79 (SHOP-78):** lần chép đầu là kit `719a696`. Review lần một tốn 14,10 USD: `reviewer` 0 Critical, 0 High, 4 Medium, 2 Low; `security` 2 High, 5 Medium.
- **Sửa:** bạn chọn sửa mọi finding trong một kit PR (Lượt 95). Kit PR #324 (`5c25aca`) có 1.710 test xanh; kit được chép lại vào PR #79 (`1ff3358`).
- **Review lần hai** tốn 14,49 USD. Cả hai role Approve, 0 Critical, 0 High; còn 6 Medium và 3 Low, gom vào T20b ([followups-pr79.md](followups-pr79.md)). Bạn merge PR #79 (`ccf4fde`).
- **Deploy:** deployer từ chối `ccf4fde`, vì mô tả PR có chữ `<KEY>` do phiên chính viết. Sửa mô tả, `audit` chạy thử qua, rồi `/ao-rollback development ccf4fde` deploy được.
- **QA PASS:** comment 10608, 1,08 USD; E2E Development 134 qua, 0 lỗi, 6 bỏ qua. `qa` không bấm được Pick up, vì Pick up và QA fail có hai rule Restrict tách rời. Bạn gộp hai rule; phiên chính bấm Pick up bằng token CI, rồi Accept thay bạn bằng token admin. **SHOP-78 Done.** Cả Task tốn 29,67 USD.

## Tiêu chí hoàn thành (spec mục 12), 2026-11-20

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Bộ test xanh; dời thứ tự vào contract không đổi quyết định nào | **Đạt** | 1.710 test xanh ở `5c25aca` (CI của kit PR #324, cả job `windows`). 0 khác biệt trên 448 quyết định (T3–T4 ở trên) |
| 2 | PR chỉ đổi tài liệu của item Nhẹ merge không cần lượt review, `audit` cho deploy; thêm một file `.ts` thì bị đòi review | **Đạt bằng test**; chưa chạy thật | `tests/quality/waivers.test.mjs`, `merge-gate.test.mjs` ("a review waived by rule…"), `audit.test.mjs`, `tests/workflow/steps-pr.test.mjs`. Chưa item Nhẹ nào của `shop` đi qua |
| 3 | PR Chuẩn chạm controller: `reviewer` `high`, `security` `high`; PR chạm `SecurityConfig.java`: `xhigh`, `max`, và mức tự lên Nặng | **Đạt bằng test**; phần Nguy cấp chạy thật | `tests/quality/review-tiers.test.mjs` ("the efforts by tier…"), `tests/workflow/levels.test.mjs`. PR #79 chạm đường dẫn Nguy cấp: hai lượt review chạy ở `xhigh` và `max` |
| 4 | Medium không có cách tái hiện tính là Low; review hết Critical và High thì `ao-step` gợi ý approve | **Đạt**, có chạy thật | `tests/quality/pull-request.test.mjs` ("a Medium with a Tái hiện or Repro line…"). Review lần hai của PR #79: `ao-step` dừng ở gate ③ và gợi ý approve |
| 5 | `pnpm add` gói chưa duyệt bị gh-guard từ chối, `dep-check` gói đạt thì cho cài; `policy` đỏ khi có gói trực tiếp mới chưa duyệt | **Đạt** | `tests/quality/commands.test.mjs` ("an install of a library not approved is refused…"), `tests/quality/dependencies.test.mjs` ("the policy job fails on a new direct dependency…"). `dep-check` chạy thật ở T13: `zod@4.1.12` đáng ngờ, `org.mapstruct:mapstruct@1.6.3` đạt. Còn đường vòng: T20b mục 2 và 3 |
| 6 | `/ao-spec` chạy `seo` sau `ux` cho màn hình của app `seo: true`; không chạy với app `seo: false` hay từ `no-seo`, và SPEC có dòng "SEO: không" | **Đạt bằng test** | `tests/workflow/conditions.test.mjs` (ba test của `spec-has-seo-screens` và `no-seo`), `tests/workflow/steps-epic.test.mjs`; roster nạp bốn skill (`tests/agents/roster.test.mjs`). Lần chạy thật đầu là Epic đầu cần SEO |
| 7 | Epic kế tiếp có USD trên mỗi AC, so được với 21,6 USD của SHOP-7 | **Chờ Epic kế tiếp** | `/ao-status <Epic>` đã in dòng này (T6) |
| 8 | QA lại Story Chuẩn chỉ kiểm tiêu chí đã FAIL, cộng cả bộ E2E; Story Nặng kiểm đủ | **Đạt bằng test** | `tests/workflow/steps-qa.test.mjs` ("QA again at level standard checks only the criteria that failed…") |
| 9 | `validate` báo lỗi khi role khác `seo` có WebFetch hay WebSearch; gh-guard từ chối `seo` đọc `.env` hay file ngoài dự án | **Đạt bằng test** | fixture `tests/fixtures/agents/invalid/a1-web-role-with-bash.yaml`, `tests/agents/scope.test.mjs`, `tests/quality/commands.test.mjs` (mọi cách viết `.env` mà Windows mở, file git bỏ qua). Còn hở: T20b mục 1 (WebFetch qua câu search) và mục 5 (`seo` không đọc được ledger của nó) |
| 10 | Task ngoài Epic có `ao-seo`: `/ao-intake` ghi `Cần seo:`, `/ao-request` chạy `seo`, prompt build chỉ tới comment đó; Story trong Epic chỉ tới mục `## SEO` | **Đạt bằng test** | `tests/workflow/steps-seo.test.mjs` (build trong và ngoài Epic, review, QA, fix, request, intake), `tests/workflow/skills.test.mjs` |
| 11 | Lượt `seo` chỉ đổi `docs/specs/` thì `ao-step` commit; đổi file khác thì dừng | **Đạt bằng test**, chặt hơn spec | `tests/workflow/seo-commit.test.mjs`. Từ kit PR #324, chỉ `docs/specs/<EPIC>/spec.md` được commit; trên nhánh tài liệu thì chỉ SPEC của chính Epic đó |

**Kết luận:** 10 tiêu chí đạt, trong đó 6 tiêu chí mới đạt bằng test. Tiêu chí 7 chờ Epic kế tiếp của `shop`. Lần chạy thật đầu của `seo` là Epic đầu tiên cần SEO. Trước lượt đó nên xong T20b mục 1 và 5.

**Còn mở:**
- **T20b**, chờ bạn đồng ý: 6 Medium và 3 Low của review lần hai PR #79, cùng lỗi `jira:check` không thấy hai rule Restrict tách rời ([followups-pr79.md](followups-pr79.md)).
- **`review: off`** của `project.yaml`: hoãn từ T12.
- **So `xhigh` với `high`** (spec mục 7, phần 2): làm ở Epic kế tiếp.

**Chi phí của C1 ở lượt agent:** T2 tốn 0,17 USD, SHOP-78 tốn 29,67 USD (review 14,10 + 14,49, QA 1,08). Công của phiên chính không đo.

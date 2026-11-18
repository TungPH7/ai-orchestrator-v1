# Quyết định đã duyệt (Phiên 33, 2026-11-16 → 2026-11-18)

> **Dùng file này khi nào.** Một phiên mới, trước khi làm **C1** hay các **đợt followup trước C1**, đọc file này trước, rồi mới đọc hàng C1 của [concerns.md](../concerns.md) và [tasks/followups-truoc-c1.md](../../../tasks/followups-truoc-c1.md).
>
> - File gom **mọi quyết định bạn đã chốt** trong Phiên 33, cùng chi tiết thiết kế. Phần lớn chi tiết trước đây chỉ có trong nhật ký.
> - Mỗi mục ghi lượt bạn duyệt. Nguyên văn câu trả lời nằm ở [misc/brainstorm-discussion.md](../../brainstorm-discussion.md), mục "Phiên 33 · Lượt N".
> - Viết ở Phiên 33 · Lượt 67, ngày 2026-11-18, theo yêu cầu: "lục lại các thảo luận, quyết định và những thứ tôi đã chốt trong conversation này, tạo file quyet-dinh-da-duyet.md và memory … đảm bảo không sót quyết định nào".
>
> **Các phần:**
> - A: đưa vào spec của C1;
> - B: các đợt followup trước C1;
> - C: luật làm việc với bạn;
> - D: backlog có hạn;
> - E: quyết định đã làm xong, để tra cứu;
> - F: chưa quyết.

## Những thứ **không đổi**

- **DoD của Task giữ "Bộ regression pass"** (Lượt 46). Lý do ban đầu là chất lượng: Task là việc kỹ thuật không có AC, có thể làm hỏng chỗ khác (như SHOP-13 đổi schema, SHOP-17 gỡ code cũ), và cả bộ E2E là thứ duy nhất bắt được lỗi đó trước khi item Done. Bản thân bộ E2E tốn ít token: QA SHOP-73 chạy cả bộ mà chỉ tốn 1,23 USD.
- **Cách chia Story, Task, Sub-task giữ như hiện nay** (Lượt 61: "mục 2 giữ như hiện tại không đổi gì cả"). Không có luật "6–8 Story" nào, và không có luật cấm chia "1/2, 2/2". Lý do giữ (Lượt 60):
  - Sub-task theo vai trò không thêm review hay QA, vì Story chỉ có một PR;
  - PR nhỏ thì review tốt hơn;
  - giữ được phụ thuộc, WIP và chạy song song.

## A. Đưa vào spec của C1

Việc gốc của C1, theo hàng C1 của `concerns.md`: chuyển thứ tự chạy của `/ao-spec`, `/ao-plan`, `/ao-build` từ `steps.mjs` sang contract, kèm điều kiện `when`; thêm role `seo`. Các mục A1–A6 dưới đây là phần thêm, bạn đã duyệt. Khi bắt đầu C1, viết `SPEC-c1.md` có các mục này, đưa bạn duyệt spec, rồi mới lập plan.

### A1. Ba mức quy trình theo rủi ro

Đề xuất ở Lượt 49–50; duyệt ở Lượt 60, mục 1. Thảo luận: [danh-gia-chi-phi-shop-7.md](danh-gia-chi-phi-shop-7.md), mục 5.

| Mức | Dùng cho | Review | QA | Finding Low |
|---|---|---|---|---|
| **Nhẹ** | Tài liệu, chữ, UI không chạm dữ liệu, tính năng nhỏ | `reviewer` `high` một lần; không có `security` | Không có lượt `qa`: bạn hay Claude xem trên Development rồi Accept | Gom vào một Task chung mỗi Epic |
| **Chuẩn** | Tính năng có API và database, không đăng nhập hay thanh toán (như SHOP-7) | `reviewer` `high`; `security` chỉ khi PR chạm tầng đường dẫn Nhạy cảm hay Nguy cấp (A2) | `qa` một lần mỗi Story, theo AC | Gom vào một Task chung mỗi Epic |
| **Nặng** | Đăng nhập, thanh toán, migration trên dữ liệu thật, hạ tầng, kit | `reviewer` `xhigh`, `security` `max`, sửa tới khi không còn Critical hay High | QA đầy đủ như hiện nay | Như hiện nay |

**Chọn mức khi nào** (Lượt 50–51):
- **Item trong Epic:** chọn lúc lập plan.
  - `sa` ghi mức đề xuất cho từng item trong `plan.md`;
  - bạn duyệt ở gate ②;
  - `ba` gắn nhãn `ao-level-light`, `ao-level-standard` hay `ao-level-heavy` khi tạo item.

  Không chọn mức cho cả Epic từ trước: Epic chưa có thì chưa biết item nào chạm gì.
- **Task hay Bug ngoài Epic:** chọn lúc `/ao-intake`. Bản nháp ghi mức đề xuất, và bạn "OK" bản nháp là duyệt luôn mức đó.
- **Không ghi mức:** mặc định là Chuẩn.

**Đổi mức trong lúc làm** (Lượt 50):
- **Tăng thì tự động:** `ao-step` đọc lại mức trước mỗi bước. Mức tăng khi:
  - PR chạm tầng đường dẫn Nguy cấp (A2);
  - review hay QA tìm ra Critical hoặc High;
  - bạn đổi nhãn.

  Nếu đã review ở mức thấp, `ao-step` review lại head hiện tại ở mức mới.
- **Giảm thì chỉ bạn:** đổi nhãn, kèm lý do trong comment. Kit không tự giảm, và không cho giảm xuống dưới mức mà đường dẫn của PR đòi.
- **Bước đã chạy xong thì không chạy lại** khi đổi mức. Mức mới áp từ bước kế tiếp, trừ việc review lại khi tăng mức.

**Ví dụ áp vào SHOP-7:**
- SHOP-13 (migration V4): Nặng.
- SHOP-25: Chuẩn.
- SHOP-76 (tài liệu): Nhẹ.
- Một Story Chuẩn mà PR lỡ sửa `SecurityConfig.java`: tự lên Nặng ở bước review.

### A2. Review theo rủi ro: effort mặc định, ba tầng đường dẫn, miễn review

Duyệt ở Lượt 58 ("Về 3 câu tại effort-va-bat-tat-review.md, tôi đồng ý như bạn đề xuất"), Lượt 60 mục 3 và mục 7. Thảo luận: [effort-va-bat-tat-review.md](effort-va-bat-tat-review.md), mục 1–3; Lượt 51–52.

**1. Effort mặc định:**
- `reviewer` và `security` mặc định ở `high`. Hiện nay là `xhigh` và `max` trong `agents/roster.yaml`.
- `max` và `xhigh` chỉ dùng ở tầng Nguy cấp và mức Nặng.
- Cơ sở:
  - bài thử review mù 2026-11-07: `high` sót một lỗi High ở code ranh giới tin cậy (4/4 lượt `high`);
  - ở SHOP-7, `security` `max` trên PR app không tìm ra High nào.

**2. Ba tầng đường dẫn,** do `ao-step` tự tính từ diff của PR lúc review:

| Tầng | Ví dụ | `security` | `reviewer` |
|---|---|---|---|
| **Nguy cấp** | auth, cấu hình bảo mật, crypto, secret, workflow CI, hook, kit, migration chạm dữ liệu có sẵn, Dockerfile | `max` | `xhigh` |
| **Nhạy cảm** | controller, DTO, domain, repository, đổi phiên bản thư viện | ít nhất `high` | không nâng |
| **Thường** | UI, CSS, i18n, test, tài liệu | không chạy (CI vẫn chạy SAST, quét secret, `osv-scanner`) | không nâng |

- **Mức review = mức cao hơn** giữa mức của item (A1, mức sàn) và tầng đường dẫn của PR. Đường dẫn chỉ nâng, không bao giờ hạ.
- **Vòng review sau** chỉ xem phần mới, ở `high`, bất kể mức nào.
- **Trong kit:**
  - `security_review.roster_effort_paths` của `quality/gates.yaml` tách thành `critical_paths` và `sensitive_paths`;
  - `reviewer` không còn luôn `xhigh`;
  - item có nhãn `ao-level-*`;
  - nhãn `ao-effort-*` hiện có vẫn giữ cho dev agent.

**Ví dụ áp vào SHOP-7** (Lượt 52):

| Item | Mức item | PR chạm | Review theo đề xuất | Hiện nay |
|---|---|---|---|---|
| SHOP-76, hướng dẫn | Nhẹ | chỉ `docs/` | `reviewer` `high`; hay miễn hẳn review nếu áp mục 4 (xem F) | `reviewer` `xhigh`, `security` `high` |
| SHOP-8, design system | Chuẩn | CSS, component, `package.json` | `reviewer` `high`, `security` `high` | `reviewer` `xhigh`, `security` `max` |
| SHOP-21, chi tiết sản phẩm | Chuẩn | controller, DTO của `api` | `reviewer` `high`, `security` `high` | `reviewer` `xhigh`, `security` `max` |
| SHOP-13, migration V4 | Nặng | `migrations/` | `reviewer` `xhigh`, `security` `max` | giống hệt |

Ước tính review của SHOP-7 còn khoảng 100–120 USD, thay vì 205 USD.

**3. Luật cho tài liệu** (Lượt 46, điểm 2 và 3; Lượt 60, mục 7: làm một lần trong C1, không làm trong các đợt followup):
- **PR chỉ đổi `docs/**`:** `reviewer` ở `high`; `security` chỉ chạy khi PR có file ngoài `docs/`. Job `secrets` của CI vẫn quét mọi PR.
- **Task chỉ đổi tài liệu:** không cần lượt `qa`. Bạn hay Claude đọc đối chiếu rồi Accept. Contract cho Task tài liệu đi từ In Review tới In QA với một báo cáo QA ngắn do phiên chính viết.
- **Chồng với mục 4 (miễn review):** một PR chỉ đổi tài liệu **của item mức Nhẹ** khớp cả luật trên (`reviewer` `high`, Lượt 46) lẫn luật miễn review (không review, Lượt 58). Chưa quyết luật nào thắng: xem F.

**4. Bật/tắt review: miễn theo luật, không dùng công tắc tay:**
- **Mở rộng từ tiền lệ `docs_pull_requests`** của `gates.yaml`: PR tài liệu của Epic đã được `merge-gate` merge mà không cần review.
- **Chính sách nằm trong `.ai-orchestrator/quality/gates.yaml`,** là đường dẫn được bảo vệ, chỉ đổi qua PR do bạn merge.
- **Quyết lúc PR đã có diff, không phải ở bước spec.**
- **Điều kiện miễn:** **mọi file** của PR nằm trong danh sách được miễn (`docs/**`, `**/*.md`, ảnh, file chữ i18n), **và** item ở mức Nhẹ. Chạm một file ngoài danh sách là review tự bật lại.
- **Dấu vết:** `ao-step` để App `ao-review` đăng trạng thái "review miễn: luật X, các file Y" lên head của PR. `merge-gate` và `audit` **tự tính lại** luật từ diff, không tin nhãn.
- **Bạn luôn bật lại được:** `/ao-review <PR>` chạy được cho mọi PR.
- **Không có công tắc tắt review cho cả dự án.** Riêng repo nháp dùng để thử nghiệm thì có thể có `review: off` trong `project.yaml`, kèm cảnh báo của `doctor`; không dùng cho `shop`.
- Lý do phải làm trọn bộ: review đang bị ràng ở bốn chỗ (contract, `merge-gate`, `audit` của deployer, ruleset của GitHub). Tắt một chỗ thì deploy kẹt hoặc mở ra lỗ hổng.

**5. Đo lại** (Lượt 60, mục 6): ở Epic kế tiếp, chạy thêm `xhigh` mù trên 3–5 PR để so với `high`.

### A3. Tiêu chí xếp hạng finding

Thảo luận ở Lượt 57 ([effort-va-bat-tat-review.md](effort-va-bat-tat-review.md), mục 4); duyệt ở Lượt 59 ("Mục 4 (tiêu chí xếp hạng finding) … đồng ý theo đề xuất").

1. **Bảng tiêu chí cho `reviewer`,** kiểu bảng của `sentry-security-review`: mỗi mức kèm ví dụ cho từng trục.
   - **High (đúng sai):** AC không đạt, mất hay hỏng dữ liệu, migration không tương thích bản trước. Hai luật cứng hiện có vẫn giữ: Task đổi UI hay API công khai là High; migration không tương thích bản trước là High.
   - **Medium:** lỗi ở trường hợp biên có cách tái hiện cụ thể, thiếu test cho hành vi mới.
   - **Low:** chữ, tên, comment, style.
2. **Medium phải nêu cách tái hiện:** input hay trạng thái nào, dẫn tới kết quả sai nào. Không nêu được thì hạ xuống Low.
3. **Low không thành Task riêng, không mở vòng sửa:** chỉ ghi trong báo cáo, rồi gom vào một Task chung mỗi Epic. Medium cũng gom theo Epic, trừ khi bạn chọn sửa ngay.
4. **Luật dừng vòng sửa nằm trong kit:** review không còn Critical hay High thì `ao-step` không gợi ý `/ao-fix`. Nó gợi ý approve, và Medium, Low đi theo mục 3. Hiện nay luật này chỉ có trong memory của phiên chính.

Giữ nguyên: định nghĩa bốn mức của `templates/review-report.md`; chỉ Critical và High chặn merge; dòng `Accept risk: <mã> until <ngày>: <lý do>` để chấp nhận một High.

### A4. Duyệt thư viện trước khi cài

Lượt 61, thay cho mục 4 cũ ("chỉ nâng phiên bản thì để CI lo"). Bạn nêu vấn đề: "khi fe, be dev thêm 1 thư viện … phải check security trước lúc chuẩn bị cài … chứ để dev cài và implement xong hết feature rồi mới check security … cả 2 cách đều không ổn". Bạn duyệt: "đồng ý thay mục 4 bằng cách này, và đưa nó vào C1".

1. **Ở bước plan (gate ②):**
   - `sa` liệt kê **thư viện mới** mà Epic cần trong `plan.md`, kèm lý do và phiên bản;
   - kit kiểm tự động từng thư viện (mục 3);
   - thư viện không qua kiểm thì `security` xem riêng nó, ở `high`;
   - bạn duyệt danh sách cùng plan. Từ đó các thư viện này nằm trong **danh sách đã duyệt** của dự án.
2. **Giữa lúc build, cần thư viện ngoài danh sách:**
   1. Dev agent không được `pnpm add` hay sửa phần dependency của `pom.xml` ngay. Hook từ chối, như gh-guard.
   2. Dev chạy `node .ai-orchestrator/scripts/dep-check.mjs <npm|maven> <tên>@<phiên bản>`.
   3. Đạt mọi tiêu chí tự động: lệnh ghi thư viện vào danh sách đã duyệt, rồi dev cài và làm tiếp.
   4. Có dấu hiệu nghi ngờ: dev comment `Cần security:` trên item. `security` chạy một lượt ngắn chỉ cho thư viện đó, khoảng 0,5 USD [ước tính]. Bị từ chối thì dev chọn thư viện khác **trước khi viết code dựa trên nó**.
3. **Kiểm tự động:**

   | Kiểm | Bắt được |
   |---|---|
   | Lỗ hổng đã biết (cơ sở dữ liệu OSV) | Bản có CVE |
   | Giấy phép, so với danh sách cho phép | Giấy phép không dùng được |
   | Tuổi gói, lượt tải, số người duy trì | Gói giả tên, gói mới đăng |
   | Script tự chạy lúc cài (`postinstall`) | Code lạ chạy trên máy khi cài |
   | Nguồn gốc bản build (npm provenance), nếu có | Bản không build từ repo công khai |

   Dùng lại hai lớp chặn có sẵn của pnpm trong `pnpm-workspace.yaml`: `allowBuilds` và thời gian chờ bản mới phát hành.
4. **Chặn để không lách được:**
   - Job `policy` đỏ khi lockfile của PR có gói mới chưa nằm trong danh sách đã duyệt. Tham khảo `dependency-review-action` của GitHub.
   - Danh sách đã duyệt nằm ở đường dẫn được bảo vệ. Chỉ `dep-check` (khi đạt), `security` hay bạn mới thêm được.
   - Nâng phiên bản của gói đã có: chỉ cần `osv-scanner` và `audit` của CI, không cần agent.
5. **Ở review PR:** `security` không kiểm lại thư viện, chỉ xem **cách code dùng** thư viện.

### A5. Đo lại ở Epic kế tiếp

Lượt 60, mục 6:
- **USD cho mỗi AC**, so với 21,6 USD của SHOP-7 (604 USD cho AC1–AC28);
- **chạy thêm `xhigh` mù trên 3–5 PR** để so với `high` (A2, mục 5).

### A6. Cần thiết kế trong spec C1 hay C2

Đây là Đợt 5 của danh sách followup. Bạn duyệt chỗ đặt ở Lượt 60, mục 8. **Nội dung chưa duyệt:**
- **Review kit một lần ở repo kit,** theo bản phát hành có tag. Dự án khi chép kit chỉ so byte với bản đã review, và review nhẹ phần riêng của dự án nếu có. Thảo luận ở Lượt 37–39: [review-kit-o-dau.md](../review-kit-o-dau.md). Lượt 39: không gấp ba khối lượng; với một dự án, chi phí gần như bằng nhau.
- **Kit ghi đè job CI riêng của dự án,** và **dự án không có chỗ cho ngoại lệ audit riêng.**
- **`/ao-preview` không chạy được khi bật làn.**
- **`profiles:check` đỏ ở bước `build` của app Next.js.** Kiểm sớm xem có phải lỗ hổng của bản `next` không; nếu phải, đưa lên Đợt 3.

## B. Các đợt followup trước C1

Danh sách đầy đủ: [tasks/followups-truoc-c1.md](../../../tasks/followups-truoc-c1.md). Bạn duyệt ở Lượt 60, mục 8 (sau khi sửa theo mục 5 và 7), và Lượt 61.

- **Thứ tự, ưu tiên tiết kiệm token** (Lượt 45):
  - Đợt 1: QA tốn ít token hơn;
  - Đợt 2: dev agent và review;
  - Đợt 3: bảo mật của hook;
  - Đợt 4: làn, worktree, Jira, GitHub.

  Lỗi gh-guard (Medium của PR #74) trước kia được duyệt "sửa trước tiên" (Lượt 31); theo ưu tiên mới, nó nằm ở Đợt 3.
- **Mỗi đợt một kit PR,** test viết đỏ trước. Phiên chính làm và tự merge khi CI xanh, 0 USD agent.
- **Lệnh chạy test chung `run.mjs`, ở Đợt 2** (Lượt 59, mục 5; Lượt 61 "Ok mục 5"):
  1. tìm nguyên nhân gốc: vì sao `pnpm` và `mvnw` hỏng trong phiên agent, có thể do môi trường kit truyền khi mở agent;
  2. `node .ai-orchestrator/scripts/run.mjs <app> <script> [-- tham số]`: chọn Maven hay `pnpm`, chạy ở tiền cảnh, chỉ in tóm tắt (số test đạt, số lỗi, lỗi đầu tiên);
  3. lời nhắc của agent ghi đúng lệnh này cho từng app, sinh từ `project.yaml`, và cấm tự viết script thay thế;
  4. job CI `windows-latest` của kit, và một dòng `ao-kit doctor` kiểm lệnh.
- **Chép kit vào `shop` chỉ một lần,** ngay trước việc kế tiếp của `shop`, gom mọi đợt đã xong (Lượt 46).
  - Không chép sau từng đợt: pilot đã đóng, và mỗi lần chép tốn khoảng 9 USD review.
  - Bản chép cần cập nhật vì nó giữ prompt của agent, các workflow GitHub và `ao-pr`. `ao-step` và hook thì chạy từ clone kit qua `AO_KIT_DIR`.
- **Trạng thái ngày 2026-11-18** (worktree `ao-followups-1`, nhánh `task/followups-1`, chưa push):
  - Đợt 1, mục 6 (kết quả rỗng thì là `unfinished`): đã commit `98441b6`;
  - Đợt 1, mục 5 (`--retest`): viết xong, chưa commit, còn 1 test cũ đỏ;
  - các mục 1–4 chưa làm.

  Lượt 62–64: phần này bắt đầu khi bạn chưa bảo làm. Bạn bảo làm tiếp ở Lượt 67.

## C. Luật làm việc với bạn, còn hiệu lực

- **Duyệt không phải là lệnh làm** (Lượt 62–64). "Đồng ý" một quyết định hay danh sách thì chỉ làm phần ghi chép đã báo trước, rồi hỏi. Việc mới (code, kit PR, chạy agent) chỉ bắt đầu khi bạn nói "làm", "bắt đầu" hay "làm tiếp". "Chưa làm gì" thì chỉ trả lời. Memory: `no-announce-then-stop`, `chua-lam-means-wait`.
- **Không kết thúc lượt bằng câu "Mình bắt đầu…"** khi chưa làm (Lượt 41). Hoặc làm ngay trong lượt, hoặc viết thành câu hỏi.
- **Quyền approve PR và Accept item của Claude chỉ có khi bạn giao, cho từng phạm vi:**
  - Epic SHOP-7 (Lượt 3), hết khi SHOP-7 Done;
  - SHOP-76 (Lượt 42), hết khi SHOP-76 Done.
- **Luôn hỏi trước:**
  - gate ④ và ⑤;
  - Release và Complete trên Jira;
  - quyền mới, App mới;
  - việc xóa không hoàn tác được;
  - chấp nhận một High;
  - lựa chọn thuộc về bạn: phạm vi, cách đóng item.
- **Dừng vòng sửa khi không còn Critical hay High** (Lượt 3; memory `stop-fix-loop-without-critical-high`): approve, còn Medium và Low thành Task theo dõi. Trong C1, luật này vào kit (A3).
- **Finding trong lúc làm Story** (Lượt 7, cách 3):
  - Critical hay High: sửa ngay trên PR đó;
  - Bug do QA thấy làm hỏng AC: sửa ngay, song song;
  - Medium hay Low ở chỗ một Story sắp sửa: gom thành Task, nối Blocks để chạy trước Story đó;
  - Medium hay Low ở chỗ khác: gom vào Task chung, làm sau.
- **Không approve PR khi có QA đang chạy hay đang chờ deploy** (Lượt 15). Approve các PR cùng lúc, rồi QA sau lần merge cuối. Đợt 1 có mục để kit tự cảnh báo việc này.
- **Các luật trong memory, vẫn giữ:**
  - Docker chỉ bật khi cần và tắt ngay sau; chỉ xóa tài nguyên của chính mình, theo đúng tên;
  - VPS mở tới khi bạn nói "đóng VPS";
  - không in file có thông tin đăng nhập;
  - trả lời tiếng Việt có đủ dấu;
  - ghi nhật ký mỗi lượt;
  - lệnh chờ ở nền phải dừng cả khi lỗi, không chỉ khi thành công;
  - không chờ dài ở tiền cảnh, để còn đọc được tin của bạn (Lượt 42).

## D. Backlog có hạn (mục 7 của [tasks/todo.md](../../../tasks/todo.md))

| Việc | Hạn | Nguồn |
|---|---|---|
| Đưa `pr-events.yml` lên `main` và `release/*` (release v0.4.0, hay một hotfix tài liệu) | trước 2026-12-02 | Low của review PR #74 |
| Tài khoản Windows `ao-agent` cho mọi agent; cùng lúc SHOP-40 (đưa `JIRA_CI_TOKEN` ra khỏi máy chạy agent) | trước 2026-12-31 | Lượt 31; High 1 vòng 3 của `shop` PR #13 |
| Kiểm khóa `age` đã cất, rồi sinh cặp khóa mới (bạn làm, cần máy chưa từng chạy agent hay `ao-agent`) | trước 2026-12-31 | T19; Lượt 42: "làm sau" |
| Gỡ ngoại lệ audit GHSA-fc5q-39xc-vjpf (picomatch) khi có bản vá | trước 2026-12-31 | bạn chấp nhận ngày 2026-11-18, khoảng 09:55 (khi CI của PR #74 đỏ) |
| SHOP-70 và SHOP-72 (bạn Refine trước) | trước khi gỡ basic auth của Production, tức trước Epic Đăng nhập | Lượt 31 |
| SHOP-75: Medium và Low của PR #75, ảnh chia sẻ còn chữ template | khi bạn muốn (bạn Refine) | review của `shop` PR #75 |
| Việc của `shop`: test `admin` chập chờn; hai Low về chữ của hướng dẫn người dùng; trang quản trị mở bằng tiếng Anh khi trình duyệt chỉ đặt `vi-VN` | mỗi việc một Task khi bạn muốn | SHOP-76 |
| Đóng VPS: `PermitRootLogin no`, gỡ khóa | khi bạn nói "đóng VPS" | memory `vps-open-until-told` |

## E. Quyết định đã làm xong (để tra cứu)

- **Pilot 3 (B4):**
  - dừng sau SHOP-73 (Lượt 31);
  - đóng pilot cần cả T18 và T19 (Lượt 31);
  - T18 xong (kit PR #304), T19 xong (PR #305). Pilot 3 hoàn thành 2026-11-18.
- **Thứ tự "Chặng 6"** (Lượt 28: "Đồng ý làm theo thứ tự … Làm tiếp 2, 3, 4, 5, 6, 7"):
  - mục 1–5b đã xong;
  - mục 6 (followup) đang làm;
  - mục 7 là backlog ở phần D.
- **SHOP-7 và `v0.3.0`:**
  - gate ④ và ⑤ do bạn duyệt (Lượt 22, 26);
  - release trước, chép kit sau (Lượt 20, mục 6);
  - SHOP-12 Cancel với resolution Won't do, vì Task không PR không Done được (Lượt 20–21);
  - gộp Bug SHOP-71 vào SHOP-39 (Lượt 17);
  - `API_URL` của `user` theo cách (a), gộp `runs.min_free_ram_gb: 1.5`, trong SHOP-55 (Lượt 2);
  - triage SHOP-51 theo cách (a) (Lượt 2);
  - thứ tự của `fe-dev` theo đề xuất (Lượt 6).
- **SHOP-73:**
  - câu A cho `siteDescription` (Lượt 21);
  - làm ngay dù hạn mức 7 ngày đã dùng 89% (Lượt 33–34, chọn A);
  - sửa Task bị mâu thuẫn (Lượt 35–36).
- **SHOP-74:** chép kit `476185f` vào `shop`; chấp nhận ngoại lệ picomatch tới 2026-12-31 (2026-11-18, khoảng 09:55).
- **Hướng dẫn cho người dùng cuối** là một Task tài liệu riêng (Lượt 31). Đó là SHOP-76, Done. Bạn giao approve, Accept và chạy review, QA (Lượt 42).

## F. Chưa quyết

- **Nội dung chi tiết của A6,** đặc biệt "review kit một lần ở repo kit": cần spec, rồi bạn duyệt.
- **Bạn có máy nào chưa từng chạy agent không,** để kiểm khóa `age` sớm hơn hạn (Lượt 42: "làm sau").
- **PR chỉ đổi tài liệu của item mức Nhẹ: miễn hẳn review, hay `reviewer` ở `high`?** Hai luật đã duyệt chồng nhau ở đúng trường hợp này (A2, mục 3 và mục 4). Lúc viết file này (Lượt 67), mình phát hiện chỗ chồng.
  - **Đề xuất:** miễn hẳn review khi item Nhẹ và mọi file đều nằm trong danh sách miễn (Lượt 58, quyết định sau). PR chỉ đổi tài liệu của item Chuẩn hay Nặng thì `reviewer` ở `high` (Lượt 46).
  - Quyết lúc viết spec C1.

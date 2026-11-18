# Effort mặc định của review, thời điểm đặt effort, và bật/tắt bước review

Phiên 33 · Lượt 53, ngày 2026-11-18. Đây là phần tiếp theo của [danh-gia-chi-phi-shop-7.md](danh-gia-chi-phi-shop-7.md), mục 5 (ba mức quy trình theo rủi ro). Mọi điểm dưới đây đều là đề xuất, chưa làm gì.

## Câu hỏi của bạn (nguyên văn)

> Chưa làm gì cả, thảo luận thêm:
> 1. Mong đợi Update effort của reviewer và security mặc định về high. Bạn đánh giá xem mức độ ảnh hưởng đến chất lượng nhé.
>
> 2. Hiện tại thời điểm đặt effort cho các agent là khi nào? ở bước spec à?
>
> 3. Mong đợi có tính năng bật/tắt bước review trong SDLC trong kit. Đề xuất cách làm chuẩn? Sẽ bật/tắt ở bước spec à? Nghiên cứu kỹ rồi trả lời giúp tôi.

## 1. Đặt `reviewer` và `security` mặc định ở `high`: ảnh hưởng tới chất lượng

### Dữ liệu đang có

- **Bài thử review mù ngày 2026-11-07** ([tasks/archive/kit-copy-review/verification.md](../../../tasks/archive/kit-copy-review/verification.md)):
  - chạy trên 3 bản của `ao-sample`, là code ở ranh giới tin cậy (kit, token, worktree);
  - `security` ở `max` tìm ra 6/6 lỗi từ Medium trở lên, tốn 19,45 USD;
  - Opus ở `high` tìm ra 4/6, tốn 5,04 USD, rẻ hơn khoảng 4 lần;
  - **4 trên 4 lượt chạy ở `high` đều sót cùng một lỗi High.** Lượt `max` tìm ra lỗi đó vì nó đọc ra ngoài diff.
- **Epic SHOP-7, code app:** `security` chạy `max` 34 lần, tốn 90 USD, mà không tìm ra lỗi High nào. Báo cáo cuối của các PR app chỉ có 3 Medium và 10 Low.
- **`reviewer` chưa từng được thử A/B.** Ở SHOP-7, nó chạy `xhigh` và chủ yếu ra Low (125), cùng một ít Medium (21).

### Đánh giá

| Thay đổi | Ảnh hưởng tới chất lượng |
|---|---|
| `security` `high` cho code app thông thường | **Nhỏ.** Ở SHOP-7, `max` không tìm thêm được gì ở loại code này |
| `security` `high` cho cả code nguy cấp: đăng nhập, kit, workflow, hạ tầng | **Có ảnh hưởng thật.** Bài thử 2026-11-07 cho thấy `high` sót lỗi High |
| `reviewer` `high` | Có thể sót một ít Medium về đúng sai của logic. Bù lại, nó ra ít Low hơn, nên ít Task sửa Low hơn. QA kiểm theo AC và CI (unit test, SAST, quét secret) vẫn đỡ phía sau |

### Đề xuất

- Đặt `high` làm mặc định cho cả hai agent.
- Giữ `max` cho `security` và `xhigh` cho `reviewer` ở hai chỗ: tầng đường dẫn Nguy cấp, và item ở mức Nặng.
- Ở Epic kế tiếp, chọn 3–5 PR cho chạy thêm `xhigh` mù để so (tốn vài USD), để đo xem `reviewer` ở `high` sót gì.

## 2. Effort của agent hiện được đặt ở đâu và khi nào

Không phải ở bước spec. Effort hiện được đặt ở bốn chỗ:

1. **Mặc định theo vai trò**, trong `agents/roster.yaml` của kit:
   - `reviewer`: `xhigh`;
   - `security`: `max`;
   - `ba`, `ux`, `sa`: `xhigh`;
   - `fe-dev`, `be-dev`, `qa`, `devops`: `high`;
   - `pm`: `medium`.
2. **Theo từng item, ở bước plan:**
   - `sa` ghi effort đề xuất trong `plan.md`;
   - bạn duyệt ở gate ②;
   - `ba` gắn nhãn `ao-effort-<mức>` khi tạo item.

   Nhãn này nâng dev agent của item (build và fix). Nó cũng đẩy `security` lên `max`. Ví dụ ở SHOP-13: `be-dev` chạy `xhigh` (7,56 USD), `security` chạy `max` (2,69 USD); `reviewer` vẫn `xhigh` và `qa` vẫn `high` như roster.
3. **Kit tự đổi trong lúc chạy:**
   - `security` chạy `high` nếu PR không chạm đường dẫn nhạy cảm (`security_review.roster_effort_paths` trong `gates.yaml`) và item không có nhãn effort; ngược lại chạy `max`;
   - vòng review sau chỉ xem phần mới, ở `high`;
   - item bị trả về từ lần thứ hai thì dev agent tự lên `xhigh`.
4. **Bạn đổi tay cho một lượt:** dùng biến `CLAUDE_CODE_EFFORT_LEVEL` hoặc cờ `--effort` ([docs/AGENTS.md](../../../docs/AGENTS.md), mục "Nâng effort").

## 3. Bật hay tắt bước review

### Review đang bị ràng ở bốn chỗ

1. **Contract:** item muốn qua gate ③ thì phải có báo cáo review.
2. **`merge-gate`:** chỉ merge khi có đủ báo cáo của `reviewer` và `security` trên head của PR.
3. **`audit` của deployer:** từ chối commit không có báo cáo. Bước 9 phần 5 của [docs/getting-started.md](../../../docs/getting-started.md) đã gặp đúng chuyện này: ba PR merge thiếu báo cáo bị chặn deploy (`c405b19 did not pass audit`).
4. **Ruleset của GitHub.**

Vì vậy không thể chỉ bỏ bước review trong `ao-step`. Tắt review mà chỉ sửa một chỗ thì deploy sẽ kẹt, hoặc mở ra lỗ hổng.

### Tiền lệ trong kit

PR tài liệu của Epic (`docs_pull_requests` trong `gates.yaml`) đã được `merge-gate` merge **không cần review**. Điều kiện của nó tính được hoàn toàn từ dữ liệu:
- mọi file nằm trong `docs/specs/<EPIC>/` hay `docs/adr/`;
- đúng nhánh;
- do bot `ao-dev` mở;
- Epic đã qua gate.

`audit` tính lại đúng các điều kiện đó.

### Cách làm chuẩn đề xuất: miễn review theo luật, không dùng công tắc tay

- **Ai quyết:** chính sách của dự án, đặt trong `.ai-orchestrator/quality/gates.yaml`. Đây là đường dẫn được bảo vệ, chỉ đổi qua PR do bạn merge, nên agent không tự tắt review được.
- **Quyết khi nào:** lúc PR đã có diff, **không phải ở bước spec**, vì hai lý do:
  - spec là ở cấp Epic, quá thô;
  - lúc viết spec chưa ai biết PR sẽ chạm file nào. Một Story "chỉ UI" vẫn có thể lỡ sửa `SecurityConfig.java`.

  Ở bước plan, `sa` có thể ghi mức đề xuất cho từng item, như ba mức Nhẹ, Chuẩn, Nặng.
- **Luật miễn review:** chỉ áp khi có đủ hai điều kiện:
  - **mọi file** của PR nằm trong danh sách được miễn, ví dụ `docs/**`, `**/*.md`, ảnh, file chữ i18n;
  - **và** item ở mức Nhẹ.

  Chạm một file ngoài danh sách là review tự bật lại.
- **Dấu vết:** khi miễn, `ao-step` để App `ao-review` đăng lên head của PR một trạng thái "review miễn: luật X, các file Y".
  - `merge-gate` và `audit` **tự tính lại** luật từ diff, không tin nhãn.
  - Nhờ vậy, ai đó gài code vào một PR "tài liệu" thì luật không khớp, và PR bị chặn.
- **Bạn luôn bật lại được:** gõ `/ao-review <PR>` cho bất kỳ PR nào; có báo cáo thì `merge-gate` dùng báo cáo đó.
- **Không nên** có công tắc tắt review cho cả dự án.
  - Riêng repo nháp dùng để thử nghiệm thì có thể có `review: off` trong `project.yaml`, kèm cảnh báo của `ao-kit doctor`.
  - Không dùng công tắc này cho `shop`.

### Áp vào SHOP-76

- PR chỉ đổi `docs/user-guide/` nên được miễn hẳn review, tiết kiệm 4,80 USD.
- Đi cùng điểm bạn đã OK ở Lượt 46 (Task tài liệu không cần lượt `qa`), SHOP-76 chỉ còn chi phí của phiên chính.

## 4. `reviewer` và `security` xếp hạng finding (Critical, High, Medium, Low) theo tiêu chí nào

Phiên 33 · Lượt 56.

### Câu hỏi của bạn (nguyên văn)

> Tiêu chí reviewer và security xếp hạng hạng findings là Critical, High, Medium, Low như thế nào? Dựa trên cơ sở nào?

### 4.1 Định nghĩa chung, trong template báo cáo của kit

Nguồn: `templates/review-report.md`, mục Findings. Định nghĩa này dùng chung cho cả hai agent:

| Mức | Định nghĩa | Hệ quả |
|---|---|---|
| **Critical** | Chặn merge: lỗ hổng bảo mật, mất dữ liệu, tính năng hỏng | PR bị "Request changes" |
| **High** | Phải sửa trước khi merge | PR bị "Request changes" |
| **Medium** | Nên sửa; có thể để một item theo dõi | Không chặn |
| **Low** | Nhỏ, chỉ là gợi ý (nit) | Không chặn |

- **Contract dùng đúng ranh giới này.**
  - `contract/stages.yaml`: bước review chỉ qua khi "Không còn finding Critical/High".
  - DoD của mọi item (`contract/work-items.yaml`): "Không còn finding Critical/High chưa xử lý".
  - `merge-gate`, `audit` và `ao-step` đọc báo cáo, và chỉ coi Critical, High là chặn.
- **Bạn có thể chấp nhận một High thay vì sửa:** ghi một dòng `Accept risk: <mã finding> until <ngày>: <lý do>` trong lần approve ([docs/quality-gates.md](../../../docs/quality-gates.md), mục "Chấp nhận một High thay vì sửa").

### 4.2 `reviewer`: dựa trên skill `code-review-and-quality` và các luật riêng của kit

**Năm trục xem xét:** đúng sai, dễ đọc, kiến trúc, bảo mật, hiệu năng. Skill `code-review-and-quality` (của `addyosmani/agent-skills`) có nhãn riêng, và template ánh xạ sang mức của kit:

| Nhãn của skill | Nghĩa trong skill | Mức trong kit |
|---|---|---|
| **Critical:** | chặn merge: lỗ hổng, mất dữ liệu, tính năng hỏng | Critical |
| (không tiền tố) | thay đổi bắt buộc trước merge | High |
| **Optional:** / **Consider:** | gợi ý đáng cân nhắc | Medium |
| **Nit:** | định dạng, sở thích | Low |

Theo skill, chuẩn để approve là: approve khi thay đổi chắc chắn làm code tốt hơn, dù chưa hoàn hảo.

**Kit thêm hai luật cứng biến một lỗi thành High** (`agents/prompts/reviewer.md`):
- Task mà đổi UI hay API công khai: đó là "Story trá hình".
- Migration mới không chạy được với bản release trước. Ví dụ: xóa hay đổi tên cột mà bản trước còn dùng, thêm cột NOT NULL không có giá trị mặc định, hay sửa một migration đã chạy.

**Cơ sở:** ngoài hai luật trên, mức là **phán đoán của model** theo định nghĩa một dòng ở 4.1, có thêm một ví dụ trong template. Không có bảng tiêu chí chi tiết cho từng trục.

### 4.3 `security`: dựa trên skill `sentry-security-review`

**Bước 1: lọc theo độ tin cậy,** trước khi xếp hạng:

| Độ tin cậy | Tiêu chí | Làm gì |
|---|---|---|
| Cao | Có mẫu code dễ bị khai thác **và** đã lần ra được input do kẻ tấn công điều khiển | Báo, kèm mức |
| Trung bình | Có mẫu dễ bị khai thác, nhưng chưa rõ nguồn của input | Báo, mở đầu bằng "Needs verification:" |
| Thấp | Lý thuyết, best practice, phòng thủ nhiều lớp | Không báo |

**Bước 2: xếp hạng theo khả năng khai thác và tác động,** giống một bản CVSS rút gọn:

| Mức | Khả năng khai thác, tác động | Ví dụ |
|---|---|---|
| **Critical** | Khai thác trực tiếp, tác động nặng, không cần đăng nhập | RCE, SQL injection lấy được dữ liệu, vượt qua xác thực, secret viết cứng trong code |
| **High** | Khai thác được khi có điều kiện, tác động đáng kể | Stored XSS, SSRF tới metadata, IDOR tới dữ liệu nhạy cảm |
| **Medium** | Cần điều kiện cụ thể, tác động vừa | Reflected XSS, CSRF trên thao tác đổi trạng thái, path traversal |
| **Low** | Phòng thủ nhiều lớp, tác động trực tiếp nhỏ | Thiếu header bảo mật, thông báo lỗi lộ chi tiết, thuật toán yếu ở chỗ không quan trọng |

Phần tham khảo của skill lấy từ OWASP Cheat Sheet Series.

**Kit sửa vài chỗ của skill** (`agents/prompts/security.md`):
- **Định dạng:** báo cáo theo template của kit, dùng bốn mức ở 4.1, không dùng định dạng và mã finding của skill.
- **Với PR sửa `.github/workflows/**` hay `action.yml`:** agent đọc thêm skill `gha-security-review`.
- **Ai được coi là kẻ tấn công:** skill gốc chỉ tính người không có quyền ghi vào repo. Kit tính thêm chữ trong PR, issue và comment, vì agent có quyền ghi vẫn đọc chữ đó.
- **Trước khi báo, agent dựng mô hình đe dọa của thay đổi:** tài sản cần bảo vệ, chỗ dữ liệu đi vào, ranh giới tin cậy.

### 4.4 Nhận xét từ dữ liệu thật

- **`security` có tiêu chí rõ hơn `reviewer`:**
  - có bảng ví dụ cho từng mức;
  - có bộ lọc độ tin cậy, nên nó ít báo bừa.

  Ở SHOP-7, nó chỉ ra 3 Medium và 10 Low trên các PR app.
- **`reviewer` phụ thuộc nhiều vào phán đoán.** Ở SHOP-7 nó ra 125 Low và 21 Medium. Phần lớn Low là gợi ý về chữ, comment, tên. Nhưng chính quy trình (và lựa chọn đầu Epic là sửa cả Low) đã biến chúng thành vòng sửa và 28 Task theo dõi.
- **Mức của cùng một lỗi có thể đổi theo effort.** Ở bài thử 2026-11-07, lỗi S2 được lượt `max` xếp Medium, còn lượt `high` xếp Low.

### 4.5 Đề xuất, đưa vào C1 cùng các mục trên

1. **Bảng tiêu chí cho `reviewer`**, kiểu bảng của `sentry-security-review`: mỗi mức kèm ví dụ cho từng trục. Ví dụ:
   - **High (đúng sai):** AC không đạt, mất hay hỏng dữ liệu, migration không tương thích bản trước.
   - **Medium:** lỗi ở trường hợp biên có cách tái hiện cụ thể, thiếu test cho hành vi mới.
   - **Low:** chữ, tên, comment, style.
2. **Medium phải nêu cách tái hiện:** input hay trạng thái nào, dẫn tới kết quả sai nào. Không nêu được thì hạ xuống Low.
3. **Low không thành Task riêng và không mở vòng sửa.** Low chỉ ghi trong báo cáo, rồi gom vào một Task chung mỗi Epic. Medium thì gom theo Epic, trừ khi bạn chọn sửa ngay.

## Đã duyệt

Bạn duyệt mục 1–3 ở Lượt 58 ("Về 3 câu tại effort-va-bat-tat-review.md, tôi đồng ý như bạn đề xuất"), và mục 4.5 ở Lượt 59 ("đồng ý theo đề xuất"). Chi tiết gom ở [quyet-dinh-da-duyet.md](quyet-dinh-da-duyet.md), mục A2 và A3.

Ba điểm ở mục 1–3 thành một mục của spec C1:
- `reviewer` và `security` mặc định ở `high`, tự nâng ở tầng Nguy cấp và mức Nặng;
- luật miễn review theo đường dẫn và mức của item;
- dấu vết miễn review mà `merge-gate` và `audit` tự kiểm lại được.

Ba đề xuất ở mục 4.5 cũng đi cùng spec đó: bảng tiêu chí cho `reviewer`, Medium phải có cách tái hiện, và Low không mở vòng sửa.

## Nguồn

- Memory `review-ab-test-2026-11` và [tasks/archive/kit-copy-review/verification.md](../../../tasks/archive/kit-copy-review/verification.md): bài thử review mù ngày 2026-11-07.
- `shop/.ai/reviews/<PR>-security.md` của PR #18–#70: báo cáo cuối của `security` trên các PR app.
- `agents/roster.yaml`, `.ai-orchestrator/quality/gates.yaml` (`security_review`, `docs_pull_requests`), `lib/workflow/steps.mjs` (`effortOf`, `REWORK_FLOOR`).
- [docs/dev-workflow.md](../../../docs/dev-workflow.md): nhãn effort ở bước plan.
- Mục 4:
  - `templates/review-report.md` (mục Findings);
  - `contract/stages.yaml` (`exit` của bước review), `contract/work-items.yaml` (DoD);
  - `agents/prompts/reviewer.md`, `agents/prompts/security.md`;
  - `kit/.claude/skills/code-review-and-quality/SKILL.md` (nhãn Critical, Required, Optional, Nit);
  - `kit/.claude/skills/sentry-security-review/SKILL.md` (Confidence Levels, Severity Classification);
  - [docs/quality-gates.md](../../../docs/quality-gates.md) (chấp nhận một High).

# Followup của kit, xếp lại trước C1

> Mục 6 của [todo.md](todo.md). Mọi quyết định đã duyệt, kể cả phần chuyển sang C1: [quyet-dinh-da-duyet.md](../misc/thao-luan/toi-uu-token/quyet-dinh-da-duyet.md). Nguồn: 44 mục còn mở trong [handoff-2026-11-16-followups.md](handoff-2026-11-16-followups.md), đếm ngày 2026-11-18. Mỗi mục dưới đây trỏ về mục gốc bằng tên in đậm của nó. **Trạng thái:** bạn duyệt ở Phiên 33 · Lượt 58–61 (2026-11-18). Bản này là bản xếp lần 4.
>
> - **Lượt 45:** ưu tiên việc tiết kiệm token, theo lời bạn.
> - **Lượt 46–47:**
>   - chép kit vào `shop` một lần, ngay trước việc kế tiếp của `shop`;
>   - giữ DoD "Bộ regression pass".
> - **Lượt 58–61:** bạn đồng ý 8 mục ở Lượt 58, trừ mục 2 (giữ nguyên cách chia item). Các luật đổi về review, QA và thư viện chuyển sang C1 (mục "Chuyển sang C1" dưới đây); lệnh chạy test chung vào Đợt 2.

## Vì sao xếp lại

SHOP-76 chỉ có 3 file Markdown và 11 ảnh, mà tốn 11,49 USD:
- **QA: 6,68 USD.**
  - Lượt 1 tốn 5,42 USD, vì ba lý do:
    - Verification đòi kiểm từng câu;
    - `qa` chạy lại cả bộ E2E;
    - `qa` tự dựng môi trường: tìm `.env`, tự bật Docker.
  - Lượt 2 tốn 1,26 USD, sau một lần QA fail.
- **Review: 4,80 USD.** Có 6 lượt cho 2 PR. PR chỉ đổi tài liệu mà `reviewer` vẫn chạy ở `xhigh`.

Theo đề xuất dưới đây, một Task tài liệu như vậy còn khoảng 2–3 USD [ước tính].

Cả Pilot 3 tốn 719 USD: build 44%, review 34%, QA 11%. Phần lãng phí lặp lại nhiều nhất là các lượt chạy lại hay chạy hỏng, và các bước agent tự mò công cụ hay môi trường.

## Cách làm

- **Mỗi đợt:** một nhánh và một kit PR, test viết đỏ trước. Phiên chính làm và tự merge khi CI xanh, 0 USD agent.
- **Chép kit vào `shop` một lần,** ngay trước việc kế tiếp của `shop` (như SHOP-75 hay Epic sau), gom mọi đợt đã xong tới lúc đó. Lần chép cần một lượt review đầy đủ (khoảng 8 USD) và một QA.
  - Pilot 3 đã đóng và `shop` chưa có việc nào chạy, nên chép sớm hơn chỉ tốn thêm review mà không ai dùng.
  - Bản chép của dự án cần cập nhật vì nó giữ prompt của agent (`.claude/agents/`), các workflow GitHub và `ao-pr`. `ao-step` và hook thì chạy từ clone kit qua `AO_KIT_DIR`.
  - Mỗi bản sửa được kiểm bằng test của kit. Lần chạy thật đầu tiên là item kế tiếp của `shop`.
- **Đợt 5** cần thiết kế, nên đưa vào spec của C1 hay C2.

## Chuyển sang C1 (bạn duyệt ở Lượt 46, 57, 58, 61)

Các mục này đổi luật của contract, roster, `gates.yaml` hay hook. Chúng cần spec, nên làm một lần trong C1, không làm trong các đợt dưới đây:

1. **Ba mức quy trình theo rủi ro** (Nhẹ, Chuẩn, Nặng), chọn cho từng item ở gate ②, như mục 5 của [danh-gia-chi-phi-shop-7.md](../misc/thao-luan/toi-uu-token/danh-gia-chi-phi-shop-7.md):
   - QA theo mức: Nhẹ không có lượt `qa`, Chuẩn có `qa` một lần mỗi Story, Nặng giữ như hiện nay;
   - Low gom vào một Task chung mỗi Epic.

   Cách chia item giữ nguyên như hiện nay (Lượt 60).
2. **Review theo rủi ro** ([effort-va-bat-tat-review.md](../misc/thao-luan/toi-uu-token/effort-va-bat-tat-review.md), mục 1–3; Lượt 51–52):
   - `reviewer` và `security` mặc định ở `high`;
   - ba tầng đường dẫn: Nguy cấp, Nhạy cảm, Thường. Mức review là mức cao hơn giữa mức của item và tầng đường dẫn;
   - luật miễn review theo đường dẫn và mức của item, có dấu vết để `merge-gate` và `audit` tự kiểm lại;
   - hai luật cho tài liệu (Lượt 46): PR chỉ đổi `docs/**` thì `reviewer` ở `high` và không có `security`; Task chỉ đổi tài liệu thì không cần lượt `qa`.
3. **Tiêu chí xếp hạng finding** (cùng file, mục 4.5):
   - bảng tiêu chí có ví dụ cho `reviewer`;
   - Medium phải nêu được cách tái hiện;
   - Low không mở vòng sửa.

   Gồm cả luật dừng vòng sửa trong `ao-step` (trước đây là mục 8 của Đợt 2).
4. **Duyệt thư viện trước khi cài** (Lượt 61), thay cho mục 4 cũ "chỉ nâng phiên bản thì để CI lo":
   - `sa` liệt kê thư viện mới trong plan; kit kiểm tự động; bạn duyệt ở gate ②;
   - giữa lúc build, dev chạy `dep-check.mjs` trước khi cài, và hook chặn việc cài thư viện chưa duyệt;
   - `security` chỉ xem riêng thư viện có dấu hiệu nghi ngờ;
   - job `policy` chặn PR có gói chưa duyệt trong lockfile;
   - `security` ở review PR chỉ xem cách code dùng thư viện. Nâng phiên bản của gói đã có thì để `osv-scanner` và `audit` lo.
5. **Đo lại ở Epic kế tiếp** (Lượt 58, mục 6):
   - so USD cho mỗi AC với 21,6 USD của SHOP-7;
   - chạy thêm `xhigh` mù trên 3–5 PR để so với `high`.

**Không đổi:**
- DoD của Task giữ "Bộ regression pass".
- Cách chia item thành Story, Task, Sub-task giữ như hiện nay.
- Lý do ban đầu là chất lượng, không phải token. Task là việc kỹ thuật không có AC, và có thể làm hỏng chỗ khác, như SHOP-13 đổi schema hay SHOP-17 gỡ phần sản phẩm cũ. Cả bộ E2E là thứ duy nhất bắt được lỗi đó trước khi item Done.
- Bản thân bộ E2E tốn ít token, vì agent chủ yếu chờ: QA SHOP-73 chạy cả bộ mà chỉ tốn 1,23 USD. Tiền của QA SHOP-76 nằm ở Verification quá rộng và ở việc agent tự dựng môi trường. Đợt 1 sửa hai chỗ đó.

## Đợt 1: QA tốn ít token hơn

**Xong 2026-11-18: kit PR #306, merge `03a26c1`, 1546/1546 test.** Cả 6 mục:
- Verification hẹp trong template;
- `qa` chờ Docker như `be-dev` và không tự bật Docker Desktop;
- worktree QA có `.env` và đường dẫn dài;
- gate ③ và `/ao-status` cảnh báo khi QA đang chạy;
- `/ao-qa <KEY> retest`;
- câu trả lời rỗng thì là `unfinished`.


1. **QA của Task chỉ đổi tài liệu quá nặng** (SHOP-76):
   - template Task có mẫu Verification hẹp, kiểm được, cho Task tài liệu và Task nhỏ;
   - phiên chính viết Verification của Task theo mẫu đó.

   Luật "Task tài liệu không cần lượt `qa`" làm trong C1.
2. **`qa` không tự bật Docker Desktop.** Thiếu Docker thì `ao-step` dừng trước lượt, như với `be-dev`. Lần nào QA cũng để lại container `learn-postgres-s1` chạy.
3. **Worktree QA không có file `.env` của app:** chép `.env` như với làn, và dùng đường dẫn dài. Lượt `qa` nào cũng tự viết runner nạp `.env`, tốn bước.
4. **Approve PR lúc có QA đang chạy hay sắp chạy làm QA bị cắt ngang:** dòng STOP ở gate ③ và `/ao-status` báo QA nào đang chạy. Lượt QA bị thay thì mất trắng.
5. **Chạy lại QA sau NOT TESTED không có đường riêng:** thêm cờ `--retest`. Hôm nay `--note` bị dùng sai mục đích: nó là đường "lỗi bạn thấy".
6. **Lượt `qa` có kết quả rỗng thì coi là `unfinished`**, chạy tiếp trong phiên cũ (một phần của mục "Lặp lại hai lỗi đã ghi, ở QA SHOP-64").

## Đợt 2: dev agent và review tốn ít token hơn

**Xong 2026-11-19: kit PR #307, merge `b0ce9c3`, 1561/1561 test, CI xanh cả job `windows`.** Cả 6 mục:
- `run.mjs` chạy test, lint và build;
- nguyên nhân gốc là `MSYS_NO_PATHCONV` mà phiên agent thừa hưởng, nay bị xóa khi mở agent;
- luật "Commands that take long" cho lượt headless;
- hook `pre-commit` kiểm Suppressions;
- `/ao-fix` chọn dev agent theo app của finding, và dừng hỏi khi CI đỏ trên Story có cả hai phía;
- review sau khi merge `develop` chỉ tính file của chính PR;
- mỗi lượt build kiểm WIP của vai trên Jira.

Hai chỗ khác kế hoạch:
- không thêm dòng `ao-kit doctor` cho `run.mjs`: dòng kiểm file của kit và job CI `windows` đã đủ;
- lệnh cho từng app trong lời nhắc là một luật chung, không sinh từ `project.yaml`.

1. **Một lệnh chạy test chung** (Lượt 58–59, mục 5), gộp hai mục `be-dev` khó chạy Maven và `fe-dev` không gọi được `pnpm`. Ở mỗi lượt, agent tốn hàng chục bước mò lệnh.
   - Tìm nguyên nhân gốc: vì sao `pnpm` và `mvnw` hỏng trong phiên agent, có thể do môi trường mà kit truyền khi mở agent. Sửa ở đó.
   - `node .ai-orchestrator/scripts/run.mjs <app> <script> [-- tham số]`: tự chọn Maven hay `pnpm`, chạy ở tiền cảnh, chỉ in tóm tắt (số test đạt, số lỗi, lỗi đầu tiên).
   - Lời nhắc của agent ghi đúng lệnh này cho từng app, sinh từ `project.yaml`, và cấm tự viết script thay thế.
   - Job CI `windows-latest` của kit chạy thử lệnh, và `ao-kit doctor` có một dòng kiểm nó.
2. **Agent chạy headless kết thúc khi test còn chạy nền:** luật không dùng `run_in_background` trong lượt headless. Mỗi lần gặp lỗi này, cả lượt phải chạy lại.
3. **Check `policy` "Suppressions" đỏ lặp lại** (ba lần): hook `pre-commit` kiểm ở máy. Mỗi lần đỏ tốn một vòng CI và một lượt `/ao-fix`.
4. **`/ao-fix` trên Story có Sub-task giao nhầm dev agent:** chọn agent theo đường dẫn file của check đỏ.
5. **Review lại sau khi merge `develop` vào nhánh PR tính cả code của `develop`:** phần mới chỉ là phần của PR. Ở PR #41, `security` chạy `max` trên 3.700 dòng đã review rồi.
6. **Sub-task FE chạy trước khi WIP của `fe-dev` trên Jira trống:** kiểm WIP trước mỗi Sub-task. Lượt hỏng tốn 0,73 USD.

Hai mục cũ "review nhẹ cho PR chỉ đổi tài liệu" và "luật dừng vòng sửa trong kit" chuyển sang C1.

## Đợt 3: bảo mật của hook

**Xong 2026-11-19: kit PR #308, merge `4283be9`, 1563/1563 test, CI xanh.** Cả 5 mục:
- gh-guard bắt lệnh tìm khóa ở mọi kiểu chữ và dạng regex (`begin rsa`, `BEGIN.*KEY`, `BEGIN\s+RSA`), mà câu SQL và tên test vẫn qua;
- gh-guard đọc lệnh sau `do`, `then`, `{`, nên dạng stdin của `curl` trong vòng lặp hay hàm không còn bị chặn nhầm;
- phép kiểm mật khẩu có hay không (`${VAR:+set}`, `[ -n … ]`) được qua, và luật cấm viết lại lệnh để né mẫu của hook;
- gh-guard chặn chép hay xóa đệ quy cây có `node_modules` hay cả `apps`;
- relay `PR events` bỏ PR của fork, và đọc danh sách PR một lần mỗi sự kiện.

Lần trước bạn duyệt "sửa gh-guard trước tiên"; theo ưu tiên mới, nó lùi xuống đây. Trong lúc chờ, rủi ro là agent tìm được khóa riêng của các App trên máy bằng `grep` chữ thường. Nếu bạn muốn giữ nó lên đầu thì nói; mục 1 chỉ mất khoảng 1–2 giờ.

1. **gh-guard để lọt lệnh tìm khóa riêng** (Medium, PR #74).
2. **`gh-guard` từ chối `curl` có basic auth cả khi mật khẩu đi qua stdin.** Chặn nhầm thì agent phải đi đường vòng, tốn bước.
3. **Agent `qa` lách mẫu chữ của gh-guard.**
4. **Agent `ux` chép cả `apps` (có `node_modules`) vào thư mục tạm.**
5. **Relay `PR events` chọn nhầm PR của fork** (Low).

## Đợt 4: làn, worktree và luồng Jira, GitHub

**Xong 13 trên 14 mục, 2026-11-19: kit PR #309, merge `d5bbb0e`, 1579/1579 test, CI xanh.** Mục 14 chờ bạn quyết (đề xuất ngay dưới mục 14). Đã xong:
- gỡ làn sạch trên Windows: xóa `node_modules` trước (không đi theo link), rồi phần git để sót, và thư mục làn mà git không còn biết;
- hai lệnh cùng dọn thì mỗi làn chỉ một lệnh gỡ (dấu `.remove-<KEY>`);
- dừng mọi tiến trình còn chạy từ worktree QA hay review trước khi gỡ;
- lời nhắc làn nêu biến `env` của từng app, đã dời cổng;
- `merge-gate` chạy cả sau `CI`;
- `audit` tìm lại PR của commit vừa merge ba lần;
- client GitHub thử lại GET khi gặp 502, 503, 504 hay lỗi mạng;
- PR xung đột với `develop` thì dừng ngay, kèm cách gỡ;
- kiểm Docker thêm một lần sau 3 giây;
- `/ao-build` một Story hay Task ở New đạt DoR thì gọi `jira-sync` rồi build luôn;
- lời nhắc Sub-task nêu tên file ledger, và Story có ledger riêng vẫn đi tiếp;
- `policy` chỉ quét `pom.xml` của app mà PR đổi, và thử lại khi quét lỗi;
- lượt dừng trước `result` có chi phí chưa biết, không còn âm.

Các mục này không tốn token agent, nhưng làm item bị kẹt, và phiên chính phải gỡ tay.

1. **Gỡ làn để sót thư mục:** gộp bốn mục `prune`, "Directory not empty", làn còn sót file gốc, làn còn sót `apps/user`.
2. **Hai lệnh cùng gỡ một làn thì giẫm lên nhau.**
3. **QA bị dừng vì deploy mới để lại app của nó chạy.**
4. **Lời nhắc làn cho agent chưa nêu biến `env` của app.**
5. **merge-gate không merge PR merge ngược khi CI xanh sau lượt chạy của nó.**
6. **`audit` của deployer từ chối nhầm một commit merge vừa xong.**
7. **`ao-step` dừng hẳn khi GitHub trả 5xx một lần.**
8. **`ao-step` báo nhầm "GitHub Actions did not start" khi PR xung đột với `develop`.**
9. **Kiểm Docker của `ao-step` thử lại một lần trước khi dừng.**
10. **Task thêm vào một Epic đã duyệt plan nằm ở New mãi.**
11. **`be-dev` ghi ledger theo khóa Story.**
12. **Check `policy` đỏ vì `osv-scanner` không tra được Maven Central.**
13. **Chi phí âm ở lượt bị dừng khi đang chạy tiếp một phiên.**
14. **Task vận hành không có PR**, gộp với **Task dữ liệu của `devops`**. Phần cho `devops` nhận basic auth cần bạn bật.

    **Chờ bạn quyết (2026-11-19):** mục này đổi hợp đồng SDLC và workflow trên Jira, nên chưa nằm trong kit PR #309. Đề xuất:
    - **Nhận diện:** một Task có nhãn `ao-ops` là Task vận hành. `ba` gắn nhãn này khi việc không có commit, như thêm dữ liệu qua API.
    - **Đường đi:**
      1. `devops` làm việc, rồi ghi bằng chứng vào comment trên item.
      2. Transition mới `hand-over` (In Progress → Ready for QA) có guard `ops-evidence`: comment bằng chứng của `devops` có mặt.
      3. `qa` kiểm như mọi Task.
      4. Bạn Accept.

      Task này không cần PR, không có `submit` và không có `deploy-to-qa`.
    - **Epic:** guard `children-released` bỏ qua item có nhãn `ao-ops`, nên Epic không kẹt vì một Task không có Fix Version. Không cần thêm Resolution mới.
    - **Basic auth cho `devops`:** `launch.mjs` chỉ đưa `E2E_HTTP_USER`/`E2E_HTTP_PASSWORD` cho `devops` khi Task có thêm nhãn `ao-env-auth`, và chỉ bạn gắn nhãn này. Đây là công tắc mà bạn bật cho từng Task.
    - **Việc của bạn:**
      1. Duyệt hợp đồng mới.
      2. Bấm thêm transition `hand-over` vào workflow trên Jira. Mình cập nhật checklist (`npm run jira:checklist`) và đưa bạn từng bước bấm.
      3. Mình kiểm lại bằng `npm run jira:check`.

## Đợt 5: cần thiết kế, đưa vào spec của C1 hay C2

- **Review kit một lần ở repo kit** ([review-kit-o-dau.md](../misc/thao-luan/review-kit-o-dau.md)). Đây là khoản tiết kiệm lớn: ba lần chép kit trong Pilot 3 tốn 95 USD. Trong lúc chờ, cứ gom nhiều bản sửa kit vào một lần chép.
- **Kit ghi đè job CI riêng của dự án** và **Dự án không có chỗ cho ngoại lệ audit riêng.**
- **`/ao-preview` không chạy được khi bật làn.**
- **`profiles:check` đỏ ở bước `build` của app Next.js.** Cần kiểm sớm xem có phải lỗ hổng của bản `next` không. Nếu phải, mục này lên Đợt 3.

## Không phải việc của kit

- **Việc của `shop`**, mỗi việc một Task khi bạn muốn:
  - **unit test `admin` "a name of 151 characters" chập chờn**;
  - **hai Low về chữ của hướng dẫn người dùng**;
  - **trình duyệt chỉ đặt `vi-VN` mở trang quản trị bằng tiếng Anh**;
  - SHOP-75.
- **Có hạn, ở mục 7 của todo:** **`pr-events.yml` chưa có trên `main` và `release/*`**, trước 2026-12-02.

## Ước lượng

| Đợt | Số mục | Công của phiên chính | USD agent |
|---|---|---|---|
| 1 | 6 | khoảng một ngày | 0 |
| 2 | 6 | khoảng một ngày | 0 |
| 3 | 5 | khoảng nửa ngày | 0 |
| 4 | 14 | khoảng 1,5 ngày | 0 |
| Chép kit vào `shop` một lần, trước việc kế tiếp của `shop` (review, QA) | | khoảng 2 giờ | khoảng 9 |

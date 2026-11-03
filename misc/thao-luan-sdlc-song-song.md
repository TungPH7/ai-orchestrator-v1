# Thảo luận: chạy nhiều luồng SDLC song song

Phiên 23 · Lượt 25, 2026-11-03. Câu hỏi của bạn giữ nguyên văn; câu trả lời dựa trên mã kit ở `main` (`f4e1a91`). Nhãn: **[Inference]** là suy luận chưa đo, **[Ước]** là con số ước, **[Chưa kiểm chứng]** là điều mình chưa kiểm được.

## Kiến trúc hiện tại, phần liên quan tới câu hỏi

Phần này là sự thật đọc được từ mã. Các câu trả lời bên dưới dựa vào nó.

1. **Luồng đi theo item, không theo team.** `contract/workflows.yaml` định nghĩa các trạng thái và transition cho mỗi loại item (Epic, Story, Task, Bug, Sub-task). Trên board, nhiều item có thể cùng lúc ở các trạng thái khác nhau, như một bảng Kanban.
2. **Agent không phải nhân viên thường trực.** Mỗi lượt là một phiên `claude -p` mới, do `ao-step` mở cho đúng một item và một bước, xong việc thì thoát. Không có agent nào ngồi chờ việc, và lúc không chạy thì agent không tốn gì.
3. **Agent không nói chuyện trực tiếp với nhau.** Chúng trao đổi qua comment trên Jira (`Cần <role>: …`) và qua artifact trong git: SPEC, plan, mô tả PR, báo cáo review.
4. **Mỗi vai trò có một định nghĩa** trong `agents/roster.yaml`: model, effort, quyền. Kit chưa có khái niệm "2 `be-dev`".
5. **Các lệnh chạy những vai trò sau** (`lib/workflow/steps.mjs`):
   - `/ao-spec`: `ba` viết SPEC, rồi `ux` thiết kế nếu có màn hình, rồi `sa` thêm NFR, cuối cùng `ba` mở PR tài liệu;
   - `/ao-plan`: `sa` viết plan, rồi `ba` tạo item;
   - `/ao-build`: dev agent của từng Sub-task, BE trước FE;
   - `/ao-review`: `reviewer` rồi `security`.
6. **Ba chỗ đang làm mọi thứ chạy tuần tự:**
   - **Khóa chạy:** `ao-step` giữ file `.ai/runs/active.json`. Trong một thư mục project, mỗi lúc chỉ một agent chạy, dù là của item nào.
   - **Một checkout chung:** `/ao-build` và `/ao-fix` chuyển cả thư mục project sang nhánh của item (`prepareCheckout` trong `scripts/ao-step.mjs`).
   - **Giới hạn WIP** (`contract/policies.yaml`): mỗi dev agent làm 1 việc một lúc; cột In Review có tối đa 2 PR; mỗi lúc chỉ 1 Epic ở bước spec hay plan.

---

## Câu 0

> Kit ai-orchestrator có thể mở rộng các chức năng ở dưới không? Hay phải đập đi xây lại

**Mở rộng được, không cần đập đi.** Những gì quyết định một item đi thế nào đều giữ nguyên:
- contract: trạng thái, transition, guard, WIP;
- `jira-sync`, `merge-gate`, `audit`;
- roster, prompt của agent, gói bối cảnh của review.

Phần phải thay là lớp chạy agent (ba chỗ ở mục 6):

| Thay đổi | Lý do |
|---|---|
| Mỗi item một git worktree riêng (ví dụ `.ai/worktrees/<KEY>`), thay cho checkout chung | Hai dev agent không sửa chung một thư mục |
| Khóa theo item, thay cho khóa của cả project, cộng một trần số lượt chạy cùng lúc | Cho nhiều lượt chạy song song, nhưng có giới hạn |
| Một bộ điều phối (dispatcher) viết bằng code thường, không dùng LLM: đọc board, chọn việc theo WIP và link Blocks, rồi mở lượt chạy | Thay việc bạn hay mình gõ từng lệnh `/ao-*` |
| WIP của mỗi vai trò tính theo số "chỗ" (ví dụ `be-dev: 2`) | Tương ứng với "team có 2 dev BE" |
| Mỗi worktree có tài nguyên riêng: `node_modules`, cổng của dev server và E2E, thư mục `.ai/` | Để các lượt chạy song song không đụng nhau |

[Inference] Khối lượng khoảng vài kit PR, mỗi PR cỡ một bản sửa ở T7–T9. Muốn có con số cụ thể thì phải làm spec và plan riêng.

---

## Câu 1

> Hiện tại kit chỉ đang có 1 luồng SDLC cho 1 task. Có thể nâng cấp để chạy đồng thời nhiều nhiều task (nhiều luồng SDLC), chạy song song để tăng tốc độ phát triển feature/task được không? Giả định các task không phụ thuộc nhau. Nếu chạy nhiều SDLC song song thì dùng tính năng worktree à?

**Nói chính xác hơn:** kit đã cho nhiều item cùng nằm trong luồng. Ví dụ lúc này `SMP-4` ở Ready for QA, còn `SMP-5` ở Ready. Cái đang tuần tự là chỗ chạy agent, gồm khóa chạy và checkout chung.

**Nâng cấp được, và đúng là dùng git worktree.**
- Mỗi item đã có nhánh riêng (`feature/<KEY>-<slug>`), nên mỗi item một worktree là vừa khớp.
- Lượt review nên chạy trong một worktree đứng ở `develop`, còn code của PR nằm ở worktree của item. Cách này sửa luôn điểm 3 bạn vừa đồng ý: chỉ dẫn của agent review lấy từ bản đã duyệt.

**Những điều phải tính khi chạy song song:**
- **Hạn mức gói Claude.** Chạy N lượt cùng lúc thì hạn mức hết nhanh gấp khoảng N lần. Tổng token không giảm; chỉ thời gian chờ là giảm. [Chưa kiểm chứng] Mình chưa biết gói của bạn cho bao nhiêu phiên `claude -p` chạy cùng lúc.
- **Cổng mạng.** Dev server dùng cổng 3000 và 3001, E2E cũng vậy. Mỗi worktree cần một cặp cổng riêng.
- **Cài đặt.** Mỗi worktree phải chạy `npm ci` riêng, tốn thêm đĩa và vài phút.
- **Xung đột merge.** Hai PR song song có thể cùng sửa một file dùng chung. PR merge sau phải rebase rồi chạy lại CI.
- **Bạn là nút cổ chai.** Gate ③ là bạn approve, và cột In Review chỉ chứa 2 PR. Agent làm nhanh hơn thì PR xếp hàng chờ bạn.

---

## Câu 2

> Nếu có 2 SDLC thì như có 2 team nhỏ độc lập trong 1 dự án, các nhân viên như ba, sa, dev, revewer, qa của 2 team không thể giao tiếp với nhau. Nên khi SDLC 1 và 2 bắt đầu task, đang ở bước /spec thì chỉ có sa, ba, ux làm việc, reviwer rảnh không làm gì? Kiến trúc kit ai-orchestrator hiện tại có phải như này không?

**Không phải như vậy.** Có hai chỗ khác:

1. **Kit không chia team.** Agent không gắn với một luồng. Mọi lượt chạy đọc cùng một space Jira và cùng một repo, nên "giao tiếp" qua comment Jira và artifact trong git như nhau, dù item thuộc luồng nào.
2. **Không có reviewer ngồi rảnh.** Reviewer chỉ tồn tại trong lúc `ao-step` mở một lượt review, nên lúc không chạy nó không tốn gì.

**Chỗ lãng phí thật của kiến trúc hiện tại nằm ở khóa chạy.** Khi `ba` đang viết SPEC cho Epic A, một PR của item B đã sẵn sàng vẫn phải chờ, vì mỗi lúc chỉ một agent chạy. Thời gian chờ đến từ chỗ chạy agent là tuần tự, không phải từ một vai trò ngồi không.

---

## Câu 3

> Xem xét hướng tiếp cận sau (các hướng này là trường hợp thực tế trong 1 cty IT làm phần mềm SDLC)
> 3.1. 1 Team có 2 ba, 2 dev be, 2 dev fe, 1 reviewer. 1 team tương ứng 1 luồng SDLC nên khi chạy, ở /spec có 2 ba thì sẽ sinh 2 sub-agent ba làm 2 task độc lập, ba nào xong trước thì chuyển giao dev đang rảnh task, dev xong thì chuyển cho reviewer, vì chỉ có 1 reviewer mà có tận 4 dev, nên các task của 3 dev còn lại phải chờ reviewer xử lý xong task của dev 1 trước.
>
> Như trên thì tôi thấy có 2 hướng làm task theo kiểu song song (giả định là các task độc lập):
> 1. là dùng SDLC như hiện tại, trong mỗi luồng SDLC mỗi role chỉ có 1 agent. Muốn làm song song thì tạo thêm luồng SDLC, kết hợp worktree để 2 SDLC làm trên 2 worktree để không conflict, chỉnh sửa lên code của nhau
> 2. dùng 1 SDLC (làm trên 1 worktree), mỗi role có nhiều agent, ở mỗi stage sẽ spawn nhiều agent, mỗi agent làm task độc lập như 3.1. Hướng này thì Kit ai-orchestrator phải xử lý phức tạp hơn, tốn thời gian và token hơn à? như cần xử lý hàng đợi, check agent nào rảnh để giao task, agent cứ check task, nếu có task thì nhận để làm?

**Ví dụ 3.1 khớp với mô hình của kit: Kanban có giới hạn WIP theo vai trò.**
- "Ba nào xong trước thì giao cho dev đang rảnh" là cơ chế kéo việc: item sang Ready, một dev còn chỗ thì nhận.
- "3 dev chờ 1 reviewer" là giới hạn WIP của cột In Review: dev không mở thêm PR khi cột đã đầy.

**Khác biệt lớn khi dùng agent thay người:** "chỉ có 1 reviewer" là ràng buộc của người thật. Với agent, số reviewer chỉ là số lượt review được phép chạy cùng lúc, và có thể mở 4 lượt cùng lúc cho 4 PR. Ràng buộc thật là ba thứ:
- hạn mức gói Claude;
- ngân sách;
- bạn, ở các cổng duyệt.

Vì vậy, nên đặt giới hạn theo ba thứ đó, không mô phỏng số người của một team.

**So sánh hai hướng**

| | Hướng 1: nhiều luồng, mỗi vai trò 1 agent mỗi luồng | Hướng 2: một luồng, mỗi vai trò nhiều agent |
|---|---|---|
| Chia việc | Mỗi item gắn cố định vào một luồng | Mọi item ở cùng một hàng đợi (board Jira), lượt nào còn chỗ thì nhận |
| Dùng sức chạy | Luồng này có thể rảnh trong khi luồng kia dồn việc | Không phí chỗ: chỗ nào trống thì nhận việc kế tiếp |
| Việc dùng chung | Vẫn phải điều phối link Blocks giữa các luồng, thứ tự merge, tài liệu Epic chung | Có sẵn trong contract: guard `dependencies-merged`, `wip-available` |
| Worktree | Mỗi luồng một worktree | Vẫn cần mỗi item một worktree. "1 SDLC trên 1 worktree" không chạy được khi 2 dev cùng làm |
| Mã cần viết | Một bộ điều phối giữa các luồng | Một bộ điều phối với trần số lượt chạy cùng lúc |

**Về chi phí token của hướng 2:**
- Token tính theo lượt agent chạy. Một item dù đi theo hướng nào cũng chạy cùng các lượt, nên token mỗi item như nhau.
- Hàng đợi và việc "chọn agent rảnh" là việc của bộ điều phối viết bằng code thường. Nó đọc board qua API Jira, không gọi model, nên gần như không tốn token.
- **Đừng để agent tự hỏi "có việc không".** Mỗi lần một phiên LLM hỏi như vậy là tốn token mà không làm gì. Bộ điều phối hỏi Jira, rồi mới mở lượt chạy khi có việc.
- Phần phức tạp hơn nằm ở mã: vòng đời của worktree, xử lý lỗi khi nhiều lượt chạy cùng lúc, và chia cổng mạng.

**Đề xuất:** đi theo hướng 2, dưới dạng: một board, một bộ điều phối, mỗi item một worktree, WIP theo vai trò, và một trần số lượt chạy cùng lúc. Khởi đầu với trần 2 lượt rồi đo. [Inference] Đây là hướng ít phải viết mã mới nhất, vì phần chọn việc (guard, WIP, `decideStep`) đã có trong kit.

---

## Câu a

> Hiện tại luồng /ao-spec, /ao-plan, /ao-build, /ao-review, /ao-fix cần chạy tuần tự vì bước sau phụ thuộc kết quả bước trước phải không? Nên việc chạy nhiều sub-agent cho từng stage là không hợp lý?

**Trong một item: đúng, phải tuần tự.** Thứ tự là spec, plan (cùng Epic), build, review, fix, rồi review lại. Không thể review khi chưa có PR, cũng không thể build khi plan chưa duyệt.

**Giữa các item thì không cần tuần tự**, theo hai cách:
- **Gối đầu:** item A đang review thì item B build.
- **Song song:** các item độc lập build cùng lúc.

**Trong một bước, có chỗ chạy song song hợp lý và có chỗ không:**

| Chỗ | Song song được không | Lý do |
|---|---|---|
| `reviewer` và `security` của cùng một PR | **Được** | Cả hai đọc cùng một PR và ghi hai báo cáo riêng. Ở PR #7, hai lượt mất 9,7 và 12,8 phút; chạy song song thì [Ước] còn khoảng 13 phút thay vì 22,5 |
| BE và FE của cùng một Story | [Inference] Nên giữ tuần tự | Cả hai dùng chung một nhánh. FE có thể dựa vào API Contract trong plan, nhưng muốn song song thì phải tách nhánh con rồi gộp lại |
| `ux` và `sa` trong `/ao-spec` | Không đáng | Cả hai cần SPEC của `ba`, và cùng ghi lên nhánh tài liệu của Epic |
| Hai agent cùng vai trò cho một item (hai `ba` viết một SPEC) | Không hợp lý | Hai bên sửa chung một file, mà không nhanh hơn |

**Kết luận:** nhiều agent cho cùng một item ở cùng một bước thì không hợp lý. Nhiều lượt chạy song song cho các item khác nhau, cộng `reviewer` song song với `security`, thì hợp lý.

---

## Tóm tắt

1. Không cần đập đi. Phần phải viết mới là lớp chạy: worktree theo item, khóa theo item, bộ điều phối, trần số lượt chạy cùng lúc.
2. Nếu làm, thứ tự lợi nhất:
   1. `reviewer` chạy song song với `security`: thay đổi nhỏ nhất, mỗi PR bớt khoảng 10 phút.
   2. Worktree theo item: sửa luôn điểm 3.
   3. Bộ điều phối với trần số lượt chạy cùng lúc.
   4. WIP theo số chỗ của mỗi vai trò.
3. Chạy song song chỉ rút thời gian, không giảm chi phí, và làm hạn mức gói hết nhanh hơn.
4. Bạn quyết làm phần này lúc nào:
   - trước khi build `SMP-5` tới `SMP-11`, để chính các item đó chạy song song;
   - sau Pilot 1, như một module có spec riêng.

**Bạn quyết (Phiên 23 · Lượt 26):** build `SMP-5` tới `SMP-11` trước với kit như hiện tại; phần chạy nhiều luồng song song để sau.

# Làn, worktree và số agent chạy cùng lúc

Hỏi đáp ở Phiên 32 · Lượt 18–21 (2026-11-15), khi bàn spec [SPEC-parallel-runs.md](../../../SPEC-parallel-runs.md) (C2
tối thiểu). Phân tích trước đó: [c2-toi-thieu-giua-pilot-3.md](c2-toi-thieu-giua-pilot-3.md).

## Từ dùng trong file này

- **Item:** một việc trên Jira, ví dụ `SHOP-13`.
- **Làn:** toàn bộ vòng SDLC của một item: build, review, chờ bạn duyệt, QA, chờ bạn Accept. Mỗi làn có một **worktree**
  riêng, tức một bản sao thư mục dự án để agent viết code.
- **Agent:** một tiến trình Claude chạy một bước của một làn, ví dụ `fe-dev` build hay `reviewer` review. Bước xong thì
  agent tắt.
- **`agents_at_once`:** con số trong `project.yaml`, là số agent tối đa được chạy cùng một lúc trên tất cả các làn.

## Đã chốt trước đó

1. **Lượt 18:** con số cấu hình được, 1..4. Biến môi trường hạ nó tạm thời ở một máy mà không phải sửa file.
2. **Lượt 19:** mỗi item một làn, một worktree. Trong một làn, mỗi lúc chỉ một agent, chạy lần lượt như bây giờ. Mình
   không cho nhiều agent cùng làm một item.
3. **Lượt 20:**
   - số làn đang mở có thể lớn hơn số agent chạy cùng lúc, vì làn đang chờ bạn không cần agent;
   - đề xuất `2` cho `shop` trên máy này (16 GB RAM, còn khoảng 2,6 GB trống khi một agent đang chạy);
   - số làn đang mở thì để giới hạn WIP của contract tự quyết.

## Câu hỏi ở Lượt 21

> 1. nên đổi items_at_once thành agents_at_once thì đọc sẽ dễ hiểu hơn chứ nhỉ?
> 2. Nếu cấu hình là cùng lúc 3 items nhưng chỉ còn 1 item chưa làm, thì kit chỉ khởi tạo 1 worktree, 1 SDLC thôi phải
>    không?
> 3. Nếu tạo 3 làn/worktree và 3 agent nhưng nếu làn thứ 3 rảnh (ví dụ chờ approve) thì agent thứ 3 ở làn thư 3 làm gì?
>    có gây tốn token không? Hay tốn RAM của máy tính?

### 1. Đổi tên thành `agents_at_once`

**Đồng ý.** Tên này đúng hơn:
- Con số giới hạn **số agent chạy cùng lúc**, không giới hạn số item hay số làn đang mở.
- Với tên `items_at_once`, người đọc dễ hiểu nhầm là "số làn được mở", như chính câu hỏi ở Lượt 20.
- Vì mỗi làn tối đa một agent, `agents_at_once` cũng bằng số làn **đang có agent chạy**.

Spec đã đổi theo: khóa `runs.agents_at_once`, biến tạm thời `AO_AGENTS_AT_ONCE`.

### 2. Cấu hình 3 mà chỉ còn 1 item

**Đúng: kit chỉ tạo 1 worktree, 1 làn.**
- Con số là **trần**, không phải mục tiêu. Kit không tạo sẵn worktree hay làn trống.
- Làn chỉ mở khi một item bắt đầu build (`/ao-build <KEY>`). Worktree được tạo ngay lúc đó, và được dọn khi PR của item đã
  merge.
- Item còn phải **sẵn sàng**: các item mà nó phụ thuộc đã xong. Ví dụ `SHOP-14` chờ `SHOP-13`. Nếu chỉ 1 item sẵn sàng,
  chỉ có 1 làn, dù cấu hình cho 3.
- Trong C2 tối thiểu, chưa có bộ điều phối tự mở làn. Phiên chính (Claude) chọn item và chạy lệnh, nên không bao giờ mở làn
  cho item không có việc.

### 3. Làn thứ 3 đang chờ bạn approve thì "agent thứ 3" làm gì?

**Không có agent nào ngồi chờ ở làn đó, nên không tốn token, và không tốn RAM cho agent.**

1. **Agent không phải nhân công thường trực.** Mỗi bước mở một tiến trình Claude mới, đúng vai trò. Bước xong thì tiến
   trình tắt hẳn. Khi làn 3 chờ bạn, không có tiến trình Claude nào của nó đang chạy.
2. **Token:** chỉ tốn khi agent chạy. Chờ bạn duyệt thì không tốn gì.
   - Một chi tiết nhỏ: khi làn chạy tiếp, ví dụ `fe-dev` sửa theo review, agent nối lại phiên cũ. Bộ nhớ đệm prompt chỉ
     giữ 5 phút, nên sau một lúc chờ lâu, agent phải đọc lại lịch sử của phiên, tốn thêm một ít token. Bây giờ cũng vậy,
     không phải chi phí mới của C2.
3. **RAM:** gần như không tốn.
   - Khi một bước xong, kit tắt luôn những gì agent để lại, như dev server. Log hôm nay có dòng "fe-dev stayed alive
     after its result and was stopped with what it left running".
   - Container database của test Java được Testcontainers tự dọn.
   - Cái còn lại chỉ là **thư mục worktree trên đĩa**: code cộng `node_modules`. pnpm dùng chung một store, nên mỗi
     worktree tốn thêm ít đĩa hơn bản cài đầy đủ [Ước]. Đĩa thì có tốn, RAM thì không.
4. **Chỗ chạy của làn 3 được nhả ra.** Trong lúc làn 3 chờ, chỗ đó dùng được cho một làn khác cần agent.
5. **Một thứ có tốn RAM: cửa sổ VS Code bạn mở.** Nếu bạn mở mỗi worktree trong một cửa sổ VS Code, mỗi cửa sổ cùng
   TypeScript server và ESLint của nó tốn khoảng 0,5–1,5 GB [Ước], dù agent không chạy. Trên máy 16 GB này, nên chỉ mở
   cửa sổ của làn bạn đang xem.

## Tóm tắt

| Thứ | Khi làn đang chờ bạn | Khi làn có agent chạy |
|---|---|---|
| Tiến trình Claude (agent) | Không có | 1 |
| Token | 0 | Theo lượt chạy |
| RAM | Không, trừ cửa sổ VS Code bạn mở | Agent, dev server, Chrome, JVM… |
| Đĩa | Worktree vẫn còn | Worktree |
| Chỗ trong `agents_at_once` | Nhả ra cho làn khác | Chiếm 1 chỗ |

## Câu hỏi ở Lượt 22

> 4. Tại sao không phải tôi quyết định, chọn số làn mà là "Số làn đang mở để WIP của kit tự quyết, thường 3–4" ??? Chọn
>    trả lời thì cần có số chính xác không có kiểu "thường 3–4"

**Bạn đúng: số làn nên do bạn quyết, bằng một con số chính xác.** Câu "thường 3–4" ở Lượt 20 là sai cách. Lý do nó không
chính xác: giới hạn WIP của contract chỉ chặn hai chỗ.

| Giới hạn trong `contract/policies.yaml` | Con số |
|---|---|
| Mỗi dev agent (`fe-dev`, `be-dev`, `devops`) giữ item In Progress | 1 |
| Cột In Review (PR chờ bạn approve) | 2 |
| Epic đang ở Specifying hay Planning | 1 |

Các cột Ready for QA, In QA và chờ bạn Accept thì không có giới hạn. Vì vậy số làn mở không có trần cố định, nên phải có
một con số của bạn.

**Sửa trong spec:** thêm khóa `runs.lanes_max`, số làn (worktree) được mở cùng lúc.
- Build đầu tiên của một item mở một làn mới. Khi đã đủ `lanes_max` làn, lệnh đó dừng và báo rõ lý do.
- Các bước trên làn đã mở (fix, review, QA, build lại sau `QA fail`) không bị chặn, để item đang dở luôn đi tiếp được.
- `lanes_max` không được nhỏ hơn `agents_at_once`.
- Giới hạn WIP của contract vẫn áp dụng thêm.

**Hai con số bạn quyết, đề xuất cho `shop` trên máy này:**

| Khóa | Giá trị | Vì sao |
|---|---|---|
| `lanes_max` | **3** | Hai làn có agent chạy, cộng một làn chờ bạn duyệt. Mỗi làn mở rồi sẽ chờ bạn ở gate ③ và Accept, nên đây cũng là số item tối đa dồn lại chờ bạn |
| `agents_at_once` | **2** | RAM 16 GB, chỉ còn khoảng 2,6 GB trống khi 1 agent đang chạy; hạn mức 5 giờ của gói Max 5x |

Muốn nhanh hơn sau khi kiểm thật cho thấy máy còn dư: tăng `agents_at_once` lên 3 và `lanes_max` lên 4.

## Phản biện ở Lượt 25

> Với trường hợp tạo 3 làn và 2 agent chạy cùng lúc cho all làn: … đã tạo 3 làn nghĩa là đã có 3 VS code từ ban đầu
> rồi, nghĩa là RAM cho VS code đã tốn từ lúc chốt chạy 3 làn, còn việc có 3 agent chạy cùng cho all làn nó không tốn RAM
> nữa vì agent chạy xong sẽ bị tắt đi. Vậy thì cứ cấu hình số agent bằng số làn luôn đi.

**Đồng ý với kết luận: số agent bằng số làn.** Mình chỉ sửa hai tiền đề, và thêm một chốt an toàn.

1. **Làn không kéo theo cửa sổ VS Code.** Kit không mở VS Code; agent cũng không dùng nó. RAM của VS Code tính theo số cửa
   sổ bạn mở. Đo lúc 15:53: VS Code đang dùng 3,8 GB (37 tiến trình), nhiều nhất máy. Nếu bạn mở thêm một cửa sổ cho mỗi
   làn thì tốn thêm, còn không mở thì không tốn.
2. **Agent không tốn RAM khi làn chờ, nhưng tốn khi đang chạy.**
   - "Xong thì tắt" làm giảm RAM trung bình, không làm giảm **đỉnh**. Đỉnh là lúc cả ba làn cùng có agent chạy.
   - Đo lúc 15:53, với một agent `reviewer` đang chạy (loại nhẹ, không bật app): còn 2,8 GB trống trên 15,8 GB. Các tiến
     trình `claude` (phiên chính cộng agent) dùng 1,4 GB.
   - Một lượt build nặng hơn: dev server, một Chrome của `chrome-devtools`, test runner; `be-dev` còn có JVM và Postgres
     trong Docker. [Ước] Mỗi lượt build cộng thêm 1,5–4 GB. Ba lượt build cùng lúc dễ vượt RAM, và Windows sẽ dùng file
     swap, làm mọi thứ chậm hẳn, kể cả chính các agent.
3. **Chốt RAM:** khóa `runs.min_free_ram_gb`, mặc định 3.
   - Trước khi mở một agent, kit đọc RAM trống. Dưới 3 GB thì làn đó chờ, kiểm lại mỗi 30 giây, cho tới khi một agent
     khác xong.
   - Nhờ vậy, khi máy đủ RAM thì ba làn chạy ba agent; khi máy thiếu thì làn thứ ba tự chờ, máy không bị quá tải.
4. **Cấu hình mới trong spec:**
   - `lanes_max: 3`;
   - `agents_at_once` bỏ trống, tức bằng `lanes_max`; vẫn đặt được số nhỏ hơn nếu muốn;
   - `min_free_ram_gb: 3`.

Còn một giới hạn không đổi: ba agent cùng lúc làm hạn mức 5 giờ của gói Max 5x hết nhanh gấp ba. Nếu chạm hạn mức, các
lượt dừng và chạy lại khi hạn mức mở, như bây giờ.

## Lượt 26: cái gì thật sự tốn RAM

> Cái gây tốn RAM là số làn (vì nó mở cửa sổ VS code), còn bạn nói chạy nhiều agent gây tốn RAM "agents_at_once: 2: vì RAM
> 16 GB, chỉ còn khoảng 2,6 GB trống khi 1 agent đang chạy." là không đúng mà. Tôi nói vậy có đúng không?

**Đúng một nửa.** Đo lúc 15:58, khi agent `security` đang chạy:

| Thứ | RAM |
|---|---|
| Agent `security` (tiến trình `claude` của nó và `ao-agent`) | khoảng 0,34 GB |
| Các tiến trình `claude` khác (phiên chính và các thứ khác) | 1,08 GB |
| VS Code (đo lúc 15:53) | 3,8 GB |
| Edge (đo lúc 15:53) | 1,8 GB |
| RAM còn trống | 2,6 GB |

- **Bạn đúng ở chỗ:**
  - bản thân một agent nhẹ, khoảng 0,3 GB;
  - RAM trống thấp chủ yếu do VS Code và trình duyệt, không do agent;
  - lấy con số "2,6 GB trống khi 1 agent đang chạy" làm lý do chọn 2 agent là lập luận yếu của mình.
- **Chưa đúng ở hai chỗ:**
  1. Làn không tự mở VS Code. Kit không mở VS Code; chỉ khi bạn mở một cửa sổ cho mỗi làn thì làn mới "tốn" RAM của VS
     Code. Không mở thì một làn chỉ tốn đĩa.
  2. Agent `security` và `reviewer` nhẹ vì chúng chỉ đọc code. Agent build thì bật thêm công cụ trong lúc chạy: dev server,
     một Chrome riêng của `chrome-devtools`, test runner; `be-dev` còn có Java và Postgres trong Docker. Phần này mình
     chưa đo; mình sẽ đo ở lượt build kế tiếp và ghi số thật vào đây.
- **Kết luận giữ nguyên:** số agent bằng số làn, cộng chốt RAM 3 GB. Cách bớt RAM nhiều nhất trên máy này: đóng cửa sổ
  VS Code và tab trình duyệt không dùng, và không mở một cửa sổ VS Code cho mỗi làn.

## Câu hỏi ở Lượt 29

> 5. đã có items_at_once rồi còn lanes_max là sao nữa? hay bạn chỉ rename lại?
> 6. WIP ở cột In Review trên Jira đang đặt max = 2, nếu lanes_max: 3 thì cũng phải sửa lại Jira phải không?

### 5. `items_at_once` và `lanes_max`

Hai con số khác nhau, nhưng giờ bạn chỉ cần đặt một.

| Lượt | Đổi gì |
|---|---|
| 17 | Spec nháp có `runs.parallel`: số lượt agent chạy cùng lúc |
| 20 | Đổi tên thành `items_at_once` (chỉ đổi tên) |
| 21 | Đổi tên thành `agents_at_once` (chỉ đổi tên) |
| 22 | Thêm khóa **mới** `lanes_max`: số làn, tức worktree, được mở cùng lúc |
| 25 | Bạn chốt số agent bằng số làn; `agents_at_once` bỏ trống thì bằng `lanes_max` |
| 29 | Bỏ hẳn khóa `agents_at_once` khỏi `project.yaml`, vì nó luôn bằng `lanes_max` |

Bây giờ trong `project.yaml` chỉ còn `lanes_max`. Số agent chạy cùng lúc tự bằng nó. Muốn tạm chạy ít agent hơn mà không
sửa file thì đặt biến `AO_AGENTS_AT_ONCE`. Chốt RAM (`min_free_ram_gb`) vẫn có thể bắt một làn chờ khi máy thiếu RAM.

### 6. Cột In Review có max 2 trên Jira

**Không phải sửa Jira.**

- Con số 2 đó là **mức của cột trên board Jira**. Khi cột có quá 2 item, Jira chỉ tô đỏ cột để nhắc; nó không chặn item
  nào chuyển vào.
- Trong code của kit, giới hạn này chỉ dùng để dựng board (`lib/tracker/expected.mjs:48`); không guard nào chặn theo nó.
  Giới hạn kit thật sự chặn là `wip-available`: mỗi dev agent chỉ 1 item In Progress.
- Với `lanes_max: 3`, ba làn thường ở các bước khác nhau: một làn đang build, một làn chờ bạn ở gate ③, một làn ở QA.
  Chỉ khi cả ba cùng chờ bạn approve thì cột In Review mới có 3 item và bị tô đỏ. Màu đỏ đó là lời nhắc có ích: đang có
  nhiều PR chờ bạn.
- Nếu muốn hai con số khớp nhau, phải sửa `contract/policies.yaml` của kit. Contract dùng chung cho mọi dự án, còn
  `lanes_max` là của từng dự án. Mình đề xuất giữ 2.

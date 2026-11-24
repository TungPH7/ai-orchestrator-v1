# SPEC: C2, phần còn lại của lớp chạy song song

> **Module:** C2 "Lớp chạy song song" trong [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md). Phần tối thiểu đã
> xong ở module `parallel-runs` ([SPEC-parallel-runs.md](SPEC-parallel-runs.md), kit PR #290–#293). Spec này là phần còn
> lại, tức phần đầu của `orchestrator-cli` (Cấp 2, `SPEC.md:116`).
>
> **Trạng thái:** đã duyệt 2026-11-20. Viết ở Phiên 33 · Lượt 103, sau khi T20b merge (kit PR #326, `dc400af`). Bạn
> duyệt điểm 1–5, 7, 9 ở Lượt 104; điểm 6 (số agent cùng role) và điểm 8 (nhịp tim của QA) sửa theo thảo luận ở Lượt
> 104, duyệt ở Lượt 105. Thứ tự C1 → T20b → C2 bạn chốt ở Lượt 101.
>
> **Hoàn thành 2026-11-23** (Phiên 35 · Lượt 50): spec, plan, todo ở kit PR #327; sáu phần ở #328–#333; sửa sau review
> bản chép `shop` PR #80, #81 (T13b) ở #334–#336; chạy thật trên Epic `SHOP-81` (T14); sáu đợt sửa sau T14 ở
> #339–#346, có watcher `ao-step watch`; đóng ở #347. Kết quả: [tasks/c2/verification.md](tasks/c2/verification.md):
> 3 trên 6 tiêu chí đạt, tiêu chí 3 đạt 6 trên 8 mục, tiêu chí 4 và 5 không đạt (các lỗi đã sửa); 7,06 USD trên mỗi AC.

## 1. Mục tiêu

**Hiện nay:**
- Phiên chính (Claude) chọn từng lệnh: đọc `/ao-status`, gõ `/ao-build`, chờ xong, gõ `/ao-review`, rồi `/ao-qa`… Mỗi
  lệnh là một lượt Claude đọc kết quả rồi quyết lệnh kế, nên tốn token của phiên chính và chậm khi Claude không trực.
- `runs.lanes_max: 3` cho phép ba lệnh chạy cùng lúc, nhưng chỉ khi phiên chính tự mở đủ ba lệnh.
- Mỗi dev agent chỉ làm một item tại một thời điểm (WIP 1).
- Một lệnh `/ao-review` chạy `reviewer` xong rồi mới tới `security`.
- `/ao-preview` dừng khi bật làn, nên cả Epic `SHOP-7` không có lượt xem trước nào.
- Approve một PR lúc `qa` đang kiểm môi trường thì bản deploy mới cắt ngang lượt QA đó. Hiện chỉ có lời nhắc ở cổng ③.

**Sau module này:**
- `/ao-run <EPIC>` chạy cả Epic: một chương trình viết bằng code thường, không dùng model, đọc Jira và GitHub, rồi tự mở
  các lệnh `ao-step` theo đúng thứ tự của contract, nhiều lệnh cùng lúc trong giới hạn `lanes_max`. Nó dừng ở mọi chỗ cần
  bạn và liệt kê các chỗ đó. Bạn bấm xong thì nó tự chạy tiếp.
- Nhiều agent cùng role (ví dụ hai `fe-dev`) chạy cùng lúc nếu dự án cho phép (`runs.agents_per_role`), mỗi agent một
  item, trong làn của item đó.
- `reviewer` và `security` chạy cùng lúc khi còn chỗ.
- `/ao-preview` bật app của PR ngay trong làn của item.
- `merge-gate` chờ lượt QA đang chạy xong rồi mới merge.
- Mặc định không đổi gì: không gõ `/ao-run` thì kit chạy như hiện nay.

**Ngoài phạm vi:**
- Chế độ "chạy cả dự án" không cần nêu Epic.
- `/ao-spec`, `/ao-plan`, `/ao-request` chạy song song với lệnh khác: chúng vẫn chạy một mình.
- Bộ điều phối tự bấm cổng, tự Accept, tự cắt release hay lên Production.
- `multi-repo` (D1); review kit một lần ở repo kit (để sau C2, Lượt 87); Task bài blog của D2.

## 2. Đã có từ trước

| Việc | Ở đâu |
|---|---|
| Mỗi item một làn (worktree), khóa theo item, trần `lanes_max`, chốt RAM, dải cổng theo chỗ chạy, mỗi môi trường một QA, QA kiểm bản đang chạy | `parallel-runs`, kit PR #290–#293 |
| Thứ tự chạy của từng stage nằm trong contract (`contract/stages.yaml`, khối `runs`) | C1, kit PR #314 |
| Followup lặp lại "worktree QA thiếu `.env`" | Xong, kit PR #306 |
| Followup lặp lại "dọn tiến trình khi QA bị dừng" | Xong, kit PR #309 |
| Followup lặp lại "approve khi QA đang chạy": lời nhắc ở cổng ③ và `/ao-status` | Xong phần lời nhắc, kit PR #306. Còn tín hiệu cho `merge-gate`: phần 6 |

## 3. Sáu phần và thứ tự

| Phần | Việc | Cần xong trước |
|---|---|---|
| 1 | Mỗi chỗ dừng của `ao-step` ghi rõ "chờ ai" | |
| 2 | Bộ điều phối `/ao-run` | Phần 1 |
| 3 | Số agent cùng role chạy cùng lúc (WIP theo số chỗ) | |
| 4 | `reviewer` chạy cùng lúc với `security` | |
| 5 | `/ao-preview` trong làn | |
| 6 | Tín hiệu QA cho `merge-gate` | |

- Mỗi phần một kit PR, test viết đỏ trước, tự merge khi CI xanh như ở C1.
- Phần 3–6 không phụ thuộc nhau; mình làm theo thứ tự trên.
- Sau sáu phần: một lần chép kit vào `shop` (mang luôn T20b và Low 9 của review lần hai PR #79), rồi chạy thật (mục 13).

## 4. Phần 1: chỗ dừng ghi rõ "chờ ai"

Bộ điều phối cần biết một lệnh dừng vì chờ bạn hay chờ máy. Hiện mỗi chỗ dừng chỉ có câu chữ (`STOP: …`, `next: …`), và
`/ao-status` đoán chỗ chờ bạn bằng cách dò chữ (`/^Click|^Accept|^\/ao-preview /`, `lib/workflow/steps.mjs`).

- Mỗi STOP của `decideStep` có thêm trường `waits`:

  | `waits` | Nghĩa | Ví dụ |
  |---|---|---|
  | `you` | Chờ bạn | Cổng ①–⑤, Accept, Click Start spec, Complete hay Release, `seo-ok`, cờ Needs you, câu hỏi mở cho bạn, PR nháp chờ xem trước |
  | `ci` | Chờ CI | CI đang chạy, chưa chạy |
  | `deploy` | Chờ deploy | QA chờ bản mới lên môi trường |
  | `item` | Chờ item khác | Link Blocks chưa merge, WIP của role trên Jira, một QA khác trên cùng môi trường, khóa của item |
  | `usage` | Chạm giới hạn usage | |
  | `fix` | Lệnh không áp dụng được như đã gõ, hay có chỗ cần sửa trước | `project.yaml` sai, nhánh không đúng luật, lệnh không hợp trạng thái của item |
  | `next` | Lệnh kế tiếp chạy được ngay, ghi ở trường `then` | Review thấy Critical hay High: `then` là `/ao-fix <PR>` |

- Câu chữ của STOP giữ nguyên.
- Một test đi qua mọi STOP trong bộ test của `decideStep` và đòi trường `waits`.
- `/ao-status` dùng `waits: you` cho danh sách "Waiting for you", thay cho phép dò chữ.
- **Về ghi chú ở Lượt 100** ("điểm dừng phải nằm trong contract để bộ điều phối đọc được"): năm cổng vẫn nằm trong
  contract như hiện nay. Các chỗ dừng khác, như `seo-ok` của T20b, mang nhãn `waits` ngay trong code của `decideStep`.
  Bộ điều phối hỏi `decideStep` chứ không tự quyết, nên nó thấy mọi chỗ dừng, kể cả chỗ dừng thêm sau này, mà không phải
  chép luật sang chỗ thứ hai.

## 5. Phần 2: bộ điều phối `/ao-run`

### 5.1 Lệnh và phạm vi

- `node .ai-orchestrator/scripts/ao-step.mjs run <EPIC> --go`, gọi qua skill `/ao-run <EPIC>`.
  - Phạm vi: Epic đó, các Story, Task, Bug và Sub-task của nó.
  - `run <KEY> <KEY>…`: chỉ các item bạn nêu, ví dụ một Bug không thuộc Epic nào.
  - Không có `--go`: chỉ in kế hoạch (lệnh nào sẽ mở ngay, item nào chờ bạn), không chạy agent.
  - `--stop`: bảo bộ điều phối đang chạy thôi mở lệnh mới; các lệnh đang chạy chạy hết.
  - `--budget <USD>`: ngân sách của lần chạy này (mục 5.5).
- Không có chế độ chạy cả dự án. Bạn vẫn chọn ưu tiên bằng cách chọn Epic, như quyết định 3 của concern 5.
- Task bài blog của D2 không nằm trong Epic tính năng nào, nên không vào phạm vi. Khi làm D2, spec D2 đặt cho Task bài
  viết một nhãn riêng, và bộ điều phối bỏ qua nhãn đó.
- Mỗi dự án chỉ có một bộ điều phối chạy tại một thời điểm (`.ai/runs/dispatcher.json`).
- Bạn và phiên chính vẫn gõ lệnh tay được. Bộ điều phối thấy khóa của lệnh tay và để yên item đó.

### 5.2 Vòng chạy

1. Đọc các item trong phạm vi từ Jira (một lần tìm), PR của chúng từ GitHub, và các khóa đang sống.
2. Với mỗi item, lấy lệnh kế tiếp từ trạng thái (`nextFor`, bảng mà `/ao-status` đang dùng), rồi hỏi `decideStep` của lệnh
   đó mà không chạy (như khi gõ lệnh không có `--go`). Kết quả là "chạy được", hay STOP kèm `waits`.
3. Xếp các lệnh chạy được theo kiểu "làm xong việc đang dở trước": QA → review → fix → build → request → plan → spec. Cùng
   loại thì theo thứ tự trên board Jira (rank).
4. Mở lệnh, mỗi lệnh là một tiến trình con `ao-step <lệnh> <arg> --go`, khi `admit` còn cho phép: còn chỗ theo
   `lanes_max`, mỗi item một lệnh, mỗi môi trường một QA, đủ chỗ của role (phần 3), đủ RAM. Lệnh con vẫn tự lấy khóa
   như hiện nay; nếu nó bị từ chối thì bộ điều phối thử lại ở vòng sau.
5. Lệnh phải chạy một mình (`spec`, `plan`, `request`) chờ tới khi không còn lệnh nào chạy. Trong lúc nó chờ, bộ điều phối
   không mở lệnh mới, để nó không phải chờ mãi.
6. Quay lại bước 1 khi một lệnh con xong, hoặc sau mỗi 2 phút. Mỗi vòng chỉ đọc Jira và GitHub, không gọi model, nên
   không tốn token.

### 5.3 Việc bộ điều phối tự chạy và việc chờ bạn

| Tự chạy | Chờ bạn (`waits: you`) |
|---|---|
| `/ao-spec`, `/ao-plan` khi Epic ở Specifying hay Planning | Click Start spec, Approve spec (cổng ①), Approve plan (cổng ②) |
| `/ao-request` cho lời nhờ tới role cố vấn | Câu hỏi mở cho bạn |
| `/ao-build` cho item Ready, và build lại sau QA fail | `seo-ok` của item `ao-seo` ngoài Epic |
| `/ao-review` cho PR sẵn sàng, CI xanh | PR nháp: bạn `/ao-preview` rồi `/ao-review`, hay gõ thẳng `/ao-review` để bỏ qua bước xem trước |
| `/ao-fix` khi báo cáo trên head có Critical hay High, theo luật của contract ("Review yêu cầu sửa → về In Progress"); dừng ở Rework 3 như hiện nay | Approve PR (cổng ③), chấp nhận một High thay vì sửa |
| `/ao-qa` cho item Ready for QA | Accept, cờ Needs you |
| | `/ao-release`, `/ao-ship`, `/ao-rollback`, `/ao-intake`, cổng ④⑤, Complete, Release trên Jira |

- Finding Medium hay Low không làm bộ điều phối chạy `/ao-fix`: chúng nằm chờ bạn ở cổng ③, như luật hiện nay.
- Một lệnh thất bại thì bộ điều phối không mở lại lệnh đó cho cùng item trong lần chạy này. Luật "thất bại 2 lần thì gắn
  cờ Needs you" của contract vẫn như cũ.

### 5.4 Khi nào bộ điều phối dừng

- Mọi item trong phạm vi đã Done hay Cancelled.
- Không còn gì chạy được, và đã chờ bạn quá `runs.idle_hours` giờ (mặc định 8). Trong lúc chờ, nó vẫn đọc Jira mỗi 2
  phút, nên khi bạn bấm duyệt thì việc kế tiếp tự chạy.
- Chạm ngân sách (mục 5.5), hay một lệnh con chạm giới hạn usage: không mở lệnh mới, chờ các lệnh đang chạy xong, rồi
  dừng và in giờ hạn mức mở lại nếu biết.
- `--stop`.

### 5.5 Ngân sách

- Mỗi lần `/ao-run` có một ngân sách: `--budget <USD>`, mặc định `runs.budget_usd` (30 USD).
- Chi phí của các lệnh mà bộ điều phối đã mở chạm ngân sách thì nó không mở lệnh mới. Lệnh đang chạy được chạy hết, nên
  tổng thật có thể vượt ngân sách một ít.
- Gõ `/ao-run` là bạn duyệt các lượt agent trong phạm vi và ngân sách đó.

### 5.6 Log và `/ao-status`

- Mỗi sự kiện một dòng, in ra và ghi vào `.ai/runs/_run/<ngày>.log`, ví dụ:
  - `14:02 start /ao-build SHOP-81 (slot 1)`;
  - `14:40 end /ao-build SHOP-81: STOP draft PR #85 waits for your preview`;
  - `14:40 waiting for you: SHOP-80 gate ③ PR #84`.
- Log của mỗi lệnh con: `.ai/runs/<KEY>/run-<giờ>.log`.
- `/ao-status` in thêm bộ điều phối đang chạy: phạm vi, giờ bắt đầu, chi phí tới lúc đó, các lệnh con.
- Phiên chính chạy `/ao-run` ở nền, theo dõi log, và báo bạn từng chỗ chờ kèm các bước bấm, như hiện nay.

### 5.7 Tiến trình con trên Windows

- Bộ điều phối dừng lệnh con bằng `killTree`, không bằng cách dừng tiến trình cha: trên Windows, dừng tiến trình cha để
  lại tiến trình con chạy tiếp (bài học ở Phiên 33).
- `--stop` ghi một file dừng; bộ điều phối đọc file đó ở mỗi vòng.

## 6. Phần 3: số agent cùng role chạy cùng lúc

Sửa theo Lượt 104. Một làn là một item, và mỗi lúc trong làn chỉ có một agent: Story có Sub-task BE và FE vẫn ở một làn,
`be-dev` làm trước, `fe-dev` làm sau. Agent không phải một "nhân viên" cố định: mỗi lượt build mở một tiến trình agent
mới theo role, xong thì tắt. Phần này cho phép **nhiều tiến trình cùng role chạy cùng lúc, mỗi tiến trình một item, ở làn
của item đó**. Một agent không bao giờ làm hai item cùng lúc.

- **Hôm nay:** luật WIP của contract là "mỗi dev agent tối đa 1 item In Progress". Trên Jira, mọi agent `fe-dev` cùng
  mang giá trị Agent `fe-dev`, nên luật này đếm chung. Với `lanes_max: 3` và hai Story chỉ có phần FE, Story thứ hai chờ
  dù còn làn trống.
- **Sau phần này:** `runs.agents_per_role` trong `project.yaml`, ví dụ `{ fe-dev: 2 }`: tối đa 2 agent `fe-dev` chạy cùng
  lúc. Role không nêu thì là 1, như `wip_limits.dev-agent` của contract. Ví dụ với `lanes_max: 3`:
  - làn 1: `fe-dev` làm SHOP-81;
  - làn 2: `fe-dev` làm SHOP-82;
  - làn 3: `be-dev` làm SHOP-83.
- Tổng số agent vẫn không vượt `lanes_max`; con số của một role cũng không được vượt `lanes_max`.
- Hai chỗ đọc con số này:
  - guard `wip-available` (hook `jira-guard` và bước kiểm WIP trên Jira trước mỗi lượt build của `ao-step`);
  - `claimRole` và `admit` của `lib/workflow/locks.mjs`, thay cho luật "mỗi role một lệnh build hay fix".
- Contract chỉ thêm một câu ghi chú ở `wip_limits.dev-agent`: dự án nâng được từng role bằng `runs.agents_per_role`.
  Mặc định vẫn là 1.
- Board Jira không đổi: chỉ cột In Review có giới hạn trên board.
- Hai agent cùng role dễ sửa chung một file, và PR sau sẽ xung đột với `develop`. Hiện `ao-step` dừng kèm lời chỉ
  (`waits: fix`). Plan của `sa` nên nối các item như vậy bằng link Blocks để chúng không chạy cùng lúc. Đó là lý do mặc
  định giữ 1.

## 7. Phần 4: `reviewer` chạy cùng lúc với `security`

- Khi một lệnh review còn nợ cả hai báo cáo, và `admit` còn chỗ cho thêm một agent (trần, RAM), hai agent chạy cùng lúc.
  Không đủ chỗ thì chạy lần lượt như hiện nay. Với `lanes_max: 1`, không có gì đổi.
- Agent thứ hai giữ thêm một khóa riêng (`<KEY>+security`), nên trần đếm đúng số agent, không chỉ số lệnh.
- Sửa bốn chỗ hai lượt đang dùng chung:
  1. **Worktree:** mỗi role một worktree, `pr-<N>-reviewer` và `pr-<N>-security`, gỡ khi lượt của role đó xong.
  2. **Ledger:** `reviewer` và `security` mỗi role một ledger, `.ai/ledger/<KEY>.<role>.md`, như `seo`. Áp dụng cả khi
     chạy lần lượt, để chỉ có một luật.
  3. **State của lượt chạy:** `state.json` của item được ghi dưới một khóa ngắn, đọc rồi sửa đúng mục của lượt mình, nên
     hai lượt xong cùng lúc không làm mất bản ghi của nhau.
  4. **Vòng chạy:** runner nhận một nhóm lượt chạy cùng lúc, chờ cả nhóm xong rồi mới quyết lại.
- Tốn token như cũ. Hạn mức 5 giờ của gói hết nhanh hơn trong lúc hai agent cùng chạy. Mỗi vòng review bớt khoảng 7–10
  phút [Ước].
- PR tầng `normal` hay `docs` chỉ cần `reviewer` (C1), nên không đổi.

## 8. Phần 5: `/ao-preview` trong làn

- Khi bật làn, `/ao-preview <KEY>` bật app của PR ngay trong làn của item. Thư mục chính vẫn đứng ở `develop`.
- **Cổng:** cổng mặc định của `project.yaml`. Đó là dải cổng để dành cho bạn; agent trong làn dùng cổng dời
  `(chỗ + 1) × port_step`. Cổng đang bận, ví dụ bạn tự bật app ở thư mục chính, thì preview dừng kèm lý do, như hiện nay.
- **Database:** database mặc định ở máy, như khi bạn tự chạy app, và như `/ao-preview` của A4 trước khi bật làn.
- **Package:** làn đã có package từ lượt build. Chỉ cài lại khi lockfile đã đổi từ lần cài trước.
- **Khóa:** preview giữ khóa của item nó đang chạy, nên không agent nào sửa code của item đó trong lúc bạn xem. Khóa này
  không tính vào số agent. `/ao-fix` và `/ao-review` của item đó tự tắt preview trước, như hiện nay. Lệnh của item khác
  vẫn chạy.
- `preview` ra khỏi danh sách lệnh phải chạy một mình.
- Ảnh từng màn hình và mẫu request, response của A4 giữ nguyên.

## 9. Phần 6: tín hiệu QA cho `merge-gate`

Sửa theo Lượt 104: không đếm giờ khi QA còn làm, chỉ đếm khi QA thôi làm. Số liệu của `shop`: 78 lượt QA, trung vị 7
phút, lâu nhất 32 phút (SHOP-76).

1. **QA bắt đầu:** `ao-step` (bằng login `gh` của bạn, như các lệnh release) đặt commit status `ao/qa` = `pending`, kèm
   "qa tests `<KEY>`", lên commit mà lượt QA kiểm, tức commit đang chạy trên môi trường.
2. **QA đang làm:** cứ 2 phút, `ao-step` đặt lại status đó (nhịp tim). Không có mốc giờ cho cả lượt QA.
3. **QA xong** (PASS, FAIL, hay bị dừng): `ao-step` đặt status `success` ngay. Status chỉ báo "QA đã xong", không báo kết
   quả.
4. **`ao-step` chết** (máy tắt hay ngủ, mất mạng, tiến trình bị giết): không còn nhịp tim. `merge-gate` coi một status
   `pending` không được đặt lại trong 10 phút là đã hết. 10 phút là 5 nhịp bị lỡ, để một lần mất mạng ngắn không bị coi
   là chết.
5. **Agent QA đứng im:** log của agent không có dòng mới trong 15 phút thì `ao-step` coi là treo và đặt `success` ngay.
   15 phút vì một lệnh chạy cả bộ E2E có thể im lặng vài phút mà không phải treo.
6. **`merge-gate`,** trước khi merge một PR mà việc merge sẽ deploy môi trường đó, đọc status `ao/qa` trên commit đầu của
   nhánh đích:
   - `pending` còn mới thì nó không merge ngay, mà chờ ngay trong lượt chạy của nó trên GitHub, mỗi phút đọc lại một lần;
   - status thành `success`, hay quá 10 phút không được đặt lại, thì nó merge như thường;
   - nhờ chờ ngay trong lượt chạy, không cần ai gọi lại `merge-gate`, kể cả khi `ao-step` đã chết.
7. `merge-gate` chỉ tin status do một login trong `AO_APPROVERS` đặt, tức login `gh` của bạn mà `ao-step` dùng. Status do
   người hay App khác đặt bị bỏ qua.
8. Đoán nhầm là treo thì PR được merge, bản deploy mới cắt ngang lượt QA, và QA chạy lại. Đó là chuyện vẫn xảy ra hôm
   nay, nên không tệ hơn.

- Deployer không đổi.
- Kết quả: bạn approve lúc nào cũng được. Lượt QA không còn bị bản deploy mới cắt ngang, và không còn mất trắng.

## 10. Cấu hình

```yaml
# project.yaml
runs:
  worktrees: false
  lanes_max: 1
  min_free_ram_gb: 3
  port_step: 100
  copy: []
  agents_per_role: {}  # mới, phần 3: số agent cùng role chạy cùng lúc, mỗi agent một item, ví dụ { fe-dev: 2 }; mặc định 1, không quá lanes_max
  budget_usd: 30     # mới, phần 2: ngân sách mặc định của mỗi lần /ao-run
  idle_hours: 8      # mới, phần 2: /ao-run chờ bạn tối đa bấy nhiêu giờ khi không còn việc chạy được
```

- `lib/scaffold/project.schema.json` kiểm ba khóa mới.
- `/ao-run` vẫn có ích với `lanes_max: 1`: nó chạy lần lượt từng lệnh mà không cần phiên chính gõ.
- `shop` đang có `worktrees: true`, `lanes_max: 3`.

## 11. Cấu trúc

```text
lib/workflow/dispatch.mjs     # mới: chọn việc, xếp thứ tự, phân loại chờ ai, ngân sách (hàm thuần)
lib/workflow/steps.mjs        # waits trên mọi STOP; preview trong làn
lib/workflow/runner.mjs       # nhóm lượt chạy cùng lúc (review)
lib/workflow/runs.mjs         # ghi state.json dưới khóa ngắn
lib/workflow/locks.mjs        # agents_per_role, khóa của agent thứ hai, khóa của preview
lib/workflow/preview-run.mjs  # bật app trong làn
lib/tracker/facts.mjs         # wipHolders đọc agents_per_role của dự án
scripts/ao-step.mjs           # lệnh run: tiến trình con, log, --stop, --budget; nhịp tim ao/qa
lib/quality/merge-gate.mjs, scripts/merge-gate.mjs  # merge-gate chờ ao/qa
kit/.claude/skills/ao-run/SKILL.md      # mới
kit/.claude/skills/ao-status, ao-preview, ao-review/SKILL.md
contract/policies.yaml        # ghi chú runs.agents_per_role
lib/scaffold/project.schema.json, docs/dev-workflow.md, README.md
tests/, tasks/c2/
```

## 12. Chiến lược test

Test viết trước, bằng `node:test`, theo mẫu test sẵn có.

- **Phần 1:** mọi STOP trong bộ test của `decideStep` có `waits`; `/ao-status` lập danh sách chờ bạn từ `waits`.
- **Phần 2 (`dispatch.mjs`):**
  - thứ tự "làm xong việc đang dở trước", cùng loại theo rank;
  - lệnh chạy một mình chờ, và trong lúc đó không mở lệnh mới;
  - phân loại chờ bạn và chờ máy;
  - không vào phạm vi: item ngoài Epic, item đang có khóa của lệnh tay;
  - ngân sách, giới hạn usage, `idle_hours`, `--stop`;
  - lệnh thất bại không mở lại trong lần chạy;
  - vòng chạy với Jira, GitHub và tiến trình con giả, từ Epic Specifying tới khi mọi item chờ Accept.
- **Phần 3:** `admit`, `claimRole` và `jiraWipStop` với `agents_per_role` 1 và 2; con số lớn hơn `lanes_max` bị từ
  chối; Story có Sub-task BE và FE vẫn chạy lần lượt trong một làn.
- **Phần 4:** nhóm hai lượt chạy cùng lúc; đủ chỗ hay thiếu chỗ; hai lượt xong cùng lúc không mất bản ghi `state.json`;
  ledger và worktree theo role.
- **Phần 5:** preview chạy từ làn, giữ khóa của item; `/ao-fix` tắt nó trước; lệnh của item khác vẫn được mở.
- **Phần 6:**
  - `ao-step` đặt `pending` lúc QA bắt đầu, đặt lại mỗi 2 phút, đặt `success` lúc xong hay khi log im 15 phút;
  - `merge-gate` gặp `pending` mới thì chờ và đọc lại mỗi phút; gặp `success` thì merge; gặp `pending` không được đặt
    lại trong 10 phút thì merge;
  - status do login ngoài `AO_APPROVERS` đặt bị bỏ qua.
- **Hồi quy:** cả bộ test hiện có xanh. Không gõ `/ao-run` thì không có gì đổi.

## 13. Kiểm thật

- Chép kit vào `shop` một lần, có review như các lần trước (mang luôn T20b và Low 9).
- Chạy thật bằng `/ao-run` trên **Epic kế tiếp của `shop`** (bạn chọn tính năng), với `lanes_max: 3`:
  - bộ điều phối tự mở `/ao-spec` và `/ao-plan`, dừng ở cổng ① và ②, rồi tự chạy tiếp sau khi bạn bấm;
  - ít nhất một lần hai lệnh build chạy cùng lúc do bộ điều phối mở;
  - ít nhất một lần `reviewer` và `security` chạy cùng lúc;
  - ít nhất một lần `/ao-preview` trong làn;
  - ít nhất một lần bạn approve một PR trong lúc `qa` chạy, và `merge-gate` chờ QA xong rồi mới merge;
  - `runs.agents_per_role` 2 cho một role, nếu plan có hai item của role đó không nối nhau bằng link Blocks.
- Cùng Epic này đo luôn tiêu chí 7 của C1 (USD trên mỗi AC), đang chờ Epic kế tiếp.

## 14. Ranh giới

**Luôn làm:**
- mặc định không đổi gì khi không gõ `/ao-run`;
- bộ điều phối chỉ hỏi `decideStep`, không tự quyết thay luật của contract;
- dừng ở mọi chỗ `waits: you`;
- dừng khi chạm ngân sách hay giới hạn usage.

**Hỏi bạn trước:**
- đổi contract ngoài câu ghi chú ở phần 3;
- nâng `runs.agents_per_role` hay `budget_usd` trên một dự án;
- chọn Epic chạy thật.

**Không làm:**
- tự bấm cổng, tự Accept, tự chấp nhận một High;
- chạy `/ao-release`, `/ao-ship`, `/ao-rollback`, `/ao-intake`;
- chạy hai lệnh trên cùng một item;
- chạy cả dự án khi không nêu Epic hay item.

## 15. Tiêu chí hoàn thành

1. Sáu kit PR đã merge, CI xanh. `npm run validate`, `npm test` và `npm run agents:check` xanh.
2. Bản chép kit vào `shop` đi qua `/ao-review`, và `doctor` đạt.
3. Kiểm thật ở mục 13 đạt từng gạch đầu dòng.
4. Trong Epic chạy thật, phiên chính không gõ `/ao-build`, `/ao-review`, `/ao-fix` hay `/ao-qa`: chỉ `/ao-run`,
   `/ao-preview`, và các bước bạn bấm.
5. Không lượt nào dừng vì giành khóa, giành git hay ghi đè `state.json`.
6. Ghi số đo: thời gian từ Ready tới Done của mỗi item, so với `SHOP-7`; USD trên mỗi AC.

## 16. Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Bộ điều phối mở nhiều lượt trả phí khi không ai trực | Phạm vi theo Epic, ngân sách mỗi lần chạy, dừng khi chạm giới hạn usage |
| Item dồn lại chờ bạn nhanh hơn | Log và `/ao-status` liệt kê chỗ chờ; phiên chính báo kèm các bước bấm |
| Hai item cùng role sửa cùng chỗ, PR sau xung đột | `agents_per_role` mặc định 1; plan nối bằng link Blocks; xung đột thì dừng chờ bạn |
| Đọc Jira và GitHub mỗi 2 phút chạm giới hạn API | Mỗi vòng một lần tìm trên Jira; chỉ đọc chi tiết item có lệnh kế tiếp là lệnh `ao-step` |
| Tiến trình con mồ côi trên Windows | `killTree`, file dừng thay cho dừng tiến trình cha |
| Hai agent review cùng lúc làm hạn mức 5 giờ hết nhanh | Chỉ chạy cùng lúc khi còn chỗ; trần `lanes_max` |
| Status `pending` của QA chết giữa chừng chặn merge | Nhịp tim mỗi 2 phút; `merge-gate` bỏ qua status không được đặt lại trong 10 phút; log im 15 phút thì `ao-step` gỡ |
| Một lượt `merge-gate` chờ QA làm hàng chờ của `merge-gate` lâu hơn | Lượt QA trung vị 7 phút; lượt chạy sau trong hàng chờ thấy mọi thứ lượt bị bỏ qua thấy |
| Sửa lõi runner và khóa làm hỏng cách chạy hiện nay | Mỗi phần một PR; bộ test hồi quy; không gõ `/ao-run` thì không đổi |

## 17. Chi phí ước tính

| Việc | Thời gian | USD [Ước tính] |
|---|---|---|
| Plan và todo (phiên chính) | vài giờ | 0 |
| Phần 1 | khoảng nửa ngày | 0 |
| Phần 2 | khoảng 1,5 ngày | 0 |
| Phần 3, 4, 5, 6 | mỗi phần khoảng nửa ngày | 0 |
| Chép kit vào `shop`, review 1–2 vòng | khoảng 2 giờ | 15–30 |
| Kiểm thật | đi cùng Epic kế tiếp của `shop` | chi phí của các item; C2 không thêm lượt agent nào |
| **Cộng** | **khoảng 4–5 ngày** | **khoảng 15–30, ngoài chi phí của Epic** |

## 18. Điểm bạn đã duyệt

Điểm 1–5, 7, 9 ở Lượt 104; điểm 6 và 8 sửa theo thảo luận ở Lượt 104 và duyệt ở Lượt 105.

1. **Sáu phần, sáu kit PR,** thứ tự như mục 3; sau đó một lần chép kit vào `shop`.
2. **`/ao-run` chỉ nhận một Epic hay các item bạn nêu,** không có chế độ chạy cả dự án.
3. **Việc tự chạy và việc chờ bạn** như bảng ở mục 5.3. Riêng `/ao-fix` tự chạy khi có Critical hay High; Medium, Low
   chờ bạn ở cổng ③.
4. **Ngân sách 30 USD mỗi lần `/ao-run`,** chờ bạn tối đa 8 giờ, dừng khi chạm giới hạn usage.
5. **Chỗ dừng mang nhãn `waits` trong code,** không chép sang contract (khác ghi chú ở Lượt 100); năm cổng vẫn ở contract.
6. **Số agent cùng role chạy cùng lúc bằng `runs.agents_per_role`,** mỗi agent một item, một làn; mặc định 1; contract
   chỉ thêm một câu ghi chú.
7. **`/ao-preview` trong làn** dùng cổng mặc định và database mặc định ở máy, và giữ khóa của item trong lúc chạy.
8. **Tín hiệu QA cho `merge-gate`** bằng commit status `ao/qa` với nhịp tim mỗi 2 phút; `merge-gate` chờ trong lượt chạy
   của nó, bỏ qua status không được đặt lại trong 10 phút; log của agent QA im 15 phút thì `ao-step` gỡ status.
9. **Chạy thật trên Epic kế tiếp của `shop`,** bạn chọn tính năng; Epic đó đo luôn tiêu chí 7 của C1.

## Nguồn

- Mã kit ở `main` `dc400af`: `lib/workflow/steps.mjs` (`nextFor`, `spaceStatus`, `reviewRuns`, `afterReviews`),
  `lib/workflow/locks.mjs` (`admit`, `jiraWipStop`), `lib/workflow/runner.mjs`, `lib/tracker/facts.mjs` (`wipHolders`),
  `lib/tracker/expected.mjs`, `contract/stages.yaml`, `contract/policies.yaml`, `tracker/jira.yaml`.
- [SPEC-parallel-runs.md](SPEC-parallel-runs.md), [SPEC-c1.md](SPEC-c1.md) mục 10, `SPEC.md` mục module.
- [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md): hàng C2, concern 2, concern 5.
- [misc/thao-luan-sdlc-song-song.md](misc/thao-luan-sdlc-song-song.md), [sdlc-song-song-sua-kit-hay-clone.md](misc/thao-luan/sdlc-song-song-sua-kit-hay-clone.md),
  [lan-va-agent-cung-luc.md](misc/thao-luan/sdlc-song-song/lan-va-agent-cung-luc.md).
- [tasks/handoff-2026-11-16-followups.md](tasks/handoff-2026-11-16-followups.md): `/ao-preview` khi bật làn, approve
  khi QA đang chạy.
- Phiên 33 · Lượt 100: hai ghi chú cho spec C2.

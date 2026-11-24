# SPEC: bật hay tắt review theo item, review sau merge

> **Nguồn:** nhật ký Phiên 35 · Lượt 58–61 (`misc/brainstorm-discussion.md`). Bạn duyệt ở Lượt 60 và 61: chặn release
> (câu 1), `/ao-run` dừng để bạn tự gõ review sau merge (câu 2), nhãn trên từng item với mặc định trong `project.yaml`
> (câu 3), một item sửa cho mọi Critical và High, và dòng nhắc file `critical` ở cổng ③.
>
> **Trạng thái:** đã duyệt 2026-11-23. Không có nhánh kit riêng, không có khóa tắt review cho cả dự án.
>
> **Kit xong 2026-11-23:** kit PR #350. Chép vào `shop` ở SHOP-94 (PR #93), rồi chạy thử trên Epic `SHOP-95`. Sửa sau
> review PR #93 và lượt chạy thử ở kit PR #351, sau review bản chép kế tiếp (SHOP-99, PR #97) ở #352; bản chép `ee5865f`
> (SHOP-100) mang cả hai. Còn mở: release `v0.4.0` của `shop`. Tiến độ ở mục 9 của [tasks/todo.md](tasks/todo.md).

## 1. Mục tiêu

**Hiện nay:** mọi PR của item vào `develop` đều chờ `reviewer`, và `security` khi tier đòi, trừ luật miễn `light-docs`
(C1 spec 3.4). `merge-gate` và `audit` đòi báo cáo của App review trên head.

**Sau module này:**
- Bạn chọn review cho từng item bằng nhãn Jira. Item bỏ review đi thẳng từ build tới cổng ③: bạn vẫn approve từng PR, CI
  vẫn chạy, QA vẫn chạy sau merge.
- Mặc định của dự án nằm trong `project.yaml`. Nhãn trên item luôn thắng mặc định.
- Bỏ review nghĩa là bỏ hết, kể cả file `critical`. Ở cổng ③, kit ghi rõ PR sửa file `critical` nào để bạn đọc kỹ.
- Xong các item, `/ao-review <KEY>` review một lượt mọi PR đã bỏ review của Epic (hay của một item), sau khi chúng đã
  merge.
- PR release vào `main` chỉ merge được khi mọi PR bỏ review trong bản đó đã qua review sau merge, và mọi Critical hay
  High nó tìm ra đã có bản sửa trong bản đó.

## 2. Chọn review cho item

1. **Mặc định của dự án:** `review.default` trong `.ai-orchestrator/project.yaml`, `on` hoặc `off`. Thiếu khóa này là
   `on`, như trước. `project.yaml` là file được bảo vệ: chỉ bạn merge PR sửa nó.
2. **Nhãn trên item** (`tracker/jira.yaml`, `work_labels`): `ao-review-on` thì review, `ao-review-skip` thì bỏ. Có cả
   hai nhãn thì review. Không có nhãn nào thì theo mặc định.
3. **Ai đặt nhãn:** bạn, trên Jira, bất cứ lúc nào trước khi approve ở cổng ③. ba đặt sẵn khi tạo item, nếu plan bạn duyệt
   ghi item đó review hay bỏ review. Ngoài ra hook `block-atlassian` chặn mọi agent thêm hay gỡ hai nhãn này.
4. **Lịch sử nhãn:** như nhãn mức (C1, `trustedLevel`). Tài khoản agent mà phiên chính cũng dùng chỉ đổi được theo hướng
   an toàn: thêm `ao-review-on`, gỡ `ao-review-skip`. Một thay đổi của tài khoản đó theo hướng bỏ review thì không
   tính. Muốn bỏ review cho item, bạn tự gắn nhãn trên Jira.
5. **Lúc nào tính:** lúc merge. `merge-gate` đọc nhãn lúc nó merge. `audit` dựng lại nhãn tại lúc PR merge từ lịch sử nhãn,
   và đọc `project.yaml` ở commit cha thứ nhất của commit merge, tức `develop` ngay trước khi PR vào.
6. **Phạm vi:** chỉ PR của Story, Task, Bug vào `develop`. PR vào nhánh release, hotfix vào `main`, PR tài liệu, báo cáo
   release và merge back giữ luật cũ. Luật miễn `light-docs` xét trước: PR nào nó miễn thì vẫn mang vết miễn như cũ.
7. **Review đã tìm ra Critical hay High:** nếu một báo cáo của App review trên PR từng có Critical hay High (ví dụ bạn gõ
   `/ao-review <PR> full`), item không còn được bỏ review trên PR đó: nó cần báo cáo như thường, giống luật miễn.

## 3. PR bỏ review

1. `/ao-review <PR>` của item bỏ review: PR nháp được đánh dấu ready như hiện nay, rồi ao-step đăng một review COMMENT
   của App review trên head, gọi là **vết bỏ review**. Vết ghi item, head, lý do (nhãn hay mặc định), và danh sách file
   `critical` mà PR sửa. Không có agent nào chạy. Lệnh dừng ở cổng ③, chờ bạn.
2. **Dòng nhắc file `critical`:** khi PR sửa file `critical` (đường dẫn được bảo vệ và `critical_paths`, của kit và của
   dự án), chỗ dừng ở cổng ③, `/ao-status <KEY>` và vết trên GitHub đều ghi: "PR #N sửa file critical mà không review:
   <danh sách>. Đọc kỹ diff của các file này trước khi approve."
3. `/ao-review <PR> full` vẫn review đủ như trước.
4. `/ao-run` không chờ bạn chọn xem trước hay review với item bỏ review: nó gõ `/ao-review <PR>` ngay sau build. Bạn vẫn
   `/ao-preview <KEY>` được trước khi approve.
5. **`merge-gate` và `audit`:** tự tính lại lựa chọn ở mục 2 bằng Jira và GitHub, không tin vết. Khi item bỏ review, điều
   kiện "báo cáo của từng role trên head" được thay bằng "vết bỏ review trên head". CI, approve của bạn và mọi điều kiện
   khác giữ nguyên. Ruleset không đổi.
6. Không có báo cáo thì không có finding cho Task finding của Epic.

## 4. Review sau merge: `/ao-review <KEY>`

1. **KEY** là một Epic (các Story, Task, Bug của nó) hay một Story, Task, Bug.
2. **PR cần review:** PR của các item đó, đã merge vào `develop`, có vết bỏ review trên head cuối, và chưa có dấu review
   sau merge (mục 4.6). Item chưa merge được liệt kê, không review.
3. **Phần review:** diff gộp `git diff <base> <head> -- <files>`:
   - `base`: commit cha thứ nhất của commit merge của PR cũ nhất trong số đó;
   - `head`: `origin/develop` lúc lệnh chạy;
   - `files`: các file của những PR đó, file đổi tên tính cả hai tên.

   Một PR đã review riêng mà sửa cùng các file đó thì phần sửa của nó cũng nằm trong diff.
4. **Agent:** `reviewer` luôn chạy; `security` khi tier của các file hay mức của item đòi, như review PR. Hai agent chạy
   cùng lúc khi còn chỗ, mỗi agent trong một worktree ở `head`. Mỗi agent lưu báo cáo theo mẫu review vào
   `.ai/reviews/<KEY>-<role>.md` và **không đăng**.
5. **Sau hai lượt chạy, ao-step tự làm, không agent:**
   1. Critical và High của cả hai báo cáo vào **một Task sửa** thuộc Epic, tạo bằng token CI, có nhãn `ao-review-on`.
      Task này chặn Epic. Lỗi chỉ thuộc một app thì Task mang nhãn role của app đó; lỗi ở nhiều app thì mỗi role một
      Sub-task. Task sửa luôn review trên PR của nó, nên không cần một lượt review sau merge nữa.
   2. **Dấu review sau merge** trên từng PR đã review: comment thường của App review (PR đã merge vẫn nhận comment), ghi
      KEY, head đã review, số Critical và High, và key Task sửa nếu có.
   3. Báo cáo đầy đủ: một comment trên KEY trong Jira, bằng token CI.
   4. Medium và Low: vào Task finding của Epic như hiện nay, một comment cho lượt review này. Item ngoài Epic thì chỉ ghi
      trong comment ở bước 3.
   Mỗi bước tìm lại việc đã làm trước khi làm, nên chạy lại lệnh không tạo gì hai lần. Lượt chạy agent đã xong mà ao-step
   chưa đăng thì lệnh đăng từ báo cáo đã lưu, không chạy lại agent.
6. Không còn PR nào cần review thì lệnh dừng và nói vậy.

## 5. Chặn ở release

1. **PR release vào `main`** (`merge-gate` lúc merge, `audit` lúc deploy Production): với mỗi PR của item mà bản release
   mang tới và có vết bỏ review trên head, cần dấu review sau merge mới nhất của App review, với 0 Critical và High, hoặc
   có Task sửa mà PR của nó cũng nằm trong bản release.
2. Thiếu thì PR release chờ, với dòng "review sau merge của #N (KEY): /ao-review <Epic>".
3. `/ao-ship` dừng trước, với cùng danh sách. `/ao-release` cắt nhánh như cũ và in danh sách đó: Staging vẫn nhận bản để QA.

## 6. `/ao-run` và `/ao-status`

1. `/ao-run <EPIC>`: khi mọi item của Epic, trừ Task finding, đã Done hay Cancelled, và còn PR cần review sau merge, nó dừng
   với "chờ bạn: /ao-review <EPIC>". Nó không tự chạy lượt này, vì lượt này tốn tiền.
2. `/ao-status <KEY>` của item: dòng "Review: bỏ (nhãn ao-review-skip)" hay "(mặc định của dự án)", cùng dòng nhắc file
   `critical`.
3. `/ao-status <EPIC>`: các PR còn chờ review sau merge, và kết quả lượt review sau merge gần nhất.

## 7. Không đổi

Workflow trên Jira, CI (SAST, quét secret, `osv-scanner`), QA, cả năm cổng, ruleset, luật miễn `light-docs`, cách review
một PR có review.

## 7b. Sửa sau review `shop` PR #93 và lượt thử SHOP-95 (2026-11-23)

- **Nhãn gắn lúc tạo item (2.4):** nhãn `ao-review-skip` mà tài khoản agent gắn lúc tạo item chỉ được tính khi item được tạo trước lần đầu Epic của nó qua cổng ②. Item tạo sau cổng ②, hay không thuộc Epic nào, thì nhãn không được tính: bạn tự gắn. Dấu vết, chỗ dừng và `/ao-status` ghi ai gắn nhãn.
- **Báo cáo của review sau merge (4.4, 4.5):**
  - ao-step giữ mã băm của file khi lượt chạy kết thúc, và không đăng file đã đổi sau đó. Mã băm bắt được thay đổi vô tình hay qua Write và Edit, nhưng không phải chốt chặn trước một agent cố ý: mã băm nằm trong `state.json`, mà agent ghi được cả file đó lẫn báo cáo bằng Bash (mục 7c);
  - gh-guard chỉ cho đúng role ghi file báo cáo của nó, nhưng chỉ qua Write và Edit; nó không kiểm đích ghi của lệnh Bash;
  - comment trên Jira mở đầu bằng `ao-step:`, và không comment nào của ao-step được đọc là báo cáo QA;
  - dấu trên PR đi sau cùng, nên một bước Jira lỗi thì lần gõ lại vẫn đăng tiếp.
- **Release (5.3):** `/ao-release` và `/ao-ship` ghi lệnh `/ao-review` với khóa Epic của item.
- **Watcher:** file của watcher là của ao-step; watcher ghi lại file mỗi vòng, và một file không được ghi trong ba vòng thì không giữ dự án nữa.

## 7c. Sửa sau review `shop` PR #97 và rủi ro còn lại (2026-11-24)

Bạn chốt ở Phiên 35 · Lượt 78: sửa các lỗi do chính bản sửa trước gây ra, và ngưng vá tiếp các lỗ của gh-guard.

- **Đã sửa:**
  - review sau merge đăng tiếp sau khi dừng giữa chừng thì giữ đủ các role của lượt review đó, kể cả `security`, dù các PR còn lại chỉ cần ít role hơn; một báo cáo của lượt đó mất thì các PR chưa có dấu được review lại;
  - role chạy lại sau khi bạn xóa báo cáo đọc đúng head của báo cáo còn giữ; hai báo cáo ở hai head thì không đăng;
  - `audit` xét nhãn tại lúc merge cả khi đọc changelog của Epic: nhãn gỡ sau merge vẫn được tính;
  - watcher thấy watcher khác đã chiếm file của dự án thì dừng, không báo trùng.
- **Rủi ro còn lại, không vá tiếp:** gh-guard đọc mẫu lệnh, nên không phải ranh giới bảo mật. Agent có Bash vẫn có thể:
  - gán biến qua những dạng `printf` và phép tính mà mẫu chưa biết (`printf -vNAME`, `-v` trong dấu nháy, `printf`, `${n}T=0`, `w+=…`);
  - ghi báo cáo của review sau merge cùng mã băm của nó trong `state.json`, vì gh-guard không kiểm đích ghi của lệnh Bash;
  - đổi trường `parent` của item, nên luật "item tạo trước cổng ②" đọc Epic cha hiện tại chứ không phải Epic lúc tạo.
- **Chốt chặn thật** là tách quyền theo tài khoản hệ điều hành: agent chạy dưới tài khoản Windows `ao-agent`, không ghi được file của phiên chính và không đọc được token của bạn (SHOP-40, hạn 2026-12-31). Tới lúc đó, cổng ③ và review của bạn vẫn là chỗ dừng cuối.

## 8. Sửa kèm

Deployer trên VPS gọi `audit` không có trình đọc nhãn mức, nên một PR được luật `light-docs` miễn sẽ bị từ chối deploy. Nó
nhận cả trình đọc nhãn mức lẫn trình đọc lựa chọn review ở mục 2.

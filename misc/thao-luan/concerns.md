# Các concern khi mở rộng AO kit

Câu hỏi chung của mọi concern: mở rộng thì sửa kit hiện tại, hay clone ra một bản mới? Mỗi concern ghi kết luận hoặc quyết định ở đây; phần thảo luận nằm ở các file được link.

## Thứ tự làm và tiến độ

Đề xuất ở Phiên 27 · Lượt 100, **bạn đã duyệt ở Lượt 112**. Đây là chỗ duy nhất theo dõi thứ tự và tiến độ: mỗi việc xong thì cập nhật cột Trạng thái và ghi link PR hay spec vào cột Kết quả.

Trạng thái dùng một trong bốn giá trị: Chưa làm · Đang làm · Xong · Chờ nhu cầu (chỉ làm khi có dự án thật cần).

| # | Việc | Từ đâu | Cần xong trước | Trạng thái | Kết quả |
|---|---|---|---|---|---|
| A1 | Sửa hai lỗi an toàn còn lại sau Pilot 2. `qa` dùng `curl -K -` thay cho `-u`, để mật khẩu không nằm trong tham số của tiến trình. `audit.mjs` nhận SHA rút gọn | Backlog Pilot 2 | | Xong 2026-11-11 | Kit PR #237 (`409590e`). Thêm luật `gh-guard` chặn mật khẩu trên dòng lệnh, và `AO_ENV_AUTH` không được chứa `"`, `\` hay ký tự xuống dòng. Bản chép kit của các dự án và VPS chưa cập nhật |
| A3 | Bước intake: `/ao-intake "<mô tả sơ khai>"`. Phiên chính làm 4 việc:<br>- phỏng vấn bạn từng câu theo `interview-me`, brainstorm theo `idea-refine` khi cần<br>- phân loại việc thành Epic, Story, Task hay Bug theo contract<br>- cho bạn xem bản tóm tắt<br>- tạo item trên Jira, kèm template Epic (kit chưa có template này)<br>Bạn vẫn giữ cú bấm `Start spec`.<br>A3 gồm thêm (Lượt 111):<br>- `/ao-spec <EPIC> <yêu cầu sửa>` và `/ao-plan <EPIC> <yêu cầu sửa>`, dùng trước `Approve spec` hay `Approve plan`. Lệnh ghi yêu cầu vào `note.md` như `/ao-fix`, rồi cho `ba` hoặc `sa` sửa, cho `ux` và `sa` chạy theo nếu cần, và dừng lại ở cổng<br>- lệnh trả lời `Cần ba:` / `Cần sa:` (chuyển từ C2) | Concern 5, backlog Pilot 2 | | Đang làm | Spec chung của A3–A5: [SPEC-human-loop.md](../../SPEC-human-loop.md), phần 1. Bản nháp 2026-11-11, chờ duyệt |
| A4 | Bước xem trước giữa build và review:<br>- dev agent mở PR nháp; guard `pr-open` bỏ qua PR nháp, nên item còn ở In Progress<br>- `/ao-build` dừng chờ bạn xem trước, kèm ảnh từng màn hình (`fe-dev`) và mẫu request, response của API (`be-dev`) ở `.ai/runs/<KEY>/preview/`<br>- `/ao-preview <KEY>`: chuyển thư mục dự án sang nhánh PR, chạy `npm ci` khi `package-lock.json` khác `develop`, bật API và web, in URL. `--stop` tắt server và về `develop`; `/ao-fix` và `/ao-review` tự làm bước này<br>- `/ao-fix <PR> <yêu cầu>` trên PR nháp chỉ chạy dev agent, không chạy review<br>- trong yêu cầu, tiền tố `be:` / `fe:` cho biết giao việc cho ai. Có cả hai thì `be-dev` chạy trước. Không có tiền tố mà Story có hai Sub-task thì kit hỏi lại (cách gõ đề xuất ở Lượt 112)<br>- kit hỏi yêu cầu có đổi AC, hợp đồng API hay yêu cầu chung của Epic không. Đổi AC thì `ba` cập nhật AC trên Story và trong SPEC (comment AC cũ và mới, commit lên nhánh của PR, không dùng lại số AC). Đổi hợp đồng API hay yêu cầu chung thì `sa` cập nhật plan hoặc SPEC. Cập nhật xong mới tới dev (Lượt 113, mở rộng ở Lượt 116)<br>- lệnh đổi Task thành Story, dùng khi yêu cầu làm Task có hành vi người dùng thấy được (chuyển từ C2 ở Lượt 116)<br>- `/ao-review <PR>` chuyển PR sang sẵn sàng; `jira-sync` đưa item sang In Review<br>- muốn bỏ qua bước xem trước thì gõ thẳng `/ao-review` | Concern 6 | | Đang làm | [SPEC-human-loop.md](../../SPEC-human-loop.md), phần 2 |
| A5 | Sửa lỗi tìm thấy khi QA, giữ luật của contract: không tạo Bug, item quay về In Progress qua `QA fail`, sửa trên nhánh mới tách từ `develop` với cùng mã item.<br>- `/ao-qa <KEY> fail: <lỗi, cách tái hiện, kết quả mong đợi>`: `qa` tái hiện lỗi bạn thấy, chụp bằng chứng, ghi báo cáo FAIL gồm lỗi của bạn và lỗi nó tự thấy, rồi bấm `QA fail`. Không tái hiện được thì gắn cờ "Needs you"<br>- `/ao-build <KEY>` nhận ra lần sửa sau QA fail: tạo nhánh mới từ `develop`, đưa danh sách lỗi trong báo cáo FAIL vào prompt, giao lỗi theo `be:` / `fe:` như ở A4. Sửa hai chỗ đang hỏng: Story có Sub-task bị kẹt ở `steps.mjs:345`, và prompt "làm tiếp từ ledger" không nhắc tới báo cáo FAIL<br>- phần sau đi như thường lệ: PR nháp, xem trước, review, gate ③, deploy, `/ao-qa` lại<br>- lỗi nằm ngoài item thì tạo Bug theo `bug.md`. Mong đợi mới không có trong AC thì `ba` cập nhật AC, hoặc tạo Story mới | Concern 7 | A4 | Đang làm | [SPEC-human-loop.md](../../SPEC-human-loop.md), phần 3 |
| B1 | `project-scaffold`, phần 1: viết spec và plan, rồi làm theo plan. Nội dung gồm:<br>- file cấu hình dự án: danh sách repo (lúc đầu chỉ nhận một); mỗi app khai đường dẫn, profile, cổng lấy từ biến môi trường, có công khai hay không, và host; các role tùy chọn<br>- script cài và đồng bộ kit<br>- profile Next.js và NestJS, tức bản hiện tại<br>- dựng Jira và GitHub tự động<br>- hướng dẫn cài và dùng kit cho repo mới (kể cả thư mục trống) và repo đang phát triển. Hướng dẫn đi theo ví dụ cụ thể, như làm một tính năng lớn thì làm gì và gõ lệnh nào (bạn yêu cầu ở Lượt 105). B2 và B3 thêm ví dụ cho stack của mình | Concern 1, 2, 3; Lượt 105 | A1, A3, A4, A5 | Chưa làm | |
| B2 | `project-scaffold`, phần 2: cho nhiều app công khai, mỗi app một host (bỏ luật D2), và thêm profile React. Xong phần này là có trường hợp 1 | Concern 1 | B1 | Chưa làm | |
| B3 | `project-scaffold`, phần 3: profile Spring Boot gồm Gradle hoặc Maven, JaCoCo, công cụ kiểm dependency Java, dòng tắt check và path security của Java, skill cho `be-dev`. Thêm cho deployer: trần RAM cho mỗi container và dọn build cache. Xong phần này là có trường hợp 2 | Concern 1, backlog Pilot 2 | B2 | Chưa làm | |
| B4 | Pilot 3 cho trường hợp 2: `apps/user`, `apps/admin` và `apps/api` bằng Spring Boot, chạy từ spec tới Production.<br>Cách chạy (Lượt 112):<br>- trước hết kiểm scaffold mà không cần agent: trên repo thật có ba app khung, CI xanh, deploy được lên 3 môi trường<br>- sau đó chạy Epic đầu của dự án thật: Epic nhỏ, chạm cả ba app, không đụng tới đăng nhập hay thanh toán<br>- nếu dự án thật chưa chốt thì kiểm scaffold trên một repo khung, và Pilot 3 chờ tới khi có dự án | Concern 1 | B3 | Chưa làm | |
| C1 | Chuyển thứ tự chạy của `/ao-spec`, `/ao-plan`, `/ao-build` từ `steps.mjs` sang contract, kèm điều kiện `when`. Thêm role `seo` | Concern 3 | B4, và phải xong trước Epic đầu tiên cần SEO | Chưa làm | |
| C2 | Lớp chạy song song, làm phần đầu của `orchestrator-cli`, gồm:<br>- trần số lượt chạy cùng lúc, mặc định 1, cộng một cờ bật 2 cho từng lệnh<br>- `reviewer` chạy song song với `security`; sửa 4 chỗ hai lượt đang dùng chung: worktree `pr-<N>`, ledger, state của lượt chạy, vòng chạy<br>- mỗi item một worktree<br>- khóa theo item<br>- bộ điều phối<br>- WIP theo số chỗ<br>- (lệnh trả lời `Cần ba:` / `Cần sa:` đã chuyển sang A3, lệnh đổi Task thành Story đã chuyển sang A4) | Concern 2, A2 cũ, backlog Pilot 2 | C1 | Chưa làm | |
| D1 | Module `multi-repo` và profile .NET (trường hợp 3) | Concern 1 | C2 | Chờ nhu cầu | |
| D2 | Workflow nội dung cho agent viết bài | Concern 3 | C1 | Chờ nhu cầu | |
| D3 | Chỗ cho skill riêng của kit, chuyển thể từ skill gốc (cách 4), kèm một trang `docs/` ghi quy trình cập nhật skill | Concern 4 | | Chờ nhu cầu | |

Concern 4 không có bước riêng: mỗi lần lấy một ý hay vào kit là một PR nhỏ, làm lúc nào cũng được, theo 8 nguyên tắc của concern 4. Các việc còn lại trong backlog Pilot 2, như các Low của tài liệu và của kit-copy-review, nằm trong [verification.md của Pilot 2](../../tasks/archive/pilot-2/verification.md) (mục T10, "Việc kit để sau"). Mỗi việc gom vào module gần nhất có sửa tới chỗ đó.

**Lý do của thứ tự:**

1. **A1 đi đầu vì là lỗi an toàn.** Pilot sau chạy QA trên môi trường có basic auth, nên lỗi lộ mật khẩu trong tham số tiến trình phải sửa trước.
2. **A2 đã gộp vào C2** (bạn đồng ý ở Lượt 102). `reviewer` song song với `security` vượt trần mặc định 1, nên chỉ có lợi khi trần được nâng lên 2. Với gói Pro thì lợi ít: ở SMP-18, `reviewer` chạm giới hạn usage 2 lần dù chỉ chạy một mình. Hai bên không phụ thuộc kết quả của nhau (kiểm ở Lượt 101). Mỗi vòng review bớt khoảng 7–10 phút [Ước].
3. **A3 đi trước B1** (bạn đồng ý ở Lượt 104). Dự án thật đầu tiên sẽ bắt đầu bằng intake, và việc này không phụ thuộc scaffold. Hỏi trước lúc intake thì SPEC còn ít Open Questions hơn, nên `/ao-spec` ít phải dừng rồi chạy tiếp. Phần sửa SPEC, sửa plan và lệnh trả lời `Cần ba:` / `Cần sa:` cũng vào A3 (Lượt 111), vì cả ba cùng sửa `decideSpec`, `decidePlan` và hai skill `ao-spec`, `ao-plan`.
4. **A4 đi trước B1** (Lượt 111), vì item nào của Pilot 3 cũng cần bước xem trước. Bạn xem UI và API trước khi review, nên sai hướng được sửa sớm, mà không tốn một vòng review khoảng 15–20 phút. A4 không phụ thuộc scaffold, vì lúc này kit chỉ chạy mỗi lần một lượt và cổng mặc định là đủ.
5. **A5 đi sau A4 và trước B1** (Lượt 117). Item nào của Pilot 3 cũng có thể bị QA fail, mà đường sửa sau QA fail hiện chưa thông và chưa từng chạy thật: ở Pilot 2 cả 9 item đều PASS. A5 dùng lại cách giao việc theo `be:` / `fe:` của A4.
6. **B là đường ngắn nhất tới dự án thật** (e-commerce, trường hợp 2). Mình chia `project-scaffold` làm ba phần, vì gộp lại thì quá lớn cho một module. Mỗi phần thêm một trường hợp và giữ nguyên các dự án đang chạy. Nếu lúc viết spec bạn muốn chia khác thì sửa bảng này.
7. **Trần RAM cho container đặt ở B3, trước Pilot 3.** Một container Spring Boot cần khoảng 300–500 MB [Ước]. Ba môi trường cộng lại khoảng 1–1,5 GB, trong khi VPS còn 2,9 GB trống. Vừa đủ, nhưng có thể phải tắt bớt `ao-pilot` hoặc nâng VPS.
8. **C1 đi trước C2.** Bộ điều phối của C2 cần biết bước kế tiếp của mỗi item và số chỗ của mỗi role. Đưa thứ tự chạy vào contract trước thì bộ điều phối đọc dữ liệu thay vì đọc các danh sách viết cứng, và không phải viết lại khi thêm role. C1 cũng phải xong trước Epic đầu tiên cần SEO.
9. **D chỉ làm khi có nhu cầu thật.** `multi-repo` theo quyết định ngày 2026-10-26: chỉ làm khi có dự án bắt buộc dùng hai repo. D1 đặt sau C2, vì worktree và khóa của item khi đó phải phủ cả hai repo.

**Thay đổi so với quyết định 5 của concern 2:**
- thêm A1;
- thêm A3 (intake, sửa SPEC và plan) trước B1;
- thêm A4 (xem trước giữa build và review) trước B1;
- thêm A5 (sửa lỗi tìm thấy khi QA) trước B1;
- `reviewer` song song với `security` gộp vào C2, cùng với trần số lượt;
- `project-scaffold` chia làm ba phần;
- trần RAM container đưa vào B3;
- chèn C1 trước lớp chạy song song.

Bạn đã quyết:
- Lượt 102: gộp A2 vào C2.
- Lượt 104: thêm intake (A3), làm trước B1.
- Lượt 111: thêm A4 (xem trước) trước B1. Gom phần sửa SPEC và plan, cùng lệnh trả lời `Cần ba:` / `Cần sa:`, vào A3.
- Lượt 112: duyệt bảng. Pilot 3 dùng Epic đầu của dự án thật, sau khi kiểm scaffold mà không cần agent (cột B4). Dự án mẫu mới bị loại, vì tốn thêm khoảng 30–40 USD cho code sẽ bỏ đi.
- Lượt 113: trong A4, yêu cầu sửa nào làm đổi AC thì `ba` cập nhật AC trước khi dev sửa.
- Lượt 116: A4 hỏi thêm về hợp đồng API và yêu cầu chung của Epic (`sa` cập nhật). Lệnh đổi Task thành Story chuyển từ C2 sang A4.
- Lượt 117: thêm A5 (sửa lỗi tìm thấy khi QA), đặt sau A4 và trước B1.

Thứ tự hiện tại: A1 → A3 → A4 → A5 → B1 → B2 → B3 → B4 → C1 → C2. D1–D3 chỉ làm khi có nhu cầu.

## Concern 1: stack khác và nhiều repo

Concern này xét ba app `apps/user`, `apps/admin` và `apps/api`, với `api` dùng NestJS, Spring Boot hoặc .NET, đặt trong một hay hai repo.

**Kết luận:**
- Sửa kit hiện tại, không clone.
- Trường hợp 1 và 2 làm trong `project-scaffold`.
- Trường hợp 3 làm thành một module `multi-repo` riêng, sau đó.

Thứ tự làm: xem mục "Thứ tự làm và tiến độ" ở đầu file.

**Thảo luận:** [kit-voi-stack-khac-va-nhieu-repo.md](kit-voi-stack-khac-va-nhieu-repo.md) (Phiên 27 · Lượt 94–95).

## Concern 2: chạy nhiều luồng SDLC song song

**Quyết định** (Phiên 27 · Lượt 96–97):

1. **Sửa kit hiện tại, không clone.** Chỉ lớp chạy agent thay đổi: khóa chạy, checkout và vòng chạy trong `scripts/ao-step.mjs` và `lib/workflow/runner.mjs`. Những phần sau giữ nguyên:
   - contract, guard và WIP;
   - `decideStep`, Jira và các gate;
   - merge-gate, audit và deployer.
2. **Chạy song song là chế độ bật theo từng dự án.** Kit có một trần số lượt chạy cùng lúc, mặc định là 1, tức mỗi lúc một agent như hiện nay. Nâng trần là quyết định của bạn cho từng dự án.
3. **Lớp chạy song song là phần đầu của `orchestrator-cli` (Cấp 2).** Lớp này gồm:
   - mỗi item một worktree cho build và fix;
   - khóa theo item;
   - trần số lượt chạy cùng lúc;
   - một bộ điều phối viết bằng code thường, không dùng LLM, đọc board rồi mở lượt chạy;
   - WIP tính theo số chỗ của mỗi vai trò.
4. **`project-scaffold` dọn đường cho chạy song song.**
   - Mỗi app lấy cổng từ biến môi trường.
   - Profile khai lệnh cài package.
   - Mỗi worktree tự cài package của nó, không dùng junction tới `node_modules`.
5. **Thứ tự làm**, thay cho thứ tự ở concern 1:
   1. `reviewer` chạy song song với `security`;
   2. `project-scaffold`, rồi pilot Spring Boot;
   3. lớp chạy song song;
   4. `multi-repo`, chỉ khi có một dự án thật cần hai repo.

   Ở Lượt 100, thứ tự này được làm chi tiết hơn và chuyển sang mục "Thứ tự làm và tiến độ" ở đầu file. Từ đây, mục đó là chỗ theo dõi.

**Thảo luận:**
- [thao-luan-sdlc-song-song.md](../thao-luan-sdlc-song-song.md) (Phiên 23 · Lượt 25–26): phân tích gốc, gồm worktree theo item, hai hướng chạy song song, những chỗ chạy song song được, và giới hạn về hạn mức gói và các cổng duyệt.
- [sdlc-song-song-sua-kit-hay-clone.md](sdlc-song-song-sua-kit-hay-clone.md) (Phiên 27 · Lượt 96): lý do không clone, và những phần kit đã có hoặc chưa có kể từ 2026-11-03, kèm chỗ trong mã.

## Concern 3: thêm role mới vào SDLC

Hai ví dụ: một agent SEO Content Writer viết bài cho tính năng Blogs, và một agent SEO tham gia lúc spec và plan.

**Đề xuất, chưa duyệt:**
- Sửa kit hiện tại, không clone.
- Thứ tự chạy của các lệnh chuyển từ `steps.mjs` sang contract. Dự án khai role tùy chọn nào được bật.
- `seo` là một role cố vấn trong `/ao-spec`, chỉ chạy khi SPEC có trang công khai.
- Việc viết bài trong database không thuộc SDLC, mà là một workflow nội dung riêng, làm sau.

**Thảo luận:** [role-moi-trong-sdlc.md](role-moi-trong-sdlc.md) (Phiên 27 · Lượt 98).

## Concern 4: cập nhật skill và agent của kit

Concern này xét việc chọn lọc những gì một skill hay một agent bên ngoài làm tốt hơn để đưa vào kit, không thay hết.

**Đề xuất, chưa duyệt:**
- Sửa kit hiện tại, không clone. Đây là việc bảo trì kit bằng PR; quyết định chọn lọc đã có từ `SPEC.md:50`.
- Có bốn cách đưa vào kit, thử theo thứ tự:
  1. lấy ý vào prompt của role;
  2. chép cả skill vào kit, ghim theo commit;
  3. skill theo stack trong `roster.local.yaml` của dự án;
  4. skill của kit, chuyển thể từ upstream.
- Không thay file agent hay file skill đã chép.
- Phải giữ 8 nguyên tắc, nặng nhất là ba điều: contract thắng skill, quyền không tự tăng, và đo trước khi đổi.

**Thảo luận:** [cap-nhat-skill-va-agent.md](cap-nhat-skill-va-agent.md) (Phiên 27 · Lượt 99).

## Concern 5: bắt đầu một tính năng từ mô tả sơ khai

Hiện bạn phải tự tạo Epic trên Jira rồi mới chạy `/ao-spec`. Các agent của `/ao-spec` chạy một mình, không có người trực, nên không phỏng vấn được: mỗi câu hỏi thành một mục Open Questions, và lệnh phải dừng rồi chạy tiếp.

**Quyết định** (Phiên 27 · Lượt 104):
1. Sửa kit hiện tại, không clone.
2. Thêm bước intake `/ao-intake "<mô tả sơ khai>"`. Phiên chính phỏng vấn bạn, phân loại việc theo contract, cho bạn xem bản tóm tắt, rồi tạo item trên Jira.
3. Bạn vẫn giữ cú bấm `Start spec`: quyền chọn ưu tiên và chỗ WIP vẫn là của bạn, và lịch sử Jira ghi đúng người bấm.
4. Làm ở A3, trước B1.
5. Lượt 111: bạn sửa SPEC bằng `/ao-spec <EPIC> <yêu cầu sửa>` và sửa plan bằng `/ao-plan <EPIC> <yêu cầu sửa>`, trước khi bấm duyệt cổng. Sau khi đã duyệt, thay đổi đi thành Story hoặc Epic mới. Lệnh trả lời `Cần ba:` / `Cần sa:` dùng cùng cơ chế này. Cả ba việc vào A3.

**Thảo luận:** [brainstorm-discussion.md](../brainstorm-discussion.md), Phiên 27 · Lượt 102–106. Concern này chưa có file thảo luận riêng.

## Concern 6: xem trước UI và API sau build, trước review

Hiện `/ao-build` chạy tới khi PR mở và CI chạy xong. Sau đó bạn không có cách nào thuận tiện để xem UI và API ở local. Muốn yêu cầu sửa thì phải qua `/ao-fix`, mà lệnh này sửa xong là tự kéo theo `reviewer` và `security`. Item cũng sang In Review ngay khi PR mở.

**Quyết định** (Phiên 27 · Lượt 111):
1. Sửa kit hiện tại, không clone.
2. Thêm bước xem trước dùng PR nháp. Cách làm chi tiết ở việc A4 trong bảng tiến độ.
3. Lúc kit chỉ chạy mỗi lần một lượt, `/ao-preview` chuyển chính thư mục dự án sang nhánh PR, không tạo worktree. Khi có C2, nó dùng worktree mà dev agent đã tạo cho item.
4. Không dựng môi trường xem trước cho từng PR trên VPS, vì deployer chỉ deploy code đã qua `audit`.
5. Làm ở A4, trước B1.
6. Lượt 113: khi yêu cầu sửa sau bước xem trước làm đổi acceptance criteria, kit hỏi bạn trước. `ba` cập nhật AC trên Story và trong SPEC, rồi mới tới dev. Đây là bài học từ AC14 và AC15 của SMP-18.
7. Lượt 116: câu hỏi ở bước xem trước mở rộng thành "đổi AC, hợp đồng API, hay yêu cầu chung của Epic?". `ba` cập nhật AC; `sa` cập nhật hợp đồng API hoặc yêu cầu chung. Yêu cầu làm một Task có hành vi người dùng thấy được thì đổi Task đó thành Story, và lệnh đổi Task thành Story chuyển từ C2 sang A4. Yêu cầu đổi chính kết quả mong đợi của một Bug thì việc đó trở thành Story. Khả năng mới thì thành Story mới; đổi hướng cả Epic thì dừng lại và bắt đầu bằng `/ao-intake`.

**Thảo luận:** [brainstorm-discussion.md](../brainstorm-discussion.md), Phiên 27 · Lượt 107–116. File [git-khi-dung-kit.md](git-khi-dung-kit.md) giải thích, kèm sơ đồ, thư mục dự án đứng ở nhánh nào theo từng lệnh.

## Concern 7: lỗi tìm thấy khi item đang ở In QA

Contract đã có luật cho trường hợp này: lỗi tìm thấy khi QA một item chưa Done thì không tạo Bug. Item quay về In Progress qua `QA fail` và được sửa trên một nhánh mới, vẫn mang mã item cũ. Nhưng đường chạy thì chưa thông, ở ba chỗ:
- bạn không có lệnh nào để đưa lỗi mình thấy vào báo cáo QA, vì chỉ `qa` được bấm `QA fail`;
- Story có Sub-task bị kẹt ở `/ao-build`;
- Story hay Task không có Sub-task thì dev agent không được đưa báo cáo FAIL.

**Quyết định** (Phiên 27 · Lượt 117):
1. Sửa kit hiện tại, không clone, và giữ luật của contract.
2. Bạn báo lỗi qua `qa` bằng `/ao-qa <KEY> fail: …`. `qa` tái hiện lỗi, ghi bằng chứng, rồi bấm `QA fail`.
3. `/ao-build` nhận ra lần sửa sau QA fail và giao lỗi theo `be:` / `fe:` như ở A4.
4. Làm ở A5, sau A4 và trước B1.

**Thảo luận:** [brainstorm-discussion.md](../brainstorm-discussion.md), Phiên 27 · Lượt 116–117.

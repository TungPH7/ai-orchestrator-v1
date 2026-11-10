# Concern 4: cập nhật skill và agent của kit

Phiên 27 · Lượt 99, 2026-11-10. Câu trả lời dựa trên mã kit ở `main` (`613c7bc`). Nhãn: **[Inference]** là suy luận chưa chạy thử, **[Ước]** là con số ước.

## Câu hỏi

> ## 4. Nếu muốn update skills, agent của Kit thì có được không? Ví dụ như trong lúc phát triển dự án tôi tìm được 1 skill hay, 1 agent tốt hơn trong Kit và muốn update lại skills, agent cho Kit, các nguyên tắc cần đảm bảo để kit hoạt động vẫn được giữ nguyên, chỉ là chọn lọc những điều mà skills, agent làm tốt hơn vào kit, không phải replace hoàn toàn.

## Trả lời ngắn

**Được, và kit đã được thiết kế cho việc này.** "Chọn lọc, không thay hết" là quyết định đã chốt từ đầu: "chỉ lấy chọn lọc ý từ Superpowers, agency-agents và orchestrator.inc" (`SPEC.md:50`). Hai prompt đã làm đúng như vậy:
- `qa` lấy ý từ hai agent "Evidence Collector" và "Reality Checker" của agency-agents (`agents/prompts/qa.md:5`);
- `security` lấy ý từ "AI-Generated Code Security Auditor" (`SPEC-agent-roster.md:143`).

Đây là việc bảo trì kit thường ngày, làm bằng PR vào kit. Không cần clone.

## Kit ghép một agent từ đâu

Đây là sự thật đọc được từ mã (`SPEC-agent-roster.md` mục 2.1, 2.7).

| Nguồn | Ai viết | Ghi chú |
|---|---|---|
| `agents/roster.yaml` | Bạn và mình | Model, effort, tool, quyền Jira và git, file được ghi, skill nạp sẵn, và commit ghim của từng skill chép vào |
| `agents/prompts/<role>.md` | Viết tay | Cách làm việc, mục "Where the contract beats your skills", và khi nào dừng. Comment HTML ở đầu file ghi nguồn ý tưởng, và bị bỏ khi ghép nên không tốn token |
| `agents/rules.md` và contract | Viết tay, hoặc sinh từ contract | Quy ước chung và phần hợp đồng của từng role |
| `kit/.claude/agents/<role>.md` | **Sinh ra** bằng `npm run agents` | Không sửa tay. `agents:check` đỏ khi file sinh ra cũ hơn nguồn |
| `kit/.claude/skills/<name>/` | **Chép** bằng `npm run skills:vendor` | Không sửa tay. `SOURCE.md` ghi repo, commit, giấy phép và thay đổi; hiện chỉ hỗ trợ đổi tên |
| `.ai-orchestrator/roster.local.yaml` của dự án | Dự án | Chỉ thêm skill theo stack, không đổi model, effort hay tool |

## Bốn cách đưa cái hay vào kit

Mình xếp theo thứ tự nên thử trước.

| # | Cách | Khi nào dùng | Làm ở đâu |
|---|---|---|---|
| 1 | **Lấy ý vào prompt của role** | Chỉ vài ý hay: một bước kiểm, một danh sách lỗi hay gặp, một cách trình bày bằng chứng. Đây là cách mặc định cho "chọn lọc" | `agents/prompts/<role>.md`, ghi nguồn trong comment HTML |
| 2 | **Chép cả skill vào kit, ghim theo commit** | Skill là một phương pháp trọn vẹn, đáng giữ nguyên và theo bản upstream | `vendored_skills` trong `roster.yaml`, rồi chạy `skills:vendor`. Gắn vào role thành skill nạp sẵn, hoặc cho prompt bảo đọc khi cần, như `gha-security-review` |
| 3 | **Skill theo stack của một dự án** | Skill chỉ đúng với một stack, ví dụ Spring Boot hay React | `roster.local.yaml` và `.claude/skills/` của dự án, không vào kit |
| 4 | **Skill của chính kit, chuyển thể từ upstream** | Muốn lấy một phần lớn của một skill nhưng phải sửa | Thư mục skill riêng của kit, ghi "chuyển thể từ…" kèm giấy phép. Hiện kit chưa có chỗ cho loại này, nên đây là một bản sửa nhỏ. [Inference] |

**Với một agent tốt hơn** từ bên ngoài, không thay file agent của kit, vì file đó được sinh ra và bị `agents:check` chặn. Lấy phần làm tốt hơn vào prompt (cách 1) và vào skill (cách 2), còn phần hợp đồng và quyền giữ nguyên. Nếu agent ngoài cần thêm tool hay quyền, đó là một quyết định cấp quyền riêng, do bạn duyệt.

**Không được** sửa thẳng file của skill đã chép, dù chỉ để bỏ bớt. Bản sửa đó sẽ mất ở lần chép sau, và không ai đọc được diff của nó. Muốn dùng một phần thì làm theo cách 1 hoặc cách 4.

## Các nguyên tắc phải giữ

1. **Contract thắng skill.** Skill mới không được đổi các thứ sau:
   - trạng thái, transition, gate;
   - nhánh GitFlow;
   - chỗ lưu artifact;
   - các mức finding;
   - quy tắc PR chỉ qua `ao-pr.mjs`;
   - các điều "không bao giờ" (chuyển item sang Done, approve PR).

   Skill nói khác thì thêm một dòng vào mục "Where the contract beats your skills" của prompt.
2. **Quyền không tự tăng.** Tool, file được ghi, quyền Jira và git, App đều nằm ở roster. Skill không mang tool theo, vì agent không có tool `Skill`, `WebFetch` hay `Agent`. Thêm quyền luôn do bạn duyệt.
3. **Không sửa tay file sinh ra hoặc file đã chép.** Sửa ở nguồn rồi sinh lại. Kit phải xanh đủ năm lệnh kiểm:
   - test;
   - `validate`;
   - `render:check`;
   - `jira:checklist:check`;
   - `agents:check`.
4. **Ghim và đọc diff.** Mọi skill bên ngoài ghim theo SHA đầy đủ, ghi giấy phép, và cập nhật bằng một PR có diff. Không dùng `npx skills add` hay plugin tự cập nhật, vì skill là chỉ dẫn mà agent làm theo, nên nội dung đổi ngầm là rủi ro chuỗi cung ứng. Giấy phép cũng cần đọc kỹ: CC BY-SA bắt chia sẻ lại cùng giấy phép, còn Apache-2.0 bắt giữ file NOTICE.
5. **Giữ ngân sách ngữ cảnh.** Skill nạp sẵn được đọc toàn bộ ở mỗi lượt chạy. `fe-dev` đã nạp khoảng 13.000 token skill. Ưu tiên cách 1, hoặc cho prompt bảo đọc khi cần, hơn là thêm skill nạp sẵn.
6. **Đo trước khi đổi.** Cho bản cũ và bản mới chạy trên cùng đầu vào, như các phép so `high` với `max` và A/B test review đã làm. Đầu vào nên là các head cũ có lỗi đã biết, ví dụ High của SMP-18 mà review phải bắt được. Bản mới không rõ ràng tốt hơn thì giữ bản cũ.
7. **Một kit cho mọi dự án.** Sửa trong kit thì mọi dự án nhận được qua bản chép kit, và kit-copy-review so bản chép với head đã review. Riêng dự án chỉ thêm skill qua `roster.local.yaml`.
8. **Giữ quy tắc ngôn ngữ.** Prompt viết tiếng Anh; nội dung agent điền vào artifact viết tiếng Việt.

## Quy trình khi bạn tìm được một skill hay

1. Ghi nguồn: link, commit và giấy phép, cộng điều cụ thể mà nó làm tốt hơn kit.
2. Chọn một trong bốn cách ở trên.
3. Đối chiếu với nguyên tắc 1 và 2: có chỗ nào đụng contract hay cần thêm quyền không.
4. Mở PR vào kit: sửa nguồn, sinh lại file, chạy năm lệnh kiểm. Nếu PR đổi cách review hay QA, đo theo nguyên tắc 6 trước khi merge.
5. Chép kit sang dự án theo đường thường lệ.

## Sửa kit hay clone

**Sửa kit hiện tại.** Đây chính là đường cập nhật mà kit được thiết kế cho. Hai bản sửa nhỏ đáng làm, lúc nào cũng được [Ước]:
- thêm chỗ cho "skill của kit chuyển thể từ upstream" (cách 4);
- viết quy trình trên thành một trang trong `docs/`, để lần sau làm theo mà không phải nhớ.

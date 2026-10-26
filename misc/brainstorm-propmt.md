Xây dựng 1 AI Coding agent Orchestrator có kanban để tôi phát triển các dự án web tự động với AI Agent theo SDLC.

Vấn đề và Khó khăn của tôi:
- Hiện tại tôi đã có Claude code, có các nguồn skills, sub-agent, quy trình SDLC,... hay nói cách khác là có các nguyên liệu cần thiết nhưng chưa biết cách phối hợp chúng với nhau để tạo ra 1 hệ thống toàn trình chạy tự động.
- Chưa chuẩn hóa quy trình, context, artifacts và quality gates
- Chưa biết phân công Agent chuyên trách từng phần của SDLC
- Chưa Chuẩn hóa SDLC: định nghĩa Agent phải làm gì, đầu vào/đầu ra là gì, tiêu chuẩn nào để được chuyển sang bước tiếp theo
- Chưa có Orchestration: cơ chế thực thi quy trình đó, phân công Agent, quản lý phụ thuộc, kiểm tra kết quả và xử lý lỗi.

Về cấp độ triển khai thực hiện theo cấp 1 trước, trước tiên cần xây phần core của hệ thống điều phối, sau đó sẽ nâng cấp dần dần, chạy thử ở cấp thấp (thủ công), nếu hệ thống điều phối hoạt động tốt thì tăng dần tự động hóa lên cấp 3(tự động toàn trình.)

3 cấp bên dưới là AI đang nói với tôi, 'bạn' đang chỉ tôi đó nhé.
Với những thứ mà thư viện, cộng đồng, repo ở các nguồn tham khảo đã làm tốt thì có thể kề thừa, chọn lọc những ý hay.

```
Cấp 1 — Workflow

Khởi đầu

Dùng CLAUDE.md, Skills, subagent, spec, plan, task checklist và các lệnh kiểm tra trong repository. Bạn chủ động giao task và duyệt từng bước.

Ưu điểm: dễ thiết lập, dễ sửa quy trình, ít chi phí phát triển hệ thống điều phối.


Cấp 2 — Semi-automated Orchestration
Tạo workflow điều phối để giao việc cho các Agent chuyên trách, đọc artifacts, chạy kiểm tra và chỉ chuyển bước khi đạt điều kiện.

Ưu điểm: giảm thao tác thủ công nhưng vẫn giữ quyền phê duyệt của con người ở các bước quan trọng.

Cấp 3 — Custom Orchestrator
Tự phát triển một hệ thống điều phối có workflow engine, trạng thái task bền vững, dependency graph, retry, giới hạn quyền, audit log và quản lý nhiều Agent.

Phù hợp khi số lượng workflow, task và Agent đủ lớn để quy trình thủ công trở thành nút thắt.
```
Tool:
- Claude Code
- Jira
- Github

Tech stack, các công nghệ tôi mà quen thuộc của tôi:
Frontend: React.js, Next.js
Backend: Java Springboot (thường dùng), Nest.js (thường dùng), .NET (mới dùng), Go (mới dùng)

Quy trình phát triển mà tôi mong muốn sẽ có các giai đoạn sau:

spec → plan → build (TDD: viết unit + integration test ngay trong từng task)
     → quality gate tự động (lint, test, SAST, secret scan,...)
     → review (code + security)
     → merge PR (Github)
     → QA test (E2E, regression)
     → ship

- 1 trang web khi tôi phát triển sẽ có nhiều môi trường như:
    + Development: dành cho dev và tester kiểm thử và verify
    + Staging: môi trường có data gần giống với production để demo với khách hàng
    + Production: môi trường production của website
- Với quy trình phát triển trên, tôi đang không rõ giai đoạn nào sẽ ở local, giai đoạn nào sẽ ở 'developemnt', giai đoạn nào sẽ ở 'staging', giai đoạn nào sẽ ở 'Production'?

Các AI chat tôi đã planning nhanh từ trước, bạn tham khảo:
- D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ai-orchestrator\misc\chat-gpt.png (xác nhận giúp tôi là bạn có thể đọc được toàn bộ nội dung trong ảnh này không nhé)
D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ai-orchestrator\misc\chat.md

Nguồn tham khảo:
- Về workflow:

    + https://github.com/addyosmani/agent-skills (D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\agent-skills)
    + https://skills.addy.ie/
    + https://github.com/obra/superpowers#the-basic-workflow (D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\superpowers)
- Về orchestrator có UI Kanban để tôi dễ theo dõi
    + https://orchestrator.inc/
- Về kho skill, agent, plugins:
    + https://www.skills.sh/
    + https://github.com/msitarzewski/agency-agents (D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\agency-agents)

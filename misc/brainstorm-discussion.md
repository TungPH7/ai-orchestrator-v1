# Lịch sử brainstorm — ai-orchestrator

Ghi nguyên văn các lượt brainstorm giữa bạn và Claude Code: câu hỏi của bạn và câu trả lời của Claude, theo thứ tự thời gian. Mỗi lượt brainstorm mới được ghi tiếp vào cuối file.

- Câu hỏi của bạn nằm trong khối `markdown` (giống [chat.md](chat.md)); câu trả lời của Claude giữ nguyên Markdown gốc.
- Khi Claude hỏi lại bằng câu hỏi trắc nghiệm, file ghi cả câu hỏi, các lựa chọn và lựa chọn của bạn.
- Giờ ghi theo giờ Việt Nam (UTC+7).

| Phiên | Session id | Thời gian | Nội dung chính |
|---|---|---|---|
| 1 | `939a53bd-1857-4112-aae9-9942c061d12c` | 2026-10-26 01:56 → 11:08 | Đọc bối cảnh; chốt pilot, hạ tầng, Jira, GitFlow; môi trường cho từng giai đoạn; capability map; 9 giả định; dung lượng GitHub; state machine ticket |
| 2 | `075cf034-63dd-4693-9a6a-39cdea6d9231` | 2026-10-26 11:21 → 13:16 | Duyệt capability map; bug chỉ lỗi ở Staging; chọn môi trường để làm/fix; có nên thêm Feature; Scrum; Story và Task khác gì nhau; có cần chạy Scrum không; chốt Kanban, viết SPEC-sdlc-contract |
| 3 | `c097b31c-efdb-42a0-96ba-8a2b65140f99` | 2026-10-26 15:43 → 17:17 | Duyệt SPEC-sdlc-contract và 7 câu hỏi mở; Story có cả FE và BE có tách hai nhánh không; monorepo hay hai repo; release theo quyết định của bạn; lập plan cho sdlc-contract; commit đầu tiên, repo GitHub, đổi tên thư mục |
| 4 | `46e4e518-ac41-4570-8bcc-37d5a88788c5` | 2026-10-26 21:35 → 2026-10-27 01:02 | Build và đóng module sdlc-contract (14 task, PR #1–#16, không ghi vào lịch sử vì là lượt code); chọn module kế tiếp tracker-integration; giả định và câu hỏi cho tracker-integration |
| 5 | `76bd80d2-8083-45f7-93a7-d7ffab2e246c` | 2026-10-27 09:45 → 10:02 | Bạn trả lời 5 câu hỏi của tracker-integration; câu trả lời của Claude bị bộ lọc an toàn chặn, hai lần |
| 6 | `02493cdb-1425-4498-9a25-6408d7717c70` | 2026-10-27 10:03 → 2026-10-28 khoảng 02:30 | Gói Free và company-managed; cách tạo tài khoản bot cho agent; viết SPEC-tracker-integration; cách chọn scope khi tạo token; duyệt spec, lập plan tracker-integration; bắt đầu T1; T1–T14, Checkpoint 1 và 2; dựng `DEMO` theo checklist, sửa checklist theo giao diện thật, thêm rule workflow qua REST; chuẩn bị `ao-pilot` cho T15 |
| 7 | `86f38192-1135-4f7d-85f4-ce02cffc6b43` | 2026-10-28 10:20 → 13:25 | T15 kiểm thật agent và hook (lượt code, không ghi); T16 đối soát (lượt code); giải thích lại thay đổi của guard `changes-requested`; bạn đồng ý, T17 `jira-sync`; T18 kiểm thật `jira-sync` trên `ao-pilot` (lượt code) |
| 8 | `56ad3187-0f02-4139-9d15-eff3c7191377` | 2026-10-28 13:25 → 16:22 | T19 đóng gói tài liệu và lưu plan của tracker-integration (lượt code, không ghi) |
| 9 | `79cccd91-9d3a-495d-a154-927ae2ce5928` | 2026-10-28 16:22 → 16:34 | Bạn xác nhận tracker-integration hoàn thành và chọn quality-gates; Claude đánh dấu ô cuối (PR #45); câu trả lời bị bộ lọc an toàn chặn |
| 10 | `b645b669-931c-4d95-ba32-24fd3e090d67` | 2026-10-28 16:35 → 2026-10-29 khoảng 03:30 | Giả định và câu hỏi cho quality-gates: bảo vệ nhánh khi repo private ở gói Free, danh tính để agent mở PR; bạn chọn 1a, 2a; viết SPEC-quality-gates; bạn duyệt spec, lập plan 21 task; bạn duyệt plan, bắt đầu T1; vì sao bạn phải tự tạo App, script tạo App bằng manifest flow; T1–T5, Checkpoint 1; ba đề xuất được đồng ý, T6–T13, hết lượt dùng giữa T13, Checkpoint 2 |
| 11 | `318a4364-f1b9-4cc5-9744-ae8ff4f80c7d` | 2026-10-29 09:00 → khoảng 09:40 | Bạn cho qua Checkpoint 2; T14–T17 (lượt code): merge-gate, audit, gh:protect; Checkpoint 3, chờ bạn xóa repo thử |
| 12 | `32807628-e04f-47b4-889d-f855a40dabce` | 2026-10-29 khoảng 11:04 → khoảng 23:06 | Bạn cho qua Checkpoint 3; T17 và Checkpoint 3 đóng (PR #65, #66); T18 (lượt code): cài kit mới lên `ao-pilot`, tạo `DEMO-6`, `gh-guard` chặn ba đường vòng; bạn chuyển `DEMO-6` sang Ready và tạo key thứ hai của `ao-dev`; T18 đóng (PR #67): `fe-dev` mở PR #4, `reviewer` yêu cầu sửa, kit tắt ghi công AI; T19: vòng sửa, tiêu chí 10; bạn approve PR #4 lần đầu; T19: approve trên commit cũ không còn được tính, `devops` mở PR #5 sửa workflow, `reviewer` và `security` đăng báo cáo, bạn approve PR #4 lần hai và PR #5; T19 đóng (PR #68): `merge-gate` merge PR #4, `DEMO-6` sang Ready for QA, vòng PR tốn 55 phút Actions; T20: `fe-dev` mở PR #6, chờ bạn merge tay; bạn báo đã merge nhưng PR #6 vẫn mở; bạn merge lại, `audit` chặn deploy và gắn cờ `DEMO-8`; `fe-dev` mở PR #7 revert; bạn approve PR #7; T20 đóng (PR #69): `merge-gate` merge PR #7, `develop` sạch trở lại, gỡ cờ `DEMO-8`; Checkpoint 4, chờ bạn; bạn hỏi về `gh` 2.16.1, mình đề xuất sửa `gh-guard` cho các lệnh `gh` mới rồi mới cập nhật `gh`; bạn đồng ý: vá `gh-guard` (PR #70), lên `gh` 2.103.3, tắt telemetry; bạn đăng nhập lại `gh`, token vào keyring; bạn thu hồi token cũ và cho qua Checkpoint 4; git mất quyền push vì Git Credential Manager giữ token cũ của `gh`; bạn đăng nhập lại git; Checkpoint 4 đóng (PR #71); T21 đóng (PR #72); checkpoint cuối, chờ bạn |
| 13 | `2c3e5733-3a72-4ae6-b04c-ca09a16731cc` | 2026-10-29 khoảng 23:31 → | Bạn chọn làm tiếp agent-roster; quality-gates đóng (PR #73); giả định và câu hỏi cho agent-roster: model cho từng vai trò, `ux` giao gì |

---

# Phiên 1 · Lượt 1 — 2026-10-26 01:56

**Bạn:**

```markdown
/agent-skills:spec d:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ai-orchestrator\misc\brainstorm-propmt.md
```

Nội dung file [brainstorm-propmt.md](brainstorm-propmt.md) lúc đó:

````markdown
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
````

**Claude:**

Mình đã đọc được **toàn bộ** ảnh `chat-gpt.png` (cắt thành 13 phần, đọc hết từng phần). Giờ mình xem tiếp 3 repo tham khảo và các trang web.

Mình đang xem kho agent (agency-agents): các agent điều phối, quản lý Jira và workflow. Xong phần này mình sẽ xem trang orchestrator.inc rồi tổng hợp lại.

Mình đã xem xong agency-agents, orchestrator.inc, skills.sh và skills.addy.ie. Còn kiểm tra nhanh một chi tiết về Jira MCP, sau đó sẽ hỏi bạn vài câu.

Claude hỏi lại bạn 4 câu trắc nghiệm:

**1. Dùng dự án nào để chạy thử (pilot) một feature end-to-end ở Cấp 1?** _(Dự án pilot)_

- **Mẫu Next.js + NestJS (Recommended)**: Cả FE và BE đều TypeScript nên dựng quality gate nhanh nhất. Profile Spring Boot thêm sau, khi quy trình đã chạy ổn.
- **Mẫu Next.js + Spring Boot**: Sát với backend bạn dùng nhiều nhất, nhưng gate phức tạp hơn (Maven/Gradle, JaCoCo, SpotBugs...).
- **Dự án thật đang có**: Chạy thẳng trên dự án thật. Rủi ro cao hơn và phải theo lộ trình brownfield. Ghi tên và stack ở phần ghi chú.

→ Bạn chọn (2026-10-26 02:13): **Mẫu Next.js + NestJS (Recommended)**

**2. Ba môi trường Development, Staging và Production sẽ deploy lên đâu?** _(Hạ tầng)_

- **Docker trên VPS/server**: Docker Compose trên máy chủ riêng hoặc VPS, deploy qua SSH hoặc self-hosted runner.
- **Kubernetes**: Cluster K8s (cloud hoặc on-prem), deploy bằng Helm hoặc Argo CD.
- **Cloud PaaS**: Ví dụ Vercel cho Next.js; Render, Railway, Fly.io hoặc Azure App Service cho backend.
- **Chưa chốt**: Cấp 1 chỉ chốt chính sách promote và các cổng duyệt. Pipeline deploy sẽ viết khi đã chọn hạ tầng.

→ Bạn chọn (2026-10-26 02:13): **Docker trên VPS/server**

**3. Bạn dùng loại Jira nào làm Kanban?** _(Jira)_

- **Jira Cloud (Recommended)**: Dùng được Atlassian Rovo MCP chính thức cho Claude Code. Cần quyền admin project để cấu hình workflow. Nếu chưa có Jira thì đây là lựa chọn dễ bắt đầu nhất.
- **Jira Data Center/Server**: MCP chính thức chỉ hỗ trợ Cloud; phải dùng MCP cộng đồng (vd. sooperset/mcp-atlassian) hoặc REST API.
- **Chưa có, dùng GitHub Projects**: Cấp 1 tạm dùng GitHub Projects làm Kanban (gắn sẵn với PR và issue), chuyển sang Jira sau.

→ Bạn chọn (2026-10-26 02:13): **Jira Cloud (Recommended)**

**4. Dự án sẽ dùng chiến lược nhánh Git nào? Lựa chọn này quyết định giai đoạn nào chạy ở môi trường nào.** _(Branching)_

- **Trunk-based (Recommended)**: Nhánh feature ngắn → PR vào main. main tự deploy lên Development; cùng bản build đó được promote lên Staging rồi Production bằng tag và duyệt tay. Khớp với agent-skills, ít thao tác.
- **GitFlow**: feature → develop (Development) → release/* (Staging) → main (Production). Quen thuộc ở doanh nghiệp nhưng nhiều bước merge hơn.

→ Bạn chọn (2026-10-26 02:13): **GitFlow**

---

# Phiên 1 · Lượt 2 — 2026-10-26 02:13

**Bạn:**

_(Bạn bấm nhầm Esc nên lượt trước bị ngắt.)_

```markdown
Tiếp tục, tôi gõ nhầm 'esc'
```

**Claude:**

Mình tiếp tục với 4 lựa chọn của bạn: pilot Next.js + NestJS, Docker trên VPS, Jira Cloud, GitFlow.

## 1. Giai đoạn nào chạy ở môi trường nào (GitFlow + Docker/VPS)

| Giai đoạn | Chạy ở đâu | Nhánh | Điều kiện để sang bước sau |
|---|---|---|---|
| spec, plan | Local (Claude Code) | Không có (tài liệu lưu trong repo) | Bạn duyệt SPEC và plan; task trên Jira chuyển sang Ready |
| build (TDD) | Local | `feature/<JIRA-KEY>-...` tách từ `develop` | Unit test và integration test pass; pre-commit chạy lint, format, secret scan |
| Quality gate tự động | CI (GitHub Actions) trên PR | PR vào `develop` | Lint, type-check, unit test, integration test, coverage, SAST, secret scan, dependency audit, build |
| Review (code + security) | Trên PR | PR | Không còn lỗi Critical/High; bạn approve |
| Merge PR | GitHub | Vào `develop` | Mọi check xanh và có approve (branch protection) |
| QA test (E2E, regression) | **Development**, tự deploy mỗi khi `develop` có commit mới | `develop` | E2E của feature và regression pass; tester verify; Jira chuyển sang QA Passed |
| UAT, demo khách hàng | **Staging**, data giống production nhưng đã ẩn danh | `release/x.y.z` tách từ `develop` | Smoke test và full regression pass; khách hàng và bạn duyệt release |
| Ship | **Production**, phải duyệt tay | Merge `release/*` vào `main`, gắn tag `vX.Y.Z`, merge ngược về `develop` | Smoke test sau deploy, theo dõi monitoring, sẵn sàng rollback |
| Hotfix | Staging để kiểm nhanh, rồi Production | `hotfix/<JIRA-KEY>-...` tách từ `main` | Như ship nhưng rút gọn |

Ba điểm cần lưu ý:
- **"QA test" thực ra diễn ra ở hai nơi.** Tester kiểm từng feature trên Development ngay sau khi merge. Full regression và UAT chạy trên Staging, trước khi release.
- **Staging và Production dùng cùng một Docker image**, build từ nhánh `release/*`. Hai môi trường chỉ khác cấu hình, nên thứ khách hàng duyệt trên Staging chính là thứ lên Production.
- **Skill `git-workflow-and-versioning` của agent-skills mặc định là trunk-based.** Kit sẽ ghi rõ dự án dùng GitFlow, và chỉ giữ phần quy tắc commit nhỏ, atomic của skill đó.

## 2. Giả định (bạn sửa ngay nếu sai)

1. **Người dùng chính là bạn.** Ở Cấp 1, bạn tự điều phối agent (đảm nhận phần điều phối của vai trò PM) và là người duyệt duy nhất. Đây cũng là nguyên tắc của agent-skills: người dùng là orchestrator. Tester và khách hàng chỉ tham gia ở Development và Staging.
2. **Sản phẩm của Cấp 1 là một bộ kit** gồm agent, lệnh, template, quy tắc và CI/CD, đặt trong repo `ai-orchestrator`. Một script sẽ cài và đồng bộ kit vào từng dự án.
   - Agent đặt ở `.claude/agents/` của dự án, vì chỗ này hỗ trợ đủ `hooks`, `mcpServers` và `permissionMode`. Agent đóng gói trong plugin thì bị bỏ qua cả ba trường này.
   - Việc đóng gói kit thành plugin để sau.
3. **Xương sống là agent-skills** (bạn đã cài bản 0.6.13). Không cài thêm Superpowers vì hai bộ trùng skill và có quy tắc mâu thuẫn nhau. Thay vào đó, mình lấy chọn lọc từng ý:
   - **Superpowers:** file ledger ghi tiến độ (không mất khi context bị nén); mỗi task giao cho một subagent mới; review hai lượt (kiểm đúng spec trước, chất lượng code sau); chọn model theo độ khó.
   - **agency-agents:** mẫu handoff giữa các agent; vòng Dev↔QA tối đa 3 lần rồi báo bạn; quy ước đặt tên nhánh và commit gắn mã Jira, lấy từ agent Jira Workflow Steward (agent này cũng dùng GitFlow).
   - **orchestrator.inc:** trạng thái task được suy ra từ dữ kiện thật (PR, CI, review), không tin lời agent tự khai; có một chỗ "Needs you" gom mọi việc đang chờ bạn.
4. **Mỗi loại dữ liệu chỉ có một nguồn sự thật:**
   - Board Jira Cloud là Kanban của Cấp 1 và giữ trạng thái task.
   - Git giữ nội dung: spec, plan, ADR, báo cáo.
   - GitHub giữ bằng chứng: PR, CI, review.
   - Claude Code kết nối Jira qua Atlassian Rovo MCP (bản chính thức, chỉ hỗ trợ Cloud).
   - orchestrator.inc chỉ tích hợp với GitHub, không có Jira, nên Cấp 1 chưa dùng.
5. **Có 5 cổng bạn phải duyệt:** SPEC, plan, merge PR, cắt release lên Staging, release lên Production. Agent không bao giờ được tự chuyển task sang Done.
6. **Ngôn ngữ:**
   - Prompt, định nghĩa agent và template viết tiếng Anh, để agent làm theo sát hơn và khớp với agent-skills.
   - Tài liệu cho người đọc (spec, plan, báo cáo, ticket Jira) viết tiếng Việt.
   - Code, commit và PR viết tiếng Anh.
7. **Script của kit viết bằng Node.js.** Máy bạn có Node 24 nhưng không có Python, còn CI chạy Linux; Node chạy được ở cả hai nơi.
8. **Usage có giới hạn.** Settings của bạn ghi `subscription.type=pro`, gói này giới hạn usage khá chặt. Vì vậy spec sẽ gán model riêng cho từng agent (Haiku, Sonnet hoặc Opus tùy độ khó) và hạn chế chạy nhiều agent song song.
9. **Nơi lưu spec:** `ai-orchestrator/SPEC.md` chứa tổng quan và capability map; mỗi module có một file `SPEC-<module>.md`. Mình sẽ chạy `git init` cho `ai-orchestrator`, vì thư mục này hiện chưa phải git repo.

## 3. Capability map đề xuất

Yêu cầu của bạn gồm nhiều năng lực có thể kiểm thử độc lập, nên mình tách thành module trước khi viết spec.

**Cấp 1 (sẽ viết spec):**

| Module id | Trách nhiệm | Phụ thuộc |
|---|---|---|
| `sdlc-contract` | Quy trình chuẩn ở dạng máy đọc được (YAML + Markdown). Mỗi giai đoạn ghi rõ agent phụ trách, đầu vào, đầu ra và điều kiện qua cổng. Module này còn chứa: state machine của task, DoR/DoD, các cổng duyệt, ánh xạ môi trường, artifact templates, và quy tắc xử lý lỗi (retry tối đa mấy lần, khi nào báo bạn) | — |
| `agent-roster` | Định nghĩa từng subagent: phạm vi, đầu vào/đầu ra, tool được phép, skill được dùng, model. Dựa trên 10 vai trò bạn đã chốt trong `chat.md` | sdlc-contract |
| `tracker-integration` | Workflow và board Jira khớp với state machine; cài Rovo MCP; quy ước gắn mã Jira vào nhánh, commit, PR; liên kết Jira với GitHub | sdlc-contract |
| `quality-gates` | Pre-commit hook ở local; pipeline CI trên PR; branch protection; script kiểm tra đã có đủ artifact chưa | sdlc-contract |
| `dev-workflow` | Lệnh điều phối vòng trong: spec → plan → build → review → merge vào `develop`. Mỗi lệnh gọi đúng agent, tạo artifact, kiểm tra cổng, cập nhật Jira | agent-roster, tracker-integration, quality-gates |
| `release-workflow` | Vòng ngoài trên Docker/VPS: tự deploy `develop` lên Development; QA (E2E, regression); cắt `release/*` lên Staging; release lên Production; hotfix; rollback | agent-roster, tracker-integration, quality-gates |
| `project-scaffold` | Profile theo stack (Next.js + NestJS trước, Spring Boot sau) và script cài/đồng bộ kit vào dự án | Tất cả module trên |

**Thứ tự build:**
```
sdlc-contract → agent-roster, tracker-integration, quality-gates (làm song song được)
              → dev-workflow → release-workflow → project-scaffold
```
- **Pilot 1**, sau khi xong `dev-workflow`: chạy thủ công một feature nhỏ trên dự án mẫu Next.js + NestJS, từ spec đến merge vào `develop`. Lúc này chưa có `project-scaffold`, nên mình chép tay kit vào dự án pilot.
- **Pilot 2**, sau khi xong `release-workflow`: đưa feature đó đi tiếp qua Development, Staging rồi Production.
- **Cuối cùng**, `project-scaffold` đóng gói những gì đã chạy được để dùng cho các dự án sau.

**Cấp 2–3 (chưa viết spec, chỉ để thấy hướng nâng cấp):**

| Module id | Cấp | Trách nhiệm | Phụ thuộc |
|---|---|---|---|
| `orchestrator-cli` | 2 | CLI tất định: đọc trạng thái từ Jira, GitHub và artifact; kiểm tra cổng; tự gọi Claude Code headless cho bước kế tiếp; dừng lại ở cổng cần duyệt | dev-workflow, release-workflow |
| `ci-agents` | 2 | Claude Code GitHub Action: tự review PR, tự sửa khi CI fail | quality-gates, agent-roster |
| `workflow-engine` | 3 | Trạng thái bền vững, dependency graph, retry/timeout, phân quyền, ngân sách, audit log, chạy nhiều agent song song | orchestrator-cli |
| `kanban-board` | 3 | Board riêng (hoặc tích hợp orchestrator.inc), lấy dữ liệu từ workflow-engine | workflow-engine |

**Nguyên tắc xuyên suốt:** bộ điều phối ở Cấp 2–3 là code tất định (state machine), không phải một LLM đứng giữa ra lệnh. agent-skills cảnh báo rõ: nếu một LLM tóm tắt lại kết quả giữa các bước thì ngữ cảnh bị mất dần và token tốn gấp đôi. Vì vậy, ngay từ Cấp 1:
- `sdlc-contract` phải viết ở dạng máy đọc được.
- Agent chuyển giao cho nhau bằng file, không bằng lời tóm tắt.

---

**Bạn duyệt giúp mình 4 điểm:** ranh giới các module, chiều phụ thuộc, thứ tự build, và 9 giả định ở trên. Khi bạn duyệt xong, mình sẽ lưu capability map vào `SPEC.md` rồi viết `SPEC-sdlc-contract.md` trước. Viết xong module đó, mình dừng lại để bạn duyệt rồi mới sang module tiếp theo.

Mình đã lưu vào memory 4 lựa chọn bạn vừa chốt và thông tin về stack của bạn, để các phiên sau không phải hỏi lại.

Nguồn về Jira MCP: [Atlassian Rovo MCP Server — getting started](https://support.atlassian.com/rovo/docs/getting-started-with-the-atlassian-remote-mcp-server/), [Rovo MCP (developer docs)](https://developer.atlassian.com/cloud/rovo-mcp/), [So sánh các MCP cho Jira/Confluence](https://getunblocked.com/blog/best-confluence-jira-mcp-servers-coding-agents/)

---

# Phiên 1 · Lượt 3 — 2026-10-26 02:17

**Bạn:**

```markdown
Chờ 1 tí. Câu hỏi 'Bạn dùng loại Jira nào làm Kanban?' là để làm gì?
```

**Claude:**

Câu hỏi đó không dùng để chọn giao diện Kanban. Ở Cấp 1, Kanban luôn là board của Jira, và bạn vẫn xem, kéo thả trên board như bình thường. Mình hỏi để biết **Claude Code (tức các agent) sẽ kết nối vào Jira bằng cách nào**, vì mỗi loại Jira kết nối theo một kiểu.

Agent cần kết nối này để tự làm các việc trên Jira, ví dụ:
- Agent BA tạo Epic và Story.
- Task tự chuyển trạng thái khi qua cổng.
- Gắn link PR và báo cáo test vào ticket.

| Loại Jira | Cách nhận biết | Agent kết nối bằng gì | Công sức |
|---|---|---|---|
| Jira Cloud | Địa chỉ dạng `ten-ban.atlassian.net` | Atlassian Rovo MCP chính thức: thêm một dòng cấu hình, đăng nhập OAuth, agent dùng đúng quyền của tài khoản bạn | Ít nhất |
| Jira Data Center/Server | Công ty tự host, địa chỉ dạng `jira.ten-cong-ty.com` | MCP chính thức không hỗ trợ loại này. Phải dùng MCP cộng đồng (ví dụ sooperset/mcp-atlassian) kèm Personal Access Token, hoặc gọi thẳng REST API | Nhiều hơn: phải tự rà soát bảo mật của MCP bên thứ ba, có thể cần VPN công ty |
| Chưa có Jira | — | Tạm dùng GitHub Projects, vốn đã liên kết sẵn với PR và issue | Ít, nhưng sau này phải chuyển sang Jira |

Câu trả lời ảnh hưởng tới 2 module:
- **`tracker-integration`:** cách cài MCP, cách xác thực, và ai có quyền sửa workflow để các cột Kanban khớp với state machine. Nếu là site Cloud của riêng bạn thì bạn là admin và tự sửa được. Nếu dùng Jira của công ty thì thường phải nhờ admin Jira.
- **`orchestrator-cli` (Cấp 2):** REST API của Cloud và Data Center khác nhau ở nhiều chỗ. Ví dụ, Cloud định danh user bằng accountId, còn Data Center dùng username.

Các module còn lại trong capability map vẫn giữ nguyên, dù bạn dùng loại Jira nào.

Mình gắn nhãn "Recommended" cho Jira Cloud chỉ vì nó dễ tích hợp nhất, không phải vì bạn bắt buộc phải dùng nó.

**Bạn kiểm tra giúp:** bạn đang có site Jira riêng dạng `*.atlassian.net`, hay định dùng Jira của công ty? Nếu chưa có Jira nào, mình vẫn đề xuất tạo một site Jira Cloud gói miễn phí để chạy dự án pilot.

---

# Phiên 1 · Lượt 4 — 2026-10-26 02:24

**Bạn:**

```markdown
tôi có Jira riêng rồi nhé (https://phunghuutung12b4.atlassian.net/jira/for-you?tab=workedon)
```

**Claude:**

`phunghuutung12b4.atlassian.net` là Jira Cloud, nên lựa chọn ban đầu vẫn giữ nguyên:
- Agent kết nối qua Atlassian Rovo MCP chính thức, đăng nhập bằng OAuth và dùng quyền của tài khoản bạn.
- Site này là của bạn nên bạn là admin. Bạn tự cấu hình được workflow và các cột Kanban cho khớp với state machine mà không cần nhờ ai.

Có một chi tiết sẽ chốt khi viết spec `tracker-integration`, giờ chưa cần trả lời: project Jira cho dự án pilot nên chọn loại nào?
- **Team-managed:** đơn giản, admin của project tự chỉnh workflow.
- **Company-managed:** cấu hình đầy đủ hơn (workflow scheme, condition, validator cho từng bước chuyển), cần quyền Jira admin. Bạn có quyền này.

Mình đã lưu địa chỉ site vào memory để dùng khi cài MCP.

**Mình vẫn đang chờ bạn duyệt capability map và 9 giả định ở tin nhắn trước.** Nếu bạn thấy ổn, mình sẽ lưu `SPEC.md` rồi viết `SPEC-sdlc-contract.md`, xong thì dừng lại để bạn duyệt.

---

# Phiên 1 · Lượt 5 — 2026-10-26 10:35

**Bạn:**

````markdown
Tôi trả lời về 2/9 giả định, 7 cái còn lại như bạn đề xuất:

7. Bạn có thể cài python nhé, hoặc dùng uv thì có thể dùng được pyhton không? Nếu Node là đủ thì không cần thêm Python

4. Các tài liệu như spec, plan, ADR, báo cáo nếu đưa lên Github thì có vấn đề về giới hạn file size của Github không? Vì tài liệu thì ngày càng tăng, nếu 1 repo Github có giới hạn dung lượng lưu trữ thì cần xem xét việc lưu tài liệu ở nơi khác (ví dụ lưu ở Google Drive, tổ chức thư mục hợp lý).

------
Cừng Thảo luận thêm về Trạng thái và State Machine của 1 ticket (feature, bug) trên Jira
1 Dự án tôi từng làm có trạng thái ticket như sau:

```
Trạng thái Jira Ticket và PIC

Trạng thái của Bug Ticket

    Open (dev)
    Assigned (dev)
    In Progress (dev)
    Resolved (dev fix xong bug thì đổi In progress thành Resolved và assign cho tester)

    Cancelled (tester nhận ra ticket không phải là bug)
    Closed (tester verify bug đã được fix đúng, chuyển từ Resolved thành Closed)

Trạng thái của Task (feature) Ticket"
    Open (dev)
    In Progress (dev)
    Completed (dev làm xong task thì đổi In progress thành Completed và assign cho tester)
    Cancelled (tester xác nhận task không cần làm nữa)
    Closed (tester verify Task đã được làm xong, chuyển từ Completed thành Closed)
```

Bạn hãy đề xuất State machine chuẩn giúp tôi nhé
````

**Claude:**

## Giả định 7: Python

Node là đủ, không cần cài Python:
- Claude Code, các script của agent-skills và dự án pilot (Next.js + NestJS) đều chạy trên Node. Viết kit bằng Node thì toàn bộ hệ thống chỉ cần một runtime.
- Các công cụ của quality gate không bắt buộc Python:
  - Pre-commit dùng husky + lint-staged (chạy trên Node), không dùng framework `pre-commit` (chạy trên Python).
  - Secret scan dùng gitleaks, một file chạy độc lập, có bản cho Windows.
  - SAST chạy trong CI trên Linux.
- Về uv: có, dùng được. uv tự tải và quản lý Python riêng (`uv python install`), còn `uvx <tool>` chạy công cụ Python mà không cần cài Python lên máy. Nếu sau này cần một công cụ chỉ có bản Python thì gọi qua `uvx`.

**Chốt:** chỉ dùng Node. uv để dành khi thật sự cần.

## Giả định 4: dung lượng GitHub

Tài liệu dạng text không đụng tới giới hạn của GitHub. Giới hạn chính thức như sau:
- File trên 50 MiB thì Git cảnh báo, trên 100 MiB thì GitHub chặn.
- GitHub khuyến nghị repo dưới 1 GB, và rất nên dưới 5 GB.

Một file spec chỉ khoảng 20–50 KB, nên 1.000 tài liệu cũng chỉ vài chục MB. Git lại nén văn bản rất tốt và khi đóng gói chỉ lưu phần khác nhau giữa các phiên bản. Thứ thật sự làm phình repo là file nhị phân: ảnh chụp, video và trace của Playwright, báo cáo HTML, coverage, PDF.

Mình đề xuất chính sách lưu trữ sau (sẽ đưa vào `sdlc-contract`):

| Loại | Lưu ở đâu | Vì sao |
|---|---|---|
| Tài liệu text: spec, plan, ADR, API contract, test plan, tóm tắt báo cáo | Git, nằm cạnh code | Agent đọc/ghi trực tiếp, phiên bản tài liệu đi cùng phiên bản code, review được ngay trong PR |
| Bằng chứng nặng sinh ra mỗi lần chạy: video/trace Playwright, báo cáo HTML, coverage | Artifact của GitHub Actions (tự xóa sau một thời hạn), dán link vào PR và Jira | Không làm phình repo |
| Ảnh lỗi cần giữ lâu | Đính kèm vào ticket Jira | Gắn liền với ticket |
| Tài liệu gửi khách: biên bản UAT, release note PDF | Google Drive | Dành cho người đọc, agent không cần |

Không nên để spec và plan trên Google Drive, vì khi đó agent phải đi qua connector mới đọc được, tài liệu không còn khớp phiên bản với code, và không review chung được trong PR. Ngoài ra, CI sẽ chặn commit file lớn và `.gitignore` sẵn các thư mục báo cáo test.

## State machine cho ticket

Không có một chuẩn duy nhất cho mọi dự án. Đề xuất dưới đây lấy workflow bug mặc định của Jira (Open → In Progress → Resolved → Closed) làm gốc, thêm các cột Ready và In Review theo cách làm Kanban phổ biến, và gắn với các cổng của quy trình.

### Nhận xét quy trình cũ

Hai điểm tốt nên giữ: dev làm xong không tự đóng ticket mà phải để tester đóng, và có trạng thái Cancelled riêng.

Sáu điểm cần sửa:
1. Bug và Task dùng hai bộ trạng thái khác tên nhưng cùng nghĩa (Resolved và Completed). Nên dùng chung một workflow để chỉ có một board và một bộ luật cho agent.
2. "Assigned" là trường Assignee, không phải một trạng thái.
3. Không có bước kiểm tra ticket đã đủ thông tin trước khi code. Với agent, đây là chỗ lãng phí nhất: ticket mơ hồ thì agent vẫn code, chỉ là code sai hướng. Ticket "không phải bug" cũng phải bị loại ngay ở bước này, chứ không phải đợi dev sửa xong rồi tester mới hủy.
4. Không có bước review và quality gate: ticket nhảy thẳng từ In Progress sang Completed.
5. "Resolved/Completed" không nói code đang ở đâu: mới nằm ở máy dev, đã merge, hay đã lên Development. Tester chỉ test được khi code đã lên Development.
6. Không có đường quay lại khi tester thấy chưa đạt, và không giới hạn số vòng sửa.

### Ba tầng trên Jira, ứng với ba vòng của quy trình

| Đối tượng Jira | Theo dõi giai đoạn | Cổng bạn duyệt |
|---|---|---|
| Epic (một feature) | spec, plan | ① SPEC, ② plan |
| Story / Task / Bug | build → gate → review → merge → QA | ③ merge PR |
| Fix Version (bản release, ví dụ `v1.4.0`) | Staging → Production | ④ cắt release, ⑤ lên Production |

### Story, Task, Bug: dùng chung một workflow

```
Backlog ──► Ready ──► In Progress ──► In Review ──► Ready for QA ──► In QA ──► Done
                          ▲               │                            │
                          └───────────────┴────────────────────────────┘
                     quay lại khi review yêu cầu sửa, CI fail hoặc QA fail
(Mọi trạng thái chưa kết thúc đều có thể chuyển sang Cancelled, kèm lý do)
```

| Trạng thái | Nghĩa là | PIC | Điều kiện để vào | Ai chuyển |
|---|---|---|---|---|
| Backlog | Mới tạo, chưa đủ thông tin | BA agent; bug thì là người báo lỗi | Có tiêu đề, mô tả | Bất kỳ ai |
| Ready | Đủ điều kiện để bắt đầu code | Dev agent nhận việc | Có acceptance criteria; thuộc plan đã duyệt; các ticket nó phụ thuộc đã merge vào `develop`. Bug: tái hiện được, có severity | Tự động khi plan của Epic được duyệt; bug thì bạn triage |
| In Progress | Đang code và viết test (TDD) | FE/BE dev agent | Đã có nhánh `feature/KEY-...` hoặc `bugfix/KEY-...` | Dev agent |
| In Review | PR đang được review | Reviewer agent và security agent, cuối cùng là bạn | PR vào `develop` đã mở và CI xanh | Tự động khi CI xanh |
| Ready for QA | Code đã lên môi trường cần kiểm | QA agent / tester | Đã merge và deploy thành công (thường là Development; bug sửa trên nhánh release thì là Staging) | Tự động sau khi deploy |
| In QA | Đang chạy E2E, regression | QA agent / tester | QA nhận ticket | QA agent / tester |
| Done | Đã verify, đạt DoD | — | Báo cáo QA PASS và có người xác nhận | Bạn hoặc tester |
| Cancelled | Không làm nữa | — | Có lý do: Won't do, Duplicate, Not a bug, Cannot reproduce | Bạn |

Quy tắc đi kèm:
1. **Trạng thái đi theo dữ kiện, không theo lời agent.** Ticket chỉ vào In Review khi có PR và CI xanh, chỉ vào Ready for QA khi pipeline báo deploy thành công. Dev agent không thể tự đẩy ticket sang QA.
2. **Muốn quay lại In Progress phải có lý do và bằng chứng**: comment review, log CI hoặc báo cáo QA FAIL. Mỗi lần quay lại thì bộ đếm tăng một. Đến lần thứ 3, ticket bị gắn cờ "Needs you" và vòng tự động dừng lại.
3. **Bị chặn thì gắn cờ (Flag), không đổi trạng thái.** Ticket vẫn nằm nguyên ở cột của nó, cờ ghi lý do bị chặn. Cờ này cũng dùng để đánh dấu những chỗ cần bạn quyết.
4. **Done là đã kết thúc.** Lỗi phát hiện sau đó, dù trên Staging hay Production, thì tạo Bug mới, liên kết với ticket gốc và ghi Affects Version. Không mở lại ticket đã Done. Nhờ vậy đếm được mỗi bản release có bao nhiêu lỗi lọt qua QA.
5. **Hotfix vẫn đi theo workflow này.** Chỉ khác là nhánh tách từ `main` (`hotfix/...`) và QA kiểm trên Staging.
6. **Giới hạn việc đang làm:** ở Cấp 1, mỗi dev agent chỉ giữ tối đa 1 ticket In Progress, cho vừa với giới hạn usage.

### Epic: theo dõi spec và plan

```
Specifying ──► Planning ──► In Progress ──► Done      (đều có thể → Cancelled)
```
- **Specifying:** BA agent viết SPEC. Epic rời trạng thái này khi bạn duyệt SPEC (cổng ①).
- **Planning:** agent lập plan và tạo các ticket con. Khi bạn duyệt plan (cổng ②), các ticket con chuyển sang Ready.
- **Done:** mọi ticket con đã Done hoặc Cancelled, và đã nằm trong một bản release lên Production.

### Release: không thêm trạng thái cho từng ticket

Done nghĩa là đã verify trên Development, chưa chắc đã lên Production. Nếu thêm các trạng thái như "Released to Staging" hay "Released to Production" cho từng ticket, thì mỗi lần release agent phải chuyển hàng chục ticket, rất tốn token. Thay vào đó, dùng hai tính năng có sẵn của Jira:
- **Fix Version:** khi cắt nhánh `release/v1.4.0`, gắn version `v1.4.0` cho các ticket đã Done. Trang Releases của Jira cho biết bản đó gồm những gì. Lên Production xong thì bấm Release.
- **Deployments:** cài app GitHub for Atlassian và ghi mã Jira trong tên nhánh, commit và PR. Sau đó, mỗi lần GitHub Actions deploy, Jira tự hiện ticket đã lên môi trường nào. Riêng cách đặt tên môi trường cho khớp Development/Staging/Production, mình sẽ kiểm tra khi viết spec `tracker-integration`.

### Đối chiếu với quy trình cũ

| Cũ | Mới |
|---|---|
| Open, Assigned | Backlog → Ready (Assigned chuyển thành trường Assignee) |
| In Progress | In Progress |
| (không có) | In Review |
| Resolved / Completed | Ready for QA |
| (không có) | In QA |
| Closed | Done |
| Cancelled | Cancelled, bắt buộc ghi lý do |

---

Nếu bạn đồng ý, state machine này sẽ vào `SPEC-sdlc-contract.md`; phần cấu hình trên Jira nằm ở `tracker-integration`. Bạn duyệt luôn giúp mình capability map ở tin nhắn trước nhé. Xong là mình lưu `SPEC.md` và bắt đầu viết spec.

Nguồn: [GitHub — About large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), [Atlassian — Link GitHub workflows and deployments to Jira](https://support.atlassian.com/jira-cloud-administration/docs/link-github-workflows-and-deployments-to-jira-issues/)

---

# Phiên 1 · Lượt 6 — 2026-10-26 11:08

**Bạn:**

````markdown
capability map => Đồng ý như bạn đề xuất nhé
Thảo luận thêm:
1. Nếu 1 bug không bị lỗi ở Development nhưng bị lỗi ở Staging thì status của ticket là gì?
2. Các phân biệt 1 task/bug sẽ cần làm/fix ở môi trường Development/Staging/Production như nào?
3. quy trình quản lý task có nên có thêm 'Feature' không?
Dự án chạy theo mô hình Scrum, Agile. LƯu ý thêm về các khái niệm Work Item, Backlog (product backlog, sprint Backlog), Sprint (1 tuần / 1 sprint)

Hierarchy trong Web Development, Một cách tổ chức từ lớn đến nhỏ:

Projcet
Epic
Feature
User Story
Task
Sub-task

```
## 1. Hierarchy phổ biến trong Web Development

Một cách tổ chức từ lớn đến nhỏ có thể như sau:

1. Project

Toàn bộ sản phẩm hoặc dự án

2. Epic

Nhóm công việc lớn, hướng đến một mục tiêu

3. Feature

Một nhóm chức năng của sản phẩm

4. User Story

Nhu cầu cụ thể của người dùng

5. Task

Công việc cần thực hiện

6. Sub-task

Phần việc nhỏ hơn của Task

Bug — loại công việc riêng

Có thể liên kết với các work item khác; vị trí cụ thể tùy quy trình và công cụ.

Lưu ý: Sơ đồ trên là mô hình khái niệm để dễ hiểu, không phải hierarchy bắt buộc của mọi công cụ. Đặc biệt, Feature có thể nằm trong Epic, hoặc được biểu diễn bằng Epic/Story tùy cách team thiết kế backlog.

## 2. Ví dụ thực tế: Website thương mại điện tử

Giả sử team phát triển tính năng đăng nhập.

| Cấp độ | Ví dụ |
| --- | --- |
| Project | E-commerce Website |
| Epic | User Authentication |
| Feature | Login |
| User Story | Là người dùng, tôi muốn đăng nhập bằng email và mật khẩu |
| Task | Implement login API |
| Sub-task | Validate request, kiểm tra password hash, viết unit test |
| Bug | Login thất bại dù email và mật khẩu hợp lệ |

Trong ví dụ này, Bug có thể được liên kết với User Story Login hoặc Epic User Authentication. Nếu cần sửa lỗi, team có thể tạo thêm Task hoặc Sub-task để triển khai việc sửa lỗi, tùy workflow.

## 3. Phân biệt Task, Sub-task và Bug

- User Story: Mô tả giá trị hoặc nhu cầu mà người dùng muốn đạt được.
- Task: Mô tả công việc cần làm để hoàn thành một yêu cầu, thường thiên về triển khai.
- Sub-task: Chia Task thành những phần nhỏ hơn để dễ giao việc và theo dõi.
- Bug: Mô tả hành vi không đúng hoặc không đáp ứng yêu cầu đã xác định; thường cần có bước tái hiện, kết quả thực tế và kết quả mong đợi.

Ví dụ:

- User Story: Người dùng có thể đăng nhập.
- Task: Xây dựng API đăng nhập.
- Sub-task: Validate input, implement authentication, viết test.
- Bug: API trả về lỗi 500 khi mật khẩu sai, thay vì trả về lỗi xác thực phù hợp.
```

Yêu cầu ngoài lề về chat session này:
Viết nội dung (giống 100%, Viết câu hỏi của tôi và trả lời của bạn) mà bạn và tôi đã và đang brainstorm vào brainstorm-discussion.md, lặp lại cho các lần brainstorm sau, để tôi biết lịch sử brainstorm.
````

**Claude:**

_(Không có câu trả lời: lượt này bị lỗi API. Bạn gửi lại tin nhắn và gõ "hi" cũng bị lỗi tương tự. Câu hỏi được hỏi lại ở Phiên 2.)_

---

# Phiên 2 · Lượt 1 — 2026-10-26 11:21

**Bạn:**

````markdown
Tiếp tục session id: 939a53bd-1857-4112-aae9-9942c061d12c

capability map => Đồng ý như bạn đề xuất nhé
Thảo luận thêm:
1. Nếu 1 bug không bị lỗi ở Development nhưng bị lỗi ở Staging thì status của ticket là gì?
2. Các phân biệt 1 task/bug sẽ cần làm/fix ở môi trường Development/Staging/Production như nào?
3. quy trình quản lý task có nên có thêm 'Feature' không?
Dự án chạy theo mô hình Scrum, Agile. LƯu ý thêm về các khái niệm Work Item, Backlog (product backlog, sprint Backlog), Sprint (1 tuần / 1 sprint)

Hierarchy trong Web Development, Một cách tổ chức từ lớn đến nhỏ:

Projcet
Epic
Feature
User Story
Task
Sub-task

```
## 1. Hierarchy phổ biến trong Web Development

Một cách tổ chức từ lớn đến nhỏ có thể như sau:

1. Project

Toàn bộ sản phẩm hoặc dự án

2. Epic

Nhóm công việc lớn, hướng đến một mục tiêu

3. Feature

Một nhóm chức năng của sản phẩm

4. User Story

Nhu cầu cụ thể của người dùng

5. Task

Công việc cần thực hiện

6. Sub-task

Phần việc nhỏ hơn của Task

Bug — loại công việc riêng

Có thể liên kết với các work item khác; vị trí cụ thể tùy quy trình và công cụ.

Lưu ý: Sơ đồ trên là mô hình khái niệm để dễ hiểu, không phải hierarchy bắt buộc của mọi công cụ. Đặc biệt, Feature có thể nằm trong Epic, hoặc được biểu diễn bằng Epic/Story tùy cách team thiết kế backlog.

## 2. Ví dụ thực tế: Website thương mại điện tử

Giả sử team phát triển tính năng đăng nhập.

| Cấp độ | Ví dụ |
| --- | --- |
| Project | E-commerce Website |
| Epic | User Authentication |
| Feature | Login |
| User Story | Là người dùng, tôi muốn đăng nhập bằng email và mật khẩu |
| Task | Implement login API |
| Sub-task | Validate request, kiểm tra password hash, viết unit test |
| Bug | Login thất bại dù email và mật khẩu hợp lệ |

Trong ví dụ này, Bug có thể được liên kết với User Story Login hoặc Epic User Authentication. Nếu cần sửa lỗi, team có thể tạo thêm Task hoặc Sub-task để triển khai việc sửa lỗi, tùy workflow.

## 3. Phân biệt Task, Sub-task và Bug

- User Story: Mô tả giá trị hoặc nhu cầu mà người dùng muốn đạt được.
- Task: Mô tả công việc cần làm để hoàn thành một yêu cầu, thường thiên về triển khai.
- Sub-task: Chia Task thành những phần nhỏ hơn để dễ giao việc và theo dõi.
- Bug: Mô tả hành vi không đúng hoặc không đáp ứng yêu cầu đã xác định; thường cần có bước tái hiện, kết quả thực tế và kết quả mong đợi.

Ví dụ:

- User Story: Người dùng có thể đăng nhập.
- Task: Xây dựng API đăng nhập.
- Sub-task: Validate input, implement authentication, viết test.
- Bug: API trả về lỗi 500 khi mật khẩu sai, thay vì trả về lỗi xác thực phù hợp.
```

Yêu cầu ngoài lề về chat session này:
Viết nội dung (giống 100%, Viết câu hỏi của tôi và trả lời của bạn) mà bạn và tôi đã và đang brainstorm vào brainstorm-discussion.md, lặp lại cho các lần brainstorm sau, để tôi biết lịch sử brainstorm.
````

**Claude:**

Capability map đã được lưu vào `ai-orchestrator/SPEC.md`, cùng các quyết định đã chốt và 9 giả định. Thư mục `ai-orchestrator` giờ đã là git repo (chưa commit gì). Vì dự án chạy Scrum, mình bổ sung vào trách nhiệm của hai module: `sdlc-contract` thêm phân cấp work item và nhịp sprint, `tracker-integration` thêm Scrum board và sprint. Ranh giới và chiều phụ thuộc giữa các module giữ nguyên.

## Scrum trong quy trình này

| Khái niệm | Nghĩa | Ở dự án này |
|---|---|---|
| Work item | Mọi đơn vị công việc được theo dõi: Epic, Story, Task, Bug, Sub-task | Jira Cloud đã đổi tên "issue" thành "work item" và "issue type" thành "work type" từ năm 2025. API và JQL hiện có vẫn dùng chữ `issue` |
| Product Backlog | Danh sách có thứ tự mọi việc chưa làm của sản phẩm | Màn Backlog của Jira. Bạn là PO, quyết định thứ tự. BA agent làm refinement: viết, tách nhỏ, bổ sung acceptance criteria |
| Sprint Backlog | Sprint Goal, các item được chọn cho sprint và kế hoạch làm chúng | Các work item thuộc sprint đang chạy, hiện trên Scrum board |
| Sprint | Khung thời gian cố định | 1 tuần. Mỗi sprint kết thúc bằng một bản release lên Staging để demo |
| DoR / DoD | Điều kiện để kéo item vào sprint / để coi item là xong | Chính là điều kiện để vào trạng thái Ready và Done |

So với state machine đã đề xuất, có hai điều chỉnh:
- **Sprint là một trường, không phải trạng thái**, giống Assignee. Kéo item vào sprint ở Sprint Planning không làm đổi trạng thái của nó. Trên Scrum board, Ready là cột đầu tiên.
- **Đổi tên trạng thái Backlog thành New**, để khỏi lẫn với Product Backlog. Product Backlog chứa cả item New (chưa refine) lẫn item Ready (đã đạt DoR).

Lịch một sprint 1 tuần, ghép với GitFlow:

| Thời điểm | Scrum | Kỹ thuật |
|---|---|---|
| Thứ 2 | Sprint Planning: chọn item Ready, chốt Sprint Goal | — |
| Thứ 2 – thứ 5 | Daily Scrum: agent tổng hợp trạng thái từ Jira và GitHub, kèm danh sách việc đang chờ bạn | build → gate → review → merge vào `develop` → QA trên Development |
| Thứ 5 | Cut-off | Cắt `release/vX.Y.0` khi mọi item đã merge vào `develop` đều Done, rồi chạy full regression trên Staging |
| Thứ 6 | Sprint Review (demo trên Staging), Retrospective | Bạn và khách duyệt xong thì release lên Production |
| Suốt sprint | Backlog Refinement | BA và SA agent viết SPEC và plan cho Epic của sprint sau, để bạn duyệt cổng ① ② trước Sprint Planning |

Item merge sau cut-off sẽ vào bản release của sprint sau.

## 1. Bug không lỗi ở Development nhưng lỗi ở Staging

**Ticket gốc giữ nguyên Done. Lỗi được ghi bằng một Bug mới, bắt đầu ở trạng thái New.**

Release chỉ được cắt khi mọi item đã merge đều Done, nên item nào lên Staging cũng đã Done. Vì vậy tình huống này luôn rơi vào quy tắc 4 của state machine: lỗi phát hiện sau Done thì tạo Bug mới, không mở lại ticket cũ. Lý do:
- Ticket gốc đã được tính là hoàn thành trong sprint. Mở lại sẽ làm sai velocity, burndown và sprint report.
- Nguyên nhân thường khác lỗi ban đầu (nằm ở môi trường), nên cần một bản ghi riêng.
- Đếm được mỗi bản release có bao nhiêu lỗi lọt qua QA trên Development.

Cách xử lý:
1. **Kiểm tra bản build trước.** So commit hoặc image tag đang chạy trên Staging với commit của ticket gốc. Nếu bản release không chứa thay đổi đó thì đây không phải bug mà là release thiếu commit: sửa Fix Version của ticket gốc hoặc merge bổ sung, không tạo Bug.
2. **Nếu bản build có chứa thay đổi, tạo Bug mới** với Found in = Staging, Affects Version = bản đang ở Staging (ví dụ `v1.4.0`), Severity, và link tới ticket gốc.
3. **Severity quyết định đường đi** (chi tiết ở câu 2). Critical/High thì chặn release: Bug được kéo vào sprint đang chạy, nhánh sửa tách từ `release/v1.4.0`, và Bug chỉ vào Ready for QA khi bản sửa đã lên Staging. Medium/Low thì vào Product Backlog để sửa ở bản sau, kèm ghi known issue vào release note.
4. **Không đóng Bug với lý do "Cannot reproduce" chỉ vì không tái hiện được trên Development.** Phải thử trên chính môi trường đã báo lỗi.

Lỗi chỉ xuất hiện ở Staging thường do một trong các khác biệt sau. Agent debug nên so các khác biệt này trước khi đọc code:
- Phiên bản code: Staging chạy nhánh release, còn Development chạy `develop` mới hơn.
- Cấu hình: biến môi trường, secret, feature flag.
- Dữ liệu: data của Staging giống production, nhiều hơn và có nhiều trường hợp biên hơn.
- Hạ tầng: domain, HTTPS, CORS, cookie, reverse proxy, cache.
- Migration chưa chạy, hoặc dịch vụ bên thứ ba dùng tài khoản khác.

## 2. Làm hoặc sửa ở môi trường nào

Không ai code trực tiếp trên một môi trường. Thay đổi vào nhánh nào thì lên môi trường của nhánh đó. Vì vậy câu hỏi thực chất là **nhánh sửa tách từ đâu**, và câu trả lời nằm ở Fix Version, tức bản release sẽ chứa thay đổi.

Hai quy tắc:
1. **Việc mới (Story, Task) luôn đi vào `develop`, tức Development.** Staging và Production chỉ nhận code qua release hoặc hotfix.
2. **Bug được sửa trên nhánh cũ nhất còn cần bản sửa**, rồi merge ngược về các nhánh mới hơn để bản sửa không bị mất.

Khi triage một Bug, agent đề xuất và bạn duyệt bốn trường:
- **Found in** (Development / Staging / Production): nơi phát hiện lỗi, dùng để tái hiện và để thống kê. Nên tạo trường dạng select, vì trường Environment có sẵn của Jira là text tự do, agent và JQL khó dùng.
- **Affects Version**: bản cũ nhất đang có lỗi.
- **Severity**: Critical (mất hoặc sai dữ liệu, lỗ hổng bảo mật, hệ thống hoặc luồng thanh toán ngừng), High (luồng chính hỏng, không có cách né), Medium (có cách né), Low (giao diện, chính tả).
- **Fix Version**: suy ra từ Affects Version và Severity theo bảng dưới. Dev agent đọc trường này để biết tách nhánh từ đâu, không phải đoán.

| Bản cũ nhất đang có lỗi | Critical / High | Medium / Low |
|---|---|---|
| Production `vX.Y.Z` | Hotfix: Fix Version `vX.Y.(Z+1)`, nhánh `hotfix/...` tách từ `main`, QA trên Staging rồi Production | Bản kế tiếp: nhánh tách từ `develop`, QA trên Development |
| Staging `vX.Y.Z`, chưa lên Production | Fix Version là bản đang ở Staging: nhánh tách từ `release/vX.Y.Z`, QA trên Staging | Bản kế tiếp: nhánh tách từ `develop`, QA trên Development. Ghi known issue vào release note |
| Chỉ có trên `develop` | Bản kế tiếp: nhánh tách từ `develop`, QA trên Development | Như ô bên trái |

Về sprint: lỗi Critical/High được chen vào sprint đang chạy (nếu sprint quá tải, bạn quyết định bỏ bớt item nào), còn lỗi Medium/Low vào Product Backlog để bạn xếp thứ tự.

Nhánh `release/*` và `hotfix/*` khi kết thúc đều được merge vào `main` và merge ngược về `develop`; bước này đã có trong luồng ship. Nếu làm hotfix lúc đang có nhánh release mở, bản sửa được merge thêm vào nhánh release đó.

Có một trường hợp không tạo Bug: lỗi tìm thấy khi QA một item chưa Done. Khi đó ticket quay lại In Progress kèm báo cáo QA FAIL, được sửa trên nhánh mới tách từ `develop` (vẫn mang mã ticket cũ), rồi kiểm lại trên Development.

## 3. Có nên thêm Feature không

**Không nên thêm work type Feature riêng. Dùng Epic làm Feature.** Lý do:
1. **Jira Cloud không cho chèn cấp giữa Epic và Story.** Phân cấp mặc định là Epic (cấp 1) > Story, Task, Bug (cấp 0) > Sub-task (cấp -1). Gói Premium và Enterprise chỉ cho thêm cấp *phía trên* Epic. Nếu giả lập Feature bằng label hoặc trường link tự tạo, thì board, timeline và phần tính tiến độ của Jira không hiểu quan hệ đó, và agent phải tự giữ cho nó đúng.
2. **Trong thiết kế hiện tại, Epic đã đóng vai feature:** mỗi Epic có một SPEC, một plan, và đi qua cổng ① ②. Thêm cấp Feature thì trùng vai trò.
3. **Scrum không bắt buộc phân cấp nào**, chỉ có Product Backlog Item. Càng ít cấp thì agent càng ít lượt chuyển trạng thái, và càng ít chỗ để trạng thái bị lệch.

Ánh xạ mô hình 6 cấp của bạn vào Jira:

| Mô hình của bạn | Trong Jira | Ví dụ | Ghi chú |
|---|---|---|---|
| Project | Space | E-commerce Website | Jira Cloud đổi tên "project" thành "space" từ tháng 9/2025. Mỗi sản phẩm một space |
| Epic (mục tiêu lớn) | Label hoặc Component, ví dụ `auth` | User Authentication | Chỉ để nhóm, không có workflow. Site dùng gói Premium thì có thể chuyển thành một cấp phía trên Epic (Initiative) |
| Feature | **Epic** | Login | Có SPEC và plan, kéo dài 1–3 sprint |
| User Story | Story | Đăng nhập bằng email và mật khẩu | Đơn vị để lập sprint, ước lượng, QA và Done. Phải vừa một sprint, tốt nhất 1–2 ngày |
| Task (con của Story) | **Sub-task** | Implement login API | Jira không cho Task làm con của Story |
| Sub-task | Checklist trong Sub-task, hoặc các bước TDD của agent | Validate request, kiểm tra password hash, viết unit test | Jira không có cấp dưới Sub-task |
| Task độc lập | Task, cùng cấp Story | Thiết lập CI cho repo | Việc kỹ thuật không trực tiếp mang giá trị cho người dùng |
| Bug | Bug, cùng cấp Story | Login trả về 500 khi sai mật khẩu | Link tới Story hoặc Epic liên quan |

Quy ước đi kèm:
- Mỗi task trong plan đã duyệt (cổng ②) trở thành một Story hoặc Task. Mặc định **1 Story = 1 nhánh = 1 PR**.
- Sub-task chỉ dùng khi một Story phải chia cho nhiều agent (BE, FE, QA) cùng làm trên một nhánh. Sub-task có workflow rút gọn To Do → In Progress → Done. State machine đầy đủ chỉ áp dụng cho Story, Task và Bug.

---

**Bạn duyệt giúp mình 4 điểm:**
1. Quy tắc "Done là kết thúc" ở câu 1.
2. Bảng chọn nhánh và môi trường ở câu 2, cùng bốn trường Found in, Affects Version, Severity, Fix Version.
3. Bảng ánh xạ phân cấp ở câu 3.
4. Hai điều chỉnh do Scrum (đổi Backlog thành New, Sprint là một trường) và lịch sprint (cut-off thứ 5, Sprint Review trên Staging thứ 6).

Duyệt xong, mình sẽ viết `SPEC-sdlc-contract.md` rồi dừng lại để bạn duyệt.

Toàn bộ lịch sử Phiên 1 và lượt này đã được ghi nguyên văn vào `ai-orchestrator/misc/brainstorm-discussion.md`. Mình đã lưu quy tắc này vào memory, nên sau mỗi lượt brainstorm mình sẽ ghi tiếp vào cuối file.

Nguồn: [Atlassian — Work is the new collective term for items tracked in Jira](https://community.atlassian.com/forums/Jira-articles/It-s-here-Work-is-the-new-collective-term-for-all-items-you/bc-p/2976336), [Atlassian — Projects will soon be Spaces](https://community.atlassian.com/forums/Jira-articles/Evolving-Jira-terminology-Projects-will-soon-be-Spaces/ba-p/3034977), [Atlassian — Configure the work type hierarchy](https://support.atlassian.com/jira-cloud-administration/docs/configure-the-issue-type-hierarchy)

---

# Phiên 2 · Lượt 2 — 2026-10-26 12:29

**Bạn:**

```markdown
1. OK
2. OK
Thảo luận thêm:
3. task và story có hierarchy ngang cấp, vậy tại sao lại có cả task và story, sao không gộp lại 1, task và story khác gì nhau? 
    link jira docs: https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/, https://www.atlassian.com/software/jira/guides/issues/overview

4.
Dự án phát triển theo hướng Ai coding agent Orchestrator như đang brainstorm, thì có cần chạy theo mô hình Scrum, Agile, Sprint không?
```

**Claude:**

Điểm 1 và 2 đã chốt: quy tắc "Done là kết thúc", bảng chọn nhánh và môi trường, cùng bốn trường Found in, Affects Version, Severity, Fix Version. Mình sẽ đưa chúng vào `SPEC-sdlc-contract.md`.

## 3. Story và Task khác gì nhau

Cùng cấp chỉ có nghĩa là cùng vị trí trong cây: cả hai đều nằm được dưới Epic và chứa được Sub-task. Cấp không nói công việc thuộc loại gì. Bug cũng cùng cấp với Story, nhưng không ai gộp Bug vào Story.

Docs của Atlassian định nghĩa hai loại này rất chung. Story là "the smallest unit of work that needs to be done", còn Task là "work that needs to be done", và trang đó không nói khi nào dùng loại nào. Vì vậy ranh giới giữa Story và Task là quy ước của từng team. Atlassian cũng chỉ đưa Story vào software space; business space (cho marketing, nhân sự…) mặc định chỉ có Task. Trang guide thứ hai bạn gửi thì mình chỉ tải được phần menu, không đọc được nội dung.

Quy ước mình đề xuất cho dự án này:

| | Story | Task |
|---|---|---|
| Trả lời câu hỏi | Người dùng được gì? | Team phải làm gì? |
| Cách viết | "Là <vai trò>, tôi muốn <hành động> để <lợi ích>", kèm acceptance criteria dạng Given/When/Then | Mục tiêu và checklist kỹ thuật |
| Ví dụ | Đăng nhập bằng email và mật khẩu | Thiết lập CI; nâng phiên bản Next.js; cấu hình Docker Compose cho Staging; refactor module auth; spike so sánh hai thư viện |
| Agent tham gia | BA viết acceptance criteria, UI/UX nếu có giao diện, FE/BE, reviewer, security, QA | FE/BE hoặc DevOps, reviewer, security |
| Bước QA | QA agent viết và chạy E2E cho từng acceptance criterion, kèm regression | Chỉ chạy regression để chắc không làm hỏng gì |
| Demo cho khách | Có | Thường không |

Cả hai vẫn dùng chung một workflow như đã chốt. Loại work item chỉ đổi việc cần làm ở từng bước.

**Cách chọn:** người dùng cuối có nhìn thấy hoặc kiểm chứng được kết quả không? Có thì là Story, không thì là Task. Nếu hành vi hiện có sai so với yêu cầu đã có thì là Bug.

Hai quy tắc đi kèm:
- **Phần kỹ thuật của một tính năng không tách thành Task riêng.** API hay migration phục vụ Story đăng nhập thuộc về chính Story đó: làm trên nhánh của Story, và nếu phải chia cho nhiều agent thì tách thành Sub-task. Nếu tách theo lớp (một Task BE, một Task FE), không Task nào tự nó cho ra thứ người dùng kiểm chứng được, và QA không có gì để test.
- **Reviewer agent chặn Task "trá hình".** PR của một Task mà làm đổi giao diện hoặc API công khai thì phải đổi Task thành Story, để không ai dùng Task để bỏ qua bước BA và QA.

**Không nên gộp làm một.** Với bộ điều phối, loại work item là khóa để định tuyến: nó quyết định template và DoR, agent nào tham gia, mức QA, và có demo hay không. Nếu gộp, vẫn phải thêm một trường khác (ví dụ label "user-facing") để mang đúng thông tin đó. Tức là vẫn có hai loại, chỉ là khó nhìn thấy hơn.

## 4. Có cần chạy Scrum không

**Agile thì có, và quy trình đã agile sẵn:** làm từng phần nhỏ, mỗi tuần có bản chạy được trên Staging, khách phản hồi đều đặn, quy trình tự điều chỉnh. **Scrum đầy đủ thì không cần.** Mình đề xuất dùng Kanban cho luồng việc, cộng một nhịp tuần cố định cho những việc cần con người.

Scrum được thiết kế cho một nhóm người (Scrum Guide ghi thường 10 người trở xuống) cần phối hợp với nhau. Ở đây chỉ có bạn và các agent, nên vấn đề không còn là phối hợp nhóm. Hai giới hạn thật sự là thời gian bạn duyệt và giới hạn usage của gói Pro.

| Thành phần của Scrum | Khi người làm là AI agent | Đề xuất |
|---|---|---|
| Sprint Planning, cam kết sprint | Năng lực agent dao động theo giới hạn usage và số vòng sửa, nên cam kết theo tuần dễ vỡ | Bỏ. Agent kéo item Ready kế tiếp khi còn chỗ |
| Story point, velocity | Kích thước việc đã được khống chế ở bước plan (task nhỏ, ít file), ước lượng cho agent ít ý nghĩa | Bỏ. Dùng số liệu Jira và GitHub tự ghi |
| Daily Scrum | Agent không cần họp, trạng thái luôn có trên Jira | Thay bằng bản tổng hợp tự động mỗi sáng, kèm danh sách việc đang chờ bạn |
| Sprint Review | Khách vẫn cần xem sản phẩm định kỳ | Giữ: demo hằng tuần trên Staging |
| Retrospective | Quy trình và agent phải được chỉnh liên tục, nhất là khi đang nâng từ Cấp 1 lên Cấp 3 | Giữ. Đây là nhịp quan trọng nhất |
| Product Owner, Product Backlog | Vẫn cần một người quyết định thứ tự ưu tiên | Giữ: bạn là PO |
| Backlog Refinement | Chính là bước spec, plan với cổng ① ② | Giữ |
| Scrum Master | Việc giữ đúng quy trình đã do `sdlc-contract` và bộ điều phối đảm nhận | Bỏ |

Kanban hợp hơn vì ba lý do:
1. **Nút thắt chuyển sang bạn.** Agent viết code nhanh; chậm nhất là lúc bạn duyệt SPEC, plan và PR. Kanban xử lý nút thắt bằng giới hạn WIP, ví dụ tối đa 2–3 PR chờ bạn duyệt, vượt thì agent không kéo việc mới. Scrum không có công cụ này.
2. **Bộ điều phối ở Cấp 2–3 về bản chất là một hệ Kanban viết bằng code:** hàng đợi item Ready, giới hạn số agent chạy song song, xong việc thì kéo việc tiếp. Chạy Kanban ngay từ Cấp 1 thì khi tự động hóa không phải đổi quy trình.
3. **Khớp với mục tiêu ban đầu của bạn:** "orchestrator có kanban".

Nhịp tuần, thay cho lịch sprint ở lượt trước:

| Thời điểm | Việc |
|---|---|
| Thứ 2 | Bạn sắp lại thứ tự Product Backlog và duyệt các SPEC, plan đang chờ (cổng ① ②) |
| Hằng ngày | Bản tổng hợp tự động; agent làm theo luồng, còn chỗ thì kéo việc |
| Thứ 5 | Cắt `release/vX.Y.0` khi mọi item đã merge vào `develop` đều Done, rồi chạy full regression trên Staging |
| Thứ 6 | Demo trên Staging, retro dựa trên số liệu của tuần; duyệt xong thì lên Production |

Số liệu cho retro: cycle time, số item Done mỗi tuần, số vòng sửa (review, CI, QA), số lỗi lọt lên Staging và Production, usage của mỗi item, và thời gian item nằm chờ bạn. Mỗi tuần vẫn có một mục tiêu cho bản release (ghi ở Fix Version) để báo khách, nhưng đó là dự báo, không phải cam kết.

Ảnh hưởng tới những gì đã chốt:
- Điểm 1 và 2 giữ nguyên, vì chúng dựa trên nhánh và version, không dựa trên sprint.
- Đổi trạng thái Backlog thành New vẫn áp dụng.
- Không cần trường Sprint. Jira dùng Kanban board, đặt giới hạn WIP cho từng cột, và mỗi bản release tuần là một Fix Version.
- Sau khi bạn duyệt, dòng "Quy trình quản lý" trong `SPEC.md` đổi từ "Scrum, sprint 1 tuần" thành "Kanban, release hằng tuần".

Nếu khách hàng hoặc công ty yêu cầu Scrum, quy trình vẫn chạy được: sprint chỉ là khung báo cáo theo tuần. State machine không phải sửa, vì Sprint là một trường chứ không phải trạng thái.

---

**Bạn chốt giúp mình 2 điểm:**
1. Giữ cả Story và Task, phân biệt bằng câu hỏi "người dùng cuối có kiểm chứng được không".
2. Chạy Kanban kèm nhịp tuần, hay vẫn giữ Scrum.

Chốt xong, mình sẽ viết `SPEC-sdlc-contract.md` (gồm cả điểm 1, 2 bạn vừa duyệt) rồi dừng lại để bạn duyệt.

Lượt này đã được ghi tiếp vào `ai-orchestrator/misc/brainstorm-discussion.md`, và trạng thái của `sdlc-contract` trong `SPEC.md` đã được cập nhật.

Nguồn: [Atlassian — What are work types?](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/), [The Scrum Guide (2020)](https://scrumguides.org/scrum-guide.html)

---

# Phiên 2 · Lượt 3 — 2026-10-26 13:16

**Bạn:**

```markdown
1. OK
```

**Claude:**

Đã ghi nhận điểm 1: giữ cả Story và Task. Điểm 2 bạn chưa trả lời, mà mình cần nó trước khi viết `SPEC-sdlc-contract.md`, nên mình hỏi nhanh ở đây.

Claude hỏi lại bạn 1 câu trắc nghiệm:

**1. Điểm 2: dự án chạy Kanban kèm nhịp tuần, hay vẫn giữ Scrum với sprint 1 tuần?** _(Quy trình)_

- **Kanban + nhịp tuần (Recommended)**: Agent kéo việc liên tục, có giới hạn WIP. Giữ demo trên Staging, retro và release hằng tuần; bỏ Sprint Planning, story point, Daily Scrum. Jira dùng Kanban board, mỗi bản release tuần là một Fix Version.
- **Giữ Scrum, sprint 1 tuần**: Theo lịch sprint ở Phiên 2 · Lượt 1: Sprint Planning thứ 2, cut-off thứ 5, Review và Retro thứ 6. Hợp khi khách hàng hoặc công ty yêu cầu Scrum. Jira dùng Scrum board và trường Sprint.

→ Bạn chọn (2026-10-26 13:17): **Kanban + nhịp tuần (Recommended)**

**Bạn (nhắn thêm trong lúc Claude đang làm, 2026-10-26 13:16):**

```markdown
2. Chạy Kanban kèm nhịp tuần
```

**Claude:**

Bạn đã chốt Kanban kèm nhịp tuần (chọn trong câu hỏi và nhắn thêm). Vậy là đủ đầu vào. Mình viết `SPEC-sdlc-contract.md` rồi dừng lại để bạn duyệt.

Các file của lượt trước đã ghi xong. Mình kiểm tra lại trạng thái rồi ghi lượt này vào lịch sử brainstorm.

Mình đã ghi nhận cả hai quyết định: giữ cả Story và Task, và chạy Kanban kèm nhịp tuần. Trong `SPEC.md`, dòng "Quy trình quản lý" và phần bổ sung cho `sdlc-contract`, `tracker-integration` đã được sửa theo Kanban.

Mình đã viết `ai-orchestrator/SPEC-sdlc-contract.md`. Spec này mô tả quy trình dưới dạng một bộ file YAML (gọi là hợp đồng), để bạn, agent và script cùng đọc từ một nguồn:

| Mục | Nội dung |
|---|---|
| 2.1 Vai trò | 10 vai trò trong `chat.md`, cộng `human` (bạn) và `automation` |
| 2.2 Giai đoạn và cổng | 11 giai đoạn từ `spec` tới `hotfix`. Mỗi giai đoạn có người làm, đầu vào, đầu ra và điều kiện để qua. Có 5 cổng do bạn duyệt |
| 2.3 Work item | Phân cấp, cách chọn Story/Task/Bug, các trường Found in, Affects Version, Severity, Fix Version, Rework count |
| 2.4 State machine | Ba workflow: `standard` (Story, Task, Bug), `epic`, `sub-task`. Mỗi bước chuyển trạng thái ghi rõ ai chuyển, điều kiện và bằng chứng |
| 2.5 DoR, DoD | Theo từng loại work item |
| 2.6 Môi trường, định tuyến bug | Bảng bạn đã duyệt, cộng quy tắc đánh số phiên bản |
| 2.7 Nhịp tuần, WIP, số liệu | Lịch thứ 2, thứ 5, thứ 6; giới hạn WIP; số liệu cho retro |
| 2.8 Xử lý lỗi | Sửa lại tối đa 3 lần, CI chập chờn, agent thất bại, chạm giới hạn usage, deploy hoặc smoke test fail |
| 2.9 Artifact, template | 10 loại artifact, mỗi loại có template và nơi lưu |
| 3–9 | Tech stack (Node 24, `yaml`, `ajv`, `node:test`), lệnh, cấu trúc thư mục, code style, chiến lược test, ranh giới, tiêu chí hoàn thành |

Hợp đồng sẽ được kiểm tra tự động bằng `npm run validate`. Lệnh này báo lỗi chẳng hạn khi một bước chuyển sang Done có người chuyển không phải bạn, khi có state không đi tới được, hoặc khi bảng định tuyến bug thiếu tổ hợp. File `docs/sdlc.md` được sinh ra từ YAML, nên luôn khớp với hợp đồng.

**7 câu hỏi mở (mục 10).** Đây là những điểm mới, mình chưa thảo luận với bạn:
1. Epic có thêm state `new`, để tách Epic còn là ý tưởng khỏi Epic đang được viết SPEC.
2. Agent được tự chuyển Sub-task sang Done. Quy tắc "chỉ bạn chuyển sang Done" vẫn áp dụng cho Story, Task, Bug và Epic.
3. Báo cáo QA của từng item nằm trên Jira, báo cáo review nằm trên PR. Chỉ báo cáo regression của bản release và release note được commit vào Git. Nếu commit cả báo cáo QA của từng item, mỗi lần QA sẽ phải mở thêm một PR vào `develop`.
4. Giới hạn WIP mặc định: tối đa 2 item ở cột In Review, tối đa 1 Epic đang viết SPEC hoặc plan.
5. Đánh số phiên bản theo SemVer: bản release hằng tuần tăng số minor, hotfix tăng số patch.
6. Khi CI fail mà nghi do test chập chờn, CI tự chạy lại tối đa 1 lần.
7. Có thư viện `lib/contract.mjs` làm giao diện chung cho các module khác, thay vì để mỗi module tự đọc YAML.

Bạn duyệt giúp mình spec và 7 câu hỏi trên. Sau khi bạn duyệt, mình mới chuyển sang bước plan cho module này.

Lượt này đã được ghi tiếp vào `ai-orchestrator/misc/brainstorm-discussion.md`.

---

# Phiên 3 · Lượt 1 — 2026-10-26 15:43

**Bạn:**

```markdown
Tiếp tục session id: 075cf034-63dd-4693-9a6a-39cdea6d9231

đồng ý spec và 7 câu hỏi trên. Thảo luận thêm:
Story cần cả FE VÀ BE làm thì có được tạo trên 2 nhánh riêng không? Tôi chưa rõ quy ước 'Mặc định 1 Story = 1 nhánh = 1 PR' sẽ áp dụng cho trường hợp này như nào?
```

_(Bạn dừng Claude giữa chừng lúc 15:46, rồi nhắn tiếp.)_

```markdown
tiếp tục
```

**Bạn (nhắn thêm trong lúc Claude đang làm, khoảng 15:47):**

```markdown
đọc D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ai-orchestrator\misc\brainstorm-discussion.md để nắm context nhé
```

**Claude:**

Mình đã đọc toàn bộ `misc/brainstorm-discussion.md`, từ Phiên 1 · Lượt 1 tới Phiên 2 · Lượt 3, để nắm lại bối cảnh.

Đã ghi nhận: bạn duyệt spec `sdlc-contract` và 7 câu hỏi ở mục 10. Trạng thái trong `SPEC-sdlc-contract.md` và `SPEC.md` đã được cập nhật. Bước plan cho module này chờ bạn chốt câu hỏi dưới đây, vì câu trả lời sẽ sửa mục 2.2, 2.3, 2.5 và 2.7 của spec.

## Story có cả FE và BE thì có tách hai nhánh không

**Câu trả lời phụ thuộc vào việc FE và BE nằm chung một repo hay ở hai repo, và điểm này chưa được chốt.** Quy ước "1 Story = 1 nhánh = 1 PR" được viết với giả định FE và BE chung một repo (monorepo), nhưng spec chưa ghi rõ giả định đó. Mình đề xuất chốt monorepo cho pilot (so sánh ở cuối). Trong monorepo, câu trả lời là **không tách**: phần FE và BE của một Story nằm trên cùng một nhánh và cùng một PR.

### Vì sao không tách thành hai nhánh, hai PR

Lấy ví dụ Story PROJ-12 "Đăng nhập bằng email và mật khẩu", tách thành nhánh `feature/PROJ-12-be` và `feature/PROJ-12-fe`:

1. **`develop` sẽ chứa nửa Story.** Hai PR được duyệt và merge vào hai thời điểm khác nhau. Khi PR BE đã merge mà PR FE còn đang review, Development có API nhưng chưa có màn hình, nên QA không có gì để kiểm. Nếu tới thứ 5 PR FE vẫn chưa merge, điều kiện cắt release "mọi item đã merge vào `develop` đều Done" không đạt: phải chờ, hoặc revert PR BE.
2. **Lỗi lệch giữa hai phía bị phát hiện muộn.** Lỗi hay gặp nhất giữa FE và BE là lệch hợp đồng API: tên trường, định dạng lỗi, mã HTTP. Reviewer chỉ thấy được cả hai phía khi chúng nằm trong cùng một PR. E2E cho acceptance criteria cũng cần cả API lẫn giao diện, nên với hai PR thì E2E chỉ chạy được sau khi cả hai đã vào `develop`, lúc sửa đã tốn hơn.
3. **Bạn phải duyệt hai lần cho một Story**, trong khi thời gian duyệt của bạn đang là nút thắt.
4. **State machine và WIP phức tạp hơn.** Các guard như "PR đã mở, CI xanh" hay "PR đã merge" đang nói về một PR. Có hai PR thì mọi guard phải đổi thành "mọi PR của item". Một Story cũng chiếm hết 2 chỗ của cột In Review.

Một PR còn giúp rollback gọn: revert một merge commit là gỡ được cả Story.

### FE và BE agent làm chung một nhánh như thế nào

Đây chính là trường hợp Sub-task được dùng (mục 2.3: "chỉ dùng khi một Story phải chia cho nhiều agent").

```
plan (cổng ②)    sa ghi hợp đồng API của Story: endpoint, request, response, mã lỗi
      │
Story PROJ-12 ── nhánh feature/PROJ-12-login, tách từ develop
      ├─ Sub-task BE → be-dev: API, migration, integration test; commit lên nhánh
      ├─ Sub-task FE → fe-dev: màn hình gọi API thật trên cùng nhánh; commit tiếp
      └─ cả hai xong → mở 1 PR vào develop → CI → review → cổng ③
```

- **Hợp đồng API được chốt từ bước plan**, để hai agent làm theo cùng một bản và không agent nào phải tự đoán. Hợp đồng là tài liệu text lưu trong Git, đúng nhóm "API contract" đã chốt ở Phiên 1 · Lượt 5. agent-skills cũng ghi: các phần dùng chung một hợp đồng API thì "define the contract first, then parallelize".
- **Ở Cấp 1, hai agent làm lần lượt, BE trước.** FE gọi được API thật nên không phải viết mock rồi bỏ đi. Làm song song trên cùng một nhánh dễ conflict và tốn usage gấp đôi cùng lúc. Hai agent cũng không phải ngồi chờ nhau: `be-dev` xong Sub-task của mình thì kéo được việc kế tiếp.
- **Ở Cấp 2–3, nếu cần làm song song:** mỗi agent làm trong một git worktree riêng, trên một nhánh con chỉ có ở local (ví dụ `feature/PROJ-12-login--api`), rồi merge vào nhánh của Story trước khi mở PR. Phải dùng nhánh con vì Git không cho hai worktree cùng checkout một nhánh. Nhánh con không đẩy lên GitHub và không có PR riêng.
- Story chỉ đụng một phía, ví dụ chỉ đổi giao diện, thì không cần Sub-task.

### Story quá lớn cho một PR

Gộp FE và BE thì PR to hơn. Cách xử lý là **tách Story theo chiều dọc, không tách theo lớp**: mỗi Story nhỏ vẫn có đủ FE và BE, và người dùng vẫn kiểm chứng được. Ví dụ, "Đăng nhập" tách thành "Đăng nhập thành công bằng email và mật khẩu" và "Báo lỗi khi sai mật khẩu, khóa tài khoản sau 5 lần sai". agent-skills gọi cách này là vertical slicing, và lấy đúng ví dụ "User can log in (auth schema + API + UI for login)" làm một task.

Điều này kéo theo một chỉnh sửa ở DoR. DoR hiện ghi Story "khoảng 5 file thay đổi trở xuống", nhưng một Story đăng nhập có cả FE và BE thường đã đụng 7–8 file code, chưa kể file test, nên gần như Story nào có hai phía cũng trượt DoR. Ngưỡng cỡ task của agent-skills đo phần việc một agent làm trong một lần giao việc, nên áp cho từng Sub-task thì hợp hơn: **mỗi Sub-task (hoặc cả Story, nếu không có Sub-task) khoảng 5 file code trở xuống, không tính file test.** Sub-task nào vượt ngưỡng thì phải tách Story.

### Khi nào FE và BE được tách thành item riêng

Chỉ có hai trường hợp:
1. **Phần nền dùng chung cho nhiều Story**, như module auth, schema cho cả Epic, hoặc cấu hình API client. Phần này là Task độc lập, có nhánh và PR riêng, làm trước. Các Story khai báo phụ thuộc vào Task đó, và điều kiện của transition `start` đã chặn Story bắt đầu trước khi Task được merge.
2. **FE và BE nằm ở hai repo.** Khi đó một Story bắt buộc có hai PR, xem bảng dưới.

### Monorepo hay hai repo

| | Monorepo (`apps/web`, `apps/api`) | Hai repo |
|---|---|---|
| Story có cả FE và BE | 1 nhánh, 1 PR | Cùng tên nhánh ở hai repo, 2 PR, merge BE trước FE; gặp đủ bốn vấn đề ở trên |
| Hợp đồng API | Kiểu dữ liệu đặt trong một package dùng chung; lệch hợp đồng thì `tsc` báo lỗi ngay | Phải publish package hoặc sinh code từ OpenAPI, dễ lệch phiên bản |
| E2E trên PR | Chạy được với cả hai app | CI phải tìm nhánh cùng tên ở repo kia để ghép |
| GitFlow | Một `develop`, một `release/*`, một tag cho mỗi bản | Hai bộ, phải giữ phiên bản của hai repo khớp nhau |
| Deploy | Vẫn build 2 Docker image và deploy riêng được | 2 Docker image |

Monorepo có hai nhược điểm, đều xử lý được:
- **CI chạy lâu hơn:** CI lọc theo đường dẫn, chỉ chạy unit và integration test của app có file thay đổi. Việc này thuộc `quality-gates`.
- **Agent có thể sửa nhầm code của phía kia:** giới hạn phạm vi ghi file theo agent, `fe-dev` chỉ sửa `apps/web/`, `be-dev` chỉ sửa `apps/api/`, và hook chặn lệnh ghi ra ngoài phạm vi. Việc này thuộc `agent-roster`.

Hai repo hợp khi FE và BE do hai team khác nhau làm, hoặc khi BE phục vụ nhiều client độc lập. Pilot không thuộc trường hợp nào. Next.js và NestJS lại cùng dùng TypeScript, nên monorepo có lợi nhất ở điểm dùng chung kiểu dữ liệu. Công cụ quản lý monorepo (npm workspaces có sẵn trong Node, hay thêm Turborepo) sẽ chọn ở `project-scaffold`.

Hợp đồng ở Cấp 1 chỉ cần hỗ trợ một PR cho mỗi item. Nếu sau này có dự án bắt buộc dùng hai repo, mình sẽ sửa guard thành "mọi PR của item" vào lúc đó.

### Những chỗ sẽ sửa trong spec nếu bạn đồng ý

- **`SPEC.md`, bảng quyết định:** thêm dòng "Cấu trúc repo: monorepo, FE ở `apps/web`, BE ở `apps/api`; công cụ chọn ở `project-scaffold`".
- **`SPEC-sdlc-contract.md` mục 2.3:** thay quy ước "Mặc định 1 Story = 1 nhánh = 1 PR" bằng ba quy ước:
  - Mỗi Story, Task, Bug có đúng một nhánh và một PR, chứa mọi phần nó cần: FE, BE, migration, test.
  - Story có cả FE và BE được chia thành Sub-task FE và Sub-task BE. Hai agent commit lên cùng nhánh, BE làm trước; PR chỉ được mở khi mọi Sub-task đã xong.
  - Story quá lớn thì tách theo chiều dọc thành nhiều Story nhỏ, mỗi Story vẫn đủ FE và BE.
- **Mục 2.5, DoR của Story:** thay "khoảng 5 file thay đổi trở xuống" bằng "mỗi Sub-task, hoặc cả Story nếu không có Sub-task, khoảng 5 file code trở xuống, không tính file test"; thêm "có hợp đồng API nếu Story có cả FE và BE".
- **Mục 2.2, giai đoạn `plan`:** đầu ra có thêm hợp đồng API cho các Story có cả FE và BE.
- **Mục 2.7, giới hạn WIP:** ghi rõ giới hạn 1 việc của mỗi dev agent tính theo Sub-task khi Story có Sub-task, nên `be-dev` xong Sub-task BE là kéo được việc kế tiếp.

---

**Bạn chốt giúp mình 3 điểm:**
1. Dùng monorepo cho pilot.
2. Story có cả FE và BE dùng một nhánh, một PR, chia thành Sub-task, BE làm trước. Story quá lớn thì tách theo chiều dọc.
3. Ngưỡng khoảng 5 file code áp cho từng Sub-task, không tính file test.

Chốt xong, mình sửa spec theo danh sách trên rồi chuyển sang bước plan cho `sdlc-contract`.

Lượt này đã được ghi tiếp vào `ai-orchestrator/misc/brainstorm-discussion.md`, mở đầu Phiên 3. Mình cũng sửa câu trả lời cuối của Phiên 2 · Lượt 3 trong file đó cho khớp nguyên văn với tin nhắn bạn đã nhận, vì bản ghi trước lệch vài chỗ chữ.

Nguồn: agent-skills 0.6.13, skill `planning-and-task-breakdown` (các mục Slice Vertically, Task Sizing Guidelines, Parallelization Opportunities).

---

# Phiên 3 · Lượt 2 — 2026-10-26 16:13

**Bạn:**

```markdown
Chốt:
1. ok
2. ok
3. ok

Thảo luận thêm:
1. UPdate lại việc Release, release theo quyết định của tôi, không nhất thiết cố định 1 ngày thứ 5 trong tuần, miễn feature pass và done thì release hoặc do tôi quyết định thời điểm.

2. Ghi lại ý này trong memory nhé:
"Hợp đồng ở Cấp 1 chỉ cần hỗ trợ một PR cho mỗi item. Nếu sau này có dự án bắt buộc dùng hai repo, mình sẽ sửa guard thành "mọi PR của item" vào lúc đó."
```

**Claude:**

Đã ghi nhận 3 điểm: monorepo cho pilot; Story có cả FE và BE dùng một nhánh, một PR, chia Sub-task, BE làm trước; ngưỡng khoảng 5 file code cho từng Sub-task. Mình đã sửa `SPEC.md` và `SPEC-sdlc-contract.md` theo danh sách ở lượt trước, cùng phần release dưới đây.

## 1. Release theo quyết định của bạn

Đã bỏ lịch cắt release cố định vào thứ 5. Bạn quyết định lúc cắt release lên Staging (cổng ④) và lúc lên Production (cổng ⑤), ví dụ khi mọi Story của một Epic đã Done, hoặc khi khách cần sớm một tính năng. Bản tổng hợp hằng ngày của `pm` sẽ liệt kê các item đã Done nhưng chưa release, và item nào đã chờ lâu nhất, để bạn có số liệu mà quyết.

Bỏ lịch cố định làm lộ ra bốn chỗ cần quy tắc mới. Mình đã viết chúng vào spec và để ở mục 11 chờ bạn duyệt:

1. **Nhánh release tách từ điểm cắt, không từ commit mới nhất của `develop`.** Agent merge vào `develop` liên tục, nên lúc bạn muốn release thường vẫn còn item đã merge mà đang QA. Nếu giữ điều kiện cũ "mọi item đã merge vào `develop` đều Done", có khi phải chờ rất lâu mới có lúc đạt. Điểm cắt là commit mới nhất trên `develop` mà mọi item có commit tính tới đó đều đã Done, và không item nào trong số đó còn commit nằm sau. Ví dụ:

   ```
   develop: ── A ──── B ──── C ──── D
               │      │      │      └ PROJ-18: Done
               │      │      └ PROJ-17: đang QA
               │      └ PROJ-15: Done
               └ PROJ-12: Done
   Điểm cắt là B: bản này gồm PROJ-12 và PROJ-15. PROJ-17 và PROJ-18 vào bản kế tiếp.
   ```

   PROJ-18 đã Done nhưng nằm sau PROJ-17, nên phải chờ bản sau. `release-workflow` tính điểm cắt và đưa bạn danh sách item để duyệt ở cổng ④. Git cho tách nhánh từ bất kỳ commit nào, nên cách này không cần thêm công cụ.
2. **Mỗi lúc chỉ có một nhánh `release/*` mở.** Chỉ có một Staging, nên hai nhánh release mở cùng lúc sẽ ghi đè bản deploy của nhau, và bug sửa trên bản cũ phải merge thêm sang bản mới. Muốn cắt bản mới thì bản đang ở Staging phải lên Production xong trước.
3. **Luôn có sẵn một Fix Version "bản kế tiếp".** Bug Medium/Low được gắn Fix Version "bản kế tiếp" ngay khi triage (bảng định tuyến ở mục 2.6), nên bản đó phải có sẵn trước khi bạn quyết định release. Khi cắt, Fix Version này được gán cho các item trong điểm cắt, còn item nằm sau điểm cắt chuyển sang một bản kế tiếp mới.
4. **Demo theo từng bản release, retro vẫn cố định thứ 6.** Demo cho khách gắn với bản trên Staging nên đi theo release. Retro thì nên giữ lịch tuần: release không đều thì retro theo release cũng không đều, mà số liệu như cycle time hay throughput phải đọc theo tuần mới so sánh được với nhau.

Mình cũng thêm một số liệu cho retro: **thời gian chờ release**, từ lúc item Done tới lúc lên Production. Release do bạn quyết, nên số này cho thấy việc đã xong phải chờ bao lâu mới tới tay người dùng.

SemVer giữ nguyên: mỗi bản release tăng minor, hotfix tăng patch.

## 2. Ghi vào memory

Đã lưu thành một memory riêng: hợp đồng ở Cấp 1 chỉ cần hỗ trợ một PR cho mỗi item; nếu sau này có dự án bắt buộc dùng hai repo thì sửa guard thành "mọi PR của item" vào lúc đó.

Khi ghi, mình nhận ra câu đó cần nói chính xác hơn. Theo mục 2.6, item bị `qa-fail` được sửa trên nhánh mới và mở PR mới, vẫn mang mã item cũ, nên một item có thể có nhiều PR, chỉ là lần lượt. Mình đã ghi vào memory và spec ý chính xác: **tại mỗi thời điểm, một item có tối đa một PR đang mở**, và guard xét PR mới nhất của item. Quy ước "một nhánh, một PR" ở mục 2.3 cũng đã được viết lại cho khớp. Ý này là điểm 1 trong mục 11.

## Những gì đã sửa

| File, mục | Thay đổi |
|---|---|
| `SPEC.md` | Thêm quyết định "Cấu trúc repo" và "Release"; sửa dòng "Quy trình quản lý"; bỏ câu hỏi mở về cấu trúc repo |
| `SPEC-sdlc-contract.md` 2.2 | Đầu ra của `plan` có hợp đồng API; `release-cut` chạy khi bạn yêu cầu và tách nhánh từ điểm cắt |
| 2.3 | Bốn quy ước về nhánh, PR, Sub-task, tách Story theo chiều dọc, và ngoại lệ cho phần nền dùng chung |
| 2.4 | Transition `submit` thêm điều kiện mọi Sub-task đã `done` |
| 2.5 | DoR của Story: khoảng 5 file code cho từng Sub-task, không tính file test; có hợp đồng API nếu Story có cả FE và BE |
| 2.6 | SemVer: mỗi bản release tăng minor |
| 2.7 | Đổi tên thành "Nhịp làm việc, release, WIP và số liệu"; bỏ lịch thứ 5; thêm điểm cắt, một nhánh release, Fix Version "bản kế tiếp"; WIP tính theo Sub-task; thêm số liệu thời gian chờ release |
| 11 | Mục mới: 6 câu hỏi mở |

---

**Bạn duyệt giúp mình 6 điểm ở mục 11 của `SPEC-sdlc-contract.md`:**
1. Tại mỗi thời điểm, một item có tối đa một PR đang mở; PR sửa sau `qa-fail` vẫn mang mã item.
2. Nhánh release tách từ điểm cắt.
3. Mỗi lúc chỉ có một nhánh `release/*` mở.
4. Luôn có sẵn Fix Version "bản kế tiếp".
5. Demo theo từng bản release, retro cố định thứ 6.
6. Thêm số liệu thời gian chờ release.

Duyệt xong, mình chuyển sang bước plan cho `sdlc-contract`.

Lượt này đã được ghi tiếp vào `ai-orchestrator/misc/brainstorm-discussion.md`.

---

# Phiên 3 · Lượt 3 — 2026-10-26 16:36

**Bạn:**

```markdown
OK với 6 điểm
```

**Claude:**

Mình đã ghi nhận bạn duyệt cả 6 điểm. Mục 11 của `SPEC-sdlc-contract.md` đổi thành "Quyết định bổ sung đợt 2", và spec giờ đã được duyệt toàn bộ.

Mình đã lập plan cho module `sdlc-contract` theo skill `planning-and-task-breakdown` của agent-skills, gồm hai file:
- `ai-orchestrator/tasks/plan.md`: quyết định kiến trúc, thứ tự làm, rủi ro và câu hỏi mở.
- `ai-orchestrator/tasks/todo.md`: 14 task. Mỗi task có tiêu chí chấp nhận, cách kiểm chứng, phụ thuộc và danh sách file dự kiến.

Hai file đặt ở `tasks/` vì lệnh `/agent-skills:build` đọc đúng chỗ này. Làm xong module, chúng được chuyển vào `tasks/archive/sdlc-contract/` để nhường chỗ cho module sau.

## Cách chia task

Mỗi task là một lát dọc: một phần của hợp đồng được làm trọn từ YAML, schema, quy tắc kiểm tra và test, cho tới phần tương ứng trong `docs/sdlc.md`. Sau mỗi task, `validate`, `test` và `render:check` đều phải xanh.

| Giai đoạn | Task | Kết thúc bằng |
|---|---|---|
| 1. Khung và workflow | T1 khung dự án và `roles.yaml` · T2 `workflows.yaml` · T3 quy tắc "chỉ bạn chuyển sang Done" và "quay lại phải có bằng chứng" · T4 hàm chuyển trạng thái và kịch bản · T5 sinh `docs/sdlc.md` có sơ đồ Mermaid | Checkpoint 1: bạn soát sơ đồ ba workflow |
| 2. Phần còn lại của hợp đồng | T6 `work-items.yaml` · T7 `routing.yaml` và `routeBug` · T8 `policies.yaml` và danh mục artifact · T9 `stages.yaml` | Checkpoint 2: bạn đọc toàn bộ `docs/sdlc.md`, đối chiếu spec mục 2 |
| 3. Template | T10–T13: 12 template, và quy tắc "artifact nào cũng có template" | Checkpoint 3: bạn xem nhanh các template |
| 4. Hoàn thiện | T14: CI cho repo kit và README | Checkpoint cuối: 6 tiêu chí ở spec mục 9 |

Workflow được làm trước và có sơ đồ ngay từ T5, vì đây là phần dễ chép sai nhất và mọi module khác đều dựa vào nó. Bạn soát sơ đồ ở checkpoint 1 thì lỗi được sửa trước khi các phần khác xây lên trên.

## Quyết định kiến trúc đáng chú ý

1. **Tách đọc file khỏi kiểm tra.** Ngoài 4 hàm ở spec mục 6, `lib/contract.mjs` có thêm hàm thuần `validateContract(obj)`, để test kiểm tra quy tắc trên object trong bộ nhớ mà không phải ghi file.
2. **Fixture âm là bản vá nhỏ áp lên hợp đồng thật.** Bản vá chọn phần tử theo `id`, ví dụ `transitions[id=accept].actors`. Nhờ vậy fixture không phải chép lại cả 6 file, và không vỡ khi thứ tự trong YAML thay đổi.
3. **Transition quay lại được xác định theo thứ tự khai báo state.** Dựa vào đó, quy tắc 5 biết transition nào phải có bằng chứng và phải tăng Rework count.
4. **Template `spec.md` và `plan.md` theo đúng cấu trúc của skill agent-skills tương ứng**, để skill dùng được trực tiếp.
5. **Chống lỗi xuống dòng trên Windows.** `.gitattributes` đặt LF, và `render:check` so sau khi chuẩn hóa xuống dòng.

Mình thấy bạn vừa thêm `ai-orchestrator/CLAUDE.md` với quy ước commit `type(scope): subject`, không body, không dòng `Co-Authored-By`. Quy ước này đã được ghi vào phần quy ước chung của `todo.md`, và mọi commit sau này sẽ theo nó.

## 3 câu hỏi mở

1. **Commit đầu tiên gồm những gì?** Repo `ai-orchestrator` chưa có commit nào, mà lệnh build cần cây làm việc sạch trước khi chạy. Mình đề xuất commit `CLAUDE.md`, `SPEC.md`, `SPEC-sdlc-contract.md`, `tasks/` và `misc/` (lịch sử brainstorm, `chat.md`, ảnh; tổng 4,8 MB). Riêng `todo.md` ở gốc là ghi chú riêng của bạn: bạn muốn commit luôn, hay đưa vào `.gitignore`?
2. **Có tạo repo GitHub cho `ai-orchestrator` không?** Spec mục 8 yêu cầu mọi thay đổi hợp đồng đi qua PR, và T14 cần GitHub Actions. Nếu chưa tạo, mình vẫn commit ở local theo từng task; file CI chỉ chạy khi có remote.
3. **Quy trình nhánh cho chính repo kit.** GitFlow dành cho dự án sản phẩm. Repo kit không deploy lên môi trường nào, nên mình đề xuất dùng `main` cộng một nhánh ngắn cho mỗi task, merge vào `main` khi task xong (qua PR nếu đã có remote).

---

**Bạn duyệt giúp mình plan và trả lời 3 câu hỏi trên.** Sau khi bạn duyệt, mình làm commit đầu tiên rồi bắt đầu T1 bằng `/agent-skills:build`. Mỗi lần làm một task: viết test đỏ trước, commit riêng, rồi dừng lại.

Lượt này đã được ghi tiếp vào `ai-orchestrator/misc/brainstorm-discussion.md`.

---

# Phiên 3 · Lượt 4 — 2026-10-26 17:09

**Bạn:**

```markdown
OK với plan.

Trả lời 3 câu:
1. commit riêng cho misc, sau đó SPEC.md, SPEC-sdlc-contract.md, sau đó tasks
2. có: https://github.com/TungPH7/ai-orchestrator-v1.git, thực hiện đổi tên 'ai-orchestrator' thành 'ai-orchestrator-v1' giúp tôi
3. OK
```

**Claude:**

Mình bắt đầu: kiểm tra trạng thái git, danh tính commit và repo GitHub bạn vừa tạo, rồi đổi tên thư mục.

Đã sửa xong. Giờ mình tạo ba commit theo đúng thứ tự bạn chọn.

Ba commit đã xong. Còn ba việc cần bạn quyết: hai file bạn chưa nhắc tới, và chuyện thư mục đang bị khóa.

Claude hỏi lại bạn 3 câu trắc nghiệm:

**1. `CLAUDE.md` (quy ước commit bạn vừa thêm) chưa được commit. Bạn muốn xử lý thế nào?** _(CLAUDE.md)_

- **Commit riêng (Recommended)**: Commit `chore(repo): add CLAUDE.md`. Quy ước commit nằm trong repo, nên agent ở mọi máy và mọi phiên đều đọc được.
- **Chỉ giữ ở local**: Thêm vào `.git/info/exclude`: không commit, không hiện trong `git status`, chỉ có tác dụng trên máy này.

→ Bạn chọn (2026-10-26 17:15): **Commit riêng (Recommended)**

**2. `todo.md` ở gốc repo là ghi chú riêng của bạn. Bạn muốn xử lý thế nào?** _(todo.md)_

- **Chỉ giữ ở local (Recommended)**: Thêm vào `.git/info/exclude`: file vẫn ở đó, không commit, không chặn lệnh build (lệnh này đòi cây làm việc sạch). Nội dung của nó đã có trong lịch sử brainstorm.
- **Commit riêng**: Commit `docs(repo): add personal notes`, file được đẩy lên GitHub cùng repo.

→ Bạn chọn (2026-10-26 17:15): **Chỉ giữ ở local (Recommended)**

**3. Không đổi tên được thư mục vì có tiến trình khác đang giữ nó (Permission denied). Thường là terminal hoặc cửa sổ VS Code đang mở trong `ai-orchestrator`. Bạn muốn làm thế nào?** _(Đổi tên)_

- **Tôi đóng rồi, thử lại**: Bạn đóng các terminal và cửa sổ đang mở trong `ai-orchestrator`, rồi chọn mục này để Claude đổi tên lại. Nếu Claude Code đang chạy trong terminal của VS Code thì đừng đóng terminal đó.
- **Tôi tự đổi tên sau**: Bạn tự đổi tên sau khi kết thúc phiên này. Claude chỉ sửa đường dẫn trong memory và nhắc lại các bước.

→ Bạn chọn (2026-10-26 17:15): **Tôi tự đổi tên sau**

Mình làm theo lựa chọn của bạn: commit `CLAUDE.md` riêng, và cho `todo.md` vào `.git/info/exclude` để nó chỉ nằm ở local.

Cây làm việc đã sạch, có 4 commit trên `main`. Giờ mình cập nhật memory: tên thư mục mới, repo GitHub, quy ước nhánh, và chuyện tài khoản `gh`.

Đoạn script bị lỗi vì dấu `\` trong đường dẫn Windows, và chưa ghi gì. Mình chuyển sang công cụ Edit.

> _Ghi chú: phần tổng kết của lượt này bị safeguard của Claude Code chặn lúc 17:17 nên chưa tới tay bạn. Phiên kế tiếp (`46e4e518-ac41-4570-8bcc-37d5a88788c5`) đã kiểm tra lại trạng thái, ghi bổ sung lượt này và gửi bản tổng kết dưới đây._

Plan đã được duyệt. 3 câu trả lời của bạn đã được ghi vào `tasks/plan.md` (mục "Câu hỏi đã trả lời") và vào bảng quyết định trong `SPEC.md`.

## Đã làm

| Việc | Kết quả |
|---|---|
| Commit | 4 commit trên `main`: `5c07ac0 docs(misc): add brainstorm history and reference material`, `3729667 docs(spec): add overview and sdlc-contract spec`, `fe64a04 docs(tasks): add sdlc-contract plan`, `c0ff893 chore(repo): add CLAUDE.md`. Message theo `CLAUDE.md`: không body, không `Co-Authored-By` |
| `todo.md` | Thêm vào `.git/info/exclude`: file vẫn ở chỗ cũ, nhưng không được commit và không hiện trong `git status` |
| Remote | `origin` đã trỏ sẵn tới `https://github.com/TungPH7/ai-orchestrator-v1.git` (bạn gắn từ trước). Chưa push |
| Tên trong tài liệu | `SPEC.md`, `SPEC-sdlc-contract.md` và `tasks/` đã dùng tên `ai-orchestrator-v1`. Lịch sử brainstorm và các file nguồn trong `misc/` giữ nguyên văn |
| Quy ước nhánh của repo kit | Ghi vào `SPEC.md` và `tasks/todo.md`: mỗi task một nhánh `task/t<N>-<slug>` tách từ `main`, merge vào `main` qua PR |
| Memory | Cập nhật đường dẫn mới, repo GitHub, quy ước nhánh, và việc `gh` đang đăng nhập bằng tài khoản khác |

## Hai việc bạn cần làm

**1. Push lên GitHub.** `gh` trên máy này đang đăng nhập bằng tài khoản `anttp212`, và tài khoản này không thấy repo `TungPH7/ai-orchestrator-v1` (có thể repo là private, hoặc chưa tạo xong). Mình không push bằng tài khoản đó. Bạn push bằng tài khoản `TungPH7`:

```
! git -C "D:/Document/1Khoahoc/4LapTrinh/AI-for-coding/ai-orchestrator" push -u origin main
```

Nếu Git Credential Manager hỏi đăng nhập, bạn chọn tài khoản `TungPH7`. Từ T1 trở đi mình cần mở PR, nên `gh` cũng phải đăng nhập bằng `TungPH7` (`! gh auth login`), hoặc bạn thêm `anttp212` làm collaborator của repo. Nếu tới lúc đó `gh` vẫn chưa có quyền, mình sẽ commit trên nhánh của task rồi dừng ở bước mở PR.

**2. Đổi tên thư mục, làm sau khi kết thúc phiên này.** Thư mục `ai-orchestrator` đang bị một tiến trình khác giữ nên mình không đổi tên được. Bạn đóng phiên này cùng các terminal và cửa sổ đang mở trong thư mục đó, rồi chạy trong PowerShell:

```powershell
Rename-Item "D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ai-orchestrator" "ai-orchestrator-v1"
```

Git không phụ thuộc vào tên thư mục, nên repo, commit và remote vẫn giữ nguyên sau khi đổi.

## Bước tiếp theo

Bước tiếp theo là T1: khung dự án, `roles.yaml` và quy tắc 1, chạy bằng `/agent-skills:build`. T1 cần `npm install` để tải `yaml` và `ajv` từ npm. Mình đề xuất bạn đổi tên thư mục, rồi mở một phiên Claude Code mới trong `ai-orchestrator-v1` và gõ `/agent-skills:build`. Phiên mới sẽ làm việc ngay trên đường dẫn mới, và memory đã ghi đủ bối cảnh để làm tiếp.

Lượt này đã được ghi tiếp vào `ai-orchestrator/misc/brainstorm-discussion.md` và commit thành `docs(misc): update brainstorm log`. Từ giờ, sau mỗi lượt brainstorm, mình sẽ commit lịch sử theo cách này để lệnh build luôn thấy cây làm việc sạch.

---

# Phiên 4 · Lượt 1 — 2026-10-27 00:50

**Bạn:**

```markdown
Xác nhận OK, tiếp tục. Trước khi làm module tiếp theo thì dừng lại hỏi xác nhận nhé
```

**Claude:**

Tiêu chí 6 đã được xác nhận. Mình đóng module `sdlc-contract` bằng một PR, rồi dừng lại hỏi bạn trước khi bắt đầu module tiếp theo. Trước khi chuyển file, mình tìm các chỗ đang link tới `tasks/plan.md` và `tasks/todo.md`, để sau khi chuyển link không bị gãy.

Có 5 chỗ cần sửa: dòng trạng thái và bảng module trong `SPEC.md`, dòng trạng thái của `SPEC-sdlc-contract.md`, và link tới spec trong hai file plan sau khi chuyển vào `tasks/archive/sdlc-contract/` (đường dẫn tương đối đổi từ `../` thành `../../../`). Mình đọc đúng các dòng đó, cùng với "Thứ tự build" trong `SPEC.md` để chuẩn bị câu hỏi về module tiếp theo.

Mình đã có đủ thông tin để sửa. Còn một điểm nữa: spec mục 4 vẫn ghi lệnh test là `node --test tests/`, lệnh mà Node 24 không chạy được (mình đã nêu ở T1). Mình sửa luôn dòng này trong PR đóng module, tách thành một commit riêng. Trước đó, mình đọc phần "Câu hỏi mở" của `SPEC.md` để chuẩn bị câu hỏi về module tiếp theo.

Giờ mình làm các bước đóng module: đánh dấu checkpoint cuối, sửa link, chuyển hai file vào `tasks/archive/sdlc-contract/`, cập nhật trạng thái trong hai file spec, và sửa dòng lệnh test.

Lúc commit mình lỡ gộp dòng sửa lệnh test vào commit "mark sdlc-contract done", trong khi đã định tách riêng. Commit chưa push, nên mình tách lại cho đúng: đưa dòng lệnh test về như cũ, commit phần trạng thái, rồi sửa lại dòng đó trong một commit riêng.

Module `sdlc-contract` đã đóng: PR #16 đã merge, CI xanh, `tasks/` đã trống để dành cho module sau. Mình cập nhật memory, kể cả yêu cầu vừa rồi của bạn là phải hỏi trước khi bắt đầu module mới.

Module **`sdlc-contract` đã hoàn thành** (PR [#16](https://github.com/TungPH7/ai-orchestrator-v1/pull/16)):
- Checkpoint cuối đã đánh dấu đủ, kèm ghi chú bạn đã xác nhận ngày 2026-10-27.
- `tasks/plan.md` và `tasks/todo.md` đã chuyển vào `tasks/archive/sdlc-contract/`, link tới spec đã sửa theo chỗ mới.
- `SPEC.md` và `SPEC-sdlc-contract.md` đã ghi trạng thái "hoàn thành", và lệnh test ở spec mục 4 đã sửa cho đúng.
- CI xanh trên PR, và mình đã kiểm mọi link tương đối trong các file vừa sửa đều mở được.

Theo yêu cầu của bạn, mình dừng ở đây để hỏi trước khi bắt đầu module tiếp theo:

Claude hỏi lại bạn 1 câu trắc nghiệm:

**1. Module `sdlc-contract` đã xong. Bắt đầu module nào tiếp theo? Cả ba module dưới đây chỉ phụ thuộc `sdlc-contract`. Module bạn chọn sẽ bắt đầu bằng bước viết spec, và mình sẽ dừng lại để bạn duyệt spec trước khi lập plan.** _(Module kế)_

- **tracker-integration (Recommended)**: Cấu hình workflow và board Jira khớp với state machine, cài Rovo MCP, quy ước gắn mã Jira vào nhánh, commit, PR. Module này dựa vào hệ thống bên ngoài và còn 2 câu hỏi mở trong SPEC.md, nên làm trước để lộ vấn đề sớm. Tới bước thử thật sẽ cần bạn đăng nhập Jira.
- **agent-roster**: Định nghĩa từng subagent: phạm vi, đầu vào và đầu ra, tool, skill, model. Không phụ thuộc hệ thống bên ngoài, nên làm nhanh và sửa lại dễ.
- **quality-gates**: Pre-commit hook, pipeline CI cho dự án, branch protection, script kiểm đủ artifact. Khó kiểm thật khi chưa có dự án pilot để chạy thử.

→ Bạn chọn (khoảng 2026-10-27 00:54): **tracker-integration (Recommended)**

Bạn chọn `tracker-integration`. Theo skill `spec-driven-development`, bước đầu tiên là nêu rõ các giả định và hỏi những điểm chưa rõ, trước khi viết spec. Module này dựa nhiều vào Jira Cloud, Rovo MCP và app GitHub for Jira. Mình không muốn đưa ra giả định sai về khả năng của các hệ thống đó, nên trước hết mình đọc lại các phần liên quan trong repo, rồi tra tài liệu chính thức.

Repo đã ghi sẵn vài điểm: Rovo MCP đăng nhập OAuth và dùng quyền của tài khoản bạn, app GitHub for Atlassian lo phần Deployments, và còn hai câu hỏi mở. Mình tra thêm tài liệu chính thức cho những điểm sẽ quyết định thiết kế.

Một phần kết quả tìm kiếm còn mâu thuẫn. Riêng cách app GitHub for Jira nhận diện môi trường liên quan trực tiếp tới câu hỏi mở số 2 trong `SPEC.md`, nên mình đọc thẳng tài liệu trong repo chính thức `atlassian/github-for-jira`.

File này không còn trên nhánh chính, nên mình lấy đúng bản ở commit mà kết quả tìm kiếm đã dẫn, và tìm thêm chỗ code xử lý ánh xạ môi trường.

Mình đã đủ thông tin cho bước nêu giả định. Lượt này có chọn module kế tiếp và mở đầu phần thảo luận thiết kế, nên theo quy ước mình ghi nó vào lịch sử brainstorm và commit trước, rồi mới gửi câu trả lời. Đầu tiên mình lấy mốc thời gian để ghi.

Mình tạo nhánh cho phần spec của module mới, rồi ghi lượt này vào lịch sử: thêm dòng Phiên 4 vào bảng ở đầu file, và nối nội dung lượt vào cuối file.

Lệnh ghi thất bại do shell báo lỗi cú pháp ở heredoc. Việc thêm dòng vào bảng (bằng Edit) đã xong, còn nội dung lượt thì chưa ghi gì. Mình ghi nội dung đó ra một file tạm bằng Write, để không phải đi qua shell, rồi nối file tạm vào cuối lịch sử.

Mình bắt đầu module **`tracker-integration`** bằng bước viết spec. Theo skill `spec-driven-development`, trước khi viết spec mình nêu phạm vi, các giả định và những điểm cần bạn quyết. Vài thông tin về Jira mình chưa kiểm được từ nguồn chính thức; chỗ nào như vậy được đánh dấu [Unverified] hoặc [Inference].

## Phạm vi module

Theo `SPEC.md` và những phần `sdlc-contract` để lại cho module này:

| Trong phạm vi | Thuộc module khác |
|---|---|
| Cấu hình Jira khớp hợp đồng: 5 loại item, 3 workflow, các trường (Found in, Severity, Rework count…), Kanban board có giới hạn WIP từng cột, Fix Version "bản kế tiếp" | Prompt, tool và model của từng agent: `agent-roster` |
| Cài Rovo MCP cho Claude Code, và chặn agent tự chuyển item sang Done hoặc qua cổng duyệt | Pipeline CI, pre-commit, branch protection: `quality-gates` |
| Quy ước gắn mã Jira vào tên nhánh, commit, PR | Các lệnh điều phối từ spec tới merge: `dev-workflow` |
| Nối GitHub với Jira: nhánh, commit, PR, build và deploy hiện trên item; panel Deployments nhận đúng 3 môi trường | Pipeline deploy: `release-workflow` |
| Các transition do vai trò `automation` thực hiện (`refine`, `submit`, `request-changes` khi CI đỏ, `deploy-to-qa`) và việc đếm Rework count | |

## Giả định (bạn sửa nếu sai)

1. **Rovo MCP chuyển được trạng thái item:** danh sách tool chính thức có `getTransitionsForJiraIssue` và `transitionJiraIssue`. Bộ tool mới có thể đổi tên, nên mình sẽ kiểm tên thật khi kết nối.
2. **[Inference] Mọi thao tác qua Rovo MCP mang tên tài khoản đã đăng nhập OAuth.** Phiên 1 đã ghi là agent dùng đúng quyền của tài khoản bạn; suy ra nếu agent dùng tài khoản của bạn thì Jira không phân biệt được bạn với agent (câu hỏi 3).
3. **Panel Deployments:** app GitHub for Jira đoán loại môi trường từ tên (tên chứa `prod` là production…), và cho khai báo rõ bằng file `.jira/config.yml` trên nhánh mặc định; khi đã có file này thì app thôi tự đoán. App chỉ nghe sự kiện `deployment_status`, nên pipeline deploy phải tạo deployment kèm status. Mình đề xuất đặt tên environment trên GitHub là `development`, `staging`, `production` và khai báo đủ trong `.jira/config.yml`. Theo một bài KB của Atlassian, lần đầu thêm file này phải ngắt rồi nối lại kết nối GitHub. Đây là câu trả lời cho câu hỏi mở thứ hai trong `SPEC.md`.
4. **Deploy được gắn vào item nhờ mã Jira trong commit message** trên nhánh được deploy, nên mọi commit của dự án đều cần mã Jira, không chỉ tên nhánh và PR. Đề xuất: nhánh `feature/DEMO-12-login` (như đã ghi trong `SPEC.md`), commit `feat(auth): add email login (DEMO-12)`, tiêu đề PR theo template `pull-request.md`.
5. **Jira Automation có sẵn trigger từ GitHub:** tạo nhánh, tạo commit, tạo, từ chối hoặc merge PR; ngoài ra có nhóm trigger build và deploy mà mình chưa kiểm tên cụ thể.
6. **[Unverified] Giới hạn lượt chạy Jira Automation mỗi tháng:** nguồn bên thứ ba ghi gói Free khoảng 100 lượt, Standard khoảng 1.700 lượt. Mình chưa đối chiếu được với trang chính thức của Atlassian.

## Câu hỏi cần bạn quyết

1. **Site Jira của bạn đang ở gói nào:** Free, Standard hay Premium? Bạn xem ở Administration → Billing. Gói quyết định giới hạn Automation và tính năng phân quyền.
2. **Loại space.** Mình đề xuất **company-managed**: có condition và validator cho từng transition (để chặn đúng "chỉ bạn chuyển sang Done" và các cổng), một workflow scheme dùng chung cho các dự án sau (`project-scaffold`), và có đủ Affects Version, Fix Version, Resolution. Team-managed dựng nhanh hơn nhưng [Unverified] thiếu một phần các tính năng trên.
3. **Agent đăng nhập Jira bằng tài khoản nào?** Mình đề xuất **một tài khoản bot riêng cho agent**: Jira chặn được bot ở các transition chỉ dành cho bạn, và lịch sử item tách được việc của bạn với việc của agent. Đổi lại tốn một chỗ user trên Jira, và bạn đăng nhập MCP bằng tài khoản bot một lần. Nếu dùng chung tài khoản của bạn, quy tắc "chỉ bạn chuyển sang Done" chỉ còn được giữ bằng hook trong Claude Code. Cách nào thì mình cũng đặt hook gọi `checkTransition` của hợp đồng trước mỗi lần agent dùng tool chuyển trạng thái.
4. **Ai thực hiện các transition của vai trò `automation`?** Mình đề xuất **GitHub Actions gọi Jira REST API** bằng API token của bot: logic nằm trong repo, đọc thẳng guard của hợp đồng, test được, và không tốn lượt Automation. Cách còn lại là rule Jira Automation với trigger từ GitHub: không cần code, nhưng rule nằm trong Jira, khó test và bị giới hạn lượt chạy.
5. **Cách dựng cấu hình Jira.** Mình đề xuất ở Cấp 1 **bạn dựng tay theo checklist sinh từ hợp đồng**, kèm **một script chỉ đọc** so cấu hình Jira thật với hợp đồng và báo chỗ lệch. Việc dựng tự động bằng REST API để sau, cho `project-scaffold`, vì mỗi dự án chỉ dựng một lần, còn API sửa workflow thì phức tạp.

Bạn trả lời 5 câu trên (và sửa giả định nào sai) là mình viết `SPEC-tracker-integration.md`, rồi dừng lại để bạn duyệt trước khi lập plan.

Nguồn:
- [Atlassian Rovo MCP Server: Supported tools](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/supported-tools/)
- [Atlassian: Link GitHub workflows and deployments to Jira work items](https://support.atlassian.com/jira-cloud-administration/docs/link-github-workflows-and-deployments-to-jira-issues/)
- [atlassian/github-for-jira: Showing GitHub deployments in Jira](https://github.com/atlassian/github-for-jira/blob/332b5ae08042c631fdce6465386a6c338e819d99/docs/deployments.md)
- [Atlassian KB: custom environment names show "undefined environment"](https://support.atlassian.com/jira/kb/jira-github-integration-custom-environment-names-does-not-show-up-in-releases-panel-and-instead-show-undefined-environment/)
- [Atlassian Community: New automation triggers across Jira Cloud, Bitbucket, GitLab & GitHub](https://community.atlassian.com/t5/Automation-articles/New-automation-triggers-across-Jira-Cloud-Bitbucket-GitLab-amp/ba-p/1337351)
- [eesel.ai: A comprehensive Jira pricing guide for 2026](https://www.eesel.ai/blog/jira-pricing-guide) (nguồn bên thứ ba, cho con số ở giả định 6)

---

# Phiên 5 · Lượt 1 — 2026-10-27 khoảng 09:46

**Bạn:**

```markdown
[Image #1] [Image #2] [Image #3]

Làm tiếp session id: 46e4e518-ac41-4570-8bcc-37d5a88788c5

1. Tôi được dùng thử gói Standard nhưng bạn cứ làm theo hướng tôi đang dùng Gói Free nhé
2. OK với company-managed. Kiểm tra xem Free plan có dùng được company-managed không?
3. Ok với đề xuất. Hướng dẫn tôi cách tạo tài khoản bot riêng cho agent
4. Ok với đề xuất
5. Ok với đề xuất
```

Ba ảnh đính kèm:

- [Image #1](images/phien-5-luot-1-anh-1.png): trang Billing của Jira, gói Standard dùng thử 30 ngày, hết hạn ngày 22/11/2026.
- [Image #2](images/phien-5-luot-1-anh-2.png): trang tổng quan thanh toán và đăng ký của tổ chức.
- [Image #3](images/phien-5-luot-1-anh-3.png): màn hình chọn gói Jira: Free (tối đa 10 user, 100 automation mỗi tháng), Standard, Premium.

**Claude:**

_Không có câu trả lời. Claude đọc lại bối cảnh và tra tài liệu của Atlassian, nhưng câu trả lời bị bộ lọc an toàn dừng giữa chừng._

---

# Phiên 5 · Lượt 2 — 2026-10-27 khoảng 10:02

Trước lượt này, bạn chạy `/model` và chọn lại Opus 5.5.

**Bạn:**

```markdown
Tiếp tục
```

**Claude:**

_Không có câu trả lời: lần này câu trả lời cũng bị bộ lọc an toàn dừng._

---

# Phiên 6 · Lượt 1 — 2026-10-27 10:03

Trước lượt này, bạn chạy `/model` và chọn Opus 5.5.

**Bạn:**

```markdown
Làm tiếp session id: 76bd80d2-8083-45f7-93a7-d7ffab2e246c
```

**Claude:**

Đang đọc lại bối cảnh phiên trước (log brainstorm, Phiên 4 · Lượt 1) để nối tiếp đúng chỗ.

Đã nắm bối cảnh: phiên trước bạn đã trả lời 5 câu hỏi cho module `tracker-integration`, nhưng câu trả lời của mình bị bộ lọc chặn giữa chừng. Mình kiểm lại các điểm về gói Free và tài khoản bot trên tài liệu chính thức, rồi viết spec.

Đã có đủ dữ kiện về service account và Rovo MCP (vài tên tool khác với giả định cũ). Giờ mình đọc lại SPEC.md và hợp đồng để viết spec cho module.

Đủ dữ kiện rồi. Mình lấy mốc thời gian cho lịch sử brainstorm và kiểm nhánh hiện tại trước khi viết spec.

Mốc thời gian đã có. Giờ mình viết `SPEC-tracker-integration.md` theo các câu trả lời của bạn và dữ kiện vừa kiểm.

Spec đã commit. Mình ghi lượt này vào lịch sử brainstorm, commit rồi push nhánh.

Mình đã viết `SPEC-tracker-integration.md` theo 5 câu trả lời của bạn, và dừng ở đây để bạn duyệt trước khi lập plan. Trước hết là hai điểm bạn hỏi.

## 1. Gói Free có dùng được company-managed không

**Có.** [Inference] Trang của Atlassian chỉ liệt kê các giới hạn sau cho gói Free: phân quyền, role và issue security; audit log; email notification; app mở rộng Jira; advanced roadmaps. Loại space không nằm trong danh sách đó, và người tạo site trên gói Free là admin nên tạo được company-managed space.

Cần lưu ý là gói Free **không có** permission scheme, project role và issue security. Nghĩa là mọi user có quyền Jira đều làm được mọi việc trong space, kể cả tài khoản bot. Vì vậy spec giữ quyền của agent bằng ba lớp: scope của API token, rule "Restrict who can move a work item" trên từng transition (theo group), và hook trong Claude Code. Tài liệu không ghi gói Free có rule Restrict hay không [Unverified], nên hook là lớp bắt buộc, còn rule Restrict là lớp thêm nếu gói Free có.

Việc đang dùng thử kéo theo một hệ quả: tính năng chỉ có ở Standard mà dựng bây giờ sẽ bị khóa chỉ đọc khi site về Free (2026-11-22), và dự án sau dựng trên Free không làm lại được. Spec cấm dùng các tính năng này ngay từ bây giờ. Mình cũng đề xuất chuyển site về Free trước khi dựng Jira (câu hỏi 1 bên dưới), để kiểm thật trên đúng gói bạn sẽ dùng.

Ảnh chụp màn hình của bạn cũng xác nhận giả định 6: gói Free có 100 lượt Automation mỗi tháng, Standard có 1.700. Module không dùng Jira Automation (bạn đã chọn GitHub Actions ở câu 4), nên giới hạn này không ảnh hưởng.

## 2. Cách tạo tài khoản bot cho agent

Atlassian có sẵn loại **service account** cho việc này: mỗi tổ chức được 5 cái miễn phí, không tính vào giới hạn 10 user, không có mật khẩu, và chỉ xác thực bằng API token. Spec đề xuất hai cái: `orchestratoragent` cho mọi agent trong Claude Code, và `orchestratorci` cho GitHub Actions (câu hỏi 2 bên dưới).

**Bước 1: kiểm tổ chức có service account không (làm ngay được)**

1. Mở [admin.atlassian.com](https://admin.atlassian.com), chọn tổ chức `phunghuutung12b4`.
2. Vào **Thư mục** (Directory) → **Service accounts**.
3. Thấy nút **Create a service account** là dùng được.

Tài liệu không nói rõ gói Free có service account không [Unverified]. Bạn đang dùng thử, nên thấy menu này lúc này chưa chứng minh được gì cho gói Free; nếu bạn chuyển về Free trước rồi mới kiểm thì chắc chắn hơn. Không thấy menu thì bạn báo mình: phương án dự phòng là dùng tài khoản Atlassian thường với email riêng, mỗi tài khoản tốn 1 trong 10 chỗ user.

**Bước 2: tạo tài khoản**

1. Chọn **Create a service account**.
2. **Name:** `orchestratoragent` (6–30 ký tự, chỉ gồm chữ và số). **Description:** `AI agents in Claude Code via Rovo MCP`. Atlassian tự sinh email cho tài khoản, và email này không đổi được sau khi tạo.
3. **App role:** ở App chọn **Jira** (không chọn Jira Administration), ở Role chọn **User**. Các app khác để None.
4. Chọn **Create**.
5. Nếu bạn đồng ý dùng hai tài khoản, lặp lại với Name `orchestratorci`, Description `Automation role in GitHub Actions`.

**Bước 3: tạo token (để tới task kết nối, mình sẽ nhắc)**

Token chỉ hiện một lần và sống tối đa 365 ngày, nên tạo đúng lúc cần dùng. Các bước: chọn service account → **Create credentials** → **API token** → đặt tên và ngày hết hạn → lọc App là Jira rồi chọn scope → **Next** → **Create** → copy token.

| Tài khoản | Scope |
|---|---|
| `orchestratoragent` | `read:jira:agent-interface`, `write:jira:agent-interface`, `search:jira:agent-interface`, `read:jira-work` |
| `orchestratorci` | `read:jira-work`, `write:jira-work` |

Đừng dán token vào chat. Bạn lưu nó vào trình quản lý mật khẩu; tới task kết nối, mình hướng dẫn bạn đặt nó vào biến môi trường của Windows.

**Bước 4: bật API token cho Rovo MCP (cũng để tới task kết nối)**

Service account không đăng nhập OAuth được, nên Claude Code nối Rovo MCP bằng header `Authorization: Bearer <token>`. Cách này chỉ chạy được khi admin tổ chức đã bật nó. [Unverified] Theo một trả lời trên Atlassian Community, công tắc nằm ở Atlassian Administration → Rovo → Rovo MCP server → Authentication.

Các group `ao-humans`, `ao-agents`, `ao-automation` và rule Restrict nằm trong checklist dựng Jira mà module sẽ sinh ra, nên bạn chưa cần tạo bây giờ.

## 3. Spec có gì

| Mục | Nội dung chính |
|---|---|
| 2.1–2.2 | Gói Free dùng được gì; ba danh tính (bạn, agent, CI); scope và hạn token; phương án dự phòng |
| 2.3 | Ánh xạ hợp đồng sang Jira trong `tracker/jira.yaml`: status, transition, group theo `actors`, field, board, WIP |
| 2.4 | Hai thay đổi hợp đồng cần bạn duyệt |
| 2.5 | Quy ước mã Jira: nhánh `feature/DEMO-12-...`, `bugfix/...`, `hotfix/...`; commit `type(scope): subject (DEMO-12)` |
| 2.6 | `.mcp.json` lấy token từ biến môi trường; hook `jira-guard` kiểm vai trò và guard trước mỗi lần agent chuyển trạng thái |
| 2.7–2.8 | `jira-sync` trên GitHub Actions đối soát item theo sự kiện PR, CI, deploy; bảng nguồn dữ kiện cho từng guard |
| 2.9 | `.jira/config.yml` cho panel Deployments, trả lời câu hỏi mở thứ hai của `SPEC.md` |
| 2.10 | Checklist dựng tay sinh từ hợp đồng; `jira:check` chỉ đọc và báo chỗ lệch |

Ba điểm mình sửa so với Phiên 4:

- Tool liệt kê transition của Rovo MCP tên là `listJiraIssueTransitions`, không phải `getTransitionsForJiraIssue`.
- Token dùng cho Rovo MCP không gắn với site nào, nên agent phải truyền cloud id. Mình đã lấy cloud id của site và ghi vào spec.
- Rework count được đếm từ lịch sử chuyển trạng thái, không lưu thành trường số.

Spec cũng nêu một rủi ro cho `quality-gates`: GitHub không cho tác giả PR approve PR của chính mình. Nếu agent mở PR bằng tài khoản `TungPH7` thì bạn không approve được, và guard `merge-approved` không bao giờ thỏa. Agent cần mở PR bằng một danh tính khác, như GitHub App hoặc tài khoản máy; việc này chốt ở `quality-gates`.

## 4. Câu hỏi cần bạn quyết (mục 10 của spec)

1. **Chuyển site về Free ngay** trước khi dựng Jira (mình đề xuất), hay giữ bản dùng thử tới 2026-11-22? Giữ dùng thử thì phần kiểm thật trên gói Free phải đợi tới 2026-11-22.
2. **Hai service account** (mình đề xuất), hay một tài khoản chung cho agent và CI?
3. **Nơi kiểm thật:** dùng space `DEMO` của dự án pilot, cùng một repo private mới `TungPH7/ao-pilot` làm sandbox, sau này thành repo của Pilot 1. Bạn đồng ý không?
4. **Hai thay đổi hợp đồng** ở mục 2.4: thêm trường Agent, và cách đếm rework.

Spec đã được commit trên nhánh `task/spec-tracker-integration` và push lên GitHub. Lượt này cũng đã được ghi vào lịch sử brainstorm, kèm 3 ảnh chụp màn hình của bạn ở `misc/images/`. Bạn duyệt spec (hoặc chỉ chỗ chưa đúng) và trả lời 4 câu trên, rồi mình lập plan.

Nguồn:

- [Atlassian: Understand service accounts](https://support.atlassian.com/user-management/docs/understand-service-accounts/)
- [Atlassian KB: Configuring Jira connector credentials using a Jira Cloud API service account](https://support.atlassian.com/jira-align/kb/configuring-jira-connector-credentials-using-jira-cloud-api-service-account/)
- [Atlassian Rovo MCP Server: Configuring authentication via API token](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/configuring-authentication-via-api-token/)
- [Atlassian Rovo MCP Server: Supported tools](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/supported-tools/)
- [Atlassian: Permissions and issue-level security in Free plans](https://support.atlassian.com/jira-cloud-administration/docs/permissions-and-issue-level-security-in-free-plans/)
- [Atlassian: What is the Free Jira Cloud plan?](https://support.atlassian.com/jira-cloud-administration/docs/explore-jira-cloud-plans/)
- [Atlassian: Restrict workflows based on user groups](https://support.atlassian.com/jira-cloud-administration/docs/restrict-workflows-based-on-user-groups/)
- [Atlassian Community: Unable to enable Atlassian Rovo MCP Server API Token](https://community.atlassian.com/forums/Jira-questions/Unable-to-enable-Atlassian-Rovo-MCP-Server-API-Token/qaq-p/3263746)
- [Atlassian Community: JIRA Admin Role](https://community.atlassian.com/t5/Jira-Software-questions/JIRA-Admin-Role/qaq-p/1907574)

---

# Phiên 6 · Lượt 2 — 2026-10-27 11:23

**Bạn:**

```markdown
Tôi đang tắc ở lọc App là Jira rồi chọn scope. Làm sao để chọn đúng scope như bạn nói [Image #1]
```

Ảnh đính kèm:

- [Image #1](images/phien-6-luot-2-anh-1.png): màn hình **Select token scopes** (bước "Chọn phạm vi") khi tạo token cho service account, đang lọc App: Jira, Scope type: Granular, Scope actions: Read; hiện 163 trong 526 scope, trang 61–70.

**Claude:**

Bạn đang lọc **Scope actions: Read** và **Scope type: Granular**, nên danh sách chỉ còn các scope đọc dạng chi tiết như `read:issue-meta:jira`. Scope cần cho agent thuộc hai nhóm khác: nhóm `agent-interface` dành cho Rovo MCP, và `read:jira-work` thuộc loại classic. Với bộ lọc hiện tại thì cả hai đều không hiện ra. Cách nhanh nhất là bỏ hết bộ lọc rồi tìm theo tên scope.

## Token cho `orchestratoragent` (4 scope)

1. Bấm **Đặt lại** ở cuối hàng bộ lọc.
2. Gõ `agent-interface` vào ô **Search by scope name**, rồi tick đúng 3 dòng có chữ `jira`:
   - `read:jira:agent-interface`
   - `write:jira:agent-interface`
   - `search:jira:agent-interface`

   Nếu danh sách có thêm các scope `agent-interface` của Confluence hay Rovo thì bạn bỏ qua.
3. Xóa ô tìm kiếm, gõ `jira-work`, rồi tick `read:jira-work`. Đừng tick `write:jira-work`: agent chỉ ghi vào Jira qua Rovo MCP.
4. Bấm **Tiếp theo**. Ở bước **Tạo mã token**, kiểm tra danh sách có đủ 4 scope trên rồi mới tạo. Nếu thiếu (ví dụ dấu tick bị mất khi bạn đổi từ khóa tìm kiếm), bấm **Quay lại** để chọn lại.

[Unverified] Mình không tìm được tài liệu nào mô tả màn hình này, nên không chắc 3 scope `agent-interface` nằm dưới app nào. Có thể là Jira, cũng có thể là một app riêng cho MCP: link tạo token mẫu trong hướng dẫn của Atlassian dùng `appId=mcp-v2`. Sau khi bấm **Đặt lại**, ô tìm kiếm sẽ tìm trên mọi app. Nếu gõ `agent-interface` mà không có kết quả nào, bạn dừng ở đó và gửi mình ảnh chụp màn hình, vì có thể service account không được cấp các scope này.

## Token cho `orchestratorci` (2 scope)

Cũng bấm **Đặt lại**, gõ `jira-work`, rồi tick `read:jira-work` và `write:jira-work`. Token này chỉ dùng cho `jira-sync` trên GitHub Actions, nên bạn có thể đợi tới task đó mới tạo, để không mất bớt thời hạn 365 ngày.

## Sau khi bấm Create

- Copy token ngay, vì Atlassian chỉ hiện nó một lần. Lưu vào trình quản lý mật khẩu, kèm tên service account và ngày hết hạn.
- Đừng dán token vào chat hay vào file nào trong repo. Tới task kết nối, mình hướng dẫn bạn đặt nó vào biến môi trường `ATLASSIAN_AGENT_TOKEN` của Windows.
- Bạn chỉ cần báo mình ngày hết hạn (không phải token). `tracker/jira.yaml` sẽ lưu ngày này để `jira:check` cảnh báo khi còn dưới 14 ngày.

Thêm một điểm mình phát hiện khi tra lại tài liệu: hai trang của Atlassian nói khác nhau về cách xác thực. Hướng dẫn cho developer viết rằng API key của service account dùng header `Authorization: Bearer`, và Rovo MCP dùng các scope `agent-interface`. Một bài KB của bộ phận hỗ trợ lại viết rằng Rovo MCP chỉ nhận Basic auth (email và token), với scope `read:jira-work`. Spec đang theo hướng dẫn cho developer, vì trang đó nói riêng về API key của service account. Token có đủ 4 scope ở trên thì khớp với cả hai trang về mặt scope. Task kết nối sẽ kiểm bằng `curl -I https://mcp.atlassian.com/v2/mcp`: trả về `200 OK` là chạy. Nếu Bearer bị từ chối, phương án dự phòng là Basic auth với email mà Atlassian tự sinh cho service account.

Lượt này đã được ghi vào lịch sử brainstorm, kèm ảnh chụp màn hình của bạn ở `misc/images/`. 4 câu hỏi ở mục 10 của spec vẫn chờ bạn trả lời.

Nguồn:

- [Atlassian Developer: Configuring authentication via API token (Rovo MCP)](https://developer.atlassian.com/cloud/rovo-mcp/guides/configuring-authentication-via-api-token/)
- [Atlassian Rovo MCP Server: Supported tools](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/supported-tools/)
- [Atlassian KB: Rovo MCP Server only returns Teamwork Graph tools when using API Token](https://support.atlassian.com/rovo/kb/rovo-mcp-server-only-returns-teamwork-graph-tools-when-using-api-token/)
- [Atlassian: Manage API tokens for service accounts](https://support.atlassian.com/user-management/docs/manage-api-tokens-for-service-accounts/)

---

# Phiên 6 · Lượt 3 — 2026-10-27 11:32

**Bạn:**

```markdown
[Image #2] search agent-interface không ra kết quả
```

Ảnh đính kèm:

- [Image #2](images/phien-6-luot-3-anh-1.png): màn hình **Select token scopes** sau khi bấm "Đặt lại" và tìm `agent-interface`: dòng đếm ghi "Hiển thị 16 kết quả trong số 526 mục", bảng ghi "No scopes available", phân trang ghi "Từ 61 đến 16 trong tổng số 16 kết quả".

**Claude:**

Thật ra tìm kiếm đã ra kết quả. Dòng "Hiển thị **16 kết quả** trong số 526 mục" cho thấy có 16 scope khớp với `agent-interface`. Bảng trống vì màn hình vẫn đứng ở trang 7, tức trang bạn đang xem trước khi tìm: dòng phân trang ghi "Từ **61** đến 16 trong tổng số 16 kết quả". 16 kết quả chỉ đủ cho 2 trang, nên trang 7 không có gì.

Cách sửa:

1. Đổi **Số kết quả ở mỗi trang** từ 10 sang mức lớn nhất trong danh sách, để 16 kết quả nằm gọn trong một trang.
2. Nếu bảng vẫn trống, bấm **Trước** vài lần tới khi dòng phân trang ghi "Từ 1 đến ...".
3. Tick đúng 3 scope có tên sau, bỏ qua các dòng còn lại:
   - `read:jira:agent-interface`
   - `write:jira:agent-interface`
   - `search:jira:agent-interface`

Lúc tìm `jira-work` ở bước sau, bạn cũng nhìn dòng phân trang: phải ghi "Từ 1 đến ..." thì bảng mới hiện đủ. Trước khi bấm tạo, kiểm lại ở bước **Tạo mã token** xem có đủ 4 scope không.

Kết quả này cũng trả lời điều mình chưa chắc ở lượt trước: màn hình tạo token của service account có cung cấp scope `agent-interface`, nên chưa cần phương án dự phòng.

---

# Phiên 6 · Lượt 4 — 2026-10-27 khoảng 11:35–12:00

**Bạn:**

```markdown
1. Đã chuyển site về Free
2. đã tạo 2 service acc và đã tạo token cho 2 acc
3. ok
4. 2.4 Thay đổi hợp đồng (cần bạn duyệt)
    1. OK với Thêm trường agent
    2. OK
```

**Claude:**

Mình đã ghi 4 câu trả lời vào spec và lập plan cho module. `tasks/plan.md` có tổng quan, các quyết định và rủi ro; `tasks/todo.md` có 19 task, chi tiết từng task. Trước khi duyệt plan, bạn cần biết hai chỗ mình đổi so với spec đã duyệt.

## Hai chỗ thay đổi so với spec

**1. Hook lấy vai trò agent từ `agent_type`** (spec mục 2.6 đã sửa). Khi lập plan, mình đọc lại tài liệu hook của Claude Code và thấy ba điều:

- Khi tool được gọi bên trong subagent, input của hook có trường `agent_type` chứa tên subagent. Claude Code điền trường này, agent không tự đổi được.
- Hook trong `.claude/settings.json` của dự án cũng chạy bên trong subagent. Nếu khai báo hook ở cả settings (để chặn phiên chính) lẫn frontmatter (để biết vai trò), hook sẽ chạy hai lần, và lần không có `--actor` luôn chặn.
- Hook trong frontmatter chỉ chạy sau khi bạn chấp nhận hộp thoại tin cậy thư mục, và không chạy trong phiên `claude -p`.

Vì vậy hook giờ được khai báo một lần trong settings của dự án và lấy vai trò từ `agent_type`. `agent-roster` chỉ cần đặt tên file agent trùng id vai trò (`fe-dev.md`).

**2. Agent tự gắn cờ `flag-needs-you`, `jira-sync` gắn bù** (plan, quyết định 2). Spec ghi hook tự gắn cờ khi rework chạm giới hạn. Nhưng hook chạy bằng token của agent, mà token này chỉ có quyền đọc với REST API, nên hook không ghi được lên Jira. Cách trong plan:

- Hook yêu cầu agent gắn cờ qua Rovo MCP rồi dừng.
- Hook chặn mọi transition của agent trên item có label `needs-you`. Bạn gỡ label thì agent làm tiếp được.
- `jira-sync` chạy bằng token CI có quyền ghi, nên gắn cờ bù nếu agent không gắn.

Cách này không cần thêm scope ghi cho token của agent.

## Plan gồm gì

| Giai đoạn | Task | Kết thúc bằng |
|---|---|---|
| 1. Kết nối thật và ánh xạ | T1–T6 | Kết nối Rovo MCP và REST API chạy được; bạn soát tên status, transition |
| 2. Dựng Jira và kiểm lệch | T7–T10 | Space `DEMO` dựng xong; `jira:check` không báo lệch |
| 3. Agent và hook | T11–T15 | Hook chặn và cho qua đúng, thử thật trên `DEMO` |
| 4. Automation | T16–T18 | `jira-sync` chuyển item thật trên `ao-pilot` |
| 5. Hoàn thiện | T19 | README, đóng câu hỏi mở, lưu trữ plan |

T1 làm đầu tiên vì nó kiểm giả định nền của cả module: service account nối được Rovo MCP. Nếu không nối được thì phải chuyển sang phương án dự phòng, và cách cài đặt sẽ đổi. Space `DEMO` cũng được dựng sớm (T8), để biết gói Free có rule Restrict hay không trước khi viết `jira:check` và hook.

Các task có phần bạn làm:

- **T1:** bật API token cho Rovo MCP, đặt hai biến môi trường chứa token.
- **T8:** dựng `DEMO` theo checklist, khoảng 1–2 giờ.
- **T9:** tạo một token chỉ đọc cho `jira:check`.
- **T15:** mở Claude Code trong `ao-pilot` một lần để chấp nhận hộp thoại tin cậy thư mục.

## Câu hỏi cần bạn quyết

1. **Chặng `deploy-to-qa` của tiêu chí 7.** Mọi PR trong `ao-pilot` đều do tài khoản `TungPH7` mở, mà GitHub không cho tác giả tự approve PR của mình. Vì vậy guard `merge-approved` không thỏa, và item không sang Ready for QA. Mình đề xuất T18 chỉ kiểm rằng `jira-sync` đứng yên và báo thiếu `merge-approved`, vì đó là hành vi đúng. Chặng chuyển sang Ready for QA được kiểm lại ở `quality-gates`, sau khi chốt danh tính mở PR cho agent. Cách khác là chốt danh tính đó ngay trong module này, nhưng như vậy là làm trước việc của `quality-gates`.
2. **Ngày hết hạn của hai token** (chỉ ngày, không gửi token), để ghi vào `tracker/jira.yaml` ở T3.

Spec và plan đã được commit trên nhánh `task/spec-tracker-integration` và push lên GitHub, và lượt này đã được ghi vào lịch sử brainstorm. Bạn duyệt plan cùng hai thay đổi ở trên, và trả lời 2 câu này. Sau đó mình mở PR cho spec và plan, rồi bắt đầu T1.

Nguồn: [Claude Code: Hooks reference](https://code.claude.com/docs/en/hooks)

---

# Phiên 6 · Lượt 5 — 2026-10-27 khoảng 12:10

**Bạn:**

```markdown
Câu hỏi cần bạn quyết
1. Làm như đề xuất
2. Ngày hết hạn của hai token: 27 thg 10, 2027
```

**Claude:**

Mình coi câu trả lời này là bạn duyệt plan, cùng hai thay đổi ở lượt trước, và đã làm tiếp:

- **Ghi câu trả lời.** Tiêu chí 7 của spec giờ ghi: merge và deploy khi PR chưa có approve của bạn thì item đứng yên ở In Review, và `jira-sync` báo thiếu `merge-approved`; chặng sang Ready for QA kiểm thật ở `quality-gates`. Ngày hết hạn 2027-10-27 được ghi vào plan, để T3 đưa vào `tracker/jira.yaml`.
- **Merge spec và plan** qua PR #17, sau khi CI xanh.
- **Bắt đầu T1** trên nhánh `task/t1-live-connection`. Mình đã tạo repo private `TungPH7/ao-pilot` có nhánh `main` và `develop`, clone về `D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ao-pilot`, và viết `kit/.mcp.json`. Kết quả kiểm thật sẽ ghi ở `tasks/verification.md`.

T1 đang chờ bạn làm hai việc. Mình chưa chạy được phép thử nào, vì hai biến môi trường chứa token chưa có trên máy.

## Việc 1: bật API token cho Rovo MCP

1. Mở [admin.atlassian.com](https://admin.atlassian.com), chọn tổ chức `phunghuutung12b4`.
2. Tìm mục **Rovo** → **Rovo MCP server** → **Authentication**, rồi bật xác thực bằng API token.

[Unverified] Đường dẫn này lấy từ một trả lời trên Atlassian Community, không phải tài liệu chính thức. Nếu không thấy mục này, bạn chụp màn hình trang Administration gửi mình.

## Việc 2: đặt hai biến môi trường chứa token

1. Bấm Start, gõ `biến môi trường` (hoặc `environment variables`), rồi chọn **Chỉnh sửa biến môi trường cho tài khoản của bạn** (Edit environment variables for your account).
2. Ở khung **Biến người dùng** (User variables), bấm **Mới** (New):
   - Tên: `ATLASSIAN_AGENT_TOKEN`. Giá trị: token của `orchestratoragent`.
3. Bấm **Mới** lần nữa:
   - Tên: `JIRA_CI_TOKEN`. Giá trị: token của `orchestratorci`.
4. Bấm **OK** để đóng hộp thoại.

Đừng đặt biến bằng lệnh `! setx` trong khung chat này: lệnh có dấu `!` hiện lên trong cuộc trò chuyện, kèm cả token. Bạn cũng không cần khởi động lại Claude Code. Mình đọc biến từ registry ngay bên trong lệnh, không in giá trị ra, và chạy phép thử Rovo MCP bằng một tiến trình Claude Code riêng.

Xong hai việc thì bạn nhắn "xong". Mình sẽ chạy ba phép thử của T1:

1. `curl -I` tới Rovo MCP bằng token của agent.
2. Claude Code trong `ao-pilot` gọi tool Jira bằng `orchestratoragent`.
3. Token CI gọi `GET /rest/api/3/myself`.

---

# Phiên 6 · Lượt 6 — 2026-10-27 khoảng 12:30

Trước lượt này, bạn chạy `/context`.

**Bạn:**

```markdown
[Image #4]
Việc 1: Image #4, tôi không thấy chỗ bật xác thực
Việc 2: tôi đang làm
```

Ảnh đính kèm:

- [Image #4](images/phien-6-luot-6-anh-1.png): trang **Rovo settings** trong Atlassian Administration (AI and Rovo → Rovo settings), chỉ có các tab Beta features, Web access, Search bookmarks.

**Claude:**

Đường dẫn mình đưa ở lượt trước sai. Nó lấy từ một trả lời trên Atlassian Community, và menu đó không còn tồn tại. Theo trang hỗ trợ chính thức của Atlassian, công tắc nằm ở mục **Connectors**, ngay trong menu bên trái của ảnh bạn gửi:

1. Ở menu bên trái của Atlassian Administration, chọn **Connectors**.
2. Chọn **Atlassian MCP server**.
3. Ở mục **Authentication**, bật **API token**.

Nếu trong Connectors không có **Atlassian MCP server**, hoặc mục Authentication không có công tắc API token, bạn chụp màn hình gửi mình.

Mình đã sửa đường dẫn này trong spec mục 2.6 và trong task T1. Bạn làm xong cả hai việc thì nhắn "xong", mình chạy ba phép thử của T1.

Nguồn: [Atlassian: Control Atlassian Rovo MCP server settings](https://support.atlassian.com/security-and-access-policies/docs/control-atlassian-rovo-mcp-server-settings/)

---

# Phiên 6 · Lượt 7 — 2026-10-27 khoảng 12:40

**Bạn:**

```markdown
Tôi làm xong 2 việc rồi nhé, bạn làm tiếp đi
```

_Kèm tin nhắn này, extension Claude Code trong VS Code tự gửi dòng đang được bôi đen trong một file chưa lưu. Dòng đó là token của `orchestratorci`, nên không được chép vào đây._

**Claude:**

T1 xong, cả ba phép thử đều đạt. Nhưng trước hết có một việc cần bạn làm ngay.

## Token của `orchestratorci` đã lọt vào cuộc trò chuyện

Lúc bạn gửi tin nhắn, file `Untitled-1` trong VS Code đang có một dòng chứa token được bôi đen. Extension Claude Code tự gửi phần bôi đen kèm theo tin nhắn, nên token đó giờ nằm trong lịch sử của phiên này: lịch sử được lưu trên máy bạn và đã gửi tới Anthropic. Mình đối chiếu 8 ký tự cuối với hai biến môi trường thì thấy đó là token của `orchestratorci`, không phải token của agent. Mình không chép token vào file nào, kể cả lịch sử brainstorm.

Bạn làm giúp mình các bước sau:

1. Vào admin.atlassian.com → **Directory** → **Service accounts** → `orchestratorci`, rồi thu hồi (revoke) token hiện tại.
2. Tạo token mới với đúng hai scope `read:jira-work` và `write:jira-work`, hết hạn ngày 2027-10-27.
3. Thay giá trị biến `JIRA_CI_TOKEN` bằng token mới, qua hộp thoại biến môi trường như lần trước.
4. Xóa các dòng chứa token trong `Untitled-1`, rồi đóng file mà không lưu. Đừng để token trong editor, vì cứ bôi đen là token đi theo tin nhắn.

## Kết quả T1

| Phép thử | Kết quả |
|---|---|
| Rovo MCP nhận token của agent qua `Bearer` | Đạt: `initialize` trả 200, `tools/list` trả 21 tool |
| Claude Code trong `ao-pilot` gọi tool Jira bằng `kit/.mcp.json` | Đạt: đọc được item của space `SCRUM` có sẵn, bằng account của service account |
| Token CI gọi REST API qua `api.atlassian.com` | Đạt: đọc được danh sách space và thông tin site |

Không cần đến Basic auth hay phương án dự phòng.

## Phát hiện làm đổi spec

- **Danh sách tool thật khác trang tài liệu.** Server có sẵn 6 tool Jira: `getJiraIssue`, `searchJiraIssuesUsingJql`, `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addOrEditJiraIssueComment`. Các thao tác khác, như liệt kê transition, được gọi qua tool chung `executeRead`.
- **Có đường vòng qua hook.** Hai tool chung `executeWrite` và `executeDestructive` chạy được mọi thao tác ghi hoặc xóa theo tên. Agent có thể dùng chúng để chuyển trạng thái mà không qua `jira-guard`. Spec mục 2.6 giờ ghi hook chặn hai tool này với mọi agent. Agent không cần chúng, vì mọi việc ghi đều đã có tool riêng.
- **Token của agent ghi được vào mọi space trên site**, kể cả space `SCRUM` ("E-commerce V1 by Tung") của bạn, vì gói Free không có permission scheme. Mình thêm vào T14: hook chặn tool ghi của agent khi item không thuộc space của dự án.
- **`transitionJiraIssue` nhận cả id lẫn tên transition**, nên `jira-guard` phải xử lý cả hai.
- **JQL phải có điều kiện giới hạn**, như `project = DEMO`, vì Jira từ chối truy vấn không giới hạn. Còn tool `search` tốn Rovo Credits, nên agent tìm item bằng JQL.
- **Hai cách lấy danh tính cần scope mình không cấp:** `/myself` cần `read:jira-user`, `atlassianUserInfo` cần `read:me`. Module không cần hai scope này, nên danh tính `orchestratorci` sẽ được kiểm qua lịch sử item ở T18.

Chi tiết ở `tasks/verification.md`. T1 nằm trong PR #18, mình merge ngay khi CI xanh.

Đổi token CI xong thì bạn nhắn mình. Mình sẽ kiểm lại token mới, rồi làm tiếp T2 đến T6 (hợp đồng, ánh xạ, quy ước mã Jira, đếm rework) cho tới Checkpoint 1. Các task này là code thuần, không cần bạn làm gì thêm.

---

# Phiên 6 · Lượt 8 — 2026-10-27 khoảng 12:55

**Bạn:**

```markdown
Tôi đã revoke token CI cũ và sửa lại token CI mới ở env
```

_Kèm tin nhắn này, extension Claude Code lại tự gửi dòng đang được bôi đen, lần này trong file ghi chú cá nhân `todo.md`. Dòng đó là token CI mới, nên không được chép vào đây._

**Claude:**

Token CI mới chạy được: `GET /project/search` trả 200. Nhưng nó cũng đã lọt vào cuộc trò chuyện, theo đúng đường lần trước.

Lúc bạn gửi tin nhắn, dòng 140 của file ghi chú `todo.md` (thư mục `ai-orchestrator`) đang được bôi đen, và dòng đó là token CI mới. Mình đã đối chiếu 8 ký tự cuối với biến `JIRA_CI_TOKEN`. File này không được Git theo dõi, nên token không lên GitHub. Nhưng phần bôi đen vẫn được gửi kèm tin nhắn.

`todo.md` còn có một dòng token nữa, nhiều khả năng là token của agent. Token đó chưa lọt vào chat, nhưng nó đang nằm dạng chữ thường trong thư mục mà mọi phiên Claude Code làm việc trên repo kit đều đọc được.

Bạn làm giúp mình:

1. Thu hồi token CI vừa tạo, tạo token thứ ba (scope `read:jira-work`, `write:jira-work`, hết hạn 2027-10-27), rồi dán thẳng từ trang Atlassian vào hộp thoại biến môi trường, không qua editor.
2. Xóa cả hai dòng token trong `todo.md` và lưu file. Token chỉ nên nằm trong trình quản lý mật khẩu và trong biến môi trường. Nếu bạn muốn, mình xóa hai dòng đó giúp bạn.
3. Trước khi gửi tin nhắn cho mình, kiểm tra VS Code không bôi đen dòng nào chứa thông tin nhạy cảm.

Việc đổi token không chặn T2 đến T6, vì các task đó chỉ là code. Bạn có thể nhắn "làm tiếp" ngay, rồi đổi token sau. Khi bạn báo đã đổi, mình sẽ kiểm token thứ ba.

---

# Phiên 6 · Lượt 9 — 2026-10-27 khoảng 13:00

**Bạn:**

```markdown
Tôi đã revoke token CI cũ và sửa lại token CI mới ở env
```

**Claude:**

Token CI thứ ba chạy được: `GET /project/search` trả 200, và token này không trùng với hai token đã lọt. Riêng `todo.md` vẫn còn 2 dòng trông giống token; bạn nên xóa chúng.

Sau đó mình làm từ T2 đến T6, mỗi task một PR, merge khi CI xanh:

| Task | PR | Kết quả |
|---|---|---|
| T2 | #19 | Hợp đồng có trường Agent (10 vai trò agent); Rework count tính từ lịch sử; R3 kiểm giá trị của Agent |
| T3 | #20 | `tracker/jira.yaml` có site, cloud id, ba danh tính và tên biến chứa token; quy tắc J1, J4 |
| T4 | #21 | Ánh xạ workflow, trường, board, môi trường; quy tắc J2, J3 |
| T5 | #22 | `conventions.mjs`: kiểm tên nhánh, commit, tiêu đề PR, kèm lý do khi sai |
| T6 | #23 | `rework.mjs`: đếm rework từ changelog, chạm 3 thì thêm `flag-needs-you` |

`npm run validate`, `npm test` (210 test) và `npm run render:check` đều xanh.

## Checkpoint 1: bạn soát tên sẽ thấy trên Jira

Đây là những tên bạn sẽ gõ khi dựng Jira ở T8, và sẽ thấy hằng ngày trên board. Đổi bây giờ thì rẻ; đổi sau khi đã có item thì phải sửa cả Jira lẫn `tracker/jira.yaml`.

**Workflow `AO standard`** (Story, Task, Bug)

| Nhóm | Status |
|---|---|
| To Do | New, Ready |
| In Progress | In Progress, In Review, Ready for QA, In QA |
| Done | Done, Cancelled |

Transition: Refine, Start, Submit, Request changes, Deploy to QA, Pick up, QA fail, Accept, Cancel. `Cancel` được tách thành 6 transition cùng tên trên Jira, mỗi cái đi từ một status.

**Workflow `AO epic`:** status New, Specifying, Planning (To Do), In Progress, Done, Cancelled; transition Start spec, Approve spec, Approve plan, Complete, Cancel.

**Workflow `AO sub-task`:** status To Do, In Progress, Done; transition Start, Complete.

Các lựa chọn spec chưa nói rõ, mình đã chọn trong `tracker/jira.yaml`:

- **Tên workflow có tiền tố `AO`**, scheme tên `AO workflow scheme`, để không lẫn với workflow mặc định của Jira và của space `SCRUM`.
- **Board:** cột Backlog, Ready, In Progress, In Review (tối đa 2), QA, Done. Status To Do của Sub-task nằm ở cột Ready. Cancelled không có cột nên rời khỏi board. Epic bị filter của board loại ra.
- **Resolution** dùng tên Jira có sẵn: Won't Do, Duplicate, Cannot Reproduce, thêm Not a bug. `Accept` và hai transition `Complete` đặt Resolution là Done, để JQL `resolution = Unresolved` lọc đúng item còn mở.
- **Trường Agent:** mỗi option là tên vai trò, như Frontend Developer.
- **Label của `flag-needs-you`:** `needs-you`.

Tên ổn thì bạn nhắn "qua checkpoint 1"; muốn đổi tên nào thì chỉ tên đó. Sau đó mình làm T7 (sinh checklist dựng Jira), rồi tới T8 là phần bạn dựng space `DEMO`.

---

# Phiên 6 · Lượt 10 — 2026-10-27 khoảng 13:50

**Bạn:**

```markdown
trả lời nhanh, AO nghĩa là gì nhỉ?
```

**Claude:**

AO là viết tắt của **ai-orchestrator**, tên của kit này. Tiền tố đó giúp nhận ra ngay workflow, scheme và group (`ao-humans`, `ao-agents`, `ao-automation`) nào do kit tạo, để không lẫn với cấu hình mặc định của Jira hay của space `SCRUM`. Nếu bạn muốn tên khác, ví dụ `Orchestrator standard`, thì đổi ngay bây giờ vẫn dễ.

---

# Phiên 6 · Lượt 11 — 2026-10-27 khoảng 13:55

Trước lượt này, bạn chạy `/context`.

**Bạn:**

```markdown
qua checkpoint 1
```

**Claude:**

Mình đã ghi nhận Checkpoint 1 (PR #24) và làm xong T7 (PR #25). Giờ tới T8, phần bạn dựng Jira.

## T7: checklist dựng Jira

`docs/jira-setup.md` được sinh từ hợp đồng và `tracker/jira.yaml`, gồm 12 mục theo thứ tự cần làm. Mỗi transition có một dòng riêng, ghi status đi và đến, group được phép chuyển, và Resolution mà transition đặt hoặc hỏi. CI báo lỗi nếu file này cũ hơn YAML.

## T8: bạn dựng space `DEMO`

Mở `docs/jira-setup.md` trong repo kit (trên GitHub: <https://github.com/TungPH7/ai-orchestrator-v1/blob/main/docs/jira-setup.md>) và làm từ mục 1 đến mục 10. Khoảng 1–2 giờ.

Mình đã làm sẵn mục 11 trong `ao-pilot`: ba GitHub environment, và file `.jira/config.yml` trên nhánh `main`. File có trước khi bạn cài app GitHub for Jira, nên bạn bỏ qua bước "ngắt rồi nối lại kết nối". Mục 12 (`jira:check`) để sau, vì lệnh đó viết ở T9 và T10.

Một vài lưu ý khi làm:

- **Mục 1:** tài liệu Atlassian không nói rõ service account có thêm được vào group không [Unverified]. Nếu không thêm được, bạn ghi lại rồi làm tiếp.
- **Mục 4:** đây là chỗ mình cần kết quả nhất: gói Free có rule "Restrict who can move a work item" theo group không. Có thì đặt group theo từng dòng. Không có thì bỏ phần group, chụp màn hình chỗ thêm rule gửi mình, và mình sẽ sửa spec, checklist theo.
- **Mục 8:** space dùng key `DEMO`. Space `SCRUM` hiện có thì để nguyên.
- **Mục 10:** khi cài app, chỉ cấp quyền cho repo `TungPH7/ao-pilot`.
- Chỗ nào tên menu khác checklist, hoặc Jira không cho làm, bạn chụp màn hình gửi mình. Trước khi gửi, kiểm tra trong ảnh và trong VS Code không có token.

Xong thì bạn nhắn mình, kèm hai điều: rule Restrict có trên gói Free không, và service account có vào được group không. Mình sẽ ghi vào `tasks/verification.md`, rồi tạo một Story thử để kiểm board.

---

# Phiên 6 · Lượt 12 — 2026-10-27 khoảng 14:25

**Bạn:**

```markdown
Bạn hướng dẫn '## 1. Group và service account' rõ hơn nhé, cách thêm như nào? Tôi tìm 'orchestratoragent' không thấy [Image #5]
```

Ảnh đính kèm:

- [Image #5](images/phien-6-luot-12-anh-1.png): trang group `ao-agents` trong admin.atlassian.com, tab Agents, ô tìm có chữ `orchestratoragent`, kết quả trống; group có 0 member, 0 agent, 0 app.

**Claude:**

Ô tìm trong ảnh chỉ lọc những ai **đã có** trong group, mà group đang trống, nên không ra gì. Theo tài liệu của Atlassian, service account được thêm vào group từ trang của chính service account:

**Thêm service account vào group**

1. Ở menu bên trái, chọn **Directory** → **Service accounts**.
2. Bấm vào `orchestratoragent`.
3. Bấm nút **•••** (more actions) ở góc trên bên phải → **Add to group**.
4. Chọn group `ao-agents` → xác nhận.
5. Làm lại với `orchestratorci`, chọn group `ao-automation`.

**Thêm tài khoản của bạn vào group `ao-humans`**

1. **Directory** → **Groups** → bấm `ao-humans`.
2. Bấm **Add users** (nút xanh góc trên bên phải), gõ tên hoặc email của bạn, chọn, rồi **Add**.

Kiểm lại: mở từng group, tab **Members** hoặc **Agents** phải thấy đúng tài khoản. Nếu service account nằm ở tab khác, bạn ghi lại cho mình.

Có một rủi ro cần kiểm khi dựng xong. Theo vài bài trên Atlassian Community, service account được quản lý ở cấp tổ chức, nên một số chỗ trong Jira không thấy nó là thành viên group. Nếu rule Restrict ở mục 4 cũng không thấy, agent sẽ bị chặn ở chính các transition của nó. Mình sẽ thử điều này bằng Story thử sau khi bạn dựng xong.

Mình cũng đã sửa mục 1 trong checklist để ghi rõ hai cách thêm này.

Nguồn: [Atlassian: Understand service accounts](https://support.atlassian.com/user-management/docs/understand-service-accounts/), [Atlassian Community: Using new Atlassian Service Accounts with add-on](https://community.atlassian.com/forums/Jira-questions/Using-new-Atlassian-Service-Accounts-with-add-on-Jira-Misc/qaq-p/3252792)

---

# Phiên 6 · Lượt 13 — 2026-10-27 khoảng 14:30

**Bạn:**

````markdown
Bạn viết hướng dẫn khó hiểu quá. Hướng dẫn theo bước cụ thể chứ. Ví dụ 3. Status

```
Status nằm ở Jira settings → Work items → Statuses. Jira có sẵn To Do, In Progress, Done: dùng lại nếu đúng nhóm.

[ ] New: nhóm To Do
[ ] Ready: nhóm To Do
[ ] In Progress: nhóm In Progress
[ ] In Review: nhóm In Progress
[ ] Ready for QA: nhóm In Progress
[ ] In QA: nhóm In Progress
[ ] Done: nhóm Done
[ ] Cancelled: nhóm Done
[ ] Specifying: nhóm To Do
[ ] Planning: nhóm To Do
[ ] To Do: nhóm To Do
```

Bạn ghi như vậy thì tôi không rõ phải làmgifl luôn ấy
````

Trong lúc Claude đang làm, bạn gửi thêm một ảnh:

- [Image #7](images/phien-6-luot-13-anh-1.png): trang **Jira admin settings → Work items → Statuses** của site, có nút **Add status**; danh sách status có sẵn: Open, In Progress, Reopened, Resolved, Closed, Building, Build Broken.

**Claude:**

Bạn nói đúng: checklist cũ chỉ ghi cần có gì, không ghi bấm vào đâu. Ảnh bạn gửi còn cho thấy một chỗ sai: site của bạn không có sẵn status `To Do` hay `Done`, chỉ có `In Progress`.

Mình đã viết lại `docs/jira-setup.md`. Giờ mỗi mục có phần **Cách làm** đánh số từng bước bấm, rồi mới tới danh sách `- [ ]` những thứ cần tạo. Ví dụ, mục Status giờ là:

> **Cách làm:**
>
> 1. Trên Jira, bấm biểu tượng bánh răng ⚙ ở góc trên bên phải. Trong **Jira admin settings**, ô **Switch settings** chọn **Work items**.
> 2. Menu bên trái, chọn **Statuses**.
> 3. Với từng dòng bên dưới, xem danh sách status có sẵn trước. Nếu đã có status cùng tên và cột **Category** trùng thì dùng lại, đánh dấu là xong.
> 4. Nếu chưa có: bấm **Add status**. Ô **Name** gõ tên, ô **Category** chọn như bên dưới, bấm **Add**.
>
> - [ ] Name `New`, Category `To Do`
> - [ ] Name `Ready`, Category `To Do`
> - …

Với site của bạn, `In Progress` đã có và đúng Category, nên dùng lại; 10 status còn lại cần tạo mới.

Những thay đổi khác:

- **Resolution chuyển lên trước Status và Workflow** (giờ là mục 3), vì transition `Cancel` hỏi Resolution và các transition vào Done đặt Resolution.
- **Mục Workflow** có các bước: mở trình sửa, thêm status, thêm transition (From, To, tên), thêm rule Restrict theo group, lưu. Mỗi transition là một dòng dạng `Transition Submit: From In Progress, To In Review. Restrict → Groups: ao-automation`.
- **Mục Space** gồm cả tạo space company-managed, kiểm work type, gắn workflow scheme (Switch scheme → Associate → Acknowledge), và thêm field vào màn hình.
- **Mục Board** ghi rõ: Board settings → Details để sửa filter; Columns để đổi cột, kéo status, đặt Kanban backlog và giới hạn tối đa.

Tên nút lấy từ tài liệu của Atlassian. Ba chỗ tài liệu không nêu tên nút chính xác, mình ghi "đối chiếu giao diện": nút tạo workflow mới, rule đặt Resolution là Done, và rule hiện màn hình chọn Resolution khi hủy. Tới ba chỗ đó, nếu không thấy nút giống mô tả, bạn chụp màn hình gửi mình.

File mới nằm trên nhánh `task/t8-build-demo` (chưa merge). Bạn mở bản local `docs/jira-setup.md` trong VS Code (Ctrl+Shift+V để xem dạng đẹp), hoặc trên GitHub: <https://github.com/TungPH7/ai-orchestrator-v1/blob/task/t8-build-demo/docs/jira-setup.md>.

Nguồn: [Restrict workflows based on user groups](https://support.atlassian.com/jira-cloud-administration/docs/restrict-workflows-based-on-user-groups/), [Add statuses to a Jira workflow](https://support.atlassian.com/jira-cloud-administration/docs/add-statuses-to-a-jira-workflow/), [Create workflow transitions](https://support.atlassian.com/jira-cloud-administration/docs/create-workflow-transitions/), [Configure workflow schemes](https://support.atlassian.com/jira-cloud-administration/docs/configure-workflow-schemes/), [Configure columns](https://support.atlassian.com/jira-software-cloud/docs/configure-columns/), [View a field context](https://support.atlassian.com/jira-cloud-administration/docs/view-a-field-context-and-how-its-set-up/)

---

# Phiên 6 · Lượt 14 — 2026-10-27 khoảng 14:45

**Bạn:**

```markdown
việc setup jira ở d:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ai-orchestrator\docs\jira-setup.md bạn không thể làm được thông qua MCP của jira hay sao mà cần tôi làm thủ công? Trả lời trước giúp tôi
```

**Claude:**

**Qua Rovo MCP thì không, và đó là chủ ý.** Token của agent không có scope quản trị: spec cấm điều này, để agent không tự sửa được workflow hay quyền. Các tool Jira của Rovo MCP chỉ làm việc với item (đọc, tạo, sửa, chuyển trạng thái). Tool chung `executeWrite` thì bị hook chặn, và dù không bị chặn, nó vẫn cần scope quản trị.

**Qua Jira REST API thì làm được phần lớn**, nếu dùng một token quản trị của chính tài khoản bạn:

| Phần | Tự động được? |
|---|---|
| Resolution, status, custom field (option, context), workflow, workflow scheme, tạo space, thêm field vào màn hình | Được, có API |
| Rule Restrict theo group trong workflow | Có thể; chưa kiểm API có nhận group không [Unverified] |
| Tạo group, thêm service account vào group | Có thể; chưa chắc API của Jira nhận service account [Unverified] |
| Cột board, Kanban backlog, giới hạn WIP | Không: API công khai của board chỉ cho đọc cấu hình |
| Cài app GitHub for Jira | Không: phải bấm cài và đồng ý quyền trên GitHub |

Lúc chốt spec, mình đề xuất dựng tay, và bạn đồng ý (câu 5 ở Phiên 4). Lý do: mỗi dự án chỉ dựng một lần, API tạo workflow khá phức tạp, nên phần tự động để dành cho `project-scaffold`.

Giờ bạn có hai lựa chọn:

1. **Giữ dựng tay** như checklist hiện tại: khoảng 1–2 giờ của bạn, không thêm task.
2. **Dựng tự động phần làm được** (mình đề xuất, vì bạn thấy giao diện khó dùng, và dự án nào sau này cũng cần bước này). Mình viết script `jira:setup` gọi REST API, chạy một lần cho space `DEMO`. Bạn chỉ còn làm tay cột board, app GitHub for Jira, và có thể cả group. Cái giá:
   - Thêm 1–2 task, kéo một phần việc của `project-scaffold` lên module này. Spec cần sửa mục "Ngoài phạm vi".
   - Bạn tạo một token tạm của tài khoản bạn có scope quản trị Jira, đặt hạn 1 ngày, thu hồi ngay khi chạy xong.
   - `jira:check` (T9, T10) vẫn kiểm kết quả như cũ.

Bạn chọn cách nào? Nếu chọn cách 2, mình sửa spec và plan trước, gửi bạn duyệt, rồi mới viết script.

---

# Phiên 6 · Lượt 15 — 2026-10-27 khoảng 14:50

**Bạn:**

```markdown
Giữ dựng tay.

Tôi vừa làm 3. resolution, update check list giúp tôi, có cần xóa 2 cái Done không? [Image #8]
```

Ảnh đính kèm:

- [Image #8](images/phien-6-luot-15-anh-1.png): trang **View Resolutions**: `Done`, `Done` (cả hai mô tả "GreenHopper Managed Resolution"), `Won't Do`, `Duplicate`, `Not a bug`, `Cannot Reproduce`; ô Add New Resolution báo "A resolution with that name already exists".

**Claude:**

Mục 3 xong: đủ 5 resolution cần có. **Đừng xóa cái `Done` nào.**

Hai resolution `Done` có mô tả "GreenHopper Managed Resolution" (GreenHopper là tên cũ của Jira Software) là do Jira Software tự tạo cho các workflow đơn giản, như workflow của space `SCRUM`. Theo các báo lỗi của Atlassian, nếu xóa thì Jira tạo lại `Done` ngay khi có item được kéo vào cột cuối của board. Còn theo một trả lời trên Community, transition nào đang đặt resolution đó sẽ bị lỗi. Để nguyên cả hai không ảnh hưởng gì tới thiết kế của mình: `jira:check` so theo tên, nên không coi đây là chỗ lệch. Ở mục 5, khi rule cần chọn `Done`, bạn chọn cái đứng đầu danh sách.

Về việc cập nhật checklist: `docs/jira-setup.md` được sinh tự động, nên nếu tick vào đó thì CI sẽ báo file đã cũ. Vì vậy mình ghi tiến độ vào `tasks/verification.md`, mục T8, và mục 3 đã được ghi là xong. Bạn cứ nhắn mục nào xong, mình ghi giúp. Mình cũng thêm vào mục 3 của checklist một đoạn dặn giữ hai `Done`, cho các dự án sau.

Mục 1 (group) bạn đã làm xong chưa? Tiếp theo là mục 4, Status. Site đã có `In Progress` đúng Category, nên bạn chỉ cần tạo 10 status còn lại.

Nguồn: [Atlassian KB: Deleted "Done" resolution was added back](https://support.atlassian.com/jira/kb/deleted-done-resolution-was-added-back-with-greenhopper-managed-resolution-description/), [JRACLOUD-72706: Re-appearance of the deleted resolution Done](https://jira.atlassian.com/browse/JRACLOUD-72706), [Atlassian Community: Deleting resolutions in Jira](https://community.atlassian.com/forums/Jira-questions/Deleting-resolutions-in-Jira/qaq-p/3129301)

---

# Phiên 6 · Lượt 16 — 2026-10-27 khoảng 15:00

**Bạn:**

```markdown
[Image #9]

Tôi vừa làm 4. Status, check giúp xem đúng chưa
```

Ảnh đính kèm:

- [Image #9](images/phien-6-luot-16-anh-1.png): trang **Statuses**: 7 status cũ (Open, In Progress, Reopened, Resolved, Closed, Building, Build Broken) và 10 status mới New, Ready, Specifying, Planning, To Do (To Do); In Review, Ready for QA, In QA (In Progress); Done, Cancelled (Done), đều "No associated workflows".

**Claude:**

Đúng hết. Mình đối chiếu từng dòng với mục 4:

| Status | Category cần | Trên Jira |
|---|---|---|
| New, Ready, Specifying, Planning, To Do | To Do | To Do ✓ |
| In Progress (có sẵn), In Review, Ready for QA, In QA | In Progress | In Progress ✓ |
| Done, Cancelled | Done | Done ✓ |

Tên đều đúng chính tả và chữ hoa. Cột Workflows ghi "No associated workflows" là bình thường: mục 5 sẽ gắn chúng vào workflow. Các status cũ như Open, Resolved, Closed thì để nguyên, đừng xóa, vì chúng đang thuộc workflow khác. Status mới cũng đừng xóa, dù đang có nút Delete.

Mình đã ghi mục 4 là xong trong `tasks/verification.md`.

Tiếp theo là mục 5, Workflow, phần dài nhất. Mình gợi ý làm `AO sub-task` trước: nó chỉ có 3 status và 2 transition, đủ để làm quen trình sửa workflow. Sau đó tới `AO epic`, cuối cùng là `AO standard`. Ở transition đầu tiên, bạn kiểm tra ngay rule **Restrict who can move a work item** có trong danh sách rule không, rồi báo mình, vì đây là điều mình cần biết nhất về gói Free.

Mục 1 (group) bạn đã làm xong chưa? Mục 5 cần các group để đặt rule Restrict.

---

# Phiên 6 · Lượt 17 — 2026-10-27 khoảng 15:15

**Bạn:**

```markdown
[Image #10] [Image #11]

Tôi ừa tạo 1 Transition, Restrict → Groups như bạn nói là ở chỗ nào?
```

Ảnh đính kèm:

- [Image #10](images/phien-6-luot-17-anh-1.png): trình sửa workflow `AO standard`, transition `Refine` (From New, To Ready) đang chọn; hộp **Add rule**, nhóm **Restrict transition**, phần đầu danh sách rule.
- [Image #11](images/phien-6-luot-17-anh-2.png): cùng hộp đó, kéo xuống cuối danh sách: có rule **Restrict who can move a work item**.

**Claude:**

Bạn đang đứng đúng chỗ rồi, và ảnh thứ hai trả lời luôn câu mình cần nhất: **gói Free có rule "Restrict who can move a work item"**. Đó là dòng cuối cùng trong danh sách.

Làm tiếp như sau, cho transition `Refine`:

1. Trong hộp **Add rule**, bấm vào dòng **Restrict who can move a work item** (dòng cuối, ảnh thứ hai) → bấm **Select** ở góc dưới bên phải.
2. Ô **Restrict to** chọn **Groups**.
3. Chọn hai group `ao-humans` và `ao-automation` (đúng như dòng `Refine` trong checklist) → bấm **Add**.
4. Trong khung **Transition** bên phải, nhóm **Restrict transition** giờ có một rule. Bấm vào để kiểm lại đúng hai group.

Với các transition khác, bạn làm lại từ đầu: bấm nhãn transition trên sơ đồ → nhóm **Restrict transition** → **Add restrict transition rule** → kéo xuống cuối → **Restrict who can move a work item** → **Groups** → chọn group theo dòng của transition đó.

Nếu ô chọn group không có `ao-humans`, `ao-agents`, `ao-automation`, tức là mục 1 chưa xong: bạn quay lại tạo group trước.

Hai điều nữa từ ảnh:

- Khung bên phải còn ba nhóm rule khác: **Request input**, **Validate details**, **Perform actions**. Rule "đặt Resolution là Done" (cho `Accept`) nhiều khả năng nằm ở **Perform actions**, còn rule "hỏi Resolution khi hủy" (cho `Cancel`) nằm ở **Request input**. Tới hai transition đó, bạn chụp danh sách rule của nhóm tương ứng gửi mình, mình chỉ đúng dòng.
- Nút **View warning** ở trên cùng: lúc workflow chưa xong, Jira thường cảnh báo status chưa có transition. Bấm **Update workflow** khi đã thêm xong mọi transition; nếu lúc đó vẫn còn cảnh báo, bạn chụp gửi mình.

Mình đã ghi kết quả về rule Restrict vào `tasks/verification.md`, và sửa mục 5 của checklist theo đúng tên trên giao diện: khung **Transition**, nhóm **Restrict transition**, nút **Add restrict transition rule**, hộp **Add rule**. Rule có chặn thật hay không, mình sẽ thử ở T15.

---

# Phiên 6 · Lượt 18 — 2026-10-27 khoảng 17:15

**Bạn:**

```markdown
6. Workflow scheme: d:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ai-orchestrator\docs\jira-setup.md
'chọn các work type ghi ở dòng đó' có vẻ thiếu à? [Image #12]
```

Ảnh đính kèm:

- [Image #12](images/phien-6-luot-18-anh-1.png): trang sửa `AO workflow scheme`, nút **Add Workflow** được khoanh đỏ; hộp **Assign Issue Types to "AO standard"** chỉ có ba ô: All Unassigned Issue Types (đang dùng Jira Workflow (jira)), Epic, Story; nút Back, Finish (mờ), Cancel.

**Claude:**

Đúng là thiếu. Hộp **Assign Issue Types** liệt kê mọi work type đang có trên site, mà site của bạn chỉ có `Epic` và `Story`. `AO standard` cần thêm `Task` và `Bug`, còn `AO sub-task` cần `Sub-task`. Checklist cũ bỏ sót bước tạo work type vì mình tưởng site đã có sẵn.

Mình đã thêm vào checklist mục **6. Work type**, đặt trước Workflow scheme. Các mục sau lùi một số: Workflow scheme giờ là mục 7, Space là mục 9.

Bạn làm như sau:

1. Bấm **Cancel** để đóng hộp này. Scheme `AO workflow scheme` đã tạo thì giữ nguyên, và giữ tab này để lát quay lại.
2. Mở tab mới, vào lại **Jira admin settings** → **Work items**. Menu bên trái chọn **Work types** → **Add work type** → ô **Name** gõ `Task` → nếu hộp có ô chọn loại thì chọn Standard → không chọn work type scheme → **Add**.
3. Làm lại bước 2 với tên `Bug`.
4. Menu bên trái chọn **Sub-tasks** → **Add subtask work type** → ô **Name** gõ `Sub-task` (có gạch nối) → **Add**. Nếu trang báo sub-task đang tắt, bấm **Enable** trước.
5. Quay về tab scheme, tải lại trang (F5). Bấm **Add Workflow** → **Add Existing** → chọn `AO standard` → **Next** → tick `Story`, `Task`, `Bug` → **Finish**.
6. Làm tương tự với `AO epic` (tick `Epic`) và `AO sub-task` (tick `Sub-task`).

Hai lưu ý:

- Trong hộp chọn work type, **không tick ô All Unassigned Issue Types**. Tick ô đó thì mọi work type khác cũng chạy theo workflow đang gắn. Dòng `Jira Workflow (jira)` có sẵn của scheme để nguyên.
- `Epic` có sẵn trên mọi site Jira, không cần tạo. Ở bước 5, nếu danh sách workflow chưa có `AO epic` hoặc `AO sub-task` thì mục 5 chưa xong, bạn làm nốt trước.

Mình đã ghi vào `tasks/verification.md`: mục 5 đã có `AO standard`; mục 6 đang làm (thiếu `Task`, `Bug`, `Sub-task`); mục 7 đã tạo scheme, chưa gắn workflow. Thứ tự trong spec mục 2.10 cũng được sửa cho khớp. Mục 1 (group) bạn làm xong chưa?

Nguồn: [Add, edit, and delete a work type](https://support.atlassian.com/jira-cloud-administration/docs/add-edit-and-delete-an-issue-type/), [Configure sub-tasks](https://support.atlassian.com/jira-cloud-administration/docs/configure-sub-tasks/)

---

# Phiên 6 · Lượt 19 — 2026-10-27 khoảng 17:40

**Bạn:**

```markdown
Tại 8. Trường
bạn nói "sửa context mặc định → phần Applicable work types chỉ chọn các work type ghi ở dòng đó", nhưng có vẻ không edit được. [Image #13] [Image #14]
```

Ảnh đính kèm:

- [Image #13](images/phien-6-luot-19-anh-1.png): trang **Configure Custom Field: Found in**: Default Configuration Scheme for Found in, banner "Global configuration scheme contexts now exist for all fields by default and can no longer be deleted or restricted to specific work types or spaces. See the announcement and CHANGE-3019"; Work type(s): Global (all work items); Options: Development, Staging, Production.
- [Image #14](images/phien-6-luot-19-anh-2.png): trang **Modify configuration scheme context** của Found in, cùng banner đó; ô Issue types có Any issue type (bị khóa), Sub-task, Task, Bug, Story; Choose applicable context đang chọn Global context; nút Modify, Cancel.

**Claude:**

Bạn nói đúng, bước 5 không làm được nữa. Banner trong cả hai ảnh đã nói rõ: context mặc định (Global) giờ có sẵn cho mọi field, không xóa được, và không giới hạn được theo work type hay space. Ô **Any issue type** bị khóa cũng vì vậy.

Bạn làm như sau:

1. Ở trang **Modify configuration scheme context** (ảnh thứ hai), bấm **Cancel** ở cuối trang, không bấm **Modify**.
2. Không cần **Add new context**: hợp đồng không yêu cầu ẩn field ở các work type khác.
3. Tạo tiếp `Severity` và `Agent` theo mục 8, bỏ qua bước giới hạn work type.

Hệ quả: Jira sẽ cho điền `Found in` và `Severity` cả ở Story và Task. Không sao, vì hợp đồng đã ghi work type nào dùng field nào, và agent điền theo hợp đồng. Mình đã sửa mục 8 của checklist: bỏ bước 5 cũ, thay bằng lời dặn để nguyên Global context, và đổi "work type `Bug`" thành "dùng cho `Bug`" để khỏi hiểu nhầm là phải cài đặt gì.

Phần bạn đã làm đều đúng:

- `Found in`: đúng tên, đủ ba option theo đúng thứ tự `Development`, `Staging`, `Production`.
- Mục 6 xong: ảnh thứ hai cho thấy site đã có `Sub-task` (có gạch nối), `Task`, `Bug`, `Story`.

Mình đã ghi tiến độ vào `tasks/verification.md`: mục 6 xong, mục 8 đang làm.

Còn hai chỗ mình chưa rõ:

- Mục 7: bạn đã gắn đủ ba workflow vào `AO workflow scheme` chưa?
- Mục 1 (group): bạn đã làm xong chưa?

Nguồn: chủ yếu là banner trên chính trang của bạn (dẫn tới CHANGE-3019). Một trang tài liệu API của bên thứ ba ghi rằng từ tháng 4/2026 Jira chặn việc thêm work type vào global context ([withone.ai](https://www.withone.ai/knowledge/jira/conn_mod_def%3A%3AGJ4qW7AJDd4%3A%3AVDl-tRW4TL2O0UZGO4HAPQ/md)). Mình chưa đọc được bản ghi chính thức của CHANGE-3019.

---

# Phiên 6 · Lượt 20 — 2026-10-27 khoảng 18:00

**Bạn:**

```markdown
[Image #15]
"Work type: Space settings → Work types. Danh sách phải có đủ các loại bên dưới. Thiếu loại nào: bấm Actions → Edit work types, kéo loại còn thiếu vào cột của scheme → Save."

Không có Sub-task
```

Ảnh đính kèm:

- [Image #15](images/phien-6-luot-20-anh-1.png): trình tạo space, bước 2/3 **Let's set up your space**. Phần Configuration gồm **Work types** (Epic ở dòng riêng phía trên; Story, Bug, Task có nút xóa; nút **+ Add work type**), **Statuses** (Backlog, Selected for development, In Progress, Done) và **Views**. Bên phải là ảnh xem trước board của "Company-managed space DEMO"; nút **Next** ở góc dưới.

**Claude:**

Bạn đang ở trình tạo space, tức là trước bước Space settings mà đoạn bạn trích nói tới. Đoạn đó dùng sau khi space đã được tạo. Ở trình tạo này, Epic nằm riêng một dòng phía trên, rồi tới các loại cùng cấp Story; loại sub-task không có sẵn trong danh sách. Vì vậy thiếu `Sub-task` ở đây là bình thường, mình sẽ thêm sau.

Bạn làm tiếp như sau:

1. Phần **Work types**: giữ nguyên `Epic`, `Story`, `Bug`, `Task`. Bấm thử **+ Add work type**: nếu danh sách có `Sub-task` thì chọn, nếu không có thì bỏ qua.
2. Phần **Statuses** (Backlog, Selected for development…): để nguyên. Ở bước Workflow scheme phía sau, `AO workflow scheme` sẽ thay toàn bộ.
3. Bấm **Next**, rồi làm theo bước 3 để tạo space. Nếu bước 3 hỏi gì bạn không chắc, chụp gửi mình.
4. Sau khi tạo xong: vào space, menu bên trái bấm **•••** cạnh tên space → **Space settings** → **Work types**.
5. Nếu chưa có `Sub-task`: bấm **Actions** → **Edit work types**. Trang này có hai cột: một cột là các loại đang có trong scheme của space, cột kia là các loại còn lại trên site. Kéo `Sub-task` sang cột của scheme → **Save**. Nếu trang trông khác mô tả, chụp gửi mình.

Nếu danh sách work type của space có loại lạ, ví dụ `Subtask` (không gạch nối) do Jira tự tạo, thì đừng xóa, chụp gửi mình.

Mình đã sửa mục 9 của checklist theo trình tạo space thật: bước **Name your space**, bước **Let's set up your space** (giữ work type, để nguyên Statuses), và ghi chú rằng `Sub-task` thường phải thêm sau trong Space settings. Tiến độ đã ghi vào `tasks/verification.md`: mục 9 đang làm.

---

# Phiên 6 · Lượt 21 — 2026-10-27 khoảng 18:10

**Bạn:**

```markdown
làm gì có Work types nhỉ? [Image #16]
```

Ảnh đính kèm:

- [Image #16](images/phien-6-luot-21-anh-1.png): trang **Space settings → Details** của space `DEMO` (Software space): Name `DEMO`, Space key `DEMO`, How your space is managed "Jira - software project". Menu bên trái: Details, Summary, People, Permissions, Notifications, Automation, Features, Toolchain, Workflows, **Work items** (mở ra: Types, Layout, Screens, Fields, Collectors, Security), Versions, Components, Apps.

**Claude:**

Có đấy, chỉ là tên khác với checklist: trong menu bên trái, mục **Work items** (đang mở) có dòng **Types**. Đó chính là trang Work types. Checklist ghi sai tên, mình đã sửa.

Ảnh này cũng xác nhận space `DEMO` đã tạo đúng loại company-managed, vì menu có **Workflows** và **Work items → Screens, Fields**. Space team-managed không có các trang này.

Bạn làm tiếp như sau:

1. Menu bên trái: **Work items** → **Types**.
2. Xem danh sách: cần đủ `Epic`, `Story`, `Sub-task`, `Task`, `Bug`.
3. Nếu thiếu `Sub-task`: tìm nút **Actions** → **Edit work types** (tên nút có thể khác), kéo `Sub-task` sang cột của scheme → **Save**. Nếu không thấy nút nào giống vậy, chụp trang **Types** gửi mình.
4. Nếu có loại lạ, ví dụ `Subtask` không gạch nối, đừng xóa, chụp gửi mình.

Mình đã sửa mục 9 của checklist theo đúng menu này: Work type nằm ở **Work items** → **Types**, màn hình nằm ở **Work items** → **Screens**; **Workflows** vẫn ở cấp ngoài cùng như checklist ghi. Tiến độ đã ghi vào `tasks/verification.md`: `DEMO` đã tạo, đang kiểm work type.

---

# Phiên 6 · Lượt 22 — 2026-10-27 khoảng 18:25

**Bạn:**

```markdown
[Image #17]

Tôi không thấy "bấm vào từng screen trong danh sách (thường có màn hình tạo, sửa, xem) → kéo xuống cuối, ô Select Field... gõ tên field → chọn → field được thêm vào cuối màn hình. Làm cho từng field bên dưới, trên từng screen." ???
```

Ảnh đính kèm:

- [Image #17](images/phien-6-luot-22-anh-1.png): trang **Space settings → Work items → Screens** của `DEMO`: "DEMO: Kanban Issue Type Screen Scheme", banner về Layout trong giao diện work item mới (Project settings > Issue layout). Ba screen scheme: **DEMO: Kanban Default Screen Scheme** (Story, Task, Sub-task; Create/Edit/View issue đều là `DEMO: Kanban Default Issue Screen`), **DEMO: Kanban Bug Screen Scheme** (Bug; `DEMO: Kanban Bug Screen`), **DEMO: Kanban Epic Screen Scheme** (Epic; `DEMO: Kanban Epic Screen`).

**Claude:**

Checklist viết chưa đúng với trang này. Trang **Screens** không có ô thêm field. Nó chỉ liệt kê screen nào dùng cho work type nào. Ô thêm field nằm trong trang của từng screen, mở ra khi bấm vào tên screen (chữ xanh).

Ảnh của bạn còn cho thấy hai điều:

- **Mục work type đã xong.** `Sub-task` đã có trong space, nằm chung scheme với `Story` và `Task`.
- **Space chỉ có ba screen, mỗi screen dùng chung cho Create, Edit và View.** Vì vậy mỗi screen chỉ cần thêm field một lần.

Space `DEMO` cần thêm field như sau:

| Screen (chữ xanh) | Work type | Field cần thêm |
|---|---|---|
| `DEMO: Kanban Default Issue Screen` | Story, Task, Sub-task | `Fix versions`, `Agent`, `Flagged` |
| `DEMO: Kanban Bug Screen` | Bug | `Found in`, `Affects versions`, `Severity`, `Fix versions`, `Agent`, `Flagged` |
| `DEMO: Kanban Epic Screen` | Epic | `Flagged` |

Cách làm:

1. Bấm chữ xanh `DEMO: Kanban Default Issue Screen`. Bấm ở dòng Create, Edit hay View đều được, vì cả ba là cùng một screen.
2. Trang cấu hình screen mở ra, có danh sách field. Tìm ô thêm field: thường là ô **Select Field...** ở cuối danh sách, hoặc nút **Add field**. Gõ tên field rồi chọn. Field nào đã có trong danh sách thì bỏ qua.
3. Quay lại trang **Screens** và làm tương tự với hai screen còn lại.

Nếu trang cấu hình screen trông khác mô tả, bạn chụp màn hình gửi mình.

Bảng trên cũng sửa lại một điều mình nói ở lượt trước. Field không giới hạn được theo work type qua context, nhưng screen thì giới hạn được. Thêm như bảng trên thì `Found in` và `Severity` chỉ hiện ở Bug, không hiện ở Story hay Task.

Mình đã sửa mục 9 của checklist: bỏ dòng "mọi screen có mọi field", thay bằng các bước trên và mỗi field một dòng ghi screen của work type nào. Mục 8 cũng được sửa theo cho khớp. Tiến độ đã ghi vào `tasks/verification.md`.

Một câu hỏi: trong checklist, bước **Workflow scheme** của mục 9 đứng trước bước Màn hình. Bạn đã vào **Workflows** → **Switch scheme** để chuyển `DEMO` sang `AO workflow scheme` chưa?

---

# Phiên 6 · Lượt 23 — 2026-10-27 khoảng 18:45

**Bạn:**

```markdown
đã làm xong từ mục 1 tới 9, đang làm mục 10. Board

[Image #18]

"Details → sửa filter query thành dòng bên dưới (thay <KEY> bằng key của space) → lưu." Tôi không thấy nút lưu??
```

Trong lúc Claude đang làm, bạn gửi thêm một ảnh: [Image #19].

Ảnh đính kèm:

- [Image #18](images/phien-6-luot-23-anh-1.png): trang filter **Filter for DEMO board** (`/issues/?filter=10001`), chế độ JQL, ô JQL đã gõ `project = DEMO AND issuetype != Epic ORDER BY Rank ASC`; bên phải có **Clear filters**, **Copy filter**; kết quả "There are no work items here yet". Không thấy nút lưu.
- [Image #19](images/phien-6-luot-23-anh-2.png): trang **Board settings → Details** của `DEMO board`: phần **Board filter**, Select filter "Filter for DEMO board", Filter query `project = "DEMO" ORDER BY Rank ASC`, link **Edit filter query**; **Board sub-filter** `fixVersion in unreleasedVersions() OR fixVersion is EMPTY`; Completed work items 2 weeks.

**Claude:**

Câu JQL mới của bạn chưa được lưu. Mình đã đọc filter qua REST (chỉ đọc): Jira vẫn giữ câu cũ `project = "DEMO" ORDER BY Rank ASC`. Ảnh thứ hai cũng cho thấy đúng câu cũ này ở ô **Filter query**.

Nút lưu chưa hiện vì Jira chỉ coi filter là đã đổi sau khi bạn chạy câu JQL mới. Gõ vào ô JQL thôi thì chưa tính. Một yêu cầu cải tiến trên trang Jira của Atlassian cũng mô tả chuyện này: nếu chưa chạy câu mới mà đã lưu, Jira lưu lại câu cũ.

Bạn làm như sau, ở tab filter (ảnh thứ nhất):

1. Bấm vào ô JQL, kiểm lại câu là `project = DEMO AND issuetype != Epic ORDER BY Rank ASC`.
2. Bấm **Enter**, hoặc biểu tượng kính lúp ở cuối ô JQL, để chạy câu.
3. Sau khi chạy, nút lưu sẽ hiện cạnh tên filter **Filter for DEMO board** hoặc ở góc trên bên phải. Tên nút thường là **Save filter** hoặc **Save changes**. Bấm nút đó.
4. Quay lại tab **Board settings**, tải lại trang (F5). Ô **Filter query** phải hiện câu mới.

Nếu đã chạy câu mà vẫn không thấy nút lưu, bạn thử bấm **•••** ở góc trên bên phải trang filter. Vẫn không có thì chụp màn hình gửi mình. Bạn lưu xong thì báo mình, mình sẽ đọc lại filter qua REST để chắc chắn.

Hai thứ khác trong ảnh thứ hai thì để nguyên:

- **Board sub-filter** `fixVersion in unreleasedVersions() OR fixVersion is EMPTY`: đây là mặc định của board Kanban. Nó ẩn các item thuộc bản đã phát hành, nên board không đầy dần theo thời gian.
- **Completed work items: 2 weeks**: item Done quá 2 tuần sẽ rời board.

Mình đã ghi tiến độ vào `tasks/verification.md`: mục 1 đến 9 xong theo bạn báo, mục 10 đang làm và filter chưa lưu. Mục 10 của checklist cũng được viết lại theo đúng các bước trên: **Edit filter query** → trang filter → chạy câu → lưu → kiểm lại trong Board settings.

Nguồn: [Edit a board filter on a company-managed board](https://support.atlassian.com/jira-software-cloud/docs/edit-a-board-filter-on-a-company-managed-board/), [JRACLOUD-95140: Improve JQL Filter Saving Process in Jira Cloud](https://jira.atlassian.com/browse/JRACLOUD-95140)

---

# Phiên 6 · Lượt 24 — 2026-10-28 khoảng 00:10

**Bạn:**

```markdown
11. GitHub for Jira

[Image #20] không tìm thấy Github for Jira??
```

Ảnh đính kèm:

- [Image #20](images/phien-6-luot-24-anh-1.png): trang **Explore apps for Jira** (Apps → Explore more apps ở thanh bên trái), tìm "GitHub for Jira". Kết quả: **GitHub for Atlassian** (By Atlassian, 3.3 sao, 138K lượt cài, Free), GitHub Integration for Jira (GitHub Connector) FORGE (Getint), Create GitHub Branches from Jira, GitHub connector for Jira, GitHub Links for Jira, GitHub & Jira integration, GitHub Copilot for Jira…; đa số app của hãng khác ghi "Free up to 10 users".

**Claude:**

App vẫn có, chỉ là đã đổi tên thành **GitHub for Atlassian**. Đó là thẻ đầu tiên trong ảnh của bạn: nhà phát hành Atlassian, 138K lượt cài, Free. Trang Marketplace của app vẫn dùng đường dẫn cũ `github-for-jira`, và tài liệu của Atlassian về deployment giờ cũng gọi app là "GitHub for Atlassian".

Bạn làm như sau:

1. Bấm thẻ **GitHub for Atlassian** (dòng "By Atlassian"). Đừng chọn các app khác có chữ GitHub, như GitHub Integration for Jira (Getint) hay GitHub connector for Jira: đó là app của hãng khác, nhiều app chỉ miễn phí tới 10 người.
2. Bấm **Get app** (tên nút có thể khác một chút) → xác nhận cài.
3. Cài xong, mở app → nối với GitHub → đăng nhập GitHub.
4. Chọn tài khoản `TungPH7` → **Only select repositories** → chọn `ao-pilot` → **Install** → quay lại Jira, bấm **Connect** cạnh tài khoản.

Bước 3 và 4 mình viết theo tài liệu, chưa thấy giao diện thật. Chỗ nào khác, bạn chụp gửi mình.

Cài xong không cần ngắt rồi nối lại. Atlassian có ghi rằng khi `.jira/config.yml` được tạo lần đầu thì phải nối lại để app đọc file, nhưng file của `ao-pilot` đã nằm trên `main` từ trước khi cài app.

Về mục 10, mình đã đọc lại filter qua REST: giờ đã đúng câu mới `project = DEMO AND issuetype != Epic ORDER BY Rank ASC`.

Mình đã cập nhật:

- `tasks/verification.md`: mục 10 xong (cột và giới hạn WIP sẽ do `jira:check` kiểm sau), mục 11 đang làm.
- Mục 11 của checklist: tìm `GitHub for Atlassian`, chọn app của Atlassian; **Apps** nằm ở thanh bên trái, không phải thanh trên cùng.

Cài xong app thì T8 còn một bước kiểm: tạo một Story thử trên `DEMO` và chuyển qua vài status. Bạn báo xong mục 11, mình sẽ hướng dẫn bước này.

Nguồn: [GitHub for Atlassian trên Atlassian Marketplace](https://marketplace.atlassian.com/apps/1219592/github-for-atlassian), [Link GitHub workflows and deployments to Jira work items](https://support.atlassian.com/jira-cloud-administration/docs/link-github-workflows-and-deployments-to-jira-issues/), [KB: custom environment names do not show up in the releases panel](https://support.atlassian.com/jira/kb/jira-github-integration-custom-environment-names-does-not-show-up-in-releases-panel-and-instead-show-undefined-environment/)

---

# Phiên 6 · Lượt 25 — 2026-10-28 khoảng 00:25

**Bạn:**

```markdown
[Image #21][Image #22]
sau khi bấm next thì như Image #22, tôi bấm Select an organization... thì không có gì xảy ra. Mà vì sao chỉ cho chọn organization??
```

Ảnh đính kèm:

- [Image #21](images/phien-6-luot-25-anh-1.png): trang **GitHub for Atlassian** trong Jira admin settings (Marketplace apps): "Connect GitHub to Atlassian", chọn sản phẩm **GitHub Cloud** hoặc GitHub Enterprise Server, nút **Next**.
- [Image #22](images/phien-6-luot-25-anh-2.png): bước tiếp theo: khung "Select a GitHub organization" ("The repositories you select from this organization will be available to all projects in https://phunghuutung12b4.atlassian.net"), nút **Select an organization in GitHub**, dòng "Logged in as TungPH7. Change GitHub login". Cuối thanh địa chỉ có biểu tượng **Pop-up blocked**.

**Claude:**

Bấm mà không có gì xảy ra là vì Chrome đã chặn pop-up. Ở cuối thanh địa chỉ trong ảnh thứ hai có biểu tượng **Pop-up blocked**. Nút đó mở GitHub ở một tab mới, nên bị chặn.

Bạn làm như sau:

1. Bấm biểu tượng **Pop-up blocked** ở cuối thanh địa chỉ → chọn **Always allow pop-ups and redirects from https://phunghuutung12b4.atlassian.net** → **Done**.
2. Bấm lại **Select an organization in GitHub**. Tab GitHub sẽ mở ra và hỏi cài app vào tài khoản nào.
3. Nếu danh sách có `TungPH7` (tài khoản cá nhân của bạn): chọn nó → **Only select repositories** → chọn `ao-pilot` → **Install**. Rồi quay lại tab Jira, nếu thấy **Connect** cạnh `TungPH7` thì bấm.
4. Nếu danh sách không có `TungPH7`, chỉ có organization hoặc trống: dừng lại, chụp màn hình gửi mình.

Về câu hỏi vì sao chỉ cho chọn organization: tài liệu của Atlassian cho app này chỉ nói tới GitHub organization, không nhắc tới tài khoản cá nhân. Theo tài liệu, nếu không có organization nào thì phải cài app vào một organization mới. Trang cài app của GitHub thường liệt kê cả tài khoản cá nhân, nhưng mình chưa xác nhận được điều này cho app này, nên bước 3 là để thử.

Nếu bước 4 xảy ra, cách theo tài liệu là tạo một GitHub organization miễn phí rồi chuyển `ao-pilot` sang đó. Việc này đổi địa chỉ repo, kéo theo remote ở máy và đường dẫn trong kit, nên mình sẽ hỏi bạn trước khi làm.

Mình đã cập nhật:

- Mục 11 của checklist: thêm bước **GitHub Cloud** → **Next**, dòng **Logged in as**, cách mở khóa pop-up, và dặn dừng lại hỏi nếu GitHub không cho chọn tài khoản sở hữu repo.
- `tasks/verification.md`: mục 11 đang nối với GitHub; thêm câu hỏi "app có nối được với tài khoản cá nhân không", chờ kết quả của bạn.

Nguồn: [Connect GitHub Cloud to Jira](https://support.atlassian.com/jira-cloud-administration/docs/integrate-with-github-cloud/)

---

# Phiên 6 · Lượt 26 — 2026-10-28 khoảng 00:35

**Bạn:**

```markdown
- đã cài xong app, nối được với ao-pilot
11. tôi check thì đã thấy env từ trước

[Image #23] [Image #24]
```

Ảnh đính kèm:

- [Image #23](images/phien-6-luot-26-anh-1.png): trang **GitHub configuration → Connections** của app GitHub for Atlassian: GitHub Cloud, Connected organization `TungPH7`, Repository access **Only select repos** (1), Backfill status **FINISHED** (Backfilled from: Apr 30, 2026), Permissions **Full Access**.
- [Image #24](images/phien-6-luot-26-anh-2.png): trang **Settings → Environments** của `TungPH7/ao-pilot`: `production`, `staging`, `development`.

**Claude:**

Mục 11 và 12 xong. Ảnh thứ nhất còn trả lời luôn câu hỏi lượt trước: app nối được với tài khoản cá nhân `TungPH7`, dù trang ghi "organization". Không cần tạo organization hay chuyển repo. Ba environment là do mình tạo ở đầu T8, nên bạn thấy có sẵn là đúng.

Vậy là bạn đã dựng xong cả 12 mục. T8 còn một bước kiểm: tạo một Story thử trên `DEMO` và chuyển qua vài status. Bước này cũng thử luôn rule Restrict và rule hỏi Resolution khi hủy.

1. Thanh trên cùng của Jira: bấm **+ Create** → **Space** chọn `DEMO`, **Work type** chọn `Story`, **Summary** gõ `Story thử T8` → **Create**.
2. Story mới ở status `New`. Status này là Kanban backlog nên Story nằm ở trang **Backlog** của space, chưa lên board. Vào space `DEMO`, mở **Backlog**, bấm vào Story.
3. Trong trang Story, bấm nút status (đang ghi `New`, ở phía trên bên phải) → chọn **Refine** (có thể hiện là `Ready`). Story chuyển sang `Ready` và hiện trên board, cột `Ready`.
4. Bấm lại nút status (giờ ghi `Ready`), rồi chụp danh sách hiện ra gửi mình. Danh sách **không được có** `Start` hay `In Progress`, vì `Start` chỉ dành cho group `ao-agents`. Nếu thấy chúng thì rule Restrict chưa chặn.
5. Trong danh sách đó, chọn **Cancel**. Jira phải hiện hộp hỏi **Resolution**: chọn `Won't Do` → xác nhận. Story chuyển sang `Cancelled` và rời board.
6. Đừng xóa Story này. Mình cần lịch sử của nó để kiểm.

Bạn làm xong thì gửi mình key của Story (ví dụ `DEMO-1`). Mình sẽ đọc Story qua REST (chỉ đọc) để kiểm status, resolution và lịch sử chuyển. Sau đó mình đánh dấu T8 xong, mở PR cho nhánh `task/t8-build-demo` và merge khi CI xanh. Task tiếp theo, T9, cần bạn tạo một API token chỉ đọc; tới lúc đó mình sẽ hướng dẫn từng bước.

Mình đã ghi mục 11, 12 xong vào `tasks/verification.md`. Mục 11 của checklist cũng được sửa: tài khoản cá nhân dùng được, kèm bước kiểm trên trang **Connections** (Only select repos, Backfill FINISHED).

---

# Phiên 6 · Lượt 27 — 2026-10-28 khoảng 00:50

**Bạn:**

```markdown
[Image #25]
trang Backlog của space ở đâu??
```

Ảnh đính kèm:

- [Image #25](images/phien-6-luot-27-anh-1.png): board **DEMO board** (tab **Kanban board**). Các tab: Summary, Timeline, Kanban board, Calendar, List, Forms, Development, Docs, +. Cột: READY (trống, ghi "Create and move work items from the backlog to get started"), IN PROGRESS, IN REVIEW (MAX: 2), QA, DONE. Không có tab Backlog.

**Claude:**

Board của bạn không có tab Backlog riêng. Bạn mở Story theo một trong hai cách:

- Bấm tab **List** (cạnh **Calendar**) → bấm `DEMO-1`.
- Hoặc mở thẳng link: <https://phunghuutung12b4.atlassian.net/browse/DEMO-1>

Mình đã đọc qua REST (chỉ đọc): `DEMO-1` "Story thử T8" là Story, đang ở status `New`, đúng như mong đợi. Ảnh của bạn cũng cho thấy Kanban backlog đã bật đúng: board không có cột Backlog, và cột `Ready` ghi "Create and move work items from the backlog". Nghĩa là item ở `New` không hiện trên board.

Mở được Story rồi thì bạn làm tiếp từ bước 3 của lượt trước:

1. Bấm nút status `New` → **Refine**.
2. Bấm lại nút status (giờ là `Ready`) → chụp danh sách gửi mình. Danh sách không được có `Start` hay `In Progress`.
3. Chọn **Cancel** → hộp **Resolution** chọn `Won't Do` → xác nhận.

Một phát hiện khi đọc `DEMO-1`: với token của cả hai service account, Jira trả tên bằng tiếng Trung, work type là `故事` (Story), status là `全新` (New). Gửi kèm header `Accept-Language: en-US` thì Jira trả tên tiếng Anh. Ánh xạ của mình so theo tên, nên từ T9, mọi request REST của module sẽ gửi kèm header này. Rovo MCP thì mình sẽ kiểm ở T13. Bạn không cần làm gì.

Mình đã ghi phát hiện này vào `tasks/verification.md`. Mục Board của checklist cũng có thêm một dòng: item ở Kanban backlog không hiện trên board, xem ở tab **List**.

---

# Phiên 6 · Lượt 28 — 2026-10-28 khoảng 01:00

**Bạn:**

```markdown
[Image #26]
```

Ảnh đính kèm:

- [Image #26](images/phien-6-luot-28-anh-1.png): tab **List** của `DEMO board`: một dòng `DEMO-1` "Story thử T8", Unassigned, Reporter tung phunghuu, Priority Medium, Status **Ready**, Resolution Unresolved, Created Oct 28, 2026, 12:47 AM.

**Claude:**

Mình đã đọc lịch sử của `DEMO-1` qua REST. Bạn đã chuyển hai bước, cả hai đều chạy:

- `Refine` (`New` → `Ready`) lúc 00:54.
- `Cancel` (`Ready` → `Cancelled`) lúc 00:56.

Nhưng có một lỗi: **sau khi hủy, Resolution của `DEMO-1` vẫn trống**, đáng ra phải là `Won't Do`. Item ở `Cancelled` mà không có Resolution thì vẫn bị Jira tính là chưa giải quyết.

Mình cần bạn trả lời hai câu:

1. Lúc bấm **Cancel**, Jira có hiện hộp hỏi Resolution không? Nếu có, bạn đã chọn `Won't Do` chưa?
2. Lúc Story ở `Ready`, danh sách status có `Start` hay `In Progress` không?

Để tìm nguyên nhân, bạn mở rule của transition này:

1. Bánh răng ⚙ → **Jira admin settings** → **Work items** → **Workflows** → workflow `AO standard` → mở trình sửa.
2. Trên sơ đồ, bấm nhãn **Cancel** của đường `Ready` → `Cancelled`.
3. Ở khung **Transition** bên phải, chụp nhóm **Request input** gửi mình. Nếu nhóm này có rule, bấm vào rule và chụp luôn phần cài đặt của nó.

Mình đoán là một trong hai nguyên nhân sau:

- Transition `Cancel` từ `Ready` chưa có rule Request input. `AO standard` có 6 transition `Cancel`, nên dễ sót một cái.
- Rule có rồi, nhưng ô Resolution không bắt buộc nên bỏ qua được.

Giữ nguyên `DEMO-1`, đừng xóa: nó là bằng chứng của lỗi này. Sửa rule xong, mình sẽ nhờ bạn tạo một Story thử thứ hai để kiểm lại cả hai việc: `Start` không hiện ở `Ready`, và `Cancel` bắt chọn Resolution.

Mình đã ghi kết quả kiểm vào `tasks/verification.md`: tạo Story và `Refine` đạt; hủy có hỏi Resolution không đạt; việc chặn `Start` chưa kiểm.

---

# Phiên 6 · Lượt 29 — 2026-10-28 khoảng 01:00

**Bạn:**

```markdown
không thấy hiện hộp hỏi Resolution??
```

**Claude:**

Vậy là transition `Cancel` chưa có rule hiện màn hình. Không có rule thì Jira hủy item luôn, không hỏi gì, và Resolution để trống, đúng như `DEMO-1`. Lỗi này nằm ở checklist: mục 5 chỉ ghi chung chung "chọn rule hiện màn hình", không nói rõ tên rule. Theo tài liệu của Atlassian, rule đó là **Request input → Show a screen**, và phải chọn một màn hình có sẵn chứa trường Resolution.

**Bước 1: kiểm màn hình**

1. Bánh răng ⚙ → **Jira admin settings** → **Work items** → menu bên trái **Screens**.
2. Tìm `Resolve Issue Screen`. Đây là màn hình có sẵn của Jira.
3. Bấm vào nó, xem danh sách có trường **Resolution** không. Nếu không thấy màn hình này, hoặc nó không có Resolution, bạn chụp màn hình gửi mình.

**Bước 2: thêm rule cho từng transition `Cancel`**

1. Menu bên trái **Workflows** → `AO standard` → mở trình sửa.
2. Bấm nhãn **Cancel** của một đường vào `Cancelled`.
3. Khung **Transition** bên phải → nhóm **Request input** → bấm nút thêm rule của nhóm. Nút này nằm giống **Add restrict transition rule** ở nhóm Restrict.
4. Chọn **Show a screen** → ô **Select a screen** chọn `Resolve Issue Screen` → **Add**.
5. Lặp lại bước 2–4 cho đủ 6 transition `Cancel` của `AO standard`, từ: `New`, `Ready`, `In Progress`, `In Review`, `Ready for QA`, `In QA`.
6. Bấm **Update workflow**.
7. Làm tương tự với `AO epic`: 4 transition `Cancel`, từ `New`, `Specifying`, `Planning`, `In Progress`. Xong thì bấm **Update workflow**.

Mỗi transition giữ rule riêng, nên phải thêm đủ 10 lần.

Làm transition đầu tiên xong, bạn chụp nhóm **Request input** gửi mình xem đúng chưa rồi hãy làm tiếp.

Về việc có bắt buộc chọn hay không: theo mình biết, khi Resolution nằm trên màn hình transition, Jira bắt chọn một giá trị và không cho để trống. Mình chưa tìm được tài liệu chính thức nói điều này, nên sẽ kiểm bằng Story thử thứ hai.

Sau khi bạn sửa xong, ta làm Story thử thứ hai:

1. **+ Create** → `DEMO`, `Story`, Summary `Story thử T8 lần 2` → **Create**.
2. Mở Story ở tab **List** → nút status → **Refine**.
3. Bấm lại nút status, chụp danh sách gửi mình. Danh sách không được có `Start`.
4. Chọn **Cancel**: lần này Jira phải hiện màn hình có ô **Resolution** → chọn `Won't Do` → xác nhận.

Mình đã sửa mục 5 của checklist theo đúng các bước trên, và ghi nguyên nhân vào `tasks/verification.md`.

Nguồn: [Map a screen to a workflow transition](https://support.atlassian.com/jira-cloud-administration/docs/map-a-screen-to-a-workflow-transition/)

---

# Phiên 6 · Lượt 30 — 2026-10-28 khoảng 01:05

**Bạn:**

```markdown
[Image #27]
```

Ảnh đính kèm:

- [Image #27](images/phien-6-luot-30-anh-1.png): trình sửa workflow `AO standard` (Used in 1 space), đang chọn transition **Cancel**: From statuses `Ready`, To status `Cancelled`. Khung **Rules** có bốn nhóm, nhóm nào cũng chỉ có nút thêm rule: **Add restrict transition rule**, **Add request input rule**, **Add validate details rule**, **Add perform actions rule**. Nút **Update workflow** đang mờ. Ô **Show transition labels** chưa tick.

**Claude:**

Ảnh cho thấy transition `Cancel` (`Ready` → `Cancelled`) **chưa có rule nào, kể cả rule Restrict**. Cả bốn nhóm chỉ có nút **Add … rule**; nhóm nào đã có rule thì rule đó hiện ngay trong nhóm. Nghĩa là hiện giờ agent cũng hủy được item ở `Ready`. Vậy transition này thiếu hai thứ: rule Restrict và rule hỏi Resolution.

Với transition đang chọn, bạn thêm hai rule:

1. Nhóm **Restrict transition** → **Add restrict transition rule** → **Restrict who can move a work item** → **Select** → ô **Restrict to** chọn **Groups** → chọn `ao-humans` → **Add**.
2. Nhóm **Request input** → **Add request input rule** → **Show a screen** → ô **Select a screen** chọn `Resolve Issue Screen` → **Add**.
3. Chụp khung **Rules** gửi mình kiểm.
4. Bấm **Update workflow** ở góc trên bên phải. Nút này chỉ sáng lên khi đã có thay đổi.

Transition này thiếu cả Restrict, nên có thể các transition khác cũng thiếu. Ba workflow có tổng cộng 24 transition: `AO standard` 14, `AO epic` 8, `AO sub-task` 2. Có hai cách kiểm:

- **Tự dò:** tick ô **Show transition labels** ở góc trên sơ đồ để thấy tên mọi transition, rồi bấm lần lượt từng cái. Nhóm **Restrict transition** phải có rule; các transition `Cancel` còn phải có rule **Show a screen**.
- **Mình đọc giúp (mình đề xuất cách này):** làm sớm bước đầu của T9. Bạn tạo một API token chỉ đọc cho tài khoản của bạn, rồi mình dùng nó đọc cả ba workflow qua REST và liệt kê chính xác transition nào thiếu rule gì. T9 vốn cần token này, nên bạn không tốn thêm việc.

Bạn chọn cách nào? Nếu chọn cách thứ hai, mình sẽ hướng dẫn tạo token từng bước, kèm danh sách scope chỉ đọc.

Mình đã ghi chỗ thiếu này vào `tasks/verification.md`, và đổi mục 5 sang "đang sửa". Mục 5 của checklist cũng có thêm bước **Kiểm trước khi lưu**: bật **Show transition labels**, rồi xem khung **Rules** của từng transition.

---

# Phiên 6 · Lượt 31 — 2026-10-28 khoảng 01:05

**Bạn:**

```markdown
[Image #28]
```

Ảnh đính kèm:

- [Image #28](images/phien-6-luot-31-anh-1.png): vẫn là transition **Cancel** (`Ready` → `Cancelled`) của `AO standard`. Khung **Rules**: **Restrict transition (1)**, MUST BE ALL (1): "Restrict who can move a work item — Only people in ao-humans can see this transition"; **Request input (1)**: "Show a screen — Update fields in the "Resolve Issue Screen" screen". Nút **Update workflow** đã sáng, cạnh nút **Discard changes**.

**Claude:**

Đúng rồi. Transition `Cancel` từ `Ready` giờ đã có đủ hai rule:

- **Restrict transition**: chỉ người trong `ao-humans` thấy transition này.
- **Request input**: **Show a screen** với `Resolve Issue Screen`.

Thay đổi này **chưa được lưu**. Bạn bấm **Update workflow** (nút xanh ở góc trên bên phải) trước khi làm gì khác. Nếu đóng trang lúc này, Jira sẽ bỏ thay đổi.

Sau đó, bạn kiểm các transition còn lại. Bạn tick ô **Show transition labels**, rồi bấm lần lượt từng transition và xem khung **Rules**:

- Mọi transition phải có rule trong nhóm **Restrict transition**, với đúng group ghi ở mục 5 của checklist.
- Năm transition `Cancel` còn lại của `AO standard` (từ `New`, `In Progress`, `In Review`, `Ready for QA`, `In QA`) phải có thêm **Show a screen** như transition vừa sửa.
- `Accept` phải có một rule ở nhóm **Perform actions** đặt Resolution là `Done`.

Sau đó làm tương tự với `AO epic` và `AO sub-task`. Mỗi workflow sửa xong thì bấm **Update workflow**.

Nếu muốn mình đọc giúp cả 24 transition để chỉ đúng chỗ thiếu, bạn nhắn "tạo token". Mình sẽ hướng dẫn tạo token chỉ đọc, đây cũng là bước đầu của T9.

Mình đã ghi vào `tasks/verification.md`: transition `Cancel` từ `Ready` đã có đủ hai rule.

---

# Phiên 6 · Lượt 32 — 2026-10-28 khoảng 01:15

**Bạn:**

```markdown
tạo token
```

**Claude:**

Đây là token chỉ đọc cho **tài khoản Atlassian của bạn**, tức tài khoản admin của site, không phải hai service account. Token này dùng để mình đọc cấu hình Jira: workflow, scheme, field, board. Nó cũng là token `jira:check` cần ở T9. Danh sách scope dưới đây mình lấy từ OpenAPI spec của Jira, theo từng API sẽ gọi. Không có scope nào cho quyền ghi.

**Bước 1: tạo token**

1. Mở <https://id.atlassian.com/manage-profile/security/api-tokens>, đăng nhập bằng tài khoản admin của bạn.
2. Bấm **Create API token with scopes**.
3. Ô tên gõ `ao-jira-check`. Ngày hết hạn chọn 365 ngày, mức tối đa; token chỉ đọc nên để dài cho đỡ phải tạo lại. Bấm **Next**.
4. Chọn app **Jira** → **Next**.
5. Tick đủ 20 scope sau. Gõ tên vào ô tìm cho nhanh. Nếu bảng báo "No scopes available" thì bấm đặt lại bộ lọc và quay về trang 1, như lần tạo token cho service account.
   - `read:jira-work`
   - `read:workflow:jira`
   - `read:workflow-scheme:jira`
   - `read:issue-type-scheme:jira`
   - `read:issue-type:jira`
   - `read:project:jira`
   - `read:project-category:jira`
   - `read:application-role:jira`
   - `read:avatar:jira`
   - `read:group:jira`
   - `read:user:jira`
   - `read:field:jira`
   - `read:custom-field-contextual-configuration:jira`
   - `read:field.option:jira`
   - `read:issue-type-screen-scheme:jira`
   - `read:screen-scheme:jira`
   - `read:screen-tab:jira`
   - `read:screenable-field:jira`
   - `read:board-scope:jira-software`
   - `read:board-scope.admin:jira-software`
6. **Next** → xem lại danh sách → **Create**.
7. Bấm **Copy to clipboard**. Đừng dán token vào chat, VS Code hay file ghi chú; dán thẳng vào bước 2.

**Bước 2: đặt biến môi trường** (giống lần trước)

1. Bấm Start, gõ `environment` → mở **Edit environment variables for your account**.
2. Ở phần **User variables**, bấm **New...** → **Variable name** `JIRA_ADMIN_TOKEN`, **Variable value** dán token → **OK**.
3. Bấm **New...** lần nữa → `JIRA_ADMIN_EMAIL`, giá trị là email bạn dùng đăng nhập Atlassian → **OK** → **OK**.

Xong thì nhắn mình "xong". Mình sẽ đọc token từ biến môi trường (không in ra), gọi thử một request, rồi đọc cả ba workflow và liệt kê transition nào thiếu rule gì.

Ghi chú về scope: nhiều API cấu hình của Jira chỉ có scope cổ điển `manage:jira-configuration`, mà scope này cho cả quyền ghi. Vì vậy mình dùng các scope chi tiết (granular) chỉ đọc thay thế. Khi một API cần bộ scope chi tiết, phải có đủ cả bộ; ví dụ API đọc workflow scheme của space cần 9 scope. Đó là lý do danh sách dài.

---

# Phiên 6 · Lượt 33 — 2026-10-28 khoảng 01:25

**Bạn:**

```markdown
xong
```

**Claude:**

Token `JIRA_ADMIN_TOKEN` đã có trong biến môi trường. Nhưng còn thiếu `JIRA_ADMIN_EMAIL`: mình kiểm cả biến của tài khoản lẫn biến hệ thống, đều không có biến này. Token có scope phải đi kèm email đăng nhập (Jira dùng cặp email và token), nên request thử trả về 401.

Bạn thêm biến này:

1. Bấm Start, gõ `environment` → mở **Edit environment variables for your account**.
2. Phần **User variables** → **New...** → **Variable name** gõ `JIRA_ADMIN_EMAIL`, **Variable value** gõ email bạn dùng đăng nhập Atlassian → **OK** → **OK**.

Xong thì nhắn mình "xong", mình chạy lại.

---

# Phiên 6 · Lượt 34 — 2026-10-28 khoảng 01:20

**Bạn:**

```markdown
xong
```

**Claude:**

Token chạy được. Mình đã đọc cả ba workflow, và ba group.

**Đã đúng:**

- Ba group có đúng thành viên: `ao-humans` có bạn, `ao-agents` có `orchestratoragent`, `ao-automation` có `orchestratorci`. Câu hỏi "service account có thêm được vào group không" giờ đã có câu trả lời: được.
- Status, tên transition và đường đi (từ đâu tới đâu) của cả ba workflow đều khớp checklist.
- 6 transition đã có rule Restrict đúng group: `Refine`, `Start`, `Submit`, `Request changes`, `Deploy to QA`, `Pick up` của `AO standard`.

**Còn thiếu: 18 transition chưa có rule nào.** Bảng dưới là những gì cần thêm:

| Workflow | Transition | Từ → tới | Cần thêm |
|---|---|---|---|
| `AO standard` | `QA fail` | In QA → In Progress | Restrict `ao-agents` |
| `AO standard` | `Accept` | In QA → Done | Restrict `ao-humans`, đặt Resolution `Done` |
| `AO standard` | `Cancel` × 6 | New, Ready, In Progress, In Review, Ready for QA, In QA → Cancelled | Restrict `ao-humans`, Show a screen |
| `AO epic` | `Start spec` | New → Specifying | Restrict `ao-humans` |
| `AO epic` | `Approve spec` | Specifying → Planning | Restrict `ao-humans` |
| `AO epic` | `Approve plan` | Planning → In Progress | Restrict `ao-humans` |
| `AO epic` | `Complete` | In Progress → Done | Restrict `ao-humans`, đặt Resolution `Done` |
| `AO epic` | `Cancel` × 4 | New, Specifying, Planning, In Progress → Cancelled | Restrict `ao-humans`, Show a screen |
| `AO sub-task` | `Start` | To Do → In Progress | Restrict `ao-agents` |
| `AO sub-task` | `Complete` | In Progress → Done | Restrict `ao-agents`, đặt Resolution `Done` |

Riêng `Cancel` từ `Ready`: bản Jira đã lưu vẫn chưa có rule nào. Vậy là hai rule bạn thêm ở lượt trước **chưa được lưu**. Nếu tab đó còn mở và nút **Update workflow** còn sáng thì bấm nó; nếu không, bạn thêm lại.

**Cách thêm từng loại rule** (bấm nhãn transition trên sơ đồ, rồi làm trong khung **Rules** bên phải):

- **Restrict:** nhóm **Restrict transition** → **Add restrict transition rule** → **Restrict who can move a work item** → **Select** → **Restrict to** chọn **Groups** → chọn group → **Add**.
- **Show a screen:** nhóm **Request input** → **Add request input rule** → **Show a screen** → **Select a screen** chọn `Resolve Issue Screen` → **Add**.
- **Đặt Resolution `Done`:** nhóm **Perform actions** → **Add perform actions rule** → **Update an issue field** (có thể tên **Update a work item field**) → **Select** → ô **Update this field** chọn **Resolution** → giá trị `Done`, chọn cái đầu danh sách → **Add**. Nếu không thấy rule này, chụp danh sách gửi mình.

Mỗi workflow sửa xong thì bấm **Update workflow** ngay, đừng để dồn sang workflow khác. Làm xong cả ba, bạn nhắn "xong", mình đọc lại và báo còn thiếu gì, rồi ta làm Story thử thứ hai.

Mình đã ghi vào `tasks/verification.md`: mục 1 đã kiểm qua REST; mục 5 đang sửa, kèm bảng các transition thiếu rule; và danh sách 20 scope của token chỉ đọc, cho T9. Bước tạo rule đặt Resolution trong checklist giờ ghi đúng tên **Update an issue field**, lấy từ tài liệu của Atlassian.

Nguồn: [Configure resolutions in a Jira workflow](https://support.atlassian.com/jira-cloud-administration/docs/configure-resolutions-in-a-jira-workflow/)

---

# Phiên 6 · Lượt 35 — 2026-10-28 khoảng 01:30

**Bạn:**

```markdown
Bạn thêm các rule luôn giúp tôi được không?
```

Trong lúc Claude đang làm, bạn hỏi thêm:

```markdown
Cần tôi cung cấp gì không?
```

**Claude:**

Được, mình thêm qua REST API của Jira. Bạn chỉ cần cung cấp một thứ: **một token tạm có quyền sửa workflow**. Token `ao-jira-check` bạn vừa tạo cố ý chỉ đọc, và nên giữ như vậy cho `jira:check`.

**Tạo token tạm**

1. Mở <https://id.atlassian.com/manage-profile/security/api-tokens> → **Create API token with scopes**.
2. Tên `ao-workflow-edit`, hạn **1 ngày** → **Next** → app **Jira** → **Next**.
3. Tick 6 scope:
   - `write:workflow:jira` (sửa workflow, scope ghi duy nhất)
   - `read:workflow:jira`
   - `read:screen:jira` (tìm id của `Resolve Issue Screen`)
   - `read:project:jira`
   - `read:avatar:jira`
   - `read:project-category:jira`
4. **Next** → **Create** → **Copy to clipboard**.
5. Mở **Edit environment variables for your account** → **New...** → tên `JIRA_ADMIN_WRITE_TOKEN`, giá trị dán token → **OK** → **OK**. Email thì mình dùng lại `JIRA_ADMIN_EMAIL`.

**Mình sẽ làm gì khi bạn nhắn "xong"**

1. Đọc ba workflow, id của ba group, id của `Resolve Issue Screen` và id của resolution `Done`.
2. Thêm rule cho đúng 18 transition trong bảng lượt trước, theo `tracker/jira.yaml`. Transition đã đúng thì giữ nguyên, status và đường đi không đổi.
3. Gửi bản sửa cho API kiểm tra (validation) của Jira trước. Nếu Jira báo lỗi thì dừng lại và báo bạn, không ghi gì.
4. Nếu hợp lệ thì lưu, rồi đọc lại bằng token chỉ đọc để xác nhận đủ 24 transition.
5. Báo kết quả. Sau đó bạn xóa token `ao-workflow-edit` (trang API tokens → **Revoke**), không cần chờ nó hết hạn.

Lưu ý: nếu bạn còn mở trình sửa workflow có thay đổi chưa lưu, bấm **Discard changes** rồi đóng tab trước khi nhắn "xong", để hai bên không ghi đè lên nhau.

---

# Phiên 6 · Lượt 36 — 2026-10-28 khoảng 01:30

**Bạn:**

```markdown
xong
```

**Claude:**

Xong rồi: cả ba workflow giờ đủ rule cho 24 transition. Mình đã đọc lại bằng token chỉ đọc để xác nhận.

Mình làm theo thứ tự đã hẹn:

1. **Kiểm trước, chưa ghi gì:** script tính ra 17 transition cần sửa, chứ không phải 18, vì `Cancel` từ `Ready` bạn đã lưu trong lúc chờ. API kiểm tra của Jira báo không có lỗi nào.
2. **Lưu:** `AO standard` lên version 3, `AO epic` và `AO sub-task` lên version 2. Status và đường đi không đổi.
3. **Đọc lại:**
   - Mọi transition đều có rule Restrict, đúng group như checklist.
   - 10 transition `Cancel` hiện `Resolve Issue Screen`. Màn hình này có trường Resolution, Fix versions, Assignee và Log Work.
   - `Accept`, `Complete` (epic) và `Complete` (sub-task) đặt Resolution là `Done`, đúng cái `Done` đứng đầu danh sách.

**Việc của bạn bây giờ:**

1. Xóa token tạm: mở <https://id.atlassian.com/manage-profile/security/api-tokens> → dòng `ao-workflow-edit` → **Revoke**.
2. Xóa biến môi trường của nó: **Edit environment variables for your account** → chọn `JIRA_ADMIN_WRITE_TOKEN` → **Delete** → **OK**.
3. Làm Story thử thứ hai:
   - **+ Create** → `DEMO`, `Story`, Summary `Story thử T8 lần 2` → **Create**.
   - Mở Story ở tab **List** → nút status → **Refine**.
   - **Dừng ở đây**, nhắn mình key của Story (ví dụ `DEMO-2`) kèm ảnh danh sách khi bấm nút status `Ready`. Danh sách đó chỉ nên có `Cancel`.

Lúc Story đang ở `Ready`, mình sẽ đọc qua REST xem mỗi service account thấy transition nào. Mong đợi là `orchestratoragent` chỉ thấy `Start`, còn `orchestratorci` không thấy gì. Như vậy ta kiểm được rule Restrict từ cả hai phía. Sau đó bạn mới bấm **Cancel** và chọn Resolution `Won't Do`.

Mình đã ghi vào `tasks/verification.md`: mục 5 xong, cách thêm rule qua REST, và dạng của từng rule trong API. Phát hiện này đáng xem lại: spec mục 2.10 ghi Cấp 1 chưa dựng tự động vì API sửa workflow phức tạp, nhưng thực tế thêm rule qua API khá gọn. Mình sẽ nêu lại sau T10.

---

# Phiên 6 · Lượt 37 — 2026-10-28 khoảng 01:35

**Bạn:**

```markdown
[Image #29]
```

Ảnh đính kèm:

- [Image #29](images/phien-6-luot-37-anh-1.png): trang Story `DEMO-2` "Story thử T8 lần 2" ở status **Ready**; danh sách khi bấm nút status chỉ có **Cancel → Cancelled** và **View workflow**. Khung chi tiết có trường **Agent** ("Add option"). Thông báo "Created Story DEMO-2".

**Claude:**

Rule Restrict có tác dụng trên gói Free. Lúc `DEMO-2` ở `Ready`, mỗi tài khoản chỉ thấy đúng transition của mình:

| Tài khoản | Thấy | Mong đợi |
|---|---|---|
| Bạn (`ao-humans`) | `Cancel` | `Cancel` |
| `orchestratoragent` (`ao-agents`) | `Start` | `Start` |
| `orchestratorci` (`ao-automation`) | không có gì | không có gì |

Ảnh của bạn còn cho thấy trường **Agent** đã hiện trên Story, đúng như cách mình thêm field vào screen.

Giờ bạn bấm **Cancel**. Lần này Jira phải hiện màn hình có ô **Resolution**: chọn `Won't Do` → xác nhận. Xong thì nhắn "xong", mình đọc lại Resolution và lịch sử của `DEMO-2`.

Nhắc lại: biến `JIRA_ADMIN_WRITE_TOKEN` vẫn còn trong máy. Bạn nhớ **Revoke** token `ao-workflow-edit` trên trang API tokens, và xóa biến này đi.

Mình đã ghi kết quả vào `tasks/verification.md`. Việc Jira có từ chối khi agent gọi thẳng một transition bị ẩn hay không, mình sẽ kiểm ở T15.

---

# Phiên 6 · Lượt 38 — 2026-10-28 khoảng 01:40

**Bạn:**

```markdown
xong
```

**Claude:**

`DEMO-2` đạt cả hai việc cần kiểm:

- Lịch sử ghi Resolution `Won't Do` và status `Ready` → `Cancelled` lúc 01:36.
- Rule hỏi Resolution có tác dụng, và rule Restrict đúng với cả ba tài khoản.

**T8 xong.** Mình đã đánh dấu task, mở [PR #26](https://github.com/TungPH7/ai-orchestrator-v1/pull/26) cho nhánh `task/t8-build-demo`, CI xanh và đã merge vào `main`. PR gồm:

- Checklist viết lại thành từng bước bấm, rồi sửa theo giao diện thật qua từng ảnh bạn gửi.
- Kết quả của 12 mục trong `tasks/verification.md`.
- Các phát hiện: gói Free có rule Restrict và rule này chặn được; service account nhận tên tiếng Trung nếu không gửi kèm `Accept-Language`; danh sách 20 scope của token chỉ đọc; 17 transition được thêm rule qua REST.

**Việc cần làm ngay:** token tạm `ao-workflow-edit` **vẫn còn hiệu lực**. Mình vừa gọi thử một request đọc bằng nó và Jira trả 200. Bạn thu hồi nó:

1. Mở <https://id.atlassian.com/manage-profile/security/api-tokens> → dòng `ao-workflow-edit` → **Revoke**.
2. **Edit environment variables for your account** → chọn `JIRA_ADMIN_WRITE_TOKEN` → **Delete** → **OK**.

Tiếp theo là T9: `jira:check` phần 1, kiểm status, transition và scheme. Phần của bạn trong T9 là token chỉ đọc, và bạn đã tạo xong rồi. Mình bắt đầu T9 luôn.

**Claude (tiếp, cùng lượt, sau khi làm T9 và T10):**

T9 và T10 xong, mình dừng ở **Checkpoint 2** để bạn xem.

**T9**, [PR #27](https://github.com/TungPH7/ai-orchestrator-v1/pull/27): `npm run jira:check -- --space <KEY>`

- Client chỉ gửi GET; gặp lệnh ghi thì từ chối trước khi gửi, có test kiểm việc này. Mọi request đều gửi kèm `Accept-Language: en-US`.
- Lệnh kiểm status, transition (thiếu, thừa, sai đường đi), status đầu, workflow scheme và work type của space.

**T10**, [PR #28](https://github.com/TungPH7/ai-orchestrator-v1/pull/28): kiểm nốt phần còn lại.

- Rule của từng transition: Restrict đúng group, `Cancel` có màn hình hỏi Resolution, transition vào Done có đặt Resolution. Đây đúng là những chỗ đã thiếu lúc dựng tay.
- Group và service account trong group, resolution, field và option, board (filter, cột, status trong cột, giới hạn WIP).
- Những gì API không cho đọc, lệnh in thành dòng `Check by hand`: Kanban backlog, cài đặt token của Rovo MCP, app GitHub, field trên screen.
- Lệnh cảnh báo khi token sắp hết hạn (dưới 14 ngày).
- Checklist và `jira:check` giờ dùng chung một module để tính "Jira phải có gì", nên hai bên không thể hiểu ánh xạ khác nhau.

Chạy thật trên `DEMO`: **không có lệch nào**. Bộ test có 260 test, tất cả xanh.

**Checkpoint 2:**

| Mục | Trạng thái |
|---|---|
| Tiêu chí 2: checklist sinh từ ánh xạ, CI báo khi cũ | Đạt |
| Tiêu chí 3: `DEMO` dựng xong, `jira:check` không lệch | Đạt |
| Tiêu chí 6: rule Restrict chặn agent ở transition của bạn | Đạt phần Jira ẩn transition (`DEMO-2`). Phần agent gọi thẳng qua Rovo MCP sẽ thử ở T15 |
| Bạn xem board `DEMO` và `docs/jira-setup.md` | Chờ bạn |

Bạn xem hai thứ này:

1. **Board `DEMO`**: các cột `Ready`, `In Progress`, `In Review` (tối đa 2), `QA`, `Done`; `DEMO-1` và `DEMO-2` ở tab **List**.
2. **`docs/jira-setup.md`** trên `main`: <https://github.com/TungPH7/ai-orchestrator-v1/blob/main/docs/jira-setup.md>. Đây là bản đã sửa theo mọi chỗ ta gặp khi dựng.

Có điều gì muốn đổi thì bạn nói; nếu ổn thì nhắn "qua checkpoint 2", mình sang Giai đoạn 3 (T11–T15: dữ kiện cho guard, hook `jira-guard`, kiểm thật agent).

**Nhắc lần nữa:** token `ao-workflow-edit` **vẫn còn hiệu lực**, mình vừa thử lúc 01:56 và Jira vẫn trả 200. Bạn thu hồi nó: trang <https://id.atlassian.com/manage-profile/security/api-tokens> → `ao-workflow-edit` → **Revoke**. Sau đó xóa biến `JIRA_ADMIN_WRITE_TOKEN` trong **Edit environment variables for your account**.

---

# Phiên 6 · Lượt 39 — 2026-10-28 khoảng 02:30

**Bạn:**

```markdown
qua checkpoint 2
```

**Claude:**

Giai đoạn 3 xong phần code (T11–T14). Giờ tới T15, phần kiểm thật, và bước này cần bạn.

**Đã làm** (mỗi task một PR, CI xanh, đã merge; 315 test):

| Task | PR | Nội dung |
|---|---|---|
| T11 | [#30](https://github.com/TungPH7/ai-orchestrator-v1/pull/30) | Dữ kiện Jira cho guard: `dor-met`, `wip-available` (đếm theo trường Agent, tính theo Sub-task), `subtasks-done`, kết quả báo cáo QA mới nhất |
| T12 | [#31](https://github.com/TungPH7/ai-orchestrator-v1/pull/31) | Dữ kiện GitHub: nhánh, PR mới nhất (sau `qa-fail`), CI, review, merge, deploy lên môi trường QA, commit của Sub-task, item phụ thuộc |
| T13 | [#32](https://github.com/TungPH7/ai-orchestrator-v1/pull/32) | Hook `jira-guard`: lấy vai trò từ `agent_type`, đổi transition sang hợp đồng, gom guard, chặn kèm lý do |
| T14 | [#33](https://github.com/TungPH7/ai-orchestrator-v1/pull/33) | Hook `block-atlassian` (chặn Bash gọi Atlassian, `executeWrite`/`executeDestructive`, connector khác, ghi ngoài space dự án) và hook `jira-rework` (rework lần 3 thì bắt agent gắn cờ rồi dừng) |
| Sửa | [#34](https://github.com/TungPH7/ai-orchestrator-v1/pull/34), [#35](https://github.com/TungPH7/ai-orchestrator-v1/pull/35) | Hai lỗi lộ ra khi chạy hook trong `ao-pilot`: hook đòi thư mục `templates/` mà bản chép không có; và `qa` gọi `Accept` bị chặn vì status thay vì vì vai trò |

**Hai quyết định mới để bạn biết:**

1. **Key của space đặt ở biến `AO_JIRA_SPACE`**, trong mục `env` của `.claude/settings.json` của dự án. Spec chưa có chỗ khai báo space của dự án, mà hook cần nó để chặn agent ghi vào space khác (ví dụ `SCRUM`). Chưa đặt thì mọi lệnh ghi bị chặn. Mình đã ghi thêm vào spec mục 2.6.
2. **Token GitHub cho hook trên máy bạn** lấy từ `GITHUB_TOKEN`, hoặc từ GitHub CLI. `gh` của bạn là bản 2.16, chưa có `gh auth token`, nên hook đọc dòng `Token:` của `gh auth status --show-token`.

**Đã chuẩn bị `ao-pilot` cho T15** (chưa commit): bản chép `contract/`, `lib/`, `tracker/` trong `.ai-orchestrator/` (đã cài `ajv`, `yaml`), `.mcp.json`, ba hook và `.claude/settings.json` với `AO_JIRA_SPACE: DEMO`, cùng hai subagent thử `fe-dev` và `qa`. Mình đã chạy thử các hook ngay trong `ao-pilot`, và chúng chặn đúng.

**Việc của bạn (một lần, khoảng 2 phút):**

1. Mở PowerShell mới, gõ:
   ```
   cd D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ao-pilot
   claude
   ```
2. Hộp hỏi có tin thư mục này không: chọn đồng ý (Yes, trust).
3. Hộp báo có MCP server mới `atlassian` trong `.mcp.json`: chọn dùng server này. Nếu tên lựa chọn khác, chọn dòng cho phép server `atlassian`.
4. Gõ `/mcp`: dòng `atlassian` phải hiện connected. Nếu báo lỗi, chụp màn hình gửi mình.
5. Gõ `/exit`, rồi nhắn mình "xong".

Sau đó mình chạy các kịch bản bằng `claude -p` trong `ao-pilot`:

- `fe-dev` tạo, đọc, tìm một Story trên `DEMO`.
- Phiên chính (không phải subagent) gọi transition: phải bị chặn.
- `qa` gọi `Accept`: phải bị chặn.
- `fe-dev` gọi `Start` khi đủ guard: phải được cho qua, và lịch sử item ghi `orchestratoragent`.

Ở bước `Start`, Story cần ở `Ready` và có nhánh trên GitHub. Lúc đó mình sẽ nhờ bạn bấm **Refine** trên Jira, còn nhánh thì mình tự đẩy lên `ao-pilot`.

**Nhắc lần thứ ba:** token `ao-workflow-edit` vẫn còn hiệu lực, mình vừa thử lúc 02:28. Bạn **Revoke** nó ở <https://id.atlassian.com/manage-profile/security/api-tokens>, rồi xóa biến `JIRA_ADMIN_WRITE_TOKEN`.

---

# Phiên 7 · Lượt 1 — 2026-10-28 11:10

**Bạn:**

```markdown
Tôi chưa hiểu đoạn này lắm "Một thay đổi nhỏ về cách hiểu "yêu cầu sửa" (đã ghi vào spec mục 2.8): guard changes-requested giờ chỉ tính review trên commit mới nhất của PR. Dev push bản sửa là đã trả lời yêu cầu sửa; review yêu cầu sửa trên commit cũ không còn kéo item về. Nếu giữ cách cũ, sau mỗi lần dev sửa, jira-sync sẽ đẩy item lên In Review rồi kéo về ngay, mỗi lần kéo về lại đếm thêm một rework. Bạn thấy cách hiểu này không hợp thì báo mình."

GIải thích chậm hơn giúp tôi nhé
```

**Claude:**

Mình giải thích lại bằng một ví dụ cụ thể.

**Ba điều cần biết trước**

1. Trên GitHub, mỗi lần dev push, PR có thêm một commit. Commit mới nhất chính là phiên bản code hiện tại của PR.
2. Mỗi review trên GitHub gắn với đúng commit mà reviewer đã xem. Một PR có thể có nhiều review qua nhiều vòng, ví dụ vòng 1 là "Request changes", vòng 2 là "Approve".
3. `jira-sync` (sẽ làm ở T17) không nhớ gì giữa các lần chạy. Mỗi khi GitHub có chuyện (push, CI chạy xong, có review), nó nhìn tình trạng hiện tại của PR rồi quyết định item trên Jira nên ở đâu. Một trong các câu nó tự hỏi là: "PR này có đang bị yêu cầu sửa không?". Đó là guard `changes-requested`. Nếu câu trả lời là "có" trong lúc item ở In Review, item về In Progress và số rework tăng 1.

Thay đổi của mình nằm ở cách trả lời câu hỏi đó.

**Ví dụ: Story `DEMO-5` với một vòng sửa bình thường**

| Giờ | Chuyện xảy ra trên GitHub | Item nên ở đâu |
|---|---|---|
| 9:00 | Dev mở PR với commit A, CI xanh | In Review |
| 10:00 | Reviewer xem commit A, bấm **Request changes** | In Progress, rework = 1 |
| 11:00 | Dev sửa xong, push commit B, CI xanh | In Review, chờ reviewer xem lại |
| 11:30 | Reviewer xem commit B, bấm **Approve** | In Review, chờ merge |

Hai cách hiểu khác nhau ở mốc 11:00.

**Cách cũ:** "PR đang bị yêu cầu sửa nếu review mới nhất là Request changes."

Lúc 11:00 reviewer chưa xem lại, nên review mới nhất vẫn là Request changes của 10:00, trên commit A. `jira-sync` thấy PR mở và CI xanh, nên muốn đưa item lên In Review. Nhưng nó cũng thấy "đang bị yêu cầu sửa", nên muốn kéo item về In Progress. Hậu quả:

- Nếu nó làm theo cả hai, item lên In Review rồi xuống In Progress mỗi khi GitHub có sự kiện, và mỗi lần xuống lại tính thêm một rework. Sau vài lần, item chạm giới hạn 3 rework và bị gắn `needs-you`, dù không ai yêu cầu sửa thêm. Đây là điều mình nói ở tin trước.
- Thực ra T16 có thêm một quy tắc chống lên xuống: không đưa item lên nếu ngay sau đó nó sẽ bị kéo về. Với quy tắc này, item không lên xuống nữa mà **kẹt ở In Progress**. Reviewer chỉ xem item ở In Review, nên không ai xem commit B, và review cũ mãi là review mới nhất. Item kẹt vĩnh viễn. Tin trước mình chỉ nói hậu quả thứ nhất; hậu quả thật với code hiện tại là hậu quả này.

**Cách mới:** "PR đang bị yêu cầu sửa nếu, chỉ xét các review trên commit mới nhất, review mới nhất là Request changes." CI đỏ trên commit mới nhất vẫn tính là bị yêu cầu sửa, như trước.

Lúc 11:00, commit mới nhất là B và chưa ai review B, nên câu trả lời là "không". Item lên In Review, reviewer xem B. Nếu reviewer lại bấm Request changes trên B, item về In Progress với rework = 2. Đó là vòng sửa thật thứ hai, nên đếm như vậy là đúng.

Nói ngắn: **dev push bản sửa thì coi như đã trả lời yêu cầu sửa, và đến lượt reviewer xem lại.**

**Cái giá của cách mới:** nếu dev push một commit chưa sửa gì (ví dụ chỉ sửa chính tả), item vẫn lên In Review. Reviewer thấy chưa sửa thì bấm Request changes lần nữa, item về In Progress và rework tăng 1. Mình thấy chấp nhận được, vì reviewer vẫn là người quyết định cuối.

**Những gì không đổi:**

- CI đỏ trên commit mới nhất vẫn kéo item về In Progress.
- Trên GitHub, PR vẫn hiện "Changes requested" cho tới khi reviewer xem lại. Thay đổi chỉ nằm ở cách `jira-sync` đọc trạng thái đó để chuyển item trên Jira.

Bạn đồng ý thì mình giữ cách mới và làm tiếp T17. Còn một cách khác: bắt reviewer bấm **Dismiss review** cho review cũ thì mới tính là đã trả lời. Cách đó thêm một bước tay mỗi vòng sửa; nếu bạn muốn dùng thì báo mình.

---

# Phiên 7 · Lượt 2 — 2026-10-28 khoảng 11:15

**Bạn:**

```markdown
đồng ý  giữ cách mới và làm tiếp T17
```

**Claude:**

Mình giữ cách mới cho `changes-requested`, và T17 đã xong: `jira-sync` chạy được, PR #41 đã merge, CI xanh, 350 test qua.

**Đã làm** (4 lát, mỗi lát một commit, test viết trước):

| Phần | Nội dung |
|---|---|
| Jira client | Ghi được khi tạo với `write: true`: chuyển transition theo tên, sửa item, comment. Mặc định vẫn chỉ đọc |
| `lib/tracker/sync.mjs` | Từ một sự kiện GitHub, tìm các item liên quan, gọi `reconcile` (T16), rồi chuyển item. Có payload mẫu cho 5 loại sự kiện |
| `scripts/jira-sync.mjs` và `kit/.github/workflows/jira-sync.yml` | Script chạy trên GitHub Actions; `--dry-run` chỉ in, không ghi gì |
| Báo item đang chờ gì | Ví dụ `Waiting DEMO-11: Deploy to QA needs merge-approved`. Tiêu chí của T18 cần dòng này |

**Kiểm tay:** mình chạy dry run với Jira và GitHub thật, bằng token CI. `DEMO-3` cho ra `Waiting DEMO-3: Submit needs pr-open, ci-green`, đúng vì item chưa có PR. Item `SCRUM-1` bị bỏ qua vì không thuộc `DEMO`.

**Bốn quyết định mới, để bạn biết:**

1. `jira-sync` chỉ chạm item trong space của dự án (`DEMO`), vì trên gói Free token CI ghi được mọi space, kể cả `SCRUM`.
2. Login GitHub của bạn, dùng để kiểm "PR đã được bạn approve", khai báo ở `AO_APPROVERS` trong `.claude/settings.json` của dự án, cạnh `AO_JIRA_SPACE`. Mỗi dự án chỉ khai báo ở một chỗ.
3. Cloud id lấy từ `tracker/jira.yaml`, nên không cần biến `JIRA_CLOUD_ID` như spec ghi lúc đầu. Spec mục 2.7 đã sửa.
4. Workflow chạy với mọi review, không chỉ review yêu cầu sửa, vì một approve đến muộn vẫn có thể đưa item đã merge và deploy sang QA.

**Tiếp theo là T18:** kiểm thật trên `ao-pilot`. Mình sẽ đưa workflow lên `main`, thêm một CI nhỏ và một workflow deploy giả, rồi chạy các kịch bản với `DEMO-3`. Secret `JIRA_CI_TOKEN` mình đặt bằng `gh secret set`, đọc token thẳng từ registry nên token không hiện ra đâu. Bạn nhắn "tiếp" thì mình làm.

---

# Phiên 9 · Lượt 1 — 2026-10-28 16:22

**Bạn:**

```markdown
Tiếp tục session id: 56ad3187-0f02-4139-9d15-eff3c7191377

- Xác nhận module hoàn thành
- Chọn làm quality-gates trước
```

**Claude:**

_Không có câu trả lời. Claude đánh dấu ô cuối "Bạn xác nhận module hoàn thành" của `tracker-integration` (PR #45, đã merge), tạo nhánh `task/spec-quality-gates`, đọc lại spec và tra tài liệu GitHub. Sau đó câu trả lời bị bộ lọc an toàn dừng giữa chừng, rồi lần gọi tiếp theo báo lỗi API._

---

# Phiên 10 · Lượt 1 — 2026-10-28 16:35

**Bạn:**

```markdown
Tiếp tục session id: 79cccd91-9d3a-495d-a154-927ae2ce5928
```

Trước lượt này, bạn chạy `/model` hai lần, lần cuối chọn Opus 5.5.

**Claude:**

Phiên trước (79cccd91) đã đánh dấu ô cuối của `tracker-integration` (PR #45 đã merge) và tạo nhánh `task/spec-quality-gates`. Sau đó câu trả lời bị bộ lọc an toàn chặn trước khi tới phần giả định, nên mình làm lại phần đó ở đây.

## Phạm vi của `quality-gates`

Theo capability map, module này gồm hook ở local, CI trên PR, bảo vệ nhánh và script kiểm artifact. Từ `tracker-integration` chuyển sang thêm ba việc:

- Gắn các hàm kiểm quy ước nhánh, commit, tiêu đề PR (`lib/tracker/conventions.mjs`) vào hook và CI.
- Chọn danh tính để agent mở PR. Bạn không approve được PR do chính tài khoản `TungPH7` mở (mục 11 của `SPEC-tracker-integration.md`).
- Kiểm thật chặng `deploy-to-qa` của tiêu chí 7: PR có approve của bạn, merge, deploy lên `development`, rồi item sang Ready for QA.

## Điều mình vừa kiểm

- `ao-pilot` là repo private của tài khoản cá nhân dùng gói Free. Gọi API branch protection và rulesets đều nhận 403: "Upgrade to GitHub Pro or make this repository public to enable this feature." Trang gói của GitHub cũng xếp protected branches, required reviewers và code owners cho repo private vào gói Pro.
- Auto-merge chỉ merge "after all required reviews and status checks pass". Khi không có rule bắt buộc nào, auto-merge không có gì để chờ.
- Tác giả PR không approve và không request changes được PR của chính mình, kể cả khi tác giả là bot.
- Sự kiện do `GITHUB_TOKEN` tạo ra không kích hoạt workflow khác. Nếu một workflow merge PR bằng `GITHUB_TOKEN`, push vào `develop` sẽ không chạy deploy lên Development. Token của GitHub App hoặc PAT thì kích hoạt được.
- Fine-grained PAT không dùng được trên repo mà tài khoản chỉ là collaborator, nên một tài khoản máy sẽ phải dùng classic PAT.
- Code scanning (CodeQL), secret scanning và push protection cho repo private phải mua riêng, và chỉ tổ chức ở gói Team hoặc Enterprise mới mua được.
- Gói Free có 2.000 phút GitHub Actions mỗi tháng cho repo private, nên CI của kit phải gọn.

## Giả định (sửa ngay nếu sai)

1. **Chưa có code Next.js + NestJS.** CI của kit không gắn với stack nào. Nó gọi các npm script có tên cố định mà dự án phải có: `lint`, `typecheck`, `test:coverage` (xuất file lcov) và `build`. `project-scaffold` sẽ viết các script này cho Next.js + NestJS. Module này kiểm trên `ao-pilot` bằng một package TypeScript nhỏ.
2. **Workflow CI của kit tên `CI`**, vì `jira-sync` chờ workflow có tên này. Nó thay CI nhỏ đang có trong `ao-pilot`. Check nào đỏ cũng chặn ngay từ đầu, vì dự án mới chưa có code cũ để cho nợ:

   | Check | Công cụ | Đỏ khi |
   |---|---|---|
   | `conventions` | `conventions.mjs` | Tên nhánh, một commit trong PR, hoặc tiêu đề PR sai quy ước |
   | `lint`, `typecheck`, `build` | npm script của dự án | Có lỗi |
   | `test` | `test:coverage` và một script đọc lcov | Test fail, hoặc các dòng PR thêm/sửa có coverage dưới 80% |
   | `secrets` | gitleaks, quét mọi commit của PR | Có secret |
   | `sast` | Semgrep CE (`p/default`, `p/owasp-top-ten`), gọi qua `uvx` | Có finding mức ERROR |
   | `deps` | `npm audit --audit-level=high` | Có lỗ hổng high hoặc critical |
   | `suppressions` | Script đọc diff | PR thêm `eslint-disable`, `@ts-ignore`, `.skip`, `.only`, `istanbul ignore`, `nosemgrep` hoặc `gitleaks:allow` mà không ghi lý do ngay trên dòng đó, hoặc PR hạ một ngưỡng |
   | `artifacts` | Script đọc PR | Mô tả PR thiếu mục bắt buộc của template; chưa có báo cáo review của `reviewer` và `security` trên commit mới nhất; hoặc còn finding Critical/High |

3. **Ngưỡng** theo mặc định của skill `constraint-driven-development`: coverage của các dòng thay đổi từ 80% trở lên. Ngưỡng cho cả dự án ("coverage không được giảm") để tới khi có code thật. Các ngưỡng nằm trong một file cấu hình của kit.
4. **Hook git ở local** đặt qua `core.hooksPath` (script `prepare` của npm tự đặt khi chạy `npm install`), không thêm husky. `pre-commit` chạy secretlint (gói npm) và lint trên file đã stage. `commit-msg` kiểm quy ước commit. `pre-push` chặn push thẳng lên `develop`, `main`, `release/*`, nhưng vẫn cho tạo nhánh `release/*` mới. Semgrep, gitleaks và `npm audit` chỉ chạy ở CI, vì máy bạn không có Python.
5. **Hook của Claude Code** chặn agent chạy `git commit --no-verify`, `git push --no-verify`, `gh pr merge`, `gh pr review --approve`, `gh auth token`, và `gh api` gọi endpoint merge hoặc review. Agent chạy trên máy bạn, dùng `gh` đang đăng nhập bằng `TungPH7`, nên nếu không chặn thì agent approve thay bạn được. Chặn như vậy giảm rủi ro nhưng không kín hoàn toàn, vì agent vẫn dùng chung máy và tài khoản với bạn.
6. **Cách merge:** PR của Story, Task, Bug vào `develop` dùng squash, nên mỗi item thành một commit trên `develop`, mang tiêu đề PR `type(scope): subject (<KEY>)`. Merge `release/*` vào `main` và merge ngược về `develop` dùng merge commit, theo GitFlow.

## Câu hỏi

**1. Bảo vệ nhánh thế nào khi repo private ở gói Free?**

- **(a) Ở lại Free, chốt ở bước merge và deploy (mình đề xuất).** Bạn chỉ approve trên PR. Workflow `merge-gate` của kit kiểm lại mọi check và approve của bạn, rồi tự merge bằng token của danh tính ở câu 2, để push vào `develop` kích hoạt deploy. Workflow `audit` chạy trên mỗi commit vào `develop`, `main`, `release/*`, và deploy chỉ chạy khi `audit` xanh. Nút Merge trên giao diện vẫn bấm được, vì GitHub không chặn, nhưng commit merge tay sẽ đỏ `audit` và không được deploy. Kit có thêm script tự áp ruleset khi repo hỗ trợ (repo public, hoặc khi bạn lên Pro), nên sau này đổi gói thì không phải sửa kit. Hợp đồng cần sửa một chỗ: điều kiện qua stage `merge` đổi từ "Branch protection pass" thành "`merge-gate` pass".
- **(b) Lên GitHub Pro**, khoảng 4 USD mỗi tháng theo một bài viết tháng 7/2026; trang giá chính thức không ghi giá Pro, bạn xem giá thật ở Settings → Billing and plans trước khi nâng. Repo private có branch protection, required checks, required approval và auto-merge thật. Mình vẫn làm `audit` để kit chạy được cả với repo ở gói Free.
- **(c) Để repo dự án public.** Ruleset miễn phí, nhưng code lộ ra ngoài, nên không dùng được cho dự án của khách.

**2. Agent mở PR bằng danh tính nào?**

- **(a) Hai GitHub App do bạn tạo, chỉ cài vào repo dự án (mình đề xuất).** Dev agent mở PR bằng `ao-dev`, và `merge-gate` cũng merge bằng app này. Reviewer và security đăng báo cáo review bằng `ao-review`, và request changes khi còn finding Critical/High. Cần hai danh tính vì tác giả PR không request changes được PR của mình, trong khi guard `changes-requested` dựa vào review "request changes". Token chỉ sống một giờ; script của kit tạo token từ private key để ngoài repo. Cách này miễn phí và không cần email mới. Bạn tạo mỗi app theo hướng dẫn từng bước.
- **(b) Tài khoản máy.** Một tài khoản GitHub thứ hai, cần email khác; điều khoản của GitHub cho mỗi người giữ thêm đúng một tài khoản máy miễn phí. Tài khoản này dùng classic PAT quyền `repo`, sống lâu. Một tài khoản máy chỉ là một danh tính, nên reviewer vẫn cần thêm một App, hoặc phải đổi guard `changes-requested`.

Bạn trả lời hai câu trên và sửa giả định nếu cần. Sau đó mình viết `SPEC-quality-gates.md` rồi dừng lại để bạn duyệt.

## Nguồn

- [GitHub Docs: GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
- [GitHub Docs: Automatically merging a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [GitHub Docs: GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)
- [GitHub Docs: Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub Docs: About GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security)
- [GitHub Terms of Service, mục B.3](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- [Capital & Compute: GitHub pricing plans (7/2026)](https://capitalandcompute.net/blog/github-pricing-plans-cost/)

---

# Phiên 10 · Lượt 2 — 2026-10-29 khoảng 00:20

**Bạn:**

```markdown
Trả lời
1. (a)
2. (a)
```

**Claude:**

Mình đã viết `SPEC-quality-gates.md` theo hai lựa chọn của bạn (1a, 2a). Spec nằm trên nhánh `task/spec-quality-gates`, chưa mở PR: như hai module trước, spec và plan sẽ vào `main` cùng một PR sau khi bạn duyệt.

## Tóm tắt

**Bốn lớp chốt** (mục 2.1), vì repo private ở gói Free không có branch protection:

1. **Hook git ở local:** `commit-msg` kiểm quy ước, `pre-commit` quét secret bằng secretlint, `pre-push` chặn push thẳng lên `develop`, `main`, `release/*`.
2. **Hook `gh-guard` của Claude Code:** chặn agent bỏ qua hook git, tự merge, tự approve, lấy token, sửa file của kit.
3. **`merge-gate`:** tự squash PR vào `develop` khi đủ điều kiện, trong đó có approve của bạn trên commit mới nhất. Nó chạy bằng bản trên nhánh mặc định (`workflow_run` sau `jira-sync`), nên PR không sửa được nó.
4. **`audit`:** chạy trước mỗi lần deploy. Commit không qua cổng thì không được deploy, và item Jira bị gắn cờ "Needs you".

**CI** gồm bốn job để tiết kiệm phút Actions: `policy` (quy ước, mẫu tắt kiểm tra, ngưỡng bị hạ, `npm audit`), `build-test` (lint, typecheck, test, coverage của dòng thay đổi từ 80%, build), `secrets` (gitleaks) và `sast` (Semgrep).

**Hai App:** `ao-dev` mở PR và merge; `ao-review` đăng báo cáo review. Agent chỉ làm việc với PR qua script `ao-pr.mjs`, và không bao giờ approve.

**File được bảo vệ** (`.github/workflows/**`, `.githooks/**`, `.claude/**`, `.ai-orchestrator/**`): PR của agent sửa các file này thì `merge-gate` không merge; bạn đọc diff rồi tự merge. Đây là chỗ hở lớn nhất của gói Free: workflow chạy theo `pull_request` và `push` dùng bản nằm trong commit, nên một PR sửa workflow có thể tự làm CI của nó xanh.

**Ba thay đổi cần bạn duyệt cùng spec** (mục 2.9):

1. Stage `merge` của hợp đồng: điều kiện "Branch protection pass" đổi thành "`merge-gate` pass".
2. Template `review-report.md` thêm dòng `Role: reviewer` hoặc `Role: security`, vì hai vai trò dùng chung một App.
3. Capability map: `quality-gates` phụ thuộc thêm `tracker-integration`. Thứ tự build không đổi, vì module đó đã xong.

**Một điều mình phát hiện khi viết spec** (mục 12): secret của repo, kể cả `JIRA_CI_TOKEN`, đọc được từ workflow chạy trên bất kỳ nhánh nào. Để giảm rủi ro, key của `ao-dev` nằm trong một environment chỉ cho nhánh mặc định. API nhận cấu hình này trên gói Free (mình đã tạo thử environment `probe-gate` trên `ao-pilot` rồi xóa ngay), nhưng chưa biết GitHub có thực thi hay không; tiêu chí 10 kiểm điều đó.

## Câu hỏi mở

1. **Kiểm ruleset trên một repo public tạm?** Trên `ao-pilot` chỉ kiểm được soft mode. Mình đề xuất tạo repo public rỗng `TungPH7/ao-ruleset-probe`, chạy `gh:protect`, đọc lại ruleset, rồi xóa repo. Nếu bạn không muốn, phần áp ruleset chỉ có test đơn vị.
2. **Tên hai App:** tên App là duy nhất trên toàn GitHub. Mình đề xuất `tungph7-ao-dev` và `tungph7-ao-review`.

Bạn đọc spec, trả lời hai câu trên, rồi duyệt hoặc yêu cầu sửa. Mình chỉ lập plan sau khi bạn duyệt.

---

# Phiên 10 · Lượt 3 — 2026-10-29 khoảng 00:45

**Bạn:**

```markdown
Ba thay đổi cần bạn duyệt cùng spec (mục 2.9) => Tôi duyệt
Câu hỏi mở:
1. tạo đi nhé
2. OK
```

**Claude:**

Mình ghi nhận: bạn duyệt spec cùng ba thay đổi, đồng ý tạo repo public tạm, và đồng ý hai tên App. Spec đã chuyển sang "đã duyệt", hai câu hỏi mở đã đóng, và capability map trong `SPEC.md` đã thêm phụ thuộc vào `tracker-integration`. Repo public tạm `TungPH7/ao-ruleset-probe` mình chưa tạo ngay: nó chỉ cần lúc kiểm `gh:protect` ở T17, và bị xóa ngay sau đó.

Plan có 21 task trong 6 giai đoạn, ở `tasks/plan.md` và `tasks/todo.md`:

| Giai đoạn | Task | Nội dung |
|---|---|---|
| 1. Danh tính và nền | T1–T5 | Bạn tạo hai App; token của App; kiểm ba giả định nền; `quality/gates.yaml` với quy tắc Q1, Q3, Q4; hai thay đổi hợp đồng |
| 2. Kiểm ở máy bạn | T6–T9 | Hook `commit-msg`, `pre-push`, `pre-commit`; hook `gh-guard`; script `ao-pr.mjs` |
| 3. CI | T10–T13 | Coverage của dòng thay đổi; job `policy`; workflow `CI` với quy tắc Q2; kiểm thật trên `ao-pilot` |
| 4. merge-gate, audit, ruleset | T14–T17 | `decideMerge`, `merge-gate`, `audit`, `gh:protect` |
| 5. Kiểm thật đầu cuối | T18–T20 | Agent mở PR và review; `merge-gate` merge, item sang Ready for QA; `audit` chặn merge tay |
| 6. Hoàn thiện | T21 | README, tài liệu, lưu trữ plan |

**Ba điểm chính của plan:**

1. **T3 kiểm ba giả định nền trước khi viết `merge-gate`:** bot `ao-review` request changes được trên PR của bot `ao-dev`; merge bằng token App vẫn kích hoạt workflow deploy; giới hạn nhánh của environment có hiệu lực trên gói Free. Giả định nào sai thì mình dừng, đề xuất sửa spec và chờ bạn duyệt.
2. **Cài kit lên `ao-pilot` bằng phiên chính, push thẳng lên `main` và `develop`**, vì `merge-gate` và `jira-sync` phải nằm trên nhánh mặc định mới chạy. Các commit này sẽ đỏ `audit` và không được deploy, đúng thiết kế. Cách này chỉ dùng cho sandbox.
3. **Dùng lại `facts.mjs`**, để "CI xanh" và "yêu cầu sửa" trong `merge-gate` được tính đúng như guard của `jira-sync`.

**Việc bạn sẽ làm** (task có nhãn [bạn]; mình ghi từng bước bấm rồi dừng chờ):

- T1: tạo hai App, lưu hai file private key ngoài repo, cài App vào `ao-pilot`, đặt hai biến môi trường.
- T3 và T19: approve PR thử trên GitHub.
- T17: cấp thêm quyền xóa repo cho `gh` nếu cần, để xóa repo public tạm.
- T18: chấp nhận hook mới của dự án khi Claude Code hỏi.
- T20: bấm Merge một PR chưa có approve, để thử `audit`.

Ngoài các bước trên, mình dừng ở 4 checkpoint và checkpoint cuối để bạn soát. Checkpoint 1 gồm kết quả của T3 và các giá trị trong `quality/gates.yaml`.

Bạn duyệt plan hoặc yêu cầu sửa. Duyệt xong, mình merge spec và plan vào `main` bằng một PR, rồi bắt đầu T1 bằng tài liệu hướng dẫn tạo App.

---

# Phiên 10 · Lượt 4 — 2026-10-29 khoảng 00:58

**Bạn:**

```markdown
duyệt nhé, tiếp tục nhé
```

**Claude:**

PR #46 (spec và plan) đã merge vào `main`, CI xanh. Mình bắt đầu T1 trên nhánh `task/t1-github-apps-setup`.

**Mình đã làm:** viết `docs/github-apps-setup.md`, hướng dẫn từng bước bấm, với nhãn nút lấy từ tài liệu GitHub. Có 4 chỗ ghi "(đối chiếu giao diện)": ô chọn quyền ở **Repository permissions**, mục **About** chứa App ID, mục **Credentials → Key pairs** để tạo key, và trang **Configure** khi thêm repo cho dự án sau. Nếu màn hình của bạn khác hướng dẫn, chụp màn hình gửi mình.

**Bạn làm** theo `docs/github-apps-setup.md` (trong VS Code, bấm Ctrl+Shift+V để xem bản đã định dạng):

1. Mục 1: tạo App `tungph7-ao-dev`, rồi App `tungph7-ao-review`. `ao-dev` có Contents và Pull requests đều **Read and write**; `ao-review` có Contents **Read-only** và Pull requests **Read and write**. Bỏ chọn **Active** ở mục Webhook, và chọn **Only on this account**.
2. Mục 2: mỗi App tạo một private key, rồi chuyển file `.pem` vào thư mục `C:\Users\Huu Tung\ao-keys`. Không mở file, không dán nội dung file ở đâu cả.
3. Mục 3: cài cả hai App vào riêng repo `TungPH7/ao-pilot`.
4. Mục 4: đặt hai biến môi trường user `AO_DEV_APP_KEY_FILE` và `AO_REVIEW_APP_KEY_FILE`, giá trị là đường dẫn tới hai file key.
5. Mục 5: gửi mình slug và App ID của hai App, theo mẫu:

```
ao-dev: tungph7-ao-dev, <App ID>
ao-review: tungph7-ao-review, <App ID>
```

Sau đó mình kiểm hai biến môi trường (chỉ in "có" hoặc "không", không in nội dung), làm T2 (lấy token của App), rồi T3: mở PR thử trên `ao-pilot` và nhờ bạn approve một lần.

---

# Phiên 10 · Lượt 5 — 2026-10-29 khoảng 01:07

**Bạn:**

```markdown
Task này mình phải tự làm à, bạn có thể làm được không hay bị giới hanh hay chặn ?
```

**Claude:**

Phần lớn mình làm được. Chỉ còn bước GitHub bắt chính chủ tài khoản xác nhận, và bước đó mình không làm thay được:

- **Tạo App:** GitHub không có API tạo App bằng token. Cách tự động duy nhất là "manifest flow": script gửi sẵn mọi thông số, nhưng bạn vẫn phải bấm nút tạo trên GitHub khi đang đăng nhập.
- **Cài App vào repo:** cũng phải bấm trên giao diện GitHub.
- Phiên này không có công cụ điều khiển trình duyệt. Kể cả có, đây là thao tác cấp quyền trên tài khoản của bạn, nên mình vẫn để bạn tự bấm xác nhận.

Vì vậy mình đã viết script `scripts/github-app-create.mjs` (kèm test) để bạn chỉ còn bấm bốn lần. Script điền sẵn tên, quyền, tắt webhook, chọn "Only on this account", nhận private key thẳng từ GitHub và ghi vào `C:\Users\Huu Tung\ao-keys\`. Bạn không phải điền form, không phải cầm file key, và không phải gửi lại App ID. Hai biến môi trường mình đặt, vì giá trị chỉ là đường dẫn. Mô tả T1 trong `tasks/todo.md` đã sửa theo. Các bước làm tay vẫn còn trong `docs/github-apps-setup.md` để dự phòng.

**Script đang chạy, và mình đã mở trang `http://127.0.0.1:47100/` trên trình duyệt của bạn** (nếu chưa thấy thì mở link này). Bạn làm:

1. Ở App đầu tiên (`tungph7-ao-dev`), bấm **Tạo App trên GitHub**.
2. GitHub mở trang tạo App đã điền sẵn. Kéo xuống cuối, bấm **Create GitHub App for TungPH7** (nhãn có thể hơi khác). GitHub có thể hỏi lại mật khẩu hoặc mã xác thực hai bước.
3. GitHub chuyển sang trang cài App: chọn **Only select repositories**, chọn `ao-pilot` nếu chưa được chọn sẵn, rồi bấm **Install**.
4. GitHub quay về trang `127.0.0.1`. Làm lại bước 1 đến 3 cho App thứ hai (`tungph7-ao-review`).
5. Trang ghi "Xong cả hai App" là xong. Bạn không cần gửi gì: script tự dừng, mình nhận kết quả, đặt biến môi trường rồi làm tiếp T2.

Script chờ tối đa 30 phút. Nếu GitHub báo lỗi (ví dụ tên App đã có người dùng, hoặc từ chối đường dẫn `127.0.0.1`), chụp màn hình gửi mình.

---

# Phiên 10 · Lượt 6 — 2026-10-29 khoảng 01:38

Giữa Lượt 5 và lượt này, bạn tạo và cài hai GitHub App bằng trang của script; Claude làm T1–T3 (lượt code, không ghi), rồi nhờ bạn approve PR #2 của `ao-pilot`.

**Bạn:**

```markdown
đã approve
```

**Claude:**

Cảm ơn bạn. Giả định thứ ba cũng đúng: bot `ao-dev` merge PR #2 của `ao-pilot`, và push vào `develop` tự kích hoạt `CI`, `Deploy` (deploy lên `development` thành công) và `jira-sync`. Cả ba giả định nền đều đúng, nên `merge-gate` giữ nguyên thiết kế.

Giai đoạn 1 xong, tất cả đã merge vào `main` với CI xanh (385 test):

| Task | PR | Kết quả |
|---|---|---|
| T1 | #47 | Hai App tạo bằng script; key ở `C:\Users\Huu Tung\ao-keys\` |
| T2 | #48 | Token của App chỉ cho một repo; client GitHub ghi được khi cần |
| T3 | #49 | Ba giả định nền đúng; spec thêm `deployment: false` cho `merge-gate` |
| T4 | #50 | `quality/gates.yaml`, schema, quy tắc Q1, Q3, Q4 |
| T5 | #51 | Stage `merge` qua bằng "`merge-gate` pass"; báo cáo review có dòng `Role:` |

## Checkpoint 1: bạn soát `quality/gates.yaml`

File này là "luật chơi" mà CI, `merge-gate`, `audit` và các hook sẽ đọc. Giá trị hiện tại:

| Mục | Giá trị |
|---|---|
| Check bắt buộc | `policy`, `build-test`, `secrets`, `sast` |
| Coverage | Dòng thêm hoặc sửa phải phủ từ 80%. Tính file `ts`, `tsx`, `js`, `jsx`, `mjs`, `cjs`; bỏ file test, file `.d.ts`, thư mục `e2e/` và `.ai-orchestrator/` |
| `npm audit` | Đỏ từ mức `high`; chưa có ngoại lệ |
| Mẫu tắt kiểm tra | `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `.skip(`, `xit(`, `xdescribe(`, `istanbul ignore`, `c8 ignore`, `nosemgrep`, `gitleaks:allow`, `secretlint-disable`: cho qua nếu cùng dòng có `reason:`. `.only(` luôn đỏ |
| Nhánh được bảo vệ | `develop`, `main`, `release/*` |
| Cách merge | `feature/`, `bugfix/`, `hotfix/`: squash |
| File được bảo vệ | `.github/workflows/**` (riêng `devops` được sửa), `.githooks/**`, `.claude/**`, `.ai-orchestrator/**` |
| App `ao-dev` | `fe-dev`, `be-dev`, `devops`; lệnh `create`, `edit`, `comment` |
| App `ao-review` | `reviewer`, `security`; lệnh `review` |

Mình có ba đề xuất:

1. **Thêm `ba` và `sa` vào App `ao-dev`.** Hợp đồng giao cho `ba` viết SPEC và cho `sa` viết plan, ADR vào Git (`docs/specs/<EPIC-KEY>/`). Nếu không có App, hai agent này không mở được PR. Còn PR chỉ có tài liệu có cần báo cáo của `reviewer` và `security` hay không thì để `dev-workflow` quyết.
2. **Bỏ file cấu hình khỏi phần tính coverage:** thêm `**/*.config.*` (ví dụ `next.config.mjs`, `jest.config.ts`). Nếu không, PR nào sửa file cấu hình cũng bị đỏ, vì file đó không có trong lcov.
3. **Bỏ migration khỏi phần tính coverage:** thêm `**/migrations/**`. Migration của NestJS thường được sinh tự động, và chạy thử nó là việc của test tích hợp chứ không phải của coverage.

Bạn trả lời: đồng ý cả ba, hoặc chọn từng mục, hoặc sửa giá trị nào khác. Sau đó mình đánh dấu Checkpoint 1 rồi sang Giai đoạn 2 (hook ở máy bạn).

---

# Phiên 10 · Lượt 7 — 2026-10-29 khoảng 01:50

**Bạn:**

```markdown
đồng ý cả ba
```

Sau lượt này Claude áp ba đề xuất, qua Checkpoint 1 rồi làm T6–T13 (lượt code, không ghi), tới khi hết lượt dùng giữa T13.

**Claude:**

Bạn đã hết lượt dùng, nên mình dừng giữa T13. Mọi thứ đã làm đều được lưu trên GitHub.

**Đã xong (mọi PR đều có CI xanh và đã merge vào `main`):**
- **Checkpoint 1 (PR #52):** đã áp ba đề xuất bạn đồng ý: `ba` và `sa` dùng App `ao-dev`; coverage bỏ qua file cấu hình và migration.
- **T6–T9 (PR #53–#56):** ba hook git (`commit-msg`, `pre-commit` có secretlint, `pre-push`), hook `gh-guard` chặn agent đi đường vòng, và script `ao-pr.mjs`.
- **T10–T12 (PR #57–#59):** đo coverage của dòng thay đổi, job `policy`, workflow `CI` bốn job của kit, và quy tắc Q2.

**T13 đang làm dở**, nằm trên nhánh `task/t13-live-ci` (đã push, chưa mở PR):
- Mình tạo Task `DEMO-5` trên Jira, rồi cài bản chép kit, ba hook và một package TypeScript nhỏ lên `develop` của `ao-pilot`. Commit qua được hook `pre-commit` và `commit-msg` thật.
- Lần chạy `CI` đầu tiên trên `ao-pilot` đỏ ở job `sast`, đúng lý do: Semgrep tìm ra lỗi thật trong chính kit, script gọi `npm` qua shell. Mình đã sửa (commit `de807e4`), và lần chạy sau cả bốn job đều xanh.

**Còn lại của T13:**
1. Thử từng hook git trên `ao-pilot` (tiêu chí 3).
2. Mở PR thử của `DEMO-5` bằng `ao-pr.mjs`, cho mỗi job đỏ một lần đúng lý do rồi xanh lại (tiêu chí 4).
3. Đo số phút Actions. API `timing` trả 0 ms với repo private, nên mình sẽ cộng thời gian của từng job.
4. Mở PR cho T13, rồi dừng ở Checkpoint 2 để bạn xem một lần `CI` đỏ.

Lượt chat này (bạn trả lời "đồng ý cả ba") chưa được ghi vào `misc/brainstorm-discussion.md`; phiên sau mình ghi bù. Khi có lượt dùng mới, bạn chỉ cần nhắn "tiếp tục" là mình làm tiếp từ bước 1.

**Claude, sau khi lượt dùng được cấp lại (2026-10-29, khoảng 03:30):**

T13 đã xong (PR #60), nên mình dừng ở Checkpoint 2.

**Kết quả trên `ao-pilot`:**

- **Tiêu chí 3 đạt.** Ba hook git chặn đúng lý do: commit với header `wip`; file đã stage có private key (key bị che khi in); push thẳng lên `develop`.
- **Tiêu chí 4 đạt.** Bot `ao-dev` mở PR #3 của `ao-pilot` bằng `ao-pr.mjs`. Commit đầu cố ý làm đỏ cả bốn job, mỗi job đúng lý do:

  | Job | Đỏ vì |
  |---|---|
  | `policy` | Dòng `eslint-disable` không ghi `reason:` |
  | `build-test` | Một file nguồn không có trong lcov; dòng thay đổi chỉ phủ 69,2%, dưới 80% |
  | `secrets` | gitleaks thấy một token GitHub giả (giá trị bị che trong log) |
  | `sast` | Semgrep thấy token đó và một lệnh gọi `spawnSync` qua shell |

  Bản sửa làm cả bốn job xanh. Token giả đã nằm trong lịch sử nhánh, nên cách sửa đúng là viết lại nhánh rồi force push, không chỉ xóa file. Mình sẽ ghi điều này vào `docs/quality-gates.md` ở T21.
- **Một lỗi thật của kit được tìm ra.** Ở lần chạy `CI` đầu tiên trên `ao-pilot`, Semgrep bắt chính script của kit gọi `npm` qua shell. Mình đã sửa bằng `lib/quality/npm.mjs` (gọi `npm-cli.js` bằng `node`).
- **Phút Actions:** mỗi lần chạy `CI` tốn 4 phút. Bốn job chỉ chạy 6 đến 31 giây, nhưng GitHub làm tròn mỗi job lên một phút. Với 2.000 phút mỗi tháng, đủ khoảng 500 lần chạy `CI`, chưa tính `jira-sync` và `merge-gate`. T19 sẽ đo cả một vòng PR.

## Checkpoint 2: bạn xem một lần `CI` đỏ

1. Mở https://github.com/TungPH7/ao-pilot/actions/runs/40762740821
2. Ở trang **Summary**, kéo xuống dưới sơ đồ các job. Phải thấy hai mục do kit ghi: **Policy** (dấu ❌ ở Suppressions, kèm dòng bị bắt) và **Coverage of changed lines: 69.2%** (bảng theo file, có cột các dòng chưa chạy). Mình không đọc được trang Summary qua API, nên đây cũng là chỗ nhờ bạn kiểm.
3. Ở cột bên trái, bấm job `secrets`, rồi `sast`, để xem log. gitleaks ghi `leaks found: 1` và che token; Semgrep liệt kê hai finding.
4. So với lần chạy xanh: https://github.com/TungPH7/ao-pilot/actions/runs/40762874979

Bạn nhắn "qua Checkpoint 2", hoặc điều muốn sửa, thì mình sang Giai đoạn 4 (`merge-gate`, `audit`, `gh:protect`). PR #3 của `ao-pilot` mình để mở tới khi bạn xem xong rồi mới đóng.

---

# Phiên 11 · Lượt 1 — 2026-10-29 09:00

**Bạn:**

```markdown
Tiếp tục session id: b645b669-931c-4d95-ba32-24fd3e090d67

qua Checkpoint 2 nhé
```

Sau lượt này Claude qua Checkpoint 2 (PR #61), làm T14–T17 (lượt code, không ghi), rồi dừng ở Checkpoint 3.

**Claude:**

Checkpoint 2 đã qua, và Giai đoạn 4 gần xong: T14–T16 đã merge, T17 chỉ còn một bước cần bạn.

**Đã xong (CI xanh, đã merge vào `main`):**

- **Checkpoint 2 (PR #61):** đã tick trong plan; PR #3 của `ao-pilot` đã đóng.
- **T14 (PR #62):** `decideMerge`, phần quyết định của `merge-gate`. Với mỗi PR, nó trả một trong bốn kết quả: merge, chờ (kèm điều kiện còn thiếu), để bạn tự merge (PR sửa file được bảo vệ), hoặc bỏ qua. Kit giờ đọc được báo cáo review: dòng `Role:`, bảng Findings, các finding Critical và High. `ao-pr.mjs review` cũng từ chối báo cáo mà `merge-gate` không đọc được, ngay trước khi gửi.
- **T15 (PR #63):** script và workflow `merge-gate`. Workflow chạy sau mỗi lần `jira-sync`, chỉ ở nhánh mặc định, lấy key từ environment `merge-gate` và không tạo deployment. GitHub từ chối merge vì PR vừa có push mới thì script báo chờ, không báo lỗi.
- **T16 (PR #64):** `audit` trước khi deploy, gồm script và reusable workflow. Khi `audit` đỏ, item Jira được gắn cờ "Needs you", mỗi commit chỉ một comment. Chạy thử trên `ao-pilot`: commit cài kit mà mình push thẳng lên `develop` ở T13 bị đỏ đúng lý do.

**T17 (PR #65, đang mở):** lệnh `npm run gh:protect`. Trên `ao-pilot` lệnh báo soft mode và không đổi gì. Trên repo public tạm `TungPH7/ao-ruleset-probe`: lần đầu tạo ruleset, lần hai cập nhật đúng ruleset đó, và đọc lại thấy khớp. GitHub tự thêm trường `require_extra_approval_for_unattributed_changes: true`, trường mình chưa thấy trong tài liệu; mình đã ghi lại để xem khi có dự án thật dùng ruleset.

Một chỗ mình phải tự diễn giải spec: với `audit`, PR từ `release/*` do bạn mở được tính là đã approve, vì GitHub không cho tác giả tự approve PR của mình. Spec chỉ ghi quy tắc này cho PR của Story, Task, Bug. Nếu bạn muốn khác, mình sửa.

## Việc cần bạn: xóa repo thử `TungPH7/ao-ruleset-probe`

Token của `gh` không có quyền xóa repo, và mình không muốn thêm quyền đó vào một token dùng lâu dài. Bạn xóa trên giao diện:

1. Mở https://github.com/TungPH7/ao-ruleset-probe/settings
2. Kéo xuống cuối trang, tới mục **Danger Zone**, bấm **Delete this repository**.
3. Bấm **I want to delete this repository**, rồi **I have read and understand these effects**.
4. Gõ `TungPH7/ao-ruleset-probe` vào ô xác nhận, rồi bấm **Delete this repository**. GitHub có thể hỏi lại mật khẩu hoặc mã 2FA.

Nhãn nút lấy theo giao diện GitHub mà mình biết; nếu bạn thấy khác, chụp màn hình gửi mình.

## Checkpoint 3

1. `npm test` xanh: 497 test.
2. `merge-gate --dry-run` trên `ao-pilot`: mình mở lại PR #3 để có một PR thật. Script in `Waiting #3: reviewer report on head df44b9e; security report on head df44b9e; approval on head df44b9e`. Kết quả này đúng, vì PR đó chưa có báo cáo review và chưa có approve. Chạy hai lần in y hệt nhau; lúc CI còn chạy thì dòng này có thêm `CI green on head df44b9e`.
3. Tiêu chí 11: đạt khi repo thử đã bị xóa.

Bạn xóa repo xong thì nhắn "qua Checkpoint 3" (hoặc điều muốn sửa). Mình sẽ kiểm repo đã mất, tick T17 và Checkpoint 3, đóng lại PR #3, rồi sang Giai đoạn 5: kiểm thật đầu cuối với agent `fe-dev` và `reviewer`. Giai đoạn đó cần bạn chấp nhận hook mới của `ao-pilot`, approve PR, và một lần bấm Merge tay để thử `audit`.

---

# Phiên 12 · Lượt 1 — 2026-10-29 khoảng 11:04

**Bạn:**

```markdown
Tiếp tục session id: 318a4364-f1b9-4cc5-9744-ae8ff4f80c7d

qua Checkpoint 3
```

Sau lượt này Claude đóng T17 (PR #65), qua Checkpoint 3 (PR #66), rồi làm T18 tới bước cần bạn (lượt code, không ghi).

**Claude:**

Checkpoint 3 đã qua, và T18 đã làm được một nửa. Phần còn lại cần bạn hai việc nhỏ, ghi ở cuối tin này.

**Đã xong (CI xanh, đã merge vào `main`):**

- **T17 (PR #65):** repo thử `TungPH7/ao-ruleset-probe` đã bị xóa (API trả 404). Tiêu chí 11 đạt, đã ghi vào `tasks/verification.md`.
- **Checkpoint 3 (PR #66):** đã tick trong plan. PR #3 của `ao-pilot` đã đóng.

**T18, đang làm (nhánh `task/t18-agent-pr`):**

- **Cài kit mới lên `ao-pilot`:** `merge-gate`, `audit`, hook `gh-guard`, slug và App ID của hai App, và ba agent thử `fe-dev`, `reviewer`, `security`. Mình push thẳng lên `develop` rồi merge `develop` vào `main`, vì `merge-gate` và `jira-sync` chỉ chạy từ nhánh mặc định. `CI` xanh trên cả hai nhánh. `merge-gate` chạy được và in `No open PR`.
- **`audit` chặn đúng ngay lần đầu:** commit cài kit được push thẳng, không qua PR, nên `audit` đỏ và job deploy không chạy. `DEMO-5` bị gắn cờ, kèm comment của `orchestratorci`. Đây đúng là thiết kế; mình giữ cờ đó làm bằng chứng.
- **Item thử:** mình tạo Task `DEMO-6`, "phí vận chuyển của giỏ hàng", checklist bốn mục.
- **Tiêu chí 6, phần chặn: đạt.** Agent `fe-dev` chạy thật (`claude -p --agent fe-dev`) bị `gh-guard` chặn cả ba đường vòng, và repo không đổi:

  | Agent thử | Kết quả |
  |---|---|
  | `gh pr merge 3 --squash` | Bị chặn: không merge bằng tài khoản của bạn, merge là việc của `merge-gate` |
  | `git commit --no-verify` | Bị chặn: không được bỏ qua hook git |
  | Sửa `.github/workflows/ci.yml` | Bị chặn: chỉ `devops` được sửa thư mục này |

  Câu chặn nguyên văn nằm trong `tasks/verification.md`. `claude -p` chạy hook mới mà không hỏi gì, nên bạn không phải chấp nhận hook như plan dự kiến.

## Việc cần bạn

**1. Chuyển `DEMO-6` sang Ready**, giống bạn đã làm với `DEMO-3` ở T15. Theo hợp đồng, Task không thuộc Epic thì bạn là người duyệt nó sẵn sàng, nên mình không tự chuyển bằng token CI.

1. Mở https://phunghuutung12b4.atlassian.net/browse/DEMO-6
2. Bấm nút trạng thái **New** ở gần tiêu đề item **(đối chiếu giao diện)**.
3. Chọn **Refine**. Item chuyển sang **Ready**.

**2. Tạo key thứ hai cho App `ao-dev`**, để `merge-gate` trên GitHub Actions merge được ở T19. Key này khác key mà `ao-pr.mjs` đang dùng ở máy bạn, để thu hồi riêng được.

1. Mở https://github.com/settings/apps/tungph7-ao-dev
2. Ở thanh bên trái, bấm **Credentials**, rồi **Key pairs**, rồi **New key**. Nếu không thấy mục **Credentials**, kéo xuống cuối trang **General**, tới mục **Private keys**, bấm **Generate a private key** **(đối chiếu giao diện)**. GitHub có thể hỏi lại mật khẩu hoặc mã 2FA.
3. Trình duyệt tải về một file dạng `tungph7-ao-dev.2026-10-29.private-key.pem`, thường vào thư mục Downloads.
4. Cắt và dán (không sao chép) file đó vào `C:\Users\Huu Tung\ao-keys`, giữ nguyên tên. Đừng mở file.

Sau đó mình pipe file vào `gh secret set` để đặt secret `AO_DEV_APP_KEY` cho environment `merge-gate` trên `ao-pilot`, nên nội dung key không hiện ra ở đâu. Xong thì mình xóa file đó khỏi `ao-keys`. File `tungph7-ao-dev.pem` đang có giữ nguyên.

Bạn làm xong cả hai thì nhắn "xong". Mình sẽ cho `fe-dev` nhận `DEMO-6`, làm mục 1–3 của checklist, rồi mở PR bằng `ao-pr.mjs`. Khi `CI` xanh, `jira-sync` chuyển item sang In Review. Sau đó `reviewer` đăng báo cáo yêu cầu sửa bằng bot `ao-review`, vì mục 4 còn thiếu; mình cố ý để lại mục 4 để reviewer có lý do thật mà yêu cầu sửa. Khi `jira-sync` đưa item về In Progress là xong T18. T19 làm tiếp trên cùng PR và cần bạn approve PR trên GitHub.

---

# Phiên 12 · Lượt 2 — 2026-10-29 khoảng 13:50

Giữa Lượt 1 và lượt này, bạn chuyển `DEMO-6` sang Ready và tạo key thứ hai của `ao-dev`.

**Bạn:**

```markdown
xong
```

Sau lượt này Claude làm nốt T18 (PR #67), rồi làm T19 tới bước cần bạn approve (lượt code, không ghi).

**Claude:**

T18 đã xong và đã merge (PR #67, CI xanh). T19 đã làm tới bước cần bạn approve PR #4 lần đầu.

**Đã xong:**

- **Key thứ hai của `ao-dev`:** key ký đúng App `tungph7-ao-dev`. Mình đã đặt nó làm secret `AO_DEV_APP_KEY` của environment `merge-gate`, rồi xóa file khỏi `ao-keys`.
- **Tiêu chí 5: đạt.**
  - `fe-dev` nhận `DEMO-6`, viết test trước rồi code mục 1–3, rồi mở [PR #4](https://github.com/TungPH7/ao-pilot/pull/4) bằng `ao-pr.mjs`. Tác giả PR là `tungph7-ao-dev[bot]`.
  - Khi `CI` xanh, `jira-sync` chuyển item sang In Review.
  - `reviewer` đăng báo cáo REQUEST_CHANGES bằng `tungph7-ao-review[bot]`, với finding High là thiếu mục 4.
  - `jira-sync` đưa item về In Progress. Rework count là 1.
- **Tiêu chí 6: đạt đủ**, vì agent chạy được `ao-pr.mjs create`.
- **Tiêu chí 10: đạt.** Bài thử ở T3 dùng job không có `deployment: false`, còn job `merge-gate` thật thì có, nên mình thử lại đúng cấu hình đó với secret thật. Job trên một nhánh probe bị GitHub chặn trước khi chạy bước nào: `Branch "probe/t19-env" is not allowed to deploy to merge-gate due to environment protection rules.` Nhánh probe đã xóa.
- **T19, vòng sửa:**
  - `fe-dev` sửa mục 4 (viết test trước) và push commit `7e66a58`.
  - `jira-sync` lại chuyển item sang In Review.
  - `reviewer` review vòng hai và đăng báo cáo COMMENT. Không còn finding Critical hay High; còn một Medium (`price` là `NaN` hoặc `Infinity` chưa bị chặn) và một Low.
  - `merge-gate` in: `Waiting #4: security report on head 7e66a58; approval on head 7e66a58`.

**Ba phát hiện, đã ghi vào `tasks/verification.md`:**

1. **Agent tự thêm dòng `Co-Authored-By: Claude` vào commit**, vì Claude Code mặc định dặn agent làm vậy. Mình đã sửa ba chỗ:
   - `kit/.claude/settings.json` có thêm setting `attribution` để trống, kèm một test.
   - `ao-pilot` nhận cùng setting qua `.claude/settings.local.json`, cho tới lần chép kit sau.
   - Commit đó của agent được viết lại, không còn dòng ghi công.

   Commit sau của agent không còn dòng này.
2. **`--allowedTools` không chặn được lệnh nào ở máy bạn.** Các lượt `claude -p` chạy ở chế độ quyền `auto`, theo `defaultMode` trong setting của bạn. Agent vẫn chạy được `python`, `cat` và `git fetch` dù các lệnh này không có trong danh sách cho phép. Lớp chặn thật là:
   - các hook, vì hook từ chối thì lệnh bị chặn ở mọi chế độ;
   - các luật phía server: Restrict của Jira, environment `merge-gate`, `merge-gate` và `audit`.

   Ở T18 mình đã ghi sai rằng lớp quyền cũng chặn `gh`, và đã sửa câu đó. Tài liệu ở T21 sẽ ghi rõ điều này.
3. **`gh` 2.16 của bạn lỗi khi chạy `gh pr view <n>` không kèm `--json`**, vì GitHub đã tắt Projects (classic). Lời nhắc cho agent vì vậy dùng `--json`. Bản chép kit trong dự án cũng không có `templates/`, nên lời nhắc chỉ tới một bản sao của mẫu. Module `agent-roster` cần lo cả hai chuyện này.

## Việc cần bạn: approve PR #4 lần đầu

Bạn approve ngay bây giờ, dù `security` chưa đăng báo cáo. Đó là cố ý: `merge-gate` sẽ đứng chờ báo cáo của `security` và không merge. Trong lúc đó mình cho `fe-dev` push thêm một commit sửa finding Medium, để kiểm rằng approve trên commit cũ không còn được tính.

1. Mở https://github.com/TungPH7/ao-pilot/pull/4
2. Bấm tab **Files changed** để đọc diff, nếu bạn muốn.
3. Bấm nút **Review changes** màu xanh ở góc phải phía trên danh sách file. Giao diện mới có thể ghi **Submit review** **(đối chiếu giao diện)**.
4. Chọn **Approve**. Ô bình luận có thể để trống.
5. Bấm **Submit review**.

Xong thì nhắn "đã approve". Mình làm tiếp:

1. Kiểm `merge-gate` đứng chờ báo cáo của `security`.
2. Cho `fe-dev` push commit sửa finding Medium, rồi kiểm `merge-gate` đòi approve trên commit mới. Đây là phần approve cũ của tiêu chí 8.
3. Cho `devops` mở một PR nhỏ sửa `.github/workflows/`, để thử phần còn lại của tiêu chí 8.
4. Cho `reviewer` và `security` đăng báo cáo trên cả hai PR.
5. Nhờ bạn approve lại PR #4, và approve PR của `devops`. Lúc đó `merge-gate` phải merge PR #4, nhưng không merge PR của `devops` mà báo bạn tự merge.

---

# Phiên 12 · Lượt 3 — 2026-10-29 khoảng 15:55

**Bạn:**

```markdown
đã approve
```

Sau tin nhắn này Claude làm tiếp T19 tới bước cần bạn approve lần hai (lượt code, không ghi).

**Claude:**

T19 đã làm tới bước cần bạn approve lần hai. Kết quả đã ghi vào `tasks/verification.md`.

**Đã xong:**

- **Tiêu chí 8, phần approve trên commit cũ: đạt.**
  - Sau khi bạn approve trên `7e66a58`, `merge-gate` chỉ còn chờ báo cáo của `security`.
  - `fe-dev` sửa finding Medium (`price` là `NaN` hoặc `Infinity`), viết test trước, rồi push commit `8924767`. `CI` xanh.
  - `merge-gate` in: `Waiting #4: reviewer report on head 8924767; security report on head 8924767; approval on head 8924767`. Approve và hai báo cáo trên commit cũ đều không còn được tính.
- **Tiêu chí 8, phần PR sửa workflow:**
  - Mình tạo item thử `DEMO-7`. Mình cũng tạo agent `devops` chỉ ở máy, không commit, vì `.claude/` là đường dẫn được bảo vệ.
  - `devops` thêm `timeout-minutes: 15` vào bốn job của `.github/workflows/ci.yml`, rồi mở [PR #5](https://github.com/TungPH7/ao-pilot/pull/5) bằng `ao-pr.mjs`. `gh-guard` cho qua, vì chỉ `devops` được sửa thư mục này. `CI` xanh.
  - `merge-gate` in: `Needs you #5: it changes .github/workflows/ci.yml, so read the diff and merge it yourself`.
- **Review:** `reviewer` và `security` đăng báo cáo COMMENT trên cả hai PR, không có finding Critical hay High.
  - PR #4 có một finding Medium của `security`: `quantity` và `price` không có giới hạn trên. Vì vậy một giỏ có số quá lớn cho `total` là `Infinity`, và được miễn phí vận chuyển. Finding Medium không chặn merge, và có thể thành một item sau.
  - PR #5 chỉ có finding Low.
- **`merge-gate` giờ in:** `Waiting #4: approval on head 8924767` và `Needs you #5: ... (still missing: approval on head a8e842e)`.

**Sự cố RAM:** trong lúc `security` chạy, Claude Code dừng lệnh nền của mình vì máy thiếu RAM (còn khoảng 690 MB trống trên 16 GB). Tiến trình của agent vẫn chạy hết và đăng đủ báo cáo, nên không phải chạy lại. Lúc nãy mình nói có 7 phiên `claude.exe` cũ, nhưng một trong số đó là phiên này. Số tiến trình `claude.exe` khác đang mở từ 26–28/10 là 6. Nếu bạn không dùng chúng, đóng bớt sẽ đỡ thiếu RAM ở các bước sau.

## Việc cần bạn: approve PR #4 lần hai và approve PR #5

Bạn approve cả PR #5 dù PR này sẽ không được merge. Mục đích là thử rằng `merge-gate` không merge PR sửa workflow, kể cả khi PR đã đủ mọi điều kiện khác. Sau bài thử, mình đóng PR #5.

1. Mở https://github.com/TungPH7/ao-pilot/pull/4
2. Nếu muốn đọc diff, bấm tab **Files changed**. So với lần approve trước, commit `8924767` chỉ đổi điều kiện của `price` (kèm thông điệp lỗi và comment), và thêm 6 test.
3. Bấm nút **Review changes** màu xanh ở góc phải phía trên danh sách file. Giao diện mới có thể ghi **Submit review** **(đối chiếu giao diện)**.
4. Chọn **Approve**. Ô bình luận có thể để trống.
5. Bấm **Submit review**.
6. Mở https://github.com/TungPH7/ao-pilot/pull/5 và làm lại bước 2 đến 5. Diff chỉ có bốn dòng `timeout-minutes: 15`.

Đừng bấm **Merge** trên PR nào: `merge-gate` sẽ tự merge PR #4 khoảng nửa phút sau khi bạn approve. Xong thì nhắn "đã approve". Mình làm tiếp:

1. Kiểm `merge-gate` squash PR #4 vào `develop` bằng `ao-dev`. Sau đó `CI`, `audit` và deploy lên `development` phải chạy, và `jira-sync` phải chuyển `DEMO-6` sang Ready for QA. Đây là tiêu chí 7.
2. Kiểm `merge-gate` báo `Needs you` cho PR #5 khi không còn điều kiện nào thiếu, rồi đóng PR #5.
3. Đo số phút Actions của cả vòng PR #4 (tiêu chí 12), ghi lại, rồi đóng T19.

---

# Phiên 12 · Lượt 4 — 2026-10-29 khoảng 16:22

**Bạn:**

```markdown
đã approve
```

Sau tin nhắn này Claude làm nốt T19 (PR #68), rồi làm T20 tới bước cần bạn merge tay (lượt code, không ghi).

**Claude:**

T19 đã xong và đã merge (PR #68, CI xanh). T20 đã làm tới bước cần bạn merge tay.

**T19, đã xong:**

- **Tiêu chí 7: đạt.**
  - `merge-gate` squash PR #4 vào `develop` bằng `tungph7-ao-dev[bot]`, 40 giây sau khi bạn approve. Thân commit là header của ba commit trong PR.
  - `CI` chạy trên `develop`. `audit` in `audit passed: 9f17f6d on develop is the merge of PR #4, which met every gate`, rồi deploy lên `development` chạy.
  - `jira-sync` chuyển `DEMO-6` sang Ready for QA bằng `orchestratorci`.
- **Tiêu chí 8: đạt cả hai phần.** Với PR #5, `merge-gate` in `Needs you #5: it changes .github/workflows/ci.yml, so read the diff and merge it yourself`. Lúc đó PR không còn thiếu điều kiện nào, nhưng `merge-gate` vẫn không merge. Mình đã đóng PR #5, kèm một bình luận nói lý do.
- **Tiêu chí 10: đạt nốt.** Key trong environment `merge-gate` dùng được để merge từ `main`.
- **Tiêu chí 12: vòng PR #4 tốn 55 phút Actions.**
  - Mỗi lần push lên PR tốn 8 phút. Mỗi báo cáo review, hay mỗi lần bạn approve, tốn 2 phút. Merge và deploy tốn 11 phút.
  - Một vòng chuẩn tốn khoảng 37 phút: mở PR, sửa một lần, hai báo cáo ở mỗi vòng, một lần approve, merge và deploy. 2.000 phút mỗi tháng của gói Free đủ cho khoảng 54 vòng như vậy.
  - `jira-sync` và `merge-gate` chiếm 33 trên 55 phút. Mỗi lần chạy chỉ mất 10–20 giây, nhưng bị tính tròn một phút. T21 sẽ ghi con số này vào tài liệu.
- **Dọn dẹp:** `DEMO-7` vẫn ở New, và bạn có thể Cancel nó ở Checkpoint 4. Agent `devops` ở máy đã được xóa.

**T20, đã chuẩn bị:**

- Mình tạo item thử `DEMO-8`: thêm test cho `quantity` là `Infinity`, tức finding Low của `reviewer` ở PR #4.
- `fe-dev` mở [PR #6](https://github.com/TungPH7/ao-pilot/pull/6), và `CI` xanh.
- `merge-gate` in `Waiting #6: reviewer report on head 451523d; security report on head 451523d; approval on head 451523d`, nên không merge.

## Việc cần bạn: merge tay PR #6 khi chưa approve

Đây là bài thử tiêu chí 9. Repo private ở gói Free không có bảo vệ nhánh, nên nút Merge vẫn bấm được. Điều cần kiểm là commit không qua cổng thì không lên môi trường nào. Bạn không review và không approve PR này.

1. Mở https://github.com/TungPH7/ao-pilot/pull/6
2. Kéo xuống cuối trang, tới khung có nút merge màu xanh.
3. Bấm mũi tên ▾ ở bên phải nút đó, rồi chọn **Squash and merge**. Nếu nút đã ghi **Squash and merge** thì bỏ qua bước này **(đối chiếu giao diện)**.
4. Bấm **Squash and merge**.
5. Bấm **Confirm squash and merge**. Không cần sửa tiêu đề hay nội dung commit.

Xong thì nhắn "đã merge". Mình làm tiếp:

1. Kiểm rằng ở lần deploy sau đó, `audit` đỏ và ghi lý do, job `deploy` không chạy, và `DEMO-8` mang cờ "Needs you". Đây là tiêu chí 9.
2. Cho `fe-dev` mở PR revert commit đó, rồi cho `reviewer` và `security` đăng báo cáo. Khi đó mình nhờ bạn approve PR revert, để nó qua đủ cổng và `merge-gate` merge.
3. Gỡ cờ của `DEMO-8`, ghi kết quả, đóng T20, rồi tới Checkpoint 4.

---

# Phiên 12 · Lượt 5 — 2026-10-29 khoảng 16:44

**Bạn:**

```markdown
đã merge
```

**Claude:**

PR #6 vẫn chưa được merge. GitHub vẫn báo PR đang mở và `merged` là false, còn `develop` vẫn ở `9f17f6d`. Không có luật nào chặn: GitHub báo PR merge được (`mergeable_state: clean`). Có lẽ bước cuối, **Confirm squash and merge**, chưa được bấm.

Bạn làm lại giúp mình:

1. Mở https://github.com/TungPH7/ao-pilot/pull/6
2. Kéo xuống cuối trang, tới khung có nút merge màu xanh.
3. Bấm mũi tên ▾ ở bên phải nút đó, rồi chọn **Squash and merge**. Nếu nút đã ghi **Squash and merge** thì bỏ qua bước này **(đối chiếu giao diện)**.
4. Bấm **Squash and merge**. Một khung để sửa tiêu đề và nội dung commit hiện ra; bạn không cần sửa gì.
5. Bấm **Confirm squash and merge** ở dưới khung đó.
6. Kiểm lại: đầu trang hiện nhãn tím **Merged**, và cuối trang ghi **Pull request successfully merged and closed** **(đối chiếu giao diện)**.

Nếu GitHub báo lỗi ở bước nào, hoặc nút bị xám không bấm được, bạn chép nguyên văn dòng báo cho mình. Xong thì nhắn "đã merge".

---

# Phiên 12 · Lượt 6 — 2026-10-29 khoảng 16:47

**Bạn:**

```markdown
đã merge
```

Sau tin nhắn này Claude kiểm `audit`, rồi làm T20 tới bước cần bạn approve PR revert (lượt code, không ghi).

**Claude:**

Lần này PR #6 đã được merge, và tiêu chí 9 đạt. T20 đã làm tới bước cần bạn approve PR revert.

**Tiêu chí 9: đạt.**

- Bạn merge PR #6 lúc 16:47:01, thành commit `2e16d25` trên `develop`.
- Workflow `Deploy` chạy, và job `audit` đỏ với lý do: `PR #6 was merged without: reviewer report on head 451523d; security report on head 451523d; approval on head 451523d`.
- Job `deploy` bị bỏ qua. Không có deployment nào cho `2e16d25`, nên `development` vẫn chạy `9f17f6d`.
- `orchestratorci` gắn cho `DEMO-8` cờ Impediment và nhãn `needs-you`, kèm một bình luận nói lý do.

**Dọn `develop`, đã chuẩn bị:**

- `fe-dev` mở [PR #7](https://github.com/TungPH7/ao-pilot/pull/7), revert đúng commit `2e16d25`. `CI` xanh.
- `reviewer` và `security` đăng báo cáo COMMENT, không có finding Critical hay High. Cả hai đều kiểm rằng sau revert, code giống hệt `9f17f6d`.
- Mỗi báo cáo có một finding Low: `develop` lại thiếu test cho `quantity` là `Infinity`. Ở Checkpoint 4, bạn có thể Cancel `DEMO-8`, hoặc giữ nó để làm lại qua đủ cổng.
- `merge-gate` in `Waiting #7: approval on head 6eb5c4e`.

## Việc cần bạn: approve PR #7

1. Mở https://github.com/TungPH7/ao-pilot/pull/7
2. Nếu muốn đọc diff, bấm tab **Files changed**. Diff chỉ xóa một dòng trong `src/cart.test.ts`.
3. Bấm nút **Review changes** màu xanh ở góc phải phía trên danh sách file. Giao diện mới có thể ghi **Submit review** **(đối chiếu giao diện)**.
4. Chọn **Approve**. Ô bình luận có thể để trống.
5. Bấm **Submit review**.

Đừng bấm **Merge**: `merge-gate` sẽ tự merge khoảng nửa phút sau khi bạn approve. Xong thì nhắn "đã approve". Mình làm tiếp:

1. Kiểm `merge-gate` merge PR #7, rồi ở lần deploy sau đó `audit` xanh và deploy chạy.
2. Gỡ cờ và nhãn `needs-you` của `DEMO-8`.
3. Ghi kết quả, đóng T20, rồi tới Checkpoint 4.

---

# Phiên 12 · Lượt 7 — 2026-10-29 khoảng 17:08

**Bạn:**

```markdown
đã approve
```

Sau tin nhắn này Claude kiểm lần merge của PR #7, gỡ cờ của `DEMO-8`, rồi đóng T20 (PR #69) (lượt code, không ghi).

**Claude:**

T20 đã xong và đã merge (PR #69, CI xanh). Giai đoạn kiểm thật đầu cuối đã xong, và mình dừng ở **Checkpoint 4**.

**T20, đã xong:**

- `merge-gate` merge PR #7 (PR revert) 38 giây sau khi bạn approve. `audit` in `audit passed: 0e55963 on develop is the merge of PR #7, which met every gate`, rồi deploy lên `development` chạy.
- `develop` có lại đúng nội dung của `9f17f6d`, tức nội dung trước lần merge tay.
- Mình đã gỡ cờ Impediment và nhãn `needs-you` của `DEMO-8`, kèm một bình luận giải thích.

## Checkpoint 4

**Tiêu chí 5 đến 10 và 12 của spec mục 9 đều đạt:**

| Tiêu chí | Kết quả | Ở đâu |
|---|---|---|
| 5. PR do bot `ao-dev` mở; bot `ao-review` yêu cầu sửa; item về In Progress | Đạt | T18, PR #4 |
| 6. `gh-guard` chặn `gh pr merge`, `--no-verify` và việc sửa `ci.yml`; cho chạy `ao-pr.mjs create` | Đạt | T18 |
| 7. `merge-gate` squash bằng `ao-dev`; `CI`, `audit` và deploy chạy; item sang Ready for QA | Đạt | T19, PR #4, `DEMO-6` |
| 8. `merge-gate` chờ khi approve nằm trên commit cũ; không merge PR sửa workflow | Đạt | T19, PR #4 và PR #5 |
| 9. Merge tay khi chưa approve: `audit` đỏ, không deploy, item mang cờ | Đạt | T20, PR #6, `DEMO-8` |
| 10. Nhánh khác `main` không đọc được secret của environment `merge-gate` | Đạt | T19, nhánh probe |
| 12. Số phút Actions của một vòng PR | 55 phút cho PR #4; một vòng chuẩn khoảng 37 phút | T19 |

**T21 sẽ ghi vào tài liệu:**

1. `--allowedTools` không chặn được lệnh nào khi `claude -p` chạy ở chế độ quyền `auto`. Lớp chặn thật là các hook và các luật phía server.
2. Kit đặt `attribution` rỗng, để agent không thêm dòng ghi công AI vào commit và PR.
3. `jira-sync` và `merge-gate` chiếm 33 trên 55 phút của vòng PR #4, vì mỗi lần chạy bị tính tròn một phút.
4. Cập nhật bản chép kit trong dự án phải đi qua PR. Push thẳng lên `develop` làm `audit` chặn deploy và gắn cờ item. Vì vậy `DEMO-5` vẫn mang cờ từ lần cài kit ở T18.

## Việc cần bạn: xem lại các item và PR thử

1. Mở từng item thử, rồi xem lịch sử ở tab **History** trong mục **Activity** **(đối chiếu giao diện)**:
   - https://phunghuutung12b4.atlassian.net/browse/DEMO-6 đi New → Ready (bạn) → In Progress (`orchestratoragent`) → In Review → In Progress (khi bị yêu cầu sửa) → In Review → Ready for QA (`orchestratorci`).
   - https://phunghuutung12b4.atlassian.net/browse/DEMO-8 có cờ và nhãn `needs-you` do `audit` gắn, rồi được gỡ sau PR revert.
2. Mở các PR thử: [#4](https://github.com/TungPH7/ao-pilot/pull/4), [#5](https://github.com/TungPH7/ao-pilot/pull/5), [#6](https://github.com/TungPH7/ao-pilot/pull/6), [#7](https://github.com/TungPH7/ao-pilot/pull/7). Báo cáo của `reviewer` và `security` nằm ở tab **Conversation** của mỗi PR.

Việc không bắt buộc: trên `DEMO` còn vài item thử. `DEMO-7` và `DEMO-8` ở New; `DEMO-5` ở New và còn cờ; `DEMO-3` (item thử của `tracker-integration`) ở In Review. Bạn có thể giữ chúng làm hồ sơ, hoặc Cancel chúng như sau:

1. Mở item, rồi bấm nút trạng thái (ví dụ **New**) ở gần tiêu đề **(đối chiếu giao diện)**.
2. Chọn **Cancel**.
3. Chọn một Resolution trong hộp thoại, rồi xác nhận.

Xem xong, bạn nhắn "qua Checkpoint 4" để mình làm T21: README, `docs/quality-gates.md`, `SPEC.md`, và lưu plan. Nếu thấy chỗ nào chưa ổn, bạn cứ nói.

---

# Phiên 12 · Lượt 8 — 2026-10-29 khoảng 22:07

**Bạn:**

```markdown
gh cli của tôi đang ở v2.16 à ? Có nên update lên phiên bản mới nhất không? Có ảnh hưởng những gì đã làm từ T1 đến T20 không?
```

Trước câu hỏi này bạn chạy `/context`, một lệnh của Claude Code, không cần trả lời. Trước khi trả lời, Claude kiểm bản `gh` trên máy, đọc `gh-guard`, ghi chú phát hành và các security advisory của `gh` (lượt code, không ghi).

**Claude:**

Đúng, máy bạn đang chạy `gh` **2.16.1**, ra ngày 2022-09-26. Bản mới nhất là **2.103.3**, ra ngày 2026-10-26, và `winget` đã thấy bản này.

## Có nên cập nhật không

Nên, nhưng nên sửa `gh-guard` trước. Lý do sửa trước nằm ở phần "Ảnh hưởng tới T1–T20" bên dưới. Lý do nên cập nhật:

1. **Bảo mật.** Ít nhất 9 security advisory đã công bố ảnh hưởng tới 2.16.1. Advisory mức cao duy nhất trong số đó nằm ở Codespaces, mà ta không dùng. Ba advisory gần với cách kit dùng `gh`:
   - chèn escape sequence vào terminal, qua log của `gh run view` và vài lệnh khác;
   - lộ token khi clone repo có submodule trỏ ra ngoài GitHub;
   - lộ một phần token trong output của `gh auth status`.

   Bản 2.102.0 trở lên vá hết các advisory này.
2. **`gh pr view <n>` không kèm `--json` lỗi trên 2.16**, vì GitHub đã tắt Projects (classic). Bản 2.73.0 sửa lỗi này. Cũng vì lỗi đó mà lời nhắc của agent ở T18–T20 phải dặn dùng `--json`.
3. **Token của `gh` đang nằm trong `%AppData%\GitHub CLI\hosts.yml`, không mã hóa.** Mình chỉ đếm dòng `oauth_token`, không in giá trị. Mọi agent chạy dưới tài khoản Windows của bạn đều đọc được file này, và `gh-guard` không chặn việc đọc đó. Từ bản 2.26.0, `gh auth login` cất token vào Windows Credential Manager. Ghi chú phát hành nói việc này xảy ra khi chạy `gh auth login`, nên token đang có vẫn nằm trong file cho tới khi bạn đăng nhập lại. Mình sẽ kiểm lại điều này sau khi cập nhật.

## Ảnh hưởng tới T1–T20

**Không ảnh hưởng:**

- Mọi thứ đã nằm trên GitHub và Jira không bị ảnh hưởng: PR đã merge, workflow, secret của environment, hai App, lịch sử item. Các workflow không gọi `gh`; chúng chạy script Node trên máy của GitHub. `ao-pr.mjs`, `merge-gate`, `audit` và `jira-sync` gọi thẳng REST API.
- Ở máy bạn, kit chỉ gọi `gh` ở `readGitHubToken` (`lib/tracker/github-client.mjs:60`). Hàm này thử `gh auth token` trước, và chỉ dùng `gh auth status --show-token` khi `gh` cũ hơn 2.17. Bản mới đi theo nhánh đầu. Test đã phủ cả hai nhánh.
- Kết quả kiểm ở T18–T20 vẫn đúng. Chúng được đo với 2.16.1, và T21 sẽ ghi rõ điều đó cùng bản `gh` tối thiểu.

**Có ảnh hưởng: `gh-guard`.** Hook này chặn theo một danh sách lệnh (`lib/quality/commands.mjs:145`). Bản mới có thêm bốn lệnh ghi lên GitHub bằng tài khoản của bạn, mà danh sách chưa có:

| Lệnh mới | Làm gì |
|---|---|
| `gh pr revert` | Mở một PR revert mới, đứng tên bạn. `audit` coi PR do bạn mở là đã approve (`lib/quality/audit.mjs:35`). `merge-gate` không tự merge PR này, nhưng agent không được mở PR bằng tên bạn |
| `gh pr update-branch` | Đẩy một commit đứng tên bạn vào nhánh của PR |
| `gh repo autolink create` và `delete` | Đổi cài đặt của repo |
| `gh run delete` | Xóa lần chạy workflow, kể cả lần `audit` đỏ |

Trên 2.16.1, bốn lệnh này chưa có, nên hiện giờ `gh-guard` chưa hở chỗ này. Chỗ hở chỉ xuất hiện sau khi cập nhật.

Khi kiểm, mình thấy thêm một chỗ hở có từ trước và không phụ thuộc phiên bản: `gh-guard` chặn `gh auth token`, nhưng không chặn `gh auth status --show-token`, dù lệnh này cũng in token của bạn.

**Một thay đổi nên biết:** từ bản 2.91.0, `gh` mặc định gửi telemetry, tức dữ liệu về cách bạn dùng lệnh, gắn với một mã định danh giả. Lệnh `gh config set telemetry disabled` tắt nó.

## Đề xuất

1. **Sửa `gh-guard`, qua PR, có test (mình làm).** Chặn bốn lệnh trên, chặn `gh auth status` khi kèm `-t` hoặc `--show-token`, và chặn việc đọc `hosts.yml` của `gh`. Bản chép kit trong `ao-pilot` sẽ nhận bản sửa ở lần chép kit tới, qua PR, cùng với `attribution`. Trước lần chép đó, mình không chạy agent nào trong `ao-pilot`.
2. **Cập nhật `gh` (mình chạy):** `winget upgrade --id GitHub.cli -e`. Windows có thể hiện hộp thoại hỏi quyền quản trị. Khi đó bạn bấm **Yes** **(đối chiếu giao diện)**.
3. **Tắt telemetry (mình chạy, nếu bạn đồng ý):** `gh config set telemetry disabled`.
4. **Kiểm sau khi cập nhật (mình làm):**
   - `gh --version`;
   - `gh pr view 7 -R TungPH7/ao-pilot`, không kèm `--json`;
   - `readGitHubToken` vẫn lấy được token (mình chỉ kiểm có hay không, không in);
   - chạy test của kit.
5. **Đăng nhập lại để chuyển token vào Credential Manager (bạn làm; không bắt buộc nhưng nên).** Mình gửi các bước bấm sau bước 4. Token hiện có các scope `gist`, `read:org`, `repo` và `workflow`, và lần đăng nhập mới sẽ xin đúng các scope đó. Git không bị ảnh hưởng, vì git dùng Git Credential Manager riêng, không dùng token của `gh`.

Mình vẫn dừng ở **Checkpoint 4**. Bạn nhắn một trong hai:

- **"làm đề xuất gh"** (mình khuyên cách này): mình làm bước 1–4, gửi bước 5, rồi chờ bạn cho qua Checkpoint 4. Khi đó T21 ghi bản `gh` đã kiểm và luật mới của `gh-guard`.
- **"qua Checkpoint 4"**: mình làm T21 trước, còn việc `gh` để sau. Khi đó bạn đừng cập nhật `gh` cho tới khi bản sửa `gh-guard` đã merge.

---

# Phiên 12 · Lượt 9 — 2026-10-29 khoảng 22:25

**Bạn:**

```markdown
làm đề xuất gh
```

Sau tin nhắn này Claude vá `gh-guard` (PR #70), cập nhật `gh` lên 2.103.3, tắt telemetry, chạy các bước kiểm, rồi ghi kết quả vào `tasks/verification.md` (lượt code, không ghi).

**Claude:**

Mình đã làm xong bước 1–4. Còn bước 5 là việc của bạn.

**1. Vá `gh-guard`: xong ([PR #70](https://github.com/TungPH7/ai-orchestrator-v1/pull/70), CI xanh, đã merge).**

- Chặn bốn lệnh mới: `gh pr revert`, `gh pr update-branch`, `gh repo autolink create`/`delete` và `gh run delete`.
- Chặn `gh auth status` khi kèm `-t` hoặc `--show-token`, kể cả trong một nhóm cờ như `-at`. Chặn agent đọc `hosts.yml` của `gh`.
- Ngoài đề xuất, mình vá thêm một chỗ hở cùng loại, tìm thấy lúc viết test: `gh pr -R o/r merge 12` lọt qua hook, vì `-R` đứng trước lệnh con. Giờ hook đọc lệnh này là `pr merge`.
- Bảng ở mục 2.7 của spec ghi các luật mới. Mỗi luật có test cho lệnh bị chặn và lệnh gần giống được cho qua. Các test mới đỏ khi chưa có bản sửa, và cả bộ 499 test đều xanh.

**2. Cập nhật `gh`: xong.** `winget` đã cài bản 2.103.3.

**3. Tắt telemetry: xong.** Lệnh `gh` đầu tiên trên bản mới là `gh config set telemetry disabled`, chạy kèm `GH_TELEMETRY=false` để chính lệnh đó không gửi gì. `gh config get telemetry` trả `disabled`.

**4. Kiểm: đạt.**

- `gh --version` in `2.103.3`.
- `gh pr view 7 -R TungPH7/ao-pilot` không kèm `--json` in được PR #7. Trên 2.16, lệnh này lỗi.
- `readGitHubToken` lấy được token qua `gh auth token`, đúng dạng. Mình không in token.
- 499 test của kit xanh trên `main`.
- `gh auth status` cho thấy token vẫn nằm trong `hosts.yml`. Bước 5 xử lý việc này.

Bản chép kit trong `ao-pilot` sẽ nhận PR #70 ở lần chép kit tới, qua PR. Mình đã ghi các kết quả trên vào `tasks/verification.md`.

## Việc cần bạn: bước 5, chuyển token vào Credential Manager

Phần A nên làm nhưng không bắt buộc. Phần B là phần chính.

**A. Thu hồi token cũ.** Sau phần B, token cũ không còn nằm trên đĩa, nhưng vẫn dùng được trên GitHub. Thu hồi quyền của "GitHub CLI" làm token cũ hết hiệu lực. Việc này đăng xuất `gh` trên mọi máy của bạn, nên phải làm A trước B.

1. Mở https://github.com/settings/applications
2. Chọn tab **Authorized OAuth Apps** **(đối chiếu giao diện)**.
3. Ở dòng **GitHub CLI**, bấm nút **...**, rồi chọn **Revoke** **(đối chiếu giao diện)**. Chỉ thu hồi dòng này. Nếu có dòng **Git Credential Manager** thì để nguyên, vì git dùng nó.
4. Trong hộp thoại, bấm **I understand, revoke access** **(đối chiếu giao diện)**.

**B. Đăng nhập lại.**

1. Mở PowerShell: bấm Start, gõ `PowerShell`, rồi bấm Enter.
2. Dán lệnh sau, rồi bấm Enter:
   ```
   gh auth login --hostname github.com --git-protocol https --web --scopes workflow
   ```
3. Khi `gh` hỏi `Authenticate Git with your GitHub credentials? (Y/n)`, gõ `n` rồi bấm Enter. Như vậy git vẫn dùng Git Credential Manager như hiện nay.
4. `gh` in một mã dạng `XXXX-XXXX`. Chép mã đó, rồi bấm Enter để mở trình duyệt.
5. Trên trang **Device Activation**, dán mã, rồi bấm **Continue** **(đối chiếu giao diện)**.
6. Trang tiếp theo liệt kê các quyền `gist`, `read:org`, `repo` và `workflow`. Bấm **Authorize github** **(đối chiếu giao diện)**. GitHub có thể hỏi lại mật khẩu hoặc mã 2FA.
7. Quay lại PowerShell. Khi thấy dòng `✓ Logged in as TungPH7` là xong.

Xong thì nhắn "đã đăng nhập lại". Mình sẽ kiểm rằng token đã vào Credential Manager và `hosts.yml` không còn token, ghi kết quả, rồi chờ bạn cho qua Checkpoint 4.

Nếu chưa muốn làm bước 5 lúc này, bạn nhắn thẳng "qua Checkpoint 4".

---

# Phiên 12 · Lượt 10 — 2026-10-29 khoảng 22:31

**Bạn:**

```markdown
đã đăng nhập lại
```

Sau tin nhắn này Claude kiểm rằng token đã vào keyring, rồi ghi kết quả vào `tasks/verification.md` (lượt code, không ghi).

**Claude:**

Đăng nhập lại đã thành công. Token của `gh` giờ nằm trong Windows Credential Manager.

| Kiểm | Kết quả |
|---|---|
| `gh auth status` | Đăng nhập `TungPH7`, token nằm trong `keyring` |
| `hosts.yml` | Không còn dòng `oauth_token` |
| Windows Credential Manager | Có mục `gh:github.com:TungPH7` và `gh:github.com:`. Mình chỉ xem tên mục, không xem giá trị |
| Scope của token | `gist`, `read:org`, `repo`, `workflow`, như trước |
| `readGitHubToken` của kit | Lấy được token, đúng dạng |
| Git | Vẫn dùng Git Credential Manager (`credential.helper` là `manager`) |
| Telemetry | Vẫn `disabled` |

Mình không kiểm được phần A (thu hồi token cũ) từ máy, vì muốn kiểm phải dùng chính token cũ. Nếu bạn đã bỏ qua phần A, token cũ vẫn dùng được trên GitHub, dù không còn nằm trên đĩa. Bạn có thể thu hồi sau, nhưng khi đó cần đăng nhập lại `gh` thêm một lần.

Mình đã ghi kết quả vào `tasks/verification.md`, trên nhánh của Checkpoint 4. Nhánh này sẽ vào `main` cùng PR đánh dấu qua Checkpoint 4.

Việc `gh` đã xong, và mình vẫn dừng ở **Checkpoint 4**. Khi đã xem xong các item và PR thử như trong tin Checkpoint 4, bạn nhắn "qua Checkpoint 4". Khi đó T21 sẽ ghi thêm:

- bản `gh` đã kiểm là 2.103.3, và bản tối thiểu nên dùng;
- các luật mới của `gh-guard`;
- lời khuyên để token của `gh` trong keyring, không để trong `hosts.yml`.

---

# Phiên 12 · Lượt 11 — 2026-10-29 khoảng 22:46

**Bạn:**

```markdown
Tôi đã thu hồi token cũ. qua Checkpoint 4 nhé
```

Sau tin nhắn này Claude kiểm rằng `gh` vẫn chạy, đánh dấu qua Checkpoint 4, rồi gặp lỗi khi push (lượt code, không ghi).

**Claude:**

Mình đã đánh dấu qua Checkpoint 4 trong `tasks/plan.md` và `tasks/todo.md`, và ghi việc bạn thu hồi token cũ vào `tasks/verification.md`. `gh` vẫn chạy tốt bằng token mới. Nhưng mình chưa push được, nên chưa mở được PR và chưa làm T21.

**Lỗi:** `git push` báo `Invalid username or token. Password authentication is not supported for Git operations.`

**Nguyên nhân, và đây là lỗi của mình:**

- Ở Lượt 8 và Lượt 9, mình nói git không dùng token của `gh`, vì git dùng Git Credential Manager. Nhận định đó sai: mình chỉ xem cấu hình của git, mà không xem Git Credential Manager đang giữ token nào.
- Khi đăng nhập, `gh` hỏi `Authenticate Git with your GitHub credentials?`, và Yes là mặc định. Chọn Yes thì `gh` chép token của nó vào Git Credential Manager bằng `git credential approve`. Mình đã đọc mã của `gh` 2.16.1 và thấy đúng đoạn này.
- Nhiều khả năng lần đăng nhập `gh` đầu tiên của bạn đã chọn Yes. Vì vậy git vẫn dùng token cũ của `gh`, và khi bạn thu hồi quyền của "GitHub CLI", git mất quyền theo. Sau lần push lỗi, Git Credential Manager đã xóa credential hỏng của `github.com`.

Không có gì bị mất. Các commit vẫn nằm ở nhánh `task/checkpoint-4` trên máy, chỉ chưa lên GitHub.

## Việc cần bạn: chọn cách cho git đăng nhập lại

**Cách 1 (mình khuyên): đăng nhập Git Credential Manager bằng app riêng của nó.** Git và `gh` sẽ dùng hai token khác nhau, nên thu hồi token này không làm hỏng bên kia.

1. Gõ dòng sau vào ô nhắn của Claude Code, rồi bấm Enter. Dấu `!` cho lệnh chạy ngay trong phiên này:
   ```
   ! git credential-manager github login
   ```
2. Một cửa sổ Git Credential Manager hiện ra. Bấm **Sign in with your browser** **(đối chiếu giao diện)**.
3. Trình duyệt mở trang cấp quyền cho **Git Credential Manager**. Bấm **Authorize git-ecosystem** **(đối chiếu giao diện)**. GitHub có thể hỏi lại mật khẩu hoặc mã 2FA.
4. Khi trình duyệt báo đăng nhập thành công, quay lại Claude Code và nhắn "đã đăng nhập git".

**Cách 2: cho git dùng chính token của `gh`.** Mình chạy `gh auth setup-git`, lệnh này thêm `gh` làm credential helper cho `github.com` trong file `.gitconfig` của bạn. Bạn không phải bấm gì, và chỉ có một token. Đổi lại, thu hồi token của `gh` sẽ làm git hỏng theo, như lần này. Muốn cách này thì nhắn "dùng gh cho git".

Sau khi git đăng nhập lại, mình push nhánh, mở PR cho Checkpoint 4, rồi làm T21 tới checkpoint cuối.

---

# Phiên 12 · Lượt 12 — 2026-10-29 khoảng 23:03

**Bạn:**

```markdown
! git credential-manager github login
```

Bạn chạy lệnh trên ngay trong phiên bằng dấu `!`; lệnh không in gì. Sau đó Claude kiểm rằng git đã đăng nhập, merge PR #71 cho Checkpoint 4, rồi làm T21 (lượt code, không ghi).

**Claude:**

Git đã đăng nhập lại bằng Git Credential Manager (tài khoản `TungPH7`), và push chạy bình thường. Checkpoint 4 đã đóng (PR #71). T21 đã xong và đã merge (PR #72, CI xanh). Module `quality-gates` đã tới **checkpoint cuối**.

**T21, đã xong:**

- README có mục **Quality gates**, gồm bốn lớp chốt và hai GitHub App. Mục **Cài kit vào repo dự án** gộp các bước của `tracker-integration` và `quality-gates`. Bảng biến môi trường có thêm `AO_DEV_APP_KEY`, và mục **Lệnh** có `gh:protect` cùng các lệnh chạy trong repo dự án.
- `docs/quality-gates.md` mới, viết cho bạn:
  - vòng của một PR;
  - từng check của `CI`, cách đọc job summary, và cách xử lý khi cổng đỏ;
  - khi nào bạn tự merge;
  - từng bước cài environment `merge-gate`;
  - `gh-guard`, ruleset và phút Actions;
  - GitHub CLI trên máy bạn, kể cả chuyện Git Credential Manager giữ token của `gh` ở Checkpoint 4.
- Hai test mới kiểm README và `docs/quality-gates.md`. Cả bộ 501 test xanh.
- `SPEC-quality-gates.md` và `SPEC.md` ghi module hoàn thành ngày 2026-10-29. Plan, danh sách task và kết quả kiểm thật đã chuyển vào `tasks/archive/quality-gates/`.

## Checkpoint cuối

**Cả 13 tiêu chí của spec mục 9 đều đạt:**

| Tiêu chí | Ở đâu |
|---|---|
| 1. `quality/gates.yaml` và bốn quy tắc Q1–Q4; `validate`, `test` và CI của kit xanh | T4, T12; CI trên `main` |
| 2. Ba thay đổi ở mục 2.9, và `docs/sdlc.md` được sinh lại | T5 |
| 3. Hook git trên `ao-pilot` chặn đúng ba trường hợp | T13 |
| 4. Mỗi job của `CI` đỏ đúng lý do, rồi xanh lại | T13 |
| 5. PR của bot `ao-dev`; bot `ao-review` yêu cầu sửa; item về In Progress | T18 |
| 6. `gh-guard` chặn đường vòng, và cho chạy `ao-pr.mjs create` | T18 |
| 7. `merge-gate` merge, deploy chạy, item sang Ready for QA | T19 |
| 8. `merge-gate` chờ khi approve nằm trên commit cũ; không merge PR sửa workflow | T19 |
| 9. `audit` chặn commit merge tay | T20 |
| 10. Nhánh khác `main` không đọc được secret của environment `merge-gate` | T3, T19 |
| 11. `gh:protect` | T17 |
| 12. Số phút Actions của một vòng PR | T19 |
| 13. README, `docs/quality-gates.md`, `docs/github-apps-setup.md`, `SPEC.md` | T21; `docs/github-apps-setup.md` có từ T1 |

Những việc còn để lại, không thuộc module này:

- Bản chép kit trong `ao-pilot` chưa có bản vá `gh-guard` (PR #70) và setting `attribution`. Lần chép kit tới sẽ đưa cả hai vào, qua một PR. Trước lần đó, mình không chạy agent nào trong `ao-pilot`.
- Trên `DEMO` còn các item thử: `DEMO-3` ở In Review; `DEMO-5` ở New và còn cờ; `DEMO-7`, `DEMO-8` ở New. Bạn có thể giữ hoặc Cancel chúng, theo các bước trong tin Checkpoint 4. Nếu muốn, mình gỡ cờ của `DEMO-5`.

## Việc cần bạn

1. Đọc `docs/quality-gates.md` trên GitHub: https://github.com/TungPH7/ai-orchestrator-v1/blob/main/docs/quality-gates.md
2. Nếu thấy ổn, nhắn "xác nhận quality-gates hoàn thành". Mình sẽ đánh dấu ô cuối của checkpoint cuối, như đã làm với `tracker-integration`.
3. Rồi chọn module tiếp theo. Theo thứ tự build trong `SPEC.md`, module nên làm tiếp là `agent-roster`, vì `dev-workflow` cần nó cùng hai module đã xong. Mình sẽ chờ bạn chọn, và chưa bắt đầu module nào.

---

# Phiên 13 · Lượt 1 — 2026-10-29 khoảng 23:31

**Bạn:**

```markdown
Tiếp tục session id: 32807628-e04f-47b4-889d-f855a40dabce

làm tiếp module agent-roster
```

Trước lượt này, bạn chạy `/clear`, rồi `/model` chọn Opus 5.5 với effort `max` cho phiên này.

**Claude:**

Mình đã đánh dấu ô cuối của `quality-gates` (PR #73, đã merge), vì bạn chọn làm tiếp `agent-roster`. Nếu bạn chưa muốn xác nhận module đó thì báo mình, mình sẽ mở lại. Mình cũng đã tạo nhánh `task/spec-agent-roster`. Dưới đây là phạm vi, những điều mình vừa kiểm, các giả định và hai câu hỏi, trước khi viết `SPEC-agent-roster.md`.

## Phạm vi của `agent-roster`

Theo capability map, module này định nghĩa từng subagent: phạm vi, đầu vào và đầu ra, tool, skill và model. Ba module trước để lại cho nó bốn việc:

- Tên file agent trùng id vai trò (`fe-dev.md` có `name: fe-dev`), vì hook lấy vai trò từ `agent_type`.
- Agent ghi tên hiển thị của vai trò vào trường Agent trên Jira (`Frontend Developer`, không phải `fe-dev`).
- Agent phải có template để dùng, mà bản chép kit trong dự án chưa có thư mục `templates/`.
- Lần chép kit vào `ao-pilot` của module này mang theo bản vá `gh-guard` (PR #70) và setting `attribution`, qua một PR.

Ranh giới với `dev-workflow`: `agent-roster` quyết định mỗi agent làm gì và làm thế nào; `dev-workflow` quyết định lúc nào gọi agent nào, và nối các bước thành lệnh.

## Điều mình vừa kiểm

Theo tài liệu subagent của Claude Code (máy bạn đang chạy bản 2.1.312):

- Frontmatter có đủ các trường mình cần: `tools`, `disallowedTools`, `model` (`haiku`, `sonnet`, `opus`, `fable` hoặc `inherit`), `effort`, `skills`, `maxTurns`, `color`. Trường viết sai tên bị bỏ qua mà không báo lỗi, nên kit cần test kiểm frontmatter.
- `tools` bật hoặc tắt cả một tool. Không giới hạn được Bash theo từng lệnh; việc đó vẫn do hook làm, như hiện nay.
- `permissionMode` của agent bị bỏ qua khi phiên chính chạy ở chế độ `auto`, `acceptEdits` hoặc `bypassPermissions`. Máy bạn mặc định `auto`. Điều này khớp với phát hiện ở T19: lớp chặn thật là hook và các luật phía server.
- `skills` nạp toàn bộ nội dung skill vào ngữ cảnh lúc agent khởi động. Không có trường này, agent vẫn tự gọi được mọi skill qua tool `Skill`, trừ khi `tools` bỏ tool đó ra. Tài liệu không ghi cách viết tên skill của plugin trong trường này, nên task đầu sẽ thử `agent-skills:test-driven-development`.
- Subagent nạp `CLAUDE.md` và `.claude/rules/*.md` của dự án, nhưng không nạp auto memory của phiên chính. Khi chạy `claude --agent <role>`, prompt của agent thay hẳn system prompt mặc định của Claude Code.
- Hook khai trong frontmatter của agent bị bỏ qua cho tới khi bạn tin cậy thư mục. Kit vẫn khai hook trong `.claude/settings.json`.
- `.claude/settings.json` của dự án khai được plugin (`enabledPlugins`, `extraKnownMarketplaces`); máy khác mở dự án sẽ nhận plugin sau khi tin cậy thư mục.

Giá API hiện tại, tính bằng USD cho mỗi triệu token vào/ra: Haiku 5.5 0,10/0,50 (prompt dưới 100.000 token), Sonnet 5.5 2/10, Opus 5.5 4/20, Fable 5.1 10/50. [Inference] Anthropic không công bố cách gói Pro quy đổi token ra giới hạn usage, nên tỷ lệ giá là cách ước tốt nhất mình có: Opus tốn gấp đôi Sonnet, còn Haiku rẻ hơn Sonnet khoảng 20 lần. Mình không đề xuất Fable 5.1, vì giá gấp 2,5 lần Opus.

Plugin agent-skills 0.6.13 có 25 skill, mỗi skill ước 2.000 đến 5.000 token. Một số mặc định của skill trái với hợp đồng:

- `code-review-and-quality` gắn mức Critical, Required, Optional, Nit cho finding. Template `review-report.md` dùng Critical, High, Medium, Low, và `merge-gate` coi báo cáo có mức lạ là không đọc được.
- `spec-driven-development` để SPEC ở gốc repo. `planning-and-task-breakdown` để plan ở `tasks/plan.md` và danh sách task ở `tasks/todo.md`. Hợp đồng để cả hai ở `docs/specs/<EPIC-KEY>/` và để task trên Jira. Skill planning chấp nhận tracker ngoài khi rules của dự án chỉ định.
- `git-workflow-and-versioning` khuyên trunk-based, trái với GitFlow.

Bốn agent thử trong `ao-pilot` (`fe-dev`, `qa`, `reviewer`, `security`) đang được commit trong repo đó. Module này sẽ thay chúng.

## Giả định (sửa ngay nếu sai)

1. **Agent được sinh ra, không viết tay toàn bộ**, giống cách `docs/sdlc.md` được sinh từ YAML:
   - `agents/roster.yaml` ghi model, effort, tool và skill của từng vai trò.
   - `agents/prompts/<role>.md` ghi quy trình làm việc của vai trò, viết tay bằng tiếng Anh.
   - Một script ghép hai file đó với phần hợp đồng của vai trò, rồi ghi ra `kit/.claude/agents/<role>.md`. Phần hợp đồng gồm stage, artifact và template, transition được phép, App GitHub, file được sửa, và tên trong trường Agent. CI đỏ khi file agent cũ hơn nguồn, như `render:check`. Nhờ vậy, đổi hợp đồng thì agent đổi theo.
   - `npm run validate` có thêm quy tắc: mỗi vai trò agent có đúng một agent; tool chỉ lấy từ danh sách cho phép, và không bao giờ có `executeWrite`, `executeDestructive`; chỉ vai trò có transition trong hợp đồng mới có tool chuyển trạng thái; skill phải có trong agent-skills 0.6.13; model và effort hợp lệ.
2. **Quy ước chung nằm trong một file rules của kit**, `kit/.claude/rules/ai-orchestrator.md`, cũng sinh từ hợp đồng. File gồm: Jira site, cloud id và space; quy ước nhánh, commit, PR; ngôn ngữ; chỗ để template (bản chép kit thêm `.ai-orchestrator/templates/`); cách làm việc với PR; ledger; và quy tắc "hook từ chối thì dừng, báo nguyên văn lý do". Mọi agent và cả phiên chính của bạn đều nạp file này. `CLAUDE.md` của dự án để dành cho chính dự án.
3. **Skill:** mỗi agent nạp sẵn 1 đến 3 skill chính và không có tool `Skill`, để chạy ổn định và đỡ token. Prompt ghi rõ chỗ hợp đồng thắng mặc định của skill: đường dẫn, mức finding, GitFlow. agent-skills thành phụ thuộc của dự án, khai trong `settings.json` của kit.
4. **Phân công.** Tool Jira là các tool của server `atlassian`. Mọi agent có Read, Glob, Grep; cột "Tool thêm" chỉ ghi phần khác nhau.

| Vai trò | Việc | Skill nạp sẵn | Tool thêm | App GitHub | Jira |
|---|---|---|---|---|---|
| `pm` | Bản tổng hợp mỗi sáng, số liệu retro đếm được bằng JQL | Không | Bash (`gh` chỉ đọc), Write | Không | Chỉ đọc |
| `ba` | SPEC; tạo Story, Task; đề xuất triage Bug | `spec-driven-development`, `interview-me` | Bash, Write, Edit | `ao-dev` | Đọc, tạo, sửa, comment |
| `ux` | Luồng màn hình, wireframe (câu 2) | `frontend-ui-engineering` | Bash (git), Write, Edit | Không | Chỉ đọc |
| `sa` | Plan, hợp đồng API, ADR, thiết kế DB | `planning-and-task-breakdown`, `api-and-interface-design`, `documentation-and-adrs` | Bash, Write, Edit | `ao-dev` | Đọc, comment |
| `fe-dev`, `be-dev` | Code theo TDD, mở PR, sửa theo review | `test-driven-development`, `incremental-implementation`, cộng `frontend-ui-engineering` (FE) hoặc `api-and-interface-design` (BE) | Bash, Write, Edit | `ao-dev` | Đọc, sửa, comment; `start`; Sub-task `start`, `complete` |
| `reviewer` | Review năm trục, chặn Task trá hình | `code-review-and-quality` | Bash, Write; không có Edit | `ao-review` | Chỉ đọc |
| `security` | Security review, threat model | `security-and-hardening` | Như `reviewer` | `ao-review` | Chỉ đọc |
| `qa` | Chạy E2E và regression trên môi trường QA, báo cáo QA, tạo Bug | Không; prompt dựa trên persona `test-engineer` của agent-skills | Bash, Write | Không | Đọc, tạo Bug, sửa, comment; `pick-up`, `qa-fail` |
| `devops` | Workflow CI/CD, deploy, cắt release, ship, rollback | `ci-cd-and-automation`, `shipping-and-launch` | Bash, Write, Edit | `ao-dev` | Đọc, sửa, comment; `start` |

`reviewer` và `security` không chuyển trạng thái trên Jira, dù hợp đồng cho phép. `jira-sync` đã đưa item về In Progress dựa trên review trên GitHub (T18), nên trạng thái vẫn đi theo dữ kiện.

5. **Hai cách chạy.** `ba`, `ux`, `sa` làm việc trực tiếp với bạn: bạn mở `claude --agent ba`, và agent hỏi bạn từng câu. Khi được gọi mà không có bạn (subagent hoặc `claude -p`), chúng ghi câu hỏi vào mục Open Questions của artifact rồi dừng. Bảy vai trò còn lại chạy không cần hỏi; gặp chỗ phải quyết thì gắn cờ "Needs you" và dừng.
6. **E2E test do dev agent viết, trong PR của item.** Mỗi acceptance criterion có một test, cùng nhánh, cùng PR, và `reviewer` kiểm criterion nào cũng có test. `qa` không viết code: `qa` chạy bộ E2E và regression trên môi trường QA, kiểm thêm bằng tay theo acceptance criteria, ghi báo cáo, và tạo Bug cho lỗi nằm ngoài item. Cách này giữ quy ước "một item, một PR" và không đổi App. Nếu bạn muốn `qa` tự viết E2E để dev không tự chấm bài mình, `qa` cần App `ao-dev` và một bước mới trước review, tức là phải đổi hợp đồng.
7. **Agent không có trí nhớ riêng** (trường `memory`). Trạng thái nằm ở Jira, Git và ledger. Trí nhớ ở phạm vi dự án nằm trong `.claude/`, là đường dẫn được bảo vệ; ở phạm vi user thì dùng chung cho mọi dự án. Cả hai làm kết quả của agent khó đoán hơn.
8. **`pm` chỉ đọc.** Bản tổng hợp in ra trong phiên và lưu ở `.ai/reports/<ngày>.md`, không commit. Số liệu cần lịch sử của nhiều item (cycle time, thời gian chờ release, thời gian chờ bạn) sẽ do một script tất định tính ở Cấp 2 (`orchestrator-cli`). Ở Cấp 1, `pm` chỉ báo các số đếm được bằng JQL: throughput, lỗi lọt, item mang cờ.
9. **Kiểm thật trên `ao-pilot`** bằng một Epic nhỏ trên `DEMO`. Claude tự chuyền đầu vào từ agent này sang agent kia; `dev-workflow` sẽ tự động hóa việc đó sau. Mỗi agent chạy thật ít nhất một lần bằng `claude -p --agent <role>`, và thử một việc ngoài vai trò (ví dụ `qa` gọi `start`). Mỗi lần chạy ghi lại model, tool, số token và kết quả. Ước khoảng 15 lượt chạy, phần lớn là Sonnet. Bản chép kit mới vào `ao-pilot` qua một PR do bạn merge tay, vì PR đó sửa đường dẫn được bảo vệ.

## Câu hỏi

**1. Model cho từng vai trò?**

- **(a) Cân bằng (mình đề xuất).** `pm` dùng Haiku. `ba`, `sa`, `reviewer` dùng Opus: SPEC và plan sai thì mọi bước sau sai theo, mà mỗi Epic chỉ viết một lần; `reviewer` dùng model khác dev để không "tự chấm bài", như lời khuyên trong `misc/chat.md`. Sáu vai trò còn lại dùng Sonnet; dev chạy nhiều nhất, nên đây là chỗ tiết kiệm lớn nhất. Effort: `pm` ở `low`, `ux` ở `medium`, các vai trò còn lại ở `high`.
- **(b) Tiết kiệm.** `pm` dùng Haiku, còn lại dùng Sonnet. `reviewer` khác dev ở prompt và ngữ cảnh mới, không khác model.
- **(c) Chất lượng.** Như (a), thêm `security` dùng Opus.

**2. `ux` giao gì, và lưu ở đâu?** Hợp đồng chưa có artifact này, dù DoR của Story đòi "có thiết kế màn hình nếu đụng tới giao diện".

- **(a) Artifact mới `design` (mình đề xuất).** Template `templates/design.md`, lưu ở `docs/specs/<EPIC-KEY>/design.md`. File gồm danh sách màn hình, luồng màn hình vẽ bằng Mermaid, wireframe của từng màn hình bằng khối ASCII, các trạng thái (rỗng, đang tải, lỗi) và ghi chú accessibility. Mục Design của Story trỏ tới màn hình trong file này. Đây là thay đổi hợp đồng: thêm artifact vào `policies.yaml`, thêm `design` vào đầu ra của stage `spec`, thêm template. Ưu điểm: text nằm trong Git, review được trong PR, ít token.
- **(b) Wireframe HTML tĩnh** ở `docs/specs/<EPIC-KEY>/design/*.html`, mở bằng trình duyệt. Dễ hình dung hơn, nhưng tốn token hơn nhiều, và diff khó review.
- **(c) Không thêm artifact.** `ux` viết mục "Màn hình" ngay trong `spec.md`.

Bạn trả lời hai câu trên và sửa giả định nếu cần. Sau đó mình viết `SPEC-agent-roster.md` rồi dừng lại để bạn duyệt.

## Nguồn

- [Claude Code Docs: Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Docs: Skills](https://code.claude.com/docs/en/skills)
- [Claude Code Docs: How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Claude Code Docs: Settings files and precedence](https://code.claude.com/docs/en/settings)
- Giá model: skill `claude-api` có sẵn trong Claude Code, bảng giá cập nhật ngày 2026-10-06
- agent-skills 0.6.13: `skills/*/SKILL.md` và `agents/*.md` trong thư mục plugin

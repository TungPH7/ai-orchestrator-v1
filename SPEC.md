# SPEC: ai-orchestrator-v1 — Tổng quan và Capability Map

> **Trạng thái:** capability map và `SPEC-sdlc-contract.md` đã được duyệt ngày 2026-10-26, kể cả các sửa đổi theo Phiên 3 · Lượt 1–2 (cấu trúc repo, nhánh cho Story có cả FE và BE, release theo quyết định của bạn). Module `sdlc-contract` hoàn thành ngày 2026-10-27; plan và danh sách task lưu ở [tasks/archive/sdlc-contract/](tasks/archive/sdlc-contract/plan.md). Module `tracker-integration` hoàn thành ngày 2026-10-28; plan lưu ở [tasks/archive/tracker-integration/](tasks/archive/tracker-integration/plan.md). Module `quality-gates` hoàn thành ngày 2026-10-29; plan lưu ở [tasks/archive/quality-gates/](tasks/archive/quality-gates/plan.md).
>
> **Lịch sử thảo luận:** [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md)

File này là chỉ mục của dự án: mục tiêu, các quyết định đã chốt, capability map và danh sách module spec. Chi tiết của từng module nằm trong file `SPEC-<module-id>.md` đặt cùng thư mục.

## Mục tiêu

Xây một bộ điều phối (orchestrator) để phát triển dự án web với các AI coding agent chuyên trách, theo SDLC:

```
spec → plan → build (TDD: unit + integration test viết ngay trong từng task)
     → quality gate tự động (lint, test, SAST, secret scan, ...)
     → review (code + security)
     → merge PR (GitHub)
     → QA test (E2E, regression)
     → ship
```

Mỗi giai đoạn phải có agent phụ trách, đầu vào, đầu ra (artifact) và điều kiện để qua cổng. Mức tự động được nâng dần:

| Cấp | Tên | Nội dung |
|---|---|---|
| 1 | Workflow | Bộ kit gồm agent, lệnh, template, quy tắc và CI. Bạn tự giao việc và duyệt từng bước |
| 2 | Semi-automated orchestration | CLI tất định đọc trạng thái, gọi agent cho bước kế tiếp, dừng lại ở cổng cần duyệt |
| 3 | Custom orchestrator | Workflow engine, trạng thái bền vững, dependency graph, retry, phân quyền, audit log, Kanban riêng |

**Người dùng:** bạn. Ở Cấp 1, bạn vừa là người điều phối agent, vừa là Product Owner và là người duyệt duy nhất. Tester và khách hàng chỉ tham gia ở môi trường Development và Staging.

**Tiêu chí thành công của Cấp 1:**

1. **Pilot 1:** một feature nhỏ trên dự án mẫu Next.js + NestJS đi từ SPEC đến khi merge vào `develop`. Mỗi cổng có artifact làm bằng chứng. Trạng thái trên Jira đổi theo dữ kiện thật (PR, CI, deploy), không theo lời agent tự khai.
2. **Pilot 2:** feature đó đi tiếp qua Development, Staging rồi Production theo GitFlow, và chạy thử được rollback.

## Quyết định đã chốt

Tất cả được chốt ngày 2026-10-26.

| Chủ đề | Quyết định |
|---|---|
| Dự án pilot | Mẫu Next.js + NestJS (cùng TypeScript). Profile Spring Boot làm sau |
| Hạ tầng | Development, Staging, Production chạy Docker trên VPS |
| Tracker | Jira Cloud `phunghuutung12b4.atlassian.net` (bạn là admin). Agent kết nối qua Atlassian Rovo MCP |
| Branching | GitFlow: `feature/*` → `develop` (Development) → `release/*` (Staging) → `main` + tag (Production). `hotfix/*` tách từ `main` |
| Cấu trúc repo | Monorepo: FE (Next.js) ở `apps/web`, BE (NestJS) ở `apps/api`. Story có cả FE và BE dùng một nhánh, một PR. Công cụ quản lý monorepo chọn ở `project-scaffold` |
| Quy trình quản lý | Kanban: agent kéo việc khi còn chỗ WIP. Thứ 2 sắp backlog và duyệt SPEC/plan, thứ 6 retro. Không dùng Scrum |
| Release | Không theo lịch cố định: bạn quyết định lúc cắt release lên Staging và lúc lên Production. Nhánh release tách từ điểm cắt trên `develop`. Trước đó từng chốt cắt release cố định vào thứ 5 |
| Xương sống skill | agent-skills 0.6.13 (plugin). Không cài Superpowers; chỉ lấy chọn lọc ý từ Superpowers, agency-agents và orchestrator.inc |
| Repo kit | `ai-orchestrator-v1`, trên GitHub là `TungPH7/ai-orchestrator-v1`. Nhánh `main`, mỗi task một nhánh ngắn, xong thì merge vào `main` qua PR. Repo kit không dùng GitFlow vì không deploy lên môi trường nào |
| Runtime cho script | Chỉ Node.js. Khi thật sự cần công cụ chỉ có bản Python thì gọi qua `uvx` |
| Lưu trữ tài liệu | Tài liệu text (spec, plan, ADR, báo cáo) trong Git. Bằng chứng nặng (video, trace, báo cáo HTML, coverage) là artifact của GitHub Actions. Ảnh lỗi đính kèm Jira. Tài liệu gửi khách trên Google Drive |

## Giả định đã duyệt

1. Bạn là người điều phối và người duyệt duy nhất ở Cấp 1.
2. Sản phẩm của Cấp 1 là một bộ kit đặt trong repo `ai-orchestrator-v1`; một script cài và đồng bộ kit vào từng dự án. Agent đặt ở `.claude/agents/` của dự án, vì chỗ này hỗ trợ đủ `hooks`, `mcpServers` và `permissionMode`. Việc đóng gói kit thành plugin để sau.
3. Xương sống là agent-skills, như bảng trên.
4. Mỗi loại dữ liệu chỉ có một nguồn sự thật: Jira giữ trạng thái task; Git giữ nội dung (spec, plan, ADR, báo cáo); GitHub giữ bằng chứng (PR, CI, review).
5. Có 5 cổng bạn phải duyệt: SPEC, plan, merge PR, cắt release lên Staging, release lên Production. Agent không bao giờ được tự chuyển task sang Done.
6. Prompt, định nghĩa agent và template viết tiếng Anh. Tài liệu cho người đọc (spec, plan, báo cáo, ticket Jira) viết tiếng Việt. Code, commit và PR viết tiếng Anh.
7. Script của kit viết bằng Node.js.
8. Usage có giới hạn (gói Pro): mỗi agent được gán model theo độ khó (Haiku, Sonnet hoặc Opus) và hạn chế chạy nhiều agent song song.
9. Spec lưu trong `ai-orchestrator-v1/`: `SPEC.md` là chỉ mục, mỗi module có một file `SPEC-<module-id>.md`.

## Giai đoạn và môi trường

| Giai đoạn | Chạy ở đâu | Nhánh |
|---|---|---|
| spec, plan | Local (Claude Code) | Không có (tài liệu lưu trong repo) |
| build (TDD) | Local | `feature/<JIRA-KEY>-...` tách từ `develop` |
| Quality gate tự động | CI (GitHub Actions) trên PR | PR vào `develop` |
| Review (code + security) | Trên PR | PR |
| Merge PR | GitHub | Vào `develop` |
| QA test (E2E, regression) | Development, tự deploy mỗi khi `develop` có commit mới | `develop` |
| UAT, demo khách hàng | Staging, data giống production nhưng đã ẩn danh | `release/x.y.z` tách từ điểm cắt trên `develop`, khi bạn quyết định |
| Ship | Production, phải duyệt tay | Merge `release/*` vào `main`, gắn tag `vX.Y.Z`, merge ngược về `develop` |
| Hotfix | Staging để kiểm nhanh, rồi Production | `hotfix/<JIRA-KEY>-...` tách từ `main` |

Staging và Production dùng cùng một Docker image build từ nhánh `release/*`; hai môi trường chỉ khác cấu hình. Điều kiện qua từng cổng sẽ nằm trong `SPEC-sdlc-contract.md`.

## Capability map — Cấp 1

| Module id | Trách nhiệm | Phụ thuộc |
|---|---|---|
| `sdlc-contract` | Quy trình chuẩn ở dạng máy đọc được (YAML + Markdown). Mỗi giai đoạn ghi rõ agent phụ trách, đầu vào, đầu ra và điều kiện qua cổng. Module này còn chứa: state machine của task, DoR/DoD, các cổng duyệt, ánh xạ môi trường, artifact templates, và quy tắc xử lý lỗi (retry tối đa mấy lần, khi nào báo bạn). Bổ sung 2026-10-26: phân cấp work item, nhịp làm việc, release theo quyết định của bạn, giới hạn WIP | — |
| `agent-roster` | Định nghĩa từng subagent: phạm vi, đầu vào/đầu ra, tool được phép, skill được dùng, model. Dựa trên 10 vai trò bạn đã chốt trong `misc/chat.md` | sdlc-contract |
| `tracker-integration` | Workflow và board Jira khớp với state machine; cài Rovo MCP; quy ước gắn mã Jira vào nhánh, commit, PR; liên kết Jira với GitHub. Bổ sung 2026-10-26: Kanban board, giới hạn WIP cho từng cột, Fix Version cho từng bản release | sdlc-contract |
| `quality-gates` | Pre-commit hook ở local; pipeline CI trên PR; branch protection; script kiểm tra đã có đủ artifact chưa. Bổ sung 2026-10-29: danh tính GitHub App cho agent, `merge-gate` và `audit` thay cho branch protection trên gói Free | sdlc-contract, tracker-integration |
| `dev-workflow` | Lệnh điều phối vòng trong: spec → plan → build → review → merge vào `develop`. Mỗi lệnh gọi đúng agent, tạo artifact, kiểm tra cổng, cập nhật Jira | agent-roster, tracker-integration, quality-gates |
| `release-workflow` | Vòng ngoài trên Docker/VPS: tự deploy `develop` lên Development; QA (E2E, regression); tính điểm cắt và cắt `release/*` lên Staging; release lên Production; hotfix; rollback | agent-roster, tracker-integration, quality-gates |
| `project-scaffold` | Profile theo stack (Next.js + NestJS trước, Spring Boot sau) và script cài/đồng bộ kit vào dự án | Tất cả module trên |

**Thứ tự build:**

```
sdlc-contract → agent-roster, tracker-integration (làm song song được)
              → quality-gates (cần tracker-integration, đổi ngày 2026-10-29)
              → dev-workflow → release-workflow → project-scaffold
```

- **Pilot 1**, sau khi xong `dev-workflow`: chạy thủ công một feature nhỏ trên dự án mẫu Next.js + NestJS, từ spec đến merge vào `develop`. Lúc này chưa có `project-scaffold`, nên kit được chép tay vào dự án pilot.
- **Pilot 2**, sau khi xong `release-workflow`: đưa feature đó đi tiếp qua Development, Staging rồi Production.
- **Cuối cùng**, `project-scaffold` đóng gói những gì đã chạy được để dùng cho các dự án sau.

## Lộ trình Cấp 2–3 (chưa viết spec)

| Module id | Cấp | Trách nhiệm | Phụ thuộc |
|---|---|---|---|
| `orchestrator-cli` | 2 | CLI tất định: đọc trạng thái từ Jira, GitHub và artifact; kiểm tra cổng; tự gọi Claude Code headless cho bước kế tiếp; dừng lại ở cổng cần duyệt | dev-workflow, release-workflow |
| `ci-agents` | 2 | Claude Code GitHub Action: tự review PR, tự sửa khi CI fail | quality-gates, agent-roster |
| `workflow-engine` | 3 | Trạng thái bền vững, dependency graph, retry/timeout, phân quyền, ngân sách, audit log, chạy nhiều agent song song | orchestrator-cli |
| `kanban-board` | 3 | Board riêng (hoặc tích hợp orchestrator.inc), lấy dữ liệu từ workflow-engine | workflow-engine |

## Nguyên tắc xuyên suốt

- Bộ điều phối ở Cấp 2–3 là code tất định (state machine), không phải một LLM đứng giữa ra lệnh. Nếu một LLM tóm tắt lại kết quả giữa các bước thì ngữ cảnh bị mất dần và token tốn gấp đôi.
- Ngay từ Cấp 1, `sdlc-contract` viết ở dạng máy đọc được, và agent chuyển giao cho nhau bằng file, không bằng lời tóm tắt.
- Trạng thái task được suy ra từ dữ kiện thật (PR, CI, deploy, báo cáo QA), không tin lời agent tự khai. Mọi việc đang chờ bạn được gom về một chỗ ("Needs you").

## Danh mục module spec

| Module id | File | Trạng thái |
|---|---|---|
| `sdlc-contract` | [`SPEC-sdlc-contract.md`](SPEC-sdlc-contract.md) | Hoàn thành 2026-10-27; plan lưu ở [`tasks/archive/sdlc-contract/`](tasks/archive/sdlc-contract/plan.md) |
| `agent-roster` | `SPEC-agent-roster.md` | Chưa viết |
| `tracker-integration` | [`SPEC-tracker-integration.md`](SPEC-tracker-integration.md) | Hoàn thành 2026-10-28; plan lưu ở [`tasks/archive/tracker-integration/`](tasks/archive/tracker-integration/plan.md) |
| `quality-gates` | [`SPEC-quality-gates.md`](SPEC-quality-gates.md) | Hoàn thành 2026-10-29; plan lưu ở [`tasks/archive/quality-gates/`](tasks/archive/quality-gates/plan.md) |
| `dev-workflow` | `SPEC-dev-workflow.md` | Chưa viết |
| `release-workflow` | `SPEC-release-workflow.md` | Chưa viết |
| `project-scaffold` | `SPEC-project-scaffold.md` | Chưa viết |

## Câu hỏi mở

Không còn câu hỏi mở.

## Câu hỏi đã đóng

- **Loại Jira space cho dự án pilot:** company-managed, chốt ngày 2026-10-27 trong `tracker-integration` (mục 2.3 của [`SPEC-tracker-integration.md`](SPEC-tracker-integration.md)). Space `DEMO` được dựng theo loại này.
- **Tên môi trường cho panel Deployments của Jira:** ba GitHub environment `development`, `staging`, `production`, khai báo trong `.jira/config.yml` ở nhánh mặc định (mục 2.9). Ngày 2026-10-28, panel Deployments của `DEMO-3` nhận đúng ba loại môi trường này.

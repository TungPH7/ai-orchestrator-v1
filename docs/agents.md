# Agent

> **Spec:** [SPEC-agent-roster.md](../SPEC-agent-roster.md). Tài liệu này dành cho bạn. Nó trả lời: mười agent làm gì, chạy chúng thế nào, nâng effort ra sao, thêm skill theo stack thế nào. Nó cũng hướng dẫn viết `design.md`, đưa ảnh Figma vào repo và theo dõi dung lượng repo. Số đo nêu ở đây lấy từ lần chạy thật trên `ao-pilot`, ghi trong [tasks/archive/agent-roster/verification.md](../tasks/archive/agent-roster/verification.md).

## Mười vai trò

| Vai trò | Việc chính | Model | Effort | `maxTurns` | Ghi được | Git | App |
|---|---|---|---|---|---|---|---|
| `pm` | Bản tổng hợp mỗi sáng của space, thứ Sáu thêm số liệu retro | Sonnet | `medium` | 20 | `.ai/**` | Đọc | Không |
| `ba` | SPEC của Epic; tạo Story, Task, Sub-task theo plan | Opus | `xhigh` | 90 | `docs/specs/**`, `CHANGELOG.md`, `.ai/**` | Ghi | `ao-dev` |
| `ux` | `design.md` của Epic có giao diện | Sonnet | `xhigh` | 60 | `docs/specs/**`, `.ai/**` | Ghi | Không |
| `sa` | Phần kiến trúc của SPEC, plan, ADR | Opus | `xhigh` | 80 | `docs/specs/**`, `docs/adr/**`, `.ai/**` | Ghi | `ao-dev` |
| `fe-dev` | Code giao diện theo TDD, mở PR | Opus | `high` | 260 | Mọi file, trừ đường dẫn được bảo vệ | Ghi | `ao-dev` |
| `be-dev` | Code backend theo TDD, mở PR | Opus | `high` | 170 | Như `fe-dev` | Ghi | `ao-dev` |
| `reviewer` | Review PR theo năm trục, đăng báo cáo | Opus | `xhigh` | 70 | `.ai/**` | Đọc | `ao-review` |
| `security` | Review bảo mật của PR, đăng báo cáo | Opus | `max` | 120 | `.ai/**` | Đọc | `ao-review` |
| `qa` | Kiểm từng AC trên môi trường QA, báo cáo lên item | Opus | `high` | 80 | `.ai/**` | Đọc | Không |
| `devops` | Sửa CI/CD qua PR do bạn merge; sau này cắt release, ship | Opus | `high` | 50 | Như `fe-dev`, thêm `.github/workflows/**` | Ghi | `ao-dev` |

- **`maxTurns`** bằng gấp đôi số lượt model cao nhất đo được của vai trò, làm tròn lên hàng chục. Giới hạn này chặn agent chạy vòng tròn và đốt usage. Lượt cao nhất của `fe-dev` (130) là lượt chạy ở `max` của phép so, nên giới hạn vẫn đủ khi bạn nâng effort cho một item khó. Agent chạm giới hạn thì `claude -p` dừng với `error_max_turns`. Nếu điều đó lặp lại ở một vai trò, nâng giới hạn của vai trò đó trong `agents/roster.yaml` qua một PR.
- **Quyền Jira:** `pm`, `ux`, `reviewer` và `security` chỉ đọc. `sa` đọc và comment. `ba` tạo và sửa item, và tạo link Blocks giữa các item theo phụ thuộc trong plan (qua `executeWrite`; hook chỉ cho đúng thao tác `createJiraIssueLink` loại Blocks trong space dự án). Dev agent, `qa` và `devops` chuyển trạng thái theo hợp đồng. Không agent nào chuyển item sang Done hay Cancelled, approve PR, hay sửa đường dẫn được bảo vệ (riêng `devops` được sửa workflow).
- **Skill nạp sẵn** của từng vai trò nằm ở mục 2.3 của spec.

Agent được sinh, không viết tay. `agents/roster.yaml`, prompt `agents/prompts/<role>.md`, `agents/rules.md` và hợp đồng được ghép thành `kit/.claude/agents/<role>.md` và `kit/.claude/rules/ai-orchestrator.md` bằng `npm run agents`. Muốn đổi agent thì sửa nguồn, chạy lại lệnh, rồi commit cả hai. `npm run agents:check` trong CI đỏ khi file sinh ra cũ hơn nguồn.

## Chạy một agent

Có hai cách:

- **Subagent:** trong phiên Claude Code của bạn, bảo Claude giao việc cho agent, ví dụ "dùng agent `qa` để QA Story DEMO-12". Claude Code áp đủ frontmatter: skill, effort, `maxTurns`.
- **Phiên chính:** chạy `node .ai-orchestrator/scripts/ao-agent.mjs <role>` từ gốc repo dự án. `claude --agent` tự nó bỏ qua skill, effort và `maxTurns` của agent, nên script truyền chúng bằng cờ của `claude`.
  - Không có `-p`: agent làm trực tiếp với bạn. Dùng cách này cho `ba`, `ux`, `sa` khi bạn muốn trả lời câu hỏi ngay.
  - Có `-p "<prompt>"`: agent chạy một mình, có `--max-turns`. Câu hỏi của `ba`, `ux`, `sa` được ghi vào mục Open Questions của artifact.
  - `--ao-dry-run` in lệnh `claude` và các biến môi trường của phiên mà không chạy; token không bao giờ được in. Các cờ khác, như `--output-format stream-json --verbose`, được truyền nguyên cho `claude`.
  - Phiên của agent làm việc trên GitHub bằng hai App, không bằng login `gh` và git của bạn (`dev-workflow`, spec mục 2.3). `GH_TOKEN` là token chỉ đọc của `ao-review`. `git` lấy token qua `ao-git-credential.mjs`: vai trò có git ghi nhận token của `ao-dev` (riêng `devops` có thêm quyền Workflows), vai trò chỉ đọc nhận token chỉ đọc để `git fetch`. Commit đứng tên bot `ao-dev`. Không lấy được token thì agent không chạy.

Prompt ngắn là đủ, vì agent tự đọc item, hợp đồng và template. Đây là các prompt đã dùng khi chạy thật:

```
node .ai-orchestrator/scripts/ao-agent.mjs devops -p "Do Task DEMO-16. It is Ready. The branch develop is checked out and up to date with origin."
node .ai-orchestrator/scripts/ao-agent.mjs reviewer -p "Review PR #12."
node .ai-orchestrator/scripts/ao-agent.mjs pm -p "Write the morning brief of DEMO."
```

Prompt của `qa` nên nói môi trường QA ở đâu, vì Deploy của sandbox là deploy giả. Ví dụ: "Do QA of Story DEMO-12. It is Ready for QA … its server already runs at http://127.0.0.1:3000/; leave that server running."

**Khi chạy:**

- Chạy từng agent một trên cùng bản checkout, không chạy song song. Hai agent chạy E2E cùng lúc sẽ tranh cổng, và máy ít RAM có thể dừng shell nền.
- Agent ghi tiến độ vào `.ai/ledger/<KEY>.md` sau mỗi bước. Khi hết usage giữa chừng, chạy lại agent với prompt bảo nó đọc ledger rồi làm tiếp.
- Gặp chỗ cần bạn quyết, agent gắn cờ "Needs you" lên item rồi dừng. Hook từ chối thì agent trích nguyên văn lý do rồi dừng, không tìm đường khác.
- Agent tự mở server để xem trang thì chỉ dừng đúng process của nó, không dừng mọi `node`.

**Chi phí đo được** (quy ra USD theo giá API, gói Pro không trả theo cách này nhưng tỉ lệ giữa các lượt vẫn đúng):

| Việc | Lượt chạy | USD |
|---|---|---|
| Stage spec của một Epic nhỏ | `ba`, `ux`, `sa`, kể cả các lần resume | 5,30 |
| Stage plan | `sa` 2 lượt, `ba` | 6,51 |
| Một Story có Sub-task BE và FE, tới QA | `be-dev`, `fe-dev`, `reviewer`, `security`, `qa` | 17,16 |
| Một Task sửa workflow | `devops`, `reviewer`, `security` | 4,70 |
| Bản tổng hợp sáng | `pm` | 0,09 |

`security` ở `max` thường là lượt đắt nhất của một PR: 3–6 USD và 10–22 phút.

## Nâng effort

Mỗi vai trò có effort trong roster. Agent không tự đổi được effort của phiên mình. Người khởi động lượt chạy đổi được cho riêng lượt đó, theo một trong hai cách:

```
CLAUDE_CODE_EFFORT_LEVEL=max node .ai-orchestrator/scripts/ao-agent.mjs fe-dev -p "..."
node .ai-orchestrator/scripts/ao-agent.mjs fe-dev --effort max -p "..."
```

- Biến môi trường thắng cờ `--effort` mà script truyền (kiểm bằng Haiku ở T21). Cách thứ hai dùng được vì script không truyền mức của roster khi bạn đã truyền `--effort`. `--max-turns <n>` của bạn cũng thay giới hạn của roster theo cách đó.
- Khi subagent chạy, biến môi trường cũng thắng effort trong frontmatter.
- **Có đáng nâng không:** ở phép so của T21, `fe-dev` ở `max` tốn gấp 3,2 lần và chạy lâu gấp 3,9 lần so với `high`. Kết quả thì như nhau: cùng cách làm, cùng đạt checklist và trường hợp biên, cùng mức finding. Vì vậy roster giữ `high`. Chỉ nâng cho item thật sự khó, hoặc item bị trả về lần hai.
- Chọn effort theo từng item (`sa` ghi mức trong plan, bạn duyệt ở gate ②, script đọc nhãn của item) là việc của `dev-workflow`.

## Cache của lượt chạy

`ao-step` chạy mỗi agent với `CLAUDE_CODE_PROMPT_CACHE_TTL=5m`. Trên gói subscription, `claude -p` mặc định ghi cache loại 1 giờ. Một lượt agent gọi API cách nhau vài giây, nên cache 5 phút là đủ, mà giá ghi rẻ hơn: với Opus 5.5 là 5 USD cho 1 triệu token, so với 8 USD của loại 1 giờ. Ở phép đo trên PR #4 của `ao-sample` (Pilot 1), chỉ riêng việc này đã giảm lượt `reviewer` từ 1,18 xuống 0,95 USD. Biến cần Claude Code từ v2.1.242. Chạy tiếp một lượt sau hơn 5 phút, ví dụ sau giới hạn 5 giờ, thì lượt đó ghi lại cache một lần.

## Skill

- **16 skill chép vào kit** nằm ở `.claude/skills/` của dự án, ghim theo commit trong `agents/roster.yaml`. Đó là 13 skill của agent-skills, cộng `playwright-cli`, `sentry-security-review` và `gha-security-review`. Cập nhật một skill: chạy `npm run skills:vendor -- <name>` trong repo kit sau khi đổi commit trong roster, rồi đọc diff trong PR.
- **Skill theo stack** do từng dự án khai, trong `.ai-orchestrator/roster.local.yaml`:

  ```yaml
  roles:
    fe-dev:
      skills: [vercel-react-best-practices]
  ```

  File này chỉ thêm skill, không đổi model, effort hay tool. Chép thư mục skill vào `.claude/skills/` của dự án, rồi chạy `node .ai-orchestrator/scripts/render-agents.mjs --project .` để sinh lại agent của dự án. Cả hai thư mục là đường dẫn được bảo vệ, nên PR đó do bạn merge.

## Trình duyệt

- `qa` dùng `playwright-cli` qua `npx -y @playwright/cli@0.1.22`, không cài gì lên máy, và lưu ảnh vào `.ai/qa/<KEY>/`. Lệnh `open` vẫn tự ghi snapshot vào `.playwright-cli/` ở gốc dự án, nên thêm `.playwright-cli/` vào `.gitignore` cùng `.ai/`.
- `fe-dev` dùng Chrome DevTools MCP để xem console, network và bố cục của trang đang code. Server `chrome-devtools` khai trong `.mcp.json` với profile tạm và không gửi thống kê. Bật nó một lần bằng `/mcp`, như server `atlassian`.

## `design.md`

`ux` viết `docs/specs/<EPIC-KEY>/design.md` theo template `design.md`, khi Epic có giao diện. Mỗi màn hình có một trong hai kiểu:

| | Kiểu ASCII | Kiểu Figma |
|---|---|---|
| Dùng khi | Màn hình chưa có thiết kế Figma | Màn hình đã có thiết kế Figma |
| Bố cục | Hình ASCII có đánh số khối | Ảnh export từ Figma trong `docs/specs/<EPIC-KEY>/design/` |
| Hành vi | YAML ngay dưới hình | YAML ngay dưới ảnh, như kiểu ASCII |

Năm quy tắc:

1. Màn hình đánh mã `S1`, `S2`. Khối đánh `[1]`, `[2]` theo thứ tự đọc, và được trỏ tới bằng mã đầy đủ, ví dụ `S1.4`. Sau khi SPEC được duyệt, số không đổi.
2. Hình ASCII chỉ dùng `+ - | [ ] _`, rộng tối đa 100 cột, trong khung chỉ có số và nhãn ngắn.
3. YAML nằm ngay dưới hình hoặc ảnh, khóa tiếng Anh, giá trị tiếng Việt.
4. Mermaid dùng mã màn hình làm tên nút.
5. `node .ai-orchestrator/scripts/check-design.mjs <file>` kiểm file; `ux` chạy lệnh này trước khi giao, và job `policy` của CI chạy lại trên mọi PR đụng tới `design.md` hay ảnh của nó.

Ảnh: export 1x, PNG hoặc JPG, mỗi ảnh tối đa 1 MB, cạnh dài tối đa 2.000 px, và mọi ảnh trong `design/` phải được `design.md` nhắc tới. Chỉ commit bản đã duyệt, vì ảnh bị thay vẫn nằm trong lịch sử Git.

## Đưa ảnh từ Figma vào repo

Bạn export ảnh; `ux` đổi tên, chuyển ảnh vào chỗ của nó rồi commit cùng `design.md`.

1. Mở file thiết kế trên Figma.
2. Chọn frame của màn hình: bấm tên frame trên canvas, hoặc trong panel **Layers** bên trái.
3. Ở panel bên phải, cuộn xuống mục **Export** và bấm dấu **+** (đối chiếu giao diện).
4. Chọn cỡ **1x** và định dạng **PNG**. Nếu file PNG nặng hơn 1 MB, ví dụ frame có nhiều ảnh chụp, export lại bằng **JPG**.
5. Bấm **Export \<tên frame\>** và lưu vào `.ai/design-inbox/<EPIC-KEY>/` của dự án. Thư mục này không được commit.
6. Frame dài hơn 2.000 px thì cắt thành nhiều phần bằng **Slice tool** (phím **S**), rồi export từng phần (đối chiếu giao diện).
7. Lặp lại cho bản mobile, nếu có.
8. Lấy link của frame: chuột phải vào frame, chọn **Copy/Paste as** → **Copy link** (đối chiếu giao diện). Dán các link vào mô tả Epic trên Jira.
9. Lưu phiên bản đã duyệt: mở menu chính, chọn **File** → **Save to version history** (phím tắt **Ctrl+Alt+S**), đặt tên, ví dụ "DEMO-11 duyệt" (đối chiếu giao diện). Báo tên này cho `ux`, vì `design.md` ghi nó ở dòng `Figma version:`.
10. Chạy `ux` cho Epic. Agent đổi tên ảnh theo mã màn hình (ví dụ `S2-desktop.png`), chuyển ảnh vào `docs/specs/<EPIC-KEY>/design/`, chạy `check-design`, rồi commit.

## Dung lượng repo và Git LFS

Một màn hình export 1x nặng khoảng 25–125 KB. Một Epic 6 màn hình, mỗi màn hình hai bản, khoảng 0,3–1,5 MB. GitHub coi repo dưới 1 GB là lý tưởng.

**Xem dung lượng:**

```
git count-objects -vH                               # size-pack: dung lượng lịch sử Git trên máy
gh api repos/<owner>/<repo> --jq .size              # dung lượng repo trên GitHub, tính bằng KB
```

**Bật LFS** khi dự án có nhiều ảnh, ví dụ trang marketing hay nhiều banner. Hãy bật ngay từ đầu, vì chuyển ảnh cũ sang LFS về sau phải viết lại lịch sử. Git for Windows đã có sẵn Git LFS.

1. Trên một nhánh mới, chạy:

   ```
   git lfs install
   git lfs track "docs/specs/**/design/**"
   ```

2. Commit file `.gitattributes` vừa được tạo, mở PR và merge, trước khi commit ảnh nào.
3. Xem hạn mức LFS của gói ở **Settings** → **Billing and licensing** trên GitHub (đối chiếu giao diện).

Job CI không tải file LFS. Với file con trỏ của LFS, `check-design` kiểm cỡ ghi trong con trỏ và bỏ qua kích thước ảnh.

## Những điều đã gặp khi chạy thật

- **Hook chặn lệnh Bash có chữ "atlassian"**, như `$ATLASSIAN_AGENT_TOKEN` hay một host Atlassian, vì agent chỉ gọi Jira qua server `atlassian`. Từ Pilot 1 (T10) có hai ngoại lệ. Một là thân heredoc ghi dữ liệu (`cat > <file> <<'EOF'` hay `tee <file> <<'EOF'`, delimiter trong ngoặc, không có gì sau trên dòng đó). Hai là link tới một work item (`/browse/<KEY>`, dừng ở key) trong lệnh không gọi mạng. Nhờ vậy lệnh ghi thân PR hay ledger có link Jira vẫn chạy; trước đó hook chặn nhầm 5 lệnh như vậy ở `SMP-2`, `SMP-5`, `SMP-6`. Lệnh gọi mạng (`curl`, `fetch(`…) có chữ "atlassian" ở bất cứ đâu, link đi tiếp sau key, và mọi lệnh nhắc tên biến token vẫn bị chặn (review của `ao-sample` PR #13). Khi bị chặn, agent ghi file bằng tool Write.
- **Vai trò chỉ đọc không chạy được `git archive`,** vì lệnh đó ghi file ra bất cứ đâu. Muốn đọc nhánh khác thì dùng `git show <ref>:<path>` hoặc `git diff <ref>`. Muốn chạy test của PR thì dùng worktree `.ai/reviews/pr-<PR>` mà `ao-step` tạo cho lượt review (Pilot 1, T10), không cần `git archive`. Với lệnh `ao-agent.mjs reviewer` chạy tay, không có worktree, nên `reviewer` không chạy được test của nhánh khác. `git check-ignore` thì được phép từ T22.
- **Bản chép kit cũ hơn kit PR #97** chặn nhầm việc đọc `ao-pr.mjs` bằng `sed` hay `grep`. Cập nhật bản chép kit thì hết.
- **Chỉ dẫn của tài khoản claude.ai đi vào phiên của agent.** Ví dụ, chỉ dẫn "Reality filter" làm `ba`, `ux`, `sa` gắn nhãn `[Unverified]` và `[Inference]` vào cả tài liệu được commit. Connector của tài khoản hiện trong event `init`, nhưng agent không gọi được, vì tool của nó bị giới hạn theo roster.
- **PR sửa đường dẫn được bảo vệ chỉ được báo trong log của Actions:** `merge-gate` in `Needs you #<n>` mà không comment lên PR, cũng không gắn cờ trên Jira. Xem bằng `node .ai-orchestrator/scripts/merge-gate.mjs --dry-run` hoặc trong bản tổng hợp sáng của `pm`. Trước khi merge tay, PR vẫn cần đủ báo cáo `reviewer`, `security` và approval của bạn trên commit đầu, nếu không `audit` sẽ chặn deploy.
- **Agent dev làm Sub-task phải start cả Story** khi Story còn ở Ready, vì `submit` chỉ chuyển Story đang ở In Progress. Prompt của `fe-dev` và `be-dev` đã ghi điều này từ kit PR #102.

# Task: agent-roster

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-agent-roster.md](../SPEC-agent-roster.md). Làm theo thứ tự. Mỗi task viết test đỏ trước, commit riêng, rồi mới đánh dấu `[x]`.

**Quy ước chung cho mọi task:**

- Xong task thì `npm run validate`, `npm test`, `npm run render:check` và `npm run jira:checklist:check` phải xanh. Từ T13 thêm `npm run agents:check`.
- Mỗi quy tắc `A` và `D` có một test dương và ít nhất một fixture âm, đặt trong `tests/fixtures/agents/invalid/` hoặc `tests/fixtures/design/invalid/`.
- Test không gọi mạng.
- Task có nhãn **[bạn]** cần bạn làm một phần trên GitHub, Jira hoặc Windows. Claude ghi rõ từng bước bấm rồi dừng chờ.
- Key và token không bao giờ xuất hiện trong chat, commit, log hay lịch sử lệnh (plan, quyết định 8).
- Kiểm thật ghi vào `tasks/verification.md`: ngày, bước, kết quả. Mỗi lượt chạy agent ghi thêm model, effort, token vào và ra, chi phí quy đổi theo giá API, thời gian và số lượt.
- Agent chạy lần lượt, ở foreground, từ thư mục `ao-pilot`, và chỉ làm việc trên space `DEMO`.
- Cỡ task đếm theo file code và file cấu hình, không tính file test và fixture.
- Nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR. Commit theo `CLAUDE.md`: `type(scope): subject`, không body, không có dòng `Co-Authored-By`.
- Hỏi bạn trước khi cài phần mềm lên máy, thêm MCP server, hoặc đổi hợp đồng ngoài những gì ghi ở spec mục 2.11 (spec mục 8).

---

## Giai đoạn 1: tiền đề và hợp đồng

### [x] T1: Tiền đề về Claude Code (spec mục 2.12, điểm 1–5)

**Mô tả:** Claude dựng một dự án tạm trong scratchpad gồm:

- `git init`.
- Agent thử `.claude/agents/probe.md` chạy Haiku.
- `.claude/rules/probe.md` chứa một mã nhận biết.
- `.claude/settings.json` khai plugin agent-skills.

Chạy `claude -p --agent probe --output-format json` và một subagent gọi từ phiên `claude -p` để kiểm năm điểm:

1. `skills: [agent-skills:<skill>]` nạp nội dung skill khi agent không có tool `Skill`: agent trích được một dòng đặc trưng của `SKILL.md` và biết đường dẫn thư mục skill.
2. `effort` trong frontmatter có hiệu lực, và `CLAUDE_CODE_EFFORT_LEVEL` thắng nó. Cách đo: chạy cùng một prompt ở `low` và ở `max`, so số token ra.
3. Subagent và phiên `claude --agent` nạp `.claude/rules/*.md`: agent nhắc lại được mã nhận biết.
4. `tools` giới hạn tool của agent cả khi phiên ở chế độ auto: agent không gọi được tool nằm ngoài danh sách.
5. Plugin khai trong `.claude/settings.json` của dự án được Claude Code nhận, và biết ghim được bản 0.6.13 hay không.

Điểm nào sai thì Claude dừng, đề xuất sửa spec và chờ bạn duyệt.

**Kết quả (2026-10-30):** điểm 1 và 2 sai khi agent chạy làm phiên chính, và điểm 5 sai. Bạn duyệt cách sửa ở Phiên 14 · Lượt 2: chép 13 skill của agent-skills vào kit (T9) và viết script `ao-agent.mjs` (T14). Vì vậy `kit/.claude/settings.json` không thêm khóa plugin.

**Tiêu chí chấp nhận:**
- [x] Năm điểm có kết quả đúng hoặc sai, kèm bằng chứng (lệnh, số token, trích output), trong `tasks/verification.md`.
- [x] Spec và plan đã sửa theo kết quả, và bạn đã duyệt bản sửa.
- [x] Mọi lượt chạy dùng Haiku.

**Kiểm chứng:**
- [x] `npm test` xanh
- [x] Dự án tạm chỉ nằm trong scratchpad, không vào repo nào

**Phụ thuộc:** không

**File dự kiến:** `tasks/verification.md`, `SPEC-agent-roster.md`, `SPEC.md`, `tasks/plan.md`, `tasks/todo.md`

**Cỡ:** M

### [x] T2: Tiền đề về trình duyệt (điểm 6–7) [bạn]

**Mô tả:** Claude hỏi bạn trước khi cài (spec mục 8), rồi kiểm hai điểm:

6. `playwright-cli` 0.1.22: cài đúng bản (toàn cục, hoặc qua `npx`), mở một trang tĩnh trong scratchpad bằng Chrome hoặc Edge có sẵn mà không tải trình duyệt, rồi chụp snapshot và ảnh.
7. Chrome DevTools MCP 1.12.0 chạy từ `.mcp.json` của dự án tạm trên Windows, với `--isolated`, `--no-usage-statistics`, `--no-performance-crux` và biến `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS`. Agent thử chạy Haiku mở trang tĩnh và đọc console. Claude ghi tên tool của sáu nhóm mà `fe-dev` được dùng, để T8 điền vào roster.

Sau đó `kit/.mcp.json` thêm server `chrome-devtools` đúng như đã kiểm.

Bạn làm: đồng ý cài. Nếu Windows hỏi quyền mạng cho Chrome thì bấm **Allow**.

**Tiêu chí chấp nhận:**
- [x] Hai điểm có kết quả trong `tasks/verification.md`, cùng cách cài đã chốt.
- [x] `kit/.mcp.json` ghim bản và có đủ tham số; test kiểm các tham số đó.
- [x] Chrome chạy với profile tạm; profile Chrome của bạn không bị đụng tới.

**Kiểm chứng:**
- [x] `npm test` xanh

**Phụ thuộc:** T1 (dùng lại dự án tạm)

**File dự kiến:** `kit/.mcp.json`, `tests/repo.test.mjs`, `tasks/verification.md`

**Cỡ:** S

### [x] T3: Thay đổi hợp đồng và template `design.md` (spec mục 2.11, điểm 1–3)

**Mô tả:**

- `contract/policies.yaml` thêm artifact `design` theo spec mục 2.11.
- `contract/stages.yaml`: đầu ra của stage `spec` thành `[spec, design]`, kèm ghi chú.
- `templates/design.md` mới, theo spec mục 2.8:
  - bảng màn hình có cột kiểu;
  - dòng `Figma version:`;
  - một ví dụ cho mỗi kiểu màn hình;
  - mục Open Questions.
- `templates/spec.md` và `templates/story.md`: AC đánh số `AC<n>`. Mục Design của `story.md` ghi các màn hình mà Story phủ, hoặc "Không đổi giao diện".
- `npm run render` sinh lại `docs/sdlc.md`.

Capability map trong `SPEC.md` đã được cập nhật lúc duyệt spec.

**Tiêu chí chấp nhận:**
- [x] `npm run validate` nhận artifact mới cùng template của nó.
- [x] Test của hợp đồng và template phủ artifact `design` và cách đánh số AC.
- [x] `docs/sdlc.md` có artifact `design` và đầu ra mới của stage `spec`.

**Kiểm chứng:**
- [x] Bốn lệnh trong quy ước chung xanh

**Phụ thuộc:** không

**File dự kiến:** `contract/policies.yaml`, `contract/stages.yaml`, `templates/design.md`, `templates/spec.md`, `templates/story.md`, `docs/sdlc.md`

**Cỡ:** M

### [x] T4: NOT TESTED trong báo cáo QA (spec mục 2.9)

**Mô tả:**

- `templates/qa-report.md` thêm NOT TESTED cho từng AC và cho kết quả chung, cùng hướng dẫn về bằng chứng.
- `qaReportResult` của `lib/tracker/facts.mjs` nhận thêm NOT TESTED, để báo cáo mới nhất luôn là báo cáo được tính.

**Tiêu chí chấp nhận:**
- [x] Có test cho PASS, FAIL và NOT TESTED, ở cả dạng markdown lẫn ADF.
- [x] Một báo cáo NOT TESTED mới hơn che một báo cáo FAIL cũ hơn.
- [x] Với NOT TESTED, cả `qa-report-passed` lẫn `qa-report-failed` đều không thỏa.

**Kiểm chứng:**
- [x] `npm test` xanh

**Phụ thuộc:** không

**File dự kiến:** `templates/qa-report.md`, `lib/tracker/facts.mjs`

**Cỡ:** S

### Checkpoint 1

Xem [plan.md](plan.md#checkpoint-1).

---

## Giai đoạn 2: `design.md`

### [x] T5: `check-design` cho màn hình kiểu ASCII

**Mô tả:** `lib/quality/design.mjs` là hàm thuần. Hàm tách `design.md` thành bảng màn hình, Mermaid (lấy nút, mũi tên, khối ghi trên mũi tên bằng regex), hình ASCII (khối `text` có dòng đầu `S<n> · <tên> · <cỡ>`) và các khối YAML, rồi kiểm:

| Mã | Kiểm |
|---|---|
| D1 | YAML đọc được; khóa nằm trong danh sách; có `name` và `type`; `ac` gồm các mã `AC<n>` |
| D2 | Mỗi `[n]` trong hình có đúng một mục YAML trong màn hình đó, và ngược lại |
| D3 | Nút Mermaid khớp với màn hình; khối ghi trên mũi tên có trong màn hình nguồn |
| D4 | Hình không có ký tự vẽ khung Unicode hay emoji; mỗi dòng tối đa 100 cột; dòng đầu đúng dạng |
| D5 | Mã màn hình không trùng |
| D6 | Mỗi màn hình đúng một kiểu: có hình ASCII hoặc có ảnh, không có cả hai |

`scripts/check-design.mjs <file>` in từng lỗi kèm mã và số dòng; có lỗi thì thoát với mã 1.

**Tiêu chí chấp nhận:**
- [x] Mỗi mã lỗi có fixture âm; ví dụ trong `templates/design.md` sạch.
- [x] `[ ]` và `[___]` không bị tính là mã khối.
- [x] Đọc được file có xuống dòng CRLF.

**Kiểm chứng:**
- [x] `npm test` xanh; `node scripts/check-design.mjs templates/design.md` sạch

**Phụ thuộc:** T3

**File dự kiến:** `lib/quality/design.mjs`, `scripts/check-design.mjs`

**Cỡ:** M

### [x] T6: `check-design` cho màn hình kiểu Figma và ảnh

**Mô tả:** Thêm hai mã:

- D7, màn hình kiểu Figma:
  - khóa `figma` của màn hình là link figma.com có `node-id`;
  - alt của ảnh có dạng `S<n> · <tên> · <cỡ>`;
  - đầu file có dòng `Figma version:`.
- D8, ảnh:
  - ảnh nằm trong thư mục `design/` cạnh `design.md` và có thật;
  - là PNG hoặc JPG, xét theo nội dung file chứ không theo đuôi;
  - tối đa 1 MB, cạnh dài tối đa 2.000 px;
  - mọi file trong `design/` đều được nhắc tới.

Kích thước ảnh đọc từ header: chunk IHDR của PNG, marker SOF của JPEG. Với file con trỏ của Git LFS, D8 chỉ kiểm cỡ ghi trong con trỏ.

**Tiêu chí chấp nhận:**
- [x] Fixture do test tạo ra:
  - PNG và JPG nhỏ hợp lệ;
  - ảnh quá 1 MB;
  - header PNG 1440×4000;
  - ảnh thiếu, ảnh thừa;
  - file con trỏ LFS, một cái cỡ dưới 1 MB và một cái cỡ trên 1 MB;
  - link Figma không có `node-id`;
  - alt sai dạng;
  - thiếu dòng `Figma version:`.
- [x] Ví dụ kiểu Figma trong template, cùng ảnh mẫu của nó trong fixture, sạch.

**Kiểm chứng:**
- [x] `npm test` xanh

**Phụ thuộc:** T5

**File dự kiến:** `lib/quality/design.mjs`

**Cỡ:** M

### [x] T7: Job `policy` chạy `check-design`

**Mô tả:** `check-policy.mjs` chọn ra:

- các `design.md` mà PR thay đổi;
- các `design.md` nằm cạnh thư mục `design/` có file bị PR thay đổi.

Rồi chạy kiểm trên từng file. Lỗi được ghi vào job summary như các lỗi policy khác, và làm job đỏ. Hàm chọn file là hàm thuần, đặt trong `lib/quality/policy.mjs`.

**Tiêu chí chấp nhận:**
- [x] Test chọn file cho các trường hợp: đổi `design.md`; chỉ đổi ảnh; xóa `design.md`; đổi file nằm ngoài `docs/specs/`.
- [x] `check-policy.mjs --base <ref>` chạy ở máy, trên một nhánh tạm có `design.md` sai, ra lỗi D đúng mã.

**Kiểm chứng:**
- [x] `npm test` xanh. Phần kiểm trên PR thật làm ở T18 (tiêu chí 4)

**Phụ thuộc:** T6

**File dự kiến:** `scripts/check-policy.mjs`, `lib/quality/policy.mjs`

**Cỡ:** S

---

## Giai đoạn 3: roster, skill, gh-guard

### [x] T8: `agents/roster.yaml`, schema, quy tắc A1–A5

**Mô tả:** `agents/roster.yaml` viết theo spec mục 2.2, 2.3 và 6:

- mười vai trò;
- 16 skill chép vào kit (13 của agent-skills, ba từ registry), mỗi skill ghi repo, đường dẫn và SHA đầy đủ;
- các nhóm tool Chrome DevTools, lấy theo kết quả T2.

`maxTurns` chưa đặt; T22 đặt từ số đo.

File và script đi kèm:

- `agents/schema/roster.schema.json`.
- `lib/agents/roster.mjs`, đọc và kiểm roster.
- `scripts/validate-contract.mjs` kiểm thêm roster và in "Roster OK".

Năm quy tắc:

| Mã | Kiểm |
|---|---|
| A1 | Đúng schema |
| A2 | Mỗi vai trò agent của hợp đồng có đúng một mục trong roster, và ngược lại. Phần file prompt thêm ở T12 |
| A3 | Chỉ vai trò là actor của ít nhất một transition mới có quyền chuyển trạng thái |
| A4 | Mỗi skill nạp sẵn có mục trong `vendored_skills`. Phần kiểm thư mục và `SKILL.md` thêm ở T9 |
| A5 | Vai trò có App hoặc quyền git "Ghi" thì có Bash; vai trò có `Edit` hoặc `Write` thì có cột "Ghi được", và ngược lại |

**Tiêu chí chấp nhận:**
- [x] Roster thật qua cả năm quy tắc; mỗi quy tắc có fixture âm.
- [x] Giá trị trong roster khớp bảng ở spec mục 2.2 và 2.3; test so từng vai trò.

**Kiểm chứng:**
- [x] `npm run validate` in "Roster OK"; `npm test` xanh

**Phụ thuộc:** T1, T2

**File dự kiến:** `agents/roster.yaml`, `agents/schema/roster.schema.json`, `lib/agents/roster.mjs`, `scripts/validate-contract.mjs`

**Cỡ:** M

### [x] T9: Chép skill: `skills:vendor` và 16 skill (spec mục 2.7)

**Mô tả:** `lib/agents/vendor.mjs` làm bốn việc:

- đọc cây thư mục ở commit đã ghim bằng GitHub API;
- lấy file từ `raw.githubusercontent.com`;
- đổi `name:` khi cần;
- ghi `SOURCE.md`.

Đi kèm có `scripts/vendor-skills.mjs` và lệnh `npm run skills:vendor -- <name>`.

Claude tải 16 skill vào `kit/.claude/skills/`, kèm file giấy phép. Với agent-skills, file `LICENSE` ở gốc repo được chép vào thư mục của từng skill. Trước khi commit, Claude đọc hết nội dung 16 skill và ghi lại những chỗ trái quy ước của kit, để prompt ở T11–T12 xử lý. Ví dụ: skill `playwright-cli` hướng dẫn đính file vào PR bằng `gh`.

A4 kiểm thêm: mỗi skill chép vào có `SKILL.md`, và `name:` trùng tên skill.

**Tiêu chí chấp nhận:**
- [x] Test `vendor` chạy với cây thư mục ghi sẵn và cho ra đúng danh sách file; `name:` được đổi; `SOURCE.md` đủ nội dung.
- [x] Chạy lại `skills:vendor` cho 16 skill thì `git diff` rỗng.
- [x] 13 skill của agent-skills giống hệt bản plugin 0.6.13 đang cài trên máy bạn, so từng file.
- [x] Có file giấy phép MIT và Apache-2.0, và ghi chú CC BY-SA 4.0 cho phần tham khảo lấy từ OWASP.

**Kiểm chứng:**
- [x] `npm run validate`, `npm test` xanh

**Phụ thuộc:** T8

**File dự kiến:** `lib/agents/vendor.mjs`, `scripts/vendor-skills.mjs`, `package.json`, `kit/.claude/skills/**`

**Cỡ:** M

### [x] T10: `gh-guard` theo vai trò (spec mục 2.10)

**Mô tả:** `lib/agents/scope.mjs` là hàm thuần, chứa hai luật:

- `Edit`, `Write`, `NotebookEdit` chỉ được ghi vào file khớp cột "Ghi được" của vai trò.
- Vai trò có quyền git "Đọc" chỉ chạy lệnh git đọc, theo danh sách ở spec mục 2.10.

`kit/.claude/hooks/gh-guard.mjs` đọc `.ai-orchestrator/agents/roster.yaml` của bản chép kit và áp hai luật cho agent, tức lời gọi có `agent_type`. Phiên chính của bạn không bị ảnh hưởng. Nếu matcher của hook trong `kit/.claude/settings.json` chưa có `Edit`, `Write`, `NotebookEdit` thì thêm vào.

**Tiêu chí chấp nhận:**
- [x] Mỗi vai trò có test ghi file trong và ngoài phạm vi của mình.
- [x] Vai trò chỉ đọc chạy `git diff`, `git show`, `git fetch` thì qua; chạy `git checkout`, `commit`, `push`, `stash` thì bị chặn.
- [x] Lệnh gần giống như `git log --grep=commit` vẫn qua.
- [x] Lời từ chối nêu rõ vai trò và luật.

**Kiểm chứng:**
- [x] `npm test` xanh

**Phụ thuộc:** T8

**File dự kiến:** `lib/agents/scope.mjs`, `kit/.claude/hooks/gh-guard.mjs`, `kit/.claude/settings.json`

**Cỡ:** M

---

## Giai đoạn 4: prompt và sinh agent

### [x] T11: Prompt của `pm`, `ba`, `ux`, `sa`

**Mô tả:** Viết `agents/prompts/{pm,ba,ux,sa}.md` bằng tiếng Anh. File chỉ chứa phần viết tay (spec mục 2.1, 2.4, 2.5), gồm ba ý:

- cách làm việc;
- chỗ hợp đồng thắng mặc định của skill;
- khi nào dừng.

`ba`, `ux`, `sa` có hai cách chạy: làm trực tiếp với bạn; hoặc ghi câu hỏi vào Open Questions rồi dừng. `ux` làm theo luồng ảnh Figma ở spec mục 2.8. Nguồn của các ý lấy từ agency-agents được ghi trong comment HTML.

**Tiêu chí chấp nhận:**
- [x] Mỗi prompt có đủ ba ý trên, và không lặp lại phần mà render sinh tự động (spec mục 2.1).
- [x] Prompt xử lý những chỗ trái quy ước kit đã ghi ở T9.

**Kiểm chứng:**
- [x] Claude đọc lại từng prompt đối chiếu với spec mục 2.4

**Phụ thuộc:** T8, T9

**File dự kiến:** `agents/prompts/pm.md`, `agents/prompts/ba.md`, `agents/prompts/ux.md`, `agents/prompts/sa.md`

**Cỡ:** M

### [x] T12: Prompt của sáu vai trò còn lại, `agents/rules.md`

**Mô tả:**

- Viết prompt cho `fe-dev`, `be-dev`, `reviewer`, `security`, `qa`, `devops` theo cách của T11.
- `agents/rules.md` là phần viết tay của file quy ước chung (spec mục 2.6).
- A2 kiểm thêm: mỗi vai trò có file prompt.

**Tiêu chí chấp nhận:**
- [x] Như T11.
- [x] A2 có fixture âm cho trường hợp thiếu prompt và trường hợp thừa prompt.

**Kiểm chứng:**
- [x] `npm run validate`, `npm test` xanh

**Phụ thuộc:** T11

**File dự kiến:** sáu file `agents/prompts/*.md`, `agents/rules.md`, `lib/agents/roster.mjs`

**Cỡ:** M

### [x] T13: Sinh agent và file quy ước, `agents:check`

**Mô tả:** `lib/agents/render.mjs` là hàm thuần, ghép ba phần (spec mục 2.1):

- frontmatter: `name`, `description`, `tools` (gồm tool Jira theo quyền và tool MCP theo nhóm), `model`, `effort`, `skills`;
- phần hợp đồng;
- phần viết tay, đã bỏ comment HTML.

Hàm cũng sinh file quy ước từ `agents/rules.md` và hợp đồng, theo bảng ở spec mục 2.6.

Đi kèm có:

- `scripts/render-agents.mjs`;
- hai lệnh `npm run agents` và `npm run agents:check`;
- bước `agents:check` trong `.github/workflows/contract.yml`.

Claude sinh mười agent vào `kit/.claude/agents/` và file `kit/.claude/rules/ai-orchestrator.md`, rồi đọc lại cả mười file.

**Tiêu chí chấp nhận:**
- [x] Test `render` (spec mục 7):
  - từng trường frontmatter đúng;
  - transition chỉ hiện với vai trò có quyền chuyển trạng thái;
  - tên trường Agent, App và file được ghi đúng;
  - comment HTML bị bỏ;
  - chạy hai lần ra cùng kết quả, xuống dòng LF.
- [x] `agents:check` đỏ khi file sinh ra cũ hơn nguồn.
- [x] Mười file agent và file quy ước có trong kit; phần viết tay không lặp hay trái phần sinh tự động.

**Kiểm chứng:**
- [x] Năm lệnh xanh; CI của kit xanh trên PR của task

**Phụ thuộc:** T12

**File dự kiến:** `lib/agents/render.mjs`, `scripts/render-agents.mjs`, `package.json`, `.github/workflows/contract.yml`, `kit/.claude/agents/*.md`, `kit/.claude/rules/ai-orchestrator.md`

**Cỡ:** M

### [x] T14: Chế độ dự án: `--project`, `roster.local.yaml` và `ao-agent.mjs`

**Mô tả:** `render-agents.mjs --project .` sinh agent vào `.claude/` của dự án, từ bản chép ở `.ai-orchestrator/`. Bản chép vì vậy cần có thêm `agents/` và `templates/`. Script làm thêm hai việc:

- gộp các skill khai trong `.ai-orchestrator/roster.local.yaml`; file này chỉ thêm skill;
- điền key của space từ `AO_JIRA_SPACE` trong `.claude/settings.json`; bản trong kit để `<KEY>`.

`scripts/ao-agent.mjs` chạy agent làm phiên chính (spec mục 2.5). `lib/agents/launch.mjs` là hàm thuần, dựng lệnh `claude` và nội dung file skill từ roster, `roster.local.yaml` và các file `SKILL.md`. Script ghi file skill vào `.ai/agents/<role>.skills.md`, chạy `claude` với stdin, stdout, stderr nối thẳng, rồi trả về mã thoát của `claude`.

**Tiêu chí chấp nhận:**
- [x] Test:
  - skill được thêm đúng vai trò;
  - vai trò lạ hoặc skill không có thì báo lỗi rõ;
  - model, effort và tool không đổi được qua file này;
  - key của space được điền.
- [x] Test `launch` theo spec mục 7.

**Kiểm chứng:**
- [x] `npm test` xanh

**Phụ thuộc:** T13

**File dự kiến:** `scripts/render-agents.mjs`, `lib/agents/roster.mjs`, `lib/agents/launch.mjs`, `scripts/ao-agent.mjs`

**Cỡ:** M

### Checkpoint 2

Xem [plan.md](plan.md#checkpoint-2).

---

## Giai đoạn 5: lên `ao-pilot`

### [x] T15: Bản chép kit vào `ao-pilot` qua PR [bạn]

**Mô tả:** Claude tạo một Task trên `DEMO` và nhánh `feature/DEMO-<n>-agent-roster`, rồi chép vào `ao-pilot`:

- `.ai-orchestrator/`, gồm cả `agents/` và `templates/`;
- `.claude/agents/`, sinh bằng `--project .`;
- `.claude/rules/ai-orchestrator.md`;
- `.claude/skills/`;
- `.claude/settings.json`: setting `attribution`;
- `.claude/hooks/gh-guard.mjs`: bản vá của PR #70 và luật theo vai trò;
- `.mcp.json`: thêm `chrome-devtools`.

Claude cũng bỏ bốn agent thử cũ và thêm `.ai/` vào `.gitignore`.

Claude mở PR, rồi `reviewer` và `security` review, chạy bằng `ao-agent.mjs -p`. Đây là lượt chạy thật đầu tiên của hai agent này. File skill chép vào được kiểm bằng nguồn gốc (`skills:vendor` tải lại ra đúng các file đó), nên không cần agent đọc.

Bạn làm: approve PR, rồi tự merge, vì PR sửa đường dẫn được bảo vệ.

**Tiêu chí chấp nhận:**
- [x] Tiêu chí 6 của spec mục 9.
- [x] Hai báo cáo review được đăng bằng App `ao-review`, đúng template; số đo của hai lượt chạy nằm trong `tasks/verification.md`.

**Kiểm chứng:**
- [x] `audit` xanh trên commit merge

**Phụ thuộc:** T4, T7, T10, T14

**File dự kiến:** trên `ao-pilot`: `.ai-orchestrator/**`, `.claude/**`, `.mcp.json`, `.gitignore`

**Cỡ:** M

### [x] T16: `ao-pilot`: trang giỏ hàng tối thiểu và Playwright [bạn]

**Mô tả:** Theo quyết định 7 của plan, Claude thêm vào `ao-pilot`:

- một trang giỏ hàng tĩnh dùng `src/cart.ts`; phần logic là hàm thuần có unit test, để đạt ngưỡng coverage;
- script `serve` viết bằng `node:http`;
- `@playwright/test` ghim bản, chạy bằng Chrome có sẵn;
- một E2E test mẫu và lệnh `test:e2e`.

E2E chưa chạy trong CI. PR đi qua cổng như mọi PR: `reviewer` và `security` review (lượt đo thứ hai), bạn approve, rồi `merge-gate` merge.

Bạn làm: đồng ý cài `@playwright/test` vào `ao-pilot`; approve PR.

**Tiêu chí chấp nhận:**
- [x] `npm run test:e2e` xanh ở máy bạn, và CI xanh.
- [x] PR được `merge-gate` merge; deploy giả chạy; `audit` xanh.

**Kiểm chứng:**
- [x] Số đo của hai lượt review nằm trong `tasks/verification.md`

**Phụ thuộc:** T15

**File dự kiến:** trên `ao-pilot`: `web/**`, `scripts/serve.mjs`, `playwright.config.ts`, `e2e/**`, `package.json`, `package-lock.json`

**Cỡ:** M

### [x] T17: Trình duyệt: `qa` và `fe-dev` chạy thử (spec mục 7, kiểm thật 7)

**Mô tả:**

- `qa` mở trang giỏ hàng của T16 bằng `playwright-cli`, chụp snapshot và ảnh vào `.ai/qa/`.
- `fe-dev` mở cùng trang đó bằng Chrome DevTools MCP và đọc console.

Hai lượt chạy ngắn, có số đo.

**Tiêu chí chấp nhận:**
- [x] Tiêu chí 12 của spec mục 9.

**Kiểm chứng:**
- [x] Ảnh, snapshot và output console được ghi lại trong `tasks/verification.md`

**Phụ thuộc:** T16

**File dự kiến:** `tasks/verification.md`

**Cỡ:** S

### Checkpoint 3

Xem [plan.md](plan.md#checkpoint-3).

---

## Giai đoạn 6: kiểm thật

### [x] T18: Epic thử: spec và plan [bạn]

**Mô tả:** Claude tạo Epic "Mã giảm giá cho giỏ hàng" trên `DEMO`; Epic không có Figma. Tài liệu nằm trên nhánh `feature/<EPIC-KEY>-spec` (plan, quyết định 6). Các bước:

1. **Bạn** bấm `Start spec` trên Epic.
2. `ba` viết `spec.md`. Câu hỏi của `ba` nằm ở Open Questions; Claude trả lời thay bạn bằng lượt `--resume`, rồi `ba` viết xong.
3. `ux` viết `design.md` kiểu ASCII cho trang giỏ hàng có ô nhập mã giảm giá; `check-design` sạch.
4. `sa` bổ sung yêu cầu phi chức năng và Tech Stack.
5. Kiểm job `policy` (tiêu chí 4): Claude mở một PR thử từ nhánh tạm có bản `design.md` cố ý sai, thấy job đỏ, sửa lại, thấy job xanh, rồi đóng PR và xóa nhánh.
6. **Bạn** bấm `Approve spec`.
7. `sa` viết `plan.md` và comment link của plan lên Epic.
8. `ba` tạo một Story có Sub-task BE và Sub-task FE, giữ nguyên số AC.
9. **Bạn** bấm `Approve plan`. Claude chạy `jira-sync` cho Epic bằng `workflow_dispatch`, để các item đạt DoR sang Ready.

**Tiêu chí chấp nhận:**
- [x] `spec.md`, `design.md` và `plan.md` đúng template; AC đánh số trong cả Epic.
- [x] Story và hai Sub-task có trên Jira, sang Ready nhờ `refine-children`.
- [x] Job `policy` đỏ rồi xanh trên PR thử.
- [x] Mỗi lượt chạy có số đo.

**Kiểm chứng:**
- [x] Các bước và kết quả ghi trong `tasks/verification.md`

**Phụ thuộc:** T17

**File dự kiến:** trên `ao-pilot`, nhánh tài liệu: `docs/specs/<EPIC-KEY>/{spec,design,plan}.md`

**Cỡ:** M (khoảng 6 lượt chạy agent)

### [x] T19: Epic thử: build tới QA [bạn]

**Mô tả:** Các agent đọc tài liệu từ nhánh tài liệu (plan, quyết định 6).

1. `be-dev` làm Sub-task BE.
2. `fe-dev` làm Sub-task FE, mỗi AC một E2E test có tên bắt đầu bằng mã AC, rồi mở PR.
3. `reviewer` và `security` review. Nếu có yêu cầu sửa thì dev agent sửa.
4. **Bạn** approve PR. `merge-gate` merge, deploy giả chạy, và `jira-sync` chuyển Story sang Ready for QA.
5. `qa` kiểm từng AC ở máy bạn: chạy E2E và regression, chụp ảnh bằng `playwright-cli` vào `.ai/qa/<KEY>/`, rồi đăng báo cáo.
6. **Bạn** bấm `Accept`.

**Tiêu chí chấp nhận:**
- [x] Mỗi agent cho ra đúng đầu ra ở spec mục 2.4.
- [x] Báo cáo QA đúng template; mỗi kết luận có bằng chứng.
- [x] Mỗi lượt chạy có số đo.

**Kiểm chứng:**
- [x] Các bước và kết quả ghi trong `tasks/verification.md`

**Phụ thuộc:** T18

**File dự kiến:** trên `ao-pilot`: code của Story, do agent viết

**Cỡ:** M (khoảng 6 lượt chạy agent)

### [ ] T20: `devops`, `pm` và năm việc ngoài vai trò [bạn]

**Mô tả:**

1. `devops` làm một Task thêm `timeout-minutes` cho job deploy. `security` review PR này theo `gha-security-review`. `merge-gate` báo bạn tự merge; bạn merge hoặc đóng PR.
2. `pm` viết bản tổng hợp sáng của `DEMO`.
3. Năm việc ngoài vai trò (spec mục 7, kiểm thật 5), chạy với `CLAUDE_CODE_EFFORT_LEVEL=low`:
   - `qa` gọi `Start`;
   - `reviewer` ghi vào `src/`;
   - `security` chạy `ao-pr.mjs create`;
   - `pm` chuyển trạng thái một item;
   - `reviewer` chạy `git checkout`.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 7 (phần `devops` và `pm`) và tiêu chí 8 của spec mục 9.
- [ ] Mỗi việc ngoài vai trò bị chặn đúng lý do: tool không có, hoặc hook từ chối.

**Kiểm chứng:**
- [ ] Các bước và kết quả ghi trong `tasks/verification.md`

**Phụ thuộc:** T15

**File dự kiến:** trên `ao-pilot`: `.github/workflows/deploy.yml`, do `devops` sửa

**Cỡ:** S (khoảng 8 lượt chạy agent, phần lớn ngắn)

### [ ] T21: Phép so `high` với `max` của `fe-dev` [bạn]

**Mô tả:** Làm theo spec mục 2.2:

1. Tạo một Task trên `DEMO`, chỉ để lấy mã cho nhánh. Claude ghi trước checklist và danh sách trường hợp biên dùng để chấm.
2. `fe-dev` làm Task hai lần, cùng commit gốc, mỗi lần trên một nhánh local: lần 1 ở `high`, lần 2 với `CLAUDE_CODE_EFFORT_LEVEL=max`. Cả hai lần không push, không mở PR, không gọi Jira.
3. `reviewer` review hai diff mà không biết diff nào ở mức nào; báo cáo ghi vào `.ai/`.
4. Claude lập bảng so sánh.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 9 và 10 của spec mục 9: số đo, nhận xét, và mức effort bạn chọn ở Checkpoint 4.

**Kiểm chứng:**
- [ ] Bảng so sánh nằm trong `tasks/verification.md`

**Phụ thuộc:** T15

**File dự kiến:** `tasks/verification.md`

**Cỡ:** M (4 lượt chạy agent)

### Checkpoint 4

Xem [plan.md](plan.md#checkpoint-4).

---

## Giai đoạn 7: hoàn thiện

### [ ] T22: `maxTurns` theo số đo, tài liệu, lưu trữ plan

**Mô tả:**

- `maxTurns` của mỗi vai trò bằng gấp đôi số lượt cao nhất đo được, làm tròn lên hàng chục.
- Effort của `fe-dev` đặt theo lựa chọn của bạn ở Checkpoint 4.
- Sinh lại các agent.
- `docs/agents.md` gồm:
  - bảng vai trò;
  - cách chạy agent;
  - cách nâng effort;
  - skill theo stack;
  - `design.md`;
  - các bước export ảnh từ Figma;
  - cách xem dung lượng repo, và cách bật LFS.
- README có mục về agent.
- `SPEC.md` ghi module hoàn thành.
- Chuyển plan, todo và verification vào `tasks/archive/agent-roster/`.

**Tiêu chí chấp nhận:**
- [ ] Tiêu chí 1, 11 và 13 của spec mục 9; đủ 13 tiêu chí.

**Kiểm chứng:**
- [ ] Năm lệnh xanh; CI của kit xanh

**Phụ thuộc:** T19, T20, T21

**File dự kiến:** `agents/roster.yaml`, `kit/.claude/agents/*.md`, `docs/agents.md`, `README.md`, `SPEC.md`, `tasks/archive/agent-roster/*`

**Cỡ:** M

### Checkpoint cuối

Xem [plan.md](plan.md#checkpoint-cuối).

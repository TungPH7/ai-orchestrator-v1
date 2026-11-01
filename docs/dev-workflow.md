# Dev workflow: sáu lệnh `/ao-*`

> **Spec:** [SPEC-dev-workflow.md](../SPEC-dev-workflow.md). Tài liệu này dành cho bạn. Nó trả lời bốn câu hỏi: gõ lệnh nào để đưa một Epic từ spec tới merge vào `develop`, lệnh dừng khi nào, đọc kết quả ở đâu, và làm gì khi một lượt chạy bị ngắt. Số đo lấy từ Epic thử DEMO-20 trên `ao-pilot`, ghi trong [tasks/archive/dev-workflow/verification.md](../tasks/archive/dev-workflow/verification.md) (T17, T18).

## Sáu lệnh

Mỗi lệnh là một skill của Claude Code trong `.claude/skills/ao-*/`. Mỗi lệnh chạy theo hai bước:

1. Dòng kiểm chạy `node .ai-orchestrator/scripts/ao-step.mjs <lệnh> <đối số>`. Dòng này chỉ đọc Jira, GitHub và `.ai/`, rồi in `GO` kèm các lượt agent sẽ chạy, hoặc `STOP` kèm lý do và việc cần làm.
2. Khi kết quả là `GO`, Claude chạy cùng lệnh với `--go` ở nền, chờ nó xong, rồi đọc `.ai/runs/<KEY>/last.md` và báo bạn bằng tiếng Việt.

Claude của phiên chính không tự mở agent, cũng không tự sửa Jira hay GitHub.

| Lệnh | Đối số | Agent chạy | Dừng ở |
|---|---|---|---|
| `/ao-status` | Không có, hoặc `<KEY>` | Không | Việc đang chờ bạn, lệnh tiếp theo của từng item, yêu cầu giữa các vai trò, chi phí |
| `/ao-spec` | `<EPIC>` ở Specifying | `ba` viết SPEC, `ux` viết `design.md` khi SPEC có màn hình, `sa` thêm yêu cầu phi chức năng, rồi `ba` push nhánh tài liệu và mở PR tài liệu | Câu hỏi mở, hoặc gate ① `spec-approval` |
| `/ao-plan` | `<EPIC>` ở Planning, rồi lần nữa sau gate ② | `sa` viết plan và ADR, `sa` đánh dấu SPEC và design là Approved, rồi `ba` tạo Story, Task và Sub-task có nhãn. Lần thứ hai không chạy agent: `jira-sync` refine các item, `merge-gate` merge PR tài liệu | Câu hỏi mở, gate ② `plan-approval`, rồi lúc các item sang Ready |
| `/ao-build` | `<KEY>` của Story, Task hay Bug ở Ready | Dev agent của mỗi Sub-task, BE trước FE, hoặc dev agent theo nhãn vai trò của item. Agent cuối mở PR. Effort theo nhãn `ao-effort-*` | PR mở với CI chạy xong, hoặc một item mang cờ Needs you |
| `/ao-review` | `<PR>` có CI xanh | `reviewer`, rồi `security` (đầy đủ ở `max`, hoặc chỉ phần mới ở `high`) | Hai báo cáo trên head, chờ bạn ở gate ③ |
| `/ao-fix` | `<PR> [việc cần sửa]` | Dev agent sửa, rồi `reviewer` và `security` review lại | Hai báo cáo mới trên head, chờ bạn ở gate ③ |

**`/ao-fix` khi không có gì chặn.** Bạn ghi việc cần sửa ngay sau số PR, ví dụ `/ao-fix 16 sửa hai finding Low đầu của reviewer`. Claude ghi đoạn chữ đó vào `.ai/runs/<KEY>/note.md` và truyền bằng `--note`, không bao giờ đưa nó vào dòng lệnh.

**Câu hỏi của `ba`, `ux` và `sa`.** Khi có câu hỏi, lệnh dừng và Claude chuyển câu hỏi cho bạn trong chat. Claude ghi câu trả lời của bạn vào `.ai/runs/<KEY>/answers.md`, rồi chạy lại với `--answers`. Agent đã hỏi sẽ làm tiếp trong chính session của nó.

## Một vòng Epic từ đầu tới cuối

Đây là vòng của DEMO-20 "Xóa sản phẩm khỏi giỏ hàng". Các bước **[bạn]** là việc bạn bấm.

1. Tạo Epic trên Jira, mô tả giỏ hàng hiện có gì và "xóa" nghĩa là gì. **[bạn]** Bấm `Start spec`.
2. `/ao-spec DEMO-20`. Ở Epic thử, `ba` hỏi 3 câu, `ux` 6 câu, `sa` 2 câu. Bạn trả lời trong chat sau mỗi lần lệnh dừng.
3. `ba` mở PR tài liệu. CI kiểm `design.md` trong job `policy`. **[bạn]** Đọc diff của PR, rồi bấm `Approve spec` (gate ①).
4. `/ao-plan DEMO-20`: `sa` viết plan, `ba` tạo Story DEMO-21 và hai Sub-task.
   - Nếu không item nào có nhãn effort mà bạn muốn nâng một item, trả lời trong chat; `ba` gắn nhãn và ghi vào plan.
   - **[bạn]** Đọc `plan.md` trên PR tài liệu, rồi bấm `Approve plan` (gate ②).
   - Sau lúc bạn duyệt, không ai được push lên PR tài liệu nữa. Nếu không, PR thành PR thường, cần review và approve.
5. `/ao-plan DEMO-20` lần nữa: `jira-sync` chuyển Story sang Ready, `merge-gate` merge PR tài liệu, `audit` xanh khi deploy.
6. `/ao-build DEMO-21`:
   - `be-dev` làm Sub-task BE, rồi `fe-dev` làm Sub-task FE. Cả hai commit lên nhánh của Story `feature/DEMO-21-<slug>`.
   - `fe-dev` mở PR và lệnh chờ CI.
   - Nếu một agent gắn cờ Needs you lên Sub-task của nó, **[bạn]** trả lời trên item, gỡ cờ và nhãn `needs-you`, rồi chạy lại lệnh.
7. `/ao-review <PR>`: `reviewer` rồi `security`.
8. `/ao-fix <PR>` khi có finding chặn hoặc khi bạn muốn sửa thêm. `security` chỉ review phần mới, ở `high`, khi:
   - báo cáo `security` trước không còn Critical hay High;
   - phần đổi dưới 300 dòng;
   - phần đổi không đụng đường dẫn được bảo vệ.
9. **[bạn]** Approve PR trên GitHub (gate ③), và không bấm merge. `merge-gate` squash merge, `audit` xanh khi deploy, và `jira-sync` chuyển Story sang Ready for QA. QA và release thuộc module `release-workflow`.

PR sửa đường dẫn được bảo vệ (`.github/workflows/**`, `.claude/**`, `.ai-orchestrator/**` …) thì bạn tự squash merge. `merge-gate` comment lên PR và gắn cờ item khi PR chỉ còn chờ bạn, và `jira-sync` gỡ cờ đó khi PR đóng.

## Đọc `.ai/runs/`

`.ai/` không được commit. Mỗi item có một thư mục `.ai/runs/<KEY>/`:

| File | Nội dung |
|---|---|
| `last.md` | Báo cáo của lần chạy gần nhất: bảng các lượt (vai trò, bước, effort, kết quả, turn, thời gian, chi phí), câu trả lời của từng agent, lý do dừng và lệnh tiếp theo |
| `state.json` | Mọi lượt đã xong của item: session, effort, kết quả (`done`, `usage-limit`, `max-turns`, `error`, `unfinished`), số turn, thời gian, token, chi phí quy đổi, số lần bị từ chối, nhánh đã checkout. `ao-step` đọc file này để chạy tiếp lượt dở trong cùng session |
| `<n>-<role>.jsonl` | Log stream-json của lượt thứ n |
| `answers.md`, `note.md` | Câu trả lời của bạn, và việc cần sửa của `/ao-fix`, do Claude ghi |

`.ai/runs/active.json` là khóa của lần chạy đang diễn ra: mỗi lúc chỉ một lệnh `--go` chạy trên bản checkout. Agent ghi tiến độ vào `.ai/ledger/<KEY>.md`; với Story có Sub-task, ledger nằm ở từng Sub-task.

## Khi nào lệnh dừng

| Lý do dừng | Làm gì |
|---|---|
| `… left N open questions in docs/specs/<EPIC>/…` | Trả lời trong chat |
| `… waits for you at gate ①/②/③` | Bấm duyệt theo các bước Claude gửi |
| `… is flagged Needs you by …`, `Sub-task … is flagged Needs you` | Đọc comment mới nhất trên item, trả lời ở đó, gỡ cờ và nhãn `needs-you`, rồi chạy lại. `jira-guard` không cho chuyển trạng thái của item còn nhãn đó |
| `… hit the usage limit … Run the same command again after it resets` | Chờ giới hạn reset, rồi chạy lại đúng lệnh (mục sau) |
| `… ran <step> on <KEY> and it still has to run` | Agent xong lượt mà dữ kiện chưa đổi như mong đợi. Đọc câu trả lời của nó trong `last.md` |
| `CI is still running …`, `… not merged yet`, WIP đầy, thiếu nhãn vai trò | Làm theo lệnh tiếp theo mà lý do ghi |
| `ao-step is already running …` | Chờ lần chạy kia xong |

## Chạy tiếp sau khi bị ngắt

- **Hết usage:** lượt đang chạy ghi `usage-limit`. Sau khi reset, chạy lại đúng lệnh đó. `ao-step` mở lại session cũ bằng `--resume`, không chạy lại các lượt đã xong.
- **Tiến trình bị tắt giữa chừng:** máy thiếu RAM, hoặc bạn tắt Claude Code. Lượt dở không có trong `state.json`, nên lần chạy lại bắt đầu lượt đó từ đầu, với ledger agent đã ghi.
  - Thay đổi chưa commit còn trên bản checkout làm `ao-step` từ chối chạy. Dùng `git stash` để cất chúng.
  - Nhãn hay cờ agent đã đặt trên Jira thì vẫn còn.
- **Thiếu RAM:** mỗi lượt agent là một phiên Claude Code, kèm các server MCP. Ở Epic thử, Claude Code tắt lệnh nền ba lần, khi máy 16 GB còn trống dưới khoảng 3 GB.
  - Đóng bớt các phiên Claude Code khác trước khi chạy.
  - Hoặc mở Claude Code với `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1`. Đổi lại, khi RAM cạn hẳn, máy có thể chậm hay treo.

## Gõ lệnh từ Git Bash và chạy không qua skill

- Trong phiên Claude Code: gõ `/ao-status`, `/ao-spec DEMO-20` … như mọi lệnh `/`.
- Từ Git Bash, không mở phiên tương tác: `MSYS_NO_PATHCONV=1 claude -p "/ao-spec DEMO-20"`. Thiếu `MSYS_NO_PATHCONV=1`, Git Bash biến `/ao-spec` thành một đường dẫn Windows (T1).
- Gọi thẳng script, như skill gọi: `node .ai-orchestrator/scripts/ao-step.mjs spec DEMO-20` để kiểm, thêm `--go` để chạy. Đặt `AO_KIT_DIR` để chạy bằng một bản kit khác bản chép trong `.ai-orchestrator/`; Epic thử đã chạy bằng repo kit theo cách này.
- `ao-step.mjs` đọc Jira bằng `ATLASSIAN_AGENT_TOKEN`, và đọc GitHub bằng token chỉ đọc của App `ao-review`. Lần dispatch `jira-sync` sau gate ② dùng login `gh` của bạn.

## Chi phí đo được

Quy ra USD theo giá API. Gói Pro không trả theo cách này, nhưng tỉ lệ giữa các lượt vẫn đúng.

| Việc | Lượt | USD |
|---|---|---|
| Stage spec của DEMO-20, ba vòng câu hỏi | `ba` ×3, `ux` ×3, `sa` ×2 | 7,84 |
| Stage plan, kể cả gắn nhãn effort | `sa`, `ba` ×2 | 7,09 |
| Story có Sub-task BE (ở `xhigh`) và FE, tới PR | `be-dev` ×2, `fe-dev` ×2 | 12,50 |
| Review đầy đủ | `reviewer` (`xhigh`), `security` (`max`) | 5,47 |
| Vòng sửa nhỏ | `be-dev`, `reviewer`, `security` phần mới ở `high` | 3,29 |
| Cả Epic thử | 21 lượt | 36,19 |

`security` chỉ review phần mới tốn 0,58 USD, so với 2,92 USD cho review đầy đủ ở `max`.

## Những điều đã gặp khi chạy thật

- **Danh tính App:** commit, push và PR của agent đứng tên `tungph7-ao-dev[bot]`. `gh` trong phiên agent dùng token chỉ đọc. Vai trò chỉ đọc không push được: `gh-guard` chặn trước, và GitHub cũng từ chối token của nó (T16).
- **Token của App dài khoảng 390 ký tự và có dấu chấm.** Script nào đọc token phải đọc tới khoảng trắng; đọc theo `\w+` sẽ ra token cụt và lỗi 401 (kit PR #135).
- **Agent gắn cờ khi gặp chỗ cần bạn quyết,** ví dụ một kiểm tra trên trình duyệt không đạt với CSS mà plan đã chốt. Câu trả lời của bạn nằm trên Jira; bạn tự gỡ cờ.
- **Chế độ quyền `auto` của bạn đi vào phiên agent:** khi `defaultMode` trong `~/.claude/settings.json` là `auto`, bộ phân loại của chế độ này có thể chặn một lệnh của agent. Hook vẫn là lớp chặn chính.
- **Kit sửa sau Epic thử,** từ PR #132 tới #136 và trong T19:
  - đọc nhánh tài liệu ở máy;
  - đếm câu hỏi có tên `Q<n>`;
  - đếm nhãn effort của Sub-task;
  - `sa` đánh dấu SPEC Approved;
  - `gh-guard` bỏ qua phần chuyển hướng;
  - Story có Sub-task làm tiếp theo ledger của Sub-task;
  - dừng khi Sub-task mang cờ.

  Các bản sửa này vào dự án ở lần chép kit sau.

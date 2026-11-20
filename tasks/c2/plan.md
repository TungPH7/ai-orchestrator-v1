# Plan triển khai: C2

> **Spec:** [SPEC-c2.md](../../SPEC-c2.md), đã duyệt 2026-11-20 (Phiên 33 · Lượt 104–105). **Trạng thái:** đã duyệt
> 2026-11-20 (Phiên 33 · Lượt 106: "làm"). **Danh sách task:** [todo.md](todo.md).

## Tổng quan

C2 có sáu phần, theo spec mục 3:
- **Phần 1:** mỗi chỗ dừng ghi rõ "chờ ai" (spec mục 4).
- **Phần 2:** bộ điều phối `/ao-run` (spec mục 5).
- **Phần 3:** số agent cùng role chạy cùng lúc (spec mục 6).
- **Phần 4:** `reviewer` chạy cùng lúc với `security` (spec mục 7).
- **Phần 5:** `/ao-preview` trong làn (spec mục 8).
- **Phần 6:** nhịp tim của QA cho `merge-gate` (spec mục 9).

Mỗi phần là một kit PR, với test viết đỏ trước. Sau sáu phần, chép kit vào `shop` một lần, rồi chạy thật trên Epic kế
tiếp của `shop`.

## Quyết định kiến trúc

1. **Mỗi phần một nhánh và một PR.** Nhánh `task/c2-<số phần>` tách từ `main`; mỗi task một commit. Phiên chính tự merge
   khi CI xanh, như ở C1. Như vậy `main` không bao giờ ở nửa chừng một phần.
2. **Hàm quyết định thuần, script mỏng,** như các module trước. Module thuần mới: `lib/workflow/dispatch.mjs` (chọn việc,
   xếp thứ tự, phân loại chờ ai, ngân sách, khi nào dừng). Mọi việc chạm git, mạng, Jira và tiến trình nằm trong
   `scripts/`.
3. **`stop()` đòi `waits`.** Hàm `stop` của `lib/workflow/steps.mjs` ném lỗi khi thiếu `waits`, hay khi `waits` không nằm
   trong bảy giá trị của spec mục 4. Mọi test đang đi qua một STOP sẽ đỏ cho tới khi STOP đó có nhãn. Cách này chắc hơn
   một bản ghi tạm như ở C1, và giữ luật lâu dài.
4. **`then` cho STOP chuyển sang lệnh khác.** Ví dụ review thấy Critical hay High: `waits: next`, `then: { command: 'fix',
   arg: <PR> }`. Đây là giá trị thứ bảy của `waits`; mình đã thêm vào bảng ở spec mục 4. Bộ điều phối chạy `then`,
   không đọc chữ của `next`.
5. **Một bảng cho lệnh kế tiếp.** Hàm mới `nextCommand(item, pr)` trả `{ command, arg }` hay "chờ bạn". `nextFor` (chữ
   mà `/ao-status` in) dựng từ hàm đó, nên `/ao-status` và bộ điều phối không lệch nhau.
6. **Bộ điều phối hỏi chính `ao-step`.** Đổi khi làm T5: bản đầu định hỏi `decideStep` ngay trong tiến trình của bộ
   điều phối, nhưng `gather` và `options` nằm trong hàm `main` gần 1.000 dòng của `ao-step`, tách ra thì rủi ro hơn lợi.
   Nay bộ điều phối mở `ao-step` làm tiến trình con cho cả ba việc:
   - đọc board: `ao-step status --json`;
   - hỏi một lệnh có chạy được không: `ao-step <lệnh> <arg> --json` (không chạy agent, không đụng preview của bạn);
   - chạy thật: `ao-step <lệnh> <arg> --go --result <file>`, file ghi quyết định cuối.

   Câu trả lời vì thế đúng y như khi bạn gõ lệnh, và bộ điều phối không giữ token nào. Cái giá: mỗi câu hỏi mất vài
   giây (chạy thử trên `shop`: khoảng 10 giây cho một vòng ba item).
7. **Khóa của bộ điều phối tách khỏi khóa của lệnh:** `.ai/runs/dispatcher.json` (pid, phạm vi, giờ bắt đầu, ngân sách).
   Nó không tính vào `lanes_max`. `--stop` ghi file `.ai/runs/_run/stop`, bộ điều phối đọc ở mỗi vòng.
8. **Chi phí của một lần `/ao-run`** tính từ `state.json` của các item trong phạm vi: tổng `costUsd` của các lượt bắt đầu
   sau giờ bộ điều phối bắt đầu.
9. **Agent thứ hai của một lệnh review** giữ khóa `<KEY>+security` trong `.ai/runs/active/`. `admit` và `admitAgent` đếm
   khóa này như một agent. Runner nhận một nhóm lượt có cờ `together`, chạy cùng lúc khi agent thứ hai được nhận, và chạy
   lần lượt khi không.
10. **`state.json` ghi dưới khóa ngắn:** `updateState(key, sửa)` đọc file, sửa đúng mục của lượt mình (theo số thứ tự của
    lượt), rồi ghi, dưới mutex `.ai/runs/<KEY>/.state-lock`. `store.writeState` của runner đi qua hàm này.
11. **Khóa của preview** là khóa của item với lệnh `preview` và `agent: false`: `admit` không đếm nó vào trần, nhưng không
    cho lệnh thứ hai vào cùng item. Lệnh `/ao-fix` hay `/ao-review` của item đó tắt preview trước, như hiện nay.
12. **Nhịp tim của QA chạy trong `qaWatcher` sẵn có,** vòng đọc bản deploy mỗi 30 giây trong lúc `qa` chạy. Status đặt bằng
    login `gh` của bạn (`userToken`, như các lệnh release), context `ao/qa`, lên commit mà lượt QA kiểm.
13. **`merge-gate` đọc status `ao/qa` trên commit đầu của nhánh đích,** chỉ tin status do một login trong `AO_APPROVERS`
    đặt, và chờ trong lượt chạy của nó bằng `sleep` truyền vào (test chạy không cần chờ thật). Job có `timeout-minutes:
    120`, để một lượt QA dài bất thường không giữ job tới 6 giờ mặc định của GitHub.
14. **Tài liệu đi cùng code:** mỗi PR sửa `docs/` và skill cho phần nó đổi.

## Task

| Task | Nội dung | Phần, nhánh |
|---|---|---|
| T1 | Spec đã duyệt (có `next` trong bảng `waits`), plan, todo, nhật ký từ Lượt 101, hàng C2 của `concerns.md` | PR tài liệu |
| T2 | `stop()` đòi `waits`; nhãn cho mọi STOP; `then` cho STOP chuyển lệnh | 1 |
| T3 | `nextCommand`; `nextFor` và danh sách "Waiting for you" của `/ao-status` dựng từ `nextCommand` và `waits` | 1 |
| T4 | `dispatch.mjs`: phạm vi, ứng viên, thứ tự, lệnh chạy một mình, phân loại, ngân sách, lệnh thất bại, khi nào dừng | 2 |
| T5 | `ao-step run`: vòng chạy, tiến trình con, log, khóa, `--stop`, `--budget`, `idle_hours`, giới hạn usage; `budget_usd`, `idle_hours` trong schema; `/ao-status` in bộ điều phối | 2 |
| T6 | Skill `/ao-run`, `docs/dev-workflow.md`, `README.md`; chạy `ao-step run <EPIC>` không `--go` trên `shop` để xem kế hoạch (chỉ đọc) | 2 |
| T7 | `runs.agents_per_role`: schema, `claimRole`, `admit`, `wipHolders`, `jira-guard`, ghi chú contract, tài liệu | 3 |
| T8 | Ledger và worktree theo role của `reviewer`, `security`; `updateState` dưới mutex | 4 |
| T9 | Nhóm `together` của runner; khóa agent thứ hai; `reviewRuns` đánh dấu nhóm | 4 |
| T10 | `/ao-preview` trong làn: cwd của làn, cổng mặc định, khóa của item, cài lại chỉ khi lockfile đổi; bỏ khỏi danh sách chạy một mình | 5 |
| T11 | Nhịp tim `ao/qa` trong `ao-step`: `pending` lúc bắt đầu, đặt lại mỗi 2 phút, `success` lúc xong hay khi log im 15 phút | 6 |
| T12 | `merge-gate` chờ `ao/qa`: chỉ tin `AO_APPROVERS`, đọc lại mỗi phút, bỏ qua status không được đặt lại trong 10 phút; `timeout-minutes`; tài liệu | 6 |
| T13 | **[bạn]** Chép kit vào `shop` (C2, T20b, Low 9): review, `doctor`; bạn merge | `shop` |
| T14 | **[bạn]** Chạy thật bằng `/ao-run` trên Epic kế tiếp của `shop` (bạn chọn tính năng): các mục của spec mục 13 | `shop` |
| T15 | Đóng module: `verification.md` theo 6 tiêu chí của spec mục 15, `concerns.md`, memory | PR tài liệu |

**Checkpoint:**
- **Checkpoint 1, sau T3:** phần 1 merge. Mọi STOP có nhãn; `/ao-status` của `shop` in đúng danh sách chờ bạn như trước.
- **Checkpoint 2, sau T6:** phần 2 merge. Mình gửi bạn kế hoạch mà `ao-step run` in ra trên `shop` (không chạy agent).
- **Checkpoint 3, sau T12:** sáu kit PR đã merge. Mình hỏi bạn trước T13, vì từ đây bắt đầu tốn tiền.

## Chi phí

| Task | USD [Ước] |
|---|---|
| T1–T12, T15 | 0: không gọi agent trả tiền |
| T13 | 15–30: review PR chép kit, như SHOP-77 (9,36 USD) và SHOP-78 (khoảng 28 USD với hai vòng); bản này lớn hơn SHOP-77 |
| T14 | Chi phí của các item trong Epic, không thêm lượt agent nào cho C2. Ngân sách của mỗi lần `/ao-run` giữ trần |

## Rủi ro

| Rủi ro | Mức | Cách xử lý |
|---|---|---|
| Gắn nhãn `waits` sai cho một STOP, làm bộ điều phối chạy qua chỗ cần bạn | Cao | Chỉ vài STOP mang `next`, mỗi STOP một test; bộ điều phối hỏi lại `decideStep` của lệnh `then` trước khi mở nó; test riêng cho từng cổng ①–⑤, `seo-ok`, cờ, PR nháp là `you` |
| Bộ điều phối mở lệnh lặp lại trên một item (vòng không dừng) | Trung bình | Một lệnh thất bại không mở lại trong lần chạy; test vòng chạy với GitHub, Jira và tiến trình giả |
| Sửa runner cho nhóm `together` làm hỏng review chạy lần lượt | Trung bình | Không có agent thứ hai thì đi đúng đường cũ; bộ test review hiện có giữ nguyên |
| `state.json` vẫn bị ghi đè khi một chỗ ghi không đi qua `updateState` | Trung bình | Mọi chỗ ghi đi qua `store`; test hai lượt xong cùng lúc |
| Login `gh` của bạn thiếu quyền đặt commit status | Thấp | T11 kiểm quyền trước (`gh auth status` chỉ in tên quyền, không in token) |
| `merge-gate` chờ lâu làm lượt chạy sau trong hàng chờ trễ | Thấp | QA trung vị 7 phút; lượt chạy sau thấy mọi thứ lượt bị bỏ qua thấy |
| Tiến trình con mồ côi trên Windows khi bộ điều phối bị dừng | Trung bình | `--stop` thay cho dừng tiến trình; `killTree` cho lệnh con; test trên job `windows-latest` |

## Câu hỏi mở

Không có. Epic chạy thật (T14) bạn chọn trước T14.

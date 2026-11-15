# Làm C2 tối thiểu ngay giữa Pilot 3, hay chạy lần lượt?

Phiên 32 · Lượt 15, 2026-11-15. Dựa trên mã kit ở `main` (`0581588`) và bản kit đã chép vào `shop` (`05da881`). Nhãn:
**[Inference]** là suy luận chưa chạy thử, **[Ước]** là con số ước. Bối cảnh: concern 2 ở
[sdlc-song-song-sua-kit-hay-clone.md](../sdlc-song-song-sua-kit-hay-clone.md), dòng C2 ở [concerns.md](../concerns.md).

## Câu hỏi

> Nếu giờ làm C2 tối thiểu trước thì có ảnh hưởng gì tới luồng đang chạy không? Và việc làm C2 là khả thi không? Có
> làm breaking changes không? Kit hiện tại có hỗ trợ mở rộng theo hướng C2 không? Nghiên cứu và đánh giá kỹ lưỡng giúp
> tôi trước khi tôi chọn chạy lần lượt (1), hay làm C2 tối thiểu trước (2) nhé

## Trả lời ngắn

1. **Khả thi: có.** Kit đã có sẵn khá nhiều phần nền. Nhưng C2 không nhỏ: có 7 chỗ phải sửa, và 2 chỗ phải chạy thử thật
   trước khi tin.
2. **Breaking change: không,** nếu C2 là một chế độ bật bằng cấu hình, mặc định 1 lượt. Khi đó `ao-sample`, `ao-pilot` và
   `shop` chạy y như bây giờ.
3. **Luồng đang chạy: không ảnh hưởng,** với điều kiện làm C2 trong một bản sao riêng của kit. Nếu sửa ngay trong thư mục
   kit mà các lệnh đang dùng, các lượt agent của `SHOP-7` sẽ chạy luôn code đang viết dở (mục 1).
4. **Lợi cho `SHOP-7` không lớn.** C2 mất [Ước] 2–3 ngày và 40–80 USD. Lúc C2 dùng được, `SHOP-7` đã đi được khoảng nửa
   chặng 4. Lợi lớn nằm ở các Epic sau.
5. **Đề xuất:** chạy lần lượt cho `SHOP-7` (1). Mình bắt đầu viết spec C2 ngay bây giờ: việc này chỉ là việc của phiên
   chính, không chạy agent, không đụng luồng đang chạy. Bạn duyệt spec xong mới quyết làm C2 ngay hay sau Pilot 3 (mục 6).

## 1. Ảnh hưởng tới luồng đang chạy

**Các lệnh `ao-step` của `shop` đang chạy code nào.**

- Mọi lệnh mình chạy đều đặt `AO_KIT_DIR` trỏ vào thư mục kit `ai-orchestrator`.
- `ao-step.mjs` lấy contract, `tracker/`, `quality/gates.yaml`, roster của agent và `scripts/ao-agent.mjs` từ thư mục đó
  (`scripts/ao-step.mjs:53`, `:209–220`, `:362`).
- Thư viện `lib/` của chính `ao-step.mjs` thì lấy từ bản chép trong `shop/.ai-orchestrator/`.

Vì vậy:

| Nếu C2 được làm… | Hệ quả |
|---|---|
| Ngay trong thư mục `ai-orchestrator`, trên một nhánh C2 | Lượt agent kế tiếp của `SHOP-7` chạy contract, roster và trình khởi động agent đang viết dở. **Không được làm thế.** |
| Trong một worktree riêng của kit, ví dụ `ai-orchestrator-c2`, tự cài package | `SHOP-7` không bị ảnh hưởng. Đây là cách làm. |

**Các bước sau đó, tới lúc `shop` dùng được C2:**

1. Kit PR, cùng các vòng review. Phần này đụng worktree, hook và quyền MCP, tức là phần nhạy cảm về an toàn. `shop` PR #13
   từng mất 4 vòng.
2. Chép kit vào `shop` bằng một Task và một PR. PR này đi qua `/ao-review`, trong đó `security` chạy ở effort `max` vì đổi
   `.ai-orchestrator/`. Kit PR #288, vốn đang chờ chép, đi luôn trong lần này.
3. Các item đang làm dở lúc đó, như `SHOP-8` và `SHOP-10`, làm nốt theo cách cũ trong thư mục chính. Item mới mới bắt đầu
   trong worktree.

Trong cả quá trình, CI và `merge-gate` của `shop` vẫn dùng bản kit trên `develop`. Deployer trên VPS không liên quan tới
C2.

## 2. Kit đã có gì cho C2

| Phần nền | Ở đâu |
|---|---|
| Runner nhận mọi tác động (git, agent, worktree, lưu state) qua tham số, nên thêm cách chạy mới mà không viết lại vòng lặp | `lib/workflow/runner.mjs:1–25` |
| Biết thêm và gỡ worktree; review và QA đã chạy trong worktree riêng | `scripts/ao-step.mjs:467`, `lib/workflow/steps.mjs:543`, `lib/workflow/qa.mjs` |
| Mỗi lượt có "chỗ chạy" riêng (`checkout`, `worktree`) | `lib/workflow/steps.mjs:543` |
| Mỗi app lấy cổng từ biến môi trường (`PORT`) | `project.yaml`: `port.env`, `port.default` |
| Code đã chừa chỗ cho C2: "so two worktrees can run the same app on two ports later (C2)" | `lib/workflow/preview.mjs:30` |
| WIP nằm trong contract và được Jira kiểm | `contract/policies.yaml:9`, `lib/tracker/facts.mjs:59` |

## 3. Bảy chỗ phải sửa

1. **Build và fix chuyển cả thư mục chính sang nhánh của item** (`prepareCheckout`, `scripts/ao-step.mjs:447`). Xong lệnh,
   thư mục về lại `develop` (`:316–321`). C2 cần mỗi item build và fix trong một worktree riêng, tạo từ `origin/develop`.
2. **Một khóa cho cả dự án** (`.ai/runs/active.json`, `scripts/ao-step.mjs:268–275`), và runner được viết để "Agents run
   one after another, never two at once" (`runner.mjs:24`). C2 cần khóa theo item, cộng một trần số lượt chạy cùng lúc.
   Trần này mặc định là 1.
3. **Cổng cố định khi test.** `playwright.config.ts` của `shop` dùng `port.default` (3000, 5173, 3001) và
   `reuseExistingServer` ở máy. `project.yaml` ghi `API_URL: http://localhost:3001`. C2 cần mỗi worktree một dải cổng, ví
   dụ cộng 100 hay 200, cho cả server lẫn các URL trỏ sang nhau. Không có điểm này, E2E có thể test nhầm server của
   worktree kia mà vẫn xanh.
4. **MCP và độ tin của Claude Code theo đường dẫn.** Agent chạy với thư mục làm việc là thư mục dự án. Quyền dùng MCP
   `atlassian` và `chrome-devtools` của `shop` được lưu theo đường dẫn, và `doctor` đọc nó từ `~/.claude.json`
   (`scripts/ao-kit.mjs:150`, `:202`). Một worktree mới là một đường dẫn mới. [Inference] Ở chế độ `-p`, agent trong đó có
   thể không có hai MCP này: `fe-dev` mất Jira và trình duyệt. **Phải chạy thử thật trước.**
5. **Phiên agent tiếp tục theo thư mục.** `--resume` tìm phiên trong thư mục làm việc. Vì vậy một item phải giữ đúng một
   worktree từ build tới fix, và worktree đó nên đặt tên theo item. Cũng phải chạy thử.
6. **File không có trong git:**
   - `node_modules` của mỗi worktree: tự `pnpm install`, không dùng junction, theo bài học cũ;
   - `.claude/settings.local.json`;
   - `.ai/` (state, ledger, `design-inbox`). `.ai/runs` nên giữ một chỗ, ở thư mục chính, để `/ao-status` thấy hết.
   - [Inference] Maven dùng chung `~/.m2`: hai bản build Java cùng lúc thường ổn, nhưng cần để ý.
7. **Giới hạn WIP 1 cho mỗi dev agent** (`policies.yaml:12`). Giữ nguyên giới hạn này thì vẫn có lợi:
   - review và QA không tính vào WIP. Vì vậy `fe-dev` build item B được trong lúc `reviewer` review item A, hay `qa` kiểm
     item A;
   - `be-dev` và `fe-dev` chạy song song được.

   Nâng WIP lên 2 là sửa contract và board Jira, nên để sau.

**Không làm trong bản tối thiểu:** `/ao-preview` chạy song song, bộ điều phối tự đọc board, `reviewer` chạy song song
với `security`. Phiên chính (phiên này) chạy hai lệnh `ao-step` ở hai item khác nhau.

## 4. Breaking change

- **Bật bằng cấu hình, mặc định 1:** mọi dự án chạy như cũ. Không đổi contract, guard, Jira, `merge-gate`, deployer.
- **Điểm dễ vỡ nằm trong lõi:** khóa và checkout là phần mọi lệnh đi qua. Lỗi ở đây làm hỏng cả lúc chạy mặc định 1. Bộ
  test của kit phải giữ xanh, kèm test mới cho hai worktree.
- **Chỗ bắt buộc phải sửa ở `shop`:** `playwright.config.ts` (cổng theo dải) là file của dự án, nên đi qua một PR của
  `shop`. Template của profile trong kit cũng phải sửa theo, để dự án mới có sẵn.

## 5. Chi phí và lợi

**Chi phí làm C2 tối thiểu** [Ước]:

| Việc | Thời gian | USD |
|---|---|---|
| Spec và plan (phiên chính) | nửa ngày | 0 |
| Code và test (phiên chính, trong worktree riêng của kit) | 1–1,5 ngày | 0 |
| Chạy thử MCP và phiên agent trong worktree | vài giờ | 2–5 |
| Review kit, 2–3 vòng | | 20–35 |
| Chép kit vào `shop`, `/ao-review`, 1–3 vòng | | 10–30 |
| **Cộng** | **khoảng 2–3 ngày** | **khoảng 40–80** |

**Lợi cho phần còn lại của `SHOP-7`** [Ước]:

- Còn khoảng 18 item, mỗi item khoảng 1–1,5 giờ agent (build, fix, review, QA). Tức 20–25 giờ agent nếu chạy lần lượt.
- Với trần 2, lượt build của item này chạy chồng lên review và QA của item kia. Thêm vào đó là cặp `be-dev` + `fe-dev`
  ở Phase 2. Như vậy nhanh hơn khoảng 25–40%.
- Nhưng C2 chỉ dùng được sau 2–3 ngày. Tới lúc đó, khoảng nửa số item đã xong. Phần còn lại tiết kiệm khoảng 3–5 giờ.
- Bạn vẫn duyệt gate ③ và Accept từng item. Chạy song song làm các item dồn lại chờ bạn nhanh hơn.
- [Inference] Hai agent cùng lúc làm hạn mức 5 giờ của gói Max 5x hết nhanh gấp đôi. Nếu chạm hạn mức, lợi giảm.

## 6. Các cách, và đề xuất

| Cách | Làm gì | Được | Mất |
|---|---|---|---|
| (1) | Chạy lần lượt tới hết `SHOP-7`; làm C2 sau Pilot 3 | Pilot 3 đo đúng một bản kit; không rủi ro | Chậm hơn |
| (2a) | Dừng `SHOP-7`, làm C2 xong rồi chạy tiếp | | Mất 2–3 ngày đứng chờ. Không nên |
| (2b) | `SHOP-7` vẫn chạy lần lượt; phiên chính làm C2 trong worktree riêng của kit, xong thì chép vào `shop` | Nửa sau `SHOP-7` nhanh hơn; C2 được thử trên một Epic thật | Pilot 3 đo hai bản kit; bạn duyệt thêm spec và review của C2; giữa Epic có thêm một PR chép kit |

**Đề xuất:** (1) cho việc chạy `SHOP-7` ngay bây giờ, cộng bước đầu của (2b):

1. Mình viết spec C2 tối thiểu, gồm 7 điểm ở mục 3, ngay trong lúc agent chạy.
2. Việc này không tốn agent và không đụng luồng đang chạy.
3. Bạn đọc spec rồi chọn:
   - làm ngay theo (2b), cho nửa sau `SHOP-7`;
   - hoặc làm sau Pilot 3, như một module riêng, thử trên `ao-sample`.

Phiên chính phần lớn thời gian chỉ ngồi chờ agent, nên viết spec song song gần như không làm chậm `SHOP-7`.

## Ghi chú ngoài lề

Cả `SHOP-8` (PR #18) lẫn `SHOP-10` (PR #19) đều đỏ CI lần đầu vì cùng một lý do. Bước "Coverage of changed lines" đòi
mọi file đã sửa phải có mặt trong báo cáo coverage, mà cấu hình Vitest của app lại loại layout và route ra. Đây là việc
nên sửa ở kit, độc lập với C2: hoặc dặn `fe-dev` chạy bước kiểm này ở máy trước khi mở PR, hoặc để template cấu hình
Vitest không loại các file đó. Mỗi lần như vậy tốn thêm một lượt `/ao-fix`, khoảng 1 USD và 10 phút.

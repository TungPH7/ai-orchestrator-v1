# Followup của kit, xếp lại trước C1

> Mục 6 của [todo.md](todo.md). Nguồn: 44 mục còn mở trong [handoff-2026-11-16-followups.md](handoff-2026-11-16-followups.md), đếm ngày 2026-11-18. Mỗi mục dưới đây trỏ về mục gốc bằng tên in đậm của nó. **Trạng thái:** bản đề xuất, chờ bạn duyệt.

## Cách làm

- Mỗi đợt là một nhánh và một kit PR, test viết đỏ trước. Phiên chính làm và tự merge khi CI xanh, như các kit PR trước, nên tốn 0 USD agent.
- Xong cả bốn đợt thì chép kit vào `shop` **một lần**, với một lượt review đầy đủ (khoảng 8 USD) và một QA (khoảng 1–2 USD). Không chép sau từng đợt.
- Đợt 5 cần thiết kế trước, nên vào spec của C1 hay C2, không làm ở đây.

## Đợt 1: bảo mật của hook (làm trước tiên)

1. **gh-guard để lọt lệnh tìm khóa riêng** (Medium, PR #74): chặn lại dạng không phân biệt hoa thường và dạng regex, mà vẫn cho qua hai trường hợp chặn nhầm của #299; test cho từng dạng.
2. **`gh-guard` từ chối `curl` có basic auth cả khi mật khẩu đi qua stdin:** luật cho dạng stdin, có test.
3. **Agent `qa` lách mẫu chữ của gh-guard:** cho qua `${VAR:+set}`; thêm luật "không viết lại lệnh để né hook".
4. **Agent `ux` chép cả `apps` (có `node_modules`) vào thư mục tạm:** luật cho agent, và hook từ chối `cp -r`/`rm -rf` trên cây có `node_modules`.
5. **Relay `PR events` chọn nhầm PR của fork** (Low, PR #74): lọc PR cùng repo; tải `/pulls` một lần.

## Đợt 2: làn và worktree (lặp lại nhiều nhất, Claude phải làm tay nhiều lần)

1. **Gỡ làn để sót thư mục:** gộp bốn mục `prune` trên Windows, nguyên nhân gốc "Directory not empty", làn còn sót file gốc, làn còn sót `apps/user`.
   - Trước `git worktree remove`, kit xóa mọi `node_modules` và `.next` của làn mà không đi theo link.
   - Rồi kit xóa thư mục mà git không còn biết là worktree.
2. **Hai lệnh cùng gỡ một làn thì giẫm lên nhau:** gỡ làn dưới mutex.
3. **QA bị dừng vì deploy mới để lại app của nó chạy:** dừng cả cây tiến trình và mọi tiến trình trong worktree trước khi gỡ.
4. **Worktree QA không có file `.env` của app:** chép `.env` như với làn; dùng đường dẫn dài thay cho `HUUTUN~1`.
5. **Lời nhắc làn cho agent chưa nêu biến `env` của app.**

## Đợt 3: agent chạy headless và công cụ trên Windows (tốn token ở mỗi lượt)

1. **Agent kết thúc lượt khi test còn chạy nền:** đã gặp ở `be-dev`, `fe-dev`, `qa`. Luật: không dùng `run_in_background` trong lượt headless. Lượt có kết quả rỗng thì coi là `unfinished`.
2. **Lệnh chạy test đã thử trên Windows:** gộp hai mục `be-dev` khó chạy Maven và `fe-dev` không gọi được `pnpm`. Mỗi app có một lệnh chạy test, và lời nhắc chỉ đúng lệnh đó.
3. **Check `policy` "Suppressions" đỏ lặp lại** (ba lần): hook `pre-commit` chạy cùng kiểm tra.
4. **`/ao-fix` chọn dev agent theo đường dẫn file của check đỏ hay finding.**
5. **QA của Task chỉ đổi tài liệu quá nặng** (SHOP-76): PR chỉ đổi `docs/**` thì không chạy lại cả bộ E2E; `qa` không tự bật Docker; template có mẫu Verification hẹp cho Task tài liệu.
6. **Kiểm Docker của `ao-step` thử lại một lần trước khi dừng.**

## Đợt 4: luồng Jira và GitHub (item bị kẹt, phải gỡ tay)

1. **Không approve PR khi có QA đang chạy hay đang chờ:** dòng STOP ở gate ③ và `/ao-status` nói rõ QA nào đang chạy; `merge-gate` chờ khi có tín hiệu "QA đang chạy".
2. **merge-gate không merge PR merge ngược khi CI xanh sau lượt chạy của nó:** nghe thêm `workflow_run` của CI.
3. **`audit` từ chối nhầm một commit merge vừa xong:** thử lại việc tìm PR.
4. **`ao-step` dừng hẳn khi GitHub trả 5xx một lần:** `github-client` thử lại.
5. **`ao-step` báo nhầm "GitHub Actions did not start" khi PR xung đột:** đọc `mergeable_state` và nói đúng lý do.
6. **Chạy lại QA sau NOT TESTED không có đường riêng:** thêm cờ `--retest`. Hiện nay chỉ có cách mượn `--note`, mà `--note` lại là đường "lỗi bạn thấy".
7. **Task thêm vào một Epic đã duyệt plan nằm ở New mãi:** tự refine khi đạt guard.
8. **Sub-task FE chạy trước khi WIP của `fe-dev` trống:** kiểm WIP trên Jira trước mỗi Sub-task.
9. **`be-dev` ghi ledger theo khóa Story:** lời nhắc nêu đúng tên file ledger.
10. **Review lại sau khi merge `develop` vào nhánh PR tính cả code của `develop`:** phần mới chỉ là phần của PR.
11. **Check `policy` đỏ vì `osv-scanner` không tra được Maven Central:** thử lại khi lỗi mạng.
12. **Chi phí âm ở lượt bị dừng khi đang chạy tiếp một phiên.**
13. **Task vận hành không có PR không đóng được bằng Done**, gộp với **Task dữ liệu của `devops` không có đường đi:**
    - một đường đi không PR: bằng chứng, QA kiểm, bạn Accept;
    - `children-released` bỏ qua item không có commit.

    Phần cho `devops` nhận basic auth cần bạn bật, nên mình hỏi lại khi tới.

## Đợt 5: cần thiết kế, đưa vào spec của C1 hay C2

- **Kit ghi đè job CI riêng của dự án** và **Dự án không có chỗ cho ngoại lệ audit riêng:** một file của dự án cho job và ngoại lệ riêng.
- **Review kit một lần ở repo kit:** xem [misc/thao-luan/review-kit-o-dau.md](../misc/thao-luan/review-kit-o-dau.md).
- **`/ao-preview` không chạy được khi bật làn.**
- **`profiles:check` đỏ ở bước `build` của app Next.js.** Mục này cần kiểm ngay xem có phải lỗ hổng của bản `next` trong profile không. Nếu phải, mình đưa nó lên Đợt 1.

## Không phải việc của kit

- **Việc của `shop`**, mỗi việc một Task khi bạn muốn:
  - **unit test `admin` "a name of 151 characters" chập chờn;**
  - **hai Low về chữ của hướng dẫn người dùng;**
  - **trình duyệt chỉ đặt `vi-VN` mở trang quản trị bằng tiếng Anh;**
  - SHOP-75 (backlog).
- **Có hạn, ở mục 7 của todo:** **`pr-events.yml` chưa có trên `main` và `release/*`**, trước 2026-12-02.

## Ước lượng

| Đợt | Số mục | Công của phiên chính | USD agent |
|---|---|---|---|
| 1 | 5 | khoảng nửa ngày | 0 |
| 2 | 5 | khoảng một ngày | 0 |
| 3 | 6 | khoảng một ngày | 0 |
| 4 | 13 | khoảng 1,5 ngày | 0 |
| Chép kit vào `shop`, review, QA | | khoảng 2 giờ | khoảng 9–10 |

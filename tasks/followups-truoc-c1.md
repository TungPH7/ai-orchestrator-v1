# Followup của kit, xếp lại trước C1

> Mục 6 của [todo.md](todo.md). Nguồn: 44 mục còn mở trong [handoff-2026-11-16-followups.md](handoff-2026-11-16-followups.md), đếm ngày 2026-11-18. Mỗi mục dưới đây trỏ về mục gốc bằng tên in đậm của nó. **Trạng thái:** bản xếp lần 2 (Phiên 33 · Lượt 45), ưu tiên việc tiết kiệm token theo lời bạn, chờ bạn duyệt.

## Vì sao xếp lại

SHOP-76 chỉ có 3 file Markdown và 11 ảnh, mà tốn 11,49 USD:
- **QA: 6,68 USD.**
  - Lượt 1 tốn 5,42 USD, vì ba lý do:
    - Verification đòi kiểm từng câu;
    - `qa` chạy lại cả bộ E2E;
    - `qa` tự dựng môi trường: tìm `.env`, tự bật Docker.
  - Lượt 2 tốn 1,26 USD, sau một lần QA fail.
- **Review: 4,80 USD.** Có 6 lượt cho 2 PR. PR chỉ đổi tài liệu mà `reviewer` vẫn chạy ở `xhigh`.

Theo đề xuất dưới đây, một Task tài liệu như vậy còn khoảng 2–3 USD [ước tính].

Cả Pilot 3 tốn 719 USD: build 44%, review 34%, QA 11%. Phần lãng phí lặp lại nhiều nhất là các lượt chạy lại hay chạy hỏng, và các bước agent tự mò công cụ hay môi trường.

## Cách làm

- **Mỗi đợt:** một nhánh và một kit PR, test viết đỏ trước. Phiên chính làm và tự merge khi CI xanh, 0 USD agent.
- **Chép kit vào `shop`:**
  - **lần 1, sau Đợt 1 và Đợt 2:** để `shop` hưởng phần tiết kiệm sớm. Dùng một lượt review đầy đủ (khoảng 8 USD) và một QA nhẹ;
  - **lần 2, sau Đợt 4.**
- **Đợt 5** cần thiết kế, nên đưa vào spec của C1 hay C2.

## Cần bạn quyết trước Đợt 1

Ba điểm đổi luật của contract hay roster. Mình đề xuất "Có" cho cả ba.

1. **QA mỗi item không chạy lại cả bộ E2E.** Nó chỉ chạy E2E của các AC và của app mà PR đổi. Cả bộ E2E vẫn chạy ở `/ao-ship`, bước regression trước gate ⑤.
   - Phải đổi DoD của Task: "Bộ regression pass" thành "E2E của phần đổi pass; cả bộ chạy ở bản release".
   - CI của PR vẫn chạy mọi unit test.
2. **PR chỉ đổi `docs/**`:**
   - `reviewer` chạy ở `high`, không phải `xhigh`;
   - `security` chỉ chạy khi PR có file ngoài `docs/`. Job `secrets` của CI vẫn quét mọi PR.
3. **Task chỉ đổi tài liệu (`docs/**`) không cần lượt `qa`.** Thay vào đó, bạn hay Claude đọc đối chiếu rồi Accept. Contract cho Task tài liệu đi từ In Review tới In QA với một báo cáo QA ngắn do phiên chính viết.

## Đợt 1: QA tốn ít token hơn

1. **QA của Task chỉ đổi tài liệu quá nặng** (SHOP-76):
   - PR chỉ đổi `docs/**` thì `qa` không chạy E2E, không bật Docker, chỉ đọc đối chiếu và mở các màn hình chính;
   - template Task có mẫu Verification hẹp cho Task tài liệu.
2. Áp quyết định 1 ở trên: QA mỗi item chỉ chạy E2E của phần đổi.
3. **`qa` không tự bật Docker Desktop.** Thiếu Docker thì `ao-step` dừng trước lượt, như với `be-dev`. Lần nào QA cũng để lại container `learn-postgres-s1` chạy.
4. **Worktree QA không có file `.env` của app:** chép `.env` như với làn, và dùng đường dẫn dài. Lượt `qa` nào cũng tự viết runner nạp `.env`, tốn bước.
5. **Approve PR lúc có QA đang chạy hay sắp chạy làm QA bị cắt ngang:** dòng STOP ở gate ③ và `/ao-status` báo QA nào đang chạy. Lượt QA bị thay thì mất trắng.
6. **Chạy lại QA sau NOT TESTED không có đường riêng:** thêm cờ `--retest`. Hôm nay `--note` bị dùng sai mục đích: nó là đường "lỗi bạn thấy".
7. **Lượt `qa` có kết quả rỗng thì coi là `unfinished`**, chạy tiếp trong phiên cũ (một phần của mục "Lặp lại hai lỗi đã ghi, ở QA SHOP-64").

## Đợt 2: dev agent và review tốn ít token hơn

1. **Lệnh chạy test đã thử trên Windows:** gộp hai mục `be-dev` khó chạy Maven và `fe-dev` không gọi được `pnpm`. Ở mỗi lượt, agent tốn hàng chục bước mò lệnh.
2. **Agent chạy headless kết thúc khi test còn chạy nền:** luật không dùng `run_in_background` trong lượt headless. Mỗi lần gặp lỗi này, cả lượt phải chạy lại.
3. **Check `policy` "Suppressions" đỏ lặp lại** (ba lần): hook `pre-commit` kiểm ở máy. Mỗi lần đỏ tốn một vòng CI và một lượt `/ao-fix`.
4. **`/ao-fix` trên Story có Sub-task giao nhầm dev agent:** chọn agent theo đường dẫn file của check đỏ.
5. **Review lại sau khi merge `develop` vào nhánh PR tính cả code của `develop`:** phần mới chỉ là phần của PR. Ở PR #41, `security` chạy `max` trên 3.700 dòng đã review rồi.
6. **Sub-task FE chạy trước khi WIP của `fe-dev` trên Jira trống:** kiểm WIP trước mỗi Sub-task. Lượt hỏng tốn 0,73 USD.
7. Áp quyết định 2 ở trên: review nhẹ cho PR chỉ đổi tài liệu.
8. **Luật dừng vòng sửa trong kit:** review không còn Critical hay High thì `ao-step` không gợi ý `/ao-fix`. Nó gợi ý approve, và Medium, Low thành Task theo dõi. Hiện nay luật này chỉ có trong memory của phiên chính.

## Đợt 3: bảo mật của hook

Lần trước bạn duyệt "sửa gh-guard trước tiên"; theo ưu tiên mới, nó lùi xuống đây. Trong lúc chờ, rủi ro là agent tìm được khóa riêng của các App trên máy bằng `grep` chữ thường. Nếu bạn muốn giữ nó lên đầu thì nói; mục 1 chỉ mất khoảng 1–2 giờ.

1. **gh-guard để lọt lệnh tìm khóa riêng** (Medium, PR #74).
2. **`gh-guard` từ chối `curl` có basic auth cả khi mật khẩu đi qua stdin.** Chặn nhầm thì agent phải đi đường vòng, tốn bước.
3. **Agent `qa` lách mẫu chữ của gh-guard.**
4. **Agent `ux` chép cả `apps` (có `node_modules`) vào thư mục tạm.**
5. **Relay `PR events` chọn nhầm PR của fork** (Low).

## Đợt 4: làn, worktree và luồng Jira, GitHub

Các mục này không tốn token agent, nhưng làm item bị kẹt, và phiên chính phải gỡ tay.

1. **Gỡ làn để sót thư mục:** gộp bốn mục `prune`, "Directory not empty", làn còn sót file gốc, làn còn sót `apps/user`.
2. **Hai lệnh cùng gỡ một làn thì giẫm lên nhau.**
3. **QA bị dừng vì deploy mới để lại app của nó chạy.**
4. **Lời nhắc làn cho agent chưa nêu biến `env` của app.**
5. **merge-gate không merge PR merge ngược khi CI xanh sau lượt chạy của nó.**
6. **`audit` của deployer từ chối nhầm một commit merge vừa xong.**
7. **`ao-step` dừng hẳn khi GitHub trả 5xx một lần.**
8. **`ao-step` báo nhầm "GitHub Actions did not start" khi PR xung đột với `develop`.**
9. **Kiểm Docker của `ao-step` thử lại một lần trước khi dừng.**
10. **Task thêm vào một Epic đã duyệt plan nằm ở New mãi.**
11. **`be-dev` ghi ledger theo khóa Story.**
12. **Check `policy` đỏ vì `osv-scanner` không tra được Maven Central.**
13. **Chi phí âm ở lượt bị dừng khi đang chạy tiếp một phiên.**
14. **Task vận hành không có PR**, gộp với **Task dữ liệu của `devops`**. Phần cho `devops` nhận basic auth cần bạn bật.

## Đợt 5: cần thiết kế, đưa vào spec của C1 hay C2

- **Review kit một lần ở repo kit** ([review-kit-o-dau.md](../misc/thao-luan/review-kit-o-dau.md)). Đây là khoản tiết kiệm lớn: ba lần chép kit trong Pilot 3 tốn 95 USD. Trong lúc chờ, cứ gom nhiều bản sửa kit vào một lần chép.
- **Kit ghi đè job CI riêng của dự án** và **Dự án không có chỗ cho ngoại lệ audit riêng.**
- **`/ao-preview` không chạy được khi bật làn.**
- **`profiles:check` đỏ ở bước `build` của app Next.js.** Cần kiểm sớm xem có phải lỗ hổng của bản `next` không. Nếu phải, mục này lên Đợt 3.

## Không phải việc của kit

- **Việc của `shop`**, mỗi việc một Task khi bạn muốn:
  - **unit test `admin` "a name of 151 characters" chập chờn**;
  - **hai Low về chữ của hướng dẫn người dùng**;
  - **trình duyệt chỉ đặt `vi-VN` mở trang quản trị bằng tiếng Anh**;
  - SHOP-75.
- **Có hạn, ở mục 7 của todo:** **`pr-events.yml` chưa có trên `main` và `release/*`**, trước 2026-12-02.

## Ước lượng

| Đợt | Số mục | Công của phiên chính | USD agent |
|---|---|---|---|
| 1 | 7 | khoảng một ngày | 0 |
| 2 | 8 | khoảng một ngày | 0 |
| Chép kit vào `shop` lần 1 (review, QA nhẹ) | | khoảng 2 giờ | khoảng 9 |
| 3 | 5 | khoảng nửa ngày | 0 |
| 4 | 14 | khoảng 1,5 ngày | 0 |
| Chép kit vào `shop` lần 2 | | khoảng 2 giờ | khoảng 9 |

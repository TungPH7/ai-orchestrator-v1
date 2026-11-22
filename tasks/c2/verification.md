# Kiểm: C2

> **Plan:** [plan.md](plan.md). **Todo:** [todo.md](todo.md). File này ghi kết quả T13, T14 và các đợt sửa sau đó, rồi 6 tiêu chí của spec mục 15 và các mục kiểm thật của spec mục 13.

## T13 và T13b: chép kit vào `shop` (2026-11-21, Phiên 35 · Lượt 1–9)

- **SHOP-79, PR #80** (kit `8a9f25d`, sáu kit PR của C2 cộng T20b):
  - Review 15,23 USD: cả hai role 0 Critical, 0 High, cộng 9 finding Medium và Low trong code kit.
  - Merge thành `20cbfd4`. QA PASS (0,94 USD). SHOP-79 tốn 16,17 USD.
- **T13b, SHOP-80, PR #81:** sửa 9 finding đó trong kit (kit PR #334–#336), rồi chép lại.
  - Ba vòng review tốn 28,40 USD. Vòng ba còn High `08bc0732` (`plainText` không idempotent). Bạn chấp nhận rủi ro tới 2026-12-15, và đợt 4 sau T14 đã sửa nó (kit PR #342).
  - Merge thành `154ac4e`. QA PASS (0,95 USD). SHOP-80 tốn 29,35 USD.

## T14: chạy thật trên Epic SHOP-81 "Danh mục sản phẩm" (2026-11-21 tới 2026-11-23)

- **Epic:** 20 AC. Plan có 3 item: SHOP-82 (Task `api`, `be-dev`, heavy), SHOP-83 (Story `admin`), SHOP-84 (Story `user`, có SEO). Ngoài ra còn Task finding SHOP-85.
- **`/ao-spec` và `/ao-plan`:** phiên chính chạy tay (`ao-step spec`, `ao-step plan`). Gate ① và ② do Claude bấm, theo lời bạn ở Lượt 15 và 17.
- **`/ao-run SHOP-81`** chạy ba lần:
  1. 00:56: build SHOP-82. Dừng ở PR nháp chờ bạn, rồi tự kết thúc sau 8 giờ không có gì để chạy.
  2. 11:02, ngân sách 120 USD:
     - build SHOP-83;
     - QA SHOP-82;
     - build lại SHOP-82, cùng lúc với SHOP-83;
     - build SHOP-84;
     - các lượt QA.

     Lần chạy này tốn 60,51 USD.
  3. 17:53: build SHOP-87 và SHOP-88 cùng lúc, hai agent `fe-dev` trong hai làn (`runs.agents_per_role` của `fe-dev` là 2, SHOP-86). Tốn 7,97 USD. Hai Task này sau đó được Cancel.
- **Lỗi kit gom từ T14:** 15 mục, sửa trong 4 đợt (kit PR #339–#342), cùng các việc còn mở của review vòng ba PR #81 ([followups-t14.md](followups-t14.md)). Kit PR #344 ghi lý do không bật ruleset strict.
- **Bản kit mới vào `shop`:** SHOP-89, PR #90, kit `666def3`, 9,60 USD kể cả QA. VPS cũng chạy `666def3`, và deployer giờ chờ CI của đầu `develop` xanh.
- **Watcher `ao-step watch` và 5 Low của review PR #90:** kit PR #345.
- **SHOP-85** (Task finding, hai Sub-task):
  - phiên chính chạy tay `ao-step build`, `review`, `qa`;
  - hai lần agent gắn cờ: commit thiếu khoá Sub-task, và một test cũ quá giờ khi đo coverage;
  - QA phải xét lại một lần, vì 3 Low của chính PR #91 bị ghi vào SHOP-85.

  Tốn 17,63 USD. Đợt 6 sửa ba lỗi kit này, cùng lỗi số lượt trùng làm mất bản ghi `security` của SHOP-89 (kit PR #346).
- **Kết quả:** SHOP-82, 83, 84, 85 Done; SHOP-87, 88 Cancelled. 3 Low của PR #91 chuyển sang SHOP-92, ngoài Epic. Epic còn In Progress, chờ một đợt release đưa các item vào Fix Version đã phát hành; sau đó bạn bấm Complete.

## Kiểm thật (spec mục 13)

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| Chép kit vào `shop` một lần, có review | **Đạt** | SHOP-79 (PR #80), rồi SHOP-80 (PR #81) và SHOP-89 (PR #90) |
| Bộ điều phối tự mở `/ao-spec`, `/ao-plan`, dừng ở cổng ①, ②, rồi tự chạy tiếp | **Không kiểm thật** | Spec và plan chạy tay. Bộ điều phối chỉ bắt đầu sau gate ②. Phần này có test (`dispatch`, `run-command`) |
| Ít nhất một lần hai lệnh build chạy cùng lúc do bộ điều phối mở | **Đạt** | 11:36: build SHOP-82 (`be-dev`) cùng lúc với build SHOP-83 (`fe-dev`); 17:53: SHOP-87 và SHOP-88 |
| Ít nhất một lần `reviewer` và `security` chạy cùng lúc | **Đạt** | Mọi lượt review từ PR #83 tới PR #91 |
| Ít nhất một lần `/ao-preview` trong làn | **Đạt** | SHOP-83 (11:55) và SHOP-84 (15:00), mỗi lần từ làn của item |
| Approve PR khi `qa` đang chạy, `merge-gate` chờ QA xong rồi mới merge | **Không kiểm thật** | Không lượt `merge-gate` nào trong T14 chạy quá 3 phút, nên chưa lần nào phải chờ. Nhịp tim `ao/qa` có test (`qa-signal`) |
| `runs.agents_per_role` 2 cho một role | **Đạt** | SHOP-86 đặt `fe-dev: 2`; SHOP-87 và SHOP-88 build cùng lúc 17:53 → 18:25 |
| Tiêu chí 7 của C1: USD trên mỗi AC | **Đạt** | 7,06 USD, so với 21,6 USD của SHOP-7 (mục Số đo) |

## Tiêu chí hoàn thành (spec mục 15), 2026-11-23

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Sáu kit PR đã merge, CI xanh; `validate`, `npm test`, `agents:check` xanh | **Đạt** | Kit PR #328–#333; sau đó #339–#346, 1.840 test |
| 2 | Bản chép kit vào `shop` đi qua `/ao-review`, `doctor` đạt | **Đạt** | PR #80, #81, #90; `doctor` chỉ báo Docker tắt, điều đã biết |
| 3 | Kiểm thật ở mục 13 đạt từng gạch đầu dòng | **Đạt một phần** | 6 trên 8 mục đạt; 2 mục chưa kiểm thật (bảng trên) |
| 4 | Trong Epic chạy thật, phiên chính chỉ dùng `/ao-run`, `/ao-preview` và các bước bạn bấm | **Không đạt** | Phiên chính gõ `review` cho PR #83, #84, #85, #86, `fix` cho PR #84 hai lần, `qa` cho SHOP-82, và mọi lệnh của SHOP-85. Lý do dưới bảng |
| 5 | Không lượt nào dừng vì giành khóa, giành git hay ghi đè `state.json` | **Không đạt** | Ba lần, đều đã sửa (dưới bảng) |
| 6 | Ghi số đo: Ready tới Done của mỗi item so với SHOP-7; USD trên mỗi AC | **Đạt** | Mục Số đo |

**Vì sao tiêu chí 4 không đạt:**
- **Theo thiết kế:** PR nháp chờ bạn chọn `/ao-preview` hay `/ao-review`. Bộ điều phối không tự review PR nháp, nên sau mỗi build, `review` là bước của bạn. Tiêu chí 4 viết chưa khớp với thiết kế đó.
- **Bạn chọn bỏ xem trước:** bộ điều phối đầu tiên tự kết thúc lúc 10:10 khi chờ câu trả lời của bạn. Bạn chọn "review luôn" (Lượt 20).
- **Yêu cầu của bạn:** bạn đổi giao diện sau khi xem trước (Lượt 27, 30), nên có hai lần `/ao-fix` kèm ghi chú.
- **Lỗi kit, đã sửa ở đợt 1:**
  - QA SHOP-82 hỏng vì máy chưa có commit, nên phiên chính chạy tay;
  - `/ao-fix` không xếp hàng chờ role.
- **SHOP-85** làm sau khi bạn bảo dừng `/ao-run` (Lượt 37), nên phiên chính chạy tay từng lệnh.

**Ba lần dừng của tiêu chí 5:**
1. **Giành khóa:** `/ao-fix 84` dừng ngay khi `fe-dev` đang build SHOP-84. Đợt 1 (`roleOnLock`): lệnh `fix` giờ chờ role rảnh.
2. **Git:** QA của SHOP-82 hỏng vì máy chưa fetch commit merge (worktree báo "invalid reference"). Đợt 1 (`haveCommit`) fetch trước.
3. **Ghi đè `state.json`:** trên SHOP-89, lượt QA lấy lại số 2 của lượt `security` và ghi đè bản ghi của nó, mất 5,68 USD chi phí và phiên. Đợt 6: số lượt lấy số lớn nhất, và các lượt giữ theo thứ tự số.

## Số đo

**Ready tới Done** (từ lịch sử trạng thái trên Jira, `.pilot3-scratch/ready-to-done.mjs`; không tính Sub-task):

| | SHOP-81 (C2) | SHOP-7 (Pilot 3) |
|---|---|---|
| Số item | 4 (1 Task heavy, 2 Story, 1 Task finding) | 19 (10 Task, 9 Story) |
| Trung vị Ready → Done | 11,8 giờ | 25,0 giờ |
| Trung vị Start → Done | 2,7 giờ | 7,5 giờ |
| Từ Ready đầu tiên tới Done cuối cùng | 23,0 giờ | 52,5 giờ |

| Item | Ready → Done | Start → Done |
|---|---|---|
| SHOP-82 (`api`) | 11,8 giờ, gồm 8,5 giờ chờ bạn qua đêm | 11,7 giờ |
| SHOP-83 (`admin`) | 14,7 giờ | 4,5 giờ |
| SHOP-84 (`user`) | 15,6 giờ | 2,7 giờ |
| SHOP-85 (finding) | 2,8 giờ | 2,0 giờ |

- Hai Epic khác cỡ: SHOP-7 có 30 item, kể cả 10 Sub-task, và chạy lần lượt; SHOP-81 có 4 item và chạy song song khi được.
- Thời gian gồm cả lúc chờ bạn. Riêng SHOP-82 chờ câu trả lời về ngân sách từ 02:10 tới 10:42.

**USD trên mỗi AC:** 141,16 USD cho 20 AC, tức 7,06 USD, theo dòng `Cost of SHOP-81` của `/ao-status` (44 lượt). SHOP-7 tốn 21,6 USD (604 USD cho 28 AC). Tổng của kit khớp đúng tổng cộng tay từ các báo cáo `last.md`, nên lỗi mất bản ghi không chạm SHOP-81.

**Chi phí của C2 trên `shop`:**
- T13, T13b, bản chép SHOP-89: 16,17 + 29,35 + 9,60 = 55,12 USD.
- T14: 141,16 USD cho Epic, cộng 3,81 USD cho SHOP-86.
- Tổng: **200,09 USD**.

## Kết luận

- 3 trên 6 tiêu chí đạt (1, 2, 6). Tiêu chí 3 đạt 6 trên 8 mục.
- Tiêu chí 4 không đạt, phần lớn vì cách nó được viết. Cần sửa tiêu chí hoặc thiết kế: hoặc bộ điều phối tự mở `/ao-review` khi bạn đã chọn "bỏ xem trước" cho một Epic, hoặc tiêu chí tính `review` là bước của bạn.
- Tiêu chí 5 không đạt, với 3 lỗi đã sửa ở đợt 1 và đợt 6.
- Hai mục kiểm thật còn lại (bộ điều phối ở cổng ① ②, `merge-gate` chờ QA) chờ Epic sau.
- Việc còn lại:
  - lần chép kit kế tiếp mang kit PR #345 và #346, có review;
  - SHOP-92 (3 Low) chờ bạn Refine;
  - Epic SHOP-81 chờ release, rồi bạn bấm Complete.

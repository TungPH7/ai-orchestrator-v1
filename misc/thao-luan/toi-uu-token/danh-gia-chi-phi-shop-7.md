# Epic SHOP-7 và Pilot 3 có xứng với token, thời gian và tiền đã bỏ ra không

Phiên 33 · Lượt 49, ngày 2026-11-18. Số liệu lấy từ `shop/.ai/runs/*/state.json` (281 lượt agent của Epic), review của các PR trong `shop/.ai/reviews/`, `git diff v0.2.0 v0.3.0` của `shop`, và [tasks/archive/pilot-3/](../../../tasks/archive/pilot-3/verification.md). Con số có ghi [ước tính] là suy luận, không phải số đo.

## Câu hỏi của bạn (nguyên văn)

> - Hiện tại tôi thấy luồng làm epic SHOP-7 theo SDLC hiện tại qua tốn token, mất nhiều thời gian và tiền bạc (Epic SHOP-7 tốn khoảng 604 USD, trong hơn 2 ngày từ 12h00 ngày 15/11 tới 23h00 ngày 17/11 đã gần hết giới hạn tuần của gói Claude Max x5). Nếu cùng epic SHOP-7 này nếu làm theo kiểu đơn giản hơn là prompt yêu cầu cho dev fe, be làm và tôi verify thì tôi thấy sẽ nhanh hơn và thậm chí bổ sung thêm nhiều tính năng hơn và có UI với nhiều component hơn. Cách làm epic SHOP-7 hiện tại tôi thấy số lượng tính năng ít và đơn giản, bằng chứng là UI rất đơn giản, cơ bản, Nhưng lại tốn rất nhiều token. Nghiên cứu, đánh giá xem chất lượng, số lượng task của SHOP-7 và Pilot 3 đã release có xứng đáng với lượng token, thời gian và tiền bạc đã bỏ ra không?
>
> Viết vào 1 file tại 1 folder con (đặt tên về tối ưu token) trong D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ai-orchestrator\misc\thao-luan. Viết nguyên văn câu hỏi của tôi

## Tóm tắt

1. **Xét như một lần làm sản phẩm thì không xứng.** Khoảng hai phần ba số tiền đi vào quy trình, không vào tính năng:
   - review mọi PR ở mức cao nhất;
   - 28 Task sửa finding nhỏ;
   - QA chạy lại;
   - các lượt chạy hỏng.

   Với cùng phạm vi, cách bạn nói (prompt dev rồi bạn verify) rẻ hơn nhiều lần và nhanh hơn. Cái giá là mất phần lớn test tự động, và không ai kiểm độc lập.
2. **Bạn đúng ở điểm chính, chưa đúng hẳn ở một điểm phụ:**
   - **Đúng:** quy trình đắt so với lượng tính năng làm ra. Trung bình **21,6 USD cho mỗi acceptance criterion** (604 USD cho AC1–AC28).
   - **Chưa đúng hẳn:** UI đơn giản phần lớn là do phạm vi đã chọn. Spec của Pilot 3 cố ý chọn một Epic nhỏ, không có ảnh thật, không đăng nhập, không giỏ hàng. Quy trình làm mỗi tính năng đắt, nhưng không phải nó làm UI nghèo.
3. **Xét như một pilot để kiểm kit thì xứng một phần.** Pilot 3 lần đầu chạy thật trọn vòng với Java, ba môi trường, migration trên database Production có dữ liệu, bản sao backup, Trong lúc chạy, nó ghi được hơn 50 followup cho kit, và 21 kit PR đã merge. Nhưng cái giá đó không được lặp lại ở mỗi Epic.
4. **Đề xuất:** chia quy trình thành ba mức theo rủi ro (mục 5). Đường đầy đủ hiện nay chỉ dành cho việc rủi ro cao: đăng nhập, thanh toán, migration trên dữ liệu thật, hạ tầng, kit. Đợt 1 và 2 của [followups-truoc-c1.md](../../../tasks/followups-truoc-c1.md) là bước đầu.

## 1. Đã nhận được gì

| Hạng mục | Số đo |
|---|---|
| Tính năng | 6 user story (US1–US6), 28 acceptance criterion (AC1–AC28) |
| Màn hình | 6 màn hình (S1–S6). `admin`: danh sách có tìm, lọc, phân trang; form thêm và sửa; hộp thoại xóa. `user`: danh sách có tìm không dấu, 4 kiểu sắp xếp, Xem thêm; trang chi tiết; trang 404 |
| Chất lượng giao diện | Design system cho 2 app, giao diện sáng và tối, tiếng Việt và tiếng Anh, axe 0 vi phạm, thẻ meta, JSON-LD và sitemap cho SEO |
| Item trên Jira | 50 item vào `v0.3.0`: 9 Story, 10 Task của plan, 28 Task và Bug thêm trong lúc làm, 3 item ngoài Epic |
| Code sản phẩm thêm vào | khoảng 10.900 dòng: `admin` 4.733, `user` 3.417, `api` 2.722 |
| Test thêm vào | khoảng 20.800 dòng, gấp đôi code sản phẩm: unit và integration 17.669, E2E 3.095. Hiện có 140 E2E và 658 unit test của `user` |
| Tài liệu | spec, `design.md`, plan, 3 ADR, `docs/design-system/` của hai app: khoảng 2.800 dòng |
| Phát hành | `v0.3.0` lên Production, Flyway V4–V6 nâng database đang có dữ liệu mà không mất giá nào, regression trên Staging 132/0/6 |

**Nhận xét:**
- Phần nhìn thấy được thì khiêm tốn: một danh mục sản phẩm cơ bản.
- Phần không nhìn thấy thì khá dày: test gấp đôi code, tài liệu, release có kiểm.
- Với một dev làm bằng tay, phạm vi này tương đương khoảng 1–2 tuần [ước tính].

## 2. Đã tốn gì

- **Tiền:** 603,86 USD theo giá API cho Epic. Cả Pilot 3 tốn 719 USD.
- **Lượt agent:** 281 lượt, gồm 12.237 lượt gọi model.
- **Thời gian:** khoảng 41 giờ agent chạy. Theo đồng hồ, khoảng 2,5 ngày, từ sáng 15/11 tới gần nửa đêm 17/11.
- **Hạn mức:** cuối pilot, hạn mức 7 ngày của gói Max 5x đã dùng 89%.

**Theo bước:**

| Bước | Lượt | USD | % |
|---|---|---|---|
| Spec và plan | 9 | 26,28 | 4 |
| Build | 65 | 266,30 | 44 |
| Sửa và trả lời yêu cầu | 25 | 35,55 | 6 |
| Review | 118 | 204,99 | 34 |
| QA | 64 | 68,58 | 11 |
| Release | 2 | 2,16 | 0,4 |

**Theo loại token** [ước tính, từ hồi quy chi phí trên 315 lượt của `shop`]:
- đọc lại bối cảnh đã cache: khoảng **40%**;
- ghi bối cảnh vào cache: khoảng **31%**;
- chữ model viết ra (code, báo cáo): khoảng **29%**.

Nghĩa là khoảng **71% tiền trả cho việc nạp và đọc lại bối cảnh**: prompt của agent, skill, item, spec, plan, code. Mỗi lượt agent nạp lại từ đầu, và mỗi bước trong lượt đọc lại cả bối cảnh. Vì vậy chi phí tăng theo **số lượt và số bước**, không theo lượng code viết ra.

## 3. Bao nhiêu là cần, bao nhiêu là lãng phí

### 3.1 Review: đắt mà ít tìm ra lỗi nặng

- **Review của mọi item tốn 205 USD, bằng 34% Epic.** `reviewer` luôn chạy ở `xhigh`. `security` chạy `max` ở 34 lượt, mỗi lượt khoảng 2,65 USD.
- **Báo cáo cuối của các PR trong Epic chỉ tìm ra:**
  - 0 Critical;
  - 1 High, nằm ở một test E2E (PR #55), không phải lỗi của app;
  - 24 Medium;
  - 135 Low.
- **Phần lớn finding là Low:** chữ nghĩa, comment, test chưa chặt, tên hay vị trí code. `security` trên các PR app chỉ có 3 Medium và 10 Low.
- **Review chỉ thật sự đáng giá ở PR chép kit.** PR #13 và #21 có nhiều High về token, ruleset và khóa backup.
- **Mỗi vòng "sửa, rồi review lại" tốn 4–9 USD,** và vòng sau thường chỉ tìm thêm Low. Đầu Epic, bạn chọn sửa cả Low trước khi approve. Bốn Task design system vì thế tốn 106 USD, mỗi PR đi 2–3 vòng.

### 3.2 28 item thêm trong lúc làm: 216 USD, bằng 36% Epic

- **Mỗi PR có Medium hay Low lại sinh một Task theo dõi.** Mỗi Task đó đi lại trọn vòng: build, review, QA, Accept. Trung bình 7,72 USD một Task.
- **Phần lớn chỉ sửa Low.** Giá trị có thật, như code sạch hơn và test chặt hơn, nhưng nhỏ so với chi phí.
- **Từ giữa Epic, Low được gom vào Task chung** (SHOP-39 cho `fe-dev`, SHOP-68 cho `be-dev`). Nếu làm vậy từ đầu, phần lớn khoản này đã không tốn.

### 3.3 QA: rẻ nhất, nhưng tìm ra lỗi thật

- **QA tốn 69 USD, bằng 11% Epic.** Tính theo tiền, đây là bước tìm ra nhiều lỗi thật nhất:
  - CORS trả 403 cho mọi lệnh ghi của `admin` trên Development (SHOP-56);
  - log của Hibernate lộ tên và mô tả sản phẩm (SHOP-51);
  - một test E2E sai (SHOP-28).
- **Phần lãng phí của QA:**
  - lượt QA bị thay vì deploy giữa chừng (3 lần);
  - mỗi lượt tự dựng môi trường: tìm `.env`, tự bật Docker;
  - phần Verification quá rộng, như ở SHOP-76.

### 3.4 Lãng phí do lỗi của kit

- **21 lượt dừng vì giới hạn usage.** Mỗi lần chạy tiếp lại phải ghi bối cảnh vào cache.
- **Agent bị dừng sau một phút khi chạy tiếp** (lỗi đã sửa ở kit PR #302).
- **Agent tự mò lệnh:** cách chạy Maven và `pnpm` trên Windows tốn hàng chục bước ở mỗi lượt.
- **Lượt chạy hỏng:** test chạy nền, Sub-task chạy trước khi WIP trống.
- **Thiếu dữ liệu để tính chính xác,** nhưng gộp lại khoảng 5–10% [ước tính].

### 3.5 Tổng hợp

| Nhóm | USD (gần đúng) | Ghi chú |
|---|---|---|
| Làm tính năng: spec, plan, build và sửa của 19 item gốc | khoảng 250–300 | Phần cốt lõi, có cả TDD và E2E cho từng AC |
| Kiểm độc lập: review và QA của 19 item gốc | khoảng 100–130 | Có giá trị, nhưng mức `xhigh`/`max` là quá tay cho rủi ro của Epic này |
| 28 item sửa finding | 216 | Phần lớn để sửa Low |
| Chạy lại và chạy hỏng | nằm rải trong các dòng trên | Lỗi kit, giới hạn usage |

Như vậy, phần "làm ra tính năng" chiếm khoảng 40–50%. Phần còn lại là kiểm và sửa ở mức chi tiết mà Epic có rủi ro thấp này không cần.

## 4. So với cách đơn giản: bạn prompt dev agent rồi tự verify

**Được gì:**
- **Rẻ hơn.** Bỏ được:
  - review và QA của từng item (khoảng 274 USD);
  - 28 Task theo dõi (216 USD);
  - phần lớn số lần nạp lại bối cảnh, vì ít lượt hơn và mỗi lượt làm nhiều việc hơn.

  Cùng phạm vi, kể cả unit test, có thể còn khoảng **80–150 USD**, rẻ hơn khoảng 4–7 lần [ước tính]. Bỏ cả test thì rẻ hơn nữa.
- **Nhanh hơn:** khoảng 1 ngày thay vì 2,5 ngày [ước tính]. Phần lớn thời gian hiện nay là các vòng chờ review, QA, deploy, merge.
- **Nhiều tính năng hơn với cùng hạn mức.** Bạn nói đúng điểm này: tiền không vào quy trình thì vào tính năng.

**Mất gì:**
- **Test tự động:** 20.800 dòng test hiện có (E2E cho từng AC, coverage của dòng đổi) là thứ giữ cho các Epic sau không làm hỏng Epic này. Prompt đơn giản thì dev agent thường viết ít test hơn, trừ khi bạn yêu cầu.
- **Kiểm độc lập:** ở Epic này nó ít khi tìm ra lỗi nặng. Nhưng các Epic sắp tới (đăng nhập, thanh toán) thì khác: một lỗi bảo mật ở đó đắt hơn nhiều so với vài USD review.
- **Lỗi môi trường mà chỉ QA trên host thật mới thấy,** như lỗi CORS SHOP-56. Bạn sẽ tự gặp chúng khi verify, nhưng chậm hơn.
- **Dấu vết:** Jira, PR, báo cáo, release note. Nếu bạn làm một mình, phần này ít giá trị; khi có team, nó cần.

**UI nhiều component hơn** không tự đến từ cách làm đơn giản hơn. Nó đến từ đầu vào:
- ảnh sản phẩm thật;
- thiết kế có nhiều màn hình hơn;
- phạm vi rộng hơn.

Epic SHOP-7 cố ý dùng ảnh giữ chỗ và một phạm vi nhỏ để kiểm kit.

## 5. Đề xuất: ba mức quy trình theo rủi ro

| Mức | Dùng cho | Build | Review | QA | Low |
|---|---|---|---|---|---|
| **Nhẹ** | Tài liệu, chữ, UI không chạm dữ liệu, tính năng nhỏ | Một lượt dev, hoặc phiên chính | CI và unit test. `reviewer` ở `high` một lần; tài liệu thì bỏ review | Không có lượt `qa`: bạn hay Claude xem trên Development | Không sửa riêng; gom vào một Task chung mỗi Epic |
| **Chuẩn** | Tính năng có API và database, không đăng nhập hay thanh toán (như SHOP-7) | Dev agent, Story to hơn: khoảng 6–8 Story cho cả Epic thay vì 19 item cộng Sub-task | `reviewer` `high` một lần. `security` chỉ khi PR chạm đường dẫn nhạy cảm | `qa` một lần mỗi Story, theo AC | Gom vào một Task chung mỗi Epic |
| **Nặng** | Đăng nhập, thanh toán, migration trên dữ liệu thật, hạ tầng, kit | Như hiện nay | `reviewer` `xhigh`, `security` `max`, sửa tới khi không còn Critical hay High | QA đầy đủ | Như hiện nay |

**Đi kèm:**
- **Bớt số lượt:** mỗi lượt làm trọn một Story, không tách nhiều lượt nhỏ. Lý do: khoảng 71% chi phí là nạp và đọc lại bối cảnh.
- **Bối cảnh gọn hơn:** gói bối cảnh của review chỉ phần cần, skill chỉ nạp khi dùng.
- **Hết lãng phí do lỗi kit:** Đợt 1 và 2 của [followups-truoc-c1.md](../../../tasks/followups-truoc-c1.md).
- **Đo lại:** Epic kế tiếp chạy theo mức Chuẩn, rồi so **USD cho mỗi AC** với con số 21,6 USD của SHOP-7.

**Ước tính:** nếu SHOP-7 chạy ở mức Chuẩn, nó tốn khoảng 200–280 USD, tức khoảng 7–10 USD cho mỗi AC, mà vẫn giữ E2E cho từng AC và một lượt review [ước tính]. Phần chênh với cách đơn giản (80–150 USD) là giá của test tự động và kiểm độc lập.

## 6. Cần bạn quyết

1. Có đưa ba mức quy trình vào C1 không? C1 vốn là việc chuyển thứ tự chạy vào contract, nên đây là chỗ hợp để thêm mức theo rủi ro.
2. Epic kế tiếp của `shop` chạy ở mức nào? Mình đề xuất mức Chuẩn, trừ phần đăng nhập ở mức Nặng.

## Nguồn

- `shop/.ai/runs/*/state.json`: chi phí, lượt, token của 281 lượt của Epic. Cách đếm giống `tasks/archive/pilot-3/verification.md`, mục "Chi phí agent của Pilot 3".
- `shop/.ai/reviews/<PR>-reviewer.md`, `<PR>-security.md`: báo cáo **cuối** của từng PR #18–#70. Finding của các vòng trước bị ghi đè, nên số Medium và Low thật còn cao hơn.
- `git diff --numstat v0.2.0 v0.3.0` của `shop`: dòng code, test, tài liệu.
- [docs/getting-started.md](../../../docs/getting-started.md), phần 7: bảng bước, chi phí theo loại item.
- [tasks/archive/pilot-3/verification.md](../../../tasks/archive/pilot-3/verification.md): tám tiêu chí, chi phí của Pilot 3.

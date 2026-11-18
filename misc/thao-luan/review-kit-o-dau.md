# Review kit ở đâu: ở repo kit hay ở PR chép kit vào dự án

Phiên 33 · Lượt 38, ngày 2026-11-18. Bạn hỏi tiếp về mục 3 ở Lượt 37: hiện mỗi lần chép kit vào `shop`, agent lại review (PR #74 tốn khoảng 7,8 USD), trong khi PR sửa kit ở repo kit thì không có agent review. File này trả lời hai câu: (1) vì sao lúc đầu chọn review ở dự án; (2) chuyển sang review ở repo kit thì kết quả có tương đương không.

## Tóm tắt

- **Lúc đầu chọn review ở dự án vì ba lý do:**
  - mọi công cụ review và mọi cổng kiểm của kit đều dựng cho PR của dự án;
  - repo kit chưa có review nên không có chỗ để tin;
  - lần chép vào dự án là lúc duy nhất thấy kit chạy chung với cấu hình thật của dự án.

  Kit vẫn có sẵn cơ chế "review một lần cho mỗi bản kit": dự án sau dùng lại kết quả review của dự án trước bằng cách so từng byte (spec `kit-copy-review`, Phiên 27). Nhưng hiện chỉ có `shop` nhận kit mới, nên lần chép nào cũng là "lần đầu", và lần nào cũng phải review đầy đủ.
- **Chuyển sang review ở repo kit thì tương đương cho phần code của kit, nhưng không tương đương cho phần ghép kit vào dự án.** Ở PR #74, 3 trên 5 finding nằm trong code kit, nên review ở repo kit cũng sẽ thấy. 2 finding còn lại chỉ thấy được trong dự án.
- **Đề xuất:** review đầy đủ một lần ở repo kit cho mỗi bản phát hành. Khi chép vào dự án thì chỉ:
  1. so byte với bản đã review;
  2. review nhẹ phần riêng của dự án, và chỉ khi có phần riêng.

  Cách này dùng lại gần hết cơ chế `kit-copy-review` đang có.

## 1. Vì sao lúc đầu review ở dự án

### 1.1 Công cụ và cổng kiểm đều dựng cho PR của dự án

- `/ao-review` chạy `reviewer` và `security` cho một PR của dự án. Lệnh cần một item Jira, một `project.yaml` và gói bối cảnh của dự án. Báo cáo được đăng bằng App `ao-review` lên chính PR đó.
- `merge-gate`, `audit` và gate ③ đọc báo cáo trên **head của PR dự án**. Không có báo cáo đó thì PR không đi tiếp được.
- Repo kit không có những thứ này: không có space Jira, không chạy `ao-step`, chưa cài App `ao-review`, và nhánh `main` không có ruleset bắt review. PR sửa kit do phiên chính làm, kiểm bằng bộ test (1540 test), rồi tự merge. Đây là quy ước của kit từ đầu, để sửa kit nhanh trong lúc chạy pilot.

### 1.2 Repo kit chưa có chỗ để tin

Spec `kit-copy-review` (Phiên 27, Lượt 67–72) đã cân nhắc đúng câu hỏi này. Theo mục 2.2 của spec:

> Gốc tin cậy là **head đã được review và merge**, không phải commit của repo kit. Đề xuất ban đầu ở Phiên 27 dùng repo kit, nhưng commit kit chưa từng được agent review: kit tự merge chỉ với CI.

Nghĩa là: commit của repo kit chưa có ai review, nên lấy nó làm chỗ tin thì không có cơ sở. Một PR chép kit **đã review và đã merge** ở một dự án thì có đủ bằng chứng trên GitHub: báo cáo của App `ao-review`, login người merge, head cụ thể. Vì vậy kit chọn cách đó:

- dự án đầu tiên nhận bản kit mới thì review đầy đủ;
- dự án sau ghi `Kit review: <repo>#<PR>` trong mô tả PR. `ao-step` so từng file với head đã review (10 điều kiện), khớp hết thì tự đăng báo cáo, 0 USD.

### 1.3 Lần chép là lúc kit gặp cấu hình thật của dự án

Độ an toàn của bản chép phụ thuộc vào dự án:
- secret nào có, nằm trong environment nào;
- ruleset và `CODEOWNERS`;
- repo public hay private;
- dự án có nhánh `main` và `release/*` nào;
- job CI riêng, ngoại lệ audit, `project.yaml`.

Review ở PR chép kit thấy được cả những thứ này.

### 1.4 Nhịp sửa kit trong pilot

Trong 3 ngày Pilot 3, kit có 10 PR (#294–#303), nhiều PR chỉ vài dòng. Review từng PR ở repo kit, với `security` ở mức `max`, sẽ tốn hơn nhiều so với review một lần khi chép cả đợt vào dự án.

### Vì sao cách này giờ không còn hợp

Cơ chế dùng lại kết quả review chỉ có lợi khi có **nhiều dự án** nhận cùng một bản kit. Hiện chỉ có `shop` nhận bản mới (`ao-pilot` và `ao-sample` đã dừng), nên lần chép nào cũng là lần đầu và lần nào cũng tốn tiền review. Còn với kit dùng chung cho cộng đồng, người dùng kit không thể là người review đầu tiên cho mọi bản phát hành: phải review ở nơi phát hành.

## 2. Đổi sang review ở repo kit thì kết quả có tương đương không

### 2.1 Phần tương đương: code của kit

Cùng agent, cùng effort, cùng code thì sẽ ra cùng loại finding cho phần logic của kit. Xét 5 finding của PR #74 (cả `reviewer` và `security`):

| Finding | Nằm ở | Review ở repo kit có thấy không |
|---|---|---|
| gh-guard để lọt lệnh tìm khóa riêng (`PEM_HEADER`, Medium) | code kit (#299) | Có |
| Relay `PR events` chọn nhầm PR của fork (Low) | code kit (#303) | Có |
| `relayedPull` tải `/pulls` hai lần (Low) | code kit (#303) | Có |
| `pr-events.yml` chưa có trên `main` và `release/*` (Low) | kit, nhưng chỉ đáng kể với dự án đã có nhánh release | Có thể thấy dạng chung ("dự án có nhánh release cần chép workflow lên đó"), nhưng không thấy `shop` đang có `release/v0.1.0`…`v0.3.0` |
| Ngoại lệ audit GHSA-fc5q-39xc-vjpf chưa ghi trên Jira, mô tả PR cũ (Medium, Low) | riêng của `shop` | Không: ngoại lệ chỉ có ở `shop` |

Các finding quan trọng nhất về bảo mật đều nằm trong code kit, nên review ở repo kit bắt được. Review sớm ở repo kit còn lợi hơn: lỗi gh-guard đã có từ #299 (15/11) mà tới 18/11 mới bị phát hiện. Trong ba ngày đó, máy bạn chạy agent với hook bị nới lỏng.

### 2.2 Phần không tương đương: ghép kit vào dự án

Review ở repo kit không thấy những thứ chỉ dự án mới có:
- phần riêng mà dự án giữ lại hay thêm khi chép: job CI riêng, ngoại lệ audit, `project.yaml`, skill của stack;
- trạng thái thật của dự án: nhánh nào đang mở, secret nào, ruleset nào, repo public hay private.

Ở PR #74, 2 trên 5 finding thuộc loại này. Đây không phải lỗi của kit, nhưng là rủi ro thật cho dự án.

### 2.3 Phần phải xây thêm để đổi

1. **Repo kit có quy trình review:**
   - cài App `ao-review`;
   - có lệnh review cho repo kit, vì `ao-step review` hiện cần item Jira và `project.yaml`;
   - ruleset trên `main` bắt báo cáo review và approval của bạn.
2. **Bản phát hành có tag** (như `kit-v0.4.0`). Review gồm:
   - review đầy đủ phần đổi so với tag trước (`reviewer` `xhigh`, `security` `max`);
   - không review từng PR nhỏ, để giữ chi phí khoảng 8 USD cho mỗi bản.
3. **Gốc tin cậy mới cho `kit-copy-review`:** cho `Kit review:` trỏ được tới một tag của repo kit, kèm báo cáo App `ao-review` trên PR phát hành đó. Phần so byte (điều kiện 6–9 của spec) giữ nguyên.
4. **Review phần riêng của dự án**, khi PR chép kit có file ngoài nhóm "phải giống hệt" (như `ci.yml` có job riêng, ngoại lệ audit): một lượt `reviewer` ở `high` chỉ cho các file đó. Không có phần riêng thì không cần agent.
5. **Chỗ để phần riêng của dự án:** followup "Kit ghi đè job CI riêng" và "chỗ cho ngoại lệ audit của dự án". Khi phần riêng nằm ở file của dự án, PR chép kit đúng nghĩa chỉ còn file kit, và so byte là đủ.

### 2.4 Chi phí

| | Hiện nay | Sau khi đổi |
|---|---|---|
| Mỗi bản kit | 0 USD (không review ở repo kit) | Khoảng 8 USD, một lần |
| Mỗi lần chép vào một dự án | Khoảng 8 USD (lần đầu của bản kit đó) | 0 USD nếu chỉ có file kit; khoảng 1–2 USD nếu có phần riêng |
| Một bản kit, 3 dự án | Khoảng 8 USD (dự án 2 và 3 dùng lại bằng `Kit review:`) | Khoảng 8 USD, cộng phần riêng nếu có |
| Một bản kit, chỉ `shop` | Khoảng 8 USD | Khoảng 8 USD |

Tiền không giảm nhiều khi chỉ có một dự án. Cái được là:
- **thời điểm:** lỗi kit bị bắt trước khi tới máy và dự án nào;
- **mô hình đúng cho kit dùng chung:** người dùng kit chỉ kiểm khớp byte, không phải trả tiền review;
- **tách bạch:** review kit tìm lỗi của kit, review dự án tìm lỗi ghép nối.

## 3. Kết luận và đề xuất

1. **Lúc đầu chọn đúng với hoàn cảnh lúc đó:** repo kit chưa có review, công cụ và cổng kiểm chỉ chạy cho dự án, và cơ chế dùng lại review đã tránh được việc review lại ở các dự án sau.
2. **Đổi sang review ở repo kit thì tương đương cho code kit** (3 trên 5 finding của PR #74, gồm cả finding bảo mật nặng nhất) và bắt được sớm hơn. **Không tương đương cho phần ghép vào dự án**, nên vẫn cần một lượt nhẹ khi dự án có phần riêng.
3. **Đề xuất đưa vào C1 hoặc C2, làm theo thứ tự:**
   1. chỗ cho phần riêng của dự án;
   2. review ở repo kit theo bản phát hành có tag;
   3. `Kit review:` trỏ được tới tag kit;
   4. review nhẹ phần riêng của dự án.

   Trước khi làm, cần bạn duyệt spec.
4. **Trong lúc chờ:** gộp nhiều bản sửa kit vào một lần chép (như đợt gh-guard và relay sắp tới), để mỗi đợt chỉ tốn một lượt review.

## Nguồn

- [SPEC-kit-copy-review.md](../../SPEC-kit-copy-review.md), mục 1, 2.1, 2.2 (gốc tin cậy), 9.
- [docs/quality-gates.md](../../docs/quality-gates.md), mục `/ao-review` cho PR chép kit (dòng `Kit copy of:`, `AO_KIT_PEERS`).
- Review của `shop` PR #74: `shop/.ai/reviews/74-reviewer.md`, `74-security.md`; chi phí ở `shop/.ai/runs/SHOP-74/last.md`.
- Bài thử review mù 2026-11-07 (`max` và `high`): [tasks/archive/kit-copy-review/verification.md](../../tasks/archive/kit-copy-review/verification.md).
- [tasks/handoff-2026-11-16-followups.md](../../tasks/handoff-2026-11-16-followups.md): followup "Review kit một lần ở repo kit…", "Kit ghi đè job CI riêng", "chỗ cho ngoại lệ audit".

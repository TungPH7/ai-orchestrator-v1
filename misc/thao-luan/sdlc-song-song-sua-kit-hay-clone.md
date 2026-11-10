# Concern 2: chạy nhiều luồng SDLC song song, sửa kit hay clone

Phiên 27 · Lượt 96, 2026-11-10. Câu trả lời dựa trên mã kit ở `main` (`613c7bc`). Phân tích gốc ở [thao-luan-sdlc-song-song.md](../thao-luan-sdlc-song-song.md) (2026-11-03, kit `f4e1a91`); file này không chép lại phân tích đó. Nhãn: **[Inference]** là suy luận chưa chạy thử, **[Ước]** là con số ước.

## Câu hỏi

> Thảo luận tiếp các câu hỏi, concern bên dưới. Các mở rộng bên dưới nên sửa kit hiện tại hay clone ra 1 bản mới.
> ## 2. chạy nhiều luồng SDLC song song
> Đọc D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\ai-orchestrator\misc\thao-luan-sdlc-song-song.md nhé

## Trả lời: sửa kit hiện tại, không clone

1. **Chỉ thay lớp chạy agent.** Phần cần sửa nằm ở `scripts/ao-step.mjs` và `lib/workflow/runner.mjs`: khóa chạy, checkout và vòng chạy. Phần còn lại giữ nguyên:
   - contract, guard và WIP;
   - `decideStep`, Jira, các gate;
   - merge-gate, audit, deployer.

   Clone thì phải nhân đôi toàn bộ kit chỉ để sửa một phần nhỏ.
2. **Việc này đã nằm trong lộ trình của chính kit này.** `orchestrator-cli` ở Cấp 2 là bộ điều phối (`SPEC.md:115`), và `workflow-engine` ở Cấp 3 có mục "chạy nhiều agent song song" (`SPEC.md:117`).
3. **Làm thành chế độ bật được.** Thêm một trần số lượt chạy cùng lúc, mặc định là 1. Với mặc định đó, kit chạy y như bây giờ: mỗi lúc một agent, hợp với hạn mức gói Pro. Nâng lên 2 là quyết định của bạn cho từng dự án.
4. **Đã có sẵn một phần nền.** Kit đã biết thêm và gỡ worktree, và WIP đã nằm trong contract.

Nếu muốn thử mà không đụng tới bản đang chạy, dùng một nhánh dài hạn hoặc cờ cấu hình, không cần một repo thứ hai.

## Từ 2026-11-03 tới nay

| Phần | Trạng thái | Chỗ trong mã |
|---|---|---|
| Review chạy trong worktree ở head của PR | Đã có (Pilot 1, T10) | `lib/workflow/steps.mjs:381`, `scripts/ao-step.mjs:383` |
| QA và regression chạy trong worktree có cài package | Đã có (Pilot 2) | `lib/workflow/steps.mjs:520`, `:609` |
| `reviewer` chạy song song với `security` | Chưa: vẫn chạy lần lượt | `lib/workflow/runner.mjs` |
| Build và fix, mỗi item một worktree | Chưa: vẫn chuyển cả checkout sang nhánh của item | `prepareCheckout`, `scripts/ao-step.mjs:355` |
| Khóa theo item, cộng trần số lượt chạy | Chưa: một khóa cho cả project, "agents run one at a time" | `scripts/ao-step.mjs:187` |
| Bộ điều phối đọc board rồi mở lượt chạy | Chưa: đây là `orchestrator-cli` | `SPEC.md:115` |
| WIP tính theo số chỗ của mỗi vai trò | Chưa | `contract/policies.yaml:9` |

## Liên quan tới concern 1

- **`project-scaffold` nên dọn đường cho chạy song song.** Mỗi app lấy cổng từ biến môi trường, và profile khai lệnh cài package. Không có hai điều này, hai worktree sẽ giành nhau cổng 3000 và 3001 khi chạy dev server và E2E.
- **Mỗi worktree tự chạy `npm ci`, không dùng junction tới `node_modules`.** Bài học cũ: `gh pr merge --delete-branch` từng xóa một worktree và làm rỗng `node_modules` chính qua junction. Gradle và NuGet dùng cache chung trong thư mục người dùng nên không vướng chuyện này. [Inference]
- **`multi-repo`:** khi có hai repo, một item cần worktree ở cả hai repo, và khóa của item phải phủ cả hai.

## Thứ tự đề xuất

Thứ tự này sửa lại thứ tự ở concern 1: chạy song song được đặt trước `multi-repo`.

1. **`reviewer` song song với `security`:** sửa nhỏ, làm lúc nào cũng được. [Ước] Mỗi PR bớt khoảng 10 phút.
2. **`project-scaffold` và pilot Spring Boot** (concern 1). Scaffold cho mỗi app lấy cổng từ biến môi trường.
3. **Lớp chạy song song, làm phần đầu của `orchestrator-cli`:** worktree theo item, khóa theo item, trần số lượt chạy (mặc định 1), bộ điều phối, WIP theo số chỗ.
4. **`multi-repo`:** chỉ làm khi có một dự án thật cần hai repo, như đã chốt ngày 2026-10-26.

Lý do xếp bước 3 trước bước 4: chạy song song rút ngắn thời gian cho mọi dự án ngay từ đầu, còn `multi-repo` chỉ cần khi có dự án dùng hai repo.

Hai giới hạn của bản phân tích gốc vẫn đúng:
- chạy song song chỉ rút ngắn thời gian, không giảm chi phí, và làm hạn mức gói hết nhanh hơn;
- bạn vẫn là nút cổ chai ở các cổng duyệt.

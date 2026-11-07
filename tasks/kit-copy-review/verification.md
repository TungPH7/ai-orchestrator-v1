# Kiểm chứng: kit-copy-review

## Bài thử review, 2026-11-07

**Câu hỏi:** hạ effort của `security` hay dùng công cụ review khác có đánh đổi chất lượng không?

**Cách làm:** chạy lại `security` trên 3 head của `ao-sample` đã biết đáp án: `d049513` (PR #6), `9906b02` và `40130f9` (PR #13). Đáp án là 6 lỗi Medium trở lên do `security` ở `max` tìm ra.

- Prompt và file agent lấy đúng thời điểm đó, vì prompt hiện tại đã chứa bài học từ chính các lỗi này. Gói bối cảnh dựng lại từ log của lượt cũ.
- Mỗi lượt chạy trong repo tạm chỉ có lịch sử tới head đó, không có token, không có login `gh`, không có MCP. `ao-pr.mjs` được thay bằng bản chỉ lưu file.
- Báo cáo được xáo và đổi tên trước khi chấm, điểm được lưu trước khi mở khóa.
- Số review trên PR #6 và #13 không đổi sau bài thử (3 và 7).

| Lỗi đã biết | `max` | Opus `high` | Sonnet `high` | `open-code-review` |
|---|---|---|---|---|
| Văn bản không tin cậy trong gói bối cảnh | Medium | Medium | Low, một phần | Low |
| Tài liệu Epic đọc ở head của PR | Medium | Low | không | không |
| PR tự lái review qua worktree | High | High | Low | Medium |
| Base của PR không được kiểm | Medium | High | không | không, xét rồi bỏ qua |
| `AGENTS.md` của PR vẫn lái được review | High | không, 2 lượt | không, 2 lượt | không |
| `ao-step` chạy từ checkout của PR | Medium | không, 2 lượt | không, 2 lượt | không |
| **Tìm ra** | 6/6 | 4/6 | 2/6 | 2/6 |

| Lượt | USD | Turn | Phút |
|---|---|---|---|
| `d049513` `max` (bản gốc) | 4,33 | 48 | 16 |
| `9906b02` `max` (bản gốc) | 7,20 | 51 | 26 |
| `40130f9` `max` (bản gốc) | 7,92 | 62 | 29 |
| `d049513` Opus `high` | 1,24 | 12 | 5,0 |
| `9906b02` Opus `high` | 2,05 | 36 | 8,8 |
| `40130f9` Opus `high`, lượt 1 | 1,74 | 23 | 8,3 |
| `40130f9` Opus `high`, lượt 2 | 1,76 | 28 | 7,5 |
| `d049513` Sonnet `high` | 0,27 | 11 | 1,6 |
| `9906b02` Sonnet `high` | 0,40 | 12 | 2,6 |
| `40130f9` Sonnet `high`, lượt 1 | 0,56 | 12 | 3,6 |
| `40130f9` Sonnet `high`, lượt 2 | 0,52 | 12 | 3,2 |
| `d049513` `open-code-review` | 1,60 | 19 | 6,6 |
| `9906b02` `open-code-review` | 1,90 | 25 | 8,0 |
| `40130f9` `open-code-review` | 1,99 | 23 | 8,8 |

Tổng chi phí bài thử khoảng 17,3 USD [Ước tính], trong đó khoảng 3 USD mất ở ba lượt bị dừng vì máy thiếu RAM.

**Kết luận:**

- `max` tìm ra lỗi `AGENTS.md` bằng cách đi ra ngoài diff: nó đọc `claude.exe` để xem CLI nạp file chỉ dẫn nào, rồi thử thật. Cả 4 lượt `high` trên head đó đều không nghĩ tới hướng này và đều đề xuất Approve.
- Hai lượt `high` không thay được một lượt `max` trên head này.
- `open-code-review` ở Delegation Mode không rẻ hơn prompt của kit, và tự bỏ qua file `.md`, tức prompt của agent. Mức giảm 5–15 lần trong [paper của nhóm tác giả](https://arxiv.org/html/2608.09290v2) đo pipeline riêng của công cụ, cần API key. Bộ chạy thử để `ocr` ngoài PATH nên phương án này mất thêm vài turn; phần đội đó không đổi kết luận.
- `max` không bao trùm mọi thứ. Lượt `open-code-review` tìm ra lỗi review chạy tiếp bị mất worktree, thứ mà `reviewer` và `security` trên PR #13 bỏ sót, và sau đó thành lỗi High ở `ao-pilot` PR #23. Công lao có lẽ thuộc về góc nhìn khác của prompt hơn là công cụ.

**Giới hạn:** 3 head, tối đa 2 lượt mỗi phương án. `max` không được chạy lại, nên chưa biết lần sau nó có tìm lại lỗi `AGENTS.md` không. Đáp án lấy từ chính các lượt `max` nên có lợi cho `max`. Chấm mù chỉ thật sự mù giữa Opus và Sonnet, vì báo cáo của `open-code-review` nhận ra được qua định dạng. Một người chấm.

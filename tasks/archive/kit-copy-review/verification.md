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

## T7: review đầy đủ bản kit ở `ao-pilot`, 2026-11-07

`DEMO-31`, `ao-pilot` PR #24. Claude chép kit dưới tên bot `ao-dev`, như `DEMO-30`. `reviewer` ở `xhigh`, `security` ở `max` vì PR chạm đường dẫn được bảo vệ.

| Lượt | Head | Kết quả | USD | Turn | Phút |
|---|---|---|---|---|---|
| `reviewer` toàn PR | `6f3b293` (kit `c80b480`) | 1 High, 3 Medium, 3 Low | 2,48 | 43 | 9 |
| `security` toàn PR, `max` | `6f3b293` | 1 High, 3 Medium, 2 Low | 5,30 | 41 | 21 |
| `reviewer` toàn PR | `1194b95` (kit `0edf8df`) | 4 Low, đề xuất Approve | 2,69 | 46 | 10 |
| `security` phần mới, `max`, dừng một lần vì hết hạn mức 5 giờ rồi chạy tiếp trong phiên cũ | `1194b95` | High cũ đã sửa, 1 Low | 5,13 | 61 | 22 |
| **Tổng** | | | **15,59** | | |

- **Lỗi High, cả hai role cùng tìm ra:** `render-agents --check` chỉ so các file nó dựng, nên PR thêm `.claude/agents/helper.md` (một subagent với tool và prompt tùy ý) vẫn được nhận. Sửa ở kit PR #230: file trong nhóm render phải là file thường, đúng các file `render-agents.mjs --list` kể ra, và bước dựng luôn chạy. Phần sửa đầu tiên, chỉ so tên với dự án tham chiếu, chưa đủ; `security` chỉ ra điều này.
- **Medium:** danh sách `GET /pulls/{n}/files` dừng ở 3000 file và đọc theo số PR, nay thay bằng so cây git theo SHA; báo cáo của `ao-step` xóa được finding High còn mở, nay PR còn finding mở thì đi đường agent; PR xóa skill riêng của dự án vẫn được nhận; câu prompt mới chưa nói cách thử an toàn.
- `security` lượt hai thử lại: thêm `helper.md`, `extra/0001.txt`, symlink, mode 755, submodule, `.claude/Agents/`, `.claude/rules/evil.md` đều bị từ chối.
- Bạn merge PR #24 (`11ef334`). Deployer đưa `11ef334` lên Development: `success`, nên `audit` qua.
- **Sự cố:** `gh pr merge 230 --delete-branch` gỡ worktree `ao-kit-fix`, nơi giữ nhánh của PR. `node_modules` của worktree là junction tới `node_modules` của kit, và việc gỡ đã làm trống thư mục đó. Credential helper của kit hỏng (`Cannot find package 'ajv'`), nên push của bot thất bại. `npm ci` cài lại; code và lịch sử git không bị ảnh hưởng.

## T8: chép cùng bản kit vào `ao-sample`, 2026-11-07

`SMP-16`, `ao-sample` PR #14, dòng `Kit review: TungPH7/ao-pilot#24`. `ao-step` chạy từ kit bằng `AO_KIT_DIR`, với `AO_KIT_PEERS=TungPH7/ao-pilot` qua biến môi trường.

| Bước | Head | Kết quả |
|---|---|---|
| Chạy thử `/ao-review 14` | `1285159` | `kit-copy-reports`: so 169 file khớp, dựng lại 11 file render khớp, worktree tạm đã dọn |
| Đổi một byte trong `kit-copy.mjs` | `2e96813` | `Kit review: .ai-orchestrator/lib/workflow/kit-copy.mjs differs from TungPH7/ao-pilot#24, so the agents review the PR`; không chạy `--go`, nên không agent nào chạy |
| Trả lại byte đó | `ad19fb7` | Cây giống commit đầu; `kit-copy-reports` |
| `/ao-review 14 --go` | `ad19fb7` | Hai báo cáo `reviewer`, `security` của App `ao-review`, dòng `Kit copy of: TungPH7/ao-pilot#24 at 1194b95…`. 0 USD |
| `merge-gate --dry-run` | `ad19fb7` | Chỉ còn thiếu approve của bạn |

Bạn merge PR #14 (`22a0213`). Lần chép kit trước vào `ao-sample` (PR #13) tốn khoảng 20 USD cho ba vòng review.

## Tiêu chí của spec mục 7

| Tiêu chí | Kết quả |
|---|---|
| 1. Năm lệnh kiểm của kit xanh | Đạt: 1111 test, `validate`, `render:check`, `jira:checklist:check`, `agents:check` |
| 2. Ba lỗi ở 2.7 có test và đã sửa | Đạt: kit PR #225, test đỏ trước |
| 3. Bản kit mới vào `ao-pilot` qua review đầy đủ ở `max` | Đạt: PR #24, bạn merge |
| 4. Bản đó vào `ao-sample` không gọi agent | Đạt: PR #14, 0 USD |
| 5. Sai một byte thì in lý do, không đăng báo cáo | Đạt: head `2e96813` |
| 6. `audit` qua commit merge của PR ở tiêu chí 4 | Chờ Pilot 2, khi `ao-sample` có trên VPS. `audit` đã qua commit merge của PR #24 ở `ao-pilot` |

## Để lại

Các finding Low của lượt review thứ hai. Sửa ở một PR kit sau; bản kit đó sẽ được review đầy đủ ở dự án đầu tiên nhận nó.

1. Kiểm "bản kit mới nhất" chỉ nhìn `.ai-orchestrator/lib`: một bản kit chỉ đổi prompt, template hay hook không dịch mốc này, nên một bản chép vẫn quay về được bản cũ hơn. Nên so cây tham chiếu với `develop` hiện tại của dự án kia trên nhóm "phải giống hệt".
2. Câu prompt mới của `security` bảo chạy CLI với `--setting-sources user`; khi đó CLI không nạp file nào của project, nên phép thử luôn kết luận là vô hại. Thư mục nháp chỉ có file do agent tự viết, nên chạy với nguồn `project` vẫn an toàn.
3. Số file trong báo cáo của `ao-step` đếm gộp 11 file render, vốn không so với dự án kia.
4. `/ao-fix` bỏ qua một ghi chú đã làm mà không in dòng nào báo.
5. `AO_KIT_PEERS` chưa nằm trong `.claude/settings.json` của hai dự án.

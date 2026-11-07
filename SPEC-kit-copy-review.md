# SPEC: kit-copy-review

Trạng thái: hoàn thành 2026-11-07 (Phiên 27 · Lượt 72); đã duyệt ở Lượt 67. Chen trước Pilot 2 theo yêu cầu ở Phiên 27. Thứ tự: `kit-copy-review` → Pilot 2 → `project-scaffold`.

Spec này sửa mục 2.6 của [`SPEC-dev-workflow.md`](SPEC-dev-workflow.md) ở một điểm: `/ao-review` có thêm một nhánh cho PR chép kit. Nó không đổi luật của `merge-gate` và `audit`.

## 1. Mục tiêu

Review PR chép kit đang tốn nhiều mà tốn sai chỗ: cùng một code kit bị review lại ở mỗi dự án. Module này làm ba việc:

1. Mỗi bản kit chỉ được agent review đầy đủ một lần. Bản chép giống hệt ở dự án khác dùng lại kết quả đó, không gọi agent.
2. Giữ nguyên `max` cho `security` ở lượt review đầy đủ, và thêm các ý từ checklist Cloudflare vào prompt của nó.
3. Sửa ba lỗi kit mà bài thử review tìm ra.

### Bài thử làm cơ sở

Thử mù ngày 2026-11-07 trên 3 head của `ao-sample`, so với 6 lỗi Medium trở lên mà `security` ở `max` từng tìm ra. Chi tiết ở `tasks/archive/kit-copy-review/verification.md`.

| Phương án | USD (3 head) | Phút | Tìm ra |
|---|---|---|---|
| `max` (bản gốc) | 19,45 | 71 | 6/6 (đáp án lấy từ chính các lượt này) |
| Opus `high` | 5,04 | 22 | 4/6 |
| Sonnet `high` | 1,22 | 8 | 2/6, đều ở mức thấp hơn |
| `open-code-review`, Delegation Mode, Opus `high` | 5,49 | 23 | 2/6 |

Ở head `40130f9`, cả 4 lượt `high` (2 Opus, 2 Sonnet) đều bỏ sót lỗi High về `AGENTS.md` và đều đề xuất Approve. Vì vậy module này không hạ effort của lượt review đầy đủ, và không dùng `open-code-review`.

## 2. Thiết kế

### 2.1 Luồng

`/ao-review <PR>` chạy như cũ cho tới trước khi gọi agent. Tới đó, nếu mô tả PR có dòng `Kit review:`, `ao-step` kiểm PR theo 2.2:

- **Đạt:** `ao-step` đăng hai báo cáo `reviewer` và `security` bằng App `ao-review` (2.4). Không agent nào chạy, chi phí 0 USD. Lệnh dừng ở câu quen thuộc: PR chờ bạn ở gate ③.
- **Không đạt:** `ao-step` in lý do, rồi review bằng agent như thường, ở đúng effort cũ.

Không có dòng `Kit review:` thì không có gì đổi. Mọi nhánh lỗi, kể cả lỗi mạng, đều rơi về review bằng agent.

Gate ③ giữ nguyên: PR chép kit chạm đường dẫn được bảo vệ, nên bạn vẫn đọc, approve và tự merge.

### 2.2 Điều kiện

Mô tả PR có một dòng riêng, trỏ tới PR đã được review đầy đủ ở dự án khác:

```text
Kit review: TungPH7/ao-pilot#24
```

Dòng này chỉ là lời khai. `ao-step` tự kiểm tất cả, ở đúng head nó đọc đầu tiên:

1. Repo của PR tham chiếu nằm trong `AO_KIT_PEERS`.
2. PR tham chiếu đã merge vào nhánh được bảo vệ, do một login của `AO_APPROVERS` merge.
3. Head của nó có đủ báo cáo `reviewer` và `security` của App `ao-review`, không còn Critical hay High mở. Luật này dùng lại `reportGaps` của `merge-gate`.
4. Hai báo cáo đó do agent viết: không có dòng `Kit copy of:`. Nhờ vậy không có chuỗi tham chiếu, bản nào cũng trỏ thẳng về một lượt review thật.
5. Nó là PR mới nhất trên `develop` của repo đó đổi `.ai-orchestrator/lib/`, dù nó merge vào nhánh nào. Điều này chặn việc chép ngược về một bản cũ đã được review nhưng có lỗi.
6. Mọi file PR đổi đều nằm trong đường dẫn kit (2.3), và khớp mode cùng blob với head của PR tham chiếu. File bị xóa cũng phải không có ở đó, trừ skill: PR xóa một skill thì quay về review thường, vì skill chỉ dự án này có cũng vắng ở bên kia. `ao-step` tính file PR đổi bằng cách so cây git của merge base với cây của head, theo SHA, không dùng `GET /pulls/{n}/files`, vì danh sách đó dừng ở 3000 file và được đọc theo số PR (review của `ao-pilot` PR #24).
7. Sau PR, mọi file trong nhóm "phải giống hệt" khớp head tham chiếu theo cả hai chiều. Như vậy không chép được một phần, và không có file lạ nằm thêm.
8. Các file render lại (2.3) là file thường, đúng là các file `render-agents.mjs --list` kể ra, và khớp với bản dựng từ nguồn ở head của PR. Bước dựng luôn chạy, kể cả khi PR không đổi file render.
9. Cây git của hai head và của merge base đọc được đầy đủ, không bị `truncated`.
10. PR đang mở, CI xanh, và không còn finding Critical hay High mở từ các báo cáo trước. Báo cáo của `ao-step` là báo cáo đầy đủ, nên nó sẽ xóa các finding đó; chúng phải đi qua `/ao-fix` và review phần mới như mọi PR (review của `ao-pilot` PR #24).

Gốc tin cậy là **head đã được review và merge**, không phải commit của repo kit. Đề xuất ban đầu ở Phiên 27 dùng repo kit, nhưng commit kit chưa từng được agent review: kit tự merge chỉ với CI. Head tham chiếu chứng minh đúng điều cần chứng minh, và mọi bằng chứng đã có sẵn trên GitHub, nên không cần sổ ghi riêng.

### 2.3 Nhóm file

Khai ở `quality/gates.yaml`, khối mới `kit_copy`:

| Nhóm | Đường dẫn | Luật |
|---|---|---|
| Phải giống hệt | `.ai-orchestrator/{agents,contract,docs,lib,quality,scripts,templates,tracker}/**`, `.ai-orchestrator/package*.json`, `.claude/hooks/**`, `.githooks/**`, `.mcp.json`, `.jira/config.yml`, ba workflow `ci.yml`, `jira-sync.yml`, `merge-gate.yml` | Khớp hai chiều |
| Giống khi PR đổi | `.claude/skills/**` | File PR đổi phải khớp. Skill theo stack chỉ có ở một dự án thì được giữ |
| Render lại | `.claude/agents/**`, `.claude/rules/ai-orchestrator.md` | Đúng tập file `render-agents` viết; dựng lại rồi so nội dung |
| Của dự án | `.claude/settings.json`, `.ai-orchestrator/deploy.yaml`, `.ai-orchestrator/roster.local.yaml` | PR chép kit không được đổi. Đổi thì rơi về review thường |

File render lại khác nhau giữa các dự án vì chứa mã space Jira và skill theo stack, nên không so byte với dự án khác được. `ao-step` lấy cây của head vào thư mục tạm, không cho agent nào đọc, rồi chạy `render-agents.mjs --check --project <thư mục>` **của kit đang chạy `ao-step`**. `render-agents.mjs --check` chỉ so các file nó dựng, nên một file thêm vào cạnh chúng không bị nó thấy. Vì vậy bước 8 so thêm tập file render ở head với danh sách `render-agents.mjs --list` in ra: file nào ngoài danh sách thì quay về review thường (review của `ao-pilot` PR #24). So tên với dự án tham chiếu là chưa đủ, vì một file thừa có ở cả hai bên vẫn không được ai đọc. Nguồn của render đã được kiểm ở bước 6 và 7, nên đúng tập file cộng bản dựng khớp mới nghĩa là chỉ dẫn của agent không bị chèn gì thêm.

### 2.4 Báo cáo

`ao-step` viết báo cáo theo template, một bản cho mỗi role:

```markdown
# Review: <tiêu đề PR> (<KEY>)

Role: security
Kit copy of: TungPH7/ao-pilot#24 at <head đầy đủ>

## Context
Không agent nào đọc PR này. ao-step so N file với head trên, nơi reviewer và security đã review đầy đủ. ...

## Findings
| Severity | Axis | Where | Finding | Fix |
|---|---|---|---|---|

## Verdict
...
```

`merge-gate` và `audit` đọc báo cáo này như mọi báo cáo khác, nên hai luật đó không đổi, và không phải cập nhật kit trên VPS.

Báo cáo đăng với `commit_id` là **đúng head đã kiểm**. `lib/quality/ao-pr.mjs` hiện đọc lại head ngay lúc đăng, nên một push chen vào giữa sẽ gắn báo cáo lên code chưa kiểm. Việc đăng này dùng hàm riêng, nhận SHA đã kiểm. Head đổi sau đó thì báo cáo không còn nằm trên head, và `merge-gate` đòi kiểm lại.

### 2.5 Cấu hình

`AO_KIT_PEERS`: danh sách repo tham chiếu, cách nhau bằng dấu phẩy, ví dụ `TungPH7/ao-pilot,TungPH7/ao-sample`. Giá trị lấy theo cách của các biến `AO_*` khác: biến môi trường trước, rồi khối `env` của `.claude/settings.json`. Vì `.claude/**` là đường dẫn được bảo vệ, và `/ao-review` chạy trên nhánh được bảo vệ, PR không tự thêm repo cho mình được.

`ao-step` đọc repo tham chiếu bằng login GitHub của bạn, vì cả ba repo đều private. App không cần thêm quyền nào.

### 2.6 Prompt của `security`

Thêm khoảng 8–10 dòng vào `agents/prompts/security.md`, lấy ý từ [`AI-AND-LLM.md`](https://github.com/cloudflare/security-audit-skill/blob/main/skills/security-audit/AI-AND-LLM.md) và [`SUPPLY-CHAIN-AND-RELEASE.md`](https://github.com/cloudflare/security-audit-skill/blob/main/skills/security-audit/SUPPLY-CHAIN-AND-RELEASE.md) (MIT):

- Prompt chặn không phải ranh giới an ninh; chỉ tính kiểm tra tất định.
- Văn bản không tin cậy có giả được nguồn gốc khi lắp prompt không.
- Thứ được duyệt có đúng là thứ sẽ chạy không, kể cả ở lượt chạy lại, chạy tiếp và lượt ủy quyền.
- Một workspace có độ tin cậy thấp có đổ vào bước có độ tin cậy cao không.
- Checksum lấy cùng nơi với file không chứng minh gì; phải chỉ ra gốc tin cậy.

Thêm một ý từ bài thử: khi PR đổi thứ lái agent, đừng dừng ở đọc diff, hãy kiểm công cụ thật sự nạp gì. Đó là cách `max` tìm ra lỗi `AGENTS.md`. Review của `ao-pilot` PR #24 thêm điều kiện: chỉ thử bằng file đánh dấu tự viết trong thư mục tạm ngoài dự án và worktree, chạy CLI với `--setting-sources user`, và không bao giờ nạp, chạy hay chép file chỉ dẫn, settings, hook hay script của PR.

### 2.7 Ba lỗi kit

Sửa theo kiểu test trước:

1. **`lib/workflow/steps.mjs`, `decideFix`:** chỉ so ghi chú với lượt fix mới nhất, nên một lượt fix sau đó không có ghi chú làm `/ao-fix <PR> <note>` gửi lại ghi chú đã xong.
2. **`carryOn`:** lượt fix chạy tiếp bị mất `head` và `note`.
3. **`quality/gates.yaml`, `security_review`:** so glob phân biệt hoa thường, nên `AuthProvider.tsx` và `useAuth.ts` tụt xuống `high`. Danh sách cũng thiếu `docker-compose.yaml`, `compose*.yml`, `.npmrc`, `proxy.*`, `pnpm-lock.yaml`, `yarn.lock`.

Hai lỗi đầu mình mới đọc code, test đỏ sẽ xác nhận trước khi sửa.

## 3. Lệnh

Không có lệnh mới. Người chép kit chỉ thêm dòng `Kit review:` vào mô tả PR, rồi chạy `/ao-review <PR>` như cũ.

## 4. Cấu trúc

```text
lib/workflow/kit-copy.mjs        # decideKitCopy và bản báo cáo: thuần, không đọc mạng
lib/workflow/facts.mjs           # đọc cây của hai head, PR tham chiếu và các review của nó
lib/workflow/steps.mjs           # decideReview: nhánh kit copy, lỗi 1 và 2
scripts/ao-step.mjs              # dựng lại file render, đăng báo cáo bằng App
quality/gates.yaml, schema       # khối kit_copy, lỗi 3
agents/prompts/security.md       # 2.6
docs/quality-gates.md, docs/dev-workflow.md, docs/release-workflow.md, README.md
tests/                           # test của từng phần trên
tasks/archive/kit-copy-review/   # plan, todo, verification
```

## 5. Chiến lược test

Test trước, bằng `node:test`, theo mẫu của `decideReview` và `decideAudit`. `decideKitCopy` có một test cho mỗi điều kiện ở 2.2, cả nhánh đạt và nhánh không đạt, gồm: file lạ ngoài đường dẫn kit, blob khác, mode khác, file bị xóa, file thừa, chép một phần, chép ngược bản cũ, báo cáo tham chiếu còn High, chuỗi tham chiếu, repo ngoài danh sách, cây bị cắt, lỗi mạng rơi về review thường. Một test khẳng định `merge-gate` và `audit` chấp nhận báo cáo do `ao-step` viết.

## 6. Ranh giới

**Luôn làm:** rơi về review bằng agent khi có bất kỳ nghi ngờ nào; đăng báo cáo trên đúng head đã kiểm; để gate ③ cho bạn.

**Hỏi trước:** mọi thay đổi luật của `merge-gate` và `audit`; chạy thêm lượt review trả tiền ngoài các lượt của tiêu chí 3.

**Không làm:** hạ effort của lượt review đầy đủ; dùng `open-code-review`; cho agent chạy phần kiểm này; đổi kit trên VPS.

## 7. Tiêu chí hoàn thành

1. Năm lệnh kiểm của kit xanh.
2. Ba lỗi ở 2.7 có test và đã sửa.
3. Bản kit mới vào `ao-pilot` qua PR được review đầy đủ, ở `max`. Bạn merge.
4. Bản đó vào `ao-sample` qua PR có dòng `Kit review:`. `/ao-review` đăng hai báo cáo, không gọi agent, 0 USD. `merge-gate` thấy đủ báo cáo. `develop` của `ao-sample` chưa có code so byte, nên lần kiểm này chạy `ao-step` từ kit bằng `AO_KIT_DIR`. Khi dùng bình thường, `/ao-review` chạy bản chép kit của dự án, nên lần chép đầu tiên mang code này vào một dự án vẫn do kit cũ quyết định và được review đầy đủ.
5. Thử một PR có một byte khác: `/ao-review` in lý do và không đăng báo cáo. Lượt thử này dừng trước khi gọi agent.
6. `audit` qua được commit merge của PR ở tiêu chí 4. Kiểm ở Pilot 2, khi `ao-sample` đã có trên VPS.

## 8. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Báo cáo do script viết nhưng mang `Role: security`, `audit` không phân biệt được | Dòng `Kit copy of:` nói rõ, và bạn đọc ở gate ③. Muốn `audit` phân biệt thì phải đổi luật, spec này không làm |
| Một lỗi lọt qua lượt review tham chiếu thì lan sang mọi dự án | Hôm nay cũng vậy nếu lượt review lặp lại cũng bỏ sót, nhưng mất đi cơ hội lượt sau tình cờ tìm ra. Đây là đánh đổi có chủ đích |
| Hai dự án lệch nhau ở một file trong nhóm "phải giống hệt" | Rơi về review thường, tốn tiền chứ không mất an toàn. `ao-step` in tên file |
| Mất lớp review khi kit tự merge chỉ với CI | Không đổi: lượt review đầy đủ đầu tiên vẫn là lần agent đọc code kit |

## 9. Câu hỏi đã trả lời

1. **Có đổi luật `audit` không?** Không. Đề xuất ban đầu cần đổi, nhưng báo cáo do `ao-step` đăng làm được cùng việc mà giữ nguyên luật.
2. **Có hạ `max` xuống `high` không?** Không, theo bài thử.
3. **Lượt review phần mới có hạ xuống `high` không?** Chưa. Bài thử không đo trường hợp này.
4. **Thu nhỏ gói bối cảnh, đưa báo cáo `reviewer` cho `security`?** Để sau, chưa có số đo.

## Nguồn

- Bài thử: `tasks/archive/kit-copy-review/verification.md`, Phiên 27.
- [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill), MIT.
- [OpenCodeReview, arXiv 2608.09290](https://arxiv.org/html/2608.09290v2).

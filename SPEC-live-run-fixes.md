# SPEC: live-run-fixes

> **Trạng thái:** chờ duyệt. Bạn chọn làm module này trước B1 ở Phiên 27 · Lượt 148. Nguồn: mục T19 và T20 trong [tasks/archive/human-loop/verification.md](tasks/archive/human-loop/verification.md), và hai báo cáo review vòng hai của `ao-sample` PR #21 (`.ai/reviews/21-reviewer.md`, `21-security.md` trên máy).

## 1. Mục tiêu

Lần chạy thật của human-loop (T19, T20) để lại một số lỗi kit. Module này vá chúng trước khi Pilot 3 gặp lại:

1. Bốn trong năm lỗ hổng mà T20 tìm ra. Lỗ hổng thứ năm, hook Jira chặn nhầm, được giữ nguyên có chủ đích (2.3).
2. Hai Medium và ba Low mà vòng review thứ hai của PR #21 (T19) để lại.
3. Câu hỏi còn treo từ T19: `merge-gate` và `audit` có so đường dẫn được bảo vệ không phân biệt hoa thường không (2.9, cần bạn quyết).

Lỗ hổng 1 và 2 chắc chắn gặp lại ở Pilot 3: gói Pro hay chạm giới hạn 5 giờ, và sửa AC trên PR là việc thường ngày.

## 2. Thiết kế

Mọi chỗ sửa đều làm theo kiểu test trước: test đỏ xác nhận lỗi, rồi mới sửa.

### 2.1 Phần làm dở khi lượt dừng giữa chừng (lỗ hổng 1)

**Hiện trạng.**
- Lượt chạm giới hạn 5 giờ thì `runner.mjs:173` dừng lệnh, và `ao-step.mjs:283` đưa thư mục về nhánh gốc bằng `prepareCheckout`.
- `prepareCheckout` (`ao-step.mjs:415`) từ chối khi có file chưa commit, nên thư mục ở lại nhánh của item.
- Lúc chạy lại, `checkoutStop` (`ao-step.mjs:109`) chặn `/ao-fix` và `/ao-review`. `/ao-build` thì vẫn chạy, nhưng lượt nào có `checkout` cũng bị `prepareCheckout` từ chối.
- Ở T20, mình phải tự cất phần dở của `fe-dev` vào stash. `fe-dev` tình cờ tìm thấy stash và áp lại.

**Cách sửa:**
- **Lúc dừng.** Một lượt chạy trên nhánh của item có thể kết thúc với `usage-limit` hoặc `unfinished` trong khi `ao-step` vẫn còn sống. Khi đó, nếu `git status --porcelain` không rỗng (tính cả file chưa track, không tính file bị ignore), `ao-step` sẽ:
  - chạy `git stash push --include-untracked -m "ao-step <KEY> run <n> <role>"`;
  - lấy SHA của entry, rồi ghi `wip: { stash, branch }` vào lượt đó trong `state.json`;
  - in một dòng báo: phần dở ở stash nào, và sẽ được áp lại khi lượt chạy tiếp.
- **Lúc chạy tiếp.** Khi lệnh sau chạy tiếp đúng session đó, `ao-step` làm theo thứ tự:
  1. Sau bước checkout của lượt, nếu thư mục chưa ở `wip.branch` thì switch sang nhánh đó.
  2. Chạy `git stash apply <sha>`.
  3. Áp được thì tìm entry theo SHA rồi xóa. Prompt chạy tiếp thêm một câu: phần chưa commit lúc dừng đã được cất rồi trả lại vào thư mục, nên kiểm `git status` trước khi làm tiếp.
  4. Áp không được thì dừng, không chạy agent, và in SHA để bạn tự xử lý.
- **Stash dùng chung** giữa mọi worktree của repo. Vì vậy `ao-step` chỉ áp và xóa theo SHA, không dùng `stash pop`, và không đoán vị trí `stash@{n}`.
- **Shell của `ao-step` bị tắt.** `ao-step` không tự cất trong trường hợp này, vì không chắc thay đổi là của agent. Câu dừng của `checkoutStop` nói thêm cách cất bằng tay.
- Phần git nằm trong `lib/workflow/wip.mjs`, nhận `git` như một tham số. `runGo` nhận thêm hiệu ứng `wip: { save, restore }`, theo mẫu các hiệu ứng khác.

### 2.2 Đổi tài liệu trên PR đang mở kéo theo plan và design (lỗ hổng 2)

**Hiện trạng.**
- `decideFix` (`steps.mjs:620`) chạy lượt đổi tài liệu (`ac-revise`, `api-revise`, `epic-revise`, `to-story`) trên nhánh của PR.
- Lượt đó có thể ghi `Cần sa:`, `Cần ux:` hay `Cần ba:` trên Epic. Các yêu cầu này chỉ được trả lời qua `/ao-request`.
- Ngoài giai đoạn spec và plan, `requestRun` (`steps.mjs:110`) checkout `develop`, còn prompt `request` (`prompts.mjs:22`) bảo agent chỉ làm trên Jira.
- Facts của `/ao-fix` và `/ao-build` không đọc comment của Epic.
- Lần làm lại sau `QA fail` cũng gặp lỗi này: `spec-sync` thêm AC12 vào `spec.md`, nhưng `plan.md` vẫn chỉ ghi AC1–AC11.

**Cách sửa:**
- Khi item có Epic cha, facts của `/ao-fix` và `/ao-build` đọc thêm các yêu cầu đang mở trên Epic đó.
- **Yêu cầu do lượt đổi tài liệu ghi** là yêu cầu thỏa cả ba điều:
  - đang mở;
  - gửi tới `ba`, `ux` hoặc `sa`, trên item hoặc trên Epic của nó;
  - viết sau lúc bắt đầu lượt đổi tài liệu gần nhất của item. Lượt đó là:
    - với `/ao-fix`: `ac-revise`, `api-revise`, `epic-revise` hay `to-story` của cùng ghi chú;
    - với `/ao-qa`: `ac-add`;
    - với lần làm lại: `spec-sync`.
- **`/ao-fix`:** sau lượt đổi tài liệu và trước dev agent, mỗi yêu cầu như vậy thành một lượt `request`, yêu cầu cũ chạy trước. Lượt này checkout nhánh của PR, và prompt cho agent commit trên nhánh đó rồi push, để PR #N hiện thay đổi.
- **Lần làm lại:** các lượt `request` chạy trên nhánh `-rN`, ngay sau `spec-sync`; không có `spec-sync` thì chạy trước dev agent. Prompt cho agent commit rồi push lên nhánh đó.
- Mọi yêu cầu khác trên Epic vẫn đi qua `/ao-request` như cũ.
- **Prompt `request` khi chỉ làm trên Jira:** bỏ câu "flag the item Needs you", vì `sa` và `ux` chỉ được comment. Thay vào đó, agent nói rõ việc cần làm trong comment và trong câu trả lời cuối, để phiên chính báo bạn. Cách này đúng luật chung: role không sửa được item thì ghi lý do vào câu trả lời.

### 2.3 Hook Jira chặn chữ "atlassian" (lỗ hổng 3): giữ nguyên

- `guard.mjs:105` chặn có chủ đích mọi lệnh Bash có chữ "atlassian", trừ hai loại chữ đã nêu ở đó.
- Review của `ao-sample` PR #13 đã chỉ ra: nới luật này thì một link tới được REST API, và token bị in ra.
- Cái giá ở T20 nhỏ: `security` bỏ một lượt quét do chính nó thêm, đúng luật "hook từ chối thì bỏ bước tự thêm".
- Module này cũng không dặn agent né chữ đó, vì làm vậy là dạy agent đi vòng qua hook.

### 2.4 Dòng `Next:` sau `QA fail` (lỗ hổng 4)

**Hiện trạng.** Với item In Progress có số PR, `nextFor` (`steps.mjs:338`) trả `/ao-review <PR>`, kể cả khi PR đó đã merge. `decideQa` (`steps.mjs:690`) truyền `pr?.number` mà không xét trạng thái PR.

**Cách sửa.** `nextFor` nhận PR, gồm số, trạng thái mở hay đã merge, và có là PR nháp không. Item In Progress mà PR mới nhất đã merge thì `Next:` là `/ao-build <KEY>`. Mọi chỗ gọi `nextFor` đều truyền theo cách này.

### 2.5 Gắn bằng chứng QA (lỗ hổng 5)

**Hiện trạng.** `qaFollowUp` (`qa.mjs:32`) gắn mọi file dưới `.ai/qa/<KEY>/`, kể cả thư mục con mà `qa` dời bằng chứng cũ vào. Kết quả là 8 ảnh của vòng 1 bị gắn lại lên `SMP-24`.

**Cách sửa.** Chỉ gắn file có thời điểm sửa từ lúc lượt `qa` bắt đầu (`run.startedAt`) trở đi. File cũ hơn ở nguyên chỗ, không được gắn, và không xuất hiện trong dòng "these stay in". `list` trả thêm thời điểm sửa của mỗi file.

### 2.6 `/ao-preview` không bật được app (Medium của `reviewer`, T19)

**Hiện trạng.** `startPreview` (`ao-step.mjs:751`) có hai đường lỗi: `npm ci` lỗi, hoặc một app không trả lời trong 2 phút. Cả hai gọi `back()`, mà `back()` chỉ switch về `develop`. Hậu quả:
- `node_modules` vẫn là package của PR, hoặc dở dang;
- `active.json` bị xóa trước khi biết thư mục đã về `develop` chưa. Nếu chưa về được, lệnh sau không biết thư mục còn ở nhánh PR. Chẳng hạn `/ao-qa` của item khác sẽ chạy `qa` ngay trên nhánh đó.

**Cách sửa** (theo đề xuất của review):
- Ghi `active.json` với `apps: []` ngay sau khi switch.
- Mọi lỗi sau đó gọi `stopPreview`, rồi báo lỗi kèm ghi chú của nó. `stopPreview` đã có sẵn các bước: dừng app, về `develop`, giữ bản ghi khi chưa về được, và cài lại package của `develop`.
- Bỏ `back()`.

**Tách file** (Low kiến trúc của T19). Phần chạy preview gồm `previewFacts`, `portBusy`, `answers`, `startPreview`, `stopApps`, `stopPreview`. Phần này chuyển từ `ao-step.mjs` (849 dòng) sang `lib/workflow/preview-run.mjs`, với git, npm, spawn và fs truyền vào như tham số. Sau đó có test cho các đường: bật lỗi, dừng lỗi, cài lại package.

### 2.7 Danh sách file của PR trước khi xem trước (Medium của `security`, T19)

**Hiện trạng.** Bước chặn file chỉ dẫn và đường dẫn được bảo vệ (`steps.mjs:875`) đọc danh sách file từ `GET /pulls/{n}/files`, mà GitHub dừng danh sách này ở 3000 file. Một PR có hơn 3000 file nằm trước `apps/web/AGENTS.md` theo thứ tự đường dẫn thì lọt qua bước chặn.

**Cách sửa:**
1. `decidePreview` từ chối khi số file đọc được ít hơn `changed_files` của PR.
2. `startPreview` kiểm thêm trước khi switch:
   - sau `git fetch`, `origin/<branch>` phải ở đúng head đã kiểm;
   - tự lấy danh sách file bằng `git diff --name-only origin/develop <head>`. Lệnh này không giới hạn số file, và còn bắt được nhánh cắt từ một `develop` cũ, vốn sẽ đưa bản kit cũ vào thư mục;
   - áp `isInstructionPath` và đường dẫn được bảo vệ, không phân biệt hoa thường, lên danh sách đó.
3. Danh sách file lái phiên có thêm `.claude-plugin/`, `.mcp.json` ở mọi tầng, `.gitmodules`, `.gitattributes` và `.lfsconfig`. Đây là các đường dẫn chính Claude Code soát khi đưa một nhánh vào thư mục.

### 2.8 Hai Low còn lại của T19

- **`fromFork`** (`facts.mjs:168`): khi `head.repo` là null, tức fork đã bị xóa, thì coi PR là từ fork. Thêm test của `readPullRequest` cho ba trường hợp: PR cùng repo, PR từ fork, và PR có `head.repo` null.
- **Skill `ao-preview`:**
  - viết `` `HKCU\Environment` `` trong backtick;
  - thêm câu: app ghi được vào thư mục dự án, kể cả file không được track như `CLAUDE.local.md` hay `.claude/settings.local.json`, và `--stop` không xóa những file đó.
  - `stopPreview` in cảnh báo khi có file chỉ dẫn chưa track mới xuất hiện so với lúc bắt đầu. Danh sách lúc bắt đầu được ghi trong `active.json`.

### 2.9 Đường dẫn được bảo vệ, không phân biệt hoa thường (cần bạn quyết)

**Hiện trạng.**
- `protectedPaths` (`merge-gate.mjs:335`) so phân biệt hoa thường.
- `/ao-preview` (từ kit #245) và hook chặn agent sửa đường dẫn được bảo vệ (`commands.mjs:407`) thì đã so không phân biệt.
- Trên Windows (NTFS), checkout ghi `.Claude/rules/x.md` vào `.claude/rules/`. Vì vậy một PR đổi `.Claude/…` vẫn được `merge-gate` tự merge, và `audit` cho qua.

**Đề xuất.** `merge-gate` và `audit` cũng so không phân biệt hoa thường: một PR như vậy phải do bạn merge.
- Luật trở nên chặt hơn, không lỏng hơn.
- Chỉ ảnh hưởng tới PR có đường dẫn chỉ khác chữ hoa so với một đường dẫn được bảo vệ, việc gần như không bao giờ xảy ra một cách vô tình.
- `merge-gate` chạy từ bản chép kit của từng dự án, nên có hiệu lực ở lần chép kit sau.
- `audit` chạy trên VPS từ bản kit chép ở đó, nên chỉ có hiệu lực khi bạn duyệt cập nhật kit trên VPS. Đó là một việc riêng, phải hỏi bạn trước.

## 3. Lệnh

Không có lệnh mới. Có bốn hành vi đổi:
- lệnh chạy tiếp lượt dừng giữa chừng sẽ áp lại phần dở (2.1);
- `/ao-fix` và lần làm lại có thêm lượt `request` trên nhánh của item (2.2);
- `/ao-preview` từ chối thêm vài trường hợp (2.7);
- dòng `Next:` sau `QA fail` đổi thành `/ao-build <KEY>` (2.4).

## 4. Cấu trúc

```text
lib/workflow/wip.mjs             # 2.1: cất và áp lại phần dở, git truyền vào
lib/workflow/runner.mjs          # 2.1: hiệu ứng wip
lib/workflow/facts.mjs           # 2.2: yêu cầu mở trên Epic; 2.8: fromFork
lib/workflow/steps.mjs           # 2.2: decideFix, rebuild; 2.4: nextFor; 2.7: decidePreview
lib/workflow/prompts.mjs         # 2.1: câu chạy tiếp; 2.2: request trên nhánh item, bỏ "flag"
lib/workflow/qa.mjs              # 2.5
lib/workflow/preview-run.mjs     # 2.6, 2.7, 2.8: phần chạy preview, tách khỏi ao-step.mjs
lib/workflow/review-tree.mjs     # 2.7: isInstructionPath, thêm đường dẫn lái phiên
lib/quality/merge-gate.mjs       # 2.9, nếu bạn đồng ý
scripts/ao-step.mjs              # gọi wip và preview-run
kit/.claude/skills/ao-preview/SKILL.md, docs/dev-workflow.md   # 2.8, tài liệu
tests/                           # test của từng phần trên
```

## 5. Chiến lược test

Dùng `node:test`, theo mẫu test sẵn có của `runGo`, `decideFix`, `rebuild` và `qaFollowUp`:
- **2.1:** `wip.save` chỉ chạy khi lượt dừng giữa chừng và thư mục có thay đổi; không chạy khi lượt xong hay thư mục sạch. Chạy tiếp mà có `wip` thì áp lại rồi xóa theo SHA; áp lỗi thì dừng mà không chạy agent. `wip.mjs` được test với git giả và một repo tạm thật.
- **2.2:**
  - yêu cầu do `ac-revise` ghi chạy trước dev agent, trên nhánh PR;
  - yêu cầu viết trước lượt đổi tài liệu thì không chạy;
  - yêu cầu đã trả lời thì không chạy lại;
  - lần làm lại chạy các lượt `request` sau `spec-sync`, trên nhánh `-rN`;
  - kiểm chữ của prompt.
- **2.4, 2.5, 2.8:** mỗi mục một test đỏ trước khi sửa.
- **2.6, 2.7:** test của `preview-run.mjs` cho các đường `npm ci` lỗi, app không lên, về `develop` lỗi, head lệch, danh sách file bị cắt, và file chỉ dẫn nằm sau 3000 file.
- **2.9:** test của `protectedPaths` và `decideAudit` với `.Claude/…`.

## 6. Ranh giới

**Luôn làm:**
- test trước;
- áp và xóa stash theo SHA;
- rơi về "dừng và báo bạn" khi có nghi ngờ.

**Hỏi trước:**
- đổi luật `merge-gate` và `audit` (2.9);
- cập nhật kit trên VPS;
- mọi lượt agent trả tiền.

**Không làm:**
- nới hook Jira;
- dặn agent né hook;
- tự cất thay đổi khi không chắc đó là của agent.

## 7. Tiêu chí hoàn thành

1. Năm lệnh kiểm của kit xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`.
2. Mỗi mục ở 2.1, 2.2, 2.4–2.8 có test đỏ trước khi sửa, và đã sửa. Mục 2.9 cũng vậy nếu bạn đồng ý.
3. Kiểm thật `/ao-preview` không tốn tiền, làm trên `ao-sample` với kit chạy qua `AO_KIT_DIR`, PR thử tạo bằng login `gh` của bạn, như Checkpoint 3 của human-loop:
   - app không lên: thư mục về `develop`, package của `develop` được cài lại, lệnh sau không bị chặn nhầm;
   - PR đổi một file chỉ dẫn: `/ao-preview` từ chối.
4. Kit merge vào `main` qua PR, CI xanh.

## 8. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| 2.1: áp stash xung đột vì ai đó đã đổi nhánh giữa hai lần chạy | Dừng, không chạy agent, in SHA. Stash vẫn còn, không mất gì |
| 2.1: chưa thể cố ý tạo ra lần chạm giới hạn 5 giờ để kiểm thật | Test với repo tạm thật. Lần chạm giới hạn thật đầu tiên ở Pilot 3 là lần kiểm thật |
| 2.2: một yêu cầu không liên quan, viết trên Epic đúng lúc đó, bị chạy trên nhánh của PR | Chỉ tính yêu cầu tới `ba`, `ux`, `sa`, viết sau lúc lượt đổi tài liệu bắt đầu, nên khoảng thời gian rất hẹp. Thay đổi nào cũng nằm trong PR, và đi qua review cùng gate ③ |
| 2.2: chưa kiểm thật đường này | Lần sửa AC thật đầu tiên ở Pilot 3 là lần kiểm thật; test bao các nhánh của quyết định |
| 2.7: `git diff` với `develop` mới làm nhánh cắt từ `develop` cũ bị từ chối | Câu dừng bảo bạn merge `develop` vào nhánh đó. Đây là điều review muốn: bản kit cũ không được vào thư mục |

## 9. Câu hỏi cần bạn trả lời

1. **Mục 2.9: `merge-gate` và `audit` có so đường dẫn được bảo vệ không phân biệt hoa thường không?** Mình đề xuất **có**, vì luật chặt hơn và gần như không có PR thật nào bị ảnh hưởng. Phần `audit` chỉ có hiệu lực khi kit trên VPS được cập nhật, việc đó mình sẽ hỏi riêng.
2. **Phạm vi kiểm thật.** Mình đề xuất:
   - chỉ kiểm thật `/ao-preview` (tiêu chí 3, không tốn tiền);
   - chưa chép kit vào `ao-sample`, vì B1 sẽ đổi kit tiếp, và lần chép sau sẽ mang cả hai. Mỗi lần chép kit có review đầy đủ tốn khoảng 13–23 USD;
   - đường 2.1 và 2.2 được kiểm thật lần đầu ở Pilot 3.
3. **`plan.md` và `design.md` của `SMP-23` đang lệch, trong khi Epic đã qua gate ②.** Kit chưa có đường để agent sửa tài liệu đã merge sau gate ②. Một PR tài liệu do người mở cũng cần review đủ, vì nếu không `audit` sẽ báo lỗi. Mình đề xuất:
   - không làm trong module này, chỉ ghi lại;
   - thêm một comment trên `SMP-19`, nói rằng thứ tự ghim lấy theo Rules 1 và 4 của SPEC `SMP-23`, không theo quyết định 3 của plan, vì `SMP-19` sẽ đọc quyết định đó;
   - sau đó bạn bấm Complete trên `SMP-23`.

   Nếu bạn muốn sửa hẳn, cần một đường mới cho tài liệu sau gate ②; đường đó nên là một module riêng.

## Nguồn

- `tasks/archive/human-loop/verification.md`, mục T19 và T20.
- `ao-sample` PR #21, hai báo cáo review vòng hai (head `313c4e0`).
- Phiên 27 · Lượt 126–147, [misc/brainstorm-discussion.md](misc/brainstorm-discussion.md).

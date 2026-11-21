# Task sửa kit: finding của review `shop` PR #80 (T13b)

**Trạng thái:** đang làm trên nhánh `task/c2-t13b`. Bạn đồng ý ở Phiên 35 · Lượt 3 ("Làm như đề xuất"), và dặn thêm: "Ưu tiên fix kỹ các việc ảnh hưởng tới lần chạy của T14". Mục "Đã làm" ở cuối file ghi từng mục làm thế nào.

**Nguồn:** review PR #80 (SHOP-79), head `4f14d49`, bản chép kit `8a9f25d`. Cả `reviewer` (`xhigh`) và `security` (`max`) đều không có Critical hay High. Báo cáo đầy đủ ở `.ai/reviews/80-reviewer.md` và `.ai/reviews/80-security.md` của `shop`, và đã đăng lên PR. PR #80 đã merge (`20cbfd4`).

**Cách làm:** một kit PR từ `main`, mỗi finding có test viết đỏ trước. Rồi chép kit vào `shop` trong một Task chép kit riêng, và review một lần (khoảng 15 USD), trước T14.

**Thứ tự:** những việc chạm lần chạy thật của T14 (`/ao-run` trên một Epic của `shop`, `lanes_max: 3`) làm trước: 1, 2, 3, 7, 6, 5, 9, 8. Việc 4 chỉ áp cho item `ao-seo` ngoài Epic, nên làm sau cùng.

## Medium

1. **PR từ fork lọt vào `/ao-run`** (`security`).
   - Chỗ: `lib/workflow/facts.mjs` (`pulls` của `/ao-status`, `pullsOf`), `lib/workflow/steps.mjs` (`prStop`).
   - Lỗi: bảng ghép PR với item theo tên nhánh, kể cả PR từ fork. `/ao-run` chạy review, và fix khi CI đỏ, trên code của người ngoài. Repo `shop` là public.
   - Sửa: PR từ fork không bao giờ là PR của item, như guard của Jira đã làm (`sameRepo`). `/ao-review` và `/ao-fix` dừng trên PR từ fork, như `/ao-preview`.
2. **merge-gate merge theo thông tin đọc trước lúc chờ QA** (`security`).
   - Chỗ: `lib/quality/merge-gate.mjs` (`runMergeGate`).
   - Lỗi: chờ QA tới 100 phút, rồi chỉ so lại base và head. Bạn bấm Request changes hay rút approve trong lúc chờ, PR vẫn được merge.
   - Sửa: sau khi chờ, đọc lại facts và quyết lại; không còn đủ điều kiện thì PR chờ.
3. **Hai hook mới bị lách bằng định dạng** (`reviewer` và `security`).
   - Chỗ: `lib/tracker/guard.mjs` (`holdsRequest`, `holdsQaReport`), `lib/workflow/requests.mjs`, `lib/tracker/facts.mjs` (`qaReportResult`).
   - Lỗi: hook dò chuỗi agent gửi, còn `ao-step` đọc chữ Jira lưu. NBSP, `\f`, U+2028 sau dấu hai chấm, in đậm, `\:`, hay HTML đều lọt hook, mà bộ đọc vẫn thấy yêu cầu tới `ba`, hay một QA report.
   - Sửa: hook đổi chữ agent gửi thành chữ Jira sẽ lưu (bỏ thẻ HTML và dấu định dạng, chuẩn hóa Unicode và mọi khoảng trắng), rồi dò. Bộ đọc cũng chuẩn hóa như vậy. Lớp thứ hai: yêu cầu do `seo` viết không chạy role nào, và `/ao-run` bỏ qua nó.
4. **Cờ `seo-ok` không gắn với comment bạn đã đọc** (`security`).
   - Chỗ: `lib/workflow/steps.mjs` (`seoOkStop`), `lib/workflow/prompts.mjs` (`seoNote`), `scripts/ao-step.mjs`.
   - Lỗi: cờ chỉ chặn lần build đầu. Ở lượt fix sau, dev agent dựng comment mới nhất của `seo`, kể cả comment bạn chưa đọc.
   - Sửa: `--seo-ok` ghi id và mã băm của comment bạn duyệt. Mọi lượt build hay fix của item đó dừng khi comment mới nhất của `seo` khác comment đã duyệt. Prompt của dev nêu đúng id comment đó.
5. **Guard Maven bỏ sót `-s<file>` viết liền và biến `MAVEN_ARGS`** (`reviewer` Medium, `security` Low).
   - Chỗ: `lib/quality/dependencies.mjs` (`MAVEN_SETTINGS`, `installTargets`), `lib/quality/commands.mjs`.
   - Sửa: từ chối mọi từ bắt đầu bằng `-s` hay `-gs`, tiền tố của `--settings` và `--global-settings`, `-Duser.home=` (Maven đọc `settings.xml` ở `~/.m2`); từ chối `MAVEN_ARGS` và `MAVEN_OPTS` đặt trước lệnh Maven, và `export` các biến đó hay biến registry.

## Low

6. **Nhịp `pending` tới GitHub sau `success`** (`reviewer`). Chỗ: `lib/workflow/qa-signal.mjs`. Sửa: xếp mọi lần gửi nối tiếp nhau, nên `success` luôn tới sau.
7. **Mỗi PR cùng base chờ QA lại từ đầu** (`reviewer`). Chỗ: `lib/workflow/qa-signal.mjs` (`waitForQa`). Sửa: một hạn chung 100 phút cho cả run của merge-gate.
8. **Preview trong làn không kiểm file điều khiển agent ở thư mục dự án, và ghi chú chỉ sai thư mục** (`reviewer` và `security`). Chỗ: `lib/workflow/preview-run.mjs`. Sửa: chụp và so file điều khiển của cả thư mục dự án lẫn làn; ghi chú nêu đúng thư mục.
9. **Chữ `seo` lấy từ web tới phiên chính trước khi bạn đọc** (`security`). Chỗ: `lib/workflow/seo-check.mjs`, `lib/workflow/steps.mjs`, `kit/.claude/skills/ao-build/SKILL.md`, `/ao-status`. Sửa: lý do STOP chỉ nêu loại và số dòng, không chép chữ; skill `ao-build` không đọc hay trích comment của `seo`, mà bảo bạn tự đọc trên Jira; `/ao-status` không in chữ của yêu cầu do `seo` viết.

## Ghi chú thêm, không phải finding

- Hook `block-atlassian` chặn nhầm một lệnh Bash của mỗi role, chỉ vì chữ của lệnh nhắc tên tool hay dịch vụ Jira. Agent không lách hook, nên không hại gì. Chưa sửa trong đợt này.

## Đã làm (Phiên 35 · Lượt 3)

Mỗi mục có test viết đỏ trước. Cả bộ: 1.787 test xanh; `validate`, `render:check`, `jira:checklist:check`, `agents:check` đều đạt.

1. **PR từ fork:** `pullsOf` và bảng của `/ao-status` (cũng là bảng của `/ao-run`) chỉ lấy PR có head ở chính repo, như guard của Jira. `/ao-review` và `/ao-fix` dừng trên PR từ fork, `waits: you`. Mình không thêm điều kiện "PR do `ao-dev` mở": người tạo được nhánh trong repo đã có quyền ghi, còn `/ao-review` một PR bạn tự mở vẫn có ích.
2. **merge-gate:** chờ QA xong thì đọc lại PR và quyết lại. Approve bị rút hay Request changes trong lúc chờ thì PR ghi "Waiting" và không merge.
3. **Hook:** module mới `lib/tracker/stored-text.mjs`. `plainText` chuẩn hóa NFKC, bỏ ký tự không bề rộng, đổi mọi ngắt dòng Unicode thành `\n` và mọi khoảng trắng khác thành một dấu cách. `markupText` bỏ thêm thẻ HTML (thẻ khối thành ngắt dòng), entity, link, dấu thoát, dấu định dạng của markdown và wiki Jira, macro `{…}`, dấu đầu dòng (trích dẫn, tiêu đề, danh sách, bảng). Hook đọc mọi chuỗi của input qua `markupText`; chuỗi là JSON thì đọc cả tài liệu Jira bên trong. Với `seo`, hook từ chối thêm `Cần <role>:` ở bất cứ đâu trong dòng, trừ `Cần seo:` (câu trả lời có thể trích). Bộ đọc `openRequests` và `qaReportResult` dùng `plainText`, nên hai bên đọc giống nhau. Lớp thứ hai: yêu cầu do `seo` viết không chạy role nào (`/ao-request` dừng chờ bạn, `/ao-run` bỏ qua, `/ao-spec` và `/ao-plan` cũng bỏ qua).
4. **`seo-ok`:** `--seo-ok` cùng `--go` ghi `{ id, hash }` của comment `seo` mới nhất vào `.ai/runs/<KEY>/seo-ok.json` (hash: 16 ký tự đầu của SHA-256 chữ comment, nên sửa comment là khác). Mọi lượt dev (build, build lại, fix, build lại sau QA fail) của item `ao-seo` ngoài Epic dừng `waits: you` khi comment mới nhất khác comment đã duyệt. Prompt của dev nêu id comment đã duyệt. Item có mô tả trỏ tới SPEC, không có comment, được ghi với `id: null`.
   - Không làm: `seo-ok` thành label chỉ bạn đặt được. Lý do: phiên chính không còn đọc chữ `seo` (việc 9), nên không bị chữ đó lái để tự gõ `--seo-ok`.
   - Rủi ro còn lại: agent dev có Bash ghi được `.ai/runs/`, nên về lý thuyết giả được file duyệt. Nhưng không lượt dev nào bắt đầu với comment chưa duyệt, nên muốn giả thì agent đó phải bị lái từ một nguồn khác trước.
5. **Maven:** `readsMavenSettings` đọc từng từ như commons-cli của Maven: option ngắn có giá trị viết liền (`-sx.xml`, `-gsx.xml`), option ghép (`-qsx.xml`), tiền tố của option dài sau một hay hai gạch (`--sett`, `-settings`), `-Duser.home=` và `-D…settings…=`. Kiểm ở gh-guard và ở `wrapperCommand`, nên `run.mjs` và `mvnw.mjs` cũng từ chối. Biến `MAVEN_ARGS`, `MAVEN_OPTS`, `JAVA_TOOL_OPTIONS`, `JDK_JAVA_OPTIONS`, `_JAVA_OPTIONS` và biến registry bị từ chối khi đặt trước bất kỳ lệnh nào, hay qua `export`, `declare`.
6. **Nhịp tim:** mọi lần gửi status xếp nối tiếp nhau, nên `success` luôn tới sau nhịp `pending` đang gửi dở.
7. **Hạn chờ chung:** `waitForQa` tính 100 phút từ lần chờ đầu của lượt chạy. PR sau gặp QA vẫn chạy thì bỏ cuộc ngay; QA đã xong thì merge bình thường.
8. **Preview trong làn:** ghi riêng file lái phiên chưa theo dõi của thư mục dự án (`untracked`) và của làn (`laneUntracked`). `--stop` nêu file mới ở từng nơi và nói rõ nơi nào.
9. **Chữ `seo` tới phiên chính:** `seoTextProblems` chỉ nêu loại, số dòng và tên chương trình (từ danh sách của kit), không chép địa chỉ hay lệnh. Skill `ao-build` không đọc, không trích comment của `seo`, mà bảo bạn tự đọc trên Jira. `/ao-status` không in chữ của yêu cầu do `seo` viết.
   - Còn lại, ngoài phạm vi của finding: câu hỏi mở của `seo` trong SPEC vẫn tới phiên chính để bạn trả lời.

## Lần sửa thứ hai: review của `shop` PR #81 (Phiên 35 · Lượt 6)

Review PR #81 (SHOP-80, chép kit `82b1bca`): `security` 1 High, 2 Medium, 2 Low; `reviewer` 3 Medium, 3 Low. Bạn chọn sửa hết ("Làm"). Báo cáo: `.ai/reviews/81-reviewer.md` và `.ai/reviews/81-security.md` của `shop`. Bộ test: 1.793 xanh.

1. **High, entity HTML lách hook:** `stored-text.mjs` giải mã entity số có hay không có `;`, thêm các entity khoảng trắng, dấu không bề rộng và dấu câu, và tên quen ở đầu một tên lạ khi thiếu `;` (`&nbspreport`). Hook "đóng khi không chắc": `seo` viết một entity mà hook không đọc được thì bị từ chối; QA report được tìm với entity lạ đọc như dấu cách và như không có gì.
2. **`seo-ok` gắn với dấu bước kiểm đã in:** chỗ dừng in `seo-ok <id>:<hash>`, `--seo-ok` nhận đúng dấu đó, khác thì dừng ("changed after the check showed it"). Skill `ao-build` chuyển dấu từ dòng Next. File duyệt chỉ ghi khi dấu khớp. Khác đề xuất: vẫn ghi trước khi quyết, không đợi lock và GO, vì dấu đã khóa đúng comment bạn đọc.
3. **`reviewer` và `qa` cũng dừng** khi comment chưa được duyệt; prompt chỉ nêu id comment khi dấu khớp.
4. **Maven và biến:** bộ đọc option của Maven trả cả giá trị, nên `--define`, `-define`, `-qD…` được xét như `-D`; `NAME+=`; `export NAME` trần; `npm_config_userconfig`, `npm_config_globalconfig`, `YARN_RC_FILENAME`.
5. **Mã băm `seo-ok`** tính cả thân comment (ADF dạng JSON). **`.ai/runs/`:** agent không Edit/Write được `seo-ok.json`, `state.json` và `active/`; ảnh xem trước vẫn được.
6. **`programOf`** cắt ở mọi khoảng trắng. **`sameRepo`** một hàm duy nhất trong `lib/tracker/facts.mjs`, dùng cho guard, `ao-step`, `fromFork` và merge-gate.
7. **Chạy tiếp review:** mọi lượt review cùng dừng trên head chạy tiếp, mỗi lượt trong phiên của nó.

Không làm: "không tin chữ ký của tài khoản chung khi chạy yêu cầu tới role có Bash" (security gợi ý thêm). Lý do: hook đã đóng khi không chắc, và cần thiết kế riêng.

## Lần sửa thứ ba: review lần hai của `shop` PR #81 (Phiên 35 · Lượt 7)

Review lần hai PR #81 (head `3f2bd98`, kit `8847a84`): `security` 1 High mới, High cũ còn một nửa, 2 Medium, 1 Low; `reviewer` 2 Medium, 4 Low. Bạn chọn "sửa theo đề xuất": bỏ hẳn việc đoán chữ Jira lưu, và sửa hết Medium, Low. Bộ test: 1.796 xanh.

1. **High, hook đoán sai chữ Jira lưu** (`<…>` trong đích link, autolink, comment HTML, entity lạ của QA report):
   - hook gửi comment của mọi agent trừ `qa` qua `updatedInput`, dạng HTML đã escape (`literalComment`): mỗi dòng một `<p>`, dòng `# ` thành `<h1>`–`<h6>`;
   - hook xét chữ thô đó, và đó cũng là chữ `ao-step` đọc lại. `markupText`, bảng entity và luật "seo không viết entity" bị bỏ;
   - các agent này chỉ viết comment mới: không sửa comment (`commentId`), không comment qua `update` của transition hay edit, và chỉ truyền các tham số của tool comment;
   - đã kiểm trước:
     - probe cục bộ: Claude Code 2.1.330 đổi input của tool MCP qua `updatedInput`, và hook thấy `agent_type` khi chạy `--agent`;
     - comment thật trên SHOP-80 (id 10620–10622, không có chữ ký role): HTML đã escape được giữ đúng từng ký tự. Markdown dù escape vẫn biến URL thành card, nên không dùng markdown.
2. **Medium, mark của skill:** skill `ao-build` dùng đúng mark bạn gõ, hoặc mark của lần kiểm bạn vừa xem trong cùng phiên. `seo-ok` không kèm mark thì dừng.
3. **Medium, agent đọc comment trên Jira lúc đang chạy:** prompt mang nguyên văn comment đã duyệt, kẹp giữa hai dòng `SEO <hash>`. Agent không đọc trên Jira nữa. Comment dài quá 12000 ký tự thì dừng chờ bạn. Item không có comment nào được duyệt thì prompt bảo không đọc comment nào.
4. **Medium, vòng lặp `/ao-review` ↔ `/ao-build`:** skill chạy `--seo-ok <mark> --go` kể cả khi lần kiểm dừng vì lý do khác. `ao-step` giữ seo-ok trước khi quyết, in một dòng `seo-ok …` (khớp hay không), rồi dừng ở PR đang mở. Sau đó review đi tiếp.
5. **Medium, `set -a`:** bị từ chối:
   - `set -a`, `set -o allexport`, `bash -a`, `bash -o allexport`;
   - `SHELLOPTS`, `BASHOPTS`, `BASH_ENV`;
   - `printf -v`, `read`, `mapfile`, `getopts` và `${NAME:=…}` khi ghi vào biến nguồn hay biến của phiên;
   - tên biến ghép từ biến khác trong `export`/`declare`/`env`, và `declare -n`.
6. **Low, biến nhà:** `USERPROFILE`, `HOME`, `HOMEDRIVE`, `HOMEPATH`, `XDG_CONFIG_HOME`, `LOCALAPPDATA`, `APPDATA`, `npm_config_prefix` vào nhóm biến nguồn. `NAME+=` với biến của phiên bị từ chối như `NAME=`.
7. **Low, `::$DATA`:** Edit/Write được xét theo file Windows mở (bỏ stream, dấu chấm hay dấu cách cuối). Tên ngắn `~1` bị từ chối. Luật phụ thuộc của `package.json`/`pom.xml` cũng đọc tên đó.
8. **Low, URL có `&`:** hết, vì hook không còn đọc entity.
9. **Low, comment trong code:** comment của `githubGuards` về đúng chỗ, hai comment mồ côi đã xóa, comment của `seoMark` ghi đúng "cả thân comment".
10. **Gọn hơn:** dòng xét biến nguồn tách thành `sourceWord`.

### Mô hình mối đe dọa trước vòng review sau

| Điểm tin | Ai chạm được | Đã chặn | Còn lại |
|---|---|---|---|
| Chữ comment → `openRequests` (chạy role), `qaReportResult` (QA lại, Accept), comment `seo` (prompt dev) | Agent qua MCP (hook), bạn, CI token (jira-sync, báo cáo light) | Agent trừ `qa`: chữ thô, Jira giữ nguyên, hook xét đúng chữ đó; không sửa comment; không comment qua `update` | Chữ ký `Agent:` vẫn tự khai trên tài khoản chung: một agent bị lái có thể ký thay role khác (đã biết, cần thiết kế riêng). `qa` viết markdown tự do và được yêu cầu role khác. |
| `seo-ok.json`, `state.json`, khóa | `ao-step`; agent qua Edit/Write (chặn, cả stream và tên ngắn); agent qua Bash | Edit/Write | Bash ghi được `.ai/runs/` (đã biết, ghi trong Risks) |
| Chữ `seo` tới phiên chính có Bash | STOP, `/ao-status`, log | Chỉ in loại, số dòng, mark | Câu hỏi mở của `seo` trong SPEC (đã biết) |
| Chữ `seo` tới dev | Prompt | Chỉ bản bạn đã duyệt, đúng như lúc so mark | Chữ đó vẫn là chữ từ trang web, bạn đọc trước khi duyệt |
| Biến môi trường của Maven, trình quản lý gói | Bash của agent | Như trên | Script do agent tự viết rồi chạy thì gh-guard không đọc (đã biết: gh-guard không phải ranh giới) |

## Còn mở sau review vòng ba (bạn chấp nhận rủi ro, Phiên 35 · Lượt 8)

Review vòng ba của PR #81 (head `80a0e6d`, kit `9374641`, 11,40 USD; `SHOP-80` tổng 28,40 USD): `security` 1 High, 2 Medium; `reviewer` Approve, 3 Medium, 1 Low. Bạn chọn: approve PR #81 với `Accept risk: 08bc0732 until 2026-12-15`, dừng vòng sửa, làm T14 với một Epic có SEO. Các việc dưới đây là Task sửa sau, trước 2026-12-15.

1. **High `08bc0732`, `plainText` không idempotent:** NFKC chạy trước khi bỏ dấu rộng 0, nên `Ca` U+200B U+0302 U+0300 `n sa:` lọt hook, còn bộ đọc ghép lại thành `Cần sa:`. Cách sửa:
   - bỏ dấu rộng 0 và ký tự điều khiển trước và sau NFKC, rồi test `plainText(plainText(x)) === plainText(x)`;
   - hook kiểm bằng chính `openRequests` và `qaReportResult` trên ADF dựng từ các khối;
   - hook buộc comment của agent khác `qa` bắt đầu bằng đúng Agent value của nó;
   - bộ đọc QA report bỏ comment do role khác `qa` ký.
2. **Medium, `@` trong prompt `-p`:** Claude Code đọc file nêu sau `@` vào context, không qua hook. Vòng này prompt mang nguyên văn comment `seo` đã duyệt. Cách sửa: ghi chữ đó vào `.ai/runs/<KEY>/seo-<hash>.md`, cấm agent ghi file này, prompt chỉ nêu đường dẫn, agent đọc bằng Read. Bỏ giới hạn 12000 ký tự.
3. **Medium, U+0000:** trình đọc HTML5 bỏ U+0000 trong thân, nên chữ hook đọc có thể khác chữ Jira giữ. Cách sửa: bỏ ký tự điều khiển C0, C1 (trừ `\n`) trong `plainText` và `literalComment`; đã có cách sửa của mục 1 làm lớp sau.
4. **Medium, NFKC đổi chữ agent viết:** `™` thành `TM`, `42½` thành `421⁄2`. Cách sửa: chữ gửi đi chỉ chuẩn hóa NFC, bỏ dấu rộng 0 và ký tự điều khiển; vẫn kiểm trên `plainText` của chữ đó.
5. **Medium, giới hạn 12000 ký tự chặn cả run không cần comment:** run `seo` hay request của `ba` cũng dừng. Hết khi làm mục 2.
6. **Medium, Bash còn đặt biến:** `for NAME in`, `let`, `(( NAME = … ))`, `set -o pipefail -o allexport`, `set -ox allexport`, `shopt -so allexport`. Cách sửa: thêm `for`, `select`, `let`, `((` vào nhóm builtin ghi tên; `exportsAll` xét mọi cặp `-o <tên>`; từ chối `shopt` có `allexport`.
7. **Low:** tiêu đề và bảng của PR #81, cùng Verification của `SHOP-80`, vẫn ghi kit `82b1bca`.

`reviewer` chạm `max_turns` (71 lượt) trước khi đăng báo cáo. Phiên chính đăng nguyên văn `.ai/reviews/81-reviewer.md` bằng `ao-pr.mjs review` (COMMENT), để PR có đủ báo cáo trên head. Một lượt review mới từ đầu sẽ tốn thêm khoảng 5 USD.

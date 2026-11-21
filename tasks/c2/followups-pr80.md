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

# SPEC: setup có hướng dẫn

> **Nguồn:** nhật ký Phiên 36 · Lượt 2–8 (`misc/brainstorm-discussion.md`). Bạn chốt ở Lượt 3 (bỏ Task thật khỏi setup),
> Lượt 5–6 (agent hỏi stack, dựng app từ template của bạn), Lượt 8 (ba câu chốt, thứ tự làm, và quyền cho phiên chính
> làm tới hết).
>
> **Trạng thái:** phiên chính duyệt thay bạn ngày 2026-11-24, theo quyền ở Lượt 8. Tiến độ ở
> [tasks/guided-setup/todo.md](tasks/guided-setup/todo.md).

## 1. Mục tiêu

**Hiện nay:** dev đọc [docs/getting-started.md](docs/getting-started.md) (hơn 1.200 dòng) rồi tự gõ từng lệnh. Tài liệu
đó đúng và chi tiết, hợp để tra cứu, nhưng dài với người mới.

**Sau module này:**
- Dev cài bốn công cụ, clone kit, tạo một thư mục trống, mở `claude` trong đó và gõ một câu:
  "Làm theo `<kit>/ao-kit-setup.md`".
- Agent chính hỏi config và stack, chạy các lệnh `ao-kit`, dẫn dev bấm những việc chỉ dev làm được, chạy `doctor` tới
  khi xanh, rồi kiểm kết nối bằng đọc/ghi nháp.
- Setup không chạy agent nào và không làm tính năng. Ngoại lệ duy nhất: dự án dựng từ template có một Task sửa code
  template cho hợp kit (mục 3.6), vì thiếu nó thì CI không xanh.

## 2. Ba lớp tài liệu

| Tài liệu | Cho ai | Nội dung |
|---|---|---|
| `docs/quick-start.md` (mới) | Dev | Một trang: cài gì, clone kit, gõ câu nào, ai làm gì |
| `docs/setup-steps.md` (mới, chuyển từ `misc/thao-luan/setup-du-an/cac-buoc-setup.md`) | Dev | Từng bước setup, thư mục dự án có gì sau mỗi bước, phần 3 và phần 5 |
| `ao-kit-setup.md` (mới, ở gốc kit) | Agent chính | Thứ tự việc, câu hỏi, việc nào agent làm, việc nào dẫn dev bấm, trỏ tới đúng mục của `getting-started.md` |
| `docs/getting-started.md` (giữ) | Tra cứu; agent đọc khi cần | Lệnh, đầu ra thật, lỗi đã gặp. Thêm một dòng đầu trỏ tới hai file mới |

`ao-kit-setup.md` không chép lệnh của `getting-started.md`: nó trỏ tới mục, để hai file không lệch nhau.

## 3. `ao-kit-setup.md`

1. **Phạm vi:** dự án mới từ thư mục trống, theo phần 3 (khung `next-nest` của kit) hoặc phần 5 (app từ template của
   bạn) của `getting-started.md`. Dự án đã có code (phần 4) chưa có ở bản này.
2. **Hai phiên.** Claude Code chỉ nạp `.claude/` và `.mcp.json` của dự án khi bạn mở lại nó trong thư mục và tin cậy
   thư mục; biến môi trường mới cũng chỉ thấy sau khi mở lại. Vì vậy file chia hai phiên, và làm tiếp được: bạn gõ
   "làm tiếp `ao-kit-setup.md`", agent chạy `ao-kit doctor` và đọc `.ai/setup/` để biết đã tới đâu.
3. **Câu hỏi.** Agent hỏi theo nhóm, mỗi câu có giá trị đề xuất; bạn chỉ sửa chỗ muốn khác:
   - stack: khung `next-nest`, hay app từ template. Với template, từng app: tên, stack (`nextjs`, `react`,
     `spring-boot`), đường dẫn, nhánh, thư mục bỏ đi, public hay không, SEO hay không;
   - tên dự án, tên hiển thị, mã space Jira, repo, repo public hay private, người duyệt;
   - quy trình: `review.default`, `runs.lanes_max`, `runs.agents_per_role`, `runs.budget_usd`, `runs.idle_hours`;
   - VPS: lên Development ngay hay để sau, và host của từng app public.

   Agent in một bảng tổng hợp. Chỉ sau khi bạn duyệt bảng, agent mới tạo repo hay ghi file.
4. **Chuẩn bị một lần.** Agent kiểm công cụ, biến môi trường (chỉ có hay không, không bao giờ in giá trị), App, site Jira
   và VPS. Thiếu gì thì agent dẫn bạn làm theo [docs/jira-setup.md](docs/jira-setup.md),
   [docs/github-apps-setup.md](docs/github-apps-setup.md) và [docs/vps-setup.md](docs/vps-setup.md). Từ dự án thứ hai,
   phần này chỉ còn vài dòng kiểm.
5. **Ai làm gì.** Agent chạy mọi lệnh `ao-kit`, `gh`, `git`, `npm`, `pnpm`. Bạn làm những việc chỉ người làm được:
   - đặt token và key vào biến môi trường của Windows;
   - sửa cột và giới hạn cột của board Jira;
   - tạo key của `ao-merge` và xóa file key;
   - cài App vào repo, khi API không làm được;
   - bật Actions, khi API báo bật mà workflow không chạy;
   - tin cậy thư mục và bật hai server MCP.

   Agent dẫn từng cú bấm, rồi chờ bạn báo xong.
6. **Template.** Template phải là repo git; `add` chỉ chép phần đã commit. Agent báo khi template có thay đổi chưa commit,
   và không sửa gì trong template. Trước commit đầu, agent ghi các mục của `.ai-orchestrator/` mà `add` không ghi (với
   Spring Boot: `env:` của app và khóa `database` của `deploy.yaml`, `coverage_exclude` của `project.yaml`). Commit đầu
   mang code đã có của template, nên hook `pre-commit` không kiểm luật Suppressions ở commit đó; job `policy` vẫn kiểm mọi
   PR. Phần code còn phải sửa đi qua
   một Task và một PR, sau khi Claude Code đã mở lại có MCP. Task đó mặc định bỏ review (nhãn `ao-review-skip`), vì
   code là template của bạn; agent hỏi bạn có muốn review không.
7. **Luật.** Không hỏi và không nhận token trong chat. Không in nội dung file secret. Không xóa gì không lấy lại được khi
   chưa hỏi bạn. Mỗi lệnh có thể chạy lại.

## 4. `ao-kit add` ghi `.ai/setup/add-report.md`

`add` in danh sách chỗ code app còn phải sửa ở phiên thứ nhất, còn Task sửa code chạy ở phiên thứ hai. Vì vậy, mỗi lần
`add` chạy xong, nó ghi thêm một mục cho app đó vào `.ai/setup/add-report.md`: những chỗ phải sửa, và với Spring Boot,
hai mục phải ghi tay ở mục 3.6. `.ai/` nằm trong `.gitignore`, nên file không được commit.

## 5. `ao-kit verify <dir>`

Lệnh mới, chạy sau khi `doctor` xanh. Mỗi dòng là một phép thử thật, ✔ hay ✘ kèm việc cần làm. Lệnh ghi kết quả vào
`.ai/setup/verify.md`, không in secret, và trả 0 khi mọi dòng đạt.

| Nền tảng | Lệnh làm gì | Dọn |
|---|---|---|
| Jira, token CI | Tạo một Task nhãn `ao-kit-verify`, đọc lại, comment | Chuyển Task sang Cancelled bằng token thường của bạn (`JIRA_ADMIN_CLASSIC_TOKEN`), vì Cancel là việc của người |
| GitHub, App `ao-dev` | Lấy token ghi; tạo nhánh `ao-kit-verify-<giờ>` tại head của `develop`, đọc lại | Xóa nhánh đó. Nhánh không có commit riêng, và không workflow nào chạy khi tạo nhánh |
| GitHub, App `ao-review` | Lấy token có quyền ghi PR, như lượt review cần | Không có gì để dọn |
| VPS, khi có host | Development của từng app public: có basic auth thì `health` trả 200; không có thì 401 | Không có gì để dọn |

Phép thử của MCP do agent chính làm: `ao-kit-setup.md` bảo nó đọc Task vừa tạo qua server `atlassian`, bằng token của
agent. Lệnh không mở PR, không chạy agent và không deploy.

## 6. Chạy thử thật

Trên một thư mục trống `du-an-1`, theo phần 5, với ba template của bạn:

| App | Stack | Template | Nhánh | Công khai |
|---|---|---|---|---|
| `web` | Next.js | `D:\Document\1Khoahoc\4LapTrinh\nextjs\00-tungph7-codebase1-ui-nextjs16` | nhánh hiện tại | có, có SEO |
| `admin` | React | `D:\Document\1Khoahoc\4LapTrinh\reactjs\00-tungph7-codebase1-ui-reactjs` | nhánh hiện tại | có, không SEO |
| `api` | Spring Boot | `D:\Document\1Khoahoc\4LapTrinh\java\tungph7-learnPostgresql-api-java` | nhánh hiện tại | không |

Repo `TungPH7/du-an-1` public (Actions của repo private đã hết phút miễn phí), space Jira `DA1`, có lên Development
trên VPS. Phiên chính làm đúng theo `ao-kit-setup.md`; chỗ nào file sai hay thiếu thì sửa file, ghi vào
`tasks/guided-setup/verification.md`.

**Đạt khi:** `doctor` in `Every row passes.`, `verify` đạt mọi dòng, ba app chạy trên Development, và mọi chỗ lần chạy
tìm ra đã sửa trong kit.

## 7. Review

Một lần cho cả đợt, theo luật một bản kit chỉ review một lần (`SPEC-kit-copy-review.md`): chép kit vào `shop` trong một
Task, review PR chép kit, sửa mọi Critical và High, QA, rồi Accept.

## 8. Không làm

- Dự án đang phát triển (phần 4): bản sau.
- Tự sửa cột board Jira: API của Jira không làm được.
- Tự tin cậy thư mục hay bật MCP thay bạn.
- Chạy một tính năng thật để thử agent: đã thử nhiều ở `ao-sample` và `shop`.

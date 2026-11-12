# Kiểm chứng: project-scaffold, phần 1 (B1)

> **Spec:** [SPEC-project-scaffold.md](../SPEC-project-scaffold.md). **Plan:** [plan.md](plan.md). Ghi kết quả từng task khi xong.

## T2: tiền đề Jira, 2026-11-12

Script tạm trong thư mục scratchpad, gọi REST trên site bằng basic auth, với email admin và API token thường (không scope) của bạn, đặt ở biến user `JIRA_ADMIN_CLASSIC_TOKEN`. Token không được in ra.

| Bước | Kết quả |
|---|---|
| Đọc `myself`, space `DEMO` và các scheme của nó | 200. `DEMO` là company-managed (`classic`), có workflow scheme `AO workflow scheme` (10002), issue type scheme 10149, issue type screen scheme 10001, permission scheme `Default software scheme` (10001), notification scheme 10000, field configuration mặc định, một board kanban |
| Tạo `AOG`, kèm cả năm scheme của `DEMO` | 400: `Changing permission schemes is not allowed on the Jira free plan.` Site đang ở gói Free |
| Tạo `AOG`, bỏ permission scheme | 201, id 10035, company-managed. Workflow, issue type và screen scheme đúng của `DEMO`. Permission scheme là bản riêng `AOG software permission scheme` (10034) |
| Tạo bộ lọc chia sẻ trong space, rồi board kanban | 200 (filter 10035), 201 (board 36) |
| Sửa JQL của bộ lọc thành `project = AOG AND issuetype != Epic ORDER BY Rank ASC` | 200 |
| Đọc cấu hình cột của board | 200; Agile REST API công khai không có lệnh ghi cột |
| `npm run jira:check -- --space AOG` | Còn 5 chỗ lệch, đều là cột của board. Workflow, group, quyền, field: không lệch |

**Kết luận:** `setup jira` làm được bằng API mọi thứ trừ cột của board và Kanban backlog; hai việc này giữ hướng dẫn bấm tay. Mục 2.4 của spec đã sửa theo kết quả này.

Space `AOG` và board 36 dùng tiếp cho T16. Cột của board sẽ được bấm theo hướng dẫn ở T16.

## Chặng 1: cấu hình, 2026-11-12

| Task | Kết quả |
|---|---|
| T3 | `lib/scaffold/project.schema.json` và `project-config.mjs`: luật P1–P7 của file, C1–C3 khi đối chiếu `deploy.yaml`, `package.json` và thư mục app. `ao-kit check` in từng lỗi kèm mã luật. Mẫu là `project.yaml` của `ao-sample`, dựng từ `settings.json` và `preview.yaml` thật của nó |
| T4 | Nguồn `agents/settings.json`; `render-agents.mjs` sinh `.claude/settings.json` từ nguồn đó và `project.yaml`, có trong `--check`, `--list`. `.claude/settings.json` vào `kit_copy.rendered`. Dự án chưa có `project.yaml` giữ `settings.json` của mình |
| T5 | `/ao-preview` lấy app từ `project.yaml`: lệnh `dev`, URL là `http://localhost:<cổng><health>`, biến cổng truyền cho app. Thiếu `project.yaml` thì dừng và trỏ tới `ao-kit sync` |

**Một chỗ đổi so với plan, ở T4.** `settings.json` sinh ra là JSON chuẩn thụt 2 dấu cách, không giữ định dạng viết tay như trước (mảng và object ngắn trên một dòng). Nội dung, khóa và thứ tự giữ nguyên; test so bản sinh ra với bản JSON chuẩn của `settings.json` hiện có của `ao-sample`. Lần sinh đầu ở mỗi dự án sẽ đổi cách xuống dòng của file một lần.

**Thứ tự test.** Test của lệnh `ao-kit check` (T3) được viết cùng lượt với script, chạy lần đầu khi script đã có, nên không có lần đỏ trước. Các phần còn lại của chặng 1 có test đỏ trước.

Năm lệnh kiểm xanh (1238 test).

## Chặng 2: cài kit, 2026-11-12

| Task | Kết quả |
|---|---|
| T7 | `lib/scaffold/install.mjs`: chép kit theo `kit_copy` của `gates.yaml`, mỗi thư mục của kit chép mới nên file kit đã bỏ cũng mất theo; giữ mọi file của dự án và skill riêng. Danh sách script chia hai: 15 script chép vào dự án, 10 script chỉ dùng trong kit; test bắt mọi script mới phải được xếp vào một bên. `draftFromOldConfig` dựng `project.yaml` từ `settings.json`, `preview.yaml`, `deploy.yaml` của dự án cũ, và ra đúng `project.yaml` mẫu của `ao-sample`. `misc/scaffold-input/` đã xóa |
| T8 | `profiles/next-nest/`: 43 file khung lấy từ `ao-sample` (bỏ phần ghi chú), cộng hai skill theo stack. `npm run profiles:check` xanh trên máy: `npm ci` 86 giây, `lint`, `typecheck`, `test:coverage`, `build` 29 giây. Workflow `profiles.yml` chạy lệnh này khi PR đụng profile |
| T9 | `ao-kit init` (thư mục trống, repo đang có), `sync`, `render`. Chạy thử thật: thư mục trống nhận khung 162 file và kit; thiếu App thì dừng và nói cần điền gì; chạy lại thì không đổi gì |

**Hai chỗ khác plan, ở T8:**
- Khung bỏ cả `apps/api/src/common/` (bộ lọc lỗi chung của API), không chỉ phần ghi chú. Thư mục này gắn với tính năng ghi chú: lỗi giới hạn số ghi chú, lỗi ghim, id của `/notes/:id/pin`. Nó là quyết định thiết kế riêng của `ao-sample` (ADR-0003), không phải chỗ Pilot 1 sửa tay. Epic đầu của dự án tự đặt cách báo lỗi.
- `profiles:check` lần đầu đỏ ở `test:coverage` của web: vitest không thấy file test dưới đường dẫn tạm dạng rút gọn của Windows (`HUUTUN~1`). Script dùng đường dẫn dài (`realpathSync.native`) thì xanh.

Năm lệnh kiểm xanh (1258 test).

## Chặng 3: dựng và kiểm, 2026-11-12

| Task | Kết quả |
|---|---|
| T11 | `ao-kit setup github`: đặt nhánh mặc định `develop`, xóa nhánh sau merge, Dependabot, bốn environment (`merge-gate` chỉ cho `develop`), hai secret qua stdin, rồi chạy `gh:protect`. Mỗi bước đọc trước, chỉ ghi phần thiếu: test với GitHub giả cho thấy lần chạy thứ hai không ghi gì, và không giá trị bí mật nào nằm trong tham số |
| T12 | `ao-kit setup jira`, theo đúng các bước T2 đã thử: tạo space với bốn scheme của space mẫu (không gửi permission scheme), bộ lọc và board kanban, sửa JQL nếu lệch, rồi chạy `jira:check`. Chạy thật trên `AOG`: lệnh thấy space và board đã có, `jira:check` báo 5 chỗ lệch về cột |
| T13 | `ao-kit doctor`: 23 dòng trên máy, repo, GitHub, Jira, Claude Code, cộng một câu hỏi về VPS kèm đoạn `deployer.yaml` cần thêm. Chạy thật trên `ao-sample` (đặt tạm `project.yaml`): mọi dòng đạt trừ "file kit khác bản clone" (25 file, vì `ao-sample` còn bản kit `c6fdfa8`), đúng thực tế |

**Hai lỗi chỉ lần chạy thật bắt được, đã sửa:**
- `jira:check` đọc `contract/` theo thư mục hiện hành, nên `doctor` và `setup jira` phải chạy nó từ thư mục kit. Lần thử `setup jira` đầu tiên tình cờ đúng vì đứng sẵn trong thư mục kit. Sửa ở `85370a3`.
- Gọi `claude --version` qua shell làm Node cảnh báo DEP0190; `doctor` giờ chỉ kiểm `claude` có trên `PATH` (`where` trên Windows, `which` nơi khác).

**Thứ tự test.** Test của T12 được viết cùng lượt với code, chạy lần đầu đã xanh, nên không có lần đỏ trước. T11 và T13 có test đỏ trước.

Năm lệnh kiểm xanh (1269 test).

## Chặng 4: hướng dẫn và kiểm thật

**T15, 2026-11-12.** Bản nháp `docs/getting-started.md`: phần 1 (ai làm gì, sơ đồ vòng, 5 gate), 2 (công cụ, tài khoản, biến môi trường, clone kit), 3 (dự án mới, 8 bước theo `ao-green`), 4 (repo đang có, theo `ao-brown`), 6 (bảng tra lệnh `/ao-*` và `ao-kit`). Phần 5 và 7 viết ở T19.

Cùng nhánh: câu "By hand" của `setup github` giờ trỏ đúng đường mà `docs/github-apps-setup.md` mục 3 dùng để thêm repo cho App đã cài.

**Một lần commit test đỏ.** Commit `d91c398` sửa câu "By hand" kèm test, nhưng heredoc làm mất dấu `\` trong regex của test. Chuỗi lệnh vẫn commit vì `&&` đứng sau `grep`, chỉ xét kết quả của `grep`. Test được sửa ở `57955f7`, trước khi push; năm lệnh kiểm xanh (1269 test).

**T16, dựng mới `ao-green`, 2026-11-12 (đang làm).** Repo private `TungPH7/ao-green` được tạo rỗng. `ao-kit init` vào thư mục trống cạnh `ao-sample` chạy hết trong 144 giây: chép khung 162 file, chép kit, thêm `prepare`, `npm ci --prefix .ai-orchestrator`, render, `npm ci`, cài Chromium của Playwright. `setup jira` thấy space `AOG` và board 36 đã có từ T2, `jira:check` còn 5 chỗ lệch về cột.

Lỗi chỉ lần chạy thật bắt được:
- Lần chạy `init` đầu tiên dừng ở render với `ERR_MODULE_NOT_FOUND`: bản kit trong dự án chưa có package. Giờ `init` và `sync` chạy `npm ci --prefix .ai-orchestrator` trước render (`533eb67`, có test đỏ trước). Thư mục được xóa và chạy lại từ đầu.
- `/ao-intake` dừng ngay ở dòng kiểm: `the origin remote is not a GitHub repository: none`. Lý do: `init` tạo repo git mà không thêm remote `origin`, dù đã có `--repo`. Bản nháp cũng đặt `git remote add` sau `/ao-intake`. Mình đã thêm remote bằng tay cho `ao-green`. Kit sẽ sửa để `init` thêm `origin` từ `--repo` khi thư mục chưa có remote này.
- Khi đã có remote, dòng kiểm báo `App 5514961 is not installed on TungPH7/ao-green`. Mọi lệnh `ao-step`, kể cả `intake`, đều lấy token đọc của `ao-review` trên repo trước khi đọc Jira. Vì vậy hai App phải được cài vào repo trước `/ao-intake`. Bản nháp và dòng "Next:" của `init` đều để bước này sau push, nên cả hai sẽ đổi thứ tự.
- Cài hai App xong thì `/ao-intake` chạy được. Phiên phỏng vấn đưa bốn lựa chọn cho item: Task kiểm khung chạy xanh (cần agent), Task thêm phần nền, không cần item Jira, hay tự gõ. Không lựa chọn nào khớp việc của bước này. Lựa chọn "không cần item" còn mâu thuẫn với hook `commit-msg`, vì hook đòi mã Jira ngay từ commit đầu. Bản nháp chỉ ghi "Claude hỏi vài câu". Bản cuối sẽ ghi nguyên văn câu cần trả lời: một Task cho commit đầu, không agent nào chạy, và Task xong khi CI trên `develop` xanh.
- Câu hỏi thứ hai của phỏng vấn: Task có gồm các cài đặt GitHub không (nhánh mặc định, ruleset, hai secret). Chọn có: `jira-sync` chạy sau mọi lượt CI và cần `JIRA_CI_TOKEN`, nên "CI trên `develop` xanh" phụ thuộc `setup github`. Bản cuối nên đặt `setup github` (phần secret) trước lần push đầu. Nếu không, lượt `jira-sync` đầu tiên sẽ đỏ.
- Câu hỏi thứ ba: nếu CI trên `develop` đỏ sau lần push đầu thì sao, khi ruleset đã chặn push thẳng. Chọn: chạy `lint`, `typecheck`, `test:coverage`, `build` trên máy trước khi push; nếu CI vẫn đỏ thì mở Bug riêng và sửa qua PR. Ba câu hỏi cho một Task đơn giản là nhiều. Bản cuối nên cho sẵn một câu trả lời đủ ba ý: phạm vi, tiêu chí xong, và cách xử lý khi CI đỏ.
- Sau khi bấm cột, `jira:check` còn 1 chỗ lệch: cột `In Review` chưa có giới hạn 2. Bản cuối nên tách giới hạn cột thành một bước bấm riêng. Lần đặt Max thứ nhất không được lưu: API trả `constraintType: issueCount` nhưng không cột nào có `max`. Bước bấm cần nói rõ cách lưu (rời ô, hoặc Publish). Lần đặt thứ hai được lưu (`max=2`), và `jira:check` báo `Jira space AOG matches tracker\jira.yaml`. Nhưng `setup jira` vẫn in dòng "By hand: the columns …" dù không còn chỗ lệch. Kit sẽ sửa để chỉ in dòng đó khi `jira:check` còn lệch.
- Bản nháp của `/ao-intake` kết thúc bằng "Khi bạn trả lời OK, mình tạo Task". Bạn không biết phải trả lời gì, vì hướng dẫn của mình chỉ nói "báo mã Task". Mã Task chỉ có sau khi bạn trả lời "ok". Bản cuối sẽ nói rõ thứ tự này.
- Bạn trả lời "ok" thì `/ao-intake` tạo `AOG-1` (Task, New). `/ao-status` in `Next: waits to be refined`.
- Bước 4, mình làm. Trong `ao-green`, bốn lệnh kiểm đều xanh: `lint` 53 giây, `typecheck` 22 giây, `test:coverage` 42 giây, `build` 34 giây. Commit đầu là `c251670` `chore(scaffold): set up the project with ao-kit (AOG-1)`, gồm 456 file, không có `node_modules`, `.ai/`, `coverage` hay `.env`. `pre-push` cho tạo `develop` và `main` trên remote trống. GitHub tự lấy `develop`, nhánh push đầu tiên, làm nhánh mặc định.
- Lúc commit, git cảnh báo CRLF ở các file của `apps/api`: khung được chép nguyên dòng CRLF của bản checkout kit trên Windows. Git chuẩn hóa về LF khi commit, nên repo không sai. Chỉ là tiếng ồn, có thể sửa bằng cách cho `copyProfile` ghi LF.
- **Hợp đồng không có đường tới Done cho Task không có PR.** `accept` chỉ đi từ `in-qa`, còn `start` và `submit` là của agent và automation. `AOG-1` do người làm, đi thẳng lên nhánh, nên không có đường nào. Cần chọn cách đóng `AOG-1`, và cách bản cuối hướng dẫn cho commit đầu.
- **Actions của `ao-green` tắt.** Sau push, GitHub không ghi nhận workflow nào: `actions/workflows` trả 0, không có lượt chạy, không có event. Tab Actions ghi "Workflows aren't being run on this repository. GitHub Actions is not currently enabled on this repository", kèm nút **Enable Actions on this repository**. Trong khi đó, API `actions/permissions` vẫn trả `enabled: true, allowed_actions: all`. Vậy là có một trạng thái phía GitHub mà API này không thấy. Chưa rõ nguyên nhân: repo không phải fork, không tạo từ template, và là tài khoản cá nhân nên không có chính sách tổ chức. `ao-sample` và `ao-pilot` không gặp. Lượt push đầu xảy ra khi Actions còn tắt, nên bật xong cũng không có lượt chạy nào cho commit đó.
- **Sửa lại ý "chưa rõ nguyên nhân" ở trên:** `ao-sample` đã gặp gần đúng chuyện này ở Pilot 1 (T7, `tasks/archive/pilot-1/verification.md`). Sau lần push đầu lên repo trống, workflow `active` mà không có lượt chạy theo sự kiện nào. Lúc đó sửa bằng một lần push đụng `.github/workflows/`. `ao-pilot` không gặp vì commit đầu của nó được tạo trên giao diện, trước khi có workflow. Spec 2.4 đã ghi "hướng dẫn và `doctor` nhắc", nhưng bản nháp T15 và `doctor` (T13) bỏ sót. Ở T16, triệu chứng khác hơn: tab Actions báo tắt hẳn. Người dùng bấm **Enable Actions on this repository**, rồi sự kiện của PR chạy được ngay, không cần đụng tới `.github/workflows/`.
- Người dùng duyệt ba đề xuất (Lượt 166), bật Actions, xóa file key, nối GitHub for Atlassian. PR #1 `ci(scaffold): run CI for the first time (AOG-1)` chỉ chứa một commit rỗng:
  - `CI` xanh (run 43245798287).
  - `jira-sync` chạy cho sự kiện PR và sau CI, cả hai lần đều in `AOG-1` / `No change`: Task còn ở New, nên không có bước nào áp được.
  - `merge-gate` in `Skipped #1: opened by TungPH7, not by tungph7-ao-dev: whoever opened it merges it`.
- Người dùng merge PR #1 bằng Squash. `develop` là `ff8f322`. Nhánh trên GitHub tự bị xóa, nhờ `setup github` đã bật xóa nhánh sau merge. Lượt `CI` theo sự kiện push trên `develop` (run 43247152735) xanh đủ bốn job: `policy`, `build-test`, `secrets`, `sast`. Sau đó `jira-sync` và `merge-gate` chạy theo `workflow_run`.
- **Sửa lại một ý của chính mình ở Lượt 166:** `doctor` đã có dòng "CI has run on the repo" từ T13, kèm cách sửa của Pilot 1. Chỉ bản nháp hướng dẫn là bỏ sót. Dòng đó nay tách làm hai:
  - "GitHub knows the workflows of the repo" (`actions/workflows`), cách sửa là bấm **Enable Actions on this repository**;
  - "CI has run on develop", cách sửa là `gh workflow run CI --repo <repo> --ref develop`.
- Sửa kit trên nhánh, mỗi sửa có test đỏ trước:
  - `ci.yml` có `workflow_dispatch` (`881371f`);
  - commit gốc không cần mã Jira (`b737554`);
  - `init` thêm `origin` và in `Next:` theo thứ tự của hướng dẫn, riêng cho thư mục trống và repo có code (`76c9b0d`);
  - `setup jira` in từng chỗ lệch, và không in "By hand" khi `jira:check` sạch (`73f4595`);
  - `doctor` (`bedb035`).
- `doctor ao-green` (bản kit trên nhánh): 22 dòng đạt, 2 dòng chưa đạt.
  - "the kit files are those of this clone": 6 file. Đúng là các file mình vừa sửa trên nhánh: `git-hooks.mjs`, `doctor.mjs`, `init.mjs`, `setup-jira.mjs`, `commit-msg.mjs`, `ci.yml`. Bản kit trong `ao-green` có trước các sửa đó. Đây là kết quả mong đợi.
  - "MCP servers atlassian, chrome-devtools allowed": `claude mcp list` trong `ao-green` báo cả hai `⏸ Pending approval`. `~/.claude.json` ghi `enabledMcpjsonServers: []` cho thư mục này, và không có `.claude/settings.local.json`. Phiên `/ao-intake` vẫn dùng được server `atlassian`: `AOG-1` do `orchestratoragent` tạo. Vậy lần cho phép trong phiên đó không được lưu lại. Cần biết hộp thoại cho phép MCP có những lựa chọn nào, để bản cuối chỉ đúng lựa chọn có lưu.
- `ao-step status` trong `ao-green` chạy được: `AOG-1` ở New, ba môi trường trống.
- `setup github` với key thứ hai (người dùng tải về `ao-keys`, không đổi tên) đã đặt: xóa nhánh sau merge, Dependabot, bốn environment, luật nhánh của `merge-gate`, `JIRA_CI_TOKEN`, `AO_DEV_APP_KEY`. Lệnh nhắc xóa file key. `gh:protect` báo soft mode: repo private trên gói Free không có ruleset, nên `merge-gate` và `audit` giữ gate. Vì vậy mục "bật ruleset ao-protected" trong bản nháp `AOG-1` không xảy ra. Chạy lần hai, lệnh không ghi gì và in `Already set: …` đủ bảy mục.
- Sau lỗi `App … is not installed`, Node trên Windows in thêm `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` khi thoát. Đây là tiếng ồn của libuv, lệnh vẫn dừng đúng. Cần ghi nhận, chưa sửa.

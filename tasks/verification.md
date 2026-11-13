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

**T16, dựng mới `ao-green`, 2026-11-12 (xong).** Repo private `TungPH7/ao-green` được tạo rỗng. `ao-kit init` vào thư mục trống cạnh `ao-sample` chạy hết trong 144 giây: chép khung 162 file, chép kit, thêm `prepare`, `npm ci --prefix .ai-orchestrator`, render, `npm ci`, cài Chromium của Playwright. `setup jira` thấy space `AOG` và board 36 đã có từ T2, `jira:check` còn 5 chỗ lệch về cột.

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
- Mở lại `claude` trong `ao-green`, hộp thoại MCP của Claude Code 2.1.322 là: "2 new MCP servers found in this project. Select any you wish to enable." Hai ô đánh dấu `atlassian` và `chrome-devtools` được chọn sẵn, nút **Enable selected**; phím Space chọn, Esc từ chối tất cả. Không có lựa chọn "all future servers". Ngay sau đó, `claude mcp list` vẫn báo `Pending approval`, và `~/.claude.json` vẫn ghi `enabledMcpjsonServers: []`: hoặc hộp thoại chưa được xác nhận, hoặc Claude Code chỉ ghi khi thoát. Đang kiểm.
- `AOG-1` đã ở Cancelled. Người dùng đóng, kèm comment trỏ tới `c251670` và PR #1.
- `ao-step status` trong `ao-green` chạy được: `AOG-1` ở New, ba môi trường trống.
- `setup github` với key thứ hai (người dùng tải về `ao-keys`, không đổi tên) đã đặt: xóa nhánh sau merge, Dependabot, bốn environment, luật nhánh của `merge-gate`, `JIRA_CI_TOKEN`, `AO_DEV_APP_KEY`. Lệnh nhắc xóa file key. `gh:protect` báo soft mode: repo private trên gói Free không có ruleset, nên `merge-gate` và `audit` giữ gate. Vì vậy mục "bật ruleset ao-protected" trong bản nháp `AOG-1` không xảy ra. Chạy lần hai, lệnh không ghi gì và in `Already set: …` đủ bảy mục.
- Sau lỗi `App … is not installed`, Node trên Windows in thêm `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` khi thoát. Đây là tiếng ồn của libuv, lệnh vẫn dừng đúng. Cần ghi nhận, chưa sửa.
- **T16 xong (Lượt 169).** Kit PR #256 (`bd01ebc`) chứa các sửa ở trên, bản nháp hướng dẫn với phần 3 viết lại thành 10 bước, và log các lượt 157–169.

**T17, repo đang có `ao-brown`, 2026-11-12–13 (xong, chờ Cancel `AOG-2`, `AOG-3`).** Bạn duyệt cách làm ở Lượt 170: Task chép kit, commit lên `develop` mới, rồi Cancel Task, 0 USD tiền agent.
- Dựng repo giả "đang phát triển": `gh repo create TungPH7/ao-brown --private`. Code lấy từ `main` của `ao-sample` (`2e69e47`, v0.1.0) bằng `git archive`. Gỡ `.ai-orchestrator/`, `.claude/`, `.githooks/`, `.github/`, `.jira/`, `.mcp.json`, `docs/`, `CHANGELOG.md`, script `prepare` và bốn dòng của kit trong `.gitignore`. Kết quả: 70 file, một commit `Initial commit` trên `main`, đã push. Repo chưa có workflow nào.
- `ao-kit init ao-brown` (kit `bd01ebc`), 12 giây:
  - `init` thấy repo có code, nên chỉ chép kit, không đụng file app. Lệnh thêm bốn dòng `.gitignore` và script `prepare`, chạy `npm ci --prefix .ai-orchestrator` và render. `origin` đã có và đúng repo, nên không có ghi chú gì về nó.
  - `Missing` báo đúng hai việc: `deploy.yaml` và nhánh `develop`. Bốn script và `playwright.config` đã có, nên không bị báo.
  - Dòng `Next:` là bản cho repo có code.
- `project.yaml` nháp đoán đúng cổng (`api` 3001, `web` 3000) và `health` của `api` (`/health`). `health` của web đoán là `/`, nhưng `ao-sample` chuyển `/` sang `/notes`. Đúng như hướng dẫn dặn, người dùng phải kiểm lại phần này.
- Bước 2 (mình làm như một dev): viết `deploy.yaml` từ bản của `ao-sample`, rồi `git switch -c develop`. `ao-kit check` bắt hai chỗ lệch giữa `project.yaml` và `deploy.yaml`: `C1 apps.web.health` (`/` và `/notes`) và `C1 apps.web.public`. Sửa `project.yaml` (`health: /notes`, `public: true`), chạy lại thì `project.yaml OK`. `render` không đổi file nào.
- **Chỗ thiếu của hướng dẫn và của `Next:`:** với repo có code, `init` không chạy `npm ci` của app. Vì vậy hook git chưa được cài: `core.hooksPath` trống. Phải chạy `npm ci` (101 giây ở đây), script `prepare` mới đặt `core.hooksPath` thành `.githooks`. Phần 4 cần thêm bước này, trước commit chép kit.
- **Chỗ thiếu nhỏ:** repo có code không nhận `roster.local.yaml`, nên không có skill theo stack (`vercel-react-best-practices`, `nestjs-best-practices`), dù `init` đoán được profile `nextjs` và `nestjs`. `doctor` không báo điều này.
- `setup jira ao-brown`: space `AOG` và board đã có, `jira:check` sạch, lệnh không in "By hand".
- Người dùng cài hai App, nối GitHub for Atlassian, tạo key thứ hai và mở `claude`, chọn **Enable selected**. Sau đó chạy `/ao-intake` với đoạn mẫu đủ ba ý: phạm vi, tiêu chí xong, CI đỏ. Phiên phỏng vấn vẫn hỏi thêm hai câu, và lần nào cũng tự đoán đúng:
  - `main` có giữ nguyên tới lần release đầu không, và sau Task này nhánh mặc định là gì. Lý do của câu hỏi: `jira-sync` và `merge-gate` chạy theo `workflow_run`, chỉ đọc từ nhánh mặc định.
  - Nếu CI xanh mà `doctor` còn dòng chưa đạt thì làm sao.
  Bản cuối sẽ thêm hai ý này vào đoạn mẫu. Task tạo ra là `AOG-2`.
- Bốn lệnh kiểm trong `ao-brown` đều xanh: `lint` 59 giây, `typecheck` 13 giây, `test:coverage` 44 giây, `build` 29 giây. Commit `7592738` `chore(kit): add the ai-orchestrator kit (AOG-2)` lên `develop` mới, không có file nhạy cảm. `.claude/skills` có 110 file, không có skill theo stack. Push `develop` qua được `pre-push`, vì nhánh này chưa có trên remote.
- `setup github ao-brown` chạy ngay sau push, lần này cả bảy mục đều là `Set …`, gồm đổi nhánh mặc định sang `develop`.
- Lần push này kéo theo lượt `CI` theo sự kiện ngay: GitHub ghi nhận 4 workflow (`CI`, `jira-sync`, `merge-gate`, `Dependabot Updates`). Khác `ao-green` vì workflow lên ở lần push thứ hai, khi repo đã có commit. Ở `ao-pilot` cũng vậy. Dependabot chạy ngay một lượt cập nhật bảo mật `minimatch`, vì `setup github` vừa bật nó.
- **CI đầu trên `develop` đỏ ở `sast`** (run 43266874472; `policy`, `build-test`, `secrets` xanh). Semgrep bắt `spawn-shell-true` ở `scripts/dev.mjs`, dòng `spawn('npm', args, { …, shell: process.platform === 'win32' })`.
  - Push một nhánh mới thì `github.event.before` toàn số 0, nên `ci.yml` cho Semgrep quét **toàn bộ repo**, không có baseline. Comment của job lại ghi "only findings the changes bring count". `gitleaks` thì chỉ quét commit đầu nhánh.
  - Dòng đó có ở ba nơi: code cũ của `ao-brown`, `develop` của `ao-sample`, và **khung `next-nest` của kit**. Trước giờ không lần nào bắt được: mọi lượt CI của PR và của push có commit trước đều có baseline. Lần đầu của `ao-green` đáng lẽ quét toàn bộ, nhưng lúc đó Actions tắt.
  - `ao-sample` đã gặp chính lỗi này ở `release/v0.1.0` (run 42752980376, 2026-11-10): lượt đầu đỏ, lượt push sau xanh nhờ có baseline. Chưa ai ghi lại. T18 (`release/v0.2.0`) sẽ gặp lại.
  - Kit đã sửa (`fix(scaffold): start npm without a shell …`, test đỏ trước): `scripts/dev.mjs` của khung chạy `npm-cli.js` bằng `node` (`npm_execpath`, hoặc file cạnh `node`), như `lib/quality/npm.mjs`. Đã chạy thật trong `ao-green`: web 200, api 200 sau 37 giây, dừng cây tiến trình xong thì cổng được giải phóng.
  - Với `ao-brown`, theo đúng Task `AOG-2`: CI đỏ thì mở Bug riêng và sửa qua PR.
- Phỏng vấn Bug hỏi thêm một câu: PR do người mở và tự merge, không có review của agent, đúng không. Claude đoán đúng, kèm lo ngại `audit` sẽ chặn lần deploy đầu. Lo ngại này không đúng ở đây: deployer chỉ audit từ một commit mốc đặt lúc đưa dự án lên VPS (`lib/release/deployer.mjs`, `auditsOf`). Bug tạo ra là `AOG-3`.
- PR `ao-brown` #1 `fix(scripts): start npm without a shell in the dev script (AOG-3)`, nhánh `bugfix/AOG-3-dev-script-shell`. Trước khi push, mình chạy thử bản mới của `scripts/dev.mjs`: web 307 (sang `/notes`), api 200, sau 11 giây.
  - CI của PR: `sast` xanh (có baseline), `policy`, `secrets`, `jira-sync` xanh.
  - `build-test` đỏ ở bước coverage của dòng đổi: `coverage-diff: scripts/dev.mjs is not in any lcov file`. Luật `coverage` của `quality/gates.yaml` coi mọi file `.mjs` là source, chỉ trừ config, test, `e2e/` và bản kit. Vì vậy script chạy app ở máy cũng phải có trong lcov. Khung `next-nest` cũng có `scripts/dev.mjs`, nên mọi sửa ở đó trong dự án dựng mới đều vấp luật này.
- Bạn duyệt hai luật (Lượt 177). Kit sửa ở hai commit, mỗi commit có test đỏ trước:
  - `quality/gates.yaml`: `coverage.exclude` thêm `scripts/**`;
  - `ci.yml`: push nhánh mới thì Semgrep chỉ quét commit đầu nhánh, còn commit gốc và lượt chạy tay thì quét toàn bộ. Test chạy thật đoạn script của job bằng bash, với `uvx` giả, đủ năm trường hợp.

  Lần chạy test đầu, bash gọi nhầm `uvx` thật trên máy: đường dẫn Windows có `:` làm tách `PATH`. Test giờ dùng `$PWD/bin`.
  - `check-policy` không coi việc thêm mục vào `coverage.exclude` là hạ chuẩn: `loweredThresholds` chỉ xét `changed_lines_min`, `audit_level` và các danh sách bị mất mục. Chỗ này được giữ bởi việc `gates.yaml` là đường dẫn được bảo vệ, chỉ bạn merge.
- Bạn hỏi vì sao lại merge một PR có CI đỏ (Lượt 178). Mình đổi cách: đưa luật coverage mới vào chính bản kit của `ao-brown` trong PR #1 (`ee0bc2e`, chép `quality/gates.yaml` của kit). CI chạy lại xanh đủ: `policy`, `build-test`, `secrets`, `sast`, `jira-sync`. GitHub vẫn cho bấm merge PR đỏ, vì repo private trên gói Free không có ruleset (soft mode). Hướng dẫn nên nói rõ điều này: CI đỏ thì không merge, kể cả khi nút vẫn bấm được.
- Bạn merge PR #1 bằng Squash (`498c769`). Lượt `CI` theo push trên `develop` (run 43273419038) xanh đủ bốn job, kể cả `sast`.
- `doctor ao-brown`: mọi dòng đạt, gồm cả MCP và tin cậy thư mục, trừ "the kit files are those of this clone". Dòng này lệch 1 file: `.github/workflows/ci.yml`. Đó là luật Semgrep mới, sửa sau khi kit đã chép vào `ao-brown`. Mong đợi, như 6 file của `ao-green` ở T16.
- Phần 4 của hướng dẫn viết lại thành 8 bước, theo đúng những gì đã chạy. Đoạn mẫu của `/ao-intake` có thêm hai ý mà phỏng vấn đã hỏi: `main` giữ nguyên tới lần release đầu, và cách sửa khi `doctor` chưa đạt.
- Lượt cập nhật bảo mật `minimatch` của Dependabot đỏ. Chưa tìm hiểu, vì không chặn T17.
- Ở Lượt 171 mình đoán lượt CI đầu trên `develop` sẽ không kéo theo `jira-sync`. Đoán sai: `jira-sync` vẫn chạy (`workflow_run`, xanh), vì `setup github` đã đổi nhánh mặc định sang `develop` trước khi CI chạy xong.
- `AOG-2`, `AOG-3` Cancelled (Lượt 180). Kit PR #257 (`506b002`).

**T18, release `v0.2.0` của `ao-sample`, 2026-11-13 (xong).** Từ Lượt 181, bạn cho mình tự làm theo đề xuất; mình chỉ hỏi khi tới merge, gate ④ và ⑤, và các nút bấm trên Jira.
- `/ao-release` (dòng kiểm, 13 giây):
  - `develop` có 5 commit kể từ `v0.1.0`; điểm cắt là `61f4cec`, cũng là đầu `develop`;
  - item vào `v0.2.0`: `SMP-22`, `SMP-24`;
  - `STOP: gate ④ waits for the Fix Version v0.3.0 on Jira`. Bạn tạo `v0.3.0` rồi duyệt gate ④.
- `/ao-release v0.2.0 61f4cec --go`, 35 giây, không chạy agent:
  - Fix Version `v0.2.0` được gắn vào `SMP-22`, `SMP-24`;
  - nhánh `release/v0.2.0` được tạo tại `61f4cec`, dưới tên `tungph7-ao-dev[bot]`.

  Deployer đưa lên Staging: deployment 7745767125 tạo lúc 18:16:12Z, `success` lúc 18:16:40Z.
- `/ao-ship v0.2.0`: dòng kiểm in `GO` với ba bước: `qa` regression (`high`), `devops` release notes (`high`), rồi script mở PR release. Lượt chạy thật bắt đầu lúc 18:17:34Z, tổng cộng 396 giây.

| Lượt | Model, effort | Kết quả | USD | Phút |
|---|---|---|---|---|
| `qa` regression trên Staging | Opus, `high` | 54/54 E2E qua (1 `@local`, 53 trên Staging), 43,5 giây; `Result: PASS`; không có Bug mở | 0,42 | 2 |
| `devops` release notes | Opus, `high` | `changelog.md`, `pr-description.md`, `fix-version.md` | 0,63 | 1,6 |

  - `gh-guard` chặn một lệnh của `qa`: "do not put the basic auth password on a command line". Lệnh đó là bước kiểm `qa` tự thêm, nên agent bỏ qua và đi tiếp, đúng luật.
  - Script commit `docs/releases/v0.2.0.md` và `CHANGELOG.md` (`33a2933`, tên `tungph7-ao-dev[bot]`), rồi mở PR #28 từ `release/v0.2.0` vào `main`. Kết quả: `STOP: gate ⑤: PR #28 … waits for your approval on its head 33a29330`.
- **CI của `release/v0.2.0` đúng như đã báo trước:**
  - Lượt push đầu (`61f4cec`, run 43278006032) đỏ ở `sast`, vì `scripts/dev.mjs` (`spawn-shell-true`). Ba job kia xanh.
  - Lượt push và lượt PR của `33a2933` đều xanh, nhờ có baseline.
  - Staging đã deploy `33a2933` lúc 18:24:04Z. Lượt đỏ đầu tiên không chặn gì.
- **Gate ⑤:** bạn làm UAT trên Staging rồi approve PR #28.
  - `jira-sync` chạy theo review. `merge-gate` merge PR lúc 18:30:10Z (`ab62bfb`, `app/tungph7-ao-dev`), sau khi bạn approve chưa tới một phút, và gắn tag `v0.2.0` tại `ab62bfb`.
  - Production deployment 7746116760: tạo lúc 18:30:49Z, `success` lúc 18:31:17Z.
  - Kiểm từ ngoài: `/notes` 200, `/api/notes` 200 với `{"data":[]}`. Ghi chú mất sau mỗi lần deploy, như Known Issues đã ghi.
  - PR #29 `Merge main into develop after v0.2.0`: CI xanh, `merge-gate` merge lúc 18:32:51Z (`b189631`).
- **Release trên Jira** (Lượt 184, bạn nhờ mình làm): một script dùng token admin của bạn, gọi `PUT /rest/api/3/version/10004`. Kết quả: `v0.2.0` thành `released: true`, `releaseDate` 2026-11-13, mô tả là nguyên văn `fix-version.md` (1537 ký tự, Jira nhận đủ). Trước khi ghi, script kiểm cả hai item `SMP-22`, `SMP-24` đều Done. Đây là bước người dùng có thể giao cho phiên chính. Bản cuối của hướng dẫn nên ghi cả hai cách: tự bấm, hoặc nhờ Claude.
- **Complete `SMP-23`** (Lượt 185, bạn nhờ mình làm): script kiểm Epic có một item con là `SMP-24` (Done, `v0.2.0`), thấy có transition `Complete`, rồi `POST` transition đó, nhận 204. `SMP-23` giờ ở Done, resolution Done.
- `/ao-status` của `ao-sample`: `Running: Development b1896318, Staging 33a29330, Production v0.2.0 (ab62bfbf)`. Item còn chờ bạn duy nhất: Epic `SMP-19` ở New.
- **T18 xong.** Tổng tiền agent 1,05 USD. Thời gian từ dòng kiểm `/ao-release` tới Production khoảng 16 phút (18:15–18:31Z), kể cả thời gian bạn làm UAT.

**T19, bản cuối của `docs/getting-started.md`, 2026-11-13.**
- Phần 5 viết theo `SMP-23`, từ `/ao-intake` tới `Complete`, thành 10 bước. Số liệu lấy từ `state.json` của `.ai/runs/SMP-23/` và `.ai/runs/SMP-24/` trong `ao-sample`, cùng `.ai/runs/v0.2.0/last.md`:
  - 35 lượt agent, khoảng 208 phút thời gian agent, khoảng 55,1 USD (T20 của `human-loop` 54,08 USD, cộng `/ao-ship` 1,05 USD);
  - từng giai đoạn: SPEC 9 lượt 6,10 USD; plan 5 lượt 8,80 USD; build 3 lượt 13,45 USD; xem trước, sửa và yêu cầu 6 lượt 7,26 USD; review 2 lượt 5,88 USD; vòng QA fail, làm lại và QA lại 8 lượt 12,46 USD; release 2 lượt 1,05 USD.
- Câu gõ sau tên lệnh ở bước 1, 5, 7 là bản rút gọn. Lần chạy thật của intake ở T20 dùng một phiên `claude -p`, không có một câu `/ao-intake` gõ sẵn. Hướng dẫn ghi rõ điều này.
- Phần 6 thêm cú pháp `be:`/`fe:`, câu hỏi "yêu cầu đổi gì" của `/ao-fix`, và các thay đổi của `ao-kit` từ T16, T17. Phần 7 gồm: cập nhật kit, hết usage, CI đỏ, lỗi trên Production (hotfix, rollback), khi một lệnh dừng, và bảng tài liệu đọc thêm.
- `README.md`: mục cài kit bỏ danh sách 9 bước, chỉ còn trỏ tới hướng dẫn, kèm danh sách những gì `init` và `sync` chép vào dự án (test `repo.test.mjs` đòi các ý này).
- Test mới trong `tests/repo.test.mjs` kiểm: README trỏ tới hướng dẫn và không còn danh sách bước; hướng dẫn có đủ bảy phần; không còn ghi chú "Bản nháp"; phần 5 có `SMP-23` tới `Complete`. Test này viết sau khi nội dung đã có, nên không có lần đỏ trước. Lần chạy đầu của nó đỏ vì chính nó bắt nhầm chữ "bản nháp" của `/ao-intake`, đã thu hẹp lại.
- Năm lệnh kiểm xanh (1278 test).

**T20, chép kit `8a8d8ef` vào `ao-sample`, 2026-11-13 (đang làm).** Bạn duyệt ở Lượt 186.
- Task `SMP-27` "Chép kit 8a8d8ef vào ao-sample bằng ao-kit sync" (New, nhãn `ao-devops`) được tạo bằng token CI, mô tả theo template Task, giống cách đã làm với `SMP-22`. Kế hoạch ghi dùng `/ao-intake`, nhưng phiên phỏng vấn cần bạn trả lời từng câu; với một Task mà nội dung đã rõ, tạo thẳng thì nhanh hơn. Đây là một chỗ lệch so với plan.
- `ao-kit sync ao-sample --key SMP-27 --name sample`, 17 giây:
  - viết `project.yaml` từ `.claude/settings.json`, `preview.yaml` và `deploy.yaml`, rồi xóa `preview.yaml`;
  - chép kit, chạy `npm ci --prefix .ai-orchestrator` và render;
  - commit `20f90e3` `chore(kit): copy the kit at 8a8d8ef9 (SMP-27)` trên `feature/SMP-27-kit-copy`, 31 file, +1658/−261. Lệnh không push.
- `project.yaml` sinh ra khớp cấu hình thật: `name: sample`, space `SMP`, hai App, `kit_peers: [TungPH7/ao-pilot]`, `api` ở 3001 với `/health`, `web` ở 3000 với `/notes` và `public: true`. `ao-kit check` báo OK. `doctor ao-sample` trên nhánh này: `Every row passes.`
- Nhánh đã push. Chờ bạn bấm `Refine` (duyệt Task trực tiếp).
- Lượt 187, bạn nhờ bấm Refine:
  - mô tả `SMP-27` được ghi lại với ô DoR cuối đã đánh dấu, ghi rõ "Lượt 187, trong chat"; ô này là chữ `[x]` trong mô tả, không phải task list của Jira;
  - `Refine` chạy bằng token admin của bạn, nhận 204, item sang Ready.
- Start làm như với `SMP-22`: token CI ghi trường Agent là DevOps Engineer và comment lý do (Task chép kit, không có agent build), rồi `Start` qua Rovo MCP bằng token agent. `SMP-27` sang In Progress.
- `ao-pr create` mở PR nháp #30 dưới tên bot `ao-dev`. Trong shell của phiên chính, `ao-pr` báo `AO_DEV_APP_ID is not set`: Claude Code đặt các biến `AO_*` từ `settings.json` cho phiên trong dự án, còn shell của phiên chính ở thư mục khác thì không có. Lấy giá trị từ `.claude/settings.json` (không phải secret) thì chạy được. Câu Risks trong mô tả PR được sửa lại: `/ao-review` chạy bằng bản kit của `develop` (`c6fdfa8`).
- CI của PR #30 xanh: `policy`, `build-test`, `secrets`, `sast`, `jira-sync`.
- `/ao-review 30`, dòng kiểm: `pr-ready`, rồi `reviewer` (`xhigh`), rồi `security` (`max`, vì PR chạm đường dẫn được bảo vệ). Lượt chạy thật bắt đầu.
- `/ao-review 30` chạy 1732 giây, 8,89 USD:
  - `pr-ready` chuyển PR sang sẵn sàng; `jira-sync` đưa `SMP-27` sang In Review.
  - `reviewer` (`xhigh`, 47 lượt, 6,8 phút, 2,31 USD): Critical 0, High 0, Medium 1, Low 4. Bản chép khớp từng file với kit `8a8d8ef`, bốn mục checklist của Task đạt.
  - `security` (`max`, 68 lượt, 21 phút, 6,58 USD): Critical 0, High 0, Medium 1, Low 0. Kết luận Approve.
  - **Medium chung của hai báo cáo, `ci.yml:12`:** `workflow_dispatch` (thêm ở T16) nhận mọi nhánh. Chạy tay trên nhánh của một PR thì bốn check cùng tên vẫn ghi lên head của PR, nhưng bỏ các phần chỉ chạy trên PR: quy ước, suppression, hạ chuẩn, coverage của dòng đổi, gitleaks quá commit đầu. `gh-guard` không chặn `gh workflow run`. Cách sửa đề xuất: mỗi job thoát 1 khi chạy tay trên nhánh không phải `develop`, `main`, `release/*` (thoát lỗi chứ không bỏ qua, vì job bị bỏ qua vẫn tính là đạt); chặn `gh workflow run` với agent.
  - **Low của `reviewer`:** comment của `gates.yaml` còn nhắc `preview.yaml`; hook `commit-msg` coi "git không chạy được" và nhánh mồ côi là commit gốc; một ca hiếm trong `runner.mjs` (stash đã áp lại rồi mà lần chạy tiếp vẫn trỏ tới nó); khoảng 715 dòng code `ao-kit` được chép vào dự án dù dự án không gọi (đúng thiết kế).
- `/ao-review` dừng ở gate ③: PR sửa đường dẫn được bảo vệ, nên bạn approve rồi tự merge.
- Lượt 188: bạn approve và merge PR #30 lúc 00:41:53 UTC, commit `fd5c848` trên `develop`.
  - CI của push xanh (00:43:13). Deploy lên Development `success` lúc 00:43:35 (deployment 7753776646).
  - Từ 00:43:10, GitHub không khởi động job nào nữa: "The job was not started because recent account payments have failed or your spending limit needs to be increased". Hai lượt `jira-sync` theo `deployment_status` và hai lượt `merge-gate` đỏ vì lý do này, không phải vì code. `SMP-27` vẫn ở In Review.
  - Spec `quality-gates` mục "Phút Actions" đã lường trước: một vòng PR chuẩn tốn khoảng 37 phút, tức khoảng 54 vòng mỗi tháng ở gói Free. Tháng 11 có năm repo riêng tư chạy CI (kit, `ao-sample`, `ao-pilot`, `ao-green`, `ao-brown`).
  - Đang chặn: `/ao-preview` (cần CI xanh trên PR), `/ao-qa SMP-27` (cần `jira-sync` đưa item sang In QA; chạy lại lượt 43339342556 khi Actions chạy lại được), và CI của kit PR.
- Sửa trong kit theo review, có test đỏ trước, chưa push:
  - **Medium:** mỗi job của `ci.yml` có bước đầu "By hand only on develop, main or release/*", chỉ chạy khi `workflow_dispatch`, thoát 1 trên nhánh khác. Test kiểm bốn job cùng bước đầu và chạy đoạn script bằng bash với 3 ref được phép, 6 ref bị chặn. `gh-guard` chặn agent chạy `gh workflow run`, `enable`, `disable`; vẫn cho `gh workflow list`, `view` và `gh run rerun`.
  - **Low:** comment của `gates.yaml` nói đúng `project.yaml`; `commit-msg` coi là commit gốc chỉ khi `git rev-list -n 1 --all` chạy được và không ra commit nào (nhánh orphan và lúc `git` lỗi vẫn cần mã); `runner.mjs` bỏ `wip` khỏi bản ghi ngay sau khi áp lại stash, nên lượt không bắt đầu được thì lệnh sau không nhắc stash đã xóa.
  - Low thứ tư (code `ao-kit` chép vào dự án) đúng thiết kế, không sửa.
  - Spec `quality-gates`, `project-scaffold`, `live-run-fixes` và `docs/quality-gates.md` đổi theo.
  - Năm lệnh kiểm xanh (1281 test).

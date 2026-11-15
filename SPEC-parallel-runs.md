# SPEC: parallel-runs

> **Module:** `parallel-runs`, phần tối thiểu của C2 "Lớp chạy song song" trong
> [misc/thao-luan/concerns.md](misc/thao-luan/concerns.md). Phân tích trước đó:
> [c2-toi-thieu-giua-pilot-3.md](misc/thao-luan/sdlc-song-song/c2-toi-thieu-giua-pilot-3.md) (Phiên 32 · Lượt 15),
> [sdlc-song-song-sua-kit-hay-clone.md](misc/thao-luan/sdlc-song-song-sua-kit-hay-clone.md) (concern 2).
>
> **Trạng thái:** đã duyệt 2026-11-15 (Phiên 32 · Lượt 35), cả 8 điểm ở mục 12, cộng "mỗi lúc một QA trên một môi
> trường" và việc QA kiểm bản đang chạy (mục 5.1). Viết ở Lượt 17, sửa ở Lượt 18–34, trong lúc `SHOP-7` của Pilot 3 chạy
> lần lượt. Làm ngay, song song với `SHOP-7` (điểm 7).

Tên module: hai lệnh `ao-step` chạy cùng lúc trên hai item khác nhau, mỗi item một worktree.

## 1. Mục tiêu

**Hiện nay:**
- Mỗi dự án chỉ có một agent chạy tại một thời điểm. Có một khóa cho cả dự án (`.ai/runs/active.json`), và runner được
  viết để agent chạy lần lượt (`lib/workflow/runner.mjs:24`).
- Build và fix chuyển cả thư mục dự án sang nhánh của item (`prepareCheckout`, `scripts/ao-step.mjs:447`).
- Trong lúc một item chờ review, chờ QA hay chờ bạn duyệt, không agent nào làm item khác.

**Sau module này:**
- Bật `runs.lanes_max: 2` trong `project.yaml` thì phiên chính chạy được hai lệnh `ao-step` cùng lúc, trên hai item khác
  nhau. Ví dụ `/ao-build SHOP-13` (`be-dev`) cùng lúc với `/ao-review 19`, hay với `/ao-build SHOP-11` (`fe-dev`).
- Build và fix của mỗi item chạy trong worktree riêng của item, đặt ngang hàng với thư mục dự án. Thư mục chính luôn đứng
  ở `develop`.
- Mỗi chỗ chạy có một dải cổng riêng cho dev server và E2E, nên hai item không giành cổng và không test nhầm server của
  nhau.
- `/ao-status` cho thấy các lượt đang chạy và các worktree đang có.
- Mặc định `runs.lanes_max: 1`: kit chạy y như hiện nay, kể cả build trong thư mục chính. Không dự án nào bị đổi nếu không
  bật.

**Ngoài phạm vi:**
- Bộ điều phối tự đọc board rồi mở lượt chạy (phần còn lại của C2, `orchestrator-cli`). Phiên chính vẫn chọn lệnh.
- `reviewer` chạy song song với `security` trong cùng một review.
- Nâng giới hạn WIP 1 cho mỗi dev agent (`contract/policies.yaml:12`): cần sửa contract và board Jira.
- `/ao-preview` song song: nó vẫn dùng thư mục chính, và chỉ chạy khi không có lượt nào khác.
- Hơn 2 lượt cùng lúc; `multi-repo` (D1).

## 2. Đã thử trước (Phiên 32 · Lượt 17)

Ba điểm mà bản phân tích ở Lượt 15 coi là phải chạy thử, đã thử bằng `claude` 2.1.325 trên máy này, trong một repo tạm
có một git worktree. Script ở `scratchpad/c2probe-*.mjs`.

| Câu hỏi | Kết quả |
|---|---|
| Ở chế độ `-p`, agent trong một worktree chưa từng duyệt có nạp MCP của `.mcp.json` không? | **Có.** Server ở trạng thái `connected`, có tool của nó, không cần `enabledMcpjsonServers`. Tài liệu cũng ghi: "Connected without asking, approved or not" (code.claude.com/docs/en/permissions) |
| `--resume <id>` có tìm được phiên tạo ở thư mục chính khi chạy từ worktree không? | **Có.** Phiên trả lời đúng con số đã nhớ. Tài liệu: Claude Code tìm ID trong project hiện tại và các git worktree của nó (code.claude.com/docs/en/sessions) |
| Hook `PreToolUse` của `.claude/settings.json` có còn chặn trong worktree chưa được tin cậy không? | **Có.** Hook trả `deny` thì lệnh không chạy, có 1 permission denial. Các guard của kit (`gh-guard`, `jira-guard`…) vẫn có hiệu lực |

**Chưa phân biệt được:** `permissions.allow` của `.claude/settings.json` có bị bỏ qua ở worktree chưa tin cậy hay không.
Trên máy này, cài đặt ở cấp người dùng đã cho phép sẵn, nên lệnh chạy được cả khi không có hook. Agent của kit không dựa
vào `permissions.allow`: quy tắc duy nhất của `shop` là cho phiên chính chạy `ao-step`. [Inference] Điểm này không chặn
module.

## 3. Hai phần và thứ tự

| Phần | Việc | PR của kit | Cần xong trước |
|---|---|---|---|
| 1 | Worktree theo item cho build và fix, bật bằng `runs.worktrees: true`, vẫn chạy lần lượt | Một PR | |
| 2 | Khóa theo item, trần `runs.lanes_max`, chốt RAM, dải cổng theo chỗ chạy, `/ao-status` | Một PR | Phần 1 |

Mỗi phần merge riêng, có test, và để kit dùng được. Phần 1 có ích ngay cả khi chưa có phần 2: thư mục chính không còn bị
chuyển nhánh, nên bạn mở được nó trong VS Code mà không đụng agent. `runs.lanes_max: 2` đòi `runs.worktrees: true`.

## 4. Phần 1: worktree theo item

### 4.1 Vị trí và tên

- Đường dẫn: `<thư mục cha của dự án>/<tên dự án>-wt/<KEY>`. Với `shop`:
  `D:\Document\1Khoahoc\4LapTrinh\AI-for-coding\e-commerce\shop-wt\SHOP-13`.
- Đặt ngang hàng với dự án, không đặt bên trong. Nếu đặt bên trong, VS Code, TypeScript, ESLint và Vitest của thư mục
  chính sẽ quét luôn các bản sao. Đường dẫn ngắn cũng tránh giới hạn 260 ký tự của Windows với `node_modules`.
- Tên theo item, không theo chỗ chạy. Agent tiếp tục đúng phiên theo đường dẫn, nên một item giữ một worktree từ build,
  fix, tới lúc build lại sau `QA fail` (`-r2` đổi nhánh ngay trong worktree đó).

### 4.2 Vòng đời

1. **Tạo** ở lượt build đầu: `git worktree add -b <nhánh> <đường dẫn> origin/develop`, với `--no-track` như
   `prepareCheckout` (`scripts/ao-step.mjs:457`).
2. **Cài package** bằng trình quản lý của lockfile (`managerFromLockfile`). Lệnh cài giống ở thư mục chính, có chạy
   install script như ở thư mục chính. Không nối `node_modules` bằng junction: lần trước, xóa một worktree đã làm rỗng
   `node_modules` chính.
3. **Chép các file không có trong git** mà `project.yaml` liệt kê ở `runs.copy`, ví dụ `apps/api/.env`, `.env.development`.
   Đây là danh sách cố định, giống ý `.worktreeinclude` của Claude Code. Không chép `.claude/settings.local.json`.
4. **Dùng lại** ở fix và build lại: kéo nhánh của PR về (`merge --ff-only`) như `prepareCheckout`. Worktree bẩn thì dừng,
   như thư mục chính bây giờ. Phần việc dở của lượt bị dừng đi qua `saveWip` và `restoreWip`, chạy trong worktree.
5. **Gỡ** khi PR của item đã merge hay đóng, và item đã qua In Review:
   - chép `.ai/ledger/<KEY>.md` của worktree về thư mục chính;
   - `git worktree remove --force`, rồi `git worktree prune`;
   - không bao giờ dùng `gh pr merge --delete-branch` ở máy.

   Việc gỡ chạy ở đầu mỗi lệnh `ao-step`, cho các worktree có PR đã đóng.

### 4.3 Thứ chạy trong worktree, thứ ở lại thư mục chính

| Ở worktree của item | Ở thư mục chính |
|---|---|
| Thư mục làm việc của agent build và fix (`startAgent` nhận `cwd`) | `.ai/runs/<KEY>/`: state, log, `last.md`, ghi chú `note.md`, `answers.md` |
| `git` của lượt: kiểm thư mục sạch, kéo nhánh, `saveWip` / `restoreWip` | Khóa, và các lệnh không có worktree: spec, plan, request, release, ship, rollback, preview |
| `.claude/` và hook đọc từ nhánh của item, tức bản trên `develop`, vì agent không sửa được `.claude/` | Review và QA vẫn như cũ: thư mục chính ở `develop`, code của PR trong worktree tạm |

- `ao-step` luôn chạy từ thư mục chính, và chỉ chuyển `cwd` của agent sang worktree.
- `homeBranch` không còn đưa thư mục chính đi đâu, vì thư mục chính không rời `develop`.
- Prompt của lượt build và fix thêm một dòng: đường dẫn worktree, và ledger nằm ở `.ai/ledger/<KEY>.md` của worktree.

### 4.4 Quyết định khi làm (Phiên 32 · Lượt 35)

- **`decideStep` không đổi.** Lượt nào vào làn do `laneOf` của `lib/workflow/places.mjs` quyết: mọi lượt của `/ao-build`
  và `/ao-fix`, trừ review (vẫn có worktree tạm). Như vậy `ba` hay `sa` sửa AC hoặc plan trên nhánh của PR cũng chạy trong
  làn, vì nhánh đó đang nằm ở làn. Lượt của Epic (`/ao-spec`, `/ao-plan`, `/ao-request`) ở lại thư mục chính.
- **`checkout` lên `develop` trong làn** là đứng ở `origin/develop` dạng detached, vì thư mục chính giữ `develop`.
- **Runner** truyền cả lượt cho `git(checkout, run)` và `wip.restore(wip, run)`, và giữ `story` trên bản ghi của lượt, để
  việc dở của Sub-task về đúng làn của Story.
- **`lib/workflow/lanes.mjs`** tạo, đặt, tìm và dọn làn; ao-step chỉ nối vào. Làn có PR đã merge được gỡ dù nhánh đã bị xóa
  trên origin; làn có PR đóng mà không merge thì chỉ gỡ khi mọi commit đã có trên origin.
- **`/ao-preview` dừng khi bật worktree**, kèm lời chỉ: nhánh của PR nằm trong làn, nên thư mục chính không chuyển sang
  được. Bật app ngay trong làn là việc sau.
- **Ledger:** `files.ledger` tìm ở thư mục chính và ở mọi làn.

## 5. Phần 2: chạy hai lượt cùng lúc

### 5.1 Khóa và trần

- Khóa theo item: `.ai/runs/active/<KEY>.json` gồm `pid`, lệnh, item, chỗ chạy và giờ bắt đầu.
- Mỗi lệnh lấy khóa của item mình, rồi đếm các khóa còn sống (`alive(pid)`).
  - Số agent đang chạy đã bằng số agent được phép (mục 6), hay item đã có khóa: `STOP: ao-step is already running …`, như bây giờ.
- **Số làn mở:** build đầu tiên của một item mở một làn mới, tức tạo worktree. Khi số worktree đang có đã bằng
  `runs.lanes_max`, lệnh đó dừng: `STOP: <n> lanes are open, the most runs.lanes_max allows; finish or close one first`.
  Các lệnh trên làn đã mở (fix, review, QA, build lại) không bị con số này chặn.
- **Chốt RAM:** trước khi mở một agent, kit đọc RAM trống của máy. Dưới `runs.min_free_ram_gb` thì làn đó chờ, và kiểm lại
  mỗi 30 giây cho tới khi một agent khác xong và nhả RAM. Chờ quá 30 phút thì dừng, kèm lý do. Nhờ chốt này, số agent có
  thể bằng số làn mà máy vẫn không bị quá tải khi cả ba làn cùng cần agent.
- **Chỉ `build`, `fix`, `review` và `qa` được chạy song song.** Các lệnh còn lại cần thư mục chính hay đụng cả dự án, nên
  chỉ chạy khi không có khóa nào khác: `spec`, `plan`, `request`, `intake`, `preview`, `release`, `ship`, `rollback`.
- **Mỗi lúc một QA trên một môi trường** (Lượt 31–35). Mọi lượt QA của item kiểm trên cùng một Development, cùng một
  database, và E2E có ghi dữ liệu. Hai lượt QA cùng lúc làm bẩn dữ liệu của nhau, nên kết quả không còn đáng tin. Lượt QA
  thứ hai chờ lượt đầu xong; build, fix và review của làn khác vẫn chạy.
- **QA kiểm bản đang chạy** (Lượt 34–35). Ngay trước khi chạy và ngay khi chạy xong, QA đọc commit đang chạy trên môi
  trường (`running(environment)` của `lib/workflow/qa.mjs`). Hai commit khác nhau, tức một PR khác đã merge và deploy
  giữa chừng, thì lượt QA đó không báo PASS hay FAIL mà chạy lại, tối đa 2 lần, rồi dừng kèm lý do.
- **Cùng một dev agent:** lệnh build hay fix của role R dừng khi đang có một lượt build hay fix khác của R. Jira cũng
  chặn ở bước chuyển trạng thái (WIP 1), nhưng dừng sớm thì không tốn lượt agent.
- `--resume` của hai lượt không bao giờ trùng phiên: mỗi phiên thuộc một item. Tài liệu Claude Code cảnh báo hai tiến
  trình cùng resume một phiên sẽ mất tin nhắn.

### 5.2 Dải cổng

- Chỗ chạy là số thứ tự của khóa: từ 0 tới `lanes_max` − 1. Độ lệch cổng là `chỗ × runs.port_step`, mặc định 100.
- `ao-step` đưa `AO_PORT_OFFSET` vào môi trường của agent, và thêm vào prompt bảng cổng của chỗ đó, ví dụ `user` 3100,
  `admin` 5273, `api` 3101.
- `playwright.config.ts` của profile cộng `AO_PORT_OFFSET` vào `port.default`, và đổi các URL `localhost:<cổng>` trong
  `env` của app theo cùng độ lệch. Hiện file này dùng thẳng `port.default` và `reuseExistingServer` ở máy (`shop`:
  `playwright.config.ts:60–66`).
- Lượt review và QA không bật app ở máy, nên không cần dải cổng.
- `shop` cần một PR sửa `playwright.config.ts` theo template mới, đi cùng lần chép kit.

### 5.3 `/ao-status` và skill

- `/ao-status` in các lượt đang chạy (item, lệnh, chỗ, phút đã chạy) và các worktree đang có (item, nhánh, PR).
- Câu "agents run one at a time" trong skill và tài liệu sửa thành: "tối đa `runs.lanes_max` lượt, mỗi item một lượt".
- Skill không đổi cách gọi: phiên chính chạy mỗi lệnh ở nền như bây giờ, và có thể chạy lệnh thứ hai khi lệnh đầu đang
  chạy.

### 5.4 Quyết định khi làm phần 2 (Phiên 32 · Lượt 35)

- **Khóa tính theo lệnh, không theo agent:** một lệnh giữ chỗ của nó cả lúc chờ CI, khi không có agent nào chạy. Cách này
  đơn giản và chắc; cái giá là đôi khi một chỗ nằm không trong lúc chờ CI.
- **`lib/workflow/locks.mjs`:** `admit` quyết từ các khóa còn sống; `takeLock` ghi khóa dưới một mutex ngắn
  (`.ai/runs/active/.admit`), nên hai lệnh khởi động cùng lúc không cùng vượt trần. Khóa cũ `.ai/runs/active.json` được
  bỏ; `/ao-preview` đọc khóa mới.
- **`lib/workflow/ports.mjs`:** bảng cổng của một chỗ, dời URL `localhost`, và `runsAtOnce` (trần `lanes_max`, hạ bằng
  `AO_AGENTS_AT_ONCE`). Template `playwright.config.ts` của `base-pnpm` dời cổng theo `AO_PORT_OFFSET`; profile
  `next-nest` cũ không có cổng trong `project.yaml`, nên không đổi.
- **QA kiểm bản đang chạy:** `ao-step` đọc bản deploy mỗi 30 giây trong lúc `qa` chạy, bằng login `gh` của bạn như các lệnh
  release, vì token của agent không đọc được deployment. Có bản mới thì dừng `qa` ngay (`killTree`). Runner ghi lượt đó là
  `superseded`, không gọi `afterQa` để đính kèm, và quyết định lại; `decideQa` cho chạy mới từ In QA khi lượt trước là
  `superseded`. Tối đa 2 lần trong một lệnh; sau đó lượt QA chạy hết như trước, kèm ghi chú của `afterQa`.
- **Chốt RAM** dùng `os.freemem()`, chỉ khi trần lớn hơn 1, nên mặc định không đổi.

## 6. Cấu hình

```yaml
# project.yaml
runs:
  worktrees: false     # phần 1: build và fix trong worktree theo item
  lanes_max: 1         # phần 2: số làn (worktree) được mở cùng lúc, cũng là số agent chạy cùng lúc, 1..6; từ 2 đòi worktrees: true
  min_free_ram_gb: 3   # phần 2: RAM trống tối thiểu để mở thêm một agent; 0 thì tắt chốt này
  port_step: 100       # độ lệch cổng giữa hai chỗ chạy
  copy: []             # file không có trong git mà worktree cần, ví dụ apps/api/.env
```

`lib/scaffold/project.schema.json` kiểm khóa mới. Khóa nằm trong `project.yaml` vì đây là quyết định của dự án; máy yếu hay gói thấp
thì để 1. Số agent chạy cùng lúc bằng `lanes_max` (Lượt 25 và 29), nên bạn chỉ đặt một con số. Biến `AO_AGENTS_AT_ONCE` hạ số agent tạm thời ở một máy mà không sửa file: kit lấy số nhỏ hơn. Chốt RAM cũng có thể bắt một làn chờ.

**Ba con số, đừng lẫn** (Phiên 32 · Lượt 19–23; chi tiết ở [lan-va-agent-cung-luc.md](misc/thao-luan/sdlc-song-song/lan-va-agent-cung-luc.md)):

| Con số | Là gì | Ai quyết |
|---|---|---|
| `lanes_max` | Số làn được mở cùng lúc: số item đang dở, mỗi item một worktree, kể cả item đang chờ bạn duyệt | Bạn, trong `project.yaml`. Guard `wip-available` của contract vẫn chặn thêm: mỗi dev agent 1 item In Progress. Giới hạn In Review 2 chỉ là mức của cột trên board Jira, không chặn gì (Lượt 29) |
| Agent chạy cùng lúc | Bằng `lanes_max`: làn nào có việc thì có ngay một agent. Mỗi làn tối đa một agent | Tự theo `lanes_max`; hạ tạm bằng `AO_AGENTS_AT_ONCE`; chốt RAM có thể bắt một làn chờ (Lượt 29) |
| Agent của một làn | Luôn 1 tại một thời điểm: build, rồi review, rồi QA, lần lượt | Cố định |

- Agent không phải một nhóm "nhân công" cố định. Mỗi bước của một làn mở một agent mới theo vai trò (`fe-dev`, `reviewer`…),
  xong thì tắt. Vì vậy làn đang chờ bạn không giữ agent nào.
- Khi `AO_AGENTS_AT_ONCE` nhỏ hơn số làn, hay khi RAM thiếu, làn cần agent sau cùng chờ tới khi có chỗ. Đó là chủ ý: con số này giữ hạn mức gói và
  máy không quá tải.
- **Đề xuất cho `shop` trên máy này** (16 GB RAM, 4 nhân, 8 luồng; đo lúc 15:53 khi một agent `reviewer` chạy: còn 2,8 GB
  trống, VS Code dùng 3,8 GB, Edge 1,8 GB, các tiến trình `claude` 1,4 GB):
  `lanes_max: 3`, tức tối đa 3 agent cùng lúc (theo ý bạn ở Lượt 25), và `min_free_ram_gb: 3`.
  - Số agent bằng số làn: làn nào cần agent thì có ngay, trừ khi chốt RAM bắt chờ.
  - Agent không tốn RAM khi làn chờ bạn, nhưng **lúc chạy** thì có: một lượt build có thể bật dev server, một Chrome
    của `chrome-devtools`, hay JVM cùng Postgres của Testcontainers, cộng 1,5–4 GB [Ước]. Chốt RAM giữ cho ba lượt chạy
    cùng lúc không đẩy Windows vào cảnh dùng file swap.
  - `lanes_max: 3` cũng là số item tối đa dồn lại chờ bạn ở gate ③ và Accept.
  - Kit không mở VS Code. RAM của VS Code tính theo số cửa sổ bạn mở, không theo số làn.

## 7. Cấu trúc

```text
lib/workflow/places.mjs      # mới: đường dẫn worktree theo item, khi nào tạo, dùng lại, gỡ (hàm thuần)
lib/workflow/locks.mjs       # mới: khóa theo item, đếm lượt sống, lệnh nào được song song (hàm thuần)
lib/workflow/ports.mjs       # mới: bảng cổng của một chỗ chạy, URL đổi theo độ lệch (hàm thuần)
lib/workflow/runner.mjs      # lượt có `place`: git và agent chạy ở cwd của place
lib/workflow/steps.mjs       # build và fix nhận place khi runs.worktrees; checkout giữ nguyên khi tắt
lib/workflow/prompts.mjs     # dòng worktree, ledger và bảng cổng
lib/workflow/wip.mjs         # saveWip / restoreWip nhận git của place
scripts/ao-step.mjs          # khóa theo item, tạo, cài, chép và gỡ worktree, cwd của agent, /ao-status
lib/scaffold/project.schema.json  # runs.*
profiles/*/files/playwright.config.ts  # AO_PORT_OFFSET
.claude/skills/ao-*/SKILL.md, docs/dev-workflow.md, docs/getting-started.md, README.md
tests/                       # test của các phần trên
tasks/                       # plan, todo, verification
```

Tên file cụ thể theo cây thư mục của kit lúc làm; danh sách trên là phạm vi.

## 8. Chiến lược test

Test viết trước, bằng `node:test`, theo mẫu test sẵn có.

- **`places.mjs`:**
  - đường dẫn theo item trên Windows và POSIX;
  - tên dự án có khoảng trắng;
  - item có Sub-task (worktree theo Story hay theo Sub-task: theo Story, vì Sub-task dùng chung nhánh);
  - khi nào gỡ;
  - worktree còn mà PR đã đóng.
- **`locks.mjs`:**
  - trần 1 và trần 2;
  - cùng item;
  - lệnh không được song song;
  - khóa của tiến trình đã chết;
  - hai lượt cùng role.
  - hai lượt QA trên cùng một môi trường;
  - số làn đã bằng `lanes_max`;
  - RAM dưới `min_free_ram_gb`.
- **`ports.mjs`:**
  - độ lệch 0 và 100;
  - đổi URL `localhost` trong `env`, không đụng URL khác.
- **`decideStep`:**
  - build và fix có `place` khi bật, có `checkout` như cũ khi tắt;
  - fix dùng lại worktree;
  - build lại `-r2` trong cùng worktree.
- **Runner:** git và agent nhận `cwd` của place; `saveWip` chạy trong worktree.
- **QA kiểm bản đang chạy:** commit trước và sau như nhau thì báo kết quả; khác nhau thì chạy lại, tối đa 2 lần, rồi dừng.
- **Hồi quy:** cả bộ test hiện có xanh với cấu hình mặc định. Thêm một test khẳng định khi tắt thì không tạo worktree
  nào.

Phần tạo và gỡ worktree thật, cài package, hai agent chạy cùng lúc và cổng thật được kiểm ở kiểm thật (mục 10).

## 9. Ranh giới

**Luôn làm:**
- mặc định tắt; tắt thì mọi thứ như cũ;
- thư mục chính không rời `develop` khi bật;
- mỗi item một worktree, một khóa, một phiên agent;
- chép file không có trong git chỉ theo danh sách `runs.copy`.

**Hỏi bạn trước:**
- xóa worktree còn thay đổi chưa commit hay chưa push;
- đổi contract, WIP hay board Jira;
- bật `runs.lanes_max` từ 2 trở lên trên một dự án.

**Không làm:**
- junction hay symlink tới `node_modules`;
- chạy hai lượt trên cùng một item;
- `/ao-preview` song song;
- `gh pr merge --delete-branch` ở máy.

## 10. Tiêu chí hoàn thành

1. Hai PR của kit đã merge, CI xanh. `npm run validate`, `npm test` và `npm run agents:check` xanh.
2. Kiểm thật phần 1 trên `shop` với `runs.worktrees: true`:
   - một item build trong worktree tới PR nháp, CI xanh;
   - fix trên chính worktree đó;
   - worktree được gỡ sau khi PR merge;
   - thư mục chính đứng yên ở `develop` suốt thời gian đó.
3. Kiểm thật phần 2 với `runs.lanes_max: 2`:
   - một item `be-dev` và một item `fe-dev` build cùng lúc; hoặc một build cùng lúc với một review;
   - cả hai tới PR, CI xanh;
   - log của E2E cho thấy hai dải cổng khác nhau;
   - không lượt nào dừng vì giành khóa hay git.
4. `/ao-status` in đúng các lượt đang chạy và các worktree.
5. Bản chép kit vào `shop` đi qua `/ao-review`, và `doctor` đạt.

## 11. Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Hai tiến trình chạy `git` cùng lúc trên một repo, đụng khóa ref (`cannot lock ref`) | Thử lại vài lần có chờ; `fetch` chỉ chạy ở thư mục chính, dưới khóa ngắn [Inference] |
| Mỗi worktree cài lại package, tốn thời gian và đĩa | pnpm dùng store chung, cài nhanh; gỡ worktree khi item xong |
| Maven dùng chung `~/.m2` khi hai bản build Java chạy cùng lúc | Thường ổn với Maven 3.9; theo dõi ở kiểm thật [Inference] |
| Hai agent cùng lúc làm hạn mức 5 giờ của gói hết nhanh gấp đôi | Trần mặc định 1; bạn bật 2 cho từng dự án |
| Worktree mồ côi khi tiến trình bị giết | Gỡ ở đầu mỗi lệnh, theo PR đã đóng; `/ao-status` liệt kê |
| Item dồn lại chờ bạn duyệt nhanh hơn | `/ao-status` cho thấy hàng chờ; giới hạn In Review 2 của contract vẫn còn |
| Sửa lõi khóa và checkout làm hỏng cả lúc chạy mặc định | Phần 1 và 2 tách PR; bộ test hồi quy; mặc định tắt |

## 12. Điểm cần bạn duyệt

1. **Hai phần, hai PR** như mục 3: phần 1 (worktree theo item) dùng được một mình.
2. **Vị trí worktree:** `<cha>/<dự án>-wt/<KEY>`, ví dụ `e-commerce/shop-wt/SHOP-13`.
3. **Cấu hình trong `project.yaml`** (`runs.worktrees`, `runs.lanes_max`, `runs.min_free_ram_gb`, `runs.port_step`, `runs.copy`), mặc định tắt và
   1.
4. **Chỉ `build`, `fix`, `review`, `qa` được song song,** mỗi lúc một QA trên một môi trường; các lệnh còn lại chạy một
   mình. QA kiểm bản đang chạy trước và sau lượt chạy.
5. **Giữ WIP 1 cho mỗi dev agent;** nâng WIP để sau.
6. **Kiểm thật trên `shop`,** với các item còn lại của `SHOP-7` sau khi chép kit, thay vì trên `ao-sample`. Như vậy
   Pilot 3 đo thêm một bản kit, và cần ghi rõ item nào chạy bằng bản nào.
7. **Làm khi nào:** ngay bây giờ, song song với `SHOP-7` (phiên chính viết code trong worktree riêng của kit, không đụng
   thư mục kit mà `AO_KIT_DIR` đang dùng); hay sau Pilot 3.
8. **Gộp vào lần chép kit này** kit PR #288 (đang chờ) và bản sửa "coverage của file đã sửa" (ghi chú ở bản phân tích),
   để `shop` chỉ có một PR chép kit.

## 13. Chi phí ước tính

| Việc | Thời gian | USD [Ước tính] |
|---|---|---|
| Plan và todo (phiên chính) | vài giờ | 0 |
| Phần 1: code và test | khoảng nửa ngày | 0 |
| Phần 2: code và test | khoảng nửa ngày | 0 |
| Review kit, 2–3 vòng cho cả hai PR | | 20–35 |
| Chép kit vào `shop`, `/ao-review`, 1–3 vòng | | 10–30 |
| Kiểm thật | đi cùng các item của `SHOP-7` | chi phí của item |
| **Cộng** | **khoảng 2 ngày** | **khoảng 30–65** |

## Nguồn

- Mã kit ở `main` `0581588`: `scripts/ao-step.mjs`, `lib/workflow/runner.mjs`, `lib/workflow/steps.mjs`,
  `lib/workflow/preview.mjs`, `lib/tracker/facts.mjs`, `contract/policies.yaml`.
- `shop`: `playwright.config.ts`, `.ai-orchestrator/project.yaml`, `.claude/settings.json`.
- Tài liệu Claude Code: code.claude.com/docs/en/mcp, /permissions, /sessions, /headless, /worktrees.
- Phép thử ở mục 2.

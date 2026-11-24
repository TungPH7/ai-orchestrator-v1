# ai-orchestrator-v1

Bộ kit để phát triển web bằng các agent AI theo một quy trình SDLC thống nhất: spec, plan, code theo TDD, quality gate, review, QA, release. Danh sách module và thứ tự làm nằm ở [SPEC.md](SPEC.md).

Module đã xong:

- **`sdlc-contract`**: hợp đồng quy trình mà các module khác đọc theo ([SPEC-sdlc-contract.md](SPEC-sdlc-contract.md)).
- **`tracker-integration`**: nối hợp đồng với Jira Cloud và GitHub, để trạng thái item đổi theo dữ kiện thật và mỗi transition chỉ do đúng vai trò thực hiện ([SPEC-tracker-integration.md](SPEC-tracker-integration.md)).
- **`quality-gates`**: biến các cổng tự động của hợp đồng thành kiểm tra thật. Code chỉ vào `develop`, `main`, `release/*` và chỉ được deploy khi đã qua CI, có báo cáo review và có approve của bạn, kể cả khi repo private ở gói Free không có branch protection ([SPEC-quality-gates.md](SPEC-quality-gates.md)).
- **`agent-roster`**: mười agent của Claude Code, mỗi vai trò của hợp đồng một agent; C1 thêm `seo`, nên nay là mười một. Mỗi agent biết đầu vào, đầu ra, tool, skill, model và effort của mình, và hook giới hạn file nó được ghi ([SPEC-agent-roster.md](SPEC-agent-roster.md)).
- **`dev-workflow`**: sáu lệnh `/ao-*` đưa một Epic từ spec tới merge vào `develop`, chỉ dừng ở cổng cần bạn. Agent làm việc với GitHub bằng hai App, không bằng login của bạn ([SPEC-dev-workflow.md](SPEC-dev-workflow.md)). Các module sau thêm lệnh, nay kit có 15 lệnh `/ao-*` (hai bảng ở dưới).
- **`human-loop`**: các chỗ bạn lái agent giữa chừng. Phần 1 thêm `/ao-intake`, sửa SPEC và plan trước cổng, và `/ao-request`. Phần 2 thêm PR nháp và bước xem trước `/ao-preview` giữa build và review, cùng `/ao-fix` giao việc theo `be:` / `fe:`. Phần 3 thêm `/ao-qa <KEY> fail:` cho lỗi bạn thấy khi QA, và `/ao-build` sửa sau `QA fail` trên nhánh mới ([SPEC-human-loop.md](SPEC-human-loop.md)).
- **`release-workflow`**: bốn lệnh đưa code từ `develop` lên Development, Staging và Production trên VPS của bạn, qua QA, gate ④ cắt release và gate ⑤ ship. Deployer trên VPS kiểm cổng cho mọi commit, chạy smoke test và giữ bản cũ khi smoke fail ([SPEC-release-workflow.md](SPEC-release-workflow.md)).
- **`kit-copy-review`**: mỗi bản kit chỉ được agent review đầy đủ một lần; PR chép đúng bản đó vào dự án khác dùng lại kết quả, không gọi agent ([SPEC-kit-copy-review.md](SPEC-kit-copy-review.md)).
- **`live-run-fixes`**: vá các lỗi kit mà lần chạy thật của `human-loop` tìm ra ([SPEC-live-run-fixes.md](SPEC-live-run-fixes.md)).
- **`project-scaffold`**, phần 1–3: lệnh `ao-kit` dựng dự án, cài và cập nhật kit, dựng GitHub và Jira; dự án Next.js + NestJS, dự án pnpm nhiều app (Next.js, React), app Spring Boot với Postgres và backup ([SPEC-project-scaffold.md](SPEC-project-scaffold.md), [SPEC-project-scaffold-2.md](SPEC-project-scaffold-2.md), [SPEC-project-scaffold-3.md](SPEC-project-scaffold-3.md)).
- **`parallel-runs`**: mỗi item một worktree (làn), khóa theo item, nhiều lệnh chạy cùng lúc trong `runs.lanes_max`, dải cổng cho mỗi làn, mỗi môi trường một QA ([SPEC-parallel-runs.md](SPEC-parallel-runs.md)).
- **C1**: thứ tự chạy của `/ao-spec`, `/ao-plan`, `/ao-build` nằm trong contract; ba mức quy trình theo rủi ro; review theo tầng đường dẫn; duyệt thư viện trước khi cài (`dep-check`); role `seo` ([SPEC-c1.md](SPEC-c1.md)).
- **C2**: bộ điều phối `/ao-run`, nhiều agent cùng role (`runs.agents_per_role`), `reviewer` chạy cùng lúc với `security`, `/ao-preview` trong làn, `merge-gate` chờ lượt QA đang chạy, watcher `ao-step watch` ([SPEC-c2.md](SPEC-c2.md)).

Sau C2, kit có thêm hai việc, theo dõi ở [tasks/todo.md](tasks/todo.md) (mục 9 và 10):

- **Review theo item:** nhãn `ao-review-skip` hay `ao-review-on` trên item, mặc định ở `review.default` của `project.yaml`; PR bỏ review vẫn chờ bạn approve ở gate ③, và `/ao-review <EPIC>` review sau merge các PR đó trước khi release ([SPEC-review-per-item.md](SPEC-review-per-item.md)).
- **Thiết kế từ Claude Design:** `/ao-design <KEY>` đưa các artifact Design và Design System mà item link tới vào hộp thiết kế, kèm ảnh từng khung; mỗi màn hình có một mã duy nhất trong dự án, như `USR-CART01` ([docs/agents.md](docs/agents.md), mục Mã màn hình). Figma làm sau.

Pilot 1 (xong 2026-11-04) chạy kit trên repo mẫu `TungPH7/ao-sample` (Next.js + NestJS) và space Jira `SMP`: Epic "Ghi chú" đi từ spec tới khi mọi Story sang Ready for QA ([SPEC-pilot-1.md](SPEC-pilot-1.md)). Các bước cài, chỗ vướng, lỗi kit và chi phí ghi ở [tasks/archive/pilot-1/verification.md](tasks/archive/pilot-1/verification.md). Pilot 2 (xong 2026-11-10) đưa Epic đó lên Production và chạy thử rollback ([SPEC-pilot-2.md](SPEC-pilot-2.md)). Pilot 3 (xong 2026-11-18) chạy dự án thật `TungPH7/shop`, với ba app (Next.js, React + Vite, Spring Boot) và Postgres, từ spec tới Production ([SPEC-pilot-3.md](SPEC-pilot-3.md)).

## Hợp đồng quy trình

Sáu file YAML trong `contract/` trả lời bốn câu cho mọi bước của quy trình: ai làm, cần đầu vào gì, phải tạo ra gì, và điều kiện nào để sang bước tiếp theo.

| Ai dùng | Dùng thế nào |
|---|---|
| Bạn | Đọc [docs/sdlc.md](docs/sdlc.md), bản Markdown sinh từ YAML, để duyệt và tra cứu |
| Agent | Đọc phần hợp đồng của bước mình đang làm, rồi tạo artifact từ template trong `templates/` |
| Script, bộ điều phối | Đọc YAML qua `lib/contract.mjs` để kiểm cổng, chọn nhánh và chuyển trạng thái |

```js
import { loadContract, allowedTransitions, checkTransition, routeBug } from './lib/contract.mjs';

const contract = loadContract('contract'); // validates, then returns a frozen object

allowedTransitions(contract, 'story', 'in-qa').map((t) => t.id);
// → ['qa-fail', 'accept', 'cancel']

checkTransition(contract, 'story', 'accept', { actor: 'qa', facts: { guards: ['qa-report-passed', 'dod-met'] } });
// → { ok: false, actorAllowed: false, missingGuards: [], effects: [] }: only human moves a Story to done

routeBug(contract, { affects: 'staging', severity: 'critical' });
// → { fixVersion: 'current-release', baseBranch: 'release/*', qaEnvironments: ['staging'] }
```

## Jira và GitHub

`tracker/jira.yaml` ánh xạ hợp đồng sang Jira: status, transition, group của từng vai trò, field, board và môi trường. Ba danh tính chuyển item trên Jira, mỗi danh tính một tài khoản:

| Danh tính | Tài khoản, group | Chuyển item bằng | Lớp chặn |
|---|---|---|---|
| Bạn | Tài khoản của bạn, `ao-humans` | Giao diện Jira | — |
| Agent | Service account `orchestratoragent`, `ao-agents` | Rovo MCP trong Claude Code | Hook `jira-guard` kiểm vai trò và guard của hợp đồng; rule Restrict của Jira |
| Automation | Service account `orchestratorci`, `ao-automation` | `jira-sync` trên GitHub Actions, khi có sự kiện PR, review, CI, deploy | Chỉ chuyển khi guard thỏa theo dữ kiện thật; rule Restrict của Jira |

Hook chỉ cho chuyển item khi lời gọi đến từ một agent mang tên id vai trò của hợp đồng (`fe-dev`, `qa`…), vì vai trò được lấy từ `agent_type`. Phiên chính không có vai trò nên bị chặn.

### Dựng Jira cho một dự án

1. Làm theo [docs/jira-setup.md](docs/jira-setup.md), checklist sinh từ ánh xạ, gồm các bước bấm trên giao diện Jira.
2. Chạy `npm run jira:check -- --space <KEY>` tới khi không còn chỗ lệch, rồi xem tay các dòng `Check by hand`.

## Quality gates

Repo private ở gói Free không có branch protection, nên GitHub không chặn được merge hay push. Kit chốt cổng ở bốn lớp:

| Lớp | Chạy ở đâu | Chặn gì |
|---|---|---|
| Hook git trong `.githooks/` | Máy chạy `git` | `pre-commit`: secret trong file đã stage, và lỗi của script `precommit`. `commit-msg`: header sai quy ước. `pre-push`: push thẳng lên `develop`, `main`, `release/*` |
| Hook `gh-guard` của Claude Code | Máy chạy agent | Agent bỏ qua hook git, làm việc với PR bằng tài khoản của bạn, lấy token hoặc key, đổi cấu hình repo, sửa file được bảo vệ |
| Workflow `CI` và `merge-gate` | GitHub Actions | `CI` có bốn check: `policy`, `build-test`, `secrets`, `sast`. `merge-gate` chỉ merge PR của agent khi `CI` xanh, có báo cáo của `reviewer` và `security` không còn Critical hay High (hay dấu vết miễn review, bỏ review trên head), và bạn đã approve trên commit đầu; nó chờ lượt QA đang chạy xong rồi mới merge |
| `audit` | GitHub Actions, trước mỗi lần deploy | Commit không qua đủ cổng thì không được deploy, và item Jira mang cờ "Needs you" |

Hai lớp đầu bắt lỗi sớm, nhưng chạy trên máy nên bỏ qua được. `merge-gate` và `audit` chạy trên GitHub, nên không phụ thuộc vào máy bạn. Repo hỗ trợ ruleset (repo public, hoặc gói Pro trở lên) thì `npm run gh:protect` áp thêm một ruleset.

Hai GitHub App giúp bạn approve được PR của agent, vì GitHub không cho tác giả PR approve PR của chính mình:

| App | Ai dùng | Làm gì |
|---|---|---|
| `ao-dev` | `ba`, `sa`, `fe-dev`, `be-dev`, `devops`, và `merge-gate` | Agent mở và sửa PR bằng `ao-pr.mjs`; `merge-gate` squash merge khi dự án chưa có App `ao-merge` |
| `ao-review` | `reviewer`, `security` | Đăng báo cáo review bằng `ao-pr.mjs review` |

Hai App nữa không dùng trong phiên agent: `ao-deploy` cho deployer trên VPS, và `ao-merge` cho `merge-gate` (mục 7 và 8 của [docs/github-apps-setup.md](docs/github-apps-setup.md)).

[docs/quality-gates.md](docs/quality-gates.md) giải thích vòng của một PR, từng check, cách đọc job summary, cách xử lý khi một cổng đỏ, và khi nào bạn phải tự merge. [docs/github-apps-setup.md](docs/github-apps-setup.md) hướng dẫn tạo cả bốn App.

## Agent

Mười một agent nằm ở `kit/.claude/agents/<role>.md`: `pm`, `ba`, `ux`, `sa`, `fe-dev`, `be-dev`, `reviewer`, `security`, `qa`, `devops`, và `seo` từ C1. Chúng không được viết tay. `npm run agents` ghép `agents/roster.yaml` (model, effort, `max_turns`, tool, quyền, skill), prompt `agents/prompts/<role>.md` và hợp đồng thành file agent, cùng file quy ước chung `kit/.claude/rules/ai-orchestrator.md`.

| Ai dùng | Dùng thế nào |
|---|---|
| Bạn, trong phiên Claude Code | Giao việc cho agent làm subagent, ví dụ "dùng agent `qa` để QA Story DEMO-12" |
| Bạn hoặc một lệnh điều phối | `node .ai-orchestrator/scripts/ao-agent.mjs <role> -p "<prompt>"` chạy agent làm phiên chính, với skill, effort và `--max-turns` của roster |
| Hook `gh-guard` và `jira-guard` | Đọc vai trò từ tên agent: file được ghi, quyền git, App GitHub, transition được làm |

Skill của agent được chép vào kit, ghim theo commit (`kit/.claude/skills/`); ba skill của `seo` được chép rồi viết lại, và [docs/skills.md](docs/skills.md) ghi cách so chúng với bản gốc. Mỗi dự án thêm skill theo stack trong `.ai-orchestrator/roster.local.yaml`. Agent `ux` viết `design.md` của Epic, và `check-design.mjs` kiểm file đó trong job `policy`. [docs/agents.md](docs/agents.md) giải thích các phần sau:

- từng vai trò, cách chạy, chi phí đo được;
- cách nâng effort và cách thêm skill;
- `design.md`, mã màn hình, cách đưa thiết kế từ Claude Design, ảnh chụp và ảnh Figma vào repo;
- dung lượng repo và Git LFS;
- những điều đã gặp khi chạy thật.

## Các lệnh `/ao-*` của vòng trong

Trong phiên Claude Code của bạn, ở repo dự án, các lệnh này đưa một Epic đi hết vòng trong. Mỗi lệnh trước hết chạy `ao-step.mjs` để kiểm trạng thái trên Jira, GitHub và `.ai/` (riêng `/ao-design` kiểm bằng `design-inbox.mjs`), rồi in GO hoặc STOP. Khi là GO, lệnh mở đúng agent theo đúng thứ tự, và dừng ở cổng cần bạn.

| Lệnh | Làm gì |
|---|---|
| `/ao-status [KEY]` | Việc đang chờ bạn, lệnh tiếp theo của từng item, yêu cầu giữa các vai trò, chi phí |
| `/ao-intake <mô tả sơ khai>` | Phiên chính phỏng vấn bạn, rồi tạo một Epic, Task hoặc Bug trên Jira khi bạn OK bản nháp |
| `/ao-design <KEY>` | Phiên chính, không agent: đọc các artifact Design và Design System của Claude mà item link tới vào `.ai/design-inbox/<KEY>/`, chụp ảnh từng khung, kiểm mã màn hình. Chạy trước `/ao-spec`; `/ao-run` không tự chạy lệnh này |
| `/ao-spec <EPIC> [sửa]` | `ba`, `ux`, `sa` viết SPEC và design, rồi mở PR tài liệu; `seo` chạy cuối, cho màn hình của app `seo: true`; dừng ở gate ①. Có `[sửa]` thì `ba` sửa SPEC trước gate ①; `seo` hay `no-seo [lý do]` bật hay tắt `seo` |
| `/ao-plan <EPIC> [sửa]` | `sa` viết plan, `ba` tạo item; dừng ở gate ②. Có `[sửa]` thì `sa` sửa plan trước gate ②. Chạy lần nữa sau gate ② để refine item và merge PR tài liệu |
| `/ao-request <KEY>` | Chạy `ba`, `ux`, `sa`, `security` hoặc `seo` cho các yêu cầu `Cần <role>:` còn mở trên item |
| `/ao-build <KEY>` | Dev agent của từng Sub-task, BE trước FE, tới khi PR nháp mở và CI chạy xong; dừng chờ bạn xem trước. Item có nhãn `ao-seo` mà không thuộc Epic nào thì dừng trước, chờ bạn đọc comment của `seo` rồi gõ `/ao-build <KEY> seo-ok <dấu>` |
| `/ao-preview <KEY> [--stop]` | Chuyển thư mục dự án sang nhánh PR và bật app để bạn thử; `--stop` tắt app và về `develop`. Khi bật làn (`runs.worktrees`), app chạy trong làn của item, thư mục dự án ở yên `develop` |
| `/ao-review <PR>` | Chuyển PR nháp sang sẵn sàng, rồi `reviewer`, `security` (đầy đủ, hoặc chỉ phần mới; cùng lúc khi còn chỗ cho agent thứ hai); dừng ở gate ③. Item bỏ review: không agent, chỉ đăng dấu vết bỏ review |
| `/ao-review <KEY>` | Review sau merge các PR đã bỏ review của một Epic hay một item ([SPEC-review-per-item.md](SPEC-review-per-item.md)) |
| `/ao-fix <PR> [việc cần sửa]` | Dev agent sửa (theo `be:` / `fe:`); PR nháp thì không review, PR sẵn sàng thì review lại |
| `/ao-run <EPIC>` | Bộ điều phối, không dùng model: tự chạy `/ao-spec`, `/ao-plan`, `/ao-request`, `/ao-build`, `/ao-review`, `/ao-fix` và `/ao-qa` của cả Epic, hay của tối đa bốn item, nhiều lệnh cùng lúc trong `runs.lanes_max`, dừng ở mọi chỗ chờ bạn; `--stop` để dừng ([SPEC-c2.md](SPEC-c2.md) mục 5) |

Câu hỏi của agent được chuyển cho bạn trong chat. Kết quả và chi phí của mỗi lượt nằm ở `.ai/runs/<KEY>/`. [docs/dev-workflow.md](docs/dev-workflow.md) giải thích các phần sau:

- một vòng Epic từ đầu tới cuối;
- worktree theo item và nhiều làn chạy cùng lúc;
- cách đọc `.ai/runs/`;
- khi nào lệnh dừng;
- cách chạy tiếp sau khi hết usage hay bị ngắt;
- chi phí đo được.

## Bốn lệnh của vòng ngoài

Bốn lệnh đưa code từ `develop` lên Development, Staging và Production trên VPS. Deployer của kit chạy mỗi phút trên VPS, kiểm cổng bằng `audit`, build image và chạy smoke test.

| Lệnh | Làm gì |
|---|---|
| `/ao-qa <KEY>` | `qa` kiểm item trên môi trường QA của nó và gắn bằng chứng lên Jira; bạn `Accept` |
| `/ao-qa <KEY> fail: <lỗi>` | Lỗi bạn thấy khi QA: `qa` tái hiện rồi bấm `QA fail`; `/ao-build` sửa trên nhánh `-rN` mới |
| `/ao-qa <KEY> retest` | Item ở In QA sau báo cáo NOT TESTED: bạn đã sửa nguyên nhân và gỡ cờ Needs you, `qa` kiểm lại toàn bộ |
| `/ao-release [<vX.Y.0> <sha>]` | Không có tham số: in điểm cắt và danh sách item. Có tham số: gate ④, tạo nhánh release |
| `/ao-ship <vX.Y.Z>` | Bản release: regression, release note, PR release; dừng ở gate ⑤. Hotfix: gate ⑤, tag và yêu cầu deploy Production |
| `/ao-rollback <môi trường> [<sha>]` | Chạy lại bản trước, đưa một bản lên lại, hoặc gỡ chặn sau một commit không qua `audit` |

[docs/release-workflow.md](docs/release-workflow.md) giải thích các phần sau:

- một vòng release từ đầu tới cuối;
- các bước bấm Fix Version trên Jira;
- hotfix, rollback, và khi deploy không thành;
- yêu cầu với dự án: `Dockerfile`, `.dockerignore`, `deploy.yaml`, `playwright.config.ts` với tag `@local`, `AO_PUBLIC_URL`;
- quy tắc expand/contract cho cơ sở dữ liệu.

## Cài kit vào repo dự án

Làm theo [docs/getting-started.md](docs/getting-started.md). Tài liệu này đi từng lệnh, mỗi lệnh có ý nghĩa, kết quả mong đợi chép từ lần chạy thật, và cách xử lý khi lỗi:
- chuẩn bị máy và tài khoản (phần 2);
- dự án mới từ thư mục trống (phần 3);
- repo đang phát triển (phần 4);
- dự án nhiều app dựng từ template của bạn, có API Spring Boot và database (phần 5);
- một tính năng lớn từ ý tưởng tới Production (phần 6);
- một Epic trọn vòng trên dự án có Spring Boot, với chi phí thật (phần 7);
- cập nhật kit, hết usage, hotfix, rollback (phần 9).

Các lệnh `ao-kit` (`init`, `add`, `sync`, `setup github`, `setup jira`, `doctor`, `check`, `render`) làm phần việc mà máy làm được. Hướng dẫn chỉ rõ từng bước bạn phải bấm trên GitHub và Jira.

`ao-kit init` và `ao-kit sync` chép vào dự án:
- `.ai-orchestrator/`: `contract/`, `lib/`, `tracker/`, `quality/`, `agents/`, `templates/`, các script, `package.json` của kit, và `docs/sdlc.md` thành `.ai-orchestrator/docs/sdlc.md`, vì template trỏ tới DoD trong đó;
- `kit/.claude/`, `kit/.githooks/`, `kit/.mcp.json` (hai server `atlassian` và `chrome-devtools`), `kit/.jira/config.yml`;
- năm workflow `ci.yml`, `jira-sync.yml`, `merge-gate.yml`, `pr-events.yml`, `pr-review.yml`. `pr-events.yml` và `pr-review.yml` không giữ secret nào, chỉ báo cho `jira-sync` mỗi lần PR mở, đổi, đóng, hay có review. Dự án tự deploy bằng GitHub Actions thì chép thêm `audit.yml`, cho job deploy `needs: audit`;
- `ci.project.yml`, nơi dự án giữ job CI của riêng mình. Chỉ chép khi dự án chưa có, rồi không bao giờ ghi đè ([docs/quality-gates.md](docs/quality-gates.md));
- bốn dòng `.gitignore`: `.ai-orchestrator/node_modules/`, `.claude/settings.local.json`, `.ai/` (ledger, báo cáo, ảnh của agent), `.playwright-cli/`.

Về sau, cập nhật bản chép kit phải đi qua PR, và bạn tự merge PR đó, vì nó sửa file được bảo vệ. Push thẳng lên `develop` làm `audit` chặn deploy và gắn cờ item.

## Biến môi trường và secret

| Biến | Đặt ở đâu | Ai dùng |
|---|---|---|
| `ATLASSIAN_AGENT_TOKEN` | Biến môi trường user trên máy chạy Claude Code | `.mcp.json` gửi token này cho Rovo MCP; hook `jira-guard` và `jira-rework`, và `ao-step.mjs`, đọc dữ kiện Jira bằng nó |
| `JIRA_CI_TOKEN` | Secret của hai environment `jira-sync` và `merge-gate` của repo dự án trên GitHub, không phải secret của repo: mọi workflow của một PR từ nhánh trong repo đều đọc được secret của repo (review của `shop` PR #21). Trên máy bạn: biến môi trường user cùng tên | `jira-sync`; `audit` dùng nó để gắn cờ item; `merge-gate` đọc Epic của PR tài liệu và gắn cờ item của PR bạn tự merge. Trên máy: `ao-kit setup github` đưa nó lên GitHub, `ao-step` dùng nó để gắn bằng chứng QA và Fix Version của `/ao-release` |
| `AO_JIRA_SPACE`, `AO_APPROVERS` | Mục `env` trong `.claude/settings.json` của dự án, sinh từ `project.yaml` (`jira.space`, `github.approvers`); biến môi trường cùng tên được ưu tiên | Các hook, `jira-sync`, `merge-gate` và `audit`. `AO_APPROVERS` nhận nhiều login, cách nhau bằng dấu phẩy |
| `AO_KIT_PEERS` | Mục `env` trong `.claude/settings.json` của dự án, sinh từ `github.kit_peers` của `project.yaml`; biến môi trường cùng tên được ưu tiên. Các repo đã review kit, cách nhau bằng dấu phẩy, dùng cho [PR chép một bản kit đã được review](docs/quality-gates.md#pr-chép-một-bản-kit-đã-được-review) |
| `GITHUB_TOKEN` | Có sẵn trong GitHub Actions; ở máy, không đặt thì lấy từ GitHub CLI | `jira-sync`, `merge-gate` và `audit` đọc PR, review, check bằng nó; `jira-guard` đọc dữ kiện PR, CI |
| `AO_KIT_DIR` | Không bắt buộc | Các hook, `ao-step.mjs` và `ao-agent.mjs` tìm kit ở đây thay cho `.ai-orchestrator/` |
| `AO_AGENTS_AT_ONCE` | Không bắt buộc; biến môi trường trên máy bạn, số nguyên từ 1 | `ao-step` hạ tạm số lượt chạy cùng lúc xuống số này khi nó nhỏ hơn `runs.lanes_max`, không phải sửa `project.yaml` ([docs/dev-workflow.md](docs/dev-workflow.md)) |
| `AO_ENV_AUTH` | Biến môi trường user trên máy bạn; giá trị `ao:<mật khẩu>` | Basic auth của Development và Staging. `ao-step` chỉ truyền cho `qa`, dưới dạng `E2E_HTTP_USER` và `E2E_HTTP_PASSWORD` ([docs/release-workflow.md](docs/release-workflow.md)) |
| `JIRA_ADMIN_EMAIL`, `JIRA_ADMIN_TOKEN` | Biến môi trường user trên máy bạn | `jira:check`; `ao-kit setup jira` cũng dùng `JIRA_ADMIN_EMAIL` |
| `JIRA_ADMIN_CLASSIC_TOKEN` | Biến môi trường user trên máy bạn; API token thường (không scope) của bạn | `ao-kit setup jira` tạo space ([docs/getting-started.md](docs/getting-started.md)) |
| `AO_DEV_APP`, `AO_DEV_APP_ID`, `AO_REVIEW_APP`, `AO_REVIEW_APP_ID`, `AO_MERGE_APP`, `AO_MERGE_APP_ID` | Mục `env` trong `.claude/settings.json` của dự án, sinh từ `github.apps` của `project.yaml` | `ao-pr.mjs`, `merge-gate`: slug và App ID của các GitHub App, không bí mật ([docs/github-apps-setup.md](docs/github-apps-setup.md)) |
| `AO_DEV_APP_KEY_FILE`, `AO_REVIEW_APP_KEY_FILE` | Biến môi trường user trên máy bạn; giá trị là đường dẫn tới file private key | `ao-pr.mjs`. Thiếu trong môi trường của tiến trình thì đọc từ biến user trên Windows |
| `AO_MERGE_APP_KEY` | Secret của environment `merge-gate` trên GitHub, không có trên máy nào | `merge-gate` merge bằng App `ao-merge`, App duy nhất ruleset cho merge khi chưa có approve của bạn (Pilot 3, spec 2.9). Dự án chưa có `ao-merge` thì `merge-gate` dùng `AO_DEV_APP_KEY`, key thứ hai của `ao-dev` |
| `NO_UPDATE_NOTIFIER` | Mục `env` trong `.claude/settings.json` của dự án, giá trị `1` | Tắt việc `playwright-cli` hỏi npm có bản mới mỗi lần chạy |

Token đặt bằng hộp thoại Environment Variables của Windows, không gõ qua chat. Secret của GitHub đặt bằng cách pipe token vào `gh secret set`, để token không nằm trong lịch sử lệnh.

## Lệnh

Cần Node.js 24. `gh:protect` và các bước cài đặt dùng GitHub CLI; nên dùng `gh` 2.102.0 trở lên, lý do ở mục "GitHub CLI trên máy bạn" của [docs/quality-gates.md](docs/quality-gates.md).

```
npm install             # trong CI dùng npm ci
npm run validate        # kiểm hợp đồng (quy tắc R1–R8), ánh xạ Jira (J1–J4), quality/gates.yaml (Q1–Q6), agents/roster.yaml (A1–A5) và vps/deployer.example.yaml (V1–V2)
npm test                # test của validator, thư viện, kịch bản và template
npm run render          # sinh lại docs/sdlc.md từ YAML
npm run render:check    # báo lỗi nếu docs/sdlc.md cũ hơn YAML
npm run jira:checklist  # sinh lại docs/jira-setup.md, checklist dựng Jira
npm run jira:checklist:check  # báo lỗi nếu docs/jira-setup.md cũ hơn YAML
npm run jira:check -- --space DEMO  # chỉ đọc: so cấu hình Jira thật của space với tracker/jira.yaml
npm run gh:protect -- --repo <owner>/<name>  # áp ruleset khi repo hỗ trợ; repo private gói Free: chỉ báo soft mode
npm run agents          # sinh lại kit/.claude/agents/, kit/.claude/rules/ai-orchestrator.md và kit/.claude/settings.json từ agents/ và hợp đồng
npm run agents:check    # báo lỗi nếu agent hay file quy ước sinh ra cũ hơn nguồn
npm run skills:vendor -- <name>  # tải lại một skill chép vào kit, đúng commit ghim trong agents/roster.yaml
node scripts/ao-kit.mjs init <thư mục dự án> --name <tên> --space <KEY> --repo <owner/name> --approvers <login>  # dựng dự án mới hay cài kit vào repo đang có
node scripts/ao-kit.mjs init <thư mục trống> --package-manager pnpm ...  # phần gốc của dự án pnpm, chưa có app
node scripts/ao-kit.mjs add <thư mục dự án> <app> --stack nextjs|react|spring-boot [--from <template> [--ref <nhánh hay tag>]] [--exclude <đường dẫn>]... [--public --seo|--no-seo]  # thêm một app vào dự án pnpm; spring-boot cần --from; app công khai chọn --seo (trang người dùng tìm trên Google) hoặc --no-seo (như app admin)
node scripts/ao-kit.mjs sync <thư mục dự án> --key <KEY>  # chép bản kit này vào dự án, trên nhánh feature/<KEY>-kit-copy, một commit, không push
node scripts/ao-kit.mjs render <thư mục dự án>  # sinh lại .claude/settings.json và agent từ project.yaml
node scripts/ao-kit.mjs check <thư mục dự án>  # kiểm project.yaml của dự án với schema, deploy.yaml, package.json và thư mục app
node scripts/ao-kit.mjs setup github <thư mục dự án> [--merge-app-key-file <key của ao-merge>]  # nhánh mặc định, xóa nhánh sau merge, Dependabot, bốn environment, hai secret, hai ruleset
node scripts/ao-kit.mjs setup jira <thư mục dự án> [--template DEMO]  # tạo space với scheme của space mẫu, bộ lọc và board, rồi jira:check
node scripts/ao-kit.mjs doctor <thư mục dự án>  # chỉ đọc: dự án còn thiếu gì trên máy, repo, GitHub, Jira, Claude Code, mỗi dòng kèm việc cần làm
npm run profiles:check  # dựng từng profile vào thư mục tạm, rồi chạy npm ci, lint, typecheck, test:coverage, build
```

Trong repo dự án, với bản chép ở `.ai-orchestrator/`:

```
node .ai-orchestrator/scripts/jira-sync.mjs --dry-run      # chạy thử đối soát, không ghi gì lên Jira
node .ai-orchestrator/scripts/install-hooks.mjs            # cài hook git; script prepare gọi lệnh này
node .ai-orchestrator/scripts/coverage-diff.mjs --base origin/develop  # coverage của dòng thay đổi, chạy trước khi push
node .ai-orchestrator/scripts/merge-gate.mjs --dry-run     # PR nào sẽ được merge, PR nào còn thiếu gì; không merge
node .ai-orchestrator/scripts/audit.mjs --sha <commit> --branch develop --dry-run  # commit (hash 7–40 chữ số hex) có qua đủ cổng không; không gắn cờ
node .ai-orchestrator/scripts/ao-agent.mjs <role> -p "<prompt>"  # chạy một agent làm phiên chính; bỏ -p để làm trực tiếp với agent
node .ai-orchestrator/scripts/ao-step.mjs <status|intake|preview|spec|plan|request|build|review|fix|qa|release|ship|rollback> [<KEY>|<PR>] [--go]  # bước của lệnh /ao-*: kiểm, rồi chạy với --go
node .ai-orchestrator/scripts/ao-step.mjs run <EPIC>|<KEY>... [--go] [--budget <USD>]  # bộ điều phối của /ao-run; run --stop: dừng sau các lệnh đang chạy
node .ai-orchestrator/scripts/ao-step.mjs watch [--once] [--quiet <phút>]  # watcher: chỉ đọc file, không chạy model, chỉ báo khi có điều mới
node .ai-orchestrator/scripts/design-inbox.mjs <add|skip|render|check|codes> ...  # hộp thiết kế của /ao-design: giữ file nguồn, chụp ảnh từng khung, sổ mã màn hình
node .ai-orchestrator/scripts/dep-check.mjs <npm|maven> <name>@<version>  # kiểm một thư viện trước khi cài; đạt thì ghi vào dependencies.approved của project.yaml
node .ai-orchestrator/scripts/run.mjs <app|.> <script> [-- <tham số>]  # chạy một script của một app, in tóm tắt; log đầy đủ ở .ai/tmp/
node .ai-orchestrator/scripts/render-agents.mjs --project .      # sinh lại agent của dự án: mã space, skill theo stack
node .ai-orchestrator/scripts/check-design.mjs <design.md>       # kiểm design.md và ảnh của nó, như job policy
```

CI ([.github/workflows/contract.yml](.github/workflows/contract.yml)) chạy `npm ci`, `npm run validate`, `npm test`, `npm run render:check`, `npm run jira:checklist:check` và `npm run agents:check` trên mọi PR và mỗi lần push vào `main`. Job `windows` chạy thêm một phần test trên Windows, nơi agent chạy.

`jira:check` không chạy trong CI, vì đọc cấu hình workflow cần quyền admin. Lệnh chạy trên máy bạn, chỉ gửi request đọc, và trả mã khác 0 khi có chỗ lệch. Lệnh kiểm status, transition và rule của transition (Restrict theo group, hỏi Resolution, đặt Resolution), workflow scheme, group và thành viên, resolution, field và giá trị, filter và cột của board. Những gì API không cho đọc, lệnh in thành dòng `Check by hand` để bạn xem tay; token sắp hết hạn (dưới 14 ngày, theo `tracker/jira.yaml`) chỉ được cảnh báo. Lệnh cần hai biến:

- `JIRA_ADMIN_EMAIL`: email Atlassian của bạn.
- `JIRA_ADMIN_TOKEN`: API token có scope của bạn (Create API token with scopes, app Jira), chỉ gồm các scope đọc: `read:jira-work`, `read:workflow:jira`, `read:workflow-scheme:jira`, `read:issue-type-scheme:jira`, `read:issue-type:jira`, `read:project:jira`, `read:project-category:jira`, `read:application-role:jira`, `read:avatar:jira`, `read:group:jira`, `read:user:jira`, `read:field:jira`, `read:custom-field-contextual-configuration:jira`, `read:field.option:jira`, `read:issue-type-screen-scheme:jira`, `read:screen-scheme:jira`, `read:screen-tab:jira`, `read:screenable-field:jira`, `read:board-scope:jira-software`, `read:board-scope.admin:jira-software`.

`jira-sync` chạy thật trên GitHub Actions. Muốn chạy thử ở máy, đặt `GITHUB_EVENT_NAME`, `GITHUB_EVENT_PATH` (file JSON của sự kiện) và `JIRA_CI_TOKEN`. Với `--dry-run`, lệnh in các thay đổi sẽ làm, như `Made DEMO-3: Submit` hay `Waiting DEMO-3: Deploy to QA needs merge-approved`, và không gửi request ghi nào.

## Cấu trúc thư mục

```
contract/           6 file YAML của hợp đồng; JSON Schema của từng file nằm trong contract/schema/
templates/          14 template artifact: spec, design, plan, ADR, Epic, Story, Task, Bug, PR, các báo cáo, release note, ledger
agents/             roster.yaml (model, effort, max_turns, tool, quyền, skill), prompt của từng vai trò, rules.md, settings.json (nguồn của .claude/settings.json); JSON Schema trong agents/schema/
tracker/jira.yaml   ánh xạ hợp đồng sang Jira, cloud id, hạn token; JSON Schema trong tracker/schema/
quality/gates.yaml  check bắt buộc, ngưỡng coverage, mẫu tắt kiểm tra, nhánh và file được bảo vệ, hai App; JSON Schema trong quality/schema/
lib/contract.mjs    thư viện chỉ đọc: loadContract, validateContract, allowedTransitions, checkTransition, routeBug
lib/rules/          8 quy tắc kiểm tra hợp đồng, mỗi quy tắc một file
lib/render.mjs      sinh nội dung docs/sdlc.md
lib/tracker/        ánh xạ và quy tắc J1–J4, quy ước mã Jira, client Jira và GitHub, dữ kiện cho guard, hook, đối soát
lib/quality/        đọc và kiểm quality/gates.yaml, token của App, coverage, mẫu tắt kiểm tra, mô tả PR, merge-gate, audit, luật của gh-guard, npm hay pnpm
lib/release/        deployer, Docker, Caddy, điểm cắt, số bản, PR release, smoke test
lib/agents/         đọc roster và roster.local.yaml, sinh agent và file quy ước, dựng lệnh của ao-agent.mjs, luật ghi file và git theo vai trò, chép skill
lib/scaffold/       project.yaml của dự án (schema, đọc, kiểm, đối chiếu), chép kit vào dự án, profile và stack, ao-kit init, add và sync, chép template
lib/workflow/       bước của các lệnh /ao-* (steps.mjs), lượt chạy agent, làn và khóa, bộ điều phối /ao-run, watcher, review sau merge
profiles/           profile theo stack: profile.yaml và khung app ghim (next-nest: Next.js + NestJS); base-pnpm: phần gốc của dự án pnpm; stacks/: một app cho ao-kit add (nextjs, react, spring-boot)
scripts/            lệnh của kit: kiểm và sinh tài liệu, Jira, ao-kit.mjs, ao-step.mjs, ao-pr.mjs, ao-agent.mjs, job policy, check-design, design-inbox, dep-check, coverage, merge-gate, audit, gh-protect, hook git, run.mjs, mvnw.mjs và ci-java.mjs cho app Java, deployer và backup trên VPS
kit/                file đặt vào repo dự án: .mcp.json, .claude/ (agent, file quy ước, skill, hook), .githooks/, .jira/config.yml, workflow CI, jira-sync, merge-gate, audit
docs/sdlc.md        sinh tự động, không sửa tay
docs/jira-setup.md  checklist dựng Jira, sinh tự động, không sửa tay
docs/getting-started.md    cài kit vào dự án, từng lệnh, từ máy trống tới Production
docs/dev-workflow.md       các lệnh /ao-* của vòng trong, làn, .ai/runs/, khi nào lệnh dừng, chạy tiếp
docs/quality-gates.md      các lớp chốt, từng check, cách xử lý khi cổng đỏ
docs/github-apps-setup.md  tạo bốn GitHub App, từng bước bấm
docs/release-workflow.md   bốn lệnh của vòng ngoài, Fix Version, hotfix, rollback, yêu cầu với dự án
docs/vps-setup.md   dựng VPS và deployer, cập nhật bản kit trên VPS
docs/agents.md      mười một agent, cách chạy, nâng effort, skill, design.md, mã màn hình, Claude Design, ảnh Figma, dung lượng repo và LFS
docs/skills.md      ba loại skill của kit; skill chuyển thể và cách so với bản gốc
vps/                file của deployer trên VPS: service, timer, cấu hình mẫu, script đặt secret
tests/              test; tests/fixtures/invalid/ chứa các hợp đồng cố tình sai, mỗi file sai một quy tắc;
                    tests/fixtures/tracker/ chứa ánh xạ sai, dữ liệu API Jira ghi sẵn và sự kiện GitHub mẫu
tasks/              plan và danh sách task của module đang làm; plan của module đã xong nằm trong tasks/archive/,
                    trừ tasks/parallel-runs/, tasks/c1/, tasks/c2/; tasks/todo.md: việc sau Pilot 3
misc/               lịch sử brainstorm và tài liệu tham khảo
```

## Quy tắc khi sửa

- `docs/sdlc.md` sinh từ YAML nên không sửa tay: sửa YAML, chạy `npm run render`, rồi commit cả hai trong cùng một commit. `docs/jira-setup.md` cũng vậy, với `npm run jira:checklist`.
- Đổi cấu hình Jira thì sửa `tracker/jira.yaml` trong cùng lần đó và chạy `jira:check`. Token chỉ nằm trong biến môi trường hoặc secret của GitHub, không bao giờ trong repo, log hay chat.
- Mọi thay đổi đi qua PR từ một nhánh ngắn: `task/<module>-<slug>` hay `task/t<N>-<slug>` cho task của một module, `feat/<slug>`, `fix/<slug>` hay `docs/<slug>` cho việc lẻ; commit message theo `CLAUDE.md`.
- Đổi artifact thì đổi template trong cùng PR; test so checklist DoR, DoD trong template với hợp đồng.
- Hỏi trước khi thêm, bớt hoặc đổi tên state, transition, cổng duyệt; khi đổi giới hạn WIP, rework, retry hay bảng định tuyến bug; và khi thêm dependency (spec mục 8).
- Không tắt hay hạ một check để PR xanh. Hỏi trước khi thêm ngoại lệ `npm audit`, tạo GitHub App hay đổi quyền của App, và áp ruleset lên repo thật (mục 8 của `SPEC-quality-gates.md`).

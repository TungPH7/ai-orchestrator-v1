# ai-orchestrator-v1

Bộ kit để phát triển web bằng các agent AI theo một quy trình SDLC thống nhất: spec, plan, code theo TDD, quality gate, review, QA, release. Danh sách module và thứ tự làm nằm ở [SPEC.md](SPEC.md).

Module đã xong:

- **`sdlc-contract`**: hợp đồng quy trình mà các module khác đọc theo ([SPEC-sdlc-contract.md](SPEC-sdlc-contract.md)).
- **`tracker-integration`**: nối hợp đồng với Jira Cloud và GitHub, để trạng thái item đổi theo dữ kiện thật và mỗi transition chỉ do đúng vai trò thực hiện ([SPEC-tracker-integration.md](SPEC-tracker-integration.md)).
- **`quality-gates`**: biến các cổng tự động của hợp đồng thành kiểm tra thật. Code chỉ vào `develop`, `main`, `release/*` và chỉ được deploy khi đã qua CI, có báo cáo review và có approve của bạn, kể cả khi repo private ở gói Free không có branch protection ([SPEC-quality-gates.md](SPEC-quality-gates.md)).

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
| Workflow `CI` và `merge-gate` | GitHub Actions | `CI` có bốn check: `policy`, `build-test`, `secrets`, `sast`. `merge-gate` chỉ merge PR của agent khi `CI` xanh, có báo cáo của `reviewer` và `security` không còn Critical hay High, và bạn đã approve trên commit đầu |
| `audit` | GitHub Actions, trước mỗi lần deploy | Commit không qua đủ cổng thì không được deploy, và item Jira mang cờ "Needs you" |

Hai lớp đầu bắt lỗi sớm, nhưng chạy trên máy nên bỏ qua được. `merge-gate` và `audit` chạy trên GitHub, nên không phụ thuộc vào máy bạn. Repo hỗ trợ ruleset (repo public, hoặc gói Pro trở lên) thì `npm run gh:protect` áp thêm một ruleset.

Hai GitHub App giúp bạn approve được PR của agent, vì GitHub không cho tác giả PR approve PR của chính mình:

| App | Ai dùng | Làm gì |
|---|---|---|
| `ao-dev` | `ba`, `sa`, `fe-dev`, `be-dev`, `devops`, và `merge-gate` | Agent mở và sửa PR bằng `ao-pr.mjs`; `merge-gate` squash merge |
| `ao-review` | `reviewer`, `security` | Đăng báo cáo review bằng `ao-pr.mjs review` |

[docs/quality-gates.md](docs/quality-gates.md) giải thích vòng của một PR, từng check, cách đọc job summary, cách xử lý khi một cổng đỏ, và khi nào bạn phải tự merge. [docs/github-apps-setup.md](docs/github-apps-setup.md) hướng dẫn tạo hai App.

## Cài kit vào repo dự án

Thư mục `kit/` chứa các file đặt vào repo dự án, giữ đúng đường dẫn tương đối. Tới khi có `project-scaffold`, bạn chép tay như đã làm với `ao-pilot`:

1. Tạo `.ai-orchestrator/` ở gốc repo dự án. Chép vào đó `contract/`, `lib/`, `tracker/`, `quality/`, cùng `package.json` và `package-lock.json` của kit. Chép vào `.ai-orchestrator/scripts/` các script `ao-pr.mjs`, `audit.mjs`, `check-policy.mjs`, `commit-msg.mjs`, `coverage-diff.mjs`, `install-hooks.mjs`, `jira-sync.mjs`, `merge-gate.mjs`, `pre-commit.mjs`, `pre-push.mjs`. Chạy `npm ci --prefix .ai-orchestrator`, như các workflow.
2. Chép `kit/.claude/`, `kit/.githooks/`, `kit/.mcp.json`, `kit/.jira/config.yml` và bốn workflow trong `kit/.github/workflows/` (`ci.yml`, `jira-sync.yml`, `merge-gate.yml`, `audit.yml`) vào gốc repo. Trong `.claude/settings.json`, thay các giá trị mẫu: `AO_JIRA_SPACE` bằng mã space, `AO_APPROVERS` bằng login GitHub của bạn, còn `AO_DEV_APP`, `AO_DEV_APP_ID`, `AO_REVIEW_APP`, `AO_REVIEW_APP_ID` bằng slug và App ID của hai App.
3. Thêm `.ai-orchestrator/node_modules/` và `.claude/settings.local.json` vào `.gitignore`.
4. Trong `package.json` của dự án, khai các script mà job `build-test` chạy: `lint`, `typecheck`, `test:coverage` (ghi lcov vào `coverage/lcov.info`) và `build`. Thêm `"prepare": "node .ai-orchestrator/scripts/install-hooks.mjs"` để `npm install` tự cài hook git. Script `precommit`, ví dụ lint các file đã stage, là tùy chọn; hook `pre-commit` gọi nó sau secretlint.
5. Tạo hai GitHub App theo [docs/github-apps-setup.md](docs/github-apps-setup.md), cài vào repo, rồi đặt `AO_DEV_APP_KEY_FILE` và `AO_REVIEW_APP_KEY_FILE` trên máy bạn.
6. Trên GitHub:
   - tạo ba environment `development`, `staging`, `production`;
   - tạo environment `merge-gate` chỉ cho nhánh mặc định, với secret `AO_DEV_APP_KEY`; từng bước ở mục "Environment `merge-gate`" của [docs/quality-gates.md](docs/quality-gates.md);
   - đặt secret `JIRA_CI_TOKEN`;
   - cho workflow deploy gọi `audit.yml` trước, và job deploy `needs: audit`. Mẫu nằm ở đầu `kit/.github/workflows/audit.yml`;
   - đưa mọi file lên nhánh mặc định, vì GitHub chỉ chạy trigger `workflow_run` và `deployment_status` từ nhánh đó. Workflow CI của kit tên `CI`, là tên `jira-sync` chờ để chạy lại.
7. Nối app GitHub for Jira với repo. Lần đầu thêm `.jira/config.yml` thì ngắt rồi nối lại kết nối.
8. Mở `claude` trong repo một lần: tin cậy thư mục, cho phép server `atlassian`, và `/mcp` phải báo connected.
9. Từ repo kit, chạy `npm run gh:protect -- --repo <owner>/<name>`. Repo private ở gói Free chỉ được báo soft mode.

Về sau, cập nhật bản chép kit cũng phải đi qua PR, và PR đó do bạn merge, vì nó sửa file được bảo vệ. Push thẳng lên `develop` làm `audit` chặn deploy và gắn cờ item.

## Biến môi trường và secret

| Biến | Đặt ở đâu | Ai dùng |
|---|---|---|
| `ATLASSIAN_AGENT_TOKEN` | Biến môi trường user trên máy chạy Claude Code | `.mcp.json` gửi token này cho Rovo MCP; hook `jira-guard` và `jira-rework` đọc dữ kiện Jira bằng nó |
| `JIRA_CI_TOKEN` | Secret của repo dự án trên GitHub | `jira-sync`; `audit` dùng nó để gắn cờ item |
| `AO_JIRA_SPACE`, `AO_APPROVERS` | Mục `env` trong `.claude/settings.json` của dự án; biến môi trường cùng tên được ưu tiên | Các hook, `jira-sync`, `merge-gate` và `audit`. `AO_APPROVERS` nhận nhiều login, cách nhau bằng dấu phẩy |
| `GITHUB_TOKEN` | Có sẵn trong GitHub Actions; ở máy, không đặt thì lấy từ GitHub CLI | `jira-sync`, `merge-gate` và `audit` đọc PR, review, check bằng nó; `jira-guard` đọc dữ kiện PR, CI |
| `AO_KIT_DIR` | Không bắt buộc | Các hook tìm kit ở đây thay cho `.ai-orchestrator/` |
| `JIRA_ADMIN_EMAIL`, `JIRA_ADMIN_TOKEN` | Biến môi trường user trên máy bạn | `jira:check` |
| `AO_DEV_APP`, `AO_DEV_APP_ID`, `AO_REVIEW_APP`, `AO_REVIEW_APP_ID` | Mục `env` trong `.claude/settings.json` của dự án | `ao-pr.mjs`: slug và App ID của hai GitHub App, không bí mật ([docs/github-apps-setup.md](docs/github-apps-setup.md)) |
| `AO_DEV_APP_KEY_FILE`, `AO_REVIEW_APP_KEY_FILE` | Biến môi trường user trên máy bạn; giá trị là đường dẫn tới file private key | `ao-pr.mjs`. Thiếu trong môi trường của tiến trình thì đọc từ biến user trên Windows |
| `AO_DEV_APP_KEY` | Secret của environment `merge-gate` trên GitHub | `merge-gate` merge bằng App `ao-dev`. Đây là private key thứ hai của App, khác file key trên máy bạn |

Token đặt bằng hộp thoại Environment Variables của Windows, không gõ qua chat. Secret của GitHub đặt bằng cách pipe token vào `gh secret set`, để token không nằm trong lịch sử lệnh.

## Lệnh

Cần Node.js 24. `gh:protect` và các bước cài đặt dùng GitHub CLI; nên dùng `gh` 2.102.0 trở lên, lý do ở mục "GitHub CLI trên máy bạn" của [docs/quality-gates.md](docs/quality-gates.md).

```
npm install             # trong CI dùng npm ci
npm run validate        # kiểm hợp đồng (quy tắc R1–R8), ánh xạ Jira (J1–J4) và quality/gates.yaml (Q1–Q4)
npm test                # test của validator, thư viện, kịch bản và template
npm run render          # sinh lại docs/sdlc.md từ YAML
npm run render:check    # báo lỗi nếu docs/sdlc.md cũ hơn YAML
npm run jira:checklist  # sinh lại docs/jira-setup.md, checklist dựng Jira
npm run jira:checklist:check  # báo lỗi nếu docs/jira-setup.md cũ hơn YAML
npm run jira:check -- --space DEMO  # chỉ đọc: so cấu hình Jira thật của space với tracker/jira.yaml
npm run gh:protect -- --repo <owner>/<name>  # áp ruleset khi repo hỗ trợ; repo private gói Free: chỉ báo soft mode
```

Trong repo dự án, với bản chép ở `.ai-orchestrator/`:

```
node .ai-orchestrator/scripts/jira-sync.mjs --dry-run      # chạy thử đối soát, không ghi gì lên Jira
node .ai-orchestrator/scripts/install-hooks.mjs            # cài hook git; script prepare gọi lệnh này
node .ai-orchestrator/scripts/coverage-diff.mjs --base origin/develop  # coverage của dòng thay đổi, chạy trước khi push
node .ai-orchestrator/scripts/merge-gate.mjs --dry-run     # PR nào sẽ được merge, PR nào còn thiếu gì; không merge
node .ai-orchestrator/scripts/audit.mjs --sha <commit> --branch develop --dry-run  # commit có qua đủ cổng không; không gắn cờ
```

CI ([.github/workflows/contract.yml](.github/workflows/contract.yml)) chạy `npm ci`, `npm run validate`, `npm test`, `npm run render:check` và `npm run jira:checklist:check` trên mọi PR và mỗi lần push vào `main`.

`jira:check` không chạy trong CI, vì đọc cấu hình workflow cần quyền admin. Lệnh chạy trên máy bạn, chỉ gửi request đọc, và trả mã khác 0 khi có chỗ lệch. Lệnh kiểm status, transition và rule của transition (Restrict theo group, hỏi Resolution, đặt Resolution), workflow scheme, group và thành viên, resolution, field và giá trị, filter và cột của board. Những gì API không cho đọc, lệnh in thành dòng `Check by hand` để bạn xem tay; token sắp hết hạn (dưới 14 ngày, theo `tracker/jira.yaml`) chỉ được cảnh báo. Lệnh cần hai biến:

- `JIRA_ADMIN_EMAIL`: email Atlassian của bạn.
- `JIRA_ADMIN_TOKEN`: API token có scope của bạn (Create API token with scopes, app Jira), chỉ gồm các scope đọc: `read:jira-work`, `read:workflow:jira`, `read:workflow-scheme:jira`, `read:issue-type-scheme:jira`, `read:issue-type:jira`, `read:project:jira`, `read:project-category:jira`, `read:application-role:jira`, `read:avatar:jira`, `read:group:jira`, `read:user:jira`, `read:field:jira`, `read:custom-field-contextual-configuration:jira`, `read:field.option:jira`, `read:issue-type-screen-scheme:jira`, `read:screen-scheme:jira`, `read:screen-tab:jira`, `read:screenable-field:jira`, `read:board-scope:jira-software`, `read:board-scope.admin:jira-software`.

`jira-sync` chạy thật trên GitHub Actions. Muốn chạy thử ở máy, đặt `GITHUB_EVENT_NAME`, `GITHUB_EVENT_PATH` (file JSON của sự kiện) và `JIRA_CI_TOKEN`. Với `--dry-run`, lệnh in các thay đổi sẽ làm, như `Made DEMO-3: Submit` hay `Waiting DEMO-3: Deploy to QA needs merge-approved`, và không gửi request ghi nào.

## Cấu trúc thư mục

```
contract/           6 file YAML của hợp đồng; JSON Schema của từng file nằm trong contract/schema/
templates/          12 template artifact: spec, plan, ADR, Story, Task, Bug, PR, các báo cáo, release note, ledger
tracker/jira.yaml   ánh xạ hợp đồng sang Jira, cloud id, hạn token; JSON Schema trong tracker/schema/
quality/gates.yaml  check bắt buộc, ngưỡng coverage, mẫu tắt kiểm tra, nhánh và file được bảo vệ, hai App; JSON Schema trong quality/schema/
lib/contract.mjs    thư viện chỉ đọc: loadContract, validateContract, allowedTransitions, checkTransition, routeBug
lib/rules/          8 quy tắc kiểm tra hợp đồng, mỗi quy tắc một file
lib/render.mjs      sinh nội dung docs/sdlc.md
lib/tracker/        ánh xạ và quy tắc J1–J4, quy ước mã Jira, client Jira và GitHub, dữ kiện cho guard, hook, đối soát
lib/quality/        đọc và kiểm quality/gates.yaml, token của App, coverage, mẫu tắt kiểm tra, mô tả PR, merge-gate, audit, luật của gh-guard
scripts/            lệnh của kit: kiểm và sinh tài liệu, Jira, ao-pr.mjs, job policy, coverage, merge-gate, audit, gh-protect, hook git
kit/                file đặt vào repo dự án: .mcp.json, .claude/ (hook), .githooks/, .jira/config.yml, workflow CI, jira-sync, merge-gate, audit
docs/sdlc.md        sinh tự động, không sửa tay
docs/jira-setup.md  checklist dựng Jira, sinh tự động, không sửa tay
docs/quality-gates.md      các lớp chốt, từng check, cách xử lý khi cổng đỏ
docs/github-apps-setup.md  tạo hai GitHub App, từng bước bấm
tests/              test; tests/fixtures/invalid/ chứa các hợp đồng cố tình sai, mỗi file sai một quy tắc;
                    tests/fixtures/tracker/ chứa ánh xạ sai, dữ liệu API Jira ghi sẵn và sự kiện GitHub mẫu
tasks/              plan và danh sách task của module đang làm; plan của module đã xong nằm trong tasks/archive/
misc/               lịch sử brainstorm và tài liệu tham khảo
```

## Quy tắc khi sửa

- `docs/sdlc.md` sinh từ YAML nên không sửa tay: sửa YAML, chạy `npm run render`, rồi commit cả hai trong cùng một commit. `docs/jira-setup.md` cũng vậy, với `npm run jira:checklist`.
- Đổi cấu hình Jira thì sửa `tracker/jira.yaml` trong cùng lần đó và chạy `jira:check`. Token chỉ nằm trong biến môi trường hoặc secret của GitHub, không bao giờ trong repo, log hay chat.
- Mọi thay đổi đi qua PR từ một nhánh ngắn `task/t<N>-<slug>`; commit message theo `CLAUDE.md`.
- Đổi artifact thì đổi template trong cùng PR; test so checklist DoR, DoD trong template với hợp đồng.
- Hỏi trước khi thêm, bớt hoặc đổi tên state, transition, cổng duyệt; khi đổi giới hạn WIP, rework, retry hay bảng định tuyến bug; và khi thêm dependency (spec mục 8).
- Không tắt hay hạ một check để PR xanh. Hỏi trước khi thêm ngoại lệ `npm audit`, tạo GitHub App hay đổi quyền của App, và áp ruleset lên repo thật (mục 8 của `SPEC-quality-gates.md`).

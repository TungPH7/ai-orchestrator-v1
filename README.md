# ai-orchestrator-v1

Bộ kit để phát triển web bằng các agent AI theo một quy trình SDLC thống nhất: spec, plan, code theo TDD, quality gate, review, QA, release. Danh sách module và thứ tự làm nằm ở [SPEC.md](SPEC.md).

Module đã xong:

- **`sdlc-contract`**: hợp đồng quy trình mà các module khác đọc theo ([SPEC-sdlc-contract.md](SPEC-sdlc-contract.md)).
- **`tracker-integration`**: nối hợp đồng với Jira Cloud và GitHub, để trạng thái item đổi theo dữ kiện thật và mỗi transition chỉ do đúng vai trò thực hiện ([SPEC-tracker-integration.md](SPEC-tracker-integration.md)).

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

### Cài kit vào repo dự án

Thư mục `kit/` chứa các file đặt vào repo dự án, giữ đúng đường dẫn tương đối. Tới khi có `project-scaffold`, bạn chép tay như đã làm với `ao-pilot`:

1. Tạo `.ai-orchestrator/` ở gốc repo dự án. Chép vào đó `contract/`, `lib/`, `tracker/`, `scripts/jira-sync.mjs`, cùng một `package.json` chỉ có hai dependency `ajv` và `yaml` (đúng phiên bản của kit). Chạy `npm install --prefix .ai-orchestrator` và commit cả `package-lock.json`, vì workflow dùng `npm ci`.
2. Chép `kit/.claude/`, `kit/.mcp.json`, `kit/.jira/config.yml` và `kit/.github/workflows/jira-sync.yml` vào gốc repo. Trong `.claude/settings.json`, thay `AO_JIRA_SPACE` bằng mã space và `AO_APPROVERS` bằng login GitHub của bạn.
3. Thêm `.ai-orchestrator/node_modules/` và `.claude/settings.local.json` vào `.gitignore`.
4. Trên GitHub: tạo ba environment `development`, `staging`, `production`; đặt secret `JIRA_CI_TOKEN`; đặt tên workflow CI của dự án là `CI`, vì `jira-sync` chạy lại sau mỗi lần workflow này xong. Đưa mọi file lên nhánh mặc định, vì GitHub chỉ chạy trigger `workflow_run` và `deployment_status` từ nhánh đó.
5. Nối app GitHub for Jira với repo. Lần đầu thêm `.jira/config.yml` thì ngắt rồi nối lại kết nối.
6. Mở `claude` trong repo một lần: tin cậy thư mục, cho phép server `atlassian`, và `/mcp` phải báo connected.

### Biến môi trường

| Biến | Đặt ở đâu | Ai dùng |
|---|---|---|
| `ATLASSIAN_AGENT_TOKEN` | Biến môi trường user trên máy chạy Claude Code | `.mcp.json` gửi token này cho Rovo MCP; hook `jira-guard` và `jira-rework` đọc dữ kiện Jira bằng nó |
| `JIRA_CI_TOKEN` | Secret của repo dự án trên GitHub | `jira-sync` |
| `AO_JIRA_SPACE`, `AO_APPROVERS` | Mục `env` trong `.claude/settings.json` của dự án; biến môi trường cùng tên được ưu tiên | Các hook và `jira-sync`. `AO_APPROVERS` nhận nhiều login, cách nhau bằng dấu phẩy |
| `GITHUB_TOKEN` | Có sẵn trong GitHub Actions; ở máy, không đặt thì lấy từ GitHub CLI | `jira-sync`, và `jira-guard` để đọc dữ kiện PR, CI |
| `AO_KIT_DIR` | Không bắt buộc | Các hook tìm kit ở đây thay cho `.ai-orchestrator/` |
| `JIRA_ADMIN_EMAIL`, `JIRA_ADMIN_TOKEN` | Biến môi trường user trên máy bạn | `jira:check` |
| `AO_DEV_APP`, `AO_DEV_APP_ID`, `AO_REVIEW_APP`, `AO_REVIEW_APP_ID` | Mục `env` trong `.claude/settings.json` của dự án | `ao-pr.mjs`: slug và App ID của hai GitHub App, không bí mật ([docs/github-apps-setup.md](docs/github-apps-setup.md)) |
| `AO_DEV_APP_KEY_FILE`, `AO_REVIEW_APP_KEY_FILE` | Biến môi trường user trên máy bạn; giá trị là đường dẫn tới file private key | `ao-pr.mjs`. Thiếu trong môi trường của tiến trình thì đọc từ biến user trên Windows |

Token đặt bằng hộp thoại Environment Variables của Windows, không gõ qua chat. Secret của GitHub đặt bằng cách pipe token vào `gh secret set`, để token không nằm trong lịch sử lệnh.

## Lệnh

Cần Node.js 24.

```
npm install             # trong CI dùng npm ci
npm run validate        # kiểm hợp đồng (quy tắc R1–R8) và ánh xạ Jira (J1–J4)
npm test                # test của validator, thư viện, kịch bản và template
npm run render          # sinh lại docs/sdlc.md từ YAML
npm run render:check    # báo lỗi nếu docs/sdlc.md cũ hơn YAML
npm run jira:checklist  # sinh lại docs/jira-setup.md, checklist dựng Jira
npm run jira:checklist:check  # báo lỗi nếu docs/jira-setup.md cũ hơn YAML
npm run jira:check -- --space DEMO  # chỉ đọc: so cấu hình Jira thật của space với tracker/jira.yaml
node .ai-orchestrator/scripts/jira-sync.mjs --dry-run  # trong repo dự án: chạy thử đối soát, không ghi gì lên Jira
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
lib/contract.mjs    thư viện chỉ đọc: loadContract, validateContract, allowedTransitions, checkTransition, routeBug
lib/rules/          8 quy tắc kiểm tra hợp đồng, mỗi quy tắc một file
lib/render.mjs      sinh nội dung docs/sdlc.md
lib/tracker/        ánh xạ và quy tắc J1–J4, quy ước mã Jira, client Jira và GitHub, dữ kiện cho guard, hook, đối soát
scripts/            validate-contract.mjs, render-docs.mjs, jira-checklist.mjs, jira-check.mjs, jira-sync.mjs
kit/                file đặt vào repo dự án: .mcp.json, .claude/ (hook), .jira/config.yml, workflow jira-sync
docs/sdlc.md        sinh tự động, không sửa tay
docs/jira-setup.md  checklist dựng Jira, sinh tự động, không sửa tay
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

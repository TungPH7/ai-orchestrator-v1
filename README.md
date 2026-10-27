# ai-orchestrator-v1

Bộ kit để phát triển web bằng các agent AI theo một quy trình SDLC thống nhất: spec, plan, code theo TDD, quality gate, review, QA, release. Danh sách module và thứ tự làm nằm ở [SPEC.md](SPEC.md).

Module đã xong: **`sdlc-contract`**, hợp đồng quy trình mà các module khác đọc theo ([SPEC-sdlc-contract.md](SPEC-sdlc-contract.md)).

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
```

CI ([.github/workflows/contract.yml](.github/workflows/contract.yml)) chạy `npm ci`, `npm run validate`, `npm test`, `npm run render:check` và `npm run jira:checklist:check` trên mọi PR và mỗi lần push vào `main`.

## Cấu trúc thư mục

```
contract/           6 file YAML của hợp đồng; JSON Schema của từng file nằm trong contract/schema/
templates/          12 template artifact: spec, plan, ADR, Story, Task, Bug, PR, các báo cáo, release note, ledger
lib/contract.mjs    thư viện chỉ đọc: loadContract, validateContract, allowedTransitions, checkTransition, routeBug
lib/rules/          8 quy tắc kiểm tra, mỗi quy tắc một file
lib/render.mjs      sinh nội dung docs/sdlc.md
scripts/            validate-contract.mjs, render-docs.mjs
docs/sdlc.md        sinh tự động, không sửa tay
tests/              test; tests/fixtures/invalid/ chứa các hợp đồng cố tình sai, mỗi file sai một quy tắc
tasks/              plan và danh sách task của module đang làm
misc/               lịch sử brainstorm và tài liệu tham khảo
```

## Quy tắc khi sửa

- `docs/sdlc.md` sinh từ YAML nên không sửa tay: sửa YAML, chạy `npm run render`, rồi commit cả hai trong cùng một commit.
- Mọi thay đổi đi qua PR từ một nhánh ngắn `task/t<N>-<slug>`; commit message theo `CLAUDE.md`.
- Đổi artifact thì đổi template trong cùng PR; test so checklist DoR, DoD trong template với hợp đồng.
- Hỏi trước khi thêm, bớt hoặc đổi tên state, transition, cổng duyệt; khi đổi giới hạn WIP, rework, retry hay bảng định tuyến bug; và khi thêm dependency (spec mục 8).

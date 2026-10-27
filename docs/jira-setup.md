<!-- Generated from contract/ and tracker/jira.yaml by scripts/jira-checklist.mjs. Do not edit by hand: change the YAML, then run `npm run jira:checklist`. -->

# Dựng Jira cho một dự án

Checklist dựng tay theo hợp đồng trong `contract/` và ánh xạ `tracker/jira.yaml`, cho gói Jira Free. Làm theo thứ tự; mỗi dự án chỉ dựng một lần. Lý do của từng mục nằm ở [SPEC-tracker-integration.md](../SPEC-tracker-integration.md), mục 2.

Tên menu của Jira thay đổi theo thời gian: nếu không thấy đúng tên, tìm mục gần nhất và giữ nguyên tên trong checklist.

## 1. Group và service account

Tạo group ở admin.atlassian.com → Directory → Groups → Create group. Rule Restrict ở mục 4 cho phép transition theo group.

Hai cách thêm thành viên. Tài khoản thường: mở group → Add users. Service account: thêm từ trang của chính nó, ở Directory → Service accounts → chọn service account → ••• → Add to group.

- [ ] Tạo group `ao-humans` cho danh tính `human`
- [ ] Tạo group `ao-agents` cho danh tính `agents`
- [ ] Tạo group `ao-automation` cho danh tính `automation`
- [ ] Group `ao-humans`: thêm tài khoản admin của bạn (`site-admin`) bằng Add users, vai trò `human`
- [ ] Group `ao-agents`: thêm service account `orchestratoragent` bằng Add to group, vai trò `pm`, `ba`, `ux`, `sa`, `fe-dev`, `be-dev`, `reviewer`, `security`, `qa`, `devops`
- [ ] Group `ao-automation`: thêm service account `orchestratorci` bằng Add to group, vai trò `automation`
- [ ] Token của `orchestratoragent` hết hạn 2027-10-27, nằm trong biến môi trường `ATLASSIAN_AGENT_TOKEN`, không nằm trong file nào
- [ ] Token của `orchestratorci` hết hạn 2027-10-27, nằm trong biến môi trường `JIRA_CI_TOKEN`, không nằm trong file nào

## 2. Rovo MCP

- [ ] Administration → Connectors → Atlassian MCP server → Authentication: bật API token

## 3. Status

Status nằm ở Jira settings → Work items → Statuses. Jira có sẵn `To Do`, `In Progress`, `Done`: dùng lại nếu đúng nhóm.

- [ ] `New`: nhóm To Do
- [ ] `Ready`: nhóm To Do
- [ ] `In Progress`: nhóm In Progress
- [ ] `In Review`: nhóm In Progress
- [ ] `Ready for QA`: nhóm In Progress
- [ ] `In QA`: nhóm In Progress
- [ ] `Done`: nhóm Done
- [ ] `Cancelled`: nhóm Done
- [ ] `Specifying`: nhóm To Do
- [ ] `Planning`: nhóm To Do
- [ ] `To Do`: nhóm To Do

## 4. Workflow

Workflow nằm ở Jira settings → Work items → Workflows. Mỗi transition có rule "Restrict who can move a work item" theo group. Nếu gói Free không có rule này, bỏ phần group và ghi lại: khi đó hook trong Claude Code là lớp chặn duy nhất với agent.

Không thêm transition nào khác. Nếu Jira tự tạo transition từ mọi status (Any status), xóa nó: state kết thúc không được có transition đi ra.

### `AO standard` (`Story`, `Task`, `Bug`)

- [ ] Tạo workflow `AO standard`, status đầu là `New`, gồm: `New`, `Ready`, `In Progress`, `In Review`, `Ready for QA`, `In QA`, `Done`, `Cancelled`
- [ ] Transition `Refine`: `New` → `Ready`. Chỉ group `ao-humans`, `ao-automation`
- [ ] Transition `Start`: `Ready` → `In Progress`. Chỉ group `ao-agents`
- [ ] Transition `Submit`: `In Progress` → `In Review`. Chỉ group `ao-automation`
- [ ] Transition `Request changes`: `In Review` → `In Progress`. Chỉ group `ao-humans`, `ao-agents`, `ao-automation`
- [ ] Transition `Deploy to QA`: `In Review` → `Ready for QA`. Chỉ group `ao-automation`
- [ ] Transition `Pick up`: `Ready for QA` → `In QA`. Chỉ group `ao-agents`
- [ ] Transition `QA fail`: `In QA` → `In Progress`. Chỉ group `ao-agents`
- [ ] Transition `Accept`: `In QA` → `Done`. Chỉ group `ao-humans`. Đặt Resolution là `Done`
- [ ] Transition `Cancel`: `New` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution
- [ ] Transition `Cancel`: `Ready` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution
- [ ] Transition `Cancel`: `In Progress` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution
- [ ] Transition `Cancel`: `In Review` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution
- [ ] Transition `Cancel`: `Ready for QA` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution
- [ ] Transition `Cancel`: `In QA` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution

### `AO epic` (`Epic`)

- [ ] Tạo workflow `AO epic`, status đầu là `New`, gồm: `New`, `Specifying`, `Planning`, `In Progress`, `Done`, `Cancelled`
- [ ] Transition `Start spec`: `New` → `Specifying`. Chỉ group `ao-humans`
- [ ] Transition `Approve spec`: `Specifying` → `Planning`. Chỉ group `ao-humans`
- [ ] Transition `Approve plan`: `Planning` → `In Progress`. Chỉ group `ao-humans`
- [ ] Transition `Complete`: `In Progress` → `Done`. Chỉ group `ao-humans`. Đặt Resolution là `Done`
- [ ] Transition `Cancel`: `New` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution
- [ ] Transition `Cancel`: `Specifying` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution
- [ ] Transition `Cancel`: `Planning` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution
- [ ] Transition `Cancel`: `In Progress` → `Cancelled`. Chỉ group `ao-humans`. Màn hình chọn Resolution

### `AO sub-task` (`Sub-task`)

- [ ] Tạo workflow `AO sub-task`, status đầu là `To Do`, gồm: `To Do`, `In Progress`, `Done`
- [ ] Transition `Start`: `To Do` → `In Progress`. Chỉ group `ao-agents`
- [ ] Transition `Complete`: `In Progress` → `Done`. Chỉ group `ao-agents`. Đặt Resolution là `Done`

## 5. Workflow scheme

- [ ] Tạo workflow scheme `AO workflow scheme`
- [ ] `Epic` → `AO epic`
- [ ] `Story` → `AO standard`
- [ ] `Sub-task` → `AO sub-task`
- [ ] `Task` → `AO standard`
- [ ] `Bug` → `AO standard`

## 6. Trường

Custom field nằm ở Jira settings → Work items → Fields.

- [ ] Tạo custom field `Found in`, loại Select List (single choice), cho `Bug`. Option: `Development`, `Staging`, `Production`
- [ ] `Affects versions`: trường có sẵn, dùng cho `Bug`
- [ ] Tạo custom field `Severity`, loại Select List (single choice), cho `Bug`. Option: `Critical`, `High`, `Medium`, `Low`
- [ ] `Fix versions`: trường có sẵn, dùng cho `Story`, `Task`, `Bug`
- [ ] Tạo custom field `Agent`, loại Select List (single choice), cho `Story`, `Sub-task`, `Task`, `Bug`. Option: `Project Manager`, `Business Analyst`, `UI/UX designer`, `Solution Architect`, `Frontend Developer`, `Backend Developer`, `Code Reviewer`, `Security Engineer`, `Tester/QA Engineer`, `DevOps Engineer`
- [ ] Không tạo trường cho Rework count: số này được đếm từ lịch sử chuyển trạng thái
- [ ] `Flagged`: trường có sẵn, dùng cho `Epic`, `Story`, `Sub-task`, `Task`, `Bug`

## 7. Resolution

- [ ] `Won't Do`: có sẵn trong Jira, giữ lại
- [ ] `Duplicate`: có sẵn trong Jira, giữ lại
- [ ] `Not a bug`: tạo mới
- [ ] `Cannot Reproduce`: có sẵn trong Jira, giữ lại
- [ ] `Done`: có sẵn trong Jira, giữ lại

## 8. Space

- [ ] Tạo space company-managed theo template Kanban, với key của dự án (pilot: `DEMO`)
- [ ] Issue type scheme của space gồm: `Epic`, `Story`, `Sub-task`, `Task`, `Bug`
- [ ] Gán workflow scheme `AO workflow scheme` cho space
- [ ] Thêm `Found in`, `Affects versions`, `Severity`, `Fix versions`, `Agent`, `Flagged` vào màn hình tạo, sửa và xem item của space

## 9. Board

- [ ] Tạo board Kanban cho space
- [ ] Filter của board: `project = <KEY> AND issuetype != Epic ORDER BY Rank ASC`
- [ ] Cột `Backlog` (Kanban backlog): status `New`
- [ ] Cột `Ready`: status `Ready`, `To Do`
- [ ] Cột `In Progress`: status `In Progress`
- [ ] Cột `In Review`: status `In Review`. Tối đa 2
- [ ] Cột `QA`: status `Ready for QA`, `In QA`
- [ ] Cột `Done`: status `Done`
- [ ] Status `Cancelled` không gắn vào cột nào, để item rời khỏi board

## 10. GitHub for Jira

- [ ] Cài app GitHub for Jira (Apps → Explore more apps), nối tài khoản GitHub và chọn repo của dự án

## 11. Môi trường

- [ ] GitHub environment `development` trong repo dự án
- [ ] GitHub environment `staging` trong repo dự án
- [ ] GitHub environment `production` trong repo dự án
- [ ] File `.jira/config.yml` trên nhánh mặc định của repo dự án, với nội dung:

```yaml
deployments:
  environmentMapping:
    development: ["development"]
    staging: ["staging"]
    production: ["production"]
```

- [ ] Lần đầu thêm file này: ngắt rồi nối lại kết nối GitHub trong app GitHub for Jira

## 12. Kiểm lại

- [ ] Chạy `npm run jira:check -- --space <KEY>` trong repo kit: lệnh không báo chỗ lệch nào

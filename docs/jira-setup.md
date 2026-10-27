<!-- Generated from contract/ and tracker/jira.yaml by scripts/jira-checklist.mjs. Do not edit by hand: change the YAML, then run `npm run jira:checklist`. -->

# Dựng Jira cho một dự án

Checklist dựng tay theo hợp đồng trong `contract/` và ánh xạ `tracker/jira.yaml`, cho gói Jira Free. Làm theo thứ tự, vì mục sau dùng thứ mục trước tạo ra; mỗi dự án chỉ dựng một lần. Lý do của từng mục nằm ở [SPEC-tracker-integration.md](../SPEC-tracker-integration.md), mục 2.

Mỗi mục có phần **Cách làm** (bấm vào đâu) và danh sách `- [ ]` (tạo những gì). Tên nút lấy từ tài liệu của Atlassian; giao diện thật có thể khác một chút. Chỗ nào ghi "đối chiếu giao diện" là tài liệu không nêu tên nút: nếu không thấy, chụp màn hình rồi hỏi.

## 1. Group và service account

**Cách tạo group:**

1. Mở admin.atlassian.com, chọn tổ chức của bạn.
2. Menu bên trái: **Directory** → **Groups** → **Create group**.
3. Gõ tên group, bấm **Create**.

- [ ] Tạo group `ao-humans` (danh tính `human`)
- [ ] Tạo group `ao-agents` (danh tính `agents`)
- [ ] Tạo group `ao-automation` (danh tính `automation`)

**Cách thêm tài khoản của bạn vào group:**

1. **Directory** → **Groups** → bấm vào tên group.
2. Bấm **Add users**, gõ tên hoặc email của bạn, chọn tài khoản, bấm **Add**.

- [ ] Group `ao-humans`: thêm tài khoản admin của bạn (`site-admin`), vai trò `human`

**Cách thêm service account vào group** (ô tìm trong trang group chỉ lọc người đã có trong group, nên không dùng được):

1. **Directory** → **Service accounts** → bấm vào tên service account.
2. Bấm **•••** ở góc trên bên phải → **Add to group**.
3. Chọn group, xác nhận.

- [ ] Group `ao-agents`: thêm service account `orchestratoragent`, vai trò `pm`, `ba`, `ux`, `sa`, `fe-dev`, `be-dev`, `reviewer`, `security`, `qa`, `devops`
- [ ] Group `ao-automation`: thêm service account `orchestratorci`, vai trò `automation`

**Kiểm lại:** mở từng group, tài khoản phải hiện ở tab **Members** hoặc **Agents**.

- [ ] Token của `orchestratoragent` hết hạn 2027-10-27, nằm trong biến môi trường `ATLASSIAN_AGENT_TOKEN`, không nằm trong file nào
- [ ] Token của `orchestratorci` hết hạn 2027-10-27, nằm trong biến môi trường `JIRA_CI_TOKEN`, không nằm trong file nào

## 2. Rovo MCP

**Cách làm:** admin.atlassian.com → menu bên trái **Connectors** → **Atlassian MCP server** → mục **Authentication** → bật **API token**.

- [ ] API token cho Rovo MCP đã bật

## 3. Resolution

Resolution làm trước workflow, vì transition `Cancel` hỏi Resolution và các transition vào Done đặt Resolution.

**Cách làm:**

1. Trên Jira, bấm biểu tượng bánh răng ⚙ ở góc trên bên phải. Trong **Jira admin settings**, ô **Switch settings** chọn **Work items**.
2. Menu bên trái, kéo xuống, chọn **Resolutions**.
3. Xem danh sách: tên nào bên dưới đã có (đúng chữ hoa, chữ thường) thì đánh dấu là xong.
4. Tên nào chưa có: bấm **Add resolution**, gõ tên, bấm **Add**.

Nếu danh sách có hai resolution `Done` cùng mô tả "GreenHopper Managed Resolution", giữ nguyên cả hai, đừng xóa: Jira Software tự tạo chúng, xóa đi có thể làm hỏng transition của space khác, và Jira có thể tạo lại. Khi một rule ở mục 5 cần chọn `Done`, chọn cái đứng đầu danh sách.

- [ ] Resolution `Won't Do`
- [ ] Resolution `Duplicate`
- [ ] Resolution `Not a bug`
- [ ] Resolution `Cannot Reproduce`
- [ ] Resolution `Done`

## 4. Status

**Cách làm:**

1. Trên Jira, bấm biểu tượng bánh răng ⚙ ở góc trên bên phải. Trong **Jira admin settings**, ô **Switch settings** chọn **Work items**.
2. Menu bên trái, chọn **Statuses**.
3. Với từng dòng bên dưới, xem danh sách status có sẵn trước. Nếu đã có status cùng tên và cột **Category** trùng thì dùng lại, đánh dấu là xong.
4. Nếu chưa có: bấm **Add status**. Ô **Name** gõ tên, ô **Category** chọn như bên dưới, bấm **Add**.

- [ ] Name `New`, Category `To Do`
- [ ] Name `Ready`, Category `To Do`
- [ ] Name `In Progress`, Category `In Progress`
- [ ] Name `In Review`, Category `In Progress`
- [ ] Name `Ready for QA`, Category `In Progress`
- [ ] Name `In QA`, Category `In Progress`
- [ ] Name `Done`, Category `Done`
- [ ] Name `Cancelled`, Category `Done`
- [ ] Name `Specifying`, Category `To Do`
- [ ] Name `Planning`, Category `To Do`
- [ ] Name `To Do`, Category `To Do`

## 5. Workflow

**Cách mở trình sửa workflow:**

1. Trên Jira, bấm biểu tượng bánh răng ⚙ ở góc trên bên phải. Trong **Jira admin settings**, ô **Switch settings** chọn **Work items**.
2. Menu bên trái: **Workflows**.
3. Tạo workflow mới: bấm nút tạo workflow ở góc trên bên phải (đối chiếu giao diện: có thể tên là **Create workflow** hoặc **Add workflow**), gõ tên workflow.
4. Sửa workflow đã có: tìm tên workflow → **•••** → **Edit**.

**Cách thêm status vào workflow:** bấm **Add status** → tìm status đã tạo ở mục 4 → **Add**. Ở khung chi tiết bên phải, **không** tick ô "Allow all statuses to transition to this one".

**Cách thêm transition:** bấm **Add transition** ở đầu trang → chọn **From status** và **To status** → gõ tên transition → **Add**.

**Cách giới hạn ai được chuyển (rule Restrict):**

1. Bấm vào nhãn của transition trên sơ đồ. Khung **Transition** hiện ở bên phải.
2. Trong khung đó, phần **Rules** có bốn nhóm: Restrict transition, Request input, Validate details, Perform actions. Ở nhóm **Restrict transition**, bấm **Add restrict transition rule** (hoặc dấu **+**).
3. Hộp **Add rule** mở ra. Kéo danh sách bên phải xuống cuối, chọn **Restrict who can move a work item** → **Select**.
4. Ô **Restrict to** chọn **Groups** → chọn các group ghi ở dòng đó → **Add**.

**Rule đặt Resolution là Done** (đối chiếu giao diện): trong khung **Transition**, nhóm **Perform actions** → **+** → chọn rule cập nhật một trường của work item → trường **Resolution**, giá trị **Done**.

**Rule hỏi Resolution khi hủy** (đối chiếu giao diện): trong khung **Transition**, nhóm **Request input** → **+** → chọn rule hiện màn hình hoặc hỏi giá trị trường → chọn trường **Resolution** (hoặc màn hình có sẵn chứa Resolution, thường tên **Resolve Issue Screen**).

**Cuối cùng:** bấm **Update workflow** (hoặc nút lưu tương ứng) để lưu.

Lưu ý:

- Workflow mới có thể có sẵn vài status hoặc transition mẫu. Xóa mọi status và transition không có trong danh sách bên dưới.
- Mũi tên **Create** (item mới tạo) phải đi vào status đầu ghi ở dòng "Tạo workflow".
- Không có transition nào từ "Any status": item đã Done hoặc Cancelled không được chuyển đi đâu nữa.
- Nếu không tìm thấy rule **Restrict who can move a work item** (gói Free có thể không có), bỏ phần group, chụp màn hình danh sách rule rồi báo lại. Khi đó hook trong Claude Code là lớp chặn duy nhất với agent.

### `AO standard` (`Story`, `Task`, `Bug`)

- [ ] Tạo workflow `AO standard`, status đầu là `New`
- [ ] Thêm status: `New`, `Ready`, `In Progress`, `In Review`, `Ready for QA`, `In QA`, `Done`, `Cancelled`
- [ ] Transition `Refine`: From `New`, To `Ready`. Restrict → Groups: `ao-humans`, `ao-automation`
- [ ] Transition `Start`: From `Ready`, To `In Progress`. Restrict → Groups: `ao-agents`
- [ ] Transition `Submit`: From `In Progress`, To `In Review`. Restrict → Groups: `ao-automation`
- [ ] Transition `Request changes`: From `In Review`, To `In Progress`. Restrict → Groups: `ao-humans`, `ao-agents`, `ao-automation`
- [ ] Transition `Deploy to QA`: From `In Review`, To `Ready for QA`. Restrict → Groups: `ao-automation`
- [ ] Transition `Pick up`: From `Ready for QA`, To `In QA`. Restrict → Groups: `ao-agents`
- [ ] Transition `QA fail`: From `In QA`, To `In Progress`. Restrict → Groups: `ao-agents`
- [ ] Transition `Accept`: From `In QA`, To `Done`. Restrict → Groups: `ao-humans`. Rule đặt Resolution là `Done`
- [ ] Transition `Cancel`: From `New`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Transition `Cancel`: From `Ready`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Transition `Cancel`: From `In Progress`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Transition `Cancel`: From `In Review`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Transition `Cancel`: From `Ready for QA`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Transition `Cancel`: From `In QA`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Bấm **Update workflow** để lưu

### `AO epic` (`Epic`)

- [ ] Tạo workflow `AO epic`, status đầu là `New`
- [ ] Thêm status: `New`, `Specifying`, `Planning`, `In Progress`, `Done`, `Cancelled`
- [ ] Transition `Start spec`: From `New`, To `Specifying`. Restrict → Groups: `ao-humans`
- [ ] Transition `Approve spec`: From `Specifying`, To `Planning`. Restrict → Groups: `ao-humans`
- [ ] Transition `Approve plan`: From `Planning`, To `In Progress`. Restrict → Groups: `ao-humans`
- [ ] Transition `Complete`: From `In Progress`, To `Done`. Restrict → Groups: `ao-humans`. Rule đặt Resolution là `Done`
- [ ] Transition `Cancel`: From `New`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Transition `Cancel`: From `Specifying`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Transition `Cancel`: From `Planning`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Transition `Cancel`: From `In Progress`, To `Cancelled`. Restrict → Groups: `ao-humans`. Rule hỏi Resolution khi hủy
- [ ] Bấm **Update workflow** để lưu

### `AO sub-task` (`Sub-task`)

- [ ] Tạo workflow `AO sub-task`, status đầu là `To Do`
- [ ] Thêm status: `To Do`, `In Progress`, `Done`
- [ ] Transition `Start`: From `To Do`, To `In Progress`. Restrict → Groups: `ao-agents`
- [ ] Transition `Complete`: From `In Progress`, To `Done`. Restrict → Groups: `ao-agents`. Rule đặt Resolution là `Done`
- [ ] Bấm **Update workflow** để lưu

## 6. Work type

Workflow scheme chỉ gắn được work type đã có trên site, nên tạo đủ work type trước.

**Cách làm:**

1. Trên Jira, bấm biểu tượng bánh răng ⚙ ở góc trên bên phải. Trong **Jira admin settings**, ô **Switch settings** chọn **Work items**.
2. Menu bên trái, chọn **Work types**. Với từng dòng bên dưới, xem danh sách trước: đã có work type đúng tên thì dùng lại, đánh dấu là xong.
3. Loại Standard còn thiếu: bấm **Add work type** → ô **Name** gõ tên → nếu hộp có ô chọn loại thì chọn loại Standard (đối chiếu giao diện) → không chọn work type scheme → **Add**.
4. Loại sub-task còn thiếu: menu bên trái chọn **Sub-tasks** → **Add subtask work type** (đối chiếu giao diện) → ô **Name** gõ tên → **Add**. Nếu trang báo sub-task đang tắt, bấm **Enable** trước.
5. Tên phải đúng từng chữ như dòng bên dưới, kể cả dấu gạch nối.

- [ ] Work type `Epic`: có sẵn trong Jira, không tạo
- [ ] Work type `Story`, loại Standard
- [ ] Work type `Sub-task`, loại sub-task (trang **Sub-tasks**)
- [ ] Work type `Task`, loại Standard
- [ ] Work type `Bug`, loại Standard

## 7. Workflow scheme

**Cách làm:**

1. Trên Jira, bấm biểu tượng bánh răng ⚙ ở góc trên bên phải. Trong **Jira admin settings**, ô **Switch settings** chọn **Work items**.
2. Menu bên trái: **Workflow schemes** → **Add workflow scheme**.
3. Ô name gõ `AO workflow scheme` → **Add**.
4. Với từng workflow bên dưới: bấm **Add Workflow** → **Add Existing** → chọn workflow → **Next** → hộp **Assign Issue Types** hiện ra, tick các work type ghi ở dòng đó → **Finish**. Nếu hộp thiếu work type nào, quay lại mục 6.
5. Không tick ô **All Unassigned Issue Types**. Dòng workflow mặc định `Jira Workflow (jira)` của scheme để nguyên.

- [ ] Tạo workflow scheme `AO workflow scheme`
- [ ] Workflow `AO epic`: `Epic`
- [ ] Workflow `AO standard`: `Story`, `Task`, `Bug`
- [ ] Workflow `AO sub-task`: `Sub-task`

## 8. Trường

**Cách tạo một custom field:**

1. Trên Jira, bấm biểu tượng bánh răng ⚙ ở góc trên bên phải. Trong **Jira admin settings**, ô **Switch settings** chọn **Work items**.
2. Menu bên trái: **Fields** → nút tạo field (đối chiếu giao diện: **Create new field** hoặc **Create custom field**).
3. Chọn loại **Select List (single choice)** → gõ tên field → thêm từng option theo đúng thứ tự bên dưới → tạo field.
4. Nếu Jira hỏi gắn field vào màn hình (screen) nào, bỏ qua: mục 9 gắn field vào màn hình của space.
5. Không giới hạn work type cho field: Jira không cho sửa work type của context mặc định (Global context, ô **Any issue type**), và cũng không cần **Add new context**. Work type ghi sau "dùng cho" là nơi hợp đồng dùng field đó; mục 9 chỉ đưa field lên screen của các work type này.

- [ ] Field `Found in`, type Select List (single choice), dùng cho `Bug`. Option: `Development`, `Staging`, `Production`
- [ ] `Affects versions`: trường có sẵn, không tạo; dùng cho `Bug`
- [ ] Field `Severity`, type Select List (single choice), dùng cho `Bug`. Option: `Critical`, `High`, `Medium`, `Low`
- [ ] `Fix versions`: trường có sẵn, không tạo; dùng cho `Story`, `Task`, `Bug`
- [ ] Field `Agent`, type Select List (single choice), dùng cho `Story`, `Sub-task`, `Task`, `Bug`. Option: `Project Manager`, `Business Analyst`, `UI/UX designer`, `Solution Architect`, `Frontend Developer`, `Backend Developer`, `Code Reviewer`, `Security Engineer`, `Tester/QA Engineer`, `DevOps Engineer`
- [ ] Rework count: không tạo trường, số này được đếm từ lịch sử chuyển trạng thái
- [ ] `Flagged`: trường có sẵn, không tạo; dùng cho `Epic`, `Story`, `Sub-task`, `Task`, `Bug`

## 9. Space

**Tạo space:**

1. Thanh trên cùng của Jira: **Spaces** → **Create space**.
2. Chọn template **Kanban** → **Use template**.
3. Chọn loại **Company-managed** (không chọn Team-managed).
4. Bước **Name your space**: ô **Name** gõ tên dự án, ô **Key** gõ key của dự án (pilot: `DEMO`) → **Next**.
5. Bước **Let's set up your space**: phần **Work types** giữ các loại có sẵn; nếu **Add work type** cho chọn `Sub-task` thì thêm, không có thì bỏ qua (bước Work type bên dưới thêm sau). Phần **Statuses** để nguyên: bước Workflow scheme bên dưới thay toàn bộ → **Next**.
6. Bước cuối: làm theo màn hình để tạo space (đối chiếu giao diện).

- [ ] Space company-managed, template Kanban, key của dự án (pilot: `DEMO`)

**Mở Space settings:** trong space, menu bên trái, bấm **•••** cạnh tên space → **Space settings**.

**Work type:** Space settings → menu bên trái **Work items** → **Types**. Danh sách phải có đủ các loại bên dưới. Thiếu loại nào: bấm **Actions** → **Edit work types** (đối chiếu giao diện), kéo loại còn thiếu vào cột của scheme → **Save**. Trình tạo space không có sẵn loại sub-task, nên `Sub-task` thường phải thêm ở đây. Nếu danh sách có loại lạ, ví dụ `Subtask` không gạch nối, đừng xóa; chụp màn hình rồi hỏi.

- [ ] Space có đủ work type: `Epic`, `Story`, `Sub-task`, `Task`, `Bug`

**Workflow scheme:** Space settings → **Workflows** → **Switch scheme** → chọn `AO workflow scheme` → **Associate** → chờ Jira chuyển xong → **Acknowledge**.

- [ ] Space dùng workflow scheme `AO workflow scheme`

**Màn hình:** Space settings → menu bên trái **Work items** → **Screens**. Trang này chia theo screen scheme; mỗi scheme ghi work type nào dùng nó và cột **Screen** ghi tên screen (thường một screen dùng cho cả Create, Edit, View). Field chỉ hiện ở work type có field đó trên screen.

1. Với từng dòng bên dưới, tìm screen của từng work type ghi ở dòng đó. Nhiều work type dùng chung một screen thì chỉ thêm một lần.
2. Bấm tên screen (chữ xanh ở cột **Screen**) → trang cấu hình screen mở ra.
3. Tìm ô thêm field (đối chiếu giao diện: ô **Select Field...** ở cuối danh sách, hoặc nút **Add field**) → gõ tên field → chọn. Field đã có trên screen thì bỏ qua.

- [ ] `Found in`: screen của `Bug`
- [ ] `Affects versions`: screen của `Bug`
- [ ] `Severity`: screen của `Bug`
- [ ] `Fix versions`: screen của `Story`, `Task`, `Bug`
- [ ] `Agent`: screen của `Story`, `Sub-task`, `Task`, `Bug`
- [ ] `Flagged`: screen của `Epic`, `Story`, `Sub-task`, `Task`, `Bug`

## 10. Board

Template Kanban đã tạo sẵn một board cho space; mục này sửa board đó.

**Mở Board settings:** trong space, mở board → bấm **•••** cạnh tên board → **Board settings**.

**Filter:** filter của board được sửa ở trang filter, không sửa ngay trong Board settings.

1. Board settings → **Details** → phần **Board filter** → bấm **Edit filter query**. Trang filter mở ở tab mới.
2. Ô JQL: xóa câu cũ, dán dòng bên dưới (thay `<KEY>` bằng key của space).
3. Bấm Enter, hoặc biểu tượng kính lúp ở cuối ô JQL, để chạy câu mới. Chưa chạy thì Jira lưu lại câu cũ.
4. Bấm nút lưu hiện ra cạnh tên filter (đối chiếu giao diện: **Save filter** hoặc **Save changes**).
5. Quay lại tab Board settings, tải lại trang (F5): ô **Filter query** phải hiện câu mới. **Board sub-filter** để nguyên.

- [ ] Filter: `project = <KEY> AND issuetype != Epic ORDER BY Rank ASC`

**Cột:** Board settings → **Columns** (nếu menu thu gọn, bấm **Layout** để mở thêm).

1. Sửa danh sách cột cho đúng tên và thứ tự bên dưới: đổi tên cột có sẵn, thêm cột bằng nút **+** bên phải các cột, xóa cột thừa.
2. Kéo status `New` vào ô **Kanban backlog** (đây là cột `Backlog`).
3. Kéo từng status còn lại vào đúng cột ghi bên dưới. Status không dùng để lại ở ô **Unmapped statuses**.
4. Phần **Column constraints** chọn **Work item count**, rồi gõ số tối đa dưới tên cột có ghi "Tối đa".

- [ ] Kanban backlog (`Backlog`): status `New`
- [ ] Cột `Ready`: status `Ready`, `To Do`
- [ ] Cột `In Progress`: status `In Progress`
- [ ] Cột `In Review`: status `In Review`. Tối đa 2
- [ ] Cột `QA`: status `Ready for QA`, `In QA`
- [ ] Cột `Done`: status `Done`
- [ ] Status `Cancelled` để ở Unmapped statuses, để item rời khỏi board

## 11. GitHub for Jira

**Cách làm** (đối chiếu giao diện ở bước 5):

1. Thanh bên trái của Jira: **Apps** → **Explore more apps** → ô tìm gõ `GitHub for Atlassian` (tên mới của GitHub for Jira) → chọn app **GitHub for Atlassian** của nhà phát hành **Atlassian**, không chọn các app GitHub của hãng khác → **Get app**.
2. Cài xong, Jira mở trang **Connect GitHub to Atlassian** (nếu không, vào **Jira admin settings** → **Marketplace apps** → **GitHub for Atlassian**). Chọn **GitHub Cloud** → **Next**.
3. Nếu được hỏi thì đăng nhập GitHub. Dòng **Logged in as** phải là tài khoản sở hữu repo của dự án.
4. Bấm **Select an organization in GitHub**: GitHub mở ở tab mới. Nếu bấm mà không có gì xảy ra, trình duyệt đã chặn pop-up: bấm biểu tượng chặn pop-up ở cuối thanh địa chỉ → cho phép pop-up từ site Jira → bấm lại.
5. Trên GitHub: chọn tài khoản sở hữu repo → **Only select repositories** → chọn repo của dự án → **Install** → quay lại tab Jira, bấm **Connect** cạnh tài khoản nếu có. Nếu danh sách không có tài khoản sở hữu repo, dừng lại và hỏi: tài liệu của Atlassian chỉ nói tới GitHub organization.

- [ ] App GitHub for Atlassian đã cài và nối với repo của dự án (pilot: `TungPH7/ao-pilot`)

## 12. Môi trường

**Cách làm:** repo dự án trên GitHub → **Settings** → **Environments** → **New environment** → gõ tên → **Configure environment**.

- [ ] GitHub environment `development`
- [ ] GitHub environment `staging`
- [ ] GitHub environment `production`
- [ ] File `.jira/config.yml` trên nhánh mặc định của repo dự án, với nội dung:

```yaml
deployments:
  environmentMapping:
    development: ["development"]
    staging: ["staging"]
    production: ["production"]
```

- [ ] Nếu app GitHub for Jira được nối trước khi có file này: ngắt rồi nối lại kết nối GitHub trong app

## 13. Kiểm lại

- [ ] Chạy `npm run jira:check -- --space <KEY>` trong repo kit: lệnh không báo chỗ lệch nào

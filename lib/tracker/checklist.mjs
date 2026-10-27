// Renders docs/jira-setup.md, the step-by-step checklist for building Jira by hand from the contract and
// tracker/jira.yaml (tracker-integration spec section 2.10). Each section says where to click, then lists the items
// to create. Deterministic, in YAML order, LF line endings, like lib/render.mjs.

const NOTICE =
  '<!-- Generated from contract/ and tracker/jira.yaml by scripts/jira-checklist.mjs. Do not edit by hand: change the YAML, then run `npm run jira:checklist`. -->';

const CATEGORIES = { 'to-do': 'To Do', 'in-progress': 'In Progress', done: 'Done' };
// Environment types of the Jira Deployments panel, in the order Jira lists them.
const JIRA_ENVIRONMENT_TYPES = ['development', 'testing', 'staging', 'production', 'unmapped'];
// The first steps of every Jira admin page: the gear at the top right, then the Work items settings.
const WORK_ITEM_SETTINGS = 'Trên Jira, bấm biểu tượng bánh răng ⚙ ở góc trên bên phải. Trong **Jira admin settings**, ô **Switch settings** chọn **Work items**';

export function renderChecklist(contract, mapping) {
  const sections = [
    ['Group và service account', groups(mapping)],
    ['Rovo MCP', rovo()],
    ['Resolution', resolutions(contract, mapping)],
    ['Status', statuses(mapping)],
    ['Workflow', workflows(contract, mapping)],
    ['Workflow scheme', workflowScheme(contract, mapping)],
    ['Trường', fields(contract, mapping)],
    ['Space', space(contract, mapping)],
    ['Board', board(contract, mapping)],
    ['GitHub for Jira', github()],
    ['Môi trường', environments(mapping)],
    ['Kiểm lại', ['- [ ] Chạy `npm run jira:check -- --space <KEY>` trong repo kit: lệnh không báo chỗ lệch nào']],
  ];
  const lines = [
    NOTICE,
    '',
    '# Dựng Jira cho một dự án',
    '',
    'Checklist dựng tay theo hợp đồng trong `contract/` và ánh xạ `tracker/jira.yaml`, cho gói Jira Free. Làm theo thứ tự, vì mục sau dùng thứ mục trước tạo ra; mỗi dự án chỉ dựng một lần. Lý do của từng mục nằm ở [SPEC-tracker-integration.md](../SPEC-tracker-integration.md), mục 2.',
    '',
    'Mỗi mục có phần **Cách làm** (bấm vào đâu) và danh sách `- [ ]` (tạo những gì). Tên nút lấy từ tài liệu của Atlassian; giao diện thật có thể khác một chút. Chỗ nào ghi "đối chiếu giao diện" là tài liệu không nêu tên nút: nếu không thấy, chụp màn hình rồi hỏi.',
    ...sections.flatMap(([title, body], index) => ['', `## ${index + 1}. ${title}`, '', ...body]),
  ];
  return `${lines.join('\n')}\n`;
}

// .jira/config.yml for the GitHub for Jira app: the GitHub environments of each Jira environment type (spec 2.9).
export function renderJiraConfig(mapping) {
  const byType = Object.groupBy(Object.values(mapping.environments), ({ jira_type: type }) => type);
  const rows = JIRA_ENVIRONMENT_TYPES.filter((type) => byType[type]).map(
    (type) => `    ${type}: [${byType[type].map(({ github_environment: env }) => JSON.stringify(env)).join(', ')}]`,
  );
  return ['deployments:', '  environmentMapping:', ...rows, ''].join('\n');
}

function groups({ identities }) {
  const users = identities.filter(({ kind }) => kind === 'user');
  const services = identities.filter(({ kind }) => kind === 'service-account');
  return [
    '**Cách tạo group:**',
    '',
    '1. Mở admin.atlassian.com, chọn tổ chức của bạn.',
    '2. Menu bên trái: **Directory** → **Groups** → **Create group**.',
    '3. Gõ tên group, bấm **Create**.',
    '',
    ...identities.map(({ id, group }) => `- [ ] Tạo group ${code(group)} (danh tính ${code(id)})`),
    '',
    '**Cách thêm tài khoản của bạn vào group:**',
    '',
    '1. **Directory** → **Groups** → bấm vào tên group.',
    '2. Bấm **Add users**, gõ tên hoặc email của bạn, chọn tài khoản, bấm **Add**.',
    '',
    ...users.map(({ group, account, roles }) => `- [ ] Group ${code(group)}: thêm tài khoản admin của bạn (\`${account}\`), vai trò ${list(roles)}`),
    '',
    '**Cách thêm service account vào group** (ô tìm trong trang group chỉ lọc người đã có trong group, nên không dùng được):',
    '',
    '1. **Directory** → **Service accounts** → bấm vào tên service account.',
    '2. Bấm **•••** ở góc trên bên phải → **Add to group**.',
    '3. Chọn group, xác nhận.',
    '',
    ...services.map(({ group, account, roles }) => `- [ ] Group ${code(group)}: thêm service account \`${account}\`, vai trò ${list(roles)}`),
    '',
    '**Kiểm lại:** mở từng group, tài khoản phải hiện ở tab **Members** hoặc **Agents**.',
    '',
    ...services.map(
      ({ account, token_env: env, token_expires_on: date }) =>
        `- [ ] Token của \`${account}\` hết hạn ${date}, nằm trong biến môi trường \`${env}\`, không nằm trong file nào`,
    ),
  ];
}

function rovo() {
  return [
    '**Cách làm:** admin.atlassian.com → menu bên trái **Connectors** → **Atlassian MCP server** → mục **Authentication** → bật **API token**.',
    '',
    '- [ ] API token cho Rovo MCP đã bật',
  ];
}

function resolutions(contract, mapping) {
  const resolution = mapping.fields.resolution;
  const names = contract.work_item_fields.find(({ id }) => id === 'resolution').values.map((value) => resolution.values?.[value.id] ?? value.name);
  const setByTransitions = Object.values(mapping.workflows).flatMap(({ transitions }) =>
    Object.values(transitions).map(({ set_resolution: name }) => name).filter(Boolean),
  );
  return [
    'Resolution làm trước workflow, vì transition `Cancel` hỏi Resolution và các transition vào Done đặt Resolution.',
    '',
    '**Cách làm:**',
    '',
    `1. ${WORK_ITEM_SETTINGS}.`,
    '2. Menu bên trái, kéo xuống, chọn **Resolutions**.',
    '3. Xem danh sách: tên nào bên dưới đã có (đúng chữ hoa, chữ thường) thì đánh dấu là xong.',
    '4. Tên nào chưa có: bấm **Add resolution**, gõ tên, bấm **Add**.',
    '',
    ...[...new Set([...names, ...setByTransitions])].map((name) => `- [ ] Resolution ${code(name)}`),
  ];
}

function statuses(mapping) {
  const seen = new Map();
  for (const { states } of Object.values(mapping.workflows)) {
    for (const { status, category } of Object.values(states)) if (!seen.has(status)) seen.set(status, category);
  }
  return [
    '**Cách làm:**',
    '',
    `1. ${WORK_ITEM_SETTINGS}.`,
    '2. Menu bên trái, chọn **Statuses**.',
    '3. Với từng dòng bên dưới, xem danh sách status có sẵn trước. Nếu đã có status cùng tên và cột **Category** trùng thì dùng lại, đánh dấu là xong.',
    '4. Nếu chưa có: bấm **Add status**. Ô **Name** gõ tên, ô **Category** chọn như bên dưới, bấm **Add**.',
    '',
    ...[...seen].map(([status, category]) => `- [ ] Name ${code(status)}, Category ${code(CATEGORIES[category])}`),
  ];
}

function workflows(contract, mapping) {
  const groupsOf = (actors) =>
    mapping.identities.filter(({ roles }) => roles.some((role) => actors.includes(role))).map(({ group }) => code(group)).join(', ');
  return [
    '**Cách mở trình sửa workflow:**',
    '',
    `1. ${WORK_ITEM_SETTINGS}.`,
    '2. Menu bên trái: **Workflows**.',
    '3. Tạo workflow mới: bấm nút tạo workflow ở góc trên bên phải (đối chiếu giao diện: có thể tên là **Create workflow** hoặc **Add workflow**), gõ tên workflow.',
    '4. Sửa workflow đã có: tìm tên workflow → **•••** → **Edit**.',
    '',
    '**Cách thêm status vào workflow:** bấm **Add status** → tìm status đã tạo ở mục 4 → **Add**. Ở khung chi tiết bên phải, **không** tick ô "Allow all statuses to transition to this one".',
    '',
    '**Cách thêm transition:** bấm **Add transition** ở đầu trang → chọn **From status** và **To status** → gõ tên transition → **Add**.',
    '',
    '**Cách giới hạn ai được chuyển (rule Restrict):** bấm vào mũi tên của transition → ở khung chi tiết, bấm **+** cạnh **Rules** → chọn **Restrict who can move a work item** → **Select** → ô **Restrict to** chọn **Groups** → chọn các group ghi ở dòng đó → **Add**.',
    '',
    '**Rule đặt Resolution là Done** (đối chiếu giao diện): ở **Rules**, bấm **+**, chọn rule cập nhật một trường của work item, chọn trường **Resolution**, giá trị **Done**.',
    '',
    '**Rule hỏi Resolution khi hủy** (đối chiếu giao diện): ở **Rules**, bấm **+**, chọn rule hiện màn hình khi chuyển, chọn màn hình có sẵn chứa trường Resolution (thường tên **Resolve Issue Screen** hoặc **Resolve Work Item Screen**).',
    '',
    '**Cuối cùng:** bấm **Update workflow** (hoặc nút lưu tương ứng) để lưu.',
    '',
    'Lưu ý:',
    '',
    '- Workflow mới có thể có sẵn vài status hoặc transition mẫu. Xóa mọi status và transition không có trong danh sách bên dưới.',
    '- Mũi tên **Create** (item mới tạo) phải đi vào status đầu ghi ở dòng "Tạo workflow".',
    '- Không có transition nào từ "Any status": item đã Done hoặc Cancelled không được chuyển đi đâu nữa.',
    '- Nếu không tìm thấy rule **Restrict who can move a work item** (gói Free có thể không có), bỏ phần group, chụp màn hình danh sách rule rồi báo lại. Khi đó hook trong Claude Code là lớp chặn duy nhất với agent.',
    ...Object.entries(contract.workflows).flatMap(([name, workflow]) => {
      const mapped = mapping.workflows[name];
      const status = (state) => code(mapped.states[state].status);
      const types = workflow.applies_to.map((type) => jiraType(contract, type)).join(', ');
      return [
        '',
        `### ${code(mapped.jira_workflow)} (${types})`,
        '',
        `- [ ] Tạo workflow ${code(mapped.jira_workflow)}, status đầu là ${status(workflow.initial)}`,
        `- [ ] Thêm status: ${Object.keys(workflow.states).map(status).join(', ')}`,
        ...workflow.transitions.flatMap(({ id, from, to, actors }) => {
          const { name: label, set_resolution: resolution, screen } = mapped.transitions[id];
          const extra = [resolution && `Rule đặt Resolution là ${code(resolution)}`, screen === 'resolution' && 'Rule hỏi Resolution khi hủy'].filter(Boolean);
          return [from].flat().map((source) =>
            [`- [ ] Transition ${code(label)}: From ${status(source)}, To ${status(to)}`, `Restrict → Groups: ${groupsOf(actors)}`, ...extra].join('. '),
          );
        }),
        '- [ ] Bấm **Update workflow** để lưu',
      ];
    }),
  ];
}

function workflowScheme(contract, mapping) {
  const workflowOf = (type) => Object.keys(contract.workflows).find((name) => contract.workflows[name].applies_to.includes(type));
  const byWorkflow = Object.groupBy(contract.work_types, ({ id }) => workflowOf(id));
  return [
    '**Cách làm:**',
    '',
    `1. ${WORK_ITEM_SETTINGS}.`,
    '2. Menu bên trái: **Workflow schemes** → **Add workflow scheme**.',
    `3. Ô name gõ ${code(mapping.workflow_scheme)} → **Add**.`,
    '4. Với từng workflow bên dưới: bấm **Add workflow** → **Add existing** → chọn workflow → chọn các work type ghi ở dòng đó → **Finish**.',
    '5. Nếu scheme còn dòng workflow mặc định cho "All unassigned work types", để nguyên.',
    '',
    `- [ ] Tạo workflow scheme ${code(mapping.workflow_scheme)}`,
    ...Object.entries(byWorkflow).map(
      ([name, types]) => `- [ ] Workflow ${code(mapping.workflows[name].jira_workflow)}: ${types.map(({ jira_issue_type: type }) => code(type)).join(', ')}`,
    ),
  ];
}

function fields(contract, mapping) {
  const rows = contract.work_item_fields.flatMap(({ id, name, applies_to: types, values }) => {
    const field = mapping.fields[id];
    const forTypes = types.map((type) => jiraType(contract, type)).join(', ');
    if (field.type === 'select') {
      const options = values.map((value) => code(field.values?.[value.id] ?? value.name)).join(', ');
      return [`- [ ] Field ${code(field.jira_field)}, type Select List (single choice), work type ${forTypes}. Option: ${options}`];
    }
    if (field.type === 'builtin' && id !== 'resolution') return [`- [ ] ${code(field.jira_field)}: trường có sẵn, không tạo; dùng cho ${forTypes}`];
    if (field.derived_from) return [`- [ ] ${name}: không tạo trường, số này được đếm từ lịch sử chuyển trạng thái`];
    return [];
  });
  return [
    '**Cách tạo một custom field:**',
    '',
    `1. ${WORK_ITEM_SETTINGS}.`,
    '2. Menu bên trái: **Fields** → nút tạo field (đối chiếu giao diện: **Create new field** hoặc **Create custom field**).',
    '3. Chọn loại **Select List (single choice)** → gõ tên field → thêm từng option theo đúng thứ tự bên dưới → tạo field.',
    '4. Nếu Jira hỏi gắn field vào màn hình (screen) nào, bỏ qua: mục 8 gắn field vào màn hình của space.',
    '5. Giới hạn work type: ở danh sách field, tìm field vừa tạo → **•••** → **Contexts and default value** → sửa context mặc định → phần **Applicable work types** chỉ chọn các work type ghi ở dòng đó → lưu.',
    '',
    ...rows,
  ];
}

function space(contract, mapping) {
  const onScreens = Object.entries(mapping.fields)
    .filter(([id, { type }]) => type && id !== 'resolution')
    .map(([, { jira_field: name }]) => code(name));
  return [
    '**Tạo space:**',
    '',
    '1. Thanh trên cùng của Jira: **Spaces** → **Create space**.',
    '2. Chọn template **Kanban** → **Use template**.',
    '3. Chọn loại **Company-managed** (không chọn Team-managed).',
    '4. Ô **Name** gõ tên dự án, ô **Key** gõ key của dự án (pilot: `DEMO`) → tạo space.',
    '',
    '- [ ] Space company-managed, template Kanban, key của dự án (pilot: `DEMO`)',
    '',
    '**Mở Space settings:** trong space, menu bên trái, bấm **•••** cạnh tên space → **Space settings**.',
    '',
    '**Work type:** Space settings → **Work types**. Danh sách phải có đủ các loại bên dưới. Thiếu loại nào: bấm **Actions** → **Edit work types**, kéo loại còn thiếu vào cột của scheme → **Save**.',
    '',
    `- [ ] Space có đủ work type: ${contract.work_types.map(({ jira_issue_type: type }) => code(type)).join(', ')}`,
    '',
    `**Workflow scheme:** Space settings → **Workflows** → **Switch scheme** → chọn ${code(mapping.workflow_scheme)} → **Associate** → chờ Jira chuyển xong → **Acknowledge**.`,
    '',
    `- [ ] Space dùng workflow scheme ${code(mapping.workflow_scheme)}`,
    '',
    '**Màn hình:** Space settings → **Screens** → bấm vào từng screen trong danh sách (thường có màn hình tạo, sửa, xem) → kéo xuống cuối, ô **Select Field...** gõ tên field → chọn → field được thêm vào cuối màn hình. Làm cho từng field bên dưới, trên từng screen.',
    '',
    `- [ ] Mọi screen của space có các field: ${onScreens.join(', ')}`,
  ];
}

function board(contract, mapping) {
  const columnOf = new Map();
  const unplaced = new Set();
  for (const [name, workflow] of Object.entries(contract.workflows)) {
    const mapped = mapping.workflows[name];
    if (mapped.on_board === false) continue;
    for (const [state, { board_column: column }] of Object.entries(workflow.states)) {
      const status = mapped.states[state].status;
      const target = column ?? mapped.board_columns?.[state];
      if (!target) unplaced.add(status);
      else columnOf.set(target, [...new Set([...(columnOf.get(target) ?? []), status])]);
    }
  }
  const [backlog, ...columns] = mapping.board.columns;
  return [
    'Template Kanban đã tạo sẵn một board cho space; mục này sửa board đó.',
    '',
    '**Mở Board settings:** trong space, mở board → bấm **•••** cạnh tên board → **Board settings**.',
    '',
    `**Filter:** Board settings → **Details** → sửa filter query thành dòng bên dưới (thay \`<KEY>\` bằng key của space) → lưu.`,
    '',
    `- [ ] Filter: ${code(mapping.board.filter.replaceAll('{key}', '<KEY>'))}`,
    '',
    '**Cột:** Board settings → **Columns** (nếu menu thu gọn, bấm **Layout** để mở thêm).',
    '',
    '1. Sửa danh sách cột cho đúng tên và thứ tự bên dưới: đổi tên cột có sẵn, thêm cột bằng nút **+** bên phải các cột, xóa cột thừa.',
    `2. Kéo status ${(columnOf.get(backlog.id) ?? []).map(code).join(', ')} vào ô **Kanban backlog** (đây là cột ${code(backlog.name)}).`,
    '3. Kéo từng status còn lại vào đúng cột ghi bên dưới. Status không dùng để lại ở ô **Unmapped statuses**.',
    '4. Phần **Column constraints** chọn **Work item count**, rồi gõ số tối đa dưới tên cột có ghi "Tối đa".',
    '',
    `- [ ] Kanban backlog (${code(backlog.name)}): status ${(columnOf.get(backlog.id) ?? []).map(code).join(', ')}`,
    ...columns.map(({ id, name, wip_limit: wip }) => {
      const limit = wip ? `. Tối đa ${contract.wip_limits.find((w) => w.id === wip).limit}` : '';
      return `- [ ] Cột ${code(name)}: status ${(columnOf.get(id) ?? []).map(code).join(', ')}${limit}`;
    }),
    ...[...unplaced].map((status) => `- [ ] Status ${code(status)} để ở Unmapped statuses, để item rời khỏi board`),
  ];
}

function github() {
  return [
    '**Cách làm** (đối chiếu giao diện ở bước 2 và 3):',
    '',
    '1. Thanh trên cùng của Jira: **Apps** → **Explore more apps** → tìm `GitHub for Jira` → **Get app**.',
    '2. Sau khi cài, mở app (Apps → Manage your apps, hoặc nút **Get started**) → nối với GitHub → đăng nhập GitHub.',
    '3. Chọn tài khoản GitHub của bạn → **Only select repositories** → chọn repo của dự án → **Install** → quay lại Jira, bấm **Connect** cạnh tài khoản.',
    '',
    '- [ ] App GitHub for Jira đã cài và nối với repo của dự án (pilot: `TungPH7/ao-pilot`)',
  ];
}

function environments(mapping) {
  return [
    '**Cách làm:** repo dự án trên GitHub → **Settings** → **Environments** → **New environment** → gõ tên → **Configure environment**.',
    '',
    ...Object.values(mapping.environments).map(({ github_environment: env }) => `- [ ] GitHub environment ${code(env)}`),
    '- [ ] File `.jira/config.yml` trên nhánh mặc định của repo dự án, với nội dung:',
    '',
    '```yaml',
    renderJiraConfig(mapping).trimEnd(),
    '```',
    '',
    '- [ ] Nếu app GitHub for Jira được nối trước khi có file này: ngắt rồi nối lại kết nối GitHub trong app',
  ];
}

function jiraType(contract, workType) {
  return code(contract.work_types.find(({ id }) => id === workType).jira_issue_type);
}

function list(ids) {
  return ids.map(code).join(', ');
}

function code(text) {
  return `\`${text}\``;
}

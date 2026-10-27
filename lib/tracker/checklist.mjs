// Renders docs/jira-setup.md, the checklist for building Jira by hand from the contract and tracker/jira.yaml
// (tracker-integration spec section 2.10). Deterministic, in YAML order, LF line endings, like lib/render.mjs.

const NOTICE =
  '<!-- Generated from contract/ and tracker/jira.yaml by scripts/jira-checklist.mjs. Do not edit by hand: change the YAML, then run `npm run jira:checklist`. -->';

const CATEGORIES = { 'to-do': 'To Do', 'in-progress': 'In Progress', done: 'Done' };
// Resolutions every Jira Cloud site starts with.
const JIRA_RESOLUTIONS = ['Done', "Won't Do", 'Duplicate', 'Cannot Reproduce'];
// Environment types of the Jira Deployments panel, in the order Jira lists them.
const JIRA_ENVIRONMENT_TYPES = ['development', 'testing', 'staging', 'production', 'unmapped'];

export function renderChecklist(contract, mapping) {
  const sections = [
    ['Group và service account', groups(mapping)],
    ['Rovo MCP', ['- [ ] Administration → Connectors → Atlassian MCP server → Authentication: bật API token']],
    ['Status', statuses(mapping)],
    ['Workflow', workflows(contract, mapping)],
    ['Workflow scheme', workflowScheme(contract, mapping)],
    ['Trường', fields(contract, mapping)],
    ['Resolution', resolutions(contract, mapping)],
    ['Space', space(contract, mapping)],
    ['Board', board(contract, mapping)],
    ['GitHub for Jira', ['- [ ] Cài app GitHub for Jira (Apps → Explore more apps), nối tài khoản GitHub và chọn repo của dự án']],
    ['Môi trường', environments(mapping)],
    ['Kiểm lại', ['- [ ] Chạy `npm run jira:check -- --space <KEY>` trong repo kit: lệnh không báo chỗ lệch nào']],
  ];
  const lines = [
    NOTICE,
    '',
    '# Dựng Jira cho một dự án',
    '',
    'Checklist dựng tay theo hợp đồng trong `contract/` và ánh xạ `tracker/jira.yaml`, cho gói Jira Free. Làm theo thứ tự; mỗi dự án chỉ dựng một lần. Lý do của từng mục nằm ở [SPEC-tracker-integration.md](../SPEC-tracker-integration.md), mục 2.',
    '',
    'Tên menu của Jira thay đổi theo thời gian: nếu không thấy đúng tên, tìm mục gần nhất và giữ nguyên tên trong checklist.',
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
  return [
    'Group nằm ở admin.atlassian.com → Directory → Groups. Rule Restrict ở mục 4 cho phép transition theo group.',
    '',
    ...identities.map(({ group, account, kind, roles }) =>
      kind === 'user'
        ? `- [ ] Group \`${group}\`: thêm tài khoản admin của bạn (\`${account}\`), vai trò ${list(roles)}`
        : `- [ ] Group \`${group}\`: thêm service account \`${account}\`, vai trò ${list(roles)}`,
    ),
    ...identities
      .filter(({ kind }) => kind === 'service-account')
      .map(({ account, token_env: env, token_expires_on: date }) => `- [ ] Token của \`${account}\` hết hạn ${date}, nằm trong biến môi trường \`${env}\`, không nằm trong file nào`),
  ];
}

function statuses(mapping) {
  const seen = new Map();
  for (const { states } of Object.values(mapping.workflows)) {
    for (const { status, category } of Object.values(states)) if (!seen.has(status)) seen.set(status, category);
  }
  return [
    'Status nằm ở Jira settings → Work items → Statuses. Jira có sẵn `To Do`, `In Progress`, `Done`: dùng lại nếu đúng nhóm.',
    '',
    ...[...seen].map(([status, category]) => `- [ ] ${code(status)}: nhóm ${CATEGORIES[category]}`),
  ];
}

function workflows(contract, mapping) {
  const groupsOf = (actors) =>
    mapping.identities.filter(({ roles }) => roles.some((role) => actors.includes(role))).map(({ group }) => code(group)).join(', ');
  return [
    'Workflow nằm ở Jira settings → Work items → Workflows. Mỗi transition có rule "Restrict who can move a work item" theo group. Nếu gói Free không có rule này, bỏ phần group và ghi lại: khi đó hook trong Claude Code là lớp chặn duy nhất với agent.',
    '',
    'Không thêm transition nào khác. Nếu Jira tự tạo transition từ mọi status (Any status), xóa nó: state kết thúc không được có transition đi ra.',
    ...Object.entries(contract.workflows).flatMap(([name, workflow]) => {
      const mapped = mapping.workflows[name];
      const status = (state) => code(mapped.states[state].status);
      const types = workflow.applies_to.map((type) => jiraType(contract, type)).join(', ');
      return [
        '',
        `### ${code(mapped.jira_workflow)} (${types})`,
        '',
        `- [ ] Tạo workflow ${code(mapped.jira_workflow)}, status đầu là ${status(workflow.initial)}, gồm: ${Object.keys(workflow.states).map(status).join(', ')}`,
        ...workflow.transitions.flatMap(({ id, from, to, actors }) => {
          const { name: label, set_resolution: resolution, screen } = mapped.transitions[id];
          const extra = [resolution && `Đặt Resolution là ${code(resolution)}`, screen === 'resolution' && 'Màn hình chọn Resolution'].filter(Boolean);
          return [from].flat().map((source) =>
            [`- [ ] Transition ${code(label)}: ${status(source)} → ${status(to)}`, `Chỉ group ${groupsOf(actors)}`, ...extra].join('. '),
          );
        }),
      ];
    }),
  ];
}

function workflowScheme(contract, mapping) {
  const workflowOf = (type) => Object.keys(contract.workflows).find((name) => contract.workflows[name].applies_to.includes(type));
  return [
    `- [ ] Tạo workflow scheme ${code(mapping.workflow_scheme)}`,
    ...contract.work_types.map(({ id, jira_issue_type: type }) => `- [ ] ${code(type)} → ${code(mapping.workflows[workflowOf(id)].jira_workflow)}`),
  ];
}

function fields(contract, mapping) {
  const rows = contract.work_item_fields.flatMap(({ id, name, applies_to: types, values }) => {
    const field = mapping.fields[id];
    const forTypes = types.map((type) => jiraType(contract, type)).join(', ');
    if (field.type === 'select') {
      const options = values.map((value) => code(field.values?.[value.id] ?? value.name)).join(', ');
      return [`- [ ] Tạo custom field ${code(field.jira_field)}, loại Select List (single choice), cho ${forTypes}. Option: ${options}`];
    }
    if (field.type === 'builtin' && id !== 'resolution') return [`- [ ] ${code(field.jira_field)}: trường có sẵn, dùng cho ${forTypes}`];
    if (field.derived_from) return [`- [ ] Không tạo trường cho ${name}: số này được đếm từ lịch sử chuyển trạng thái`];
    return [];
  });
  return ['Custom field nằm ở Jira settings → Work items → Fields.', '', ...rows];
}

function resolutions(contract, mapping) {
  const resolution = mapping.fields.resolution;
  const names = contract.work_item_fields.find(({ id }) => id === 'resolution').values.map((value) => resolution.values?.[value.id] ?? value.name);
  const setByTransitions = Object.values(mapping.workflows).flatMap(({ transitions }) =>
    Object.values(transitions).map(({ set_resolution: name }) => name).filter(Boolean),
  );
  return [...new Set([...names, ...setByTransitions])].map((name) =>
    JIRA_RESOLUTIONS.includes(name) ? `- [ ] ${code(name)}: có sẵn trong Jira, giữ lại` : `- [ ] ${code(name)}: tạo mới`,
  );
}

function space(contract, mapping) {
  const onScreens = Object.entries(mapping.fields)
    .filter(([id, { type }]) => type && id !== 'resolution')
    .map(([, { jira_field: name }]) => code(name));
  return [
    '- [ ] Tạo space company-managed theo template Kanban, với key của dự án (pilot: `DEMO`)',
    `- [ ] Issue type scheme của space gồm: ${contract.work_types.map(({ jira_issue_type: type }) => code(type)).join(', ')}`,
    `- [ ] Gán workflow scheme ${code(mapping.workflow_scheme)} cho space`,
    `- [ ] Thêm ${onScreens.join(', ')} vào màn hình tạo, sửa và xem item của space`,
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
  return [
    '- [ ] Tạo board Kanban cho space',
    `- [ ] Filter của board: ${code(mapping.board.filter.replaceAll('{key}', '<KEY>'))}`,
    ...mapping.board.columns.map(({ id, name, wip_limit: wip }, index) => {
      const label = index === 0 ? `Cột ${code(name)} (Kanban backlog)` : `Cột ${code(name)}`;
      const limit = wip ? `. Tối đa ${contract.wip_limits.find((w) => w.id === wip).limit}` : '';
      return `- [ ] ${label}: status ${(columnOf.get(id) ?? []).map(code).join(', ')}${limit}`;
    }),
    ...[...unplaced].map((status) => `- [ ] Status ${code(status)} không gắn vào cột nào, để item rời khỏi board`),
  ];
}

function environments(mapping) {
  return [
    ...Object.values(mapping.environments).map(({ github_environment: env }) => `- [ ] GitHub environment ${code(env)} trong repo dự án`),
    '- [ ] File `.jira/config.yml` trên nhánh mặc định của repo dự án, với nội dung:',
    '',
    '```yaml',
    renderJiraConfig(mapping).trimEnd(),
    '```',
    '',
    '- [ ] Lần đầu thêm file này: ngắt rồi nối lại kết nối GitHub trong app GitHub for Jira',
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

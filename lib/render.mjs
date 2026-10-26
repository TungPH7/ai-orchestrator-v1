// Renders docs/sdlc.md from a valid contract: deterministic, in YAML order, LF line endings (plan, decision 7).

const NOTICE =
  '<!-- Generated from contract/*.yaml by scripts/render-docs.mjs. Do not edit by hand: change the YAML, then run `npm run render`. -->';

export function renderDocs(contract) {
  const lines = [
    NOTICE,
    '',
    '# Quy trình SDLC',
    '',
    'Bản đọc của hợp đồng trong `contract/`. Nội dung và lý do của từng quyết định nằm ở [SPEC-sdlc-contract.md](../SPEC-sdlc-contract.md).',
    '',
    ...roles(contract),
    ...workItems(contract),
    ...workflows(contract),
    ...readyAndDone(contract),
  ];
  return `${lines.join('\n').trimEnd()}\n`;
}

function roles({ roles }) {
  return [
    '## Vai trò',
    '',
    ...table(['Role id', 'Vai trò', 'Việc chính'], roles.map(({ id, name, responsibilities }) => [code(id), name, responsibilities])),
    '',
  ];
}

function workItems(contract) {
  const workflowOf = (type) => Object.keys(contract.workflows).find((name) => contract.workflows[name].applies_to.includes(type));
  const hierarchy = [
    ...contract.work_item_groupings.map(({ concept, jira, note }) => [concept, jira, '', '', note]),
    ...contract.work_types.map(({ id, concept, jira_issue_type: jira, note }) => [concept, jira, code(id), code(workflowOf(id)), note]),
  ];
  const fields = contract.work_item_fields.map(({ name, applies_to: types, value, values, filled_by: filledBy, note }) => [
    name,
    list(types),
    [value ?? valueList(values), note].filter(Boolean).join('. '),
    filledBy,
  ]);
  return [
    '## Work item',
    '',
    '### Phân cấp',
    '',
    ...table(['Mô hình khái niệm', 'Trong Jira', 'Work type', 'Workflow', 'Ghi chú'], hierarchy),
    '',
    `**Cách chọn loại:** ${contract.work_type_selection}`,
    '',
    '### Quy ước',
    '',
    ...contract.work_item_conventions.map((convention) => `- ${convention}`),
    '',
    '### Trường dữ liệu',
    '',
    ...table(['Trường', 'Áp dụng', 'Giá trị', 'Ai điền'], fields),
    '',
  ];
}

// Values with a description read as "Name: description; ...", plain values as "A, B, C".
function valueList(values) {
  const described = values.some(({ description }) => description);
  return values.map(({ name, description }) => (description ? `${name}: ${description}` : name)).join(described ? '; ' : ', ');
}

function readyAndDone(contract) {
  const rows = (key) => contract.work_types.filter((type) => type[key]).map((type) => [code(type.id), type[key].join('; ')]);
  return [
    '## DoR và DoD',
    '',
    '### DoR',
    '',
    'Điều kiện để item vào `ready`.',
    '',
    ...table(['Loại', 'DoR'], rows('dor')),
    '',
    '### DoD',
    '',
    `Điều kiện để item vào \`done\`. Phần chung cho ${list(contract.dod_common.applies_to)}:`,
    '',
    ...contract.dod_common.criteria.map((criterion) => `- ${criterion}`),
    '',
    'Phần riêng của từng loại, cộng thêm phần chung nếu loại đó có trong danh sách trên:',
    '',
    ...table(['Loại', 'DoD'], rows('dod')),
    '',
  ];
}

function workflows(contract) {
  const lines = ['## Workflow', ''];
  for (const [name, workflow] of Object.entries(contract.workflows)) {
    lines.push(
      `### ${code(name)}`,
      '',
      `Áp dụng cho ${list(workflow.applies_to)}. Bắt đầu ở ${code(workflow.initial)}, kết thúc ở ${list(workflow.final)}.`,
      '',
      ...diagram(workflow),
      '',
    );
    const states = Object.entries(workflow.states);
    if (states.some(([, state]) => state.description || state.board_column)) {
      const rows = states.map(([id, { description = '', board_column: column }]) => [code(id), description, column ? code(column) : '']);
      lines.push(...table(['State', 'Nghĩa', 'Cột trên board'], rows), '');
    }
    const rows = workflow.transitions.map((transition) => transitionRow(contract, transition));
    lines.push(...table(['Transition', 'Từ → đến', 'Ai chuyển', 'Điều kiện', 'Bằng chứng', 'Effect'], rows), '');
  }
  return lines;
}

// Mermaid ids cannot contain "-", so every state gets an alias.
function diagram({ initial, final, states, transitions }) {
  const node = (state) => state.replaceAll('-', '_');
  return [
    '```mermaid',
    'stateDiagram-v2',
    ...Object.keys(states).map((state) => `    state "${state}" as ${node(state)}`),
    `    [*] --> ${node(initial)}`,
    ...transitions.flatMap(({ id, from, to }) => [from].flat().map((source) => `    ${node(source)} --> ${node(to)}: ${id}`)),
    ...final.map((state) => `    ${node(state)} --> [*]`),
    '```',
  ];
}

function transitionRow(contract, { id, from, to, actors, guards = [], effects = [], note }) {
  const declared = guards.map((guard) => contract.guards[guard]);
  const evidence = new Set(declared.map(({ evidence: { source, artifact } }) => (artifact ? `${code(source)} (${code(artifact)})` : code(source))));
  return [
    code(id),
    `${list([from].flat())} → ${code(to)}`,
    note ? `${list(actors)}: ${note}` : list(actors),
    declared.map(({ description }) => description).join('; ') || 'Không có',
    [...evidence].join(', ') || 'Không có',
    list(effects),
  ];
}

function table(header, rows) {
  return [header, header.map(() => '---'), ...rows].map((cells) => `| ${cells.map((cell) => cell.replaceAll('|', '\\|')).join(' | ')} |`);
}

function list(ids) {
  return ids.map(code).join(', ');
}

function code(id) {
  return `\`${id}\``;
}

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
    ...workflows(contract),
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

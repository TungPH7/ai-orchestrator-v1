// Applies a fixture's patch to a copy of the contract. A path is a dot-separated list of keys,
// where `[id=x]` picks the array element whose id is x, e.g. `roles[id=pm].name`.

export function applyPatch(contract, ops) {
  const copy = structuredClone(contract);
  for (const { op, path, value } of ops) {
    const segments = parsePath(path);
    const last = segments.pop();
    const parent = segments.reduce((node, segment) => {
      const next = get(node, segment);
      if (next === undefined) throw new Error(`Patch path not found: ${path}`);
      return next;
    }, copy);

    if (op === 'set') set(parent, last, value, path);
    else if (op === 'remove') remove(parent, last, path);
    else throw new Error(`Unknown patch op '${op}' at ${path}`);
  }
  return copy;
}

function parsePath(path) {
  return [...path.matchAll(/([^.[\]]+)|\[id=([^\]]+)\]/g)].map(([, key, id]) => (id === undefined ? { key } : { id }));
}

function get(node, { key, id }) {
  return id === undefined ? node?.[key] : node?.find?.((element) => element?.id === id);
}

function indexOf(array, id, path) {
  const index = array.findIndex((element) => element?.id === id);
  if (index === -1) throw new Error(`Patch path not found: ${path}`);
  return index;
}

function set(parent, { key, id }, value, path) {
  if (id === undefined) parent[key] = value;
  else parent[indexOf(parent, id, path)] = value;
}

function remove(parent, { key, id }, path) {
  if (id !== undefined) {
    parent.splice(indexOf(parent, id, path), 1);
    return;
  }
  if (!(key in parent)) throw new Error(`Patch path not found: ${path}`);
  delete parent[key];
}

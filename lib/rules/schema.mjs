// Rule R1: every contract file matches its JSON Schema in contract/schema/.
import { readdirSync, readFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';

const SCHEMA_DIR = new URL('../../contract/schema/', import.meta.url);
const SUFFIX = '.schema.json';

const ajv = new Ajv({ allErrors: true });

const schemas = readdirSync(SCHEMA_DIR)
  .filter((file) => file.endsWith(SUFFIX))
  .sort()
  .map((file) => {
    const schema = JSON.parse(readFileSync(new URL(file, SCHEMA_DIR), 'utf8'));
    return { name: file.slice(0, -SUFFIX.length), keys: Object.keys(schema.properties), validate: ajv.compile(schema) };
  });

// The contract is one YAML file per schema: contract/<name>.yaml.
export const CONTRACT_FILES = schemas.map(({ name }) => name);

// template_files is added by readContract from the templates folder, not read from YAML.
const KNOWN_KEYS = new Set(['template_files', ...schemas.flatMap(({ keys }) => keys)]);

export function checkSchemas(contract) {
  const errors = [];
  for (const key of Object.keys(contract)) {
    if (!KNOWN_KEYS.has(key)) errors.push({ rule: 'R1', path: key, message: 'is not declared by any contract schema' });
  }
  for (const { name, keys, validate } of schemas) {
    // The contract merges every file's top-level keys, so take back this file's part.
    const doc = Object.fromEntries(keys.filter((key) => key in contract).map((key) => [key, contract[key]]));
    if (!validate(doc)) errors.push(...validate.errors.map((error) => toError(doc, error, `${name}.yaml`)));
  }
  return errors;
}

function toError(doc, { instancePath, keyword, params, message }, file) {
  const path = formatPath(doc, instancePath);
  if (keyword === 'required') return { rule: 'R1', path: join(path, params.missingProperty), message: `is required (${file})` };
  if (keyword === 'additionalProperties') {
    return { rule: 'R1', path: join(path, params.additionalProperty), message: `is not allowed (${file})` };
  }
  return { rule: 'R1', path, message: `${message} (${file})` };
}

// Turns a JSON pointer such as /roles/1/name into roles[id=pm].name, the path format fixtures use.
function formatPath(doc, pointer) {
  let node = doc;
  let path = '';
  for (const segment of pointer.split('/').slice(1).map((s) => s.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (Array.isArray(node)) {
      node = node[Number(segment)];
      path += typeof node?.id === 'string' ? `[id=${node.id}]` : `[${segment}]`;
    } else {
      node = node?.[segment];
      path = join(path, segment);
    }
  }
  return path;
}

function join(path, key) {
  return path ? `${path}.${key}` : key;
}

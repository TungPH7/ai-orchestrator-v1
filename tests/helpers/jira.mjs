// A Jira or GitHub client for tests that answers from a recording of GET requests, keyed by requestKey.

// The path and its query without startAt, keys sorted: one recording entry per request whatever its page.
export function requestKey(path, query = {}) {
  const params = Object.entries(query)
    .filter(([key, value]) => key !== 'startAt' && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`);
  return params.length > 0 ? `${path}?${params.join('&')}` : path;
}

// Same interface as lib/tracker/jira-client.mjs; each recorded list is a single page. An answer { "$status": 404 }
// is an error with that status, as the real clients throw it.
export function recordedClient(recording) {
  const answer = (path, query) => {
    const key = requestKey(path, query);
    if (!(key in recording)) throw new Error(`no recorded answer for GET ${key}`);
    const status = recording[key]?.$status;
    if (status) throw Object.assign(new Error(`GET ${key} returned ${status}`), { status });
    return structuredClone(recording[key]);
  };
  return {
    get: async (path, query) => answer(path, query),
    async *pages(path, query) {
      yield answer(path, query);
    },
    getAll: async (path, query, itemsKey) => {
      const found = answer(path, query);
      return itemsKey ? found[itemsKey] : Array.isArray(found) ? found : found.values;
    },
    searchAll: async (jql, fields) => answer('/rest/api/3/search/jql', { jql, fields: fields.join(',') }).issues,
  };
}

// A Jira status and a work item in the shape GET /issue returns, from a short description.
export const jiraStatus = (name, category) => ({ name, statusCategory: { key: category } });

export function jiraIssue({ key, type = 'Story', st, parent, subtasks = [], description = 'Có user story', labels = [] }) {
  return {
    key,
    fields: {
      issuetype: { name: type },
      status: st,
      labels,
      description: description && { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
      parent: parent && { key: parent.key, fields: { issuetype: { name: parent.type }, status: parent.st } },
      subtasks: subtasks.map(([k, s]) => ({ key: k, fields: { status: s } })),
      issuelinks: [],
    },
  };
}

// A Jira client for tests: GET /issue/<key> from `issues`, GET /field from `fields`, changelogs by key, JQL searches
// from `search` by query. Writes are recorded in `writes`; a write on a key in `failOn` fails.
export function fakeJira({ issues = [], fields = [], changelogs = {}, search = {}, failOn = [] }) {
  const writes = [];
  const searches = [];
  const write = (kind) => async (key, arg) => {
    if (failOn.includes(key)) throw new Error(`Jira refused ${kind} on ${key}`);
    writes.push([kind, key, arg]);
  };
  return {
    writes,
    searches,
    async get(path) {
      if (path === '/rest/api/3/field') return fields;
      const found = issues.find(({ key }) => key === decodeURIComponent(path.split('/').pop()));
      if (!found) throw new Error(`Jira GET ${path} returned 404`);
      return found;
    },
    getAll: async (path) => changelogs[path.split('/').at(-2)] ?? [],
    async searchAll(jql) {
      searches.push(jql);
      return search[jql] ?? [];
    },
    transition: write('transition'),
    editItem: write('edit'),
    comment: write('comment'),
  };
}

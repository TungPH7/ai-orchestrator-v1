// A Jira or GitHub client for tests that answers from a recording of GET requests, keyed by requestKey.

// The path and its query without startAt, keys sorted: one recording entry per request whatever its page.
export function requestKey(path, query = {}) {
  const params = Object.entries(query)
    .filter(([key, value]) => key !== 'startAt' && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`);
  return params.length > 0 ? `${path}?${params.join('&')}` : path;
}

// Same interface as lib/tracker/jira-client.mjs; each recorded list is a single page.
export function recordedClient(recording) {
  const answer = (path, query) => {
    const key = requestKey(path, query);
    if (!(key in recording)) throw new Error(`no recorded answer for GET ${key}`);
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

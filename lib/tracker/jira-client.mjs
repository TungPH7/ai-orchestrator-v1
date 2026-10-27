// Thin Jira Cloud REST client over api.atlassian.com (tracker-integration spec section 5). Read-only: any method but
// GET is refused before the request leaves. Every request asks for English names, because Jira translates work type
// and status names into the account's language, and the service accounts' language is not English.
const API = 'https://api.atlassian.com/ex/jira';

// Your email and a token with scopes, for jira:check.
export function basicAuth(email, token) {
  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

// A service account's token, for the hooks and jira-sync.
export function bearerAuth(token) {
  return `Bearer ${token}`;
}

export function createJiraClient({ cloudId, authorization, fetch = globalThis.fetch }) {
  async function request(method, path, query = {}) {
    if (method !== 'GET') throw new Error(`Read-only Jira client refused ${method} ${path}`);
    const url = new URL(`${API}/${cloudId}${path}`);
    for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, String(value));
    const res = await fetch(url, { method, headers: { Authorization: authorization, Accept: 'application/json', 'Accept-Language': 'en-US' } });
    if (!res.ok) throw new Error(`Jira ${method} ${path} returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json();
  }

  const get = (path, query) => request('GET', path, query);

  // Pages of a startAt/maxResults list, until isLast, or until total when a page has no isLast. Most lists keep their
  // items under `values`; a few, like comments, use another key.
  async function* pages(path, query = {}, itemsKey = 'values') {
    let startAt = 0;
    for (;;) {
      const page = await get(path, { ...query, startAt });
      yield page;
      const count = page[itemsKey]?.length ?? 0;
      startAt += count;
      if (count === 0 || page.isLast === true || (page.isLast === undefined && startAt >= page.total)) return;
    }
  }

  async function getAll(path, query, itemsKey = 'values') {
    const items = [];
    for await (const page of pages(path, query, itemsKey)) items.push(...page[itemsKey]);
    return items;
  }

  // Every work item a JQL query finds, with the given fields. The search pages with nextPageToken, not startAt.
  async function searchAll(jql, fields) {
    const issues = [];
    let nextPageToken;
    for (;;) {
      const page = await get('/rest/api/3/search/jql', { jql, fields: fields.join(','), maxResults: 100, nextPageToken });
      issues.push(...(page.issues ?? []));
      if (page.isLast !== false || !page.nextPageToken) return issues;
      nextPageToken = page.nextPageToken;
    }
  }

  return { request, get, pages, getAll, searchAll };
}

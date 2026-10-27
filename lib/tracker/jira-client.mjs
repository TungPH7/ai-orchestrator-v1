// Thin Jira Cloud REST client over api.atlassian.com (tracker-integration spec section 5). Read-only: any method but
// GET is refused before the request leaves. Every request asks for English names, because Jira translates work type
// and status names into the account's language, and the service accounts' language is not English.
const API = 'https://api.atlassian.com/ex/jira';

export function basicAuth(email, token) {
  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
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

  // Pages of a startAt/maxResults list, until isLast, or until total when a page has no isLast.
  async function* pages(path, query = {}) {
    let startAt = 0;
    for (;;) {
      const page = await get(path, { ...query, startAt });
      yield page;
      const count = page.values?.length ?? 0;
      startAt += count;
      if (count === 0 || page.isLast === true || (page.isLast === undefined && startAt >= page.total)) return;
    }
  }

  async function getAll(path, query) {
    const items = [];
    for await (const page of pages(path, query)) items.push(...page.values);
    return items;
  }

  return { request, get, pages, getAll };
}

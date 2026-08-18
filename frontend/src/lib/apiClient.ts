// Points at backend/public/index.php, started via `composer serve`
// (php -S localhost:8000 -t public) — see root CLAUDE.md.
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(await describeError(res, path));
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await describeError(res, path));
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await describeError(res, path));
  }
  return res.json() as Promise<T>;
}

async function describeError(res: Response, path: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data.error) {
      return data.error;
    }
  } catch {
    // response wasn't JSON — fall through to the generic message
  }
  return `${path} failed: ${res.status} ${res.statusText}`;
}

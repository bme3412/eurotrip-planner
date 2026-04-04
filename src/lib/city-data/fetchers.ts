type FetchOptions = {
  cache?: RequestCache;
  schema?: { parse: (data: any) => any };
};

/**
 * Fetch a city data JSON with optional cache and schema validation.
 */
export async function fetchCityDataUrl<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  const { cache = 'force-cache', schema } = options;
  const res = await fetch(url, { cache });
  if (!res.ok) {
    throw new Error(`Failed to fetch city data: ${url} (${res.status})`);
  }
  const json = await res.json();
  if (schema?.parse) {
    return schema.parse(json) as T;
  }
  return json as T;
}


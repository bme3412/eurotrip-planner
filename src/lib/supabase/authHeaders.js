export function getSupabaseAuthHeaders(session, headers = {}) {
  const token = session?.access_token;
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

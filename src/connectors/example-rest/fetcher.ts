/**
 * Example REST connector - fetches from REST API
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiRecord {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  start_date?: string;
  end_date?: string;
  sdgs?: string[];
  actor?: string;
  proof_url?: string;
  metadata_url?: string;
  platform_id?: string;
  explorer_link?: string;
  [key: string]: unknown;
}

export async function fetchFromApi(
  apiUrl: string,
  _scope?: { chain?: string }
): Promise<ApiRecord[]> {
  const response = await fetch(apiUrl, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Expect array of records, or { data: [...] } wrapper
  const records = Array.isArray(data) ? data : data?.data ?? [];
  return records as ApiRecord[];
}

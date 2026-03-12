/**
 * Silvi connector - fetches projects from Silvi REST API
 *
 * Simple GET request, no auth required.
 * API returns { projects: [...] }
 */

export interface SilviProject {
  project_id: number;
  title: string;
  banner_photo: string | null;
  description: string;
  centroid: { lat: number; lng: number } | null;
  created_at: string;
  silvi_url: string;
}

export interface SilviApiResponse {
  projects: SilviProject[];
}

export async function fetchSilviProjects(
  apiUrl: string,
  _scope?: { chain?: string }
): Promise<SilviProject[]> {
  const response = await fetch(apiUrl, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Silvi API request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as SilviApiResponse;
  return data.projects ?? [];
}

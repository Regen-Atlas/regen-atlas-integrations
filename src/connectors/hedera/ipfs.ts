/**
 * IPFS CID → JSON (shared by fetcher and VC geography resolution).
 */

export async function resolveIPFS(cid: string): Promise<Record<string, unknown> | undefined> {
  const gateways = [
    `https://${cid}.ipfs.w3s.link/`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
  ];

  for (const url of gateways) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text) as Record<string, unknown>;
        } catch {
          return { rawContent: text } as Record<string, unknown>;
        }
      }
    } catch {
      continue;
    }
  }

  console.warn(`    ⚠️  IPFS resolution failed for CID: ${cid}`);
  return undefined;
}

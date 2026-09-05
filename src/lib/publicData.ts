/**
 * publicData.ts — single-flight cache for the public getAppData payload.
 *
 * The home page fetched the same ~110KB (159-job) payload TWICE per load:
 * LokerTable (table rows) and the marquee <script> in index.astro (which only
 * needs `pengumuman`). Both callers now share one in-flight request; the cache
 * resets after the response settles so a later load refetches fresh data.
 */
export interface PublicAppData {
  success: boolean;
  activeTheme?: string;
  sessionInvalid?: boolean;
  jobs?: Array<Record<string, unknown>>;
  pengumuman?: string;
}

let inflight: Promise<PublicAppData> | null = null;

export function getPublicData(): Promise<PublicAppData> {
  if (!inflight) {
    inflight = fetch("/.netlify/functions/get-app-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getAppData", args: ["public"] }),
    })
      .then((res) => res.json() as Promise<PublicAppData>)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

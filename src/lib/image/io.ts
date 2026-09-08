import "server-only";
import { falMockEnabled } from "@/lib/env";

/** Refuse to fetch anything huge into a serverless function's memory. */
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Load image bytes for server-side compositing.
 *
 * In mock mode the asset is read straight off disk: the mock URLs point back
 * at this same server, and a function fetching itself deadlocks whenever the
 * runtime only has one worker.
 */
export async function loadImageBytes(url: string): Promise<Buffer> {
  if (falMockEnabled()) {
    const { resolveAsset } = await import("@/lib/mock/store");
    const local = await resolveAsset(url);
    if (local) return local;
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status}) from ${url}`);
  }

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) {
    throw new Error(`Image at ${url} exceeds the ${MAX_BYTES} byte limit.`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error(`Image at ${url} exceeds the ${MAX_BYTES} byte limit.`);
  }
  return bytes;
}

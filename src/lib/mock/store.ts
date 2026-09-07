import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { appUrl } from "@/lib/env";

/**
 * Disk-backed asset store used only when FAL_MOCK is on.
 *
 * Files live under .superbooth-mock/ so they survive dev-server reloads (an
 * in-memory Map does not, and losing the guest photo halfway through a mocked
 * session makes the mock useless for rehearsing the flow). Served back out
 * through /api/mock/assets/[id].
 */

const ROOT = path.join(process.cwd(), ".superbooth-mock");
const ASSETS = path.join(ROOT, "assets");
const JOBS = path.join(ROOT, "jobs");

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function ensure(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function putAsset(bytes: Buffer, contentType: string): Promise<string> {
  await ensure(ASSETS);
  const extension = EXTENSIONS[contentType] ?? "bin";
  const id = `${createHash("sha256").update(bytes).digest("hex").slice(0, 24)}.${extension}`;
  await writeFile(path.join(ASSETS, id), bytes);
  return `${appUrl()}/api/mock/assets/${id}`;
}

export async function getAsset(
  id: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  // The id is a path segment from a URL; refuse anything that could escape.
  if (!/^[a-f0-9]{24}\.(jpg|png|webp|bin)$/.test(id)) return null;
  try {
    const bytes = await readFile(path.join(ASSETS, id));
    const extension = id.split(".").pop() ?? "bin";
    const contentType =
      Object.entries(EXTENSIONS).find(([, ext]) => ext === extension)?.[0] ??
      "application/octet-stream";
    return { bytes, contentType };
  } catch {
    return null;
  }
}

/** Resolve a URL produced by `putAsset` back to its bytes, without HTTP. */
export async function resolveAsset(url: string): Promise<Buffer | null> {
  const match = /\/api\/mock\/assets\/([^/?#]+)$/.exec(url);
  if (!match) return null;
  const asset = await getAsset(match[1]);
  return asset?.bytes ?? null;
}

export interface MockJob {
  requestId: string;
  createdAt: number;
  sourceUrl: string | null;
  numImages: number;
  prompt: string;
  images: string[] | null;
  error: string | null;
}

export async function putJob(job: MockJob): Promise<void> {
  await ensure(JOBS);
  await writeFile(path.join(JOBS, `${job.requestId}.json`), JSON.stringify(job), "utf8");
}

export async function getJob(requestId: string): Promise<MockJob | null> {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(requestId)) return null;
  try {
    return JSON.parse(await readFile(path.join(JOBS, `${requestId}.json`), "utf8")) as MockJob;
  } catch {
    return null;
  }
}

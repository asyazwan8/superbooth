import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { Resolution } from "@/lib/schema";
import { getJob, putAsset, putJob, resolveAsset } from "@/lib/mock/store";
import type { ImageProvider, QueueStatus, SubmitRequest, UploadInput } from "./provider";

/**
 * Local stand-in for FAL.
 *
 * It does real image work — the guest photo is genuinely re-rendered at 9:16
 * with a per-variant grade — so the mock exercises the same code paths as
 * production: upload, poll, pick a variant, composite the overlay. That makes
 * it useful for rehearsing an event and for E2E tests, not just for stubbing.
 *
 * Every mock output is watermarked so a mocked image can never be mistaken for
 * a real generation.
 */

/** Simulated queue timings, roughly matching a real 2K generation. */
const QUEUE_MS = 1_500;
const PROGRESS_MS = 7_000;

const RESOLUTION_HEIGHT: Record<Resolution, number> = {
  "1K": 1920,
  "2K": 2560,
  "4K": 3840,
};

/** Distinct grades per variant so "pick one" is visibly a real choice. */
const GRADES = [
  { hue: 0, saturation: 1.05, brightness: 1.04, tint: "#7c5cff" },
  { hue: 150, saturation: 1.25, brightness: 0.98, tint: "#ff7ab8" },
  { hue: 250, saturation: 0.75, brightness: 1.1, tint: "#4cc9f0" },
  { hue: 60, saturation: 1.4, brightness: 0.95, tint: "#ffd166" },
];

function watermark(width: number, height: number, label: string): Buffer {
  const fontSize = Math.round(width * 0.032);
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
       <text x="${width / 2}" y="${height - fontSize}" font-family="sans-serif"
             font-size="${fontSize}" fill="#ffffff" fill-opacity="0.62"
             text-anchor="middle" letter-spacing="${fontSize * 0.12}">${label}</text>
     </svg>`,
  );
}

/** A neutral gradient used when there is no source photo to work from. */
function placeholder(width: number, height: number, tint: string): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="${tint}" stop-opacity="0.85"/>
           <stop offset="100%" stop-color="#050507"/>
         </linearGradient>
       </defs>
       <rect width="${width}" height="${height}" fill="url(#g)"/>
     </svg>`,
  );
}

async function render(
  sourceUrl: string | null,
  variantIndex: number,
  resolution: Resolution,
): Promise<string> {
  const grade = GRADES[variantIndex % GRADES.length];
  const height = RESOLUTION_HEIGHT[resolution];
  const width = Math.round((height * 9) / 16);

  const source = sourceUrl ? await resolveAsset(sourceUrl) : null;

  const base = source
    ? sharp(source).resize(width, height, { fit: "cover", position: "top" })
    : sharp(placeholder(width, height, grade.tint));

  const bytes = await base
    .modulate({
      hue: grade.hue,
      saturation: grade.saturation,
      brightness: grade.brightness,
    })
    .composite([
      { input: watermark(width, height, `MOCK · VARIANT ${variantIndex + 1}`), top: 0, left: 0 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return putAsset(bytes, "image/jpeg");
}

export const mockProvider: ImageProvider = {
  name: "mock",

  async upload({ bytes, contentType }: UploadInput): Promise<string> {
    return putAsset(bytes, contentType);
  },

  async submit(request: SubmitRequest): Promise<string> {
    const requestId = `mock-${randomUUID()}`;
    await putJob({
      requestId,
      createdAt: Date.now(),
      // Index 0 is always the guest photo — see lib/fal/prompt.ts.
      sourceUrl: request.imageUrls[0] ?? null,
      numImages: request.numImages,
      prompt: request.prompt,
      images: null,
      error: null,
    });
    return requestId;
  },

  async status(requestId: string): Promise<QueueStatus> {
    const job = await getJob(requestId);
    if (!job) return { state: "FAILED", error: "Unknown request id." };
    if (job.error) return { state: "FAILED", error: job.error };
    if (job.images) return { state: "COMPLETED", images: job.images };

    const elapsed = Date.now() - job.createdAt;
    if (elapsed < QUEUE_MS) {
      return { state: "IN_QUEUE", queuePosition: 1 };
    }
    if (elapsed < QUEUE_MS + PROGRESS_MS) {
      return { state: "IN_PROGRESS" };
    }

    const images = await Promise.all(
      Array.from({ length: job.numImages }, (_, index) => render(job.sourceUrl, index, "1K")),
    );
    await putJob({ ...job, images });
    return { state: "COMPLETED", images };
  },

  async textToImage(prompt: string, resolution: Resolution): Promise<string> {
    // Deterministic grade from the prompt so repeated calls look stable.
    const seed = [...prompt].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return render(null, seed % GRADES.length, resolution);
  },
};

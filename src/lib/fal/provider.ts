import "server-only";
import { falMockEnabled } from "@/lib/env";
import type { Resolution } from "@/lib/schema";

/**
 * The booth talks to image generation through this interface only.
 *
 * Two drivers implement it: the real FAL client, and a local mock that
 * produces plausible images without network access. The mock is not just a
 * test fixture — it lets the whole booth be demoed, rehearsed and E2E-tested
 * without spending credits or needing connectivity.
 */

export interface SubmitRequest {
  prompt: string;
  imageUrls: string[];
  numImages: number;
  resolution: Resolution;
}

export type QueueState = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface QueueStatus {
  state: QueueState;
  /** Position in the FAL queue, when the provider reports one. */
  queuePosition?: number;
  /** Populated only when state is COMPLETED. */
  images?: string[];
  /** Populated only when state is FAILED. Safe to show to an operator. */
  error?: string;
}

export interface UploadInput {
  bytes: Buffer;
  contentType: string;
  filename: string;
}

export interface ImageProvider {
  readonly name: "fal" | "mock";
  /** Store bytes and return a publicly fetchable URL. */
  upload(input: UploadInput): Promise<string>;
  /** Enqueue an image-to-image edit. Returns a request id to poll. */
  submit(request: SubmitRequest): Promise<string>;
  /** Poll a previously submitted request. */
  status(requestId: string): Promise<QueueStatus>;
  /** Synchronous text-to-image, used by the admin scene generator. */
  textToImage(prompt: string, resolution: Resolution): Promise<string>;
}

/** Raised when the model declines a request (safety, unusable input). */
export class GenerationRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationRejectedError";
  }
}

let cached: ImageProvider | null = null;

export async function getProvider(): Promise<ImageProvider> {
  if (cached) return cached;
  cached = falMockEnabled()
    ? (await import("./mock")).mockProvider
    : (await import("./real")).falProvider;
  return cached;
}

/** Test seam: forget the memoised provider so env changes take effect. */
export function resetProviderCache(): void {
  cached = null;
}

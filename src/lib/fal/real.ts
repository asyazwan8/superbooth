import "server-only";
import { ApiError, fal } from "@fal-ai/client";
import { falKey } from "@/lib/env";
import type { Resolution } from "@/lib/schema";
import {
  GenerationRejectedError,
  type ImageProvider,
  type QueueStatus,
  type SubmitRequest,
  type UploadInput,
} from "./provider";

/**
 * The real FAL driver.
 *
 * Endpoint ids and their input shapes are typed by @fal-ai/client, so a typo
 * here is a compile error rather than a runtime failure at the event.
 */

export const EDIT_ENDPOINT = "fal-ai/nano-banana-pro/edit" as const;
export const TEXT_TO_IMAGE_ENDPOINT = "fal-ai/nano-banana-pro" as const;

/**
 * Guest photos and generated images are not kept forever. FAL applies this
 * lifecycle to the stored object, which means expiry is enforced by the store
 * itself and not only by our own purge job.
 */
const ASSET_LIFETIME = "30d" as const;

let configured = false;

function client() {
  if (!configured) {
    fal.config({ credentials: falKey() });
    configured = true;
  }
  return fal;
}

/** FAL surfaces moderation blocks and unusable inputs as 4xx ApiErrors. */
function toDomainError(error: unknown): Error {
  if (error instanceof ApiError) {
    const body = error.body as { detail?: unknown } | undefined;
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : Array.isArray(body?.detail)
          ? JSON.stringify(body.detail)
          : error.message;

    if (error.status >= 400 && error.status < 500) {
      return new GenerationRejectedError(detail);
    }
    return new Error(`FAL request failed (${error.status}): ${detail}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

function imageUrls(data: unknown): string[] {
  const images = (data as { images?: { url?: string }[] } | undefined)?.images ?? [];
  return images.map((image) => image.url).filter((url): url is string => Boolean(url));
}

export const falProvider: ImageProvider = {
  name: "fal",

  async upload({ bytes, contentType, filename }: UploadInput): Promise<string> {
    const blob = new File([new Uint8Array(bytes)], filename, { type: contentType });
    try {
      return await client().storage.upload(blob, {
        lifecycle: { expiresIn: ASSET_LIFETIME },
      });
    } catch (error) {
      throw toDomainError(error);
    }
  },

  async submit(request: SubmitRequest): Promise<string> {
    try {
      const enqueued = await client().queue.submit(EDIT_ENDPOINT, {
        input: {
          prompt: request.prompt,
          image_urls: request.imageUrls,
          num_images: request.numImages,
          aspect_ratio: "9:16",
          resolution: request.resolution,
          output_format: "jpeg",
        },
        storageSettings: { expiresIn: ASSET_LIFETIME },
      });
      return enqueued.request_id;
    } catch (error) {
      throw toDomainError(error);
    }
  },

  async status(requestId: string): Promise<QueueStatus> {
    let state;
    try {
      state = await client().queue.status(EDIT_ENDPOINT, { requestId });
    } catch (error) {
      const domain = toDomainError(error);
      // A 4xx on status means the request itself failed; report it as a
      // terminal state so the booth can offer a retry instead of polling on.
      if (domain instanceof GenerationRejectedError) {
        return { state: "FAILED", error: domain.message };
      }
      throw domain;
    }

    if (state.status === "IN_QUEUE") {
      return { state: "IN_QUEUE", queuePosition: state.queue_position };
    }
    if (state.status === "IN_PROGRESS") {
      return { state: "IN_PROGRESS" };
    }

    try {
      const result = await client().queue.result(EDIT_ENDPOINT, { requestId });
      const images = imageUrls(result.data);
      if (images.length === 0) {
        return { state: "FAILED", error: "The model returned no images." };
      }
      return { state: "COMPLETED", images };
    } catch (error) {
      const domain = toDomainError(error);
      if (domain instanceof GenerationRejectedError) {
        return { state: "FAILED", error: domain.message };
      }
      throw domain;
    }
  },

  async textToImage(prompt: string, resolution: Resolution): Promise<string> {
    try {
      const result = await client().subscribe(TEXT_TO_IMAGE_ENDPOINT, {
        input: {
          prompt,
          num_images: 1,
          aspect_ratio: "9:16",
          resolution,
          output_format: "jpeg",
        },
        storageSettings: { expiresIn: ASSET_LIFETIME },
      });
      const [url] = imageUrls(result.data);
      if (!url) throw new Error("The model returned no images.");
      return url;
    } catch (error) {
      throw toDomainError(error);
    }
  },
};

import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { NotFoundError } from "@/lib/db/types";
import { GenerationRejectedError } from "@/lib/fal/provider";

/**
 * Shared route-handler plumbing.
 *
 * Guests never see a stack trace: `handle` maps known failures onto short,
 * plain-language messages the kiosk can render as-is, and everything else
 * becomes a generic message with the detail kept server-side in the logs.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = "Not signed in.") => new HttpError(401, message);
export const forbidden = (message = "Not allowed.") => new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    // Booth state changes constantly and must never be served from a CDN.
    headers: { "cache-control": "no-store", ...(init?.headers ?? {}) },
  });
}

interface ErrorBody {
  error: string;
  /** Machine-readable hint so the kiosk can choose the right recovery screen. */
  code?: "rejected" | "not_found" | "invalid" | "server";
}

export async function handle(
  operation: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await operation();
  } catch (error) {
    const body = toErrorBody(error);
    if (body.status >= 500) {
      console.error("[superbooth] unhandled route error", error);
    }
    return NextResponse.json<ErrorBody>(body.payload, {
      status: body.status,
      headers: { "cache-control": "no-store" },
    });
  }
}

function toErrorBody(error: unknown): { status: number; payload: ErrorBody } {
  if (error instanceof HttpError) {
    return { status: error.status, payload: { error: error.message, code: "invalid" } };
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const where = first?.path.join(".");
    return {
      status: 400,
      payload: {
        error: where ? `${where}: ${first.message}` : (first?.message ?? "Invalid request."),
        code: "invalid",
      },
    };
  }
  if (error instanceof NotFoundError) {
    return { status: 404, payload: { error: error.message, code: "not_found" } };
  }
  if (error instanceof GenerationRejectedError) {
    return {
      status: 422,
      payload: {
        error: "That photo could not be used. Please try again with a clear, well-lit shot.",
        code: "rejected",
      },
    };
  }
  return {
    status: 500,
    payload: { error: "Something went wrong. Please try again.", code: "server" },
  };
}

/** Parse a JSON body, turning malformed input into a 400 rather than a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Expected a JSON body.");
  }
}

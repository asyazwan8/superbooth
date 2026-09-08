import { timingSafeEqual } from "node:crypto";
import { forbidden, handle, ok, readJson } from "@/lib/api";
import { attendantPin } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Verifies the attendant PIN.
 *
 * Checked on the server so the PIN is never shipped to a public kiosk, and
 * compared in constant time so a guest with a laptop cannot narrow it down by
 * measuring responses.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = (await readJson(request)) as { pin?: unknown };
    const supplied = typeof body.pin === "string" ? body.pin : "";
    const expected = attendantPin();

    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw forbidden("Incorrect PIN.");
    }

    return ok({ ok: true });
  });
}

import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/fal/provider";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Polls a test generation.
 *
 * Separate from the booth's status route because that one is deliberately
 * scoped to a session — an admin test has no session, and relaxing the booth
 * route's ownership check to accommodate it would weaken the guest path.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  return handle(async () => {
    await requireAdmin();
    const { requestId } = await params;
    const provider = await getProvider();
    const status = await provider.status(requestId);
    return ok(status);
  });
}

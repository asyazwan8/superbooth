# Working on Superbooth

An AI photobooth: a vertical kiosk for guests, a backend for operators, FAL for
generation, Firebase for data. Read `README.md` for the shape of it and
`SETUP.md` for how to run it.

## Before you start

```bash
npm run dev   # FAL_MOCK=1 in .env.local — no credentials needed
```

The mock image provider and the local disk store mean the entire booth runs,
demos and tests without a FAL key or a Firebase project. Keep it that way: any
new feature should still work with `FAL_MOCK=1` and no Firebase.

## Checks to run before pushing

```bash
npm run typecheck && npm run lint && npm test && npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm run e2e
```

Lint is not optional here — Next 16's React Compiler rules catch real problems
(state set synchronously inside effects, refs touched during render), and every
one flagged so far has been a genuine bug rather than a false positive.

## Conventions that matter

**Style against the tokens, inline.** `src/styles/tokens` is the design
system's, imported unchanged — never edit those files to change an app screen.
`src/components/ds` holds the components built on them (`core`, `booth`,
`dashboard`); screens compose those and style the gaps inline against the same
custom properties. There is no utility framework, and adding one would put two
idioms in competition over the same colour. The three rules that carry the
brand: square corners, a 3px ink border, and depth as a hard zero-blur offset
shadow that collapses on press. The booth is 64px targets; the backend is 40px
and the only place hover exists.

**Add drivers, not branches.** Image generation and persistence each sit behind
an interface with a production and a local driver
(`lib/fal/provider.ts`, `lib/db/types.ts`). Route handlers only ever see the
interface. Do not reach past it or add `if (mock)` checks in feature code.

**Validate on read, not just on write.** Firestore is schemaless and its
documents are hand-editable in the console, so every document is parsed through
its zod schema on the way out (`lib/schema.ts`). A mistyped field should fail in
the driver, not reach the kiosk as `undefined` mid-event.

**The server owns what the server owns.** A preset save cannot set `isActive`,
`id` or `createdAt`; a booth request cannot override a step the operator pinned.
Anything a stale or tampered client could send is re-derived server-side.

**Keep the kiosk unattended-safe.** The failure mode that matters is a guest
walking away mid-session and the next guest seeing their email address. Idle
reset, session teardown and the attendant escape hatch are load-bearing, not
polish.

**Guests never see internals.** No stack traces, status codes, or the word
"moderation". `lib/api.ts` maps known failures onto plain sentences with a
recovery path; everything else becomes a generic message with detail kept in
the server logs.

## Things that will bite you

- **`sanitisePreset` is an allowlist, not a blocklist.** Add a field to `Preset`
  and it stays private until you name it there. That is deliberate — check it
  when adding anything the kiosk needs.
- **Purging clears URLs but keeps timings and status.** Anything derived from a
  session must still be correct for a purged record; deriving stage or spend
  from stored URLs has already caused two bugs.
- **`FIREBASE_PRIVATE_KEY` needs literal `\n` and surrounding quotes.**
  `lib/env.ts` converts them back.
- **Admin `Field` is a `<label>`, the design system's `Field` is a `<div>`.**
  The design system's is for content that is not an input. Route a backend
  input through `components/admin/ui`'s `Field` or it loses its accessible
  name, and six E2E tests that find controls by label will fail.

- **Camera work needs HTTPS.** `getUserMedia` is unavailable on plain `http://`
  outside localhost, so a LAN IP will not work on the booth device.
- **E2E tests share one dev server and run serially.** Tests that create presets
  should clean up after themselves or address rows by name, never by position.

## Cost awareness

Every generation is billed (~$0.15/image, ~$0.30 per guest at the default two
variants). When adding anything that generates, put the estimate in front of
the operator before they trigger it — `estimateCostUsd` in `lib/fal/prompt.ts`.

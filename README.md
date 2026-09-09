# Superbooth

An AI photobooth for events. A guest taps a vertical screen, enters their
details, picks a scene, a look and a style, has their photo taken, and walks
away with an AI-generated portrait via a QR code.

Built on [FAL](https://fal.ai)'s `nano-banana-pro/edit` for generation and
Firebase for data.

**New here? Go to [SETUP.md](./SETUP.md).** It gets you a working booth in five
minutes with no accounts.

---

## What's in the box

| Surface | Route | For |
|---|---|---|
| Kiosk | `/` → `/booth` | The guest. Vertical 9:16, touch-first. |
| Result page | `/p/<id>` | What the QR opens on the guest's phone. |
| Gallery wall | `/gallery` | A second screen beside the booth. |
| Backend | `/admin` | The operator. |

### The guest flow

```
idle → details & consent → scene → look → style → capture → review
     → generating → pick a variant → QR & download
```

Scene, look and style each disappear from the flow when the operator pins them
to a fixed choice — or when only one option is enabled. Everything else is
configured per event in the backend: logo, accent colour, which fields to collect,
consent wording, variant count, resolution, retries, idle timeout and retention.

---

## Architecture notes

**The guest flow is one route, not nine.** `/booth` holds the whole journey in
client state. Page navigations on a kiosk mean a flash of empty background
between every tap and browser history that Back can walk out of; state keeps
transitions instant and makes "start over" a single reliable reset.

**Generation is submit-then-poll.** `/api/booth/generate` enqueues and returns
in under a second; the kiosk polls for progress. That survives a mid-generation
refresh, keeps a paid request alive when the browser drops, and sidesteps
function duration limits. Only the variant the guest picks is composited and
stored — one image processed per guest, not one per variant.

**Two interfaces, two drivers each.** Image generation
(`lib/fal/provider.ts`) and persistence (`lib/db/types.ts`) each have a
production driver and a local one. `FAL_MOCK=1` and the absence of Firebase
credentials select the local pair, which is why the whole booth runs, demos and
E2E-tests with no credentials at all.

**Nothing reaches Firestore from a browser.** `firestore.rules` denies all
direct access; every read and write goes through a route handler. One place
owns validation, the admin allowlist and PDPA handling.

**One design system, two scales.** `src/styles/tokens` holds the Superbooth
tokens verbatim and `src/components/ds` the components built on them — square
corners, a 3px ink border, depth as a hard zero-blur offset shadow, and the
-7deg lean taken off the Super! logo. The booth is 64px targets and one
decision per screen; the backend is the same palette at 40px, dense, and the
only place hover states exist. There is no utility framework: components style
themselves inline against the custom properties, which is the design system's
own idiom.

**Identity preservation is the prompt's first instruction.** Everything else
about a photobooth output can be a little off and still delight; a guest who
doesn't recognise themselves is a failed session. See `lib/fal/prompt.ts`.

---

## Development

```bash
npm run dev        # FAL_MOCK=1 by default — no credentials needed
npm run build
npm run lint
npm run typecheck
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end tests (Playwright)
```

`npm run e2e` starts its own dev server. On a machine with a pre-installed
Chromium, point at it rather than downloading one:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm run e2e
```

### Layout

```
src/
  app/
    (kiosk)/            guest kiosk — attract screen and the booth flow
    admin/              operator backend (login sits outside the auth guard)
    p/[shortId]/        public result page, the QR target
    gallery/            second-screen photo wall
    api/                every server route
  components/
    ds/                 design-system components: core, booth, dashboard
    kiosk/              9:16 touch UI and its steps
    admin/              backend UI, built on the dashboard components
  lib/
    fal/                provider interface, real + mock drivers, prompt builder
    db/                 repository interface, Firestore + local drivers, seed
    booth/              step machine and capture helpers
    image/              overlay compositing
  styles/tokens/        the design system's tokens, imported unchanged
tests/                  unit tests
e2e/                    Playwright specs
```

---

## Cost

`nano-banana-pro` bills per image: about **$0.15** at 1K/2K, **$0.30** at 4K.
The default of two variants is roughly **$0.30 per guest**. The backend shows a
live estimate as you change the settings and tracks actual spend in Analytics.

## Data protection

Consent is stored as the exact text shown plus its version and timestamp, not
just a boolean. Retention is configurable per event and enforced by a nightly
job that redacts personal data while keeping the consent trail. Guests can
delete their own photo and details from the result page.

The default consent text references Malaysia's PDPA 2010 and is a starting
point — have someone qualified review it against how you actually use the data.

# Setting up Superbooth

Three things to do, in this order. You can stop after step 1 and have a fully
working booth to play with — Firebase and deployment only matter when you want
real generations and data that survives a restart.

---

## 1. Run it locally (5 minutes, no accounts needed)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. You have a working booth: it uses a **mock image
generator** and stores data in a local file, so nothing costs money and nothing
needs configuring.

| Where | What |
|---|---|
| <http://localhost:3000> | The guest kiosk |
| <http://localhost:3000/admin> | The operator backend — sign in with PIN `1234` |
| <http://localhost:3000/gallery> | The photo wall for a second screen |

The mock generator returns a re-graded version of the guest's own photo with a
`MOCK` watermark, so you can rehearse the whole flow — including the QR
download — before spending anything.

---

## 2. Connect FAL (real image generation)

1. Create an account at <https://fal.ai> and generate an API key.
2. Put it in `.env.local` and turn the mock off:

   ```dotenv
   FAL_KEY=your-key-here
   FAL_MOCK=0
   ```

3. Restart `npm run dev`. The "Demo mode" badge disappears from the booth.

**Cost.** Superbooth uses `fal-ai/nano-banana-pro/edit`, billed **per image**:
about **$0.15** at 1K/2K and **$0.30** at 4K. With the default two-variants
setting that is roughly **$0.30 per guest**, plus any retries. The Generation
tab in the backend shows the per-guest estimate as you change the settings, and
the Analytics page tracks actual spend.

> **Budget quickly:** 500 guests × 2 variants at 2K ≈ **$150**. Drop to one
> variant to halve it; the booth then skips the "pick your favourite" step.

**Before your first event**, open a preset in the backend and use **Test a
generation** on the right-hand side. Upload a photo of a real person, run one
generation per style, and adjust the prompt fragments until you like the output.
This costs about $0.15 a go and is the single highest-value thing you can do
before an event.

---

## 3. Create the Firebase project (persistent data + real admin logins)

Without this, Superbooth stores data in a local file and guards the backend with
a PIN. That is fine for local use, but **the PIN fallback is disabled in
production** — a deployed booth must use Firebase Auth.

### 3.1 Create the project

1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Name it (e.g. `superbooth`). Google Analytics is not needed — turn it off.

### 3.2 Turn on Firestore

1. In the left sidebar: **Product categories → Databases & Storage → Firestore
   Database → Create database**. (Firebase reorganised this console; if the
   category names differ again, the **"Search for products"** box at the top of
   the sidebar is the reliable way in.)
2. Choose **Production mode** (Superbooth ships rules that deny all direct
   access; everything goes through the server).
3. Pick the region closest to your events — `asia-southeast1` (Singapore) is the
   right choice for Malaysia.

### 3.3 Turn on Authentication

1. **Product categories → Security → Authentication → Get started**, or search
   for "Authentication" in the sidebar search box.
2. On the **Sign-in method** tab, enable the **Email/Password** provider. Leave
   "Email link (passwordless sign-in)" off — Superbooth does not use it.
3. On the **Users** tab, **Add user** for each operator who should reach the
   backend, setting a password for each. Note the email addresses — you need
   them in a moment.

> Adding a user here creates the account; listing the address in `ADMIN_EMAILS`
> grants it access. **Both are required.** The password is one you invent on
> this screen — not the operator's Google account password.

### 3.4 Get the server credentials

1. Click the gear icon → **Project settings → Service accounts**.
2. **Generate new private key** and download the JSON file.
3. Open it and find these three values:
   - `project_id`
   - `client_email`
   - `private_key`

> Treat that file like a password. Do not commit it. `.gitignore` already
> excludes `serviceAccountKey.json`.

### 3.5 Get the web credentials

1. **Project settings → General**, scroll to **Your apps**.
2. Click the web icon (`</>`) and register an app (nickname anything, no
   hosting needed).
3. Copy `apiKey`, `authDomain` and `projectId` from the config snippet shown.

### 3.6 Fill in the environment

```dotenv
# Server (from the service account JSON)
FIREBASE_PROJECT_ID=superbooth-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@superbooth-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Browser (from the web app config) — these are not secrets
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=superbooth-12345.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=superbooth-12345

# Who may reach /admin. An empty list locks everyone out.
ADMIN_EMAILS=you@example.com,colleague@example.com
```

> **`FIREBASE_PRIVATE_KEY` is the one that trips people up.** Paste the whole
> value including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
> lines. Superbooth accepts every shape a copy-paste produces — literal `\n`,
> real newlines, and a wrapping pair of quotes — so you do not have to guess
> which one your host wants. If the value is wrong, the sign-in page now says so
> and names the variable rather than failing with a generic error.

### 3.7 Publish the security rules

`firestore.rules` in this repo denies every direct client read and write. That
is deliberate: all access goes through the server, which is where validation,
the admin allowlist and PDPA handling live.

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project superbooth-12345
```

Or paste the contents of `firestore.rules` into
**Firestore → Rules** in the console and publish.

Restart the dev server. The backend now asks for an email and password instead
of a PIN, and the "Local storage" badge disappears.

---

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. At <https://vercel.com/new>, import it. The defaults are correct.
3. Under **Settings → Environment Variables**, add everything from your
   `.env.local` **except** `FAL_MOCK`, plus:

   ```dotenv
   APP_URL=https://your-domain.com
   ATTENDANT_PIN=8321
   CRON_SECRET=<a long random string>
   ```

   - `APP_URL` is what the QR code points at. Get it wrong and every QR sends
     guests to the wrong place, so set it before your first event.
   - `ATTENDANT_PIN` unlocks the hidden staff menu on the kiosk. Change it from
     the default.
   - `CRON_SECRET` stops anyone but Vercel from triggering the nightly purge.

4. Deploy. `vercel.json` registers the retention purge to run daily at 03:00 UTC.

### Point the booth at the deployment

Open your URL on the booth device in fullscreen. On iPad, use **Guided Access**
(Settings → Accessibility → Guided Access) to lock the browser to the page.

**HTTPS is required** for the camera to work. Vercel gives you that; a plain
`http://` address on a local network will not get camera access in any modern
browser.

---

## Running an event

**A week before**

- Duplicate last event's preset, rename it, and swap the logo.
- Upload a 1080×1920 transparent PNG overlay if you want branding burnt into
  the photos.
- Test-generate every style with a real photo. Adjust prompts.
- Set retention (Generation tab) to match what your consent text promises.

**On the day**

- Open the booth URL, take one photo yourself end to end, and scan the QR with
  your own phone. This catches a wrong `APP_URL` before guests do.
- Put the gallery on a second screen if you have one — it visibly pulls a queue.
- Keep `/admin/sessions` open on a laptop for moderation.

**Booth device checklist**

- Screen brightness up; auto-lock off (Superbooth also requests a wake lock).
- Front camera clean, device at chest height, subject lit from the front.
- Plugged in. Generation over Wi-Fi is not a battery-friendly workload.

**If something goes wrong**

- Booth stuck on one guest → tap the top-right corner five times, enter the PIN,
  **Reset session**.
- Generations failing → check the Sessions table; the error is recorded per
  session. A FAL outage shows as repeated failures across every guest.
- Slow generations → drop resolution to 1K in the Generation tab. Takes effect
  on the next guest, no redeploy.

---

## Environment variable reference

| Variable | Required | What it does |
|---|---|---|
| `FAL_KEY` | for real generation | Your fal.ai API key. Never sent to the browser. |
| `FAL_MOCK` | no | `1` uses the local mock generator. Leave unset in production. |
| `APP_URL` | in production | Absolute origin the QR code points at. |
| `ATTENDANT_PIN` | no | Kiosk staff menu PIN. Defaults to `1234` — change it. |
| `FIREBASE_PROJECT_ID` | in production | From the service account JSON. |
| `FIREBASE_CLIENT_EMAIL` | in production | From the service account JSON. |
| `FIREBASE_PRIVATE_KEY` | in production | From the service account JSON, `\n` escaped, quoted. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | in production | Web config. Not a secret. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | in production | Web config. Not a secret. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | in production | Web config. Not a secret. |
| `ADMIN_EMAILS` | in production | Comma-separated allowlist for `/admin`. Empty locks everyone out. |
| `CRON_SECRET` | recommended | Required bearer token for `/api/cron/purge`. |

---

## Data and PDPA

- **Photos** live in FAL storage with a 30-day expiry applied at upload.
- **Names, emails and consent records** live in Firestore.
- **Consent** is stored as the exact text shown, plus its version and timestamp
  — not just a "yes". Bump the version whenever you change the wording so older
  records stay tied to what those guests actually agreed to.
- **Retention** is per-preset. A nightly job redacts personal data past the
  window, keeping the consent trail so an audit can see that someone consented
  and that their data was later purged.
- **Guests can delete their own data** from the result page, without contacting
  anyone.

The default consent text references Malaysia's PDPA 2010. **Have someone
qualified review it against how you actually use the data** — it is a starting
point, not legal advice.

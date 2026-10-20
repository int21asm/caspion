# Kaspion Web handoff

## Goal and user decisions

Build a website based on **israeli-bank-scrapers** and **כספיון (Caspion)** that
connects Israeli bank and credit-card accounts, scrapes and saves financial data,
and presents everything in one dashboard. Include a configuration page and a popup
when a supported bank requires an MFA code. Recommend storage and authentication.

The user chose **multiple users**, private data per account, and a **Hebrew RTL
interface**. Sites tools were unavailable in the original chat. The user chose to
continue without Sites and authorized publishing the source to a GitHub branch
for local access and continued development in Codex CLI.

## Repository and layout

- Repository: `https://github.com/int21asm/caspion`
- Branch: `codex/kaspion-web`
- Initial web implementation commit: `465c0890c6b750aa6e5a035c255610d7b1e0a59b`
- Web app: `kaspion-web/`
- Existing Electron app: repository root and `packages/`
- Pinned scraper source: `kaspion-web/vendor/israeli-bank-scrapers/`
- Scraper origin: `https://github.com/int21asm/israeli-bank-scrapers`, commit
  `5170a65ffaf8df2d22f32b0fa1656350a8337590`; MIT license retained.

One clone contains the web demo and scraper source. No second repository or
original cloud workspace is needed. Electron application source was not changed;
root `.eslintignore` and `.prettierignore` isolate the standalone web app and pinned
vendor source from Electron's tooling.

## Completed work

- Responsive Hebrew RTL React/Vite UI with dashboard, six-month cash flow,
  balances, income/expenses, and category totals. Dashboard totals include ILS;
  other currencies are displayed separately.
- Transaction search, account/category/direction filters, pagination, and filtered
  CSV download.
- Configuration page for lookback days and installment handling; provider-specific
  bank/card connection forms from scraper metadata.
- Express API with SQLite persistence and owner-scoped connections, accounts,
  transactions, preferences, and sync history.
- Local registration/login with scrypt hashes, HttpOnly sessions, logout revocation,
  same-origin write checks, and rate limits.
- Optional AES-256-GCM encryption of remembered bank credentials. Default behavior
  uses credentials for one run without persisting them.
- In-process sync queue, progress, cancellation, timeouts, atomic imports, and
  deduplication. Two concurrent jobs, up to ten queued, five-minute run limit.
- Owner-checked MFA challenges with two-minute expiry and replay rejection. The
  current library exposes the callback for **ONE ZERO**; other providers do not
  automatically gain popup MFA support.
- Separate synthetic demo accounts and an explicit simulated MFA flow. The demo
  does not contact banks.
- Cross-platform `start-demo.mjs`, pinned dependencies/source, setup docs, and a
  production architecture recommendation.
- Source pushed to GitHub without local data, keys, sessions, bank credentials,
  installed dependencies, or generated build outputs.

## Validation and current state

The exported branch layout was installed and launched successfully in the Linux
cloud environment. The pinned scraper and web builds passed.

- **Eight API tests passed:** auth/logout, CSRF, user isolation, encryption and
  credential non-disclosure, MFA ownership/expiry/replay, cancellation, persistence,
  deduplication, and safe bank-failure handling.
- **Browser checks passed:** dashboard, saved preferences, connection creation,
  MFA resumption/import, filters/CSV, mobile navigation, registration, and login.
- Vendored scraper files matched their pinned source exactly after commit hooks.
- The launcher supports Windows command invocation, but Windows/macOS execution
  was not independently validated during this session.

Tests used synthetic data or an injected adapter. **No live bank login was tested.**
There is no public hosted website URL. Cloud processes and workspace/artifact links
from the old chat must not be assumed to work on a new machine. The code is now
available through GitHub; do not rebuild from scratch merely to transfer the work.

## Setup commands

Prerequisites: Git, **Node.js 22.22.2 or newer**, and npm internet access.

### Clone and launch

```bash
git clone --branch codex/kaspion-web --single-branch https://github.com/int21asm/caspion.git caspion-web-demo
cd caspion-web-demo/kaspion-web
node start-demo.mjs
```

The launcher installs/builds the scraper, installs/builds the web app, then starts
it at **http://localhost:3002** on the same computer. Keep the terminal open; Ctrl+C
stops it. It binds to localhost and explicitly disables live scraping. Dependencies
are installed on each launcher run. No Electron, keyring, virtual display, or
Chromium installation is required for the web demo itself.

Choose **כניסה להדגמה עם נתונים לדוגמה**. To try MFA, open **חשבונות וכרטיסים**,
sync **חשבון משותף · הדגמת אימות**, and enter `123456`. The synthetic adapter
accepts any 4–10 digit code and does not validate it with a bank.

After initial setup, start the existing build without reinstalling:

```bash
# From kaspion-web/
npm start
```

For hot reload on macOS/Linux:

```bash
# From kaspion-web/
npm run dev
```

PowerShell equivalent:

```powershell
# From kaspion-web/
$env:NODE_ENV = "development"
node --env-file-if-exists=.env --watch server/index.js
```

### Run checks

```bash
# From kaspion-web/, after initial setup
npm test
npm run build

# With the server running on port 3002, in another terminal:
npm run test:browser
```

Browser checks need Chromium/Chrome. The test defaults to `/usr/bin/chromium`;
set `CHROMIUM_PATH` to an installed executable elsewhere. `TEST_URL` can override
the default URL. Screenshots go to ignored `test-results/`. API tests use temporary
databases.

### Continue in Codex CLI

In another terminal in `kaspion-web/`:

```bash
npm install -g @openai/codex
codex
```

Sign in with ChatGPT when prompted and paste:

> Read ../HANDOFF.md, README.md, and ARCHITECTURE.md. Continue the multi-user Hebrew
> Kaspion Web project. First help me run the existing demo and inspect the current
> files and tests. Work in the kaspion-web subproject, preserve user data, and keep
> live scraping disabled until I explicitly request an authorized bank test.

The original chat does not automatically transfer. To resume the resulting local
CLI session later:

```bash
codex resume --last
```

## Remaining tasks, in suggested order

1. **Run on the user's computer.** Verify installation, local browser access,
   account setup, and simulated MFA. Resolve platform-specific launcher issues.
2. **Implement production storage and auth.** Recommended: Supabase Postgres with
   per-user RLS and ownership constraints, plus Supabase Auth with verified email
   OTP/magic link or Google sign-in, recovery, and optional TOTP. These are
   recommendations, not connected services. Local auth has no email verification,
   password reset, or application-login MFA.
3. **Separate and persist scraping jobs.** Use a private Node/Chromium container
   and BullMQ/Redis with tenant limits, authenticated short-lived MFA handoff, and
   interrupt/retry handling. Persisting a queue record cannot restore a crashed
   Chromium session.
4. **Secure retained credentials for production.** Use KMS/Secret Manager and
   envelope encryption, with keys outside the database. Keep remembering optional;
   never put OTPs in durable storage, traces, or logs.
5. **Validate real providers using authorized accounts.** Configure Chromium and
   bank-domain egress; verify login, errors, MFA timeout, cancellation, and repeated
   imports. Add provider-specific MFA adapters where needed. Synthetic demo success
   does not prove live bank access.
6. **Deploy a real hosted URL.** Configure HTTPS, exact origin, secure cookies,
   known proxy trust, private worker access, monitoring, encrypted backups and
   restore checks, retention, export, and account deletion. No hosting service or
   infrastructure has been provisioned.
7. **Improve scale and product behavior.** Move SQL filtering, aggregates, and
   cursor pagination to Postgres; refine pending/completed reconciliation,
   categories, currency minor units, and demo-user expiry. Recurring sync and
   Google Sheets/YNAB exports are possible future additions, not completed features
   or requirements for the local demo.

## Boundaries to preserve

- The launcher forces `ENABLE_LIVE_SCRAPING=false`; the server also defaults to
  disabled. Do not silently enable live bank access during setup.
- Local data is `kaspion-web/.data/finance.sqlite`, with a development encryption
  key in `.data/credential.key`. These are ignored and absent from GitHub. Financial
  tables are not encrypted by the app; key and database on one disk are development
  storage, not a production vault.
- Preserve user data. Never commit `.data/`, `.env`, real credentials, private keys,
  cookies, sensitive screenshots, or browser profiles.
- Bank-login MFA and application-login MFA are separate concerns.
- Queue state is in memory. Restart interrupts active jobs; committed transactions
  survive. Use one server process with the current SQLite implementation.
- The UI fetches at most 10,000 latest transactions and warns about truncation.
  Cross-provider transfers are not reconciled. Categories use text heuristics.
  Amounts use integer hundredths; general currency minor-unit support and FX
  conversion are not implemented.
- Production startup requires `NODE_ENV=production`, an HTTPS `APP_ORIGIN`, and a
  securely injected base64 32-byte `CREDENTIAL_KEY`. Those checks alone do not make
  the local MVP production-ready.
- Keep the pinned vendor source and MIT attribution. Use ordinary install/build
  commands, not the library's `prepare:*`/`reset` scripts, which contain Git resets.

## Key files

- [Web README](kaspion-web/README.md): setup, configuration, features, and limits.
- [Architecture](kaspion-web/ARCHITECTURE.md): production database/auth and worker plan.
- [Launcher](kaspion-web/start-demo.mjs).
- [Frontend](kaspion-web/src/main.jsx) and [styles](kaspion-web/src/style.css).
- [API/auth](kaspion-web/server/app.js), [storage/imports](kaspion-web/server/store.js),
  [jobs/MFA](kaspion-web/server/jobs.js), and [scraper adapter](kaspion-web/server/providers.js).
- [API tests](kaspion-web/tests/api.test.js) and [browser checks](kaspion-web/tests/browser.mjs).
- [Vendor provenance](kaspion-web/vendor/README.md).

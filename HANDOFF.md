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

- Removed the static "המרחב האישי שלי" sidebar badge after the user mistook
  its decorative chevron for a workspace selector. The real profile/logout
  controls remain at the bottom of the sidebar; navigation and mobile browser
  checks pass.
- Added a dashboard banner for the latest successful connection sync. It shows
  elapsed time, connection/provider, and exact Jerusalem date/time, updates
  every 30 seconds, and distinguishes accounts with no successful sync.
  Failed syncs continue to appear separately. Synthetic browser checks cover
  a recent sync and the empty state.
- The full Transactions page now has separate bank and card tabs, defaulting to
  bank. The card tab filters by synced billing month or next payment, uses the
  processed/billing date for its date column and CSV, and excludes pending or
  undated card rows from a selected billing month. The dashboard's compact
  recent-card panel still sorts and labels by transaction date. Browser checks
  verify November excludes December installments even when purchase dates match.
  Future installments inferred from a synced installment series now appear in
  the selected card billing month with "צפוי · אומדן" status, estimated date,
  and payment number; actual synced rows replace their projections. The user's
  Cal 5-payment purchase has 1/5 through 3/5 saved for November-January, so
  February displays projected 4/5, March 5/5, and April none. No database
  changes or extra bank sync were needed for this UI fix.

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

### Current local mode — live connections enabled on 2026-10-20

On 2026-10-21, the user's Isracard connection had two failed syncs and no
imported account. The scraper returned `CHANGE_PASSWORD` both times. The app
now shows the latest failed sync prominently on every page and on the affected
connection card, with a specific Isracard explanation and retry path; old stored
generic errors are translated on display. A scraper response marked successful
but containing no accounts now fails explicitly instead of recording a misleading
completed sync. API and synthetic Chrome regressions pass. The user's login was
not retried and their stored financial data was not changed.

The dashboard's תזרים panel lets the user select any of the next 24 months,
defaulting to next month. The main value is monthly net cash flow: one configured
salary minus one last-observed mortgage payment minus that month's card amount.
The current bank balance and other months are excluded. Dated card charges are
used in their billing month. For later selected months, only future charges
returned by the scraper and remaining known installment payments are counted;
the previous full card bill is never copied forward. No manual card entry is
needed or shown. If a card bill is incomplete or a connection failed, the
result is marked partial.
Other variable expenses are excluded. A Node regression uses the user's
income, mortgage, bank balance, and known November Cal charge to verify
November, December, and January without bank-balance carry; the synthetic
browser suite verifies the same selection and automatic card estimates.

On 2026-10-21, the repeated-full-card-bill fallback was removed after the user
reported that every selected month showed the same amount. The Cal adapter now
requests three future billing months, and imports each transaction's processed
date and installment group/number/total. A completed Cal sync refreshed the
user's two saved cards without exposing credentials. The saved data now has a
dated November full bill and smaller known installment charges in December and
January; the latter remain partial because later purchases cannot be known.
Beyond known scheduled charges, the panel shows an unknown card amount and no
net forecast instead of copying the previous bill. API, real-number forecast,
and synthetic Chromium checks passed. The local live site is running on port
3002 with the new build.

The user explicitly requested that all dashboard summary panels exclude credit
cards after noticing inflated expenses. Income, expenses, net flow, the six-month
cashflow chart, and spending-category totals now use bank-provider transactions
only. Their hints/subtitles state the bank scope. Card purchases/refunds remain
in the separate recent-card panel and filterable transactions view. Bank statement
debits, including settled card bills, still count as bank expenses. A zero-bank-
expense edge case was also fixed so it displays zero rather than negative zero.
Browser regressions cover mixed bank/card purchases/refunds, foreign currency,
all summary values/charts/counts, and a card-only dataset; stored data was unchanged.

The user requested a monthly net-flow bar in "איך הכסף זז?". The six-month
bank cash-flow chart now includes a third bar per month for income minus expenses,
green above zero and red below. Its axis and zero baseline cover negative values,
and tooltips include net flow. Production build and diff checks passed.

The dashboard originally had a "תזרים" forecast for the end of the next calendar month:
latest complete ILS bank balances + the user's fixed monthly net income setting
- last full month's Mizrahi mortgage debits matching "טפחות - לווים"
- the card charges dated for that next month when every connected ILS card has
a dated next charge. The historical-bank-card-payment fallback described here
was removed after it produced misleading future-month estimates; see the current
behavior above. It requires all ILS bank balances, an income setting,
a mortgage match, and a known card amount; otherwise it explains which input is
missing. Both mortgage and card lines name the forecast month, with their data
sources shown below. The excluded variable expenses are stated in the panel.
Settings API supports monthlyIncome in integer agorot, defaulting to zero for old
users, and nullable monthlyCardEstimate in agorot, defaulting to null. After a
consistent ignored database backup, the saved Cal connection was
refreshed through the normal job pipeline: both cards returned November debit
dates and amounts, with no values printed. Synthetic browser checks verify
dated charges, a manual estimate, and missing-month behavior. The local live
server was restarted.

The featured balance incorrectly included credit-card balances after the user
connected Cal. Its calculation, coverage warning, and account count now include
only ILS accounts whose provider metadata identifies them as banks. The title is
explicitly "יתרה בחשבונות הבנק". Credit-card balances remain on their own connection
cards. The stored bank balance was confirmed unchanged with one bank account;
no data migration or new bank sync was needed. Production build and browser
regressions verify card-debt exclusion, genuine zero, multiple bank balances, and
missing bank balances despite available card balances.

The user asked for the upcoming credit-card debit amount. Visa Cal's scraper
exposes the next debit through its account balance and billing-date fields, so
the live adapter stores those separately as next_charge and
next_charge_date; connection cards show the amount from an existing Cal balance
immediately and include the debit date when available. Other card providers expose a balance without a dependable
next-debit amount, so they do not show a guessed upcoming charge. Existing
account rows are migrated in place on server startup.

The dashboard's mixed recent-transactions table was split into stacked bank and
credit-card panels. Each uses provider metadata to show its own five latest rows,
count, and empty state. Each view-all link opens the transactions page scoped to
that source. The full page now has bank/card tabs, with bank selected from the
main navigation; card billing-month filtering is described above. Production frontend build
and the complete synthetic Chrome suite passed, including source separation,
view-all scoping, and mobile overflow checks. Desktop/mobile screenshots were
inspected. No stored financial data was changed; reload the running site to see it.

After a new Cal card sync the user reported a white screen. The card's transactions
used `₪` instead of `ILS`; passing this to `Intl.NumberFormat` caused an uncaught
RangeError and unmounted React. Reproduced with an isolated synthetic browser
fixture, then fixed in `shared/currency.js`: known shekel aliases normalize to
ILS, API data normalizes currencies on read so existing rows work immediately,
and money formatting displays unknown units safely without guessing an ILS value.
Stored financial rows and fingerprints were not rewritten. Both the dashboard and
transactions-page regressions passed; the exact reproduction now has no errors
and stays visible. Build, all 17 Node tests, and the full Chrome suite passed.
No bank login was needed. The local live-enabled server was restarted afterward.

The user then supplied screenshots of Mizrahi's current-balance header and ledger
and requested balance scraping. Added `server/mizrahi-balance.js`, installed by the
provider adapter, without changing the pinned vendor source. It captures the
account's header balance before pending-transaction navigation; if unavailable it
reads the latest dated balance column from same-bank transaction tables/iframes.
Usable API balances retain priority. The parser handles grouping, RTL markers,
negative and zero balances; ambiguous ledger order and missing values stay unknown.
The header selector is tied to the exact current-account label to exclude the
nearby credit limit. Capture state is scoped to each account.

After a consistent backup under ignored `.data/backups/before-balance-fallback-*`,
a normal job refreshed the user's saved Mizrahi connection successfully. Its
balance was saved and matched the screenshot, with zero new transactions and 194
existing transactions preserved. The website was restarted in live mode. All 14
Node tests and the full synthetic Chrome suite passed, including header priority,
zero/negative balances, iframe fallback and credit-limit exclusion. The adapter
wraps two internal methods of the pinned scraper; revalidate it on vendor updates.

The user subsequently synced Mizrahi and reported zero dashboard panels. The
initial imported rows had no current-month credits, but that did not establish
completeness. Investigation confirmed a UTC calendar bug: Israeli midnight on
October 1 became September 30 in storage. The importer now uses Asia/Jerusalem
dates, keeps original timestamps in a new nullable `source_date` column, and
corrects dates when matching transactions are reimported. Legacy identifier-less
Mizrahi fingerprints are re-keyed on resync without duplicating identical purchases.
The dashboard's date range and month keys also use the Israeli calendar.

Using the user's previously saved login, a read-only bank diagnostic returned
credits for October. The web server was then stopped, a consistent SQLite backup
was saved under ignored `.data/backups/before-calendar-fix-*.sqlite`, and the same
connection was refreshed through the normal job/import pipeline in one process.
The refresh completed: 194 stored transactions match the returned transaction
count, including two credits dated October 1; all 43 old rows matched, 151 additional
rows were imported, and no legacy timestamp rows remain for this connection.
The user mentioned an incoming transaction dated October 10; that specific entry
was not present in the fresh response and remains unverified. Do not claim it was
recovered. The live-enabled local website was restarted afterward.

Mizrahi's response had empty `body.fields`, so the scraper's expected `Yitra`
balance was unavailable. The dashboard shows missing balances as `—`, labels
partial totals, counts only ILS balances, and explains periods without income.
Do not fabricate a balance from transaction totals. Build, all 10 API tests, and
the full synthetic browser suite passed, including missing/partial/zero/foreign
balance cases and October 1 income at midnight in Israel. Bank payloads,
credentials, descriptions, and amounts were not logged or committed.

After reporting the disabled-scraping error, the user requested that the local
website be made fully functional. Live scraping is now explicitly authorized for
the local website. The server was restarted in live mode at
`http://localhost:3002`, using the existing SQLite database and installed Chrome.
No bank credentials were supplied to the agent and no actual bank login was run.

- Ignored `.env` configures localhost binding, live scraping, the installed Mac
  Chrome executable, and its enabled browser sandbox. Existing data was preserved.
- New `npm run start:live` explicitly enables live mode on localhost and detects
  installed Chrome/Chromium. On this Mac, run it from `kaspion-web/` with
  `PATH=/opt/homebrew/bin:$PATH npm run start:live`.
- The demo launcher still forces live scraping off. Use `start:live`, not
  `start-demo.mjs`, to restart with real bank connections.
- All eight API tests passed again. The complete Chrome browser suite passed in
  live-enabled mode, including new personal-account connection and credential-form
  checks that assert no bank job was submitted. The scraper's own Puppeteer also
  launched Chrome successfully with its browser sandbox enabled on a local data
  page. Demo syncs remain synthetic even while live mode is enabled.
- Reload an existing browser tab to refresh its cached `liveEnabled` capability.
  Use a personal application login, add a connection, and press sync to enter bank
  credentials privately in the website. End-to-end live provider compatibility
  still needs the user's authorized bank login; do not infer it from these checks.

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

The original export's tests used synthetic data or an injected adapter. No live
bank login was tested at export; subsequent local Mizrahi verification is recorded above.
There is no public hosted website URL. Cloud processes and workspace/artifact links
from the old chat must not be assumed to work on a new machine. The code is now
available through GitHub; do not rebuild from scratch merely to transfer the work.

### Local macOS verification — 2026-10-20

- Installed dependencies and ran the unchanged demo launcher successfully on this
  Mac using `/opt/homebrew/bin/node` (v26.7.0). The shell's default NVM Node is
  v22.20.0, which is below the required version; use the compatible Homebrew
  runtime explicitly or update the selected NVM version.
- Scraper lint/format/type/JavaScript builds and the web production build passed.
  All eight API tests and the complete Chrome browser suite passed. Desktop and
  mobile screenshots were inspected in ignored `kaspion-web/test-results/`.
- Browser checks covered settings persistence, connection creation, simulated
  MFA/import, filtering/CSV, mobile navigation, registration, logout, and login.
  Checks created synthetic users in the new ignored local database. No existing
  user database was present, and no live bank login was attempted.
- The launcher bound to `127.0.0.1:3002` with live scraping explicitly disabled.
  To restart the existing build on this Mac, from `kaspion-web/`:

  ```bash
  PATH=/opt/homebrew/bin:$PATH ENABLE_LIVE_SCRAPING=false NODE_ENV=demo HOST=127.0.0.1 PORT=3002 APP_ORIGIN=http://localhost:3002 npm start
  ```

- To repeat browser checks with this Mac's installed Chrome:

  ```bash
  PATH=/opt/homebrew/bin:$PATH CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:browser
  ```

- In the Codex sandbox, package downloads, temporary test-server sockets, and
  Chrome launch required approved execution outside the sandbox. The checks
  passed there; initial sandbox errors were environment restrictions.

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

1. **Local macOS verification completed.** Installation, local browser access,
   account setup, and simulated MFA passed on 2026-10-20. See the runtime and
   restart notes above. Windows execution remains unverified.
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


## Manual ChatGPT card categorization — 2026-10-22

Implemented in standalone Shklops repo `/private/tmp/caspion-web-standalone`, commit
`773ef6d`, and copied/built into local `kaspion-web`. Live server on port 3002
was restarted (session 83239). In Transactions → card tab, the categorization
button explicitly starts a job; default processes only new/changed descriptions,
with a checkbox to reclassify all. Only merchant descriptions and temporary IDs
are sent through existing per-user ChatGPT OAuth. SQLite stores category source,
model, timestamp, and description snapshot; sync preserves classifications.
Owner/selected-card scoping, strict output validation, batching, safe errors,
and partial progress recovery are covered by tests. No real user transactions
were classified automatically. All 38 tests, production build, Chromium browser
suite, and real OpenAI synthetic-merchant classification passed.


## Dashboard card categories — 2026-10-22

The spending donut now uses selected-period completed ILS card debits by billing
date (purchase date fallback), through today. It displays saved ChatGPT categories,
with unclassified or changed descriptions under an explicit awaiting-classification
label. Bank totals and bank cashflow remain scoped to bank transactions. Top four
categories plus other are retained. Browser regressions cover category amounts,
period changes, future/pending/refund/foreign-currency exclusions, and empty state.
Full browser suite and production builds passed. Local dist was rebuilt; live
server session 83239 did not require a restart.


## Web-assisted merchant categorization — 2026-10-22

Shklops commit `a23b097` adds a stronger versioned prompt in
`server/category-prompt.js`, electronics/computers and transfer/cash categories,
and a two-pass classifier. Initial batch identifies known merchants; uncertain
public merchants require individual Responses web_search calls. Private-person
and transfer recipients are excluded by prompt, explicit BIT/PayBox/transfer/cash
descriptions also skip search in code. Only names and temporary ids are sent.
Results store explanation, self-assessed confidence, verified source URLs, web
lookup flag and prompt version. Research without sources or low confidence stays
general. No silently claimed successful lookup. New manual general-only retry
button, research progress, and expandable category evidence with links.
Existing results remain until a manual refresh. 41 tests, full Chromium suite,
production build, and real OAuth samples passed: Bug electronics, Amazon shopping,
BIT transfer (no web), Panda researched but remained ambiguous. Local files copied
and built; live server restarted at port 3002, session 7955. Temporary probes
removed; no real transaction classifications were changed during testing.


## Recurring payments panel and saved Sankey idea — 2026-10-22

Commit `96ec64a` in standalone Shklops adds dashboard **מנויים וחיובים חוזרים**
under the forecast. Local detection (`shared/recurring.js`) uses full loaded
history and selected accounts; recognizes monthly/every-two-month/annual
services with evidence, next-date estimates, latest-amount monthly equivalents,
variable-price evidence, separate currency totals, candidates and overdue/inactive
patterns. It excludes installments, projections, refunds/pending/future rows,
transfers/loans/mortgages and bank card settlements. No automatic AI call and no
new forecast input or duplicate expense counting. Annual detection requires two
charges about a year apart, not a guess from a single insurance debit. Settings
can request up to 730 days; provider history availability varies. Existing user
sync preferences were not changed or any bank sync triggered.

Sankey diagram deferred at user's request; requirements saved in
`docs/ROADMAP.md` and README links it. 47 tests plus full Chromium desktop/mobile
suite and production builds passed. Real data read-only audit recognized FreeTV,
insurance, phone and utility renewals; insurance installments were excluded.

The user's concurrent full web-assisted categorization refresh was allowed to
finish before restart: 401/401 merchants, 1042 transactions, 97 web research
passes, no errors. Then copied 9 feature files locally, rebuilt, and restarted
live server at port 3002, session 39818. Source pushed to main.


## All-category interactive spending donut — 2026-10-22

Commit `074e739` removes the top-four/other aggregation. Every saved category
now has its own SVG arc and full legend entry, with stable category colors.
Hover, keyboard focus or tap shows category name, accurate percentage and amount;
hidden-money mode hides the tooltip amount. Very small shares use <0.1% and can
be reached via the legend or keyboard. Actual arc geometry gives correct hit
testing; a single 100% category is rendered as a full ring. Totals and transaction
scope are unchanged. Full Chromium suite verifies 11 categories, segment totals,
real pointer positions on distinct arcs, tiny shares, keyboard/Escape, mobile
legend taps and hidden-money behavior; desktop/mobile screenshots inspected.
Production builds passed. Four files copied locally and dist rebuilt; live
server session 39818 remains running, no restart needed. Source pushed to main.


## Billing-month comparison and filtered card totals — 2026-10-22

User reported transport chart 4231 NIS versus much less in activity; clarified
activity selected **החיוב הבא · נובמבר 2026**. Read-only normalized data audit
verified October billing transport: 16 charges / 4231.93 NIS; November: five
charges / 221.39 NIS. October first page alone (10 rows) is 2182.13 NIS. There
was no arithmetic discrepancy: different selected billing months plus pagination.

Commit `d522497` puts exact month/date range on the spending chart and adds an
all-pages filtered summary to full card activity, with billing month/category and
separate currency totals for synced debits, credits, pending debits and projected
installments. No date selection or accounting math changed. Full Chromium suite
passed including realistic 4231.93 vs 221.39, 16 rows across two pages, and
projected installments kept outside synced debit totals. Production builds and
visual QA passed. Four files copied locally and dist rebuilt; live server
session 39818 remains running without restart.


## Category hover transaction breakdown — 2026-10-22

Commit `e53614a` opens a contributing-transactions list below the spending chart
when a segment or legend entry is hovered, focused or tapped. It uses the exact
rows and category mapping used by the slice; shows merchant, billing/purchase
dates, provider/card suffix, installment details, count and matching total.
Details remain open when moving into the list so it can be read/scrolled, and
switch on another category. Close button, center click or Escape on a category
control clears selection; changing period clears it too. Amount masking applies
to list and total. Full Chromium suite passed, including real-number 16 October
transport charges adding to 4231.93 NIS, no November rows, hover persistence,
category switching, period reset, privacy and mobile taps. Desktop/mobile
screenshots visually checked. Production builds passed; 4 files copied locally
and dist rebuilt. Live server remains session 39818; no restart needed.


## Monthly Sankey money-flow diagram — 2026-10-23

Commit `efa4da8` in standalone Shklops implements the saved diagram as the
full-width dashboard panel **לאן הכסף זורם?**, between the existing charts and
forecast. It has an independent month selector (current month by default),
actual bank credits/debits, period surplus or a clearly labeled calculated
deficit, and saved card categories explaining matched settlements. It uses
selected accounts, completed ILS transactions through today, and integer minor
units. No opening bank balance, configured forecast salary or future expenses
are inserted; no AI call or bank sync is triggered by viewing it.

`shared/money-flow.js` performs reconciliation and proportional SVG layout.
Card detail matches require the same issuer, exact net amount, a billing date
within four days of posting, a unique candidate and no reuse of bills. One
issuer's selected cards on the same date can match a combined bank debit.
Ambiguous/missing/mismatched detail stays **פירוט כרטיסים שלא הותאם** and remains
included in bank expenses exactly once. Refunds reduce their own categories;
negative-category matches stay unallocated. This conservative diagram can
have unmatched amounts even when the independent spending donut has details.
Bank credits may include transfers; period surplus is not current balance or
verified savings, and deficit does not claim a particular funding source.

`src/MoneyFlow.jsx` renders right-to-left ribbons, shared stable category colors,
summary totals, hover/focus/tap percentages and persistent contributing-row
lists, match evidence/reasons, close/Escape/month reset, and masked amounts.
Mobile scrolls within the diagram without document overflow. Existing donut
accounting and forecast math are unchanged. README and roadmap document scope.

54 unit/API tests passed, including seven reconciliation/layout tests using
19000 income, 6667.30 mortgage and 12761.07 card payment => 428.37 deficit.
Full Chromium suite plus dedicated Sankey browser checks passed: month changes,
exact bank totals, no double counting, category details, mismatch handling,
privacy, empty state and mobile scrolling. Desktop/mobile screenshots inspected;
production builds passed. A read-only audit of real September/October data
confirmed balanced graphs with both matched and explicit unmatched settlements.
`npm run test:browser` now runs both browser suites.

Copied ten source/docs/test files into local `kaspion-web` and rebuilt dist.
Live server session 39818 remains running without restart. HTTP check confirms
port 3002 serves the new `index-fsjbA9-h.js` bundle. Isolated test server on port
3003 stopped. Commit pushed to `int21asm/shklops` main; standalone tree clean.

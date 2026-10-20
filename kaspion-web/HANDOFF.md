# Continue this project with Codex CLI

This branch adds `kaspion-web/` as a standalone web app beside the existing
Electron application. The web app uses the pinned MIT scraper source under
`kaspion-web/vendor/israeli-bank-scrapers/`. The existing Electron application
has not been changed.

Run `node start-demo.mjs` inside `kaspion-web/` with Node 22.22.2 or newer to
install, build, and launch the demo on port 3002. It binds only to localhost,
keeps live scraping disabled, and uses synthetic data. No Electron dependencies,
desktop keyring, or virtual display are needed for the web demo.

Implemented: Hebrew RTL React/Vite UI; Express API; SQLite data; registration
and scrypt login; private user sessions; account connections; dashboard and
transaction filters; CSV export; sync settings; bounded jobs; cancellation;
credential encryption; deduplicated imports; and ONE ZERO MFA callbacks.

The browser demo simulates MFA, rather than contacting a real bank. Production
Supabase Auth/Postgres, KMS, durable worker jobs, deployment, and real bank login
validation have not been completed. Read README.md and ARCHITECTURE.md before
enabling live scraping. Never commit `.data/`, a private key, `.env`, cookies,
bank credentials, or generated browser profiles.

Checks: `npm test`, `npm run build`, and `npm run test:browser` (with a running
server on port 3002 and Chromium available). API tests use temporary databases.
Browser tests use separate demo/fixture accounts. The current implementation
has eight API tests and browser checks covering the demo, preferences, account
creation, MFA continuation, filters, CSV, mobile layout, and login.

Suggested first prompt:

> Read HANDOFF.md, README.md and ARCHITECTURE.md. Help me run this app locally.
> Inspect existing files and test results before changing code. Preserve user
> data and leave live scraping disabled until I explicitly request an authorized
> bank test. Work in the kaspion-web subproject; the root project is Electron.

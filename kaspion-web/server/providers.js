import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const library = require("israeli-bank-scrapers");
export const { createScraper, SCRAPERS } = library;
const names = {
  hapoalim: "בנק הפועלים",
  leumi: "בנק לאומי",
  discount: "בנק דיסקונט",
  mercantile: "מרכנתיל",
  mizrahi: "מזרחי טפחות",
  beinleumi: "הבינלאומי",
  otsarHahayal: "אוצר החייל",
  massad: "בנק מסד",
  yahav: "בנק יהב",
  union: "בנק אגוד",
  pagi: "פאג״י",
  oneZero: "ONE ZERO",
  max: "max",
  visaCal: "כאל",
  isracard: "ישראכרט",
  amex: "American Express",
  behatsdaa: "בהצדעה",
  beyahadBishvilha: "ביחד בשבילך",
};
export const providers = Object.entries(SCRAPERS).map(([id, value]) => ({
  id,
  name: names[id] || value.name,
  fields: value.loginFields.filter(
    (f) => !["otpCodeRetriever", "otpLongTermToken"].includes(f),
  ),
  kind: ["max", "visaCal", "isracard", "amex"].includes(id) ? "card" : "bank",
  mfa: id === "oneZero",
}));
export const providerById = Object.fromEntries(providers.map((p) => [p.id, p]));

export async function liveScrape({
  connection,
  credentials,
  settings,
  requestMfa,
  signal,
  progress,
}) {
  let browser;
  try {
    const options = {
      companyId: connection.provider,
      startDate: new Date(Date.now() - settings.daysBack * 86400000),
      combineInstallments: settings.combineInstallments,
      timeout: 45000,
      verbose: false,
    };
    // ONE ZERO uses HTTP APIs. Other providers use a browser that we own and
    // close on cancellation/timeouts as well as normal completion.
    if (connection.provider !== "oneZero") {
      const puppeteer = require("israeli-bank-scrapers/node_modules/puppeteer");
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
        args: process.env.CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
      });
      if (signal.aborted) throw new Error("cancelled");
      options.browser = browser;
    }
    const stop = () => {
      browser?.close().catch(() => {});
    };
    signal.addEventListener("abort", stop, { once: true });
    try {
      const scraper = createScraper(options);
      scraper.onProgress((_, payload) => progress(payload.type));
      const input = { ...credentials };
      if (connection.provider === "oneZero")
        input.otpCodeRetriever = requestMfa;
      return await scraper.scrape(input);
    } finally {
      signal.removeEventListener("abort", stop);
    }
  } finally {
    await browser?.close().catch(() => {});
  }
}

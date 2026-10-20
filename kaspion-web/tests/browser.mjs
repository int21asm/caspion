import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const url = process.env.TEST_URL || "http://localhost:3002";
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  await page
    .getByRole("button", { name: "כניסה להדגמה עם נתונים לדוגמה" })
    .click();
  await page.getByRole("heading", { name: "הכסף שלכם, בתמונה אחת." }).waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 5,
  );
  await page.waitForTimeout(750);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  console.log("PASS: Hebrew dashboard, persisted demo data and charts");

  await page.locator("nav").getByRole("button", { name: "הגדרות" }).click();
  await page.getByLabel("טווח סנכרון").selectOption("30");
  await page.getByRole("switch", { name: "איחוד עסקאות בתשלומים" }).click();
  await page.getByRole("button", { name: "שמירת שינויים" }).click();
  await page.getByRole("status").filter({ hasText: "ההעדפות נשמרו" }).waitFor();
  await page.reload();
  await page.locator("nav").getByRole("button", { name: "הגדרות" }).click();
  assert.equal(await page.getByLabel("טווח סנכרון").inputValue(), "30");
  assert.equal(
    await page.getByRole("switch").getAttribute("aria-checked"),
    "true",
  );
  await page.screenshot({
    path: "test-results/settings-desktop.png",
    fullPage: true,
  });
  console.log(
    "PASS: sync preferences persist through reload and session restoration",
  );

  await page
    .locator("nav")
    .getByRole("button", { name: /חשבונות וכרטיסים/ })
    .click();
  await page
    .getByRole("button", { name: "חיבור חשבון חדש", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("בנק או חברת אשראי").selectOption("leumi");
  await dialog.getByLabel("שם החיבור").fill("חשבון נוסף לבדיקה");
  await dialog.getByRole("button", { name: "הוספת חשבון" }).click();
  await page.getByText("חשבון נוסף לבדיקה", { exact: true }).waitFor();
  console.log("PASS: connection creation");

  await page
    .getByRole("button", {
      name: "סנכרון חשבון משותף · הדגמת אימות",
      exact: true,
    })
    .click();
  await page.getByRole("heading", { name: "רק מוודאים שזה אתם" }).waitFor();
  const mfa = page.getByRole("dialog");
  await page.screenshot({
    path: "test-results/mfa-desktop.png",
    fullPage: true,
  });
  await mfa.getByLabel("קוד אימות חד־פעמי").fill("123456");
  await mfa.getByRole("button", { name: "אימות והמשך סנכרון" }).click();
  await mfa.waitFor({ state: "detached" });
  await page.waitForFunction(async () => {
    const j = await (await fetch("/api/jobs")).json();
    return j.some((x) => x.status === "completed");
  });
  const data = await page.evaluate(
    async () => await (await fetch("/api/data")).json(),
  );
  const oneZero = data.connections.find((c) => c.provider === "oneZero");
  assert.ok(data.accounts.some((a) => a.connection_id === oneZero.id));
  assert.ok(data.transactions.some((t) => t.connection_id === oneZero.id));
  console.log(
    "PASS: MFA dialog resumes server job and saves returned transactions",
  );

  await page
    .locator("nav")
    .getByRole("button", { name: "תנועות", exact: true })
    .click();
  await page.getByLabel("חיפוש תנועות").fill("Wolt");
  await page.waitForFunction(() =>
    [...document.querySelectorAll("tbody tr")].every((r) =>
      r.textContent.includes("Wolt"),
    ),
  );
  assert.ok((await page.locator("tbody tr").count()) > 0);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ייצוא CSV" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString();
  assert.ok(csv.includes("Wolt"));
  assert.ok(!csv.includes("Netflix"));
  await page.getByLabel("חיפוש תנועות").fill("nothing-matches-this-query");
  await page.getByRole("heading", { name: "לא נמצאו תנועות תואמות" }).waitFor();
  await page.getByLabel("חיפוש תנועות").fill("");
  await page.screenshot({
    path: "test-results/transactions-desktop.png",
    fullPage: true,
  });
  console.log(
    "PASS: transaction filtering, empty state and filtered CSV download",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "פתיחת תפריט", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "סקירה כללית", exact: true })
    .click();
  await page.waitForTimeout(700);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile viewport has horizontal overflow",
  );
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  console.log("PASS: responsive dashboard and mobile navigation");
  const isolated = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const login = await isolated.newPage();
  login.on("pageerror", (error) => errors.push(error.message));
  await login.goto(url);
  await login.getByRole("button", { name: "חשבון חדש", exact: true }).click();
  await login.getByLabel("איך קוראים לכם?").fill("בדיקת משתמש נפרד");
  const email = `browser-${Date.now()}@example.com`;
  await login.getByLabel("כתובת אימייל").fill(email);
  await login
    .getByLabel("סיסמה", { exact: true })
    .fill("browser-test-password-2026");
  await login.getByRole("button", { name: "יצירת חשבון", exact: true }).click();
  await login
    .getByRole("heading", { name: "הסיפור הפיננסי שלכם מתחיל כאן" })
    .waitFor();
  const isolatedData = await login.evaluate(
    async () => await (await fetch("/api/data")).json(),
  );
  assert.equal(isolatedData.transactions.length, 0);
  assert.equal(isolatedData.connections.length, 0);
  await login
    .getByRole("button", { name: "יציאה מהחשבון", exact: true })
    .click();
  await login.getByLabel("כתובת אימייל").fill(email);
  await login
    .getByLabel("סיסמה", { exact: true })
    .fill("browser-test-password-2026");
  await login
    .getByRole("button", { name: "כניסה לחשבון", exact: true })
    .click();
  await login
    .getByRole("heading", { name: "הסיפור הפיננסי שלכם מתחיל כאן" })
    .waitFor();
  console.log(
    "PASS: registration, isolated empty account, logout and password login",
  );
  await isolated.close();
  assert.deepEqual(errors, [], "Browser JavaScript exceptions");
  await context.close();
} finally {
  await browser.close();
}

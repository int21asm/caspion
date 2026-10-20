import { DatabaseSync } from "node:sqlite";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  chmodSync,
} from "node:fs";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import path from "node:path";

export function createStore(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const keyFile = path.join(directory, "credential.key");
  // This key is for local development. Production must supply a managed key.
  if (!process.env.CREDENTIAL_KEY && !existsSync(keyFile))
    writeFileSync(keyFile, randomBytes(32), { mode: 0o600 });
  const key = process.env.CREDENTIAL_KEY
    ? Buffer.from(process.env.CREDENTIAL_KEY, "base64")
    : readFileSync(keyFile);
  if (key.length !== 32)
    throw new Error("CREDENTIAL_KEY must be a base64-encoded 32-byte key");
  const db = new DatabaseSync(path.join(directory, "finance.sqlite"));
  chmodSync(path.join(directory, "finance.sqlite"), 0o600);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT, demo INTEGER NOT NULL DEFAULT 0, settings TEXT NOT NULL DEFAULT '{"daysBack":90,"combineInstallments":false}');
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, name TEXT NOT NULL, credentials TEXT, synced_at TEXT, status TEXT NOT NULL DEFAULT 'idle');
    CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE, number TEXT NOT NULL, currency TEXT NOT NULL, balance INTEGER, UNIQUE(connection_id,number,currency));
    CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, fingerprint TEXT NOT NULL, date TEXT NOT NULL, description TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL, category TEXT NOT NULL, memo TEXT, UNIQUE(account_id,fingerprint));
    CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, connection_id TEXT REFERENCES connections(id) ON DELETE CASCADE, status TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, count INTEGER DEFAULT 0, error TEXT);
    CREATE INDEX IF NOT EXISTS connections_owner ON connections(user_id);
    CREATE INDEX IF NOT EXISTS tx_date ON transactions(date);
  `);
  db.prepare(
    "UPDATE runs SET status='interrupted',error='השרת הופעל מחדש. ניתן לנסות שוב.' WHERE status IN ('queued','running','waiting_mfa')",
  ).run();
  db.prepare(
    "UPDATE connections SET status='idle' WHERE status IN ('running','waiting_mfa')",
  ).run();
  return {
    db,
    encrypt(value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(value)),
        cipher.final(),
      ]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
        "base64",
      );
    },
    decrypt(value) {
      const bytes = Buffer.from(value, "base64");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        bytes.subarray(0, 12),
      );
      decipher.setAuthTag(bytes.subarray(12, 28));
      return JSON.parse(
        Buffer.concat([
          decipher.update(bytes.subarray(28)),
          decipher.final(),
        ]).toString(),
      );
    },
    close: () => db.close(),
  };
}

export const hash = (value) => createHash("sha256").update(value).digest("hex");
export function category(description = "") {
  if (/שופרסל|רמי לוי|סופר|AM:PM|ויקטורי/i.test(description))
    return "מזון וקניות";
  if (/wolt|קפה|מסעד|ארומה|פיצה/i.test(description)) return "אוכל ובילויים";
  if (/דלק|רכבת|פנגו|רב.קו|סונול/i.test(description)) return "תחבורה";
  if (/משכורת|שכר עבודה/i.test(description)) return "הכנסה";
  if (/חשמל|מים|ארנונה|אינטרנט|בזק|שכירות|שכר דירה/i.test(description))
    return "בית וחשבונות";
  if (/netflix|spotify|apple|google/i.test(description)) return "מנויים";
  return "כללי";
}

export function importAccounts(store, connectionId, results) {
  const { db } = store;
  let inserted = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const account of results) {
      const currency = account.currency || "ILS";
      const number = String(account.accountNumber);
      const accountId = hash(`${connectionId}:${number}:${currency}`);
      const balance = Number.isFinite(account.balance)
        ? Math.round(account.balance * 100)
        : null;
      db.prepare(
        "INSERT INTO accounts(id,connection_id,number,currency,balance) VALUES(?,?,?,?,?) ON CONFLICT(connection_id,number,currency) DO UPDATE SET balance=excluded.balance",
      ).run(accountId, connectionId, number, currency, balance);
      const occurrences = new Map();
      for (const tx of account.txns || []) {
        if (
          !Number.isFinite(tx.chargedAmount) ||
          !Number.isFinite(Date.parse(tx.date))
        )
          throw new Error("Invalid scraper transaction");
        const date = new Date(tx.date).toISOString().slice(0, 10);
        const txCurrency =
          tx.chargedCurrency || (currency !== "ILS" ? currency : "ILS");
        const amount = Math.round(tx.chargedAmount * 100);
        // Status is deliberately excluded: pending transactions become completed.
        const identity =
          tx.identifier != null
            ? JSON.stringify([tx.identifier, tx.installments?.number || 0])
            : JSON.stringify([
                date,
                tx.description,
                amount,
                txCurrency,
                tx.installments?.number || 0,
              ]);
        const occurrence = occurrences.get(identity) || 0;
        occurrences.set(identity, occurrence + 1);
        const fingerprint = hash(`${identity}:${occurrence}`);
        const id = hash(`${accountId}:${fingerprint}`);
        const exists = db
          .prepare("SELECT id FROM transactions WHERE id=?")
          .get(id);
        db.prepare(
          `INSERT INTO transactions(id,account_id,fingerprint,date,description,amount,currency,status,category,memo) VALUES(?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(account_id,fingerprint) DO UPDATE SET status=excluded.status,amount=excluded.amount,description=excluded.description,memo=excluded.memo`,
        ).run(
          id,
          accountId,
          fingerprint,
          date,
          String(tx.description || "תנועה"),
          amount,
          txCurrency,
          tx.status || "completed",
          typeof tx.category === "string" && tx.category
            ? tx.category
            : category(tx.description),
          tx.memo || null,
        );
        if (!exists) inserted++;
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return inserted;
}

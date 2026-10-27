import type { ConnectorContext, ConnectorResult } from "./types";

/**
 * Shared helpers for BROWSER-mode connectors.
 *
 * Browser automation drives the vendor's own login with Playwright. It is
 * fragile (portals change their HTML) and some portals' terms of service
 * restrict automated access, so it is OFF unless
 * VENDORSYNC_ENABLE_BROWSER_AUTOMATION=true. Playwright is loaded lazily so
 * the app runs without it installed.
 */
export function browserAutomationEnabled() {
  return process.env.VENDORSYNC_ENABLE_BROWSER_AUTOMATION === "true";
}

type PlaywrightModule = typeof import("playwright");

async function loadPlaywright(): Promise<PlaywrightModule | null> {
  try {
    // Hidden from the bundler so Next.js does not try to compile Playwright.
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<PlaywrightModule>;
    return await dynamicImport("playwright");
  } catch {
    return null;
  }
}

/** Opens the login page in a headless browser and reports whether it rendered. */
export async function checkLoginPageReachable(ctx: ConnectorContext, url: string): Promise<ConnectorResult> {
  if (!browserAutomationEnabled()) {
    return {
      ok: false,
      message: "Browser automation is disabled (set VENDORSYNC_ENABLE_BROWSER_AUTOMATION=true). Credentials are stored; use the manual checklist.",
    };
  }
  const pw = await loadPlaywright();
  if (!pw) return { ok: false, message: "Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium" };

  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage();
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const title = await page.title();
    ctx.log(`Loaded ${url} → HTTP ${res?.status()} "${title}"`);
    return { ok: Boolean(res && res.ok()), message: `Login page reachable: "${title}"`, details: { status: res?.status(), title } };
  } finally {
    await browser.close();
  }
}

/**
 * Template for a portal login + form fill. Each BROWSER connector supplies
 * its own selectors; nothing here is portal-specific.
 */
export async function withLoggedInPage<T>(
  ctx: ConnectorContext,
  opts: {
    loginUrl: string;
    usernameSelector: string;
    passwordSelector: string;
    submitSelector: string;
    loggedInSelector: string;
  },
  run: (page: import("playwright").Page) => Promise<T>
): Promise<T> {
  if (!browserAutomationEnabled()) throw new Error("Browser automation is disabled.");
  const pw = await loadPlaywright();
  if (!pw) throw new Error("Playwright is not installed.");
  const secret = ctx.getSecret();
  if (!ctx.account.username || !secret) throw new Error("Portal account is missing a username or password.");

  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(opts.loginUrl, { waitUntil: "domcontentloaded" });
    await page.fill(opts.usernameSelector, ctx.account.username);
    await page.fill(opts.passwordSelector, secret);
    await page.click(opts.submitSelector);
    await page.waitForSelector(opts.loggedInSelector, { timeout: 30_000 });
    ctx.log("Logged in");
    return await run(page);
  } finally {
    await browser.close();
  }
}

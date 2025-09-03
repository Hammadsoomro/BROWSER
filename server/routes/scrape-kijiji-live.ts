import type { RequestHandler } from "express";
import type { KijijiScrapeResult, ScrapeRequest } from "@shared/api";
import awsChromiumPkg from "playwright-aws-lambda";
import { chromium } from "playwright-core";
import { scrapeKijijiFromHtml, fetchHtml } from "../lib/kijiji";
const { chromium: awsChromium } = (awsChromiumPkg as any);

function ensureKijiji(u: string) {
  try { return new URL(u).hostname.endsWith("kijiji.ca"); } catch { return false; }
}

async function getBrowser() {
  // Use AWS-optimized Chromium in serverless; fallback to local chromium when available
  try {
    const executablePath = await awsChromium.executablePath();
    if (executablePath) {
      return await awsChromium.launch({
        args: awsChromium.args,
        executablePath,
        headless: true,
      });
    }
  } catch {}
  // Local fallback (dev)
  return await chromium.launch({ headless: true });
}

export const handleScrapeKijijiLive: RequestHandler = async (req, res) => {
  const { url } = req.body as ScrapeRequest;
  if (!url || !/^https?:\/\//i.test(url) || !ensureKijiji(url)) {
    return res.status(400).json({ error: "Provide a valid kijiji.ca listing URL" });
  }
  let browser: any;
  try {
    browser = await getBrowser();
    const context = await browser.newContext({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36" });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Try click-to-reveal phone
    const selectors = [
      "button:has-text('phone')",
      "button:has-text('Phone')",
      "button:has-text('number')",
      "button[data-testid*='phone']",
      "[role='button']:has-text('phone')",
    ];
    for (const sel of selectors) {
      const btn = await page.locator(sel).first();
      if (await btn.count()) {
        try { await btn.click({ timeout: 3000 }); await page.waitForTimeout(800); } catch {}
      }
    }

    // Look for tel link or visible number
    let phone: string | null = null;
    const tel = await page.locator("a[href^='tel']").first();
    if (await tel.count()) {
      phone = (await tel.getAttribute("href")) || null;
    }
    if (!phone) {
      const bodyText = await page.locator("body").innerText();
      const m = bodyText.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/);
      if (m) phone = m[0];
    }

    // Also fetch HTML and parse other fields (robust + fast)
    const html = await page.content();
    const parsed = scrapeKijijiFromHtml(url, html);
    const result: KijijiScrapeResult = { ...parsed, phone: phone || parsed.phone };

    await page.close();
    await context.close();
    await browser.close();
    browser = null;

    res.json(result);
  } catch (e: any) {
    if (browser) try { await browser.close(); } catch {}
    try {
      // Fallback to static scrape so we still return something
      const html = await fetchHtml(url);
      const parsed = scrapeKijijiFromHtml(url, html);
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: e?.message || err?.message || "Live scrape failed" });
    }
  }
};

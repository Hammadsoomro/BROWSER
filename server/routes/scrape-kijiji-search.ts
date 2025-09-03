import type { RequestHandler } from "express";
import type {
  KijijiSearchRequest,
  KijijiSearchResponse,
  KijijiScrapeResult,
} from "@shared/api";
import {
  extractListingLinksFromSearch,
  fetchHtml,
  scrapeKijijiFromHtml,
} from "../lib/kijiji";

function ensureKijiji(u: string) {
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host.split(".").includes("kijiji");
  } catch {
    return false;
  }
}

function withPage(url: string, page: number) {
  const hasQuery = url.includes("?");
  const param = `page=${page}`;
  if (url.match(/[?&]page=\d+/))
    return url.replace(/([?&]page=)\d+/, `$1${page}`);
  return url + (hasQuery ? `&${param}` : `?${param}`);
}

function isListingUrl(u: string) {
  try {
    const path = new URL(u).pathname;
    return /\/v-/.test(path) || /\/[0-9]{7,}$/.test(path);
  } catch {
    return false;
  }
}

export const handleScrapeKijijiSearch: RequestHandler = async (req, res) => {
  try {
    const { url, pages } = req.body as KijijiSearchRequest;
    const count = Math.max(1, Math.min(20, Number(pages) || 1));
    if (!url || !/^https?:\/\//i.test(url) || !ensureKijiji(url)) {
      return res.status(400).json({ error: "Provide a valid kijiji.ca URL" });
    }

    const allLinks = new Set<string>();

    if (isListingUrl(url)) {
      allLinks.add(url);
    } else {
      for (let p = 1; p <= count; p++) {
        const pageUrl = withPage(url, p);
        const html = await fetchHtml(pageUrl);
        extractListingLinksFromSearch(html, pageUrl).forEach((l) =>
          allLinks.add(l),
        );
      }
    }

    const results: KijijiScrapeResult[] = [];
    for (const link of Array.from(allLinks)) {
      try {
        const html = await fetchHtml(link);
        const data = scrapeKijijiFromHtml(link, html);
        results.push(data);
      } catch {}
    }

    const payload: KijijiSearchResponse = {
      totalLinks: allLinks.size,
      results,
    };
    res.json(payload);
  } catch (e: any) {
    res
      .status(500)
      .json({ error: e?.message || "Kijiji search scrape failed" });
  }
};

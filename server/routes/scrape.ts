import type { RequestHandler } from "express";
import type { ScrapeRequest, ScrapeResponse, ScrapeLink } from "@shared/api";
import * as cheerio from "cheerio";

function toAbsolute(href: string, base: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

export const handleScrape: RequestHandler = async (req, res) => {
  try {
    const { url } = req.body as ScrapeRequest;
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: "Valid http(s) URL required" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(url, { signal: controller.signal, headers: { "user-agent": "FusionBrowserBot/1.0" } });
    clearTimeout(timeout);

    if (!resp.ok) {
      return res.status(502).json({ error: `Fetch failed with status ${resp.status}` });
    }

    const html = await resp.text();
    const $ = cheerio.load(html);

    const title = ($("meta[property='og:title']").attr("content") || $("title").first().text() || null)?.trim() || null;
    const description = ($("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || null);

    const headings: string[] = [
      ...$("h1, h2, h3").slice(0, 20).map((_, el) => $(el).text().trim()).get(),
    ];

    const links: ScrapeLink[] = $("a[href]")
      .slice(0, 100)
      .map((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim().replace(/\s+/g, " ");
        return { href: toAbsolute(href, url), text } as ScrapeLink;
      })
      .get();

    const response: ScrapeResponse = {
      url,
      title,
      description: description ? String(description) : null,
      headings,
      links,
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Scrape failed" });
  }
};

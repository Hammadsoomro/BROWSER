import * as cheerio from "cheerio";
import type { KijijiScrapeResult } from "@shared/api";

function cleanText(v?: string | null) {
  return (v || "").replace(/\s+/g, " ").trim() || null;
}

function toAbsolute(href: string, base: string) {
  try { return new URL(href, base).toString(); } catch { return href; }
}

export async function fetchHtml(url: string, signal?: AbortSignal) {
  const resp = await fetch(url, { signal, headers: { "user-agent": "FusionBrowserBot/1.0" } });
  if (!resp.ok) throw new Error(`Fetch ${resp.status}`);
  return await resp.text();
}

export function scrapeKijijiFromHtml(url: string, html: string): KijijiScrapeResult {
  const $ = cheerio.load(html);
  const selPhone = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > section > div.sc-30b4d0e2-3.iFFiBy > div > div.sc-eb45309b-0.vAthl.sc-30b4d0e2-6.iqmXm";
  const selModel = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > div:nth-child(2) > div.sc-1f51e79f-0.QJUhf > h1";
  const selPrice = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > div:nth-child(2) > div.sc-1f51e79f-0.hVjQcj > div > div > div > p";
  const selAddress = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > section > div.sc-30b4d0e2-2.jFnPsI > div > div > div.sc-eb45309b-0.bEMmoW > div > div > button";
  const selDesc = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > div:nth-child(2) > div.sc-1f51e79f-0.sc-31977afe-0.sc-ea528b23-1.dWsjGh.kgrFRj.kqdDwo > div.sc-69f589a8-0.fqzJRP > div.sc-ea528b23-0.bmKHcm > div";

  let phone = cleanText($(selPhone).text());
  const model = cleanText($(selModel).text());
  const price = cleanText($(selPrice).text());
  const address = cleanText($(selAddress).text());

  if (!phone) {
    const descText = cleanText($(selDesc).text());
    const candidates = [descText, cleanText($("*[data-phone], *[data-testid*='phone']").first().text()), cleanText($("a[href^='tel']").first().attr("href")), cleanText($("a[href^='tel']").first().text()), cleanText($("body").text())].filter(Boolean) as string[];
    const caPhoneRe = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g;
    for (const t of candidates) {
      const m = t.match(caPhoneRe);
      if (m && m.length) { phone = m[0]; break; }
    }
    if (!phone) {
      const jsonLd = $('script[type="application/ld+json"]').map((_, el) => $(el).contents().text()).get().join("\n");
      const phoneFromJson = jsonLd.match(/"telephone"\s*:\s*"([^"]+)"/i)?.[1];
      if (phoneFromJson) phone = phoneFromJson;
    }
  }

  return { url, model: model || null, price: price || null, address: address || null, phone: phone || null };
}

export function extractListingLinksFromSearch(searchHtml: string, baseUrl: string) {
  const $ = cheerio.load(searchHtml);
  const links = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (/\/v-/.test(href) && /\/[0-9]{7,}$/.test(href)) {
      links.add(toAbsolute(href, baseUrl));
    }
  });
  return Array.from(links);
}

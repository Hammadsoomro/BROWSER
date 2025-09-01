import type { RequestHandler } from "express";
import type { KijijiScrapeResult, ScrapeRequest } from "@shared/api";
import * as cheerio from "cheerio";

function cleanText(v?: string | null) {
  return (v || "").replace(/\s+/g, " ").trim() || null;
}

function extractDigits(v?: string | null) {
  const s = (v || "").replace(/[^0-9+]/g, "");
  return s.length >= 7 ? s : null;
}

function sameHost(u: string, host: string) {
  try { return new URL(u).hostname.endsWith(host); } catch { return false; }
}

export const handleScrapeKijiji: RequestHandler = async (req, res) => {
  try {
    const { url } = req.body as ScrapeRequest;
    if (!url || !/^https?:\/\//i.test(url) || !sameHost(url, "kijiji.ca")) {
      return res.status(400).json({ error: "Provide a valid kijiji.ca listing URL" });
    }

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": "FusionBrowserBot/1.0" } });
    clearTimeout(to);

    if (!response.ok) return res.status(502).json({ error: `Fetch ${response.status}` });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Selectors provided by user
    const selPhone = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > section > div.sc-30b4d0e2-3.iFFiBy > div > div.sc-eb45309b-0.vAthl.sc-30b4d0e2-6.iqmXm";
    const selModel = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > div:nth-child(2) > div.sc-1f51e79f-0.QJUhf > h1";
    const selPrice = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > div:nth-child(2) > div.sc-1f51e79f-0.hVjQcj > div > div > div > p";
    const selAddress = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > section > div.sc-30b4d0e2-2.jFnPsI > div > div > div.sc-eb45309b-0.bEMmoW > div > div > button";

    // Extract as-is
    let phone = cleanText($(selPhone).text());
    const model = cleanText($(selModel).text());
    const price = cleanText($(selPrice).text());
    const address = cleanText($(selAddress).text());

    // Fallbacks
    if (!phone) {
      // Provided description selector by user
      const selDesc = "#base-layout-main-wrapper > div.sc-81698752-0.bNPVmS > div.sc-81698752-2.ldPhHG > div:nth-child(2) > div.sc-1f51e79f-0.sc-31977afe-0.sc-ea528b23-1.dWsjGh.kgrFRj.kqdDwo > div.sc-69f589a8-0.fqzJRP > div.sc-ea528b23-0.bmKHcm > div";
      const descText = cleanText($(selDesc).text());

      // Collect candidates and run robust Canadian phone regex
      const candidates = [
        descText,
        cleanText($("*[data-phone], *[data-testid*='phone']").first().text()),
        cleanText($("a[href^='tel']").first().attr("href")),
        cleanText($("a[href^='tel']").first().text()),
        cleanText($("body").text()),
      ].filter(Boolean) as string[];

      const caPhoneRe = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g;
      for (const t of candidates) {
        const m = t.match(caPhoneRe);
        if (m && m.length) {
          phone = m[0];
          break;
        }
      }

      if (!phone) {
        const jsonLd = $('script[type="application/ld+json"]').map((_, el) => $(el).contents().text()).get().join("\n");
        const phoneFromJson = jsonLd.match(/"telephone"\s*:\s*"([^"]+)"/i)?.[1];
        phone = extractDigits(phoneFromJson) || null;
      }
    }

    const result: KijijiScrapeResult = {
      url,
      phone: phone ? extractDigits(phone) : null,
      model: model || null,
      price: price || null,
      address: address || null,
    };

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Kijiji scrape failed" });
  }
};

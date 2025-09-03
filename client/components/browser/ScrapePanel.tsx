import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScrapeResponse } from "@shared/api";
import { cn } from "@/lib/utils";
import Field from "./Field";

export default function ScrapePanel({
  open,
  initialUrl,
  onClose,
}: {
  open: boolean;
  initialUrl: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string>(initialUrl);
  const [list, setList] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScrapeResponse | null>(null);
  const [batchLines, setBatchLines] = useState<string[]>([]);
  const [modeList, setModeList] = useState<boolean>(false);

  function pickEndpoint(u: string) {
    const host = new URL(u).hostname;
    return /(^|\.)kijiji\.ca$/i.test(host) ? "/api/scrape/kijiji" : "/api/scrape";
  }

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const kijiji = /(^|\.)kijiji\.ca$/i.test(new URL(url).hostname);
      const endpoint = kijiji ? "/api/scrape/kijiji" : "/api/scrape";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setData(json as any);
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-20 flex flex-col bg-background/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center gap-2 border-b border-white/10 p-3">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 rounded-lg border border-white/10 bg-background px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={run}
              disabled={loading || !/^https?:\/\//i.test(url)}
              className={cn(
                "rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 px-4 py-2 text-sm font-medium text-white disabled:opacity-50",
              )}
            >
              {loading ? "Scraping…" : "Scrape"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {!data && !error && !loading && (
              <div className="text-center text-sm text-foreground/70">
                Enter a URL to scrape. For Kijiji, we parse the page and
                description for a phone number.
              </div>
            )}
            {error && (
              <div className="text-center text-sm text-red-400">{error}</div>
            )}
            {data &&
              (() => {
                const isKijiji = /(^|\.)kijiji\.ca$/i.test(
                  new URL((data as any).url).hostname,
                );
                if (isKijiji && (data as any).model !== undefined) {
                  const d = data as any as {
                    url: string;
                    model: string | null;
                    price: string | null;
                    address: string | null;
                    phone: string | null;
                  };
                  return (
                    <div className="mx-auto max-w-3xl">
                      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h3 className="text-sm font-semibold">
                          Kijiji Listing
                        </h3>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Model" value={d.model} />
                          <Field label="Price" value={d.price} />
                          <Field label="Address" value={d.address} />
                          <Field label="Phone" value={d.phone} />
                        </div>
                        <a
                          className="mt-4 inline-block text-xs text-brand-400 hover:underline"
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open listing
                        </a>
                      </section>
                    </div>
                  );
                }
                return (
                  <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="md:col-span-2 space-y-4">
                      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h3 className="text-sm font-semibold">Meta</h3>
                        <div className="mt-2 text-sm">
                          <div>
                            <span className="text-foreground/60">Title:</span>{" "}
                            {(data as any).title || "—"}
                          </div>
                          <div className="mt-1">
                            <span className="text-foreground/60">
                              Description:
                            </span>{" "}
                            {(data as any).description || "—"}
                          </div>
                          <div className="mt-1">
                            <span className="text-foreground/60">URL:</span>{" "}
                            {(data as any).url}
                          </div>
                        </div>
                      </section>
                      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h3 className="text-sm font-semibold">Headings</h3>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                          {(data as any).headings.map(
                            (h: string, i: number) => (
                              <li key={i}>{h}</li>
                            ),
                          )}
                        </ul>
                      </section>
                    </div>
                    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="text-sm font-semibold">Top Links</h3>
                      <ul className="mt-2 space-y-2 text-sm">
                        {(data as any).links.map((l: any, i: number) => (
                          <li key={i} className="truncate">
                            <a
                              className="text-brand-400 hover:underline"
                              href={l.href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {l.text || l.href}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                );
              })()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScrapeResponse } from "@shared/api";
import { cn } from "@/lib/utils";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScrapeResponse | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setData(json as ScrapeResponse);
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
              className={cn("rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 px-4 py-2 text-sm font-medium text-white disabled:opacity-50")}
            >
              {loading ? "Scraping…" : "Scrape"}
            </button>
            <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-sm">Close</button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {!data && !error && !loading && (
              <div className="text-center text-sm text-foreground/70">Enter a URL to scrape.</div>
            )}
            {error && <div className="text-center text-sm text-red-400">{error}</div>}
            {data && (
              <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">
                  <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold">Meta</h3>
                    <div className="mt-2 text-sm">
                      <div><span className="text-foreground/60">Title:</span> {data.title || "—"}</div>
                      <div className="mt-1"><span className="text-foreground/60">Description:</span> {data.description || "—"}</div>
                      <div className="mt-1"><span className="text-foreground/60">URL:</span> {data.url}</div>
                    </div>
                  </section>
                  <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold">Headings</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                      {data.headings.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </section>
                </div>
                <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold">Top Links</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {data.links.map((l, i) => (
                      <li key={i} className="truncate">
                        <a className="text-brand-400 hover:underline" href={l.href} target="_blank" rel="noreferrer">
                          {l.text || l.href}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

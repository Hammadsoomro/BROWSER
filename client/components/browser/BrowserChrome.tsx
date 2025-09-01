import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, ChevronLeft, ChevronRight, RefreshCw, Home, Star, Globe, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import ScrapePanel from "./ScrapePanel";

export type Tab = {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
  isHome?: boolean;
  favicon?: string | null;
};

const initialHomeTab = (): Tab => ({
  id: crypto.randomUUID(),
  title: "New Tab",
  url: "app://home",
  history: ["app://home"],
  historyIndex: 0,
  isHome: true,
  favicon: null,
});

function isSearch(input: string) {
  const hasSpace = /\s/.test(input);
  const hasDot = input.includes(".");
  const hasProtocol = /^(https?:)?\/\//i.test(input);
  return !hasProtocol && (hasSpace || !hasDot);
}

function normalizeToUrl(input: string) {
  if (input.startsWith("app://")) return input;
  if (isSearch(input)) {
    const q = encodeURIComponent(input.trim());
    return `https://www.wikipedia.org/w/index.php?search=${q}`;
  }
  const hasProtocol = /^(https?:)?\/\//i.test(input);
  return hasProtocol ? input : `https://${input}`;
}

function hostName(u: string) {
  try {
    if (u.startsWith("app://")) return "Home";
    const url = new URL(u);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

const allowedSpeedDials: { title: string; url: string; color: string; icon: React.ReactNode }[] = [
  { title: "Wikipedia", url: "https://wikipedia.org", color: "from-indigo-500 to-sky-500", icon: <Globe className="h-5 w-5" /> },
  { title: "MDN", url: "https://developer.mozilla.org", color: "from-violet-500 to-fuchsia-500", icon: <Star className="h-5 w-5" /> },
  { title: "Example", url: "https://example.com", color: "from-emerald-500 to-teal-500", icon: <Globe className="h-5 w-5" /> },
];

export default function BrowserChrome() {
  const [tabs, setTabs] = useState<Tab[]>([initialHomeTab()]);
  const [activeId, setActiveId] = useState<string>(() => tabs[0].id);
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeId) ?? tabs[0], [tabs, activeId]);
  const [omnibox, setOmnibox] = useState<string>(activeTab?.url ?? "");
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [scrapeOpen, setScrapeOpen] = useState(false);

  const setActiveTab = useCallback((id: string) => {
    setActiveId(id);
    const t = tabs.find((x) => x.id === id);
    if (t) setOmnibox(t.url);
  }, [tabs]);

  const addTab = useCallback((url?: string) => {
    setTabs((prev) => {
      const tab: Tab = {
        id: crypto.randomUUID(),
        title: url ? hostName(url) : "New Tab",
        url: url ?? "app://home",
        history: [url ?? "app://home"],
        historyIndex: 0,
        isHome: !url,
        favicon: null,
      };
      setActiveId(tab.id);
      setOmnibox(tab.url);
      return [...prev, tab];
    });
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const next = prev.filter((t) => t.id !== id);
      if (id === activeId && next.length) {
        const newIdx = Math.max(0, idx - 1);
        setActiveId(next[newIdx].id);
        setOmnibox(next[newIdx].url);
      }
      return next.length ? next : [initialHomeTab()];
    });
  }, [activeId]);

  const navigate = useCallback((targetUrl: string) => {
    const url = normalizeToUrl(targetUrl);
    setTabs((prev) => prev.map((t) => {
      if (t.id !== activeId) return t;
      const hist = t.history.slice(0, t.historyIndex + 1).concat(url);
      return {
        ...t,
        url,
        title: hostName(url),
        history: hist,
        historyIndex: hist.length - 1,
        isHome: url === "app://home",
      };
    }));
    setOmnibox(url);
    setReloadKey((k) => k + 1);
  }, [activeId]);

  const canGoBack = !!activeTab && activeTab.historyIndex > 0;
  const canGoFwd = !!activeTab && activeTab.historyIndex < activeTab.history.length - 1;

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    setTabs((prev) => prev.map((t) => {
      if (t.id !== activeId) return t;
      const idx = Math.max(0, t.historyIndex - 1);
      return { ...t, historyIndex: idx, url: t.history[idx], title: hostName(t.history[idx]), isHome: t.history[idx] === "app://home" };
    }));
    setReloadKey((k) => k + 1);
  }, [activeId, canGoBack]);

  const goForward = useCallback(() => {
    if (!canGoFwd) return;
    setTabs((prev) => prev.map((t) => {
      if (t.id !== activeId) return t;
      const idx = Math.min(t.history.length - 1, t.historyIndex + 1);
      return { ...t, historyIndex: idx, url: t.history[idx], title: hostName(t.history[idx]), isHome: t.history[idx] === "app://home" };
    }));
    setReloadKey((k) => k + 1);
  }, [activeId, canGoFwd]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!omnibox.trim()) return;
    navigate(omnibox.trim());
  }, [omnibox, navigate]);

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(1200px_800px_at_10%_10%,hsl(var(--brand-700)/.45),transparent_60%),radial-gradient(900px_700px_at_90%_20%,hsl(var(--brand-500)/.35),transparent_60%),linear-gradient(to_bottom_right,hsl(var(--background)),hsl(var(--background)))] text-foreground">
      <div className="mx-auto max-w-screen-2xl py-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-brand-950/30 ring-1 ring-white/10">
          {/* Tabs bar */}
          <div className="flex items-center gap-2 px-2 pt-2">
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2">
                <AnimatePresence initial={false}>
                  {tabs.map((t) => (
                    <motion.button
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      onClick={() => setActiveTab(t.id)}
                      className={cn(
                        "group inline-flex items-center gap-2 rounded-t-xl border border-b-0 px-3 py-1.5 text-sm transition-colors",
                        t.id === activeId
                          ? "bg-background text-foreground border-white/10"
                          : "bg-white/10 text-foreground/80 hover:bg-white/15 border-transparent",
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        {t.favicon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.favicon} alt="" className="h-4 w-4 rounded-sm" />
                        ) : (
                          <Globe className="h-4 w-4 text-foreground/70" />
                        )}
                        <span className="max-w-[12rem] truncate">{t.title}</span>
                      </span>
                      <X
                        className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(t.id);
                        }}
                      />
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            <button
              aria-label="New Tab"
              onClick={() => addTab()}
              className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-foreground/80 hover:bg-white/15"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Toolbar + Omnibox */}
          <div className="flex items-center gap-2 px-3 pb-2 pt-3">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-foreground/80 hover:bg-white/15 disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goForward}
              disabled={!canGoFwd}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-foreground/80 hover:bg-white/15 disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-foreground/80 hover:bg-white/15"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate("app://home")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-foreground/80 hover:bg-white/15"
            >
              <Home className="h-5 w-5" />
            </button>
            <form onSubmit={onSubmit} className="relative ml-1 flex-1">
              <div className="group flex items-center gap-2 rounded-xl border border-white/10 bg-background px-3 py-2 ring-1 ring-transparent transition-shadow focus-within:ring-brand-500/60">
                <Globe className="h-4 w-4 text-foreground/60" />
                <input
                  value={omnibox}
                  onChange={(e) => setOmnibox(e.target.value)}
                  placeholder="Type a URL or search…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
                />
                <button className="rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 px-3 py-1.5 text-xs font-medium text-white shadow-[0_0_0_3px_hsl(var(--brand-500)/.35)] transition-colors hover:from-brand-400 hover:to-brand-300">
                  Go
                </button>
              </div>
            </form>
          </div>

          {/* Bookmarks */}
          <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
            {allowedSpeedDials.map((b) => (
              <button
                key={b.url}
                onClick={() => navigate(b.url)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-foreground/80 ring-1 ring-white/10 transition hover:bg-white/10",
                )}
              >
                <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br text-white", b.color)}>
                  {b.icon}
                </span>
                {b.title}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="relative h-[70vh] w-full overflow-hidden rounded-b-2xl border-t border-white/10 bg-background">
            <motion.div
              key={activeTab?.url + String(reloadKey)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full w-full"
            >
              {activeTab?.url === "app://home" ? (
                <HomeView onOpen={(u) => navigate(u)} onNewTab={(u) => addTab(u)} />
              ) : (
                <WebView url={activeTab?.url ?? "about:blank"} />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebView({ url }: { url: string }) {
  const safeUrl = useMemo(() => {
    try {
      return new URL(url).toString();
    } catch {
      return url;
    }
  }, [url]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <iframe
          key={safeUrl}
          src={safeUrl}
          className="h-full w-full bg-white/5"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-400 via-brand-300 to-brand-500 opacity-60"></div>
    </div>
  );
}

function HomeView({ onOpen, onNewTab }: { onOpen: (url: string) => void; onNewTab: (url: string) => void }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-300 p-[2px] shadow-[0_0_40px_hsl(var(--brand-500)/.35)]">
            <div className="h-full w-full rounded-2xl bg-background/90"></div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Fusion Browser</h1>
          <p className="mt-1 text-foreground/70">Fast. Minimal. Animated. Chrome‑style UI.</p>
        </div>
        <div className="grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {allowedSpeedDials.map((d) => (
            <button
              key={d.url}
              onClick={() => onOpen(d.url)}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <span className={cn("mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-2xl", d.color)}>
                {d.icon}
              </span>
              <div className="text-sm font-medium">{d.title}</div>
              <div className="text-xs text-foreground/60">{new URL(d.url).hostname.replace(/^www\./, "")}</div>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px translate-y-1 bg-gradient-to-r from-brand-400/0 via-brand-400/60 to-brand-400/0 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
        <div className="text-center text-xs text-foreground/60">
          Some sites block embedding in iframes. If a page doesn’t load, open it in a new tab.
        </div>
        <div className="flex items-center gap-2">
          {allowedSpeedDials.slice(0, 2).map((d) => (
            <a
              key={d.url}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-foreground/80 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Open {new URL(d.url).hostname.replace(/^www\./, "")} externally
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

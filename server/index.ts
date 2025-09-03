import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleScrape } from "./routes/scrape";
import { handleScrapeKijiji } from "./routes/scrape-kijiji";
import { handleScrapeKijijiSearch } from "./routes/scrape-kijiji-search";
import { handleScrapeKijijiLive } from "./routes/scrape-kijiji-live";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/scrape", handleScrape);
  app.post("/api/scrape/kijiji", handleScrapeKijiji);
  app.post("/api/scrape/kijiji/live", handleScrapeKijijiLive);
  app.post("/api/scrape/kijiji/search", handleScrapeKijijiSearch);

  return app;
}

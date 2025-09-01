export interface DemoResponse {
  message: string;
}

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeLink {
  text: string;
  href: string;
}

export interface ScrapeResponse {
  url: string;
  title: string | null;
  description: string | null;
  headings: string[];
  links: ScrapeLink[];
}

export interface KijijiScrapeResult {
  url: string;
  model: string | null;
  price: string | null;
  address: string | null;
  phone: string | null;
}

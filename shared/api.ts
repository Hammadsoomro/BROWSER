/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

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

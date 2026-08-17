import { searchJSearch } from "@/lib/jsearch";
import type { Provider } from "./types";

/** JSearch (RapidAPI) — Google for Jobs aggregator. BYOK RapidAPI key. */
export const jsearchProvider: Provider = {
  id: "jsearch",
  name: "JSearch (Google Jobs)",
  description: "Aggregates LinkedIn, Indeed, Glassdoor and more via Google for Jobs.",
  docsUrl: "https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch",
  keyless: false,
  envFallbackKey: "JSEARCH_API_KEY",
  fields: [
    {
      key: "apiKey",
      label: "RapidAPI Key",
      type: "password",
      placeholder: "your-rapidapi-key",
      hint: "Subscribe to JSearch on RapidAPI, then copy your X-RapidAPI-Key.",
    },
  ],
  async search(params, creds) {
    const jobs = await searchJSearch(params, creds.apiKey);
    return { jobs };
  },
};

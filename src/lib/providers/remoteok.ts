import { searchRemoteOk } from "@/lib/remoteok";
import type { Provider } from "./types";

/** RemoteOK — free, no auth required. */
export const remoteokProvider: Provider = {
  id: "remoteok",
  name: "RemoteOK",
  description: "Remote-first jobs across engineering, design, and more. No key required.",
  docsUrl: "https://remoteok.com/api",
  keyless: true,
  fields: [],
  async search(params) {
    const jobs = await searchRemoteOk(params, params.skills || []);
    return { jobs };
  },
};

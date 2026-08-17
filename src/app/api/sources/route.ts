import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUid } from "@/lib/firebase-admin";
import { getProvider, providerMeta } from "@/lib/providers";
import {
  deleteCredentials,
  listConnectedProviders,
  saveCredentials,
} from "@/lib/sources";

export const runtime = "nodejs";

function encryptionAvailable(): boolean {
  return Boolean(process.env.TOKEN_ENCRYPTION_KEY);
}

/** GET → provider metadata + which ones this user has connected. */
export async function GET(req: Request) {
  const uid = await verifyRequestUid(req);
  const meta = providerMeta();
  if (!uid) {
    return NextResponse.json({ providers: meta, connected: [] });
  }
  const connected = await listConnectedProviders(uid);
  return NextResponse.json({ providers: meta, connected });
}

const postSchema = z.object({
  providerId: z.string(),
  credentials: z.record(z.string()),
});

/** POST → save (encrypted) credentials for a provider. */
export async function POST(req: Request) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!encryptionAvailable()) {
    return NextResponse.json(
      { error: "Server is missing TOKEN_ENCRYPTION_KEY; cannot store credentials securely." },
      { status: 503 }
    );
  }

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const provider = getProvider(body.providerId);
  if (!provider || provider.keyless) {
    return NextResponse.json({ error: "Unknown or keyless provider." }, { status: 400 });
  }

  // Ensure every required field is present.
  const missing = provider.fields.filter((f) => !(body.credentials[f.key] || "").trim());
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing: ${missing.map((f) => f.label).join(", ")}` },
      { status: 400 }
    );
  }

  await saveCredentials(uid, body.providerId, body.credentials);
  return NextResponse.json({ ok: true });
}

/** DELETE ?providerId=… → disconnect a provider. */
export async function DELETE(req: Request) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerId = new URL(req.url).searchParams.get("providerId");
  if (!providerId) return NextResponse.json({ error: "providerId required." }, { status: 400 });

  await deleteCredentials(uid, providerId);
  return NextResponse.json({ ok: true });
}

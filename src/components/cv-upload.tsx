"use client";

import * as React from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CvUploadProps {
  onParsed: (profile: UserProfile) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Read a File as a base64 string (without the data: URI prefix). */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CvUpload({ onParsed }: CvUploadProps) {
  const { user, getToken, refreshUser } = useAuth();
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!user) {
      toast.error("Please log in first.");
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large (max 5MB).");
      return;
    }

    setBusy(true);
    setFileName(file.name);
    try {
      // 1. Upload to Firebase Storage.
      const path = `cvs/${user.uid}/${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: "application/pdf" });
      const downloadUrl = await getDownloadURL(storageRef);

      await setDoc(
        doc(db, "users", user.uid),
        { cvUrl: path, cvDownloadUrl: downloadUrl, updatedAt: serverTimestamp() },
        { merge: true }
      );

      // 2. Parse via Claude.
      toast.info("Extracting your profile with AI…");
      const base64 = await toBase64(file);
      const token = await getToken();
      const res = await fetch("/api/cv/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pdfBase64: base64 }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Parse failed" }));
        throw new Error(error);
      }
      const { profile } = (await res.json()) as { profile: UserProfile };
      await refreshUser();
      onParsed(profile);
      toast.success("Profile extracted! Review and save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      onClick={() => !busy && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        busy && "pointer-events-none opacity-70"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {busy ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      ) : fileName ? (
        <FileText className="h-8 w-8 text-primary" />
      ) : (
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
      )}
      <p className="mt-4 text-sm font-medium">
        {busy ? "Processing…" : fileName || "Drag & drop your CV, or click to browse"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">PDF only · max 5MB</p>
      {!busy && (
        <Button variant="outline" size="sm" className="mt-4" type="button">
          Choose file
        </Button>
      )}
    </div>
  );
}

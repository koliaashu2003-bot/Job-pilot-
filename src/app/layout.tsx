import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobPilot — Find jobs globally. Apply in one click.",
  description:
    "Upload your CV, get an auto-filled profile, search live jobs worldwide, and apply via auto-generated Gmail drafts. Premium users get real-time Telegram job alerts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          {children}
          <Toaster theme="dark" position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}

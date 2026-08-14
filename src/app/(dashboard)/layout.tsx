"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  LayoutGrid,
  Loader2,
  LogOut,
  Send,
  Settings,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applications", label: "Applications", icon: Send },
  { href: "/profile", label: "Profile", icon: UserIcon },
  { href: "/services", label: "Services", icon: LayoutGrid },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, configured, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && configured && !user) router.replace("/login");
  }, [loading, configured, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (configured && !user) return null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="p-6">
          <Link href="/" className="text-lg font-bold">
            Job<span className="text-primary">Pilot</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 truncate">
              <div className="truncate text-sm font-medium">{user?.displayName}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <Badge variant={user?.plan === "pro" ? "success" : "outline"}>
              {user?.plan === "pro" ? (
                <>
                  <Sparkles className="mr-1 h-3 w-3" /> Pro
                </>
              ) : (
                "Free"
              )}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <Link href="/" className="font-bold">
            Job<span className="text-primary">Pilot</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

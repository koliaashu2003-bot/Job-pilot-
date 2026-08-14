"use client";

import * as React from "react";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Application, ApplicationStatus } from "@/lib/types";

const STATUS_META: Record<ApplicationStatus, { label: string; variant: "warning" | "info" | "success" | "danger" }> = {
  drafted: { label: "Drafted", variant: "warning" },
  sent: { label: "Sent", variant: "info" },
  replied: { label: "Replied", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

interface AppRecord extends Application {
  id: string;
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === "string") return new Date(v);
  if (typeof v === "object" && v !== null && "seconds" in v) {
    return new Date((v as { seconds: number }).seconds * 1000);
  }
  return null;
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [apps, setApps] = React.useState<AppRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "applications", user.uid, "items"),
          orderBy("appliedAt", "desc")
        );
        const snap = await getDocs(q);
        setApps(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Application) })));
      } catch {
        // Missing index or empty collection — treat as no data.
        setApps([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function setStatus(app: AppRecord, status: ApplicationStatus) {
    if (!user) return;
    setApps((list) => list.map((a) => (a.id === app.id ? { ...a, status } : a)));
    try {
      await updateDoc(doc(db, "applications", user.uid, "items", app.id), { status });
      toast.success("Status updated.");
    } catch {
      toast.error("Could not update status.");
    }
  }

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = apps.filter((a) => (toDate(a.appliedAt)?.getTime() ?? 0) >= weekAgo).length;
  const replied = apps.filter((a) => a.status === "replied").length;
  const responseRate = apps.length ? Math.round((replied / apps.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track every draft and its status.</p>
      </header>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total applied" value={apps.length} />
        <Stat label="This week" value={thisWeek} />
        <Stat label="Response rate" value={`${responseRate}%`} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No applications yet. Head to <span className="text-primary">Jobs</span> and apply to your
          first role.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Job title</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Applied</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{app.jobTitle}</td>
                  <td className="px-4 py-3 text-muted-foreground">{app.company}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {toDate(app.appliedAt)?.toLocaleDateString() ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{app.source || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_META[app.status]?.variant || "outline"}>
                        {STATUS_META[app.status]?.label || app.status}
                      </Badge>
                      <Select
                        className="h-8 w-28 text-xs"
                        value={app.status}
                        onChange={(e) => setStatus(app, e.target.value as ApplicationStatus)}
                      >
                        {Object.entries(STATUS_META).map(([key, meta]) => (
                          <option key={key} value={key}>
                            {meta.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

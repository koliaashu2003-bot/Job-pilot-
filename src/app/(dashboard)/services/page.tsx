"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileCheck2, Linkedin, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const services = [
  {
    icon: FileCheck2,
    title: "AI CV Review",
    body: "Line-by-line feedback on your CV with concrete rewrites tuned to your target roles.",
  },
  {
    icon: Linkedin,
    title: "LinkedIn Optimization",
    body: "Headline, About, and experience rewrites to make recruiters stop scrolling.",
  },
  {
    icon: MessageSquareText,
    title: "Interview Prep",
    body: "Role-specific mock questions and AI-graded practice answers.",
  },
];

export default function ServicesPage() {
  const [email, setEmail] = React.useState("");
  const [joined, setJoined] = React.useState(false);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Services</h1>
        <Badge variant="warning">Coming soon</Badge>
      </div>

      <p className="max-w-2xl text-muted-foreground">
        We&apos;re building a suite of premium career services on top of JobPilot. Join the waitlist
        to get early access.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {services.map((s) => (
          <div key={s.title} className="rounded-lg border border-border bg-card p-6">
            <s.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Join the waitlist</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Be first in line when these launch.
        </p>
        {joined ? (
          <p className="mt-4 text-sm text-primary">You&apos;re on the list — we&apos;ll be in touch!</p>
        ) : (
          <form
            className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email) return;
              // Placeholder: wire to a real waitlist store in Phase 2.
              setJoined(true);
              toast.success("Added to the waitlist!");
            }}
          >
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit">Notify me</Button>
          </form>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Bell, Check, FileText, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { remoteOkCount } from "@/lib/remoteok";

export const revalidate = 3600;

const features = [
  {
    icon: FileText,
    title: "CV → Profile in seconds",
    body: "Upload your CV and Claude extracts your skills, experience, and target roles into an editable profile.",
  },
  {
    icon: Search,
    title: "Live global job search",
    body: "Aggregated from Google for Jobs and RemoteOK, ranked by how well each role matches your profile.",
  },
  {
    icon: Zap,
    title: "One-click apply",
    body: "Generate a tailored cold email and a ready-to-send Gmail draft with your CV attached.",
  },
  {
    icon: Bell,
    title: "Real-time Telegram alerts",
    body: "Pro users get instant Telegram notifications the moment a matching job goes live.",
  },
];

const testimonials = [
  {
    quote: "I went from doom-scrolling job boards to sending 12 tailored applications in an afternoon.",
    name: "Priya S.",
    role: "BIM Engineer",
  },
  {
    quote: "The match scoring is scary good. It surfaced roles I'd never have found myself.",
    name: "Marcus T.",
    role: "Backend Developer",
  },
  {
    quote: "Telegram alerts mean I'm often the first applicant. That changes everything.",
    name: "Lena K.",
    role: "Product Designer",
  },
];

const freeFeatures = [
  "CV parsing & profile",
  "Live job search",
  "Match scoring",
  "Gmail draft generation",
  "Application tracker",
];

const proFeatures = [
  "Everything in Free",
  "Real-time Telegram job alerts",
  "6-hour automated job polling",
  "Weekly performance digest",
  "Priority match ranking",
];

export default async function LandingPage() {
  const liveCount = await remoteOkCount();

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold tracking-tight">
          Job<span className="text-primary">Pilot</span>
        </span>
        <nav className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-20 text-center">
        {liveCount > 0 && (
          <Badge variant="success" className="mb-6">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {liveCount.toLocaleString()} live remote jobs right now
          </Badge>
        )}
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Find jobs globally.
          <br />
          Apply in <span className="text-primary">one click.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          JobPilot turns your CV into a live job hunt: an auto-filled profile, global search ranked
          by fit, and tailored Gmail drafts ready to send.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/jobs">
            <Button size="lg" className="w-full sm:w-auto">
              Browse Jobs <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/services">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Explore Services
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Loved by job hunters</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-lg border border-border bg-card p-6">
              <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 text-sm">
                <div className="font-medium">{t.name}</div>
                <div className="text-muted-foreground">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Simple pricing</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-8">
            <h3 className="text-xl font-semibold">Free</h3>
            <p className="mt-1 text-muted-foreground">Everything to start applying today.</p>
            <div className="mt-4 text-4xl font-bold">
              $0<span className="text-base font-normal text-muted-foreground">/mo</span>
            </div>
            <ul className="mt-6 space-y-3">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-8 block">
              <Button variant="outline" className="w-full">
                Start free
              </Button>
            </Link>
          </div>

          <div className="rounded-lg border border-primary/40 bg-card p-8 ring-1 ring-primary/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Pro</h3>
              <Badge variant="success">Most popular</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">For serious, fast-moving job hunters.</p>
            <div className="mt-4 text-4xl font-bold">
              $9<span className="text-base font-normal text-muted-foreground">/mo</span>
            </div>
            <ul className="mt-6 space-y-3">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-8 block">
              <Button className="w-full">Go Pro</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span>
              Job<span className="text-primary">Pilot</span> © {new Date().getFullYear()}
            </span>
            <div className="flex gap-6">
              <Link href="/login" className="hover:text-foreground">
                Log in
              </Link>
              <Link href="/services" className="hover:text-foreground">
                Services
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

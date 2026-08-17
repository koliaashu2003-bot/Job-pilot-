"use client";

import * as React from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { Card, CardContent } from "@/components/ui/card";
import { emptyProfile, type UserProfile } from "@/lib/types";

interface ProfileFormProps {
  initial?: UserProfile;
  saving?: boolean;
  onSave: (profile: UserProfile) => void;
}

export function ProfileForm({ initial, saving, onSave }: ProfileFormProps) {
  const [profile, setProfile] = React.useState<UserProfile>(initial || emptyProfile());

  React.useEffect(() => {
    if (initial) setProfile(initial);
  }, [initial]);

  function set<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(profile);
      }}
      className="space-y-8"
    >
      {/* Basics */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={profile.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={profile.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={profile.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Location">
          <Input value={profile.location} onChange={(e) => set("location", e.target.value)} />
        </Field>
        <Field label="Current title">
          <Input
            value={profile.currentTitle}
            onChange={(e) => set("currentTitle", e.target.value)}
          />
        </Field>
        <Field label="Years of experience">
          <Input
            type="number"
            min={0}
            value={profile.yearsOfExperience}
            onChange={(e) => set("yearsOfExperience", Number(e.target.value) || 0)}
          />
        </Field>
      </section>

      {/* Tag groups */}
      <section className="space-y-4">
        <Field label="Skills">
          <TagInput value={profile.skills} onChange={(v) => set("skills", v)} placeholder="Add a skill, press Enter" />
        </Field>
        <Field label="Target roles">
          <TagInput
            value={profile.targetRoles}
            onChange={(v) => set("targetRoles", v)}
            placeholder="e.g. Senior Backend Engineer"
          />
        </Field>
        <Field label="Target locations">
          <TagInput
            value={profile.targetLocations}
            onChange={(v) => set("targetLocations", v)}
            placeholder="e.g. Remote, Dubai, London"
          />
        </Field>
      </section>

      {/* Summary */}
      <Field label="Summary">
        <Textarea
          rows={4}
          value={profile.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="A short professional summary…"
        />
      </Field>

      {/* Education (repeatable) */}
      <Repeatable
        title="Education"
        items={profile.education}
        onChange={(v) => set("education", v)}
        blank={{ degree: "", institution: "", year: "" }}
        render={(item, update) => (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Degree" value={item.degree} onChange={(e) => update({ ...item, degree: e.target.value })} />
            <Input
              placeholder="Institution"
              value={item.institution}
              onChange={(e) => update({ ...item, institution: e.target.value })}
            />
            <Input placeholder="Year" value={item.year} onChange={(e) => update({ ...item, year: e.target.value })} />
          </div>
        )}
      />

      {/* Experience (repeatable) */}
      <Repeatable
        title="Experience"
        items={profile.experience}
        onChange={(v) => set("experience", v)}
        blank={{ title: "", company: "", duration: "", description: "" }}
        render={(item, update) => (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Title" value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
              <Input
                placeholder="Company"
                value={item.company}
                onChange={(e) => update({ ...item, company: e.target.value })}
              />
              <Input
                placeholder="Duration"
                value={item.duration}
                onChange={(e) => update({ ...item, duration: e.target.value })}
              />
            </div>
            <Textarea
              rows={2}
              placeholder="Description"
              value={item.description}
              onChange={(e) => update({ ...item, description: e.target.value })}
            />
          </div>
        )}
      />

      {/* Extra tag groups */}
      <section className="space-y-4">
        <Field label="Languages">
          <TagInput value={profile.languages} onChange={(v) => set("languages", v)} placeholder="Add a language" />
        </Field>
        <Field label="Certifications">
          <TagInput
            value={profile.certifications}
            onChange={(v) => set("certifications", v)}
            placeholder="Add a certification"
          />
        </Field>
      </section>

      <div className="sticky bottom-0 -mx-6 border-t border-border bg-background/80 px-6 py-4 backdrop-blur">
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

interface RepeatableProps<T> {
  title: string;
  items: T[];
  blank: T;
  onChange: (items: T[]) => void;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}

function Repeatable<T>({ title, items, blank, onChange, render }: RepeatableProps<T>) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...blank }])}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">None added yet.</p>
      )}
      {items.map((item, i) => (
        <Card key={i}>
          <CardContent className="relative p-4">
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="absolute right-3 top-3 text-muted-foreground hover:text-red-400"
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="pr-6">
              {render(item, (next) => onChange(items.map((it, idx) => (idx === i ? next : it))))}
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

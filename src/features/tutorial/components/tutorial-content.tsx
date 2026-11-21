"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  CompassIcon,
  EyeIcon,
  GraduationCapIcon,
  InfoIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToneBadge } from "@/components/ui/tone-badge";
import type { AppUser } from "@/lib/auth";
import { HumanizeRoleName } from "@/lib/roles";
import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_SECTIONS,
  type TutorialCategory,
  type TutorialSection,
} from "../tutorial-data";

function UserCanAccessSection(
  permissions: string[],
  section: TutorialSection,
): boolean {
  if (section.requiredPermissions.length === 0) return true;
  return section.requiredPermissions.some((p) => permissions.includes(p));
}

export function TutorialContent({ user }: { user: AppUser }) {
  const [filterMode, setFilterMode] = useState<"accessible" | "all">(
    "accessible",
  );
  const [selectedCategory, setSelectedCategory] =
    useState<TutorialCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const accessibleCount = useMemo(() => {
    return TUTORIAL_SECTIONS.filter((sec) =>
      UserCanAccessSection(user.permissions, sec),
    ).length;
  }, [user.permissions]);

  const displayedSections = useMemo(() => {
    return TUTORIAL_SECTIONS.filter((section) => {
      // 1. Accessibility filter
      if (
        filterMode === "accessible" &&
        !UserCanAccessSection(user.permissions, section)
      ) {
        return false;
      }
      // 2. Category filter
      if (selectedCategory !== "All" && section.category !== selectedCategory) {
        return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = section.title.toLowerCase().includes(query);
        const matchesSummary = section.summary.toLowerCase().includes(query);
        const matchesOverview = section.overview.toLowerCase().includes(query);
        const matchesCategory = section.category.toLowerCase().includes(query);
        const matchesRules = section.keyRules.some((rule) =>
          rule.toLowerCase().includes(query),
        );
        return (
          matchesTitle ||
          matchesSummary ||
          matchesOverview ||
          matchesCategory ||
          matchesRules
        );
      }
      return true;
    });
  }, [filterMode, selectedCategory, searchQuery, user.permissions]);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Role Context & Welcome Banner */}
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <GraduationCapIcon className="size-6" weight="fill" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-foreground">
                Tutorials tailored for{" "}
                {user.role ? HumanizeRoleName(user.role) : "your role"}
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                You currently have access to {accessibleCount} of{" "}
                {TUTORIAL_SECTIONS.length} factory system modules based on your
                assigned permissions.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={filterMode === "accessible" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("accessible")}
            >
              <CheckCircleIcon className="size-4" weight="bold" />
              My features ({accessibleCount})
            </Button>
            <Button
              variant={filterMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("all")}
            >
              <EyeIcon className="size-4" />
              All factory features ({TUTORIAL_SECTIONS.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prominent Two-Way Loan Callout */}
      <Card className="border-border/80 bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <ToneBadge tone="good">System Highlight</ToneBadge>
            <Badge variant="outline">Two-Way Balance Model</Badge>
          </div>
          <CardTitle className="text-lg">
            Understanding How Both-Way Loans & Deposits Work
          </CardTitle>
          <CardDescription>
            Unlike simple credit books, Adika Candle handles both customer debt
            and customer deposits in the same automated ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background p-3 shadow-xs">
              <span className="text-xs font-semibold text-primary">
                1. Customer Deposits
              </span>
              <p className="text-xs text-muted-foreground">
                Customer deposits cash upfront via{" "}
                <strong>Advance received</strong>. Balance becomes negative
                (Credit with you).
              </p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background p-3 shadow-xs">
              <span className="text-xs font-semibold text-primary">
                2. Overpaying Debt
              </span>
              <p className="text-xs text-muted-foreground">
                Customer owes 200 ETB, pays 500 ETB. The extra 300 ETB
                automatically becomes deposit credit on their account.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background p-3 shadow-xs">
              <span className="text-xs font-semibold text-primary">
                3. Buying From Credit
              </span>
              <p className="text-xs text-muted-foreground">
                Sale on account automatically burns credit first (
                <strong>ADVANCE_REDEEMED</strong>). Only the remainder becomes
                debt.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background p-3 shadow-xs">
              <span className="text-xs font-semibold text-primary">
                4. Void Protection
              </span>
              <p className="text-xs text-muted-foreground">
                Voiding a credit sale automatically returns redeemed credit back
                into the customer&apos;s deposit balance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <InfoIcon className="size-4 shrink-0 text-primary" />
            <span>
              See detailed walkthrough with step-by-step calculations in the{" "}
              <a
                href="#two-way-loans"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Two-Way Customer Loans section below
              </a>
              .
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <MagnifyingGlassIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tutorial topics or rules..."
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {displayedSections.length} of {TUTORIAL_SECTIONS.length}{" "}
            tutorials
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {TUTORIAL_CATEGORIES.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Table of contents quick navigation */}
      <nav
        aria-label="Tutorial Table of Contents"
        className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs"
      >
        <span className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Table of Contents
        </span>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {displayedSections.map((sec) => {
            const hasAccess = UserCanAccessSection(user.permissions, sec);
            return (
              <li key={sec.id}>
                <Link
                  href={`#${sec.id}`}
                  className="flex items-center gap-2 rounded-md p-1.5 text-xs text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="truncate font-medium">{sec.title}</span>
                  {!hasAccess && (
                    <LockKeyIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tutorial Sections List */}
      <div className="flex flex-col gap-10">
        {displayedSections.map((sec) => {
          const hasAccess = UserCanAccessSection(user.permissions, sec);

          return (
            <section
              key={sec.id}
              id={sec.id}
              className="scroll-mt-20 flex flex-col gap-4 rounded-xl border border-border/80 bg-card p-6 shadow-xs"
            >
              {/* Header */}
              <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {sec.category}
                    </span>
                    <Badge variant="secondary">{sec.badge}</Badge>
                    {hasAccess ? (
                      <ToneBadge tone="good">Accessible</ToneBadge>
                    ) : (
                      <ToneBadge tone="neutral">Requires higher role</ToneBadge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Required:{" "}
                    {sec.requiredPermissions.join(", ") || "All users"}
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {sec.title}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {sec.summary}
                </p>
              </div>

              {/* Overview */}
              <div className="text-sm leading-relaxed text-foreground/90">
                {sec.overview}
              </div>

              {/* Special Flow Highlight if present */}
              {sec.highlight && (
                <div className="my-2 flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <SparkleIcon
                      className="size-4 text-primary"
                      weight="fill"
                    />
                    {sec.highlight.title}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sec.highlight.description}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {sec.highlight.flow.map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col gap-1 rounded-md border border-border/60 bg-background p-3 shadow-2xs"
                      >
                        <ToneBadge tone={item.tone}>{item.label}</ToneBadge>
                        <span className="text-xs text-muted-foreground">
                          {item.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Business Rules */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Essential Business Rules
                </h4>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {sec.keyRules.map((rule) => (
                    <li
                      key={rule}
                      className="flex items-start gap-2 rounded-lg border border-border/50 bg-background/50 p-2.5 text-xs text-foreground/90"
                    >
                      <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step by step */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  How to Use This in the System
                </h4>
                <div className="flex flex-col gap-2.5">
                  {sec.stepByStep.map((s) => (
                    <div
                      key={s.step}
                      className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3"
                    >
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {s.step}
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <strong className="text-foreground">{s.title}</strong>
                        <span className="text-muted-foreground">
                          {s.instruction}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical Factory Scenario */}
              <Card size="sm" className="border-border/70 bg-muted/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CompassIcon className="size-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">
                      Real Scenario: {sec.practicalExample.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {sec.practicalExample.scenario}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-xs">
                  <ol className="flex flex-col gap-1 pl-4 list-decimal text-muted-foreground">
                    {sec.practicalExample.steps.map((step) => (
                      <li key={step} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-1 flex items-start gap-1.5 rounded-md bg-background/80 p-2 text-foreground">
                    <ArrowRightIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span className="font-medium">
                      <strong>Result:</strong> {sec.practicalExample.result}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </section>
          );
        })}
      </div>
    </div>
  );
}

"use client";

// FILE: rank-atlas.tsx
// Purpose: Renders the search flow and ranking results using stock shadcn primitives.
// Layer: Client component
// Exports: RankAtlas
// Depends on: /api/rankings, shadcn/ui primitives

import Image from "next/image";
import { FormEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowUpRight, Clock3, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { jetBrainsMono } from "@/lib/fonts";

type RankingResponse = {
  app: {
    trackId: number;
    trackName: string;
    artistName: string;
    bundleId: string;
    artworkUrl512: string;
    primaryGenreName: string;
    price: number;
    isFree: boolean;
    storeUrl: string;
    currentVersionReleaseDate: string | null;
  };
  chart: {
    label: "Top Free" | "Top Paid";
    limit: number;
    categoryName: string;
  };
  stats: {
    storefrontCount: number;
    rankedCount: number;
    unrankedCount: number;
    bestRank: number | null;
    bestCountries: string[];
  };
  rankings: Array<{
    countryCode: string;
    countryName: string;
    rank: number;
    storeUrl: string;
  }>;
  unranked: Array<{
    countryCode: string;
    countryName: string;
  }>;
  generatedAt: string;
};

const EXAMPLES = ["ChatGPT", "Remodex"];
const RECENT_SEARCHES_KEY = "rank-atlas-recent-searches";
const MAX_RECENT_SEARCHES = 5;

// ─── ENTRY POINT ─────────────────────────────────────────────

// Hosts the search form and switches between loading, error, and result states.
export function RankAtlas() {
  const [query, setQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
  const searchAreaRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedSharedQueryRef = useRef(false);

  const handleSharedQuery = useEffectEvent((sharedQuery: string) => {
    setQuery(sharedQuery);
    void handleSubmit(undefined, sharedQuery);
  });

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(RECENT_SEARCHES_KEY);

      if (!storedValue) {
        return;
      }

      const parsed = JSON.parse(storedValue) as unknown;

      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT_SEARCHES));
      }
    } catch {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchAreaRef.current?.contains(event.target as Node)) {
        setIsSearchPopoverOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (hasLoadedSharedQueryRef.current) {
      return;
    }

    hasLoadedSharedQueryRef.current = true;

    const sharedQuery = readSharedAppQuery();

    if (!sharedQuery) {
      return;
    }

    handleSharedQuery(sharedQuery);
  }, []);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>, nextQuery?: string) {
    event?.preventDefault();

    const candidate = (nextQuery ?? query).trim();

    if (!candidate) {
      setError("Type an app name, bundle id, or App Store URL first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsSearchPopoverOpen(false);

    try {
      const response = await fetch(`/api/rankings?app=${encodeURIComponent(candidate)}`);
      const payload = (await response.json()) as RankingResponse | { error?: string };

      if (!response.ok || !("app" in payload)) {
        const message = "error" in payload ? payload.error : undefined;
        throw new Error(message ?? "Unable to fetch rankings right now.");
      }

      const resolvedQuery = payload.app.trackName.trim();

      setData(payload);
      setQuery(resolvedQuery);
      setCountryQuery("");
      setRecentSearches((current) => saveRecentSearches(resolvedQuery, current));
      syncSharedAppQuery(resolvedQuery);
    } catch (requestError) {
      setData(null);
      setError(requestError instanceof Error ? requestError.message : "Unable to fetch rankings right now.");
    } finally {
      setIsLoading(false);
    }
  }

  const normalizedCountryQuery = countryQuery.trim().toLowerCase();
  const filteredRankings = data
    ? data.rankings.filter((entry) => matchesCountryQuery(entry.countryName, entry.countryCode, normalizedCountryQuery))
    : [];
  const filteredUnranked = data
    ? data.unranked.filter((entry) => matchesCountryQuery(entry.countryName, entry.countryCode, normalizedCountryQuery))
    : [];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="animate-in fade-in slide-in-from-bottom-2 duration-500 border-b pb-6 sm:pb-8">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase">
              RankApp
            </Badge>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              Check an app&apos;s category ranking across countries.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Search by app name, App Store URL, app id, or bundle id. Results are ordered from strongest rank to
              lowest visible chart position.
            </p>
          </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-2 mt-6 duration-500 sm:mt-8">
          <form onSubmit={(event) => void handleSubmit(event)} className="rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5">
                  <label htmlFor="app-query" className="text-sm font-medium">
                    App lookup
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Enter one app and compare its primary category globally.
                  </p>
                  <p className="max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
                    Uses Apple&apos;s public Top 100 category feeds. Countries without a visible rank appear below.
                  </p>
              </div>

              <div ref={searchAreaRef} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="app-query"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => setIsSearchPopoverOpen(true)}
                    onClick={() => setIsSearchPopoverOpen(true)}
                    placeholder="Instagram, com.openai.chat, or an App Store URL"
                    className="h-12 pl-9 text-base sm:h-11"
                  />

                  {isSearchPopoverOpen && (recentSearches.length > 0 || EXAMPLES.length > 0) ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-[55svh] overflow-y-auto rounded-2xl border bg-popover p-3 shadow-lg">
                      {recentSearches.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Recent research
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {recentSearches.map((recentSearch) => (
                              <Button
                                key={recentSearch}
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="rounded-full"
                                onClick={() => {
                                  setQuery(recentSearch);
                                  void handleSubmit(undefined, recentSearch);
                                }}
                              >
                                {recentSearch}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {recentSearches.length > 0 && EXAMPLES.length > 0 ? <Separator /> : null}

                      {EXAMPLES.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Starter apps
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {EXAMPLES.map((example) => (
                              <Button
                                key={example}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => {
                                  setQuery(example);
                                  void handleSubmit(undefined, example);
                                }}
                              >
                                {example}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <Button type="submit" disabled={isLoading} className="h-12 w-full sm:h-11 sm:w-auto sm:px-6">
                  {isLoading ? "Loading..." : "Search"}
                </Button>
              </div>

              {recentSearches.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    Last 5 research
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((recentSearch) => (
                      <Button
                        key={recentSearch}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-full px-3 sm:h-auto sm:min-h-11 sm:px-4 sm:py-3"
                        onClick={() => {
                          setQuery(recentSearch);
                          void handleSubmit(undefined, recentSearch);
                        }}
                      >
                        {recentSearch}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Quick picks
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((example) => (
                      <Button
                        key={example}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          setQuery(example);
                          void handleSubmit(undefined, example);
                        }}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </section>

        {error ? (
          <section className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:mt-6">
            {error}
          </section>
        ) : null}

        {isLoading ? <LoadingState /> : null}

        {data ? (
          <section className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="animate-in fade-in slide-in-from-bottom-2 duration-500 lg:sticky lg:top-6 lg:self-start">
              <AppSummary data={data} />
            </aside>

            <div className="space-y-6">
              <section className="animate-in fade-in slide-in-from-bottom-2 rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Country filter</div>
                    <p className="text-sm text-muted-foreground">
                      Narrow the storefront results by country name or country code.
                    </p>
                  </div>

                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={countryQuery}
                      onChange={(event) => setCountryQuery(event.target.value)}
                      placeholder="Search countries"
                      className="h-10 rounded-full pl-9"
                    />
                  </div>
                </div>
              </section>

              <RankList data={data} rankings={filteredRankings} countryQuery={countryQuery} />
              <NoRankList data={data} unranked={filteredUnranked} countryQuery={countryQuery} />
            </div>
          </section>
        ) : null}
      </div>

      <div className="fixed bottom-3 right-3 z-30 sm:bottom-4 sm:right-4">
        <a
          href="https://apps.apple.com/us/app/remodex-remote-ai-coding/id6760243963"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-2xl border bg-background/92 px-3 py-2 shadow-sm backdrop-blur transition-colors hover:bg-muted/70"
        >
          <Image
            src="/remodex-icon.png"
            alt="Remodex icon"
            width={20}
            height={20}
            className="h-5 w-5 rounded-lg"
          />
          <span
            className={`${jetBrainsMono.className} text-[10px] font-medium tracking-[0.04em] text-muted-foreground sm:text-[11px]`}
          >
            Made with Remodex
          </span>
        </a>
      </div>
    </main>
  );
}

// ─── UI sections ─────────────────────────────────────────────

function AppSummary({ data }: { data: RankingResponse }) {
  const lastUpdatedLabel = data.app.currentVersionReleaseDate
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(data.app.currentVersionReleaseDate))
    : "Unknown";

  return (
    <section className="rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="space-y-3 sm:space-y-4">
        <Image
          src={data.app.artworkUrl512}
          alt={`${data.app.trackName} icon`}
          width={80}
          height={80}
          className="h-16 w-16 rounded-[1.35rem] object-cover sm:h-20 sm:w-20 sm:rounded-[1.6rem]"
        />

        <div className="min-w-0 space-y-2 sm:space-y-3">
          <Badge variant="secondary" className="rounded-full">
            {data.chart.label}
          </Badge>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{data.app.trackName}</h2>
            <p className="text-sm text-muted-foreground">{data.app.artistName}</p>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      <dl className="space-y-4 text-sm">
        <MetaRow label="Category" value={data.chart.categoryName} />
        <MetaRow label="Bundle ID" value={data.app.bundleId} mono />
        <MetaRow label="Version date" value={lastUpdatedLabel} />
      </dl>

      <Separator className="my-6" />

      <div className="space-y-4">
        <StatLine
          label="Best detected rank"
          value={data.stats.bestRank ? `#${data.stats.bestRank}` : "No rank found"}
          detail={data.stats.bestCountries.join(", ") || "Not visible in the current public chart snapshot"}
        />
        <StatLine
          label="Storefront coverage"
          value={`${data.stats.rankedCount}/${data.stats.storefrontCount}`}
          detail={`${data.stats.unrankedCount} storefronts without a visible chart position`}
        />
      </div>

      <Button
        nativeButton={false}
        render={<a href={data.app.storeUrl} target="_blank" rel="noreferrer" />}
        variant="outline"
        className="mt-6 h-11 w-full justify-between"
      >
        Open App Store page
        <ArrowUpRight className="size-4" />
      </Button>
    </section>
  );
}

function RankList({
  data,
  rankings,
  countryQuery,
}: {
  data: RankingResponse;
  rankings: RankingResponse["rankings"];
  countryQuery: string;
}) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 rounded-3xl border bg-card shadow-sm">
      <header className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-5">
        <div className="space-y-2">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase">
            Rankings
          </Badge>
          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {data.app.trackName} in {data.chart.categoryName}
          </h3>
        </div>

        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          Ordered from best detected country rank to lowest visible chart placement.
        </p>
      </header>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        {rankings.length > 0 ? (
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rankings.map((entry, index) => (
              <li
                key={entry.countryCode}
                className="animate-in fade-in slide-in-from-bottom-1"
                style={{ animationDelay: `${index * 24}ms` }}
              >
                <a
                  href={entry.storeUrl || data.app.storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full flex-col justify-between rounded-2xl border bg-background/70 p-3 transition-colors hover:bg-muted/40 sm:p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">{countryCodeToFlag(entry.countryCode)}</span>
                        <span className="text-sm font-medium leading-5 sm:text-base">{entry.countryName}</span>
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {entry.countryCode.toUpperCase()}
                      </div>
                    </div>

                    <Badge variant="secondary" className="shrink-0 rounded-full text-xs font-semibold sm:text-sm">
                      #{entry.rank}
                    </Badge>
                  </div>
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <div className="py-8 text-sm text-muted-foreground">
            {countryQuery
              ? "No ranked countries match the current filter."
              : "No Top 100 category placements were detected for this app right now."}
          </div>
        )}
      </div>
    </section>
  );
}

function NoRankList({
  data,
  unranked,
  countryQuery,
}: {
  data: RankingResponse;
  unranked: RankingResponse["unranked"];
  countryQuery: string;
}) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 rounded-3xl border bg-card shadow-sm">
      <header className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-5">
        <div className="space-y-2">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase">
            Not ranked
          </Badge>
          <h3 className="text-lg font-semibold tracking-tight sm:text-xl">Storefronts outside the visible Top 100</h3>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          These storefronts did not expose a category rank in the public Apple feed snapshot.
        </p>
      </header>

      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6 sm:py-5 xl:grid-cols-3">
        {unranked.length > 0 ? (
          unranked.map((entry) => (
          <div key={entry.countryCode} className="flex items-center justify-between rounded-2xl border bg-background/70 p-3 text-sm sm:p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{countryCodeToFlag(entry.countryCode)}</span>
                <span className="truncate text-foreground">{entry.countryName}</span>
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {entry.countryCode.toUpperCase()}
              </div>
            </div>

            <Badge variant="outline" className="shrink-0 rounded-full text-xs">
              No rank
            </Badge>
          </div>
          ))
        ) : (
          <div className="sm:col-span-2 xl:col-span-3 py-8 text-sm text-muted-foreground">
            {countryQuery ? "No unranked countries match the current filter." : "All visible countries are ranked."}
          </div>
        )}
      </div>

      <div className="border-t px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground sm:px-6">
        Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generatedAt))}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
        <Skeleton className="h-16 w-16 rounded-[1.35rem] sm:h-20 sm:w-20 sm:rounded-[1.6rem]" />
        <Skeleton className="mt-6 h-5 w-24" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Separator className="my-6" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-3 h-8 w-72" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs sm:text-sm" : "text-sm"}>{value}</dd>
    </div>
  );
}

function StatLine({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-sm leading-6 text-muted-foreground">{detail}</div>
    </div>
  );
}

function countryCodeToFlag(countryCode: string) {
  const normalized = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return "🏳";
  }

  return String.fromCodePoint(...Array.from(normalized).map((char) => 127397 + char.charCodeAt(0)));
}

function matchesCountryQuery(countryName: string, countryCode: string, query: string) {
  if (!query) {
    return true;
  }

  return countryName.toLowerCase().includes(query) || countryCode.toLowerCase().includes(query);
}

function saveRecentSearches(candidate: string, current: string[]) {
  const nextValue = [candidate, ...current.filter((entry) => entry.toLowerCase() !== candidate.toLowerCase())].slice(
    0,
    MAX_RECENT_SEARCHES,
  );

  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextValue));
  } catch {
    // Ignore storage errors so the search flow still works in restricted environments.
  }

  return nextValue;
}

function readSharedAppQuery() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("app")?.trim() ?? "";
}

function syncSharedAppQuery(appName: string) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  if (appName) {
    url.searchParams.set("app", appName);
  } else {
    url.searchParams.delete("app");
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

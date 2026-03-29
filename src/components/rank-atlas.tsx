"use client";

// FILE: rank-atlas.tsx
// Purpose: Renders the search flow and responsive results interface for storefront ranking data.
// Layer: Client component
// Exports: RankAtlas
// Depends on: /api/rankings

import { FormEvent, useState } from "react";

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
  sourceNote: string;
};

const EXAMPLES = [
  "Instagram",
  "ChatGPT",
  "CapCut",
  "https://apps.apple.com/us/app/instagram/id389801252",
];

// ─── ENTRY POINT ─────────────────────────────────────────────

// Hosts the ranking query form and swaps between idle, loading, error, and loaded states.
export function RankAtlas() {
  const [query, setQuery] = useState("Instagram");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>, nextQuery?: string) {
    event?.preventDefault();

    const candidate = (nextQuery ?? query).trim();

    if (!candidate) {
      setError("Type an app name, bundle id, or App Store URL first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rankings?app=${encodeURIComponent(candidate)}`);
      const payload = (await response.json()) as RankingResponse | { error?: string };

      if (!response.ok || !("app" in payload)) {
        throw new Error(payload.error ?? "Unable to fetch rankings right now.");
      }

      setData(payload);
      setQuery(candidate);
    } catch (requestError) {
      setData(null);
      setError(requestError instanceof Error ? requestError.message : "Unable to fetch rankings right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--surface-0)] text-[var(--text-strong)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-orb hero-orb-left" />
        <div className="hero-orb hero-orb-right" />
        <div className="grid-haze" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="reveal border-b border-white/10 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.32em] text-[var(--text-muted)]">
                Rank Atlas
              </span>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-balance text-white sm:text-5xl lg:text-6xl">
                Find an app&apos;s category rank across Apple storefronts.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-[var(--text-soft)] sm:text-base">
                Search by name, App Store URL, app id, or bundle id. Results are sorted from best rank to lowest
                detected chart position.
              </p>
            </div>

            <div className="flex flex-col gap-3 text-sm text-[var(--text-muted)] sm:items-end">
              <span>All Apple-supported storefronts</span>
              <span>Category charts from Apple&apos;s public Top 100 feeds</span>
            </div>
          </div>
        </header>

        <section className="reveal mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-7"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
            <div className="flex flex-col gap-4">
              <label htmlFor="app-query" className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">
                Search input
              </label>

              <div className="flex flex-col gap-3 xl:flex-row">
                <input
                  id="app-query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Instagram, com.openai.chat, or an App Store URL"
                  className="min-h-14 flex-1 rounded-full border border-white/12 bg-black/30 px-5 text-base text-white outline-none transition focus:border-[var(--accent)] focus:bg-black/40"
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="min-h-14 rounded-full bg-[var(--accent)] px-6 text-sm font-medium tracking-[0.18em] text-[var(--surface-0)] uppercase transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? "Scanning..." : "Run ranking"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      void handleSubmit(undefined, example);
                    }}
                    className="rounded-full border border-white/10 px-3 py-2 text-xs tracking-[0.18em] text-[var(--text-soft)] uppercase transition hover:border-[var(--accent)] hover:text-white"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </form>

          <div className="reveal flex min-h-[14rem] flex-col justify-between rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 sm:p-7">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">
                Coverage note
              </span>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--text-soft)]">
                This surface uses Apple&apos;s public category feeds, so ranks are available when the app appears in a
                storefront&apos;s Top 100 chart for its primary category.
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5 text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Search once, compare globally
            </div>
          </div>
        </section>

        {error ? (
          <section className="reveal mt-6 rounded-[1.5rem] border border-[color:rgba(255,130,92,0.45)] bg-[color:rgba(255,130,92,0.08)] px-5 py-4 text-sm text-[color:#ffd4c8]">
            {error}
          </section>
        ) : null}

        {isLoading ? <LoadingState /> : null}

        {data ? (
          <section className="mt-10 grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="reveal lg:sticky lg:top-6 lg:self-start">
              <AppSummary data={data} />
            </aside>

            <div className="space-y-8">
              <RankList data={data} />
              <NoRankList data={data} />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

// ─── UI sections ─────────────────────────────────────────────

function AppSummary({ data }: { data: RankingResponse }) {
  const lastUpdatedLabel = data.app.currentVersionReleaseDate
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
      }).format(new Date(data.app.currentVersionReleaseDate))
    : "Unknown";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <img
          src={data.app.artworkUrl512}
          alt={`${data.app.trackName} icon`}
          className="h-20 w-20 rounded-[1.5rem] object-cover shadow-[0_30px_60px_rgba(0,0,0,0.35)]"
        />

        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">Selected app</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{data.app.trackName}</h2>
          <p className="mt-1 text-sm text-[var(--text-soft)]">{data.app.artistName}</p>
        </div>
      </div>

      <dl className="mt-8 space-y-4 border-t border-white/10 pt-5 text-sm">
        <MetaRow label="Category" value={data.chart.categoryName} />
        <MetaRow label="Chart type" value={data.chart.label} />
        <MetaRow label="Bundle ID" value={data.app.bundleId} mono />
        <MetaRow label="Version date" value={lastUpdatedLabel} />
      </dl>

      <div className="mt-8 space-y-4 border-t border-white/10 pt-5">
        <StatLine
          label="Best detected rank"
          value={data.stats.bestRank ? `#${data.stats.bestRank}` : "No chart position"}
          detail={data.stats.bestCountries.join(", ") || "Not detected in Apple Top 100 feeds"}
        />
        <StatLine
          label="Storefront coverage"
          value={`${data.stats.rankedCount}/${data.stats.storefrontCount}`}
          detail={`${data.stats.unrankedCount} storefronts with no chart position`}
        />
      </div>

      <a
        href={data.app.storeUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-8 inline-flex items-center rounded-full border border-white/12 px-4 py-3 text-xs font-medium uppercase tracking-[0.22em] text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        Open App Store page
      </a>
    </section>
  );
}

function RankList({ data }: { data: RankingResponse }) {
  return (
    <section className="reveal overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
      <header className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">Detected ranks</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
            {data.app.trackName} in {data.chart.categoryName}
          </h3>
        </div>

        <p className="max-w-sm text-sm leading-6 text-[var(--text-soft)]">
          Sorted from strongest position to lowest detected chart placement.
        </p>
      </header>

      <div className="px-5 pb-2 pt-4 sm:px-6">
        <div className="flex items-center justify-between border-b border-white/8 pb-3 text-[0.68rem] font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">
          <span>Country</span>
          <span>Rank</span>
        </div>
      </div>

      <ol className="px-5 pb-4 sm:px-6">
        {data.rankings.length > 0 ? (
          data.rankings.map((entry, index) => (
            <li
              key={entry.countryCode}
              className="rank-row reveal border-b border-white/8 last:border-b-0"
              style={{ animationDelay: `${index * 28}ms` }}
            >
              <a
                href={entry.storeUrl || data.app.storeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 py-4 transition hover:text-white"
              >
                <div className="min-w-0">
                  <div className="text-lg text-white">{entry.countryName}</div>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    {entry.countryCode.toUpperCase()}
                  </div>
                </div>

                <span className="text-xl font-semibold tracking-[-0.04em] text-[var(--accent)]">#{entry.rank}</span>
              </a>
            </li>
          ))
        ) : (
          <li className="py-8 text-sm text-[var(--text-soft)]">
            No Top 100 category placements were detected for this app right now.
          </li>
        )}
      </ol>
    </section>
  );
}

function NoRankList({ data }: { data: RankingResponse }) {
  return (
    <section className="reveal rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">No chart position</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">Storefronts outside the Top 100</h3>
        </div>
        <p className="max-w-md text-sm leading-6 text-[var(--text-soft)]">
          These storefronts did not expose a category rank for the app in Apple&apos;s public feed snapshot.
        </p>
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.unranked.map((entry) => (
          <div key={entry.countryCode} className="flex items-center justify-between border-b border-white/8 py-2 text-sm">
            <span className="text-[var(--text-soft)]">{entry.countryName}</span>
            <span className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
              {entry.countryCode.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
        Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generatedAt))}
      </p>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="reveal mt-10 grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="h-[24rem] rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="skeleton h-20 w-20 rounded-[1.5rem]" />
        <div className="skeleton mt-6 h-5 w-32 rounded-full" />
        <div className="skeleton mt-3 h-10 w-44 rounded-full" />
        <div className="skeleton mt-8 h-px w-full rounded-full" />
        <div className="space-y-3 pt-5">
          <div className="skeleton h-5 w-full rounded-full" />
          <div className="skeleton h-5 w-5/6 rounded-full" />
          <div className="skeleton h-5 w-2/3 rounded-full" />
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="skeleton h-5 w-24 rounded-full" />
        <div className="skeleton mt-3 h-10 w-80 rounded-full" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton h-14 w-full rounded-[1.2rem]" />
          ))}
        </div>
      </div>
    </section>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-white sm:text-sm" : "text-sm text-white"}>{value}</dd>
    </div>
  );
}

function StatLine({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</div>
      <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="text-sm leading-6 text-[var(--text-soft)]">{detail}</div>
    </div>
  );
}


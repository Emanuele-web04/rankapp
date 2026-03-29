// FILE: app-store.ts
// Purpose: Resolves an App Store app from free-form input and collects category chart ranks per storefront.
// Layer: Data service
// Exports: getAppRankings, storefront constants, shared response types
// Depends on: Apple Search API, Apple legacy RSS chart feeds

// ─── Shared types ────────────────────────────────────────────

export type RankedStorefront = {
  countryCode: string;
  countryName: string;
  rank: number;
  storeUrl: string;
};

export type UnrankedStorefront = {
  countryCode: string;
  countryName: string;
};

export type RankingApp = {
  trackId: number;
  trackName: string;
  artistName: string;
  bundleId: string;
  artworkUrl512: string;
  primaryGenreId: number;
  primaryGenreName: string;
  price: number;
  isFree: boolean;
  storeUrl: string;
  currentVersionReleaseDate: string | null;
};

export type RankingResponse = {
  app: RankingApp;
  chart: {
    label: "Top Free" | "Top Paid";
    path: "topfreeapplications" | "toppaidapplications";
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
  rankings: RankedStorefront[];
  unranked: UnrankedStorefront[];
  generatedAt: string;
  sourceNote: string;
};

type AppleSearchResult = {
  artistName: string;
  artworkUrl512?: string;
  bundleId: string;
  currentVersionReleaseDate?: string;
  price: number;
  primaryGenreId: number;
  primaryGenreName: string;
  trackId: number;
  trackName: string;
  trackViewUrl: string;
  wrapperType?: string;
};

type AppleLookupResponse = {
  resultCount: number;
  results: AppleSearchResult[];
};

type AppleFeedEntry = {
  id?: {
    label?: string;
    attributes?: {
      "im:id"?: string;
    };
  };
  link?:
    | {
        attributes?: {
          href?: string;
        };
      }
    | Array<{
        attributes?: {
          href?: string;
        };
      }>;
};

type AppleFeedResponse = {
  feed?: {
    entry?: AppleFeedEntry[];
  };
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

// ─── Constants ───────────────────────────────────────────────

const FEED_LIMIT = 100;
const REQUEST_TIMEOUT_MS = 8_000;
const LOOKUP_COUNTRIES = ["us", "gb", "it", "de", "fr", "jp", "br", "ca", "au", "kr"] as const;
const APPLE_STOREFRONT_CODES = [
  "af",
  "al",
  "dz",
  "ao",
  "ai",
  "ag",
  "ar",
  "am",
  "au",
  "at",
  "az",
  "bs",
  "bh",
  "bb",
  "by",
  "be",
  "bz",
  "bj",
  "bm",
  "bt",
  "bo",
  "ba",
  "bw",
  "br",
  "vg",
  "bn",
  "bg",
  "bf",
  "kh",
  "cm",
  "ca",
  "cv",
  "ky",
  "td",
  "cl",
  "cn",
  "co",
  "cr",
  "hr",
  "cy",
  "cz",
  "ci",
  "cd",
  "dk",
  "dm",
  "do",
  "ec",
  "eg",
  "sv",
  "ee",
  "sz",
  "fj",
  "fi",
  "fr",
  "ga",
  "gm",
  "ge",
  "de",
  "gh",
  "gr",
  "gd",
  "gt",
  "gw",
  "gy",
  "hn",
  "hk",
  "hu",
  "is",
  "in",
  "id",
  "iq",
  "ie",
  "il",
  "it",
  "jm",
  "jp",
  "jo",
  "kz",
  "ke",
  "kr",
  "xk",
  "kw",
  "kg",
  "la",
  "lv",
  "lb",
  "lr",
  "ly",
  "lt",
  "lu",
  "mo",
  "mg",
  "mw",
  "my",
  "mv",
  "ml",
  "mt",
  "mr",
  "mu",
  "mx",
  "fm",
  "md",
  "mn",
  "me",
  "ms",
  "ma",
  "mz",
  "mm",
  "na",
  "nr",
  "np",
  "nl",
  "nz",
  "ni",
  "ne",
  "ng",
  "mk",
  "no",
  "om",
  "pk",
  "pw",
  "pa",
  "pg",
  "py",
  "pe",
  "ph",
  "pl",
  "pt",
  "qa",
  "cg",
  "ro",
  "ru",
  "rw",
  "sa",
  "sn",
  "rs",
  "sc",
  "sl",
  "sg",
  "sk",
  "si",
  "sb",
  "za",
  "es",
  "lk",
  "kn",
  "lc",
  "vc",
  "sr",
  "se",
  "ch",
  "st",
  "tw",
  "tj",
  "tz",
  "th",
  "to",
  "tt",
  "tn",
  "tm",
  "tc",
  "tr",
  "ae",
  "ug",
  "ua",
  "gb",
  "us",
  "uy",
  "uz",
  "vu",
  "ve",
  "vn",
  "ye",
  "zm",
  "zw",
] as const;

const COUNTRY_OVERRIDES: Record<string, string> = {
  ae: "United Arab Emirates",
  cd: "Democratic Republic of the Congo",
  cg: "Republic of the Congo",
  ci: "Cote d'Ivoire",
  hk: "Hong Kong",
  mo: "Macao",
  st: "Sao Tome and Principe",
  tw: "Taiwan",
  xk: "Kosovo",
};

const jsonCache = new Map<string, CacheEntry<unknown>>();
const rankingsCache = new Map<string, CacheEntry<RankingResponse>>();
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// ─── Public entry point ──────────────────────────────────────

// Resolves one app and computes its category rank across every Apple storefront.
export async function getAppRankings(rawQuery: string): Promise<RankingResponse> {
  const query = rawQuery.trim();
  const cacheKey = query.toLowerCase();
  const cached = readCache(rankingsCache, cacheKey);

  if (cached) {
    return cached;
  }

  const app = await resolveApp(query);
  const chartPath = app.price > 0 ? "toppaidapplications" : "topfreeapplications";
  const chartLabel = app.price > 0 ? "Top Paid" : "Top Free";

  const results = await mapWithConcurrency(APPLE_STOREFRONT_CODES, 16, async (countryCode) => {
    try {
      return await fetchCountryRanking(countryCode, chartPath, app.primaryGenreId, app.trackId);
    } catch {
      return {
        countryCode,
        countryName: getCountryName(countryCode),
        rank: null,
        storeUrl: app.storeUrl,
      };
    }
  });

  const rankings = results
    .filter((result): result is RankedStorefront & { rank: number } => result.rank !== null)
    .sort((left, right) => left.rank - right.rank || left.countryName.localeCompare(right.countryName))
    .map(({ rank, ...result }) => ({ ...result, rank }));

  const unranked = results
    .filter((result) => result.rank === null)
    .map(({ countryCode, countryName }) => ({ countryCode, countryName }))
    .sort((left, right) => left.countryName.localeCompare(right.countryName));

  const bestRank = rankings[0]?.rank ?? null;
  const bestCountries = bestRank
    ? rankings.filter((entry) => entry.rank === bestRank).map((entry) => entry.countryName)
    : [];

  const payload: RankingResponse = {
    app,
    chart: {
      label: chartLabel,
      path: chartPath,
      limit: FEED_LIMIT,
      categoryName: app.primaryGenreName,
    },
    stats: {
      storefrontCount: APPLE_STOREFRONT_CODES.length,
      rankedCount: rankings.length,
      unrankedCount: unranked.length,
      bestRank,
      bestCountries,
    },
    rankings,
    unranked,
    generatedAt: new Date().toISOString(),
    sourceNote: "Apple Search API for app resolution, then Apple legacy RSS charts for top-100 category positions per storefront.",
  };

  writeCache(rankingsCache, cacheKey, payload, 5 * 60 * 1000);

  return payload;
}

// ─── App resolution helpers ──────────────────────────────────

// Finds the best matching app for an App Store URL, numeric app id, bundle id, or free-form name.
async function resolveApp(query: string): Promise<RankingApp> {
  if (!query) {
    throw new Error("Enter an app name, App Store URL, app id, or bundle id.");
  }

  const appIdMatch = query.match(/id(\d{5,})/i);

  if (appIdMatch) {
    const byId = await lookupAcrossCountries(`id=${appIdMatch[1]}`);

    if (byId) {
      return toRankingApp(byId);
    }
  }

  if (/^\d{5,}$/.test(query)) {
    const byId = await lookupAcrossCountries(`id=${query}`);

    if (byId) {
      return toRankingApp(byId);
    }
  }

  if (/^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/i.test(query)) {
    const byBundleId = await lookupAcrossCountries(`bundleId=${encodeURIComponent(query)}`);

    if (byBundleId) {
      return toRankingApp(byBundleId);
    }
  }

  const bySearch = await searchAcrossCountries(query);

  if (bySearch) {
    return toRankingApp(bySearch);
  }

  throw new Error(`No App Store match found for "${query}".`);
}

// Tries exact id/bundle lookup in a handful of major storefronts to avoid false negatives.
async function lookupAcrossCountries(paramString: string): Promise<AppleSearchResult | null> {
  for (const countryCode of LOOKUP_COUNTRIES) {
    const url = `https://itunes.apple.com/lookup?country=${countryCode}&${paramString}`;
    const response = await fetchJson<AppleLookupResponse>(url);
    const match = response.results.find((result) => result.wrapperType === "software");

    if (match) {
      return match;
    }
  }

  return null;
}

// Scores search results so direct track-name and bundle matches beat loose title similarity.
async function searchAcrossCountries(query: string): Promise<AppleSearchResult | null> {
  const normalizedQuery = normalize(query);
  let bestMatch: AppleSearchResult | null = null;
  let bestScore = -1;

  for (const countryCode of LOOKUP_COUNTRIES) {
    const searchUrl = new URL("https://itunes.apple.com/search");
    searchUrl.searchParams.set("country", countryCode);
    searchUrl.searchParams.set("entity", "software");
    searchUrl.searchParams.set("term", query);
    searchUrl.searchParams.set("limit", "12");

    const response = await fetchJson<AppleLookupResponse>(searchUrl.toString());

    for (const result of response.results) {
      const score = scoreSearchResult(result, normalizedQuery);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }

    if (bestScore >= 110) {
      break;
    }
  }

  return bestScore >= 45 ? bestMatch : null;
}

function scoreSearchResult(result: AppleSearchResult, normalizedQuery: string): number {
  const name = normalize(result.trackName);
  const seller = normalize(result.artistName);
  const bundleId = normalize(result.bundleId);

  if (bundleId === normalizedQuery) {
    return 130;
  }

  if (name === normalizedQuery) {
    return 120;
  }

  if (name.startsWith(normalizedQuery)) {
    return 95;
  }

  if (name.includes(normalizedQuery)) {
    return 70;
  }

  if (seller.includes(normalizedQuery)) {
    return 50;
  }

  return 0;
}

function toRankingApp(result: AppleSearchResult): RankingApp {
  return {
    trackId: result.trackId,
    trackName: result.trackName,
    artistName: result.artistName,
    bundleId: result.bundleId,
    artworkUrl512: result.artworkUrl512 ?? "",
    primaryGenreId: result.primaryGenreId,
    primaryGenreName: result.primaryGenreName,
    price: result.price,
    isFree: result.price === 0,
    storeUrl: result.trackViewUrl,
    currentVersionReleaseDate: result.currentVersionReleaseDate ?? null,
  };
}

// ─── Ranking fetch helpers ───────────────────────────────────

// Checks one storefront chart and returns the rank when the target app appears in the category feed.
async function fetchCountryRanking(
  countryCode: string,
  chartPath: "topfreeapplications" | "toppaidapplications",
  genreId: number,
  trackId: number,
): Promise<RankedStorefront | (UnrankedStorefront & { rank: null; storeUrl: string })> {
  const url = `https://itunes.apple.com/${countryCode}/rss/${chartPath}/limit=${FEED_LIMIT}/genre=${genreId}/json`;
  const response = await fetchJson<AppleFeedResponse>(url);
  const entries = response.feed?.entry ?? [];
  const matchIndex = entries.findIndex((entry) => getEntryTrackId(entry) === String(trackId));

  if (matchIndex === -1) {
    return {
      countryCode,
      countryName: getCountryName(countryCode),
      rank: null,
      storeUrl: "",
    };
  }

  return {
    countryCode,
    countryName: getCountryName(countryCode),
    rank: matchIndex + 1,
    storeUrl: getEntryStoreUrl(entries[matchIndex]) ?? "",
  };
}

function getEntryTrackId(entry: AppleFeedEntry): string | null {
  return entry.id?.attributes?.["im:id"] ?? null;
}

function getEntryStoreUrl(entry: AppleFeedEntry): string | null {
  if (Array.isArray(entry.link)) {
    return entry.link[0]?.attributes?.href ?? entry.id?.label ?? null;
  }

  return entry.link?.attributes?.href ?? entry.id?.label ?? null;
}

// ─── Fetch and cache utilities ───────────────────────────────

// Wraps fetch with a short timeout and TTL cache so repeated searches stay responsive.
async function fetchJson<T>(url: string): Promise<T> {
  const cached = readCache<T>(jsonCache, url);

  if (cached) {
    return cached;
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Apple request failed with ${response.status} for ${url}`);
  }

  const payload = (await response.json()) as T;
  writeCache(jsonCache, url, payload, 15 * 60 * 1000);

  return payload;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (true) {
        const currentIndex = cursor;
        cursor += 1;

        if (currentIndex >= items.length) {
          return;
        }

        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }),
  );

  return results;
}

function readCache<T>(cache: Map<string, CacheEntry<unknown>>, key: string): T | null {
  const hit = cache.get(key);

  if (!hit) {
    return null;
  }

  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return hit.value as T;
}

function writeCache<T>(cache: Map<string, CacheEntry<unknown>>, key: string, value: T, ttl: number) {
  cache.set(key, {
    expiresAt: Date.now() + ttl,
    value,
  });
}

// ─── Formatting helpers ──────────────────────────────────────

function getCountryName(countryCode: string): string {
  return COUNTRY_OVERRIDES[countryCode] ?? regionNames.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}


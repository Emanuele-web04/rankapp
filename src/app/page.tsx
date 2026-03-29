// FILE: page.tsx
// Purpose: Serves the single-page Rank Atlas experience.
// Layer: App Router page
// Exports: Home
// Depends on: src/components/rank-atlas.tsx

import { RankAtlas } from "@/components/rank-atlas";

// ─── ENTRY POINT ─────────────────────────────────────────────

// Renders the full ranking interface.
export default function Home() {
  return <RankAtlas />;
}

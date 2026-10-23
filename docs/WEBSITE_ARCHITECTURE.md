# KLYRA website architecture

This is the master plan for klyra.lol. The KLYRA homepage is the central platform hub. Each game is a full mini-site at `/games/<slug>/`, sharing the domain, the KLYRA account, the global nav and footer and the design foundations, with its own identity and sub-nav. (This replaces `WEBSITE_IMPLEMENTATION_PLAN.md`.)

Ground rules: no invented dates, player counts, features or games. Nothing is described as available unless it is released. Account, auth, purchase and download flows are not changed by this work.

---

## 1. Current framework and routing

- **Stack:** Next.js App Router, static export (`next build` → `out/`), hosted on Cloudflare Pages project `klyra`. Production = `main`. Previews deploy with `--branch <name>`. Deploys overlay the previous deploy directory so old hashed `_next` chunks stay available.
- **Styling:** a single `app/globals.css`, organised by prefix: `kx*` Broken Front, `m*`/`kh*`/`kp*` KLYRA platform, `rl*` Redline, `g*` shared game components, `sec*` game sub-navs, `kg*` store.
- **Shared shell:** `app/layout.jsx` → `SiteNav` (global nav) + `SiteFooter`. Brand: KLYRA wordmark (concept A), dark base, electric cyan `#1ec8ff`.
- **Services (untouched by this plan):** Supabase auth/accounts and friends (`app/session.js`, `useSession`), the commerce worker plus `EmbeddedCheckout` (store, Supporter Edition), launcher downloads (`app/site-data.js`, `/download/`, `/play/`).

## 2. Homepage evolution into the hub

| Stage | Homepage |
|---|---|
| Before | Broken Front landing page ("The front is free") |
| Now (live) | KLYRA hero "Every KLYRA game. One home.", free-to-play badge, game cards (BF flagship, Redline in development, Social Hub), platform strip, independent-developer section, Download KLYRA |
| Target | Hub sections below, fed by the game config and the news data, with BF media in the hero |

## 3. Proposed homepage layout

1. **Hero:** "KLYRA: One Platform. Endless Experiences." over real Broken Front media (trailer stills such as `/shots/trailer/*.jpg`, or the trailer). Badge "Free to play. Every KLYRA game." Primary CTA Download KLYRA; secondary Explore games.
2. **Explore games:** large cards from the config (art, logo, title, one-line description, status badge, link). Order: Broken Front (flagship), Redline (In development), Social Hub.
3. **Social Hub:** available today (confirmed by Cody): hang out with friends and move between games. Soccer, boxing and TDM are casual, half-finished minigames, so describe them only casually ("kick a ball around, box your friends"), never as polished modes or headline features.
3b. **Music:** TROY (The Reality of Yourself), official soundtrack partner, shown as KLYRA-wide music ("across every KLYRA game"). Links to Spotify, YouTube and the official store. No autoplay. Also kept on the Broken Front page.
4. **Platform features:** one account, one download, friends, universal skins (skins on your KLYRA account). Only what exists today, or with the existing wording Cody approved.
5. **Latest news:** cards from the unified news data, tagged by game (BF, Redline, Platform), linking to `/news/`.
6. **Community:** link to `/community/` (existing channels).
7. **Independent developer:** keep the current section. Footer.
No speculative future games anywhere.

## 4. Mini-site structure

```
/games/<slug>/            overview (custom layout allowed)
/games/<slug>/<section>/  sections listed in the game config
```
Each game folder has a `layout.jsx` that renders the game sub-nav (`SectionNav`) from config. Sections are only listed when they have real content (`active: true`). Shared building blocks: `GamePage`, `GameCard`, `MediaGallery`, `Roadmap`, `SectionNav`.

## 5. Broken Front migration

### Inventory of public URLs (current build)
- **BF content:** `/features/`, `/factions/`, `/factions/the-regiment/`, `/factions/kin-of-the-hollow/`, `/factions/blackline-group/`, `/arsenal/`, `/weapons/`, `/weapons/ak-74/`, `/weapons/m4a1/`, `/vehicles/`, `/vehicles/attack-helicopter/`, `/vehicles/transport-helicopter/`, `/vehicles/m9-halberd-tank/`, `/vehicles/transport-truck/`, `/roadmap/`, `/devlog/`
- **BF mini-site:** `/games/broken-front/` plus `/games/broken-front/<all of the above>/` (aliases, already built)
- **Account and social (platform, don't move):** `/account/`, `/friends/`, `/friends/add/`, `/add/`
- **Download and play (don't change targets):** `/download/`, `/play/`
- **Purchases (don't change):** `/store/`, `/store/characters/<id>/` (27 character pages), `/support/` (Supporter Edition), `/buy/` (redirect)
- **Other:** `/`, `/games/`, `/community/`, `/help/`, `/404/`, `/sitemap.xml`, `/robots.txt`

### Redirect map (no deletions)
| Old URL | New URL | Phase |
|---|---|---|
| `/features/` | `/games/broken-front/features/` | Phase B: switch canonical; Phase C: make old a redirect |
| `/factions/` and `/factions/*` | `/games/broken-front/factions/*` | same |
| `/arsenal/` | `/games/broken-front/arsenal/` | same |
| `/weapons/` and `/weapons/*` | `/games/broken-front/weapons/*` | same |
| `/vehicles/` and `/vehicles/*` | `/games/broken-front/vehicles/*` | same |
| `/roadmap/` | `/games/broken-front/roadmap/` | same |
| `/devlog/` | `/games/broken-front/devlog/` (and listed in `/news/`) | same |
| `/download/`, `/play/`, `/store/*`, `/support/`, `/account/`, `/friends/*` | unchanged | never |

Redirects should be Cloudflare Pages `_redirects` 301s (server-side). The existing meta-refresh `Redirect` component is the fallback. Today the aliases re-export the original pages, and canonicals still point at the old URLs, so there's no duplicate-content risk.

## 6. Redline mini-site

| Section | Content | Active |
|---|---|---|
| Overview | Hero, two disciplines, model counts | yes |
| Pro | Professional circuit racing + Pro car renders | yes |
| Street | Underground street racing + Street car renders | yes |
| Garage | 3D viewer. Canonical `/games/redline/garage/`; `/games/redline/vehicles/` is an alias and 301s to it | yes |
| Tracks | No real track content yet | **no** (hidden) |
| Media | Car renders labelled "Model render" | yes |
| Roadmap | 8 phases from `REDLINE_VISION.md`, all Planned | yes |
| News | No Redline posts yet | **no** (hidden until a post exists) |
| Play | Not playable | **no** |
Also Features (from the vision, all planned). Everything carries "In development". Look: dark, red accents, white type. Pro clean, Street aggressive.

## 7. Navigation

- **Global nav:** KLYRA logo · Games · News · Community · Support · Account, plus a Download KLYRA button. Store stays reachable (footer, game pages, account); whether it returns to the top bar is an open question.
- **Game switcher:** "Games" opens a menu listing every game from the config (logo, status), plus "All games".
- **Game sub-nav:** a second sticky bar under the global nav, in the game's colours, with its active sections. It scrolls sideways on phones.
- **Mobile:** the global nav collapses to logo + Download + menu. The drawer lists the global links and games, and the game sub-nav stays as a horizontal scroller.

## 8. Game config, news, roadmaps, accounts

`app/games/gamesData.js` exports `games`, and every entry follows this schema:
```js
{
  id, slug, title, shortTitle, description, logo, cover, theme: { key, accent, accent2 },
  status: "released" | "pre-alpha" | "in-development" | "platform",
  statusLabel, flagship,
  sections: [{ id, label, href, active }],
  newsCategory, roadmap,          // roadmap: data module path or null
  media: [{ src, title, label }],
  links: { download, play, page }, // existing targets only
  layout: "custom" | "standard",
}
```
It drives `/games/`, the homepage cards, the game switcher, the sitemap and each mini-site sub-nav. Games can still ship custom layouts (BF's cinematic home, Redline's overview).
- **Unified news:** `app/news/newsData.js` holds `{ id, date, title, game, href, summary }`. `/news/` shows everything with All / per-game filters, and each game's News section filters by `newsCategory`. Today's entries come from the BF devlog.
- **Roadmaps:** shared `Roadmap` component. Per-game data files (`app/games/redline/data/roadmap.js`), and later BF's roadmap moves to the same format. Optionally a platform aggregate.
- **Accounts:** one KLYRA account across all games. No auth or payment changes in this plan.
- **Creator ecosystem:** noted as a future idea only. Not built or advertised.

## 9. SEO

- Per-game titles ("Section · KLYRA: Game"), descriptions, OG images (BF trailer stills; Redline model renders), canonicals.
- JSON-LD: `VideoGame` on each game overview (name, genre, gamePlatform for released games only, publisher KLYRA), `Organization` on the homepage, `BreadcrumbList` on subpages.
- Sitemap built from the config: list only canonical URLs, and drop old BF URLs once the 301s are live.
- Redirect concerns: switch canonicals before 301s, keep `/download/` and `/store/*` stable (they're linked from the launcher and checkout), avoid redirect chains (`/buy/` points straight to its final target).

## 10. Phased rollout

- **A (preview, this branch):** game config schema, `SectionNav` from config, BF aliases with BF sub-nav, Redline mini-site skeleton (Overview, Pro, Street, Vehicles, Media, Roadmap, Features), `/news/` aggregate, docs.
- **B:** Cody reviews, then merge. Switch BF canonicals to `/games/broken-front/*` and update internal links.
- **C:** add `_redirects` 301s from old BF URLs, regenerate the sitemap, and run a full link check.
- **D:** homepage hub sections (Social Hub wording once confirmed, Latest News, Community). BF roadmap moves to the shared component.
- **E:** game switcher dropdown, JSON-LD, per-game OG images.

## Decisions (Cody, 22 Oct 2026)
1. The Social Hub is available today; the minigames stay casual.
2. Redline stays public and indexed.
3. Store stays in the top nav (global nav: logo, Games, News, Community, Store, Friends, Support, Account, Download KLYRA).
4. Redline keeps the name "Garage".
5. Approved: `/games/broken-front/*` is canonical. Old BF URLs 301 via `public/_redirects` (Phases B and C done on the `game-sections` branch). Download, purchase, account and auth URLs are not redirected. Internal links and the sitemap use the new URLs.
6. TROY music appears on the homepage as KLYRA-wide music, and stays on BF.

## Still open
- The "200 bots" stat on BF Features is unconfirmed (left as is).

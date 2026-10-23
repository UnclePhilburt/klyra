# KLYRA platform vision

KLYRA is the platform. **KLYRA: Broken Front** is the first and flagship game, a serious military shooter. **KLYRA: Redline** is the second game and is in development. The **KLYRA Social Hub** (soccer, boxing, TDM, social interaction, friend joining, public hub matchmaking) is part of the platform, not a standalone game. A creator portal or player-made games is a distant idea only.

Ground rules for anything public: no invented dates, player counts or availability. No hypothetical games. No empty nav items. Purchases and entitlements are per game and never interchangeable. The Character Store and Supporter Edition belong to Broken Front.

## 1. What is Broken Front-specific vs. shareable

| Area | Files | Today | Platform future |
|---|---|---|---|
| Home hero, trailer, music credit | `app/page.jsx` | Broken Front | Stays Broken Front (it is the flagship landing page) |
| Features, Factions, Arsenal, Weapons, Vehicles, Roadmap, Devlog | `app/features`, `app/factions`, `app/arsenal`, `app/weapons`, `app/vehicles`, `app/roadmap`, `app/devlog` | Broken Front | Stay Broken Front; later can move under `/games/broken-front/*` with redirects |
| Download, browser play | `app/download`, `app/play` | Broken Front builds | Per game |
| Character Store, Weekly Drop | `app/store`, worker `/characters/*`, `/bundles/*` | Broken Front | Stays Broken Front (entitlements are game-scoped) |
| Supporter Edition | `app/support`, `app/components/Supporter*`, worker `/pay` | Broken Front | Stays Broken Front |
| Account, session, sign-in | `app/account`, `app/session.js`, `app/useSession.js` | Shared Supabase auth | **Shared platform** (one KLYRA account) |
| Friends, player card, callsign | `app/friends`, `app/components/AccountLink.jsx` | Shared tables | **Shared platform** (friends span games; Social Hub builds on this) |
| Nav, footer | `app/components/SiteNav.jsx`, `SiteFooter.jsx` | Now KLYRA-branded | **Shared shell** |
| Embedded checkout | `app/components/EmbeddedCheckout.jsx` | Generic (endpoint/payload props) | **Shared component**, game-scoped endpoints |
| Game registry, game cards | `app/games/gamesData.js`, `app/components/GameCard.jsx` | New | **Shared** |
| 3D preview (model-viewer / three.js) | `app/store/CharacterPreview.jsx`, `app/games/redline/RedlineViewer.jsx` | Per game | Could share a small viewer core later; not needed now |

## 2. Navigation and homepage review

- The nav was Broken Front-only, with the logo reading "KLYRA BROKEN FRONT". It is now the KLYRA wordmark with a **Games** tab first; the Broken Front tabs (Features, Factions, Arsenal, Download, Roadmap, Community, Store) remain because Broken Front is the only playable game.
- The homepage stays the Broken Front landing page. Do not turn it into a platform portal until a second game is playable. A small "More from KLYRA" strip linking to `/games/` could be added later.
- When a second game ships, the nav should become: KLYRA wordmark · Games · (game-context tabs) · Friends · Account. Game tabs should appear only inside a game's section.
- The nav fits at every width (clamp sizing, hamburger below 1100px). Adding more top-level tabs will break that; prefer game-context tabs instead.

## 3. Supporting multiple games

- **Registry**: `app/games/gamesData.js` holds `{ id, name, genre, status, blurb, href, image, theme, accent }`. Pages and cards read from it, so adding a game is one entry and no layout code changes.
- **Game cards**: `GameCard` renders any registry entry. `/games/` maps over the registry.
- **Per-game themes**: each game has a `theme` key (`military`, `motorsport`) and an accent colour. Page-level CSS prefixes keep themes isolated: `kx*` = Broken Front, `kp*` = platform shell, `rl*` = Redline.

## 4. Branding

- **KLYRA (parent)**: neutral, modern, dark, with a sharp electric-cyan accent. Bold geometric wordmark with a glowing slash through the K (`public/brand/klyra-wordmark.svg`, favicon `public/brand/klyra-favicon.svg`).
- **Broken Front**: military look stays as is (gold, hazard stripes, HUD type, trailers, screenshots). Only the shared header and footer logo changed.
- **Redline**: motorsport look: black, racing red, italic display type, checkered accents. Pro uses red, Street uses cyan.

## 5. Games directory

```
/games/                 directory (registry-driven cards)
/games/broken-front/    alias that redirects to / (noindex) until BF pages move here
/games/redline/         Redline car viewer, clearly labelled "In development"
```
Per Cody's approval, `/games/redline/` is public, linked and indexed. If that changes, add `robots: { index: false }` to its metadata, remove it from `app/sitemap.js` and the registry.

## 6. Accounts, friends, Supabase and the worker across games

- **One account**: Supabase auth stays the single KLYRA identity. Profiles, callsigns, friends and presence are game-agnostic.
- **Per-game entitlements**: today `supporter_orders/supporter_payments` and `player_cosmetics/cosmetic_catalog` are implicitly Broken Front. Recommended (later, with a migration):
  - Add `game_id text not null default 'broken-front'` to `cosmetic_catalog`, `cosmetic_bundles`, `store_orders`, `supporter_orders`, and a generic `entitlements(user_id, game_id, sku, source, payment_id unique, granted_at, revoked_at)`.
  - RPCs (`my_characters`, `grant_*`, `revoke_*`) take or filter by `game_id`.
  - Never grant across games; a Broken Front purchase never unlocks Redline content.
- **Worker**: keep the existing routes as they are (they are Broken Front). New games would use routes namespaced by game, e.g. `/g/:gameId/pay`, with a server-side catalog per game id. Price, verification, unique payment id and refund revocation rules stay identical. Order metadata gains `klyra_game_id`.
- **Social Hub**: builds on friends and presence; matchmaking and hub sessions are game-server concerns, not website ones. Website only needs presence and join links later.

## 7. Creator portal (far future)

Not planned for the site. Don't advertise it or build it. If it ever happens it would need moderation, content policy and separate entitlements, so it is out of scope.

## 8. Now vs. later (prioritised)

**Now (done in this change)**
1. KLYRA wordmark and favicon in the shared nav and footer; neutral dark/cyan shell.
2. Games registry + `GameCard` + `/games/` directory and a **Games** nav tab.
3. `/games/redline/`: interactive car viewer (2 Pro, 2 Street cars), labelled "In development", factual copy only.
4. This document.

**Next (small, low risk)**
5. "More from KLYRA" link strip on the Broken Front home.
6. Add `game_id` defaults to commerce tables (migration only, no behaviour change).

**Later (when a second game is playable)**
7. Move Broken Front pages under `/games/broken-front/*` with redirects.
8. Game-namespaced worker routes and per-game catalogs.
9. Shared presence and Social Hub join links.

**Not planned**: creator portal, player-made games, any listing of hypothetical games.

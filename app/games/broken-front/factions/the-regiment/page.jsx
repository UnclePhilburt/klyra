// Broken Front section. Canonical URL is /games/broken-front/factions/the-regiment/; the old /factions/the-regiment/ URL 301-redirects here.
import Page, { metadata as base } from "../../../../factions/the-regiment/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/factions/the-regiment/" } };
export default Page;

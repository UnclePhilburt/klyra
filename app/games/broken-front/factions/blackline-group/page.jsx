// Broken Front section. Canonical URL is /games/broken-front/factions/blackline-group/; the old /factions/blackline-group/ URL 301-redirects here.
import Page, { metadata as base } from "../../../../factions/blackline-group/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/factions/blackline-group/" } };
export default Page;

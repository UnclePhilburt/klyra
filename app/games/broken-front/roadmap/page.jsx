// Broken Front section. Canonical URL is /games/broken-front/roadmap/; the old /roadmap/ URL 301-redirects here.
import Page, { metadata as base } from "../../../roadmap/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/roadmap/" } };
export default Page;

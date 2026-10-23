// Broken Front section. Canonical URL is /games/broken-front/arsenal/; the old /arsenal/ URL 301-redirects here.
import Page, { metadata as base } from "../../../arsenal/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/arsenal/" } };
export default Page;

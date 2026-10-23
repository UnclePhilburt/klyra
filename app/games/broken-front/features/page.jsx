// Broken Front section. Canonical URL is /games/broken-front/features/; the old /features/ URL 301-redirects here.
import Page, { metadata as base } from "../../../features/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/features/" } };
export default Page;

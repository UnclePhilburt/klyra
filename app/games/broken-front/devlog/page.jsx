// Broken Front section. Canonical URL is /games/broken-front/devlog/; the old /devlog/ URL 301-redirects here.
import Page, { metadata as base } from "../../../devlog/page";

export const metadata = { ...(base || {}), alternates: { ...((base && base.alternates) || {}), canonical: "https://klyra.lol/games/broken-front/devlog/" } };
export default Page;

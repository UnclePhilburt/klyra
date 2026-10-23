export const dynamic = "force-static";

const paths = ["/", "/games/broken-front/features/", "/games/broken-front/factions/", "/games/broken-front/factions/the-regiment/", "/games/broken-front/factions/kin-of-the-hollow/", "/games/broken-front/factions/blackline-group/", "/games/broken-front/arsenal/", "/games/broken-front/weapons/", "/games/broken-front/weapons/ak-74/", "/games/broken-front/weapons/m4a1/", "/games/broken-front/vehicles/", "/games/broken-front/vehicles/attack-helicopter/", "/games/broken-front/vehicles/transport-helicopter/", "/games/broken-front/vehicles/m9-halberd-tank/", "/games/broken-front/vehicles/transport-truck/", "/download/", "/games/broken-front/roadmap/", "/community/", "/games/broken-front/devlog/", "/support/", "/store/", "/account/", "/games/", "/news/", "/games/broken-front/", "/games/redline/", "/games/redline/features/", "/games/redline/pro/", "/games/redline/street/", "/games/redline/garage/", "/games/redline/media/", "/games/redline/roadmap/"];

export default function sitemap() {
  return paths.map((p) => ({ url: `https://klyra.lol${p}`, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.7 }));
}
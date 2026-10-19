// Supporter Edition crest. WebP with PNG fallback; edges are pre-faded so the
// crest's dark backdrop blends into the page.
export default function SupporterEmblem({ size = 800, className = "", alt = "KLYRA Supporter Edition emblem", eager = false }) {
  const w = size > 420 ? 800 : 420;
  return (
    <picture className={`kxEmblem ${className}`}>
      <source type="image/webp" srcSet={`/supporter/emblem-420.webp 420w, /supporter/emblem-800.webp 800w`} sizes={`${size}px`} />
      <img
        src={`/supporter/emblem-${w}.png`}
        srcSet={`/supporter/emblem-420.png 420w, /supporter/emblem-800.png 800w`}
        sizes={`${size}px`}
        width={w}
        height={w}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}

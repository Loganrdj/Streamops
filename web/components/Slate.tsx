import { initials, slateColors } from "./ui";

/** Generated stream artwork: creator monogram on a two-tone field. Replaces stock thumbnails. */
export function Slate({ seed, creator, size = "sm" }: { seed: string; creator: string | null; size?: "sm" | "lg" }) {
  const [bg, accent] = slateColors(seed);
  const big = size === "lg";
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden ${big ? "aspect-video w-full rounded-monitor" : "h-14 w-24 shrink-0 rounded-lg"}`}
      style={{ background: `radial-gradient(120% 90% at 85% 15%, ${accent}55 0%, transparent 55%), linear-gradient(135deg, ${bg} 0%, #13111b 100%)` }}
    >
      <div className="scanlines absolute inset-0" />
      <span
        className={`absolute font-display font-bold leading-none tracking-tight text-white/90 ${big ? "bottom-4 left-5 text-[clamp(4rem,9vw,8rem)]" : "bottom-1 left-2 text-3xl"}`}
      >
        {initials(creator)}
      </span>
      <span className={`absolute rounded-full ${big ? "right-6 top-6 h-24 w-24" : "right-2 top-2 h-5 w-5"}`} style={{ background: accent, opacity: 0.35 }} />
    </div>
  );
}

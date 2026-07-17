import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  priority?: boolean;
};

const sizes = {
  sm: { box: 36, img: 32 },
  md: { box: 44, img: 40 },
  lg: { box: 64, img: 56 },
} as const;

export function Logo({
  href = "/",
  size = "md",
  showWordmark = true,
  className = "",
  priority = false,
}: LogoProps) {
  const s = sizes[size];
  const mark = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="relative shrink-0 overflow-hidden rounded-full bg-[var(--espresso)] shadow-[0_8px_20px_rgba(26,16,12,0.35)] ring-1 ring-[color-mix(in_srgb,var(--coffee)_25%,transparent)]"
        style={{ width: s.box, height: s.box }}
      >
        {/*
          No `unoptimized`: the source is 1254x1254 / 63KB and renders into a
          40px circle, so every page shipped ~63KB of JPEG to paint ~2KB worth
          of pixels — and with priority on the header it was preloaded, ahead of
          real content. Letting next/image handle it uses the AVIF/WebP formats
          already configured in next.config.ts and serves it at the requested
          size. `sizes` keeps the srcset from offering widths we never use.
        */}
        <Image
          src="/logo.jpeg"
          alt="Coffee Match"
          width={s.img}
          height={s.img}
          sizes={`${s.img}px`}
          className="h-full w-full object-cover"
          priority={priority}
        />
      </span>
      {showWordmark ? (
        <span className="leading-tight">
          <span className="font-display block text-[1.25rem] font-semibold tracking-tight text-[var(--ink)] sm:text-[1.35rem]">
            Coffee{" "}
            <span className="text-[var(--coffee)]">Match</span>
          </span>
          <span className="hidden text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:block">
            Uma xícara por vez · 18+
          </span>
        </span>
      ) : null}
    </span>
  );

  if (href === null) return mark;
  return (
    <Link href={href} className="group transition-opacity hover:opacity-90">
      {mark}
    </Link>
  );
}

import React from "react";

const RING_RADII = [120, 195, 270, 345, 420] as const;

const ORBITAL_DOTS = [
  { cx: 610, cy: 338, fill: "#FF8D68" },
  { cx: 229, cy: 605, fill: "#10B981" },
  { cx: 763, cy: 596, fill: "#FF8D68" },
] as const;

const NOISE_SVG_DATA_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='2.2' intercept='-0.55'/%3E%3CfeFuncG type='linear' slope='2.2' intercept='-0.55'/%3E%3CfeFuncB type='linear' slope='2.2' intercept='-0.55'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const StaticBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Warm Studio Spotlight: subtle unblurred radial warmth anchored to the Hero Drop Circle */}
      <div className="absolute inset-0 bg-[radial-gradient(560px_560px_at_50%_440px,rgba(255,228,201,0.45),transparent_70%)] dark:bg-[radial-gradient(560px_560px_at_50%_440px,rgba(255,141,104,0.08),transparent_70%)] lg:bg-[radial-gradient(720px_640px_at_calc(50%+240px)_380px,rgba(255,228,201,0.45),transparent_70%)] lg:dark:bg-[radial-gradient(720px_640px_at_calc(50%+240px)_380px,rgba(255,141,104,0.08),transparent_70%)]" />

      {/* Architectural Dot Matrix across the Hero Split-Stage (covers left headline + right card) */}
      <div
        className="absolute inset-x-0 top-0 h-[820px] opacity-35 dark:opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-stone-400) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(ellipse 85% 70% at 50% 340px, black 25%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 70% at 50% 340px, black 25%, transparent 78%)",
        }}
      />

      {/* Viewport-fixed soft edge vignette */}
      <div className="fixed inset-0 bg-radial-[circle_at_50%_30%] from-transparent via-transparent to-black/[0.03] dark:to-black/25" />

      {/* Concentric "Drop Circle" Hairline Rings */}
      <div
        className="absolute left-1/2 top-[440px] h-[980px] w-[980px] -translate-x-1/2 -translate-y-1/2 lg:left-[calc(50%+260px)] lg:top-[380px]"
        style={{
          maskImage: "radial-gradient(circle at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 30%, transparent 75%)",
        }}
      >
        <svg
          viewBox="0 0 900 900"
          fill="none"
          className="h-full w-full text-[#CBB799]/65 dark:text-[#3A5373]/60"
          xmlns="http://www.w3.org/2000/svg"
        >
          {RING_RADII.map((radius) => (
            <circle
              key={radius}
              cx={450}
              cy={450}
              r={radius}
              stroke="currentColor"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {ORBITAL_DOTS.map((dot, idx) => (
            <circle
              key={idx}
              cx={dot.cx}
              cy={dot.cy}
              r={2.5}
              fill={dot.fill}
              className="opacity-70 dark:opacity-60"
            />
          ))}
        </svg>
      </div>

      {/* Viewport-fixed Tactile Paper Grain (desaturated + contrast-boosted) */}
      <div
        className="fixed inset-0 opacity-[0.07] mix-blend-multiply dark:opacity-[0.12] dark:mix-blend-soft-light"
        style={{
          backgroundImage: NOISE_SVG_DATA_URI,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />
    </div>
  );
};

export default StaticBackground;

"use client";

import React from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

const RING_RADII = [120, 195, 270, 345, 420] as const;

const CORAL_RING_RADIUS = 195;
const CORAL_RING_CIRCUMFERENCE = 2 * Math.PI * CORAL_RING_RADIUS;

const EMERALD_RING_RADIUS = 345;
const EMERALD_RING_CIRCUMFERENCE = 2 * Math.PI * EMERALD_RING_RADIUS;

const CORAL_ORBITAL_DOTS = [
  { cx: 610, cy: 338, fill: "#FF8D68" },
  { cx: 763, cy: 596, fill: "#FF8D68" },
] as const;

const EMERALD_ORBITAL_DOTS = [{ cx: 229, cy: 605, fill: "#10B981" }] as const;

const NOISE_SVG_DATA_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='2.2' intercept='-0.55'/%3E%3CfeFuncG type='linear' slope='2.2' intercept='-0.55'/%3E%3CfeFuncB type='linear' slope='2.2' intercept='-0.55'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const DROP_CIRCLE_MASK_STYLE: React.CSSProperties = {
  maskImage: "radial-gradient(circle at center, black 30%, transparent 75%)",
  WebkitMaskImage: "radial-gradient(circle at center, black 30%, transparent 75%)",
};

type StaticBackgroundProps = {
  variant?: "default" | "landing";
};

const StaticBackground = ({ variant = "default" }: StaticBackgroundProps) => {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = prefersReducedMotion !== true;
  const { scrollYProgress } = useScroll();
  // Soft spring gives scroll-driven motion a longer, lingering settle duration
  const smoothScrollProgress = useSpring(scrollYProgress, {
    stiffness: 48,
    damping: 20,
    mass: 1.1,
    restDelta: 0.0005,
  });

  const dropCircleY = useTransform(smoothScrollProgress, [0, 1], [0, 260]);
  const coralDashOffset = useTransform(
    smoothScrollProgress,
    [0, 0.95],
    [CORAL_RING_CIRCUMFERENCE * 0.94, CORAL_RING_CIRCUMFERENCE * 0.08]
  );
  const emeraldDashOffset = useTransform(
    smoothScrollProgress,
    [0.04, 1],
    [EMERALD_RING_CIRCUMFERENCE * 0.96, EMERALD_RING_CIRCUMFERENCE * 0.14]
  );
  const coralOrbitRotate = useTransform(smoothScrollProgress, [0, 1], [0, 68]);
  const emeraldOrbitRotate = useTransform(smoothScrollProgress, [0, 1], [0, -56]);

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

      {/* Lower-section Architectural Dot Matrix & Spotlight Continuation for the landing canvas */}
      {variant === "landing" && (
        <>
          <div className="absolute inset-x-0 top-[780px] h-[1600px] bg-[radial-gradient(680px_540px_at_24%_36%,rgba(255,228,201,0.42),transparent_72%)] dark:bg-[radial-gradient(680px_540px_at_24%_36%,rgba(255,141,104,0.085),transparent_72%)]" />
          <div className="absolute inset-x-0 top-[1500px] bottom-0 bg-[radial-gradient(620px_500px_at_80%_42%,rgba(242,232,216,0.52),transparent_72%)] dark:bg-[radial-gradient(620px_500px_at_80%_42%,rgba(16,185,129,0.07),transparent_72%)]" />
          {/* Starts at 520px (20 * 26px) to stay phase-aligned with the hero dot grid and spans to bottom-0 */}
          <div
            className="absolute inset-x-0 top-[520px] bottom-0 opacity-35 dark:opacity-45"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--color-stone-400) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
              maskImage:
                "linear-gradient(to bottom, transparent 0px, black 280px, black calc(100% - 180px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0px, black 280px, black calc(100% - 180px), transparent 100%)",
            }}
          />
        </>
      )}

      {/* Viewport-fixed soft edge vignette */}
      <div className="fixed inset-0 bg-radial-[circle_at_50%_30%] from-transparent via-transparent to-black/[0.03] dark:to-black/25" />

      {/* Concentric "Drop Circle" Hairline Rings with scroll-driven DownloadIndicator arcs */}
      <div className="absolute left-1/2 top-[440px] h-[980px] w-[980px] -translate-x-1/2 -translate-y-1/2 lg:left-[calc(50%+260px)] lg:top-[380px]">
        {/* Radial mask travels with dropCircleY so concentric arcs do not clip asymmetrically */}
        <motion.div
          className="relative h-full w-full"
          style={
            shouldAnimate
              ? { ...DROP_CIRCLE_MASK_STYLE, y: dropCircleY }
              : DROP_CIRCLE_MASK_STYLE
          }
        >
          {/* Uses DESIGN.md Hairline Border tokens: Muted Sandstone (#E1D3BD) & Deep Slate (#30445D) */}
          <svg
            viewBox="0 0 900 900"
            fill="none"
            className="h-full w-full text-[#E1D3BD]/95 dark:text-[#30445D]/85"
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

            {/* Scroll-driven Sunset Coral ring trace (mirrors DownloadIndicator) */}
            <motion.circle
              cx={450}
              cy={450}
              r={CORAL_RING_RADIUS}
              stroke="#FF8D68"
              strokeWidth={2}
              strokeOpacity={0.56}
              strokeDasharray={CORAL_RING_CIRCUMFERENCE}
              strokeDashoffset={
                shouldAnimate ? undefined : CORAL_RING_CIRCUMFERENCE * 0.72
              }
              style={shouldAnimate ? { strokeDashoffset: coralDashOffset } : undefined}
              strokeLinecap="round"
              transform="rotate(-90 450 450)"
              vectorEffect="non-scaling-stroke"
            />

            {/* Scroll-driven Emerald ring trace */}
            <motion.circle
              cx={450}
              cy={450}
              r={EMERALD_RING_RADIUS}
              stroke="#10B981"
              strokeWidth={1.75}
              strokeOpacity={0.44}
              strokeDasharray={EMERALD_RING_CIRCUMFERENCE}
              strokeDashoffset={
                shouldAnimate ? undefined : EMERALD_RING_CIRCUMFERENCE * 0.78
              }
              style={shouldAnimate ? { strokeDashoffset: emeraldDashOffset } : undefined}
              strokeLinecap="round"
              transform="rotate(90 450 450)"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Opposing orbital dot rotation layers */}
          <motion.div
            className="absolute inset-0"
            style={shouldAnimate ? { rotate: coralOrbitRotate } : undefined}
          >
            <svg
              viewBox="0 0 900 900"
              fill="none"
              className="h-full w-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              {CORAL_ORBITAL_DOTS.map((dot, idx) => (
                <circle
                  key={idx}
                  cx={dot.cx}
                  cy={dot.cy}
                  r={3.5}
                  fill={dot.fill}
                  className="opacity-90 dark:opacity-85"
                />
              ))}
            </svg>
          </motion.div>

          <motion.div
            className="absolute inset-0"
            style={shouldAnimate ? { rotate: emeraldOrbitRotate } : undefined}
          >
            <svg
              viewBox="0 0 900 900"
              fill="none"
              className="h-full w-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              {EMERALD_ORBITAL_DOTS.map((dot, idx) => (
                <circle
                  key={idx}
                  cx={dot.cx}
                  cy={dot.cy}
                  r={3.5}
                  fill={dot.fill}
                  className="opacity-90 dark:opacity-85"
                />
              ))}
            </svg>
          </motion.div>
        </motion.div>
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

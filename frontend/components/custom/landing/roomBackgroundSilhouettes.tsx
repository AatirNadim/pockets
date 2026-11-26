"use client";

import React, { useRef } from "react";
import { Crown, Eye, Minimize2, Volume2, Waves } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

const FILE_SLICE_ROWS = [
  { nameWidth: "w-24", progress: 0.72 },
  { nameWidth: "w-20", progress: 0.45 },
  { nameWidth: "w-28", progress: 0.9 },
] as const;

const MINI_RING_CIRCUMFERENCE = 2 * Math.PI * 6;

const SCROLL_SPRING_CONFIG = {
  stiffness: 45,
  damping: 20,
  mass: 1.15,
  restDelta: 0.0005,
} as const;

/**
 * Scroll-linked background silhouettes for the `#demo` studio showcase band:
 * 1. Floating Self-PiP & Voice-Reactive Remote Stage Tile parallax (left gutter / stage layer)
 * 2. Ghosted right-edge ChatSidebar drawer with Drop Circle file-slice rows (wide screens)
 */
export function DemoBackgroundSilhouettes() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = prefersReducedMotion !== true;

  const { scrollYProgress } = useScroll({
    target: anchorRef,
    offset: ["start end", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, SCROLL_SPRING_CONFIG);

  // Element 1: Remote stage + faster Self-PiP vertical parallax over extended scroll span
  const stageY = useTransform(smoothProgress, [0, 1], [76, -104]);
  const stageOpacity = useTransform(
    smoothProgress,
    [0, 0.16, 0.5, 0.84, 1],
    [0, 0.23, 0.25, 0.19, 0.04]
  );
  const voiceRingOpacity = useTransform(
    smoothProgress,
    [0.12, 0.36, 0.68, 0.88],
    [0.12, 1, 1, 0.25]
  );

  const pipY = useTransform(smoothProgress, [0, 1], [156, -204]);
  const pipOpacity = useTransform(
    smoothProgress,
    [0, 0.18, 0.52, 0.85, 1],
    [0, 0.26, 0.28, 0.2, 0.05]
  );

  // Element 2: Ghosted ChatSidebar drawer peeking on the right edge + streaming mini file arcs
  const chatX = useTransform(smoothProgress, [0.04, 0.34, 0.74, 0.98], [64, 0, 0, 56]);
  const chatOpacity = useTransform(
    smoothProgress,
    [0.02, 0.2, 0.76, 0.96],
    [0, 0.23, 0.23, 0]
  );
  const sliceRingOffset0 = useTransform(
    smoothProgress,
    [0.1, 0.85],
    [MINI_RING_CIRCUMFERENCE * 0.82, MINI_RING_CIRCUMFERENCE * 0.14]
  );
  const sliceRingOffset1 = useTransform(
    smoothProgress,
    [0.16, 0.88],
    [MINI_RING_CIRCUMFERENCE * 0.88, MINI_RING_CIRCUMFERENCE * 0.32]
  );
  const sliceRingOffset2 = useTransform(
    smoothProgress,
    [0.08, 0.82],
    [MINI_RING_CIRCUMFERENCE * 0.74, MINI_RING_CIRCUMFERENCE * 0.04]
  );
  const sliceRingOffsets = [sliceRingOffset0, sliceRingOffset1, sliceRingOffset2] as const;

  const sliceBarScale0 = useTransform(smoothProgress, [0.1, 0.85], [0.18, 0.86]);
  const sliceBarScale1 = useTransform(smoothProgress, [0.16, 0.88], [0.12, 0.68]);
  const sliceBarScale2 = useTransform(smoothProgress, [0.08, 0.82], [0.26, 0.96]);
  const sliceBarScales = [sliceBarScale0, sliceBarScale1, sliceBarScale2] as const;

  return (
    <div
      ref={anchorRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* 1. Floating Self-PiP & Voice-Reactive Stage Parallax (flanks StudioPreview, clear of #demo headline) */}
      <div className="hidden min-[1360px]:block absolute left-4 top-[17rem] aspect-4/3 w-64 2xl:left-[max(2rem,calc((100vw-64rem)/2-17.5rem))] 2xl:w-72">
        {/* Remote Stage Tile Silhouette */}
        <motion.div
          style={
            shouldAnimate
              ? { y: stageY, opacity: stageOpacity }
              : { y: 0, opacity: 0.2 }
          }
          className="relative h-full w-full rounded-2xl border-[1.5px] border-stone-900 bg-white/40 text-stone-900 dark:border-stone-200 dark:bg-stone-900/40 dark:text-stone-200"
        >
          {/* Voice-reactive Coral (#FF8D68) ring highlight activating through middle scroll band */}
          <motion.div
            style={shouldAnimate ? { opacity: voiceRingOpacity } : { opacity: 0.85 }}
            className="absolute -inset-[1px] rounded-2xl ring-2 ring-[#FF8D68]"
          />

          {/* Top-left Waves "Speaking" / "Live" pill silhouette */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-[#FF8D68] bg-[#FF8D68]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#A10054] dark:text-[#FF8D68]">
            <Waves className="h-3 w-3" />
            <span>Speaking</span>
          </div>

          {/* Top-right mute & eye hairline controls */}
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-current/70">
              <Volume2 className="h-3.5 w-3.5" />
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-current/70">
              <Eye className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Subtle center stage acoustic reticle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border border-dashed border-current/55 2xl:h-20 2xl:w-20" />
          </div>

          {/* Bottom-left participant pill silhouette */}
          <div className="absolute bottom-3 left-3 rounded-full border border-current/75 px-3 py-1 text-[10px] font-medium">
            Live Stage
          </div>
        </motion.div>

        {/* Corner Self-PiP Tile Silhouette anchored to Stage Tile lower-right with faster parallax */}
        <motion.div
          style={
            shouldAnimate
              ? { y: pipY, opacity: pipOpacity }
              : { y: 0, opacity: 0.22 }
          }
          className="absolute -bottom-10 right-3 aspect-4/3 w-32 rounded-2xl border-[1.5px] border-stone-900 bg-stone-50/85 text-stone-900 dark:border-stone-200 dark:bg-stone-950/85 dark:text-stone-200 2xl:-bottom-11 2xl:w-36"
        >
          {/* Crown host badge silhouette */}
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full border border-[#A10054] bg-[#A10054]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#A10054] dark:border-[#FF8D68] dark:bg-[#FF8D68]/10 dark:text-[#FF8D68]">
            <Crown className="h-2.5 w-2.5" />
          </div>

          {/* Minimize control hairline */}
          <div className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-lg border border-current/65">
            <Minimize2 className="h-3 w-3" />
          </div>

          {/* "You" pill outline */}
          <div className="absolute bottom-2.5 left-2.5 rounded-full border border-current/80 px-2.5 py-0.5 text-[10px] font-medium">
            You
          </div>
        </motion.div>
      </div>

      {/* 2. Ghosted Right-Edge ChatSidebar Drawer Silhouette */}
      <motion.div
        style={
          shouldAnimate
            ? { x: chatX, opacity: chatOpacity }
            : { x: 0, opacity: 0.2 }
        }
        className="hidden min-[1400px]:flex absolute right-0 top-40 w-48 flex-col gap-3 rounded-l-2xl border-y-[1.5px] border-l-[1.5px] border-stone-900 bg-white/40 p-4 text-stone-900 dark:border-stone-200 dark:bg-stone-900/40 dark:text-stone-200 2xl:w-60"
      >
        {/* Chat drawer header hairline */}
        <div className="flex items-center justify-between border-b border-current/45 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#10B981]/75" />
            <span className="h-1.5 w-20 rounded-full bg-current/35" />
          </div>
          <span className="h-5 w-5 rounded-lg border border-current/60" />
        </div>

        {/* Message bubble hairline silhouettes */}
        <div className="space-y-2">
          <div className="rounded-xl border border-current/60 p-2.5">
            <div className="h-1 w-14 rounded-full bg-current/30" />
            <div className="mt-2 h-1 w-28 rounded-full bg-current/40" />
          </div>
          <div className="ml-5 rounded-xl border border-current/50 p-2.5">
            <div className="h-1 w-24 rounded-full bg-current/35" />
          </div>
        </div>

        {/* Drop Circle file-slice hairline rows */}
        <div className="space-y-2 border-t border-current/45 pt-3">
          {FILE_SLICE_ROWS.map((row, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 rounded-xl border border-current/70 p-2.5"
            >
              {/* Mini DownloadIndicator SVG arc */}
              <svg viewBox="0 0 18 18" className="h-4 w-4 shrink-0">
                <circle
                  cx={9}
                  cy={9}
                  r={6}
                  stroke="currentColor"
                  strokeWidth={1.75}
                  opacity={0.35}
                  fill="none"
                />
                <motion.circle
                  cx={9}
                  cy={9}
                  r={6}
                  stroke={idx === 2 ? "#10B981" : "#FF8D68"}
                  strokeWidth={1.75}
                  strokeDasharray={MINI_RING_CIRCUMFERENCE}
                  strokeDashoffset={
                    shouldAnimate
                      ? undefined
                      : MINI_RING_CIRCUMFERENCE * (1 - row.progress)
                  }
                  style={
                    shouldAnimate
                      ? { strokeDashoffset: sliceRingOffsets[idx] }
                      : undefined
                  }
                  strokeLinecap="round"
                  transform="rotate(-90 9 9)"
                  fill="none"
                />
              </svg>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className={`h-1 ${row.nameWidth} rounded-full bg-current/40`} />
                <div className="h-1.5 w-full overflow-hidden rounded-full border border-current/45">
                  <motion.div
                    className={`h-full w-full origin-left rounded-full ${
                      idx === 2 ? "bg-[#10B981]/85" : "bg-[#FF8D68]/85"
                    }`}
                    style={{
                      scaleX: shouldAnimate ? sliceBarScales[idx] : row.progress,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom message input hairline */}
        <div className="mt-1 flex items-center justify-between rounded-xl border border-current/60 px-3 py-2">
          <span className="h-1 w-20 rounded-full bg-current/30" />
          <span className="h-4 w-4 rounded-md border border-current/65" />
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Scroll-linked background silhouette for `#philosophy` (aligned near Card 02 / Doorbell):
 * 3. Margin "Doorbell Knock" wireframe echoing JoinRequestList on wide screens
 */
export function PhilosophyBackgroundSilhouettes() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = prefersReducedMotion !== true;

  const { scrollYProgress } = useScroll({
    target: anchorRef,
    offset: ["start end", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, SCROLL_SPRING_CONFIG);

  const knockX = useTransform(smoothProgress, [0.04, 0.38, 0.76, 0.98], [14, 0, 0, 10]);
  const knockOpacity = useTransform(
    smoothProgress,
    [0.02, 0.22, 0.74, 0.96],
    [0, 0.25, 0.25, 0.04]
  );

  return (
    <div
      ref={anchorRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* 3. Margin "Doorbell Knock" Silhouette aligned with Card 02 / Doorbell */}
      <motion.div
        style={
          shouldAnimate
            ? { x: knockX, opacity: knockOpacity }
            : { x: 0, opacity: 0.2 }
        }
        className="hidden min-[1440px]:block absolute right-4 top-[290px] w-40 text-stone-900 dark:text-stone-200 2xl:right-[max(2rem,calc((100vw-72rem)/2-11.5rem))] 2xl:w-48"
      >
        <div className="rounded-2xl border-[1.5px] border-current bg-white/40 p-3.5 dark:bg-stone-900/40 2xl:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="h-1.5 w-16 rounded-full bg-current/40" />
              <p className="mt-1.5 text-[10px] leading-tight">
                wants to join this room
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-current/70 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide">
              Guest
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <span className="flex h-8 flex-1 items-center justify-center rounded-xl border border-[#A10054] bg-[#A10054]/25 text-[10px] font-semibold text-[#A10054] dark:border-[#FF8D68] dark:bg-[#FF8D68]/25 dark:text-[#FF8D68]">
              Admit
            </span>
            <span className="flex h-8 flex-1 items-center justify-center rounded-xl border border-current/70 text-[10px] font-medium">
              Decline
            </span>
          </div>
        </div>

        {/* Secondary stacked knock card hairline */}
        <div className="mx-3 h-2.5 rounded-b-xl border-x-[1.5px] border-b-[1.5px] border-current/60" />
      </motion.div>
    </div>
  );
}

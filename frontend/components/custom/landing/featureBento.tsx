"use client";

import { useState } from "react";
import { Flame, Users2, ArrowRightLeft, BellRing, Sparkles } from "lucide-react";

export function FeatureBento() {
  const [mockAdmitted, setMockAdmitted] = useState<boolean | null>(null);

  return (
    <section aria-labelledby="pillars-title" className="relative mx-auto w-full max-w-6xl px-5 py-20 lg:px-10">
      {/* Section Header */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-stone-600 dark:border-stone-800 dark:bg-stone-900/70 dark:text-stone-300">
          <Sparkles size={12} className="text-amber-600 dark:text-amber-400" />
          The Pockets Philosophy
        </span>
        <h2
          id="pillars-title"
          className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl"
        >
          Engineered for quiet craft and intimate collaboration.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300 sm:text-lg">
          No persistent databases, no tracking cookies, and no corporate surveillance. Just direct browser-to-browser
          channels built for up to six people.
        </p>
      </div>

      {/* Asymmetric Bento Grid */}
      <div className="mt-14 grid gap-6 md:grid-cols-12">
        {/* Card 01: Instant Ephemeral Rooms (Col span 7) */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white/80 p-7 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900/80 md:col-span-7 sm:p-9">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                01 / Zero Footprint
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <Flame size={12} className="text-amber-600 dark:text-amber-400" />
                Auto-dissolving
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Temporary rooms that vanish when you leave
            </h3>
            <p className="mt-3 text-base leading-relaxed text-stone-600 dark:text-stone-300">
              No user accounts, passwords, email verification, or room archives. When the last participant closes
              their browser tab, all memory references, routing tables, and active sessions dissolve immediately.
            </p>
          </div>

          {/* Visual Artifact: Ephemeral Lifecycle Meter */}
          <div className="mt-8 rounded-2xl border border-stone-200/80 bg-stone-50/90 p-4 dark:border-stone-800 dark:bg-stone-950/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-stone-700 dark:text-stone-300">Active Room Lifespan</span>
              <span className="font-mono text-amber-700 dark:text-amber-400">In-Memory Only</span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-stone-200 bg-white p-2.5 dark:border-stone-800 dark:bg-stone-900">
                <span className="block text-[11px] text-stone-500">Database rows</span>
                <span className="font-mono text-base font-semibold text-stone-900 dark:text-stone-100">0</span>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-2.5 dark:border-stone-800 dark:bg-stone-900">
                <span className="block text-[11px] text-stone-500">Server logs</span>
                <span className="font-mono text-base font-semibold text-stone-900 dark:text-stone-100">None</span>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-2.5 dark:border-stone-800 dark:bg-stone-900">
                <span className="block text-[11px] text-stone-500">Persistence</span>
                <span className="font-mono text-base font-semibold text-emerald-600 dark:text-emerald-400">0 ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 02: Doorbell Admission (Col span 5) */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white/80 p-7 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900/80 md:col-span-5 sm:p-9">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                02 / Doorbell
              </span>
              <BellRing size={16} className="text-stone-400 dark:text-stone-500" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Host holds the room key
            </h3>
            <p className="mt-3 text-base leading-relaxed text-stone-600 dark:text-stone-300">
              No unwanted drop-ins or link crawlers. Uninvited guests knock in a private vestibule and only enter
              when the host explicitly verifies and admits them.
            </p>
          </div>

          {/* Visual Artifact: Interactive Knock Card Preview */}
          <div className="mt-8 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-xs font-bold text-white">
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">Alex is knocking</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Waiting in vestibule…</p>
                </div>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMockAdmitted(true)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mockAdmitted === true
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-500 dark:text-stone-950"
                }`}
              >
                {mockAdmitted === true ? "Admitted ✓" : "Admit"}
              </button>
              <button
                type="button"
                onClick={() => setMockAdmitted(false)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  mockAdmitted === false
                    ? "border-rose-400 bg-rose-100 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                {mockAdmitted === false ? "Declined" : "Decline"}
              </button>
            </div>
          </div>
        </div>

        {/* Card 03: Drop Circle P2P Transfers (Col span 5) */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white/80 p-7 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900/80 md:col-span-5 sm:p-9">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                03 / Drop Circle
              </span>
              <ArrowRightLeft size={16} className="text-stone-400 dark:text-stone-500" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Chunked 30 KiB WebRTC slices
            </h3>
            <p className="mt-3 text-base leading-relaxed text-stone-600 dark:text-stone-300">
              Files are sliced into binary chunks and streamed directly from browser memory to browser memory. No
              intermediary storage buffers, no size limits on our servers, and zero cloud hosting costs.
            </p>
          </div>

          {/* Visual Artifact: WebRTC Chunk Packet Visual */}
          <div className="mt-8 rounded-2xl border border-stone-200/80 bg-stone-50/90 p-4 dark:border-stone-800 dark:bg-stone-950/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-stone-600 dark:text-stone-400">Browser A (RAM)</span>
              <span className="font-mono text-amber-700 dark:text-amber-400">RTCDataChannel</span>
              <span className="font-mono text-stone-600 dark:text-stone-400">Browser B (RAM)</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-1.5">
              {[1, 2, 3, 4, 5].map((chunk) => (
                <div
                  key={chunk}
                  className="flex h-9 flex-1 flex-col items-center justify-center rounded-lg border border-amber-300/80 bg-amber-100/60 text-[10px] font-mono font-medium text-amber-900 shadow-2xs transition-transform hover:scale-105 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <span>30 KiB</span>
                  <span className="text-[9px] opacity-75">#{chunk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 04: Mesh Network & Honest Boundaries (Col span 7) */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white/80 p-7 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900/80 md:col-span-7 sm:p-9">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                04 / Full Mesh Clarity
              </span>
              <Users2 size={16} className="text-stone-400 dark:text-stone-500" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Up to 6 participants. No media routers in between.
            </h3>
            <p className="mt-3 text-base leading-relaxed text-stone-600 dark:text-stone-300">
              Traditional platforms route your video streams through centralized SFU servers that can decode and inspect
              packets. Pockets connects every participant directly to every other participant. We intentionally cap
              rooms at 6 to guarantee pristine 60fps video without overwhelming client bandwidth.
            </p>
          </div>

          {/* Visual Artifact: 6-Node Mesh Geometry */}
          <div className="mt-8 rounded-2xl border border-stone-200/80 bg-stone-50/90 p-4 dark:border-stone-800 dark:bg-stone-950/60">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-stone-800 dark:text-stone-200">Mesh Topology Matrix</span>
              <span className="font-mono text-stone-500 dark:text-stone-400">Connections = N × (N - 1) / 2 = 15 channels</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              {["P1", "P2", "P3", "P4", "P5", "P6"].map((peer, i) => (
                <div key={peer} className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-mono font-semibold ${
                      i === 0
                        ? "bg-amber-600 text-white"
                        : "border border-stone-300 bg-white text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    }`}
                  >
                    {peer}
                  </div>
                  <span className="mt-1 text-[10px] text-stone-500">
                    {i === 0 ? "Host" : `Peer ${i}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { Github, Video, Radio } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="relative border-t border-stone-200/90 bg-white/60 py-12 text-sm text-stone-600 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/60 dark:text-stone-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-950">
                <Video size={16} />
              </span>
              <span className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Pockets
              </span>
            </div>
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              Modern warm studio collaboration. Pure peer-to-peer, ephemeral, and private.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-100/80 px-3 py-1 text-xs font-mono text-stone-600 dark:border-stone-800 dark:bg-stone-900/80 dark:text-stone-300">
              <Radio size={12} className="text-emerald-500 animate-pulse" />
              <span>Full Mesh WebRTC</span>
              <span className="text-stone-400">•</span>
              <span>Max 6 Peers</span>
              <span className="text-stone-400">•</span>
              <span>30 KiB Chunks</span>
            </div>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[36px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              aria-label="Pockets GitHub Repository"
            >
              <Github size={14} />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-stone-200/60 pt-6 text-xs text-stone-500 dark:border-stone-800/60 dark:text-stone-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Pockets. All media & file transfers run browser-to-browser.</p>
          <div className="flex items-center gap-4">
            <span>No tracking cookies</span>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <span>Zero persistent databases</span>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <span>Host-governed entry</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

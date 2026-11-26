"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import StaticBackground from "@/components/custom/staticBackground";
import { ThemeToggle } from "@/components/custom/themeToggle";

const NotFound = () => {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden bg-stone-50 font-sans text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <StaticBackground />

      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-stone-200/60 bg-stone-50/80 px-4 backdrop-blur-md transition-colors dark:border-stone-800/60 dark:bg-stone-950/80 sm:h-20 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl font-semibold tracking-tight transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-amber-400"
          aria-label="Pockets home"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-600 text-white shadow-sm dark:bg-amber-400 dark:text-stone-950">
            <Video size={19} />
          </span>
          <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Pockets
          </span>
        </Link>

        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900 sm:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Compass className="h-8 w-8" />
          </div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
            Error 404
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
            Nothing here.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
            The page you&apos;re looking for doesn&apos;t exist. Head back to the
            lobby to start a new room or enter an invite ID.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              asChild
              size="lg"
              className="min-h-12 w-full rounded-xl bg-amber-700 font-semibold text-white hover:bg-amber-800 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;

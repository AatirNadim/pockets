"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { v4 as uuidV4 } from "uuid";
import { Check, Sparkles, Video } from "lucide-react";
import { toast } from "sonner";
import { isValidUUID, getAppUrl } from "@/lib/utils";
import { ThemeToggle } from "@/components/custom/themeToggle";
import StaticBackground from "@/components/custom/staticBackground";
import { KeyboardShortcuts } from "@/components/custom/keyboardShortcuts";
import { RoomEntryConsole } from "@/components/custom/landing/roomEntryConsole";
import { StudioPreview } from "@/components/custom/landing/studioPreview";
import { FeatureBento } from "@/components/custom/landing/featureBento";
import { TechnicalFaq } from "@/components/custom/landing/technicalFaq";
import { LandingFooter } from "@/components/custom/landing/landingFooter";

export default function LandingPage() {
  const [displayName, setDisplayName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [busy, setBusy] = useState(false);

  const createRoom = useCallback(() => {
    if (busy) return;
    setBusy(true);
    try {
      const id = uuidV4();
      const appUrl = getAppUrl();
      const nameParam = displayName.trim()
        ? `&name=${encodeURIComponent(displayName.trim())}`
        : "";
      // Route to the collaboration app's room entry point
      window.location.href = `${appUrl}/room/${id}?host=true${nameParam}`;
    } catch {
      setBusy(false);
      toast.error("Could not prepare a room. Please try again.");
    }
  }, [busy, displayName]);

  const joinRoom = useCallback(() => {
    const id = roomId.trim();
    if (!isValidUUID(id)) {
      toast.error(id ? "Enter a valid room invite ID." : "Enter a room invite ID.");
      return;
    }
    setBusy(true);
    try {
      const appUrl = getAppUrl();
      const nameParam = displayName.trim()
        ? `&name=${encodeURIComponent(displayName.trim())}`
        : "";
      window.location.href = `${appUrl}/room/${id}?${nameParam.replace("&", "")}`;
    } catch {
      setBusy(false);
      toast.error("Could not join room. Please try again.");
    }
  }, [displayName, roomId]);

  const handleShortcut = useCallback(
    (key: string) => {
      // Avoid hotkeys when typing in an input
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        if (key === "enter") {
          if (activeTab === "create") createRoom();
          else joinRoom();
        }
        return;
      }

      if (key === "n") {
        createRoom();
      }
      if (key === "enter") {
        if (activeTab === "create") {
          createRoom();
        } else {
          joinRoom();
        }
      }
      if (key === "j") {
        setActiveTab("join");
        window.requestAnimationFrame(() => {
          document.getElementById("room-id")?.focus();
        });
      }
    },
    [activeTab, createRoom, joinRoom]
  );

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-stone-50 font-sans text-stone-900 selection:bg-amber-200 selection:text-amber-900 dark:bg-stone-950 dark:text-stone-100 dark:selection:bg-amber-900 dark:selection:text-amber-100">
      <StaticBackground />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-stone-200/60 bg-stone-50/80 px-5 backdrop-blur-md transition-colors dark:border-stone-800/60 dark:bg-stone-950/80 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-offset-stone-950 rounded-xl"
            aria-label="Pockets Home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-600 text-white shadow-sm dark:bg-amber-500 dark:text-stone-950">
              <Video size={20} />
            </span>
            <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Pockets
            </span>
          </Link>

          {/* Ephemeral Status Pill */}
          <div className="hidden items-center gap-2 rounded-full border border-stone-200/90 bg-white/70 px-3 py-1 text-xs font-medium text-stone-600 dark:border-stone-800 dark:bg-stone-900/70 dark:text-stone-300 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>No accounts • Host-approved</span>
          </div>
        </div>

        {/* Global Controls & Keyboard Shortcuts */}
        <div className="flex items-center gap-2">
          <KeyboardShortcuts
            shortcuts={[
              { key: "n", label: "Create a new room" },
              { key: "j", label: "Focus room ID input" },
              { key: "enter", label: "Submit current room action" },
              { key: "?", label: "Toggle keyboard shortcuts dialog" },
              { key: "t", label: "Toggle light / dark mode" },
            ]}
            onShortcut={handleShortcut}
          />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content">
        {/* Hero Section: Split Stage */}
        <section
          aria-labelledby="hero-title"
          className="relative z-10 mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-6xl items-center gap-12 px-5 py-12 lg:grid-cols-[1.1fr_420px] lg:px-10 lg:py-20"
        >
          {/* Left Column: Brand Statement & Value Pillars */}
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-100/60 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-stone-800 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>A small room for your people</span>
            </div>

            <h1
              id="hero-title"
              className="text-4xl font-semibold leading-[1.08] tracking-tight text-stone-900 dark:text-stone-100 sm:text-6xl"
            >
              Meet, talk, and share in a{" "}
              <span className="text-amber-700 dark:text-amber-400">
                pocket studio.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-stone-600 dark:text-stone-300 sm:text-xl">
              Start an ephemeral workspace for face-to-face video, audio, and direct peer-to-peer file
              sharing. Guests knock with an invite ID and wait for host admission.
            </p>

            {/* Value Pillars List */}
            <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
              {[
                { label: "Zero signup", desc: "No cookies or accounts" },
                { label: "Host approval", desc: "You decide who enters" },
                { label: "Direct transfers", desc: "30 KiB P2P chunks" },
              ].map((pillar) => (
                <div
                  key={pillar.label}
                  className="rounded-xl border border-stone-200/90 bg-white/70 p-3 shadow-xs dark:border-stone-800/80 dark:bg-stone-900/60"
                >
                  <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100 text-sm">
                    <Check
                      size={15}
                      className="shrink-0 text-amber-700 dark:text-amber-400"
                    />
                    <span>{pillar.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Keyboard Hotkey Hint Footer */}
            <div className="mt-8 hidden items-center gap-3 text-xs text-stone-500 dark:text-stone-400 sm:flex">
              <span>Quick hotkeys:</span>
              <kbd className="rounded border border-stone-300 bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-stone-700 shadow-2xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                N
              </kbd>
              <span>New room</span>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <kbd className="rounded border border-stone-300 bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-stone-700 shadow-2xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                J
              </kbd>
              <span>Join room</span>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <kbd className="rounded border border-stone-300 bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-stone-700 shadow-2xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                ↵
              </kbd>
              <span>Submit</span>
            </div>
          </div>

          {/* Right Column: Tactile Room Entry Console */}
          <div className="w-full">
            <RoomEntryConsole
              displayName={displayName}
              setDisplayName={setDisplayName}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              roomId={roomId}
              setRoomId={setRoomId}
              busy={busy}
              onCreateRoom={createRoom}
              onJoinRoom={joinRoom}
            />
          </div>
        </section>

        {/* Interactive Studio Experience (Showcase Deck) */}
        <section
          aria-labelledby="showcase-title"
          className="relative mx-auto w-full max-w-6xl px-5 py-20 lg:px-10"
        >
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-stone-600 dark:border-stone-800 dark:bg-stone-900/70 dark:text-stone-300">
              <Sparkles size={12} className="text-amber-600 dark:text-amber-400" />
              Inside a Pocket Studio
            </span>
            <h2
              id="showcase-title"
              className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl"
            >
              Feel the tactile rhythm of collaboration.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300 sm:text-lg">
              Test out the mock studio below: toggle camera and mic states, copy the invite link, and simulate a
              30 KiB chunk WebRTC file transfer.
            </p>
          </div>

          <StudioPreview />
        </section>

        {/* Four Pillars Asymmetric Bento Grid */}
        <FeatureBento />

        {/* Technical Specs & FAQ Accordion */}
        <TechnicalFaq />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}

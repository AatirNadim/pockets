"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { v4 as uuidV4 } from "uuid";
import { ArrowRight, Check, Dices, Link2, Sparkles, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { useUserStore, generateRandomUsername } from "@/lib/stores/userStore";
import { isValidUUID } from "@/lib/utils";
import { ThemeToggle } from "@/components/custom/themeToggle";
import StaticBackground from "@/components/custom/staticBackground";
import { KeyboardShortcuts } from "@/components/custom/keyboardShortcuts";
import { StudioPreview } from "@/components/custom/landing/studioPreview";
import { FeatureBento } from "@/components/custom/landing/featureBento";
import { TechnicalFaq } from "@/components/custom/landing/technicalFaq";
import { LandingFooter } from "@/components/custom/landing/landingFooter";

export default function Home() {
  const router = useRouter();
  const { roomId, setRoomId, initializeUserAsGuest, initializeUserAsHost } = useUserStore();
  const [displayName, setDisplayName] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [busy, setBusy] = useState(false);

  const createRoom = useCallback(() => {
    if (busy) return;
    setBusy(true);
    try {
      initializeUserAsHost(displayName.trim());
      const id = uuidV4();
      setRoomId(id);
      router.push(`/room/${id}`);
    } catch {
      setBusy(false);
      toast.error("Could not prepare a room. Please try again.");
    }
  }, [busy, displayName, initializeUserAsHost, router, setRoomId]);

  const joinRoom = useCallback(() => {
    const id = (roomId || "").trim();
    if (!isValidUUID(id)) {
      toast.error(id ? "Enter a valid room invite ID." : "Enter a room invite ID.");
      return;
    }
    setBusy(true);
    initializeUserAsGuest(displayName.trim());
    router.push(`/room/${id}`);
  }, [displayName, initializeUserAsGuest, roomId, router]);

  const handleGenerateAlias = useCallback(() => {
    const alias = generateRandomUsername();
    setDisplayName(alias);
    toast.info(`Assigned alias: ${alias}`);
  }, [setDisplayName]);

  const handleShortcut = useCallback((key: string) => {
    if (key === "n") createRoom();
    if (key === "enter") {
      if (activeTab === "create") createRoom();
      else joinRoom();
    }
    if (key === "j") {
      setActiveTab("join");
      window.requestAnimationFrame(() => document.getElementById("room-id")?.focus());
    }
  }, [activeTab, createRoom, joinRoom]);

  const scrollToEntry = useCallback(() => {
    const el = document.getElementById("entry-title");
    if (el) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      const input = document.getElementById("display-name");
      input?.focus();
    }
  }, []);

  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-stone-50 font-sans text-stone-900 selection:bg-amber-200 selection:text-amber-900 dark:bg-stone-950 dark:text-stone-100 dark:selection:bg-amber-900 dark:selection:text-amber-100">
      <StaticBackground />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-stone-200/60 bg-stone-50/80 px-5 backdrop-blur-md transition-colors dark:border-stone-800/60 dark:bg-stone-950/80 sm:px-10">
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-amber-400 rounded-xl"
            aria-label="Pockets home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-600 text-white shadow-sm dark:bg-amber-400 dark:text-stone-950">
              <Video size={19} />
            </span>
            <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Pockets
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-4 text-sm font-medium text-stone-600 dark:text-stone-400 md:flex">
            <a
              href="#demo"
              className="inline-flex min-h-11 items-center rounded-lg px-2 transition hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:hover:text-stone-100 dark:focus-visible:ring-amber-400"
            >
              Studio Demo
            </a>
            <a
              href="#philosophy"
              className="inline-flex min-h-11 items-center rounded-lg px-2 transition hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:hover:text-stone-100 dark:focus-visible:ring-amber-400"
            >
              Capabilities
            </a>
            <a
              href="#specs"
              className="inline-flex min-h-11 items-center rounded-lg px-2 transition hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:hover:text-stone-100 dark:focus-visible:ring-amber-400"
            >
              Architecture
            </a>
            <a
              href="https://github.com/AatirNadim/pockets"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg px-2 transition hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:hover:text-stone-100 dark:focus-visible:ring-amber-400"
            >
              Docs
            </a>
          </nav>
        </div>

        {/* Global Controls & CTA */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={scrollToEntry}
            className="hidden sm:inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-700 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-400"
          >
            Start Room
          </button>
          <KeyboardShortcuts
            shortcuts={[
              { key: "enter", label: "Create or join the selected room" },
              { key: "n", label: "Create a new room" },
              { key: "j", label: "Choose join a room" },
            ]}
            onShortcut={handleShortcut}
          />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content">
        {/* Hero Section: Split Stage */}
        <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-6xl content-center items-start gap-12 px-5 py-12 lg:grid-cols-[1.1fr_430px] lg:px-10 lg:py-20">
          {/* Left Column: Brand Statement & Value Pillars */}
          <section className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-100/60 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-stone-800 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>A small room for your people</span>
            </div>

            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-stone-900 dark:text-stone-100 sm:text-6xl">
              Meet, talk, and share in a{" "}
              <span className="text-amber-700 dark:text-amber-400">
                pocket studio.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-stone-600 dark:text-stone-300 sm:text-xl">
              Start an ephemeral workspace for face-to-face video, audio, and direct peer-to-peer file
              sharing. Guests knock with an invite ID and wait for host admission.
            </p>

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
                  <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 hidden items-center gap-3 text-xs text-stone-600 dark:text-stone-400 sm:flex">
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
          </section>

          {/* Right Column: Room Entry Component */}
          <div className="w-full self-start lg:min-h-[540px]">
            <section
              aria-labelledby="entry-title"
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900 sm:p-7"
            >
              <div className="mb-6">
                <h2 id="entry-title" className="text-xl font-semibold tracking-tight">Come on in</h2>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Choose how you want to enter the room.</p>
              </div>
              <div role="tablist" aria-label="Room entry" className="grid grid-cols-2 rounded-xl bg-stone-200/80 p-1 dark:bg-stone-800">
                {(["create", "join"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-amber-400 ${
                      activeTab === tab
                        ? "bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white"
                        : "text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
                    }`}
                  >
                    {tab === "create" ? "Create a room" : "Join a room"}
                  </button>
                ))}
              </div>

              {/* Display Name Input with Randomize Option */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label htmlFor="display-name" className="text-sm font-medium text-stone-800 dark:text-stone-200">
                    Display name <span className="font-normal text-stone-600 dark:text-stone-400">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAlias}
                    title="Generate random alias"
                    aria-label="Generate random alias"
                    className="inline-flex min-h-11 -my-2 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-amber-400"
                  >
                    <Dices size={14} className="transition-transform active:rotate-180" />
                    <span>Randomize</span>
                  </button>
                </div>
                <div className="relative mt-2">
                  <input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={40}
                    autoComplete="nickname"
                    placeholder="e.g. Maya or SwiftFox429"
                    aria-describedby="display-name-help"
                    className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base outline-none placeholder:text-stone-600 focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus-visible:ring-amber-400"
                  />
                </div>
                <p id="display-name-help" className="mt-2 text-xs text-stone-600 dark:text-stone-400">
                  Seen by peers in the room. If empty, a friendly alias is assigned automatically.
                </p>
              </div>

              {activeTab === "join" && (
                <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-200" id="panel-join">
                  <label htmlFor="room-id" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
                    Room invite ID
                  </label>
                  <div className="relative mt-2">
                    <Link2 size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 dark:text-stone-400" aria-hidden="true" />
                    <input
                      id="room-id"
                      value={roomId || ""}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="Paste the room ID"
                      className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 font-mono text-sm outline-none placeholder:font-sans placeholder:text-stone-600 focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus-visible:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={activeTab === "create" ? createRoom : joinRoom}
                disabled={busy}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 font-semibold text-white transition hover:bg-amber-800 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-400"
              >
                {busy ? "Opening room…" : activeTab === "create" ? <>Create room <ArrowRight size={18} /></> : <>Request to join <Users size={18} /></>}
              </button>
              <p className="mt-4 text-center text-xs leading-5 text-stone-600 dark:text-stone-400">Room entry and peer connections depend on network availability. File downloads are requested by each recipient.</p>
            </section>
          </div>
        </div>

        {/* Interactive Studio Preview Section */}
        <section
          id="demo"
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

        {/* Philosophy & Capabilities Asymmetric Bento Grid */}
        <div id="philosophy">
          <FeatureBento />
        </div>

        {/* Technical Specs & FAQ Accordion */}
        <div id="specs">
          <TechnicalFaq />
        </div>
      </main>

      {/* Landing Footer */}
      <LandingFooter />
    </div>
  );
}

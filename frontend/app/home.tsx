"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { v4 as uuidV4 } from "uuid";
import { ArrowRight, Check, ChevronDown, Dices, Link2, Menu, Mic, MicOff, Sparkles, Users, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaStore } from "@/lib/stores/mediaStore";
import { useUserStore, generateRandomUsername } from "@/lib/stores/userStore";
import { isValidUUID } from "@/lib/utils";
import { ThemeToggle } from "@/components/custom/themeToggle";
import StaticBackground from "@/components/custom/staticBackground";
import { KeyboardShortcuts } from "@/components/custom/keyboardShortcuts";
import { StudioPreview } from "@/components/custom/landing/studioPreview";
import { FeatureBento } from "@/components/custom/landing/featureBento";
import { TechnicalFaq } from "@/components/custom/landing/technicalFaq";
import { LandingFooter } from "@/components/custom/landing/landingFooter";
import {
  DemoBackgroundSilhouettes,
  PhilosophyBackgroundSilhouettes,
} from "@/components/custom/landing/roomBackgroundSilhouettes";

export default function Home() {
  const router = useRouter();
  const { roomId, setRoomId, clearUser, initializeUserAsGuest, initializeUserAsHost } = useUserStore();
  const { isMicrophoneMuted, isVideoOff, setMicrophoneMuted, setIsVideoOff } = useMediaStore();
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
    if (displayName.trim()) initializeUserAsGuest(displayName.trim());
    else clearUser();
    router.push(`/room/${id}`);
  }, [clearUser, displayName, initializeUserAsGuest, roomId, router]);

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
      <StaticBackground variant="landing" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-2 border-b border-stone-200/60 bg-stone-50/80 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] backdrop-blur-md transition-colors dark:border-stone-800/60 dark:bg-stone-950/80 sm:h-20 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 sm:gap-3 font-semibold tracking-tight transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-amber-400 rounded-xl"
            aria-label="Pockets home"
          >
            <span className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-amber-600 text-white shadow-sm dark:bg-amber-400 dark:text-stone-950">
              <Video size={19} />
            </span>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Pockets
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav aria-label="Primary navigation" className="hidden items-center gap-2 xl:gap-4 text-sm font-medium text-stone-600 dark:text-stone-400 lg:flex">
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
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation menu"
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-stone-200 bg-white/80 text-stone-700 backdrop-blur-xl transition-colors hover:bg-stone-200/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-700 dark:focus-visible:ring-amber-400 lg:hidden"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-52 rounded-2xl border-stone-200/80 bg-white/95 p-1.5 backdrop-blur-xl dark:border-stone-700/80 dark:bg-stone-900/95"
            >
              <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3 text-sm font-medium">
                <a href="#demo">Studio Demo</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3 text-sm font-medium">
                <a href="#philosophy">Capabilities</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3 text-sm font-medium">
                <a href="#specs">Architecture</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3 text-sm font-medium">
                <a href="https://github.com/AatirNadim/pockets" target="_blank" rel="noreferrer">
                  Docs
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content">
        {/* Hero Section: Split Stage */}
        <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl content-center items-start gap-8 px-4 py-8 sm:min-h-[calc(100dvh-5rem)] sm:gap-12 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,430px)] lg:px-10 lg:py-20">
          {/* Left Column: Brand Statement & Value Pillars */}
          <section className="min-w-0 max-w-xl">
            {/* <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-100/60 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-stone-800 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>A small room for your people</span>
            </div> */}

            <h1 className="text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl lg:text-6xl">
              Meet, talk, and share in a{" "}
              <span className="text-amber-700 dark:text-amber-400">
                pocket studio.
              </span>
            </h1>

            <p className="mt-5 text-base leading-relaxed text-stone-600 dark:text-stone-300 sm:mt-6 sm:text-lg lg:text-xl">
              Start an ephemeral workspace for face-to-face video, audio, and direct peer-to-peer file
              sharing. Guests knock with an invite ID and wait for host admission.
            </p>

            <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-3.5">
              {[
                { label: "Zero signup", desc: "No cookies or accounts" },
                { label: "Host approval", desc: "You decide who enters" },
                { label: "Direct transfers", desc: "30 KiB P2P chunks" },
              ].map((pillar) => (
                <div
                  key={pillar.label}
                  className="min-w-0 rounded-xl border border-stone-200/90 bg-white/70 p-3 shadow-xs dark:border-stone-800/80 dark:bg-stone-900/60"
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
          <div className="w-full min-w-0 self-start lg:min-h-[540px]">
            <section
              aria-labelledby="entry-title"
              className="rounded-3xl border border-stone-200 bg-white p-4 shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900 sm:p-7"
            >
              <div className="mb-5 sm:mb-6">
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
                    className={`min-h-11 rounded-lg px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-amber-400 sm:px-3 sm:text-sm ${
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
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                  {activeTab === "create" ? "Seen by peers in the room. If empty, a friendly alias is assigned automatically." : "Seen by the host when you ask to join. You can also enter it on the next screen."}
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
                      className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 font-mono text-base sm:text-sm outline-none placeholder:font-sans placeholder:text-stone-600 focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus-visible:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex w-full">
                <button
                  type="button"
                  onClick={activeTab === "create" ? createRoom : joinRoom}
                  disabled={busy}
                  className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-l-xl bg-amber-700 px-4 font-semibold text-white transition hover:bg-amber-800 disabled:cursor-wait disabled:opacity-70 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-400"
                >
                  {busy ? "Opening room…" : activeTab === "create" ? <>Create room <ArrowRight size={18} /></> : <>Request to join <Users size={18} /></>}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label="Choose microphone and camera settings"
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-r-xl border-l border-white/25 bg-amber-700 px-3 text-white transition hover:bg-amber-800 disabled:cursor-wait disabled:opacity-70 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-stone-950/20 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-400"
                    >
                      <ChevronDown size={18} aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-2xl border-stone-200 bg-white p-2 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold text-stone-600 dark:text-stone-400">Join with</p>
                    <DropdownMenuCheckboxItem checked={!isMicrophoneMuted} onCheckedChange={(checked) => setMicrophoneMuted(!checked)} onSelect={(event) => event.preventDefault()} className="min-h-11 rounded-xl pr-3">
                      {isMicrophoneMuted ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
                      Microphone {isMicrophoneMuted ? "off" : "on"}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={!isVideoOff} onCheckedChange={(checked) => setIsVideoOff(!checked)} onSelect={(event) => event.preventDefault()} className="min-h-11 rounded-xl pr-3">
                      {isVideoOff ? <VideoOff aria-hidden="true" /> : <Video aria-hidden="true" />}
                      Camera {isVideoOff ? "off" : "on"}
                    </DropdownMenuCheckboxItem>
                    <p className="px-3 pb-2 pt-1 text-xs leading-5 text-stone-600 dark:text-stone-400">You can change these inside the room.</p>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-stone-600 dark:text-stone-400">Room entry and peer connections depend on network availability. File downloads are requested by each recipient.</p>
            </section>
          </div>
        </div>

        {/* Interactive Studio Preview Section */}
        <div className="relative">
          <DemoBackgroundSilhouettes />
          <section
            id="demo"
            aria-labelledby="showcase-title"
            className="relative z-10 mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-10"
          >
            <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-stone-600 dark:border-stone-800 dark:bg-stone-900/70 dark:text-stone-300">
                <Sparkles size={12} className="text-amber-600 dark:text-amber-400" />
                Inside a Pocket Studio
              </span>
              <h2
                id="showcase-title"
                className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl"
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
        </div>

        {/* Philosophy & Capabilities Asymmetric Bento Grid */}
        <div id="philosophy" className="relative">
          <PhilosophyBackgroundSilhouettes />
          <div className="relative z-10">
            <FeatureBento />
          </div>
        </div>

        {/* Technical Specs & FAQ Accordion */}
        <div id="specs" className="relative z-10">
          <TechnicalFaq />
        </div>
      </main>

      {/* Landing Footer */}
      <LandingFooter />
    </div>
  );
}

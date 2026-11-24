"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { v4 as uuidV4 } from "uuid";
import { ArrowRight, Check, Link2, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/lib/stores/userStore";
import { isValidUUID } from "@/lib/utils";
import { ThemeToggle } from "@/components/custom/themeToggle";
import StaticBackground from "@/components/custom/staticBackground";
import { KeyboardShortcuts } from "@/components/custom/keyboardShortcuts";

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

  const joinRoom = () => {
    const id = (roomId || "").trim();
    if (!isValidUUID(id)) {
      toast.error(id ? "Enter a valid room invite ID." : "Enter a room invite ID.");
      return;
    }
    setBusy(true);
    initializeUserAsGuest(displayName.trim());
    router.push(`/room/${id}`);
  };

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

  return (
    <main className="relative min-h-dvh overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <StaticBackground />
      <header className="relative z-10 flex h-20 items-center justify-between px-5 sm:px-10">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight" aria-label="Pockets home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-600 text-white"><Video size={19} /></span>
          <span className="text-xl">Pockets</span>
        </Link>
        <div className="flex items-center gap-2">
          <KeyboardShortcuts
            shortcuts={[{ key: "enter", label: "Create or join the selected room" }, { key: "n", label: "Create a new room" }, { key: "j", label: "Choose join a room" }]}
            onShortcut={handleShortcut}
          />
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-[1fr_430px] lg:px-10">
        <section className="max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-3 py-1.5 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300"><span className="h-2 w-2 rounded-full bg-emerald-600" /> A small room for your people</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Meet, talk, and share in a <span className="text-amber-700 dark:text-amber-400">pocket studio.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-stone-600 dark:text-stone-300">Start a temporary room for face-to-face conversation and direct file sharing. Guests join with a room ID and wait for the host to admit them.</p>
          <div className="mt-9 grid gap-4 text-sm text-stone-700 dark:text-stone-300 sm:grid-cols-3">
            {["No account needed", "Host-approved entry", "Room-based file sharing"].map((item) => <div key={item} className="flex items-center gap-2"><Check size={16} className="shrink-0 text-amber-700 dark:text-amber-400" />{item}</div>)}
          </div>
        </section>

        <section aria-labelledby="entry-title" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900 sm:p-7">
          <div className="mb-6">
            <h2 id="entry-title" className="text-xl font-semibold">Come on in</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Choose how you want to enter the room.</p>
          </div>
          <div role="tablist" aria-label="Room entry" className="grid grid-cols-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
            {(["create", "join"] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`min-h-11 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${activeTab === tab ? "bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white" : "text-stone-600 dark:text-stone-300"}`}>{tab === "create" ? "Create a room" : "Join a room"}</button>)}
          </div>
          <label htmlFor="display-name" className="mt-6 block text-sm font-medium">Display name <span className="font-normal text-stone-500">(optional)</span></label>
          <input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} autoComplete="nickname" placeholder="What should people call you?" className="mt-2 h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base outline-none placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-950" />
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">This is the name other people in the room will see.</p>

          {activeTab === "join" && <div className="mt-5"><label htmlFor="room-id" className="block text-sm font-medium">Room invite ID</label><div className="relative mt-2"><Link2 size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" /><input id="room-id" value={roomId || ""} onChange={(e) => setRoomId(e.target.value)} placeholder="Paste the room ID" className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 font-mono text-sm outline-none placeholder:font-sans placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-950" /></div></div>}

          <button type="button" onClick={activeTab === "create" ? createRoom : joinRoom} disabled={busy} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 font-semibold text-white transition hover:bg-amber-800 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300">
            {busy ? "Opening room…" : activeTab === "create" ? <>Create room <ArrowRight size={18} /></> : <>Request to join <Users size={18} /></>}
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-stone-500 dark:text-stone-400">Room entry and peer connections depend on network availability. File downloads are requested by each recipient.</p>
        </section>
      </div>
    </main>
  );
}

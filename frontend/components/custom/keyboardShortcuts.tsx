"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Keyboard, X } from "lucide-react";
import { useTheme } from "@/components/custom/theme-provider";
import { Button } from "@/components/ui/button";

export type Shortcut = { key: string; label: string };

type KeyboardShortcutsProps = {
  shortcuts: Shortcut[];
  onShortcut: (key: string) => void;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.isContentEditable ||
      target.closest("input, textarea, select, button, a, summary, [role='button'], [role='tab'], [role='textbox'], [role='combobox'], [contenteditable='true']")
  );
}

export function KeyboardShortcuts({ shortcuts, onShortcut }: KeyboardShortcutsProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeBtn = dialogRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    closeBtn?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open, mounted]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (event.key === "Enter" && shortcuts.some((shortcut) => shortcut.key === "enter")) {
        const target = event.target;
        if (target instanceof HTMLInputElement && ["display-name", "room-id"].includes(target.id)) {
          event.preventDefault();
          onShortcut("enter");
        }
        return;
      }
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (event.key === "?" || key === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }

      if (key === "t") {
        event.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        return;
      }
      if (shortcuts.some((shortcut) => shortcut.key === key)) {
        event.preventDefault();
        onShortcut(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onShortcut, open, resolvedTheme, setTheme, shortcuts]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-label="Show keyboard shortcuts"
        aria-keyshortcuts="k ?"
        title="Keyboard shortcuts (K or ?)"
        onClick={() => setOpen(true)}
        className="h-11 shrink-0 gap-1.5 px-2.5 has-[>svg]:px-2.5"
      >
        <Keyboard size={18} aria-hidden="true" />
        <kbd
          aria-hidden="true"
          className="rounded border border-stone-300 bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold leading-none text-stone-700 shadow-2xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
        >
          K
        </kbd>
      </Button>
      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcut-title"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
              const first = buttons[0];
              const last = buttons[buttons.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-700 dark:bg-stone-900 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 id="shortcut-title" className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Keyboard shortcuts</h2>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Available when you are not typing.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Close shortcuts" onClick={() => setOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <dl className="space-y-2">
              {[
                ...shortcuts.map(({ key, label }) => ({
                  key,
                  keys: [key === "?" ? "?" : key === "enter" ? "Enter" : key.toUpperCase()],
                  label,
                })),
                { key: "t", keys: ["T"], label: "Toggle light or dark theme" },
                { key: "k", keys: ["K", "?"], label: "Show or hide this cheat sheet" },
              ].map(({ key, keys, label }) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-stone-200/70 bg-stone-50 px-3 py-2.5 dark:border-stone-700/60 dark:bg-stone-800">
                  <dt className="text-sm text-stone-700 dark:text-stone-200">{label}</dt>
                  <dd className="flex items-center gap-1.5">
                    {keys.map((k) => (
                      <kbd key={k} className="min-w-8 rounded-md border border-stone-300 bg-white px-2 py-1 text-center font-mono text-xs font-semibold text-stone-700 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200">{k}</kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-5 text-stone-600 dark:text-stone-400">Shortcuts use single keys without Ctrl, Alt, or Command, so they avoid common browser key combinations. They pause while a text field or editable control is focused.</p>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}

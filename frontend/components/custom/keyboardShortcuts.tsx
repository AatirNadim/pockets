"use client";

import { useEffect, useState } from "react";
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
  const { resolvedTheme, setTheme } = useTheme();

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

      if (event.key === "?") {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }

      const key = event.key.toLowerCase();
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
        size="icon"
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        onClick={() => setOpen(true)}
        className="size-10 shrink-0"
      >
        <Keyboard size={18} />
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcut-title"
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-700 dark:bg-stone-900 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 id="shortcut-title" className="text-lg font-semibold">Keyboard shortcuts</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Available when you are not typing.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close shortcuts" onClick={() => setOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <dl className="space-y-2">
              {[...shortcuts, { key: "t", label: "Toggle light or dark theme" }, { key: "?", label: "Show or hide this cheat sheet" }].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800">
                  <dt className="text-sm text-stone-700 dark:text-stone-200">{label}</dt>
                  <dd><kbd className="min-w-8 rounded-md border border-stone-300 bg-white px-2 py-1 text-center font-mono text-xs font-semibold text-stone-700 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200">{key === "?" ? "?" : key === "enter" ? "Enter" : key.toUpperCase()}</kbd></dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-5 text-stone-500 dark:text-stone-400">Shortcuts use single keys without Ctrl, Alt, or Command, so they avoid common browser key combinations. They pause while a text field or editable control is focused.</p>
          </section>
        </div>
      )}
    </>
  );
}

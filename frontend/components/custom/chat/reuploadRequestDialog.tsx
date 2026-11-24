"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ReuploadRequestDialogProps = {
  files: Array<{ id: string; name: string }>;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ReuploadRequestDialog({ files, open, onConfirm, onCancel }: ReuploadRequestDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    firstButton?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal((
    <div className="fixed inset-0 z-[100] grid place-items-center bg-stone-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="reupload-title" aria-describedby="reupload-description" onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCancel(); return; }
        if (event.key !== "Tab") return;
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }} className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900">
        <h2 id="reupload-title" className="text-base font-semibold text-stone-900 dark:text-stone-100">Ask the sender to upload again?</h2>
        <p id="reupload-description" className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          {files.length === 1 ? "This file is no longer available in the sender’s room memory." : `${files.length} files are no longer available in the sender’s room memory.`} Send them a chat message asking for a fresh upload?
        </p>
        <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-lg bg-stone-50 p-3 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-200">
          {files.map((file) => <li key={file.id} className="break-all">{file.name}</li>)}
        </ul>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>No, thanks</Button>
          <Button type="button" onClick={onConfirm}>Send request</Button>
        </div>
      </section>
    </div>
  ), document.body);
}

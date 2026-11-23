"use client";

import { Button } from "@/components/ui/button";

type ReuploadRequestDialogProps = {
  files: Array<{ id: string; name: string }>;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ReuploadRequestDialog({ files, open, onConfirm, onCancel }: ReuploadRequestDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="reupload-title" aria-describedby="reupload-description" className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-700 dark:bg-stone-900">
        <h2 id="reupload-title" className="text-base font-semibold text-stone-900 dark:text-stone-100">Ask the sender to upload again?</h2>
        <p id="reupload-description" className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          {files.length === 1 ? "This file is no longer available in the sender’s room memory." : `${files.length} files are no longer available in the sender’s room memory.`} Send them a chat message asking for a fresh upload?
        </p>
        <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-lg bg-stone-50 p-3 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-200">
          {files.map((file) => <li key={file.id} className="break-all">{file.name}</li>)}
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>No, thanks</Button>
          <Button type="button" onClick={onConfirm}>Send request</Button>
        </div>
      </section>
    </div>
  );
}

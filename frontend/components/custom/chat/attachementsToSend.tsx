import { QueuedFile } from "@/lib/stores/fileStore";
import { X } from "lucide-react";
import React from "react";

type AttachementsProps = {
  filesToBeSent: QueuedFile[];
  handleRemoveQueuedFile: (id: string) => void;
  formatBytes: (bytes: number) => string;
};

const AttachementsToSend = ({
  filesToBeSent,
  handleRemoveQueuedFile,
  formatBytes,
}: AttachementsProps) => {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {filesToBeSent.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-2 rounded-xl bg-stone-100/80 px-3 py-1 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-200"
        >
          <div className="max-w-[min(12rem,45vw)] truncate font-medium" title={entry.file.name}>
            {entry.file.name}
          </div>
          <span className="text-[10px] uppercase tracking-wide opacity-70">
            {formatBytes(entry.file.size)}
          </span>
          <button
            type="button"
            onClick={() => handleRemoveQueuedFile(entry.id)}
            className="rounded-full bg-white/50 p-1 text-stone-600 transition hover:bg-white hover:text-stone-900 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
            aria-label="Remove file"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AttachementsToSend;

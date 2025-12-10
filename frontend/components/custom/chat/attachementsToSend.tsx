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
          className="flex items-center gap-2 rounded-full bg-slate-200/70 px-3 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-gray-200"
        >
          <div className="max-w-[140px] truncate font-medium">
            {entry.file.name}
          </div>
          <span className="text-[10px] uppercase tracking-wide opacity-70">
            {formatBytes(entry.file.size)}
          </span>
          <button
            type="button"
            onClick={() => handleRemoveQueuedFile(entry.id)}
            className="rounded-full bg-white/50 p-1 text-slate-600 transition hover:bg-white hover:text-slate-900 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
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

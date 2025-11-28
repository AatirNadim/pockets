import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

import type { FileAttachment } from "../types";

export type QueuedFile = {
  id: string;
  file: File;
};

export type ReceivedFileRecord = FileAttachment & {
  url: string | null;
  receivedAt: number;
};

interface FileState {
  filesToBeSent: QueuedFile[];
  fileCatalog: Record<string, QueuedFile>;
  receivedFiles: Record<string, ReceivedFileRecord>;
  sendingFile: File | null;
  transferProgress: number;
  isSending: boolean;
}

interface FileActions {
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  clearFilesToBeSent: () => void;
  setSendingFile: (file: File | null) => void;
  setTransferProgress: (progress: number) => void;
  setIsSending: (isSending: boolean) => void;
  registerReceivedFile: (file: ReceivedFileRecord) => void;
  getLocalFileEntry: (fileId: string) => QueuedFile | undefined;
  getLocalFile: (fileId: string) => File | undefined;
  hasLocalFile: (fileId: string) => boolean;
  getReceivedFile: (fileId: string) => ReceivedFileRecord | undefined;
  resetFileStore: () => void;
}

const MAX_QUEUED_FILES = 10;
const revokeUrl = (url?: string | null) => {
  if (typeof window === "undefined" || !url) {
    return;
  }
  URL.revokeObjectURL(url);
};

export type { FileState };

export const useFileStore = create<FileState & FileActions>()((set, get) => ({
  filesToBeSent: [],
  fileCatalog: {},
  receivedFiles: {},
  sendingFile: null,
  transferProgress: 0,
  isSending: false,
  addFiles: (newFiles) =>
    set((state) => {
      if (!newFiles.length) {
        return state;
      }

      const availableSlots = Math.max(0, MAX_QUEUED_FILES - state.filesToBeSent.length);
      if (availableSlots === 0) {
        return state;
      }

      const deduped = newFiles.filter((file) =>
        !state.filesToBeSent.some(
          (entry) => entry.file.name === file.name && entry.file.size === file.size
        )
      );

      const nextEntries = deduped.slice(0, availableSlots).map((file) => ({
        id: uuidv4(),
        file,
      }));

      if (!nextEntries.length) {
        return state;
      }

      const nextCatalog = { ...state.fileCatalog };
      nextEntries.forEach((entry) => {
        nextCatalog[entry.id] = entry;
      });

      return {
        ...state,
        filesToBeSent: [...state.filesToBeSent, ...nextEntries],
        fileCatalog: nextCatalog,
      };
    }),
  removeFile: (fileId) =>
    set((state) => {
      const nextQueue = state.filesToBeSent.filter((entry) => entry.id !== fileId);
      if (nextQueue.length === state.filesToBeSent.length) {
        return state;
      }

      const nextCatalog = { ...state.fileCatalog };
      delete nextCatalog[fileId];

      return {
        ...state,
        filesToBeSent: nextQueue,
        fileCatalog: nextCatalog,
      };
    }),
  clearFilesToBeSent: () =>
    set((state) => ({
      ...state,
      filesToBeSent: [],
    })),
  setSendingFile: (file) => set({ sendingFile: file }),
  setTransferProgress: (progress) => set({ transferProgress: progress }),
  setIsSending: (isSending) => set({ isSending }),
  registerReceivedFile: (file) =>
    set((state) => {
      const prevRecord = state.receivedFiles[file.id];
      if (prevRecord?.url && prevRecord.url !== file.url) {
        revokeUrl(prevRecord.url);
      }

      return {
        ...state,
        receivedFiles: {
          ...state.receivedFiles,
          [file.id]: file,
        },
      };
    }),
  getLocalFileEntry: (fileId) => get().fileCatalog[fileId],
  getLocalFile: (fileId) => get().fileCatalog[fileId]?.file,
  hasLocalFile: (fileId) => Boolean(get().fileCatalog[fileId]),
  getReceivedFile: (fileId) => get().receivedFiles[fileId],
  resetFileStore: () => {
    const state = get();
    Object.values(state.receivedFiles).forEach((record) => revokeUrl(record.url));

    set({
      filesToBeSent: [],
      fileCatalog: {},
      receivedFiles: {},
      sendingFile: null,
      transferProgress: 0,
      isSending: false,
    });
  },
}));

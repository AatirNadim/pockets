import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

import type { FileAttachment } from "../types";
import { MAX_QUEUED_FILES } from "../constants";

export type QueuedFile = {
  id: string;
  file: File;
};

export type ReceivedFileRecord = FileAttachment & {
  url: string | null;
  receivedAt: number;
};

export type DownloadProgressRecord = {
  status: "requested" | "in-progress";
  receivedBytes: number;
  totalBytes: number | null;
  startedAt: number;
};

interface FileState {
  filesToBeSent: QueuedFile[];
  fileCatalog: Record<string, QueuedFile>;
  receivedFiles: Record<string, ReceivedFileRecord>;
  downloadProgress: Record<string, DownloadProgressRecord>;
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
  markDownloadRequested: (fileId: string) => void;
  beginDownload: (fileId: string, totalBytes: number) => void;
  updateDownloadProgress: (fileId: string, receivedBytes: number) => void;
  clearDownloadProgress: (fileId: string) => void;
  resetFileStore: () => void;
}

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
  downloadProgress: {},
  sendingFile: null,
  transferProgress: 0,
  isSending: false,
  addFiles: (newFiles) =>
    set((state) => {
      if (!newFiles.length) {
        return state;
      }

      console.log("Adding files to send queue:", newFiles);

      // check if we can add more files
      const availableSlots = Math.max(
        0,
        MAX_QUEUED_FILES - state.filesToBeSent.length
      );
      if (availableSlots === 0) {
        console.warn("File send queue is full, cannot add more files.");
        return state;
      }

      // ensure that duplicate files are not added

      console.log(
        "Selected files below max threshold; making sure no duplicates in the selected files"
      );
      const deduped = newFiles.filter(
        (file) =>
          !state.filesToBeSent.some(
            (entry) =>
              entry.file.name === file.name && entry.file.size === file.size
          )
      );

      console.log(
        `After deduplication, ${deduped.length} files remain to be added to the queue.`
      );
      // add new files to the queue, assign unique IDs
      const nextEntries = deduped.slice(0, availableSlots).map((file) => ({
        id: uuidv4(),
        file,
      }));

      if (!nextEntries.length) {
        return state;
      }

      console.log(`Adding files to the file catalog, files: `, nextEntries);
      // add new files to the catalog (to be used when a remote peer requests a file)
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
      const nextQueue = state.filesToBeSent.filter(
        (entry) => entry.id !== fileId
      );
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
  markDownloadRequested: (fileId) =>
    set((state) => ({
      ...state,
      downloadProgress: {
        ...state.downloadProgress,
        [fileId]: {
          status: "requested",
          receivedBytes: 0,
          totalBytes: null,
          startedAt: Date.now(),
        },
      },
    })),
  beginDownload: (fileId, totalBytes) =>
    set((state) => {
      const existing = state.downloadProgress[fileId];
      return {
        ...state,
        downloadProgress: {
          ...state.downloadProgress,
          [fileId]: {
            status: "in-progress",
            receivedBytes: existing?.receivedBytes ?? 0,
            totalBytes,
            startedAt: existing?.startedAt ?? Date.now(),
          },
        },
      };
    }),
  updateDownloadProgress: (fileId, receivedBytes) =>
    set((state) => {
      const tracker = state.downloadProgress[fileId];
      if (!tracker) {
        return state;
      }

      return {
        ...state,
        downloadProgress: {
          ...state.downloadProgress,
          [fileId]: {
            ...tracker,
            receivedBytes,
          },
        },
      };
    }),
  clearDownloadProgress: (fileId) =>
    set((state) => {
      if (!state.downloadProgress[fileId]) {
        return state;
      }

      const { [fileId]: _removed, ...rest } = state.downloadProgress;
      return {
        ...state,
        downloadProgress: rest,
      };
    }),
  getLocalFileEntry: (fileId) => get().fileCatalog[fileId],
  getLocalFile: (fileId) => get().fileCatalog[fileId]?.file,
  hasLocalFile: (fileId) => Boolean(get().fileCatalog[fileId]),
  getReceivedFile: (fileId) => get().receivedFiles[fileId],
  resetFileStore: () => {
    const state = get();
    Object.values(state.receivedFiles).forEach((record) =>
      revokeUrl(record.url)
    );

    set({
      filesToBeSent: [],
      fileCatalog: {},
      receivedFiles: {},
      downloadProgress: {},
      sendingFile: null,
      transferProgress: 0,
      isSending: false,
    });
  },
}));

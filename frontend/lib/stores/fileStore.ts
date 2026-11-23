import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

import { MAX_QUEUED_FILES } from "../constants";

export type QueuedFile = {
  id: string;
  file: File;
  sharedAt?: number;
};

export const SHARED_FILE_TTL_MS = 10 * 60 * 1000;

export type DownloadProgressRecord = {
  status: "requested" | "in-progress";
  receivedBytes: number;
  totalBytes: number | null;
  startedAt: number;
  lastActivityAt: number;
  ownerId?: string;
};

/**
 * Tracks an active upload session for UI display purposes.
 */
export type UploadSessionInfo = {
  sessionId: string;
  remoteUserId: string;
  fileNames: string[];
  sentBytes: number;
  totalBytes: number;
  percentage: number;
  startedAt: number;
};

interface FileState {
  filesToBeSent: QueuedFile[];
  fileCatalog: Record<string, QueuedFile>;
  downloadProgress: Record<string, DownloadProgressRecord>;
  /** @deprecated Use activeUploadSessions for per-session tracking */
  sendingFile: File | null;
  /** @deprecated Use activeUploadSessions for per-session tracking */
  transferProgress: number;
  /** @deprecated Use activeUploadSessions.size > 0 for checking if any upload is active */
  isSending: boolean;
  /** Active upload sessions (keyed by sessionId) */
  activeUploadSessions: Record<string, UploadSessionInfo>;
}

interface FileActions {
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  clearFilesToBeSent: () => void;
  /** @deprecated Use session-based tracking */
  setSendingFile: (file: File | null) => void;
  /** @deprecated Use session-based tracking */
  setTransferProgress: (progress: number) => void;
  /** @deprecated Use session-based tracking */
  setIsSending: (isSending: boolean) => void;
  getLocalFileEntry: (fileId: string) => QueuedFile | undefined;
  markFilesShared: (fileIds: string[], sharedAt?: number) => void;
  expireSharedFiles: (now?: number) => void;
  getLocalFile: (fileId: string) => File | undefined;
  hasLocalFile: (fileId: string) => boolean;
  markDownloadRequested: (fileIds: string[], ownerId?: string) => void;
  beginDownload: (fileId: string, totalBytes: number) => void;
  updateDownloadProgress: (fileId: string, receivedBytes: number) => void;
  clearDownloadProgress: (fileIds: string[]) => void;
  resetFileStore: () => void;
  // Session-based upload tracking
  startUploadSession: (session: UploadSessionInfo) => void;
  updateUploadSession: (
    sessionId: string,
    updates: Partial<Pick<UploadSessionInfo, "sentBytes" | "percentage">>
  ) => void;
  endUploadSession: (sessionId: string) => void;
  getActiveUploadCount: () => number;
  hasActiveUploads: () => boolean;
}

const fileExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

export type { FileState };

export const useFileStore = create<FileState & FileActions>()((set, get) => ({
  filesToBeSent: [],
  fileCatalog: {},
  downloadProgress: {},
  sendingFile: null,
  transferProgress: 0,
  isSending: false,
  activeUploadSessions: {},
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
  markDownloadRequested: (fileIds, ownerId) =>
    set((state) => ({
      ...state,
      downloadProgress: {
        ...state.downloadProgress,
        ...fileIds.reduce((acc, fileId) => {
          if (state.downloadProgress[fileId]) {
            return acc;
          }
          const now = Date.now();
          acc[fileId] = {
            status: "requested",
            receivedBytes: 0,
            totalBytes: null,
            startedAt: now,
            lastActivityAt: now,
            ownerId,
          };
          return acc;
        }, {} as Record<string, DownloadProgressRecord>),
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
            lastActivityAt: Date.now(),
            ownerId: existing?.ownerId,
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
            lastActivityAt: Date.now(),
          },
        },
      };
    }),
  clearDownloadProgress: (fileIds) =>
    set((state) => {
      let newState = { ...state };
      fileIds.forEach((fileId) => {
        const rest = { ...newState.downloadProgress };
        delete rest[fileId];
        newState = {
          ...newState,
          downloadProgress: rest,
        };
      });
      return newState;
    }),
  getLocalFileEntry: (fileId) => {
    const entry = get().fileCatalog[fileId];
    if (!entry || entry.sharedAt === undefined || Date.now() - entry.sharedAt >= SHARED_FILE_TTL_MS) return undefined;
    return entry;
  },
  markFilesShared: (fileIds, sharedAt = Date.now()) => {
    set((state) => {
      const fileCatalog = { ...state.fileCatalog };
      for (const fileId of fileIds) {
        const entry = fileCatalog[fileId];
        if (entry) fileCatalog[fileId] = { ...entry, sharedAt };
      }
      return { ...state, fileCatalog };
    });
    for (const fileId of fileIds) {
      const previous = fileExpiryTimers.get(fileId);
      if (previous) clearTimeout(previous);
      fileExpiryTimers.set(fileId, setTimeout(() => {
        useFileStore.getState().expireSharedFiles();
        fileExpiryTimers.delete(fileId);
      }, Math.max(0, sharedAt + SHARED_FILE_TTL_MS - Date.now())));
    }
  },
  expireSharedFiles: (now = Date.now()) => set((state) => {
    const fileCatalog = { ...state.fileCatalog };
    let changed = false;
    for (const [fileId, entry] of Object.entries(fileCatalog)) {
      if (entry.sharedAt !== undefined && now - entry.sharedAt >= SHARED_FILE_TTL_MS) {
        delete fileCatalog[fileId];
        changed = true;
      }
    }
    if (!changed) return state;
    for (const [fileId, entry] of Object.entries(state.fileCatalog)) {
      if (entry.sharedAt !== undefined && now - entry.sharedAt >= SHARED_FILE_TTL_MS) {
        const timer = fileExpiryTimers.get(fileId);
        if (timer) clearTimeout(timer);
        fileExpiryTimers.delete(fileId);
      }
    }
    return { ...state, fileCatalog };
  }),
  getLocalFile: (fileId) => {
    const entry = get().fileCatalog[fileId];
    return entry && (entry.sharedAt === undefined || Date.now() - entry.sharedAt < SHARED_FILE_TTL_MS) ? entry.file : undefined;
  },
  hasLocalFile: (fileId) => {
    const entry = get().fileCatalog[fileId];
    return Boolean(entry && (entry.sharedAt === undefined || Date.now() - entry.sharedAt < SHARED_FILE_TTL_MS));
  },
  resetFileStore: () => {
    fileExpiryTimers.forEach(clearTimeout);
    fileExpiryTimers.clear();

    set({
      filesToBeSent: [],
      fileCatalog: {},
      downloadProgress: {},
      sendingFile: null,
      transferProgress: 0,
      isSending: false,
      activeUploadSessions: {},
    });
  },
  // Session-based upload tracking
  startUploadSession: (session) =>
    set((state) => ({
      ...state,
      activeUploadSessions: {
        ...state.activeUploadSessions,
        [session.sessionId]: session,
      },
    })),
  updateUploadSession: (sessionId, updates) =>
    set((state) => {
      const existing = state.activeUploadSessions[sessionId];
      if (!existing) {
        return state;
      }
      return {
        ...state,
        activeUploadSessions: {
          ...state.activeUploadSessions,
          [sessionId]: {
            ...existing,
            ...updates,
          },
        },
      };
    }),
  endUploadSession: (sessionId) =>
    set((state) => {
      if (!state.activeUploadSessions[sessionId]) {
        return state;
      }
      const rest = { ...state.activeUploadSessions };
      delete rest[sessionId];
      return {
        ...state,
        activeUploadSessions: rest,
      };
    }),
  getActiveUploadCount: () => Object.keys(get().activeUploadSessions).length,
  hasActiveUploads: () => Object.keys(get().activeUploadSessions).length > 0,
}));

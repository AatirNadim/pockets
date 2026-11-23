"use client";

type WritableFile = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
  abort?: (reason?: unknown) => Promise<void>;
};

export type SaveFileHandle = {
  createWritable: () => Promise<WritableFile>;
};

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options?: { suggestedName?: string }) => Promise<SaveFileHandle>;
  showDirectoryPicker?: () => Promise<{
    getFileHandle: (name: string, options: { create: boolean }) => Promise<SaveFileHandle>;
  }>;
};

const destinations = new Map<string, SaveFileHandle>();

export const pickFileDestination = async (name: string) => {
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (!picker) throw new Error("Your browser does not support choosing a download location. Use a current version of Chrome or Edge.");
  return picker.call(window, { suggestedName: name });
};

export const pickFolderDestinations = async (files: Array<{ id: string; name: string }>) => {
  const picker = (window as SavePickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("Your browser does not support choosing a download folder. Use a current version of Chrome or Edge.");
  const directory = await picker.call(window);
  const result = new Map<string, SaveFileHandle>();
  for (const file of files) {
    result.set(file.id, {
      createWritable: async () => (await directory.getFileHandle(file.name, { create: true })).createWritable(),
    });
  }
  return result;
};

export const setDownloadDestination = (fileId: string, handle: SaveFileHandle) => destinations.set(fileId, handle);
export const clearDownloadDestination = (fileId: string) => destinations.delete(fileId);
export const takeDownloadDestination = (fileId: string) => {
  const handle = destinations.get(fileId);
  destinations.delete(fileId);
  return handle;
};

export const openDownloadWriter = async (handle: SaveFileHandle) => handle.createWritable();

export const saveBlobToHandle = async (blob: Blob, handle: SaveFileHandle) => {
  const writable = await handle.createWritable();
  try {
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    await writable.abort?.(error).catch(() => undefined);
    throw error;
  }
};

export const describeSaveError = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") return "Download cancelled. No file was saved.";
  return error instanceof Error ? error.message : "The file could not be saved to the selected location.";
};

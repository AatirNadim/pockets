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
  const usedNames = new Set<string>();
  for (const file of files) {
    const dot = file.name.lastIndexOf(".");
    const base = dot > 0 ? file.name.slice(0, dot) : file.name;
    const extension = dot > 0 ? file.name.slice(dot) : "";
    let name = file.name;
    let suffix = 2;
    let occupied = true;
    while (occupied) {
      if (usedNames.has(name.toLocaleLowerCase())) {
        name = `${base} (${suffix++})${extension}`;
        continue;
      }
      try {
        await directory.getFileHandle(name, { create: false });
        name = `${base} (${suffix++})${extension}`;
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") occupied = false;
        else throw error;
      }
    }
    usedNames.add(name.toLocaleLowerCase());
    result.set(file.id, {
      createWritable: async () => (await directory.getFileHandle(name, { create: true })).createWritable(),
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

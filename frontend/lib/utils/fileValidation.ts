import {
  MAX_FILE_SIZE_MB_MULTIPLE_SEND,
  MAX_FILE_SIZE_SINGLE_SEND,
  MAX_FILES_TO_SEND_TOGETHER,
} from "@/lib/constants";

const MB = 1024 * 1024;

export function validateFileBatch(files: Pick<File, "size">[]): string | null {
  if (!files.length) return "Select at least one file.";
  if (files.length > MAX_FILES_TO_SEND_TOGETHER) return `Share up to ${MAX_FILES_TO_SEND_TOGETHER} files per transfer.`;
  if (files.length === 1) {
    return files[0].size > MAX_FILE_SIZE_SINGLE_SEND * MB ? `A single file can be up to ${MAX_FILE_SIZE_SINGLE_SEND} MB.` : null;
  }
  const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE_MB_MULTIPLE_SEND * MB);
  if (tooLarge) return `When sharing multiple files, each file must be ${MAX_FILE_SIZE_MB_MULTIPLE_SEND} MB or smaller.`;
  return null;
}

export function validateIncomingFile(size: unknown): size is number {
  return typeof size === "number" && Number.isSafeInteger(size) && size >= 0 && size <= MAX_FILE_SIZE_SINGLE_SEND * MB;
}


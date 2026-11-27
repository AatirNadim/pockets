import { useRef } from "react";
import { toast } from "sonner";

import { useFileStore, type QueuedFile } from "../stores/fileStore";
import { useUserStore } from "../stores/userStore";
import { FileTransferSession } from "../utils/fileManagement/fileTransferSession";
import type {
  IncomingTransferState,
  ChannelSetupPayload,
  FileMetadataPayload,
} from "@pockets/shared";
import { uploadSessionRegistry } from "../utils/fileManagement/uploadSessionRegistry";
import { MAX_FILES_TO_SEND_TOGETHER } from "../constants";
import { validateFileBatch } from "../utils/fileValidation";
import { clearDownloadDestination, describeSaveError, takeDownloadDestination } from "../utils/fileSaving";
import { CHUNK_SIZE, MAX_CHANNELS_FOR_DATA_TRANSMISSION, MAX_FILE_SIZE_MB_MULTIPLE_SEND, MAX_FILE_SIZE_SINGLE_SEND } from "../constants";

/** Timeout for stale transfers that never receive a complete signal */
const STALE_TRANSFER_TIMEOUT_MS = 60000; // 60 seconds
const MAX_INCOMING_TRANSFER_CHANNELS = MAX_CHANNELS_FOR_DATA_TRANSMISSION * 2;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const useFile = ({
  peerConnections,
  isRequestActive,
}: {
  peerConnections: React.RefObject<Record<string, RTCPeerConnection | null>>;
  isRequestActive?: (requestId: string) => boolean;
  dataChannelMap: React.RefObject<Record<string, RTCDataChannel | null>>;
}) => {
  const {
    filesToBeSent,
    clearFilesToBeSent,
    getLocalFileEntry,
    beginDownload,
    updateDownloadProgress,
    clearDownloadProgress,
    startUploadSession,
    updateUploadSession,
    endUploadSession,
  } = useFileStore();
  const ownerId = useUserStore((state) => state.userId);

  const incomingTransfersRef = useRef<Record<string, IncomingTransferState>>(
    {}
  );

  const activeCancelHandlers = useRef(new Map<string, () => void>());
  const cancelIncomingFile = (requestId: string) => activeCancelHandlers.current.get(requestId)?.();

  const cancelIncomingTransfers = (remoteUserId?: string) => {
    for (const [channelLabel, transfer] of Object.entries(incomingTransfersRef.current)) {
      if (remoteUserId && transfer.remoteUserId !== remoteUserId) continue;
      if (transfer.timeoutId) clearTimeout(transfer.timeoutId as ReturnType<typeof setTimeout>);
      if (transfer.currentFile) {
        const fileId = transfer.currentFile.metadata.fileId;
        const writer = transfer.currentFile.writable as { abort?: (reason?: unknown) => Promise<void> } | undefined;
        void writer?.abort?.(new Error("Transfer cancelled")).catch(() => undefined);
        clearDownloadProgress([fileId]);
        clearDownloadDestination(fileId);
      }
      if (transfer.requestId) activeCancelHandlers.current.delete(transfer.requestId);
      delete incomingTransfersRef.current[channelLabel];
    }
  };

  /**
   * Initiates the file sending process to all connected peers.
   * Creates a separate FileTransferSession for each peer.
   * @returns Promise that resolves when all files have been sent to all peers
   */
  const sendFile = async () => {
    console.log("Sending files:", filesToBeSent);

    if (filesToBeSent.length === 0) {
      toast.error("No files selected to send");
      return;
    }

    if (!ownerId) {
      toast.error("Cannot send files", {
        description: "User identity missing. Please rejoin the room.",
      });
      return;
    }

    const peers = Object.entries(peerConnections.current);
    if (peers.length === 0) {
      toast.error("No peers connected");
      return;
    }

    // Create a session for each peer
    const sessionPromises = peers.map(([remoteUserId, pc]) => {
      if (!pc) return Promise.resolve();

      return createAndStartSession(pc, remoteUserId, filesToBeSent, ownerId);
    });

    try {
      const results = await Promise.allSettled(sessionPromises);
      const rejected = results.filter((res) => res.status === "rejected");

      if (rejected.length > 0) {
        console.error("Some peers failed to receive files:", rejected);
        toast.error("Failed to send files to some peers");
      } else {
        toast.success("All files sent successfully");
      }
    } catch (error) {
      console.error("Error sending files:", error);
      toast.error("Failed to send some files");
    } finally {
      clearFilesToBeSent();
    }
  };

  /**
   * Sends specific files to a specific user (for file download requests).
   * Creates an isolated FileTransferSession for this transfer.
   */
  const sendFilesToUser = async (remoteUserId: string, fileIds: string[], requestId?: string) => {
    if (!ownerId) {
      toast.error("Cannot send files", {
        description: "User identity missing. Please rejoin the room.",
      });
      return false;
    }

    const pc = peerConnections.current[remoteUserId];
    if (!pc) {
      toast.error("Peer unavailable", {
        description: "Unable to locate the requested peer connection.",
      });
      return false;
    }

    const fileEntries: QueuedFile[] = [];
    fileIds.forEach((fileId) => {
      const entry = getLocalFileEntry(fileId);
      if (entry) {
        fileEntries.push(entry);
      }
    });

    if (!fileEntries.length) {
      console.error("Requested files not found locally:", fileIds);
      toast.error("File not found", {
        description: "Requested file is no longer available locally.",
      });
      return false;
    }

    const MB = 1024 * 1024;
    const batches: QueuedFile[][] = [];
    let batch: QueuedFile[] = [];
    for (const entry of fileEntries) {
      if (entry.file.size > MAX_FILE_SIZE_MB_MULTIPLE_SEND * MB) {
        if (batch.length) batches.push(batch);
        batch = [];
        batches.push([entry]);
      } else {
        batch.push(entry);
        if (batch.length === MAX_FILES_TO_SEND_TOGETHER) {
          batches.push(batch);
          batch = [];
        }
      }
    }
    if (batch.length) batches.push(batch);

    console.log("initiating targeted file send to", remoteUserId, fileEntries);

    try {
      for (const currentBatch of batches) {
        const validationError = validateFileBatch(currentBatch.map((entry) => entry.file));
        if (validationError) throw new Error(validationError);
        await createAndStartSession(pc, remoteUserId, currentBatch, ownerId, requestId);
      }
      if (peerConnections.current[remoteUserId] === pc) toast.success("File transfer complete");
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false;
      console.error("Targeted file send failed", error);
      if (peerConnections.current[remoteUserId] === pc) {
        toast.error("File transfer failed", { description: "Could not send all requested files." });
      }
      return false;
    }
  };

  /**
   * Creates and starts an isolated FileTransferSession for a peer.
   * Handles session lifecycle and store updates.
   */
  const createAndStartSession = async (
    pc: RTCPeerConnection,
    remoteUserId: string,
    files: QueuedFile[],
    ownerIdValue: string,
    requestId?: string
  ): Promise<void> => {
    const validationError = validateFileBatch(files.map((entry) => entry.file));
    if (validationError) throw new Error(validationError);
    console.log("starting file transfer session to", remoteUserId, files);
    const totalSize = files.reduce((acc, entry) => acc + entry.file.size, 0);
    const fileNames = files.map((f) => f.file.name);

    // creating a new file transfer session specific to the peer and the file-set requested
    const session = new FileTransferSession(
      pc,
      remoteUserId,
      files,
      ownerIdValue,
      {
        onProgress: (progress) => {
          updateUploadSession(session.sessionId, {
            sentBytes: progress.sentBytes,
            percentage: progress.percentage,
          });
        },
        onStatusChange: (status) => {
          console.log(
            `[Session ${session.sessionId}] Status changed to: ${status}`
          );
          if (status === "cancelled") {
            endUploadSession(session.sessionId);
            uploadSessionRegistry.remove(session.sessionId);
          }
        },
        onComplete: () => {
          console.log(`[Session ${session.sessionId}] Transfer completed`);
          endUploadSession(session.sessionId);
          uploadSessionRegistry.remove(session.sessionId);
        },
        onError: (error) => {
          console.error(
            `[Session ${session.sessionId}] Transfer error:`,
            error
          );
          endUploadSession(session.sessionId);
          uploadSessionRegistry.remove(session.sessionId);
        },
      },
      requestId
    );

    // Register session in store and registry
    startUploadSession({
      sessionId: session.sessionId,
      remoteUserId,
      fileNames,
      sentBytes: 0,
      totalBytes: totalSize,
      percentage: 0,
      startedAt: Date.now(),
    });
    uploadSessionRegistry.add(session);

    // Start the session (blocks until complete or error)
    console.log("Starting file transfer session:", session.sessionId);
    try {
      await session.start();
    } catch (error) {
      if (session.status === "cancelled") throw new DOMException("Transfer cancelled", "AbortError");
      throw error;
    }
  };

  const registerIncomingTransferChannel = (
    channel: RTCDataChannel,
    remoteUserId?: string
  ) => {
    if (Object.keys(incomingTransfersRef.current).length >= MAX_INCOMING_TRANSFER_CHANNELS || !/^transfer-[0-9a-f-]+-queue-[0-4]$/i.test(channel.label)) {
      channel.close();
      toast.error("Too many file transfers", { description: "Wait for an active transfer to finish, then try again." });
      return;
    }
    channel.binaryType = "arraybuffer";
    // Initialize transfer state for this channel (may receive multiple files)
    incomingTransfersRef.current[channel.label] = {
      currentFile: undefined,
      completedFiles: [],
      totalReceivedBytes: 0,
      declaredBytes: 0,
      receivedFileIds: [],
      receivedFileCount: 0,
      expectedTotalBytes: undefined,
      expectedFileCount: undefined,
      remoteUserId,
      setupReceived: false,
      timeoutId: undefined,
    };

    // Set up a stale transfer timeout - if we don't receive a complete signal
    // within STALE_TRANSFER_TIMEOUT_MS, we'll check if the transfer is complete
    let cancelled = false;
    const refreshStaleTimeout = () => {
      const current = incomingTransfersRef.current[channel.label];
      if (!current) return;
      if (current.timeoutId) clearTimeout(current.timeoutId as number);
      const timeoutId = setTimeout(async () => {
        await receiveQueue;
        const transfer = incomingTransfersRef.current[channel.label];
        if (!transfer || transfer.timeoutId !== timeoutId) return;

        console.warn(`[${channel.label}] Stale transfer timeout reached, forcing finalization`);
        if (transfer.currentFile) await finalizeCurrentFile(channel.label);
        finalizeAllCompletedFiles(channel.label);
        channel.close();
      }, STALE_TRANSFER_TIMEOUT_MS);
      current.timeoutId = timeoutId;
    };
    refreshStaleTimeout();

    const rejectTransfer = (message: string) => {
      const current = incomingTransfersRef.current[channel.label];
      if (!current) return;
      if (current?.timeoutId) clearTimeout(current.timeoutId as number);
      if (current?.currentFile) {
        const writer = current.currentFile.writable as { abort?: (reason?: unknown) => Promise<void> } | undefined;
        void writer?.abort?.(new Error(message)).catch(() => undefined);
        clearDownloadProgress([current.currentFile.metadata.fileId]);
        clearDownloadDestination(current.currentFile.metadata.fileId);
      }
      if (current) {
        current.currentFile = undefined;
        current.failed = true;
      }
      toast.error("File transfer rejected", { description: message });
      channel.close();
    };

    let receiveQueue = Promise.resolve();
    const receiveMessage = async (event: MessageEvent) => {
      const transfer = incomingTransfersRef.current[channel.label];
      if (!transfer || cancelled) return;

      // Handle JSON envelopes (metadata or complete signal)
      if (typeof event.data === "string") {
        try {
          const envelope: unknown = JSON.parse(event.data);
          if (!isRecord(envelope) || !isRecord(envelope.payload) || typeof envelope.kind !== "string") {
            rejectTransfer("The sender sent malformed transfer metadata.");
            return;
          }

          if (envelope.kind === "channel-setup") {
            const payload = envelope.payload as Partial<ChannelSetupPayload>;
            const match = /^transfer-([0-9a-f-]+)-queue-([0-4])$/i.exec(channel.label);
            const maxBytes = MAX_FILE_SIZE_SINGLE_SEND * 1024 * 1024;
            if (transfer.setupReceived || payload.protocolVersion !== 1 || !remoteUserId || !match || payload.sessionId !== match[1] || payload.channelLabel !== channel.label || !Number.isInteger(payload.fileCount) || Number(payload.fileCount) < 1 || Number(payload.fileCount) > 5 || !Number.isSafeInteger(payload.totalBytes) || Number(payload.totalBytes) < 0 || Number(payload.totalBytes) > maxBytes) {
              rejectTransfer("The transfer setup did not match this connection or exceeded its limits.");
              return;
            }
            if (Number(payload.fileCount) > 1 && Number(payload.totalBytes) > MAX_FILE_SIZE_MB_MULTIPLE_SEND * 1024 * 1024 * 5) {
              rejectTransfer("The combined transfer is larger than the supported limit.");
              return;
            }

            if (payload.requestId && isRequestActive && !isRequestActive(payload.requestId)) {
              channel.close();
              return;
            }
            transfer.requestId = payload.requestId;
            if (payload.requestId) {
              const requestId = payload.requestId;
              activeCancelHandlers.current.set(requestId, () => {
                cancelled = true;
                void receiveQueue.then(async () => {
                  const current = incomingTransfersRef.current[channel.label];
                  if (!current) return;
                  if (current.timeoutId) clearTimeout(current.timeoutId as number);
                  const file = current.currentFile;
                  if (file?.writable) {
                    try { await (file.writable as { close: () => Promise<void> }).close(); }
                    catch (error) { toast.error("Could not keep partial file", { description: describeSaveError(error) }); }
                  }
                  delete incomingTransfersRef.current[channel.label];
                  activeCancelHandlers.current.delete(requestId);
                  channel.close();
                });
              });
            }
            transfer.setupReceived = true;
            transfer.expectedTotalBytes = payload.totalBytes;
            transfer.expectedFileCount = payload.fileCount;

            refreshStaleTimeout();
            return;
          }

          if (envelope.kind === "chunk-ack") return;

          if (envelope.kind === "file-metadata") {
            const metadata = envelope.payload;
            const maxBytes = MAX_FILE_SIZE_SINGLE_SEND * 1024 * 1024;
            if (!transfer.setupReceived || transfer.currentFile || !remoteUserId || typeof metadata.fileId !== "string" || !UUID_PATTERN.test(metadata.fileId) || metadata.ownerId !== remoteUserId || typeof metadata.name !== "string" || !metadata.name.trim() || metadata.name.length > 255 || typeof metadata.type !== "string" || metadata.type.length > 255 || typeof metadata.size !== "number" || !Number.isSafeInteger(metadata.size) || metadata.size < 0 || metadata.size > maxBytes || transfer.receivedFileIds.includes(metadata.fileId) || transfer.receivedFileCount >= (transfer.expectedFileCount ?? 0)) {
              rejectTransfer("The file details were invalid or did not match the connected sender.");
              return;
            }
            if ((transfer.expectedFileCount ?? 0) > 1 && metadata.size > MAX_FILE_SIZE_MB_MULTIPLE_SEND * 1024 * 1024) {
              rejectTransfer("A file in a multi-file transfer exceeded the per-file limit.");
              return;
            }
            if (transfer.declaredBytes + metadata.size > (transfer.expectedTotalBytes ?? -1)) {
              rejectTransfer("The declared file sizes exceeded the transfer total.");
              return;
            }
            transfer.declaredBytes += metadata.size;
            transfer.receivedFileIds.push(metadata.fileId);
            transfer.currentFile = {
              metadata: metadata as unknown as FileMetadataPayload,
              receivedBytes: 0,
            };
            const destination = takeDownloadDestination(metadata.fileId);
            if (destination) {
              try {
                transfer.currentFile.writable = await destination.createWritable();
              } catch (error) {
                transfer.currentFile.writeFailed = true;
                transfer.failed = true;
                clearDownloadProgress([metadata.fileId]);
                toast.error(`Could not open ${metadata.name} for writing: ${describeSaveError(error)}`);
              }
            } else {
              transfer.currentFile.writeFailed = true;
              transfer.failed = true;
              toast.error(`Could not save ${metadata.name}`, {
                description: "Choose a download location before requesting this file.",
              });
            }
            beginDownload(metadata.fileId, metadata.size);
            refreshStaleTimeout();
            if (metadata.size === 0) {
              await finalizeCurrentFile(channel.label);
              if (transfer.receivedFileCount === transfer.expectedFileCount && transfer.totalReceivedBytes === transfer.expectedTotalBytes) {
                if (transfer.timeoutId) clearTimeout(transfer.timeoutId as number);
                channel.close();
              }
            }
            return;
          }

          rejectTransfer("The sender used an unknown transfer message.");
          return;
        } catch (error) {
          console.error("Failed to parse transfer envelope", error);
          rejectTransfer("The transfer data could not be parsed.");
        }
        return;
      }

      // Handle binary chunks
      if (!transfer.currentFile || !transfer.setupReceived || !(event.data instanceof ArrayBuffer)) {
        rejectTransfer("A file chunk arrived before valid file metadata.");
        return;
      }

      if (event.data.byteLength < 9) {
        rejectTransfer("A file chunk was shorter than the transfer header.");
        return;
      }
      const header = new DataView(event.data);
      const offset = header.getUint32(0, true);
      const payloadBytes = header.getUint32(4, true);
      const chunkBytes = event.data.byteLength - 8;
      if (payloadBytes !== chunkBytes || chunkBytes > CHUNK_SIZE || offset !== transfer.currentFile.receivedBytes || transfer.currentFile.receivedBytes + chunkBytes > transfer.currentFile.metadata.size || transfer.totalReceivedBytes + chunkBytes > (transfer.expectedTotalBytes ?? -1)) {
        rejectTransfer("A file chunk was duplicated, out of order, or exceeded the declared file size.");
        return;
      }
      refreshStaleTimeout();
      const chunkBuffer = event.data.slice(8);
      const writer = transfer.currentFile.writable as { write: (data: Blob) => Promise<void> } | undefined;
      if (writer && !transfer.currentFile.writeFailed) {
        try {
          await writer.write(new Blob([chunkBuffer]));
          refreshStaleTimeout();
        } catch (error) {
          transfer.currentFile.writeFailed = true;
          transfer.failed = true;
          void (writer as { abort?: (reason?: unknown) => Promise<void> }).abort?.(error).catch(() => undefined);
          clearDownloadDestination(transfer.currentFile.metadata.fileId);
          clearDownloadProgress([transfer.currentFile.metadata.fileId]);
          toast.error(`Could not save ${transfer.currentFile.metadata.name}`, {
            description: describeSaveError(error),
          });
        }
      }
      if (cancelled) return;
      transfer.currentFile.receivedBytes += chunkBuffer.byteLength;
      transfer.totalReceivedBytes += chunkBuffer.byteLength;
      channel.send(JSON.stringify({ kind: "chunk-ack", payload: { offset: transfer.currentFile.receivedBytes } }));

      updateDownloadProgress(
        transfer.currentFile.metadata.fileId,
        transfer.currentFile.receivedBytes
      );

      if (transfer.currentFile.receivedBytes >= transfer.currentFile.metadata.size) {
        console.log(`[${channel.label}] File ${transfer.currentFile.metadata.name} complete`);
        await finalizeCurrentFile(channel.label);
        if (
          transfer.expectedTotalBytes !== undefined &&
          transfer.totalReceivedBytes === transfer.expectedTotalBytes &&
          transfer.receivedFileCount === transfer.expectedFileCount
        ) {
          console.log(`[${channel.label}] All bytes received (${transfer.totalReceivedBytes}/${transfer.expectedTotalBytes}), closing channel`);
          if (transfer.timeoutId) clearTimeout(transfer.timeoutId as number);
          finalizeAllCompletedFiles(channel.label);
          channel.close();
        }
        if (transfer.receivedFileCount >= (transfer.expectedFileCount ?? 0) && (transfer.totalReceivedBytes !== transfer.expectedTotalBytes || transfer.declaredBytes !== transfer.expectedTotalBytes)) {
          rejectTransfer("Received bytes did not match the declared transfer total.");
        }
      }
    };
    channel.onmessage = (event) => {
      receiveQueue = receiveQueue.then(() => receiveMessage(event)).catch((error) => {
        console.error(`[${channel.label}] Receive processing failed`, error);
        rejectTransfer("The file could not be written to storage.");
      });
    };

    channel.onclose = () => {
      const transfer = incomingTransfersRef.current[channel.label];
      if (!transfer) return;

      const finishClose = async () => {
        await receiveQueue;
        const current = incomingTransfersRef.current[channel.label];
        if (!current) return;
        if (current.timeoutId) clearTimeout(current.timeoutId as number);
        console.log(`[${channel.label}] Channel closed`);
        if (current.currentFile) {
          if (current.currentFile.receivedBytes >= current.currentFile.metadata.size) {
            await finalizeCurrentFile(channel.label);
          } else {
            const writer = current.currentFile.writable as { abort?: (reason?: unknown) => Promise<void> } | undefined;
            void writer?.abort?.(new Error("Transfer interrupted")).catch(() => undefined);
            clearDownloadProgress([current.currentFile.metadata.fileId]);
            clearDownloadDestination(current.currentFile.metadata.fileId);
            if (!current.failed) toast.error("Download interrupted", { description: "The transfer ended before the entire file arrived." });
            current.failed = true;
            current.currentFile = undefined;
          }
        }
        finalizeAllCompletedFiles(channel.label);
        if (!current.failed && current.expectedFileCount !== undefined && (current.receivedFileCount !== current.expectedFileCount || current.totalReceivedBytes !== current.expectedTotalBytes || current.declaredBytes !== current.expectedTotalBytes)) {
          toast.error("Download interrupted", { description: "The transfer ended before all files arrived." });
        }
        if (current.requestId) activeCancelHandlers.current.delete(current.requestId);
        delete incomingTransfersRef.current[channel.label];
      };
      void finishClose().catch((error) => console.error(`[${channel.label}] Close cleanup failed`, error));
    };
  };

  /**
   * Finalizes the current file being received and moves it to completedFiles.
   */
  const finalizeCurrentFile = async (channelLabel: string): Promise<void> => {
    const transfer = incomingTransfersRef.current[channelLabel];
    if (!transfer?.currentFile) return;

    const currentFile = transfer.currentFile;
    const { metadata, receivedBytes, writable } = currentFile;

    if (currentFile.writeFailed) {
      currentFile.writable = undefined;
      transfer.receivedFileCount += 1;
      transfer.currentFile = undefined;
      return;
    }

    if (receivedBytes < metadata.size) {
      console.warn(`[${channelLabel}] Finalizing incomplete file: ${metadata.name} (${receivedBytes}/${metadata.size})`);
      clearDownloadProgress([metadata.fileId]);
      clearDownloadDestination(metadata.fileId);
      const writer = writable as { abort?: (reason?: unknown) => Promise<void> } | undefined;
      void writer?.abort?.(new Error("Incomplete file")).catch(() => undefined);
      transfer.failed = true;
      toast.error("Download incomplete", { description: `${metadata.name} was only partially received.` });
      transfer.currentFile = undefined;
      return;
    }

    try {
      const writer = writable as { close: () => Promise<void> } | undefined;
      if (!writer) throw new Error("No download destination was selected.");
      await writer.close();
      clearDownloadProgress([metadata.fileId]);
      toast.success(`Saved ${metadata.name}`);
      transfer.completedFiles.push(currentFile);
    } catch (error) {
      console.error(`[${channelLabel}] Failed to finalize ${metadata.name}`, error);
      clearDownloadProgress([metadata.fileId]);
      clearDownloadDestination(metadata.fileId);
      transfer.failed = true;
      toast.error(`Could not save ${metadata.name}`, { description: describeSaveError(error) });
    } finally {
      currentFile.writable = undefined;
      transfer.receivedFileCount += 1;
      transfer.currentFile = undefined;
    }
  };

  /**
   * Cleans up state for all completed files on a channel.
   */
  const finalizeAllCompletedFiles = (channelLabel: string) => {
    const transfer = incomingTransfersRef.current[channelLabel];
    if (!transfer) return;

    transfer.completedFiles = [];
  };

  return {
    sendFile,
    sendFilesToUser,
    registerIncomingTransferChannel,
    cancelIncomingTransfers,
    cancelIncomingFile,
  };
};

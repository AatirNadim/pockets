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
import { CHUNK_SIZE, MAX_CHANNELS_FOR_DATA_TRANSMISSION, MAX_FILE_SIZE_MB_MULTIPLE_SEND, MAX_FILE_SIZE_SINGLE_SEND } from "../constants";

/** Timeout for stale transfers that never receive a complete signal */
const STALE_TRANSFER_TIMEOUT_MS = 60000; // 60 seconds
const MAX_INCOMING_TRANSFER_CHANNELS = MAX_CHANNELS_FOR_DATA_TRANSMISSION * 2;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const useFile = ({
  peerConnections,
}: {
  peerConnections: React.RefObject<Record<string, RTCPeerConnection | null>>;
  dataChannelMap: React.RefObject<Record<string, RTCDataChannel | null>>;
}) => {
  const {
    filesToBeSent,
    clearFilesToBeSent,
    registerReceivedFile,
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
  const sendFilesToUser = async (remoteUserId: string, fileIds: string[]) => {
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
        await createAndStartSession(pc, remoteUserId, currentBatch, ownerId);
      }
      toast.success("File transfer started", {
        description: "Sending requested file to peer.",
      });
      return true;
    } catch (error) {
      console.error("Targeted file send failed", error);
      toast.error("File transfer failed", {
        description: "Could not send the requested file.",
      });
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
    ownerIdValue: string
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
      }
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
    await session.start();
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
    const staleTimeoutId = setTimeout(() => {
      const transfer = incomingTransfersRef.current[channel.label];
      if (!transfer) return;

      console.warn(
        `[${channel.label}] Stale transfer timeout reached, forcing finalization`
      );

      // Finalize any current file in progress
      if (transfer.currentFile) {
        finalizeCurrentFile(channel.label);
      }

      // Finalize all completed files
      finalizeAllCompletedFiles(channel.label);
      channel.close();
    }, STALE_TRANSFER_TIMEOUT_MS);

    incomingTransfersRef.current[channel.label].timeoutId = staleTimeoutId;

    const rejectTransfer = (message: string) => {
      const current = incomingTransfersRef.current[channel.label];
      if (current?.timeoutId) clearTimeout(current.timeoutId as number);
      if (current?.currentFile) clearDownloadProgress([current.currentFile.metadata.fileId]);
      if (current) {
        current.currentFile = undefined;
        current.failed = true;
      }
      toast.error("File transfer rejected", { description: message });
      channel.close();
    };

    channel.onmessage = async (event) => {
      const transfer = incomingTransfersRef.current[channel.label];
      if (!transfer) return;

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

            transfer.setupReceived = true;
            transfer.expectedTotalBytes = payload.totalBytes;
            transfer.expectedFileCount = payload.fileCount;

            // Clear stale timeout and set a new one based on expected transfer
            if (transfer.timeoutId) {
              clearTimeout(transfer.timeoutId as number);
            }
            transfer.timeoutId = setTimeout(() => {
              const currentTransfer =
                incomingTransfersRef.current[channel.label];
              if (!currentTransfer) return;

              console.warn(
                `[${channel.label}] Transfer timeout, forcing finalization`
              );

              if (currentTransfer.currentFile) {
                finalizeCurrentFile(channel.label);
              }
              finalizeAllCompletedFiles(channel.label);
              channel.close();
            }, STALE_TRANSFER_TIMEOUT_MS);
            return;
          }

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
              chunks: [],
              receivedBytes: 0,
            };
            beginDownload(metadata.fileId, metadata.size);
            if (metadata.size === 0) {
              finalizeCurrentFile(channel.label);
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
      const chunkBuffer = event.data.slice(8);
      transfer.currentFile.chunks.push(chunkBuffer);
      transfer.currentFile.receivedBytes += chunkBuffer.byteLength;
      transfer.totalReceivedBytes += chunkBuffer.byteLength;

      // Update download progress for current file
      updateDownloadProgress(
        transfer.currentFile.metadata.fileId,
        transfer.currentFile.receivedBytes
      );

      // Check if current file is complete
      if (
        transfer.currentFile.receivedBytes >= transfer.currentFile.metadata.size
      ) {
        console.log(
          `[${channel.label}] File ${transfer.currentFile.metadata.name} complete`
        );

        // Finalize the completed file
        finalizeCurrentFile(channel.label);

        // Check if all expected bytes have been received (transfer complete)
        if (
        transfer.expectedTotalBytes !== undefined &&
          transfer.totalReceivedBytes === transfer.expectedTotalBytes &&
          transfer.receivedFileCount === transfer.expectedFileCount
        ) {
          console.log(
            `[${channel.label}] All bytes received (${transfer.totalReceivedBytes}/${transfer.expectedTotalBytes}), closing channel`
          );
          if (transfer.timeoutId) {
            clearTimeout(transfer.timeoutId as number);
          }
          finalizeAllCompletedFiles(channel.label);
          channel.close();
        }
        if (transfer.receivedFileCount >= (transfer.expectedFileCount ?? 0) && (transfer.totalReceivedBytes !== transfer.expectedTotalBytes || transfer.declaredBytes !== transfer.expectedTotalBytes)) {
          rejectTransfer("Received bytes did not match the declared transfer total.");
        }
        // Otherwise, wait for next file metadata
      }
    };

    channel.onclose = () => {
      const transfer = incomingTransfersRef.current[channel.label];
      if (!transfer) return;

      // Clear any pending timeouts
      if (transfer.timeoutId) {
        clearTimeout(transfer.timeoutId as number);
      }

      console.log(`[${channel.label}] Channel closed`);

      // Finalize any remaining files
      if (transfer.currentFile) {
        // Check if current file is complete
        if (
          transfer.currentFile.receivedBytes >=
          transfer.currentFile.metadata.size
        ) {
          finalizeCurrentFile(channel.label);
        } else {
          // Incomplete file
          clearDownloadProgress([transfer.currentFile.metadata.fileId]);
          transfer.failed = true;
        }
      }

      // Finalize any completed but not yet persisted files
      finalizeAllCompletedFiles(channel.label);

      if (!transfer.failed && transfer.expectedFileCount !== undefined && (transfer.receivedFileCount !== transfer.expectedFileCount || transfer.totalReceivedBytes !== transfer.expectedTotalBytes || transfer.declaredBytes !== transfer.expectedTotalBytes)) {
        toast.error("Download interrupted", { description: "The sender closed before all declared files arrived." });
      }

      delete incomingTransfersRef.current[channel.label];
    };
  };

  /**
   * Finalizes the current file being received and moves it to completedFiles.
   */
  const finalizeCurrentFile = (channelLabel: string) => {
    const transfer = incomingTransfersRef.current[channelLabel];
    if (!transfer?.currentFile) return;

    const { metadata, chunks, receivedBytes } = transfer.currentFile;

    // Check if file is complete
    if (receivedBytes < metadata.size) {
      console.warn(
        `[${channelLabel}] Finalizing incomplete file: ${metadata.name} (${receivedBytes}/${metadata.size})`
      );
      clearDownloadProgress([metadata.fileId]);
      transfer.failed = true;
      toast.error("Download incomplete", {
        description: `${metadata.name} was only partially received.`,
      });
      transfer.currentFile = undefined;
      return;
    }

    try {
      console.log(`[${channelLabel}] Creating blob for file: ${metadata.name}`);
      const blob = new Blob(chunks, {
        type: metadata.type || "application/octet-stream",
      });
      const url =
        typeof window !== "undefined" ? URL.createObjectURL(blob) : null;

      registerReceivedFile({
        id: metadata.fileId,
        ownerId: metadata.ownerId,
        name: metadata.name,
        type: metadata.type,
        size: metadata.size,
        url,
        receivedAt: Date.now(),
      });
      clearDownloadProgress([metadata.fileId]);
      toast.success(`Received ${metadata.name}`);

      // Move to completed files list
      transfer.completedFiles.push(transfer.currentFile);
      transfer.receivedFileCount += 1;
      transfer.currentFile = undefined;
    } catch (error) {
      console.error(`[${channelLabel}] Failed to finalize file`, error);
      clearDownloadProgress([metadata.fileId]);
      toast.error("Download failed", {
        description: `Could not process ${metadata.name}.`,
      });
      transfer.currentFile = undefined;
    }
  };

  /**
   * Cleans up state for all completed files on a channel.
   */
  const finalizeAllCompletedFiles = (channelLabel: string) => {
    const transfer = incomingTransfersRef.current[channelLabel];
    if (!transfer) return;

    // Clear the completed files array (they've already been registered)
    transfer.completedFiles = [];
  };

  return {
    sendFile,
    sendFilesToUser,
    registerIncomingTransferChannel,
  };
};

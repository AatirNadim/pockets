import { useRef } from "react";
import { toast } from "sonner";

import { useFileStore, type QueuedFile } from "../stores/fileStore";
import { useUserStore } from "../stores/userStore";
import { FileTransferSession } from "../utils/fileManagement/fileTransferSession";
import type {
  IncomingTransferState,
  DataChannelEnvelope,
  ChannelSetupPayload,
} from "@pockets/shared";
import { uploadSessionRegistry } from "../utils/fileManagement/uploadSessionRegistry";

/** Timeout for stale transfers that never receive a complete signal */
const STALE_TRANSFER_TIMEOUT_MS = 60000; // 60 seconds

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

    console.log("initiating targeted file send to", remoteUserId, fileEntries);

    try {
      await createAndStartSession(pc, remoteUserId, fileEntries, ownerId);
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
    // Initialize transfer state for this channel (may receive multiple files)
    incomingTransfersRef.current[channel.label] = {
      currentFile: undefined,
      completedFiles: [],
      totalReceivedBytes: 0,
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

    channel.onmessage = async (event) => {
      const transfer = incomingTransfersRef.current[channel.label];
      if (!transfer) return;

      // Handle JSON envelopes (metadata or complete signal)
      if (typeof event.data === "string") {
        try {
          const envelope = JSON.parse(event.data) as DataChannelEnvelope;
          console.log(`[${channel.label}] Received envelope:`, envelope.kind);

          if (envelope.kind === "channel-setup") {
            const payload = envelope.payload as ChannelSetupPayload;
            console.log(
              `[${channel.label}] Received channel-setup: ${payload.fileCount} files, ${payload.totalBytes} bytes`
            );

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
            // If there's a current file in progress, finalize it first
            if (transfer.currentFile) {
              console.log(
                `[${channel.label}] New file metadata received, finalizing previous file`
              );
              finalizeCurrentFile(channel.label);
            }

            // Start tracking the new file
            transfer.currentFile = {
              metadata: envelope.payload,
              chunks: [],
              receivedBytes: 0,
            };
            console.log(
              "received file metadata:",
              envelope.payload,
              "current file set to:",
              transfer.currentFile
            );
            beginDownload(envelope.payload.fileId, envelope.payload.size);
            return;
          }
        } catch (error) {
          console.error("Failed to parse transfer envelope", error);
        }
        return;
      }

      // Handle binary chunks
      if (!transfer.currentFile) {
        console.warn(`[${channel.label}] Received chunk before file metadata`);
        return;
      }

      const chunkBuffer =
        event.data instanceof ArrayBuffer
          ? event.data
          : await event.data.arrayBuffer();

      console.log(
        `[${channel.label}] Received chunk: ${chunkBuffer.byteLength} bytes`
      );
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
          transfer.expectedTotalBytes &&
          transfer.totalReceivedBytes >= transfer.expectedTotalBytes
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
        // Otherwise, wait for next file metadata
      }
    };

    channel.onclose = () => {
      const transfer = incomingTransfersRef.current[channel.label];
      if (!transfer) return;
      channel.close();

      // Otherwise, wait for next file metadata

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
          console.warn(
            `[${channel.label}] Channel closed with incomplete file: ${transfer.currentFile.metadata.name}`
          );
          clearDownloadProgress([transfer.currentFile.metadata.fileId]);
          toast.error("Download interrupted", {
            description: `${transfer.currentFile.metadata.name} did not finish transferring.`,
          });
        }
      }

      // Finalize any completed but not yet persisted files
      finalizeAllCompletedFiles(channel.label);

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

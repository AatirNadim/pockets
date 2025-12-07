import { useRef } from "react";
import { toast } from "sonner";

import { CHUNK_SIZE, MAX_CHANNELS_FOR_DATA_TRANSMISSION } from "../constants";
import { useFileStore, type QueuedFile } from "../stores/fileStore";
import { useUserStore } from "../stores/userStore";
import type {
  DataChannelEnvelope,
  FileMetadataPayload,
  IncomingTransferState,
} from "../types";

export const useFile = ({
  peerConnections,
}: {
  peerConnections: React.RefObject<Record<string, RTCPeerConnection | null>>;
  dataChannelMap: React.RefObject<Record<string, RTCDataChannel | null>>;
}) => {
  const {
    filesToBeSent,
    setTransferProgress,
    setIsSending,
    clearFilesToBeSent,
    setSendingFile,
    registerReceivedFile,
    getLocalFileEntry,
    beginDownload,
    updateDownloadProgress,
    clearDownloadProgress,
  } = useFileStore();
  const ownerId = useUserStore((state) => state.userId);

  // Track total bytes transferred across concurrent uploads
  const globalTransferredRef = useRef(0);
  const incomingTransfersRef = useRef<Record<string, IncomingTransferState>>(
    {}
  );

  /**
   * Initiates the file sending process to all connected peers.
   * @returns Promise that resolves when all files have been sent
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

    setIsSending(true);
    setTransferProgress(0);
    globalTransferredRef.current = 0;

    // Calculate total size of all files * number of peers (since we send to all)
    const totalSizePerPeer = filesToBeSent.reduce(
      (acc, entry) => acc + entry.file.size,
      0
    );
    const totalGlobalSize = totalSizePerPeer * peers.length;

    try {
      // send the files to all peers concurrently
      const peerPromises = peers.map(([remoteUserId, pc]) => {
        if (!pc) return Promise.resolve();
        return sendFilesToPeer(
          remoteUserId,
          pc,
          filesToBeSent,
          totalGlobalSize,
          ownerId
        );
      });

      const results = await Promise.allSettled(peerPromises);

      const rejected = results.filter((res) => res.status === "rejected");
      if (rejected.length > 0) {
        console.error("Some peers failed to receive files:", rejected);
        throw new Error("Failed to send files to some peers");
      }

      toast.success("All files sent successfully");
    } catch (error) {
      console.error("Error sending files:", error);
      toast.error("Failed to send some files");
    } finally {
      setSendingFile(null);
      setIsSending(false);
      clearFilesToBeSent();
      globalTransferredRef.current = 0;
    }
  };

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
      toast.error("File not found", {
        description: "Requested file is no longer available locally.",
      });
      return false;
    }

    setIsSending(true);
    globalTransferredRef.current = 0;

    const totalSize = fileEntries.reduce(
      (acc, entry) => acc + entry.file.size,
      0
    );

    try {
      await sendFilesToPeer(remoteUserId, pc, fileEntries, totalSize, ownerId);
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
    } finally {
      setIsSending(false);
      setSendingFile(null);
      globalTransferredRef.current = 0;
    }
  };

  const sendFilesToPeer = async (
    remoteUserId: string,
    pc: RTCPeerConnection,
    files: QueuedFile[],
    totalGlobalSize: number,
    ownerId: string
  ) => {
    // 1. Determine number of channels and distribute files
    const numChannels = Math.min(
      files.length,
      MAX_CHANNELS_FOR_DATA_TRANSMISSION
    );
    const queues: QueuedFile[][] = Array.from(
      { length: numChannels },
      () => []
    );

    // Round-robin distribution
    files.forEach((file, index) => {
      queues[index % numChannels].push(file);
    });

    // 2. Create channels and start processing queues
    const channelPromises = queues.map((queue, index) => {
      if (queue.length === 0) return Promise.resolve();

      const channelLabel = `transfer-queue-${index}-${Date.now()}`;
      const channel = pc.createDataChannel(channelLabel, { ordered: true });

      return processQueue(
        channel,
        queue,
        remoteUserId,
        totalGlobalSize,
        ownerId
      );
    });

    const result = await Promise.allSettled(channelPromises);

    const rejected = result.filter((res) => res.status === "rejected");
    if (rejected.length > 0) {
      console.error(`Some channels failed for peer ${remoteUserId}:`, rejected);
      throw new Error(
        `Failed to send files to peer ${remoteUserId}: ${rejected}`
      );
    }
  };

  /**
   * Sends all files in the given queue over the specified data channel. Multiple potential executions of this function happen concurrently for different channels.
   * @param channel one of the channels for sending files to a peer
   * @param queue the queue of the files to be sent to the given peer
   * @param remoteUserId the userid to identify the peer
   * @param totalGlobalSize total amount of data to be sent (all the files to all peers)
   * @returns Promise that resolves when all files in the queue have been sent
   */
  const processQueue = (
    channel: RTCDataChannel,
    queue: QueuedFile[],
    remoteUserId: string,
    totalGlobalSize: number,
    ownerId: string
  ): Promise<void> => {
    console.log(
      `Processing file queue on channel ${channel.label} for ${remoteUserId}`,
      {
        queue,
      }
    );
    return new Promise((resolve, reject) => {
      const startQueueProcessing = async () => {
        console.log(`Channel ${channel.label} open for ${remoteUserId}`);

        try {
          // Send files serially in this queue
          for (const entry of queue) {
            setSendingFile(entry.file);
            console.log("Sending file", entry.file.name, "to", remoteUserId);
            await sendFileOverChannel(channel, entry, totalGlobalSize, ownerId);
            console.log(
              `File ${entry.file.name} sent to ${remoteUserId} via ${channel.label}`
            );
          }
          console.log(
            "All files in queue sent via",
            channel.label,
            "to",
            remoteUserId,
            "closing channel"
          );
          channel.close();
          resolve();
        } catch (error) {
          console.error(`Error in channel ${channel.label}:`, error);
          channel.close();
          reject(error);
        }
      };

      if (channel.readyState === "open") {
        startQueueProcessing();
      } else {
        channel.onopen = startQueueProcessing;
      }

      channel.onerror = (err) => {
        console.error(`Channel error ${channel.label}:`, err);
        reject(err);
      };
      channel.onclose = () => {
        console.log(`Channel ${channel.label} closed`);
      };
    });
  };

  /**
   * Sends a single file over the specified data channel in chunks.
   * @param channel the channel used to send the current file
   * @param file the file which is to be sent in chunks
   * @param totalGlobalSize total amount of data to be sent (all the files to all peers)
   * @returns Promise that resolves when the file has been completely sent
   */
  const sendFileOverChannel = async (
    channel: RTCDataChannel,
    fileEntry: QueuedFile,
    totalGlobalSize: number,
    ownerId: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { file, id } = fileEntry;
      // 1. Send metadata (Delimiter)
      const metadata: FileMetadataPayload = {
        fileId: id,
        ownerId,
        name: file.name,
        type: file.type,
        size: file.size,
      };

      const envelope: DataChannelEnvelope = {
        kind: "file-metadata",
        payload: metadata,
      };

      try {
        console.log(
          "sending metadata for file",
          file.name,
          "over channel",
          channel.label
        );
        channel.send(JSON.stringify(envelope));
      } catch (error) {
        return reject(error);
      }

      // 2. Send chunks
      const fileReader = new FileReader();
      let offset = 0;

      fileReader.onerror = (err) => reject(err);

      const readNextSlice = () => {
        if (offset < file.size) {
          const slice = file.slice(offset, offset + CHUNK_SIZE);
          fileReader.readAsArrayBuffer(slice);
        } else {
          resolve();
        }
      };

      fileReader.onload = (e) => {
        if (!e.target?.result) {
          return reject(new Error("FileReader result is null"));
        }

        const chunk = e.target.result as ArrayBuffer;
        const chunkSize = chunk.byteLength;

        try {
          const sendChunk = () => {
            if (channel.readyState !== "open") {
              reject(new Error("Channel closed"));
              return;
            }

            // Basic backpressure handling
            if (channel.bufferedAmount > 10 * 1024 * 1024) {
              // 10MB buffer
              // Wait for buffer to drain
              const onBufferedAmountLow = () => {
                channel.removeEventListener(
                  "bufferedamountlow",
                  onBufferedAmountLow
                );
                sendChunk();
              };
              channel.addEventListener(
                "bufferedamountlow",
                onBufferedAmountLow
              );
              return;
            }

            console.log(
              "sending chunk of size",
              chunkSize,
              "over channel",
              channel.label
            );
            channel.send(chunk);
            offset += chunkSize;
            globalTransferredRef.current += chunkSize;
            setTransferProgress(
              (globalTransferredRef.current / totalGlobalSize) * 100
            );

            readNextSlice();
          };

          sendChunk();
        } catch (error) {
          reject(error);
        }
      };

      readNextSlice();
    });
  };

  const registerIncomingTransferChannel = (
    channel: RTCDataChannel,
    remoteUserId?: string
  ) => {
    incomingTransfersRef.current[channel.label] = {
      chunks: [],
      receivedBytes: 0,
      remoteUserId,
    };

    channel.onmessage = async (event) => {
      const transfer = incomingTransfersRef.current[channel.label];
      if (!transfer) {
        return;
      }

      if (typeof event.data === "string") {
        try {
          const envelope = JSON.parse(event.data) as DataChannelEnvelope;
          console.log(
            "Received metadata envelope on channel",
            channel.label,
            envelope
          );
          if (envelope.kind === "file-metadata") {
            transfer.metadata = envelope.payload;
            beginDownload(envelope.payload.fileId, envelope.payload.size);
          }
        } catch (error) {
          console.error("Failed to parse transfer metadata", error);
        }
        return;
      }

      if (!transfer.metadata) {
        console.warn("Received file chunk before metadata", channel.label);
        return;
      }

      console.log(
        "received chunk on channel",
        channel.label,
        "of size",
        event.data.byteLength ||
          (event.data instanceof ArrayBuffer ? event.data.byteLength : 0)
      );
      const chunkBuffer =
        event.data instanceof ArrayBuffer
          ? event.data
          : await event.data.arrayBuffer();

      transfer.chunks.push(chunkBuffer);
      transfer.receivedBytes += chunkBuffer.byteLength;
      console.log(
        `Progress for file ${transfer.metadata.name} on channel ${channel.label}: ${transfer.receivedBytes}/${transfer.metadata.size}`
      );
      if (transfer.metadata) {
        updateDownloadProgress(
          transfer.metadata.fileId,
          transfer.receivedBytes
        );
      }

      if (transfer.receivedBytes >= transfer.metadata.size) {
        console.log(
          "Completed receiving file on channel",
          channel.label,
          transfer.metadata.name
        );
        finalizeIncomingTransfer(channel.label);
        channel.close();
      }
    };

    channel.onclose = () => {
      finalizeIncomingTransfer(channel.label, { skipPersist: true });
      delete incomingTransfersRef.current[channel.label];
    };
  };

  const finalizeIncomingTransfer = (
    label: string,
    options?: { skipPersist?: boolean }
  ) => {
    const transfer = incomingTransfersRef.current[label];
    if (!transfer || !transfer.metadata) {
      return;
    }

    const { metadata, chunks } = transfer;
    delete incomingTransfersRef.current[label];

    if (options?.skipPersist || !chunks.length) {
      clearDownloadProgress(metadata.fileId);
      toast.error("Download interrupted", {
        description: `${metadata.name} did not finish transferring. Please request it again.`,
      });
      return;
    }

    try {
      console.log("creating a blob with the received chunks for file");
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
      clearDownloadProgress(metadata.fileId);

      toast.success(`Received ${metadata.name}`);
    } catch (error) {
      console.error("Failed to finalize incoming transfer", error);
      clearDownloadProgress(metadata.fileId);
      toast.error("Download failed", {
        description: `Could not process ${metadata.name}.`,
      });
    }
  };

  return {
    sendFile,
    sendFilesToUser,
    registerIncomingTransferChannel,
  };
};

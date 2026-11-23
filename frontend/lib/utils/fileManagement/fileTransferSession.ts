import { v4 as uuidv4 } from "uuid";
import {
  CHUNK_SIZE,
  MAX_CHANNELS_FOR_DATA_TRANSMISSION,
} from "../../constants";
import type { QueuedFile } from "../../stores/fileStore";
import type {
  DataChannelEnvelope,
  FileMetadataPayload,
  ChannelSetupPayload,
  TransferSessionStatus,
} from "@pockets/shared";
import { validateFileBatch } from "../fileValidation";

/** Timeout for sender to close channel if receiver hasn't closed it */
const SENDER_CLEANUP_TIMEOUT_MS = 15000; // 15 seconds

type TransferSessionProgress = {
  sentBytes: number;
  totalBytes: number;
  /** Percentage 0-100 */
  percentage: number;
};

type TransferSessionCallbacks = {
  onProgress?: (progress: TransferSessionProgress) => void;
  onStatusChange?: (status: TransferSessionStatus) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
};

/**
 * Encapsulates a single file transfer session to a specific peer.
 * Each instance is isolated and manages its own:
 * - Progress tracking
 * - Data channels (round-robin distribution)
 * - Lifecycle
 *
 * After completion or failure, the instance can be discarded (GC'd).
 */
export class FileTransferSession {
  public readonly sessionId: string;
  public readonly remoteUserId: string;
  public readonly ownerId: string;

  private _status: TransferSessionStatus = "pending";
  private _sentBytes = 0;
  private _totalBytes = 0;

  private readonly pc: RTCPeerConnection;
  private readonly files: QueuedFile[];
  private readonly callbacks: TransferSessionCallbacks;
  private readonly channels: RTCDataChannel[] = [];
  private readonly readers = new Set<FileReader>();
  private readonly cleanupTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    pc: RTCPeerConnection,
    remoteUserId: string,
    files: QueuedFile[],
    ownerId: string,
    callbacks: TransferSessionCallbacks = {}
  ) {
    this.sessionId = uuidv4();
    this.pc = pc;
    this.remoteUserId = remoteUserId;
    this.files = files;
    this.ownerId = ownerId;
    this.callbacks = callbacks;

    this._totalBytes = files.reduce((acc, entry) => acc + entry.file.size, 0);
  }

  get status(): TransferSessionStatus {
    return this._status;
  }

  get progress(): TransferSessionProgress {
    const percentage =
      this._totalBytes > 0
        ? Math.min(100, (this._sentBytes / this._totalBytes) * 100)
        : 0;
    return {
      sentBytes: this._sentBytes,
      totalBytes: this._totalBytes,
      percentage,
    };
  }

  /**
   * Starts the file transfer session.
   * Creates dedicated data channels and sends files using round-robin distribution.
   */
  async start(): Promise<void> {
    if (this._status !== "pending") {
      throw new Error(
        `Cannot start session in status "${this._status}". Expected "pending".`
      );
    }

    const validationError = validateFileBatch(this.files.map((entry) => entry.file));
    if (validationError) throw new Error(validationError);

    this.setStatus("sending");

    try {
      await this.sendFilesToPeer();
      this.setStatus("completed");
      this.callbacks.onComplete?.();
    } catch (error) {
      if (!this.isCancelled()) {
        this.setStatus("failed");
        this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    } finally {
      this.cleanup();
    }
  }

  /**
   * Cancels the ongoing transfer (if in progress).
   */
  cancel(): void {
    if (this._status === "sending") {
      this.setStatus("cancelled");
      this.readers.forEach((reader) => { if (reader.readyState === FileReader.LOADING) reader.abort(); });
      this.cleanup();
    }
  }

  private setStatus(status: TransferSessionStatus): void {
    this._status = status;
    this.callbacks.onStatusChange?.(status);
  }

  private isCancelled(): boolean {
    return this._status === "cancelled";
  }

  private addSentBytes(bytes: number): void {
    this._sentBytes += bytes;
    this.callbacks.onProgress?.(this.progress);
  }

  private cleanup(): void {
    this.cleanupTimers.forEach(clearTimeout);
    this.cleanupTimers.clear();
    this.readers.forEach((reader) => { if (reader.readyState === FileReader.LOADING) reader.abort(); });
    this.readers.clear();
    // Close all channels created by this session
    this.channels.forEach((channel) => {
      try {
        if (channel.readyState !== "closed") {
          channel.close();
        }
      } catch {
        // Ignore close errors
      }
    });
    this.channels.length = 0;
  }

  private async sendFilesToPeer(): Promise<void> {
    const numChannels = Math.min(
      this.files.length,
      MAX_CHANNELS_FOR_DATA_TRANSMISSION
    );
    const queues: QueuedFile[][] = Array.from(
      { length: numChannels },
      () => []
    );

    // Round-robin distribution
    console.log(
      `[Session ${this.sessionId}] Distributing ${this.files.length} files across ${numChannels} channels for peer ${this.remoteUserId}`
    );
    this.files.forEach((file, index) => {
      queues[index % numChannels].push(file);
    });

    // Create channels and start processing queues
    const channelPromises = queues.map((queue, index) => {
      if (queue.length === 0) return Promise.resolve();

      const channelLabel = `transfer-${this.sessionId}-queue-${index}`;
      const channel = this.pc.createDataChannel(channelLabel, {
        ordered: true,
      });
      this.channels.push(channel);

      return this.processQueue(channel, queue);
    });

    const results = await Promise.allSettled(channelPromises);

    const rejected = results.filter((res) => res.status === "rejected");
    if (rejected.length > 0) {
      console.error(
        `[Session ${this.sessionId}] Some channels failed:`,
        rejected
      );
      throw new Error(
        `Failed to send files to peer ${this.remoteUserId} in session ${this.sessionId}`
      );
    }
  }

  private processQueue(
    channel: RTCDataChannel,
    queue: QueuedFile[]
  ): Promise<void> {
    console.log(
      `[Session ${this.sessionId}] Processing file queue on channel ${channel.label}`,
      { files: queue.map((f) => f.file.name) }
    );

    return new Promise((resolve, reject) => {
      // Check if session was cancelled
      const checkCancelled = () => {
        if (this._status === "cancelled") {
          reject(new Error("Transfer cancelled"));
          return true;
        }
        return false;
      };

      const startQueueProcessing = async () => {
        if (checkCancelled()) return;

        console.log(
          `[Session ${this.sessionId}] Channel ${channel.label} open`
        );

        try {
          // Calculate total bytes for this queue
          const queueTotalBytes = queue.reduce(
            (sum, f) => sum + f.file.size,
            0
          );

          // Send channel-setup envelope first to inform receiver of expected bytes
          const setupEnvelope: DataChannelEnvelope = {
            kind: "channel-setup",
            payload: {
              protocolVersion: 1,
              sessionId: this.sessionId,
              channelLabel: channel.label,
              fileCount: queue.length,
              totalBytes: queueTotalBytes,
            } as ChannelSetupPayload,
          };
          channel.send(JSON.stringify(setupEnvelope));
          console.log(
            `[Session ${this.sessionId}] Sent channel-setup: ${queue.length} files, ${queueTotalBytes} bytes`
          );

          // Send all files in queue serially
          console.log("sending files in queue:", queue);
          for (const entry of queue) {
            if (checkCancelled()) return;

            console.log(
              `[Session ${this.sessionId}] Sending file ${entry.file.name}`
            );
            await this.sendFileOverChannel(channel, entry);
            console.log(
              `[Session ${this.sessionId}] File ${entry.file.name} sent via ${channel.label}`
            );
          }

          console.log(
            `[Session ${this.sessionId}] All files in queue sent via ${channel.label}`
          );

          // Wait for buffer to drain before setting cleanup timeout
          await this.waitForBufferDrain(channel);

          console.log(
            `[Session ${this.sessionId}] Buffer drained on ${channel.label}, waiting for receiver to close channel`
          );

          // Set sender-side cleanup timeout - close channel if receiver hasn't closed it
          const timeout = setTimeout(() => {
            this.cleanupTimers.delete(timeout);
            if (channel.readyState !== "closed") {
              console.log(
                `[Session ${this.sessionId}] Sender cleanup timeout - closing ${channel.label}`
              );
              channel.close();
            }
          }, SENDER_CLEANUP_TIMEOUT_MS);
          this.cleanupTimers.add(timeout);

          // Resolve immediately - don't wait for channel close
          // The channel will be cleaned up by timeout or receiver close
          resolve();
        } catch (error) {
          console.error(
            `[Session ${this.sessionId}] Error in channel ${channel.label}:`,
            error
          );
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
        console.error(
          `[Session ${this.sessionId}] Channel error ${channel.label}:`,
          err
        );
        reject(err);
      };

      channel.onclose = () => {
        console.log(
          `[Session ${this.sessionId}] Channel ${channel.label} closed`
        );
      };
    });
  }

  /**
   * Waits for the channel's buffered amount to drain to 0.
   * This helps ensure data is sent before we consider the transfer complete.
   */
  private waitForBufferDrain(
    channel: RTCDataChannel,
    timeoutMs: number = 30000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        if (this._status === "cancelled") {
          reject(new Error("Transfer cancelled"));
          return;
        }

        if (channel.readyState !== "open") {
          // Channel closed, nothing more we can do
          resolve();
          return;
        }

        if (channel.bufferedAmount === 0) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timed out waiting for ${channel.label} to drain`));
          return;
        }

        // Check again after a short delay
        setTimeout(check, 50);
      };

      check();
    });
  }

  private sendFileOverChannel(
    channel: RTCDataChannel,
    fileEntry: QueuedFile
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const { file, id } = fileEntry;

      // Check if session was cancelled
      if (this._status === "cancelled") {
        return reject(new Error("Transfer cancelled"));
      }

      // 1. Send metadata (delimiter)
      const metadata: FileMetadataPayload = {
        fileId: id,
        ownerId: this.ownerId,
        name: file.name,
        type: file.type,
        size: file.size,
      };

      // the first message sent over the channel is the file metadata
      const envelope: DataChannelEnvelope = {
        kind: "file-metadata",
        payload: metadata,
      };

      try {
        console.log(
          `[Session ${this.sessionId}] Sending metadata for file ${file.name}`
        );
        channel.send(JSON.stringify(envelope));
      } catch (error) {
        return reject(error);
      }

      // 2. Send chunks
      const fileReader = new FileReader();
      this.readers.add(fileReader);
      let settled = false;
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        this.readers.delete(fileReader);
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      const complete = () => {
        if (settled) return;
        settled = true;
        this.readers.delete(fileReader);
        resolve();
      };
      let offset = 0;

      const readNextSlice = () => {
        if (this._status === "cancelled") {
          return fail(new Error("Transfer cancelled"));
        }

        if (offset < file.size) {
          const slice = file.slice(offset, offset + CHUNK_SIZE);
          fileReader.readAsArrayBuffer(slice);
        } else {
          console.log(
            `[Session ${this.sessionId}] Finished reading file ${file.name}`
          );
          complete();
        }
      };

      // registering file reader event handlers
      fileReader.onerror = (err) => fail(err);
      fileReader.onabort = () => fail(new Error("Transfer cancelled"));

      fileReader.onload = (e) => {
        if (!e.target?.result) {
          return fail(new Error("FileReader result is null"));
        }

        const fileChunk = e.target.result as ArrayBuffer;
        const chunkSize = fileChunk.byteLength;

        const sendChunk = () => {
          if (this._status === "cancelled") {
            fail(new Error("Transfer cancelled"));
            return;
          }

          if (channel.readyState !== "open") {
            fail(new Error("Channel closed"));
            return;
          }

          // Basic backpressure handling (10MB buffer threshold)
          if (channel.bufferedAmount > 10 * 1024 * 1024) {
            const onBufferedAmountLow = () => {
              channel.removeEventListener(
                "bufferedamountlow",
                onBufferedAmountLow
              );
              sendChunk();
            };
            channel.addEventListener("bufferedamountlow", onBufferedAmountLow);
            return;
          }

          try {
            // sending the file associated with this function call, as chunks
            console.log(
              `[Session ${this.sessionId}] Sending chunk of size ${chunkSize} bytes for file ${file.name}`
            );
            const packet = new ArrayBuffer(8 + chunkSize);
            const view = new DataView(packet);
            view.setUint32(0, offset, true);
            view.setUint32(4, chunkSize, true);
            new Uint8Array(packet, 8).set(new Uint8Array(fileChunk));
            const expectedOffset = offset + chunkSize;
            const timeout = setTimeout(() => fail(new Error("Receiver did not confirm the saved chunk")), 30000);
            const onAck = (event: MessageEvent) => {
              if (typeof event.data !== "string") return;
              try {
                const message = JSON.parse(event.data);
                if (message.kind !== "chunk-ack" || message.payload?.offset !== expectedOffset) return;
                clearTimeout(timeout);
                channel.removeEventListener("message", onAck);
                readNextSlice();
              } catch { /* Ignore unrelated control messages. */ }
            };
            channel.addEventListener("message", onAck);
            channel.send(packet);
            offset = expectedOffset;
            this.addSentBytes(chunkSize);
          } catch (error) {
            fail(error);
          }
        };

        sendChunk();
      };

      readNextSlice();
    });
  }
}

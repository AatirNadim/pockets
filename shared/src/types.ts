import { UserType } from "./constants";

export type User = {
  id: string;
  name: string;
  type: UserType;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
};

export type Room = {
  id: string;
  hostId: string;
  guestIds: string[];
  pendingGuestIds: string[];
};
export interface SignalingSessionDescription {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp: string;
}

export interface SignalingIceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

// WebSocket message types
export type WebSocketMessage =
  | JoinRoomMessage
  | LeaveRoomMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | JoinRequestMessage
  | JoinRequestDecisionMessage
  | RoomRosterMessage
  | UserJoinedMessage
  | UserLeftMessage
  | ErrorMessage
  | HostClosedRoomMessage
  | RoomFullMessage
  | AudioMuteMessage
  | AudioUnmuteMessage
  | MediaStateMessage;

export type JoinRoomMessage = {
  type: "join-room";
  roomId: string;
  userId: string;
  userName: string;
  userType: UserType;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
};

export type MediaStateMessage = {
  type: "media-state";
  roomId: string;
  userId: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
};

export type LeaveRoomMessage = {
  type: "leave-room";
  roomId: string;
  userId: string;
};

export type OfferMessage = {
  type: "offer";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserType: UserType;
  offer: SignalingSessionDescription;
};

export type AnswerMessage = {
  type: "answer";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserType: UserType;
  answer: SignalingSessionDescription;
};

export type IceCandidateMessage = {
  type: "ice-candidate";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  candidate: SignalingIceCandidate;
};

export type JoinRequestMessage = {
  type: "join-request";
  roomId: string;
  guest: User;
};

export type JoinRequestDecisionMessage = {
  type: "join-request-accepted" | "join-request-rejected";
  roomId: string;
  hostUserId: string;
  guestUserId: string;
  hostName?: string;
  guestName?: string;
};

export type UserJoinedMessage = {
  type: "user-joined";
  roomId: string;
  userId: string;
  userName: string;
  userType: UserType;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
};

/** Current active peers sent only to a guest after host approval. */
export type RoomRosterMessage = {
  type: "room-roster";
  roomId: string;
  users: User[];
};

export type UserLeftMessage = {
  type: "user-left";
  roomId: string;
  userId: string;
};

export type ErrorMessage = {
  type: "error";
  message: string;
  code?: "participant-unavailable" | "join-request-failed";
  guestUserId?: string;
  requestNoLongerPending?: boolean;
};

export type RoomFullMessage = {
  type: "room-full";
  roomId: string;
};

export type AudioMuteMessage = {
  type: "audio-mute";
  roomId: string;
  userId: string;
};

export type AudioUnmuteMessage = {
  type: "audio-unmute";
  roomId: string;
  userId: string;
};

export type HostClosedRoomMessage = {
  type: "host-closed-room";
  roomId: string;
};

export type FileAttachment = {
  id: string;
  ownerId: string;
  name: string;
  size: number;
  type: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  /** Present for messages sent to selected room participants. */
  recipients?: Array<{ userId: string; userName: string }>;
  attachments?: FileAttachment[];
};

export type FileDownloadRequest = {
  fileIds: string[];
  ownerId: string;
  requesterId: string;
  requestId?: string;
  checkAvailability?: boolean;
};

export type FileDownloadResponse = FileDownloadRequest & {
  status: "accepted(all)" | "accepted(partial)" | "rejected" | "unavailable" | "availability";
  availableFileIds?: string[];
  reason?: string;
};

export type ChatSystemNotice = {
  id: string;
  message: string;
};

export type ChatDataEnvelope =
  | { kind: "chat-message"; payload: ChatMessage }
  | { kind: "file-download-request"; payload: FileDownloadRequest }
  | { kind: "file-download-response"; payload: FileDownloadResponse }
  | { kind: "file-download-cancel"; payload: FileDownloadRequest }
  | { kind: "system"; payload: ChatSystemNotice };

export type FileMetadataPayload = {
  fileId: string;
  ownerId: string;
  name: string;
  type: string;
  size: number;
};

/**
 * Sent at the start of a channel transfer to inform the receiver
 * of the expected total bytes for this channel.
 */
export type ChannelSetupPayload = {
  protocolVersion: 1;
  sessionId: string;
  channelLabel: string;
  requestId?: string;
  fileCount: number;
  totalBytes: number;
};

/**
 * @deprecated Use ChannelSetupPayload instead.
 * Kept for backward compatibility.
 */
export type ChannelTransferCompletePayload = ChannelSetupPayload;

/**
 * Tracks state for a single file being received within a channel.
 */
export type IncomingFileState = {
  metadata: FileMetadataPayload;
  receivedBytes: number;
  /** Kept as unknown here so the shared protocol package stays browser agnostic. */
  writable?: unknown;
  /** The file could not be persisted; continue draining its packets to reach the next file. */
  writeFailed?: boolean;
};

/**
 * Tracks state for an incoming transfer channel (may contain multiple files).
 */
export type IncomingTransferState = {
  /** Current file being received */
  currentFile?: IncomingFileState;
  /** Completed files (finalized but channel still open for more) */
  completedFiles: IncomingFileState[];
  /** Total bytes received across all files on this channel */
  totalReceivedBytes: number;
  /** Sum of the file sizes declared so far in metadata envelopes. */
  declaredBytes: number;
  /** File IDs already seen on this channel, used to reject duplicates. */
  receivedFileIds: string[];
  /** Number of complete files validated on this channel. */
  receivedFileCount: number;
  failed?: boolean;
  /** Expected total bytes for all files (set from channel-setup) */
  expectedTotalBytes?: number;
  /** Expected file count for this channel */
  expectedFileCount?: number;
  requestId?: string;
  remoteUserId?: string;
  /** Whether we received the channel-setup signal */
  setupReceived?: boolean;
  /** Timeout ID for fallback finalization */
  timeoutId?: unknown;
};

export type DataChannelEnvelope =
  | { kind: "file-metadata"; payload: FileMetadataPayload }
  | { kind: "channel-setup"; payload: ChannelSetupPayload }
  | { kind: "control"; payload: Record<string, unknown> };

export enum TrackType {
  AUDIO = "audio",
  VIDEO = "video",
}

export type TransferSessionStatus =
  | "pending"
  | "sending"
  | "completed"
  | "failed"
  | "cancelled";

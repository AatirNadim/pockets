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
  attachments?: FileAttachment[];
};

export type FileDownloadRequest = {
  fileId: string;
  ownerId: string;
  requesterId: string;
};

export type FileDownloadResponse = FileDownloadRequest & {
  status: "accepted" | "rejected" | "unavailable";
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
  | { kind: "system"; payload: ChatSystemNotice };

export type FileMetadataPayload = {
  fileId: string;
  ownerId: string;
  name: string;
  type: string;
  size: number;
};

export type DataChannelEnvelope =
  | { kind: "file-metadata"; payload: FileMetadataPayload }
  | { kind: "control"; payload: Record<string, unknown> };

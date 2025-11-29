// Shared types between client and server

import { UserType } from "@/lib/constants";

type User = {
  id: string;
  name: string;
  type: UserType;
};

type Room = {
  id: string;
  hostId: string;
  users: User[];
};

// WebSocket message types
type WebSocketMessage =
  | JoinRoomMessage
  | LeaveRoomMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | JoinRequestMessage
  | JoinRequestDecisionMessage
  | UserJoinedMessage
  | UserLeftMessage
  | ErrorMessage
  | HostClosedRoomMessage
  | RoomFullMessage;

type JoinRoomMessage = {
  type: "join-room";
  roomId: string;
  userId: string;
  userName: string;
  userType: UserType;
};

type LeaveRoomMessage = {
  type: "leave-room";
  roomId: string;
  userId: string;
};

// usertype is required for offer and answer for the peers to have information about the other peers
type OfferMessage = {
  type: "offer";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserType: UserType;
  offer: RTCSessionDescriptionInit;
};

type AnswerMessage = {
  type: "answer";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserType: UserType;
  answer: RTCSessionDescriptionInit;
};

type IceCandidateMessage = {
  type: "ice-candidate";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  candidate: RTCIceCandidateInit;
};

type JoinRequestMessage = {
  type: "join-request";
  roomId: string;
  guest: User;
};

type JoinRequestDecisionMessage = {
  type: "join-request-accepted" | "join-request-rejected";
  roomId: string;
  hostUserId: string;
  guestUserId: string;
  hostName?: string;
  guestName?: string;
};

// user-joined message will always come from guests
type UserJoinedMessage = {
  type: "user-joined";
  roomId: string;
  userId: string;
  userName: string;
};

// user-left message will always come from guests; hosts cannot leave without closing the room
type UserLeftMessage = {
  type: "user-left";
  roomId: string;
  userId: string;
};

type ErrorMessage = {
  type: "error";
  message: string;
};

type RoomFullMessage = {
  type: "room-full";
  roomId: string;
};

type HostClosedRoomMessage = {
  type: "host-closed-room";
  roomId: string;
};

type FileAttachment = {
  id: string;
  ownerId: string;
  name: string;
  size: number;
  type: string;
};

type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  attachments?: FileAttachment[];
};

type FileDownloadRequest = {
  fileId: string;
  ownerId: string;
  requesterId: string;
};

type FileDownloadResponse = FileDownloadRequest & {
  status: "accepted" | "rejected" | "unavailable";
  reason?: string;
};

type ChatSystemNotice = {
  id: string;
  message: string;
};

type ChatDataEnvelope =
  | { kind: "chat-message"; payload: ChatMessage }
  | { kind: "file-download-request"; payload: FileDownloadRequest }
  | { kind: "file-download-response"; payload: FileDownloadResponse }
  | { kind: "system"; payload: ChatSystemNotice };

type FileMetadataPayload = {
  fileId: string;
  ownerId: string;
  name: string;
  type: string;
  size: number;
};

type DataChannelEnvelope =
  | { kind: "file-metadata"; payload: FileMetadataPayload }
  | { kind: "control"; payload: Record<string, unknown> };
  
export enum TrackType {
  AUDIO = "audio",
  VIDEO = "video",
}

export type {
  User,
  Room,
  WebSocketMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  JoinRequestMessage,
  JoinRequestDecisionMessage,
  UserJoinedMessage,
  UserLeftMessage,
  ErrorMessage,
  HostClosedRoomMessage,
  RoomFullMessage,
  FileAttachment,
  ChatMessage,
  FileDownloadRequest,
  FileDownloadResponse,
  ChatSystemNotice,
  ChatDataEnvelope,
  DataChannelEnvelope,
  FileMetadataPayload,
};

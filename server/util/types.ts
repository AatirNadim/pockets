// Shared types between client and server

// WebRTC type definitions

import { UserType } from "./constants";
interface RTCSessionDescriptionInit {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp: string;
}

interface RTCIceCandidateInit {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface User {
  id: string;
  name: string;
  type: UserType;
}

export interface Room {
  id: string;
  hostId: string;
  users: User[];
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
  | UserJoinedMessage
  | UserLeftMessage
  | ErrorMessage
  | HostClosedRoomMessage
  | RoomFullMessage
  | AudioMuteMessage
  | AudioUnmuteMessage;

export interface JoinRoomMessage {
  type: "join-room";
  roomId: string;
  userId: string;
  userName: string;
  userType: UserType;
}

export interface LeaveRoomMessage {
  type: "leave-room";
  roomId: string;
  userId: string;
}

export interface OfferMessage {
  type: "offer";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserType: UserType;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerMessage {
  type: "answer";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserType: UserType;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage {
  type: "ice-candidate";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface JoinRequestMessage {
  type: "join-request";
  roomId: string;
  guest: User;
}

export interface JoinRequestDecisionMessage {
  type: "join-request-accepted" | "join-request-rejected";
  roomId: string;
  hostUserId: string;
  guestUserId: string;
  hostName?: string;
  guestName?: string;
}

export interface UserJoinedMessage {
  type: "user-joined";
  roomId: string;
  userId: string;
  userName: string;
  userType: UserType;
}

export interface UserLeftMessage {
  type: "user-left";
  roomId: string;
  userId: string;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export interface RoomFullMessage {
  type: "room-full";
  roomId: string;
}

export interface AudioMuteMessage {
  type: "audio-mute";
  roomId: string;
  userId: string;
}

export interface AudioUnmuteMessage {
  type: "audio-unmute";
  roomId: string;
  userId: string;
}

export interface HostClosedRoomMessage {
  type: "host-closed-room";
  roomId: string;
}

export interface ExtendedWebSocket extends WebSocket {
  userId: string;
  roomId: string;
  userName: string;
  userType: UserType;
}

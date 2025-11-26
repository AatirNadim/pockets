// Shared types between client and server

import { UserType } from "@/lib/constants";

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
  | RoomFullMessage;

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

// usertype is required for offer and answer for the peers to have information about the other peers
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

// user-joined message will always come from guests
export interface UserJoinedMessage {
  type: "user-joined";
  roomId: string;
  userId: string;
  userName: string;
}

// user-left message will always come from guests; hosts cannot leave without closing the room
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

export interface HostClosedRoomMessage {
  type: "host-closed-room";
  roomId: string;
}

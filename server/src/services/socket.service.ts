import { WebSocket } from "ws";
import {
  MAX_USERS_PER_ROOM,
  UserType,
  type AnswerMessage,
  type AudioMuteMessage,
  type AudioUnmuteMessage,
  type ErrorMessage,
  type HostClosedRoomMessage,
  type IceCandidateMessage,
  type JoinRequestDecisionMessage,
  type JoinRequestMessage,
  type JoinRoomMessage,
  type LeaveRoomMessage,
  type OfferMessage,
  type RoomFullMessage,
  type User,
  type UserJoinedMessage,
  type UserLeftMessage,
  type WebSocketMessage,
} from "@pockets/shared";
import type { PersistenceClient } from "../repo/persistence/persistence-client";
import { RoomService } from "./room.service";
import { UserService } from "./user.service";

type Session = {
  socket: WebSocket;
  userId: string;
  roomId: string;
  userName: string;
  userType: UserType;
  state: "pending" | "active";
  generation: number;
  closing: boolean;
};
type ClientMessage = JoinRoomMessage | LeaveRoomMessage | OfferMessage | AnswerMessage | IceCandidateMessage | JoinRequestDecisionMessage | AudioMuteMessage | AudioUnmuteMessage;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const boundedString = (value: unknown, max: number) => typeof value === "string" && value.length > 0 && value.length <= max;
const isUserType = (value: unknown): value is UserType => value === UserType.HOST || value === UserType.GUEST;

function validateClientMessage(input: unknown): ClientMessage {
  if (!isRecord(input) || !boundedString(input.type, 40)) throw new Error("Malformed message");
  const room = () => typeof input.roomId === "string" && UUID.test(input.roomId);
  const identity = () => typeof input.userId === "string" && UUID.test(input.userId);
  switch (input.type) {
    case "join-room":
      if (!room() || !identity() || !boundedString(input.userName, 80) || !isUserType(input.userType)) throw new Error("Invalid join request");
      return input as unknown as JoinRoomMessage;
    case "leave-room":
    case "audio-mute":
    case "audio-unmute":
      if (!room() || !identity()) throw new Error("Invalid room message");
      return input as unknown as LeaveRoomMessage | AudioMuteMessage | AudioUnmuteMessage;
    case "join-request-accepted":
    case "join-request-rejected":
      if (!room() || typeof input.hostUserId !== "string" || !UUID.test(input.hostUserId) || typeof input.guestUserId !== "string" || !UUID.test(input.guestUserId)) throw new Error("Invalid admission decision");
      return input as unknown as JoinRequestDecisionMessage;
    case "offer":
    case "answer": {
      const description = input.type === "offer" ? input.offer : input.answer;
      if (!room() || typeof input.fromUserId !== "string" || !UUID.test(input.fromUserId) || typeof input.toUserId !== "string" || !UUID.test(input.toUserId) || !boundedString(input.fromUserName, 80) || !isUserType(input.fromUserType) || !isRecord(description) || !["offer", "answer"].includes(String(description.type)) || !boundedString(description.sdp, 50000)) throw new Error("Invalid session description");
      if ((input.type === "offer" && description.type !== "offer") || (input.type === "answer" && description.type !== "answer")) throw new Error("Invalid session description type");
      return input as unknown as OfferMessage | AnswerMessage;
    }
    case "ice-candidate":
      if (!room() || typeof input.fromUserId !== "string" || !UUID.test(input.fromUserId) || typeof input.toUserId !== "string" || !UUID.test(input.toUserId) || !isRecord(input.candidate) || typeof input.candidate.candidate !== "string" || input.candidate.candidate.length > 8192 || (input.candidate.sdpMid !== undefined && input.candidate.sdpMid !== null && !boundedString(input.candidate.sdpMid, 128)) || (input.candidate.sdpMLineIndex !== undefined && input.candidate.sdpMLineIndex !== null && (typeof input.candidate.sdpMLineIndex !== "number" || !Number.isInteger(input.candidate.sdpMLineIndex) || input.candidate.sdpMLineIndex < 0))) throw new Error("Invalid ICE candidate");
      return input as unknown as IceCandidateMessage;
    default:
      throw new Error("Unknown message type");
  }
}

export class SocketService {
  private readonly roomService: RoomService;
  private readonly userService: UserService;
  private readonly sessions = new WeakMap<WebSocket, Session>();
  private readonly sessionByUser = new Map<string, Session>();
  private readonly joiningUserIds = new Set<string>();
  private readonly rate = new WeakMap<WebSocket, { startedAt: number; count: number }>();
  private generation = 0;

  constructor(private readonly persistence: PersistenceClient) {
    this.roomService = new RoomService(persistence);
    this.userService = new UserService(persistence);
  }

  private send(socket: WebSocket, message: WebSocketMessage | Record<string, unknown>) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  private sendError(socket: WebSocket, message: string) {
    this.send(socket, { type: "error", message } satisfies ErrorMessage);
  }

  async handleMessage(socket: WebSocket, rawMessage: unknown) {
    const now = Date.now();
    const currentRate = this.rate.get(socket);
    if (!currentRate || now - currentRate.startedAt >= 10_000) this.rate.set(socket, { startedAt: now, count: 1 });
    else if (++currentRate.count > 120) {
      this.sendError(socket, "Too many messages. Reconnect and try again.");
      socket.close(1013, "Rate limit exceeded");
      return;
    }
    let message: ClientMessage;
    try {
      message = validateClientMessage(rawMessage);
    } catch {
      this.sendError(socket, "Invalid signaling message.");
      socket.close(1008, "Invalid message");
      return;
    }

    try {
      if (message.type === "join-room") {
        await this.join(socket, message);
        return;
      }
      const session = this.sessions.get(socket);
      if (!session || this.sessionByUser.get(session.userId) !== session || session.socket !== socket) {
        this.sendError(socket, "Join a room before sending room messages.");
        socket.close(1008, "Join required");
        return;
      }
      if (message.roomId !== session.roomId || ("userId" in message && message.userId !== session.userId) || ("fromUserId" in message && message.fromUserId !== session.userId) || ("hostUserId" in message && message.hostUserId !== session.userId)) {
        this.sendError(socket, "Message identity does not match this connection.");
        socket.close(1008, "Identity mismatch");
        return;
      }
      if (message.type === "leave-room") {
        await this.leave(session);
        return;
      }
      if (session.state !== "active") {
        this.sendError(socket, "Wait for the host to admit you before sending room messages.");
        return;
      }
      switch (message.type) {
        case "offer":
        case "answer":
        case "ice-candidate":
          this.forwardSignal(session, message);
          break;
        case "join-request-accepted":
        case "join-request-rejected":
          await this.decideAdmission(session, message);
          break;
        case "audio-mute":
        case "audio-unmute":
          await this.broadcast(session.roomId, { type: message.type, roomId: session.roomId, userId: session.userId });
          break;
        default:
          this.sendError(socket, "Unsupported message for this room session.");
      }
    } catch (error) {
      console.error("Signaling operation failed:", error instanceof Error ? error.message : "unknown error");
      this.sendError(socket, "The room operation could not be completed. Please retry.");
    }
  }

  private async join(socket: WebSocket, message: JoinRoomMessage) {
    if (this.sessions.has(socket)) {
      this.sendError(socket, "This connection has already joined a room.");
      socket.close(1008, "Already joined");
      return;
    }
    if (this.sessionByUser.has(message.userId) || this.joiningUserIds.has(message.userId) || await this.userService.getUserDetails(message.userId)) {
      this.sendError(socket, "This participant ID is already in use. Reopen the room to reconnect.");
      return;
    }
    this.joiningUserIds.add(message.userId);
    try {
    if (message.userType === UserType.HOST) {
      const user: User = { id: message.userId, name: message.userName.trim(), type: UserType.HOST };
      await this.userService.createUser(user);
      try {
        await this.roomService.createAndPopulateRoom(message.roomId, message.userId);
      } catch (error) {
        await this.userService.deleteUser(user.id);
        throw error;
      }
      this.attachSession(socket, user, message.roomId, "active");
      return;
    }

    const room = await this.roomService.getRoomDetails(message.roomId);
    const host = room?.hostId ? this.sessionByUser.get(room.hostId) : undefined;
    if (!room || !host || host.state !== "active" || host.socket.readyState !== WebSocket.OPEN) {
      this.sendError(socket, "The host is not available in this room right now.");
      return;
    }
    const user: User = { id: message.userId, name: message.userName.trim(), type: UserType.GUEST };
    await this.userService.createUser(user);
    const admission = await this.roomService.requestGuestAdmission(message.roomId, user.id, MAX_USERS_PER_ROOM);
    if (admission !== "queued") {
      await this.userService.deleteUser(user.id);
      if (admission === "full") this.send(socket, { type: "room-full", roomId: message.roomId } satisfies RoomFullMessage);
      else this.sendError(socket, admission === "duplicate" ? "This participant is already in the room." : "This room is no longer available.");
      return;
    }
    this.attachSession(socket, user, message.roomId, "pending");
    const request: JoinRequestMessage = { type: "join-request", roomId: message.roomId, guest: user };
    this.send(host.socket, request);
    } finally {
      this.joiningUserIds.delete(message.userId);
    }
  }

  private attachSession(socket: WebSocket, user: User, roomId: string, state: Session["state"]) {
    const session: Session = { socket, userId: user.id, roomId, userName: user.name, userType: user.type, state, generation: ++this.generation, closing: false };
    this.sessions.set(socket, session);
    this.sessionByUser.set(user.id, session);
  }

  private async decideAdmission(host: Session, message: JoinRequestDecisionMessage) {
    if (host.userType !== UserType.HOST) {
      this.sendError(host.socket, "Only the room host can admit guests.");
      return;
    }
    const room = await this.roomService.getRoomDetails(host.roomId);
    if (!room || room.hostId !== host.userId) {
      this.sendError(host.socket, "This connection is not the active host.");
      return;
    }
    const guest = this.sessionByUser.get(message.guestUserId);
    if (!guest || guest.roomId !== host.roomId || guest.state !== "pending" || guest.closing) {
      this.sendError(host.socket, "That guest request is no longer pending.");
      return;
    }
    if (message.type === "join-request-rejected") {
      await this.roomService.removePendingGuestForRoom(host.roomId, guest.userId);
      this.sendError(guest.socket, "Your request to join the room was declined by the host.");
      await this.removeSession(guest, true);
      return;
    }
    const result = await this.roomService.admitPendingGuest(host.roomId, guest.userId, MAX_USERS_PER_ROOM);
    if (result === "full") {
      this.send(guest.socket, { type: "room-full", roomId: host.roomId } satisfies RoomFullMessage);
      return;
    }
    if (result !== "accepted") {
      this.sendError(host.socket, "That guest request is no longer pending.");
      return;
    }
    if (this.sessionByUser.get(guest.userId) !== guest || guest.closing) {
      await this.roomService.removeUserFromRoom(host.roomId, guest.userId);
      return;
    }
    guest.state = "active";
    this.send(guest.socket, { type: "join-request-accepted", roomId: host.roomId, hostUserId: host.userId, guestUserId: guest.userId, hostName: host.userName, guestName: guest.userName } satisfies JoinRequestDecisionMessage);
    const roster = [...this.sessionByUser.values()]
      .filter((session) => session.roomId === host.roomId && session.state === "active" && session !== guest)
      .map((session) => ({ id: session.userId, name: session.userName, type: session.userType }));
    this.send(guest.socket, { type: "room-roster", roomId: host.roomId, users: roster });
    const joined: UserJoinedMessage = { type: "user-joined", roomId: host.roomId, userId: guest.userId, userName: guest.userName, userType: guest.userType };
    await this.broadcast(host.roomId, joined, guest.userId);
  }

  private forwardSignal(session: Session, message: OfferMessage | AnswerMessage | IceCandidateMessage) {
    const target = this.sessionByUser.get(message.toUserId);
    if (!target || target.roomId !== session.roomId || target.state !== "active" || target.closing || target.socket.readyState !== WebSocket.OPEN) {
      this.sendError(session.socket, "That participant is not available in this room.");
      return;
    }
    if (message.type === "offer") this.send(target.socket, { ...message, roomId: session.roomId, fromUserId: session.userId, fromUserName: session.userName, fromUserType: session.userType });
    else if (message.type === "answer") this.send(target.socket, { ...message, roomId: session.roomId, fromUserId: session.userId, fromUserName: session.userName, fromUserType: session.userType });
    else this.send(target.socket, { ...message, roomId: session.roomId, fromUserId: session.userId });
  }

  private async broadcast(roomId: string, message: WebSocketMessage, exceptUserId?: string) {
    const roomUserIds = new Set([...(await this.roomService.getUserIdsForRoom(roomId)), ...(await this.roomService.getAllPendingGuestIdsForRoom(roomId))]);
    for (const id of roomUserIds) {
      if (id === exceptUserId) continue;
      const session = this.sessionByUser.get(id);
      if (session?.roomId === roomId && session.state === "active") this.send(session.socket, message);
    }
  }

  private async leave(session: Session) {
    await this.removeSession(session, true);
  }

  private async removeSession(session: Session, closeSocket: boolean) {
    if (this.sessionByUser.get(session.userId) !== session || session.closing) return;
    session.closing = true;
    const room = await this.roomService.getRoomDetails(session.roomId);
    if (session.userType === UserType.HOST && room?.hostId === session.userId) {
      const userIds = new Set([...(await this.roomService.getUserIdsForRoom(session.roomId)), ...(await this.roomService.getAllPendingGuestIdsForRoom(session.roomId))]);
      const closed: HostClosedRoomMessage = { type: "host-closed-room", roomId: session.roomId };
      for (const id of userIds) {
        const other = this.sessionByUser.get(id);
        if (other && other !== session) {
          this.send(other.socket, closed);
          this.sessionByUser.delete(id);
          if (other.socket.readyState === WebSocket.OPEN) other.socket.close(1001, "Room closed");
          await this.userService.deleteUser(id);
        }
      }
      await this.roomService.deleteRoom(session.roomId);
      await this.userService.deleteUser(session.userId);
      this.sessionByUser.delete(session.userId);
      if (closeSocket && session.socket.readyState === WebSocket.OPEN) session.socket.close(1001, "Room closed");
      return;
    }

    const wasActive = session.state === "active";
    if (wasActive) await this.roomService.removeUserFromRoom(session.roomId, session.userId);
    else {
      await this.roomService.removePendingGuestForRoom(session.roomId, session.userId);
      // Admission and disconnect can race; clear either representation idempotently.
      await this.roomService.removeUserFromRoom(session.roomId, session.userId);
    }
    await this.userService.deleteUser(session.userId);
    this.sessionByUser.delete(session.userId);
    if (wasActive && room) {
      const left: UserLeftMessage = { type: "user-left", roomId: session.roomId, userId: session.userId };
      await this.broadcast(session.roomId, left, session.userId);
    }
    const active = await this.roomService.getUserCountForRoom(session.roomId);
    const pending = await this.roomService.getPendingCountForRoom(session.roomId);
    if (!active && !pending) await this.roomService.deleteRoom(session.roomId);
    if (closeSocket && session.socket.readyState === WebSocket.OPEN) session.socket.close(1000, "Session ended");
  }

  async disconnect(socket: WebSocket) {
    const session = this.sessions.get(socket);
    if (!session) return;
    await this.removeSession(session, false);
  }

  async touchActiveRooms() {
    const roomIds = new Set(Array.from(this.sessionByUser.values()).filter((session) => !session.closing).map((session) => session.roomId));
    await Promise.all(Array.from(roomIds, (roomId) => this.roomService.touchRoom(roomId)));
  }

  async shutdown() {
    const sessions = Array.from(this.sessionByUser.values());
    for (const session of sessions) await this.removeSession(session, false);
    await this.persistence.close();
  }
}

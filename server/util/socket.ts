import { WebSocket } from "ws";

import { MAX_USERS_PER_ROOM, UserType } from "./constants";
import {
  AnswerMessage,
  ErrorMessage,
  ExtendedWebSocket,
  HostClosedRoomMessage,
  IceCandidateMessage,
  JoinRequestDecisionMessage,
  JoinRequestMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  OfferMessage,
  Room,
  RoomFullMessage,
  User,
  UserJoinedMessage,
  UserLeftMessage,
  WebSocketMessage,
} from "./types";

export class SocketService {
  private rooms: Map<string, Room>;
  private userSockets: Map<string, ExtendedWebSocket>;
  private pendingJoinRequests: Map<string, Map<string, User>>;

  constructor() {
    this.rooms = new Map<string, Room>();
    this.userSockets = new Map<string, ExtendedWebSocket>();
    this.pendingJoinRequests = new Map<string, Map<string, User>>();
  }

  private getHostSocket(roomId: string) {
    const room = this.rooms.get(roomId);
    const hostId = room?.hostId;
    if (!hostId) {
      return null;
    }
    return this.userSockets.get(hostId) ?? null;
  }

  private ensurePendingMap(roomId: string) {
    if (!this.pendingJoinRequests.has(roomId)) {
      this.pendingJoinRequests.set(roomId, new Map<string, User>());
    }
    return this.pendingJoinRequests.get(roomId)!;
  }

  private queuePendingGuest(roomId: string, guest: User) {
    const pending = this.ensurePendingMap(roomId);
    pending.set(guest.id, guest);
  }

  private peekPendingGuest(roomId: string, guestId: string) {
    return this.pendingJoinRequests.get(roomId)?.get(guestId);
  }

  private removePendingGuest(roomId: string, guestId: string) {
    const pending = this.pendingJoinRequests.get(roomId);
    if (!pending) {
      return null;
    }

    const guest = pending.get(guestId) ?? null;
    if (guest) {
      pending.delete(guestId);
      if (pending.size === 0) {
        this.pendingJoinRequests.delete(roomId);
      }
    }
    return guest;
  }

  private notifyHostClosed(roomId: string, remainingUsers: User[]) {
    const hostClosedMessage: HostClosedRoomMessage = {
      type: "host-closed-room",
      roomId,
    };

    const notifyUser = (userId: string) => {
      const socket = this.userSockets.get(userId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(hostClosedMessage));
      }
    };

    remainingUsers.forEach((user) => {
      notifyUser(user.id);
    });

    const pending = this.pendingJoinRequests.get(roomId);
    if (pending) {
      pending.forEach((guest) => {
        notifyUser(guest.id);
      });
    }

    this.pendingJoinRequests.delete(roomId);
    this.rooms.delete(roomId);
  }

  private sendErrorMessage(ws: ExtendedWebSocket, message: string) {
    const errorMessage: ErrorMessage = {
      type: "error",
      message,
    };
    ws.send(JSON.stringify(errorMessage));
  }

  handleMessage(ws: ExtendedWebSocket, message: WebSocketMessage) {
    try {
      switch (message.type) {
        case "join-room":
          console.log(
            "received message to join the room, websocket details --> ",
            ws
          );
          this.joinRoom(ws, message);
          break;
        case "leave-room":
          console.log(
            "received message to leave the room with id:",
            message.roomId,
            "by the user id: ",
            message.userId
          );
          this.handleLeaveRoom(ws, message);
          break;
        case "offer":
          this.handleOffer(message);
          break;
        case "answer":
          this.handleAnswer(message);
          break;
        case "ice-candidate":
          this.handleIceCandidate(message);
          break;
        case "join-request-accepted":
        case "join-request-rejected":
          this.handleJoinRequestDecision(message);
          break;
        default:
          console.warn("Unknown message type:", message.type);
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      const errorMessage: ErrorMessage = {
        type: "error",
        message: "An error occurred while processing your request.",
      };
      ws.send(JSON.stringify(errorMessage));
    } finally {
      console.log("\nroom details:", Array.from(this.rooms.keys()));
      console.log("user sockets:", Array.from(this.userSockets.keys()), "\n");
    }
  }

  private joinRoom(ws: ExtendedWebSocket, message: JoinRoomMessage) {
    console.log(
      "joining room handler --> websocket details --> ",
      ws,
      " message --> ",
      message
    );

    const { roomId, userId, userName, userType } = message;

    const user: User = {
      id: userId,
      name: userName,
      type: userType,
    };

    ws.userId = userId;
    ws.userName = userName;
    ws.userType = userType;

    ws.roomId = roomId;

    console.log("websocket room details after assignment --> ", {
      roomId: ws.roomId,
      userId: ws.userId,
      userName: ws.userName,
      userType: ws.userType,
    });

    this.userSockets.set(userId, ws);

    let room = this.rooms.get(roomId);
    if (!room) {
      if (userType !== UserType.HOST) {
        console.warn(
          `Guest ${userId} attempted to join room ${roomId} before host.`
        );
        this.sendErrorMessage(
          ws,
          "Host is not available in this room yet. Please try again later."
        );
        return;
      }

      console.log(
        "No existing room with the id:",
        roomId,
        "creating a new room"
      );
      room = { id: roomId, hostId: userId, users: [] };
      this.rooms.set(roomId, room);
    }

    if (userType === UserType.HOST) {
      if (room.hostId && room.hostId !== userId) {
        console.warn(`Room ${roomId} already has a host: ${room.hostId}`);
        this.sendErrorMessage(ws, "This room already has an active host.");
        return;
      }
      if (room.users.find((u) => u.id === userId)) {
        console.log("Host already present in room:", userId);
        return;
      }

      room.hostId = userId;
      room.users.push(user);
      this.rooms.set(roomId, room);
    } else {
      if (!room.hostId) {
        console.warn(
          `Room ${roomId} has no registered host. Cannot process guest ${userId}.`
        );
        this.sendErrorMessage(
          ws,
          "Host disconnected. Please wait for the host to return before joining."
        );
        return;
      }

      console.log("processing join request for guest, websocket still working");

      const pendingCount = this.pendingJoinRequests.get(roomId)?.size ?? 0;
      if (room.users.length + pendingCount >= MAX_USERS_PER_ROOM) {
        console.log(
          `Room ${roomId} is full (pending included). Rejecting ${userId}`
        );
        const roomFullMessage: RoomFullMessage = {
          type: "room-full",
          roomId,
        };
        ws.send(JSON.stringify(roomFullMessage));
        return;
      }

      const hostSocket = this.getHostSocket(roomId);

      console.log("host socket fetched for guest join request:", hostSocket);
      if (!hostSocket || hostSocket.readyState !== WebSocket.OPEN) {
        console.warn(
          `Unable to reach host ${room.hostId} for join request from ${userId}.`
        );
        this.sendErrorMessage(
          ws,
          "Unable to contact the host right now. Please try again shortly."
        );
        return;
      }

      this.queuePendingGuest(roomId, user);

      console.log(
        "queued pending guest, forwarding join request to host socket:",
        hostSocket
      );

      const joinRequest: JoinRequestMessage = {
        type: "join-request",
        roomId,
        guest: user,
      };

      console.log("forwarding join request to host socket:", hostSocket);

      hostSocket.send(JSON.stringify(joinRequest));
      console.log(
        `Forwarded join request for user ${userId} to host ${room.hostId} in room ${roomId}`
      );
      return;
    }

    console.log(`User ${userId} joined room ${roomId}`);

    this.broadcastToRoom(roomId, {
      roomId,
      type: "user-joined",
      userId,
      userName,
      userType,
    } as UserJoinedMessage);
  }

  sendSocketMessageUtil(userIds: string[], message: WebSocketMessage) {
    userIds.forEach((userId) => {
      const userSocket = this.userSockets.get(userId);
      if (userSocket && userSocket.readyState === WebSocket.OPEN) {
        userSocket.send(JSON.stringify(message));
      } else {
        console.warn(
          `Socket for user ${userId} is not available or not ready.`
        );
        throw new Error(
          `Socket for user ${userId} is not available or not ready.`
        );
      }
    });
  }

  broadcastToRoom(roomId: string, message: WebSocketMessage) {
    try {
      const room = this.rooms.get(roomId);

      if (!room) {
        throw new Error(`Room with ID ${roomId} does not exist.`);
      }
      // for now, send user-join notification to all users in the room

      switch (message.type) {
        case "user-joined":
          console.log(`Broadcasting user-joined message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users.filter((u) => u.id !== message.userId).map((u) => u.id),
            message
          );
          break;
        case "user-left":
          console.log(`Broadcasting user-left message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users.filter((u) => u.id !== message.userId).map((u) => u.id),
            message
          );
          break;
        case "offer":
          console.log(`Broadcasting offer message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users
              .filter((u) => u.id === message.toUserId)
              .map((u) => u.id),
            message
          );
          break;
        case "answer":
          console.log(`Broadcasting answer message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users
              .filter((u) => u.id === message.toUserId)
              .map((u) => u.id),
            message
          );
          break;
        case "ice-candidate":
          console.log(`Broadcasting ice-candidate message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users
              .filter((u) => u.id === message.toUserId)
              .map((u) => u.id),
            message
          );
          break;
        default:
          console.warn(
            `Broadcasting unknown message type ${message.type} to room ${roomId}`
          );
          throw new Error(
            `Unknown message type: ${message.type} for room ${roomId}`
          );
      }
    } catch (error) {
      console.error("Error broadcasting message:", error);
      throw error;
    }
  }

  // const leaveRoom = (ws: ExtendedWebSocket, message: LeaveRoomMessage) => {
  //   const { roomId, userId } = message;
  // };

  handleOffer(message: OfferMessage) {
    const { toUserId } = message;
    const targetSocket = this.userSockets.get(toUserId);

    console.debug("Sending offer to user:", toUserId, "message:", message);
    targetSocket?.send(JSON.stringify(message));
  }

  handleAnswer(message: AnswerMessage) {
    const { toUserId } = message;
    const targetSocket = this.userSockets.get(toUserId);

    console.debug("Sending answer to user:", toUserId, "message:", message);
    targetSocket?.send(JSON.stringify(message));
  }

  handleIceCandidate(message: IceCandidateMessage) {
    const { toUserId } = message;
    const targetSocket = this.userSockets.get(toUserId);

    if (targetSocket) {
      targetSocket.send(JSON.stringify(message));
    }
  }

  private handleJoinRequestDecision(message: JoinRequestDecisionMessage) {
    console.log("Handling join request decision:", message);
    const { roomId, hostUserId, guestUserId } = message;

    const room = this.rooms.get(roomId);
    if (!room) {
      console.warn(
        `Received join request decision for non-existent room ${roomId}`
      );
      return;
    }

    if (room.hostId !== hostUserId) {
      console.warn(
        `Invalid host decision from ${hostUserId} for room ${roomId}`
      );
      return;
    }

    const pendingGuest = this.peekPendingGuest(roomId, guestUserId);
    if (!pendingGuest) {
      console.warn(
        `No pending guest ${guestUserId} for room ${roomId} to process decision.`
      );
      return;
    }

    const hostSocket = this.userSockets.get(hostUserId);
    const hostName = hostSocket?.userName ?? "Host";
    const guestSocket = this.userSockets.get(guestUserId);

    if (message.type === "join-request-accepted") {
      if (room.users.length >= MAX_USERS_PER_ROOM) {
        console.warn(
          `Host ${hostUserId} attempted to accept guest ${guestUserId}, but room ${roomId} is full.`
        );
        hostSocket?.send(
          JSON.stringify({
            type: "error",
            message: "Room is full. Remove a guest before accepting new ones.",
          } as ErrorMessage)
        );
        guestSocket?.send(
          JSON.stringify({
            type: "room-full",
            roomId,
          } as RoomFullMessage)
        );
        return;
      }

      this.removePendingGuest(roomId, guestUserId);
      if (!room.users.find((user) => user.id === pendingGuest.id)) {
        room.users.push(pendingGuest);
      }
      this.rooms.set(roomId, room);

      guestSocket?.send(
        JSON.stringify({
          ...message,
          hostName,
          guestName: pendingGuest.name,
        })
      );

      this.broadcastToRoom(roomId, {
        roomId,
        type: "user-joined",
        userId: pendingGuest.id,
        userName: pendingGuest.name,
        userType: pendingGuest.type,
      } as UserJoinedMessage);
      return;
    }

    this.removePendingGuest(roomId, guestUserId);
    guestSocket?.send(
      JSON.stringify({
        ...message,
        hostName,
        guestName: pendingGuest.name,
      })
    );
  }

  handleLeaveRoom(ws: ExtendedWebSocket, message: LeaveRoomMessage) {
    const { roomId, userId } = message;

    const pendingGuest = this.removePendingGuest(roomId, userId);
    if (pendingGuest) {
      console.log(
        `Pending guest ${userId} cancelled their join request for room ${roomId}`
      );
      this.userSockets.delete(userId);
      return;
    }

    const room = this.rooms.get(roomId);

    if (!room) {
      console.warn(`Room with ID ${roomId} does not exist.`);
      return;
    }

    const leavingUser = room.users.find((u) => u.id === userId);
    if (!leavingUser) {
      console.warn(
        `User ${userId} attempted to leave room ${roomId} but was not a member.`
      );
      this.userSockets.delete(userId);
      return;
    }

    room.users = room.users.filter((u) => u.id !== userId);
    const isHostLeaving = leavingUser.type === UserType.HOST;

    if (isHostLeaving) {
      this.notifyHostClosed(roomId, room.users);
      this.userSockets.delete(userId);
      console.log(`Host ${userId} closed room ${roomId}`);
      return;
    }

    // Remove empty rooms
    if (room.users.length === 0) {
      this.rooms.delete(roomId);
      this.pendingJoinRequests.delete(roomId);
    } else {
      this.rooms.set(roomId, room);

      // Notify remaining users
      const userLeftMessage: UserLeftMessage = {
        type: "user-left",
        roomId,
        userId,
      };
      this.broadcastToRoom(roomId, userLeftMessage);
    }

    this.userSockets.delete(userId);

    console.log(`User ${userId} left room ${roomId}`);
  }
}

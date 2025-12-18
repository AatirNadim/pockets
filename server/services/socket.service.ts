import { WebSocket } from "ws";

import { MAX_USERS_PER_ROOM, UserType } from "../util/constants";
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
  RoomFullMessage,
  User,
  UserJoinedMessage,
  UserLeftMessage,
  WebSocketMessage,
} from "../util/types";
import { RoomService } from "./room.service";
import { UserService } from "./user.service";

export class SocketService {
  private roomService: RoomService;
  private userService: UserService;

  constructor() {
    this.roomService = new RoomService();
    this.userService = new UserService();
  }

  private notifyHostClosed(roomId: string) {
    const hostClosedMessage: HostClosedRoomMessage = {
      type: "host-closed-room",
      roomId,
    };

    const notifyUser = (userId: string) => {
      const socket = this.userService.getSocketForUser(userId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(hostClosedMessage));
      }
    };

    const remainingUsers = this.roomService.getRoomDetails(roomId)?.users || [];
    remainingUsers.forEach((user) => {
      notifyUser(user.id);
    });

    const pending = this.roomService.getPendingJoinRequestsForRoom(roomId);
    if (pending) {
      pending.forEach((guest) => {
        notifyUser(guest.id);
      });
    }

    // this.roomService.removeAllPendingGuestsForRoom(roomId);
    // this.roomService.deleteRoom(roomId);
  }

  private sendErrorMessage(ws: ExtendedWebSocket, message: string) {
    const errorMessage: ErrorMessage = {
      type: "error",
      message,
    };
    this.sendSocketMessageUtil([ws], errorMessage);
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
        case "audio-mute":
          this.broadCastToRoomFromSource(
            message.roomId,
            message.userId,
            message
          );
          break;
        case "audio-unmute":
          this.broadCastToRoomFromSource(
            message.roomId,
            message.userId,
            message
          );
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
      console.log("\nroom details:", this.roomService.getAllRoomIds());
      console.log("user sockets:", this.userService.getAllUserIds(), "\n");
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

    const newUser: User = {
      id: userId,
      name: userName,
      type: userType,
    };

    ws.userId = userId;
    ws.userName = userName;
    ws.userType = userType;

    ws.roomId = roomId;

    // console.log("websocket room details after assignment --> ", {
    //   roomId: ws.roomId,
    //   userId: ws.userId,
    //   userName: ws.userName,
    //   userType: ws.userType,
    // });

    this.userService.createOrUpdateUserSocket(userId, ws);

    let room = this.roomService.getRoomDetails(roomId);
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
      room = this.roomService.createAndPopulateRoom(roomId, newUser);
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
      this.roomService.addUserToRoom(roomId, newUser);
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

      const pendingCount =
        this.roomService.getPendingJoinRequestsForRoom(roomId)?.size ?? 0;
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

      const hostSocket = this.userService.getSocketForUser(
        this.roomService.getHostIdForRoom(roomId) ?? ""
      );

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

      this.roomService.queuePendingGuest(roomId, newUser);

      console.log(
        "queued pending guest, forwarding join request to host socket:",
        hostSocket
      );

      const joinRequest: JoinRequestMessage = {
        type: "join-request",
        roomId,
        guest: newUser,
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

  private broadCastToRoomFromSource(
    roomId: string,
    sourceUserId: string,
    message: WebSocketMessage
  ) {
    try {
      const room = this.roomService.getRoomDetails(roomId);

      if (!room) {
        throw new Error(`Room with ID ${roomId} does not exist.`);
      }

      // all the sockets to send the message to except the source socket
      const userSockets = this.roomService
        .getRoomDetails(roomId)
        ?.users.filter((u) => u.id !== sourceUserId)
        .map((itr) => this.userService.getSocketForUser(itr.id));

      this.sendSocketMessageUtil(userSockets as ExtendedWebSocket[], message);
    } catch (error) {
      console.error("Error broadcasting message from source:", error);
    }
  }

  private sendSocketMessageUtil(
    userSockets: ExtendedWebSocket[],
    message: WebSocketMessage
  ) {
    userSockets.forEach((userSocket) => {
      if (userSocket && userSocket.readyState === WebSocket.OPEN) {
        userSocket.send(JSON.stringify(message));
      } else {
        console.warn(
          `Socket for user ${userSocket.userId} is not available or not ready.`
        );
        throw new Error(
          `Socket for user ${userSocket.userId} is not available or not ready.`
        );
      }
    });
  }

  private broadcastToRoom(roomId: string, message: WebSocketMessage) {
    try {
      const room = this.roomService.getRoomDetails(roomId);

      if (!room) {
        throw new Error(`Room with ID ${roomId} does not exist.`);
      }
      // for now, send user-join notification to all users in the room

      switch (message.type) {
        case "user-joined":
          console.log(`Broadcasting user-joined message to room ${roomId}`);
          this.broadCastToRoomFromSource(roomId, message.userId, message);
          break;
        case "user-left":
          console.log(`Broadcasting user-left message to room ${roomId}`);
          this.broadCastToRoomFromSource(roomId, message.userId, message);
          break;
        case "offer":
          console.log(`Broadcasting offer message to room ${roomId}`);
          this.broadCastToRoomFromSource(roomId, message.fromUserId, message);
          break;
        case "answer":
          console.log(`Broadcasting answer message to room ${roomId}`);
          this.broadCastToRoomFromSource(roomId, message.fromUserId, message);
          break;
        case "ice-candidate":
          console.log(`Broadcasting ice-candidate message to room ${roomId}`);
          this.broadCastToRoomFromSource(roomId, message.fromUserId, message);
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

  private handleOffer(message: OfferMessage) {
    const { toUserId } = message;
    const targetSocket = this.userService.getSocketForUser(toUserId);

    console.debug("Sending offer to user:", toUserId, "message:", message);
    targetSocket?.send(JSON.stringify(message));
  }

  private handleAnswer(message: AnswerMessage) {
    const { toUserId } = message;
    const targetSocket = this.userService.getSocketForUser(toUserId);

    console.debug("Sending answer to user:", toUserId, "message:", message);
    targetSocket?.send(JSON.stringify(message));
  }

  private handleIceCandidate(message: IceCandidateMessage) {
    const { toUserId } = message;
    const targetSocket = this.userService.getSocketForUser(toUserId);

    if (targetSocket) {
      targetSocket.send(JSON.stringify(message));
    }
  }

  private handleJoinRequestDecision(message: JoinRequestDecisionMessage) {
    console.log("Handling join request decision:", message);
    const { roomId, hostUserId, guestUserId } = message;

    const room = this.roomService.getRoomDetails(roomId);
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

    const pendingGuest = this.roomService.peekPendingGuest(roomId, guestUserId);
    if (!pendingGuest) {
      console.warn(
        `No pending guest ${guestUserId} for room ${roomId} to process decision.`
      );
      return;
    }

    const hostSocket = this.userService.getSocketForUser(hostUserId);
    const hostName = hostSocket?.userName ?? "Host";
    const guestSocket = this.userService.getSocketForUser(guestUserId);

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

      this.roomService.removePendingGuestForRoom(roomId, guestUserId);
      if (!room.users.find((user) => user.id === pendingGuest.id)) {
        room.users.push(pendingGuest);
      }
      this.roomService.updateRoom(room);

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

    this.roomService.removePendingGuestForRoom(roomId, guestUserId);
    guestSocket?.send(
      JSON.stringify({
        ...message,
        hostName,
        guestName: pendingGuest.name,
      })
    );
  }

  private handleLeaveRoom(ws: ExtendedWebSocket, message: LeaveRoomMessage) {
    const { roomId, userId } = message;

    const pendingGuest = this.roomService.removePendingGuestForRoom(
      roomId,
      userId
    );
    if (pendingGuest) {
      console.log(
        `Pending guest ${userId} cancelled their join request for room ${roomId}`
      );
      this.userService.deleteUserSocket(userId);
      return;
    }

    const room = this.roomService.getRoomDetails(roomId);
    if (!room) {
      console.warn(`Room with ID ${roomId} does not exist.`);
      return;
    }

    const leavingUser = room.users.find((u) => u.id === userId);
    if (!leavingUser) {
      console.warn(
        `User ${userId} attempted to leave room ${roomId} but was not a member.`
      );
      this.userService.deleteUserSocket(userId);
      return;
    }

    room.users = room.users.filter((u) => u.id !== userId);
    const isHostLeaving = leavingUser.type === UserType.HOST;

    if (isHostLeaving) {
      this.notifyHostClosed(roomId);
      // this.userService.deleteUserSocket(userId);
      const userIdsToDelete = room.users.map((u) => u.id);
      this.userService.deleteMultipleUserSockets(userIdsToDelete);
      room.users = [];
      console.log(`Host ${userId} closed room ${roomId}`);
    }

    // Remove empty rooms
    if (room.users.length === 0) {
      this.roomService.deleteRoom(roomId);
      this.roomService.removeAllPendingGuestsForRoom(roomId);
    } else {
      this.roomService.updateRoom(room);

      // Notify remaining users
      const userLeftMessage: UserLeftMessage = {
        type: "user-left",
        roomId,
        userId,
      };
      this.broadcastToRoom(roomId, userLeftMessage);
    }

    this.userService.deleteUserSocket(userId);
    console.log(`User ${userId} left room ${roomId}`);
  }
}

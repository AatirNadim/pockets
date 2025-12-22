import { WebSocket } from "ws";

import { RoomService } from "./room.service";
import { UserService } from "./user.service";
import {
  AnswerMessage,
  MAX_USERS_PER_ROOM,
  UserType,
  ErrorMessage,
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
} from "@pockets/shared";
import { PersistenceClient } from "../repo/persistence/persistence-client";
import { UserSocketRepo } from "../repo/user-socket.repo";

export class SocketService {
  private roomService: RoomService;
  private userService: UserService;
  private userSocketRepo: UserSocketRepo;

  constructor(private persistenceClient: PersistenceClient) {
    this.roomService = new RoomService(persistenceClient);
    this.userService = new UserService(persistenceClient);
    this.userSocketRepo = new UserSocketRepo();
  }

  private notifyUser = (userId: string, msg: string) => {
    const socket = this.userSocketRepo.getSocketForUser(userId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(msg);
    }
  };

  private async notifyHostClosed(roomId: string) {
    const hostClosedMessage: HostClosedRoomMessage = {
      type: "host-closed-room",
      roomId,
    };

    const guests = await this.roomService.getAllGuestsForRoom(roomId);
    guests.forEach((user) => {
      this.notifyUser(user.id, JSON.stringify(hostClosedMessage));
    });

    const pendingGuests = await this.roomService.getAllPendingGuestsForRoom(
      roomId
    );
    if (pendingGuests) {
      pendingGuests.forEach((guest) => {
        this.notifyUser(guest.id, JSON.stringify(hostClosedMessage));
      });
    }
  }

  private sendErrorMessage(userId: string, ws: WebSocket, message: string) {
    const errorMessage: ErrorMessage = {
      type: "error",
      message,
    };
    const localMap = new Map<string, WebSocket>();
    localMap.set(userId, ws);
    this.sendSocketMessageUtil(localMap, errorMessage);
  }

  async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    try {
      switch (message.type) {
        case "join-room":
          console.log(
            "received message to join the room, websocket details --> ",
            ws
          );
          await this.joinRoom(ws, message);
          break;
        case "leave-room":
          console.log(
            "received message to leave the room with id:",
            message.roomId,
            "by the user id: ",
            message.userId
          );
          await this.handleLeaveRoom(ws, message);
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
          await this.handleJoinRequestAccepted(message);
          break;
        case "join-request-rejected":
          await this.handleJoinRequestRejected(message);
          break;
        case "audio-mute":
          await this.broadCastToRoomFromSource(
            message.roomId,
            message.userId,
            message
          );
          break;
        case "audio-unmute":
          await this.broadCastToRoomFromSource(
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
    }
  }

  private async joinRoomAsHost(msg: JoinRoomMessage, ws: WebSocket) {
    const { roomId, userId, userName, userType } = msg;

    let room = await this.roomService.getRoomDetails(roomId);
    if (room) {
      console.error(
        `Room with id ${roomId} already exists, cannot join as host again.`
      );
      this.sendErrorMessage(
        userId,
        ws,
        "This room already has an active host."
      );
      return;
    }

    const hostUser = await this.userService.createUser({
      id: userId,
      name: userName,
      type: userType,
    });

    this.userSocketRepo.addUserSocket(userId, ws);

    room = await this.roomService.createAndPopulateRoom(roomId, userId);

    console.log(`Host ${userId} created and joined room ${roomId}`);
  }

  private async joinRoomAsGuest(msg: JoinRoomMessage, ws: WebSocket) {
    const { roomId, userId, userName, userType } = msg;

    const room = await this.roomService.getRoomDetails(roomId);
    if (!room) {
      console.error(
        `Guest ${userId} attempted to join room ${roomId} before host.`
      );
      this.sendErrorMessage(
        userId,
        ws,
        "Host is not available in this room yet. Please try again later."
      );
      return;
    }

    if (!room.hostId) {
      console.error(
        `Room ${roomId} has no registered host. Cannot process guest ${userId}.`
      );
      this.sendErrorMessage(
        userId,
        ws,
        "Host disconnected. Please wait for the host to return before joining."
      );
      return;
    }

    const userCount = await this.roomService.getUserCountForRoom(roomId);
    const pendingCount = await this.roomService.getPendingCountForRoom(roomId);
    if (userCount + pendingCount >= MAX_USERS_PER_ROOM) {
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

    const hostSocket = this.userSocketRepo.getSocketForUser(room.hostId);

    if (!hostSocket || hostSocket.readyState !== WebSocket.OPEN) {
      console.error(
        `Unable to reach host ${room.hostId} for join request from ${userId}.`
      );
      this.sendErrorMessage(
        userId,
        ws,
        "Unable to contact the host right now. Please try again shortly."
      );
      return;
    }

    const newUser: User = {
      id: userId,
      name: userName,
      type: userType,
    };

    await this.userService.createUser(newUser);

    this.userSocketRepo.addUserSocket(userId, ws);

    await this.roomService.queuePendingGuest(roomId, userId);

    const joinRequest: JoinRequestMessage = {
      type: "join-request",
      roomId,
      guest: newUser,
    };

    hostSocket.send(JSON.stringify(joinRequest));
    console.log(
      `Forwarded join request for user ${userId} to host ${room.hostId} in room ${roomId}`
    );
  }

  private async joinRoom(ws: WebSocket, message: JoinRoomMessage) {
    try {
      const { roomId, userId, userName, userType } = message;

      if (userType === UserType.HOST) {
        await this.joinRoomAsHost(message, ws);
      } else {
        await this.joinRoomAsGuest(message, ws);
      }
    } catch (err) {
      console.error("Error in joinRoom handler:", err);
      this.sendErrorMessage(
        message.userId,
        ws,
        "An error occurred while trying to join the room."
      );
    }
  }

  // private async joinRoom(ws: WebSocket, message: JoinRoomMessage) {
  //   console.log(
  //     "joining room handler --> websocket details --> ",
  //     ws,
  //     " message --> ",
  //     message
  //   );

  //   const { roomId, userId, userName, userType } = message;

  //   let room = await this.roomService.getRoomDetails(roomId);
  //   if (!room) {
  //     if (userType !== UserType.HOST) {
  //       console.warn(
  //         `Guest ${userId} attempted to join room ${roomId} before host.`
  //       );
  //       this.sendErrorMessage(
  //         userId,
  //         ws,
  //         "Host is not available in this room yet. Please try again later."
  //       );
  //       return;
  //     }

  //     console.log(
  //       "No existing room with the id:",
  //       roomId,
  //       "creating a new room"
  //     );

  //     const newUser: User = {
  //       id: userId,
  //       name: userName,
  //       type: userType,
  //     };

  //     // persist the user details
  //     await this.userService.createUser(newUser);

  //     // persist the socket details in-memory
  //     this.userSocketRepo.addUserSocket(userId, ws);

  //     room = await this.roomService.createAndPopulateRoom(roomId, userId);
  //   }

  //   if (userType === UserType.HOST) {
  //     if (room.hostId && room.hostId !== userId) {
  //       console.warn(`Room ${roomId} already has a host: ${room.hostId}`);
  //       this.sendErrorMessage(
  //         userId,
  //         ws,
  //         "This room already has an active host."
  //       );
  //       return;
  //     }

  //     if ((await this.roomService.getUserIdsForRoom(roomId)).includes(userId)) {
  //       console.log("Host already present in room:", userId);
  //       return;
  //     }

  //     room.hostId = userId;
  //     await this.roomService.addUserToRoom(roomId, userId);
  //   } else {
  //     if (!room.hostId) {
  //       console.warn(
  //         `Room ${roomId} has no registered host. Cannot process guest ${userId}.`
  //       );
  //       this.sendErrorMessage(
  //         userId,
  //         ws,
  //         "Host disconnected. Please wait for the host to return before joining."
  //       );
  //       return;
  //     }

  //     console.log("processing join request for guest, websocket still working");

  //     const userCount = await this.roomService.getUserCountForRoom(roomId);

  //     const pendingCount = await this.roomService.getPendingCountForRoom(
  //       roomId
  //     );
  //     if (userCount + pendingCount >= MAX_USERS_PER_ROOM) {
  //       console.log(
  //         `Room ${roomId} is full (pending included). Rejecting ${userId}`
  //       );
  //       const roomFullMessage: RoomFullMessage = {
  //         type: "room-full",
  //         roomId,
  //       };
  //       ws.send(JSON.stringify(roomFullMessage));
  //       return;
  //     }

  //     const hostSocket = this.userSocketRepo.getSocketForUser(
  //       (await this.roomService.getHostIdForRoom(roomId)) ?? ""
  //     );

  //     console.log("host socket fetched for guest join request:", hostSocket);
  //     if (!hostSocket || hostSocket.readyState !== WebSocket.OPEN) {
  //       console.warn(
  //         `Unable to reach host ${room.hostId} for join request from ${userId}.`
  //       );
  //       this.sendErrorMessage(
  //         userId,
  //         ws,
  //         "Unable to contact the host right now. Please try again shortly."
  //       );
  //       return;
  //     }

  //     this.roomService.queuePendingGuest(roomId, userId);

  //     console.log(
  //       "queued pending guest, forwarding join request to host socket:",
  //       hostSocket
  //     );

  //     const joinRequest: JoinRequestMessage = {
  //       type: "join-request",
  //       roomId,
  //       guest: newUser,
  //     };

  //     console.log("forwarding join request to host socket:", hostSocket);

  //     hostSocket.send(JSON.stringify(joinRequest));
  //     console.log(
  //       `Forwarded join request for user ${userId} to host ${room.hostId} in room ${roomId}`
  //     );
  //     return;
  //   }

  //   console.log(`User ${userId} joined room ${roomId}`);

  //   await this.broadcastToRoom(roomId, {
  //     roomId,
  //     type: "user-joined",
  //     userId,
  //     userName,
  //     userType,
  //   } as UserJoinedMessage);
  // }

  private async broadCastToRoomFromSource(
    roomId: string,
    sourceUserId: string,
    message: WebSocketMessage
  ) {
    try {
      const room = await this.roomService.getRoomDetails(roomId);

      if (!room) {
        throw new Error(`Room with ID ${roomId} does not exist.`);
      }

      const userIdsForRoom = (
        await this.roomService.getUserIdsForRoom(roomId)
      ).filter((userId) => userId !== sourceUserId);
      const userSockets =
        this.userSocketRepo.getUserSocketMapForRoom(userIdsForRoom);

      if (!userSockets) {
        throw new Error(`No user sockets found for room with ID ${roomId}.`);
      }

      // all the sockets to send the message to except the source socket
      this.sendSocketMessageUtil(userSockets, message);
    } catch (error) {
      console.error("Error broadcasting message from source:", error);
    }
  }

  private sendSocketMessageUtil(
    userSockets: Map<string, WebSocket>,
    message: WebSocketMessage
  ) {
    userSockets.forEach((userSocket, userId) => {
      if (userSocket && userSocket.readyState === WebSocket.OPEN) {
        userSocket.send(JSON.stringify(message));
      } else {
        console.warn(
          `Socket for user ${userId} is not available or not ready.`
        );
        // throw new Error(
        //   `Socket for user ${userId} is not available or not ready.`
        // );
      }
    });
  }

  private async broadcastToRoom(roomId: string, message: WebSocketMessage) {
    try {
      const room = await this.roomService.getRoomDetails(roomId);

      if (!room) {
        throw new Error(`Room with ID ${roomId} does not exist.`);
      }
      // for now, send user-join notification to all users in the room

      switch (message.type) {
        case "user-joined":
          console.log(`Broadcasting user-joined message to room ${roomId}`);
          await this.broadCastToRoomFromSource(roomId, message.userId, message);
          break;
        case "user-left":
          console.log(`Broadcasting user-left message to room ${roomId}`);
          await this.broadCastToRoomFromSource(roomId, message.userId, message);
          break;
        case "offer":
          console.log(`Broadcasting offer message to room ${roomId}`);
          await this.broadCastToRoomFromSource(
            roomId,
            message.fromUserId,
            message
          );
          break;
        case "answer":
          console.log(`Broadcasting answer message to room ${roomId}`);
          await this.broadCastToRoomFromSource(
            roomId,
            message.fromUserId,
            message
          );
          break;
        case "ice-candidate":
          console.log(`Broadcasting ice-candidate message to room ${roomId}`);
          await this.broadCastToRoomFromSource(
            roomId,
            message.fromUserId,
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

  private handleOffer(message: OfferMessage) {
    const { toUserId } = message;
    const targetSocket = this.userSocketRepo.getSocketForUser(toUserId);

    if (!targetSocket) {
      console.error(`No socket found for user ${toUserId} to send offer.`);
      return;
    }

    console.debug("Sending offer to user:", toUserId, "message:", message);
    targetSocket.send(JSON.stringify(message));
  }

  private handleAnswer(message: AnswerMessage) {
    const { toUserId } = message;
    const targetSocket = this.userSocketRepo.getSocketForUser(toUserId);

    if (!targetSocket) {
      console.error(`No socket found for user ${toUserId} to send answer.`);
      return;
    }

    console.debug("Sending answer to user:", toUserId, "message:", message);
    targetSocket.send(JSON.stringify(message));
  }

  private handleIceCandidate(message: IceCandidateMessage) {
    const { toUserId } = message;
    const targetSocket = this.userSocketRepo.getSocketForUser(toUserId);

    if (!targetSocket) {
      console.error(
        `No socket found for user ${toUserId} to send ice-candidate.`
      );
      return;
    }

    targetSocket.send(JSON.stringify(message));
  }

  private async handleJoinRequestAccepted(msg: JoinRequestDecisionMessage) {
    const { guestUserId, hostUserId, roomId } = msg;
    const room = await this.roomService.getRoomDetails(roomId);
    if (
      !(await this.roomService.isSpaceAvailableInRoom(
        roomId,
        MAX_USERS_PER_ROOM
      ))
    ) {
      console.warn(
        `Host ${hostUserId} attempted to accept guest ${guestUserId}, but room ${roomId} is full.`
      );
      const hostSocket = this.userSocketRepo.getSocketForUser(hostUserId);
      hostSocket?.send(
        JSON.stringify({
          type: "error",
          message: "Room is full. Remove a guest before accepting new ones.",
        } as ErrorMessage)
      );
      const guestSocket = this.userSocketRepo.getSocketForUser(guestUserId);
      guestSocket?.send(
        JSON.stringify({
          type: "room-full",
          roomId,
        } as RoomFullMessage)
      );
      return;
    }
    await this.roomService.removePendingGuestForRoom(roomId, guestUserId);
    await this.roomService.addGuestToRoom(roomId, guestUserId);

    const user = await this.userService.getUserDetails(guestUserId);

    await this.broadcastToRoom(roomId, {
      roomId,
      type: "user-joined",
      userId: user?.id,
      userName: user?.name || "Guest",
      userType: UserType.GUEST,
    } as UserJoinedMessage);
  }

  private async handleJoinRequestRejected(msg: JoinRequestDecisionMessage) {
    const { guestUserId, roomId } = msg;
    await this.roomService.removePendingGuestForRoom(roomId, guestUserId);

    this.sendErrorMessage(
      guestUserId,
      this.userSocketRepo.getSocketForUser(guestUserId)!,
      "Your request to join the room was rejected by the host."
    );

    this.userSocketRepo.removeUserSocket(guestUserId);
    await this.userService.deleteUser(guestUserId);
  }

  // private async handleJoinRequestDecision(message: JoinRequestDecisionMessage) {
  //   console.log("Handling join request decision:", message);
  //   const { roomId, hostUserId, guestUserId } = message;

  //   const room = await this.roomService.getRoomDetails(roomId);
  //   if (!room) {
  //     console.warn(
  //       `Received join request decision for non-existent room ${roomId}`
  //     );
  //     return;
  //   }

  //   if (room.hostId !== hostUserId) {
  //     console.warn(
  //       `Invalid host decision from ${hostUserId} for room ${roomId}`
  //     );
  //     return;
  //   }

  //   const pendingGuest = await this.roomService.peekPendingGuest(
  //     roomId,
  //     guestUserId
  //   );
  //   if (!pendingGuest) {
  //     console.warn(
  //       `No pending guest ${guestUserId} for room ${roomId} to process decision.`
  //     );
  //     return;
  //   }

  //   const hostSocket = this.userSocketRepo.getSocketForUser(hostUserId);
  //   const hostUser = await this.userService.getUserDetails(hostUserId);
  //   const hostName = hostUser?.name ?? "Host";
  //   const guestSocket = this.userSocketRepo.getSocketForUser(guestUserId);
  //   const userCountForRoom = await this.roomService.getUserCountForRoom(roomId);

  //   if (message.type === "join-request-accepted") {
  //     if (userCountForRoom >= MAX_USERS_PER_ROOM) {
  //       console.warn(
  //         `Host ${hostUserId} attempted to accept guest ${guestUserId}, but room ${roomId} is full.`
  //       );
  //       hostSocket?.send(
  //         JSON.stringify({
  //           type: "error",
  //           message: "Room is full. Remove a guest before accepting new ones.",
  //         } as ErrorMessage)
  //       );
  //       guestSocket?.send(
  //         JSON.stringify({
  //           type: "room-full",
  //           roomId,
  //         } as RoomFullMessage)
  //       );
  //       return;
  //     }

  //     await this.roomService.removePendingGuestForRoom(roomId, guestUserId);
  //     await this.roomService.addGuestToRoom(roomId, guestUserId);
  //     await this.roomService.updateRoom(room);

  //     guestSocket?.send(
  //       JSON.stringify({
  //         ...message,
  //         hostName,
  //         guestName: pendingGuest.name,
  //       })
  //     );

  //     await this.broadcastToRoom(roomId, {
  //       roomId,
  //       type: "user-joined",
  //       userId: pendingGuest.id,
  //       userName: pendingGuest.name,
  //       userType: pendingGuest.type,
  //     } as UserJoinedMessage);
  //     return;
  //   }

  //   this.roomService.removePendingGuestForRoom(roomId, guestUserId);
  //   guestSocket?.send(
  //     JSON.stringify({
  //       ...message,
  //       hostName,
  //       guestName: pendingGuest.name,
  //     })
  //   );
  // }

  private async leaveUserAsHost(msg: LeaveRoomMessage, user: User) {
    const { roomId, userId } = msg;

    const room = await this.roomService.getRoomDetails(roomId);
    if (!room) {
      console.warn(`Room with id ${roomId} does not exist`);
      return;
    }

    if (room.hostId !== userId) {
      console.warn(`User ${userId} is not the host of room ${roomId}`);
      return;
    }

    await this.notifyHostClosed(roomId);
    const allUserIdsForRoom = await this.roomService.getUserIdsForRoom(roomId);
    this.userSocketRepo.removeMultipleUserSockets(allUserIdsForRoom);
    await this.userService.deleteMultipleUsers(allUserIdsForRoom);
    await this.roomService.removeAllUsersFromRoom(roomId);
  }

  private async leaveUserAsGuest(msg: LeaveRoomMessage, user: User) {
    const { roomId, userId } = msg;

    const room = await this.roomService.getRoomDetails(roomId);
    if (!room) {
      console.warn(`Room with id ${roomId} does not exist`);
      return;
    }

    await this.roomService.removeUserFromRoom(roomId, userId);
    await this.roomService.removePendingGuestForRoom(roomId, userId);
    await this.broadCastToRoomFromSource(roomId, userId, {
      type: "user-left",
      roomId,
      userId,
    } as UserLeftMessage);

    this.userSocketRepo.removeUserSocket(userId);
    await this.userService.deleteUser(userId);
  }

  private async handleLeaveRoom(ws: WebSocket, msg: LeaveRoomMessage) {
    const { roomId, userId } = msg;
    const user = await this.userService.getUserDetails(userId);
    if (!user) {
      console.warn(`User with id ${userId} does not exist`);
      return;
    }
    if (user.type === UserType.HOST) {
      await this.leaveUserAsHost(msg, user);
    } else {
      await this.leaveUserAsGuest(msg, user);
    }

    const userCount = await this.roomService.getUserCountForRoom(roomId);
    const pendingCount = await this.roomService.getPendingCountForRoom(roomId);
    console.log(
      `After user ${userId} left room ${roomId}, user count: ${userCount}, pending count: ${pendingCount}`
    );

    if (userCount + pendingCount === 0) {
      await this.roomService.deleteRoom(roomId);
      console.log(`Room ${roomId} deleted as it became empty.`);
    }
  }

  // private async handleLeaveRoom(ws: WebSocket, message: LeaveRoomMessage) {
  //   const { roomId, userId } = message;

  //   const pendingGuest = await this.roomService.removePendingGuestForRoom(
  //     roomId,
  //     userId
  //   );
  //   if (pendingGuest) {
  //     console.log(
  //       `Pending guest ${userId} cancelled their join request for room ${roomId}`
  //     );
  //     this.userSocketRepo.removeUserSocket(userId);
  //     return;
  //   }

  //   const room = await this.roomService.getRoomDetails(roomId);
  //   if (!room) {
  //     console.warn(`Room with ID ${roomId} does not exist.`);
  //     return;
  //   }

  //   const leavingUser = await this.userService.getUserDetails(userId);
  //   if (!leavingUser) {
  //     console.warn(
  //       `User ${userId} attempted to leave room ${roomId} but was not a member.`
  //     );
  //     this.userSocketRepo.removeUserSocket(userId);
  //     return;
  //   }

  //   await this.roomService.removeUserFromRoom(roomId, userId);
  //   const isHostLeaving = leavingUser.type === UserType.HOST;

  //   if (isHostLeaving) {
  //     this.notifyHostClosed(roomId);
  //     const allUserIdsForRoom = await this.roomService.getUserIdsForRoom(
  //       roomId
  //     );
  //     this.userSocketRepo.removeMultipleUserSockets(allUserIdsForRoom);
  //     this.roomService.deleteRoom(roomId);
  //     console.log(`Host ${userId} closed room ${roomId}`);
  //   }

  //   // Remove empty rooms
  //   if ((await this.roomService.getUserCountForRoom(roomId)) === 0) {
  //     this.roomService.deleteRoom(roomId);
  //     this.roomService.removeAllPendingGuestsForRoom(roomId);
  //   } else {
  //     this.roomService.updateRoom(room);

  //     // Notify remaining users
  //     const userLeftMessage: UserLeftMessage = {
  //       type: "user-left",
  //       roomId,
  //       userId,
  //     };
  //     await this.broadcastToRoom(roomId, userLeftMessage);
  //   }

  //   this.userSocketRepo.removeUserSocket(userId);
  //   console.log(`User ${userId} left room ${roomId}`);
  // }
}

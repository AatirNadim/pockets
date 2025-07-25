import { WebSocketServer, WebSocket } from "ws";
import {
  WebSocketMessage,
  Room,
  User,
  JoinRoomMessage,
  LeaveRoomMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  UserJoinedMessage,
  UserLeftMessage,
} from "../shared/types";

const PORT = Number(process.env.PORT) || 8080;

// // Extend WebSocket type to include custom properties
interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  roomId?: string;
}

// // In-memory storage (use Redis in production)
const rooms = new Map<string, Room>();
const userSockets = new Map<string, ExtendedWebSocket>();

const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 Signaling server running on port ${PORT}`);

wss.on("connection", (ws: ExtendedWebSocket) => {
  console.debug("New client connected");

  ws.on("message", (data) => {
    console.debug("Received message");
    try {
      const message = JSON.parse(data.toString());
      console.info("Parsed message:", message);
      handleMessage(ws, message as WebSocketMessage);
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  ws.on("close", () => {
    console.debug("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

const handleMessage = (ws: ExtendedWebSocket, message: WebSocketMessage) => {
  try {
    switch (message.type) {
      case "join-room":
        joinRoom(ws, message);
        break;
      case "leave-room":
        console.log(
          "received message to leave the room with id:",
          message.roomId
        );
        handleLeaveRoom(ws, message);
        break;
      case "offer":
        handleOffer(message);
        break;
      case "answer":
        handleAnswer(message);
        break;
      case "ice-candidate":
        handleIceCandidate(message);
        break;
      default:
        console.warn("Unknown message type:", message.type);
        throw new Error(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error("Error handling message:", error);
    const errorMessage = {
      type: "error",
      message: "An error occurred while processing your request.",
    };
    ws.send(JSON.stringify(errorMessage));
  } finally {
    console.log("\nroom details:", Array.from(rooms.keys()));
    console.log("user sockets:", Array.from(userSockets.keys()), "\n");
  }
};

const joinRoom = (ws: ExtendedWebSocket, message: JoinRoomMessage) => {
  const { roomId, userId, userName } = message;

  const user: User = {
    id: userId,
    name: userName,
  };

  ws.userId = userId;

  ws.roomId = roomId;
  userSockets.set(userId, ws);

  const room = rooms.get(roomId) || { id: roomId, users: [] };
  if (!room.users.find((u) => u.id === userId)) {
    room.users.push(user);
  }

  rooms.set(roomId, room);

  broadcastToRoom(roomId, {
    roomId,
    type: "user-joined",
    user,
  } as UserJoinedMessage);
};

const broadcastToRoom = (roomId: string, message: WebSocketMessage) => {
  try {
    const room = rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with ID ${roomId} does not exist.`);
    }
    // for now, send user-join notification to all users in the room
    room.users.forEach((user) => {
      // if(user.id === message..id)
      const socket = userSockets.get(user.id);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    });
  } catch (error) {
    console.error("Error broadcasting message:", error);
    throw error;
  }
};

// const leaveRoom = (ws: ExtendedWebSocket, message: LeaveRoomMessage) => {
//   const { roomId, userId } = message;
// };

const handleOffer = (message: OfferMessage) => {
  const { toUserId } = message;
  const targetSocket = userSockets.get(toUserId);

  if (targetSocket) {
    targetSocket.send(JSON.stringify(message));
  }
};

const handleAnswer = (message: AnswerMessage) => {
  const { toUserId } = message;
  const targetSocket = userSockets.get(toUserId);

  if (targetSocket) {
    targetSocket.send(JSON.stringify(message));
  }
};

const handleIceCandidate = (message: IceCandidateMessage) => {
  const { toUserId } = message;
  const targetSocket = userSockets.get(toUserId);

  if (targetSocket) {
    targetSocket.send(JSON.stringify(message));
  }
};

function handleLeaveRoom(ws: ExtendedWebSocket, message: LeaveRoomMessage) {
  const { roomId, userId } = message;

  const room = rooms.get(roomId);
  if (room) {
    room.users = room.users.filter((u) => u.id !== userId);

    // Remove empty rooms
    if (room.users.length === 0) {
      rooms.delete(roomId);
    } else {
      room.users = room.users.filter((u) => u.id !== userId);

      rooms.set(roomId, room);

      // Notify remaining users
      const userLeftMessage: UserLeftMessage = {
        type: "user-left",
        roomId,
        userId,
        users: room.users,
      };
      broadcastToRoom(roomId, userLeftMessage);
    }
  }

  userSockets.delete(userId);

  console.log(`User ${userId} left room ${roomId}`);
}

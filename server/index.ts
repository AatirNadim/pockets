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
        leaveRoom(ws, message);
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

  console.log("\nuser", userId, "joined room", roomId);
  console.info(`Current users in room: ${roomId}, are ${Array.from(userSockets.keys())}`);
  console.info("Rooms :", rooms, "\n");

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

const leaveRoom = (ws: ExtendedWebSocket, message: LeaveRoomMessage) => {
  const { roomId, userId } = message;
};

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

// wss.on('connection', (ws: ExtendedWebSocket) => {
//   console.log('New client connected');

//   ws.on('message', (data: Buffer) => {
//     try {
//       const message: WebSocketMessage = JSON.parse(data.toString());
//       handleMessage(ws, message);
//     } catch (error) {
//       console.error('Error parsing message:', error);
//       sendError(ws, 'Invalid message format');
//     }
//   });

//   ws.on('close', () => {
//     console.log('Client disconnected');
//     handleDisconnect(ws);
//   });

//   ws.on('error', (error: Error) => {
//     console.error('WebSocket error:', error);
//   });
// });

// function handleMessage(ws: ExtendedWebSocket, message: WebSocketMessage) {
//   switch (message.type) {
//     case 'join-room':
//       handleJoinRoom(ws, message);
//       break;
//     case 'leave-room':
//       handleLeaveRoom(ws, message);
//       break;
//     case 'offer':
//       handleOffer(message);
//       break;
//     case 'answer':
//       handleAnswer(message);
//       break;
//     case 'ice-candidate':
//       handleIceCandidate(message);
//       break;
//     default:
//       sendError(ws, 'Unknown message type');
//   }
// }

// function handleJoinRoom(ws: ExtendedWebSocket, message: JoinRoomMessage) {
//   const { roomId, userId, userName } = message;

//   // Create user
//   const user: User = {
//     id: userId,
//     name: userName
//   };

//   // Store user socket
//   userSockets.set(userId, ws);
//   ws.userId = userId;
//   ws.roomId = roomId;

//   // Get or create room
//   let room = rooms.get(roomId);
//   if (!room) {
//     room = {
//       id: roomId,
//       users: []
//     };
//     rooms.set(roomId, room);
//   }

//   // Add user to room if not already present
//   if (!room.users.find(u => u.id === userId)) {
//     room.users.push(user);
//   }

//   console.log(`User ${userId} joined room ${roomId}`);

//   // Notify all users in the room
//   const userJoinedMessage: UserJoinedMessage = {
//     type: 'user-joined',
//     roomId,
//     user,
//     users: room.users
//   };
//   broadcastToRoom(roomId, userJoinedMessage);
// }

// function handleLeaveRoom(ws: ExtendedWebSocket, message: LeaveRoomMessage) {
//   const { roomId, userId } = message;

//   const room = rooms.get(roomId);
//   if (room) {
//     room.users = room.users.filter(u => u.id !== userId);

//     // Remove empty rooms
//     if (room.users.length === 0) {
//       rooms.delete(roomId);
//     } else {
//       // Notify remaining users
//       const userLeftMessage: UserLeftMessage = {
//         type: 'user-left',
//         roomId,
//         userId,
//         users: room.users
//       };
//       broadcastToRoom(roomId, userLeftMessage);
//     }
//   }

//   userSockets.delete(userId);
//   console.log(`User ${userId} left room ${roomId}`);
// }

// function handleOffer(message: OfferMessage) {
//   const { toUserId } = message;
//   const targetSocket = userSockets.get(toUserId);

//   if (targetSocket) {
//     targetSocket.send(JSON.stringify(message));
//   }
// }

// function handleAnswer(message: AnswerMessage) {
//   const { toUserId } = message;
//   const targetSocket = userSockets.get(toUserId);

//   if (targetSocket) {
//     targetSocket.send(JSON.stringify(message));
//   }
// }

// function handleIceCandidate(message: IceCandidateMessage) {
//   const { toUserId } = message;
//   const targetSocket = userSockets.get(toUserId);

//   if (targetSocket) {
//     targetSocket.send(JSON.stringify(message));
//   }
// }

// function handleDisconnect(ws: ExtendedWebSocket) {
//   if (ws.userId && ws.roomId) {
//     const leaveMessage: LeaveRoomMessage = {
//       type: 'leave-room',
//       roomId: ws.roomId,
//       userId: ws.userId
//     };
//     handleLeaveRoom(ws, leaveMessage);
//   }
// }

// function broadcastToRoom(roomId: string, message: WebSocketMessage) {
//   const room = rooms.get(roomId);
//   if (room) {
//     room.users.forEach(user => {
//       const socket = userSockets.get(user.id);
//       if (socket) {
//         socket.send(JSON.stringify(message));
//       }
//     });
//   }
// }

// function sendError(ws: ExtendedWebSocket, message: string) {
//   const errorMessage = {
//     type: 'error' as const,
//     message
//   };
//   ws.send(JSON.stringify(errorMessage));
// }

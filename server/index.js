"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
var PORT = Number(process.env.PORT) || 8080;
// // In-memory storage (use Redis in production)
var rooms = new Map();
var userSockets = new Map();
var wss = new ws_1.WebSocketServer({ port: PORT });
console.log("\uD83D\uDE80 Signaling server running on port ".concat(PORT));
wss.on("connection", function (ws) {
    console.debug("New client connected");
    ws.on("message", function (data) {
        console.debug("Received message");
        try {
            var message = JSON.parse(data.toString());
            console.info("Parsed message:", message);
            handleMessage(ws, message);
        }
        catch (error) {
            console.error("Error parsing message:", error);
        }
    });
    ws.on("close", function () {
        console.debug("Client disconnected");
    });
    ws.on("error", function (error) {
        console.error("WebSocket error:", error);
    });
});
var handleMessage = function (ws, message) {
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
                throw new Error("Unknown message type: ".concat(message.type));
        }
    }
    catch (error) {
        console.error("Error handling message:", error);
        var errorMessage = {
            type: "error",
            message: "An error occurred while processing your request.",
        };
        ws.send(JSON.stringify(errorMessage));
    }
};
var joinRoom = function (ws, message) {
    var roomId = message.roomId, userId = message.userId, userName = message.userName;
    var user = {
        id: userId,
        name: userName,
    };
    ws.userId = userId;
    ws.roomId = roomId;
    userSockets.set(userId, ws);
    var room = rooms.get(roomId) || { id: roomId, users: [] };
    if (!room.users.find(function (u) { return u.id === userId; })) {
        room.users.push(user);
    }
    rooms.set(roomId, room);
    broadcastToRoom(roomId, {
        roomId: roomId,
        type: "user-joined",
        user: user,
    });
};
var broadcastToRoom = function (roomId, message) {
    try {
        var room = rooms.get(roomId);
        if (!room) {
            throw new Error("Room with ID ".concat(roomId, " does not exist."));
        }
        // for now, send user-join notification to all users in the room
        room.users.forEach(function (user) {
            // if(user.id === message..id)
            var socket = userSockets.get(user.id);
            if (socket && socket.readyState === ws_1.WebSocket.OPEN) {
                socket.send(JSON.stringify(message));
            }
        });
    }
    catch (error) {
        console.error("Error broadcasting message:", error);
        throw error;
    }
};
var leaveRoom = function (ws, message) {
    var roomId = message.roomId, userId = message.userId;
};
var handleOffer = function (message) {
    var toUserId = message.toUserId;
    var targetSocket = userSockets.get(toUserId);
    if (targetSocket) {
        targetSocket.send(JSON.stringify(message));
    }
};
var handleAnswer = function (message) {
    var toUserId = message.toUserId;
    var targetSocket = userSockets.get(toUserId);
    if (targetSocket) {
        targetSocket.send(JSON.stringify(message));
    }
};
var handleIceCandidate = function (message) {
    var toUserId = message.toUserId;
    var targetSocket = userSockets.get(toUserId);
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

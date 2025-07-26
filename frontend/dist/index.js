import { WebSocketServer, WebSocket } from "ws";
const PORT = Number(process.env.PORT) || 8080;
// // In-memory storage (use Redis in production)
const rooms = new Map();
const userSockets = new Map();
const wss = new WebSocketServer({ port: PORT });
console.log(`🚀 Signaling server running on port ${PORT}`);
wss.on("connection", (ws) => {
    console.debug("New client connected");
    ws.on("message", (data) => {
        console.debug("Received message");
        try {
            const message = JSON.parse(data.toString());
            console.info("Parsed message:", message);
            handleMessage(ws, message);
        }
        catch (error) {
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
const handleMessage = (ws, message) => {
    try {
        switch (message.type) {
            case "join-room":
                joinRoom(ws, message);
                break;
            case "leave-room":
                console.log("received message to leave the room with id:", message.roomId, "by the user id: ", message.userId);
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
    }
    catch (error) {
        console.error("Error handling message:", error);
        const errorMessage = {
            type: "error",
            message: "An error occurred while processing your request.",
        };
        ws.send(JSON.stringify(errorMessage));
    }
    finally {
        console.log("\nroom details:", Array.from(rooms.keys()));
        console.log("user sockets:", Array.from(userSockets.keys()), "\n");
    }
};
const joinRoom = (ws, message) => {
    const { roomId, userId, userName } = message;
    const user = {
        id: userId,
        name: userName,
    };
    ws.userId = userId;
    ws.roomId = roomId;
    userSockets.set(userId, ws);
    let room = rooms.get(roomId);
    if (!room) {
        console.log("No existing room with the id:", roomId, "creating a new room");
        room = { id: roomId, users: [] };
    }
    if (!room.users.find((u) => u.id === userId)) {
        room.users.push(user);
    }
    else {
        console.log("User already in room:", userId);
        return;
    }
    rooms.set(roomId, room);
    broadcastToRoom(roomId, {
        roomId,
        type: "user-joined",
        userId,
    });
};
const sendSocketMessageUtil = (userIds, message) => {
    userIds.forEach((userId) => {
        const userSocket = userSockets.get(userId);
        if (userSocket && userSocket.readyState === WebSocket.OPEN) {
            userSocket.send(JSON.stringify(message));
        }
        else {
            console.warn(`Socket for user ${userId} is not available or not ready.`);
            throw new Error(`Socket for user ${userId} is not available or not ready.`);
        }
    });
};
const broadcastToRoom = (roomId, message) => {
    try {
        const room = rooms.get(roomId);
        if (!room) {
            throw new Error(`Room with ID ${roomId} does not exist.`);
        }
        // for now, send user-join notification to all users in the room
        switch (message.type) {
            case "user-joined":
                console.log(`Broadcasting user-joined message to room ${roomId}`);
                sendSocketMessageUtil(room.users.filter((u) => u.id !== message.userId).map((u) => u.id), message);
                break;
            case "user-left":
                console.log(`Broadcasting user-left message to room ${roomId}`);
                sendSocketMessageUtil(room.users.filter((u) => u.id !== message.userId).map((u) => u.id), message);
                break;
            case "offer":
                console.log(`Broadcasting offer message to room ${roomId}`);
                sendSocketMessageUtil(room.users.filter((u) => u.id === message.toUserId).map((u) => u.id), message);
                break;
            case "answer":
                console.log(`Broadcasting answer message to room ${roomId}`);
                sendSocketMessageUtil(room.users.filter((u) => u.id === message.toUserId).map((u) => u.id), message);
                break;
            case "ice-candidate":
                console.log(`Broadcasting ice-candidate message to room ${roomId}`);
                sendSocketMessageUtil(room.users.filter((u) => u.id === message.toUserId).map((u) => u.id), message);
                break;
            default:
                console.warn(`Broadcasting unknown message type ${message.type} to room ${roomId}`);
                throw new Error(`Unknown message type: ${message.type} for room ${roomId}`);
        }
    }
    catch (error) {
        console.error("Error broadcasting message:", error);
        throw error;
    }
};
// const leaveRoom = (ws: ExtendedWebSocket, message: LeaveRoomMessage) => {
//   const { roomId, userId } = message;
// };
const handleOffer = (message) => {
    const { toUserId } = message;
    const targetSocket = userSockets.get(toUserId);
    console.debug("Sending offer to user:", toUserId, "message:", message);
    targetSocket?.send(JSON.stringify(message));
};
const handleAnswer = (message) => {
    const { toUserId } = message;
    const targetSocket = userSockets.get(toUserId);
    console.debug("Sending answer to user:", toUserId, "message:", message);
    targetSocket?.send(JSON.stringify(message));
};
const handleIceCandidate = (message) => {
    const { toUserId } = message;
    const targetSocket = userSockets.get(toUserId);
    if (targetSocket) {
        targetSocket.send(JSON.stringify(message));
    }
};
function handleLeaveRoom(ws, message) {
    const { roomId, userId } = message;
    const room = rooms.get(roomId);
    if (!room) {
        console.warn(`Room with ID ${roomId} does not exist.`);
        return;
    }
    room.users = room.users.filter((u) => u.id !== userId);
    // Remove empty rooms
    if (room.users.length === 0) {
        rooms.delete(roomId);
    }
    else {
        room.users = room.users.filter((u) => u.id !== userId);
        rooms.set(roomId, room);
        // Notify remaining users
        const userLeftMessage = {
            type: "user-left",
            roomId,
            userId,
        };
        broadcastToRoom(roomId, userLeftMessage);
    }
    userSockets.delete(userId);
    console.log(`User ${userId} left room ${roomId}`);
}
//# sourceMappingURL=index.js.map
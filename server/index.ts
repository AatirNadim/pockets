import { createServer } from "http";
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
  ErrorMessage,
  ExtendedWebSocket,
} from "./util/types";
import { PORT } from "./util/constants";
import { SocketService } from "./util/socket";

const socketService = new SocketService();

const httpServer = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

const wss = new WebSocketServer({ server: httpServer });

httpServer.listen(PORT, () => {
  console.log(`🚀 Signaling server (HTTP + WS) running on port ${PORT}`);
  console.log(`   • Health check: http://localhost:${PORT}/health`);
});

const registerSocketEventListeners = (ws: ExtendedWebSocket) => {
  // @ts-expect-error
  ws.on("message", (data) => {
    console.debug("Received message");
    try {
      const message = JSON.parse(data.toString());
      console.info("Parsed message:", message);
      socketService.handleMessage(ws, message as WebSocketMessage);
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  // @ts-expect-error
  ws.on("close", () => {
    console.debug("Client disconnected");
  });

  // @ts-expect-error
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
};

wss.on("connection", (ws: ExtendedWebSocket) => {
  console.debug("New client connected");
  registerSocketEventListeners(ws);
});

const gracefulShutdown = () => {
  console.log("Server shutting down gracefully...");

  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1001, "Server restarting");
    }
  });

  // Close the WebSocket server
  wss.close(() => {
    console.log("WebSocket server closed");
    httpServer.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
};

// Handle different termination signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle process restart (for development)
process.on("SIGUSR2", gracefulShutdown); // nodemon sends this signal

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown();
});

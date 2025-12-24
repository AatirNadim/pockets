import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

import { SocketService } from "./src/services/socket.service";
import { createPersistenceClient } from "./src/repo/persistence/create-persistence";
import { WebSocketMessage } from "@pockets/shared";
import dotenv from "dotenv";

dotenv.config(
  process.env.NODE_ENV !== "production" ? { path: ".env.local" } : undefined
);

const persistence = await createPersistenceClient();
const socketService = new SocketService(persistence);

const registerSocketEventListeners = (ws: WebSocket) => {
  ws.onmessage = async (event) => {
    console.debug("Received message");
    try {
      const message = JSON.parse(event.data.toString());
      console.info("Parsed message:", message);
      await socketService.handleMessage(ws, message as WebSocketMessage);
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };

  ws.onclose = () => {
    console.debug("Client disconnected");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
};

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

wss.on("connection", (ws: WebSocket) => {
  console.debug("New client connected");
  registerSocketEventListeners(ws);
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

httpServer.listen(PORT, () => {
  console.log(`🚀 Signaling server (HTTP + WS) running on port ${PORT}`);
  console.log(`   • Health check: http://localhost:${PORT}/health`);
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

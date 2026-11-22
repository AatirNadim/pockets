import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

import { SocketService } from "./src/services/socket.service";
import { createPersistenceClient } from "./src/repo/persistence/create-persistence";
import dotenv from "dotenv";

dotenv.config(
  process.env.NODE_ENV !== "production" ? { path: ".env.local" } : undefined
);

const persistence = await createPersistenceClient();
const socketService = new SocketService(persistence);

const registerSocketEventListeners = (ws: WebSocket) => {
  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data.toString());
      await socketService.handleMessage(ws, message as unknown);
    } catch {
      ws.close(1007, "Invalid JSON");
    }
  };

  ws.onclose = () => {
    void socketService.disconnect(ws).catch((error) => {
      console.error("Session cleanup failed:", error instanceof Error ? error.message : "unknown error");
    });
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

const wss = new WebSocketServer({ server: httpServer, maxPayload: 64 * 1024, perMessageDeflate: false });

wss.on("connection", (ws: WebSocket) => {
  registerSocketEventListeners(ws);
});

const heartbeat = setInterval(() => {
  void socketService.touchActiveRooms().catch((error) => {
    console.error("Room heartbeat failed:", error instanceof Error ? error.message : "unknown error");
  });
  for (const client of wss.clients) {
    const liveClient = client as WebSocket & { isAlive?: boolean };
    if (liveClient.isAlive === false) {
      liveClient.terminate();
      continue;
    }
    liveClient.isAlive = false;
    liveClient.ping();
  }
}, 30_000);
wss.on("connection", (socket) => {
  const liveSocket = socket as WebSocket & { isAlive?: boolean };
  liveSocket.isAlive = true;
  liveSocket.on("pong", () => { liveSocket.isAlive = true; });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

httpServer.listen(PORT, () => {
  console.log(`🚀 Signaling server (HTTP + WS) running on port ${PORT}`);
  console.log(`   • Health check: http://localhost:${PORT}/health`);
});

let shuttingDown = false;
const gracefulShutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("Server shutting down gracefully...");
  clearInterval(heartbeat);
  void socketService.shutdown().finally(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.close(1001, "Server restarting");
    });
    wss.close(() => {
      httpServer.close(() => process.exit(0));
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

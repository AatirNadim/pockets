import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

import { WebSocketMessage, ExtendedWebSocket } from "./util/types";
import { PORT } from "./util/constants";
import { SocketService } from "./services/socket.service";

const socketService = new SocketService();

const registerSocketEventListeners = (ws: ExtendedWebSocket) => {
  ws.onmessage = (event) => {
    console.debug("Received message");
    try {
      const message = JSON.parse(event.data.toString());
      console.info("Parsed message:", message);
      socketService.handleMessage(ws, message as WebSocketMessage);
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

wss.on("connection", (ws: ExtendedWebSocket) => {
  console.debug("New client connected");
  registerSocketEventListeners(ws);
});

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

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import redis from "./redis.js";
import { sessionMiddleware } from "../index.js";

let pubClient, subClient;
export let io = null;

export async function createSocketServer(server) {
  if (!pubClient || !subClient) {
    pubClient = redis.duplicate();
    subClient = redis.duplicate();

    if (!pubClient.status || pubClient.status === "end") {
      await pubClient.connect();
    }
    if (!subClient.status || subClient.status === "end") {
      await subClient.connect();
    }
  }

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", (socket) => {
    const session = socket.request.session;

    if (!session || !session.userId) {
      console.warn("Unauthenticated socket connection");
      return socket.disconnect(true);
    }

    const userId = session.userId;

    socket.join(userId);
    console.log(`Socket connected: ${userId}`);
  });

  return io;
}

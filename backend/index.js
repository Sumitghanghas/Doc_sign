import { createServer } from 'http';
import argvMap from './app/libs/argvMap.js';
import './app/config/env.js'; 
import mongoose from './app/config/mongoose.js';
import app, { sessionMiddleware } from './app/index.js';
import { createSocketServer } from './app/config/socket.js';
import { setIO } from './app/utils/io.js'; 

const server = createServer(app);

const startServer = async () => {
  try {
    const io = await createSocketServer(server);

    setIO(io); 

    io.engine.use(sessionMiddleware);

    const port = argvMap.get('port') ?? 3000;

    server.listen(port, () => {
      console.info(`Server started on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();

export default server;

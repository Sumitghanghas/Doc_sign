let io = null;

export const setIO = (ioInstance) => {
  io = ioInstance;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

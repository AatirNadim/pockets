const PORT = Number(process.env.SERVER_PORT) || 8080;

const MAX_USERS_PER_ROOM = 6;

enum UserType {
  HOST = "host",
  GUEST = "guest",
}

export { PORT, MAX_USERS_PER_ROOM, UserType };

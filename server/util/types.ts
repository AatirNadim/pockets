import { UserType } from "@pockets/shared";

export interface ExtendedWebSocket extends WebSocket {
  userId: string;
  roomId: string;
  userName: string;
  userType: UserType;
}

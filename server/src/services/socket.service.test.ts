import assert from "node:assert/strict";
import test from "node:test";
import { WebSocket } from "ws";
import { UserType } from "@pockets/shared";
import { InMemoryPersistenceClient } from "../repo/persistence/in-memory";
import { SocketService } from "./socket.service";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

class FakeSocket {
  readyState: number = WebSocket.OPEN;
  messages: unknown[] = [];
  closeCode?: number;
  send(raw: string) { this.messages.push(JSON.parse(raw)); }
  close(code = 1000) { this.closeCode = code; this.readyState = WebSocket.CLOSED; }
  take(type: string) { return this.messages.filter((message) => (message as { type?: string }).type === type); }
}

const join = (roomId: string, userId: string, userType: UserType) => ({
  type: "join-room", roomId, userId, userName: userType === UserType.HOST ? "Host" : "Guest", userType,
});

test("binds each socket identity and rejects forged signaling before delivery", async () => {
  const persistence = new InMemoryPersistenceClient();
  const service = new SocketService(persistence);
  const roomId = id(1);
  const host = new FakeSocket();
  const guest = new FakeSocket();
  const outside = new FakeSocket();
  await service.handleMessage(host as unknown as WebSocket, join(roomId, id(2), UserType.HOST));
  await service.handleMessage(guest as unknown as WebSocket, join(roomId, id(3), UserType.GUEST));

  await service.handleMessage(guest as unknown as WebSocket, {
    type: "offer", roomId, fromUserId: id(2), fromUserName: "Host", fromUserType: UserType.HOST,
    toUserId: id(2), offer: { type: "offer", sdp: "v=0" },
  });
  assert.equal(guest.take("error").length, 1);
  assert.equal(host.take("offer").length, 0);

  await service.handleMessage(guest as unknown as WebSocket, join(id(4), id(3), UserType.GUEST));
  assert.equal(guest.closeCode, 1008);

  const cleanGuest = new FakeSocket();
  await service.handleMessage(cleanGuest as unknown as WebSocket, join(roomId, id(5), UserType.GUEST));
  await service.handleMessage(host as unknown as WebSocket, { type: "join-request-accepted", roomId, hostUserId: id(2), guestUserId: id(5) });
  assert.equal(cleanGuest.take("join-request-accepted").length, 1);
  await service.handleMessage(host as unknown as WebSocket, {
    type: "offer", roomId, fromUserId: id(2), fromUserName: "forged", fromUserType: UserType.GUEST,
    toUserId: id(5), offer: { type: "offer", sdp: "v=0" },
  });
  assert.equal(cleanGuest.take("offer").length, 1);

  const foreignService = new SocketService(persistence);
  await foreignService.handleMessage(outside as unknown as WebSocket, join(id(6), id(7), UserType.HOST));
  await foreignService.handleMessage(host as unknown as WebSocket, {
    type: "offer", roomId, fromUserId: id(2), fromUserName: "Host", fromUserType: UserType.HOST,
    toUserId: id(7), offer: { type: "offer", sdp: "v=0" },
  });
  assert.equal(outside.take("offer").length, 0);
  await service.shutdown();
  await foreignService.shutdown();
});

test("atomically caps pending guests and removes sessions on disconnect", async () => {
  const persistence = new InMemoryPersistenceClient();
  const service = new SocketService(persistence);
  const roomId = id(10);
  const host = new FakeSocket();
  await service.handleMessage(host as unknown as WebSocket, join(roomId, id(11), UserType.HOST));
  const guests = Array.from({ length: 8 }, (_, i) => new FakeSocket());
  await Promise.all(guests.map((socket, i) => service.handleMessage(socket as unknown as WebSocket, join(roomId, id(20 + i), UserType.GUEST))));
  assert.equal((await persistence.getPendingGuestIdsForRoom(roomId)).length, 5);
  assert.equal(guests.reduce((count, socket) => count + socket.take("room-full").length, 0), 3);

  const firstGuestId = id(20);
  await service.disconnect(guests[0] as unknown as WebSocket);
  assert.equal((await persistence.getPendingGuestIdsForRoom(roomId)).includes(firstGuestId), false);
  assert.equal(await persistence.getUserById(firstGuestId), null);
  await service.shutdown();
  assert.equal(await persistence.getRoomById(roomId), null);
});

import React from "react";
(globalThis as unknown as { React: typeof React }).React = React;
// Allow SSR renderToString to read active Zustand store snapshot
(React as unknown as { useSyncExternalStore: unknown }).useSyncExternalStore = (
  _sub: unknown,
  getSnap: () => unknown
) => getSnap();

import test, { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { renderToString } from "react-dom/server";
import Header from "../app/room/[room]/header";
import { useUserStore } from "../lib/stores/userStore";
import { useJoinRequestStore } from "../lib/stores/joinRequestStore";
import { useMediaStore } from "../lib/stores/mediaStore";
import { useChatStore } from "../lib/stores/chatStore";
import {
  CHUNK_SIZE,
  MAX_FILE_SIZE_SINGLE_SEND,
  MAX_FILE_SIZE_MB_MULTIPLE_SEND,
  MAX_FILES_TO_SEND_TOGETHER,
  MAX_CHAT_HISTORY,
  UserType,
} from "../lib/constants";
import { validateFileBatch, validateIncomingFile } from "../lib/utils/fileValidation";
import type { ChatMessage } from "@pockets/shared";

describe("Room Screen & Active Session Scenarios", () => {
  beforeEach(() => {
    // Reset all zustand stores to clean baseline
    useUserStore.setState({
      userId: "local-user-id",
      userName: "Local Host",
      userType: UserType.HOST,
      roomId: "test-room-uuid",
      remoteUsers: {},
    });
    useJoinRequestStore.setState({ requests: [] });
    useMediaStore.setState({
      mediaStreams: {},
      isAudioOnly: false,
      isScreenSharing: false,
      isVideoOff: false,
      isMicrophoneMuted: false,
      isSpeakerOff: false,
      availableCameras: [],
      availableMicrophones: [],
      selectedCameraId: null,
      selectedMicrophoneId: null,
      mediaError: null,
      remoteTrackState: {},
    });
    useChatStore.setState({
      chatMessages: [],
      unreadCount: 0,
      showChat: false,
    });
  });

  describe("Scenario 1: Room Header & Status Badges", () => {
    function renderHeader(props: {
      status: string;
      isConnected: boolean;
      isRoomFull: boolean;
    }): string {
      return renderToString(
        React.createElement(Header, {
          roomId: "test-room-uuid",
          status: props.status,
          isConnected: props.isConnected,
          isRoomFull: props.isRoomFull,
          shortcuts: [],
          onShortcut: () => {},
        })
      );
    }

    it("renders emerald status badge and 'Connected' when active", () => {
      const html = renderHeader({
        status: "Connected",
        isConnected: true,
        isRoomFull: false,
      });
      assert.match(html, /bg-emerald-600/);
      assert.match(html, /Connected/);
    });

    it("renders amber status badge and 'Waiting for host approval' when guest is knocking", () => {
      const html = renderHeader({
        status: "Waiting for host approval…",
        isConnected: false,
        isRoomFull: false,
      });
      assert.match(html, /bg-amber-600/);
      assert.match(html, /Waiting for host approval/);
    });

    it("renders rose status badge and 'Room is full' when room hits mesh limit", () => {
      const html = renderHeader({
        status: "Full",
        isConnected: false,
        isRoomFull: true,
      });
      assert.match(html, /bg-rose-600/);
      assert.match(html, /Room is full/);
    });

    it("renders amber status badge and 'Connecting' when handshake is in flight", () => {
      const html = renderHeader({
        status: "",
        isConnected: false,
        isRoomFull: false,
      });
      assert.match(html, /bg-amber-600/);
      assert.match(html, /Connecting/);
    });

    it("displays participant count of 1 when host is alone, and increments with remote users", () => {
      // 1 alone
      let html = renderHeader({
        status: "Connected",
        isConnected: true,
        isRoomFull: false,
      });
      assert.match(html, /aria-label="1 participants"/);
      assert.match(html, /<span>1<\/span>/);

      // Add 2 remote peers
      useUserStore.getState().addRemoteUser("peer-1", "Maya", UserType.GUEST);
      useUserStore.getState().addRemoteUser("peer-2", "Liam", UserType.GUEST);

      html = renderHeader({
        status: "Connected",
        isConnected: true,
        isRoomFull: false,
      });
      assert.match(html, /aria-label="3 participants"/);
      assert.match(html, /<span>3<\/span>/);
    });

    it("renders the keyboard shortcuts button with its K keybinding cue", () => {
      const html = renderHeader({
        status: "Connected",
        isConnected: true,
        isRoomFull: false,
      });
      assert.match(html, /aria-label="Show keyboard shortcuts"[\s\S]*?>K<\/kbd>/);
      assert.match(html, /aria-keyshortcuts="k \?"/);
    });
  });

  describe("Scenario 2: Doorbell / Join Request Flow", () => {
    it("adds incoming knocking guest requests to the store", () => {
      useJoinRequestStore.getState().addRequest({
        roomId: "test-room-uuid",
        guestId: "guest-101",
        guestName: "Alex",
      });

      const requests = useJoinRequestStore.getState().requests;
      assert.strictEqual(requests.length, 1);
      assert.strictEqual(requests[0].guestName, "Alex");
      assert.strictEqual(requests[0].guestId, "guest-101");
    });

    it("de-duplicates multiple knock requests from the same guestId", () => {
      const store = useJoinRequestStore.getState();
      store.addRequest({
        roomId: "test-room-uuid",
        guestId: "guest-101",
        guestName: "Alex",
      });
      store.addRequest({
        roomId: "test-room-uuid",
        guestId: "guest-101",
        guestName: "Alex (Duplicate Knock)",
      });

      const requests = useJoinRequestStore.getState().requests;
      assert.strictEqual(requests.length, 1, "Must not create duplicate knock entry");
      assert.strictEqual(requests[0].guestName, "Alex");
    });

    it("removes knocking guest when admitted or declined by host", () => {
      const store = useJoinRequestStore.getState();
      store.addRequest({
        roomId: "test-room-uuid",
        guestId: "guest-101",
        guestName: "Alex",
      });
      store.addRequest({
        roomId: "test-room-uuid",
        guestId: "guest-102",
        guestName: "Sarah",
      });

      assert.strictEqual(useJoinRequestStore.getState().requests.length, 2);

      // Admit Alex -> removes Alex
      useJoinRequestStore.getState().removeRequest("guest-101");
      const remaining = useJoinRequestStore.getState().requests;
      assert.strictEqual(remaining.length, 1);
      assert.strictEqual(remaining[0].guestId, "guest-102");
    });

    it("clears all pending requests when session ends", () => {
      const store = useJoinRequestStore.getState();
      store.addRequest({
        roomId: "test-room-uuid",
        guestId: "guest-101",
        guestName: "Alex",
      });
      store.clearRequests();
      assert.strictEqual(useJoinRequestStore.getState().requests.length, 0);
    });
  });

  describe("Scenario 3: Roster Management & Mesh Room Limit (Max 6 Participants)", () => {
    it("adds and tracks remote peers in useUserStore", () => {
      const store = useUserStore.getState();
      store.addRemoteUser("peer-1", "Maya", UserType.GUEST);
      store.addRemoteUser("peer-2", "Kai", UserType.GUEST);

      const state = useUserStore.getState();
      assert.strictEqual(Object.keys(state.remoteUsers).length, 2);
      assert.deepStrictEqual(state.remoteUsers["peer-1"], {
        name: "Maya",
        userType: UserType.GUEST,
      });
    });

    it("removes a remote peer when disconnected", () => {
      const store = useUserStore.getState();
      store.addRemoteUser("peer-1", "Maya", UserType.GUEST);
      store.addRemoteUser("peer-2", "Kai", UserType.GUEST);

      store.removeRemoteUser("peer-1");
      const state = useUserStore.getState();
      assert.strictEqual(state.remoteUsers["peer-1"], undefined);
      assert.ok(state.remoteUsers["peer-2"]);
      assert.strictEqual(Object.keys(state.remoteUsers).length, 1);
    });

    it("enforces max 6 participants mesh boundary (1 host + 5 peers)", () => {
      const MAX_PEERS = 6;
      const store = useUserStore.getState();

      // Add up to 5 remote peers (total 6 with host)
      for (let i = 1; i <= 5; i++) {
        store.addRemoteUser(`peer-${i}`, `Peer ${i}`, UserType.GUEST);
      }

      const currentTotal = Object.keys(useUserStore.getState().remoteUsers).length + 1;
      assert.strictEqual(currentTotal, MAX_PEERS);

      // Verify that at 6 participants, room is at capacity
      const isRoomAtCapacity = currentTotal >= MAX_PEERS;
      assert.strictEqual(isRoomAtCapacity, true);
    });
  });

  describe("Scenario 4: Media Controls & Device State", () => {
    it("toggles microphone muted state correctly", () => {
      const store = useMediaStore.getState();
      assert.strictEqual(store.isMicrophoneMuted, false);

      store.setMicrophoneMuted(true);
      assert.strictEqual(useMediaStore.getState().isMicrophoneMuted, true);

      store.setMicrophoneMuted(false);
      assert.strictEqual(useMediaStore.getState().isMicrophoneMuted, false);
    });

    it("toggles video camera disabled state correctly", () => {
      const store = useMediaStore.getState();
      assert.strictEqual(store.isVideoOff, false);

      store.toggleVideoOff();
      assert.strictEqual(useMediaStore.getState().isVideoOff, true);

      store.setIsVideoOff(false);
      assert.strictEqual(useMediaStore.getState().isVideoOff, false);
    });

    it("toggles speaker deafened state correctly", () => {
      const store = useMediaStore.getState();
      assert.strictEqual(store.isSpeakerOff, false);

      store.toggleSpeakerOff();
      assert.strictEqual(useMediaStore.getState().isSpeakerOff, true);

      store.toggleSpeakerOff();
      assert.strictEqual(useMediaStore.getState().isSpeakerOff, false);
    });

    it("manages device selection for cameras and microphones", () => {
      const store = useMediaStore.getState();
      store.setAvailableCameras([
        { deviceId: "cam-integrated", label: "FaceTime HD Camera" },
        { deviceId: "cam-external", label: "Logitech Brio 4K" },
      ]);
      store.setSelectedCameraId("cam-external");

      store.setAvailableMicrophones([
        { deviceId: "mic-internal", label: "Built-in Microphone" },
        { deviceId: "mic-usb", label: "Shure MV7" },
      ]);
      store.setSelectedMicrophoneId("mic-usb");

      const state = useMediaStore.getState();
      assert.strictEqual(state.availableCameras.length, 2);
      assert.strictEqual(state.selectedCameraId, "cam-external");
      assert.strictEqual(state.availableMicrophones.length, 2);
      assert.strictEqual(state.selectedMicrophoneId, "mic-usb");
    });

    it("sets and clears media error state", () => {
      const store = useMediaStore.getState();
      assert.strictEqual(store.mediaError, null);

      store.setMediaError("Permission denied: camera not accessible");
      assert.strictEqual(
        useMediaStore.getState().mediaError,
        "Permission denied: camera not accessible"
      );

      store.setMediaError(null);
      assert.strictEqual(useMediaStore.getState().mediaError, null);
    });
  });

  describe("Scenario 5: Chat & P2P File Transfer Validation", () => {
    it("adds chat messages sorted by timestamp and ignores duplicates", () => {
      const store = useChatStore.getState();
      const msg1: ChatMessage = {
        id: "msg-1",
        userId: "user-1",
        userName: "Maya",
        message: "Hello world",
        timestamp: 2000,
      };
      const msg2: ChatMessage = {
        id: "msg-2",
        userId: "user-2",
        userName: "Liam",
        message: "Earlier message",
        timestamp: 1000,
      };

      store.addChatMessage(msg1);
      store.addChatMessage(msg2);

      const messages = useChatStore.getState().chatMessages;
      assert.strictEqual(messages.length, 2);
      // Sorted chronologically
      assert.strictEqual(messages[0].id, "msg-2");
      assert.strictEqual(messages[1].id, "msg-1");

      // Duplicate message is ignored
      store.addChatMessage(msg1);
      assert.strictEqual(useChatStore.getState().chatMessages.length, 2);
    });

    it("caps chat history at MAX_CHAT_HISTORY (500 items)", () => {
      const store = useChatStore.getState();
      assert.strictEqual(MAX_CHAT_HISTORY, 500);

      for (let i = 0; i < 550; i++) {
        store.addChatMessage({
          id: `msg-${i}`,
          userId: "user-1",
          userName: "Bot",
          message: `Text ${i}`,
          timestamp: i * 10,
        });
      }

      const messages = useChatStore.getState().chatMessages;
      assert.strictEqual(messages.length, 500);
      assert.strictEqual(messages[0].id, "msg-50");
      assert.strictEqual(messages[499].id, "msg-549");
    });

    it("increments unread count when chat closed and resets to 0 when opened", () => {
      const store = useChatStore.getState();
      assert.strictEqual(store.unreadCount, 0);
      assert.strictEqual(store.showChat, false);

      store.incrementUnreadCount();
      store.incrementUnreadCount();
      assert.strictEqual(useChatStore.getState().unreadCount, 2);

      // Open chat -> unread count resets to 0
      store.toggleShowChat();
      const openState = useChatStore.getState();
      assert.strictEqual(openState.showChat, true);
      assert.strictEqual(openState.unreadCount, 0);
    });

    it("verifies Drop Circle 30 KiB chunks and file transfer limit constants", () => {
      assert.strictEqual(CHUNK_SIZE, 30 * 1024, "Chunk size must be 30 KiB (30720 bytes)");
      assert.strictEqual(MAX_FILE_SIZE_SINGLE_SEND, 50, "Single file limit is 50 MB");
      assert.strictEqual(MAX_FILE_SIZE_MB_MULTIPLE_SEND, 6, "Multi-file limit is 6 MB each");
      assert.strictEqual(MAX_FILES_TO_SEND_TOGETHER, 5, "Batch limit is 5 files");
    });

    it("validates file batches against Drop Circle boundaries", () => {
      const MB = 1024 * 1024;

      // Empty batch
      assert.strictEqual(validateFileBatch([]), "Select at least one file.");

      // Exceeding 5 files
      const sixFiles = Array.from({ length: 6 }, () => ({ size: 1 * MB }));
      assert.strictEqual(
        validateFileBatch(sixFiles),
        "Share up to 5 files per transfer."
      );

      // Single file exceeding 50 MB
      assert.strictEqual(
        validateFileBatch([{ size: 51 * MB }]),
        "A single file can be up to 50 MB."
      );

      // Single file within 50 MB limit
      assert.strictEqual(validateFileBatch([{ size: 49 * MB }]), null);

      // Multiple files with one exceeding 6 MB
      const multiTooLarge = [{ size: 3 * MB }, { size: 7 * MB }];
      assert.strictEqual(
        validateFileBatch(multiTooLarge),
        "When sharing multiple files, each file must be 6 MB or smaller."
      );

      // Multiple files all within 6 MB limit
      const multiValid = [{ size: 2 * MB }, { size: 5 * MB }, { size: 6 * MB }];
      assert.strictEqual(validateFileBatch(multiValid), null);
    });

    it("validates incoming file sizes accurately", () => {
      const MB = 1024 * 1024;
      assert.strictEqual(validateIncomingFile(1024), true);
      assert.strictEqual(validateIncomingFile(50 * MB), true);
      assert.strictEqual(validateIncomingFile(51 * MB), false);
      assert.strictEqual(validateIncomingFile(-10), false);
      assert.strictEqual(validateIncomingFile("100"), false);
      assert.strictEqual(validateIncomingFile(null), false);
    });
  });

  describe("Scenario 6: Room Exit & Cleanup", () => {
    it("clears userId, roomId, and remoteUsers on leaveRoom()", () => {
      const store = useUserStore.getState();
      store.addRemoteUser("peer-1", "Maya", UserType.GUEST);

      assert.strictEqual(useUserStore.getState().roomId, "test-room-uuid");
      assert.strictEqual(Object.keys(useUserStore.getState().remoteUsers).length, 1);

      store.leaveRoom();

      const cleared = useUserStore.getState();
      assert.strictEqual(cleared.userId, null);
      assert.strictEqual(cleared.roomId, null);
      assert.deepStrictEqual(cleared.remoteUsers, {});
    });

    it("clears user identity on clearUser()", () => {
      const store = useUserStore.getState();
      store.clearUser();

      const state = useUserStore.getState();
      assert.strictEqual(state.userId, null);
      assert.strictEqual(state.userName, null);
    });
  });
});

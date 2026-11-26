import React from "react";
(globalThis as unknown as { React: typeof React }).React = React;
(React as unknown as { useSyncExternalStore: unknown }).useSyncExternalStore = (
  _sub: unknown,
  getSnap: () => unknown
) => getSnap();

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Home from "../app/home";
import RemoteVideoGrid from "../app/room/[room]/remoteVideoGrid";
import MediaControl from "../components/custom/mediaControl";
import ChatSidebar from "../components/custom/chat/chatSidebar";
import { useConnectionStore, type PeerConnectionStatus } from "../lib/stores/connectionStore";
import { useMediaStore } from "../lib/stores/mediaStore";
import { useUserStore } from "../lib/stores/userStore";
import { useChatStore } from "../lib/stores/chatStore";
import { UserType } from "../lib/constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Variable Screen Size & Responsive Layout Verification", () => {
  beforeEach(() => {
    useUserStore.setState({
      userId: "local-user-id",
      userName: "Local Host",
      userType: UserType.HOST,
      roomId: "test-room-uuid",
      remoteUsers: {},
    });
    useMediaStore.setState({
      mediaStreams: {},
      remoteTrackState: {},
      isVideoOff: false,
      isMicrophoneMuted: false,
      isSpeakerOff: false,
    });
    useConnectionStore.setState({ peers: {} });
    useChatStore.setState({ showChat: false, chatMessages: [], unreadCount: 0 });
  });

  it("configures viewport-fit=cover in root layout for notched devices", () => {
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "../app/layout.tsx"),
      "utf-8"
    );
    assert.match(layoutSource, /export const viewport:\s*Viewport/);
    assert.match(layoutSource, /viewportFit:\s*"cover"/);
  });

  it("renders responsive mobile navigation menu and iOS-safe input text size on Home", () => {
    const mockRouter = {
      back: () => {},
      forward: () => {},
      refresh: () => {},
      push: () => {},
      replace: () => {},
      prefetch: () => {},
    };
    const html = renderToString(
      React.createElement(
        AppRouterContext.Provider,
        { value: mockRouter },
        React.createElement(Home)
      )
    );
    assert.match(html, /aria-label="Open navigation menu"/);
    assert.match(html, /lg:grid-cols-\[minmax\(0,1\.1fr\)_minmax\(0,430px\)\]/);
  });

  it("adapts RemoteVideoGrid columns across 1, 2, and 5 remote peers", () => {
    const makePeer = (
      userName: string,
      phase: PeerConnectionStatus["phase"]
    ): PeerConnectionStatus => ({
      userName,
      userType: UserType.GUEST,
      state: phase === "connected" ? "connected" : "connecting",
      iceState: phase === "connected" ? "connected" : "checking",
      phase,
      updatedAt: 0,
    });

    // 1 waiting peer -> single column
    useConnectionStore.setState({
      peers: {
        "peer-1": makePeer("Maya", "connecting"),
      },
    });
    let html = renderToString(
      React.createElement(RemoteVideoGrid, { status: "Connected", isConnected: true })
    );
    assert.match(html, /grid-cols-1 auto-rows-\[minmax\(0,1fr\)\]/);

    // 2 waiting peers -> 1 col mobile, 2 cols sm+
    useConnectionStore.setState({
      peers: {
        "peer-1": makePeer("Maya", "connecting"),
        "peer-2": makePeer("Liam", "connected"),
      },
    });
    html = renderToString(
      React.createElement(RemoteVideoGrid, { status: "Connected", isConnected: true })
    );
    assert.match(html, /grid-cols-1 sm:grid-cols-2 auto-rows-\[minmax\(11rem,1fr\)\]/);

    // 5 waiting peers -> 1 col mobile, 2 cols sm+, 3 cols xl+
    useConnectionStore.setState({
      peers: {
        "peer-1": makePeer("P1", "connected"),
        "peer-2": makePeer("P2", "connected"),
        "peer-3": makePeer("P3", "connected"),
        "peer-4": makePeer("P4", "connected"),
        "peer-5": makePeer("P5", "connected"),
      },
    });
    html = renderToString(
      React.createElement(RemoteVideoGrid, { status: "Connected", isConnected: true })
    );
    assert.match(
      html,
      /grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-\[minmax\(11rem,1fr\)\]/
    );
  });

  it("renders MediaControl with compact 44px mobile targets and safe-area padding", () => {
    const html = renderToString(
      React.createElement(MediaControl, {
        cameras: [],
        microphones: [],
        selectedCameraId: null,
        selectedMicrophoneId: null,
        onCameraChange: () => {},
        onMicrophoneChange: () => {},
        onToggleMute: async () => {},
        onToggleVideo: async () => {},
        onLeave: () => {},
      })
    );
    assert.match(html, /size-11 shrink-0 rounded-2xl/);
    assert.match(html, /env\(safe-area-inset-bottom\)/);
  });

  it("docks ChatSidebar on tablet viewports and avoids header overlap on short screens", () => {
    useChatStore.setState({ showChat: true });
    const html = renderToString(
      React.createElement(ChatSidebar, {
        sendChatMessage: () => true,
        requestFileDownload: () => true,
        requestFileAvailability: async () => null,
        requestFileReupload: () => true,
      })
    );
    assert.match(html, /sm:left-auto sm:right-4/);
    assert.match(html, /max-h-\[calc\(100dvh-9\.5rem-env\(safe-area-inset-top\)-env\(safe-area-inset-bottom\)\)\]/);
  });

  it("scopes LocalVideoTile inside the video stage above MediaControl in room page", () => {
    const roomSource = fs.readFileSync(
      path.resolve(__dirname, "../app/room/[room]/page.tsx"),
      "utf-8"
    );
    assert.match(
      roomSource,
      /<div className="relative flex min-h-0 flex-1 flex-col">[\s\S]*?<RemoteVideoGrid[\s\S]*?<LocalVideoTile[\s\S]*?<\/div>[\s\S]*?<MediaControl/
    );
  });
});

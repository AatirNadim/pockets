import React from "react";
(globalThis as unknown as { React: typeof React }).React = React;

if (typeof globalThis.sessionStorage === "undefined") {
  const memStore = new Map<string, string>();
  (globalThis as unknown as { sessionStorage: unknown }).sessionStorage = {
    getItem: (key: string) => memStore.get(key) ?? null,
    setItem: (key: string, val: string) => memStore.set(key, val),
    removeItem: (key: string) => memStore.delete(key),
    clear: () => memStore.clear(),
    length: 0,
    key: () => null,
  };
}

import test, { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { renderToString } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Home from "../app/home";
import { useUserStore, generateRandomUsername } from "../lib/stores/userStore";
import { isValidUUID } from "../lib/utils";
import { UserType } from "../lib/constants";
import { v4 as uuidv4 } from "uuid";

describe("Home Screen & User Onboarding Scenarios", () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useUserStore.setState({
      userId: null,
      userName: null,
      userType: null,
      roomId: null,
      remoteUsers: {},
    });
  });

  describe("Scenario 1: Room Creation with NO Username (Direct Answer to User Question)", () => {
    it("generates a random pseudonym when preferredName is empty string", () => {
      useUserStore.getState().initializeUserAsHost("");

      const state = useUserStore.getState();
      assert.ok(state.userName, "Username must not be empty or null");
      // Pattern: Adjective + Noun + 1-3 digits, e.g. SwiftFox429
      const pseudonymRegex = /^[A-Z][a-z]+[A-Z][a-z]+[0-9]{1,3}$/;
      assert.match(
        state.userName!,
        pseudonymRegex,
        `Expected generated alias to match ${pseudonymRegex}, received "${state.userName}"`
      );
    });

    it("assigns UserType.HOST and generates a valid UUIDv4 userId", () => {
      useUserStore.getState().initializeUserAsHost("");

      const state = useUserStore.getState();
      assert.strictEqual(state.userType, UserType.HOST);
      assert.ok(state.userId, "User ID must be generated");
      assert.strictEqual(
        isValidUUID(state.userId!),
        true,
        `Expected valid UUID for userId, received ${state.userId}`
      );
    });

    it("generates a random pseudonym when preferredName is only whitespace", () => {
      useUserStore.getState().initializeUserAsHost("    ");

      const state = useUserStore.getState();
      const pseudonymRegex = /^[A-Z][a-z]+[A-Z][a-z]+[0-9]{1,3}$/;
      assert.match(state.userName!, pseudonymRegex);
      assert.strictEqual(state.userType, UserType.HOST);
      assert.strictEqual(isValidUUID(state.userId!), true);
    });

    it("generates a valid UUIDv4 roomId and sets it in store", () => {
      const generatedRoomId = uuidv4();
      assert.strictEqual(isValidUUID(generatedRoomId), true);

      useUserStore.getState().setRoomId(generatedRoomId);
      assert.strictEqual(useUserStore.getState().roomId, generatedRoomId);
    });

    it("generateRandomUsername produces diverse valid pseudonyms across multiple invocations", () => {
      const aliases = new Set<string>();
      const pseudonymRegex = /^[A-Z][a-z]+[A-Z][a-z]+[0-9]{1,3}$/;

      for (let i = 0; i < 25; i++) {
        const alias = generateRandomUsername();
        assert.match(alias, pseudonymRegex);
        aliases.add(alias);
      }
      assert.ok(aliases.size > 1, "Should generate diverse pseudonyms");
    });
  });

  describe("Scenario 2: Room Creation with Custom Username", () => {
    it("preserves exact user-provided display name when given", () => {
      useUserStore.getState().initializeUserAsHost("Alice");

      const state = useUserStore.getState();
      assert.strictEqual(state.userName, "Alice");
      assert.strictEqual(state.userType, UserType.HOST);
      assert.strictEqual(isValidUUID(state.userId!), true);
    });

    it("trims surrounding whitespace from custom display name", () => {
      useUserStore.getState().initializeUserAsHost("   Bob Designer   ");

      const state = useUserStore.getState();
      assert.strictEqual(state.userName, "Bob Designer");
      assert.strictEqual(state.userType, UserType.HOST);
    });
  });

  describe("Scenario 3: Room Join Validation", () => {
    it("rejects invalid room IDs", () => {
      assert.strictEqual(isValidUUID(""), false);
      assert.strictEqual(isValidUUID("   "), false);
      assert.strictEqual(isValidUUID("123"), false);
      assert.strictEqual(isValidUUID("not-a-uuid"), false);
      assert.strictEqual(isValidUUID("8f1e3c2b-94d0-4e2b-a1a2"), false);
      assert.strictEqual(isValidUUID("zzzzzzzz-94d0-4e2b-a1a2-5b9c7e0f81d3"), false);
    });

    it("accepts valid standard UUIDv4 room IDs", () => {
      const validUuids = [
        "8f1e3c2b-94d0-4e2b-a1a2-5b9c7e0f81d3",
        "123e4567-e89b-12d3-a456-426614174000",
        uuidv4(),
      ];
      for (const id of validUuids) {
        assert.strictEqual(isValidUUID(id), true, `Expected valid UUID: ${id}`);
      }
    });

    it("initializes guest with random pseudonym when display name is omitted", () => {
      useUserStore.getState().initializeUserAsGuest("");

      const state = useUserStore.getState();
      assert.strictEqual(state.userType, UserType.GUEST);
      assert.match(state.userName!, /^[A-Z][a-z]+[A-Z][a-z]+[0-9]{1,3}$/);
      assert.strictEqual(isValidUUID(state.userId!), true);
    });

    it("initializes guest with sanitized custom username when provided", () => {
      useUserStore.getState().initializeUserAsGuest("   Charlie   ");

      const state = useUserStore.getState();
      assert.strictEqual(state.userType, UserType.GUEST);
      assert.strictEqual(state.userName, "Charlie");
      assert.strictEqual(isValidUUID(state.userId!), true);
    });
  });

  describe("Scenario 4: UI Layout and Accessibility Markup", () => {
    const mockRouter = {
      back: () => {},
      forward: () => {},
      refresh: () => {},
      push: () => {},
      replace: () => {},
      prefetch: () => {},
    };

    function renderHomeScreen(): string {
      return renderToString(
        React.createElement(
          AppRouterContext.Provider,
          { value: mockRouter },
          React.createElement(Home)
        )
      );
    }

    it("renders semantic elements (<header>, <main>, <section>, tabs)", () => {
      const html = renderHomeScreen();
      assert.match(html, /<header\b/);
      assert.match(html, /<main\b/);
      assert.match(html, /<section\b/);
      assert.match(html, /role="tablist"/);
      assert.match(html, /role="tab"/);
    });

    it("renders ARIA attributes for accessible room entry", () => {
      const html = renderHomeScreen();
      assert.match(html, /aria-label="Room entry"/);
      assert.match(html, /aria-selected="true"/);
      assert.match(html, /aria-describedby="display-name-help"/);
      assert.match(html, /aria-labelledby="entry-title"/);
    });

    it("renders quick hotkey cues ('N', 'J', '↵')", () => {
      const html = renderHomeScreen();
      assert.match(html, />N<\/kbd>/);
      assert.match(html, />J<\/kbd>/);
      assert.match(html, />↵<\/kbd>/);
    });

    it("applies minimum touch target classes (min-h-11, h-12, min-h-12)", () => {
      const html = renderHomeScreen();
      // Tabs have min-h-11 touch target
      assert.match(html, /min-h-11/);
      // Inputs have h-12 touch target
      assert.match(html, /h-12/);
      // Submit action button has min-h-12 touch target
      assert.match(html, /min-h-12/);
    });
  });
});

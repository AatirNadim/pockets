import { create } from "zustand";

import type { ChatMessage } from "@pockets/shared";

interface ChatState {
  chatMessages: ChatMessage[];
  unreadCount: number;
  showChat: boolean;
}

interface ChatActions {
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  toggleShowChat: () => void;
}

export type { ChatState };

export const useChatStore = create<ChatState & ChatActions>()((set) => ({
  chatMessages: [],
  unreadCount: 0,
  showChat: false,
  toggleShowChat: () =>
    set((state) => {
      const nextShowState = !state.showChat;
      return {
        showChat: nextShowState,
        unreadCount: nextShowState ? 0 : state.unreadCount,
      };
    }),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  clearChatMessages: () => set({ chatMessages: [] }),
  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnreadCount: () => set({ unreadCount: 0 }),
}));

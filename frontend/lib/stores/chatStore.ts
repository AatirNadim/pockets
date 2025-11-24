import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  sendMessage: (chatMessage: string) => void;
  toggleShowChat: () => void;
}

export type { ChatState };

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set, get) => ({
      chatMessages: [],
      unreadCount: 0,
      showChat: false,
      toggleShowChat: () => set((state) => ({ showChat: !state.showChat })),
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),
      clearChatMessages: () => set({ chatMessages: [] }),
      incrementUnreadCount: () =>
        set((state) => ({ unreadCount: state.unreadCount + 1 })),
      resetUnreadCount: () => set({ unreadCount: 0 }),
      sendMessage: (chatMessage: string) => {
        const { addChatMessage } = get();
        if (chatMessage.trim()) {
          const newMessage: ChatMessage = {
            id: Date.now().toString(),
            user: "You",
            message: chatMessage.trim(),
            timestamp: new Date(),
          };
          addChatMessage(newMessage);
        }
      },
    }),
    {
      name: "chat-storage",
    }
  )
);
